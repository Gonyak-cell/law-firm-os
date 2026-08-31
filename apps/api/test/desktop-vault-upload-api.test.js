import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import http from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { createDmsRepository } from "../../../packages/dms/src/repository.js";
import { createLocalStorageAdapter } from "../../../packages/dms/src/storage/local-storage-adapter.js";
import { createFileStorageAdapter } from "../../../packages/dms/src/storage/file-storage-adapter.js";
import { createVaultDmsRuntimeContext } from "../src/vault-dms-runtime-context.js";
import { MATTER_VAULT_REGISTERED_TENANT_ID } from "../src/matter-vault-account-registry.js";
import { startApiServer } from "../src/server.js";
import { createVaultOperationOwner } from "../src/vault-operation-owner.js";
import {
  AMIC_VAULT_HTTP_UPLOAD_PROVIDER_PATHS,
  LAWOS_AMIC_VAULT_UPLOAD_PROVIDER_ENABLED_ENV,
  LAWOS_AMIC_VAULT_UPLOAD_PROVIDER_ORIGIN_ENV,
  LAWOS_AMIC_VAULT_UPLOAD_PROVIDER_TOKEN_ENV,
} from "../src/amic-vault-http-upload-provider.js";
import {
  AMIC_OS_VAULT_ACCOUNT_LEDGER_HEADER,
  AMIC_OS_VAULT_PROVIDER_TOKEN_HEADER,
} from "../src/amic-vault-http-export-provider.js";
import { createTestAmicVaultUploadProvider } from "./helpers/amic-vault-upload-provider.js";
import { apiSessionHeaders, registeredAccount } from "./helpers/session.js";

const TENANT = MATTER_VAULT_REGISTERED_TENANT_ID;
const MATTER_ID = "matter_rp05_amic_current_003";
const WORKSPACE_ID = "workspace_desktop_upload_test";

function capabilityResolver(capabilities = {}) {
  return async () => ({
    authoritative: true,
    provider_state: "ready",
    tenant_binding_state: "bound",
    user_binding_state: "bound",
    authority_ref: "vault-capability-readback:test-revision-1",
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

function dmsHarness({ readbackStates } = {}) {
  const repository = createDmsRepository({
    seedRecords: [{
      model_type: "DmsWorkspace",
      workspace_id: WORKSPACE_ID,
      tenant_id: TENANT,
      matter_id: MATTER_ID,
      name: "Desktop upload test workspace",
      status: "active",
      permission_envelope_id: "perm_desktop_upload_test",
      audit_trace_id: "audit_desktop_upload_test",
      owner_user_id: "user_amic_jwsuh",
    }],
  });
  const storage = createLocalStorageAdapter({ adapter_id: "desktop-upload-test" });
  const runtime = createVaultDmsRuntimeContext({ repository, storage });
  return {
    repository,
    storage,
    runtime,
    provider: createTestAmicVaultUploadProvider({
      repository,
      storage,
      tenantId: TENANT,
      readbackStates,
    }),
  };
}

async function withServer(callback, options = {}) {
  const started = await startApiServer({ port: 0, ...options });
  try {
    return await callback(`http://${started.host}:${started.port}`);
  } finally {
    await new Promise((resolve) => started.server.close(resolve));
  }
}

async function preflight(baseUrl, headers, overrides = {}) {
  const response = await fetch(`${baseUrl}/api/vault/desktop/upload-preflight`, {
    method: "POST",
    headers: { ...headers, "content-type": "application/json" },
    body: JSON.stringify({
      matter_id: MATTER_ID,
      workspace_id: WORKSPACE_ID,
      folder_id: null,
      ...overrides,
    }),
  });
  return { response, body: await response.json() };
}

async function directPreflight(baseUrl, headers, overrides = {}) {
  const response = await fetch(`${baseUrl}/api/vault/desktop/upload-preflight`, {
    method: "POST",
    headers: {
      ...headers,
      "content-type": "application/json",
      "x-amic-vault-upload-transport": "s3-presigned-put-v1",
    },
    body: JSON.stringify({
      matter_id: MATTER_ID,
      workspace_id: WORKSPACE_ID,
      folder_id: null,
      ...overrides,
    }),
  });
  return { response, body: await response.json() };
}

async function prepareDirectUpload(baseUrl, headers, operationId, file) {
  const response = await fetch(`${baseUrl}/api/vault/desktop/upload-transfer`, {
    method: "POST",
    headers: {
      ...headers,
      "content-type": "application/json",
      "idempotency-key": operationId,
    },
    body: JSON.stringify({ operation_id: operationId, file }),
  });
  return { response, body: await response.json() };
}

async function completeDirectUpload(baseUrl, headers, operationId, file) {
  const response = await fetch(`${baseUrl}/api/vault/desktop/upload`, {
    method: "POST",
    headers: {
      ...headers,
      "content-type": "application/json",
      "idempotency-key": operationId,
    },
    body: JSON.stringify({ operation_id: operationId, file }),
  });
  return { response, body: await response.json() };
}

async function upload(baseUrl, headers, operationId, text) {
  const form = new FormData();
  form.set("operation_id", operationId);
  form.set("file", new Blob([text], { type: "text/plain" }), "vault-note.txt");
  const response = await fetch(`${baseUrl}/api/vault/desktop/upload`, {
    method: "POST",
    headers: { ...headers, "idempotency-key": operationId },
    body: form,
  });
  return { response, body: await response.json() };
}

async function uploadStatus(baseUrl, headers, operationId) {
  const response = await fetch(`${baseUrl}/api/vault/desktop/upload-status`, {
    method: "POST",
    headers: {
      ...headers,
      "content-type": "application/json",
      "idempotency-key": operationId,
    },
    body: JSON.stringify({ operation_id: operationId }),
  });
  return { response, body: await response.json() };
}

test("desktop Vault preflight and multipart upload commit one exact version with provider readback", async () => {
  const harness = dmsHarness();
  await withServer(async (baseUrl) => {
    const headers = await apiSessionHeaders(baseUrl);
    const approved = await preflight(baseUrl, headers);
    assert.equal(approved.response.status, 200);
    assert.equal(approved.body.outcome, "preflight_passed");
    assert.equal(approved.body.item.permission_checked, true);
    assert.equal(approved.body.item.ethical_wall_clear, true);
    assert.equal(approved.body.item.records_gate_clear, true);
    assert.equal(approved.body.item.dlp_gate_clear, false);
    assert.equal(approved.body.item.dlp_ingress_deferred, true);
    assert.equal(approved.body.item.dlp_egress_authorized, false);
    assert.equal(approved.body.item.vault_document_write_enabled, true);
    assert.match(approved.body.operation_id, /^vaultop_[a-f0-9]{32}$/u);
    assert.equal(approved.body.item.receipt.stage, "authorized");

    const text = "AMIC OS desktop Vault upload\n";
    const expectedSha256 = createHash("sha256").update(text).digest("hex");
    const committed = await upload(baseUrl, headers, approved.body.operation_id, text);
    assert.equal(committed.response.status, 201);
    assert.equal(committed.body.outcome, "readback_verified");
    assert.equal(committed.body.item.sha256, expectedSha256);
    assert.equal(committed.body.item.byte_size, Buffer.byteLength(text));
    assert.equal(committed.body.item.mime_type, "text/plain");
    assert.equal(committed.body.item.receipt.stage, "readback_verified");
    assert.equal(committed.body.item.receipt.exact_version.sha256, expectedSha256);
    assert.equal(committed.body.item.exact_readback_verified, true);
    assert.equal(committed.body.item.raw_path_included, false);
    assert.equal(committed.body.item.raw_bytes_included, false);

    const documents = harness.repository.list({ tenant_id: TENANT, model_type: "DmsDocument" });
    const versions = harness.repository.list({ tenant_id: TENANT, model_type: "DmsDocumentVersion" });
    const objects = harness.repository.list({ tenant_id: TENANT, model_type: "DmsFileObject" });
    assert.equal(documents.length, 1);
    assert.equal(versions.length, 1);
    assert.equal(objects.length, 1);
    assert.equal(documents[0].current_version_id, committed.body.item.version_id);
    assert.equal(versions[0].sha256, expectedSha256);
    assert.equal(objects[0].sha256, expectedSha256);
    assert.equal(harness.storage.digestObject({ tenant_id: TENANT, object_id: objects[0].vault_object_id }).sha256, expectedSha256);

    const auditStages = harness.repository.listAudit({ tenant_id: TENANT })
      .filter((event) => event.object_id === approved.body.operation_id)
      .map((event) => event.after?.stage ?? (event.after?.exact_version ? event.action.split(".").at(-1) : null));
    for (const stage of [
      "requested",
      "authorized",
      "transferring",
      "quarantined",
      "scanning",
      "promoted",
      "readback_verified",
    ]) {
      assert.ok(auditStages.includes(stage), stage);
    }

    const serialized = JSON.stringify({ approved: approved.body, committed: committed.body });
    assert.equal(serialized.includes("session_token"), false);
    assert.equal(serialized.includes('"idempotency_key":'), false);
    assert.equal(serialized.includes('"tenant_id":'), false);
    assert.equal(serialized.includes('"actor_id":'), false);
    assert.equal(serialized.includes("content_base64"), false);
    assert.deepEqual(
      harness.provider.calls.map((call) => call.method),
      ["preflightUpload", "commitUpload", "readbackUpload"],
    );
    assert.equal(Buffer.isBuffer(harness.provider.calls[1].input.file.bytes), true);
    assert.equal("session_token" in harness.provider.calls[1].input, false);
  }, {
    dmsRuntime: harness.runtime,
    vaultCapabilityResolver: capabilityResolver(),
    vaultUploadProvider: harness.provider,
  });
});

test("desktop Vault direct upload keeps bytes out of Lambda and completes from the bound staging object", async () => {
  const harness = dmsHarness();
  await withServer(async (baseUrl) => {
    const headers = await apiSessionHeaders(baseUrl);
    const approved = await directPreflight(baseUrl, headers);
    assert.equal(approved.response.status, 200);
    assert.equal(approved.body.max_upload_bytes, 1024 * 1024 * 1024);

    const bytes = Buffer.from("direct staged Vault bytes\n");
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const file = {
      filename: "direct-note.txt",
      mime_type: "text/plain",
      byte_size: bytes.byteLength,
    };
    const prepared = await prepareDirectUpload(
      baseUrl,
      headers,
      approved.body.operation_id,
      file,
    );
    assert.equal(prepared.response.status, 200);
    assert.equal(prepared.body.outcome, "transfer_ready");
    assert.equal(prepared.body.transfer.file.byte_size, bytes.byteLength);
    assert.equal(prepared.body.transfer.required_headers["content-length"], String(bytes.byteLength));
    await harness.provider.acceptStagedUpload({
      transferRef: prepared.body.transfer.transfer_ref,
      bytes,
    });

    const committed = await completeDirectUpload(
      baseUrl,
      headers,
      approved.body.operation_id,
      { ...file, sha256 },
    );
    assert.equal(committed.response.status, 201);
    assert.equal(committed.body.outcome, "readback_verified");
    assert.equal(committed.body.item.sha256, sha256);
    assert.equal(committed.body.item.byte_size, bytes.byteLength);
    assert.equal(committed.body.item.exact_readback_verified, true);
    assert.equal(JSON.stringify(committed.body).includes(bytes.toString("base64")), false);
    assert.deepEqual(harness.provider.calls.map(({ method }) => method), [
      "preflightUpload",
      "prepareStagedUpload",
      "completeStagedUpload",
      "readbackUpload",
    ]);
  }, {
    dmsRuntime: harness.runtime,
    vaultCapabilityResolver: capabilityResolver(),
    vaultUploadProvider: harness.provider,
  });
});

test("desktop Vault direct transfer accepts exactly 1 GiB metadata and rejects one byte more", async () => {
  const harness = dmsHarness();
  const oneGiB = 1024 * 1024 * 1024;
  await withServer(async (baseUrl) => {
    const headers = await apiSessionHeaders(baseUrl);
    const exactOperation = await directPreflight(baseUrl, headers);
    const exact = await prepareDirectUpload(baseUrl, headers, exactOperation.body.operation_id, {
      filename: "one-gib.txt",
      mime_type: "text/plain",
      byte_size: oneGiB,
    });
    assert.equal(exact.response.status, 200);
    assert.equal(exact.body.transfer.file.byte_size, oneGiB);
    assert.equal(exact.body.transfer.required_headers["content-length"], String(oneGiB));

    const oversizedOperation = await directPreflight(baseUrl, headers);
    const oversized = await prepareDirectUpload(baseUrl, headers, oversizedOperation.body.operation_id, {
      filename: "too-large.txt",
      mime_type: "text/plain",
      byte_size: oneGiB + 1,
    });
    assert.equal(oversized.response.status, 413);
    assert.deepEqual(oversized.body.safe_error_codes, ["VAULT_DESKTOP_FILE_TOO_LARGE"]);
    assert.equal(
      harness.provider.calls.filter(({ method }) => method === "prepareStagedUpload").length,
      1,
    );
  }, {
    dmsRuntime: harness.runtime,
    vaultCapabilityResolver: capabilityResolver(),
    vaultUploadProvider: harness.provider,
  });
});

test("concurrent desktop uploads share one provider commit, exact version, and audit chain", async () => {
  const harness = dmsHarness();
  const operationOwner = createVaultOperationOwner({ repository: harness.repository });
  let operationOwnerCalls = 0;
  let releaseCommit;
  let markCommitEntered;
  const commitEntered = new Promise((resolve) => { markCommitEntered = resolve; });
  const commitRelease = new Promise((resolve) => { releaseCommit = resolve; });
  const provider = Object.freeze({
    authority_kind: harness.provider.authority_kind,
    calls: harness.provider.calls,
    preflightUpload: (input) => harness.provider.preflightUpload(input),
    async commitUpload(input) {
      markCommitEntered();
      await commitRelease;
      return harness.provider.commitUpload(input);
    },
    readbackUpload: (input) => harness.provider.readbackUpload(input),
  });
  const runtime = Object.freeze({
    ...harness.runtime,
    operation_owner: Object.freeze({
      run(input) {
        operationOwnerCalls += 1;
        return operationOwner.run(input);
      },
    }),
  });

  await withServer(async (baseUrl) => {
    const headers = await apiSessionHeaders(baseUrl);
    const approved = await preflight(baseUrl, headers);
    const operationId = approved.body.operation_id;
    const first = upload(baseUrl, headers, operationId, "concurrent stable bytes\n");
    await commitEntered;
    const second = upload(baseUrl, headers, operationId, "concurrent stable bytes\n");
    const joinDeadline = Date.now() + 1_000;
    while (operationOwnerCalls < 2 && Date.now() < joinDeadline) {
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    assert.equal(operationOwnerCalls, 2);
    assert.equal(operationOwner.inFlightCountForTest(), 1);
    releaseCommit();

    const [firstResult, secondResult] = await Promise.all([first, second]);
    assert.equal(firstResult.response.status, 201);
    assert.equal(secondResult.response.status, 201);
    assert.deepEqual(secondResult.body.item.receipt, firstResult.body.item.receipt);
    assert.equal(
      harness.provider.calls.filter(({ method }) => method === "commitUpload").length,
      1,
    );
    assert.equal(
      harness.provider.calls.filter(({ method }) => method === "readbackUpload").length,
      1,
    );
    assert.equal(
      harness.repository.list({ tenant_id: TENANT, model_type: "DmsDocument" }).length,
      1,
    );
    assert.equal(
      harness.repository.list({ tenant_id: TENANT, model_type: "DmsDocumentVersion" }).length,
      1,
    );
    const auditStages = harness.repository.listAudit({ tenant_id: TENANT })
      .filter((event) => event.object_id === operationId)
      .map((event) => event.after?.stage ?? null);
    for (const stage of [
      "requested",
      "authorized",
      "transferring",
      "quarantined",
      "scanning",
      "promoted",
      "readback_verified",
    ]) {
      assert.equal(auditStages.filter((value) => value === stage).length, 1, stage);
    }
  }, {
    dmsRuntime: runtime,
    vaultCapabilityResolver: capabilityResolver(),
    vaultUploadProvider: provider,
  });
});

test("desktop quarantine continuation polls status without a second multipart byte transfer", async () => {
  const harness = dmsHarness({
    readbackStates: ["scanning", "promoted", "readback_verified"],
  });
  await withServer(async (baseUrl) => {
    const headers = await apiSessionHeaders(baseUrl);
    const approved = await preflight(baseUrl, headers);
    const pending = await upload(baseUrl, headers, approved.body.operation_id, "async quarantine bytes\n");
    assert.equal(pending.response.status, 202);
    assert.equal(pending.body.outcome, "processing");
    assert.equal(pending.body.item.stage, "scanning");
    assert.equal(pending.body.item.receipt.exact_version, null);

    const promoted = await uploadStatus(baseUrl, headers, approved.body.operation_id);
    assert.equal(promoted.response.status, 202);
    assert.equal(promoted.body.item.stage, "promoted");
    assert.match(promoted.body.item.receipt.exact_version.version_id, /^version_/u);

    const completed = await uploadStatus(baseUrl, headers, approved.body.operation_id);
    assert.equal(completed.response.status, 201);
    assert.equal(completed.body.outcome, "readback_verified");
    assert.equal(completed.body.item.exact_readback_verified, true);

    const replay = await uploadStatus(baseUrl, headers, approved.body.operation_id);
    assert.equal(replay.response.status, 200);
    assert.equal(replay.body.outcome, "idempotent_replay");
    assert.equal(replay.body.item.receipt.receipt_id, completed.body.item.receipt.receipt_id);
    assert.equal(harness.provider.calls.filter(({ method }) => method === "commitUpload").length, 1);
    assert.equal(harness.provider.calls.filter(({ method }) => method === "readbackUpload").length, 3);
    for (const call of harness.provider.calls.filter(({ method }) => method === "readbackUpload")) {
      assert.equal("file" in call.input, false);
      assert.equal(JSON.stringify(call.input).includes("async quarantine bytes"), false);
    }
  }, {
    dmsRuntime: harness.runtime,
    vaultCapabilityResolver: capabilityResolver(),
    vaultUploadProvider: harness.provider,
  });
});

test("desktop Vault startup resolves the default-off HTTP upload provider only from sealed server environment", async () => {
  const workloadToken = "vault-upload-startup-resolver-test-token-0123456789";
  const calls = [];
  const providerServer = http.createServer(async (request, response) => {
    const chunks = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    calls.push({
      path: request.url,
      token: request.headers[AMIC_OS_VAULT_PROVIDER_TOKEN_HEADER],
      account_ledger_id: request.headers[AMIC_OS_VAULT_ACCOUNT_LEDGER_HEADER],
      body,
    });
    if (request.url === AMIC_VAULT_HTTP_UPLOAD_PROVIDER_PATHS.capabilities) {
      response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({
        authoritative: true,
        provider_state: "ready",
        tenant_binding_state: "bound",
        user_binding_state: "bound",
        authority_ref: "amic-vault-api:single-install",
        capabilities: {
          read: true,
          upload: true,
          download: true,
          attach: true,
          work: false,
          governance: false,
          audit: false,
        },
      }));
      return;
    }
    response.writeHead(201, { "content-type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({
      authority_kind: "amic-vault-api",
      authority_ref: "amic-vault-api:startup-resolver",
      provider_revision: "amic-vault-source:upload-provider-contract",
      preflight_ref: `vault-preflight:${body.operation_id}`,
      expires_at: new Date(Date.now() + 60_000).toISOString(),
      resolved: {
        vault_tenant_id: "tenant-vault-startup",
        vault_actor_id: "actor-vault-startup",
        vault_matter_id: `vault-${body.lawos_matter_id}`,
        vault_workspace_id: body.requested_workspace_id,
        vault_folder_id: body.requested_folder_id,
      },
      decisions: {
        permission: { effect: "allow", decision_ref: `vault-permission:${body.operation_id}` },
        ethical_wall: { effect: "allow", decision_ref: `vault-wall:${body.operation_id}` },
        records: { effect: "allow", decision_ref: `vault-records:${body.operation_id}` },
        dlp: { effect: "allow", decision_ref: `vault-dlp:${body.operation_id}` },
      },
      audit: {
        event_id: `vault-preflight-audit:${body.operation_id}`,
        correlation_id: body.correlation_id,
      },
    }));
  });
  await new Promise((resolve, reject) => {
    providerServer.once("error", reject);
    providerServer.listen(0, "127.0.0.1", resolve);
  });
  const providerPort = providerServer.address().port;
  const harness = dmsHarness();
  try {
    await withServer(async (baseUrl) => {
      const headers = await apiSessionHeaders(baseUrl);
      const approved = await preflight(baseUrl, headers);
      assert.equal(approved.response.status, 200);
      assert.equal(approved.body.outcome, "preflight_passed");
      assert.equal(approved.body.item.provider_authority_verified, true);
    }, {
      dmsRuntime: harness.runtime,
      persistenceAuthorityEnv: {
        [LAWOS_AMIC_VAULT_UPLOAD_PROVIDER_ENABLED_ENV]: "true",
        [LAWOS_AMIC_VAULT_UPLOAD_PROVIDER_ORIGIN_ENV]: `http://127.0.0.1:${providerPort}`,
        [LAWOS_AMIC_VAULT_UPLOAD_PROVIDER_TOKEN_ENV]: workloadToken,
      },
    });
  } finally {
    await new Promise((resolve) => providerServer.close(resolve));
  }
  assert.equal(calls.length, 2);
  assert.equal(calls[0].path, AMIC_VAULT_HTTP_UPLOAD_PROVIDER_PATHS.capabilities);
  assert.equal(calls[1].path, AMIC_VAULT_HTTP_UPLOAD_PROVIDER_PATHS.preflight);
  for (const call of calls) {
    assert.equal(call.token, workloadToken);
    assert.equal(call.account_ledger_id, "user_amic_jwsuh");
  }
  assert.equal(calls[0].body.principal.user_id, "user_amic_jwsuh");
  assert.equal(calls[1].body.lawos_matter_id, MATTER_ID);
  assert.equal(JSON.stringify(calls.map(({ body }) => body)).includes(workloadToken), false);
});

test("desktop Vault upload replay returns the identical exact receipt and changed bytes conflict", async () => {
  const harness = dmsHarness();
  await withServer(async (baseUrl) => {
    const headers = await apiSessionHeaders(baseUrl);
    const approved = await preflight(baseUrl, headers);
    const first = await upload(baseUrl, headers, approved.body.operation_id, "stable bytes\n");
    const replay = await upload(baseUrl, headers, approved.body.operation_id, "stable bytes\n");
    assert.equal(first.response.status, 201);
    assert.equal(replay.response.status, 200);
    assert.equal(replay.body.outcome, "idempotent_replay");
    assert.equal(replay.body.item.receipt.receipt_id, first.body.item.receipt.receipt_id);
    assert.equal(harness.repository.list({ tenant_id: TENANT, model_type: "DmsDocument" }).length, 1);
    assert.equal(harness.repository.list({ tenant_id: TENANT, model_type: "DmsDocumentVersion" }).length, 1);

    const changed = await upload(baseUrl, headers, approved.body.operation_id, "changed bytes\n");
    assert.equal(changed.response.status, 409);
    assert.deepEqual(changed.body.safe_error_codes, ["VAULT_OPERATION_IDEMPOTENCY_CONFLICT"]);
    assert.equal(harness.repository.list({ tenant_id: TENANT, model_type: "DmsDocumentVersion" }).length, 1);
  }, {
    dmsRuntime: harness.runtime,
    vaultCapabilityResolver: capabilityResolver(),
    vaultUploadProvider: harness.provider,
  });
});

test("provider-backed AMIC OS retires both legacy direct-DMS write routes before body parsing or mutation", async () => {
  const harness = dmsHarness();
  await withServer(async (baseUrl) => {
    const headers = await apiSessionHeaders(baseUrl);
    for (const pathname of ["/api/vault/documents", "/api/vault/documents/upload"]) {
      const response = await fetch(`${baseUrl}${pathname}`, {
        method: "POST",
        headers: { ...headers, "content-type": "application/json" },
        body: JSON.stringify({
          tenant_id: TENANT,
          matter_id: MATTER_ID,
          bytes: "must-not-be-read",
        }),
      });
      assert.equal(response.status, 403);
      assert.deepEqual((await response.json()).safe_error_codes, [
        "VAULT_DIRECT_DMS_WRITE_RETIRED",
      ]);
    }
    assert.equal(
      harness.repository.list({ tenant_id: TENANT, model_type: "DmsDocument" }).length,
      0,
    );
    assert.equal(harness.provider.calls.length, 0);
  }, {
    dmsRuntime: harness.runtime,
    vaultCapabilityResolver: capabilityResolver(),
    vaultUploadProvider: harness.provider,
  });
});

test("provider-backed Vault browse and search bypass the LawOS DMS repository", async () => {
  const harness = dmsHarness();
  const calls = [];
  const exact = Object.freeze({
    document_id: "11111111-1111-4111-8111-111111111111",
    matter_id: MATTER_ID,
    title: "Vault authoritative contract",
    current_version_id: "22222222-2222-4222-8222-222222222222",
    version_id: "22222222-2222-4222-8222-222222222222",
    current_file_object_id: "33333333-3333-4333-8333-333333333333",
    file_object_id: "33333333-3333-4333-8333-333333333333",
    latest_sha256: "a".repeat(64),
    content_sha256: "a".repeat(64),
    current_byte_size: 4096,
    byte_size: 4096,
    current_mime_type: "application/pdf",
    mime_type: "application/pdf",
    filename: "vault-contract.pdf",
    indexed_at: null,
    match_fields: Object.freeze(["title"]),
  });
  const readResult = Object.freeze({
    authority_kind: "amic-vault-api",
    authority_ref: "amic-vault-api:single-install",
    provider_revision: "single-install-upload-v1",
    items: Object.freeze([exact]),
    page_info: Object.freeze({
      page: 1,
      page_size: 50,
      returned_count: 1,
      current_version_only: true,
      omitted_result_count: null,
    }),
    count_leak_prevented: true,
    raw_bytes_included: false,
    storage_locator_returned: false,
  });
  const provider = Object.freeze({
    async resolveCapabilities(input) {
      calls.push(["capabilities", input]);
      return capabilityResolver()();
    },
    async listDocuments(input) {
      calls.push(["list", input]);
      return readResult;
    },
    async searchDocuments(input) {
      calls.push(["search", input]);
      return readResult;
    },
  });

  await withServer(async (baseUrl) => {
    const headers = await apiSessionHeaders(baseUrl);
    const common = new URLSearchParams({
      tenant_id: TENANT,
      permission_ref: "legacy-provider-read-ignored",
      audit_hint_ref: "provider-read-integration",
    });
    const listedResponse = await fetch(`${baseUrl}/api/vault/documents?${common}`, { headers });
    const listed = await listedResponse.json();
    assert.equal(listedResponse.status, 200);
    assert.deepEqual(listed.items, [exact]);
    assert.equal(listed.local_dms_read_used, false);
    assert.equal(listed.provider_authority.authority_ref, "amic-vault-api:single-install");

    common.set("q", "Vault authoritative");
    common.set("current_version", "current");
    const searchedResponse = await fetch(`${baseUrl}/api/vault/search?${common}`, { headers });
    const searched = await searchedResponse.json();
    assert.equal(searchedResponse.status, 200);
    assert.deepEqual(searched.items, [exact]);
    assert.equal(searched.page_info.search_backend, "amic-vault-authoritative");
  }, {
    dmsRuntime: harness.runtime,
    vaultCapabilityResolver: capabilityResolver(),
    vaultUploadProvider: provider,
  });

  assert.deepEqual(calls.map(([kind]) => kind), [
    "capabilities",
    "list",
    "capabilities",
    "search",
  ]);
  assert.equal(harness.repository.list({ tenant_id: TENANT, model_type: "DmsDocument" }).length, 0);
});

test("desktop Vault preflight fails closed before picker when authority or scope is absent", async () => {
  for (const scenario of [
    { name: "authority", server: {}, account: undefined, code: "VAULT_AUTHORITY_UNAVAILABLE" },
    { name: "vault.write scope", server: { vaultCapabilityResolver: capabilityResolver() }, account: registeredAccount("yjlee@amic.kr"), code: "VAULT_SCOPE_NOT_GRANTED" },
    { name: "upload provider", server: { vaultCapabilityResolver: capabilityResolver() }, account: undefined, code: "VAULT_PROVIDER_UNAVAILABLE", status: 503 },
  ]) {
    const harness = dmsHarness();
    await withServer(async (baseUrl) => {
      const headers = await apiSessionHeaders(baseUrl, scenario.account);
      const denied = await preflight(baseUrl, headers);
      assert.equal(denied.response.status, scenario.status ?? 403, scenario.name);
      assert.deepEqual(denied.body.safe_error_codes, [scenario.code], scenario.name);
      assert.equal(harness.repository.snapshot().idempotency.length, 0, scenario.name);
      assert.equal(harness.repository.listAudit({ tenant_id: TENANT }).length, 0, scenario.name);
    }, { dmsRuntime: harness.runtime, ...scenario.server });
  }
});

test("desktop Vault upload rejects missing idempotency binding and MIME-signature mismatch", async () => {
  const harness = dmsHarness();
  await withServer(async (baseUrl) => {
    const headers = await apiSessionHeaders(baseUrl);
    const approved = await preflight(baseUrl, headers);
    const form = new FormData();
    form.set("operation_id", approved.body.operation_id);
    form.set("file", new Blob(["not a PDF"], { type: "application/pdf" }), "wrong.pdf");
    const missingHeader = await fetch(`${baseUrl}/api/vault/desktop/upload`, {
      method: "POST",
      headers,
      body: form,
    });
    assert.equal(missingHeader.status, 409);
    assert.deepEqual((await missingHeader.json()).safe_error_codes, ["VAULT_DESKTOP_IDEMPOTENCY_KEY_MISMATCH"]);

    const mismatch = await fetch(`${baseUrl}/api/vault/desktop/upload`, {
      method: "POST",
      headers: { ...headers, "idempotency-key": approved.body.operation_id },
      body: form,
    });
    assert.equal(mismatch.status, 415);
    assert.deepEqual((await mismatch.json()).safe_error_codes, ["VAULT_DESKTOP_FILE_SIGNATURE_MISMATCH"]);
    assert.equal(harness.repository.list({ tenant_id: TENANT, model_type: "DmsDocument" }).length, 0);
  }, {
    dmsRuntime: harness.runtime,
    vaultCapabilityResolver: capabilityResolver(),
    vaultUploadProvider: harness.provider,
  });
});

test("desktop Vault operation binding and exact replay survive API restart without a duplicate version", async () => {
  const root = mkdtempSync(join(tmpdir(), "lawos-desktop-vault-restart-"));
  const repositoryPath = join(root, "dms.json");
  const objectRoot = join(root, "objects");
  const seed = [{
    model_type: "DmsWorkspace",
    workspace_id: WORKSPACE_ID,
    tenant_id: TENANT,
    matter_id: MATTER_ID,
    name: "Desktop restart workspace",
    status: "active",
    permission_envelope_id: "perm_desktop_restart",
    audit_trace_id: "audit_desktop_restart",
    owner_user_id: "user_amic_jwsuh",
  }];
  const runtime = () => {
    const repository = createDmsRepository({ filePath: repositoryPath, seedRecords: seed });
    const storage = createFileStorageAdapter({ adapter_id: "desktop-restart", rootPath: objectRoot });
    return {
      repository,
      runtime: createVaultDmsRuntimeContext({ repository, storage }),
      provider: createTestAmicVaultUploadProvider({ repository, storage, tenantId: TENANT }),
    };
  };
  const sessionSecret = "desktop-vault-restart-session-secret";
  let firstRuntime;
  let secondRuntime;
  try {
    firstRuntime = runtime();
    let operationId;
    await withServer(async (baseUrl) => {
      const headers = await apiSessionHeaders(baseUrl);
      const approved = await preflight(baseUrl, headers);
      assert.equal(approved.response.status, 200);
      operationId = approved.body.operation_id;
    }, {
      dmsRuntime: firstRuntime.runtime,
      vaultCapabilityResolver: capabilityResolver(),
      vaultUploadProvider: firstRuntime.provider,
      sessionSecret,
    });
    firstRuntime.repository.close();

    secondRuntime = runtime();
    let receiptId;
    await withServer(async (baseUrl) => {
      const headers = await apiSessionHeaders(baseUrl);
      const committed = await upload(baseUrl, headers, operationId, "restart-stable bytes\n");
      assert.equal(committed.response.status, 201);
      receiptId = committed.body.item.receipt.receipt_id;
    }, {
      dmsRuntime: secondRuntime.runtime,
      vaultCapabilityResolver: capabilityResolver(),
      vaultUploadProvider: secondRuntime.provider,
      sessionSecret,
    });
    secondRuntime.repository.close();

    const thirdRuntime = runtime();
    try {
      await withServer(async (baseUrl) => {
        const headers = await apiSessionHeaders(baseUrl);
        const replay = await upload(baseUrl, headers, operationId, "restart-stable bytes\n");
        assert.equal(replay.response.status, 200);
        assert.equal(replay.body.outcome, "idempotent_replay");
        assert.equal(replay.body.item.receipt.receipt_id, receiptId);
        assert.equal(thirdRuntime.repository.list({ tenant_id: TENANT, model_type: "DmsDocument" }).length, 1);
        assert.equal(thirdRuntime.repository.list({ tenant_id: TENANT, model_type: "DmsDocumentVersion" }).length, 1);
      }, {
        dmsRuntime: thirdRuntime.runtime,
        vaultCapabilityResolver: capabilityResolver(),
        vaultUploadProvider: thirdRuntime.provider,
        sessionSecret,
      });
    } finally {
      thirdRuntime.repository.close();
    }
  } finally {
    if (firstRuntime) {
      try { firstRuntime.repository.close(); } catch { /* already closed */ }
    }
    if (secondRuntime) {
      try { secondRuntime.repository.close(); } catch { /* already closed */ }
    }
    rmSync(root, { recursive: true, force: true });
  }
});
