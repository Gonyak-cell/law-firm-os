#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  createContractDraftPackage,
  createESignSendRequest,
  validateContractSigners
} from "../apps/web/src/data/externalProviderWorkflowKernel.js";
import {
  CONTRACTS_PROOF_PATH,
  CONTRACTS_RECEIPT_MD_PATH,
  CONTRACTS_RECEIPT_PATH,
  markdownTable,
  readJson,
  writeJson,
  writeText
} from "./lcx-full-helpers.mjs";

const packageJson = readJson("package.json");
assert.equal(packageJson.scripts?.["lcx:full:contracts-esign:validate"], "node scripts/validate-lcx-full-contracts-esign.mjs");
assert.equal(packageJson.scripts?.["lcx:full:contracts-browser-proof"], "node scripts/run-lcx-full-contracts-browser-proof.mjs");
const proof = readJson(CONTRACTS_PROOF_PATH);
assert.equal(proof.verdict, "PASS");

const approval = { approval_state: "approved", owner_receipt_ref: "owner:receipt:contracts-local" };
const providerReceipt = {
  environment: "production",
  production_receipt_ref: "provider:receipt:esign-local",
  scopes: ["esign.send"],
  expires_at: "2999-01-01T00:00:00.000Z"
};
const draft = createContractDraftPackage({
  proposalRef: "proposal:lcx-full-11",
  clientRef: "client:lcx-full-11",
  vaultDocumentRefs: ["vault-doc:contract-draft"]
});
const missingSigner = validateContractSigners({
  draft,
  signers: [{ role: "client_signer", signer_ref: "party:client", signing_order: 1 }]
});
const validSigners = validateContractSigners({
  draft,
  signers: [
    { role: "client_signer", signer_ref: "party:client", field_packet_ref: "fields:client", signing_order: 1 },
    { role: "firm_signer", signer_ref: "party:firm", field_packet_ref: "fields:firm", signing_order: 2 }
  ]
});
const missingProviderRequest = createESignSendRequest({ draft, signerValidation: validSigners, approval });
const requestReady = createESignSendRequest({ draft, signerValidation: validSigners, providerReceipt, approval });

assert.equal(draft.draft_state, "drafted");
assert.equal(draft.vault_document_ref_present, true);
assert.equal(draft.document_payload_included, false);
assert.equal(missingSigner.signer_state, "blocked");
assert.equal(validSigners.signer_state, "valid");
assert.equal(missingProviderRequest.request_state, "provider-blocked");
assert.equal(requestReady.request_state, "request-ready");
assert.equal(requestReady.envelope_sent, false);
assert.equal(requestReady.external_signature_request_performed, false);

const receipt = {
  schema_version: "law-firm-os.lazycodex.lcx_full.contracts_esign_receipt.v0.1",
  generated_at: new Date().toISOString(),
  tuw_ids: ["LCX-FULL-11.01", "LCX-FULL-11.02", "LCX-FULL-11.03", "LCX-FULL-11.04", "LCX-FULL-11.05"],
  verdict: "PASS",
  browser_proof: CONTRACTS_PROOF_PATH,
  draft_state: draft.draft_state,
  signer_missing_state: missingSigner.signer_state,
  signer_valid_state: validSigners.signer_state,
  missing_provider_request_state: missingProviderRequest.request_state,
  request_ready_state: requestReady.request_state,
  boundary: {
    provider_receipt_claim: false,
    envelope_sent_claim: false,
    external_signature_request_performed: false,
    production_go_live_claim: false,
    public_release_claim: false
  }
};

writeJson(CONTRACTS_RECEIPT_PATH, receipt);
writeText(
  CONTRACTS_RECEIPT_MD_PATH,
  `# LCX-FULL-11 Contracts And E-Sign Receipt\n\nGenerated at: ${receipt.generated_at}\n\nVerdict: PASS\n\n${markdownTable([{ Check: "draft", Result: draft.draft_state }, { Check: "missing signer", Result: missingSigner.signer_state }, { Check: "missing provider", Result: missingProviderRequest.request_state }, { Check: "ready request", Result: requestReady.request_state }], ["Check", "Result"])}\n\nBoundary: contract package is draft/request-ready only; no envelope sent, external signature request performed, provider receipt claim, go-live, or public release claim.\n`
);

console.log(JSON.stringify({ verdict: "PASS", receipt: CONTRACTS_RECEIPT_PATH }, null, 2));
