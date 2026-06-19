#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const requiredFiles = [
  "docs/hrx-enterprise/pr-sequence.md",
  "docs/hrx-enterprise/cutover-runbook.md",
  "contracts/hrx-feature-flags.json",
  "docs/hrx-enterprise/go-live-checklist.md",
  "docs/hrx-enterprise/dev-handoff-receipt.md",
  "docs/hrx-enterprise/p18-release-adoption-plan.md",
];
const errors = [];

for (const file of requiredFiles) {
  if (!existsSync(resolve(root, file))) errors.push(`${file}: missing`);
}

const flagsPath = resolve(root, "contracts/hrx-feature-flags.json");
if (existsSync(flagsPath)) {
  const flags = JSON.parse(readFileSync(flagsPath, "utf8"));
  if (flags.default_enabled !== false) errors.push("contracts/hrx-feature-flags.json: default_enabled must be false");
  if (!Array.isArray(flags.flags) || flags.flags.length < 4) errors.push("contracts/hrx-feature-flags.json: expected at least four flags");
  for (const flag of flags.flags ?? []) {
    if (flag.default_enabled !== false) errors.push(`${flag.flag}: default_enabled must be false`);
    if (!Array.isArray(flag.prerequisite_gates) || flag.prerequisite_gates.length === 0) {
      errors.push(`${flag.flag}: prerequisite_gates required`);
    }
    if (!Array.isArray(flag.rollback) || flag.rollback.length === 0) errors.push(`${flag.flag}: rollback required`);
  }
  const payroll = flags.flags?.find((flag) => flag.flag === "hrx_payroll_execution");
  if (!payroll || payroll.risk_tier !== "blocked" || payroll.tenant_override_allowed !== false) {
    errors.push("hrx_payroll_execution must stay blocked without tenant override");
  }
}

const goLive = existsSync(resolve(root, "docs/hrx-enterprise/go-live-checklist.md"))
  ? readFileSync(resolve(root, "docs/hrx-enterprise/go-live-checklist.md"), "utf8")
  : "";
for (const phrase of ["Automatic No-Go", "Human release authority", "Payroll execution is enabled"]) {
  if (!goLive.includes(phrase)) errors.push(`go-live checklist missing phrase: ${phrase}`);
}

if (errors.length > 0) {
  console.error("HRX release adoption validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("HRX release adoption validation passed.");
console.log(`required_files: ${requiredFiles.length}`);
console.log("feature_flags_default_enabled: false");
