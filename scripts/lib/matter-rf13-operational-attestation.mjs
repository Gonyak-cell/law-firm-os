import { createHash, createPublicKey } from "node:crypto";
import {
  closeSync,
  constants,
  fstatSync,
  lstatSync,
  openSync,
  readSync,
  realpathSync,
} from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";

import {
  canonicalizeJson,
  validateRuntimeSafetyApprovalPayload,
} from "./runtime-safety-approval-contract.mjs";

export const RF13_OPERATIONAL_PACKET_SCHEMA = "law-firm-os.rf13.operational-attestation-packet.v1";
export const RF13_PROFILE_MEASUREMENT_PACKET_SCHEMA = "law-firm-os.rf13.profile-measurement-attestation-packet.v1";

export const RF13_OPERATIONAL_ATTESTATION_POLICIES = Object.freeze({
  webFull: Object.freeze({
    purpose: "web_full",
    receiptSchema: "law-firm-os.rf13.web-full-navigation.v1",
    role: "rf13_web_full_attestor",
    action: "lawos-rf13-web-full-navigation",
    environment: "production",
  }),
  profileMeasurement: Object.freeze({
    purpose: "profile_measurement",
    receiptSchema: "law-firm-os.profile-media-operability-measurement.production.v1",
    role: "profile_measurement_attestor",
    action: "lawos-profile-production-measurement",
    environment: "production",
  }),
  profileOperation: Object.freeze({
    purpose: "profile_operation",
    receiptSchema: "law-firm-os.profile-media-api-operation.v4",
    role: "profile_operation_attestor",
    action: "lawos-profile-production-operation",
    environment: "production",
  }),
  profileDecision: Object.freeze({
    purpose: "profile_decision",
    receiptSchema: "law-firm-os.profile-media-operability-decision.v4",
    role: "profile_decision_attestor",
    action: "lawos-profile-production-decision",
    environment: "production",
  }),
});

const SHA1 = /^[a-f0-9]{40}$/u;
const SHA256 = /^[a-f0-9]{64}$/u;
const SAFE_PATH = /^[A-Za-z0-9._/-]+$/u;
const RF13_EVIDENCE_PREFIX = ".omo/evidence/rf13-debt-remediation-20260731/";
const MAX_OPERATIONAL_CONTENT_BYTES = 16 * 1024 * 1024;
const RECEIPT_PURPOSES = new Set(["web_full", "profile_operation", "profile_decision"]);
const POLICIES = new Map(Object.values(RF13_OPERATIONAL_ATTESTATION_POLICIES).map((value) => [value.purpose, value]));

export class Rf13OperationalAttestationError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "Rf13OperationalAttestationError";
    this.code = code;
  }
}

function fail(code, message) {
  throw new Rf13OperationalAttestationError(code, message);
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(value, expected, label) {
  if (!isRecord(value)
    || JSON.stringify(Object.keys(value).toSorted()) !== JSON.stringify([...expected].toSorted())) {
    fail("RF13_OPERATIONAL_ATTESTATION_INVALID", `${label} fields do not match the closed contract`);
  }
}

function timestamp(value, label) {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString() !== value) {
    fail("RF13_OPERATIONAL_ATTESTATION_INVALID", `${label} must be an ISO timestamp`);
  }
  return parsed;
}

function normalizeReference(reference, expectedSchema) {
  exactKeys(reference, ["path", "sha256", "bytes", "schema_version"], "operational receipt reference");
  if (typeof reference.path !== "string"
    || !SAFE_PATH.test(reference.path)
    || reference.path.startsWith("/")
    || reference.path.includes("\\")
    || reference.path.split("/").some((part) => !part || part === "." || part === "..")
    || !SHA256.test(reference.sha256)
    || !Number.isSafeInteger(reference.bytes)
    || reference.bytes < 1
    || reference.bytes > MAX_OPERATIONAL_CONTENT_BYTES
    || reference.schema_version !== expectedSchema) {
    fail("RF13_OPERATIONAL_ATTESTATION_INVALID", "operational receipt reference is invalid");
  }
  return Object.freeze({
    path: reference.path,
    sha256: reference.sha256,
    bytes: reference.bytes,
    schema_version: reference.schema_version,
  });
}

function normalizeSource(source) {
  exactKeys(source, ["sha", "tree", "dirty"], "operational source");
  if (!isRecord(source)
    || !SHA1.test(source.sha ?? "")
    || !SHA1.test(source.tree ?? "")
    || source.dirty !== false) {
    fail("RF13_OPERATIONAL_ATTESTATION_INVALID", "operational source must be an exact clean SHA/tree");
  }
  return Object.freeze({ sha: source.sha, tree: source.tree, dirty: false });
}

function sameReference(left, right) {
  return left.path === right.path
    && left.sha256 === right.sha256
    && left.bytes === right.bytes
    && left.schema_version === right.schema_version;
}

function sameSource(left, right) {
  return left.sha === right.sha && left.tree === right.tree && left.dirty === false && right.dirty === false;
}

function nonNegativeNumber(value, label) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    fail("RFD_PROFILE_METRICS_INVALID", `${label} must be a finite non-negative number`);
  }
}

export function validateRf13ProfileMetrics(metrics) {
  exactKeys(metrics, [
    "monthly_changes", "operator_minutes_p95", "desktop_reinstall_count", "profile_api_reads", "rollback",
  ], "profile metrics");
  if (!Number.isSafeInteger(metrics.monthly_changes) || metrics.monthly_changes < 0) {
    fail("RFD_PROFILE_METRICS_INVALID", "profile monthly_changes must be a non-negative safe integer");
  }
  nonNegativeNumber(metrics.operator_minutes_p95, "profile operator_minutes_p95");
  if (!Number.isSafeInteger(metrics.desktop_reinstall_count) || metrics.desktop_reinstall_count < 0) {
    fail("RFD_PROFILE_METRICS_INVALID", "profile desktop_reinstall_count must be a non-negative integer");
  }
  exactKeys(metrics.profile_api_reads, ["expected", "passed"], "profile API reads");
  if (metrics.profile_api_reads.expected !== 10
    || !Number.isSafeInteger(metrics.profile_api_reads.passed)
    || metrics.profile_api_reads.passed < 0
    || metrics.profile_api_reads.passed > 10) {
    fail("RFD_PROFILE_METRICS_INVALID", "profile API reads must describe a bounded ten-person cohort");
  }
  exactKeys(metrics.rollback, ["minutes", "exact_hash_match", "profile_reads_passed"], "profile rollback metrics");
  nonNegativeNumber(metrics.rollback.minutes, "profile rollback minutes");
  if (typeof metrics.rollback.exact_hash_match !== "boolean"
    || !Number.isSafeInteger(metrics.rollback.profile_reads_passed)
    || metrics.rollback.profile_reads_passed < 0
    || metrics.rollback.profile_reads_passed > 10) {
    fail("RFD_PROFILE_METRICS_INVALID", "profile rollback metrics are invalid");
  }
  return Object.freeze({
    monthly_changes: metrics.monthly_changes,
    operator_minutes_p95: metrics.operator_minutes_p95,
    desktop_reinstall_count: metrics.desktop_reinstall_count,
    profile_api_reads: Object.freeze({ ...metrics.profile_api_reads }),
    rollback: Object.freeze({ ...metrics.rollback }),
  });
}

export function buildRf13ReceiptAttestationPacket({ purpose, reference, source } = {}) {
  const policy = POLICIES.get(purpose);
  if (!policy || !RECEIPT_PURPOSES.has(purpose)) {
    fail("RF13_OPERATIONAL_ATTESTATION_INVALID", "receipt attestation purpose is not allowlisted");
  }
  return Object.freeze({
    schema_version: RF13_OPERATIONAL_PACKET_SCHEMA,
    purpose,
    receipt: normalizeReference(reference, policy.receiptSchema),
    source: normalizeSource(source),
  });
}

export function buildRf13ProfileMeasurementPacket({ reference, source, generatedAt, metrics } = {}) {
  timestamp(generatedAt, "profile measurement generated_at");
  return Object.freeze({
    schema_version: RF13_PROFILE_MEASUREMENT_PACKET_SCHEMA,
    purpose: RF13_OPERATIONAL_ATTESTATION_POLICIES.profileMeasurement.purpose,
    receipt: normalizeReference(reference, RF13_OPERATIONAL_ATTESTATION_POLICIES.profileMeasurement.receiptSchema),
    source: normalizeSource(source),
    generated_at: generatedAt,
    environment: "PRODUCTION",
    metrics: validateRf13ProfileMetrics(metrics),
  });
}

export function hashRf13OperationalPacket(packet) {
  return createHash("sha256").update(Buffer.from(canonicalizeJson(packet))).digest("hex");
}

export function readRf13OperationalContentReference({ repoRoot, reference, expectedSchema } = {}) {
  const normalized = normalizeReference(reference, expectedSchema);
  if (typeof repoRoot !== "string" || !repoRoot || !normalized.path.startsWith(RF13_EVIDENCE_PREFIX)) {
    fail("RF13_OPERATIONAL_CONTENT_INVALID", "operational content must stay inside the RF13 evidence root");
  }
  const root = realpathSync(resolve(repoRoot));
  const candidate = resolve(root, normalized.path);
  const rel = relative(root, candidate);
  if (rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
    fail("RF13_OPERATIONAL_CONTENT_INVALID", "operational content reference escaped the repository");
  }
  let bytes;
  let descriptor;
  try {
    const sameSnapshot = (left, right) => left.dev === right.dev
      && left.ino === right.ino
      && left.mode === right.mode
      && left.nlink === right.nlink
      && left.size === right.size
      && left.mtimeNs === right.mtimeNs
      && left.ctimeNs === right.ctimeNs;
    const before = lstatSync(candidate, { bigint: true });
    if (!before.isFile() || before.nlink !== 1n || before.size !== BigInt(normalized.bytes)
      || realpathSync(candidate) !== candidate) {
      throw new Error("unsafe operational content file");
    }
    descriptor = openSync(candidate, constants.O_RDONLY
      | (constants.O_CLOEXEC ?? 0)
      | (constants.O_NOFOLLOW ?? 0));
    const opened = fstatSync(descriptor, { bigint: true });
    if (!opened.isFile() || opened.nlink !== 1n || !sameSnapshot(before, opened)) {
      throw new Error("operational content changed before open");
    }
    bytes = Buffer.alloc(normalized.bytes);
    let offset = 0;
    while (offset < bytes.length) {
      const count = readSync(descriptor, bytes, offset, bytes.length - offset, offset);
      if (!Number.isSafeInteger(count) || count <= 0) throw new Error("short operational content read");
      offset += count;
    }
    if (readSync(descriptor, Buffer.alloc(1), 0, 1, bytes.length) !== 0) {
      throw new Error("operational content grew during read");
    }
    const openedAfter = fstatSync(descriptor, { bigint: true });
    const pathAfter = lstatSync(candidate, { bigint: true });
    if (!sameSnapshot(opened, openedAfter) || !sameSnapshot(openedAfter, pathAfter)
      || realpathSync(candidate) !== candidate) {
      throw new Error("operational content changed during read");
    }
  } catch {
    fail("RF13_OPERATIONAL_CONTENT_INVALID", "operational content is not a canonical re-readable file");
  } finally {
    if (descriptor !== undefined) {
      try { closeSync(descriptor); } catch {}
    }
  }
  return validateRf13OperationalPinnedContent({ reference: normalized, bytes, expectedSchema });
}

export function validateRf13OperationalPinnedContent({ reference, bytes, expectedSchema } = {}) {
  const normalized = normalizeReference(reference, expectedSchema);
  if (!Buffer.isBuffer(bytes)
    || bytes.length !== normalized.bytes
    || createHash("sha256").update(bytes).digest("hex") !== normalized.sha256) {
    fail("RF13_OPERATIONAL_CONTENT_INVALID", "operational content bytes or digest drifted");
  }
  let value;
  try { value = JSON.parse(bytes.toString("utf8")); } catch {
    fail("RF13_OPERATIONAL_CONTENT_INVALID", "operational content is not valid JSON");
  }
  if (value?.schema_version !== expectedSchema) {
    fail("RF13_OPERATIONAL_CONTENT_INVALID", "operational content schema drifted");
  }
  return Object.freeze({ reference: normalized, bytes, value });
}

function validateBundle(attestation, { packetRequired }) {
  if (!attestation) fail("RF13_OPERATIONAL_ATTESTATION_REQUIRED", "detached operational attestation is required");
  exactKeys(attestation, packetRequired
    ? ["registryBytes", "receiptBytes", "signatureBytes", "expectedRegistrySha256", "packetBytes"]
    : ["registryBytes", "receiptBytes", "signatureBytes", "expectedRegistrySha256"], "operational attestation bundle");
  for (const field of ["registryBytes", "receiptBytes", "signatureBytes", ...(packetRequired ? ["packetBytes"] : [])]) {
    if (!Buffer.isBuffer(attestation[field]) || attestation[field].length === 0) {
      fail("RF13_OPERATIONAL_ATTESTATION_INVALID", `${field} must contain detached attestation bytes`);
    }
  }
  if (!SHA256.test(attestation.expectedRegistrySha256 ?? "")) {
    fail("RF13_OPERATIONAL_ATTESTATION_INVALID", "the external trust-registry digest is invalid");
  }
}

function verifyPacketAttestation({ policy, packet, source, attestation, packetRequired }) {
  validateBundle(attestation, { packetRequired });
  const validationTime = Date.now();
  let validation;
  try {
    validation = validateRuntimeSafetyApprovalPayload({
      registryBytes: attestation.registryBytes,
      receiptBytes: attestation.receiptBytes,
      signatureBytes: attestation.signatureBytes,
      expectedRegistrySha256: attestation.expectedRegistrySha256,
      expectedRole: policy.role,
      expectedAction: policy.action,
      expectedEnvironment: policy.environment,
      expectedPacketSha256: hashRf13OperationalPacket(packet),
      expectedSourceSha: source.sha,
      expectedSourceTree: source.tree,
      allowedDataScope: [],
      allowedContactScope: [],
      now: validationTime,
    });
  } catch {
    fail("RF13_OPERATIONAL_ATTESTATION_INVALID", "detached operational attestation is not trusted");
  }
  if (validation.decision !== "approved" || timestamp(validation.signed_at, "operational signed_at") > validationTime) {
    fail("RF13_OPERATIONAL_ATTESTATION_INVALID", "operational attestation is rejected or future-dated");
  }
  let keyFingerprintSha256;
  try {
    const registry = JSON.parse(attestation.registryBytes.toString("utf8"));
    const key = registry.keys.find(({ key_id: keyId }) => keyId === validation.key_id);
    const publicKey = createPublicKey(key.public_key_spki_pem).export({ type: "spki", format: "der" });
    keyFingerprintSha256 = createHash("sha256").update(publicKey).digest("hex");
  } catch {
    fail("RF13_OPERATIONAL_ATTESTATION_INVALID", "operational attestation key identity is invalid");
  }
  return Object.freeze({
    packet_sha256: hashRf13OperationalPacket(packet),
    registry_sha256: validation.registry_sha256,
    approval_receipt_sha256: validation.receipt_sha256,
    signature_sha256: createHash("sha256").update(attestation.signatureBytes).digest("hex"),
    approval_id: validation.approval_id,
    key_id: validation.key_id,
    key_fingerprint_sha256: keyFingerprintSha256,
    signed_at: validation.signed_at,
    expires_at: validation.expires_at,
  });
}

export function validateRf13ReceiptAttestation({ purpose, reference, source, attestation } = {}) {
  const policy = POLICIES.get(purpose);
  if (!policy || !RECEIPT_PURPOSES.has(purpose)) {
    fail("RF13_OPERATIONAL_ATTESTATION_INVALID", "receipt attestation purpose is not allowlisted");
  }
  const normalizedSource = normalizeSource(source);
  const packet = buildRf13ReceiptAttestationPacket({ purpose, reference, source });
  return verifyPacketAttestation({ policy, packet, source: normalizedSource, attestation, packetRequired: false });
}

export function validateRf13ProfileMeasurementAttestation({ reference, source, attestation } = {}) {
  validateBundle(attestation, { packetRequired: true });
  let supplied;
  try { supplied = JSON.parse(attestation.packetBytes.toString("utf8")); } catch {
    fail("RF13_OPERATIONAL_ATTESTATION_INVALID", "profile measurement packet is not valid JSON");
  }
  exactKeys(supplied, [
    "schema_version", "purpose", "receipt", "source", "generated_at", "environment", "metrics",
  ], "profile measurement packet");
  const expected = buildRf13ProfileMeasurementPacket({
    reference: supplied.receipt,
    source: { ...supplied.source },
    generatedAt: supplied.generated_at,
    metrics: supplied.metrics,
  });
  const normalizedReference = normalizeReference(
    reference,
    RF13_OPERATIONAL_ATTESTATION_POLICIES.profileMeasurement.receiptSchema,
  );
  const normalizedSource = normalizeSource(source);
  if (supplied.schema_version !== RF13_PROFILE_MEASUREMENT_PACKET_SCHEMA
    || supplied.purpose !== RF13_OPERATIONAL_ATTESTATION_POLICIES.profileMeasurement.purpose
    || supplied.environment !== "PRODUCTION"
    || !sameReference(expected.receipt, normalizedReference)
    || !sameSource(expected.source, normalizedSource)) {
    fail("RF13_OPERATIONAL_ATTESTATION_INVALID", "profile measurement packet binding is invalid");
  }
  const authority = verifyPacketAttestation({
    policy: RF13_OPERATIONAL_ATTESTATION_POLICIES.profileMeasurement,
    packet: expected,
    source: normalizedSource,
    attestation,
    packetRequired: true,
  });
  if (timestamp(expected.generated_at, "profile measurement generated_at") > timestamp(authority.signed_at, "measurement signed_at")) {
    fail("RF13_OPERATIONAL_ATTESTATION_INVALID", "measurement cannot be signed before it was generated");
  }
  return Object.freeze({
    generated_at: expected.generated_at,
    environment: expected.environment,
    metrics: expected.metrics,
    attestation: authority,
  });
}
