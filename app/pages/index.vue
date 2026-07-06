<script setup lang="ts">
import type { MailMessage } from '../../shared/types'

const manager = useMailboxManager()

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
  busy,
  error,
  notice,
  refreshAll,
  loadMessages,
  syncNow,
  trashMessage
} = manager

useHead({
  title: '邮箱工作台 · micromatrix-email-manager'
})

definePageMeta({
  layout: 'frontend'
})

async function refreshWorkspace() {
  selectedAccountId.value = ''
  await refreshAll({ selectFirstAccount: false })
}

onMounted(refreshWorkspace)

watch([search, unreadOnly], async () => {
  await loadMessages()
})

async function confirmTrashMessage(message: MailMessage) {
  if (!window.confirm(`将「${message.subject}」移入垃圾箱？`)) {
    return
  }

  await trashMessage(message)
}
</script>

<template>
  <AppHeader
    title="邮箱工作台"
    :status="status"
    :providers="providers"
    :busy="busy"
    dashboard-href="/dashboard"
    :show-connect="false"
    :show-drawer-button="false"
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

  <BitsRevealPanel as="main" class="grid min-w-0 gap-4 xl:grid-cols-[minmax(520px,1fr)_minmax(340px,0.72fr)]">
    <InboxPanel
      v-model:selected-message-id="selectedMessageId"
      v-model:search="search"
      v-model:unread-only="unreadOnly"
      :messages="messages"
      :accounts="accounts"
      selected-account-email="全部账号"
    />

    <MessageDetailPanel
      :message="selectedMessage"
      :rules="rules"
      :busy="busy"
      @trash="confirmTrashMessage"
    />
  </BitsRevealPanel>
</template>
