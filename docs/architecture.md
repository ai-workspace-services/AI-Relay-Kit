# 统一 AI 代理与配置注入器 (Unified AI Relay & Config Injector) 架构规划

该项目旨在完全解耦“API 聚合路由”与“客户端配置”，通过统一的 Node.js 轻量级代理服务，同时解决特定客户端（Codex、Claude Code）的私有协议壁垒，并通过自动化脚本一键注入跨工具配置。

> [!NOTE]
> 该工具定位于“无状态（或纯内存轻量状态）、无 DB、可插拔”的中间件，核心网关能力完全委托给后端的 LiteLLM。
> 本项目核心框架选用 **Hono**，使用 **TypeScript** 开发。

## 核心架构设计

### 1. 目录结构与职责 (工程模式)

采用插件化（Adapter）架构模式，使核心框架与具体的终端协议隔离，便于未来添加新的端点。项目代号确定为 **AI-Relay-Kit**。

```text
AI-Relay-Kit/
├── package.json
├── docs/                       # 项目文档
│   └── architecture.md         # 统一 AI 代理与配置注入器架构规划记录
├── src/
│   ├── index.ts                # 服务入口 (Hono app)
│   ├── config.ts               # 统一配置加载 (LiteLLM 地址、端口等)
│   ├── core/                   # 核心中继控制器
│   │   ├── request_handler.ts  # 代理发送请求至 LiteLLM 核心模块
│   │   └── cache_manager.ts    # 轻量内存状态管理 (为 Codex 等提供会话持久)
│   ├── adapters/               # 特化客户端插件层 (Plugins)
│   │   ├── codex/              # 替代 codex-relay
│   │   │   ├── parser.ts       # Responses API -> Chat Completions 转换
│   │   │   └── routes.ts       # 暴露 /codex/v1/responses 路由
│   │   ├── claude/             # 替代 moon-bridge
│   │   │   ├── parser.ts       # Anthropic API -> Chat Completions 转换
│   │   │   └── routes.ts       # 暴露 /claude/v1/messages 路由
│   │   └── standard/           # 标准 OpenAI 直通 (预留给无特化需求的端)
│   └── injector/               # Auto Config Injector 模块
│       ├── fetch_models.ts     # 从 LiteLLM 拉取 /v1/models
│       ├── codex_injector.ts   # 读写 ~/.codex/config.toml 和 catalog.json
│       ├── claude_injector.ts  # 设置 Claude Code Base URL / env vars
│       └── anti_injector.ts    # 配置 Antigravity 环境变量
└── scripts/
    └── setup-ai-workspace.sh   # 统一入口脚本，启动服务 + 触发配置注入
```

### 2. 核心模块规划

#### 2.1 特殊客户端适配器 (Adapters)

*   **Codex 适配器 (`adapters/codex`)**:
    *   **拦截**：接收来自 Codex APP 的 POST 请求，符合专有的 `responses` 对象格式。
    *   **翻译**：由于 Responses API 是 Stateful（有状态的），我们需要借助 `cache_manager` 在内存中维护历史 Session（类似 codex-relay Rust 版的逻辑）。将传入的对话状态还原为标准 `messages` 数组。
    *   **转发**：请求下游 LiteLLM。
    *   **响应映射**：将 LiteLLM 返回的 Chat Completions 标准 SSE 流实时映射回 Codex 期望的响应切片。
*   **Claude Code 适配器 (`adapters/claude`)**:
    *   **拦截**：拦截来自 Claude Code 的 `x-api-key` 和 `anthropic-version` 等头信息。
    *   **翻译**：将 Anthropic 的 `system`、`messages` (role: user/assistant) 转换为通用的 Chat Completions，注意处理复杂的 Function Calling / Tool Use 差异。
    *   **转发 & 响应映射**：接收 LiteLLM 响应并翻译回 Claude Code 期望的流事件（`message_start`, `content_block_delta` 等）。*(注：如果后续 LiteLLM 的 Anthropic proxy 完善，该模块可随时配置为透传模式)*。

#### 2.2 自动配置注入器 (Auto Config Injector)

作为一个独立的 CLI 命令或启动脚本（例如 `npm run inject`），其执行流如下：

1.  **探测后端**：轮询/探测 LiteLLM（如 `http://localhost:4000`）是否就绪。
2.  **拉取模型**：调用 LiteLLM 的 `/v1/models`。
3.  **分发配置**：
    *   **Codex**：生成 `custom_model_catalog.json`，遍历 LiteLLM 返回的模型列表注入 `model_properties`，并修改 `~/.codex/config.toml` 将 `model_provider` 设为 `unified-relay`，基地址指向 `http://127.0.0.1:<RelayPort>/codex/v1`。
    *   **Claude Code**：将其默认 API 端点覆写为 `http://127.0.0.1:<RelayPort>/claude/v1`，避免其强制访问远端 API。
    *   **Antigravity**：可选择生成 `.env.local` 供直接读取，指向 LiteLLM `http://127.0.0.1:<LiteLLMPort>/v1`。

## Verification Plan

### 自动化与脚本测试
*   运行 `npm run inject` 后，验证 `~/.codex/config.toml` 及相关的模型目录 JSON 文件是否按照预期生成，并包含了来自 LiteLLM 的最新动态模型。

### 手动验证流
1.  启动 LiteLLM（配置好 DeepSeek、OpenAI 等上游）。
2.  启动 Unified Relay (当前项目)。
3.  运行 Injector 注入配置。
4.  在 Codex APP 中，检查是否能选择出并使用刚才配置的聚合模型。
5.  在 Claude Code 中，运行测试 Prompt 检查是否成功完成通信。
