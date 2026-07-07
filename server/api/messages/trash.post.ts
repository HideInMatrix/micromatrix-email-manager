import { createError, defineEventHandler, readBody } from 'h3'
import type { MailAccount, MailMessage } from '../../../shared/types'
import { assertCanAccessAccount, requireUserAccess } from '../../utils/access'
import { getProviderForAccount } from '../../utils/providers'
import type { MailProvider } from '../../utils/providers/types'
import { addEvent, readState, writeState } from '../../utils/storage'

interface TrashMessageRequest {
  id?: string
  accountId?: string
}

export default defineEventHandler(async (event) => {
  const access = await requireUserAccess(event)
  const body = await readBody<{ messages?: TrashMessageRequest[] }>(event)
  const requests = Array.isArray(body.messages) ? body.messages : []

  if (!requests.length) {
    throw createError({ statusCode: 400, statusMessage: 'No messages selected' })
  }

  if (requests.length > 200) {
    throw createError({ statusCode: 400, statusMessage: 'Too many messages selected' })
  }

  const state = await readState()
  const seenKeys = new Set<string>()
  const targets: Array<{
    account: MailAccount
    message: MailMessage
    provider: MailProvider
  }> = []

  for (const request of requests) {
    const id = request.id?.trim()
    const accountId = request.accountId?.trim()

    if (!id) {
      throw createError({ statusCode: 400, statusMessage: 'Missing message id' })
    }

    const message = state.messages.find(
      (item) => item.id === id && (!accountId || item.accountId === accountId)
    )

    if (!message) {
      throw createError({ statusCode: 404, statusMessage: 'Message not found' })
    }

    const key = `${message.accountId}:${message.id}`

    if (seenKeys.has(key)) {
      continue
    }

    const account = state.accounts.find((item) => item.id === message.accountId)
    assertCanAccessAccount(access, account)

    const provider = getProviderForAccount(account.provider)

    if (!provider.trashMessage) {
      throw createError({
        statusCode: 400,
        statusMessage: `${provider.name} trash is not implemented`
      })
    }

    seenKeys.add(key)
    targets.push({ account, message, provider })
  }

  const trashedKeys = new Set<string>()

  try {
    for (const { account, message, provider } of targets) {
      await provider.trashMessage(event, account, message)
      trashedKeys.add(`${message.accountId}:${message.id}`)
      addEvent(state, {
        type: 'message',
        accountId: account.id,
        message: `${provider.name}: ${account.email} moved a message to trash`
      })
    }
  } finally {
    if (trashedKeys.size) {
      state.messages = state.messages.filter(
        (message) => !trashedKeys.has(`${message.accountId}:${message.id}`)
      )
      await writeState(state)
    }
  }

  return {
    ok: true,
    count: trashedKeys.size
  }
})
