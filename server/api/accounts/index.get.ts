import { defineEventHandler } from 'h3'
import { readState, toPublicAccount } from '../../utils/storage'

export default defineEventHandler(async () => {
  const state = await readState()
  return state.accounts.map(toPublicAccount)
})
