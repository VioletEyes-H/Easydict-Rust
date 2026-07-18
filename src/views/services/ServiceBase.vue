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
import {watch, inject} from "vue";
import speakerRaw from "@/assets/services/speaker.svg?raw";
import copyRaw from "@/assets/services/copy.svg?raw";
import {useTranslateStore} from "@/stores/translate";
import {storeToRefs} from "pinia";

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
  loading: {type: Boolean, default: false}
})

const emit = defineEmits(['translate', 'play-tts'])

const translateStore = useTranslateStore();
const {isExpanded} = storeToRefs(translateStore);
const onServiceComplete = inject('onServiceComplete', null)

watch(() => props.loading, (newVal, oldVal) => {
  if (oldVal === true && newVal === false && onServiceComplete) {
    onServiceComplete(props.id)
  }
})

// 语言变化时不再自动翻译，只通过 isExpanded（回车键触发展开）触发
watch(isExpanded, (expanded) => {
  if (expanded && props.type === 'view' && props.input) {
    translate()
  }
})

const translate = () => {
  emit('translate', {
    input: props.input,
    sourceLang: props.sourceLang,
    targetLang: props.targetLang
  })
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
