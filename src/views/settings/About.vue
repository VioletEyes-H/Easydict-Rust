<template>
  <div class="settings-sub-page">
    <h3>关于</h3>
    <a-descriptions bordered :column="1">
      <a-descriptions-item label="应用名称">翻译助手</a-descriptions-item>
      <a-descriptions-item label="版本">1.0.0</a-descriptions-item>
    </a-descriptions>
  </div>
</template>

<script setup>
</script>

<style scoped>
.settings-sub-page {
  padding: 2rem;
  color: var(--color-text-primary);
}
</style>
