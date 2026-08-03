import { createHash } from "node:crypto";
import {
  chmodSync,
  closeSync,
  existsSync,
  lstatSync,
  openSync,
  readFileSync,
  readSync,
  realpathSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { canonicalizeJson } from "./runtime-safety-approval-contract.mjs";

export const SHA1 = /^[0-9a-f]{40}$/u;
export const SHA256 = /^[0-9a-f]{64}$/u;
export const SAFE_ID = /^[A-Za-z0-9._:@/+=-]{2,256}$/u;
export const MUTABLE_PATH = /(?:^|[._/\\-])(?:current|latest|mutable)(?:$|[._/\\-])/iu;

export class MatterRollbackContractError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "MatterRollbackContractError";
    this.code = code;
    Object.assign(this, details);
  }
}

export function fail(code, message, details = {}) {
  throw new MatterRollbackContractError(code, message, details);
}

export function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function exactKeys(value, expected, label) {
  if (!isRecord(value)) fail("MATTER_ROLLBACK_SHAPE", `${label} must be an object`);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) fail("MATTER_ROLLBACK_SHAPE", `${label} fields drifted`);
}

export function requiredText(value, label, pattern = SAFE_ID) {
  if (typeof value !== "string" || !value || (pattern && !pattern.test(value))) {
    fail("MATTER_ROLLBACK_VALUE", `${label} is invalid`);
  }
  return value;
}

export function timestamp(value, label) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u.test(value)) {
    fail("MATTER_ROLLBACK_TIMESTAMP", `${label} must be an RFC 3339 UTC timestamp`);
  }
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) fail("MATTER_ROLLBACK_TIMESTAMP", `${label} is invalid`);
  return parsed;
}

export function sha256Bytes(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function sha256File(filePath) {
  const handle = openSync(filePath, "r");
  const hash = createHash("sha256");
  const buffer = Buffer.allocUnsafe(1024 * 1024);
  try {
    for (;;) {
      const bytes = readSync(handle, buffer, 0, buffer.length, null);
      if (bytes === 0) break;
      hash.update(buffer.subarray(0, bytes));
    }
  } finally {
    closeSync(handle);
  }
  return hash.digest("hex");
}

export function canonicalSha256(value) {
  return sha256Bytes(canonicalizeJson(value));
}

export function outsideRoot(root, filePath) {
  const rel = relative(realpathSync(root), filePath);
  return rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel);
}

export function canonicalExistingFile(candidate, label) {
  if (typeof candidate !== "string" || !isAbsolute(candidate) || /[\0*?\[\]{}]/u.test(candidate)) {
    fail("MATTER_ROLLBACK_PATH", `${label} path is invalid`);
  }
  const input = resolve(candidate);
  if (!existsSync(input) || lstatSync(input).isSymbolicLink() || !statSync(input).isFile()) {
    fail("MATTER_ROLLBACK_PATH", `${label} must be an existing non-symlink regular file`);
  }
  const real = realpathSync(input);
  if (real !== input) fail("MATTER_ROLLBACK_PATH", `${label} path must be canonical and symlink-free`);
  return real;
}

export function validatePrivateFile(candidate, label, { repoRoot = process.cwd(), outsideWorktree = true } = {}) {
  const filePath = canonicalExistingFile(resolve(candidate), label);
  if ((statSync(filePath).mode & 0o077) !== 0) fail("MATTER_ROLLBACK_PATH", `${label} must be a private 0600 file`);
  if (outsideWorktree && !outsideRoot(repoRoot, filePath)) fail("MATTER_ROLLBACK_PATH", `${label} must remain outside the worktree`);
  return filePath;
}

export function describeFile(filePath, label = "artifact") {
  const path = canonicalExistingFile(filePath, label);
  return Object.freeze({ path, sha256: sha256File(path), bytes: statSync(path).size });
}

export function validateFileDescriptor(value, label, {
  privateFile = false,
  repoRoot = process.cwd(),
  immutableBinding = null,
} = {}) {
  exactKeys(value, ["path", "sha256", "bytes"], label);
  requiredText(value.sha256, `${label}.sha256`, SHA256);
  if (!Number.isInteger(value.bytes) || value.bytes <= 0) fail("MATTER_ROLLBACK_ARTIFACT", `${label}.bytes is invalid`);
  const path = privateFile
    ? validatePrivateFile(value.path, label, { repoRoot })
    : canonicalExistingFile(value.path, label);
  if (statSync(path).size !== value.bytes || sha256File(path) !== value.sha256) {
    fail("MATTER_ROLLBACK_ARTIFACT_HASH", `${label} bytes or SHA-256 do not match`);
  }
  if (immutableBinding && (MUTABLE_PATH.test(path) || (!path.includes(immutableBinding) && !path.includes(value.sha256)))) {
    fail("MATTER_ROLLBACK_MUTABLE_PATH", `${label} is not immutable-source scoped`);
  }
  return Object.freeze({ ...value, path });
}

export function readJsonFile(candidate, label, { privateFile = false, repoRoot = process.cwd() } = {}) {
  const path = privateFile
    ? validatePrivateFile(candidate, label, { repoRoot })
    : canonicalExistingFile(candidate, label);
  const bytes = readFileSync(path);
  let value;
  try {
    value = JSON.parse(bytes);
  } catch {
    fail("MATTER_ROLLBACK_JSON", `${label} is not valid JSON`);
  }
  return Object.freeze({ path, bytes: bytes.length, sha256: sha256Bytes(bytes), value });
}

export function resolvePrivateOutputPath(candidate, {
  repoRoot = process.cwd(),
  mustExist = false,
} = {}) {
  if (typeof candidate !== "string" || !isAbsolute(candidate) || /[\0*?\[\]{}]/u.test(candidate)) {
    fail("MATTER_ROLLBACK_OUTPUT_PATH", "rollback output path must be an absolute concrete path");
  }
  const path = resolve(candidate);
  if (!outsideRoot(repoRoot, path)) fail("MATTER_ROLLBACK_OUTPUT_PATH", "rollback output must remain outside the worktree");
  if (!existsSync(dirname(path)) || realpathSync(dirname(path)) !== dirname(path)) {
    fail("MATTER_ROLLBACK_OUTPUT_PATH", "rollback output parent must be an existing canonical directory");
  }
  if (mustExist) return validatePrivateFile(path, "rollback output", { repoRoot });
  if (existsSync(path)) fail("MATTER_ROLLBACK_OUTPUT_EXISTS", "rollback output already exists");
  return path;
}

export function writePrivateJson(path, value, { replace = false } = {}) {
  const body = `${JSON.stringify(value, null, 2)}\n`;
  const temporary = `${path}.tmp-${process.pid}`;
  let handle;
  try {
    handle = openSync(temporary, "wx", 0o600);
    writeFileSync(handle, body);
    chmodSync(temporary, 0o600);
    if (replace) {
      renameSync(temporary, path);
    } else {
      const target = openSync(path, "wx", 0o600);
      closeSync(target);
      renameSync(temporary, path);
    }
  } catch (error) {
    try { if (handle !== undefined) closeSync(handle); } catch {}
    try { if (existsSync(temporary)) unlinkSync(temporary); } catch {}
    if (error instanceof MatterRollbackContractError) throw error;
    fail("MATTER_ROLLBACK_OUTPUT_WRITE", "rollback output could not be written safely");
  }
  try { if (handle !== undefined) closeSync(handle); } catch {}
  return path;
}

export function parseMatterRollbackOptions(argv, { allowed, defaults = {} } = {}) {
  const values = { ...defaults };
  const seen = new Set();
  for (let index = 0; index < argv.length; index += 2) {
    const name = argv[index];
    const value = argv[index + 1];
    if (!allowed.includes(name) || seen.has(name) || !value || value.startsWith("--")) {
      fail("MATTER_ROLLBACK_ARGUMENT", "rollback command arguments are invalid");
    }
    seen.add(name);
    values[name.slice(2)] = value;
  }
  return Object.freeze(values);
}

export function emitMatterRollbackFailure(error, mutation = {}) {
  const code = typeof error?.code === "string" && /^[A-Z0-9_]{3,128}$/u.test(error.code)
    ? error.code
    : "MATTER_ROLLBACK_INTERNAL";
  const adapterStarted = mutation.adapter_started === true;
  const evidenceCommitState = error?.evidence_commit_state ?? mutation.evidence_commit_state ?? "not_started";
  const telemetry = Object.freeze({
    attempted: adapterStarted,
    started: adapterStarted,
    completed: false,
    failed: adapterStarted,
    unknown: adapterStarted,
  });
  const verdict = code.includes("AUTHORITY") || code.includes("APPROVAL") || code.includes("PROFILE") || code.includes("CHECKPOINT")
    ? "BLOCKED_BY_AUTHORITY"
    : code.includes("RECEIPT") || code.includes("ATTEST") || code.includes("SEAL") || code.includes("REPLAY")
      ? "BLOCKED_BY_EVIDENCE"
      : "FAIL";
  const evidenceUncertain = new Set([
    "partial_recovery_required", "committed", "committed_recovery_required",
  ]).has(evidenceCommitState);
  process.stderr.write(`${JSON.stringify({
    verdict,
    code,
    message: "rollback operation rejected by fail-closed contract",
    external_mutation_state: adapterStarted || evidenceUncertain ? "unknown_or_partial" : "not_started",
    external_mutation_executed: adapterStarted || evidenceUncertain ? null : false,
    mutation_telemetry: telemetry,
    evidence_commit_state: evidenceCommitState,
  })}\n`);
}
