import { createHash, randomUUID } from "node:crypto";
import { withPostgresTransaction } from "../../persistence/src/postgres/transaction.js";
import { stableJsonStringify } from "../../persistence/src/durable-file.js";
import {
  assertStagedStorageAdapter,
  createStoragePointerRef,
  sha256Hex,
} from "./storage/storage-adapter.js";

const ACTIVE_RECONCILIATION_STATES = Object.freeze([
  "pending",
  "bytes_stored",
  "provider_finalizing",
  "provider_finalized",
  "failed",
  "expired",
]);
const COMPLETION_AUTHORITY_REJECTION_CODES = new Set([
  "DOCUSIGN_PERMISSION_AUTHORITY_CHANGED",
  "DOCUSIGN_AUDIT_LINEAGE_CHANGED",
  "DOCUSIGN_COMPLETION_FENCE_LOST",
  "DOCUSIGN_COMPLETION_BINDING_INVALID",
  "DOCUSIGN_APPROVED_SOURCE_MISMATCH",
  "DOCUSIGN_APPROVED_DOCUMENT_AUTHORITY_BLOCKED",
  "DOCUSIGN_REQUEST_NOT_FOUND",
]);
const COMPLETION_AUTHORITY_QUARANTINE_SCHEMA = "law-firm-os.dms-completion-authority-quarantine.v1";
const MAX_UPLOAD_INTENT_GENERATIONS = 32;
const UPLOAD_INTENT_RETIREMENT_EVENT = "dms.upload_intent.retired";
const UPLOAD_INTENT_FAMILY_OBJECT = "DmsUploadIntentFamily";
const UPLOAD_INTENT_RETIREMENT_SCHEMA = "law-firm-os.dms-upload-intent-retirement.v1";
const UPLOAD_INTENT_CANONICAL_ENVELOPE_FIELDS = Object.freeze([
  "schema_version",
  "family_id",
  "identity_hash",
  "document_id",
  "matter_id",
  "workspace_id",
  "expected_sha256",
  "expected_byte_size",
  "permission_envelope_id",
  "audit_trace_id",
  "actor_id",
]);

function requiredText(value, field) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function requiredSha256(value, field) {
  const normalized = requiredText(value, field);
  if (!/^[a-f0-9]{64}$/u.test(normalized)) throw new TypeError(`${field} must be a lowercase SHA-256 digest`);
  return normalized;
}

function requiredByteSize(value) {
  const size = Number(value);
  if (!Number.isSafeInteger(size) || size < 0) throw new TypeError("expected_byte_size must be a non-negative integer");
  return size;
}

function requiredVersionNumber(value = 1) {
  const version = Number(value);
  if (!Number.isSafeInteger(version) || version < 1) throw new TypeError("version_number must be a positive integer");
  return version;
}

function timestamp(clock) {
  const value = typeof clock === "function" ? clock() : clock;
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) throw new TypeError("DMS runtime clock must return a valid date");
  return date.toISOString();
}

function requiredTimestamp(value, field) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new TypeError(`${field} must be a valid timestamp`);
  return date.toISOString();
}

function hashValue(value) {
  return createHash("sha256").update(stableJsonStringify(value)).digest("hex");
}

function requiredUploadIntentGeneration(value, field = "generation", maxGenerations = MAX_UPLOAD_INTENT_GENERATIONS) {
  const generation = Number(value);
  if (!Number.isSafeInteger(generation) || generation < 0 || generation >= maxGenerations) {
    throw new TypeError(`${field} must be a supported upload intent generation`);
  }
  return generation;
}

function uploadIntentGenerationIds({ family_id, document_id, generation, max_generations = MAX_UPLOAD_INTENT_GENERATIONS } = {}) {
  const familyId = requiredText(family_id, "family_id");
  const documentId = requiredText(document_id, "document_id");
  const boundedGeneration = requiredUploadIntentGeneration(generation, "generation", max_generations);
  const familyRef = hashValue({ family_id: familyId });
  const versionId = `version:${documentId}:outlook-attempt:${boundedGeneration}`;
  return Object.freeze({
    generation: boundedGeneration,
    session_id: `dms-upload:outlook-mime:${familyRef}:g${boundedGeneration}`,
    idempotency_key: `outlook-original-mime:${familyRef}:g${boundedGeneration}`,
    version_id: versionId,
    object_id: `object:${versionId}`,
  });
}

function uploadIntentRetirementEventId(familyId, generation) {
  return `audit:dms-upload-intent:${hashValue({ family_id: familyId })}:g${generation}:retired`;
}

function unsignedUploadIntentRetirementPayload(payload = {}) {
  return Object.freeze({
    schema_version: payload.schema_version,
    family_id: payload.family_id,
    identity_hash: payload.identity_hash,
    document_id: payload.document_id,
    matter_id: payload.matter_id,
    workspace_id: payload.workspace_id,
    expected_sha256: payload.expected_sha256,
    expected_byte_size: Number(payload.expected_byte_size),
    permission_envelope_id: payload.permission_envelope_id,
    audit_trace_id: payload.audit_trace_id,
    actor_id: payload.actor_id,
    generation: Number(payload.generation),
    next_generation: Number(payload.next_generation),
    prior_session_id: payload.prior_session_id,
    prior_idempotency_key: payload.prior_idempotency_key,
    prior_request_hash: payload.prior_request_hash,
    prior_version_id: payload.prior_version_id,
    prior_object_id: payload.prior_object_id,
    prior_receipt_hash: payload.prior_receipt_hash ?? null,
    next_session_id: payload.next_session_id,
    next_idempotency_key: payload.next_idempotency_key,
    next_version_id: payload.next_version_id,
    next_object_id: payload.next_object_id,
    retired_at: payload.retired_at,
  });
}

function uploadIntentRetirementReceiptHash(payload = {}) {
  return hashValue(unsignedUploadIntentRetirementPayload(payload));
}

function codedError(message, code, status = 409, details = {}) {
  return Object.assign(new Error(message), {
    code: code.startsWith("LAWOS_") ? code : `LAWOS_${code}`,
    safe_error_code: code.replace(/^LAWOS_/u, ""),
    status,
    ...details,
  });
}

function safeErrorCode(error, fallback) {
  const code = error?.safe_error_code ?? error?.code;
  return typeof code === "string" && /^[A-Z0-9_]+$/u.test(code) ? code : fallback;
}

function isCompletionAuthorityRejection(error) {
  return error?.completion_authority_rejection === true
    || COMPLETION_AUTHORITY_REJECTION_CODES.has(safeErrorCode(error, ""));
}

function classifyMetadataCommitError(error, stage) {
  const hasSafeErrorCode = typeof error?.safe_error_code === "string"
    && /^[A-Z0-9_]+$/u.test(error.safe_error_code);
  const hasLawosCode = typeof error?.code === "string"
    && /^LAWOS_[A-Z0-9_:]+$/u.test(error.code);
  if (hasSafeErrorCode || hasLawosCode) return error;
  return codedError(
    "DMS metadata publication failed",
    `DMS_METADATA_${stage}_FAILED`,
    500,
  );
}

function uploadSessionIdentityConflict() {
  return codedError(
    "DMS upload session identity conflicts with existing state",
    "DMS_UPLOAD_SESSION_IDENTITY_CONFLICT",
  );
}

function rowToSession(row) {
  if (!row) return null;
  return Object.freeze({
    ...row,
    version_number: Number(row.version_number),
    expected_byte_size: Number(row.expected_byte_size),
    staged_byte_size: row.staged_byte_size == null ? null : Number(row.staged_byte_size),
    attempt_count: Number(row.attempt_count),
    reconciliation_attempt_count: Number(row.reconciliation_attempt_count ?? 0),
    expires_at: new Date(row.expires_at).toISOString(),
    stage_lease_expires_at: row.stage_lease_expires_at ? new Date(row.stage_lease_expires_at).toISOString() : null,
    provider_finalize_lease_expires_at: row.provider_finalize_lease_expires_at ? new Date(row.provider_finalize_lease_expires_at).toISOString() : null,
    provider_finalized_at: row.provider_finalized_at ? new Date(row.provider_finalized_at).toISOString() : null,
    reconcile_lease_expires_at: row.reconcile_lease_expires_at ? new Date(row.reconcile_lease_expires_at).toISOString() : null,
    next_attempt_at: row.next_attempt_at ? new Date(row.next_attempt_at).toISOString() : null,
    failed_terminal_at: row.failed_terminal_at ? new Date(row.failed_terminal_at).toISOString() : null,
    metadata_committed_at: row.metadata_committed_at ? new Date(row.metadata_committed_at).toISOString() : null,
    finalized_at: row.finalized_at ? new Date(row.finalized_at).toISOString() : null,
    orphan_deleted_at: row.orphan_deleted_at ? new Date(row.orphan_deleted_at).toISOString() : null,
    created_at: new Date(row.created_at).toISOString(),
    updated_at: new Date(row.updated_at).toISOString(),
  });
}

async function selectSession(client, tenantId, sessionId, { lock = false } = {}) {
  const result = await client.query(
    `SELECT *
       FROM lawos_dms.upload_sessions
      WHERE tenant_id = $1 AND session_id = $2${lock ? " FOR UPDATE" : ""}`,
    [tenantId, sessionId],
  );
  if (!result.rows[0]) throw codedError("DMS upload session was not found", "DMS_UPLOAD_SESSION_NOT_FOUND", 404);
  return rowToSession(result.rows[0]);
}

async function appendAudit(client, input) {
  await client.query(
    `INSERT INTO lawos_dms.audit_events
       (tenant_id, event_id, event_type, actor_id, object_type, object_id, payload, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::timestamptz)
     ON CONFLICT (tenant_id, event_id) DO NOTHING`,
    [
      input.tenant_id,
      input.event_id,
      input.event_type,
      input.actor_id,
      input.object_type,
      input.object_id,
      JSON.stringify(input.payload ?? {}),
      input.created_at,
    ],
  );
}

function assertReceiptMatchesSession(receipt, session) {
  if (!receipt) throw codedError("staged DMS object was not found", "DMS_UPLOAD_BYTES_NOT_STAGED", 409);
  if (receipt.sha256 !== session.expected_sha256 || Number(receipt.byte_size) !== session.expected_byte_size) {
    throw codedError("staged DMS object does not match upload session", "DMS_STAGED_DIGEST_MISMATCH", 409);
  }
  if (receipt.tenant_id && receipt.tenant_id !== session.tenant_id) {
    throw codedError("storage receipt belongs to a different tenant", "DMS_STORAGE_TENANT_MISMATCH", 409);
  }
}

export function createPostgresDmsUploadRuntime({
  pool,
  storage,
  sourceOnly = true,
  clock = () => new Date(),
  idFactory = randomUUID,
  faultInjector,
  stageLeaseMillis = 5 * 60 * 1_000,
  finalizeLeaseMillis = 5 * 60 * 1_000,
  reconcileLeaseMillis = 5 * 60 * 1_000,
  maxReconciliationAttempts = 5,
  reconciliationBackoffMillis = 1_000,
  maxUploadIntentGenerations = MAX_UPLOAD_INTENT_GENERATIONS,
  workerId = `dms-worker:${idFactory()}`,
  transactionOptions = {},
  verifyPermanentDeleteApproval = null,
} = {}) {
  if (!pool || typeof pool.connect !== "function") throw new TypeError("PostgreSQL pool is required");
  assertStagedStorageAdapter(storage);
  for (const capability of ["staged_uploads", "digest_verification", "orphan_cleanup"]) {
    if (storage.capabilities[capability] !== true) {
      throw new TypeError(`DMS upload runtime requires storage capability ${capability}`);
    }
  }
  if (!Number.isSafeInteger(stageLeaseMillis) || stageLeaseMillis < 1_000) {
    throw new TypeError("stageLeaseMillis must be an integer of at least 1000 milliseconds");
  }
  for (const [value, name] of [[finalizeLeaseMillis, "finalizeLeaseMillis"], [reconcileLeaseMillis, "reconcileLeaseMillis"], [reconciliationBackoffMillis, "reconciliationBackoffMillis"]]) {
    if (!Number.isSafeInteger(value) || value < 1_000) throw new TypeError(`${name} must be an integer of at least 1000 milliseconds`);
  }
  if (!Number.isSafeInteger(maxReconciliationAttempts) || maxReconciliationAttempts < 1) {
    throw new TypeError("maxReconciliationAttempts must be a positive integer");
  }
  if (!Number.isSafeInteger(maxUploadIntentGenerations) || maxUploadIntentGenerations < 2) {
    throw new TypeError("maxUploadIntentGenerations must be an integer of at least 2");
  }
  const runtimeWorkerId = requiredText(workerId, "workerId");

  const transact = (tenantId, callback, options = {}) => withPostgresTransaction(
    pool,
    { ...transactionOptions, ...options, tenant_id: tenantId },
    callback,
  );

  async function quarantineCompletionAuthorityUpload(session, error) {
    const quarantinedAt = timestamp(clock);
    const safeCode = safeErrorCode(error, "DMS_COMPLETION_AUTHORITY_REJECTED");
    const initialReceipt = {
      schema_version: COMPLETION_AUTHORITY_QUARANTINE_SCHEMA,
      kind: "completion_authority_rejection",
      session_id: session.session_id,
      object_id: session.object_id,
      expected_sha256: session.expected_sha256,
      safe_error_code: safeCode,
      quarantined_at: quarantinedAt,
      cleanup_state: "pending",
    };
    let terminal;
    try {
      terminal = await transact(session.tenant_id, async (client) => {
        const locked = await selectSession(client, session.tenant_id, session.session_id, { lock: true });
        if (locked.state === "finalized") return locked;
        if (locked.state === "failed_terminal" && locked.dead_letter_receipt?.schema_version === COMPLETION_AUTHORITY_QUARANTINE_SCHEMA) return locked;
        const result = await client.query(
          `UPDATE lawos_dms.upload_sessions
              SET state = 'failed_terminal', retryable = false,
                  provider_finalize_owner = NULL, provider_finalize_token = NULL,
                  provider_finalize_lease_expires_at = NULL,
                  stage_lease_owner = NULL, stage_lease_token = NULL,
                  stage_lease_expires_at = NULL,
                  reconcile_owner = NULL, reconcile_lease_expires_at = NULL,
                  next_attempt_at = $3::timestamptz, last_error_code = $4,
                  failed_terminal_at = $3::timestamptz,
                  dead_letter_receipt = $5::jsonb, updated_at = $3::timestamptz
            WHERE tenant_id = $1 AND session_id = $2
            RETURNING *`,
          [session.tenant_id, session.session_id, quarantinedAt, safeCode, JSON.stringify(initialReceipt)],
        );
        return rowToSession(result.rows[0]);
      });
    } catch (quarantineError) {
      error.quarantine_error_code = safeErrorCode(quarantineError, "DMS_COMPLETION_AUTHORITY_QUARANTINE_FAILED");
      return null;
    }
    if (!terminal || terminal.state === "finalized") return terminal;

    let cleanupState = "deleted";
    let cleanupErrorCode = null;
    let committedObjectDeleted = false;
    let stagedObjectDeleted = false;
    try {
      const committed = await storage.statObject({ tenant_id: terminal.tenant_id, object_id: terminal.object_id });
      if (committed) {
        const deletion = await storage.deleteCommittedObject({ tenant_id: terminal.tenant_id, object_id: terminal.object_id, expected_sha256: terminal.expected_sha256 });
        if (!deletion?.deleted && !deletion?.already_absent) throw codedError("quarantined DMS object deletion was not confirmed", "DMS_COMPLETION_AUTHORITY_CLEANUP_UNCONFIRMED", 503);
        committedObjectDeleted = deletion.deleted === true;
      }
      const staged = await storage.statStagedObject({ tenant_id: terminal.tenant_id, session_id: terminal.session_id, object_id: terminal.object_id });
      if (staged) {
        const deletion = await storage.deleteOrphan({ tenant_id: terminal.tenant_id, session_id: terminal.session_id, object_id: terminal.object_id });
        if (deletion?.committed_object_deleted) throw codedError("storage adapter violated quarantine cleanup boundary", "DMS_STORAGE_DELETE_BOUNDARY_VIOLATION", 500);
        stagedObjectDeleted = deletion?.deleted === true;
      }
    } catch (cleanupError) {
      cleanupState = "pending";
      cleanupErrorCode = safeErrorCode(cleanupError, "DMS_COMPLETION_AUTHORITY_CLEANUP_FAILED");
    }
    const finalReceipt = {
      ...initialReceipt,
      cleanup_state: cleanupState,
      cleanup_error_code: cleanupErrorCode,
      committed_object_deleted: committedObjectDeleted,
      staged_object_deleted: stagedObjectDeleted,
    };
    try {
      await transact(terminal.tenant_id, (client) => client.query(
        `UPDATE lawos_dms.upload_sessions
            SET dead_letter_receipt = $3::jsonb, updated_at = $4::timestamptz
          WHERE tenant_id = $1 AND session_id = $2 AND state = 'failed_terminal'`,
        [terminal.tenant_id, terminal.session_id, JSON.stringify(finalReceipt), quarantinedAt],
      ));
    } catch (quarantineError) {
      error.quarantine_error_code = safeErrorCode(quarantineError, "DMS_COMPLETION_AUTHORITY_QUARANTINE_FAILED");
    }
    return Object.freeze({ ...terminal, dead_letter_receipt: finalReceipt });
  }

  async function getUploadSession({ tenant_id, session_id } = {}) {
    const tenantId = requiredText(tenant_id, "tenant_id");
    const sessionId = requiredText(session_id, "session_id");
    return transact(tenantId, (client) => selectSession(client, tenantId, sessionId), { readOnly: true });
  }

  async function selectUploadIntentRetirementChain(client, tenantId, familyId) {
    const result = await client.query(
      `SELECT event_id, actor_id, payload, created_at
         FROM lawos_dms.audit_events
        WHERE tenant_id = $1
          AND event_type = $2
          AND object_type = $3
          AND object_id = $4
        ORDER BY
          CASE
            WHEN payload->>'generation' ~ '^[0-9]+$' THEN (payload->>'generation')::numeric
            ELSE 9223372036854775807::numeric
          END ASC,
          created_at ASC,
          event_id ASC`,
      [tenantId, UPLOAD_INTENT_RETIREMENT_EVENT, UPLOAD_INTENT_FAMILY_OBJECT, familyId],
    );
    return Object.freeze(result.rows.map((row) => Object.freeze({
      ...row.payload,
      event_id: row.event_id,
      actor_id: row.actor_id,
      created_at: new Date(row.created_at).toISOString(),
    })));
  }

  async function selectUploadIntentRetirementSessions(client, tenantId, receipts) {
    const sessionIds = [...new Set(
      receipts
        .map((receipt) => receipt.prior_session_id)
        .filter((sessionId) => typeof sessionId === "string" && sessionId.trim() !== ""),
    )];
    if (!sessionIds.length) return new Map();
    const result = await client.query(
      `SELECT *
         FROM lawos_dms.upload_sessions
        WHERE tenant_id = $1
          AND session_id = ANY($2::text[])`,
      [tenantId, sessionIds],
    );
    return new Map(result.rows.map((row) => [row.session_id, rowToSession(row)]));
  }

  function assertRetirementMatchesSession(receipt, session) {
    if (!session
      || session.state !== "expired"
      || !session.orphan_deleted_at
      || receipt.prior_session_id !== session.session_id
      || receipt.prior_idempotency_key !== session.idempotency_key
      || receipt.prior_request_hash !== session.request_hash
      || receipt.matter_id !== session.matter_id
      || receipt.workspace_id !== session.workspace_id
      || receipt.document_id !== session.document_id
      || receipt.prior_version_id !== session.version_id
      || receipt.prior_object_id !== session.object_id
      || receipt.expected_sha256 !== session.expected_sha256
      || Number(receipt.expected_byte_size) !== session.expected_byte_size
      || receipt.permission_envelope_id !== session.permission_envelope_id
      || receipt.audit_trace_id !== session.audit_trace_id
      || receipt.actor_id !== session.actor_id) {
      throw codedError(
        "DMS upload intent retirement receipt does not match its retained expired session",
        "DMS_UPLOAD_INTENT_RETIREMENT_CONFLICT",
      );
    }
  }

  function validatedUploadIntentRetirement(receipt, {
    familyId,
    documentId,
    identityHash,
    expectedGeneration = null,
    priorReceiptHash = null,
    canonicalEnvelope = null,
    maxUploadIntentGenerations = MAX_UPLOAD_INTENT_GENERATIONS,
  }) {
    if (!receipt) return null;
    const generation = requiredUploadIntentGeneration(
      receipt.generation,
      "retirement generation",
      maxUploadIntentGenerations,
    );
    const nextGenerationValue = Number(receipt.next_generation);
    if (!Number.isSafeInteger(nextGenerationValue) || nextGenerationValue !== generation + 1) {
      throw codedError(
        "DMS upload intent retirement generations are not contiguous",
        "DMS_UPLOAD_INTENT_RETIREMENT_CONFLICT",
      );
    }
    if (nextGenerationValue >= maxUploadIntentGenerations) {
      throw codedError(
        "DMS upload intent retirement generation limit has been exhausted",
        "DMS_UPLOAD_INTENT_GENERATION_EXHAUSTED",
      );
    }
    const nextGeneration = requiredUploadIntentGeneration(
      nextGenerationValue,
      "retirement next_generation",
      maxUploadIntentGenerations,
    );
    const currentIds = uploadIntentGenerationIds({
      family_id: familyId,
      document_id: documentId,
      generation,
      max_generations: maxUploadIntentGenerations,
    });
    const nextIds = uploadIntentGenerationIds({
      family_id: familyId,
      document_id: documentId,
      generation: nextGeneration,
      max_generations: maxUploadIntentGenerations,
    });
    const canonicalFieldsMatch = !canonicalEnvelope || UPLOAD_INTENT_CANONICAL_ENVELOPE_FIELDS.every(
      (field) => receipt[field] === canonicalEnvelope[field],
    );
    const canonicalEnvelopeShapeValid = [
      receipt.matter_id,
      receipt.workspace_id,
      receipt.permission_envelope_id,
      receipt.audit_trace_id,
      receipt.actor_id,
    ].every((value) => typeof value === "string" && value.trim() !== "")
      && /^[a-f0-9]{64}$/u.test(receipt.expected_sha256 ?? "")
      && Number.isSafeInteger(Number(receipt.expected_byte_size))
      && Number(receipt.expected_byte_size) >= 0;
    if (
      receipt.schema_version !== UPLOAD_INTENT_RETIREMENT_SCHEMA
      || receipt.family_id !== familyId
      || receipt.document_id !== documentId
      || receipt.identity_hash !== identityHash
      || (expectedGeneration != null && generation !== expectedGeneration)
      || (generation === 0 ? receipt.prior_receipt_hash !== null : receipt.prior_receipt_hash !== priorReceiptHash)
      || receipt.prior_session_id !== currentIds.session_id
      || receipt.prior_idempotency_key !== currentIds.idempotency_key
      || receipt.prior_version_id !== currentIds.version_id
      || receipt.prior_object_id !== currentIds.object_id
      || nextGeneration !== generation + 1
      || receipt.event_id !== uploadIntentRetirementEventId(familyId, generation)
      || receipt.next_session_id !== nextIds.session_id
      || receipt.next_idempotency_key !== nextIds.idempotency_key
      || receipt.next_version_id !== nextIds.version_id
      || receipt.next_object_id !== nextIds.object_id
      || !canonicalFieldsMatch
      || !canonicalEnvelopeShapeValid
      || !/^[a-f0-9]{64}$/u.test(receipt.receipt_hash ?? "")
      || receipt.receipt_hash !== uploadIntentRetirementReceiptHash(receipt)
    ) {
      throw codedError(
        "DMS upload intent retirement receipt conflicts with the canonical identity",
        "DMS_UPLOAD_INTENT_RETIREMENT_CONFLICT",
      );
    }
    return Object.freeze({ ...receipt, generation, next_generation: nextGeneration });
  }

  async function validatedUploadIntentRetirementChain(client, tenantId, receipts, context) {
    if (!receipts.length) return Object.freeze([]);
    const canonicalEnvelope = Object.freeze(Object.fromEntries(
      UPLOAD_INTENT_CANONICAL_ENVELOPE_FIELDS.map((field) => [field, receipts[0][field]]),
    ));
    const sessions = await selectUploadIntentRetirementSessions(client, tenantId, receipts);
    const validated = [];
    for (const [index, receipt] of receipts.entries()) {
      const checked = validatedUploadIntentRetirement(receipt, {
        ...context,
        expectedGeneration: index,
        priorReceiptHash: validated[index - 1]?.receipt_hash ?? null,
        canonicalEnvelope,
      });
      assertRetirementMatchesSession(checked, sessions.get(checked.prior_session_id));
      validated.push(checked);
    }
    return Object.freeze(validated);
  }

  async function getLatestUploadIntentRetirement({
    tenant_id,
    family_id,
    document_id,
    identity_hash,
  } = {}) {
    const tenantId = requiredText(tenant_id, "tenant_id");
    const familyId = requiredText(family_id, "family_id");
    const documentId = requiredText(document_id, "document_id");
    const identityHash = requiredSha256(identity_hash, "identity_hash");
    return transact(tenantId, async (client) => {
      const chain = await validatedUploadIntentRetirementChain(
        client,
        tenantId,
        await selectUploadIntentRetirementChain(client, tenantId, familyId),
        { familyId, documentId, identityHash, maxUploadIntentGenerations },
      );
      return chain.at(-1) ?? null;
    }, { readOnly: true });
  }

  async function resolveUploadIntentGeneration(input = {}) {
    const tenantId = requiredText(input.tenant_id, "tenant_id");
    const familyId = requiredText(input.family_id, "family_id");
    const documentId = requiredText(input.document_id, "document_id");
    const identityHash = requiredSha256(input.identity_hash, "identity_hash");
    const latest = await getLatestUploadIntentRetirement({
      tenant_id: tenantId,
      family_id: familyId,
      document_id: documentId,
      identity_hash: identityHash,
    });
    const generation = latest?.next_generation ?? 0;
    return Object.freeze({
      family_id: familyId,
      identity_hash: identityHash,
      prior_receipt_hash: latest?.receipt_hash ?? null,
      ...uploadIntentGenerationIds({
        family_id: familyId,
        document_id: documentId,
        generation,
        max_generations: maxUploadIntentGenerations,
      }),
    });
  }

  function nextUploadExpiry(ttlMillis = 15 * 60 * 1_000) {
    if (!Number.isSafeInteger(ttlMillis) || ttlMillis < 60_000) throw new TypeError("upload ttl must be at least one minute");
    return new Date(Date.parse(timestamp(clock)) + ttlMillis).toISOString();
  }

  function normalizedUploadRequest(input = {}) {
    const adapterId = input.adapter_id
      ? requiredText(input.adapter_id, "adapter_id")
      : storage.adapter_id;
    if (adapterId !== storage.adapter_id) {
      throw codedError("upload session adapter does not match runtime adapter", "DMS_STORAGE_ADAPTER_MISMATCH", 400);
    }
    return Object.freeze({
      tenant_id: requiredText(input.tenant_id, "tenant_id"),
      idempotency_key: requiredText(input.idempotency_key, "idempotency_key"),
      matter_id: requiredText(input.matter_id, "matter_id"),
      workspace_id: requiredText(input.workspace_id, "workspace_id"),
      document_id: requiredText(input.document_id, "document_id"),
      version_id: requiredText(input.version_id, "version_id"),
      version_number: requiredVersionNumber(input.version_number),
      object_id: requiredText(input.object_id, "object_id"),
      adapter_id: adapterId,
      title: requiredText(input.title, "title"),
      content_type: requiredText(input.content_type, "content_type"),
      expected_sha256: requiredSha256(input.expected_sha256, "expected_sha256"),
      expected_byte_size: requiredByteSize(input.expected_byte_size),
      permission_envelope_id: requiredText(input.permission_envelope_id, "permission_envelope_id"),
      audit_trace_id: requiredText(input.audit_trace_id, "audit_trace_id"),
      actor_id: requiredText(input.actor_id, "actor_id"),
      expires_at: requiredTimestamp(input.expires_at, "expires_at"),
    });
  }

  async function createUploadSession(input = {}) {
    const normalized = normalizedUploadRequest(input);
    const tenantId = normalized.tenant_id;
    const idempotencyKey = normalized.idempotency_key;
    const sessionId = input.session_id ? requiredText(input.session_id, "session_id") : `dms-upload:${idFactory()}`;
    const requestHash = hashValue(normalized);
    const createdAt = timestamp(clock);
    const initialNextAttemptAt = input.initial_next_attempt_at == null
      ? createdAt
      : requiredTimestamp(input.initial_next_attempt_at, "initial_next_attempt_at");
    if (input.initial_next_attempt_at != null && initialNextAttemptAt !== normalized.expires_at) {
      throw new TypeError("initial_next_attempt_at must equal expires_at");
    }
    return transact(tenantId, async (client) => {
      const inserted = await client.query(
        `INSERT INTO lawos_dms.upload_sessions
           (tenant_id, session_id, idempotency_key, request_hash, matter_id, workspace_id,
            document_id, version_id, version_number, object_id, adapter_id, title, content_type,
            expected_sha256, expected_byte_size, permission_envelope_id, audit_trace_id, actor_id,
            state, expires_at, next_attempt_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
                 $16, $17, $18, 'pending', $19::timestamptz, $20::timestamptz, $21::timestamptz, $21::timestamptz)
         ON CONFLICT DO NOTHING
         RETURNING *`,
        [
          tenantId,
          sessionId,
          idempotencyKey,
          requestHash,
          normalized.matter_id,
          normalized.workspace_id,
          normalized.document_id,
          normalized.version_id,
          normalized.version_number,
          normalized.object_id,
          normalized.adapter_id,
          normalized.title,
          normalized.content_type,
          normalized.expected_sha256,
          normalized.expected_byte_size,
          normalized.permission_envelope_id,
          normalized.audit_trace_id,
          normalized.actor_id,
          normalized.expires_at,
          initialNextAttemptAt,
          createdAt,
        ],
      );
      if (inserted.rowCount === 0) {
        const existing = await client.query(
          `SELECT * FROM lawos_dms.upload_sessions
            WHERE tenant_id = $1 AND idempotency_key = $2`,
          [tenantId, idempotencyKey],
        );
        if (!existing.rows[0]) throw uploadSessionIdentityConflict();
        if (existing.rows[0]?.request_hash !== requestHash) {
          throw codedError("DMS upload idempotency key was reused with a different request", "DMS_IDEMPOTENCY_CONFLICT");
        }
        return Object.freeze({ session: rowToSession(existing.rows[0]), replayed: true });
      }
      await client.query(
        `INSERT INTO lawos_dms.idempotency_keys
           (tenant_id, idempotency_key, operation, request_hash, response, created_at)
         VALUES ($1, $2, 'dms.upload.create', $3, $4::jsonb, $5::timestamptz)`,
        [tenantId, idempotencyKey, requestHash, JSON.stringify({ session_id: sessionId }), createdAt],
      );
      await appendAudit(client, {
        tenant_id: tenantId,
        event_id: `audit:${sessionId}:created`,
        event_type: "dms.upload_session.created",
        actor_id: normalized.actor_id,
        object_type: "DmsUploadSession",
        object_id: sessionId,
        payload: { state: "pending", document_id: normalized.document_id },
        created_at: createdAt,
      });
      return Object.freeze({ session: rowToSession(inserted.rows[0]), replayed: false });
    });
  }

  function assertUploadIntentRolloverIdentity(session, expected) {
    if (
      session.matter_id !== requiredText(expected.matter_id, "matter_id")
      || session.workspace_id !== requiredText(expected.workspace_id, "workspace_id")
      || session.document_id !== requiredText(expected.document_id, "document_id")
      || session.title !== requiredText(expected.title, "title")
      || session.content_type !== "message/rfc822"
      || session.expected_sha256 !== requiredSha256(expected.expected_sha256, "expected_sha256")
      || session.expected_byte_size !== requiredByteSize(expected.expected_byte_size)
      || session.permission_envelope_id !== requiredText(expected.permission_envelope_id, "permission_envelope_id")
      || session.audit_trace_id !== requiredText(expected.audit_trace_id, "audit_trace_id")
      || session.actor_id !== requiredText(expected.actor_id, "actor_id")
    ) {
      throw codedError(
        "DMS upload intent rollover identity conflicts with the prior generation",
        "DMS_UPLOAD_INTENT_IDENTITY_CONFLICT",
      );
    }
  }

  async function assertUploadIntentRolloverUncommitted(client, session, now) {
    if (
      session.state !== "expired"
      || !session.orphan_deleted_at
      || session.reconcile_owner
      || session.reconcile_lease_expires_at
      || session.stage_lease_owner
      || session.stage_lease_token
      || session.stage_lease_expires_at
      || session.provider_finalize_owner
      || session.provider_finalize_token
      || session.provider_finalize_lease_expires_at
      || session.provider_receipt
      || session.provider_finalized_at
      || session.metadata_committed_at
      || session.finalized_at
    ) {
      throw codedError(
        "DMS upload intent is not ready for a new generation",
        "DMS_UPLOAD_INTENT_ROLLOVER_NOT_READY",
      );
    }
    const protectedResult = await client.query(
      `SELECT
         EXISTS (
           SELECT 1 FROM lawos_dms.documents
            WHERE tenant_id = $1 AND document_id = $2
         ) AS document_exists,
         EXISTS (
           SELECT 1 FROM lawos_dms.document_versions
            WHERE tenant_id = $1 AND version_id = $3
         ) AS version_exists,
         EXISTS (
           SELECT 1 FROM lawos_dms.file_objects
            WHERE tenant_id = $1 AND object_id = $4
         ) AS file_object_exists,
         EXISTS (
           SELECT 1 FROM lawos_dms.legal_holds
            WHERE tenant_id = $1 AND document_id = $2 AND status = 'active'
         ) AS held,
         EXISTS (
           SELECT 1 FROM lawos_dms.retention_policies
            WHERE tenant_id = $1 AND document_id = $2 AND retain_until > $5::timestamptz
         ) AS retained`,
      [session.tenant_id, session.document_id, session.version_id, session.object_id, now],
    );
    if (Object.values(protectedResult.rows[0] ?? {}).some(Boolean)) {
      throw codedError(
        "DMS upload intent rollover is blocked by committed or governed evidence",
        "DMS_UPLOAD_INTENT_ROLLOVER_BLOCKED",
      );
    }
  }

  async function rolloverExpiredUploadIntent({
    tenant_id,
    family_id,
    identity_hash,
    session_id,
    expected = {},
  } = {}) {
    const tenantId = requiredText(tenant_id, "tenant_id");
    const familyId = requiredText(family_id, "family_id");
    const identityHash = requiredSha256(identity_hash, "identity_hash");
    const sessionId = requiredText(session_id, "session_id");
    const documentId = requiredText(expected.document_id, "document_id");
    const retiredAt = timestamp(clock);
    return transact(tenantId, async (client) => {
      const locked = await selectSession(client, tenantId, sessionId, { lock: true });
      assertUploadIntentRolloverIdentity(locked, expected);
      const chain = await validatedUploadIntentRetirementChain(
        client,
        tenantId,
        await selectUploadIntentRetirementChain(client, tenantId, familyId),
        { familyId, documentId, identityHash, maxUploadIntentGenerations },
      );
      const latest = chain.at(-1) ?? null;
      if (latest?.prior_session_id === sessionId) return latest;
      const generation = latest?.next_generation ?? 0;
      const currentIds = uploadIntentGenerationIds({
        family_id: familyId,
        document_id: documentId,
        generation,
        max_generations: maxUploadIntentGenerations,
      });
      if (
        locked.session_id !== currentIds.session_id
        || locked.idempotency_key !== currentIds.idempotency_key
        || locked.version_id !== currentIds.version_id
        || locked.object_id !== currentIds.object_id
      ) {
        throw codedError(
          "DMS upload intent generation does not match the retirement chain",
          "DMS_UPLOAD_INTENT_RETIREMENT_CONFLICT",
        );
      }
      await assertUploadIntentRolloverUncommitted(client, locked, retiredAt);
      const nextGeneration = generation + 1;
      if (nextGeneration >= maxUploadIntentGenerations) {
        throw codedError(
          "DMS upload intent retirement generation limit has been exhausted",
          "DMS_UPLOAD_INTENT_GENERATION_EXHAUSTED",
        );
      }
      const nextIds = uploadIntentGenerationIds({
        family_id: familyId,
        document_id: documentId,
        generation: nextGeneration,
        max_generations: maxUploadIntentGenerations,
      });
      const unsignedPayload = unsignedUploadIntentRetirementPayload({
        schema_version: UPLOAD_INTENT_RETIREMENT_SCHEMA,
        family_id: familyId,
        identity_hash: identityHash,
        document_id: documentId,
        matter_id: locked.matter_id,
        workspace_id: locked.workspace_id,
        expected_sha256: locked.expected_sha256,
        expected_byte_size: locked.expected_byte_size,
        permission_envelope_id: locked.permission_envelope_id,
        audit_trace_id: locked.audit_trace_id,
        actor_id: locked.actor_id,
        generation,
        next_generation: nextGeneration,
        prior_session_id: locked.session_id,
        prior_idempotency_key: locked.idempotency_key,
        prior_request_hash: locked.request_hash,
        prior_version_id: locked.version_id,
        prior_object_id: locked.object_id,
        prior_receipt_hash: latest?.receipt_hash ?? null,
        next_session_id: nextIds.session_id,
        next_idempotency_key: nextIds.idempotency_key,
        next_version_id: nextIds.version_id,
        next_object_id: nextIds.object_id,
        retired_at: retiredAt,
      });
      const payload = Object.freeze({
        ...unsignedPayload,
        receipt_hash: uploadIntentRetirementReceiptHash(unsignedPayload),
      });
      const eventId = uploadIntentRetirementEventId(familyId, generation);
      await appendAudit(client, {
        tenant_id: tenantId,
        event_id: eventId,
        event_type: UPLOAD_INTENT_RETIREMENT_EVENT,
        actor_id: locked.actor_id,
        object_type: UPLOAD_INTENT_FAMILY_OBJECT,
        object_id: familyId,
        payload,
        created_at: retiredAt,
      });
      const recordedChain = await validatedUploadIntentRetirementChain(
        client,
        tenantId,
        await selectUploadIntentRetirementChain(client, tenantId, familyId),
        { familyId, documentId, identityHash, maxUploadIntentGenerations },
      );
      const recorded = recordedChain.at(-1) ?? null;
      if (recorded?.event_id !== eventId || recorded?.receipt_hash !== payload.receipt_hash) {
        throw codedError(
          "DMS upload intent retirement receipt was not recorded atomically",
          "DMS_UPLOAD_INTENT_RETIREMENT_CONFLICT",
        );
      }
      return recorded;
    });
  }

  async function assertIndependentDigest(session, { staged }) {
    const digest = await storage.digestObject({
      tenant_id: session.tenant_id,
      session_id: staged ? session.session_id : undefined,
      object_id: session.object_id,
    });
    assertReceiptMatchesSession(digest, session);
    return digest;
  }

  async function markBytesStored(session, receipt, { eventActor = session.actor_id, leaseToken = null } = {}) {
    assertReceiptMatchesSession(receipt, session);
    const updatedAt = timestamp(clock);
    return transact(session.tenant_id, async (client) => {
      const locked = await selectSession(client, session.tenant_id, session.session_id, { lock: true });
      if (["bytes_stored", "provider_finalizing", "provider_finalized", "finalized"].includes(locked.state)) return locked;
      if (["expired", "failed_terminal"].includes(locked.state)) {
        throw codedError("terminal DMS upload cannot accept bytes", "DMS_UPLOAD_SESSION_EXPIRED");
      }
      if (leaseToken && locked.stage_lease_token !== leaseToken) {
        throw codedError("DMS upload stage lease was lost", "DMS_UPLOAD_STAGE_LEASE_LOST");
      }
      if (!leaseToken && locked.stage_lease_expires_at && Date.parse(locked.stage_lease_expires_at) > Date.parse(updatedAt)) {
        throw codedError("DMS upload stage lease is already active", "DMS_UPLOAD_STAGE_LEASE_ACTIVE");
      }
      const result = await client.query(
        `UPDATE lawos_dms.upload_sessions
            SET state = 'bytes_stored', staged_sha256 = $3, staged_byte_size = $4,
                retryable = true, attempt_count = attempt_count + 1,
                stage_lease_owner = NULL, stage_lease_token = NULL, stage_lease_expires_at = NULL,
                last_error_code = NULL, next_attempt_at = $5::timestamptz, updated_at = $5::timestamptz
          WHERE tenant_id = $1 AND session_id = $2
            AND ($6::text IS NULL OR stage_lease_token = $6)
          RETURNING *`,
        [session.tenant_id, session.session_id, receipt.sha256, receipt.byte_size, updatedAt, leaseToken],
      );
      if (!result.rows[0]) throw codedError("DMS upload stage compare-and-swap failed", "DMS_UPLOAD_STAGE_LEASE_LOST");
      await appendAudit(client, {
        tenant_id: session.tenant_id,
        event_id: `audit:${session.session_id}:bytes-stored`,
        event_type: "dms.upload_session.bytes_stored",
        actor_id: eventActor,
        object_type: "DmsUploadSession",
        object_id: session.session_id,
        payload: { state: "bytes_stored", sha256: receipt.sha256, byte_size: receipt.byte_size },
        created_at: updatedAt,
      });
      return rowToSession(result.rows[0]);
    });
  }

  async function recordStageFailure(session, leaseToken, error) {
    const updatedAt = timestamp(clock);
    await transact(session.tenant_id, (client) => client.query(
      `UPDATE lawos_dms.upload_sessions
          SET state = CASE WHEN state IN ('pending', 'failed') THEN 'failed' ELSE state END,
              retryable = CASE WHEN state IN ('pending', 'failed') THEN true ELSE retryable END,
              attempt_count = attempt_count + 1,
              stage_lease_owner = NULL, stage_lease_token = NULL, stage_lease_expires_at = NULL,
              last_error_code = $4, updated_at = $5::timestamptz
        WHERE tenant_id = $1 AND session_id = $2 AND stage_lease_token = $3`,
      [session.tenant_id, session.session_id, leaseToken, safeErrorCode(error, "DMS_STORAGE_STAGE_FAILED"), updatedAt],
    ));
  }

  async function stageUpload({ tenant_id, session_id, bytes, beforePersist } = {}) {
    const tenantId = requiredText(tenant_id, "tenant_id");
    const sessionId = requiredText(session_id, "session_id");
    const buffer = Buffer.isBuffer(bytes) ? Buffer.from(bytes) : Buffer.from(bytes ?? []);
    const stageStartedAt = timestamp(clock);
    const leaseToken = `stage-lease:${idFactory()}`;
    const leaseExpiresAt = new Date(Date.parse(stageStartedAt) + stageLeaseMillis).toISOString();
    const session = await transact(tenantId, async (client) => {
      const locked = await selectSession(client, tenantId, sessionId, { lock: true });
      if (["bytes_stored", "provider_finalizing", "provider_finalized", "finalized"].includes(locked.state)) {
        return Object.freeze({ ...locked, replayed_before_io: true });
      }
      if (["expired", "failed_terminal"].includes(locked.state) || Date.parse(locked.expires_at) <= Date.parse(stageStartedAt)) {
        throw codedError("DMS upload session expired before staging began", "DMS_UPLOAD_SESSION_EXPIRED");
      }
      if (!["pending", "failed"].includes(locked.state)) throw codedError("DMS upload cannot enter staging from its current state", "DMS_UPLOAD_INVALID_STATE");
      if (locked.stage_lease_expires_at && Date.parse(locked.stage_lease_expires_at) > Date.parse(stageStartedAt)) {
        throw codedError("DMS upload stage lease is already active", "DMS_UPLOAD_STAGE_LEASE_ACTIVE");
      }
      if (typeof beforePersist === "function") await beforePersist({ phase: "before_stage", session: locked, bytes: buffer });
      const result = await client.query(
        `UPDATE lawos_dms.upload_sessions
            SET stage_lease_owner = $3, stage_lease_token = $4,
                stage_lease_expires_at = $5::timestamptz, retryable = false,
                next_attempt_at = $5::timestamptz, updated_at = $6::timestamptz
          WHERE tenant_id = $1 AND session_id = $2
          RETURNING *`,
        [tenantId, sessionId, runtimeWorkerId, leaseToken, leaseExpiresAt, stageStartedAt],
      );
      return rowToSession(result.rows[0]);
    });
    if (session.replayed_before_io) return Object.freeze({ session: rowToSession(session), replayed: true });
    if (sha256Hex(buffer) !== session.expected_sha256 || buffer.byteLength !== session.expected_byte_size) {
      await recordStageFailure(session, leaseToken, codedError("DMS upload bytes do not match the declared digest and size", "DMS_STAGED_DIGEST_MISMATCH", 400));
      throw codedError("DMS upload bytes do not match the declared digest and size", "DMS_STAGED_DIGEST_MISMATCH", 400);
    }
    let receipt;
    let replayed = false;
    try {
      if (typeof beforePersist === "function") await beforePersist({ phase: "before_storage", session });
      receipt = await storage.statStagedObject({ tenant_id: session.tenant_id, session_id: session.session_id, object_id: session.object_id });
      if (!receipt) {
        receipt = await storage.stageObject({
          tenant_id: session.tenant_id,
          session_id: session.session_id,
          object_id: session.object_id,
          bytes: buffer,
          content_type: session.content_type,
          expected_sha256: session.expected_sha256,
        });
      } else {
        replayed = true;
      }
      assertReceiptMatchesSession(receipt, session);
      await assertIndependentDigest(session, { staged: true });
      faultInjector?.("after_storage_stage_before_db_update", { session_id: session.session_id });
      const updated = await markBytesStored(session, receipt, { leaseToken });
      return Object.freeze({ session: updated, receipt, replayed });
    } catch (error) {
      await recordStageFailure(session, leaseToken, error);
      if (["DMS_UPLOAD_STAGE_LEASE_LOST", "DMS_UPLOAD_SESSION_EXPIRED"].includes(error?.safe_error_code)) {
        await storage.deleteOrphan({ tenant_id: session.tenant_id, session_id: session.session_id, object_id: session.object_id });
      }
      throw error;
    }
  }

  async function ensureBytesStored(session) {
    if (["bytes_stored", "provider_finalizing", "provider_finalized", "finalized"].includes(session.state)) return session;
    const receipt = await storage.statStagedObject({ tenant_id: session.tenant_id, session_id: session.session_id, object_id: session.object_id });
    assertReceiptMatchesSession(receipt, session);
    await assertIndependentDigest(session, { staged: true });
    return markBytesStored(session, receipt, { eventActor: "dms-reconciler" });
  }

  async function commitMetadata(session, beforePersist) {
    let stage = "CLOCK";
    let committedAt;
    try {
      committedAt = timestamp(clock);
    } catch (error) {
      throw classifyMetadataCommitError(error, stage);
    }
    return transact(session.tenant_id, async (client) => {
      stage = "SESSION_READ";
      const locked = await selectSession(client, session.tenant_id, session.session_id, { lock: true });
      if (locked.state === "finalized") return locked;
      if (locked.state !== "provider_finalized") {
        throw codedError("DMS metadata publication requires finalized provider bytes", "DMS_UPLOAD_INVALID_STATE");
      }
      if (locked.staged_sha256 !== locked.expected_sha256 || locked.staged_byte_size !== locked.expected_byte_size) {
        throw codedError("DMS staged receipt changed before metadata commit", "DMS_STAGED_DIGEST_MISMATCH");
      }
      if (typeof beforePersist === "function") await beforePersist({ phase: "before_metadata", session: locked, client });
      faultInjector?.("before_metadata_commit", { session_id: locked.session_id });
      stage = "DOCUMENT_UPSERT";
      await client.query(
        `INSERT INTO lawos_dms.documents
           (tenant_id, document_id, matter_id, workspace_id, title, status,
            permission_envelope_id, audit_trace_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, 'active', $6, $7, $8::timestamptz, $8::timestamptz)
         ON CONFLICT (tenant_id, document_id) DO NOTHING`,
        [
          locked.tenant_id,
          locked.document_id,
          locked.matter_id,
          locked.workspace_id,
          locked.title,
          locked.permission_envelope_id,
          locked.audit_trace_id,
          committedAt,
        ],
      );
      stage = "DOCUMENT_READ";
      const document = await client.query(
        `SELECT d.matter_id, d.workspace_id, d.permission_envelope_id,
                current_version.version_number AS current_version_number
           FROM lawos_dms.documents d
           LEFT JOIN lawos_dms.document_versions current_version
             ON current_version.tenant_id = d.tenant_id
            AND current_version.version_id = d.current_version_id
          WHERE d.tenant_id = $1 AND d.document_id = $2
          FOR UPDATE OF d`,
        [locked.tenant_id, locked.document_id],
      );
      const existingDocument = document.rows[0];
      if (!existingDocument) {
        throw codedError(
          "DMS document metadata row was not found after upsert",
          "DMS_METADATA_DOCUMENT_READ_FAILED",
          500,
        );
      }
      if (
        existingDocument.matter_id !== locked.matter_id
        || existingDocument.workspace_id !== locked.workspace_id
        || existingDocument.permission_envelope_id !== locked.permission_envelope_id
      ) {
        throw codedError("DMS document authority envelope does not match existing document", "DMS_DOCUMENT_AUTHORITY_CONFLICT");
      }
      stage = "FILE_OBJECT_INSERT";
      const fileObjectId = `file:${locked.version_id}`;
      await client.query(
        `INSERT INTO lawos_dms.file_objects
           (tenant_id, file_object_id, object_id, adapter_id, storage_pointer_ref,
            sha256, byte_size, content_type, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'committed', $9::timestamptz)`,
        [
          locked.tenant_id,
          fileObjectId,
          locked.object_id,
          locked.adapter_id,
          createStoragePointerRef({ adapter_id: locked.adapter_id, tenant_id: locked.tenant_id, object_id: locked.object_id }),
          locked.expected_sha256,
          locked.expected_byte_size,
          locked.content_type,
          committedAt,
        ],
      );
      stage = "VERSION_INSERT";
      await client.query(
        `INSERT INTO lawos_dms.document_versions
           (tenant_id, version_id, document_id, version_number, file_object_id, sha256, created_by, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8::timestamptz)`,
        [
          locked.tenant_id,
          locked.version_id,
          locked.document_id,
          locked.version_number,
          fileObjectId,
          locked.expected_sha256,
          locked.actor_id,
          committedAt,
        ],
      );
      if (existingDocument.current_version_number == null || locked.version_number > Number(existingDocument.current_version_number)) {
        stage = "DOCUMENT_UPDATE";
        await client.query(
          `UPDATE lawos_dms.documents
              SET title = $3, current_version_id = $4, updated_at = $5::timestamptz
            WHERE tenant_id = $1 AND document_id = $2`,
          [locked.tenant_id, locked.document_id, locked.title, locked.version_id, committedAt],
        );
      }
      stage = "METADATA_AUDIT";
      await appendAudit(client, {
        tenant_id: locked.tenant_id,
        event_id: `audit:${locked.session_id}:metadata-committed`,
        event_type: "dms.document.metadata_committed",
        actor_id: locked.actor_id,
        object_type: "DmsDocument",
        object_id: locked.document_id,
        payload: { session_id: locked.session_id, version_id: locked.version_id, sha256: locked.expected_sha256 },
        created_at: committedAt,
      });
      stage = "OUTBOX_INSERT";
      await client.query(
        `INSERT INTO lawos_dms.outbox_events
           (tenant_id, event_id, event_type, aggregate_type, aggregate_id, payload, status, created_at)
         VALUES ($1, $2, 'dms.document.metadata_committed', 'DmsDocument', $3, $4::jsonb, 'pending', $5::timestamptz)`,
        [
          locked.tenant_id,
          `outbox:${locked.session_id}:metadata-committed`,
          locked.document_id,
          JSON.stringify({ session_id: locked.session_id, version_id: locked.version_id }),
          committedAt,
        ],
      );
      stage = "SESSION_UPDATE";
      const updated = await client.query(
        `UPDATE lawos_dms.upload_sessions
            SET state = 'finalized', metadata_committed_at = $3::timestamptz,
                finalized_at = $3::timestamptz, retryable = false,
                provider_finalize_owner = NULL, provider_finalize_token = NULL,
                provider_finalize_lease_expires_at = NULL,
                stage_lease_owner = NULL, stage_lease_token = NULL, stage_lease_expires_at = NULL,
                last_error_code = NULL, updated_at = $3::timestamptz
          WHERE tenant_id = $1 AND session_id = $2
          RETURNING *`,
        [locked.tenant_id, locked.session_id, committedAt],
      );
      const finalized = rowToSession(updated.rows[0]);
      if (!finalized) {
        throw codedError(
          "DMS upload session finalization did not return a row",
          "DMS_METADATA_SESSION_UPDATE_FAILED",
          500,
        );
      }
      stage = "FINAL_AUDIT";
      await appendAudit(client, {
        tenant_id: locked.tenant_id,
        event_id: `audit:${locked.session_id}:finalized`,
        event_type: "dms.upload_session.finalized",
        actor_id: locked.actor_id,
        object_type: "DmsUploadSession",
        object_id: locked.session_id,
        payload: { state: "finalized", document_id: locked.document_id, version_id: locked.version_id },
        created_at: committedAt,
      });
      return finalized;
    }).catch((error) => {
      throw classifyMetadataCommitError(error, stage);
    });
  }

  function safeProviderReceipt(receipt, session) {
    return Object.freeze({
      adapter_id: session.adapter_id,
      tenant_id: session.tenant_id,
      object_id: session.object_id,
      storage_pointer_ref: createStoragePointerRef({ adapter_id: session.adapter_id, tenant_id: session.tenant_id, object_id: session.object_id }),
      sha256: receipt?.sha256 ?? session.expected_sha256,
      byte_size: Number(receipt?.byte_size ?? session.expected_byte_size),
      mime_type: receipt?.mime_type ?? session.content_type,
      staged_cleanup_deferred: receipt?.staged_cleanup_deferred === true,
      raw_path_exposed: false,
      bytes_exposed: false,
    });
  }

  async function recordFinalizeFailure(session, leaseToken, error) {
    const updatedAt = timestamp(clock);
    await transact(session.tenant_id, (client) => client.query(
      `UPDATE lawos_dms.upload_sessions
          SET state = CASE WHEN state = 'provider_finalizing' THEN 'bytes_stored' ELSE state END,
              retryable = true, attempt_count = attempt_count + 1,
              provider_finalize_owner = NULL, provider_finalize_token = NULL,
              provider_finalize_lease_expires_at = NULL,
              last_error_code = $4, updated_at = $5::timestamptz
        WHERE tenant_id = $1 AND session_id = $2 AND provider_finalize_token = $3`,
      [session.tenant_id, session.session_id, leaseToken, safeErrorCode(error, "DMS_STORAGE_FINALIZE_FAILED"), updatedAt],
    ));
  }

  async function claimProviderFinalize(session) {
    const claimedAt = timestamp(clock);
    const leaseToken = `finalize-lease:${idFactory()}`;
    const leaseExpiresAt = new Date(Date.parse(claimedAt) + finalizeLeaseMillis).toISOString();
    const claimed = await transact(session.tenant_id, async (client) => {
      const locked = await selectSession(client, session.tenant_id, session.session_id, { lock: true });
      if (["provider_finalized", "finalized"].includes(locked.state)) return locked;
      if (locked.state !== "bytes_stored" && locked.state !== "provider_finalizing") {
        throw codedError("DMS provider finalize requires verified staged bytes", "DMS_UPLOAD_INVALID_STATE");
      }
      if (locked.provider_finalize_lease_expires_at
          && Date.parse(locked.provider_finalize_lease_expires_at) > Date.parse(claimedAt)) {
        throw codedError("DMS provider finalize lease is already active", "DMS_UPLOAD_FINALIZE_LEASE_ACTIVE");
      }
      const result = await client.query(
        `UPDATE lawos_dms.upload_sessions
            SET state = 'provider_finalizing', provider_finalize_owner = $3,
                provider_finalize_token = $4, provider_finalize_lease_expires_at = $5::timestamptz,
                retryable = false, updated_at = $6::timestamptz
          WHERE tenant_id = $1 AND session_id = $2
          RETURNING *`,
        [locked.tenant_id, locked.session_id, runtimeWorkerId, leaseToken, leaseExpiresAt, claimedAt],
      );
      return rowToSession(result.rows[0]);
    });
    return Object.freeze({ session: claimed, leaseToken });
  }

  async function persistProviderFinalized(session, leaseToken, receipt) {
    const providerFinalizedAt = timestamp(clock);
    const safeReceipt = safeProviderReceipt(receipt, session);
    return transact(session.tenant_id, async (client) => {
      const locked = await selectSession(client, session.tenant_id, session.session_id, { lock: true });
      if (["provider_finalized", "finalized"].includes(locked.state)) return locked;
      if (locked.state !== "provider_finalizing" || locked.provider_finalize_token !== leaseToken) {
        throw codedError("DMS provider finalize compare-and-swap failed", "DMS_UPLOAD_FINALIZE_LEASE_LOST");
      }
      const result = await client.query(
        `UPDATE lawos_dms.upload_sessions
            SET state = 'provider_finalized', provider_receipt = $3::jsonb,
                provider_finalized_at = $4::timestamptz,
                provider_finalize_owner = NULL, provider_finalize_token = NULL,
                provider_finalize_lease_expires_at = NULL,
                retryable = true, last_error_code = NULL, updated_at = $4::timestamptz
          WHERE tenant_id = $1 AND session_id = $2 AND provider_finalize_token = $5
          RETURNING *`,
        [session.tenant_id, session.session_id, JSON.stringify(safeReceipt), providerFinalizedAt, leaseToken],
      );
      if (!result.rows[0]) throw codedError("DMS provider finalize compare-and-swap failed", "DMS_UPLOAD_FINALIZE_LEASE_LOST");
      return rowToSession(result.rows[0]);
    });
  }

  async function finalizeUpload({ tenant_id, session_id, beforePersist } = {}) {
    let session = await getUploadSession({ tenant_id, session_id });
    if (session.state === "finalized") return Object.freeze({ session, replayed: true });
    if (["expired", "failed_terminal"].includes(session.state)) throw codedError("DMS upload session is expired", "DMS_UPLOAD_SESSION_EXPIRED");
    session = await ensureBytesStored(session);
    let receipt;
    let replayed = session.state === "provider_finalized";
    if (session.state !== "provider_finalized") {
      const claim = await claimProviderFinalize(session);
      session = claim.session;
      if (session.state !== "provider_finalized" && session.state !== "finalized") {
        try {
          const committed = await storage.statObject({ tenant_id: session.tenant_id, object_id: session.object_id });
          if (committed) {
            assertReceiptMatchesSession(committed, session);
            await assertIndependentDigest(session, { staged: false });
            replayed = true;
          }
          receipt = await storage.finalizeObject({ tenant_id: session.tenant_id, session_id: session.session_id, object_id: session.object_id });
          assertReceiptMatchesSession(receipt, session);
          await assertIndependentDigest(session, { staged: false });
          faultInjector?.("after_provider_finalize_before_receipt_persist", { session_id: session.session_id });
          session = await persistProviderFinalized(session, claim.leaseToken, receipt);
        } catch (error) {
          await recordFinalizeFailure(session, claim.leaseToken, error);
          throw error;
        }
      }
    }
    faultInjector?.("after_storage_finalize_before_session_finalized", { session_id: session.session_id });
    const finalized = await commitMetadata(session, beforePersist);
    return Object.freeze({ session: finalized, receipt: safeProviderReceipt(receipt ?? session.provider_receipt, session), replayed });
  }

  async function uploadDocument({
    document = {},
    bytes,
    actor_id,
    idempotency_key,
    object_id,
    session_id,
    version_number,
    expires_at,
    beforePersist,
  } = {}) {
    const tenantId = requiredText(document.tenant_id, "document.tenant_id");
    const documentId = requiredText(document.document_id, "document.document_id");
    const versionId = requiredText(
      document.current_version_id ?? `version:${documentId}:${version_number ?? document.version_number ?? 1}`,
      "document.current_version_id",
    );
    const actorId = requiredText(actor_id, "actor_id");
    const buffer = Buffer.isBuffer(bytes) ? Buffer.from(bytes) : Buffer.from(bytes ?? []);
    if (typeof beforePersist === "function") await beforePersist({ phase: "before_session", document, bytes: buffer, actor_id: actorId, idempotency_key });
    const created = await createUploadSession({
      tenant_id: tenantId,
      session_id: session_id ?? `dms-upload:${idFactory()}`,
      idempotency_key: requiredText(idempotency_key, "idempotency_key"),
      matter_id: requiredText(document.matter_id, "document.matter_id"),
      workspace_id: requiredText(document.workspace_id, "document.workspace_id"),
      document_id: documentId,
      version_id: versionId,
      version_number: requiredVersionNumber(version_number ?? document.version_number ?? 1),
      object_id: object_id ?? `object:${versionId}`,
      adapter_id: storage.adapter_id,
      title: requiredText(document.title, "document.title"),
      content_type: requiredText(document.mime_type ?? document.content_type ?? "application/octet-stream", "document.mime_type"),
      expected_sha256: sha256Hex(buffer),
      expected_byte_size: buffer.byteLength,
      permission_envelope_id: requiredText(document.permission_envelope_id, "document.permission_envelope_id"),
      audit_trace_id: requiredText(document.audit_trace_id, "document.audit_trace_id"),
      actor_id: actorId,
      expires_at: expires_at ?? nextUploadExpiry(),
    });
    try {
      await stageUpload({ tenant_id: tenantId, session_id: created.session.session_id, bytes: buffer, beforePersist });
      const finalized = await finalizeUpload({ tenant_id: tenantId, session_id: created.session.session_id, beforePersist });
      const state = await getDocumentState({ tenant_id: tenantId, document_id: documentId });
      if (!state) throw codedError("DMS document metadata was not published", "DMS_DOCUMENT_NOT_FOUND", 404);
      const version = state.versions.find((item) => item.version_id === versionId);
      const fileObject = state.file_objects.find((item) => item.file_object_id === version?.file_object_id);
      if (!version || !fileObject) throw codedError("DMS committed version is unavailable", "DMS_COMMITTED_OBJECT_NOT_FOUND", 404);
      const { storage_pointer_ref: _storagePointerRef, ...safeFileObject } = fileObject;
      const storageReceipt = Object.freeze({
        adapter_id: finalized.receipt.adapter_id,
        tenant_id: finalized.receipt.tenant_id,
        object_id: finalized.receipt.object_id,
        sha256: finalized.receipt.sha256,
        byte_size: Number(finalized.receipt.byte_size),
        mime_type: finalized.receipt.mime_type,
        raw_path_exposed: false,
        storage_pointer_ref_included: false,
      });
      return Object.freeze({
        outcome: created.replayed || finalized.replayed ? "idempotent_replay" : "created",
        document: Object.freeze({
          ...document,
          ...state.document,
          current_version_id: versionId,
          latest_sha256: version.sha256,
          owner_user_id: document.owner_user_id ?? actorId,
        }),
        version,
        file_object: Object.freeze({
          ...safeFileObject,
          mime_type: safeFileObject.content_type,
          raw_path_exposed: false,
          storage_pointer_ref_included: false,
        }),
        storage_receipt: storageReceipt,
        audit_event: Object.freeze({
          event_id: `audit:${created.session.session_id}:finalized`,
          raw_payload_included: false,
        }),
        idempotent_replay: created.replayed || finalized.replayed === true,
        upload_session_id: created.session.session_id,
        provider_finalize_before_metadata: true,
        independent_digest_readback: true,
      });
    } catch (error) {
      if (isCompletionAuthorityRejection(error)) await quarantineCompletionAuthorityUpload(created.session, error);
      throw error;
    }
  }

  async function assertOrphanCleanupAllowed(client, session, now) {
    if (session.metadata_committed_at || session.state === "finalized") {
      throw codedError("committed DMS objects cannot be orphan-cleaned", "DMS_COMMITTED_OBJECT_DELETE_BLOCKED");
    }
    if (session.stage_lease_expires_at && Date.parse(session.stage_lease_expires_at) > Date.parse(now)) {
      throw codedError("active DMS stage lease blocks orphan cleanup", "DMS_UPLOAD_STAGE_LEASE_ACTIVE");
    }
    const protectedResult = await client.query(
      `SELECT
         EXISTS (
           SELECT 1 FROM lawos_dms.file_objects
            WHERE tenant_id = $1 AND object_id = $2
         ) AS committed,
         EXISTS (
           SELECT 1 FROM lawos_dms.legal_holds
            WHERE tenant_id = $1 AND document_id = $3 AND object_id = $2 AND status = 'active'
         ) AS held,
         EXISTS (
           SELECT 1 FROM lawos_dms.retention_policies
            WHERE tenant_id = $1 AND document_id = $3 AND retain_until > $4::timestamptz
         ) AS retained`,
      [session.tenant_id, session.object_id, session.document_id, now],
    );
    const protection = protectedResult.rows[0];
    if (protection.committed || protection.held || protection.retained) {
      throw codedError("DMS delete guard rejected orphan cleanup", "DMS_DELETE_GUARD_BLOCKED");
    }
  }

  async function cleanupOrphan({ tenant_id, session_id } = {}) {
    const tenantId = requiredText(tenant_id, "tenant_id");
    const sessionId = requiredText(session_id, "session_id");
    const cleanupAt = timestamp(clock);
    const session = await transact(tenantId, async (client) => {
      const locked = await selectSession(client, tenantId, sessionId, { lock: true });
      await assertOrphanCleanupAllowed(client, locked, cleanupAt);
      if (!["pending", "bytes_stored", "failed", "expired"].includes(locked.state)) {
        throw codedError("DMS upload is not eligible for orphan cleanup", "DMS_UPLOAD_INVALID_STATE");
      }
      const updated = await client.query(
        `UPDATE lawos_dms.upload_sessions
            SET state = 'expired', retryable = false, stage_lease_expires_at = NULL,
                updated_at = $3::timestamptz
          WHERE tenant_id = $1 AND session_id = $2
          RETURNING *`,
        [tenantId, sessionId, cleanupAt],
      );
      return rowToSession(updated.rows[0]);
    });
    const deletion = await storage.deleteOrphan({ tenant_id: session.tenant_id, session_id: session.session_id, object_id: session.object_id });
    if (deletion.committed_object_deleted) {
      throw codedError("storage adapter violated orphan cleanup boundary", "DMS_STORAGE_DELETE_BOUNDARY_VIOLATION", 500);
    }
    const reconciled = await transact(tenantId, async (client) => {
      const updated = await client.query(
        `UPDATE lawos_dms.upload_sessions
            SET orphan_deleted_at = $3::timestamptz, updated_at = $3::timestamptz
          WHERE tenant_id = $1 AND session_id = $2
          RETURNING *`,
        [tenantId, sessionId, cleanupAt],
      );
      await appendAudit(client, {
        tenant_id: tenantId,
        event_id: `audit:${sessionId}:orphan-cleaned`,
        event_type: "dms.upload_session.orphan_cleaned",
        actor_id: "dms-reconciler",
        object_type: "DmsUploadSession",
        object_id: sessionId,
        payload: { state: "expired", staged_object_deleted: deletion.deleted },
        created_at: cleanupAt,
      });
      return rowToSession(updated.rows[0]);
    });
    return Object.freeze({ session: reconciled, deletion });
  }

  async function claimReconciliationSessions(tenantId, boundedLimit, now) {
    const leaseExpiresAt = new Date(Date.parse(now) + reconcileLeaseMillis).toISOString();
    return transact(tenantId, async (client) => {
      const result = await client.query(
        `WITH candidates AS (
           SELECT tenant_id, session_id
             FROM lawos_dms.upload_sessions
            WHERE tenant_id = $1
              AND state = ANY($2::text[])
              AND next_attempt_at <= $3::timestamptz
              AND (reconcile_lease_expires_at IS NULL OR reconcile_lease_expires_at <= $3::timestamptz)
              AND (state <> 'expired' OR orphan_deleted_at IS NULL)
            ORDER BY next_attempt_at, created_at, session_id
            FOR UPDATE SKIP LOCKED
            LIMIT $4
         )
         UPDATE lawos_dms.upload_sessions target
            SET reconcile_owner = $5, reconcile_lease_expires_at = $6::timestamptz,
                updated_at = $3::timestamptz
           FROM candidates
          WHERE target.tenant_id = candidates.tenant_id
            AND target.session_id = candidates.session_id
         RETURNING target.*`,
        [tenantId, ACTIVE_RECONCILIATION_STATES, now, boundedLimit, runtimeWorkerId, leaseExpiresAt],
      );
      return result.rows.map(rowToSession);
    });
  }

  async function releaseReconciliationClaim(tenantId, sessionId, { error = null, next_attempt_at = null } = {}) {
    const releasedAt = timestamp(clock);
    return transact(tenantId, async (client) => {
      const locked = await selectSession(client, tenantId, sessionId, { lock: true });
      if (locked.reconcile_owner !== runtimeWorkerId) return locked;
      if (!error) {
        const nextAttemptAt = next_attempt_at == null
          ? releasedAt
          : requiredTimestamp(next_attempt_at, "next_attempt_at");
        const result = await client.query(
          `UPDATE lawos_dms.upload_sessions
              SET reconcile_owner = NULL, reconcile_lease_expires_at = NULL,
                  next_attempt_at = $3::timestamptz, updated_at = $3::timestamptz
            WHERE tenant_id = $1 AND session_id = $2 AND reconcile_owner = $4
            RETURNING *`,
          [tenantId, sessionId, nextAttemptAt, runtimeWorkerId],
        );
        return rowToSession(result.rows[0] ?? locked);
      }
      const nextAttemptCount = locked.reconciliation_attempt_count + 1;
      const terminal = nextAttemptCount >= maxReconciliationAttempts;
      const delay = Math.min(reconciliationBackoffMillis * (2 ** Math.max(0, nextAttemptCount - 1)), 60 * 60 * 1_000);
      const nextAttemptAt = new Date(Date.parse(releasedAt) + delay).toISOString();
      const safeCode = safeErrorCode(error, "DMS_RECONCILIATION_FAILED");
      const deadLetter = terminal ? {
        schema_version: "law-firm-os.dms-dead-letter.v0.1",
        session_id: sessionId,
        worker_id: runtimeWorkerId,
        attempt_count: nextAttemptCount,
        safe_error_code: safeCode,
        terminal_at: releasedAt,
      } : null;
      const result = await client.query(
        `UPDATE lawos_dms.upload_sessions
            SET state = CASE WHEN $5::boolean THEN 'failed_terminal' ELSE state END,
                retryable = NOT $5::boolean,
                reconciliation_attempt_count = $3,
                reconcile_owner = NULL, reconcile_lease_expires_at = NULL,
                next_attempt_at = $4::timestamptz, last_error_code = $6,
                failed_terminal_at = CASE WHEN $5::boolean THEN $7::timestamptz ELSE failed_terminal_at END,
                dead_letter_receipt = CASE WHEN $5::boolean THEN $8::jsonb ELSE dead_letter_receipt END,
                updated_at = $7::timestamptz
          WHERE tenant_id = $1 AND session_id = $2 AND reconcile_owner = $9
          RETURNING *`,
        [tenantId, sessionId, nextAttemptCount, nextAttemptAt, terminal, safeCode, releasedAt, JSON.stringify(deadLetter), runtimeWorkerId],
      );
      return rowToSession(result.rows[0] ?? locked);
    });
  }

  async function reconcileUploadSessions({ tenant_id, limit = 100 } = {}) {
    const tenantId = requiredText(tenant_id, "tenant_id");
    const boundedLimit = Number(limit);
    if (!Number.isSafeInteger(boundedLimit) || boundedLimit < 1 || boundedLimit > 1_000) {
      throw new TypeError("limit must be an integer between 1 and 1000");
    }
    const now = timestamp(clock);
    const sessions = await claimReconciliationSessions(tenantId, boundedLimit, now);
    const outcomes = [];
    for (const session of sessions) {
      try {
        const sessionExpired = Date.parse(session.expires_at) <= Date.parse(now);
        if (session.state === "expired" || (session.state === "bytes_stored" && sessionExpired)) {
          const cleaned = await cleanupOrphan({ tenant_id: tenantId, session_id: session.session_id });
          outcomes.push(Object.freeze({ session_id: session.session_id, action: "orphan_cleaned", state: cleaned.session.state }));
          await releaseReconciliationClaim(tenantId, session.session_id);
          continue;
        }
        if (["pending", "failed"].includes(session.state)) {
          const staged = await storage.statStagedObject({ tenant_id: session.tenant_id, session_id: session.session_id, object_id: session.object_id });
          const activeStageLease = session.stage_lease_expires_at
            && Date.parse(session.stage_lease_expires_at) > Date.parse(now);
          if (activeStageLease) {
            outcomes.push(Object.freeze({ session_id: session.session_id, action: "stage_in_progress", state: session.state }));
            await releaseReconciliationClaim(tenantId, session.session_id, {
              next_attempt_at: session.stage_lease_expires_at,
            });
            continue;
          }
          if (staged && sessionExpired && !activeStageLease) {
            const cleaned = await cleanupOrphan({ tenant_id: tenantId, session_id: session.session_id });
            outcomes.push(Object.freeze({ session_id: session.session_id, action: "orphan_cleaned", state: cleaned.session.state }));
            await releaseReconciliationClaim(tenantId, session.session_id);
            continue;
          }
          if (!staged) {
            if (sessionExpired) {
              const cleaned = await cleanupOrphan({ tenant_id: tenantId, session_id: session.session_id });
              outcomes.push(Object.freeze({ session_id: session.session_id, action: "orphan_cleaned", state: cleaned.session.state }));
              await releaseReconciliationClaim(tenantId, session.session_id);
              continue;
            }
            outcomes.push(Object.freeze({ session_id: session.session_id, action: "awaiting_bytes", state: session.state }));
            await releaseReconciliationClaim(tenantId, session.session_id, {
              next_attempt_at: session.expires_at,
            });
            continue;
          }
          await markBytesStored(session, staged, { eventActor: "dms-reconciler" });
        }
        const finalized = await finalizeUpload({ tenant_id: tenantId, session_id: session.session_id });
        outcomes.push(Object.freeze({ session_id: session.session_id, action: "finalized", state: finalized.session.state }));
        await releaseReconciliationClaim(tenantId, session.session_id);
      } catch (error) {
        const released = await releaseReconciliationClaim(tenantId, session.session_id, { error });
        outcomes.push(Object.freeze({
          session_id: session.session_id,
          action: "error",
          state: session.state,
          safe_error_code: safeErrorCode(error, "DMS_RECONCILIATION_FAILED"),
          retry_at: released.next_attempt_at,
          terminal: released.state === "failed_terminal",
        }));
      }
    }
    return Object.freeze(outcomes);
  }

  async function selectCanonicalObject(client, tenantId, { documentId, objectId, lock = false, allowedStatuses = ["committed"] } = {}) {
    const clauses = objectId
      ? ["f.object_id = $2", objectId]
      : ["d.document_id = $2 AND v.version_id = d.current_version_id", documentId];
    const result = await client.query(
      `SELECT f.file_object_id, f.object_id, f.sha256, f.byte_size, f.status AS file_status,
              v.version_id, v.version_number, v.document_id, d.matter_id,
              d.current_version_id, d.legal_hold_status, d.status AS document_status
         FROM lawos_dms.file_objects f
         JOIN lawos_dms.document_versions v
           ON v.tenant_id = f.tenant_id AND v.file_object_id = f.file_object_id
         JOIN lawos_dms.documents d
           ON d.tenant_id = v.tenant_id AND d.document_id = v.document_id
        WHERE f.tenant_id = $1 AND ${clauses[0]}
        ${lock ? "FOR UPDATE OF f, d" : ""}`,
      [tenantId, clauses[1]],
    );
    const canonical = result.rows[0];
    if (!canonical) throw codedError("DMS committed object was not found", "DMS_COMMITTED_OBJECT_NOT_FOUND", 404);
    if (documentId && canonical.document_id !== documentId) {
      throw codedError("DMS document does not own the requested object", "DMS_DOCUMENT_OBJECT_MISMATCH");
    }
    if (!allowedStatuses.includes(canonical.file_status)) {
      throw codedError("DMS object is pending or completed deletion", "DMS_OBJECT_DELETE_PENDING");
    }
    return canonical;
  }

  function assertExpectedMatter(canonical, expectedMatterId) {
    if (expectedMatterId && canonical.matter_id !== expectedMatterId) {
      throw codedError("DMS document matter changed after authorization", "DMS_CANONICAL_MATTER_MISMATCH", 409);
    }
  }

  async function getGovernanceAuthorizationResource({ tenant_id, document_id, object_id } = {}) {
    const tenantId = requiredText(tenant_id, "tenant_id");
    const documentId = requiredText(document_id, "document_id");
    const objectId = object_id ? requiredText(object_id, "object_id") : null;
    return transact(tenantId, async (client) => {
      const canonical = await selectCanonicalObject(client, tenantId, {
        documentId,
        objectId,
        allowedStatuses: ["committed", "delete_pending"],
      });
      return Object.freeze({
        tenant_id: tenantId,
        document_id: canonical.document_id,
        object_id: canonical.object_id,
        matter_id: canonical.matter_id,
      });
    }, { readOnly: true });
  }

  async function verifyProviderLegalHold(tenantId, canonical) {
    if (!storage.capabilities.provider_retention) return false;
    if (typeof storage.getObjectLegalHold !== "function") {
      throw codedError("provider legal-hold readback is required", "DMS_PROVIDER_RETENTION_CONTRACT_INVALID", 500);
    }
    const observed = await storage.getObjectLegalHold({ tenant_id: tenantId, object_id: canonical.object_id });
    if (observed?.status !== "ON") {
      throw codedError("provider legal hold does not match committed state", "DMS_PROVIDER_LEGAL_HOLD_DRIFT", 409);
    }
    return true;
  }

  async function verifyProviderRetention(tenantId, canonical, retainUntil) {
    if (!storage.capabilities.provider_retention) return false;
    if (typeof storage.getObjectRetention !== "function") {
      throw codedError("provider retention readback is required", "DMS_PROVIDER_RETENTION_CONTRACT_INVALID", 500);
    }
    const observed = await storage.getObjectRetention({ tenant_id: tenantId, object_id: canonical.object_id });
    const observedUntil = Date.parse(observed?.retain_until ?? "");
    const requiredUntil = Date.parse(retainUntil);
    if (!["GOVERNANCE", "COMPLIANCE"].includes(observed?.mode)
      || !Number.isFinite(observedUntil)
      || observedUntil < requiredUntil) {
      throw codedError("provider retention does not match committed state", "DMS_PROVIDER_RETENTION_DRIFT", 409);
    }
    return true;
  }

  async function assertCanonicalDeleteProtection(client, tenantId, canonical, now) {
    const protectedResult = await client.query(
      `SELECT
         EXISTS (
           SELECT 1 FROM lawos_dms.legal_holds
            WHERE tenant_id = $1 AND document_id = $2 AND object_id = $3 AND status = 'active'
         ) AS held,
         EXISTS (
           SELECT 1 FROM lawos_dms.retention_policies
            WHERE tenant_id = $1 AND document_id = $2 AND object_id = $3 AND retain_until > $4::timestamptz
         ) AS retained`,
      [tenantId, canonical.document_id, canonical.object_id, now],
    );
    const guard = protectedResult.rows[0];
    if (guard.held) throw codedError("DMS committed object is under legal hold", "DMS_LEGAL_HOLD_DELETE_BLOCKED");
    if (guard.retained) throw codedError("DMS committed object is within its retention period", "DMS_RETENTION_DELETE_BLOCKED");
  }

  async function assertNoActiveProviderDelete(client, tenantId, canonical) {
    const active = await client.query(
      `SELECT 1 FROM lawos_dms.delete_intents
        WHERE tenant_id = $1 AND object_id = $2
          AND state IN ('pending', 'provider_deleted') AND lease_token IS NOT NULL
        LIMIT 1`,
      [tenantId, canonical.object_id],
    );
    if (active.rowCount > 0) {
      throw codedError("DMS provider deletion is already in progress", "DMS_OBJECT_DELETE_IN_PROGRESS", 409);
    }
  }

  async function placeLegalHold(input = {}) {
    const tenantId = requiredText(input.tenant_id, "tenant_id");
    const createdAt = timestamp(clock);
    const holdId = requiredText(input.legal_hold_id, "legal_hold_id");
    const documentId = requiredText(input.document_id, "document_id");
    const objectId = requiredText(input.object_id, "object_id");
    const actorId = requiredText(input.created_by, "created_by");
    const reasonHash = hashValue({ reason: requiredText(input.reason, "reason") });
    return transact(tenantId, async (client) => {
      const existing = await client.query(
        `SELECT legal_hold_id, document_id, object_id, status, reason_hash
           FROM lawos_dms.legal_holds
          WHERE tenant_id = $1 AND legal_hold_id = $2
          FOR UPDATE`,
        [tenantId, holdId],
      );
      if (existing.rows[0]) {
        const row = existing.rows[0];
        if (row.document_id !== documentId || row.object_id !== objectId || row.status !== "active" || row.reason_hash !== reasonHash) {
          throw codedError("DMS legal hold idempotency key conflicts with existing state", "DMS_IDEMPOTENCY_CONFLICT");
        }
        const canonical = await selectCanonicalObject(client, tenantId, {
          documentId: row.document_id,
          objectId: row.object_id,
          lock: true,
          allowedStatuses: ["committed", "delete_pending"],
        });
        assertExpectedMatter(canonical, input.expected_matter_id);
        await assertNoActiveProviderDelete(client, tenantId, canonical);
        const providerReadbackVerified = await verifyProviderLegalHold(tenantId, canonical);
        return Object.freeze({ tenant_id: tenantId, legal_hold_id: holdId, status: "active", reason_hash: reasonHash, provider_readback_verified: providerReadbackVerified, replayed: true });
      }
      const canonical = await selectCanonicalObject(client, tenantId, { documentId, objectId, lock: true, allowedStatuses: ["committed", "delete_pending"] });
      assertExpectedMatter(canonical, input.expected_matter_id);
      await assertNoActiveProviderDelete(client, tenantId, canonical);
      if (storage.capabilities.provider_retention) {
        if (typeof storage.setObjectLegalHold !== "function") {
          throw codedError("storage adapter declares provider retention without legal hold support", "DMS_PROVIDER_RETENTION_CONTRACT_INVALID", 500);
        }
        await storage.setObjectLegalHold({ tenant_id: tenantId, object_id: canonical.object_id, status: "ON" });
      }
      const providerReadbackVerified = await verifyProviderLegalHold(tenantId, canonical);
      await client.query(
        `INSERT INTO lawos_dms.legal_holds
           (tenant_id, legal_hold_id, document_id, object_id, status, reason_hash, created_by, created_at)
         VALUES ($1, $2, $3, $4, 'active', $5, $6, $7::timestamptz)`,
        [tenantId, holdId, canonical.document_id, canonical.object_id, reasonHash, actorId, createdAt],
      );
      await client.query(
        `UPDATE lawos_dms.documents
            SET legal_hold_status = 'active', updated_at = $3::timestamptz
          WHERE tenant_id = $1 AND document_id = $2`,
        [tenantId, canonical.document_id, createdAt],
      );
      return Object.freeze({ tenant_id: tenantId, legal_hold_id: holdId, status: "active", reason_hash: reasonHash, provider_readback_verified: providerReadbackVerified, replayed: false });
    });
  }

  async function setRetentionPolicy(input = {}) {
    const tenantId = requiredText(input.tenant_id, "tenant_id");
    const createdAt = timestamp(clock);
    const policyId = requiredText(input.retention_policy_id, "retention_policy_id");
    const documentId = requiredText(input.document_id, "document_id");
    const objectId = input.object_id ? requiredText(input.object_id, "object_id") : null;
    const retainUntil = requiredTimestamp(input.retain_until, "retain_until");
    return transact(tenantId, async (client) => {
      const existing = await client.query(
        `SELECT retention_policy_id, document_id, object_id, retain_until, disposition
           FROM lawos_dms.retention_policies
          WHERE tenant_id = $1 AND retention_policy_id = $2
          FOR UPDATE`,
        [tenantId, policyId],
      );
      if (existing.rows[0]) {
        const row = existing.rows[0];
        if (row.document_id !== documentId
          || (objectId && row.object_id !== objectId)
          || new Date(row.retain_until).toISOString() !== retainUntil
          || row.disposition !== "review_before_delete") {
          throw codedError("DMS retention policy idempotency key conflicts with existing state", "DMS_IDEMPOTENCY_CONFLICT");
        }
        const canonical = await selectCanonicalObject(client, tenantId, {
          documentId: row.document_id,
          objectId: row.object_id,
          lock: true,
          allowedStatuses: ["committed", "delete_pending"],
        });
        assertExpectedMatter(canonical, input.expected_matter_id);
        await assertNoActiveProviderDelete(client, tenantId, canonical);
        const providerReadbackVerified = await verifyProviderRetention(tenantId, canonical, retainUntil);
        return Object.freeze({ tenant_id: tenantId, retention_policy_id: policyId, retain_until: retainUntil, provider_readback_verified: providerReadbackVerified, replayed: true });
      }
      const canonical = await selectCanonicalObject(client, tenantId, { documentId, objectId, lock: true, allowedStatuses: ["committed", "delete_pending"] });
      assertExpectedMatter(canonical, input.expected_matter_id);
      await assertNoActiveProviderDelete(client, tenantId, canonical);
      if (storage.capabilities.provider_retention) {
        if (typeof storage.setObjectRetention !== "function") {
          throw codedError("storage adapter declares provider retention without retention support", "DMS_PROVIDER_RETENTION_CONTRACT_INVALID", 500);
        }
        await storage.setObjectRetention({
          tenant_id: tenantId,
          object_id: canonical.object_id,
          retain_until: retainUntil,
          mode: "GOVERNANCE",
        });
      }
      const providerReadbackVerified = await verifyProviderRetention(tenantId, canonical, retainUntil);
      await client.query(
        `INSERT INTO lawos_dms.retention_policies
           (tenant_id, retention_policy_id, document_id, object_id, retain_until, disposition, created_at)
         VALUES ($1, $2, $3, $4, $5::timestamptz, 'review_before_delete', $6::timestamptz)`,
        [tenantId, policyId, canonical.document_id, canonical.object_id, retainUntil, createdAt],
      );
      return Object.freeze({ tenant_id: tenantId, retention_policy_id: policyId, retain_until: retainUntil, provider_readback_verified: providerReadbackVerified, replayed: false });
    });
  }

  async function assertCommittedObjectDeleteAllowed({ tenant_id, document_id, object_id, expected_matter_id } = {}) {
    const tenantId = requiredText(tenant_id, "tenant_id");
    const documentId = requiredText(document_id, "document_id");
    const objectId = requiredText(object_id, "object_id");
    const now = timestamp(clock);
    return transact(tenantId, async (client) => {
      const canonical = await selectCanonicalObject(client, tenantId, { documentId, objectId });
      assertExpectedMatter(canonical, expected_matter_id);
      await assertCanonicalDeleteProtection(client, tenantId, canonical, now);
      return Object.freeze({ allowed: true, provider_retention_enforced: storage.capabilities.provider_retention });
    }, { readOnly: true });
  }

  async function verifyStoredDeleteApproval(tenantId, intent) {
    if (typeof verifyPermanentDeleteApproval !== "function") {
      throw codedError(
        "DMS permanent delete execution requires an independently verified approval receipt",
        "DMS_PERMANENT_DELETE_APPROVAL_REQUIRED",
        403,
      );
    }
    const storedReceipt = Object.freeze({
      receipt_ref: requiredText(intent.approval_receipt_ref, "approval receipt_ref"),
      receipt_sha256: requiredSha256(intent.approval_receipt_sha256, "approval receipt_sha256"),
      key_id: requiredText(intent.approval_key_id, "approval key_id"),
    });
    const approval = await verifyPermanentDeleteApproval({
      tenant_id: tenantId,
      document_id: intent.document_id,
      object_id: intent.object_id,
      requested_by: intent.requested_by,
      approval_receipt: storedReceipt,
      execution_reverification: true,
    });
    if (
      approval?.verified !== true
      || approval.receipt_ref !== storedReceipt.receipt_ref
      || approval.receipt_sha256 !== storedReceipt.receipt_sha256
      || approval.key_id !== storedReceipt.key_id
    ) {
      throw codedError(
        "DMS permanent delete approval receipt failed execution re-verification",
        "DMS_PERMANENT_DELETE_APPROVAL_INVALID",
        403,
      );
    }
    return storedReceipt;
  }

  async function requestCommittedObjectDelete(input = {}) {
    if (storage.capabilities.conditional_delete !== true) {
      throw codedError("storage adapter does not support conditional committed delete", "DMS_STORAGE_DELETE_NOT_SUPPORTED", 409);
    }
    const tenantId = requiredText(input.tenant_id, "tenant_id");
    const documentId = requiredText(input.document_id, "document_id");
    const objectId = requiredText(input.object_id, "object_id");
    const idempotencyKey = requiredText(input.idempotency_key, "idempotency_key");
    const requestedBy = requiredText(input.requested_by, "requested_by");
    if (typeof verifyPermanentDeleteApproval !== "function") {
      throw codedError(
        "DMS permanent delete requires an independently verified approval receipt",
        "DMS_PERMANENT_DELETE_APPROVAL_REQUIRED",
        403,
      );
    }
    const approval = await verifyPermanentDeleteApproval({
      tenant_id: tenantId,
      document_id: documentId,
      object_id: objectId,
      requested_by: requestedBy,
      approval_receipt: input.approval_receipt,
    });
    if (approval?.verified !== true) {
      throw codedError(
        "DMS permanent delete approval receipt was not verified",
        "DMS_PERMANENT_DELETE_APPROVAL_INVALID",
        403,
      );
    }
    const approvalReceiptRef = requiredText(approval.receipt_ref, "approval receipt_ref");
    const approvalReceiptSha256 = requiredSha256(approval.receipt_sha256, "approval receipt_sha256");
    const approvalKeyId = requiredText(approval.key_id, "approval key_id");
    const intentId = input.delete_intent_id ? requiredText(input.delete_intent_id, "delete_intent_id") : `dms-delete:${idFactory()}`;
    const createdAt = timestamp(clock);
    return transact(tenantId, async (client) => {
      const existing = await client.query(
        `SELECT * FROM lawos_dms.delete_intents WHERE tenant_id = $1 AND idempotency_key = $2 FOR UPDATE`,
        [tenantId, idempotencyKey],
      );
      if (existing.rows[0]) {
        const row = existing.rows[0];
        if (
          row.document_id !== documentId
          || row.object_id !== objectId
          || row.requested_by !== requestedBy
          || row.approval_receipt_sha256 !== approvalReceiptSha256
        ) {
          throw codedError("DMS delete idempotency key was reused with a different request", "DMS_IDEMPOTENCY_CONFLICT");
        }
        return Object.freeze({ intent: Object.freeze({ ...row }), replayed: true });
      }
      const canonical = await selectCanonicalObject(client, tenantId, { documentId, objectId, lock: true });
      assertExpectedMatter(canonical, input.expected_matter_id);
      await assertCanonicalDeleteProtection(client, tenantId, canonical, createdAt);
      const inserted = await client.query(
        `INSERT INTO lawos_dms.delete_intents
           (tenant_id, delete_intent_id, idempotency_key, document_id, object_id, file_object_id,
            expected_version_id, expected_sha256, requested_by, approval_receipt_ref,
            approval_receipt_sha256, approval_key_id, permanent_delete_approval_verified,
            state, next_attempt_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, true,
                 'pending', $13::timestamptz, $13::timestamptz, $13::timestamptz)
         RETURNING *`,
        [tenantId, intentId, idempotencyKey, canonical.document_id, canonical.object_id, canonical.file_object_id,
          canonical.version_id, canonical.sha256, requestedBy, approvalReceiptRef, approvalReceiptSha256,
          approvalKeyId, createdAt],
      );
      await client.query(
        `UPDATE lawos_dms.file_objects SET status = 'delete_pending'
          WHERE tenant_id = $1 AND file_object_id = $2 AND status = 'committed'`,
        [tenantId, canonical.file_object_id],
      );
      await appendAudit(client, {
        tenant_id: tenantId,
        event_id: `audit:${intentId}:created`,
        event_type: "dms.object_delete.intent_created",
        actor_id: requestedBy,
        object_type: "DmsDocument",
        object_id: canonical.document_id,
        payload: { delete_intent_id: intentId, object_id: canonical.object_id },
        created_at: createdAt,
      });
      return Object.freeze({ intent: Object.freeze({ ...inserted.rows[0] }), replayed: false });
    });
  }

  async function finalizeDeleteIntent(tenantId, intentId) {
    const completedAt = timestamp(clock);
    return transact(tenantId, async (client) => {
      const result = await client.query(
        `SELECT * FROM lawos_dms.delete_intents
          WHERE tenant_id = $1 AND delete_intent_id = $2 FOR UPDATE`,
        [tenantId, intentId],
      );
      const intent = result.rows[0];
      if (!intent) throw codedError("DMS delete intent was not found", "DMS_DELETE_INTENT_NOT_FOUND", 404);
      if (intent.state === "completed") return Object.freeze({ intent: Object.freeze({ ...intent }), replayed: true });
      if (intent.state !== "provider_deleted" || !intent.provider_receipt) {
        throw codedError("DMS delete intent requires provider deletion receipt", "DMS_DELETE_INTENT_INVALID_STATE");
      }
      await client.query(
        `UPDATE lawos_dms.file_objects
            SET status = 'deleted', deleted_at = $3::timestamptz
          WHERE tenant_id = $1 AND file_object_id = $2 AND status = 'delete_pending'`,
        [tenantId, intent.file_object_id, completedAt],
      );
      await client.query(
        `UPDATE lawos_dms.documents
            SET current_version_id = CASE WHEN current_version_id = $3 THEN NULL ELSE current_version_id END,
                status = CASE WHEN current_version_id = $3 THEN 'deleted' ELSE status END,
                updated_at = $4::timestamptz
          WHERE tenant_id = $1 AND document_id = $2`,
        [tenantId, intent.document_id, intent.expected_version_id, completedAt],
      );
      const updated = await client.query(
        `UPDATE lawos_dms.delete_intents
            SET state = 'completed', completed_at = $3::timestamptz,
                lease_owner = NULL, lease_token = NULL, lease_expires_at = NULL,
                updated_at = $3::timestamptz
          WHERE tenant_id = $1 AND delete_intent_id = $2
          RETURNING *`,
        [tenantId, intentId, completedAt],
      );
      await appendAudit(client, {
        tenant_id: tenantId,
        event_id: `audit:${intentId}:completed`,
        event_type: "dms.object_delete.completed",
        actor_id: intent.requested_by,
        object_type: "DmsDocument",
        object_id: intent.document_id,
        payload: { delete_intent_id: intentId, object_id: intent.object_id },
        created_at: completedAt,
      });
      await client.query(
        `INSERT INTO lawos_dms.outbox_events
           (tenant_id, event_id, event_type, aggregate_type, aggregate_id, payload, status, created_at)
         VALUES ($1, $2, 'dms.object_delete.completed', 'DmsDocument', $3, $4::jsonb, 'pending', $5::timestamptz)
         ON CONFLICT (tenant_id, event_id) DO NOTHING`,
        [tenantId, `outbox:${intentId}:completed`, intent.document_id, JSON.stringify({ delete_intent_id: intentId }), completedAt],
      );
      return Object.freeze({ intent: Object.freeze({ ...updated.rows[0] }), replayed: false });
    });
  }

  async function executeCommittedObjectDelete({ tenant_id, delete_intent_id, _lease_token = null } = {}) {
    const tenantId = requiredText(tenant_id, "tenant_id");
    const intentId = requiredText(delete_intent_id, "delete_intent_id");
    const claimedAt = timestamp(clock);
    const leaseToken = _lease_token ?? `delete-lease:${idFactory()}`;
    const leaseExpiresAt = new Date(Date.parse(claimedAt) + finalizeLeaseMillis).toISOString();
    let intent = await transact(tenantId, async (client) => {
      const result = await client.query(
        `SELECT * FROM lawos_dms.delete_intents
          WHERE tenant_id = $1 AND delete_intent_id = $2 FOR UPDATE`,
        [tenantId, intentId],
      );
      const current = result.rows[0];
      if (!current) throw codedError("DMS delete intent was not found", "DMS_DELETE_INTENT_NOT_FOUND", 404);
      if (current.state === "completed") return current;
      if (!["pending", "provider_deleted"].includes(current.state)) throw codedError("DMS delete intent is terminal", "DMS_DELETE_INTENT_INVALID_STATE");
      if (
        current.permanent_delete_approval_verified !== true
        || !current.approval_receipt_ref
        || !current.approval_receipt_sha256
        || !current.approval_key_id
      ) {
        throw codedError("DMS permanent delete approval is absent", "DMS_PERMANENT_DELETE_APPROVAL_REQUIRED", 403);
      }
      if (_lease_token && (current.lease_token !== _lease_token || current.lease_owner !== runtimeWorkerId)) {
        throw codedError("DMS delete intent claim was lost", "DMS_DELETE_LEASE_LOST");
      }
      if (current.lease_expires_at && Date.parse(current.lease_expires_at) > Date.parse(claimedAt)) {
        if (!_lease_token) throw codedError("DMS delete intent lease is active", "DMS_DELETE_LEASE_ACTIVE");
      }
      if (current.state === "pending") {
        const canonical = await selectCanonicalObject(client, tenantId, {
          documentId: current.document_id,
          objectId: current.object_id,
          lock: true,
          allowedStatuses: ["delete_pending"],
        });
        if (canonical.sha256 !== current.expected_sha256 || canonical.version_id !== current.expected_version_id) {
          throw codedError("DMS delete intent version changed", "DMS_COMMITTED_DELETE_CONDITION_FAILED");
        }
        await assertCanonicalDeleteProtection(client, tenantId, canonical, claimedAt);
      }
      if (_lease_token) return current;
      const claimed = await client.query(
        `UPDATE lawos_dms.delete_intents
            SET lease_owner = $3, lease_token = $4, lease_expires_at = $5::timestamptz,
                updated_at = $6::timestamptz
          WHERE tenant_id = $1 AND delete_intent_id = $2
          RETURNING *`,
        [tenantId, intentId, runtimeWorkerId, leaseToken, leaseExpiresAt, claimedAt],
      );
      return claimed.rows[0];
    });
    if (intent.state === "completed") return Object.freeze({ intent: Object.freeze({ ...intent }), replayed: true });
    if (intent.state !== "provider_deleted") {
      let providerDeleted = false;
      try {
        await verifyStoredDeleteApproval(tenantId, intent);
        const providerReceipt = await storage.deleteCommittedObject({
          tenant_id: tenantId,
          object_id: intent.object_id,
          expected_sha256: intent.expected_sha256,
        });
        providerDeleted = true;
        const providerDeletedAt = timestamp(clock);
        intent = await transact(tenantId, async (client) => {
          const updated = await client.query(
            `UPDATE lawos_dms.delete_intents
                SET state = 'provider_deleted', provider_receipt = $3::jsonb,
                    provider_deleted_at = $4::timestamptz,
                    attempt_count = attempt_count + 1, last_error_code = NULL, updated_at = $4::timestamptz
              WHERE tenant_id = $1 AND delete_intent_id = $2 AND lease_token = $5
              RETURNING *`,
            [tenantId, intentId, JSON.stringify({ ...providerReceipt, raw_path_exposed: false, bytes_exposed: false }), providerDeletedAt, leaseToken],
          );
          if (!updated.rows[0]) throw codedError("DMS delete intent compare-and-swap failed", "DMS_DELETE_LEASE_LOST");
          return updated.rows[0];
        });
        faultInjector?.("after_provider_delete_before_tombstone", { delete_intent_id: intentId });
      } catch (error) {
        if (!providerDeleted) {
          await transact(tenantId, (client) => client.query(
            `UPDATE lawos_dms.delete_intents
                SET lease_owner = NULL, lease_token = NULL, lease_expires_at = NULL, updated_at = $3::timestamptz
              WHERE tenant_id = $1 AND delete_intent_id = $2 AND state = 'pending' AND lease_token = $4`,
            [tenantId, intentId, timestamp(clock), leaseToken],
          ));
        }
        throw error;
      }
    }
    return finalizeDeleteIntent(tenantId, intentId);
  }

  async function reconcileDeleteIntents({ tenant_id, limit = 100 } = {}) {
    const tenantId = requiredText(tenant_id, "tenant_id");
    const boundedLimit = Number(limit);
    if (!Number.isSafeInteger(boundedLimit) || boundedLimit < 1 || boundedLimit > 1_000) throw new TypeError("limit must be an integer between 1 and 1000");
    const now = timestamp(clock);
    const leaseToken = `delete-reconcile:${idFactory()}`;
    const leaseExpiresAt = new Date(Date.parse(now) + reconcileLeaseMillis).toISOString();
    const intents = await transact(tenantId, async (client) => {
      const result = await client.query(
        `WITH candidates AS (
           SELECT tenant_id, delete_intent_id
             FROM lawos_dms.delete_intents
            WHERE tenant_id = $1 AND state IN ('pending', 'provider_deleted')
              AND next_attempt_at <= $2::timestamptz
              AND (lease_expires_at IS NULL OR lease_expires_at <= $2::timestamptz)
            ORDER BY next_attempt_at, created_at, delete_intent_id
            FOR UPDATE SKIP LOCKED
            LIMIT $3
         )
         UPDATE lawos_dms.delete_intents target
            SET lease_owner = $4, lease_token = $5, lease_expires_at = $6::timestamptz,
                updated_at = $2::timestamptz
           FROM candidates
          WHERE target.tenant_id = candidates.tenant_id
            AND target.delete_intent_id = candidates.delete_intent_id
         RETURNING target.*`,
        [tenantId, now, boundedLimit, runtimeWorkerId, leaseToken, leaseExpiresAt],
      );
      return result.rows;
    });
    const outcomes = [];
    for (const intent of intents) {
      try {
        const result = await executeCommittedObjectDelete({ tenant_id: tenantId, delete_intent_id: intent.delete_intent_id, _lease_token: leaseToken });
        outcomes.push(Object.freeze({ delete_intent_id: intent.delete_intent_id, action: "delete_completed", state: result.intent.state }));
      } catch (error) {
        const failedAt = timestamp(clock);
        const nextAttemptCount = Number(intent.attempt_count) + 1;
        const terminal = nextAttemptCount >= maxReconciliationAttempts;
        const delay = Math.min(reconciliationBackoffMillis * (2 ** Math.max(0, nextAttemptCount - 1)), 60 * 60 * 1_000);
        const nextAttemptAt = new Date(Date.parse(failedAt) + delay).toISOString();
        const safeCode = safeErrorCode(error, "DMS_DELETE_RECONCILIATION_FAILED");
        await transact(tenantId, (client) => client.query(
          `UPDATE lawos_dms.delete_intents
              SET state = CASE WHEN $5::boolean THEN 'failed_terminal' ELSE state END,
                  attempt_count = $3, next_attempt_at = $4::timestamptz,
                  lease_owner = NULL, lease_token = NULL, lease_expires_at = NULL,
                  last_error_code = $6,
                  failed_terminal_at = CASE WHEN $5::boolean THEN $7::timestamptz ELSE failed_terminal_at END,
                  dead_letter_receipt = CASE WHEN $5::boolean THEN $8::jsonb ELSE dead_letter_receipt END,
                  updated_at = $7::timestamptz
            WHERE tenant_id = $1 AND delete_intent_id = $2 AND lease_token = $9`,
          [tenantId, intent.delete_intent_id, nextAttemptCount, nextAttemptAt, terminal, safeCode, failedAt,
            JSON.stringify(terminal ? { schema_version: "law-firm-os.dms-delete-dead-letter.v0.1", delete_intent_id: intent.delete_intent_id, attempt_count: nextAttemptCount, safe_error_code: safeCode, terminal_at: failedAt } : null),
            leaseToken],
        ));
        outcomes.push(Object.freeze({ delete_intent_id: intent.delete_intent_id, action: "error", safe_error_code: safeCode, terminal, retry_at: nextAttemptAt }));
      }
    }
    return Object.freeze(outcomes);
  }

  async function getDocumentState({ tenant_id, document_id } = {}) {
    const tenantId = requiredText(tenant_id, "tenant_id");
    const documentId = requiredText(document_id, "document_id");
    return transact(tenantId, async (client) => {
      const document = await client.query(
        `SELECT * FROM lawos_dms.documents WHERE tenant_id = $1 AND document_id = $2`,
        [tenantId, documentId],
      );
      if (!document.rows[0]) return null;
      const deleteIntent = await client.query(
        `SELECT delete_intent_id, state FROM lawos_dms.delete_intents
          WHERE tenant_id = $1 AND document_id = $2 AND state IN ('pending', 'provider_deleted')
          ORDER BY created_at LIMIT 1`,
        [tenantId, documentId],
      );
      if (deleteIntent.rows[0]) {
        throw codedError("DMS document bytes are unavailable while delete is pending", "DMS_OBJECT_DELETE_PENDING", 409, {
          delete_intent_id: deleteIntent.rows[0].delete_intent_id,
        });
      }
      const versions = await client.query(
        `SELECT * FROM lawos_dms.document_versions WHERE tenant_id = $1 AND document_id = $2 ORDER BY version_number`,
        [tenantId, documentId],
      );
      const objects = await client.query(
        `SELECT f.* FROM lawos_dms.file_objects f
          JOIN lawos_dms.document_versions v
            ON v.tenant_id = f.tenant_id AND v.file_object_id = f.file_object_id
         WHERE v.tenant_id = $1 AND v.document_id = $2 ORDER BY v.version_number`,
        [tenantId, documentId],
      );
      const audit = await client.query(
        `SELECT * FROM lawos_dms.audit_events WHERE tenant_id = $1 AND object_id = $2 ORDER BY created_at, event_id`,
        [tenantId, documentId],
      );
      const outbox = await client.query(
        `SELECT * FROM lawos_dms.outbox_events WHERE tenant_id = $1 AND aggregate_id = $2 ORDER BY created_at, event_id`,
        [tenantId, documentId],
      );
      return Object.freeze({
        document: Object.freeze({ ...document.rows[0] }),
        versions: Object.freeze(versions.rows.map((row) => Object.freeze({ ...row, version_number: Number(row.version_number) }))),
        file_objects: Object.freeze(objects.rows.map((row) => Object.freeze({ ...row, byte_size: Number(row.byte_size) }))),
        audit_events: Object.freeze(audit.rows.map((row) => Object.freeze({ ...row }))),
        outbox_events: Object.freeze(outbox.rows.map((row) => Object.freeze({ ...row }))),
      });
    }, { readOnly: true });
  }

  async function listDocuments({ tenant_id, matter_id = null, actor_id = "dms-api" } = {}) {
    const tenantId = requiredText(tenant_id, "tenant_id");
    const matterId = matter_id == null ? null : requiredText(matter_id, "matter_id");
    const actorId = requiredText(actor_id, "actor_id");
    const documents = await transact(tenantId, async (client) => {
      const result = await client.query(
        `SELECT d.tenant_id, d.document_id, d.matter_id, d.workspace_id, d.title, d.status,
                d.current_version_id, d.permission_envelope_id, d.audit_trace_id,
                d.legal_hold_status, d.created_at, d.updated_at,
                v.version_number, v.file_object_id, v.sha256 AS version_sha256,
                v.created_by, v.created_at AS version_created_at,
                f.object_id, f.adapter_id, f.sha256 AS object_sha256,
                f.byte_size, f.content_type, f.status AS file_object_status
           FROM lawos_dms.documents d
           LEFT JOIN lawos_dms.document_versions v
             ON v.tenant_id = d.tenant_id AND v.version_id = d.current_version_id
           LEFT JOIN lawos_dms.file_objects f
             ON f.tenant_id = v.tenant_id AND f.file_object_id = v.file_object_id
          WHERE d.tenant_id = $1 AND ($2::text IS NULL OR d.matter_id = $2)
          ORDER BY d.updated_at DESC, d.document_id`,
        [tenantId, matterId],
      );
      return result.rows.map((row) => Object.freeze({
        document: Object.freeze({
          tenant_id: row.tenant_id,
          document_id: row.document_id,
          matter_id: row.matter_id,
          workspace_id: row.workspace_id,
          title: row.title,
          status: row.status,
          current_version_id: row.current_version_id,
          permission_envelope_id: row.permission_envelope_id,
          audit_trace_id: row.audit_trace_id,
          legal_hold_status: row.legal_hold_status,
          created_at: new Date(row.created_at).toISOString(),
          updated_at: new Date(row.updated_at).toISOString(),
        }),
        version: row.current_version_id ? Object.freeze({
          version_id: row.current_version_id,
          version_number: Number(row.version_number),
          file_object_id: row.file_object_id,
          sha256: row.version_sha256,
          created_by: row.created_by,
          created_at: new Date(row.version_created_at).toISOString(),
        }) : null,
        file_object: row.object_id ? Object.freeze({
          file_object_id: row.file_object_id,
          object_id: row.object_id,
          adapter_id: row.adapter_id,
          sha256: row.object_sha256,
          byte_size: Number(row.byte_size),
          content_type: row.content_type,
          status: row.file_object_status,
          raw_path_exposed: false,
          storage_pointer_ref_included: false,
        }) : null,
      }));
    }, { readOnly: true });
    const occurredAt = timestamp(clock);
    await transact(tenantId, (client) => appendAudit(client, {
      tenant_id: tenantId,
      event_id: `audit:dms-document-list:${idFactory()}`,
      event_type: "dms.document.listed",
      actor_id: actorId,
      object_type: "DmsDocumentCollection",
      object_id: "vault-documents",
      payload: { matter_id: matterId, returned_count: documents.length, raw_payload_included: false },
      created_at: occurredAt,
    }));
    return Object.freeze(documents);
  }

  async function downloadDocument({ tenant_id, document_id, actor_id = "dms-api" } = {}) {
    const tenantId = requiredText(tenant_id, "tenant_id");
    const documentId = requiredText(document_id, "document_id");
    const actorId = requiredText(actor_id, "actor_id");
    const state = await getDocumentState({ tenant_id: tenantId, document_id: documentId });
    if (!state) throw codedError("DMS document was not found", "DMS_DOCUMENT_NOT_FOUND", 404);
    const version = state.versions.find((item) => item.version_id === state.document.current_version_id);
    const fileObject = state.file_objects.find((item) => item.file_object_id === version?.file_object_id);
    if (!version || !fileObject || fileObject.status !== "committed") {
      throw codedError("DMS current object is unavailable", "DMS_COMMITTED_OBJECT_NOT_FOUND", 404);
    }
    const object = await storage.getObject({ tenant_id: tenantId, object_id: fileObject.object_id });
    const objectByteSize = object.byte_size == null ? Buffer.byteLength(object.bytes) : Number(object.byte_size);
    if (object.sha256 !== fileObject.sha256 || objectByteSize !== Number(fileObject.byte_size)) {
      throw codedError("DMS provider readback does not match PostgreSQL metadata", "DMS_COMMITTED_DIGEST_MISMATCH", 409);
    }
    const independentDigest = await storage.digestObject({ tenant_id: tenantId, object_id: fileObject.object_id });
    if (independentDigest?.sha256 !== fileObject.sha256 || Number(independentDigest?.byte_size) !== Number(fileObject.byte_size)) {
      throw codedError("DMS independent provider digest does not match PostgreSQL metadata", "DMS_COMMITTED_DIGEST_MISMATCH", 409);
    }
    const occurredAt = timestamp(clock);
    const auditEventId = `audit:dms-document-download:${idFactory()}`;
    await transact(tenantId, (client) => appendAudit(client, {
      tenant_id: tenantId,
      event_id: auditEventId,
      event_type: "dms.document.downloaded",
      actor_id: actorId,
      object_type: "DmsDocument",
      object_id: documentId,
      payload: { version_id: version.version_id, sha256: fileObject.sha256, byte_size: Number(fileObject.byte_size) },
      created_at: occurredAt,
    }));
    return Object.freeze({
      document: state.document,
      version,
      file_object: Object.freeze({ ...fileObject, storage_pointer_ref: undefined }),
      bytes: Buffer.from(object.bytes),
      sha256: object.sha256,
      byte_size: objectByteSize,
      mime_type: object.mime_type ?? fileObject.content_type,
      audit_event_id: auditEventId,
    });
  }

  async function listAuditEvents({ tenant_id, matter_id = null } = {}) {
    const tenantId = requiredText(tenant_id, "tenant_id");
    const matterId = matter_id == null ? null : requiredText(matter_id, "matter_id");
    return transact(tenantId, async (client) => {
      const result = await client.query(
        `SELECT a.tenant_id, a.event_id, a.event_type, a.actor_id, a.object_type,
                a.object_id, a.payload, a.created_at,
                COALESCE(d.matter_id, s.matter_id, NULLIF(a.payload->>'matter_id', '')) AS matter_id
           FROM lawos_dms.audit_events a
           LEFT JOIN lawos_dms.documents d
             ON d.tenant_id = a.tenant_id
            AND (d.document_id = a.object_id OR d.document_id = a.payload->>'document_id')
           LEFT JOIN lawos_dms.upload_sessions s
             ON s.tenant_id = a.tenant_id AND s.session_id = a.object_id
          WHERE a.tenant_id = $1
            AND ($2::text IS NULL OR COALESCE(d.matter_id, s.matter_id, NULLIF(a.payload->>'matter_id', '')) = $2)
          ORDER BY a.created_at, a.event_id`,
        [tenantId, matterId],
      );
      return Object.freeze(result.rows.map((row) => Object.freeze({
        ...row,
        created_at: new Date(row.created_at).toISOString(),
        raw_payload_included: false,
        document_bytes_included: false,
      })));
    }, { readOnly: true });
  }

  return Object.freeze({
    source_only: sourceOnly === true,
    api_authority_active: sourceOnly !== true,
    capabilities: Object.freeze({
      authority: "postgres-v2",
      tenant_rls: true,
      provider_finalize_before_metadata: true,
      independent_digest_readback: true,
      legal_hold_priority: true,
      retention_guard: true,
      permanent_delete_requires_verified_approval: true,
      json_fallback: false,
      dual_write: false,
    }),
    production_ready_claim: false,
    storage_contract_version: storage.contract_version,
    createUploadSession,
    nextUploadExpiry,
    getUploadSession,
    getLatestUploadIntentRetirement,
    resolveUploadIntentGeneration,
    rolloverExpiredUploadIntent,
    stageUpload,
    finalizeUpload,
    uploadDocument,
    cleanupOrphan,
    reconcileUploadSessions,
    placeLegalHold,
    setRetentionPolicy,
    assertCommittedObjectDeleteAllowed,
    requestCommittedObjectDelete,
    executeCommittedObjectDelete,
    reconcileDeleteIntents,
    getGovernanceAuthorizationResource,
    getDocumentState,
    listDocuments,
    downloadDocument,
    listAuditEvents,
  });
}
