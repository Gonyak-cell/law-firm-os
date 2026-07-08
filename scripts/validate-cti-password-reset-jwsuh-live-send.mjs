#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(".");
const CLOSEOUT_DIR = join(ROOT, "docs/goal-closeout/cti-password-reset-jwsuh-live-send");
const OWNER_DIRECTION = join(ROOT, "docs/launch/cti-password-reset-jwsuh-live-send-owner-direction-2026-07-06.json");
const RECEIPT = join(ROOT, "docs/launch/cti-password-reset-jwsuh-live-send-receipt-2026-07-06.json");

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
for (const file of [OWNER_DIRECTION, RECEIPT]) {
  assert.equal(existsSync(file), true, `missing evidence file ${file}`);
}

const ownerDirection = readJson(OWNER_DIRECTION);
const receipt = readJson(RECEIPT);
const packet = readJson(join(CLOSEOUT_DIR, "packet.json"));
const commandEvidence = readJson(join(CLOSEOUT_DIR, "command-evidence.json"));
const review = readJson(join(CLOSEOUT_DIR, "claude-review-result.json"));
const inspection = readJson(join(CLOSEOUT_DIR, "construction-inspection.json"));
const adjudication = readFileSync(join(CLOSEOUT_DIR, "adjudication.md"), "utf8");

assert.equal(ownerDirection.direction_ref, "I23-SCOPE-NARROWING-JWSUH-LIVE-SEND-ONLY-2026-07-06");
assert.equal(ownerDirection.direction.live_send_verification_target_count, 1);
assert.equal(ownerDirection.direction.non_live_send_user_count, 8);
assert.equal(ownerDirection.explicit_boundary.other_user_reset_email_send, false);

assert.equal(receipt.goal_id, "cti-password-reset-jwsuh-live-send");
assert.equal(receipt.aws_account, "770880870480");
assert.equal(receipt.region, "ap-northeast-2");
assert.equal(receipt.live_send.target_count, 1);
assert.equal(receipt.live_send.non_live_send_user_count, 8);
assert.equal(receipt.live_send.invoke_evidence.email_delivery.token_material_returned, false);
assert.equal(receipt.live_send.invoke_evidence.email_delivery.reset_url_returned, false);
assert.equal(receipt.live_send.invoke_evidence.token_material_returned, false);
assert.equal(receipt.live_send.invoke_evidence.reset_token_string_present, false);
assert.equal(receipt.live_send.invoke_evidence.reset_url_string_present, false);
assert.equal(receipt.boundary.other_user_reset_email_sent, false);
assert.equal(receipt.boundary.other_user_credential_mutated, false);
assert.equal(receipt.boundary.token_value_recorded, false);
assert.equal(receipt.boundary.reset_url_recorded, false);
assert.equal(receipt.boundary.password_value_recorded, false);
assert.equal(receipt.boundary.secret_value_recorded, false);
assert.equal(receipt.boundary.production_ready_claim, false);
assert.equal(receipt.boundary.go_live_claim, false);

if (packet.closeout_verdict === "PASS") {
  assert.equal(receipt.status, "PASS_JWSUH_LIVE_SEND_ONLY");
  assert.equal(receipt.live_send.invoke_evidence.http_status_code, 200);
  assert.equal(receipt.live_send.invoke_evidence.email_delivery.status, "sent");
  assert.equal(receipt.live_send.invoke_evidence.email_delivery.message_id_present, true);
} else {
  assert.equal(packet.closeout_verdict, "BLOCKED");
  assert.equal(receipt.status, "BLOCKED_JWSUH_LIVE_SEND");
}

assert.equal(commandEvidence.live_send_target_count, 1);
assert.equal(commandEvidence.non_live_send_user_count, 8);
assert(commandEvidence.commands.some((command) => command.summary.includes("Focused password reset/auth/Lambda/desktop tests PASS")));
assert.equal(review.review_result, packet.closeout_verdict);
assert.equal(inspection.inspection.other_users_not_sent, true);
assert.equal(inspection.inspection.token_or_reset_url_recorded, false);
assert.match(adjudication, /remaining 8 production users/i);
assert.match(adjudication, /No token, reset URL, password, secret value/i);

console.log(JSON.stringify({
  outcome: "passed",
  validator: "cti-password-reset-jwsuh-live-send",
  status: receipt.status,
  closeout_verdict: packet.closeout_verdict,
  live_send_target_count: 1,
  non_live_send_user_count: 8,
  production_ready_claim: false
}, null, 2));
