#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  activateSegment,
  createConsentCoverage,
  createEnrichmentJob,
  createIdentityCandidates
} from "../apps/web/src/data/importEnrichmentKernel.js";
import {
  CLIENT_DATA_PROOF_PATH,
  CLIENT_DATA_RECEIPT_MD_PATH,
  CLIENT_DATA_RECEIPT_PATH,
  markdownTable,
  readJson,
  writeJson,
  writeText
} from "./lcx-full-helpers.mjs";

const packageJson = readJson("package.json");
assert.equal(packageJson.scripts?.["lcx:full:client-data:validate"], "node scripts/validate-lcx-full-client-data.mjs");
const proof = readJson(CLIENT_DATA_PROOF_PATH);
assert.equal(proof.verdict, "PASS");

const noConsent = createConsentCoverage();
const consent = createConsentCoverage({ basisRef: "consent:client-data", subjectRefs: ["client:1"] });
const blockedJob = createEnrichmentJob({ consent });
const candidates = createIdentityCandidates({ job: blockedJob });
const blockedActivation = activateSegment({ job: blockedJob });
const readyJob = createEnrichmentJob({
  consent,
  providerReceipt: {
    environment: "production",
    production_receipt_ref: "prod:enrich",
    scopes: ["enrich"],
    expires_at: "2999-01-01T00:00:00.000Z"
  },
  rollbackPlanRef: "rollback:segment"
});
const requestReadyActivation = activateSegment({ job: readyJob, rollbackPlanRef: "rollback:segment" });

assert.equal(noConsent.consent_covered, false);
assert.equal(consent.consent_covered, true);
assert.equal(blockedJob.execute_state, "provider-blocked");
assert.equal(candidates.automatic_merge_performed, false);
assert.equal(candidates.canonical_master_data_write_performed, false);
assert.equal(blockedActivation.activation_submitted, false);
assert.equal(requestReadyActivation.activation_state, "request_ready");
assert.equal(requestReadyActivation.activation_submitted, false);

const receipt = {
  schema_version: "law-firm-os.lazycodex.lcx_full.client_data_receipt.v0.1",
  generated_at: new Date().toISOString(),
  tuw_ids: ["LCX-FULL-10.01", "LCX-FULL-10.02", "LCX-FULL-10.03", "LCX-FULL-10.04", "LCX-FULL-10.05", "LCX-FULL-10.06"],
  verdict: "PASS",
  browser_proof: CLIENT_DATA_PROOF_PATH,
  consent_covered: consent.consent_covered,
  missing_provider_execute_state: blockedJob.execute_state,
  identity_candidate_state: candidates.candidate_state,
  segment_activation_state: blockedActivation.activation_state,
  boundary: {
    provider_enrichment_live_claim: false,
    provider_receipt_claim: false,
    automatic_merge_performed: false,
    activation_submitted: false,
    production_go_live_claim: false
  }
};

writeJson(CLIENT_DATA_RECEIPT_PATH, receipt);
writeText(
  CLIENT_DATA_RECEIPT_MD_PATH,
  `# LCX-FULL-10 Client Data Receipt\n\nGenerated at: ${receipt.generated_at}\n\nVerdict: PASS\n\n${markdownTable([{ Check: "consent", Result: "covered" }, { Check: "missing provider execute", Result: blockedJob.execute_state }, { Check: "identity candidates", Result: candidates.candidate_state }, { Check: "segment activation", Result: blockedActivation.activation_state }], ["Check", "Result"])}\n\nBoundary: governed enrichment workflow is model-ready; no provider enrichment live, auto-merge, activation submit, go-live, or public release claim.\n`
);

console.log(JSON.stringify({ verdict: "PASS", receipt: CLIENT_DATA_RECEIPT_PATH }, null, 2));
