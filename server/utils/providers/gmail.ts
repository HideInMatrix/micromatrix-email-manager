import { createError, type H3Event } from 'h3'
import type {
  AppState,
  MailAccount,
  MailProviderSummary,
  StoredOAuthToken
} from '../../../shared/types'
import {
  buildOAuthUrl,
  decryptToken,
  encryptToken,
  exchangeOAuthCode,
  fetchGoogleProfile,
  getAccessToken,
  getGoogleRuntimeConfig,
  getOAuthRedirectUri,
  gmailGetMessage,
  gmailListMessageIds,
  gmailTrashMessage,
  gmailWatch,
  GMAIL_PROVIDER_ID,
  GMAIL_SCOPES,
  parseGmailMessage
} from '../google'
import type {
  MailProvider,
  OAuthProfile,
  ProviderSyncOptions,
  ProviderSyncResult,
  ProviderWebhookResult,
  ProviderWatchResult
} from './types'

interface PubSubPushBody {
  message?: {
    data?: string
    messageId?: string
    publishTime?: string
  }
  subscription?: string
}

export const gmailProvider: MailProvider = {
  id: GMAIL_PROVIDER_ID,
  name: 'Gmail',
  description: '通过 Google OAuth 和 Gmail API 管理收件箱。',
  setupFields: ['Client ID', 'Client Secret', 'Pub/Sub Topic'],
  scopes: GMAIL_SCOPES,
  capabilities: {
    oauth: true,
    sync: true,
    watch: true,
    send: false
  },
  async isConfigured(event) {
    const config = await getGoogleRuntimeConfig(event)
    return Boolean(config.clientId && config.clientSecret)
  },
  getRedirectUri: getOAuthRedirectUri,
  async getSummary(event) {
    const config = await getGoogleRuntimeConfig(event)
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
          placeholder: 'Google OAuth client ID'
        },
        {
          key: 'clientSecret',
          label: 'Client Secret',
          required: true,
          secret: true,
          placeholder: '留空表示保留当前密钥'
        },
        {
          key: 'pubsubTopic',
          label: 'Pub/Sub Topic',
          required: false,
          placeholder: 'projects/<project>/topics/<topic>'
        }
      ],
      scopes: this.scopes,
      capabilities: {
        ...this.capabilities,
        watch: Boolean(config.pubsubTopic)
      }
    } satisfies MailProviderSummary
  },
  buildOAuthUrl,
  encryptToken(event: H3Event, token: StoredOAuthToken) {
    return encryptToken(event, token)
  },
  decryptToken(event: H3Event, account: MailAccount) {
    return decryptToken(event, account)
  },
  async completeOAuth(event: H3Event, code: string): Promise<OAuthProfile> {
    const token = await exchangeOAuthCode(event, code)

    if (!token.access_token) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Google did not return an access token'
      })
    }

    const profile = await fetchGoogleProfile(token.access_token)

    return {
      id: profile.id,
      email: profile.email,
      name: profile.name || profile.email,
      picture: profile.picture,
      scope: token.scope?.split(' ') || [],
      token,
      providerData: {}
    }
  },
  async syncAccount(
    event: H3Event,
    _state: AppState,
    account: MailAccount,
    options: ProviderSyncOptions
  ): Promise<ProviderSyncResult> {
    if (!hasGmailAccessScope(account.scope)) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Gmail account needs reauthorization with Gmail modify access'
      })
    }

    const accessToken = await getAccessToken(event, account)
    const messageIds = await gmailListMessageIds(accessToken, {
      limit: options.limit,
      query: options.query
    })
    const messages = []

    for (const item of messageIds) {
      const rawMessage = await gmailGetMessage(accessToken, item.id)
      messages.push(parseGmailMessage(account.id, rawMessage))
    }

    return {
      fetched: messageIds.length,
      messages
    }
  },
  async startWatch(
    event: H3Event,
    account: MailAccount
  ): Promise<ProviderWatchResult> {
    if (!hasGmailAccessScope(account.scope)) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Gmail account needs reauthorization with Gmail modify access'
      })
    }

    const { pubsubTopic } = await getGoogleRuntimeConfig(event)

    if (!pubsubTopic) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing Gmail Pub/Sub topic'
      })
    }

    const accessToken = await getAccessToken(event, account)
    const watch = await gmailWatch(accessToken, pubsubTopic)

    return {
      historyId: watch.historyId,
      expiration: new Date(Number(watch.expiration)).toISOString(),
      providerData: {
        ...account.providerData,
        historyId: watch.historyId,
        watchExpiration: new Date(Number(watch.expiration)).toISOString()
      }
    }
  },
  async trashMessage(event: H3Event, account: MailAccount, message) {
    if (!hasGmailModifyScope(account.scope)) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Gmail account needs reauthorization with Gmail modify access'
      })
    }

    const accessToken = await getAccessToken(event, account)
    await gmailTrashMessage(accessToken, message.id)
  },
  parseWebhook(body: unknown): ProviderWebhookResult {
    const rawData = (body as PubSubPushBody).message?.data

    if (!rawData) {
      return {}
    }

    const payload = JSON.parse(Buffer.from(rawData, 'base64').toString('utf8')) as {
      emailAddress?: string
      historyId?: string
    }

    return {
      email: payload.emailAddress,
      providerData: {
        historyId: payload.historyId
      },
      syncQuery: 'in:inbox newer_than:7d'
    }
  }
}

function hasGmailAccessScope(scopes: string[]) {
  return scopes.some((scope) =>
    [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.modify',
      'https://mail.google.com/'
    ].includes(scope)
  )
}

function hasGmailModifyScope(scopes: string[]) {
  return scopes.some((scope) =>
    [
      'https://www.googleapis.com/auth/gmail.modify',
      'https://mail.google.com/'
    ].includes(scope)
  )
}
