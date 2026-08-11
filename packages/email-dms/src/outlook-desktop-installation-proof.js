import {
  createHash,
  createPublicKey,
  sign as signBytes,
  verify as verifyBytes,
} from "node:crypto";

export const OUTLOOK_DESKTOP_PROOF_DOMAIN =
  "lawos.outlook-desktop-installation.v1";
export const OUTLOOK_DESKTOP_PROOF_MAX_LIFETIME_MS = 5 * 60 * 1000;
export const OUTLOOK_DESKTOP_PROOF_MAX_CLOCK_SKEW_MS = 30 * 1000;

const INSTALLATION_ID_PATTERN = /^odi_[A-Za-z0-9_-]{20,128}$/u;
const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{15,199}$/u;
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/u;
const BASE64_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/u;
const RFC3339_MILLISECONDS_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;
const INSTALLATION_PATH_PATTERN =
  /^\/api\/desktop\/installations\/(odi_[A-Za-z0-9_-]{20,128})\/(heartbeat|retire)$/u;
const REGISTRATION_PATH = "/api/desktop/installations";

function proofError(code, reason, status = 400) {
  return Object.assign(new Error(reason), {
    safe_error_code: code,
    reason,
    status,
  });
}

function invalid(code, reason, status) {
  throw proofError(code, reason, status);
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function canonicalJson(value, seen = new Set()) {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      invalid(
        "OUTLOOK_DESKTOP_PROOF_CANONICAL_JSON_INVALID",
        "outlook_desktop_proof_non_finite_number",
      );
    }
    return JSON.stringify(value);
  }
  if (typeof value !== "object") {
    invalid(
      "OUTLOOK_DESKTOP_PROOF_CANONICAL_JSON_INVALID",
      "outlook_desktop_proof_unsupported_json_value",
    );
  }
  if (seen.has(value)) {
    invalid(
      "OUTLOOK_DESKTOP_PROOF_CANONICAL_JSON_INVALID",
      "outlook_desktop_proof_cyclic_json",
    );
  }
  seen.add(value);
  try {
    if (Array.isArray(value)) {
      return `[${value.map((entry) => canonicalJson(entry, seen)).join(",")}]`;
    }
    if (!isPlainObject(value)) {
      invalid(
        "OUTLOOK_DESKTOP_PROOF_CANONICAL_JSON_INVALID",
        "outlook_desktop_proof_non_plain_json_object",
      );
    }
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => (
      `${JSON.stringify(key)}:${canonicalJson(value[key], seen)}`
    )).join(",")}}`;
  } finally {
    seen.delete(value);
  }
}

function sha256(value, encoding) {
  return createHash("sha256").update(value).digest(encoding);
}

function canonicalTimestamp(value, field) {
  if (
    typeof value !== "string"
    || !RFC3339_MILLISECONDS_PATTERN.test(value)
  ) {
    invalid(
      "OUTLOOK_DESKTOP_PROOF_TIME_INVALID",
      `outlook_desktop_proof_${field}_invalid`,
    );
  }
  const date = new Date(value);
  if (!Number.isFinite(date.getTime()) || date.toISOString() !== value) {
    invalid(
      "OUTLOOK_DESKTOP_PROOF_TIME_INVALID",
      `outlook_desktop_proof_${field}_invalid`,
    );
  }
  return date;
}

function serverInstant(value) {
  const date = value instanceof Date ? new Date(value) : new Date(value);
  if (!Number.isFinite(date.getTime())) {
    invalid(
      "OUTLOOK_DESKTOP_PROOF_TIME_INVALID",
      "outlook_desktop_proof_server_time_invalid",
    );
  }
  return date;
}

function canonicalNonce(value) {
  if (
    typeof value !== "string"
    || !BASE64URL_PATTERN.test(value)
    || value.length > 86
  ) {
    invalid(
      "OUTLOOK_DESKTOP_PROOF_NONCE_INVALID",
      "outlook_desktop_proof_nonce_invalid",
    );
  }
  const bytes = Buffer.from(value, "base64url");
  if (
    bytes.length < 16
    || bytes.length > 64
    || bytes.toString("base64url") !== value
  ) {
    invalid(
      "OUTLOOK_DESKTOP_PROOF_NONCE_INVALID",
      "outlook_desktop_proof_nonce_invalid",
    );
  }
  return bytes;
}

function parseRoute(request) {
  if (request.method !== "POST") {
    invalid(
      "OUTLOOK_DESKTOP_PROOF_METHOD_INVALID",
      "outlook_desktop_proof_method_invalid",
    );
  }
  if (request.path === REGISTRATION_PATH) {
    if (request.installation_id !== "NEW") {
      invalid(
        "OUTLOOK_DESKTOP_PROOF_INSTALLATION_INVALID",
        "outlook_desktop_proof_registration_installation_invalid",
      );
    }
    return { operation: "register", installation_id: "NEW" };
  }
  const match = typeof request.path === "string"
    ? request.path.match(INSTALLATION_PATH_PATTERN)
    : null;
  if (!match) {
    invalid(
      "OUTLOOK_DESKTOP_PROOF_PATH_INVALID",
      "outlook_desktop_proof_path_invalid",
    );
  }
  if (
    !INSTALLATION_ID_PATTERN.test(request.installation_id)
    || request.installation_id !== match[1]
  ) {
    invalid(
      "OUTLOOK_DESKTOP_PROOF_INSTALLATION_INVALID",
      "outlook_desktop_proof_installation_mismatch",
    );
  }
  return { operation: match[2], installation_id: match[1] };
}

function parsePublicKey(publicKeySpki) {
  if (
    typeof publicKeySpki !== "string"
    || publicKeySpki.length < 40
    || publicKeySpki.length > 512
    || publicKeySpki.length % 4 !== 0
    || !BASE64_PATTERN.test(publicKeySpki)
  ) {
    invalid(
      "OUTLOOK_DESKTOP_PROOF_PUBLIC_KEY_INVALID",
      "outlook_desktop_proof_public_key_invalid",
    );
  }
  const der = Buffer.from(publicKeySpki, "base64");
  if (der.toString("base64") !== publicKeySpki) {
    invalid(
      "OUTLOOK_DESKTOP_PROOF_PUBLIC_KEY_INVALID",
      "outlook_desktop_proof_public_key_noncanonical",
    );
  }
  try {
    const key = createPublicKey({ key: der, format: "der", type: "spki" });
    if (
      key.asymmetricKeyType !== "ed25519"
      || key.export({ type: "spki", format: "der" }).toString("base64")
        !== publicKeySpki
    ) {
      invalid(
        "OUTLOOK_DESKTOP_PROOF_PUBLIC_KEY_INVALID",
        "outlook_desktop_proof_public_key_not_ed25519",
      );
    }
    return { der, key };
  } catch (error) {
    if (error?.safe_error_code) throw error;
    invalid(
      "OUTLOOK_DESKTOP_PROOF_PUBLIC_KEY_INVALID",
      "outlook_desktop_proof_public_key_invalid",
    );
  }
}

function canonicalSignature(value) {
  if (typeof value !== "string" || !BASE64URL_PATTERN.test(value)) {
    invalid(
      "OUTLOOK_DESKTOP_PROOF_SIGNATURE_INVALID",
      "outlook_desktop_proof_signature_invalid",
      401,
    );
  }
  const bytes = Buffer.from(value, "base64url");
  if (bytes.length !== 64 || bytes.toString("base64url") !== value) {
    invalid(
      "OUTLOOK_DESKTOP_PROOF_SIGNATURE_INVALID",
      "outlook_desktop_proof_signature_invalid",
      401,
    );
  }
  return bytes;
}

export function outlookDesktopPublicKeyFingerprint(publicKeySpki) {
  return sha256(parsePublicKey(publicKeySpki).der, "hex");
}

export function canonicalOutlookDesktopLifecycleRequest(request = {}) {
  if (!isPlainObject(request)) {
    invalid(
      "OUTLOOK_DESKTOP_PROOF_REQUEST_INVALID",
      "outlook_desktop_proof_request_invalid",
    );
  }
  const route = parseRoute(request);
  if (!isPlainObject(request.body)) {
    invalid(
      "OUTLOOK_DESKTOP_PROOF_CANONICAL_JSON_INVALID",
      "outlook_desktop_proof_body_must_be_object",
    );
  }
  const canonicalBody = canonicalJson(request.body);
  const bodySha256 = sha256(canonicalBody, "base64url");
  if (
    typeof request.idempotency_key !== "string"
    || !IDEMPOTENCY_KEY_PATTERN.test(request.idempotency_key)
  ) {
    invalid(
      "OUTLOOK_DESKTOP_PROOF_IDEMPOTENCY_KEY_INVALID",
      "outlook_desktop_proof_idempotency_key_invalid",
    );
  }
  const nonceBytes = canonicalNonce(request.nonce);
  const issuedAt = canonicalTimestamp(request.issued_at, "issued_at");
  const expiresAt = canonicalTimestamp(request.expires_at, "expires_at");
  const lifetime = expiresAt.getTime() - issuedAt.getTime();
  if (lifetime <= 0 || lifetime > OUTLOOK_DESKTOP_PROOF_MAX_LIFETIME_MS) {
    invalid(
      "OUTLOOK_DESKTOP_PROOF_FRESHNESS_INVALID",
      "outlook_desktop_proof_lifetime_invalid",
      401,
    );
  }
  const transcript = [
    OUTLOOK_DESKTOP_PROOF_DOMAIN,
    request.method,
    request.path,
    bodySha256,
    route.installation_id,
    request.idempotency_key,
    request.nonce,
    request.issued_at,
    request.expires_at,
  ].join("\n");
  const semanticTranscript = [
    OUTLOOK_DESKTOP_PROOF_DOMAIN,
    "semantic-request.v1",
    request.method,
    request.path,
    bodySha256,
    route.installation_id,
    request.idempotency_key,
  ].join("\n");
  return Object.freeze({
    operation: route.operation,
    method: request.method,
    path: request.path,
    installation_id: route.installation_id,
    idempotency_key: request.idempotency_key,
    nonce: request.nonce,
    nonce_hash: sha256(nonceBytes, "hex"),
    issued_at: request.issued_at,
    expires_at: request.expires_at,
    body_canonical: canonicalBody,
    body_sha256: bodySha256,
    request_fingerprint: sha256(semanticTranscript, "hex"),
    transcript,
  });
}

export function signOutlookDesktopLifecycleRequest(request, privateKey) {
  const canonical = canonicalOutlookDesktopLifecycleRequest(request);
  try {
    return signBytes(
      null,
      Buffer.from(canonical.transcript, "utf8"),
      privateKey,
    ).toString("base64url");
  } catch {
    invalid(
      "OUTLOOK_DESKTOP_PROOF_PRIVATE_KEY_INVALID",
      "outlook_desktop_proof_private_key_invalid",
    );
  }
}

export function verifyOutlookDesktopLifecycleProof({
  request,
  signature,
  public_key: publicKeySpki,
  now = new Date(),
} = {}) {
  const canonical = canonicalOutlookDesktopLifecycleRequest(request);
  const publicKey = parsePublicKey(publicKeySpki);
  const signatureBytes = canonicalSignature(signature);
  const at = serverInstant(now);
  const issuedAt = canonicalTimestamp(canonical.issued_at, "issued_at");
  const expiresAt = canonicalTimestamp(canonical.expires_at, "expires_at");
  if (
    issuedAt.getTime() > at.getTime() + OUTLOOK_DESKTOP_PROOF_MAX_CLOCK_SKEW_MS
    || expiresAt.getTime() <= at.getTime()
  ) {
    invalid(
      "OUTLOOK_DESKTOP_PROOF_FRESHNESS_INVALID",
      "outlook_desktop_proof_outside_freshness_window",
      401,
    );
  }
  if (!verifyBytes(
    null,
    Buffer.from(canonical.transcript, "utf8"),
    publicKey.key,
    signatureBytes,
  )) {
    invalid(
      "OUTLOOK_DESKTOP_PROOF_SIGNATURE_INVALID",
      "outlook_desktop_proof_signature_invalid",
      401,
    );
  }
  if (
    canonical.operation === "register"
    && request.body.device_public_key !== publicKeySpki
  ) {
    invalid(
      "OUTLOOK_DESKTOP_PROOF_PUBLIC_KEY_BINDING_MISMATCH",
      "outlook_desktop_proof_public_key_binding_mismatch",
      401,
    );
  }
  return Object.freeze({
    ...canonical,
    verified: true,
    public_key_fingerprint: sha256(publicKey.der, "hex"),
  });
}

export function classifyOutlookDesktopLifecycleReplay({
  verified_request: verifiedRequest,
  idempotency_receipt: idempotencyReceipt = null,
  nonce_receipt: nonceReceipt = null,
} = {}) {
  if (
    !verifiedRequest?.verified
    || !/^[a-f0-9]{64}$/u.test(verifiedRequest.request_fingerprint ?? "")
    || !/^[a-f0-9]{64}$/u.test(verifiedRequest.nonce_hash ?? "")
  ) {
    invalid(
      "OUTLOOK_DESKTOP_PROOF_REQUEST_INVALID",
      "outlook_desktop_verified_request_invalid",
    );
  }
  if (idempotencyReceipt) {
    if (
      idempotencyReceipt.request_fingerprint
      !== verifiedRequest.request_fingerprint
    ) {
      invalid(
        "OUTLOOK_DESKTOP_PROOF_IDEMPOTENCY_CONFLICT",
        "outlook_desktop_proof_idempotency_conflict",
        409,
      );
    }
    if (
      !Number.isInteger(idempotencyReceipt.response_status)
      || idempotencyReceipt.response_status < 100
      || idempotencyReceipt.response_status > 599
      || !isPlainObject(idempotencyReceipt.response)
    ) {
      invalid(
        "OUTLOOK_DESKTOP_PROOF_RECEIPT_INVALID",
        "outlook_desktop_proof_receipt_invalid",
        500,
      );
    }
    return Object.freeze({
      disposition: "exact_replay",
      response_status: idempotencyReceipt.response_status,
      response: idempotencyReceipt.response,
    });
  }
  if (nonceReceipt) {
    invalid(
      "OUTLOOK_DESKTOP_PROOF_NONCE_REPLAY",
      "outlook_desktop_proof_nonce_replay",
      409,
    );
  }
  return Object.freeze({ disposition: "fresh" });
}
