import { createError, defineEventHandler, getRouterParam } from 'h3'
import { normalizeEmail, requireUserAccess } from '../../utils/access'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const access = await requireUserAccess(event)

  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing token id' })
  }

  const result = await prisma.apiToken.updateMany({
    where: {
      id,
      revokedAt: null,
      ...(!access.isAdmin ? { userEmail: normalizeEmail(access.email) } : {})
    },
    data: {
      revokedAt: new Date()
    }
  })

  if (!result.count) {
    throw createError({ statusCode: 404, statusMessage: 'Token not found' })
  }

  return {
    ok: true
  }
})
