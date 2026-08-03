#!/usr/bin/env node

import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  Rf13DistValidationError,
  parseJsonFile,
  validateCanaryReceipt,
} from "./lib/rf13-dist-contract.mjs";

export { Rf13DistValidationError, validateCanaryReceipt } from "./lib/rf13-dist-contract.mjs";

function parseArgs(argv) {
  const options = { repoRoot: process.cwd() };
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === "--help" || flag === "-h") options.help = true;
    else if (["--receipt", "--release-id", "--source-sha", "--source-tree", "--artifact-sha256", "--repo-root"].includes(flag)) {
      const value = argv[++index];
      if (!value || value.startsWith("--")) throw new Rf13DistValidationError("INVALID_ARGUMENT", `${flag} requires a value`);
      if (flag === "--receipt") options.receiptPath = path.resolve(value);
      if (flag === "--release-id") options.releaseId = value;
      if (flag === "--source-sha") options.sourceSha = value;
      if (flag === "--source-tree") options.sourceTree = value;
      if (flag === "--artifact-sha256") options.artifactSha256 = value;
      if (flag === "--repo-root") options.repoRoot = path.resolve(value);
    } else throw new Rf13DistValidationError("INVALID_ARGUMENT", "unknown canary receipt validator option");
  }
  return options;
}

function usage() {
  return [
    "Usage: node scripts/validate-rfd018-canary-receipt.mjs --receipt PATH --release-id ID --source-sha SHA --source-tree TREE --artifact-sha256 HASH [--repo-root PATH]",
    "The file-only validator performs no network calls or mutations and cannot mint actual-canary authority. Valid but unauthoritative receipts exit 3.",
  ].join("\n");
}

function isOperationalAuthorityBlock(error) {
  return error instanceof Rf13DistValidationError
    && /(?:AUTHORITY|CAPABILITY|LIVE_[A-Z0-9_]*)_REQUIRED$/u.test(error.code);
}

export function main(argv = process.argv.slice(2)) {
  try {
    const options = parseArgs(argv);
    if (options.help) {
      process.stdout.write(`${usage()}\n`);
      return 0;
    }
    if (!options.receiptPath || !options.sourceSha || !options.sourceTree || !options.artifactSha256) {
      throw new Rf13DistValidationError("INVALID_ARGUMENT", "receipt and exact source/artifact bindings are required");
    }
    const result = validateCanaryReceipt(parseJsonFile(options.receiptPath, "canary receipt"), {
      expectedReleaseId: options.releaseId,
      expectedSourceSha: options.sourceSha,
      expectedSourceTree: options.sourceTree,
      expectedArtifactSha256: options.artifactSha256,
      repoRoot: options.repoRoot,
    });
    process.stdout.write(`${JSON.stringify({ validator: "rfd018-canary-receipt", verdict: result.status, ...result }, null, 2)}\n`);
    return result.status === "PASS" ? 0 : 3;
  } catch (error) {
    if (isOperationalAuthorityBlock(error)) {
      process.stdout.write(`${JSON.stringify({
        validator: "rfd018-canary-receipt",
        verdict: "BLOCKED",
        code: error.code,
        message: error.message,
      }, null, 2)}\n`);
      return 3;
    }
    process.stderr.write(`${JSON.stringify({
      validator: "rfd018-canary-receipt",
      verdict: "FAIL",
      code: error instanceof Rf13DistValidationError ? error.code : "CANARY_RECEIPT_VALIDATION_FAILED",
      message: error instanceof Rf13DistValidationError ? error.message : "canary receipt validation failed",
    })}\n`);
    return 1;
  }
}

const isMain = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isMain) process.exitCode = main();
