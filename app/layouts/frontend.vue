<template>
  <div class="min-h-screen bg-base-200">
    <div class="mx-auto min-h-screen max-w-[1680px] flex flex-col gap-4 bg-base-100 p-1 lg:p-6">
      <slot />
      <footer class="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-t border-base-300 pt-4 text-xs text-base-content/60">
        <NuxtLink class="link link-hover" to="/privacy">隐私权政策</NuxtLink>
        <NuxtLink class="link link-hover" to="/terms">服务条款</NuxtLink>
      </footer>
    </div>
  </div>
</template>
