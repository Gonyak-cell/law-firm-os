#!/usr/bin/env node
import { access, readFile } from "node:fs/promises";
import path from "node:path";

const contractPath = path.resolve("contracts/goal1-mutual-agreement-contract.json");
const docPath = path.resolve("docs/goal1-mutual-agreement.md");
const packagePath = path.resolve("package.json");

const contract = JSON.parse(await readFile(contractPath, "utf8"));
const doc = await readFile(docPath, "utf8");
const packageJson = JSON.parse(await readFile(packagePath, "utf8"));
const errors = [];

async function exists(filePath) {
  try {
    await access(path.resolve(filePath));
    return true;
  } catch {
    return false;
  }
}

function requireText(text, needle, label) {
  if (!text.includes(needle)) errors.push(`${label} missing ${needle}`);
}

if (contract.schema_version !== "law-firm-os.goal1-mutual-agreement.v0.1") {
  errors.push("schema_version mismatch");
}
if (contract.status !== "agreed") errors.push("status must be agreed");

for (const party of ["user", "codex", "hermes", "claude_code"]) {
  if (!contract.agreed_parties?.includes(party)) errors.push(`agreed_parties missing ${party}`);
}

for (const id of [
  "goal1_scope",
  "implementation_before_claim",
  "claude_review_density",
  "hermes_boundary",
  "claude_boundary",
  "internal_construction_inspection",
  "market_validation_afterward",
]) {
  if (!(contract.agreed_conclusions ?? []).some((item) => item.id === id)) {
    errors.push(`agreed_conclusions missing ${id}`);
  }
}

for (const filePath of contract.required_evidence ?? []) {
  if (!(await exists(filePath))) errors.push(`required evidence file missing: ${filePath}`);
}

for (const command of [
  "npm run goal1:agreement:validate",
  "npm run goal1:claude-review:validate",
  "npm run weighted:validate",
  "npm run critical-rps:validate",
  "npm run validate",
]) {
  if (!contract.required_validation_commands?.includes(command)) {
    errors.push(`required_validation_commands missing ${command}`);
  }
}

if (!packageJson.scripts?.["goal1:agreement:validate"]) {
  errors.push("package.json missing goal1:agreement:validate script");
}

for (const term of [
  "Shared Conclusion",
  "Party Roles",
  "Agreed Boundaries",
  "준공검사 Meaning",
  "market_validated_saas",
  "Goal 1 may be marked complete only after implementation evidence proves the objective",
]) {
  requireText(doc, term, "Goal 1 mutual agreement doc");
}

for (const guardrail of [
  "Do not mark Goal 1 complete from planning artifacts alone.",
  "Do not treat internal 준공검사 PASS as market SaaS validation.",
  "Keep the goal active until the implementation objective is actually satisfied.",
]) {
  if (!contract.completion_guardrails?.includes(guardrail)) {
    errors.push(`completion_guardrails missing ${guardrail}`);
  }
}

if (errors.length > 0) {
  console.error("Goal 1 mutual agreement validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Goal 1 mutual agreement validation passed.");
console.log("status: agreed");
console.log("parties: user, codex, hermes, claude_code");
