<script setup lang="ts">
const appName = 'micromatrix-email-manager'

useHead({
  title: `服务条款 · ${appName}`
})

definePageMeta({
  layout: false
})
</script>

<template>
  <main class="min-h-screen bg-base-200 px-4 py-8 text-base-content">
    <article class="mx-auto grid max-w-3xl gap-6 rounded-box bg-base-100 p-6 shadow-sm md:p-8">
      <header class="grid gap-2">
        <NuxtLink class="link link-hover text-sm text-base-content/60" to="/">micromatrix-email-manager</NuxtLink>
        <h1 class="text-3xl font-light leading-tight">服务条款</h1>
        <p class="text-sm text-base-content/60">最后更新：2026-07-07</p>
      </header>

      <section class="grid gap-3">
        <h2 class="text-xl font-semibold">服务说明</h2>
        <p>
          {{ appName }} 是一个自托管邮箱管理工具，用于连接邮箱账号、同步邮件、查看邮件内容、管理本地规则、启动邮箱变更监听，并在您确认后删除或移入垃圾箱指定邮件。
        </p>
      </section>

      <section class="grid gap-3">
        <h2 class="text-xl font-semibold">使用责任</h2>
        <p>
          您需要确保自己有权连接和管理相关邮箱账号，并对通过本应用执行的同步、访问、规则处理、API Token 调用和邮件删除操作负责。
          请不要使用本应用访问未经授权的账号或数据。
        </p>
      </section>

      <section class="grid gap-3">
        <h2 class="text-xl font-semibold">账号与凭据</h2>
        <p>
          您应妥善保管登录密码、OAuth 授权、API Token、服务器凭据和环境变量。通过您的账号或 Token 发起的请求可能会访问或修改邮箱数据。
        </p>
      </section>

      <section class="grid gap-3">
        <h2 class="text-xl font-semibold">第三方服务</h2>
        <p>
          本应用会与您授权的邮箱服务提供商交互，例如 Gmail 或 Outlook。您使用这些服务时，同时受对应服务提供商的条款、政策和限制约束。
        </p>
      </section>

      <section class="grid gap-3">
        <h2 class="text-xl font-semibold">服务可用性</h2>
        <p>
          本应用按当前状态提供。部署、网络、邮箱服务限制、OAuth 配置、数据库状态或第三方服务变更都可能影响功能可用性。
        </p>
      </section>

      <section class="grid gap-3">
        <h2 class="text-xl font-semibold">条款变更</h2>
        <p>
          本条款可能随功能、部署环境或合规要求更新。继续使用本应用即表示您接受更新后的条款。
        </p>
      </section>

      <section class="grid gap-3">
        <h2 class="text-xl font-semibold">联系我们</h2>
        <p>
          如果您对本条款有疑问，请联系本应用的部署和维护人员。
        </p>
      </section>

      <footer class="flex flex-wrap gap-3 border-t border-base-300 pt-4 text-sm">
        <NuxtLink class="link" to="/privacy">隐私权政策</NuxtLink>
        <NuxtLink class="link" to="/login">登录</NuxtLink>
      </footer>
    </article>
  </main>
</template>
