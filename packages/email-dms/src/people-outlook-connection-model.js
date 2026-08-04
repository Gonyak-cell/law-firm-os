import { createHash } from "node:crypto";

export const PEOPLE_OUTLOOK_CONNECTION_MODEL_TYPE =
  "PeopleOutlookConnection";
export const PEOPLE_OUTLOOK_DELEGATED_SCOPE = "Calendars.ReadBasic";
export const PEOPLE_OUTLOOK_CREDENTIAL_ENVELOPE_PREFIX =
  "lawos-people-outlook-credential-v1.";

const CONNECTION_STATES = new Set([
  "consent_pending",
  "connected",
  "reauthorization_required",
  "revoked",
]);
const FORBIDDEN_CREDENTIAL_FIELDS = Object.freeze([
  "access_token",
  "refresh_token",
  "id_token",
  "client_secret",
  "authorization_code",
  "code_verifier",
  "token_bundle",
]);

function requiredString(input, field, maxLength = 4096) {
  const value = input?.[field];
  if (
    typeof value !== "string"
    || value.trim() === ""
    || value.trim().length > maxLength
  ) {
    throw new TypeError(`${field} is required`);
  }
  return value.trim();
}

function optionalString(input, field, maxLength = 4096) {
  const value = input?.[field];
  if (value === null || value === undefined || value === "") return null;
  return requiredString(input, field, maxLength);
}

function optionalInstant(input, field) {
  const value = optionalString(input, field);
  if (value === null) return null;
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds)) {
    throw new TypeError(`${field} must be a valid instant`);
  }
  return new Date(milliseconds).toISOString();
}

function requiredInstant(input, field) {
  const value = optionalInstant(input, field);
  if (!value) throw new TypeError(`${field} is required`);
  return value;
}

function optionalSha256(input, field) {
  const value = optionalString(input, field, 80);
  if (value === null) return null;
  if (!/^[a-f0-9]{64}$/u.test(value)) {
    throw new TypeError(`${field} must be a SHA-256 digest`);
  }
  return value;
}

function optionalOauthStateDigest(input) {
  const value = optionalString(input, "oauth_state_hash", 80);
  if (value === null) return null;
  if (!/^(?:sha256|scrypt):[a-f0-9]{64}$/u.test(value)) {
    throw new TypeError("oauth_state_hash must be a supported digest");
  }
  return value;
}

function optionalCredentialEnvelope(input) {
  const envelope = optionalString(input, "credential_envelope", 96 * 1024);
  if (envelope === null) return null;
  if (
    !envelope.startsWith(PEOPLE_OUTLOOK_CREDENTIAL_ENVELOPE_PREFIX)
    || !/^[A-Za-z0-9_-]+$/u.test(
      envelope.slice(PEOPLE_OUTLOOK_CREDENTIAL_ENVELOPE_PREFIX.length),
    )
  ) {
    throw new TypeError(
      "credential_envelope must be an encrypted People Outlook envelope",
    );
  }
  return envelope;
}

function rejectCredentialMaterial(input) {
  for (const field of FORBIDDEN_CREDENTIAL_FIELDS) {
    if (input?.[field] !== null && input?.[field] !== undefined) {
      throw new TypeError(
        `${field} cannot be stored in PeopleOutlookConnection`,
      );
    }
  }
}

export function peopleOutlookConnectionId({ tenant_id, employee_id } = {}) {
  const tenantId = requiredString({ tenant_id }, "tenant_id", 200);
  const employeeId = requiredString({ employee_id }, "employee_id", 200);
  const digest = createHash("sha256")
    .update(JSON.stringify({ tenant_id: tenantId, employee_id: employeeId }))
    .digest("hex")
    .slice(0, 32);
  return `people_outlook_connection_${digest}`;
}

export function normalizePeopleOutlookConnection(input = {}) {
  rejectCredentialMaterial(input);
  const connectionState = requiredString(
    input,
    "connection_state",
    64,
  );
  if (!CONNECTION_STATES.has(connectionState)) {
    throw new TypeError("connection_state is invalid");
  }
  const delegatedScope = input.delegated_scope
    ?? PEOPLE_OUTLOOK_DELEGATED_SCOPE;
  if (delegatedScope !== PEOPLE_OUTLOOK_DELEGATED_SCOPE) {
    throw new TypeError(
      "People Outlook connection must use delegated Calendars.ReadBasic",
    );
  }
  const stateVersion = input.state_version ?? 1;
  if (!Number.isSafeInteger(stateVersion) || stateVersion < 1) {
    throw new TypeError("state_version must be a positive integer");
  }
  const oauthStateHash = optionalOauthStateDigest(input);
  const oauthNonceHash = optionalSha256(input, "oauth_nonce_hash");
  const oauthVerifierCiphertext = optionalString(
    input,
    "oauth_verifier_ciphertext",
    1024,
  );
  if (
    oauthVerifierCiphertext !== null
    && !/^v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/u
      .test(oauthVerifierCiphertext)
  ) {
    throw new TypeError("oauth_verifier_ciphertext is invalid");
  }
  const oauthExpiresAt = optionalInstant(input, "oauth_expires_at");
  const credentialEnvelope = optionalCredentialEnvelope(input);
  const providerSubjectId = optionalString(
    input,
    "provider_subject_id",
    512,
  );
  const mailboxAddressHash = optionalSha256(
    input,
    "mailbox_address_hash",
  );
  const connectedAt = optionalInstant(input, "connected_at");
  const credentialExpiresAt = optionalInstant(
    input,
    "credential_expires_at",
  );
  const revokedAt = optionalInstant(input, "revoked_at");
  const sessionEmailHash = optionalSha256(input, "session_email_hash");

  if (!sessionEmailHash) {
    throw new TypeError("session_email_hash is required");
  }

  if (
    connectionState === "consent_pending"
    && (!oauthStateHash || !oauthNonceHash || !oauthVerifierCiphertext
      || !oauthExpiresAt)
  ) {
    throw new TypeError(
      "consent_pending requires bound OAuth state, nonce, verifier, and expiry",
    );
  }
  if (
    connectionState !== "consent_pending"
    && [
      oauthStateHash,
      oauthNonceHash,
      oauthVerifierCiphertext,
      oauthExpiresAt,
    ].some((value) => value !== null)
  ) {
    throw new TypeError(
      "completed People Outlook connection cannot retain OAuth attempt material",
    );
  }
  if (
    connectionState === "connected"
    && (!credentialEnvelope || !providerSubjectId || !mailboxAddressHash
      || !connectedAt || !credentialExpiresAt || revokedAt)
  ) {
    throw new TypeError(
      "connected People Outlook record is incomplete",
    );
  }
  if (
    connectionState === "revoked"
    && (!revokedAt || credentialEnvelope)
  ) {
    throw new TypeError(
      "revoked People Outlook record must clear its encrypted credential",
    );
  }
  if (connectionState !== "revoked" && revokedAt) {
    throw new TypeError("only revoked connections may set revoked_at");
  }

  return Object.freeze({
    model_type: PEOPLE_OUTLOOK_CONNECTION_MODEL_TYPE,
    people_outlook_connection_id: requiredString(
      input,
      "people_outlook_connection_id",
      200,
    ),
    tenant_id: requiredString(input, "tenant_id", 200),
    employee_id: requiredString(input, "employee_id", 200),
    user_id: requiredString(input, "user_id", 200),
    session_email_hash: sessionEmailHash,
    provider: "microsoft_graph",
    connection_state: connectionState,
    delegated_scope: PEOPLE_OUTLOOK_DELEGATED_SCOPE,
    provider_subject_id: providerSubjectId,
    mailbox_address_hash: mailboxAddressHash,
    credential_envelope: credentialEnvelope,
    connected_at: connectedAt,
    credential_expires_at: credentialExpiresAt,
    revoked_at: revokedAt,
    oauth_state_hash: oauthStateHash,
    oauth_nonce_hash: oauthNonceHash,
    oauth_verifier_ciphertext: oauthVerifierCiphertext,
    oauth_expires_at: oauthExpiresAt,
    safe_error_code: optionalString(input, "safe_error_code", 200),
    state_version: stateVersion,
    created_at: requiredInstant(input, "created_at"),
    updated_at: requiredInstant(input, "updated_at"),
    credential_material_included: false,
    credential_encrypted_at_rest: credentialEnvelope !== null,
    production_ready_claim: false,
  });
}
