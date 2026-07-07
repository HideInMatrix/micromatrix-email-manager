import { createError, defineEventHandler, readBody } from 'h3'
import type { MailProviderId } from '../../../shared/types'
import {
  filterAccountsForUser,
  requireUserAccess
} from '../../utils/access'
import { getProviderForAccount } from '../../utils/providers'
import { addEvent, readState, writeState } from '../../utils/storage'

interface WatchResultItem {
  accountId: string
  provider: MailProviderId
  email: string
  providerData: Record<string, string | undefined>
}

export default defineEventHandler(async (event) => {
  const access = await requireUserAccess(event)
  const body = await readBody<{ accountId?: string }>(event)
  const state = await readState()
  const accessibleAccounts = filterAccountsForUser(access, state.accounts)
  const accounts = body.accountId
    ? accessibleAccounts.filter((account) => account.id === body.accountId)
    : accessibleAccounts

  if (!accounts.length) {
    throw createError({ statusCode: 404, statusMessage: 'No account selected' })
  }

  const results: WatchResultItem[] = []

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
