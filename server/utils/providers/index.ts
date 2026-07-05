import { createError, type H3Event } from 'h3'
import type { MailProviderId, MailProviderSummary } from '../../../shared/types'
import { gmailProvider } from './gmail'
import { outlookProvider } from './outlook'
import type { MailProvider } from './types'

const providers: Record<MailProviderId, MailProvider> = {
  gmail: gmailProvider,
  outlook: outlookProvider
}

export async function listProviders(event: H3Event): Promise<MailProviderSummary[]> {
  return Promise.all(
    Object.values(providers).map((provider) => provider.getSummary(event))
  )
}

export function getProvider(id: string | undefined): MailProvider {
  if (!id || !(id in providers)) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Mail provider not found'
    })
  }

  return providers[id as MailProviderId]
}

export function getProviderForAccount(providerId: MailProviderId): MailProvider {
  return providers[providerId]
}
