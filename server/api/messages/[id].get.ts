import { createError, defineEventHandler, getRouterParam } from 'h3'
import {
  filterMessagesForUser,
  requireUserAccess
} from '../../utils/access'
import { readState } from '../../utils/storage'

export default defineEventHandler(async (event) => {
  const access = await requireUserAccess(event)
  const id = getRouterParam(event, 'id')
  const state = await readState()
  const message = filterMessagesForUser(access, state.accounts, state.messages)
    .find((item) => item.id === id)

  if (!message) {
    throw createError({ statusCode: 404, statusMessage: 'Message not found' })
  }

  return message
})
