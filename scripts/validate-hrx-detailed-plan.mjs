#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import { hrxProgram, standardPhases } from "./hrx-program-catalog.mjs";

const ledger = JSON.parse(await readFile(path.join("docs", `${hrxProgram.fileBase}.json`), "utf8"));
const errors = [];

function assert(condition, message) {
  if (!condition) errors.push(message);
}

assert(ledger.program_id === "RP30", "program_id must be RP30");
assert(ledger.micro_phase_count === 110, "micro_phase_count must be 110");
assert(ledger.hrx_embedded === true, "hrx_embedded must be true");
assert(ledger.hermes_gate === "H30", "hermes_gate must be H30");
assert(ledger.claude_gate === "C30", "claude_gate must be C30");
assert(Array.isArray(ledger.entries), "entries must be an array");
const ids = new Set();
for (const entry of ledger.entries ?? []) {
  assert(!ids.has(entry.id), `duplicate id ${entry.id}`);
  ids.add(entry.id);
  assert(entry.id.startsWith("RP30."), `${entry.id} must start with RP30`);
  assert(entry.hermes_gate === "H30", `${entry.id} must use H30`);
  assert(entry.claude_gate === "C30", `${entry.id} must use C30`);
  assert(entry.hrx_embedded === true, `${entry.id} must be HRX embedded`);
  assert(Array.isArray(entry.commands) && entry.commands.includes("npm run hrx:requirements:validate"), `${entry.id} missing HRX requirement validation`);
  assert(Array.isArray(entry.acceptance) && entry.acceptance.length >= 5, `${entry.id} missing acceptance criteria`);
}
for (const phase of standardPhases) {
  const count = (ledger.entries ?? []).filter((entry) => entry.phase_id === `RP30.${phase.id}`).length;
  assert(count === 11, `RP30.${phase.id} must have 11 entries, got ${count}`);
}

if (errors.length > 0) {
  console.error("HRX detailed plan validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("HRX detailed plan validation passed.");
console.log("micro_phase_count: 110");
