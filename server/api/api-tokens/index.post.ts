import { randomUUID } from 'node:crypto'
import { createError, defineEventHandler, readBody } from 'h3'
import type { CreatedApiToken } from '../../../shared/types'
import { requireAdmin } from '../../utils/admin-auth'
import { toPublicApiToken } from '../../utils/api-tokens'
import { createApiTokenValue, hashApiToken } from '../../utils/password'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event): Promise<CreatedApiToken> => {
  const session = requireAdmin(event)
  const sessionEmail = session.email || ''
  const body = await readBody<{
    name?: string
    userEmail?: string
  }>(event)
  const userEmail = normalizeEmail(body.userEmail)

  if (!sessionEmail) {
    throw createError({ statusCode: 401, statusMessage: 'Admin login required' })
  }

  if (!userEmail) {
    throw createError({ statusCode: 400, statusMessage: 'User email is required' })
  }

  const user = await prisma.appUser.findUnique({
    where: { email: userEmail }
  })

  if (!user) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  }

  await prisma.appUser.upsert({
    where: { email: sessionEmail },
    update: {
      role: session.isAdmin ? 'admin' : 'user'
    },
    create: {
      email: sessionEmail,
      role: session.isAdmin ? 'admin' : 'user'
    }
  })

  const token = createApiTokenValue()
  const apiToken = await prisma.apiToken.create({
    data: {
      id: randomUUID(),
      name: (body.name || '').trim(),
      tokenHash: hashApiToken(token),
      tokenPrefix: token.slice(0, 12),
      userEmail: user.email,
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
