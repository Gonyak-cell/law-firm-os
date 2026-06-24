#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const REQUIRED_FILES = [
  "packages/dms/src/repository.js",
  "packages/dms/src/migrations/001_dms_vault_runtime.sql",
  "packages/dms/src/storage/storage-adapter.js",
  "packages/dms/src/storage/local-storage-adapter.js",
  "packages/dms/src/storage/s3-storage-adapter.js",
  "packages/dms/src/storage/sharepoint-storage-adapter.js",
  "packages/dms/src/vault-object.js",
  "packages/dms/src/workspace-service.js",
  "packages/dms/src/folder-service.js",
  "packages/dms/src/document-service.js",
  "packages/dms/src/version-service.js",
  "packages/dms/src/file-object-service.js",
  "packages/dms/src/lineage-service.js",
  "packages/dms/src/lock-service.js",
  "packages/dms/src/privilege-service.js",
  "packages/dms/src/legal-hold-service.js",
  "packages/dms/src/retention-service.js",
  "packages/dms/src/redaction-service.js",
  "packages/dms/src/secure-link-service.js",
  "packages/email-dms/src/email-model.js",
  "packages/email-dms/src/email-filing-service.js",
  "packages/email-dms/src/m365-placeholder.js",
  "packages/hrx/src/hr-document-vault-service.js",
  "packages/dms/src/search/indexer.js",
  "packages/dms/src/search/acl-filter.js",
  "packages/dms/src/rag-evidence.js",
  "packages/dms/src/audit.js",
  "apps/api/src/vault-dms-runtime-context.js",
  "apps/web/src/components/VaultSurface.jsx",
  "apps/web/src/components/DocumentDetail.jsx",
  "apps/web/src/components/EmailFilingView.jsx",
  "scripts/validate-cmp-r4-g5.mjs",
  "docs/reorganization/client-matter-os/cmp-v1/r4-g5-closeout.md",
];

const REQUIRED_TESTS = [
  "packages/dms/test/runtime-services.test.js",
  "apps/api/test/cmp-r4-g5-vault.test.js",
  "apps/web/test/ui-regression.test.mjs",
];

const REQUIRED_EVIDENCE = Array.from({ length: 32 }, (_, index) =>
  `docs/reorganization/client-matter-os/cmp-v1/evidence/cmp-g5-${String(index + 1).padStart(3, "0")}.md`,
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

requirePatterns("packages/dms/src/repository.js", [/filePath/, /recordIdempotency/, /appendAudit/, /transaction\(fn\)/]);
requirePatterns("packages/dms/src/storage/storage-adapter.js", [/assertStorageAdapter/, /sha256Hex/, /raw_path_exposed: false/]);
requirePatterns("packages/dms/src/document-service.js", [/uploadDocument/, /storage\.putObject/, /recordIdempotency/, /dms\.document\.upload/]);
requirePatterns("packages/dms/src/lock-service.js", [/already checked out by another editor/]);
requirePatterns("packages/dms/src/privilege-service.js", [/filterPrivilegedForSearch/, /privileged: true/]);
requirePatterns("packages/dms/src/legal-hold-service.js", [/held object delete blocked/]);
requirePatterns("packages/dms/src/secure-link-service.js", [/DMS_SECURE_LINK_MFA_REQUIRED/, /watermark_required/]);
requirePatterns("packages/email-dms/src/m365-placeholder.js", [/credential_ref/, /credential_material_included: false/]);
requirePatterns("packages/dms/src/search/acl-filter.js", [/omitted_result_count: null/, /count_leak_prevented: true/]);
requirePatterns("apps/api/src/vault-dms-runtime-context.js", [
  /VAULT_DMS_BOUNDED_CONTEXT/,
  /runtime_write_ready: true/,
  /production_ready_claim: false/,
  /handleVaultDocumentUpload/,
  /MATTER_VAULT_REGISTERED_TENANT_ID/,
  /registered_account/,
  /account_linkage/,
  /storage_pointer_ref_included: false/,
]);
requirePatterns("apps/web/src/components/VaultSurface.jsx", [
  /data-cmp-g5-vault-surface="true"/,
  /fetchVaultDocuments/,
  /registeredAccountLabel/,
  /등록 계정/,
]);
requirePatterns("apps/web/src/components/DocumentDetail.jsx", [/data-cmp-g5-document-detail="true"/, /document_bytes_included/, /storage_pointer_ref_included/]);
requirePatterns("apps/web/src/components/EmailFilingView.jsx", [/data-cmp-g5-email-filing="true"/, /연동 정보가 연결되지 않았습니다/]);
requirePatterns("apps/api/test/cmp-r4-g5-vault.test.js", [/survives restart/, /never leaks raw storage fields/, /safe-source/, /registered_account\.email/]);

rejectPatterns("apps/web/src/components/VaultSurface.jsx", [/mockData|from "\.\.\/data\/mockData/]);

if (failures.length > 0) {
  console.error("CMP R4 G5 validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("CMP R4 G5 validation passed.");
console.log("g5_runtime_tuws_with_evidence: 32/32");
console.log("remaining_g5_tuw: none");
