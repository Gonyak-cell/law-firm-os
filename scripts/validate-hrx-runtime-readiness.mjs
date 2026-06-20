#!/usr/bin/env node
import { access, readFile } from "node:fs/promises";

const expectNotReady = process.argv.includes("--expect-not-ready");
const errors = [];

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function assert(condition, message) {
  if (!condition) errors.push(message);
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function readText(path) {
  return readFile(path, "utf8");
}

for (const file of [
  "docs/hrx-enterprise/00-boundary-decision.md",
  "docs/hrx-enterprise/01-terminology.md",
  "docs/hrx-enterprise/02-tuw-governance.md",
  "docs/hrx-enterprise/03-release-gates.md",
  "contracts/hrx-payroll-boundary.json",
  "contracts/hrx-ai-decision-boundary.json",
]) {
  assert(await exists(file), `missing governance or boundary file: ${file}`);
}

if (await exists("contracts/hrx-payroll-boundary.json")) {
  const payroll = await readJson("contracts/hrx-payroll-boundary.json");
  assert(payroll.calculation_runtime === false, "payroll calculation runtime must remain blocked");
  assert(payroll.export_preview === true, "payroll export preview must remain allowed");
  assert(payroll.runtime_ready === false, "payroll boundary cannot claim runtime_ready");
  assert(payroll.production_ready === false, "payroll boundary cannot claim production_ready");
}

if (await exists("contracts/hrx-ai-decision-boundary.json")) {
  const ai = await readJson("contracts/hrx-ai-decision-boundary.json");
  for (const decision of ["hire", "fire", "pay_change", "performance_rating", "termination"]) {
    assert(ai.blocked_final_decisions?.includes(decision), `AI boundary must block final decision: ${decision}`);
  }
  assert(ai.runtime_ready === false, "AI boundary cannot claim runtime_ready");
  assert(ai.production_ready === false, "AI boundary cannot claim production_ready");
}

if (await exists("package.json")) {
  const pkg = await readJson("package.json");
  const scripts = pkg.scripts ?? {};
  assert(
    scripts["rp30:hrx:validate"] === "node scripts/validate-rp30-hrx-people-contract.mjs",
    "rp30:hrx:validate must remain the descriptor validator",
  );
  assert(
    scripts["hrx:runtime:validate"] === "node scripts/validate-hrx-runtime-readiness.mjs",
    "hrx:runtime:validate must run the runtime readiness validator",
  );
  assert(
    scripts["rp30:hrx:validate"] !== scripts["hrx:runtime:validate"],
    "descriptor validator and runtime validator must be separate commands",
  );
}

if (await exists("scripts/validate-rp30-hrx-people-contract.mjs")) {
  const descriptorValidator = await readText("scripts/validate-rp30-hrx-people-contract.mjs");
  assert(
    descriptorValidator.includes("validateHrxPeopleContract"),
    "descriptor validator must keep validating the HRX People contract",
  );
}

const runtimeEvidence = [
  ["db_or_schema", "packages/hrx/src/schema.js"],
  ["store_port", "packages/hrx/src/store/port.js"],
  ["sql_repository", "packages/hrx/src/repository-sql.js"],
  ["migration_runner", "packages/hrx/src/migrations/index.js"],
  ["documents_leave_audit_migration", "packages/hrx/src/migrations/002_hrx_documents_leave_audit.sql"],
  ["employee_user_link", "packages/hrx/src/identity-link.js"],
  ["tenant_actor_api_context", "apps/api/src/middleware/tenant-context.js"],
  ["actor_api_context", "apps/api/src/middleware/actor-context.js"],
  ["hrx_api_route", "apps/api/src/routes/hrx/employees.js"],
  ["hrx_route_policy_map", "apps/api/src/routes/hrx/route-policy-map.js"],
  ["hrx_route_authz_middleware", "apps/api/src/middleware/hrx-authz.js"],
  ["authz_scope", "packages/authz/src/hrx-sensitive-scopes.js"],
  ["durable_audit_event_store", "packages/audit/src/hrx-event-store-sql.js"],
  ["audit_hash_chain", "packages/audit/src/hrx-hash-chain.js"],
  ["step_up_context", "apps/api/src/middleware/hrx-step-up-context.js"],
  ["step_up_session_store", "packages/authz/src/hrx-step-up-session.js"],
  ["api_backed_people_ui", "apps/web/src/people/PeopleHome.tsx"],
  ["hrx_e2e_receipt", "apps/web/e2e/hrx/people-home.spec.ts"],
];

const missingRuntimeEvidence = [];
for (const [gate, file] of runtimeEvidence) {
  if (!(await exists(file))) {
    missingRuntimeEvidence.push(`${gate}: ${file}`);
  }
}

if (missingRuntimeEvidence.length > 0) {
  errors.push(...missingRuntimeEvidence.map((item) => `missing runtime evidence ${item}`));
}

if (expectNotReady) {
  const hasRuntimeEvidenceFailure = missingRuntimeEvidence.length > 0;
  if (!hasRuntimeEvidenceFailure) {
    console.error("HRX runtime readiness unexpectedly appears ready.");
    process.exit(1);
  }
  console.log("HRX runtime readiness guard PASS.");
  console.log(`expected_not_ready: true`);
  console.log(`missing_runtime_evidence_count: ${missingRuntimeEvidence.length}`);
  process.exit(0);
}

if (errors.length > 0) {
  console.error("HRX runtime readiness validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("HRX runtime readiness validation passed.");
