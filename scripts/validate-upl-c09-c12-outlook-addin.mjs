#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { assertNodeProofPass } from "./lib/upl-proof-runner.mjs";
import { OUTLOOK_EMAIL_OBJECT_FIELDS } from "../packages/email-dms/src/email-model.js";
import { OUTLOOK_PRODUCT_IDS } from "../apps/addin/src/outlook-surface-profile.js";

const ROOT = process.cwd();
const requiredFiles = [
  "apps/addin/package.json",
  "apps/addin/index.html",
  "apps/addin/manifest.xml",
  "apps/addin/manifest.production.xml",
  "apps/addin/manifest.inquiry.xml",
  "apps/addin/manifest.inquiry.production.xml",
  "apps/addin/vite.config.js",
  "apps/addin/vite.inquiry.config.js",
  "apps/addin/src/matter-entry.js",
  "apps/addin/src/inquiry-entry.jsx",
  "apps/addin/src/outlook-matter-shell.jsx",
  "apps/addin/src/outlook-inquiry-shell.jsx",
  "apps/addin/src/outlook-compact-shell.jsx",
  "apps/addin/src/outlook-filing.js",
  "apps/addin/src/outlook-attachment-actions.js",
  "apps/addin/src/addin-auth.js",
  "apps/addin/src/main.jsx",
  "apps/addin/src/styles.css",
  "apps/api/src/outlook-addin-runtime-context.js",
  "apps/api/test/outlook-addin-api.test.js",
  "scripts/run-upl-c09-c12-outlook-addin-browser-proof.mjs",
  "docs/lazycodex/evidence/matter-web/artifacts/upl-c09-c12-outlook-addin-browser-proof.json",
  "docs/lazycodex/evidence/matter-web/artifacts/upl-c09-c12-outlook-addin-browser-proof.md",
  "artifacts/manual-qa/upl-e04-smart-alerts-local-proof-2026-07-03.json",
  "artifacts/manual-qa/upl-e04-smart-alerts-local-proof-2026-07-03.md",
];

function read(path) {
  return readFileSync(resolve(ROOT, path), "utf8");
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

for (const file of requiredFiles) {
  assert.equal(existsSync(resolve(ROOT, file)), true, `missing required file: ${file}`);
}

const proofStartedAt = Date.now();
await assertNodeProofPass("scripts/run-upl-c09-c12-outlook-addin-browser-proof.mjs");

const releaseContract = JSON.parse(read("contracts/outlook-addin-release-gates.json"));
assert.ok(Array.isArray(releaseContract.manifests), "release contract manifest list missing");
assert.ok(Array.isArray(releaseContract.profiles), "release contract profile list missing");
const canonicalProductIds = [OUTLOOK_PRODUCT_IDS.matterFull, OUTLOOK_PRODUCT_IDS.inquiryOnly].sort();
const manifestProductIds = [];
for (const manifestPath of releaseContract.manifests) {
  const manifestText = read(manifestPath);
  const productId = manifestText.match(/<Id>\s*([^<]+?)\s*<\/Id>/u)?.[1]?.trim();
  assert.ok(productId, `manifest ProductId missing: ${manifestPath}`);
  const profile = releaseContract.profiles.find((candidate) => candidate.product_id === productId);
  assert.ok(profile, `manifest ProductId is not in the release profile contract: ${manifestPath}`);
  manifestProductIds.push(productId);
  assert.match(
    manifestText,
    new RegExp(`<Permissions>\\s*${escapeRegExp(profile.permission)}\\s*<\\/Permissions>`, "u"),
    `${manifestPath} must use the approved ${profile.permission} permission`,
  );
  assert.doesNotMatch(manifestText, /ReadWriteMailbox/u, `${manifestPath} must not request ReadWriteMailbox`);
  assert.doesNotMatch(
    manifestText,
    /OnMessageSend|LaunchEvent|<Runtimes>|WebViewRuntime\.Url|JSRuntime\.Url/u,
    `${manifestPath} must not activate automatic Outlook Send interception`,
  );
  assert.match(
    manifestText,
    new RegExp(escapeRegExp(profile.taskpane_html), "u"),
    `${manifestPath} task pane SourceLocation must stay profile-bound`,
  );
}
assert.deepEqual([...new Set(manifestProductIds)].sort(), canonicalProductIds, "both fixed Outlook ProductIds must remain deployed");
assert.deepEqual(
  releaseContract.profiles.map((profile) => profile.product_id).sort(),
  canonicalProductIds,
  "release profile ProductIds must match the fixed source profiles",
);

const matterVite = read("apps/addin/vite.config.js");
const inquiryVite = read("apps/addin/vite.inquiry.config.js");
assert.match(matterVite, /productionSourceLocation:\s*["']\/addin\/index\.html["']/u);
assert.match(matterVite, /productionBase:\s*["']\/addin\/["']/u);
assert.match(inquiryVite, /productionSourceLocation:\s*[\s\S]*["']\/outlook-addin\/index\.html/u);
assert.match(inquiryVite, /productionBase:\s*["']\/outlook-addin\/["']/u);

const matterEntry = read("apps/addin/src/matter-entry.js");
const inquiryEntry = read("apps/addin/src/inquiry-entry.jsx");
assert.match(matterEntry, /bootstrapOutlookSurface\(["']matter-full["']\s*,/u);
assert.match(inquiryEntry, /bootstrapOutlookSurface\(["']inquiry-only["']\)/u);
const matterShell = read("apps/addin/src/outlook-matter-shell.jsx");
const inquiryShell = read("apps/addin/src/outlook-inquiry-shell.jsx");
for (const featureId of [
  "mail.save-with-attachments",
  "matter.search",
  "task.create",
  "time-entry.draft",
  "all-functions",
]) {
  assert.match(matterShell, new RegExp(`featureId:\\s*["']${escapeRegExp(featureId)}\\s*["']`, "u"));
}
assert.match(inquiryShell, /featureId:\s*["']inquiry\.entry["']/u);
const compactShell = read("apps/addin/src/outlook-compact-shell.jsx");
assert.match(compactShell, /data-outlook-profile/u);
assert.match(compactShell, /data-outlook-rail/u);
const filing = read("apps/addin/src/outlook-filing.js");
const attachments = read("apps/addin/src/outlook-attachment-actions.js");
const auth = read("apps/addin/src/addin-auth.js");
assert.match(filing, /\/api\/outlook\/email\/file/u);
assert.match(attachments, /\/api\/outlook\/attachments\/save/u);
assert.match(auth, /lawos_addin_session_token/u);

const manifest = read("apps/addin/manifest.xml");
assert.match(manifest, /ShowTaskpane/);
assert.match(manifest, /MessageReadCommandSurface/);
assert.match(manifest, /MessageComposeCommandSurface/);
assert.doesNotMatch(manifest, /OnMessageSend|LaunchEvent|<Runtimes>|WebViewRuntime\.Url|JSRuntime\.Url/u);
assert.match(manifest, /<Permissions>\s*ReadItem\s*<\/Permissions>/u);
assert.doesNotMatch(manifest, /ReadWriteMailbox/u);

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
const fieldCount = OUTLOOK_EMAIL_OBJECT_FIELDS.length;
assert.ok(fieldCount > 0, "email field contract missing");

const pane = read("apps/addin/src/main.jsx");
for (const marker of [
  "PublicClientApplication",
  "__LAWOS_INIT_MSAL_BRIDGE",
  "registerOutlookCommandBridgeOnce",
  "/api/outlook/bootstrap",
  "/api/outlook/smart-alerts/evaluate",
  "Outlook 연결이 필요합니다.",
  "authorization",
]) {
  assert.ok(pane.includes(marker), `pane missing marker: ${marker}`);
}
assert.doesNotMatch(pane, /handleOutlookMessageSend|registerOutlookSendHandler|onMessageSendHandler/u);
assert.doesNotMatch(pane, /data-outlook-addin-taskpane/u, "legacy task pane marker must stay removed");
assert.doesNotMatch(pane, /x-lawos-permission-context/);

const artifact = JSON.parse(read("docs/lazycodex/evidence/matter-web/artifacts/upl-c09-c12-outlook-addin-browser-proof.json"));
const artifactGeneratedAt = Date.parse(artifact.generated_at);
assert.ok(Number.isFinite(artifactGeneratedAt), "browser proof generated_at must be valid");
assert.ok(artifactGeneratedAt >= proofStartedAt - 1_000, "browser proof artifact must be fresh from this validator run");
assert.equal(artifact.pass, true, "browser proof must pass");
assert.deepEqual(artifact.tuw_ids, ["UPL-C-09", "UPL-C-10", "UPL-C-11", "UPL-C-12", "UPL-E-04"]);
assert.match(artifact.taskpane_url, /\/addin\/$/u);
assert.match(artifact.inquiry_url, /\/outlook-addin\/$/u);
assert.deepEqual(artifact.profile_probe.matter_full.rail, [
  "mail.save-with-attachments",
  "matter.search",
  "task.create",
  "time-entry.draft",
  "all-functions",
]);
assert.deepEqual(artifact.profile_probe.inquiry_only.rail, ["inquiry.entry"]);
const staleShellCheck = artifact.checks.find((check) => [
  "c09-no-stale-shell-marker",
  "c09-no-legacy-taskpane-marker",
].includes(check.id));
assert.equal(staleShellCheck?.passed, true, "artifact stale shell marker check failed");
const inquiryEvidenceCheck = artifact.checks.find((check) => check.id === "c09-inquiry-evidence-storage-readback");
assert.equal(inquiryEvidenceCheck?.passed, true, "artifact inquiry evidence storage readback check failed");
const inquiryEvidenceProbe = artifact.inquiry_evidence_probe;
assert.equal(inquiryEvidenceProbe?.pass, true, "artifact inquiry evidence probe must pass");
const inquiryPost = inquiryEvidenceProbe.post_observation;
assert.deepEqual(
  {
    method: inquiryPost?.method,
    status: inquiryPost?.status,
    outcome: inquiryPost?.outcome,
    item_outcome: inquiryPost?.item_outcome,
    capture_status: inquiryPost?.capture_status,
  },
  {
    method: "POST",
    status: 201,
    outcome: "registered",
    item_outcome: "registered",
    capture_status: "complete",
  },
  "inquiry evidence POST must register the wrapper/item and complete capture",
);
const inquiryRepository = inquiryEvidenceProbe.repository;
assert.equal(inquiryRepository?.evidence_count, 1, "inquiry evidence repository must contain one evidence row");
assert.equal(inquiryRepository?.file_object_count, 2, "inquiry evidence repository must contain two file objects");
assert.equal(inquiryRepository?.evidence?.capture_status, "complete");
const inquiryFileObjects = inquiryRepository?.file_objects;
assert.ok(Array.isArray(inquiryFileObjects), "inquiry evidence file objects must be an array");
assert.deepEqual(
  inquiryFileObjects.map((fileObject) => fileObject.object_kind).sort(),
  ["original_mime", "sanitized_display"],
  "inquiry evidence file object kinds drifted",
);
assert.equal(inquiryFileObjects.every((fileObject) => fileObject.scan_status === "clean"), true, "inquiry evidence files must be clean");
assert.equal(inquiryFileObjects.find((fileObject) => fileObject.object_kind === "original_mime")?.immutable_original, true, "original MIME must remain immutable");
assert.equal(inquiryFileObjects.find((fileObject) => fileObject.object_kind === "sanitized_display")?.immutable_original, false, "sanitized display must not be marked immutable original");
const inquiryOriginalFile = inquiryFileObjects.find((fileObject) => fileObject.object_kind === "original_mime");
const inquiryReadback = inquiryEvidenceProbe.storage_readback;
assert.equal(inquiryReadback?.read_method, "readEvidenceContent");
assert.equal(inquiryReadback?.read_status, "ok");
assert.equal(inquiryReadback?.object_kind, "original_mime");
assert.equal(inquiryReadback?.mime_type, "message/rfc822");
assert.equal(inquiryReadback?.scan_status, "clean");
assert.match(inquiryReadback?.expected_sha256 ?? "", /^[a-f0-9]{64}$/u, "inquiry readback expected hash must be a SHA-256 digest");
assert.ok(Number.isSafeInteger(inquiryReadback?.expected_byte_size) && inquiryReadback.expected_byte_size > 0, "inquiry readback expected byte length must be a positive safe integer");
assert.equal(inquiryReadback?.sha256, inquiryReadback?.expected_sha256, "inquiry readback hash drifted from independent expected MIME hash");
assert.equal(inquiryReadback?.byte_size, inquiryReadback?.expected_byte_size, "inquiry readback byte length drifted from independent expected MIME length");
assert.equal(inquiryReadback?.sha256, inquiryOriginalFile?.sha256, "inquiry readback hash drifted from original MIME file object");
assert.equal(inquiryReadback?.byte_size, inquiryOriginalFile?.byte_size, "inquiry readback byte length drifted from original MIME file object");
assert.equal(inquiryReadback?.exact_bytes_match, true, "inquiry readback must match proof MIME bytes exactly");
assert.equal(inquiryReadback?.storage_pointer_ref_included, false, "inquiry readback must not expose a storage pointer");
assert.equal(inquiryReadback?.raw_bytes_read, true, "inquiry readback must prove a byte read");
const forbiddenInquiryEvidenceKeys = new Set([
  "content",
  "raw_content",
  "bytes",
  "raw_bytes",
  "content_base64",
  "attachment_bytes",
  "document_bytes",
  "email_body",
  "message_body",
]);
const assertInquiryEvidenceSafe = (value) => {
  if (Array.isArray(value)) {
    value.forEach(assertInquiryEvidenceSafe);
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    assert.equal(forbiddenInquiryEvidenceKeys.has(key), false, `inquiry evidence probe must not expose raw field: ${key}`);
    assertInquiryEvidenceSafe(child);
  }
};
assertInquiryEvidenceSafe(inquiryEvidenceProbe);
assert.equal(artifact.external_receipt_boundary.provider_runtime_executed, false);
assert.equal(artifact.external_receipt_boundary.production_write_claim, false);
assert.equal(artifact.msal_bridge_probe.configured, true);
assert.equal(artifact.msal_bridge_probe.initialized, true);
assert.equal(artifact.msal_bridge_probe.provider_runtime_executed, false);
assert.equal(artifact.msal_bridge_probe.graph_request_executed, false);
assert.equal(artifact.msal_bridge_probe.token_material_returned, false);
assert.deepEqual(artifact.snapshot.email_object_field_contract, [...OUTLOOK_EMAIL_OBJECT_FIELDS]);
assert.equal(artifact.snapshot.email_object_field_contract.length, fieldCount);
for (const id of [
  "c09-taskpane-browser-load",
  "c09-signed-session-authorization-observed",
  "c09-legacy-permission-context-not-sent",
  "c09-msal-bridge-initialized",
  "c09-msal-bridge-noninteractive",
  "c10-email-thread-created",
  "c10-timeline-email-visible",
  "c11-attachment-document-visible",
  "c11-folder-structure-00-99",
  "c12-manual-task-visible",
  "c12-explicit-send-review-warning-not-block",
  "c12-automatic-send-handler-absent",
  "c12-automatic-send-event-probe-absent",
]) {
  assert.equal(artifact.checks.find((check) => check.id === id)?.passed, true, `artifact check failed: ${id}`);
}
const fieldContractCheck = artifact.checks.find((check) => [
  "c10-email-object-current-fields",
  "c10-email-object-18-fields",
  "c10-email-object-field-contract",
].includes(check.id));
assert.equal(fieldContractCheck?.passed, true, "artifact email field contract check failed");
assert.equal(fieldContractCheck?.field_count, fieldCount, "artifact email field contract count drifted");
assert.equal(artifact.automatic_send_probe.handler_available, false);
assert.deepEqual(artifact.automatic_send_probe.associated_actions, []);
assert.equal(artifact.automatic_send_probe.event_probe_present, false);
assert.equal(artifact.e04_local_receipt, "artifacts/manual-qa/upl-e04-smart-alerts-local-proof-2026-07-03.json");

const e04 = JSON.parse(read("artifacts/manual-qa/upl-e04-smart-alerts-local-proof-2026-07-03.json"));
assert.equal(e04.pass, true, "E04 explicit send review local proof must pass");
assert.equal(e04.external_receipt_boundary.provider_runtime_executed, false);
assert.equal(e04.external_receipt_boundary.production_write_claim, false);
assert.equal(e04.raw_body_included, false);
assert.equal(e04.attachment_bytes_included, false);
for (const id of [
  "e04-taskpane-warning-visible",
  "e04-signed-session-authorization-observed",
  "e04-legacy-permission-context-not-sent",
  "e04-confidential-external-warning-only",
  "e04-missing-attachment-warning-only",
  "e04-clean-message-no-warning",
  "e04-forged-legacy-header-blocked",
  "e04-no-raw-body-or-attachment-bytes-in-receipt",
]) {
  assert.equal(e04.checks.find((check) => check.id === id)?.passed, true, `E04 artifact check failed: ${id}`);
}

console.log(JSON.stringify({
  pass: true,
  validator: "validate-upl-c09-c12-outlook-addin",
  email_object_fields: fieldCount,
  artifact: "docs/lazycodex/evidence/matter-web/artifacts/upl-c09-c12-outlook-addin-browser-proof.json",
}, null, 2));
