#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(".");
const CLOSEOUT_DIR = join(ROOT, "docs/goal-closeout/cti-password-reset-remediation-execute");
const I23_RECEIPT = join(ROOT, "docs/launch/cti-i23-owner-approval-receipt-2026-07-06.json");
const BLOCKER = join(ROOT, "docs/launch/cti-password-reset-remediation-execute-blocker-2026-07-06.json");

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
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
for (const file of [I23_RECEIPT, BLOCKER]) assert.equal(existsSync(file), true, `missing evidence file ${file}`);

const packet = readJson(join(CLOSEOUT_DIR, "packet.json"));
const commandEvidence = readJson(join(CLOSEOUT_DIR, "command-evidence.json"));
const review = readJson(join(CLOSEOUT_DIR, "claude-review-result.json"));
const inspection = readJson(join(CLOSEOUT_DIR, "construction-inspection.json"));
const i23 = readJson(I23_RECEIPT);
const blocker = readJson(BLOCKER);
const adjudication = readFileSync(join(CLOSEOUT_DIR, "adjudication.md"), "utf8");

assert.equal(i23.approval_signature_ref, "I23-CTI-PASSWORD-RESET-EMAIL-DELIVERY-STORE-OWNER-APPROVAL-2026-07-06");
assert.equal(i23.approved_scope.LAWOS_AUTH_PASSWORD_RESET_EMAIL_FROM, "jwsuh@amic.kr");
assert.equal(i23.approved_scope.LAWOS_AUTH_PASSWORD_RESET_BASE_URL, "matter://password-reset/confirm");
assert.equal(i23.boundary.production_code_deployed_by_this_receipt, false);

assert.equal(blocker.status, "BLOCKED_SES_SANDBOX_RECIPIENT_VERIFICATION");
assert.equal(blocker.aws_preflight.ses_production_access_enabled, false);
assert.equal(blocker.aws_preflight.ses_sender_verified_for_sending, true);
assert.equal(blocker.aws_preflight.ses_target_recipient_count, 9);
assert.equal(blocker.aws_preflight.ses_verified_target_recipient_count, 1);
assert.equal(blocker.aws_preflight.ses_unverified_or_failed_target_recipient_count, 8);
assert.equal(blocker.boundary.production_code_deployed, false);
assert.equal(blocker.boundary.lambda_env_mutated, false);
assert.equal(blocker.boundary.lambda_iam_mutated, false);
assert.equal(blocker.boundary.production_credential_mutated, false);
assert.equal(blocker.boundary.password_reset_email_sent, false);
assert.equal(blocker.boundary.production_ready_claim, false);

assert.equal(packet.closeout_verdict, "BLOCKED");
assert.equal(packet.boundary.production_code_deployed, false);
assert.equal(packet.boundary.lambda_env_mutated, false);
assert.equal(packet.boundary.lambda_iam_mutated, false);
assert.equal(packet.boundary.production_credential_mutated, false);
assert.equal(packet.boundary.password_reset_email_sent, false);
assert.equal(packet.boundary.production_ready_claim, false);
assert.equal(commandEvidence.commands.every((command) => command.exit_code === 0), true);
assert.equal(commandEvidence.boundary.production_code_deployed, false);
assert.equal(review.review_result, "BLOCKED_BEFORE_PRODUCTION_MUTATION");
assert.equal(inspection.inspection.production_stop_condition_triggered, true);
assert.match(adjudication, /no production-ready claim/i);
assert.match(adjudication, /no go-live claim/i);

console.log(JSON.stringify({
  outcome: "passed",
  validator: "cti-password-reset-remediation-execute",
  status: "BLOCKED",
  production_ready_claim: false,
}, null, 2));
