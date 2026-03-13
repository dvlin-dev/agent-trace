# AGENT.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Electron desktop app that intercepts Claude Code API traffic via a local HTTP proxy (127.0.0.1:8888), captures requests/responses, groups them into conversations, and renders them in a chat-style UI.

## Development Commands

```bash
# Development
pnpm dev              # Run in dev mode (auto-rebuilds better-sqlite3 for Electron)
pnpm build            # Production build
pnpm typecheck        # Type check both renderer and node code

# Testing
pnpm test             # Run all Vitest tests (requires system Node build of better-sqlite3)
pnpm test:watch       # Watch mode
pnpm harness          # Run harness tests only (structural + integration)
pnpm e2e              # Run Playwright e2e tests

# Packaging
pnpm pack             # Build and package (no distribution)
pnpm dist:mac         # Build macOS .dmg and .zip
pnpm release:mac      # Full release: bump version, tag, push (triggers CI)

# Native module rebuilds
pnpm rebuild:electron # Rebuild better-sqlite3 for Electron (auto-runs in predev)
pnpm rebuild:node     # Rebuild better-sqlite3 for system Node (needed before pnpm test)
```

## Architecture

### Triple Build System

Electron requires three separate builds (configured in `electron.vite.config.ts`):

1. **Main** (CJS) — `src/main/index.ts` — Node.js runtime, `better-sqlite3` externalized
2. **Preload** (CJS) — `src/preload/index.ts` — **Must be CJS** for Electron sandbox
3. **Renderer** (ESM) — `src/renderer/src/main.tsx` — React app, Vite dev server in dev

### Data Flow

```
Claude Code → Proxy (server.ts) → Forward (forward.ts) → Anthropic API
                    ↓
              Capture request/response
                    ↓
         SessionManager (session-manager.ts)
                    ↓
         HistoryStore (history-store.ts) → SQLite
                    ↓
              IPC → Renderer → Zustand → React
```

### Session Grouping Strategy

Priority order for grouping requests into conversations:

1. **metadata.user_id** — Claude Code embeds `_session_<UUID>` in every request
2. **System hash + message superset** — Same system prompt AND messages grow
3. **Message superset only** — Messages grow regardless of system prompt
4. **No match** — Create new session

### Key Directories

- `src/shared/` — Types and utilities used by both main and renderer
  - `types.ts` — Core interfaces: AppSettings, SessionSummary, RequestRecord
  - `defaults.ts` — Constants: DEFAULT_PROXY_PORT=8888, MAX_REQUESTS=2000
  - `ipc-channels.ts` — IPC channel name constants
- `src/main/proxy/` — HTTP proxy implementation
  - `server.ts` — HTTP server, SSE streaming, request capture
  - `forward.ts` — Forward requests to target (http/https auto-detect)
  - `stream-collector.ts` — Buffer SSE chunks for storage
- `src/main/session/` — Session grouping logic
  - `session-manager.ts` — Assign requests to sessions
  - `derive-session.ts` — Content-based matching fallback
- `src/main/store/` — Data persistence
  - `database.ts` — SQLite initialization and schema
  - `history-store.ts` — Request/session CRUD operations
  - `settings-store.ts` — JSON settings file read/write
- `src/renderer/src/stores/` — Zustand state management
  - `app-store.ts` — Settings, listening state, proxy address
  - `session-store.ts` — Session list, selection, search
  - `request-store.ts` — Request list, inspector, raw mode

## Critical Gotchas

### better-sqlite3 Native Module

- **Electron build**: `electron-rebuild` compiles for Electron's Node version (auto-runs in `predev`)
- **System Node build**: `node-gyp rebuild` compiles for system Node (required before `pnpm test`)
- If tests fail with native module errors, run `pnpm rebuild:node` first

### Preload Must Be CJS

- Electron sandbox requires CommonJS format
- Output format enforced in `electron.vite.config.ts`
- Main process references `../preload/index.js` (not `.mjs`)

### react-resizable-panels v4 API

- Numbers = pixels, strings = percentages
- Use `defaultSize="25%"` not `defaultSize={25}`
- Use `orientation` prop, not `direction`

## Storage Locations

- **SQLite database**: `~/Library/Application Support/claude-code-debug/history.db` (macOS)
- **Settings file**: `~/Library/Application Support/claude-code-debug/settings.json`
- **Auto-prunes**: After 2000 requests (MAX_REQUESTS constant)

## Release Process

Only macOS releases are currently supported:

1. Run `./scripts/release.sh <version>` locally
2. Script bumps version, commits, tags, and pushes
3. GitHub Actions (`.github/workflows/release-macos.yml`) builds, signs, notarizes
4. Artifacts uploaded to GitHub Releases: `.dmg`, `.zip`, `latest-mac.yml`, blockmaps
5. App auto-updates via `electron-updater` + GitHub provider

Required GitHub secrets for signing/notarization:
- `CSC_LINK` — Developer ID Application .p12 (base64)
- `CSC_KEY_PASSWORD` — .p12 password
- `APPLE_API_KEY` — App Store Connect API key .p8
- `APPLE_API_KEY_ID` — API key ID
- `APPLE_API_ISSUER` — Issuer ID

## Proxy Configuration

Users configure Claude Code to use the proxy:

```bash
export ANTHROPIC_BASE_URL=http://127.0.0.1:8888
```

The proxy preserves the TARGET_URL pathname and appends the original request path:
- TARGET_URL: `http://example.com/api`
- Request: `/v1/messages?beta=true`
- Forwarded to: `http://example.com/api/v1/messages?beta=true`
