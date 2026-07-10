<script setup lang="ts">
defineOptions({
  inheritAttrs: false
})

const model = defineModel<string>({ default: '' })
const attrs = useAttrs()

const props = withDefaults(defineProps<{
  label?: string
  type?: 'email' | 'number' | 'search' | 'tel' | 'text' | 'url'
  placeholder?: string
  autocomplete?: string
  disabled?: boolean
  readonly?: boolean
  fullWidth?: boolean
  inputSize?: 'xs' | 'sm' | 'md' | 'lg'
  fieldClass?: string
}>(), {
  type: 'text',
  placeholder: '',
  autocomplete: undefined,
  fullWidth: true,
  inputSize: 'md',
  fieldClass: ''
})

const inputSizeClass = computed(() =>
  props.inputSize === 'md' ? '' : `input-${props.inputSize}`
)
</script>

<template>
  <fieldset v-if="label" class="fieldset p-0">
    <legend class="fieldset-legend py-1">
      <span>{{ label }}</span>
      <slot name="legend" />
    </legend>
    <label
      class="input input-bordered"
      :class="[fullWidth ? 'w-full' : '', inputSizeClass, fieldClass]"
    >
      <slot name="prefix" />
      <input
        v-bind="attrs"
        v-model="model"
        class="min-w-0 grow"
        :type="type"
        :placeholder="placeholder"
        :autocomplete="autocomplete"
        :disabled="disabled"
        :readonly="readonly"
      >
      <slot name="suffix" />
    </label>
  </fieldset>

  <label
    v-else
    class="input input-bordered"
    :class="[fullWidth ? 'w-full' : '', inputSizeClass, fieldClass]"
  >
    <slot name="prefix" />
    <input
      v-bind="attrs"
      v-model="model"
      class="min-w-0 grow"
      :type="type"
      :placeholder="placeholder"
      :autocomplete="autocomplete"
      :disabled="disabled"
      :readonly="readonly"
    >
    <slot name="suffix" />
  </label>
</template>
