import {
  createError,
  defineEventHandler,
  getQuery,
  getRouterParam,
  sendRedirect
} from 'h3'
import { getProvider } from '../../../../utils/providers'
import { addEvent, readState, writeState } from '../../../../utils/storage'

export default defineEventHandler(async (event) => {
  const provider = getProvider(getRouterParam(event, 'provider'))
  const query = getQuery(event)
  const code = typeof query.code === 'string' ? query.code : ''
  const stateId = typeof query.state === 'string' ? query.state : ''

  if (!provider.completeOAuth || !provider.encryptToken) {
    throw createError({
      statusCode: 400,
      statusMessage: `${provider.name} OAuth is not implemented yet`
    })
  }

  if (!code || !stateId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing OAuth callback parameters'
    })
  }

  const state = await readState()
  const stateRecord = state.oauthStates.find(
    (item) => item.id === stateId && item.provider === provider.id
  )
  const stateAge = stateRecord
    ? Date.now() - new Date(stateRecord.createdAt).getTime()
    : Number.POSITIVE_INFINITY

  if (!stateRecord || stateAge > 15 * 60 * 1000) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid OAuth state' })
  }

  const profile = await provider.completeOAuth(event, code)
  const now = new Date().toISOString()
  const existing = state.accounts.find(
    (account) => account.provider === provider.id && account.email === profile.email
  )
  let refreshToken = profile.token.refresh_token

  if (existing && !refreshToken && provider.decryptToken) {
    refreshToken = provider.decryptToken(event, existing).refresh_token
  }

  const account = {
    id: existing?.id || `${provider.id}:${profile.id}`,
    provider: provider.id,
    email: profile.email,
    name: profile.name,
    picture: profile.picture,
    scope: profile.scope,
    tokenCipher: provider.encryptToken(event, {
      ...profile.token,
      refresh_token: refreshToken
    }),
    status: 'connected' as const,
    providerData: {
      ...existing?.providerData,
      ...profile.providerData
    },
    lastSyncAt: existing?.lastSyncAt,
    lastError: undefined,
    createdAt: existing?.createdAt || now,
    updatedAt: now
  }

  if (existing) {
    Object.assign(existing, account)
  } else {
    state.accounts.unshift(account)
  }

  state.oauthStates = state.oauthStates.filter((item) => item.id !== stateId)
  addEvent(state, {
    type: 'oauth',
    accountId: account.id,
    message: `${provider.name}: ${account.email} connected`
  })
  await writeState(state)

  return sendRedirect(event, '/dashboard/accounts?connected=1')
})
