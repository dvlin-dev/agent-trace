# Claude Code Debug

[中文](./README.zh-CN.md)

A desktop app that intercepts Claude Code's API traffic, letting you see exactly what happens under the hood — system prompts, tool calls, thinking blocks, and the full conversation flow.

## What It Does

Claude Code (Anthropic's CLI) sends requests to the Claude API. This app sits between them as a transparent proxy, capturing every request and response without modifying anything.

```text
Claude Code  ──▶  Proxy (localhost:8888)  ──▶  Anthropic API
                         │
                   Capture & Display
                         │
                   Desktop App UI
```

## What Data You Can See

| Data | Source | How It's Captured |
|------|--------|-------------------|
| **System Prompt** | `request.body.system` | Full system prompt including Claude Code's injected instructions, memory, CLAUDE.md content |
| **Messages** | `request.body.messages` | Complete conversation history — every user message, assistant response, tool calls and results |
| **Tools** | `request.body.tools` | All tool definitions Claude Code registers (Read, Write, Bash, Glob, Grep, etc.) |
| **Thinking** | `response` SSE stream | Extended thinking blocks (`thinking_delta` events) |
| **Tool Use** | `response` SSE stream | Which tools the assistant calls, with what arguments |
| **Model & Metadata** | `request.body.model` + `request.body.metadata` | Model used, session identifier, token usage |
| **Headers** | `request.headers` | API version, SDK version, beta features enabled |
| **Timing** | Measured by proxy | Request duration, request/response sizes |

## How It Works

**Proxy Layer** — A Node.js HTTP server on `127.0.0.1:8888`. Receives Claude Code requests, forwards them to the Anthropic API, and streams responses back. SSE (Server-Sent Events) responses are streamed through in real-time while being collected on the side for storage.

**Session Grouping** — Claude Code embeds a session UUID in `metadata.user_id` of every request (`user_<hash>_account__session_<uuid>`). The proxy extracts this UUID to group requests into conversations. For non-Claude-Code clients, it falls back to content-based matching (system prompt hash + message superset detection).

**Storage** — All captured data is persisted to a local SQLite database (`~/Library/Application Support/claude-code-debug/history.db`). Auto-prunes after 2000 requests.

**UI** — Electron + React app with a ChatGPT-style conversation view. Left sidebar shows sessions, right side shows the rendered conversation with an optional Inspector panel for raw request/response data.

## Setup

```bash
# Install
pnpm install

# Run in dev mode
pnpm dev

# Build for production
pnpm build
```

Configure Claude Code to use the proxy:

```bash
# Set the proxy as Claude Code's API endpoint
export ANTHROPIC_BASE_URL=http://127.0.0.1:8888
```

Then use Claude Code normally. All requests will appear in the app.

## Tech Stack

Electron 33 · React 19 · TypeScript · Zustand · shadcn/ui · better-sqlite3 · electron-vite
