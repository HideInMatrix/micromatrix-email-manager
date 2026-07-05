import {
  createError,
  deleteCookie,
  getCookie,
  readBody,
  setCookie,
  type H3Event
} from 'h3'
import { useRuntimeConfig } from '#imports'
import { createHmac, timingSafeEqual } from 'node:crypto'

const adminCookieName = 'mail_admin'
const sessionTtlMs = 7 * 24 * 60 * 60 * 1000

interface AdminTokenPayload {
  email: string
  expiresAt: number
}

export interface AdminSession {
  configured: boolean
  authenticated: boolean
  email?: string
}

export function getAdminRuntimeConfig(event: H3Event) {
  const config = useRuntimeConfig(event)

  return {
    email: config.adminEmail as string,
    password: config.adminPassword as string,
    secret: (config.tokenEncryptionKey as string) || (config.adminPassword as string)
  }
}

export function isAdminConfigured(event: H3Event) {
  const config = getAdminRuntimeConfig(event)
  return Boolean(config.email && config.password)
}

export function getAdminSession(event: H3Event): AdminSession {
  const configured = isAdminConfigured(event)
  const token = getCookie(event, adminCookieName)

  if (!configured || !token) {
    return { configured, authenticated: false }
  }

  const payload = verifyToken(event, token)
  const config = getAdminRuntimeConfig(event)

  if (!payload || payload.email !== config.email || payload.expiresAt < Date.now()) {
    return { configured, authenticated: false }
  }

  return {
    configured,
    authenticated: true,
    email: payload.email
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

  return session
}

export async function readAdminCredentials(event: H3Event) {
  return await readBody<{ email?: string; password?: string }>(event)
}

export function validateAdminCredentials(
  event: H3Event,
  email?: string,
  password?: string
) {
  const config = getAdminRuntimeConfig(event)

  return safeEqual(email || '', config.email) && safeEqual(password || '', config.password)
}

export function setAdminSessionCookie(event: H3Event) {
  const config = getAdminRuntimeConfig(event)
  const payload: AdminTokenPayload = {
    email: config.email,
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

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)

  if (leftBuffer.length !== rightBuffer.length) {
    return false
  }

  return timingSafeEqual(leftBuffer, rightBuffer)
}
