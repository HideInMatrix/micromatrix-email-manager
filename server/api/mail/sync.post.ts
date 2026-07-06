import { createError, defineEventHandler, readBody } from 'h3'
import {
  filterAccountsForUser,
  requireUserAccess
} from '../../utils/access'
import { syncAccounts } from '../../utils/sync'
import { readState } from '../../utils/storage'

export default defineEventHandler(async (event) => {
  const access = requireUserAccess(event)
  const body = await readBody<{
    accountId?: string
    limit?: number
    query?: string
  }>(event)
  const state = await readState()
  const accounts = filterAccountsForUser(access, state.accounts)
  const accountIds = body.accountId
    ? accounts.filter((account) => account.id === body.accountId).map((account) => account.id)
    : accounts.map((account) => account.id)

  if (body.accountId && !accountIds.length) {
    throw createError({ statusCode: 404, statusMessage: 'Account not found' })
  }

  return {
    ok: true,
    results: await syncAccounts(event, {
      accountIds,
      limit: Math.min(Math.max(Number(body.limit || 25), 1), 50),
      query: body.query
    })
  }
})
