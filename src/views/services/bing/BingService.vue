<template>
  <service-base v-bind="$props" :translated="translation" :loading="loading" @translate="translate" @play-tts="playTTS">
    <template #view>
      <div class="bing-result">
        <div v-if="error" class="error">
          <a-typography-text type="danger" :style="{fontSize: '13px'}">
            {{ error }}
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
import {ref} from 'vue'
import ServiceBase from '../ServiceBase.vue'
import {fetchBingTranslate} from './bing-api.js'
import {playBingTTS} from '@/utils/tts.js'

const props = defineProps({
  type: {type: String, required: true},
  id: {type: String, required: true},
  config: {type: Object, default: () => ({})},
  input: {type: String, default: ''},
  sourceLang: {type: String, default: 'auto'},
  targetLang: {type: String, default: 'zh'},
})

const translation = ref('')
const loading = ref(false)
const error = ref('')

let abortController = null

async function translate(e) {
  const {input, sourceLang, targetLang} = e
  if (!input.trim()) {
    translation.value = ''
    error.value = ''
    return
  }

  abortController?.abort()
  abortController = new AbortController()
  const {signal} = abortController

  loading.value = true
  error.value = ''
  translation.value = ''

  try {
    const result = await fetchBingTranslate(input, sourceLang, targetLang, signal)

    if (signal.aborted) return

    translation.value = result
  } catch (err) {
    if (signal.aborted || err.name === 'AbortError') return
    console.error('[BingService] translate error:', err)
    error.value = err.message || '翻译失败，请重试'
  } finally {
    if (!signal.aborted) {
      loading.value = false
    }
  }
}

const playTTS = async () => {
  if (!translation.value) return
  await playBingTTS(translation.value, props.targetLang)
}
</script>

<style scoped>
.bing-result {
  min-height: 40px;
}

.error {
  padding: 4px 0;
}

.main-translation {
  display: flex;
  align-items: flex-start;
  gap: 4px;
}
</style>
