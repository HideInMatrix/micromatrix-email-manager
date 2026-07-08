import { defineEventHandler } from 'h3'
import { requireAdmin } from '../../utils/admin-auth'
import { clearEventLogs } from '../../utils/event-logs'

export default defineEventHandler(async (event) => {
  requireAdmin(event)

  return await clearEventLogs()
})
