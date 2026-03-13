/**
 * Integration Harness Tests
 *
 * Validates the end-to-end data pipeline:
 *   HTTP request → Proxy capture → Session grouping → DB persistence → Retrieval
 *
 * Uses real HTTP servers and SQLite (in-memory) — no mocks at the boundary.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import http from "node:http";
import { createProxyServer, type ProxyServer } from "../../src/main/proxy/server";
import { SessionManager } from "../../src/main/session/session-manager";
import { HistoryStore } from "../../src/main/store/history-store";
import { createDatabase } from "../../src/main/store/database";
import type { RequestRecord } from "../../src/shared/types";
import type Database from "better-sqlite3";

// --- Test helpers ---

function getAvailablePort(): Promise<number> {
  return new Promise((resolve) => {
    const srv = http.createServer();
    srv.listen(0, () => {
      const port = (srv.address() as { port: number }).port;
      srv.close(() => resolve(port));
    });
  });
}

function makeClaudeBody(opts: {
  model?: string;
  system?: string;
  userMessage?: string;
  messages?: Array<{ role: string; content: string }>;
}): string {
  return JSON.stringify({
    model: opts.model ?? "claude-opus-4-6",
    system: opts.system ?? "You are a helpful assistant.",
    messages: opts.messages ?? [
      { role: "user", content: opts.userMessage ?? "Hello" },
    ],
    max_tokens: 1024,
    stream: false,
  });
}

function httpPost(
  url: string,
  path: string,
  body: string,
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = http.request(
      {
        hostname: u.hostname,
        port: u.port,
        path,
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": "test-key",
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () =>
          resolve({
            status: res.statusCode || 0,
            body: Buffer.concat(chunks).toString(),
          }),
        );
      },
    );
    req.on("error", reject);
    req.end(body);
  });
}

// --- Test suite ---

describe("End-to-End Pipeline: Proxy → Session → DB", () => {
  let targetServer: http.Server;
  let targetPort: number;
  let proxyPort: number;
  let proxy: ProxyServer;
  let db: Database.Database;
  let historyStore: HistoryStore;
  let sessionManager: SessionManager;
  let capturedRecords: RequestRecord[];

  beforeEach(async () => {
    capturedRecords = [];
    sessionManager = new SessionManager();
    db = createDatabase(":memory:");
    historyStore = new HistoryStore(db);

    // Start a mock target server that returns a Claude-like response
    targetPort = await getAvailablePort();
    targetServer = http.createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on("data", (c) => chunks.push(c));
      req.on("end", () => {
        const body = Buffer.concat(chunks).toString();
        let model = "claude-opus-4-6";
        try {
          model = JSON.parse(body).model || model;
        } catch {
          /* ignore */
        }

        res.writeHead(200, { "content-type": "application/json" });
        res.end(
          JSON.stringify({
            id: "msg_test",
            type: "message",
            role: "assistant",
            model,
            content: [{ type: "text", text: "Hello! How can I help?" }],
            usage: { input_tokens: 10, output_tokens: 8 },
          }),
        );
      });
    });
    await new Promise<void>((resolve) =>
      targetServer.listen(targetPort, "127.0.0.1", resolve),
    );

    // Start proxy wired to the full pipeline
    proxyPort = await getAvailablePort();
    proxy = createProxyServer({
      targetUrl: `http://127.0.0.1:${targetPort}`,
      port: proxyPort,
      onRequest: (record) => {
        // Full pipeline: session → persist → collect
        const sessionId = sessionManager.assignSession(record);
        record.sessionId = sessionId;
        historyStore.saveRequest(record);
        capturedRecords.push(record);
      },
      onError: (err) => {
        console.error("Proxy error in integration test:", err);
      },
    });
    await proxy.start();
  });

  afterEach(async () => {
    await proxy.stop();
    await new Promise<void>((resolve) => targetServer.close(() => resolve()));
    db.close();
  });

  it("captures a single request through the full pipeline", async () => {
    const body = makeClaudeBody({ userMessage: "What is 2+2?" });
    const result = await httpPost(
      `http://127.0.0.1:${proxyPort}`,
      "/v1/messages",
      body,
    );

    expect(result.status).toBe(200);
    expect(capturedRecords).toHaveLength(1);

    const record = capturedRecords[0]!;
    expect(record.sessionId).toBeTruthy();
    expect(record.method).toBe("POST");
    expect(record.path).toBe("/v1/messages");
    expect(record.model).toBe("claude-opus-4-6");
    expect(record.statusCode).toBe(200);
    expect(record.duration).toBeGreaterThan(0);
    expect(record.requestSize).toBeGreaterThan(0);
    expect(record.responseSize).toBeGreaterThan(0);

    // Verify DB persistence
    const sessions = historyStore.listSessions();
    expect(sessions).toHaveLength(1);
    expect(sessions[0]!.requestCount).toBe(1);
    expect(sessions[0]!.model).toBe("claude-opus-4-6");

    const requests = historyStore.listRequests(record.sessionId);
    expect(requests).toHaveLength(1);
    expect(requests[0]!.requestId).toBe(record.requestId);
  });

  it("groups multiple requests into the same session by system prompt", async () => {
    const system = "You are a coding assistant for TypeScript projects.";

    // Send 3 requests with the same system prompt
    for (let i = 0; i < 3; i++) {
      await httpPost(
        `http://127.0.0.1:${proxyPort}`,
        "/v1/messages",
        makeClaudeBody({ system, userMessage: `Question ${i}` }),
      );
    }

    expect(capturedRecords).toHaveLength(3);

    // All should be in the same session
    const sessionIds = new Set(capturedRecords.map((r) => r.sessionId));
    expect(sessionIds.size).toBe(1);

    const sessions = historyStore.listSessions();
    expect(sessions).toHaveLength(1);
    expect(sessions[0]!.requestCount).toBe(3);
  });

  it("separates requests with different system prompts into different sessions", async () => {
    await httpPost(
      `http://127.0.0.1:${proxyPort}`,
      "/v1/messages",
      makeClaudeBody({ system: "System prompt A" }),
    );
    await httpPost(
      `http://127.0.0.1:${proxyPort}`,
      "/v1/messages",
      makeClaudeBody({ system: "System prompt B" }),
    );

    expect(capturedRecords).toHaveLength(2);
    const sessionIds = new Set(capturedRecords.map((r) => r.sessionId));
    expect(sessionIds.size).toBe(2);

    const sessions = historyStore.listSessions();
    expect(sessions).toHaveLength(2);
  });

  it("persists full request/response data for retrieval", async () => {
    const body = makeClaudeBody({ userMessage: "Explain closures" });
    await httpPost(`http://127.0.0.1:${proxyPort}`, "/v1/messages", body);

    const record = capturedRecords[0]!;
    const retrieved = historyStore.getRequest(record.requestId);

    expect(retrieved).not.toBeNull();
    expect(retrieved!.requestBody).toContain("Explain closures");
    expect(retrieved!.responseBody).toContain("How can I help");
    expect(retrieved!.requestHeaders["content-type"]).toBe("application/json");
    expect(retrieved!.responseHeaders?.["content-type"]).toBe(
      "application/json",
    );
  });

  it("search finds requests by content", async () => {
    await httpPost(
      `http://127.0.0.1:${proxyPort}`,
      "/v1/messages",
      makeClaudeBody({ userMessage: "unique_search_term_xyz" }),
    );

    const results = historyStore.search("unique_search_term_xyz");
    expect(results.requests).toHaveLength(1);
    expect(results.requests[0]!.requestBody).toContain("unique_search_term_xyz");
  });

  it("proxy transparently forwards to target (client gets correct response)", async () => {
    const result = await httpPost(
      `http://127.0.0.1:${proxyPort}`,
      "/v1/messages",
      makeClaudeBody({}),
    );

    expect(result.status).toBe(200);
    const parsed = JSON.parse(result.body);
    expect(parsed.type).toBe("message");
    expect(parsed.role).toBe("assistant");
    expect(parsed.content[0].text).toBe("Hello! How can I help?");
  });

  it("handles concurrent requests without data corruption", async () => {
    const promises = Array.from({ length: 5 }, (_, i) =>
      httpPost(
        `http://127.0.0.1:${proxyPort}`,
        "/v1/messages",
        makeClaudeBody({
          system: "Shared system prompt",
          userMessage: `Concurrent request ${i}`,
        }),
      ),
    );

    const results = await Promise.all(promises);
    for (const r of results) {
      expect(r.status).toBe(200);
    }

    expect(capturedRecords).toHaveLength(5);

    // All should be same session (same system prompt)
    const sessionIds = new Set(capturedRecords.map((r) => r.sessionId));
    expect(sessionIds.size).toBe(1);

    // All request IDs should be unique
    const requestIds = capturedRecords.map((r) => r.requestId);
    expect(new Set(requestIds).size).toBe(5);
  });
});

describe("SSE Streaming Pipeline", () => {
  let sseServer: http.Server;
  let ssePort: number;
  let proxyPort: number;
  let proxy: ProxyServer;
  let capturedRecords: RequestRecord[];

  beforeEach(async () => {
    capturedRecords = [];

    // SSE target server
    ssePort = await getAvailablePort();
    sseServer = http.createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on("data", (c) => chunks.push(c));
      req.on("end", () => {
        res.writeHead(200, {
          "content-type": "text/event-stream",
          "cache-control": "no-cache",
          connection: "keep-alive",
        });

        // Send SSE events
        const events = [
          'event: content_block_delta\ndata: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Hello"}}\n\n',
          'event: content_block_delta\ndata: {"type":"content_block_delta","delta":{"type":"text_delta","text":" world"}}\n\n',
          "event: message_stop\ndata: {}\n\n",
        ];

        let i = 0;
        const timer = setInterval(() => {
          if (i < events.length) {
            res.write(events[i]);
            i++;
          } else {
            clearInterval(timer);
            res.end();
          }
        }, 10);
      });
    });
    await new Promise<void>((resolve) =>
      sseServer.listen(ssePort, "127.0.0.1", resolve),
    );

    proxyPort = await getAvailablePort();
    proxy = createProxyServer({
      targetUrl: `http://127.0.0.1:${ssePort}`,
      port: proxyPort,
      onRequest: (record) => capturedRecords.push(record),
      onError: () => {},
    });
    await proxy.start();
  });

  afterEach(async () => {
    await proxy.stop();
    await new Promise<void>((resolve) => sseServer.close(() => resolve()));
  });

  it("streams SSE events in real-time and collects full response", async () => {
    const receivedChunks: string[] = [];

    await new Promise<void>((resolve, reject) => {
      const req = http.request(
        {
          hostname: "127.0.0.1",
          port: proxyPort,
          path: "/v1/messages",
          method: "POST",
          headers: { "content-type": "application/json" },
        },
        (res) => {
          expect(res.headers["content-type"]).toContain("text/event-stream");

          res.on("data", (chunk: Buffer) => {
            receivedChunks.push(chunk.toString());
          });
          res.on("end", resolve);
          res.on("error", reject);
        },
      );
      req.end(
        makeClaudeBody({ model: "claude-sonnet-4-6" }),
      );
    });

    // Client received streaming chunks
    expect(receivedChunks.length).toBeGreaterThanOrEqual(1);
    const fullResponse = receivedChunks.join("");
    expect(fullResponse).toContain("Hello");
    expect(fullResponse).toContain("world");

    // Proxy captured the full collected response
    expect(capturedRecords).toHaveLength(1);
    const record = capturedRecords[0]!;
    expect(record.responseBody).toContain("Hello");
    expect(record.responseBody).toContain("world");
    expect(record.model).toBe("claude-sonnet-4-6");
  });
});
