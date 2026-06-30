#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  VAULT_DOCS_PROOF_PATH,
  VAULT_RECORDS_RECEIPT_MD_PATH,
  VAULT_RECORDS_RECEIPT_PATH,
  readJson,
  writeJson,
  writeText
} from "./lcx-full-helpers.mjs";

const packageJson = readJson("package.json");
const proof = readJson(VAULT_DOCS_PROOF_PATH);
const retention = proof.snapshot.rows.find((row) => row.action === "retention");

assert.equal(packageJson.scripts?.["lcx:full:vault-records:validate"], "node scripts/validate-lcx-full-vault-records.mjs");
assert.equal(proof.verdict, "PASS");
assert.ok(retention, "retention row is required");
assert.match(retention.owner, /Vault Records/);
assert.equal(retention.write_enabled, "false");

const receipt = {
  schema_version: "law-firm-os.lazycodex.lcx_full.vault_records_receipt.v0.1",
  generated_at: new Date().toISOString(),
  tuw_ids: ["LCX-FULL-07.05"],
  verdict: "PASS",
  browser_proof: VAULT_DOCS_PROOF_PATH,
  retention_state: retention.state,
  retention_owner: retention.owner,
  boundary: {
    records_policy_receipt_claim: false,
    retention_policy_mutation_claim: false,
    production_go_live_claim: false,
    public_release_claim: false
  }
};

writeJson(VAULT_RECORDS_RECEIPT_PATH, receipt);
writeText(
  VAULT_RECORDS_RECEIPT_MD_PATH,
  `# LCX-FULL-07 Vault Records Receipt\n\nGenerated at: ${receipt.generated_at}\n\nVerdict: PASS\n\nRetention owner: ${receipt.retention_owner}\n\nBoundary: retention remains records-blocked/write-disabled without a records policy receipt; no go-live or public release claim.\n`
);

console.log(JSON.stringify({ verdict: "PASS", receipt: VAULT_RECORDS_RECEIPT_PATH }, null, 2));
