#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  BLOCKED_BY_ARTIFACT,
  BLOCKED_BY_DEPLOYED_API,
  CHECKPOINT_ID,
  FAIL_VERDICT,
  FormalRestartQaError,
  SCHEMA_VERSION,
  validateFormalDeployedApiRestartReceipt,
} from "./lib/formal-deployed-api-restart-contract.mjs";
import { readFormalDeployedApiPackageQaReceipt } from "./lib/formal-deployed-api-package-qa.mjs";

export {
  BLOCKED_BY_ARTIFACT,
  BLOCKED_BY_DEPLOYED_API,
  CHECKPOINT_ID,
  FAIL_VERDICT,
  FormalRestartQaError,
  SCHEMA_VERSION,
  validateFormalDeployedApiRestartReceipt,
} from "./lib/formal-deployed-api-restart-contract.mjs";

function parseArgs(argv) {
  const options = {};
  const valueFlags = {
    "--receipt": "receiptPath",
    "--rfd015-receipt": "rfd015ReceiptPath",
    "--source-sha": "expectedSourceSha",
    "--source-tree": "expectedSourceTree",
    "--artifact-sha256": "expectedArtifactSha256",
    "--api-endpoint": "expectedApiEndpoint",
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--help" || argument === "-h") {
      options.help = true;
      continue;
    }
    const equalsIndex = argument.indexOf("=");
    const flag = equalsIndex === -1 ? argument : argument.slice(0, equalsIndex);
    const inlineValue = equalsIndex === -1 ? undefined : argument.slice(equalsIndex + 1);
    if (!Object.hasOwn(valueFlags, flag)) throw new FormalRestartQaError("INVALID_ARGUMENT", `unknown restart validator option ${flag}`);
    const value = inlineValue ?? argv[++index];
    if (!value || value.startsWith("--")) throw new FormalRestartQaError("INVALID_ARGUMENT", `${flag} requires a value`);
    options[valueFlags[flag]] = value;
  }
  return options;
}

function usage() {
  return [
    "Usage: node scripts/validate-formal-deployed-api-restart-qa.mjs --receipt PATH [--rfd015-receipt PATH]",
    "       [--source-sha SHA] [--source-tree TREE] [--artifact-sha256 SHA] [--api-endpoint URL]",
    "PASS receipts require --rfd015-receipt plus a reviewed opaque restart-execution capability; this worktree intentionally has no such adapter.",
  ].join("\n");
}

function readJson(path, label) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    throw new FormalRestartQaError("INPUT_READ_FAILED", `${label} could not be read`);
  }
}

export function runValidation({ receiptPath, rfd015ReceiptPath, expectedSourceSha, expectedSourceTree, expectedArtifactSha256, expectedApiEndpoint } = {}) {
  if (typeof receiptPath !== "string" || !receiptPath) throw new FormalRestartQaError("INVALID_ARGUMENT", "--receipt is required");
  const receipt = readJson(resolve(receiptPath), "restart receipt");
  const authoritativeLoaded = rfd015ReceiptPath
    ? readFormalDeployedApiPackageQaReceipt(resolve(rfd015ReceiptPath), { rootDir: process.cwd() })
    : undefined;
  const authoritativeReceipt = authoritativeLoaded?.receipt;
  const authoritativeCapability = authoritativeLoaded?.capability;
  const validated = validateFormalDeployedApiRestartReceipt(receipt, {
    authoritativeReceipt,
    authoritativeCapability,
    expectedSourceSha,
    expectedSourceTree,
    expectedArtifactSha256,
    expectedApiEndpoint,
  });
  // The current worktree has no tracked installed-app adapter or opaque raw
  // restart-transcript capability. Keep the standalone validator fail-closed
  // even when a caller supplies an otherwise valid upstream capability; only a
  // future reviewed runner may remove this gate after recording process-exit,
  // fresh-userData, and second-launch evidence.
  if (validated.verdict === "PASS") {
    throw new FormalRestartQaError("RESTART_EXECUTION_CAPABILITY_REQUIRED", "PASS validation requires an opaque RFD-TUW-016 restart execution capability");
  }
  return {
    validator: "formal-deployed-api-restart-qa",
    schema_version: SCHEMA_VERSION,
    checkpoint_id: CHECKPOINT_ID,
    verdict: validated.verdict,
    status: validated.status,
    ...validated,
  };
}

export function main(argv = process.argv.slice(2)) {
  try {
    const options = parseArgs(argv);
    if (options.help) {
      process.stdout.write(`${usage()}\n`);
      return 0;
    }
    const result = runValidation(options);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return result.verdict === "PASS" ? 0 : [BLOCKED_BY_DEPLOYED_API, BLOCKED_BY_ARTIFACT].includes(result.verdict) ? 2 : 1;
  } catch (error) {
    process.stderr.write(`${JSON.stringify({
      validator: "formal-deployed-api-restart-qa",
      verdict: "FAIL",
      code: error instanceof FormalRestartQaError ? error.code : "RESTART_RECEIPT_VALIDATION_FAILED",
      message: error instanceof FormalRestartQaError ? error.message : "restart receipt validation failed",
    })}\n`);
    return 1;
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) process.exitCode = main();
