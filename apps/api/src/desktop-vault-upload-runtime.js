import { createHash, randomBytes, randomUUID } from "node:crypto";

import { hashDomainValue } from "../../../packages/persistence/src/domain-ledger.js";
import {
  assertNoClientSuppliedVaultAuthority,
  assertNoVaultBoundarySecrets,
  assertVaultOperationBinding,
  classifyVaultOperationReceiptTransition,
  classifyVaultOperationReplay,
  createVaultOperationAuditEvent,
  createVaultOperationBinding,
  createVaultOperationReceipt,
} from "../../../packages/dms/src/vault-operation-receipt.js";
import {
  normalizeAmicVaultUploadCommit,
  normalizeAmicVaultUploadPreflight,
  normalizeAmicVaultUploadReadback,
  normalizeAmicVaultUploadTransfer,
  requireAmicVaultUploadProvider,
  requireAmicVaultStagedUploadProvider,
} from "./amic-vault-upload-provider.js";
import { evaluateRouteDecision } from "./permission-gate.js";
import { vaultOperationOwnerForRuntime } from "./vault-operation-owner.js";

export const DESKTOP_VAULT_UPLOAD_PREFLIGHT_PATH =
  "/api/vault/desktop/upload-preflight";
export const DESKTOP_VAULT_UPLOAD_PATH = "/api/vault/desktop/upload";
export const DESKTOP_VAULT_UPLOAD_TRANSFER_PATH = "/api/vault/desktop/upload-transfer";
export const DESKTOP_VAULT_UPLOAD_STATUS_PATH = "/api/vault/desktop/upload-status";
export const DESKTOP_VAULT_UPLOAD_MAX_BYTES = 1024 * 1024 * 1024;
export const DESKTOP_VAULT_LEGACY_UPLOAD_MAX_BYTES = 16 * 1024 * 1024;
export const DESKTOP_VAULT_UPLOAD_REQUEST_MAX_BYTES =
  DESKTOP_VAULT_LEGACY_UPLOAD_MAX_BYTES + 64 * 1024;
export const DESKTOP_VAULT_UPLOAD_OPERATION_TTL_MS = 2 * 60 * 60 * 1000;
export const DESKTOP_VAULT_DIRECT_UPLOAD_HEADER = "x-amic-vault-upload-transport";
export const DESKTOP_VAULT_DIRECT_UPLOAD_TRANSPORT = "s3-presigned-put-v1";
const legacyUploadTransport = "lambda-multipart-v1";

const PREFLIGHT_KEY_PREFIX = "amic-os-vault-preflight:";
const FINAL_KEY_PREFIX = "amic-os-vault-final:";
const OPERATION_ID = /^vaultop_[a-f0-9]{32}$/u;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/u;

const FILE_POLICY = Object.freeze({
  pdf: Object.freeze({ mime: Object.freeze(["application/pdf"]), signature: "pdf" }),
  png: Object.freeze({ mime: Object.freeze(["image/png"]), signature: "png" }),
  gif: Object.freeze({ mime: Object.freeze(["image/gif"]), signature: "gif" }),
  jpg: Object.freeze({ mime: Object.freeze(["image/jpeg"]), signature: "jpeg" }),
  jpeg: Object.freeze({ mime: Object.freeze(["image/jpeg"]), signature: "jpeg" }),
  zip: Object.freeze({ mime: Object.freeze(["application/zip", "application/x-zip-compressed"]), signature: "zip" }),
  docx: Object.freeze({ mime: Object.freeze(["application/vnd.openxmlformats-officedocument.wordprocessingml.document"]), signature: "zip" }),
  xlsx: Object.freeze({ mime: Object.freeze(["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]), signature: "zip" }),
  pptx: Object.freeze({ mime: Object.freeze(["application/vnd.openxmlformats-officedocument.presentationml.presentation"]), signature: "zip" }),
  doc: Object.freeze({ mime: Object.freeze(["application/msword", "application/x-ole-storage"]), signature: "ole" }),
  xls: Object.freeze({ mime: Object.freeze(["application/vnd.ms-excel", "application/x-ole-storage"]), signature: "ole" }),
  ppt: Object.freeze({ mime: Object.freeze(["application/vnd.ms-powerpoint", "application/x-ole-storage"]), signature: "ole" }),
  txt: Object.freeze({ mime: Object.freeze(["text/plain"]), signature: "utf8" }),
  csv: Object.freeze({ mime: Object.freeze(["text/csv", "application/csv", "text/plain"]), signature: "utf8" }),
});

class DesktopVaultUploadError extends Error {
  constructor(safeErrorCode, message, status = 400) {
    super(message);
    this.name = "DesktopVaultUploadError";
    this.code = `LAWOS_${safeErrorCode}`;
    this.safe_error_code = safeErrorCode;
    this.status = status;
  }
}

function fail(code, message, status = 400) {
  throw new DesktopVaultUploadError(code, message, status);
}

function nowIso(now) {
  return new Date(now()).toISOString();
}

function exactObjectKeys(value, expected, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail("VAULT_DESKTOP_REQUEST_INVALID", `${label} must be an object`);
  }
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    fail("VAULT_DESKTOP_REQUEST_INVALID", `${label} fields are invalid`);
  }
}

function requiredId(value, field) {
  if (typeof value !== "string" || !SAFE_ID.test(value)) {
    fail("VAULT_DESKTOP_REQUEST_INVALID", `${field} is invalid`);
  }
  return value;
}

function optionalId(value, field) {
  return value == null ? null : requiredId(value, field);
}

function blocked(requestId, error) {
  const code = typeof error?.safe_error_code === "string"
    ? error.safe_error_code
    : "VAULT_DESKTOP_UPLOAD_FAILED";
  const status = Number.isInteger(error?.status) ? error.status : 500;
  return Object.freeze({
    status,
    body: Object.freeze({
      request_id: requestId,
      outcome: "blocked",
      ok: false,
      safe_error_codes: Object.freeze([code]),
      count_leak_prevented: true,
      raw_path_included: false,
      raw_bytes_included: false,
      token_material_returned: false,
      production_ready_claim: false,
    }),
  });
}

function recordBy(repository, query, predicate) {
  return repository.list(query).find(predicate) ?? null;
}

function resolveMatter({ matterRuntime, tenantId, matterId }) {
  const matter = recordBy(
    matterRuntime?.repository,
    { tenant_id: tenantId, model_type: "Matter" },
    (record) => record.matter_id === matterId,
  );
  if (!matter || matter.silent === true || matter.hidden_from_actor === true) {
    fail("VAULT_DESKTOP_MATTER_NOT_AVAILABLE", "Matter is not available", 404);
  }
  if (!["opening", "open"].includes(matter.status)
      || matter.wip_status === "ethical_wall") {
    fail("VAULT_DESKTOP_MATTER_LIFECYCLE_BLOCKED", "Matter lifecycle blocks Vault writes", 409);
  }
  return matter;
}

function requirePermission({ context, tenantId, matterId, action }) {
  const decision = evaluateRouteDecision({
    context,
    resource: Object.freeze({
      tenant_id: tenantId,
      resource_type: "vault_document",
      matter_id: matterId,
    }),
    action,
  });
  if (decision.effect !== "allow") {
    fail("VAULT_DESKTOP_PERMISSION_DENIED", "Vault upload permission was denied", 403);
  }
}

async function requireUploadAuthority({ sessionAuth, principal, context, matterId, requestId }) {
  const projection = await sessionAuth.resolveVaultCapabilities({ principal, requestId });
  const upload = projection?.capabilities?.find((item) => item.id === "upload");
  if (projection?.authoritative !== true || upload?.allowed !== true) {
    fail(
      upload?.safe_reason_code ?? "VAULT_AUTHORITY_UNAVAILABLE",
      "Authoritative Vault upload capability is unavailable",
      403,
    );
  }
  requirePermission({
    context,
    tenantId: principal.tenant_id,
    matterId,
    action: "vault:upload:preflight",
  });
  requirePermission({
    context,
    tenantId: principal.tenant_id,
    matterId,
    action: "dms:document:write",
  });
  return projection;
}

function operationStateKey(operationId) {
  return `${PREFLIGHT_KEY_PREFIX}${operationId}`;
}

function finalStateKey(operationId) {
  return `${FINAL_KEY_PREFIX}${operationId}`;
}

function persistOperationState(repository, state) {
  repository.recordIdempotency({
    tenant_id: state.binding.tenant_id,
    idempotency_key: operationStateKey(state.binding.operation_id),
    operation: "amic_os_vault_desktop_upload_preflight",
    request_fingerprint: state.binding.request_fingerprint,
    response: state,
    created_at: state.created_at,
  });
  return state;
}

function readOperationState(repository, tenantId, operationId) {
  return repository.getIdempotency({
    tenant_id: tenantId,
    idempotency_key: operationStateKey(operationId),
  })?.response ?? null;
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
    fail("VAULT_DESKTOP_OPERATION_STATE_INVALID", "Vault upload operation stage regressed", 409);
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

function normalizePreflightBody(body) {
  exactObjectKeys(body, ["matter_id", "workspace_id", "folder_id"], "desktop Vault preflight");
  assertNoClientSuppliedVaultAuthority(body);
  return Object.freeze({
    matterId: requiredId(body.matter_id, "matter_id"),
    workspaceId: optionalId(body.workspace_id, "workspace_id"),
    folderId: optionalId(body.folder_id, "folder_id"),
  });
}

function extensionOf(filename) {
  const index = filename.lastIndexOf(".");
  return index > 0 && index < filename.length - 1
    ? filename.slice(index + 1).toLowerCase()
    : "";
}

function hasSignature(bytes, signature) {
  if (signature === "pdf") return bytes.subarray(0, 5).toString("ascii") === "%PDF-";
  if (signature === "png") return bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (signature === "gif") return ["GIF87a", "GIF89a"].includes(bytes.subarray(0, 6).toString("ascii"));
  if (signature === "jpeg") return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (signature === "zip") {
    return bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b
      && [[0x03, 0x04], [0x05, 0x06], [0x07, 0x08]].some(([left, right]) => bytes[2] === left && bytes[3] === right);
  }
  if (signature === "ole") return bytes.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]));
  if (signature === "utf8") {
    if (bytes.includes(0)) return false;
    try {
      new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

function decodeUploadFile(body) {
  exactObjectKeys(body, ["files", "operation_id"], "desktop Vault upload");
  const operationId = requiredId(body.operation_id, "operation_id");
  if (!OPERATION_ID.test(operationId)) {
    fail("VAULT_DESKTOP_OPERATION_INVALID", "Vault operation ID is invalid");
  }
  exactObjectKeys(body.files, ["file"], "desktop Vault upload files");
  const file = body.files.file;
  exactObjectKeys(file, ["filename", "mime_type", "byte_size", "content_base64"], "desktop Vault upload file");
  const filename = typeof file.filename === "string" ? file.filename.normalize("NFC") : "";
  if (!filename || filename.length > 240 || filename !== filename.trim()
      || /[\\/\u0000-\u001f\u007f]/u.test(filename)) {
    fail("VAULT_DESKTOP_FILENAME_BLOCKED", "Vault upload filename is invalid");
  }
  const extension = extensionOf(filename);
  const policy = FILE_POLICY[extension];
  const mimeType = typeof file.mime_type === "string" ? file.mime_type.trim().toLowerCase() : "";
  if (!policy || !policy.mime.includes(mimeType)) {
    fail("VAULT_DESKTOP_FILE_TYPE_BLOCKED", "Vault upload file type is not allowed", 415);
  }
  if (typeof file.content_base64 !== "string"
      || file.content_base64.length > Math.ceil(DESKTOP_VAULT_LEGACY_UPLOAD_MAX_BYTES / 3) * 4 + 4
      || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(file.content_base64)) {
    fail("VAULT_DESKTOP_FILE_ENCODING_INVALID", "Vault upload file encoding is invalid");
  }
  const bytes = Buffer.from(file.content_base64, "base64");
  const byteSize = Number(file.byte_size);
  if (!Number.isSafeInteger(byteSize) || byteSize !== bytes.byteLength || byteSize < 1) {
    fail("VAULT_DESKTOP_FILE_SIZE_MISMATCH", "Vault upload file size is invalid", 409);
  }
  if (byteSize > DESKTOP_VAULT_LEGACY_UPLOAD_MAX_BYTES) {
    fail("VAULT_DESKTOP_FILE_TOO_LARGE", "Vault upload file exceeds the size limit", 413);
  }
  if (!hasSignature(bytes, policy.signature)) {
    fail("VAULT_DESKTOP_FILE_SIGNATURE_MISMATCH", "Vault upload content does not match its declared type", 415);
  }
  return Object.freeze({
    operationId,
    filename,
    mimeType,
    byteSize,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    bytes,
  });
}

function normalizeDirectFile(value, { shaRequired }) {
  exactObjectKeys(
    value,
    shaRequired
      ? ["filename", "mime_type", "byte_size", "sha256"]
      : ["filename", "mime_type", "byte_size"],
    "desktop Vault direct upload file",
  );
  const filename = typeof value.filename === "string" ? value.filename.normalize("NFC") : "";
  if (!filename || filename.length > 240 || filename !== filename.trim()
      || /[\\/\u0000-\u001f\u007f]/u.test(filename)) {
    fail("VAULT_DESKTOP_FILENAME_BLOCKED", "Vault upload filename is invalid");
  }
  const extension = extensionOf(filename);
  const policy = FILE_POLICY[extension];
  const mimeType = typeof value.mime_type === "string" ? value.mime_type.trim().toLowerCase() : "";
  if (!policy || !policy.mime.includes(mimeType)) {
    fail("VAULT_DESKTOP_FILE_TYPE_BLOCKED", "Vault upload file type is not allowed", 415);
  }
  const byteSize = Number(value.byte_size);
  if (!Number.isSafeInteger(byteSize) || byteSize < 1 || byteSize > DESKTOP_VAULT_UPLOAD_MAX_BYTES) {
    fail("VAULT_DESKTOP_FILE_TOO_LARGE", "Vault upload file exceeds the size limit", 413);
  }
  const sha256 = shaRequired && typeof value.sha256 === "string" ? value.sha256 : null;
  if (shaRequired && !/^[a-f0-9]{64}$/u.test(sha256 ?? "")) {
    fail("VAULT_DESKTOP_FILE_HASH_INVALID", "Vault upload file hash is invalid", 409);
  }
  return Object.freeze({
    filename,
    mimeType,
    byteSize,
    ...(sha256 ? { sha256 } : {}),
  });
}

function decodeTransferFile(body) {
  exactObjectKeys(body, ["file", "operation_id"], "desktop Vault transfer");
  const operationId = requiredId(body.operation_id, "operation_id");
  if (!OPERATION_ID.test(operationId)) {
    fail("VAULT_DESKTOP_OPERATION_INVALID", "Vault operation ID is invalid");
  }
  return Object.freeze({ operationId, ...normalizeDirectFile(body.file, { shaRequired: false }) });
}

function decodeStagedUploadFile(body) {
  exactObjectKeys(body, ["file", "operation_id"], "desktop Vault completion");
  const operationId = requiredId(body.operation_id, "operation_id");
  if (!OPERATION_ID.test(operationId)) {
    fail("VAULT_DESKTOP_OPERATION_INVALID", "Vault operation ID is invalid");
  }
  return Object.freeze({ operationId, ...normalizeDirectFile(body.file, { shaRequired: true }) });
}

function stagedUploadBody(body) {
  return Boolean(body && typeof body === "object" && !Array.isArray(body) && Object.hasOwn(body, "file"));
}

function uploadOperationId(body) {
  exactObjectKeys(
    body,
    stagedUploadBody(body) ? ["file", "operation_id"] : ["files", "operation_id"],
    "desktop Vault upload",
  );
  const operationId = requiredId(body.operation_id, "operation_id");
  if (!OPERATION_ID.test(operationId)) {
    fail("VAULT_DESKTOP_OPERATION_INVALID", "Vault operation ID is invalid");
  }
  return operationId;
}

function assertCurrentPrincipal(binding, principal) {
  assertVaultOperationBinding(binding);
  if (binding.tenant_id !== principal?.tenant_id || binding.actor_id !== principal?.user_id) {
    fail("VAULT_DESKTOP_OPERATION_PRINCIPAL_MISMATCH", "Vault operation belongs to a different principal", 403);
  }
}

function uploadResponse({ requestId, binding, exactVersion, receipt, idempotentReplay }) {
  const item = Object.freeze({
    operation_id: binding.operation_id,
    document_id: exactVersion.document_id,
    version_id: exactVersion.version_id,
    file_object_id: exactVersion.file_object_id,
    sha256: exactVersion.sha256,
    byte_size: exactVersion.byte_size,
    mime_type: exactVersion.mime_type,
    audit_event_id: receipt.lawos_event_id,
    receipt,
    exact_readback_verified: true,
    raw_path_included: false,
    raw_bytes_included: false,
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
  return Object.freeze({ status: idempotentReplay ? 200 : 201, body });
}

function uploadPendingResponse({ requestId, binding, receipt, retryAfterMs, accepted }) {
  const body = Object.freeze({
    request_id: requestId,
    outcome: "processing",
    ok: true,
    operation_id: binding.operation_id,
    item: Object.freeze({
      operation_id: binding.operation_id,
      operation_kind: binding.operation_kind,
      stage: receipt.stage,
      receipt,
      accepted,
      retry_after_ms: retryAfterMs,
      exact_readback_verified: false,
      raw_path_included: false,
      raw_bytes_included: false,
      token_material_returned: false,
    }),
    idempotent_replay: false,
    safe_error_codes: Object.freeze([]),
    production_ready_claim: false,
  });
  assertNoVaultBoundarySecrets(body);
  return Object.freeze({ status: 202, body });
}

async function continueDesktopUploadOperation({
  state,
  repository,
  provider,
  principal,
  requestId,
  now,
}) {
  const fingerprint = state.upload_fingerprint;
  if (!fingerprint
      || typeof fingerprint.sha256 !== "string"
      || !Number.isSafeInteger(fingerprint.byte_size)
      || typeof fingerprint.mime_type !== "string") {
    fail("VAULT_DESKTOP_OPERATION_STATE_INVALID", "Vault upload fingerprint is missing", 409);
  }
  const replay = finalReplay({
    repository,
    requestId,
    binding: state.binding,
    upload: {
      sha256: fingerprint.sha256,
      byteSize: fingerprint.byte_size,
      mimeType: fingerprint.mime_type,
    },
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
      state.receipts.at(-1)?.safe_reason_code ?? "VAULT_DESKTOP_OPERATION_TERMINAL",
      "Vault upload operation is terminal",
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
      }),
      expected: fingerprint,
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
    persistOperationState(repository, Object.freeze({ ...state, receipts }));
    fail(providerReadback.safe_reason_code, "Vault rejected the quarantined upload", 409);
  }
  receipts = appendProviderProgress({
    repository,
    binding: state.binding,
    receipts,
    providerReadback,
    occurredAt: nowIso(now),
  });
  const receipt = receipts.at(-1);
  state = Object.freeze({ ...state, receipts });
  persistOperationState(repository, state);
  if (providerReadback.state !== "readback_verified") {
    return uploadPendingResponse({
      requestId,
      binding: state.binding,
      receipt,
      retryAfterMs: providerReadback.retry_after_ms,
      accepted: fingerprint,
    });
  }
  const exactVersion = providerReadback.exact_version;
  repository.recordIdempotency({
    tenant_id: principal.tenant_id,
    idempotency_key: finalStateKey(state.binding.operation_id),
    operation: "amic_os_vault_desktop_upload_final",
    request_fingerprint: state.binding.request_fingerprint,
    response: Object.freeze({
      idempotency_key_sha256: state.binding.idempotency_key_sha256,
      request_fingerprint: state.binding.request_fingerprint,
      upload_fingerprint: fingerprint,
      receipt,
    }),
    created_at: nowIso(now),
  });
  return uploadResponse({
    requestId,
    binding: state.binding,
    exactVersion,
    receipt,
    idempotentReplay: false,
  });
}

function finalReplay({ repository, requestId, binding, upload }) {
  const stored = repository.getIdempotency({
    tenant_id: binding.tenant_id,
    idempotency_key: finalStateKey(binding.operation_id),
  })?.response;
  if (!stored) return null;
  const replay = classifyVaultOperationReplay({
    binding,
    existing: {
      idempotency_key_sha256: binding.idempotency_key_sha256,
      request_fingerprint: binding.request_fingerprint,
      receipt: stored.receipt,
    },
  });
  const exact = replay.receipt.exact_version;
  if (exact.sha256 !== upload.sha256
      || exact.byte_size !== upload.byteSize
      || exact.mime_type !== upload.mimeType) {
    fail("VAULT_OPERATION_IDEMPOTENCY_CONFLICT", "Vault operation was retried with different bytes", 409);
  }
  return uploadResponse({
    requestId,
    binding,
    exactVersion: exact,
    receipt: replay.receipt,
    idempotentReplay: true,
  });
}

export function isDesktopVaultUploadApiPath(pathname) {
  return pathname === DESKTOP_VAULT_UPLOAD_PREFLIGHT_PATH
    || pathname === DESKTOP_VAULT_UPLOAD_TRANSFER_PATH
    || pathname === DESKTOP_VAULT_UPLOAD_PATH
    || pathname === DESKTOP_VAULT_UPLOAD_STATUS_PATH;
}

export async function handleDesktopVaultUploadPreflight({
  body,
  headers = {},
  principal,
  context,
  requestId,
  sessionAuth,
  matterRuntime,
  dmsRuntime,
  vaultUploadProvider,
  now = Date.now,
} = {}) {
  try {
    const input = normalizePreflightBody(body);
    const directUpload = String(headers[DESKTOP_VAULT_DIRECT_UPLOAD_HEADER] ?? "").trim()
      === DESKTOP_VAULT_DIRECT_UPLOAD_TRANSPORT;
    await requireUploadAuthority({
      sessionAuth,
      principal,
      context,
      matterId: input.matterId,
      requestId,
    });
    resolveMatter({
      matterRuntime,
      tenantId: principal.tenant_id,
      matterId: input.matterId,
    });
    const binding = createVaultOperationBinding({
      principal,
      operation_kind: "save_local_file",
      server_nonce_sha256: createHash("sha256").update(randomBytes(32)).digest("hex"),
      source_ref_sha256: hashDomainValue({ source_kind: "local_file", selection_state: "pending" }),
      target_ref_sha256: hashDomainValue({
        matter_id: input.matterId,
        workspace_selector: input.workspaceId,
        folder_selector: input.folderId,
      }),
      resolved_resource: {
        matter_id: input.matterId,
        exact_version: null,
        installation_ref_sha256: null,
        compose_target_sha256: null,
      },
    });
    const provider = directUpload
      ? requireAmicVaultStagedUploadProvider(vaultUploadProvider)
      : requireAmicVaultUploadProvider(vaultUploadProvider);
    const providerPreflight = normalizeAmicVaultUploadPreflight(
      await provider.preflightUpload(Object.freeze({
        principal: Object.freeze({
          tenant_id: principal.tenant_id,
          user_id: principal.user_id,
        }),
        lawos_matter_id: input.matterId,
        requested_workspace_id: input.workspaceId,
        requested_folder_id: input.folderId,
        operation_id: binding.operation_id,
        correlation_id: binding.correlation_id,
        request_id: requestId,
      })),
      {
        correlationId: binding.correlation_id,
        expected: { workspaceId: input.workspaceId, folderId: input.folderId },
        now,
      },
    );
    const createdAt = nowIso(now);
    const expiresAt = new Date(Math.min(
      Date.parse(providerPreflight.expires_at),
      now() + DESKTOP_VAULT_UPLOAD_OPERATION_TTL_MS,
    )).toISOString();
    let receipts = appendStage({
      repository: dmsRuntime.repository,
      binding,
      receipts: [],
      stage: "requested",
      occurredAt: createdAt,
    });
    receipts = appendStage({
      repository: dmsRuntime.repository,
      binding,
      receipts,
      stage: "authorized",
      occurredAt: nowIso(now),
      vaultEventId: providerPreflight.audit.event_id,
      authorityRef: providerPreflight.authority_ref,
    });
    persistOperationState(dmsRuntime.repository, Object.freeze({
      binding,
      receipts,
      provider_preflight: providerPreflight,
      created_at: createdAt,
      expires_at: expiresAt,
      upload_fingerprint: null,
      upload_transport: directUpload
        ? DESKTOP_VAULT_DIRECT_UPLOAD_TRANSPORT
        : legacyUploadTransport,
      transfer_file: null,
      provider_transfer_ref: null,
    }));
    const receipt = receipts.at(-1);
    const dlpEffect = providerPreflight.decisions.dlp.effect;
    const responseBody = Object.freeze({
      request_id: requestId,
      outcome: "preflight_passed",
      ok: true,
      item: Object.freeze({
        operation_id: binding.operation_id,
        permission_checked: true,
        ethical_wall_clear: true,
        records_gate_clear: true,
        dlp_gate_clear: dlpEffect === "allow",
        dlp_ingress_deferred: new Set(["pending", "deferred"]).has(dlpEffect),
        dlp_egress_authorized: false,
        bounded_ingress_policy_active: true,
        provider_authority_verified: true,
        vault_document_write_enabled: true,
        max_upload_bytes: directUpload
          ? DESKTOP_VAULT_UPLOAD_MAX_BYTES
          : DESKTOP_VAULT_LEGACY_UPLOAD_MAX_BYTES,
        expires_at: expiresAt,
        receipt,
        raw_path_included: false,
        token_material_returned: false,
      }),
      operation_id: binding.operation_id,
      max_upload_bytes: directUpload
        ? DESKTOP_VAULT_UPLOAD_MAX_BYTES
        : DESKTOP_VAULT_LEGACY_UPLOAD_MAX_BYTES,
      vault_document_write_enabled: true,
      safe_error_codes: Object.freeze([]),
      production_ready_claim: false,
    });
    assertNoVaultBoundarySecrets(responseBody);
    return Object.freeze({ status: 200, body: responseBody });
  } catch (error) {
    return blocked(requestId, error);
  }
}

export async function handleDesktopVaultUploadTransfer({
  body,
  headers = {},
  principal,
  context,
  requestId,
  sessionAuth,
  matterRuntime,
  dmsRuntime,
  vaultUploadProvider,
  now = Date.now,
} = {}) {
  try {
    const upload = decodeTransferFile(body);
    const headerOperationId = String(
      headers["idempotency-key"] ?? headers["x-idempotency-key"] ?? "",
    ).trim();
    if (headerOperationId !== upload.operationId) {
      fail("VAULT_DESKTOP_IDEMPOTENCY_KEY_MISMATCH", "Transfer idempotency key does not match the operation", 409);
    }
    let state = readOperationState(dmsRuntime.repository, principal.tenant_id, upload.operationId);
    if (!state) fail("VAULT_DESKTOP_OPERATION_NOT_FOUND", "Vault upload operation was not found", 404);
    assertCurrentPrincipal(state.binding, principal);
    if (state.upload_transport !== DESKTOP_VAULT_DIRECT_UPLOAD_TRANSPORT) {
      fail("VAULT_DESKTOP_TRANSFER_MODE_INVALID", "Vault upload operation does not support direct transfer", 409);
    }
    if (!state.provider_commit && Date.parse(state.expires_at) <= now()) {
      fail("VAULT_DESKTOP_OPERATION_EXPIRED", "Vault upload operation expired", 410);
    }
    const fileBinding = Object.freeze({
      filename: upload.filename,
      byte_size: upload.byteSize,
      mime_type: upload.mimeType,
    });
    if (state.transfer_file
        && (state.transfer_file.filename !== fileBinding.filename
          || state.transfer_file.byte_size !== fileBinding.byte_size
          || state.transfer_file.mime_type !== fileBinding.mime_type)) {
      fail("VAULT_OPERATION_IDEMPOTENCY_CONFLICT", "Vault operation was prepared for a different file", 409);
    }
    await requireUploadAuthority({
      sessionAuth,
      principal,
      context,
      matterId: state.binding.resolved_resource.matter_id,
      requestId,
    });
    resolveMatter({
      matterRuntime,
      tenantId: principal.tenant_id,
      matterId: state.binding.resolved_resource.matter_id,
    });
    const provider = requireAmicVaultStagedUploadProvider(vaultUploadProvider);
    const providerPreflight = state.provider_preflight;
    if (!providerPreflight?.preflight_ref) {
      fail("VAULT_PROVIDER_PREFLIGHT_MISSING", "Vault provider preflight is missing", 409);
    }
    const transfer = normalizeAmicVaultUploadTransfer(
      await provider.prepareStagedUpload(Object.freeze({
        principal: Object.freeze({
          tenant_id: principal.tenant_id,
          user_id: principal.user_id,
        }),
        preflight: providerPreflight,
        operation: Object.freeze({
          operation_id: state.binding.operation_id,
          correlation_id: state.binding.correlation_id,
          idempotency_key: state.binding.idempotency_key,
          operation_kind: "save_local_file",
        }),
        file: fileBinding,
        request_id: requestId,
      })),
      {
        authorityRef: providerPreflight.authority_ref,
        providerRevision: providerPreflight.provider_revision,
        expected: fileBinding,
        now,
      },
    );
    if (state.provider_transfer_ref && state.provider_transfer_ref !== transfer.transfer_ref) {
      fail("VAULT_OPERATION_IDEMPOTENCY_CONFLICT", "Vault transfer authority changed", 409);
    }
    state = Object.freeze({
      ...state,
      transfer_file: fileBinding,
      provider_transfer_ref: transfer.transfer_ref,
    });
    persistOperationState(dmsRuntime.repository, state);
    return Object.freeze({
      status: 200,
      body: Object.freeze({
        request_id: requestId,
        outcome: "transfer_ready",
        ok: true,
        operation_id: upload.operationId,
        transfer: Object.freeze({
          method: transfer.method,
          upload_url: transfer.upload_url,
          required_headers: transfer.required_headers,
          expires_at: transfer.expires_at,
          transfer_ref: transfer.transfer_ref,
          file: transfer.file,
        }),
        safe_error_codes: Object.freeze([]),
        raw_path_included: false,
        raw_bytes_included: false,
        transfer_grant_returned: true,
        production_ready_claim: false,
      }),
    });
  } catch (error) {
    return blocked(requestId, error);
  }
}

export async function handleDesktopVaultUpload({
  body,
  headers = {},
  principal,
  context,
  requestId,
  sessionAuth,
  matterRuntime,
  dmsRuntime,
  vaultUploadProvider,
  now = Date.now,
  operationOwnerClaimed = false,
} = {}) {
  try {
    const operationId = uploadOperationId(body);
    const headerOperationId = String(headers["idempotency-key"] ?? headers["x-idempotency-key"] ?? "").trim();
    if (headerOperationId !== operationId) {
      fail("VAULT_DESKTOP_IDEMPOTENCY_KEY_MISMATCH", "Upload idempotency key does not match the operation", 409);
    }
    const directUpload = stagedUploadBody(body);
    const upload = directUpload ? decodeStagedUploadFile(body) : decodeUploadFile(body);
    let state = readOperationState(dmsRuntime.repository, principal.tenant_id, upload.operationId);
    if (!state) fail("VAULT_DESKTOP_OPERATION_NOT_FOUND", "Vault upload operation was not found", 404);
    assertCurrentPrincipal(state.binding, principal);
    const expectedTransport = directUpload
      ? DESKTOP_VAULT_DIRECT_UPLOAD_TRANSPORT
      : legacyUploadTransport;
    if (state.upload_transport !== expectedTransport) {
      fail("VAULT_DESKTOP_TRANSFER_MODE_INVALID", "Vault upload transport changed", 409);
    }
    if (directUpload
        && (!state.transfer_file
          || state.transfer_file.filename !== upload.filename
          || state.transfer_file.byte_size !== upload.byteSize
          || state.transfer_file.mime_type !== upload.mimeType
          || typeof state.provider_transfer_ref !== "string")) {
      fail("VAULT_DESKTOP_TRANSFER_MISSING", "Vault direct transfer was not prepared", 409);
    }
    if (!state.provider_commit && Date.parse(state.expires_at) <= now()) {
      fail("VAULT_DESKTOP_OPERATION_EXPIRED", "Vault upload operation expired", 410);
    }
    const replay = finalReplay({
      repository: dmsRuntime.repository,
      requestId,
      binding: state.binding,
      upload,
    });
    if (replay) return replay;
    const fingerprint = Object.freeze({
      sha256: upload.sha256,
      byte_size: upload.byteSize,
      mime_type: upload.mimeType,
    });
    if (state.upload_fingerprint
        && (state.upload_fingerprint.sha256 !== fingerprint.sha256
          || state.upload_fingerprint.byte_size !== fingerprint.byte_size
          || state.upload_fingerprint.mime_type !== fingerprint.mime_type)) {
      fail("VAULT_OPERATION_IDEMPOTENCY_CONFLICT", "Vault operation was retried with different bytes", 409);
    }
    if (!state.provider_commit && !operationOwnerClaimed) {
      const owned = await vaultOperationOwnerForRuntime(dmsRuntime).run({
        tenantId: principal.tenant_id,
        operationId: state.binding.operation_id,
        requestFingerprint: hashDomainValue({
          binding_request_fingerprint: state.binding.request_fingerprint,
          upload_fingerprint: fingerprint,
        }),
        operation: () => handleDesktopVaultUpload({
          body,
          headers,
          principal,
          context,
          requestId,
          sessionAuth,
          matterRuntime,
          dmsRuntime,
          vaultUploadProvider,
          now,
          operationOwnerClaimed: true,
        }),
      });
      if (owned?.body?.request_id === requestId) return owned;
      return Object.freeze({
        ...owned,
        body: Object.freeze({ ...owned.body, request_id: requestId }),
      });
    }
    await requireUploadAuthority({
      sessionAuth,
      principal,
      context,
      matterId: state.binding.resolved_resource.matter_id,
      requestId,
    });
    const matterId = state.binding.resolved_resource.matter_id;
    resolveMatter({ matterRuntime, tenantId: principal.tenant_id, matterId });
    const provider = directUpload
      ? requireAmicVaultStagedUploadProvider(vaultUploadProvider)
      : requireAmicVaultUploadProvider(vaultUploadProvider);
    const providerPreflight = state.provider_preflight;
    if (!providerPreflight
        || providerPreflight.authority_kind !== "amic-vault-api"
        || providerPreflight.preflight_ref == null) {
      fail("VAULT_PROVIDER_PREFLIGHT_MISSING", "Vault provider preflight is missing", 409);
    }
    let receipts = state.receipts;
    if (receipts.at(-1)?.stage === "authorized") {
      receipts = appendStage({
        repository: dmsRuntime.repository,
        binding: state.binding,
        receipts,
        stage: "transferring",
        occurredAt: nowIso(now),
      });
      state = Object.freeze({ ...state, receipts, upload_fingerprint: fingerprint });
      persistOperationState(dmsRuntime.repository, state);
    }
    if (!new Set(["transferring", ...PROVIDER_PROGRESS_STAGES]).has(receipts.at(-1)?.stage)) {
      fail("VAULT_DESKTOP_OPERATION_STATE_INVALID", "Vault upload operation state is invalid", 409);
    }

    const expectedExact = Object.freeze({
      sha256: upload.sha256,
      byte_size: upload.byteSize,
      mime_type: upload.mimeType,
    });
    let providerCommit = state.provider_commit ?? null;
    if (!providerCommit) {
      providerCommit = normalizeAmicVaultUploadCommit(
        await (directUpload ? provider.completeStagedUpload : provider.commitUpload)(Object.freeze({
          principal: Object.freeze({
            tenant_id: principal.tenant_id,
            user_id: principal.user_id,
          }),
          preflight: providerPreflight,
          operation: Object.freeze({
            operation_id: state.binding.operation_id,
            correlation_id: state.binding.correlation_id,
            idempotency_key: state.binding.idempotency_key,
            operation_kind: "save_local_file",
          }),
          ...(directUpload
            ? { transfer: Object.freeze({ transfer_ref: state.provider_transfer_ref }) }
            : {}),
          file: Object.freeze({
            filename: upload.filename,
            mime_type: upload.mimeType,
            byte_size: upload.byteSize,
            sha256: upload.sha256,
            ...(directUpload ? {} : { bytes: upload.bytes }),
          }),
          request_id: requestId,
        })),
        {
          correlationId: state.binding.correlation_id,
          expected: expectedExact,
          authorityRef: providerPreflight.authority_ref,
          providerRevision: providerPreflight.provider_revision,
        },
      );
      receipts = appendStage({
        repository: dmsRuntime.repository,
        binding: state.binding,
        receipts,
        stage: "quarantined",
        occurredAt: nowIso(now),
        vaultEventId: providerCommit.audit.event_id,
        authorityRef: providerCommit.authority_ref,
      });
      state = Object.freeze({ ...state, receipts, provider_commit: providerCommit });
      persistOperationState(dmsRuntime.repository, state);
    }

    return continueDesktopUploadOperation({
      state,
      repository: dmsRuntime.repository,
      provider,
      principal,
      requestId,
      now,
    });
  } catch (error) {
    return blocked(requestId, error);
  }
}

export async function handleDesktopVaultUploadStatus({
  body,
  headers = {},
  requestId,
  principal,
  context,
  sessionAuth,
  matterRuntime,
  dmsRuntime,
  vaultUploadProvider,
  now = Date.now,
} = {}) {
  try {
    exactObjectKeys(body, ["operation_id"], "desktop Vault upload status");
    assertNoClientSuppliedVaultAuthority(body);
    const operationId = requiredId(body.operation_id, "operation_id");
    if (!OPERATION_ID.test(operationId)) {
      fail("VAULT_DESKTOP_OPERATION_INVALID", "Vault upload operation ID is invalid");
    }
    const headerOperationId = String(headers["idempotency-key"] ?? headers["x-idempotency-key"] ?? "").trim();
    if (headerOperationId !== operationId) {
      fail("VAULT_DESKTOP_IDEMPOTENCY_KEY_MISMATCH", "Upload idempotency key does not match the operation", 409);
    }
    const repository = dmsRuntime?.repository;
    if (!repository) fail("VAULT_DESKTOP_LEDGER_UNAVAILABLE", "Vault upload ledger is unavailable", 503);
    const state = readOperationState(repository, principal.tenant_id, operationId);
    if (!state) fail("VAULT_DESKTOP_OPERATION_NOT_FOUND", "Vault upload operation was not found", 404);
    assertCurrentPrincipal(state.binding, principal);
    await requireUploadAuthority({
      sessionAuth,
      principal,
      context,
      matterId: state.binding.resolved_resource.matter_id,
      requestId,
    });
    resolveMatter({
      matterRuntime,
      tenantId: principal.tenant_id,
      matterId: state.binding.resolved_resource.matter_id,
    });
    return continueDesktopUploadOperation({
      state,
      repository,
      provider: requireAmicVaultUploadProvider(vaultUploadProvider),
      principal,
      requestId,
      now,
    });
  } catch (error) {
    return blocked(requestId, error);
  }
}
