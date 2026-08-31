import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { uploadDocument } from "../../../packages/dms/src/document-service.js";
import { createDmsRepository } from "../../../packages/dms/src/repository.js";
import { createLocalStorageAdapter } from "../../../packages/dms/src/storage/local-storage-adapter.js";
import { createMatterRepository } from "../../../packages/matter/src/repository.js";
import {
  handleDesktopVaultExportAuthorize,
  handleDesktopVaultExportComplete,
  handleDesktopVaultExportDownload,
  handleDesktopVaultExportPreflight,
  isDesktopVaultExportApiPath,
} from "../src/desktop-vault-export-runtime.js";
import { createTestAmicVaultExportProvider } from "./helpers/amic-vault-export-provider.js";

const TENANT = "tenant_desktop_vault_export";
const ACTOR = "user_desktop_vault_export";
const MATTER = "matter_desktop_vault_export";
const BYTES = Buffer.from("desktop exact version bytes\n");

function harness({ capabilityAllowed = true, attachAllowed = true } = {}) {
  const now = () => Date.parse("2026-08-28T13:00:00.000Z");
  const repository = createDmsRepository();
  const storage = createLocalStorageAdapter({ adapter_id: "desktop-vault-export" });
  const result = uploadDocument({
    repository,
    storage,
    document: {
      document_id: "document_desktop_vault_export",
      tenant_id: TENANT,
      matter_id: `vault-${MATTER}`,
      workspace_id: "workspace_desktop_vault_export",
      folder_id: null,
      title: "Desktop exact export",
      filename: "desktop-exact.pdf",
      status: "active",
      current_version_id: "version_desktop_vault_export_3",
      permission_envelope_id: "permission_desktop_vault_export",
      audit_trace_id: "audit_desktop_vault_export",
      mime_type: "application/pdf",
    },
    bytes: BYTES,
    actor_id: ACTOR,
    idempotency_key: "desktop-vault-export-seed",
  });
  const exact = Object.freeze({
    document_id: result.document.document_id,
    version_id: result.version.version_id,
    file_object_id: result.file_object.file_object_id,
    sha256: result.version.sha256,
    byte_size: result.file_object.byte_size,
    mime_type: result.file_object.mime_type,
  });
  const matterRuntime = {
    repository: createMatterRepository({
      seedRecords: [{
        model_type: "Matter",
        tenant_id: TENANT,
        matter_id: MATTER,
        matter_code: "VAULT/DESKTOP/EXPORT",
        matter_name: "Desktop Vault export",
        client_id: "client_desktop_vault_export",
        client_display_name: "Desktop Vault export client",
        title: "Desktop Vault export",
        status: "open",
        created_by: ACTOR,
        created_at: "2026-08-28T00:00:00.000Z",
        permission_envelope_id: "permission-desktop-vault-export",
        audit_trace_id: "audit-desktop-vault-export",
      }],
    }),
  };
  return {
    principal: { tenant_id: TENANT, user_id: ACTOR },
    context: {
      principal: { tenant_id: TENANT, user_id: ACTOR, role_ids: ["lawyer"] },
      rules: [
        { id: "allow-vault-download", effect: "allow", action: "vault:download:preflight" },
        { id: "allow-dms-read", effect: "allow", action: "dms:document:read" },
      ],
      object_acl: [],
    },
    sessionAuth: {
      async resolveVaultCapabilities() {
        return {
          authoritative: true,
          capabilities: [
            {
              id: "download",
              allowed: capabilityAllowed,
              safe_reason_code: capabilityAllowed ? null : "VAULT_CAPABILITY_DENIED",
            },
            {
              id: "attach",
              allowed: attachAllowed,
              safe_reason_code: attachAllowed ? null : "VAULT_ATTACH_CAPABILITY_DENIED",
            },
          ],
        };
      },
    },
    matterRuntime,
    dmsRuntime: { repository },
    provider: createTestAmicVaultExportProvider({
      repository,
      storage,
      tenantId: TENANT,
      actorId: ACTOR,
      now,
    }),
    repository,
    exact,
    now,
  };
}

function authorizeInput(state, overrides = {}) {
  return {
    body: {
      matter_id: MATTER,
      exact_version: state.exact,
      request_nonce_sha256: "5".repeat(64),
      ...(overrides.body ?? {}),
    },
    principal: state.principal,
    context: state.context,
    requestId: "request-desktop-export-authorize",
    sessionAuth: state.sessionAuth,
    matterRuntime: state.matterRuntime,
    dmsRuntime: state.dmsRuntime,
    vaultExportProvider: state.provider,
    now: state.now,
    ...Object.fromEntries(Object.entries(overrides).filter(([key]) => key !== "body")),
  };
}

test("desktop exact export preflights without a provider grant, then returns verified binary and completes only after host delivery", async () => {
  const state = harness();
  const preflight = await handleDesktopVaultExportPreflight({
    body: { matter_id: MATTER, exact_version: state.exact },
    principal: state.principal,
    context: state.context,
    requestId: "request-desktop-export-preflight",
    sessionAuth: state.sessionAuth,
    matterRuntime: state.matterRuntime,
  });
  assert.equal(preflight.status, 200);
  assert.equal(preflight.body.outcome, "preflight_passed");
  assert.equal(preflight.body.provider_authority_checked, false);
  assert.equal(preflight.body.provider_grant_created, false);
  assert.equal(state.provider.calls.length, 0);
  const authorized = await handleDesktopVaultExportAuthorize(authorizeInput(state));
  assert.equal(authorized.status, 200);
  assert.equal(authorized.body.outcome, "export_authorized");
  assert.equal(authorized.body.delivery_grant_returned, false);

  const downloaded = await handleDesktopVaultExportDownload({
    body: { operation_id: authorized.body.operation_id },
    headers: { "idempotency-key": authorized.body.operation_id },
    principal: state.principal,
    context: state.context,
    requestId: "request-desktop-export-download",
    sessionAuth: state.sessionAuth,
    matterRuntime: state.matterRuntime,
    dmsRuntime: state.dmsRuntime,
    vaultExportProvider: state.provider,
    now: state.now,
  });
  assert.equal(downloaded.status, 200);
  assert.equal(Buffer.isBuffer(downloaded.body), true);
  assert.deepEqual(downloaded.body, BYTES);
  assert.equal(downloaded.attachment_name, "desktop-exact.pdf");
  assert.equal(downloaded.exact_version.sha256, createHash("sha256").update(BYTES).digest("hex"));
  assert.equal(downloaded.public_response.receipt.stage, "downloaded");
  const completed = await handleDesktopVaultExportComplete({
    body: {
      operation_id: authorized.body.operation_id,
      exact_version: state.exact,
    },
    headers: { "idempotency-key": authorized.body.operation_id },
    principal: state.principal,
    context: state.context,
    requestId: "request-desktop-export-complete",
    sessionAuth: state.sessionAuth,
    matterRuntime: state.matterRuntime,
    dmsRuntime: state.dmsRuntime,
    now: state.now,
  });
  assert.equal(completed.status, 200);
  assert.equal(completed.body.receipt.stage, "delivered");
  const completionReplay = await handleDesktopVaultExportComplete({
    body: {
      operation_id: authorized.body.operation_id,
      exact_version: state.exact,
    },
    headers: { "idempotency-key": authorized.body.operation_id },
    principal: state.principal,
    context: state.context,
    requestId: "request-desktop-export-complete-replay",
    sessionAuth: state.sessionAuth,
    matterRuntime: state.matterRuntime,
    dmsRuntime: state.dmsRuntime,
    now: state.now,
  });
  assert.equal(completionReplay.status, 200);
  assert.equal(completionReplay.body.receipt.receipt_id, completed.body.receipt.receipt_id);
  assert.deepEqual(
    state.repository.listAudit({ tenant_id: TENANT })
      .filter((event) => event.object_id === authorized.body.operation_id)
      .map((event) => event.after.stage),
    ["requested", "authorized", "downloaded", "delivered"],
  );
  assert.equal(JSON.stringify(authorized.body).includes("provider_export_ref"), false);
  assert.equal(JSON.stringify(downloaded.public_response).includes('"body"'), false);
});

test("Classic Outlook desktop export binds installation and compose hashes and completes only after host attachment", async () => {
  const state = harness();
  const installationRefSha256 = "6".repeat(64);
  const composeTargetSha256 = "7".repeat(64);
  const authorized = await handleDesktopVaultExportAuthorize(authorizeInput(state, {
    body: {
      operation_kind: "attach_outlook",
      installation_ref_sha256: installationRefSha256,
      compose_target_sha256: composeTargetSha256,
    },
  }));
  assert.equal(authorized.status, 200);
  assert.equal(authorized.body.operation_kind, "attach_outlook");

  const downloaded = await handleDesktopVaultExportDownload({
    body: { operation_id: authorized.body.operation_id },
    headers: { "idempotency-key": authorized.body.operation_id },
    principal: state.principal,
    context: state.context,
    requestId: "request-desktop-outlook-download",
    sessionAuth: state.sessionAuth,
    matterRuntime: state.matterRuntime,
    dmsRuntime: state.dmsRuntime,
    vaultExportProvider: state.provider,
    now: state.now,
  });
  assert.equal(downloaded.status, 200);
  assert.deepEqual(downloaded.body, BYTES);

  const mismatched = await handleDesktopVaultExportComplete({
    body: {
      operation_id: authorized.body.operation_id,
      exact_version: state.exact,
      operation_kind: "attach_outlook",
      installation_ref_sha256: installationRefSha256,
      compose_target_sha256: "8".repeat(64),
    },
    headers: { "idempotency-key": authorized.body.operation_id },
    principal: state.principal,
    context: state.context,
    requestId: "request-desktop-outlook-complete-mismatch",
    sessionAuth: state.sessionAuth,
    matterRuntime: state.matterRuntime,
    dmsRuntime: state.dmsRuntime,
    now: state.now,
  });
  assert.equal(mismatched.status, 409);
  assert.deepEqual(mismatched.body.safe_error_codes, ["VAULT_DESKTOP_EXPORT_COMPLETION_INVALID"]);

  const completed = await handleDesktopVaultExportComplete({
    body: {
      operation_id: authorized.body.operation_id,
      exact_version: state.exact,
      operation_kind: "attach_outlook",
      installation_ref_sha256: installationRefSha256,
      compose_target_sha256: composeTargetSha256,
    },
    headers: { "idempotency-key": authorized.body.operation_id },
    principal: state.principal,
    context: state.context,
    requestId: "request-desktop-outlook-complete",
    sessionAuth: state.sessionAuth,
    matterRuntime: state.matterRuntime,
    dmsRuntime: state.dmsRuntime,
    now: state.now,
  });
  assert.equal(completed.status, 200);
  assert.equal(completed.body.outcome, "attached");
  assert.equal(completed.body.receipt.stage, "attached");
  assert.equal(completed.body.receipt.installation_ref_sha256, installationRefSha256);
  assert.equal(completed.body.receipt.compose_target_sha256, composeTargetSha256);
});

test("desktop export blocks missing capability, wrong idempotency header, and request authority smuggling before bytes", async () => {
  const denied = harness({ capabilityAllowed: false });
  const deniedAuthorization = await handleDesktopVaultExportAuthorize(authorizeInput(denied));
  assert.equal(deniedAuthorization.status, 403);
  assert.deepEqual(deniedAuthorization.body.safe_error_codes, ["VAULT_CAPABILITY_DENIED"]);
  assert.equal(denied.provider.calls.length, 0);

  const state = harness();
  const smuggled = await handleDesktopVaultExportAuthorize(authorizeInput(state, {
    body: { tenant_id: "renderer-selected-tenant" },
  }));
  assert.equal(smuggled.status, 400);
  assert.equal(state.provider.calls.length, 0);

  const authorized = await handleDesktopVaultExportAuthorize(authorizeInput(state));
  const wrongHeader = await handleDesktopVaultExportDownload({
    body: { operation_id: authorized.body.operation_id },
    headers: { "idempotency-key": "vaultop_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" },
    principal: state.principal,
    context: state.context,
    requestId: "request-desktop-export-wrong-idempotency",
    sessionAuth: state.sessionAuth,
    matterRuntime: state.matterRuntime,
    dmsRuntime: state.dmsRuntime,
    vaultExportProvider: state.provider,
    now: state.now,
  });
  assert.equal(wrongHeader.status, 409);
  assert.equal(state.provider.calls.filter(({ method }) => method === "downloadExactExport").length, 0);
});

test("desktop export path classifier admits only the four exact routes", () => {
  assert.equal(isDesktopVaultExportApiPath("/api/vault/desktop/export-preflight"), true);
  assert.equal(isDesktopVaultExportApiPath("/api/vault/desktop/export-authorize"), true);
  assert.equal(isDesktopVaultExportApiPath("/api/vault/desktop/export-download"), true);
  assert.equal(isDesktopVaultExportApiPath("/api/vault/desktop/export-complete"), true);
  assert.equal(isDesktopVaultExportApiPath("/api/vault/desktop/export-authorize/"), false);
  assert.equal(isDesktopVaultExportApiPath("/api/vault/desktop/export-download/child"), false);
});
