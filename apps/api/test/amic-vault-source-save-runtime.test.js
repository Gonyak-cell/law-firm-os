import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { createDmsRepository } from "../../../packages/dms/src/repository.js";
import {
  continueServerOwnedSourceVaultSave,
  saveServerOwnedSourceToAmicVault,
} from "../src/amic-vault-source-save-runtime.js";

const TENANT = "tenant_vault_source_test";
const ACTOR = "user_vault_source_test";
const MATTER = "matter_vault_source_test";
const SOURCE = "a".repeat(64);
const TARGET = "b".repeat(64);

function allowDecisions(operationId, overrides = {}) {
  const decision = (kind) => Object.freeze({
    effect: "allow",
    decision_ref: `decision-${kind}:${operationId}`,
  });
  return Object.freeze({
    permission: decision("permission"),
    ethical_wall: decision("ethical-wall"),
    records: decision("records"),
    dlp: decision("dlp"),
    ...overrides,
  });
}

function providerFixture({
  readbackMismatch = false,
  recordsDenied = false,
  readbackStates = ["readback_verified"],
} = {}) {
  const calls = [];
  const objects = new Map();
  const commits = new Map();
  const exactByOperation = new Map();
  const readbackCountByOperation = new Map();
  let mismatch = readbackMismatch;
  const authorityRef = "amic-vault-api:source-test";
  const revision = "amic-vault-source:test";
  const provider = {
    authority_kind: "amic-vault-api",
    calls,
    objects,
    setReadbackMismatch(value) {
      mismatch = value;
    },
    async preflightUpload(input) {
      calls.push({ method: "preflightUpload", input });
      return Object.freeze({
        authority_kind: "amic-vault-api",
        authority_ref: authorityRef,
        provider_revision: revision,
        preflight_ref: `preflight:${input.operation_id}`,
        expires_at: new Date(Date.now() + 60_000).toISOString(),
        resolved: Object.freeze({
          vault_tenant_id: TENANT,
          vault_actor_id: ACTOR,
          vault_matter_id: `vault-${MATTER}`,
          vault_workspace_id: `workspace-${MATTER}`,
          vault_folder_id: null,
        }),
        decisions: allowDecisions(input.operation_id, recordsDenied
          ? {
              records: Object.freeze({
                effect: "deny",
                decision_ref: `decision-records:${input.operation_id}`,
              }),
            }
          : {}),
        audit: Object.freeze({
          event_id: `audit-preflight:${input.operation_id}`,
          correlation_id: input.correlation_id,
        }),
      });
    },
    async commitUpload(input) {
      calls.push({ method: "commitUpload", input });
      let commit = commits.get(input.operation.operation_id);
      if (!commit) {
        const suffix = input.operation.operation_id.slice("vaultop_".length);
        const exact = Object.freeze({
          document_id: `document_${suffix}`,
          version_id: `version_${suffix}_1`,
          file_object_id: `file_${suffix}_1`,
          sha256: input.file.sha256,
          byte_size: input.file.byte_size,
          mime_type: input.file.mime_type,
        });
        objects.set(exact.file_object_id, Buffer.from(input.file.bytes));
        exactByOperation.set(input.operation.operation_id, exact);
        commit = Object.freeze({
          authority_kind: "amic-vault-api",
          authority_ref: authorityRef,
          provider_revision: revision,
          state: "quarantined",
          provider_operation_ref: `provider-operation:${input.operation.operation_id}`,
          accepted: Object.freeze({
            sha256: input.file.sha256,
            byte_size: input.file.byte_size,
            mime_type: input.file.mime_type,
          }),
          exact_version: null,
          retry_after_ms: 1_000,
          audit: Object.freeze({
            event_id: `audit-commit:${input.operation.operation_id}`,
            correlation_id: input.operation.correlation_id,
          }),
        });
        commits.set(input.operation.operation_id, commit);
      }
      return commit;
    },
    async readbackUpload(input) {
      calls.push({ method: "readbackUpload", input });
      const count = readbackCountByOperation.get(input.operation.operation_id) ?? 0;
      const state = readbackStates[Math.min(count, readbackStates.length - 1)];
      readbackCountByOperation.set(input.operation.operation_id, count + 1);
      const exact = exactByOperation.get(input.operation.operation_id);
      const bytes = objects.get(exact.file_object_id);
      const sha256 = bytes ? createHash("sha256").update(bytes).digest("hex") : null;
      const finalState = new Set(["promoted", "readback_verified"]).has(state);
      return Object.freeze({
        authority_kind: "amic-vault-api",
        authority_ref: authorityRef,
        provider_revision: revision,
        state,
        provider_operation_ref: input.commit.provider_operation_ref,
        exact_version: finalState
          ? Object.freeze({
              ...exact,
              sha256: mismatch ? "f".repeat(64) : sha256,
            })
          : null,
        retry_after_ms: state === "readback_verified" ? null : 500,
        decisions: allowDecisions(input.operation.operation_id),
        audit: Object.freeze({
          event_id: `audit-readback:${input.operation.operation_id}`,
          correlation_id: input.operation.correlation_id,
        }),
      });
    },
  };
  return provider;
}

function input(overrides = {}) {
  return {
    principal: { tenant_id: TENANT, user_id: ACTOR },
    operationKind: "save_email",
    matterId: MATTER,
    sourceRefSha256: SOURCE,
    targetRefSha256: TARGET,
    filename: "canonical-message.eml",
    mimeType: "message/rfc822",
    bytes: Buffer.from("canonical MIME bytes\n"),
    maxBytes: 3 * 1024 * 1024,
    requestId: "request-vault-source-test",
    ...overrides,
  };
}

test("server-owned Outlook source commits to Vault and returns only exact readback material", async () => {
  const repository = createDmsRepository();
  const provider = providerFixture();
  const result = await saveServerOwnedSourceToAmicVault({
    ...input(),
    dmsRuntime: { repository },
    vaultUploadProvider: provider,
  });

  assert.equal(result.outcome, "readback_verified");
  assert.equal(result.item.operation_kind, "save_email");
  assert.equal(result.item.receipt.stage, "readback_verified");
  assert.equal(result.item.exact_readback_verified, true);
  assert.equal(result.item.sha256, createHash("sha256").update(input().bytes).digest("hex"));
  assert.deepEqual(provider.calls.map(({ method }) => method), [
    "preflightUpload",
    "commitUpload",
    "readbackUpload",
  ]);
  assert.equal(Buffer.isBuffer(provider.calls[1].input.file.bytes), true);
  assert.equal(provider.objects.size, 1);
  assert.equal(repository.list({ tenant_id: TENANT, model_type: "DmsDocument" }).length, 0);
  assert.equal(repository.list({ tenant_id: TENANT, model_type: "DmsDocumentVersion" }).length, 0);
  assert.equal(repository.list({ tenant_id: TENANT, model_type: "DmsFileObject" }).length, 0);
  assert.deepEqual(
    repository.listAudit({ tenant_id: TENANT })
      .filter((event) => event.object_id === result.item.operation_id)
      .map((event) => event.after.stage),
    ["requested", "authorized", "transferring", "quarantined", "scanning", "promoted", "readback_verified"],
  );
  const serialized = JSON.stringify({ result, ledger: repository.snapshot() });
  const publicResult = JSON.stringify(result);
  assert.equal(serialized.includes("canonical MIME bytes"), false);
  assert.equal(serialized.includes('"bytes"'), false);
  assert.equal(publicResult.includes('"idempotency_key":"amic-os-vault'), false);
});

test("concurrent identical Outlook source requests share one provider and audit operation", async () => {
  const repository = createDmsRepository();
  const provider = providerFixture();
  const [first, second] = await Promise.all([
    saveServerOwnedSourceToAmicVault({
      ...input({ requestId: "request-vault-source-concurrent-a" }),
      dmsRuntime: { repository },
      vaultUploadProvider: provider,
    }),
    saveServerOwnedSourceToAmicVault({
      ...input({ requestId: "request-vault-source-concurrent-b" }),
      dmsRuntime: { repository },
      vaultUploadProvider: provider,
    }),
  ]);

  assert.equal(first.request_id, "request-vault-source-concurrent-a");
  assert.equal(second.request_id, "request-vault-source-concurrent-b");
  assert.equal(second.item.receipt.receipt_id, first.item.receipt.receipt_id);
  for (const method of ["preflightUpload", "commitUpload", "readbackUpload"]) {
    assert.equal(provider.calls.filter((call) => call.method === method).length, 1);
  }
  const audit = repository.listAudit({
    tenant_id: TENANT,
    object_id: first.item.operation_id,
  });
  assert.deepEqual(audit.map((event) => event.after.stage), [
    "requested",
    "authorized",
    "transferring",
    "quarantined",
    "scanning",
    "promoted",
    "readback_verified",
  ]);
});

test("exact source replay reuses one Vault version and changed bytes fail before provider mutation", async () => {
  const repository = createDmsRepository();
  const provider = providerFixture();
  const first = await saveServerOwnedSourceToAmicVault({
    ...input(),
    dmsRuntime: { repository },
    vaultUploadProvider: provider,
  });
  const replay = await saveServerOwnedSourceToAmicVault({
    ...input({ requestId: "request-vault-source-replay" }),
    dmsRuntime: { repository },
    vaultUploadProvider: provider,
  });
  assert.equal(replay.outcome, "idempotent_replay");
  assert.equal(replay.item.receipt.receipt_id, first.item.receipt.receipt_id);
  assert.equal(provider.objects.size, 1);
  assert.equal(provider.calls.filter(({ method }) => method === "commitUpload").length, 1);

  await assert.rejects(
    saveServerOwnedSourceToAmicVault({
      ...input({ bytes: Buffer.from("changed MIME bytes\n") }),
      dmsRuntime: { repository },
      vaultUploadProvider: provider,
    }),
    (error) => error.safe_error_code === "VAULT_OPERATION_IDEMPOTENCY_CONFLICT",
  );
  assert.equal(provider.calls.filter(({ method }) => method === "commitUpload").length, 1);
  assert.equal(provider.objects.size, 1);
});

test("quarantined Outlook source resumes by operation status without resending bytes", async () => {
  const repository = createDmsRepository();
  const provider = providerFixture({
    readbackStates: ["scanning", "promoted", "readback_verified"],
  });
  const pending = await saveServerOwnedSourceToAmicVault({
    ...input(),
    dmsRuntime: { repository },
    vaultUploadProvider: provider,
  });
  assert.equal(pending.outcome, "processing");
  assert.equal(pending.item.stage, "scanning");
  assert.equal(pending.item.exact_readback_verified, false);

  const promoted = await continueServerOwnedSourceVaultSave({
    principal: input().principal,
    dmsRuntime: { repository },
    vaultUploadProvider: provider,
    operationId: pending.item.operation_id,
    requestId: "request-vault-source-status-promoted",
  });
  assert.equal(promoted.outcome, "processing");
  assert.equal(promoted.item.stage, "promoted");
  assert.equal(promoted.source_binding_sha256, input().sourceRefSha256);

  const completed = await continueServerOwnedSourceVaultSave({
    principal: input().principal,
    dmsRuntime: { repository },
    vaultUploadProvider: provider,
    operationId: pending.item.operation_id,
    requestId: "request-vault-source-status-complete",
  });
  assert.equal(completed.outcome, "readback_verified");
  assert.equal(completed.item.receipt.stage, "readback_verified");
  assert.equal(completed.source_binding_sha256, input().sourceRefSha256);
  assert.equal(provider.calls.filter(({ method }) => method === "commitUpload").length, 1);
  assert.equal(provider.calls.filter(({ method }) => method === "readbackUpload").length, 3);
  for (const call of provider.calls.filter(({ method }) => method === "readbackUpload")) {
    assert.equal("file" in call.input, false);
    assert.equal(JSON.stringify(call.input).includes("canonical MIME bytes"), false);
  }
});

test("provider policy denial and absent provider persist only the pre-I/O operation owner", async () => {
  for (const scenario of [
    {
      provider: null,
      code: "VAULT_PROVIDER_UNAVAILABLE",
    },
    {
      provider: providerFixture({ recordsDenied: true }),
      code: "VAULT_PROVIDER_RECORDS_DENIED",
    },
  ]) {
    const repository = createDmsRepository();
    await assert.rejects(
      saveServerOwnedSourceToAmicVault({
        ...input(),
        dmsRuntime: { repository },
        vaultUploadProvider: scenario.provider,
      }),
      (error) => error.safe_error_code === scenario.code,
    );
    const idempotency = repository.snapshot().idempotency;
    assert.equal(idempotency.length, 1);
    assert.match(idempotency[0].idempotency_key, /^amic-os-vault-operation-owner:/u);
    assert.equal(idempotency.some(({ operation }) => (
      operation === "amic_os_vault_source_save_state"
      || operation === "amic_os_vault_source_save_final"
    )), false);
    assert.equal(repository.listAudit({ tenant_id: TENANT }).length, 0);
  }
});

test("readback mismatch persists no final receipt and retry resumes without a second commit", async () => {
  const repository = createDmsRepository();
  const provider = providerFixture({ readbackMismatch: true });
  await assert.rejects(
    saveServerOwnedSourceToAmicVault({
      ...input(),
      dmsRuntime: { repository },
      vaultUploadProvider: provider,
    }),
    (error) => error.safe_error_code === "VAULT_PROVIDER_READBACK_MISMATCH",
  );
  assert.equal(provider.calls.filter(({ method }) => method === "commitUpload").length, 1);
  assert.equal(repository.snapshot().idempotency.some((entry) => (
    entry.operation === "amic_os_vault_source_save_final"
  )), false);

  provider.setReadbackMismatch(false);
  const recovered = await saveServerOwnedSourceToAmicVault({
    ...input({ requestId: "request-vault-source-recovered" }),
    dmsRuntime: { repository },
    vaultUploadProvider: provider,
  });
  assert.equal(recovered.outcome, "readback_verified");
  assert.equal(provider.calls.filter(({ method }) => method === "commitUpload").length, 1);
  assert.equal(provider.calls.filter(({ method }) => method === "readbackUpload").length, 2);
  assert.equal(provider.objects.size, 1);
});
