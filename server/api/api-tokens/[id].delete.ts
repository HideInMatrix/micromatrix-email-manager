import { createError, defineEventHandler, getRouterParam } from 'h3'
import { requireAdmin } from '../../utils/admin-auth'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  requireAdmin(event)

  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing token id' })
  }

  const result = await prisma.apiToken.updateMany({
    where: {
      id,
      revokedAt: null
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
