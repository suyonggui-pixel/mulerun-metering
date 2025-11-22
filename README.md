# MuleRun Metering Gateway & Mockup Studio

[![Deploy to Cloudflare Workers](https://img.shields.io/badge/Deploy%20to-Cloudflare%20Workers-orange?style=flat&logo=cloudflare)](https://workers.cloudflare.com/)
[![Built with Hono](https://img.shields.io/badge/Built%20with-Hono-E33C2B?style=flat&logo=hono)](https://hono.dev/)
[![MuleRun Creator](https://img.shields.io/badge/Creator-@DENNIS-blue)](https://mulerun.com/workspace/creator/@DENNIS)

> 一个基于 Cloudflare Workers 的 **MuleRun 付费应用网关** 模板。
> 包含完整的 **HMAC 鉴权**、**API 计费上报** 以及一个嵌入式的 **Mockup Studio** 图片处理工具。

---

## 📖 项目简介 (Introduction)

本项目演示了如何开发一个安全嵌入 MuleRun 平台的 Iframe 应用。它充当了一个“中间人”网关：

1.  **🛡️ 安全鉴权**：验证来自 MuleRun 的 URL 签名 (HMAC-SHA256)，防止未授权访问。
2.  **💰 自动计费**：
    *   **会话扣费**：用户打开应用时，自动扣除基础点数 (如 10 点)。
    *   **动作扣费**：用户执行高级操作 (如滤镜) 时，动态调用 API 扣除额外点数 (如 20 点)。
3.  **🖼️ 嵌入式 UI**：直接在 Worker 中渲染 HTML5 Canvas 图片编辑器，无需额外的服务器。
4.  **🚀 无服务器**：完全运行在 Cloudflare Edge 网络上，低延迟，零维护。

---

## 🛠️ 准备工作 (Prerequisites)

在开始之前，请确保你拥有：

1.  **GitHub 账号** (用于存放代码)
2.  **Cloudflare 账号** (用于部署应用)
3.  **Node.js 环境** (建议 v18 或更高版本)
4.  **MuleRun 开发者账号** (用于获取 API Token 和测试)

---

## 🚀 从零开始部署 (Deployment Guide)

### 第一步：下载代码
```bash
git clone https://github.com/suyonggui-pixel/mulerun-metering.git
cd mulerun-metering
npm install
