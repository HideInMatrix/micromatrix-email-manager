import { createError, defineEventHandler, getRouterParam } from 'h3'
import { readState } from '../../utils/storage'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const state = await readState()
  const message = state.messages.find((item) => item.id === id)

  if (!message) {
    throw createError({ statusCode: 404, statusMessage: 'Message not found' })
  }

  return message
})
