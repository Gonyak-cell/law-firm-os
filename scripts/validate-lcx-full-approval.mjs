#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  createApprovalRequest,
  decideApprovalRequest
} from "../apps/web/src/data/approvalProviderRunKernel.js";
import {
  APPROVAL_PROOF_PATH,
  APPROVAL_RECEIPT_MD_PATH,
  APPROVAL_RECEIPT_PATH,
  fileExists,
  markdownTable,
  readJson,
  writeJson,
  writeText
} from "./lcx-full-helpers.mjs";

const packageJson = readJson("package.json");
assert.equal(packageJson.scripts?.["lcx:full:approval:validate"], "node scripts/validate-lcx-full-approval.mjs");

const request = createApprovalRequest({
  actor_ref: "actor:approval-validator",
  object_ref: "matter:approval-validator",
  reason_ref: "reason:owner-blocked-action",
  approval_scope: "owner-blocked-action"
});
const agentAttempt = decideApprovalRequest(request, { action: "approve", inferred_by: "agent" });
const approved = decideApprovalRequest(request, {
  action: "approve",
  decided_by_ref: "owner:validator",
  owner_receipt_ref: "owner-receipt:validator"
});
const rejected = decideApprovalRequest(request, { action: "reject", decided_by_ref: "owner:validator" });
const expired = decideApprovalRequest(request, { action: "expire" });

assert.equal(request.approval_state, "requested");
assert.equal(agentAttempt.transition_allowed, false);
assert.equal(agentAttempt.blocked_reason, "human_owner_receipt_required");
assert.equal(approved.approval_state, "approved");
assert.equal(rejected.approval_state, "rejected");
assert.equal(expired.approval_state, "expired");
assert.equal(approved.audit_events.length, 2);
assert.equal(fileExists(APPROVAL_PROOF_PATH), true, "approval browser proof must exist");
const proof = readJson(APPROVAL_PROOF_PATH);
assert.equal(proof.verdict, "PASS");

const receipt = {
  schema_version: "law-firm-os.lazycodex.lcx_full.approval_receipt.v0.1",
  generated_at: new Date().toISOString(),
  tuw_ids: ["LCX-FULL-03.01", "LCX-FULL-03.02", "LCX-FULL-03.03", "LCX-FULL-03.04", "LCX-FULL-03.05"],
  verdict: "PASS",
  approval_states: [request.approval_state, approved.approval_state, rejected.approval_state, expired.approval_state],
  agent_inferred_approval_blocked: agentAttempt.blocked_reason,
  browser_proof: APPROVAL_PROOF_PATH,
  boundary: {
    owner_approval_claim: "receipt_recorded_not_launch_approval",
    production_go_live_claim: false,
    public_release_claim: false,
    provider_production_write_claim: false
  }
};

writeJson(APPROVAL_RECEIPT_PATH, receipt);
writeText(
  APPROVAL_RECEIPT_MD_PATH,
  [
    "# LCX-FULL-03 Approval Receipt",
    "",
    `Generated at: ${receipt.generated_at}`,
    "",
    "Verdict: PASS",
    "",
    markdownTable([
      { Check: "create/read", Result: "requested" },
      { Check: "agent inferred approve", Result: agentAttempt.blocked_reason },
      { Check: "human approve", Result: approved.approval_state },
      { Check: "reject", Result: rejected.approval_state },
      { Check: "expire", Result: expired.approval_state }
    ], ["Check", "Result"]),
    "",
    "## Boundary",
    "",
    "- Human owner receipt is required for approval decisions.",
    "- This receipt does not grant launch owner approval, production go-live, provider write, or public release."
  ].join("\n") + "\n"
);

console.log(JSON.stringify({ verdict: "PASS", receipt: APPROVAL_RECEIPT_PATH, proof: APPROVAL_PROOF_PATH }, null, 2));
