import { createHash } from "node:crypto";
import { types } from "node:util";
import { withPostgresTransaction } from "../../../packages/persistence/src/postgres/transaction.js";
import { normalizeAssignmentPrincipal } from "../../../packages/email-dms/src/outlook-desktop-assignment-contract.js";
import {
  outlookDesktopPublicKeyFingerprint,
  verifyOutlookDesktopLifecycleProof,
} from "../../../packages/email-dms/src/outlook-desktop-installation-proof.js";
import {
  INTERNAL_UNSIGNED_INSTALLATION_ATTESTATION_SCHEMA,
  INTERNAL_UNSIGNED_INSTALLATION_ATTESTATION_FIELDS,
  createInternalUnsignedInstallationAttestationSigner,
  validateInternalUnsignedInstallationAttestationDocument,
} from "../../../packages/runtime-auth/src/internal-unsigned-installation-attestation.js";

export { INTERNAL_UNSIGNED_INSTALLATION_ATTESTATION_SCHEMA };
export const INTERNAL_UNSIGNED_INSTALLATION_PATH = "/api/desktop/internal-installations";
export const INTERNAL_UNSIGNED_INSTALLATION_ATTESTATION_PATH =
  "/api/desktop/internal-updates/baseline-adoption-attestation";
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/u;
const INSTALLATION_ID = /^odi_[A-Za-z0-9_-]{20,128}$/u;
const SHA256 = /^[a-f0-9]{64}$/u;
const LEGACY_INSTALLATION_PATH = "/api/desktop/installations";
const LEGACY_REGISTER_FIELDS = ["platform", "app_version", "source_sha", "device_public_key"];
const BODY_FIELDS = Object.freeze({
  register: ["release_authorization_id", "device_public_key", "installed_receipt_sha256"],
  heartbeat: ["expected_state_version"],
  retire: ["expected_state_version", "retire_reason"],
});

function failure(code = "INTERNAL_INSTALLATION_AUTHORITY_UNAVAILABLE", status = 503) {
  return Object.assign(new Error("Internal installation authority request failed"), {
    safe_error_code: code, status,
  });
}

function exact(value, fields) {
  if (!value || typeof value !== "object" || Array.isArray(value) || types.isProxy(value)) {
    throw failure("INTERNAL_INSTALLATION_REQUEST_INVALID", 400);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const keys = Reflect.ownKeys(descriptors);
  if (![Object.prototype, null].includes(Object.getPrototypeOf(value))
      || keys.length !== fields.length || keys.some((field) =>
        typeof field !== "string" || !fields.includes(field)
        || !Object.hasOwn(descriptors[field], "value") || !descriptors[field].enumerable)) {
    throw failure("INTERNAL_INSTALLATION_REQUEST_INVALID", 400);
  }
  return Object.fromEntries(fields.map((field) => [field, descriptors[field].value]));
}

function mapError(error) {
  const mapping = {
    LIU01: ["INTERNAL_INSTALLATION_IDEMPOTENCY_CONFLICT", 409],
    LIU02: ["INTERNAL_INSTALLATION_NONCE_REUSED", 409],
    LIU03: ["INTERNAL_INSTALLATION_BINDING_MISMATCH", 403],
    LIU04: ["INTERNAL_INSTALLATION_STATE_CONFLICT", 409],
    LIU05: ["INTERNAL_INSTALLATION_NOT_FOUND", 404],
    LIU06: ["INTERNAL_INSTALLATION_RETIRED_OR_REVOKED", 409],
    LIU07: ["INTERNAL_INSTALLATION_REQUEST_INVALID", 400],
    LIU08: ["INTERNAL_INSTALLATION_RELEASE_UNTRUSTED", 403],
  };
  if (mapping[error?.postgres_code]) return failure(...mapping[error.postgres_code]);
  if (/^(?:INTERNAL_INSTALLATION_|OUTLOOK_DESKTOP_PROOF_)/u.test(error?.safe_error_code ?? "")) return error;
  return failure();
}

function databaseTimestamp(value) {
  if (typeof value !== "string"
      || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/u.test(value)
      || !Number.isFinite(Date.parse(value))) throw failure();
  return new Date(value).toISOString();
}

export function createPostgresInternalUnsignedInstallationAuthority({
  pool, tenant_id: tenantId, attestation_key_id: keyId,
  attestation_private_key: privateKey,
  expected_attestation_public_key_sha256: expectedPublicKeySha256,
} = {}) {
  if (!pool?.connect || typeof tenantId !== "string" || !ID.test(tenantId)) {
    throw new TypeError("Internal installation PostgreSQL authority configuration is invalid");
  }
  const signAttestation = createInternalUnsignedInstallationAttestationSigner({
    privateKey, keyId, expectedPublicKeySha256,
  });
  const principal = (value) => {
    const bound = normalizeAssignmentPrincipal(exact(value, ["tenant_id", "user_id", "entra_subject_id"]));
    if (bound.tenant_id !== tenantId) throw failure("INTERNAL_INSTALLATION_BINDING_MISMATCH", 403);
    return bound;
  };
  const tx = (callback, readOnly = false, allowNoGrant = false) => withPostgresTransaction(pool, {
    tenant_id: tenantId, isolationLevel: "serializable", readOnly,
  }, callback).catch((error) => {
    if (allowNoGrant && error?.postgres_code === "LIU09") return null;
    throw mapError(error);
  });

  const transition = async (operation, input, { legacy = false, authorize } = {}) => {
    const value = exact(input, ["principal", "request", "signature", "request_id"]);
    const actor = principal(value.principal);
    const request = exact(value.request, ["method", "path", "body", "installation_id",
      "idempotency_key", "nonce", "issued_at", "expires_at"]);
    request.body = exact(request.body, legacy && operation === "register"
      ? LEGACY_REGISTER_FIELDS : BODY_FIELDS[operation]);
    const basePath = legacy ? LEGACY_INSTALLATION_PATH : INTERNAL_UNSIGNED_INSTALLATION_PATH;
    const expectedPath = operation === "register" ? basePath
      : `${basePath}/${request.installation_id}/${operation}`;
    if (request.method !== "POST" || request.path !== expectedPath
        || typeof value.request_id !== "string" || !ID.test(value.request_id)
        || (operation === "register" ? request.installation_id !== "NEW"
          : !INSTALLATION_ID.test(request.installation_id ?? ""))) {
      throw failure("INTERNAL_INSTALLATION_REQUEST_INVALID", 400);
    }
    if (legacy && (typeof authorize !== "function" || await authorize(Object.freeze({
      operation, principal: actor, installation_id: request.installation_id,
    })) !== true)) {
      throw failure("INTERNAL_INSTALLATION_NOT_AUTHORIZED", 403);
    }
    return tx(async (client) => {
      const at = (await client.query("SELECT date_trunc('milliseconds',clock_timestamp()) AS now")).rows[0]?.now;
      let publicKey = request.body.device_public_key;
      if (operation !== "register") {
        const keyRow = (await client.query(
          "SELECT lawos_email_dms.read_internal_unsigned_installation_proof_key($1,$2,$3,$4) AS value",
          [tenantId, actor.user_id, actor.entra_subject_id, request.installation_id],
        )).rows[0]?.value;
        if (keyRow === null && legacy) return null;
        if (!keyRow) throw failure("INTERNAL_INSTALLATION_NOT_FOUND", 404);
        const proofKey = exact(keyRow, ["device_public_key", "device_key_fingerprint"]);
        publicKey = proofKey.device_public_key;
        if (outlookDesktopPublicKeyFingerprint(publicKey) !== proofKey.device_key_fingerprint) throw failure();
      }
      const proof = verifyOutlookDesktopLifecycleProof({
        request, signature: value.signature, public_key: publicKey, now: at,
      });
      const response = (await client.query(
        "SELECT lawos_email_dms.apply_internal_unsigned_installation($1,$2::jsonb) AS value",
        [tenantId, JSON.stringify({
          operation, principal: { user_id: actor.user_id, entra_subject_id: actor.entra_subject_id },
          request_id: value.request_id, installation_id: request.installation_id, body: request.body,
          verified: {
            idempotency_key: proof.idempotency_key, nonce_hash: proof.nonce_hash,
            request_fingerprint: proof.request_fingerprint, issued_at: proof.issued_at,
            expires_at: proof.expires_at, device_key_fingerprint: proof.public_key_fingerprint,
          },
        })],
      )).rows[0]?.value;
      if (!response || ![200, 201].includes(response.response_status) || !response.body?.installation) throw failure();
      const installation = response.body.installation;
      return { ...response, body: { ...response.body, installation: {
        ...installation,
        lease_expires_at: databaseTimestamp(installation.lease_expires_at),
        retired_at: installation.retired_at === null ? null : databaseTimestamp(installation.retired_at),
      } } };
    }, false, legacy && operation === "register");
  };

  const current = (actor, adoptionId, requestSha256) => tx(async (client) => {
    const snapshot = (await client.query(
      "SELECT lawos_email_dms.read_current_internal_unsigned_installation($1,$2,$3) AS value",
      [tenantId, actor.user_id, actor.entra_subject_id],
    )).rows[0]?.value ?? null;
    if (snapshot === null) return null;
    const value = exact(snapshot, ["installation", "expires_at"]);
    const installation = exact(value.installation, INTERNAL_UNSIGNED_INSTALLATION_ATTESTATION_FIELDS);
    if (installation.tenant_id !== tenantId) throw failure("INTERNAL_INSTALLATION_BINDING_MISMATCH", 403);
    installation.authority_snapshot_at = databaseTimestamp(installation.authority_snapshot_at);
    installation.lease_expires_at = databaseTimestamp(installation.lease_expires_at);
    return validateInternalUnsignedInstallationAttestationDocument({
      schema_version: INTERNAL_UNSIGNED_INSTALLATION_ATTESTATION_SCHEMA,
      adoption_id: adoptionId, request_sha256: requestSha256,
      generated_at: installation.authority_snapshot_at,
      expires_at: databaseTimestamp(value.expires_at), installation,
    });
  }, true);

  return Object.freeze({
    authority: "postgres-internal-unsigned-installation-authority",
    configured: true,
    register: (input) => transition("register", input),
    heartbeat: (input) => transition("heartbeat", input),
    retire: (input) => transition("retire", input),
    registerLegacy: (input, { authorize } = {}) => transition("register", input, { legacy: true, authorize }),
    heartbeatLegacy: (input, { authorize } = {}) => transition("heartbeat", input, { legacy: true, authorize }),
    retireLegacy: (input, { authorize } = {}) => transition("retire", input, { legacy: true, authorize }),
    async readTrustedCurrent(input) {
      const actor = principal(exact(input, ["principal"]).principal);
      const requestSha = createHash("sha256").update(JSON.stringify(actor)).digest("hex");
      const result = await current(actor, "internal-installation-trusted-current-read", requestSha);
      if (result === null) return null;
      return Object.freeze(Object.fromEntries([
        "installation_id", "status", "state_version", "lease_expires_at",
        "retired_at", "release_trusted", "authority_snapshot_at",
      ].map((field) => [field, result.installation[field]])));
    },
    async attest(input) {
      const value = exact(input, ["principal", "adoption_id", "request_sha256", "installation_id"]);
      const actor = principal(value.principal);
      if (typeof value.adoption_id !== "string" || !ID.test(value.adoption_id)
          || typeof value.request_sha256 !== "string" || !SHA256.test(value.request_sha256)
          || typeof value.installation_id !== "string" || !INSTALLATION_ID.test(value.installation_id)) {
        throw failure("INTERNAL_INSTALLATION_REQUEST_INVALID", 400);
      }
      const result = await current(actor, value.adoption_id, value.request_sha256);
      if (result === null || result.installation.installation_id !== value.installation_id) {
        throw failure("INTERNAL_INSTALLATION_TRUSTED_CURRENT_REQUIRED", 403);
      }
      return signAttestation(result);
    },
  });
}
