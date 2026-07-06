import { defineEventHandler } from 'h3'
import { requireUserAccess } from '../../utils/access'
import { readState } from '../../utils/storage'

export default defineEventHandler(async (event) => {
  const access = await requireUserAccess(event)
  const state = await readState()
  return access.isAdmin ? state.rules : []
})
