<script setup lang="ts">
import type { MailMessage } from '../../shared/types'

const manager = useMailboxManager()
const session = ref<{
  configured: boolean
  authenticated: boolean
  isAdmin: boolean
}>()

const {
  status,
  providers,
  accounts,
  messages,
  rules,
  selectedAccountId,
  selectedMessageId,
  selectedMessage,
  search,
  unreadOnly,
  ruleMatchedOnly,
  busy,
  error,
  notice,
  refreshAll,
  loadMessages,
  syncNow,
  trashMessage,
  markMessageRead,
  trashMessages
} = manager
const isAuthenticated = computed(() => Boolean(session.value?.authenticated))
const pendingTrashMessage = ref<MailMessage>()
const pendingTrashMessages = ref<MailMessage[]>([])
const dashboardHref = computed(() => {
  if (!session.value?.authenticated) {
    return undefined
  }

  return session.value.isAdmin ? '/dashboard' : '/dashboard/accounts'
})

useHead({
  title: 'MailManager · 邮件同步与规则管理'
})

definePageMeta({
  layout: 'frontend'
})

async function refreshWorkspace() {
  session.value = await $fetch<{
    configured: boolean
    authenticated: boolean
    isAdmin: boolean
  }>('/api/admin/session')
  selectedAccountId.value = ''
  await refreshAll({ selectFirstAccount: false })
}

onMounted(refreshWorkspace)

watch([search, unreadOnly, ruleMatchedOnly], async () => {
  await loadMessages()
})

async function confirmTrashMessage(message: MailMessage) {
  pendingTrashMessage.value = message
}

async function confirmTrashMessages(messages: MailMessage[]) {
  if (!messages.length) {
    return
  }

  pendingTrashMessages.value = messages
}

async function trashPendingMessage() {
  const message = pendingTrashMessage.value

  if (!message) {
    return
  }

  await trashMessage(message)
  pendingTrashMessage.value = undefined
}

async function trashPendingMessages() {
  if (!pendingTrashMessages.value.length) {
    return
  }

  await trashMessages(pendingTrashMessages.value)
  pendingTrashMessages.value = []
}

function openMessage(messageId: string) {
  selectedMessageId.value = messageId
  const message = messages.value.find((item) => item.id === messageId)

  if (message) {
    void markMessageRead(message)
  }
}
</script>

<template>
  <AppHeader
    title="MailManager"
    eyebrow="邮件同步与规则管理"
    :status="status"
    :providers="providers"
    :busy="busy"
    :dashboard-href="dashboardHref"
    :show-connect="false"
    :show-drawer-button="false"
    :show-auth-links="!isAuthenticated"
    :show-sync="isAuthenticated"
    @refresh="refreshWorkspace"
    @sync="syncNow()"
  />

  <StatusAlert
    v-if="error"
    type="error"
    :message="error"
    @close="error = ''"
  />
  <StatusAlert
    v-if="notice"
    type="success"
    :message="notice"
    @close="notice = ''"
  />

  <BitsRevealPanel as="main" class="flex-1 grid min-w-0 gap-4 xl:grid-cols-[minmax(520px,1fr)_minmax(340px,0.72fr)]">
    <InboxPanel
      :selected-message-id="selectedMessageId"
      v-model:search="search"
      v-model:unread-only="unreadOnly"
      v-model:rule-matched-only="ruleMatchedOnly"
      :messages="messages"
      :accounts="accounts"
      :status="status"
      :busy="busy"
      selected-account-email="全部账号"
      @update:selected-message-id="openMessage"
      @trash-selected="confirmTrashMessages"
    />

    <MessageDetailPanel
      :message="selectedMessage"
      :rules="rules"
      :busy="busy"
      @trash="confirmTrashMessage"
    />
  </BitsRevealPanel>

  <ConfirmModal
    :open="Boolean(pendingTrashMessage)"
    title="移入垃圾箱？"
    :message="pendingTrashMessage ? `将「${pendingTrashMessage.subject}」移入垃圾箱。` : ''"
    confirm-label="移入垃圾箱"
    :busy="pendingTrashMessage ? busy === `trash-${pendingTrashMessage.accountId}-${pendingTrashMessage.id}` : false"
    @close="pendingTrashMessage = undefined"
    @confirm="trashPendingMessage"
  />

  <ConfirmModal
    :open="pendingTrashMessages.length > 0"
    title="批量移入垃圾箱？"
    :message="`将选中的 ${pendingTrashMessages.length} 封邮件移入垃圾箱。`"
    confirm-label="移入垃圾箱"
    :busy="busy === 'trash-batch'"
    @close="pendingTrashMessages = []"
    @confirm="trashPendingMessages"
  />
</template>
