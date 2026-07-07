<script setup lang="ts">
import {
  CheckCircle2,
  KeyRound,
  Plug,
  Radio,
  RefreshCcw,
  Settings,
  Trash2,
  UserRound
} from 'lucide-vue-next'
import type { MailProviderSummary, PublicMailAccount } from '../../shared/types'
import { statusLabel } from '../utils/format'

const props = defineProps<{
  accounts: PublicMailAccount[]
  providers: MailProviderSummary[]
  selectedAccountId: string
  busy: string
  canManageProviders?: boolean
}>()

const emit = defineEmits<{
  'update:selectedAccountId': [id: string]
  connect: [provider: MailProviderSummary]
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

function canConnect(provider: MailProviderSummary) {
  return provider.enabled && provider.configured && provider.capabilities.oauth
}

function connectTitle(provider: MailProviderSummary) {
  if (!provider.enabled || !provider.capabilities.oauth) {
    return `${provider.name} OAuth 连接暂未启用`
  }

  if (!provider.configured) {
    return '请先完成该邮箱类型的 OAuth 配置'
  }

  return `连接 ${provider.name}`
}

function watchTitle(account: PublicMailAccount) {
  return canWatch(account)
    ? '启动 Watch'
    : `${providerName(props.providers, account.provider)} 暂不支持 Watch 或尚未配置`
}

function accountStatusClass(status: PublicMailAccount['status']) {
  return {
    connected: 'badge-success',
    needs_reauth: 'badge-warning',
    error: 'badge-error'
  }[status]
}
</script>

<template>
  <section class="card bg-base-200 shadow-sm">
    <div class="card-body gap-4 p-0">
      <div class="flex items-start justify-between gap-3 px-5 pt-5">
        <div>
          <h2 class="card-title">
            <UserRound :size="18" />
            账号
          </h2>
          <p class="mt-1 text-sm text-base-content/60">同步、监听和断开邮箱账号。</p>
        </div>
        <button
          class="btn btn-square btn-sm btn-outline"
          type="button"
          :disabled="!hasWatchableAccounts"
          :title="hasWatchableAccounts ? '启动全部 Watch' : '当前没有可 Watch 的账号'"
          @click="emit('watch')"
        >
          <span v-if="busy === 'watch-all'" class="loading loading-spinner loading-xs" />
          <Radio v-else :size="17" />
        </button>
      </div>

      <div class="grid gap-3 px-5">
        <div class="grid gap-3 md:grid-cols-2">
          <article
            v-for="provider in providers"
            :key="provider.id"
            class="rounded-box border border-base-300 bg-base-100 p-4"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <h3 class="truncate font-semibold">{{ provider.name }}</h3>
                <p class="mt-1 line-clamp-2 text-sm text-base-content/60">{{ provider.description }}</p>
              </div>
              <span
                class="badge badge-sm"
                :class="provider.configured ? 'badge-success' : 'badge-warning'"
              >
                {{ provider.configured ? 'OAuth 已配置' : '待配置' }}
              </span>
            </div>

            <div class="mt-3 flex flex-wrap gap-2">
              <span class="badge badge-outline h-7 gap-1">
                <CheckCircle2 :size="14" />
                {{ accounts.filter((account) => account.provider === provider.id).length }} 个账号
              </span>
              <span
                class="badge h-7 gap-1"
                :class="provider.capabilities.oauth ? 'badge-primary' : 'badge-outline'"
              >
                <Plug :size="14" />
                OAuth
              </span>
              <span
                class="badge h-7 gap-1"
                :class="provider.capabilities.watch ? 'badge-primary' : 'badge-outline'"
              >
                <Radio :size="14" />
                Watch
              </span>
            </div>

            <div class="mt-4 flex flex-wrap gap-2">
              <button
                class="btn btn-primary btn-sm"
                type="button"
                :disabled="!canConnect(provider) || busy === `connect-${provider.id}`"
                :title="connectTitle(provider)"
                @click="emit('connect', provider)"
              >
                <span v-if="busy === `connect-${provider.id}`" class="loading loading-spinner loading-xs" />
                <Plug v-else :size="15" />
                连接 {{ provider.name }}
              </button>
              <NuxtLink
                v-if="!provider.configured && canManageProviders"
                class="btn btn-outline btn-sm"
                to="/dashboard/config"
              >
                <Settings :size="15" />
                去配置
              </NuxtLink>
            </div>
          </article>
        </div>
      </div>

      <div v-if="accounts.length" class="overflow-x-auto">
        <table class="table table-zebra">
          <thead>
            <tr>
              <th>账号</th>
              <th>服务商</th>
              <th>状态</th>
              <th class="text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="account in accounts"
              :key="account.id"
              class="cursor-pointer"
              :class="account.id === selectedAccountId ? 'bg-primary/10' : ''"
              @click="emit('update:selectedAccountId', account.id)"
            >
              <td>
                <div class="flex min-w-0 items-center gap-3">
                  <div class="avatar">
                    <div class="h-10 w-10 rounded-lg">
                      <img v-if="account.picture" :src="account.picture" :alt="account.email">
                      <span v-else class="flex h-full w-full items-center justify-center bg-base-100 text-base-content/60">
                        <UserRound :size="17" />
                      </span>
                    </div>
                  </div>
                  <span class="min-w-0">
                    <strong class="block truncate text-sm">{{ account.name }}</strong>
                    <small class="block truncate text-xs text-base-content/60">{{ account.email }}</small>
                  </span>
                </div>
              </td>
              <td>{{ providerName(providers, account.provider) }}</td>
              <td>
                <span class="badge badge-sm" :class="accountStatusClass(account.status)">
                  {{ statusLabel(account.status) }}
                </span>
              </td>
              <td>
                <div class="flex justify-end gap-2" @click.stop>
                  <button
                    class="btn btn-square btn-sm btn-ghost"
                    type="button"
                    title="同步此账号"
                    @click="emit('sync', account.id)"
                  >
                    <span v-if="busy === `sync-${account.id}`" class="loading loading-spinner loading-xs" />
                    <RefreshCcw v-else :size="15" />
                  </button>
                  <button
                    class="btn btn-square btn-sm btn-ghost"
                    type="button"
                    :disabled="!canWatch(account)"
                    :title="watchTitle(account)"
                    @click="emit('watch', account.id)"
                  >
                    <span v-if="busy === `watch-${account.id}`" class="loading loading-spinner loading-xs" />
                    <Radio v-else :size="15" />
                  </button>
                  <button
                    class="btn btn-square btn-sm btn-ghost text-error"
                    type="button"
                    title="断开账号"
                    @click="emit('remove', account)"
                  >
                    <Trash2 :size="15" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else class="flex min-h-32 items-center justify-center gap-2 p-6 text-base-content/60">
        <KeyRound :size="22" />
        <span>暂无账号</span>
      </div>
    </div>
  </section>
</template>
