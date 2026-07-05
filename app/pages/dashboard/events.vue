<script setup lang="ts">
const manager = useMailboxManager()

const {
  status,
  providers,
  busy,
  error,
  notice,
  loadStatus
} = manager

useHead({
  title: '事件 · micromatrix-email-manager'
})

onMounted(loadStatus)
</script>

<template>
  <div class="app-shell">
    <AppHeader
      title="事件"
      :status="status"
      :providers="providers"
      :busy="busy"
      home-href="/"
      :show-connect="false"
      :show-sync="false"
      @refresh="loadStatus"
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
      <EventsPanel class="dashboard-events-panel" :events="status?.events || []" />
    </main>
  </div>
</template>
