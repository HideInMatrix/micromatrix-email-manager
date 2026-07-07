<script setup lang="ts">
import { RefreshCcw } from 'lucide-vue-next'
import type { AutomationRule } from '../../../shared/types'

const manager = useMailboxManager()

const {
  providers,
  rules,
  busy,
  error,
  notice,
  loadStatus,
  loadRules,
  syncNow,
  saveRule,
  toggleRule,
  deleteRule
} = manager
const pendingDeleteRule = ref<AutomationRule>()

useHead({
  title: '规则 · micromatrix-email-manager'
})

definePageMeta({
  layout: 'dashboard'
})

async function refreshRulesPage() {
  await Promise.all([
    loadStatus(),
    loadRules()
  ])
}

onMounted(refreshRulesPage)

function confirmDeleteRule(rule: AutomationRule) {
  pendingDeleteRule.value = rule
}

async function deletePendingRule() {
  const rule = pendingDeleteRule.value

  if (!rule) {
    return
  }

  await deleteRule(rule)
  pendingDeleteRule.value = undefined
}
</script>

<template>
  <header class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
    <div class="grow">
      <div class="breadcrumbs text-sm">
        <ul>
          <li><NuxtLink to="/dashboard">Dashboard</NuxtLink></li>
          <li><h2>Rules</h2></li>
        </ul>
      </div>
      <p class="text-sm text-base-content/60">创建和管理本地自动化规则。</p>
    </div>
    <div class="flex shrink-0 flex-wrap items-center gap-2">
      <button class="btn btn-sm btn-ghost max-sm:btn-square" type="button" title="刷新" @click="refreshRulesPage">
        <span v-if="busy === 'refresh'" class="loading loading-spinner loading-xs" />
        <RefreshCcw v-else :size="16" />
        <span class="max-sm:hidden">刷新</span>
      </button>
      <button class="btn btn-sm btn-ghost max-sm:btn-square" type="button" title="同步" @click="syncNow()">
        <span v-if="busy === 'sync-all'" class="loading loading-spinner loading-xs" />
        <RefreshCcw v-else :size="16" />
        <span class="max-sm:hidden">同步</span>
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
    <RulesPanel
      :providers="providers"
      :rules="rules"
      :busy="busy"
      @save="saveRule"
      @toggle="toggleRule"
      @delete="confirmDeleteRule"
    />
  </BitsRevealPanel>

  <ConfirmModal
    :open="Boolean(pendingDeleteRule)"
    title="删除规则？"
    :message="pendingDeleteRule ? `删除规则「${pendingDeleteRule.name}」后将不再自动处理匹配邮件。` : ''"
    confirm-label="删除规则"
    :busy="pendingDeleteRule ? busy === `delete-rule-${pendingDeleteRule.id}` : false"
    @close="pendingDeleteRule = undefined"
    @confirm="deletePendingRule"
  />
</template>
