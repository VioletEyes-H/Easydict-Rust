import { defineStore } from "pinia";
import { ref, nextTick } from "vue";

// 翻译会话状态（仅主窗口使用，无需跨窗口同步）
export const useTranslateStore = defineStore("translate", () => {
  // 输入框文本
  const inputText = ref("");

  // 源语言与目标语言（解析后的实际语言，用于翻译服务）
  const sourceLang = ref("auto");
  const targetLang = ref("auto");

  // 检测到的输入语言
  const detectedLang = ref(null);

  // 翻译服务面板是否展开：true 展开并加载，false 收起
  const isExpanded = ref(false);

  function setInputText(text) {
    inputText.value = text;
  }

  function clearInput() {
    inputText.value = "";
  }

  function setLangs(s, t) {
    sourceLang.value = s;
    targetLang.value = t;
  }

  function setDetectedLang(lang) {
    detectedLang.value = lang;
  }

  function setExpanded(value) {
    isExpanded.value = value;
  }

  // 展开服务面板并触发新一轮翻译；若已展开，先收起再展开以重新触发
  function expand() {
    if (isExpanded.value) {
      isExpanded.value = false;
      nextTick(() => {
        isExpanded.value = true;
      });
    } else {
      isExpanded.value = true;
    }
  }

  return {
    inputText,
    sourceLang,
    targetLang,
    detectedLang,
    isExpanded,
    setInputText,
    clearInput,
    setLangs,
    setDetectedLang,
    setExpanded,
    expand,
  };
});
