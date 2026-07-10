import { createError, defineEventHandler, getQuery } from 'h3'
import type {
  AutomationRule,
  MailMessage,
  PaginatedMessages
} from '../../../shared/types'
import { filterMessagesForUser, getOptionalUserAccess } from '../../utils/access'
import { extractByRules } from '../../utils/rules'
import { readState } from '../../utils/storage'

export default defineEventHandler(async (event) => {
  const access = await getOptionalUserAccess(event)
  const query = getQuery(event)
  const accountId = typeof query.accountId === 'string' ? query.accountId : ''
  const search = typeof query.q === 'string' ? query.q.trim().toLowerCase() : ''
  const recipientEmail =
    normalizeQueryText(query.recipientEmail) || normalizeQueryText(query.to)
  const unreadOnly = query.unread === 'true'
  const matchedOnly = query.matched === 'true'
  const extractionRuleId = typeof query.ruleId === 'string' ? query.ruleId.trim() : ''
  const includeExtractions = query.extract === 'true' || Boolean(extractionRuleId)
  const paginated = typeof query.page === 'string' || typeof query.pageSize === 'string'
  const requestedPage = clampQueryNumber(
    query.page,
    1,
    Number.MAX_SAFE_INTEGER,
    1
  )
  const pageSize = clampQueryNumber(query.pageSize, 1, 100, 25)
  const limit = clampQueryNumber(query.limit, 1, 500, 200)
  const offset = clampQueryNumber(query.offset, 0, Number.MAX_SAFE_INTEGER, 0)
  const state = await readState()

  if (!access) {
    return paginated ? paginateMessages([], requestedPage, pageSize) : []
  }

  const extractionRules = state.rules.filter((rule) => rule.kind === 'api')

  if (
    extractionRuleId &&
    !extractionRules.some((rule) => rule.id === extractionRuleId)
  ) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Extraction rule not found'
    })
  }

  const messages = filterMessagesForUser(access, state.accounts, state.messages)
    .filter((message) => !accountId || message.accountId === accountId)
    .filter((message) =>
      !recipientEmail || message.to.toLowerCase().includes(recipientEmail)
    )
    .filter((message) => !unreadOnly || message.unread)
    .filter((message) => !matchedOnly || message.ruleMatches.length > 0)
    .filter((message) => {
      if (!search) {
        return true
      }

      return [message.subject, message.from, message.to, message.snippet]
        .join(' ')
        .toLowerCase()
        .includes(search)
    })

  const result = messages
    .map((message) =>
      includeExtractions
        ? withExtractions(message, extractionRules, extractionRuleId)
        : message
    )
    .filter((message) => !extractionRuleId || Boolean(message.extractions?.length))

  if (paginated) {
    return paginateMessages(result, requestedPage, pageSize)
  }

  return result.slice(offset, offset + limit)
})

function paginateMessages(
  messages: MailMessage[],
  requestedPage: number,
  pageSize: number
): PaginatedMessages {
  const total = messages.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const page = Math.min(requestedPage, totalPages)
  const offset = (page - 1) * pageSize

  return {
    messages: messages.slice(offset, offset + pageSize),
    total,
    page,
    pageSize,
    totalPages
  }
}

function withExtractions(
  message: MailMessage,
  rules: AutomationRule[],
  ruleId: string
): MailMessage {
  const extractions = extractByRules(rules, message, ruleId || undefined)

  return extractions.length ? { ...message, extractions } : message
}

function normalizeQueryText(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

function clampQueryNumber(
  value: unknown,
  min: number,
  max: number,
  fallback: number
) {
  if (typeof value !== 'string') {
    return fallback
  }

  const number = Number.parseInt(value, 10)

  if (!Number.isFinite(number)) {
    return fallback
  }

  return Math.min(Math.max(number, min), max)
}
