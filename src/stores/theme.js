import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { emit, listen } from "@tauri-apps/api/event";
import { themes } from "../styles/themes/tokens";
import { antdThemeConfig } from "../styles/themes/antd";

export const useThemeStore = defineStore("theme", () => {
  const currentTheme = ref(localStorage.getItem("theme") || "dark");

  const antdConfig = computed(() => antdThemeConfig[currentTheme.value]);

  function setTheme(themeName) {
    currentTheme.value = themeName;
    localStorage.setItem("theme", themeName);
    applyCssVariables(themeName);
    // 广播主题变更事件，通知其他窗口
    emit("theme-changed", themeName);
  }

  function applyCssVariables(themeName) {
    const vars = themes[themeName].css;
    const root = document.documentElement;
    Object.entries(vars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
  }

  // 初始化：应用已保存的主题
  applyCssVariables(currentTheme.value);

  // 监听来自其他窗口的主题变更事件
  listen("theme-changed", (event) => {
    const themeName = event.payload;
    if (themeName !== currentTheme.value) {
      currentTheme.value = themeName;
      applyCssVariables(themeName);
    }
  });

  return { currentTheme, antdConfig, setTheme };
});
