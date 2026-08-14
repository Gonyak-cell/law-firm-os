import { execFileSync } from "node:child_process";
import {
  constants as cryptoConstants,
  createCipheriv,
  createDecipheriv,
  createHash,
  createPublicKey,
  publicEncrypt,
  randomBytes,
  verify as verifySignature,
} from "node:crypto";
import {
  closeSync,
  constants as fsConstants,
  existsSync,
  fstatSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readFileSync,
  readSync,
  realpathSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  WINDOWS_UPDATE_EXECUTION_INPUT_SCHEMA,
  WINDOWS_UPDATE_EXECUTION_MODE,
} from "./windows-formal-update-admission.mjs";
import {
  verifyWindowsFormalUpdateApproval,
} from "./windows-formal-update-approval.mjs";
import {
  createProductionWindowsApprovalVerifier,
} from "./windows-formal-update-runner.mjs";
import {
  WINDOWS_SIGNED_ARTIFACT_HANDOFF_ACCOUNT,
  WINDOWS_SIGNED_ARTIFACT_HANDOFF_REGION,
  createWindowsSignedArtifactPrivateHandoffLocatorEnvelopeAad,
  validateWindowsSignedArtifactPrivateHandoffLocator,
  validateWindowsSignedArtifactPrivateHandoffLocatorEnvelope,
  validateWindowsSignedArtifactPrivateHandoffReceipt,
} from "./windows-signed-artifact-private-handoff.mjs";

export const WINDOWS_UPDATE_PRIVATE_LOCATOR_SCHEMA =
  "law-firm-os.windows-formal-update-private-locator.v1";
export const WINDOWS_UPDATE_PRIVATE_LOCATOR_ENVELOPE_SCHEMA =
  "law-firm-os.windows-formal-update-private-locator-envelope.v1";
export const WINDOWS_UPDATE_PRIVATE_LOCATOR_ARTIFACT_REF_SCHEMA =
  "law-firm-os.windows-formal-update-private-locator-artifact-ref.v1";
export const WINDOWS_UPDATE_CANDIDATE_LOCATOR_ARTIFACT_REF_SCHEMA =
  "law-firm-os.windows-signed-artifact-private-handoff-locator-artifact-ref.v1";
export const WINDOWS_UPDATE_PRIVATE_LOCATOR_SEAL_RECEIPT_SCHEMA =
  "law-firm-os.windows-formal-update-private-locator-seal.v1";

export const WINDOWS_UPDATE_PRIVATE_LOCATOR_WORKFLOW_REF =
  "Gonyak-cell/law-firm-os/.github/workflows/windows-formal-update-private-locator-seal.yml@refs/heads/main";
export const WINDOWS_UPDATE_PRIVATE_LOCATOR_JOB = "seal-private-locator";
export const WINDOWS_UPDATE_CANDIDATE_WORKFLOW_REF =
  "Gonyak-cell/law-firm-os/.github/workflows/windows-authenticode-package-qa.yml@refs/heads/main";
export const WINDOWS_UPDATE_CANDIDATE_JOB = "private-immutable-handoff";

const SHA256 = /^[0-9a-f]{64}$/u;
const SHA256_PREFIXED = /^sha256:[0-9a-f]{64}$/u;
const GIT_OBJECT = /^[0-9a-f]{40}$/u;
const POSITIVE_INTEGER = /^[1-9][0-9]*$/u;
const VERSION = /^[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?$/u;
const BUCKET = /^(?!.*\.\.)(?!.*\.-)(?!.*-\.)(?!\d+\.\d+\.\d+\.\d+$)[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/u;
const KMS_ARN = /^arn:aws:kms:ap-northeast-2:770880870480:key\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const ROLE_ARN = /^arn:aws:iam::770880870480:role\/[A-Za-z0-9+=,.@_/-]{1,512}$/u;
const DAY_MS = 24 * 60 * 60 * 1_000;
const MINIMUM_RETENTION_MS = 365 * DAY_MS;
const MAXIMUM_RETENTION_MS = 3650 * DAY_MS;
const MAX_JSON_BYTES = 16 * 1024 * 1024;
const CHUNK_BYTES = 1024 * 1024;
const CANDIDATE_ENVELOPE_FILE = "windows-signed-artifact-private-locator-envelope.json";
const CANDIDATE_CIPHERTEXT_FILE = "windows-signed-artifact-private-locator.enc";
const AGGREGATE_ENVELOPE_FILE = "windows-formal-update-private-locator-envelope.json";
const AGGREGATE_CIPHERTEXT_FILE = "windows-formal-update-private-locator.enc";
const CANDIDATE_PRODUCER_WORKFLOW_NAME = "Windows Authenticode Package QA";
const CANDIDATE_PRODUCER_JOB_NAME = "Decrypt and upload exact signed package to private immutable storage";
const CLAIM_POLICY = Object.freeze({
  private_distribution: true,
  automatic_update: false,
  public_release: false,
  external_distribution: false,
  production_go_live: false,
});
const MATERIALIZED = Object.freeze({
  installer: "signed-installer.exe",
  build_manifest: "windows-build-manifest.json",
  native_package_qa: "formal-windows-package-qa.json",
  installed_tree_sbom: "windows-installed-tree-sbom.cdx.json",
  release_manifest: "release-manifest.json",
  update_metadata: "update-metadata.json",
  update_metadata_signature: "update-metadata.sig",
});
const GOVERNANCE_INPUTS = Object.freeze({
  baseline_release_manifest: "baseline/release-manifest.json",
  baseline_update_metadata: "baseline/update-metadata.json",
  baseline_update_metadata_signature: "baseline/update-metadata.sig",
  target_release_manifest: "target/release-manifest.json",
  target_update_metadata: "target/update-metadata.json",
  target_update_metadata_signature: "target/update-metadata.sig",
  execution_input: "governance/execution-input.json",
  approval_receipt: "governance/approval-receipt.json",
  approval_signature: "governance/approval-receipt.json.sig",
});
const METADATA_FIELDS = Object.freeze([
  "appId", "approvalExpiresAt", "approvalId", "artifactBytes", "artifactFilename",
  "artifactSha256", "channel", "entraTenantId", "expiresAt", "generatedAt", "keyId",
  "lawosTenantId", "pilotId", "releaseManifestSha256", "schemaVersion", "sourceSha",
  "sourceTree", "tenantConfigSha256", "version",
]);
const EXTERNAL_PILOT_UPDATE_SCHEMA = "law-firm-os.matter-desktop-external-pilot-update.v2";
const EXTERNAL_PILOT_UPDATE_CHANNEL = "external-pilot";

export class WindowsFormalUpdatePrivateLocatorSealError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "WindowsFormalUpdatePrivateLocatorSealError";
    this.code = code;
  }
}

function fail(code, message) {
  throw new WindowsFormalUpdatePrivateLocatorSealError(code, message);
}

function requireCondition(condition, code, message) {
  if (!condition) fail(code, message);
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(value, fields, code, label) {
  requireCondition(
    isRecord(value) && Object.keys(value).sort().join("\0") === [...fields].sort().join("\0"),
    code,
    `${label} must use the exact closed schema`,
  );
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (isRecord(value)) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function canonicalUtc(value, label, { now, retention = false } = {}) {
  const parsed = new Date(value);
  requireCondition(
    typeof value === "string" && !Number.isNaN(parsed.valueOf()) && parsed.toISOString() === value,
    "WINDOWS_LOCATOR_SEAL_TIME_INVALID",
    `${label} must be canonical UTC`,
  );
  if (retention) {
    const remaining = parsed.valueOf() - now;
    requireCondition(
      remaining >= MINIMUM_RETENTION_MS && remaining <= MAXIMUM_RETENTION_MS,
      "WINDOWS_LOCATOR_SEAL_RETENTION_INVALID",
      `${label} must remain between 365 and 3650 days`,
    );
  }
  return value;
}

function canonicalBase64(value, label) {
  requireCondition(
    typeof value === "string" && /^[A-Za-z0-9+/]+={0,2}$/u.test(value),
    "WINDOWS_LOCATOR_SEAL_BASE64_INVALID",
    `${label} must be canonical base64`,
  );
  const bytes = Buffer.from(value, "base64");
  requireCondition(bytes.length > 0 && bytes.toString("base64") === value, "WINDOWS_LOCATOR_SEAL_BASE64_INVALID", `${label} must be canonical base64`);
  return bytes;
}

function sameFile(left, right) {
  return left.dev === right.dev
    && left.ino === right.ino
    && left.size === right.size
    && left.mtimeNs === right.mtimeNs
    && left.ctimeNs === right.ctimeNs;
}

function hashDescriptor(fd, byteSize) {
  const hash = createHash("sha256");
  const buffer = Buffer.allocUnsafe(Math.max(1, Math.min(CHUNK_BYTES, byteSize)));
  let position = 0;
  try {
    while (position < byteSize) {
      const expected = Math.min(buffer.length, byteSize - position);
      const count = readSync(fd, buffer, 0, expected, position);
      requireCondition(count === expected, "WINDOWS_LOCATOR_SEAL_FILE_CHANGED", "stable file descriptor changed during hashing");
      hash.update(buffer.subarray(0, count));
      position += count;
    }
    return hash.digest("hex");
  } finally {
    buffer.fill(0);
  }
}

function openSnapshot(filePath, label, { capture = false } = {}) {
  const target = path.resolve(filePath);
  const before = lstatSync(target, { bigint: true });
  requireCondition(before.isFile() && !before.isSymbolicLink() && before.nlink === 1n, "WINDOWS_LOCATOR_SEAL_FILE_INVALID", `${label} must be a regular single-link file`);
  requireCondition(realpathSync(target) === target, "WINDOWS_LOCATOR_SEAL_FILE_INVALID", `${label} cannot traverse a link`);
  const fd = openSync(target, fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW ?? 0));
  try {
    const descriptor = fstatSync(fd, { bigint: true });
    requireCondition(sameFile(before, descriptor), "WINDOWS_LOCATOR_SEAL_FILE_CHANGED", `${label} changed while opening`);
    const bytes = Number(descriptor.size);
    requireCondition(Number.isSafeInteger(bytes) && bytes > 0, "WINDOWS_LOCATOR_SEAL_FILE_INVALID", `${label} is empty or oversized`);
    if (capture) requireCondition(bytes <= MAX_JSON_BYTES, "WINDOWS_LOCATOR_SEAL_FILE_INVALID", `${label} exceeds the bounded input size`);
    const digest = hashDescriptor(fd, bytes);
    const content = capture ? readFileSync(fd) : null;
    requireCondition(!content || content.length === bytes && sha256(content) === digest, "WINDOWS_LOCATOR_SEAL_FILE_CHANGED", `${label} changed while captured`);
    requireCondition(sameFile(descriptor, fstatSync(fd, { bigint: true })), "WINDOWS_LOCATOR_SEAL_FILE_CHANGED", `${label} changed after hashing`);
    return { target, fd, bytes, sha256: digest, content };
  } catch (error) {
    closeSync(fd);
    throw error;
  }
}

function closeSnapshot(snapshot) {
  if (!snapshot || snapshot.fd === undefined) return;
  closeSync(snapshot.fd);
  snapshot.fd = undefined;
  snapshot.content?.fill(0);
}

function parseJsonBytes(bytes, label, { compact = false, pretty = false } = {}) {
  let value;
  try {
    value = JSON.parse(bytes.toString("utf8"));
  } catch {
    fail("WINDOWS_LOCATOR_SEAL_JSON_INVALID", `${label} is not valid JSON`);
  }
  if (compact) requireCondition(Buffer.from(JSON.stringify(value)).equals(bytes), "WINDOWS_LOCATOR_SEAL_JSON_NOT_CANONICAL", `${label} must use compact canonical bytes`);
  if (pretty) requireCondition(Buffer.from(`${JSON.stringify(value, null, 2)}\n`).equals(bytes), "WINDOWS_LOCATOR_SEAL_JSON_NOT_CANONICAL", `${label} must use pretty canonical bytes`);
  return value;
}

function readJsonFile(filePath, label, options) {
  const snapshot = openSnapshot(filePath, label, { capture: true });
  try {
    return { value: parseJsonBytes(snapshot.content, label, options), bytes: Buffer.from(snapshot.content), sha256: snapshot.sha256, byte_size: snapshot.bytes };
  } finally {
    closeSnapshot(snapshot);
  }
}

function writeExclusive(filePath, bytes) {
  writeFileSync(filePath, bytes, { flag: "wx", mode: 0o600 });
}

function candidateArtifactName(ref) {
  return `windows-signed-private-locator-${ref.candidate_role}-${ref.source_sha}-${ref.producer_run_id}-${ref.producer_run_attempt}`;
}

export function validateWindowsUpdateCandidateLocatorArtifactRef(value, { expectedRole } = {}) {
  exactKeys(value, [
    "schema_version", "producer_repository", "producer_workflow_ref", "producer_job",
    "producer_run_id", "producer_run_attempt", "source_sha", "source_tree", "candidate_role",
    "private_receipt_sha256", "artifact_name", "artifact_id", "artifact_digest", "envelope_sha256",
  ], "WINDOWS_LOCATOR_SEAL_ARTIFACT_REF_INVALID", "candidate locator artifact ref");
  requireCondition(
    value.schema_version === WINDOWS_UPDATE_CANDIDATE_LOCATOR_ARTIFACT_REF_SCHEMA
      && value.producer_repository === "Gonyak-cell/law-firm-os"
      && value.producer_workflow_ref === WINDOWS_UPDATE_CANDIDATE_WORKFLOW_REF
      && value.producer_job === WINDOWS_UPDATE_CANDIDATE_JOB
      && POSITIVE_INTEGER.test(value.producer_run_id ?? "")
      && POSITIVE_INTEGER.test(value.producer_run_attempt ?? "")
      && GIT_OBJECT.test(value.source_sha ?? "")
      && GIT_OBJECT.test(value.source_tree ?? "")
      && ["baseline", "target"].includes(value.candidate_role)
      && value.candidate_role === expectedRole
      && SHA256.test(value.private_receipt_sha256 ?? "")
      && POSITIVE_INTEGER.test(value.artifact_id ?? "")
      && SHA256_PREFIXED.test(value.artifact_digest ?? "")
      && SHA256.test(value.envelope_sha256 ?? "")
      && value.artifact_name === candidateArtifactName(value),
    "WINDOWS_LOCATOR_SEAL_ARTIFACT_REF_INVALID",
    `candidate ${expectedRole} locator artifact ref is invalid`,
  );
  return deepFreeze(structuredClone(value));
}

export function validateWindowsUpdateCandidateLocatorArtifactRefs(value) {
  exactKeys(value, ["baseline", "target"], "WINDOWS_LOCATOR_SEAL_ARTIFACT_REF_INVALID", "candidate artifact refs");
  const refs = Object.freeze(Object.fromEntries(["baseline", "target"].map((role) => [
    role,
    validateWindowsUpdateCandidateLocatorArtifactRef(value[role], { expectedRole: role }),
  ])));
  requireCondition(
    refs.baseline.artifact_id !== refs.target.artifact_id
      && refs.baseline.producer_run_id !== refs.target.producer_run_id
      && refs.baseline.source_sha !== refs.target.source_sha,
    "WINDOWS_LOCATOR_SEAL_CANDIDATES_NOT_DISTINCT",
    "baseline and target locator artifacts must be distinct",
  );
  return refs;
}

function runWorkflowPath(run) {
  return String(run?.path ?? "").replace(/^\.\//u, "");
}

export function authenticateWindowsUpdateCandidateArtifactDownload({ ref, run, jobs, artifact, archivePath }) {
  const validated = validateWindowsUpdateCandidateLocatorArtifactRef(ref, { expectedRole: ref?.candidate_role });
  requireCondition(
    String(run?.id) === validated.producer_run_id
      && String(run?.run_attempt) === validated.producer_run_attempt
      && run?.repository?.full_name === validated.producer_repository
      && run?.name === CANDIDATE_PRODUCER_WORKFLOW_NAME
      && runWorkflowPath(run) === ".github/workflows/windows-authenticode-package-qa.yml"
      && run?.event === "workflow_dispatch"
      && run?.head_sha === validated.source_sha
      && run?.head_branch === "main"
      && run?.status === "completed"
      && run?.conclusion === "success",
    "WINDOWS_LOCATOR_SEAL_PRODUCER_RUN_INVALID",
    `candidate ${validated.candidate_role} producer run identity is invalid`,
  );
  const matchingJobs = Array.isArray(jobs?.jobs) ? jobs.jobs.filter((job) =>
    String(job?.run_id) === validated.producer_run_id
      && String(job?.run_attempt) === validated.producer_run_attempt
      && job?.workflow_name === CANDIDATE_PRODUCER_WORKFLOW_NAME
      && job?.name === CANDIDATE_PRODUCER_JOB_NAME
      && job?.head_branch === "main"
      && job?.head_sha === validated.source_sha
      && job?.status === "completed"
      && job?.conclusion === "success") : [];
  requireCondition(
    Array.isArray(jobs?.jobs)
      && Number.isSafeInteger(jobs?.total_count)
      && jobs.total_count === jobs.jobs.length
      && jobs.total_count > 0
      && jobs.total_count <= 100
      && matchingJobs.length === 1,
    "WINDOWS_LOCATOR_SEAL_PRODUCER_JOB_INVALID",
    `candidate ${validated.candidate_role} producer job identity is invalid`,
  );
  requireCondition(
    String(artifact?.id) === validated.artifact_id
      && artifact?.name === validated.artifact_name
      && artifact?.expired === false
      && artifact?.digest === validated.artifact_digest
      && Number.isSafeInteger(artifact?.size_in_bytes)
      && artifact.size_in_bytes > 0
      && artifact.size_in_bytes <= 2 * 1024 * 1024
      && artifact?.workflow_run?.id != null
      && String(artifact.workflow_run.id) === validated.producer_run_id
      && artifact.workflow_run.head_sha === validated.source_sha
      && artifact.workflow_run.head_branch === "main",
    "WINDOWS_LOCATOR_SEAL_ARTIFACT_METADATA_INVALID",
    `candidate ${validated.candidate_role} artifact metadata is invalid`,
  );
  const archive = openSnapshot(archivePath, `${validated.candidate_role} raw artifact archive`);
  try {
    requireCondition(`sha256:${archive.sha256}` === validated.artifact_digest, "WINDOWS_LOCATOR_SEAL_ARTIFACT_DIGEST_MISMATCH", `candidate ${validated.candidate_role} raw artifact archive digest differs`);
  } finally {
    closeSnapshot(archive);
  }
  return Object.freeze({ ref: validated });
}

export function verifyWindowsUpdateCandidateArtifactDownload({ ref, run, jobs, artifact, archivePath, extractedDir }) {
  const authenticated = authenticateWindowsUpdateCandidateArtifactDownload({ ref, run, jobs, artifact, archivePath });
  const validated = authenticated.ref;
  const root = realpathSync(path.resolve(extractedDir));
  requireCondition(statSync(root).isDirectory(), "WINDOWS_LOCATOR_SEAL_ARTIFACT_FILES_INVALID", "candidate locator artifact extraction root is invalid");
  requireCondition(
    readdirSync(root).sort().join("\0") === [CANDIDATE_CIPHERTEXT_FILE, CANDIDATE_ENVELOPE_FILE].sort().join("\0"),
    "WINDOWS_LOCATOR_SEAL_ARTIFACT_FILES_INVALID",
    `candidate ${validated.candidate_role} locator artifact file set is invalid`,
  );
  const envelope = readJsonFile(path.join(root, CANDIDATE_ENVELOPE_FILE), `${validated.candidate_role} candidate locator envelope`, { pretty: true });
  const checked = validateWindowsSignedArtifactPrivateHandoffLocatorEnvelope(envelope.value);
  requireCondition(
    envelope.sha256 === validated.envelope_sha256
      && checked.producer_repository === validated.producer_repository
      && checked.producer_workflow_ref === validated.producer_workflow_ref
      && checked.producer_job === validated.producer_job
      && checked.producer_run_id === validated.producer_run_id
      && checked.producer_run_attempt === validated.producer_run_attempt
      && checked.source_sha === validated.source_sha
      && checked.source_tree === validated.source_tree
      && checked.candidate_role === validated.candidate_role
      && checked.private_receipt_sha256 === validated.private_receipt_sha256,
    "WINDOWS_LOCATOR_SEAL_ENVELOPE_BINDING_MISMATCH",
    `candidate ${validated.candidate_role} locator envelope differs from its public artifact ref`,
  );
  const ciphertext = openSnapshot(path.join(root, CANDIDATE_CIPHERTEXT_FILE), `${validated.candidate_role} candidate locator ciphertext`);
  try {
    requireCondition(ciphertext.bytes === checked.ciphertext_bytes && ciphertext.sha256 === checked.ciphertext_sha256, "WINDOWS_LOCATOR_SEAL_CIPHERTEXT_MISMATCH", `candidate ${validated.candidate_role} locator ciphertext differs`);
  } finally {
    closeSnapshot(ciphertext);
  }
  return Object.freeze({ ref: validated, envelope: checked });
}

function validateWrappingPublicKey({ spkiBase64, sha256Expected }) {
  const spki = canonicalBase64(spkiBase64, "locator wrapping public key");
  requireCondition(SHA256.test(sha256Expected ?? "") && sha256(spki) === sha256Expected, "WINDOWS_LOCATOR_SEAL_WRAPPING_KEY_INVALID", "locator wrapping public key digest differs");
  let key;
  try {
    key = createPublicKey({ key: spki, format: "der", type: "spki" });
  } catch {
    fail("WINDOWS_LOCATOR_SEAL_WRAPPING_KEY_INVALID", "locator wrapping public key is not canonical SPKI DER");
  }
  requireCondition(
    key.asymmetricKeyType === "rsa"
      && key.asymmetricKeyDetails?.modulusLength === 4096
      && key.asymmetricKeyDetails?.publicExponent === 65537n
      && key.export({ format: "der", type: "spki" }).equals(spki),
    "WINDOWS_LOCATOR_SEAL_WRAPPING_KEY_INVALID",
    "locator wrapping key must be canonical RSA-4096 SPKI with exponent 65537",
  );
  return key;
}

async function decryptCandidateLocator({ artifactDir, ref, aws, wrappingKeyArn, wrappingPublicKeySha256, now }) {
  const envelopeRecord = readJsonFile(path.join(artifactDir, CANDIDATE_ENVELOPE_FILE), `${ref.candidate_role} candidate locator envelope`, { pretty: true });
  const envelope = validateWindowsSignedArtifactPrivateHandoffLocatorEnvelope(envelopeRecord.value);
  requireCondition(
    envelopeRecord.sha256 === ref.envelope_sha256
      && envelope.wrapping_key_arn === wrappingKeyArn
      && envelope.wrapping_public_key_sha256 === wrappingPublicKeySha256,
    "WINDOWS_LOCATOR_SEAL_WRAPPING_KEY_INVALID",
    `candidate ${ref.candidate_role} locator wrapping key binding differs`,
  );
  const ciphertext = openSnapshot(path.join(artifactDir, CANDIDATE_CIPHERTEXT_FILE), `${ref.candidate_role} candidate locator ciphertext`, { capture: true });
  let dataKey;
  let plaintext;
  try {
    requireCondition(ciphertext.sha256 === envelope.ciphertext_sha256 && ciphertext.bytes === envelope.ciphertext_bytes, "WINDOWS_LOCATOR_SEAL_CIPHERTEXT_MISMATCH", `candidate ${ref.candidate_role} ciphertext differs`);
    dataKey = await aws.decryptDataKey({
      keyArn: wrappingKeyArn,
      ciphertext: canonicalBase64(envelope.wrapped_key_b64, `${ref.candidate_role} wrapped data key`),
      encryptionAlgorithm: "RSAES_OAEP_SHA_256",
    });
    requireCondition(Buffer.isBuffer(dataKey) && dataKey.length === 32, "WINDOWS_LOCATOR_SEAL_KMS_DECRYPT_INVALID", "KMS did not return a 32-byte candidate locator data key");
    const decipher = createDecipheriv("aes-256-gcm", dataKey, canonicalBase64(envelope.iv_b64, `${ref.candidate_role} locator IV`), { authTagLength: 16 });
    const aad = createWindowsSignedArtifactPrivateHandoffLocatorEnvelopeAad(envelope);
    requireCondition(sha256(aad) === envelope.aad_sha256, "WINDOWS_LOCATOR_SEAL_AAD_INVALID", `candidate ${ref.candidate_role} locator AAD differs`);
    decipher.setAAD(aad, { plaintextLength: envelope.private_receipt_locator_bytes });
    decipher.setAuthTag(canonicalBase64(envelope.auth_tag_b64, `${ref.candidate_role} locator authentication tag`));
    try {
      plaintext = Buffer.concat([decipher.update(ciphertext.content), decipher.final()]);
    } catch {
      fail("WINDOWS_LOCATOR_SEAL_CANDIDATE_AUTHENTICATION_FAILED", `candidate ${ref.candidate_role} locator AES-GCM authentication failed`);
    }
    requireCondition(
      plaintext.length === envelope.private_receipt_locator_bytes
        && sha256(plaintext) === envelope.private_receipt_locator_sha256,
      "WINDOWS_LOCATOR_SEAL_CANDIDATE_LOCATOR_MISMATCH",
      `candidate ${ref.candidate_role} plaintext locator differs`,
    );
    const locator = validateWindowsSignedArtifactPrivateHandoffLocator(
      parseJsonBytes(plaintext, `${ref.candidate_role} private receipt locator`, { compact: true }),
      { now },
    );
    requireCondition(
      locator.sha256 === ref.private_receipt_sha256
        && envelope.source_sha === ref.source_sha
        && envelope.source_tree === ref.source_tree
        && envelope.candidate_role === ref.candidate_role,
      "WINDOWS_LOCATOR_SEAL_CANDIDATE_LOCATOR_MISMATCH",
      `candidate ${ref.candidate_role} receipt locator identity differs`,
    );
    return Object.freeze({ locator, envelope });
  } finally {
    closeSnapshot(ciphertext);
    if (Buffer.isBuffer(dataKey)) dataKey.fill(0);
    if (Buffer.isBuffer(plaintext)) plaintext.fill(0);
  }
}

function assumedRolePattern(roleArn) {
  const name = roleArn.split("/").at(-1).replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  return new RegExp(`^arn:aws:sts::${WINDOWS_SIGNED_ARTIFACT_HANDOFF_ACCOUNT}:assumed-role/${name}/[^/]+$`, "u");
}

function validateProviderGovernance({ provider, bindings }) {
  requireCondition(provider.identity?.Account === bindings.account_id && assumedRolePattern(bindings.role_arn).test(provider.identity?.Arn ?? ""), "WINDOWS_LOCATOR_SEAL_AWS_IDENTITY_INVALID", "AWS locator sealer role identity is invalid");
  requireCondition(provider.location?.LocationConstraint === bindings.region, "WINDOWS_LOCATOR_SEAL_BUCKET_INVALID", "handoff bucket region differs");
  requireCondition(provider.versioning?.Status === "Enabled", "WINDOWS_LOCATOR_SEAL_BUCKET_INVALID", "handoff bucket versioning is disabled");
  const access = provider.publicAccess?.PublicAccessBlockConfiguration ?? {};
  requireCondition(["BlockPublicAcls", "IgnorePublicAcls", "BlockPublicPolicy", "RestrictPublicBuckets"].every((key) => access[key] === true), "WINDOWS_LOCATOR_SEAL_BUCKET_INVALID", "handoff bucket public access block is incomplete");
  requireCondition(provider.objectLock?.ObjectLockConfiguration?.ObjectLockEnabled === "Enabled", "WINDOWS_LOCATOR_SEAL_BUCKET_INVALID", "handoff bucket Object Lock is disabled");
  requireCondition(
    provider.encryption?.ServerSideEncryptionConfiguration?.Rules?.some(({ ApplyServerSideEncryptionByDefault: rule }) => rule?.SSEAlgorithm === "aws:kms" && rule?.KMSMasterKeyID === bindings.kms_key_arn),
    "WINDOWS_LOCATOR_SEAL_BUCKET_INVALID",
    "handoff bucket SSE-KMS binding differs",
  );
  requireCondition(provider.ownership?.OwnershipControls?.Rules?.length === 1 && provider.ownership.OwnershipControls.Rules[0].ObjectOwnership === "BucketOwnerEnforced", "WINDOWS_LOCATOR_SEAL_BUCKET_INVALID", "handoff bucket ownership controls differ");
  requireCondition(provider.artifactKms?.KeyMetadata?.Arn === bindings.kms_key_arn && provider.artifactKms.KeyMetadata.Enabled === true && provider.artifactKms.KeyMetadata.KeyState === "Enabled", "WINDOWS_LOCATOR_SEAL_KMS_INVALID", "artifact KMS key is invalid");
  requireCondition(
    provider.wrappingKms?.KeyMetadata?.Arn === bindings.wrapping_key_arn
      && provider.wrappingKms.KeyMetadata.Enabled === true
      && provider.wrappingKms.KeyMetadata.KeyState === "Enabled"
      && provider.wrappingKms.KeyMetadata.KeyUsage === "ENCRYPT_DECRYPT"
      && provider.wrappingKms.KeyMetadata.KeySpec === "RSA_4096"
      && provider.wrappingKms.KeyMetadata.EncryptionAlgorithms?.includes("RSAES_OAEP_SHA_256"),
    "WINDOWS_LOCATOR_SEAL_KMS_INVALID",
    "locator wrapping KMS key is invalid",
  );
}

function objectReadbackMatches({ response, object, bindings, label }) {
  requireCondition(
    response?.VersionId === object.version_id
      && Number(response?.ContentLength) === object.bytes
      && response?.ServerSideEncryption === "aws:kms"
      && response?.SSEKMSKeyId === bindings.kms_key_arn
      && response?.ChecksumSHA256 === object.provider_checksum_sha256
      && response?.ObjectLockMode === "COMPLIANCE"
      && new Date(response?.ObjectLockRetainUntilDate).toISOString() === object.retain_until
      && response?.Metadata?.["artifact-sha256"] === object.sha256,
    "WINDOWS_LOCATOR_SEAL_OBJECT_READBACK_INVALID",
    `${label} exact-version readback differs`,
  );
}

async function fetchExactObject({ aws, bindings, object, destination, label }) {
  const head = await aws.headObject({ bindings, object });
  objectReadbackMatches({ response: head, object, bindings, label: `${label} HEAD` });
  const get = await aws.getObject({ bindings, object, destination });
  objectReadbackMatches({ response: get, object, bindings, label: `${label} GET` });
  const body = openSnapshot(destination, `${label} GET body`);
  try {
    requireCondition(body.bytes === object.bytes && body.sha256 === object.sha256, "WINDOWS_LOCATOR_SEAL_OBJECT_BODY_INVALID", `${label} full GET body differs`);
  } finally {
    closeSnapshot(body);
  }
}

function receiptObject(locator, role) {
  return {
    id: `${role}_private_handoff_receipt`,
    key: locator.key,
    version_id: locator.version_id,
    sha256: locator.sha256,
    bytes: locator.bytes,
    provider_checksum_sha256: locator.provider_checksum_sha256,
    retain_until: locator.retain_until,
  };
}

function artifactObject(record, role, kind) {
  return {
    id: `${role}_${kind}`,
    key: record.key,
    version_id: record.version_id,
    sha256: record.sha256,
    bytes: record.bytes,
    provider_checksum_sha256: record.upload.provider_checksum_sha256,
    retain_until: record.head_readback.retain_until,
  };
}

async function fetchCandidate({ role, decrypted, ref, aws, bindings, root, now }) {
  const receiptPath = path.join(root, role, "private-handoff-receipt.json");
  mkdirSync(path.dirname(receiptPath), { recursive: true, mode: 0o700 });
  const receiptRef = receiptObject(decrypted.locator, role);
  await fetchExactObject({ aws, bindings, object: receiptRef, destination: receiptPath, label: `${role} private handoff receipt` });
  const receiptInput = readJsonFile(receiptPath, `${role} private handoff receipt`, { pretty: true });
  let receipt;
  try {
    receipt = validateWindowsSignedArtifactPrivateHandoffReceipt(receiptInput.value, { now });
  } catch {
    fail("WINDOWS_LOCATOR_SEAL_PRIVATE_RECEIPT_INVALID", `${role} private handoff receipt is invalid`);
  }
  requireCondition(
    receiptInput.sha256 === ref.private_receipt_sha256
      && receipt.candidate_role === role
      && receipt.source_sha === ref.source_sha
      && receipt.source_tree === ref.source_tree
      && receipt.version === decrypted.envelope.version
      && receipt.storage.account_id === bindings.account_id
      && receipt.storage.region === bindings.region
      && receipt.storage.bucket === bindings.bucket
      && receipt.storage.encryption.kms_key_arn === bindings.kms_key_arn,
    "WINDOWS_LOCATOR_SEAL_PRIVATE_RECEIPT_MISMATCH",
    `${role} private handoff receipt differs from its locator and protected storage binding`,
  );
  const paths = {};
  for (const [kind, fileName] of Object.entries(MATERIALIZED).filter(([kind]) => Object.hasOwn(receipt.artifacts, kind))) {
    const destination = path.join(root, role, fileName);
    await fetchExactObject({
      aws,
      bindings,
      object: artifactObject(receipt.artifacts[kind], role, kind),
      destination,
      label: `${role} ${kind}`,
    });
    paths[kind] = destination;
  }
  requireCondition(Object.keys(paths).length === 4, "WINDOWS_LOCATOR_SEAL_PRIVATE_RECEIPT_INVALID", `${role} private receipt did not provide the exact four package objects`);
  return Object.freeze({ role, ref, locator: decrypted.locator, envelope: decrypted.envelope, receipt, paths });
}

function materializedPath(role, kind) {
  return `candidates/${role}/${MATERIALIZED[kind]}`;
}

function validateReleaseManifest({ bytes, candidate, digest }) {
  const manifest = parseJsonBytes(bytes, `${candidate.role} release manifest`);
  requireCondition(isRecord(manifest), "WINDOWS_LOCATOR_SEAL_RELEASE_MANIFEST_INVALID", `${candidate.role} release manifest must be an object`);
  const sourceSha = manifest.sourceSha ?? manifest.source_sha ?? manifest.source_candidate?.source_sha;
  const sourceTree = manifest.sourceTree ?? manifest.source_tree ?? manifest.source_candidate?.source_tree;
  const artifact = Array.isArray(manifest.artifacts)
    ? manifest.artifacts.find((entry) => entry?.sha256 === candidate.receipt.installer_sha256)
    : null;
  const artifactSha256 = manifest.artifactSha256 ?? manifest.artifact_sha256 ?? artifact?.sha256;
  const artifactBytes = manifest.artifactBytes ?? manifest.artifact_bytes ?? artifact?.bytes;
  requireCondition(
    digest === candidate.approval.release_manifest_sha256
      && manifest.version === candidate.receipt.version
      && sourceSha === candidate.receipt.source_sha
      && sourceTree === candidate.receipt.source_tree
      && artifactSha256 === candidate.receipt.installer_sha256
      && Number(artifactBytes) === candidate.receipt.installer_bytes,
    "WINDOWS_LOCATOR_SEAL_RELEASE_MANIFEST_INVALID",
    `${candidate.role} release manifest bindings differ`,
  );
  return manifest;
}

function assertUniqueMetadataFields(rawText) {
  for (const field of METADATA_FIELDS) {
    const escaped = field.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
    requireCondition((rawText.match(new RegExp(`"${escaped}"\\s*:`, "gu")) ?? []).length === 1, "WINDOWS_LOCATOR_SEAL_UPDATE_METADATA_INVALID", `raw update metadata field ${field} must occur exactly once`);
  }
}

function canonicalIso(value) {
  return typeof value === "string" && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
}

function validateUpdateMetadata({ role, bytes, signature, candidate, approval, now }) {
  requireCondition(signature.length === 64 && verifySignature(null, bytes, approval.update_public_key, signature), "WINDOWS_LOCATOR_SEAL_UPDATE_SIGNATURE_INVALID", `${role} raw 64-byte Ed25519 update signature is invalid`);
  const rawText = bytes.toString("utf8");
  const metadata = parseJsonBytes(bytes, `${role} update metadata`);
  exactKeys(metadata, METADATA_FIELDS, "WINDOWS_LOCATOR_SEAL_UPDATE_METADATA_INVALID", `${role} update metadata`);
  assertUniqueMetadataFields(rawText);
  const approved = approval.candidates[role];
  requireCondition(
    metadata.schemaVersion === EXTERNAL_PILOT_UPDATE_SCHEMA
      && metadata.channel === EXTERNAL_PILOT_UPDATE_CHANNEL
      && metadata.keyId === approval.update_key.key_id
      && metadata.pilotId === approval.pilot_id
      && metadata.lawosTenantId === approval.lawos_tenant_id
      && metadata.entraTenantId === approval.entra_tenant_id
      && metadata.appId === approval.app_id
      && metadata.approvalId === approval.metadata_approval_id
      && metadata.approvalExpiresAt === approval.expires_at
      && metadata.tenantConfigSha256 === approval.tenant_config_sha256
      && metadata.version === approved.version
      && metadata.sourceSha === approved.source_sha
      && metadata.sourceTree === approved.source_tree
      && metadata.artifactSha256 === approved.artifact_sha256
      && metadata.artifactBytes === approved.artifact_bytes
      && metadata.releaseManifestSha256 === approved.release_manifest_sha256
      && metadata.artifactFilename === MATERIALIZED.installer
      && canonicalIso(metadata.generatedAt)
      && canonicalIso(metadata.expiresAt)
      && Date.parse(metadata.generatedAt) <= now
      && Date.parse(metadata.expiresAt) > now
      && Date.parse(metadata.expiresAt) <= Date.parse(approval.expires_at),
    "WINDOWS_LOCATOR_SEAL_UPDATE_METADATA_INVALID",
    `${role} update metadata differs from the production-root approval`,
  );
  requireCondition(
    approved.source_sha === candidate.receipt.source_sha
      && approved.source_tree === candidate.receipt.source_tree
      && approved.version === candidate.receipt.version
      && approved.artifact_sha256 === candidate.receipt.installer_sha256
      && approved.artifact_bytes === candidate.receipt.installer_bytes,
    "WINDOWS_LOCATOR_SEAL_APPROVAL_BINDING_MISMATCH",
    `${role} private candidate differs from the production-root approval`,
  );
  return metadata;
}

function readGovernance(root, name, { json = false } = {}) {
  const filePath = path.join(root, GOVERNANCE_INPUTS[name]);
  requireCondition(existsSync(filePath), "WINDOWS_LOCATOR_SEAL_GOVERNANCE_REQUIRED", `protected governance input ${name} is absent`);
  return openSnapshot(filePath, `protected governance input ${name}`, { capture: json || name.endsWith("signature") });
}

function validateExecutionInput(bytes) {
  const input = parseJsonBytes(bytes, "protected Windows execution input", { pretty: true });
  exactKeys(input, ["automatic_update", "baseline", "execution_mode", "schema_version", "target"], "WINDOWS_LOCATOR_SEAL_EXECUTION_INPUT_INVALID", "protected Windows execution input");
  requireCondition(input.schema_version === WINDOWS_UPDATE_EXECUTION_INPUT_SCHEMA && input.execution_mode === WINDOWS_UPDATE_EXECUTION_MODE && input.automatic_update === false, "WINDOWS_LOCATOR_SEAL_EXECUTION_INPUT_INVALID", "protected Windows execution input is not the exact nonautomatic mode");
  for (const role of ["baseline", "target"]) {
    exactKeys(input[role], ["installer_path", "metadata_path", "signature_path"], "WINDOWS_LOCATOR_SEAL_EXECUTION_INPUT_INVALID", `protected Windows execution input ${role}`);
    requireCondition(
      input[role].installer_path === materializedPath(role, "installer")
        && input[role].metadata_path === materializedPath(role, "update_metadata")
        && input[role].signature_path === materializedPath(role, "update_metadata_signature"),
      "WINDOWS_LOCATOR_SEAL_EXECUTION_INPUT_INVALID",
      `protected Windows execution input ${role} paths differ from the frozen materialization contract`,
    );
  }
  return input;
}

function governanceKey({ id, digest, fileName }) {
  return `windows/governance/v1/${id}/sha256/${digest}/${fileName}`;
}

async function uploadGovernanceObject({ aws, bindings, snapshot, id, relativePath, contentType }) {
  const fileName = path.posix.basename(relativePath);
  const object = {
    id,
    key: governanceKey({ id, digest: snapshot.sha256, fileName }),
    sha256: snapshot.sha256,
    bytes: snapshot.bytes,
    provider_checksum_sha256: Buffer.from(snapshot.sha256, "hex").toString("base64"),
    object_lock_mode: "COMPLIANCE",
    retain_until: bindings.retain_until,
    relative_path: relativePath,
  };
  const uploaded = await aws.putObject({ bindings, object, bodyPath: snapshot.target, contentType });
  requireCondition(typeof uploaded?.VersionId === "string" && uploaded.VersionId.length > 0 && uploaded.VersionId !== "null", "WINDOWS_LOCATOR_SEAL_UPLOAD_INVALID", `${id} upload did not return an exact VersionId`);
  object.version_id = uploaded.VersionId;
  const head = await aws.headObject({ bindings, object });
  objectReadbackMatches({ response: head, object, bindings, label: `${id} upload HEAD` });
  const readbackRoot = mkdtempSync(path.join(tmpdir(), "lawos-windows-governance-readback-"));
  const destination = path.join(readbackRoot, "body");
  try {
    const get = await aws.getObject({ bindings, object, destination });
    objectReadbackMatches({ response: get, object, bindings, label: `${id} upload GET` });
    const body = openSnapshot(destination, `${id} upload full GET`);
    try {
      requireCondition(body.bytes === snapshot.bytes && body.sha256 === snapshot.sha256, "WINDOWS_LOCATOR_SEAL_UPLOAD_READBACK_INVALID", `${id} upload full GET body differs`);
    } finally {
      closeSnapshot(body);
    }
  } finally {
    rmSync(readbackRoot, { recursive: true, force: true });
  }
  return deepFreeze(object);
}

export function createWindowsFormalUpdatePrivateLocatorEnvelopeAad(envelope) {
  return Buffer.from(canonicalJson({
    schema_version: envelope.schema_version,
    generated_at: envelope.generated_at,
    producer_repository: envelope.producer_repository,
    producer_workflow_ref: envelope.producer_workflow_ref,
    producer_job: envelope.producer_job,
    producer_run_id: envelope.producer_run_id,
    producer_run_attempt: envelope.producer_run_attempt,
    source_sha: envelope.source_sha,
    source_tree: envelope.source_tree,
    private_locator_sha256: envelope.private_locator_sha256,
    private_locator_bytes: envelope.private_locator_bytes,
    wrapping_key_arn: envelope.wrapping_key_arn,
    wrapping_public_key_sha256: envelope.wrapping_public_key_sha256,
    key_wrap_algorithm: envelope.key_wrap_algorithm,
    content_encryption_algorithm: envelope.content_encryption_algorithm,
    ciphertext_file: envelope.ciphertext_file,
  }), "utf8");
}

export function validateWindowsFormalUpdatePrivateLocatorEnvelope(envelope) {
  exactKeys(envelope, [
    "schema_version", "generated_at", "producer_repository", "producer_workflow_ref", "producer_job",
    "producer_run_id", "producer_run_attempt", "source_sha", "source_tree", "private_locator_sha256",
    "private_locator_bytes", "wrapping_key_arn", "wrapping_public_key_sha256", "key_wrap_algorithm",
    "content_encryption_algorithm", "ciphertext_file", "ciphertext_sha256", "ciphertext_bytes", "iv_b64",
    "auth_tag_b64", "aad_sha256", "wrapped_key_b64",
  ], "WINDOWS_LOCATOR_SEAL_ENVELOPE_INVALID", "aggregate private locator envelope");
  requireCondition(
    envelope.schema_version === WINDOWS_UPDATE_PRIVATE_LOCATOR_ENVELOPE_SCHEMA
      && canonicalIso(envelope.generated_at)
      && envelope.producer_repository === "Gonyak-cell/law-firm-os"
      && envelope.producer_workflow_ref === WINDOWS_UPDATE_PRIVATE_LOCATOR_WORKFLOW_REF
      && envelope.producer_job === WINDOWS_UPDATE_PRIVATE_LOCATOR_JOB
      && POSITIVE_INTEGER.test(envelope.producer_run_id ?? "")
      && POSITIVE_INTEGER.test(envelope.producer_run_attempt ?? "")
      && GIT_OBJECT.test(envelope.source_sha ?? "")
      && GIT_OBJECT.test(envelope.source_tree ?? "")
      && SHA256.test(envelope.private_locator_sha256 ?? "")
      && Number.isSafeInteger(envelope.private_locator_bytes) && envelope.private_locator_bytes > 0
      && KMS_ARN.test(envelope.wrapping_key_arn ?? "")
      && SHA256.test(envelope.wrapping_public_key_sha256 ?? "")
      && envelope.key_wrap_algorithm === "RSAES_OAEP_SHA_256"
      && envelope.content_encryption_algorithm === "AES-256-GCM"
      && envelope.ciphertext_file === AGGREGATE_CIPHERTEXT_FILE
      && SHA256.test(envelope.ciphertext_sha256 ?? "")
      && envelope.ciphertext_bytes === envelope.private_locator_bytes
      && canonicalBase64(envelope.iv_b64, "aggregate locator IV").length === 12
      && canonicalBase64(envelope.auth_tag_b64, "aggregate locator authentication tag").length === 16
      && SHA256.test(envelope.aad_sha256 ?? "")
      && sha256(createWindowsFormalUpdatePrivateLocatorEnvelopeAad(envelope)) === envelope.aad_sha256
      && canonicalBase64(envelope.wrapped_key_b64, "aggregate locator wrapped key").length === 512,
    "WINDOWS_LOCATOR_SEAL_ENVELOPE_INVALID",
    "aggregate private locator envelope is invalid",
  );
  return deepFreeze(envelope);
}

function createAggregateEnvelope({ locatorBytes, outputDir, producer, wrapping, randomBytesFn, publicEncryptFn, generatedAt }) {
  const key = validateWrappingPublicKey({ spkiBase64: wrapping.public_key_spki_b64, sha256Expected: wrapping.public_key_sha256 });
  let dataKey;
  let ciphertext;
  try {
    dataKey = randomBytesFn(32);
    const iv = randomBytesFn(12);
    requireCondition(Buffer.isBuffer(dataKey) && dataKey.length === 32 && Buffer.isBuffer(iv) && iv.length === 12, "WINDOWS_LOCATOR_SEAL_RANDOM_INVALID", "aggregate locator encryption random material is invalid");
    const wrappedKey = publicEncryptFn({ key, padding: cryptoConstants.RSA_PKCS1_OAEP_PADDING, oaepHash: "sha256" }, dataKey);
    requireCondition(Buffer.isBuffer(wrappedKey) && wrappedKey.length === 512, "WINDOWS_LOCATOR_SEAL_WRAPPING_KEY_INVALID", "aggregate locator wrapped key must contain 512 bytes");
    const envelope = {
      schema_version: WINDOWS_UPDATE_PRIVATE_LOCATOR_ENVELOPE_SCHEMA,
      generated_at: generatedAt,
      producer_repository: producer.repository,
      producer_workflow_ref: producer.workflow_ref,
      producer_job: producer.job,
      producer_run_id: producer.run_id,
      producer_run_attempt: producer.run_attempt,
      source_sha: producer.source_sha,
      source_tree: producer.source_tree,
      private_locator_sha256: sha256(locatorBytes),
      private_locator_bytes: locatorBytes.length,
      wrapping_key_arn: wrapping.key_arn,
      wrapping_public_key_sha256: wrapping.public_key_sha256,
      key_wrap_algorithm: "RSAES_OAEP_SHA_256",
      content_encryption_algorithm: "AES-256-GCM",
      ciphertext_file: AGGREGATE_CIPHERTEXT_FILE,
      ciphertext_sha256: "0".repeat(64),
      ciphertext_bytes: locatorBytes.length,
      iv_b64: iv.toString("base64"),
      auth_tag_b64: Buffer.alloc(16).toString("base64"),
      aad_sha256: "0".repeat(64),
      wrapped_key_b64: wrappedKey.toString("base64"),
    };
    const aad = createWindowsFormalUpdatePrivateLocatorEnvelopeAad(envelope);
    const cipher = createCipheriv("aes-256-gcm", dataKey, iv, { authTagLength: 16 });
    cipher.setAAD(aad, { plaintextLength: locatorBytes.length });
    ciphertext = Buffer.concat([cipher.update(locatorBytes), cipher.final()]);
    envelope.ciphertext_sha256 = sha256(ciphertext);
    envelope.ciphertext_bytes = ciphertext.length;
    envelope.auth_tag_b64 = cipher.getAuthTag().toString("base64");
    envelope.aad_sha256 = sha256(aad);
    validateWindowsFormalUpdatePrivateLocatorEnvelope(envelope);
    mkdirSync(outputDir, { recursive: false, mode: 0o700 });
    writeExclusive(path.join(outputDir, AGGREGATE_CIPHERTEXT_FILE), ciphertext);
    const envelopeBytes = Buffer.from(`${JSON.stringify(envelope, null, 2)}\n`);
    writeExclusive(path.join(outputDir, AGGREGATE_ENVELOPE_FILE), envelopeBytes);
    requireCondition(readdirSync(outputDir).sort().join("\0") === [AGGREGATE_CIPHERTEXT_FILE, AGGREGATE_ENVELOPE_FILE].sort().join("\0"), "WINDOWS_LOCATOR_SEAL_ENVELOPE_INVALID", "aggregate locator artifact file set differs");
    return Object.freeze({ envelope: deepFreeze(envelope), envelope_sha256: sha256(envelopeBytes), output_dir: outputDir });
  } finally {
    if (Buffer.isBuffer(dataKey)) dataKey.fill(0);
    if (Buffer.isBuffer(ciphertext)) ciphertext.fill(0);
  }
}

function locatorGovernanceDescriptor(object) {
  return Object.freeze({
    relative_path: object.relative_path,
    key: object.key,
    version_id: object.version_id,
    sha256: object.sha256,
    bytes: object.bytes,
    provider_checksum_sha256: object.provider_checksum_sha256,
    object_lock_mode: object.object_lock_mode,
    retain_until: object.retain_until,
  });
}

function privateReceiptLocator(candidate) {
  return Object.freeze({ ...candidate.locator });
}

function sealReceipt({ producer, candidates, uploaded, locatorBytes, envelopeResult, now }) {
  return deepFreeze({
    schema_version: WINDOWS_UPDATE_PRIVATE_LOCATOR_SEAL_RECEIPT_SCHEMA,
    generated_at: new Date(now).toISOString(),
    verdict: "PASS",
    state: "SEALED",
    source_sha: producer.source_sha,
    source_tree: producer.source_tree,
    candidates: Object.fromEntries(["baseline", "target"].map((role) => [role, {
      source_sha: candidates[role].receipt.source_sha,
      source_tree: candidates[role].receipt.source_tree,
      version: candidates[role].receipt.version,
      private_receipt_sha256: candidates[role].receiptInputSha256,
      installer_sha256: candidates[role].receipt.installer_sha256,
      release_manifest_sha256: uploaded[`${role}_release_manifest`].sha256,
      update_metadata_sha256: uploaded[`${role}_update_metadata`].sha256,
      update_metadata_signature_sha256: uploaded[`${role}_update_metadata_signature`].sha256,
    }])),
    governance: Object.fromEntries(["execution_input", "approval_receipt", "approval_signature"].map((id) => [id, {
      sha256: uploaded[id].sha256,
      bytes: uploaded[id].bytes,
    }])),
    private_locator_sha256: sha256(locatorBytes),
    private_locator_bytes: locatorBytes.length,
    envelope_sha256: envelopeResult.envelope_sha256,
    wrapping_public_key_sha256: envelopeResult.envelope.wrapping_public_key_sha256,
    object_count: 19,
    immutable_governance_upload_count: 9,
    boundaries: {
      candidate_locator_plaintext_uploaded: false,
      aggregate_locator_plaintext_uploaded: false,
      exact_s3_locator_recorded: false,
      governance_plaintext_uploaded_to_github: false,
      automatic_update: false,
      public_release_claim: false,
      external_distribution_claim: false,
      production_go_live_claim: false,
    },
  });
}

export async function sealWindowsFormalUpdatePrivateLocator({
  refs,
  candidateArtifactDirs,
  governanceRoot,
  privateRoot,
  outputDir,
  receiptPath,
  bindings,
  producer,
  wrapping,
  aws,
  now = Date.now(),
  randomBytesFn = randomBytes,
  publicEncryptFn = publicEncrypt,
} = {}) {
  const safeRefs = validateWindowsUpdateCandidateLocatorArtifactRefs(refs);
  exactKeys(candidateArtifactDirs, ["baseline", "target"], "WINDOWS_LOCATOR_SEAL_INPUT_INVALID", "candidate artifact directories");
  exactKeys(bindings, ["account_id", "region", "bucket", "kms_key_arn", "role_arn", "reader_role_arn", "retain_until", "governance_prefix", "signed_prefix", "wrapping_key_arn"], "WINDOWS_LOCATOR_SEAL_INPUT_INVALID", "protected storage bindings");
  exactKeys(producer, ["repository", "workflow_ref", "job", "run_id", "run_attempt", "source_sha", "source_tree"], "WINDOWS_LOCATOR_SEAL_INPUT_INVALID", "aggregate producer identity");
  exactKeys(wrapping, ["key_arn", "public_key_spki_b64", "public_key_sha256"], "WINDOWS_LOCATOR_SEAL_INPUT_INVALID", "aggregate wrapping key binding");
  requireCondition(
    bindings.account_id === WINDOWS_SIGNED_ARTIFACT_HANDOFF_ACCOUNT
      && bindings.region === WINDOWS_SIGNED_ARTIFACT_HANDOFF_REGION
      && BUCKET.test(bindings.bucket ?? "")
      && KMS_ARN.test(bindings.kms_key_arn ?? "")
      && ROLE_ARN.test(bindings.role_arn ?? "")
      && ROLE_ARN.test(bindings.reader_role_arn ?? "")
      && bindings.signed_prefix === "windows/signed/v1/"
      && bindings.governance_prefix === "windows/governance/v1/"
      && bindings.wrapping_key_arn === wrapping.key_arn
      && KMS_ARN.test(wrapping.key_arn ?? "")
      && canonicalUtc(bindings.retain_until, "protected governance retain_until", { now, retention: true })
      && producer.repository === "Gonyak-cell/law-firm-os"
      && producer.workflow_ref === WINDOWS_UPDATE_PRIVATE_LOCATOR_WORKFLOW_REF
      && producer.job === WINDOWS_UPDATE_PRIVATE_LOCATOR_JOB
      && POSITIVE_INTEGER.test(producer.run_id ?? "")
      && POSITIVE_INTEGER.test(producer.run_attempt ?? "")
      && GIT_OBJECT.test(producer.source_sha ?? "")
      && GIT_OBJECT.test(producer.source_tree ?? "")
      && typeof aws?.inspectGovernance === "function"
      && typeof aws?.decryptDataKey === "function"
      && typeof aws?.headObject === "function"
      && typeof aws?.getObject === "function"
      && typeof aws?.putObject === "function",
    "WINDOWS_LOCATOR_SEAL_INPUT_INVALID",
    "aggregate locator protected inputs are invalid or incomplete",
  );
  validateWrappingPublicKey({ spkiBase64: wrapping.public_key_spki_b64, sha256Expected: wrapping.public_key_sha256 });
  requireCondition(!existsSync(privateRoot) && !existsSync(outputDir) && !existsSync(receiptPath), "WINDOWS_LOCATOR_SEAL_OUTPUT_NOT_FRESH", "aggregate locator private and output paths must start absent");
  const snapshots = [];
  let locatorBytes;
  mkdirSync(privateRoot, { recursive: false, mode: 0o700 });
  try {
    const provider = await aws.inspectGovernance(bindings);
    validateProviderGovernance({ provider, bindings });
    const decrypted = {};
    for (const role of ["baseline", "target"]) {
      decrypted[role] = await decryptCandidateLocator({
        artifactDir: candidateArtifactDirs[role],
        ref: safeRefs[role],
        aws,
        wrappingKeyArn: wrapping.key_arn,
        wrappingPublicKeySha256: wrapping.public_key_sha256,
        now,
      });
    }
    const candidates = {};
    for (const role of ["baseline", "target"]) {
      const candidate = await fetchCandidate({ role, decrypted: decrypted[role], ref: safeRefs[role], aws, bindings, root: privateRoot, now });
      candidates[role] = { ...candidate, receiptInputSha256: candidate.locator.sha256 };
    }
    const governanceSnapshots = Object.fromEntries(Object.keys(GOVERNANCE_INPUTS).map((name) => {
      const snapshot = readGovernance(governanceRoot, name, { json: !name.endsWith("signature") });
      snapshots.push(snapshot);
      return [name, snapshot];
    }));
    requireCondition(governanceSnapshots.approval_signature.bytes === 64, "WINDOWS_LOCATOR_SEAL_APPROVAL_SIGNATURE_INVALID", "protected approval signature must contain exactly 64 raw Ed25519 bytes");
    requireCondition(governanceSnapshots.baseline_update_metadata_signature.bytes === 64 && governanceSnapshots.target_update_metadata_signature.bytes === 64, "WINDOWS_LOCATOR_SEAL_UPDATE_SIGNATURE_INVALID", "protected update signatures must contain exactly 64 raw Ed25519 bytes");
    validateExecutionInput(governanceSnapshots.execution_input.content);
    const approval = await verifyWindowsFormalUpdateApproval({
      approvalBundleBytes: governanceSnapshots.approval_receipt.content,
      verifyApprovalBundle: createProductionWindowsApprovalVerifier({ approvalSignatureBytes: governanceSnapshots.approval_signature.content }),
      now,
    });
    for (const role of ["baseline", "target"]) candidates[role].approval = approval.candidates[role];
    for (const role of ["baseline", "target"]) {
      const release = governanceSnapshots[`${role}_release_manifest`];
      validateReleaseManifest({ bytes: release.content, candidate: candidates[role], digest: release.sha256 });
      validateUpdateMetadata({
        role,
        bytes: governanceSnapshots[`${role}_update_metadata`].content,
        signature: governanceSnapshots[`${role}_update_metadata_signature`].content,
        candidate: candidates[role],
        approval,
        now,
      });
    }
    const uploadSpecs = [
      ...["baseline", "target"].flatMap((role) => [
        { name: `${role}_release_manifest`, id: `${role}_release_manifest`, relativePath: materializedPath(role, "release_manifest"), contentType: "application/json" },
        { name: `${role}_update_metadata`, id: `${role}_update_metadata`, relativePath: materializedPath(role, "update_metadata"), contentType: "application/json" },
        { name: `${role}_update_metadata_signature`, id: `${role}_update_metadata_signature`, relativePath: materializedPath(role, "update_metadata_signature"), contentType: "application/octet-stream" },
      ]),
      { name: "execution_input", id: "execution_input", relativePath: "governance/execution-input.json", contentType: "application/json" },
      { name: "approval_receipt", id: "approval_receipt", relativePath: "governance/approval-receipt.json", contentType: "application/json" },
      { name: "approval_signature", id: "approval_signature", relativePath: "governance/approval-receipt.json.sig", contentType: "application/octet-stream" },
    ];
    const uploaded = {};
    for (const spec of uploadSpecs) {
      uploaded[spec.id] = await uploadGovernanceObject({ aws, bindings, snapshot: governanceSnapshots[spec.name], ...spec });
    }
    const locator = {
      schema_version: WINDOWS_UPDATE_PRIVATE_LOCATOR_SCHEMA,
      account_id: bindings.account_id,
      region: bindings.region,
      bucket: bindings.bucket,
      kms_key_arn: bindings.kms_key_arn,
      reader_role_arn: bindings.reader_role_arn,
      claim_policy: CLAIM_POLICY,
      candidates: Object.fromEntries(["baseline", "target"].map((role) => [role, {
        source_sha: candidates[role].receipt.source_sha,
        source_tree: candidates[role].receipt.source_tree,
        version: candidates[role].receipt.version,
        private_handoff_locator: privateReceiptLocator(candidates[role]),
        materialized_paths: Object.fromEntries(["installer", "build_manifest", "native_package_qa", "installed_tree_sbom"].map((kind) => [kind, materializedPath(role, kind)])),
        release_manifest: locatorGovernanceDescriptor(uploaded[`${role}_release_manifest`]),
        update_metadata: locatorGovernanceDescriptor(uploaded[`${role}_update_metadata`]),
        update_metadata_signature: locatorGovernanceDescriptor(uploaded[`${role}_update_metadata_signature`]),
      }])),
      governance: {
        execution_input: locatorGovernanceDescriptor(uploaded.execution_input),
        approval_receipt: locatorGovernanceDescriptor(uploaded.approval_receipt),
        approval_signature: locatorGovernanceDescriptor(uploaded.approval_signature),
      },
    };
    locatorBytes = Buffer.from(JSON.stringify(locator));
    const envelopeResult = createAggregateEnvelope({
      locatorBytes,
      outputDir,
      producer,
      wrapping,
      randomBytesFn,
      publicEncryptFn,
      generatedAt: new Date(now).toISOString(),
    });
    const receipt = sealReceipt({ producer, candidates, uploaded, locatorBytes, envelopeResult, now });
    const receiptBytes = Buffer.from(`${JSON.stringify(receipt, null, 2)}\n`);
    writeExclusive(receiptPath, receiptBytes);
    return Object.freeze({
      receipt,
      receipt_sha256: sha256(receiptBytes),
      private_locator_sha256: sha256(locatorBytes),
      private_locator_bytes: locatorBytes.length,
      envelope: envelopeResult.envelope,
      envelope_sha256: envelopeResult.envelope_sha256,
      output_dir: outputDir,
      object_count: 19,
      governance_upload_count: 9,
    });
  } catch (error) {
    rmSync(outputDir, { recursive: true, force: true });
    rmSync(receiptPath, { force: true });
    throw error;
  } finally {
    for (const snapshot of snapshots) closeSnapshot(snapshot);
    if (Buffer.isBuffer(locatorBytes)) locatorBytes.fill(0);
    rmSync(privateRoot, { recursive: true, force: true });
  }
}

export function validateWindowsFormalUpdatePrivateLocatorArtifactRef(value) {
  exactKeys(value, [
    "schema_version", "producer_repository", "producer_workflow_ref", "producer_job", "producer_run_id",
    "producer_run_attempt", "source_sha", "source_tree", "artifact_name", "artifact_id", "artifact_digest",
    "envelope_sha256", "private_locator_sha256", "wrapping_public_key_sha256",
  ], "WINDOWS_LOCATOR_SEAL_ARTIFACT_REF_INVALID", "aggregate private locator artifact ref");
  requireCondition(
    value.schema_version === WINDOWS_UPDATE_PRIVATE_LOCATOR_ARTIFACT_REF_SCHEMA
      && value.producer_repository === "Gonyak-cell/law-firm-os"
      && value.producer_workflow_ref === WINDOWS_UPDATE_PRIVATE_LOCATOR_WORKFLOW_REF
      && value.producer_job === WINDOWS_UPDATE_PRIVATE_LOCATOR_JOB
      && POSITIVE_INTEGER.test(value.producer_run_id ?? "")
      && POSITIVE_INTEGER.test(value.producer_run_attempt ?? "")
      && GIT_OBJECT.test(value.source_sha ?? "")
      && GIT_OBJECT.test(value.source_tree ?? "")
      && value.artifact_name === `windows-formal-update-private-locator-${value.producer_run_id}-${value.producer_run_attempt}`
      && POSITIVE_INTEGER.test(value.artifact_id ?? "")
      && SHA256_PREFIXED.test(value.artifact_digest ?? "")
      && SHA256.test(value.envelope_sha256 ?? "")
      && SHA256.test(value.private_locator_sha256 ?? "")
      && SHA256.test(value.wrapping_public_key_sha256 ?? ""),
    "WINDOWS_LOCATOR_SEAL_ARTIFACT_REF_INVALID",
    "aggregate private locator artifact ref is invalid",
  );
  return deepFreeze(structuredClone(value));
}

function cliJson(execute, args, region) {
  try {
    const output = execute("aws", [...args, "--region", region, "--no-cli-pager", "--output", "json"], {
      encoding: "utf8",
      windowsHide: true,
      maxBuffer: 16 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, AWS_EC2_METADATA_DISABLED: "true", AWS_PAGER: "" },
    });
    return JSON.parse(output || "{}");
  } catch {
    fail("WINDOWS_LOCATOR_SEAL_AWS_FAILED", "AWS locator sealer operation failed");
  }
}

function awsMetadata(metadata) {
  return Object.entries(metadata).map(([key, value]) => `${key}=${value}`).join(",");
}

export function createWindowsFormalUpdatePrivateLocatorAwsCliAdapter({
  execute = execFileSync,
  region = WINDOWS_SIGNED_ARTIFACT_HANDOFF_REGION,
} = {}) {
  const json = (args) => cliJson(execute, args, region);
  const objectArgs = (bindings, object) => [
    "--bucket", bindings.bucket,
    "--key", object.key,
    "--version-id", object.version_id,
    "--expected-bucket-owner", bindings.account_id,
    "--checksum-mode", "ENABLED",
  ];
  return Object.freeze({
    async inspectGovernance(bindings) {
      const common = ["--bucket", bindings.bucket, "--expected-bucket-owner", bindings.account_id];
      return {
        identity: json(["sts", "get-caller-identity"]),
        location: json(["s3api", "get-bucket-location", ...common]),
        versioning: json(["s3api", "get-bucket-versioning", ...common]),
        publicAccess: json(["s3api", "get-public-access-block", ...common]),
        objectLock: json(["s3api", "get-object-lock-configuration", ...common]),
        encryption: json(["s3api", "get-bucket-encryption", ...common]),
        ownership: json(["s3api", "get-bucket-ownership-controls", ...common]),
        artifactKms: json(["kms", "describe-key", "--key-id", bindings.kms_key_arn]),
        wrappingKms: json(["kms", "describe-key", "--key-id", bindings.wrapping_key_arn]),
      };
    },
    async decryptDataKey({ keyArn, ciphertext, encryptionAlgorithm }) {
      const root = mkdtempSync(path.join(tmpdir(), "lawos-windows-locator-kms-"));
      const file = path.join(root, "ciphertext");
      try {
        writeFileSync(file, ciphertext, { mode: 0o600, flag: "wx" });
        const output = execute("aws", [
          "kms", "decrypt", "--key-id", keyArn, "--encryption-algorithm", encryptionAlgorithm,
          "--ciphertext-blob", `fileb://${file}`, "--query", "Plaintext", "--output", "text",
          "--region", region, "--no-cli-pager",
        ], { encoding: "utf8", windowsHide: true, stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, AWS_EC2_METADATA_DISABLED: "true", AWS_PAGER: "" } }).trim();
        return canonicalBase64(output, "KMS decrypted locator data key");
      } catch {
        fail("WINDOWS_LOCATOR_SEAL_KMS_DECRYPT_FAILED", "KMS RSA-OAEP-SHA256 locator unwrap failed");
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    },
    async headObject({ bindings, object }) {
      return json(["s3api", "head-object", ...objectArgs(bindings, object)]);
    },
    async getObject({ bindings, object, destination }) {
      return json(["s3api", "get-object", ...objectArgs(bindings, object), destination]);
    },
    async putObject({ bindings, object, bodyPath, contentType }) {
      return json([
        "s3api", "put-object",
        "--bucket", bindings.bucket,
        "--key", object.key,
        "--body", bodyPath,
        "--expected-bucket-owner", bindings.account_id,
        "--content-type", contentType,
        "--server-side-encryption", "aws:kms",
        "--ssekms-key-id", bindings.kms_key_arn,
        "--checksum-algorithm", "SHA256",
        "--checksum-sha256", object.provider_checksum_sha256,
        "--object-lock-mode", "COMPLIANCE",
        "--object-lock-retain-until-date", bindings.retain_until,
        "--metadata", awsMetadata({ "artifact-sha256": object.sha256, "artifact-kind": object.id }),
      ]);
    },
  });
}

export const WINDOWS_UPDATE_PRIVATE_LOCATOR_FILES = Object.freeze({
  candidate_envelope: CANDIDATE_ENVELOPE_FILE,
  candidate_ciphertext: CANDIDATE_CIPHERTEXT_FILE,
  aggregate_envelope: AGGREGATE_ENVELOPE_FILE,
  aggregate_ciphertext: AGGREGATE_CIPHERTEXT_FILE,
  governance_inputs: GOVERNANCE_INPUTS,
});
