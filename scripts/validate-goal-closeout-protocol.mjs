#!/usr/bin/env node
import { access, readFile } from "node:fs/promises";
import path from "node:path";

const errors = [];

async function exists(filePath) {
  try {
    await access(path.resolve(filePath));
    return true;
  } catch {
    return false;
  }
}

async function readJson(filePath) {
  return JSON.parse(await readFile(path.resolve(filePath), "utf8"));
}

function requireIncludes(array, value, label) {
  if (!Array.isArray(array) || !array.includes(value)) errors.push(`${label} missing ${value}`);
}

function requireText(text, value, label) {
  if (!text.includes(value)) errors.push(`${label} missing ${value}`);
}

await Promise.all([
  "contracts/goal-closeout-protocol-contract.json",
  "docs/goal-closeout-protocol.md",
  "docs/goal-closeout/README.md",
  "hermes/project.json",
  "package.json",
].map(async (file) => {
  if (!(await exists(file))) errors.push(`missing ${file}`);
}));

const contract = await readJson("contracts/goal-closeout-protocol-contract.json");
const hermesProject = await readJson("hermes/project.json");
const packageJson = await readJson("package.json");
const doc = await readFile(path.resolve("docs/goal-closeout-protocol.md"), "utf8");

if (contract.schema_version !== "law-firm-os.goal-closeout-protocol.v0.1") {
  errors.push("goal closeout protocol schema mismatch");
}
if (contract.applies_to !== "all_goals") errors.push("goal closeout protocol must apply to all_goals");

for (const step of [
  "scope_contract",
  "implementation_evidence",
  "local_tests",
  "hermes_validation",
  "claude_code_review",
  "finding_adjudication",
  "construction_inspection",
  "final_validation_rerun",
  "git_commit",
]) {
  requireIncludes(contract.required_sequence, step, "required_sequence");
}

if (contract.claude_code_requirements?.model !== "claude-opus-4-8") {
  errors.push("Claude Code model must be claude-opus-4-8");
}
if (contract.claude_code_requirements?.effort !== "max") {
  errors.push("Claude Code effort must be max");
}
for (const tool of ["Read", "Grep", "Glob"]) {
  requireIncludes(contract.claude_code_requirements?.allowed_tools, tool, "Claude allowed_tools");
}
for (const tool of ["Bash", "Edit", "Write"]) {
  requireIncludes(contract.claude_code_requirements?.forbidden_tools, tool, "Claude forbidden_tools");
}

for (const severity of ["P0_BLOCKER", "P1_MUST_FIX", "P2_SHOULD_FIX", "P3_NOTE"]) {
  if (!contract.finding_rules?.[severity]) errors.push(`finding_rules missing ${severity}`);
}

for (const item of [
  "goal_scope_satisfied",
  "all_required_local_commands_pass",
  "hermes_gate_passed",
  "claude_code_review_result_validated",
  "no_unresolved_P0_or_P1",
  "all_P2_adjudicated",
  "weighted_ledger_refs_present",
]) {
  requireIncludes(contract.construction_inspection_requirements, item, "construction_inspection_requirements");
}

for (const command of ["npm test", "npm run validate", "npm run weighted:validate", "npm run goal:closeout:validate"]) {
  requireIncludes(contract.standard_commands, command, "standard_commands");
}

if (!packageJson.scripts?.["goal:closeout:validate"]) {
  errors.push("package.json missing goal:closeout:validate");
}

const commandIds = new Set((hermesProject.validation_commands ?? []).map((command) => command.id));
if (!commandIds.has("goal_closeout_protocol_validate")) {
  errors.push("hermes/project.json missing goal_closeout_protocol_validate command");
}
if (hermesProject.goal_closeout_protocol?.applies_to !== "all_goals") {
  errors.push("hermes/project.json must declare goal_closeout_protocol applies_to all_goals");
}
for (const gate of ["hermes_validation", "claude_code_review", "construction_inspection", "git_commit_after_pass"]) {
  requireIncludes(hermesProject.goal_closeout_protocol?.required_gates, gate, "hermes goal_closeout_protocol.required_gates");
}

for (const text of [
  "claude-opus-4-8",
  "effort `max`",
  "Commit",
  "준공검사",
  "P0_BLOCKER",
  "P2_SHOULD_FIX",
  "docs/goal-closeout/{goal_id}/",
]) {
  requireText(doc, text, "goal closeout protocol doc");
}

if (errors.length > 0) {
  console.error("Goal closeout protocol validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Goal closeout protocol validation passed.");
console.log("applies_to: all_goals");
console.log("claude: claude-opus-4-8 effort=max read-only");
