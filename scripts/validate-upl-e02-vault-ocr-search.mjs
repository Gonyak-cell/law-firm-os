#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";

async function read(path) {
  return readFile(path, "utf8");
}

function run(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("close", (status) => resolve({ status, stdout, stderr }));
  });
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
assert.match(indexer, /caller_supplied_ocr_sidecar/);
assert.match(indexer, /ocr_runtime_executed:\s*false/);
assert.match(indexer, /ocr_text_indexed/);
assert.match(indexer, /ocr_searchable_text/);
assert.match(indexer, /json_substring_search/);
assert.match(searchService, /ocr_text/);
assert.match(searchService, /row\.ocr_searchable_text/);
assert.match(permissionService, /ocr_searchable_text/);
assert.match(runtime, /ocr_text:\s*normalizedBody\.ocr_text/);
assert.match(runtime, /ocr_runtime_executed/);
assert.match(runtime, /json_substring_search/);
assert.match(vaultSurface, /return "OCR"/);
assert.match(dmsTest, /without claiming OCR runtime execution/);
assert.match(apiTest, /without claiming OCR runtime execution/);
assert.match(browserProof, /OCR키워드/);
assert.match(browserProof, /data-upl-e01-vault-search/);
assert.match(browserProof, /apiSessionHeaders/);
assert.match(browserProof, /unsigned-forged-permission-context-blocked/);

const executed = await run("node", ["scripts/run-upl-e02-vault-ocr-search-browser-proof.mjs"]);
assert.equal(executed.status, 0, executed.stderr || executed.stdout);

console.log("UPL-E-02 Vault OCR search validation passed.");
console.log("ocr_provider: caller_supplied_ocr_sidecar");
console.log("ocr_runtime_executed: false");
console.log("search_backend: json_substring_search");
console.log("api_route: POST /api/vault/documents -> GET /api/vault/search?q=");
console.log("ui_match_field: OCR");
