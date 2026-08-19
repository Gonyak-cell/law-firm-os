import { spawnSync } from "node:child_process";
import { constants, closeSync, fstatSync, openSync } from "node:fs";

import {
  childEnvironment,
  parseAbsolutePath,
  parseRelativePath,
  resolveToolchainBinding,
  statIdentity,
  verifyToolchainBinding,
} from "./desktop-installed-outlook-source-envelope-posix-bootstrap.mjs";
import { POSIX_PYTHON_SCRIPT } from "./desktop-installed-outlook-source-envelope-posix-python.mjs";

const MAX_BUFFER = 256 * 1024 * 1024;
const INITIAL_TOOLS = resolveToolchainBinding();
const FILESYSTEM_ROOT_BINDINGS = new WeakSet();
export const POSIX_PYTHON_PATH = INITIAL_TOOLS.python.actual_path;

function fail(code, detail) {
  const error = new Error(`${code}: ${detail}`);
  error.code = code;
  throw error;
}

function openFilesystemRoot() {
  const fd = openSync("/", constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
  const current = fstatSync(fd, { bigint: true });
  if (!current.isDirectory() || current.uid !== 0n || (current.mode & 0o022n) !== 0n) {
    closeSync(fd);
    fail("SOURCE_ENVELOPE_ROOT_UNSAFE", "filesystem root descriptor is unsafe");
  }
  return { fd, identity: statIdentity(current) };
}

function encodedConfig(binding, extra = {}) {
  return Buffer.from(JSON.stringify({
    source_path: binding.sourcePath,
    source_identity: binding.sourceIdentity,
    filesystem_root_identity: binding.filesystemRootIdentity,
    python_path: binding.tools.python.actual_path,
    python_identity: binding.tools.python.actual_identity,
    git_path: binding.tools.git.actual_path,
    git_identity: binding.tools.git.actual_identity,
    ...(binding.evidenceRelative ? {
      evidence_relative: binding.evidenceRelative,
      evidence_identity: binding.evidenceIdentity,
    } : {}),
    ...extra,
  })).toString("base64");
}

function parseProtocol(stdout, fallback) {
  const lines = stdout.toString("utf8").trim().split("\n").filter(Boolean);
  if (lines.length !== 1) fail("SOURCE_ENVELOPE_POSIX_PROTOCOL", fallback || "unexpected response framing");
  let message;
  try { message = JSON.parse(lines[0]); } catch (error) { fail("SOURCE_ENVELOPE_POSIX_PROTOCOL", error.message); }
  if (!message.ok) fail(message.code || "SOURCE_ENVELOPE_POSIX_FAILED", message.detail || fallback || "operation failed");
  return message.result;
}

function runSync(binding, operation, request, extra = {}) {
  verifyToolchainBinding(binding.tools);
  const result = spawnSync(binding.tools.python.actual_path, ["-I", "-S", "-c", POSIX_PYTHON_SCRIPT, operation, encodedConfig(binding, extra)], {
    input: request === undefined ? Buffer.alloc(0) : Buffer.from(JSON.stringify(request)),
    encoding: null,
    env: childEnvironment({ PYTHONNOUSERSITE: "1" }),
    stdio: ["pipe", "pipe", "pipe", binding.rootFd],
    timeout: 60_000,
    maxBuffer: MAX_BUFFER,
  });
  verifyToolchainBinding(binding.tools);
  if (result.error?.code === "ETIMEDOUT") fail("SOURCE_ENVELOPE_POSIX_TIMEOUT", `${operation} timed out`);
  if (result.error) fail("SOURCE_ENVELOPE_POSIX_FAILED", result.error.code || result.error.message);
  return parseProtocol(result.stdout || Buffer.alloc(0), (result.stderr || Buffer.alloc(0)).toString("utf8").trim());
}

function requireRootBinding(binding) {
  if (binding.sourcePath !== "/" || !FILESYSTEM_ROOT_BINDINGS.has(binding)) {
    fail("SOURCE_ENVELOPE_ABSOLUTE_BINDING", "dedicated filesystem-root binding required");
  }
}

export function bindSourceRoot(sourcePath) {
  parseAbsolutePath(sourcePath, { allowRoot: true });
  const tools = resolveToolchainBinding();
  const filesystemRoot = openFilesystemRoot();
  const binding = {
    rootFd: filesystemRoot.fd,
    filesystemRootIdentity: filesystemRoot.identity,
    sourcePath,
    tools,
  };
  try {
    binding.sourceIdentity = runSync(binding, "bind_source");
    if (sourcePath === "/") FILESYSTEM_ROOT_BINDINGS.add(binding);
    return binding;
  } catch (error) {
    closeBinding(binding);
    throw error;
  }
}

export function closeBinding(binding) {
  FILESYSTEM_ROOT_BINDINGS.delete(binding);
  try { closeSync(binding.rootFd); } catch {}
}

export function inspectBoundEntries(binding, entries) {
  for (const entry of entries) parseRelativePath(entry.path);
  return runSync(binding, "inspect_relative", { entries });
}

export function inspectBoundAbsoluteEntries(binding, entries) {
  requireRootBinding(binding);
  for (const entry of entries) parseAbsolutePath(entry.path);
  return runSync(binding, "inspect_absolute", { entries });
}

export function inspectTrackedManifest(binding, entries) {
  for (const entry of entries) parseRelativePath(entry.path);
  return runSync(binding, "manifest", { entries });
}

function decoded(entry, field) {
  return Buffer.from(entry[field], "base64");
}

export function readBoundRegular(binding, relativePath) {
  const [entry] = inspectBoundEntries(binding, [{ path: relativePath, include_bytes: true }]);
  if (entry.identity.type !== "file") fail("SOURCE_ENVELOPE_SOURCE_CONTENT", relativePath);
  return { bytes: decoded(entry, "data"), identity: entry.identity };
}

export function readBoundSymlink(binding, relativePath) {
  const [entry] = inspectBoundEntries(binding, [{ path: relativePath }]);
  if (entry.identity.type !== "symlink") fail("SOURCE_ENVELOPE_SOURCE_CONTENT", relativePath);
  return { bytes: decoded(entry, "target"), identity: entry.identity };
}

export function statBoundEntry(binding, relativePath) {
  return inspectBoundEntries(binding, [{ path: relativePath }])[0].identity;
}

export function statBoundEntryOptional(binding, relativePath) {
  parseRelativePath(relativePath);
  const result = runSync(binding, "optional_relative", { path: relativePath });
  return result.exists ? result.entry.identity : null;
}

export function readBoundAbsolute(binding, absolutePath) {
  requireRootBinding(binding);
  const [entry] = inspectBoundAbsoluteEntries(binding, [{ path: absolutePath, include_bytes: true }]);
  if (entry.identity.type !== "file") fail("SOURCE_ENVELOPE_SOURCE_CONTENT", absolutePath);
  return { bytes: decoded(entry, "data"), identity: entry.identity };
}

export function readBoundAbsoluteSymlink(binding, absolutePath) {
  requireRootBinding(binding);
  const [entry] = inspectBoundAbsoluteEntries(binding, [{ path: absolutePath }]);
  if (entry.identity.type !== "symlink") fail("SOURCE_ENVELOPE_SOURCE_CONTENT", absolutePath);
  return { bytes: decoded(entry, "target"), identity: entry.identity };
}

export function statBoundAbsolute(binding, absolutePath) {
  requireRootBinding(binding);
  return inspectBoundAbsoluteEntries(binding, [{ path: absolutePath }])[0].identity;
}

export function statBoundAbsoluteOptional(binding, absolutePath) {
  requireRootBinding(binding);
  parseAbsolutePath(absolutePath);
  const result = runSync(binding, "optional_absolute", { path: absolutePath });
  return result.exists ? result.entry.identity : null;
}

export function runBoundGitBatch(binding, commands) {
  const result = runSync(binding, "git_batch", { commands: commands.map((command) => ({
    argv: command.argv,
    input: command.input ? Buffer.from(command.input).toString("base64") : "",
    disable_hooks: command.disableHooks !== false,
  })) });
  return result.map((entry) => ({
    status: entry.status,
    stdout: Buffer.from(entry.stdout, "base64"),
    stderr: Buffer.from(entry.stderr, "base64"),
  }));
}

export function runBoundGit(binding, args, input = Buffer.alloc(0)) {
  const [result] = runBoundGitBatch(binding, [{ argv: args, input }]);
  if (result.status !== 0) fail("SOURCE_ENVELOPE_GIT_CHECK_FAILED", result.stderr.toString("utf8").trim() || args[0]);
  return result.stdout;
}

export function ensureBoundEvidenceRoot(binding, relativePath) {
  parseRelativePath(relativePath);
  const evidenceIdentity = runSync(binding, "ensure_evidence", undefined, { evidence_relative: relativePath, evidence_identity: null });
  return { ...binding, evidenceRelative: relativePath, evidenceIdentity };
}

export function bindBoundEvidenceRoot(binding, relativePath) {
  parseRelativePath(relativePath);
  const evidenceIdentity = runSync(binding, "bind_evidence", undefined, { evidence_relative: relativePath, evidence_identity: null });
  return { ...binding, evidenceRelative: relativePath, evidenceIdentity };
}

export function fsyncBoundEvidence(binding) {
  if (!binding.evidenceRelative) fail("SOURCE_ENVELOPE_EVIDENCE_ROOT_UNBOUND", "evidence binding required");
  runSync(binding, "fsync_evidence");
}

export function currentToolchainBinding() {
  return resolveToolchainBinding();
}

export {
  beginBoundPairPublication,
  beginBoundPairRead,
} from "./desktop-installed-outlook-source-envelope-posix-pair.mjs";
