#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { authorizeHrxApiRequest } from "../apps/api/src/middleware/hrx-authz.js";
import { listHrxRoutePolicies, resolveHrxRoutePolicy } from "../apps/api/src/routes/hrx/route-policy-map.js";

const root = process.cwd();
const errors = [];

function assert(condition, message) {
  if (!condition) errors.push(message);
}

function read(path) {
  return readFileSync(resolve(root, path), "utf8");
}

for (const file of [
  "apps/api/src/routes/hrx/route-policy-map.js",
  "apps/api/src/middleware/hrx-authz.js",
  "apps/api/src/server.js",
  "apps/api/test/hrx/route-authz.test.js",
]) {
  assert(existsSync(resolve(root, file)), `${file}: missing`);
}

const packageJson = JSON.parse(read("package.json"));
assert(packageJson.scripts?.["hrx:authz:validate"] === "node scripts/validate-hrx-route-authz.mjs", "package script hrx:authz:validate missing");

const policies = listHrxRoutePolicies();
assert(policies.length >= 16, "HRX route policy map must cover current API route surface");
for (const policy of policies) {
  for (const field of ["id", "method", "action", "sensitivity", "required_scope", "purpose", "resource_type"]) {
    assert(Boolean(policy[field]), `${policy.id ?? "unknown policy"}: missing ${field}`);
  }
  assert(policy.required_scope?.startsWith("hrx."), `${policy.id}: required_scope must be HRX scoped`);
}

for (const route of [
  ["GET", "/api/hrx/employees"],
  ["GET", "/api/hrx/employees/emp-001"],
  ["GET", "/api/hrx/documents"],
  ["POST", "/api/hrx/leave"],
  ["GET", "/api/hrx/approvals"],
  ["POST", "/api/hrx/approvals/approval-leave-002/approve"],
  ["GET", "/api/hrx/candidate/portal"],
  ["POST", "/api/hrx/recruiting/applications/app-001/stage"],
  ["POST", "/api/hrx/ai/assistant"],
  ["GET", "/api/hrx/audit"],
]) {
  assert(resolveHrxRoutePolicy({ method: route[0], pathname: route[1] }), `missing policy for ${route[0]} ${route[1]}`);
}
assert(resolveHrxRoutePolicy({ method: "GET", pathname: "/api/hrx/not-mapped" }) === null, "unknown HRX route must not resolve a policy");

const allow = authorizeHrxApiRequest({
  method: "GET",
  pathname: "/api/hrx/employees",
  query: { tenant_id: "tenant-a" },
  headers: {
    "x-lawos-tenant-id": "tenant-a",
    "x-lawos-actor-id": "validator-user",
    "x-lawos-actor-role": "people_ops",
    "x-lawos-hrx-scopes": "hrx.employee.read",
  },
});
assert(allow.ok === true, "authorized HRX employee route must pass with trusted context and scope");

const missingScope = authorizeHrxApiRequest({
  method: "GET",
  pathname: "/api/hrx/documents",
  query: { tenant_id: "tenant-a" },
  headers: {
    "x-lawos-tenant-id": "tenant-a",
    "x-lawos-actor-id": "validator-user",
    "x-lawos-actor-role": "people_ops",
    "x-lawos-hrx-scopes": "hrx.employee.read",
  },
});
assert(missingScope.ok === false && missingScope.body.safe_error_code === "HRX_AUTHZ_DENIED", "missing HRX scope must deny");

const noPolicy = authorizeHrxApiRequest({
  method: "GET",
  pathname: "/api/hrx/not-mapped",
  query: { tenant_id: "tenant-a" },
  headers: {
    "x-lawos-tenant-id": "tenant-a",
    "x-lawos-actor-id": "validator-user",
    "x-lawos-actor-role": "people_ops",
    "x-lawos-hrx-scopes": "hrx.employee.read",
  },
});
assert(noPolicy.ok === false && noPolicy.body.safe_error_code === "HRX_ROUTE_POLICY_REQUIRED", "unmapped HRX route must fail closed");

const serverSource = read("apps/api/src/server.js");
assert(serverSource.includes("authorizeHrxApiRequest"), "server must call authorizeHrxApiRequest before HRX runtime handler");
assert(serverSource.indexOf("authorizeHrxApiRequest") < serverSource.indexOf("handleHrxApiRequest"), "HRX authz must run before HRX runtime handler");

if (errors.length > 0) {
  console.error("HRX route authz validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("HRX route authz validation passed.");
console.log(`route_policy_count: ${policies.length}`);
