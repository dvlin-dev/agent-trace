import { describe, it, expect, afterEach } from "vitest";
import http from "node:http";
import { createProxyServer, type ProxyServer } from "../../src/main/proxy/server";
import type { RequestRecord } from "../../src/shared/types";

function createSSEServer(): Promise<{
  server: http.Server;
  port: number;
  close: () => Promise<void>;
}> {
  return new Promise((resolve) => {
    const server = http.createServer((_req, res) => {
      res.writeHead(200, {
        "content-type": "text/event-stream",
        "cache-control": "no-cache",
        connection: "keep-alive",
      });

      const events = [
        'event: message_start\ndata: {"type":"message_start"}\n\n',
        'event: content_block_delta\ndata: {"type":"content_block_delta","delta":{"text":"Hello"}}\n\n',
        'event: content_block_delta\ndata: {"type":"content_block_delta","delta":{"text":" world"}}\n\n',
        'event: message_stop\ndata: {"type":"message_stop"}\n\n',
      ];

      let i = 0;
      const interval = setInterval(() => {
        if (i < events.length) {
          res.write(events[i]);
          i++;
        } else {
          clearInterval(interval);
          res.end();
        }
      }, 20);
    });

    server.listen(0, "127.0.0.1", () => {
      const addr = server.address() as { port: number };
      resolve({
        server,
        port: addr.port,
        close: () => new Promise((r) => server.close(() => r())),
      });
    });
  });
}

describe("Proxy SSE Streaming", () => {
  let sseServer: Awaited<ReturnType<typeof createSSEServer>> | null = null;
  let proxy: ProxyServer | null = null;

  afterEach(async () => {
    if (proxy?.isRunning()) await proxy.stop();
    if (sseServer) await sseServer.close();
    sseServer = null;
    proxy = null;
  });

  it("streams SSE events in real-time to client", async () => {
    sseServer = await createSSEServer();
    const captured: RequestRecord[] = [];

    proxy = createProxyServer({
      targetUrl: `http://127.0.0.1:${sseServer.port}`,
      port: 0,
      onRequest: (r) => captured.push(r),
      onError: () => {},
    });

    const { port } = await proxy.start();

    // Make request and collect chunks as they arrive
    const receivedChunks: string[] = [];

    await new Promise<void>((resolve, reject) => {
      const req = http.request(
        {
          hostname: "127.0.0.1",
          port,
          path: "/v1/messages",
          method: "POST",
          headers: { "content-type": "application/json" },
        },
        (res) => {
          expect(res.headers["content-type"]).toBe("text/event-stream");

          res.on("data", (chunk: Buffer) => {
            receivedChunks.push(chunk.toString("utf-8"));
          });
          res.on("end", resolve);
          res.on("error", reject);
        },
      );
      req.on("error", reject);
      req.write(JSON.stringify({ model: "claude-opus-4-6", messages: [] }));
      req.end();
    });

    // Verify chunks arrived incrementally (not all at once)
    expect(receivedChunks.length).toBeGreaterThan(1);

    // Wait for callback
    await new Promise((r) => setTimeout(r, 50));

    // Verify captured record has reassembled content
    expect(captured).toHaveLength(1);
    expect(captured[0].responseBody).toContain("message_start");
    expect(captured[0].responseBody).toContain("message_stop");
    expect(captured[0].responseBody).toContain("Hello");
    expect(captured[0].responseBody).toContain(" world");
    expect(captured[0].statusCode).toBe(200);
    expect(captured[0].responseSize).toBeGreaterThan(0);
  });

  it("extracts model from request body", async () => {
    sseServer = await createSSEServer();
    const captured: RequestRecord[] = [];

    proxy = createProxyServer({
      targetUrl: `http://127.0.0.1:${sseServer.port}`,
      port: 0,
      onRequest: (r) => captured.push(r),
      onError: () => {},
    });

    const { port } = await proxy.start();

    await new Promise<void>((resolve, reject) => {
      const req = http.request(
        {
          hostname: "127.0.0.1",
          port,
          path: "/v1/messages",
          method: "POST",
          headers: { "content-type": "application/json" },
        },
        (res) => {
          res.on("data", () => {});
          res.on("end", resolve);
          res.on("error", reject);
        },
      );
      req.on("error", reject);
      req.write(JSON.stringify({ model: "claude-sonnet-4-6", messages: [] }));
      req.end();
    });

    await new Promise((r) => setTimeout(r, 50));
    expect(captured[0].model).toBe("claude-sonnet-4-6");
  });
});
