import { defineStore } from "pinia";
import { ref } from "vue";
import { emit, listen } from "@tauri-apps/api/event";

const STORAGE_KEY = "generalSettings";

export const useGeneralSettingsStore = defineStore("generalSettings", () => {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");

  const firstLang = ref(saved.firstLang || "zh");
  const secondLang = ref(saved.secondLang || "en");

  function updateSettings(settings) {
    if (settings.firstLang !== undefined) firstLang.value = settings.firstLang;
    if (settings.secondLang !== undefined) secondLang.value = settings.secondLang;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      firstLang: firstLang.value,
      secondLang: secondLang.value,
    }));
  }

  // 根据检测到的语言和设置，计算目标语言
  // 当 targetLang 为 auto 时调用：如果检测到的语言是第一语言，则返回第二语言，否则返回第一语言
  function getAutoTargetLang(detectedLang) {
    if (detectedLang === firstLang.value) {
      return secondLang.value;
    }
    return firstLang.value;
  }

  return { firstLang, secondLang, updateSettings, getAutoTargetLang };
});
