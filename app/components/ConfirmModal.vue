<script setup lang="ts">
import { AlertTriangle, X } from 'lucide-vue-next'

withDefaults(defineProps<{
  open: boolean
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  busy?: boolean
  danger?: boolean
}>(), {
  message: '',
  confirmLabel: '确认',
  cancelLabel: '取消',
  busy: false,
  danger: true
})

const emit = defineEmits<{
  close: []
  confirm: []
}>()
</script>

<template>
  <Teleport to="body">
    <dialog class="modal" :open="open" @cancel.prevent="emit('close')">
      <div class="modal-box max-w-md">
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-start gap-3">
            <span
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-box"
              :class="danger ? 'bg-error/10 text-error' : 'bg-primary/10 text-primary'"
            >
              <AlertTriangle :size="20" />
            </span>
            <div class="min-w-0">
              <h3 class="text-lg font-semibold leading-6">{{ title }}</h3>
              <p v-if="message" class="mt-2 whitespace-pre-line text-sm leading-6 text-base-content/70">
                {{ message }}
              </p>
            </div>
          </div>
          <button
            class="btn btn-ghost btn-sm btn-square"
            type="button"
            title="关闭"
            :disabled="busy"
            @click="emit('close')"
          >
            <X :size="16" />
          </button>
        </div>

        <div class="modal-action">
          <button class="btn" type="button" :disabled="busy" @click="emit('close')">
            {{ cancelLabel }}
          </button>
          <button
            class="btn"
            :class="danger ? 'btn-error' : 'btn-primary'"
            type="button"
            :disabled="busy"
            @click="emit('confirm')"
          >
            <span v-if="busy" class="loading loading-spinner loading-xs" />
            {{ confirmLabel }}
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button type="button" :disabled="busy" @click="emit('close')">关闭</button>
      </form>
    </dialog>
  </Teleport>
</template>
