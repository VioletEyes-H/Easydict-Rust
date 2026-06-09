# Translate Tauri

基于 Tauri v2 + Vue 3 的桌面翻译应用，系统托盘常驻，主窗口为无边框浮窗，支持多翻译服务聚合查询。

## 致谢

本项目参考 [Easydict](https://github.com/tisfeng/Easydict) 的设计理念，使用 Rust 重写，旨在提供一个轻量、跨平台的桌面翻译工具。感谢 Easydict 项目的启发。

## 技术栈

- **前端**：Vue 3 + Ant Design Vue + Pinia + Vue Router
- **后端**：Rust + Tauri v2 + reqwest
- **构建**：Vite + Yarn

## 开发

```bash
# 安装依赖
yarn

# 启动开发环境（Vite + Rust 热重载）
yarn tauri dev

# 仅前端开发
yarn dev

# 生产构建
yarn tauri build
```

## License

[GPL-3.0](LICENSE)
