<template>
  <div class="service-page">
    <!-- 左侧服务列表 -->
    <div class="service-list">
      <div class="list-header">
        <span class="list-title">翻译服务</span>
        <a-button type="text" size="small" class="add-btn" @click="startCreate">
          <template #icon>
            <PlusOutlined/>
          </template>
        </a-button>
      </div>
      <div class="list-body">
        <div v-for="service in services"
             :key="service.id"
             class="service-item"
             :class="{ active: currentService.id === service.id }"
             @click="currentService = service">
          <div v-if="service.icon && service.icon.includes('<svg')"
               class="service-icon service-icon-svg"
               :style="{ backgroundColor: service.color }"
               v-html="service.icon"/>
          <div v-else
               class="service-icon"
               :style="{ backgroundColor: service.color }">
            {{ service.icon }}
          </div>
          <div class="service-info">
            <div class="service-name">{{ service.name }}</div>
          </div>
          <a-switch :checked="service.enabled" size="small" @change="toggleService(service.id, $event)"/>
        </div>
      </div>
    </div>

    <!-- 右侧配置区域 -->
    <div class="service-config" v-if="currentService">
      <div class="config-header">
        <div class="config-name">{{ currentService.name }}</div>
        <a-button v-if="currentService.id?.includes('custom')"
                  type="primary" danger
                  size="small"
                  style="font-size:10px;margin-right: 8px;height: 20px"
                  @click="deleteService(currentService.id)">
          删除
        </a-button>
      </div>

      <component :is="currentService.component"
                 type="config"
                 :id="currentService.id"
                 :config="currentService.config"/>
    </div>
  </div>
</template>

<script setup>
import {ref, computed, onMounted} from 'vue'
import {PlusOutlined} from '@ant-design/icons-vue'
import {useServicesStore} from '@/stores/services'

const servicesStore = useServicesStore()

const services = computed(() => servicesStore.services)
const currentService = ref({})

onMounted(() => {
  currentService.value = services.value[0]
})

function toggleService(id, enabled) {
  servicesStore.set(id, {id, enabled})
}

function startCreate() {
  const id = `custom_${Date.now()}`
  servicesStore.set(id, {
    id,
    name: '自定义服务',
    templateId: 'custom',
    enabled: true,
    config: {}
  })
}

function deleteService(id) {
  servicesStore.remove(id)
  currentService.value = services.value[0]
}
</script>

<style scoped>
.service-page {
  padding: 12px;
  display: flex;
  gap: 16px;
  align-self: stretch;
  flex: 1;
  height: 100%;
  overflow: hidden;
  color: var(--color-text-primary);
}

/* 左侧列表 - 占 2/6 */
.service-list {
  flex: 2;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  background: var(--color-bg-secondary);
  border-radius: 8px;
}

.list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 12px;
  border-bottom: 1px solid var(--color-border-secondary);
}

.list-title {
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.add-btn {
  color: var(--color-text-secondary);
}

.add-btn:hover {
  color: var(--color-accent);
  background: var(--color-hover);
}

.list-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow-y: scroll;
  padding: 8px 6px 8px 10px;
  gap: 4px;
}

.list-body::-webkit-scrollbar {
  width: 4px;
  background-color: var(--color-bg-secondary);
}

.list-body::-webkit-scrollbar-track {
  background: transparent;
  margin: 4px 0;
}

.list-body::-webkit-scrollbar-thumb {
  background: var(--color-bg-tertiary);
  border-radius: 3px;
  margin: 0 2px;
}

.list-body::-webkit-scrollbar-thumb:hover {
  background: var(--color-text-tertiary);
}

.service-item {
  display: flex;
  align-items: center;
  gap: 6px;
  border-radius: 6px;
  cursor: pointer;
  padding: 4px;
}

.service-item:hover {
  background: var(--color-hover);
}

.service-item.active {
  background: var(--color-hover-light);
}

.service-icon {
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 600;
  flex-shrink: 0;
  min-width: 20px;
  min-height: 20px;
}

.service-icon:not(.service-icon-svg) {
  width: 20px;
  height: 20px;
}


.service-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.service-name {
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.delete-btn {
  opacity: 0;
  color: var(--color-text-tertiary);
  flex-shrink: 0;
}

.service-item:hover .delete-btn {
  opacity: 1;
}

.delete-btn:hover {
  color: #ff4d4f !important;
}

/* 右侧配置 - 占 4/6 */
.service-config {
  flex: 4;
  display: flex;
  flex-direction: column;
  background: var(--color-bg-secondary);
  border-radius: 8px;
  min-width: 0;
  overflow-y: auto;
}

.config-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--color-border-secondary);
}

.config-name {
  font-size: 12px;
  font-weight: 600;
  padding: 4px 12px;
}

.create-form {
  padding: 12px;
}

.color-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.color-picker {
  width: 32px;
  height: 32px;
  border: none;
  padding: 0;
  cursor: pointer;
  border-radius: 4px;
}
</style>
