import type { PublicApiToken } from '../../shared/types'

export function toPublicApiToken(token: {
  id: string
  name: string
  tokenPrefix: string
  userEmail: string
  createdByEmail: string
  lastUsedAt: Date | null
  revokedAt: Date | null
  createdAt: Date
  updatedAt: Date
}): PublicApiToken {
  return {
    id: token.id,
    name: token.name || undefined,
    tokenPrefix: token.tokenPrefix,
    userEmail: token.userEmail,
    createdByEmail: token.createdByEmail,
    lastUsedAt: token.lastUsedAt?.toISOString(),
    revokedAt: token.revokedAt?.toISOString(),
    createdAt: token.createdAt.toISOString(),
    updatedAt: token.updatedAt.toISOString()
  }
}
