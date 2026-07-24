import { defineStore } from "pinia";
import { ref } from "vue";
import { useServicesStore } from "@/stores/services";

// 服务翻译状态
export const ServiceStatus = {
  COLLAPSED: 0, // 收起（初始/重置）
  LOADING: 1, // 翻译中（header 转圈，面板收起）
  DONE: 2, // 完成（成功或失败，面板展开，错误由子组件展示）
};

// 翻译会话状态（仅主窗口使用，无需跨窗口同步）
export const useTranslateStore = defineStore("translate", () => {
  // 输入框文本
  const inputText = ref("");

  // 源语言与目标语言（解析后的实际语言，用于翻译服务）
  const sourceLang = ref("auto");
  const targetLang = ref("auto");

  // 检测到的输入语言
  const detectedLang = ref(null);

  // 各服务翻译状态：{ [serviceId]: 0 | 1 | 2 }，见 ServiceStatus
  const serviceStatus = ref({});

  function setInputText(text) {
    inputText.value = text;
  }

  function clearInput() {
    inputText.value = "";
    resetTranslate();
  }

  function setLangs(s, t) {
    sourceLang.value = s;
    targetLang.value = t;
  }

  function setDetectedLang(lang) {
    detectedLang.value = lang;
  }

  // 回车触发新一轮翻译：
  // enabled && panel !== false 的服务置 1（自动翻译），其余启用服务置 0（收起不触发）
  function submitTranslate() {
    const servicesStore = useServicesStore();
    const next = {};
    servicesStore.services
      .filter((s) => s.enabled)
      .forEach((s) => {
        next[s.id] = s.panel === false ? ServiceStatus.COLLAPSED : ServiceStatus.LOADING;
      });
    serviceStatus.value = next;
  }

  function setServiceStatus(id, status) {
    serviceStatus.value = { ...serviceStatus.value, [id]: status };
  }

  // 清空翻译：所有服务显式置 0（而不是置空对象），
  // 这样 ServiceList 的 watch 能感知到每个服务的变化并收起面板
  function resetTranslate() {
    const next = {};
    for (const id of Object.keys(serviceStatus.value)) {
      next[id] = ServiceStatus.COLLAPSED;
    }
    serviceStatus.value = next;
  }

  return {
    inputText,
    sourceLang,
    targetLang,
    detectedLang,
    serviceStatus,
    setInputText,
    clearInput,
    setLangs,
    setDetectedLang,
    submitTranslate,
    setServiceStatus,
    resetTranslate,
  };
});
