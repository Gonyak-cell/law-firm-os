import { createHash } from "node:crypto";
import {
  isOpaqueCredentialReference,
} from "../../persistence/src/credential-reference.js";

export const M365_GRAPH_ALLOWED_SCOPES = Object.freeze([
  "Calendars.ReadWrite",
  "Mail.Read",
  "offline_access",
]);

export const M365_GRAPH_REQUIRED_SCOPES = M365_GRAPH_ALLOWED_SCOPES;

const FORBIDDEN_CREDENTIAL_FIELDS = Object.freeze([
  "access_token",
  "refresh_token",
  "id_token",
  "client_secret",
  "token_bundle",
  "authorization_code",
  "code_verifier",
]);

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${field} is required`);
  }
  return value.trim();
}

function optionalInstant(input, field) {
  const value = input?.[field];
  if (value === null || value === undefined || value === "") return null;
  return requiredInstant(input, field);
}

function requiredInstant(input, field) {
  const value = requiredString(input, field);
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds)) {
    throw new TypeError(`${field} must be a valid instant`);
  }
  return new Date(milliseconds).toISOString();
}

function positiveInteger(value, field) {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new TypeError(`${field} must be a positive integer`);
  }
  return value;
}

function credentialReference(value) {
  const reference = requiredString({ credential_ref: value }, "credential_ref");
  if (!isOpaqueCredentialReference(reference)) {
    throw new TypeError(
      "credential_ref must be an opaque AWS Secrets Manager reference",
    );
  }
  return reference;
}

function grantedScopes(value) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new TypeError("granted_scopes is required");
  }
  const scopes = value.map((scope) => requiredString({ scope }, "scope"));
  if (new Set(scopes).size !== scopes.length) {
    throw new TypeError("granted_scopes cannot contain duplicates");
  }
  if (scopes.some((scope) => !M365_GRAPH_ALLOWED_SCOPES.includes(scope))) {
    throw new TypeError("granted_scopes contains an unsupported Microsoft Graph scope");
  }
  return Object.freeze(scopes.sort((left, right) => left.localeCompare(right, "en")));
}

function rejectCredentialMaterial(input) {
  for (const field of FORBIDDEN_CREDENTIAL_FIELDS) {
    if (input?.[field] !== null && input?.[field] !== undefined) {
      throw new TypeError(`${field} cannot be stored in M365Connection`);
    }
  }
}

export function m365ConnectionId({ tenant_id, user_id } = {}) {
  const tenantId = requiredString({ tenant_id }, "tenant_id");
  const userId = requiredString({ user_id }, "user_id");
  const digest = createHash("sha256")
    .update(JSON.stringify({ tenant_id: tenantId, user_id: userId }))
    .digest("hex")
    .slice(0, 32);
  return `m365_connection_${digest}`;
}

export function hashMailboxAddress(value) {
  const address = requiredString({ mailbox_address: value }, "mailbox_address")
    .normalize("NFKC")
    .toLowerCase();
  if (
    address.length > 320
    || !address.includes("@")
    || /[\u0000-\u001f\u007f\s]/u.test(address)
  ) {
    throw new TypeError("mailbox_address is invalid");
  }
  return createHash("sha256").update(address).digest("hex");
}

export function normalizeM365Connection(input = {}) {
  rejectCredentialMaterial(input);
  const consentedAt = requiredInstant(input, "consented_at");
  const expiresAt = requiredInstant(input, "expires_at");
  const revokedAt = optionalInstant(input, "revoked_at");
  if (Date.parse(expiresAt) <= Date.parse(consentedAt)) {
    throw new TypeError("expires_at must be after consented_at");
  }
  if (revokedAt && Date.parse(revokedAt) < Date.parse(consentedAt)) {
    throw new TypeError("revoked_at cannot be before consented_at");
  }
  const mailboxAddressHash = requiredString(
    input,
    "mailbox_address_hash",
  ).toLowerCase();
  if (!/^[a-f0-9]{64}$/u.test(mailboxAddressHash)) {
    throw new TypeError("mailbox_address_hash must be a lowercase SHA-256 digest");
  }
  if (
    input.connection_authority !== undefined
    && input.connection_authority !== "delegated"
  ) {
    throw new TypeError("M365Connection must use delegated authority");
  }
  if (input.mailbox_scope !== undefined && input.mailbox_scope !== "me") {
    throw new TypeError("M365Connection mailbox_scope must be me");
  }
  return Object.freeze({
    model_type: "M365Connection",
    m365_connection_id: requiredString(input, "m365_connection_id"),
    tenant_id: requiredString(input, "tenant_id"),
    user_id: requiredString(input, "user_id"),
    entra_subject_id: requiredString(input, "entra_subject_id"),
    mailbox_address_hash: mailboxAddressHash,
    credential_ref: credentialReference(input.credential_ref),
    granted_scopes: grantedScopes(input.granted_scopes),
    consented_at: consentedAt,
    expires_at: expiresAt,
    revoked_at: revokedAt,
    state_version: positiveInteger(input.state_version ?? 1, "state_version"),
    connection_authority: "delegated",
    mailbox_scope: "me",
    credential_material_included: false,
    production_ready_claim: false,
  });
}

export function m365ConnectionStatus(
  input,
  { clock = () => new Date() } = {},
) {
  const connection = normalizeM365Connection(input);
  const now = clock();
  const nowMilliseconds = now instanceof Date
    ? now.getTime()
    : Date.parse(now);
  if (!Number.isFinite(nowMilliseconds)) {
    throw new TypeError("clock must return a valid date");
  }
  const missingScopes = M365_GRAPH_REQUIRED_SCOPES.filter(
    (scope) => !connection.granted_scopes.includes(scope),
  );
  const status = connection.revoked_at
    ? "revoked"
    : Date.parse(connection.expires_at) <= nowMilliseconds
      ? "expired"
      : missingScopes.length > 0
        ? "scope_insufficient"
        : "connected";
  return Object.freeze({
    status,
    active: status === "connected",
    missing_scopes: Object.freeze(missingScopes),
  });
}
