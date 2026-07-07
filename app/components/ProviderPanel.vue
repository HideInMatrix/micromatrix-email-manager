<script setup lang="ts">
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Radio,
  Save,
  Settings
} from 'lucide-vue-next'
import type {
  AppStatus,
  MailProviderId,
  MailProviderSummary,
  PublicMailAccount,
  PublicMailProviderConfig,
  RevealedProviderSecret
} from '../../shared/types'

const props = defineProps<{
  providers: MailProviderSummary[]
  accounts: PublicMailAccount[]
  providerConfigs: PublicMailProviderConfig[]
  status?: AppStatus
  busy: string
}>()

const emit = defineEmits<{
  saveConfig: [
    payload: {
      provider: MailProviderId
      clientId: string
      clientSecret?: string
      pubsubTopic?: string
      tenantId?: string
    }
  ]
}>()

interface ProviderConfigForm {
  clientId: string
  clientSecret: string
  pubsubTopic: string
  tenantId: string
}

const selectedProviderId = ref<MailProviderId>('gmail')
const revealedSecrets = reactive<Partial<Record<MailProviderId, string>>>({})
const revealingSecrets = reactive<Partial<Record<MailProviderId, boolean>>>({})
const secretErrors = reactive<Partial<Record<MailProviderId, string>>>({})
const forms = reactive<Record<MailProviderId, ProviderConfigForm>>({
  gmail: createProviderConfigForm(),
  outlook: createProviderConfigForm()
})

const selectedProvider = computed(() =>
  props.providers.find((provider) => provider.id === selectedProviderId.value)
    || props.providers[0]
)

const savedProviderEntries = computed(() =>
  props.providers
    .map((provider) => ({
      provider,
      config: publicConfig(provider.id)
    }))
    .filter(({ config }) => hasSavedConfig(config))
)

const selectedProviderHasAccounts = computed(() =>
  Boolean(
    selectedProvider.value &&
      props.accounts.some(
        (account) => account.provider === selectedProvider.value?.id
      )
  )
)

const setupSteps = computed(() => [
  {
    label: '选择邮箱类型',
    complete: Boolean(selectedProvider.value)
  },
  {
    label: '填写 OAuth 配置',
    complete: Boolean(selectedProvider.value?.configured)
  },
  {
    label: '账号页连接邮箱',
    complete: selectedProviderHasAccounts.value
  }
])

watch(
  () => props.providers,
  (providers) => {
    const firstProvider = providers[0]

    if (
      firstProvider &&
      !providers.some((provider) => provider.id === selectedProviderId.value)
    ) {
      selectedProviderId.value = firstProvider.id
    }
  },
  { immediate: true }
)

watch(
  () => [props.providers, props.providerConfigs] as const,
  () => {
    for (const provider of props.providers) {
      const config = publicConfig(provider.id)
      forms[provider.id] = {
        clientId: config?.clientId || '',
        clientSecret: '',
        pubsubTopic: config?.pubsubTopic || '',
        tenantId: config?.tenantId || ''
      }
    }
  },
  { immediate: true }
)

function createProviderConfigForm(): ProviderConfigForm {
  return {
    clientId: '',
    clientSecret: '',
    pubsubTopic: '',
    tenantId: ''
  }
}

function publicConfig(providerId: MailProviderId) {
  return props.providerConfigs.find((item) => item.provider === providerId)
}

function hasSavedConfig(config?: PublicMailProviderConfig) {
  return Boolean(
    config?.updatedAt ||
      config?.clientId ||
      config?.clientSecretSet ||
      config?.pubsubTopic
  )
}

function saveSelectedProviderConfig() {
  const provider = selectedProvider.value

  if (!provider) {
    return
  }

  const form = forms[provider.id]

  hideSavedClientSecret(provider.id)

  emit('saveConfig', {
    provider: provider.id,
    clientId: form.clientId,
    clientSecret: form.clientSecret.trim() || undefined,
    pubsubTopic: form.pubsubTopic,
    tenantId: form.tenantId
  })
}

function hideSavedClientSecret(providerId: MailProviderId) {
  delete revealedSecrets[providerId]
  delete secretErrors[providerId]
}

async function toggleSavedClientSecret(providerId: MailProviderId) {
  if (revealedSecrets[providerId]) {
    hideSavedClientSecret(providerId)
    return
  }

  revealingSecrets[providerId] = true
  delete secretErrors[providerId]

  try {
    const result = await $fetch<RevealedProviderSecret>(
      `/api/provider-configs/${providerId}/secret`
    )

    if (result.clientSecretSet && result.clientSecret) {
      revealedSecrets[providerId] = result.clientSecret
      return
    }

    secretErrors[providerId] = '未保存 Client Secret'
  } catch (caught) {
    secretErrors[providerId] =
      caught instanceof Error ? caught.message : '读取 Client Secret 失败'
  } finally {
    revealingSecrets[providerId] = false
  }
}

function capabilityClass(active: boolean) {
  return active ? 'badge-primary' : 'badge-outline'
}
</script>

<template>
  <section class="card bg-base-200 shadow-sm">
    <div class="card-body gap-5 p-5">
      <div class="flex items-start justify-between gap-3">
        <div>
          <h2 class="card-title">
            <Settings :size="18" />
            OAuth 配置
          </h2>
          <p class="mt-1 text-sm text-base-content/60">
            先创建邮箱类型，再保存对应 OAuth Client。
          </p>
        </div>
      </div>

      <ul class="steps steps-horizontal w-full">
        <li
          v-for="step in setupSteps"
          :key="step.label"
          class="step"
          :class="{ 'step-primary': step.complete }"
        >
          {{ step.label }}
        </li>
      </ul>

      <form
        v-if="selectedProvider"
        class="grid gap-4 rounded-box border border-base-300 bg-base-100 p-4"
        @submit.prevent="saveSelectedProviderConfig"
      >
        <fieldset class="fieldset p-0">
          <legend class="fieldset-legend">邮箱类型</legend>
          <select v-model="selectedProviderId" class="select select-bordered w-full">
            <option
              v-for="provider in providers"
              :key="provider.id"
              :value="provider.id"
            >
              {{ provider.name }}
            </option>
          </select>
        </fieldset>

        <div class="flex flex-wrap gap-2">
          <span class="badge h-7 gap-1" :class="capabilityClass(selectedProvider.capabilities.oauth)">
            <KeyRound :size="14" />
            OAuth
          </span>
          <span class="badge h-7 gap-1" :class="capabilityClass(selectedProvider.capabilities.sync)">
            <CheckCircle2 :size="14" />
            Sync
          </span>
          <span class="badge h-7 gap-1" :class="capabilityClass(selectedProvider.capabilities.watch)">
            <Radio :size="14" />
            Watch
          </span>
        </div>

        <div class="rounded-box border border-dashed border-primary/30 bg-primary/5 p-3 font-mono text-xs text-primary break-all">
          {{ selectedProvider.redirectUri }}
        </div>

        <fieldset
          v-for="field in selectedProvider.configFields"
          :key="field.key"
          class="fieldset p-0"
        >
          <legend class="fieldset-legend py-1">
            {{ field.label }}
            <small
              v-if="field.secret && publicConfig(selectedProvider.id)?.clientSecretSet"
              class="text-success"
            >
              已保存
            </small>
          </legend>
          <InputField
            v-if="field.key === 'clientId'"
            v-model="forms[selectedProvider.id].clientId"
            type="text"
            :placeholder="field.placeholder"
            autocomplete="off"
          />
          <SecretInputField
            v-else-if="field.key === 'clientSecret'"
            v-model="forms[selectedProvider.id].clientSecret"
            :placeholder="field.placeholder"
            autocomplete="new-password"
            reveal-label="显示 Client Secret"
            hide-label="隐藏 Client Secret"
          />
          <InputField
            v-else-if="field.key === 'pubsubTopic'"
            v-model="forms[selectedProvider.id].pubsubTopic"
            type="text"
            :placeholder="field.placeholder"
            autocomplete="off"
          />
          <InputField
            v-else-if="field.key === 'tenantId'"
            v-model="forms[selectedProvider.id].tenantId"
            type="text"
            :placeholder="field.placeholder"
            autocomplete="off"
          />
        </fieldset>

        <button
          class="btn btn-primary w-full"
          type="submit"
          :disabled="busy === `provider-config-${selectedProvider.id}`"
        >
          <span v-if="busy === `provider-config-${selectedProvider.id}`" class="loading loading-spinner loading-xs" />
          <Save v-else :size="15" />
          保存 {{ selectedProvider.name }} 配置
        </button>
      </form>

      <div class="divider my-0">已创建配置</div>

      <div v-if="savedProviderEntries.length" class="grid gap-3">
        <article
          v-for="{ provider, config } in savedProviderEntries"
          :key="provider.id"
          class="rounded-box border border-base-300 bg-base-100 p-4"
        >
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="min-w-0">
              <h3 class="truncate font-semibold">{{ provider.name }}</h3>
              <p class="mt-1 truncate text-sm text-base-content/60">{{ provider.description }}</p>
            </div>
            <span class="badge badge-sm" :class="provider.configured ? 'badge-success' : 'badge-warning'">
              {{ provider.configured ? '可连接' : '未完成' }}
            </span>
          </div>

          <div class="mt-3 overflow-x-auto">
            <table class="table table-sm">
              <tbody>
                <tr>
                  <td>Client ID</td>
                  <td class="max-w-0 truncate font-mono">{{ config?.clientId || '未填写' }}</td>
                </tr>
                <tr>
                  <td>Client Secret</td>
                  <td>
                    <div class="flex min-w-0 flex-wrap items-center gap-2">
                      <code
                        v-if="revealedSecrets[provider.id]"
                        class="max-w-full break-all rounded bg-base-200 px-2 py-1 font-mono text-xs text-base-content"
                      >
                        {{ revealedSecrets[provider.id] }}
                      </code>
                      <span
                        v-else
                        class="badge badge-sm"
                        :class="config?.clientSecretSet ? 'badge-success' : 'badge-warning'"
                      >
                        {{ config?.clientSecretSet ? '已保存' : '未保存' }}
                      </span>
                      <button
                        v-if="config?.clientSecretSet"
                        class="btn btn-ghost btn-xs btn-square"
                        type="button"
                        :title="revealedSecrets[provider.id] ? '隐藏 Client Secret' : '查看 Client Secret'"
                        :aria-label="revealedSecrets[provider.id] ? '隐藏 Client Secret' : '查看 Client Secret'"
                        :disabled="Boolean(revealingSecrets[provider.id])"
                        @click="toggleSavedClientSecret(provider.id)"
                      >
                        <span
                          v-if="revealingSecrets[provider.id]"
                          class="loading loading-spinner loading-xs"
                        />
                        <EyeOff v-else-if="revealedSecrets[provider.id]" :size="14" />
                        <Eye v-else :size="14" />
                      </button>
                    </div>
                    <small
                      v-if="secretErrors[provider.id]"
                      class="mt-1 block text-error"
                    >
                      {{ secretErrors[provider.id] }}
                    </small>
                  </td>
                </tr>
                <tr v-if="provider.id === 'gmail'">
                  <td>Pub/Sub Topic</td>
                  <td class="max-w-0 truncate font-mono">{{ config?.pubsubTopic || '未配置' }}</td>
                </tr>
                <tr v-if="provider.id === 'outlook'">
                  <td>Tenant ID</td>
                  <td class="max-w-0 truncate font-mono">{{ config?.tenantId || 'common' }}</td>
                </tr>
                <tr>
                  <td>Redirect URI</td>
                  <td class="max-w-0 truncate font-mono">{{ provider.redirectUri }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </article>
      </div>

      <div v-else class="alert alert-info">
        <KeyRound :size="18" />
        <span>还没有创建 OAuth 配置，请先选择邮箱类型并保存。</span>
      </div>

      <div class="flex items-center justify-between gap-3 rounded-box border border-base-300 bg-base-100 p-3">
        <span class="text-sm text-base-content/70">Token 加密</span>
        <span
          class="badge h-8 gap-1"
          :class="status?.configured.encryption ? 'badge-success' : 'badge-warning'"
        >
          <CheckCircle2 v-if="status?.configured.encryption" :size="15" />
          <AlertTriangle v-else :size="15" />
          {{ status?.configured.encryption ? '强密钥' : '开发密钥' }}
        </span>
      </div>
    </div>
  </section>
</template>
