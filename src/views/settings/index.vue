<template>
  <div class="settings-page">
    <div class="settings-nav-wrapper">
      <SettingsNav :items="menuItems" />
    </div>
    <div class="config-container">
      <router-view />
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useRouter } from "vue-router";
import SettingsNav from "@/components/SettingsNav.vue";

const router = useRouter();

const settingsRoute = router.getRoutes().find((r) => r.path === "/settings");

const menuItems = computed(() =>
  (settingsRoute?.children ?? []).map((child) => ({
    key: child.path,
    path: `/settings/${child.path}`,
    label: child.meta?.label,
    icon: child.meta?.icon,
  }))
);
</script>

<style scoped>
.settings-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: var(--color-bg-primary);
}

.settings-nav-wrapper {
  border-bottom: 1px solid var(--color-border);
  background-color: var(--color-bg-primary);
}

.config-container {
  flex: 1;
  min-height: 0;
  display: flex;
  justify-content: center;
  padding: 8px;
  color: var(--color-text-primary);
}
</style>
