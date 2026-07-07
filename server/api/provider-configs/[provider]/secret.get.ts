import { defineEventHandler, getRouterParam } from 'h3'
import { requireAdmin } from '../../../utils/admin-auth'
import {
  assertProviderId,
  readProviderConfig
} from '../../../utils/provider-configs'
import type { RevealedProviderSecret } from '../../../../shared/types'

export default defineEventHandler(async (event): Promise<RevealedProviderSecret> => {
  requireAdmin(event)
  const provider = getRouterParam(event, 'provider') || ''
  assertProviderId(provider)

  const config = await readProviderConfig(event, provider)

  return {
    provider,
    clientSecret: config.clientSecret,
    clientSecretSet: Boolean(config.clientSecret)
  }
})
