<script setup lang="ts">
import {
  Activity,
  LayoutDashboard,
  LogOut,
  Settings,
  UsersRound
} from 'lucide-vue-next'

async function logout() {
  await $fetch('/api/admin/logout', { method: 'POST' })
  await navigateTo('/login')
}
</script>

<template>
  <nav class="dashboard-nav" aria-label="后台导航">
    <NuxtLink to="/dashboard" exact-active-class="active">
      <LayoutDashboard :size="16" />
      概览
    </NuxtLink>
    <NuxtLink to="/dashboard/accounts" exact-active-class="active">
      <UsersRound :size="16" />
      账号
    </NuxtLink>
    <NuxtLink to="/dashboard/config" exact-active-class="active">
      <Settings :size="16" />
      配置
    </NuxtLink>
    <NuxtLink to="/dashboard/events" exact-active-class="active">
      <Activity :size="16" />
      事件
    </NuxtLink>
    <button type="button" @click="logout">
      <LogOut :size="16" />
      退出
    </button>
  </nav>
</template>
