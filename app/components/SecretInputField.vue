<script setup lang="ts">
import { Eye, EyeOff } from 'lucide-vue-next'

defineOptions({
  inheritAttrs: false
})

const model = defineModel<string>({ default: '' })
const attrs = useAttrs()
const visible = ref(false)

const props = withDefaults(defineProps<{
  label?: string
  placeholder?: string
  autocomplete?: string
  disabled?: boolean
  readonly?: boolean
  inputSize?: 'xs' | 'sm' | 'md' | 'lg'
  fieldClass?: string
  revealLabel?: string
  hideLabel?: string
}>(), {
  placeholder: '',
  autocomplete: 'current-password',
  inputSize: 'md',
  fieldClass: '',
  revealLabel: '显示内容',
  hideLabel: '隐藏内容'
})

const inputSizeClass = computed(() =>
  props.inputSize === 'md' ? '' : `input-${props.inputSize}`
)

const toggleTitle = computed(() =>
  visible.value ? props.hideLabel : props.revealLabel
)
</script>

<template>
  <fieldset v-if="label" class="fieldset p-0">
    <legend class="fieldset-legend py-1">
      <span>{{ label }}</span>
      <slot name="legend" />
    </legend>
    <div
      class="input input-bordered w-full"
      :class="[inputSizeClass, fieldClass]"
    >
      <input
        v-bind="attrs"
        v-model="model"
        class="min-w-0 grow"
        :type="visible ? 'text' : 'password'"
        :placeholder="placeholder"
        :autocomplete="autocomplete"
        :disabled="disabled"
        :readonly="readonly"
      >
      <button
        class="btn btn-ghost btn-xs btn-square -mr-2"
        type="button"
        :title="toggleTitle"
        :aria-label="toggleTitle"
        :disabled="disabled"
        @click="visible = !visible"
      >
        <EyeOff v-if="visible" :size="15" />
        <Eye v-else :size="15" />
      </button>
    </div>
  </fieldset>

  <div
    v-else
    class="input input-bordered w-full"
    :class="[inputSizeClass, fieldClass]"
  >
    <input
      v-bind="attrs"
      v-model="model"
      class="min-w-0 grow"
      :type="visible ? 'text' : 'password'"
      :placeholder="placeholder"
      :autocomplete="autocomplete"
      :disabled="disabled"
      :readonly="readonly"
    >
    <button
      class="btn btn-ghost btn-xs btn-square -mr-2"
      type="button"
      :title="toggleTitle"
      :aria-label="toggleTitle"
      :disabled="disabled"
      @click="visible = !visible"
    >
      <EyeOff v-if="visible" :size="15" />
      <Eye v-else :size="15" />
    </button>
  </div>
</template>
