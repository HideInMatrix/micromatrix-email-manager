<template>
  <div class="drawer min-h-screen bg-base-200 lg:drawer-open">
    <input id="app-drawer" type="checkbox" class="drawer-toggle" aria-label="切换导航">

    <div class="drawer-content min-h-screen bg-base-100 lg:m-2 lg:ms-0 lg:rounded-ss-[2rem] lg:border-s lg:border-t lg:border-base-300">
      <div class="grid gap-4 p-4 lg:p-10">
        <slot />
      </div>
    </div>

    <DashboardNav />
  </div>
</template>
