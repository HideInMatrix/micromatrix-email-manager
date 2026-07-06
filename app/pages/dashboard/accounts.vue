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
  connectProvider,
  syncNow,
  startWatch,
  removeAccount
} = manager

useHead({
  title: '账号 · micromatrix-email-manager'
})

definePageMeta({
  layout: 'dashboard'
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
  <AppHeader
    title="Dashboard"
    :status="status"
    :providers="providers"
    :busy="busy"
    :show-connect="false"
    @refresh="refreshAll"
    @sync="syncNow()"
  />

  <header class="flex flex-col gap-3 sm:flex-row sm:items-end">
    <div class="grow">
      <div class="breadcrumbs text-sm">
        <ul>
          <li><NuxtLink to="/dashboard">Dashboard</NuxtLink></li>
          <li><h2>Accounts</h2></li>
        </ul>
      </div>
      <p class="text-sm text-base-content/60">管理已授权邮箱，执行同步、监听和断开操作。</p>
    </div>
  </header>

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

  <BitsRevealPanel as="main" class="grid min-w-0 gap-4">
    <AccountsPanel
      v-model:selected-account-id="selectedAccountId"
      :accounts="accounts"
      :providers="providers"
      :busy="busy"
      @connect="connectProvider($event.id)"
      @sync="syncNow"
      @watch="startWatch"
      @remove="confirmRemoveAccount"
    />
  </BitsRevealPanel>
</template>
