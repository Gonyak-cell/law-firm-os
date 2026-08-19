import {
  createHash,
  createPublicKey,
  sign as signSignature,
  timingSafeEqual,
  verify as verifySignature,
} from "node:crypto";
import { TextDecoder } from "node:util";

import { ACTIVATION_ID } from "./outlook-desktop-activation-schema.js";

export const OUTLOOK_DESKTOP_LIFECYCLE_PROOF_DOMAIN =
  "lawos.outlook.lifecycle-proof.v1";
export const OUTLOOK_DESKTOP_LIFECYCLE_PROOF_MAX_LIFETIME_MS = 5 * 60 * 1_000;

const TRANSITION_DOMAIN = "lawos.outlook.lifecycle-transition.v1";
const PRINCIPAL_DOMAIN = "lawos.outlook.lifecycle-principal.v1";
const NONCE_DIGEST_DOMAIN = "lawos.outlook.lifecycle-nonce.v1";
const SIGNATURE_DIGEST_DOMAIN = "lawos.outlook.lifecycle-signature.v1";
const RECEIPT_DIGEST_DOMAIN = "lawos.outlook.lifecycle-verifier-receipt.v1";
export const OUTLOOK_DESKTOP_LIFECYCLE_PROOF_KEYS = Object.freeze([
  "operation",
  "tenant_id",
  "user_id",
  "entra_subject_id",
  "device_id",
  "installation_id",
  "release_authority_sha256",
  "local_measurement_evidence_sha256",
  "policy_version",
  "expected_state_version",
  "request_id",
  "event_id",
  "idempotency_key",
  "challenge_nonce_base64url",
  "challenge_id",
  "issued_challenge_sha256",
  "activation_receipt_sha256",
  "proof_id",
  "issued_at_epoch_ms",
  "expires_at_epoch_ms",
  "retire_intent_id",
  "retire_reason",
  "device_public_key_spki_base64",
]);
const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/u;
const INSTALLATION_ID = /^odi_[A-Za-z0-9_-]{20,128}$/u;
const LIFECYCLE_CHALLENGE_ID = /^olc_[a-f0-9]{32}$/u;
const RETIRE_INTENT_ID = /^ori_[a-f0-9]{32}$/u;
const SHA256 = /^[a-f0-9]{64}$/u;
const UNSIGNED_INTEGER = /^(?:0|[1-9][0-9]*)$/u;
const BASE64 = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u;
const BASE64URL = /^[A-Za-z0-9_-]+$/u;
const RETIRE_REASONS = new Set([
  "account_removed",
  "device_disconnect",
  "installation_replaced",
  "windows_uninstall",
]);
export const OUTLOOK_DESKTOP_LIFECYCLE_COMMAND_KEYS = Object.freeze({
  register: Object.freeze([
    "request_id", "event_id", "idempotency_key", "local_measurement_evidence_sha256",
  ]),
  heartbeat: Object.freeze([
    "request_id", "event_id", "idempotency_key",
  ]),
  retire: Object.freeze([
    "request_id", "event_id", "idempotency_key", "retire_reason",
  ]),
});

export class OutlookDesktopLifecycleVerifierError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.name = "OutlookDesktopLifecycleVerifierError";
    this.code = code;
    this.safe_error_code = code;
    this.status = status;
  }
}

export function lifecycleVerifierFailure(code, message, status) {
  throw new OutlookDesktopLifecycleVerifierError(code, message, status);
}

function isRecord(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export function assertOrderedKeys(value, keys, code, label) {
  let descriptors;
  try {
    if (!isRecord(value)) lifecycleVerifierFailure(code, `${label} must be a plain object`);
    descriptors = Object.getOwnPropertyDescriptors(value);
  } catch (error) {
    if (error instanceof OutlookDesktopLifecycleVerifierError) throw error;
    lifecycleVerifierFailure(code, `${label} must expose exact data properties`);
  }
  const ownKeys = Reflect.ownKeys(descriptors);
  if (JSON.stringify(ownKeys) !== JSON.stringify(keys)
      || ownKeys.some((key) => typeof key !== "string" || !("value" in descriptors[key]))) {
    lifecycleVerifierFailure(code, `${label} must use its exact ordered closed schema`);
  }
  return Object.freeze(Object.fromEntries(
    keys.map((key) => [key, descriptors[key].value]),
  ));
}

function snapshotClosedData(value, keys, code, label) {
  let descriptors;
  try {
    if (!isRecord(value)) lifecycleVerifierFailure(code, `${label} must be a plain object`);
    descriptors = Object.getOwnPropertyDescriptors(value);
  } catch (error) {
    if (error instanceof OutlookDesktopLifecycleVerifierError) throw error;
    lifecycleVerifierFailure(code, `${label} must expose exact data properties`);
  }
  const ownKeys = Reflect.ownKeys(descriptors);
  if (ownKeys.length !== keys.length
      || ownKeys.some((key) => typeof key !== "string" || !keys.includes(key)
        || !("value" in descriptors[key]))) {
    lifecycleVerifierFailure(code, `${label} must use its exact closed schema`);
  }
  return Object.fromEntries(keys.map((key) => [key, descriptors[key].value]));
}

function canonicalUnsigned(value, pattern, label) {
  if (typeof value !== "string" || !pattern.test(value)) {
    lifecycleVerifierFailure(
      "OUTLOOK_LIFECYCLE_PROOF_CANONICAL_INVALID",
      `${label} must be canonical unsigned base-10`,
    );
  }
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 0) {
    lifecycleVerifierFailure(
      "OUTLOOK_LIFECYCLE_PROOF_CANONICAL_INVALID",
      `${label} is outside the safe integer range`,
    );
  }
  return number;
}

function matchesText(value, pattern) {
  return typeof value === "string" && pattern.test(value);
}

export function decodeCanonicalBase64(value, {
  code = "OUTLOOK_LIFECYCLE_EVENT_INVALID",
  label,
  maxBytes,
  minBytes = 1,
} = {}) {
  if (typeof value !== "string" || !BASE64.test(value)) {
    lifecycleVerifierFailure(code, `${label} must be canonical base64`);
  }
  const bytes = Buffer.from(value, "base64");
  if (bytes.byteLength < minBytes || bytes.byteLength > maxBytes
      || bytes.toString("base64") !== value) {
    lifecycleVerifierFailure(code, `${label} has an invalid byte length or encoding`);
  }
  return bytes;
}

function decodeNonce(value) {
  if (typeof value !== "string" || !BASE64URL.test(value)) {
    lifecycleVerifierFailure(
      "OUTLOOK_LIFECYCLE_PROOF_NONCE_INVALID",
      "challenge nonce must be canonical base64url",
    );
  }
  const bytes = Buffer.from(value, "base64url");
  if (bytes.byteLength !== 32 || bytes.toString("base64url") !== value) {
    lifecycleVerifierFailure(
      "OUTLOOK_LIFECYCLE_PROOF_NONCE_INVALID",
      "challenge nonce must contain exactly 32 bytes",
    );
  }
  return bytes;
}

function parsePublicKey(value) {
  const der = decodeCanonicalBase64(value, {
    code: "OUTLOOK_LIFECYCLE_PROOF_PUBLIC_KEY_INVALID",
    label: "device public key",
    minBytes: 32,
    maxBytes: 512,
  });
  try {
    const key = createPublicKey({ key: der, format: "der", type: "spki" });
    const canonicalDer = key.export({ type: "spki", format: "der" });
    if (key.asymmetricKeyType !== "ed25519"
        || canonicalDer.byteLength !== der.byteLength
        || !timingSafeEqual(canonicalDer, der)) {
      lifecycleVerifierFailure(
        "OUTLOOK_LIFECYCLE_PROOF_PUBLIC_KEY_INVALID",
        "device public key must be canonical Ed25519 DER SPKI",
      );
    }
    return { der, key };
  } catch (error) {
    if (error instanceof OutlookDesktopLifecycleVerifierError) throw error;
    lifecycleVerifierFailure(
      "OUTLOOK_LIFECYCLE_PROOF_PUBLIC_KEY_INVALID",
      "device public key must be canonical Ed25519 DER SPKI",
    );
  }
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function domainDigest(domain, value) {
  return sha256(Buffer.concat([Buffer.from(domain), Buffer.from([0]), value]));
}

function lp(value) {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(String(value), "utf8");
  const length = Buffer.allocUnsafe(4);
  length.writeUInt32BE(bytes.byteLength);
  return Buffer.concat([length, bytes]);
}

function validateProof(proof) {
  proof = assertOrderedKeys(
    proof,
    OUTLOOK_DESKTOP_LIFECYCLE_PROOF_KEYS,
    "OUTLOOK_LIFECYCLE_PROOF_SCHEMA_INVALID",
    "lifecycle proof",
  );
  if (!new Set(["register", "heartbeat", "retire"]).has(proof.operation)
      || !matchesText(proof.tenant_id, IDENTIFIER)
      || !matchesText(proof.user_id, IDENTIFIER)
      || !matchesText(proof.entra_subject_id, IDENTIFIER)
      || !matchesText(proof.device_id, SHA256)
      || !matchesText(proof.installation_id, INSTALLATION_ID)
      || !matchesText(proof.request_id, IDENTIFIER)
      || !matchesText(proof.event_id, IDENTIFIER)
      || !matchesText(proof.idempotency_key, IDENTIFIER)
      || !matchesText(proof.proof_id, IDENTIFIER)) {
    lifecycleVerifierFailure(
      "OUTLOOK_LIFECYCLE_PROOF_SCHEMA_INVALID",
      "lifecycle proof identity or authority fields are invalid",
    );
  }
  if (proof.operation === "register"
      && proof.request_id !== proof.idempotency_key) {
    lifecycleVerifierFailure(
      "OUTLOOK_LIFECYCLE_PROOF_SCHEMA_INVALID",
      "registration request and idempotency identities must match",
    );
  }
  if ((proof.operation === "register" && !matchesText(proof.policy_version, IDENTIFIER))
      || (proof.operation !== "register" && proof.policy_version !== null)) {
    lifecycleVerifierFailure(
      "OUTLOOK_LIFECYCLE_PROOF_POLICY_INVALID",
      "policy version must exist only for registration proofs",
    );
  }
  if ((proof.operation === "register" && !matchesText(proof.challenge_id, ACTIVATION_ID))
      || (proof.operation !== "register"
        && !matchesText(proof.challenge_id, LIFECYCLE_CHALLENGE_ID))) {
    lifecycleVerifierFailure(
      "OUTLOOK_LIFECYCLE_PROOF_CHALLENGE_INVALID",
      "challenge id does not match the operation-specific server authority",
    );
  }
  if (!matchesText(proof.issued_challenge_sha256, SHA256)) {
    lifecycleVerifierFailure(
      "OUTLOOK_LIFECYCLE_PROOF_CHALLENGE_DIGEST_INVALID",
      "issued challenge digest must bind the protected canonical response",
    );
  }
  if ((proof.operation === "register"
        && !matchesText(proof.release_authority_sha256, SHA256))
      || (proof.operation !== "register" && proof.release_authority_sha256 !== null)) {
    lifecycleVerifierFailure(
      "OUTLOOK_LIFECYCLE_PROOF_RELEASE_AUTHORITY_INVALID",
      "release authority digest must exist only for registration proofs",
    );
  }
  if ((proof.operation === "register"
        && !matchesText(proof.local_measurement_evidence_sha256, SHA256))
      || (proof.operation !== "register"
        && proof.local_measurement_evidence_sha256 !== null)) {
    lifecycleVerifierFailure(
      "OUTLOOK_LIFECYCLE_PROOF_LOCAL_MEASUREMENT_INVALID",
      "local measurement digest must exist only for registration proofs",
    );
  }
  if ((proof.operation === "register"
        && !matchesText(proof.activation_receipt_sha256, SHA256))
      || (proof.operation !== "register" && proof.activation_receipt_sha256 !== null)) {
    lifecycleVerifierFailure(
      "OUTLOOK_LIFECYCLE_PROOF_ACTIVATION_RECEIPT_INVALID",
      "activation receipt digest must exist only for registration proofs",
    );
  }
  if ((proof.operation === "retire"
        && !matchesText(proof.retire_intent_id, RETIRE_INTENT_ID))
      || (proof.operation !== "retire" && proof.retire_intent_id !== null)) {
    lifecycleVerifierFailure(
      "OUTLOOK_LIFECYCLE_PROOF_RETIRE_INTENT_INVALID",
      "retire intent must exist only for retire proofs",
    );
  }
  if ((proof.operation === "retire" && !RETIRE_REASONS.has(proof.retire_reason))
      || (proof.operation !== "retire" && proof.retire_reason !== null)) {
    lifecycleVerifierFailure(
      "OUTLOOK_LIFECYCLE_PROOF_RETIRE_REASON_INVALID",
      "retire reason must use the closed retire-only enum",
    );
  }
  const expectedStateVersion = proof.expected_state_version;
  if (!Number.isSafeInteger(expectedStateVersion) || expectedStateVersion < 1) {
    lifecycleVerifierFailure(
      "OUTLOOK_LIFECYCLE_PROOF_STATE_VERSION_INVALID",
      "expected state version must be a positive safe integer",
    );
  }
  if (proof.operation === "register" && expectedStateVersion !== 1) {
    lifecycleVerifierFailure(
      "OUTLOOK_LIFECYCLE_PROOF_STATE_VERSION_INVALID",
      "registration requires expected state version one",
    );
  }
  const issuedAt = canonicalUnsigned(
    proof.issued_at_epoch_ms,
    UNSIGNED_INTEGER,
    "issued_at_epoch_ms",
  );
  const expiresAt = canonicalUnsigned(
    proof.expires_at_epoch_ms,
    UNSIGNED_INTEGER,
    "expires_at_epoch_ms",
  );
  if (!Number.isFinite(new Date(issuedAt).getTime())
      || !Number.isFinite(new Date(expiresAt).getTime())
      || expiresAt <= issuedAt
      || expiresAt - issuedAt > OUTLOOK_DESKTOP_LIFECYCLE_PROOF_MAX_LIFETIME_MS) {
    lifecycleVerifierFailure(
      "OUTLOOK_LIFECYCLE_PROOF_WINDOW_INVALID",
      "device proof lifetime must be positive and at most five minutes",
      401,
    );
  }
  const nonce = decodeNonce(proof.challenge_nonce_base64url);
  const publicKey = parsePublicKey(proof.device_public_key_spki_base64);
  if (sha256(publicKey.der) !== proof.device_id) {
    lifecycleVerifierFailure(
      "OUTLOOK_LIFECYCLE_PROOF_PUBLIC_KEY_MISMATCH",
      "device identifier does not bind the canonical public key",
      401,
    );
  }
  return { expectedStateVersion, expiresAt, issuedAt, nonce, proof, publicKey };
}

export function createOutlookDesktopLifecycleProof(value) {
  const proof = snapshotClosedData(
    value,
    OUTLOOK_DESKTOP_LIFECYCLE_PROOF_KEYS,
    "OUTLOOK_LIFECYCLE_PROOF_SCHEMA_INVALID",
    "lifecycle proof",
  );
  validateProof(proof);
  return Object.freeze(proof);
}

export function createOutlookDesktopLifecycleTransitionCommand({ proof } = {}) {
  ({ proof } = validateProof(proof));
  return Object.freeze({
    request_id: proof.request_id,
    event_id: proof.event_id,
    idempotency_key: proof.idempotency_key,
    ...(proof.operation === "register" ? {
      local_measurement_evidence_sha256: proof.local_measurement_evidence_sha256,
    } : {}),
    ...(proof.operation === "retire" ? { retire_reason: proof.retire_reason } : {}),
  });
}

export function parseOutlookDesktopLifecycleTransitionCommand({
  proof,
  rawRequestBody,
} = {}) {
  ({ proof } = validateProof(proof));
  if (!Buffer.isBuffer(rawRequestBody)
      || rawRequestBody.byteLength < 1
      || rawRequestBody.byteLength > 64 * 1_024) {
    lifecycleVerifierFailure(
      "OUTLOOK_LIFECYCLE_REQUEST_BODY_INVALID",
      "exact transition command must contain 1-65536 bytes",
    );
  }
  let command;
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(rawRequestBody);
    command = JSON.parse(text);
  } catch {
    lifecycleVerifierFailure(
      "OUTLOOK_LIFECYCLE_REQUEST_BODY_INVALID",
      "transition command must be valid canonical UTF-8 JSON",
    );
  }
  const keys = OUTLOOK_DESKTOP_LIFECYCLE_COMMAND_KEYS[proof.operation];
  assertOrderedKeys(
    command,
    keys,
    "OUTLOOK_LIFECYCLE_REQUEST_BODY_INVALID",
    "transition command",
  );
  if (command.request_id !== proof.request_id
      || command.event_id !== proof.event_id
      || command.idempotency_key !== proof.idempotency_key
      || (proof.operation === "register"
        && command.local_measurement_evidence_sha256
          !== proof.local_measurement_evidence_sha256)
      || (proof.operation === "retire" && command.retire_reason !== proof.retire_reason)) {
    lifecycleVerifierFailure(
      "OUTLOOK_LIFECYCLE_REQUEST_BODY_INVALID",
      "transition command does not match the signed proof semantics",
    );
  }
  const canonicalBytes = Buffer.from(JSON.stringify(command), "utf8");
  if (canonicalBytes.byteLength !== rawRequestBody.byteLength
      || !timingSafeEqual(canonicalBytes, rawRequestBody)) {
    lifecycleVerifierFailure(
      "OUTLOOK_LIFECYCLE_REQUEST_BODY_INVALID",
      "transition command must use its exact canonical JSON bytes",
    );
  }
  return Object.freeze({ ...command });
}

function opaquePrincipal(proof) {
  return Buffer.concat([
    Buffer.from(PRINCIPAL_DOMAIN),
    Buffer.from([0]),
    lp(proof.user_id),
    lp(proof.entra_subject_id),
  ]);
}

export function createOutlookDesktopLifecycleProofTranscript({
  proof,
  rawRequestBody,
} = {}) {
  const parsed = validateProof(proof);
  proof = parsed.proof;
  parseOutlookDesktopLifecycleTransitionCommand({ proof, rawRequestBody });
  const fields = [
    proof.operation,
    proof.tenant_id,
    opaquePrincipal(proof),
    proof.device_id,
    proof.installation_id,
    proof.release_authority_sha256,
    proof.local_measurement_evidence_sha256,
    proof.policy_version,
    sha256(rawRequestBody),
    proof.expected_state_version,
    proof.request_id,
    proof.event_id,
    proof.idempotency_key,
    parsed.nonce,
    proof.challenge_id,
    proof.issued_challenge_sha256,
    proof.activation_receipt_sha256,
    proof.proof_id,
    proof.issued_at_epoch_ms,
    proof.expires_at_epoch_ms,
    ...(proof.operation === "retire"
      ? [proof.retire_intent_id, proof.retire_reason] : []),
  ];
  return Buffer.concat([
    Buffer.from(OUTLOOK_DESKTOP_LIFECYCLE_PROOF_DOMAIN, "utf8"),
    Buffer.from([0]),
    ...fields.map(lp),
  ]);
}

export function signOutlookDesktopLifecycleProof({
  privateKey,
  proof,
  rawRequestBody,
} = {}) {
  const transcript = createOutlookDesktopLifecycleProofTranscript({
    proof,
    rawRequestBody,
  });
  try {
    const signature = signSignature(null, transcript, privateKey);
    if (!Buffer.isBuffer(signature) || signature.byteLength !== 64) {
      lifecycleVerifierFailure(
        "OUTLOOK_LIFECYCLE_PROOF_SIGNATURE_INVALID",
        "device proof signer must produce exactly 64 Ed25519 bytes",
      );
    }
    return signature.toString("base64");
  } catch (error) {
    if (error instanceof OutlookDesktopLifecycleVerifierError) throw error;
    lifecycleVerifierFailure(
      "OUTLOOK_LIFECYCLE_PROOF_SIGNATURE_INVALID",
      "device proof signing key is invalid",
    );
  }
}

export function createOutlookDesktopLifecycleSignedTransition({
  privateKey,
  proof: proofInput,
} = {}) {
  const proof = createOutlookDesktopLifecycleProof(proofInput);
  const command = createOutlookDesktopLifecycleTransitionCommand({ proof });
  const rawRequestBody = Buffer.from(JSON.stringify(command), "utf8");
  return Object.freeze({
    proof,
    proof_signature_base64: signOutlookDesktopLifecycleProof({
      privateKey,
      proof,
      rawRequestBody,
    }),
    raw_request_body_base64: rawRequestBody.toString("base64"),
  });
}

export function verifyOutlookDesktopLifecycleProof({
  proof,
  proofSignatureBase64,
  rawRequestBody,
} = {}) {
  const parsed = validateProof(proof);
  proof = parsed.proof;
  const signature = decodeCanonicalBase64(proofSignatureBase64, {
    code: "OUTLOOK_LIFECYCLE_PROOF_SIGNATURE_INVALID",
    label: "device proof signature",
    minBytes: 64,
    maxBytes: 64,
  });
  const transcript = createOutlookDesktopLifecycleProofTranscript({ proof, rawRequestBody });
  if (!verifySignature(null, transcript, parsed.publicKey.key, signature)) {
    lifecycleVerifierFailure(
      "OUTLOOK_LIFECYCLE_PROOF_SIGNATURE_INVALID",
      "device proof signature is invalid",
      401,
    );
  }
  return Object.freeze({
    expectedStateVersion: parsed.expectedStateVersion,
    expiresAt: parsed.expiresAt,
    issuedAt: parsed.issuedAt,
    nonce: parsed.nonce,
    publicKey: parsed.publicKey,
    nonceBindingSha256: domainDigest(NONCE_DIGEST_DOMAIN, parsed.nonce),
    nonceSha256: sha256(parsed.nonce),
    rawRequestSha256: sha256(rawRequestBody),
    signatureSha256: domainDigest(SIGNATURE_DIGEST_DOMAIN, signature),
    transcriptSha256: sha256(transcript),
  });
}

export function outlookDesktopLifecycleTransitionFingerprint({ proof }) {
  ({ proof } = validateProof(proof));
  return sha256(Buffer.concat([
    Buffer.from(TRANSITION_DOMAIN),
    Buffer.from([0]),
    ...[
      proof.operation, proof.tenant_id, opaquePrincipal(proof),
      proof.device_id, proof.installation_id, proof.release_authority_sha256,
      proof.local_measurement_evidence_sha256, proof.policy_version,
      proof.expected_state_version, proof.request_id,
      proof.event_id, proof.idempotency_key, proof.activation_receipt_sha256,
      proof.retire_intent_id ?? "", proof.retire_reason ?? "",
    ].map(lp),
  ]));
}

export function outlookDesktopLifecycleReceiptSha256({
  activationReplayIdentitySha256,
  proof,
  proofReceiptExpiresAtEpochMs,
  requestFingerprint,
  verifiedProof,
}) {
  ({ proof } = validateProof(proof));
  for (const digest of [
    activationReplayIdentitySha256,
    requestFingerprint,
    verifiedProof?.transcriptSha256,
    verifiedProof?.signatureSha256,
  ]) {
    if (!matchesText(digest, SHA256)) {
      lifecycleVerifierFailure(
        "OUTLOOK_LIFECYCLE_RECEIPT_BINDING_INVALID",
        "lifecycle receipt digest binding is invalid",
      );
    }
  }
  canonicalUnsigned(
    proofReceiptExpiresAtEpochMs,
    UNSIGNED_INTEGER,
    "proof_receipt_expires_at_epoch_ms",
  );
  return sha256(Buffer.concat([
    Buffer.from(RECEIPT_DIGEST_DOMAIN),
    Buffer.from([0]),
    ...[
      proof.proof_id, proof.operation, proof.tenant_id,
      proof.release_authority_sha256, requestFingerprint,
      verifiedProof.transcriptSha256, verifiedProof.signatureSha256,
      activationReplayIdentitySha256, proofReceiptExpiresAtEpochMs,
    ].map(lp),
  ]));
}
