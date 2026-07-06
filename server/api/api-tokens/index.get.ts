import { defineEventHandler } from 'h3'
import { requireAdmin } from '../../utils/admin-auth'
import { toPublicApiToken } from '../../utils/api-tokens'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  requireAdmin(event)

  const tokens = await prisma.apiToken.findMany({
    where: {
      revokedAt: null
    },
    orderBy: { createdAt: 'desc' }
  })

  return tokens.map(toPublicApiToken)
})
