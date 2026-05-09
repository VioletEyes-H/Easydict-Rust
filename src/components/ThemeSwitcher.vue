<template>
  <a-segmented v-model:value="current" :options="options" @change="handleChange" />
</template>

<script setup>
import { computed } from "vue";
import { useThemeStore } from "../stores/theme";

const themeStore = useThemeStore();

const options = [
  { label: "日间主题", value: "light" },
  { label: "深夜主题", value: "dark" },
];

const current = computed({
  get: () => themeStore.currentTheme,
  set: () => {},
});

function handleChange(value) {
  themeStore.setTheme(value);
}
</script>
