import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes
} from 'node:crypto'

const devSecret = 'dev-only-gmail-manager-token-key-change-me'

function keyFromSecret(secret?: string) {
  return createHash('sha256').update(secret || devSecret).digest()
}

export function hasStrongEncryptionKey(secret?: string) {
  return Boolean(secret && secret.length >= 32)
}

export function encryptText(plainText: string, secret?: string) {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', keyFromSecret(secret), iv)
  const encrypted = Buffer.concat([
    cipher.update(plainText, 'utf8'),
    cipher.final()
  ])
  const tag = cipher.getAuthTag()

  return [
    'v1',
    iv.toString('base64url'),
    tag.toString('base64url'),
    encrypted.toString('base64url')
  ].join(':')
}

export function decryptText(cipherText: string, secret?: string) {
  const [version, ivRaw, tagRaw, encryptedRaw] = cipherText.split(':')

  if (version !== 'v1' || !ivRaw || !tagRaw || !encryptedRaw) {
    throw new Error('Unsupported cipher payload')
  }

  const decipher = createDecipheriv(
    'aes-256-gcm',
    keyFromSecret(secret),
    Buffer.from(ivRaw, 'base64url')
  )
  decipher.setAuthTag(Buffer.from(tagRaw, 'base64url'))

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedRaw, 'base64url')),
    decipher.final()
  ]).toString('utf8')
}

export function encryptJson(value: unknown, secret?: string) {
  return encryptText(JSON.stringify(value), secret)
}

export function decryptJson<T>(cipherText: string, secret?: string) {
  return JSON.parse(decryptText(cipherText, secret)) as T
}
