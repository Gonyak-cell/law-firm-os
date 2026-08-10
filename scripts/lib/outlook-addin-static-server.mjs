import { createServer } from "node:http";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { readFileSync } from "node:fs";
import {
  OUTLOOK_ADDIN_STATIC_PROFILES,
  resolveOutlookAddinStaticPath,
} from "./outlook-addin-static-resolver.mjs";

export { OUTLOOK_ADDIN_STATIC_PROFILES, resolveOutlookAddinStaticPath };

const LOOPBACK_HOSTS = Object.freeze(new Set([
  "127.0.0.1",
  "::1",
  "localhost",
]));

function isLoopbackAddress(address) {
  const normalized = String(address ?? "").toLowerCase().split("%", 1)[0];
  if (isIP(normalized) === 4) return normalized.split(".", 1)[0] === "127";
  return normalized === "::1";
}

async function assertLoopbackHost(host) {
  const normalizedHost = typeof host === "string" ? host.toLowerCase() : "";
  if (!LOOPBACK_HOSTS.has(normalizedHost)) {
    throw new Error("OUTLOOK_ADDIN_STATIC_SERVER_LOOPBACK_HOST_REQUIRED");
  }
  if (normalizedHost === "localhost") {
    let addresses;
    try {
      addresses = await lookup(normalizedHost, { all: true, verbatim: true });
    } catch {
      throw new Error("OUTLOOK_ADDIN_STATIC_SERVER_LOOPBACK_HOST_REQUIRED");
    }
    if (!addresses.length || addresses.some(({ address }) => !isLoopbackAddress(address))) {
      throw new Error("OUTLOOK_ADDIN_STATIC_SERVER_LOOPBACK_HOST_REQUIRED");
    }
  }
  return normalizedHost;
}

function writeNotFound(response) {
  response.writeHead(404, {
    "cache-control": "no-store",
    "content-type": "text/plain; charset=utf-8",
  });
  response.end("not found");
}

/** Start the tiny native static server used by both local browser proofs. */
export async function startOutlookAddinStaticServer({
  distRoot,
  host = "127.0.0.1",
  port = 0,
} = {}) {
  const bindHost = await assertLoopbackHost(host);
  const server = createServer((request, response) => {
    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405, {
        allow: "GET, HEAD",
        "cache-control": "no-store",
        "content-type": "text/plain; charset=utf-8",
      });
      response.end("method not allowed");
      return;
    }
    const resolved = resolveOutlookAddinStaticPath(request.url ?? "", { distRoot });
    if (!resolved) {
      writeNotFound(response);
      return;
    }
    try {
      const body = readFileSync(resolved.filePath);
      response.writeHead(200, {
        "cache-control": "no-store",
        "content-length": body.byteLength,
        "content-type": resolved.contentType,
      });
      if (request.method === "HEAD") response.end();
      else response.end(body);
    } catch {
      writeNotFound(response);
    }
  });

  return new Promise((resolvePromise, reject) => {
    server.once("error", reject);
    server.listen(port, bindHost, () => {
      const address = server.address();
      if (
        !address
        || typeof address === "string"
        || !isLoopbackAddress(address.address)
      ) {
        server.close();
        reject(new Error("OUTLOOK_ADDIN_STATIC_SERVER_LOOPBACK_ADDRESS_UNAVAILABLE"));
        return;
      }
      resolvePromise({
        server,
        origin: `http://${bindHost.includes(":") ? `[${bindHost}]` : bindHost}:${address.port}`,
      });
    });
  });
}
