<script setup lang="ts">
import { LockKeyhole, LogIn, UserPlus } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()

const email = ref('')
const password = ref('')
const passwordConfirm = ref('')
const busy = ref(false)
const error = ref('')
const configured = ref(true)
const mode = ref<'login' | 'register'>(route.query.mode === 'register' ? 'register' : 'login')

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
    await redirectAfterLogin(session.isAdmin)
  }
})

async function submitAuth() {
  busy.value = true
  error.value = ''

  try {
    const session = await $fetch<{
      isAdmin: boolean
    }>(mode.value === 'login' ? '/api/admin/login' : '/api/admin/register', {
      method: 'POST',
      body: {
        email: email.value,
        password: password.value,
        passwordConfirm: passwordConfirm.value
      }
    })
    await redirectAfterLogin(session.isAdmin)
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : '登录失败'
  } finally {
    busy.value = false
  }
}

function switchMode(nextMode: 'login' | 'register') {
  mode.value = nextMode
  error.value = ''
  password.value = ''
  passwordConfirm.value = ''
}

watch(
  () => route.query.mode,
  (nextMode) => {
    if (nextMode === 'register') {
      switchMode('register')
    } else if (nextMode === 'login') {
      switchMode('login')
    }
  }
)

function defaultRedirect(isAdmin: boolean) {
  return isAdmin ? '/dashboard' : '/dashboard/accounts'
}

function safeRedirect(fallback = '/') {
  const redirect = route.query.redirect

  if (
    typeof redirect !== 'string' ||
    !redirect.startsWith('/') ||
    redirect.startsWith('//') ||
    redirect.startsWith('/login')
  ) {
    return fallback
  }

  return redirect
}

async function redirectAfterLogin(isAdmin: boolean) {
  const target = safeRedirect(defaultRedirect(isAdmin))
  await router.replace(
    !isAdmin &&
      target.startsWith('/dashboard') &&
      !target.startsWith('/dashboard/accounts') &&
      !target.startsWith('/dashboard/tokens')
      ? '/dashboard/accounts'
      : target
  )
}
</script>

<template>
  <main class="flex min-h-screen w-[100vw] max-w-full items-center justify-center overflow-x-hidden bg-base-200 p-4">
    <form class="card w-full max-w-[24rem] bg-base-100 shadow-sm" @submit.prevent="submitAuth">
      <div class="card-body gap-4">
        <span class="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-content">
          <LockKeyhole :size="22" />
        </span>

        <div>
          <span class="block text-xs font-bold uppercase text-base-content/60">micromatrix-email-manager</span>
          <h1 class="mt-1 text-3xl font-light leading-tight">{{ mode === 'login' ? '登录' : '注册' }}</h1>
        </div>

        <div class="join w-full">
          <button
            class="btn join-item flex-1"
            :class="mode === 'login' ? 'btn-primary' : 'btn-ghost'"
            type="button"
            @click="switchMode('login')"
          >
            登录
          </button>
          <button
            class="btn join-item flex-1"
            :class="mode === 'register' ? 'btn-primary' : 'btn-ghost'"
            type="button"
            @click="switchMode('register')"
          >
            注册
          </button>
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

        <InputField
          v-model="email"
          label="邮箱"
          type="email"
          autocomplete="username"
        />

        <SecretInputField
          v-model="password"
          label="密码"
          :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
          reveal-label="显示密码"
          hide-label="隐藏密码"
        />

        <SecretInputField
          v-if="mode === 'register'"
          v-model="passwordConfirm"
          label="确认密码"
          autocomplete="new-password"
          reveal-label="显示确认密码"
          hide-label="隐藏确认密码"
        />

        <button
          class="btn btn-primary w-full"
          type="submit"
          :disabled="busy || !configured"
        >
          <span v-if="busy" class="loading loading-spinner loading-xs" />
          <LogIn v-else-if="mode === 'login'" :size="16" />
          <UserPlus v-else :size="16" />
          {{ mode === 'login' ? '登录' : '注册' }}
        </button>

        <div class="flex justify-center gap-3 text-xs text-base-content/60">
          <NuxtLink class="link link-hover" to="/privacy">隐私权政策</NuxtLink>
          <NuxtLink class="link link-hover" to="/terms">服务条款</NuxtLink>
        </div>
      </div>
    </form>
  </main>
</template>
