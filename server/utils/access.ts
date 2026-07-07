import { createError, getHeader, type H3Event } from 'h3'
import type { AppEvent, MailAccount, MailMessage } from '../../shared/types'
import { getAdminSession, getApiTokenIdentity } from './admin-auth'

export interface UserAccess {
  email: string
  isAdmin: boolean
}

export async function getOptionalUserAccess(
  event: H3Event
): Promise<UserAccess | undefined> {
  const apiIdentity = await getApiTokenIdentity(event)

  if (apiIdentity) {
    return apiIdentity
  }

  if (hasBearerAuthorization(event)) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid API token'
    })
  }

  const session = getAdminSession(event)

  if (!session.configured || !session.authenticated || !session.email) {
    return undefined
  }

  return {
    email: session.email,
    isAdmin: session.isAdmin
  }
}

export async function requireUserAccess(event: H3Event): Promise<UserAccess> {
  const apiIdentity = await getApiTokenIdentity(event)

  if (apiIdentity) {
    return apiIdentity
  }

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

  return {
    email: session.email,
    isAdmin: session.isAdmin
  }
}

export function canAccessAccount(access: UserAccess, account: MailAccount) {
  return (
    access.isAdmin ||
    normalizeEmail(accountOwnerEmail(account)) === normalizeEmail(access.email)
  )
}

export function filterAccountsForUser(
  access: UserAccess,
  accounts: MailAccount[]
) {
  return access.isAdmin
    ? accounts
    : accounts.filter((account) => canAccessAccount(access, account))
}

export function filterMessagesForUser(
  access: UserAccess,
  accounts: MailAccount[],
  messages: MailMessage[]
) {
  if (access.isAdmin) {
    return messages
  }

  const accountIds = new Set(
    filterAccountsForUser(access, accounts).map((account) => account.id)
  )

  return messages.filter((message) => accountIds.has(message.accountId))
}

export function filterEventsForUser(
  access: UserAccess,
  accounts: MailAccount[],
  events: AppEvent[]
) {
  if (access.isAdmin) {
    return events
  }

  const accountIds = new Set(
    filterAccountsForUser(access, accounts).map((account) => account.id)
  )

  return events.filter(
    (event) => event.accountId && accountIds.has(event.accountId)
  )
}

export function assertCanAccessAccount(
  access: UserAccess,
  account?: MailAccount
): asserts account is MailAccount {
  if (!account || !canAccessAccount(access, account)) {
    throw createError({ statusCode: 404, statusMessage: 'Account not found' })
  }
}

export function accountOwnerEmail(account: MailAccount) {
  return account.ownerEmail || account.email
}

export function normalizeEmail(value?: string) {
  return (value || '').trim().toLowerCase()
}

function hasBearerAuthorization(event: H3Event) {
  const authorization = getHeader(event, 'authorization') || ''
  const [scheme, token] = authorization.split(/\s+/)
  return scheme?.toLowerCase() === 'bearer' && Boolean(token)
}
