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
```
### 第二步：登录 Cloudflare
在终端运行以下命令，浏览器会弹出授权页面：
code
```Bash
npx wrangler login
```
### 第三步：配置安全密钥 (Secrets)
重要：不要将密钥明文写在代码中。请使用以下命令将它们加密上传到 Cloudflare：
上传 HMAC 签名密钥 (用于验证 URL 合法性)：
code
```Bash
npx wrangler secret put HMAC_SECRET
```

# 终端提示输入时，粘贴你的密钥 (例如: my-secure-key-2025)
上传 MuleRun API Token (用于扣费上报)：
code
Bash
npx wrangler secret put MULERUN_API_TOKEN
# 终端提示输入时，粘贴你的 MuleRun Access Token

### 第四步：修改配置文件
打开项目根目录下的 wrangler.toml 文件，确保内容如下：
code
```Toml
name = "mulerun-metering"
main = "src/index.ts"
compatibility_date = "2024-01-01"
```

# 如果你不需要 D1 数据库，可以删除下面这段，或者保留以防代码报错
[[d1_databases]]
binding = "DB"
database_name = "mulerun-metering-db"
database_id = "YOUR_DATABASE_ID" # 如果没有使用 D1，这里可以随便填或注释掉

[vars]
SESSION_COST = "10"  # 默认会话扣费点数
MULERUN_METERING_URL = "https://api.mulerun.com/sessions/metering" # 计费接口

### 第五步：发布上线
code
```Bash
npm run deploy
```
发布成功后，终端会显示你的 Worker 访问地址，例如：
https://mulerun-metering.your-name.workers.dev

### 🔌 接口与鉴权规范 (API & Auth Specs)
## 1. 访问应用 (GET /)
MuleRun 平台通过 Iframe 加载你的应用时，会传递以下参数：
URL 示例:
https://your-worker.dev/?userId=u123&sessionId=s456&agentId=a789&time=1700000000&nonce=n123&signature=abc...
参数说明:
userId: 用户 ID
sessionId: 会话 ID
agentId: Agent ID
time: Unix 时间戳 (秒)
nonce: 随机字符串 (防重放)
signature: HMAC-SHA256 签名
签名生成规则:
提取除 signature 外的所有参数。
按 Key 字母顺序排序。
拼接成 JSON 字符串 (无空格)。例如: {"agentId":"...","nonce":"..."}
使用 HMAC_SECRET 进行 HMAC-SHA256 加密，输出 Hex 字符串。

## 2. 动作扣费接口 (POST /api/action/filter)
应用内部前端 (UI) 调用后端进行二次扣费的接口。
请求方式: POST
URL: /api/action/filter?userId=...&signature=... (必须携带完整的鉴权参数)
Header: Content-Type: application/json
Body:
code
JSON
{
  "cost": 20
}
响应:
code
JSON
{ "success": true, "cost": 20 }
🧪 本地测试脚本 (Python)
使用此脚本生成一个合法的测试链接，以便在浏览器中访问你的 Worker。
保存为 test_gen.py 并运行：
code
``Python
import hmac
import hashlib
import json
import time
import urllib.parse
import uuid

# 【配置】必须与 wrangler secret put 设置的一致
SECRET = "my-secure-key-2025" 
# 【配置】你的 Worker 上线地址
WORKER_HOST = "https://mulerun-metering.your-name.workers.dev"

def generate_url():
    params = {
        "userId": "test_user_001",
        "sessionId": str(uuid.uuid4()),
        "agentId": "demo_agent_v1",
        "time": str(int(time.time())),
        "origin": "mulerun.com",
        "nonce": str(uuid.uuid4())
    }

    # 1. 构造规范化字符串 (JSON, 按Key排序, 无空格)
    sorted_keys = sorted(params.keys())
    canonical_parts = [f'"{k}":"{params[k]}"' for k in sorted_keys]
    canonical_str = "{" + ",".join(canonical_parts) + "}"
    
    print(f"Signing String: {canonical_str}")

    # 2. 计算签名
    signature = hmac.new(
        SECRET.encode(), 
        canonical_str.encode(), 
        hashlib.sha256
    ).hexdigest()
    
    params["signature"] = signature

    # 3. 生成最终 URL
    query_string = urllib.parse.urlencode(params)
    return f"{WORKER_HOST}/?{query_string}"

if __name__ == "__main__":
    print("\n=== 测试链接 (有效期 5 分钟) ===\n")
    print(generate_url())
    print("\n===============================\n")
```

### 📂 项目结构
code
Text
src/
├── index.ts      # 【主控】路由入口，协调鉴权、计费和UI
├── auth.ts       # 【鉴权】验证 HMAC 签名逻辑
├── metering.ts   # 【计费】封装 MuleRun API 调用逻辑
└── ui.ts         # 【前端】Mockup Studio HTML/JS 源码

### ❓ 常见问题 (FAQ)
Q: 打开链接显示 401 Invalid signature?
A: 签名不匹配。请检查：
Python 脚本里的 SECRET 和 wrangler secret put HMAC_SECRET 是否完全一致？
URL 参数是否在传输过程中被转义或修改？
Q: 显示 402 Metering Failed?
A: 计费被拒绝。可能是：
MULERUN_API_TOKEN 配置错误。
MuleRun 账户余额不足。
Q: 页面一直显示 "Verifying Environment..."?
A: 这是正常的安全机制。为了防止应用在 MuleRun 之外被滥用，代码会检测 iframe 环境。如果在直接浏览器中打开，它会尝试跳转。如需测试，请将 URL 嵌入到一个本地 HTML 的 iframe 中。

### 👤 开发者 (Creator)
Developed by DENNIS (https://mulerun.com/workspace/creator/@DENNIS)
👉 MuleRun Creator Profile
License: MIT
