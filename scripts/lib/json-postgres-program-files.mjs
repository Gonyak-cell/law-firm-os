import { createHash } from "node:crypto";
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";

export function sha256ProgramBytes(value) {
  return createHash("sha256").update(value).digest("hex");
}

function outsideRoot(target, root) {
  const rel = relative(realpathSync(root), resolve(target));
  return rel === ".." || rel.startsWith(`..${sep}`);
}

export function readPrivateProgramJson(path, label, { worktree = process.cwd() } = {}) {
  return JSON.parse(readPrivateProgramBytes(path, label, { worktree }).toString("utf8"));
}

export function readPrivateProgramBytes(path, label, { worktree = process.cwd() } = {}) {
  const target = resolve(path);
  if (!outsideRoot(target, worktree)) throw new Error(`${label} must remain outside the worktree`);
  if (lstatSync(target).isSymbolicLink()) throw new Error(`${label} must not be a symlink`);
  const resolved = realpathSync(target);
  const metadata = statSync(resolved);
  if (!metadata.isFile() || (metadata.mode & 0o077) !== 0) {
    throw new Error(`${label} must be a private 0600 regular file`);
  }
  return readFileSync(resolved);
}

export function readApprovedSourceBytes(path, {
  approvedRoots,
  expectedByteSize,
  expectedSha256,
  maxBytes = 512 * 1024 * 1024,
} = {}) {
  const target = resolve(path);
  if (!Array.isArray(approvedRoots) || approvedRoots.length === 0) {
    throw new Error("approved source roots are required");
  }
  if (lstatSync(target).isSymbolicLink()) throw new Error("approved source must not be a symlink");
  const resolved = realpathSync(target);
  if (!approvedRoots.some((root) => !outsideRoot(resolved, root))) {
    throw new Error("approved source is outside every approved root");
  }
  const metadata = statSync(resolved);
  if (!metadata.isFile()
    || !Number.isSafeInteger(expectedByteSize)
    || expectedByteSize < 0
    || expectedByteSize > maxBytes
    || metadata.size !== expectedByteSize) {
    throw new Error("approved source metadata drifted");
  }
  const bytes = readFileSync(resolved);
  if (bytes.length !== expectedByteSize
    || sha256ProgramBytes(bytes) !== expectedSha256) {
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
