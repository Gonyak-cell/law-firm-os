import { execFileSync } from "node:child_process";
import {
  constants as cryptoConstants,
  createCipheriv,
  createDecipheriv,
  createHash,
  createPrivateKey,
  createPublicKey,
  privateDecrypt,
  publicEncrypt,
  randomBytes,
} from "node:crypto";
import {
  closeSync,
  existsSync,
  fsyncSync,
  linkSync,
  lstatSync,
  mkdirSync,
  openSync,
  readdirSync,
  renameSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import {
  WINDOWS_UPDATE_EXECUTION_INPUT_SCHEMA,
  WINDOWS_UPDATE_EXECUTION_MODE,
} from "./windows-formal-update-admission.mjs";
import { validateWindowsFormalUpdateRunnerPassReceipt } from "./windows-formal-update-runner.mjs";
import {
  readTrustedFileSnapshot,
  resolveTrustedRoot,
} from "./external-release-trust.mjs";
import {
  WINDOWS_SIGNED_ARTIFACT_HANDOFF_ACCOUNT,
  WINDOWS_SIGNED_ARTIFACT_HANDOFF_REGION,
  validateWindowsSignedArtifactPrivateHandoffReceipt,
} from "./windows-signed-artifact-private-handoff.mjs";
import {
  WINDOWS_UPDATE_PRIVATE_LOCATOR_ARTIFACT_REF_SCHEMA,
  WINDOWS_UPDATE_PRIVATE_LOCATOR_ENVELOPE_SCHEMA,
  WINDOWS_UPDATE_PRIVATE_LOCATOR_FILES,
  WINDOWS_UPDATE_PRIVATE_LOCATOR_JOB,
  WINDOWS_UPDATE_PRIVATE_LOCATOR_WORKFLOW_REF,
  createWindowsFormalUpdatePrivateLocatorEnvelopeAad,
  validateWindowsFormalUpdatePrivateLocatorArtifactRef,
  validateWindowsFormalUpdatePrivateLocatorEnvelope,
} from "./windows-formal-update-private-locator-sealer.mjs";

export const WINDOWS_UPDATE_PRIVATE_LOCATOR_SCHEMA =
  "law-firm-os.windows-formal-update-private-locator.v1";
export const WINDOWS_UPDATE_HANDOFF_CONSUMER_RECEIPT_SCHEMA =
  "law-firm-os.windows-formal-update-private-consumer.v1";
export const WINDOWS_UPDATE_ENCRYPTED_BRIDGE_SCHEMA =
  "law-firm-os.windows-formal-update-encrypted-bridge.v1";
export const WINDOWS_UPDATE_LOCATOR_SOURCE_RECEIPT_SCHEMA =
  "law-firm-os.windows-formal-update-private-locator-source.v1";
export const WINDOWS_UPDATE_PROVIDER_CALL_STATE_SCHEMA =
  "law-firm-os.windows-formal-update-provider-call-state.v1";

const SHA256 = /^[0-9a-f]{64}$/u;
const BUCKET = /^(?!.*\.\.)(?!.*\.-)(?!.*-\.)(?!\d+\.\d+\.\d+\.\d+$)[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/u;
const KMS_ARN = /^arn:aws:kms:ap-northeast-2:770880870480:key\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const READER_ROLE_ARN = /^arn:aws:iam::770880870480:role\/[A-Za-z0-9+=,.@_/-]{1,512}$/u;
const PRIVATE_RECEIPT_LOCATOR_SCHEMA =
  "law-firm-os.windows-signed-artifact-private-handoff-locator.v1";
const MINIMUM_RETENTION_MS = 365 * 24 * 60 * 60 * 1_000;
const MAXIMUM_RETENTION_MS = 3650 * 24 * 60 * 60 * 1_000;
const BRIDGE_MAXIMUM_AGE_MS = 24 * 60 * 60 * 1_000;
const RUN_BINDING = /^Gonyak-cell\/law-firm-os:[1-9][0-9]{0,19}:[1-9][0-9]{0,9}:[0-9a-f]{40}:[0-9a-f]{40}$/u;
const POSITIVE_DECIMAL = /^[1-9][0-9]*$/u;
const SHA256_PREFIXED = /^sha256:[0-9a-f]{64}$/u;
const AGGREGATE_LOCATOR_WORKFLOW_NAME = "Windows Formal Update Private Locator Seal";
const AGGREGATE_LOCATOR_JOB_NAME = "Seal exact 19-object private update locator";
const AGGREGATE_LOCATOR_TOKEN_PERMISSION = "actions=read";
const AGGREGATE_LOCATOR_MAXIMUM_AGE_MS = 30 * 24 * 60 * 60 * 1_000;
const NATIVE_FIXED_POINT_SEQUENCE = Object.freeze(["B0", "I1", "B1", "I2", "B2"]);
const NATIVE_FIXED_POINT_EQUALITY_PROOF =
  "B0_I1_B1_I2_B2_PUBLIC_AND_PRIVATE_MANIFEST_EXACT_EQUALITY";
const INSTALLED_TREE_FIELDS = Object.freeze([
  "bytes", "content_sha256", "directory_count", "file_count", "identity_sha256",
  "installed_executable_bytes", "installed_executable_path", "installed_executable_sha256", "schema_version",
]);
const INSTALLED_TREE_PORTABLE_FIELDS = Object.freeze(
  INSTALLED_TREE_FIELDS.filter((field) => field !== "identity_sha256"),
);
const GOVERNANCE_OBJECT_FIELDS = [
  "bytes", "key", "object_lock_mode", "provider_checksum_sha256", "relative_path",
  "retain_until", "sha256", "version_id",
];
const MATERIALIZED_PATH_FIELDS = [
  "build_manifest", "installed_tree_sbom", "installer", "native_package_qa",
];
const PRIVATE_ARTIFACT_KINDS = [...MATERIALIZED_PATH_FIELDS];
const FIXED_GOVERNANCE_PATHS = Object.freeze({
  execution_input: "governance/execution-input.json",
  approval_receipt: "governance/approval-receipt.json",
  approval_signature: "governance/approval-receipt.json.sig",
});

export class WindowsFormalUpdateHandoffError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "WindowsFormalUpdateHandoffError";
    this.code = code;
  }
}

function fail(code, message) {
  throw new WindowsFormalUpdateHandoffError(code, message);
}

function requireCondition(condition, code, message) {
  if (!condition) fail(code, message);
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(value, fields, label) {
  requireCondition(
    isRecord(value) && Object.keys(value).sort().join("\0") === [...fields].sort().join("\0"),
    "WINDOWS_HANDOFF_LOCATOR_SCHEMA_INVALID",
    `${label} must use the exact closed schema`,
  );
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function checksumForDigest(digest) {
  return Buffer.from(digest, "hex").toString("base64");
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (isRecord(value)) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function canonicalBase64(value, label) {
  requireCondition(
    typeof value === "string" && /^[A-Za-z0-9+/]+={0,2}$/u.test(value),
    "WINDOWS_HANDOFF_BRIDGE_BASE64_INVALID",
    `${label} must be canonical base64`,
  );
  const bytes = Buffer.from(value, "base64");
  requireCondition(
    bytes.length > 0 && bytes.toString("base64") === value,
    "WINDOWS_HANDOFF_BRIDGE_BASE64_INVALID",
    `${label} must be canonical base64`,
  );
  return bytes;
}

function canonicalUtc(value, label, now) {
  requireCondition(typeof value === "string", "WINDOWS_HANDOFF_RETENTION_INVALID", `${label} is invalid`);
  const parsed = new Date(value);
  requireCondition(
    !Number.isNaN(parsed.valueOf()) && parsed.toISOString() === value,
    "WINDOWS_HANDOFF_RETENTION_INVALID",
    `${label} must be canonical UTC`,
  );
  if (now !== undefined) {
    requireCondition(parsed.valueOf() > now, "WINDOWS_HANDOFF_RETENTION_EXPIRED", `${label} is expired`);
  }
  return value;
}

function safeRelative(value, label, suffix) {
  requireCondition(
    typeof value === "string" && value.length <= 256 && /^[0-9A-Za-z._/-]+$/u.test(value),
    "WINDOWS_HANDOFF_MATERIALIZED_PATH_INVALID",
    `${label} is invalid`,
  );
  const normalized = value.replaceAll("\\", "/");
  const segments = normalized.split("/");
  requireCondition(
    !path.posix.isAbsolute(normalized)
      && normalized.toLowerCase().endsWith(suffix)
      && segments.every((segment) => {
        const windowsStem = segment.split(".", 1)[0].toUpperCase();
        return segment
          && ![".", ".."].includes(segment)
          && !segment.endsWith(".")
          && !/^(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/u.test(windowsStem);
      }),
    "WINDOWS_HANDOFF_MATERIALIZED_PATH_INVALID",
    `${label} must be a safe relative ${suffix} path`,
  );
  return normalized;
}

function validVersionId(value) {
  return typeof value === "string"
    && value.length >= 1
    && value.length <= 1024
    && !/[\0-\x1f\x7f]/u.test(value)
    && value !== "null";
}

function validKey(value, digest) {
  return typeof value === "string"
    && value.length >= 1
    && value.length <= 1024
    && !value.startsWith("/")
    && !/[\0-\x1f\x7f]/u.test(value)
    && value.includes(`/sha256/${digest}/`);
}

function validateCommonObject({ value, label, now }) {
  requireCondition(SHA256.test(value.sha256 ?? ""), "WINDOWS_HANDOFF_OBJECT_DIGEST_INVALID", `${label} digest is invalid`);
  requireCondition(Number.isSafeInteger(value.bytes) && value.bytes > 0, "WINDOWS_HANDOFF_OBJECT_BYTES_INVALID", `${label} byte count is invalid`);
  requireCondition(validKey(value.key, value.sha256), "WINDOWS_HANDOFF_OBJECT_KEY_INVALID", `${label} key is not digest-addressed`);
  requireCondition(validVersionId(value.version_id), "WINDOWS_HANDOFF_VERSION_ID_INVALID", `${label} VersionId is invalid`);
  requireCondition(
    value.provider_checksum_sha256 === checksumForDigest(value.sha256),
    "WINDOWS_HANDOFF_PROVIDER_CHECKSUM_INVALID",
    `${label} provider checksum is invalid`,
  );
  requireCondition(value.object_lock_mode === "COMPLIANCE", "WINDOWS_HANDOFF_OBJECT_LOCK_INVALID", `${label} Object Lock mode is invalid`);
  canonicalUtc(value.retain_until, `${label} retain_until`, now);
  const remainingRetention = Date.parse(value.retain_until) - now;
  requireCondition(
    remainingRetention >= MINIMUM_RETENTION_MS && remainingRetention <= MAXIMUM_RETENTION_MS,
    "WINDOWS_HANDOFF_RETENTION_WINDOW_INVALID",
    `${label} retention must remain between 365 days and 10 years`,
  );
  return value;
}

function validateGovernanceObject(value, { label, expectedPath, suffix, now }) {
  exactKeys(value, GOVERNANCE_OBJECT_FIELDS, label);
  const relativePath = safeRelative(value.relative_path, `${label}.relative_path`, suffix);
  if (expectedPath) {
    requireCondition(relativePath === expectedPath, "WINDOWS_HANDOFF_MATERIALIZED_PATH_INVALID", `${label} path is invalid`);
  }
  validateCommonObject({ value, label, now });
  requireCondition(
    value.key.startsWith("windows/governance/v1/"),
    "WINDOWS_HANDOFF_OBJECT_KEY_INVALID",
    `${label} key must use the frozen Windows governance prefix`,
  );
  return Object.freeze({ ...value, relative_path: relativePath });
}

function validatePrivateReceiptLocator(value, { role, locator, now }) {
  exactKeys(value, [
    "account_id", "bucket", "bytes", "key", "kms_key_arn", "object_lock_mode",
    "provider_checksum_sha256", "region", "retain_until", "schema_version",
    "server_side_encryption", "sha256", "version_id",
  ], `locator.candidates.${role}.private_handoff_locator`);
  requireCondition(
    value.schema_version === PRIVATE_RECEIPT_LOCATOR_SCHEMA
      && value.account_id === locator.account_id
      && value.region === locator.region
      && value.bucket === locator.bucket
      && value.kms_key_arn === locator.kms_key_arn
      && value.server_side_encryption === "aws:kms",
    "WINDOWS_HANDOFF_PRIVATE_RECEIPT_LOCATOR_INVALID",
    `private ${role} receipt locator differs from the aggregate locator`,
  );
  const object = {
    id: `${role}_private_handoff_receipt`,
    relative_path: `private-receipts/${role}/windows-signed-artifact-private-handoff.json`,
    key: value.key,
    version_id: value.version_id,
    sha256: value.sha256,
    bytes: value.bytes,
    provider_checksum_sha256: value.provider_checksum_sha256,
    object_lock_mode: value.object_lock_mode,
    retain_until: value.retain_until,
  };
  validateCommonObject({ value: object, label: `private ${role} receipt locator`, now });
  requireCondition(
    object.key === `windows/signed/v1/${locator.candidates[role].source_sha}/${locator.candidates[role].version}/${role}/private_handoff_receipt/sha256/${object.sha256}/windows-signed-artifact-private-handoff.json`,
    "WINDOWS_HANDOFF_PRIVATE_RECEIPT_LOCATOR_INVALID",
    `private ${role} receipt key is not the frozen content-addressed key`,
  );
  return Object.freeze(object);
}

function validateCandidate(value, { role, locator, now }) {
  exactKeys(value, [
    "materialized_paths", "private_handoff_locator", "release_manifest", "source_sha",
    "source_tree", "update_metadata", "update_metadata_signature", "version",
  ], `locator.candidates.${role}`);
  exactKeys(value.materialized_paths, MATERIALIZED_PATH_FIELDS, `locator.candidates.${role}.materialized_paths`);
  requireCondition(
    /^[0-9a-f]{40}$/u.test(value.source_sha ?? "")
      && /^[0-9a-f]{40}$/u.test(value.source_tree ?? "")
      && /^[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?$/u.test(value.version ?? ""),
    "WINDOWS_HANDOFF_CANDIDATE_IDENTITY_INVALID",
    `private ${role} candidate identity is invalid`,
  );
  const suffixes = {
    installer: ".exe",
    build_manifest: ".json",
    native_package_qa: ".json",
    installed_tree_sbom: ".json",
  };
  for (const [kind, suffix] of Object.entries(suffixes)) {
    safeRelative(value.materialized_paths[kind], `${role} ${kind}`, suffix);
  }
  const objects = [validatePrivateReceiptLocator(value.private_handoff_locator, { role, locator, now })];
  objects.push(Object.freeze({
    id: `${role}_release_manifest`,
    ...validateGovernanceObject(value.release_manifest, { label: `${role} release manifest`, suffix: ".json", now }),
  }));
  objects.push(Object.freeze({
    id: `${role}_update_metadata`,
    ...validateGovernanceObject(value.update_metadata, { label: `${role} update metadata`, suffix: ".json", now }),
  }));
  objects.push(Object.freeze({
    id: `${role}_update_metadata_signature`,
    ...validateGovernanceObject(value.update_metadata_signature, { label: `${role} update metadata signature`, suffix: ".sig", now }),
  }));
  return Object.freeze({
    identity: Object.freeze({
      source_sha: value.source_sha,
      source_tree: value.source_tree,
      version: value.version,
      release_manifest_sha256: value.release_manifest.sha256,
      release_manifest_bytes: value.release_manifest.bytes,
      update_metadata_sha256: value.update_metadata.sha256,
      update_metadata_bytes: value.update_metadata.bytes,
      update_metadata_signature_sha256: value.update_metadata_signature.sha256,
      update_metadata_signature_bytes: value.update_metadata_signature.bytes,
    }),
    objects: Object.freeze(objects),
  });
}

export function validateWindowsFormalUpdatePrivateLocator(locator, {
  expectedReaderRoleArn,
  expectedBucket,
  expectedKmsKeyArn,
  now = Date.now(),
} = {}) {
  exactKeys(locator, [
    "account_id", "bucket", "candidates", "claim_policy", "governance", "kms_key_arn",
    "reader_role_arn", "region", "schema_version",
  ], "Windows update private locator");
  requireCondition(locator.schema_version === WINDOWS_UPDATE_PRIVATE_LOCATOR_SCHEMA, "WINDOWS_HANDOFF_LOCATOR_SCHEMA_INVALID", "private locator schema is invalid");
  requireCondition(locator.account_id === WINDOWS_SIGNED_ARTIFACT_HANDOFF_ACCOUNT, "WINDOWS_HANDOFF_ACCOUNT_INVALID", "private locator AWS account is invalid");
  requireCondition(locator.region === WINDOWS_SIGNED_ARTIFACT_HANDOFF_REGION, "WINDOWS_HANDOFF_REGION_INVALID", "private locator AWS region is invalid");
  requireCondition(BUCKET.test(locator.bucket ?? "") && locator.bucket === expectedBucket, "WINDOWS_HANDOFF_BUCKET_INVALID", "private locator bucket differs from the protected binding");
  requireCondition(KMS_ARN.test(locator.kms_key_arn ?? "") && locator.kms_key_arn === expectedKmsKeyArn, "WINDOWS_HANDOFF_KMS_INVALID", "private locator KMS key ARN differs from the protected binding");
  requireCondition(READER_ROLE_ARN.test(locator.reader_role_arn ?? "") && locator.reader_role_arn === expectedReaderRoleArn, "WINDOWS_HANDOFF_READER_ROLE_INVALID", "private locator reader role is invalid");
  exactKeys(locator.claim_policy, [
    "automatic_update", "external_distribution", "private_distribution", "production_go_live",
    "public_release",
  ], "private locator claim_policy");
  requireCondition(
    locator.claim_policy.private_distribution === true
      && locator.claim_policy.automatic_update === false
      && locator.claim_policy.public_release === false
      && locator.claim_policy.external_distribution === false
      && locator.claim_policy.production_go_live === false,
    "WINDOWS_HANDOFF_CLAIM_POLICY_INVALID",
    "private locator claim policy is invalid",
  );
  exactKeys(locator.candidates, ["baseline", "target"], "private locator candidates");
  const candidates = Object.fromEntries(["baseline", "target"].map((role) => [
    role,
    validateCandidate(locator.candidates[role], { role, locator, now }),
  ]));
  exactKeys(locator.governance, ["approval_receipt", "approval_signature", "execution_input"], "private locator governance");
  const governance = Object.fromEntries(Object.entries(FIXED_GOVERNANCE_PATHS).map(([name, expectedPath]) => [
    name,
    Object.freeze({
      id: name,
      ...validateGovernanceObject(locator.governance[name], {
        label: `governance ${name}`,
        expectedPath,
        suffix: name === "approval_signature" ? ".sig" : ".json",
        now,
      }),
    }),
  ]));
  const objects = Object.freeze([
    ...candidates.baseline.objects,
    ...candidates.target.objects,
    ...Object.values(governance),
  ]);
  const paths = [
    ...objects.map(({ relative_path: value }) => value),
    ...["baseline", "target"].flatMap((role) => (
      Object.values(locator.candidates[role].materialized_paths)
    )),
  ].map((value) => value.toLowerCase());
  requireCondition(new Set(paths).size === paths.length, "WINDOWS_HANDOFF_MATERIALIZED_PATH_DUPLICATE", "private locator materialized paths must be unique on Windows");
  const objectVersions = objects.map(({ key, version_id: versionId }) => `${key}\0${versionId}`);
  requireCondition(new Set(objectVersions).size === objectVersions.length, "WINDOWS_HANDOFF_OBJECT_DUPLICATE", "private locator object versions must be distinct");
  return Object.freeze({
    locator,
    candidates: Object.freeze(candidates),
    governance: Object.freeze(governance),
    objects,
    receipt_objects: Object.freeze([
      candidates.baseline.objects[0],
      candidates.target.objects[0],
    ]),
  });
}

export function parseWindowsFormalUpdatePrivateLocatorJson(rawJson, {
  expectedSha256,
  expectedReaderRoleArn,
  expectedBucket,
  expectedKmsKeyArn,
  now = Date.now(),
} = {}) {
  requireCondition(typeof rawJson === "string" && !rawJson.includes("\0"), "WINDOWS_HANDOFF_LOCATOR_JSON_INVALID", "private locator JSON is required");
  const bytes = Buffer.from(rawJson, "utf8");
  requireCondition(SHA256.test(expectedSha256 ?? "") && sha256(bytes) === expectedSha256, "WINDOWS_HANDOFF_LOCATOR_DIGEST_MISMATCH", "private locator digest differs from the public dispatch binding");
  let locator;
  try {
    locator = JSON.parse(rawJson);
  } catch {
    fail("WINDOWS_HANDOFF_LOCATOR_JSON_INVALID", "private locator is not valid JSON");
  }
  requireCondition(JSON.stringify(locator) === rawJson, "WINDOWS_HANDOFF_LOCATOR_JSON_NOT_CANONICAL", "private locator must use canonical compact JSON bytes");
  return Object.freeze({
    raw_sha256: expectedSha256,
    ...validateWindowsFormalUpdatePrivateLocator(locator, {
      expectedReaderRoleArn,
      expectedBucket,
      expectedKmsKeyArn,
      now,
    }),
  });
}

export function parseWindowsFormalUpdatePrivateLocatorArtifactRefJson(rawJson, {
  expectedSourceSha,
  expectedSourceTree,
} = {}) {
  requireCondition(
    typeof rawJson === "string" && rawJson.length > 1 && !rawJson.includes("\0"),
    "WINDOWS_HANDOFF_LOCATOR_ARTIFACT_REF_INVALID",
    "aggregate locator artifact ref JSON is required",
  );
  let parsed;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    fail("WINDOWS_HANDOFF_LOCATOR_ARTIFACT_REF_INVALID", "aggregate locator artifact ref is not valid JSON");
  }
  let ref;
  try {
    ref = validateWindowsFormalUpdatePrivateLocatorArtifactRef(parsed);
  } catch {
    fail("WINDOWS_HANDOFF_LOCATOR_ARTIFACT_REF_INVALID", "aggregate locator artifact ref is invalid");
  }
  requireCondition(
    ref.schema_version === WINDOWS_UPDATE_PRIVATE_LOCATOR_ARTIFACT_REF_SCHEMA
      && ref.producer_repository === "Gonyak-cell/law-firm-os"
      && ref.producer_workflow_ref === WINDOWS_UPDATE_PRIVATE_LOCATOR_WORKFLOW_REF
      && ref.producer_job === WINDOWS_UPDATE_PRIVATE_LOCATOR_JOB
      && ref.source_sha === expectedSourceSha
      && ref.source_tree === expectedSourceTree,
    "WINDOWS_HANDOFF_LOCATOR_ARTIFACT_REF_INVALID",
    "aggregate locator artifact ref differs from the reviewed consumer source",
  );
  return Object.freeze({
    ref,
    artifact_ref_sha256: sha256(Buffer.from(canonicalJson(ref), "utf8")),
  });
}

function readJsonSnapshot(root, relativePath, label) {
  const snapshot = readTrustedFileSnapshot(root, relativePath);
  try {
    return Object.freeze({ snapshot, value: JSON.parse(snapshot.bytes.toString("utf8")) });
  } catch {
    fail("WINDOWS_HANDOFF_LOCATOR_ARTIFACT_INVALID", `${label} is not valid JSON`);
  }
}

function requireExactDirectoryEntries(root, expected, label) {
  const resolved = resolveTrustedRoot(root);
  requireCondition(
    readdirSync(resolved).sort().join("\0") === [...expected].sort().join("\0"),
    "WINDOWS_HANDOFF_LOCATOR_ARTIFACT_INVALID",
    `${label} must contain only the frozen file set`,
  );
  return resolved;
}

function acceptedActionsReadPermission(headers, label) {
  requireCondition(
    typeof headers === "string"
      && headers.split(/\r?\n/u).some((line) => (
        /^x-accepted-github-permissions:/iu.test(line)
          && line.toLowerCase().includes(AGGREGATE_LOCATOR_TOKEN_PERMISSION)
      )),
    "WINDOWS_HANDOFF_LOCATOR_TOKEN_SCOPE_INVALID",
    `${label} did not read back the exact Actions read permission`,
  );
}

function validateAggregateLocatorArtifactFiles({ artifactDir, artifactRef, expectedWrappingKeyArn, now }) {
  const root = requireExactDirectoryEntries(artifactDir, [
    WINDOWS_UPDATE_PRIVATE_LOCATOR_FILES.aggregate_envelope,
    WINDOWS_UPDATE_PRIVATE_LOCATOR_FILES.aggregate_ciphertext,
  ], "aggregate locator artifact");
  const envelopeSnapshot = readTrustedFileSnapshot(root, WINDOWS_UPDATE_PRIVATE_LOCATOR_FILES.aggregate_envelope);
  let envelope;
  try {
    envelope = validateWindowsFormalUpdatePrivateLocatorEnvelope(
      JSON.parse(envelopeSnapshot.bytes.toString("utf8")),
    );
  } catch {
    fail("WINDOWS_HANDOFF_LOCATOR_ENVELOPE_INVALID", "aggregate private locator envelope is invalid");
  }
  requireCondition(
    envelopeSnapshot.bytes.equals(Buffer.from(`${JSON.stringify(envelope, null, 2)}\n`, "utf8"))
      && sha256(envelopeSnapshot.bytes) === artifactRef.envelope_sha256
      && envelope.schema_version === WINDOWS_UPDATE_PRIVATE_LOCATOR_ENVELOPE_SCHEMA
      && envelope.producer_repository === artifactRef.producer_repository
      && envelope.producer_workflow_ref === artifactRef.producer_workflow_ref
      && envelope.producer_job === artifactRef.producer_job
      && envelope.producer_run_id === artifactRef.producer_run_id
      && envelope.producer_run_attempt === artifactRef.producer_run_attempt
      && envelope.source_sha === artifactRef.source_sha
      && envelope.source_tree === artifactRef.source_tree
      && envelope.private_locator_sha256 === artifactRef.private_locator_sha256
      && envelope.wrapping_public_key_sha256 === artifactRef.wrapping_public_key_sha256
      && envelope.wrapping_key_arn === expectedWrappingKeyArn,
    "WINDOWS_HANDOFF_LOCATOR_ENVELOPE_INVALID",
    "aggregate locator envelope differs from its exact public ref or protected KMS binding",
  );
  const generatedAt = Date.parse(envelope.generated_at);
  requireCondition(
    Number.isSafeInteger(now)
      && Number.isFinite(generatedAt)
      && generatedAt <= now
      && now - generatedAt <= AGGREGATE_LOCATOR_MAXIMUM_AGE_MS,
    "WINDOWS_HANDOFF_LOCATOR_ENVELOPE_EXPIRED",
    "aggregate locator envelope is expired or from the future",
  );
  const ciphertextSnapshot = readTrustedFileSnapshot(root, WINDOWS_UPDATE_PRIVATE_LOCATOR_FILES.aggregate_ciphertext);
  requireCondition(
    ciphertextSnapshot.bytes.length === envelope.ciphertext_bytes
      && sha256(ciphertextSnapshot.bytes) === envelope.ciphertext_sha256,
    "WINDOWS_HANDOFF_LOCATOR_CIPHERTEXT_INVALID",
    "aggregate locator ciphertext body differs from its envelope",
  );
  return Object.freeze({ root, envelope, envelopeSnapshot, ciphertextSnapshot });
}

function positiveIdentity(value) {
  return Number.isSafeInteger(value) && value > 0;
}

export function verifyWindowsFormalUpdatePrivateLocatorSource({
  artifactRef,
  artifactRefSha256,
  sourceRoot,
  expectedWrappingKeyArn,
  now = Date.now(),
  actionsReadTokenPresent = false,
} = {}) {
  requireCondition(
    artifactRef?.schema_version === WINDOWS_UPDATE_PRIVATE_LOCATOR_ARTIFACT_REF_SCHEMA
      && SHA256.test(artifactRefSha256 ?? "")
      && KMS_ARN.test(expectedWrappingKeyArn ?? "")
      && actionsReadTokenPresent === false,
    "WINDOWS_HANDOFF_LOCATOR_ARTIFACT_INVALID",
    "complete aggregate locator source inputs are required after the Actions token is cleared",
  );
  const root = requireExactDirectoryEntries(sourceRoot, ["aggregate.zip", "artifact", "metadata"], "aggregate locator source root");
  const metadataRoot = requireExactDirectoryEntries(path.join(root, "metadata"), [
    "artifact.headers", "artifact.json", "jobs.headers", "jobs.json", "run.headers", "run.json",
  ], "aggregate locator metadata root");
  const run = readJsonSnapshot(metadataRoot, "run.json", "aggregate locator workflow run").value;
  const artifact = readJsonSnapshot(metadataRoot, "artifact.json", "aggregate locator artifact metadata").value;
  const jobs = readJsonSnapshot(metadataRoot, "jobs.json", "aggregate locator workflow jobs").value;
  for (const name of ["run", "artifact", "jobs"]) {
    acceptedActionsReadPermission(
      readTrustedFileSnapshot(metadataRoot, `${name}.headers`).bytes.toString("utf8"),
      `${name} metadata response`,
    );
  }
  requireCondition(
    String(run?.id) === artifactRef.producer_run_id
      && String(run?.run_attempt) === artifactRef.producer_run_attempt
      && run?.name === AGGREGATE_LOCATOR_WORKFLOW_NAME
      && run?.path === ".github/workflows/windows-formal-update-private-locator-seal.yml"
      && run?.event === "workflow_dispatch"
      && run?.status === "completed"
      && run?.conclusion === "success"
      && run?.head_branch === "main"
      && run?.head_sha === artifactRef.source_sha
      && run?.repository?.full_name === artifactRef.producer_repository,
    "WINDOWS_HANDOFF_LOCATOR_RUN_METADATA_INVALID",
    "aggregate locator producer run metadata differs",
  );
  const matchingJobs = Array.isArray(jobs?.jobs) ? jobs.jobs.filter((job) => (
    job?.name === AGGREGATE_LOCATOR_JOB_NAME
      && job?.status === "completed"
      && job?.conclusion === "success"
      && job?.head_sha === artifactRef.source_sha
      && (!Object.hasOwn(job, "run_attempt") || String(job.run_attempt) === artifactRef.producer_run_attempt)
  )) : [];
  requireCondition(matchingJobs.length === 1, "WINDOWS_HANDOFF_LOCATOR_JOB_METADATA_INVALID", "aggregate locator producer job metadata differs");
  requireCondition(
    String(artifact?.id) === artifactRef.artifact_id
      && artifact?.name === artifactRef.artifact_name
      && artifact?.expired === false
      && artifact?.digest === artifactRef.artifact_digest
      && positiveIdentity(artifact?.size_in_bytes)
      && String(artifact?.workflow_run?.id) === artifactRef.producer_run_id
      && artifact?.workflow_run?.head_sha === artifactRef.source_sha
      && artifact?.workflow_run?.head_branch === "main",
    "WINDOWS_HANDOFF_LOCATOR_ARTIFACT_METADATA_INVALID",
    "aggregate locator artifact metadata differs",
  );
  const archive = readTrustedFileSnapshot(root, "aggregate.zip");
  requireCondition(
    SHA256_PREFIXED.test(artifactRef.artifact_digest)
      && `sha256:${sha256(archive.bytes)}` === artifactRef.artifact_digest,
    "WINDOWS_HANDOFF_LOCATOR_ARCHIVE_DIGEST_MISMATCH",
    "aggregate locator raw ZIP digest differs",
  );
  const files = validateAggregateLocatorArtifactFiles({
    artifactDir: path.join(root, "artifact"),
    artifactRef,
    expectedWrappingKeyArn,
    now,
  });
  return Object.freeze({
    schema_version: WINDOWS_UPDATE_LOCATOR_SOURCE_RECEIPT_SCHEMA,
    generated_at: new Date(now).toISOString(),
    verdict: "PASS",
    state: "PENDING_CLEANUP",
    artifact_ref_sha256: artifactRefSha256,
    producer: Object.freeze({
      repository: artifactRef.producer_repository,
      workflow_ref: artifactRef.producer_workflow_ref,
      job: artifactRef.producer_job,
      run_id: artifactRef.producer_run_id,
      run_attempt: artifactRef.producer_run_attempt,
      source_sha: artifactRef.source_sha,
      source_tree: artifactRef.source_tree,
    }),
    artifact: Object.freeze({
      name: artifactRef.artifact_name,
      id: artifactRef.artifact_id,
      digest: artifactRef.artifact_digest,
      envelope_sha256: artifactRef.envelope_sha256,
      private_locator_sha256: artifactRef.private_locator_sha256,
      wrapping_public_key_sha256: artifactRef.wrapping_public_key_sha256,
    }),
    verification: Object.freeze({
      token_permission: "actions:read",
      run_metadata_verified: true,
      job_metadata_verified: true,
      artifact_metadata_verified: true,
      raw_archive_digest_verified: true,
      exact_file_set_verified: true,
      envelope_verified: true,
      ciphertext_verified: true,
    }),
    cleanup: {
      actions_read_token_cleared: true,
      oidc_credentials_absent: true,
      source_root_removed: false,
    },
    boundaries: Object.freeze({
      exact_s3_locator_recorded: false,
      plaintext_locator_recorded: false,
      oidc_used: false,
      provider_call_performed: false,
    }),
    envelope: files.envelope,
  });
}

function locatorSourceReceiptSafe(receipt) {
  const { envelope: _envelope, ...safe } = receipt;
  return safe;
}

export function writeWindowsFormalUpdateLocatorSourceReceipt(receiptPath, receipt, { replace = false } = {}) {
  const bytes = Buffer.from(`${JSON.stringify(locatorSourceReceiptSafe(receipt), null, 2)}\n`, "utf8");
  writeFileSync(receiptPath, bytes, { flag: replace ? "w" : "wx", mode: 0o600 });
  return sha256(bytes);
}

export function finalizeWindowsFormalUpdateLocatorSourceReceipt({
  sourceRoot,
  receiptPath,
  actionsReadTokenPresent,
  oidcCredentialsPresent,
  now = Date.now(),
} = {}) {
  rmSync(path.resolve(sourceRoot), { recursive: true, force: true });
  const resolvedReceiptPath = path.resolve(receiptPath);
  const receipt = JSON.parse(readTrustedFileSnapshot(
    path.dirname(resolvedReceiptPath),
    path.basename(resolvedReceiptPath),
  ).bytes.toString("utf8"));
  requireCondition(
    receipt.schema_version === WINDOWS_UPDATE_LOCATOR_SOURCE_RECEIPT_SCHEMA
      && receipt.verdict === "PASS"
      && receipt.state === "PENDING_CLEANUP",
    "WINDOWS_HANDOFF_LOCATOR_SOURCE_RECEIPT_INVALID",
    "aggregate locator source receipt is invalid",
  );
  receipt.generated_at = new Date(now).toISOString();
  receipt.cleanup = {
    actions_read_token_cleared: actionsReadTokenPresent === false,
    oidc_credentials_absent: oidcCredentialsPresent === false,
    source_root_removed: !existsSync(path.resolve(sourceRoot)),
  };
  receipt.state = Object.values(receipt.cleanup).every((value) => value === true) ? "PASS" : "BLOCKED";
  writeWindowsFormalUpdateLocatorSourceReceipt(receiptPath, receipt, { replace: true });
  requireCondition(receipt.state === "PASS", "WINDOWS_HANDOFF_LOCATOR_SOURCE_CLEANUP_FAILED", "aggregate locator source cleanup did not PASS");
  return Object.freeze(receipt);
}

function validateLocatorSourceReceiptForReader(receipt, artifactRef, artifactRefSha256) {
  exactKeys(receipt, [
    "artifact", "artifact_ref_sha256", "boundaries", "cleanup", "generated_at", "producer",
    "schema_version", "state", "verification", "verdict",
  ], "aggregate locator source receipt");
  exactKeys(receipt.producer, [
    "job", "repository", "run_attempt", "run_id", "source_sha", "source_tree", "workflow_ref",
  ], "aggregate locator source receipt producer");
  exactKeys(receipt.artifact, [
    "digest", "envelope_sha256", "id", "name", "private_locator_sha256", "wrapping_public_key_sha256",
  ], "aggregate locator source receipt artifact");
  exactKeys(receipt.verification, [
    "artifact_metadata_verified", "ciphertext_verified", "envelope_verified", "exact_file_set_verified",
    "job_metadata_verified", "raw_archive_digest_verified", "run_metadata_verified", "token_permission",
  ], "aggregate locator source receipt verification");
  exactKeys(receipt.cleanup, [
    "actions_read_token_cleared", "oidc_credentials_absent", "source_root_removed",
  ], "aggregate locator source receipt cleanup");
  exactKeys(receipt.boundaries, [
    "exact_s3_locator_recorded", "oidc_used", "plaintext_locator_recorded", "provider_call_performed",
  ], "aggregate locator source receipt boundaries");
  const expectedProducer = {
    repository: artifactRef.producer_repository,
    workflow_ref: artifactRef.producer_workflow_ref,
    job: artifactRef.producer_job,
    run_id: artifactRef.producer_run_id,
    run_attempt: artifactRef.producer_run_attempt,
    source_sha: artifactRef.source_sha,
    source_tree: artifactRef.source_tree,
  };
  const expectedArtifact = {
    name: artifactRef.artifact_name,
    id: artifactRef.artifact_id,
    digest: artifactRef.artifact_digest,
    envelope_sha256: artifactRef.envelope_sha256,
    private_locator_sha256: artifactRef.private_locator_sha256,
    wrapping_public_key_sha256: artifactRef.wrapping_public_key_sha256,
  };
  requireCondition(
    receipt.schema_version === WINDOWS_UPDATE_LOCATOR_SOURCE_RECEIPT_SCHEMA
      && receipt.verdict === "PASS"
      && receipt.state === "PASS"
      && canonicalUtc(receipt.generated_at, "aggregate locator source receipt generated_at")
      && receipt.artifact_ref_sha256 === artifactRefSha256
      && isDeepStrictEqual(receipt.producer, expectedProducer)
      && isDeepStrictEqual(receipt.artifact, expectedArtifact)
      && receipt.verification.token_permission === "actions:read"
      && Object.entries(receipt.verification).every(([key, value]) => key === "token_permission" || value === true)
      && Object.values(receipt.cleanup).every((value) => value === true)
      && receipt.boundaries.exact_s3_locator_recorded === false
      && receipt.boundaries.plaintext_locator_recorded === false
      && receipt.boundaries.oidc_used === false
      && receipt.boundaries.provider_call_performed === false,
    "WINDOWS_HANDOFF_LOCATOR_SOURCE_RECEIPT_INVALID",
    "aggregate locator source receipt differs from the exact public artifact ref",
  );
  return Object.freeze(receipt);
}

function readLocatorSourceReceipt(receiptPath, artifactRef, artifactRefSha256) {
  const resolved = path.resolve(receiptPath);
  const snapshot = readTrustedFileSnapshot(path.dirname(resolved), path.basename(resolved));
  let receipt;
  try {
    receipt = JSON.parse(snapshot.bytes.toString("utf8"));
  } catch {
    fail("WINDOWS_HANDOFF_LOCATOR_SOURCE_RECEIPT_INVALID", "aggregate locator source receipt is not valid JSON");
  }
  requireCondition(
    snapshot.bytes.equals(Buffer.from(`${JSON.stringify(receipt, null, 2)}\n`, "utf8")),
    "WINDOWS_HANDOFF_LOCATOR_SOURCE_RECEIPT_INVALID",
    "aggregate locator source receipt bytes are not canonical",
  );
  return validateLocatorSourceReceiptForReader(receipt, artifactRef, artifactRefSha256);
}

export async function decryptWindowsFormalUpdatePrivateLocatorArtifact({
  artifactRef,
  artifactRefSha256,
  artifactDir,
  sourceReceiptPath,
  expectedReaderRoleArn,
  expectedBucket,
  expectedStorageKmsKeyArn,
  expectedUnwrapKmsKeyArn,
  kms,
  now = Date.now(),
} = {}) {
  requireCondition(
    artifactRef?.schema_version === WINDOWS_UPDATE_PRIVATE_LOCATOR_ARTIFACT_REF_SCHEMA
      && SHA256.test(artifactRefSha256 ?? "")
      && typeof kms?.decrypt === "function"
      && KMS_ARN.test(expectedUnwrapKmsKeyArn ?? ""),
    "WINDOWS_HANDOFF_LOCATOR_DECRYPT_INPUT_INVALID",
    "complete aggregate locator decryption inputs are required",
  );
  const sourceReceipt = readLocatorSourceReceipt(sourceReceiptPath, artifactRef, artifactRefSha256);
  const files = validateAggregateLocatorArtifactFiles({
    artifactDir,
    artifactRef,
    expectedWrappingKeyArn: expectedUnwrapKmsKeyArn,
    now,
  });
  let dataKey;
  let plaintext;
  try {
    const response = await kms.decrypt({
      keyArn: expectedUnwrapKmsKeyArn,
      encryptionAlgorithm: "RSAES_OAEP_SHA_256",
      ciphertext: canonicalBase64(files.envelope.wrapped_key_b64, "aggregate locator wrapped key"),
    });
    dataKey = Buffer.isBuffer(response?.Plaintext)
      ? Buffer.from(response.Plaintext)
      : canonicalBase64(response?.Plaintext, "KMS aggregate locator plaintext key");
    requireCondition(
      response?.KeyId === expectedUnwrapKmsKeyArn
        && response?.EncryptionAlgorithm === "RSAES_OAEP_SHA_256"
        && dataKey.length === 32,
      "WINDOWS_HANDOFF_LOCATOR_KMS_UNWRAP_INVALID",
      "KMS aggregate locator unwrap response differs",
    );
    try {
      const decipher = createDecipheriv(
        "aes-256-gcm",
        dataKey,
        canonicalBase64(files.envelope.iv_b64, "aggregate locator IV"),
        { authTagLength: 16 },
      );
      const aad = createWindowsFormalUpdatePrivateLocatorEnvelopeAad(files.envelope);
      decipher.setAAD(aad, { plaintextLength: files.envelope.private_locator_bytes });
      decipher.setAuthTag(canonicalBase64(files.envelope.auth_tag_b64, "aggregate locator authentication tag"));
      plaintext = Buffer.concat([
        decipher.update(files.ciphertextSnapshot.bytes),
        decipher.final(),
      ]);
    } catch {
      fail("WINDOWS_HANDOFF_LOCATOR_AUTHENTICATION_INVALID", "aggregate locator AES-GCM authentication failed");
    }
    requireCondition(
      plaintext.length === files.envelope.private_locator_bytes
        && sha256(plaintext) === files.envelope.private_locator_sha256
        && files.envelope.private_locator_sha256 === artifactRef.private_locator_sha256,
      "WINDOWS_HANDOFF_LOCATOR_PLAINTEXT_INVALID",
      "decrypted aggregate locator bytes differ",
    );
    const validated = parseWindowsFormalUpdatePrivateLocatorJson(plaintext.toString("utf8"), {
      expectedSha256: artifactRef.private_locator_sha256,
      expectedReaderRoleArn,
      expectedBucket,
      expectedKmsKeyArn: expectedStorageKmsKeyArn,
      now,
    });
    return Object.freeze({
      ...validated,
      locator_source: Object.freeze({
        artifact_ref_sha256: artifactRefSha256,
        producer: sourceReceipt.producer,
        artifact: sourceReceipt.artifact,
        verification: sourceReceipt.verification,
        preflight_cleanup: sourceReceipt.cleanup,
      }),
      locator_decryption: Object.freeze({
        wrapping_key_arn: expectedUnwrapKmsKeyArn,
        key_wrap_algorithm: "RSAES_OAEP_SHA_256",
        content_encryption_algorithm: "AES-256-GCM",
        envelope_aad_verified: true,
        ciphertext_sha256_verified: true,
        kms_key_id_verified: true,
        aes_gcm_authenticated: true,
        private_locator_sha256_verified: true,
        private_locator_bytes_verified: true,
        plaintext_persisted: false,
      }),
    });
  } finally {
    if (Buffer.isBuffer(dataKey)) dataKey.fill(0);
    if (Buffer.isBuffer(plaintext)) plaintext.fill(0);
  }
}

function assumedRolePattern(roleArn) {
  const roleName = roleArn.split("/").at(-1).replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  return new RegExp(`^arn:aws:sts::${WINDOWS_SIGNED_ARTIFACT_HANDOFF_ACCOUNT}:assumed-role/${roleName}/[^/]+$`, "u");
}

function validateProviderGovernance({ locator, provider }) {
  requireCondition(provider.identity?.Account === locator.account_id && assumedRolePattern(locator.reader_role_arn).test(provider.identity?.Arn ?? ""), "WINDOWS_HANDOFF_PROVIDER_IDENTITY_INVALID", "AWS reader identity is invalid");
  requireCondition(provider.location?.LocationConstraint === locator.region, "WINDOWS_HANDOFF_BUCKET_REGION_MISMATCH", "S3 bucket region differs");
  requireCondition(provider.versioning?.Status === "Enabled", "WINDOWS_HANDOFF_BUCKET_VERSIONING_INVALID", "S3 bucket versioning is disabled");
  const publicAccess = provider.publicAccess?.PublicAccessBlockConfiguration ?? {};
  requireCondition(
    ["BlockPublicAcls", "IgnorePublicAcls", "BlockPublicPolicy", "RestrictPublicBuckets"].every((key) => publicAccess[key] === true),
    "WINDOWS_HANDOFF_BUCKET_PUBLIC_ACCESS_INVALID",
    "S3 bucket public access block is incomplete",
  );
  requireCondition(provider.objectLock?.ObjectLockConfiguration?.ObjectLockEnabled === "Enabled", "WINDOWS_HANDOFF_BUCKET_OBJECT_LOCK_INVALID", "S3 bucket Object Lock is disabled");
  const rules = provider.encryption?.ServerSideEncryptionConfiguration?.Rules ?? [];
  requireCondition(
    rules.some(({ ApplyServerSideEncryptionByDefault: rule }) => rule?.SSEAlgorithm === "aws:kms" && rule?.KMSMasterKeyID === locator.kms_key_arn),
    "WINDOWS_HANDOFF_BUCKET_KMS_INVALID",
    "S3 bucket KMS encryption differs",
  );
  requireCondition(
    isDeepStrictEqual(provider.ownership?.OwnershipControls?.Rules, [{ ObjectOwnership: "BucketOwnerEnforced" }]),
    "WINDOWS_HANDOFF_BUCKET_OWNERSHIP_INVALID",
    "S3 bucket ownership controls differ",
  );
  requireCondition(
    provider.kms?.KeyMetadata?.Arn === locator.kms_key_arn
      && provider.kms?.KeyMetadata?.Enabled === true
      && provider.kms?.KeyMetadata?.KeyState === "Enabled",
    "WINDOWS_HANDOFF_KMS_INVALID",
    "KMS key state or identity differs",
  );
}

function validateLiveReadback({ response, object, locator, label, now }) {
  requireCondition(response?.VersionId === object.version_id, "WINDOWS_HANDOFF_VERSION_ID_MISMATCH", `${label} VersionId differs`);
  requireCondition(Number(response?.ContentLength) === object.bytes, "WINDOWS_HANDOFF_OBJECT_BYTES_MISMATCH", `${label} byte count differs`);
  requireCondition(response?.ServerSideEncryption === "aws:kms" && response?.SSEKMSKeyId === locator.kms_key_arn, "WINDOWS_HANDOFF_KMS_MISMATCH", `${label} KMS binding differs`);
  requireCondition(response?.ChecksumSHA256 === object.provider_checksum_sha256, "WINDOWS_HANDOFF_PROVIDER_CHECKSUM_INVALID", `${label} provider checksum differs`);
  requireCondition(response?.ObjectLockMode === "COMPLIANCE", "WINDOWS_HANDOFF_OBJECT_LOCK_INVALID", `${label} Object Lock mode differs`);
  requireCondition(
    canonicalUtc(new Date(response?.ObjectLockRetainUntilDate).toISOString(), `${label} retain_until`, now) === object.retain_until,
    "WINDOWS_HANDOFF_RETENTION_MISMATCH",
    `${label} retention differs`,
  );
  requireCondition(response?.Metadata?.["artifact-sha256"] === object.sha256, "WINDOWS_HANDOFF_METADATA_DIGEST_MISMATCH", `${label} digest metadata differs`);
}

function validateDownloadedExecutionInput(root, validated) {
  const object = validated.governance.execution_input;
  const bytes = readTrustedFileSnapshot(root, object.relative_path).bytes;
  let input;
  try {
    input = JSON.parse(bytes.toString("utf8"));
  } catch {
    fail("WINDOWS_HANDOFF_EXECUTION_INPUT_INVALID", "downloaded execution input is not valid JSON");
  }
  requireCondition(Buffer.from(`${JSON.stringify(input, null, 2)}\n`).equals(bytes), "WINDOWS_HANDOFF_EXECUTION_INPUT_INVALID", "downloaded execution input is not canonical");
  exactKeys(input, ["automatic_update", "baseline", "execution_mode", "schema_version", "target"], "downloaded execution input");
  requireCondition(
    input.schema_version === WINDOWS_UPDATE_EXECUTION_INPUT_SCHEMA
      && input.execution_mode === WINDOWS_UPDATE_EXECUTION_MODE
      && input.automatic_update === false,
    "WINDOWS_HANDOFF_EXECUTION_INPUT_INVALID",
    "downloaded execution input is not the protected nonautomatic mode",
  );
  for (const role of ["baseline", "target"]) {
    exactKeys(input[role], ["installer_path", "metadata_path", "signature_path"], `downloaded execution input ${role}`);
    const byId = new Map(validated.candidates[role].objects.map((entry) => [entry.id, entry.relative_path]));
    requireCondition(
      input[role].installer_path === byId.get(`${role}_installer`)
        && input[role].metadata_path === byId.get(`${role}_update_metadata`)
        && input[role].signature_path === byId.get(`${role}_update_metadata_signature`),
      "WINDOWS_HANDOFF_EXECUTION_INPUT_PATH_MISMATCH",
      `downloaded execution input ${role} paths differ from the private locator`,
    );
  }
}

function expandValidatedPrivateReceipts(root, validated, now) {
  const candidates = {};
  for (const role of ["baseline", "target"]) {
    const receiptObject = validated.candidates[role].objects.find(({ id }) => id === `${role}_private_handoff_receipt`);
    const bytes = readTrustedFileSnapshot(root, receiptObject.relative_path).bytes;
    let receipt;
    try {
      receipt = validateWindowsSignedArtifactPrivateHandoffReceipt(
        JSON.parse(bytes.toString("utf8")),
        { now },
      );
    } catch {
      fail("WINDOWS_HANDOFF_PRIVATE_RECEIPT_INVALID", `downloaded private ${role} handoff receipt is invalid`);
    }
    requireCondition(
      Buffer.from(`${JSON.stringify(receipt, null, 2)}\n`, "utf8").equals(bytes)
        && receipt.candidate_role === role
        && receipt.source_sha === validated.candidates[role].identity.source_sha
        && receipt.source_tree === validated.candidates[role].identity.source_tree
        && receipt.version === validated.candidates[role].identity.version
        && receipt.storage.account_id === validated.locator.account_id
        && receipt.storage.region === validated.locator.region
        && receipt.storage.bucket === validated.locator.bucket
        && receipt.storage.encryption.kms_key_arn === validated.locator.kms_key_arn,
      "WINDOWS_HANDOFF_PRIVATE_RECEIPT_INVALID",
      `downloaded private ${role} handoff receipt differs from the aggregate locator`,
    );
    const suffixes = {
      installer: ".exe",
      build_manifest: ".json",
      native_package_qa: ".json",
      installed_tree_sbom: ".json",
    };
    const packageObjects = PRIVATE_ARTIFACT_KINDS.map((kind) => {
      const proof = receipt.artifacts[kind];
      const object = {
        id: `${role}_${kind}`,
        relative_path: safeRelative(
          validated.locator.candidates[role].materialized_paths[kind],
          `${role} ${kind}`,
          suffixes[kind],
        ),
        key: proof.key,
        version_id: proof.version_id,
        sha256: proof.sha256,
        bytes: proof.bytes,
        provider_checksum_sha256: proof.upload.provider_checksum_sha256,
        object_lock_mode: proof.head_readback.object_lock_mode,
        retain_until: proof.head_readback.retain_until,
      };
      validateCommonObject({ value: object, label: `private ${role} ${kind}`, now });
      return Object.freeze(object);
    });
    const aggregateObjects = validated.candidates[role].objects.filter(
      ({ id }) => id !== `${role}_private_handoff_receipt`,
    );
    candidates[role] = Object.freeze({
      identity: Object.freeze({
        ...validated.candidates[role].identity,
        installer_sha256: receipt.installer_sha256,
        installer_bytes: receipt.installer_bytes,
        build_manifest_sha256: receipt.build_manifest_sha256,
        build_manifest_bytes: receipt.artifacts.build_manifest.bytes,
      }),
      objects: Object.freeze([receiptObject, ...packageObjects, ...aggregateObjects]),
    });
  }
  const objects = Object.freeze([
    ...candidates.baseline.objects,
    ...candidates.target.objects,
    ...Object.values(validated.governance),
  ]);
  const paths = objects.map(({ relative_path: value }) => value.toLowerCase());
  const objectVersions = objects.map(({ key, version_id: versionId }) => `${key}\0${versionId}`);
  requireCondition(new Set(paths).size === paths.length, "WINDOWS_HANDOFF_MATERIALIZED_PATH_DUPLICATE", "expanded private locator paths must be unique on Windows");
  requireCondition(new Set(objectVersions).size === objectVersions.length, "WINDOWS_HANDOFF_OBJECT_DUPLICATE", "expanded private locator object versions must be distinct");
  return Object.freeze({
    ...validated,
    candidates: Object.freeze(candidates),
    objects,
  });
}

function parseDownloadedJson(root, object, label) {
  const snapshot = readTrustedFileSnapshot(root, object.relative_path);
  let value;
  try {
    value = JSON.parse(snapshot.bytes.toString("utf8"));
  } catch {
    fail("WINDOWS_HANDOFF_NATIVE_EVIDENCE_INVALID", `${label} is not valid JSON`);
  }
  requireCondition(
    snapshot.bytes.equals(Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8")),
    "WINDOWS_HANDOFF_NATIVE_EVIDENCE_INVALID",
    `${label} bytes are not canonical`,
  );
  return value;
}

function validateNativeSnapshotEvidence(snapshot, label) {
  exactKeys(snapshot, [
    "bytes", "content_sha256", "directory_count", "equality_proof", "file_count", "filesystem",
    "fixed_point_exact", "fixed_point_sequence", "identity_sha256", "phases", "schema_version",
  ], `${label} native snapshot`);
  requireCondition(
    snapshot.schema_version === "law-firm-os.windows-installed-tree-native-snapshot.v1"
      && snapshot.filesystem === "NTFS"
      && SHA256.test(snapshot.content_sha256 ?? "")
      && SHA256.test(snapshot.identity_sha256 ?? "")
      && Number.isInteger(snapshot.file_count) && snapshot.file_count > 0
      && Number.isInteger(snapshot.directory_count) && snapshot.directory_count > 0
      && Number.isSafeInteger(snapshot.bytes) && snapshot.bytes > 0
      && isDeepStrictEqual(snapshot.fixed_point_sequence, NATIVE_FIXED_POINT_SEQUENCE)
      && snapshot.fixed_point_exact === true
      && snapshot.equality_proof === NATIVE_FIXED_POINT_EQUALITY_PROOF
      && Array.isArray(snapshot.phases) && snapshot.phases.length === NATIVE_FIXED_POINT_SEQUENCE.length,
    "WINDOWS_HANDOFF_NATIVE_EVIDENCE_INVALID",
    `${label} native fixed-point snapshot is invalid`,
  );
  const phases = snapshot.phases.map((phase, index) => {
    exactKeys(phase, [
      "bytes", "content_sha256", "directory_count", "file_count", "identity_sha256", "name",
    ], `${label} native snapshot phase ${index}`);
    requireCondition(
      phase.name === NATIVE_FIXED_POINT_SEQUENCE[index]
        && phase.content_sha256 === snapshot.content_sha256
        && phase.identity_sha256 === snapshot.identity_sha256
        && phase.file_count === snapshot.file_count
        && phase.directory_count === snapshot.directory_count
        && phase.bytes === snapshot.bytes,
      "WINDOWS_HANDOFF_NATIVE_EVIDENCE_INVALID",
      `${label} native snapshot phase ${phase.name ?? index} differs`,
    );
    return Object.freeze({ ...phase });
  });
  return Object.freeze({ ...snapshot, phases: Object.freeze(phases) });
}

function validateInstalledTreeEvidence(value, label, code) {
  requireCondition(
    isRecord(value)
      && Object.keys(value).sort().join("\0") === [...INSTALLED_TREE_FIELDS].sort().join("\0"),
    code,
    `${label} must use the exact closed schema`,
  );
  const executablePath = value.installed_executable_path;
  const executableBody = typeof executablePath === "string" && executablePath.startsWith("./")
    ? executablePath.slice(2)
    : "";
  requireCondition(
    value.schema_version === "law-firm-os.windows-installed-tree-native-snapshot.v1"
      && SHA256.test(value.content_sha256 ?? "")
      && SHA256.test(value.identity_sha256 ?? "")
      && SHA256.test(value.installed_executable_sha256 ?? "")
      && Number.isInteger(value.file_count) && value.file_count > 0
      && Number.isInteger(value.directory_count) && value.directory_count > 0
      && Number.isSafeInteger(value.bytes) && value.bytes > 0
      && Number.isSafeInteger(value.installed_executable_bytes) && value.installed_executable_bytes > 0
      && value.installed_executable_bytes <= value.bytes
      && /^\.\/(?!\.\.\/)[^\\:\0\r\n]+\.exe$/iu.test(executablePath ?? "")
      && path.posix.normalize(executableBody) === executableBody
      && executablePath === executablePath.normalize("NFC"),
    code,
    `${label} binding is invalid`,
  );
  return Object.freeze({ ...value });
}

function installedTreeEvidenceFromSbom(sbom, candidate, nativeSnapshot, uninstallerPath, role) {
  const propertyEntries = sbom?.metadata?.component?.properties;
  requireCondition(
    sbom?.bomFormat === "CycloneDX"
      && sbom.specVersion === "1.5"
      && sbom.metadata?.component?.version === candidate.identity.version
      && Array.isArray(propertyEntries),
    "WINDOWS_HANDOFF_NATIVE_EVIDENCE_INVALID",
    `${role} installed-tree SBOM metadata is invalid`,
  );
  const properties = Object.create(null);
  for (const entry of propertyEntries) {
    requireCondition(
      isRecord(entry)
        && Object.keys(entry).sort().join("\0") === "name\0value"
        && typeof entry.name === "string"
        && typeof entry.value === "string"
        && properties[entry.name] === undefined,
      "WINDOWS_HANDOFF_NATIVE_EVIDENCE_INVALID",
      `${role} installed-tree SBOM metadata property is invalid or duplicated`,
    );
    properties[entry.name] = entry.value;
  }
  const property = (name) => properties[`law-firm-os:${name}`];
  const executablePath = property("installed-executable-path");
  const executableSha256 = property("installed-executable-sha256");
  const executablePathFolded = typeof executablePath === "string" ? executablePath.toLowerCase() : "";
  const executableRows = (Array.isArray(sbom.components) ? sbom.components : []).filter((component) => (
    component?.type === "file"
      && typeof component.name === "string"
      && component.name.toLowerCase() === executablePathFolded
  ));
  const executableHashes = executableRows[0]?.hashes?.filter((hash) => hash?.alg === "SHA-256") ?? [];
  const executableByteProperties = executableRows[0]?.properties?.filter(
    (entry) => entry?.name === "law-firm-os:file-bytes",
  ) ?? [];
  const executableBytesText = executableByteProperties[0]?.value;
  const executableBytes = POSITIVE_DECIMAL.test(executableBytesText ?? "")
    ? Number(executableBytesText)
    : Number.NaN;
  requireCondition(
    property("schema-version") === "law-firm-os.matter-desktop-installed-tree-sbom.v1"
      && property("source-sha") === candidate.identity.source_sha
      && property("source-tree") === candidate.identity.source_tree
      && property("installer-sha256") === candidate.identity.installer_sha256
      && property("native-snapshot-schema-version") === nativeSnapshot.schema_version
      && property("installed-tree-sha256") === nativeSnapshot.content_sha256
      && property("native-identity-sha256") === nativeSnapshot.identity_sha256
      && property("installed-tree-file-count") === String(nativeSnapshot.file_count)
      && property("native-directory-count") === String(nativeSnapshot.directory_count)
      && property("installed-tree-bytes") === String(nativeSnapshot.bytes)
      && executablePathFolded !== uninstallerPath.toLowerCase()
      && executableRows.length === 1
      && executableRows[0].name === executablePath
      && executableHashes.length === 1
      && executableHashes[0].content?.toLowerCase() === executableSha256
      && executableByteProperties.length === 1
      && Number.isSafeInteger(executableBytes),
    "WINDOWS_HANDOFF_NATIVE_EVIDENCE_INVALID",
    `${role} unique installed-executable SBOM binding differs from the native snapshot`,
  );
  return validateInstalledTreeEvidence({
    schema_version: nativeSnapshot.schema_version,
    content_sha256: nativeSnapshot.content_sha256,
    identity_sha256: nativeSnapshot.identity_sha256,
    file_count: nativeSnapshot.file_count,
    directory_count: nativeSnapshot.directory_count,
    bytes: nativeSnapshot.bytes,
    installed_executable_path: executablePath,
    installed_executable_sha256: executableSha256,
    installed_executable_bytes: executableBytes,
  }, `${role} installed tree`, "WINDOWS_HANDOFF_NATIVE_EVIDENCE_INVALID");
}

function validateDownloadedCandidateNativeEvidence(root, candidate, role) {
  const byId = new Map(candidate.objects.map((object) => [object.id, object]));
  const qa = parseDownloadedJson(root, byId.get(`${role}_native_package_qa`), `${role} native package QA`);
  const sbom = parseDownloadedJson(root, byId.get(`${role}_installed_tree_sbom`), `${role} installed-tree SBOM`);
  const uninstaller = qa?.package?.uninstaller;
  exactKeys(uninstaller, [
    "authenticode", "authenticode_valid", "bytes", "denies_write_delete", "exit_code",
    "installed_tree_path", "installed_tree_sha256", "lock_mode", "path", "process", "sha256",
    "uninstaller_bytes",
  ], `${role} native QA uninstaller`);
  exactKeys(uninstaller.process, ["path_identity", "pid"], `${role} native QA uninstaller process`);
  const canonicalInstalledTreePath = uninstaller.installed_tree_path;
  requireCondition(
    typeof canonicalInstalledTreePath === "string"
      && /^\.\/(?!\.\.\/)[^\\:\0\r\n]+\.exe$/iu.test(canonicalInstalledTreePath)
      && path.posix.normalize(canonicalInstalledTreePath.slice(2)) === canonicalInstalledTreePath.slice(2)
      && canonicalInstalledTreePath === canonicalInstalledTreePath.normalize("NFC"),
    "WINDOWS_HANDOFF_NATIVE_EVIDENCE_INVALID",
    `${role} native QA uninstaller installed-tree path is invalid`,
  );
  requireCondition(
    qa.schema_version === "law-firm-os.formal-windows-package-qa.v1"
      && qa.verdict === "PASS"
      && qa.native_verdict === "PASS"
      && qa.source?.revision === candidate.identity.source_sha
      && qa.source?.source_tree === candidate.identity.source_tree
      && qa.package?.installer?.sha256 === candidate.identity.installer_sha256
      && uninstaller.path === canonicalInstalledTreePath
      && uninstaller.installed_tree_path === canonicalInstalledTreePath
      && SHA256.test(uninstaller.installed_tree_sha256 ?? "")
      && uninstaller.sha256 === uninstaller.installed_tree_sha256
      && Number.isSafeInteger(uninstaller.uninstaller_bytes) && uninstaller.uninstaller_bytes > 0
      && uninstaller.bytes === uninstaller.uninstaller_bytes
      && isRecord(uninstaller.authenticode)
      && uninstaller.authenticode_valid === true
      && uninstaller.lock_mode === "FileShare.Read"
      && uninstaller.denies_write_delete === true
      && Number.isSafeInteger(uninstaller.process.pid) && uninstaller.process.pid > 0
      && uninstaller.process.path_identity === "pid_executable_path"
      && uninstaller.exit_code === 0,
    "WINDOWS_HANDOFF_NATIVE_EVIDENCE_INVALID",
    `${role} native QA locked-uninstaller evidence is invalid`,
  );
  const nativeSnapshot = validateNativeSnapshotEvidence(qa?.sbom?.native_snapshot, role);
  requireCondition(
    nativeSnapshot.content_sha256 === qa.sbom.installed_tree_sha256
      && nativeSnapshot.identity_sha256 === qa.sbom.native_identity_sha256
      && nativeSnapshot.file_count === qa.sbom.installed_tree_file_count
      && nativeSnapshot.directory_count === qa.sbom.native_directory_count
      && nativeSnapshot.bytes === qa.sbom.installed_tree_bytes
      && isDeepStrictEqual(nativeSnapshot.fixed_point_sequence, qa.sbom.native_fixed_point_sequence)
      && qa.sbom.native_fixed_point_exact === true,
    "WINDOWS_HANDOFF_NATIVE_EVIDENCE_INVALID",
    `${role} native snapshot differs from the QA SBOM binding`,
  );
  const fileRows = (Array.isArray(sbom?.components) ? sbom.components : []).filter((component) => (
    component?.type === "file" && component?.name === canonicalInstalledTreePath
  ));
  const hashes = fileRows[0]?.hashes?.filter(({ alg }) => alg === "SHA-256") ?? [];
  const byteProperties = fileRows[0]?.properties?.filter(({ name }) => name === "law-firm-os:file-bytes") ?? [];
  requireCondition(
    fileRows.length === 1
      && hashes.length === 1
      && hashes[0].content?.toLowerCase() === uninstaller.installed_tree_sha256
      && byteProperties.length === 1
      && Number(byteProperties[0].value) === uninstaller.uninstaller_bytes,
    "WINDOWS_HANDOFF_NATIVE_EVIDENCE_INVALID",
    `${role} unique installed-tree SBOM uninstaller row differs`,
  );
  const installedTree = installedTreeEvidenceFromSbom(
    sbom,
    candidate,
    nativeSnapshot,
    canonicalInstalledTreePath,
    role,
  );
  return Object.freeze({
    installed_tree: installedTree,
    native_snapshot: nativeSnapshot,
    uninstaller: Object.freeze({
      installed_tree_path: canonicalInstalledTreePath,
      installed_tree_sha256: uninstaller.installed_tree_sha256,
      uninstaller_sha256: uninstaller.sha256,
      uninstaller_bytes: uninstaller.uninstaller_bytes,
      authenticode_sha256: sha256(Buffer.from(canonicalJson(uninstaller.authenticode), "utf8")),
      authenticode_valid: true,
      lock_mode: "FileShare.Read",
      denies_write_delete: true,
      process_path_identity: "pid_executable_path",
      exit_code: 0,
    }),
  });
}

function attachDownloadedNativeEvidence(root, validated) {
  const candidates = Object.freeze(Object.fromEntries(["baseline", "target"].map((role) => {
    const candidate = validated.candidates[role];
    const nativeEvidence = validateDownloadedCandidateNativeEvidence(root, candidate, role);
    return [role, Object.freeze({
      ...candidate,
      identity: Object.freeze({ ...candidate.identity, ...nativeEvidence }),
    })];
  })));
  return Object.freeze({ ...validated, candidates });
}

function safeCandidateReceipt(validated) {
  return Object.fromEntries(["baseline", "target"].map((role) => [role, {
    ...validated.candidates[role].identity,
    materialized: Object.fromEntries(
      validated.candidates[role].objects
        .filter(({ id }) => id !== `${role}_private_handoff_receipt`)
        .map(({ id, relative_path: relativePath, sha256: digest, bytes }) => [
          id.slice(`${role}_`.length),
          { relative_path: relativePath, sha256: digest, bytes },
        ]),
    ),
  }]));
}

function bridgeExactKeys(value, fields, label) {
  requireCondition(
    isRecord(value) && Object.keys(value).sort().join("\0") === [...fields].sort().join("\0"),
    "WINDOWS_HANDOFF_BRIDGE_SCHEMA_INVALID",
    `${label} must use the exact closed schema`,
  );
}

function validateRunBinding(value) {
  requireCondition(
    typeof value === "string" && RUN_BINDING.test(value),
    "WINDOWS_HANDOFF_BRIDGE_RUN_BINDING_INVALID",
    "encrypted bridge run binding is invalid",
  );
  return value;
}

function bridgeObjectSuffix(id) {
  if (id.endsWith("_installer")) return ".exe";
  if (id.endsWith("_signature") || id === "approval_signature") return ".sig";
  return ".json";
}

function bridgeCiphertextFile(index) {
  return `payload-${String(index + 1).padStart(3, "0")}.enc`;
}

function bridgeAad({ locatorSha256, runBindingSha256, wrappingPublicKeySha256, object }) {
  return Buffer.from(canonicalJson({
    schema_version: WINDOWS_UPDATE_ENCRYPTED_BRIDGE_SCHEMA,
    locator_sha256: locatorSha256,
    run_binding_sha256: runBindingSha256,
    wrapping_public_key_sha256: wrappingPublicKeySha256,
    object_id: object.id,
    relative_path: object.relative_path,
    plaintext_sha256: object.plaintext_sha256,
    plaintext_bytes: object.plaintext_bytes,
  }), "utf8");
}

function validateBridgePublicKey({ wrappingPublicKeySpkiBase64, wrappingPublicKeySha256 }) {
  requireCondition(SHA256.test(wrappingPublicKeySha256 ?? ""), "WINDOWS_HANDOFF_BRIDGE_KEY_INVALID", "encrypted bridge public-key digest is invalid");
  const spki = canonicalBase64(wrappingPublicKeySpkiBase64, "encrypted bridge public key");
  requireCondition(sha256(spki) === wrappingPublicKeySha256, "WINDOWS_HANDOFF_BRIDGE_KEY_INVALID", "encrypted bridge public-key digest differs");
  let publicKey;
  try {
    publicKey = createPublicKey({ key: spki, format: "der", type: "spki" });
  } catch {
    fail("WINDOWS_HANDOFF_BRIDGE_KEY_INVALID", "encrypted bridge public key is not canonical SPKI DER");
  }
  const exported = publicKey.export({ format: "der", type: "spki" });
  requireCondition(
    publicKey.asymmetricKeyType === "rsa"
      && publicKey.asymmetricKeyDetails?.modulusLength === 4096
      && publicKey.asymmetricKeyDetails?.publicExponent === 65537n
      && exported.equals(spki),
    "WINDOWS_HANDOFF_BRIDGE_KEY_INVALID",
    "encrypted bridge public key must be canonical RSA-4096 SPKI with exponent 65537",
  );
  return publicKey;
}

function validateBridgeCandidateIdentity(value, label) {
  bridgeExactKeys(value, [
    "build_manifest_bytes", "build_manifest_sha256", "installer_bytes",
    "installer_sha256", "installed_tree", "materialized", "native_snapshot", "release_manifest_bytes",
    "release_manifest_sha256", "source_sha", "source_tree",
    "update_metadata_bytes", "update_metadata_sha256",
    "update_metadata_signature_bytes", "update_metadata_signature_sha256", "uninstaller", "version",
  ], label);
  requireCondition(/^[0-9a-f]{40}$/u.test(value.source_sha ?? "") && /^[0-9a-f]{40}$/u.test(value.source_tree ?? ""), "WINDOWS_HANDOFF_BRIDGE_SCHEMA_INVALID", `${label} source identity is invalid`);
  requireCondition(/^[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?$/u.test(value.version ?? ""), "WINDOWS_HANDOFF_BRIDGE_SCHEMA_INVALID", `${label} version is invalid`);
  requireCondition(SHA256.test(value.installer_sha256 ?? "") && Number.isSafeInteger(value.installer_bytes) && value.installer_bytes > 0, "WINDOWS_HANDOFF_BRIDGE_SCHEMA_INVALID", `${label} installer identity is invalid`);
  requireCondition(
    ["build_manifest", "release_manifest", "update_metadata", "update_metadata_signature"].every((kind) => SHA256.test(value[`${kind}_sha256`] ?? "") && Number.isSafeInteger(value[`${kind}_bytes`]) && value[`${kind}_bytes`] > 0),
    "WINDOWS_HANDOFF_BRIDGE_SCHEMA_INVALID",
    `${label} manifest or metadata identity is invalid`,
  );
  requireCondition(isRecord(value.materialized), "WINDOWS_HANDOFF_BRIDGE_SCHEMA_INVALID", `${label} materialized object map is invalid`);
  validateNativeSnapshotEvidence(value.native_snapshot, label);
  const installedTree = validateInstalledTreeEvidence(
    value.installed_tree,
    `${label} installed tree`,
    "WINDOWS_HANDOFF_BRIDGE_SCHEMA_INVALID",
  );
  requireCondition(
    installedTree.schema_version === value.native_snapshot.schema_version
      && installedTree.content_sha256 === value.native_snapshot.content_sha256
      && installedTree.identity_sha256 === value.native_snapshot.identity_sha256
      && installedTree.file_count === value.native_snapshot.file_count
      && installedTree.directory_count === value.native_snapshot.directory_count
      && installedTree.bytes === value.native_snapshot.bytes,
    "WINDOWS_HANDOFF_BRIDGE_SCHEMA_INVALID",
    `${label} installed tree differs from its native snapshot`,
  );
  bridgeExactKeys(value.uninstaller, [
    "authenticode_sha256", "authenticode_valid", "denies_write_delete", "exit_code",
    "installed_tree_path", "installed_tree_sha256", "lock_mode", "process_path_identity",
    "uninstaller_bytes", "uninstaller_sha256",
  ], `${label} uninstaller`);
  requireCondition(
    /^\.\/(?!\.\.\/)[^\\:\0\r\n]+\.exe$/iu.test(value.uninstaller.installed_tree_path ?? "")
      && SHA256.test(value.uninstaller.installed_tree_sha256 ?? "")
      && value.uninstaller.uninstaller_sha256 === value.uninstaller.installed_tree_sha256
      && Number.isSafeInteger(value.uninstaller.uninstaller_bytes) && value.uninstaller.uninstaller_bytes > 0
      && SHA256.test(value.uninstaller.authenticode_sha256 ?? "")
      && value.uninstaller.authenticode_valid === true
      && value.uninstaller.lock_mode === "FileShare.Read"
      && value.uninstaller.denies_write_delete === true
      && value.uninstaller.process_path_identity === "pid_executable_path"
      && value.uninstaller.exit_code === 0,
    "WINDOWS_HANDOFF_BRIDGE_SCHEMA_INVALID",
    `${label} locked-uninstaller binding is invalid`,
  );
  return Object.freeze({ ...value, installed_tree: installedTree });
}

function expectedBridgeObjectIds() {
  return Object.freeze([
    ...["baseline", "target"].flatMap((role) => [
      `${role}_private_handoff_receipt`,
      ...PRIVATE_ARTIFACT_KINDS.map((kind) => `${role}_${kind}`),
      `${role}_release_manifest`,
      `${role}_update_metadata`,
      `${role}_update_metadata_signature`,
    ]),
    "execution_input",
    "approval_receipt",
    "approval_signature",
  ]);
}

function validateEncryptedBridgeEnvelope(envelope, {
  expectedLocatorSha256,
  expectedWrappingPublicKeySha256,
  runBinding,
  now,
} = {}) {
  bridgeExactKeys(envelope, [
    "boundaries", "candidates", "encryption", "generated_at", "locator_sha256",
    "objects", "run_binding_sha256", "schema_version", "wrapping_public_key_sha256",
  ], "encrypted bridge envelope");
  requireCondition(envelope.schema_version === WINDOWS_UPDATE_ENCRYPTED_BRIDGE_SCHEMA, "WINDOWS_HANDOFF_BRIDGE_SCHEMA_INVALID", "encrypted bridge schema is invalid");
  requireCondition(SHA256.test(expectedLocatorSha256 ?? "") && envelope.locator_sha256 === expectedLocatorSha256, "WINDOWS_HANDOFF_BRIDGE_LOCATOR_MISMATCH", "encrypted bridge locator binding differs");
  requireCondition(SHA256.test(expectedWrappingPublicKeySha256 ?? "") && envelope.wrapping_public_key_sha256 === expectedWrappingPublicKeySha256, "WINDOWS_HANDOFF_BRIDGE_KEY_INVALID", "encrypted bridge public-key binding differs");
  const runBindingSha256 = sha256(Buffer.from(validateRunBinding(runBinding), "utf8"));
  requireCondition(envelope.run_binding_sha256 === runBindingSha256, "WINDOWS_HANDOFF_BRIDGE_RUN_BINDING_INVALID", "encrypted bridge is not bound to this workflow run");
  const generatedAt = Date.parse(canonicalUtc(envelope.generated_at, "encrypted bridge generated_at"));
  requireCondition(
    Number.isSafeInteger(now) && generatedAt <= now && now - generatedAt <= BRIDGE_MAXIMUM_AGE_MS,
    "WINDOWS_HANDOFF_BRIDGE_EXPIRED",
    "encrypted bridge is expired or from the future",
  );
  bridgeExactKeys(envelope.candidates, ["baseline", "target"], "encrypted bridge candidates");
  const candidates = Object.freeze(Object.fromEntries(["baseline", "target"].map((role) => [
    role,
    validateBridgeCandidateIdentity(envelope.candidates[role], `encrypted bridge ${role}`),
  ])));
  bridgeExactKeys(envelope.encryption, [
    "authentication_tag_bytes", "content_cipher", "data_key_bytes", "key_wrap",
    "nonce_bytes", "oaep_label", "wrapped_data_key_base64", "wrapped_data_key_sha256",
  ], "encrypted bridge encryption");
  requireCondition(
    envelope.encryption.content_cipher === "AES-256-GCM"
      && envelope.encryption.data_key_bytes === 32
      && envelope.encryption.nonce_bytes === 12
      && envelope.encryption.authentication_tag_bytes === 16
      && envelope.encryption.key_wrap === "RSAES_OAEP_SHA_256"
      && envelope.encryption.oaep_label === "empty",
    "WINDOWS_HANDOFF_BRIDGE_ENCRYPTION_INVALID",
    "encrypted bridge algorithm contract differs",
  );
  const wrappedDataKey = canonicalBase64(envelope.encryption.wrapped_data_key_base64, "encrypted bridge wrapped data key");
  requireCondition(
    wrappedDataKey.length === 512
      && SHA256.test(envelope.encryption.wrapped_data_key_sha256 ?? "")
      && sha256(wrappedDataKey) === envelope.encryption.wrapped_data_key_sha256,
    "WINDOWS_HANDOFF_BRIDGE_ENCRYPTION_INVALID",
    "encrypted bridge wrapped data key differs",
  );
  bridgeExactKeys(envelope.boundaries, [
    "automatic_update", "aws_credentials_included", "exact_s3_locator_included",
    "external_distribution_claim", "plaintext_uploaded_to_github", "private_key_included",
    "production_go_live_claim", "public_release_claim",
  ], "encrypted bridge boundaries");
  requireCondition(
    envelope.boundaries.plaintext_uploaded_to_github === false
      && envelope.boundaries.exact_s3_locator_included === false
      && envelope.boundaries.aws_credentials_included === false
      && envelope.boundaries.private_key_included === false
      && envelope.boundaries.automatic_update === false
      && envelope.boundaries.public_release_claim === false
      && envelope.boundaries.external_distribution_claim === false
      && envelope.boundaries.production_go_live_claim === false,
    "WINDOWS_HANDOFF_BRIDGE_BOUNDARY_INVALID",
    "encrypted bridge boundary claims are invalid",
  );
  const expectedIds = expectedBridgeObjectIds();
  requireCondition(
    Array.isArray(envelope.objects) && envelope.objects.length === expectedIds.length,
    "WINDOWS_HANDOFF_BRIDGE_SCHEMA_INVALID",
    "encrypted bridge object set is invalid",
  );
  const nonces = new Set();
  const paths = new Set();
  const objects = Object.freeze(envelope.objects.map((object, index) => {
    bridgeExactKeys(object, [
      "aad_sha256", "auth_tag_base64", "ciphertext_bytes", "ciphertext_file",
      "ciphertext_sha256", "id", "nonce_base64", "plaintext_bytes",
      "plaintext_sha256", "relative_path",
    ], `encrypted bridge object ${index}`);
    requireCondition(object.id === expectedIds[index], "WINDOWS_HANDOFF_BRIDGE_SCHEMA_INVALID", `encrypted bridge object ${index} identity is invalid`);
    requireCondition(object.ciphertext_file === bridgeCiphertextFile(index), "WINDOWS_HANDOFF_BRIDGE_SCHEMA_INVALID", `encrypted bridge ${object.id} ciphertext filename is invalid`);
    const relativePath = safeRelative(object.relative_path, `encrypted bridge ${object.id} path`, bridgeObjectSuffix(object.id));
    requireCondition(!paths.has(relativePath.toLowerCase()), "WINDOWS_HANDOFF_BRIDGE_SCHEMA_INVALID", "encrypted bridge paths must be unique on Windows");
    paths.add(relativePath.toLowerCase());
    requireCondition(
      SHA256.test(object.ciphertext_sha256 ?? "")
        && SHA256.test(object.plaintext_sha256 ?? "")
        && SHA256.test(object.aad_sha256 ?? "")
        && Number.isSafeInteger(object.ciphertext_bytes)
        && Number.isSafeInteger(object.plaintext_bytes)
        && object.ciphertext_bytes === object.plaintext_bytes
        && object.plaintext_bytes > 0,
      "WINDOWS_HANDOFF_BRIDGE_SCHEMA_INVALID",
      `encrypted bridge ${object.id} byte or digest binding is invalid`,
    );
    const nonce = canonicalBase64(object.nonce_base64, `encrypted bridge ${object.id} nonce`);
    const tag = canonicalBase64(object.auth_tag_base64, `encrypted bridge ${object.id} authentication tag`);
    requireCondition(nonce.length === 12 && tag.length === 16 && !nonces.has(object.nonce_base64), "WINDOWS_HANDOFF_BRIDGE_ENCRYPTION_INVALID", `encrypted bridge ${object.id} nonce or tag is invalid`);
    nonces.add(object.nonce_base64);
    const normalized = Object.freeze({ ...object, relative_path: relativePath });
    requireCondition(
      sha256(bridgeAad({
        locatorSha256: envelope.locator_sha256,
        runBindingSha256: envelope.run_binding_sha256,
        wrappingPublicKeySha256: envelope.wrapping_public_key_sha256,
        object: normalized,
      })) === object.aad_sha256,
      "WINDOWS_HANDOFF_BRIDGE_AAD_INVALID",
      `encrypted bridge ${object.id} AAD differs`,
    );
    return normalized;
  }));
  const byId = new Map(objects.map((object) => [object.id, object]));
  requireCondition(
    byId.get("execution_input")?.relative_path === FIXED_GOVERNANCE_PATHS.execution_input
      && byId.get("approval_receipt")?.relative_path === FIXED_GOVERNANCE_PATHS.approval_receipt
      && byId.get("approval_signature")?.relative_path === FIXED_GOVERNANCE_PATHS.approval_signature,
    "WINDOWS_HANDOFF_BRIDGE_SCHEMA_INVALID",
    "encrypted bridge governance paths differ",
  );
  for (const role of ["baseline", "target"]) {
    const candidate = candidates[role];
    const expectedMaterialized = Object.fromEntries(
      objects
        .filter(({ id }) => id.startsWith(`${role}_`) && id !== `${role}_private_handoff_receipt`)
        .map(({ id, relative_path: relativePath, plaintext_sha256: digest, plaintext_bytes: bytes }) => [
          id.slice(`${role}_`.length),
          { relative_path: relativePath, sha256: digest, bytes },
        ]),
    );
    requireCondition(
      isDeepStrictEqual(candidate.materialized, expectedMaterialized),
      "WINDOWS_HANDOFF_BRIDGE_SCHEMA_INVALID",
      `encrypted bridge ${role} materialized map differs`,
    );
  }
  return Object.freeze({ envelope, candidates, objects, wrappedDataKey });
}

export function createWindowsFormalUpdateEncryptedBridge({
  validated,
  artifactRoot,
  outputDir,
  wrappingPublicKeySpkiBase64,
  wrappingPublicKeySha256,
  runBinding,
  now = Date.now(),
  randomBytesFn = randomBytes,
} = {}) {
  requireCondition(validated?.objects?.length === expectedBridgeObjectIds().length, "WINDOWS_HANDOFF_BRIDGE_SCHEMA_INVALID", "validated private artifacts are required before bridge encryption");
  const locatorSha256 = validated.raw_sha256;
  requireCondition(SHA256.test(locatorSha256 ?? ""), "WINDOWS_HANDOFF_BRIDGE_LOCATOR_MISMATCH", "validated locator digest is invalid");
  validateRunBinding(runBinding);
  const publicKey = validateBridgePublicKey({ wrappingPublicKeySpkiBase64, wrappingPublicKeySha256 });
  const root = resolveTrustedRoot(artifactRoot);
  const target = path.resolve(outputDir);
  requireCondition(!existsSync(target), "WINDOWS_HANDOFF_BRIDGE_ROOT_NOT_FRESH", "encrypted bridge root must start absent");
  let dataKey;
  let targetCreated = false;
  try {
    mkdirSync(target, { recursive: false, mode: 0o700 });
    targetCreated = true;
    resolveTrustedRoot(target);
    dataKey = randomBytesFn(32);
    requireCondition(Buffer.isBuffer(dataKey) && dataKey.length === 32, "WINDOWS_HANDOFF_BRIDGE_RANDOM_INVALID", "encrypted bridge data key must contain 32 random bytes");
    const wrappedDataKey = publicEncrypt({
      key: publicKey,
      padding: cryptoConstants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    }, dataKey);
    const runBindingSha256 = sha256(Buffer.from(runBinding, "utf8"));
    const objects = validated.objects.map((object, index) => {
      const snapshot = readTrustedFileSnapshot(root, object.relative_path);
      requireCondition(snapshot.bytes.length === object.bytes && sha256(snapshot.bytes) === object.sha256, "WINDOWS_HANDOFF_BODY_DIGEST_MISMATCH", `${object.id} changed before encrypted bridge creation`);
      const nonce = randomBytesFn(12);
      requireCondition(Buffer.isBuffer(nonce) && nonce.length === 12, "WINDOWS_HANDOFF_BRIDGE_RANDOM_INVALID", "encrypted bridge nonce must contain 12 random bytes");
      const record = {
        id: object.id,
        relative_path: object.relative_path,
        ciphertext_file: bridgeCiphertextFile(index),
        ciphertext_sha256: "0".repeat(64),
        ciphertext_bytes: snapshot.bytes.length,
        plaintext_sha256: object.sha256,
        plaintext_bytes: object.bytes,
        nonce_base64: nonce.toString("base64"),
        auth_tag_base64: "",
        aad_sha256: "0".repeat(64),
      };
      const aad = bridgeAad({ locatorSha256, runBindingSha256, wrappingPublicKeySha256, object: record });
      const cipher = createCipheriv("aes-256-gcm", dataKey, nonce, { authTagLength: 16 });
      cipher.setAAD(aad, { plaintextLength: snapshot.bytes.length });
      const ciphertext = Buffer.concat([cipher.update(snapshot.bytes), cipher.final()]);
      record.ciphertext_sha256 = sha256(ciphertext);
      record.ciphertext_bytes = ciphertext.length;
      record.auth_tag_base64 = cipher.getAuthTag().toString("base64");
      record.aad_sha256 = sha256(aad);
      writeFileSync(path.join(target, record.ciphertext_file), ciphertext, { flag: "wx", mode: 0o600 });
      return record;
    });
    const envelope = {
      schema_version: WINDOWS_UPDATE_ENCRYPTED_BRIDGE_SCHEMA,
      generated_at: new Date(now).toISOString(),
      locator_sha256: locatorSha256,
      run_binding_sha256: runBindingSha256,
      wrapping_public_key_sha256: wrappingPublicKeySha256,
      encryption: {
        content_cipher: "AES-256-GCM",
        data_key_bytes: 32,
        nonce_bytes: 12,
        authentication_tag_bytes: 16,
        key_wrap: "RSAES_OAEP_SHA_256",
        oaep_label: "empty",
        wrapped_data_key_base64: wrappedDataKey.toString("base64"),
        wrapped_data_key_sha256: sha256(wrappedDataKey),
      },
      candidates: safeCandidateReceipt(validated),
      objects,
      boundaries: {
        plaintext_uploaded_to_github: false,
        exact_s3_locator_included: false,
        aws_credentials_included: false,
        private_key_included: false,
        automatic_update: false,
        public_release_claim: false,
        external_distribution_claim: false,
        production_go_live_claim: false,
      },
    };
    validateEncryptedBridgeEnvelope(envelope, {
      expectedLocatorSha256: locatorSha256,
      expectedWrappingPublicKeySha256: wrappingPublicKeySha256,
      runBinding,
      now,
    });
    const envelopeBytes = Buffer.from(`${JSON.stringify(envelope, null, 2)}\n`, "utf8");
    writeFileSync(path.join(target, "envelope.json"), envelopeBytes, { flag: "wx", mode: 0o600 });
    return Object.freeze({
      envelope: Object.freeze(envelope),
      envelope_sha256: sha256(envelopeBytes),
      encrypted_bridge_root: target,
      object_count: objects.length,
    });
  } catch (error) {
    if (targetCreated) rmSync(target, { recursive: true, force: true });
    throw error;
  } finally {
    if (Buffer.isBuffer(dataKey)) dataKey.fill(0);
  }
}

function loadBridgePrivateKey({ privateKeyPath, expectedWrappingPublicKeySha256 }) {
  requireCondition(typeof privateKeyPath === "string" && path.isAbsolute(privateKeyPath) && !privateKeyPath.includes("\0"), "WINDOWS_HANDOFF_BRIDGE_PRIVATE_KEY_INVALID", "operator bridge private-key path must be absolute");
  const resolved = path.resolve(privateKeyPath);
  const snapshot = readTrustedFileSnapshot(path.dirname(resolved), path.basename(resolved));
  try {
    const privateKey = createPrivateKey({ key: snapshot.bytes, format: "der", type: "pkcs8" });
    const canonicalPrivateKey = privateKey.export({ format: "der", type: "pkcs8" });
    const publicKey = createPublicKey(privateKey);
    const spki = publicKey.export({ format: "der", type: "spki" });
    requireCondition(
      privateKey.asymmetricKeyType === "rsa"
        && privateKey.asymmetricKeyDetails?.modulusLength === 4096
        && privateKey.asymmetricKeyDetails?.publicExponent === 65537n
        && canonicalPrivateKey.equals(snapshot.bytes)
        && sha256(spki) === expectedWrappingPublicKeySha256,
      "WINDOWS_HANDOFF_BRIDGE_PRIVATE_KEY_INVALID",
      "operator bridge private key is not the pinned canonical RSA-4096 PKCS8 key",
    );
    return privateKey;
  } catch (error) {
    if (error instanceof WindowsFormalUpdateHandoffError) throw error;
    fail("WINDOWS_HANDOFF_BRIDGE_PRIVATE_KEY_INVALID", "operator bridge private key is invalid");
  } finally {
    snapshot.bytes.fill(0);
  }
}

export function decryptWindowsFormalUpdateEncryptedBridge({
  encryptedDir,
  artifactRoot,
  expectedEnvelopeSha256,
  expectedLocatorSha256,
  expectedWrappingPublicKeySha256,
  privateKeyPath,
  runBinding,
  now = Date.now(),
} = {}) {
  requireCondition(SHA256.test(expectedEnvelopeSha256 ?? ""), "WINDOWS_HANDOFF_BRIDGE_DIGEST_INVALID", "expected encrypted bridge envelope digest is invalid");
  const encryptedRoot = resolveTrustedRoot(encryptedDir);
  const envelopeSnapshot = readTrustedFileSnapshot(encryptedRoot, "envelope.json");
  requireCondition(sha256(envelopeSnapshot.bytes) === expectedEnvelopeSha256, "WINDOWS_HANDOFF_BRIDGE_DIGEST_INVALID", "encrypted bridge envelope digest differs");
  let envelope;
  try {
    envelope = JSON.parse(envelopeSnapshot.bytes.toString("utf8"));
  } catch {
    fail("WINDOWS_HANDOFF_BRIDGE_SCHEMA_INVALID", "encrypted bridge envelope is not valid JSON");
  }
  requireCondition(Buffer.from(`${JSON.stringify(envelope, null, 2)}\n`, "utf8").equals(envelopeSnapshot.bytes), "WINDOWS_HANDOFF_BRIDGE_SCHEMA_INVALID", "encrypted bridge envelope is not canonical");
  const validatedBridge = validateEncryptedBridgeEnvelope(envelope, {
    expectedLocatorSha256,
    expectedWrappingPublicKeySha256,
    runBinding,
    now,
  });
  const privateKey = loadBridgePrivateKey({ privateKeyPath, expectedWrappingPublicKeySha256 });
  let dataKey;
  const target = path.resolve(artifactRoot);
  requireCondition(!existsSync(target), "WINDOWS_HANDOFF_ARTIFACT_ROOT_NOT_FRESH", "operator private artifact root must start absent");
  let targetCreated = false;
  try {
    dataKey = privateDecrypt({
      key: privateKey,
      padding: cryptoConstants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    }, validatedBridge.wrappedDataKey);
    requireCondition(dataKey.length === 32, "WINDOWS_HANDOFF_BRIDGE_ENCRYPTION_INVALID", "decrypted bridge data key length differs");
    mkdirSync(target, { recursive: false, mode: 0o700 });
    targetCreated = true;
    resolveTrustedRoot(target);
    for (const object of validatedBridge.objects) {
      const ciphertext = readTrustedFileSnapshot(encryptedRoot, object.ciphertext_file).bytes;
      requireCondition(ciphertext.length === object.ciphertext_bytes && sha256(ciphertext) === object.ciphertext_sha256, "WINDOWS_HANDOFF_BRIDGE_CIPHERTEXT_INVALID", `encrypted bridge ${object.id} ciphertext differs`);
      const nonce = canonicalBase64(object.nonce_base64, `encrypted bridge ${object.id} nonce`);
      const tag = canonicalBase64(object.auth_tag_base64, `encrypted bridge ${object.id} authentication tag`);
      const aad = bridgeAad({
        locatorSha256: envelope.locator_sha256,
        runBindingSha256: envelope.run_binding_sha256,
        wrappingPublicKeySha256: envelope.wrapping_public_key_sha256,
        object,
      });
      const decipher = createDecipheriv("aes-256-gcm", dataKey, nonce, { authTagLength: 16 });
      decipher.setAAD(aad, { plaintextLength: object.plaintext_bytes });
      decipher.setAuthTag(tag);
      const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
      try {
        requireCondition(plaintext.length === object.plaintext_bytes && sha256(plaintext) === object.plaintext_sha256, "WINDOWS_HANDOFF_BRIDGE_PLAINTEXT_INVALID", `decrypted bridge ${object.id} plaintext differs`);
        const outputPath = path.join(target, ...object.relative_path.split("/"));
        mkdirSync(path.dirname(outputPath), { recursive: true, mode: 0o700 });
        writeFileSync(outputPath, plaintext, { flag: "wx", mode: 0o600 });
      } finally {
        plaintext.fill(0);
      }
    }
    const byId = new Map(validatedBridge.objects.map((object) => [object.id, object]));
    validateDownloadedExecutionInput(target, {
      governance: { execution_input: byId.get("execution_input") },
      candidates: Object.fromEntries(["baseline", "target"].map((role) => [role, {
        objects: validatedBridge.objects.filter(({ id }) => id.startsWith(`${role}_`)),
      }])),
    });
    return Object.freeze({
      artifact_root: target,
      locator_sha256: envelope.locator_sha256,
      envelope_sha256: expectedEnvelopeSha256,
      object_count: validatedBridge.objects.length,
      candidates: validatedBridge.candidates,
      automatic_update: false,
      public_release_claim: false,
      external_distribution_claim: false,
      production_go_live_claim: false,
    });
  } catch (error) {
    if (targetCreated) rmSync(target, { recursive: true, force: true });
    throw error;
  } finally {
    if (Buffer.isBuffer(dataKey)) dataKey.fill(0);
  }
}

export function purgeWindowsFormalUpdatePrivateRoots(...roots) {
  for (const root of roots) {
    if (typeof root === "string" && root.length > 0) rmSync(path.resolve(root), { recursive: true, force: true });
  }
  requireCondition(
    roots.every((root) => typeof root !== "string" || root.length === 0 || !existsSync(path.resolve(root))),
    "WINDOWS_HANDOFF_PRIVATE_BYTE_CLEANUP_FAILED",
    "private update handoff bytes remained after cleanup",
  );
}

function receiptBase({ validated, locatorSha256, runBinding, verdict, state, providerCallPerformed, errorCode = null, now }) {
  const providerBinding = providerCallStateBinding(locatorSha256, runBinding);
  return {
    schema_version: WINDOWS_UPDATE_HANDOFF_CONSUMER_RECEIPT_SCHEMA,
    generated_at: new Date(now).toISOString(),
    verdict,
    state,
    locator_sha256: locatorSha256,
    expanded_locator_sha256: null,
    run_binding_sha256: providerBinding.run_binding_sha256,
    locator_source: validated?.locator_source ?? null,
    locator_decryption: validated?.locator_decryption ?? null,
    reader: {
      isolated_oidc_job: true,
      aws_account_id: WINDOWS_SIGNED_ARTIFACT_HANDOFF_ACCOUNT,
      aws_region: WINDOWS_SIGNED_ARTIFACT_HANDOFF_REGION,
      role_arn: validated?.locator?.reader_role_arn ?? null,
      locator_unwrap_kms_key_arn: validated?.locator_decryption?.wrapping_key_arn ?? null,
    },
    ...(validated ? { candidates: safeCandidateReceipt(validated) } : {}),
    objects: validated?.objects?.map(({ id, relative_path: relativePath, sha256: digest, bytes }) => ({
      id,
      relative_path: relativePath,
      sha256: digest,
      bytes,
      exact_version_head_verified: false,
      exact_version_get_verified: false,
      full_body_sha256_verified: false,
      object_lock_compliance_verified: false,
      retention_verified: false,
    })) ?? [],
    retrieval: {
      expected_object_count: validated?.objects.length ?? 0,
      exact_version_head_verified: 0,
      exact_version_get_verified: 0,
      full_body_sha256_verified: 0,
      object_lock_compliance_verified: 0,
      retention_verified: 0,
    },
    cleanup: {
      aws_credentials_cleared: false,
      oidc_credentials_cleared: false,
      private_artifact_root_removed: false,
      expanded_locator_removed: false,
      locator_artifact_root_removed: false,
      encrypted_bridge_root_removed: false,
    },
    bridge: {
      envelope_sha256: null,
      object_count: 0,
      current_run_bound: false,
    },
    runner_receipt_sha256: null,
    ...(errorCode ? { error_code: errorCode } : {}),
    boundaries: {
      provider_call_performed: providerCallPerformed,
      exact_s3_locator_recorded: false,
      plaintext_uploaded_to_github: false,
      automatic_update: false,
      public_release_claim: false,
      external_distribution_claim: false,
      production_go_live_claim: false,
    },
  };
}

export function createWindowsFormalUpdateHandoffPreflightReceipt({
  validated,
  locatorSha256,
  runBinding,
  providerCallStatePath,
  now = Date.now(),
}) {
  const providerCallPerformed = readWindowsFormalUpdateProviderCallState({
    statePath: providerCallStatePath,
    expectedLocatorSha256: locatorSha256,
    runBinding,
  });
  return receiptBase({
    validated,
    locatorSha256,
    runBinding,
    verdict: "BLOCKED",
    state: "LOCATOR_VALIDATED",
    providerCallPerformed,
    now,
  });
}

export function createWindowsFormalUpdateHandoffFailureReceipt({
  error,
  validated = null,
  locatorSha256,
  runBinding,
  providerCallStatePath,
  now = Date.now(),
}) {
  const code = /^[A-Z0-9._-]{1,96}$/u.test(error?.code ?? "") ? error.code : "WINDOWS_HANDOFF_CONSUMER_FAILED";
  const providerCallPerformed = readWindowsFormalUpdateProviderCallState({
    statePath: providerCallStatePath,
    expectedLocatorSha256: locatorSha256,
    runBinding,
  });
  return receiptBase({
    validated,
    locatorSha256,
    runBinding,
    verdict: "FAIL",
    state: "BLOCKED",
    providerCallPerformed,
    errorCode: code,
    now,
  });
}

export function writeWindowsFormalUpdateHandoffReceipt(receiptPath, receipt, { replace = false } = {}) {
  return atomicWriteCanonicalJson(receiptPath, receipt, { replace }).sha256;
}

function exactAbsoluteStatePath(value, label) {
  requireCondition(
    typeof value === "string"
      && path.isAbsolute(value)
      && path.resolve(value) === value
      && !value.includes("\0"),
    "WINDOWS_HANDOFF_PROVIDER_STATE_INVALID",
    `${label} must be exact and absolute`,
  );
  resolveTrustedRoot(path.dirname(value));
  return value;
}

function lstatIfPresent(filePath) {
  try {
    return lstatSync(filePath, { bigint: true });
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

function fsyncParentDirectory(filePath) {
  const descriptor = openSync(path.dirname(filePath), "r");
  try {
    fsyncSync(descriptor);
  } finally {
    closeSync(descriptor);
  }
}

function sameFileIdentity(left, right) {
  return left.dev === right.dev && left.ino === right.ino;
}

function recoverAtomicJsonResidue(filePath) {
  const target = exactAbsoluteStatePath(filePath, "atomic state path");
  const temporary = `${target}.tmp`;
  const temporaryBefore = lstatIfPresent(temporary);
  if (temporaryBefore === null) return target;
  const targetBefore = lstatIfPresent(target);
  requireCondition(
    temporaryBefore.isFile() && (temporaryBefore.nlink === 1n || temporaryBefore.nlink === 2n),
    "WINDOWS_HANDOFF_PROVIDER_STATE_INVALID",
    "atomic temporary residue is not a legitimate regular sibling",
  );
  requireCondition(
    targetBefore === null
      || (targetBefore.isFile()
        && targetBefore.nlink === (temporaryBefore.nlink === 2n ? 2n : 1n)),
    "WINDOWS_HANDOFF_PROVIDER_STATE_INVALID",
    "atomic target is not a legitimate regular sibling",
  );
  requireCondition(
    temporaryBefore.nlink !== 2n
      || (targetBefore !== null && sameFileIdentity(temporaryBefore, targetBefore)),
    "WINDOWS_HANDOFF_PROVIDER_STATE_INVALID",
    "atomic temporary hard link is not paired with the exact target",
  );
  unlinkSync(temporary);
  fsyncParentDirectory(target);
  const targetAfter = lstatIfPresent(target);
  requireCondition(
    lstatIfPresent(temporary) === null
      && (targetBefore === null
        ? targetAfter === null
        : targetAfter !== null
          && targetAfter.isFile()
          && targetAfter.nlink === 1n
          && sameFileIdentity(targetBefore, targetAfter)),
    "WINDOWS_HANDOFF_PROVIDER_STATE_INVALID",
    "atomic residue cleanup did not preserve the exact target",
  );
  return target;
}

function atomicWriteCanonicalJson(filePath, value, { replace = false } = {}) {
  const target = recoverAtomicJsonResidue(filePath);
  const temporary = `${target}.tmp`;
  requireCondition(
    !existsSync(temporary) && (replace || !existsSync(target)),
    "WINDOWS_HANDOFF_PROVIDER_STATE_INVALID",
    "atomic state target or temporary path is not fresh",
  );
  const bytes = Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8");
  let descriptor;
  let published = false;
  try {
    descriptor = openSync(temporary, "wx", 0o600);
    writeFileSync(descriptor, bytes);
    fsyncSync(descriptor);
    closeSync(descriptor);
    descriptor = undefined;
    if (replace) {
      renameSync(temporary, target);
    } else {
      linkSync(temporary, target);
      unlinkSync(temporary);
    }
    published = true;
    fsyncParentDirectory(target);
  } catch (error) {
    if (descriptor !== undefined) closeSync(descriptor);
    if (!published && existsSync(temporary)) rmSync(temporary, { force: true });
    throw error;
  }
  const snapshot = readTrustedFileSnapshot(path.dirname(target), path.basename(target));
  requireCondition(
    snapshot.bytes.equals(bytes),
    "WINDOWS_HANDOFF_PROVIDER_STATE_INVALID",
    "atomic state stable reread differs from the persisted bytes",
  );
  return Object.freeze({ bytes: snapshot.bytes, sha256: sha256(snapshot.bytes) });
}

function providerCallStateBinding(locatorSha256, runBinding) {
  requireCondition(
    SHA256.test(locatorSha256 ?? ""),
    "WINDOWS_HANDOFF_PROVIDER_STATE_INVALID",
    "provider state locator digest is invalid",
  );
  return Object.freeze({
    locator_sha256: locatorSha256,
    run_binding_sha256: sha256(Buffer.from(validateRunBinding(runBinding), "utf8")),
  });
}

function providerCallStateRecord(locatorSha256, runBinding) {
  const binding = providerCallStateBinding(locatorSha256, runBinding);
  return Object.freeze({
    schema_version: WINDOWS_UPDATE_PROVIDER_CALL_STATE_SCHEMA,
    ...binding,
    provider_call_performed: true,
  });
}

export function readWindowsFormalUpdateProviderCallState({
  statePath,
  expectedLocatorSha256,
  runBinding,
} = {}) {
  const target = exactAbsoluteStatePath(statePath, "provider-call state path");
  recoverAtomicJsonResidue(target);
  if (!existsSync(target)) return false;
  const snapshot = readTrustedFileSnapshot(path.dirname(target), path.basename(target));
  let state;
  try {
    state = JSON.parse(snapshot.bytes.toString("utf8"));
  } catch {
    fail("WINDOWS_HANDOFF_PROVIDER_STATE_INVALID", "provider-call state is not valid JSON");
  }
  requireCondition(
    snapshot.bytes.equals(Buffer.from(`${JSON.stringify(state, null, 2)}\n`, "utf8"))
      && isRecord(state)
      && Object.keys(state).sort().join("\0") === [
        "locator_sha256", "provider_call_performed", "run_binding_sha256", "schema_version",
      ].sort().join("\0"),
    "WINDOWS_HANDOFF_PROVIDER_STATE_INVALID",
    "provider-call state must use the exact canonical schema",
  );
  const expected = providerCallStateRecord(expectedLocatorSha256, runBinding);
  requireCondition(
    isDeepStrictEqual(state, expected),
    "WINDOWS_HANDOFF_PROVIDER_STATE_INVALID",
    "provider-call state is not authenticated to the exact locator and run binding",
  );
  return true;
}

export function persistWindowsFormalUpdateProviderCallState({
  statePath,
  locatorSha256,
  runBinding,
} = {}) {
  const target = exactAbsoluteStatePath(statePath, "provider-call state path");
  recoverAtomicJsonResidue(target);
  if (existsSync(target)) {
    requireCondition(
      readWindowsFormalUpdateProviderCallState({
        statePath: target,
        expectedLocatorSha256: locatorSha256,
        runBinding,
      }) === true,
      "WINDOWS_HANDOFF_PROVIDER_STATE_INVALID",
      "provider-call state cannot transition away from true",
    );
    return true;
  }
  atomicWriteCanonicalJson(target, providerCallStateRecord(locatorSha256, runBinding));
  requireCondition(
    readWindowsFormalUpdateProviderCallState({
      statePath: target,
      expectedLocatorSha256: locatorSha256,
      runBinding,
    }) === true,
    "WINDOWS_HANDOFF_PROVIDER_STATE_INVALID",
    "provider-call state was not durably persisted",
  );
  return true;
}

function validateWindowsFormalUpdateProviderStateObjectProofs(receipt) {
  const objectFields = [
    "bytes", "exact_version_get_verified", "exact_version_head_verified",
    "full_body_sha256_verified", "id", "object_lock_compliance_verified", "relative_path",
    "retention_verified", "sha256",
  ];
  const expectedIds = expectedBridgeObjectIds();
  requireCondition(
    Array.isArray(receipt.objects)
      && receipt.objects.length === expectedIds.length
      && receipt.objects.map(({ id }) => id).join("\0") === expectedIds.join("\0"),
    "WINDOWS_HANDOFF_PROVIDER_STATE_INVALID",
    "provider state receipt object inventory differs from the exact 19-object contract",
  );
  const paths = new Set();
  for (const object of receipt.objects) {
    requireCondition(
      isRecord(object)
        && Object.keys(object).sort().join("\0") === objectFields.sort().join("\0")
        && SHA256.test(object.sha256 ?? "")
        && Number.isSafeInteger(object.bytes) && object.bytes > 0
        && object.exact_version_head_verified === true
        && object.exact_version_get_verified === true
        && object.full_body_sha256_verified === true
        && object.object_lock_compliance_verified === true
        && object.retention_verified === true,
      "WINDOWS_HANDOFF_PROVIDER_STATE_INVALID",
      `provider state receipt ${object?.id ?? "object"} proof is invalid`,
    );
    let relativePath;
    try {
      relativePath = safeRelative(
        object.relative_path,
        `provider state receipt ${object.id}`,
        bridgeObjectSuffix(object.id),
      );
    } catch {
      fail("WINDOWS_HANDOFF_PROVIDER_STATE_INVALID", `provider state receipt ${object.id} path is invalid`);
    }
    const foldedPath = relativePath.toLowerCase();
    requireCondition(
      !paths.has(foldedPath),
      "WINDOWS_HANDOFF_PROVIDER_STATE_INVALID",
      "provider state receipt object paths must be unique on Windows",
    );
    paths.add(foldedPath);
  }
  requireCondition(
    receipt.objects.find(({ id }) => id === "execution_input")?.relative_path === FIXED_GOVERNANCE_PATHS.execution_input
      && receipt.objects.find(({ id }) => id === "approval_receipt")?.relative_path === FIXED_GOVERNANCE_PATHS.approval_receipt
      && receipt.objects.find(({ id }) => id === "approval_signature")?.relative_path === FIXED_GOVERNANCE_PATHS.approval_signature,
    "WINDOWS_HANDOFF_PROVIDER_STATE_INVALID",
    "provider state receipt governance paths differ",
  );
  requireCondition(
    isRecord(receipt.candidates)
      && Object.keys(receipt.candidates).sort().join("\0") === "baseline\0target",
    "WINDOWS_HANDOFF_PROVIDER_STATE_INVALID",
    "provider state receipt candidate inventory differs",
  );
  const proofById = new Map(receipt.objects.map((object) => [object.id, object]));
  const materializedKinds = [
    ...MATERIALIZED_PATH_FIELDS,
    "release_manifest", "update_metadata", "update_metadata_signature",
  ];
  for (const role of ["baseline", "target"]) {
    let candidate;
    try {
      candidate = validateBridgeCandidateIdentity(receipt.candidates[role], `provider state ${role}`);
    } catch {
      fail("WINDOWS_HANDOFF_PROVIDER_STATE_INVALID", `provider state receipt ${role} candidate is invalid`);
    }
    requireCondition(
      Object.keys(candidate.materialized).sort().join("\0") === [...materializedKinds].sort().join("\0"),
      "WINDOWS_HANDOFF_PROVIDER_STATE_INVALID",
      `provider state receipt ${role} materialized inventory differs`,
    );
    for (const kind of materializedKinds) {
      const materialized = candidate.materialized[kind];
      const proof = proofById.get(`${role}_${kind}`);
      requireCondition(
        isRecord(materialized)
          && Object.keys(materialized).sort().join("\0") === "bytes\0relative_path\0sha256"
          && materialized.relative_path === proof?.relative_path
          && materialized.sha256 === proof?.sha256
          && materialized.bytes === proof?.bytes,
        "WINDOWS_HANDOFF_PROVIDER_STATE_INVALID",
        `provider state receipt ${role} ${kind} proof differs from its candidate identity`,
      );
    }
  }
  const counters = {
    expected_object_count: receipt.objects.length,
    exact_version_head_verified: receipt.objects.filter(({ exact_version_head_verified: value }) => value === true).length,
    exact_version_get_verified: receipt.objects.filter(({ exact_version_get_verified: value }) => value === true).length,
    full_body_sha256_verified: receipt.objects.filter(({ full_body_sha256_verified: value }) => value === true).length,
    object_lock_compliance_verified: receipt.objects.filter(({ object_lock_compliance_verified: value }) => value === true).length,
    retention_verified: receipt.objects.filter(({ retention_verified: value }) => value === true).length,
  };
  requireCondition(
    isDeepStrictEqual(receipt.retrieval, counters),
    "WINDOWS_HANDOFF_PROVIDER_STATE_INVALID",
    "provider state receipt retrieval counters differ from its exact object proofs",
  );
}

export function readWindowsFormalUpdateHandoffProviderCallState({
  receiptPath,
  providerCallStatePath,
  expectedLocatorSha256,
  runBinding,
} = {}) {
  const target = recoverAtomicJsonResidue(exactAbsoluteStatePath(receiptPath, "provider state receipt path"));
  const snapshot = readTrustedFileSnapshot(path.dirname(target), path.basename(target));
  let receipt;
  try {
    receipt = JSON.parse(snapshot.bytes.toString("utf8"));
  } catch {
    fail("WINDOWS_HANDOFF_PROVIDER_STATE_INVALID", "provider state receipt is not valid JSON");
  }
  requireCondition(
    snapshot.bytes.equals(Buffer.from(`${JSON.stringify(receipt, null, 2)}\n`, "utf8")),
    "WINDOWS_HANDOFF_PROVIDER_STATE_INVALID",
    "provider state receipt bytes are not canonical",
  );
  const receiptFields = [
    "boundaries", "bridge", "candidates", "cleanup", "expanded_locator_sha256",
    "generated_at", "locator_decryption", "locator_sha256", "locator_source", "objects",
    "reader", "retrieval", "run_binding_sha256", "runner_receipt_sha256", "schema_version",
    "state", "verdict",
  ];
  const boundaryFields = [
    "automatic_update", "exact_s3_locator_recorded", "external_distribution_claim",
    "plaintext_uploaded_to_github", "production_go_live_claim", "provider_call_performed",
    "public_release_claim",
  ];
  const cleanupFields = [
    "aws_credentials_cleared", "encrypted_bridge_root_removed", "expanded_locator_removed",
    "locator_artifact_root_removed", "oidc_credentials_cleared", "private_artifact_root_removed",
  ];
  const retrievalFields = [
    "exact_version_get_verified", "exact_version_head_verified", "expected_object_count",
    "full_body_sha256_verified", "object_lock_compliance_verified", "retention_verified",
  ];
  const bridgeFields = ["current_run_bound", "envelope_sha256", "object_count"];
  requireCondition(
    isRecord(receipt)
      && Object.keys(receipt).sort().join("\0") === receiptFields.sort().join("\0")
      && isRecord(receipt.boundaries)
      && Object.keys(receipt.boundaries).sort().join("\0") === boundaryFields.sort().join("\0")
      && isRecord(receipt.cleanup)
      && Object.keys(receipt.cleanup).sort().join("\0") === cleanupFields.sort().join("\0")
      && isRecord(receipt.retrieval)
      && Object.keys(receipt.retrieval).sort().join("\0") === retrievalFields.sort().join("\0")
      && isRecord(receipt.bridge)
      && Object.keys(receipt.bridge).sort().join("\0") === bridgeFields.sort().join("\0"),
    "WINDOWS_HANDOFF_PROVIDER_STATE_INVALID",
    "provider state receipt must use the exact materialized schema",
  );
  const expectedRunBindingSha256 = sha256(Buffer.from(validateRunBinding(runBinding), "utf8"));
  const generatedAt = new Date(receipt.generated_at);
  validateWindowsFormalUpdateProviderStateObjectProofs(receipt);
  requireCondition(
    SHA256.test(expectedLocatorSha256 ?? "")
      && receipt.schema_version === WINDOWS_UPDATE_HANDOFF_CONSUMER_RECEIPT_SCHEMA
      && receipt.verdict === "PASS"
      && receipt.state === "PENDING_CLEANUP"
      && !Number.isNaN(generatedAt.valueOf()) && generatedAt.toISOString() === receipt.generated_at
      && receipt.locator_sha256 === expectedLocatorSha256
      && receipt.run_binding_sha256 === expectedRunBindingSha256
      && SHA256.test(receipt.expanded_locator_sha256 ?? "")
      && Array.isArray(receipt.objects) && receipt.objects.length === 19
      && receipt.objects.every((object) => object?.exact_version_head_verified === true
        && object.exact_version_get_verified === true
        && object.full_body_sha256_verified === true
        && object.object_lock_compliance_verified === true
        && object.retention_verified === true)
      && receipt.retrieval?.expected_object_count === 19
      && receipt.retrieval?.exact_version_head_verified === 19
      && receipt.retrieval?.exact_version_get_verified === 19
      && receipt.retrieval?.full_body_sha256_verified === 19
      && receipt.retrieval?.object_lock_compliance_verified === 19
      && receipt.retrieval?.retention_verified === 19
      && Object.values(receipt.cleanup).every((value) => value === false)
      && receipt.bridge.envelope_sha256 === null
      && receipt.bridge.object_count === 0
      && receipt.bridge.current_run_bound === false
      && receipt.runner_receipt_sha256 === null
      && typeof receipt.boundaries.provider_call_performed === "boolean"
      && receipt.boundaries.exact_s3_locator_recorded === false
      && receipt.boundaries.plaintext_uploaded_to_github === false
      && receipt.boundaries.automatic_update === false
      && receipt.boundaries.public_release_claim === false
      && receipt.boundaries.external_distribution_claim === false
      && receipt.boundaries.production_go_live_claim === false,
    "WINDOWS_HANDOFF_PROVIDER_STATE_INVALID",
    "provider state receipt differs from the exact locator, run, retrieval, or boundary binding",
  );
  const durableProviderCallPerformed = readWindowsFormalUpdateProviderCallState({
    statePath: providerCallStatePath,
    expectedLocatorSha256,
    runBinding,
  });
  requireCondition(
    receipt.boundaries.provider_call_performed === durableProviderCallPerformed,
    "WINDOWS_HANDOFF_PROVIDER_STATE_INVALID",
    "materialized receipt provider state differs from the authenticated durable state",
  );
  return durableProviderCallPerformed;
}

export function transitionWindowsFormalUpdateHandoffProviderCallState({
  currentProviderCallPerformed,
  receiptPath,
  providerCallStatePath,
  expectedLocatorSha256,
  runBinding,
} = {}) {
  requireCondition(
    typeof currentProviderCallPerformed === "boolean",
    "WINDOWS_HANDOFF_PROVIDER_STATE_INVALID",
    "current provider-call state must be an explicit boolean",
  );
  const previousProviderCallPerformed = readWindowsFormalUpdateHandoffProviderCallState({
    receiptPath,
    providerCallStatePath,
    expectedLocatorSha256,
    runBinding,
  });
  requireCondition(
    currentProviderCallPerformed !== true || previousProviderCallPerformed === true,
    "WINDOWS_HANDOFF_PROVIDER_STATE_INVALID",
    "current provider-call state is not authenticated by the durable marker",
  );
  return previousProviderCallPerformed;
}

export function reconcileWindowsFormalUpdateHandoffProviderCallState({
  receiptPath,
  statePath,
  expectedLocatorSha256,
  runBinding,
  now = Date.now(),
} = {}) {
  const target = recoverAtomicJsonResidue(exactAbsoluteStatePath(receiptPath, "provider-state receipt path"));
  const providerCallPerformed = readWindowsFormalUpdateProviderCallState({
    statePath,
    expectedLocatorSha256,
    runBinding,
  });
  const writeInterruptedReceipt = (replace) => {
    requireCondition(
      providerCallPerformed === true,
      "WINDOWS_HANDOFF_PROVIDER_STATE_INVALID",
      "interrupted consumer receipt has no authenticated provider-call state",
    );
    const interrupted = receiptBase({
      validated: null,
      locatorSha256: expectedLocatorSha256,
      runBinding,
      verdict: "FAIL",
      state: "BLOCKED",
      providerCallPerformed: true,
      errorCode: "WINDOWS_HANDOFF_PROVIDER_INTERRUPTED",
      now,
    });
    const written = atomicWriteCanonicalJson(target, interrupted, { replace });
    return Object.freeze({
      receipt: Object.freeze(interrupted),
      receipt_sha256: written.sha256,
      provider_call_performed: true,
    });
  };
  if (!existsSync(target)) {
    return writeInterruptedReceipt(false);
  }
  const snapshot = readTrustedFileSnapshot(path.dirname(target), path.basename(target));
  let receipt;
  try {
    receipt = JSON.parse(snapshot.bytes.toString("utf8"));
  } catch {
    if (providerCallPerformed === true) return writeInterruptedReceipt(true);
    fail("WINDOWS_HANDOFF_PROVIDER_STATE_INVALID", "provider-state receipt is not valid JSON");
  }
  requireCondition(
    isRecord(receipt),
    "WINDOWS_HANDOFF_PROVIDER_STATE_INVALID",
    "provider-state receipt must be an object",
  );
  const baseFields = [
    "boundaries", "bridge", "cleanup", "expanded_locator_sha256", "generated_at",
    "locator_decryption", "locator_sha256", "locator_source", "objects", "reader", "retrieval",
    "run_binding_sha256", "runner_receipt_sha256", "schema_version", "state", "verdict",
  ];
  const expectedFields = [
    ...baseFields,
    ...(Object.hasOwn(receipt, "candidates") ? ["candidates"] : []),
    ...(Object.hasOwn(receipt, "error_code") ? ["error_code"] : []),
  ];
  const boundaryFields = [
    "automatic_update", "exact_s3_locator_recorded", "external_distribution_claim",
    "plaintext_uploaded_to_github", "production_go_live_claim", "provider_call_performed",
    "public_release_claim",
  ];
  const expectedBinding = providerCallStateBinding(expectedLocatorSha256, runBinding);
  requireCondition(
    snapshot.bytes.equals(Buffer.from(`${JSON.stringify(receipt, null, 2)}\n`, "utf8"))
      && Object.keys(receipt).sort().join("\0") === expectedFields.sort().join("\0")
      && receipt.schema_version === WINDOWS_UPDATE_HANDOFF_CONSUMER_RECEIPT_SCHEMA
      && receipt.locator_sha256 === expectedBinding.locator_sha256
      && receipt.run_binding_sha256 === expectedBinding.run_binding_sha256
      && isRecord(receipt.boundaries)
      && Object.keys(receipt.boundaries).sort().join("\0") === boundaryFields.sort().join("\0")
      && typeof receipt.boundaries.provider_call_performed === "boolean"
      && receipt.boundaries.exact_s3_locator_recorded === false
      && receipt.boundaries.plaintext_uploaded_to_github === false
      && receipt.boundaries.automatic_update === false
      && receipt.boundaries.public_release_claim === false
      && receipt.boundaries.external_distribution_claim === false
      && receipt.boundaries.production_go_live_claim === false,
    "WINDOWS_HANDOFF_PROVIDER_STATE_INVALID",
    "provider-state receipt is not the exact locator/run-bound consumer receipt",
  );
  requireCondition(
    receipt.boundaries.provider_call_performed !== true || providerCallPerformed === true,
    "WINDOWS_HANDOFF_PROVIDER_STATE_INVALID",
    "receipt carries unauthenticated provider-call state",
  );
  requireCondition(
    receipt.verdict !== "PASS" || providerCallPerformed === true,
    "WINDOWS_HANDOFF_PROVIDER_STATE_INVALID",
    "a PASS receipt cannot carry a false provider-call state",
  );
  receipt.boundaries.provider_call_performed = providerCallPerformed;
  const written = atomicWriteCanonicalJson(target, receipt, { replace: true });
  return Object.freeze({
    receipt: Object.freeze(receipt),
    receipt_sha256: written.sha256,
    provider_call_performed: providerCallPerformed,
  });
}

function writeExpandedLocator(expandedLocatorPath, expanded) {
  const bytes = Buffer.from(`${JSON.stringify({
    schema_version: "law-firm-os.windows-formal-update-expanded-private-locator.v1",
    locator_sha256: expanded.raw_sha256,
    locator: expanded.locator,
    objects: expanded.objects,
    candidates: expanded.candidates,
    governance: expanded.governance,
  }, null, 2)}\n`, "utf8");
  writeFileSync(expandedLocatorPath, bytes, { flag: "wx", mode: 0o600 });
  return sha256(bytes);
}

export async function materializeWindowsFormalUpdatePrivateHandoff({
  validated,
  artifactRoot,
  receiptPath,
  expandedLocatorPath,
  locatorSha256,
  runBinding,
  providerCallStatePath,
  aws,
  now = Date.now(),
} = {}) {
  requireCondition(validated?.receipt_objects?.length === 2 && typeof aws?.inspectGovernance === "function" && typeof aws?.headObject === "function" && typeof aws?.getObject === "function", "WINDOWS_HANDOFF_CONSUMER_ADAPTER_INVALID", "complete private handoff inputs and AWS reader are required");
  providerCallStateBinding(locatorSha256, runBinding);
  const root = path.resolve(artifactRoot);
  requireCondition(!existsSync(root), "WINDOWS_HANDOFF_ARTIFACT_ROOT_NOT_FRESH", "private artifact root must not already exist");
  mkdirSync(root, { recursive: false, mode: 0o700 });
  const partialRoot = path.join(root, ".partial");
  mkdirSync(partialRoot, { recursive: false, mode: 0o700 });
  try {
    const provider = await aws.inspectGovernance(validated.locator);
    validateProviderGovernance({ locator: validated.locator, provider });
    const fetchObject = async (object, index) => {
      const head = await aws.headObject({ locator: validated.locator, object });
      validateLiveReadback({ response: head, object, locator: validated.locator, label: `${object.id} HEAD`, now });
      const partialPath = path.join(partialRoot, String(index).padStart(3, "0"));
      const get = await aws.getObject({ locator: validated.locator, object, destination: partialPath });
      validateLiveReadback({ response: get, object, locator: validated.locator, label: `${object.id} GET`, now });
      const bytes = readTrustedFileSnapshot(partialRoot, path.basename(partialPath)).bytes;
      requireCondition(bytes.length === object.bytes && sha256(bytes) === object.sha256, "WINDOWS_HANDOFF_BODY_DIGEST_MISMATCH", `${object.id} full GET body differs`);
      const target = path.join(root, ...object.relative_path.split("/"));
      mkdirSync(path.dirname(target), { recursive: true, mode: 0o700 });
      requireCondition(!existsSync(target), "WINDOWS_HANDOFF_MATERIALIZED_PATH_DUPLICATE", `${object.id} materialized path already exists`);
      renameSync(partialPath, target);
    };
    for (const [index, object] of validated.receipt_objects.entries()) {
      await fetchObject(object, index);
    }
    let expanded = expandValidatedPrivateReceipts(root, validated, now);
    for (const [index, object] of expanded.objects.entries()) {
      if (object.id.endsWith("_private_handoff_receipt")) continue;
      await fetchObject(object, index);
    }
    rmSync(partialRoot, { recursive: true, force: false });
    validateDownloadedExecutionInput(root, expanded);
    expanded = attachDownloadedNativeEvidence(root, expanded);
    const count = expanded.objects.length;
    const providerCallPerformed = readWindowsFormalUpdateProviderCallState({
      statePath: providerCallStatePath,
      expectedLocatorSha256: locatorSha256,
      runBinding,
    });
    requireCondition(
      providerCallPerformed === true,
      "WINDOWS_HANDOFF_PROVIDER_STATE_INVALID",
      "materialized PASS receipt requires authenticated provider-call state",
    );
    const receipt = receiptBase({
      validated: expanded,
      locatorSha256,
      runBinding,
      verdict: "PASS",
      state: "PENDING_CLEANUP",
      providerCallPerformed,
      now,
    });
    receipt.retrieval = {
      expected_object_count: count,
      exact_version_head_verified: count,
      exact_version_get_verified: count,
      full_body_sha256_verified: count,
      object_lock_compliance_verified: count,
      retention_verified: count,
    };
    receipt.objects = receipt.objects.map((object) => ({
      ...object,
      exact_version_head_verified: true,
      exact_version_get_verified: true,
      full_body_sha256_verified: true,
      object_lock_compliance_verified: true,
      retention_verified: true,
    }));
    const expandedLocatorSha256 = writeExpandedLocator(expandedLocatorPath, expanded);
    receipt.expanded_locator_sha256 = expandedLocatorSha256;
    const receiptSha256 = writeWindowsFormalUpdateHandoffReceipt(receiptPath, receipt, { replace: true });
    return Object.freeze({
      receipt,
      receipt_sha256: receiptSha256,
      artifact_root: root,
      validated: expanded,
      expanded_locator_sha256: expandedLocatorSha256,
    });
  } catch (error) {
    rmSync(root, { recursive: true, force: true });
    if (expandedLocatorPath) rmSync(path.resolve(expandedLocatorPath), { force: true });
    throw error;
  }
}

export function finalizeWindowsFormalUpdateHandoffReceipt({
  artifactRoot,
  locatorArtifactRoot,
  receiptPath,
  expandedLocatorPath,
  awsCredentialsPresent,
  oidcCredentialsPresent = false,
  runBinding,
  providerCallStatePath,
  bridgeEnvelopeSha256,
  bridgeObjectCount,
  now = Date.now(),
} = {}) {
  rmSync(path.resolve(artifactRoot), { recursive: true, force: true });
  rmSync(path.resolve(locatorArtifactRoot), { recursive: true, force: true });
  rmSync(path.resolve(expandedLocatorPath), { force: true });
  const privateArtifactRootRemoved = !existsSync(path.resolve(artifactRoot));
  const locatorArtifactRootRemoved = !existsSync(path.resolve(locatorArtifactRoot));
  const expandedLocatorRemoved = !existsSync(path.resolve(expandedLocatorPath));
  const resolvedReceiptPath = path.resolve(receiptPath);
  recoverAtomicJsonResidue(resolvedReceiptPath);
  const receipt = JSON.parse(readTrustedFileSnapshot(
    path.dirname(resolvedReceiptPath),
    path.basename(resolvedReceiptPath),
  ).bytes.toString("utf8"));
  const providerCallPerformed = readWindowsFormalUpdateProviderCallState({
    statePath: providerCallStatePath,
    expectedLocatorSha256: receipt.locator_sha256,
    runBinding,
  });
  receipt.generated_at = new Date(now).toISOString();
  receipt.run_binding_sha256 = sha256(Buffer.from(validateRunBinding(runBinding), "utf8"));
  receipt.boundaries.provider_call_performed = providerCallPerformed;
  const bridgeValid = SHA256.test(bridgeEnvelopeSha256 ?? "") && bridgeObjectCount === 19;
  receipt.bridge = {
    envelope_sha256: bridgeValid ? bridgeEnvelopeSha256 : null,
    object_count: bridgeValid ? bridgeObjectCount : 0,
    current_run_bound: bridgeValid,
  };
  receipt.cleanup = {
    aws_credentials_cleared: awsCredentialsPresent === false,
    oidc_credentials_cleared: oidcCredentialsPresent === false,
    private_artifact_root_removed: privateArtifactRootRemoved,
    expanded_locator_removed: expandedLocatorRemoved,
    locator_artifact_root_removed: locatorArtifactRootRemoved,
    encrypted_bridge_root_removed: false,
  };
  receipt.state = receipt.verdict === "PASS"
    && receipt.cleanup.aws_credentials_cleared
    && receipt.cleanup.oidc_credentials_cleared
    && receipt.cleanup.private_artifact_root_removed
    && receipt.cleanup.expanded_locator_removed
    && receipt.cleanup.locator_artifact_root_removed
    && bridgeValid
    && providerCallPerformed
    ? "PENDING_OPERATOR"
    : "BLOCKED";
  atomicWriteCanonicalJson(resolvedReceiptPath, receipt, { replace: true });
  requireCondition(receipt.cleanup.aws_credentials_cleared, "WINDOWS_HANDOFF_AWS_CREDENTIAL_CLEANUP_FAILED", "AWS credentials remained after private retrieval");
  requireCondition(receipt.cleanup.oidc_credentials_cleared, "WINDOWS_HANDOFF_OIDC_CREDENTIAL_CLEANUP_FAILED", "OIDC credentials remained after private retrieval");
  requireCondition(receipt.cleanup.private_artifact_root_removed, "WINDOWS_HANDOFF_PRIVATE_BYTE_CLEANUP_FAILED", "private artifact bytes remained after the operator run");
  requireCondition(receipt.cleanup.expanded_locator_removed, "WINDOWS_HANDOFF_PRIVATE_BYTE_CLEANUP_FAILED", "expanded private locator remained after retrieval");
  requireCondition(receipt.cleanup.locator_artifact_root_removed, "WINDOWS_HANDOFF_PRIVATE_BYTE_CLEANUP_FAILED", "aggregate locator ciphertext remained after retrieval");
  requireCondition(providerCallPerformed, "WINDOWS_HANDOFF_PROVIDER_STATE_INVALID", "cleanup receipt lacks authenticated provider-call state");
  return Object.freeze(receipt);
}

function finalReceiptExactKeys(value, fields, label) {
  requireCondition(
    isRecord(value) && Object.keys(value).sort().join("\0") === [...fields].sort().join("\0"),
    "WINDOWS_HANDOFF_FINAL_RECEIPT_INPUT_INVALID",
    `${label} must use the exact closed schema`,
  );
}

function validateFinalLocatorBinding(receipt, expectedLocatorSha256, runBinding) {
  const source = receipt.locator_source;
  finalReceiptExactKeys(source, [
    "artifact", "artifact_ref_sha256", "preflight_cleanup", "producer", "verification",
  ], "consumer aggregate locator source");
  finalReceiptExactKeys(source.producer, [
    "job", "repository", "run_attempt", "run_id", "source_sha", "source_tree", "workflow_ref",
  ], "consumer aggregate locator producer");
  finalReceiptExactKeys(source.artifact, [
    "digest", "envelope_sha256", "id", "name", "private_locator_sha256", "wrapping_public_key_sha256",
  ], "consumer aggregate locator artifact");
  finalReceiptExactKeys(source.verification, [
    "artifact_metadata_verified", "ciphertext_verified", "envelope_verified", "exact_file_set_verified",
    "job_metadata_verified", "raw_archive_digest_verified", "run_metadata_verified", "token_permission",
  ], "consumer aggregate locator verification");
  finalReceiptExactKeys(source.preflight_cleanup, [
    "actions_read_token_cleared", "oidc_credentials_absent", "source_root_removed",
  ], "consumer aggregate locator preflight cleanup");
  const ref = {
    schema_version: WINDOWS_UPDATE_PRIVATE_LOCATOR_ARTIFACT_REF_SCHEMA,
    producer_repository: source.producer.repository,
    producer_workflow_ref: source.producer.workflow_ref,
    producer_job: source.producer.job,
    producer_run_id: source.producer.run_id,
    producer_run_attempt: source.producer.run_attempt,
    source_sha: source.producer.source_sha,
    source_tree: source.producer.source_tree,
    artifact_name: source.artifact.name,
    artifact_id: source.artifact.id,
    artifact_digest: source.artifact.digest,
    envelope_sha256: source.artifact.envelope_sha256,
    private_locator_sha256: source.artifact.private_locator_sha256,
    wrapping_public_key_sha256: source.artifact.wrapping_public_key_sha256,
  };
  let validatedRef;
  try {
    validatedRef = validateWindowsFormalUpdatePrivateLocatorArtifactRef(ref);
  } catch {
    fail("WINDOWS_HANDOFF_FINAL_RECEIPT_INPUT_INVALID", "consumer aggregate locator source is invalid");
  }
  const runParts = validateRunBinding(runBinding).split(":");
  requireCondition(
    source.artifact_ref_sha256 === sha256(Buffer.from(canonicalJson(validatedRef), "utf8"))
      && source.artifact.private_locator_sha256 === expectedLocatorSha256
      && source.producer.source_sha === runParts[3]
      && source.producer.source_tree === runParts[4]
      && source.verification.token_permission === "actions:read"
      && Object.entries(source.verification).every(([key, value]) => key === "token_permission" || value === true)
      && Object.values(source.preflight_cleanup).every((value) => value === true),
    "WINDOWS_HANDOFF_FINAL_RECEIPT_INPUT_INVALID",
    "consumer aggregate locator source did not preserve the exact public ref and preflight proof",
  );

  const decryption = receipt.locator_decryption;
  finalReceiptExactKeys(decryption, [
    "aes_gcm_authenticated", "ciphertext_sha256_verified", "content_encryption_algorithm",
    "envelope_aad_verified", "key_wrap_algorithm", "kms_key_id_verified", "plaintext_persisted",
    "private_locator_bytes_verified", "private_locator_sha256_verified", "wrapping_key_arn",
  ], "consumer aggregate locator decryption");
  finalReceiptExactKeys(receipt.reader, [
    "aws_account_id", "aws_region", "isolated_oidc_job", "locator_unwrap_kms_key_arn", "role_arn",
  ], "consumer isolated reader");
  requireCondition(
    decryption.wrapping_key_arn === receipt.reader.locator_unwrap_kms_key_arn
      && KMS_ARN.test(decryption.wrapping_key_arn ?? "")
      && decryption.key_wrap_algorithm === "RSAES_OAEP_SHA_256"
      && decryption.content_encryption_algorithm === "AES-256-GCM"
      && decryption.envelope_aad_verified === true
      && decryption.ciphertext_sha256_verified === true
      && decryption.kms_key_id_verified === true
      && decryption.aes_gcm_authenticated === true
      && decryption.private_locator_sha256_verified === true
      && decryption.private_locator_bytes_verified === true
      && decryption.plaintext_persisted === false
      && receipt.reader.isolated_oidc_job === true
      && receipt.reader.aws_account_id === WINDOWS_SIGNED_ARTIFACT_HANDOFF_ACCOUNT
      && receipt.reader.aws_region === WINDOWS_SIGNED_ARTIFACT_HANDOFF_REGION
      && READER_ROLE_ARN.test(receipt.reader.role_arn ?? ""),
    "WINDOWS_HANDOFF_FINAL_RECEIPT_INPUT_INVALID",
    "consumer aggregate locator decryption or isolated reader proof differs",
  );
}

function expectedRunnerBindingFromReader(receipt, runnerReceipt) {
  const approvalProofs = receipt.objects.filter(({ id }) => id === "approval_receipt");
  requireCondition(
    approvalProofs.length === 1 && SHA256.test(approvalProofs[0].sha256 ?? ""),
    "WINDOWS_HANDOFF_FINAL_RECEIPT_INPUT_INVALID",
    "retrieved approval receipt proof is missing",
  );
  const signerThumbprints = ["baseline", "target"].map((role) => {
    const matches = Array.isArray(runnerReceipt.uninstalls)
      ? runnerReceipt.uninstalls.filter((value) => value?.role === role)
      : [];
    const expectedAuthenticodeSha256 = receipt.candidates?.[role]?.uninstaller?.authenticode_sha256;
    requireCondition(
      matches.length === 1
        && isRecord(matches[0].authenticode)
        && SHA256.test(expectedAuthenticodeSha256 ?? "")
        && sha256(Buffer.from(canonicalJson(matches[0].authenticode), "utf8")) === expectedAuthenticodeSha256
        && /^[0-9A-F]{40}$/u.test(matches[0].authenticode.signer_thumbprint ?? ""),
      "WINDOWS_HANDOFF_FINAL_RECEIPT_INPUT_INVALID",
      `operator ${role} Authenticode record is not bound to the retrieved native QA`,
    );
    return matches[0].authenticode.signer_thumbprint;
  });
  requireCondition(
    signerThumbprints[0] === signerThumbprints[1],
    "WINDOWS_HANDOFF_FINAL_RECEIPT_INPUT_INVALID",
    "retrieved candidate Authenticode signer identities differ",
  );
  return Object.freeze({
    approval_bundle_sha256: approvalProofs[0].sha256,
    signer_certificate_sha1: signerThumbprints[0],
    candidates: Object.freeze(Object.fromEntries(["baseline", "target"].map((role) => {
      const candidate = receipt.candidates[role];
      return [role, Object.freeze({
        artifact_sha256: candidate.installer_sha256,
        installed_tree: candidate.installed_tree,
        metadata_raw_sha256: candidate.update_metadata_sha256,
        release_manifest_sha256: candidate.release_manifest_sha256,
        signature_raw_sha256: candidate.update_metadata_signature_sha256,
        source_sha: candidate.source_sha,
        version: candidate.version,
      })];
    }))),
  });
}

function validateFinalInstalledTreeBindings(runnerReceipt, receipt) {
  const launchRoles = ["baseline", "target", "baseline"];
  requireCondition(
    Array.isArray(runnerReceipt.launches) && runnerReceipt.launches.length === launchRoles.length,
    "WINDOWS_HANDOFF_FINAL_RECEIPT_INPUT_INVALID",
    "operator installed-tree launch inventory differs",
  );
  for (const [index, role] of launchRoles.entries()) {
    const readerTree = validateInstalledTreeEvidence(
      receipt.candidates?.[role]?.installed_tree,
      `consumer ${role} installed tree`,
      "WINDOWS_HANDOFF_FINAL_RECEIPT_INPUT_INVALID",
    );
    const runnerTree = validateInstalledTreeEvidence(
      runnerReceipt.candidates?.[role]?.installed_tree,
      `operator ${role} installed tree`,
      "WINDOWS_HANDOFF_FINAL_RECEIPT_INPUT_INVALID",
    );
    const launch = runnerReceipt.launches[index];
    const postInstallTree = validateInstalledTreeEvidence(
      launch?.post_install_installed_tree,
      `operator launch ${index} post-install tree`,
      "WINDOWS_HANDOFF_FINAL_RECEIPT_INPUT_INVALID",
    );
    const prelaunchTree = validateInstalledTreeEvidence(
      launch?.prelaunch_installed_tree,
      `operator launch ${index} prelaunch tree`,
      "WINDOWS_HANDOFF_FINAL_RECEIPT_INPUT_INVALID",
    );
    requireCondition(
      launch.role === role
        && INSTALLED_TREE_FIELDS.every((field) => runnerTree[field] === readerTree[field])
        && INSTALLED_TREE_PORTABLE_FIELDS.every((field) => (
          postInstallTree[field] === readerTree[field] && prelaunchTree[field] === readerTree[field]
        ))
        && postInstallTree.identity_sha256 === prelaunchTree.identity_sha256
        && launch.executable_sha256 === readerTree.installed_executable_sha256,
      "WINDOWS_HANDOFF_FINAL_RECEIPT_INPUT_INVALID",
      `operator launch ${index} installed tree differs from the retrieved candidate or changed before launch`,
    );
  }
}

function validateFinalLockedUninstall(runnerReceipt, receipt, role, operation) {
  const matching = Array.isArray(runnerReceipt.uninstalls)
    ? runnerReceipt.uninstalls.filter((value) => value?.role === role && value?.operation === operation)
    : [];
  requireCondition(matching.length === 1, "WINDOWS_HANDOFF_FINAL_RECEIPT_INPUT_INVALID", `operator ${role} locked uninstall is missing`);
  const uninstall = matching[0];
  finalReceiptExactKeys(uninstall, [
    "approval_id_sha256", "artifact_sha256", "authenticode", "authenticode_valid",
    "denies_write_delete", "exit_code", "installed_tree_path", "installed_tree_sha256",
    "lock_mode", "metadata_raw_sha256", "operation", "process", "release_manifest_sha256",
    "role", "signature_raw_sha256", "source_sha", "uninstaller_bytes", "uninstaller_sha256", "version",
  ], `operator ${role} locked uninstall`);
  finalReceiptExactKeys(uninstall.process, ["path_identity", "pid"], `operator ${role} locked uninstall process`);
  const operationRecords = Array.isArray(runnerReceipt.operations)
    ? runnerReceipt.operations.filter((value) => value?.operation === operation)
    : [];
  const candidate = receipt.candidates?.[role];
  const nativeUninstaller = candidate?.uninstaller;
  requireCondition(
    operationRecords.length === 1
      && SHA256.test(uninstall.approval_id_sha256 ?? "")
      && operationRecords[0].approval_id_sha256 === uninstall.approval_id_sha256
      && uninstall.version === candidate?.version
      && uninstall.source_sha === candidate?.source_sha
      && uninstall.artifact_sha256 === candidate?.installer_sha256
      && uninstall.metadata_raw_sha256 === candidate?.update_metadata_sha256
      && uninstall.signature_raw_sha256 === candidate?.update_metadata_signature_sha256
      && uninstall.release_manifest_sha256 === candidate?.release_manifest_sha256
      && uninstall.installed_tree_path === nativeUninstaller?.installed_tree_path
      && uninstall.installed_tree_sha256 === nativeUninstaller?.installed_tree_sha256
      && uninstall.uninstaller_sha256 === nativeUninstaller?.uninstaller_sha256
      && uninstall.uninstaller_bytes === nativeUninstaller?.uninstaller_bytes
      && isRecord(uninstall.authenticode)
      && sha256(Buffer.from(canonicalJson(uninstall.authenticode), "utf8")) === nativeUninstaller?.authenticode_sha256
      && uninstall.authenticode_valid === nativeUninstaller?.authenticode_valid
      && uninstall.lock_mode === nativeUninstaller?.lock_mode
      && uninstall.denies_write_delete === nativeUninstaller?.denies_write_delete
      && Number.isSafeInteger(uninstall.process.pid) && uninstall.process.pid > 0
      && uninstall.process.path_identity === nativeUninstaller?.process_path_identity
      && uninstall.exit_code === nativeUninstaller?.exit_code,
    "WINDOWS_HANDOFF_FINAL_RECEIPT_INPUT_INVALID",
    `operator ${role} locked uninstall differs from the retrieved native QA and approval evidence`,
  );
}

export function finalizeWindowsFormalUpdateConsumerReceipt({
  readerReceiptPath,
  finalReceiptPath,
  runnerReceiptPath,
  artifactRoot,
  encryptedBridgeRoot,
  expectedLocatorSha256,
  expectedEnvelopeSha256,
  runBinding,
  awsCredentialsPresent,
  oidcCredentialsPresent,
  now = Date.now(),
} = {}) {
  purgeWindowsFormalUpdatePrivateRoots(artifactRoot, encryptedBridgeRoot);
  const readSnapshot = (filePath, recoverAtomicResidue = false) => {
    const resolved = path.resolve(filePath);
    if (recoverAtomicResidue) recoverAtomicJsonResidue(resolved);
    return readTrustedFileSnapshot(path.dirname(resolved), path.basename(resolved));
  };
  const readerSnapshot = readSnapshot(readerReceiptPath, true);
  const runnerSnapshot = readSnapshot(runnerReceiptPath);
  let receipt;
  let runnerReceipt;
  try {
    receipt = JSON.parse(readerSnapshot.bytes.toString("utf8"));
    runnerReceipt = JSON.parse(runnerSnapshot.bytes.toString("utf8"));
    requireCondition(
      Buffer.from(`${JSON.stringify(receipt, null, 2)}\n`, "utf8").equals(readerSnapshot.bytes)
        && Buffer.from(`${JSON.stringify(runnerReceipt, null, 2)}\n`, "utf8").equals(runnerSnapshot.bytes),
      "WINDOWS_HANDOFF_FINAL_RECEIPT_INPUT_INVALID",
      "reader or operator receipt bytes are not canonical",
    );
  } catch (error) {
    if (error instanceof WindowsFormalUpdateHandoffError) throw error;
    fail("WINDOWS_HANDOFF_FINAL_RECEIPT_INPUT_INVALID", "reader or operator receipt is not valid JSON");
  }
  requireCondition(
    receipt.schema_version === WINDOWS_UPDATE_HANDOFF_CONSUMER_RECEIPT_SCHEMA
      && receipt.verdict === "PASS"
      && receipt.state === "PENDING_OPERATOR"
      && receipt.locator_sha256 === expectedLocatorSha256
      && receipt.run_binding_sha256 === sha256(Buffer.from(validateRunBinding(runBinding), "utf8"))
      && receipt.bridge?.envelope_sha256 === expectedEnvelopeSha256
      && receipt.bridge?.object_count === 19
      && receipt.bridge?.current_run_bound === true
      && receipt.retrieval?.expected_object_count === 19
      && receipt.retrieval?.exact_version_head_verified === 19
      && receipt.retrieval?.exact_version_get_verified === 19
      && receipt.retrieval?.full_body_sha256_verified === 19
      && receipt.retrieval?.object_lock_compliance_verified === 19
      && receipt.retrieval?.retention_verified === 19
      && receipt.objects?.length === 19
      && receipt.objects.every((object) => object.exact_version_head_verified === true
        && object.exact_version_get_verified === true
        && object.full_body_sha256_verified === true
        && object.object_lock_compliance_verified === true
        && object.retention_verified === true),
    "WINDOWS_HANDOFF_FINAL_RECEIPT_INPUT_INVALID",
    "reader receipt did not prove the exact 19-object private handoff",
  );
  validateFinalLocatorBinding(receipt, expectedLocatorSha256, runBinding);
  requireCondition(
    receipt.objects.map(({ id }) => id).sort().join("\0") === [...expectedBridgeObjectIds()].sort().join("\0"),
    "WINDOWS_HANDOFF_FINAL_RECEIPT_INPUT_INVALID",
    "reader receipt object inventory differs from the exact 19-object contract",
  );
  for (const object of receipt.objects) {
    finalReceiptExactKeys(object, [
      "bytes", "exact_version_get_verified", "exact_version_head_verified",
      "full_body_sha256_verified", "id", "object_lock_compliance_verified", "relative_path",
      "retention_verified", "sha256",
    ], `reader receipt ${object.id ?? "object"}`);
    requireCondition(
      SHA256.test(object.sha256 ?? "")
        && Number.isSafeInteger(object.bytes) && object.bytes > 0,
      "WINDOWS_HANDOFF_FINAL_RECEIPT_INPUT_INVALID",
      `reader receipt ${object.id ?? "object"} identity is invalid`,
    );
  }
  for (const role of ["baseline", "target"]) {
    const candidate = receipt.candidates?.[role];
    validateBridgeCandidateIdentity(candidate, `consumer ${role} candidate`);
    const materializedKinds = [
      ...MATERIALIZED_PATH_FIELDS,
      "release_manifest", "update_metadata", "update_metadata_signature",
    ];
    finalReceiptExactKeys(candidate.materialized, materializedKinds, `consumer ${role} materialized objects`);
    const proofById = new Map(receipt.objects.map((object) => [object.id, object]));
    for (const kind of materializedKinds) {
      const materialized = candidate.materialized[kind];
      finalReceiptExactKeys(materialized, ["bytes", "relative_path", "sha256"], `consumer ${role} ${kind}`);
      const proof = proofById.get(`${role}_${kind}`);
      requireCondition(
        materialized.sha256 === proof?.sha256
          && materialized.bytes === proof?.bytes
          && materialized.relative_path === proof?.relative_path,
        "WINDOWS_HANDOFF_FINAL_RECEIPT_INPUT_INVALID",
        `consumer ${role} ${kind} differs from its exact retrieved object proof`,
      );
    }
    const releaseManifest = candidate?.materialized?.release_manifest;
    const installer = candidate?.materialized?.installer;
    const buildManifest = candidate?.materialized?.build_manifest;
    const updateMetadata = candidate?.materialized?.update_metadata;
    const updateSignature = candidate?.materialized?.update_metadata_signature;
    requireCondition(
      installer?.sha256 === candidate.installer_sha256
        && installer?.bytes === candidate.installer_bytes
        && buildManifest?.sha256 === candidate.build_manifest_sha256
        && buildManifest?.bytes === candidate.build_manifest_bytes
        && releaseManifest?.sha256 === candidate.release_manifest_sha256
        && releaseManifest?.bytes === candidate.release_manifest_bytes
        && updateMetadata?.sha256 === candidate.update_metadata_sha256
        && updateMetadata?.bytes === candidate.update_metadata_bytes
        && updateSignature?.sha256 === candidate.update_metadata_signature_sha256
        && updateSignature?.bytes === candidate.update_metadata_signature_bytes,
      "WINDOWS_HANDOFF_FINAL_RECEIPT_INPUT_INVALID",
      `consumer ${role} manifest and metadata bindings differ`,
    );
  }
  const expectedRunnerBinding = expectedRunnerBindingFromReader(receipt, runnerReceipt);
  let commonRunnerValidationPassed = false;
  try {
    commonRunnerValidationPassed = validateWindowsFormalUpdateRunnerPassReceipt(
      runnerReceipt,
      expectedRunnerBinding,
    ) === true;
  } catch {
    // The common closed-schema validator is the sole PASS authority for the runner receipt.
  }
  requireCondition(
    commonRunnerValidationPassed,
    "WINDOWS_HANDOFF_FINAL_RECEIPT_INPUT_INVALID",
    "operator receipt failed the common closed-schema PASS validator",
  );
  validateFinalInstalledTreeBindings(runnerReceipt, receipt);
  const approvalSignatureProofs = receipt.objects.filter(({ id }) => id === "approval_signature");
  const runParts = validateRunBinding(runBinding).split(":");
  requireCondition(
    approvalSignatureProofs.length === 1
      && runnerReceipt.approval_signature_sha256 === approvalSignatureProofs[0].sha256
      && runnerReceipt.source_runner.source_sha === runParts[3]
      && runnerReceipt.source_runner.source_tree === runParts[4],
    "WINDOWS_HANDOFF_FINAL_RECEIPT_INPUT_INVALID",
    "operator approval signature or reviewed source differs from the retrieved reader binding",
  );
  validateFinalLockedUninstall(runnerReceipt, receipt, "target", "target_uninstall_for_rollback");
  validateFinalLockedUninstall(runnerReceipt, receipt, "baseline", "final_uninstall");
  receipt.generated_at = new Date(now).toISOString();
  receipt.runner_receipt_sha256 = sha256(runnerSnapshot.bytes);
  receipt.cleanup = {
    aws_credentials_cleared: receipt.cleanup?.aws_credentials_cleared === true
      && awsCredentialsPresent === false,
    oidc_credentials_cleared: receipt.cleanup?.oidc_credentials_cleared === true
      && oidcCredentialsPresent === false,
    private_artifact_root_removed: receipt.cleanup?.private_artifact_root_removed === true
      && !existsSync(path.resolve(artifactRoot)),
    expanded_locator_removed: receipt.cleanup?.expanded_locator_removed === true,
    locator_artifact_root_removed: receipt.cleanup?.locator_artifact_root_removed === true,
    encrypted_bridge_root_removed: !existsSync(path.resolve(encryptedBridgeRoot)),
  };
  receipt.state = receipt.cleanup.aws_credentials_cleared
    && receipt.cleanup.oidc_credentials_cleared
    && receipt.cleanup.private_artifact_root_removed
    && receipt.cleanup.expanded_locator_removed
    && receipt.cleanup.locator_artifact_root_removed
    && receipt.cleanup.encrypted_bridge_root_removed
    ? "PASS"
    : "BLOCKED";
  const receiptSha256 = writeWindowsFormalUpdateHandoffReceipt(finalReceiptPath, receipt);
  requireCondition(receipt.state === "PASS", "WINDOWS_HANDOFF_PRIVATE_BYTE_CLEANUP_FAILED", "final consumer cleanup did not PASS");
  return Object.freeze({ receipt: Object.freeze(receipt), receipt_sha256: receiptSha256 });
}

function cliJson(execute, args, region, input = null, onProviderCall = () => {}) {
  try {
    onProviderCall();
    const output = execute("aws", [...args, "--region", region, "--no-cli-pager", "--output", "json"], {
      encoding: "utf8",
      ...(Buffer.isBuffer(input) ? { input } : {}),
      windowsHide: true,
      maxBuffer: 16 * 1024 * 1024,
      stdio: [Buffer.isBuffer(input) ? "pipe" : "ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        AWS_EC2_METADATA_DISABLED: "true",
        AWS_PAGER: "",
      },
    });
    return JSON.parse(output || "{}");
  } catch (error) {
    throw new WindowsFormalUpdateHandoffError(
      "WINDOWS_HANDOFF_AWS_READ_FAILED",
      "private AWS handoff read failed",
      { cause: error },
    );
  }
}

export function createWindowsFormalUpdateHandoffAwsCliAdapter({
  execute = execFileSync,
  region = WINDOWS_SIGNED_ARTIFACT_HANDOFF_REGION,
  onProviderCall,
  providerCallState,
} = {}) {
  requireCondition(
    onProviderCall === undefined || typeof onProviderCall === "function",
    "WINDOWS_HANDOFF_AWS_ADAPTER_INVALID",
    "AWS provider-call callback must be a function",
  );
  requireCondition(
    isRecord(providerCallState)
      && Object.keys(providerCallState).sort().join("\0") === "locatorSha256\0runBinding\0statePath",
    "WINDOWS_HANDOFF_AWS_ADAPTER_INVALID",
    "AWS adapter requires the exact durable provider-call state binding",
  );
  exactAbsoluteStatePath(providerCallState.statePath, "AWS provider-call state path");
  providerCallStateBinding(providerCallState.locatorSha256, providerCallState.runBinding);
  const notifyProviderCall = () => {
    persistWindowsFormalUpdateProviderCallState({
      statePath: providerCallState.statePath,
      locatorSha256: providerCallState.locatorSha256,
      runBinding: providerCallState.runBinding,
    });
    onProviderCall?.();
  };
  const json = (args) => cliJson(execute, args, region, null, notifyProviderCall);
  const common = (locator) => ["--bucket", locator.bucket, "--expected-bucket-owner", locator.account_id];
  const objectArgs = (locator, object) => [
    "--bucket", locator.bucket,
    "--key", object.key,
    "--version-id", object.version_id,
    "--expected-bucket-owner", locator.account_id,
    "--checksum-mode", "ENABLED",
  ];
  return Object.freeze({
    async decrypt({ keyArn, encryptionAlgorithm, ciphertext }) {
      requireCondition(
        KMS_ARN.test(keyArn ?? "")
          && encryptionAlgorithm === "RSAES_OAEP_SHA_256"
          && Buffer.isBuffer(ciphertext) && ciphertext.length === 512,
        "WINDOWS_HANDOFF_LOCATOR_KMS_UNWRAP_INVALID",
        "aggregate locator KMS unwrap request is invalid",
      );
      return cliJson(execute, [
        "kms", "decrypt",
        "--key-id", keyArn,
        "--encryption-algorithm", encryptionAlgorithm,
        "--ciphertext-blob", "fileb:///dev/stdin",
      ], region, ciphertext, notifyProviderCall);
    },
    async inspectGovernance(locator) {
      return {
        identity: json(["sts", "get-caller-identity"]),
        location: json(["s3api", "get-bucket-location", ...common(locator)]),
        versioning: json(["s3api", "get-bucket-versioning", ...common(locator)]),
        publicAccess: json(["s3api", "get-public-access-block", ...common(locator)]),
        objectLock: json(["s3api", "get-object-lock-configuration", ...common(locator)]),
        encryption: json(["s3api", "get-bucket-encryption", ...common(locator)]),
        ownership: json(["s3api", "get-bucket-ownership-controls", ...common(locator)]),
        kms: json(["kms", "describe-key", "--key-id", locator.kms_key_arn]),
      };
    },
    async headObject({ locator, object }) {
      return json(["s3api", "head-object", ...objectArgs(locator, object)]);
    },
    async getObject({ locator, object, destination }) {
      return json(["s3api", "get-object", ...objectArgs(locator, object), destination]);
    },
  });
}
