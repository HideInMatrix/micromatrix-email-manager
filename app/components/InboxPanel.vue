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
  <section class="card min-h-[calc(100vh-14rem)] bg-base-200 shadow-sm">
    <div class="card-body gap-4 p-0">
      <div class="flex flex-wrap items-start justify-between gap-3 px-5 pt-5">
        <div>
          <h2 class="card-title">
            <Inbox :size="18" />
            收件箱
          </h2>
          <p class="mt-1 text-sm text-base-content/60">{{ selectedAccountEmail || '全部账号' }}</p>
        </div>
        <div class="join">
          <label class="input input-bordered input-sm join-item flex min-w-[14.5rem] items-center gap-2">
            <Search :size="15" />
            <input v-model="searchModel" class="min-w-0 grow" type="search" placeholder="搜索邮件">
          </label>
          <label class="btn btn-sm join-item">
            <input v-model="unreadModel" class="checkbox checkbox-primary checkbox-xs" type="checkbox">
            未读
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
