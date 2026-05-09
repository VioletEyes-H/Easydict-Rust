<template>
  <service-base v-bind="$props" :translated="translation" :loading="loading" @translate="translate" @play-tts="playTTS">
    <template #config>
      <div class="ali-config">
        <a-card size="small" :bordered="true" :style="{borderRadius: '8px'}">
          <div class="form-rows">
            <div class="form-row">
              <span class="form-label">AccessKeyId</span>
              <a-input v-model:value="form.accessKeyId" placeholder="请输入 AccessKeyId" @change="save"/>
            </div>
            <div class="form-row">
              <span class="form-label">Secret</span>
              <a-input-password v-model:value="form.accessKeySecret" placeholder="请输入 AccessKeySecret" @change="save"/>
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
          <a-button type="primary" size="small" :loading="verifying" :disabled="!isConfigured" @click="verify">
            <template #icon>
              <CheckCircleOutlined v-if="!verifying"/>
            </template>
            验证配置
          </a-button>
        </div>

        <div class="config-hint">
          <a-typography-link href="https://www.aliyun.com/product/ai/alimt" target="_blank">
            <LinkOutlined/> 阿里云机器翻译
          </a-typography-link>
        </div>
      </div>
    </template>

    <template #view>
      <div class="ali-result">
        <div v-if="error" class="error">
          <a-typography-text type="danger" :style="{fontSize: '13px'}">
            {{ error }}
          </a-typography-text>
        </div>

        <div v-else-if="!isConfigured" class="placeholder">
          <a-typography-text type="secondary" :style="{fontSize: '13px'}">
            请先配置 AccessKeyId 和 AccessKeySecret
          </a-typography-text>
        </div>

        <div v-else-if="translation" class="result-content">
          <div class="main-translation">
            <a-typography-text strong :style="{fontSize: '16px'}">
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
import {fetchAliTranslate} from './ali-api.js'
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

const form = reactive({
  accessKeyId: props.config.accessKeyId || '',
  accessKeySecret: props.config.accessKeySecret || '',
})

const isConfigured = computed(() => form.accessKeyId && form.accessKeySecret)

watch(() => props.config, (newConfig) => {
  form.accessKeyId = newConfig.accessKeyId || ''
  form.accessKeySecret = newConfig.accessKeySecret || ''
}, {immediate: true})

function save() {
  servicesStore.set(props.id, {
    config: {
      ...props.config,
      accessKeyId: form.accessKeyId,
      accessKeySecret: form.accessKeySecret,
    }
  })
}

async function verify() {
  verifying.value = true
  verifyResult.value = null

  try {
    await fetchAliTranslate('hello', 'en', 'zh', form.accessKeyId, form.accessKeySecret)
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

  if (!isConfigured.value) {
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
    const result = await fetchAliTranslate(
      input,
      sourceLang,
      targetLang,
      form.accessKeyId,
      form.accessKeySecret,
      signal
    )

    if (signal.aborted) return

    translation.value = result
  } catch (err) {
    if (signal.aborted || err.name === 'AbortError') return
    console.error('[AliService] translate error:', err)
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
.ali-config {
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
  width: 95px;
  text-align: right;
  font-size: 14px;
  color: var(--color-text);
}

.form-row .ant-input,
.form-row .ant-input-password {
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

.ali-result {
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
