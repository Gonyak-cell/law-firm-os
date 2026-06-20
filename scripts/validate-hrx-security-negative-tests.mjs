#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const checks = [
  {
    file: "packages/authz/test/hrx-compensation-policy.test.js",
    patterns: [/denies/i, /mask/i, /unauthorized/i],
  },
  {
    file: "packages/authz/test/hrx-evaluation-policy.test.js",
    patterns: [/denies/i, /non-reviewer/i, /scope/i],
  },
  {
    file: "packages/authz/test/hrx-candidate-policy.test.js",
    patterns: [/blocks/i, /CRM Party/i, /candidate/i],
  },
  {
    file: "apps/api/test/hrx/payroll.test.js",
    patterns: [/blocks/i, /calculation/i, /disbursement/i],
  },
  {
    file: "apps/api/test/hrx/tenant-isolation.test.js",
    patterns: [/cross-tenant/i, /HRX_API_TENANT_REQUIRED/i, /employee document candidate analytics and AI/i],
  },
  {
    file: "apps/api/test/hrx/route-authz.test.js",
    patterns: [/fails closed/i, /HRX_AUTHZ_DENIED/i, /HRX_ROUTE_POLICY_REQUIRED/i],
  },
];

const errors = [];
for (const check of checks) {
  let text = "";
  try {
    text = readFileSync(resolve(root, check.file), "utf8");
  } catch {
    errors.push(`${check.file}: missing`);
    continue;
  }
  for (const pattern of check.patterns) {
    if (!pattern.test(text)) errors.push(`${check.file}: missing pattern ${pattern}`);
  }
}

if (errors.length > 0) {
  console.error("HRX security negative-test validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("HRX security negative-test validation passed.");
console.log(`negative_test_files: ${checks.length}`);
