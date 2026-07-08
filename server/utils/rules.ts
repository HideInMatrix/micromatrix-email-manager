import { createError } from 'h3'
import type {
  AppState,
  AutomationRule,
  AutomationRuleKind,
  MailMessage,
  MailRuleExtraction,
  RuleExtractionConfig,
  RuleTextSource
} from '../../shared/types'

export function applyRules(state: AppState, message: MailMessage) {
  for (const rule of state.rules) {
    if (
      rule.kind === 'api' ||
      !rule.enabled ||
      rule.provider !== message.provider ||
      !matchesRule(rule, message)
    ) {
      continue
    }

    if (!message.ruleMatches.includes(rule.id)) {
      message.ruleMatches.push(rule.id)
    }

    if (rule.action.markRead) {
      message.unread = false
      message.labels = message.labels.filter((label) => label !== 'UNREAD')
    }

    if (rule.action.archive) {
      message.labels = message.labels.filter((label) => label !== 'INBOX')
    }

    if (rule.action.addLabel) {
      const localLabel = `local:${rule.action.addLabel}`

      if (!message.labels.includes(localLabel)) {
        message.labels.push(localLabel)
      }
    }

    rule.matchCount += 1
    rule.lastMatchedAt = new Date().toISOString()
    rule.updatedAt = new Date().toISOString()
  }
}

export function matchesRule(rule: AutomationRule, message: MailMessage) {
  if (!matchesRuleFilters(rule, message)) {
    return false
  }

  if (rule.kind === 'api') {
    return Boolean(extractByRule(rule, message))
  }

  return true
}

export function extractByRule(
  rule: AutomationRule,
  message: MailMessage
): MailRuleExtraction | undefined {
  if (
    !rule.enabled ||
    rule.kind !== 'api' ||
    rule.provider !== message.provider ||
    !rule.extraction ||
    !matchesRuleFilters(rule, message)
  ) {
    return undefined
  }

  const regex = createExtractionRegex(rule.extraction)
  const match = regex.exec(textForSource(message, rule.extraction.source))

  if (!match) {
    return undefined
  }

  const fallbackValue = match[0] || ''
  const selectedValue = match[rule.extraction.groupIndex] || fallbackValue
  const value = selectedValue.trim()

  if (!value) {
    return undefined
  }

  return {
    ruleId: rule.id,
    ruleName: rule.name,
    fieldName: rule.extraction.fieldName,
    value,
    source: rule.extraction.source,
    groups: match.slice(1).map((group) => group || '')
  }
}

export function extractByRules(
  rules: AutomationRule[],
  message: MailMessage,
  ruleId?: string
) {
  return rules
    .filter((rule) => !ruleId || rule.id === ruleId)
    .map((rule) => extractByRule(rule, message))
    .filter((extraction): extraction is MailRuleExtraction => Boolean(extraction))
}

export function normalizeRuleKind(value?: string): AutomationRuleKind {
  return value === 'api' ? 'api' : 'display'
}

export function normalizeRuleExtraction(
  value: Partial<RuleExtractionConfig> | undefined,
  kind: AutomationRuleKind
): RuleExtractionConfig | undefined {
  if (kind !== 'api') {
    return undefined
  }

  const pattern = value?.pattern?.trim() || ''

  if (!pattern) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Extraction regex is required'
    })
  }

  const extraction: RuleExtractionConfig = {
    source: normalizeRuleTextSource(value?.source),
    pattern,
    flags: normalizeRegexFlags(value?.flags),
    groupIndex: normalizeGroupIndex(value?.groupIndex),
    fieldName: value?.fieldName?.trim() || 'value'
  }

  createExtractionRegex(extraction)

  return extraction
}

function matchesRuleFilters(rule: AutomationRule, message: MailMessage) {
  const from = normalized(message.from)
  const subject = normalized(message.subject)
  const snippet = normalized(message.snippet)
  const bodyText = normalized(message.bodyText || '')
  const labels = message.labels.map((label) => normalized(label))

  if (rule.match.from && !from.includes(normalized(rule.match.from))) {
    return false
  }

  if (rule.match.subject && !subject.includes(normalized(rule.match.subject))) {
    return false
  }

  if (
    rule.match.contains &&
    !snippet.includes(normalized(rule.match.contains)) &&
    !bodyText.includes(normalized(rule.match.contains))
  ) {
    return false
  }

  if (
    rule.match.hasLabel &&
    !labels.includes(normalized(rule.match.hasLabel)) &&
    !labels.includes(`local:${normalized(rule.match.hasLabel)}`)
  ) {
    return false
  }

  return true
}

function createExtractionRegex(extraction: RuleExtractionConfig) {
  try {
    return new RegExp(extraction.pattern, extraction.flags || '')
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid regex'

    throw createError({
      statusCode: 400,
      statusMessage: `Invalid extraction regex: ${message}`
    })
  }
}

function normalizeRegexFlags(value?: string) {
  const flags = value?.trim() || ''

  if (!flags) {
    return undefined
  }

  if (!/^[dgimsuvy]+$/.test(flags)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Regex flags may only include d, g, i, m, s, u, v, y'
    })
  }

  return Array.from(new Set(flags.split(''))).join('')
}

function normalizeRuleTextSource(value?: RuleTextSource): RuleTextSource {
  const sources: RuleTextSource[] = ['snippet', 'bodyText', 'subject', 'from', 'to', 'all']
  return sources.includes(value as RuleTextSource) ? value as RuleTextSource : 'snippet'
}

function normalizeGroupIndex(value?: number) {
  if (!Number.isInteger(value) || value < 0 || value > 20) {
    return 1
  }

  return value
}

function textForSource(message: MailMessage, source: RuleTextSource) {
  if (source === 'all') {
    return [
      message.subject,
      message.from,
      message.to,
      message.snippet,
      message.bodyText || ''
    ].join('\n')
  }

  if (source === 'bodyText') {
    return message.bodyText || ''
  }

  return message[source]
}

function normalized(value: string) {
  return value.trim().toLowerCase()
}
