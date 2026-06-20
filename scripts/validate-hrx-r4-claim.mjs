#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const errors = [];

function read(path) {
  return readFileSync(resolve(root, path), "utf8");
}

function assert(condition, message) {
  if (!condition) errors.push(message);
}

const contractPath = "contracts/hrx-release-readiness.json";
assert(existsSync(resolve(root, contractPath)), `${contractPath}: missing`);

const contract = existsSync(resolve(root, contractPath)) ? JSON.parse(read(contractPath)) : {};
assert(contract.claim_policy?.owner_signoff_required === true, "owner sign-off must be required");
for (const field of [
  "go_live_claim_allowed",
  "r4_claim_allowed",
  "production_ready_claim_allowed",
  "enterprise_ready_claim_allowed",
]) {
  assert(contract.claim_policy?.[field] === false, `claim_policy.${field} must remain false`);
}

const guardedFiles = [
  "docs/hrx-enterprise/go-live-checklist.md",
  "docs/hrx-enterprise/cutover-runbook.md",
  "docs/hrx-enterprise/go-no-go-template.md",
  "docs/hrx-enterprise/owner-decision-template.md",
  "docs/hrx-enterprise/production-readiness-evidence.md",
  "docs/hrx-enterprise/release-notes-template.md",
  "docs/hrx-enterprise/dev-handoff-closeout.md",
];

for (const file of guardedFiles) {
  assert(existsSync(resolve(root, file)), `${file}: missing`);
  if (!existsSync(resolve(root, file))) continue;
  const text = read(file);
  const lower = text.toLowerCase();
  assert(
    lower.includes("not go-live") ||
      lower.includes("not go live") ||
    lower.includes("not authorize") ||
      lower.includes("does not authorize") ||
      lower.includes("not a deployment receipt") ||
      lower.includes("not production-ready") ||
      lower.includes("human approval") ||
      lower.includes("owner sign-off") ||
      lower.includes("owner approval"),
    `${file}: must explicitly preserve owner-controlled no-claim boundary`,
  );
  for (const forbidden of [
    "go_live_claim_allowed: true",
    "r4_claim_allowed: true",
    "production_ready_claim_allowed: true",
    "enterprise_ready_claim_allowed: true",
  ]) {
    assert(!lower.includes(forbidden), `${file}: forbidden claim marker ${forbidden}`);
  }
}

if (errors.length > 0) {
  console.error("HRX R4 claim validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("HRX R4 claim validation passed.");
console.log("go_live_claim_allowed: false");
console.log("r4_claim_allowed: false");
console.log("owner_signoff_required: true");
