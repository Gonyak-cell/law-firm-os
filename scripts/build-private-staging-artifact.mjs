#!/usr/bin/env node
import { createHash } from "node:crypto";
import {
  chmodSync,
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import {
  buildPrivateStagingSyntheticSources,
  privateStagingArtifactSourcePathAllowed,
  validatePrivateStagingArtifactEntries,
  validateRdsCaBundle,
} from "./lib/private-staging-artifact.mjs";

const RDS_CA_URL = "https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem";

function option(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
}

function required(value, name) {
  const text = String(value ?? "").trim();
  if (!text) throw new Error(`${name} is required`);
  return text;
}

function git(...args) {
  return execFileSync("git", args, { cwd: process.cwd(), encoding: "utf8" }).trim();
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function ensureOutsideRepository(path) {
  const root = realpathSync(process.cwd());
  const targetInput = resolve(path);
  if (existsSync(targetInput) && lstatSync(targetInput).isSymbolicLink()) {
    throw new Error("artifact output directory must not be a symlink");
  }
  let existingParent = targetInput;
  while (!existsSync(existingParent)) existingParent = dirname(existingParent);
  const target = resolve(realpathSync(existingParent), relative(existingParent, targetInput));
  if (target === root || relative(root, target).split(/[\\/]/u)[0] !== "..") {
    throw new Error("artifact output directory must be outside the repository worktree");
  }
  return target;
}

function privateManifestPath(path) {
  const targetInput = resolve(path);
  if (!existsSync(targetInput) || lstatSync(targetInput).isSymbolicLink()) {
    throw new Error("synthetic identity manifest must be an existing regular non-symlink file");
  }
  const target = realpathSync(targetInput);
  if (!statSync(target).isFile() || (statSync(target).mode & 0o077) !== 0) {
    throw new Error("synthetic identity manifest must be a private 0600 regular file");
  }
  const root = realpathSync(process.cwd());
  if (target === root || relative(root, target).split(/[\\/]/u)[0] !== "..") {
    throw new Error("synthetic identity manifest must remain outside the repository worktree");
  }
  return target;
}

const nodeMajor = Number(process.versions.node.split(".")[0]);
if (nodeMajor !== 22) throw new Error("private staging artifact must be built with Node.js 22");
const sourceSha = git("rev-parse", "HEAD");
const sourceTree = git("rev-parse", "HEAD^{tree}");
const expectedSourceSha = required(option("--source-sha", sourceSha), "--source-sha");
const expectedSourceTree = required(option("--source-tree", sourceTree), "--source-tree");
if (sourceSha !== expectedSourceSha || sourceTree !== expectedSourceTree) throw new Error("artifact source SHA/tree drifted");
if (git("status", "--porcelain=v1", "--untracked-files=all")) throw new Error("artifact build requires a clean exact-head worktree");
const outputDir = ensureOutsideRepository(required(option("--output-dir"), "--output-dir"));
const syntheticIdentityPath = privateManifestPath(required(option("--synthetic-identity-manifest"), "--synthetic-identity-manifest"));
const syntheticIdentityBytes = readFileSync(syntheticIdentityPath);
const syntheticSources = buildPrivateStagingSyntheticSources(JSON.parse(syntheticIdentityBytes));
mkdirSync(outputDir, { recursive: true, mode: 0o700 });
chmodSync(outputDir, 0o700);
const stagingRoot = mkdtempSync(join(tmpdir(), "lawos-private-staging-artifact-"));

try {
  const tracked = git("ls-files").split("\n").filter(privateStagingArtifactSourcePathAllowed).sort();
  for (const sourcePath of tracked) {
    const targetPath = join(stagingRoot, sourcePath);
    mkdirSync(dirname(targetPath), { recursive: true });
    copyFileSync(resolve(sourcePath), targetPath);
  }
  for (const [targetPath, value] of [
    ["apps/api/src/matter-vault-user-registration-seed.json", syntheticSources.account_seed],
    ["apps/api/src/hrx-member-roster-source-of-truth.json", syntheticSources.roster],
  ]) {
    const absoluteTarget = join(stagingRoot, targetPath);
    mkdirSync(dirname(absoluteTarget), { recursive: true });
    writeFileSync(absoluteTarget, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o644 });
  }
  const caResponse = await fetch(RDS_CA_URL, { signal: AbortSignal.timeout(30_000) });
  if (!caResponse.ok) throw new Error(`RDS CA bundle fetch failed: HTTP ${caResponse.status}`);
  const caBytes = Buffer.from(await caResponse.arrayBuffer());
  const ca = validateRdsCaBundle(caBytes);
  const caPath = join(stagingRoot, "certs/global-bundle.pem");
  mkdirSync(dirname(caPath), { recursive: true });
  writeFileSync(caPath, caBytes, { mode: 0o644 });
  const npmVersion = execFileSync("npm", ["--version"], { encoding: "utf8" }).trim();
  execFileSync("npm", ["ci", "--omit=dev", "--ignore-scripts", "--no-audit", "--no-fund"], {
    cwd: stagingRoot,
    env: { ...process.env, NODE_ENV: "production" },
    stdio: ["ignore", "ignore", "inherit"],
  });
  const dependencyLockSha = sha256(readFileSync(join(stagingRoot, "package-lock.json")));
  const deploymentManifest = {
    schema_version: "law-firm-os.private-staging.deployment-artifact.v1",
    source_sha: sourceSha,
    source_tree: sourceTree,
    runtime: `nodejs${nodeMajor}.x`,
    node_version: process.versions.node,
    npm_version: npmVersion,
    dependency_lock_sha256: dependencyLockSha,
    rds_ca_bundle: {
      source: RDS_CA_URL,
      sha256: sha256(caBytes),
      byte_size: ca.byte_size,
      certificate_count: ca.certificate_count,
    },
    synthetic_identity_manifest_sha256: sha256(syntheticIdentityBytes),
    synthetic_identity_safe_counts: syntheticSources.safe_counts,
    data_scope: "synthetic-only",
    json_fallback: false,
    dual_write: false,
    secrets_in_environment: false,
    production_ready_claim: false,
  };
  writeFileSync(join(stagingRoot, "deployment-manifest.json"), `${JSON.stringify(deploymentManifest, null, 2)}\n`, { mode: 0o644 });
  const archivePath = join(outputDir, `lawos-private-staging-${sourceSha}.zip`);
  const manifestPath = join(outputDir, `lawos-private-staging-${sourceSha}.manifest.json`);
  if (existsSync(archivePath) || existsSync(manifestPath)) throw new Error("private staging artifact output already exists");
  execFileSync("zip", ["-X", "-q", "-r", archivePath, "."], { cwd: stagingRoot });
  chmodSync(archivePath, 0o600);
  const entries = execFileSync("unzip", ["-Z1", archivePath], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 })
    .trim().split("\n").filter((entry) => entry && !entry.endsWith("/"));
  const validated = validatePrivateStagingArtifactEntries(entries);
  const archiveBytes = readFileSync(archivePath);
  if (archiveBytes.byteLength > 50 * 1024 * 1024) throw new Error("private staging artifact exceeds the direct Lambda archive limit");
  const archiveSha = sha256(archiveBytes);
  const outerManifest = {
    ...deploymentManifest,
    artifact_path: archivePath,
    artifact_sha256: archiveSha,
    artifact_byte_size: statSync(archivePath).size,
    artifact_entry_count: validated.entry_count,
    artifact_s3_key: `lawos-private-staging/${sourceSha}/${archiveSha}.zip`,
    generated_at: new Date().toISOString(),
  };
  writeFileSync(manifestPath, `${JSON.stringify(outerManifest, null, 2)}\n`, { mode: 0o600 });
  chmodSync(manifestPath, 0o600);
  process.stdout.write(`${JSON.stringify({
    verdict: "PASS",
    source_sha: sourceSha,
    source_tree: sourceTree,
    artifact_sha256: archiveSha,
    artifact_byte_size: archiveBytes.byteLength,
    artifact_entry_count: validated.entry_count,
    artifact_path: archivePath,
    manifest_path: manifestPath,
    artifact_s3_key: outerManifest.artifact_s3_key,
    secret_material_recorded: false,
    upload_executed: false,
  }, null, 2)}\n`);
} finally {
  rmSync(stagingRoot, { recursive: true, force: true });
}
