import { defineEventHandler, getRouterParam, readBody } from 'h3'
import { requireAdmin } from '../../utils/admin-auth'
import { assertProviderId, saveProviderConfig } from '../../utils/provider-configs'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const provider = getRouterParam(event, 'provider') || ''
  assertProviderId(provider)

  const body = await readBody<{
    clientId?: string
    clientSecret?: string
    pubsubTopic?: string
    tenantId?: string
  }>(event)

  return await saveProviderConfig(event, provider, {
    clientId: body.clientId,
    clientSecret: body.clientSecret?.trim() ? body.clientSecret : undefined,
    pubsubTopic: body.pubsubTopic,
    tenantId: body.tenantId
  })
})
