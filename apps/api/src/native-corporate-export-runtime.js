import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { createDmsAuditEvent } from "../../../packages/dms/src/audit.js";
import { assertNoClientSuppliedVaultAuthority } from "../../../packages/dms/src/vault-operation-receipt.js";
import { hashDomainValue } from "../../../packages/persistence/src/domain-ledger.js";
import { evaluateVaultCorporatePermission } from "./vault-corporate-permission.js";

export const NATIVE_CORPORATE_EXPORT_PREFIX = "/api/vault/desktop/corporate-export-";
export const NATIVE_CORPORATE_EXPORT_CHUNK_BYTES = 3 * 1024 * 1024;
export const NATIVE_CORPORATE_EXPORT_MAX_BYTES = 25 * 1024 * 1024;
const METHODS = new Set(["preflight", "authorize", "chunk", "complete"]);
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/u;
const SHA = /^[a-f0-9]{64}$/u;
const OPERATION = /^vaultop_[a-f0-9]{32}$/u;
const MIME = /^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/u;
const EXACT_FIELDS = ["document_id", "version_id", "file_object_id", "sha256", "byte_size", "mime_type"];
const STATE_FIELDS = ["schema_version", "operation_id", "tenant_id", "user_id", "workspace_id",
  "exact_version", "request_nonce_sha256", "issued_at", "expires_at", "attachment_name"];
const STATE_SCHEMA = "lawos.native-corporate-export.v1";
const TTL_MS = 5 * 60 * 1000;
const stateKey = (id, stage = "authorized") => `native-corporate-export:v1:${id}:${stage}`;
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
const validId = (value) => typeof value === "string" && ID.test(value);

function fail(code, status = 400) {
  throw Object.assign(new Error("Native corporate export failed"), {
    safe_error_code: `VAULT_CORPORATE_EXPORT_${code}`, status,
  });
}

function exact(value, fields) {
  if (!value || typeof value !== "object" || Array.isArray(value)
      || !isDeepStrictEqual(Object.keys(value).sort(), [...fields].sort())) fail("REQUEST_INVALID");
  return value;
}

function exactVersion(value) {
  exact(value, EXACT_FIELDS);
  if (["document_id", "version_id", "file_object_id"].some((field) => !validId(value[field]))
      || typeof value.sha256 !== "string" || !SHA.test(value.sha256)
      || typeof value.mime_type !== "string" || value.mime_type.length > 255 || !MIME.test(value.mime_type)
      || !Number.isSafeInteger(value.byte_size) || value.byte_size < 1
      || value.byte_size > NATIVE_CORPORATE_EXPORT_MAX_BYTES) fail("REQUEST_INVALID");
  return Object.freeze({ ...value });
}

function operationId(principal, nonce) {
  return `vaultop_${hashDomainValue({ schema: STATE_SCHEMA, tenant_id: principal.tenant_id,
    user_id: principal.user_id, request_nonce_sha256: nonce }).slice(0, 32)}`;
}

function attachmentName(version) {
  const extension = { "application/pdf": "pdf", "image/png": "png", "image/jpeg": "jpg" }[version.mime_type] ?? "bin";
  return `vault-document-${version.sha256.slice(0, 12)}.${extension}`;
}

function readState(repository, tenantId, id, stage) {
  return repository.getIdempotency({ tenant_id: tenantId, idempotency_key: stateKey(id, stage) })?.response ?? null;
}

function writeState(repository, state, stage, response, at) {
  const key = stateKey(state.operation_id, stage);
  const old = readState(repository, state.tenant_id, state.operation_id, stage);
  if (old) {
    if (!isDeepStrictEqual(old, response)) fail("IDEMPOTENCY_CONFLICT", 409);
    return;
  }
  repository.transaction(() => {
    repository.recordIdempotency({ tenant_id: state.tenant_id, idempotency_key: key,
      operation: STATE_SCHEMA, request_fingerprint: hashDomainValue(state), response, created_at: at });
    repository.appendAudit(createDmsAuditEvent({
      event_id: `native-corporate-export:${state.operation_id}:${stage}`,
      tenant_id: state.tenant_id, actor_id: state.user_id,
      action: "dms:document:export", object_type: "DmsDocument", object_id: state.exact_version.document_id,
      decision: "allow", reason: `native_export_${stage.split(":")[0]}`, occurred_at: at,
      metadata: { operation_id: state.operation_id, workspace_id: state.workspace_id, stage,
        version_id: state.exact_version.version_id, sha256: state.exact_version.sha256,
        byte_size: state.exact_version.byte_size, raw_bytes_included: false, storage_locator_included: false },
    }));
  });
}

function inspectState(repository, principal, id, now) {
  const state = readState(repository, principal.tenant_id, id);
  if (!state) fail("NOT_AUTHORIZED", 403);
  if (state.tenant_id !== principal.tenant_id || state.user_id !== principal.user_id) fail("NOT_AUTHORIZED", 403);
  exact(state, STATE_FIELDS);
  exactVersion(state.exact_version);
  const issuedAt = Date.parse(state.issued_at);
  const expiresAt = Date.parse(state.expires_at);
  if (state.schema_version !== STATE_SCHEMA || state.operation_id !== id
      || !validId(state.workspace_id) || !SHA.test(state.request_nonce_sha256 ?? "")
      || operationId(principal, state.request_nonce_sha256) !== id
      || !Number.isFinite(issuedAt) || expiresAt - issuedAt !== TTL_MS
      || new Date(issuedAt).toISOString() !== state.issued_at
      || new Date(expiresAt).toISOString() !== state.expires_at
      || state.attachment_name !== attachmentName(state.exact_version)) fail("STATE_INVALID", 409);
  if (!Number.isFinite(now) || now < issuedAt || now >= expiresAt) fail("EXPIRED", 409);
  return state;
}

function requireChunkReceipt(repository, state, offset) {
  const chunk = readState(repository, state.tenant_id, state.operation_id, `chunk:${offset}`);
  if (!chunk || !isDeepStrictEqual(Object.keys(chunk).sort(), ["offset", "byte_size", "sha256", "exact_version_sha256"].sort())
      || chunk.offset !== offset || chunk.byte_size !== Math.min(NATIVE_CORPORATE_EXPORT_CHUNK_BYTES, state.exact_version.byte_size - offset)
      || !SHA.test(chunk.sha256 ?? "") || chunk.exact_version_sha256 !== hashDomainValue(state.exact_version)) fail("INCOMPLETE", 409);
  return chunk;
}

async function requireTarget({ principal, context, dmsRuntime, workspaceId, requested }) {
  const state = await dmsRuntime.upload_runtime.getDocumentState({
    tenant_id: principal.tenant_id, document_id: requested.document_id,
  });
  const document = state?.document;
  const permission = evaluateVaultCorporatePermission({ context, repository: dmsRuntime.repository,
    document, tenantId: principal.tenant_id, workspaceId, action: "dms:document:download" });
  if (!document || document.status !== "active" || document.matter_id !== null
      || document.document_id !== requested.document_id || document.workspace_id !== workspaceId
      || context?.principal?.user_id !== principal.user_id || permission?.effect !== "allow") fail("NOT_AUTHORIZED", 403);
  const version = state.versions.find((item) => item.version_id === document.current_version_id);
  const file = state.file_objects.find((item) => item.file_object_id === version?.file_object_id);
  if (!version || !file || file.status !== "committed" || file.tenant_id !== principal.tenant_id
      || version.tenant_id !== principal.tenant_id || version.document_id !== document.document_id
      || version.sha256 !== file.sha256
      || !isDeepStrictEqual(requested, {
        document_id: document.document_id, version_id: version.version_id, file_object_id: file.file_object_id,
        sha256: file.sha256, byte_size: Number(file.byte_size), mime_type: file.content_type,
      })) fail("VERSION_MISMATCH", 409);
  return file;
}

function publicState(state, outcome) {
  return { outcome, ok: true, operation_id: state.operation_id, operation_kind: "export_exact_version",
    workspace_id: state.workspace_id, exact_version: state.exact_version, attachment_name: state.attachment_name,
    expires_at: state.expires_at, chunk_bytes: NATIVE_CORPORATE_EXPORT_CHUNK_BYTES,
    token_material_returned: false, storage_locator_returned: false, production_ready_claim: false };
}

export function isNativeCorporateExportApiPath(pathname) {
  return typeof pathname === "string" && pathname.startsWith(NATIVE_CORPORATE_EXPORT_PREFIX)
    && METHODS.has(pathname.slice(NATIVE_CORPORATE_EXPORT_PREFIX.length));
}

export async function handleNativeCorporateExportApiRequest({
  pathname, body, headers = {}, principal, context, requestId, sessionAuth, dmsRuntime, now = Date.now,
} = {}) {
  try {
    if (!isNativeCorporateExportApiPath(pathname)) fail("REQUEST_INVALID");
    assertNoClientSuppliedVaultAuthority(body);
    if (dmsRuntime?.authority !== "postgres-v2" || dmsRuntime.upload_runtime?.source_only !== false
        || typeof dmsRuntime.storage?.readObjectBounded !== "function"
        || !["getIdempotency", "recordIdempotency", "appendAudit", "transaction"].every((key) => typeof dmsRuntime.repository?.[key] === "function")
        || !validId(principal?.tenant_id) || !validId(principal?.user_id)) fail("AUTHORITY_UNAVAILABLE", 503);
    const projection = await sessionAuth.resolveVaultCapabilities({ principal, requestId });
    if (projection?.authoritative !== true || !projection.capabilities?.some((item) => item.id === "download" && item.allowed === true)) fail("NOT_AUTHORIZED", 403);
    const action = pathname.slice(NATIVE_CORPORATE_EXPORT_PREFIX.length);
    const repository = dmsRuntime.repository;
    const atMs = Number(now());
    if (!Number.isFinite(atMs)) fail("AUTHORITY_UNAVAILABLE", 503);
    const at = new Date(atMs).toISOString();
    if (action === "preflight" || action === "authorize") {
      exact(body, action === "preflight" ? ["workspace_id", "exact_version"]
        : ["workspace_id", "exact_version", "request_nonce_sha256"]);
      if (!validId(body.workspace_id)) fail("REQUEST_INVALID");
      const requested = exactVersion(body.exact_version);
      await requireTarget({ principal, context, dmsRuntime, workspaceId: body.workspace_id, requested });
      if (action === "preflight") return { status: 200, body: { request_id: requestId, outcome: "preflight_passed", ok: true,
        workspace_id: body.workspace_id, exact_version: requested, lawos_permission_checked: true,
        provider_authority_checked: false, provider_grant_created: false, raw_bytes_included: false,
        token_material_returned: false, storage_locator_returned: false, production_ready_claim: false } };
      if (!SHA.test(body.request_nonce_sha256 ?? "")) fail("REQUEST_INVALID");
      const id = operationId(principal, body.request_nonce_sha256);
      let state = readState(repository, principal.tenant_id, id);
      if (state) {
        state = inspectState(repository, principal, id, atMs);
        if (state.workspace_id !== body.workspace_id || !isDeepStrictEqual(state.exact_version, requested)) fail("IDEMPOTENCY_CONFLICT", 409);
      } else {
        state = { schema_version: STATE_SCHEMA, operation_id: id, tenant_id: principal.tenant_id, user_id: principal.user_id,
          workspace_id: body.workspace_id, exact_version: requested, request_nonce_sha256: body.request_nonce_sha256,
          issued_at: at, expires_at: new Date(atMs + TTL_MS).toISOString(), attachment_name: attachmentName(requested) };
        writeState(repository, state, "authorized", state, at);
      }
      return { status: 200, body: { request_id: requestId, ...publicState(state, "export_authorized") } };
    }
    exact(body, action === "chunk" ? ["operation_id", "offset"] : ["operation_id", "exact_version"]);
    if (!OPERATION.test(body.operation_id ?? "")) fail("REQUEST_INVALID");
    const state = inspectState(repository, principal, body.operation_id, atMs);
    const requested = state.exact_version;
    const file = await requireTarget({ principal, context, dmsRuntime, workspaceId: state.workspace_id, requested });
    if (action === "chunk") {
      const offset = body.offset;
      if (!Number.isSafeInteger(offset) || offset < 0 || offset >= requested.byte_size
          || offset % NATIVE_CORPORATE_EXPORT_CHUNK_BYTES !== 0) fail("OFFSET_INVALID");
      if (headers["idempotency-key"] !== `${state.operation_id}:${offset}`) fail("IDEMPOTENCY_CONFLICT", 409);
      if (readState(repository, principal.tenant_id, state.operation_id, "delivered")) fail("ALREADY_DELIVERED", 409);
      if (offset > 0) requireChunkReceipt(repository, state, offset - NATIVE_CORPORATE_EXPORT_CHUNK_BYTES);
      // ponytail: at most 25 MiB per bounded read; use provider ranges only if measured repeated-read cost warrants it.
      const object = await dmsRuntime.storage.readObjectBounded({
        tenant_id: principal.tenant_id, object_id: file.object_id, max_bytes: requested.byte_size,
      });
      if (!Buffer.isBuffer(object.bytes) || object.bytes.length !== requested.byte_size
          || object.tenant_id !== principal.tenant_id || object.object_id !== file.object_id
          || object.byte_size !== requested.byte_size || object.sha256 !== requested.sha256
          || digest(object.bytes) !== requested.sha256 || object.mime_type !== requested.mime_type) fail("BODY_MISMATCH", 409);
      inspectState(repository, principal, state.operation_id, Number(now()));
      const chunk = object.bytes.subarray(offset, Math.min(offset + NATIVE_CORPORATE_EXPORT_CHUNK_BYTES, requested.byte_size));
      const receipt = { offset, byte_size: chunk.length, sha256: digest(chunk), exact_version_sha256: hashDomainValue(requested) };
      writeState(repository, state, `chunk:${offset}`, receipt, at);
      return { status: 200, body: { request_id: requestId, ...publicState(state, "chunk_verified"),
        chunk: { ...receipt, content_base64: chunk.toString("base64") },
        next_offset: offset + chunk.length, final_chunk: offset + chunk.length === requested.byte_size } };
    }
    if (headers["idempotency-key"] !== state.operation_id) fail("IDEMPOTENCY_CONFLICT", 409);
    if (!isDeepStrictEqual(exactVersion(body.exact_version), requested)) fail("VERSION_MISMATCH", 409);
    for (let offset = 0; offset < requested.byte_size; offset += NATIVE_CORPORATE_EXPORT_CHUNK_BYTES) {
      requireChunkReceipt(repository, state, offset);
    }
    const complete = { ...publicState(state, "delivered"), stage: "delivered", exact_readback_verified: true,
      receipt: { stage: "delivered", receipt_id: `native-corporate-export:${state.operation_id}:delivered` } };
    writeState(repository, state, "delivered", complete, at);
    return { status: 200, body: { request_id: requestId, ...complete } };
  } catch (error) {
    if (dmsRuntime?.repository?.appendAudit && validId(principal?.tenant_id) && validId(principal?.user_id)) {
      dmsRuntime.repository.appendAudit(createDmsAuditEvent({
        event_id: `native-corporate-export:denied:${requestId}`,
        tenant_id: principal.tenant_id, actor_id: principal.user_id, action: "dms:document:export",
        object_type: "DmsExportRequest", object_id: "native-corporate-export", decision: "deny",
        reason: error?.safe_error_code ?? "VAULT_CORPORATE_EXPORT_AUTHORITY_UNAVAILABLE",
        occurred_at: new Date(Number(now())).toISOString(),
        metadata: { raw_bytes_included: false, storage_locator_included: false },
      }));
    }
    return { status: Number.isInteger(error?.status) ? error.status : 503, body: {
      request_id: requestId, outcome: "blocked", ok: false,
      safe_error_codes: [error?.safe_error_code ?? "VAULT_CORPORATE_EXPORT_AUTHORITY_UNAVAILABLE"],
      raw_bytes_included: false, token_material_returned: false, storage_locator_returned: false,
      production_ready_claim: false,
    } };
  }
}
