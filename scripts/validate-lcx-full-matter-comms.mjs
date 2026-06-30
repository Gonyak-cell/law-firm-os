#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  createMatterCommsSendRequest,
  createMatterMessageDraft,
  validateMatterRecipients
} from "../apps/web/src/data/externalProviderWorkflowKernel.js";
import {
  MATTER_COMMS_PROOF_PATH,
  MATTER_COMMS_RECEIPT_MD_PATH,
  MATTER_COMMS_RECEIPT_PATH,
  markdownTable,
  readJson,
  writeJson,
  writeText
} from "./lcx-full-helpers.mjs";

const packageJson = readJson("package.json");
assert.equal(packageJson.scripts?.["lcx:full:matter-comms:validate"], "node scripts/validate-lcx-full-matter-comms.mjs");
assert.equal(packageJson.scripts?.["lcx:full:matter-comms-browser-proof"], "node scripts/run-lcx-full-matter-comms-browser-proof.mjs");
const proof = readJson(MATTER_COMMS_PROOF_PATH);
assert.equal(proof.verdict, "PASS");

const approval = { approval_state: "approved", owner_receipt_ref: "owner:receipt:matter-comms-local" };
const providerReceipt = {
  environment: "production",
  production_receipt_ref: "provider:receipt:matter-comms-local",
  scopes: ["message.send"],
  expires_at: "2999-01-01T00:00:00.000Z"
};
const draft = createMatterMessageDraft({
  matterRef: "matter:lcx-full-13",
  bodyRef: "template:matter-update",
  attachmentRefs: ["vault-doc:matter-update"]
});
const deniedRecipients = validateMatterRecipients({ recipientRefs: ["party:client", "client@example.com"] });
const validRecipients = validateMatterRecipients({ recipientRefs: ["party:client"] });
const missingProviderRequest = createMatterCommsSendRequest({ draft, recipientPolicy: validRecipients, approval });
const sendRequested = createMatterCommsSendRequest({ draft, recipientPolicy: validRecipients, providerReceipt, approval });

assert.equal(draft.draft_state, "drafted");
assert.equal(draft.message_body_included, false);
assert.equal(draft.attachment_paths_included, false);
assert.equal(deniedRecipients.recipient_policy_state, "blocked");
assert.equal(validRecipients.recipient_policy_state, "valid");
assert.equal(missingProviderRequest.request_state, "provider-blocked");
assert.equal(sendRequested.request_state, "send-requested");
assert.equal(sendRequested.external_message_sent, false);

const receipt = {
  schema_version: "law-firm-os.lazycodex.lcx_full.matter_comms_receipt.v0.1",
  generated_at: new Date().toISOString(),
  tuw_ids: ["LCX-FULL-13.01", "LCX-FULL-13.02", "LCX-FULL-13.03", "LCX-FULL-13.04", "LCX-FULL-13.05"],
  verdict: "PASS",
  browser_proof: MATTER_COMMS_PROOF_PATH,
  draft_state: draft.draft_state,
  denied_recipient_state: deniedRecipients.recipient_policy_state,
  valid_recipient_state: validRecipients.recipient_policy_state,
  missing_provider_request_state: missingProviderRequest.request_state,
  send_request_state: sendRequested.request_state,
  boundary: {
    external_message_sent_claim: false,
    provider_send_complete_claim: false,
    provider_production_write_claim: false,
    production_go_live_claim: false,
    public_release_claim: false
  }
};

writeJson(MATTER_COMMS_RECEIPT_PATH, receipt);
writeText(
  MATTER_COMMS_RECEIPT_MD_PATH,
  `# LCX-FULL-13 Matter Communication Receipt\n\nGenerated at: ${receipt.generated_at}\n\nVerdict: PASS\n\n${markdownTable([{ Check: "draft", Result: draft.draft_state }, { Check: "denied recipient", Result: deniedRecipients.recipient_policy_state }, { Check: "missing provider", Result: missingProviderRequest.request_state }, { Check: "send request", Result: sendRequested.request_state }], ["Check", "Result"])}\n\nBoundary: Matter communication is draft/send-request evidence only; no external message sent, provider send completion, provider production write, go-live, or public release claim.\n`
);

console.log(JSON.stringify({ verdict: "PASS", receipt: MATTER_COMMS_RECEIPT_PATH }, null, 2));
