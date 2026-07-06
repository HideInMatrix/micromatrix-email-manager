<script setup lang="ts">
const props = withDefaults(defineProps<{
  variant?: 'shell' | 'login' | 'rail'
}>(), {
  variant: 'shell'
})

const variantClass = computed(() => ({
  shell: 'bg-[linear-gradient(to_right,rgba(37,99,235,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(37,99,235,0.08)_1px,transparent_1px)] bg-[size:32px_32px]',
  login: 'bg-[radial-gradient(circle_at_20%_20%,rgba(20,184,166,0.12),transparent_28%),linear-gradient(to_right,rgba(37,99,235,0.08)_1px,transparent_1px)] bg-[size:auto,28px_28px]',
  rail: 'bg-[linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:100%_28px]'
})[props.variant])
</script>

<template>
  <div class="pointer-events-none absolute inset-0 hidden opacity-40 md:block" :class="variantClass" aria-hidden="true" />
</template>
