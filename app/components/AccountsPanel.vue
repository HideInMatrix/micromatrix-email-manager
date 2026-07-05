<script setup lang="ts">
import { KeyRound, Radio, RefreshCcw, Trash2, UserRound } from 'lucide-vue-next'
import type { MailProviderSummary, PublicMailAccount } from '../../shared/types'
import { statusLabel } from '../utils/format'

const props = defineProps<{
  accounts: PublicMailAccount[]
  providers: MailProviderSummary[]
  selectedAccountId: string
  busy: string
}>()

const emit = defineEmits<{
  'update:selectedAccountId': [id: string]
  sync: [accountId: string]
  watch: [accountId?: string]
  remove: [account: PublicMailAccount]
}>()

function providerName(providers: MailProviderSummary[], providerId: string) {
  return providers.find((provider) => provider.id === providerId)?.name || providerId
}

const hasWatchableAccounts = computed(() =>
  props.accounts.some((account) => canWatch(account))
)

function providerForAccount(account: PublicMailAccount) {
  return props.providers.find((provider) => provider.id === account.provider)
}

function canWatch(account: PublicMailAccount) {
  return Boolean(providerForAccount(account)?.capabilities.watch)
}
</script>

<template>
  <section class="panel">
    <div class="panel-head">
      <h2>账号</h2>
      <button
        class="icon-button"
        type="button"
        :disabled="!hasWatchableAccounts"
        :title="hasWatchableAccounts ? '启动全部 Watch' : '先配置 Gmail Pub/Sub Topic'"
        @click="emit('watch')"
      >
        <Radio :class="{ spin: busy === 'watch-all' }" :size="17" />
      </button>
    </div>

    <div v-if="accounts.length" class="account-list">
      <div
        v-for="account in accounts"
        :key="account.id"
        class="account-item"
        :class="{ active: account.id === selectedAccountId }"
      >
        <button
          class="account-main"
          type="button"
          @click="emit('update:selectedAccountId', account.id)"
        >
          <img
            v-if="account.picture"
            class="avatar"
            :src="account.picture"
            :alt="account.email"
          >
          <span v-else class="avatar fallback">
            <UserRound :size="17" />
          </span>
          <span class="account-text">
            <strong>{{ account.name }}</strong>
            <small>{{ providerName(providers, account.provider) }} · {{ account.email }}</small>
          </span>
          <span class="status-badge" :class="account.status">
            {{ statusLabel(account.status) }}
          </span>
        </button>

        <div class="account-tools">
          <button
            class="icon-button"
            type="button"
            title="同步此账号"
            @click="emit('sync', account.id)"
          >
            <RefreshCcw
              :class="{ spin: busy === `sync-${account.id}` }"
              :size="15"
            />
          </button>
          <button
            class="icon-button"
            type="button"
            :disabled="!canWatch(account)"
            :title="canWatch(account) ? '启动 Watch' : '先配置 Gmail Pub/Sub Topic'"
            @click="emit('watch', account.id)"
          >
            <Radio
              :class="{ spin: busy === `watch-${account.id}` }"
              :size="15"
            />
          </button>
          <button
            class="icon-button danger"
            type="button"
            title="断开账号"
            @click="emit('remove', account)"
          >
            <Trash2 :size="15" />
          </button>
        </div>
      </div>
    </div>

    <div v-else class="empty-state">
      <KeyRound :size="22" />
      <span>暂无账号</span>
    </div>
  </section>
</template>
