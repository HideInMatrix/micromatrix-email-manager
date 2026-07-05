import { defineEventHandler, getQuery } from 'h3'
import { readState } from '../../utils/storage'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const accountId = typeof query.accountId === 'string' ? query.accountId : ''
  const search = typeof query.q === 'string' ? query.q.trim().toLowerCase() : ''
  const unreadOnly = query.unread === 'true'
  const state = await readState()

  return state.messages
    .filter((message) => !accountId || message.accountId === accountId)
    .filter((message) => !unreadOnly || message.unread)
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
