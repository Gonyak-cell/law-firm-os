#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { chmodSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  validateJsonPostgresExecutionPacket,
  verifyJsonPostgresExecutionApproval,
} from "../packages/persistence/src/postgres/execution-contract.js";
import {
  JSON_POSTGRES_PRODUCTION_AUDIT_PROFILE,
  JSON_POSTGRES_PRODUCTION_CUTOVER_PROFILE,
  JSON_POSTGRES_PRODUCTION_REGION,
  assertJsonPostgresProductionCaller,
} from "./lib/json-postgres-production-execution.mjs";
import {
  createJsonPostgresCut011Probe,
} from "./lib/json-postgres-json-retirement.mjs";
import {
  createPrivateProgramOutputDirectory,
  readPrivateProgramJson,
  writePrivateProgramJson,
} from "./lib/json-postgres-program-files.mjs";

const OPERATIONS = new Set(["invoke", "probe"]);

function parse(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (!flag?.startsWith("--") || !value || value.startsWith("--") || values[flag.slice(2)] != null) {
      throw new TypeError(`invalid option: ${flag ?? ""}`);
    }
    values[flag.slice(2)] = value;
  }
  return values;
}

function required(value, name) {
  if (!value) throw new TypeError(`--${name} is required`);
  return value;
}

function git(...args) {
  return execFileSync("git", args, { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }).trim();
}

function awsJson(profile, args) {
  const output = execFileSync("aws", [
    ...args,
    "--profile", profile,
    "--region", JSON_POSTGRES_PRODUCTION_REGION,
    "--no-cli-pager",
    "--output", "json",
  ], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
  return output ? JSON.parse(output) : {};
}

function caller(profile) {
  return assertJsonPostgresProductionCaller(
    awsJson(profile, ["sts", "get-caller-identity"]),
    { role: profile },
  );
}

function invoke(profile, functionName, eventPath, responsePath) {
  const result = awsJson(profile, [
    "lambda", "invoke",
    "--function-name", functionName,
    "--invocation-type", "RequestResponse",
    "--cli-binary-format", "raw-in-base64-out",
    "--payload", `fileb://${eventPath}`,
    responsePath,
  ]);
  chmodSync(responsePath, 0o600);
  if (result.FunctionError) throw new Error(`${functionName} invocation failed`);
  return JSON.parse(readFileSync(responsePath, "utf8"));
}

const options = parse(process.argv.slice(2));
const operation = required(options.operation, "operation");
if (!OPERATIONS.has(operation)) throw new Error("unsupported JSON retirement operation");
if (git("status", "--porcelain=v1", "--untracked-files=all")) {
  throw new Error("JSON retirement requires a clean exact-main worktree");
}
const sourceSha = git("rev-parse", "HEAD");
const sourceTree = git("rev-parse", "HEAD^{tree}");
if (git("rev-parse", "origin/main") !== sourceSha) throw new Error("JSON retirement requires exact origin/main");
const packetSource = readPrivateProgramJson(required(options.packet, "packet"), "W13 execution packet");
const validated = validateJsonPostgresExecutionPacket(packetSource, {
  sourceSha,
  sourceTree,
  phase: "w13-production-cutover",
});
const packet = Object.freeze({ ...packetSource, packet_sha256: validated.packet_sha256 });
const approval = verifyJsonPostgresExecutionApproval({
  packet: packetSource,
  sourceSha,
  sourceTree,
  trustRegistryPath: required(options.registry, "registry"),
  trustRegistrySha256: required(options["registry-sha256"], "registry-sha256"),
  approvalReceiptPath: required(options.approval, "approval"),
});
const outputDir = createPrivateProgramOutputDirectory(required(options["output-dir"], "output-dir"));
let result;

if (operation === "invoke") {
  const operator = caller(JSON_POSTGRES_PRODUCTION_CUTOVER_PROFILE);
  const startupKind = required(options["startup-kind"], "startup-kind");
  if (!["warm", "cold"].includes(startupKind)) throw new Error("startup-kind must be warm or cold");
  const runtimeGeneration = Number(required(options["runtime-generation"], "runtime-generation"));
  if (!Number.isSafeInteger(runtimeGeneration) || runtimeGeneration < 1) {
    throw new Error("runtime-generation is invalid");
  }
  const event = {
    ...readPrivateProgramJson(required(options.event, "event"), "CUT-011 base event"),
    action: "lawos-json-postgres-json-retirement-smoke",
    phase: "w13-production-cutover",
    stage: "cut-011",
    mode: "commit",
    startup_kind: startupKind,
    runtime_generation: runtimeGeneration,
    attempt_ref: `${required(options["attempt-ref"], "attempt-ref")}-${startupKind}`,
    source_sha: sourceSha,
    source_tree: sourceTree,
    artifact_sha256: packet.bindings.artifact_sha256,
    packet_sha256: packet.packet_sha256,
  };
  const eventFile = writePrivateProgramJson(join(outputDir, `${startupKind}-event.json`), event);
  const response = invoke(
    JSON_POSTGRES_PRODUCTION_CUTOVER_PROFILE,
    "lawos-production-admin",
    eventFile.path,
    join(outputDir, `${startupKind}-response.json`),
  );
  if (response.outcome !== "PASS"
    || response.startup_kind !== startupKind
    || response.runtime_generation !== runtimeGeneration
    || response.source_sha !== sourceSha
    || response.source_tree !== sourceTree
    || response.packet_sha256 !== packet.packet_sha256) {
    throw new Error(`CUT-011 ${startupKind} smoke failed`);
  }
  result = {
    operation,
    startup_kind: startupKind,
    outcome: "PASS",
    operator,
    runtime_generation: runtimeGeneration,
    runtime_log_stream_sha256: response.runtime_log_stream_sha256,
    smoke_result_sha256: response.result_sha256,
    execution_evidence_sha256: response.execution_evidence_sha256,
    production_write_count: startupKind === "warm" && response.safe_counts.idempotent_replay_count === 0 ? 1 : 0,
  };
} else {
  const auditor = caller(JSON_POSTGRES_PRODUCTION_AUDIT_PROFILE);
  const operator = caller(JSON_POSTGRES_PRODUCTION_CUTOVER_PROFILE);
  const warm = readPrivateProgramJson(required(options.warm, "warm"), "CUT-011 warm result");
  const cold = readPrivateProgramJson(required(options.cold, "cold"), "CUT-011 cold result");
  const lambdaConfigurations = ["lawos-production-api", "lawos-production-admin"].map((name) =>
    awsJson(JSON_POSTGRES_PRODUCTION_AUDIT_PROFILE, [
      "lambda", "get-function-configuration", "--function-name", name,
    ]));
  const workerEvent = writePrivateProgramJson(join(outputDir, "background-worker-event.json"), {
    action: "lawos_password_reset_worker",
  });
  const backgroundWorker = invoke(
    JSON_POSTGRES_PRODUCTION_CUTOVER_PROFILE,
    "lawos-production-api",
    workerEvent.path,
    join(outputDir, "background-worker-response.json"),
  );
  const immutableBackup = readPrivateProgramJson(
    required(options["immutable-backup"], "immutable-backup"),
    "immutable source backup result",
  );
  const probe = createJsonPostgresCut011Probe({
    packet,
    warm,
    cold,
    lambdaConfigurations,
    backgroundWorker,
    immutableBackup,
    monthlyCostForecastKrw: Number(required(options["monthly-cost-forecast-krw"], "monthly-cost-forecast-krw")),
    startedAt: required(options["started-at"], "started-at"),
    finishedAt: new Date().toISOString(),
    probeId: `cut011-${required(options["attempt-ref"], "attempt-ref")}`,
  });
  const probeFile = writePrivateProgramJson(join(outputDir, "cut-011-probe.json"), probe);
  result = {
    operation,
    outcome: "PASS",
    auditor,
    operator,
    probe_sha256: probeFile.sha256,
    runtime_generation: probe.safe_counts.runtime_generation,
    operational_json_path_count: 0,
    legacy_authority_counter_total: 0,
    background_job_failure_count: 0,
  };
}

const output = writePrivateProgramJson(join(outputDir, `${operation}-result.json`), {
  schema_version: "law-firm-os.json-postgres-json-retirement-operation.v1",
  source_sha: sourceSha,
  source_tree: sourceTree,
  packet_sha256: packet.packet_sha256,
  approval_receipt_sha256: approval.receipt_sha256,
  generated_at: new Date().toISOString(),
  ...result,
  raw_value_returned: false,
  pii_returned: false,
  secret_material_returned: false,
});
process.stdout.write(`${JSON.stringify({
  verdict: "PASS",
  operation,
  source_sha: sourceSha,
  source_tree: sourceTree,
  packet_sha256: packet.packet_sha256,
  result_path: output.path,
  result_sha256: output.sha256,
}, null, 2)}\n`);
