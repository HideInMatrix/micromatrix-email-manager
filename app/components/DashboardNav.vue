<script setup lang="ts">
import {
  Activity,
  KeyRound,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Mail,
  Settings,
  UsersRound
} from 'lucide-vue-next'

withDefaults(defineProps<{
  drawerId?: string
}>(), {
  drawerId: 'app-drawer'
})

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

async function logout() {
  await $fetch('/api/admin/logout', { method: 'POST' })
  await navigateTo('/login')
}
</script>

<template>
  <aside class="drawer-side z-30">
    <label :for="drawerId" class="drawer-overlay" aria-label="关闭导航" />
    <nav class="flex min-h-full w-56 flex-col bg-base-200 p-2" aria-label="后台导航">
      <NuxtLink class="flex min-h-16 items-center gap-3 rounded-box px-3 font-semibold hover:bg-base-300/50" to="/">
        <span class="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-content">
          <Mail :size="18" />
        </span>
        <span class="min-w-0">
          <span class="block truncate text-sm">micromatrix</span>
          <span class="block truncate text-xs font-normal text-base-content/60">Email Manager</span>
        </span>
      </NuxtLink>

      <ul class="menu w-full gap-1">
        <li v-if="session?.isAdmin">
          <NuxtLink exact-active-class="menu-active" to="/dashboard">
            <LayoutDashboard :size="16" />
            后台概览
          </NuxtLink>
        </li>
        <li>
          <NuxtLink exact-active-class="menu-active" to="/dashboard/accounts">
            <UsersRound :size="16" />
            邮箱账号
          </NuxtLink>
        </li>
        <li v-if="session?.isAdmin">
          <NuxtLink exact-active-class="menu-active" to="/dashboard/rules">
            <ListChecks :size="16" />
            自动化规则
          </NuxtLink>
        </li>
        <li v-if="session?.isAdmin">
          <NuxtLink exact-active-class="menu-active" to="/dashboard/config">
            <Settings :size="16" />
            OAuth 配置
          </NuxtLink>
        </li>
        <li>
          <NuxtLink exact-active-class="menu-active" to="/dashboard/tokens">
            <KeyRound :size="16" />
            API Token
          </NuxtLink>
        </li>
        <li v-if="session?.isAdmin">
          <NuxtLink exact-active-class="menu-active" to="/dashboard/events">
            <Activity :size="16" />
            运行事件
          </NuxtLink>
        </li>
      </ul>

      <div class="mt-auto border-t border-base-300 p-2">
        <ul class="menu">
          <li>
            <button type="button" @click="logout">
              <LogOut :size="16" />
              退出登录
            </button>
          </li>
        </ul>
      </div>
    </nav>
  </aside>
</template>
