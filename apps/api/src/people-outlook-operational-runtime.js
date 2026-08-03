import {
  createCipheriv,
  createDecipheriv,
  createHash,
  hkdfSync,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { SecretsManagerClient } from "@aws-sdk/client-secrets-manager";

import {
  PEOPLE_OUTLOOK_CONNECTION_MODEL_TYPE,
  PEOPLE_OUTLOOK_CREDENTIAL_ENVELOPE_PREFIX,
  PEOPLE_OUTLOOK_DELEGATED_SCOPE,
  normalizePeopleOutlookConnection,
  peopleOutlookConnectionId,
} from "../../../packages/email-dms/src/people-outlook-connection-model.js";
import {
  createOutlookCalendarViewAdapter,
} from "../../../packages/integrations-core/src/outlook-calendar-view.js";
import { resolveAwsJsonSecret } from "./aws-secret-reference.js";
import {
  createMicrosoftDelegatedOAuthClient,
  normalizeMicrosoftDelegatedOAuthConfig,
} from "./microsoft-delegated-oauth-client.js";

export const LAWOS_PEOPLE_OUTLOOK_M365_CONFIG_SECRET_ID_ENV =
  "LAWOS_PEOPLE_OUTLOOK_M365_CONFIG_SECRET_ID";

const PROVIDER = "microsoft_graph";
const GRAPH_ORIGIN = "https://graph.microsoft.com";
const GRAPH_CALENDAR_PATH = "/v1.0/me/calendarView";
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
const CREDENTIAL_REFRESH_SKEW_MS = 60 * 1000;
const SOURCE_STALE_AFTER_MS = 5 * 60 * 1000;
const SAFE_ID = /^[A-Za-z0-9._:-]{1,200}$/u;
const SAFE_STATE = /^[A-Za-z0-9_-]{43,128}$/u;
const AUTHORIZATION_CODE_PATTERN = /^(?=.{1,4096}$)[\x21-\x7e]+$/u;
const CREDENTIAL_ENVELOPE_SCHEMA =
  "lawos.people.outlook.credential-envelope.v1";

function requiredText(value, name, maxLength = 4096) {
  const text = String(value ?? "").trim();
  if (!text || text.length > maxLength) {
    throw new TypeError(`${name} is required`);
  }
  return text;
}

function requiredId(value, name) {
  const text = requiredText(value, name, 200);
  if (!SAFE_ID.test(text)) throw new TypeError(`${name} must be a safe identifier`);
  return text;
}

function failure(code, message, status = 400) {
  return Object.assign(new Error(message), {
    safe_error_code: code,
    status,
  });
}

function normalizedEmail(value) {
  const email = String(value ?? "").normalize("NFKC").trim().toLowerCase();
  if (
    !email
    || email.length > 320
    || !email.includes("@")
    || /[\u0000-\u001f\u007f\s]/u.test(email)
  ) {
    throw failure(
      "OUTLOOK_SIGNED_ACCOUNT_REQUIRED",
      "A signed LawOS account email is required",
      403,
    );
  }
  return email;
}

function sha256(value) {
  return createHash("sha256").update(String(value), "utf8").digest("hex");
}

function stateHash(value) {
  return `sha256:${sha256(value)}`;
}

function sameStateHash(expected, value) {
  if (!/^sha256:[a-f0-9]{64}$/u.test(String(expected ?? ""))) return false;
  const expectedBytes = Buffer.from(expected.slice("sha256:".length), "hex");
  const actualBytes = createHash("sha256").update(String(value), "utf8").digest();
  return timingSafeEqual(expectedBytes, actualBytes);
}

function instant(clock) {
  const value = clock();
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) {
    throw new TypeError("clock must return a valid date");
  }
  return date;
}

function stateEncryptionKey(value) {
  const text = requiredText(value, "state_encryption_key", 256);
  if (!/^[A-Za-z0-9+/]+={0,2}$/u.test(text)) {
    throw new TypeError("state_encryption_key must be base64");
  }
  const key = Buffer.from(text, "base64");
  if (key.byteLength !== 32) {
    throw new TypeError("state_encryption_key must decode to 32 bytes");
  }
  return key;
}

function derivedEncryptionKey(rootKey, purpose) {
  return Buffer.from(hkdfSync(
    "sha256",
    rootKey,
    Buffer.from("lawos.people.outlook.v1", "utf8"),
    Buffer.from(purpose, "utf8"),
    32,
  ));
}

function sha256Bytes(value) {
  return createHash("sha256").update(value).digest("hex");
}

function credentialAad(record) {
  return Buffer.from(JSON.stringify({
    schema: CREDENTIAL_ENVELOPE_SCHEMA,
    tenant_id: requiredId(record.tenant_id, "tenant_id"),
    employee_id: requiredId(record.employee_id, "employee_id"),
    user_id: requiredId(record.user_id, "user_id"),
    people_outlook_connection_id: requiredId(
      record.people_outlook_connection_id,
      "people_outlook_connection_id",
    ),
    session_email_hash: requiredText(
      record.session_email_hash,
      "session_email_hash",
      64,
    ),
  }), "utf8");
}

function credentialBundle(input = {}) {
  const scopes = Array.isArray(input.granted_scopes)
    ? [...new Set(input.granted_scopes.map((scope) => (
      requiredText(scope, "granted_scope", 200)
    )))]
    : [];
  const allowedScopes = new Set([
    "openid",
    "profile",
    "email",
    "offline_access",
    PEOPLE_OUTLOOK_DELEGATED_SCOPE,
  ].map((scope) => scope.toLowerCase()));
  if (
    !scopes.some((scope) => (
      scope.toLowerCase() === PEOPLE_OUTLOOK_DELEGATED_SCOPE.toLowerCase()
    ))
    || scopes.some((scope) => (
      scope.includes(".") && !allowedScopes.has(scope.toLowerCase())
    ))
  ) {
    throw failure(
      "OUTLOOK_CREDENTIAL_BINDING_INVALID",
      "Outlook credential scope is invalid",
      409,
    );
  }
  const expiresAt = requiredText(input.expires_at, "expires_at", 100);
  if (!Number.isFinite(Date.parse(expiresAt))) {
    throw failure(
      "OUTLOOK_CREDENTIAL_BINDING_INVALID",
      "Outlook credential expiry is invalid",
      409,
    );
  }
  return Object.freeze({
    access_token: requiredText(input.access_token, "access_token", 32 * 1024),
    refresh_token: requiredText(
      input.refresh_token,
      "refresh_token",
      32 * 1024,
    ),
    expires_at: new Date(expiresAt).toISOString(),
    provider_subject_id: requiredText(
      input.provider_subject_id,
      "provider_subject_id",
      512,
    ),
    mailbox_address: normalizedEmail(input.mailbox_address),
    granted_scopes: Object.freeze(scopes),
  });
}

function encryptCredential(input, record, key) {
  const bundle = credentialBundle(input);
  const aad = credentialAad(record);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(aad);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify({
      schema: CREDENTIAL_ENVELOPE_SCHEMA,
      ...bundle,
    }), "utf8"),
    cipher.final(),
  ]);
  const envelope = {
    schema_version: 1,
    alg: "AES-256-GCM",
    key_ref: `sha256:${sha256Bytes(key).slice(0, 32)}`,
    aad_hash: `sha256:${sha256Bytes(aad)}`,
    iv: iv.toString("base64url"),
    tag: cipher.getAuthTag().toString("base64url"),
    ciphertext: ciphertext.toString("base64url"),
  };
  return `${PEOPLE_OUTLOOK_CREDENTIAL_ENVELOPE_PREFIX}${
    Buffer.from(JSON.stringify(envelope), "utf8").toString("base64url")
  }`;
}

function decryptCredential(record, key) {
  try {
    const value = requiredText(
      record.credential_envelope,
      "credential_envelope",
      96 * 1024,
    );
    if (!value.startsWith(PEOPLE_OUTLOOK_CREDENTIAL_ENVELOPE_PREFIX)) {
      throw new TypeError("credential envelope prefix is invalid");
    }
    const encoded = value.slice(
      PEOPLE_OUTLOOK_CREDENTIAL_ENVELOPE_PREFIX.length,
    );
    const decoded = Buffer.from(encoded, "base64url");
    if (decoded.toString("base64url") !== encoded) {
      throw new TypeError("credential envelope encoding is invalid");
    }
    const envelope = JSON.parse(decoded.toString("utf8"));
    const aad = credentialAad(record);
    if (
      envelope?.schema_version !== 1
      || envelope.alg !== "AES-256-GCM"
      || envelope.key_ref !== `sha256:${sha256Bytes(key).slice(0, 32)}`
      || envelope.aad_hash !== `sha256:${sha256Bytes(aad)}`
    ) {
      throw new TypeError("credential envelope metadata is invalid");
    }
    const decipher = createDecipheriv(
      "aes-256-gcm",
      key,
      Buffer.from(envelope.iv, "base64url"),
    );
    decipher.setAAD(aad);
    decipher.setAuthTag(Buffer.from(envelope.tag, "base64url"));
    const payload = JSON.parse(Buffer.concat([
      decipher.update(Buffer.from(envelope.ciphertext, "base64url")),
      decipher.final(),
    ]).toString("utf8"));
    if (payload?.schema !== CREDENTIAL_ENVELOPE_SCHEMA) {
      throw new TypeError("credential payload schema is invalid");
    }
    const bundle = credentialBundle(payload);
    if (
      bundle.provider_subject_id !== record.provider_subject_id
      || sha256(bundle.mailbox_address) !== record.mailbox_address_hash
    ) {
      throw new TypeError("credential identity binding is invalid");
    }
    return bundle;
  } catch {
    throw failure(
      "OUTLOOK_CREDENTIAL_BINDING_INVALID",
      "Outlook encrypted credential is invalid",
      409,
    );
  }
}

function encryptVerifier(verifier, key) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(requiredText(verifier, "code_verifier", 128), "utf8"),
    cipher.final(),
  ]);
  return [
    "v1",
    iv.toString("base64url"),
    ciphertext.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
  ].join(".");
}

function decryptVerifier(value, key) {
  const [version, ivValue, ciphertextValue, tagValue, extra] =
    String(value ?? "").split(".");
  if (version !== "v1" || !ivValue || !ciphertextValue || !tagValue || extra) {
    throw failure(
      "OUTLOOK_OAUTH_STATE_INVALID",
      "Outlook authorization state is invalid",
    );
  }
  try {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      key,
      Buffer.from(ivValue, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(ciphertextValue, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    throw failure(
      "OUTLOOK_OAUTH_STATE_INVALID",
      "Outlook authorization state is invalid",
    );
  }
}

function normalizeRuntimeConfig(input = {}) {
  const oauth = normalizeMicrosoftDelegatedOAuthConfig(input);
  const rootKey = stateEncryptionKey(input.state_encryption_key);
  return Object.freeze({
    ...oauth,
    state_encryption_key: derivedEncryptionKey(
      rootKey,
      "oauth-state-verifier",
    ),
    credential_encryption_key: derivedEncryptionKey(
      rootKey,
      "delegated-token-bundle",
    ),
  });
}

function recordRef(record) {
  return {
    tenant_id: record.tenant_id,
    model_type: PEOPLE_OUTLOOK_CONNECTION_MODEL_TYPE,
    people_outlook_connection_id: record.people_outlook_connection_id,
  };
}

function findRecord(repository, tenantId, employeeId) {
  const expectedId = peopleOutlookConnectionId({
    tenant_id: tenantId,
    employee_id: employeeId,
  });
  const matches = repository.list({
    tenant_id: tenantId,
    model_type: PEOPLE_OUTLOOK_CONNECTION_MODEL_TYPE,
  }).filter((record) => (
    record.employee_id === employeeId
    || record.people_outlook_connection_id === expectedId
  )).map(normalizePeopleOutlookConnection);
  if (matches.length > 1) {
    throw failure(
      "OUTLOOK_CONNECTION_IDENTITY_INVALID",
      "Multiple People Outlook connections exist for one employee",
      409,
    );
  }
  const record = matches[0] ?? null;
  if (
    record
    && (
      record.people_outlook_connection_id !== expectedId
      || record.tenant_id !== tenantId
      || record.employee_id !== employeeId
    )
  ) {
    throw failure(
      "OUTLOOK_CONNECTION_IDENTITY_INVALID",
      "People Outlook connection identity does not reconcile",
      409,
    );
  }
  return record;
}

function persistRecord(repository, current, input) {
  const record = normalizePeopleOutlookConnection(input);
  return current
    ? normalizePeopleOutlookConnection(
      repository.update(recordRef(current), record),
    )
    : normalizePeopleOutlookConnection(repository.create(record));
}

function appendAudit(repository, record, action, actorId, payload = {}) {
  return repository.appendAudit({
    tenant_id: record.tenant_id,
    event_id:
      `audit:${record.people_outlook_connection_id}:${record.state_version}:${action}`,
    event_type: action,
    actor_id: actorId,
    object_type: PEOPLE_OUTLOOK_CONNECTION_MODEL_TYPE,
    object_id: record.people_outlook_connection_id,
    payload: {
      employee_id: record.employee_id,
      connection_state: record.connection_state,
      delegated_scope: PEOPLE_OUTLOOK_DELEGATED_SCOPE,
      state_version: record.state_version,
      credential_material_included: false,
      ...payload,
    },
    created_at: record.updated_at,
  });
}

function persistTransition(repository, {
  current,
  input,
  action,
  actor_id,
  idempotency_key,
  audit_payload = {},
  response = {},
}) {
  const run = (tx) => {
    const saved = persistRecord(tx, current, input);
    appendAudit(tx, saved, action, actor_id, audit_payload);
    tx.recordIdempotency({
      tenant_id: saved.tenant_id,
      idempotency_key,
      operation: action,
      response: {
        people_outlook_connection_id:
          saved.people_outlook_connection_id,
        connection_state: saved.connection_state,
        state_version: saved.state_version,
        credential_material_included: false,
        ...response,
      },
      created_at: saved.updated_at,
    });
    return saved;
  };
  return typeof repository.transaction === "function"
    ? repository.transaction(run)
    : run(repository);
}

function publicState(record, { canManage = false, safeErrorCode = null } = {}) {
  const state = !record || record.connection_state === "revoked"
    ? "not_connected"
    : record.connection_state;
  return Object.freeze({
    provider: PROVIDER,
    connection_state: state,
    can_manage: canManage,
    delegated_scope: PEOPLE_OUTLOOK_DELEGATED_SCOPE,
    connected_at: record?.connected_at ?? null,
    expires_at: record?.credential_expires_at ?? null,
    safe_error_code: safeErrorCode ?? record?.safe_error_code ?? null,
  });
}

function principal(input = {}) {
  const sessionEmail = normalizedEmail(input.session_email);
  return Object.freeze({
    user_id: requiredId(input.user_id, "user_id"),
    session_email: sessionEmail,
    session_email_hash: sha256(sessionEmail),
    entra_subject_id: input.entra_subject_id
      ? requiredText(input.entra_subject_id, "entra_subject_id", 512)
      : null,
  });
}

function assertSelf(input) {
  if (input.can_manage !== true) {
    throw failure(
      "OUTLOOK_CONNECTION_SELF_REQUIRED",
      "Only the linked employee can manage delegated calendar access",
      403,
    );
  }
}

function assertPrincipalBinding(record, actor) {
  if (
    record
    && (
      record.user_id !== actor.user_id
      || record.session_email_hash !== actor.session_email_hash
      || (
        actor.entra_subject_id
        && record.provider_subject_id
        && actor.entra_subject_id !== record.provider_subject_id
      )
    )
  ) {
    throw failure(
      "OUTLOOK_ACCOUNT_MISMATCH",
      "Outlook connection belongs to another signed account",
      403,
    );
  }
}

function emptyEvents(employeeIds) {
  return Object.freeze(Object.fromEntries(
    employeeIds.map((employeeId) => [employeeId, Object.freeze([])]),
  ));
}

function runtimeCredentialRef(record) {
  return `postgres-encrypted:${requiredId(
    record.people_outlook_connection_id,
    "people_outlook_connection_id",
  )}:${record.state_version}`;
}

export function createPeopleOutlookOperationalRuntimeFactory({
  config: rawConfig,
  oauth_client = null,
  fetch_impl = globalThis.fetch,
  clock = () => new Date(),
} = {}) {
  const config = normalizeRuntimeConfig(rawConfig);
  if (typeof fetch_impl !== "function") throw new TypeError("fetch_impl is required");
  const oauth = oauth_client ?? createMicrosoftDelegatedOAuthClient({
    config,
    fetch_impl,
    clock,
  });
  for (const method of ["authorizationUrl", "exchange", "refresh"]) {
    if (typeof oauth?.[method] !== "function") {
      throw new TypeError(`People Outlook OAuth client ${method} is required`);
    }
  }

  return function createPeopleOutlookOperationalRuntime({ repository } = {}) {
    if (
      !repository
      || typeof repository.list !== "function"
      || typeof repository.create !== "function"
      || typeof repository.update !== "function"
      || typeof repository.appendAudit !== "function"
      || typeof repository.recordIdempotency !== "function"
      || typeof repository.getIdempotency !== "function"
    ) {
      throw new TypeError("Email DMS operational repository is required");
    }

    function status({ tenant_id, employee_id, can_manage = false } = {}) {
      const tenantId = requiredId(tenant_id, "tenant_id");
      const employeeId = requiredId(employee_id, "employee_id");
      let record = findRecord(repository, tenantId, employeeId);
      if (
        record?.connection_state === "consent_pending"
        && Date.parse(record.oauth_expires_at) <= instant(clock).getTime()
      ) {
        record = Object.freeze({
          ...record,
          connection_state: "reauthorization_required",
          safe_error_code: "OUTLOOK_OAUTH_STATE_EXPIRED",
        });
      }
      return publicState(record, { canManage: can_manage });
    }

    function begin(input = {}) {
      assertSelf(input);
      const tenantId = requiredId(input.tenant_id, "tenant_id");
      const employeeId = requiredId(input.employee_id, "employee_id");
      const actor = principal(input);
      const current = findRecord(repository, tenantId, employeeId);
      assertPrincipalBinding(current, actor);
      const now = instant(clock);
      const state = randomBytes(32).toString("base64url");
      const nonce = randomBytes(32).toString("base64url");
      const verifier = randomBytes(32).toString("base64url");
      const challenge = createHash("sha256")
        .update(verifier, "utf8")
        .digest("base64url");
      const nextVersion = (current?.state_version ?? 0) + 1;
      const connectionId = peopleOutlookConnectionId({
        tenant_id: tenantId,
        employee_id: employeeId,
      });
      const record = persistTransition(repository, {
        current,
        action: "people.outlook.authorization.started",
        actor_id: actor.user_id,
        idempotency_key:
          `people-outlook-begin:${connectionId}:${nextVersion}`,
        audit_payload: { pkce_s256: true, state_bound: true },
        input: {
          ...(current ?? {}),
          model_type: PEOPLE_OUTLOOK_CONNECTION_MODEL_TYPE,
          people_outlook_connection_id: connectionId,
          tenant_id: tenantId,
          employee_id: employeeId,
          user_id: actor.user_id,
          session_email_hash: actor.session_email_hash,
          connection_state: "consent_pending",
          delegated_scope: PEOPLE_OUTLOOK_DELEGATED_SCOPE,
          oauth_state_hash: stateHash(state),
          oauth_nonce_hash: sha256(nonce),
          oauth_verifier_ciphertext: encryptVerifier(
            verifier,
            config.state_encryption_key,
          ),
          oauth_expires_at: new Date(
            now.getTime() + OAUTH_STATE_TTL_MS,
          ).toISOString(),
          safe_error_code: null,
          revoked_at: null,
          state_version: nextVersion,
          created_at: current?.created_at ?? now.toISOString(),
          updated_at: now.toISOString(),
        },
      });
      return Object.freeze({
        ...publicState(record, { canManage: true }),
        state_ref: state,
        authorize_url: oauth.authorizationUrl({
          state,
          code_challenge: challenge,
          nonce,
          login_hint: actor.session_email,
        }),
      });
    }

    async function complete(input = {}) {
      assertSelf(input);
      if (
        Object.hasOwn(input, "access_token")
        || Object.hasOwn(input, "refresh_token")
        || Object.hasOwn(input, "email")
      ) {
        throw failure(
          "OUTLOOK_OAUTH_BOUNDARY_INVALID",
          "OAuth credentials are accepted only from Microsoft",
        );
      }
      const tenantId = requiredId(input.tenant_id, "tenant_id");
      const employeeId = requiredId(input.employee_id, "employee_id");
      const actor = principal(input);
      const current = findRecord(repository, tenantId, employeeId);
      assertPrincipalBinding(current, actor);
      const state = requiredText(input.state_ref, "state_ref", 200);
      const authorizationCode = requiredText(
        input.authorization_code,
        "authorization_code",
      );
      if (
        !SAFE_STATE.test(state)
        || !AUTHORIZATION_CODE_PATTERN.test(authorizationCode)
      ) {
        throw failure(
          "OUTLOOK_OAUTH_CALLBACK_INVALID",
          "Outlook OAuth callback is invalid",
        );
      }
      const completionIdempotencyKey =
        `people-outlook-complete:${peopleOutlookConnectionId({
          tenant_id: tenantId,
          employee_id: employeeId,
        })}:${sha256(state).slice(0, 32)}`;
      const replay = repository.getIdempotency({
        tenant_id: tenantId,
        idempotency_key: completionIdempotencyKey,
      });
      if (replay) {
        if (!current) {
          throw failure(
            "OUTLOOK_OAUTH_STATE_INVALID",
            "Outlook authorization replay state is incomplete",
            409,
          );
        }
        return publicState(current, { canManage: true });
      }
      if (
        !current
        || current.connection_state !== "consent_pending"
        || !sameStateHash(current.oauth_state_hash, state)
      ) {
        throw failure(
          "OUTLOOK_OAUTH_STATE_INVALID",
          "Outlook authorization state is invalid",
        );
      }
      if (Date.parse(current.oauth_expires_at) <= instant(clock).getTime()) {
        throw failure(
          "OUTLOOK_OAUTH_STATE_EXPIRED",
          "Outlook authorization state has expired",
        );
      }
      const expectedSubjectId = current.provider_subject_id
        ?? actor.entra_subject_id;
      const exchanged = await oauth.exchange({
        code: authorizationCode,
        code_verifier: decryptVerifier(
          current.oauth_verifier_ciphertext,
          config.state_encryption_key,
        ),
        expected_nonce_hash: current.oauth_nonce_hash,
        expected_email_hash: actor.session_email_hash,
        expected_subject_id: expectedSubjectId,
      });
      if (
        actor.entra_subject_id
        && exchanged.provider_subject_id !== actor.entra_subject_id
      ) {
        throw failure(
          "OUTLOOK_ACCOUNT_MISMATCH",
          "Microsoft account does not match the signed LawOS session",
          403,
        );
      }
      const now = instant(clock).toISOString();
      const connected = persistTransition(repository, {
        current,
        action: "people.outlook.connection.connected",
        actor_id: actor.user_id,
        idempotency_key: completionIdempotencyKey,
        audit_payload: {
          mailbox_address_hash: sha256(exchanged.mailbox_address),
        },
        input: {
          ...current,
          connection_state: "connected",
          provider_subject_id: exchanged.provider_subject_id,
          mailbox_address_hash: sha256(exchanged.mailbox_address),
          credential_envelope: encryptCredential(
            exchanged,
            current,
            config.credential_encryption_key,
          ),
          connected_at: now,
          credential_expires_at: exchanged.expires_at,
          oauth_state_hash: null,
          oauth_nonce_hash: null,
          oauth_verifier_ciphertext: null,
          oauth_expires_at: null,
          safe_error_code: null,
          revoked_at: null,
          state_version: current.state_version + 1,
          updated_at: now,
        },
      });
      return publicState(connected, { canManage: true });
    }

    async function disconnect(input = {}) {
      assertSelf(input);
      const tenantId = requiredId(input.tenant_id, "tenant_id");
      const employeeId = requiredId(input.employee_id, "employee_id");
      const actor = principal(input);
      const current = findRecord(repository, tenantId, employeeId);
      assertPrincipalBinding(current, actor);
      if (!current || current.connection_state === "revoked") {
        return publicState(null, { canManage: true });
      }
      const now = instant(clock).toISOString();
      const revoked = persistTransition(repository, {
        current,
        action: "people.outlook.connection.disconnected",
        actor_id: actor.user_id,
        idempotency_key:
          `people-outlook-disconnect:${current.people_outlook_connection_id}:${current.state_version}`,
        audit_payload: { encrypted_credential_deleted: true },
        input: {
          ...current,
          connection_state: "revoked",
          credential_envelope: null,
          credential_expires_at: null,
          oauth_state_hash: null,
          oauth_nonce_hash: null,
          oauth_verifier_ciphertext: null,
          oauth_expires_at: null,
          safe_error_code: null,
          revoked_at: now,
          state_version: current.state_version + 1,
          updated_at: now,
        },
      });
      return publicState(revoked, { canManage: true });
    }

    function updateCredentialRecord(record, credential, expiresAt) {
      const now = instant(clock).toISOString();
      return persistTransition(repository, {
        current: record,
        action: "people.outlook.credential.refreshed",
        actor_id: record.user_id,
        idempotency_key:
          `people-outlook-refresh:${record.people_outlook_connection_id}:${record.state_version}`,
        audit_payload: { encrypted_credential_replaced: true },
        input: {
          ...record,
          credential_expires_at: expiresAt,
          mailbox_address_hash: sha256(credential.mailbox_address),
          credential_envelope: encryptCredential(
            credential,
            record,
            config.credential_encryption_key,
          ),
          safe_error_code: null,
          state_version: record.state_version + 1,
          updated_at: now,
        },
      });
    }

    function markReauthorizationRequired(record, code) {
      const now = instant(clock).toISOString();
      return persistTransition(repository, {
        current: record,
        action: "people.outlook.credential.reauthorization_required",
        actor_id: record.user_id,
        idempotency_key:
          `people-outlook-reauthorize:${record.people_outlook_connection_id}:${record.state_version}:${sha256(code).slice(0, 16)}`,
        audit_payload: { encrypted_credential_deleted: true },
        response: { safe_error_code: code },
        input: {
          ...record,
          connection_state: "reauthorization_required",
          credential_envelope: null,
          credential_expires_at: null,
          oauth_state_hash: null,
          oauth_nonce_hash: null,
          oauth_verifier_ciphertext: null,
          oauth_expires_at: null,
          safe_error_code: code,
          state_version: record.state_version + 1,
          updated_at: now,
        },
      });
    }

    async function activeCredential(record, { forceRefresh = false } = {}) {
      let credential = decryptCredential(
        record,
        config.credential_encryption_key,
      );
      const expiresAt = Date.parse(credential.expires_at);
      if (!Number.isFinite(expiresAt)) {
        throw failure(
          "OUTLOOK_CREDENTIAL_BINDING_INVALID",
          "Outlook credential expiry is invalid",
          409,
        );
      }
      let currentRecord = record;
      if (
        forceRefresh
        || expiresAt <= instant(clock).getTime() + CREDENTIAL_REFRESH_SKEW_MS
      ) {
        let refreshed;
        try {
          refreshed = await oauth.refresh({
            refresh_token: credential.refresh_token,
          });
        } catch (error) {
          if (error?.status === 401) {
            markReauthorizationRequired(
              record,
              error.safe_error_code ?? "OUTLOOK_REAUTHORIZATION_REQUIRED",
            );
          }
          throw error;
        }
        credential = {
          ...credential,
          access_token: refreshed.access_token,
          refresh_token: refreshed.refresh_token,
          expires_at: refreshed.expires_at,
          granted_scopes: refreshed.granted_scopes,
        };
        currentRecord = updateCredentialRecord(
          record,
          credential,
          refreshed.expires_at,
        );
      }
      return Object.freeze({ record: currentRecord, credential });
    }

    async function graphResponse(url, options, accessToken) {
      const parsed = new URL(url);
      if (
        parsed.origin !== GRAPH_ORIGIN
        || parsed.pathname !== GRAPH_CALENDAR_PATH
        || options.method !== "GET"
      ) {
        throw failure(
          "OUTLOOK_CALENDAR_REQUEST_UNSAFE",
          "Outlook calendar request target is not allowed",
          500,
        );
      }
      let response;
      try {
        response = await fetch_impl(parsed.toString(), {
          method: "GET",
          headers: {
            ...options.headers,
            authorization: `Bearer ${accessToken}`,
          },
          signal: AbortSignal.timeout(15_000),
        });
      } catch {
        throw failure(
          "OUTLOOK_CALENDAR_READ_FAILED",
          "Microsoft Graph calendar request failed",
          503,
        );
      }
      const body = response.status === 200
        ? await response.json().catch(() => null)
        : null;
      return Object.freeze({
        status: response.status,
        headers: response.headers,
        body,
      });
    }

    async function readCalendar(record, { date, timezone }) {
      let active = await activeCredential(record);
      const adapter = createOutlookCalendarViewAdapter({
        max_retries: 1,
        wait: (milliseconds) => new Promise((resolve) => {
          setTimeout(resolve, Math.min(milliseconds, 5_000));
        }),
        request: async ({ url, method, headers, credential_ref }) => {
          if (credential_ref !== runtimeCredentialRef(active.record)) {
            throw failure(
              "OUTLOOK_CREDENTIAL_REFERENCE_INVALID",
              "Outlook credential reference changed unexpectedly",
              409,
            );
          }
          return graphResponse(url, { method, headers }, active.credential.access_token);
        },
        refreshCredential: async ({ credential_ref }) => {
          if (credential_ref !== runtimeCredentialRef(active.record)) {
            throw failure(
              "OUTLOOK_CREDENTIAL_REFERENCE_INVALID",
              "Outlook credential reference changed unexpectedly",
              409,
            );
          }
          active = await activeCredential(
            active.record,
            { forceRefresh: true },
          );
          return runtimeCredentialRef(active.record);
        },
      });
      return adapter.read({
        date,
        timezone,
        credential_ref: runtimeCredentialRef(active.record),
        subject_address: active.credential.mailbox_address,
      });
    }

    const calendarSource = Object.freeze({
      async read({
        tenant_id,
        employee_ids = [],
        as_of,
        timezone = "Asia/Seoul",
      } = {}) {
        const tenantId = requiredId(tenant_id, "tenant_id");
        const employeeIds = [...new Set(
          employee_ids.map((employeeId) => requiredId(employeeId, "employee_id")),
        )].sort();
        const date = typeof as_of === "string" && /^\d{4}-\d{2}-\d{2}$/u.test(as_of)
          ? as_of
          : new Intl.DateTimeFormat("en-CA", {
            timeZone: timezone,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          }).format(instant(clock));
        const eventsByEmployeeId = { ...emptyEvents(employeeIds) };
        const connectionStateByEmployeeId = {};
        const failures = [];
        let connectedCount = 0;
        let successCount = 0;
        await Promise.all(employeeIds.map(async (employeeId) => {
          const record = findRecord(repository, tenantId, employeeId);
          connectionStateByEmployeeId[employeeId] = publicState(record, {
            canManage: false,
          });
          if (record?.connection_state !== "connected") return;
          connectedCount += 1;
          try {
            const loaded = await readCalendar(record, { date, timezone });
            eventsByEmployeeId[employeeId] = loaded.events;
            connectionStateByEmployeeId[employeeId] = publicState(
              findRecord(repository, tenantId, employeeId),
              { canManage: false },
            );
            successCount += 1;
          } catch (error) {
            failures.push(
              error?.safe_error_code ?? "OUTLOOK_CALENDAR_READ_FAILED",
            );
            connectionStateByEmployeeId[employeeId] = publicState(
              findRecord(repository, tenantId, employeeId),
              { canManage: false },
            );
          }
        }));
        const now = instant(clock);
        const state = failures.length === 0
          ? "ok"
          : successCount > 0
            ? "stale"
            : "blocked";
        return Object.freeze({
          state,
          events_by_employee_id: Object.freeze(eventsByEmployeeId),
          connection_state_by_employee_id: Object.freeze(
            connectionStateByEmployeeId,
          ),
          last_success_at: successCount > 0 ? now.toISOString() : null,
          stale_after: successCount > 0
            ? new Date(now.getTime() + SOURCE_STALE_AFTER_MS).toISOString()
            : null,
          safe_error_code: failures[0] ?? null,
          connected_employee_count: connectedCount,
          credential_material_included: false,
        });
      },
      async refresh(input = {}) {
        return calendarSource.read(input);
      },
      async whenIdle() {},
    });

    return Object.freeze({
      connections: Object.freeze({ status, begin, complete, disconnect }),
      calendarSource,
    });
  };
}

export async function createPeopleOutlookOperationalRuntimeFactoryFromSecretReference({
  env = process.env,
  secrets_client = null,
  fetch_impl = globalThis.fetch,
  clock = () => new Date(),
} = {}) {
  const secretId = requiredText(
    env[LAWOS_PEOPLE_OUTLOOK_M365_CONFIG_SECRET_ID_ENV],
    LAWOS_PEOPLE_OUTLOOK_M365_CONFIG_SECRET_ID_ENV,
  );
  const region = requiredText(
    env.AWS_REGION
      ?? env.AWS_DEFAULT_REGION
      ?? env.LAWOS_AWS_REGION
      ?? "ap-northeast-2",
    "AWS region",
  );
  const client = secrets_client ?? new SecretsManagerClient({ region });
  const secret = await resolveAwsJsonSecret({
    secretId,
    region,
    client,
  });
  const nested = secret.people_outlook;
  if (
    nested !== undefined
    && (
      !nested
      || typeof nested !== "object"
      || Array.isArray(nested)
    )
  ) {
    throw new TypeError("people_outlook secret configuration is invalid");
  }
  const config = nested
    ? {
        tenant_id: nested.tenant_id ?? secret.tenant_id,
        client_id: nested.client_id,
        client_secret: nested.client_secret,
        redirect_uri: nested.redirect_uri,
        state_encryption_key: nested.state_encryption_key,
      }
    : secret;
  return createPeopleOutlookOperationalRuntimeFactory({
    config,
    fetch_impl,
    clock,
  });
}

export async function resolveLambdaPeopleOutlookRuntimeFactory({
  env = process.env,
  ...options
} = {}) {
  if (
    String(env.VITE_LAWOS_OUTLOOK_CALENDAR ?? "")
      .trim()
      .toLowerCase() !== "true"
  ) {
    return null;
  }
  return createPeopleOutlookOperationalRuntimeFactoryFromSecretReference({
    env,
    ...options,
  });
}
