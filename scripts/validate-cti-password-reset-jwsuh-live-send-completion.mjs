#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(".");
const CLOSEOUT_DIR = join(ROOT, "docs/goal-closeout/cti-password-reset-jwsuh-live-send-completion");
const I26_RECEIPT = join(ROOT, "docs/launch/cti-i26-owner-approval-receipt-2026-07-06.json");
const COMPLETION_RECEIPT = join(ROOT, "docs/launch/cti-password-reset-jwsuh-live-send-completion-receipt-2026-07-06.json");

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
for (const file of [I26_RECEIPT, COMPLETION_RECEIPT]) {
  assert.equal(existsSync(file), true, `missing evidence file ${file}`);
}

const i26 = readJson(I26_RECEIPT);
const receipt = readJson(COMPLETION_RECEIPT);
const packet = readJson(join(CLOSEOUT_DIR, "packet.json"));
const commands = readJson(join(CLOSEOUT_DIR, "command-evidence.json"));
const review = readJson(join(CLOSEOUT_DIR, "claude-review-result.json"));
const inspection = readJson(join(CLOSEOUT_DIR, "construction-inspection.json"));
const adjudication = readFileSync(join(CLOSEOUT_DIR, "adjudication.md"), "utf8");

assert.equal(i26.approval_signature_ref, "I26-CTI-REMAINING-EXECUTION-OMNIBUS-OWNER-APPROVAL-2026-07-06");
assert.equal(i26.current_goal_id, "cti-password-reset-jwsuh-live-send-completion");
assert.equal(i26.this_receipt_boundary.production_ready_claim_made, false);
assert.equal(i26.this_receipt_boundary.go_live_claim_made, false);
assert.equal(i26.explicit_maintained_limits.password_reset_email_send_to_non_jwsuh_requires_separate_explicit_approval, true);

assert.equal(receipt.goal_id, "cti-password-reset-jwsuh-live-send-completion");
assert.equal(receipt.status, "PASS_JWSUH_LIVE_SEND_COMPLETION_ONLY");
assert.equal(receipt.network_unblock.egress_rule_id, "sgr-085e052c69b79f8a8");
assert.equal(receipt.network_unblock.broad_outbound_internet_egress_created, false);
assert.equal(receipt.network_unblock.nat_gateway_created, false);
assert.equal(receipt.ses_api_vpc_endpoint.state, "available");
assert.equal(receipt.ses_api_vpc_endpoint.private_dns_enabled, true);
assert.equal(receipt.live_send.target_count, 1);
assert.equal(receipt.live_send.http_status_code, 200);
assert.equal(receipt.live_send.email_delivery.provider, "sesv2");
assert.equal(receipt.live_send.email_delivery.status, "sent");
assert.equal(receipt.live_send.email_delivery.message_id_present, true);
assert.equal(receipt.live_send.email_delivery.token_material_returned, false);
assert.equal(receipt.live_send.email_delivery.reset_url_returned, false);
assert.equal(receipt.live_send.token_material_returned, false);
assert.equal(receipt.live_send.reset_token_key_present, false);
assert.equal(receipt.live_send.reset_url_key_present, false);
assert.equal(receipt.live_send.production_ready_claim, false);
assert.equal(receipt.boundary.live_send_target_count, 1);
assert.equal(receipt.boundary.non_live_send_user_count, 8);
assert.equal(receipt.boundary.other_user_reset_email_sent, false);
assert.equal(receipt.boundary.other_user_credential_mutated, false);
assert.equal(receipt.boundary.password_distribution_executed, false);
assert.equal(receipt.boundary.production_ready_claim, false);
assert.equal(receipt.boundary.go_live_claim, false);
assert.equal(receipt.boundary.s5_executed, false);
assert.equal(receipt.boundary.s6_executed, false);
assert.equal(receipt.boundary.oidc_executed, false);
assert.equal(receipt.boundary.db_conversion_executed, false);

assert.equal(packet.closeout_verdict, "PASS");
assert.equal(commands.decision, "PASS");
assert(commands.commands.some((command) => command.command === "aws ec2 authorize-security-group-egress" && command.exit_code === 0));
assert(commands.commands.some((command) => command.command === "aws lambda invoke" && command.exit_code === 0));
assert.equal(review.review_result, "PASS");
assert.equal(inspection.inspection.live_send_status, "sent");
assert.equal(inspection.inspection.other_users_not_sent, true);
assert.equal(inspection.inspection.token_or_reset_url_recorded, false);
assert.match(adjudication, /No token, reset URL, password, secret value/);

console.log(JSON.stringify({
  outcome: "passed",
  validator: "cti-password-reset-jwsuh-live-send-completion",
  status: receipt.status,
  closeout_verdict: packet.closeout_verdict,
  live_send_target_count: 1,
  non_live_send_user_count: 8,
  production_ready_claim: false,
  go_live_claim: false
}, null, 2));
