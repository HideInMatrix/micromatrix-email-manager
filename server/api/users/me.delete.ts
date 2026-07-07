import { createError, defineEventHandler } from 'h3'
import {
  clearAdminSessionCookie,
  getAdminSession
} from '../../utils/admin-auth'
import { normalizeEmail } from '../../utils/access'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const session = getAdminSession(event)

  if (!session.configured) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Login is not configured'
    })
  }

  if (!session.authenticated || !session.email) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Login required'
    })
  }

  if (session.isAdmin) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Admin account cannot be deleted here'
    })
  }

  const normalizedEmail = normalizeEmail(session.email)

  const result = await prisma.$transaction(async (tx) => {
    const [accounts, users] = await Promise.all([
      tx.mailAccount.findMany({
        select: {
          id: true,
          email: true,
          ownerEmail: true
        }
      }),
      tx.appUser.findMany({
        select: {
          email: true
        }
      })
    ])

    const accountIds = accounts
      .filter(
        (account) =>
          normalizeEmail(account.ownerEmail || account.email) === normalizedEmail
      )
      .map((account) => account.id)

    const userEmails = Array.from(
      new Set([
        session.email,
        ...users
          .filter((user) => normalizeEmail(user.email) === normalizedEmail)
          .map((user) => user.email)
      ])
    )

    if (accountIds.length) {
      await tx.appEvent.deleteMany({
        where: {
          accountId: {
            in: accountIds
          }
        }
      })

      await tx.mailMessage.deleteMany({
        where: {
          accountId: {
            in: accountIds
          }
        }
      })

      await tx.mailAccount.deleteMany({
        where: {
          id: {
            in: accountIds
          }
        }
      })
    }

    await tx.apiToken.deleteMany({
      where: {
        OR: [
          {
            userEmail: {
              in: userEmails
            }
          },
          {
            createdByEmail: {
              in: userEmails
            }
          }
        ]
      }
    })

    const deletedUsers = await tx.appUser.deleteMany({
      where: {
        email: {
          in: userEmails
        }
      }
    })

    return {
      deletedAccounts: accountIds.length,
      deletedUsers: deletedUsers.count
    }
  })

  clearAdminSessionCookie(event)

  return {
    ok: true,
    ...result
  }
})
