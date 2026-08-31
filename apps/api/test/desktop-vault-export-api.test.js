import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { uploadDocument } from "../../../packages/dms/src/document-service.js";
import { createDmsRepository } from "../../../packages/dms/src/repository.js";
import { createLocalStorageAdapter } from "../../../packages/dms/src/storage/local-storage-adapter.js";
import { createVaultDmsRuntimeContext } from "../src/vault-dms-runtime-context.js";
import { MATTER_VAULT_REGISTERED_TENANT_ID } from "../src/matter-vault-account-registry.js";
import { startApiServer } from "../src/server.js";
import { createTestAmicVaultExportProvider } from "./helpers/amic-vault-export-provider.js";
import { apiSessionHeaders } from "./helpers/session.js";

const TENANT = MATTER_VAULT_REGISTERED_TENANT_ID;
const ACTOR = "user_amic_jwsuh";
const MATTER_ID = "matter_rp05_amic_current_003";
const BYTES = Buffer.from("AMIC OS exact desktop export bytes\n");

function capabilityResolver(capabilities = {}) {
  return async () => ({
    authoritative: true,
    provider_state: "ready",
    tenant_binding_state: "bound",
    user_binding_state: "bound",
    authority_ref: "vault-capability-readback:desktop-export-test",
    capabilities: {
      read: true,
      upload: true,
      download: true,
      attach: true,
      work: true,
      governance: false,
      audit: true,
      ...capabilities,
    },
  });
}

function exportHarness() {
  const now = Date.now;
  const repository = createDmsRepository();
  const storage = createLocalStorageAdapter({ adapter_id: "desktop-export-http-test" });
  const uploaded = uploadDocument({
    repository,
    storage,
    document: {
      document_id: "document_desktop_export_http",
      tenant_id: TENANT,
      matter_id: `vault-${MATTER_ID}`,
      workspace_id: "workspace_desktop_export_http",
      folder_id: null,
      title: "Desktop exact export HTTP",
      filename: "contract-v3-계약.pdf",
      status: "active",
      current_version_id: "version_desktop_export_http_3",
      permission_envelope_id: "permission_desktop_export_http",
      audit_trace_id: "audit_desktop_export_http",
      mime_type: "application/pdf",
    },
    bytes: BYTES,
    actor_id: ACTOR,
    idempotency_key: "desktop-export-http-seed",
  });
  const exactVersion = Object.freeze({
    document_id: uploaded.document.document_id,
    version_id: uploaded.version.version_id,
    file_object_id: uploaded.file_object.file_object_id,
    sha256: uploaded.version.sha256,
    byte_size: uploaded.file_object.byte_size,
    mime_type: uploaded.file_object.mime_type,
  });
  return {
    repository,
    runtime: createVaultDmsRuntimeContext({ repository, storage }),
    provider: createTestAmicVaultExportProvider({
      repository,
      storage,
      tenantId: TENANT,
      actorId: ACTOR,
      now,
    }),
    exactVersion,
  };
}

async function withServer(options, callback) {
  const started = await startApiServer({ port: 0, ...options });
  try {
    return await callback(`http://${started.host}:${started.port}`);
  } finally {
    await new Promise((resolve) => started.server.close(resolve));
  }
}

async function authorize(baseUrl, headers, exactVersion, overrides = {}) {
  const response = await fetch(`${baseUrl}/api/vault/desktop/export-authorize`, {
    method: "POST",
    headers: { ...headers, "content-type": "application/json" },
    body: JSON.stringify({
      matter_id: MATTER_ID,
      exact_version: exactVersion,
      request_nonce_sha256: "8".repeat(64),
      ...overrides,
    }),
  });
  return { response, body: await response.json() };
}

async function preflight(baseUrl, headers, exactVersion) {
  const response = await fetch(`${baseUrl}/api/vault/desktop/export-preflight`, {
    method: "POST",
    headers: { ...headers, "content-type": "application/json" },
    body: JSON.stringify({ matter_id: MATTER_ID, exact_version: exactVersion }),
  });
  return { response, body: await response.json() };
}

async function download(baseUrl, headers, operationId) {
  return fetch(`${baseUrl}/api/vault/desktop/export-download`, {
    method: "POST",
    headers: {
      ...headers,
      "content-type": "application/json",
      "idempotency-key": operationId,
    },
    body: JSON.stringify({ operation_id: operationId }),
  });
}

async function complete(baseUrl, headers, operationId, exactVersion) {
  const response = await fetch(`${baseUrl}/api/vault/desktop/export-complete`, {
    method: "POST",
    headers: {
      ...headers,
      "content-type": "application/json",
      "idempotency-key": operationId,
    },
    body: JSON.stringify({
      operation_id: operationId,
      exact_version: exactVersion,
    }),
  });
  return { response, body: await response.json() };
}

test("desktop Vault HTTP exports one exact version as authenticated binary and completes only after host acknowledgement", async () => {
  const harness = exportHarness();
  await withServer({
    dmsRuntime: harness.runtime,
    vaultCapabilityResolver: capabilityResolver(),
    vaultExportProvider: harness.provider,
  }, async (baseUrl) => {
    const headers = await apiSessionHeaders(baseUrl);
    const checked = await preflight(baseUrl, headers, harness.exactVersion);
    assert.equal(checked.response.status, 200);
    assert.equal(checked.body.outcome, "preflight_passed");
    assert.equal(checked.body.provider_authority_checked, false);
    assert.equal(checked.body.provider_grant_created, false);
    assert.equal(harness.provider.calls.length, 0);
    const authorized = await authorize(baseUrl, headers, harness.exactVersion);
    assert.equal(authorized.response.status, 200, JSON.stringify(authorized.body));
    assert.equal(authorized.body.outcome, "export_authorized");
    assert.deepEqual(authorized.body.exact_version, harness.exactVersion);
    assert.equal(authorized.body.delivery_grant_returned, false);

    const downloaded = await download(baseUrl, headers, authorized.body.operation_id);
    assert.equal(downloaded.status, 200);
    assert.equal(downloaded.headers.get("content-type"), "application/pdf");
    assert.equal(downloaded.headers.get("cache-control"), "private, no-store");
    assert.equal(downloaded.headers.get("x-content-type-options"), "nosniff");
    assert.equal(downloaded.headers.get("x-amic-vault-operation-id"), authorized.body.operation_id);
    assert.equal(downloaded.headers.get("x-amic-vault-document-id"), harness.exactVersion.document_id);
    assert.equal(downloaded.headers.get("x-amic-vault-version-id"), harness.exactVersion.version_id);
    assert.equal(downloaded.headers.get("x-amic-vault-file-object-id"), harness.exactVersion.file_object_id);
    assert.equal(downloaded.headers.get("x-amic-vault-sha256"), harness.exactVersion.sha256);
    assert.equal(downloaded.headers.get("x-amic-vault-byte-size"), String(BYTES.byteLength));
    assert.match(downloaded.headers.get("content-disposition"), /filename\*=UTF-8''contract-v3-%EA%B3%84%EC%95%BD\.pdf/u);
    const body = Buffer.from(await downloaded.arrayBuffer());
    assert.deepEqual(body, BYTES);
    assert.equal(createHash("sha256").update(body).digest("hex"), harness.exactVersion.sha256);

    const stagesBeforeAcknowledgement = harness.repository.listAudit({ tenant_id: TENANT })
      .filter((event) => event.object_id === authorized.body.operation_id)
      .map((event) => event.after.stage);
    assert.deepEqual(stagesBeforeAcknowledgement, ["requested", "authorized", "downloaded"]);

    const completed = await complete(
      baseUrl,
      headers,
      authorized.body.operation_id,
      harness.exactVersion,
    );
    assert.equal(completed.response.status, 200);
    assert.equal(completed.body.outcome, "delivered");
    assert.equal(completed.body.receipt.stage, "delivered");

    const replay = await complete(
      baseUrl,
      headers,
      authorized.body.operation_id,
      harness.exactVersion,
    );
    assert.equal(replay.response.status, 200);
    assert.equal(replay.body.receipt.receipt_id, completed.body.receipt.receipt_id);

    const secondDownload = await download(baseUrl, headers, authorized.body.operation_id);
    assert.equal(secondDownload.status, 409);
    assert.deepEqual((await secondDownload.json()).safe_error_codes, ["VAULT_EXPORT_ALREADY_CONSUMED"]);
    assert.equal(
      harness.provider.calls.filter(({ method }) => method === "downloadExactExport").length,
      1,
    );
  });
});

test("desktop Vault HTTP exact export fails closed before provider bytes on absent authority, changed binding, or invalid transport", async () => {
  const missingProvider = exportHarness();
  await withServer({
    dmsRuntime: missingProvider.runtime,
    vaultCapabilityResolver: capabilityResolver(),
  }, async (baseUrl) => {
    const headers = await apiSessionHeaders(baseUrl);
    const checked = await preflight(baseUrl, headers, missingProvider.exactVersion);
    assert.equal(checked.response.status, 200);
    assert.equal(checked.body.provider_grant_created, false);
    const result = await authorize(baseUrl, headers, missingProvider.exactVersion);
    assert.equal(result.response.status, 503);
    assert.deepEqual(result.body.safe_error_codes, ["VAULT_EXPORT_PROVIDER_UNAVAILABLE"]);
    assert.equal(
      missingProvider.repository.listAudit({ tenant_id: TENANT })
        .some((event) => String(event.object_id ?? "").startsWith("vaultop_")),
      false,
    );
  });

  const denied = exportHarness();
  await withServer({
    dmsRuntime: denied.runtime,
    vaultCapabilityResolver: capabilityResolver({ download: false }),
    vaultExportProvider: denied.provider,
  }, async (baseUrl) => {
    const headers = await apiSessionHeaders(baseUrl);
    const authorityDenied = await authorize(baseUrl, headers, denied.exactVersion);
    assert.equal(authorityDenied.response.status, 403);
    assert.equal(denied.provider.calls.length, 0);

    const wrongType = await fetch(`${baseUrl}/api/vault/desktop/export-authorize`, {
      method: "POST",
      headers: { ...headers, "content-type": "text/plain" },
      body: "not-json",
    });
    assert.equal(wrongType.status, 415);
    assert.deepEqual((await wrongType.json()).safe_error_codes, ["VAULT_DESKTOP_CONTENT_TYPE_INVALID"]);

    const querySmuggling = await fetch(`${baseUrl}/api/vault/desktop/export-authorize?tenant_id=renderer`, {
      method: "POST",
      headers: { ...headers, "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    assert.equal(querySmuggling.status, 400);
    assert.deepEqual((await querySmuggling.json()).safe_error_codes, ["VAULT_DESKTOP_EXPORT_REQUEST_INVALID"]);
  });
});
