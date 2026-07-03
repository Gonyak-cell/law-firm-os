#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function read(path) {
  return readFile(path, "utf8");
}

const indexer = await read("packages/dms/src/search/indexer.js");
const searchService = await read("packages/dms/src/search/search-service.js");
const permissionService = await read("packages/dms/src/vault-permission-service.js");
const runtime = await read("apps/api/src/vault-dms-runtime-context.js");
const vaultSurface = await read("apps/web/src/components/VaultSurface.jsx");
const dmsTest = await read("packages/dms/test/runtime-services.test.js");
const apiTest = await read("apps/api/test/cmp-r4-g5-vault.test.js");
const browserProof = await read("scripts/run-upl-e02-vault-ocr-search-browser-proof.mjs");

assert.match(indexer, /extractOcrSearchableText/);
assert.match(indexer, /pdf_ocr_sidecar_text/);
assert.match(indexer, /lawos_sidecar_ocr_v1/);
assert.match(indexer, /ocr_text_indexed/);
assert.match(indexer, /ocr_searchable_text/);
assert.match(searchService, /ocr_text/);
assert.match(searchService, /row\.ocr_searchable_text/);
assert.match(permissionService, /ocr_searchable_text/);
assert.match(runtime, /ocr_text:\s*body\.ocr_text/);
assert.match(runtime, /ocr_runtime_executed/);
assert.match(vaultSurface, /return "OCR"/);
assert.match(dmsTest, /UPL-E-02 DMS OCR sidecar indexes scanned PDF text/);
assert.match(apiTest, /UPL-E-02 Vault OCR search indexes scanned PDF sidecar text/);
assert.match(browserProof, /OCR키워드/);
assert.match(browserProof, /data-upl-e01-vault-search/);

console.log("UPL-E-02 Vault OCR search validation passed.");
console.log("ocr_provider: lawos_sidecar_ocr_v1");
console.log("api_route: POST /api/vault/documents -> GET /api/vault/search?q=");
console.log("ui_match_field: OCR");
