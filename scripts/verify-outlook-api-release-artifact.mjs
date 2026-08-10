#!/usr/bin/env node

import { constants } from "node:fs";
import { lstat, mkdtemp, open, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { validateApiArtifactReleaseFromProducerBuilds } from "./lib/outlook-release/api-artifact.mjs";
import { createCommandRunner, exactGitIdentity } from "./lib/outlook-release/cli-runtime.mjs";

const scriptPath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(scriptPath), "..");
const builderPath = path.join(repoRoot, "scripts/build-json-postgres-production-artifact.mjs");
const MAX_JSON_BYTES = 4 * 1024 * 1024;
const MAX_ARCHIVE_BYTES = 50 * 1024 * 1024;

function option(name, { optional = false } = {}) {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1] : null;
  if ((!value || value.startsWith("--")) && !optional) throw new TypeError(`${name} is required`);
  return value && !value.startsWith("--") ? path.resolve(value) : null;
}

async function readProtectedRegularFile(file, name, maxBytes) {
  const target = path.resolve(file);
  const linkMetadata = await lstat(target);
  if (linkMetadata.isSymbolicLink() || !linkMetadata.isFile()) {
    throw new Error(`${name} must be a regular non-symlink file`);
  }
  if ((linkMetadata.mode & 0o022) !== 0) throw new Error(`${name} must not be group/world writable`);
  const handle = await open(target, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    const metadata = await handle.stat();
    if (!metadata.isFile() || (metadata.mode & 0o022) !== 0) {
      throw new Error(`${name} changed filesystem type or permissions while opening`);
    }
    if (metadata.dev !== linkMetadata.dev || metadata.ino !== linkMetadata.ino) {
      throw new Error(`${name} changed between path validation and open`);
    }
    if (metadata.size < 1 || metadata.size > maxBytes) throw new Error(`${name} size is invalid`);
    const bytes = await handle.readFile();
    if (bytes.byteLength !== metadata.size) throw new Error(`${name} changed while reading`);
    return bytes;
  } finally {
    await handle.close();
  }
}

function parseJson(bytes, name) {
  try {
    return JSON.parse(Buffer.from(bytes).toString("utf8"));
  } catch {
    throw new Error(`${name} is not valid JSON`);
  }
}

export function parseApiArtifactFileEntries(output) {
  if (typeof output !== "string") throw new TypeError("API artifact inventory output is invalid");
  return output.split(/\r?\n/u).filter((entry) => entry && !entry.endsWith("/"));
}

export async function buildApiArtifactProvenance({
  sourceSha, sourceTree, verifierRoot, caCopyPath, runCommand,
  readOutput = readProtectedRegularFile,
}) {
  const producerBuilds = [];
  for (let buildIndex = 0; buildIndex < 2; buildIndex += 1) {
    const outputDir = path.join(verifierRoot, `producer-${buildIndex + 1}`);
    runCommand(process.execPath, [
      builderPath,
      "--source-sha", sourceSha,
      "--source-tree", sourceTree,
      "--output-dir", outputDir,
      "--rds-ca-bundle", caCopyPath,
    ], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
    const prefix = `lawos-production-${sourceSha}`;
    const artifactBytes = await readOutput(
      path.join(outputDir, `${prefix}.zip`),
      `API producer build ${buildIndex + 1} artifact`,
      MAX_ARCHIVE_BYTES,
    );
    const manifestBytes = await readOutput(
      path.join(outputDir, `${prefix}.manifest.json`),
      `API producer build ${buildIndex + 1} outer manifest`,
      MAX_JSON_BYTES,
    );
    producerBuilds.push({
      artifactBytes,
      outerManifest: parseJson(manifestBytes, `API producer build ${buildIndex + 1} outer manifest`),
    });
  }
  return producerBuilds;
}

async function main() {
  if (Number(process.versions.node.split(".")[0]) !== 22) {
    throw new Error("API production provenance verification requires Node.js 22");
  }
  const artifactPath = option("--artifact");
  const artifactManifestPath = option("--artifact-manifest");
  const rdsCaBundlePath = option("--rds-ca-bundle");
  const receiptPath = option("--receipt");
  const beforePath = option("--before-config");
  const afterPath = option("--after-config", { optional: true });
  const sourceIndex = process.argv.indexOf("--source-sha");
  const expectedSourceSha = sourceIndex >= 0 ? process.argv[sourceIndex + 1] : null;
  if (!expectedSourceSha || expectedSourceSha.startsWith("--")) throw new TypeError("--source-sha is required");

  const runCommand = createCommandRunner({
    cwd: repoRoot,
    allowedCommands: ["git", "unzip", process.execPath],
  });
  const { sourceSha, sourceTree } = exactGitIdentity({ expectedSourceSha, runCommand });
  const [
    artifactBytes,
    candidateOuterManifestBytes,
    rdsCaBundleBytes,
    contractBytes,
    packageLockBytes,
    receiptBytes,
    beforeConfigurationBytes,
    afterConfigurationBytes,
  ] = await Promise.all([
    readProtectedRegularFile(artifactPath, "candidate API artifact", MAX_ARCHIVE_BYTES),
    readProtectedRegularFile(artifactManifestPath, "candidate API outer manifest", MAX_JSON_BYTES),
    readProtectedRegularFile(rdsCaBundlePath, "RDS CA bundle", MAX_JSON_BYTES),
    readProtectedRegularFile(
      path.join(repoRoot, "contracts/outlook-addin-release-gates.json"),
      "release contract",
      MAX_JSON_BYTES,
    ),
    readProtectedRegularFile(path.join(repoRoot, "package-lock.json"), "package lock", MAX_JSON_BYTES),
    readProtectedRegularFile(receiptPath, "API release receipt", MAX_JSON_BYTES),
    readProtectedRegularFile(beforePath, "before-deploy Lambda configuration", MAX_JSON_BYTES),
    afterPath
      ? readProtectedRegularFile(afterPath, "after-deploy Lambda configuration", MAX_JSON_BYTES)
      : undefined,
  ]);
  const contract = parseJson(contractBytes, "release contract");
  const candidateOuterManifest = parseJson(candidateOuterManifestBytes, "candidate API outer manifest");
  const receipt = parseJson(receiptBytes, "API release receipt");
  const beforeConfiguration = parseJson(beforeConfigurationBytes, "before-deploy Lambda configuration");
  const afterConfiguration = afterConfigurationBytes
    ? parseJson(afterConfigurationBytes, "after-deploy Lambda configuration")
    : undefined;
  const verifierRoot = await mkdtemp(path.join(tmpdir(), "amic-os-outlook-api-provenance-"));
  try {
    const candidateCopyPath = path.join(verifierRoot, "candidate.zip");
    const caCopyPath = path.join(verifierRoot, "rds-ca-bundle.pem");
    await writeFile(candidateCopyPath, artifactBytes, { flag: "wx", mode: 0o600 });
    await writeFile(caCopyPath, rdsCaBundleBytes, { flag: "wx", mode: 0o600 });

    const producerBuilds = await buildApiArtifactProvenance({
      sourceSha, sourceTree, verifierRoot, caCopyPath, runCommand,
    });

    const archiveEntries = parseApiArtifactFileEntries(runCommand("unzip", ["-Z1", candidateCopyPath], {
      encoding: "utf8",
      maxBuffer: 4 * 1024 * 1024,
    }));
    const embeddedManifest = parseJson(Buffer.from(runCommand("unzip", [
      "-p",
      candidateCopyPath,
      contract.api.embedded_manifest_path,
    ], { encoding: "utf8", maxBuffer: 4 * 1024 * 1024 })), "embedded API deployment manifest");
    const result = validateApiArtifactReleaseFromProducerBuilds({
      receipt,
      artifactBytes,
      archiveEntries,
      embeddedManifest,
      candidateOuterManifest,
      producerBuilds,
      expectedSourceSha: sourceSha,
      expectedSourceTree: sourceTree,
      packageLockBytes,
      rdsCaBundleBytes,
      beforeConfiguration,
      afterConfiguration,
      contract,
    });
    process.stdout.write(`${JSON.stringify({
      verdict: "PASS",
      ...result,
      node_version: process.versions.node,
      allowed_claim: receipt.mode === "dry-run"
        ? "The twice-reproduced exact-SHA API artifact and pre-deploy environment fingerprint were verified without mutation."
        : "The twice-reproduced exact-SHA API code digest and unchanged Lambda environment were read back after an authorized deployment.",
      blocked_claim: receipt.mode === "dry-run"
        ? "No Lambda code or environment was deployed or changed."
        : "This receipt is not static, M365, Outlook-host, propagation, or go-live evidence.",
    }, null, 2)}\n`);
  } finally {
    await rm(verifierRoot, { recursive: true, force: true });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
