import type { AppState, AutomationRule, MailMessage } from '../../shared/types'

export function applyRules(state: AppState, message: MailMessage) {
  for (const rule of state.rules) {
    if (!rule.enabled || rule.provider !== message.provider || !matchesRule(rule, message)) {
      continue
    }

    if (!message.ruleMatches.includes(rule.id)) {
      message.ruleMatches.push(rule.id)
    }

    if (rule.action.markRead) {
      message.unread = false
      message.labels = message.labels.filter((label) => label !== 'UNREAD')
    }

    if (rule.action.archive) {
      message.labels = message.labels.filter((label) => label !== 'INBOX')
    }

    if (rule.action.addLabel) {
      const localLabel = `local:${rule.action.addLabel}`

      if (!message.labels.includes(localLabel)) {
        message.labels.push(localLabel)
      }
    }

    rule.matchCount += 1
    rule.lastMatchedAt = new Date().toISOString()
    rule.updatedAt = new Date().toISOString()
  }
}

function matchesRule(rule: AutomationRule, message: MailMessage) {
  const from = normalized(message.from)
  const subject = normalized(message.subject)
  const snippet = normalized(message.snippet)
  const bodyText = normalized(message.bodyText || '')
  const labels = message.labels.map((label) => normalized(label))

  if (rule.match.from && !from.includes(normalized(rule.match.from))) {
    return false
  }

  if (rule.match.subject && !subject.includes(normalized(rule.match.subject))) {
    return false
  }

  if (
    rule.match.contains &&
    !snippet.includes(normalized(rule.match.contains)) &&
    !bodyText.includes(normalized(rule.match.contains))
  ) {
    return false
  }

  if (
    rule.match.hasLabel &&
    !labels.includes(normalized(rule.match.hasLabel)) &&
    !labels.includes(`local:${normalized(rule.match.hasLabel)}`)
  ) {
    return false
  }

  return true
}

function normalized(value: string) {
  return value.trim().toLowerCase()
}
