<script setup lang="ts">
import type { MailMessage } from '../../shared/types'

const manager = useMailboxManager()
const session = ref<{
  configured: boolean
  authenticated: boolean
  isAdmin: boolean
}>()

const {
  status,
  providers,
  accounts,
  messages,
  rules,
  selectedAccountId,
  selectedMessageId,
  selectedMessage,
  search,
  unreadOnly,
  ruleMatchedOnly,
  busy,
  error,
  notice,
  refreshAll,
  loadMessages,
  syncNow,
  trashMessage,
  trashMessages
} = manager
const isAuthenticated = computed(() => Boolean(session.value?.authenticated))
const dashboardHref = computed(() => session.value?.isAdmin ? '/dashboard' : undefined)

useHead({
  title: 'MailManager · 邮件同步与规则管理'
})

definePageMeta({
  layout: 'frontend'
})

async function refreshWorkspace() {
  session.value = await $fetch<{
    configured: boolean
    authenticated: boolean
    isAdmin: boolean
  }>('/api/admin/session')
  selectedAccountId.value = ''
  await refreshAll({ selectFirstAccount: false })
}

onMounted(refreshWorkspace)

watch([search, unreadOnly, ruleMatchedOnly], async () => {
  await loadMessages()
})

async function confirmTrashMessage(message: MailMessage) {
  if (!window.confirm(`将「${message.subject}」移入垃圾箱？`)) {
    return
  }

  await trashMessage(message)
}

async function confirmTrashMessages(messages: MailMessage[]) {
  if (!messages.length) {
    return
  }

  if (!window.confirm(`将选中的 ${messages.length} 封邮件移入垃圾箱？`)) {
    return
  }

  await trashMessages(messages)
}
</script>

<template>
  <AppHeader
    title="MailManager"
    eyebrow="邮件同步与规则管理"
    :status="status"
    :providers="providers"
    :busy="busy"
    :dashboard-href="dashboardHref"
    :show-connect="false"
    :show-drawer-button="false"
    :show-sync="isAuthenticated"
    @refresh="refreshWorkspace"
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

  <section class="grid gap-4 rounded-box bg-base-200 p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
    <div class="grid gap-2">
      <p class="text-sm font-semibold text-primary">MailManager</p>
      <h2 class="text-2xl font-bold leading-tight">集中同步、查看和整理已授权邮箱中的邮件</h2>
      <p class="max-w-3xl text-sm leading-6 text-base-content/70">
        MailManager 用于连接用户授权的 Gmail 或 Outlook 邮箱账号，帮助用户同步邮件、搜索邮件、查看邮件详情，并通过规则筛选或整理邮件。未登录访问首页时不会展示任何邮箱数据。
      </p>
      <div class="flex flex-wrap gap-2 pt-1">
        <span class="badge badge-outline">OAuth 授权邮箱</span>
        <span class="badge badge-outline">邮件同步</span>
        <span class="badge badge-outline">邮件搜索</span>
        <span class="badge badge-outline">规则筛选</span>
      </div>
    </div>
    <div class="flex flex-wrap gap-2 lg:justify-end">
      <NuxtLink
        v-if="!isAuthenticated"
        class="btn btn-primary"
        to="/login"
      >
        登录或注册
      </NuxtLink>
      <NuxtLink
        v-else-if="dashboardHref"
        class="btn btn-outline"
        :to="dashboardHref"
      >
        进入后台
      </NuxtLink>
    </div>
  </section>

  <BitsRevealPanel as="main" class="grid min-w-0 gap-4 xl:grid-cols-[minmax(520px,1fr)_minmax(340px,0.72fr)]">
    <InboxPanel
      v-model:selected-message-id="selectedMessageId"
      v-model:search="search"
      v-model:unread-only="unreadOnly"
      v-model:rule-matched-only="ruleMatchedOnly"
      :messages="messages"
      :accounts="accounts"
      :status="status"
      :busy="busy"
      selected-account-email="全部账号"
      @trash-selected="confirmTrashMessages"
    />

    <MessageDetailPanel
      :message="selectedMessage"
      :rules="rules"
      :busy="busy"
      @trash="confirmTrashMessage"
    />
  </BitsRevealPanel>
</template>
