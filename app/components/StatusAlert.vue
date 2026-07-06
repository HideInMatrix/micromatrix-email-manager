<script setup lang="ts">
import { X } from 'lucide-vue-next'

const props = withDefaults(defineProps<{
  type: 'error' | 'success'
  message: string
  duration?: number
}>(), {
  duration: 4500
})

let closeTimer: ReturnType<typeof setTimeout> | undefined

const emit = defineEmits<{
  close: []
}>()

const alertClass = computed(() =>
  props.type === 'error' ? 'alert-error' : 'alert-success'
)

function clearAutoClose() {
  if (closeTimer) {
    clearTimeout(closeTimer)
    closeTimer = undefined
  }
}

function startAutoClose() {
  clearAutoClose()

  if (props.duration <= 0) {
    return
  }

  closeTimer = setTimeout(() => {
    emit('close')
  }, props.duration)
}

onMounted(startAutoClose)
onBeforeUnmount(clearAutoClose)

watch(
  () => [props.type, props.message, props.duration] as const,
  startAutoClose
)
</script>

<template>
  <Teleport to="body">
    <div class="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4 sm:top-6">
      <div
        role="alert"
        class="alert pointer-events-auto w-full max-w-xl shadow-lg"
        :class="alertClass"
      >
        <span class="min-w-0 flex-1">{{ message }}</span>
        <button
          class="btn btn-ghost btn-xs btn-square"
          type="button"
          title="关闭"
          @click="emit('close')"
        >
          <X :size="15" />
        </button>
      </div>
    </div>
  </Teleport>
</template>
