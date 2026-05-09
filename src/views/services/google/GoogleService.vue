<template>
  <service-base v-bind="$props" :translated="translation" :loading="loading" @translate="translate" @play-tts="playTTS">
    <template #view>
      <div class="google-result">
        <div v-if="error" class="error">
          <a-typography-text type="danger" :style="{fontSize: '13px'}">
            {{ error }}
          </a-typography-text>
        </div>

        <div v-else class="result-content">
          <div class="main-translation">
            <a-typography-text strong :style="{fontSize: '16px'}">
              {{ translation }}
            </a-typography-text>
          </div>

          <div v-if="dictResult" class="dict-section">
            <div class="pos-translations" v-if="dictResult.posTranslations.length > 0">
              <div v-for="(pt, idx) in dictResult.posTranslations" :key="idx" class="pos-item">
                <div v-if="pt.pos" class="pos-text">{{ pt.pos }}</div>
                <a-typography-text :style="{fontSize: '13px'}">
                  {{ pt.translations.join('; ') }}
                </a-typography-text>
              </div>
            </div>

            <div class="similar" v-if="dictResult.similar.length > 0">
              <a-typography-text type="secondary" :style="{fontSize: '12px'}" v-for="(t, idx) in dictResult.similar" :key="idx">
                {{ t.pos }}: {{ t.translations }}
              </a-typography-text>
            </div>
          </div>
        </div>
      </div>
    </template>
  </service-base>
</template>

<script setup>
import {ref} from 'vue'
import ServiceBase from '../ServiceBase.vue'
import {fetchGoogleTranslate, fetchGoogleDictQuery} from './google-api.js'
import {playGoogleTTS} from '@/utils/tts.js'

const props = defineProps({
  type: {type: String, required: true},
  id: {type: String, required: true},
  config: {type: Object, default: () => ({})},
  input: {type: String, default: ''},
  sourceLang: {type: String, default: 'auto'},
  targetLang: {type: String, default: 'zh'},
})

const translation = ref('')
const dictResult = ref(null)
const loading = ref(false)
const error = ref('')

let abortController = null

async function translate(e) {
  const {input, sourceLang, targetLang} = e
  if (!input.trim()) {
    translation.value = ''
    dictResult.value = null
    error.value = ''
    return
  }

  abortController?.abort()
  abortController = new AbortController()
  const {signal} = abortController

  loading.value = true
  error.value = ''
  translation.value = ''
  dictResult.value = null

  try {
    const isSingleWord = input.trim().split(/\s+/).length === 1

    const tasks = [
      fetchGoogleTranslate(input, sourceLang, targetLang, signal).catch(err => {
        if (signal.aborted) return null
        console.error('[GoogleService] translate error:', err)
        return null
      }),
      isSingleWord
        ? fetchGoogleDictQuery(input, sourceLang, targetLang, signal).catch(err => {
          if (signal.aborted) return null
          console.error('[GoogleService] dict error:', err)
          return null
        })
        : Promise.resolve(null),
    ]

    const [transResult, dict] = await Promise.all(tasks)

    if (signal.aborted) return

    translation.value = transResult || ''
    dictResult.value = dict

    if (!transResult && !dict) {
      error.value = '翻译失败，请重试'
    }
  } catch (err) {
    if (signal.aborted) return
    console.error('[GoogleService] translate error:', err)
    error.value = err.message || '翻译失败，请重试'
  } finally {
    if (!signal.aborted) {
      loading.value = false
    }
  }
}

const playTTS = async () => {
  if (!translation.value) return
  await playGoogleTTS(translation.value, props.targetLang)
}
</script>

<style scoped>
.google-result {
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

.dict-section {
  margin-top: 8px;
}

.pos-translations {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.pos-item {
  display: flex;
  align-items: start;
  gap: 4px;
}

.pos-text {
  color: #177df7;
  font-size: 12px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 4px;
  cursor: default;
}

.similar {
  display: flex;
  flex-direction: column;
  margin-top: 4px;
}
</style>
