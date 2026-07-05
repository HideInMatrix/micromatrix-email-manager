import { defineEventHandler } from 'h3'
import { useRuntimeConfig } from '#imports'
import { hasStrongEncryptionKey } from '../utils/crypto'
import { listProviders } from '../utils/providers'
import { readState } from '../utils/storage'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const state = await readState()

  return {
    configured: {
      encryption: hasStrongEncryptionKey(config.tokenEncryptionKey as string),
    },
    providers: await listProviders(event),
    counts: {
      accounts: state.accounts.length,
      messages: state.messages.length,
      rules: state.rules.length,
      unread: state.messages.filter((message) => message.unread).length
    },
    events: state.events.slice(0, 12)
  }
})
