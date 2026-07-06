import { createError, defineEventHandler } from 'h3'
import {
  isAdminConfigured,
  readAdminCredentials,
  setAdminSessionCookie,
  validateAdminCredentials
} from '../../utils/admin-auth'

export default defineEventHandler(async (event) => {
  if (!isAdminConfigured(event)) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Admin account is not configured'
    })
  }

  const body = await readAdminCredentials(event)
  const identity = await validateAdminCredentials(event, body.email, body.password)

  if (!identity) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid credentials'
    })
  }

  setAdminSessionCookie(event, identity)

  return { ok: true, email: identity.email, isAdmin: identity.isAdmin }
})
