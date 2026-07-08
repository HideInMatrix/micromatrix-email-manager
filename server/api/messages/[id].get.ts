import { createError, defineEventHandler, getQuery, getRouterParam } from 'h3'
import {
  filterMessagesForUser,
  requireUserAccess
} from '../../utils/access'
import { extractByRules } from '../../utils/rules'
import { readState } from '../../utils/storage'

export default defineEventHandler(async (event) => {
  const access = await requireUserAccess(event)
  const id = getRouterParam(event, 'id')
  const query = getQuery(event)
  const extractionRuleId = typeof query.ruleId === 'string' ? query.ruleId.trim() : ''
  const includeExtractions = query.extract === 'true' || Boolean(extractionRuleId)
  const state = await readState()
  const message = filterMessagesForUser(access, state.accounts, state.messages)
    .find((item) => item.id === id)

  if (!message) {
    throw createError({ statusCode: 404, statusMessage: 'Message not found' })
  }

  if (!includeExtractions) {
    return message
  }

  const extractionRules = state.rules.filter((rule) => rule.kind === 'api')

  if (
    extractionRuleId &&
    !extractionRules.some((rule) => rule.id === extractionRuleId)
  ) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Extraction rule not found'
    })
  }

  const extractions = extractByRules(
    extractionRules,
    message,
    extractionRuleId || undefined
  )

  return extractions.length ? { ...message, extractions } : message
})
