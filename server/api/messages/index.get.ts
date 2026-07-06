import { defineEventHandler, getQuery } from 'h3'
import { filterMessagesForUser, getOptionalUserAccess } from '../../utils/access'
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
  const limit = clampQueryNumber(query.limit, 1, 500, 200)
  const offset = clampQueryNumber(query.offset, 0, Number.MAX_SAFE_INTEGER, 0)
  const state = await readState()

  if (!access) {
    return []
  }

  return filterMessagesForUser(access, state.accounts, state.messages)
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
    .slice(offset, offset + limit)
})

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
