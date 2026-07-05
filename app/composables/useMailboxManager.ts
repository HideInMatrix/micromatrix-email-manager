import type {
  AppStatus,
  AutomationRule,
  MailMessage,
  MailProviderId,
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
  const selectedAccountId = ref('')
  const selectedMessageId = ref('')
  const search = ref('')
  const unreadOnly = ref(false)
  const busy = ref('')
  const error = ref('')
  const notice = ref('')

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

    if (!selectedAccountId.value && selectFirst && accounts.value[0]) {
      selectedAccountId.value = accounts.value[0].id
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
        unread: unreadOnly.value || undefined
      }
    })

    if (!selectedMessageId.value && messages.value[0]) {
      selectedMessageId.value = messages.value[0].id
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

  async function saveProviderConfig(payload: {
    provider: MailProviderId
    clientId: string
    clientSecret?: string
    pubsubTopic?: string
  }) {
    await withBusy(`provider-config-${payload.provider}`, async () => {
      await $fetch(`/api/provider-configs/${payload.provider}`, {
        method: 'PUT',
        body: {
          clientId: payload.clientId,
          clientSecret: payload.clientSecret || undefined,
          pubsubTopic: payload.pubsubTopic
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
      await refreshAll()
    })
  }

  async function saveRule(payload: {
    name: string
    match: AutomationRule['match']
    action: AutomationRule['action']
  }) {
    await withBusy('rule-save', async () => {
      await $fetch('/api/rules', {
        method: 'POST',
        body: {
          name: payload.name,
          enabled: true,
          match: payload.match,
          action: payload.action
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

  return {
    status,
    providers,
    accounts,
    messages,
    rules,
    providerConfigs,
    selectedAccountId,
    selectedAccount,
    selectedMessageId,
    selectedMessage,
    search,
    unreadOnly,
    busy,
    error,
    notice,
    refreshAll,
    loadStatus,
    loadAccounts,
    loadMessages,
    loadRules,
    loadProviderConfigs,
    connectProvider,
    saveProviderConfig,
    syncNow,
    startWatch,
    removeAccount,
    saveRule,
    toggleRule,
    deleteRule,
    accountName
  }
}
