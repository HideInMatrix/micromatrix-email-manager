<script setup lang="ts">
import { ListChecks, Plus, Trash2 } from 'lucide-vue-next'
import type {
  AutomationRule,
  AutomationRuleKind,
  MailProviderId,
  MailProviderSummary,
  RuleTextSource
} from '../../shared/types'

const props = defineProps<{
  providers: MailProviderSummary[]
  rules: AutomationRule[]
  busy: string
}>()

const emit = defineEmits<{
  save: [
    payload: {
      provider: MailProviderId
      kind: AutomationRuleKind
      name: string
      match: AutomationRule['match']
      action: AutomationRule['action']
      extraction?: AutomationRule['extraction']
    }
  ]
  toggle: [rule: AutomationRule]
  delete: [rule: AutomationRule]
}>()

const ruleForm = reactive({
  kind: 'display' as AutomationRuleKind,
  provider: 'gmail' as MailProviderId,
  name: '',
  from: '',
  subject: '',
  contains: '',
  hasLabel: '',
  markRead: true,
  archive: false,
  addLabel: '',
  extractSource: 'snippet' as RuleTextSource,
  extractPattern: '',
  extractFlags: '',
  extractGroupIndex: '1',
  extractFieldName: 'code'
})

const sourceOptions: Array<{
  value: RuleTextSource
  label: string
}> = [
  { value: 'snippet', label: '摘要 snippet' },
  { value: 'bodyText', label: '正文 text' },
  { value: 'subject', label: '主题 subject' },
  { value: 'from', label: '发件人 from' },
  { value: 'to', label: '收件人 to' },
  { value: 'all', label: '全部文本' }
]

const visibleRules = computed(() =>
  props.rules.filter((rule) => (rule.kind || 'display') === ruleForm.kind)
)

const groupedRules = computed(() => {
  const providerIds = new Set<MailProviderId>([
    ...props.providers.map((provider) => provider.id),
    ...visibleRules.value.map((rule) => rule.provider)
  ])

  return Array.from(providerIds).map((providerId) => ({
    providerId,
    providerName: providerName(providerId),
    rules: visibleRules.value.filter((rule) => rule.provider === providerId)
  }))
})

const canSaveRule = computed(() => {
  if (!ruleForm.name.trim()) {
    return false
  }

  return ruleForm.kind === 'display' || Boolean(ruleForm.extractPattern.trim())
})

watch(
  () => props.providers,
  (providers) => {
    const firstProvider = providers[0]

    if (
      firstProvider &&
      !providers.some((provider) => provider.id === ruleForm.provider)
    ) {
      ruleForm.provider = firstProvider.id
    }
  },
  { immediate: true }
)

function providerName(providerId: MailProviderId) {
  return (
    props.providers.find((provider) => provider.id === providerId)?.name
    || providerId
  )
}

function saveRule() {
  if (!canSaveRule.value) {
    return
  }

  const kind = ruleForm.kind

  emit('save', {
    kind,
    provider: ruleForm.provider,
    name: ruleForm.name,
    match: {
      from: ruleForm.from,
      subject: ruleForm.subject,
      contains: ruleForm.contains,
      hasLabel: ruleForm.hasLabel
    },
    action: {
      markRead: kind === 'display' && ruleForm.markRead,
      archive: kind === 'display' && ruleForm.archive,
      addLabel: kind === 'display' ? ruleForm.addLabel : ''
    },
    extraction: kind === 'api'
      ? {
          source: ruleForm.extractSource,
          pattern: ruleForm.extractPattern,
          flags: ruleForm.extractFlags,
          groupIndex: Number.parseInt(ruleForm.extractGroupIndex, 10),
          fieldName: ruleForm.extractFieldName || 'value'
        }
      : undefined
  })
  Object.assign(ruleForm, {
    kind,
    provider: ruleForm.provider,
    name: '',
    from: '',
    subject: '',
    contains: '',
    hasLabel: '',
    markRead: true,
    archive: false,
    addLabel: '',
    extractSource: 'snippet',
    extractPattern: '',
    extractFlags: '',
    extractGroupIndex: '1',
    extractFieldName: 'code'
  })
}
</script>

<template>
  <section class="card bg-base-200 shadow-sm">
    <div class="card-body gap-4 p-0">
      <div class="flex items-start justify-between gap-3 px-5 pt-5">
        <div>
          <h2 class="card-title">
            <ListChecks :size="18" />
            规则
          </h2>
          <p class="mt-1 text-sm text-base-content/60">为不同邮箱类型创建本地处理规则。</p>
        </div>
        <button
          class="btn btn-square btn-sm btn-outline"
          type="button"
          title="保存规则"
          :disabled="!canSaveRule"
          @click="saveRule"
        >
          <span v-if="busy === 'rule-save'" class="loading loading-spinner loading-xs" />
          <Plus v-else :size="17" />
        </button>
      </div>

      <div role="tablist" class="tabs tabs-box mx-5">
        <button
          class="tab"
          :class="{ 'tab-active': ruleForm.kind === 'display' }"
          type="button"
          role="tab"
          @click="ruleForm.kind = 'display'"
        >
          页面过滤
        </button>
        <button
          class="tab"
          :class="{ 'tab-active': ruleForm.kind === 'api' }"
          type="button"
          role="tab"
          @click="ruleForm.kind = 'api'"
        >
          接口提取
        </button>
      </div>

      <form class="grid gap-3 border-b border-base-300 px-5 pb-5" @submit.prevent="saveRule">
        <fieldset class="fieldset p-0">
          <legend class="fieldset-legend">邮箱类型</legend>
          <select v-model="ruleForm.provider" class="select select-bordered w-full">
            <option v-if="!providers.length" value="gmail">Gmail</option>
            <option
              v-for="provider in providers"
              :key="provider.id"
              :value="provider.id"
            >
              {{ provider.name }}
            </option>
          </select>
        </fieldset>

        <fieldset class="fieldset p-0">
          <legend class="fieldset-legend">匹配条件</legend>
          <InputField v-model="ruleForm.name" type="text" placeholder="规则名称" />
          <InputField v-model="ruleForm.from" type="text" placeholder="发件人包含" />
          <InputField v-model="ruleForm.subject" type="text" placeholder="主题包含" />
          <InputField v-model="ruleForm.contains" type="text" placeholder="正文包含" />
          <InputField v-model="ruleForm.hasLabel" type="text" placeholder="标签包含" />
        </fieldset>

        <fieldset v-if="ruleForm.kind === 'display'" class="fieldset p-0">
          <legend class="fieldset-legend">执行动作</legend>
          <div class="flex flex-wrap gap-4">
            <label class="label cursor-pointer justify-start gap-2 p-0">
              <input v-model="ruleForm.markRead" class="checkbox checkbox-primary checkbox-sm" type="checkbox">
              标记已读
            </label>
            <label class="label cursor-pointer justify-start gap-2 p-0">
              <input v-model="ruleForm.archive" class="checkbox checkbox-primary checkbox-sm" type="checkbox">
              归档
            </label>
          </div>
          <InputField v-model="ruleForm.addLabel" type="text" placeholder="添加本地标签" />
        </fieldset>

        <fieldset v-else class="fieldset p-0">
          <legend class="fieldset-legend">接口提取</legend>
          <select v-model="ruleForm.extractSource" class="select select-bordered w-full">
            <option
              v-for="source in sourceOptions"
              :key="source.value"
              :value="source.value"
            >
              {{ source.label }}
            </option>
          </select>
          <InputField
            v-model="ruleForm.extractPattern"
            type="text"
            placeholder="提取正则，例如 \\b(\\d{6})\\b"
          />
          <div class="grid gap-3 md:grid-cols-[1fr_7rem_6rem]">
            <InputField v-model="ruleForm.extractFieldName" type="text" placeholder="返回字段名，例如 code" />
            <InputField v-model="ruleForm.extractGroupIndex" type="number" min="0" step="1" placeholder="分组" />
            <InputField v-model="ruleForm.extractFlags" type="text" placeholder="flags" />
          </div>
        </fieldset>
      </form>

      <div v-if="visibleRules.length" class="grid gap-3 px-5 pb-5">
        <section
          v-for="group in groupedRules"
          v-show="group.rules.length"
          :key="group.providerId"
          class="grid gap-2 rounded-box border border-base-300 bg-base-100 p-3"
        >
          <div class="flex items-center justify-between gap-3">
            <h3 class="font-semibold">{{ group.providerName }}</h3>
            <span class="badge badge-outline">{{ group.rules.length }} 条规则</span>
          </div>

          <div v-for="rule in group.rules" :key="rule.id" class="join w-full">
            <button
              class="btn join-item min-h-12 flex-1 justify-start"
              type="button"
              @click="emit('toggle', rule)"
            >
              <input
                class="toggle toggle-primary toggle-sm pointer-events-none"
                type="checkbox"
                :checked="rule.enabled"
                readonly
              >
              <span class="min-w-0 text-left">
                <strong class="block truncate text-sm">{{ rule.name }}</strong>
                <small v-if="rule.kind === 'api'" class="block truncate text-xs text-base-content/60">
                  {{ rule.extraction?.fieldName || 'value' }} ← {{ rule.extraction?.source || 'snippet' }}
                </small>
                <small v-else class="block truncate text-xs text-base-content/60">{{ rule.matchCount }} 次匹配</small>
              </span>
            </button>
            <button
              class="btn btn-square join-item text-error"
              type="button"
              title="删除规则"
              @click="emit('delete', rule)"
            >
              <Trash2 :size="15" />
            </button>
          </div>
        </section>
      </div>

      <div v-else class="flex min-h-32 items-center justify-center gap-2 p-6 text-base-content/60">
        <ListChecks :size="22" />
        <span>暂无规则</span>
      </div>
    </div>
  </section>
</template>
