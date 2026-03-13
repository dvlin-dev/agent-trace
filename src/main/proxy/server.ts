import http from "node:http";
import { forwardRequest } from "./forward";
import { StreamCollector } from "./stream-collector";
import type { RequestRecord } from "../../shared/types";

export interface ProxyOptions {
  targetUrl: string;
  port: number;
  onRequest: (record: RequestRecord) => void;
  onError: (error: string) => void;
}

export interface ProxyServer {
  start(): Promise<{ address: string; port: number }>;
  stop(): Promise<void>;
  isRunning(): boolean;
  updateTargetUrl(url: string): void;
}

export function createProxyServer(options: ProxyOptions): ProxyServer {
  let targetUrl = options.targetUrl;
  let server: http.Server | null = null;
  let running = false;

  function extractModel(body: string | null): string | null {
    if (!body) return null;
    try {
      const parsed = JSON.parse(body);
      return typeof parsed.model === "string" ? parsed.model : null;
    } catch {
      return null;
    }
  }

  function isSSE(contentType: string | undefined): boolean {
    return !!contentType && contentType.includes("text/event-stream");
  }

  async function handleRequest(
    req: http.IncomingMessage,
    res: http.ServerResponse,
  ): Promise<void> {
    const startTime = Date.now();
    const requestId = crypto.randomUUID();

    // Collect request body
    const bodyChunks: Buffer[] = [];
    for await (const chunk of req) {
      bodyChunks.push(chunk as Buffer);
    }
    const bodyBuffer = Buffer.concat(bodyChunks);
    const requestBody = bodyBuffer.length > 0 ? bodyBuffer.toString("utf-8") : null;
    const model = extractModel(requestBody);

    const requestHeaders: Record<string, string> = {};
    for (const [key, value] of Object.entries(req.headers)) {
      if (value) {
        requestHeaders[key] = Array.isArray(value) ? value.join(", ") : value;
      }
    }
    // Capture socket info for session tracking
    requestHeaders["x-proxy-remote-port"] = String(req.socket.remotePort ?? "");
    requestHeaders["x-proxy-remote-addr"] = req.socket.remoteAddress ?? "";

    try {
      const proxyRes = await forwardRequest({
        targetUrl,
        method: req.method || "GET",
        path: req.url || "/",
        headers: req.headers,
        body: bodyBuffer,
      });

      const responseHeaders: Record<string, string> = {};
      for (const [key, value] of Object.entries(proxyRes.headers)) {
        if (value) {
          responseHeaders[key] = Array.isArray(value) ? value.join(", ") : value;
        }
      }

      if (isSSE(proxyRes.headers["content-type"])) {
        // SSE: stream through to client, collect on the side
        res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);

        const collector = new StreamCollector();
        proxyRes.on("data", (chunk: Buffer) => {
          collector.push(chunk);
          res.write(chunk);
        });

        proxyRes.on("end", () => {
          res.end();
          const duration = Date.now() - startTime;
          const record: RequestRecord = {
            requestId,
            sessionId: "", // assigned later by session manager
            method: req.method || "GET",
            path: req.url || "/",
            timestamp: new Date(startTime).toISOString(),
            duration,
            model,
            requestHeaders,
            requestBody,
            responseHeaders,
            responseBody: collector.getContent(),
            statusCode: proxyRes.statusCode || 200,
            requestSize: bodyBuffer.length,
            responseSize: collector.getSize(),
          };
          options.onRequest(record);
        });

        proxyRes.on("error", (err) => {
          res.end();
          options.onError(`SSE stream error: ${err.message}`);
        });
      } else {
        // Non-SSE: buffer the entire response
        const resChunks: Buffer[] = [];
        proxyRes.on("data", (chunk: Buffer) => {
          resChunks.push(chunk);
        });

        proxyRes.on("end", () => {
          const resBuffer = Buffer.concat(resChunks);
          res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
          res.end(resBuffer);

          const duration = Date.now() - startTime;
          const record: RequestRecord = {
            requestId,
            sessionId: "",
            method: req.method || "GET",
            path: req.url || "/",
            timestamp: new Date(startTime).toISOString(),
            duration,
            model,
            requestHeaders,
            requestBody,
            responseHeaders,
            responseBody: resBuffer.toString("utf-8"),
            statusCode: proxyRes.statusCode || 200,
            requestSize: bodyBuffer.length,
            responseSize: resBuffer.length,
          };
          options.onRequest(record);
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      options.onError(`Proxy forward error: ${message}`);
      if (!res.headersSent) {
        res.writeHead(502, { "content-type": "text/plain" });
        res.end(`Proxy error: ${message}`);
      }
    }
  }

  return {
    start() {
      return new Promise((resolve, reject) => {
        if (running) {
          reject(new Error("Proxy server is already running"));
          return;
        }

        server = http.createServer((req, res) => {
          handleRequest(req, res).catch((err) => {
            options.onError(`Unhandled proxy error: ${err}`);
          });
        });

        server.on("error", (err: NodeJS.ErrnoException) => {
          if (err.code === "EADDRINUSE") {
            reject(
              new Error(`Port ${options.port} is already in use`),
            );
          } else {
            reject(err);
          }
        });

        server.listen(options.port, "127.0.0.1", () => {
          running = true;
          const addr = server!.address() as { port: number };
          resolve({
            address: `http://127.0.0.1:${addr.port}`,
            port: addr.port,
          });
        });
      });
    },

    stop() {
      return new Promise((resolve, reject) => {
        if (!server || !running) {
          resolve();
          return;
        }
        server.close((err) => {
          running = false;
          server = null;
          if (err) reject(err);
          else resolve();
        });
      });
    },

    isRunning() {
      return running;
    },

    updateTargetUrl(url: string) {
      targetUrl = url;
    },
  };
}
