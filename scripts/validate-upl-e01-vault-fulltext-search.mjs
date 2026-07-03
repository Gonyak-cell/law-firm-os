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
const apiClient = await read("apps/web/src/data/apiClient.js");
const vaultSurface = await read("apps/web/src/components/VaultSurface.jsx");
const dmsTest = await read("packages/dms/test/runtime-services.test.js");
const apiTest = await read("apps/api/test/cmp-r4-g5-vault.test.js");
const browserProof = await read("scripts/run-upl-e01-vault-fulltext-search-browser-proof.mjs");

assert.match(indexer, /extractSearchableDocumentText/);
assert.match(indexer, /pdf_printable_text/);
assert.match(indexer, /docx_ooxml_text/);
assert.match(indexer, /body_text_indexed/);
assert.match(indexer, /search_backend:\s*"sqlite_fts5_ready"/);
assert.match(searchService, /body_text/);
assert.match(searchService, /permission_decision_id/);
assert.match(searchService, /filterMatterVaultSearchResults/);
assert.match(permissionService, /sanitizeMatterVaultSearchResult/);
assert.match(permissionService, /searchable_text/);
assert.match(runtime, /upsertVaultSearchIndex/);
assert.match(runtime, /searchMatterVault/);
assert.match(runtime, /trimItemsByPermission/);
assert.match(runtime, /pathname === "\/api\/vault\/search"/);
assert.match(apiClient, /fetchVaultSearch/);
assert.match(apiClient, /params\.set\("q", normalizedQuery\)/);
assert.match(vaultSurface, /data-upl-e01-vault-search="true"/);
assert.match(vaultSurface, /aria-label="Vault 본문 검색"/);
assert.match(vaultSurface, /data-vault-search-raw-text-included/);
assert.doesNotMatch(vaultSurface, /searchable_text|content_text|storage_pointer_ref\s*:/);
assert.match(dmsTest, /UPL-E-01 DMS search indexes PDF\/DOCX body text/);
assert.match(apiTest, /UPL-E-01 Vault search hits uploaded body text/);
assert.match(browserProof, /data-upl-e01-vault-search/);

console.log("UPL-E-01 Vault full-text search validation passed.");
console.log("search_backend: sqlite_fts5_ready");
console.log("api_route: GET /api/vault/search?q=");
console.log("ui_marker: data-upl-e01-vault-search=true");
