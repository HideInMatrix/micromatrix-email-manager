<script setup lang="ts">
import type { PublicMailAccount } from '../../../shared/types'

const manager = useMailboxManager()
const route = useRoute()

const {
  status,
  providers,
  accounts,
  selectedAccountId,
  busy,
  error,
  notice,
  refreshAll,
  syncNow,
  startWatch,
  removeAccount
} = manager

useHead({
  title: '账号 · micromatrix-email-manager'
})

onMounted(async () => {
  await refreshAll()

  if (route.query.connected) {
    notice.value = '账号已连接'
  }
})

async function confirmRemoveAccount(account: PublicMailAccount) {
  if (!window.confirm(`断开 ${account.email}？`)) {
    return
  }

  await removeAccount(account)
}
</script>

<template>
  <div class="app-shell">
    <AppHeader
      title="账号"
      :status="status"
      :providers="providers"
      :busy="busy"
      home-href="/"
      :show-connect="false"
      @refresh="refreshAll"
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

    <DashboardNav />

    <main class="dashboard-main dashboard-single">
      <AccountsPanel
        v-model:selected-account-id="selectedAccountId"
        class="dashboard-panel"
        :accounts="accounts"
        :providers="providers"
        :busy="busy"
        @sync="syncNow"
        @watch="startWatch"
        @remove="confirmRemoveAccount"
      />
    </main>
  </div>
</template>
