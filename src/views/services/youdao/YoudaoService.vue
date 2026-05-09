<template>
  <service-base v-bind="$props" :translated="translation" :loading="loading" @translate="translate" @play-tts="playTTS">
    <template #view>
      <div class="youdao-result">
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
            <div class="phonetics" v-if="dictResult.phonetics.length > 0">
              <div v-for="p in dictResult.phonetics" :key="p.type" class="phonetic">
                <a-typography-text type="secondary" :style="{fontSize: '12px'}">
                  {{ p.type === 'us' ? '美' : p.type === 'uk' ? '英' : '发音' }}
                </a-typography-text>
                <a-typography-text type="secondary"
                                   :style="{fontSize: '12px'}">
                  {{ p.value }}
                </a-typography-text>
                <div class="icon-btn" @click="play(p.speech, p.type)">
                  <span class="theme-icon" v-html="speakerSvg"></span>
                </div>
              </div>
            </div>

            <div class="pos-translations" v-if="dictResult.posTranslations.length > 0">
              <div v-for="(pt, idx) in dictResult.posTranslations" :key="idx" class="pos-item">
                <!--                <a-tag v-if="pt.pos" color="blue" :style="{fontSize: '11px'}">-->
                <!--                  {{ pt.pos }}-->
                <!--                </a-tag>-->
                <div v-if="pt.pos" class="pos-text" @click="switchInputText(pt.pos)">{{ pt.pos }}</div>
                <a-typography-text :style="{fontSize: '13px'}">
                  {{ pt.translations.join('; ') }}
                </a-typography-text>
              </div>
            </div>

            <div class="similar" v-if="dictResult.similar.length > 0">
              <a-typography-text type="secondary" :style="{fontSize: '12px'}" v-for="(t, idx) in dictResult.similar">
                {{ t.pos }}: <span class="pos-text" @click="switchInputText(t.translations)">{{ t.translations }}</span>
              </a-typography-text>
            </div>

            <div class="web-translations" v-if="dictResult.webTranslations.length > 0">
              <a-divider :style="{margin: '4px 0', borderColor: 'var(--color-border-secondary)'}"/>
              <div v-for="(wt, idx) in dictResult.webTranslations.slice(0, 3)" :key="idx" class="web-item">
                <a-typography-text strong :style="{fontSize: '12px'}">
                  {{ wt.key }}
                </a-typography-text>
                <a-typography-text type="secondary" :style="{fontSize: '12px'}">
                  {{ wt.value }}
                </a-typography-text>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </service-base>
</template>

<script setup>
import {ref, inject, nextTick} from 'vue'
import ServiceBase from '../ServiceBase.vue'
import {fetchWebTranslate, fetchDictQuery} from './youdao-api.js'
import {playYoudaoTTS} from '@/utils/tts.js'
import {isDictSupported} from './youdao-lang.js'
import speakerRaw from "@/assets/services/speaker.svg?raw";

function processSvg(raw) {
  return raw
      .replace(/fill="[^"]*"/g, 'fill="currentColor"')
      .replace(/width="[^"]*"/, 'width="16"')
      .replace(/height="[^"]*"/, 'height="16"');
}

const speakerSvg = processSvg(speakerRaw);

const props = defineProps({
  type: {type: String, required: true},
  id: {type: String, required: true},
  serviceId: {type: String, default: ''},
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

  // 取消上一次请求
  abortController?.abort()
  abortController = new AbortController()
  const {signal} = abortController

  loading.value = true
  error.value = ''
  translation.value = ''
  dictResult.value = null

  try {
    const tasks = [
      fetchWebTranslate(input, sourceLang, targetLang, signal).catch(err => {
        if (signal.aborted) return null
        console.error('[YoudaoService] webtranslate error:', err)
        return null
      }),
      isDictSupported(sourceLang, targetLang)
          ? fetchDictQuery(input, sourceLang, targetLang, signal).catch(err => {
            if (signal.aborted) return null
            console.error('[YoudaoService] dict error:', err)
            return null
          })
          : Promise.resolve(null),
    ]

    const [transResult, dict] = await Promise.all(tasks)

    if (signal.aborted) return

    translation.value = transResult || ''
    dictResult.value = dict

    // 两个都失败才报错
    if (!transResult && !dict) {
      error.value = '翻译失败，请重试'
    }
  } catch (err) {
    if (signal.aborted) return
    console.error('[YoudaoService] translate error:', err)
    error.value = err.message || '翻译失败，请重试'
  } finally {
    if (!signal.aborted) {
      loading.value = false
    }
  }
}

const playTTS = async () => {
  await playYoudaoTTS(translation.value, props.targetLang)
}

const play = async (speech, type) => {
  if (!speech) {
    await playYoudaoTTS(props.input, props.sourceLang)
    return
  }
  const playType = new URLSearchParams(speech).get('type')
  const input = speech.split('&')[0]
  if (['us', 'uk'].includes(type)) {
    await playYoudaoTTS(input, 'en', playType)
  } else {
    await playYoudaoTTS(input, props.sourceLang)
  }
}

const setInputText = inject('setInputText')

const switchInputText = (text) => {
  translation.value = ''
  dictResult.value = null
  loading.value = true
  setInputText(text)
}
</script>

<style scoped>
.youdao-result {
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

.dict-section {
  margin-top: 8px;
}

.phonetics {
  display: flex;
  flex-direction: column;
  margin-bottom: 8px;
}

.phonetic {
  display: flex;
  gap: 4px;
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

.pos-text:hover {
  background-color: var(--color-hover);
}

.similar {
  display: flex;
  flex-direction: column;
  margin-top: 4px;
}

.web-translations {
  margin-top: 4px;
}

.web-item {
  display: flex;
  gap: 8px;
  margin-bottom: 2px;
}

.icon-btn {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  color: var(--color-text-secondary);
  cursor: pointer;
}

.icon-btn:hover {
  background-color: var(--color-hover);
}

.theme-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  color: inherit;
}
</style>
