#!/usr/bin/env node
import assert from "node:assert/strict";
import { createApprovalRequest, decideApprovalRequest } from "../apps/web/src/data/approvalProviderRunKernel.js";
import {
  assertImportEnrichmentSafe,
  dryRunImport,
  executeImportSynthetic,
  rollbackImport,
  stageImportSource,
  validateImportMapping
} from "../apps/web/src/data/importEnrichmentKernel.js";
import {
  CLIENT_IMPORT_PROOF_PATH,
  CLIENT_IMPORT_RECEIPT_MD_PATH,
  CLIENT_IMPORT_RECEIPT_PATH,
  markdownTable,
  readJson,
  writeJson,
  writeText
} from "./lcx-full-helpers.mjs";

const packageJson = readJson("package.json");
assert.equal(packageJson.scripts?.["lcx:full:client-import:validate"], "node scripts/validate-lcx-full-client-import.mjs");
const proof = readJson(CLIENT_IMPORT_PROOF_PATH);
assert.equal(proof.verdict, "PASS");

const source = stageImportSource({ domain: "client", rows: [{ company_name: "ACME", provider_url: "https://raw.example" }] });
const mapping = validateImportMapping({ domain: "client", mappings: [{ source_field: "company_name", target_field: "company_name" }] });
const rejected = validateImportMapping({ domain: "client", mappings: [{ source_field: "ssn", target_field: "personal_identifier" }] });
const dry = dryRunImport({ domain: "client", source, mapping });
const blocked = executeImportSynthetic({ domain: "client", source, mapping });
const request = createApprovalRequest({ actor_ref: "actor:client-import", object_ref: "client:import", reason_ref: "reason:import" });
const approval = decideApprovalRequest(request, { action: "approve", decided_by_ref: "owner:client-import", owner_receipt_ref: "owner-receipt:client-import" });
const executed = executeImportSynthetic({ domain: "client", source, mapping, approval });
const rollback = rollbackImport({ domain: "client", safeErrorCode: "client_import_rollback" });

assert.equal(assertImportEnrichmentSafe(source).valid, true);
assert.equal(source.raw_rows_included, false);
assert.equal(mapping.valid, true);
assert.equal(rejected.valid, false);
assert.equal(dry.target_mutation_count, 0);
assert.equal(blocked.blocked_reason, "owner_approval_required");
assert.equal(executed.run_state, "executed");
assert.equal(executed.external_mutation_performed, false);
assert.equal(rollback.run_state, "rolled_back");

const receipt = {
  schema_version: "law-firm-os.lazycodex.lcx_full.client_import_receipt.v0.1",
  generated_at: new Date().toISOString(),
  tuw_ids: ["LCX-FULL-09.01", "LCX-FULL-09.02", "LCX-FULL-09.03", "LCX-FULL-09.04", "LCX-FULL-09.05", "LCX-FULL-09.06"],
  verdict: "PASS",
  browser_proof: CLIENT_IMPORT_PROOF_PATH,
  rejected_fields: rejected.rejected_fields,
  blocked_without_approval: blocked.blocked_reason,
  dry_run_state: dry.dry_run_state,
  execute_state: executed.run_state,
  rollback_state: rollback.run_state,
  boundary: { production_client_import_complete_claim: false, raw_rows_included: false, target_mutation_count: 0 }
};

writeJson(CLIENT_IMPORT_RECEIPT_PATH, receipt);
writeText(
  CLIENT_IMPORT_RECEIPT_MD_PATH,
  `# LCX-FULL-09 Client Import Receipt\n\nGenerated at: ${receipt.generated_at}\n\nVerdict: PASS\n\n${markdownTable([{ Check: "source", Result: "raw rows hidden" }, { Check: "mapping", Result: "allowlist enforced" }, { Check: "execute without approval", Result: blocked.blocked_reason }, { Check: "execute", Result: executed.run_state }, { Check: "rollback", Result: rollback.run_state }], ["Check", "Result"])}\n\nBoundary: approved synthetic execute is test-only; no production Client import complete claim.\n`
);

console.log(JSON.stringify({ verdict: "PASS", receipt: CLIENT_IMPORT_RECEIPT_PATH }, null, 2));
