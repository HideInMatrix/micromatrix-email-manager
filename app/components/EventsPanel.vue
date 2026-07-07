<script setup lang="ts">
import { Activity } from 'lucide-vue-next'
import type { AppEvent } from '../../shared/types'
import { formatDate } from '../utils/format'

defineProps<{
  events: AppEvent[]
}>()
</script>

<template>
  <section class="card bg-base-200 shadow-sm">
    <div class="card-body gap-4 p-0">
      <div class="px-5 pt-5">
        <h2 class="card-title">
          <Activity :size="18" />
          事件
        </h2>
      </div>

      <DaisyTable v-if="events.length" zebra pin-rows>
        <thead>
          <tr>
            <th>类型</th>
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
    </div>
  </section>
</template>
