#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";

const ledgerPath = path.resolve("docs/full-spec-microphase-ledger.json");
const ledger = JSON.parse(await readFile(ledgerPath, "utf8"));

const errors = [];
const ids = new Set();

if (ledger.micro_phase_count < 3000) {
  errors.push(`micro_phase_count must be at least 3000, got ${ledger.micro_phase_count}`);
}

if (!Array.isArray(ledger.entries)) {
  errors.push("entries must be an array");
} else {
  for (const entry of ledger.entries) {
    if (ids.has(entry.id)) errors.push(`duplicate id: ${entry.id}`);
    ids.add(entry.id);
    for (const field of ["program_id", "phase_id", "micro_id", "objective", "hermes_gate", "claude_gate", "acceptance"]) {
      if (entry[field] === undefined || entry[field] === null) errors.push(`${entry.id} missing ${field}`);
    }
    if (!Array.isArray(entry.requirement_refs)) errors.push(`${entry.id} missing requirement_refs`);
    if (typeof entry.requirement_ref_count !== "number") errors.push(`${entry.id} missing requirement_ref_count`);
    if (!Array.isArray(entry.commands) || entry.commands.length === 0) errors.push(`${entry.id} missing commands`);
    if (!Array.isArray(entry.acceptance) || entry.acceptance.length < 3) errors.push(`${entry.id} needs at least 3 acceptance checks`);
  }
  if (ids.size !== ledger.entries.length) errors.push("unique id count mismatch");
  if (ledger.micro_phase_count !== ledger.entries.length) errors.push("micro_phase_count does not match entries length");
}

if (errors.length > 0) {
  console.error("Full microphase plan validation failed:");
  for (const error of errors.slice(0, 50)) console.error(`- ${error}`);
  if (errors.length > 50) console.error(`...and ${errors.length - 50} more`);
  process.exit(1);
}

console.log("Full microphase plan validation passed.");
console.log(`micro_phase_count: ${ledger.micro_phase_count}`);
console.log(`release_program_count: ${ledger.release_program_count}`);
console.log(`standard_phase_count: ${ledger.standard_phase_count}`);
console.log(`micro_phase_per_standard_phase: ${ledger.micro_phase_per_standard_phase}`);
