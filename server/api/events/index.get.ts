import { defineEventHandler, getQuery } from 'h3'
import { requireAdmin } from '../../utils/admin-auth'
import { listEventLogs } from '../../utils/event-logs'

export default defineEventHandler(async (event) => {
  requireAdmin(event)

  const query = getQuery(event)

  return await listEventLogs({
    page: firstQueryNumber(query.page),
    pageSize: firstQueryNumber(query.pageSize)
  })
})

function firstQueryNumber(value: unknown) {
  const firstValue = Array.isArray(value) ? value[0] : value
  return firstValue === undefined ? undefined : Number(firstValue)
}
