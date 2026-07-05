import { useRuntimeConfig } from '#imports'
import { createError, type H3Event } from 'h3'
import type {
  MailProviderId,
  PublicMailProviderConfig
} from '../../shared/types'
import { decryptJson, encryptJson } from './crypto'
import { prisma } from './prisma'

export interface ProviderRuntimeConfig {
  provider: MailProviderId
  clientId: string
  clientSecret: string
  pubsubTopic?: string
  updatedAt?: string
}

interface ProviderConfigRow {
  provider: string
  clientId: string | null
  clientSecretCipher: string | null
  pubsubTopic: string | null
  updatedAt: string | Date | null
}

const providerIds: MailProviderId[] = ['gmail', 'outlook']

let tableReady: Promise<void> | undefined

export function assertProviderId(provider: string): asserts provider is MailProviderId {
  if (!providerIds.includes(provider as MailProviderId)) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Mail provider not found'
    })
  }
}

export async function listPublicProviderConfigs(
  event: H3Event
): Promise<PublicMailProviderConfig[]> {
  return Promise.all(
    providerIds.map(async (provider) => toPublicConfig(await readProviderConfig(event, provider)))
  )
}

export async function readProviderConfig(
  event: H3Event,
  provider: MailProviderId
): Promise<ProviderRuntimeConfig> {
  await ensureProviderConfigTable()
  const rows = await prisma.$queryRawUnsafe<ProviderConfigRow[]>(
    'SELECT provider, clientId, clientSecretCipher, pubsubTopic, updatedAt FROM ProviderConfig WHERE provider = ? LIMIT 1',
    provider
  )
  const row = rows[0]
  const config = useRuntimeConfig(event)
  const clientSecret = row?.clientSecretCipher
    ? decryptJson<string>(row.clientSecretCipher, config.tokenEncryptionKey as string)
    : ''

  return {
    provider,
    clientId: row?.clientId || '',
    clientSecret,
    pubsubTopic: row?.pubsubTopic || undefined,
    updatedAt: toIso(row?.updatedAt)
  }
}

export async function saveProviderConfig(
  event: H3Event,
  provider: MailProviderId,
  input: {
    clientId?: string
    clientSecret?: string
    pubsubTopic?: string
  }
) {
  await ensureProviderConfigTable()

  const current = await readProviderConfig(event, provider)
  const config = useRuntimeConfig(event)
  const nextClientSecret =
    input.clientSecret === undefined ? current.clientSecret : input.clientSecret.trim()
  const clientSecretCipher = nextClientSecret
    ? encryptJson(nextClientSecret, config.tokenEncryptionKey as string)
    : ''

  await prisma.$executeRawUnsafe(
    `INSERT INTO ProviderConfig (provider, clientId, clientSecretCipher, pubsubTopic, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     ON CONFLICT(provider) DO UPDATE SET
       clientId = excluded.clientId,
       clientSecretCipher = excluded.clientSecretCipher,
       pubsubTopic = excluded.pubsubTopic,
       updatedAt = CURRENT_TIMESTAMP`,
    provider,
    input.clientId?.trim() || '',
    clientSecretCipher,
    input.pubsubTopic?.trim() || null
  )

  return toPublicConfig(await readProviderConfig(event, provider))
}

export function getSiteUrl(event: H3Event) {
  const config = useRuntimeConfig(event)
  return (config.siteUrl as string).replace(/\/$/, '')
}

export function toPublicConfig(
  config: ProviderRuntimeConfig
): PublicMailProviderConfig {
  return {
    provider: config.provider,
    clientId: config.clientId,
    clientSecretSet: Boolean(config.clientSecret),
    pubsubTopic: config.pubsubTopic,
    updatedAt: config.updatedAt
  }
}

async function ensureProviderConfigTable() {
  if (!tableReady) {
    tableReady = prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS ProviderConfig (
        provider TEXT PRIMARY KEY NOT NULL,
        clientId TEXT NOT NULL DEFAULT '',
        clientSecretCipher TEXT NOT NULL DEFAULT '',
        pubsubTopic TEXT,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `).then(() => undefined)
  }

  await tableReady
}

function toIso(value: string | Date | null | undefined) {
  if (!value) {
    return undefined
  }

  return value instanceof Date ? value.toISOString() : new Date(value).toISOString()
}
