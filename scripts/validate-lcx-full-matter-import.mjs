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
  MATTER_IMPORT_PROOF_PATH,
  MATTER_IMPORT_RECEIPT_MD_PATH,
  MATTER_IMPORT_RECEIPT_PATH,
  markdownTable,
  readJson,
  writeJson,
  writeText
} from "./lcx-full-helpers.mjs";

const packageJson = readJson("package.json");
assert.equal(packageJson.scripts?.["lcx:full:matter-import:validate"], "node scripts/validate-lcx-full-matter-import.mjs");
const proof = readJson(MATTER_IMPORT_PROOF_PATH);
assert.equal(proof.verdict, "PASS");

const source = stageImportSource({ domain: "matter", rows: [{ matter_title: "Alpha", storage_pointer: "s3://raw" }] });
const mapping = validateImportMapping({ domain: "matter", mappings: [{ source_field: "matter_title", target_field: "matter_title" }] });
const rejected = validateImportMapping({ domain: "matter", mappings: [{ source_field: "amount", target_field: "billing_account" }] });
const dry = dryRunImport({ domain: "matter", source, mapping });
const request = createApprovalRequest({ actor_ref: "actor:matter-import", object_ref: "matter:import", reason_ref: "reason:import" });
const approval = decideApprovalRequest(request, { action: "approve", decided_by_ref: "owner:matter-import", owner_receipt_ref: "owner-receipt:matter-import" });
const executed = executeImportSynthetic({ domain: "matter", source, mapping, approval });
const rollback = rollbackImport({ domain: "matter", safeErrorCode: "matter_import_rollback" });

assert.equal(assertImportEnrichmentSafe(source).valid, true);
assert.equal(source.raw_rows_included, false);
assert.equal(mapping.valid, true);
assert.equal(rejected.valid, false);
assert.equal(dry.target_mutation_count, 0);
assert.equal(executed.run_state, "executed");
assert.equal(executed.external_mutation_performed, false);
assert.equal(rollback.run_state, "rolled_back");

const receipt = {
  schema_version: "law-firm-os.lazycodex.lcx_full.matter_import_receipt.v0.1",
  generated_at: new Date().toISOString(),
  tuw_ids: ["LCX-FULL-08.01", "LCX-FULL-08.02", "LCX-FULL-08.03", "LCX-FULL-08.04", "LCX-FULL-08.05", "LCX-FULL-08.06"],
  verdict: "PASS",
  browser_proof: MATTER_IMPORT_PROOF_PATH,
  rejected_fields: rejected.rejected_fields,
  dry_run_state: dry.dry_run_state,
  execute_state: executed.run_state,
  rollback_state: rollback.run_state,
  boundary: { production_import_complete_claim: false, raw_rows_included: false, target_mutation_count: 0 }
};

writeJson(MATTER_IMPORT_RECEIPT_PATH, receipt);
writeText(
  MATTER_IMPORT_RECEIPT_MD_PATH,
  `# LCX-FULL-08 Matter Import Receipt\n\nGenerated at: ${receipt.generated_at}\n\nVerdict: PASS\n\n${markdownTable([{ Check: "source", Result: "raw rows hidden" }, { Check: "mapping", Result: "allowlist enforced" }, { Check: "dry-run", Result: dry.dry_run_state }, { Check: "execute", Result: executed.run_state }, { Check: "rollback", Result: rollback.run_state }], ["Check", "Result"])}\n\nBoundary: approved synthetic execute is test-only; no production import complete claim.\n`
);

console.log(JSON.stringify({ verdict: "PASS", receipt: MATTER_IMPORT_RECEIPT_PATH }, null, 2));
