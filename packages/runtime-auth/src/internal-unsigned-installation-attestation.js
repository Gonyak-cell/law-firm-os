import { createHash, createPrivateKey, createPublicKey, sign, verify } from "node:crypto";
import { types } from "node:util";
import { canonicalizeJson } from "./runtime-safety-approval-contract.js";

export const INTERNAL_UNSIGNED_INSTALLATION_ATTESTATION_SCHEMA =
  "law-firm-os.internal-unsigned-installation-attestation.v1";
export const INTERNAL_UNSIGNED_INSTALLATION_ATTESTATION_MAX_AGE_MS = 300_000;
export const INTERNAL_UNSIGNED_INSTALLATION_ATTESTATION_FIELDS = Object.freeze([
  "installation_id", "tenant_id", "app_id", "platform", "architecture",
  "release_id", "release_sequence", "version", "source_sha", "source_tree",
  "installer_sha256", "installer_bytes", "installer_version_id",
  "bootstrap_marker_sha256", "installed_receipt_sha256", "state_version",
  "lease_expires_at", "installation_release_binding_sha256",
  "release_authority_sha256", "status", "retired_at", "release_trusted",
  "authority_snapshot_at",
]);
const DOCUMENT_FIELDS = Object.freeze([
  "schema_version", "adoption_id", "request_sha256", "generated_at",
  "expires_at", "installation",
]);
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/u;
const INSTALLATION_ID = /^odi_[A-Za-z0-9_-]{20,128}$/u;
const SHA256 = /^[a-f0-9]{64}$/u;
const SHA1 = /^[a-f0-9]{40}$/u;
const VERSION = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/u;
const VERSION_ID = /^[A-Za-z0-9][A-Za-z0-9._+=/-]{0,1023}$/u;
const MAX_DOCUMENT_BYTES = 16 * 1024;

function invalid() {
  throw Object.assign(new Error("Internal installation attestation is invalid"), {
    safe_error_code: "INTERNAL_INSTALLATION_ATTESTATION_INVALID", status: 403,
  });
}

function exactData(value, fields) {
  if (!value || typeof value !== "object" || Array.isArray(value) || types.isProxy(value)) invalid();
  const prototype = Object.getPrototypeOf(value);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const keys = Reflect.ownKeys(descriptors);
  if ((prototype !== Object.prototype && prototype !== null)
      || keys.length !== fields.length
      || keys.some((key) => typeof key !== "string" || !fields.includes(key)
        || !Object.hasOwn(descriptors[key], "value") || !descriptors[key].enumerable)) invalid();
  return Object.fromEntries(fields.map((key) => [key, descriptors[key].value]));
}

function timestamp(value) {
  const parsed = typeof value === "string" ? Date.parse(value) : NaN;
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString() !== value) invalid();
  return parsed;
}

function key(value, expectedPublicKeySha256) {
  let publicKey;
  try {
    publicKey = value?.type === "public" ? value : createPublicKey(value);
    if (publicKey.asymmetricKeyType !== "ed25519"
        || !SHA256.test(expectedPublicKeySha256 ?? "")
        || createHash("sha256").update(publicKey.export({ type: "spki", format: "der" }))
          .digest("hex") !== expectedPublicKeySha256) invalid();
  } catch { invalid(); }
  return publicKey;
}

export function validateInternalUnsignedInstallationAttestationDocument(value, { now = Date.now() } = {}) {
  const result = exactData(value, DOCUMENT_FIELDS);
  const installation = exactData(result.installation, INTERNAL_UNSIGNED_INSTALLATION_ATTESTATION_FIELDS);
  const generated = timestamp(result.generated_at);
  const expires = timestamp(result.expires_at);
  if (!Number.isFinite(now)
      || typeof result.adoption_id !== "string" || typeof result.request_sha256 !== "string"
      || INTERNAL_UNSIGNED_INSTALLATION_ATTESTATION_FIELDS
        .filter((field) => !["release_sequence", "installer_bytes", "state_version", "retired_at", "release_trusted"].includes(field))
        .some((field) => typeof installation[field] !== "string")
      || result.schema_version !== INTERNAL_UNSIGNED_INSTALLATION_ATTESTATION_SCHEMA
      || !ID.test(result.adoption_id ?? "") || !SHA256.test(result.request_sha256 ?? "")
      || generated > now || expires <= now || expires <= generated
      || expires - generated > INTERNAL_UNSIGNED_INSTALLATION_ATTESTATION_MAX_AGE_MS
      || installation.authority_snapshot_at !== result.generated_at
      || timestamp(installation.lease_expires_at) < expires
      || !INSTALLATION_ID.test(installation.installation_id ?? "")
      || !ID.test(installation.tenant_id ?? "") || !ID.test(installation.release_id ?? "")
      || installation.app_id !== "com.amic.matter.desktop.internal"
      || installation.platform !== "win32" || installation.architecture !== "x64"
      || !VERSION.test(installation.version ?? "")
      || !SHA1.test(installation.source_sha ?? "") || !SHA1.test(installation.source_tree ?? "")
      || !VERSION_ID.test(installation.installer_version_id ?? "")
      || installation.installer_version_id === "null"
      || !Number.isSafeInteger(installation.installer_bytes) || installation.installer_bytes < 1
      || installation.installer_bytes > 2 * 1024 * 1024 * 1024
      || !Number.isSafeInteger(installation.release_sequence) || installation.release_sequence < 1
      || !Number.isSafeInteger(installation.state_version) || installation.state_version < 1
      || installation.status !== "active" || installation.retired_at !== null
      || installation.release_trusted !== true
      || ["installer_sha256", "bootstrap_marker_sha256", "installed_receipt_sha256",
        "installation_release_binding_sha256", "release_authority_sha256"]
        .some((field) => !SHA256.test(installation[field] ?? ""))) invalid();
  return Object.freeze({ ...result, installation: Object.freeze(installation) });
}

function bytes(value) {
  return Buffer.from(`${canonicalizeJson(value)}\n`);
}

export function createInternalUnsignedInstallationAttestationSigner({
  privateKey, keyId, expectedPublicKeySha256,
} = {}) {
  if (!ID.test(keyId ?? "")) invalid();
  let signingKey;
  try {
    signingKey = privateKey?.type === "private" ? privateKey : createPrivateKey(privateKey);
    key(signingKey, expectedPublicKeySha256);
  } catch { invalid(); }
  return (value, { now = Date.now() } = {}) => {
    const canonical = bytes(validateInternalUnsignedInstallationAttestationDocument(value, { now }));
    if (canonical.length > MAX_DOCUMENT_BYTES) invalid();
    return Object.freeze({
      document_base64: canonical.toString("base64"),
      signature_base64: sign(null, canonical, signingKey).toString("base64"),
      key_id: keyId,
    });
  };
}

export function verifyInternalUnsignedInstallationAttestation({
  envelope, publicKey, expectedPublicKeySha256, expectedKeyId,
  adoptionId, requestSha256, installationId, now = Date.now(),
} = {}) {
  const value = exactData(envelope, ["document_base64", "signature_base64", "key_id"]);
  if (!ID.test(expectedKeyId ?? "") || value.key_id !== expectedKeyId
      || !ID.test(adoptionId ?? "") || !SHA256.test(requestSha256 ?? "")
      || !INSTALLATION_ID.test(installationId ?? "")
      || typeof value.document_base64 !== "string" || typeof value.signature_base64 !== "string"
      || value.document_base64.length > Math.ceil(MAX_DOCUMENT_BYTES / 3) * 4
      || value.signature_base64.length !== 88) invalid();
  const raw = Buffer.from(value.document_base64, "base64");
  const signature = Buffer.from(value.signature_base64, "base64");
  if (raw.length < 2 || raw.length > MAX_DOCUMENT_BYTES || signature.length !== 64
      || raw.toString("base64") !== value.document_base64
      || signature.toString("base64") !== value.signature_base64
      || !verify(null, raw, key(publicKey, expectedPublicKeySha256), signature)) invalid();
  let parsed;
  try {
    parsed = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(raw));
  } catch { invalid(); }
  const result = validateInternalUnsignedInstallationAttestationDocument(parsed, { now });
  if (!bytes(result).equals(raw) || result.adoption_id !== adoptionId
      || result.request_sha256 !== requestSha256
      || result.installation.installation_id !== installationId) invalid();
  return result;
}
