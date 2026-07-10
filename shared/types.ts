export type AccountStatus = 'connected' | 'needs_reauth' | 'error'
export type MailProviderId = 'gmail' | 'outlook'
export type MailProviderConfigKey = 'clientId' | 'clientSecret' | 'pubsubTopic' | 'tenantId'

export interface MailProviderCapability {
  oauth: boolean
  sync: boolean
  watch: boolean
  send: boolean
}

export interface MailProviderSummary {
  id: MailProviderId
  name: string
  description: string
  configured: boolean
  enabled: boolean
  redirectUri: string
  setupFields: string[]
  configFields: MailProviderConfigField[]
  scopes: string[]
  capabilities: MailProviderCapability
}

export interface MailProviderConfigField {
  key: MailProviderConfigKey
  label: string
  required: boolean
  secret?: boolean
  placeholder?: string
}

export interface PublicMailProviderConfig {
  provider: MailProviderId
  clientId: string
  clientSecretSet: boolean
  pubsubTopic?: string
  tenantId?: string
  updatedAt?: string
}

export interface RevealedProviderSecret {
  provider: MailProviderId
  clientSecret: string
  clientSecretSet: boolean
}

export interface MailAccount {
  id: string
  ownerEmail?: string
  provider: MailProviderId
  email: string
  name: string
  picture?: string
  scope: string[]
  tokenCipher: string
  status: AccountStatus
  providerData: Record<string, string | undefined>
  lastSyncAt?: string
  lastError?: string
  createdAt: string
  updatedAt: string
}

export interface PublicMailAccount extends Omit<MailAccount, 'tokenCipher'> {
  hasToken: boolean
}

export interface PublicAppUser {
  email: string
  name?: string
  role: string
  hasPassword: boolean
  createdAt: string
  updatedAt: string
}

export interface PublicApiToken {
  id: string
  name?: string
  tokenPrefix: string
  userEmail: string
  createdByEmail: string
  lastUsedAt?: string
  revokedAt?: string
  createdAt: string
  updatedAt: string
}

export interface CreatedApiToken {
  token: string
  apiToken: PublicApiToken
}

export interface StoredOAuthToken {
  access_token?: string
  refresh_token?: string
  scope?: string
  token_type?: string
  expiry_date?: number
}

export interface MailAttachment {
  filename: string
  mimeType: string
  attachmentId?: string
  size?: number
}

export interface MailMessage {
  id: string
  threadId: string
  accountId: string
  provider: MailProviderId
  subject: string
  from: string
  to: string
  date: string
  snippet: string
  labels: string[]
  unread: boolean
  internalDate: number
  bodyText?: string
  bodyHtml?: string
  attachments: MailAttachment[]
  ruleMatches: string[]
  extractions?: MailRuleExtraction[]
  receivedAt: string
  updatedAt: string
}

export interface PaginatedMessages {
  messages: MailMessage[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export type AutomationRuleKind = 'display' | 'api'
export type RuleTextSource = 'snippet' | 'bodyText' | 'subject' | 'from' | 'to' | 'all'

export interface RuleExtractionConfig {
  source: RuleTextSource
  pattern: string
  flags?: string
  groupIndex: number
  fieldName: string
}

export interface MailRuleExtraction {
  ruleId: string
  ruleName: string
  fieldName: string
  value: string
  source: RuleTextSource
  groups: string[]
}

export interface AutomationRule {
  id: string
  kind: AutomationRuleKind
  provider: MailProviderId
  name: string
  enabled: boolean
  match: {
    from?: string
    subject?: string
    contains?: string
    hasLabel?: string
  }
  action: {
    markRead: boolean
    archive: boolean
    addLabel?: string
  }
  extraction?: RuleExtractionConfig
  matchCount: number
  lastMatchedAt?: string
  createdAt: string
  updatedAt: string
}

export interface OAuthState {
  id: string
  provider: MailProviderId
  createdAt: string
}

export interface AppEvent {
  id: string
  type: 'oauth' | 'sync' | 'watch' | 'webhook' | 'rule' | 'message' | 'error'
  message: string
  accountId?: string
  createdAt: string
}

export interface EventLogSettings {
  clearCron: string
  lastClearedAt?: string
}

export interface PaginatedEvents {
  events: AppEvent[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  settings: EventLogSettings
}

export interface AppStatus {
  configured: {
    encryption: boolean
  }
  providers: MailProviderSummary[]
  counts: {
    accounts: number
    messages: number
    rules: number
    unread: number
  }
  events: AppEvent[]
}

export interface AppState {
  version: 1
  accounts: MailAccount[]
  messages: MailMessage[]
  rules: AutomationRule[]
  oauthStates: OAuthState[]
  events: AppEvent[]
}

export interface SyncSummary {
  accountId: string
  email: string
  fetched: number
  stored: number
  error?: string
}
