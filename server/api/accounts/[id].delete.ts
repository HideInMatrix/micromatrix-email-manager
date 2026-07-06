import { createError, defineEventHandler, getRouterParam } from 'h3'
import { requireAdmin } from '../../utils/admin-auth'
import { addEvent, readState, writeState } from '../../utils/storage'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing account id' })
  }

  const state = await readState()
  const account = state.accounts.find((item) => item.id === id)

  if (!account) {
    throw createError({ statusCode: 404, statusMessage: 'Account not found' })
  }

  state.accounts = state.accounts.filter((item) => item.id !== id)
  state.messages = state.messages.filter((message) => message.accountId !== id)
  addEvent(state, {
    type: 'oauth',
    accountId: id,
    message: `${account.email} disconnected`
  })
  await writeState(state)

  return { ok: true }
})
