import { createHash } from "node:crypto";
import {
  chmodSync,
  closeSync,
  constants,
  existsSync,
  fstatSync,
  lstatSync,
  mkdirSync,
  openSync,
  readSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";

const DEFAULT_PROGRAM_INPUT_MAX_BYTES = 512 * 1024 * 1024;

export function sha256ProgramBytes(value) {
  return createHash("sha256").update(value).digest("hex");
}

function outsideRoot(target, root) {
  const rel = relative(realpathSync(root), resolve(target));
  return rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel);
}

function withinRoot(target, root) {
  const rel = relative(root, target);
  return rel === "" || (rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel));
}

function validMaximumBytes(maxBytes) {
  return Number.isSafeInteger(maxBytes)
    && maxBytes >= 0
    && maxBytes <= DEFAULT_PROGRAM_INPUT_MAX_BYTES;
}

function sameFileSnapshot(left, right) {
  return left.dev === right.dev
    && left.ino === right.ino
    && left.size === right.size
    && left.mode === right.mode
    && left.mtimeNs === right.mtimeNs
    && left.ctimeNs === right.ctimeNs;
}

function sameContainerSnapshot(left, right) {
  return left.dev === right.dev
    && left.ino === right.ino
    && left.mode === right.mode;
}

function regularFileSnapshot(path) {
  const metadata = lstatSync(path, { bigint: true });
  if (metadata.isSymbolicLink() || !metadata.isFile()) throw new Error("unsafe file type");
  return metadata;
}

function readExactDescriptor(descriptor, size) {
  if (size > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("file is too large");
  const bytes = Buffer.alloc(Number(size));
  let offset = 0;
  while (offset < bytes.length) {
    const count = readSync(descriptor, bytes, offset, bytes.length - offset, offset);
    if (!Number.isSafeInteger(count) || count <= 0) throw new Error("file size drifted");
    offset += count;
  }
  if (readSync(descriptor, Buffer.alloc(1), 0, 1, bytes.length) !== 0) {
    throw new Error("file size drifted");
  }
  return bytes;
}

function invokeInternalHook(hooks, name, context) {
  if (hooks?.[name] !== undefined && typeof hooks[name] !== "function") {
    throw new TypeError(`internal ${name} hook must be a function`);
  }
  hooks?.[name]?.(Object.freeze(context));
}

function readPinnedProgramFile(target, {
  initialResolved,
  initialSnapshot,
  maxBytes,
  validatePath,
  __testHooks,
}) {
  let descriptor;
  try {
    invokeInternalHook(__testHooks, "afterPreflight", { target, resolved: initialResolved });
    // Node does not expose O_NOFOLLOW on every platform. The mandatory descriptor/path
    // identity check below runs before any bytes are read and is the no-follow fallback.
    descriptor = openSync(
      initialResolved,
      constants.O_RDONLY | (constants.O_CLOEXEC ?? 0) | (constants.O_NOFOLLOW ?? 0),
    );
    const opened = fstatSync(descriptor, { bigint: true });
    const afterOpen = regularFileSnapshot(target);
    const resolvedAfterOpen = realpathSync(target);
    const resolvedAfterOpenSnapshot = regularFileSnapshot(resolvedAfterOpen);
    validatePath(resolvedAfterOpen);
    if (!opened.isFile()
      || !sameFileSnapshot(initialSnapshot, opened)
      || !sameFileSnapshot(opened, afterOpen)
      || !sameFileSnapshot(afterOpen, resolvedAfterOpenSnapshot)
      || opened.size > BigInt(maxBytes)) {
      throw new Error("file identity drifted before read");
    }

    invokeInternalHook(__testHooks, "afterOpen", { target, resolved: resolvedAfterOpen });
    const bytes = readExactDescriptor(descriptor, opened.size);
    invokeInternalHook(__testHooks, "afterRead", { target, resolved: resolvedAfterOpen });

    const afterRead = fstatSync(descriptor, { bigint: true });
    const finalPathSnapshot = regularFileSnapshot(target);
    const finalResolved = realpathSync(target);
    const finalResolvedSnapshot = regularFileSnapshot(finalResolved);
    validatePath(finalResolved);
    if (!sameFileSnapshot(opened, afterRead)
      || !sameFileSnapshot(afterRead, finalPathSnapshot)
      || !sameFileSnapshot(finalPathSnapshot, finalResolvedSnapshot)
      || afterRead.size !== BigInt(bytes.length)) {
      throw new Error("file identity drifted during read");
    }
    return bytes;
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
  }
}

export function readPrivateProgramJson(path, label, options = {}) {
  return JSON.parse(readPrivateProgramBytes(path, label, options).toString("utf8"));
}

export function readPrivateProgramBytes(path, label, {
  worktree = process.cwd(),
  maxBytes = DEFAULT_PROGRAM_INPUT_MAX_BYTES,
  __testHooks,
} = {}) {
  const target = resolve(path);
  const lexicalWorktree = resolve(worktree);
  const resolvedWorktree = realpathSync(lexicalWorktree);
  if (withinRoot(target, lexicalWorktree)) {
    throw new Error(`${label} must remain outside the worktree`);
  }
  if (!validMaximumBytes(maxBytes)) throw new Error(`${label} size boundary is invalid`);
  const pathSnapshot = lstatSync(target, { bigint: true });
  if (pathSnapshot.isSymbolicLink()) throw new Error(`${label} must not be a symlink`);
  const resolved = realpathSync(target);
  if (withinRoot(resolved, resolvedWorktree)) {
    throw new Error(`${label} must remain outside the worktree`);
  }
  let metadata;
  try {
    metadata = regularFileSnapshot(resolved);
  } catch {
    throw new Error(`${label} must be a private 0600 regular file`);
  }
  if (!sameFileSnapshot(pathSnapshot, metadata)
    || (metadata.mode & 0o077n) !== 0n
    || metadata.size > BigInt(maxBytes)) {
    throw new Error(`${label} must be a private 0600 regular file`);
  }
  try {
    return readPinnedProgramFile(target, {
      initialResolved: resolved,
      initialSnapshot: metadata,
      maxBytes,
      __testHooks,
      validatePath(finalResolved) {
        if (realpathSync(lexicalWorktree) !== resolvedWorktree
          || withinRoot(finalResolved, resolvedWorktree)) {
          throw new Error(`${label} must remain outside the worktree`);
        }
      },
    });
  } catch (error) {
    if (error?.message === `${label} must remain outside the worktree`) throw error;
    throw new Error(`${label} changed while it was read`, { cause: error });
  }
}

export function readApprovedProgramBytes(path, {
  approvedRoots,
  maxBytes,
  __testHooks,
} = {}) {
  const target = resolve(path);
  if (!Array.isArray(approvedRoots) || approvedRoots.length === 0) {
    throw new Error("approved source roots are required");
  }
  if (!validMaximumBytes(maxBytes)) throw new Error("approved source metadata drifted");
  const pathSnapshot = lstatSync(target, { bigint: true });
  if (pathSnapshot.isSymbolicLink()) throw new Error("approved source must not be a symlink");
  const resolved = realpathSync(target);
  let approvedRoot = null;
  for (const root of approvedRoots) {
    const source = resolve(root);
    const rootResolved = realpathSync(root);
    if (!withinRoot(target, source) || !withinRoot(resolved, rootResolved)) continue;
    approvedRoot = Object.freeze({
      source,
      resolved: rootResolved,
      sourceSnapshot: lstatSync(source, { bigint: true }),
      resolvedSnapshot: lstatSync(rootResolved, { bigint: true }),
    });
    break;
  }
  if (!approvedRoot) {
    throw new Error("approved source is outside every approved root");
  }
  let metadata;
  try {
    metadata = regularFileSnapshot(resolved);
  } catch {
    throw new Error("approved source metadata drifted");
  }
  if (!sameFileSnapshot(pathSnapshot, metadata)
    || metadata.size > BigInt(maxBytes)) {
    throw new Error("approved source metadata drifted");
  }
  try {
    return readPinnedProgramFile(target, {
      initialResolved: resolved,
      initialSnapshot: metadata,
      maxBytes,
      __testHooks,
      validatePath(finalResolved) {
        const currentRootResolved = realpathSync(approvedRoot.source);
        if (currentRootResolved !== approvedRoot.resolved
          || !withinRoot(finalResolved, approvedRoot.resolved)) {
          throw new Error("approved source is outside every approved root");
        }
        if (!sameContainerSnapshot(
          approvedRoot.sourceSnapshot,
          lstatSync(approvedRoot.source, { bigint: true }),
        ) || !sameContainerSnapshot(
          approvedRoot.resolvedSnapshot,
          lstatSync(currentRootResolved, { bigint: true }),
        )) throw new Error("approved source root identity drifted");
      },
    });
  } catch (error) {
    if (error?.message === "approved source is outside every approved root") throw error;
    throw new Error("approved source metadata drifted", { cause: error });
  }
}

export function readApprovedSourceBytes(path, {
  approvedRoots,
  expectedByteSize,
  expectedSha256,
  maxBytes = DEFAULT_PROGRAM_INPUT_MAX_BYTES,
  __testHooks,
} = {}) {
  const bytes = readApprovedProgramBytes(path, { approvedRoots, maxBytes, __testHooks });
  if (!Number.isSafeInteger(expectedByteSize)
    || expectedByteSize < 0
    || expectedByteSize > maxBytes
    || bytes.length !== expectedByteSize) {
    throw new Error("approved source metadata drifted");
  }
  if (sha256ProgramBytes(bytes) !== expectedSha256) {
    throw new Error("approved source digest drifted");
  }
  return bytes;
}

export function createPrivateProgramOutputDirectory(path, { worktree = process.cwd() } = {}) {
  const target = resolve(path);
  if (!outsideRoot(target, worktree)) throw new Error("program output must remain outside the worktree");
  if (existsSync(target)) throw new Error("program output directory already exists");
  const parent = dirname(target);
  mkdirSync(parent, { recursive: true, mode: 0o700 });
  chmodSync(parent, 0o700);
  mkdirSync(target, { mode: 0o700 });
  chmodSync(target, 0o700);
  return realpathSync(target);
}

export function writePrivateProgramJson(path, value) {
  const target = resolve(path);
  if (existsSync(target)) throw new Error("private program output already exists");
  const bytes = `${JSON.stringify(value, null, 2)}\n`;
  writeFileSync(target, bytes, { flag: "wx", mode: 0o600 });
  chmodSync(target, 0o600);
  return Object.freeze({
    path: target,
    sha256: sha256ProgramBytes(bytes),
  });
}

export function writePrivateProgramBytes(path, value) {
  const target = resolve(path);
  if (existsSync(target)) throw new Error("private program output already exists");
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(value);
  writeFileSync(target, bytes, { flag: "wx", mode: 0o600 });
  chmodSync(target, 0o600);
  return Object.freeze({
    path: target,
    sha256: sha256ProgramBytes(bytes),
  });
}
