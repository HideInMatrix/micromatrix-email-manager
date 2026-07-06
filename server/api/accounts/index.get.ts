import { defineEventHandler } from 'h3'
import { filterAccountsForUser, requireUserAccess } from '../../utils/access'
import { readState, toPublicAccount } from '../../utils/storage'

export default defineEventHandler(async (event) => {
  const access = requireUserAccess(event)
  const state = await readState()
  return filterAccountsForUser(access, state.accounts).map(toPublicAccount)
})
