import { defineEventHandler, readBody } from 'h3'
import { requireAdmin } from '../../utils/admin-auth'
import { saveEventLogSettings } from '../../utils/event-logs'

export default defineEventHandler(async (event) => {
  requireAdmin(event)

  const body = await readBody<{ clearCron?: unknown }>(event)

  return await saveEventLogSettings({
    clearCron: body?.clearCron
  })
})
