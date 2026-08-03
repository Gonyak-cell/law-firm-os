#!/usr/bin/env node

import { chmodSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  BLOCKED_BY_ARTIFACT,
  BLOCKED_BY_DEPLOYED_API,
  ADAPTER_FIXTURE_SCHEMA,
  FAIL_VERDICT,
  FormalRestartQaError,
  getFormalDeployedApiRestartCapability,
  runFormalDeployedApiRestartQa,
  validateFormalDeployedApiRestartReceipt,
} from "./lib/formal-deployed-api-restart-contract.mjs";
import { readFormalDeployedApiPackageQaReceipt } from "./lib/formal-deployed-api-package-qa.mjs";

function parseArgs(argv) {
  const options = { synthetic: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--synthetic") {
      options.synthetic = true;
      continue;
    }
    if (argument === "--help" || argument === "-h") {
      options.help = true;
      continue;
    }
    const equalsIndex = argument.indexOf("=");
    const flag = equalsIndex === -1 ? argument : argument.slice(0, equalsIndex);
    const inlineValue = equalsIndex === -1 ? undefined : argument.slice(equalsIndex + 1);
    const value = inlineValue ?? argv[++index];
    const values = {
      "--rfd015-receipt": "rfd015ReceiptPath",
      "--adapter-fixture": "adapterFixturePath",
      "--adapter-module": "adapterModulePath",
      "--receipt": "receiptPath",
      "--source-sha": "expectedSourceSha",
      "--source-tree": "expectedSourceTree",
      "--artifact-sha256": "expectedArtifactSha256",
      "--api-endpoint": "expectedApiEndpoint",
      "--tenant-id": "tenantId",
    };
    if (Object.hasOwn(values, flag)) {
      if (!value || value.startsWith("--")) throw new FormalRestartQaError("INVALID_ARGUMENT", `${flag} requires a value`);
      options[values[flag]] = value;
      continue;
    }
    throw new FormalRestartQaError("INVALID_ARGUMENT", `unknown restart QA option ${flag}`);
  }
  return options;
}

function usage() {
  return [
    "Usage: node scripts/run-formal-deployed-api-restart-qa.mjs --rfd015-receipt PATH --receipt PATH [--synthetic]",
    "       [--adapter-module PATH] [--adapter-fixture PATH] [--source-sha SHA] [--source-tree TREE] [--artifact-sha256 SHA] [--api-endpoint URL]",
    "The standalone CLI cannot carry opaque capabilities and fails CHAIN_REQUIRED; RFD-TUW-016 is invoked by the in-process RFD-TUW-015 chain.",
    "--synthetic is test-only and always emits a blocker.",
    "--adapter-module is rejected; caller adapters are never accepted.",
    "--adapter-fixture is test-only and always emits a blocker; it cannot authorize deployed API QA.",
    "A deployed-API PASS requires the actual RFD-TUW-015 authoritative receipt; missing prerequisites produce a blocked receipt.",
  ].join("\n");
}

function readJson(path, label) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    throw new FormalRestartQaError("INPUT_READ_FAILED", `${label} could not be read`);
  }
}

function exactKeys(value, keys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new FormalRestartQaError("ADAPTER_FIXTURE_INVALID", `${label} must be an object`);
  const expected = new Set(keys);
  if (Object.keys(value).some((key) => !expected.has(key)) || keys.some((key) => !Object.hasOwn(value, key))) {
    throw new FormalRestartQaError("ADAPTER_FIXTURE_INVALID", `${label} fields are invalid`);
  }
}

function readAdapterFixture(path) {
  const fixture = readJson(resolve(path), "adapter fixture");
  exactKeys(fixture, ["schema_version", "binding", "options"], "adapter fixture");
  if (fixture.schema_version !== ADAPTER_FIXTURE_SCHEMA) throw new FormalRestartQaError("ADAPTER_FIXTURE_INVALID", "adapter fixture schema is invalid");
  exactKeys(fixture.binding, ["source_sha", "source_tree", "api_endpoint_sha256", "artifact_sha256"], "adapter fixture binding");
  if (!fixture.options || typeof fixture.options !== "object" || Array.isArray(fixture.options)) throw new FormalRestartQaError("ADAPTER_FIXTURE_INVALID", "adapter fixture options are invalid");
  const allowed = ["staleSession", "changedUserData", "changedTenant", "missingDurableState", "duplicateState", "consoleErrors", "sourceMismatch"];
  if (Object.keys(fixture.options).some((key) => !allowed.includes(key))) throw new FormalRestartQaError("ADAPTER_FIXTURE_INVALID", "adapter fixture options contain unsupported fields");
  for (const key of allowed.filter((entry) => entry !== "consoleErrors")) {
    if (fixture.options[key] !== undefined && typeof fixture.options[key] !== "boolean") throw new FormalRestartQaError("ADAPTER_FIXTURE_INVALID", `${key} must be boolean`);
  }
  if (fixture.options.consoleErrors !== undefined
    && (!Array.isArray(fixture.options.consoleErrors) || fixture.options.consoleErrors.some((entry) => typeof entry !== "string"))) {
    throw new FormalRestartQaError("ADAPTER_FIXTURE_INVALID", "consoleErrors must be an array of strings");
  }
  return fixture;
}

export async function runFromCliOptions(options) {
  if (options.adapterFixturePath && options.adapterModulePath) throw new FormalRestartQaError("INVALID_ARGUMENT", "--adapter-fixture and --adapter-module are mutually exclusive");
  if (options.adapterModulePath) throw new FormalRestartQaError("ADAPTER_MODULE_UNAVAILABLE", "no tracked installed-app/deployed-API adapter is available for this worktree");
  const fixture = options.adapterFixturePath ? readAdapterFixture(options.adapterFixturePath) : undefined;
  if (!options.synthetic && !fixture) {
    throw new FormalRestartQaError("CHAIN_REQUIRED", "RFD-TUW-016 must be invoked by the canonical in-process RFD-TUW-015 chain; standalone CLI cannot carry opaque capabilities");
  }
  const rfd015ReceiptPath = !options.synthetic && !fixture && options.rfd015ReceiptPath
    ? resolve(options.rfd015ReceiptPath)
    : undefined;
  const adapter = undefined;
  const receipt = await runFormalDeployedApiRestartQa({
    adapter,
    syntheticMode: options.synthetic === true || Boolean(fixture),
    rfd015ReceiptPath,
    rootDir: process.cwd(),
    expectedSourceSha: options.expectedSourceSha,
    expectedSourceTree: options.expectedSourceTree,
    expectedArtifactSha256: options.expectedArtifactSha256,
    expectedApiEndpoint: options.expectedApiEndpoint,
    userDataId: options.userDataId,
    tenantId: options.tenantId,
  });
  const authoritativeLoaded = receipt.verdict === "PASS" && rfd015ReceiptPath
    ? readFormalDeployedApiPackageQaReceipt(rfd015ReceiptPath, { rootDir: process.cwd() })
    : undefined;
  const authoritativeReceipt = authoritativeLoaded?.receipt;
  const authoritativeCapability = authoritativeLoaded?.capability;
  const restartCapability = receipt.verdict === "PASS"
    ? getFormalDeployedApiRestartCapability(receipt)
    : undefined;
  validateFormalDeployedApiRestartReceipt(receipt, {
    authoritativeReceipt,
    authoritativeCapability,
    restartCapability,
    expectedSourceSha: options.expectedSourceSha,
    expectedSourceTree: options.expectedSourceTree,
    expectedArtifactSha256: options.expectedArtifactSha256,
    expectedApiEndpoint: options.expectedApiEndpoint,
  });
  if (options.receiptPath) {
    const output = resolve(options.receiptPath);
    writeFileSync(output, `${JSON.stringify(receipt, null, 2)}\n`, { flag: "wx", mode: 0o600 });
    chmodSync(output, 0o600);
  }
  return receipt;
}

export async function main(argv = process.argv.slice(2)) {
  try {
    const options = parseArgs(argv);
    if (options.help) {
      process.stdout.write(`${usage()}\n`);
      return 0;
    }
    if (!options.receiptPath) throw new FormalRestartQaError("INVALID_ARGUMENT", "--receipt is required");
    const receipt = await runFromCliOptions(options);
    process.stdout.write(`${JSON.stringify({ verdict: receipt.verdict, receipt: resolve(options.receiptPath), checkpoint_id: receipt.checkpoint_id }, null, 2)}\n`);
    if (receipt.verdict === "PASS") return 0;
    if ([BLOCKED_BY_DEPLOYED_API, BLOCKED_BY_ARTIFACT].includes(receipt.verdict)) return 2;
    if (receipt.verdict === FAIL_VERDICT) return 1;
    return 1;
  } catch (error) {
    process.stderr.write(`${JSON.stringify({
      validator: "formal-deployed-api-restart-qa",
      verdict: "FAIL",
      code: error instanceof FormalRestartQaError ? error.code : "RESTART_QA_FAILED",
      message: error instanceof FormalRestartQaError ? error.message : "restart QA failed",
    })}\n`);
    return 1;
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) process.exitCode = await main();
