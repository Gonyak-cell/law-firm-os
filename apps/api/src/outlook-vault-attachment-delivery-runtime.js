import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";

import {
  assertNoClientSuppliedVaultAuthority,
  assertNoVaultBoundarySecrets,
} from "../../../packages/dms/src/vault-operation-receipt.js";
import {
  extractInquiryMimeAttachments,
} from "../../../packages/email-dms/src/inquiry-evidence-storage-service.js";
import { hashDomainValue } from "../../../packages/persistence/src/domain-ledger.js";
import {
  AMIC_VAULT_EXACT_EXPORT_MAX_BYTES,
  authorizeAmicVaultExactExport,
  completeAmicVaultExactExport,
  downloadAuthorizedAmicVaultExactExport,
  inspectAuthorizedAmicVaultExactExport,
  inspectDownloadedAmicVaultExactExport,
} from "./amic-vault-exact-export-runtime.js";
import {
  OUTLOOK_DESKTOP_AUTOCONNECT_REQUIRED_SCOPE,
  evaluateOutlookDesktopEntitlement,
} from "./outlook-desktop-entitlement.js";
import {
  resolveOutlookDesktopInstallationService,
} from "./outlook-desktop-installation-runtime-context.js";
import { parseOutlookTrustedCurrentInstallation } from "./outlook-trusted-current-installation.js";
import { evaluateRouteDecision } from "./permission-gate.js";

export const OUTLOOK_VAULT_ATTACHMENT_AUTHORIZE_PATH =
  "/api/outlook/vault/attachments/authorize";
export const OUTLOOK_VAULT_ATTACHMENT_DELIVERY_PREFIX =
  "/api/outlook/vault/attachments/delivery/";
export const OUTLOOK_VAULT_ATTACHMENT_COMPLETE_PATH =
  "/api/outlook/vault/attachments/complete";

const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/u;
const SHA256 = /^[a-f0-9]{64}$/u;
const MIME_TYPE = /^[A-Za-z0-9!#$&^_.+-]+\/[A-Za-z0-9!#$&^_.+-]+$/u;
const OPERATION_ID = /^vaultop_[a-f0-9]{32}$/u;
const EXACT_VERSION_FIELDS = Object.freeze([
  "document_id",
  "version_id",
  "file_object_id",
  "sha256",
  "byte_size",
  "mime_type",
]);
const ACK_LEDGER_PREFIX = "amic-os-outlook-vault-attachment-host-verification:";
const GRAPH_HOST_VERIFICATION_AUTHORITY = "microsoft-graph-draft-mime";
const GRAPH_HOST_VERIFICATION_SCHEMA =
  "law-firm-os.outlook-vault-graph-host-verification.v1";

export class OutlookVaultAttachmentDeliveryError extends Error {
  constructor(safeErrorCode, message, status = 400) {
    super(message);
    this.name = "OutlookVaultAttachmentDeliveryError";
    this.code = `LAWOS_${safeErrorCode}`;
    this.safe_error_code = safeErrorCode;
    this.status = status;
  }
}

function fail(code, message, status = 400) {
  throw new OutlookVaultAttachmentDeliveryError(code, message, status);
}

function isPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function exactKeys(value, expected, label) {
  if (!isPlainObject(value)
      || !isDeepStrictEqual(Object.keys(value).sort(), [...expected].sort())) {
    fail("OUTLOOK_VAULT_ATTACHMENT_REQUEST_INVALID", `${label} fields are invalid`);
  }
}

function requiredId(value, field) {
  if (typeof value !== "string" || !SAFE_ID.test(value)) {
    fail("OUTLOOK_VAULT_ATTACHMENT_REQUEST_INVALID", `${field} is invalid`);
  }
  return value;
}

function requiredBoundedText(value, field, maxLength = 512) {
  if (typeof value !== "string"
      || !value
      || value !== value.trim()
      || value.length > maxLength
      || /[\u0000-\u001f\u007f\uD800-\uDFFF]/u.test(value)) {
    fail("OUTLOOK_VAULT_ATTACHMENT_REQUEST_INVALID", `${field} is invalid`);
  }
  return value;
}

function exactVersion(value) {
  exactKeys(value, EXACT_VERSION_FIELDS, "Outlook Vault exact version");
  const mimeType = typeof value.mime_type === "string"
    ? value.mime_type.toLowerCase()
    : "";
  if (!SHA256.test(value.sha256 ?? "")
      || !Number.isSafeInteger(value.byte_size)
      || value.byte_size < 1
      || value.byte_size > AMIC_VAULT_EXACT_EXPORT_MAX_BYTES
      || !MIME_TYPE.test(mimeType)) {
    fail(
      "OUTLOOK_VAULT_ATTACHMENT_REQUEST_INVALID",
      "Outlook Vault exact version integrity is invalid",
    );
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

function attachmentName(value) {
  const name = typeof value === "string" ? value.normalize("NFC") : "";
  if (!name
      || name !== value
      || name !== name.trim()
      || name.length > 240
      || /[\\/\u0000-\u001f\u007f\uD800-\uDFFF]/u.test(name)) {
    fail("OUTLOOK_VAULT_ATTACHMENT_ACK_INVALID", "Outlook attachment name is invalid", 409);
  }
  return name;
}

function normalizeAuthorizeBody(body) {
  exactKeys(
    body,
    ["matter_id", "exact_version", "request_nonce_sha256", "compose_target_ref"],
    "Outlook Vault attachment authorization",
  );
  assertNoClientSuppliedVaultAuthority(body);
  if (!SHA256.test(body.request_nonce_sha256 ?? "")) {
    fail("OUTLOOK_VAULT_ATTACHMENT_REQUEST_INVALID", "request_nonce_sha256 is invalid");
  }
  return Object.freeze({
    matterId: requiredId(body.matter_id, "matter_id"),
    exactVersion: exactVersion(body.exact_version),
    requestNonceSha256: body.request_nonce_sha256,
    composeTargetRef: requiredBoundedText(body.compose_target_ref, "compose_target_ref"),
  });
}

function normalizeCompleteBody(body) {
  exactKeys(
    body,
    ["operation_id", "exact_version", "compose_target_ref", "attachment_ack"],
    "Outlook Vault attachment completion",
  );
  assertNoClientSuppliedVaultAuthority(body);
  if (!OPERATION_ID.test(body.operation_id ?? "")) {
    fail("OUTLOOK_VAULT_ATTACHMENT_REQUEST_INVALID", "operation_id is invalid");
  }
  exactKeys(
    body.attachment_ack,
    ["attachment_id", "attachment_name", "attachment_size"],
    "Outlook attachment acknowledgement",
  );
  if (!Number.isSafeInteger(body.attachment_ack.attachment_size)
      || body.attachment_ack.attachment_size < 1
      || body.attachment_ack.attachment_size > AMIC_VAULT_EXACT_EXPORT_MAX_BYTES) {
    fail("OUTLOOK_VAULT_ATTACHMENT_ACK_INVALID", "Outlook attachment size is invalid", 409);
  }
  return Object.freeze({
    operationId: body.operation_id,
    exactVersion: exactVersion(body.exact_version),
    composeTargetRef: requiredBoundedText(body.compose_target_ref, "compose_target_ref"),
    attachmentAck: Object.freeze({
      attachmentId: requiredBoundedText(
        body.attachment_ack.attachment_id,
        "attachment_ack.attachment_id",
      ),
      attachmentName: attachmentName(body.attachment_ack.attachment_name),
      attachmentSize: body.attachment_ack.attachment_size,
    }),
  });
}

function blocked(requestId, error) {
  const safeErrorCode = typeof error?.safe_error_code === "string"
    && /^[A-Z0-9_]+$/u.test(error.safe_error_code)
    ? error.safe_error_code
    : "OUTLOOK_VAULT_ATTACHMENT_FAILED";
  const status = Number.isInteger(error?.status) ? error.status : 500;
  const body = Object.freeze({
    request_id: requestId,
    outcome: "blocked",
    ok: false,
    safe_error_codes: Object.freeze([safeErrorCode]),
    count_leak_prevented: true,
    provider_grant_returned: false,
    raw_bytes_included: false,
    storage_locator_returned: false,
    production_ready_claim: false,
  });
  assertNoVaultBoundarySecrets(body);
  return Object.freeze({ status, body });
}

function requireDeliveryAuthority(authority) {
  if (!authority
      || typeof authority.issue !== "function"
      || typeof authority.verify !== "function") {
    fail(
      "OUTLOOK_VAULT_DELIVERY_AUTHORITY_UNAVAILABLE",
      "Outlook Vault delivery authority is unavailable",
      503,
    );
  }
  return authority;
}

function deliveryOrigin(value) {
  try {
    const parsed = new URL(String(value ?? ""));
    if (parsed.protocol !== "https:"
        || parsed.username || parsed.password
        || parsed.pathname !== "/"
        || parsed.search || parsed.hash) {
      throw new TypeError("invalid origin");
    }
    return parsed.origin;
  } catch {
    fail(
      "OUTLOOK_VAULT_DELIVERY_ORIGIN_UNAVAILABLE",
      "Outlook Vault HTTPS delivery origin is unavailable",
      503,
    );
  }
}

function principalSnapshot(principal) {
  return Object.freeze({
    tenant_id: requiredId(principal?.tenant_id, "principal.tenant_id"),
    user_id: requiredId(principal?.user_id, "principal.user_id"),
    entra_subject_id: requiredId(
      principal?.entra_subject_id,
      "principal.entra_subject_id",
    ),
  });
}

export function hashOutlookVaultInstallationBinding({ principal, installation } = {}) {
  const signed = principalSnapshot(principal);
  return hashDomainValue({
    schema: "law-firm-os.outlook-vault-installation-binding.v1",
    tenant_id: signed.tenant_id,
    user_id: signed.user_id,
    entra_subject_id: signed.entra_subject_id,
    installation_id: requiredId(installation?.installation_id, "installation.installation_id"),
  });
}

export function hashOutlookVaultComposeTarget({ principal, composeTargetRef } = {}) {
  const signed = principalSnapshot(principal);
  return hashDomainValue({
    schema: "law-firm-os.outlook-vault-compose-target.v1",
    tenant_id: signed.tenant_id,
    user_id: signed.user_id,
    compose_target_ref: requiredBoundedText(composeTargetRef, "compose_target_ref"),
  });
}

function exactVersionRefSha256(value) {
  return hashDomainValue({
    schema: "law-firm-os.outlook-vault-exact-version-ref.v1",
    exact_version: value,
  });
}

function requireGraphHostVerifier(verifier) {
  if (typeof verifier?.verify !== "function") {
    fail(
      "OUTLOOK_VAULT_HOST_VERIFICATION_UNAVAILABLE",
      "Microsoft Graph draft verification is unavailable",
      503,
    );
  }
  return verifier;
}

function canonicalAttachmentMimeType(value) {
  return String(value ?? "").split(";", 1)[0].trim().toLowerCase();
}

export function createOutlookVaultGraphHostVerifier({
  mailPort,
  now = Date.now,
} = {}) {
  if (typeof mailPort?.getOwnMessageMime !== "function") {
    throw new TypeError("Microsoft Graph mail port is required for Outlook Vault verification");
  }
  if (typeof now !== "function") {
    throw new TypeError("Outlook Vault Graph verification clock is invalid");
  }
  return Object.freeze({
    authority: GRAPH_HOST_VERIFICATION_AUTHORITY,
    async verify({
      principal,
      composeTargetRef,
      exactVersion: expectedExactVersion,
      attachmentName: expectedAttachmentName,
    } = {}) {
      const signed = principalSnapshot(principal);
      const composeRef = requiredBoundedText(
        composeTargetRef,
        "compose_target_ref",
      );
      const expected = exactVersion(expectedExactVersion);
      const expectedName = attachmentName(expectedAttachmentName);
      let graphMessage;
      try {
        graphMessage = await mailPort.getOwnMessageMime({
          tenant_id: signed.tenant_id,
          user_id: signed.user_id,
          entra_subject_id: signed.entra_subject_id,
          rest_message_id: composeRef,
        });
      } catch {
        fail(
          "OUTLOOK_VAULT_HOST_VERIFICATION_UNAVAILABLE",
          "Microsoft Graph could not read the saved Outlook draft",
          503,
        );
      }
      if (!Buffer.isBuffer(graphMessage?.mime_bytes)
          || graphMessage.mime_bytes.byteLength < 1
          || graphMessage?.message_metadata?.is_draft !== true) {
        fail(
          "OUTLOOK_VAULT_HOST_VERIFICATION_MISMATCH",
          "Microsoft Graph did not return the bound saved draft",
          409,
        );
      }
      let attachments;
      try {
        attachments = extractInquiryMimeAttachments({
          mime_bytes: graphMessage.mime_bytes,
        });
      } catch {
        fail(
          "OUTLOOK_VAULT_HOST_VERIFICATION_MISMATCH",
          "Microsoft Graph draft MIME could not verify the Vault attachment",
          409,
        );
      }
      const matches = attachments
        .map((attachment, occurrence) => Object.freeze({ attachment, occurrence }))
        .filter(({ attachment }) => (
          attachment.file_name.normalize("NFC") === expectedName
          && canonicalAttachmentMimeType(attachment.mime_type) === expected.mime_type
          && attachment.byte_size === expected.byte_size
          && attachment.sha256 === expected.sha256
        ));
      if (matches.length !== 1) {
        fail(
          "OUTLOOK_VAULT_HOST_VERIFICATION_MISMATCH",
          "Microsoft Graph draft does not contain exactly one bound Vault attachment",
          409,
        );
      }
      const [{ occurrence }] = matches;
      const verifiedAtValue = now();
      const verifiedAtDate = new Date(verifiedAtValue);
      if (!Number.isFinite(verifiedAtDate.getTime())) {
        throw new TypeError("Outlook Vault Graph verification clock is invalid");
      }
      const verifiedAt = verifiedAtDate.toISOString();
      return Object.freeze({
        schema_version: GRAPH_HOST_VERIFICATION_SCHEMA,
        authority: GRAPH_HOST_VERIFICATION_AUTHORITY,
        compose_target_sha256: hashOutlookVaultComposeTarget({
          principal: signed,
          composeTargetRef: composeRef,
        }),
        exact_version_ref_sha256: exactVersionRefSha256(expected),
        graph_message_ref_sha256: hashDomainValue({
          schema: "law-firm-os.outlook-vault-graph-message-ref.v1",
          immutable_message_id: requiredBoundedText(
            graphMessage.immutable_message_id,
            "graph.immutable_message_id",
          ),
        }),
        graph_mime_sha256: createHash("sha256")
          .update(graphMessage.mime_bytes)
          .digest("hex"),
        attachment_occurrence: occurrence,
        attachment_name_sha256: hashDomainValue(expectedName),
        attachment_size: expected.byte_size,
        attachment_mime_type: expected.mime_type,
        attachment_sha256: expected.sha256,
        verified_at: verifiedAt,
        raw_bytes_included: false,
        client_ack_authoritative: false,
      });
    },
  });
}

function graphHostVerificationEvidence({
  value,
  principal,
  inspected,
  composeTargetSha256,
}) {
  exactKeys(value, [
    "schema_version",
    "authority",
    "compose_target_sha256",
    "exact_version_ref_sha256",
    "graph_message_ref_sha256",
    "graph_mime_sha256",
    "attachment_occurrence",
    "attachment_name_sha256",
    "attachment_size",
    "attachment_mime_type",
    "attachment_sha256",
    "verified_at",
    "raw_bytes_included",
    "client_ack_authoritative",
  ], "Outlook Vault Graph host verification");
  const expectedExactRef = exactVersionRefSha256(inspected.exact_version);
  const expectedNameRef = hashDomainValue(inspected.attachment_name);
  if (value.schema_version !== GRAPH_HOST_VERIFICATION_SCHEMA
      || value.authority !== GRAPH_HOST_VERIFICATION_AUTHORITY
      || value.compose_target_sha256 !== composeTargetSha256
      || value.exact_version_ref_sha256 !== expectedExactRef
      || !SHA256.test(value.graph_message_ref_sha256 ?? "")
      || !SHA256.test(value.graph_mime_sha256 ?? "")
      || !Number.isSafeInteger(value.attachment_occurrence)
      || value.attachment_occurrence < 0
      || value.attachment_name_sha256 !== expectedNameRef
      || value.attachment_size !== inspected.exact_version.byte_size
      || value.attachment_mime_type !== inspected.exact_version.mime_type
      || value.attachment_sha256 !== inspected.exact_version.sha256
      || !Number.isFinite(Date.parse(value.verified_at ?? ""))
      || value.raw_bytes_included !== false
      || value.client_ack_authoritative !== false) {
    fail(
      "OUTLOOK_VAULT_HOST_VERIFICATION_MISMATCH",
      "Microsoft Graph host verification changed the bound exact version",
      409,
    );
  }
  principalSnapshot(principal);
  return Object.freeze({ ...value });
}

function resolveReadableMatter({ matterRuntime, tenantId, matterId }) {
  const matter = matterRuntime?.repository?.list({
    tenant_id: tenantId,
    model_type: "Matter",
  }).find((record) => record.matter_id === matterId) ?? null;
  if (!matter || matter.silent === true || matter.hidden_from_actor === true) {
    fail("OUTLOOK_VAULT_MATTER_NOT_AVAILABLE", "Matter is not available", 404);
  }
  if (matter.wip_status === "ethical_wall") {
    fail("OUTLOOK_VAULT_PERMISSION_DENIED", "Matter Ethical Wall blocks export", 403);
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
    fail("OUTLOOK_VAULT_PERMISSION_DENIED", "Vault export permission was denied", 403);
  }
}

async function requireDownloadAuthority({
  sessionAuth,
  principal,
  context,
  matterRuntime,
  matterId,
  requestId,
}) {
  const projection = await sessionAuth?.resolveVaultCapabilities?.({ principal, requestId });
  const download = projection?.capabilities?.find((item) => item.id === "download");
  if (projection?.authoritative !== true || download?.allowed !== true) {
    fail(
      download?.safe_reason_code ?? "VAULT_AUTHORITY_UNAVAILABLE",
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

async function currentTrustedInstallation({ runtime, principal }) {
  const signed = principalSnapshot(principal);
  const entitlement = evaluateOutlookDesktopEntitlement({
    principal: Object.freeze({
      ...signed,
      scopes: Object.freeze([OUTLOOK_DESKTOP_AUTOCONNECT_REQUIRED_SCOPE]),
    }),
    roster: runtime?.entitlement_roster,
  });
  if (!entitlement.eligible) {
    fail(
      entitlement.safe_error_code ?? "OUTLOOK_DESKTOP_TRUSTED_INSTALLATION_REQUIRED",
      "Outlook desktop entitlement is unavailable",
      entitlement.status === "disabled" ? 403 : 503,
    );
  }
  let service;
  let trusted;
  try {
    service = resolveOutlookDesktopInstallationService(runtime);
    trusted = parseOutlookTrustedCurrentInstallation(
      await service.readTrustedCurrent({ principal: signed }),
    );
  } catch {
    fail(
      "OUTLOOK_DESKTOP_INSTALLATION_RUNTIME_UNAVAILABLE",
      "Outlook desktop installation authority is unavailable",
      503,
    );
  }
  if (!trusted) {
    fail(
      "OUTLOOK_DESKTOP_TRUSTED_INSTALLATION_REQUIRED",
      "A trusted AMIC OS desktop installation is required",
      403,
    );
  }
  return trusted.installation;
}

function assertOperationBinding({ inspected, claims, installationRefSha256 }) {
  if (inspected.operation_kind !== "attach_outlook"
      || inspected.installation_ref_sha256 !== installationRefSha256
      || inspected.installation_ref_sha256 !== claims.installation_ref_sha256
      || inspected.compose_target_sha256 !== claims.compose_target_sha256
      || exactVersionRefSha256(inspected.exact_version)
        !== claims.exact_version_ref_sha256) {
    fail(
      "OUTLOOK_VAULT_ATTACHMENT_BINDING_MISMATCH",
      "Outlook Vault delivery binding changed",
      409,
    );
  }
}

function attachmentAckRecord({
  principal,
  inspected,
  input,
  installationRefSha256,
  composeTargetSha256,
  acknowledgedAt,
  graphHostVerification,
}) {
  if (input.attachmentAck.attachmentName !== inspected.attachment_name
      || input.attachmentAck.attachmentSize !== inspected.exact_version.byte_size) {
    fail(
      "OUTLOOK_VAULT_ATTACHMENT_ACK_MISMATCH",
      "Outlook attachment acknowledgement changed exact metadata",
      409,
    );
  }
  return Object.freeze({
    schema_version: "law-firm-os.outlook-vault-attachment-ack.v2",
    operation_id: inspected.operation_id,
    installation_ref_sha256: installationRefSha256,
    compose_target_sha256: composeTargetSha256,
    exact_version_ref_sha256: exactVersionRefSha256(inspected.exact_version),
    client_ack: Object.freeze({
      attachment_id_sha256: hashDomainValue({
        schema: "law-firm-os.outlook-attachment-id.v1",
        tenant_id: principal.tenant_id,
        user_id: principal.user_id,
        attachment_id: input.attachmentAck.attachmentId,
      }),
      attachment_name_sha256: hashDomainValue(input.attachmentAck.attachmentName),
      attachment_size: input.attachmentAck.attachmentSize,
      acknowledged_at: acknowledgedAt,
      authoritative: false,
    }),
    graph_host_verification: graphHostVerificationEvidence({
      value: graphHostVerification,
      principal,
      inspected,
      composeTargetSha256,
    }),
  });
}

function repositoryFrom(dmsRuntime) {
  const repository = dmsRuntime?.repository;
  if (!repository
      || typeof repository.getIdempotency !== "function"
      || typeof repository.recordIdempotency !== "function") {
    fail(
      "OUTLOOK_VAULT_ATTACHMENT_LEDGER_UNAVAILABLE",
      "Outlook Vault attachment ledger is unavailable",
      503,
    );
  }
  return repository;
}

function readRecordedCompletion({ dmsRuntime, principal, operationId }) {
  const response = repositoryFrom(dmsRuntime).getIdempotency({
    tenant_id: principal.tenant_id,
    idempotency_key: `${ACK_LEDGER_PREFIX}${operationId}`,
  })?.response ?? null;
  return response?.schema_version === "law-firm-os.outlook-vault-attachment-ack.v2"
    ? response
    : null;
}

function recordCompletion({
  dmsRuntime,
  principal,
  inspected,
  input,
  installationRefSha256,
  composeTargetSha256,
  requestId,
  now,
  graphHostVerification,
}) {
  const repository = repositoryFrom(dmsRuntime);
  const run = (targetRepository) => {
    const scopedRuntime = Object.freeze({
      ...dmsRuntime,
      repository: targetRepository,
    });
    const key = `${ACK_LEDGER_PREFIX}${inspected.operation_id}`;
    const existing = targetRepository.getIdempotency({
      tenant_id: principal.tenant_id,
      idempotency_key: key,
    })?.response ?? null;
    const authoritativeHostVerification = existing?.schema_version
      === "law-firm-os.outlook-vault-attachment-ack.v2"
      ? existing.graph_host_verification
      : graphHostVerification;
    const acknowledgement = attachmentAckRecord({
      principal,
      inspected,
      input,
      installationRefSha256,
      composeTargetSha256,
      acknowledgedAt:
        existing?.client_ack?.acknowledged_at ?? new Date(now()).toISOString(),
      graphHostVerification: authoritativeHostVerification,
    });
    if (existing && !isDeepStrictEqual(existing, acknowledgement)) {
      fail(
        "OUTLOOK_VAULT_ATTACHMENT_ACK_CONFLICT",
        "Outlook attachment acknowledgement replay changed",
        409,
      );
    }
    const completion = completeAmicVaultExactExport({
      principal,
      dmsRuntime: scopedRuntime,
      operationId: input.operationId,
      completionStage: "attached",
      expectedExactVersion: input.exactVersion,
      requestId,
      now,
    });
    if (!existing) {
      targetRepository.recordIdempotency({
        tenant_id: principal.tenant_id,
        idempotency_key: key,
        operation: "amic_os_outlook_vault_attachment_ack",
        request_fingerprint: hashDomainValue({
          operation_id: inspected.operation_id,
          exact_version_ref_sha256: acknowledgement.exact_version_ref_sha256,
          attachment_id_sha256: acknowledgement.client_ack.attachment_id_sha256,
          graph_host_verification_sha256: hashDomainValue(
            acknowledgement.graph_host_verification,
          ),
        }),
        response: acknowledgement,
        created_at: acknowledgement.acknowledged_at,
      });
    }
    return Object.freeze({ completion, acknowledgement });
  };
  return typeof repository.transaction === "function"
    ? repository.transaction(run)
    : run(repository);
}

export function isOutlookVaultAttachmentAuthorizePath(pathname) {
  return pathname === OUTLOOK_VAULT_ATTACHMENT_AUTHORIZE_PATH;
}

export function isOutlookVaultAttachmentCompletePath(pathname) {
  return pathname === OUTLOOK_VAULT_ATTACHMENT_COMPLETE_PATH;
}

export function deliveryTokenFromPath(pathname) {
  if (typeof pathname !== "string"
      || !pathname.startsWith(OUTLOOK_VAULT_ATTACHMENT_DELIVERY_PREFIX)) return null;
  const token = pathname.slice(OUTLOOK_VAULT_ATTACHMENT_DELIVERY_PREFIX.length);
  return token && !token.includes("/") ? token : null;
}

export function verifyOutlookVaultAttachmentDeliveryRequest({
  method,
  pathname,
  authority,
} = {}) {
  const token = method === "GET" ? deliveryTokenFromPath(pathname) : null;
  if (!token) return null;
  try {
    const verified = requireDeliveryAuthority(authority).verify(token);
    return verified.ok
      ? Object.freeze({ ...verified, token })
      : verified;
  } catch (error) {
    return Object.freeze({
      ok: false,
      status: Number.isInteger(error?.status) ? error.status : 503,
      safe_error_code: typeof error?.safe_error_code === "string"
        ? error.safe_error_code
        : "OUTLOOK_VAULT_DELIVERY_AUTHORITY_UNAVAILABLE",
    });
  }
}

export async function handleOutlookVaultAttachmentAuthorize({
  body,
  principal,
  context,
  installation,
  requestId,
  sessionAuth,
  matterRuntime,
  dmsRuntime,
  vaultExportProvider,
  deliveryAuthority,
  publicOrigin,
  now = Date.now,
} = {}) {
  try {
    const input = normalizeAuthorizeBody(body);
    const signed = principalSnapshot(principal);
    await requireDownloadAuthority({
      sessionAuth,
      principal: signed,
      context,
      matterRuntime,
      matterId: input.matterId,
      requestId,
    });
    const installationRefSha256 = hashOutlookVaultInstallationBinding({
      principal: signed,
      installation,
    });
    const composeTargetSha256 = hashOutlookVaultComposeTarget({
      principal: signed,
      composeTargetRef: input.composeTargetRef,
    });
    const authorization = await authorizeAmicVaultExactExport({
      principal: signed,
      dmsRuntime,
      vaultExportProvider,
      operationKind: "attach_outlook",
      requestNonceSha256: input.requestNonceSha256,
      matterId: input.matterId,
      exactVersion: input.exactVersion,
      installationRefSha256,
      composeTargetSha256,
      requestId,
      now,
    });
    const issued = requireDeliveryAuthority(deliveryAuthority).issue({
      principal: signed,
      operation_id: authorization.operation_id,
      installation_ref_sha256: installationRefSha256,
      compose_target_sha256: composeTargetSha256,
      exact_version_ref_sha256: exactVersionRefSha256(input.exactVersion),
      expires_at: authorization.expires_at,
    });
    const uri = `${deliveryOrigin(publicOrigin)}${OUTLOOK_VAULT_ATTACHMENT_DELIVERY_PREFIX}${issued.token}`;
    if (uri.length > 2_048) {
      fail(
        "OUTLOOK_VAULT_DELIVERY_URI_TOO_LONG",
        "Outlook Vault delivery URI exceeds the Office host limit",
        503,
      );
    }
    return Object.freeze({
      status: 200,
      body: Object.freeze({
        request_id: requestId,
        outcome: "attachment_delivery_authorized",
        ok: true,
        operation_id: authorization.operation_id,
        attachment_name: authorization.attachment_name,
        exact_version: authorization.exact_version,
        delivery_uri: uri,
        expires_at: issued.expires_at,
        receipt: authorization.receipt,
        lawos_delivery_channel: true,
        provider_authority_verified: true,
        provider_grant_returned: false,
        raw_bytes_included: false,
        storage_locator_returned: false,
        production_ready_claim: false,
      }),
    });
  } catch (error) {
    return blocked(requestId, error);
  }
}

export async function handleOutlookVaultAttachmentDelivery({
  verifiedDelivery,
  requestId,
  outlookDesktopRuntime,
  dmsRuntime,
  vaultExportProvider,
  now = Date.now,
} = {}) {
  try {
    if (verifiedDelivery?.ok !== true) {
      fail(
        verifiedDelivery?.safe_error_code ?? "OUTLOOK_VAULT_DELIVERY_TOKEN_INVALID",
        "Outlook Vault delivery token is invalid",
        verifiedDelivery?.status ?? 403,
      );
    }
    const claims = verifiedDelivery.claims;
    const principal = principalSnapshot(claims);
    const installation = await currentTrustedInstallation({
      runtime: outlookDesktopRuntime,
      principal,
    });
    const installationRefSha256 = hashOutlookVaultInstallationBinding({
      principal,
      installation,
    });
    const inspected = inspectAuthorizedAmicVaultExactExport({
      principal,
      dmsRuntime,
      operationId: claims.operation_id,
      now,
    });
    assertOperationBinding({ inspected, claims, installationRefSha256 });
    const downloaded = await downloadAuthorizedAmicVaultExactExport({
      principal,
      dmsRuntime,
      vaultExportProvider,
      operationId: claims.operation_id,
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
      headers: Object.freeze({
        "cache-control": "private, max-age=60, immutable",
        "x-content-type-options": "nosniff",
      }),
    });
  } catch (error) {
    return blocked(requestId, error);
  }
}

export async function handleOutlookVaultAttachmentComplete({
  body,
  principal,
  context,
  installation,
  requestId,
  sessionAuth,
  matterRuntime,
  dmsRuntime,
  hostVerifier,
  now = Date.now,
} = {}) {
  try {
    const input = normalizeCompleteBody(body);
    const signed = principalSnapshot(principal);
    const installationRefSha256 = hashOutlookVaultInstallationBinding({
      principal: signed,
      installation,
    });
    const composeTargetSha256 = hashOutlookVaultComposeTarget({
      principal: signed,
      composeTargetRef: input.composeTargetRef,
    });
    const inspected = inspectDownloadedAmicVaultExactExport({
      principal: signed,
      dmsRuntime,
      operationId: input.operationId,
    });
    if (inspected.operation_kind !== "attach_outlook"
        || inspected.installation_ref_sha256 !== installationRefSha256
        || inspected.compose_target_sha256 !== composeTargetSha256
        || !isDeepStrictEqual(inspected.exact_version, input.exactVersion)) {
      fail(
        "OUTLOOK_VAULT_ATTACHMENT_BINDING_MISMATCH",
        "Outlook Vault completion binding changed",
        409,
      );
    }
    await requireDownloadAuthority({
      sessionAuth,
      principal: signed,
      context,
      matterRuntime,
      matterId: inspected.matter_id,
      requestId,
    });
    const recordedCompletion = readRecordedCompletion({
      dmsRuntime,
      principal: signed,
      operationId: input.operationId,
    });
    const graphHostVerification = recordedCompletion?.graph_host_verification
      ?? await requireGraphHostVerifier(hostVerifier).verify({
        principal: signed,
        composeTargetRef: input.composeTargetRef,
        exactVersion: inspected.exact_version,
        attachmentName: inspected.attachment_name,
        clientAck: input.attachmentAck,
        requestId,
      });
    const recorded = recordCompletion({
      dmsRuntime,
      principal: signed,
      inspected,
      input,
      installationRefSha256,
      composeTargetSha256,
      requestId,
      now,
      graphHostVerification,
    });
    const response = Object.freeze({
      ...recorded.completion,
      outcome: "attachment_verified",
      attachment_ack_sha256: hashDomainValue(recorded.acknowledgement),
      graph_host_verified: true,
      client_ack_authoritative: false,
      host_verification_authority: GRAPH_HOST_VERIFICATION_AUTHORITY,
      attachment_id_returned: false,
      attachment_name_returned: false,
      provider_grant_returned: false,
      raw_bytes_included: false,
      storage_locator_returned: false,
      production_ready_claim: false,
    });
    assertNoVaultBoundarySecrets(response);
    return Object.freeze({ status: 200, body: response });
  } catch (error) {
    return blocked(requestId, error);
  }
}
