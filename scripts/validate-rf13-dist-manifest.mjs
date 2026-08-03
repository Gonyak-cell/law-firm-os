#!/usr/bin/env node

import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  Rf13DistValidationError,
  buildBlockedRf13DistManifest,
  parseJsonFile,
  sealRf13DistManifest,
  validateRf13DistManifest,
} from "./lib/rf13-dist-contract.mjs";

export {
  Rf13DistValidationError,
  buildBlockedRf13DistManifest,
  sealRf13DistManifest,
  validateRf13DistManifest,
} from "./lib/rf13-dist-contract.mjs";

function nextValue(argv, index, flag) {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) throw new Rf13DistValidationError("INVALID_ARGUMENT", `${flag} requires a value`);
  return value;
}

function parseArgs(argv) {
  const options = { repoRoot: process.cwd(), template: false };
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === "--help" || flag === "-h") options.help = true;
    else if (flag === "--template") options.template = true;
    else if (flag === "--manifest") options.manifestPath = path.resolve(nextValue(argv, index++, flag));
    else if (flag === "--source-sha") options.sourceSha = nextValue(argv, index++, flag);
    else if (flag === "--source-tree") options.sourceTree = nextValue(argv, index++, flag);
    else if (flag === "--version") options.version = nextValue(argv, index++, flag);
    else if (flag === "--repo-root") options.repoRoot = path.resolve(nextValue(argv, index++, flag));
    else throw new Rf13DistValidationError("INVALID_ARGUMENT", "unknown RF13-DIST validator option");
  }
  return options;
}

function usage() {
  return [
    "Usage: node scripts/validate-rf13-dist-manifest.mjs --manifest PATH --source-sha SHA [--repo-root PATH]",
    "       node scripts/validate-rf13-dist-manifest.mjs --template [--source-sha SHA] [--source-tree TREE] [--version VERSION]",
    "The file-only validator is read-only and cannot mint live gate authority. Missing authority exits 3 as BLOCKED.",
  ].join("\n");
}

function isOperationalAuthorityBlock(error) {
  return error instanceof Rf13DistValidationError
    && /(?:AUTHORITY|CAPABILITY|LIVE_[A-Z0-9_]*)_REQUIRED$/u.test(error.code);
}

export function runManifestValidation({ manifestPath, expectedSourceSha, repoRoot = process.cwd() } = {}) {
  if (!manifestPath) throw new Rf13DistValidationError("INVALID_ARGUMENT", "an explicit manifest path is required");
  const manifest = parseJsonFile(manifestPath, "RF13-DIST manifest");
  return validateRf13DistManifest(manifest, { expectedSourceSha, repoRoot });
}

export function main(argv = process.argv.slice(2)) {
  try {
    const options = parseArgs(argv);
    if (options.help) {
      process.stdout.write(`${usage()}\n`);
      return 0;
    }
    if (options.template) {
      if (options.manifestPath) throw new Rf13DistValidationError("INVALID_ARGUMENT", "--template cannot be combined with --manifest");
      const template = buildBlockedRf13DistManifest({
        sourceSha: options.sourceSha,
        sourceTree: options.sourceTree,
        version: options.version,
      });
      process.stdout.write(`${JSON.stringify(template, null, 2)}\n`);
      return 3;
    }
    if (options.sourceTree || options.version) {
      throw new Rf13DistValidationError("INVALID_ARGUMENT", "--source-tree and --version are template-only options");
    }
    const result = runManifestValidation({
      manifestPath: options.manifestPath,
      expectedSourceSha: options.sourceSha,
      repoRoot: options.repoRoot,
    });
    process.stdout.write(`${JSON.stringify({ validator: "rf13-dist-manifest", verdict: result.status, ...result }, null, 2)}\n`);
    return result.status === "PASS" ? 0 : 3;
  } catch (error) {
    if (isOperationalAuthorityBlock(error)) {
      process.stdout.write(`${JSON.stringify({
        validator: "rf13-dist-manifest",
        verdict: "BLOCKED",
        code: error.code,
        message: error.message,
      }, null, 2)}\n`);
      return 3;
    }
    process.stderr.write(`${JSON.stringify({
      validator: "rf13-dist-manifest",
      verdict: "FAIL",
      code: error instanceof Rf13DistValidationError ? error.code : "RF13_DIST_VALIDATION_FAILED",
      message: error instanceof Rf13DistValidationError ? error.message : "RF13-DIST validation failed",
    })}\n`);
    return 1;
  }
}

const isMain = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isMain) process.exitCode = main();
