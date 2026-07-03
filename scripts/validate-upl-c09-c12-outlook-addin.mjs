#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = process.cwd();
const requiredFiles = [
  "apps/addin/package.json",
  "apps/addin/index.html",
  "apps/addin/manifest.xml",
  "apps/addin/src/main.jsx",
  "apps/addin/src/styles.css",
  "apps/api/src/outlook-addin-runtime-context.js",
  "apps/api/test/outlook-addin-api.test.js",
  "scripts/run-upl-c09-c12-outlook-addin-browser-proof.mjs",
  "docs/lazycodex/evidence/matter-web/artifacts/upl-c09-c12-outlook-addin-browser-proof.json",
  "docs/lazycodex/evidence/matter-web/artifacts/upl-c09-c12-outlook-addin-browser-proof.md",
];

function read(path) {
  return readFileSync(resolve(ROOT, path), "utf8");
}

for (const file of requiredFiles) {
  assert.equal(existsSync(resolve(ROOT, file)), true, `missing required file: ${file}`);
}

const manifest = read("apps/addin/manifest.xml");
assert.match(manifest, /ShowTaskpane/);
assert.match(manifest, /MessageReadCommandSurface/);
assert.match(manifest, /MessageComposeCommandSurface/);
assert.match(manifest, /OnMessageSend/);
assert.match(manifest, /ReadWriteMailbox/);

const server = read("apps/api/src/server.js");
assert.match(server, /OUTLOOK_ADDIN_BOUNDED_CONTEXT/);
assert.match(server, /pathname\.startsWith\("\/api\/outlook"\)/);
assert.match(server, /handleOutlookAddinApiRequest/);

const runtime = read("apps/api/src/outlook-addin-runtime-context.js");
for (const marker of [
  "GET /api/outlook/bootstrap",
  "POST /api/outlook/email/file",
  "POST /api/outlook/sent/file",
  "POST /api/outlook/attachments/save",
  "POST /api/outlook/followups",
  "POST /api/outlook/smart-alerts/evaluate",
  "fileEmailThreadToMatter",
  "uploadDocument",
  "createMatterActivityCalendarChannelService",
  "send_blocked: false",
  "provider_runtime_executed: false",
]) {
  assert.ok(runtime.includes(marker), `runtime missing marker: ${marker}`);
}

const model = read("packages/email-dms/src/email-model.js");
assert.match(model, /OUTLOOK_EMAIL_OBJECT_FIELDS/);
assert.match(model, /field_contract_count/);
const fieldMatch = model.match(/OUTLOOK_EMAIL_OBJECT_FIELDS = Object\.freeze\(\[([\s\S]*?)\]\);/);
assert.ok(fieldMatch, "email field contract missing");
const fieldCount = [...fieldMatch[1].matchAll(/"[^"]+"/g)].length;
assert.equal(fieldCount, 18, "Email object contract must expose 18 fields");

const pane = read("apps/addin/src/main.jsx");
for (const marker of [
  "data-outlook-addin-taskpane",
  "/api/outlook/bootstrap",
  "/api/outlook/email/file",
  "/api/outlook/attachments/save",
  "/api/outlook/followups",
  "/api/outlook/smart-alerts/evaluate",
  "provider-gated",
]) {
  assert.ok(pane.includes(marker), `pane missing marker: ${marker}`);
}

const artifact = JSON.parse(read("docs/lazycodex/evidence/matter-web/artifacts/upl-c09-c12-outlook-addin-browser-proof.json"));
assert.equal(artifact.pass, true, "browser proof must pass");
assert.deepEqual(artifact.tuw_ids, ["UPL-C-09", "UPL-C-10", "UPL-C-11", "UPL-C-12", "UPL-E-04"]);
assert.equal(artifact.external_receipt_boundary.provider_runtime_executed, false);
assert.equal(artifact.external_receipt_boundary.production_write_claim, false);
assert.equal(artifact.snapshot.email_object_field_contract.length, 18);
for (const id of [
  "c09-taskpane-browser-load",
  "c10-email-thread-created",
  "c10-email-object-18-fields",
  "c10-timeline-email-visible",
  "c11-attachment-document-visible",
  "c11-folder-structure-00-99",
  "c12-manual-task-visible",
  "c12-smart-alert-warning-not-block",
]) {
  assert.equal(artifact.checks.find((check) => check.id === id)?.passed, true, `artifact check failed: ${id}`);
}

console.log(JSON.stringify({
  pass: true,
  validator: "validate-upl-c09-c12-outlook-addin",
  email_object_fields: fieldCount,
  artifact: "docs/lazycodex/evidence/matter-web/artifacts/upl-c09-c12-outlook-addin-browser-proof.json",
}, null, 2));
