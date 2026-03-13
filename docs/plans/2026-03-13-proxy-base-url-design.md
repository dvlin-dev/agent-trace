# Proxy Base URL Joining Design

**日期:** 2026-03-13

## 目标

修复代理转发逻辑，使 `TARGET_URL` 被视为完整的 base URL，而不是只取主机和端口。用户填写的 pathname 必须被保留，并与 Claude Code 发来的原始请求路径做标准化拼接。

## 问题

当前实现只从 `TARGET_URL` 里读取：

- protocol
- hostname
- port

然后直接把原始 `req.url` 作为最终请求路径，因此：

- `http://host/api` + `/v1/messages?beta=true`

会被错误转发成：

- `http://host/v1/messages?beta=true`

而不是：

- `http://host/api/v1/messages?beta=true`

## 设计原则

- 不对 `/api`、`/v1`、`/messages` 做任何业务特判
- 用户填写什么 base URL，就完整保留什么 base URL 的 pathname
- 原始请求 path 和 query 必须保持不变
- 自动兼容 base URL 是否带尾 `/`
- 自动兼容请求 path 是否以 `/` 开头

## 方案对比

### 方案 A：保留 base pathname，做标准化拼接

规则：

- base pathname 去掉多余尾 `/`
- request path 保证以 `/` 开头
- query string 原样保留

优点：

- 符合用户直觉
- 支持任意网关前缀
- 实现简单、稳定

缺点：

- 改变了当前“忽略 pathname”的历史行为

### 方案 B：增加开关，选择是否保留 pathname

优点：

- 兼容旧行为

缺点：

- 增加配置复杂度
- 没有必要

### 方案 C：只支持域名，不允许带 pathname

优点：

- 实现最简单

缺点：

- 不满足真实网关接入场景

**结论：采用方案 A。**

## 行为定义

输入：

- `TARGET_URL = http://host/api`
- `req.url = /v1/messages?beta=true`

输出：

- `http://host/api/v1/messages?beta=true`

输入：

- `TARGET_URL = http://host/api/`
- `req.url = /v1/messages?beta=true`

输出：

- `http://host/api/v1/messages?beta=true`

输入：

- `TARGET_URL = http://host`
- `req.url = /v1/messages?beta=true`

输出：

- `http://host/v1/messages?beta=true`

## 实现点

- 在 `src/main/proxy/forward.ts` 内新增通用 URL 拼接函数
- `http` / `https` 请求时不再直接用 `req.url`
- 增加单元测试覆盖：
  - 无前缀
  - 有前缀
  - 有尾斜杠
  - query 保留

## 验证

- 代理单元测试通过
- 全量测试通过
- 构建通过
- 发布新版本
