import { createHash, randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";

import {
  assertNoVaultBoundarySecrets,
  assertVaultOperationBinding,
  classifyVaultOperationReceiptTransition,
  createVaultOperationAuditEvent,
  createVaultOperationBinding,
  createVaultOperationReceipt,
} from "../../../packages/dms/src/vault-operation-receipt.js";
import { hashDomainValue } from "../../../packages/persistence/src/domain-ledger.js";
import {
  normalizeAmicVaultExportAuthorization,
  normalizeAmicVaultExportDownload,
  normalizeAmicVaultExportReadback,
  requireAmicVaultExportProvider,
} from "./amic-vault-export-provider.js";

const OPERATION_KINDS = new Set(["export_exact_version", "attach_outlook"]);
const SHA256 = /^[a-f0-9]{64}$/u;
const SAFE_OPERATION_ID = /^vaultop_[a-f0-9]{32}$/u;
const DEFAULT_MAX_EXPORT_BYTES = 25 * 1024 * 1024;
const STATE_PREFIX = "amic-os-vault-export-state:";
const FINAL_PREFIX = "amic-os-vault-export-final:";
const STATE_READ_ORDER = Object.freeze([
  "cleaned",
  "attached",
  "delivered",
  "downloaded",
  "authorized",
]);

export class AmicVaultExactExportError extends Error {
  constructor(safeErrorCode, message, status = 400) {
    super(message);
    this.name = "AmicVaultExactExportError";
    this.code = `LAWOS_${safeErrorCode}`;
    this.safe_error_code = safeErrorCode;
    this.status = status;
  }
}

function fail(code, message, status = 400) {
  throw new AmicVaultExactExportError(code, message, status);
}

function requiredSha256(value, field) {
  if (typeof value !== "string" || !SHA256.test(value)) {
    fail("VAULT_EXPORT_BINDING_INVALID", `${field} is invalid`);
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

function repositoryFrom(dmsRuntime) {
  const repository = dmsRuntime?.repository;
  if (!repository
      || typeof repository.getIdempotency !== "function"
      || typeof repository.recordIdempotency !== "function"
      || typeof repository.appendAudit !== "function") {
    fail("VAULT_EXPORT_LEDGER_UNAVAILABLE", "Vault export operation ledger is unavailable", 503);
  }
  return repository;
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
    fail("VAULT_EXPORT_STATE_INVALID", "Vault export operation state is invalid", 409);
  }
  repository.recordIdempotency({
    tenant_id: state.binding.tenant_id,
    idempotency_key: stateKey(state.binding.operation_id, stage),
    operation: "amic_os_vault_exact_export_state",
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
  vaultEventId = null,
  authorityRef = null,
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
    exact_version: binding.resolved_resource.exact_version,
  });
  classifyVaultOperationReceiptTransition({ previous, next: receipt });
  repository.appendAudit(createVaultOperationAuditEvent({ binding, receipt }));
  return Object.freeze([...receipts, receipt]);
}

function createBinding({
  principal,
  operationKind,
  requestNonceSha256,
  matterId,
  exactVersion,
  installationRefSha256,
  composeTargetSha256,
}) {
  const requestNonce = requiredSha256(requestNonceSha256, "requestNonceSha256");
  return createVaultOperationBinding({
    principal,
    operation_kind: operationKind,
    server_nonce_sha256: hashDomainValue({
      schema: "amic-os-vault-exact-export:v1",
      operation_kind: operationKind,
      request_nonce_sha256: requestNonce,
    }),
    source_ref_sha256: hashDomainValue({ exact_version: exactVersion }),
    target_ref_sha256: hashDomainValue({
      matter_id: matterId,
      installation_ref_sha256: installationRefSha256,
      compose_target_sha256: composeTargetSha256,
    }),
    resolved_resource: {
      matter_id: matterId,
      exact_version: exactVersion,
      installation_ref_sha256: installationRefSha256,
      compose_target_sha256: composeTargetSha256,
    },
  });
}

function assertState(state, {
  binding = null,
  principal = null,
  expectedLastStages = null,
} = {}) {
  if (!state || typeof state !== "object" || Array.isArray(state)) {
    fail("VAULT_EXPORT_STATE_INVALID", "Vault export operation state is invalid", 409);
  }
  assertVaultOperationBinding(state.binding);
  if ((binding && !isDeepStrictEqual(state.binding, binding))
      || (principal && (state.binding.tenant_id !== principal.tenant_id
        || state.binding.actor_id !== principal.user_id))
      || state.provider_export_state?.state !== "authorized"
      || !Array.isArray(state.receipts)) {
    fail("VAULT_OPERATION_IDEMPOTENCY_CONFLICT", "Vault export operation binding changed", 409);
  }
  if (expectedLastStages
      && !new Set(expectedLastStages).has(state.receipts.at(-1)?.stage)) {
    fail("VAULT_EXPORT_ALREADY_CONSUMED", "Vault export operation is no longer authorized for download", 409);
  }
  return state;
}

function authorizationResponse({ requestId, state, replay }) {
  const receipt = state.receipts.at(-1);
  const body = Object.freeze({
    request_id: requestId,
    outcome: replay ? "idempotent_authorization_replay" : "export_authorized",
    ok: true,
    operation_id: state.binding.operation_id,
    operation_kind: state.binding.operation_kind,
    expires_at: state.provider_export_state.expires_at,
    attachment_name: state.provider_export_state.attachment_name,
    exact_version: state.provider_export_state.exact_version,
    receipt,
    provider_authority_verified: true,
    delivery_grant_returned: false,
    raw_bytes_included: false,
    token_material_returned: false,
    storage_locator_returned: false,
    production_ready_claim: false,
  });
  assertNoVaultBoundarySecrets(body);
  return body;
}

function downloadResponse({ requestId, state }) {
  const receipt = state.receipts.at(-1);
  const body = Object.freeze({
    request_id: requestId,
    outcome: "downloaded",
    ok: true,
    operation_id: state.binding.operation_id,
    operation_kind: state.binding.operation_kind,
    attachment_name: state.provider_export_state.attachment_name,
    exact_version: state.provider_export_state.exact_version,
    receipt,
    provider_authority_verified: true,
    provider_consumption_verified: true,
    raw_bytes_included: false,
    token_material_returned: false,
    storage_locator_returned: false,
    production_ready_claim: false,
  });
  assertNoVaultBoundarySecrets(body);
  return body;
}

function completionResponse({ requestId, state }) {
  const receipt = state.receipts.at(-1);
  const body = Object.freeze({
    request_id: requestId,
    outcome: receipt.stage,
    ok: true,
    operation_id: state.binding.operation_id,
    operation_kind: state.binding.operation_kind,
    exact_version: state.provider_export_state.exact_version,
    receipt,
    provider_authority_verified: true,
    provider_consumption_verified: true,
    raw_bytes_included: false,
    token_material_returned: false,
    storage_locator_returned: false,
    production_ready_claim: false,
  });
  assertNoVaultBoundarySecrets(body);
  return body;
}

async function boundedExportBytes(body, { maxBytes, expected }) {
  if (!Number.isSafeInteger(maxBytes)
      || maxBytes < 1
      || maxBytes > DEFAULT_MAX_EXPORT_BYTES
      || expected.byte_size > maxBytes) {
    fail("VAULT_EXPORT_SIZE_INVALID", "Vault exact export exceeds the allowed size", 413);
  }
  const chunks = [];
  let byteSize = 0;
  const digest = createHash("sha256");
  const values = Buffer.isBuffer(body) || body instanceof Uint8Array
    ? [body]
    : body;
  for await (const value of values) {
    const chunk = Buffer.isBuffer(value) ? value : Buffer.from(value);
    byteSize += chunk.byteLength;
    if (byteSize > maxBytes || byteSize > expected.byte_size) {
      fail("VAULT_EXPORT_SIZE_MISMATCH", "Vault exact export body exceeded its binding", 409);
    }
    digest.update(chunk);
    chunks.push(chunk);
  }
  const sha256 = digest.digest("hex");
  if (byteSize !== expected.byte_size || sha256 !== expected.sha256) {
    fail("VAULT_EXPORT_BODY_MISMATCH", "Vault exact export body failed hash or size verification", 409);
  }
  return Buffer.concat(chunks, byteSize);
}

/**
 * Authorize a server-side, provider-owned one-time exact export. No delivery
 * token or provider grant crosses this API. A later host adapter may wrap the
 * operation in its own short-lived delivery channel.
 */
export async function authorizeAmicVaultExactExport({
  principal,
  dmsRuntime,
  vaultExportProvider,
  operationKind,
  requestNonceSha256,
  matterId,
  exactVersion,
  installationRefSha256 = null,
  composeTargetSha256 = null,
  requestId,
  now = Date.now,
} = {}) {
  if (!OPERATION_KINDS.has(operationKind)) {
    fail("VAULT_EXPORT_OPERATION_INVALID", "Vault export operation kind is invalid");
  }
  const binding = createBinding({
    principal,
    operationKind,
    requestNonceSha256,
    matterId,
    exactVersion,
    installationRefSha256,
    composeTargetSha256,
  });
  const repository = repositoryFrom(dmsRuntime);
  const final = readStored(repository, binding.tenant_id, finalKey(binding.operation_id));
  if (final) {
    if (final.request_fingerprint !== binding.request_fingerprint) {
      fail("VAULT_OPERATION_IDEMPOTENCY_CONFLICT", "Vault export replay material changed", 409);
    }
    fail("VAULT_EXPORT_ALREADY_CONSUMED", "Vault export operation was already consumed", 409);
  }
  const existing = readCurrentState(repository, binding.tenant_id, binding.operation_id);
  if (existing) {
    const state = assertState(existing, { binding });
    if (state.receipts.at(-1)?.stage !== "authorized") {
      fail("VAULT_EXPORT_ALREADY_CONSUMED", "Vault export operation was already consumed", 409);
    }
    if (Date.parse(state.provider_export_state.expires_at) <= now()) {
      fail("VAULT_EXPORT_GRANT_EXPIRED", "Vault export authorization expired", 410);
    }
    return authorizationResponse({ requestId, state, replay: true });
  }

  const provider = requireAmicVaultExportProvider(vaultExportProvider);
  const authorization = normalizeAmicVaultExportAuthorization(
    await provider.authorizeExactExport(Object.freeze({
      principal: Object.freeze({
        tenant_id: principal.tenant_id,
        user_id: principal.user_id,
      }),
      lawos_matter_id: matterId,
      requested_exact_version: binding.resolved_resource.exact_version,
      installation_ref_sha256: binding.resolved_resource.installation_ref_sha256,
      compose_target_sha256: binding.resolved_resource.compose_target_sha256,
      operation_id: binding.operation_id,
      correlation_id: binding.correlation_id,
      operation_kind: operationKind,
      idempotency_key: binding.idempotency_key,
    })),
    {
      correlationId: binding.correlation_id,
      expectedExactVersion: binding.resolved_resource.exact_version,
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
    vaultEventId: authorization.audit.event_id,
    authorityRef: authorization.authority_ref,
  });
  const state = Object.freeze({
    binding,
    provider_export_state: authorization,
    receipts,
    created_at: createdAt,
  });
  persistState(repository, state);
  return authorizationResponse({ requestId, state, replay: false });
}

/**
 * Consume one authorized provider export. The returned Buffer is server-owned
 * and must be streamed directly by a trusted host adapter; it must never be
 * serialized into renderer JSON, persistence, audit, or logs.
 */
export async function downloadAuthorizedAmicVaultExactExport({
  principal,
  dmsRuntime,
  vaultExportProvider,
  operationId,
  requestId,
  maxBytes = DEFAULT_MAX_EXPORT_BYTES,
  now = Date.now,
} = {}) {
  if (!SAFE_OPERATION_ID.test(String(operationId ?? ""))) {
    fail("VAULT_EXPORT_OPERATION_INVALID", "Vault export operation ID is invalid");
  }
  const repository = repositoryFrom(dmsRuntime);
  const final = readStored(repository, principal?.tenant_id, finalKey(operationId));
  if (final) fail("VAULT_EXPORT_ALREADY_CONSUMED", "Vault export operation was already consumed", 409);
  let state = assertState(
    readCurrentState(repository, principal?.tenant_id, operationId),
    { principal, expectedLastStages: ["authorized"] },
  );
  if (Date.parse(state.provider_export_state.expires_at) <= now()) {
    fail("VAULT_EXPORT_GRANT_EXPIRED", "Vault export authorization expired", 410);
  }
  if (!Number.isSafeInteger(maxBytes)
      || maxBytes < 1
      || maxBytes > DEFAULT_MAX_EXPORT_BYTES
      || state.provider_export_state.exact_version.byte_size > maxBytes) {
    fail("VAULT_EXPORT_SIZE_INVALID", "Vault exact export exceeds the allowed size", 413);
  }
  const provider = requireAmicVaultExportProvider(vaultExportProvider);
  const download = normalizeAmicVaultExportDownload(
    await provider.downloadExactExport(Object.freeze({
      principal: Object.freeze({
        tenant_id: principal.tenant_id,
        user_id: principal.user_id,
      }),
      lawos_matter_id: state.binding.resolved_resource.matter_id,
      installation_ref_sha256:
        state.binding.resolved_resource.installation_ref_sha256,
      compose_target_sha256:
        state.binding.resolved_resource.compose_target_sha256,
      operation: Object.freeze({
        operation_id: state.binding.operation_id,
        correlation_id: state.binding.correlation_id,
        operation_kind: state.binding.operation_kind,
        idempotency_key: state.binding.idempotency_key,
      }),
      authorization: state.provider_export_state,
    })),
    {
      correlationId: state.binding.correlation_id,
      authorization: state.provider_export_state,
    },
  );
  const bytes = await boundedExportBytes(download.body, {
    maxBytes,
    expected: state.provider_export_state.exact_version,
  });
  const readback = normalizeAmicVaultExportReadback(
    await provider.readbackExactExport(Object.freeze({
      principal: Object.freeze({
        tenant_id: principal.tenant_id,
        user_id: principal.user_id,
      }),
      lawos_matter_id: state.binding.resolved_resource.matter_id,
      installation_ref_sha256:
        state.binding.resolved_resource.installation_ref_sha256,
      compose_target_sha256:
        state.binding.resolved_resource.compose_target_sha256,
      operation: Object.freeze({
        operation_id: state.binding.operation_id,
        correlation_id: state.binding.correlation_id,
        operation_kind: state.binding.operation_kind,
      }),
      authorization: state.provider_export_state,
      download: Object.freeze({
        authority_kind: download.authority_kind,
        authority_ref: download.authority_ref,
        provider_revision: download.provider_revision,
        state: download.state,
        provider_export_ref: download.provider_export_ref,
        exact_version: download.exact_version,
        attachment_name: download.attachment_name,
        audit: download.audit,
      }),
    })),
    {
      correlationId: state.binding.correlation_id,
      authorization: state.provider_export_state,
    },
  );
  const receipts = appendStage({
    repository,
    binding: state.binding,
    receipts: state.receipts,
    stage: "downloaded",
    occurredAt: nowIso(now),
    vaultEventId: readback.audit.event_id,
    authorityRef: readback.authority_ref,
  });
  state = Object.freeze({
    ...state,
    receipts,
    provider_download_audit_ref: download.audit.event_id,
    provider_consumption_audit_ref: readback.audit.event_id,
    consumed_at: nowIso(now),
  });
  persistState(repository, state);
  return Object.freeze({
    public_response: downloadResponse({ requestId, state }),
    server_owned_bytes: bytes,
  });
}

/** Server-only inspection used to recheck current capability and Matter access. */
export function inspectAuthorizedAmicVaultExactExport({
  principal,
  dmsRuntime,
  operationId,
  now = Date.now,
} = {}) {
  if (!SAFE_OPERATION_ID.test(String(operationId ?? ""))) {
    fail("VAULT_EXPORT_OPERATION_INVALID", "Vault export operation ID is invalid");
  }
  const repository = repositoryFrom(dmsRuntime);
  if (readStored(repository, principal?.tenant_id, finalKey(operationId))) {
    fail("VAULT_EXPORT_ALREADY_CONSUMED", "Vault export operation was already consumed", 409);
  }
  const state = assertState(
    readCurrentState(repository, principal?.tenant_id, operationId),
    { principal, expectedLastStages: ["authorized"] },
  );
  if (Date.parse(state.provider_export_state.expires_at) <= now()) {
    fail("VAULT_EXPORT_GRANT_EXPIRED", "Vault export authorization expired", 410);
  }
  return Object.freeze({
    operation_id: state.binding.operation_id,
    operation_kind: state.binding.operation_kind,
    matter_id: state.binding.resolved_resource.matter_id,
    exact_version: state.binding.resolved_resource.exact_version,
    installation_ref_sha256:
      state.binding.resolved_resource.installation_ref_sha256,
    compose_target_sha256:
      state.binding.resolved_resource.compose_target_sha256,
    attachment_name: state.provider_export_state.attachment_name,
    expires_at: state.provider_export_state.expires_at,
  });
}

/** Server-only inspection used by a trusted host acknowledgement request. */
export function inspectDownloadedAmicVaultExactExport({
  principal,
  dmsRuntime,
  operationId,
} = {}) {
  if (!SAFE_OPERATION_ID.test(String(operationId ?? ""))) {
    fail("VAULT_EXPORT_OPERATION_INVALID", "Vault export operation ID is invalid");
  }
  const repository = repositoryFrom(dmsRuntime);
  const state = assertState(
    readCurrentState(repository, principal?.tenant_id, operationId),
    { principal, expectedLastStages: ["downloaded", "delivered", "attached"] },
  );
  return Object.freeze({
    operation_id: state.binding.operation_id,
    operation_kind: state.binding.operation_kind,
    matter_id: state.binding.resolved_resource.matter_id,
    exact_version: state.binding.resolved_resource.exact_version,
    installation_ref_sha256:
      state.binding.resolved_resource.installation_ref_sha256,
    compose_target_sha256:
      state.binding.resolved_resource.compose_target_sha256,
    attachment_name: state.provider_export_state.attachment_name,
  });
}

/**
 * Append delivery only after a trusted adapter has handed the verified body to
 * its host. Outlook attachment completion is recorded separately from a plain
 * desktop export; neither completion path can make provider bytes replayable.
 */
export function completeAmicVaultExactExport({
  principal,
  dmsRuntime,
  operationId,
  completionStage,
  expectedExactVersion = null,
  requestId,
  now = Date.now,
} = {}) {
  if (!SAFE_OPERATION_ID.test(String(operationId ?? ""))) {
    fail("VAULT_EXPORT_OPERATION_INVALID", "Vault export operation ID is invalid");
  }
  const expectedStage = completionStage === "delivered" || completionStage === "attached"
    ? completionStage
    : null;
  const repository = repositoryFrom(dmsRuntime);
  const final = readStored(repository, principal?.tenant_id, finalKey(operationId));
  let state = assertState(
    readCurrentState(repository, principal?.tenant_id, operationId),
    { principal, expectedLastStages: final ? ["delivered", "attached"] : ["downloaded"] },
  );
  const requiredStage = state.binding.operation_kind === "attach_outlook"
    ? "attached"
    : "delivered";
  if (expectedStage !== requiredStage) {
    fail("VAULT_EXPORT_COMPLETION_INVALID", "Vault export completion stage does not match its host operation", 409);
  }
  if (expectedExactVersion != null
      && !isDeepStrictEqual(
        state.binding.resolved_resource.exact_version,
        expectedExactVersion,
      )) {
    fail("VAULT_EXPORT_EXACT_VERSION_MISMATCH", "Vault export host acknowledgement changed exact version", 409);
  }
  if (final) {
    if (final.request_fingerprint !== state.binding.request_fingerprint
        || state.receipts.at(-1)?.stage !== requiredStage) {
      fail("VAULT_OPERATION_IDEMPOTENCY_CONFLICT", "Vault export completion replay changed", 409);
    }
    return completionResponse({ requestId, state });
  }
  const receipts = appendStage({
    repository,
    binding: state.binding,
    receipts: state.receipts,
    stage: requiredStage,
    occurredAt: nowIso(now),
    vaultEventId: state.provider_consumption_audit_ref,
    authorityRef: state.provider_export_state.authority_ref,
  });
  state = Object.freeze({ ...state, receipts, completed_at: nowIso(now) });
  persistState(repository, state);
  repository.recordIdempotency({
    tenant_id: state.binding.tenant_id,
    idempotency_key: finalKey(state.binding.operation_id),
    operation: "amic_os_vault_exact_export_final",
    request_fingerprint: state.binding.request_fingerprint,
    response: Object.freeze({
      idempotency_key_sha256: state.binding.idempotency_key_sha256,
      request_fingerprint: state.binding.request_fingerprint,
      receipt: receipts.at(-1),
    }),
    created_at: state.completed_at,
  });
  return completionResponse({ requestId, state });
}

export const AMIC_VAULT_EXACT_EXPORT_MAX_BYTES = DEFAULT_MAX_EXPORT_BYTES;
