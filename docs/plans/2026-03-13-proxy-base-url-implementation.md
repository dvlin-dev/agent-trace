# Proxy Base URL Joining Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 修复代理转发路径拼接，保留用户配置的 `TARGET_URL` pathname 并与原始请求路径正确拼接。

**Architecture:** 在代理转发层集中实现一个纯函数负责 base URL 和 request path 的标准化拼接，`server` 侧不做业务特判。测试直接验证最终转发到 mock target 的路径，确保对尾斜杠和 query 都稳定。

**Tech Stack:** TypeScript, Node HTTP/HTTPS, Vitest

---

### Task 1: 写失败测试

**Files:**
- Modify: `tests/unit/proxy-server.test.ts`
- Test: `tests/unit/proxy-server.test.ts`

**Step 1: 写失败测试**

- 验证 `http://host/api` + `/v1/messages?beta=true` 被转发成 `/api/v1/messages?beta=true`
- 验证 `http://host/api/` 也能得到同样结果

**Step 2: 运行测试确认失败**

Run: `pnpm exec vitest run tests/unit/proxy-server.test.ts`

### Task 2: 实现通用拼接逻辑

**Files:**
- Modify: `src/main/proxy/forward.ts`
- Test: `tests/unit/proxy-server.test.ts`

**Step 1: 写最小实现**

- 提取 `joinTargetPath` 一类纯函数
- 保留 base pathname
- 标准化尾斜杠与前导斜杠
- 保留 query string

**Step 2: 运行测试确认通过**

Run: `pnpm exec vitest run tests/unit/proxy-server.test.ts`

### Task 3: 更新说明文档

**Files:**
- Modify: `docs/release/desktop-release-runbook.md`

**Step 1: 补充 TARGET_URL 规则**

- 明确说明可填写带前缀的 base URL
- 举例说明 `/api` 之类前缀会被保留

### Task 4: 全量验证与发布

**Files:**
- Verify only

**Step 1: 运行类型检查**

Run: `pnpm typecheck`

**Step 2: 运行全量测试**

Run: `pnpm test`

**Step 3: 运行构建**

Run: `pnpm build`

**Step 4: 发布**

Run: `bash ./scripts/release.sh <version>`
