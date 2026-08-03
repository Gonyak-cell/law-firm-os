#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  RF13_EVIDENCE_ROOT,
  buildRf13ProgressTemplate,
} from "./lib/matter-rf13-debt-remediation-contract.mjs";
import {
  Rf13ProgressValidationError,
  hashRf13Bytes,
  validateMatterRf13Progress,
} from "./lib/matter-rf13-debt-remediation-validator.mjs";
import {
  isMatterRf13GoalOperationalBlocked,
  prepareMatterRf13GoalOperationalAuthority,
} from "./lib/matter-rf13-goal-operational-authority.mjs";

export {
  RFD_GATE_RANGES,
  RFD_STATUSES,
  RFD_TUW_CONTRACTS,
  RFD_TUW_IDS,
  RF13_EVIDENCE_ROOT,
  RF13_EVIDENCE_SCHEMA,
  RF13_GOAL_ID,
  RF13_PLAN_PATH,
  RF13_PROGRESS_SCHEMA,
  RF13_RFD010_RECEIPT_PATH,
  buildRf13ProgressTemplate,
  deriveRf13Gates,
  expectedEvidenceKind,
} from "./lib/matter-rf13-debt-remediation-contract.mjs";
export {
  Rf13ProgressValidationError,
  hashRf13Bytes,
  validateMatterRf13Progress,
  validateRf13EvidenceReference,
} from "./lib/matter-rf13-debt-remediation-validator.mjs";
export {
  RF13_COMPLETION_ACTION,
  RF13_COMPLETION_ATTESTOR_ROLE,
  RF13_COMPLETION_ENVIRONMENT,
  RF13_COMPLETION_PACKET_SCHEMA,
  buildRf13CompletionPacket,
  hashRf13CompletionPacket,
  validateRf13CompletionAttestation,
} from "./lib/matter-rf13-debt-remediation-attestation.mjs";

const REPO_ROOT = fileURLToPath(new URL("../", import.meta.url));
const PLAN_PATH = resolve(REPO_ROOT, "workbook/matter-rf13-maintenance-debt-remediation-plan-2026-07-31.md");
const DEFAULT_SIGNING_TIMEOUT_MS = 15 * 60 * 1_000;
const MIN_SIGNING_TIMEOUT_MS = 1_000;
const MAX_SIGNING_TIMEOUT_MS = 30 * 60 * 1_000;

function cliFail(code, message) {
  throw new Rf13ProgressValidationError(code, message);
}

function takeValue(argv, index, inlineValue, message) {
  const value = inlineValue ?? argv[index + 1];
  if (!value || value.startsWith("--")) cliFail("INVALID_ARGUMENT", message);
  return { value, consumed: inlineValue === undefined ? 1 : 0 };
}

function parseArgs(argv) {
  const options = {
    template: false,
    manifest: undefined,
    output: undefined,
    operationalInputs: undefined,
    signingTimeoutMs: undefined,
    structureOnly: false,
    help: false,
  };
  const attestorFlags = new Map([
    ["--attestor-registry", "attestorRegistry"],
    ["--attestor-registry-sha256", "attestorRegistrySha256"],
    ["--attestor-receipt", "attestorReceipt"],
    ["--attestor-signature", "attestorSignature"],
  ]);
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--help" || argument === "-h") {
      options.help = true;
      continue;
    }
    const equals = argument.indexOf("=");
    const flag = equals < 0 ? argument : argument.slice(0, equals);
    const inlineValue = equals < 0 ? undefined : argument.slice(equals + 1);
    if (flag === "--template") {
      if (inlineValue !== undefined) cliFail("INVALID_ARGUMENT", "--template does not take a value");
      options.template = true;
      continue;
    }
    if (flag === "--structure-only") {
      if (inlineValue !== undefined) cliFail("INVALID_ARGUMENT", "--structure-only does not take a value");
      options.structureOnly = true;
      continue;
    }
    if (flag === "--manifest") {
      const result = takeValue(argv, index, inlineValue, "--manifest requires an explicit path");
      options.manifest = resolve(result.value);
      index += result.consumed;
      continue;
    }
    if (flag === "--output") {
      const result = takeValue(argv, index, inlineValue, "--output requires an explicit path");
      options.output = resolve(result.value);
      index += result.consumed;
      continue;
    }
    if (flag === "--operational-inputs") {
      const result = takeValue(argv, index, inlineValue, "--operational-inputs requires an explicit absolute path");
      if (!result.value.startsWith("/")) cliFail("INVALID_ARGUMENT", "--operational-inputs must be absolute");
      options.operationalInputs = resolve(result.value);
      index += result.consumed;
      continue;
    }
    if (flag === "--signing-timeout-ms") {
      const result = takeValue(argv, index, inlineValue, "--signing-timeout-ms requires an explicit integer");
      if (!/^[1-9][0-9]*$/u.test(result.value)) {
        cliFail("INVALID_ARGUMENT", "--signing-timeout-ms must be a canonical positive integer");
      }
      options.signingTimeoutMs = Number(result.value);
      if (!Number.isSafeInteger(options.signingTimeoutMs)
        || options.signingTimeoutMs < MIN_SIGNING_TIMEOUT_MS
        || options.signingTimeoutMs > MAX_SIGNING_TIMEOUT_MS) {
        cliFail("INVALID_ARGUMENT", "--signing-timeout-ms must be between 1000 and 1800000");
      }
      index += result.consumed;
      continue;
    }
    if (attestorFlags.has(flag)) {
      const result = takeValue(argv, index, inlineValue, `${flag} requires an explicit value`);
      options[attestorFlags.get(flag)] = flag.endsWith("sha256") ? result.value : resolve(result.value);
      index += result.consumed;
      continue;
    }
    cliFail("INVALID_ARGUMENT", "unknown or positional arguments are not permitted");
  }
  if (!options.help && options.template === Boolean(options.manifest)) {
    cliFail("INVALID_ARGUMENT", "choose exactly one of --template or --manifest");
  }
  if (options.template && options.structureOnly) {
    cliFail("INVALID_ARGUMENT", "--template is already structural and cannot be combined with --structure-only");
  }
  if (options.output && options.manifest && options.output === options.manifest) {
    cliFail("INVALID_ARGUMENT", "validation output cannot overwrite its input manifest");
  }
  const attestorValues = [...attestorFlags.values()].map((key) => options[key]);
  if (attestorValues.some(Boolean) && !attestorValues.every(Boolean)) {
    cliFail("INVALID_ARGUMENT", "all four attestor inputs are required together");
  }
  if (attestorValues.some(Boolean) && (options.template || options.structureOnly)) {
    cliFail("INVALID_ARGUMENT", "completion attestation applies only to full manifest validation");
  }
  if (options.operationalInputs && (options.template || options.structureOnly)) {
    cliFail("INVALID_ARGUMENT", "operational inputs apply only to full manifest validation");
  }
  if (options.operationalInputs && attestorValues.some(Boolean)) {
    cliFail("INVALID_ARGUMENT", "operational mode accepts completion authority only through the closed operational input");
  }
  if (options.signingTimeoutMs !== undefined && !options.operationalInputs) {
    cliFail("INVALID_ARGUMENT", "--signing-timeout-ms is available only with --operational-inputs");
  }
  if (options.operationalInputs && options.signingTimeoutMs === undefined) {
    options.signingTimeoutMs = DEFAULT_SIGNING_TIMEOUT_MS;
  }
  return options;
}

function usage() {
  return [
    "Usage: node scripts/validate-matter-rf13-debt-remediation-goal.mjs --template [--output PATH]",
    "       node scripts/validate-matter-rf13-debt-remediation-goal.mjs --manifest PATH [--structure-only] [--output PATH]",
    "       scripts/run-matter-rf13-debt-remediation-goal.sh --manifest PATH --operational-inputs ABSOLUTE_OWNER_ONLY_JSON [--signing-timeout-ms 1000..1800000] [--output PATH]",
    "       Full completion additionally requires --attestor-registry, --attestor-registry-sha256, --attestor-receipt, and --attestor-signature.",
    "Without --output the validator writes only JSON to stdout. Output inside the repository is limited to ignored RF13 evidence.",
  ].join("\n");
}

function assertOutputLocation(outputPath) {
  if (!outputPath) return;
  const inside = relative(REPO_ROOT, outputPath);
  if (!inside.startsWith("..") && inside !== "") {
    const allowedRoot = resolve(REPO_ROOT, RF13_EVIDENCE_ROOT);
    const relativeToAllowed = relative(allowedRoot, outputPath);
    if (relativeToAllowed.startsWith("..") || relativeToAllowed === "") {
      cliFail("UNSAFE_OUTPUT_PATH", "repository output is limited to a file inside the ignored RF13 evidence directory");
    }
  }
}

async function currentSourceState() {
  const { readMatterPerformanceSourceState } = await import("./run-matter-small-firm-performance.mjs");
  try {
    const source = readMatterPerformanceSourceState({ cwd: REPO_ROOT });
    const readGit = (args, encoding) => execFileSync("git", args, {
      cwd: REPO_ROOT,
      encoding,
      maxBuffer: 256 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const headBefore = readGit(["rev-parse", "HEAD"], "utf8").trim();
    const sourceTree = readGit(["rev-parse", `${source.source_sha}^{tree}`], "utf8").trim();
    const sourceManifest = readGit(["ls-tree", "-r", "-z", "--full-tree", source.source_sha]);
    const headAfter = readGit(["rev-parse", "HEAD"], "utf8").trim();
    if (headBefore !== source.source_sha || headAfter !== source.source_sha) {
      cliFail("SOURCE_SNAPSHOT_DRIFT", "source changed while its sealed manifest was captured");
    }
    return {
      ...source,
      source_tree: sourceTree,
      source_manifest_sha256: hashRf13Bytes(sourceManifest),
    };
  } catch (error) {
    if (error instanceof Rf13ProgressValidationError) throw error;
    cliFail("SOURCE_STATE_READ_FAILED", "the current Git source seal could not be read");
  }
}

async function readPlanSha256() {
  try {
    return hashRf13Bytes(await readFile(PLAN_PATH));
  } catch {
    cliFail("PLAN_READ_FAILED", "the canonical RF13 remediation workbook could not be read");
  }
}

async function readManifest(path) {
  let raw;
  try {
    raw = await readFile(path, "utf8");
  } catch {
    cliFail("MANIFEST_READ_FAILED", "the explicitly requested progress manifest could not be read");
  }
  try {
    return JSON.parse(raw);
  } catch {
    cliFail("MANIFEST_JSON_INVALID", "the progress manifest is not valid JSON");
  }
}

async function readCompletionAttestation(options) {
  if (!options.attestorRegistry) return undefined;
  try {
    const [registryBytes, receiptBytes, signatureBytes] = await Promise.all([
      readFile(options.attestorRegistry),
      readFile(options.attestorReceipt),
      readFile(options.attestorSignature),
    ]);
    return {
      registryBytes,
      receiptBytes,
      signatureBytes,
      expectedRegistrySha256: options.attestorRegistrySha256,
    };
  } catch {
    cliFail("ATTESTATION_READ_FAILED", "the explicit private completion attestation inputs could not be read");
  }
}

async function emit(value, outputPath) {
  const serialized = `${JSON.stringify(value, null, 2)}\n`;
  if (outputPath) {
    assertOutputLocation(outputPath);
    try {
      await writeFile(outputPath, serialized, { encoding: "utf8", flag: "wx" });
    } catch {
      cliFail("OUTPUT_WRITE_FAILED", "explicit output could not be created without overwriting an existing file");
    }
  }
  process.stdout.write(serialized);
}

export async function runCli(argv = process.argv.slice(2), context = {}) {
  if (!context || typeof context !== "object" || Array.isArray(context)
    || Object.keys(context).some((key) => key !== "launcherCapability")) {
    cliFail("INVALID_CALLER_CONTEXT", "only the canonical launcher capability may enter the CLI context");
  }
  const options = parseArgs(argv);
  if (options.help) {
    process.stdout.write(`${usage()}\n`);
    return 0;
  }
  const planSha256 = await readPlanSha256();
  if (options.template) {
    const template = buildRf13ProgressTemplate({
      planSha256,
      source: await currentSourceState(),
    });
    await validateMatterRf13Progress(template, {
      repoRoot: REPO_ROOT,
      expectedPlanSha256: planSha256,
      structureOnly: true,
    });
    await emit(template, options.output);
    return 0;
  }

  const manifest = await readManifest(options.manifest);
  let operationalSession;
  if (options.operationalInputs) {
    operationalSession = await prepareMatterRf13GoalOperationalAuthority({
      manifest,
      operationalInputsPath: options.operationalInputs,
      launcherCapability: context.launcherCapability,
      signingTimeoutMs: options.signingTimeoutMs,
    });
  }
  try {
    const source = options.structureOnly ? undefined : await currentSourceState();
    const result = await validateMatterRf13Progress(manifest, {
      repoRoot: REPO_ROOT,
      expectedPlanSha256: planSha256,
      currentSource: source,
      readCurrentSource: options.structureOnly ? undefined : currentSourceState,
      completionAttestation: operationalSession?.completionAttestation
        ?? await readCompletionAttestation(options),
      operationalAuthorities: operationalSession?.takeAuthorities(),
      structureOnly: options.structureOnly,
    });
    await emit(result, options.output);
    return result.verdict === "PASS" || result.verdict === "PASS_STRUCTURE" ? 0 : 1;
  } finally {
    operationalSession?.dispose();
  }
}

export async function main(argv = process.argv.slice(2), context = {}) {
  try {
    return await runCli(argv, context);
  } catch (error) {
    const blocked = isMatterRf13GoalOperationalBlocked(error);
    process.stderr.write(`${JSON.stringify({
      validator: "matter-rf13-debt-remediation-goal",
      verdict: blocked ? "BLOCKED_BY_AUTHORITY" : "FAIL",
      code: typeof error?.code === "string" && /^[A-Z0-9_]+$/u.test(error.code)
        ? error.code
        : "VALIDATION_FAILED",
      message: error instanceof Rf13ProgressValidationError
        ? error.message
        : blocked
          ? "RF13 operational authority or native artifact is unavailable"
          : "RF13 progress validation failed",
    })}\n`);
    return blocked ? 2 : 1;
  }
}

const isMain = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (isMain) process.exitCode = await main();
