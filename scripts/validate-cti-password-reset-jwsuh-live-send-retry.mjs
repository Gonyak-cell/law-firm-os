#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(".");
const CLOSEOUT_DIR = join(ROOT, "docs/goal-closeout/cti-password-reset-jwsuh-live-send-retry");
const I25_RECEIPT = join(ROOT, "docs/launch/cti-i25-owner-approval-receipt-2026-07-06.json");
const RETRY_RECEIPT = join(ROOT, "docs/launch/cti-password-reset-jwsuh-live-send-retry-receipt-2026-07-06.json");

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
for (const file of [I25_RECEIPT, RETRY_RECEIPT]) {
  assert.equal(existsSync(file), true, `missing evidence file ${file}`);
}

const i25 = readJson(I25_RECEIPT);
const receipt = readJson(RETRY_RECEIPT);
const packet = readJson(join(CLOSEOUT_DIR, "packet.json"));
const commands = readJson(join(CLOSEOUT_DIR, "command-evidence.json"));
const review = readJson(join(CLOSEOUT_DIR, "claude-review-result.json"));
const inspection = readJson(join(CLOSEOUT_DIR, "construction-inspection.json"));
const adjudication = readFileSync(join(CLOSEOUT_DIR, "adjudication.md"), "utf8");

assert.equal(i25.approval_signature_ref, "I25-CTI-PASSWORD-RESET-SES-API-VPCE-JWSUH-LIVE-SEND-OWNER-APPROVAL-2026-07-06");
assert.equal(i25.goal_id, "cti-password-reset-jwsuh-live-send-retry");
assert.equal(i25.approved_scope.vpc_endpoint_service_name, "com.amazonaws.ap-northeast-2.email");
assert.equal(i25.approved_scope.live_send_target_count, 1);
assert.equal(i25.explicit_non_approval.other_user_reset_email_send, false);

assert.equal(receipt.goal_id, "cti-password-reset-jwsuh-live-send-retry");
assert.equal(receipt.vpc_endpoint.service_name, "com.amazonaws.ap-northeast-2.email");
assert.equal(receipt.vpc_endpoint.state, "available");
assert.equal(receipt.vpc_endpoint.private_dns_enabled, true);
assert.equal(receipt.live_send.target_count, 1);
assert.equal(receipt.boundary.non_live_send_user_count, 8);
assert.equal(receipt.boundary.other_user_reset_email_sent, false);
assert.equal(receipt.boundary.other_user_credential_mutated, false);
assert.equal(receipt.boundary.token_value_recorded, false);
assert.equal(receipt.boundary.reset_url_recorded, false);
assert.equal(receipt.boundary.password_value_recorded, false);
assert.equal(receipt.boundary.secret_value_recorded, false);
assert.equal(receipt.boundary.production_ready_claim, false);
assert.equal(receipt.boundary.go_live_claim, false);
assert.equal(receipt.live_send.invoke.email_delivery.token_material_returned, false);
assert.equal(receipt.live_send.invoke.email_delivery.reset_url_returned, false);
assert.equal(receipt.live_send.invoke.token_material_returned, false);
assert.equal(receipt.live_send.invoke.reset_token_key_present, false);
assert.equal(receipt.live_send.invoke.reset_url_key_present, false);

if (packet.closeout_verdict === "PASS") {
  assert.equal(receipt.status, "PASS_JWSUH_LIVE_SEND_RETRY_ONLY");
  assert.equal(receipt.live_send.invoke.http_status_code, 200);
  assert.equal(receipt.live_send.invoke.email_delivery.status, "sent");
  assert.equal(receipt.live_send.invoke.email_delivery.message_id_present, true);
} else {
  assert.equal(packet.closeout_verdict, "BLOCKED");
  assert.equal(receipt.status, "BLOCKED_JWSUH_LIVE_SEND_RETRY");
}

assert.equal(commands.boundary.live_send_target_count, 1);
assert.equal(commands.boundary.non_live_send_user_count, 8);
assert.equal(review.review_result, packet.closeout_verdict);
assert.equal(inspection.inspection.other_users_not_sent, true);
assert.equal(inspection.inspection.token_or_reset_url_recorded, false);
assert.match(adjudication, /remaining 8 production users/i);
assert.match(adjudication, /No token, reset URL, password, secret value/i);

console.log(JSON.stringify({
  outcome: "passed",
  validator: "cti-password-reset-jwsuh-live-send-retry",
  status: receipt.status,
  closeout_verdict: packet.closeout_verdict,
  live_send_target_count: 1,
  non_live_send_user_count: 8,
  production_ready_claim: false
}, null, 2));
