#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  MATTER_VAULT_PROOF_PATH,
  MATTER_VAULT_RECEIPT_MD_PATH,
  MATTER_VAULT_RECEIPT_PATH,
  markdownTable,
  readJson,
  writeJson,
  writeText
} from "./lcx-full-helpers.mjs";

const packageJson = readJson("package.json");
const fullProof = readJson(MATTER_VAULT_PROOF_PATH);
const workspaceProof = readJson("docs/lazycodex/evidence/matter-web/artifacts/lcx-vltui-matter-document-workspace-proof.json");

assert.equal(packageJson.scripts?.["lcx:full:matter-vault:validate"], "node scripts/validate-lcx-full-matter-vault.mjs");
assert.equal(fullProof.verdict, "PASS");
assert.equal(workspaceProof.verdict, "PASS");
assert.equal(workspaceProof.schema_version, "law-firm-os.lazycodex.lcx_vltui.matter_document_workspace_proof.v0.1");
assert.equal(fullProof.snapshot.attrs.publish_write_enabled, "false");
assert.equal(["preflight-required", "owner-provider-blocked"].includes(fullProof.snapshot.attrs.import_execute_state), true);

const receipt = {
  schema_version: "law-firm-os.lazycodex.lcx_full.matter_vault_receipt.v0.1",
  generated_at: new Date().toISOString(),
  tuw_ids: ["LCX-FULL-06.01", "LCX-FULL-06.02", "LCX-FULL-06.03", "LCX-FULL-06.05"],
  verdict: "PASS",
  full_browser_proof: MATTER_VAULT_PROOF_PATH,
  workspace_proof: "docs/lazycodex/evidence/matter-web/artifacts/lcx-vltui-matter-document-workspace-proof.json",
  boundary: {
    preflight_without_vault_write: true,
    publish_exit_state: "request_or_owner_blocked",
    import_execute_claim: false,
    vault_write_complete_claim: false,
    public_release_claim: false
  }
};

writeJson(MATTER_VAULT_RECEIPT_PATH, receipt);
writeText(
  MATTER_VAULT_RECEIPT_MD_PATH,
  [
    "# LCX-FULL-06 Matter Vault Receipt",
    "",
    `Generated at: ${receipt.generated_at}`,
    "",
    "Verdict: PASS",
    "",
    markdownTable([
      { Check: "preflight", Result: "no Vault write" },
      { Check: "publish", Result: receipt.boundary.publish_exit_state },
      { Check: "import", Result: fullProof.snapshot.attrs.import_execute_state },
      { Check: "browser proof", Result: fullProof.verdict }
    ], ["Check", "Result"]),
    "",
    "Boundary: request, preflight, dry-run, and owner/provider-blocked states only."
  ].join("\n") + "\n"
);

console.log(JSON.stringify({ verdict: "PASS", receipt: MATTER_VAULT_RECEIPT_PATH }, null, 2));
