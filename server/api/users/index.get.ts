import { defineEventHandler } from 'h3'
import type { PublicAppUser } from '../../../shared/types'
import {
  getAdminRuntimeConfig,
  getConfiguredLoginEmails,
  requireAdmin
} from '../../utils/admin-auth'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const config = getAdminRuntimeConfig(event)
  const configuredLoginEmails = getConfiguredLoginEmails(event)

  for (const email of configuredLoginEmails) {
    const isConfiguredAdmin = email === normalizeEmail(config.email)
    await prisma.appUser.upsert({
      where: { email },
      update: isConfiguredAdmin ? { role: 'admin' } : {},
      create: {
        email,
        role: isConfiguredAdmin ? 'admin' : 'user'
      }
    })
  }

  const users = await prisma.appUser.findMany({
    where: {
      OR: [
        {
          passwordHash: {
            not: null
          }
        },
        {
          email: {
            in: configuredLoginEmails
          }
        }
      ]
    },
    orderBy: { email: 'asc' }
  })

  return users.map(toPublicUser)
})

function toPublicUser(user: {
  email: string
  name: string | null
  passwordHash: string | null
  role: string
  createdAt: Date
  updatedAt: Date
}): PublicAppUser {
  return {
    email: user.email,
    name: user.name || undefined,
    role: user.role,
    hasPassword: Boolean(user.passwordHash),
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString()
  }
}

function normalizeEmail(value?: string) {
  return (value || '').trim().toLowerCase()
}
