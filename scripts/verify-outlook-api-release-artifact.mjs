#!/usr/bin/env node

import { lstat, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { validateApiArtifactEntries, validateApiArtifactRelease } from "./lib/outlook-release-gates.mjs";
import { createCommandRunner, exactGitIdentity } from "./lib/outlook-release/cli-runtime.mjs";

const scriptPath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(scriptPath), "..");

function option(name, { optional = false } = {}) {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1] : null;
  if ((!value || value.startsWith("--")) && !optional) throw new TypeError(`${name} is required`);
  return value && !value.startsWith("--") ? path.resolve(value) : null;
}

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

async function main() {
  const artifactPath = option("--artifact");
  const receiptPath = option("--receipt");
  const beforePath = option("--before-config");
  const afterPath = option("--after-config", { optional: true });
  const sourceIndex = process.argv.indexOf("--source-sha");
  const expectedSourceSha = sourceIndex >= 0 ? process.argv[sourceIndex + 1] : null;
  if (!expectedSourceSha || expectedSourceSha.startsWith("--")) throw new TypeError("--source-sha is required");
  if ((await lstat(artifactPath)).isSymbolicLink()) throw new Error("API artifact must not be a symlink");

  const runCommand = createCommandRunner({ cwd: repoRoot, allowedCommands: ["git", "unzip"] });
  const { sourceSha, sourceTree } = exactGitIdentity({ expectedSourceSha, runCommand });

  const contract = await readJson(path.join(repoRoot, "contracts/outlook-addin-release-gates.json"));
  const artifactBytes = await readFile(artifactPath);
  const packageLockBytes = await readFile(path.join(repoRoot, "package-lock.json"));
  const receipt = await readJson(receiptPath);
  const beforeConfiguration = await readJson(beforePath);
  const afterConfiguration = afterPath ? await readJson(afterPath) : undefined;
  const archiveEntries = runCommand("unzip", ["-Z1", artifactPath], {
    encoding: "utf8",
    maxBuffer: 4 * 1024 * 1024,
  }).split(/\r?\n/u).filter(Boolean);
  validateApiArtifactEntries(archiveEntries, contract.api.embedded_manifest_path);
  const embeddedManifest = JSON.parse(runCommand("unzip", [
    "-p",
    artifactPath,
    contract.api.embedded_manifest_path,
  ], { encoding: "utf8", maxBuffer: 4 * 1024 * 1024 }));
  const result = validateApiArtifactRelease({
    receipt,
    artifactBytes,
    embeddedManifest,
    expectedSourceSha: sourceSha,
    expectedSourceTree: sourceTree,
    packageLockBytes,
    beforeConfiguration,
    afterConfiguration,
    contract,
  });
  process.stdout.write(`${JSON.stringify({
    verdict: "PASS",
    ...result,
    allowed_claim: receipt.mode === "dry-run"
      ? "The exact-SHA API artifact and pre-deploy environment fingerprint were verified without mutation."
      : "The exact-SHA API code digest and unchanged Lambda environment were read back after an authorized deployment.",
    blocked_claim: receipt.mode === "dry-run"
      ? "No Lambda code or environment was deployed or changed."
      : "This receipt is not static, M365, Outlook-host, propagation, or go-live evidence.",
  }, null, 2)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
