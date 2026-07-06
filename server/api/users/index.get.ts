import { defineEventHandler } from 'h3'
import type { PublicAppUser } from '../../../shared/types'
import { getAdminRuntimeConfig, requireAdmin } from '../../utils/admin-auth'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const session = requireAdmin(event)
  const config = getAdminRuntimeConfig(event)
  const sessionEmail = session.email || config.email

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

  if (config.email && config.email !== sessionEmail) {
    await prisma.appUser.upsert({
      where: { email: config.email },
      update: { role: 'admin' },
      create: {
        email: config.email,
        role: 'admin'
      }
    })
  }

  const users = await prisma.appUser.findMany({
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
