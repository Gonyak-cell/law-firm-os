import { createHash } from "node:crypto";
import {
  closeSync,
  constants,
  fchmodSync,
  fstatSync,
  fsyncSync,
  lstatSync,
  openSync,
  readdirSync,
  readSync,
  realpathSync,
  unlinkSync,
  writeSync,
} from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import {
  JSON_POSTGRES_PRODUCTION_ARTIFACT_SCHEMA,
  validateJsonPostgresProductionDeploymentManifest,
  validateJsonPostgresProductionProfilePhotoArtifactBinding,
} from "./json-postgres-production-artifact.mjs";
import {
  createProfileHttpAdapter,
  readBoundedJsonResponseBody,
  runTenProfileApiRead,
} from "./profile-media-api-smoke.mjs";
import {
  assertNoPrivateMaterial,
  evidenceFail,
  exactObject,
  sha256Bytes,
} from "./profile-media-evidence-shared.mjs";
import {
  PROFILE_PHOTO_EXPECTED_COUNT,
  validateProfilePhotoManifest,
} from "../validate-profile-photo-replacement-manifest.mjs";

export const PROFILE_PRODUCTION_API_SMOKE_SCHEMA =
  "law-firm-os.profile-production-api-smoke.v1";

const SHA1 = /^[a-f0-9]{40}$/u;
const SHA256 = /^[a-f0-9]{64}$/u;
const PRIVATE_PROFILE_MANIFEST_MAX_BYTES = 256 * 1024;
const PRODUCTION_ARTIFACT_MANIFEST_MAX_BYTES = 2 * 1024 * 1024;
const HEALTH_RESPONSE_MAX_BYTES = 256 * 1024;
const HEALTH_RESPONSE_KEYS = Object.freeze([
  "status",
  "time",
  "source_revision",
  "runtime_profile",
  "synthetic_login_enabled",
  "persistence_authority",
  "runtime_safety_policy",
  "auth_authority",
  "service",
  "version",
  "bounded_contexts",
  "permission_gate",
  "enrichment",
  "synthetic_only",
  "uses_real_client_data",
  "persistence_authority_capabilities",
]);
const OUTER_MANIFEST_KEYS = Object.freeze([
  "schema_version",
  "source_sha",
  "source_tree",
  "source_timestamp",
  "runtime",
  "node_version",
  "npm_version",
  "dependency_lock_sha256",
  "rds_ca_bundle",
  "source_overrides",
  "source_override_count",
  "source_redactions",
  "source_redaction_count",
  "scanned_source_count",
  "packaged_real_identity_count",
  "packaged_real_client_count",
  "packaged_static_role_assignment_count",
  "packaged_private_profile_photo_count",
  "packaged_account_seed_count",
  "packaged_roster_count",
  "packaged_public_professional_profile_count",
  "data_scope",
  "operational_authority",
  "json_fallback",
  "json_writer",
  "dual_write",
  "file_current_authority",
  "offline_mutation",
  "memory_fallback",
  "secrets_in_environment",
  "production_ready_claim",
  "profile_photo_artifact",
  "artifact_filename",
  "artifact_sha256",
  "artifact_byte_size",
  "artifact_entry_count",
  "artifact_entries_sha256",
  "artifact_runtime_store_entry_count",
  "artifact_real_json_store_count",
  "artifact_private_staging_entry_count",
  "artifact_s3_key",
  "manifest_canonical_sha256",
]);

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function generationRef(manifestSha256) {
  return `profile_generation_${manifestSha256.slice(0, 32)}`;
}

function validateNode22(version = process.versions.node) {
  if (!/^22\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/u.test(String(version))) {
    evidenceFail("PROFILE_PRODUCTION_NODE_VERSION", "profile production smoke requires Node.js 22");
  }
}

function validateSource(source) {
  exactObject(source, ["sha", "tree"], "production source authority");
  if (!SHA1.test(source.sha) || !SHA1.test(source.tree)) {
    evidenceFail("PROFILE_PRODUCTION_SOURCE_INVALID", "production source SHA/tree are invalid");
  }
  return Object.freeze({ sha: source.sha, tree: source.tree });
}

function validateBaseUrl(value) {
  let url;
  try { url = new URL(value); } catch {
    evidenceFail("PROFILE_API_URL_INVALID", "profile API base URL is invalid");
  }
  if (url.protocol !== "https:" || url.username || url.password
    || !["", "/"].includes(url.pathname) || url.search || url.hash) {
    evidenceFail("PROFILE_API_URL_INVALID", "production profile API must use an exact HTTPS origin");
  }
  return url.origin;
}

async function readExactApiHealth(baseUrl, source, fetchImpl) {
  const url = new URL("/api/health", `${baseUrl}/`);
  let response;
  try {
    response = await fetchImpl(url, {
      method: "GET",
      redirect: "error",
      signal: AbortSignal.timeout(30_000),
      headers: { accept: "application/json" },
    });
  } catch {
    evidenceFail("PROFILE_API_HEALTH_FAILED", "production API health read failed");
  }
  if (response?.status !== 200
    || response.redirected !== false
    || response.url !== url.href) {
    evidenceFail("PROFILE_API_HEALTH_INVALID", "production API health transport contract is invalid");
  }
  let body;
  try {
    body = await readBoundedJsonResponseBody(response, HEALTH_RESPONSE_MAX_BYTES);
    exactObject(body, HEALTH_RESPONSE_KEYS, "production API health response");
  } catch {
    evidenceFail("PROFILE_API_HEALTH_INVALID", "production API health response shape is invalid");
  }
  const objectOrNull = (value) => value === null
    || (value && typeof value === "object" && !Array.isArray(value));
  if (body.status !== "ok"
    || body.source_revision !== source.sha
    || body.runtime_profile !== "operational"
    || body.persistence_authority !== "postgres-v2"
    || body.synthetic_login_enabled !== false
    || body.synthetic_only !== false
    || body.uses_real_client_data !== true
    || body.service !== "@law-firm-os/api"
    || typeof body.version !== "string"
    || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(body.time)
    || !Number.isFinite(Date.parse(body.time))
    || !Array.isArray(body.bounded_contexts)
    || !objectOrNull(body.runtime_safety_policy)
    || !objectOrNull(body.auth_authority)
    || !objectOrNull(body.permission_gate)
    || !objectOrNull(body.enrichment)
    || !objectOrNull(body.persistence_authority_capabilities)) {
    evidenceFail("PROFILE_API_HEALTH_SOURCE_MISMATCH", "production API health is not exact-source operational authority");
  }
  return Object.freeze({ sourceRevision: body.source_revision });
}

function sameFileSnapshot(left, right) {
  return left.dev === right.dev
    && left.ino === right.ino
    && left.size === right.size
    && left.mtimeNs === right.mtimeNs
    && left.ctimeNs === right.ctimeNs
    && left.mode === right.mode;
}

function validPrivateSnapshot(value, maxBytes) {
  return value.isFile()
    && (value.mode & 0o077n) === 0n
    && (value.mode & 0o400n) !== 0n
    && value.size > 0n
    && value.size <= BigInt(maxBytes);
}

function outsideWorktree(path, repoRoot) {
  const rel = relative(repoRoot, path);
  return rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel);
}

function readPrivateJson(path, repoRoot, maxBytes, io = {}) {
  if (typeof path !== "string" || !isAbsolute(path) || resolve(path) !== path) {
    evidenceFail("PROFILE_PRODUCTION_PRIVATE_INPUT", "private smoke inputs must use canonical absolute paths");
  }
  const operations = {
    close: io.closeSync ?? closeSync,
    fstat: io.fstatSync ?? fstatSync,
    lstat: io.lstatSync ?? lstatSync,
    open: io.openSync ?? openSync,
    read: io.readSync ?? readSync,
    realpath: io.realpathSync ?? realpathSync,
  };
  let bytes;
  let descriptor;
  try {
    if (operations.realpath(path) !== path || !outsideWorktree(path, repoRoot)) throw new Error();
    const before = operations.lstat(path, { bigint: true });
    if (!validPrivateSnapshot(before, maxBytes)) throw new Error();
    const flags = constants.O_RDONLY
      | (constants.O_CLOEXEC ?? 0)
      | (constants.O_NOFOLLOW ?? 0);
    descriptor = operations.open(path, flags);
    const opened = operations.fstat(descriptor, { bigint: true });
    if (!validPrivateSnapshot(opened, maxBytes) || !sameFileSnapshot(before, opened)) throw new Error();
    bytes = Buffer.alloc(Number(opened.size));
    let offset = 0;
    while (offset < bytes.length) {
      const count = operations.read(descriptor, bytes, offset, bytes.length - offset, offset);
      if (!Number.isSafeInteger(count) || count <= 0) throw new Error();
      offset += count;
    }
    if (operations.read(descriptor, Buffer.alloc(1), 0, 1, bytes.length) !== 0) throw new Error();
    const openedAfter = operations.fstat(descriptor, { bigint: true });
    const pathAfter = operations.lstat(path, { bigint: true });
    if (!validPrivateSnapshot(openedAfter, maxBytes)
      || !validPrivateSnapshot(pathAfter, maxBytes)
      || !sameFileSnapshot(opened, openedAfter)
      || !sameFileSnapshot(openedAfter, pathAfter)
      || operations.realpath(path) !== path) throw new Error();
  } catch {
    evidenceFail("PROFILE_PRODUCTION_PRIVATE_INPUT", "private smoke input must be an owner-only canonical file outside the worktree");
  } finally {
    if (descriptor !== undefined) {
      try { operations.close(descriptor); } catch {}
    }
  }
  try {
    return Object.freeze({ bytes, sha256: sha256Bytes(bytes), value: JSON.parse(bytes.toString("utf8")) });
  } catch {
    evidenceFail("PROFILE_PRODUCTION_PRIVATE_INPUT", "private smoke input is not valid JSON");
  }
}

function sameReceiptParent(left, right) {
  return left.dev === right.dev && left.ino === right.ino && left.mode === right.mode;
}

function validReceiptParent(value) {
  return value.isDirectory()
    && (value.mode & 0o077n) === 0n
    && (value.mode & 0o300n) === 0o300n;
}

function missingPath(path, lstat = lstatSync) {
  try {
    lstat(path, { bigint: true });
    return false;
  } catch (error) {
    if (error?.code === "ENOENT") return true;
    throw error;
  }
}

function validateReceiptTarget(path, repoRoot) {
  if (typeof path !== "string" || !isAbsolute(path) || resolve(path) !== path) {
    evidenceFail("PROFILE_PRODUCTION_RECEIPT_PATH", "receipt must use a canonical absolute private path");
  }
  try {
    const parent = dirname(path);
    const leaf = basename(path);
    const snapshot = lstatSync(parent, { bigint: true });
    if (!leaf || leaf === "." || leaf === ".."
      || realpathSync(parent) !== parent
      || !outsideWorktree(parent, repoRoot)
      || !outsideWorktree(path, repoRoot)
      || !validReceiptParent(snapshot)
      || !missingPath(path)) throw new Error();
    return Object.freeze({ path, parent, leaf, parentSnapshot: snapshot });
  } catch {
    evidenceFail("PROFILE_PRODUCTION_RECEIPT_PATH", "receipt target must be new, owner-only, and outside the worktree");
  }
}

function revalidateReceiptParent(target, repoRoot, operations) {
  const snapshot = operations.lstat(target.parent, { bigint: true });
  if (operations.realpath(target.parent) !== target.parent
    || !outsideWorktree(target.parent, repoRoot)
    || !outsideWorktree(target.path, repoRoot)
    || !validReceiptParent(snapshot)
    || !sameReceiptParent(snapshot, target.parentSnapshot)) throw new Error();
}

function validReceiptFile(value, expectedSize) {
  return value.isFile()
    && (value.mode & 0o777n) === 0o600n
    && value.size === BigInt(expectedSize);
}

function revalidateOpenedReceipt(target, repoRoot, descriptor, expectedSize, operations) {
  revalidateReceiptParent(target, repoRoot, operations);
  const opened = operations.fstat(descriptor, { bigint: true });
  const pathSnapshot = operations.lstat(target.path, { bigint: true });
  const canonical = operations.realpath(target.path);
  if (!validReceiptFile(opened, expectedSize)
    || !validReceiptFile(pathSnapshot, expectedSize)
    || opened.dev !== pathSnapshot.dev
    || opened.ino !== pathSnapshot.ino
    || opened.mode !== pathSnapshot.mode
    || canonical !== target.path
    || !outsideWorktree(canonical, repoRoot)) throw new Error();
  return opened;
}

function removeOpenedReceipt(target, opened, operations) {
  if (!opened) return;
  const candidates = new Set([target.path]);
  try {
    const grandparent = dirname(target.parent);
    for (const entry of operations.readdir(grandparent)) {
      const parent = join(grandparent, entry);
      try {
        const snapshot = operations.lstat(parent, { bigint: true });
        if (validReceiptParent(snapshot) && sameReceiptParent(snapshot, target.parentSnapshot)) {
          candidates.add(join(parent, target.leaf));
        }
      } catch {}
    }
  } catch {}
  for (const candidate of candidates) {
    try {
      const snapshot = operations.lstat(candidate, { bigint: true });
      if (snapshot.isFile() && snapshot.dev === opened.dev && snapshot.ino === opened.ino) {
        operations.unlink(candidate);
      }
    } catch {}
  }
}

function writePrivateReceipt(target, value, repoRoot, io = {}) {
  const operations = {
    close: io.closeSync ?? closeSync,
    fchmod: io.fchmodSync ?? fchmodSync,
    fstat: io.fstatSync ?? fstatSync,
    fsync: io.fsyncSync ?? fsyncSync,
    lstat: io.lstatSync ?? lstatSync,
    open: io.openSync ?? openSync,
    readdir: io.readdirSync ?? readdirSync,
    realpath: io.realpathSync ?? realpathSync,
    unlink: io.unlinkSync ?? unlinkSync,
    write: io.writeSync ?? writeSync,
  };
  const bytes = Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8");
  let descriptor;
  let opened;
  let failure;
  try {
    io.beforeOpen?.();
    revalidateReceiptParent(target, repoRoot, operations);
    if (!missingPath(target.path, operations.lstat)) throw new Error();
    if (!Number.isInteger(constants.O_NOFOLLOW)) throw new Error();
    const flags = constants.O_WRONLY
      | constants.O_CREAT
      | constants.O_EXCL
      | constants.O_NOFOLLOW
      | (constants.O_CLOEXEC ?? 0);
    descriptor = operations.open(target.path, flags, 0o600);
    opened = operations.fstat(descriptor, { bigint: true });
    operations.fchmod(descriptor, 0o600);
    opened = operations.fstat(descriptor, { bigint: true });
    io.afterOpen?.();
    revalidateOpenedReceipt(target, repoRoot, descriptor, 0, operations);
    io.duringWrite?.();
    revalidateOpenedReceipt(target, repoRoot, descriptor, 0, operations);
    let offset = 0;
    while (offset < bytes.byteLength) {
      const count = operations.write(
        descriptor,
        bytes,
        offset,
        bytes.byteLength - offset,
        offset,
      );
      if (!Number.isSafeInteger(count) || count <= 0) throw new Error();
      offset += count;
    }
    operations.fsync(descriptor);
    revalidateOpenedReceipt(target, repoRoot, descriptor, bytes.byteLength, operations);
  } catch (error) {
    failure = error;
    if (descriptor !== undefined && opened === undefined) {
      try { opened = operations.fstat(descriptor, { bigint: true }); } catch {}
    }
  } finally {
    if (descriptor !== undefined) {
      try { operations.close(descriptor); } catch (error) { failure ??= error; }
    }
  }
  if (failure) {
    removeOpenedReceipt(target, opened, operations);
    throw failure;
  }
}

function validateOuterManifest(manifest, source) {
  exactObject(manifest, OUTER_MANIFEST_KEYS, "production artifact outer manifest");
  let authority;
  let photo;
  try {
    authority = validateJsonPostgresProductionDeploymentManifest(manifest);
    photo = validateJsonPostgresProductionProfilePhotoArtifactBinding(
      manifest.profile_photo_artifact,
    );
  } catch {
    evidenceFail("PROFILE_PRODUCTION_ARTIFACT_INVALID", "production artifact v2 authority binding is invalid");
  }
  const artifactFilename = `lawos-production-${source.sha}.zip`;
  const canonicalSha256 = createHash("sha256")
    .update(stableJson({ ...manifest, manifest_canonical_sha256: "" }))
    .digest("hex");
  if (manifest.schema_version !== JSON_POSTGRES_PRODUCTION_ARTIFACT_SCHEMA
    || manifest.source_sha !== source.sha
    || manifest.source_tree !== source.tree
    || manifest.runtime !== "nodejs22.x"
    || !/^22\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/u.test(manifest.node_version)
    || manifest.artifact_filename !== artifactFilename
    || !SHA256.test(manifest.artifact_sha256)
    || !Number.isSafeInteger(manifest.artifact_byte_size)
    || manifest.artifact_byte_size < 1
    || manifest.artifact_byte_size > 50 * 1024 * 1024
    || !Number.isSafeInteger(manifest.artifact_entry_count)
    || manifest.artifact_entry_count < PROFILE_PHOTO_EXPECTED_COUNT
    || !SHA256.test(manifest.artifact_entries_sha256)
    || manifest.artifact_runtime_store_entry_count !== 0
    || manifest.artifact_real_json_store_count !== 0
    || manifest.artifact_private_staging_entry_count !== 0
    || manifest.artifact_s3_key !== `lawos-production/${source.sha}/${manifest.artifact_sha256}.zip`
    || !SHA256.test(manifest.manifest_canonical_sha256)
    || manifest.manifest_canonical_sha256 !== canonicalSha256) {
    evidenceFail("PROFILE_PRODUCTION_ARTIFACT_INVALID", "production artifact descriptor or exact-source binding drifted");
  }
  return Object.freeze({ authority, photo });
}

function loadBindings({ privateManifestPath, artifactManifestPath, repoRoot, source, io }) {
  const privateInput = readPrivateJson(
    privateManifestPath,
    repoRoot,
    PRIVATE_PROFILE_MANIFEST_MAX_BYTES,
    io,
  );
  const artifactInput = readPrivateJson(
    artifactManifestPath,
    repoRoot,
    PRODUCTION_ARTIFACT_MANIFEST_MAX_BYTES,
    io,
  );
  let privateManifest;
  try { privateManifest = validateProfilePhotoManifest(privateInput.value); } catch {
    evidenceFail("PROFILE_PRODUCTION_PRIVATE_MANIFEST", "private profile-photo manifest contract is invalid");
  }
  const artifact = validateOuterManifest(artifactInput.value, source);
  const expectedGenerationRef = generationRef(privateInput.sha256);
  if (privateManifest.entries.length !== PROFILE_PHOTO_EXPECTED_COUNT
    || artifact.photo.private_manifest_sha256 !== privateInput.sha256
    || artifact.photo.private_manifest_entry_count !== PROFILE_PHOTO_EXPECTED_COUNT
    || artifact.photo.injected_photo_entry_count !== PROFILE_PHOTO_EXPECTED_COUNT
    || artifact.photo.git_source_photo_entry_count !== 0
    || artifact.photo.generation_ref !== expectedGenerationRef
    || artifact.authority.profile_photo_generation_ref !== expectedGenerationRef) {
    evidenceFail("PROFILE_PRODUCTION_BINDING_MISMATCH", "private manifest and production artifact photo generation do not match");
  }
  return Object.freeze({
    privateManifest,
    expectedGenerationRef,
    outerManifest: artifactInput.value,
  });
}

function aggregate(verdict, { health = null, reads = null, receiptWritten = false } = {}) {
  return Object.freeze({
    runner: "profile-production-api-smoke",
    verdict,
    expected_profile_reads: PROFILE_PHOTO_EXPECTED_COUNT,
    passed_profile_reads: reads?.passed ?? 0,
    health_get_count: health ? 1 : 0,
    authenticated_get_count: reads ? PROFILE_PHOTO_EXPECTED_COUNT : 0,
    total_get_count: health && reads ? PROFILE_PHOTO_EXPECTED_COUNT + 1 : 0,
    desktop_deploy_count: 0,
    desktop_reinstall_count: 0,
    external_mutation_count: 0,
    receipt_written: receiptWritten,
    private_values_emitted: false,
  });
}

export async function runProfileProductionApiSmoke(options = {}) {
  validateNode22(options.nodeVersion);
  const repoRoot = realpathSync(resolve(options.repoRoot ?? process.cwd()));
  const source = validateSource(options.source);
  const baseUrl = validateBaseUrl(options.baseUrl);
  const bindings = loadBindings({
    privateManifestPath: options.privateManifestPath,
    artifactManifestPath: options.artifactManifestPath,
    repoRoot,
    source,
    io: options.testPrivateInputIo,
  });
  const receiptTarget = validateReceiptTarget(options.receiptPath, repoRoot);
  if (options.execute !== true) return aggregate("DRY_RUN");

  let fetchCount = 0;
  const fetchImpl = options.fetchImpl ?? fetch;
  const readProfile = createProfileHttpAdapter({
    baseUrl,
    sessionTokens: options.sessionTokens,
    fetchImpl(url, init) {
      fetchCount += 1;
      if (fetchCount > PROFILE_PHOTO_EXPECTED_COUNT) {
        evidenceFail("PROFILE_API_READ_COUNT", "profile smoke exceeded ten reads");
      }
      return fetchImpl(url, {
        ...init,
        method: "GET",
        redirect: "error",
        signal: AbortSignal.timeout(30_000),
      });
    },
  });
  const health = await readExactApiHealth(baseUrl, source, fetchImpl);
  const reads = await runTenProfileApiRead({
    readProfile,
    expectedManifest: bindings.privateManifest,
    expectedGenerationRef: bindings.expectedGenerationRef,
  });
  if (fetchCount !== PROFILE_PHOTO_EXPECTED_COUNT || reads.passed !== PROFILE_PHOTO_EXPECTED_COUNT) {
    evidenceFail("PROFILE_API_READ_COUNT", "profile smoke did not complete exactly ten passing reads");
  }

  const now = options.now?.() ?? new Date();
  if (!(now instanceof Date) || !Number.isFinite(now.valueOf())) {
    evidenceFail("PROFILE_PRODUCTION_CLOCK", "profile smoke clock is invalid");
  }
  const receipt = Object.freeze({
    schema_version: PROFILE_PRODUCTION_API_SMOKE_SCHEMA,
    producer: "run-profile-production-api-smoke",
    generated_at: now.toISOString(),
    verdict: "PASS",
    source: Object.freeze({
      ...source,
      api_source_revision: health.sourceRevision,
    }),
    api_artifact: Object.freeze({
      filename: bindings.outerManifest.artifact_filename,
      sha256: bindings.outerManifest.artifact_sha256,
      bytes: bindings.outerManifest.artifact_byte_size,
    }),
    profile_photo: Object.freeze({
      generation_verified: true,
      expected_profile_count: PROFILE_PHOTO_EXPECTED_COUNT,
      passed_profile_count: reads.passed,
    }),
    profile_reads: reads,
    boundary: Object.freeze({
      authorized_production_read_only: true,
      health_get_count: 1,
      authenticated_get_count: PROFILE_PHOTO_EXPECTED_COUNT,
      total_get_count: PROFILE_PHOTO_EXPECTED_COUNT + 1,
      api_write_request_count: 0,
      external_mutation_count: 0,
      database_mutation_count: 0,
      aws_control_plane_call_count: 0,
      deployment_count: 0,
      desktop_deploy_count: 0,
      desktop_reinstall_count: 0,
      local_receipt_write_count: 1,
    }),
    private_values_emitted: false,
  });
  assertNoPrivateMaterial(receipt);
  try {
    writePrivateReceipt(receiptTarget, receipt, repoRoot, options.testReceiptIo);
  } catch {
    evidenceFail("PROFILE_PRODUCTION_RECEIPT_WRITE", "private aggregate receipt could not be written atomically");
  }
  return aggregate("PASS", { health, reads, receiptWritten: true });
}
