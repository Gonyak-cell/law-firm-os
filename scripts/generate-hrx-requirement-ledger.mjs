#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { hrxRequirements } from "./hrx-requirement-catalog.mjs";

const ledger = {
  schema_version: "law-firm-os.hrx-requirement-ledger.v0.1",
  generated_from: "scripts/hrx-requirement-catalog.mjs",
  status: "planning_only",
  law_firm_os_requirement_count_unchanged: 227,
  requirement_count: hrxRequirements.length,
  requirements: hrxRequirements,
};

function markdownFor() {
  const lines = [
    "# HRX Requirement Ledger",
    "",
    "Status: planning-only HRX mirror ledger. The main spec requirement ledger remains 227 and is not modified.",
    "",
    "| id | priority | title | anchor | decision |",
    "|---|---|---|---|---|",
  ];
  for (const req of hrxRequirements) {
    lines.push(`| ${req.id} | ${req.priority} | ${req.title} | ${req.primary_anchor} | ${req.user_decision_ref} |`);
  }
  return `${lines.join("\n")}\n`;
}

await mkdir("docs", { recursive: true });
await writeFile("docs/hrx-requirement-ledger.json", `${JSON.stringify(ledger, null, 2)}\n`);
await writeFile("docs/hrx-requirement-ledger.md", markdownFor());
console.log(`Generated HRX requirement ledger with ${ledger.requirement_count} requirements.`);
