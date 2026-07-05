import { defineEventHandler, getRouterParam, readBody } from 'h3'
import { getProvider } from '../../../utils/providers'
import { syncAccounts } from '../../../utils/sync'
import { addEvent, readState, writeState } from '../../../utils/storage'

export default defineEventHandler(async (event) => {
  const provider = getProvider(getRouterParam(event, 'provider'))
  const body = await readBody(event)
  const parsed = provider.parseWebhook?.(body) || {}
  const state = await readState()
  const account = state.accounts.find(
    (item) =>
      item.provider === provider.id &&
      item.email.toLowerCase() === parsed.email?.toLowerCase()
  )

  if (account) {
    account.providerData = {
      ...account.providerData,
      ...parsed.providerData
    }
    account.updatedAt = new Date().toISOString()
    addEvent(state, {
      type: 'webhook',
      accountId: account.id,
      message: `${provider.name}: ${account.email} push notification received`
    })
    await writeState(state)
    return {
      ok: true,
      synced: await syncAccounts(event, {
        accountId: account.id,
        limit: 10,
        query: parsed.syncQuery
      })
    }
  }

  addEvent(state, {
    type: 'webhook',
    message: `${provider.name}: unknown push notification`
  })
  await writeState(state)

  return { ok: true, synced: [] }
})
