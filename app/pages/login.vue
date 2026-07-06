<script setup lang="ts">
import { LockKeyhole, LogIn } from 'lucide-vue-next'

const route = useRoute()

const email = ref('')
const password = ref('')
const busy = ref(false)
const error = ref('')
const configured = ref(true)

useHead({
  title: '管理员登录 · micromatrix-email-manager'
})

onMounted(async () => {
  const session = await $fetch<{
    configured: boolean
    authenticated: boolean
  }>('/api/admin/session')
  configured.value = session.configured

  if (session.authenticated) {
    await navigateTo(safeRedirect())
  }
})

async function login() {
  busy.value = true
  error.value = ''

  try {
    await $fetch('/api/admin/login', {
      method: 'POST',
      body: {
        email: email.value,
        password: password.value
      }
    })
    await navigateTo(safeRedirect())
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : '登录失败'
  } finally {
    busy.value = false
  }
}

function safeRedirect() {
  const redirect = route.query.redirect
  return typeof redirect === 'string' && redirect.startsWith('/')
    ? redirect
    : '/dashboard'
}
</script>

<template>
  <main class="login-page">
    <form class="login-panel" @submit.prevent="login">
      <span class="login-mark">
        <LockKeyhole :size="22" />
      </span>

      <div>
        <span class="eyebrow">micromatrix-email-manager</span>
        <h1>管理员登录</h1>
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

      <label class="login-field">
        <span>邮箱</span>
        <input v-model="email" type="email" autocomplete="username">
      </label>

      <label class="login-field">
        <span>密码</span>
        <input
          v-model="password"
          type="password"
          autocomplete="current-password"
        >
      </label>

      <button
        class="button primary login-submit"
        type="submit"
        :disabled="busy || !configured"
      >
        <LogIn :size="16" />
        登录
      </button>
    </form>
  </main>
</template>
