<script setup lang="ts">
import { Inbox, Search } from 'lucide-vue-next'
import type { MailMessage, PublicMailAccount } from '../../shared/types'
import { formatDate } from '../utils/format'

const props = defineProps<{
  messages: MailMessage[]
  accounts: PublicMailAccount[]
  selectedMessageId: string
  selectedAccountEmail?: string
  search: string
  unreadOnly: boolean
}>()

const emit = defineEmits<{
  'update:selectedMessageId': [id: string]
  'update:search': [value: string]
  'update:unreadOnly': [value: boolean]
}>()

const searchModel = computed({
  get: () => props.search,
  set: (value: string) => emit('update:search', value)
})

const unreadModel = computed({
  get: () => props.unreadOnly,
  set: (value: boolean) => emit('update:unreadOnly', value)
})

function accountName(accountId: string) {
  return props.accounts.find((account) => account.id === accountId)?.email || accountId
}
</script>

<template>
  <section class="panel inbox-panel">
    <div class="panel-head inbox-head">
      <div>
        <h2>收件箱</h2>
        <p>{{ selectedAccountEmail || '全部账号' }}</p>
      </div>
      <div class="filters">
        <label class="search-box">
          <Search :size="15" />
          <input v-model="searchModel" type="search" placeholder="搜索邮件">
        </label>
        <label class="toggle">
          <input v-model="unreadModel" type="checkbox">
          <span>未读</span>
        </label>
      </div>
    </div>

    <div class="message-table">
      <table>
        <thead>
          <tr>
            <th>主题</th>
            <th>发件人</th>
            <th>标签</th>
            <th>时间</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="message in messages"
            :key="`${message.accountId}:${message.id}`"
            :class="{
              unread: message.unread,
              selected: message.id === selectedMessageId
            }"
            @click="emit('update:selectedMessageId', message.id)"
          >
            <td>
              <strong>{{ message.subject }}</strong>
              <small>{{ message.snippet }}</small>
            </td>
            <td>
              <span>{{ message.from }}</span>
              <small>{{ accountName(message.accountId) }}</small>
            </td>
            <td>
              <span class="label-strip">
                <span
                  v-for="label in message.labels.slice(0, 3)"
                  :key="label"
                  class="mini-label"
                >
                  {{ label.replace('local:', '') }}
                </span>
              </span>
            </td>
            <td>{{ formatDate(message.receivedAt) }}</td>
          </tr>
        </tbody>
      </table>

      <div v-if="!messages.length" class="empty-state table-empty">
        <Inbox :size="24" />
        <span>暂无邮件</span>
      </div>
    </div>
  </section>
</template>
