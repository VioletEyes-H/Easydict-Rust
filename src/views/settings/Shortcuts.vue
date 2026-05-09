<template>
  <div class="settings-sub-page">
    <h3>快捷键设置</h3>
    <a-form layout="vertical" class="config-form">
      <a-form-item label="翻译快捷键">
        <a-input placeholder="例如: Ctrl+Shift+T" />
      </a-form-item>
      <a-form-item label="显示/隐藏窗口">
        <a-input placeholder="例如: Ctrl+Shift+H" />
      </a-form-item>
    </a-form>
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
