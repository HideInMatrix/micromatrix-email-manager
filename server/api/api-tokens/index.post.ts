import { randomUUID } from 'node:crypto'
import { createError, defineEventHandler, readBody } from 'h3'
import type { CreatedApiToken } from '../../../shared/types'
import { requireUserAccess } from '../../utils/access'
import { toPublicApiToken } from '../../utils/api-tokens'
import { createApiTokenValue, hashApiToken } from '../../utils/password'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event): Promise<CreatedApiToken> => {
  const access = await requireUserAccess(event)
  const sessionEmail = normalizeEmail(access.email)
  const body = await readBody<{
    name?: string
    userEmail?: string
  }>(event)
  const requestedUserEmail = normalizeEmail(body.userEmail)
  const userEmail = access.isAdmin
    ? requestedUserEmail || sessionEmail
    : sessionEmail

  if (!sessionEmail) {
    throw createError({ statusCode: 401, statusMessage: 'Login required' })
  }

  if (!userEmail) {
    throw createError({ statusCode: 400, statusMessage: 'User email is required' })
  }

  if (!access.isAdmin && requestedUserEmail && requestedUserEmail !== sessionEmail) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Cannot create API token for another user'
    })
  }

  const sessionUser = await prisma.appUser.upsert({
    where: { email: sessionEmail },
    update: {
      role: access.isAdmin ? 'admin' : 'user'
    },
    create: {
      email: sessionEmail,
      role: access.isAdmin ? 'admin' : 'user'
    }
  })

  const targetUser = userEmail === sessionEmail
    ? sessionUser
    : await prisma.appUser.findUnique({
        where: { email: userEmail }
      })

  if (!targetUser) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  }

  const token = createApiTokenValue()
  const apiToken = await prisma.apiToken.create({
    data: {
      id: randomUUID(),
      name: (body.name || '').trim(),
      tokenHash: hashApiToken(token),
      tokenPrefix: token.slice(0, 12),
      userEmail: targetUser.email,
      createdByEmail: sessionEmail
    }
  })

  return {
    token,
    apiToken: toPublicApiToken(apiToken)
  }
})

function normalizeEmail(value?: string) {
  return (value || '').trim().toLowerCase()
}
