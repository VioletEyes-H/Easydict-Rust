import { theme } from "ant-design-vue";

export const antdThemeConfig = {
  dark: {
    algorithm: theme.darkAlgorithm,
    token: {
      colorPrimary: "#4a9eff",
      colorBgContainer: "#2a2a2a",
      colorBgElevated: "#2a2a2a",
      colorBgLayout: "#1e1e1e",
      colorText: "#e0e0e0",
      colorTextSecondary: "#aaa",
      colorBorder: "rgba(255, 255, 255, 0.1)",
      colorBorderSecondary: "rgba(255, 255, 255, 0.06)",
    },
  },
  light: {
    algorithm: theme.defaultAlgorithm,
    token: {
      colorPrimary: "#4a9eff",
      colorBgContainer: "#ffffff",
      colorBgElevated: "#ffffff",
      colorBgLayout: "#f7f8fa",
      colorText: "#1a1a1a",
      colorTextSecondary: "#666666",
      colorBorder: "#e8e8e8",
      colorBorderSecondary: "#f0f0f0",
    },
  },
};
