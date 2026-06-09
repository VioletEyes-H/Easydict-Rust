# CLAUDE.md

## 项目概述

Tauri v2 + Vue 3 桌面翻译应用。系统托盘常驻，主窗口为无边框浮窗，支持多翻译服务聚合查询。

## 通用规则

- **跨平台兼容**：所有需求必须兼容 Windows、Linux、macOS 三个平台，避免使用平台特定的 API 或路径，必要时需做平台判断和适配

## 常用命令

```bash
yarn tauri dev      # 开发（Vite + Rust 热重载）
yarn dev            # 仅前端，端口 1420
yarn tauri build    # 生产构建
```

## 前端约定

- Vue 3 `<script setup>` + Composition API，纯 JavaScript（无 TypeScript）
- UI 必须用 Ant Design Vue，全局已注册（`<a-button>` 等直接用），图标用 `@ant-design/icons-vue`
- Pinia store 用 Composition API 风格，命名 `use<Name>Store`，文件 camelCase
- HTTP 请求必须通过 Tauri `invoke('http_get')` / `invoke('http_post')` 代理（绕 CORS）
- 主题：`useThemeStore` 管理，跨窗口通过 Tauri event `"theme-changed"` 同步

## 后端约定

- `lib.rs` 含应用逻辑和 `run()`；`main.rs` 仅调用 `lib::run()`
- Tauri commands 在 `lib.rs` 定义并注册，前端通过 `invoke()` 调用
- HTTP 用 `reqwest`，日志用 `tracing`，macOS 原生用 `objc2`

## 翻译服务架构

采用 **模板 + 实例** 模式，代码位于 `src/views/services/`。`serviceTemplates` 定义 icon/color/component，`stores/services.js` 持久化实例并合并到模板（`{...template, ...instance}`）。

- 每个服务目录 3 文件：`XxxService.vue` + `xxx-api.js` + `xxx-lang.js`
- `ServiceBase.vue` 为基组件，`type='config'` 渲染配置，`type='view'` 渲染结果
- API 调用必须走 `invoke('http_get/http_post')`

| 类型 | 服务 | 配置 |
|------|------|------|
| 免费无鉴权 | Google, Bing | 无 |
| API Key | Baidu, Tencent, Ali, DeepL, Volcano, Caiyun, NiuTrans | appId + secretKey |
| LLM API Key | OpenAI, DeepSeek, Gemini | apiKey + endpoint |
| 内置免费 | Youdao | 无 |
