import { createServer } from "node:http";

const objects = new Map();
const scenarios = new Map();
let version = 0;

function xmlEscape(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function sendXml(response, statusCode, xml, headers = {}) {
  const body = Buffer.from(xml);
  response.writeHead(statusCode, {
    "content-length": String(body.byteLength),
    "content-type": "application/xml",
    ...headers,
  });
  response.end(body);
}

function sendError(response, statusCode, code, message = code) {
  sendXml(response, statusCode,
    `<Error><Code>${xmlEscape(code)}</Code><Message>${xmlEscape(message)}</Message></Error>`);
}

function requestKey(request) {
  const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  const separator = pathname.indexOf("/", 1);
  return separator === -1 ? "" : pathname.slice(separator + 1);
}

function scenarioFor(key) {
  for (const [prefix, scenario] of scenarios) {
    if (key === prefix || key.startsWith(`${prefix}/`)) return scenario;
  }
  return null;
}

function objectHeaders(object) {
  return {
    "content-length": String(object.body.byteLength),
    "content-type": object.contentType,
    etag: object.etag,
    "x-amz-version-id": object.versionId,
    ...Object.fromEntries(Object.entries(object.metadata).map(([name, value]) => [
      `x-amz-meta-${name}`, value,
    ])),
  };
}

async function requestBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

function governanceUnset(response) {
  sendError(response, 404, "NoSuchObjectLockConfiguration");
}

function accessDenied(response, message) {
  sendError(response, 403, "AccessDenied", message);
}

async function putObject(request, response, key, scenario) {
  if (request.headers["if-none-match"] === "*" && objects.has(key)) {
    sendError(response, 412, "PreconditionFailed");
    return;
  }
  const body = await requestBody(request);
  const metadata = Object.fromEntries(Object.entries(request.headers)
    .filter(([name]) => name.startsWith("x-amz-meta-"))
    .map(([name, value]) => [name.slice("x-amz-meta-".length), String(value)]));
  const object = {
    body,
    contentType: request.headers["content-type"] ?? "application/octet-stream",
    metadata,
    etag: `"${request.headers["x-amz-meta-lawos-sha256"]?.slice(0, 32) ?? "local"}"`,
    versionId: `v${++version}`,
    legalHold: "OFF",
    retention: scenario.defaultRetentionUntil
      ? { Mode: "GOVERNANCE", RetainUntilDate: new Date(scenario.defaultRetentionUntil) }
      : null,
  };
  objects.set(key, object);
  response.writeHead(200, { etag: object.etag, "x-amz-version-id": object.versionId });
  response.end();
}

async function putGovernance(request, response, object, scenario, kind) {
  const body = (await requestBody(request)).toString("utf8");
  if (kind === "legal-hold") {
    object.legalHold = /<Status>\s*ON\s*<\/Status>/u.test(body) ? "ON" : "OFF";
  } else {
    if (scenario.retentionFailurePending) {
      scenario.retentionFailurePending = false;
      sendError(response, 400, "InvalidRequest", "synthetic retention failure");
      return;
    }
    const mode = /<Mode>\s*([^<]+)\s*<\/Mode>/u.exec(body)?.[1];
    const retainUntil = /<RetainUntilDate>\s*([^<]+)\s*<\/RetainUntilDate>/u.exec(body)?.[1];
    if (object.retention && new Date(retainUntil).getTime() < object.retention.RetainUntilDate.getTime()
        && request.headers["x-amz-bypass-governance-retention"] !== "true") {
      accessDenied(response, "governance retention cannot be shortened without bypass authority");
      return;
    }
    object.retention = { Mode: mode, RetainUntilDate: new Date(retainUntil) };
  }
  response.writeHead(200);
  response.end();
}

function getGovernance(response, object, kind) {
  if (kind === "legal-hold") {
    if (object.legalHold === "OFF") return governanceUnset(response);
    sendXml(response, 200, `<LegalHold><Status>${object.legalHold}</Status></LegalHold>`);
    return;
  }
  if (!object.retention) return governanceUnset(response);
  sendXml(response, 200, `<Retention><Mode>${object.retention.Mode}</Mode>`
    + `<RetainUntilDate>${object.retention.RetainUntilDate.toISOString()}</RetainUntilDate></Retention>`);
}

function deleteObject(request, response, key, object, scenario) {
  if (scenario.deleteFailurePending) {
    scenario.deleteFailurePending = false;
    accessDenied(response, "synthetic delete denial");
    return;
  }
  const retained = object?.retention?.RetainUntilDate?.getTime() > new Date(scenario.now()).getTime();
  if (retained && request.headers["x-amz-bypass-governance-retention"] !== "true") {
    accessDenied(response, "governance retention blocks delete");
    return;
  }
  objects.delete(key);
  response.writeHead(204);
  response.end();
}

async function handle(request, response) {
  const url = new URL(request.url, "http://localhost");
  const key = requestKey(request);
  const scenario = scenarioFor(key);
  if (!scenario) return sendError(response, 404, "NoSuchKey");
  const object = objects.get(key);
  const governance = url.searchParams.has("legal-hold")
    ? "legal-hold" : url.searchParams.has("retention") ? "retention" : null;
  if (governance) {
    if (!object) return sendError(response, 404, "NoSuchKey");
    if (request.method === "GET") return getGovernance(response, object, governance);
    if (request.method === "PUT") return putGovernance(request, response, object, scenario, governance);
  }
  if (request.method === "PUT") return putObject(request, response, key, scenario);
  if (request.method === "DELETE") return deleteObject(request, response, key, object, scenario);
  if (!object) return sendError(response, 404, "NoSuchKey");
  if (request.method === "HEAD") {
    response.writeHead(200, objectHeaders(object));
    response.end();
    return;
  }
  if (request.method === "GET") {
    response.writeHead(200, objectHeaders(object));
    response.end(object.body);
    return;
  }
  sendError(response, 405, "MethodNotAllowed");
}

const server = createServer((request, response) => {
  handle(request, response).catch((error) => sendError(response, 500, "InternalError", error.message));
});

await new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", () => {
    server.removeListener("error", reject);
    resolve();
  });
});

export const endpoint = `http://127.0.0.1:${server.address().port}`;

export function registerScenario(prefix, options = {}) {
  scenarios.set(prefix, {
    defaultRetentionUntil: options.defaultRetentionUntil ?? null,
    deleteFailurePending: options.failDeleteOnce === true,
    retentionFailurePending: options.failRetentionOnce === true,
    now: typeof options.now === "function" ? options.now : () => Date.now(),
  });
}

export async function closeProvider() {
  if (!server.listening) return;
  server.closeAllConnections();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}
