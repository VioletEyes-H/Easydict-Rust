<template>
  <service-base v-bind="$props" :translated="translation" :loading="loading" @translate="translate" @play-tts="playTTS">
    <template #config>
      <div class="llm-config">
        <a-card size="small" :bordered="true" :style="{borderRadius: '8px'}">
          <div class="form-rows">
            <div class="form-row">
              <span class="form-label">服务名称</span>
              <a-input v-model:value="form.name" placeholder="输入服务名称" @change="save"/>
            </div>
            <div class="form-row">
              <span class="form-label">API 地址</span>
              <a-input v-model:value="form.endpoint" placeholder="https://api.openai.com/v1/chat/completions" @change="save"/>
            </div>
            <div class="form-row">
              <span class="form-label">API Key</span>
              <a-input-password v-model:value="form.apiKey" placeholder="请输入 API Key" @change="save"/>
            </div>
            <div class="form-row">
              <span class="form-label">模型</span>
              <a-input v-model:value="form.model" placeholder="gpt-4o-mini" @change="save"/>
            </div>
            <div class="form-row">
              <span class="form-label">温度</span>
              <a-input-number v-model:value="form.temperature" :min="0" :max="2" :step="0.1" :style="{width: '100%'}" @change="save"/>
            </div>
            <div class="form-row">
              <span class="form-label">Max Tokens</span>
              <a-input-number v-model:value="form.maxTokens" :min="1" :step="1" :style="{width: '100%'}" @change="save"/>
            </div>
            <div class="form-row">
              <span class="form-label">自动翻译</span>
              <a-switch v-model:checked="panelChecked"/>
            </div>
            <div class="form-row form-row-vertical">
              <div class="prompt-header">
                <span class="form-label">系统提示词</span>
              </div>
              <a-textarea v-model:value="form.systemPrompt" :rows="4" placeholder="留空将使用默认提示词" @change="save"/>
            </div>
            <div class="form-row form-row-vertical">
              <div class="prompt-header">
                <span class="form-label">用户提示词</span>
              </div>
              <a-textarea v-model:value="form.userPrompt" :rows="4" placeholder="留空将使用默认提示词" @change="save"/>
            </div>
            <div class="config-hint">
              <a-typography-text type="secondary" style="font-size: 12px">
                <span v-pre>支持 {{sourceLang}}、{{targetLang}}、{{inputText}} 等占位符</span>
              </a-typography-text>
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


      </div>
    </template>

    <template #view>
      <div class="llm-result">
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
import {CheckCircleOutlined, CloseCircleOutlined} from '@ant-design/icons-vue'
import ServiceBase from '../ServiceBase.vue'
import {useServicesStore} from '@/stores/services.js'
import {useTranslateStore} from '@/stores/translate.js'
import {storeToRefs} from 'pinia'
import {fetchLLMTranslate} from './llm-api.js'
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
const translateStore = useTranslateStore()
const {detectedLang} = storeToRefs(translateStore)

const panel = computed(() => servicesStore.get(props.id).panel !== false)

const translation = ref('')
const loading = ref(false)
const error = ref('')
const verifying = ref(false)
const verifyResult = ref(null)

let abortController = null

const defaultValues = {
  name: '自定义 LLM',
  icon: '🤖',
  color: '#1677ff',
  apiKey: '',
  endpoint: 'https://api.openai.com/v1/chat/completions',
  model: 'gpt-4o-mini',
  systemPrompt: '',
  userPrompt: '',
  temperature: 0.3,
  maxTokens: 4096,
}

const form = reactive({...defaultValues})

watch(() => props.config, (newConfig) => {
  form.name = newConfig.name || defaultValues.name
  form.icon = newConfig.icon || defaultValues.icon
  form.color = newConfig.color || defaultValues.color
  form.apiKey = newConfig.apiKey || defaultValues.apiKey
  form.endpoint = newConfig.endpoint || defaultValues.endpoint
  form.model = newConfig.model || defaultValues.model
  form.systemPrompt = newConfig.systemPrompt || defaultValues.systemPrompt
  form.userPrompt = newConfig.userPrompt || defaultValues.userPrompt
  form.temperature = Number.isFinite(newConfig.temperature) ? newConfig.temperature : defaultValues.temperature
  form.maxTokens = Number.isFinite(newConfig.maxTokens) ? newConfig.maxTokens : defaultValues.maxTokens
}, {immediate: true})

function save() {
  servicesStore.set(props.id, {
    config: {
      ...props.config,
      name: form.name,
      icon: form.icon,
      color: form.color,
      apiKey: form.apiKey,
      endpoint: form.endpoint,
      model: form.model,
      systemPrompt: form.systemPrompt,
      userPrompt: form.userPrompt,
      temperature: form.temperature,
      maxTokens: form.maxTokens,
    }
  })
}

function savePanel(value) {
  servicesStore.set(props.id, {panel: value})
}

const panelChecked = computed({
  get: () => panel.value,
  set: (value) => savePanel(value)
})

async function verify() {
  verifying.value = true
  verifyResult.value = null

  try {
    await fetchLLMTranslate('hello', 'en', 'zh', null, buildAPIConfig(), null)
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

  loading.value = true

  if (!form.apiKey) {
    translation.value = ''
    error.value = ''
    loading.value = false
    return
  }

  abortController?.abort()
  abortController = new AbortController()
  const {signal} = abortController

  error.value = ''
  translation.value = ''

  try {
    const result = await fetchLLMTranslate(
      input, sourceLang, targetLang, detectedLang.value,
      buildAPIConfig(), signal
    )

    if (signal.aborted) return

    translation.value = result
  } catch (err) {
    if (signal.aborted || err.name === 'AbortError') return
    console.error('[LLMService] translate error:', err)
    error.value = err.message || '翻译失败，请重试'
  } finally {
    if (!signal.aborted) {
      loading.value = false
    }
  }
}

function buildAPIConfig() {
  return {
    apiKey: form.apiKey,
    endpoint: form.endpoint,
    model: form.model,
    systemPrompt: form.systemPrompt,
    userPrompt: form.userPrompt,
    temperature: form.temperature,
    maxTokens: form.maxTokens,
  }
}

function playTTS() {
  fallbackSystemTTS(translation.value, props.targetLang)
}
</script>

<style scoped>
.llm-config {
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

.form-row-vertical {
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
}

.form-label {
  flex-shrink: 0;
  width: 100px;
  text-align: right;
  font-size: 14px;
  color: var(--color-text);
}

.form-row-vertical .form-label {
  text-align: left;
  width: auto;
}

.prompt-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.form-row .ant-input,
.form-row .ant-input-password,
.form-row .ant-input-number,
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
  text-align: left;
  font-size: 12px;
}

.llm-result {
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
