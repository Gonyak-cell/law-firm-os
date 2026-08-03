import { createHash, randomBytes, randomUUID } from "node:crypto";
import {
  chmodSync,
  closeSync,
  existsSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  rmdirSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { hostname, tmpdir, userInfo } from "node:os";
import path from "node:path";
import { assertRf13DistFinalSealerCapability } from "./rf13-dist-contract.mjs";

export const RF13_DIST_AUTHORITY_CONSUMPTION_SCHEMA =
  "law-firm-os.rf13-dist.authority-consumption.v2";
export const RF13_DIST_TEST_AUTHORITY_CONSUMPTION_SCHEMA =
  "law-firm-os.rf13-dist.authority-consumption.test-only.v1";
export const RF13_DIST_AUTHORITY_WAL_SCHEMA =
  "law-firm-os.rf13-dist.authority-consumption-wal.v1";
export const RF13_DIST_TEST_LEDGER_FIXTURE_SCHEMA =
  "law-firm-os.rf13-dist.authority-ledger-fixture.TEST_ONLY.v1";

const SHA1 = /^[0-9a-f]{40}$/u;
const SHA256 = /^[0-9a-f]{64}$/u;
const VERSION = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/u;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,159}$/u;
const LEDGER_NAMESPACE = "com.amic.matter.desktop/rf13-dist-authority-ledger/v2";
const TEST_FIXTURES = new WeakSet();
const BINDING_KEYS = Object.freeze([
  "release_id",
  "environment",
  "action",
  "nonce",
  "source_sha",
  "source_tree",
  "artifact_sha256",
  "authority_receipt_id",
  "authority_receipt_sha256",
  "authority_key_id",
  "authority_key_fingerprint_sha256",
  "authority_signature_sha256",
  "authority_signed_payload_sha256",
]);

export class Rf13DistAuthorityLedgerError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "Rf13DistAuthorityLedgerError";
    this.code = code;
  }
}

function fail(code, message) {
  throw new Rf13DistAuthorityLedgerError(code, message);
}

function object(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail("AUTHORITY_CONSUMPTION_SHAPE_INVALID", `${label} must be an object`);
  }
  return value;
}

function exactKeys(value, keys, label) {
  object(value, label);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    fail("AUTHORITY_CONSUMPTION_SHAPE_INVALID", `${label} keys do not match the closed schema`);
  }
}

function digest(value, pattern, label) {
  if (typeof value !== "string" || !pattern.test(value)) {
    fail("AUTHORITY_CONSUMPTION_BINDING_INVALID", `${label} is invalid`);
  }
  return value;
}

function safeId(value, label) {
  if (typeof value !== "string" || !SAFE_ID.test(value)) {
    fail("AUTHORITY_CONSUMPTION_BINDING_INVALID", `${label} is invalid`);
  }
  return value;
}

function canonicalTimestamp(value, label) {
  if (typeof value !== "string"
    || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value)) {
    fail("AUTHORITY_CONSUMPTION_TIMESTAMP_INVALID", `${label} is invalid`);
  }
  try {
    if (new Date(value).toISOString() !== value) {
      fail("AUTHORITY_CONSUMPTION_TIMESTAMP_INVALID", `${label} is invalid`);
    }
  } catch {
    fail("AUTHORITY_CONSUMPTION_TIMESTAMP_INVALID", `${label} is invalid`);
  }
  return value;
}

function canonicalBytes(value) {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
}

function sha256Bytes(value) {
  return createHash("sha256").update(value).digest("hex");
}

function hashJson(value) {
  return sha256Bytes(JSON.stringify(value));
}

function sortedUnique(values, label) {
  if (!Array.isArray(values) || values.length === 0 || new Set(values).size !== values.length) {
    fail("AUTHORITY_CONSUMPTION_BINDING_INVALID", `${label} must be a non-empty unique list`);
  }
  const sorted = [...values].sort();
  if (JSON.stringify(values) !== JSON.stringify(sorted)) {
    fail("AUTHORITY_CONSUMPTION_BINDING_INVALID", `${label} must be sorted`);
  }
  return sorted;
}

function releaseVersion(binding) {
  const prefix = "RF13-DIST-";
  const suffix = `-${binding.source_sha}`;
  const version = binding.release_id.startsWith(prefix) && binding.release_id.endsWith(suffix)
    ? binding.release_id.slice(prefix.length, -suffix.length)
    : null;
  if (!VERSION.test(version ?? "") || binding.release_id !== `${prefix}${version}${suffix}`) {
    fail(
      "AUTHORITY_CONSUMPTION_RELEASE_INVALID",
      "authority consumption release ID does not bind its exact version and source SHA",
    );
  }
  return version;
}

export function rf13DistAuthorityConsumptionIdentity(binding, { testOnly = false } = {}) {
  exactKeys(binding, BINDING_KEYS, "authority consumption binding");
  if (typeof testOnly !== "boolean") {
    fail("AUTHORITY_CONSUMPTION_TEST_BOUNDARY_INVALID", "testOnly must be a boolean");
  }
  safeId(binding.release_id, "release_id");
  safeId(binding.nonce, "nonce");
  safeId(binding.authority_receipt_id, "authority_receipt_id");
  safeId(binding.authority_key_id, "authority_key_id");
  if (!new Set(["canary", "production"]).has(binding.environment)
    || !new Set(["canary_acceptance", "production_go_live"]).has(binding.action)
    || (binding.action === "canary_acceptance") !== (binding.environment === "canary")) {
    fail("AUTHORITY_CONSUMPTION_ACTION_INVALID", "authority action and environment are invalid");
  }
  digest(binding.source_sha, SHA1, "source_sha");
  digest(binding.source_tree, SHA1, "source_tree");
  for (const field of [
    "authority_receipt_sha256",
    "authority_key_fingerprint_sha256",
    "authority_signature_sha256",
    "authority_signed_payload_sha256",
  ]) digest(binding[field], SHA256, field);
  const version = releaseVersion(binding);
  const artifacts = sortedUnique(binding.artifact_sha256, "artifact_sha256");
  artifacts.forEach((value) => digest(value, SHA256, "artifact_sha256 member"));
  const schemaVersion = testOnly
    ? RF13_DIST_TEST_AUTHORITY_CONSUMPTION_SCHEMA
    : RF13_DIST_AUTHORITY_CONSUMPTION_SCHEMA;
  const slot = {
    schema_version: schemaVersion,
    release_id: binding.release_id,
    environment: binding.environment,
    action: binding.action,
    source_sha: binding.source_sha,
    source_tree: binding.source_tree,
    artifact_sha256: artifacts,
  };
  const authority = {
    authority_receipt_id: binding.authority_receipt_id,
    authority_receipt_sha256: binding.authority_receipt_sha256,
    authority_key_id: binding.authority_key_id,
    authority_key_fingerprint_sha256: binding.authority_key_fingerprint_sha256,
    authority_signature_sha256: binding.authority_signature_sha256,
    authority_signed_payload_sha256: binding.authority_signed_payload_sha256,
  };
  return Object.freeze({
    artifact_sha256: Object.freeze(artifacts),
    binding_sha256: hashJson({ ...slot, ...authority }),
    consumption_key_sha256: hashJson({ ...slot, ...authority, nonce: binding.nonce }),
    release_version: version,
    schema_version: schemaVersion,
    slot_sha256: hashJson(slot),
  });
}

function fsyncDirectory(directoryPath) {
  if (process.platform === "win32") return;
  const descriptor = openSync(directoryPath, "r");
  try {
    fsyncSync(descriptor);
  } finally {
    closeSync(descriptor);
  }
}

function effectiveUid(stat) {
  return typeof process.geteuid === "function" ? process.geteuid() : stat.uid;
}

function assertSecureDirectory(directoryPath, label) {
  let stat;
  try {
    stat = lstatSync(directoryPath);
  } catch {
    fail("AUTHORITY_CONSUMPTION_LEDGER_INVALID", `${label} is missing`);
  }
  if (stat.isSymbolicLink() || !stat.isDirectory() || realpathSync(directoryPath) !== path.resolve(directoryPath)) {
    fail("AUTHORITY_CONSUMPTION_LEDGER_INVALID", `${label} must be a canonical non-symlink directory`);
  }
  if (process.platform !== "win32" && ((stat.mode & 0o077) !== 0 || stat.uid !== effectiveUid(stat))) {
    fail("AUTHORITY_CONSUMPTION_LEDGER_INVALID", `${label} must be private and owned by the current operator`);
  }
  return directoryPath;
}

function ensureSecureDirectory(directoryPath, { recursive = false, label = "authority ledger directory" } = {}) {
  let created = false;
  try {
    const firstCreated = mkdirSync(directoryPath, { recursive, mode: 0o700 });
    created = firstCreated !== undefined;
  } catch (error) {
    if (error?.code !== "EEXIST") {
      fail("AUTHORITY_CONSUMPTION_WRITE_FAILED", `${label} could not be created`);
    }
  }
  if (created && process.platform !== "win32") chmodSync(directoryPath, 0o700);
  return assertSecureDirectory(directoryPath, label);
}

function assertPrivateFile(filePath, label) {
  let stat;
  try {
    stat = lstatSync(filePath);
  } catch {
    fail("AUTHORITY_CONSUMPTION_LEDGER_INVALID", `${label} is missing`);
  }
  if (stat.isSymbolicLink() || !stat.isFile() || realpathSync(filePath) !== path.resolve(filePath)) {
    fail("AUTHORITY_CONSUMPTION_LEDGER_INVALID", `${label} must be a canonical regular file`);
  }
  if (process.platform !== "win32" && ((stat.mode & 0o077) !== 0 || stat.uid !== effectiveUid(stat))) {
    fail("AUTHORITY_CONSUMPTION_LEDGER_INVALID", `${label} must be private and owned by the current operator`);
  }
  return stat;
}

function writePrivateFileExclusive(filePath, bytes) {
  let descriptor;
  try {
    descriptor = openSync(filePath, "wx", 0o600);
    writeFileSync(descriptor, bytes);
    fsyncSync(descriptor);
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
  }
  if (process.platform !== "win32") chmodSync(filePath, 0o600);
  if (!readFileSync(filePath).equals(bytes)) {
    fail("AUTHORITY_CONSUMPTION_WRITE_FAILED", "private ledger file failed readback");
  }
}

function operationalStateRoot() {
  let home;
  try {
    home = realpathSync(userInfo().homedir);
  } catch {
    fail("AUTHORITY_CONSUMPTION_LEDGER_INVALID", "the current operator home directory is unavailable");
  }
  const relative = process.platform === "darwin"
    ? ["Library", "Application Support", "com.amic.matter.desktop", "rf13-dist-authority-ledger", "v2"]
    : process.platform === "win32"
      ? ["AppData", "Local", "com.amic.matter.desktop", "rf13-dist-authority-ledger", "v2"]
      : [".local", "state", "com.amic.matter.desktop", "rf13-dist-authority-ledger", "v2"];
  const root = path.join(home, ...relative);
  const relation = path.relative(home, root);
  if (!relation || relation.startsWith(`..${path.sep}`) || path.isAbsolute(relation)) {
    fail("AUTHORITY_CONSUMPTION_LEDGER_INVALID", "the per-user authority ledger path is invalid");
  }
  return ensureSecureDirectory(root, { recursive: true, label: "per-user authority ledger" });
}

function currentOwner() {
  return Object.freeze({
    pid: process.pid,
    host_sha256: sha256Bytes(hostname()),
    instance_id: randomUUID(),
    started_at: new Date().toISOString(),
    process_start_epoch_ms: Math.max(0, Math.floor(Date.now() - process.uptime() * 1_000)),
  });
}

function validateOwner(owner) {
  exactKeys(owner, ["pid", "host_sha256", "instance_id", "started_at", "process_start_epoch_ms"], "WAL owner");
  if (!Number.isSafeInteger(owner.pid) || owner.pid < 1
    || !Number.isSafeInteger(owner.process_start_epoch_ms) || owner.process_start_epoch_ms < 0) {
    fail("AUTHORITY_CONSUMPTION_RECOVERY_REQUIRED", "WAL owner process metadata is invalid");
  }
  digest(owner.host_sha256, SHA256, "WAL owner host hash");
  safeId(owner.instance_id, "WAL owner instance id");
  canonicalTimestamp(owner.started_at, "WAL owner started_at");
  return owner;
}

function ownerState(owner) {
  if (owner.host_sha256 !== sha256Bytes(hostname())) return "UNKNOWN";
  try {
    process.kill(owner.pid, 0);
    return "LIVE";
  } catch (error) {
    if (error?.code === "ESRCH") return "DEAD";
    if (error?.code === "EPERM") return "LIVE";
    return "UNKNOWN";
  }
}

function walRecord(expected, owner, { phase = "PREPARED", targetSha256 = null, recovery = null } = {}) {
  return {
    schema_version: RF13_DIST_AUTHORITY_WAL_SCHEMA,
    receipt_schema_version: expected.schema_version,
    test_only: expected.test_only,
    slot_sha256: expected.slot_sha256,
    binding_sha256: expected.binding_sha256,
    consumption_key_sha256: expected.consumption_key_sha256,
    owner,
    phase,
    target_sha256: targetSha256,
    recovery: recovery ?? {
      count: 0,
      recovered_from_wal_sha256: null,
      recovered_at: null,
    },
  };
}

function validateWalRecord(record, expected) {
  exactKeys(record, [
    "schema_version",
    "receipt_schema_version",
    "test_only",
    "slot_sha256",
    "binding_sha256",
    "consumption_key_sha256",
    "owner",
    "phase",
    "target_sha256",
    "recovery",
  ], "authority WAL record");
  exactKeys(record.recovery, ["count", "recovered_from_wal_sha256", "recovered_at"], "authority WAL recovery");
  validateOwner(record.owner);
  if (record.schema_version !== RF13_DIST_AUTHORITY_WAL_SCHEMA
    || record.receipt_schema_version !== expected.schema_version
    || record.test_only !== expected.test_only
    || record.slot_sha256 !== expected.slot_sha256
    || record.binding_sha256 !== expected.binding_sha256
    || record.consumption_key_sha256 !== expected.consumption_key_sha256) {
    fail("AUTHORITY_CONSUMPTION_RECOVERY_REQUIRED", "WAL binding conflicts with the requested authority action");
  }
  if (!new Set(["PREPARED", "RECEIPT_PUBLISHED"]).has(record.phase)
    || (record.phase === "PREPARED" && record.target_sha256 !== null)
    || (record.phase === "RECEIPT_PUBLISHED" && !SHA256.test(record.target_sha256 ?? ""))
    || !Number.isSafeInteger(record.recovery.count)
    || record.recovery.count < 0
    || (record.recovery.recovered_from_wal_sha256 !== null
      && !SHA256.test(record.recovery.recovered_from_wal_sha256))
    || (record.recovery.recovered_at !== null
      && typeof record.recovery.recovered_at !== "string")) {
    fail("AUTHORITY_CONSUMPTION_RECOVERY_REQUIRED", "WAL state is malformed");
  }
  if (record.recovery.recovered_at !== null) {
    try {
      canonicalTimestamp(record.recovery.recovered_at, "WAL recovery timestamp");
    } catch {
      fail("AUTHORITY_CONSUMPTION_RECOVERY_REQUIRED", "WAL state is malformed");
    }
  }
  return record;
}

function readWal(walPath, expected) {
  try {
    assertSecureDirectory(walPath, "authority WAL directory");
    const recordPath = path.join(walPath, "owner.json");
    assertPrivateFile(recordPath, "authority WAL owner record");
    const bytes = readFileSync(recordPath);
    const parsed = JSON.parse(bytes.toString("utf8"));
    if (!bytes.equals(canonicalBytes(parsed))) {
      fail("AUTHORITY_CONSUMPTION_RECOVERY_REQUIRED", "WAL bytes are not canonical");
    }
    return Object.freeze({
      record: validateWalRecord(parsed, expected),
      record_sha256: sha256Bytes(bytes),
      record_path: recordPath,
    });
  } catch (error) {
    if (error instanceof Rf13DistAuthorityLedgerError
      && error.code === "AUTHORITY_CONSUMPTION_RECOVERY_REQUIRED") throw error;
    fail("AUTHORITY_CONSUMPTION_RECOVERY_REQUIRED", "WAL record is missing or malformed");
  }
}

function updateWal(walPath, record) {
  const target = path.join(walPath, "owner.json");
  const temporary = path.join(walPath, `.owner.${process.pid}.${randomUUID()}.tmp`);
  const bytes = canonicalBytes(record);
  try {
    writePrivateFileExclusive(temporary, bytes);
    renameSync(temporary, target);
    fsyncDirectory(walPath);
  } finally {
    if (existsSync(temporary)) {
      try { unlinkSync(temporary); } catch {}
    }
  }
}

function quarantineDeadWal(ledgerRoot, walPath, walRead) {
  const stamp = new Date().toISOString().replaceAll(/[^0-9]/gu, "");
  const orphan = path.join(
    ledgerRoot,
    `${walRead.record.slot_sha256}.orphan.${stamp}.${randomUUID()}`,
  );
  try {
    renameSync(walPath, orphan);
    fsyncDirectory(ledgerRoot);
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    fail("AUTHORITY_CONSUMPTION_RECOVERY_REQUIRED", "dead-owner WAL could not be quarantined");
  }
  return Object.freeze({
    orphan_path: orphan,
    recovery: {
      count: walRead.record.recovery.count + 1,
      recovered_from_wal_sha256: walRead.record_sha256,
      recovered_at: new Date().toISOString(),
    },
  });
}

function createWal(ledgerRoot, walPath, expected, recovery) {
  mkdirSync(walPath, { mode: 0o700 });
  if (process.platform !== "win32") chmodSync(walPath, 0o700);
  assertSecureDirectory(walPath, "authority WAL directory");
  const owner = currentOwner();
  const record = walRecord(expected, owner, { recovery });
  try {
    writePrivateFileExclusive(path.join(walPath, "owner.json"), canonicalBytes(record));
    fsyncDirectory(walPath);
    fsyncDirectory(ledgerRoot);
  } catch (error) {
    try { rmSync(walPath, { recursive: true, force: true }); } catch {}
    if (error instanceof Rf13DistAuthorityLedgerError) throw error;
    fail("AUTHORITY_CONSUMPTION_WRITE_FAILED", "authority WAL could not be prepared");
  }
  return Object.freeze({ wal_path: walPath, owner, record });
}

function acquireWal(ledgerRoot, walPath, expected) {
  let recovery = null;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      return createWal(ledgerRoot, walPath, expected, recovery?.recovery);
    } catch (error) {
      if (error?.code !== "EEXIST") {
        if (error instanceof Rf13DistAuthorityLedgerError) throw error;
        fail("AUTHORITY_CONSUMPTION_WRITE_FAILED", "authority WAL could not be acquired");
      }
    }
    const current = readWal(walPath, expected);
    const state = ownerState(current.record.owner);
    if (state === "LIVE") {
      fail("AUTHORITY_CONSUMPTION_IN_PROGRESS", "authority action is owned by a live process");
    }
    if (state !== "DEAD") {
      fail("AUTHORITY_CONSUMPTION_RECOVERY_REQUIRED", "WAL owner liveness cannot be proven");
    }
    if (current.record.phase === "RECEIPT_PUBLISHED") {
      fail("AUTHORITY_CONSUMPTION_RECOVERY_REQUIRED", "published WAL is missing its committed receipt");
    }
    recovery = quarantineDeadWal(ledgerRoot, walPath, current);
    if (recovery === null) continue;
  }
  fail("AUTHORITY_CONSUMPTION_RECOVERY_REQUIRED", "authority WAL recovery did not converge");
}

function removeOwnedWal(ledgerRoot, claim) {
  const current = readWal(claim.wal_path, {
    schema_version: claim.record.receipt_schema_version,
    test_only: claim.record.test_only,
    slot_sha256: claim.record.slot_sha256,
    binding_sha256: claim.record.binding_sha256,
    consumption_key_sha256: claim.record.consumption_key_sha256,
  });
  if (current.record.owner.instance_id !== claim.owner.instance_id
    || current.record.owner.pid !== claim.owner.pid) {
    fail("AUTHORITY_CONSUMPTION_RECOVERY_REQUIRED", "authority WAL ownership changed during commit");
  }
  try {
    unlinkSync(current.record_path);
    rmdirSync(claim.wal_path);
    fsyncDirectory(ledgerRoot);
  } catch {
    fail("AUTHORITY_CONSUMPTION_RECOVERY_REQUIRED", "committed authority WAL requires recovery");
  }
}

function expectedReceipt(binding, identity, testOnly) {
  return {
    schema_version: identity.schema_version,
    test_only: testOnly,
    ledger_namespace: LEDGER_NAMESPACE,
    release_id: binding.release_id,
    environment: binding.environment,
    action: binding.action,
    nonce: binding.nonce,
    source_sha: binding.source_sha,
    source_tree: binding.source_tree,
    artifact_sha256: identity.artifact_sha256,
    slot_sha256: identity.slot_sha256,
    binding_sha256: identity.binding_sha256,
    authority_receipt_id: binding.authority_receipt_id,
    authority_receipt_sha256: binding.authority_receipt_sha256,
    authority_key_id: binding.authority_key_id,
    authority_key_fingerprint_sha256: binding.authority_key_fingerprint_sha256,
    authority_signature_sha256: binding.authority_signature_sha256,
    authority_signed_payload_sha256: binding.authority_signed_payload_sha256,
    consumption_key_sha256: identity.consumption_key_sha256,
  };
}

function readCommittedReceipt(targetPath, expected) {
  try {
    assertPrivateFile(targetPath, "authority consumption receipt");
    const bytes = readFileSync(targetPath);
    const receipt = JSON.parse(bytes.toString("utf8"));
    exactKeys(receipt, [
      ...Object.keys(expected),
      "writer",
      "recovery",
      "committed_at",
    ], "authority consumption receipt");
    exactKeys(receipt.writer, ["pid", "host_sha256", "instance_id"], "authority receipt writer");
    exactKeys(receipt.recovery, ["count", "recovered_from_wal_sha256", "recovered_at"], "authority receipt recovery");
    canonicalTimestamp(receipt.committed_at, "committed_at");
    validateOwner({
      ...receipt.writer,
      started_at: receipt.committed_at,
      process_start_epoch_ms: 0,
    });
    validateWalRecord(walRecord(expected, {
      ...receipt.writer,
      started_at: receipt.committed_at,
      process_start_epoch_ms: 0,
    }, { recovery: receipt.recovery }), expected);
    for (const [field, value] of Object.entries(expected)) {
      if (JSON.stringify(receipt[field]) !== JSON.stringify(value)) {
        fail("AUTHORITY_ACTION_ALREADY_CONSUMED", "authority action was consumed by a different receipt or key");
      }
    }
    if (!bytes.equals(canonicalBytes(receipt))) {
      fail("AUTHORITY_CONSUMPTION_LEDGER_INVALID", "authority receipt bytes are not canonical");
    }
    return Object.freeze({ receipt: Object.freeze(receipt), path: targetPath, sha256: sha256Bytes(bytes), bytes: bytes.length });
  } catch (error) {
    if (error instanceof Rf13DistAuthorityLedgerError) throw error;
    fail("AUTHORITY_CONSUMPTION_LEDGER_INVALID", "committed authority receipt cannot be read");
  }
}

function recoverPublishedReceipt(ledgerRoot, walPath, targetPath, expected) {
  const committed = readCommittedReceipt(targetPath, expected);
  if (!existsSync(walPath)) {
    return Object.freeze({ ...committed, idempotent_replay: true, recovered_from_dead_owner: false });
  }
  const current = readWal(walPath, expected);
  const state = ownerState(current.record.owner);
  if (state === "LIVE") {
    fail("AUTHORITY_CONSUMPTION_IN_PROGRESS", "published authority action is still owned by a live process");
  }
  if (state !== "DEAD") {
    fail("AUTHORITY_CONSUMPTION_RECOVERY_REQUIRED", "published WAL owner liveness cannot be proven");
  }
  if (current.record.phase === "RECEIPT_PUBLISHED"
    && current.record.target_sha256 !== committed.sha256) {
    fail("AUTHORITY_CONSUMPTION_RECOVERY_REQUIRED", "published WAL target hash conflicts with the receipt");
  }
  const quarantine = quarantineDeadWal(ledgerRoot, walPath, current);
  if (quarantine === null) {
    return recoverPublishedReceipt(ledgerRoot, walPath, targetPath, expected);
  }
  return Object.freeze({
    ...committed,
    idempotent_replay: true,
    recovered_from_dead_owner: true,
    recovery_record_sha256: quarantine.recovery.recovered_from_wal_sha256,
  });
}

function commitAuthorityConsumption({ ledgerRoot, binding, testOnly, committedAt, onPhase }) {
  const identity = rf13DistAuthorityConsumptionIdentity(binding, { testOnly });
  const expected = expectedReceipt(binding, identity, testOnly);
  canonicalTimestamp(committedAt, "committedAt");
  ensureSecureDirectory(ledgerRoot, { recursive: true, label: "authority ledger namespace" });
  const targetPath = path.join(ledgerRoot, `${identity.slot_sha256}.json`);
  const walPath = path.join(ledgerRoot, `${identity.slot_sha256}.wal`);
  if (existsSync(targetPath)) return recoverPublishedReceipt(ledgerRoot, walPath, targetPath, expected);
  const claim = acquireWal(ledgerRoot, walPath, expected);
  let temporaryPath = null;
  let published = false;
  try {
    onPhase?.("WAL_PREPARED", Object.freeze({ slot_sha256: identity.slot_sha256 }));
    if (existsSync(targetPath)) {
      removeOwnedWal(ledgerRoot, claim);
      return recoverPublishedReceipt(ledgerRoot, walPath, targetPath, expected);
    }
    const receipt = {
      ...expected,
      writer: {
        pid: claim.owner.pid,
        host_sha256: claim.owner.host_sha256,
        instance_id: claim.owner.instance_id,
      },
      recovery: claim.record.recovery,
      committed_at: committedAt,
    };
    const bytes = canonicalBytes(receipt);
    temporaryPath = path.join(ledgerRoot, `.${identity.slot_sha256}.${process.pid}.${randomUUID()}.tmp`);
    writePrivateFileExclusive(temporaryPath, bytes);
    renameSync(temporaryPath, targetPath);
    temporaryPath = null;
    published = true;
    fsyncDirectory(ledgerRoot);
    const targetSha256 = sha256Bytes(bytes);
    const publishedRecord = {
      ...claim.record,
      phase: "RECEIPT_PUBLISHED",
      target_sha256: targetSha256,
    };
    updateWal(walPath, publishedRecord);
    onPhase?.("RECEIPT_PUBLISHED", Object.freeze({ slot_sha256: identity.slot_sha256 }));
    const committed = readCommittedReceipt(targetPath, expected);
    removeOwnedWal(ledgerRoot, { ...claim, record: publishedRecord });
    return Object.freeze({
      ...committed,
      idempotent_replay: false,
      recovered_from_dead_owner: claim.record.recovery.count > 0,
      recovery_record_sha256: claim.record.recovery.recovered_from_wal_sha256,
    });
  } catch (error) {
    if (!published && existsSync(walPath)) {
      try { removeOwnedWal(ledgerRoot, claim); } catch {}
    }
    if (error instanceof Rf13DistAuthorityLedgerError) throw error;
    fail(
      published ? "AUTHORITY_CONSUMPTION_RECOVERY_REQUIRED" : "AUTHORITY_CONSUMPTION_WRITE_FAILED",
      published
        ? "authority receipt was published but WAL recovery is required"
        : "authority action consumption could not be committed",
    );
  } finally {
    if (temporaryPath && existsSync(temporaryPath)) {
      try { unlinkSync(temporaryPath); } catch {}
    }
  }
}

export function sealRf13DistAuthorityActions(finalSealerCapability) {
  const capability = assertRf13DistFinalSealerCapability(finalSealerCapability);
  const ledgerRoot = operationalStateRoot();
  return Object.freeze(capability.actions.map((binding) => {
    const result = commitAuthorityConsumption({
      ledgerRoot,
      binding,
      testOnly: false,
      committedAt: new Date().toISOString(),
    });
    return Object.freeze({
      ledger_namespace: LEDGER_NAMESPACE,
      slot_sha256: result.receipt.slot_sha256,
      receipt_sha256: result.sha256,
      bytes: result.bytes,
      idempotent_replay: result.idempotent_replay,
      recovered_from_dead_owner: result.recovered_from_dead_owner,
      recovery_record_sha256: result.recovery_record_sha256 ?? null,
    });
  }));
}

function fixtureCapability(value) {
  if (!value || !TEST_FIXTURES.has(value)
    || value.schema_version !== RF13_DIST_TEST_LEDGER_FIXTURE_SCHEMA
    || value.test_only !== true) {
    fail("AUTHORITY_CONSUMPTION_TEST_FIXTURE_REQUIRED", "an opaque TEST_ONLY ledger fixture is required");
  }
  return value;
}

function mintFixture({ descriptor, claimToken }) {
  const capability = Object.freeze({
    schema_version: RF13_DIST_TEST_LEDGER_FIXTURE_SCHEMA,
    test_only: true,
    fixture_id: descriptor.fixture_id,
    ledger_root: descriptor.ledger_root,
    descriptor_path: descriptor.descriptor_path,
    claim_token: claimToken,
  });
  TEST_FIXTURES.add(capability);
  return capability;
}

export function createTestOnlyRf13DistLedgerFixture() {
  const root = mkdtempSync(path.join(realpathSync(tmpdir()), "rf13-dist-ledger-test-"));
  if (process.platform !== "win32") chmodSync(root, 0o700);
  assertSecureDirectory(root, "TEST_ONLY fixture root");
  const ledgerRoot = ensureSecureDirectory(path.join(root, "ledger"), { label: "TEST_ONLY ledger root" });
  const claimToken = randomBytes(32).toString("hex");
  const descriptorPath = path.join(root, "fixture.json");
  const descriptor = {
    schema_version: RF13_DIST_TEST_LEDGER_FIXTURE_SCHEMA,
    test_only: true,
    fixture_id: `TEST_ONLY_${randomUUID()}`,
    ledger_root: ledgerRoot,
    descriptor_path: descriptorPath,
    claim_token_sha256: sha256Bytes(claimToken),
  };
  writePrivateFileExclusive(descriptorPath, canonicalBytes(descriptor));
  fsyncDirectory(root);
  return mintFixture({ descriptor, claimToken });
}

export function claimTestOnlyRf13DistLedgerFixture({ descriptorPath, claimToken } = {}) {
  if (typeof descriptorPath !== "string" || !path.isAbsolute(descriptorPath)
    || typeof claimToken !== "string" || !/^[0-9a-f]{64}$/u.test(claimToken)) {
    fail("AUTHORITY_CONSUMPTION_TEST_FIXTURE_REQUIRED", "TEST_ONLY fixture claim is invalid");
  }
  const root = path.dirname(descriptorPath);
  const temporaryRoot = realpathSync(tmpdir());
  if (path.dirname(root) !== temporaryRoot || !path.basename(root).startsWith("rf13-dist-ledger-test-")) {
    fail("AUTHORITY_CONSUMPTION_TEST_FIXTURE_REQUIRED", "TEST_ONLY fixture must use the internal temporary namespace");
  }
  assertSecureDirectory(root, "TEST_ONLY fixture root");
  assertPrivateFile(descriptorPath, "TEST_ONLY fixture descriptor");
  const bytes = readFileSync(descriptorPath);
  let descriptor;
  try {
    descriptor = JSON.parse(bytes.toString("utf8"));
  } catch {
    fail("AUTHORITY_CONSUMPTION_TEST_FIXTURE_REQUIRED", "TEST_ONLY fixture descriptor is malformed");
  }
  exactKeys(descriptor, [
    "schema_version",
    "test_only",
    "fixture_id",
    "ledger_root",
    "descriptor_path",
    "claim_token_sha256",
  ], "TEST_ONLY fixture descriptor");
  if (!bytes.equals(canonicalBytes(descriptor))
    || descriptor.schema_version !== RF13_DIST_TEST_LEDGER_FIXTURE_SCHEMA
    || descriptor.test_only !== true
    || descriptor.descriptor_path !== descriptorPath
    || descriptor.ledger_root !== path.join(root, "ledger")
    || descriptor.claim_token_sha256 !== sha256Bytes(claimToken)) {
    fail("AUTHORITY_CONSUMPTION_TEST_FIXTURE_REQUIRED", "TEST_ONLY fixture descriptor or token is invalid");
  }
  safeId(descriptor.fixture_id, "TEST_ONLY fixture id");
  assertSecureDirectory(descriptor.ledger_root, "TEST_ONLY ledger root");
  return mintFixture({ descriptor, claimToken });
}

export function runTestOnlyRf13DistAuthorityConsumption(fixture, {
  binding,
  committedAt = new Date().toISOString(),
  onPhase,
} = {}) {
  const capability = fixtureCapability(fixture);
  if (onPhase !== undefined && typeof onPhase !== "function") {
    fail("AUTHORITY_CONSUMPTION_TEST_BOUNDARY_INVALID", "TEST_ONLY phase observer must be a function");
  }
  const result = commitAuthorityConsumption({
    ledgerRoot: capability.ledger_root,
    binding,
    testOnly: true,
    committedAt,
    onPhase,
  });
  return Object.freeze({
    status: "TEST_ONLY",
    operational: false,
    receipt: result.receipt,
    path: result.path,
    sha256: result.sha256,
    bytes: result.bytes,
    idempotent_replay: result.idempotent_replay,
    recovered_from_dead_owner: result.recovered_from_dead_owner,
    recovery_record_sha256: result.recovery_record_sha256 ?? null,
  });
}

export function disposeTestOnlyRf13DistLedgerFixture(fixture) {
  const capability = fixtureCapability(fixture);
  rmSync(path.dirname(capability.ledger_root), { recursive: true, force: true });
}
