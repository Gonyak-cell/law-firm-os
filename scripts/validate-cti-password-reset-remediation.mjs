#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(".");
const CLOSEOUT_DIR = join(ROOT, "docs/goal-closeout/cti-password-reset-remediation");
const EVIDENCE_JSON = join(ROOT, "docs/launch/cti-password-reset-remediation-evidence-2026-07-06.json");
const EVIDENCE_MD = join(ROOT, "docs/launch/cti-password-reset-remediation-evidence-2026-07-06.md");
const CROSSWALK_JSON = join(ROOT, "docs/launch/cti-password-reset-remediation-crosswalk-2026-07-06.json");
const CROSSWALK_MD = join(ROOT, "docs/launch/cti-password-reset-remediation-crosswalk-2026-07-06.md");

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function readText(path) {
  return readFileSync(path, "utf8");
}

for (const file of [
  "packet.json",
  "command-evidence.json",
  "claude-review-result.json",
  "construction-inspection.json",
  "adjudication.md",
].map((name) => join(CLOSEOUT_DIR, name))) {
  assert.equal(existsSync(file), true, `missing closeout file ${file}`);
}
for (const file of [EVIDENCE_JSON, EVIDENCE_MD, CROSSWALK_JSON, CROSSWALK_MD]) {
  assert.equal(existsSync(file), true, `missing launch evidence ${file}`);
}

const packet = readJson(join(CLOSEOUT_DIR, "packet.json"));
const commandEvidence = readJson(join(CLOSEOUT_DIR, "command-evidence.json"));
const review = readJson(join(CLOSEOUT_DIR, "claude-review-result.json"));
const inspection = readJson(join(CLOSEOUT_DIR, "construction-inspection.json"));
const evidence = readJson(EVIDENCE_JSON);
const crosswalk = readJson(CROSSWALK_JSON);
const evidenceMd = readText(EVIDENCE_MD);
const crosswalkMd = readText(CROSSWALK_MD);
const adjudication = readText(join(CLOSEOUT_DIR, "adjudication.md"));

assert.equal(packet.goal_id, "cti-password-reset-remediation");
assert.equal(packet.closeout_verdict, "BLOCKED");
assert.equal(packet.boundary.production_code_deployed, false);
assert.equal(packet.boundary.production_env_mutated, false);
assert.equal(packet.boundary.production_credential_mutation_executed, false);
assert.equal(packet.boundary.password_reset_emails_sent, false);
assert.equal(packet.boundary.production_ready_claim, false);

assert.equal(evidence.status, "BLOCKED_MAIL_PROVIDER_AND_RESET_STORE_ENV_MISSING");
assert.equal(evidence.local_code_evidence.hash_only_reset_token_store, "LAWOS_AUTH_PASSWORD_RESET_STORE_PATH");
assert.equal(evidence.local_code_evidence.sesv2_delivery_adapter, true);
assert.equal(evidence.production_precheck.env_key_presence.LAWOS_AUTH_PASSWORD_RESET_STORE_PATH, false);
assert.equal(evidence.production_precheck.env_key_presence.LAWOS_AUTH_PASSWORD_RESET_EMAIL_DELIVERY, false);
assert.equal(evidence.production_precheck.env_values_recorded, false);
assert.equal(evidence.production_precheck.secret_values_recorded, false);
assert.equal(evidence.boundary.production_code_deployed, false);
assert.equal(evidence.boundary.production_env_mutated, false);
assert.equal(evidence.boundary.production_credential_mutation_executed, false);
assert.equal(evidence.boundary.password_reset_emails_sent, false);
assert.equal(evidence.boundary.token_value_recorded, false);
assert.equal(evidence.boundary.password_value_recorded, false);
assert.equal(evidence.boundary.secret_value_recorded, false);

assert.equal(crosswalk.goal_id, "cti-password-reset-remediation");
assert.equal(crosswalk.status, "BLOCKED");
assert.equal(crosswalk.validator, "scripts/validate-cti-password-reset-remediation.mjs");
assert.equal(crosswalk.authority_boundary.temporary_password_distribution_allowed, false);
assert.equal(crosswalk.authority_boundary.production_ready_claim, false);

assert.equal(commandEvidence.decision, "BLOCKED");
assert.equal(commandEvidence.commands.every((command) => command.exit_code === 0), true);
assert.equal(commandEvidence.boundary.lambda_config_mutation_executed, false);
assert.equal(commandEvidence.boundary.password_reset_email_sent, false);

assert.equal(review.review_result, "BLOCKED_WITH_LOCAL_PASS");
assert.equal(review.security_review.temporary_password_distribution_allowed, false);
assert.equal(inspection.inspection.closeout_5_files_present, true);
assert.equal(inspection.inspection.production_stop_condition_triggered, true);

for (const text of [evidenceMd, crosswalkMd, adjudication]) {
  assert.match(text, /production-ready claim|production_ready_claim|go-live claim|go_live_claim/i);
  assert.match(text, /I23/);
}

console.log(JSON.stringify({
  outcome: "passed",
  validator: "cti-password-reset-remediation",
  status: "BLOCKED",
  production_ready_claim: false,
}, null, 2));
