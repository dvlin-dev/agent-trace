import { describe, it, expect, afterEach } from "vitest";
import http from "node:http";
import { createProxyServer, type ProxyServer } from "../../src/main/proxy/server";
import type { RequestRecord } from "../../src/shared/types";

function createMockTarget(): Promise<{
  server: http.Server;
  port: number;
  close: () => Promise<void>;
}> {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on("data", (c) => chunks.push(c));
      req.on("end", () => {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ received: true, path: req.url }));
      });
    });
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address() as { port: number };
      resolve({
        server,
        port: addr.port,
        close: () =>
          new Promise((r) => server.close(() => r())),
      });
    });
  });
}

function httpRequest(
  url: string,
  options: { method?: string; body?: string; headers?: Record<string, string> } = {},
): Promise<{ statusCode: number; body: string; headers: http.IncomingHttpHeaders }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = http.request(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname + parsed.search,
        method: options.method || "GET",
        headers: options.headers,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          resolve({
            statusCode: res.statusCode || 0,
            body: Buffer.concat(chunks).toString("utf-8"),
            headers: res.headers,
          });
        });
      },
    );
    req.on("error", reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

describe("ProxyServer", () => {
  let mockTarget: Awaited<ReturnType<typeof createMockTarget>> | null = null;
  let proxy: ProxyServer | null = null;

  afterEach(async () => {
    if (proxy?.isRunning()) await proxy.stop();
    if (mockTarget) await mockTarget.close();
    mockTarget = null;
    proxy = null;
  });

  it("forwards requests and captures headers/body/status", async () => {
    mockTarget = await createMockTarget();
    const captured: RequestRecord[] = [];

    proxy = createProxyServer({
      targetUrl: `http://127.0.0.1:${mockTarget.port}`,
      port: 0,
      onRequest: (r) => captured.push(r),
      onError: () => {},
    });

    // Use port 0 — need to get actual port
    const { port } = await proxy.start();
    const res = await httpRequest(`http://127.0.0.1:${port}/v1/messages?query=1`, {
      method: "POST",
      body: JSON.stringify({ model: "claude-opus-4-6", messages: [] }),
      headers: { "content-type": "application/json" },
    });

    expect(res.statusCode).toBe(200);
    const parsed = JSON.parse(res.body);
    expect(parsed.received).toBe(true);
    expect(parsed.path).toBe("/v1/messages?query=1");

    // Wait a tick for the callback
    await new Promise((r) => setTimeout(r, 50));
    expect(captured).toHaveLength(1);
    expect(captured[0].method).toBe("POST");
    expect(captured[0].path).toBe("/v1/messages?query=1");
    expect(captured[0].statusCode).toBe(200);
    expect(captured[0].model).toBe("claude-opus-4-6");
    expect(captured[0].duration).toBeGreaterThanOrEqual(0);
    expect(captured[0].requestSize).toBeGreaterThan(0);
  });

  it("preserves request path without adding prefix", async () => {
    mockTarget = await createMockTarget();
    const captured: RequestRecord[] = [];

    proxy = createProxyServer({
      targetUrl: `http://127.0.0.1:${mockTarget.port}`,
      port: 0,
      onRequest: (r) => captured.push(r),
      onError: () => {},
    });

    const { port } = await proxy.start();
    await httpRequest(`http://127.0.0.1:${port}/v1/messages`);
    await new Promise((r) => setTimeout(r, 50));

    expect(captured[0].path).toBe("/v1/messages");
  });

  it("reports error on port conflict", async () => {
    const server1 = http.createServer();
    const port1: number = await new Promise((resolve) => {
      server1.listen(0, "127.0.0.1", () => {
        resolve((server1.address() as { port: number }).port);
      });
    });

    proxy = createProxyServer({
      targetUrl: "http://127.0.0.1:9999",
      port: port1,
      onRequest: () => {},
      onError: () => {},
    });

    await expect(proxy.start()).rejects.toThrow("already in use");
    server1.close();
  });

  it("updateTargetUrl changes forwarding destination", async () => {
    mockTarget = await createMockTarget();

    proxy = createProxyServer({
      targetUrl: "http://127.0.0.1:1", // initially invalid
      port: 0,
      onRequest: () => {},
      onError: () => {},
    });

    const { port } = await proxy.start();
    proxy.updateTargetUrl(`http://127.0.0.1:${mockTarget.port}`);

    const res = await httpRequest(`http://127.0.0.1:${port}/test`);
    expect(res.statusCode).toBe(200);
  });
});
