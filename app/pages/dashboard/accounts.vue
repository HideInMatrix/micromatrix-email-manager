<script setup lang="ts">
import { RefreshCcw } from 'lucide-vue-next'
import type { PublicMailAccount } from '../../../shared/types'

const manager = useMailboxManager()
const route = useRoute()
const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
const { data: session } = await useFetch<{
  configured: boolean
  authenticated: boolean
  email?: string
  isAdmin: boolean
}>('/api/admin/session', {
  headers,
  default: () => ({
    configured: false,
    authenticated: false,
    isAdmin: false
  })
})

const {
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
const pendingRemoveAccount = ref<PublicMailAccount>()

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
  pendingRemoveAccount.value = account
}

async function removePendingAccount() {
  const account = pendingRemoveAccount.value

  if (!account) {
    return
  }

  await removeAccount(account)
  pendingRemoveAccount.value = undefined
}
</script>

<template>
  <header class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
    <div class="grow">
      <div class="breadcrumbs text-sm">
        <ul>
          <li v-if="session?.isAdmin"><NuxtLink to="/dashboard">Dashboard</NuxtLink></li>
          <li v-else><span>Dashboard</span></li>
          <li><h2>Accounts</h2></li>
        </ul>
      </div>
      <p class="text-sm text-base-content/60">管理已授权邮箱，执行同步、监听和删除操作。</p>
    </div>
    <div class="flex shrink-0 flex-wrap items-center gap-2">
      <button class="btn btn-sm btn-ghost max-sm:btn-square" type="button" title="刷新" @click="refreshAll">
        <span v-if="busy === 'refresh'" class="loading loading-spinner loading-xs" />
        <RefreshCcw v-else :size="16" />
        <span class="max-sm:hidden">刷新</span>
      </button>
      <button class="btn btn-sm btn-ghost max-sm:btn-square" type="button" title="同步" @click="syncNow()">
        <span v-if="busy === 'sync-all'" class="loading loading-spinner loading-xs" />
        <RefreshCcw v-else :size="16" />
        <span class="max-sm:hidden">同步</span>
      </button>
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
      :can-manage-providers="Boolean(session?.isAdmin)"
      @connect="connectProvider($event.id)"
      @sync="syncNow"
      @watch="startWatch"
      @remove="confirmRemoveAccount"
    />
  </BitsRevealPanel>

  <ConfirmModal
    :open="Boolean(pendingRemoveAccount)"
    title="删除邮箱账号？"
    :message="pendingRemoveAccount ? `删除 ${pendingRemoveAccount.email}？本地缓存邮件也会一并删除。` : ''"
    confirm-label="删除账号"
    :busy="pendingRemoveAccount ? busy === `delete-${pendingRemoveAccount.id}` : false"
    @close="pendingRemoveAccount = undefined"
    @confirm="removePendingAccount"
  />
</template>
