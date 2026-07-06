<script setup lang="ts">
import { RefreshCcw } from 'lucide-vue-next'

const manager = useMailboxManager()

const {
  status,
  error,
  notice,
  loadStatus
} = manager

useHead({
  title: '事件 · micromatrix-email-manager'
})

definePageMeta({
  layout: 'dashboard'
})

onMounted(loadStatus)
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
      <button class="btn btn-sm btn-ghost max-sm:btn-square" type="button" title="刷新" @click="loadStatus">
        <RefreshCcw :size="16" />
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
    <EventsPanel :events="status?.events || []" />
  </BitsRevealPanel>
</template>
