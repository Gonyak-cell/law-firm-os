#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { SPEC_PATH, expectedProgramsFor, implementationPhaseFor, narrativeRows, parseFeatureRows, primaryProgramFor } from "./spec-requirement-catalog.mjs";

const OUTPUT_DIR = path.resolve("docs");
const JSON_PATH = path.join(OUTPUT_DIR, "spec-requirement-ledger.json");
const MD_PATH = path.join(OUTPUT_DIR, "spec-requirement-ledger.md");

function microFor(row) {
  if (row.type === "narrative" && row.slug === "open_decisions") return "M01";
  if (row.type === "narrative" && row.slug === "screens") return "M03";
  if (row.type === "narrative" && ["performance", "availability", "scalability"].includes(row.slug)) return "M07";
  if (row.type === "narrative" && row.slug === "architecture") return "M02";
  if (row.type === "narrative" && ["security", "privacy", "audit_events"].includes(row.slug)) return "M05";
  return "M03";
}

function anchorsFor(row) {
  const primaryProgram = primaryProgramFor(row);
  const phase = implementationPhaseFor(row);
  const micro = microFor(row);
  const primaryMicroPhaseId = `${primaryProgram}.${phase}.${micro}`;
  const contractMicroPhaseId = `${primaryProgram}.P00.M01`;
  const testMicroPhaseId = `${primaryProgram}.P05.M07`;
  const hermesMicroPhaseId = `${primaryProgram}.P08.M08`;
  const claudeMicroPhaseId = `${primaryProgram}.P09.M09`;
  return {
    primary_program_id: primaryProgram,
    expected_programs: expectedProgramsFor(row),
    primary_micro_phase_id: primaryMicroPhaseId,
    primary_subphase_id: `${primaryMicroPhaseId}.S01`,
    contract_micro_phase_id: contractMicroPhaseId,
    contract_subphase_id: `${contractMicroPhaseId}.S01`,
    test_micro_phase_id: testMicroPhaseId,
    test_subphase_id: `${testMicroPhaseId}.S01`,
    hermes_micro_phase_id: hermesMicroPhaseId,
    hermes_subphase_id: `${hermesMicroPhaseId}.S01`,
    claude_micro_phase_id: claudeMicroPhaseId,
    claude_subphase_id: `${claudeMicroPhaseId}.S01`,
  };
}

function requirementFor(row) {
  const anchors = anchorsFor(row);
  return {
    id: row.id,
    type: row.type,
    prefix: row.prefix,
    name: row.name,
    description: row.description,
    priority: row.priority,
    acceptance: row.acceptance,
    terms: row.terms ?? [],
    ...anchors,
    coverage_status: "planned_covered",
    phase_update_policy: [
      "Primary implementation anchor must carry this requirement into code or an explicit BLOCK record.",
      "Contract anchor must preserve the requirement acceptance text before implementation starts.",
      "Test anchor must include a fixture, golden case, integration case, UI case, or blocked-claim proof.",
      "Hermes anchor must record command evidence and requirement status.",
      "Claude anchor must include this requirement in cross-validation questions.",
    ],
  };
}

function markdown(ledger) {
  const lines = [];
  lines.push("# Law Firm OS Spec Requirement Ledger v1");
  lines.push("");
  lines.push("Purpose: bind every attached specification requirement to concrete RP/micro/subphase anchors before implementation.");
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`- Feature requirements: ${ledger.feature_requirement_count}`);
  lines.push(`- Narrative requirements: ${ledger.narrative_requirement_count}`);
  lines.push(`- Total requirements: ${ledger.requirement_count}`);
  lines.push("");
  lines.push("## Requirements");
  lines.push("");
  lines.push("| ID | Type | Priority | Requirement | Primary anchor | Test | Hermes | Claude |");
  lines.push("|---|---|---|---|---|---|---|---|");
  for (const req of ledger.requirements) {
    lines.push(`| ${req.id} | ${req.type} | ${req.priority} | ${req.name} | ${req.primary_subphase_id} | ${req.test_subphase_id} | ${req.hermes_subphase_id} | ${req.claude_subphase_id} |`);
  }
  lines.push("");
  lines.push("## Acceptance Detail");
  lines.push("");
  for (const req of ledger.requirements) {
    lines.push(`### ${req.id}: ${req.name}`);
    lines.push("");
    lines.push(`- Description: ${req.description}`);
    lines.push(`- Acceptance: ${req.acceptance}`);
    lines.push(`- Expected RP: ${req.expected_programs.join(", ")}`);
    lines.push(`- Primary implementation subphase: ${req.primary_subphase_id}`);
    lines.push(`- Contract subphase: ${req.contract_subphase_id}`);
    lines.push(`- Test subphase: ${req.test_subphase_id}`);
    lines.push(`- Hermes subphase: ${req.hermes_subphase_id}`);
    lines.push(`- Claude subphase: ${req.claude_subphase_id}`);
    lines.push("");
  }
  return `${lines.join("\n")}\n`;
}

const specText = await readFile(SPEC_PATH, "utf8");
const featureRequirements = parseFeatureRows(specText).map(requirementFor);
const narrativeRequirements = narrativeRows().map(requirementFor);
const requirements = [...featureRequirements, ...narrativeRequirements];

const ledger = {
  schema_version: "law-firm-os.spec-requirement-ledger.v1",
  generated_from: "scripts/generate-spec-requirement-ledger.mjs",
  spec_path: SPEC_PATH,
  feature_requirement_count: featureRequirements.length,
  narrative_requirement_count: narrativeRequirements.length,
  requirement_count: requirements.length,
  requirements,
};

await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(JSON_PATH, `${JSON.stringify(ledger, null, 2)}\n`);
await writeFile(MD_PATH, markdown(ledger));

console.log("Generated spec requirement ledger.");
console.log(`feature_requirement_count: ${ledger.feature_requirement_count}`);
console.log(`narrative_requirement_count: ${ledger.narrative_requirement_count}`);
console.log(`requirement_count: ${ledger.requirement_count}`);
console.log(JSON_PATH);
console.log(MD_PATH);
