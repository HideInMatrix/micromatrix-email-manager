<script setup lang="ts">
import { Archive, Inbox, MailOpen, Tag } from 'lucide-vue-next'
import type { AutomationRule, MailMessage } from '../../shared/types'
import { formatDate } from '../utils/format'

defineProps<{
  message?: MailMessage
  rules: AutomationRule[]
}>()
</script>

<template>
  <section class="panel detail-panel">
    <div class="panel-head">
      <h2>详情</h2>
    </div>

    <template v-if="message">
      <div class="message-detail">
        <h3>{{ message.subject }}</h3>
        <div class="meta-grid">
          <span>Provider</span>
          <strong>{{ message.provider }}</strong>
          <span>From</span>
          <strong>{{ message.from }}</strong>
          <span>To</span>
          <strong>{{ message.to }}</strong>
          <span>Date</span>
          <strong>{{ formatDate(message.receivedAt) }}</strong>
        </div>

        <div class="detail-actions">
          <span v-if="message.unread" class="action-chip">
            <MailOpen :size="14" />
            未读
          </span>
          <span v-if="!message.labels.includes('INBOX')" class="action-chip">
            <Archive :size="14" />
            已归档
          </span>
          <span
            v-for="ruleId in message.ruleMatches"
            :key="ruleId"
            class="action-chip"
          >
            <Tag :size="14" />
            {{ rules.find((rule) => rule.id === ruleId)?.name || '规则' }}
          </span>
        </div>

        <pre>{{ message.bodyText || message.snippet }}</pre>
      </div>
    </template>

    <div v-else class="empty-state">
      <Inbox :size="22" />
      <span>未选择邮件</span>
    </div>
  </section>
</template>
