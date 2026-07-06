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

definePageMeta({
  layout: 'dashboard'
})

onMounted(refreshAll)
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
          <li><h2>Overview</h2></li>
        </ul>
      </div>
      <p class="text-sm text-base-content/60">账号、邮件、规则和系统事件的运行快照。</p>
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
    <section class="stats stats-vertical bg-base-200 shadow-sm xl:stats-horizontal">
      <NuxtLink class="stat hover:bg-base-300/40" to="/dashboard/accounts">
        <div class="stat-figure text-primary"><UsersRound :size="28" /></div>
        <div class="stat-title">账号</div>
        <div class="stat-value font-mono">{{ status?.counts.accounts ?? 0 }}</div>
        <div class="stat-desc">已连接邮箱</div>
      </NuxtLink>

      <div class="stat">
        <div class="stat-figure text-primary"><Inbox :size="28" /></div>
        <div class="stat-title">邮件</div>
        <div class="stat-value font-mono">{{ status?.counts.messages ?? 0 }}</div>
        <div class="stat-desc">本地缓存</div>
      </div>

      <div class="stat">
        <div class="stat-figure text-warning"><MailOpen :size="28" /></div>
        <div class="stat-title">未读</div>
        <div class="stat-value font-mono">{{ status?.counts.unread ?? 0 }}</div>
        <div class="stat-desc">待处理邮件</div>
      </div>

      <NuxtLink class="stat hover:bg-base-300/40" to="/dashboard/config">
        <div class="stat-figure text-accent"><Tag :size="28" /></div>
        <div class="stat-title">规则</div>
        <div class="stat-value font-mono">{{ status?.counts.rules ?? 0 }}</div>
        <div class="stat-desc">自动化规则</div>
      </NuxtLink>
    </section>

    <section class="grid grid-cols-1 gap-4 xl:grid-cols-[26rem_minmax(0,1fr)]">
      <section class="card bg-base-200 shadow-sm">
        <div class="card-body gap-3">
          <h2 class="card-title">
            <Activity :size="18" />
            后台状态
          </h2>
          <div class="overflow-x-auto">
            <table class="table table-sm">
              <tbody>
                <tr>
                  <td>账号</td>
                  <td class="text-right"><span class="badge badge-success">{{ status?.counts.accounts ?? 0 }}</span></td>
                </tr>
                <tr>
                  <td>Token 加密</td>
                  <td class="text-right">
                    <span class="badge" :class="status?.configured.encryption ? 'badge-success' : 'badge-warning'">
                      {{ status?.configured.encryption ? '强密钥' : '开发密钥' }}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td>事件</td>
                  <td class="text-right"><span class="badge badge-info">{{ status?.events.length ?? 0 }}</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <EventsPanel :events="status?.events || []" />
    </section>
  </BitsRevealPanel>
</template>
