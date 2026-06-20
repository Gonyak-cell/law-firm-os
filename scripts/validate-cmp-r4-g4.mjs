#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const REQUIRED_FILES = [
  "packages/matter/src/repository.js",
  "packages/matter/src/migrations/index.js",
  "packages/matter/src/migrations/001_matter_core.sql",
  "packages/matter/src/model.js",
  "packages/matter/src/numbering-service.js",
  "packages/matter/src/opening-service.js",
  "packages/matter/src/staffing-service.js",
  "packages/matter/src/role-policy.js",
  "packages/matter/src/task-service.js",
  "packages/matter/src/calendar-service.js",
  "packages/matter/src/deadline-dual-control.js",
  "packages/matter/src/status-history.js",
  "packages/matter/src/timeline-read-model.js",
  "packages/matter/src/client-report.js",
  "packages/matter/src/closing-service.js",
  "packages/matter/src/visibility-service.js",
  "packages/matter/src/audit.js",
  "packages/matter/src/intake-dependency-guard.js",
  "apps/api/src/matter-runtime-context.js",
  "apps/api/test/cmp-r4-g4-matter.test.js",
  "apps/web/src/components/MattersSurface.jsx",
  "apps/web/src/components/MatterOpeningWizard.jsx",
  "apps/web/src/components/MatterTeamRoster.jsx",
  "docs/reorganization/client-matter-os/cmp-v1/r4-g4-closeout.md",
];

const REQUIRED_TESTS = [
  "packages/matter/test/runtime-services.test.js",
  "apps/api/test/cmp-r4-g4-matter.test.js",
  "apps/web/test/ui-regression.test.mjs",
];

const REQUIRED_EVIDENCE = Array.from({ length: 23 }, (_, index) =>
  `docs/reorganization/client-matter-os/cmp-v1/evidence/cmp-g4-${String(index + 1).padStart(3, "0")}.md`,
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

function rejectPatterns(file, patterns) {
  const source = readFileSync(path.join(ROOT, file), "utf8");
  for (const pattern of patterns) {
    if (pattern.test(source)) failures.push(`forbidden marker:${file}:${pattern.source}`);
  }
}

requirePatterns("packages/matter/src/repository.js", [
  /filePath/,
  /recordIdempotency/,
  /appendAudit/,
  /transaction\(fn\)/,
]);
requirePatterns("packages/matter/src/model.js", [
  /employee_id: input\.employee_id \?\? null/,
  /createMatterCoreRecord/,
]);
requirePatterns("packages/matter/src/numbering-service.js", [
  /deriveMatterNumber/,
  /Matter number already exists/,
  /recordIdempotency/,
]);
requirePatterns("packages/matter/src/opening-service.js", [
  /openMatterTransaction/,
  /validateClearance/,
  /reserveMatterNumber/,
  /dms\?\.createWorkspace/,
  /billing\?\.createMatterLedger/,
  /recordIdempotency/,
]);
requirePatterns("packages/matter/src/staffing-service.js", [
  /MatterTeam member requires employee_id/,
  /employee\.availability === "unavailable"/,
  /Offboarded employee cannot be staffed/,
  /matter:team:write/,
]);
requirePatterns("packages/matter/src/audit.js", [
  /createMatterAuditEvent/,
  /event_hash/,
  /appendMatterAuditEvent/,
]);
requirePatterns("packages/matter/src/intake-dependency-guard.js", [
  /Opportunity direct Matter opening is blocked/,
  /clearance_token_id/,
]);
requirePatterns("apps/api/src/matter-runtime-context.js", [
  /MATTER_BOUNDED_CONTEXT/,
  /runtime_write_ready: true/,
  /r5_r6_owner_decision_ready: true/,
  /production_ready_claim: false/,
  /handleMatterOpening/,
  /handleMatterTeamMemberCreate/,
  /document_count/,
  /team_member_count/,
  /wip_status/,
  /risk_level/,
  /count_leak_prevented: true/,
]);
requirePatterns("apps/api/test/cmp-r4-g4-matter.test.js", [
  /opening write persists, audits, and replays idempotently/,
  /team write requires employee-backed staffing/,
  /permission gate fails closed/,
]);
requirePatterns("apps/web/src/components/MattersSurface.jsx", [
  /data-cmp-g4-live-matters="true"/,
  /fetchMatterRecords/,
  /"Docs"/,
  /"Team"/,
  /"WIP"/,
  /"Risk"/,
  /production-ready claim remains gated/i,
]);
requirePatterns("apps/web/src/components/MatterOpeningWizard.jsx", [
  /data-cmp-g4-opening-wizard="true"/,
  /createMatterOpening/,
  /clearance_token_id/,
]);
requirePatterns("apps/web/src/components/MatterTeamRoster.jsx", [
  /data-cmp-g4-team-roster="true"/,
  /addMatterTeamMember/,
  /employee_id/,
]);

rejectPatterns("apps/api/src/matter-runtime-context.js", [/descriptor-only/]);
rejectPatterns("apps/web/src/components/MattersSurface.jsx", [/mockData|from "\.\.\/data\/mockData/]);

if (failures.length > 0) {
  console.error("CMP R4 G4 validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("CMP R4 G4 validation passed.");
console.log("g4_runtime_tuws_with_evidence: 23/23");
console.log("remaining_g4_tuw: none");
