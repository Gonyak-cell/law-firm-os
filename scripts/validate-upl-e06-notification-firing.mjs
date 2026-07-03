import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const artifact = JSON.parse(readFileSync("artifacts/manual-qa/upl-e06-notification-firing-proof.json", "utf8"));
const matrix = readFileSync("artifacts/manual-qa/wave1-70-tuw-strict-verification-2026-07-03.md", "utf8");

assert.equal(existsSync("packages/notifications/src/service.js"), true);
assert.equal(existsSync("packages/notifications/test/service.test.js"), true);
assert.equal(artifact.row_id, "UPL-E-06");
assert.equal(artifact.status, "PASS");
assert.deepEqual(artifact.required_event_classes, [
  "approval_pending",
  "deadline_approaching",
  "contract_expiring",
  "risk_detected",
]);
assert.equal(artifact.boundary.aws_ses_provider_shape, true);
assert.equal(artifact.boundary.external_aws_ses_network_call_made, false);
assert.equal(artifact.boundary.credential_material_included, false);
assert.equal(artifact.receipts.length, 4);
for (const receipt of artifact.receipts) {
  assert.equal(receipt.outcome, "fired");
  assert.equal(receipt.in_app_delivery.state, "delivered");
  assert.equal(receipt.ses_send_record.provider, "aws-ses");
  assert.equal(receipt.ses_send_record.state, "accepted");
  assert.equal(receipt.ses_send_record.payload_body_included, false);
}
assert.match(
  matrix,
  /\| UPL-E-06 \| PASS \| Notification firing service records both in-app delivery and SES-shaped send records/,
);

console.log("UPL-E-06 notification firing validator PASS");
