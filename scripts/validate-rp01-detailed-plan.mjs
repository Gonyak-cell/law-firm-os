#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";

const ledgerPath = path.resolve("docs/rp01-core-domain-detailed-microphases.json");
const ledger = JSON.parse(await readFile(ledgerPath, "utf8"));
const errors = [];
const ids = new Set();

if (ledger.program_id !== "RP01") errors.push("program_id must be RP01");
if (ledger.micro_phase_count !== 110) errors.push(`micro_phase_count must be 110, got ${ledger.micro_phase_count}`);
if (!Array.isArray(ledger.entries)) errors.push("entries must be an array");

for (const entry of ledger.entries ?? []) {
  if (ids.has(entry.id)) errors.push(`duplicate id ${entry.id}`);
  ids.add(entry.id);
  if (!entry.id.startsWith("RP01.")) errors.push(`${entry.id} must start with RP01`);
  if (entry.hermes_gate !== "H01") errors.push(`${entry.id} must use H01`);
  if (entry.claude_gate !== "C01") errors.push(`${entry.id} must use C01`);
  if (!Array.isArray(entry.target_files) || entry.target_files.length === 0) errors.push(`${entry.id} missing target_files`);
  if (!Array.isArray(entry.target_tests) || entry.target_tests.length === 0) errors.push(`${entry.id} missing target_tests`);
  if (!Array.isArray(entry.commands) || !entry.commands.includes("npm run validate")) errors.push(`${entry.id} missing npm run validate command`);
  if (!Array.isArray(entry.acceptance) || entry.acceptance.length < 5) errors.push(`${entry.id} missing acceptance criteria`);
}

if (ids.size !== (ledger.entries?.length ?? 0)) errors.push("unique id count mismatch");

if (errors.length > 0) {
  console.error("RP01 detailed plan validation failed:");
  for (const error of errors.slice(0, 50)) console.error(`- ${error}`);
  if (errors.length > 50) console.error(`...and ${errors.length - 50} more`);
  process.exit(1);
}

console.log("RP01 detailed plan validation passed.");
console.log(`micro_phase_count: ${ledger.micro_phase_count}`);

