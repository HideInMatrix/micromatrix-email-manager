import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
import type { AutomationRule } from '../../../shared/types'
import { assertProviderId } from '../../utils/provider-configs'
import { addEvent, readState, writeState } from '../../utils/storage'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const body = await readBody<Partial<AutomationRule>>(event)
  const state = await readState()
  const rule = state.rules.find((item) => item.id === id)

  if (!rule) {
    throw createError({ statusCode: 404, statusMessage: 'Rule not found' })
  }

  const provider = body.provider || rule.provider
  assertProviderId(provider)

  rule.provider = provider
  rule.name = body.name?.trim() || rule.name
  rule.enabled = body.enabled ?? rule.enabled
  rule.match = {
    from: body.match?.from?.trim() || undefined,
    subject: body.match?.subject?.trim() || undefined,
    contains: body.match?.contains?.trim() || undefined,
    hasLabel: body.match?.hasLabel?.trim() || undefined
  }
  rule.action = {
    markRead: Boolean(body.action?.markRead),
    archive: Boolean(body.action?.archive),
    addLabel: body.action?.addLabel?.trim() || undefined
  }
  rule.updatedAt = new Date().toISOString()
  addEvent(state, {
    type: 'rule',
    message: `${rule.provider}: ${rule.name} updated`
  })
  await writeState(state)

  return rule
})
