#!/usr/bin/env node
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { canonicalProgramId, programById, programs, standardPhases } from "./rp-detailed-plan-catalog.mjs";

function usage() {
  console.error("Usage: node scripts/validate-rp-detailed-plan.mjs RP03|all");
  process.exit(1);
}

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function validateProgram(program) {
  const jsonPath = path.resolve("docs", `${program.fileBase}.json`);
  const mdPath = path.resolve("docs", `${program.fileBase}.md`);
  const errors = [];

  if (!(await fileExists(jsonPath))) errors.push(`${program.id} missing JSON file ${jsonPath}`);
  if (!(await fileExists(mdPath))) errors.push(`${program.id} missing Markdown file ${mdPath}`);
  if (errors.length > 0) return errors;

  const ledger = JSON.parse(await readFile(jsonPath, "utf8"));
  const ids = new Set();
  const expectedPhaseIds = new Set(standardPhases.map((phase) => `${program.id}.${phase.id}`));

  const firstEntry = ledger.entries?.[0];
  const programTitle = ledger.program_title ?? firstEntry?.program_title;
  const hermesGate = ledger.hermes_gate ?? firstEntry?.hermes_gate;
  const claudeGate = ledger.claude_gate ?? firstEntry?.claude_gate;

  if (ledger.program_id !== program.id) errors.push(`${program.id} program_id mismatch`);
  if (programTitle !== program.title) errors.push(`${program.id} program_title mismatch`);
  if (hermesGate !== program.hermesGate) errors.push(`${program.id} hermes_gate mismatch`);
  if (claudeGate !== program.claudeGate) errors.push(`${program.id} claude_gate mismatch`);
  if (ledger.micro_phase_count !== 110) errors.push(`${program.id} micro_phase_count must be 110, got ${ledger.micro_phase_count}`);
  if (!Array.isArray(ledger.entries)) errors.push(`${program.id} entries must be an array`);

  for (const entry of ledger.entries ?? []) {
    if (ids.has(entry.id)) errors.push(`${program.id} duplicate id ${entry.id}`);
    ids.add(entry.id);
    if (!entry.id.startsWith(`${program.id}.`)) errors.push(`${entry.id} must start with ${program.id}`);
    if (!expectedPhaseIds.has(entry.phase_id)) errors.push(`${entry.id} has unexpected phase_id ${entry.phase_id}`);
    if (entry.hermes_gate !== program.hermesGate) errors.push(`${entry.id} must use ${program.hermesGate}`);
    if (entry.claude_gate !== program.claudeGate) errors.push(`${entry.id} must use ${program.claudeGate}`);
    if (!Array.isArray(entry.target_files) || entry.target_files.length === 0) errors.push(`${entry.id} missing target_files`);
    if (!Array.isArray(entry.target_tests) || entry.target_tests.length === 0) errors.push(`${entry.id} missing target_tests`);
    if (!Array.isArray(entry.commands) || !entry.commands.includes("npm run validate")) errors.push(`${entry.id} missing npm run validate command`);
    if (!Array.isArray(entry.acceptance) || entry.acceptance.length < 5) errors.push(`${entry.id} missing acceptance criteria`);
    if (!entry.objective || entry.objective.length < 40) errors.push(`${entry.id} objective too short`);
  }

  for (const phaseId of expectedPhaseIds) {
    const phaseEntryCount = (ledger.entries ?? []).filter((entry) => entry.phase_id === phaseId).length;
    if (phaseEntryCount !== 11) errors.push(`${phaseId} must have 11 entries, got ${phaseEntryCount}`);
  }

  if (ids.size !== (ledger.entries?.length ?? 0)) errors.push(`${program.id} unique id count mismatch`);
  return errors;
}

const rawArg = process.argv[2];
if (!rawArg) usage();

const programId = canonicalProgramId(rawArg);
const requestedPrograms = programId === "ALL" ? programs : [programById(programId)].filter(Boolean);
if (requestedPrograms.length === 0) {
  console.error(`Unknown release program: ${rawArg}`);
  usage();
}

const allErrors = [];
for (const program of requestedPrograms) {
  const errors = await validateProgram(program);
  allErrors.push(...errors);
}

if (allErrors.length > 0) {
  console.error("RP detailed plan validation failed:");
  for (const error of allErrors.slice(0, 80)) console.error(`- ${error}`);
  if (allErrors.length > 80) console.error(`...and ${allErrors.length - 80} more`);
  process.exit(1);
}

console.log("RP detailed plan validation passed.");
console.log(`release_program_count: ${requestedPrograms.length}`);
console.log(`micro_phase_count: ${requestedPrograms.length * 110}`);
