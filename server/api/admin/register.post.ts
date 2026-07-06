import { createError, defineEventHandler, readBody } from 'h3'
import {
  getAdminRuntimeConfig,
  isAdminConfigured,
  setAdminSessionCookie
} from '../../utils/admin-auth'
import { hashPassword } from '../../utils/password'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  if (!isAdminConfigured(event)) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Admin account is not configured'
    })
  }

  const body = await readBody<{
    email?: string
    password?: string
    passwordConfirm?: string
  }>(event)
  const email = normalizeEmail(body.email)
  const password = body.password || ''
  const passwordConfirm = body.passwordConfirm || ''
  const config = getAdminRuntimeConfig(event)

  if (!email) {
    throw createError({ statusCode: 400, statusMessage: 'Email is required' })
  }

  if (email === normalizeEmail(config.email)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Admin account cannot be registered here'
    })
  }

  if (password.length < 8) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Password must be at least 8 characters'
    })
  }

  if (password !== passwordConfirm) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Password confirmation does not match'
    })
  }

  const existing = await prisma.appUser.findUnique({
    where: { email }
  })

  if (existing?.passwordHash) {
    throw createError({
      statusCode: 409,
      statusMessage: 'User already exists'
    })
  }

  const passwordHash = hashPassword(password)
  const user = await prisma.appUser.upsert({
    where: { email },
    update: {
      passwordHash,
      role: existing?.role || 'user'
    },
    create: {
      email,
      passwordHash,
      role: 'user'
    }
  })

  setAdminSessionCookie(event, {
    email: user.email,
    isAdmin: false
  })

  return {
    ok: true,
    email: user.email,
    isAdmin: false
  }
})

function normalizeEmail(value?: string) {
  return (value || '').trim().toLowerCase()
}
