import { createError, defineEventHandler, getRouterParam } from 'h3'
import { getProvider } from '../../../../utils/providers'
import { createOAuthStateRecord } from '../../../../utils/google'
import { readState, writeState } from '../../../../utils/storage'
import type { MailProviderId } from '../../../../../shared/types'

export default defineEventHandler(async (event) => {
  const provider = getProvider(getRouterParam(event, 'provider'))

  if (!provider.buildOAuthUrl) {
    throw createError({
      statusCode: 400,
      statusMessage: `${provider.name} OAuth is not implemented yet`
    })
  }

  if (!(await provider.isConfigured(event))) {
    throw createError({
      statusCode: 400,
      statusMessage: `${provider.name} is not configured`
    })
  }

  const state = await readState()
  const record = createOAuthStateRecord(provider.id as MailProviderId)
  const cutoff = Date.now() - 15 * 60 * 1000
  state.oauthStates = state.oauthStates.filter(
    (item) => new Date(item.createdAt).getTime() > cutoff
  )
  state.oauthStates.push(record)
  await writeState(state)

  return {
    provider: provider.id,
    url: await provider.buildOAuthUrl(event, record.id)
  }
})
