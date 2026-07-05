<script setup lang="ts">
import {
  Home,
  Inbox,
  LayoutDashboard,
  MailOpen,
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
  showConnect?: boolean
  showSync?: boolean
}>(), {
  title: '邮箱账号管理',
  eyebrow: 'micromatrix-email-manager',
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
  <header class="topbar">
    <div class="title-block">
      <span class="eyebrow">{{ eyebrow }}</span>
      <h1>{{ title }}</h1>
    </div>

    <div class="top-stats" v-if="status">
      <span class="stat-pill">
        <Inbox :size="15" />
        {{ status.counts.messages }} 邮件
      </span>
      <span class="stat-pill warning">
        <MailOpen :size="15" />
        {{ status.counts.unread }} 未读
      </span>
      <span class="stat-pill">
        <Tag :size="15" />
        {{ status.counts.rules }} 规则
      </span>
    </div>

    <div class="top-actions">
      <NuxtLink v-if="homeHref" class="button secondary" :to="homeHref">
        <Home :size="16" />
        用户入口
      </NuxtLink>
      <NuxtLink
        v-if="dashboardHref"
        class="button secondary"
        :to="dashboardHref"
      >
        <LayoutDashboard :size="16" />
        后台
      </NuxtLink>
      <button class="button secondary" type="button" @click="emit('refresh')">
        <RefreshCcw :class="{ spin: busy === 'refresh' }" :size="16" />
        刷新
      </button>
      <button
        v-if="showSync"
        class="button secondary"
        type="button"
        @click="emit('sync')"
      >
        <RefreshCcw :class="{ spin: busy === 'sync-all' }" :size="16" />
        同步
      </button>
      <button
        v-if="showConnect && primaryProvider"
        class="button primary"
        type="button"
        @click="emit('connect', primaryProvider)"
      >
        <Plug :size="16" />
        连接 {{ primaryProvider.name }}
      </button>
    </div>
  </header>
</template>
