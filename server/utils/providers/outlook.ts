import { createError, getRequestURL, type H3Event } from 'h3'
import { useRuntimeConfig } from '#imports'
import type {
  AppState,
  MailAccount,
  MailMessage,
  MailProviderSummary,
  StoredOAuthToken
} from '../../../shared/types'
import { decryptJson, encryptJson } from '../crypto'
import { getSiteUrl, readProviderConfig } from '../provider-configs'
import type {
  MailProvider,
  OAuthProfile,
  ProviderSyncOptions,
  ProviderSyncResult,
  ProviderWebhookResult
} from './types'

const OUTLOOK_SCOPES = [
  'openid',
  'email',
  'profile',
  'offline_access',
  'https://graph.microsoft.com/Mail.ReadWrite'
]

const OUTLOOK_PROVIDER_ID = 'outlook'
const GRAPH_BASE_URL = 'https://graph.microsoft.com/v1.0'

interface OutlookOAuthToken extends StoredOAuthToken {
  expires_in?: number
  id_token?: string
}

interface OutlookRecipient {
  emailAddress?: {
    name?: string
    address?: string
  }
}

interface OutlookMessageRaw {
  id: string
  conversationId?: string
  subject?: string
  bodyPreview?: string
  receivedDateTime?: string
  sentDateTime?: string
  isRead?: boolean
  categories?: string[]
  from?: OutlookRecipient
  toRecipients?: OutlookRecipient[]
  body?: {
    contentType?: string
    content?: string
  }
  hasAttachments?: boolean
}

interface GraphListResponse<T> {
  value?: T[]
}

export async function getOutlookRuntimeConfig(event: H3Event) {
  const config = useRuntimeConfig(event)
  const providerConfig = await readProviderConfig(event, OUTLOOK_PROVIDER_ID)

  return {
    clientId: providerConfig.clientId,
    clientSecret: providerConfig.clientSecret,
    tenantId: providerConfig.tenantId || 'common',
    tokenEncryptionKey: config.tokenEncryptionKey as string
  }
}

export function getOutlookRedirectUri(event: H3Event) {
  const siteUrl = getSiteUrl(event)

  if (siteUrl) {
    return `${siteUrl}/api/mail/oauth/outlook/callback`
  }

  const requestUrl = getRequestURL(event)
  requestUrl.pathname = '/api/mail/oauth/outlook/callback'
  requestUrl.search = ''
  requestUrl.hash = ''
  return requestUrl.toString()
}

async function assertOutlookOAuthConfigured(event: H3Event) {
  const config = await getOutlookRuntimeConfig(event)

  if (!config.clientId || !config.clientSecret) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing Microsoft OAuth client configuration'
    })
  }
}

async function buildOutlookOAuthUrl(event: H3Event, state: string) {
  await assertOutlookOAuthConfigured(event)
  const { clientId, tenantId } = await getOutlookRuntimeConfig(event)
  const url = new URL(`${getMicrosoftAuthority(tenantId)}/authorize`)
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('redirect_uri', getOutlookRedirectUri(event))
  url.searchParams.set('response_mode', 'query')
  url.searchParams.set('scope', OUTLOOK_SCOPES.join(' '))
  url.searchParams.set('prompt', 'select_account')
  url.searchParams.set('state', state)
  return url.toString()
}

async function exchangeOutlookOAuthCode(event: H3Event, code: string) {
  await assertOutlookOAuthConfigured(event)
  const { clientId, clientSecret, tenantId } = await getOutlookRuntimeConfig(event)
  const response = await fetch(`${getMicrosoftAuthority(tenantId)}/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: getOutlookRedirectUri(event),
      grant_type: 'authorization_code',
      scope: OUTLOOK_SCOPES.join(' ')
    })
  })

  if (!response.ok) {
    throw await microsoftApiError(response, 'Microsoft OAuth token exchange failed')
  }

  return normalizeOutlookToken((await response.json()) as OutlookOAuthToken)
}

function encryptOutlookToken(event: H3Event, token: StoredOAuthToken) {
  const config = useRuntimeConfig(event)
  return encryptJson(token, config.tokenEncryptionKey as string)
}

function decryptOutlookToken(event: H3Event, account: MailAccount) {
  const config = useRuntimeConfig(event)
  return decryptJson<StoredOAuthToken>(
    account.tokenCipher,
    config.tokenEncryptionKey as string
  )
}

async function getOutlookAccessToken(event: H3Event, account: MailAccount) {
  const token = decryptOutlookToken(event, account)
  const now = Date.now()

  if (token.access_token && token.expiry_date && token.expiry_date > now + 60_000) {
    return token.access_token
  }

  if (!token.refresh_token) {
    account.status = 'needs_reauth'
    account.lastError = 'Missing refresh token'
    account.updatedAt = new Date().toISOString()
    throw createError({
      statusCode: 401,
      statusMessage: 'Outlook account needs OAuth reauthorization'
    })
  }

  const { clientId, clientSecret, tenantId } = await getOutlookRuntimeConfig(event)
  const response = await fetch(`${getMicrosoftAuthority(tenantId)}/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: token.refresh_token,
      grant_type: 'refresh_token',
      scope: OUTLOOK_SCOPES.join(' ')
    })
  })

  if (!response.ok) {
    account.status = 'needs_reauth'
    account.lastError = await response.text()
    account.updatedAt = new Date().toISOString()
    throw await microsoftApiError(response, 'Could not refresh Outlook token')
  }

  const refreshed = normalizeOutlookToken((await response.json()) as OutlookOAuthToken)
  const nextToken = toStoredOutlookToken({
    ...token,
    ...refreshed,
    refresh_token: refreshed.refresh_token || token.refresh_token
  })

  account.tokenCipher = encryptOutlookToken(event, nextToken)
  account.status = 'connected'
  account.lastError = undefined
  account.updatedAt = new Date().toISOString()

  if (!nextToken.access_token) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Microsoft did not return an access token'
    })
  }

  return nextToken.access_token
}

async function outlookListMessageIds(
  accessToken: string,
  options: { limit: number; query?: string }
) {
  const url = new URL(`${GRAPH_BASE_URL}/me/mailFolders/inbox/messages`)
  const headers: Record<string, string> = {}
  url.searchParams.set('$top', String(Math.min(Math.max(options.limit, 1), 50)))
  url.searchParams.set('$select', 'id')

  if (options.query?.trim()) {
    url.searchParams.set('$search', `"${escapeGraphSearch(options.query.trim())}"`)
    headers.ConsistencyLevel = 'eventual'
  } else {
    url.searchParams.set('$orderby', 'receivedDateTime desc')
  }

  const payload = await graphFetch<GraphListResponse<{ id: string }>>(
    accessToken,
    url,
    { headers },
    'Could not list Outlook messages'
  )

  return payload.value || []
}

async function outlookGetMessage(accessToken: string, messageId: string) {
  const url = new URL(`${GRAPH_BASE_URL}/me/messages/${encodeURIComponent(messageId)}`)
  url.searchParams.set(
    '$select',
    [
      'id',
      'conversationId',
      'subject',
      'from',
      'toRecipients',
      'receivedDateTime',
      'sentDateTime',
      'bodyPreview',
      'isRead',
      'categories',
      'body',
      'hasAttachments'
    ].join(',')
  )

  return await graphFetch<OutlookMessageRaw>(
    accessToken,
    url,
    {
      headers: {
        Prefer: 'outlook.body-content-type="html"'
      }
    },
    'Could not read Outlook message'
  )
}

async function outlookMoveMessageToTrash(accessToken: string, messageId: string) {
  const url = `${GRAPH_BASE_URL}/me/messages/${encodeURIComponent(messageId)}/move`
  await graphFetch<OutlookMessageRaw>(
    accessToken,
    url,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        destinationId: 'deleteditems'
      })
    },
    'Could not move Outlook message to trash'
  )
}

async function graphFetch<T>(
  accessToken: string,
  input: string | URL,
  init: RequestInit,
  fallback: string
) {
  const headers = new Headers(init.headers)
  headers.set('authorization', `Bearer ${accessToken}`)
  headers.set('accept', 'application/json')

  const response = await fetch(input, {
    ...init,
    headers
  })

  if (!response.ok) {
    throw await microsoftApiError(response, fallback)
  }

  return (await response.json()) as T
}

export const outlookProvider: MailProvider = {
  id: OUTLOOK_PROVIDER_ID,
  name: 'Outlook',
  description: '通过 Microsoft Graph OAuth 同步和管理 Outlook 收件箱。',
  setupFields: ['Client ID', 'Client Secret'],
  scopes: OUTLOOK_SCOPES,
  capabilities: {
    oauth: true,
    sync: true,
    watch: false,
    send: false
  },
  async isConfigured(event) {
    const config = await getOutlookRuntimeConfig(event)
    return Boolean(config.clientId && config.clientSecret)
  },
  getRedirectUri: getOutlookRedirectUri,
  async getSummary(event) {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      configured: await this.isConfigured(event),
      enabled: true,
      redirectUri: this.getRedirectUri(event),
      setupFields: this.setupFields,
      configFields: [
        {
          key: 'clientId',
          label: 'Client ID',
          required: true,
          placeholder: 'Microsoft OAuth client ID'
        },
        {
          key: 'clientSecret',
          label: 'Client Secret',
          required: true,
          secret: true,
          placeholder: '留空表示保留当前密钥'
        },
        {
          key: 'tenantId',
          label: 'Tenant ID',
          required: false,
          placeholder: 'common / organizations / consumers / Directory tenant ID'
        }
      ],
      scopes: this.scopes,
      capabilities: this.capabilities
    } satisfies MailProviderSummary
  },
  buildOAuthUrl: buildOutlookOAuthUrl,
  encryptToken(event: H3Event, token: StoredOAuthToken) {
    return encryptOutlookToken(event, token)
  },
  decryptToken(event: H3Event, account: MailAccount) {
    return decryptOutlookToken(event, account)
  },
  async completeOAuth(event: H3Event, code: string): Promise<OAuthProfile> {
    const token = await exchangeOutlookOAuthCode(event, code)

    if (!token.access_token) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Microsoft did not return an access token'
      })
    }

    const profile = parseOutlookIdToken(token.id_token)

    return {
      id: profile.id,
      email: profile.email,
      name: profile.name,
      scope: token.scope?.split(' ') || [],
      token: toStoredOutlookToken(token),
      providerData: {}
    }
  },
  async syncAccount(
    event: H3Event,
    _state: AppState,
    account: MailAccount,
    options: ProviderSyncOptions
  ): Promise<ProviderSyncResult> {
    if (!hasOutlookMailReadWriteScope(account.scope)) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Outlook account needs reauthorization with Mail.ReadWrite access'
      })
    }

    const accessToken = await getOutlookAccessToken(event, account)
    const messageIds = await outlookListMessageIds(accessToken, {
      limit: options.limit,
      query: options.query
    })
    const messages: MailMessage[] = []

    for (const item of messageIds) {
      const rawMessage = await outlookGetMessage(accessToken, item.id)
      messages.push(parseOutlookMessage(account.id, rawMessage))
    }

    return {
      fetched: messageIds.length,
      messages
    }
  },
  async trashMessage(event: H3Event, account: MailAccount, message: MailMessage) {
    if (!hasOutlookMailReadWriteScope(account.scope)) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Outlook account needs reauthorization with Mail.ReadWrite access'
      })
    }

    const accessToken = await getOutlookAccessToken(event, account)
    await outlookMoveMessageToTrash(accessToken, message.id)
  },
  parseWebhook(_body: unknown): ProviderWebhookResult {
    return {}
  }
}

function parseOutlookMessage(accountId: string, raw: OutlookMessageRaw): MailMessage {
  const receivedAt = raw.receivedDateTime || raw.sentDateTime || new Date().toISOString()
  const bodyContent = raw.body?.content || ''
  const bodyType = raw.body?.contentType?.toLowerCase()

  return {
    id: raw.id,
    threadId: raw.conversationId || raw.id,
    accountId,
    provider: OUTLOOK_PROVIDER_ID,
    subject: raw.subject || '(No subject)',
    from: formatOutlookRecipient(raw.from),
    to: (raw.toRecipients || []).map(formatOutlookRecipient).filter(Boolean).join(', '),
    date: receivedAt,
    snippet: raw.bodyPreview || '',
    labels: [
      'INBOX',
      ...(raw.isRead === false ? ['UNREAD'] : []),
      ...(raw.categories || [])
    ],
    unread: raw.isRead === false,
    internalDate: toTimestamp(receivedAt),
    bodyText: bodyType === 'html' ? raw.bodyPreview?.slice(0, 20_000) : bodyContent.slice(0, 20_000),
    bodyHtml: bodyType === 'html' ? bodyContent.slice(0, 20_000) : undefined,
    attachments: [],
    ruleMatches: [],
    receivedAt,
    updatedAt: new Date().toISOString()
  }
}

function parseOutlookIdToken(idToken?: string) {
  if (!idToken) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Microsoft did not return an ID token'
    })
  }

  const claims = decodeJwtPayload(idToken)
  const id = stringClaim(claims, 'oid') || stringClaim(claims, 'sub')
  const email =
    stringClaim(claims, 'preferred_username') ||
    stringClaim(claims, 'email') ||
    stringClaim(claims, 'upn')
  const name = stringClaim(claims, 'name') || email

  if (!id || !email) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Microsoft ID token is missing account identity'
    })
  }

  return {
    id,
    email,
    name
  }
}

function decodeJwtPayload(token: string) {
  const [, payload] = token.split('.')

  if (!payload) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Microsoft ID token is invalid'
    })
  }

  return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Record<
    string,
    unknown
  >
}

function stringClaim(claims: Record<string, unknown>, key: string) {
  const value = claims[key]
  return typeof value === 'string' ? value : ''
}

function normalizeOutlookToken(token: OutlookOAuthToken): OutlookOAuthToken {
  return {
    access_token: token.access_token,
    refresh_token: token.refresh_token,
    scope: token.scope,
    token_type: token.token_type,
    expiry_date:
      token.expiry_date ||
      (token.expires_in ? Date.now() + token.expires_in * 1000 : undefined),
    id_token: token.id_token
  }
}

function toStoredOutlookToken(token: OutlookOAuthToken): StoredOAuthToken {
  return {
    access_token: token.access_token,
    refresh_token: token.refresh_token,
    scope: token.scope,
    token_type: token.token_type,
    expiry_date: token.expiry_date
  }
}

function getMicrosoftAuthority(tenantId: string) {
  const normalizedTenant = tenantId.trim().replace(/^\/+|\/+$/g, '') || 'common'
  return `https://login.microsoftonline.com/${encodeURIComponent(normalizedTenant)}/oauth2/v2.0`
}

function hasOutlookMailReadWriteScope(scopes: string[]) {
  return scopes.some((scope) =>
    [
      'Mail.ReadWrite',
      'https://graph.microsoft.com/Mail.ReadWrite'
    ].includes(scope)
  )
}

function formatOutlookRecipient(recipient?: OutlookRecipient) {
  const name = recipient?.emailAddress?.name || ''
  const address = recipient?.emailAddress?.address || ''

  if (name && address && name !== address) {
    return `${name} <${address}>`
  }

  return address || name
}

function escapeGraphSearch(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

function toTimestamp(value: string) {
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? timestamp : Date.now()
}

async function microsoftApiError(response: Response, fallback: string) {
  let detail = ''

  try {
    detail = await response.text()
  } catch {
    detail = response.statusText
  }

  return createError({
    statusCode: response.status,
    statusMessage: fallback,
    data: detail
  })
}
