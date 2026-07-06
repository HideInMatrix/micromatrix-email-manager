import { defineEventHandler } from 'h3'
import { useRuntimeConfig } from '#imports'
import {
  filterAccountsForUser,
  filterEventsForUser,
  filterMessagesForUser,
  requireUserAccess
} from '../utils/access'
import { hasStrongEncryptionKey } from '../utils/crypto'
import { listProviders } from '../utils/providers'
import { readState } from '../utils/storage'

export default defineEventHandler(async (event) => {
  const access = requireUserAccess(event)
  const config = useRuntimeConfig(event)
  const state = await readState()
  const accounts = filterAccountsForUser(access, state.accounts)
  const messages = filterMessagesForUser(access, state.accounts, state.messages)
  const events = filterEventsForUser(access, state.accounts, state.events)

  return {
    configured: {
      encryption: hasStrongEncryptionKey(config.tokenEncryptionKey as string),
    },
    providers: await listProviders(event),
    counts: {
      accounts: accounts.length,
      messages: messages.length,
      rules: access.isAdmin ? state.rules.length : 0,
      unread: messages.filter((message) => message.unread).length
    },
    events: events.slice(0, 12)
  }
})
