<script setup lang="ts">
import { Copy, KeyRound, Plus, Trash2 } from 'lucide-vue-next'
import type {
  CreatedApiToken,
  PublicApiToken,
  PublicAppUser
} from '../../shared/types'
import { formatDate } from '../utils/format'

const props = withDefaults(defineProps<{
  users: PublicAppUser[]
  apiTokens: PublicApiToken[]
  createdApiToken?: CreatedApiToken
  busy: string
  currentUserEmail?: string
  canManageUsers?: boolean
}>(), {
  currentUserEmail: '',
  canManageUsers: false
})

const emit = defineEmits<{
  create: [payload: { userEmail: string, name?: string }]
  revoke: [token: PublicApiToken]
}>()

const form = reactive({
  userEmail: '',
  name: ''
})

const targetUserEmail = computed(() =>
  props.canManageUsers ? form.userEmail : props.currentUserEmail
)

watch(
  [() => props.users, () => props.currentUserEmail, () => props.canManageUsers],
  ([users, currentUserEmail, canManageUsers]) => {
    if (!canManageUsers) {
      form.userEmail = currentUserEmail
      return
    }

    if (!form.userEmail && users[0]) {
      form.userEmail = users[0].email
      return
    }

    if (form.userEmail && users.length && !users.some((user) => user.email === form.userEmail)) {
      form.userEmail = users[0].email
    }
  },
  { immediate: true }
)

function createToken() {
  if (!targetUserEmail.value) {
    return
  }

  emit('create', {
    userEmail: targetUserEmail.value,
    name: form.name.trim() || undefined
  })
  form.name = ''
}

async function copyToken() {
  const token = props.createdApiToken?.token

  if (!token || !navigator.clipboard) {
    return
  }

  await navigator.clipboard.writeText(token)
}
</script>

<template>
  <section class="card bg-base-200 shadow-sm">
    <div class="card-body gap-4 p-0">
      <div class="flex items-start justify-between gap-3 px-5 pt-5">
        <div>
          <h2 class="card-title">
            <KeyRound :size="18" />
            API Token
          </h2>
          <p class="mt-1 text-sm text-base-content/60">为第三方程序生成邮件接口访问令牌。</p>
        </div>
        <button
          class="btn btn-square btn-sm btn-outline"
          type="button"
          title="生成 Token"
          :disabled="!targetUserEmail || busy === 'api-token-create'"
          @click="createToken"
        >
          <span v-if="busy === 'api-token-create'" class="loading loading-spinner loading-xs" />
          <Plus v-else :size="17" />
        </button>
      </div>

      <form class="grid gap-3 border-b border-base-300 px-5 pb-5" @submit.prevent="createToken">
        <fieldset v-if="canManageUsers" class="fieldset p-0">
          <legend class="fieldset-legend">用户账号</legend>
          <select v-model="form.userEmail" class="select select-bordered w-full">
            <option v-if="!users.length" value="">暂无用户</option>
            <option
              v-for="user in users"
              :key="user.email"
              :value="user.email"
            >
              {{ user.email }} · {{ user.role === 'admin' ? '管理员' : '普通用户' }}
            </option>
          </select>
        </fieldset>
        <fieldset v-else class="fieldset p-0">
          <legend class="fieldset-legend">用户账号</legend>
          <input
            class="input input-bordered w-full"
            type="email"
            :value="currentUserEmail"
            disabled
            placeholder="当前登录用户"
          >
        </fieldset>

        <fieldset class="fieldset p-0">
          <legend class="fieldset-legend">名称</legend>
          <input v-model="form.name" class="input input-bordered w-full" type="text" placeholder="例如：CRM 同步脚本">
        </fieldset>

        <button
          class="btn btn-primary w-full"
          type="submit"
          :disabled="!targetUserEmail || busy === 'api-token-create'"
        >
          <span v-if="busy === 'api-token-create'" class="loading loading-spinner loading-xs" />
          <Plus v-else :size="16" />
          生成 Token
        </button>
      </form>

      <div v-if="createdApiToken" class="mx-5 rounded-box border border-success/30 bg-success/10 p-3">
        <div class="mb-2 flex items-center justify-between gap-3">
          <strong class="text-sm text-success">只显示一次</strong>
          <button class="btn btn-xs btn-ghost" type="button" @click="copyToken">
            <Copy :size="14" />
            复制
          </button>
        </div>
        <p class="break-all font-mono text-xs">{{ createdApiToken.token }}</p>
      </div>

      <div v-if="apiTokens.length" class="grid gap-3 px-5 pb-5">
        <div
          v-for="token in apiTokens"
          :key="token.id"
          class="flex items-center justify-between gap-3 rounded-box border border-base-300 bg-base-100 p-3"
        >
          <div class="min-w-0">
            <strong class="block truncate text-sm">{{ token.name || '未命名 Token' }}</strong>
            <small class="block truncate text-xs text-base-content/60">
              {{ token.userEmail }} · {{ token.tokenPrefix }}... · {{ formatDate(token.createdAt) }}
            </small>
            <small v-if="token.lastUsedAt" class="block truncate text-xs text-base-content/50">
              最近使用 {{ formatDate(token.lastUsedAt) }}
            </small>
          </div>
          <button
            class="btn btn-square btn-ghost text-error"
            type="button"
            title="撤销 Token"
            :disabled="busy === `api-token-delete-${token.id}`"
            @click="emit('revoke', token)"
          >
            <span v-if="busy === `api-token-delete-${token.id}`" class="loading loading-spinner loading-xs" />
            <Trash2 v-else :size="15" />
          </button>
        </div>
      </div>

      <div v-else class="flex min-h-32 items-center justify-center gap-2 p-6 text-base-content/60">
        <KeyRound :size="22" />
        <span>暂无 API Token</span>
      </div>
    </div>
  </section>
</template>
