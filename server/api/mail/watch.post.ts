import { createError, defineEventHandler, readBody } from 'h3'
import { getProviderForAccount } from '../../utils/providers'
import { addEvent, readState, writeState } from '../../utils/storage'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ accountId?: string }>(event)
  const state = await readState()
  const accounts = body.accountId
    ? state.accounts.filter((account) => account.id === body.accountId)
    : state.accounts

  if (!accounts.length) {
    throw createError({ statusCode: 404, statusMessage: 'No account selected' })
  }

  const results = []

  for (const account of accounts) {
    const provider = getProviderForAccount(account.provider)

    if (!provider.startWatch) {
      throw createError({
        statusCode: 400,
        statusMessage: `${provider.name} watch is not implemented`
      })
    }

    const watch = await provider.startWatch(event, account)
    account.providerData = {
      ...account.providerData,
      ...watch.providerData
    }
    account.updatedAt = new Date().toISOString()
    addEvent(state, {
      type: 'watch',
      accountId: account.id,
      message: `${provider.name}: ${account.email} watch active`
    })
    results.push({
      accountId: account.id,
      provider: account.provider,
      email: account.email,
      providerData: account.providerData
    })
  }

  await writeState(state)

  return { ok: true, results }
})
