#!/usr/bin/env node
import { readFile } from "node:fs/promises";

const ledger = JSON.parse(await readFile("docs/hrx-requirement-ledger.json", "utf8"));
const main = JSON.parse(await readFile("docs/spec-requirement-ledger.json", "utf8"));
const errors = [];

function assert(condition, message) {
  if (!condition) errors.push(message);
}

assert(main.requirement_count === 227, "main spec requirement ledger must remain 227");
assert(ledger.law_firm_os_requirement_count_unchanged === 227, "HRX ledger must record main count unchanged");
assert(ledger.requirement_count === 22, "HRX requirement count must be 22");
assert(Array.isArray(ledger.requirements) && ledger.requirements.length === ledger.requirement_count, "requirements length mismatch");
const ids = new Set();
for (const req of ledger.requirements ?? []) {
  assert(!ids.has(req.id), `duplicate requirement ${req.id}`);
  ids.add(req.id);
  assert(req.id.startsWith("HRX-"), `${req.id} must use HRX namespace`);
  assert(req.primary_anchor?.startsWith("RP30."), `${req.id} must anchor to RP30`);
  if (req.id.startsWith("HRX-GATE-")) assert(req.priority === "P0", `${req.id} must be P0`);
}

if (errors.length > 0) {
  console.error("HRX requirement ledger validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("HRX requirement ledger validation passed.");
console.log(`requirement_count: ${ledger.requirement_count}`);
