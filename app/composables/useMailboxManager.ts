import type {
  AppStatus,
  AutomationRule,
  CreatedApiToken,
  MailMessage,
  MailProviderId,
  PublicApiToken,
  PublicAppUser,
  PublicMailProviderConfig,
  PublicMailAccount
} from '../../shared/types'

interface RefreshOptions {
  selectFirstAccount?: boolean
}

interface LoadAccountsOptions {
  selectFirst?: boolean
}

export function useMailboxManager() {
  const status = ref<AppStatus>()
  const accounts = ref<PublicMailAccount[]>([])
  const messages = ref<MailMessage[]>([])
  const rules = ref<AutomationRule[]>([])
  const providerConfigs = ref<PublicMailProviderConfig[]>([])
  const users = ref<PublicAppUser[]>([])
  const apiTokens = ref<PublicApiToken[]>([])
  const createdApiToken = ref<CreatedApiToken>()
  const selectedAccountId = ref('')
  const selectedMessageId = ref('')
  const search = ref('')
  const unreadOnly = ref(false)
  const ruleMatchedOnly = ref(false)
  const busy = ref('')
  const error = ref('')
  const notice = ref('')
  const markingReadKeys = new Set<string>()

  const selectedMessage = computed(() =>
    messages.value.find((message) => message.id === selectedMessageId.value)
  )

  const selectedAccount = computed(() =>
    accounts.value.find((account) => account.id === selectedAccountId.value)
  )

  const providers = computed(() => status.value?.providers || [])

  async function refreshAll(options: RefreshOptions = {}) {
    await withBusy('refresh', async () => {
      await Promise.all([
        loadStatus(),
        loadAccounts({ selectFirst: options.selectFirstAccount ?? true }),
        loadRules(),
        loadMessages()
      ])
    })
  }

  async function loadStatus() {
    status.value = await $fetch<AppStatus>('/api/status')
  }

  async function loadAccounts(options: LoadAccountsOptions = {}) {
    const selectFirst = options.selectFirst ?? true
    accounts.value = await $fetch<PublicMailAccount[]>('/api/accounts')
    const firstAccount = accounts.value[0]

    if (!selectedAccountId.value && selectFirst && firstAccount) {
      selectedAccountId.value = firstAccount.id
    }

    if (
      selectedAccountId.value &&
      !accounts.value.some((account) => account.id === selectedAccountId.value)
    ) {
      selectedAccountId.value = selectFirst ? accounts.value[0]?.id || '' : ''
    }
  }

  async function loadMessages() {
    messages.value = await $fetch<MailMessage[]>('/api/messages', {
      query: {
        accountId: selectedAccountId.value || undefined,
        q: search.value || undefined,
        unread: unreadOnly.value || undefined,
        matched: ruleMatchedOnly.value || undefined
      }
    })
    const firstMessage = messages.value[0]

    if (!selectedMessageId.value && firstMessage) {
      selectedMessageId.value = firstMessage.id
    }

    if (
      selectedMessageId.value &&
      !messages.value.some((message) => message.id === selectedMessageId.value)
    ) {
      selectedMessageId.value = messages.value[0]?.id || ''
    }
  }

  async function loadRules() {
    rules.value = await $fetch<AutomationRule[]>('/api/rules')
  }

  async function loadProviderConfigs() {
    providerConfigs.value =
      await $fetch<PublicMailProviderConfig[]>('/api/provider-configs')
  }

  async function loadUsers() {
    users.value = await $fetch<PublicAppUser[]>('/api/users')
  }

  async function loadApiTokens() {
    apiTokens.value = await $fetch<PublicApiToken[]>('/api/api-tokens')
  }

  async function saveProviderConfig(payload: {
    provider: MailProviderId
    clientId: string
    clientSecret?: string
    pubsubTopic?: string
    tenantId?: string
  }) {
    await withBusy(`provider-config-${payload.provider}`, async () => {
      await $fetch(`/api/provider-configs/${payload.provider}`, {
        method: 'PUT',
        body: {
          clientId: payload.clientId,
          clientSecret: payload.clientSecret || undefined,
          pubsubTopic: payload.pubsubTopic,
          tenantId: payload.tenantId
        }
      })
      notice.value = '配置已保存'
      await Promise.all([loadProviderConfigs(), loadStatus()])
    })
  }

  async function connectProvider(provider: MailProviderId) {
    await withBusy(`connect-${provider}`, async () => {
      const response = await $fetch<{ url: string }>(
        `/api/mail/oauth/${provider}/start`
      )
      window.location.href = response.url
    })
  }

  async function syncNow(accountId?: string) {
    await withBusy(accountId ? `sync-${accountId}` : 'sync-all', async () => {
      await $fetch('/api/mail/sync', {
        method: 'POST',
        body: {
          accountId,
          limit: 25
        }
      })
      notice.value = '同步完成'
      await refreshAll()
    })
  }

  async function startWatch(accountId?: string) {
    await withBusy(accountId ? `watch-${accountId}` : 'watch-all', async () => {
      await $fetch('/api/mail/watch', {
        method: 'POST',
        body: { accountId }
      })
      notice.value = 'Watch 已启动'
      await refreshAll()
    })
  }

  async function removeAccount(account: PublicMailAccount) {
    await withBusy(`delete-${account.id}`, async () => {
      await $fetch(`/api/accounts/${account.id}`, { method: 'DELETE' })
      selectedAccountId.value = ''
      selectedMessageId.value = ''
      notice.value = '邮箱账号已删除'
      await refreshAll()
    })
  }

  async function saveRule(payload: {
    kind: AutomationRule['kind']
    provider: MailProviderId
    name: string
    match: AutomationRule['match']
    action: AutomationRule['action']
    extraction?: AutomationRule['extraction']
  }) {
    await withBusy('rule-save', async () => {
      await $fetch('/api/rules', {
        method: 'POST',
        body: {
          kind: payload.kind,
          provider: payload.provider,
          name: payload.name,
          enabled: true,
          match: payload.match,
          action: payload.action,
          extraction: payload.extraction
        }
      })
      notice.value = '规则已保存'
      await Promise.all([loadRules(), loadStatus()])
    })
  }

  async function toggleRule(rule: AutomationRule) {
    await withBusy(`rule-${rule.id}`, async () => {
      await $fetch(`/api/rules/${rule.id}`, {
        method: 'PUT',
        body: {
          ...rule,
          enabled: !rule.enabled
        }
      })
      await loadRules()
    })
  }

  async function deleteRule(rule: AutomationRule) {
    await withBusy(`delete-rule-${rule.id}`, async () => {
      await $fetch(`/api/rules/${rule.id}`, { method: 'DELETE' })
      await Promise.all([loadRules(), loadMessages(), loadStatus()])
    })
  }

  async function trashMessage(message: MailMessage) {
    await withBusy(`trash-${message.accountId}-${message.id}`, async () => {
      await $fetch(`/api/messages/${encodeURIComponent(message.id)}/trash`, {
        method: 'POST',
        body: {
          accountId: message.accountId
        }
      })
      notice.value = '邮件已移入垃圾箱'
      await Promise.all([loadMessages(), loadStatus()])
    })
  }

  async function markMessageRead(message: MailMessage) {
    const key = `${message.accountId}:${message.id}`

    if (!message.unread || markingReadKeys.has(key)) {
      return
    }

    markingReadKeys.add(key)
    markLocalMessageRead(message)

    try {
      await $fetch(`/api/messages/${encodeURIComponent(message.id)}/read`, {
        method: 'POST',
        body: {
          accountId: message.accountId
        }
      })
      await loadStatus()

      if (unreadOnly.value) {
        await loadMessages()
      }
    } catch (caught) {
      error.value =
        caught instanceof Error ? caught.message : '标记已读失败，请检查服务端日志'
    } finally {
      markingReadKeys.delete(key)
    }
  }

  async function trashMessages(selectedMessages: MailMessage[]) {
    const messagesToTrash = Array.from(
      new Map(
        selectedMessages.map((message) => [
          `${message.accountId}:${message.id}`,
          message
        ])
      ).values()
    )

    if (!messagesToTrash.length) {
      return
    }

    await withBusy('trash-batch', async () => {
      try {
        const result = await $fetch<{ count: number }>('/api/messages/trash', {
          method: 'POST',
          body: {
            messages: messagesToTrash.map((message) => ({
              id: message.id,
              accountId: message.accountId
            }))
          }
        })
        notice.value = `${result.count} 封邮件已移入垃圾箱`
      } finally {
        await Promise.all([loadMessages(), loadStatus()])
      }
    })
  }

  async function createApiToken(payload: {
    userEmail: string
    name?: string
  }) {
    await withBusy('api-token-create', async () => {
      createdApiToken.value = await $fetch<CreatedApiToken>('/api/api-tokens', {
        method: 'POST',
        body: payload
      })
      notice.value = 'API Token 已生成'
      await loadApiTokens()
    })
  }

  async function revokeApiToken(token: PublicApiToken) {
    await withBusy(`api-token-delete-${token.id}`, async () => {
      await $fetch(`/api/api-tokens/${token.id}`, { method: 'DELETE' })

      if (createdApiToken.value?.apiToken.id === token.id) {
        createdApiToken.value = undefined
      }

      notice.value = 'API Token 已撤销'
      await loadApiTokens()
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

  function accountName(accountId: string) {
    return (
      accounts.value.find((account) => account.id === accountId)?.email || accountId
    )
  }

  function markLocalMessageRead(message: MailMessage) {
    const target = messages.value.find(
      (item) => item.id === message.id && item.accountId === message.accountId
    )

    if (!target) {
      return
    }

    target.unread = false
    target.labels = target.labels.filter((label) => label !== 'UNREAD')
    target.updatedAt = new Date().toISOString()
  }

  return {
    status,
    providers,
    accounts,
    messages,
    rules,
    providerConfigs,
    users,
    apiTokens,
    createdApiToken,
    selectedAccountId,
    selectedAccount,
    selectedMessageId,
    selectedMessage,
    search,
    unreadOnly,
    ruleMatchedOnly,
    busy,
    error,
    notice,
    refreshAll,
    loadStatus,
    loadAccounts,
    loadMessages,
    loadRules,
    loadProviderConfigs,
    loadUsers,
    loadApiTokens,
    connectProvider,
    saveProviderConfig,
    syncNow,
    startWatch,
    removeAccount,
    saveRule,
    toggleRule,
    deleteRule,
    trashMessage,
    markMessageRead,
    trashMessages,
    createApiToken,
    revokeApiToken,
    accountName
  }
}
