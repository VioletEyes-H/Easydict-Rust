<template>
  <div class="settings-nav">
    <router-link
      v-for="item in items"
      :key="item.key"
      :to="item.path"
      class="nav-item"
      :class="{ active: isActive(item.path) }"
    >
      <component :is="item.icon" class="nav-icon" />
      <div class="nav-label">{{ item.label }}</div>
    </router-link>
  </div>
</template>

<script setup>
import { useRoute } from "vue-router";

const props = defineProps({
  items: {
    type: Array,
    required: true,
  },
});

const route = useRoute();

const isActive = (path) => {
  return route.path.startsWith(path);
};
</script>

<style scoped>
.settings-nav {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 8px;
  gap: 16px;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 64px;
  border-radius: 8px;
  text-decoration: none;
  color: var(--color-text-secondary);
  transition: all 0.2s ease;
}

.nav-item:hover {
  color: var(--color-text-primary);
  background-color: var(--color-hover);
}

.nav-item.active {
  color: var(--color-text-primary);
  background-color: var(--color-bg-secondary);
}

.nav-icon {
  font-size: 24px;
  margin-top: -4px;
}

.nav-label {
  font-size: 12px;
  margin-bottom: -8px;
}
</style>
