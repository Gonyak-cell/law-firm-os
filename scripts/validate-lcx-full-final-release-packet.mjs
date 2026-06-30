#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  FINAL_RELEASE_PACKET_VALIDATION_MD_PATH,
  FINAL_RELEASE_PACKET_VALIDATION_PATH,
  OWNER_DECISION_PACKET_PATH,
  RELEASE_PREFLIGHT_PATH,
  fileExists,
  markdownTable,
  readJson,
  writeJson,
  writeText
} from "./lcx-full-helpers.mjs";

const REQUIRED_19 = [
  "LCX-FULL-19.01",
  "LCX-FULL-19.02",
  "LCX-FULL-19.03",
  "LCX-FULL-19.04",
  "LCX-FULL-19.05"
];
const REQUIRED_20 = [
  "LCX-FULL-20.01",
  "LCX-FULL-20.02",
  "LCX-FULL-20.03",
  "LCX-FULL-20.04",
  "LCX-FULL-20.05"
];

function byId(rows) {
  return new Map(rows.map((row) => [row.tuw_id, row]));
}

function requireAllowedStatus(entry, allowed) {
  assert(entry, "missing TUW entry");
  assert(allowed.includes(entry.claim_status), `${entry.tuw_id} has unexpected claim status ${entry.claim_status}`);
}

assert.equal(fileExists(RELEASE_PREFLIGHT_PATH), true, "LCX-FULL-19 release preflight proof is required");
assert.equal(fileExists(OWNER_DECISION_PACKET_PATH), true, "LCX-FULL-20 owner decision packet is required");

const releasePreflight = readJson(RELEASE_PREFLIGHT_PATH);
const ownerPacket = readJson(OWNER_DECISION_PACKET_PATH);

assert.equal(releasePreflight.verdict, "PASS");
assert.equal(ownerPacket.verdict, "PASS");
assert.equal(releasePreflight.tuw_parent, "LCX-FULL-19");
assert.equal(ownerPacket.tuw_parent, "LCX-FULL-20");

const gates19 = byId(releasePreflight.gates ?? []);
for (const tuw of REQUIRED_19) assert(gates19.has(tuw), `${tuw} missing from LCX-FULL-19 proof`);
requireAllowedStatus(gates19.get("LCX-FULL-19.01"), ["PASS", "BLOCKED"]);
requireAllowedStatus(gates19.get("LCX-FULL-19.02"), ["PASS", "BLOCKED"]);
requireAllowedStatus(gates19.get("LCX-FULL-19.03"), ["PASS", "BLOCKED"]);
requireAllowedStatus(gates19.get("LCX-FULL-19.04"), ["PASS"]);
requireAllowedStatus(gates19.get("LCX-FULL-19.05"), ["PASS", "BLOCKED"]);

for (const tuw of ["LCX-FULL-19.01", "LCX-FULL-19.03", "LCX-FULL-19.05"]) {
  const entry = gates19.get(tuw);
  if (entry.claim_status === "BLOCKED") {
    assert(entry.blocked_reason, `${tuw} blocked gate must include a blocked reason`);
  }
}

assert.equal(releasePreflight.boundary.public_release_claim, false);
assert.equal(releasePreflight.boundary.production_go_live_claim, false);
assert.equal(releasePreflight.boundary.production_cutover_executed_by_this_preflight, false);
assert.equal(releasePreflight.boundary.company_wide_go_live_executed_by_this_preflight, false);
assert.equal(releasePreflight.boundary.provider_production_write_claim_by_this_preflight, false);
assert.equal(releasePreflight.boundary.real_client_data_used, false);

const gates20 = byId(ownerPacket.child_tuws ?? []);
for (const tuw of REQUIRED_20) assert(gates20.has(tuw), `${tuw} missing from LCX-FULL-20 packet`);
requireAllowedStatus(gates20.get("LCX-FULL-20.01"), ["PASS"]);
requireAllowedStatus(gates20.get("LCX-FULL-20.02"), ["PASS"]);
requireAllowedStatus(gates20.get("LCX-FULL-20.03"), ["PASS_RECORDED_PENDING_CUTOVER"]);
requireAllowedStatus(gates20.get("LCX-FULL-20.04"), ["PASS"]);
requireAllowedStatus(gates20.get("LCX-FULL-20.05"), ["PASS_RECORDED_PENDING_CUTOVER", "BLOCKED"]);

assert.deepEqual(ownerPacket.evidence_index.missing_parents, []);
assert.equal(ownerPacket.boundary.final_go_live_approval_recorded, true);
assert.equal(ownerPacket.boundary.actual_launch_go_live_claim, false);
assert.equal(ownerPacket.boundary.production_cutover_executed_by_this_packet, false);
assert.equal(ownerPacket.boundary.company_wide_go_live_executed_by_this_packet, false);
assert.equal(ownerPacket.boundary.public_release_claim, false);
assert.equal(ownerPacket.boundary.app_store_or_public_distribution_claim, false);
assert.equal(ownerPacket.boundary.agent_closed_owner_review, false);
assert.equal(ownerPacket.boundary.external_receipts_count_as_production_cutover, false);
assert.equal(ownerPacket.boundary.blocked_release_gates_promoted_to_pass, false);
assert.equal(ownerPacket.evidence_index_proof.exit_code, 0);

const blockedGates = (releasePreflight.gates ?? []).filter((entry) => entry.claim_status === "BLOCKED");
const report = {
  schema_version: "law-firm-os.lazycodex.lcx_full.final_release_packet_validation.v0.1",
  generated_at: new Date().toISOString(),
  tuw_parent: "LCX-FULL-20",
  verdict: "PASS",
  source_refs: [RELEASE_PREFLIGHT_PATH, OWNER_DECISION_PACKET_PATH],
  release_preflight_status: releasePreflight.status,
  owner_packet_status: ownerPacket.status,
  blocked_release_gates: blockedGates.map((entry) => ({
    tuw_id: entry.tuw_id,
    label: entry.label,
    blocked_reason: entry.blocked_reason
  })),
  boundary: {
    public_release_claim: false,
    production_go_live_claim: false,
    actual_launch_go_live_claim: false,
    production_cutover_executed_by_validation: false,
    company_wide_rollout_executed_by_validation: false,
    owner_final_go_live_approval_recorded: ownerPacket.boundary.final_go_live_approval_recorded,
    blocked_release_gates_promoted_to_pass: false
  }
};

const rows = [
  ...releasePreflight.gates.map((entry) => ({
    TUW: entry.tuw_id,
    Claim: entry.claim_status,
    Evidence: entry.evidence_ref ?? RELEASE_PREFLIGHT_PATH,
    Boundary: entry.allowed_claim
  })),
  ...ownerPacket.child_tuws.map((entry) => ({
    TUW: entry.tuw_id,
    Claim: entry.claim_status,
    Evidence: entry.evidence_ref ?? OWNER_DECISION_PACKET_PATH,
    Boundary: entry.allowed_claim
  }))
];
const md = [
  "# LCX-FULL PR-08 Final Release Packet Validation",
  "",
  `Generated at: ${report.generated_at}`,
  "",
  `Verdict: ${report.verdict}`,
  "",
  markdownTable(rows, ["TUW", "Claim", "Evidence", "Boundary"]),
  "",
  "## Boundary",
  "",
  "- This validation does not execute production cutover, company-wide rollout, public release, or public distribution.",
  "- Human final go-live approval may be recorded, but actual launch/go-live remains false.",
  "- BLOCKED release gates remain blocked and are not upgraded by this validation."
].join("\n");

writeJson(FINAL_RELEASE_PACKET_VALIDATION_PATH, report);
writeText(FINAL_RELEASE_PACKET_VALIDATION_MD_PATH, `${md}\n`);

console.log(JSON.stringify({
  verdict: report.verdict,
  validation: FINAL_RELEASE_PACKET_VALIDATION_PATH,
  blocked_release_gates: report.blocked_release_gates.map((entry) => entry.tuw_id),
  public_release_claim: report.boundary.public_release_claim,
  production_go_live_claim: report.boundary.production_go_live_claim,
  actual_launch_go_live_claim: report.boundary.actual_launch_go_live_claim
}, null, 2));
