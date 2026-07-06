<script setup lang="ts">
import { LockKeyhole, LogIn } from 'lucide-vue-next'

const route = useRoute()

const email = ref('')
const password = ref('')
const busy = ref(false)
const error = ref('')
const configured = ref(true)

useHead({
  title: '登录 · micromatrix-email-manager'
})

definePageMeta({
  layout: false
})

onMounted(async () => {
  const session = await $fetch<{
    configured: boolean
    authenticated: boolean
    isAdmin: boolean
  }>('/api/admin/session')
  configured.value = session.configured

  if (session.authenticated) {
    await navigateTo(safeRedirect(defaultRedirect(session.isAdmin)))
  }
})

async function login() {
  busy.value = true
  error.value = ''

  try {
    const session = await $fetch<{
      isAdmin: boolean
    }>('/api/admin/login', {
      method: 'POST',
      body: {
        email: email.value,
        password: password.value
      }
    })
    await navigateTo(safeRedirect(defaultRedirect(session.isAdmin)))
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : '登录失败'
  } finally {
    busy.value = false
  }
}

function defaultRedirect(isAdmin: boolean) {
  return isAdmin ? '/dashboard' : '/'
}

function safeRedirect(fallback = '/') {
  const redirect = route.query.redirect
  return typeof redirect === 'string' && redirect.startsWith('/')
    ? redirect
    : fallback
}
</script>

<template>
  <main class="flex min-h-screen w-[100vw] max-w-full items-center justify-center overflow-x-hidden bg-base-200 p-4">
    <form class="card w-full max-w-[24rem] bg-base-100 shadow-sm" @submit.prevent="login">
      <div class="card-body gap-4">
        <span class="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-content">
          <LockKeyhole :size="22" />
        </span>

        <div>
          <span class="block text-xs font-bold uppercase text-base-content/60">micromatrix-email-manager</span>
          <h1 class="mt-1 text-3xl font-light leading-tight">登录</h1>
        </div>

        <StatusAlert
          v-if="!configured"
          type="error"
          message="请先在 .env 配置 NUXT_ADMIN_EMAIL 和 NUXT_ADMIN_PASSWORD"
          @close="configured = true"
        />
        <StatusAlert
          v-if="error"
          type="error"
          :message="error"
          @close="error = ''"
        />

        <fieldset class="fieldset p-0">
          <legend class="fieldset-legend">邮箱</legend>
          <input v-model="email" class="input input-bordered min-w-0 w-full" type="email" autocomplete="username">
        </fieldset>

        <fieldset class="fieldset p-0">
          <legend class="fieldset-legend">密码</legend>
          <input
            v-model="password"
            class="input input-bordered min-w-0 w-full"
            type="password"
            autocomplete="current-password"
          >
        </fieldset>

        <button
          class="btn btn-primary w-full"
          type="submit"
          :disabled="busy || !configured"
        >
          <span v-if="busy" class="loading loading-spinner loading-xs" />
          <LogIn v-else :size="16" />
          登录
        </button>
      </div>
    </form>
  </main>
</template>
