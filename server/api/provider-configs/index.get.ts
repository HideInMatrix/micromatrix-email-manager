import { defineEventHandler } from 'h3'
import { requireAdmin } from '../../utils/admin-auth'
import { listPublicProviderConfigs } from '../../utils/provider-configs'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  return await listPublicProviderConfigs(event)
})
