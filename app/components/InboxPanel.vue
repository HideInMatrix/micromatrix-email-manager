<script setup lang="ts">
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Inbox,
  Mail,
  Search,
  Tag,
  Trash2
} from 'lucide-vue-next'
import type { AppStatus, MailMessage, PublicMailAccount } from '../../shared/types'
import { formatDate } from '../utils/format'

const props = defineProps<{
  messages: MailMessage[]
  accounts: PublicMailAccount[]
  status?: AppStatus
  selectedAccountId: string
  selectedMessageId: string
  search: string
  unreadOnly: boolean
  ruleMatchedOnly: boolean
  busy?: string
  loading?: boolean
  page: number
  pageSize: number
  total: number
  totalPages: number
}>()

const emit = defineEmits<{
  'update:selectedAccountId': [id: string]
  'update:selectedMessageId': [id: string]
  'update:search': [value: string]
  'update:unreadOnly': [value: boolean]
  'update:ruleMatchedOnly': [value: boolean]
  'trash-selected': [messages: MailMessage[]]
  'page-change': [page: number]
}>()

const selectedAccountModel = computed({
  get: () => props.selectedAccountId,
  set: (value: string) => emit('update:selectedAccountId', value)
})

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
  props.status?.counts.messages ?? props.total
)

const unreadMessageCount = computed(() =>
  props.status?.counts.unread ??
    props.messages.filter((message) => message.unread).length
)

const ruleMatchedMessageCount = computed(() =>
  props.messages.filter((message) => message.ruleMatches.length).length
)

const safeTotalPages = computed(() => Math.max(1, props.totalPages))
const rangeStart = computed(() => props.total ? (props.page - 1) * props.pageSize + 1 : 0)
const rangeEnd = computed(() => Math.min(props.total, props.page * props.pageSize))
const canGoPrevious = computed(() => props.page > 1 && !props.loading)
const canGoNext = computed(() => props.page < safeTotalPages.value && !props.loading)
const visiblePages = computed(() => {
  const windowSize = Math.min(5, safeTotalPages.value)
  const maxStart = Math.max(1, safeTotalPages.value - windowSize + 1)
  const start = Math.min(Math.max(1, props.page - 2), maxStart)

  return Array.from({ length: windowSize }, (_, index) => start + index)
})

const selectedMessageKeys = ref<string[]>([])
const copiedEmail = ref('')
let copyResetTimer: ReturnType<typeof setTimeout> | undefined

const visibleMessageKeys = computed(() => props.messages.map(messageKey))

const selectedMessageKeySet = computed(() => new Set(selectedMessageKeys.value))

const selectedMessages = computed(() =>
  props.messages.filter((message) => selectedMessageKeySet.value.has(messageKey(message)))
)

const selectedCount = computed(() => selectedMessages.value.length)

const allVisibleSelected = computed({
  get: () =>
    props.messages.length > 0 &&
      props.messages.every((message) => selectedMessageKeySet.value.has(messageKey(message))),
  set: (selected: boolean) => {
    if (selected) {
      selectedMessageKeys.value = Array.from(
        new Set([...selectedMessageKeys.value, ...visibleMessageKeys.value])
      )
      return
    }

    const visibleKeys = new Set(visibleMessageKeys.value)
    selectedMessageKeys.value = selectedMessageKeys.value.filter(
      (key) => !visibleKeys.has(key)
    )
  }
})

const hasPartiallySelected = computed(() =>
  selectedCount.value > 0 && selectedCount.value < props.messages.length
)

watch(visibleMessageKeys, (keys) => {
  const visibleKeys = new Set(keys)
  selectedMessageKeys.value = selectedMessageKeys.value.filter((key) =>
    visibleKeys.has(key)
  )
})

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

async function copyAccountEmail(email: string) {
  await navigator.clipboard.writeText(email)
  copiedEmail.value = email

  if (copyResetTimer) {
    clearTimeout(copyResetTimer)
  }

  copyResetTimer = setTimeout(() => {
    copiedEmail.value = ''
  }, 1800)
}

function messageKey(message: MailMessage) {
  return `${message.accountId}:${message.id}`
}

function isMessageSelected(message: MailMessage) {
  return selectedMessageKeySet.value.has(messageKey(message))
}

function setMessageSelected(message: MailMessage, selected: boolean) {
  const key = messageKey(message)

  if (selected) {
    selectedMessageKeys.value = Array.from(new Set([...selectedMessageKeys.value, key]))
    return
  }

  selectedMessageKeys.value = selectedMessageKeys.value.filter(
    (selectedKey) => selectedKey !== key
  )
}

function eventChecked(event: Event) {
  return event.target instanceof HTMLInputElement && event.target.checked
}

function trashSelectedMessages() {
  if (!selectedMessages.value.length) {
    return
  }

  emit('trash-selected', selectedMessages.value)
}

onBeforeUnmount(() => {
  if (copyResetTimer) {
    clearTimeout(copyResetTimer)
  }
})
</script>

<template>
  <section class="card min-h-[calc(100vh-14rem)] bg-base-200 shadow-sm">
    <div class="card-body gap-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex w-full min-w-0 flex-wrap items-center gap-2 md:w-auto">
          <div class="dropdown">
            <button
              class="btn btn-outline btn-sm"
              type="button"
              tabindex="0"
              :disabled="!accounts.length"
            >
              <Mail :size="15" />
              邮箱账号
              <ChevronDown :size="14" />
            </button>
            <ul
              v-if="accounts.length"
              class="menu dropdown-content z-10 mt-2 w-72 rounded-box bg-base-100 p-2 shadow"
              tabindex="0"
            >
              <li v-for="account in accounts" :key="account.id">
                <button
                  class="justify-between gap-3"
                  type="button"
                  :title="`复制 ${account.email}`"
                  @click="copyAccountEmail(account.email)"
                >
                  <span class="min-w-0 truncate">{{ account.email }}</span>
                  <Check
                    v-if="copiedEmail === account.email"
                    :size="14"
                    class="shrink-0 text-success"
                  />
                  <Copy v-else :size="14" class="shrink-0 opacity-60" />
                </button>
              </li>
            </ul>
          </div>

          <div class="join">
            <button
              class="btn btn-sm join-item"
              :class="!unreadOnly ? 'btn-primary' : 'btn-ghost'"
              type="button"
              @click="resetStatusFilters"
            >
              <Inbox :size="15" />
              {{ totalMessageCount }}<span class="ml-1 max-sm:hidden">邮件</span>
            </button>
            <label
              class="btn btn-sm join-item"
              :class="unreadOnly ? 'btn-primary' : 'btn-ghost'"
            >
              <input v-model="unreadModel" class="checkbox checkbox-xs" type="checkbox">
              {{ unreadMessageCount }}<span class="ml-1 max-sm:hidden">未读</span>
            </label>
            <button
              class="btn btn-sm join-item"
              :class="ruleMatchedOnly ? 'btn-primary' : 'btn-ghost'"
              type="button"
              @click="toggleRuleMatchedFilter"
            >
              <Tag :size="15" />
              {{ ruleMatchedMessageCount }}<span class="ml-1 max-sm:hidden">规则</span>
            </button>
          </div>
        </div>

        <div class="flex min-w-0 flex-wrap items-center gap-2 md:w-auto md:justify-end">
          <button
            v-if="selectedCount"
            class="btn btn-sm btn-error max-sm:btn-square"
            type="button"
            title="批量删除"
            :disabled="busy === 'trash-batch'"
            @click="trashSelectedMessages"
          >
            <span v-if="busy === 'trash-batch'" class="loading loading-spinner loading-xs" />
            <Trash2 v-else :size="15" />
            <span class="max-sm:hidden">删除 {{ selectedCount }}</span>
          </button>

          <div class="join join-vertical sm:join-horizontal">
            <label
              class="select select-sm join-item flex h-9 min-h-9 items-center gap-2"
              title="按邮箱账号筛选"
            >
              <Mail
                :size="15"
                class="pointer-events-none relative z-10 shrink-0 text-base-content/50"
              />
              <select v-model="selectedAccountModel" class="relative z-0 min-w-0 grow">
                <option value="">全部邮箱</option>
                <option v-for="account in accounts" :key="account.id" :value="account.id">
                  {{ account.email }}
                </option>
              </select>
            </label>

            <InputField
              v-model="searchModel"
              :full-width="false"
              type="search"
              input-size="sm"
              field-class="join-item h-9 min-h-9"
              placeholder="搜索邮件"
            >
              <template #prefix>
                <Search :size="15" />
              </template>
            </InputField>
          </div>
        </div>
      </div>

      <DaisyTable zebra pin-rows>
        <thead>
          <tr>
            <th class="w-10">
              <input
                v-model="allVisibleSelected"
                class="checkbox checkbox-sm"
                type="checkbox"
                aria-label="选择当前邮件"
                :disabled="!messages.length || busy === 'trash-batch'"
                :indeterminate="hasPartiallySelected"
              >
            </th>
            <th>主题</th>
            <th class="w-px min-w-[16rem] whitespace-nowrap">发件人</th>
            <th class="w-px min-w-[6.25rem] whitespace-nowrap">时间</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="message in messages"
            :key="`${message.accountId}:${message.id}`"
            class="cursor-pointer"
            :class="{
              'bg-primary/10': message.id === selectedMessageId,
              'bg-base-300/60': isMessageSelected(message) && message.id !== selectedMessageId
            }"
            @click="emit('update:selectedMessageId', message.id)"
          >
            <td @click.stop>
              <input
                class="checkbox checkbox-sm"
                type="checkbox"
                :aria-label="`选择 ${message.subject}`"
                :checked="isMessageSelected(message)"
                :disabled="busy === 'trash-batch'"
                @change="setMessageSelected(message, eventChecked($event))"
              >
            </td>
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
            <td class="w-px min-w-[6.25rem] whitespace-nowrap font-mono text-xs text-base-content/60">
              {{ formatDate(message.receivedAt) }}
            </td>
          </tr>
        </tbody>
      </DaisyTable>

      <div v-if="!messages.length" class="flex min-h-72 items-center justify-center gap-2 p-6 text-base-content/60">
        <Inbox :size="24" />
        <span>暂无邮件</span>
      </div>

      <div
        v-if="total > 0"
        class="flex flex-col gap-3 px-5 pb-5 sm:flex-row sm:items-center sm:justify-between"
      >
        <p class="text-sm text-base-content/60">
          共 {{ total }} 封，当前显示 {{ rangeStart }}-{{ rangeEnd }}
        </p>
        <div class="join" aria-label="邮件分页">
          <button
            class="btn btn-sm join-item"
            type="button"
            title="上一页"
            :disabled="!canGoPrevious"
            @click="emit('page-change', page - 1)"
          >
            <ChevronLeft :size="16" />
          </button>
          <button
            v-for="pageNumber in visiblePages"
            :key="pageNumber"
            class="btn btn-sm join-item"
            :class="pageNumber === page ? 'btn-active btn-primary' : ''"
            type="button"
            :aria-label="`第 ${pageNumber} 页`"
            :aria-current="pageNumber === page ? 'page' : undefined"
            :disabled="loading"
            @click="emit('page-change', pageNumber)"
          >
            {{ pageNumber }}
          </button>
          <button
            class="btn btn-sm join-item"
            type="button"
            title="下一页"
            :disabled="!canGoNext"
            @click="emit('page-change', page + 1)"
          >
            <span v-if="loading" class="loading loading-spinner loading-xs" />
            <ChevronRight v-else :size="16" />
          </button>
        </div>
      </div>
    </div>
  </section>
</template>
