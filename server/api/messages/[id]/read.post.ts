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
  const message = state.messages.find(
    (item) => item.id === id && (!accountId || item.accountId === accountId)
  )

  if (!message) {
    throw createError({ statusCode: 404, statusMessage: 'Message not found' })
  }

  const account = state.accounts.find((item) => item.id === message.accountId)
  assertCanAccessAccount(access, account)

  if (!message.unread && !message.labels.includes('UNREAD')) {
    return {
      ok: true,
      accountId: account.id,
      messageId: message.id,
      unread: false
    }
  }

  const provider = getProviderForAccount(account.provider)

  if (!provider.markReadMessage) {
    throw createError({
      statusCode: 400,
      statusMessage: `${provider.name} mark read is not implemented`
    })
  }

  await provider.markReadMessage(event, account, message)
  message.unread = false
  message.labels = message.labels.filter((label) => label !== 'UNREAD')
  message.updatedAt = new Date().toISOString()
  addEvent(state, {
    type: 'message',
    accountId: account.id,
    message: `${provider.name}: ${account.email} marked a message as read`
  })
  await writeState(state)

  return {
    ok: true,
    accountId: account.id,
    messageId: message.id,
    unread: false
  }
})
