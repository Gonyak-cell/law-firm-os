#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  VAULT_DOCS_PROOF_PATH,
  VAULT_DOC_ACTION_RECEIPT_MD_PATH,
  VAULT_DOC_ACTION_RECEIPT_PATH,
  markdownTable,
  readJson,
  writeJson,
  writeText
} from "./lcx-full-helpers.mjs";

const packageJson = readJson("package.json");
const proof = readJson(VAULT_DOCS_PROOF_PATH);
const uploadPreflight = readJson("docs/lazycodex/evidence/matter-web/artifacts/lcx-vltui-upload-preflight-proof.json");
const actionBoundaries = readJson("docs/lazycodex/evidence/matter-web/artifacts/lcx-vltui-browser-qa-proof.json");

assert.equal(packageJson.scripts?.["lcx:full:vault-doc-actions:validate"], "node scripts/validate-lcx-full-vault-doc-actions.mjs");
assert.equal(proof.verdict, "PASS");
assert.equal(uploadPreflight.verdict, "PASS");
assert.equal(actionBoundaries.verdict, "PASS");
assert.equal(proof.snapshot.rows.length >= 5, true);
assert.equal(proof.snapshot.rows.every((row) => row.write_enabled === "false"), true);
assert.equal(proof.snapshot.rows.some((row) => row.action === "metadata-mutation"), true);
assert.equal(proof.snapshot.rows.some((row) => row.action === "version-upload"), true);

const receipt = {
  schema_version: "law-firm-os.lazycodex.lcx_full.vault_doc_action_receipt.v0.1",
  generated_at: new Date().toISOString(),
  tuw_ids: ["LCX-FULL-07.01", "LCX-FULL-07.02", "LCX-FULL-07.03", "LCX-FULL-07.04", "LCX-FULL-07.06"],
  verdict: "PASS",
  browser_proof: VAULT_DOCS_PROOF_PATH,
  upload_preflight_proof: "docs/lazycodex/evidence/matter-web/artifacts/lcx-vltui-upload-preflight-proof.json",
  action_boundary_proof: "docs/lazycodex/evidence/matter-web/artifacts/lcx-vltui-browser-qa-proof.json",
  actions: proof.snapshot.rows.map((row) => ({ action: row.action, state: row.state, owner: row.owner, write_enabled: row.write_enabled })),
  boundary: {
    version_upload_request_only: true,
    metadata_mutation_complete_claim: false,
    legal_hold_owner_decision_claim: false,
    vault_document_write_claim: false,
    public_release_claim: false
  }
};

writeJson(VAULT_DOC_ACTION_RECEIPT_PATH, receipt);
writeText(
  VAULT_DOC_ACTION_RECEIPT_MD_PATH,
  [
    "# LCX-FULL-07 Vault Document Action Receipt",
    "",
    `Generated at: ${receipt.generated_at}`,
    "",
    "Verdict: PASS",
    "",
    markdownTable(receipt.actions.map((row) => ({ Action: row.action, State: row.state, Owner: row.owner, Write: row.write_enabled })), ["Action", "State", "Owner", "Write"]),
    "",
    "Boundary: version, metadata, legal hold, retention, and document action rows remain write-disabled unless later receipts exist."
  ].join("\n") + "\n"
);

console.log(JSON.stringify({ verdict: "PASS", receipt: VAULT_DOC_ACTION_RECEIPT_PATH }, null, 2));
