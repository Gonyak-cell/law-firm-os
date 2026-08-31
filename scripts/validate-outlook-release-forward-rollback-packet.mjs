#!/usr/bin/env node

import { createHash } from "node:crypto";
import { closeSync, constants, createReadStream, fstatSync, openSync } from "node:fs";
import { lstat, readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildCrossSurfaceForwardRollbackReceipt,
  openProtectedEvidenceRoot,
  sha256,
  validateCrossSurfaceForwardRollbackContract,
  verifyCrossSurfaceForwardRollbackEvidence,
  verifyForwardStaticRollbackSnapshot,
} from "./lib/outlook-release-gates.mjs";
import { createCommandRunner, exactGitIdentity } from "./lib/outlook-release/cli-runtime.mjs";

const scriptPath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(scriptPath), "..");
const packetRef = "contracts/outlook-addin-forward-rollback-packet.json";
const forwardStaticRef = "contracts/outlook-addin-forward-static-rollback.json";
const releaseContractRef = "contracts/outlook-addin-release-gates.json";
const rollbackManifestRef = "apps/addin/manifest.canary.rollback.production.xml";
const desktopBaseline = "09ad50c275292899a03b46962493cf39ce714b09";

function option(name) {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1] : null;
  if (!value || value.startsWith("--")) throw new TypeError(`${name} is required`);
  return value;
}

async function hashRegularFile(root, relative) {
  const resolvedRoot = await realpath(path.resolve(root));
  const requested = path.join(resolvedRoot, relative);
  const metadata = await lstat(requested);
  if (!metadata.isFile() || metadata.isSymbolicLink() || (metadata.mode & 0o022) !== 0) {
    throw new Error(`desktop package artifact is not a protected regular file: ${relative}`);
  }
  const resolved = await realpath(requested);
  if (resolved !== requested || !resolved.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new Error(`desktop package artifact escaped the protected root: ${relative}`);
  }
  const descriptor = openSync(resolved, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    const before = fstatSync(descriptor);
    if (!before.isFile() || (before.mode & 0o022) !== 0) {
      throw new Error(`desktop package artifact changed type or mode: ${relative}`);
    }
    const digest = createHash("sha256");
    await new Promise((resolve, reject) => {
      const stream = createReadStream(resolved, { autoClose: false, fd: descriptor });
      stream.on("data", (chunk) => digest.update(chunk));
      stream.on("error", reject);
      stream.on("end", resolve);
    });
    const after = fstatSync(descriptor);
    if (before.dev !== after.dev || before.ino !== after.ino || before.size !== after.size
      || before.mtimeMs !== after.mtimeMs || before.mode !== after.mode) {
      throw new Error(`desktop package artifact changed while hashing: ${relative}`);
    }
    return digest.digest("hex");
  } finally {
    closeSync(descriptor);
  }
}

async function verifyDesktopReadback(packet, desktopPackageRoot, runCommand) {
  const profiles = new Map(packet.surfaces.desktop.profiles.map((profile) => [profile.platform, profile]));
  const mac = profiles.get("macos-arm64");
  const windows = profiles.get("windows-x64");
  const dmg = await hashRegularFile(desktopPackageRoot, "mac/AMIC-OS-internal-0.1.29-macos.dmg");
  const zip = await hashRegularFile(desktopPackageRoot, "mac/AMIC-OS-internal-0.1.29-macos.zip");
  if (dmg !== mac.package_hashes.dmg_sha256 || zip !== mac.package_hashes.zip_sha256) {
    throw new Error("sealed macOS 0.1.29 package checksum drifted");
  }
  for (const profile of [mac, windows]) {
    const tree = String(runCommand("git", ["show", "-s", "--format=%T", profile.source_sha])).trim();
    if (tree !== profile.source_tree) throw new Error(`${profile.platform} 0.1.29 source tree drifted`);
  }
  const desktopDiff = String(runCommand("git", [
    "diff", "--name-only", `${desktopBaseline}...HEAD`, "--", "apps/desktop",
  ])).trim().split("\n").filter(Boolean);
  if (desktopDiff.length) throw new Error(`desktop compatibility surface changed: ${desktopDiff.join(", ")}`);
  return {
    macos_exact_package_hashes_verified: true,
    windows_package_hashes_contract_bound: true,
    desktop_source_diff_count: 0,
    desktop_mutation_count: 0,
  };
}

export async function createOutlookForwardRollbackReceipt({
  expectedSourceSha,
  priorSnapshotRoot,
  desktopPackageRoot,
} = {}) {
  if (!expectedSourceSha || !priorSnapshotRoot || !desktopPackageRoot) {
    throw new TypeError("expectedSourceSha, priorSnapshotRoot, and desktopPackageRoot are required");
  }
  const [packetBytes, forwardStaticBytes, releaseContractBytes, rollbackManifestBytes] = await Promise.all([
    readFile(path.join(repoRoot, packetRef)),
    readFile(path.join(repoRoot, forwardStaticRef)),
    readFile(path.join(repoRoot, releaseContractRef)),
    readFile(path.join(repoRoot, rollbackManifestRef)),
  ]);
  const packet = JSON.parse(packetBytes);
  const forwardStatic = JSON.parse(forwardStaticBytes);
  const releaseContract = JSON.parse(releaseContractBytes);
  const contractResult = validateCrossSurfaceForwardRollbackContract(packet, {
    packetBytes,
    forwardStatic,
    forwardStaticBytes,
    rollbackManifestBytes,
  });
  const store = openProtectedEvidenceRoot(priorSnapshotRoot);
  const evidence = verifyCrossSurfaceForwardRollbackEvidence(packet, store);
  const staticSnapshotProof = verifyForwardStaticRollbackSnapshot(
    forwardStatic,
    releaseContract,
    rollbackManifestBytes,
    store,
  );
  const runCommand = createCommandRunner({ cwd: repoRoot, allowedCommands: ["git"] });
  const { sourceSha, sourceTree } = exactGitIdentity({ expectedSourceSha, runCommand });
  const desktopReadback = await verifyDesktopReadback(packet, desktopPackageRoot, runCommand);
  return buildCrossSurfaceForwardRollbackReceipt({
    packet,
    packetSha256: sha256(packetBytes),
    sourceSha,
    sourceTree,
    contractResult,
    evidence,
    staticSnapshotProof,
    desktopReadback,
  });
}

async function main() {
  const receipt = await createOutlookForwardRollbackReceipt({
    expectedSourceSha: option("--source-sha"),
    priorSnapshotRoot: path.resolve(option("--prior-snapshot-root")),
    desktopPackageRoot: path.resolve(option("--desktop-package-root")),
  });
  process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
