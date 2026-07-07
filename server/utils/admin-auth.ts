import {
  createError,
  deleteCookie,
  getCookie,
  getHeader,
  readBody,
  setCookie,
  type H3Event
} from 'h3'
import { useRuntimeConfig } from '#imports'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { prisma } from './prisma'
import { hashApiToken, verifyPassword } from './password'

const adminCookieName = 'mail_admin'
const sessionTtlMs = 7 * 24 * 60 * 60 * 1000

interface AdminTokenPayload {
  email: string
  expiresAt: number
}

export interface AuthIdentity {
  email: string
  isAdmin: boolean
}

export interface AdminSession {
  configured: boolean
  authenticated: boolean
  email?: string
  isAdmin: boolean
}

export function getAdminRuntimeConfig(event: H3Event) {
  const config = useRuntimeConfig(event)

  return {
    email: config.adminEmail as string,
    password: config.adminPassword as string,
    userCredentials: config.userCredentials as string,
    secret: (config.tokenEncryptionKey as string) || (config.adminPassword as string)
  }
}

export function getConfiguredLoginEmails(event: H3Event) {
  const config = getAdminRuntimeConfig(event)
  const emails = [
    config.email,
    ...parseUserCredentials(config.userCredentials).map((user) => user.email)
  ]

  return Array.from(
    new Set(emails.map((email) => normalizeEmail(email)).filter(Boolean))
  )
}

export function isAdminConfigured(event: H3Event) {
  const config = getAdminRuntimeConfig(event)
  return Boolean(config.email && config.password)
}

export function getAdminSession(event: H3Event): AdminSession {
  const configured = isAdminConfigured(event)
  const token = getCookie(event, adminCookieName)

  if (!configured || !token) {
    return { configured, authenticated: false, isAdmin: false }
  }

  const payload = verifyToken(event, token)
  const config = getAdminRuntimeConfig(event)

  if (!payload || payload.expiresAt < Date.now()) {
    return { configured, authenticated: false, isAdmin: false }
  }

  return {
    configured,
    authenticated: true,
    email: payload.email,
    isAdmin: sameEmail(payload.email, config.email)
  }
}

export function requireAdmin(event: H3Event) {
  const session = getAdminSession(event)

  if (!session.configured) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Admin account is not configured'
    })
  }

  if (!session.authenticated) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Admin login required'
    })
  }

  if (!session.isAdmin) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Admin access required'
    })
  }

  return session
}

export async function getApiTokenIdentity(event: H3Event): Promise<AuthIdentity | undefined> {
  const token = readBearerToken(event)

  if (!token) {
    return undefined
  }

  const config = getAdminRuntimeConfig(event)
  const apiToken = await prisma.apiToken.findUnique({
    where: {
      tokenHash: hashApiToken(token)
    },
    include: {
      user: true
    }
  })

  if (!apiToken || apiToken.revokedAt) {
    return undefined
  }

  await prisma.apiToken.update({
    where: { id: apiToken.id },
    data: { lastUsedAt: new Date() }
  })

  return {
    email: apiToken.userEmail,
    isAdmin: apiToken.user.role === 'admin' || sameEmail(apiToken.userEmail, config.email)
  }
}

export async function readAdminCredentials(event: H3Event) {
  return await readBody<{ email?: string; password?: string }>(event)
}

export async function validateAdminCredentials(
  event: H3Event,
  email?: string,
  password?: string
): Promise<AuthIdentity | undefined> {
  const config = getAdminRuntimeConfig(event)
  const inputEmail = normalizeEmail(email)
  const inputPassword = password || ''

  if (
    sameEmail(inputEmail, config.email) &&
    safeEqual(inputPassword, config.password)
  ) {
    return {
      email: config.email,
      isAdmin: true
    }
  }

  const dbUser = await prisma.appUser.findUnique({
    where: { email: inputEmail }
  })

  if (dbUser?.passwordHash && verifyPassword(inputPassword, dbUser.passwordHash)) {
    return {
      email: dbUser.email,
      isAdmin: dbUser.role === 'admin' || sameEmail(dbUser.email, config.email)
    }
  }

  for (const user of parseUserCredentials(config.userCredentials)) {
    if (sameEmail(inputEmail, user.email) && safeEqual(inputPassword, user.password)) {
      return {
        email: user.email,
        isAdmin: false
      }
    }
  }

  return undefined
}

export function setAdminSessionCookie(event: H3Event, identity: AuthIdentity) {
  const payload: AdminTokenPayload = {
    email: identity.email,
    expiresAt: Date.now() + sessionTtlMs
  }

  setCookie(event, adminCookieName, signToken(event, payload), {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    path: '/',
    maxAge: sessionTtlMs / 1000
  })
}

export function clearAdminSessionCookie(event: H3Event) {
  deleteCookie(event, adminCookieName, {
    path: '/'
  })
}

function signToken(event: H3Event, payload: AdminTokenPayload) {
  const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString(
    'base64url'
  )
  return `${encodedPayload}.${signature(event, encodedPayload)}`
}

function verifyToken(event: H3Event, token: string): AdminTokenPayload | undefined {
  const [encodedPayload, expectedSignature] = token.split('.')

  if (!encodedPayload || !expectedSignature) {
    return undefined
  }

  if (!safeEqual(signature(event, encodedPayload), expectedSignature)) {
    return undefined
  }

  try {
    return JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'))
  } catch {
    return undefined
  }
}

function signature(event: H3Event, value: string) {
  const { secret } = getAdminRuntimeConfig(event)
  return createHmac('sha256', secret || 'micromatrix-email-manager-admin-dev-secret')
    .update(value)
    .digest('base64url')
}

function sameEmail(left?: string, right?: string) {
  return normalizeEmail(left) === normalizeEmail(right)
}

function normalizeEmail(value?: string) {
  return (value || '').trim().toLowerCase()
}

function parseUserCredentials(raw?: string) {
  const value = raw?.trim()

  if (!value) {
    return []
  }

  if (value.startsWith('[')) {
    try {
      const parsed = JSON.parse(value) as Array<{
        email?: string
        password?: string
      }>

      return parsed
        .map((user) => ({
          email: user.email?.trim() || '',
          password: user.password || ''
        }))
        .filter((user) => user.email && user.password)
    } catch {
      return []
    }
  }

  return value
    .split(/[\n,;]/)
    .map((item) => {
      const separatorIndex = item.indexOf(':')

      if (separatorIndex < 0) {
        return { email: '', password: '' }
      }

      return {
        email: item.slice(0, separatorIndex).trim(),
        password: item.slice(separatorIndex + 1)
      }
    })
    .filter((user) => user.email && user.password)
}

function readBearerToken(event: H3Event) {
  const authorization = getHeader(event, 'authorization') || ''
  const [scheme, ...parts] = authorization.split(/\s+/)

  if (scheme?.toLowerCase() !== 'bearer') {
    return undefined
  }

  return parts.join(' ').trim() || undefined
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)

  if (leftBuffer.length !== rightBuffer.length) {
    return false
  }

  return timingSafeEqual(leftBuffer, rightBuffer)
}
