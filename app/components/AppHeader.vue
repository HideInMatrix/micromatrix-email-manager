<script setup lang="ts">
import {
  Home,
  Inbox,
  LayoutDashboard,
  MailOpen,
  Menu,
  Plug,
  RefreshCcw,
  Tag
} from 'lucide-vue-next'
import type { AppStatus, MailProviderSummary } from '../../shared/types'

const props = withDefaults(defineProps<{
  status?: AppStatus
  providers: MailProviderSummary[]
  busy: string
  title?: string
  eyebrow?: string
  homeHref?: string
  dashboardHref?: string
  drawerId?: string
  showDrawerButton?: boolean
  showConnect?: boolean
  showSync?: boolean
}>(), {
  title: '邮箱账号管理',
  eyebrow: 'micromatrix-email-manager',
  drawerId: 'app-drawer',
  showDrawerButton: true,
  showConnect: true,
  showSync: true
})

const emit = defineEmits<{
  refresh: []
  sync: []
  connect: [provider: MailProviderSummary]
}>()

const primaryProvider = computed(() =>
  props.providers.find((provider) => provider.enabled && provider.capabilities.oauth)
)
</script>

<template>
  <header class="navbar gap-2 bg-base-100 p-0">
    <div class="navbar-start min-w-0 gap-2">
      <label
        v-if="showDrawerButton"
        :for="drawerId"
        class="btn btn-square btn-ghost drawer-button lg:hidden"
        aria-label="打开导航"
      >
        <Menu :size="19" />
      </label>

      <div class="min-w-0">
        <h1 class="truncate text-xl font-light leading-tight">{{ title }}</h1>
        <p class="truncate text-xs text-base-content/50">{{ eyebrow }}</p>
      </div>
    </div>

    <div v-if="status" class="navbar-center hidden gap-2 xl:flex">
      <span class="badge badge-ghost h-8 gap-1">
        <Inbox :size="15" />
        {{ status.counts.messages }} 邮件
      </span>
      <span class="badge badge-warning h-8 gap-1">
        <MailOpen :size="15" />
        {{ status.counts.unread }} 未读
      </span>
      <span class="badge badge-ghost h-8 gap-1">
        <Tag :size="15" />
        {{ status.counts.rules }} 规则
      </span>
    </div>

    <div class="navbar-end gap-2">
      <NuxtLink v-if="homeHref" class="btn btn-sm btn-ghost max-sm:btn-square" :to="homeHref" title="邮件工作台">
        <Home :size="16" />
        <span class="max-sm:hidden">邮件工作台</span>
      </NuxtLink>
      <NuxtLink
        v-if="dashboardHref"
        class="btn btn-sm btn-ghost max-sm:btn-square"
        :to="dashboardHref"
        title="后台"
      >
        <LayoutDashboard :size="16" />
        <span class="max-sm:hidden">后台</span>
      </NuxtLink>
      <button class="btn btn-sm btn-ghost max-sm:btn-square" type="button" title="刷新" @click="emit('refresh')">
        <span v-if="busy === 'refresh'" class="loading loading-spinner loading-xs" />
        <RefreshCcw v-else :size="16" />
        <span class="max-sm:hidden">刷新</span>
      </button>
      <button
        v-if="showSync"
        class="btn btn-sm btn-ghost max-sm:btn-square"
        type="button"
        title="同步"
        @click="emit('sync')"
      >
        <span v-if="busy === 'sync-all'" class="loading loading-spinner loading-xs" />
        <RefreshCcw v-else :size="16" />
        <span class="max-sm:hidden">同步</span>
      </button>
      <button
        v-if="showConnect && primaryProvider"
        class="btn btn-sm btn-primary max-sm:btn-square"
        type="button"
        :title="`连接 ${primaryProvider.name}`"
        @click="emit('connect', primaryProvider)"
      >
        <Plug :size="16" />
        <span class="max-sm:hidden">连接 {{ primaryProvider.name }}</span>
      </button>

      <div v-if="status" class="dropdown dropdown-end xl:hidden">
        <button class="btn btn-circle btn-sm btn-ghost" type="button" tabindex="0" aria-label="查看状态">
          <div class="indicator">
            <span v-if="status.counts.unread" class="status status-warning indicator-item" />
            <Inbox :size="16" />
          </div>
        </button>
        <ul tabindex="0" class="menu dropdown-content z-10 mt-2 w-48 rounded-box bg-base-100 p-2 shadow-xl">
          <li><span>{{ status.counts.messages }} 邮件</span></li>
          <li><span>{{ status.counts.unread }} 未读</span></li>
          <li><span>{{ status.counts.rules }} 规则</span></li>
        </ul>
      </div>
    </div>
  </header>
</template>
