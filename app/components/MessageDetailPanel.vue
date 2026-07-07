<script setup lang="ts">
import { Archive, Inbox, MailOpen, Tag, Trash2 } from 'lucide-vue-next'
import type { AutomationRule, MailMessage } from '../../shared/types'
import { formatDate } from '../utils/format'

const props = defineProps<{
  message?: MailMessage
  rules: AutomationRule[]
  busy: string
}>()

const emit = defineEmits<{
  trash: [message: MailMessage]
}>()

const message = toRef(props, 'message')
const rules = toRef(props, 'rules')

const canTrash = computed(() =>
  message.value ? ['gmail', 'outlook'].includes(message.value.provider) : false
)
const isTrashing = computed(() =>
  message.value
    ? props.busy === `trash-${message.value.accountId}-${message.value.id}`
    : false
)

const htmlBodyDocument = computed(() => {
  if (!message.value?.bodyHtml) {
    return ''
  }

  return `<!doctype html>
<html>
<head>
  <base target="_blank">
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    :root { color-scheme: light; }
    body {
      box-sizing: border-box;
      margin: 0;
      padding: 16px;
      color: #1f2937;
      background: #fff;
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 14px;
      line-height: 1.6;
      overflow-wrap: anywhere;
    }
    img, table, pre, blockquote {
      max-width: 100%;
    }
    img {
      height: auto;
    }
    table {
      border-collapse: collapse;
    }
    a {
      color: #2563eb;
    }
  </style>
</head>
<body>${message.value.bodyHtml}</body>
</html>`
})

const plainBody = computed(() =>
  message.value?.bodyText || message.value?.snippet || ''
)
</script>

<template>
  <section class="card sticky top-6 min-h-[26rem] bg-base-200 shadow-sm max-xl:static">
    <div class="card-body gap-4 p-0">
      <div class="flex min-h-[3.25rem] items-center justify-between gap-3 px-5 pt-5">
        <div>
          <h2 class="card-title">
            <Inbox :size="18" />
            详情
          </h2>
          <p v-if="message" class="mt-1 text-sm text-base-content/60">邮件操作</p>
        </div>
        <button
          v-if="message && canTrash"
          class="btn btn-square btn-sm btn-outline btn-error"
          type="button"
          title="移入垃圾箱"
          :disabled="isTrashing"
          @click="emit('trash', message)"
        >
          <span v-if="isTrashing" class="loading loading-spinner loading-xs" />
          <Trash2 v-else :size="15" />
        </button>
      </div>

      <template v-if="message">
        <div class="grid gap-4 px-5 pb-5">
          <h3 class="break-words text-lg font-bold">{{ message.subject }}</h3>
          <div class="overflow-x-auto">
            <table class="table table-sm">
              <tbody>
                <tr>
                  <td>Provider</td>
                  <td class="font-mono">{{ message.provider }}</td>
                </tr>
                <tr>
                  <td>From</td>
                  <td class="max-w-0 truncate font-mono">{{ message.from }}</td>
                </tr>
                <tr>
                  <td>To</td>
                  <td class="max-w-0 truncate font-mono">{{ message.to }}</td>
                </tr>
                <tr>
                  <td>Date</td>
                  <td class="font-mono">{{ formatDate(message.receivedAt) }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="flex flex-wrap gap-2">
            <span v-if="message.unread" class="badge badge-warning h-8 gap-1">
              <MailOpen :size="14" />
              未读
            </span>
            <span v-if="!message.labels.includes('INBOX')" class="badge badge-outline h-8 gap-1">
              <Archive :size="14" />
              已归档
            </span>
            <span
              v-for="ruleId in message.ruleMatches"
              :key="ruleId"
              class="badge badge-outline h-8 gap-1"
            >
              <Tag :size="14" />
              {{ rules.find((rule) => rule.id === ruleId)?.name || '规则' }}
            </span>
          </div>

          <div class="overflow-hidden rounded-box bg-base-100">
            <iframe
              v-if="htmlBodyDocument"
              class="h-[32rem] w-full bg-white"
              title="邮件正文"
              sandbox="allow-popups allow-popups-to-escape-sandbox"
              :srcdoc="htmlBodyDocument"
            />
            <pre
              v-else
              class="max-h-[32rem] overflow-auto whitespace-pre-wrap break-words p-4 font-sans text-sm leading-7 text-base-content/80"
            >{{ plainBody }}</pre>
          </div>
        </div>
      </template>

      <div v-else class="flex min-h-32 items-center justify-center gap-2 p-6 text-base-content/60">
        <Inbox :size="22" />
        <span>未选择邮件</span>
      </div>
    </div>
  </section>
</template>
