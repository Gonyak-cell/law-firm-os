import { homedir } from "node:os";
import {
  lstatSync,
  readFileSync,
  readlinkSync,
  realpathSync,
  statSync,
} from "node:fs";
import { dirname, isAbsolute, join, parse, relative, resolve, sep } from "node:path";

export const PROFILE_PHOTO_SAFE_ROOT_SCHEMA = "law-firm-os.profile-photo-safe-root.v2";
export const PROFILE_PHOTO_SAFE_ROOT_SENTINEL = ".lawos-profile-media-root.json";
export const PROFILE_PHOTO_OPERATION_JOURNAL = ".lawos-profile-media-operations.jsonl";
export const PROFILE_PHOTO_CHANGE_REF = /^profile_change_[a-f0-9]{32}$/u;
export const PROFILE_PHOTO_GENERATION_REF = /^profile_generation_[a-f0-9]{32}$/u;

export class ProfilePhotoOperationError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "ProfilePhotoOperationError";
    this.code = code;
  }
}

export function operationFail(code, message) {
  throw new ProfilePhotoOperationError(code, message);
}

function exactKeys(value, keys, code) {
  if (!value || typeof value !== "object" || Array.isArray(value)) operationFail(code, "safe-root metadata must be an object");
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) operationFail(code, "safe-root metadata fields are invalid");
}

export function isInside(root, candidate) {
  const rel = relative(root, candidate);
  return rel !== "" && rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
}

export function canonicalDirectory(path, label) {
  try {
    if (!isAbsolute(path) || resolve(path) !== path || lstatSync(path).isSymbolicLink()
      || !statSync(path).isDirectory() || realpathSync(path) !== path) throw new Error();
  } catch {
    operationFail("OPERATION_PATH_INVALID", `${label} must be a canonical symlink-free directory`);
  }
  return path;
}

export function canonicalRegularFile(path, label, { ownerOnly = false } = {}) {
  try {
    if (!isAbsolute(path) || resolve(path) !== path || lstatSync(path).isSymbolicLink()
      || !statSync(path).isFile() || realpathSync(path) !== path) throw new Error();
    if (ownerOnly && (statSync(path).mode & 0o077) !== 0) throw new Error();
  } catch {
    operationFail("OPERATION_PATH_INVALID", `${label} must be a canonical owner-only non-symlink file`);
  }
  return path;
}

export function validateChangeRef(changeRef) {
  if (typeof changeRef !== "string" || !PROFILE_PHOTO_CHANGE_REF.test(changeRef)) {
    operationFail("CHANGE_REF_INVALID", "change ref must be an opaque generated reference");
  }
  return changeRef;
}

export function candidateGenerationRef(changeRef) {
  return `profile_generation_${validateChangeRef(changeRef).slice("profile_change_".length)}`;
}

export function validateGenerationRef(generationRef) {
  if (typeof generationRef !== "string" || !PROFILE_PHOTO_GENERATION_REF.test(generationRef)) {
    operationFail("GENERATION_REF_INVALID", "generation ref must be an opaque generated reference");
  }
  return generationRef;
}

function broadRoot(path) {
  const filesystemRoot = parse(path).root;
  const depth = path.slice(filesystemRoot.length).split(sep).filter(Boolean).length;
  return depth < 2 || [filesystemRoot, homedir(), dirname(homedir())].includes(path);
}

export function validateProfilePhotoSafeRoot(root, { testOnly = false, now = new Date() } = {}) {
  const canonical = canonicalDirectory(root, "approved profile-photo root");
  if (broadRoot(canonical)) operationFail("SAFE_ROOT_BROAD", "approved profile-photo root is too broad");
  const sentinelPath = join(canonical, PROFILE_PHOTO_SAFE_ROOT_SENTINEL);
  const journalPath = join(canonical, PROFILE_PHOTO_OPERATION_JOURNAL);
  canonicalRegularFile(sentinelPath, "safe-root sentinel", { ownerOnly: true });
  canonicalRegularFile(journalPath, "operation journal", { ownerOnly: true });
  let metadata;
  try {
    metadata = JSON.parse(readFileSync(sentinelPath, "utf8"));
  } catch {
    operationFail("SAFE_ROOT_SENTINEL_INVALID", "safe-root sentinel is not valid JSON");
  }
  exactKeys(metadata, ["schema_version", "environment", "initialized_at"], "SAFE_ROOT_SENTINEL_INVALID");
  if (metadata.schema_version !== PROFILE_PHOTO_SAFE_ROOT_SCHEMA
    || metadata.environment !== "TEST_ONLY" || testOnly !== true) {
    operationFail("SAFE_ROOT_SENTINEL_INVALID", "source-tree operations require an explicit TEST_ONLY root");
  }
  const initializedAt = Date.parse(metadata.initialized_at);
  if (typeof metadata.initialized_at !== "string"
    || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(metadata.initialized_at)
    || !Number.isFinite(initializedAt) || initializedAt > now.valueOf()) {
    operationFail("SAFE_ROOT_SENTINEL_INVALID", "safe-root initialization timestamp is invalid");
  }
  return Object.freeze({ root: canonical, sentinelPath, journalPath, metadata: Object.freeze({ ...metadata }) });
}

export function profilePhotoOperationPaths(root, changeRef) {
  const safeRef = validateChangeRef(changeRef);
  const generationRef = candidateGenerationRef(safeRef);
  const paths = Object.freeze({
    sourceParent: join(root, "incoming"),
    source: join(root, "incoming", safeRef),
    active: join(root, "active"),
    generations: join(root, "generations"),
    manifests: join(root, ".manifests"),
    operations: join(root, ".operations"),
    preparing: join(root, `.preparing-${safeRef}`),
    pointerTemp: join(root, `.active-pointer-${safeRef}`),
    candidateGeneration: join(root, "generations", generationRef),
    baselineManifest: join(root, ".manifests", `.baseline-${safeRef}.json`),
    candidateManifest: join(root, ".manifests", `.candidate-${safeRef}.json`),
    operationRecord: join(root, ".operations", `${safeRef}.json`),
  });
  if (Object.values(paths).some((path) => !isInside(root, path))) operationFail("OPERATION_PATH_ESCAPE", "operation path escaped approved root");
  return paths;
}

export function resolveActiveGeneration(root) {
  const generations = canonicalDirectory(join(root, "generations"), "generation directory");
  const active = join(root, "active");
  let target;
  try {
    if (!lstatSync(active).isSymbolicLink()) throw new Error();
    target = readlinkSync(active);
  } catch {
    operationFail("ACTIVE_POINTER_INVALID", "active must be a relative generation pointer");
  }
  const expectedPrefix = `generations${sep}`;
  if (isAbsolute(target) || !target.startsWith(expectedPrefix) || target.split(sep).length !== 2) {
    operationFail("ACTIVE_POINTER_INVALID", "active pointer target is outside the generation directory");
  }
  const generationRef = validateGenerationRef(target.slice(expectedPrefix.length));
  const directory = join(generations, generationRef);
  canonicalDirectory(directory, "active generation");
  try {
    if (realpathSync(active) !== directory) throw new Error();
  } catch {
    operationFail("ACTIVE_POINTER_INVALID", "active pointer does not resolve to its derived generation");
  }
  return Object.freeze({ active, generationRef, directory, target });
}
