#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const MV_ROOT = path.join(ROOT, "docs/reorganization/client-matter-os/matter-vault-r4");
const CROSSWALK = path.join(MV_ROOT, "matter-vault-tuw-crosswalk.json");
const TARGET_MAPPING = path.join(MV_ROOT, "matter-vault-target-file-mapping.json");
const MANIFEST = path.join(MV_ROOT, "package-manifest.json");

const errors = [];

function add(message) {
  errors.push(message);
}

function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

for (const file of [CROSSWALK, TARGET_MAPPING, MANIFEST]) {
  if (!existsSync(file)) add(`missing required Matter-Vault readiness artifact: ${path.relative(ROOT, file)}`);
}

if (errors.length === 0) {
  const crosswalk = readJson(CROSSWALK);
  const targetMapping = readJson(TARGET_MAPPING);
  const manifest = readJson(MANIFEST);

  if (crosswalk.length !== 118) add(`crosswalk must contain 118 TUWs, got ${crosswalk.length}`);
  if (targetMapping.total_target_mappings !== 118) add(`target mapping must contain 118 rows, got ${targetMapping.total_target_mappings}`);
  if (manifest.closed_tuws !== 118 || manifest.not_closed_tuws !== 0) {
    add("manifest must report closed_tuws 118 and not_closed_tuws 0");
  }
  if (manifest.current_completion_claim !== "repo_implementation_evidence_closeout_complete") {
    add("manifest current_completion_claim must be repo_implementation_evidence_closeout_complete");
  }
  if (manifest.production_ready_claim !== false || manifest.go_live_claim !== false) {
    add("production_ready_claim and go_live_claim must remain false");
  }

  for (const row of crosswalk) {
    if (row.repo_status === "mapped_pending_runtime_evidence") add(`${row.tuw_id}: repo_status still pending`);
    if (row.implementation_gate === "not_closed") add(`${row.tuw_id}: implementation_gate still not_closed`);
    if (!row.loop_engineering?.plan || !row.loop_engineering?.do || !row.loop_engineering?.check || !row.loop_engineering?.act) {
      add(`${row.tuw_id}: missing Plan/Do/Check/Act loop engineering fields`);
    }
    if (!existsSync(path.join(ROOT, row.evidence_path))) add(`${row.tuw_id}: missing evidence path ${row.evidence_path}`);
  }

  for (const mapping of targetMapping.mappings ?? []) {
    if (!mapping.classification) add(`${mapping.tuw_id}: target mapping classification missing`);
    if (mapping.classification !== "launch_only_external_receipt" && mapping.exists !== true) {
      add(`${mapping.tuw_id}: non-launch target mapping must exist literally: ${mapping.target_path}`);
    }
    if (mapping.classification === "launch_only_external_receipt" && !String(mapping.target_path).includes("CI")) {
      add(`${mapping.tuw_id}: only CI-style receipts may be launch_only_external_receipt`);
    }
  }
}

if (errors.length > 0) {
  console.error("Matter-Vault R4 readiness validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Matter-Vault R4 readiness validation passed.");
console.log("closed_tuws: 118");
console.log("not_closed_tuws: 0");
console.log("launch_go_live_claim: false");
