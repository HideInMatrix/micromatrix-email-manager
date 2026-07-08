<script setup lang="ts">
import { Check, ChevronDown, Copy, Inbox, Mail, Search, Tag, Trash2 } from 'lucide-vue-next'
import type { AppStatus, MailMessage, PublicMailAccount } from '../../shared/types'
import { formatDate } from '../utils/format'

const props = defineProps<{
  messages: MailMessage[]
  accounts: PublicMailAccount[]
  status?: AppStatus
  selectedMessageId: string
  search: string
  unreadOnly: boolean
  ruleMatchedOnly: boolean
  busy?: string
}>()

const emit = defineEmits<{
  'update:selectedMessageId': [id: string]
  'update:search': [value: string]
  'update:unreadOnly': [value: boolean]
  'update:ruleMatchedOnly': [value: boolean]
  'trash-selected': [messages: MailMessage[]]
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
    <div class="card-body gap-4 p-0">
      <div class="flex flex-wrap items-start justify-between px-5 pt-5">
        <div>
          <h2 class="card-title">
            <Inbox :size="18" />
            收件箱
          </h2>
          <div class="dropdown mt-2">
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
        </div>
        <div class="flex flex-wrap items-center justify-end gap-2">
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

          <InputField
            v-model="searchModel"
            type="search"
            input-size="sm"
            field-class="min-w-[14.5rem]"
            placeholder="搜索邮件"
          >
            <template #prefix>
              <Search :size="15" />
            </template>
          </InputField>
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
            <th>发件人</th>
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
    </div>
  </section>
</template>
