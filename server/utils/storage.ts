import { randomUUID } from 'node:crypto'
import type {
  AppEvent,
  AppState,
  AutomationRule,
  AutomationRuleKind,
  MailAccount,
  MailAttachment,
  MailMessage,
  MailProviderId,
  PublicMailAccount,
  RuleExtractionConfig,
  RuleTextSource
} from '../../shared/types'
import { applyEventLogSchedule } from './event-logs'
import { prisma } from './prisma'

const defaultState = (): AppState => ({
  version: 1,
  accounts: [],
  messages: [],
  rules: [],
  oauthStates: [],
  events: []
})

export async function readState(): Promise<AppState> {
  const [accounts, messages, rules, oauthStates, events] =
    await prisma.$transaction([
      prisma.mailAccount.findMany({
        orderBy: { createdAt: 'desc' }
      }),
      prisma.mailMessage.findMany({
        orderBy: { internalDate: 'desc' },
        take: 500
      }),
      prisma.automationRule.findMany({
        orderBy: { createdAt: 'desc' }
      }),
      prisma.oAuthState.findMany({
        orderBy: { createdAt: 'desc' }
      }),
      prisma.appEvent.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100
      })
    ])

  return {
    ...defaultState(),
    accounts: accounts.map((account) => ({
      id: account.id,
      ownerEmail: account.ownerEmail || account.email,
      provider: account.provider as MailProviderId,
      email: account.email,
      name: account.name,
      picture: account.picture || undefined,
      scope: parseJson<string[]>(account.scopeJson, []),
      tokenCipher: account.tokenCipher,
      status: account.status as MailAccount['status'],
      providerData: parseJson<Record<string, string | undefined>>(
        account.providerDataJson,
        {}
      ),
      lastSyncAt: toIso(account.lastSyncAt),
      lastError: account.lastError || undefined,
      createdAt: account.createdAt.toISOString(),
      updatedAt: account.updatedAt.toISOString()
    })),
    messages: messages.map((message) => ({
      id: message.messageId,
      threadId: message.threadId,
      accountId: message.accountId,
      provider: message.provider as MailProviderId,
      subject: message.subject,
      from: message.fromAddress,
      to: message.toAddress,
      date: message.date,
      snippet: message.snippet,
      labels: parseJson<string[]>(message.labelsJson, []),
      unread: message.unread,
      internalDate: Number(message.internalDate),
      bodyText: message.bodyText || undefined,
      bodyHtml: message.bodyHtml || undefined,
      attachments: parseJson<MailAttachment[]>(message.attachmentsJson, []),
      ruleMatches: parseJson<string[]>(message.ruleMatchesJson, []),
      receivedAt: message.receivedAt.toISOString(),
      updatedAt: message.updatedAt.toISOString()
    })),
    rules: rules.map((rule) => {
      const storedAction = parseJson<StoredRuleAction>(rule.actionJson, {
        markRead: false,
        archive: false
      })

      return {
        id: rule.id,
        kind: normalizeRuleKind(storedAction.kind),
        provider: (rule.provider || 'gmail') as MailProviderId,
        name: rule.name,
        enabled: rule.enabled,
        match: parseJson<AutomationRule['match']>(rule.matchJson, {}),
        action: {
          markRead: Boolean(storedAction.markRead),
          archive: Boolean(storedAction.archive),
          addLabel: storedAction.addLabel
        },
        extraction: normalizeRuleExtraction(storedAction.extraction),
        matchCount: rule.matchCount,
        lastMatchedAt: toIso(rule.lastMatchedAt),
        createdAt: rule.createdAt.toISOString(),
        updatedAt: rule.updatedAt.toISOString()
      }
    }),
    oauthStates: oauthStates.map((state) => ({
      id: state.id,
      provider: state.provider as MailProviderId,
      createdAt: state.createdAt.toISOString()
    })),
    events: events.map((event) => ({
      id: event.id,
      type: event.type as AppEvent['type'],
      message: event.message,
      accountId: event.accountId || undefined,
      createdAt: event.createdAt.toISOString()
    }))
  }
}

export async function writeState(state: AppState) {
  const messages = state.messages
    .sort((a, b) => b.internalDate - a.internalDate)
    .slice(0, 500)
  const events = state.events.slice(0, 100)

  await prisma.$transaction(async (tx) => {
    await tx.oAuthState.deleteMany()
    await tx.automationRule.deleteMany()
    await tx.mailMessage.deleteMany()
    await tx.mailAccount.deleteMany()

    const ownerEmails = [
      ...new Set(
        state.accounts
          .map((account) => account.ownerEmail || account.email)
          .filter(Boolean)
      )
    ]

    for (const ownerEmail of ownerEmails) {
      await tx.appUser.upsert({
        where: { email: ownerEmail },
        update: {},
        create: {
          email: ownerEmail
        }
      })
    }

    if (state.accounts.length) {
      await tx.mailAccount.createMany({
        data: state.accounts.map((account) => ({
          id: account.id,
          ownerEmail: account.ownerEmail || account.email,
          provider: account.provider,
          email: account.email,
          name: account.name,
          picture: account.picture || null,
          scopeJson: JSON.stringify(account.scope || []),
          tokenCipher: account.tokenCipher,
          status: account.status,
          providerDataJson: JSON.stringify(account.providerData || {}),
          lastSyncAt: toDate(account.lastSyncAt),
          lastError: account.lastError || null,
          createdAt: toRequiredDate(account.createdAt),
          updatedAt: toRequiredDate(account.updatedAt)
        }))
      })
    }

    if (messages.length) {
      await tx.mailMessage.createMany({
        data: messages.map((message) => ({
          accountId: message.accountId,
          messageId: message.id,
          provider: message.provider,
          threadId: message.threadId,
          subject: message.subject,
          fromAddress: message.from,
          toAddress: message.to,
          date: message.date,
          snippet: message.snippet,
          labelsJson: JSON.stringify(message.labels || []),
          unread: message.unread,
          internalDate: BigInt(message.internalDate),
          bodyText: message.bodyText || null,
          bodyHtml: message.bodyHtml || null,
          attachmentsJson: JSON.stringify(message.attachments || []),
          ruleMatchesJson: JSON.stringify(message.ruleMatches || []),
          receivedAt: toRequiredDate(message.receivedAt),
          updatedAt: toRequiredDate(message.updatedAt)
        }))
      })
    }

    if (state.rules.length) {
      await tx.automationRule.createMany({
        data: state.rules.map((rule) => ({
          id: rule.id,
          provider: rule.provider || 'gmail',
          name: rule.name,
          enabled: rule.enabled,
          matchJson: JSON.stringify(rule.match || {}),
          actionJson: JSON.stringify({
            ...(rule.action || {}),
            kind: rule.kind || 'display',
            extraction: rule.extraction
          }),
          matchCount: rule.matchCount,
          lastMatchedAt: toDate(rule.lastMatchedAt),
          createdAt: toRequiredDate(rule.createdAt),
          updatedAt: toRequiredDate(rule.updatedAt)
        }))
      })
    }

    if (state.oauthStates.length) {
      await tx.oAuthState.createMany({
        data: state.oauthStates.map((stateRecord) => ({
          id: stateRecord.id,
          provider: stateRecord.provider,
          createdAt: toRequiredDate(stateRecord.createdAt)
        }))
      })
    }

    if (events.length) {
      for (const event of events) {
        await tx.appEvent.upsert({
          where: { id: event.id },
          update: {
            type: event.type,
            message: event.message,
            accountId: event.accountId || null,
            createdAt: toRequiredDate(event.createdAt)
          },
          create: {
            id: event.id,
            type: event.type,
            message: event.message,
            accountId: event.accountId || null,
            createdAt: toRequiredDate(event.createdAt)
          }
        })
      }
    }
  })

  await applyEventLogSchedule()
}

export async function updateState<T>(mutator: (state: AppState) => T | Promise<T>) {
  const state = await readState()
  const result = await mutator(state)
  await writeState(state)
  return result
}

export function toPublicAccount(account: MailAccount): PublicMailAccount {
  const { tokenCipher, ...safeAccount } = account

  return {
    ...safeAccount,
    hasToken: Boolean(tokenCipher)
  }
}

export function upsertMessage(state: AppState, message: MailMessage) {
  const existingIndex = state.messages.findIndex(
    (item) => item.id === message.id && item.accountId === message.accountId
  )

  if (existingIndex >= 0) {
    const existingMessage = state.messages[existingIndex]

    if (!existingMessage) {
      return
    }

    state.messages[existingIndex] = {
      ...existingMessage,
      ...message,
      updatedAt: new Date().toISOString()
    }
    return
  }

  state.messages.unshift(message)
  state.messages = state.messages
    .sort((a, b) => b.internalDate - a.internalDate)
    .slice(0, 500)
}

export function addEvent(
  state: AppState,
  input: Omit<AppEvent, 'id' | 'createdAt'>
) {
  state.events.unshift({
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    ...input
  })
  state.events = state.events.slice(0, 100)
}

type StoredRuleAction = AutomationRule['action'] & {
  kind?: AutomationRuleKind
  extraction?: unknown
}

function normalizeRuleKind(value?: AutomationRuleKind): AutomationRuleKind {
  return value === 'api' ? 'api' : 'display'
}

function normalizeRuleExtraction(value: unknown): RuleExtractionConfig | undefined {
  if (!isPlainObject(value)) {
    return undefined
  }

  const pattern = typeof value.pattern === 'string' ? value.pattern : ''
  const groupIndex =
    typeof value.groupIndex === 'number' && Number.isInteger(value.groupIndex)
      ? value.groupIndex
      : 1

  if (!pattern) {
    return undefined
  }

  return {
    source: normalizeRuleTextSource(value.source),
    pattern,
    flags: typeof value.flags === 'string' ? value.flags : undefined,
    groupIndex,
    fieldName: typeof value.fieldName === 'string' && value.fieldName
      ? value.fieldName
      : 'value'
  }
}

function normalizeRuleTextSource(value: unknown): RuleTextSource {
  const sources: RuleTextSource[] = ['snippet', 'bodyText', 'subject', 'from', 'to', 'all']
  return sources.includes(value as RuleTextSource) ? value as RuleTextSource : 'snippet'
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function parseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

function toIso(value: Date | null) {
  return value ? value.toISOString() : undefined
}

function toDate(value?: string) {
  return value ? new Date(value) : null
}

function toRequiredDate(value?: string) {
  return value ? new Date(value) : new Date()
}
