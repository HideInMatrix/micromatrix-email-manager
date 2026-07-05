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
  <div class="alert" :class="type">
    <AlertTriangle v-if="type === 'error'" :size="17" />
    <CheckCircle2 v-else :size="17" />
    {{ message }}
    <button class="ghost-icon" type="button" title="关闭" @click="emit('close')">
      <X :size="15" />
    </button>
  </div>
</template>
