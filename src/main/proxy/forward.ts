import http from "node:http";
import https from "node:https";
import { URL } from "node:url";

export interface ForwardOptions {
  targetUrl: string;
  method: string;
  path: string;
  headers: http.IncomingHttpHeaders;
  body: Buffer;
}

export function forwardRequest(
  options: ForwardOptions,
): Promise<http.IncomingMessage> {
  return new Promise((resolve, reject) => {
    const target = new URL(options.targetUrl);
    const isHttps = target.protocol === "https:";
    const transport = isHttps ? https : http;

    const reqOptions: http.RequestOptions = {
      hostname: target.hostname,
      port: target.port || (isHttps ? 443 : 80),
      path: options.path,
      method: options.method,
      headers: {
        ...options.headers,
        host: target.host,
      },
    };

    const proxyReq = transport.request(reqOptions, (proxyRes) => {
      resolve(proxyRes);
    });

    proxyReq.on("error", reject);
    proxyReq.end(options.body);
  });
}
