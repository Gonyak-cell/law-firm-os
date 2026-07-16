#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const GOAL_ID = "cti-s6-seal-final-validation";
const RECEIPT_JSON = join(ROOT, "docs/launch/cti-s6-seal-final-validation-receipt-2026-07-06.json");
const CLOSEOUT_DIR = join(ROOT, "docs/goal-closeout/cti-s6-seal-final-validation");
const CROSSWALK_JSON = join(ROOT, "docs/launch/cti-s6-seal-final-validation-crosswalk-2026-07-06.json");
const findings = [];

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function assert(condition, message, details = {}) {
  if (!condition) findings.push({ message, details });
}

const receipt = readJson(RECEIPT_JSON);
const packet = readJson(join(CLOSEOUT_DIR, "packet.json"));
const commandEvidence = readJson(join(CLOSEOUT_DIR, "command-evidence.json"));
const review = readJson(join(CLOSEOUT_DIR, "claude-review-result.json"));
const inspection = readJson(join(CLOSEOUT_DIR, "construction-inspection.json"));
const crosswalk = readJson(CROSSWALK_JSON);

assert(receipt.goal_id === GOAL_ID, "receipt goal_id mismatch");
assert(packet.goal_id === GOAL_ID, "packet goal_id mismatch");
assert(packet.launch_receipt === "docs/launch/cti-s6-seal-final-validation-receipt-2026-07-06.json", "packet launch receipt mismatch");
assert(["PASS", "BLOCKED"].includes(packet.verdict), "packet verdict must be PASS or BLOCKED");
assert(receipt.preconditions?.cut_g_pass === true, "CUT-G precondition must pass before S6");
assert(receipt.preconditions?.s5_g_pass === true, "S5-G precondition must pass before S6");
assert(receipt.preconditions?.command_validator_pass === true, "required command validators must pass before S6");
assert(receipt.snapshot?.status === "PASS", "snapshot parse health must pass");
assert(receipt.tasks?.["S6-T03"]?.status === "PASS", "PII-safe evidence manifest must pass");
assert(receipt.boundary?.existing_safety_gate_weakened === false, "existing safety gate must not be weakened");
assert(receipt.boundary?.plaintext_pii_committed === false, "plaintext PII boundary mismatch");
assert(receipt.boundary?.token_password_secret_value_committed === false, "credential boundary mismatch");
assert(commandEvidence.commands?.some((command) => command.command === "node scripts/validate-cti-s5-enrichment-execute.mjs" && command.passed === true), "S5 validator command evidence missing");
assert(review.verdict === packet.verdict, "review verdict mismatch");
assert(inspection.s6_g_pass === receipt.s6_g_validation?.pass, "construction inspection S6-G mismatch");
assert(crosswalk["S6-G"]?.status === (receipt.s6_g_validation?.pass ? "PASS" : "BLOCKED"), "crosswalk S6-G mismatch");

if (receipt.s6_g_validation?.pass === true) {
  assert(packet.verdict === "PASS", "S6 pass must have packet PASS");
  assert(receipt.boundary?.production_ready_claim === true, "S6 pass permits production_ready claim");
  assert(receipt.boundary?.go_live_claim === true, "S6 pass permits go-live claim");
  assert((receipt.s6_g_validation.blocked_tasks ?? []).length === 0, "S6 pass cannot have blocked tasks");
} else {
  assert(packet.verdict === "BLOCKED", "S6 non-pass must be BLOCKED");
  assert(receipt.boundary?.production_ready_claim === false, "blocked S6 must not claim production_ready");
  assert(receipt.boundary?.go_live_claim === false, "blocked S6 must not claim go-live");
  assert((receipt.s6_g_validation?.blocked_tasks ?? []).length > 0, "blocked S6 must list blockers");
}

const stringValues = [];
function collectStrings(value) {
  if (typeof value === "string") stringValues.push(value);
  else if (Array.isArray(value)) value.forEach(collectStrings);
  else if (value && typeof value === "object") Object.values(value).forEach(collectStrings);
}
collectStrings(receipt);
assert(!stringValues.some((value) => (
  /lawos_session_v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+|LAWOS_VAULT_BRIDGE_TOKEN|secret_value\s*[:=]|reset_token\s*[:=]|initial_password\s*[:=]/i.test(value)
)), "sensitive value leaked in receipt string values");

if (findings.length > 0) {
  console.error(JSON.stringify({ outcome: "failed", validator: "cti-s6-seal-final-validation", findings }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  outcome: "passed",
  validator: "cti-s6-seal-final-validation",
  status: packet.status,
  verdict: packet.verdict,
  s6_g_pass: receipt.s6_g_validation.pass,
  production_ready_claim: receipt.boundary.production_ready_claim,
  go_live_claim: receipt.boundary.go_live_claim,
}, null, 2));
