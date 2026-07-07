<script setup lang="ts">
import { RefreshCcw } from 'lucide-vue-next'

const manager = useMailboxManager()
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
  users,
  apiTokens,
  createdApiToken,
  busy,
  error,
  notice,
  loadUsers,
  loadApiTokens,
  createApiToken,
  revokeApiToken
} = manager

const currentUserEmail = computed(() => session.value?.email || '')
const canManageUsers = computed(() => Boolean(session.value?.isAdmin))

useHead({
  title: 'API Token · micromatrix-email-manager'
})

definePageMeta({
  layout: 'dashboard'
})

async function refreshTokenPage() {
  session.value = await $fetch<{
    configured: boolean
    authenticated: boolean
    email?: string
    isAdmin: boolean
  }>('/api/admin/session')

  const loaders = [loadApiTokens()]

  if (session.value.isAdmin) {
    loaders.push(loadUsers())
  }

  await Promise.all(loaders)
}

onMounted(refreshTokenPage)
</script>

<template>
  <header class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
    <div class="grow">
      <div class="breadcrumbs text-sm">
        <ul>
          <li v-if="canManageUsers"><NuxtLink to="/dashboard">Dashboard</NuxtLink></li>
          <li v-else><span>Dashboard</span></li>
          <li><h2>API Token</h2></li>
        </ul>
      </div>
      <p class="text-sm text-base-content/60">生成、复制和撤销第三方接口访问令牌。</p>
    </div>
    <div class="flex shrink-0 flex-wrap items-center gap-2">
      <button class="btn btn-sm btn-ghost max-sm:btn-square" type="button" title="刷新" @click="refreshTokenPage">
        <span v-if="busy === 'refresh'" class="loading loading-spinner loading-xs" />
        <RefreshCcw v-else :size="16" />
        <span class="max-sm:hidden">刷新</span>
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
    <ApiTokenPanel
      :users="users"
      :api-tokens="apiTokens"
      :created-api-token="createdApiToken"
      :busy="busy"
      :current-user-email="currentUserEmail"
      :can-manage-users="canManageUsers"
      @create="createApiToken"
      @revoke="revokeApiToken"
    />
  </BitsRevealPanel>
</template>
