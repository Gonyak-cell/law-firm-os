import { createHash, randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";

import {
  assertNoVaultBoundarySecrets,
  assertVaultOperationBinding,
  classifyVaultOperationReceiptTransition,
  classifyVaultOperationReplay,
  createVaultOperationAuditEvent,
  createVaultOperationBinding,
  createVaultOperationReceipt,
} from "../../../packages/dms/src/vault-operation-receipt.js";
import { hashDomainValue } from "../../../packages/persistence/src/domain-ledger.js";
import {
  normalizeAmicVaultUploadCommit,
  normalizeAmicVaultUploadPreflight,
  normalizeAmicVaultUploadReadback,
  requireAmicVaultUploadProvider,
} from "./amic-vault-upload-provider.js";
import { vaultOperationOwnerForRuntime } from "./vault-operation-owner.js";

const OPERATION_KINDS = new Set(["save_email", "save_email_attachment"]);
const MIME_TYPE = /^[A-Za-z0-9!#$&^_.+-]+\/[A-Za-z0-9!#$&^_.+-]+$/u;
const SHA256 = /^[a-f0-9]{64}$/u;
const OPERATION_ID = /^vaultop_[a-f0-9]{32}$/u;
const STATE_PREFIX = "amic-os-vault-source-state:";
const FINAL_PREFIX = "amic-os-vault-source-final:";
const STATE_READ_ORDER = Object.freeze([
  "cleaned",
  "cancelled",
  "failed",
  "blocked",
  "readback_verified",
  "promoted",
  "scanning",
  "quarantined",
  "transferring",
  "authorized",
]);

export class AmicVaultSourceSaveError extends Error {
  constructor(safeErrorCode, message, status = 400) {
    super(message);
    this.name = "AmicVaultSourceSaveError";
    this.code = `LAWOS_${safeErrorCode}`;
    this.safe_error_code = safeErrorCode;
    this.status = status;
  }
}

function fail(code, message, status = 400) {
  throw new AmicVaultSourceSaveError(code, message, status);
}

function canonicalMimeType(value) {
  const mimeType = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!MIME_TYPE.test(mimeType)) {
    fail("VAULT_SOURCE_MIME_INVALID", "Vault source MIME type is invalid", 415);
  }
  return mimeType;
}

function boundedFilename(value) {
  const filename = typeof value === "string" ? value.normalize("NFC").trim() : "";
  if (!filename || filename.length > 240 || /[\\/\u0000-\u001f\u007f]/u.test(filename)) {
    fail("VAULT_SOURCE_FILENAME_INVALID", "Vault source filename is invalid");
  }
  return filename;
}

function sourceBytes(value, maxBytes) {
  const bytes = Buffer.isBuffer(value)
    ? Buffer.from(value)
    : value instanceof Uint8Array
      ? Buffer.from(value)
      : null;
  if (!bytes || bytes.byteLength < 1) {
    fail("VAULT_SOURCE_BYTES_INVALID", "Vault source bytes are required");
  }
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1 || bytes.byteLength > maxBytes) {
    fail("VAULT_SOURCE_TOO_LARGE", "Vault source exceeds the allowed size", 413);
  }
  return bytes;
}

function requiredSha256(value, field) {
  if (typeof value !== "string" || !SHA256.test(value)) {
    fail("VAULT_SOURCE_BINDING_INVALID", `${field} is invalid`);
  }
  return value;
}

function nowIso(now) {
  return new Date(now()).toISOString();
}

function stateKey(operationId, stage = "authorized") {
  const base = `${STATE_PREFIX}${operationId}`;
  return stage === "authorized" ? base : `${base}:${stage}`;
}

function finalKey(operationId) {
  return `${FINAL_PREFIX}${operationId}`;
}

function readStored(repository, tenantId, key) {
  return repository.getIdempotency({
    tenant_id: tenantId,
    idempotency_key: key,
  })?.response ?? null;
}

function readCurrentState(repository, tenantId, operationId) {
  for (const stage of STATE_READ_ORDER) {
    const state = readStored(repository, tenantId, stateKey(operationId, stage));
    if (state) return state;
  }
  return null;
}

function persistState(repository, state) {
  const stage = state.receipts?.at(-1)?.stage;
  if (!STATE_READ_ORDER.includes(stage)) {
    fail("VAULT_SOURCE_OPERATION_STATE_INVALID", "Vault source operation state is invalid", 409);
  }
  repository.recordIdempotency({
    tenant_id: state.binding.tenant_id,
    idempotency_key: stateKey(state.binding.operation_id, stage),
    operation: "amic_os_vault_source_save_state",
    request_fingerprint: state.binding.request_fingerprint,
    response: state,
    created_at: state.receipts.at(-1).occurred_at,
  });
  return state;
}

function appendStage({
  repository,
  binding,
  receipts,
  stage,
  occurredAt,
  exactVersion = null,
  vaultEventId = null,
  authorityRef = null,
  safeReasonCode = null,
}) {
  const previous = receipts.at(-1) ?? null;
  if (previous?.stage === stage) return Object.freeze(receipts);
  const receipt = createVaultOperationReceipt({
    binding,
    stage,
    occurred_at: occurredAt,
    lawos_event_id: `vault-operation:${binding.operation_id}:${stage}:${randomUUID()}`,
    vault_event_id: vaultEventId,
    authority_ref: authorityRef,
    safe_reason_code: safeReasonCode,
    exact_version: exactVersion,
  });
  classifyVaultOperationReceiptTransition({ previous, next: receipt });
  repository.appendAudit(createVaultOperationAuditEvent({ binding, receipt }));
  return Object.freeze([...receipts, receipt]);
}

const PROVIDER_PROGRESS_STAGES = Object.freeze([
  "quarantined",
  "scanning",
  "promoted",
  "readback_verified",
]);

function appendProviderProgress({ repository, binding, receipts, providerReadback, occurredAt }) {
  const currentIndex = PROVIDER_PROGRESS_STAGES.indexOf(receipts.at(-1)?.stage);
  const targetIndex = PROVIDER_PROGRESS_STAGES.indexOf(providerReadback.state);
  if (currentIndex < 0 || targetIndex < currentIndex) {
    fail("VAULT_SOURCE_OPERATION_STATE_INVALID", "Vault source operation stage regressed", 409);
  }
  let nextReceipts = receipts;
  for (const stage of PROVIDER_PROGRESS_STAGES.slice(currentIndex + 1, targetIndex + 1)) {
    nextReceipts = appendStage({
      repository,
      binding,
      receipts: nextReceipts,
      stage,
      occurredAt,
      exactVersion: new Set(["promoted", "readback_verified"]).has(stage)
        ? providerReadback.exact_version
        : null,
      vaultEventId: providerReadback.audit.event_id,
      authorityRef: providerReadback.authority_ref,
    });
  }
  return nextReceipts;
}

function exactFingerprint({ bytes, mimeType }) {
  return Object.freeze({
    sha256: createHash("sha256").update(bytes).digest("hex"),
    byte_size: bytes.byteLength,
    mime_type: mimeType,
  });
}

function response({ requestId, binding, exactVersion, receipt, idempotentReplay }) {
  const item = Object.freeze({
    operation_id: binding.operation_id,
    operation_kind: binding.operation_kind,
    document_id: exactVersion.document_id,
    version_id: exactVersion.version_id,
    file_object_id: exactVersion.file_object_id,
    sha256: exactVersion.sha256,
    byte_size: exactVersion.byte_size,
    mime_type: exactVersion.mime_type,
    receipt,
    exact_readback_verified: true,
    raw_path_included: false,
    raw_bytes_included: false,
    mail_pii_included: false,
    token_material_returned: false,
  });
  const body = Object.freeze({
    request_id: requestId,
    outcome: idempotentReplay ? "idempotent_replay" : "readback_verified",
    ok: true,
    item,
    idempotent_replay: idempotentReplay,
    safe_error_codes: Object.freeze([]),
    production_ready_claim: false,
  });
  assertNoVaultBoundarySecrets(body);
  return body;
}

function pendingResponse({ requestId, binding, receipt, retryAfterMs }) {
  const body = Object.freeze({
    request_id: requestId,
    outcome: "processing",
    ok: true,
    item: Object.freeze({
      operation_id: binding.operation_id,
      operation_kind: binding.operation_kind,
      stage: receipt.stage,
      receipt,
      retry_after_ms: retryAfterMs,
      exact_readback_verified: false,
      raw_path_included: false,
      raw_bytes_included: false,
      mail_pii_included: false,
      token_material_returned: false,
    }),
    idempotent_replay: false,
    safe_error_codes: Object.freeze([]),
    production_ready_claim: false,
  });
  assertNoVaultBoundarySecrets(body);
  return body;
}

function assertStoredState(state, { binding, fingerprint }) {
  if (!state || typeof state !== "object" || Array.isArray(state)) {
    fail("VAULT_SOURCE_OPERATION_STATE_INVALID", "Vault source operation state is invalid", 409);
  }
  assertVaultOperationBinding(state.binding);
  if (!isDeepStrictEqual(state.binding, binding)
      || !isDeepStrictEqual(state.source_fingerprint, fingerprint)
      || !Array.isArray(state.receipts)) {
    fail("VAULT_OPERATION_IDEMPOTENCY_CONFLICT", "Vault source operation binding changed", 409);
  }
  return state;
}

function replayResponse({ repository, requestId, binding, fingerprint }) {
  const stored = readStored(repository, binding.tenant_id, finalKey(binding.operation_id));
  if (!stored) return null;
  const replay = classifyVaultOperationReplay({
    binding,
    existing: {
      idempotency_key_sha256: stored.idempotency_key_sha256,
      request_fingerprint: stored.request_fingerprint,
      receipt: stored.receipt,
    },
  });
  if (!isDeepStrictEqual(stored.source_fingerprint, fingerprint)
      || replay.receipt.exact_version?.sha256 !== fingerprint.sha256
      || replay.receipt.exact_version?.byte_size !== fingerprint.byte_size
      || replay.receipt.exact_version?.mime_type !== fingerprint.mime_type) {
    fail("VAULT_OPERATION_IDEMPOTENCY_CONFLICT", "Vault source replay bytes changed", 409);
  }
  return response({
    requestId,
    binding,
    exactVersion: replay.receipt.exact_version,
    receipt: replay.receipt,
    idempotentReplay: true,
  });
}

function assertSourcePrincipal(binding, principal) {
  assertVaultOperationBinding(binding);
  if (binding.tenant_id !== principal?.tenant_id || binding.actor_id !== principal?.user_id) {
    fail("VAULT_SOURCE_OPERATION_PRINCIPAL_MISMATCH", "Vault source operation belongs to a different principal", 403);
  }
}

async function continueSourceOperation({
  state,
  repository,
  provider,
  principal,
  requestId,
  now,
}) {
  assertSourcePrincipal(state.binding, principal);
  const replay = replayResponse({
    repository,
    requestId,
    binding: state.binding,
    fingerprint: state.source_fingerprint,
  });
  if (replay) return replay;
  const providerPreflight = state.provider_preflight;
  const providerCommit = state.provider_commit;
  if (!providerPreflight || !providerCommit) {
    fail("VAULT_PROVIDER_COMMIT_MISSING", "Vault provider quarantine acceptance is missing", 409);
  }
  const lastStage = state.receipts.at(-1)?.stage;
  if (new Set(["blocked", "failed", "cancelled", "cleaned"]).has(lastStage)) {
    fail(
      state.receipts.at(-1)?.safe_reason_code ?? "VAULT_SOURCE_OPERATION_TERMINAL",
      "Vault source operation is terminal",
      409,
    );
  }
  const providerReadback = normalizeAmicVaultUploadReadback(
    await provider.readbackUpload(Object.freeze({
      principal: Object.freeze({
        tenant_id: principal.tenant_id,
        user_id: principal.user_id,
      }),
      preflight: providerPreflight,
      commit: providerCommit,
      operation: Object.freeze({
        operation_id: state.binding.operation_id,
        correlation_id: state.binding.correlation_id,
        operation_kind: state.binding.operation_kind,
      }),
      expected: state.source_fingerprint,
      request_id: requestId,
    })),
    {
      correlationId: state.binding.correlation_id,
      expected: providerCommit.accepted,
      authorityRef: providerPreflight.authority_ref,
      providerRevision: providerPreflight.provider_revision,
      providerOperationRef: providerCommit.provider_operation_ref,
    },
  );
  let receipts = state.receipts;
  if (providerReadback.safe_reason_code) {
    const failureStage = new Set(["VAULT_UPLOAD_SCAN_ERROR", "VAULT_UPLOAD_EXPIRED"])
      .has(providerReadback.safe_reason_code)
      ? "failed"
      : "blocked";
    receipts = appendStage({
      repository,
      binding: state.binding,
      receipts,
      stage: failureStage,
      occurredAt: nowIso(now),
      safeReasonCode: providerReadback.safe_reason_code,
      vaultEventId: providerReadback.audit.event_id,
      authorityRef: providerReadback.authority_ref,
    });
    persistState(repository, Object.freeze({ ...state, receipts }));
    fail(providerReadback.safe_reason_code, "Vault rejected the quarantined source", 409);
  }
  receipts = appendProviderProgress({
    repository,
    binding: state.binding,
    receipts,
    providerReadback,
    occurredAt: nowIso(now),
  });
  const receipt = receipts.at(-1);
  persistState(repository, Object.freeze({ ...state, receipts }));
  if (providerReadback.state !== "readback_verified") {
    return pendingResponse({
      requestId,
      binding: state.binding,
      receipt,
      retryAfterMs: providerReadback.retry_after_ms,
    });
  }
  repository.recordIdempotency({
    tenant_id: state.binding.tenant_id,
    idempotency_key: finalKey(state.binding.operation_id),
    operation: "amic_os_vault_source_save_final",
    request_fingerprint: state.binding.request_fingerprint,
    response: Object.freeze({
      idempotency_key_sha256: state.binding.idempotency_key_sha256,
      request_fingerprint: state.binding.request_fingerprint,
      source_fingerprint: state.source_fingerprint,
      receipt,
    }),
    created_at: nowIso(now),
  });
  return response({
    requestId,
    binding: state.binding,
    exactVersion: providerReadback.exact_version,
    receipt,
    idempotentReplay: false,
  });
}

/** Continue a previously quarantined source without fetching or resending source bytes. */
export async function continueServerOwnedSourceVaultSave({
  principal,
  dmsRuntime,
  vaultUploadProvider,
  operationId,
  requestId,
  now = Date.now,
} = {}) {
  if (typeof operationId !== "string" || !OPERATION_ID.test(operationId)) {
    fail("VAULT_SOURCE_OPERATION_INVALID", "Vault source operation ID is invalid");
  }
  const repository = dmsRuntime?.repository;
  if (!repository
      || typeof repository.getIdempotency !== "function"
      || typeof repository.recordIdempotency !== "function"
      || typeof repository.appendAudit !== "function") {
    fail("VAULT_SOURCE_LEDGER_UNAVAILABLE", "Vault source operation ledger is unavailable", 503);
  }
  const state = readCurrentState(repository, principal?.tenant_id, operationId);
  if (!state) fail("VAULT_SOURCE_OPERATION_NOT_FOUND", "Vault source operation was not found", 404);
  const checked = assertStoredState(state, {
    binding: state.binding,
    fingerprint: state.source_fingerprint,
  });
  const continued = await continueSourceOperation({
    state: checked,
    repository,
    provider: requireAmicVaultUploadProvider(vaultUploadProvider),
    principal,
    requestId,
    now,
  });
  return Object.freeze({
    ...continued,
    source_binding_sha256: checked.binding.source_ref_sha256,
  });
}

/**
 * Save bytes already owned and verified by the API process to AMIC Vault.
 *
 * LawOS persists only operation/idempotency/audit material. The provider owns
 * document bytes and is the only authority for document, version, file-object,
 * policy decisions, and exact readback.
 */
export async function saveServerOwnedSourceToAmicVault({
  principal,
  dmsRuntime,
  vaultUploadProvider,
  operationKind,
  matterId,
  sourceRefSha256,
  targetRefSha256,
  filename,
  mimeType,
  bytes: suppliedBytes,
  requestId,
  maxBytes,
  requestedWorkspaceId = null,
  requestedFolderId = null,
  now = Date.now,
} = {}) {
  if (!OPERATION_KINDS.has(operationKind)) {
    fail("VAULT_SOURCE_OPERATION_INVALID", "Vault source operation kind is invalid");
  }
  const sourceHash = requiredSha256(sourceRefSha256, "sourceRefSha256");
  const targetHash = requiredSha256(targetRefSha256, "targetRefSha256");
  const normalizedFilename = boundedFilename(filename);
  const normalizedMimeType = canonicalMimeType(mimeType);
  const bytes = sourceBytes(suppliedBytes, maxBytes);
  const fingerprint = exactFingerprint({ bytes, mimeType: normalizedMimeType });
  const serverNonceSha256 = hashDomainValue({
    schema: "amic-os-vault-source-save:v1",
    operation_kind: operationKind,
    matter_id: matterId,
    source_ref_sha256: sourceHash,
    target_ref_sha256: targetHash,
  });
  const binding = createVaultOperationBinding({
    principal,
    operation_kind: operationKind,
    server_nonce_sha256: serverNonceSha256,
    source_ref_sha256: sourceHash,
    target_ref_sha256: targetHash,
    resolved_resource: {
      matter_id: matterId,
      exact_version: null,
      installation_ref_sha256: null,
      compose_target_sha256: null,
    },
  });
  const repository = dmsRuntime?.repository;
  if (!repository
      || typeof repository.getIdempotency !== "function"
      || typeof repository.recordIdempotency !== "function"
      || typeof repository.appendAudit !== "function") {
    fail("VAULT_SOURCE_LEDGER_UNAVAILABLE", "Vault source operation ledger is unavailable", 503);
  }
  const execute = async () => {
    const replay = replayResponse({ repository, requestId, binding, fingerprint });
    if (replay) return replay;

    const provider = requireAmicVaultUploadProvider(vaultUploadProvider);
    let state = readCurrentState(repository, binding.tenant_id, binding.operation_id);
  if (state) {
    state = assertStoredState(state, { binding, fingerprint });
  } else {
    const providerPreflight = normalizeAmicVaultUploadPreflight(
      await provider.preflightUpload(Object.freeze({
        principal: Object.freeze({
          tenant_id: principal.tenant_id,
          user_id: principal.user_id,
        }),
        lawos_matter_id: matterId,
        requested_workspace_id: requestedWorkspaceId,
        requested_folder_id: requestedFolderId,
        source: Object.freeze({
          kind: operationKind === "save_email" ? "microsoft_graph_mime" : "microsoft_graph_mime_attachment",
          ref_sha256: sourceHash,
        }),
        operation_id: binding.operation_id,
        correlation_id: binding.correlation_id,
        request_id: requestId,
      })),
      {
        correlationId: binding.correlation_id,
        expected: {
          workspaceId: requestedWorkspaceId,
          folderId: requestedFolderId,
        },
        now,
      },
    );
    const createdAt = nowIso(now);
    let receipts = appendStage({
      repository,
      binding,
      receipts: [],
      stage: "requested",
      occurredAt: createdAt,
    });
    receipts = appendStage({
      repository,
      binding,
      receipts,
      stage: "authorized",
      occurredAt: nowIso(now),
      vaultEventId: providerPreflight.audit.event_id,
      authorityRef: providerPreflight.authority_ref,
    });
    state = persistState(repository, Object.freeze({
      binding,
      receipts,
      provider_preflight: providerPreflight,
      provider_commit: null,
      source_fingerprint: fingerprint,
      created_at: createdAt,
    }));
  }

  const providerPreflight = state.provider_preflight;
  if (!providerPreflight
      || providerPreflight.authority_kind !== "amic-vault-api"
      || typeof providerPreflight.preflight_ref !== "string") {
    fail("VAULT_PROVIDER_PREFLIGHT_MISSING", "Vault provider preflight is missing", 409);
  }
  if (!state.provider_commit && Date.parse(providerPreflight.expires_at) <= now()) {
    fail("VAULT_PROVIDER_PREFLIGHT_EXPIRED", "Vault provider preflight expired", 410);
  }

  let receipts = state.receipts;
  if (receipts.at(-1)?.stage === "authorized") {
    receipts = appendStage({
      repository,
      binding,
      receipts,
      stage: "transferring",
      occurredAt: nowIso(now),
    });
    state = persistState(repository, Object.freeze({ ...state, receipts }));
  }
  if (!new Set(["transferring", ...PROVIDER_PROGRESS_STAGES]).has(receipts.at(-1)?.stage)) {
    fail("VAULT_SOURCE_OPERATION_STATE_INVALID", "Vault source operation stage is invalid", 409);
  }

  let providerCommit = state.provider_commit;
  if (!providerCommit) {
    providerCommit = normalizeAmicVaultUploadCommit(
      await provider.commitUpload(Object.freeze({
        principal: Object.freeze({
          tenant_id: principal.tenant_id,
          user_id: principal.user_id,
        }),
        preflight: providerPreflight,
        operation: Object.freeze({
          operation_id: binding.operation_id,
          correlation_id: binding.correlation_id,
          idempotency_key: binding.idempotency_key,
          operation_kind: operationKind,
        }),
        source: Object.freeze({ ref_sha256: sourceHash }),
        file: Object.freeze({
          filename: normalizedFilename,
          mime_type: normalizedMimeType,
          byte_size: bytes.byteLength,
          sha256: fingerprint.sha256,
          bytes,
        }),
        request_id: requestId,
      })),
      {
        correlationId: binding.correlation_id,
        expected: fingerprint,
        authorityRef: providerPreflight.authority_ref,
        providerRevision: providerPreflight.provider_revision,
      },
    );
    receipts = appendStage({
      repository,
      binding,
      receipts,
      stage: "quarantined",
      occurredAt: nowIso(now),
      vaultEventId: providerCommit.audit.event_id,
      authorityRef: providerCommit.authority_ref,
    });
    state = persistState(repository, Object.freeze({
      ...state,
      receipts,
      provider_commit: providerCommit,
    }));
  }

    return continueSourceOperation({
      state,
      repository,
      provider,
      principal,
      requestId,
      now,
    });
  };

  const existingState = readCurrentState(
    repository,
    binding.tenant_id,
    binding.operation_id,
  );
  if (existingState?.provider_commit) return execute();
  const owned = await vaultOperationOwnerForRuntime(dmsRuntime).run({
    tenantId: binding.tenant_id,
    operationId: binding.operation_id,
    requestFingerprint: hashDomainValue({
      binding_request_fingerprint: binding.request_fingerprint,
      source_fingerprint: fingerprint,
    }),
    operation: execute,
  });
  return owned.request_id === requestId
    ? owned
    : Object.freeze({ ...owned, request_id: requestId });
}
