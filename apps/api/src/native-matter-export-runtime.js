import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { createDmsAuditEvent } from "../../../packages/dms/src/audit.js";
import { hashDomainValue } from "../../../packages/persistence/src/domain-ledger.js";
import { documentRouteGate } from "./vault-dms-runtime-context.js";
import { isDesktopVaultExportApiPath, normalizeAuthorizeBody, normalizePreflightBody,
  normalizeDownloadBody, normalizeCompleteBody, requireDownloadAuthority } from "./desktop-vault-export-runtime.js";

// The installed desktop's Matter protocol uses one binary Lambda response.
// Leave room for base64 and response metadata within Lambda's 6 MiB envelope.
export const NATIVE_MATTER_EXPORT_MAX_BYTES = 4 * 1024 * 1024;
const SCHEMA = "lawos.native-matter-export.v1";
const TTL = 5 * 60 * 1000;
const key = (id, stage) => `${SCHEMA}:${id}:${stage}`;
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const operationId = (principal, nonce) => `vaultop_${hashDomainValue({ schema: SCHEMA,
  tenant_id: principal.tenant_id, user_id: principal.user_id, nonce }).slice(0, 32)}`;

function fail(code, status = 409) {
  throw Object.assign(new Error("Native Matter export failed"), { safe_error_code: `VAULT_NATIVE_EXPORT_${code}`, status });
}

function read(repository, tenantId, id, stage) {
  return repository.getIdempotency({ tenant_id: tenantId, idempotency_key: key(id, stage) })?.response ?? null;
}

function write(repository, state, stage, response, at) {
  const previous = read(repository, state.tenant_id, state.operation_id, stage);
  if (previous) {
    if (!isDeepStrictEqual(previous, response)) fail("IDEMPOTENCY_CONFLICT");
    return;
  }
  repository.transaction(() => {
    repository.recordIdempotency({ tenant_id: state.tenant_id, idempotency_key: key(state.operation_id, stage),
      operation: SCHEMA, request_fingerprint: hashDomainValue(state), response, created_at: at });
    repository.appendAudit(createDmsAuditEvent({ event_id: key(state.operation_id, stage),
      tenant_id: state.tenant_id, actor_id: state.user_id, action: "dms:document:export",
      object_type: "DmsDocument", object_id: state.input.exactVersion.document_id,
      decision: "allow", reason: `native_matter_export_${stage}`, occurred_at: at,
      metadata: { operation_id: state.operation_id, operation_kind: state.input.operationKind,
        matter_id: state.input.matterId, version_id: state.input.exactVersion.version_id,
        sha256: state.input.exactVersion.sha256, byte_size: state.input.exactVersion.byte_size,
        installation_ref_sha256: state.input.installationRefSha256,
        compose_target_sha256: state.input.composeTargetSha256,
        raw_bytes_included: false, storage_locator_included: false } }));
  });
}

function inspect(repository, principal, id, now) {
  const stored = repository.getIdempotency({ tenant_id: principal.tenant_id, idempotency_key: key(id, "authorized") });
  const state = stored?.response;
  if (!state || state.tenant_id !== principal.tenant_id || state.user_id !== principal.user_id) fail("NOT_AUTHORIZED", 403);
  const input = state.input;
  const canonical = normalizeAuthorizeBody({ matter_id: input?.matterId, exact_version: input?.exactVersion,
    request_nonce_sha256: input?.requestNonceSha256, ...(input?.operationKind === "attach_outlook" ? {
      operation_kind: "attach_outlook", installation_ref_sha256: input.installationRefSha256,
      compose_target_sha256: input.composeTargetSha256 } : {}) });
  if (stored.request_fingerprint !== hashDomainValue(state)
      || state.schema_version !== SCHEMA || state.operation_id !== id || !isDeepStrictEqual(input, canonical)
      || operationId(principal, input.requestNonceSha256) !== id
      || !Number.isFinite(Date.parse(state.issued_at))
      || new Date(Date.parse(state.issued_at) + TTL).toISOString() !== state.expires_at
      || typeof state.attachment_name !== "string" || !state.attachment_name
      || state.attachment_name.length > 240 || /[\\/\u0000-\u001f\u007f]/u.test(state.attachment_name)) fail("STATE_INVALID");
  if (now < Date.parse(state.issued_at) || now >= Date.parse(state.expires_at)) fail("EXPIRED");
  return state;
}

async function target({ principal, context, requestId, sessionAuth, matterRuntime, dmsRuntime }, input) {
  await requireDownloadAuthority({ principal, context, requestId, sessionAuth, matterRuntime,
    matterId: input.matterId, operationKind: input.operationKind });
  const requested = input.exactVersion;
  const state = await dmsRuntime.upload_runtime.getDocumentState({ tenant_id: principal.tenant_id,
    document_id: requested.document_id });
  const document = state?.document;
  if (!document || document.tenant_id !== principal.tenant_id || document.document_id !== requested.document_id
      || document.matter_id !== input.matterId || document.status !== "active"
      || context?.principal?.tenant_id !== principal.tenant_id || context.principal.user_id !== principal.user_id) fail("NOT_AUTHORIZED", 403);
  const denied = documentRouteGate({ context, requestId, document, runtime: dmsRuntime,
    action: "dms:document:download", query: { tenant_id: principal.tenant_id,
      permission_ref: "native-matter-export", audit_hint_ref: requestId } });
  if (denied) fail("NOT_AUTHORIZED", 403);
  const version = state.versions.find((item) => item.version_id === document.current_version_id);
  const file = state.file_objects.find((item) => item.file_object_id === version?.file_object_id);
  if (!version || !file || version.tenant_id !== principal.tenant_id || file.tenant_id !== principal.tenant_id
      || version.document_id !== document.document_id || file.status !== "committed" || version.sha256 !== file.sha256
      || !isDeepStrictEqual(requested, { document_id: document.document_id, version_id: version.version_id,
        file_object_id: file.file_object_id, sha256: file.sha256, byte_size: Number(file.byte_size), mime_type: file.content_type })) fail("VERSION_MISMATCH");
  if (requested.byte_size > NATIVE_MATTER_EXPORT_MAX_BYTES) fail("SIZE_LIMIT", 413);
  const extension = { "application/pdf": "pdf", "image/png": "png", "image/jpeg": "jpg", "message/rfc822": "eml",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx" }[requested.mime_type] ?? "bin";
  const title = String(document.filename ?? document.title ?? "").normalize("NFC").trim();
  const name = title && title.length <= 240 && !/[\\/\u0000-\u001f\u007f\uD800-\uDFFF]/u.test(title)
    ? title : `vault-document-${requested.sha256.slice(0, 12)}.${extension}`;
  return { file, name };
}

function publicState(state, outcome) {
  return { ok: true, outcome, operation_id: state.operation_id, operation_kind: state.input.operationKind,
    matter_id: state.input.matterId, exact_version: state.input.exactVersion, attachment_name: state.attachment_name,
    expires_at: state.expires_at, authority: "postgres-v2", raw_bytes_included: false,
    token_material_returned: false, storage_locator_returned: false, production_ready_claim: false };
}

export async function handleNativeMatterExportApiRequest(args = {}) {
  const { pathname, body, headers = {}, principal, requestId, dmsRuntime, now = Date.now } = args;
  try {
    const repository = dmsRuntime?.repository;
    if (!isDesktopVaultExportApiPath(pathname) || dmsRuntime?.authority !== "postgres-v2"
        || dmsRuntime.upload_runtime?.source_only !== false
        || typeof dmsRuntime.upload_runtime.getDocumentState !== "function"
        || typeof dmsRuntime.storage?.readObjectBounded !== "function"
        || !["getIdempotency", "recordIdempotency", "appendAudit", "transaction"].every((method) => typeof repository?.[method] === "function")) fail("AUTHORITY_UNAVAILABLE", 503);
    const action = pathname.split("export-")[1];
    const atMs = Number(now());
    if (!Number.isFinite(atMs)) fail("AUTHORITY_UNAVAILABLE", 503);
    const at = new Date(atMs).toISOString();
    if (action === "preflight" || action === "authorize") {
      const input = action === "preflight" ? normalizePreflightBody(body) : normalizeAuthorizeBody(body);
      const { name } = await target(args, input);
      if (action === "preflight") return { status: 200, body: { request_id: requestId, outcome: "preflight_passed", ok: true,
        matter_id: input.matterId, exact_version: input.exactVersion, lawos_permission_checked: true,
        provider_authority_checked: false, provider_grant_created: false, raw_bytes_included: false,
        token_material_returned: false, storage_locator_returned: false } };
      const id = operationId(principal, input.requestNonceSha256);
      if (read(repository, principal.tenant_id, id, "final") || read(repository, principal.tenant_id, id, "downloaded")) fail("ALREADY_CONSUMED");
      let state = read(repository, principal.tenant_id, id, "authorized");
      if (state) {
        state = inspect(repository, principal, id, atMs);
        if (!isDeepStrictEqual(state.input, input)) fail("IDEMPOTENCY_CONFLICT");
      } else {
        state = { schema_version: SCHEMA, operation_id: id, tenant_id: principal.tenant_id, user_id: principal.user_id,
          input, attachment_name: name, issued_at: at, expires_at: new Date(atMs + TTL).toISOString() };
        write(repository, state, "authorized", state, at);
      }
      return { status: 200, body: { request_id: requestId, ...publicState(state, "export_authorized") } };
    }
    const input = action === "download" ? normalizeDownloadBody(body) : normalizeCompleteBody(body);
    if (headers["idempotency-key"] !== input.operationId) fail("IDEMPOTENCY_CONFLICT");
    const state = inspect(repository, principal, input.operationId, atMs);
    const { file } = await target(args, state.input);
    const expected = state.input.exactVersion;
    if (action === "download") {
      if (read(repository, principal.tenant_id, state.operation_id, "downloaded")
          || read(repository, principal.tenant_id, state.operation_id, "final")) fail("ALREADY_CONSUMED");
      const object = await dmsRuntime.storage.readObjectBounded({ tenant_id: principal.tenant_id,
        object_id: file.object_id, max_bytes: expected.byte_size });
      if (!Buffer.isBuffer(object.bytes) || object.bytes.length !== expected.byte_size
          || object.tenant_id !== principal.tenant_id || object.object_id !== file.object_id
          || object.byte_size !== expected.byte_size || object.mime_type !== expected.mime_type
          || object.sha256 !== expected.sha256 || sha(object.bytes) !== expected.sha256) fail("BODY_MISMATCH");
      inspect(repository, principal, state.operation_id, Number(now()));
      await target(args, state.input);
      write(repository, state, "downloaded", { exact_version: expected, stage: "downloaded" }, at);
      return { status: 200, body: object.bytes, exact_version: expected, attachment_name: state.attachment_name,
        public_response: publicState(state, "downloaded") };
    }
    if (input.operationKind !== state.input.operationKind || input.installationRefSha256 !== state.input.installationRefSha256
        || input.composeTargetSha256 !== state.input.composeTargetSha256
        || !isDeepStrictEqual(input.exactVersion, expected)) fail("COMPLETION_MISMATCH");
    if (!isDeepStrictEqual(read(repository, principal.tenant_id, state.operation_id, "downloaded"),
      { exact_version: expected, stage: "downloaded" })) fail("INCOMPLETE");
    const complete = { ...publicState(state, input.completionStage),
      receipt: { receipt_id: key(state.operation_id, "final"), stage: input.completionStage,
        safe_reason_code: input.safeReasonCode }, exact_readback_verified: true };
    write(repository, state, "final", complete, at);
    return { status: 200, body: { request_id: requestId, ...complete } };
  } catch (error) {
    if (dmsRuntime?.authority === "postgres-v2" && dmsRuntime.repository?.appendAudit
        && principal?.tenant_id && principal?.user_id && typeof requestId === "string") {
      try {
        dmsRuntime.repository.appendAudit(createDmsAuditEvent({ event_id: `${SCHEMA}:denied:${requestId}`,
          tenant_id: principal.tenant_id, actor_id: principal.user_id, action: "dms:document:export",
          object_type: "DmsExportRequest", object_id: "native-matter-export", decision: "deny",
          reason: error?.safe_error_code ?? "VAULT_NATIVE_EXPORT_AUTHORITY_UNAVAILABLE", occurred_at: new Date().toISOString(),
          metadata: { raw_bytes_included: false, storage_locator_included: false } }));
      } catch {
        error = { status: 503, safe_error_code: "VAULT_NATIVE_EXPORT_AUDIT_UNAVAILABLE" };
      }
    }
    return { status: Number.isInteger(error?.status) ? error.status : 503, body: {
      request_id: requestId, ok: false, outcome: "blocked",
      safe_error_codes: [error?.safe_error_code ?? "VAULT_NATIVE_EXPORT_AUTHORITY_UNAVAILABLE"],
      raw_bytes_included: false, token_material_returned: false, storage_locator_returned: false, production_ready_claim: false } };
  }
}
