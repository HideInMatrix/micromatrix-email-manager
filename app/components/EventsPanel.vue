<script setup lang="ts">
import type { AppEvent } from '../../shared/types'
import { formatDate } from '../utils/format'

defineProps<{
  events: AppEvent[]
}>()
</script>

<template>
  <section class="panel">
    <div class="panel-head">
      <h2>事件</h2>
    </div>

    <div class="event-list">
      <div v-for="eventItem in events" :key="eventItem.id">
        <strong>{{ eventItem.type }}</strong>
        <span>{{ eventItem.message }}</span>
        <time>{{ formatDate(eventItem.createdAt) }}</time>
      </div>
    </div>
  </section>
</template>
