<script setup lang="ts">
import {
  Home,
  LayoutDashboard,
  LogIn,
  Menu,
  Plug,
  RefreshCcw,
  UserPlus
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
  showAuthLinks?: boolean
  showConnect?: boolean
  showSync?: boolean
}>(), {
  title: '邮箱账号管理',
  eyebrow: 'micromatrix-email-manager',
  drawerId: 'app-drawer',
  showDrawerButton: true,
  showAuthLinks: false,
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
  <header class="navbar gap-2 bg-base-100 p-0 min-h-1">
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
      <NuxtLink
        v-if="showAuthLinks"
        class="btn btn-sm btn-ghost max-sm:btn-square"
        to="/login"
        title="登录"
      >
        <LogIn :size="16" />
        <span class="max-sm:hidden">登录</span>
      </NuxtLink>
      <NuxtLink
        v-if="showAuthLinks"
        class="btn btn-sm btn-primary max-sm:btn-square"
        to="/login?mode=register"
        title="注册"
      >
        <UserPlus :size="16" />
        <span class="max-sm:hidden">注册</span>
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

    </div>
  </header>
</template>
