#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { authorizeHrxApiRequest } from "../apps/api/src/middleware/hrx-authz.js";

const root = process.cwd();
const errors = [];

function assert(condition, message) {
  if (!condition) errors.push(message);
}

function read(path) {
  return readFileSync(resolve(root, path), "utf8");
}

const packageJson = JSON.parse(read("package.json"));
assert(packageJson.scripts?.["hrx:context:validate"] === "node scripts/validate-hrx-context-hardening.mjs", "package script hrx:context:validate missing");

const authzSource = read("apps/api/src/middleware/hrx-authz.js");
assert(authzSource.includes("HRX_QUERY_CONTEXT_FORBIDDEN"), "authz middleware must forbid query tenant/actor context");
assert(authzSource.includes("parseTenantContext(headers)"), "authz middleware must derive tenant from trusted headers");
assert(authzSource.includes("parseActorContext(headers)"), "authz middleware must derive actor from trusted headers");

const serverSource = read("apps/api/src/server.js");
assert(serverSource.includes("requestContext: hrxAuthz.context"), "server must pass trusted HRX context to runtime");
assert(!serverSource.includes("trustedQuery"), "server must not synthesize trustedQuery with tenant/actor values");
assert(!/tenant_id:\s*hrxAuthz\.context\.tenant_id/.test(serverSource), "server must not inject trusted tenant into query");
assert(!/actor_id:\s*hrxAuthz\.context\.actor_id/.test(serverSource), "server must not inject trusted actor into query");

const runtimeSource = read("apps/api/src/hrx-runtime-context.js");
assert(runtimeSource.includes("requestContext"), "HRX runtime handler must accept requestContext");
assert(runtimeSource.includes("requireTrustedRequestContext"), "HRX runtime handler must require trusted request context");
assert(!runtimeSource.includes("query.actor_id"), "HRX runtime handler must not use actor_id from query");
assert(!runtimeSource.includes("query.tenant_id"), "HRX runtime handler must not use tenant_id from query");
assert(!runtimeSource.includes("people-ui-runtime"), "HRX runtime handler must not default to a synthetic UI actor");

const webSource = read("apps/web/src/people/hrxApiClient.ts");
for (const forbidden of [
  "x-lawos-permission-context",
  "HRX_PERMISSION_CONTEXT",
  "TENANT_ID",
  "ACTOR_ID",
  "tenant_id",
  "actor_id",
  "hrx_people_ui_allow",
]) {
  assert(!webSource.includes(forbidden), `HRX web client must not contain ${forbidden}`);
}
assert(webSource.includes("credentials: \"same-origin\""), "HRX web client must rely on same-origin session transport");

const allowed = authorizeHrxApiRequest({
  method: "GET",
  pathname: "/api/hrx/employees",
  query: {},
  headers: {
    "x-lawos-tenant-id": "tenant-a",
    "x-lawos-actor-id": "validator-user",
    "x-lawos-actor-role": "people_ops",
    "x-lawos-hrx-scopes": "hrx.employee.read",
  },
});
assert(allowed.ok === true, "trusted header tenant/actor context must allow scoped HRX route");

const forbiddenQuery = authorizeHrxApiRequest({
  method: "GET",
  pathname: "/api/hrx/employees",
  query: { tenant_id: "tenant-a", actor_id: "query-user" },
  headers: {
    "x-lawos-tenant-id": "tenant-a",
    "x-lawos-actor-id": "validator-user",
    "x-lawos-actor-role": "people_ops",
    "x-lawos-hrx-scopes": "hrx.employee.read",
  },
});
assert(forbiddenQuery.ok === false, "query tenant/actor context must be denied");
assert(forbiddenQuery.body?.safe_error_code === "HRX_QUERY_CONTEXT_FORBIDDEN", "query tenant/actor denial must use HRX_QUERY_CONTEXT_FORBIDDEN");

const emptyQueryKey = authorizeHrxApiRequest({
  method: "GET",
  pathname: "/api/hrx/employees",
  query: { tenant_id: "" },
  headers: {
    "x-lawos-tenant-id": "tenant-a",
    "x-lawos-actor-id": "validator-user",
    "x-lawos-actor-role": "people_ops",
    "x-lawos-hrx-scopes": "hrx.employee.read",
  },
});
assert(emptyQueryKey.ok === false, "empty tenant_id query key must still be denied");
assert(emptyQueryKey.body?.forbidden_query_keys?.includes("tenant_id"), "empty tenant_id query key must be reported as forbidden");

if (errors.length > 0) {
  console.error("HRX context hardening validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("HRX context hardening validation passed.");
