<script setup lang="ts">
import { Activity, Inbox, MailOpen, Tag, UsersRound } from 'lucide-vue-next'

const manager = useMailboxManager()

const {
  status,
  providers,
  busy,
  error,
  notice,
  refreshAll,
  syncNow
} = manager

useHead({
  title: '后台 Dashboard · micromatrix-email-manager'
})

onMounted(refreshAll)
</script>

<template>
  <div class="app-shell">
    <AppHeader
      title="后台 Dashboard"
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

    <main class="dashboard-main">
      <section class="metric-grid">
        <NuxtLink class="metric-card" to="/dashboard/accounts">
          <span class="metric-icon">
            <UsersRound :size="18" />
          </span>
          <span>
            <small>账号</small>
            <strong>{{ status?.counts.accounts ?? 0 }}</strong>
          </span>
        </NuxtLink>

        <NuxtLink class="metric-card" to="/">
          <span class="metric-icon">
            <Inbox :size="18" />
          </span>
          <span>
            <small>邮件</small>
            <strong>{{ status?.counts.messages ?? 0 }}</strong>
          </span>
        </NuxtLink>

        <NuxtLink class="metric-card" to="/">
          <span class="metric-icon warning">
            <MailOpen :size="18" />
          </span>
          <span>
            <small>未读</small>
            <strong>{{ status?.counts.unread ?? 0 }}</strong>
          </span>
        </NuxtLink>

        <NuxtLink class="metric-card" to="/dashboard/config">
          <span class="metric-icon">
            <Tag :size="18" />
          </span>
          <span>
            <small>规则</small>
            <strong>{{ status?.counts.rules ?? 0 }}</strong>
          </span>
        </NuxtLink>
      </section>

      <section class="dashboard-two-column">
        <section class="panel">
          <div class="panel-head">
            <h2>后台状态</h2>
            <Activity :size="17" />
          </div>
          <div class="config-list">
            <NuxtLink class="config-row" to="/dashboard/accounts">
              <span class="config-label">账号</span>
              <span class="config-value ok">{{ status?.counts.accounts ?? 0 }}</span>
            </NuxtLink>
            <NuxtLink class="config-row" to="/dashboard/config">
              <span class="config-label">配置</span>
              <span
                class="config-value"
                :class="{ ok: status?.configured.encryption }"
              >
                {{ status?.configured.encryption ? '强密钥' : '开发密钥' }}
              </span>
            </NuxtLink>
            <NuxtLink class="config-row" to="/dashboard/events">
              <span class="config-label">事件</span>
              <span class="config-value ok">{{ status?.events.length ?? 0 }}</span>
            </NuxtLink>
          </div>
        </section>

        <EventsPanel :events="status?.events || []" />
      </section>
    </main>
  </div>
</template>
