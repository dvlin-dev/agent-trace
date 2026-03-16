<div align="center">

<img src="resources/icon.svg" width="120" height="120" alt="Agent Trace" />

# Agent Trace

**实时捕获、检查和调试 AI Agent 流量**

一个 Electron 桌面应用，部署在 Agent 客户端和上游 Provider 之间，
将每个请求/响应捕获为结构化、可搜索的 Session Trace。

[![GitHub Stars](https://img.shields.io/github/stars/dvlin-dev/agent-trace?style=flat)](https://github.com/dvlin-dev/agent-trace)
[![Release](https://img.shields.io/github/v/release/dvlin-dev/agent-trace?style=flat)](https://github.com/dvlin-dev/agent-trace/releases)
[![License](https://img.shields.io/github/license/dvlin-dev/agent-trace?style=flat)](LICENSE)

[English](./README.en.md) | [中文](./README.md)

</div>

---

<div align="center">
<table><tr><td align="center" width="600">

**试试 [Moryflow](https://moryflow.com)** — 本地优先的 AI Agent 工作区。
让 AI Agent 与你的知识、笔记和文件协同工作。

[![Moryflow](https://img.shields.io/badge/moryflow.com-访问-E2822B?style=for-the-badge)](https://moryflow.com)

</td></tr></table>
</div>

---

## 功能特性

- **多 Provider 支持** — 同时支持 Claude Code（Anthropic Messages API）和 Codex CLI（OpenAI Responses API）
- **智能会话归组** — 通过 Provider 特定的匹配器自动检测会话（metadata hints、消息超集、conversation ID）
- **结构化时间线** — 标准化对话视图，包含用户/助手消息、工具调用、工具结果、推理块
- **上下文识别** — 注入的上下文（system reminder、CLAUDE.md、hooks、skills）折叠为标签化的卡片
- **Inspector 面板** — 逐请求查看概览、Token 用量、工具 Schema、原始请求/响应载荷
- **Profile 系统** — 创建多个 Profile，绑定不同 Provider 和端口，独立启停
- **完全本地** — 所有数据存储在本机 SQLite，无云端依赖

## 工作原理

```
Agent Client  ──▶  Agent Trace (localhost:8888)  ──▶  上游 API
                          │
                      捕获 + 标准化
                          │
                    SQLite + Inspector
                          │
                      Electron UI
```

1. 创建 Profile — 选择 Provider，设置上游 URL 和本地端口
2. 开始监听 — Agent Trace 打开本地 HTTP 代理
3. 指向客户端 — 将 `ANTHROPIC_BASE_URL` 或 `OPENAI_BASE_URL` 设为本地地址
4. 检查 — Session 实时出现，附带完整的结构化 Trace

## 快速开始

```bash
# Anthropic (Claude Code)
export ANTHROPIC_BASE_URL=http://127.0.0.1:8888

# OpenAI (Codex CLI)
export OPENAI_BASE_URL=http://127.0.0.1:8889
```

## 支持的 Provider

| Provider | 协议适配器 | 默认上游地址 |
|----------|-----------|-------------|
| Claude Code | `anthropic-messages` | `https://api.anthropic.com` |
| Codex CLI | `openai-responses` | `https://chatgpt.com/backend-api/codex` |

## 架构

```
src/
├── main/                    # Electron 主进程
│   ├── transport/           # HTTP 监听 + 转发（协议无关）
│   ├── providers/           # Provider 定义 + 协议适配器
│   │   └── protocol-adapters/
│   │       ├── anthropic-messages/   # 标准化、Inspector、会话匹配、时间线
│   │       └── openai-responses/     # 同结构，适配 Codex
│   ├── pipeline/            # 捕获管道 + 会话解析
│   ├── storage/             # SQLite 存储层
│   └── queries/             # 视图模型查询服务
├── preload/                 # Electron preload bridge (CJS)
├── renderer/                # React UI (Vite ESM)
│   ├── components/          # UI 组件（基于 shadcn/ui）
│   ├── stores/              # Zustand 状态管理
│   └── hooks/               # 推送事件处理
└── shared/                  # 跨层契约 + 类型定义
```

## 开发

```bash
pnpm install      # 安装依赖
pnpm dev          # 开发模式
pnpm build        # 生产构建
pnpm typecheck    # 类型检查
pnpm test         # 运行测试
pnpm dist:mac     # 构建 macOS .dmg
```

## 技术栈

Electron 33 · React 19 · TypeScript · Vite · Zustand · shadcn/ui · Tailwind CSS 4 · better-sqlite3

## License

MIT