import { defineEventHandler, readBody } from 'h3'
import { syncAccounts } from '../../utils/sync'

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    accountId?: string
    limit?: number
    query?: string
  }>(event)

  return {
    ok: true,
    results: await syncAccounts(event, {
      accountId: body.accountId,
      limit: Math.min(Math.max(Number(body.limit || 25), 1), 50),
      query: body.query
    })
  }
})
