<template>
  <div class="service-base">
    <div v-if="type === 'config'" class="config-mode">
      <slot name="config">
        <a-empty description="没有可供配置的选项"/>
      </slot>
    </div>
    <div v-else class="view-mode">
      <slot name="view"/>
      <div class="input-actions">
        <div class="icon-btn" @click="playTTS">
          <span class="theme-icon" v-html="speakerSvg"></span>
        </div>
        <div class="icon-btn" @click="copy">
          <span class="theme-icon" v-html="copySvg"></span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import {watch} from "vue";
import speakerRaw from "@/assets/speaker.svg?raw";
import copyRaw from "@/assets/copy.svg?raw";
import {useTranslateStore, ServiceStatus} from "@/stores/translate";

function processSvg(raw) {
  return raw
      .replace(/fill="[^"]*"/g, 'fill="currentColor"')
      .replace(/width="[^"]*"/, 'width="16"')
      .replace(/height="[^"]*"/, 'height="16"');
}

const speakerSvg = processSvg(speakerRaw);
const copySvg = processSvg(copyRaw);

const props = defineProps({
  type: {type: String, required: true},
  id: {type: String, required: true},
  config: {type: Object, default: () => ({})},
  input: {type: String, default: ''},
  sourceLang: {type: String, default: 'auto'},
  targetLang: {type: String, default: 'zh'},
  translated: {type: String},
})

const emit = defineEmits(['translate', 'play-tts'])

const translateStore = useTranslateStore();

// 状态机驱动：本服务状态为 1（翻译中）且输入变化时开始翻译。
// 同时监听 props.input：翻译进行中再次回车时状态是 1→1，靠输入变化重新触发。
watch(() => [translateStore.serviceStatus[props.id], props.input], () => {
  if (translateStore.serviceStatus[props.id] === ServiceStatus.LOADING
      && props.type === 'view' && props.input) {
    runTranslate()
  }
})

// 发起翻译并等待子组件完成：emit 参数里携带 signal 与 done 回调。
// 子组件用 signal 取消请求；执行完（成功/失败/被 abort/超时）后调用 e.done()，await 在此处返回。
let callSeq = 0
let currentAbortController = null
const TRANSLATE_TIMEOUT_MS = 30000

async function runTranslate() {
  const mySeq = ++callSeq
  currentAbortController?.abort()
  currentAbortController = new AbortController()
  const {signal} = currentAbortController

  let timer = null
  await new Promise(resolve => {
    timer = setTimeout(() => {
      console.warn(`[ServiceBase:${props.id}] translate timeout`)
      currentAbortController?.abort()
      resolve()
    }, TRANSLATE_TIMEOUT_MS)
    emit('translate', {
      input: props.input,
      sourceLang: props.sourceLang,
      targetLang: props.targetLang,
      signal,
      done: () => {
        clearTimeout(timer)
        resolve()
      },
    })
  })
  if (timer) clearTimeout(timer)
  currentAbortController = null
  if (mySeq !== callSeq) return // 被新一轮顶替的旧请求，丢弃
  // 用户手动折叠会把状态置为 COLLAPSED，此时不应再弹开面板
  if (translateStore.serviceStatus[props.id] === ServiceStatus.LOADING) {
    translateStore.setServiceStatus(props.id, ServiceStatus.DONE)
  }
}

const copy = () => {
  navigator.clipboard.writeText(props.translated)
}

async function playTTS() {
  emit('play-tts')
}
</script>

<style scoped>
.view-mode {
  display: flex;
  flex-direction: column;
  gap: 8px;
  -webkit-user-select: text;
  user-select: text;
}

.service-base {
  width: 100%;
}

.config-mode {
  padding: 16px;
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

.input-actions {
  display: flex;
  gap: 8px;
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
