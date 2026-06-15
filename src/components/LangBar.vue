<template>
  <div class="lang-bar">
    <div style="flex: 1;text-align: center">
      <lang-select style="width: 160px" :language="sourceLang" :auto="detectedLang || 'auto'"
                   :container="props.container" @change="onSourceChange"/>
    </div>
    <div class="icon-btn" @click="onSwap">
      <SwapOutlined/>
    </div>
    <div style="flex: 1;text-align: center">
      <lang-select style="width: 160px" :language="targetLang" :auto="autoTargetLang"
                   :container="props.container" @change="onTargetChange" auto-text="自动选择"/>
    </div>
  </div>
</template>

<script setup>
import {computed, watch, ref} from "vue";
import {SwapOutlined} from "@ant-design/icons-vue";
import LangSelect from "./LangSelect.vue";
import {useGeneralSettingsStore} from "@/stores/generalSettings";
import {detectLanguage} from "@/utils/langDetect.js";

const props = defineProps({
  input: {type: String, default: ""},
  container: {type: Object, default: () => document.body},
});

const emit = defineEmits(['change']);

const generalSettings = useGeneralSettingsStore();

const sourceLang = ref('auto');
const targetLang = ref('auto');
const detectedLang = ref(null);

const autoTargetLang = computed(() => {
  if (targetLang.value !== 'auto') return targetLang.value;
  const effectiveSource = sourceLang.value === 'auto' ? detectedLang.value : sourceLang.value;
  return generalSettings.getAutoTargetLang(effectiveSource);
});

const resolveLangs = () => {
  const source = sourceLang.value !== 'auto' ? sourceLang.value : (detectedLang.value || 'auto');
  const target = targetLang.value !== 'auto' ? targetLang.value : generalSettings.getAutoTargetLang(source);
  return {source, target};
};

let lastEmittedSource = null;
let lastEmittedTarget = null;

const emitResolvedChange = () => {
  const {source, target} = resolveLangs();
  if (source !== lastEmittedSource || target !== lastEmittedTarget) {
    lastEmittedSource = source;
    lastEmittedTarget = target;
    emit('change', {
      sourceLang: source,
      targetLang: target,
      detectedLang: detectedLang.value,
    });
  }
};

watch(() => props.input, (text) => {
  detectedLang.value = detectLanguage(text);
  emitResolvedChange();
}, {immediate: true});

const onSwap = () => {
  const temp = sourceLang.value;
  sourceLang.value = targetLang.value;
  targetLang.value = temp;
  emitResolvedChange();
};

const onSourceChange = (lang) => {
  sourceLang.value = lang;
  if (lang === 'auto') {
    targetLang.value = 'auto';
  } else if (targetLang.value === 'auto') {
    targetLang.value = generalSettings.getAutoTargetLang(lang);
  }
  emitResolvedChange();
};

const onTargetChange = (lang) => {
  if (lang === 'auto' && sourceLang.value !== 'auto') {
    targetLang.value = generalSettings.getAutoTargetLang(sourceLang.value);
  } else {
    targetLang.value = lang;
  }
  emitResolvedChange();
};
</script>

<style scoped>
.lang-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 2px;
  background-color: var(--color-bg-secondary);
  border-radius: 10px;
}

.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  cursor: pointer;
  transition: background-color 0.2s;
}

.icon-btn:hover {
  background-color: var(--color-hover);
}
</style>
