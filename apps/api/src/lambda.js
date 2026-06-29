import { startApiServer } from "./server.js";

let serverPromise;

function normalizeLambdaPath(value = "/") {
  const path = String(value || "/");
  return `/${path}`.replace(/^\/+/, "/") || "/";
}

export function requestPath(event = {}) {
  const path = normalizeLambdaPath(event.rawPath || event.requestContext?.http?.path || event.path || "/");
  const query = event.rawQueryString || "";
  return query ? `${path}?${query}` : path;
}

function requestMethod(event = {}) {
  return event.requestContext?.http?.method || event.httpMethod || "GET";
}

function requestHeaders(event = {}) {
  const headers = { ...(event.headers ?? {}) };
  delete headers.host;
  delete headers.Host;
  return headers;
}

function requestBody(event = {}, method = "GET") {
  if (method === "GET" || method === "HEAD" || event.body == null) return undefined;
  return event.isBase64Encoded ? Buffer.from(event.body, "base64") : event.body;
}

async function apiBaseUrl() {
  if (!serverPromise) serverPromise = startApiServer({ port: 0 });
  const { port } = await serverPromise;
  return `http://127.0.0.1:${port}`;
}

export async function handler(event = {}) {
  const method = requestMethod(event).toUpperCase();
  const baseUrl = await apiBaseUrl();
  const response = await fetch(`${baseUrl}${requestPath(event)}`, {
    method,
    headers: requestHeaders(event),
    body: requestBody(event, method)
  });
  const body = await response.text();
  const headers = Object.fromEntries(response.headers.entries());
  return {
    statusCode: response.status,
    headers,
    body,
    isBase64Encoded: false
  };
}
