import { defineEventHandler } from 'h3'
import { listProviders } from '../../utils/providers'

export default defineEventHandler(async (event) => {
  return await listProviders(event)
})
