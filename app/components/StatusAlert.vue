<script setup lang="ts">
import { AlertTriangle, CheckCircle2, X } from 'lucide-vue-next'

defineProps<{
  type: 'error' | 'success'
  message: string
}>()

const emit = defineEmits<{
  close: []
}>()
</script>

<template>
  <div
    class="alert rounded-lg"
    :class="type === 'error' ? 'alert-error' : 'alert-success'"
  >
    <AlertTriangle v-if="type === 'error'" :size="17" />
    <CheckCircle2 v-else :size="17" />
    <span class="min-w-0 flex-1">{{ message }}</span>
    <button class="btn btn-ghost btn-xs btn-square" type="button" title="关闭" @click="emit('close')">
      <X :size="15" />
    </button>
  </div>
</template>
