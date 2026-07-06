import { defineEventHandler, getQuery } from 'h3'
import { filterMessagesForUser, requireUserAccess } from '../../utils/access'
import { readState } from '../../utils/storage'

export default defineEventHandler(async (event) => {
  const access = requireUserAccess(event)
  const query = getQuery(event)
  const accountId = typeof query.accountId === 'string' ? query.accountId : ''
  const search = typeof query.q === 'string' ? query.q.trim().toLowerCase() : ''
  const unreadOnly = query.unread === 'true'
  const matchedOnly = query.matched === 'true'
  const state = await readState()

  return filterMessagesForUser(access, state.accounts, state.messages)
    .filter((message) => !accountId || message.accountId === accountId)
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
    .slice(0, 200)
})
