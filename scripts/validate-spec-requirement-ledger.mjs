#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";

const ledger = JSON.parse(await readFile(path.resolve("docs/spec-requirement-ledger.json"), "utf8"));
const weighted = JSON.parse(await readFile(path.resolve("docs/weighted-implementation-ledger.json"), "utf8"));
const full = JSON.parse(await readFile(path.resolve("docs/full-spec-microphase-ledger.json"), "utf8"));

const sourceMicroIds = new Set(full.entries.map((entry) => entry.id));
const weightedSubphaseIds = new Set(weighted.entries.flatMap((entry) => entry.implementation_subphases.map((subphase) => subphase.id)));
const errors = [];
const ids = new Set();

if (ledger.schema_version !== "law-firm-os.spec-requirement-ledger.v1") errors.push("schema_version mismatch");
if (ledger.feature_requirement_count !== 209) errors.push(`feature_requirement_count must be 209, got ${ledger.feature_requirement_count}`);
if (ledger.narrative_requirement_count !== 18) errors.push(`narrative_requirement_count must be 18, got ${ledger.narrative_requirement_count}`);
if (ledger.requirement_count !== 227) errors.push(`requirement_count must be 227, got ${ledger.requirement_count}`);

for (const req of ledger.requirements ?? []) {
  if (ids.has(req.id)) errors.push(`duplicate requirement ${req.id}`);
  ids.add(req.id);
  for (const field of ["id", "type", "name", "description", "priority", "acceptance", "primary_program_id", "primary_micro_phase_id", "primary_subphase_id", "contract_subphase_id", "test_subphase_id", "hermes_subphase_id", "claude_subphase_id", "test_micro_phase_id", "hermes_micro_phase_id", "claude_micro_phase_id"]) {
    if (!req[field]) errors.push(`${req.id} missing ${field}`);
  }
  if (!Array.isArray(req.expected_programs) || req.expected_programs.length === 0) errors.push(`${req.id} missing expected_programs`);
  if (!sourceMicroIds.has(req.primary_micro_phase_id)) errors.push(`${req.id} primary_micro_phase_id not in full ledger: ${req.primary_micro_phase_id}`);
  if (!weightedSubphaseIds.has(req.primary_subphase_id)) errors.push(`${req.id} primary_subphase_id not in weighted ledger: ${req.primary_subphase_id}`);
  for (const field of ["contract_subphase_id", "test_subphase_id", "hermes_subphase_id", "claude_subphase_id"]) {
    if (!weightedSubphaseIds.has(req[field])) errors.push(`${req.id} ${field} not in weighted ledger: ${req[field]}`);
  }
  for (const field of ["contract_micro_phase_id", "test_micro_phase_id", "hermes_micro_phase_id", "claude_micro_phase_id"]) {
    if (!sourceMicroIds.has(req[field])) errors.push(`${req.id} ${field} not in full ledger: ${req[field]}`);
  }
  if (!Array.isArray(req.phase_update_policy) || req.phase_update_policy.length < 5) errors.push(`${req.id} missing phase_update_policy`);
}

if (ids.size !== (ledger.requirements?.length ?? 0)) errors.push("unique requirement count mismatch");

if (errors.length > 0) {
  console.error("Spec requirement ledger validation failed:");
  for (const error of errors.slice(0, 80)) console.error(`- ${error}`);
  if (errors.length > 80) console.error(`...and ${errors.length - 80} more`);
  process.exit(1);
}

console.log("Spec requirement ledger validation passed.");
console.log(`requirement_count: ${ledger.requirement_count}`);
console.log(`feature_requirement_count: ${ledger.feature_requirement_count}`);
console.log(`narrative_requirement_count: ${ledger.narrative_requirement_count}`);
