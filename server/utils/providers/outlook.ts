import { getRequestURL, type H3Event } from 'h3'
import type { MailProvider, ProviderWebhookResult } from './types'
import { getSiteUrl, readProviderConfig } from '../provider-configs'

const OUTLOOK_SCOPES = [
  'openid',
  'email',
  'profile',
  'offline_access',
  'https://graph.microsoft.com/Mail.ReadWrite'
]

async function getOutlookConfig(event: H3Event) {
  return await readProviderConfig(event, 'outlook')
}

function getOutlookRedirectUri(event: H3Event) {
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

export const outlookProvider: MailProvider = {
  id: 'outlook',
  name: 'Outlook',
  description: '预留 Microsoft Graph OAuth、邮件同步和订阅推送接入点。',
  setupFields: ['Client ID', 'Client Secret'],
  scopes: OUTLOOK_SCOPES,
  capabilities: {
    oauth: false,
    sync: false,
    watch: false,
    send: false
  },
  async isConfigured(event) {
    const config = await getOutlookConfig(event)
    return Boolean(config.clientId && config.clientSecret)
  },
  getRedirectUri: getOutlookRedirectUri,
  async getSummary(event) {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      configured: await this.isConfigured(event),
      enabled: false,
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
        }
      ],
      scopes: this.scopes,
      capabilities: this.capabilities
    }
  },
  parseWebhook(_body: unknown): ProviderWebhookResult {
    return {}
  }
}
