<template>
  <a-config-provider :theme="themeStore.antdConfig">
    <router-view/>
  </a-config-provider>
</template>

<script setup>
import {getCurrentWindow} from "@tauri-apps/api/window";
import {router} from "./router";
import {useThemeStore} from "./stores/theme";
import {useServicesStore} from "./stores/services";
import {onMounted} from "vue";
import {defaultServices} from "@/views/services/index.js";

const themeStore = useThemeStore();

router.isReady().then(() => {
  getCurrentWindow().show();
});


const serviceStore = useServicesStore();
onMounted(() => {
  defaultServices.forEach(item => {
    if (!serviceStore.data[item.id]) {
      serviceStore.set(item.id, item)
    }
  })
})
</script>

<style>
:root {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji";
  font-size: 16px;
  line-height: 24px;
  font-weight: 400;
  color: var(--color-text-primary);
  background-color: var(--color-bg-primary);
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  -webkit-text-size-adjust: 100%;
  overflow: hidden;
  -webkit-user-select: none;
  user-select: none;
}

input, textarea {
  -webkit-user-select: text;
  user-select: text;
}
</style>
