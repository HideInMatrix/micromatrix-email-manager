import { defineEventHandler } from 'h3'
import { getOptionalUserAccess } from '../../utils/access'
import { readState } from '../../utils/storage'

export default defineEventHandler(async (event) => {
  const access = await getOptionalUserAccess(event)
  const state = await readState()
  return access?.isAdmin ? state.rules : []
})
