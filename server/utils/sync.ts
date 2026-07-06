import type { H3Event } from 'h3'
import type { SyncSummary } from '../../shared/types'
import { getProviderForAccount } from './providers'
import { applyRules } from './rules'
import { addEvent, readState, upsertMessage, writeState } from './storage'

export async function syncAccounts(
  event: H3Event,
  options: {
    accountId?: string
    accountIds?: string[]
    limit?: number
    query?: string
  } = {}
) {
  const state = await readState()
  const accounts = options.accountId
    ? state.accounts.filter((account) => account.id === options.accountId)
    : options.accountIds
      ? state.accounts.filter((account) => options.accountIds?.includes(account.id))
    : state.accounts
  const summaries: SyncSummary[] = []

  for (const account of accounts) {
    let fetched = 0
    let stored = 0

    try {
      const provider = getProviderForAccount(account.provider)

      if (!provider.syncAccount) {
        throw new Error(`${provider.name} sync is not implemented`)
      }

      const result = await provider.syncAccount(event, state, account, {
        limit: options.limit || 25,
        query: options.query
      })
      fetched = result.fetched

      for (const message of result.messages) {
        applyRules(state, message)
        upsertMessage(state, message)
        stored += 1
      }

      account.status = 'connected'
      account.lastSyncAt = new Date().toISOString()
      account.lastError = undefined
      account.updatedAt = new Date().toISOString()
      addEvent(state, {
        type: 'sync',
        accountId: account.id,
        message: `${account.email} synced ${stored} messages`
      })
      summaries.push({
        accountId: account.id,
        email: account.email,
        fetched,
        stored
      })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown mail sync error'
      account.status = 'error'
      account.lastError = message
      account.updatedAt = new Date().toISOString()
      addEvent(state, {
        type: 'error',
        accountId: account.id,
        message: `${account.email}: ${message}`
      })
      summaries.push({
        accountId: account.id,
        email: account.email,
        fetched,
        stored,
        error: message
      })
    }
  }

  await writeState(state)
  return summaries
}
