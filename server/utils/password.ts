import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

const passwordKeyLength = 64

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('base64url')
  const hash = scryptSync(password, salt, passwordKeyLength).toString('base64url')

  return `scrypt:${salt}:${hash}`
}

export function verifyPassword(password: string, storedHash?: string | null) {
  if (!storedHash) {
    return false
  }

  const [algorithm, salt, expectedHash] = storedHash.split(':')

  if (algorithm !== 'scrypt' || !salt || !expectedHash) {
    return false
  }

  const actualBuffer = Buffer.from(
    scryptSync(password, salt, passwordKeyLength).toString('base64url')
  )
  const expectedBuffer = Buffer.from(expectedHash)

  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  )
}

export function createApiTokenValue() {
  return `met_${randomBytes(32).toString('base64url')}`
}

export function hashApiToken(token: string) {
  return createHash('sha256').update(token).digest('base64url')
}
