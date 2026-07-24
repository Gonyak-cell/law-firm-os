#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import {
  validateJsonPostgresExecutionPacket,
  verifyJsonPostgresExecutionApproval,
} from "../packages/persistence/src/postgres/execution-contract.js";
import {
  assertJsonPostgresRehearsalProgramCaller,
} from "./lib/json-postgres-rehearsal-program.mjs";
import {
  JSON_POSTGRES_REHEARSAL_ACCOUNT,
  JSON_POSTGRES_REHEARSAL_FUNCTION,
  JSON_POSTGRES_REHEARSAL_PROFILE,
  JSON_POSTGRES_REHEARSAL_REGION,
  JSON_POSTGRES_REHEARSAL_ROLE,
} from "./lib/json-postgres-rehearsal-execution.mjs";
import {
  createJsonPostgresRehearsalSinkResult,
} from "./lib/json-postgres-rehearsal-sink.mjs";
import {
  createPrivateProgramOutputDirectory,
  readPrivateProgramJson,
  writePrivateProgramJson,
} from "./lib/json-postgres-program-files.mjs";

function option(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new TypeError(`${name} is required`);
  }
  return value;
}

function required(name) {
  const value = option(name);
  if (!value) throw new TypeError(`${name} is required`);
  return value;
}

function git(...args) {
  return execFileSync("git", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  }).trim();
}

function awsJson(args, { region = true } = {}) {
  const output = execFileSync("aws", [
    ...args,
    "--profile", JSON_POSTGRES_REHEARSAL_PROFILE,
    ...(region ? ["--region", JSON_POSTGRES_REHEARSAL_REGION] : []),
    "--no-cli-pager",
    "--output", "json",
  ], {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
  return output ? JSON.parse(output) : {};
}

if (git("status", "--porcelain=v1", "--untracked-files=all")) {
  throw new Error("W12 sink inspection requires a clean exact-head worktree");
}
const sourceSha = git("rev-parse", "HEAD");
const sourceTree = git("rev-parse", "HEAD^{tree}");
const packetSource = readPrivateProgramJson(
  required("--packet"),
  "W12 execution packet",
);
const validated = validateJsonPostgresExecutionPacket(packetSource, {
  sourceSha,
  sourceTree,
});
const packet = Object.freeze({
  ...packetSource,
  packet_sha256: validated.packet_sha256,
});
verifyJsonPostgresExecutionApproval({
  packet: packetSource,
  sourceSha,
  sourceTree,
  trustRegistryPath: required("--registry"),
  trustRegistrySha256: required("--registry-sha256"),
  approvalReceiptPath: required("--approval"),
});
assertJsonPostgresRehearsalProgramCaller(
  awsJson(["sts", "get-caller-identity"]),
  {
    profile: JSON_POSTGRES_REHEARSAL_PROFILE,
    mode: "preflight",
  },
);
const lambdaConfiguration = awsJson([
  "lambda",
  "get-function-configuration",
  "--function-name",
  JSON_POSTGRES_REHEARSAL_FUNCTION,
]);
const policyNames = awsJson([
  "iam",
  "list-role-policies",
  "--role-name",
  JSON_POSTGRES_REHEARSAL_ROLE,
], { region: false }).PolicyNames ?? [];
const rolePolicySet = policyNames.sort().map((policyName) =>
  awsJson([
    "iam",
    "get-role-policy",
    "--role-name",
    JSON_POSTGRES_REHEARSAL_ROLE,
    "--policy-name",
    policyName,
  ], { region: false }).PolicyDocument);
const simulation = awsJson([
  "iam",
  "simulate-principal-policy",
  "--policy-source-arn",
  `arn:aws:iam::${JSON_POSTGRES_REHEARSAL_ACCOUNT}:role/${JSON_POSTGRES_REHEARSAL_ROLE}`,
  "--action-names",
  "ses:SendEmail",
  "ses:SendRawEmail",
  "--resource-arns",
  "*",
], { region: false });
const result = createJsonPostgresRehearsalSinkResult({
  packet,
  lambdaConfiguration,
  rolePolicySet,
  simulationResults: simulation.EvaluationResults,
});
const outputDir = createPrivateProgramOutputDirectory(
  required("--output-dir"),
);
const output = writePrivateProgramJson(
  join(outputDir, "w12-sink-result.json"),
  result,
);
process.stdout.write(`${JSON.stringify({
  verdict: "PASS",
  source_sha: sourceSha,
  source_tree: sourceTree,
  packet_sha256: packet.packet_sha256,
  external_email_send_count: 0,
  real_recipient_count: 0,
  result_path: output.path,
  result_file_sha256: output.sha256,
  result_sha256: result.result_sha256,
}, null, 2)}\n`);
