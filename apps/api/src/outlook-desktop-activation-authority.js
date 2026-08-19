import { isDeepStrictEqual, types } from "node:util";

import {
  createOutlookDesktopActivationContract,
} from "../../../packages/email-dms/src/outlook-desktop-activation-contract.js";
import {
  validateDevice,
  validatePrincipal,
} from "../../../packages/email-dms/src/outlook-desktop-activation-bindings.js";
import {
  validateActivationRequest,
  validateIssuedChallenge,
  outlookDesktopActivationIssuedChallengeSha256,
} from "../../../packages/email-dms/src/outlook-desktop-activation-challenge.js";
import {
  verifyActivationOperatorReceipt,
} from "../../../packages/email-dms/src/outlook-desktop-activation-operator-receipt.js";
import {
  canonicalBytes,
  deepFreeze,
  sha256,
} from "../../../packages/email-dms/src/outlook-desktop-activation-primitives.js";
import {
  BINDING_KEYS,
  OUTLOOK_DESKTOP_OPERATOR_RECEIPT_MAX_BYTES,
  PRINCIPAL_KEYS,
  REQUEST_KEYS,
} from "../../../packages/email-dms/src/outlook-desktop-activation-schema.js";
import {
  validateActivationRegistryTrust,
  verifyActivationReleaseTicket,
} from "../../../packages/email-dms/src/outlook-desktop-activation-release.js";
import {
  OUTLOOK_DESKTOP_RELEASE_TICKET_MAX_BYTES,
} from "../../../packages/email-dms/src/outlook-desktop-release-ticket-verifier.js";
import {
  createOutlookDesktopActivationIssueAuthorityLoadRequestFingerprintSha256,
  normalizeOutlookDesktopActivationReservation as normalizeCoreActivationReservation,
} from "../../../packages/email-dms/src/outlook-desktop-assignment-contract.js";
import {
  assertPostgresOutlookDesktopActivationControlAuthority,
  createPostgresOutlookDesktopActivationControlAuthority,
} from "../../../packages/email-dms/src/postgres-outlook-desktop-activation-control-authority.js";
import {
  verifyProductionTrustedRegistry,
} from "../../../packages/runtime-auth/src/external-release-trust.js";
import {
  ACTIVATION_AUTHORITY_ACTIVATION_ID as ACTIVATION_ID,
  ACTIVATION_AUTHORITY_INSTALLATION_ID as INSTALLATION_ID,
  ACTIVATION_AUTHORITY_MAX_PUBLIC_RESPONSE_BYTES as MAX_PUBLIC_RESPONSE_BYTES,
  ACTIVATION_AUTHORITY_SHA256 as SHA256,
  activationAuthorityDigest as digest,
  activationAuthorityFailure as fail,
  activationAuthorityText as text,
  assertOutlookDesktopActivationReservation,
  assertOutlookDesktopActivationReservationProofBinding,
  canonicalActivationAuthorityBase64 as canonicalBase64,
  createOutlookDesktopActivationReservationTask15Input as reservationTask15Input,
  exactActivationAuthorityBuffer as exactBuffer,
  exactActivationAuthorityData as exactData,
  exactActivationAuthorityUtcTimestamp as exactUtcTimestamp,
  isActivationAuthorityRecord as isRecord,
  normalizeOutlookDesktopActivationReservation as normalizeReservation,
  OutlookDesktopActivationAuthorityError,
  sameActivationAuthorityBytes as sameBytes,
  storedActivationAuthorityResponseText as storedResponseText,
  zeroOutlookDesktopActivationReservationBytes as zeroReservationBytes,
} from "./outlook-desktop-activation-authority-reservation.js";

export {
  assertOutlookDesktopActivationReservation,
  assertOutlookDesktopActivationReservationProofBinding,
  OutlookDesktopActivationAuthorityError,
} from "./outlook-desktop-activation-authority-reservation.js";

export const OUTLOOK_DESKTOP_ACTIVATION_AUTHORITY_ACTION =
  "lawos-outlook-desktop-activation-authority";
export const OUTLOOK_DESKTOP_ACTIVATION_AUTHORITY_EVENT_SCHEMA =
  "lawos.outlook-desktop-activation-authority-event.v1";
export const OUTLOOK_DESKTOP_ACTIVATION_AUTHORITY_RESULT_SCHEMA =
  "lawos.outlook-desktop-activation-authority-result.v1";
export const OUTLOOK_DESKTOP_ACTIVATION_CONTROL_PORT_SCHEMA =
  "law-firm-os.outlook-desktop-activation-control-port.v1";
export const OUTLOOK_DESKTOP_OPERATOR_PACKET_EVIDENCE_VERIFIER_SCHEMA =
  "law-firm-os.outlook-desktop-operator-packet-evidence-verifier.v1";
export const OUTLOOK_DESKTOP_ACTIVATION_CONTROL_PORT_SAFE_ERRORS = Object.freeze({
  OUTLOOK_DESKTOP_ACTIVATION_REFERENCE_EXPIRED: Object.freeze({
    safe_error_code: "OUTLOOK_DESKTOP_ACTIVATION_EXPIRED",
    status: 409,
  }),
  OUTLOOK_DESKTOP_ACTIVATION_REFERENCE_MISMATCH: Object.freeze({
    safe_error_code: "OUTLOOK_DESKTOP_ACTIVATION_REFERENCE_INVALID",
    status: 403,
  }),
  OUTLOOK_DESKTOP_ACTIVATION_REPLAY_CONFLICT: Object.freeze({
    safe_error_code: "OUTLOOK_DESKTOP_ACTIVATION_REPLAY_CONFLICT",
    status: 409,
  }),
});
export const OUTLOOK_DESKTOP_ACTIVATION_AUTHORITY_ENABLED_ENV =
  "LAWOS_OUTLOOK_DESKTOP_ACTIVATION_AUTHORITY_ENABLED";
export const OUTLOOK_DESKTOP_ACTIVATION_CONTROL_DATABASE_SECRET_ID_ENV =
  "LAWOS_OUTLOOK_CONTROL_DATABASE_SECRET_ID";
export const OUTLOOK_DESKTOP_ACTIVATION_TENANT_CONTEXT_SECRET_ID_ENV =
  "LAWOS_POSTGRES_TENANT_CONTEXT_SECRET_ID";

const CONTROL_DATABASE_SECRET_ID =
  "/lawos/production/postgres/outlook-control-operator";
const TENANT_CONTEXT_SECRET_ID =
  "/lawos/production/postgres/tenant-context";
const MAX_DIRECT_REQUEST_BYTES = 256 * 1_024;
const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/u;
const ISSUE_REQUEST_ID = /^oar_[A-Za-z0-9_-]{20,128}$/u;
const REGISTRATION_EVENT_ID = /^oae_[a-f0-9]{32}$/u;
const HOST = /^[a-z0-9](?:[a-z0-9.-]{0,251}[a-z0-9])?$/u;
const DATABASE = /^[A-Za-z_][A-Za-z0-9_]{0,62}$/u;

const OPTION_KEYS = Object.freeze([
  "activation_contract",
  "clock",
  "control_port",
  "env",
  "event",
  "invocation_context",
  "lifecycle_transition_fingerprint",
  "resolve_authenticated_principal",
  "verify_lifecycle_proof",
  "verify_operator_measurement",
  "verify_task15_historical",
]);
const CONTROL_PORT_KEYS = Object.freeze([
  "schema_version",
  "loadCurrentIssueAuthority",
  "issueActivationChallenge",
  "loadActivationReservation",
  "attachActivationEvidence",
  "authorizeActivation",
  "readActivationProofSeed",
]);
const CONTROL_PORT_METHOD_KEYS = Object.freeze(CONTROL_PORT_KEYS.slice(1));
const CONTROL_PORT_DEPENDENCY_KEYS = Object.freeze([
  ...CONTROL_PORT_METHOD_KEYS,
  "operator_packet_evidence_verifier",
]);
const CONTROL_PORT_INSTANCES = new WeakSet();
const CONTROL_PORT_PACKET_VERIFIERS = new WeakMap();
const POSTGRES_CONTROL_PORT_DEPENDENCY_KEYS = Object.freeze([
  "app_pool", "control_pool", "tenant_id",
]);
const OPERATOR_PACKET_EVIDENCE_VERIFIER_KEYS = Object.freeze([
  "schema_version", "verifyOperatorPacketEvidence",
]);
const OPERATOR_PACKET_EVIDENCE_VERIFIER_DEPENDENCY_KEYS = Object.freeze([
  "loadOperatorReceiptAuthority",
]);
const OPERATOR_PACKET_EVIDENCE_VERIFIER_INSTANCES = new WeakSet();
const VERIFIED_OPERATOR_PACKET_EVIDENCE_OWNERS = new WeakMap();
const OPERATOR_RECEIPT_AUTHORITY_KEYS = Object.freeze([
  "challenge", "request", "release", "registryTrust",
]);
const NORMALIZED_OPERATOR_CHALLENGE_KEYS = Object.freeze([
  "activationBindingSha256", "expiresAt", "issuedAt", "nonceSha256",
]);
const NORMALIZED_OPERATOR_REQUEST_KEYS = Object.freeze(["bindings"]);
const NORMALIZED_OPERATOR_RELEASE_KEYS = Object.freeze([
  "expiresAt", "key", "ticket",
]);
const OWNER_OPERATOR_PACKET_DOMAIN =
  "lawos.outlook-desktop-owner-operator-packet.v1";
const ENVIRONMENT_KEYS = Object.freeze([
  "AWS_REGION",
  OUTLOOK_DESKTOP_ACTIVATION_CONTROL_DATABASE_SECRET_ID_ENV,
  OUTLOOK_DESKTOP_ACTIVATION_TENANT_CONTEXT_SECRET_ID_ENV,
  "LAWOS_DATABASE_HOST",
  "LAWOS_DATABASE_PORT",
  "LAWOS_DATABASE_NAME",
  "LAWOS_POSTGRES_SSL_MODE",
  "NODE_EXTRA_CA_CERTS",
  "LAWOS_PERSISTENCE_AUTHORITY",
]);
const FORBIDDEN_ALIASES = Object.freeze([
  "DATABASE_URL",
  "LAWOS_DATABASE_URL",
  "LAWOS_DATABASE_URL_SECRET_ID",
  "LAWOS_POSTGRES_URL",
  "LAWOS_POSTGRES_URL_SECRET_ID",
  "LAWOS_AWS_REGION",
  "LAWOS_OUTLOOK_CONTROL_DATABASE_SECRET_ARN",
  "LAWOS_POSTGRES_TENANT_CONTEXT_SECRET_ARN",
  "LAWOS_POSTGRES_TENANT_CONTEXT_SECRET",
  "LAWOS_TENANT_CONTEXT_SECRET_ID",
  "LAWOS_OUTLOOK_ASSIGNMENT_DATABASE_SECRET_ID",
  "LAWOS_OUTLOOK_LIFECYCLE_VERIFIER_DATABASE_SECRET_ID",
  "PGHOST",
  "PGPORT",
  "PGDATABASE",
  "PGUSER",
  "PGPASSWORD",
]);
const OUTER_EVENT_KEYS = Object.freeze([
  "schema_version", "action", "operation", "request",
]);
const ISSUE_REQUEST_KEYS = Object.freeze([
  "candidate_device", "issue_request_id",
]);
const REFERENCE_REQUEST_KEYS = Object.freeze(["activation_reference"]);
const FINALIZE_REQUEST_KEYS = Object.freeze([
  "activation_reference", "raw_request_body_base64", "proof", "proof_signature_base64",
]);
const ISSUE_PUBLIC_PACKAGE_KEYS = Object.freeze([
  "activation_reference", "installation_id", "issue_request_id", "issued_challenge",
  "issued_challenge_sha256", "registration_event_id",
  "release_authority", "schema_version",
]);
const ISSUE_RECEIPT_KEYS = Object.freeze([
  "outcome", "tenant_id", "activation_reference", "installation_id",
  "issue_request_id", "registration_event_id", "release_artifact_id",
  "release_authority_sha256",
  "challenge_nonce_sha256", "issued_challenge", "issued_challenge_base64",
  "issued_challenge_sha256", "issued_at", "valid_until",
]);
const RELEASE_AUTHORITY_KEYS = Object.freeze([
  "release_artifact_id", "release_authority_sha256",
  "release_ticket_bytes_sha256", "release_ticket_owner_signature_sha256",
  "authority_binding_sha256", "valid_until",
]);
const VERIFIED_OPERATOR_PACKET_KEYS = Object.freeze([
  "activation_reference", "authenticated_principal",
  "local_measurement_evidence_sha256", "operator_receipt_bytes",
  "operator_receipt_signature_bytes", "owner_operator_packet_sha256", "request_id",
]);
const ATTACH_CORE_REQUEST_KEYS = Object.freeze([
  "activation_reference", "activation_replay_identity", "installation_id",
  "issued_challenge_sha256", "local_measurement_evidence_sha256",
  "operator_receipt_base64", "operator_receipt_sha256",
  "operator_signature_base64", "operator_signature_sha256", "request_id",
]);
const ATTACH_PORT_INPUT_KEYS = Object.freeze([
  "core_request", "operator_packet_evidence",
]);
const ATTACH_PORT_RESULT_KEYS = Object.freeze([
  "core_result", "owner_operator_packet_sha256", "evidence_receipt_sha256",
]);
const ATTACH_RESULT_KEYS = Object.freeze([
  "status", "tenant_id", "activation_reference", "installation_id",
  "issued_challenge_sha256", "activation_receipt_sha256",
  "local_measurement_evidence_sha256", "attached_at", "valid_until",
]);
const AUTHORIZATION_RESULT_KEYS = Object.freeze([
  "outcome", "tenant_id", "activation_reference", "installation_id",
  "authorization_binding_sha256", "activation_receipt_sha256",
  "activation_authorization_receipt_sha256",
  "release_authority_sha256", "release_artifact_id", "authorized_at", "valid_until",
]);
const FINAL_PUBLIC_PACKAGE_KEYS = Object.freeze([
  "activation_receipt", "activation_reference", "installation_id",
  "release_authority", "schema_version",
]);

function optionalData(value, keys, code) {
  if (!isRecord(value)) fail(code);
  const present = keys.filter((key) => Object.hasOwn(value, key));
  return exactData(value, present, code);
}

function ownDataValue(value, key, code) {
  let descriptor;
  try {
    if (!isRecord(value)) fail(code);
    descriptor = Object.getOwnPropertyDescriptor(value, key);
  } catch (error) {
    if (error instanceof OutlookDesktopActivationAuthorityError) throw error;
    fail(code);
  }
  if (!descriptor || !("value" in descriptor)) fail(code);
  return descriptor.value;
}

function transferredIssueAuthorityBuffer(value, key) {
  try {
    if (!isRecord(value)) return undefined;
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    return descriptor && "value" in descriptor && Buffer.isBuffer(descriptor.value)
      ? descriptor.value
      : undefined;
  } catch {
    return undefined;
  }
}

function dataOption(options, key, fallback) {
  let descriptor;
  try {
    descriptor = Object.getOwnPropertyDescriptor(options, key);
  } catch {
    fail("OUTLOOK_ACTIVATION_AUTHORITY_OPTIONS_INVALID");
  }
  if (!descriptor) return fallback;
  if (!("value" in descriptor)) fail("OUTLOOK_ACTIVATION_AUTHORITY_OPTIONS_INVALID");
  return descriptor.value;
}

function identifier(value, code) {
  const result = text(value, code, 200);
  if (!IDENTIFIER.test(result)) fail(code);
  return result;
}

function canonicalDigest(domain, value) {
  const bytes = canonicalBytes({ domain, ...value });
  try {
    return sha256(bytes);
  } finally {
    zeroOperatorPacketBytes(bytes);
  }
}

function parseCanonicalResponse(bytes, code) {
  let owned;
  let expected;
  let completed = false;
  try {
    owned = exactBuffer(bytes, {
      code,
      maxBytes: MAX_PUBLIC_RESPONSE_BYTES,
    });
    let value;
    value = JSON.parse(owned.toString("utf8"));
    if (!isRecord(value)) fail(code);
    expected = canonicalBytes(value);
    if (!sameBytes(owned, expected)) fail(code);
    completed = true;
    return { bytes: owned, value };
  } catch (error) {
    if (error instanceof OutlookDesktopActivationAuthorityError) throw error;
    fail(code);
  } finally {
    zeroOperatorPacketBytes(expected);
    if (!completed) zeroOperatorPacketBytes(owned);
  }
}

function readEnabledFlag(env) {
  try {
    if (!env || typeof env !== "object" || types.isProxy(env)) return undefined;
    const descriptor = Object.getOwnPropertyDescriptor(
      env,
      OUTLOOK_DESKTOP_ACTIVATION_AUTHORITY_ENABLED_ENV,
    );
    return descriptor && "value" in descriptor ? descriptor.value : undefined;
  } catch {
    return undefined;
  }
}

export function snapshotOutlookDesktopActivationAuthorityEnvironment(env) {
  const code = "OUTLOOK_ACTIVATION_AUTHORITY_ENVIRONMENT_INVALID";
  if (!env || typeof env !== "object" || Array.isArray(env)
      || types.isProxy(env)) fail(code);
  let descriptors;
  try {
    descriptors = Object.getOwnPropertyDescriptors(env);
  } catch {
    fail(code);
  }
  const snapshot = (key) => {
    const descriptor = descriptors[key];
    if (descriptor && !("value" in descriptor)) fail(code);
    return descriptor?.value;
  };
  const values = Object.fromEntries(ENVIRONMENT_KEYS.map((key) => [key, snapshot(key)]));
  const aliases = FORBIDDEN_ALIASES.map(snapshot);
  if (aliases.some((value) => value !== undefined && value !== null
      && (typeof value !== "string" || value.trim() !== ""))) fail(code);
  const portText = text(values.LAWOS_DATABASE_PORT, code, 5);
  const port = Number(portText);
  const host = text(values.LAWOS_DATABASE_HOST, code, 253);
  const databaseName = text(values.LAWOS_DATABASE_NAME, code, 63);
  if (values.AWS_REGION !== "ap-northeast-2"
      || values[OUTLOOK_DESKTOP_ACTIVATION_CONTROL_DATABASE_SECRET_ID_ENV]
        !== CONTROL_DATABASE_SECRET_ID
      || values[OUTLOOK_DESKTOP_ACTIVATION_TENANT_CONTEXT_SECRET_ID_ENV]
        !== TENANT_CONTEXT_SECRET_ID
      || values.LAWOS_POSTGRES_SSL_MODE !== "verify-full"
      || values.NODE_EXTRA_CA_CERTS !== "/var/task/certs/global-bundle.pem"
      || values.LAWOS_PERSISTENCE_AUTHORITY !== "postgres-v2"
      || !Number.isSafeInteger(port) || port < 1 || port > 65_535
      || String(port) !== portText
      || !HOST.test(host) || !host.includes(".")
      || host.split(".").some((label) => label.length < 1 || label.length > 63
        || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/u.test(label))
      || !DATABASE.test(databaseName)) {
    fail(code);
  }
  return Object.freeze({
    region: values.AWS_REGION,
    database_secret_id: CONTROL_DATABASE_SECRET_ID,
    tenant_context_secret_id: TENANT_CONTEXT_SECRET_ID,
    host,
    port,
    database_name: databaseName,
    ssl_mode: "verify-full",
    ca_path: "/var/task/certs/global-bundle.pem",
    persistence_authority: "postgres-v2",
  });
}

export function assertOutlookDesktopOperatorPacketEvidenceVerifier(value) {
  try {
    if (!OPERATOR_PACKET_EVIDENCE_VERIFIER_INSTANCES.has(value)
        || !Object.isFrozen(value)) {
      fail("OUTLOOK_ACTIVATION_AUTHORITY_OPERATOR_PACKET_VERIFIER_INVALID");
    }
  } catch (error) {
    if (error instanceof OutlookDesktopActivationAuthorityError) throw error;
    fail("OUTLOOK_ACTIVATION_AUTHORITY_OPERATOR_PACKET_VERIFIER_INVALID");
  }
  const verifier = exactData(
    value,
    OPERATOR_PACKET_EVIDENCE_VERIFIER_KEYS,
    "OUTLOOK_ACTIVATION_AUTHORITY_OPERATOR_PACKET_VERIFIER_INVALID",
  );
  if (verifier.schema_version
      !== OUTLOOK_DESKTOP_OPERATOR_PACKET_EVIDENCE_VERIFIER_SCHEMA
      || typeof verifier.verifyOperatorPacketEvidence !== "function") {
    fail("OUTLOOK_ACTIVATION_AUTHORITY_OPERATOR_PACKET_VERIFIER_INVALID");
  }
  return value;
}

function frozenNormalizedOperatorObject(value, keys, code) {
  const normalized = exactData(value, keys, code);
  if (!Object.isFrozen(value)) fail(code);
  return Object.freeze(normalized);
}

function assertFrozenOperatorDataTree(value, code) {
  const pending = [value];
  const visited = new WeakSet();
  let visitedCount = 0;
  while (pending.length > 0) {
    const current = pending.pop();
    if (current === null || typeof current !== "object") continue;
    if (types.isProxy(current)) fail(code);
    if (Buffer.isBuffer(current)) continue;
    if ((!Array.isArray(current) && !isRecord(current))
        || !Object.isFrozen(current)
        || visited.has(current)) {
      if (visited.has(current)) continue;
      fail(code);
    }
    visited.add(current);
    if (++visitedCount > 2_000) fail(code);
    let descriptors;
    try {
      descriptors = Object.getOwnPropertyDescriptors(current);
    } catch {
      fail(code);
    }
    const keys = Reflect.ownKeys(descriptors);
    if (keys.some((key) => typeof key !== "string"
        || !("value" in descriptors[key]))) fail(code);
    for (const key of keys) pending.push(descriptors[key].value);
  }
}

function normalizedOperatorReceiptAuthority(value) {
  const code = "OUTLOOK_ACTIVATION_AUTHORITY_OPERATOR_RECEIPT_AUTHORITY_INVALID";
  const authority = frozenNormalizedOperatorObject(
    value,
    OPERATOR_RECEIPT_AUTHORITY_KEYS,
    code,
  );
  const challenge = frozenNormalizedOperatorObject(
    authority.challenge,
    NORMALIZED_OPERATOR_CHALLENGE_KEYS,
    code,
  );
  const request = frozenNormalizedOperatorObject(
    authority.request,
    NORMALIZED_OPERATOR_REQUEST_KEYS,
    code,
  );
  const release = frozenNormalizedOperatorObject(
    authority.release,
    NORMALIZED_OPERATOR_RELEASE_KEYS,
    code,
  );
  const registryTrust = authority.registryTrust;
  if (!isRecord(registryTrust) || !Object.isFrozen(registryTrust)) fail(code);
  const requestBindings = frozenNormalizedOperatorObject(
    request.bindings,
    BINDING_KEYS,
    code,
  );
  frozenNormalizedOperatorObject(
    requestBindings.authenticated_principal,
    PRINCIPAL_KEYS,
    code,
  );
  for (const normalized of [
    authority.challenge,
    authority.request,
    authority.release,
    registryTrust,
  ]) assertFrozenOperatorDataTree(normalized, code);
  if (![release.key, release.ticket, registryTrust.registry]
    .every((item) => isRecord(item) && Object.isFrozen(item))
      || !Array.isArray(registryTrust.registry.keys)
      || types.isProxy(registryTrust.registry.keys)
      || !Object.isFrozen(registryTrust.registry.keys)
      || !SHA256.test(challenge.activationBindingSha256 ?? "")
      || !SHA256.test(challenge.nonceSha256 ?? "")
      || !SHA256.test(registryTrust.sha256 ?? "")
      || !Number.isSafeInteger(challenge.expiresAt)
      || !Number.isSafeInteger(challenge.issuedAt)
      || !Number.isSafeInteger(release.expiresAt)) {
    fail(code);
  }
  return Object.freeze({ challenge, request, release, registryTrust });
}

function operatorPacketRawBytes(value) {
  let receiptBytes;
  let signatureBytes;
  try {
    if (isRecord(value)) {
      const descriptors = Object.getOwnPropertyDescriptors(value);
      if ("value" in (descriptors.operator_receipt_bytes ?? {})) {
        receiptBytes = descriptors.operator_receipt_bytes.value;
      }
      if ("value" in (descriptors.operator_receipt_signature_bytes ?? {})) {
        signatureBytes = descriptors.operator_receipt_signature_bytes.value;
      }
    }
  } catch {
    // The closed-shape validator owns the failure; only data properties are wiped.
  }
  return { receiptBytes, signatureBytes };
}

function ownOperatorPacketEvidence(value) {
  const code = "OUTLOOK_ACTIVATION_AUTHORITY_OPERATOR_PACKET_INVALID";
  const raw = operatorPacketRawBytes(value);
  let ownedReceipt;
  let ownedSignature;
  let completed = false;
  try {
    const packet = exactData(value, VERIFIED_OPERATOR_PACKET_KEYS, code);
    let principal;
    try {
      principal = validatePrincipal(exactData(
        packet.authenticated_principal,
        PRINCIPAL_KEYS,
        code,
      ));
    } catch {
      fail(code, 401);
    }
    if (typeof packet.activation_reference !== "string"
        || !ACTIVATION_ID.test(packet.activation_reference)
        || typeof packet.request_id !== "string"
        || !ISSUE_REQUEST_ID.test(packet.request_id)) {
      fail(code, 401);
    }
    ownedReceipt = exactBuffer(packet.operator_receipt_bytes, {
      code,
      maxBytes: OUTLOOK_DESKTOP_OPERATOR_RECEIPT_MAX_BYTES,
    });
    ownedSignature = exactBuffer(packet.operator_receipt_signature_bytes, {
      code,
      minBytes: 64,
      maxBytes: 64,
    });
    const result = Object.freeze({
      activation_reference: packet.activation_reference,
      authenticated_principal: Object.freeze(principal),
      local_measurement_evidence_sha256: digest(
        packet.local_measurement_evidence_sha256,
        code,
      ),
      operator_receipt_bytes: ownedReceipt,
      operator_receipt_signature_bytes: ownedSignature,
      owner_operator_packet_sha256: digest(packet.owner_operator_packet_sha256, code),
      request_id: packet.request_id,
    });
    completed = true;
    return result;
  } finally {
    zeroOperatorPacketBytes(raw.receiptBytes);
    zeroOperatorPacketBytes(raw.signatureBytes);
    if (!completed) {
      zeroOperatorPacketBytes(ownedReceipt);
      zeroOperatorPacketBytes(ownedSignature);
    }
  }
}

function ownerOperatorPacketSha256(packet, verifiedReceipt) {
  return canonicalDigest(OWNER_OPERATOR_PACKET_DOMAIN, {
    activation_reference: packet.activation_reference,
    authenticated_principal: packet.authenticated_principal,
    local_measurement_evidence_sha256: packet.local_measurement_evidence_sha256,
    operator_receipt_sha256: verifiedReceipt.receiptSha256,
    operator_signature_sha256: verifiedReceipt.signatureSha256,
    request_id: packet.request_id,
  });
}

function brandVerifiedOperatorPacketEvidence(value, verifier) {
  if (!Object.isFrozen(value)) {
    fail("OUTLOOK_ACTIVATION_AUTHORITY_OPERATOR_PACKET_INVALID", 401);
  }
  VERIFIED_OPERATOR_PACKET_EVIDENCE_OWNERS.set(value, verifier);
  return value;
}

function assertVerifiedOperatorPacketEvidence(value, verifier) {
  try {
    if (VERIFIED_OPERATOR_PACKET_EVIDENCE_OWNERS.get(value) !== verifier
        || !Object.isFrozen(value)) {
      fail("OUTLOOK_ACTIVATION_AUTHORITY_OPERATOR_PACKET_INVALID", 401);
    }
  } catch (error) {
    if (error instanceof OutlookDesktopActivationAuthorityError) throw error;
    fail("OUTLOOK_ACTIVATION_AUTHORITY_OPERATOR_PACKET_INVALID", 401);
  }
  exactData(
    value,
    VERIFIED_OPERATOR_PACKET_KEYS,
    "OUTLOOK_ACTIVATION_AUTHORITY_OPERATOR_PACKET_INVALID",
  );
  return value;
}

export function createOutlookDesktopOperatorPacketEvidenceVerifier(dependencies) {
  const bindings = exactData(
    dependencies,
    OPERATOR_PACKET_EVIDENCE_VERIFIER_DEPENDENCY_KEYS,
    "OUTLOOK_ACTIVATION_AUTHORITY_OPERATOR_PACKET_VERIFIER_INVALID",
  );
  if (typeof bindings.loadOperatorReceiptAuthority !== "function") {
    fail("OUTLOOK_ACTIVATION_AUTHORITY_OPERATOR_PACKET_VERIFIER_INVALID");
  }
  const result = Object.freeze({
    schema_version: OUTLOOK_DESKTOP_OPERATOR_PACKET_EVIDENCE_VERIFIER_SCHEMA,
    async verifyOperatorPacketEvidence(input) {
      const packet = ownOperatorPacketEvidence(input);
      let completed = false;
      try {
        let authority;
        try {
          authority = normalizedOperatorReceiptAuthority(
            await bindings.loadOperatorReceiptAuthority(Object.freeze({
              activation_reference: packet.activation_reference,
              authenticated_principal: packet.authenticated_principal,
              request_id: packet.request_id,
            })),
          );
        } catch {
          fail("OUTLOOK_ACTIVATION_AUTHORITY_OPERATOR_PACKET_INVALID", 401);
        }
        if (authority.request.bindings.activation_id !== packet.activation_reference
            || !isDeepStrictEqual(
              authority.request.bindings.authenticated_principal,
              packet.authenticated_principal,
            )
            || authority.request.bindings.local_measurement_evidence_sha256
              !== packet.local_measurement_evidence_sha256) {
          fail("OUTLOOK_ACTIVATION_AUTHORITY_OPERATOR_PACKET_INVALID", 401);
        }
        let verifiedReceipt;
        try {
          verifiedReceipt = verifyActivationOperatorReceipt({
            receiptBytes: packet.operator_receipt_bytes,
            signatureBytes: packet.operator_receipt_signature_bytes,
            challenge: authority.challenge,
            request: authority.request,
            release: authority.release,
            registryTrust: authority.registryTrust,
            now: runtimeTime(Date.now),
          });
        } catch {
          fail("OUTLOOK_ACTIVATION_AUTHORITY_OPERATOR_PACKET_INVALID", 401);
        }
        const computedOwnerPacketSha256 = ownerOperatorPacketSha256(
          packet,
          verifiedReceipt,
        );
        if (packet.owner_operator_packet_sha256 !== computedOwnerPacketSha256) {
          fail("OUTLOOK_ACTIVATION_AUTHORITY_OPERATOR_PACKET_INVALID", 401);
        }
        const verifiedPacket = brandVerifiedOperatorPacketEvidence(Object.freeze({
          ...packet,
          owner_operator_packet_sha256: computedOwnerPacketSha256,
        }), result);
        completed = true;
        return verifiedPacket;
      } finally {
        if (!completed) {
          zeroOperatorPacketBytes(packet.operator_receipt_bytes);
          zeroOperatorPacketBytes(packet.operator_receipt_signature_bytes);
        }
      }
    },
  });
  OPERATOR_PACKET_EVIDENCE_VERIFIER_INSTANCES.add(result);
  return result;
}

export function assertOutlookDesktopActivationControlPort(value) {
  let packetVerifier;
  try {
    if (!CONTROL_PORT_INSTANCES.has(value) || !Object.isFrozen(value)) {
      fail("OUTLOOK_ACTIVATION_AUTHORITY_PORT_INVALID");
    }
    packetVerifier = CONTROL_PORT_PACKET_VERIFIERS.get(value);
  } catch (error) {
    if (error instanceof OutlookDesktopActivationAuthorityError) throw error;
    fail("OUTLOOK_ACTIVATION_AUTHORITY_PORT_INVALID");
  }
  const port = exactData(value, CONTROL_PORT_KEYS, "OUTLOOK_ACTIVATION_AUTHORITY_PORT_INVALID");
  if (port.schema_version !== OUTLOOK_DESKTOP_ACTIVATION_CONTROL_PORT_SCHEMA
      || CONTROL_PORT_METHOD_KEYS
        .some((key) => typeof port[key] !== "function")) {
    fail("OUTLOOK_ACTIVATION_AUTHORITY_PORT_INVALID");
  }
  try {
    assertOutlookDesktopOperatorPacketEvidenceVerifier(packetVerifier);
  } catch {
    fail("OUTLOOK_ACTIVATION_AUTHORITY_PORT_INVALID");
  }
  return value;
}

export function createOutlookDesktopActivationControlPort(dependencies) {
  const bindings = exactData(
    dependencies,
    CONTROL_PORT_DEPENDENCY_KEYS,
    "OUTLOOK_ACTIVATION_AUTHORITY_PORT_INVALID",
  );
  if (CONTROL_PORT_METHOD_KEYS.some((key) => typeof bindings[key] !== "function")) {
    fail("OUTLOOK_ACTIVATION_AUTHORITY_PORT_INVALID");
  }
  let packetVerifier;
  try {
    packetVerifier = assertOutlookDesktopOperatorPacketEvidenceVerifier(
      bindings.operator_packet_evidence_verifier,
    );
  } catch {
    fail("OUTLOOK_ACTIVATION_AUTHORITY_PORT_INVALID");
  }
  const port = Object.freeze({
    schema_version: OUTLOOK_DESKTOP_ACTIVATION_CONTROL_PORT_SCHEMA,
    loadCurrentIssueAuthority: bindings.loadCurrentIssueAuthority,
    issueActivationChallenge: bindings.issueActivationChallenge,
    loadActivationReservation: bindings.loadActivationReservation,
    async attachActivationEvidence(input) {
      const envelope = exactData(
        input,
        ATTACH_PORT_INPUT_KEYS,
        "OUTLOOK_ACTIVATION_AUTHORITY_ATTACHMENT_REQUEST_INVALID",
      );
      assertVerifiedOperatorPacketEvidence(
        envelope.operator_packet_evidence,
        packetVerifier,
      );
      return bindings.attachActivationEvidence(Object.freeze(envelope));
    },
    authorizeActivation: bindings.authorizeActivation,
    readActivationProofSeed: bindings.readActivationProofSeed,
  });
  CONTROL_PORT_INSTANCES.add(port);
  CONTROL_PORT_PACKET_VERIFIERS.set(port, packetVerifier);
  return port;
}

function activationRequestForOperatorAuthority(challenge) {
  return Object.fromEntries(REQUEST_KEYS.map((key) => [key, challenge[key]]));
}

async function loadOperatorReceiptAuthority(coreAuthority, input) {
  const code = "OUTLOOK_ACTIVATION_AUTHORITY_OPERATOR_RECEIPT_AUTHORITY_INVALID";
  const request = exactData(input, [
    "activation_reference", "authenticated_principal", "request_id",
  ], code);
  let principal;
  try {
    principal = validatePrincipal(request.authenticated_principal);
  } catch {
    fail(code, 401);
  }
  if (!ACTIVATION_ID.test(request.activation_reference ?? "")
      || !ISSUE_REQUEST_ID.test(request.request_id ?? "")) fail(code, 401);
  const reservation = normalizeCoreActivationReservation(
    await coreAuthority.loadActivationReservation(Object.freeze({
      activation_reference: request.activation_reference,
    })),
  );
  if (reservation.activation_reference !== request.activation_reference
      || reservation.issue_request_id !== request.request_id
      || reservation.tenant_id !== principal.lawos_tenant_id
      || reservation.user_id !== principal.lawos_user_id
      || reservation.entra_subject_id !== principal.entra_subject) {
    fail(code, 401);
  }
  const now = runtimeTime(Date.now);
  let ticketBytes;
  let signatureBytes;
  try {
    ticketBytes = canonicalBase64(reservation.release_ticket_base64, {
      code,
      maxBytes: OUTLOOK_DESKTOP_RELEASE_TICKET_MAX_BYTES,
    });
    signatureBytes = canonicalBase64(
      reservation.release_ticket_signature_base64,
      { code, minBytes: 64, maxBytes: 64 },
    );
    const challenge = Object.freeze(validateIssuedChallenge(
      reservation.issued_challenge,
      now,
    ));
    const activationRequest = Object.freeze(validateActivationRequest(
      activationRequestForOperatorAuthority(reservation.issued_challenge),
      challenge,
    ));
    const registryTrust = verifyProductionTrustedRegistry();
    validateActivationRegistryTrust(
      registryTrust,
      activationRequest.bindings.approved_release,
    );
    const release = Object.freeze(verifyActivationReleaseTicket({
      approvedRelease: activationRequest.bindings.approved_release,
      challengeExpiresAt: challenge.expiresAt,
      now,
      principal: activationRequest.bindings.authenticated_principal,
      registryTrust,
      signatureBytes,
      ticketBytes,
    }));
    return Object.freeze({ challenge, request: activationRequest, release, registryTrust });
  } catch (error) {
    if (error instanceof OutlookDesktopActivationAuthorityError) throw error;
    fail(code, 401);
  } finally {
    zeroOperatorPacketBytes(ticketBytes);
    zeroOperatorPacketBytes(signatureBytes);
  }
}

export function createPostgresOutlookDesktopActivationControlPort(dependencies) {
  const options = exactData(
    dependencies,
    POSTGRES_CONTROL_PORT_DEPENDENCY_KEYS,
    "OUTLOOK_ACTIVATION_AUTHORITY_PORT_INVALID",
  );
  let coreAuthority;
  const packetVerifier = createOutlookDesktopOperatorPacketEvidenceVerifier({
    loadOperatorReceiptAuthority: (input) => (
      loadOperatorReceiptAuthority(coreAuthority, input)
    ),
  });
  try {
    coreAuthority = assertPostgresOutlookDesktopActivationControlAuthority(
      createPostgresOutlookDesktopActivationControlAuthority({
        app_pool: options.app_pool,
        assert_operator_packet_evidence: (value) => (
          assertVerifiedOperatorPacketEvidence(value, packetVerifier)
        ),
        control_pool: options.control_pool,
        tenant_id: options.tenant_id,
      }),
    );
  } catch {
    fail("OUTLOOK_ACTIVATION_AUTHORITY_PORT_INVALID");
  }
  return createOutlookDesktopActivationControlPort({
    loadCurrentIssueAuthority: coreAuthority.loadCurrentIssueAuthority,
    issueActivationChallenge: coreAuthority.issueActivationChallenge,
    loadActivationReservation: coreAuthority.loadActivationReservation,
    attachActivationEvidence: coreAuthority.attachActivationEvidence,
    authorizeActivation: coreAuthority.authorizeActivation,
    readActivationProofSeed: coreAuthority.readActivationProofSeed,
    operator_packet_evidence_verifier: packetVerifier,
  });
}

function outerEvent(value, ownRequestBytes) {
  const code = "OUTLOOK_ACTIVATION_AUTHORITY_EVENT_INVALID";
  let keys;
  try {
    keys = isRecord(value) ? Reflect.ownKeys(Object.getOwnPropertyDescriptors(value)) : [];
  } catch {
    fail(code, 400);
  }
  if (["requestContext", "rawPath", "httpMethod"]
    .some((key) => keys.includes(key))) {
    fail("OUTLOOK_ACTIVATION_AUTHORITY_DIRECT_INVOKE_REQUIRED", 400);
  }
  const event = exactData(value, OUTER_EVENT_KEYS, code);
  if (event.schema_version !== OUTLOOK_DESKTOP_ACTIVATION_AUTHORITY_EVENT_SCHEMA
      || event.action !== OUTLOOK_DESKTOP_ACTIVATION_AUTHORITY_ACTION
      || ![
        "issue", "attach_operator_evidence", "read_proof_seed", "finalize",
      ].includes(event.operation)
      || !isRecord(event.request)) {
    fail(code, 400);
  }
  if (event.operation !== "attach_operator_evidence") {
    let requestBytes;
    try {
      requestBytes = canonicalBytes(event.request);
      ownRequestBytes(requestBytes);
    } catch {
      fail(code, 400);
    }
    if (requestBytes.byteLength > MAX_DIRECT_REQUEST_BYTES) fail(code, 400);
  }
  return event;
}

function activationReference(value, code = "OUTLOOK_ACTIVATION_AUTHORITY_REFERENCE_INVALID") {
  if (typeof value !== "string" || !ACTIVATION_ID.test(value)) fail(code, 400);
  return value;
}

function releaseAuthority(value) {
  const code = "OUTLOOK_ACTIVATION_AUTHORITY_RELEASE_INVALID";
  const authority = exactData(value, RELEASE_AUTHORITY_KEYS, code);
  identifier(authority.release_artifact_id, code);
  for (const field of [
    "release_authority_sha256", "release_ticket_bytes_sha256",
    "release_ticket_owner_signature_sha256", "authority_binding_sha256",
  ]) digest(authority[field], code);
  exactUtcTimestamp(authority.valid_until, code);
  return Object.freeze({ ...authority });
}

function issueRequest(value) {
  const code = "OUTLOOK_ACTIVATION_AUTHORITY_ISSUE_REQUEST_INVALID";
  const request = exactData(value, ISSUE_REQUEST_KEYS, code);
  let device;
  try {
    device = validateDevice(request.candidate_device);
  } catch {
    fail(code, 400);
  }
  if (typeof request.issue_request_id !== "string"
      || !ISSUE_REQUEST_ID.test(request.issue_request_id)) fail(code, 400);
  return Object.freeze({
    candidate_device: Object.freeze(device),
    issue_request_id: request.issue_request_id,
  });
}

function referenceRequest(value) {
  const request = exactData(
    value,
    REFERENCE_REQUEST_KEYS,
    "OUTLOOK_ACTIVATION_AUTHORITY_REFERENCE_REQUEST_INVALID",
  );
  return Object.freeze({
    activation_reference: (() => {
      return activationReference(
        request.activation_reference,
        "OUTLOOK_ACTIVATION_AUTHORITY_REFERENCE_REQUEST_INVALID",
      );
    })(),
  });
}

function finalizeRequest(value) {
  const code = "OUTLOOK_ACTIVATION_AUTHORITY_FINALIZE_REQUEST_INVALID";
  const request = exactData(value, FINALIZE_REQUEST_KEYS, code);
  if (!isRecord(request.proof)) fail(code, 400);
  let proof;
  let proofBytes;
  try {
    const descriptors = Object.getOwnPropertyDescriptors(request.proof);
    const keys = Reflect.ownKeys(descriptors);
    if (keys.some((key) => typeof key !== "string"
        || !("value" in descriptors[key]))) fail(code, 400);
    proof = deepFreeze(Object.fromEntries(
      keys.map((key) => [key, descriptors[key].value]),
    ));
    proofBytes = canonicalBytes(proof);
    if (proofBytes.byteLength < 1 || proofBytes.byteLength > 64 * 1_024) {
      fail(code, 400);
    }
  } catch {
    fail(code, 400);
  } finally {
    zeroOperatorPacketBytes(proofBytes);
  }
  const normalizedActivationReference = activationReference(
    request.activation_reference,
    code,
  );
  let rawRequestBody;
  let proofSignatureBytes;
  let returned = false;
  try {
    rawRequestBody = canonicalBase64(request.raw_request_body_base64, {
      code,
      maxBytes: 64 * 1_024,
    });
    proofSignatureBytes = canonicalBase64(request.proof_signature_base64, {
      code,
      minBytes: 64,
      maxBytes: 64,
    });
    const normalized = Object.freeze({
      activation_reference: normalizedActivationReference,
      proof,
      proof_signature_base64: request.proof_signature_base64,
      raw_request_body: rawRequestBody,
      raw_request_body_base64: request.raw_request_body_base64,
    });
    returned = true;
    return normalized;
  } finally {
    zeroOperatorPacketBytes(proofSignatureBytes);
    if (!returned) zeroOperatorPacketBytes(rawRequestBody);
  }
}

function assertFinalizeRouteBinding(request, reservation) {
  const proof = request.proof;
  if (proof.challenge_id !== reservation.activation_reference
      || proof.installation_id !== reservation.installation_id
      || proof.request_id !== reservation.issue_request_id
      || proof.idempotency_key !== reservation.issue_request_id
      || proof.event_id !== reservation.registration_event_id) {
    fail("OUTLOOK_ACTIVATION_AUTHORITY_DEVICE_PROOF_BINDING_MISMATCH", 401);
  }
}

async function verifyLifecycleProof(verifier, request) {
  if (typeof verifier !== "function") {
    fail("OUTLOOK_ACTIVATION_AUTHORITY_DEVICE_PROOF_VERIFIER_INVALID");
  }
  let verified;
  try {
    verified = await verifier(Object.freeze({
      proof: request.proof,
      proofSignatureBase64: request.proof_signature_base64,
      rawRequestBody: request.raw_request_body,
    }));
  } catch {
    fail("OUTLOOK_ACTIVATION_AUTHORITY_DEVICE_PROOF_INVALID", 401);
  }
  if (!isRecord(verified)) {
    fail("OUTLOOK_ACTIVATION_AUTHORITY_DEVICE_PROOF_INVALID", 401);
  }
  return verified;
}

function validateAuthorizationResult(value, {
  binding,
  reservationAuthority,
}) {
  const code = "OUTLOOK_ACTIVATION_AUTHORITY_AUTHORIZATION_RESULT_INVALID";
  const result = exactData(value, AUTHORIZATION_RESULT_KEYS, code);
  const reservation = reservationAuthority.reservation;
  if (result.outcome !== "authorized"
      || result.tenant_id !== reservation.tenant_id
      || result.activation_reference !== reservation.activation_reference
      || result.installation_id !== reservation.installation_id
      || result.release_authority_sha256 !== reservation.release_authority_sha256
      || result.release_artifact_id !== reservation.release_artifact_id
      || !SHA256.test(result.authorization_binding_sha256 ?? "")
      || result.activation_receipt_sha256 !== reservation.activation_receipt_sha256
      || !SHA256.test(result.activation_authorization_receipt_sha256 ?? "")
      || result.activation_authorization_receipt_sha256
        === result.activation_receipt_sha256
      || (reservationAuthority.mode === "exact_replay"
        && result.activation_authorization_receipt_sha256
          !== reservation.activation_authorization_receipt_sha256)
      || result.valid_until !== binding.authorization.proof_expires_at) {
    fail(code);
  }
  exactUtcTimestamp(result.authorized_at, code);
  exactUtcTimestamp(result.valid_until, code);
  let bytes;
  let completed = false;
  try {
    bytes = canonicalBytes(result);
    if (reservationAuthority.mode === "exact_replay") {
      let stored;
      try {
        stored = storedResponseText(
          reservation.authorization_response_text,
          "OUTLOOK_ACTIVATION_AUTHORITY_REPLAY_STATE_INVALID",
        );
        if (!sameBytes(bytes, stored.canonical)) {
          fail("OUTLOOK_ACTIVATION_AUTHORITY_REPLAY_IDENTITY_MISMATCH", 409);
        }
      } finally {
        zeroOperatorPacketBytes(stored?.canonical);
      }
    }
    completed = true;
    return Object.freeze({ bytes, value: Object.freeze(result) });
  } finally {
    if (!completed) zeroOperatorPacketBytes(bytes);
  }
}

function finalPublicPackage(authorizationResult, reservationAuthority) {
  const value = exactData({
    activation_receipt: authorizationResult.value,
    activation_reference: reservationAuthority.activation_reference,
    installation_id: reservationAuthority.installation_id,
    release_authority: reservationAuthority.release_authority,
    schema_version: OUTLOOK_DESKTOP_ACTIVATION_AUTHORITY_RESULT_SCHEMA,
  }, FINAL_PUBLIC_PACKAGE_KEYS, "OUTLOOK_ACTIVATION_AUTHORITY_RESPONSE_INVALID");
  const bytes = canonicalBytes(value);
  if (bytes.byteLength > MAX_PUBLIC_RESPONSE_BYTES) {
    zeroOperatorPacketBytes(bytes);
    fail("OUTLOOK_ACTIVATION_AUTHORITY_RESPONSE_INVALID");
  }
  return bytes;
}

function runtimeTime(clock) {
  if (typeof clock !== "function") {
    fail("OUTLOOK_ACTIVATION_AUTHORITY_CLOCK_INVALID");
  }
  let value;
  try {
    value = clock();
  } catch {
    fail("OUTLOOK_ACTIVATION_AUTHORITY_CLOCK_INVALID");
  }
  if (!Number.isSafeInteger(value) || value < 0) {
    fail("OUTLOOK_ACTIVATION_AUTHORITY_CLOCK_INVALID");
  }
  return value;
}

async function finalize({
  activationContract,
  clock,
  historicalVerifier,
  invocationContext,
  lifecycleFingerprint,
  lifecycleVerifier,
  measurementVerifier,
  port,
  principalResolver,
  request: input,
}) {
  const request = finalizeRequest(input);
  let authorizationResult;
  try {
    const principal = await resolvePrincipal(
      principalResolver,
      "finalize",
      invocationContext,
    );
    const rawReservation = await callPort(port.loadActivationReservation, Object.freeze({
      activation_reference: request.activation_reference,
    }));
    const reservationAuthority = await assertOutlookDesktopActivationReservation({
      activation_contract: activationContract,
      historical_verifier: historicalVerifier,
      reservation: rawReservation,
    });
    const reservation = reservationAuthority.reservation;
    if (reservation.tenant_id !== principal.lawos_tenant_id
        || reservation.user_id !== principal.lawos_user_id
        || reservation.entra_subject_id !== principal.entra_subject) {
      fail("OUTLOOK_ACTIVATION_AUTHORITY_RESERVATION_BINDING_MISMATCH", 409);
    }
    assertFinalizeRouteBinding(request, reservation);
    const verifiedProof = await verifyLifecycleProof(lifecycleVerifier, request);
    if (typeof lifecycleFingerprint !== "function") {
      fail("OUTLOOK_ACTIVATION_AUTHORITY_DEVICE_PROOF_FINGERPRINT_INVALID");
    }
    let proofFingerprintSha256;
    try {
      proofFingerprintSha256 = lifecycleFingerprint(request.proof);
    } catch {
      fail("OUTLOOK_ACTIVATION_AUTHORITY_DEVICE_PROOF_FINGERPRINT_INVALID", 401);
    }
    const binding = assertOutlookDesktopActivationReservationProofBinding({
      current_time: runtimeTime(clock),
      proof: request.proof,
      proof_fingerprint_sha256: proofFingerprintSha256,
      reservation_authority: reservationAuthority,
      verified_proof: verifiedProof,
    });
    await verifyOperatorMeasurement(
      measurementVerifier,
      reservationAuthority.verified_activation.bindings.approved_release,
      reservationAuthority.local_measurement_evidence_sha256,
    );
    const result = await callPort(port.authorizeActivation, binding.authorization);
    authorizationResult = validateAuthorizationResult(result, {
      binding,
      reservationAuthority,
    });
    return finalPublicPackage(authorizationResult, reservationAuthority);
  } finally {
    zeroOperatorPacketBytes(authorizationResult?.bytes);
    zeroOperatorPacketBytes(request.raw_request_body);
  }
}

function zeroOperatorPacketBytes(value) {
  try {
    if (Buffer.isBuffer(value)) value.fill(0);
  } catch {
    // A failed wipe cannot be allowed to replace the protected boundary result.
  }
}

async function verifiedOperatorPacket(verifier, request) {
  assertOutlookDesktopOperatorPacketEvidenceVerifier(verifier);
  let value;
  try {
    value = await verifier.verifyOperatorPacketEvidence(request);
    assertVerifiedOperatorPacketEvidence(value, verifier);
  } catch {
    fail("OUTLOOK_ACTIVATION_AUTHORITY_OPERATOR_PACKET_INVALID", 401);
  }
  let rawReceipt;
  let rawSignature;
  try {
    if (isRecord(value)) {
      const descriptors = Object.getOwnPropertyDescriptors(value);
      if ("value" in (descriptors.operator_receipt_bytes ?? {})) {
        rawReceipt = descriptors.operator_receipt_bytes.value;
      }
      if ("value" in (descriptors.operator_receipt_signature_bytes ?? {})) {
        rawSignature = descriptors.operator_receipt_signature_bytes.value;
      }
    }
  } catch {
    // The exact closed-shape validator below owns the failure outcome.
  }
  let ownedReceipt;
  let ownedSignature;
  let completed = false;
  try {
    const packet = exactData(
      value,
      VERIFIED_OPERATOR_PACKET_KEYS,
      "OUTLOOK_ACTIVATION_AUTHORITY_OPERATOR_PACKET_INVALID",
    );
    let principal;
    try {
      principal = validatePrincipal(packet.authenticated_principal);
    } catch {
      fail("OUTLOOK_ACTIVATION_AUTHORITY_OPERATOR_PACKET_INVALID", 401);
    }
    ownedReceipt = exactBuffer(packet.operator_receipt_bytes, {
      code: "OUTLOOK_ACTIVATION_AUTHORITY_OPERATOR_PACKET_INVALID",
      maxBytes: OUTLOOK_DESKTOP_OPERATOR_RECEIPT_MAX_BYTES,
    });
    ownedSignature = exactBuffer(
      packet.operator_receipt_signature_bytes,
      {
        code: "OUTLOOK_ACTIVATION_AUTHORITY_OPERATOR_PACKET_INVALID",
        minBytes: 64,
        maxBytes: 64,
      },
    );
    const result = brandVerifiedOperatorPacketEvidence(Object.freeze({
      activation_reference: activationReference(packet.activation_reference),
      authenticated_principal: Object.freeze(principal),
      local_measurement_evidence_sha256: digest(
        packet.local_measurement_evidence_sha256,
        "OUTLOOK_ACTIVATION_AUTHORITY_OPERATOR_PACKET_INVALID",
      ),
      operator_receipt_bytes: ownedReceipt,
      operator_receipt_signature_bytes: ownedSignature,
      owner_operator_packet_sha256: digest(
        packet.owner_operator_packet_sha256,
        "OUTLOOK_ACTIVATION_AUTHORITY_OPERATOR_PACKET_INVALID",
      ),
      request_id: (() => {
        if (!ISSUE_REQUEST_ID.test(packet.request_id ?? "")) {
          fail("OUTLOOK_ACTIVATION_AUTHORITY_OPERATOR_PACKET_INVALID", 401);
        }
        return packet.request_id;
      })(),
    }), verifier);
    completed = true;
    return result;
  } finally {
    zeroOperatorPacketBytes(rawReceipt);
    zeroOperatorPacketBytes(rawSignature);
    if (!completed) {
      zeroOperatorPacketBytes(ownedReceipt);
      zeroOperatorPacketBytes(ownedSignature);
    }
  }
}

async function verifyOperatorMeasurement(verifier, approvedRelease, expectedDigest) {
  if (typeof verifier !== "function") {
    fail("OUTLOOK_ACTIVATION_AUTHORITY_MEASUREMENT_VERIFIER_INVALID");
  }
  let value;
  try {
    value = await verifier(Object.freeze({
      approved_release: approvedRelease,
      expected_sha256: expectedDigest,
    }));
  } catch {
    fail("OUTLOOK_ACTIVATION_AUTHORITY_MEASUREMENT_INVALID", 401);
  }
  const result = exactData(
    value,
    ["local_measurement_evidence_sha256"],
    "OUTLOOK_ACTIVATION_AUTHORITY_MEASUREMENT_INVALID",
  );
  if (digest(result.local_measurement_evidence_sha256,
    "OUTLOOK_ACTIVATION_AUTHORITY_MEASUREMENT_INVALID") !== expectedDigest) {
    fail("OUTLOOK_ACTIVATION_AUTHORITY_MEASUREMENT_INVALID", 401);
  }
  return expectedDigest;
}

function validateAttachResult(value, {
  expectedReceiptSha256,
  packet,
  reservation,
}) {
  const code = "OUTLOOK_ACTIVATION_AUTHORITY_ATTACHMENT_RESULT_INVALID";
  const result = exactData(value, ATTACH_RESULT_KEYS, code);
  const attachedAt = Date.parse(exactUtcTimestamp(result.attached_at, code));
  if (result.status !== "evidence_attached"
      || result.tenant_id !== reservation.tenant_id
      || result.activation_reference !== packet.activation_reference
      || result.installation_id !== reservation.installation_id
      || result.issued_challenge_sha256 !== reservation.issued_challenge_sha256
      || result.activation_receipt_sha256 !== expectedReceiptSha256
      || result.local_measurement_evidence_sha256
        !== packet.local_measurement_evidence_sha256
      || result.valid_until !== reservation.valid_until
      || attachedAt < Date.parse(reservation.issued_at)
      || attachedAt >= Date.parse(reservation.valid_until)) {
    fail(code);
  }
  let bytes;
  let completed = false;
  try {
    bytes = canonicalBytes(result);
    if (reservation.state === "evidence_attached") {
      let stored;
      try {
        stored = storedResponseText(
          reservation.attachment_response_text,
          "OUTLOOK_ACTIVATION_AUTHORITY_REPLAY_STATE_INVALID",
        );
        if (!sameBytes(bytes, stored.canonical)) {
          fail("OUTLOOK_ACTIVATION_AUTHORITY_REPLAY_IDENTITY_MISMATCH", 409);
        }
      } finally {
        zeroOperatorPacketBytes(stored?.canonical);
      }
    }
    completed = true;
    return bytes;
  } finally {
    if (!completed) zeroOperatorPacketBytes(bytes);
  }
}

function validateAttachPortResult(value, {
  expectedReceiptSha256,
  packet,
  reservation,
}) {
  const code = "OUTLOOK_ACTIVATION_AUTHORITY_ATTACHMENT_RESULT_INVALID";
  const envelope = exactData(value, ATTACH_PORT_RESULT_KEYS, code);
  if (digest(envelope.owner_operator_packet_sha256, code)
      !== packet.owner_operator_packet_sha256) {
    fail(code);
  }
  digest(envelope.evidence_receipt_sha256, code);
  return validateAttachResult(envelope.core_result, {
    expectedReceiptSha256,
    packet,
    reservation,
  });
}

async function attachOperatorEvidence({
  activationContract,
  measurementVerifier,
  port,
  request,
}) {
  const packetVerifier = CONTROL_PORT_PACKET_VERIFIERS.get(port);
  const packet = await verifiedOperatorPacket(packetVerifier, request);
  let reservation;
  try {
    const rawReservation = await callPort(port.loadActivationReservation, Object.freeze({
      activation_reference: packet.activation_reference,
    }));
    reservation = normalizeReservation(rawReservation);
    if (!["issued", "evidence_attached"].includes(reservation.state)
        || reservation.tenant_id !== packet.authenticated_principal.lawos_tenant_id
        || reservation.user_id !== packet.authenticated_principal.lawos_user_id
        || reservation.entra_subject_id !== packet.authenticated_principal.entra_subject
        || reservation.issue_request_id !== packet.request_id) {
      fail("OUTLOOK_ACTIVATION_AUTHORITY_RESERVATION_BINDING_MISMATCH", 409);
    }
    let verifiedActivation;
    try {
      verifiedActivation = await activationContract.verifyOperatorActivation(
        reservationTask15Input(reservation, packet),
      );
    } catch {
      fail("OUTLOOK_ACTIVATION_AUTHORITY_EVIDENCE_INVALID", 401);
    }
    const expectedReceiptSha = sha256(packet.operator_receipt_bytes);
    const expectedSignatureSha = sha256(packet.operator_receipt_signature_bytes);
    if (verifiedActivation?.operator?.receipt_sha256 !== expectedReceiptSha
        || verifiedActivation?.operator?.receipt_signature_sha256 !== expectedSignatureSha
        || verifiedActivation?.bindings?.local_measurement_evidence_sha256
          !== packet.local_measurement_evidence_sha256
        || verifiedActivation?.operator?.local_measurement_evidence_sha256
          !== packet.local_measurement_evidence_sha256) {
      fail("OUTLOOK_ACTIVATION_AUTHORITY_EVIDENCE_INVALID", 401);
    }
    await verifyOperatorMeasurement(
      measurementVerifier,
      verifiedActivation.bindings.approved_release,
      packet.local_measurement_evidence_sha256,
    );
    if (reservation.state === "evidence_attached"
        && (reservation.operator_receipt_sha256 !== expectedReceiptSha
          || reservation.operator_signature_sha256 !== expectedSignatureSha
          || reservation.local_measurement_evidence_sha256
            !== packet.local_measurement_evidence_sha256
          || !isDeepStrictEqual(
            reservation.activation_replay_identity,
            verifiedActivation.single_use_consumption,
          ))) {
      fail("OUTLOOK_ACTIVATION_AUTHORITY_REPLAY_CONFLICT", 409);
    }
    const coreRequest = Object.freeze(exactData({
      activation_reference: packet.activation_reference,
      activation_replay_identity: verifiedActivation.single_use_consumption,
      installation_id: reservation.installation_id,
      issued_challenge_sha256: reservation.issued_challenge_sha256,
      local_measurement_evidence_sha256: packet.local_measurement_evidence_sha256,
      operator_receipt_base64: packet.operator_receipt_bytes.toString("base64"),
      operator_receipt_sha256: expectedReceiptSha,
      operator_signature_base64: packet.operator_receipt_signature_bytes.toString("base64"),
      operator_signature_sha256: expectedSignatureSha,
      request_id: packet.request_id,
    }, ATTACH_CORE_REQUEST_KEYS, "OUTLOOK_ACTIVATION_AUTHORITY_ATTACHMENT_REQUEST_INVALID"));
    const result = await callPort(port.attachActivationEvidence, Object.freeze(exactData({
      core_request: coreRequest,
      operator_packet_evidence: packet,
    }, ATTACH_PORT_INPUT_KEYS, "OUTLOOK_ACTIVATION_AUTHORITY_ATTACHMENT_REQUEST_INVALID")));
    return validateAttachPortResult(result, {
      expectedReceiptSha256: expectedReceiptSha,
      packet,
      reservation,
    });
  } finally {
    zeroReservationBytes(reservation);
    zeroOperatorPacketBytes(packet.operator_receipt_bytes);
    zeroOperatorPacketBytes(packet.operator_receipt_signature_bytes);
  }
}

async function resolvePrincipal(resolver, operation, invocationContext) {
  if (typeof resolver !== "function") {
    fail("OUTLOOK_ACTIVATION_AUTHORITY_PRINCIPAL_RESOLVER_INVALID");
  }
  let value;
  try {
    value = await resolver(Object.freeze({
      operation,
      invocation_context: invocationContext,
    }));
    return Object.freeze(validatePrincipal(value));
  } catch (error) {
    if (error instanceof OutlookDesktopActivationAuthorityError) throw error;
    fail("OUTLOOK_ACTIVATION_AUTHORITY_PRINCIPAL_INVALID", 401);
  }
}

function issueFingerprint({ principal, request }) {
  return createOutlookDesktopActivationIssueAuthorityLoadRequestFingerprintSha256({
    authenticated_principal: principal,
    candidate_device: request.candidate_device,
    issue_request_id: request.issue_request_id,
    tenant_id: principal.lawos_tenant_id,
  });
}

function task15IssuedChallengeSha256(challenge, code) {
  try {
    return outlookDesktopActivationIssuedChallengeSha256(challenge);
  } catch {
    fail(code);
  }
}

function issuePublicPackage({
  authority,
  challenge,
  installation_id: installationIdValue,
  issue_request_id: issueRequestId,
  registration_event_id: registrationEventId,
}) {
  const activation_reference = activationReference(challenge.activation_id);
  if (!INSTALLATION_ID.test(installationIdValue)) {
    fail("OUTLOOK_ACTIVATION_AUTHORITY_REFERENCE_INVALID");
  }
  if (typeof issueRequestId !== "string" || !ISSUE_REQUEST_ID.test(issueRequestId)) {
    fail("OUTLOOK_ACTIVATION_AUTHORITY_ISSUE_REQUEST_INVALID");
  }
  if (typeof registrationEventId !== "string"
      || !REGISTRATION_EVENT_ID.test(registrationEventId)) {
    fail("OUTLOOK_ACTIVATION_AUTHORITY_ISSUE_RESULT_INVALID");
  }
  const challengeSha256 = task15IssuedChallengeSha256(
    challenge,
    "OUTLOOK_ACTIVATION_AUTHORITY_RESPONSE_INVALID",
  );
  const value = {
    activation_reference,
    installation_id: installationIdValue,
    issue_request_id: issueRequestId,
    issued_challenge: challenge,
    issued_challenge_sha256: challengeSha256,
    registration_event_id: registrationEventId,
    release_authority: authority,
    schema_version: OUTLOOK_DESKTOP_ACTIVATION_AUTHORITY_RESULT_SCHEMA,
  };
  const bytes = canonicalBytes(value);
  if (bytes.byteLength > MAX_PUBLIC_RESPONSE_BYTES) {
    zeroOperatorPacketBytes(bytes);
    fail("OUTLOOK_ACTIVATION_AUTHORITY_RESPONSE_INVALID");
  }
  return { bytes, value, activation_reference };
}

function validateIssueReceipt(value, {
  authority,
  challenge,
  issueRequestId,
  principal,
}) {
  const code = "OUTLOOK_ACTIVATION_AUTHORITY_ISSUE_RESULT_INVALID";
  const receipt = exactData(value, ISSUE_RECEIPT_KEYS, code);
  let issuedChallengeBase64;
  let challengeBytes;
  try {
    issuedChallengeBase64 = canonicalBase64(receipt.issued_challenge_base64, {
      code,
      maxBytes: 64 * 1_024,
    });
    challengeBytes = canonicalBytes(challenge);
    const challengeSha256 = task15IssuedChallengeSha256(challenge, code);
    if (receipt.outcome !== "issued"
        || receipt.tenant_id !== principal.lawos_tenant_id
        || receipt.activation_reference !== challenge.activation_id
        || !INSTALLATION_ID.test(receipt.installation_id ?? "")
        || receipt.issue_request_id !== issueRequestId
        || !REGISTRATION_EVENT_ID.test(receipt.registration_event_id ?? "")
        || receipt.release_artifact_id !== authority.release_artifact_id
        || receipt.release_authority_sha256 !== authority.release_authority_sha256
        || receipt.challenge_nonce_sha256 !== challenge.challenge_nonce_sha256
        || !isDeepStrictEqual(receipt.issued_challenge, challenge)
        || !sameBytes(issuedChallengeBase64, challengeBytes)
        || receipt.issued_challenge_sha256 !== challengeSha256
        || receipt.issued_at !== challenge.issued_at
        || receipt.valid_until !== challenge.expires_at) {
      fail(code);
    }
    return Object.freeze(receipt);
  } catch (error) {
    if (error instanceof OutlookDesktopActivationAuthorityError) throw error;
    fail(code);
  } finally {
    zeroOperatorPacketBytes(issuedChallengeBase64);
    zeroOperatorPacketBytes(challengeBytes);
  }
}

function validateIssuePublicPackage(bytes, {
  expected = null,
  expectedFingerprint,
  expectedIssueRequestId = null,
  returnedFingerprint,
} = {}) {
  if (returnedFingerprint !== expectedFingerprint) {
    fail("OUTLOOK_ACTIVATION_AUTHORITY_PORT_RESULT_INVALID");
  }
  let parsed;
  let completed = false;
  try {
    parsed = parseCanonicalResponse(
      bytes,
      "OUTLOOK_ACTIVATION_AUTHORITY_RESPONSE_INVALID",
    );
    const value = exactData(
      parsed.value,
      ISSUE_PUBLIC_PACKAGE_KEYS,
      "OUTLOOK_ACTIVATION_AUTHORITY_RESPONSE_INVALID",
    );
    if (value.schema_version !== OUTLOOK_DESKTOP_ACTIVATION_AUTHORITY_RESULT_SCHEMA) {
      fail("OUTLOOK_ACTIVATION_AUTHORITY_RESPONSE_INVALID");
    }
    const reference = activationReference(value.activation_reference);
    if (!INSTALLATION_ID.test(value.installation_id)) {
      fail("OUTLOOK_ACTIVATION_AUTHORITY_RESPONSE_INVALID");
    }
    if (typeof value.issue_request_id !== "string"
        || !ISSUE_REQUEST_ID.test(value.issue_request_id)
        || (expectedIssueRequestId !== null
          && value.issue_request_id !== expectedIssueRequestId)) {
      fail("OUTLOOK_ACTIVATION_AUTHORITY_RESPONSE_INVALID");
    }
    if (!REGISTRATION_EVENT_ID.test(value.registration_event_id ?? "")) {
      fail("OUTLOOK_ACTIVATION_AUTHORITY_RESPONSE_INVALID");
    }
    const authority = releaseAuthority(value.release_authority);
    const challengeSha256 = task15IssuedChallengeSha256(
      value.issued_challenge,
      "OUTLOOK_ACTIVATION_AUTHORITY_RESPONSE_INVALID",
    );
    if (!isRecord(value.issued_challenge)
        || value.issued_challenge.activation_id !== reference
        || value.issued_challenge_sha256 !== challengeSha256
        || value.issued_challenge.approved_release?.release_artifact_id
          !== authority.release_artifact_id
        || (expected && (!sameBytes(parsed.bytes, expected.bytes)
          || !isDeepStrictEqual(value, expected.value)))) {
      fail("OUTLOOK_ACTIVATION_AUTHORITY_RESPONSE_INVALID");
    }
    completed = true;
    return parsed.bytes;
  } finally {
    if (!completed) zeroOperatorPacketBytes(parsed?.bytes);
  }
}

function issueAuthorityResult(value, fingerprint, issueRequestId) {
  const code = "OUTLOOK_ACTIVATION_AUTHORITY_PORT_RESULT_INVALID";
  const transferredResponseBytes = transferredIssueAuthorityBuffer(
    value,
    "response_bytes",
  );
  const transferredReleaseTicketBytes = transferredIssueAuthorityBuffer(
    value,
    "release_ticket_bytes",
  );
  const transferredReleaseTicketSignatureBytes = transferredIssueAuthorityBuffer(
    value,
    "release_ticket_signature_bytes",
  );
  try {
    const outcome = ownDataValue(value, "outcome", code);
    if (typeof outcome !== "string") fail(code);
    if (outcome === "replay") {
      const result = exactData(
        value,
        ["outcome", "request_fingerprint_sha256", "response_bytes"],
        code,
      );
      return {
        outcome: "replay",
        response_bytes: validateIssuePublicPackage(result.response_bytes, {
          expectedFingerprint: fingerprint,
          expectedIssueRequestId: issueRequestId,
          returnedFingerprint: result.request_fingerprint_sha256,
        }),
      };
    }
    if (["conflict", "expired"].includes(outcome)) {
      exactData(value, ["outcome"], code);
      fail(outcome === "conflict"
        ? "OUTLOOK_ACTIVATION_AUTHORITY_REPLAY_CONFLICT"
        : "OUTLOOK_ACTIVATION_AUTHORITY_RESERVATION_EXPIRED", outcome === "conflict" ? 409 : 410);
    }
    const result = exactData(value, [
      "outcome",
      "request_fingerprint_sha256",
      "approved_release",
      "pilot_policy",
      "release_authority",
      "release_ticket_bytes",
      "release_ticket_signature_bytes",
    ], code);
    let releaseTicketBytes;
    let releaseTicketSignatureBytes;
    let completed = false;
    try {
      if (result.outcome !== "ready"
          || result.request_fingerprint_sha256 !== fingerprint) fail(code);
      const authority = releaseAuthority(result.release_authority);
      releaseTicketBytes = exactBuffer(result.release_ticket_bytes, {
        code,
        maxBytes: OUTLOOK_DESKTOP_RELEASE_TICKET_MAX_BYTES,
      });
      releaseTicketSignatureBytes = exactBuffer(result.release_ticket_signature_bytes, {
        code,
        minBytes: 64,
        maxBytes: 64,
      });
      if (result.approved_release?.release_artifact_id !== authority.release_artifact_id
          || result.approved_release?.release_ticket_sha256
            !== authority.release_ticket_bytes_sha256
          || result.approved_release?.release_ticket_signature_sha256
            !== authority.release_ticket_owner_signature_sha256
          || result.approved_release?.valid_until !== authority.valid_until
          || sha256(releaseTicketBytes) !== authority.release_ticket_bytes_sha256
          || sha256(releaseTicketSignatureBytes)
            !== authority.release_ticket_owner_signature_sha256) {
        fail("OUTLOOK_ACTIVATION_AUTHORITY_RELEASE_INVALID");
      }
      const normalized = Object.freeze({
        outcome: "ready",
        approved_release: result.approved_release,
        pilot_policy: result.pilot_policy,
        release_authority: authority,
        release_ticket_bytes: releaseTicketBytes,
        release_ticket_signature_bytes: releaseTicketSignatureBytes,
      });
      completed = true;
      return normalized;
    } finally {
      if (!completed) {
        zeroOperatorPacketBytes(releaseTicketBytes);
        zeroOperatorPacketBytes(releaseTicketSignatureBytes);
      }
    }
  } finally {
    zeroOperatorPacketBytes(transferredResponseBytes);
    zeroOperatorPacketBytes(transferredReleaseTicketBytes);
    zeroOperatorPacketBytes(transferredReleaseTicketSignatureBytes);
  }
}

async function callPort(portMethod, input) {
  try {
    return await portMethod(input);
  } catch (error) {
    if (error instanceof OutlookDesktopActivationAuthorityError) throw error;
    try {
      if (error !== null && typeof error === "object" && !types.isProxy(error)) {
        const descriptors = Object.getOwnPropertyDescriptors(error);
        const safeErrorCode = descriptors.safe_error_code?.value;
        const status = descriptors.status?.value;
        const mapped = typeof safeErrorCode === "string"
          && Object.hasOwn(
            OUTLOOK_DESKTOP_ACTIVATION_CONTROL_PORT_SAFE_ERRORS,
            safeErrorCode,
          )
          ? OUTLOOK_DESKTOP_ACTIVATION_CONTROL_PORT_SAFE_ERRORS[safeErrorCode]
          : undefined;
        if (mapped !== undefined && status === mapped.status) {
          fail(mapped.safe_error_code, mapped.status);
        }
      }
    } catch (mappingError) {
      if (mappingError instanceof OutlookDesktopActivationAuthorityError) {
        throw mappingError;
      }
    }
    fail("OUTLOOK_ACTIVATION_AUTHORITY_PORT_FAILED", 503);
  }
}

async function issue({
  activationContract,
  invocationContext,
  port,
  principalResolver,
  request: input,
}) {
  const request = issueRequest(input);
  const principal = await resolvePrincipal(principalResolver, "issue", invocationContext);
  const fingerprint = issueFingerprint({ principal, request });
  const authority = issueAuthorityResult(await callPort(
    port.loadCurrentIssueAuthority,
    Object.freeze({
      authenticated_principal: principal,
      candidate_device: request.candidate_device,
      issue_request_id: request.issue_request_id,
      request_fingerprint_sha256: fingerprint,
    }),
  ), fingerprint, request.issue_request_id);
  if (authority.outcome === "replay") return authority.response_bytes;
  let challengeBytes;
  try {
    let challenge;
    try {
      challenge = activationContract.issueChallenge({
        approved_release: authority.approved_release,
        authenticated_principal: principal,
        candidate_device: request.candidate_device,
        pilot_policy: authority.pilot_policy,
      });
    } catch {
      fail("OUTLOOK_ACTIVATION_AUTHORITY_CHALLENGE_INVALID");
    }
    if (challenge.approved_release.release_artifact_id
        !== authority.release_authority.release_artifact_id
        || !SHA256.test(challenge.local_measurement_evidence_sha256 ?? "")) {
      fail("OUTLOOK_ACTIVATION_AUTHORITY_RELEASE_INVALID");
    }
    challengeBytes = canonicalBytes(challenge);
    const issuedChallengeSha256 = task15IssuedChallengeSha256(
      challenge,
      "OUTLOOK_ACTIVATION_AUTHORITY_CHALLENGE_INVALID",
    );
    const receipt = validateIssueReceipt(await callPort(
      port.issueActivationChallenge,
      Object.freeze({
        issue_request_id: request.issue_request_id,
        issued_challenge: challenge,
        issued_challenge_base64: challengeBytes.toString("base64"),
        issued_challenge_sha256: issuedChallengeSha256,
        release_ticket_base64: authority.release_ticket_bytes.toString("base64"),
        release_ticket_signature_base64:
          authority.release_ticket_signature_bytes.toString("base64"),
      }),
    ), {
      authority: authority.release_authority,
      challenge,
      issueRequestId: request.issue_request_id,
      principal,
    });
    return issuePublicPackage({
      challenge,
      installation_id: receipt.installation_id,
      issue_request_id: receipt.issue_request_id,
      registration_event_id: receipt.registration_event_id,
      authority: authority.release_authority,
    }).bytes;
  } finally {
    zeroOperatorPacketBytes(challengeBytes);
    zeroOperatorPacketBytes(authority.release_ticket_bytes);
    zeroOperatorPacketBytes(authority.release_ticket_signature_bytes);
  }
}

async function readProofSeed({
  invocationContext,
  port,
  principalResolver,
  request: input,
}) {
  const code = "OUTLOOK_ACTIVATION_AUTHORITY_PROOF_SEED_INVALID";
  const request = referenceRequest(input);
  const principal = await resolvePrincipal(
    principalResolver,
    "read_proof_seed",
    invocationContext,
  );
  const value = await callPort(port.readActivationProofSeed, Object.freeze({
    activation_reference: request.activation_reference,
    authenticated_principal: Object.freeze({
      tenant_id: principal.lawos_tenant_id,
      user_id: principal.lawos_user_id,
      entra_subject_id: principal.entra_subject,
    }),
  }));
  const status = ownDataValue(value, "status", code);
  if (!["pending", "ready"].includes(status)) fail(code);
  const keys = status === "ready"
    ? [
      "status", "activation_reference", "installation_id",
      "activation_receipt_sha256", "local_measurement_evidence_sha256",
      "release_authority_sha256", "issued_challenge_sha256", "valid_until",
      "event_id",
    ]
    : ["status", "activation_reference", "installation_id", "valid_until"];
  const seed = exactData(value, keys, code);
  if (!ACTIVATION_ID.test(seed.activation_reference)
      || !INSTALLATION_ID.test(seed.installation_id)
      || seed.activation_reference !== request.activation_reference) {
    fail(code);
  }
  exactUtcTimestamp(seed.valid_until, code);
  if (seed.status === "ready") {
    for (const key of [
      "activation_receipt_sha256", "local_measurement_evidence_sha256",
      "release_authority_sha256", "issued_challenge_sha256",
    ]) digest(seed[key], code);
    if (!REGISTRATION_EVENT_ID.test(seed.event_id ?? "")) fail(code);
  }
  const bytes = canonicalBytes(seed);
  if (bytes.byteLength > MAX_PUBLIC_RESPONSE_BYTES) {
    zeroOperatorPacketBytes(bytes);
    fail(code);
  }
  return bytes;
}

const DISABLED_RESULT = Object.freeze({
  schema_version: OUTLOOK_DESKTOP_ACTIVATION_AUTHORITY_RESULT_SCHEMA,
  outcome: "DISABLED",
  authority_enabled: false,
});

export async function executeOutlookDesktopActivationAuthority(options = {}) {
  const env = dataOption(options, "env", process.env);
  if (readEnabledFlag(env) !== "true") return DISABLED_RESULT;
  const stableOptions = optionalData(options, OPTION_KEYS, "OUTLOOK_ACTIVATION_AUTHORITY_OPTIONS_INVALID");
  const port = assertOutlookDesktopActivationControlPort(stableOptions.control_port);
  snapshotOutlookDesktopActivationAuthorityEnvironment(env);
  let event;
  let requestBytes;
  try {
    event = outerEvent(stableOptions.event, (bytes) => {
      requestBytes = bytes;
    });
  } finally {
    zeroOperatorPacketBytes(requestBytes);
  }
  const activationContract = stableOptions.activation_contract
    ?? createOutlookDesktopActivationContract();
  if (typeof activationContract?.issueChallenge !== "function"
      || typeof activationContract?.verifyOperatorActivation !== "function") {
    fail("OUTLOOK_ACTIVATION_AUTHORITY_CONTRACT_INVALID");
  }
  if (event.operation === "issue") {
    return issue({
      activationContract,
      invocationContext: stableOptions.invocation_context,
      port,
      principalResolver: stableOptions.resolve_authenticated_principal,
      request: event.request,
    });
  }
  if (event.operation === "read_proof_seed") {
    return readProofSeed({
      invocationContext: stableOptions.invocation_context,
      port,
      principalResolver: stableOptions.resolve_authenticated_principal,
      request: event.request,
    });
  }
  if (event.operation === "attach_operator_evidence") {
    return attachOperatorEvidence({
      activationContract,
      measurementVerifier: stableOptions.verify_operator_measurement,
      port,
      request: event.request,
    });
  }
  return finalize({
    activationContract,
    clock: stableOptions.clock ?? Date.now,
    historicalVerifier: stableOptions.verify_task15_historical,
    invocationContext: stableOptions.invocation_context,
    lifecycleFingerprint: stableOptions.lifecycle_transition_fingerprint,
    lifecycleVerifier: stableOptions.verify_lifecycle_proof,
    measurementVerifier: stableOptions.verify_operator_measurement,
    port,
    principalResolver: stableOptions.resolve_authenticated_principal,
    request: event.request,
  });
}

export const OUTLOOK_DESKTOP_ACTIVATION_AUTHORITY_LIMITS = Object.freeze({
  max_direct_request_bytes: MAX_DIRECT_REQUEST_BYTES,
  max_operator_receipt_bytes: OUTLOOK_DESKTOP_OPERATOR_RECEIPT_MAX_BYTES,
  max_public_response_bytes: MAX_PUBLIC_RESPONSE_BYTES,
  max_release_ticket_bytes: OUTLOOK_DESKTOP_RELEASE_TICKET_MAX_BYTES,
});
