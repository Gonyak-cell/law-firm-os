#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const REQUIRED_FILES = [
  "packages/platform/src/persistence/store-port.js",
  "packages/platform/src/persistence/idempotency-store.js",
  "packages/platform/src/secrets/secret-guard.js",
  "apps/api/src/middleware/tenant-context.js",
  "apps/api/src/middleware/actor-context.js",
  "packages/authz/src/permission-context-store.js",
  "packages/authz/src/policy-store.js",
  "packages/authz/src/object-acl-store.js",
  "packages/authz/src/ethical-wall-store.js",
  "packages/authz/src/legal-hold-store.js",
  "packages/authz/src/break-glass-service.js",
  "packages/audit/src/durable-audit-store.js",
  "apps/api/src/middleware/audit-required.js",
  "apps/api/src/middleware/sensitive-read-audit.js",
  "apps/api/src/safe-error.js",
  "apps/api/src/middleware/correlation.js",
  "apps/api/src/routes/permission-simulator.js",
  "apps/api/src/routes/audit.js",
  "packages/audit/src/verify-job.js",
  "scripts/audit-api-route-trust-coverage.mjs",
  "packages/authz/src/privacy-minimization.js",
  "packages/authz/test/trust-runtime-stores.test.js",
  "apps/api/test/cmp-r4-g1-trust.test.js",
  "scripts/validate-cmp-r4-g1.mjs",
  "docs/reorganization/client-matter-os/cmp-v1/r4-g1-closeout.md",
];

const REQUIRED_EVIDENCE = Array.from({ length: 24 }, (_, index) =>
  `docs/reorganization/client-matter-os/cmp-v1/evidence/cmp-g1-${String(index + 1).padStart(3, "0")}.md`,
);

const failures = [];

for (const file of [...REQUIRED_FILES, ...REQUIRED_EVIDENCE]) {
  if (!existsSync(path.join(ROOT, file))) failures.push(`missing:${file}`);
}

function requirePatterns(file, patterns) {
  const absolute = path.join(ROOT, file);
  const source = existsSync(absolute) ? readFileSync(absolute, "utf8") : "";
  for (const pattern of patterns) {
    if (!pattern.test(source)) failures.push(`missing marker:${file}:${pattern.source}`);
  }
}

function rejectPatterns(file, patterns) {
  const absolute = path.join(ROOT, file);
  const source = existsSync(absolute) ? readFileSync(absolute, "utf8") : "";
  for (const pattern of patterns) {
    if (pattern.test(source)) failures.push(`forbidden marker:${file}:${pattern.source}`);
  }
}

requirePatterns("packages/platform/src/persistence/store-port.js", [/assertRuntimePersistenceStore/, /durable=true/, /transactions/]);
requirePatterns("apps/api/src/middleware/tenant-context.js", [/requireTenantContext/, /fail_closed: true/]);
requirePatterns("apps/api/src/middleware/actor-context.js", [/requireActorContext/, /buildHrxRequestContext/, /fail_closed: true/]);
requirePatterns("packages/authz/src/trust-runtime-store.js", [/filePath/, /recordIdempotency/, /appendAudit/, /writes_product_state: true/, /production_ready_claim: false/]);
requirePatterns("packages/authz/src/permission-context-store.js", [/savePermissionContext/, /PermissionContext/]);
requirePatterns("packages/authz/src/policy-store.js", [/savePolicy/, /Policy/]);
requirePatterns("packages/authz/src/object-acl-store.js", [/saveObjectAcl/, /ObjectAcl/]);
requirePatterns("packages/authz/src/ethical-wall-store.js", [/saveEthicalWall/, /EthicalWall/]);
requirePatterns("packages/authz/src/legal-hold-store.js", [/saveLegalHold/, /LegalHold/]);
requirePatterns("packages/authz/src/break-glass-service.js", [/requestBreakGlass/, /approval_required/]);
requirePatterns("packages/audit/src/durable-audit-store.js", [/exportTenant/, /verifyTenant/, /hash_chain_valid/]);
requirePatterns("apps/api/src/middleware/audit-required.js", [/requireWriteAudit/, /writes_audit_event: true/]);
requirePatterns("apps/api/src/middleware/sensitive-read-audit.js", [/requireSensitiveReadAudit/, /sensitive_read_audit_required: true/]);
requirePatterns("apps/api/src/safe-error.js", [/createSafeErrorEnvelope/, /count_leak_prevented: true/]);
requirePatterns("packages/platform/src/persistence/idempotency-store.js", [/createIdempotencyStore/, /recordIdempotency/]);
requirePatterns("apps/api/src/middleware/correlation.js", [/createCorrelationContext/, /correlation_id/, /causation_id/]);
requirePatterns("apps/api/src/routes/permission-simulator.js", [/simulatePermissionReadOnly/, /read_only: true/, /writes_product_state: false/]);
requirePatterns("apps/api/src/routes/audit.js", [/createAuditExportResponse/, /exportTenant\(\{ tenant_id \}\)/, /customer_payload_included: false/]);
requirePatterns("packages/audit/src/verify-job.js", [/runAuditVerifyJob/, /verifyTenant\(\{ tenant_id \}\)/, /audit_verify_job: true/]);
requirePatterns("scripts/audit-api-route-trust-coverage.mjs", [/checked_routes: 8/, /fail_closed/]);
requirePatterns("packages/platform/src/secrets/secret-guard.js", [/assertNoSecretMaterial/, /secret material detected/]);
requirePatterns("packages/authz/src/privacy-minimization.js", [/minimizeForPrivacy/, /raw_payload/, /privacy_minimized: true/]);
requirePatterns("packages/authz/test/trust-runtime-stores.test.js", [/persists write, audit, and idempotency/, /break-glass requests/]);
requirePatterns("apps/api/test/cmp-r4-g1-trust.test.js", [/fail closed/, /permission simulator stays read-only/, /secret guard blocks/]);
requirePatterns("docs/reorganization/client-matter-os/cmp-v1/r4-g1-closeout.md", [/CMP R4 G1 Closeout/, /24\/24/, /owner approval and release gates/]);

for (const evidence of REQUIRED_EVIDENCE) {
  const source = existsSync(path.join(ROOT, evidence)) ? readFileSync(path.join(ROOT, evidence), "utf8") : "";
  requirePatterns(evidence, [/Status: runtime-slice-implemented/, /Claim Boundary/, /Go-live or production-ready: blocked/]);
  rejectPatterns(evidence, [/go-live approved/i, /production_ready\s*[:=]\s*true/i, /R4 runtime-write-ready for the whole CMP R4 package: claimed/i]);
  if (!source.includes("CMP-G1-W01-T")) failures.push(`missing CMP-G1 TUW id in evidence:${evidence}`);
}

if (failures.length > 0) {
  console.error("CMP R4 G1 validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("CMP R4 G1 validation passed.");
console.log("g1_runtime_tuws_with_evidence: 24/24");
console.log("remaining_g1_tuw: none");
