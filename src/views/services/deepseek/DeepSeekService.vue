<template>
  <service-base v-bind="$props" :translated="translation" :loading="loading" @translate="translate" @play-tts="playTTS">
    <template #config>
      <div class="deepseek-config">
        <a-card size="small" :bordered="true" :style="{borderRadius: '8px'}">
          <div class="form-rows">
            <div class="form-row">
              <span class="form-label">API Key</span>
              <a-input-password v-model:value="form.apiKey" placeholder="请输入 API Key" @change="save"/>
            </div>
            <div class="form-row">
              <span class="form-label">模型</span>
              <a-select v-model:value="form.model" :options="modelOptions" :style="{width: '100%'}" @change="save"/>
            </div>
          </div>
        </a-card>

        <div class="config-footer">
          <div class="verify-info">
            <a-typography-text v-if="verifyResult" :type="verifyResult.success ? 'success' : 'danger'" :style="{fontSize: '13px'}">
              <CheckCircleOutlined v-if="verifyResult.success"/>
              <CloseCircleOutlined v-else/>
              {{ verifyResult.message }}
            </a-typography-text>
          </div>
          <a-button type="primary" size="small" :loading="verifying" :disabled="!form.apiKey" @click="verify">
            <template #icon>
              <CheckCircleOutlined v-if="!verifying"/>
            </template>
            验证配置
          </a-button>
        </div>

        <div class="config-hint">
          <a-typography-link href="https://platform.deepseek.com" target="_blank">
            <LinkOutlined/> DeepSeek Platform
          </a-typography-link>
        </div>
      </div>
    </template>

    <template #view>
      <div class="deepseek-result">
        <div v-if="error" class="error">
          <a-typography-text type="danger" :style="{fontSize: '13px'}">
            {{ error }}
          </a-typography-text>
        </div>

        <div v-else-if="!form.apiKey" class="placeholder">
          <a-typography-text type="secondary" :style="{fontSize: '13px'}">
            请先配置 API Key
          </a-typography-text>
        </div>

        <div v-else-if="translation" class="result-content">
          <div class="main-translation">
            <a-typography-text strong :style="{fontSize: '16px', whiteSpace: 'pre-wrap'}">
              {{ translation }}
            </a-typography-text>
          </div>
        </div>
      </div>
    </template>
  </service-base>
</template>

<script setup>
import {ref, reactive, watch, computed} from 'vue'
import {CheckCircleOutlined, CloseCircleOutlined, LinkOutlined} from '@ant-design/icons-vue'
import ServiceBase from '../ServiceBase.vue'
import {useServicesStore} from '@/stores/services.js'
import {fetchDeepSeekTranslate} from './deepseek-api.js'
import {fallbackSystemTTS} from '@/utils/tts.js'

const props = defineProps({
  type: {type: String, required: true},
  id: {type: String, required: true},
  config: {type: Object, default: () => ({})},
  input: {type: String, default: ''},
  sourceLang: {type: String, default: 'auto'},
  targetLang: {type: String, default: 'zh'},
})

const servicesStore = useServicesStore()

const translation = ref('')
const loading = ref(false)
const error = ref('')
const verifying = ref(false)
const verifyResult = ref(null)

let abortController = null

const models = [
  {value: 'deepseek-chat', label: 'DeepSeek Chat'},
  {value: 'deepseek-reasoner', label: 'DeepSeek Reasoner'},
]

const modelOptions = computed(() => models)

const form = reactive({
  apiKey: props.config.apiKey || '',
  model: props.config.model || 'deepseek-chat',
})

watch(() => props.config, (newConfig) => {
  form.apiKey = newConfig.apiKey || ''
  form.model = newConfig.model || 'deepseek-chat'
}, {immediate: true})

function save() {
  servicesStore.set(props.id, {
    config: {
      ...props.config,
      apiKey: form.apiKey,
      model: form.model,
    }
  })
}

async function verify() {
  verifying.value = true
  verifyResult.value = null

  try {
    await fetchDeepSeekTranslate('hello', 'en', 'zh', form.apiKey, form.model)
    verifyResult.value = {success: true, message: '验证成功，配置正确'}
  } catch (err) {
    verifyResult.value = {success: false, message: err.message || '验证失败'}
  } finally {
    verifying.value = false
  }
}

async function translate(e) {
  const {input, sourceLang, targetLang} = e

  if (!input.trim()) {
    translation.value = ''
    error.value = ''
    return
  }

  if (!form.apiKey) {
    translation.value = ''
    error.value = ''
    loading.value = true
    loading.value = false
    return
  }

  abortController?.abort()
  abortController = new AbortController()
  const {signal} = abortController

  loading.value = true
  error.value = ''
  translation.value = ''

  try {
    const result = await fetchDeepSeekTranslate(input, sourceLang, targetLang, form.apiKey, form.model, signal)

    if (signal.aborted) return

    translation.value = result
  } catch (err) {
    if (signal.aborted || err.name === 'AbortError') return
    console.error('[DeepSeekService] translate error:', err)
    error.value = err.message || '翻译失败，请重试'
  } finally {
    if (!signal.aborted) {
      loading.value = false
    }
  }
}

function playTTS() {
  fallbackSystemTTS(translation.value, props.targetLang)
}
</script>

<style scoped>
.deepseek-config {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 8px 0;
}

.form-rows {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.form-label {
  flex-shrink: 0;
  width: 60px;
  text-align: right;
  font-size: 14px;
  color: var(--color-text);
}

.form-row .ant-input,
.form-row .ant-input-password,
.form-row .ant-select {
  flex: 1;
}

.config-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.verify-info {
  flex: 1;
}

.config-hint {
  text-align: right;
  font-size: 12px;
}

.deepseek-result {
  min-height: 40px;
}

.error {
  padding: 4px 0;
}

.placeholder {
  color: var(--color-text-tertiary);
  font-size: 13px;
  text-align: center;
  padding: 8px 0;
}

.main-translation {
  display: flex;
  align-items: flex-start;
  gap: 4px;
}
</style>
