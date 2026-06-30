#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  MATTER_VAULT_EMAIL_RECEIPT_MD_PATH,
  MATTER_VAULT_EMAIL_RECEIPT_PATH,
  MATTER_VAULT_PROOF_PATH,
  readJson,
  writeJson,
  writeText
} from "./lcx-full-helpers.mjs";

const packageJson = readJson("package.json");
const proof = readJson(MATTER_VAULT_PROOF_PATH);

assert.equal(packageJson.scripts?.["lcx:full:matter-vault-email:validate"], "node scripts/validate-lcx-full-matter-vault-email.mjs");
assert.equal(proof.verdict, "PASS");
assert.equal(proof.snapshot.email_provider_blocked, true);
assert.equal(["draft-required", "provider-blocked"].includes(proof.snapshot.attrs.email_send_state), true);

const receipt = {
  schema_version: "law-firm-os.lazycodex.lcx_full.matter_vault_email_receipt.v0.1",
  generated_at: new Date().toISOString(),
  tuw_ids: ["LCX-FULL-06.04"],
  verdict: "PASS",
  browser_proof: MATTER_VAULT_PROOF_PATH,
  email_send_state: proof.snapshot.attrs.email_send_state,
  boundary: {
    external_email_draft_package_visible: true,
    external_email_send_claim: false,
    provider_receipt_claim: false,
    production_go_live_claim: false,
    public_release_claim: false
  }
};

writeJson(MATTER_VAULT_EMAIL_RECEIPT_PATH, receipt);
writeText(
  MATTER_VAULT_EMAIL_RECEIPT_MD_PATH,
  `# LCX-FULL-06 Matter Vault Email Receipt\n\nGenerated at: ${receipt.generated_at}\n\nVerdict: PASS\n\nEmail send state: ${receipt.email_send_state}\n\nBoundary: draft/send request is visible, but no external email send, provider receipt, go-live, or public release claim is made.\n`
);

console.log(JSON.stringify({ verdict: "PASS", receipt: MATTER_VAULT_EMAIL_RECEIPT_PATH }, null, 2));
