#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const REQUIRED_FILES = [
  "packages/hrx/src/repository.js",
  "packages/hrx/src/migrations/001_hrx_core.sql",
  "packages/hrx/src/employment-profile.js",
  "packages/hrx/src/identity-link.js",
  "packages/hrx/src/org.js",
  "packages/hrx/src/capacity-profile.js",
  "packages/hrx/src/leave/request-service.js",
  "packages/hrx/src/leave/balance.js",
  "packages/hrx/src/attendance.js",
  "packages/matter/src/hrx-workload-projection.js",
  "packages/hrx/src/documents.js",
  "packages/dms/src/vault-service.js",
  "packages/hrx/src/evaluation.js",
  "packages/hrx/src/compensation.js",
  "packages/hrx/src/onboarding.js",
  "packages/hrx/src/offboarding.js",
  "packages/hrx/src/recruiting/candidate.js",
  "packages/hrx/src/recruiting/application.js",
  "packages/hrx/src/ai/decision-guard.js",
  "packages/audit/src/hrx-events.js",
  "packages/authz/src/hrx-sensitive-scopes.js",
  "apps/api/src/routes/hrx/employees.js",
  "apps/web/src/people/PeopleHome.tsx",
  "packages/hrx/fixtures/seed-employees.synthetic.json",
  "docs/reorganization/client-matter-os/cmp-v1/r4-g3-closeout.md",
];

const REQUIRED_TESTS = [
  "packages/hrx/test/repository.test.js",
  "packages/hrx/test/employment-profile.test.js",
  "packages/hrx/test/identity-link.test.js",
  "packages/hrx/test/org.test.js",
  "packages/hrx/test/capacity-profile.test.js",
  "packages/hrx/test/leave-balance.test.js",
  "packages/hrx/test/attendance.test.js",
  "packages/matter/test/hrx-workload-projection.test.js",
  "packages/dms/test/vault-service.test.js",
  "packages/hrx/test/evaluation.test.js",
  "packages/hrx/test/compensation.test.js",
  "packages/hrx/test/onboarding.test.js",
  "packages/hrx/test/offboarding.test.js",
  "packages/hrx/test/candidate.test.js",
  "packages/hrx/test/application.test.js",
  "packages/hrx/test/ai-decision-guard.test.js",
  "packages/audit/test/hrx-events.test.js",
  "packages/authz/test/hrx-scopes.test.js",
  "apps/api/test/hrx-runtime-api.test.js",
  "apps/web/test/ui-regression.test.mjs",
];

const REQUIRED_EVIDENCE = Array.from({ length: 24 }, (_, index) =>
  `docs/reorganization/client-matter-os/cmp-v1/evidence/cmp-g3-${String(index + 1).padStart(3, "0")}.md`,
);

const failures = [];

for (const file of [...REQUIRED_FILES, ...REQUIRED_TESTS, ...REQUIRED_EVIDENCE]) {
  if (!existsSync(path.join(ROOT, file))) failures.push(`missing:${file}`);
}

function requirePatterns(file, patterns) {
  const source = readFileSync(path.join(ROOT, file), "utf8");
  for (const pattern of patterns) {
    if (!pattern.test(source)) failures.push(`missing marker:${file}:${pattern.source}`);
  }
}

requirePatterns("packages/hrx/src/identity-link.js", [
  /Employee and IAM User identifiers must remain separate/,
  /input\.employee_id === input\.user_id/,
]);
requirePatterns("packages/hrx/src/capacity-profile.js", [
  /denominator_hours/,
  /weekly_available_hours/,
  /calculateCapacityUtilization/,
]);
requirePatterns("packages/hrx/src/evaluation.js", [
  /hrx\.evaluation\.read/,
  /audit\?\.append/,
  /HRX_EVALUATION_READ_DENIED/,
]);
requirePatterns("packages/dms/src/vault-service.js", [
  /raw_storage_path_exposed: false/,
  /dms\.vault\.hrx_envelope\.read/,
  /DMS_HRX_VAULT_ENVELOPE_DENIED/,
]);
requirePatterns("apps/web/src/people/PeopleHome.tsx", [
  /data-hrx-api-backed="true"/,
  /no static fallback/i,
]);
requirePatterns("apps/web/src/people/hrxApiClient.ts", [
  /\/api\/hrx\/employees/,
]);

if (failures.length > 0) {
  console.error("CMP R4 G3 validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("CMP R4 G3 validation passed.");
console.log("g3_runtime_tuws_with_evidence: 24/24");
console.log("remaining_g3_tuw: none");
