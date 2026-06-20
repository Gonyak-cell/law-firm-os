#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const checks = [
  ["apps/api/src/middleware/tenant-context.js", [/requireTenantContext/, /fail_closed/]],
  ["apps/api/src/middleware/actor-context.js", [/requireActorContext/, /buildHrxRequestContext/]],
  ["apps/api/src/middleware/audit-required.js", [/requireWriteAudit/, /writes_audit_event: true/]],
  ["apps/api/src/middleware/sensitive-read-audit.js", [/requireSensitiveReadAudit/, /sensitive_read_audit_required: true/]],
  ["apps/api/src/middleware/correlation.js", [/correlation_id/, /causation_id/]],
  ["apps/api/src/safe-error.js", [/count_leak_prevented: true/, /safe_error_codes/]],
  ["apps/api/src/routes/permission-simulator.js", [/simulatePermissionReadOnly/, /writes_product_state: false/]],
  ["apps/api/src/routes/audit.js", [/createAuditExportResponse/, /customer_payload_included: false/]],
];

const failures = [];

for (const [file, patterns] of checks) {
  const absolute = path.join(ROOT, file);
  if (!existsSync(absolute)) {
    failures.push(`missing:${file}`);
    continue;
  }
  const source = readFileSync(absolute, "utf8");
  for (const pattern of patterns) {
    if (!pattern.test(source)) failures.push(`missing marker:${file}:${pattern.source}`);
  }
}

if (failures.length > 0) {
  console.error("CMP R4 G1 API route trust coverage failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("CMP R4 G1 API route trust coverage passed.");
console.log("checked_routes: 8");
