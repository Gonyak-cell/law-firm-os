import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { createMigratedPostgresFixture } from "../../persistence/test/helpers/disposable-postgres.js";
import { createPostgresDmsUploadRuntime } from "../src/postgres-upload-runtime.js";
import { createLocalStorageAdapter } from "../src/storage/local-storage-adapter.js";

const TENANT = "tenant-intake-metadata-guard";
const NOW = "2026-08-09T08:00:00.000Z";
const BYTES = Buffer.from("signed engagement metadata guard");
const SHA = createHash("sha256").update(BYTES).digest("hex");

function guard(suffix) {
  const documentId = `document-${suffix}`;
  const versionId = `version:${documentId}:1`;
  return Object.freeze({
    schema_version: "law-firm-os.dms-external-metadata-guard.v1",
    provider: "lawos-intake",
    tenant_id: TENANT,
    claim_id: createHash("sha256").update(`engagement-claim-${suffix}`).digest("hex"),
    request_fingerprint: createHash("sha256").update(`request-${suffix}`).digest("hex"),
    session_id: `dms-upload:engagement:${suffix}`,
    idempotency_key: `engagement-signed-document:${suffix}`,
    document_id: documentId,
    version_id: versionId,
    object_id: `object:${versionId}`,
    expected_sha256: SHA,
    expected_byte_size: BYTES.byteLength,
    content_type: "application/pdf",
    actor_id: "actor-intake-metadata-guard",
  });
}

function sessionInput(suffix, { expires_at = "2026-08-09T09:00:00.000Z" } = {}) {
  const contract = guard(suffix);
  return {
    tenant_id: TENANT,
    session_id: contract.session_id,
    idempotency_key: contract.idempotency_key,
    matter_id: `matter-${suffix}`,
    workspace_id: `workspace-${suffix}`,
    document_id: contract.document_id,
    version_id: contract.version_id,
    version_number: 1,
    object_id: contract.object_id,
    adapter_id: "intake-metadata-guard-storage",
    title: "Signed engagement.pdf",
    content_type: contract.content_type,
    expected_sha256: SHA,
    expected_byte_size: BYTES.byteLength,
    permission_envelope_id: `permission-${suffix}`,
    audit_trace_id: `audit-${suffix}`,
    actor_id: contract.actor_id,
    expires_at,
  };
}

async function fixture(t) {
  const postgres = await createMigratedPostgresFixture(t, { appPoolMax: 1 });
  if (!postgres) return null;
  const base = createLocalStorageAdapter({ adapter_id: "intake-metadata-guard-storage" });
  const calls = { finalize: 0, staged_stat: 0, orphan_delete: 0 };
  const storage = Object.freeze({
    ...base,
    finalizeObject(input) { calls.finalize += 1; return base.finalizeObject(input); },
    statStagedObject(input) { calls.staged_stat += 1; return base.statStagedObject(input); },
    deleteOrphan(input) { calls.orphan_delete += 1; return base.deleteOrphan(input); },
  });
  return { postgres, storage, calls };
}

async function bindGuard(postgres, contract) {
  await postgres.adminPool.query(
    `UPDATE lawos_dms.upload_sessions
        SET provider_receipt = coalesce(provider_receipt, '{}'::jsonb)
          || jsonb_build_object('completion_authority', $3::jsonb)
      WHERE tenant_id = $1 AND session_id = $2`,
    [TENANT, contract.session_id, JSON.stringify(contract)],
  );
}

test("legacy/adversarial injected Intake guard cannot bypass before_metadata through reconciliation", async (t) => {
  const setup = await fixture(t);
  if (!setup) return;
  const contract = guard("provider-finalized");
  const failing = createPostgresDmsUploadRuntime({
    pool: setup.postgres.appPool,
    storage: setup.storage,
    sourceOnly: false,
    clock: () => new Date(NOW),
    faultInjector(phase) {
      if (phase === "before_metadata_commit") throw new Error("forced metadata transaction rollback");
    },
  });
  await assert.rejects(failing.uploadDocument({
    document: {
      tenant_id: TENANT,
      matter_id: "matter-provider-finalized",
      workspace_id: "workspace-provider-finalized",
      document_id: contract.document_id,
      current_version_id: contract.version_id,
      title: "Signed engagement.pdf",
      mime_type: contract.content_type,
      permission_envelope_id: "permission-provider-finalized",
      audit_trace_id: "audit-provider-finalized",
    },
    bytes: BYTES,
    actor_id: contract.actor_id,
    idempotency_key: contract.idempotency_key,
    object_id: contract.object_id,
    session_id: contract.session_id,
  }));
  await bindGuard(setup.postgres, contract);

  const restarted = createPostgresDmsUploadRuntime({
    pool: setup.postgres.appPool,
    storage: setup.storage,
    sourceOnly: false,
    clock: () => new Date(NOW),
  });
  const outcome = await restarted.reconcileUploadSessions({ tenant_id: TENANT });
  assert.deepEqual(outcome.map(({ action }) => action), ["awaiting_external_checkpoint"]);
  const session = await restarted.getUploadSession({ tenant_id: TENANT, session_id: contract.session_id });
  assert.equal(session.state, "provider_finalized");
  assert.equal(session.metadata_committed_at, null);
  assert.equal(setup.calls.finalize, 1);
  assert.equal((await setup.postgres.adminPool.query(
    "SELECT count(*)::int AS count FROM lawos_dms.documents WHERE tenant_id = $1",
    [TENANT],
  )).rows[0].count, 0);
});

test("expired pre-provider Intake sessions become manual recovery without storage I/O", async (t) => {
  const setup = await fixture(t);
  if (!setup) return;
  const contract = guard("expired-pending");
  const runtime = createPostgresDmsUploadRuntime({
    pool: setup.postgres.appPool,
    storage: setup.storage,
    sourceOnly: false,
    clock: () => new Date(NOW),
  });
  await runtime.createUploadSession(sessionInput("expired-pending", {
    expires_at: "2026-08-09T07:00:00.000Z",
  }));
  await bindGuard(setup.postgres, contract);
  const before = { ...setup.calls };
  const outcome = await runtime.reconcileUploadSessions({ tenant_id: TENANT });
  assert.deepEqual(outcome.map(({ action }) => action), ["external_checkpoint_manual_recovery"]);
  const session = await runtime.getUploadSession({ tenant_id: TENANT, session_id: contract.session_id });
  assert.equal(session.state, "failed_terminal");
  assert.equal(session.retryable, false);
  assert.equal(session.dead_letter_receipt.schema_version, "law-firm-os.dms-external-metadata-guard-recovery.v1");
  assert.equal(session.dead_letter_receipt.recovery_state, "manual_recovery_required");
  assert.equal(session.dead_letter_receipt.provider_bytes_committed, false);
  for (const rawIdentity of [
    "claim_id", "request_fingerprint", "idempotency_key", "document_id",
    "version_id", "object_id", "actor_id",
  ]) {
    assert.equal(Object.hasOwn(session.dead_letter_receipt, rawIdentity), false);
  }
  assert.deepEqual(setup.calls, before);
  assert.deepEqual(await runtime.reconcileUploadSessions({ tenant_id: TENANT }), []);
});

test("create-time Intake guard is exact, hash-bound, immutable, and excludes mutable lease fields", async (t) => {
  const setup = await fixture(t);
  if (!setup) return;
  const runtime = createPostgresDmsUploadRuntime({
    pool: setup.postgres.appPool,
    storage: setup.storage,
    sourceOnly: false,
    clock: () => new Date(NOW),
  });
  const suffix = "create-authority";
  const contract = guard(suffix);
  const input = { ...sessionInput(suffix), completion_authority: contract };
  const created = await runtime.createUploadSession(input);
  assert.equal(created.replayed, false);
  assert.equal((await runtime.createUploadSession(input)).replayed, true);
  const stored = await runtime.getUploadSession({ tenant_id: TENANT, session_id: contract.session_id });
  assert.deepEqual(stored.provider_receipt.completion_authority, contract);
  assert.match(stored.request_hash, /^[a-f0-9]{64}$/u);

  const requestFingerprintDrift = {
    ...contract,
    request_fingerprint: createHash("sha256").update("changed full request").digest("hex"),
  };
  await assert.rejects(
    runtime.createUploadSession({ ...input, completion_authority: requestFingerprintDrift }),
    (error) => error?.safe_error_code === "DMS_IDEMPOTENCY_CONFLICT",
  );
  const mismatchValues = {
    tenant_id: "tenant-intake-metadata-guard-other",
    session_id: "dms-upload:engagement:other",
    idempotency_key: "engagement-signed-document:other",
    document_id: "document-other",
    version_id: "version:document-other:1",
    object_id: "object:version:document-other:1",
    expected_sha256: createHash("sha256").update("other bytes").digest("hex"),
    expected_byte_size: BYTES.byteLength + 1,
    content_type: "application/octet-stream",
    actor_id: "actor-other",
  };
  for (const [field, value] of Object.entries(mismatchValues)) {
    const isolatedSuffix = `mismatch-${field}`;
    const isolatedInput = sessionInput(isolatedSuffix);
    await assert.rejects(
      runtime.createUploadSession({
        ...isolatedInput,
        completion_authority: { ...guard(isolatedSuffix), [field]: value },
      }),
      (error) => error?.safe_error_code === "DMS_EXTERNAL_METADATA_GUARD_MISMATCH",
      field,
    );
  }
  await assert.rejects(
    runtime.createUploadSession({
      ...sessionInput("extra-field"),
      completion_authority: { ...guard("extra-field"), stage_lease_token: "forbidden" },
    }),
    /fields are invalid/u,
  );
  await assert.rejects(
    runtime.createUploadSession({
      ...sessionInput("unknown-provider"),
      completion_authority: { ...guard("unknown-provider"), provider: "unknown" },
    }),
    /schema is invalid/u,
  );
  assert.deepEqual(setup.calls, { finalize: 0, staged_stat: 0, orphan_delete: 0 });
});
