<script setup lang="ts">
const manager = useMailboxManager()

const {
  status,
  providers,
  providerConfigs,
  rules,
  busy,
  error,
  notice,
  refreshAll,
  loadProviderConfigs,
  syncNow,
  connectProvider,
  saveProviderConfig,
  saveRule,
  toggleRule,
  deleteRule
} = manager

useHead({
  title: '配置 · micromatrix-email-manager'
})

async function refreshConfigPage() {
  await Promise.all([refreshAll(), loadProviderConfigs()])
}

onMounted(refreshConfigPage)
</script>

<template>
  <div class="app-shell">
    <AppHeader
      title="配置"
      :status="status"
      :providers="providers"
      :busy="busy"
      home-href="/"
      :show-connect="false"
      @refresh="refreshConfigPage"
      @sync="syncNow()"
      @connect="connectProvider($event.id)"
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

    <main class="dashboard-main dashboard-config">
      <ProviderPanel
        :providers="providers"
        :provider-configs="providerConfigs"
        :status="status"
        :busy="busy"
        @connect="connectProvider($event.id)"
        @save-config="saveProviderConfig"
      />

      <RulesPanel
        :rules="rules"
        :busy="busy"
        @save="saveRule"
        @toggle="toggleRule"
        @delete="deleteRule"
      />
    </main>
  </div>
</template>
