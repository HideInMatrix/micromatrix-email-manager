import { defineEventHandler } from 'h3'
import { readState } from '../../utils/storage'

export default defineEventHandler(async () => {
  const state = await readState()
  return state.rules
})
