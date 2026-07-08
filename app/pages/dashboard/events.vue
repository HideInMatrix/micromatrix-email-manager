<script setup lang="ts">
import { RefreshCcw } from 'lucide-vue-next'
import type { EventLogSettings, PaginatedEvents } from '../../../shared/types'

const pageSize = 25
const eventsPage = ref<PaginatedEvents>({
  events: [],
  total: 0,
  page: 1,
  pageSize,
  totalPages: 1,
  settings: {
    clearCron: ''
  }
})
const busy = ref('')
const error = ref('')
const notice = ref('')
const clearCronInput = ref('')
const pendingClearEvents = ref(false)

async function fetchEvents(page = eventsPage.value.page) {
  const nextPage = await $fetch<PaginatedEvents>('/api/events', {
    query: {
      page,
      pageSize
    }
  })

  eventsPage.value = nextPage
  clearCronInput.value = nextPage.settings.clearCron
}

async function loadEvents(page = eventsPage.value.page) {
  await withBusy('events-load', async () => {
    await fetchEvents(page)
  })
}

async function saveEventSettings() {
  await withBusy('events-settings', async () => {
    const settings = await $fetch<EventLogSettings>('/api/events/settings', {
      method: 'PUT',
      body: {
        clearCron: clearCronInput.value
      }
    })

    notice.value = settings.clearCron
      ? `事件日志清理 Cron 已保存：${settings.clearCron}`
      : '已关闭事件日志自动清理'
    await fetchEvents(1)
  })
}

function confirmClearEvents() {
  pendingClearEvents.value = true
}

async function clearEvents() {
  await withBusy('events-clear', async () => {
    const result = await $fetch<{ count: number }>('/api/events', {
      method: 'DELETE'
    })

    pendingClearEvents.value = false
    notice.value = result.count > 0 ? `已清空 ${result.count} 条事件日志` : '没有需要清空的事件日志'
    await fetchEvents(1)
  })
}

async function withBusy(name: string, action: () => Promise<void>) {
  busy.value = name
  error.value = ''
  notice.value = ''

  try {
    await action()
  } catch (caught) {
    error.value =
      caught instanceof Error ? caught.message : '请求失败，请检查服务端日志'
  } finally {
    busy.value = ''
  }
}

useHead({
  title: '事件 · micromatrix-email-manager'
})

definePageMeta({
  layout: 'dashboard'
})

onMounted(() => loadEvents())
</script>

<template>
  <header class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
    <div class="grow">
      <div class="breadcrumbs text-sm">
        <ul>
          <li><NuxtLink to="/dashboard">Dashboard</NuxtLink></li>
          <li><h2>Events</h2></li>
        </ul>
      </div>
      <p class="text-sm text-base-content/60">查看 OAuth、同步、watch 和 webhook 运行记录。</p>
    </div>
    <div class="flex shrink-0 flex-wrap items-center gap-2">
      <button class="btn btn-sm btn-ghost max-sm:btn-square" type="button" title="刷新" @click="loadEvents()">
        <span v-if="busy === 'events-load'" class="loading loading-spinner loading-xs" />
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
    <EventsPanel
      v-model:clear-cron-input="clearCronInput"
      manageable
      :events="eventsPage.events"
      :page="eventsPage.page"
      :page-size="eventsPage.pageSize"
      :total="eventsPage.total"
      :total-pages="eventsPage.totalPages"
      :busy="busy"
      @page-change="loadEvents"
      @clear="confirmClearEvents"
      @save-settings="saveEventSettings"
    />
  </BitsRevealPanel>

  <ConfirmModal
    :open="pendingClearEvents"
    title="清空事件日志？"
    message="这会删除所有 OAuth、同步、watch 和 webhook 运行记录，删除后无法恢复。"
    confirm-label="清空日志"
    :busy="busy === 'events-clear'"
    @close="pendingClearEvents = false"
    @confirm="clearEvents"
  />
</template>
