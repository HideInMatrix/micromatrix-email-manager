<script setup lang="ts">
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Save,
  Settings2,
  Trash2
} from 'lucide-vue-next'
import type { AppEvent } from '../../shared/types'
import { formatDate } from '../utils/format'

const props = withDefaults(defineProps<{
  events: AppEvent[]
  page?: number
  pageSize?: number
  total?: number
  totalPages?: number
  clearCronInput?: string
  busy?: string
  manageable?: boolean
}>(), {
  page: 1,
  pageSize: 25,
  total: 0,
  totalPages: 1,
  clearCronInput: '',
  busy: '',
  manageable: false
})

const emit = defineEmits<{
  pageChange: [page: number]
  clear: []
  saveSettings: []
  'update:clearCronInput': [value: string]
}>()

const clearCronInputModel = computed({
  get: () => props.clearCronInput,
  set: (value: string) => emit('update:clearCronInput', value)
})

const safeTotalPages = computed(() => Math.max(1, props.totalPages))
const rangeStart = computed(() => props.total ? (props.page - 1) * props.pageSize + 1 : 0)
const rangeEnd = computed(() => Math.min(props.total, props.page * props.pageSize))
const canGoPrevious = computed(() => props.page > 1 && props.busy !== 'events-load')
const canGoNext = computed(() => props.page < safeTotalPages.value && props.busy !== 'events-load')
</script>

<template>
  <section class="card bg-base-200 shadow-sm">
    <div class="card-body gap-4 p-0">
      <div class="flex flex-col gap-4 px-5 pt-5 xl:flex-row xl:items-start xl:justify-between">
        <div class="min-w-0">
          <h2 class="card-title">
            <Activity :size="18" />
            运行事件
          </h2>
          <p v-if="manageable" class="mt-1 text-sm text-base-content/60">
            共 {{ total }} 条，当前显示 {{ rangeStart }}-{{ rangeEnd }}。
          </p>
        </div>

        <div v-if="manageable" class="flex flex-col gap-3 sm:flex-row sm:items-start">
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <InputField
                v-model="clearCronInputModel"
                field-class="w-52"
                input-size="sm"
                type="text"
                placeholder="0 3 * * *"
              >
                <template #prefix>
                  <Settings2 :size="14" class="text-base-content/50" />
                </template>
              </InputField>
              <button
                class="btn btn-primary btn-sm max-sm:btn-square"
                type="button"
                title="保存清理周期"
                :disabled="Boolean(busy)"
                @click="emit('saveSettings')"
              >
                <span v-if="busy === 'events-settings'" class="loading loading-spinner loading-xs" />
                <Save v-else :size="15" />
                <span class="max-sm:hidden">保存</span>
              </button>
            </div>
            <p class="mt-1 text-xs text-base-content/60">留空表示不自动清空日志</p>
          </div>

          <button
            class="btn btn-error btn-sm max-sm:btn-square"
            type="button"
            title="清空日志"
            :disabled="Boolean(busy) || total === 0"
            @click="emit('clear')"
          >
            <span v-if="busy === 'events-clear'" class="loading loading-spinner loading-xs" />
            <Trash2 v-else :size="15" />
            <span class="max-sm:hidden">清空</span>
          </button>
        </div>
      </div>

      <DaisyTable v-if="events.length" zebra pin-rows>
        <thead>
          <tr>
            <th class="w-px min-w-[6.25rem] whitespace-nowrap">类型</th>
            <th>消息</th>
            <th class="w-px min-w-[6.25rem] whitespace-nowrap">时间</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="eventItem in events" :key="eventItem.id">
            <td><span class="badge badge-outline badge-sm uppercase">{{ eventItem.type }}</span></td>
            <td class="max-w-0 truncate">{{ eventItem.message }}</td>
            <td class="w-px min-w-[6.25rem] whitespace-nowrap font-mono text-xs text-base-content/60">{{ formatDate(eventItem.createdAt) }}</td>
          </tr>
        </tbody>
      </DaisyTable>

      <div v-else class="flex min-h-32 items-center justify-center gap-2 p-6 text-base-content/60">
        <Activity :size="22" />
        <span>暂无事件</span>
      </div>

      <div
        v-if="manageable"
        class="flex flex-col gap-3 px-5 pb-5 sm:flex-row sm:items-center sm:justify-between"
      >
        <p class="text-sm text-base-content/60">
          第 {{ page }} / {{ safeTotalPages }} 页
        </p>
        <div class="join">
          <button
            class="btn btn-sm join-item"
            type="button"
            title="上一页"
            :disabled="!canGoPrevious"
            @click="emit('pageChange', page - 1)"
          >
            <ChevronLeft :size="16" />
          </button>
          <button class="btn btn-sm join-item pointer-events-none" type="button">
            {{ pageSize }} 条/页
          </button>
          <button
            class="btn btn-sm join-item"
            type="button"
            title="下一页"
            :disabled="!canGoNext"
            @click="emit('pageChange', page + 1)"
          >
            <ChevronRight :size="16" />
          </button>
        </div>
      </div>
    </div>
  </section>
</template>
