<script setup lang="ts">
const props = withDefaults(defineProps<{
  as?: keyof HTMLElementTagNameMap
  delay?: number
}>(), {
  as: 'div',
  delay: 0
})

const panelStyle = computed(() => ({
  transitionDelay: `${props.delay}ms`
}))
</script>

<template>
  <component :is="as" class="motion-safe:transition-opacity motion-safe:duration-200" :style="panelStyle">
    <slot />
  </component>
</template>
