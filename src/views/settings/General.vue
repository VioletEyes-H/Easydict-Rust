<template>
  <div class="settings-sub-page">
    <div class="card-container">
      <div class="card-header">查询语言</div>
      <a-card :body-style="{padding:'12px'}">
        <div class="form-item">
          <div>第一语言</div>
          <lang-select v-model="generalSettings.firstLang" style="width: 140px" :size="'small'"/>
        </div>
        <a-divider style="margin: 8px 0"/>
        <div class="form-item">
          <div>第二语言</div>
          <lang-select v-model="generalSettings.secondLang" style="width: 140px" :size="'small'"/>
        </div>
      </a-card>
    </div>

    <div class="card-container">
      <div class="card-header">应用设置</div>
      <a-card :body-style="{padding:'12px'}">
        <div class="form-item">
          <div>主题设置</div>
          <div>
            <theme-switcher :size="'small'"/>
          </div>
        </div>
      </a-card>
    </div>
  </div>
</template>

<script setup>
import ThemeSwitcher from "../../components/ThemeSwitcher.vue";
import LangSelect from "@/components/LangSelect.vue";
import {ref} from "vue";

const generalSettings = ref({
  firstLang: "zh",
  secondLang: "en"
})

</script>

<style scoped>
.settings-sub-page {
  width: 600px;
  color: var(--color-text-primary);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.card-container {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.card-header {
  padding-left: 8px;
  font-weight: 600;
}

.form-item{
  display: flex;
  align-items: center;
  justify-content: space-between;
}
</style>
