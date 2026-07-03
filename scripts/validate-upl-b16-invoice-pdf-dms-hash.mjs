#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderInvoicePdf } from "../packages/billing/src/invoice-pdf-service.js";

const ROOT = process.cwd();
const requiredFiles = [
  "packages/billing/src/invoice-pdf-service.js",
  "packages/billing/test/invoice-pdf-service.test.js",
  "packages/billing/src/index.js",
  "apps/api/src/vault-dms-runtime-context.js",
  "apps/api/test/cmp-r4-g5-vault.test.js",
  "packages/dms/src/storage/download-service.js",
  "scripts/run-upl-b16-invoice-pdf-dms-hash-proof.mjs",
  "artifacts/manual-qa/upl-b16-invoice-pdf-dms-hash-proof.json",
  "artifacts/manual-qa/upl-b16-invoice-pdf-dms-hash-proof.md",
];

function read(path) {
  return readFileSync(resolve(ROOT, path), "utf8");
}

for (const file of requiredFiles) {
  assert.equal(existsSync(resolve(ROOT, file)), true, `missing required file: ${file}`);
}

const renderer = read("packages/billing/src/invoice-pdf-service.js");
const rendererTest = read("packages/billing/test/invoice-pdf-service.test.js");
const billingIndex = read("packages/billing/src/index.js");
const vaultRuntime = read("apps/api/src/vault-dms-runtime-context.js");
const vaultTest = read("apps/api/test/cmp-r4-g5-vault.test.js");
const dmsDownloadService = read("packages/dms/src/storage/download-service.js");
const proofScript = read("scripts/run-upl-b16-invoice-pdf-dms-hash-proof.mjs");
const artifact = JSON.parse(read("artifacts/manual-qa/upl-b16-invoice-pdf-dms-hash-proof.json"));

for (const marker of [
  "renderInvoicePdf",
  "%PDF-1.4",
  "sha256Hex",
  "mime_type: \"application/pdf\"",
  "production_ready_claim: false",
]) {
  assert.ok(renderer.includes(marker), `renderer missing marker: ${marker}`);
}

for (const marker of [
  "B16 invoice PDF renderer emits deterministic PDF bytes and hash",
  "%PDF-1.4",
  "application/pdf",
]) {
  assert.ok(rendererTest.includes(marker), `renderer test missing marker: ${marker}`);
}

assert.ok(billingIndex.includes("invoice-pdf-service.js"), "billing package index must export invoice PDF service");

for (const marker of [
  "content_base64",
  "Buffer.from(String(body.content_base64), \"base64\")",
  "content_sha256",
  "document_bytes_included: true",
]) {
  assert.ok(vaultRuntime.includes(marker), `vault runtime missing marker: ${marker}`);
}

for (const marker of [
  "UPL-B-16 Vault stores invoice PDF bytes and downloads hash-identical content",
  "renderInvoicePdf",
  "content_base64",
  "download.content_sha256",
]) {
  assert.ok(vaultTest.includes(marker), `vault test missing marker: ${marker}`);
}

for (const marker of ["downloadFileObjectWithAudit", "sha256", "file object hash mismatch"]) {
  assert.ok(dmsDownloadService.includes(marker), `DMS download service missing marker: ${marker}`);
}

for (const marker of [
  "store_path_kind",
  "temp_local_dms_store",
  "b16-dms-restart-readback-preserves-pdf-hash",
  "email_linkage_deferred_to",
]) {
  assert.ok(proofScript.includes(marker), `proof script missing marker: ${marker}`);
}

const directPdf = renderInvoicePdf({
  invoice: { invoice_id: "invoice_upl_b16_validator", invoice_number: "INV-UPL-B16-VALIDATOR", amount_due: 1 },
  invoice_lines: [{ line_type: "fees", amount: 1 }],
  generated_at: "2026-07-03T00:00:00.000Z",
});
assert.equal(directPdf.bytes.subarray(0, 8).toString("utf8"), "%PDF-1.4");
assert.equal(directPdf.sha256.length, 64);
assert.equal(directPdf.mime_type, "application/pdf");

assert.equal(artifact.pass, true, "proof artifact must pass");
assert.deepEqual(artifact.tuw_ids, ["UPL-B-16"]);
assert.equal(artifact.production_ready_claim, false);
assert.equal(artifact.go_live_claim, false);
assert.equal(artifact.email_linkage_claim, false);
assert.equal(artifact.email_linkage_deferred_to, "UPL-E-06");
assert.equal(artifact.external_email_receipt, false);
assert.equal(artifact.invoice_pdf.sha256, artifact.upload_receipt.sha256);
assert.equal(artifact.invoice_pdf.sha256, artifact.download_receipt.content_sha256);
assert.equal(artifact.invoice_pdf.sha256, artifact.download_receipt.recomputed_sha256);
assert.equal(artifact.invoice_pdf.sha256, artifact.restart_readback.content_sha256);
assert.equal(artifact.download_receipt.pdf_header, "%PDF-1.4");
assert.equal(artifact.download_receipt.raw_path_exposed, false);
assert.equal(artifact.download_receipt.storage_pointer_ref_included, false);

for (const id of [
  "b16-pdf-renderer-emits-pdf-bytes",
  "b16-dms-upload-stores-rendered-sha256",
  "b16-download-hash-matches-rendered-pdf",
  "b16-dms-restart-readback-preserves-pdf-hash",
  "b16-download-safe-boundary",
  "b16-email-linkage-not-claimed",
]) {
  assert.equal(artifact.checks.find((check) => check.id === id)?.passed, true, `artifact check failed: ${id}`);
}

console.log(JSON.stringify({
  pass: true,
  validator: "validate-upl-b16-invoice-pdf-dms-hash",
  artifact: "artifacts/manual-qa/upl-b16-invoice-pdf-dms-hash-proof.json",
  invoice_sha256: artifact.invoice_pdf.sha256,
}, null, 2));
