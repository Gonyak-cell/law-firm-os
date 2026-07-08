#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(".");
const CLOSEOUT_DIR = join(ROOT, "docs/goal-closeout/cti-ses-production-access-request");
const I24_RECEIPT = join(ROOT, "docs/launch/cti-i24-owner-approval-receipt-2026-07-06.json");
const SES_RECEIPT = join(ROOT, "docs/launch/cti-ses-production-access-request-receipt-2026-07-06.json");

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
for (const file of [I24_RECEIPT, SES_RECEIPT]) {
  assert.equal(existsSync(file), true, `missing evidence file ${file}`);
}

const i24 = readJson(I24_RECEIPT);
const receipt = readJson(SES_RECEIPT);
const packet = readJson(join(CLOSEOUT_DIR, "packet.json"));
const commands = readJson(join(CLOSEOUT_DIR, "command-evidence.json"));
const review = readJson(join(CLOSEOUT_DIR, "claude-review-result.json"));
const inspection = readJson(join(CLOSEOUT_DIR, "construction-inspection.json"));
const adjudication = readFileSync(join(CLOSEOUT_DIR, "adjudication.md"), "utf8");

assert.equal(i24.approval_signature_ref, "I24-CTI-SES-PRODUCTION-ACCESS-REQUEST-OWNER-APPROVAL-2026-07-06");
assert.equal(i24.approved_scope.aws_account, "770880870480");
assert.equal(i24.approved_scope.region, "ap-northeast-2");
assert.equal(i24.approved_scope.mail_type, "TRANSACTIONAL");
assert.equal(i24.approved_scope.production_access_enabled_requested, true);
assert.equal(i24.explicit_non_approval.lambda_code_deploy, false);
assert.equal(i24.explicit_non_approval.reset_email_send, false);

assert.equal(receipt.approval_signature_ref, i24.approval_signature_ref);
assert.equal(receipt.request.action, "put-account-details");
assert.equal(receipt.submission.exit_code, 0);
assert.equal(receipt.post_request_ses_account.review_status, "PENDING");
assert.equal(receipt.post_request_ses_account.production_access_enabled, false);
assert.equal(receipt.sender_identity.verified_for_sending_status, true);
assert.equal(receipt.boundary.lambda_code_deployed, false);
assert.equal(receipt.boundary.lambda_env_mutated, false);
assert.equal(receipt.boundary.lambda_iam_mutated, false);
assert.equal(receipt.boundary.production_credential_mutated, false);
assert.equal(receipt.boundary.reset_email_sent, false);
assert.equal(receipt.boundary.production_ready_claim, false);

assert.equal(packet.status, "SUBMITTED_PENDING_AWS_REVIEW");
assert.equal(packet.closeout_verdict, "PASS_SUBMITTED");
assert.equal(packet.boundary.password_reset_email_sent, false);
assert.equal(commands.commands.every((command) => command.exit_code === 0), true);
assert.equal(review.review_result, "PASS_SUBMITTED_PENDING_EXTERNAL_REVIEW");
assert.equal(inspection.inspection.ses_production_access_request_submitted, true);
assert.equal(inspection.inspection.password_reset_execute_unblocked, false);
assert.match(adjudication, /ProductionAccessEnabled=false/);
assert.match(adjudication, /no.*production readiness/i);

console.log(JSON.stringify({
  outcome: "passed",
  validator: "cti-ses-production-access-request",
  status: "SUBMITTED_PENDING_AWS_REVIEW",
  password_reset_execute_unblocked: false,
  production_ready_claim: false
}, null, 2));
