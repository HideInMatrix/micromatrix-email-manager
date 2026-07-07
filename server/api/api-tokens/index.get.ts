import { defineEventHandler } from 'h3'
import { normalizeEmail, requireUserAccess } from '../../utils/access'
import { toPublicApiToken } from '../../utils/api-tokens'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const access = await requireUserAccess(event)

  const tokens = await prisma.apiToken.findMany({
    where: {
      revokedAt: null,
      ...(!access.isAdmin ? { userEmail: normalizeEmail(access.email) } : {})
    },
    orderBy: { createdAt: 'desc' }
  })

  return tokens.map(toPublicApiToken)
})
