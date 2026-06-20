#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createHrxM365DocumentSourceAdapter } from "../packages/integrations-core/src/hrx-m365-doc-source.js";
import { createHrxDocumentSourceVerification } from "../packages/hrx/src/documents/source-adapter.js";

const root = process.cwd();
const errors = [];

function assert(condition, message) {
  if (!condition) errors.push(message);
}

function read(path) {
  return readFileSync(resolve(root, path), "utf8");
}

for (const file of [
  "contracts/hrx-document-source-boundary.json",
  "packages/hrx/src/documents/source-adapter.js",
  "packages/integrations-core/src/hrx-m365-doc-source.js",
  "packages/hrx/test/document-source-adapter.test.js",
  "packages/integrations-core/test/hrx-m365-doc-source.test.js",
  "apps/api/test/hrx/documents.test.js",
]) {
  assert(existsSync(resolve(root, file)), `${file}: missing`);
}

const packageJson = JSON.parse(read("package.json"));
assert(packageJson.scripts?.["hrx:core:validate"] === "node scripts/validate-hrx-core-domain.mjs", "package script hrx:core:validate missing");

const contract = JSON.parse(read("contracts/hrx-document-source-boundary.json"));
assert(contract.metadata_only === true, "document source contract must be metadata-only");
assert(contract.document_body_storage_allowed === false, "document source contract must block document body storage");
assert(contract.secret_storage_allowed === false, "document source contract must block secret storage");
assert(contract.raw_external_payload_allowed === false, "document source contract must block raw external payload storage");
assert(contract.tuw_ids?.includes("HRX-L3-005") && contract.tuw_ids?.includes("HRX-L3-006"), "document source contract must bind PR-06 TUWs");

const documentSource = read("packages/hrx/src/documents/source-adapter.js");
assert(documentSource.includes("HRX_DOCUMENT_SOURCE_STATUSES"), "source adapter must declare statuses");
assert(documentSource.includes("assertNoHrxDocumentSourceLeak"), "source adapter must block body/secret leaks");
assert(documentSource.includes("mergeHrxDocumentSourceVerification"), "source adapter must merge verified source state into document metadata");

const routeSource = read("apps/api/src/routes/hrx/documents.js");
assert(routeSource.includes("sourceAdapter.verify"), "documents route must verify source_ref before create");
assert(routeSource.includes("mergeHrxDocumentSourceVerification"), "documents route must store source verification status");
assert(routeSource.includes("error.safe_error_code"), "documents route must preserve safe source verification errors");

const documentsStore = read("packages/hrx/src/documents.js");
assert(documentsStore.includes("source_status"), "document metadata must include source_status");
assert(documentsStore.includes("document_body_included: false"), "document metadata must keep body excluded");
assert(!documentsStore.includes("document_body: input"), "document metadata must not map document bodies");

const integrationSource = read("packages/integrations-core/src/hrx-m365-doc-source.js");
assert(integrationSource.includes("createHrxM365DocumentSourceAdapter"), "integrations-core must expose M365/DMS document source adapter");
assert(integrationSource.includes("assertMetadataOnly"), "M365/DMS source adapter must enforce metadata-only inputs");

const verified = createHrxDocumentSourceVerification({
  tenant_id: "tenant-a",
  source_ref: "dms://validator-doc",
  source_status: "verified",
  source_verified_at: "2026-06-20T00:00:00.000Z",
});
assert(verified.source_status === "verified", "source verification helper must produce verified status");

try {
  createHrxDocumentSourceVerification({
    tenant_id: "tenant-a",
    source_ref: "dms://validator-doc",
    source_metadata: { body: "blocked" },
  });
  errors.push("source verification helper must reject body metadata");
} catch (error) {
  assert(/body/.test(error.message), "source verification body rejection message must mention body");
}

const adapter = createHrxM365DocumentSourceAdapter({
  sources: [{
    tenant_id: "tenant-a",
    source_ref: "m365://drive/items/validator-doc",
    source_verified_at: "2026-06-20T00:00:00.000Z",
    provider_document_id: "validator-doc",
  }],
});
const adapterResult = await adapter.verify({ tenant_id: "tenant-a", source_ref: "m365://drive/items/validator-doc" });
assert(adapterResult.source_status === "verified", "M365 source adapter must verify seeded metadata refs");
assert(!JSON.stringify(adapterResult).includes("access_token"), "M365 source adapter must not expose token material");

if (errors.length > 0) {
  console.error("HRX core domain validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("HRX core domain validation passed.");
console.log("scope: document_source_boundary");
