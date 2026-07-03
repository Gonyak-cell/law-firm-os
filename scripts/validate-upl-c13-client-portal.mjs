#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = process.cwd();
const requiredFiles = [
  "apps/web/src/App.jsx",
  "apps/web/src/components/PortalSurface.jsx",
  "apps/web/src/components/Shell.jsx",
  "apps/web/src/data/apiClient.js",
  "apps/api/src/portal-runtime-context.js",
  "apps/api/test/cmp-r4-g10-portal.test.js",
  "packages/client-portal/src/magic-link-service.js",
  "packages/client-portal/test/runtime-services.test.js",
  "scripts/run-upl-c13-client-portal-browser-proof.mjs",
  "artifacts/manual-qa/upl-c13-client-portal-browser-proof.json",
  "artifacts/manual-qa/upl-c13-client-portal-browser-proof.md",
];

function read(path) {
  return readFileSync(resolve(ROOT, path), "utf8");
}

for (const file of requiredFiles) {
  assert.equal(existsSync(resolve(ROOT, file)), true, `missing required file: ${file}`);
}

const app = read("apps/web/src/App.jsx");
assert.match(app, /PortalSurface/);
assert.match(app, /view === "portal"/);

const nav = read("apps/web/src/data/nav.js");
assert.match(nav, /id:\s*"portal"/);
assert.match(nav, /Share2/);

const shell = read("apps/web/src/components/Shell.jsx");
assert.match(shell, /portal:\s*\{/);
assert.match(shell, /공유 포털/);
assert.match(shell, /공유 링크/);

const apiClient = read("apps/web/src/data/apiClient.js");
for (const marker of [
  'const PORTAL_TENANT_ID = runtimeTenant("tenant", "cmp", "g10", "synthetic")',
  "consumePortalInvite",
  "submitPortalExternalRfiResponse",
  "accessPortalExternalSecureLink",
  "/api/portal/invites/consume",
  "/api/portal/external/rfi-responses",
]) {
  assert.ok(apiClient.includes(marker), `api client missing marker: ${marker}`);
}

const surface = read("apps/web/src/components/PortalSurface.jsx");
for (const marker of [
  "data-c13-portal-mounted",
  "data-c13-external-session",
  "data-c13-rfi-response",
  "data-c13-secure-link-access",
  "PORTAL_SECURE_LINK_EXPIRED",
  "요청 응답 제출",
  "공유 링크 확인",
]) {
  assert.ok(surface.includes(marker), `PortalSurface missing marker: ${marker}`);
}

const runtime = read("apps/api/src/portal-runtime-context.js");
for (const marker of [
  "POST /api/portal/invites",
  "POST /api/portal/invites/consume",
  "POST /api/portal/external/rfi-responses",
  "GET /api/portal/external/secure-links/:id/access",
  "POST /api/portal/secure-links/:id/revoke",
  "POST /api/portal/invites/:id/revoke",
  "token_material_included: false",
  "document_bytes_included: false",
]) {
  assert.ok(runtime.includes(marker), `portal runtime missing marker: ${marker}`);
}

const magic = read("packages/client-portal/src/magic-link-service.js");
for (const marker of [
  "createMagicLinkInvite",
  "consumeMagicLinkInvite",
  "revokeMagicLinkInvite",
  "submitExternalRfiResponse",
  "accessExternalSecureLink",
  "PORTAL_MAGIC_LINK_ALREADY_USED",
  "PORTAL_SECURE_LINK_EXPIRED",
  "token_material_persisted: false",
]) {
  assert.ok(magic.includes(marker), `magic-link service missing marker: ${marker}`);
}

const apiTest = read("apps/api/test/cmp-r4-g10-portal.test.js");
assert.match(apiTest, /C13 external portal invite flow is one-time, auditable, and byte-safe/);
assert.match(apiTest, /PORTAL_MAGIC_LINK_ALREADY_USED/);
assert.match(apiTest, /PORTAL_SECURE_LINK_REVOKED/);

const serviceTest = read("packages/client-portal/test/runtime-services.test.js");
assert.match(serviceTest, /C13 magic-link invite is one-time, auditable, revocable, and metadata-only/);

const artifact = JSON.parse(read("artifacts/manual-qa/upl-c13-client-portal-browser-proof.json"));
assert.equal(artifact.pass, true, "browser proof must pass");
assert.deepEqual(artifact.tuw_ids, ["UPL-C-13"]);
assert.equal(artifact.production_ready_claim, false);
assert.equal(artifact.go_live_claim, false);
assert.equal(artifact.token_material_rendered, false);
assert.equal(artifact.document_bytes_rendered, false);
assert.equal(artifact.seed.invite_url_returned_once, true);
assert.equal(artifact.seed.token_material_persisted, false);
assert.equal(artifact.audit.token_material_included, false);
for (const id of [
  "c13-portal-surface-mounted",
  "c13-magic-link-consumed-one-time",
  "c13-rfi-response-ui-metadata-only",
  "c13-expired-secure-link-denied",
  "c13-token-not-rendered",
  "c13-api-observed-external-consume",
  "c13-api-observed-external-rfi",
  "c13-api-observed-expired-secure-link",
  "c13-audit-events-present",
]) {
  assert.equal(artifact.checks.find((check) => check.id === id)?.passed, true, `artifact check failed: ${id}`);
}

console.log(JSON.stringify({
  pass: true,
  validator: "validate-upl-c13-client-portal",
  artifact: "artifacts/manual-qa/upl-c13-client-portal-browser-proof.json",
}, null, 2));
