<template>
  <div class="lang-bar">
    <div style="flex: 1;text-align: center">
      <lang-select style="width: 160px" :language="selectedSourceLang" :auto="detectedLang || 'auto'"
                   :container="props.container" @change="onSourceChange"/>
    </div>
    <div class="icon-btn" @click="onSwap">
      <SwapOutlined/>
    </div>
    <div style="flex: 1;text-align: center">
      <lang-select style="width: 160px" :language="selectedTargetLang" :auto="autoTargetLang"
                   :container="props.container" @change="onTargetChange" auto-text="自动选择"/>
    </div>
  </div>
</template>

<script setup>
import {computed, watch, ref} from "vue";
import {SwapOutlined} from "@ant-design/icons-vue";
import LangSelect from "./LangSelect.vue";
import {useGeneralSettingsStore} from "@/stores/generalSettings";
import {useTranslateStore} from "@/stores/translate";
import {detectLanguage} from "@/utils/langDetect.js";

const props = defineProps({
  input: {type: String, default: ""},
  container: {type: Object, default: () => document.body},
});

const generalSettings = useGeneralSettingsStore();
const translateStore = useTranslateStore();

const selectedSourceLang = ref('auto');
const selectedTargetLang = ref('auto');
const detectedLang = ref(null);

const autoTargetLang = computed(() => {
  if (selectedTargetLang.value !== 'auto') return selectedTargetLang.value;
  const effectiveSource = selectedSourceLang.value === 'auto' ? detectedLang.value : selectedSourceLang.value;
  return generalSettings.getAutoTargetLang(effectiveSource);
});

const resolveLangs = () => {
  const source = selectedSourceLang.value !== 'auto' ? selectedSourceLang.value : (detectedLang.value || 'auto');
  const target = selectedTargetLang.value !== 'auto' ? selectedTargetLang.value : generalSettings.getAutoTargetLang(source);
  return {source, target};
};

const updateStore = () => {
  const {source, target} = resolveLangs();
  translateStore.setLangs(source, target);
  translateStore.setDetectedLang(detectedLang.value);
};

watch(() => props.input, (text) => {
  detectedLang.value = detectLanguage(text);
  updateStore();
}, {immediate: true});

const onSwap = () => {
  const temp = selectedSourceLang.value;
  selectedSourceLang.value = selectedTargetLang.value;
  selectedTargetLang.value = temp;
  updateStore();
};

const onSourceChange = (lang) => {
  selectedSourceLang.value = lang;
  if (lang === 'auto') {
    selectedTargetLang.value = 'auto';
  } else if (selectedTargetLang.value === 'auto') {
    selectedTargetLang.value = generalSettings.getAutoTargetLang(lang);
  }
  updateStore();
};

const onTargetChange = (lang) => {
  if (lang === 'auto' && selectedSourceLang.value !== 'auto') {
    selectedTargetLang.value = generalSettings.getAutoTargetLang(selectedSourceLang.value);
  } else {
    selectedTargetLang.value = lang;
  }
  updateStore();
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
