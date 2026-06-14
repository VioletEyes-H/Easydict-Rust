<template>
  <div ref="appRef" class="app">
    <main-header/>

    <div class="container">
      <!-- 输入区域 -->
      <div class="input-area">
        <a-textarea
            v-model:value="inputText"
            :auto-size="{ minRows: 2, maxRows: 20 }"
            autocapitalize="none"
            autocorrect="off"
            spellcheck="false"
            @keydown.enter="onEnter"/>
        <div class="input-actions">
          <div class="icon-btn" @click="playTTS">
            <span class="theme-icon" v-html="speakerSvg"></span>
          </div>
          <div class="icon-btn">
            <span class="theme-icon" v-html="copySvg"></span>
          </div>
          <!--显示识别到的语言-->
          <div class="detected-lang" v-if="detectedLang">
            识别为 <span style="color: #177df7">{{ getLangName(detectedLang) }}</span>
          </div>
          <div class="icon-btn" style="margin-left: auto;" v-if="inputText" @click="clearInput">
            <CloseCircleOutlined style="font-size: 16px"/>
          </div>
        </div>
      </div>

      <!-- 语言选择栏 -->
      <div class="lang-bar">
        <div style="flex: 1;text-align: center">
          <lang-select style="width: 160px" v-model="sourceLang" :detectedLang="detectedLang" auto
                       :container="appRef" @change="()=>translateTrigger++"/>
        </div>
        <div class="icon-btn" @click="swapLangs">
          <SwapOutlined/>
        </div>
        <div style="flex: 1;text-align: center">
          <lang-select style="width: 160px" v-model="targetLang" :container="appRef" @change="()=>translateTrigger++"/>
        </div>
      </div>

      <!-- 翻译服务列表 -->
      <service-list :input="inputText" :sourceLang="sourceLang === 'auto' ? (detectedLang || 'auto') : sourceLang"
                    :targetLang="targetLang"/>
    </div>
  </div>
</template>

<script setup>
import {ref, watch, onMounted, onUnmounted, nextTick, provide} from "vue";
import {getCurrentWindow, LogicalSize} from "@tauri-apps/api/window";
import {
  CloseCircleOutlined,
  SwapOutlined
} from "@ant-design/icons-vue";
import {debounce} from "lodash";
import LangSelect from "../components/LangSelect.vue";
import MainHeader from "@/components/MainHeader.vue";
import ServiceList from "@/components/ServiceList.vue";
import speakerRaw from "@/assets/services/speaker.svg?raw";
import copyRaw from "@/assets/services/copy.svg?raw";
import {playYoudaoTTS} from '@/utils/tts.js'
import {detectLanguage} from '@/utils/langDetect.js'
import {getLangName} from '@/constants/lang.js'
import {useAppShortcutsStore} from "@/stores/appShortcuts";

const appShortcuts = useAppShortcutsStore();

function processSvg(raw) {
  return raw
      .replace(/fill="[^"]*"/g, 'fill="currentColor"')
      .replace(/width="[^"]*"/, 'width="16"')
      .replace(/height="[^"]*"/, 'height="16"');
}

const speakerSvg = processSvg(speakerRaw);
const copySvg = processSvg(copyRaw);

const inputText = ref("");
const appRef = ref(null);
const sourceLang = ref("auto");
const targetLang = ref("en");
const appWindow = getCurrentWindow();
const lastWindowHeight = ref(0)
let unlistenFocus = null;
let resizeObserver = null;

const translateTrigger = ref(0);
provide('translateTrigger', translateTrigger);
provide('setInputText', (text) => {
  inputText.value = text;
  translateTrigger.value++;
});

// 自动检测语言（仅当 sourceLang 为 auto 时生效）
const detectedLang = ref(null);

const autoDetectLang = debounce((text) => {
  if (sourceLang.value !== 'auto') return;
  const detected = detectLanguage(text);
  if (detected) {
    detectedLang.value = detected;
  }
}, 300);

// 监听输入文本变化
watch(inputText, (newText) => {
  if (newText && newText.trim().length > 0) {
    autoDetectLang(newText);
  } else {
    detectedLang.value = null;
  }
});

// 监听源语言变化，切换到 auto 时重新检测
watch(sourceLang, (newLang) => {
  if (newLang === 'auto' && inputText.value) {
    const detected = detectLanguage(inputText.value);
    if (detected) {
      detectedLang.value = detected;
    }
  } else {
    detectedLang.value = null;
  }
});

const clearInput = () => {
  inputText.value = "";
  translateTrigger.value++;
};

const onEnter = (e) => {
  if (!e.shiftKey) {
    e.preventDefault();
    translateTrigger.value++;
  }
};

const swapLangs = () => {
  const temp = sourceLang.value;
  sourceLang.value = targetLang.value;
  targetLang.value = temp;
};

async function fitWindowHeight() {
  await nextTick();
  if (!appRef.value) {
    return
  }
  const height = appRef.value.offsetHeight;
  if (lastWindowHeight.value === height) {
    return;
  }
  lastWindowHeight.value = height;
  await setWindowHeight(height)
}

async function setWindowHeight(height) {
  const size = new LogicalSize(600, height);
  const minSize = new LogicalSize(360, height);
  const maxSize = new LogicalSize(99999, height);
  await Promise.all([
    appWindow.setSize(size),
    appWindow.setMinSize(minSize),
    appWindow.setMaxSize(maxSize),
  ]);
}

onMounted(async () => {
  await nextTick()

  if (appRef.value) {
    await fitWindowHeight();
    resizeObserver = new ResizeObserver(() => fitWindowHeight());
    resizeObserver.observe(appRef.value);
  }

  // 监听窗口焦点变化，失焦时隐藏窗口（钉住时不隐藏）
  unlistenFocus = await appWindow.onFocusChanged(async ({payload: focused}) => {
    if (!focused && !appShortcuts.pinned) {
      await appWindow.hide();
    }
  });

  // 应用内快捷键：capture 阶段拦截，输入框聚焦时也生效
  window.addEventListener("keydown", onAppShortcut, true);
});

function onAppShortcut(e) {
  const name = appShortcuts.matchAction(e);
  if (!name) return;
  e.preventDefault();
  e.stopPropagation();
  switch (name) {
    case "clearInput":
      clearInput();
      break;
    case "playTTS":
      playTTS();
      break;
    case "retry":
      translateTrigger.value++;
      break;
    case "pinWindow":
      appShortcuts.togglePin();
      break;
  }
}

const playTTS = async () => {
  const lang = sourceLang.value === 'auto' ? (detectedLang.value || 'zh') : sourceLang.value;
  await playYoudaoTTS(inputText.value, lang)
};

onUnmounted(() => {
  // 清理焦点监听器
  if (unlistenFocus) {
    unlistenFocus();
  }
  window.removeEventListener("keydown", onAppShortcut, true);
  // 清理 ResizeObserver
  if (resizeObserver) {
    resizeObserver.disconnect();
  }
});
</script>

<style scoped>
.app {
  background-color: var(--color-bg-primary);
  color: var(--color-text-primary);
  display: flex;
  flex-direction: column;
  height: fit-content;
  border-radius: 8px;
  overflow: hidden;
  max-height: 900px;
}

.container {
  overflow-y: scroll;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0 12px 8px 12px;
}

.container::-webkit-scrollbar {
  width: 8px;
  background-color: var(--color-bg-secondary);
}

.container::-webkit-scrollbar-track {
  background: transparent;
}

.container::-webkit-scrollbar-thumb {
  background: var(--color-bg-tertiary);
  border-radius: 3px;
  margin: 0 2px;
}

.container::-webkit-scrollbar-thumb:hover {
  background: var(--color-text-tertiary);
}

.icon-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  color: var(--color-text-secondary);
}

.icon-btn:hover {
  background-color: var(--color-hover);
}

.theme-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  color: inherit;
}

.detected-lang {
  color: var(--color-text-secondary);
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 12px;
  background-color: var(--color-bg-tertiary);
  line-height: 12px;
}

.input-area {
  background-color: var(--color-bg-secondary);
  border-radius: 10px;
  transition: border-color 0.2s;
  padding: 2px;
}

:deep(.ant-input-textarea) {
  background: transparent;
}

:deep(.ant-input) {
  background: transparent;
  border: none;
  color: var(--color-text-primary);
  font-size: 14px;
  resize: none;
  outline: none;
  font-family: inherit;
  line-height: 1.5;
}

:deep(.ant-input:focus),
:deep(.ant-input:hover) {
  border: none;
  box-shadow: none;
}

:deep(.ant-input::placeholder) {
  color: var(--color-text-tertiary);
}

:deep(.ant-input::-webkit-scrollbar) {
  width: 8px;
}

:deep(.ant-input::-webkit-scrollbar-track) {
  background: transparent;
  margin: 4px 0;
}

:deep(.ant-input::-webkit-scrollbar-thumb) {
  background: var(--color-bg-tertiary);
  border-radius: 3px;
  margin: 0 2px;
}

:deep(.ant-input::-webkit-scrollbar-thumb:hover) {
  background: var(--color-text-tertiary);
}

.input-actions {
  display: flex;
  gap: 8px;
  padding: 2px 6px;
  align-items: center;
  justify-items: center;
}

.lang-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 2px;
  background-color: var(--color-bg-secondary);
  border-radius: 10px;
}

</style>
