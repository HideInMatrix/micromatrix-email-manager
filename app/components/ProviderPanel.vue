<script setup lang="ts">
import {
  AlertTriangle,
  CheckCircle2,
  Plug,
  Radio,
  Save,
  Settings
} from 'lucide-vue-next'
import type {
  AppStatus,
  MailProviderId,
  MailProviderSummary,
  PublicMailProviderConfig
} from '../../shared/types'

const props = defineProps<{
  providers: MailProviderSummary[]
  providerConfigs: PublicMailProviderConfig[]
  status?: AppStatus
  busy: string
}>()

const emit = defineEmits<{
  connect: [provider: MailProviderSummary]
  saveConfig: [
    payload: {
      provider: MailProviderId
      clientId: string
      clientSecret?: string
      pubsubTopic?: string
    }
  ]
}>()

const forms = reactive<
  Record<
    string,
    {
      clientId: string
      clientSecret: string
      pubsubTopic: string
    }
  >
>({})

watch(
  () => [props.providers, props.providerConfigs] as const,
  () => {
    for (const provider of props.providers) {
      const config = props.providerConfigs.find((item) => item.provider === provider.id)
      forms[provider.id] = {
        clientId: config?.clientId || '',
        clientSecret: '',
        pubsubTopic: config?.pubsubTopic || ''
      }
    }
  },
  { immediate: true }
)

function publicConfig(providerId: MailProviderId) {
  return props.providerConfigs.find((item) => item.provider === providerId)
}

function saveProviderConfig(provider: MailProviderSummary) {
  const form = forms[provider.id]

  emit('saveConfig', {
    provider: provider.id,
    clientId: form.clientId,
    clientSecret: form.clientSecret.trim() || undefined,
    pubsubTopic: form.pubsubTopic
  })
}
</script>

<template>
  <section class="panel">
    <div class="panel-head">
      <h2>配置</h2>
      <Settings :size="17" />
    </div>

    <div class="provider-list">
      <div v-for="provider in providers" :key="provider.id" class="provider-item">
        <div class="provider-main">
          <span class="provider-mark" :class="{ enabled: provider.enabled }">
            {{ provider.name.slice(0, 1) }}
          </span>
          <span>
            <strong>{{ provider.name }}</strong>
            <small>{{ provider.description }}</small>
          </span>
          <span class="status-badge" :class="provider.configured ? 'connected' : 'error'">
            {{ provider.configured ? '已配置' : '待配置' }}
          </span>
        </div>

        <div class="capability-row">
          <span :class="{ active: provider.capabilities.oauth }">
            <Plug :size="14" />
            OAuth
          </span>
          <span :class="{ active: provider.capabilities.sync }">
            <CheckCircle2 :size="14" />
            Sync
          </span>
          <span :class="{ active: provider.capabilities.watch }">
            <Radio :size="14" />
            Watch
          </span>
        </div>

        <div class="redirect-uri">{{ provider.redirectUri }}</div>

        <form
          v-if="forms[provider.id]"
          class="provider-config-form"
          @submit.prevent="saveProviderConfig(provider)"
        >
          <label
            v-for="field in provider.configFields"
            :key="field.key"
            class="provider-config-field"
          >
            <span>
              {{ field.label }}
              <small v-if="field.secret && publicConfig(provider.id)?.clientSecretSet">
                已保存
              </small>
            </span>
            <input
              v-if="field.key === 'clientId'"
              v-model="forms[provider.id].clientId"
              type="text"
              :placeholder="field.placeholder"
              autocomplete="off"
            >
            <input
              v-else-if="field.key === 'clientSecret'"
              v-model="forms[provider.id].clientSecret"
              type="password"
              :placeholder="field.placeholder"
              autocomplete="new-password"
            >
            <input
              v-else-if="field.key === 'pubsubTopic'"
              v-model="forms[provider.id].pubsubTopic"
              type="text"
              :placeholder="field.placeholder"
              autocomplete="off"
            >
          </label>

          <button
            class="button secondary provider-connect"
            type="submit"
            :disabled="busy === `provider-config-${provider.id}`"
          >
            <Save
              :class="{ spin: busy === `provider-config-${provider.id}` }"
              :size="15"
            />
            保存 {{ provider.name }} 配置
          </button>
        </form>

        <button
          class="button secondary provider-connect"
          type="button"
          :disabled="!provider.enabled || !provider.configured || !provider.capabilities.oauth"
          @click="emit('connect', provider)"
        >
          <Plug :size="15" />
          连接 {{ provider.name }}
        </button>
      </div>

      <div class="config-row encryption-row">
        <span class="config-label">Token 加密</span>
        <span class="config-value" :class="{ ok: status?.configured.encryption }">
          <CheckCircle2 v-if="status?.configured.encryption" :size="15" />
          <AlertTriangle v-else :size="15" />
          {{ status?.configured.encryption ? '强密钥' : '开发密钥' }}
        </span>
      </div>
    </div>
  </section>
</template>
