#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const REQUIRED_FILES = [
  "packages/master-data/src/repository.js",
  "packages/master-data/src/migrations/index.js",
  "packages/master-data/src/person-service.js",
  "packages/master-data/src/organization-service.js",
  "packages/master-data/src/alias-service.js",
  "packages/master-data/src/identifier-service.js",
  "packages/master-data/src/client-group-service.js",
  "packages/master-data/src/relationship-service.js",
  "packages/master-data/src/contact-point-service.js",
  "packages/master-data/src/billing-profile-service.js",
  "packages/master-data/src/duplicate-service.js",
  "packages/master-data/src/merge-split-service.js",
  "packages/master-data/src/audit.js",
  "packages/master-data/src/reference-integrity.js",
  "packages/migration/src/party-import.js",
  "apps/api/src/party-runtime-context.js",
  "apps/api/test/cmp-r4-g2-party.test.js",
  "apps/web/src/components/ClientsSurface.jsx",
  "docs/reorganization/client-matter-os/cmp-v1/r4-g2-closeout.md",
];

const REQUIRED_EVIDENCE = Array.from({ length: 19 }, (_, index) =>
  `docs/reorganization/client-matter-os/cmp-v1/evidence/cmp-g2-${String(index + 1).padStart(3, "0")}.md`,
);

const failures = [];

for (const file of [...REQUIRED_FILES, ...REQUIRED_EVIDENCE]) {
  if (!existsSync(path.join(ROOT, file))) failures.push(`missing:${file}`);
}

const masterDataContext = readFileSync(path.join(ROOT, "apps/api/src/master-data-context.js"), "utf8");
for (const pattern of [/createMasterDataRuntimeContext/, /runtime\.repository\.list/, /runtime\.repository\.get/]) {
  if (!pattern.test(masterDataContext)) failures.push(`missing master-data runtime marker:${pattern.source}`);
}
for (const pattern of [/descriptor-only/, /synthetic_crosswalk/]) {
  if (pattern.test(masterDataContext)) failures.push(`forbidden master-data marker:${pattern.source}`);
}

const clientsSurface = readFileSync(path.join(ROOT, "apps/web/src/components/ClientsSurface.jsx"), "utf8");
for (const pattern of [
  /data-cmp-g2-live-clients="true"/,
  /modelType: "ClientGroup"/,
  /live-data-loading/,
  /live-data-empty/,
  /live-data-denied/,
  /live-data-review/,
  /Live mode has no mock fallback/,
]) {
  if (!pattern.test(clientsSurface)) failures.push(`missing clients UI marker:${pattern.source}`);
}

if (failures.length > 0) {
  console.error("CMP R4 G2 validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("CMP R4 G2 validation passed.");
console.log("g2_runtime_tuws_with_evidence: 19/19");
console.log("remaining_g2_tuw: none");
