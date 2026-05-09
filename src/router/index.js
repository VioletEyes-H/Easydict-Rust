import { createRouter, createWebHistory } from "vue-router";
import {
  SettingOutlined,
  CloudServerOutlined,
  ThunderboltOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons-vue";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      component: () => import("../views/index.vue"),
    },
    {
      path: "/settings",
      component: () => import("../views/settings/index.vue"),
      redirect: "/settings/general",
      children: [
        {
          path: "general",
          component: () => import("../views/settings/General.vue"),
          meta: { label: "通用", icon: SettingOutlined },
        },
        {
          path: "service",
          component: () => import("../views/settings/Service.vue"),
          meta: { label: "服务", icon: CloudServerOutlined },
        },
        {
          path: "shortcuts",
          component: () => import("../views/settings/Shortcuts.vue"),
          meta: { label: "快捷键", icon: ThunderboltOutlined },
        },
        {
          path: "about",
          component: () => import("../views/settings/About.vue"),
          meta: { label: "关于", icon: InfoCircleOutlined },
        },
      ],
    },
  ],
});

export default router;
