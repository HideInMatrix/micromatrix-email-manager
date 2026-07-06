import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
import { assertCanAccessAccount, requireUserAccess } from '../../../utils/access'
import { getProviderForAccount } from '../../../utils/providers'
import { addEvent, readState, writeState } from '../../../utils/storage'

export default defineEventHandler(async (event) => {
  const access = await requireUserAccess(event)
  const id = getRouterParam(event, 'id')
  const body = await readBody<{ accountId?: string }>(event)
  const accountId = body.accountId?.trim()
  const state = await readState()
  const messageIndex = state.messages.findIndex(
    (message) =>
      message.id === id && (!accountId || message.accountId === accountId)
  )

  if (messageIndex < 0) {
    throw createError({ statusCode: 404, statusMessage: 'Message not found' })
  }

  const message = state.messages[messageIndex]
  const account = state.accounts.find((item) => item.id === message.accountId)

  assertCanAccessAccount(access, account)

  const provider = getProviderForAccount(account.provider)

  if (!provider.trashMessage) {
    throw createError({
      statusCode: 400,
      statusMessage: `${provider.name} trash is not implemented`
    })
  }

  await provider.trashMessage(event, account, message)
  state.messages.splice(messageIndex, 1)
  addEvent(state, {
    type: 'message',
    accountId: account.id,
    message: `${provider.name}: ${account.email} moved a message to trash`
  })
  await writeState(state)

  return {
    ok: true,
    accountId: account.id,
    messageId: message.id
  }
})
