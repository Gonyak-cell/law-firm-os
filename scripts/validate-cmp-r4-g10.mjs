#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const REQUIRED_FILES = [
  "packages/client-portal/src/runtime-repository.js",
  "packages/client-portal/src/external-user-service.js",
  "packages/client-portal/src/portal-projection-service.js",
  "packages/client-portal/src/rfi-service.js",
  "packages/client-portal/src/approval-service.js",
  "packages/client-portal/src/secure-link-service.js",
  "packages/client-portal/src/audit.js",
  "packages/data-room/src/data-room-runtime-service.js",
  "apps/api/src/portal-runtime-context.js",
  "apps/web/src/components/PortalSurface.jsx",
  "scripts/validate-cmp-r4-g10.mjs",
  "docs/reorganization/client-matter-os/cmp-v1/r4-g10-closeout.md",
];
const REQUIRED_TESTS = [
  "packages/client-portal/test/runtime-services.test.js",
  "apps/api/test/cmp-r4-g10-portal.test.js",
  "apps/web/test/ui-regression.test.mjs",
];
const REQUIRED_EVIDENCE = Array.from({ length: 17 }, (_, index) =>
  `docs/reorganization/client-matter-os/cmp-v1/evidence/cmp-g10-${String(index + 1).padStart(3, "0")}.md`,
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

requirePatterns("packages/client-portal/src/runtime-repository.js", [/filePath/, /recordIdempotency/, /appendAudit/, /document_bytes_included: false/, /token_material_included: false/]);
requirePatterns("packages/client-portal/src/external-user-service.js", [/createExternalUser/, /ExternalUser/]);
requirePatterns("packages/client-portal/src/portal-projection-service.js", [/createExternalAcl/, /createPortalProjection/, /createPortalDashboardProjection/, /inherited DMS ACL/, /cross-tenant/]);
requirePatterns("packages/client-portal/src/rfi-service.js", [/createRfiRequest/, /createRfiResponse/, /malware scan pass/, /upload_metadata_only: true/]);
requirePatterns("packages/client-portal/src/approval-service.js", [/createClientApproval/, /changes_requested/]);
requirePatterns("packages/client-portal/src/secure-link-service.js", [/createSecureLink/, /watermark/, /external share-boundary check/]);
requirePatterns("packages/data-room/src/data-room-runtime-service.js", [/createDataRoom/, /syncDataRoomProjection/, /external ACL/, /projection_metadata_only: true/]);
requirePatterns("apps/api/src/portal-runtime-context.js", [/PORTAL_BOUNDED_CONTEXT/, /runtime_write_ready: true/, /production_ready_claim: false/, /handlePortalApiRequest/]);
requirePatterns("apps/web/src/components/PortalSurface.jsx", [/data-cmp-g10-portal-runtime/, /fetchPortalDashboard/, /fetchDataRoomProjections/, /Token and document bytes omitted/]);
requirePatterns("packages/client-portal/test/runtime-services.test.js", [/persists external writes/, /blocks unsafe uploads/]);
requirePatterns("apps/api/test/cmp-r4-g10-portal.test.js", [/metadata-only/, /persist across restart/, /unsafe share boundaries/]);
rejectPatterns("apps/api/src/portal-runtime-context.js", [/production_ready_claim: true/]);
rejectPatterns("packages/client-portal/src/runtime-repository.js", [/production_ready_claim: true/]);
rejectPatterns("apps/web/src/components/PortalSurface.jsx", [/mockData|from "\.\.\/data\/mockData/]);

if (failures.length > 0) {
  console.error("CMP R4 G10 validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("CMP R4 G10 validation passed.");
console.log("g10_runtime_tuws_with_evidence: 17/17");
console.log("remaining_g10_tuw: none");
