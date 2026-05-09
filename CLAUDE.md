# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

Tauri v2 + Vue 3 桌面翻译应用。系统托盘常驻，主窗口为无边框浮窗，支持多翻译服务聚合查询。前端使用 Vite 构建，后端使用 Rust。

## 常用命令

```bash
# 开发（启动 Vite + Rust 热重载）
yarn tauri dev

# 仅前端开发
yarn dev          # Vite dev server，端口 1420

# 生产构建
yarn tauri build

# 安装前端依赖
yarn add <package>

# 安装 Rust 依赖（在 src-tauri/ 目录下）
cargo add <crate>
```

## 架构

### 应用形态

- 系统托盘常驻应用，macOS 下无 Dock 图标（`Accessory` 激活策略）
- 主窗口：无边框、透明背景、macOS 毛玻璃效果（`window-vibrancy` + `objc2`），自动根据内容高度调整窗口大小
- 设置窗口：独立 `WebviewWindow`，从托盘菜单或主窗口头部按钮打开

### 前后端通信

前端通过 Tauri Commands (IPC) 调用 Rust 后端：

- **Rust 端**：在 `src-tauri/src/lib.rs` 中定义 `#[tauri::command]` 函数，并通过 `generate_handler![]` 注册
- **前端调用**：使用 `import { invoke } from "@tauri-apps/api/core"`，以 `invoke("command_name", { arg })` 方式调用
- **权限**：新命令无需额外 capability 配置，默认对主窗口可用

### 已注册的 Tauri Commands

| 命令 | 参数 | 说明 |
|------|------|------|
| `log_message` | `level: String, message: String` | 前端日志转发到 Rust `tracing` |
| `http_get` | `url: String, headers: Option<HashMap>` | HTTP GET 代理，绕过 CORS |
| `http_post` | `url: String, body: String, headers: Option<HashMap>` | HTTP POST 代理 |

### 目录结构

```
src/                        — 前端 Vue 3 源码
  main.js                   — 入口，注册 Pinia/Router/antdv/Logger
  App.vue                   — 根组件
  assets/services/          — 翻译服务 SVG 图标（ali, baidu, bing, google, tencent, youdao）
  components/               — 通用组件
    MainHeader.vue          — 主窗口顶部栏（置顶按钮、设置入口、窗口拖拽）
    LangSelect.vue          — 语言选择器（a-select，35+ 语言，支持 auto-detect）
    ServiceList.vue         — 翻译服务折叠面板列表
    SettingsNav.vue         — 设置页底部导航
    ThemeSwitcher.vue       — 亮/暗主题切换
  constants/lang.js         — 语言列表（LANGUAGES 数组 + getLangName）
  router/index.js           — 路由配置
  stores/                   — Pinia 状态管理（Composition API 风格）
    services.js             — 翻译服务配置（localStorage 持久化）
    theme.js                — 主题管理（跨窗口同步 via Tauri events）
    counter.js              — 占位 store
  styles/themes/            — 主题 tokens 和 antdv 主题配置
    tokens.js               — CSS 变量（dark/light）
    antd.js                 — antdv 算法 + 自定义 token
  utils/
    crypto.js               — MD5 + AES 解密（供有道翻译 API 使用）
    logger.js               — 拦截 console.* 转发到 Rust 后端
    windowConfig.js         — 设置窗口尺寸配置
  views/
    index.vue               — 主翻译页面（输入框 + 语言栏 + 服务列表）
    settings/
      index.vue             — 设置页布局壳
      General.vue           — 通用设置（首选/次选语言、主题）
      Service.vue           — 服务管理（启用/禁用、添加/删除自定义服务）
      Shortcuts.vue         — 快捷键设置（占位）
      About.vue             — 关于页面
      services/             — 翻译服务实现
        index.js            — 服务模板注册表 + 默认服务列表
        ServiceBase.vue     — 服务基组件（config/view 插槽，debounced translate 事件）
        CustomService.vue   — 自定义服务配置表单
        youdao/             — 有道翻译（已完整实现）
        baidu/              — 百度翻译（空桩）
        google/             — Google 翻译（空桩）

src-tauri/src/              — Rust 后端
  main.rs                   — 二进制入口，调用 lib::run()
  lib.rs                    — 应用逻辑（tray、窗口、commands 注册）
  http.rs                   — HTTP GET/POST 命令（reqwest）
```

### 翻译服务架构

- `serviceTemplates`：定义每个服务的图标、颜色、组件映射
- `defaultServices`：6 个预置服务（youdao, baidu, bing, google, tencent, ali），默认全部禁用
- `ServiceBase.vue`：提供 `config`（配置模式）和 `view`（翻译结果模式）两个插槽，自动监听输入变化触发 `translate` 事件
- 已实现：**有道翻译**（`youdao/`）— 支持 WebTranslate 加密 API + 词典查询 + TTS 发音 + 音标/词性/近义词展示
- 待实现：百度、Google、Bing、腾讯、阿里（均为 `EmptyService.vue` 占位）

### 路由

| 路径 | 组件 | 说明 |
|------|------|------|
| `/` | `views/index.vue` | 主翻译页面 |
| `/settings` | `views/settings/index.vue` | 设置布局（重定向到 `/settings/general`） |
| `/settings/general` | `General.vue` | 通用设置 |
| `/settings/service` | `Service.vue` | 服务管理 |
| `/settings/shortcuts` | `Shortcuts.vue` | 快捷键（占位） |
| `/settings/about` | `About.vue` | 关于 |

## 前端约定

- **组件**：使用 `<script setup>` Composition API 语法，不使用 Options API
- **Vue 文件结构**：按 `<template>` → `<script setup>` → `<style>` 顺序排列
- **UI 组件库**：**必须优先使用 Ant Design Vue (antdv)** 组件，禁止手写已有的 antd 组件功能。全局已注册，无需在各组件中单独 import 组件本身（如 `<a-button>`、`<a-input>` 等直接使用）
- **图标**：使用 `@ant-design/icons-vue`，全局已注册
- **Pinia Store**：
  - 使用 Composition API（setup function）风格定义，不使用 Options API 风格
  - 命名规范：`use<Name>Store`（如 `useCounterStore`）
  - 文件命名：camelCase（如 `counter.js`）
  - 放置目录：`src/stores/`
  - 导出 `ref`、`computed`、函数，在组件中直接解构使用
- **语言**：纯 JavaScript，未使用 TypeScript
- **包管理器**：Yarn v1（classic）
- **主题**：通过 `useThemeStore` 管理，支持 dark/light 切换，跨窗口通过 Tauri event `"theme-changed"` 同步
- **HTTP 请求**：必须通过 Tauri `invoke('http_get')` / `invoke('http_post')` 代理，不直接 fetch 外部 API（绕过 CORS）

## 后端约定

- Rust edition 2021
- `lib.rs` 包含应用逻辑和 `run()` 函数；`main.rs` 仅调用 `lib::run()`
- 序列化使用 serde + serde_json
- Tauri 插件在 `lib.rs` 的 builder 中注册
- HTTP 客户端使用 `reqwest`（features: `json`）
- 日志使用 `tracing` + `tracing-subscriber`
- macOS 平台特定代码使用 `objc2` + `objc2-app-kit`

## 外部依赖

### 前端（package.json）

| 依赖 | 用途 |
|------|------|
| `vue` ^3.5 | 框架 |
| `vue-router` 4 | 路由 |
| `pinia` ^3.0 | 状态管理 |
| `ant-design-vue` 4 | UI 组件库 |
| `@ant-design/icons-vue` ^7.0 | 图标 |
| `@tauri-apps/api` ^2 | Tauri 前端 API |
| `@tauri-apps/plugin-opener` ^2 | 打开 URL/文件 |
| `crypto-js` ^4.2 | MD5/AES（有道翻译 API 签名） |
| `lodash` ^4.18 | 工具函数（debounce 等） |

### Rust（Cargo.toml）

| 依赖 | 用途 |
|------|------|
| `tauri` 2 | 应用框架（features: `macos-private-api`, `tray-icon`） |
| `serde` / `serde_json` | 序列化 |
| `reqwest` 0.12 | HTTP 客户端 |
| `window-vibrancy` 0.6 | 窗口毛玻璃效果 |
| `objc2` / `objc2-app-kit` | macOS 原生 API |
| `tracing` / `tracing-subscriber` | 日志 |
| `tauri-plugin-opener` 2 | 打开 URL/文件插件 |

## Tauri 配置要点

- 应用标识：`com.keke.translate-tauri`
- 主窗口：无边框（`decorations: false`）、透明（`transparent: true`）、600px 宽、最小 360px
- macOS 私有 API 已启用（`macOSPrivateApi: true`，毛玻璃效果需要）
- CSP 已禁用（`null`）
- Capabilities：主窗口和设置窗口共享，包含窗口操作和 webview 创建权限
