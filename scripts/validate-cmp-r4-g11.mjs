#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const REQUIRED_FILES = [
  "packages/platform/src/ui-readiness-repository.js",
  "packages/platform/src/ui-readiness-service.js",
  "apps/api/src/ui-readiness-context.js",
  "apps/web/src/components/ReadinessSurface.jsx",
  "apps/web/src/components/PortalSurface.jsx",
  "apps/web/src/components/ClientsSurface.jsx",
  "apps/web/src/components/MattersSurface.jsx",
  "apps/web/src/components/VaultSurface.jsx",
  "apps/web/src/components/IntakeSurface.jsx",
  "apps/web/src/components/FinanceSurface.jsx",
  "apps/web/src/components/AnalyticsSurface.jsx",
  "apps/web/src/components/AskSurface.jsx",
  "scripts/validate-cmp-r4-g11.mjs",
  "docs/reorganization/client-matter-os/cmp-v1/r4-g11-closeout.md",
];
const REQUIRED_TESTS = [
  "packages/platform/test/ui-readiness-runtime.test.js",
  "apps/api/test/cmp-r4-g11-ui-readiness.test.js",
  "apps/web/test/ui-regression.test.mjs",
];
const REQUIRED_EVIDENCE = Array.from({ length: 48 }, (_, index) =>
  `docs/reorganization/client-matter-os/cmp-v1/evidence/cmp-g11-${String(index + 1).padStart(3, "0")}.md`,
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

requirePatterns("packages/platform/src/ui-readiness-repository.js", [/filePath/, /recordIdempotency/, /appendAudit/, /api_backed_surface/, /production_ready_claim: false/]);
requirePatterns("packages/platform/src/ui-readiness-service.js", [/recordUiReadinessCheck/, /recordCriticalPathRun/, /adjudicateUiReadiness/, /API-backed surface/, /permission gate verification/]);
requirePatterns("apps/api/src/ui-readiness-context.js", [/UI_READINESS_BOUNDED_CONTEXT/, /runtime_write_ready: true/, /production_ready_claim: false/, /G11_CHECKS/, /CMP-G11-W11-T048/]);
requirePatterns("apps/web/src/components/ReadinessSurface.jsx", [/data-cmp-g11-ui-readiness/, /fetchUiReadinessChecks/, /PermissionDeniedState/, /Ready for review, not launch-approved/]);
requirePatterns("apps/web/test/ui-regression.test.mjs", [/Portal\/Data Room runtime surface/, /G11 UI readiness surface/, /People runtime surface/, /HRX lifecycle board/]);
requirePatterns("packages/platform/test/ui-readiness-runtime.test.js", [/persists checks/, /blocks non-API-backed/]);
requirePatterns("apps/api/test/cmp-r4-g11-ui-readiness.test.js", [/48 TUW checks/, /persist readiness checks/, /reject non-runtime-backed/]);
rejectPatterns("apps/api/src/ui-readiness-context.js", [/production_ready_claim: true/]);
rejectPatterns("apps/web/src/components/ReadinessSurface.jsx", [/mockData|from "\.\.\/data\/mockData/]);

if (failures.length > 0) {
  console.error("CMP R4 G11 validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("CMP R4 G11 validation passed.");
console.log("g11_runtime_tuws_with_evidence: 48/48");
console.log("remaining_g11_tuw: none");
