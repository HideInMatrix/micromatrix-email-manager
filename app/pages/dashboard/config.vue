<script setup lang="ts">
import { RefreshCcw } from 'lucide-vue-next'

const manager = useMailboxManager()

const {
  status,
  providers,
  accounts,
  providerConfigs,
  rules,
  busy,
  error,
  notice,
  refreshAll,
  loadProviderConfigs,
  syncNow,
  saveProviderConfig,
  saveRule,
  toggleRule,
  deleteRule
} = manager

useHead({
  title: '配置 · micromatrix-email-manager'
})

definePageMeta({
  layout: 'dashboard'
})

async function refreshConfigPage() {
  await Promise.all([refreshAll(), loadProviderConfigs()])
}

onMounted(refreshConfigPage)
</script>

<template>
  <header class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
    <div class="grow">
      <div class="breadcrumbs text-sm">
        <ul>
          <li><NuxtLink to="/dashboard">Dashboard</NuxtLink></li>
          <li><h2>Configuration</h2></li>
        </ul>
      </div>
      <p class="text-sm text-base-content/60">配置 OAuth Client、Pub/Sub Topic 和本地自动化规则。</p>
    </div>
    <div class="flex shrink-0 flex-wrap items-center gap-2">
      <button class="btn btn-sm btn-ghost max-sm:btn-square" type="button" title="刷新" @click="refreshConfigPage">
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

  <BitsRevealPanel as="main" class="grid min-w-0 gap-4 xl:grid-cols-[minmax(320px,460px)_minmax(420px,1fr)]">
    <ProviderPanel
      :providers="providers"
      :accounts="accounts"
      :provider-configs="providerConfigs"
      :status="status"
      :busy="busy"
      @save-config="saveProviderConfig"
    />

    <RulesPanel
      :providers="providers"
      :rules="rules"
      :busy="busy"
      @save="saveRule"
      @toggle="toggleRule"
      @delete="deleteRule"
    />
  </BitsRevealPanel>
</template>
