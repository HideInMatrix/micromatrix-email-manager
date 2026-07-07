import { createError, getRequestURL, type H3Event } from 'h3'
import { useRuntimeConfig } from '#imports'
import { randomUUID } from 'node:crypto'
import { decryptJson, encryptJson } from './crypto'
import { getSiteUrl, readProviderConfig } from './provider-configs'
import type {
  MailAccount,
  MailAttachment,
  MailMessage,
  MailProviderId,
  StoredOAuthToken
} from '../../shared/types'

export const GMAIL_SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/gmail.modify'
]

export const GMAIL_PROVIDER_ID: MailProviderId = 'gmail'

interface GmailHeader {
  name: string
  value: string
}

interface GmailPart {
  partId?: string
  mimeType?: string
  filename?: string
  headers?: GmailHeader[]
  body?: {
    attachmentId?: string
    size?: number
    data?: string
  }
  parts?: GmailPart[]
}

interface GmailMessageRaw {
  id: string
  threadId: string
  labelIds?: string[]
  snippet?: string
  internalDate?: string
  payload?: GmailPart
}

export async function getGoogleRuntimeConfig(event: H3Event) {
  const config = useRuntimeConfig(event)
  const providerConfig = await readProviderConfig(event, GMAIL_PROVIDER_ID)

  return {
    clientId: providerConfig.clientId,
    clientSecret: providerConfig.clientSecret,
    pubsubTopic: providerConfig.pubsubTopic || '',
    tokenEncryptionKey: config.tokenEncryptionKey as string
  }
}

export function getOAuthRedirectUri(event: H3Event) {
  const siteUrl = getSiteUrl(event)

  if (siteUrl) {
    return `${siteUrl}/api/mail/oauth/gmail/callback`
  }

  const requestUrl = getRequestURL(event)
  requestUrl.pathname = '/api/mail/oauth/gmail/callback'
  requestUrl.search = ''
  requestUrl.hash = ''
  return requestUrl.toString()
}

export async function assertGoogleOAuthConfigured(event: H3Event) {
  const config = await getGoogleRuntimeConfig(event)

  if (!config.clientId || !config.clientSecret) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing Google OAuth client configuration'
    })
  }
}

export async function buildOAuthUrl(event: H3Event, state: string) {
  await assertGoogleOAuthConfigured(event)
  const { clientId } = await getGoogleRuntimeConfig(event)
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', getOAuthRedirectUri(event))
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', GMAIL_SCOPES.join(' '))
  url.searchParams.set('access_type', 'offline')
  url.searchParams.set('prompt', 'consent')
  url.searchParams.set('include_granted_scopes', 'true')
  url.searchParams.set('state', state)
  return url.toString()
}

export async function exchangeOAuthCode(event: H3Event, code: string) {
  await assertGoogleOAuthConfigured(event)
  const { clientId, clientSecret } = await getGoogleRuntimeConfig(event)
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: getOAuthRedirectUri(event),
      grant_type: 'authorization_code'
    })
  })

  if (!response.ok) {
    throw await googleApiError(response, 'Google OAuth token exchange failed')
  }

  const token = (await response.json()) as StoredOAuthToken & {
    expires_in?: number
  }

  return normalizeToken(token)
}

export async function fetchGoogleProfile(accessToken: string) {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: {
      authorization: `Bearer ${accessToken}`
    }
  })

  if (!response.ok) {
    throw await googleApiError(response, 'Could not read Google profile')
  }

  return (await response.json()) as {
    id: string
    email: string
    name?: string
    picture?: string
  }
}

export function encryptToken(event: H3Event, token: StoredOAuthToken) {
  const config = useRuntimeConfig(event)
  return encryptJson(token, config.tokenEncryptionKey as string)
}

export function decryptToken(event: H3Event, account: MailAccount) {
  const config = useRuntimeConfig(event)
  return decryptJson<StoredOAuthToken>(
    account.tokenCipher,
    config.tokenEncryptionKey as string
  )
}

export async function getAccessToken(event: H3Event, account: MailAccount) {
  const token = decryptToken(event, account)
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
      statusMessage: 'Gmail account needs OAuth reauthorization'
    })
  }

  const { clientId, clientSecret } = await getGoogleRuntimeConfig(event)
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: token.refresh_token,
      grant_type: 'refresh_token'
    })
  })

  if (!response.ok) {
    account.status = 'needs_reauth'
    account.lastError = await response.text()
    account.updatedAt = new Date().toISOString()
    throw await googleApiError(response, 'Could not refresh Gmail token')
  }

  const refreshed = (await response.json()) as StoredOAuthToken & {
    expires_in?: number
  }
  const nextToken = normalizeToken({
    ...token,
    ...refreshed,
    refresh_token: refreshed.refresh_token || token.refresh_token
  })

  account.tokenCipher = encryptToken(event, nextToken)
  account.status = 'connected'
  account.lastError = undefined
  account.updatedAt = new Date().toISOString()

  if (!nextToken.access_token) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Google did not return an access token'
    })
  }

  return nextToken.access_token
}

export async function gmailListMessageIds(
  accessToken: string,
  options: { limit: number; query?: string }
) {
  const url = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages')
  url.searchParams.set('maxResults', String(options.limit))
  url.searchParams.set('includeSpamTrash', 'false')
  url.searchParams.set('q', options.query || 'in:inbox newer_than:30d')

  const response = await fetch(url, {
    headers: { authorization: `Bearer ${accessToken}` }
  })

  if (!response.ok) {
    throw await googleApiError(response, 'Could not list Gmail messages')
  }

  const payload = (await response.json()) as {
    messages?: Array<{ id: string; threadId: string }>
  }

  return payload.messages || []
}

export async function gmailGetMessage(accessToken: string, messageId: string) {
  const url = new URL(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}`
  )
  url.searchParams.set('format', 'full')

  const response = await fetch(url, {
    headers: { authorization: `Bearer ${accessToken}` }
  })

  if (!response.ok) {
    throw await googleApiError(response, 'Could not read Gmail message')
  }

  return (await response.json()) as GmailMessageRaw
}

export async function gmailTrashMessage(accessToken: string, messageId: string) {
  const response = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(messageId)}/trash`,
    {
      method: 'POST',
      headers: { authorization: `Bearer ${accessToken}` }
    }
  )

  if (!response.ok) {
    throw await googleApiError(response, 'Could not move Gmail message to trash')
  }

  return (await response.json()) as GmailMessageRaw
}

export async function gmailMarkMessageRead(accessToken: string, messageId: string) {
  const response = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(messageId)}/modify`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        removeLabelIds: ['UNREAD']
      })
    }
  )

  if (!response.ok) {
    throw await googleApiError(response, 'Could not mark Gmail message as read')
  }

  return (await response.json()) as GmailMessageRaw
}

export async function gmailWatch(accessToken: string, topicName: string) {
  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/watch', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      topicName,
      labelIds: ['INBOX'],
      labelFilterBehavior: 'include'
    })
  })

  if (!response.ok) {
    throw await googleApiError(response, 'Could not start Gmail watch')
  }

  return (await response.json()) as {
    historyId: string
    expiration: string
  }
}

export function parseGmailMessage(
  accountId: string,
  raw: GmailMessageRaw
): MailMessage {
  const payload = raw.payload
  const headers = payload?.headers || []
  const labels = raw.labelIds || []
  const internalDate = Number(raw.internalDate || Date.now())
  const bodyText = findBody(payload, 'text/plain')
  const bodyHtml = findBody(payload, 'text/html')

  return {
    id: raw.id,
    threadId: raw.threadId,
    accountId,
    provider: GMAIL_PROVIDER_ID,
    subject: header(headers, 'subject') || '(No subject)',
    from: header(headers, 'from'),
    to: header(headers, 'to'),
    date: header(headers, 'date') || new Date(internalDate).toISOString(),
    snippet: raw.snippet || '',
    labels,
    unread: labels.includes('UNREAD'),
    internalDate,
    bodyText: bodyText?.slice(0, 20_000),
    bodyHtml: bodyHtml?.slice(0, 20_000),
    attachments: collectAttachments(payload),
    ruleMatches: [],
    receivedAt: new Date(internalDate).toISOString(),
    updatedAt: new Date().toISOString()
  }
}

export function createOAuthStateRecord(provider: MailProviderId) {
  return {
    id: randomUUID(),
    provider,
    createdAt: new Date().toISOString()
  }
}

async function googleApiError(response: Response, fallback: string) {
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

function normalizeToken(
  token: StoredOAuthToken & { expires_in?: number }
): StoredOAuthToken {
  return {
    access_token: token.access_token,
    refresh_token: token.refresh_token,
    scope: token.scope,
    token_type: token.token_type,
    expiry_date:
      token.expiry_date ||
      (token.expires_in ? Date.now() + token.expires_in * 1000 : undefined)
  }
}

function header(headers: GmailHeader[], name: string) {
  return headers.find((item) => item.name.toLowerCase() === name)?.value || ''
}

function findBody(part: GmailPart | undefined, mimeType: string): string | undefined {
  if (!part) {
    return undefined
  }

  if (part.mimeType === mimeType && part.body?.data) {
    return decodeBase64Url(part.body.data)
  }

  for (const child of part.parts || []) {
    const value = findBody(child, mimeType)

    if (value) {
      return value
    }
  }

  return undefined
}

function collectAttachments(part: GmailPart | undefined): MailAttachment[] {
  if (!part) {
    return []
  }

  const ownAttachment =
    part.filename && part.body
      ? [
          {
            filename: part.filename,
            mimeType: part.mimeType || 'application/octet-stream',
            attachmentId: part.body.attachmentId,
            size: part.body.size
          }
        ]
      : []

  return [
    ...ownAttachment,
    ...(part.parts || []).flatMap((child) => collectAttachments(child))
  ]
}

function decodeBase64Url(value: string) {
  return Buffer.from(value, 'base64url').toString('utf8')
}
