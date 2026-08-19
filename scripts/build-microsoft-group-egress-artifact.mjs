#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import {
  basename,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
} from "node:path";

import {
  MICROSOFT_GROUP_EGRESS_SOURCE_PATHS,
  createMicrosoftGroupEgressArtifactManifest,
  validateMicrosoftGroupEgressArtifactEntries,
  validateMicrosoftGroupEgressArtifactManifest,
} from "./lib/microsoft-group-egress-artifact.mjs";

function option(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1];
}

function required(value, name) {
  const text = String(value ?? "").trim();
  if (!text) throw new Error(`${name} is required`);
  return text;
}

function gitText(...args) {
  return execFileSync("git", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  }).trim();
}

function gitBytes(...args) {
  return execFileSync("git", args, {
    cwd: process.cwd(),
    encoding: null,
    maxBuffer: 16 * 1024 * 1024,
  });
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function inside(repository, target) {
  const path = relative(repository, target);
  return path === "" || (
    path !== ".."
    && !path.startsWith(`..${sep}`)
    && !isAbsolute(path)
  );
}

function createOutputDirectory(value, repository) {
  const requested = resolve(required(value, "--output-dir"));
  if (existsSync(requested)) {
    throw new Error("--output-dir must not already exist");
  }
  const requestedParent = dirname(requested);
  if (!existsSync(requestedParent) || !statSync(requestedParent).isDirectory()) {
    throw new Error("--output-dir parent must already exist");
  }
  const target = join(realpathSync(requestedParent), basename(requested));
  if (existsSync(target)) {
    throw new Error("--output-dir must not already exist");
  }
  if (inside(repository, target)) {
    throw new Error("--output-dir must remain outside the repository");
  }
  mkdirSync(target, { mode: 0o700 });
  try {
    if (realpathSync(target) !== target || inside(repository, target)) {
      throw new Error("--output-dir must remain outside the repository");
    }
    chmodSync(target, 0o700);
    return target;
  } catch (error) {
    rmSync(target, { recursive: true, force: true });
    throw error;
  }
}

if (Number(process.versions.node.split(".")[0]) !== 22) {
  throw new Error("Microsoft group egress artifact requires Node.js 22");
}

const sourceSha = required(option("--source-sha"), "--source-sha");
const sourceTree = required(option("--source-tree"), "--source-tree");
const repository = realpathSync(gitText("rev-parse", "--show-toplevel"));
if (sourceSha !== gitText("rev-parse", "HEAD")
  || sourceTree !== gitText("rev-parse", "HEAD^{tree}")) {
  throw new Error("Microsoft group egress artifact source identity drifted");
}
if (gitText("status", "--porcelain=v1", "--untracked-files=all")) {
  throw new Error("Microsoft group egress artifact requires a clean exact-head worktree");
}

const outputDir = createOutputDirectory(option("--output-dir"), repository);
if (!statSync(outputDir).isDirectory()) throw new Error("--output-dir is not a directory");

const baseName = `lawos-microsoft-group-egress-${sourceSha.slice(0, 12)}`;
const archivePath = join(outputDir, `${baseName}.zip`);
const manifestPath = join(outputDir, `${baseName}.manifest.json`);
if (existsSync(archivePath) || existsSync(manifestPath)) {
  throw new Error("Microsoft group egress artifact output already exists");
}

const staging = mkdtempSync(join(tmpdir(), "lawos-microsoft-group-egress-"));
let completed = false;
try {
  const sources = MICROSOFT_GROUP_EGRESS_SOURCE_PATHS.map((sourcePath) => {
    const bytes = gitBytes("cat-file", "blob", `${sourceSha}:${sourcePath}`);
    const archivePath = basename(sourcePath);
    const stagingPath = join(staging, archivePath);
    writeFileSync(stagingPath, bytes, { mode: 0o644 });
    chmodSync(stagingPath, 0o644);
    return Object.freeze({
      source_path: sourcePath,
      archive_path: archivePath,
      sha256: sha256(bytes),
      byte_size: bytes.byteLength,
    });
  });
  const manifest = createMicrosoftGroupEgressArtifactManifest({
    sourceSha,
    sourceTree,
    sources,
  });
  validateMicrosoftGroupEgressArtifactManifest(manifest);
  const packageBytes = Buffer.from(`${JSON.stringify({
    name: "lawos-microsoft-group-egress-runtime",
    private: true,
    type: "module",
    engines: { node: "22.x" },
  }, null, 2)}\n`);
  const manifestBytes = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`);
  const packagePath = join(staging, "package.json");
  const deploymentManifestPath = join(staging, "deployment-manifest.json");
  writeFileSync(packagePath, packageBytes, { mode: 0o644 });
  writeFileSync(deploymentManifestPath, manifestBytes, { mode: 0o644 });
  chmodSync(packagePath, 0o644);
  chmodSync(deploymentManifestPath, 0o644);

  const entries = [
    ...sources.map((source) => source.archive_path),
    "package.json",
    "deployment-manifest.json",
  ].sort();
  validateMicrosoftGroupEgressArtifactEntries(entries);
  const epoch = new Date("1980-01-01T00:00:00.000Z");
  for (const entry of entries) utimesSync(join(staging, entry), epoch, epoch);
  execFileSync("zip", ["-0", "-X", "-q", archivePath, ...entries], {
    cwd: staging,
    env: { ...process.env, TZ: "UTC" },
    stdio: ["ignore", "ignore", "pipe"],
  });
  chmodSync(archivePath, 0o600);
  const archivedEntries = execFileSync("unzip", ["-Z1", archivePath], {
    encoding: "utf8",
  }).trim().split("\n");
  validateMicrosoftGroupEgressArtifactEntries(archivedEntries);
  const archiveBytes = readFileSync(archivePath);
  writeFileSync(manifestPath, manifestBytes, { mode: 0o600 });
  chmodSync(manifestPath, 0o600);
  process.stdout.write(`${JSON.stringify({
    schema_version: "law-firm-os.microsoft-group-egress-build-receipt.v1",
    source_sha: sourceSha,
    source_tree: sourceTree,
    artifact_path: archivePath,
    artifact_sha256: sha256(archiveBytes),
    artifact_bytes: archiveBytes.byteLength,
    manifest_path: manifestPath,
    manifest_sha256: sha256(manifestBytes),
    entry_count: archivedEntries.length,
    provider_calls: 0,
    aws_calls: 0,
    m365_calls: 0,
    database_calls: 0,
  }, null, 2)}\n`);
  completed = true;
} finally {
  rmSync(staging, { recursive: true, force: true });
  if (!completed) rmSync(outputDir, { recursive: true, force: true });
}
