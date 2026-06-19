// Law Firm OS API — zero-dependency node:http server (style: scripts/serve-progress-control-room.mjs).
//
// Binds 127.0.0.1 only. Every data route runs through the fail-closed permission
// gate (permission-kernel-contract v0.28 decision order, default deny). The only
// ungated route is GET /api/health, which returns static service-descriptor
// metadata and no tenant-scoped data.
import http from "node:http";
import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import {
  MASTER_DATA_BOUNDED_CONTEXT,
  handleClientGroupResolution,
  handleRecordsSearch,
  handleRelationshipLookup,
} from "./master-data-context.js";
import { PERMISSION_CONTEXT_HEADER, PERMISSION_DECISION_ORDER, parsePermissionContext } from "./permission-gate.js";

const HOST = "127.0.0.1";
const DEFAULT_PORT = Number(process.env.LAWOS_API_PORT || 4180);

export const SERVICE_DESCRIPTOR = Object.freeze({
  service: "@law-firm-os/api",
  version: "0.1.0",
  bounded_contexts: Object.freeze([MASTER_DATA_BOUNDED_CONTEXT]),
  permission_gate: Object.freeze({
    contract_ref: "contracts/permission-kernel-contract.json",
    contract_schema_version: "law-firm-os.permission-kernel-contract.v0.28",
    context_header: PERMISSION_CONTEXT_HEADER,
    decision_order: PERMISSION_DECISION_ORDER,
    default_decision: "deny",
    fail_closed: true,
  }),
  enrichment: Object.freeze({
    contract_ref: "contracts/matter-core-contract.json",
    contract_schema_version: "law-firm-os.matter-core-contract.v0.1",
    mode: "synthetic_crosswalk",
  }),
  synthetic_only: true,
  uses_real_client_data: false,
});

function sendJson(res, status, body) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(JSON.stringify(body));
}

function queryToObject(searchParams) {
  const query = {};
  for (const [key, value] of searchParams.entries()) query[key] = value;
  return query;
}

function handle(req, res) {
  const url = new URL(req.url || "/", `http://${HOST}`);
  const pathname = url.pathname.replace(/\/+$/, "") || "/";
  const query = queryToObject(url.searchParams);
  const requestId = query.request_id || `req_${randomUUID()}`;

  const clientGroupMatch = pathname.match(/^\/master-data\/client-groups\/([^/]+)$/);
  const knownPath =
    pathname === "/api/health" ||
    pathname === "/master-data/records" ||
    pathname === "/master-data/relationships" ||
    clientGroupMatch !== null;

  if (!knownPath) {
    sendJson(res, 404, { request_id: requestId, outcome: "blocked", safe_error_codes: ["MASTER_DATA_API_VALIDATION_ERROR"], error: "not_found" });
    return;
  }
  if (req.method !== "GET") {
    sendJson(res, 405, { request_id: requestId, outcome: "blocked", safe_error_codes: ["MASTER_DATA_API_VALIDATION_ERROR"], error: "method_not_allowed" });
    return;
  }

  if (pathname === "/api/health") {
    sendJson(res, 200, { status: "ok", time: new Date().toISOString(), ...SERVICE_DESCRIPTOR });
    return;
  }

  // Fail-closed gate input: absent/malformed header parses to null and the gate denies.
  const context = parsePermissionContext(req.headers[PERMISSION_CONTEXT_HEADER]);

  let result;
  if (pathname === "/master-data/records") {
    result = handleRecordsSearch({ query, context, requestId });
  } else if (pathname === "/master-data/relationships") {
    result = handleRelationshipLookup({ query, context, requestId });
  } else {
    result = handleClientGroupResolution({
      clientGroupId: decodeURIComponent(clientGroupMatch[1]),
      query,
      context,
      requestId,
    });
  }
  sendJson(res, result.status, result.body);
}

export function createApiServer() {
  return http.createServer((req, res) => {
    try {
      handle(req, res);
    } catch (error) {
      sendJson(res, 500, { outcome: "blocked", safe_error_codes: ["MASTER_DATA_API_VALIDATION_ERROR"], error: "internal_error", message: error.message });
    }
  });
}

export function startApiServer({ port = DEFAULT_PORT } = {}) {
  const server = createApiServer();
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, HOST, () => {
      resolve({ server, port: server.address().port, host: HOST });
    });
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startApiServer().then(({ port }) => {
    console.log(`law-firm-os api listening on http://${HOST}:${port}`);
    console.log(`health: http://${HOST}:${port}/api/health`);
  });
}
