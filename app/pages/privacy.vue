<script setup lang="ts">
const appName = 'micromatrix-email-manager'

useHead({
  title: `隐私权政策 · ${appName}`
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
        <h1 class="text-3xl font-light leading-tight">隐私权政策</h1>
        <p class="text-sm text-base-content/60">最后更新：2026-07-07</p>
      </header>

      <section class="grid gap-3">
        <h2 class="text-xl font-semibold">我们收集的信息</h2>
        <p>
          {{ appName }} 会在您授权邮箱账号后保存必要的账号信息、OAuth 授权令牌、邮件摘要、邮件正文、标签、附件元数据、同步状态、自动化规则和系统事件记录。
          这些数据仅用于提供邮箱同步、查看、搜索、规则处理和删除邮件等功能。
        </p>
      </section>

      <section class="grid gap-3">
        <h2 class="text-xl font-semibold">邮箱数据的使用方式</h2>
        <p>
          本应用访问邮箱数据是为了代表您执行您主动使用的功能，例如同步邮件列表、展示邮件内容、启动邮箱变更监听、执行本地规则，以及将您选择的邮件移入垃圾箱。
          本应用不会出售、出租或用于广告目的处理您的邮箱数据。
        </p>
      </section>

      <section class="grid gap-3">
        <h2 class="text-xl font-semibold">数据存储与安全</h2>
        <p>
          应用数据存储在您部署的服务器和数据库中。OAuth Token 会使用部署环境中的加密密钥进行加密保存，API Token 只保存哈希值。
          请妥善保护服务器、数据库、环境变量和管理员账号。
        </p>
      </section>

      <section class="grid gap-3">
        <h2 class="text-xl font-semibold">数据共享</h2>
        <p>
          除邮箱服务提供商、您部署环境中的基础设施服务，以及法律要求或安全合规所必需的情况外，本应用不会主动向第三方共享您的个人数据或邮箱内容。
        </p>
      </section>

      <section class="grid gap-3">
        <h2 class="text-xl font-semibold">数据删除</h2>
        <p>
          您可以在应用中断开邮箱账号、撤销 API Token，或由管理员删除本地数据库中的相关记录。您也可以在邮箱服务提供商的账号安全页面撤销本应用的 OAuth 授权。
        </p>
      </section>

      <section class="grid gap-3">
        <h2 class="text-xl font-semibold">联系我们</h2>
        <p>
          如果您对本政策或数据处理方式有疑问，请联系本应用的部署和维护人员。
        </p>
      </section>

      <footer class="flex flex-wrap gap-3 border-t border-base-300 pt-4 text-sm">
        <NuxtLink class="link" to="/terms">服务条款</NuxtLink>
        <NuxtLink class="link" to="/login">登录</NuxtLink>
      </footer>
    </article>
  </main>
</template>
