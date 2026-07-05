<script setup lang="ts">
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
  syncNow
} = manager

useHead({
  title: '邮箱工作台 · micromatrix-email-manager'
})

async function refreshWorkspace() {
  selectedAccountId.value = ''
  await refreshAll({ selectFirstAccount: false })
}

onMounted(refreshWorkspace)

watch([search, unreadOnly], async () => {
  await loadMessages()
})
</script>

<template>
  <div class="app-shell">
    <AppHeader
      title="邮箱工作台"
      :status="status"
      :providers="providers"
      :busy="busy"
      dashboard-href="/dashboard"
      :show-connect="false"
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

    <main class="workspace user-workspace">
      <section class="column center-column">
        <InboxPanel
          v-model:selected-message-id="selectedMessageId"
          v-model:search="search"
          v-model:unread-only="unreadOnly"
          :messages="messages"
          :accounts="accounts"
          selected-account-email="全部账号"
        />
      </section>

      <aside class="column right-column">
        <MessageDetailPanel :message="selectedMessage" :rules="rules" />
      </aside>
    </main>
  </div>
</template>
