#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const LEDGER_PATH = "docs/runtime-spine/runtime-spine-ledger.json";
const EVIDENCE_INDEX_PATH = "docs/runtime-spine/evidence/runtime-spine-evidence-index.json";
const G2_EVIDENCE_PATH = "docs/runtime-spine/evidence/g2-trust-boundary-evidence.json";

const requiredFiles = [
  "packages/runtime-auth/package.json",
  "packages/runtime-auth/src/session.js",
  "packages/runtime-auth/src/provider.js",
  "packages/runtime-auth/src/local-provider.js",
  "packages/runtime-auth/src/principal.js",
  "packages/runtime-auth/src/membership.js",
  "packages/runtime-auth/src/assurance.js",
  "packages/runtime-auth/src/authz-context.js",
  "packages/runtime-auth/src/policy-hooks.js",
  "packages/runtime-auth/src/break-glass.js",
  "packages/runtime-auth/src/audit.js",
  "packages/runtime-auth/test/session-provider.test.js",
  "packages/runtime-auth/test/principal.test.js",
  "packages/runtime-auth/test/authz-context.test.js",
  "packages/runtime-auth/test/audit-break-glass.test.js",
  G2_EVIDENCE_PATH
];

const requiredMarkers = [
  ["packages/runtime-auth/src/session.js", /createRuntimeAuthSession/, /production_auth_claim: false/, /credential material/],
  ["packages/runtime-auth/src/provider.js", /createAuthProviderInterface/, /oidc_supported/, /saml_supported/],
  ["packages/runtime-auth/src/local-provider.js", /createLocalDevAuthProvider/, /synthetic_token/, /missing_bearer_token/],
  ["packages/runtime-auth/src/principal.js", /deriveServerPrincipal/, /caller-supplied trust context/, /header_only_trust_allowed: false/],
  ["packages/runtime-auth/src/authz-context.js", /evaluateRuntimePermission/, /server_derived_principal_required/, /evaluatePermission/],
  ["packages/runtime-auth/src/policy-hooks.js", /privileged_step_up_required/, /hr_sensitive_scope_required/],
  ["packages/runtime-auth/src/break-glass.js", /runtime_use_allowed: false/, /owner_gate_required/],
  ["packages/runtime-auth/src/audit.js", /runtime-auth.audit/, /appendOutboxEvent/],
  ["packages/runtime-auth/test/principal.test.js", /x-tenant-id/, /role_id/],
  ["packages/runtime-auth/test/authz-context.test.js", /cross-tenant resources/, /Sensitive policy hooks/],
  ["packages/runtime-auth/test/audit-break-glass.test.js", /Break-glass placeholder remains locked/, /tenant-scoped synthetic outbox event/]
];

function readJson(file) {
  return JSON.parse(readFileSync(path.join(ROOT, file), "utf8"));
}

const ledger = readJson(LEDGER_PATH);
const evidenceIndex = readJson(EVIDENCE_INDEX_PATH);
const g2Evidence = readJson(G2_EVIDENCE_PATH);
const packageJson = readJson("package.json");
const errors = [];

function assert(condition, message) {
  if (!condition) errors.push(message);
}

for (const file of requiredFiles) {
  assert(existsSync(path.join(ROOT, file)), `${file}: missing`);
}

for (const [file, ...patterns] of requiredMarkers) {
  if (!existsSync(path.join(ROOT, file))) continue;
  const source = readFileSync(path.join(ROOT, file), "utf8");
  for (const pattern of patterns) assert(pattern.test(source), `${file}: missing ${pattern}`);
}

assert(packageJson.scripts?.["runtime-spine:rs2:trust-boundary:validate"] === "node scripts/validate-runtime-spine-rs2-trust-boundary.mjs", "package script runtime-spine:rs2:trust-boundary:validate mismatch");
assert(/packages\/runtime-auth\/test\/\*\.test\.js/.test(packageJson.scripts?.test ?? ""), "root npm test must include packages/runtime-auth tests");

const gateMap = new Map((ledger.gates ?? []).map((gate) => [gate.id, gate]));
assert(gateMap.get("G1")?.status === "ready_candidate", "G1 must remain ready_candidate before G2");
assert(gateMap.get("G2")?.status === "ready_candidate", "G2 must be ready_candidate after RS-2 closeout");
for (const gate of ledger.gates ?? []) {
  if (!["G0", "G1", "G2"].includes(gate.id)) {
    assert(gate.status === "planned_blocked_by_prior_gate", `${gate.id}: must remain planned_blocked_by_prior_gate`);
  }
}

const rs2 = ledger.spines?.find((spine) => spine.id === "RS-2");
assert(rs2?.status === "ready_candidate", "RS-2 must be ready_candidate");
const rs2Tuws = rs2?.tuws ?? [];
assert(rs2Tuws.length === 15, `RS-2 must keep 15 TUWs, got ${rs2Tuws.length}`);
for (const tuw of rs2Tuws) {
  assert(tuw.status === "closed", `${tuw.id}: must be closed for G2 ready candidate`);
  assert(tuw.loop_stage === "act", `${tuw.id}: loop_stage must be act`);
  assert(Array.isArray(tuw.evidence) && tuw.evidence.length > 0, `${tuw.id}: missing evidence refs`);
}

const prematureClosed = (ledger.spines ?? [])
  .filter((spine) => !["RS-PRE", "RS-1", "RS-2"].includes(spine.id))
  .flatMap((spine) => (spine.tuws ?? []).filter((tuw) => tuw.status === "closed").map((tuw) => tuw.id));
assert(prematureClosed.length === 0, `RS-3 through RS-6 TUWs must remain planned: ${prematureClosed.join(", ")}`);

const rtgById = new Map((ledger.rtg_summary ?? []).map((rtg) => [rtg.id, rtg]));
assert(rtgById.get("RTG-001")?.status === "partial", "RTG-001 must remain partial until G6");
assert(rtgById.get("RTG-002")?.status === "partial", "RTG-002 must remain partial until G6");
assert(rtgById.get("RTG-003")?.status === "partial", "RTG-003 must remain partial until G6");
assert(rtgById.get("RTG-004")?.status === "g0_guarded", "RTG-004 must remain guarded");
assert(rtgById.get("RTG-005")?.status === "g0_guarded", "RTG-005 must remain guarded");

assert(ledger.runtime_ready_candidate_claim === false, "G2 must not claim runtime_ready candidate");
assert(ledger.actual_launch_go_live_claim === false, "G2 must not claim actual launch/go-live");
assert(evidenceIndex.latest_rs2_validation?.status === "passed", "RS-2 evidence summary must be passed");
assert(g2Evidence.scope?.synthetic_only === true, "G2 evidence must remain synthetic-only");
assert(g2Evidence.scope?.production_auth_provider_approved === false, "G2 evidence must not approve production auth");
assert(g2Evidence.scope?.caller_supplied_tenant_role_trusted === false, "G2 evidence must not trust caller-supplied tenant/role");
assert(g2Evidence.scope?.runtime_ready_candidate === false, "G2 evidence must not claim runtime_ready candidate");
assert(g2Evidence.scope?.actual_launch_go_live_claim === false, "G2 evidence must not claim actual launch/go-live");
assert(Object.values(g2Evidence.latest_results ?? {}).every((result) => typeof result === "string" && !result.includes("pending_current_pr_run")), "G2 evidence latest_results must not contain pending_current_pr_run");

if (errors.length > 0) {
  console.error("Runtime Spine RS-2 trust-boundary validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Runtime Spine RS-2 trust-boundary validation passed.");
console.log("g2_status: ready_candidate");
console.log("rs2_closed_tuws: 15");
console.log("runtime_ready_candidate_claim: false");
