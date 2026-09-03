import {
  assertNoClientSuppliedVaultAuthority,
  assertNoVaultBoundarySecrets,
} from "../../../packages/dms/src/vault-operation-receipt.js";
import {
  AMIC_VAULT_EXACT_EXPORT_MAX_BYTES,
  authorizeAmicVaultExactExport,
  completeAmicVaultExactExport,
  downloadAuthorizedAmicVaultExactExport,
  inspectAuthorizedAmicVaultExactExport,
  inspectDownloadedAmicVaultExactExport,
} from "./amic-vault-exact-export-runtime.js";
import { evaluateRouteDecision } from "./permission-gate.js";

export const DESKTOP_VAULT_EXPORT_PREFLIGHT_PATH =
  "/api/vault/desktop/export-preflight";
export const DESKTOP_VAULT_EXPORT_AUTHORIZE_PATH =
  "/api/vault/desktop/export-authorize";
export const DESKTOP_VAULT_EXPORT_DOWNLOAD_PATH =
  "/api/vault/desktop/export-download";
export const DESKTOP_VAULT_EXPORT_COMPLETE_PATH =
  "/api/vault/desktop/export-complete";

const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/u;
const SHA256 = /^[a-f0-9]{64}$/u;
const MIME_TYPE = /^[A-Za-z0-9!#$&^_.+-]+\/[A-Za-z0-9!#$&^_.+-]+$/u;
const OPERATION_ID = /^vaultop_[a-f0-9]{32}$/u;
const EXACT_VERSION_KEYS = Object.freeze([
  "document_id",
  "version_id",
  "file_object_id",
  "sha256",
  "byte_size",
  "mime_type",
]);

class DesktopVaultExportError extends Error {
  constructor(safeErrorCode, message, status = 400) {
    super(message);
    this.name = "DesktopVaultExportError";
    this.code = `LAWOS_${safeErrorCode}`;
    this.safe_error_code = safeErrorCode;
    this.status = status;
  }
}

function fail(code, message, status = 400) {
  throw new DesktopVaultExportError(code, message, status);
}

function exactObjectKeys(value, expected, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail("VAULT_DESKTOP_EXPORT_REQUEST_INVALID", `${label} must be an object`);
  }
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length
      || actual.some((key, index) => key !== wanted[index])) {
    fail("VAULT_DESKTOP_EXPORT_REQUEST_INVALID", `${label} fields are invalid`);
  }
}

function requiredId(value, field) {
  if (typeof value !== "string" || !SAFE_ID.test(value)) {
    fail("VAULT_DESKTOP_EXPORT_REQUEST_INVALID", `${field} is invalid`);
  }
  return value;
}

function exactVersion(value) {
  exactObjectKeys(value, EXACT_VERSION_KEYS, "desktop Vault exact version");
  const mimeType = typeof value.mime_type === "string" ? value.mime_type.toLowerCase() : "";
  if (!SHA256.test(value.sha256 ?? "")
      || !Number.isSafeInteger(value.byte_size)
      || value.byte_size < 1
      || value.byte_size > AMIC_VAULT_EXACT_EXPORT_MAX_BYTES
      || !MIME_TYPE.test(mimeType)) {
    fail("VAULT_DESKTOP_EXPORT_REQUEST_INVALID", "desktop Vault exact version integrity is invalid");
  }
  return Object.freeze({
    document_id: requiredId(value.document_id, "exact_version.document_id"),
    version_id: requiredId(value.version_id, "exact_version.version_id"),
    file_object_id: requiredId(value.file_object_id, "exact_version.file_object_id"),
    sha256: value.sha256,
    byte_size: value.byte_size,
    mime_type: mimeType,
  });
}

function normalizeAuthorizeBody(body) {
  const operationKind = body?.operation_kind === "attach_outlook"
    ? "attach_outlook"
    : "export_exact_version";
  exactObjectKeys(body, operationKind === "attach_outlook"
    ? [
        "matter_id",
        "exact_version",
        "request_nonce_sha256",
        "operation_kind",
        "installation_ref_sha256",
        "compose_target_sha256",
      ]
    : ["matter_id", "exact_version", "request_nonce_sha256"],
  "desktop Vault export authorization");
  assertNoClientSuppliedVaultAuthority(body);
  if (!SHA256.test(body.request_nonce_sha256 ?? "")) {
    fail("VAULT_DESKTOP_EXPORT_REQUEST_INVALID", "request_nonce_sha256 is invalid");
  }
  if (operationKind === "attach_outlook"
      && (!SHA256.test(body.installation_ref_sha256 ?? "")
        || !SHA256.test(body.compose_target_sha256 ?? ""))) {
    fail("VAULT_DESKTOP_EXPORT_REQUEST_INVALID", "Classic Outlook host binding is invalid");
  }
  return Object.freeze({
    matterId: requiredId(body.matter_id, "matter_id"),
    exactVersion: exactVersion(body.exact_version),
    requestNonceSha256: body.request_nonce_sha256,
    operationKind,
    installationRefSha256: operationKind === "attach_outlook"
      ? body.installation_ref_sha256
      : null,
    composeTargetSha256: operationKind === "attach_outlook"
      ? body.compose_target_sha256
      : null,
  });
}

function normalizePreflightBody(body) {
  exactObjectKeys(
    body,
    ["matter_id", "exact_version"],
    "desktop Vault export preflight",
  );
  assertNoClientSuppliedVaultAuthority(body);
  return Object.freeze({
    matterId: requiredId(body.matter_id, "matter_id"),
    exactVersion: exactVersion(body.exact_version),
  });
}

function normalizeDownloadBody(body) {
  exactObjectKeys(body, ["operation_id"], "desktop Vault export download");
  assertNoClientSuppliedVaultAuthority(body);
  if (!OPERATION_ID.test(body.operation_id ?? "")) {
    fail("VAULT_DESKTOP_EXPORT_REQUEST_INVALID", "operation_id is invalid");
  }
  return Object.freeze({ operationId: body.operation_id });
}

function normalizeCompleteBody(body) {
  const operationKind = body?.operation_kind === "attach_outlook"
    ? "attach_outlook"
    : "export_exact_version";
  const failed = operationKind === "attach_outlook" && body?.completion_stage === "failed";
  exactObjectKeys(body, operationKind === "attach_outlook"
    ? failed ? [
        "operation_id",
        "exact_version",
        "operation_kind",
        "installation_ref_sha256",
        "compose_target_sha256",
        "completion_stage",
        "safe_reason_code",
      ] : [
        "operation_id",
        "exact_version",
        "operation_kind",
        "installation_ref_sha256",
        "compose_target_sha256",
      ]
    : ["operation_id", "exact_version"],
  "desktop Vault export completion");
  assertNoClientSuppliedVaultAuthority(body);
  if (!OPERATION_ID.test(body.operation_id ?? "")) {
    fail("VAULT_DESKTOP_EXPORT_REQUEST_INVALID", "operation_id is invalid");
  }
  if (operationKind === "attach_outlook"
      && (!SHA256.test(body.installation_ref_sha256 ?? "")
        || !SHA256.test(body.compose_target_sha256 ?? ""))) {
    fail("VAULT_DESKTOP_EXPORT_REQUEST_INVALID", "Classic Outlook completion binding is invalid");
  }
  return Object.freeze({
    operationId: body.operation_id,
    exactVersion: exactVersion(body.exact_version),
    operationKind,
    installationRefSha256: operationKind === "attach_outlook"
      ? body.installation_ref_sha256
      : null,
    composeTargetSha256: operationKind === "attach_outlook"
      ? body.compose_target_sha256
      : null,
    completionStage: failed ? "failed" : operationKind === "attach_outlook" ? "attached" : "delivered",
    safeReasonCode: failed ? requiredId(body.safe_reason_code, "safe_reason_code") : null,
  });
}

function blocked(requestId, error) {
  const code = typeof error?.safe_error_code === "string"
    ? error.safe_error_code
    : "VAULT_DESKTOP_EXPORT_FAILED";
  const status = Number.isInteger(error?.status) ? error.status : 500;
  const body = Object.freeze({
    request_id: requestId,
    outcome: "blocked",
    ok: false,
    safe_error_codes: Object.freeze([code]),
    count_leak_prevented: true,
    raw_bytes_included: false,
    token_material_returned: false,
    storage_locator_returned: false,
    production_ready_claim: false,
  });
  assertNoVaultBoundarySecrets(body);
  return Object.freeze({ status, body });
}

function resolveReadableMatter({ matterRuntime, tenantId, matterId }) {
  const matter = matterRuntime?.repository?.list({
    tenant_id: tenantId,
    model_type: "Matter",
  }).find((record) => record.matter_id === matterId) ?? null;
  if (!matter || matter.silent === true || matter.hidden_from_actor === true) {
    fail("VAULT_DESKTOP_MATTER_NOT_AVAILABLE", "Matter is not available", 404);
  }
  if (matter.wip_status === "ethical_wall") {
    fail("VAULT_DESKTOP_PERMISSION_DENIED", "Matter Ethical Wall blocks export", 403);
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
    fail("VAULT_DESKTOP_PERMISSION_DENIED", "Vault export permission was denied", 403);
  }
}

async function requireDownloadAuthority({
  sessionAuth,
  principal,
  context,
  matterRuntime,
  matterId,
  requestId,
  operationKind = "export_exact_version",
}) {
  const projection = await sessionAuth.resolveVaultCapabilities({ principal, requestId });
  const download = projection?.capabilities?.find((item) => item.id === "download");
  const attach = projection?.capabilities?.find((item) => item.id === "attach");
  const attachAllowed = operationKind !== "attach_outlook" || attach?.allowed === true;
  if (projection?.authoritative !== true || download?.allowed !== true || !attachAllowed) {
    fail(
      (operationKind === "attach_outlook" ? attach?.safe_reason_code : null)
        ?? download?.safe_reason_code
        ?? "VAULT_AUTHORITY_UNAVAILABLE",
      "Authoritative Vault download capability is unavailable",
      403,
    );
  }
  resolveReadableMatter({
    matterRuntime,
    tenantId: principal.tenant_id,
    matterId,
  });
  requirePermission({
    context,
    tenantId: principal.tenant_id,
    matterId,
    action: "vault:download:preflight",
  });
  requirePermission({
    context,
    tenantId: principal.tenant_id,
    matterId,
    action: "dms:document:read",
  });
}

export function isDesktopVaultExportApiPath(pathname) {
  return pathname === DESKTOP_VAULT_EXPORT_PREFLIGHT_PATH
    || pathname === DESKTOP_VAULT_EXPORT_AUTHORIZE_PATH
    || pathname === DESKTOP_VAULT_EXPORT_DOWNLOAD_PATH
    || pathname === DESKTOP_VAULT_EXPORT_COMPLETE_PATH;
}

export async function handleDesktopVaultExportPreflight({
  body,
  principal,
  context,
  requestId,
  sessionAuth,
  matterRuntime,
} = {}) {
  try {
    const input = normalizePreflightBody(body);
    await requireDownloadAuthority({
      sessionAuth,
      principal,
      context,
      matterRuntime,
      matterId: input.matterId,
      requestId,
      operationKind: input.operationKind,
    });
    const response = Object.freeze({
      request_id: requestId,
      outcome: "preflight_passed",
      ok: true,
      matter_id: input.matterId,
      exact_version: input.exactVersion,
      lawos_permission_checked: true,
      provider_authority_checked: false,
      provider_grant_created: false,
      raw_bytes_included: false,
      token_material_returned: false,
      storage_locator_returned: false,
      production_ready_claim: false,
    });
    assertNoVaultBoundarySecrets(response);
    return Object.freeze({ status: 200, body: response });
  } catch (error) {
    return blocked(requestId, error);
  }
}

export async function handleDesktopVaultExportAuthorize({
  body,
  principal,
  context,
  requestId,
  sessionAuth,
  matterRuntime,
  dmsRuntime,
  vaultExportProvider,
  now = Date.now,
} = {}) {
  try {
    const input = normalizeAuthorizeBody(body);
    await requireDownloadAuthority({
      sessionAuth,
      principal,
      context,
      matterRuntime,
      matterId: input.matterId,
      requestId,
      operationKind: input.operationKind,
    });
    const response = await authorizeAmicVaultExactExport({
      principal,
      dmsRuntime,
      vaultExportProvider,
      operationKind: input.operationKind,
      requestNonceSha256: input.requestNonceSha256,
      matterId: input.matterId,
      exactVersion: input.exactVersion,
      installationRefSha256: input.installationRefSha256,
      composeTargetSha256: input.composeTargetSha256,
      requestId,
      now,
    });
    return Object.freeze({ status: 200, body: response });
  } catch (error) {
    return blocked(requestId, error);
  }
}

export async function handleDesktopVaultExportDownload({
  body,
  headers = {},
  principal,
  context,
  requestId,
  sessionAuth,
  matterRuntime,
  dmsRuntime,
  vaultExportProvider,
  now = Date.now,
} = {}) {
  try {
    const input = normalizeDownloadBody(body);
    const idempotencyKey = String(
      headers["idempotency-key"] ?? headers["x-idempotency-key"] ?? "",
    ).trim();
    if (idempotencyKey !== input.operationId) {
      fail("VAULT_DESKTOP_IDEMPOTENCY_KEY_MISMATCH", "Export idempotency key is mismatched", 409);
    }
    const inspected = inspectAuthorizedAmicVaultExactExport({
      principal,
      dmsRuntime,
      operationId: input.operationId,
      now,
    });
    await requireDownloadAuthority({
      sessionAuth,
      principal,
      context,
      matterRuntime,
      matterId: inspected.matter_id,
      requestId,
      operationKind: inspected.operation_kind,
    });
    const downloaded = await downloadAuthorizedAmicVaultExactExport({
      principal,
      dmsRuntime,
      vaultExportProvider,
      operationId: input.operationId,
      requestId,
      maxBytes: AMIC_VAULT_EXACT_EXPORT_MAX_BYTES,
      now,
    });
    return Object.freeze({
      status: 200,
      body: downloaded.server_owned_bytes,
      attachment_name: downloaded.public_response.attachment_name,
      exact_version: downloaded.public_response.exact_version,
      public_response: downloaded.public_response,
    });
  } catch (error) {
    return blocked(requestId, error);
  }
}

export async function handleDesktopVaultExportComplete({
  body,
  headers = {},
  principal,
  context,
  requestId,
  sessionAuth,
  matterRuntime,
  dmsRuntime,
  now = Date.now,
} = {}) {
  try {
    const input = normalizeCompleteBody(body);
    const idempotencyKey = String(
      headers["idempotency-key"] ?? headers["x-idempotency-key"] ?? "",
    ).trim();
    if (idempotencyKey !== input.operationId) {
      fail("VAULT_DESKTOP_IDEMPOTENCY_KEY_MISMATCH", "Export idempotency key is mismatched", 409);
    }
    const inspected = inspectDownloadedAmicVaultExactExport({
      principal,
      dmsRuntime,
      operationId: input.operationId,
    });
    if (inspected.operation_kind !== input.operationKind
        || inspected.installation_ref_sha256 !== input.installationRefSha256
        || inspected.compose_target_sha256 !== input.composeTargetSha256) {
      fail("VAULT_DESKTOP_EXPORT_COMPLETION_INVALID", "Desktop export completion kind is invalid", 409);
    }
    await requireDownloadAuthority({
      sessionAuth,
      principal,
      context,
      matterRuntime,
      matterId: inspected.matter_id,
      requestId,
      operationKind: inspected.operation_kind,
    });
    const response = completeAmicVaultExactExport({
      principal,
      dmsRuntime,
      operationId: input.operationId,
      completionStage: input.completionStage,
      safeReasonCode: input.safeReasonCode,
      expectedExactVersion: input.exactVersion,
      requestId,
      now,
    });
    return Object.freeze({ status: 200, body: response });
  } catch (error) {
    return blocked(requestId, error);
  }
}
