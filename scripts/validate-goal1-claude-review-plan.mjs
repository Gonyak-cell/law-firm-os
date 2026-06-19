#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";

const contractPath = path.resolve("contracts/goal1-claude-review-contract.json");
const planPath = path.resolve("docs/goal1-foundation-claude-review-plan.md");
const aiPlanPath = path.resolve("docs/ai-led-law-firm-os-development-plan.md");

const contract = JSON.parse(await readFile(contractPath, "utf8"));
const plan = await readFile(planPath, "utf8");
const aiPlan = await readFile(aiPlanPath, "utf8");
const errors = [];

const expectedPrograms = {
  RP00: { gate: "C00", min: 8 },
  RP01: { gate: "C01", min: 10 },
  RP02: { gate: "C02", min: 12 },
  RP03: { gate: "C03", min: 12 },
};

function requireText(text, needle, label) {
  if (!text.includes(needle)) errors.push(`${label} missing ${needle}`);
}

if (contract.schema_version !== "law-firm-os.goal1-claude-review-contract.v0.1") {
  errors.push("schema_version mismatch");
}
if (contract.goal_scope !== "RP00-RP03 foundation slice") {
  errors.push("goal_scope must be RP00-RP03 foundation slice");
}
if (contract.minimum_total_review_count < 42) {
  errors.push("minimum_total_review_count must be at least 42");
}

const programs = new Map((contract.programs ?? []).map((program) => [program.id, program]));
for (const [programId, expected] of Object.entries(expectedPrograms)) {
  const program = programs.get(programId);
  if (!program) {
    errors.push(`missing program ${programId}`);
    continue;
  }
  if (program.claude_gate !== expected.gate) errors.push(`${programId} claude_gate must be ${expected.gate}`);
  if (program.minimum_review_count < expected.min) errors.push(`${programId} minimum_review_count must be at least ${expected.min}`);
  if (!Array.isArray(program.review_checkpoints) || program.review_checkpoints.length < expected.min) {
    errors.push(`${programId} must define at least ${expected.min} review checkpoints`);
  }
  if (!Array.isArray(program.must_challenge) || program.must_challenge.length < 4) {
    errors.push(`${programId} must define at least 4 challenge topics`);
  }
  requireText(plan, programId, "Goal 1 Claude review plan");
  requireText(plan, expected.gate, "Goal 1 Claude review plan");
}

for (const field of [
  "program_id",
  "checkpoint_id",
  "changed_files",
  "contracts_reviewed",
  "tests_reviewed",
  "hermes_evidence_refs",
  "requirement_refs",
  "risk_focus",
  "claude_questions",
  "expected_verdict_format",
  "finding_routing",
]) {
  if (!contract.review_packet_template?.required_fields?.includes(field)) {
    errors.push(`review_packet_template missing ${field}`);
  }
}

for (const verdict of ["PASS", "PASS_WITH_FINDINGS", "BLOCK"]) {
  if (!contract.review_packet_template?.verdicts?.includes(verdict)) errors.push(`missing verdict ${verdict}`);
}
for (const severity of ["P0_BLOCKER", "P1_MUST_FIX", "P2_SHOULD_FIX", "P3_NOTE"]) {
  if (!contract.review_packet_template?.finding_severity?.includes(severity)) errors.push(`missing severity ${severity}`);
}

for (const rule of [
  "Any P0_BLOCKER blocks",
  "Any P1_MUST_FIX blocks",
  "PASS_WITH_FINDINGS is allowed only",
  "A missing Claude review packet is treated as BLOCK",
  "Hermes H00-H03 evidence must record",
]) {
  if (!(contract.blocking_rules ?? []).some((item) => item.includes(rule))) {
    errors.push(`blocking_rules missing ${rule}`);
  }
}

for (const term of [
  "Minimum review counts",
  "Total minimum: 42",
  "Missing Claude review packet is BLOCK",
  "No unresolved P0/P1 Claude findings remain",
]) {
  requireText(plan, term, "Goal 1 Claude review plan");
}

for (const term of [
  "Goal 1 Claude Review Density",
  "docs/goal1-foundation-claude-review-plan.md",
  "Minimum C00 review count: 8",
  "Minimum C01 review count: 10",
  "Minimum C02 review count: 12",
]) {
  requireText(aiPlan, term, "AI-led development plan");
}

if (errors.length > 0) {
  console.error("Goal 1 Claude review plan validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Goal 1 Claude review plan validation passed.");
console.log("programs: RP00/C00, RP01/C01, RP02/C02, RP03/C03");
console.log(`minimum_total_review_count: ${contract.minimum_total_review_count}`);
