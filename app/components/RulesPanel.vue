<script setup lang="ts">
import { Plus, Trash2 } from 'lucide-vue-next'
import type { AutomationRule } from '../../shared/types'

defineProps<{
  rules: AutomationRule[]
  busy: string
}>()

const emit = defineEmits<{
  save: [
    payload: {
      name: string
      match: AutomationRule['match']
      action: AutomationRule['action']
    }
  ]
  toggle: [rule: AutomationRule]
  delete: [rule: AutomationRule]
}>()

const ruleForm = reactive({
  name: '',
  from: '',
  subject: '',
  contains: '',
  hasLabel: '',
  markRead: true,
  archive: false,
  addLabel: ''
})

function saveRule() {
  emit('save', {
    name: ruleForm.name,
    match: {
      from: ruleForm.from,
      subject: ruleForm.subject,
      contains: ruleForm.contains,
      hasLabel: ruleForm.hasLabel
    },
    action: {
      markRead: ruleForm.markRead,
      archive: ruleForm.archive,
      addLabel: ruleForm.addLabel
    }
  })
  Object.assign(ruleForm, {
    name: '',
    from: '',
    subject: '',
    contains: '',
    hasLabel: '',
    markRead: true,
    archive: false,
    addLabel: ''
  })
}
</script>

<template>
  <section class="panel rule-panel">
    <div class="panel-head">
      <h2>规则</h2>
      <button
        class="icon-button"
        type="button"
        title="保存规则"
        :disabled="!ruleForm.name"
        @click="saveRule"
      >
        <Plus :class="{ spin: busy === 'rule-save' }" :size="17" />
      </button>
    </div>

    <form class="rule-form" @submit.prevent="saveRule">
      <input v-model="ruleForm.name" type="text" placeholder="规则名称">
      <input v-model="ruleForm.from" type="text" placeholder="发件人包含">
      <input v-model="ruleForm.subject" type="text" placeholder="主题包含">
      <input v-model="ruleForm.contains" type="text" placeholder="正文包含">
      <input v-model="ruleForm.hasLabel" type="text" placeholder="标签包含">
      <div class="check-row">
        <label>
          <input v-model="ruleForm.markRead" type="checkbox">
          标记已读
        </label>
        <label>
          <input v-model="ruleForm.archive" type="checkbox">
          归档
        </label>
      </div>
      <input v-model="ruleForm.addLabel" type="text" placeholder="添加本地标签">
    </form>

    <div class="rule-list">
      <div v-for="rule in rules" :key="rule.id" class="rule-item">
        <button type="button" @click="emit('toggle', rule)">
          <span class="switch" :class="{ on: rule.enabled }" />
          <span>
            <strong>{{ rule.name }}</strong>
            <small>{{ rule.matchCount }} 次匹配</small>
          </span>
        </button>
        <button
          class="icon-button danger"
          type="button"
          title="删除规则"
          @click="emit('delete', rule)"
        >
          <Trash2 :size="15" />
        </button>
      </div>
    </div>
  </section>
</template>
