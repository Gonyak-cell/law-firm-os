import { execFileSync } from "node:child_process";
import { lstatSync, readlinkSync } from "node:fs";

const FIXED_ENV = Object.freeze({
  PATH: "/usr/bin:/bin",
  HOME: "/var/empty",
  LANG: "C",
  LC_ALL: "C",
});

function fail(code, detail) {
  const error = new Error(`${code}: ${detail}`);
  error.code = code;
  throw error;
}

export function parseAbsolutePath(raw, { allowRoot = false } = {}) {
  if (typeof raw !== "string" || !raw.startsWith("/") || raw.includes("\0") || raw.includes("\\")) {
    fail("SOURCE_ENVELOPE_PATH", "absolute path required");
  }
  if (raw === "/") {
    if (allowRoot) return [];
    fail("SOURCE_ENVELOPE_PATH", "filesystem root is not a leaf path");
  }
  const components = raw.slice(1).split("/");
  if (components.some((value) => value === "" || value === "." || value === "..")) {
    fail("SOURCE_ENVELOPE_PATH", "invalid absolute path component");
  }
  return components;
}

export function parseRelativePath(raw) {
  if (typeof raw !== "string" || raw === "" || raw.startsWith("/") || raw.includes("\0") || raw.includes("\\")) {
    fail("SOURCE_ENVELOPE_PATH", "relative path required");
  }
  const components = raw.split("/");
  if (components.some((value) => value === "" || value === "." || value === "..")) {
    fail("SOURCE_ENVELOPE_PATH", "invalid relative path component");
  }
  return components;
}

export function statIdentity(stat) {
  const type = stat.isFile() ? "file" : stat.isDirectory() ? "dir" : stat.isSymbolicLink() ? "symlink" : "other";
  return {
    dev: String(stat.dev),
    ino: String(stat.ino),
    uid: String(stat.uid),
    gid: String(stat.gid),
    mode: Number(stat.mode & 0o777n),
    type,
    nlink: Number(stat.nlink),
    size: String(stat.size),
    mtime_ns: String(stat.mtimeNs),
    ctime_ns: String(stat.ctimeNs),
  };
}

function normalizeLinkTarget(parent, target, remaining) {
  if (target.includes("\0") || target.includes("\\")) fail("SOURCE_ENVELOPE_TOOLCHAIN_UNSAFE", "invalid tool symlink target");
  const stack = target.startsWith("/") ? [] : [...parent];
  for (const component of target.split("/")) {
    if (component === "" || component === ".") continue;
    if (component === "..") {
      if (stack.length === 0) fail("SOURCE_ENVELOPE_TOOLCHAIN_UNSAFE", "tool symlink escapes filesystem root");
      stack.pop();
    } else {
      stack.push(component);
    }
  }
  return [...stack, ...remaining];
}

function requireRootOwned(identityValue, pathValue) {
  if (identityValue.uid !== "0" || (identityValue.mode & 0o022) !== 0) {
    fail("SOURCE_ENVELOPE_TOOLCHAIN_UNSAFE", `${pathValue} is not root-owned and non-writable`);
  }
}

export function inspectSecureToolPath(raw) {
  let pending = parseAbsolutePath(raw);
  let resolved = [];
  let symlinks = 0;
  const observations = [];
  const rootIdentity = statIdentity(lstatSync("/", { bigint: true }));
  requireRootOwned(rootIdentity, "/");
  observations.push({ path: "/", identity: rootIdentity });

  while (pending.length > 0) {
    const component = pending.shift();
    const current = `/${[...resolved, component].join("/")}`;
    const stat = lstatSync(current, { bigint: true });
    const currentIdentity = statIdentity(stat);
    requireRootOwned(currentIdentity, current);
    const observation = { path: current, identity: currentIdentity };
    observations.push(observation);
    if (stat.isSymbolicLink()) {
      if (++symlinks > 16) fail("SOURCE_ENVELOPE_TOOLCHAIN_UNSAFE", "tool symlink depth exceeded");
      const target = readlinkSync(current, "utf8");
      observation.symlink_target = target;
      pending = normalizeLinkTarget(resolved, target, pending);
      resolved = [];
      continue;
    }
    if (pending.length > 0 && !stat.isDirectory()) {
      fail("SOURCE_ENVELOPE_TOOLCHAIN_UNSAFE", `${current} is not a directory`);
    }
    resolved.push(component);
  }

  const leaf = observations.at(-1);
  if (leaf.identity.type !== "file" || (leaf.identity.mode & 0o111) === 0) {
    fail("SOURCE_ENVELOPE_TOOLCHAIN_UNSAFE", `${raw} does not resolve to an executable regular file`);
  }
  return { selected_path: raw, actual_path: leaf.path, actual_identity: leaf.identity, observations };
}

function same(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function resolveWithXcrun(name, xcrun) {
  const before = inspectSecureToolPath(xcrun.selected_path);
  let selected;
  try {
    selected = execFileSync(xcrun.actual_path, ["--find", name], {
      encoding: "utf8",
      env: FIXED_ENV,
      timeout: 5_000,
      maxBuffer: 64 * 1024,
    }).trim();
  } catch (error) {
    fail("SOURCE_ENVELOPE_XCRUN_FAILED", `${name}: ${error.code || error.message}`);
  }
  if (!same(before, inspectSecureToolPath(xcrun.selected_path))) {
    fail("SOURCE_ENVELOPE_TOOLCHAIN_CHANGED", "xcrun changed while resolving tools");
  }
  parseAbsolutePath(selected);
  return inspectSecureToolPath(selected);
}

export function resolveToolchainBinding() {
  const xcrun = inspectSecureToolPath("/usr/bin/xcrun");
  const pythonShim = inspectSecureToolPath("/usr/bin/python3");
  const gitShim = inspectSecureToolPath("/usr/bin/git");
  const python = resolveWithXcrun("python3", xcrun);
  const git = resolveWithXcrun("git", xcrun);
  return Object.freeze({ xcrun, python_shim: pythonShim, git_shim: gitShim, python, git });
}

export function verifyToolchainBinding(binding) {
  for (const key of ["xcrun", "python_shim", "git_shim", "python", "git"]) {
    const current = inspectSecureToolPath(binding[key].selected_path);
    if (!same(current, binding[key])) fail("SOURCE_ENVELOPE_TOOLCHAIN_CHANGED", `${key} identity changed`);
  }
}

export function childEnvironment(extra = {}) {
  return { ...FIXED_ENV, ...extra };
}
