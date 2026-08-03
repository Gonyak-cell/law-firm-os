#!/usr/bin/env node

import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  RF13_DIST_ROLLBACK_TRIGGER_CODES,
  Rf13DistValidationError,
  buildBlockedCanaryTemplate,
  parseJsonFile,
  runRfd018ActualCanary,
  runSyntheticCanaryMonitor,
} from "./lib/rf13-dist-contract.mjs";
import {
  readFormalDeployedApiPackageQaReceipt,
  validateFormalDeployedApiAuthorityCapability,
} from "./lib/formal-deployed-api-package-qa.mjs";
import {
  getFormalDeployedApiRestartCapability,
  runFormalDeployedApiRestartQa,
  validateFormalDeployedApiRestartReceipt,
} from "./lib/formal-deployed-api-restart-contract.mjs";
import { validateFormalPackageLoopbackNativeQaCapability } from "./lib/formal-package-loopback-evidence.mjs";

export {
  RF13_DIST_ROLLBACK_TRIGGER_CODES,
  Rf13DistValidationError,
  buildBlockedCanaryTemplate,
  runRfd018ActualCanary,
  runSyntheticCanaryMonitor,
} from "./lib/rf13-dist-contract.mjs";

const TRACKED_RFD016_INSTALLED_APP_ADAPTER = null;
const AUTHORITATIVE_OPTION_KEYS = new Set([
  "apiEndpointSha256",
  "artifactSha256",
  "packageQaCapability",
  "repoRoot",
  "rfd015ReceiptPath",
  "sourceSha",
  "sourceTree",
]);

function rejectUntrustedAuthoritativeInputs(options) {
  if (!options || typeof options !== "object" || Array.isArray(options)) {
    throw new Rf13DistValidationError("INVALID_ARGUMENT", "authoritative canary options must be an object");
  }
  if (Object.keys(options).some((key) => !AUTHORITATIVE_OPTION_KEYS.has(key))) {
    throw new Rf13DistValidationError(
      "INVALID_ARGUMENT",
      "authoritative canary accepts fixed prerequisite bindings only; caller observations and adapters are forbidden",
    );
  }
}

function authoritativeBlock(options, blocker, upstream) {
  return Object.freeze({
    checkpoint_id: "RFD-TUW-018",
    verdict: "BLOCKED_BY_ARTIFACT/AUTHORITY",
    blocker,
    actual_canary_executed: false,
    rollback_trigger_injected: false,
    upstream: Object.freeze({
      rfd014: upstream.rfd014 ?? "NOT_PROVEN",
      rfd015: upstream.rfd015 ?? "NOT_PROVEN",
      rfd016: upstream.rfd016 ?? "NOT_PROVEN",
    }),
    receipt: buildBlockedCanaryTemplate({
      sourceSha: options.sourceSha,
      sourceTree: options.sourceTree,
      macosArtifactSha256: options.artifactSha256,
    }),
    capability: null,
    boundary: Object.freeze({
      network_contacted: false,
      mutation_executed: false,
      installed_package_launched: false,
    }),
  });
}

/**
 * Compose the fixed RFD-TUW-014 -> 015 -> 016 same-process capability chain.
 * The caller may supply opaque prerequisite capabilities and exact bindings,
 * but cannot supply observations or executable adapters. With no tracked
 * RFD-TUW-016/RFD-TUW-018 installed-app adapter in this worktree, this entry
 * point returns a truthful operational blocker before package launch.
 */
export async function runAuthoritativeRfd018Canary(options = {}) {
  rejectUntrustedAuthoritativeInputs(options);
  // Validate the exact canary bindings before touching any prerequisite file.
  buildBlockedCanaryTemplate({
    sourceSha: options.sourceSha,
    sourceTree: options.sourceTree,
    macosArtifactSha256: options.artifactSha256,
  });
  const upstream = {};
  try {
    validateFormalPackageLoopbackNativeQaCapability(options.packageQaCapability, {
      platform: "macos",
      source_sha: options.sourceSha,
      source_tree: options.sourceTree,
      artifact_sha256: options.artifactSha256,
      verdict: "PASS",
      native_verdict: "PASS",
      authoritative: true,
    });
    upstream.rfd014 = "PASS";
  } catch {
    return authoritativeBlock(options, "RFD014_NATIVE_CAPABILITY_REQUIRED", upstream);
  }

  let deployed;
  try {
    deployed = readFormalDeployedApiPackageQaReceipt(options.rfd015ReceiptPath, {
      rootDir: options.repoRoot,
      packageQaCapability: options.packageQaCapability,
    });
    validateFormalDeployedApiAuthorityCapability(deployed.capability, {
      sourceSha: options.sourceSha,
      sourceTree: options.sourceTree,
      artifactSha256: options.artifactSha256,
      apiEndpointSha256: options.apiEndpointSha256,
    });
    upstream.rfd015 = "PASS";
  } catch {
    return authoritativeBlock(options, "RFD015_DEPLOYED_API_CAPABILITY_REQUIRED", upstream);
  }

  const restartReceipt = await runFormalDeployedApiRestartQa({
    adapter: TRACKED_RFD016_INSTALLED_APP_ADAPTER,
    rfd015Receipt: deployed.receipt,
    rfd015Capability: deployed.capability,
    packageQaCapability: options.packageQaCapability,
    rootDir: options.repoRoot,
    expectedSourceSha: options.sourceSha,
    expectedSourceTree: options.sourceTree,
    expectedArtifactSha256: options.artifactSha256,
    expectedApiEndpointSha256: options.apiEndpointSha256,
  });
  try {
    validateFormalDeployedApiRestartReceipt(restartReceipt, {
      authoritativeReceipt: deployed.receipt,
      authoritativeCapability: deployed.capability,
      expectedSourceSha: options.sourceSha,
      expectedSourceTree: options.sourceTree,
      expectedArtifactSha256: options.artifactSha256,
      expectedApiEndpointSha256: options.apiEndpointSha256,
    });
  } catch {
    return authoritativeBlock(options, "RFD016_RESTART_RECEIPT_INVALID", {
      ...upstream,
      rfd016: "INVALID",
    });
  }
  if (restartReceipt.verdict !== "PASS") {
    return authoritativeBlock(options, restartReceipt.blocked_code ?? "RFD016_INSTALLED_APP_ADAPTER_REQUIRED", {
      ...upstream,
      rfd016: restartReceipt.verdict,
    });
  }
  const restartCapability = getFormalDeployedApiRestartCapability(restartReceipt);
  return runRfd018ActualCanary({
    restartCapability,
    sourceSha: options.sourceSha,
    sourceTree: options.sourceTree,
    artifactSha256: options.artifactSha256,
  });
}

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === "--help" || flag === "-h") options.help = true;
    else if (["--fixture", "--inject-trigger", "--source-sha", "--source-tree", "--artifact-sha256"].includes(flag)) {
      const value = argv[++index];
      if (!value || value.startsWith("--")) throw new Rf13DistValidationError("INVALID_ARGUMENT", `${flag} requires a value`);
      if (flag === "--fixture") options.fixturePath = path.resolve(value);
      if (flag === "--inject-trigger") options.injectTrigger = value;
      if (flag === "--source-sha") options.sourceSha = value;
      if (flag === "--source-tree") options.sourceTree = value;
      if (flag === "--artifact-sha256") options.artifactSha256 = value;
    } else throw new Rf13DistValidationError("INVALID_ARGUMENT", "unknown canary monitor option");
  }
  return options;
}

function usage() {
  return [
    "Usage: node scripts/run-rfd018-canary-monitor.mjs [--fixture SANITIZED_SYNTHETIC_JSON] [--inject-trigger CODE]",
    "       node scripts/run-rfd018-canary-monitor.mjs [--source-sha SHA] [--source-tree TREE] [--artifact-sha256 HASH]",
    `Trigger codes: ${RF13_DIST_ROLLBACK_TRIGGER_CODES.join(", ")}`,
    "This command performs no network calls or mutations. Template and synthetic receipts are always BLOCKED and exit 3.",
    "Authoritative execution is same-process only; no tracked installed-package canary adapter exists in this worktree.",
  ].join("\n");
}

export function main(argv = process.argv.slice(2)) {
  try {
    const options = parseArgs(argv);
    if (options.help) {
      process.stdout.write(`${usage()}\n`);
      return 0;
    }
    if (options.injectTrigger && !options.fixturePath) {
      throw new Rf13DistValidationError("INVALID_ARGUMENT", "rollback trigger injection requires a sanitized synthetic fixture");
    }
    if (options.fixturePath && (options.sourceSha || options.sourceTree || options.artifactSha256)) {
      throw new Rf13DistValidationError("INVALID_ARGUMENT", "fixture bindings must come from the sanitized fixture itself");
    }
    const receipt = options.fixturePath
      ? runSyntheticCanaryMonitor(parseJsonFile(options.fixturePath, "canary fixture"), { injectTrigger: options.injectTrigger })
      : buildBlockedCanaryTemplate({
        sourceSha: options.sourceSha,
        sourceTree: options.sourceTree,
        macosArtifactSha256: options.artifactSha256,
      });
    process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
    return 3;
  } catch (error) {
    process.stderr.write(`${JSON.stringify({
      monitor: "RFD-TUW-018-canary",
      verdict: "FAIL",
      code: error instanceof Rf13DistValidationError ? error.code : "CANARY_MONITOR_FAILED",
      message: error instanceof Rf13DistValidationError ? error.message : "canary monitor failed",
    })}\n`);
    return 1;
  }
}

const isMain = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isMain) process.exitCode = main();
