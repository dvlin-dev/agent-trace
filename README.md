<div align="center">

<img src="resources/icon.svg" width="120" height="120" alt="Agent Trace" />

# Agent Trace

**Capture, inspect, and debug AI agent traffic in real time.**

Electron desktop app that sits between your agent client and the upstream provider,
capturing every request/response as structured, searchable session traces.

[![GitHub Stars](https://img.shields.io/github/stars/dvlin-dev/agent-trace?style=flat)](https://github.com/dvlin-dev/agent-trace)
[![Release](https://img.shields.io/github/v/release/dvlin-dev/agent-trace?style=flat)](https://github.com/dvlin-dev/agent-trace/releases)
[![License](https://img.shields.io/github/license/dvlin-dev/agent-trace?style=flat)](LICENSE)

[English](./README.md) | [中文](./README.zh-CN.md)

</div>

---

<div align="center">
<table><tr><td align="center" width="600">

**Try [Moryflow](https://moryflow.com)** — Local-first AI Agent Workspace.
AI agents that work with your knowledge, notes, and files.

[![Moryflow](https://img.shields.io/badge/moryflow.com-Visit-E2822B?style=for-the-badge)](https://moryflow.com)

</td></tr></table>
</div>

---

## Features

- **Multi-provider** — Supports Claude Code (Anthropic Messages API) and Codex CLI (OpenAI Responses API) side by side
- **Session grouping** — Automatic session detection via provider-specific matchers (metadata hints, message superset, conversation IDs)
- **Structured timeline** — Normalized conversation view with user/assistant turns, tool calls, tool results, reasoning blocks
- **Context detection** — Injected context (system reminders, CLAUDE.md, hooks, skills) collapsed into labeled chips
- **Inspector panel** — Per-exchange overview, token usage, tool schemas, raw request/response payloads
- **Profile system** — Create multiple profiles with different providers and ports, start/stop independently
- **Local-only** — All data stays on your machine in SQLite, no cloud dependency

## How It Works

```
Agent Client  ──▶  Agent Trace (localhost:8888)  ──▶  Upstream API
                          │
                    Capture + Normalize
                          │
                   SQLite + Inspector
                          │
                     Electron UI
```

1. Create a profile — pick a provider, set the upstream URL and local port
2. Start listening — Agent Trace opens a local HTTP proxy
3. Point your client — set `ANTHROPIC_BASE_URL` or `OPENAI_BASE_URL` to the local address
4. Inspect — sessions appear in real time with full structured traces

## Quick Start

```bash
# Anthropic (Claude Code)
export ANTHROPIC_BASE_URL=http://127.0.0.1:8888

# OpenAI (Codex CLI)
export OPENAI_BASE_URL=http://127.0.0.1:8889
```

## Supported Providers

| Provider | Protocol Adapter | Default Upstream |
|----------|-----------------|------------------|
| Claude Code | `anthropic-messages` | `https://api.anthropic.com` |
| Codex CLI | `openai-responses` | `https://chatgpt.com/backend-api/codex` |

## Architecture

```
src/
├── main/                    # Electron main process
│   ├── transport/           # HTTP listener + forwarder (protocol-unaware)
│   ├── providers/           # Provider definitions + protocol adapters
│   │   └── protocol-adapters/
│   │       ├── anthropic-messages/   # Normalize, inspect, match, timeline
│   │       └── openai-responses/     # Same structure for Codex
│   ├── pipeline/            # Capture pipeline + session resolver
│   ├── storage/             # SQLite repositories
│   └── queries/             # View model query services
├── preload/                 # Electron preload bridge (CJS)
├── renderer/                # React UI (Vite ESM)
│   ├── components/          # UI components (shadcn/ui based)
│   ├── stores/              # Zustand state management
│   └── hooks/               # Push event handlers
└── shared/                  # Cross-layer contracts + types
```

## Development

```bash
pnpm install      # Install dependencies
pnpm dev          # Run in dev mode
pnpm build        # Production build
pnpm typecheck    # Type check
pnpm test         # Run tests
pnpm dist:mac     # Build macOS .dmg
```

## Tech Stack

Electron 33 · React 19 · TypeScript · Vite · Zustand · shadcn/ui · Tailwind CSS 4 · better-sqlite3

## License

MIT
