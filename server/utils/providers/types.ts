import type { H3Event } from 'h3'
import type {
  AppState,
  MailAccount,
  MailMessage,
  MailProviderCapability,
  MailProviderId,
  MailProviderSummary,
  StoredOAuthToken
} from '../../../shared/types'

export interface OAuthProfile {
  id: string
  email: string
  name: string
  picture?: string
  scope: string[]
  token: StoredOAuthToken
  providerData?: Record<string, string | undefined>
}

export interface ProviderSyncOptions {
  limit: number
  query?: string
}

export interface ProviderSyncResult {
  fetched: number
  messages: MailMessage[]
}

export interface ProviderWatchResult {
  historyId?: string
  expiration?: string
  providerData?: Record<string, string | undefined>
}

export interface ProviderWebhookResult {
  email?: string
  providerData?: Record<string, string | undefined>
  syncQuery?: string
}

export interface MailProvider {
  id: MailProviderId
  name: string
  description: string
  setupFields: string[]
  scopes: string[]
  capabilities: MailProviderCapability
  isConfigured: (event: H3Event) => Promise<boolean>
  getRedirectUri: (event: H3Event) => string
  getSummary: (event: H3Event) => Promise<MailProviderSummary>
  buildOAuthUrl?: (event: H3Event, state: string) => Promise<string>
  completeOAuth?: (event: H3Event, code: string) => Promise<OAuthProfile>
  encryptToken?: (event: H3Event, token: StoredOAuthToken) => string
  decryptToken?: (event: H3Event, account: MailAccount) => StoredOAuthToken
  syncAccount?: (
    event: H3Event,
    state: AppState,
    account: MailAccount,
    options: ProviderSyncOptions
  ) => Promise<ProviderSyncResult>
  startWatch?: (
    event: H3Event,
    account: MailAccount
  ) => Promise<ProviderWatchResult>
  trashMessage?: (
    event: H3Event,
    account: MailAccount,
    message: MailMessage
  ) => Promise<void>
  markReadMessage?: (
    event: H3Event,
    account: MailAccount,
    message: MailMessage
  ) => Promise<void>
  parseWebhook?: (body: unknown) => ProviderWebhookResult
}
