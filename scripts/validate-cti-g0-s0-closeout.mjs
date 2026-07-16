#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const APPROVAL_REF = "I4-CTI-G0-S0-OWNER-RATIFICATION-2026-07-06";

const files = {
  plan: "workbook/canonical-tenant-data-injection-execution-plan-2026-07-06.md",
  contract: "contracts/production-data-policy-contract.json",
  decisionRegister: "docs/launch/cti-decision-register-2026-07-06.md",
  ratificationPacket: "docs/launch/cti-production-data-policy-ratification-packet-2026-07-06.md",
  boundaryRegister: "docs/launch/cti-s0-probe-boundary-register-2026-07-06.md",
  artifactIndex: "docs/launch/cti-s0-artifact-index-2026-07-06.json",
  d07: "docs/launch/cti-d07-disposition-register-2026-07-06.json",
  s1: "docs/launch/cti-s1-branch-assessment-2026-07-06.json",
  i1: "workbook/cti-i1-lead-lawyer-mapping-template-2026-07-06.json",
  s0t01: "docs/launch/cti-s0-t01-lambda-config-receipt-2026-07-06.json",
  s0t03: "docs/launch/cti-s0-t03-coldstart-probe-receipt-2026-07-06.json",
  s0t04: "docs/launch/cti-s0-t04-store-readback-snapshot-receipt-2026-07-06.json",
  s0t07: "docs/launch/cti-s0-t07-real-client-data-used-inventory-2026-07-06.json",
  manifest: "docs/lazycodex/evidence/matter-web/artifacts/cti-g0-s0-evidence-manifest-2026-07-06.json",
  closeoutPacket: "docs/goal-closeout/cti-g0-s0/packet.json",
  commandEvidence: "docs/goal-closeout/cti-g0-s0/command-evidence.json",
  constructionInspection: "docs/goal-closeout/cti-g0-s0/construction-inspection.json",
  ledger: "workbook/launch-tuw/launch-tuw-ledger.json",
  ledgerMd: "workbook/launch-tuw/10_PRE.md"
};

const expectedS0 = [
  "docs/launch/cti-s0-t01-lambda-config-receipt-2026-07-06.json",
  "docs/launch/cti-s0-t02-persistence-census-2026-07-06.json",
  "docs/launch/cti-s0-t03-coldstart-probe-receipt-2026-07-06.json",
  "docs/launch/cti-s0-t04-store-readback-snapshot-receipt-2026-07-06.json",
  "docs/launch/cti-s0-t05-desktop-seed-drift-diff-2026-07-06.json",
  "docs/launch/cti-s0-t06-lead-lawyer-mapping-workbook-receipt-2026-07-06.json",
  "docs/launch/cti-s0-t07-real-client-data-used-inventory-2026-07-06.json",
  "docs/launch/cti-production-data-policy-ratification-packet-2026-07-06.md"
];

const errors = [];
function add(message) {
  errors.push(message);
}

function readText(file) {
  return readFileSync(path.join(ROOT, file), "utf8");
}

function readJson(file) {
  return JSON.parse(readText(file));
}

for (const [name, file] of Object.entries(files)) {
  if (!existsSync(path.join(ROOT, file))) add(`${name} missing: ${file}`);
}
for (const file of expectedS0) {
  if (!existsSync(path.join(ROOT, file))) add(`S0 artifact missing: ${file}`);
}

if (errors.length === 0) {
  const contract = readJson(files.contract);
  const decision = readText(files.decisionRegister);
  const packet = readText(files.ratificationPacket);
  const boundary = readText(files.boundaryRegister);
  const artifactIndex = readJson(files.artifactIndex);
  const d07 = readJson(files.d07);
  const s1 = readJson(files.s1);
  const i1 = readJson(files.i1);
  const s0t07 = readJson(files.s0t07);
  const manifest = readJson(files.manifest);
  const closeout = readJson(files.closeoutPacket);
  const commandEvidence = readJson(files.commandEvidence);
  const construction = readJson(files.constructionInspection);
  const ledger = readJson(files.ledger);
  const ledgerMd = readText(files.ledgerMd);

  const s0t01 = readJson(files.s0t01);
  const s0t03 = readJson(files.s0t03);
  const s0t04 = readJson(files.s0t04);

  if (contract.status !== "draft_pending_human_ratification") add("contract file must remain draft_pending_human_ratification; I4 is an external owner ratification record");
  if (contract.unratified_contract_effect?.permits_real_data_contact !== false) add("contract must forbid real data contact while unratified");
  if (contract.unratified_contract_effect?.permits_production_credentials !== false) add("contract must forbid production credentials while unratified");
  if (contract.unratified_contract_effect?.permits_product_state_writes !== false) add("contract must forbid product state writes while unratified");

  for (const id of ["D-01", "D-02", "D-03", "D-04", "D-05", "D-06", "D-07", "D-08", "D-09", "D-10", "I1", "I2", "I3", "I4"]) {
    if (!decision.includes(id)) add(`decision register missing ${id}`);
  }

  for (const phrase of ["Owner Signature Block", "approved_for_cti_g0_s0_only", APPROVAL_REF, "agent_may_approve=false", "S0-T04 before S0-T03"]) {
    if (!packet.includes(phrase)) add(`ratification packet missing phrase: ${phrase}`);
  }

  for (const id of ["S0-T01", "S0-T02", "S0-T03", "S0-T04", "S0-T05", "S0-T06", "S0-T07", "S0-T08"]) {
    if (!boundary.includes(id)) add(`boundary register missing ${id}`);
  }
  if (!boundary.includes("S0-T04 production store readback snapshot | `LT-PRE-W08-T04` | ALLOWED_BY_I4_MUST_PRECEDE_S0_T03")) {
    add("boundary register must allow S0-T04 under I4 and preserve T04-before-T03 sequencing");
  }
  if (!boundary.includes("S0-T03 cold-start marker write/readback | `LT-PRE-W08-T04` | ALLOWED_BY_I4_AFTER_S0_T04")) {
    add("boundary register must allow S0-T03 only after S0-T04");
  }
  if (!boundary.includes("S0-T04 must complete before S0-T03")) {
    add("boundary register must preserve T04-before-T03 sequencing");
  }

  if (Object.keys(artifactIndex.s0_g_artifacts ?? {}).length !== 8) add("artifact index must list 8 S0-G artifacts");
  if (!Array.isArray(artifactIndex.artifact_hashes) || artifactIndex.artifact_hashes.some((item) => item.missing || !item.sha256)) {
    add("artifact index must include sha256 for every artifact");
  }
  if (artifactIndex.status !== "i4_ratified_s0_probes_executed") add("artifact index must record i4_ratified_s0_probes_executed");
  if (artifactIndex.approval_signature_ref !== APPROVAL_REF) add("artifact index must carry the I4 approval ref");
  if (!Array.isArray(artifactIndex.blockers) || artifactIndex.blockers.length !== 0) {
    add("artifact index blockers must be empty after G0/S0 probe completion");
  }

  if (i1.row_count !== 148) add("I1 template must have 148 rows");
  if (i1.pii_boundary?.plaintext_matter_code_included !== false) add("I1 template must not include plaintext matter codes");
  if (i1.pii_boundary?.plaintext_client_name_included !== false) add("I1 template must not include plaintext client names");
  if (i1.pii_boundary?.owner_private_plaintext_workbook_required_after_i4 !== true) add("I1 template must state plaintext workbook requires I4");

  if (s0t01.status !== "completed") add("S0-T01 receipt must be completed");
  if (s0t01.approval_signature_ref !== APPROVAL_REF) add("S0-T01 receipt must carry I4 approval ref");
  if (s0t01.execution_boundary?.production_credentials_used !== true) add("S0-T01 must record production credential use");
  if (s0t01.execution_boundary?.real_data_contact_performed !== false) add("S0-T01 must not record real data contact");
  if (s0t01.lambda_configuration?.handler !== "apps/api/src/lambda.handler") add("S0-T01 must record deployed API Lambda handler");
  if (s0t01.lambda_configuration?.efs_file_system_config_count !== 0) add("S0-T01 must record zero EFS configs for current prod Lambda");
  if (!Array.isArray(s0t01.lambda_configuration?.store_path_env_keys_present) || s0t01.lambda_configuration.store_path_env_keys_present.length !== 0) {
    add("S0-T01 must record zero STORE_PATH env keys for current prod Lambda");
  }
  if (JSON.stringify(s0t01).match(/LAWOS_VAULT_BRIDGE_TOKEN["']?\s*[:=]\s*["'][^"']+/)) {
    add("S0-T01 must not record bridge token material");
  }

  if (s0t04.status !== "completed") add("S0-T04 receipt must be completed");
  if (s0t04.approval_signature_ref !== APPROVAL_REF) add("S0-T04 receipt must carry I4 approval ref");
  if (s0t04.sequence?.executed_before_s0_t03 !== true) add("S0-T04 must record execution before S0-T03");
  if (s0t04.execution_boundary?.real_data_contact_performed !== true) add("S0-T04 must record real data contact");
  if (s0t04.execution_boundary?.product_state_write_performed !== false) add("S0-T04 must not record product state write");
  if (s0t04.readback_snapshot?.storage !== "non_git_local_hash_snapshot") add("S0-T04 must write a non-git hash snapshot");
  if (s0t04.readback_snapshot?.plaintext_pii_in_snapshot !== false) add("S0-T04 snapshot must be PII-safe");
  if (s0t04.matter_readback_summary?.tenants?.tenant_rp05_synthetic?.summary?.returned_count !== 149) add("S0-T04 must record 149 visible rp05 production matters");
  if (s0t04.matter_readback_summary?.tenants?.tenant_rp05_synthetic?.summary?.candidate_match_count !== 148) add("S0-T04 must record 148 CTI candidate matches");

  if (s0t03.status !== "completed") add("S0-T03 receipt must be completed");
  if (s0t03.approval_signature_ref !== APPROVAL_REF) add("S0-T03 receipt must carry I4 approval ref");
  if (s0t03.sequence?.s0_t04_completed_first !== true) add("S0-T03 must record S0-T04 completed first");
  if (s0t03.marker_approval_ref !== "cti-probe-markers") add("S0-T03 must use cti-probe-markers marker approval ref");
  if (s0t03.execution_boundary?.product_state_write_performed !== true) add("S0-T03 must record the synthetic marker write");
  if (s0t03.execution_boundary?.migration_executed !== false) add("S0-T03 must not execute migration");
  if (s0t03.permission_audit_impact?.environment_values_recorded_in_repo !== false) add("S0-T03 must not record env values in repo");
  if (s0t03.permission_audit_impact?.token_or_secret_values_recorded_in_repo !== false) add("S0-T03 must not record token or secret values in repo");
  if (s0t03.cold_start_probe?.persistence_verdict !== "marker_lost_after_cold_start") add("S0-T03 must record marker_lost_after_cold_start for current ephemeral prod runtime");

  if (d07.local_candidate_matter_count !== 148) add("D-07 must record local candidate matter count 148");
  if (d07.approval_signature_ref !== APPROVAL_REF) add("D-07 must carry I4 approval ref");
  if (d07.production_149th_row_state !== "production_149th_row_identified_as_runtime_seed_exclude_from_cti_migration") add("D-07 production 149th row must be classified as runtime seed exclusion");
  if (!/Do not migrate/.test(d07.recommendation ?? "") || !/Do not delete/.test(d07.recommendation ?? "")) add("D-07 must include no-migrate and no-delete recommendation");

  if (s1.approval_signature_ref !== APPROVAL_REF) add("S1 branch assessment must carry I4 approval ref");
  if (s1.branch_status !== "efs_and_store_path_absent_s1_durable_foundation_required") add("S1 branch status must require durable foundation after EFS/STORE_PATH absence");
  if (s1.no_s1_execution_started !== true) add("S1 assessment must state no S1 execution started");

  if (s0t07.inventory_site_count < 7) add("S0-T07 inventory must include at least 7 sites");
  if (!/Do not rewrite closed receipts/.test(s0t07.additive_transition_rule ?? "")) add("S0-T07 must include additive transition rule");

  if (manifest.status !== "completed_i4_ratified_s0_probes_executed") add("manifest must record completed I4 ratified probes");
  if (manifest.approval_signature_ref !== APPROVAL_REF) add("manifest must carry I4 approval ref");
  if (manifest.pii_safe !== true) add("evidence manifest must be PII-safe");
  if (manifest.production_credentials_used !== true) add("manifest must state production credentials were used for G0/S0 probes");
  if (manifest.real_data_contact_performed !== true) add("manifest must state real data contact was performed for S0-T04");
  if (manifest.product_state_write_performed !== true) add("manifest must state product state write was performed for S0-T03 marker");
  if (manifest.production_migration_executed !== false) add("manifest must state production migration was not executed");
  if (manifest.cutover_executed !== false) add("manifest must state cutover was not executed");
  if (manifest.password_distribution_executed !== false) add("manifest must state password distribution was not executed");
  if (!Array.isArray(manifest.artifact_hashes) || manifest.artifact_hashes.length < 20) add("manifest must include artifact hashes");

  if (closeout.status !== "completed_i4_ratified_s0_probes_executed") add("closeout packet must record completed I4 ratified probes");
  if (closeout.approval_signature_ref !== APPROVAL_REF) add("closeout packet must carry I4 approval ref");
  if (closeout.closeout_verdict !== "COMPLETE_G0_S0_ONLY") add("closeout verdict must be COMPLETE_G0_S0_ONLY");
  for (const phrase of ["S1-S6 implementation", "CUTOVER execution", "production migration", "DB conversion"]) {
    if (!JSON.stringify(closeout.out_of_scope ?? []).includes(phrase)) add(`closeout out_of_scope missing ${phrase}`);
  }

  const commandIds = new Set((commandEvidence.commands ?? []).map((command) => command.id));
  for (const id of ["launch-tuw-ledger-validate", "cti-g0-s0-evidence-generate", "cti-g0-s0-production-probes", "cti-requirement-count-check", "cti-i1-template-korean-plaintext-scan"]) {
    if (!commandIds.has(id)) add(`command evidence missing ${id}`);
  }

  if (construction.final_verdict !== "COMPLETE_G0_S0_ONLY") add("construction inspection final verdict must be COMPLETE_G0_S0_ONLY");
  for (const checkId of ["i4_ratification_recorded", "s0_t04_before_s0_t03", "production_probe_execution", "i1_mapping_template", "d07_disposition", "s1_branch", "out_of_scope_preserved"]) {
    if (!(construction.checks ?? []).some((check) => check.id === checkId)) add(`construction inspection missing check ${checkId}`);
  }

  if (!ledger.work_packages?.some((wp) => wp.wp_id === "LT-PRE-W08" && wp.terminal_tuw === "LT-PRE-W08-T05")) {
    add("launch TUW ledger missing LT-PRE-W08 work package");
  }
  for (const id of ["LT-PRE-W08-T01", "LT-PRE-W08-T02", "LT-PRE-W08-T03", "LT-PRE-W08-T04", "LT-PRE-W08-T05"]) {
    if (!ledger.tuws?.some((tuw) => tuw.id === id)) add(`launch TUW ledger missing ${id}`);
    if (!ledgerMd.includes(`#### ${id} —`)) add(`10_PRE.md missing ${id}`);
  }
}

if (errors.length > 0) {
  console.error("CTI G0/S0 closeout validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("CTI G0/S0 closeout validation passed.");
console.log("s0_artifacts: 8");
console.log("i1_mapping_rows: 148");
console.log("real_client_data_used_inventory_sites: >=7");
console.log("closeout_status: completed_i4_ratified_s0_probes_executed");
console.log("d07_state: production_149th_row_identified_as_runtime_seed_exclude_from_cti_migration");
console.log("s1_branch: efs_and_store_path_absent_s1_durable_foundation_required");
