import { createError, defineEventHandler, getRouterParam } from 'h3'
import { addEvent, readState, writeState } from '../../utils/storage'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const state = await readState()
  const rule = state.rules.find((item) => item.id === id)

  if (!rule) {
    throw createError({ statusCode: 404, statusMessage: 'Rule not found' })
  }

  state.rules = state.rules.filter((item) => item.id !== id)
  state.messages = state.messages.map((message) => ({
    ...message,
    ruleMatches: message.ruleMatches.filter((ruleId) => ruleId !== id)
  }))
  addEvent(state, {
    type: 'rule',
    message: `${rule.name} deleted`
  })
  await writeState(state)

  return { ok: true }
})
