import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { uploadDocument } from "../../../packages/dms/src/document-service.js";
import {
  DMS_AUXILIARY_DOMAIN_DESCRIPTOR,
  createDmsAuxiliaryRepository,
} from "../../../packages/dms/src/central-ledger.js";
import { createDmsRepository } from "../../../packages/dms/src/repository.js";
import { createLocalStorageAdapter } from "../../../packages/dms/src/storage/local-storage-adapter.js";
import { createPostgresDomainLedger } from "../../../packages/persistence/src/postgres/domain-ledger.js";
import {
  decodeRecordDomainIdempotencyResponse,
  runRecordRepositoryDomainCommand,
} from "../../../packages/persistence/src/record-domain-adapter.js";
import { createMigratedPostgresFixture } from "../../../packages/persistence/test/helpers/disposable-postgres.js";
import {
  authorizeAmicVaultExactExport,
  completeAmicVaultExactExport,
  downloadAuthorizedAmicVaultExactExport,
  inspectAuthorizedAmicVaultExactExport,
  inspectDownloadedAmicVaultExactExport,
} from "../src/amic-vault-exact-export-runtime.js";
import { createTestAmicVaultExportProvider } from "./helpers/amic-vault-export-provider.js";

const TENANT = "tenant_vault_export_test";
const ACTOR = "user_vault_export_test";
const MATTER = "matter_vault_export_test";
const REQUEST_NONCE = "1".repeat(64);
const INSTALLATION = "2".repeat(64);
const COMPOSE = "3".repeat(64);
const CONTENT = Buffer.from("exact Vault version seven\n");

function harness() {
  let timestamp = Date.parse("2026-08-28T12:00:00.000Z");
  const now = () => timestamp;
  const repository = createDmsRepository();
  const storage = createLocalStorageAdapter({ adapter_id: "vault-export-test" });
  const documentId = "document_vault_export_test";
  const versionId = "version_vault_export_test_7";
  const result = uploadDocument({
    repository,
    storage,
    document: {
      document_id: documentId,
      tenant_id: TENANT,
      matter_id: `vault-${MATTER}`,
      workspace_id: "workspace_vault_export_test",
      folder_id: null,
      title: "Exact contract version seven",
      filename: "contract-v7.pdf",
      status: "active",
      current_version_id: versionId,
      permission_envelope_id: "permission_vault_export_test",
      audit_trace_id: "audit_vault_export_test",
      mime_type: "application/pdf",
    },
    bytes: CONTENT,
    actor_id: ACTOR,
    idempotency_key: "vault-export-document-seed",
  });
  const exactVersion = Object.freeze({
    document_id: result.document.document_id,
    version_id: result.version.version_id,
    file_object_id: result.file_object.file_object_id,
    sha256: result.version.sha256,
    byte_size: result.file_object.byte_size,
    mime_type: result.file_object.mime_type,
  });
  const provider = createTestAmicVaultExportProvider({
    repository,
    storage,
    tenantId: TENANT,
    actorId: ACTOR,
    now,
  });
  return {
    repository,
    storage,
    provider,
    exactVersion,
    now,
    advance(milliseconds) { timestamp += milliseconds; },
  };
}

function authorizationInput(state, overrides = {}) {
  return {
    principal: { tenant_id: TENANT, user_id: ACTOR },
    dmsRuntime: { repository: state.repository },
    vaultExportProvider: state.provider,
    operationKind: "export_exact_version",
    requestNonceSha256: REQUEST_NONCE,
    matterId: MATTER,
    exactVersion: state.exactVersion,
    requestId: "request-export-authorize",
    now: state.now,
    ...overrides,
  };
}

function createAppendOnlyDomainLedger() {
  const idempotency = [];
  const audit = [];
  const copy = (value) => structuredClone(value);
  const tx = {
    list: async () => [],
    listIdempotency: async () => copy(idempotency),
    listAudit: async () => copy(audit),
    addReferences: async () => {},
    claimIdempotency: async (entry) => {
      const existing = idempotency.find((candidate) => candidate.key === entry.key);
      if (existing) return { replayed: true, record: copy(existing) };
      idempotency.push(copy(entry));
      return { replayed: false, record: copy(entry) };
    },
    appendAudit: async (event) => audit.push(copy(event)),
    enqueueOutbox: async () => {},
  };
  return Object.freeze({
    list: tx.list,
    listIdempotency: tx.listIdempotency,
    listAudit: tx.listAudit,
    transaction: async (_scope, command) => command(tx),
  });
}

test("exact export authorizes, verifies provider bytes, consumes once, and records no bytes or provider grant in receipts", async () => {
  const state = harness();
  const authorized = await authorizeAmicVaultExactExport(authorizationInput(state));
  assert.equal(authorized.outcome, "export_authorized");
  assert.equal(authorized.receipt.stage, "authorized");
  assert.equal(authorized.attachment_name, "contract-v7.pdf");
  assert.deepEqual(authorized.exact_version, state.exactVersion);
  assert.equal(authorized.delivery_grant_returned, false);

  const delivered = await downloadAuthorizedAmicVaultExactExport({
    principal: { tenant_id: TENANT, user_id: ACTOR },
    dmsRuntime: { repository: state.repository },
    vaultExportProvider: state.provider,
    operationId: authorized.operation_id,
    requestId: "request-export-download",
    now: state.now,
  });
  assert.deepEqual(delivered.server_owned_bytes, CONTENT);
  assert.equal(delivered.public_response.outcome, "downloaded");
  assert.equal(delivered.public_response.receipt.stage, "downloaded");
  assert.equal(delivered.public_response.provider_consumption_verified, true);
  assert.equal(
    createHash("sha256").update(delivered.server_owned_bytes).digest("hex"),
    state.exactVersion.sha256,
  );
  const completed = completeAmicVaultExactExport({
    principal: { tenant_id: TENANT, user_id: ACTOR },
    dmsRuntime: { repository: state.repository },
    operationId: authorized.operation_id,
    completionStage: "delivered",
    expectedExactVersion: state.exactVersion,
    requestId: "request-export-delivered",
    now: state.now,
  });
  assert.equal(completed.outcome, "delivered");
  assert.equal(completed.receipt.stage, "delivered");
  const replay = completeAmicVaultExactExport({
    principal: { tenant_id: TENANT, user_id: ACTOR },
    dmsRuntime: { repository: state.repository },
    operationId: authorized.operation_id,
    completionStage: "delivered",
    expectedExactVersion: state.exactVersion,
    requestId: "request-export-delivered-replay",
    now: state.now,
  });
  assert.equal(replay.receipt.receipt_id, completed.receipt.receipt_id);
  assert.deepEqual(state.provider.calls.map(({ method }) => method), [
    "authorizeExactExport",
    "downloadExactExport",
    "readbackExactExport",
  ]);
  assert.deepEqual(
    state.provider.calls.map(({ input }) => input.lawos_matter_id),
    [MATTER, MATTER, MATTER],
  );
  assert.deepEqual(
    state.provider.calls.map(({ input }) => input.installation_ref_sha256),
    [null, null, null],
  );
  assert.deepEqual(
    state.provider.calls.map(({ input }) => input.compose_target_sha256),
    [null, null, null],
  );
  assert.deepEqual(
    state.repository.listAudit({ tenant_id: TENANT })
      .filter((event) => event.object_id === authorized.operation_id)
      .map((event) => event.after.stage),
    ["requested", "authorized", "downloaded", "delivered"],
  );
  const persistedStates = state.repository.snapshot().idempotency
    .filter((entry) => entry.operation === "amic_os_vault_exact_export_state");
  assert.deepEqual(
    persistedStates.map((entry) => entry.response.receipts.at(-1).stage),
    ["authorized", "downloaded", "delivered"],
  );
  assert.equal(new Set(persistedStates.map((entry) => entry.idempotency_key)).size, 3);
  assert.equal(
    persistedStates[0].idempotency_key,
    `amic-os-vault-export-state:${authorized.operation_id}`,
  );

  const serializedLedger = JSON.stringify(state.repository.snapshot());
  const serializedPublic = JSON.stringify({ authorized, response: delivered.public_response });
  assert.equal(serializedLedger.includes(CONTENT.toString("utf8").trim()), false);
  assert.equal(serializedLedger.includes('"body"'), false);
  assert.equal(serializedPublic.includes("provider_export_ref"), false);
  assert.equal(serializedPublic.includes('"server_owned_bytes"'), false);
});

test("exact export persists immutable stage snapshots across PostgreSQL-style unit-of-work restarts", async () => {
  const state = harness();
  const ledger = createAppendOnlyDomainLedger();
  const run = (command) => runRecordRepositoryDomainCommand({
    ledger,
    descriptor: DMS_AUXILIARY_DOMAIN_DESCRIPTOR,
    tenant_id: TENANT,
    create_repository: createDmsAuxiliaryRepository,
    command,
  });
  const authorized = (await run((repository) => authorizeAmicVaultExactExport({
    ...authorizationInput(state),
    dmsRuntime: { repository },
  }))).result;
  const downloaded = (await run((repository) => downloadAuthorizedAmicVaultExactExport({
    principal: { tenant_id: TENANT, user_id: ACTOR },
    dmsRuntime: { repository },
    vaultExportProvider: state.provider,
    operationId: authorized.operation_id,
    requestId: "request-export-postgres-download",
    now: state.now,
  }))).result;
  assert.deepEqual(downloaded.server_owned_bytes, CONTENT);
  const completed = (await run((repository) => completeAmicVaultExactExport({
    principal: { tenant_id: TENANT, user_id: ACTOR },
    dmsRuntime: { repository },
    operationId: authorized.operation_id,
    completionStage: "delivered",
    expectedExactVersion: state.exactVersion,
    requestId: "request-export-postgres-complete",
    now: state.now,
  }))).result;
  assert.equal(completed.receipt.stage, "delivered");
  const prefix = `amic-os-vault-export-state:${authorized.operation_id}`;
  assert.deepEqual(
    (await ledger.listIdempotency())
      .map((entry) => entry.key)
      .filter((key) => key.startsWith(prefix))
      .sort(),
    [prefix, `${prefix}:delivered`, `${prefix}:downloaded`].sort(),
  );
});

test("authorization is replayable only before consumption and provider download is never replayed", async () => {
  const state = harness();
  const first = await authorizeAmicVaultExactExport(authorizationInput(state));
  const replay = await authorizeAmicVaultExactExport(authorizationInput(state, {
    requestId: "request-export-authorize-replay",
  }));
  assert.equal(replay.outcome, "idempotent_authorization_replay");
  assert.equal(replay.operation_id, first.operation_id);
  assert.equal(state.provider.calls.filter(({ method }) => method === "authorizeExactExport").length, 1);

  await downloadAuthorizedAmicVaultExactExport({
    principal: { tenant_id: TENANT, user_id: ACTOR },
    dmsRuntime: { repository: state.repository },
    vaultExportProvider: state.provider,
    operationId: first.operation_id,
    requestId: "request-export-download-first",
    now: state.now,
  });
  await assert.rejects(
    authorizeAmicVaultExactExport(authorizationInput(state)),
    (error) => error.safe_error_code === "VAULT_EXPORT_ALREADY_CONSUMED",
  );
  await assert.rejects(
    downloadAuthorizedAmicVaultExactExport({
      principal: { tenant_id: TENANT, user_id: ACTOR },
      dmsRuntime: { repository: state.repository },
      vaultExportProvider: state.provider,
      operationId: first.operation_id,
      requestId: "request-export-download-replay",
      now: state.now,
    }),
    (error) => error.safe_error_code === "VAULT_EXPORT_ALREADY_CONSUMED",
  );
  assert.equal(state.provider.calls.filter(({ method }) => method === "downloadExactExport").length, 1);
});

test("same request nonce with changed exact material conflicts before a second provider authorization", async () => {
  const state = harness();
  await authorizeAmicVaultExactExport(authorizationInput(state));
  await assert.rejects(
    authorizeAmicVaultExactExport(authorizationInput(state, {
      exactVersion: { ...state.exactVersion, sha256: "f".repeat(64) },
    })),
    (error) => error.safe_error_code === "VAULT_OPERATION_IDEMPOTENCY_CONFLICT",
  );
  assert.equal(state.provider.calls.filter(({ method }) => method === "authorizeExactExport").length, 1);
});

test("missing provider and oversized exact version fail before export state or provider byte consumption", async () => {
  const missing = harness();
  await assert.rejects(
    authorizeAmicVaultExactExport(authorizationInput(missing, { vaultExportProvider: null })),
    (error) => error.safe_error_code === "VAULT_EXPORT_PROVIDER_UNAVAILABLE",
  );
  assert.equal(missing.repository.snapshot().idempotency.some((entry) => (
    entry.operation === "amic_os_vault_exact_export_state"
  )), false);

  const oversized = harness();
  const authorized = await authorizeAmicVaultExactExport(authorizationInput(oversized));
  await assert.rejects(
    downloadAuthorizedAmicVaultExactExport({
      principal: { tenant_id: TENANT, user_id: ACTOR },
      dmsRuntime: { repository: oversized.repository },
      vaultExportProvider: oversized.provider,
      operationId: authorized.operation_id,
      requestId: "request-export-too-small-bound",
      maxBytes: CONTENT.byteLength - 1,
      now: oversized.now,
    }),
    (error) => error.safe_error_code === "VAULT_EXPORT_SIZE_INVALID",
  );
  assert.equal(oversized.provider.calls.filter(({ method }) => method === "downloadExactExport").length, 0);
});

test("Outlook attachment export requires installation and compose hashes in the immutable operation binding", async () => {
  const state = harness();
  await assert.rejects(
    authorizeAmicVaultExactExport(authorizationInput(state, {
      operationKind: "attach_outlook",
      requestNonceSha256: "4".repeat(64),
    })),
    (error) => error.safe_error_code === "VAULT_OPERATION_EXACT_VERSION_REQUIRED",
  );
  const authorized = await authorizeAmicVaultExactExport(authorizationInput(state, {
    operationKind: "attach_outlook",
    requestNonceSha256: "4".repeat(64),
    installationRefSha256: INSTALLATION,
    composeTargetSha256: COMPOSE,
  }));
  assert.equal(authorized.receipt.installation_ref_sha256, INSTALLATION);
  assert.equal(authorized.receipt.compose_target_sha256, COMPOSE);
  assert.equal(authorized.receipt.operation_kind, "attach_outlook");
  assert.deepEqual(inspectAuthorizedAmicVaultExactExport({
    principal: { tenant_id: TENANT, user_id: ACTOR },
    dmsRuntime: { repository: state.repository },
    operationId: authorized.operation_id,
    now: state.now,
  }), {
    operation_id: authorized.operation_id,
    operation_kind: "attach_outlook",
    matter_id: MATTER,
    exact_version: state.exactVersion,
    installation_ref_sha256: INSTALLATION,
    compose_target_sha256: COMPOSE,
    attachment_name: "contract-v7.pdf",
    expires_at: authorized.expires_at,
  });
  await downloadAuthorizedAmicVaultExactExport({
    principal: { tenant_id: TENANT, user_id: ACTOR },
    dmsRuntime: { repository: state.repository },
    vaultExportProvider: state.provider,
    operationId: authorized.operation_id,
    requestId: "request-outlook-export-download",
    now: state.now,
  });
  assert.deepEqual(
    state.provider.calls.map(({ input }) => ({
      installation_ref_sha256: input.installation_ref_sha256,
      compose_target_sha256: input.compose_target_sha256,
    })),
    Array.from({ length: 3 }, () => ({
      installation_ref_sha256: INSTALLATION,
      compose_target_sha256: COMPOSE,
    })),
  );
  assert.deepEqual(inspectDownloadedAmicVaultExactExport({
    principal: { tenant_id: TENANT, user_id: ACTOR },
    dmsRuntime: { repository: state.repository },
    operationId: authorized.operation_id,
  }), {
    operation_id: authorized.operation_id,
    operation_kind: "attach_outlook",
    matter_id: MATTER,
    exact_version: state.exactVersion,
    installation_ref_sha256: INSTALLATION,
    compose_target_sha256: COMPOSE,
    attachment_name: "contract-v7.pdf",
  });
  assert.equal(completeAmicVaultExactExport({
    principal: { tenant_id: TENANT, user_id: ACTOR },
    dmsRuntime: { repository: state.repository },
    operationId: authorized.operation_id,
    completionStage: "attached",
    requestId: "request-outlook-export-attached",
    now: state.now,
  }).receipt.stage, "attached");
});

test("PostgreSQL DMS auxiliary ledger preserves exact export stages as immutable entries", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const ledger = createPostgresDomainLedger({ pool: fixture.appPool });
  const state = harness();
  const run = (command) => runRecordRepositoryDomainCommand({
    ledger,
    descriptor: DMS_AUXILIARY_DOMAIN_DESCRIPTOR,
    tenant_id: TENANT,
    create_repository: createDmsAuxiliaryRepository,
    command,
  });
  const authorized = (await run((repository) => authorizeAmicVaultExactExport({
    ...authorizationInput(state),
    dmsRuntime: { repository },
  }))).result;
  const downloaded = (await run((repository) => downloadAuthorizedAmicVaultExactExport({
    principal: { tenant_id: TENANT, user_id: ACTOR },
    dmsRuntime: { repository },
    vaultExportProvider: state.provider,
    operationId: authorized.operation_id,
    requestId: "request-postgres-export-download",
    now: state.now,
  }))).result;
  assert.deepEqual(downloaded.server_owned_bytes, CONTENT);
  const completed = (await run((repository) => completeAmicVaultExactExport({
    principal: { tenant_id: TENANT, user_id: ACTOR },
    dmsRuntime: { repository },
    operationId: authorized.operation_id,
    completionStage: "delivered",
    expectedExactVersion: state.exactVersion,
    requestId: "request-postgres-export-complete",
    now: state.now,
  }))).result;
  assert.equal(completed.receipt.stage, "delivered");
  const entries = await ledger.listIdempotency({
    tenant_id: TENANT,
    domain_id: DMS_AUXILIARY_DOMAIN_DESCRIPTOR.domain_id,
  });
  const persistedStages = entries
    .filter((entry) => entry.key.startsWith(`amic-os-vault-export-state:${authorized.operation_id}`))
    .map((entry) => decodeRecordDomainIdempotencyResponse(entry.response).response.receipts.at(-1).stage)
    .sort();
  assert.deepEqual(persistedStages, ["authorized", "delivered", "downloaded"]);
});

test("a downloaded Outlook export records one terminal failed receipt when the host cannot attach", async () => {
  const state = harness();
  const authorized = await authorizeAmicVaultExactExport(authorizationInput(state, {
    operationKind: "attach_outlook",
    installationRefSha256: INSTALLATION,
    composeTargetSha256: COMPOSE,
  }));
  await downloadAuthorizedAmicVaultExactExport({
    principal: { tenant_id: TENANT, user_id: ACTOR },
    dmsRuntime: { repository: state.repository },
    vaultExportProvider: state.provider,
    operationId: authorized.operation_id,
    requestId: "request-outlook-export-download-failed",
    now: state.now,
  });

  const failed = completeAmicVaultExactExport({
    principal: { tenant_id: TENANT, user_id: ACTOR },
    dmsRuntime: { repository: state.repository },
    operationId: authorized.operation_id,
    completionStage: "failed",
    safeReasonCode: "CLASSIC_OUTLOOK_HOST_UNAVAILABLE",
    expectedExactVersion: state.exactVersion,
    requestId: "request-outlook-export-failed",
    now: state.now,
  });
  assert.equal(failed.outcome, "failed");
  assert.equal(failed.receipt.stage, "failed");
  assert.equal(failed.receipt.safe_reason_code, "CLASSIC_OUTLOOK_HOST_UNAVAILABLE");
  assert.equal(failed.receipt.decision, "error");

  const replay = completeAmicVaultExactExport({
    principal: { tenant_id: TENANT, user_id: ACTOR },
    dmsRuntime: { repository: state.repository },
    operationId: authorized.operation_id,
    completionStage: "failed",
    safeReasonCode: "CLASSIC_OUTLOOK_HOST_UNAVAILABLE",
    expectedExactVersion: state.exactVersion,
    requestId: "request-outlook-export-failed-replay",
    now: state.now,
  });
  assert.equal(replay.receipt.receipt_id, failed.receipt.receipt_id);
  assert.throws(
    () => completeAmicVaultExactExport({
      principal: { tenant_id: TENANT, user_id: ACTOR },
      dmsRuntime: { repository: state.repository },
      operationId: authorized.operation_id,
      completionStage: "attached",
      expectedExactVersion: state.exactVersion,
      requestId: "request-outlook-export-failed-changed",
      now: state.now,
    }),
    (error) => error?.code === "LAWOS_VAULT_OPERATION_IDEMPOTENCY_CONFLICT",
  );
  assert.deepEqual(
    state.repository.listAudit({ tenant_id: TENANT })
      .filter((event) => event.object_id === authorized.operation_id)
      .map((event) => event.after.stage),
    ["requested", "authorized", "downloaded", "failed"],
  );
});
