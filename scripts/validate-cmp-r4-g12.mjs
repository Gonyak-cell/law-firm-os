#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const REQUIRED_FILES = [
  "packages/enterprise/src/enterprise-readiness-repository.js",
  "packages/enterprise/src/enterprise-readiness-service.js",
  "apps/api/src/enterprise-readiness-context.js",
  "apps/web/src/components/OpsSurface.jsx",
  "scripts/validate-cmp-r4-g12.mjs",
  "docs/reorganization/client-matter-os/cmp-v1/r4-g12-closeout.md",
];
const REQUIRED_TESTS = [
  "packages/enterprise/test/enterprise-readiness-runtime.test.js",
  "apps/api/test/cmp-r4-g12-enterprise-readiness.test.js",
  "apps/web/test/ui-regression.test.mjs",
];
const REQUIRED_EVIDENCE = Array.from({ length: 28 }, (_, index) =>
  `docs/reorganization/client-matter-os/cmp-v1/evidence/cmp-g12-${String(index + 1).padStart(3, "0")}.md`,
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

requirePatterns("packages/enterprise/src/enterprise-readiness-repository.js", [/filePath/, /recordIdempotency/, /appendAudit/, /owner_decision_required/, /go_live_approved: false/]);
requirePatterns("packages/enterprise/src/enterprise-readiness-service.js", [/recordEnterpriseReadinessItem/, /recordReleaseCandidate/, /recordGoNoGoDecision/, /cannot claim production/, /owner approval and release gate/]);
requirePatterns("apps/api/src/enterprise-readiness-context.js", [/ENTERPRISE_READINESS_BOUNDED_CONTEXT/, /runtime_write_ready: true/, /production_ready_claim: false/, /go_live_approved: false/, /CMP-G12-W12-T028/]);
requirePatterns("apps/web/src/components/OpsSurface.jsx", [/data-cmp-g12-enterprise-readiness/, /fetchEnterpriseReadinessItems/, /No go-live approval recorded/]);
requirePatterns("packages/enterprise/test/enterprise-readiness-runtime.test.js", [/persists items/, /blocks premature production/]);
requirePatterns("apps/api/test/cmp-r4-g12-enterprise-readiness.test.js", [/28 controls/, /reject premature go/]);
requirePatterns("apps/web/test/ui-regression.test.mjs", [/G12 enterprise ops surface/]);
rejectPatterns("apps/api/src/enterprise-readiness-context.js", [/production_ready_claim: true/, /go_live_approved: true/]);
rejectPatterns("apps/web/src/components/OpsSurface.jsx", [/mockData|from "\.\.\/data\/mockData/]);

if (failures.length > 0) {
  console.error("CMP R4 G12 validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("CMP R4 G12 validation passed.");
console.log("g12_runtime_tuws_with_evidence: 28/28");
console.log("remaining_g12_tuw: none");
