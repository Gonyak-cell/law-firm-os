import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  constants as cryptoConstants,
  createCipheriv,
  createDecipheriv,
  createHash,
  createPublicKey,
  publicEncrypt,
  randomBytes,
} from "node:crypto";
import {
  closeSync,
  constants as fsConstants,
  fstatSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readdirSync,
  readSync,
  realpathSync,
  renameSync,
  rmSync,
  writeSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { validateDesktopBuildManifest } from "./matter-desktop-provenance.mjs";

export const WINDOWS_SIGNED_ARTIFACT_PRIVATE_HANDOFF_SCHEMA =
  "law-firm-os.windows-signed-artifact-private-handoff.v1";
export const WINDOWS_SIGNED_ARTIFACT_PRIVATE_HANDOFF_LOCATOR_SCHEMA =
  "law-firm-os.windows-signed-artifact-private-handoff-locator.v1";
export const WINDOWS_SIGNED_ARTIFACT_PRIVATE_HANDOFF_LOCATOR_ENVELOPE_SCHEMA =
  "law-firm-os.windows-signed-artifact-private-handoff-locator-envelope.v1";
export const WINDOWS_SIGNED_ARTIFACT_ENCRYPTED_BRIDGE_SCHEMA =
  "law-firm-os.windows-signed-artifact-encrypted-bridge.v1";
export const WINDOWS_SIGNED_ARTIFACT_HANDOFF_ACCOUNT = "770880870480";
export const WINDOWS_SIGNED_ARTIFACT_HANDOFF_REGION = "ap-northeast-2";

const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const GIT_OBJECT_PATTERN = /^[0-9a-f]{40}$/u;
const VERSION_PATTERN = /^[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?$/u;
const CANDIDATE_ROLES = new Set(["baseline", "target"]);
const DAY_MS = 24 * 60 * 60 * 1_000;
const MINIMUM_RETENTION_MS = 365 * DAY_MS;
const MAXIMUM_RETENTION_MS = 10 * 365 * DAY_MS;
const IO_CHUNK_BYTES = 1024 * 1024;
const MAX_JSON_BYTES = 16 * 1024 * 1024;
const HANDOFF_BINDING_KEYS = Object.freeze([
  "account_id",
  "region",
  "uploader_role_arn",
  "bucket",
  "kms_key_arn",
  "retain_until",
]);
const STAGED_ARTIFACTS = Object.freeze({
  installer: Object.freeze({ file: "signed-installer.exe", contentType: "application/vnd.microsoft.portable-executable" }),
  build_manifest: Object.freeze({ file: "windows-build-manifest.json", contentType: "application/json" }),
  native_package_qa: Object.freeze({ file: "formal-windows-package-qa.json", contentType: "application/json" }),
  installed_tree_sbom: Object.freeze({ file: "windows-installed-tree-sbom.cdx.json", contentType: "application/vnd.cyclonedx+json" }),
});
const ENCRYPTED_BRIDGE_FILE_NAMES = Object.freeze({
  installer: "payload-01.enc",
  build_manifest: "payload-02.enc",
  native_package_qa: "payload-03.enc",
  installed_tree_sbom: "payload-04.enc",
});
const PRIVATE_RECEIPT_DEFINITION = Object.freeze({
  file: "windows-signed-artifact-private-handoff.json",
  contentType: "application/json",
});
const PRIVATE_LOCATOR_ENVELOPE_FILE = "windows-signed-artifact-private-locator-envelope.json";
const PRIVATE_LOCATOR_CIPHERTEXT_FILE = "windows-signed-artifact-private-locator.enc";

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function parseJsonBytes(bytes, label) {
  try {
    return JSON.parse(bytes.toString("utf8"));
  } catch {
    throw new Error(`${label} must be valid JSON`);
  }
}

function canonicalUtc(value, label) {
  assert.equal(typeof value, "string", `${label} must be a timestamp`);
  const parsed = new Date(value);
  assert.equal(Number.isNaN(parsed.valueOf()), false, `${label} must be a timestamp`);
  assert.equal(parsed.toISOString(), value, `${label} must be canonical UTC`);
  return parsed;
}

function assertExactKeys(value, keys, label) {
  assert.ok(value && typeof value === "object" && !Array.isArray(value), `${label} must be an object`);
  assert.deepEqual(Object.keys(value).sort(), [...keys].sort(), `${label} must use the exact closed schema`);
  return value;
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const nested of Object.values(value)) deepFreeze(nested);
  return Object.freeze(value);
}

function forEachDescriptorChunk(fd, byteSize, visitor) {
  const buffer = Buffer.allocUnsafe(Math.min(IO_CHUNK_BYTES, byteSize));
  let position = 0;
  try {
    while (position < byteSize) {
      const expected = Math.min(buffer.length, byteSize - position);
      const count = readSync(fd, buffer, 0, expected, position);
      assert.equal(count, expected, "file changed while its stable descriptor was read");
      visitor(buffer.subarray(0, count));
      position += count;
    }
  } finally {
    buffer.fill(0);
  }
}

function descriptorDigest(fd, byteSize) {
  const hash = createHash("sha256");
  forEachDescriptorChunk(fd, byteSize, (chunk) => hash.update(chunk));
  return hash.digest("hex");
}

function sameFileIdentity(left, right) {
  return left.dev === right.dev && left.ino === right.ino && left.size === right.size;
}

function openRegularFileSnapshot(filePath, label, { captureJson = false } = {}) {
  const resolved = path.resolve(filePath);
  const before = lstatSync(resolved, { bigint: true });
  assert.equal(before.isSymbolicLink(), false, `${label} cannot be a symbolic link`);
  assert.equal(before.isFile(), true, `${label} must be a regular file`);
  assert.equal(before.nlink, 1n, `${label} cannot be hard-linked`);
  assert.equal(realpathSync(resolved), resolved, `${label} cannot traverse a link`);
  const fd = openSync(resolved, fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW ?? 0));
  try {
    const descriptor = fstatSync(fd, { bigint: true });
    const after = lstatSync(resolved, { bigint: true });
    assert.equal(descriptor.isFile(), true, `${label} descriptor must be a regular file`);
    assert.equal(descriptor.nlink, 1n, `${label} descriptor cannot be hard-linked`);
    assert.equal(sameFileIdentity(before, descriptor) && sameFileIdentity(descriptor, after), true, `${label} was replaced while being opened`);
    const byteSize = Number(descriptor.size);
    assert.ok(Number.isSafeInteger(byteSize) && byteSize > 0, `${label} cannot be empty or oversized`);
    if (captureJson) assert.ok(byteSize <= MAX_JSON_BYTES, `${label} exceeds the bounded JSON size`);
    const digest = descriptorDigest(fd, byteSize);
    const finalDescriptor = fstatSync(fd, { bigint: true });
    assert.equal(sameFileIdentity(descriptor, finalDescriptor), true, `${label} changed while being hashed`);
    let jsonBytes;
    if (captureJson) {
      jsonBytes = Buffer.allocUnsafe(byteSize);
      let position = 0;
      while (position < byteSize) {
        const count = readSync(fd, jsonBytes, position, byteSize - position, position);
        assert.ok(count > 0, `${label} changed while being captured`);
        position += count;
      }
      assert.equal(sha256(jsonBytes), digest, `${label} changed after hashing`);
    }
    return { fd, path: resolved, sha256: digest, byte_size: byteSize, json_bytes: jsonBytes };
  } catch (error) {
    closeSync(fd);
    throw error;
  }
}

function closeFileSnapshot(snapshot) {
  if (!snapshot || snapshot.fd === undefined) return;
  closeSync(snapshot.fd);
  snapshot.fd = undefined;
  snapshot.json_bytes?.fill(0);
}

function closeFileSnapshots(snapshots) {
  for (const snapshot of Object.values(snapshots ?? {})) closeFileSnapshot(snapshot);
}

function assertSnapshotPathIdentity(snapshot, label) {
  const current = lstatSync(snapshot.path, { bigint: true });
  assert.equal(current.isSymbolicLink(), false, `${label} cannot be a symbolic link`);
  assert.equal(current.isFile(), true, `${label} must remain a regular file`);
  assert.equal(current.nlink, 1n, `${label} cannot become hard-linked`);
  assert.equal(realpathSync(snapshot.path), snapshot.path, `${label} cannot traverse a link`);
  assert.equal(sameFileIdentity(current, fstatSync(snapshot.fd, { bigint: true })), true, `${label} was replaced after validation`);
}

function writeAll(fd, bytes) {
  let offset = 0;
  while (offset < bytes.length) offset += writeSync(fd, bytes, offset, bytes.length - offset);
}

function copySnapshotToPath(snapshot, targetPath, label) {
  assertSnapshotPathIdentity(snapshot, label);
  const fd = openSync(targetPath, fsConstants.O_CREAT | fsConstants.O_EXCL | fsConstants.O_WRONLY, 0o600);
  const hash = createHash("sha256");
  let copied = 0;
  try {
    forEachDescriptorChunk(snapshot.fd, snapshot.byte_size, (chunk) => {
      writeAll(fd, chunk);
      hash.update(chunk);
      copied += chunk.length;
    });
  } finally {
    closeSync(fd);
  }
  assert.equal(copied, snapshot.byte_size, `${label} copied byte count differs`);
  assert.equal(hash.digest("hex"), snapshot.sha256, `${label} copied digest differs`);
  assertSnapshotPathIdentity(snapshot, label);
}

function writeBytesExclusive(targetPath, bytes, label) {
  let fd;
  let created = false;
  let snapshot;
  try {
    fd = openSync(
      targetPath,
      fsConstants.O_CREAT | fsConstants.O_EXCL | fsConstants.O_WRONLY | (fsConstants.O_NOFOLLOW ?? 0),
      0o600,
    );
    created = true;
    writeAll(fd, bytes);
    closeSync(fd);
    fd = undefined;
    snapshot = openRegularFileSnapshot(targetPath, label);
    assert.equal(snapshot.byte_size, bytes.length, `${label} byte count differs`);
    assert.equal(snapshot.sha256, sha256(bytes), `${label} digest differs`);
  } catch (error) {
    if (fd !== undefined) closeSync(fd);
    closeFileSnapshot(snapshot);
    if (created) rmSync(targetPath, { force: true });
    throw error;
  } finally {
    closeFileSnapshot(snapshot);
  }
}

function sbomProperties(sbom) {
  const entries = sbom?.metadata?.component?.properties;
  assert.ok(Array.isArray(entries), "installed-tree SBOM metadata properties are required");
  const result = Object.create(null);
  for (const entry of entries) {
    assert.equal(typeof entry?.name, "string", "installed-tree SBOM property name is invalid");
    assert.equal(typeof entry?.value, "string", "installed-tree SBOM property value is invalid");
    assert.equal(result[entry.name], undefined, `duplicate installed-tree SBOM property: ${entry.name}`);
    result[entry.name] = entry.value;
  }
  return result;
}

export function validateWindowsSignedArtifactHandoffBindings(value, { now = Date.now() } = {}) {
  assert.ok(value && typeof value === "object" && !Array.isArray(value), "handoff bindings must be an object");
  assert.deepEqual(Object.keys(value).sort(), [...HANDOFF_BINDING_KEYS].sort(), "handoff bindings must use the exact closed schema");
  assert.equal(value.account_id, WINDOWS_SIGNED_ARTIFACT_HANDOFF_ACCOUNT, "handoff AWS account is invalid");
  assert.equal(value.region, WINDOWS_SIGNED_ARTIFACT_HANDOFF_REGION, "handoff AWS region is invalid");
  assert.match(
    value.uploader_role_arn ?? "",
    /^arn:aws:iam::770880870480:role\/[A-Za-z0-9+=,.@_/-]{1,512}$/u,
    "handoff uploader role ARN is invalid",
  );
  assert.match(value.bucket ?? "", /^(?!.*\.\.)(?!.*\.-)(?!.*-\.)(?!\d+\.\d+\.\d+\.\d+$)[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/u, "handoff bucket is invalid");
  assert.match(
    value.kms_key_arn ?? "",
    /^arn:aws:kms:ap-northeast-2:770880870480:key\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u,
    "handoff KMS key ARN is invalid",
  );
  const retainUntil = canonicalUtc(value.retain_until, "handoff retain_until");
  const retentionMs = retainUntil.valueOf() - now;
  assert.ok(retentionMs >= MINIMUM_RETENTION_MS, "handoff retain_until must preserve at least 365 days");
  assert.ok(retentionMs <= MAXIMUM_RETENTION_MS, "handoff retain_until cannot exceed 10 years");
  return Object.freeze({ ...value });
}

export function parseWindowsSignedArtifactHandoffBindings(json, options) {
  assert.equal(typeof json, "string", "handoff_bindings_json must be a string");
  let parsed;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("handoff_bindings_json is not valid JSON");
  }
  return validateWindowsSignedArtifactHandoffBindings(parsed, options);
}

function validateCandidateIdentity({ sourceSha, sourceTree, candidateRole }) {
  assert.match(sourceSha ?? "", GIT_OBJECT_PATTERN, "handoff source SHA is invalid");
  assert.match(sourceTree ?? "", GIT_OBJECT_PATTERN, "handoff source tree is invalid");
  assert.equal(CANDIDATE_ROLES.has(candidateRole), true, "handoff candidate role must be baseline or target");
}

function inspectHandoffArtifacts({ paths, sourceSha, sourceTree, candidateRole }) {
  validateCandidateIdentity({ sourceSha, sourceTree, candidateRole });
  assert.deepEqual(Object.keys(paths).sort(), Object.keys(STAGED_ARTIFACTS).sort(), "handoff artifact path set is invalid");
  const files = {};
  try {
    for (const [kind, filePath] of Object.entries(paths)) {
      files[kind] = openRegularFileSnapshot(filePath, `Windows ${kind}`, { captureJson: kind !== "installer" });
    }
    const buildManifest = parseJsonBytes(files.build_manifest.json_bytes, "Windows build manifest");
    validateDesktopBuildManifest(buildManifest);
    assert.equal(buildManifest.source_sha, sourceSha, "Windows build manifest source SHA differs");
    assert.equal(buildManifest.source_tree, sourceTree, "Windows build manifest source tree differs");
    assert.equal(buildManifest.source_dirty, false, "Windows build manifest source is dirty");
    assert.equal(buildManifest.channel, "formal", "Windows build manifest channel must be formal");
    assert.equal(buildManifest.platform, "win32", "Windows build manifest platform is invalid");
    assert.equal(buildManifest.arch, "x64", "Windows build manifest architecture is invalid");
    assert.equal(buildManifest.app_id, "com.amic.matter.desktop", "Windows build manifest app identity is invalid");
    assert.equal(buildManifest.public_release_claim, false, "Windows build manifest cannot claim public release");
    assert.equal(buildManifest.production_go_live_claim, false, "Windows build manifest cannot claim production go-live");

    const qa = parseJsonBytes(files.native_package_qa.json_bytes, "Windows native package QA receipt");
    assert.equal(qa.schema_version, "law-firm-os.formal-windows-package-qa.v1");
    assert.equal(qa.verdict, "PASS", "Windows native package QA did not PASS");
    assert.equal(qa.native_verdict, "PASS", "Windows native scenarios did not PASS");
    assert.equal(qa.source?.revision, sourceSha, "Windows QA source SHA differs");
    assert.equal(qa.source?.source_tree, sourceTree, "Windows QA source tree differs");
    assert.equal(qa.source?.source_dirty, false, "Windows QA source is dirty");
    assert.equal(qa.package?.channel, "formal", "Windows QA channel is invalid");
    assert.equal(qa.package?.app_id, "com.amic.matter.desktop", "Windows QA app identity is invalid");
    assert.equal(qa.package?.installer?.sha256, files.installer.sha256, "Windows QA installer digest differs");
    assert.equal(qa.package?.installer?.path?.replaceAll("\\", "/").endsWith(`matter-${buildManifest.version}-win-x64.exe`), true, "Windows QA installer version differs");
    assert.equal(qa.authenticode?.valid, true, "Windows installer Authenticode did not PASS");
    assert.equal(qa.authenticode?.signer_code_signing_eku_verified, true, "Windows signer EKU did not PASS");
    assert.equal(qa.authenticode?.timestamp_eku_verified, true, "Windows timestamp EKU did not PASS");
    assert.equal(qa.sbom?.sha256, files.installed_tree_sbom.sha256, "Windows QA SBOM digest differs");
    assert.equal(qa.sbom?.installed_binary_complete, true, "Windows installed-tree SBOM is incomplete");
    assert.equal(qa.sbom?.reparse_point_count, 0, "Windows installed tree contains a reparse point");
    assert.equal(qa.sbom?.alternate_data_stream_count, 0, "Windows installed tree contains an alternate data stream");
    assert.equal(qa.sbom?.authenticode_bound, true, "Windows installed-tree SBOM is not Authenticode-bound");
    assert.equal(qa.sbom?.installed_file_content_complete, true, "Windows installed file content inventory is incomplete");
    assert.equal(qa.sbom?.installed_directory_identity_complete, true, "Windows installed directory identity inventory is incomplete");
    assert.match(qa.sbom?.installed_tree_sha256 ?? "", SHA256_PATTERN, "Windows installed-tree content digest is invalid");
    assert.ok(Number.isSafeInteger(qa.sbom?.installed_tree_file_count) && qa.sbom.installed_tree_file_count > 0, "Windows installed-tree file count is invalid");
    assert.ok(Number.isSafeInteger(qa.sbom?.installed_tree_bytes) && qa.sbom.installed_tree_bytes > 0, "Windows installed-tree byte count is invalid");
    assert.equal(qa.sbom?.native_snapshot_schema_version, "law-firm-os.windows-installed-tree-native-snapshot.v1");
    assert.equal(qa.sbom?.native_filesystem, "NTFS");
    assert.ok(Number.isSafeInteger(qa.sbom?.native_directory_count) && qa.sbom.native_directory_count > 0);
    assert.match(qa.sbom?.native_identity_sha256 ?? "", SHA256_PATTERN);
    assert.deepEqual(qa.sbom?.native_fixed_point_sequence, ["B0", "I1", "B1", "I2", "B2"]);
    assert.equal(qa.sbom?.native_fixed_point_exact, true);
    const nativeSnapshot = assertExactKeys(qa.sbom?.native_snapshot, [
      "schema_version",
      "filesystem",
      "content_sha256",
      "identity_sha256",
      "file_count",
      "directory_count",
      "bytes",
      "fixed_point_sequence",
      "fixed_point_exact",
      "equality_proof",
      "phases",
    ], "Windows QA native installed-tree snapshot");
    assert.equal(nativeSnapshot.schema_version, qa.sbom.native_snapshot_schema_version);
    assert.equal(nativeSnapshot.filesystem, qa.sbom.native_filesystem);
    assert.equal(nativeSnapshot.content_sha256, qa.sbom.installed_tree_sha256);
    assert.equal(nativeSnapshot.identity_sha256, qa.sbom.native_identity_sha256);
    assert.equal(nativeSnapshot.file_count, qa.sbom.installed_tree_file_count);
    assert.equal(nativeSnapshot.directory_count, qa.sbom.native_directory_count);
    assert.equal(nativeSnapshot.bytes, qa.sbom.installed_tree_bytes);
    assert.deepEqual(nativeSnapshot.fixed_point_sequence, ["B0", "I1", "B1", "I2", "B2"]);
    assert.equal(nativeSnapshot.fixed_point_exact, true);
    assert.equal(nativeSnapshot.equality_proof, "B0_I1_B1_I2_B2_PUBLIC_AND_PRIVATE_MANIFEST_EXACT_EQUALITY");
    assert.ok(Array.isArray(nativeSnapshot.phases) && nativeSnapshot.phases.length === 5, "Windows QA native installed-tree phases differ");
    for (const [index, phase] of nativeSnapshot.phases.entries()) {
      assertExactKeys(phase, ["name", "content_sha256", "identity_sha256", "file_count", "directory_count", "bytes"], `Windows QA native phase ${index}`);
      assert.equal(phase.name, nativeSnapshot.fixed_point_sequence[index]);
      assert.equal(phase.content_sha256, nativeSnapshot.content_sha256, `Windows QA native content changed at ${phase.name}`);
      assert.equal(phase.identity_sha256, nativeSnapshot.identity_sha256, `Windows QA native identity changed at ${phase.name}`);
      assert.equal(phase.file_count, nativeSnapshot.file_count, `Windows QA native file count changed at ${phase.name}`);
      assert.equal(phase.directory_count, nativeSnapshot.directory_count, `Windows QA native directory count changed at ${phase.name}`);
      assert.equal(phase.bytes, nativeSnapshot.bytes, `Windows QA native byte count changed at ${phase.name}`);
    }

    const sbom = parseJsonBytes(files.installed_tree_sbom.json_bytes, "Windows installed-tree SBOM");
    assert.equal(sbom.bomFormat, "CycloneDX");
    assert.equal(sbom.specVersion, "1.5");
    assert.equal(sbom.metadata?.component?.version, buildManifest.version, "Windows SBOM version differs");
    const properties = sbomProperties(sbom);
    assert.equal(properties["law-firm-os:schema-version"], "law-firm-os.matter-desktop-installed-tree-sbom.v1");
    assert.equal(properties["law-firm-os:source-sha"], sourceSha, "Windows SBOM source SHA differs");
    assert.equal(properties["law-firm-os:source-tree"], sourceTree, "Windows SBOM source tree differs");
    assert.equal(properties["law-firm-os:installer-sha256"], files.installer.sha256, "Windows SBOM installer digest differs");
    assert.equal(properties["law-firm-os:installed-file-content-complete"], "true");
    assert.equal(properties["law-firm-os:installed-directory-identity-complete"], "true");
    assert.equal(properties["law-firm-os:reparse-point-count"], "0");
    assert.equal(properties["law-firm-os:alternate-data-stream-count"], "0");
    assert.equal(properties["law-firm-os:authenticode-valid"], "true");
    assert.equal(properties["law-firm-os:native-snapshot-schema-version"], "law-firm-os.windows-installed-tree-native-snapshot.v1");
    assert.equal(properties["law-firm-os:native-filesystem"], "NTFS");
    assert.match(properties["law-firm-os:native-directory-count"] ?? "", /^[1-9][0-9]*$/u);
    assert.match(properties["law-firm-os:native-identity-sha256"] ?? "", SHA256_PATTERN);
    assert.equal(properties["law-firm-os:native-fixed-point-sequence"], "B0->I1->B1->I2->B2");
    assert.equal(properties["law-firm-os:native-fixed-point-exact"], "true");
    return { version: buildManifest.version, files };
  } catch (error) {
    closeFileSnapshots(files);
    throw error;
  }
}

export function stageWindowsSignedArtifactHandoff({
  paths,
  stagingDir,
  sourceSha,
  sourceTree,
  candidateRole,
}) {
  const inspected = inspectHandoffArtifacts({ paths, sourceSha, sourceTree, candidateRole });
  const target = path.resolve(stagingDir);
  let targetCreated = false;
  try {
    mkdirSync(target, { recursive: false, mode: 0o700 });
    targetCreated = true;
    assert.equal(realpathSync(target), target, "handoff staging directory cannot traverse a link");
    const stagedPaths = {};
    for (const [kind, definition] of Object.entries(STAGED_ARTIFACTS)) {
      const stagedPath = path.join(target, definition.file);
      copySnapshotToPath(inspected.files[kind], stagedPath, `staged Windows ${kind}`);
      stagedPaths[kind] = stagedPath;
    }
    const staged = inspectHandoffArtifacts({ paths: stagedPaths, sourceSha, sourceTree, candidateRole });
    closeFileSnapshots(staged.files);
    return Object.freeze({
      staging_dir: target,
      candidate_role: candidateRole,
      source_sha: sourceSha,
      source_tree: sourceTree,
      version: inspected.version,
      artifact_count: Object.keys(STAGED_ARTIFACTS).length,
    });
  } catch (error) {
    if (targetCreated) rmSync(target, { recursive: true, force: true });
    throw error;
  } finally {
    closeFileSnapshots(inspected.files);
  }
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function decodeBase64(value, label) {
  assert.match(value ?? "", /^[A-Za-z0-9+/]+={0,2}$/u, `${label} must be canonical base64`);
  const decoded = Buffer.from(value, "base64");
  assert.equal(decoded.toString("base64"), value, `${label} must be canonical base64`);
  return decoded;
}

function encryptedBridgeAad({ sourceSha, sourceTree, candidateRole, version, kind, plaintextSha256, plaintextBytes }) {
  return Buffer.from(canonicalJson({
    schema_version: WINDOWS_SIGNED_ARTIFACT_ENCRYPTED_BRIDGE_SCHEMA,
    source_sha: sourceSha,
    source_tree: sourceTree,
    candidate_role: candidateRole,
    version,
    artifact_kind: kind,
    plaintext_sha256: plaintextSha256,
    plaintext_bytes: plaintextBytes,
  }), "utf8");
}

function validateWrappingKey({ wrappingPublicKeySpkiBase64, wrappingPublicKeySha256 }) {
  const spki = decodeBase64(wrappingPublicKeySpkiBase64, "handoff wrapping public key");
  assert.match(wrappingPublicKeySha256 ?? "", SHA256_PATTERN, "handoff wrapping public key SHA-256 is invalid");
  assert.equal(sha256(spki), wrappingPublicKeySha256, "handoff wrapping public key digest differs");
  const publicKey = createPublicKey({ key: spki, format: "der", type: "spki" });
  assert.equal(publicKey.type, "public", "handoff wrapping key must be public");
  assert.equal(publicKey.asymmetricKeyType, "rsa", "handoff wrapping key must be RSA");
  assert.equal(publicKey.asymmetricKeyDetails?.modulusLength, 4096, "handoff wrapping key must be RSA-4096");
  return publicKey;
}

function encryptSnapshotToPath({ snapshot, targetPath, dataKey, nonce, aad, label }) {
  assertSnapshotPathIdentity(snapshot, label);
  const cipher = createCipheriv("aes-256-gcm", dataKey, nonce, { authTagLength: 16 });
  cipher.setAAD(aad, { plaintextLength: snapshot.byte_size });
  const plaintextHash = createHash("sha256");
  const ciphertextHash = createHash("sha256");
  const targetFd = openSync(targetPath, fsConstants.O_CREAT | fsConstants.O_EXCL | fsConstants.O_WRONLY, 0o600);
  let plaintextBytes = 0;
  let ciphertextBytes = 0;
  try {
    forEachDescriptorChunk(snapshot.fd, snapshot.byte_size, (chunk) => {
      plaintextHash.update(chunk);
      plaintextBytes += chunk.length;
      const encrypted = cipher.update(chunk);
      try {
        writeAll(targetFd, encrypted);
        ciphertextHash.update(encrypted);
        ciphertextBytes += encrypted.length;
      } finally {
        encrypted.fill(0);
      }
    });
    const final = cipher.final();
    try {
      writeAll(targetFd, final);
      ciphertextHash.update(final);
      ciphertextBytes += final.length;
    } finally {
      final.fill(0);
    }
  } finally {
    closeSync(targetFd);
  }
  assert.equal(plaintextBytes, snapshot.byte_size, `${label} plaintext byte count differs`);
  assert.equal(plaintextHash.digest("hex"), snapshot.sha256, `${label} plaintext digest changed`);
  assert.equal(ciphertextBytes, snapshot.byte_size, `${label} ciphertext byte count differs`);
  assertSnapshotPathIdentity(snapshot, label);
  return Object.freeze({
    ciphertext_sha256: ciphertextHash.digest("hex"),
    ciphertext_bytes: ciphertextBytes,
    auth_tag: cipher.getAuthTag(),
  });
}

export function createWindowsSignedArtifactEncryptedBridge({
  paths,
  outputDir,
  sourceSha,
  sourceTree,
  candidateRole,
  wrappingKeyArn,
  wrappingPublicKeySpkiBase64,
  wrappingPublicKeySha256,
  randomBytesFn = randomBytes,
  publicEncryptFn = publicEncrypt,
  generatedAt = new Date().toISOString(),
}) {
  assert.match(
    wrappingKeyArn ?? "",
    /^arn:aws:kms:ap-northeast-2:770880870480:key\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u,
    "handoff wrapping key ARN is invalid",
  );
  canonicalUtc(generatedAt, "encrypted bridge generated_at");
  const publicKey = validateWrappingKey({ wrappingPublicKeySpkiBase64, wrappingPublicKeySha256 });
  const target = path.resolve(outputDir);
  let targetCreated = false;
  let dataKey;
  let inspected;
  try {
    inspected = inspectHandoffArtifacts({ paths, sourceSha, sourceTree, candidateRole });
    mkdirSync(target, { recursive: false, mode: 0o700 });
    targetCreated = true;
    assert.equal(realpathSync(target), target, "encrypted bridge directory cannot traverse a link");
    dataKey = randomBytesFn(32);
    assert.ok(Buffer.isBuffer(dataKey) && dataKey.length === 32, "encrypted bridge data key must contain 32 random bytes");
    const wrappedKey = publicEncryptFn({
      key: publicKey,
      padding: cryptoConstants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    }, dataKey);
    assert.ok(Buffer.isBuffer(wrappedKey) && wrappedKey.length === 512, "encrypted bridge wrapped data key must contain 512 bytes");
    const artifacts = {};
    for (const [kind, encryptedName] of Object.entries(ENCRYPTED_BRIDGE_FILE_NAMES)) {
      const file = inspected.files[kind];
      const nonce = randomBytesFn(12);
      assert.ok(Buffer.isBuffer(nonce) && nonce.length === 12, "AES-GCM nonce must contain 12 random bytes");
      const aad = encryptedBridgeAad({
        sourceSha,
        sourceTree,
        candidateRole,
        version: inspected.version,
        kind,
        plaintextSha256: file.sha256,
        plaintextBytes: file.byte_size,
      });
      const encryptedPath = path.join(target, encryptedName);
      const encrypted = encryptSnapshotToPath({
        snapshot: file,
        targetPath: encryptedPath,
        dataKey,
        nonce,
        aad,
        label: `Windows ${kind}`,
      });
      artifacts[kind] = {
        ciphertext_file: encryptedName,
        ciphertext_sha256: encrypted.ciphertext_sha256,
        ciphertext_bytes: encrypted.ciphertext_bytes,
        plaintext_sha256: file.sha256,
        plaintext_bytes: file.byte_size,
        nonce_base64: nonce.toString("base64"),
        auth_tag_base64: encrypted.auth_tag.toString("base64"),
        aad_sha256: sha256(aad),
      };
      encrypted.auth_tag.fill(0);
    }
    const envelope = {
      schema_version: WINDOWS_SIGNED_ARTIFACT_ENCRYPTED_BRIDGE_SCHEMA,
      generated_at: generatedAt,
      source_sha: sourceSha,
      source_tree: sourceTree,
      candidate_role: candidateRole,
      version: inspected.version,
      encryption: {
        content_cipher: "AES-256-GCM",
        data_key_bytes: 32,
        nonce_bytes: 12,
        authentication_tag_bytes: 16,
        key_wrap: "RSAES_OAEP_SHA_256",
        oaep_label: "empty",
        wrapping_key_arn: wrappingKeyArn,
        wrapping_public_key_sha256: wrappingPublicKeySha256,
        wrapped_data_key_base64: wrappedKey.toString("base64"),
        wrapped_data_key_sha256: sha256(wrappedKey),
      },
      artifacts,
      boundary: {
        plaintext_uploaded_to_github: false,
        credentials_included: false,
        secrets_included: false,
        public_distribution: false,
        production_go_live: false,
      },
    };
    validateEncryptedBridgeEnvelope({
      envelope,
      sourceSha,
      sourceTree,
      candidateRole,
      wrappingKeyArn,
      wrappingPublicKeySha256,
    });
    const envelopeBody = `${JSON.stringify(envelope, null, 2)}\n`;
    writeFileSync(path.join(target, "envelope.json"), envelopeBody, { mode: 0o600 });
    verifyWindowsSignedArtifactEncryptedBridge({
      encryptedDir: target,
      sourceSha,
      sourceTree,
      candidateRole,
      wrappingKeyArn,
      wrappingPublicKeySha256,
      expectedEnvelopeSha256: sha256(Buffer.from(envelopeBody)),
    });
    return Object.freeze({
      envelope: deepFreeze(envelope),
      envelope_sha256: sha256(Buffer.from(envelopeBody)),
      output_dir: target,
    });
  } catch (error) {
    if (targetCreated) rmSync(target, { recursive: true, force: true });
    throw error;
  } finally {
    if (Buffer.isBuffer(dataKey)) dataKey.fill(0);
    closeFileSnapshots(inspected?.files);
  }
}

function validateEncryptedBridgeEnvelope({ envelope, sourceSha, sourceTree, candidateRole, wrappingKeyArn, wrappingPublicKeySha256 }) {
  assertExactKeys(envelope, [
    "schema_version", "generated_at", "source_sha", "source_tree", "candidate_role", "version", "encryption", "artifacts", "boundary",
  ], "encrypted bridge envelope");
  assert.equal(envelope?.schema_version, WINDOWS_SIGNED_ARTIFACT_ENCRYPTED_BRIDGE_SCHEMA);
  canonicalUtc(envelope.generated_at, "encrypted bridge generated_at");
  assert.equal(envelope?.source_sha, sourceSha, "encrypted bridge source SHA differs");
  assert.equal(envelope?.source_tree, sourceTree, "encrypted bridge source tree differs");
  assert.equal(envelope?.candidate_role, candidateRole, "encrypted bridge candidate role differs");
  assert.match(envelope?.version ?? "", VERSION_PATTERN, "encrypted bridge version is invalid");
  assert.equal(envelope?.encryption?.content_cipher, "AES-256-GCM");
  assert.equal(envelope?.encryption?.data_key_bytes, 32);
  assert.equal(envelope?.encryption?.nonce_bytes, 12);
  assert.equal(envelope?.encryption?.authentication_tag_bytes, 16);
  assert.equal(envelope?.encryption?.key_wrap, "RSAES_OAEP_SHA_256");
  assertExactKeys(envelope.encryption, [
    "content_cipher",
    "data_key_bytes",
    "nonce_bytes",
    "authentication_tag_bytes",
    "key_wrap",
    "oaep_label",
    "wrapping_key_arn",
    "wrapping_public_key_sha256",
    "wrapped_data_key_base64",
    "wrapped_data_key_sha256",
  ], "encrypted bridge encryption");
  assert.equal(envelope.encryption.oaep_label, "empty");
  assert.equal(envelope?.encryption?.wrapping_key_arn, wrappingKeyArn, "encrypted bridge wrapping key ARN differs");
  assert.equal(envelope?.encryption?.wrapping_public_key_sha256, wrappingPublicKeySha256, "encrypted bridge wrapping key digest differs");
  assert.equal(envelope?.boundary?.plaintext_uploaded_to_github, false);
  assert.equal(envelope?.boundary?.credentials_included, false);
  assert.equal(envelope?.boundary?.secrets_included, false);
  assert.equal(envelope?.boundary?.public_distribution, false);
  assert.equal(envelope?.boundary?.production_go_live, false);
  assert.deepEqual(Object.keys(envelope?.artifacts ?? {}).sort(), Object.keys(STAGED_ARTIFACTS).sort());
  assertExactKeys(envelope.boundary, [
    "plaintext_uploaded_to_github", "credentials_included", "secrets_included", "public_distribution", "production_go_live",
  ], "encrypted bridge boundary");
  const nonces = new Set();
  for (const [kind, record] of Object.entries(envelope.artifacts)) {
    assertExactKeys(record, [
      "ciphertext_file",
      "ciphertext_sha256",
      "ciphertext_bytes",
      "plaintext_sha256",
      "plaintext_bytes",
      "nonce_base64",
      "auth_tag_base64",
      "aad_sha256",
    ], `encrypted bridge ${kind}`);
    assert.equal(record.ciphertext_file, ENCRYPTED_BRIDGE_FILE_NAMES[kind]);
    assert.match(record.ciphertext_sha256 ?? "", SHA256_PATTERN);
    assert.match(record.plaintext_sha256 ?? "", SHA256_PATTERN);
    assert.match(record.aad_sha256 ?? "", SHA256_PATTERN);
    assert.ok(Number.isSafeInteger(record.ciphertext_bytes) && record.ciphertext_bytes > 0);
    assert.ok(Number.isSafeInteger(record.plaintext_bytes) && record.plaintext_bytes > 0);
    assert.equal(record.ciphertext_bytes, record.plaintext_bytes, `encrypted bridge ${kind} ciphertext length differs`);
    const nonce = decodeBase64(record.nonce_base64, `encrypted bridge ${kind} nonce`);
    assert.equal(nonce.length, 12);
    assert.equal(nonces.has(record.nonce_base64), false, "encrypted bridge AES-GCM nonce reuse is forbidden");
    nonces.add(record.nonce_base64);
    assert.equal(decodeBase64(record.auth_tag_base64, `encrypted bridge ${kind} authentication tag`).length, 16);
  }
  return envelope;
}

function inspectWindowsSignedArtifactEncryptedBridge({
  encryptedDir,
  sourceSha,
  sourceTree,
  candidateRole,
  wrappingKeyArn,
  wrappingPublicKeySha256,
  expectedEnvelopeSha256,
}) {
  validateCandidateIdentity({ sourceSha, sourceTree, candidateRole });
  const encryptedRoot = path.resolve(encryptedDir);
  assert.equal(realpathSync(encryptedRoot), encryptedRoot, "encrypted bridge directory cannot traverse a link");
  assert.deepEqual(
    readdirSync(encryptedRoot).sort(),
    ["envelope.json", ...Object.values(ENCRYPTED_BRIDGE_FILE_NAMES)].sort(),
    "encrypted bridge must contain only its closed ciphertext file set",
  );
  const snapshots = {};
  try {
    snapshots.envelope = openRegularFileSnapshot(
      path.join(encryptedRoot, "envelope.json"),
      "encrypted bridge envelope",
      { captureJson: true },
    );
    assert.match(expectedEnvelopeSha256 ?? "", SHA256_PATTERN, "expected encrypted bridge envelope digest is invalid");
    assert.equal(snapshots.envelope.sha256, expectedEnvelopeSha256, "encrypted bridge envelope digest differs");
    const envelope = validateEncryptedBridgeEnvelope({
      envelope: parseJsonBytes(snapshots.envelope.json_bytes, "encrypted bridge envelope"),
      sourceSha,
      sourceTree,
      candidateRole,
      wrappingKeyArn,
      wrappingPublicKeySha256,
    });
    for (const [kind, record] of Object.entries(envelope.artifacts)) {
      snapshots[kind] = openRegularFileSnapshot(
        path.join(encryptedRoot, record.ciphertext_file),
        `encrypted bridge ${kind} ciphertext`,
      );
      assert.equal(snapshots[kind].sha256, record.ciphertext_sha256, `encrypted bridge ${kind} ciphertext digest differs`);
      assert.equal(snapshots[kind].byte_size, record.ciphertext_bytes, `encrypted bridge ${kind} ciphertext bytes differ`);
    }
    return { encryptedRoot, envelope, snapshots };
  } catch (error) {
    closeFileSnapshots(snapshots);
    throw error;
  }
}

export function verifyWindowsSignedArtifactEncryptedBridge(options) {
  const inspected = inspectWindowsSignedArtifactEncryptedBridge(options);
  try {
    return deepFreeze(inspected.envelope);
  } finally {
    closeFileSnapshots(inspected.snapshots);
  }
}

function decryptSnapshot({ snapshot, dataKey, nonce, tag, aad, expectedSha256, expectedBytes, targetPath, label }) {
  assertSnapshotPathIdentity(snapshot, label);
  const decipher = createDecipheriv("aes-256-gcm", dataKey, nonce, { authTagLength: 16 });
  decipher.setAAD(aad, { plaintextLength: expectedBytes });
  decipher.setAuthTag(tag);
  const plaintextHash = createHash("sha256");
  const ciphertextHash = createHash("sha256");
  const targetFd = targetPath === undefined
    ? undefined
    : openSync(targetPath, fsConstants.O_CREAT | fsConstants.O_EXCL | fsConstants.O_WRONLY, 0o600);
  let plaintextBytes = 0;
  try {
    forEachDescriptorChunk(snapshot.fd, snapshot.byte_size, (chunk) => {
      ciphertextHash.update(chunk);
      const plaintext = decipher.update(chunk);
      try {
        plaintextHash.update(plaintext);
        plaintextBytes += plaintext.length;
        if (targetFd !== undefined) writeAll(targetFd, plaintext);
      } finally {
        plaintext.fill(0);
      }
    });
    const final = decipher.final();
    try {
      plaintextHash.update(final);
      plaintextBytes += final.length;
      if (targetFd !== undefined) writeAll(targetFd, final);
    } finally {
      final.fill(0);
    }
  } finally {
    if (targetFd !== undefined) closeSync(targetFd);
  }
  assert.equal(ciphertextHash.digest("hex"), snapshot.sha256, `${label} ciphertext changed`);
  assert.equal(plaintextBytes, expectedBytes, `${label} plaintext byte count differs`);
  assert.equal(plaintextHash.digest("hex"), expectedSha256, `${label} plaintext digest differs`);
  assertSnapshotPathIdentity(snapshot, label);
}

export async function decryptWindowsSignedArtifactEncryptedBridge({
  encryptedDir,
  outputDir,
  sourceSha,
  sourceTree,
  candidateRole,
  wrappingKeyArn,
  wrappingPublicKeySha256,
  expectedEnvelopeSha256,
  inspectWrappingKey,
  decryptDataKey,
}) {
  assert.equal(typeof decryptDataKey, "function", "KMS data-key decrypt adapter is required");
  assert.equal(typeof inspectWrappingKey, "function", "KMS wrapping-key inspection adapter is required");
  const inspected = inspectWindowsSignedArtifactEncryptedBridge({
    encryptedDir,
    sourceSha,
    sourceTree,
    candidateRole,
    wrappingKeyArn,
    wrappingPublicKeySha256,
    expectedEnvelopeSha256,
  });
  const { envelope } = inspected;
  let wrappedKey;
  let dataKey;
  const target = path.resolve(outputDir);
  let targetCreated = false;
  try {
    wrappedKey = decodeBase64(envelope.encryption.wrapped_data_key_base64, "wrapped data key");
    assert.equal(sha256(wrappedKey), envelope.encryption.wrapped_data_key_sha256, "wrapped data key digest differs");
    assert.equal(wrappedKey.length, 512, "RSA-4096 wrapped data key length differs");
    const wrappingKey = await inspectWrappingKey({ keyArn: wrappingKeyArn });
    assert.equal(wrappingKey?.Arn, wrappingKeyArn, "KMS wrapping key ARN differs");
    assert.equal(wrappingKey?.Enabled, true, "KMS wrapping key is disabled");
    assert.equal(wrappingKey?.KeyState, "Enabled", "KMS wrapping key state is invalid");
    assert.equal(wrappingKey?.KeyUsage, "ENCRYPT_DECRYPT", "KMS wrapping key usage is invalid");
    assert.equal(wrappingKey?.KeySpec, "RSA_4096", "KMS wrapping key spec is invalid");
    assert.ok(wrappingKey?.EncryptionAlgorithms?.includes("RSAES_OAEP_SHA_256"), "KMS wrapping key does not allow RSAES_OAEP_SHA_256");
    dataKey = await decryptDataKey({
      ciphertext: wrappedKey,
      keyArn: wrappingKeyArn,
      encryptionAlgorithm: "RSAES_OAEP_SHA_256",
    });
    if (!Buffer.isBuffer(dataKey) || dataKey.length !== 32) {
      if (Buffer.isBuffer(dataKey)) dataKey.fill(0);
      throw new TypeError("KMS decrypted data key must contain 32 bytes");
    }
    mkdirSync(target, { recursive: false, mode: 0o700 });
    targetCreated = true;
    assert.equal(realpathSync(target), target, "decrypted handoff directory cannot traverse a link");
    const decryptInputs = {};
    for (const [kind, definition] of Object.entries(STAGED_ARTIFACTS)) {
      const record = envelope.artifacts[kind];
      assert.equal(record?.ciphertext_file, ENCRYPTED_BRIDGE_FILE_NAMES[kind], `encrypted bridge ${kind} filename differs`);
      assert.match(record?.ciphertext_sha256 ?? "", SHA256_PATTERN, `encrypted bridge ${kind} ciphertext digest is invalid`);
      assert.match(record?.plaintext_sha256 ?? "", SHA256_PATTERN, `encrypted bridge ${kind} plaintext digest is invalid`);
      assert.ok(Number.isSafeInteger(record?.plaintext_bytes) && record.plaintext_bytes > 0, `encrypted bridge ${kind} plaintext bytes are invalid`);
      const nonce = decodeBase64(record.nonce_base64, `encrypted bridge ${kind} nonce`);
      const tag = decodeBase64(record.auth_tag_base64, `encrypted bridge ${kind} authentication tag`);
      assert.equal(nonce.length, 12, `encrypted bridge ${kind} nonce length differs`);
      assert.equal(tag.length, 16, `encrypted bridge ${kind} authentication tag length differs`);
      const aad = encryptedBridgeAad({
        sourceSha,
        sourceTree,
        candidateRole,
        version: envelope.version,
        kind,
        plaintextSha256: record.plaintext_sha256,
        plaintextBytes: record.plaintext_bytes,
      });
      assert.equal(sha256(aad), record.aad_sha256, `encrypted bridge ${kind} AAD differs`);
      decryptInputs[kind] = { definition, record, nonce, tag, aad, snapshot: inspected.snapshots[kind] };
      decryptSnapshot({
        snapshot: inspected.snapshots[kind],
        dataKey,
        nonce,
        tag,
        aad,
        expectedSha256: record.plaintext_sha256,
        expectedBytes: record.plaintext_bytes,
        targetPath: undefined,
        label: `encrypted bridge ${kind}`,
      });
    }
    for (const [kind, input] of Object.entries(decryptInputs)) {
      const partialPath = path.join(target, `.${kind}.partial`);
      decryptSnapshot({
        snapshot: input.snapshot,
        dataKey,
        nonce: input.nonce,
        tag: input.tag,
        aad: input.aad,
        expectedSha256: input.record.plaintext_sha256,
        expectedBytes: input.record.plaintext_bytes,
        targetPath: partialPath,
        label: `encrypted bridge ${kind}`,
      });
      renameSync(partialPath, path.join(target, input.definition.file));
    }
    const decrypted = inspectHandoffArtifacts({
      paths: Object.fromEntries(Object.entries(STAGED_ARTIFACTS).map(([kind, definition]) => [kind, path.join(target, definition.file)])),
      sourceSha,
      sourceTree,
      candidateRole,
    });
    closeFileSnapshots(decrypted.files);
    return Object.freeze({
      decrypted_dir: target,
      source_sha: sourceSha,
      source_tree: sourceTree,
      candidate_role: candidateRole,
      version: envelope.version,
      artifact_count: Object.keys(STAGED_ARTIFACTS).length,
    });
  } catch (error) {
    if (targetCreated) rmSync(target, { recursive: true, force: true });
    throw error;
  } finally {
    if (Buffer.isBuffer(dataKey)) dataKey.fill(0);
    if (Buffer.isBuffer(wrappedKey)) wrappedKey.fill(0);
    closeFileSnapshots(inspected.snapshots);
  }
}

function roleSessionPattern(roleArn) {
  const rolePath = roleArn.slice(`arn:aws:iam::${WINDOWS_SIGNED_ARTIFACT_HANDOFF_ACCOUNT}:role/`.length);
  const roleName = rolePath.split("/").at(-1);
  const escapedRoleName = roleName.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  return new RegExp(`^arn:aws:sts::${WINDOWS_SIGNED_ARTIFACT_HANDOFF_ACCOUNT}:assumed-role/${escapedRoleName}/[^/]+$`, "u");
}

function assertProviderGovernance({ bindings, identity, kms, location, versioning, publicAccess, objectLock, encryption, ownership }) {
  assert.equal(identity?.Account, bindings.account_id, "handoff AWS account differs");
  assert.match(identity?.Arn ?? "", roleSessionPattern(bindings.uploader_role_arn), "handoff AWS role session differs");
  assert.equal(kms?.KeyMetadata?.Arn, bindings.kms_key_arn, "handoff KMS ARN differs");
  assert.equal(kms?.KeyMetadata?.Enabled, true, "handoff KMS key is disabled");
  assert.equal(kms?.KeyMetadata?.KeyState, "Enabled", "handoff KMS key state is invalid");
  assert.equal(kms?.KeyMetadata?.KeyUsage, "ENCRYPT_DECRYPT", "handoff KMS key usage is invalid");
  assert.equal(kms?.KeyMetadata?.KeySpec, "SYMMETRIC_DEFAULT", "handoff KMS key spec is invalid");
  assert.equal(location?.LocationConstraint, bindings.region, "handoff bucket region differs");
  assert.equal(versioning?.Status, "Enabled", "handoff bucket versioning is disabled");
  const blocked = publicAccess?.PublicAccessBlockConfiguration ?? {};
  assert.deepEqual(
    Object.fromEntries(["BlockPublicAcls", "IgnorePublicAcls", "BlockPublicPolicy", "RestrictPublicBuckets"].map((key) => [key, blocked[key]])),
    { BlockPublicAcls: true, IgnorePublicAcls: true, BlockPublicPolicy: true, RestrictPublicBuckets: true },
    "handoff bucket public access block is incomplete",
  );
  assert.equal(objectLock?.ObjectLockConfiguration?.ObjectLockEnabled, "Enabled", "handoff bucket Object Lock is disabled");
  assert.deepEqual(
    objectLock?.ObjectLockConfiguration?.Rule?.DefaultRetention,
    { Mode: "COMPLIANCE", Days: 365 },
    "handoff bucket default Object Lock retention differs",
  );
  const encryptionRules = encryption?.ServerSideEncryptionConfiguration?.Rules ?? [];
  assert.ok(encryptionRules.some(({ ApplyServerSideEncryptionByDefault: rule }) => (
    rule?.SSEAlgorithm === "aws:kms" && rule?.KMSMasterKeyID === bindings.kms_key_arn
  )), "handoff bucket default KMS encryption differs");
  assert.deepEqual(ownership?.OwnershipControls?.Rules, [{ ObjectOwnership: "BucketOwnerEnforced" }], "handoff bucket ownership is not enforced");
}

function contentAddressedKey({ sourceSha, version, candidateRole, kind, digest, fileName }) {
  return `windows/signed/v1/${sourceSha}/${version}/${candidateRole}/${kind}/sha256/${digest}/${fileName}`;
}

function validateProviderReference(value, label) {
  assert.equal(typeof value, "string", `${label} must be a string`);
  assert.ok(value.length >= 1 && value.length <= 1024 && !/[\0\r\n]/u.test(value), `${label} is invalid`);
  return value;
}

function validateReceiptReadback({
  record,
  digest,
  bytes,
  versionId,
  kmsKeyArn,
  retainUntil,
  label,
  get,
}) {
  const checksum = Buffer.from(digest, "hex").toString("base64");
  if (get) {
    assertExactKeys(record, [
      "status",
      "version_id",
      "content_length",
      "sha256",
      "provider_checksum_sha256",
      "digest_verified",
      "server_side_encryption",
      "kms_key_arn",
      "object_lock_mode",
      "retain_until",
    ], `${label} GET readback`);
    assert.equal(record.sha256, digest, `${label} GET digest differs`);
    assert.equal(record.digest_verified, true, `${label} GET digest was not verified`);
  } else {
    assertExactKeys(record, [
      "status",
      "version_id",
      "content_length",
      "artifact_sha256_metadata",
      "server_side_encryption",
      "kms_key_arn",
      "provider_checksum_sha256",
      "object_lock_mode",
      "retain_until",
    ], `${label} HEAD readback`);
    assert.equal(record.artifact_sha256_metadata, digest, `${label} HEAD digest metadata differs`);
  }
  assert.equal(record.status, "PASS", `${label} readback did not PASS`);
  assert.equal(record.version_id, versionId, `${label} readback VersionId differs`);
  assert.equal(record.content_length, bytes, `${label} readback byte count differs`);
  assert.equal(record.provider_checksum_sha256, checksum, `${label} provider checksum differs`);
  assert.equal(record.server_side_encryption, "aws:kms", `${label} readback encryption differs`);
  assert.equal(record.kms_key_arn, kmsKeyArn, `${label} readback KMS key differs`);
  assert.equal(record.object_lock_mode, "COMPLIANCE", `${label} readback Object Lock mode differs`);
  assert.equal(record.retain_until, retainUntil, `${label} readback retention differs`);
}

function validateReceiptArtifact({ record, kind, sourceSha, sourceTree, version, candidateRole, kmsKeyArn, retainUntil }) {
  assertExactKeys(record, ["sha256", "bytes", "key", "version_id", "upload", "head_readback", "get_readback"], `private handoff ${kind}`);
  assert.match(record.sha256 ?? "", SHA256_PATTERN, `private handoff ${kind} digest is invalid`);
  assert.ok(Number.isSafeInteger(record.bytes) && record.bytes > 0, `private handoff ${kind} byte count is invalid`);
  validateProviderReference(record.version_id, `private handoff ${kind} VersionId`);
  assert.equal(record.key, contentAddressedKey({
    sourceSha,
    version,
    candidateRole,
    kind,
    digest: record.sha256,
    fileName: STAGED_ARTIFACTS[kind].file,
  }), `private handoff ${kind} key is not content-addressed`);
  assertExactKeys(record.upload, ["status", "artifact_sha256", "bytes", "digest_verified", "provider_checksum_sha256"], `private handoff ${kind} upload`);
  assert.equal(record.upload.status, "PASS", `private handoff ${kind} upload did not PASS`);
  assert.equal(record.upload.artifact_sha256, record.sha256, `private handoff ${kind} upload digest differs`);
  assert.equal(record.upload.bytes, record.bytes, `private handoff ${kind} upload bytes differ`);
  assert.equal(record.upload.digest_verified, true, `private handoff ${kind} upload digest was not verified`);
  assert.equal(record.upload.provider_checksum_sha256, Buffer.from(record.sha256, "hex").toString("base64"), `private handoff ${kind} upload checksum differs`);
  validateReceiptReadback({
    record: record.head_readback,
    digest: record.sha256,
    bytes: record.bytes,
    versionId: record.version_id,
    kmsKeyArn,
    retainUntil,
    label: `private handoff ${kind}`,
    get: false,
  });
  validateReceiptReadback({
    record: record.get_readback,
    digest: record.sha256,
    bytes: record.bytes,
    versionId: record.version_id,
    kmsKeyArn,
    retainUntil,
    label: `private handoff ${kind}`,
    get: true,
  });
  return record;
}

export function validateWindowsSignedArtifactPrivateHandoffReceipt(receipt, { now = Date.now() } = {}) {
  assertExactKeys(receipt, [
    "schema_version",
    "generated_at",
    "verdict",
    "candidate_role",
    "source_sha",
    "source_tree",
    "version",
    "installer_sha256",
    "installer_bytes",
    "installed_tree_sbom_sha256",
    "native_package_qa_sha256",
    "build_manifest_sha256",
    "artifacts",
    "storage",
    "claim_policy",
  ], "Windows private handoff receipt");
  assert.equal(receipt.schema_version, WINDOWS_SIGNED_ARTIFACT_PRIVATE_HANDOFF_SCHEMA);
  assert.equal(receipt.verdict, "PASS", "Windows private handoff did not PASS");
  validateCandidateIdentity({
    sourceSha: receipt.source_sha,
    sourceTree: receipt.source_tree,
    candidateRole: receipt.candidate_role,
  });
  assert.match(receipt.version ?? "", VERSION_PATTERN, "Windows private handoff version is invalid");
  const generatedAt = canonicalUtc(receipt.generated_at, "Windows private handoff generated_at");
  assert.ok(generatedAt.valueOf() <= now + 5 * 60 * 1_000, "Windows private handoff generated_at is in the future");
  assertExactKeys(receipt.storage, [
    "provider",
    "account_id",
    "region",
    "bucket",
    "key",
    "version_id",
    "versioning_enabled",
    "ownership",
    "encryption",
    "immutability",
    "upload",
    "head_readback",
    "get_readback",
  ], "Windows private handoff storage");
  assert.equal(receipt.storage.provider, "aws_s3");
  assert.equal(receipt.storage.account_id, WINDOWS_SIGNED_ARTIFACT_HANDOFF_ACCOUNT);
  assert.equal(receipt.storage.region, WINDOWS_SIGNED_ARTIFACT_HANDOFF_REGION);
  assert.match(receipt.storage.bucket ?? "", /^(?!.*\.\.)(?!.*\.-)(?!.*-\.)(?!\d+\.\d+\.\d+\.\d+$)[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/u);
  assert.equal(receipt.storage.versioning_enabled, true);
  assert.equal(receipt.storage.ownership, "BucketOwnerEnforced");
  assertExactKeys(receipt.storage.encryption, ["mode", "kms_key_arn"], "Windows private handoff encryption");
  assert.equal(receipt.storage.encryption.mode, "aws:kms");
  assert.match(
    receipt.storage.encryption.kms_key_arn ?? "",
    /^arn:aws:kms:ap-northeast-2:770880870480:key\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u,
  );
  assertExactKeys(receipt.storage.immutability, ["object_lock_mode", "retain_until"], "Windows private handoff immutability");
  assert.equal(receipt.storage.immutability.object_lock_mode, "COMPLIANCE");
  const retainUntil = canonicalUtc(receipt.storage.immutability.retain_until, "Windows private handoff retain_until");
  const retentionFromGeneration = retainUntil.valueOf() - generatedAt.valueOf();
  assert.ok(retentionFromGeneration >= MINIMUM_RETENTION_MS, "Windows private handoff retention is shorter than 365 days");
  assert.ok(retentionFromGeneration <= MAXIMUM_RETENTION_MS, "Windows private handoff retention exceeds 10 years");
  assert.ok(retainUntil.valueOf() > now, "Windows private handoff retention expired");
  assertExactKeys(receipt.artifacts, Object.keys(STAGED_ARTIFACTS), "Windows private handoff artifacts");
  for (const [kind, record] of Object.entries(receipt.artifacts)) {
    validateReceiptArtifact({
      record,
      kind,
      sourceSha: receipt.source_sha,
      sourceTree: receipt.source_tree,
      version: receipt.version,
      candidateRole: receipt.candidate_role,
      kmsKeyArn: receipt.storage.encryption.kms_key_arn,
      retainUntil: receipt.storage.immutability.retain_until,
    });
  }
  const installer = receipt.artifacts.installer;
  assert.equal(receipt.installer_sha256, installer.sha256);
  assert.equal(receipt.installer_bytes, installer.bytes);
  assert.equal(receipt.installed_tree_sbom_sha256, receipt.artifacts.installed_tree_sbom.sha256);
  assert.equal(receipt.native_package_qa_sha256, receipt.artifacts.native_package_qa.sha256);
  assert.equal(receipt.build_manifest_sha256, receipt.artifacts.build_manifest.sha256);
  assert.equal(receipt.storage.key, installer.key);
  assert.equal(receipt.storage.version_id, installer.version_id);
  assert.deepEqual(receipt.storage.upload, installer.upload);
  assert.deepEqual(receipt.storage.head_readback, installer.head_readback);
  assert.deepEqual(receipt.storage.get_readback, installer.get_readback);
  assertExactKeys(receipt.claim_policy, ["private_distribution", "public_distribution", "external_distribution", "production_go_live"], "Windows private handoff claim policy");
  assert.deepEqual(receipt.claim_policy, {
    private_distribution: true,
    public_distribution: false,
    external_distribution: false,
    production_go_live: false,
  });
  return deepFreeze(receipt);
}

function verifyObjectReadback({ response, byteSize, digest, checksum, versionId, bindings, retainUntil, label }) {
  assert.equal(response?.VersionId, versionId, `${label} VersionId differs`);
  assert.equal(Number(response?.ContentLength), byteSize, `${label} content length differs`);
  assert.equal(response?.ServerSideEncryption, "aws:kms", `${label} encryption differs`);
  assert.equal(response?.SSEKMSKeyId, bindings.kms_key_arn, `${label} KMS key differs`);
  assert.equal(response?.ChecksumSHA256, checksum, `${label} provider checksum differs`);
  assert.equal(response?.ObjectLockMode, "COMPLIANCE", `${label} Object Lock mode differs`);
  assert.equal(new Date(response?.ObjectLockRetainUntilDate).toISOString(), retainUntil, `${label} retention differs`);
  assert.equal(response?.Metadata?.["artifact-sha256"], digest, `${label} digest metadata differs`);
}

async function uploadImmutableObject({ aws, bindings, sourceSha, sourceTree, version, candidateRole, kind, definition, snapshot }) {
  assertSnapshotPathIdentity(snapshot, `Windows ${kind}`);
  const digest = snapshot.sha256;
  const byteSize = snapshot.byte_size;
  const checksum = Buffer.from(digest, "hex").toString("base64");
  const key = contentAddressedKey({ sourceSha, version, candidateRole, kind, digest, fileName: definition.file });
  const metadata = {
    "artifact-sha256": digest,
    "source-sha": sourceSha,
    "source-tree": sourceTree,
    version,
    "candidate-role": candidateRole,
    "artifact-kind": kind,
  };
  const uploadRoot = mkdtempSync(path.join(tmpdir(), "lawos-windows-handoff-put-"));
  const bodyPath = path.join(uploadRoot, "body");
  let bodySnapshot;
  let uploaded;
  try {
    copySnapshotToPath(snapshot, bodyPath, `Windows ${kind} upload body`);
    bodySnapshot = openRegularFileSnapshot(bodyPath, `Windows ${kind} upload body`);
    assert.equal(bodySnapshot.sha256, digest, `Windows ${kind} upload body digest differs`);
    assert.equal(bodySnapshot.byte_size, byteSize, `Windows ${kind} upload body bytes differ`);
    uploaded = await aws.putObject({
      bucket: bindings.bucket,
      key,
      bodyPath,
      byteSize,
      contentType: definition.contentType,
      checksumSha256: checksum,
      kmsKeyArn: bindings.kms_key_arn,
      retainUntil: bindings.retain_until,
      expectedOwner: bindings.account_id,
      metadata,
    });
    assertSnapshotPathIdentity(bodySnapshot, `Windows ${kind} upload body`);
    assert.equal(descriptorDigest(bodySnapshot.fd, bodySnapshot.byte_size), digest, `Windows ${kind} upload body changed`);
  } finally {
    closeFileSnapshot(bodySnapshot);
    rmSync(uploadRoot, { recursive: true, force: true });
  }
  assert.match(uploaded?.VersionId ?? "", /\S+/u, `Windows ${kind} upload returned no VersionId`);
  const versionId = uploaded.VersionId;
  const head = await aws.headObject({
    bucket: bindings.bucket,
    key,
    versionId,
    expectedOwner: bindings.account_id,
  });
  verifyObjectReadback({ response: head, byteSize, digest, checksum, versionId, bindings, retainUntil: bindings.retain_until, label: `Windows ${kind} HEAD` });
  assert.deepEqual(head.Metadata, metadata, `Windows ${kind} HEAD metadata differs`);
  const get = await aws.getObject({
    bucket: bindings.bucket,
    key,
    versionId,
    expectedOwner: bindings.account_id,
  });
  verifyObjectReadback({ response: get, byteSize, digest, checksum, versionId, bindings, retainUntil: bindings.retain_until, label: `Windows ${kind} GET` });
  assert.deepEqual(get.Metadata, metadata, `Windows ${kind} GET metadata differs`);
  assert.equal(get.body_bytes, byteSize, `Windows ${kind} GET body byte count differs`);
  assert.equal(get.body_sha256, digest, `Windows ${kind} GET body digest differs`);
  return Object.freeze({
    sha256: digest,
    bytes: byteSize,
    key,
    version_id: versionId,
    upload: Object.freeze({ status: "PASS", artifact_sha256: digest, bytes: byteSize, digest_verified: true, provider_checksum_sha256: checksum }),
    head_readback: Object.freeze({
      status: "PASS",
      version_id: versionId,
      content_length: Number(head.ContentLength),
      artifact_sha256_metadata: head.Metadata["artifact-sha256"],
      server_side_encryption: head.ServerSideEncryption,
      kms_key_arn: head.SSEKMSKeyId,
      provider_checksum_sha256: head.ChecksumSHA256,
      object_lock_mode: head.ObjectLockMode,
      retain_until: new Date(head.ObjectLockRetainUntilDate).toISOString(),
    }),
    get_readback: Object.freeze({
      status: "PASS",
      version_id: versionId,
      content_length: get.body_bytes,
      sha256: get.body_sha256,
      provider_checksum_sha256: get.ChecksumSHA256,
      digest_verified: true,
      server_side_encryption: get.ServerSideEncryption,
      kms_key_arn: get.SSEKMSKeyId,
      object_lock_mode: get.ObjectLockMode,
      retain_until: new Date(get.ObjectLockRetainUntilDate).toISOString(),
    }),
  });
}

export function validateWindowsSignedArtifactPrivateHandoffLocator(locator, { now = Date.now() } = {}) {
  assertExactKeys(locator, [
    "schema_version",
    "account_id",
    "region",
    "bucket",
    "key",
    "version_id",
    "sha256",
    "bytes",
    "provider_checksum_sha256",
    "server_side_encryption",
    "kms_key_arn",
    "object_lock_mode",
    "retain_until",
  ], "Windows private handoff locator");
  assert.equal(locator.schema_version, WINDOWS_SIGNED_ARTIFACT_PRIVATE_HANDOFF_LOCATOR_SCHEMA);
  assert.equal(locator.account_id, WINDOWS_SIGNED_ARTIFACT_HANDOFF_ACCOUNT);
  assert.equal(locator.region, WINDOWS_SIGNED_ARTIFACT_HANDOFF_REGION);
  assert.match(locator.bucket ?? "", /^(?!.*\.\.)(?!.*\.-)(?!.*-\.)(?!\d+\.\d+\.\d+\.\d+$)[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/u);
  validateProviderReference(locator.key, "Windows private handoff locator key");
  validateProviderReference(locator.version_id, "Windows private handoff locator VersionId");
  assert.match(locator.sha256 ?? "", SHA256_PATTERN, "Windows private handoff locator digest is invalid");
  assert.ok(Number.isSafeInteger(locator.bytes) && locator.bytes > 0, "Windows private handoff locator byte count is invalid");
  assert.equal(locator.provider_checksum_sha256, Buffer.from(locator.sha256, "hex").toString("base64"));
  assert.equal(locator.server_side_encryption, "aws:kms");
  assert.match(
    locator.kms_key_arn ?? "",
    /^arn:aws:kms:ap-northeast-2:770880870480:key\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u,
  );
  assert.equal(locator.object_lock_mode, "COMPLIANCE");
  const retention = canonicalUtc(locator.retain_until, "Windows private handoff locator retain_until").valueOf() - now;
  assert.ok(retention >= MINIMUM_RETENTION_MS, "Windows private handoff locator retention is shorter than 365 days");
  assert.ok(retention <= MAXIMUM_RETENTION_MS, "Windows private handoff locator retention exceeds 10 years");
  return deepFreeze(locator);
}

export function createWindowsSignedArtifactPrivateHandoffLocatorEnvelopeAad(envelope) {
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
    version: envelope.version,
    candidate_role: envelope.candidate_role,
    private_receipt_sha256: envelope.private_receipt_sha256,
    private_receipt_locator_sha256: envelope.private_receipt_locator_sha256,
    private_receipt_locator_bytes: envelope.private_receipt_locator_bytes,
    wrapping_key_arn: envelope.wrapping_key_arn,
    wrapping_public_key_sha256: envelope.wrapping_public_key_sha256,
    key_wrap_algorithm: envelope.key_wrap_algorithm,
    content_encryption_algorithm: envelope.content_encryption_algorithm,
    ciphertext_file: envelope.ciphertext_file,
  }), "utf8");
}

export function validateWindowsSignedArtifactPrivateHandoffLocatorEnvelope(envelope) {
  assertExactKeys(envelope, [
    "schema_version",
    "generated_at",
    "source_sha",
    "source_tree",
    "version",
    "candidate_role",
    "producer_repository",
    "producer_workflow_ref",
    "producer_job",
    "producer_run_id",
    "producer_run_attempt",
    "private_receipt_sha256",
    "private_receipt_locator_sha256",
    "private_receipt_locator_bytes",
    "wrapping_key_arn",
    "wrapping_public_key_sha256",
    "key_wrap_algorithm",
    "content_encryption_algorithm",
    "ciphertext_file",
    "ciphertext_sha256",
    "ciphertext_bytes",
    "iv_b64",
    "auth_tag_b64",
    "aad_sha256",
    "wrapped_key_b64",
  ], "Windows private handoff locator envelope");
  assert.equal(envelope.schema_version, WINDOWS_SIGNED_ARTIFACT_PRIVATE_HANDOFF_LOCATOR_ENVELOPE_SCHEMA);
  canonicalUtc(envelope.generated_at, "Windows private handoff locator envelope generated_at");
  validateCandidateIdentity({
    sourceSha: envelope.source_sha,
    sourceTree: envelope.source_tree,
    candidateRole: envelope.candidate_role,
  });
  assert.match(envelope.version ?? "", VERSION_PATTERN, "Windows private handoff locator envelope version is invalid");
  assert.equal(envelope.producer_repository, "Gonyak-cell/law-firm-os", "Windows private handoff producer repository differs");
  assert.equal(
    envelope.producer_workflow_ref,
    "Gonyak-cell/law-firm-os/.github/workflows/windows-authenticode-package-qa.yml@refs/heads/main",
    "Windows private handoff producer workflow ref differs",
  );
  assert.equal(envelope.producer_job, "private-immutable-handoff", "Windows private handoff producer job differs");
  assert.match(envelope.producer_run_id ?? "", /^[1-9][0-9]*$/u, "Windows private handoff producer run ID is invalid");
  assert.match(envelope.producer_run_attempt ?? "", /^[1-9][0-9]*$/u, "Windows private handoff producer run attempt is invalid");
  assert.match(envelope.private_receipt_sha256 ?? "", SHA256_PATTERN, "Windows private receipt digest is invalid");
  assert.match(envelope.private_receipt_locator_sha256 ?? "", SHA256_PATTERN, "Windows private receipt locator digest is invalid");
  assert.ok(Number.isSafeInteger(envelope.private_receipt_locator_bytes) && envelope.private_receipt_locator_bytes > 0, "Windows private receipt locator byte count is invalid");
  assert.equal(envelope.ciphertext_bytes, envelope.private_receipt_locator_bytes, "Windows private receipt locator ciphertext byte count differs");
  assert.match(
    envelope.wrapping_key_arn ?? "",
    /^arn:aws:kms:ap-northeast-2:770880870480:key\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u,
    "Windows private handoff locator wrapping key ARN is invalid",
  );
  assert.match(envelope.wrapping_public_key_sha256 ?? "", SHA256_PATTERN, "Windows private handoff locator wrapping public key digest is invalid");
  assert.equal(envelope.key_wrap_algorithm, "RSAES_OAEP_SHA_256");
  assert.equal(envelope.content_encryption_algorithm, "AES-256-GCM");
  assert.equal(envelope.ciphertext_file, PRIVATE_LOCATOR_CIPHERTEXT_FILE);
  assert.match(envelope.ciphertext_sha256 ?? "", SHA256_PATTERN, "Windows private handoff locator ciphertext digest is invalid");
  assert.ok(Number.isSafeInteger(envelope.ciphertext_bytes) && envelope.ciphertext_bytes > 0, "Windows private handoff locator ciphertext byte count is invalid");
  assert.equal(decodeBase64(envelope.iv_b64, "Windows private handoff locator IV").length, 12);
  assert.equal(decodeBase64(envelope.auth_tag_b64, "Windows private handoff locator authentication tag").length, 16);
  assert.match(envelope.aad_sha256 ?? "", SHA256_PATTERN, "Windows private handoff locator AAD digest is invalid");
  assert.equal(sha256(createWindowsSignedArtifactPrivateHandoffLocatorEnvelopeAad(envelope)), envelope.aad_sha256, "Windows private handoff locator AAD differs");
  assert.equal(decodeBase64(envelope.wrapped_key_b64, "Windows private handoff locator wrapped key").length, 512);
  return deepFreeze(envelope);
}

export function createWindowsSignedArtifactPrivateHandoffLocatorEnvelope({
  locatorPath,
  outputDir,
  sourceSha,
  sourceTree,
  version,
  candidateRole,
  producerRepository,
  producerWorkflowRef,
  producerJob,
  producerRunId,
  producerRunAttempt,
  privateReceiptSha256,
  wrappingKeyArn,
  wrappingPublicKeySpkiBase64,
  wrappingPublicKeySha256,
  randomBytesFn = randomBytes,
  publicEncryptFn = publicEncrypt,
  generatedAt = new Date().toISOString(),
}) {
  const locatorSnapshot = openRegularFileSnapshot(locatorPath, "Windows private handoff locator", { captureJson: true });
  const target = path.resolve(outputDir);
  let targetCreated = false;
  let dataKey;
  let plaintext;
  let ciphertext;
  try {
    assertSnapshotPathIdentity(locatorSnapshot, "Windows private handoff locator");
    const locator = validateWindowsSignedArtifactPrivateHandoffLocator(
      parseJsonBytes(locatorSnapshot.json_bytes, "Windows private handoff locator"),
      { now: new Date(generatedAt).valueOf() },
    );
    assert.equal(locator.sha256, privateReceiptSha256, "Windows private receipt locator does not bind the private receipt digest");
    validateCandidateIdentity({ sourceSha, sourceTree, candidateRole });
    assert.match(version ?? "", VERSION_PATTERN, "Windows private handoff locator envelope version is invalid");
    canonicalUtc(generatedAt, "Windows private handoff locator envelope generated_at");
    const publicKey = validateWrappingKey({ wrappingPublicKeySpkiBase64, wrappingPublicKeySha256 });
    plaintext = Buffer.from(JSON.stringify({
      schema_version: locator.schema_version,
      account_id: locator.account_id,
      region: locator.region,
      bucket: locator.bucket,
      key: locator.key,
      version_id: locator.version_id,
      sha256: locator.sha256,
      bytes: locator.bytes,
      provider_checksum_sha256: locator.provider_checksum_sha256,
      server_side_encryption: locator.server_side_encryption,
      kms_key_arn: locator.kms_key_arn,
      object_lock_mode: locator.object_lock_mode,
      retain_until: locator.retain_until,
    }), "utf8");
    const privateReceiptLocatorSha256 = sha256(plaintext);
    dataKey = randomBytesFn(32);
    const iv = randomBytesFn(12);
    assert.ok(Buffer.isBuffer(dataKey) && dataKey.length === 32, "Windows private handoff locator data key must contain 32 random bytes");
    assert.ok(Buffer.isBuffer(iv) && iv.length === 12, "Windows private handoff locator IV must contain 12 random bytes");
    const wrappedKey = publicEncryptFn({
      key: publicKey,
      padding: cryptoConstants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    }, dataKey);
    assert.ok(Buffer.isBuffer(wrappedKey) && wrappedKey.length === 512, "Windows private handoff locator wrapped key must contain 512 bytes");
    const envelope = {
      schema_version: WINDOWS_SIGNED_ARTIFACT_PRIVATE_HANDOFF_LOCATOR_ENVELOPE_SCHEMA,
      generated_at: generatedAt,
      source_sha: sourceSha,
      source_tree: sourceTree,
      version,
      candidate_role: candidateRole,
      producer_repository: producerRepository,
      producer_workflow_ref: producerWorkflowRef,
      producer_job: producerJob,
      producer_run_id: producerRunId,
      producer_run_attempt: producerRunAttempt,
      private_receipt_sha256: privateReceiptSha256,
      private_receipt_locator_sha256: privateReceiptLocatorSha256,
      private_receipt_locator_bytes: plaintext.length,
      wrapping_key_arn: wrappingKeyArn,
      wrapping_public_key_sha256: wrappingPublicKeySha256,
      key_wrap_algorithm: "RSAES_OAEP_SHA_256",
      content_encryption_algorithm: "AES-256-GCM",
      ciphertext_file: PRIVATE_LOCATOR_CIPHERTEXT_FILE,
      ciphertext_sha256: "0".repeat(64),
      ciphertext_bytes: plaintext.length,
      iv_b64: iv.toString("base64"),
      auth_tag_b64: Buffer.alloc(16).toString("base64"),
      aad_sha256: "0".repeat(64),
      wrapped_key_b64: wrappedKey.toString("base64"),
    };
    const aad = createWindowsSignedArtifactPrivateHandoffLocatorEnvelopeAad(envelope);
    const cipher = createCipheriv("aes-256-gcm", dataKey, iv, { authTagLength: 16 });
    cipher.setAAD(aad, { plaintextLength: plaintext.length });
    ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    assertSnapshotPathIdentity(locatorSnapshot, "Windows private handoff locator");
    envelope.ciphertext_sha256 = sha256(ciphertext);
    envelope.ciphertext_bytes = ciphertext.length;
    envelope.auth_tag_b64 = cipher.getAuthTag().toString("base64");
    envelope.aad_sha256 = sha256(aad);
    validateWindowsSignedArtifactPrivateHandoffLocatorEnvelope(envelope);
    mkdirSync(target, { recursive: false, mode: 0o700 });
    targetCreated = true;
    assert.equal(realpathSync(target), target, "Windows private handoff locator envelope directory cannot traverse a link");
    writeBytesExclusive(path.join(target, PRIVATE_LOCATOR_CIPHERTEXT_FILE), ciphertext, "Windows private handoff locator ciphertext");
    const envelopeBytes = Buffer.from(`${JSON.stringify(envelope, null, 2)}\n`, "utf8");
    writeBytesExclusive(path.join(target, PRIVATE_LOCATOR_ENVELOPE_FILE), envelopeBytes, "Windows private handoff locator envelope");
    assert.deepEqual(
      readdirSync(target).sort(),
      [PRIVATE_LOCATOR_CIPHERTEXT_FILE, PRIVATE_LOCATOR_ENVELOPE_FILE].sort(),
      "Windows private handoff locator envelope must contain only its closed ciphertext file set",
    );
    return Object.freeze({
      envelope: deepFreeze(envelope),
      envelope_sha256: sha256(envelopeBytes),
      private_receipt_locator_sha256: privateReceiptLocatorSha256,
      output_dir: target,
    });
  } catch (error) {
    if (targetCreated) rmSync(target, { recursive: true, force: true });
    throw error;
  } finally {
    closeFileSnapshot(locatorSnapshot);
    if (Buffer.isBuffer(dataKey)) dataKey.fill(0);
    if (Buffer.isBuffer(plaintext)) plaintext.fill(0);
    if (Buffer.isBuffer(ciphertext)) ciphertext.fill(0);
  }
}

export async function executeWindowsSignedArtifactPrivateHandoff({
  stagingDir,
  receiptPath,
  sourceSha,
  sourceTree,
  candidateRole,
  bindings,
  aws,
  now = Date.now(),
}) {
  validateCandidateIdentity({ sourceSha, sourceTree, candidateRole });
  const safeBindings = validateWindowsSignedArtifactHandoffBindings(bindings, { now });
  assert.ok(aws && typeof aws === "object", "AWS handoff adapter is required");
  const stagingRoot = path.resolve(stagingDir);
  assert.equal(realpathSync(stagingRoot), stagingRoot, "handoff staging directory cannot traverse a link");
  const paths = Object.fromEntries(Object.entries(STAGED_ARTIFACTS).map(([kind, definition]) => [kind, path.join(stagingRoot, definition.file)]));
  const inspected = inspectHandoffArtifacts({ paths, sourceSha, sourceTree, candidateRole });
  const resolvedReceiptPath = path.resolve(receiptPath);
  let receiptWritten = false;
  let completed = false;
  try {
    const governance = await aws.inspectGovernance(safeBindings);
    assertProviderGovernance({ bindings: safeBindings, ...governance });
    const artifacts = {};
    for (const [kind, definition] of Object.entries(STAGED_ARTIFACTS)) {
      const snapshot = inspected.files[kind];
      assertSnapshotPathIdentity(snapshot, `staged Windows ${kind}`);
      artifacts[kind] = await uploadImmutableObject({
        aws,
        bindings: safeBindings,
        sourceSha,
        sourceTree,
        version: inspected.version,
        candidateRole,
        kind,
        definition,
        snapshot,
      });
    }
    const installer = artifacts.installer;
    const receipt = {
      schema_version: WINDOWS_SIGNED_ARTIFACT_PRIVATE_HANDOFF_SCHEMA,
      generated_at: new Date(now).toISOString(),
      verdict: "PASS",
      candidate_role: candidateRole,
      source_sha: sourceSha,
      source_tree: sourceTree,
      version: inspected.version,
      installer_sha256: installer.sha256,
      installer_bytes: installer.bytes,
      installed_tree_sbom_sha256: artifacts.installed_tree_sbom.sha256,
      native_package_qa_sha256: artifacts.native_package_qa.sha256,
      build_manifest_sha256: artifacts.build_manifest.sha256,
      artifacts,
      storage: {
        provider: "aws_s3",
        account_id: safeBindings.account_id,
        region: safeBindings.region,
        bucket: safeBindings.bucket,
        key: installer.key,
        version_id: installer.version_id,
        versioning_enabled: true,
        ownership: "BucketOwnerEnforced",
        encryption: { mode: "aws:kms", kms_key_arn: safeBindings.kms_key_arn },
        immutability: { object_lock_mode: "COMPLIANCE", retain_until: safeBindings.retain_until },
        upload: installer.upload,
        head_readback: installer.head_readback,
        get_readback: installer.get_readback,
      },
      claim_policy: {
        private_distribution: true,
        public_distribution: false,
        external_distribution: false,
        production_go_live: false,
      },
    };
    const validatedReceipt = validateWindowsSignedArtifactPrivateHandoffReceipt(receipt, { now });
    const receiptBytes = Buffer.from(`${JSON.stringify(validatedReceipt, null, 2)}\n`, "utf8");
    const receiptDigest = sha256(receiptBytes);
    mkdirSync(path.dirname(resolvedReceiptPath), { recursive: true, mode: 0o700 });
    writeBytesExclusive(resolvedReceiptPath, receiptBytes, "Windows private handoff receipt");
    receiptWritten = true;
    receiptBytes.fill(0);
    const receiptSnapshot = openRegularFileSnapshot(resolvedReceiptPath, "Windows private handoff receipt");
    let receiptObject;
    try {
      receiptObject = await uploadImmutableObject({
        aws,
        bindings: safeBindings,
        sourceSha,
        sourceTree,
        version: inspected.version,
        candidateRole,
        kind: "private_handoff_receipt",
        definition: PRIVATE_RECEIPT_DEFINITION,
        snapshot: receiptSnapshot,
      });
    } finally {
      closeFileSnapshot(receiptSnapshot);
    }
    const receiptLocator = validateWindowsSignedArtifactPrivateHandoffLocator({
      schema_version: WINDOWS_SIGNED_ARTIFACT_PRIVATE_HANDOFF_LOCATOR_SCHEMA,
      account_id: safeBindings.account_id,
      region: safeBindings.region,
      bucket: safeBindings.bucket,
      key: receiptObject.key,
      version_id: receiptObject.version_id,
      sha256: receiptObject.sha256,
      bytes: receiptObject.bytes,
      provider_checksum_sha256: receiptObject.upload.provider_checksum_sha256,
      server_side_encryption: receiptObject.get_readback.server_side_encryption,
      kms_key_arn: receiptObject.get_readback.kms_key_arn,
      object_lock_mode: receiptObject.get_readback.object_lock_mode,
      retain_until: receiptObject.get_readback.retain_until,
    }, { now });
    const result = Object.freeze({
      receipt: validatedReceipt,
      receipt_sha256: receiptDigest,
      receipt_bytes: receiptObject.bytes,
      receipt_locator: receiptLocator,
    });
    completed = true;
    return result;
  } finally {
    closeFileSnapshots(inspected.files);
    if (receiptWritten && !completed) rmSync(resolvedReceiptPath, { force: true });
  }
}

function awsMetadata(metadata) {
  return Object.entries(metadata).map(([key, value]) => `${key}=${value}`).join(",");
}

export function createWindowsSignedArtifactAwsCliAdapter({ region = WINDOWS_SIGNED_ARTIFACT_HANDOFF_REGION } = {}) {
  const json = (args) => {
    try {
      const output = execFileSync("aws", [...args, "--region", region, "--no-cli-pager", "--output", "json"], {
        encoding: "utf8",
        windowsHide: true,
        maxBuffer: 16 * 1024 * 1024,
        stdio: ["ignore", "pipe", "pipe"],
      });
      return JSON.parse(output || "{}");
    } catch {
      throw new Error(`AWS CLI ${args.slice(0, 2).join(" ")} failed`);
    }
  };
  return Object.freeze({
    async inspectWrappingKey({ keyArn }) {
      return json(["kms", "describe-key", "--key-id", keyArn]).KeyMetadata;
    },
    async decryptDataKey({ ciphertext, keyArn, encryptionAlgorithm }) {
      const temporaryRoot = mkdtempSync(path.join(tmpdir(), "lawos-windows-handoff-decrypt-"));
      const ciphertextPath = path.join(temporaryRoot, "ciphertext");
      try {
        writeFileSync(ciphertextPath, ciphertext, { mode: 0o600 });
        let output;
        try {
          output = execFileSync("aws", [
            "kms", "decrypt",
            "--key-id", keyArn,
            "--encryption-algorithm", encryptionAlgorithm,
            "--ciphertext-blob", `fileb://${ciphertextPath}`,
            "--query", "Plaintext",
            "--output", "text",
            "--region", region,
            "--no-cli-pager",
          ], { encoding: "utf8", windowsHide: true, stdio: ["ignore", "pipe", "pipe"] }).trim();
        } catch {
          throw new Error("AWS CLI kms decrypt failed");
        }
        return decodeBase64(output, "AWS KMS decrypted data key");
      } finally {
        rmSync(temporaryRoot, { recursive: true, force: true });
      }
    },
    async inspectGovernance(bindings) {
      const common = ["--bucket", bindings.bucket, "--expected-bucket-owner", bindings.account_id];
      return {
        identity: json(["sts", "get-caller-identity"]),
        kms: json(["kms", "describe-key", "--key-id", bindings.kms_key_arn]),
        location: json(["s3api", "get-bucket-location", ...common]),
        versioning: json(["s3api", "get-bucket-versioning", ...common]),
        publicAccess: json(["s3api", "get-public-access-block", ...common]),
        objectLock: json(["s3api", "get-object-lock-configuration", ...common]),
        encryption: json(["s3api", "get-bucket-encryption", ...common]),
        ownership: json(["s3api", "get-bucket-ownership-controls", ...common]),
      };
    },
    async putObject({ bucket, key, bodyPath, byteSize, contentType, checksumSha256, kmsKeyArn, retainUntil, expectedOwner, metadata }) {
      const snapshot = openRegularFileSnapshot(bodyPath, "AWS S3 upload body");
      try {
        assert.equal(snapshot.byte_size, byteSize, "AWS S3 upload body byte count differs");
        assert.equal(Buffer.from(snapshot.sha256, "hex").toString("base64"), checksumSha256, "AWS S3 upload body checksum differs");
        const result = json([
          "s3api", "put-object",
          "--bucket", bucket,
          "--key", key,
          "--body", snapshot.path,
          "--expected-bucket-owner", expectedOwner,
          "--content-type", contentType,
          "--server-side-encryption", "aws:kms",
          "--ssekms-key-id", kmsKeyArn,
          "--checksum-algorithm", "SHA256",
          "--checksum-sha256", checksumSha256,
          "--object-lock-mode", "COMPLIANCE",
          "--object-lock-retain-until-date", retainUntil,
          "--metadata", awsMetadata(metadata),
        ]);
        assertSnapshotPathIdentity(snapshot, "AWS S3 upload body");
        assert.equal(descriptorDigest(snapshot.fd, snapshot.byte_size), snapshot.sha256, "AWS S3 upload body changed during upload");
        return result;
      } finally {
        closeFileSnapshot(snapshot);
      }
    },
    async headObject({ bucket, key, versionId, expectedOwner }) {
      return json([
        "s3api", "head-object",
        "--bucket", bucket,
        "--key", key,
        "--version-id", versionId,
        "--expected-bucket-owner", expectedOwner,
        "--checksum-mode", "ENABLED",
      ]);
    },
    async getObject({ bucket, key, versionId, expectedOwner }) {
      const temporaryRoot = mkdtempSync(path.join(tmpdir(), "lawos-windows-handoff-get-"));
      const bodyPath = path.join(temporaryRoot, "body");
      try {
        const response = json([
          "s3api", "get-object",
          "--bucket", bucket,
          "--key", key,
          "--version-id", versionId,
          "--expected-bucket-owner", expectedOwner,
          "--checksum-mode", "ENABLED",
          bodyPath,
        ]);
        const body = openRegularFileSnapshot(bodyPath, "AWS S3 GET body");
        try {
          return { ...response, body_sha256: body.sha256, body_bytes: body.byte_size };
        } finally {
          closeFileSnapshot(body);
        }
      } finally {
        rmSync(temporaryRoot, { recursive: true, force: true });
      }
    },
  });
}
