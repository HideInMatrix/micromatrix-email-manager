<script setup lang="ts">
const props = withDefaults(defineProps<{
  size?: 'xs' | 'sm' | 'md' | 'lg'
  zebra?: boolean
  pinRows?: boolean
  wrapperClass?: string
  tableClass?: string
}>(), {
  wrapperClass: 'overflow-x-auto',
  tableClass: ''
})

const tableClasses = computed(() => [
  'table',
  props.size ? `table-${props.size}` : '',
  props.zebra ? 'table-zebra' : '',
  props.pinRows ? 'table-pin-rows' : '',
  props.tableClass
])
</script>

<template>
  <div :class="wrapperClass">
    <table :class="tableClasses">
      <slot />
    </table>
  </div>
</template>
