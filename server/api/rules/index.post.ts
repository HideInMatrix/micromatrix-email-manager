import { randomUUID } from 'node:crypto'
import { createError, defineEventHandler, readBody } from 'h3'
import type { AutomationRule } from '../../../shared/types'
import { requireAdmin } from '../../utils/admin-auth'
import { assertProviderId } from '../../utils/provider-configs'
import { normalizeRuleExtraction, normalizeRuleKind } from '../../utils/rules'
import { addEvent, readState, writeState } from '../../utils/storage'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const body = await readBody<Partial<AutomationRule>>(event)

  if (!body.name?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Rule name is required' })
  }

  const provider = body.provider || 'gmail'
  assertProviderId(provider)
  const kind = normalizeRuleKind(body.kind)
  const extraction = normalizeRuleExtraction(body.extraction, kind)

  const now = new Date().toISOString()
  const rule: AutomationRule = {
    id: randomUUID(),
    kind,
    provider,
    name: body.name.trim(),
    enabled: body.enabled ?? true,
    match: {
      from: body.match?.from?.trim() || undefined,
      subject: body.match?.subject?.trim() || undefined,
      contains: body.match?.contains?.trim() || undefined,
      hasLabel: body.match?.hasLabel?.trim() || undefined
    },
    action: {
      markRead: kind === 'display' && Boolean(body.action?.markRead),
      archive: kind === 'display' && Boolean(body.action?.archive),
      addLabel: kind === 'display' ? body.action?.addLabel?.trim() || undefined : undefined
    },
    extraction,
    matchCount: 0,
    createdAt: now,
    updatedAt: now
  }

  const state = await readState()
  state.rules.unshift(rule)
  addEvent(state, {
    type: 'rule',
    message: `${rule.provider}: ${rule.name} created`
  })
  await writeState(state)

  return rule
})
