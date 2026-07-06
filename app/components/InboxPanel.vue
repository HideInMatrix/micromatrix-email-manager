<script setup lang="ts">
import { Inbox, Search, Tag } from 'lucide-vue-next'
import type { AppStatus, MailMessage, PublicMailAccount } from '../../shared/types'
import { formatDate } from '../utils/format'

const props = defineProps<{
  messages: MailMessage[]
  accounts: PublicMailAccount[]
  status?: AppStatus
  selectedMessageId: string
  selectedAccountEmail?: string
  search: string
  unreadOnly: boolean
  ruleMatchedOnly: boolean
}>()

const emit = defineEmits<{
  'update:selectedMessageId': [id: string]
  'update:search': [value: string]
  'update:unreadOnly': [value: boolean]
  'update:ruleMatchedOnly': [value: boolean]
}>()

const searchModel = computed({
  get: () => props.search,
  set: (value: string) => emit('update:search', value)
})

const unreadModel = computed({
  get: () => props.unreadOnly,
  set: (value: boolean) => emit('update:unreadOnly', value)
})

const ruleMatchedModel = computed({
  get: () => props.ruleMatchedOnly,
  set: (value: boolean) => emit('update:ruleMatchedOnly', value)
})

const totalMessageCount = computed(() =>
  props.status?.counts.messages ?? props.messages.length
)

const unreadMessageCount = computed(() =>
  props.status?.counts.unread ??
    props.messages.filter((message) => message.unread).length
)

const ruleMatchedMessageCount = computed(() =>
  props.messages.filter((message) => message.ruleMatches.length).length
)

function resetStatusFilters() {
  unreadModel.value = false
  ruleMatchedModel.value = false
}

function toggleRuleMatchedFilter() {
  ruleMatchedModel.value = !ruleMatchedModel.value
}

function accountName(accountId: string) {
  return props.accounts.find((account) => account.id === accountId)?.email || accountId
}
</script>

<template>
  <section class="card min-h-[calc(100vh-14rem)] bg-base-200 shadow-sm">
    <div class="card-body gap-4 p-0">
      <div class="flex flex-wrap items-start justify-between px-5 pt-5">
        <div>
          <h2 class="card-title">
            <Inbox :size="18" />
            收件箱
          </h2>
          <p class="mt-1 text-sm text-base-content/60">{{ selectedAccountEmail || '全部账号' }}</p>
        </div>
        <div class="flex flex-wrap items-center justify-end gap-2">
          <div class="join">
            <button
              class="btn btn-sm join-item"
              :class="!unreadOnly ? 'btn-primary' : 'btn-ghost'"
              type="button"
              @click="resetStatusFilters"
            >
              <Inbox :size="15" />
              {{ totalMessageCount }} 邮件
            </button>
            <label
              class="btn btn-sm join-item"
              :class="unreadOnly ? 'btn-primary' : 'btn-ghost'"
            >
              <input v-model="unreadModel" class="checkbox checkbox-xs" type="checkbox">
              {{ unreadMessageCount }} 未读
            </label>
            <button
              class="btn btn-sm join-item btn-ghost"
              type="button"
            >
              <Tag :size="15" />
              {{ ruleMatchedMessageCount }} 规则
            </button>
          </div>

          <label class="input input-bordered input-sm flex min-w-[14.5rem] items-center gap-2">
            <Search :size="15" />
            <input v-model="searchModel" class="min-w-0 grow" type="search" placeholder="搜索邮件">
          </label>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="table table-pin-rows table-zebra">
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
              class="cursor-pointer"
              :class="message.id === selectedMessageId ? 'bg-primary/10' : ''"
              @click="emit('update:selectedMessageId', message.id)"
            >
              <td class="max-w-0">
                <div class="flex min-w-0 items-start gap-2">
                  <span v-if="message.unread" class="status status-primary mt-1.5" />
                  <span class="min-w-0">
                    <strong class="block truncate" :class="message.unread ? 'text-primary' : ''">
                      {{ message.subject }}
                    </strong>
                    <small class="block truncate text-base-content/60">{{ message.snippet }}</small>
                  </span>
                </div>
              </td>
              <td class="max-w-0">
                <span class="block truncate">{{ message.from }}</span>
                <small class="block truncate text-base-content/60">{{ accountName(message.accountId) }}</small>
              </td>
              <td>
                <span class="flex min-w-0 gap-1 overflow-hidden">
                  <span
                    v-for="label in message.labels.slice(0, 3)"
                    :key="label"
                    class="badge badge-outline badge-sm max-w-24 truncate"
                  >
                    {{ label.replace('local:', '') }}
                  </span>
                </span>
              </td>
              <td class="whitespace-nowrap font-mono text-xs text-base-content/60">
                {{ formatDate(message.receivedAt) }}
              </td>
            </tr>
          </tbody>
        </table>

        <div v-if="!messages.length" class="flex min-h-72 items-center justify-center gap-2 p-6 text-base-content/60">
          <Inbox :size="24" />
          <span>暂无邮件</span>
        </div>
      </div>
    </div>
  </section>
</template>
