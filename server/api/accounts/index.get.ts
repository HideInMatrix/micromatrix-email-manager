import { defineEventHandler } from 'h3'
import { filterAccountsForUser, getOptionalUserAccess } from '../../utils/access'
import { readState, toPublicAccount } from '../../utils/storage'

export default defineEventHandler(async (event) => {
  const access = await getOptionalUserAccess(event)
  const state = await readState()

  if (!access) {
    return []
  }

  return filterAccountsForUser(access, state.accounts).map(toPublicAccount)
})
