import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync, realpathSync } from "node:fs";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import os from "node:os";

export class RuntimeSafetyDependencyError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "RuntimeSafetyDependencyError";
    this.code = code;
    this.details = details;
  }
}

function fail(code, message, details) {
  throw new RuntimeSafetyDependencyError(code, message, details);
}

function git(repo, args) {
  return execFileSync("git", args, {
    cwd: repo,
    env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" },
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function sha256File(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function safeLockfile(repoReal, lockfile) {
  if (typeof lockfile !== "string" || isAbsolute(lockfile) || lockfile.includes("..") || /[\0*?\[\]\\]/.test(lockfile)) fail("DEPENDENCY_LOCK_PATH", "lockfile must be an exact relative path");
  const path = resolve(join(repoReal, lockfile));
  const rel = relative(repoReal, path);
  if (rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel) || !existsSync(path) || lstatSync(path).isSymbolicLink() || !lstatSync(path).isFile()) {
    fail("DEPENDENCY_LOCK_PATH", "lockfile must be a regular file inside the checkout");
  }
  return path;
}

export function inspectRuntimeSafetyCheckout({ repo, targetSourceSha, targetTree, lockfile = "package-lock.json", requireNoNodeModules = true }) {
  if (!repo || !existsSync(repo)) fail("DEPENDENCY_CHECKOUT", "checkout does not exist");
  const repoReal = realpathSync(repo);
  let head;
  try {
    head = git(repoReal, ["rev-parse", "HEAD"]);
  } catch {
    fail("DEPENDENCY_CHECKOUT", "checkout is not a Git worktree");
  }
  if (!/^[0-9a-f]{40}$/.test(targetSourceSha ?? "") || head !== targetSourceSha) fail("DEPENDENCY_WRONG_CHECKOUT", "checkout HEAD does not match target_source_sha", { head, targetSourceSha });
  const tree = git(repoReal, ["rev-parse", "HEAD^{tree}"]);
  if (targetTree && tree !== targetTree) fail("DEPENDENCY_WRONG_TREE", "checkout tree does not match target_tree", { tree, targetTree });
  const nodeModules = join(repoReal, "node_modules");
  if (requireNoNodeModules && existsSync(nodeModules)) fail("DEPENDENCY_NODE_MODULES_REUSE", "checkout already has node_modules");
  const porcelain = git(repoReal, ["status", "--porcelain=v1"]);
  if (porcelain) fail("DEPENDENCY_DIRTY_CHECKOUT", "checkout must be clean");
  const lockfilePath = safeLockfile(repoReal, lockfile);
  try {
    git(repoReal, ["ls-files", "--error-unmatch", lockfile]);
  } catch {
    fail("DEPENDENCY_LOCK_UNTRACKED", "lockfile is not tracked at the target source");
  }
  const lockfileBlob = git(repoReal, ["rev-parse", `HEAD:${lockfile}`]);
  const workingBlob = git(repoReal, ["hash-object", lockfile]);
  if (lockfileBlob !== workingBlob) fail("DEPENDENCY_LOCK_DRIFT", "working lockfile does not match the target blob");
  return Object.freeze({
    repo: repoReal,
    target_source_sha: head,
    target_tree: tree,
    lockfile,
    lockfile_blob: lockfileBlob,
    lockfile_sha256: sha256File(lockfilePath),
  });
}

function sanitizedEnvironment() {
  const denied = /^(?:AWS_|AZURE_|GOOGLE_|MSAL_|POPBILL_|GITHUB_TOKEN|GH_TOKEN|NPM_TOKEN|NODE_AUTH_TOKEN)/;
  return Object.fromEntries(Object.entries(process.env).filter(([key]) => !denied.test(key)));
}

function commandVersion(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8", env: sanitizedEnvironment() });
  return result.status === 0 ? `${result.stdout}${result.stderr}`.trim() : null;
}

export function materializeRuntimeSafetyDependencies(options) {
  const inspection = inspectRuntimeSafetyCheckout(options);
  if (!options.npmCi) fail("DEPENDENCY_NPM_CI_REQUIRED", "dependency materialization requires explicit npm ci authorization");
  const result = spawnSync("npm", ["ci", "--no-audit", "--no-fund"], {
    cwd: inspection.repo,
    env: sanitizedEnvironment(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: options.timeoutMs ?? 1_800_000,
  });
  if (result.error?.code === "ETIMEDOUT") fail("DEPENDENCY_TIMEOUT", "npm ci timed out");
  if (result.status !== 0) fail("DEPENDENCY_NPM_CI", "npm ci failed", { exit_code: result.status, output_sha256: createHash("sha256").update(`${result.stdout}${result.stderr}`).digest("hex") });
  const nodeModules = join(inspection.repo, "node_modules");
  if (!existsSync(nodeModules) || lstatSync(nodeModules).isSymbolicLink()) fail("DEPENDENCY_NODE_MODULES_REUSE", "npm ci did not create a checkout-local regular node_modules directory");
  const nodeModulesReal = realpathSync(nodeModules);
  const rel = relative(inspection.repo, nodeModulesReal);
  if (rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel)) fail("DEPENDENCY_NODE_MODULES_REUSE", "node_modules escapes the checkout");
  const npmLs = spawnSync("npm", ["ls", "--all", "--json"], { cwd: inspection.repo, env: sanitizedEnvironment(), encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (npmLs.status !== 0) fail("DEPENDENCY_INSTALL_DRIFT", "installed dependency graph is invalid", { exit_code: npmLs.status });
  const electronPackage = join(nodeModules, "electron", "package.json");
  const electronVersion = existsSync(electronPackage) ? JSON.parse(readFileSync(electronPackage, "utf8")).version : null;
  return Object.freeze({
    schema_version: "law-firm-os.runtime-safety.dependency-materialization.v1",
    ...inspection,
    npm_command: ["npm", "ci", "--no-audit", "--no-fund"],
    node_version: process.version,
    npm_version: commandVersion("npm", ["--version"]),
    os: `${os.platform()} ${os.release()}`,
    arch: os.arch(),
    postgres_version: commandVersion("psql", ["--version"]),
    electron_version: electronVersion,
    installed_graph_sha256: createHash("sha256").update(npmLs.stdout).digest("hex"),
    npm_output_sha256: createHash("sha256").update(`${result.stdout}${result.stderr}`).digest("hex"),
  });
}
