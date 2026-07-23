#!/usr/bin/env node
import { createHash } from "node:crypto";
import { chmodSync, existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { buildPrivateStagingExecutionReceipt } from "./lib/private-staging-aws-execution.mjs";
import { PRIVATE_STAGING_EXACT_HEAD_ACTION, privateStagingPacketSha256, validatePrivateStagingExactHeadPacket } from "./lib/private-staging-exact-head-authority.mjs";
import { validateRuntimeSafetyApprovalBundle } from "./lib/runtime-safety-approval-contract.mjs";

function option(name, fallback = null) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) throw new TypeError(`${name} is required`);
  return value;
}

function requiredOption(name) {
  const value = option(name);
  if (!value) throw new TypeError(`${name} is required`);
  return value;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function privateFile(candidate, name) {
  const input = resolve(candidate);
  if (!existsSync(input) || lstatSync(input).isSymbolicLink()) throw new Error(`${name} must be an existing non-symlink file`);
  const path = realpathSync(input);
  if (!statSync(path).isFile() || (statSync(path).mode & 0o077) !== 0) throw new Error(`${name} must be mode 0600`);
  return path;
}

function outputDirectory(candidate) {
  const root = realpathSync(process.cwd());
  const input = resolve(candidate);
  let parent = input;
  while (!existsSync(parent)) parent = dirname(parent);
  const path = resolve(realpathSync(parent), relative(parent, input));
  const rel = relative(root, path);
  if (!(rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel))) throw new Error("receipt output must remain outside the worktree");
  if (existsSync(path) && lstatSync(path).isSymbolicLink()) throw new Error("receipt output cannot be a symlink");
  mkdirSync(path, { recursive: true, mode: 0o700 });
  chmodSync(path, 0o700);
  return path;
}

const packetPath = privateFile(requiredOption("--packet"), "exact-head packet");
const rawPacket = JSON.parse(readFileSync(packetPath, "utf8"));
const validatedPacket = validatePrivateStagingExactHeadPacket(rawPacket);
const packet = Object.freeze({ ...rawPacket, packet_sha256: validatedPacket.packet_sha256 });
const localGatesPath = privateFile(requiredOption("--local-gates"), "local gates summary");
const localGatesBytes = readFileSync(localGatesPath);
const localGates = JSON.parse(localGatesBytes);
if (localGates.schema_version !== "law-firm-os.private-staging.local-gates.v2" || localGates.execution_state !== "PASS" || localGates.source_sha !== packet.source_sha || localGates.source_tree !== packet.source_tree || localGates.artifact_sha256 !== packet.artifact_sha256 || localGates.packet_sha256 !== packet.packet_sha256 || localGates.fail_count !== 0 || localGates.artifact_verified !== true || localGates.artifact_reproduced !== false) throw new Error("local gate summary is not an exact-head PASS");
if (localGates.isolation?.disposable_exact_head_clone !== true || localGates.isolation?.operator_home_readable !== false || localGates.isolation?.operator_home_writable !== false || localGates.isolation?.external_network_egress !== "denied" || localGates.external_effect_observation?.aws_mutation !== "not_observed" || localGates.external_effect_observation?.real_data_contact !== "not_observed" || localGates.external_effect_observation?.external_network_contact !== "denied_by_kernel_sandbox") throw new Error("local gate isolation or external-effect observation is incomplete");

const registryPath = privateFile(requiredOption("--registry"), "owner trust registry");
const registrySha256 = requiredOption("--registry-sha256");
if (sha256(readFileSync(registryPath)) !== registrySha256) throw new Error("owner trust registry digest mismatch");
const approvalReceiptPath = privateFile(requiredOption("--approval-receipt"), "exact-head approval receipt");
const approvalSignaturePath = privateFile(option("--approval-signature", `${approvalReceiptPath}.sig`), "exact-head approval signature");
const approvalReceipt = JSON.parse(readFileSync(approvalReceiptPath, "utf8"));
const approval = validateRuntimeSafetyApprovalBundle({
  registryPath,
  expectedRegistrySha256: registrySha256,
  receiptPath: approvalReceiptPath,
  signaturePath: approvalSignaturePath,
  expectedRole: "owner",
  expectedAction: PRIVATE_STAGING_EXACT_HEAD_ACTION,
  expectedEnvironment: "staging",
  expectedPacketSha256: packet.packet_sha256,
  expectedSourceSha: packet.source_sha,
  expectedSourceTree: packet.source_tree,
  allowedDataScope: ["synthetic-only"],
  allowedContactScope: ["synthetic-mailbox-only"],
});
if (approval.decision !== "approved") throw new Error("exact-head approval is not approved");

const byId = new Map(localGates.results.map((result) => [result.id, result]));
const critical = byId.get("json-postgres-private-staging-critical");
const artifact = byId.get("artifact-verification");
if (!critical || !artifact) throw new Error("local gate summary is missing critical or artifact verification evidence");
const summarySha256 = sha256(localGatesBytes);
const commonSafeCounts = {
  command_count: Number(localGates.command_count),
  pass_count: Number(localGates.pass_count),
  fail_count: 0,
  isolated_worker_count: 1,
  external_egress_allowed_count: 0,
};
const specs = [
  {
    kind: "source-baseline",
    result: byId.get("private-staging-infrastructure-contract"),
    safeCounts: { clean_worktree_count: 1, exact_source_binding_count: 1, base_main_binding_count: 1, isolated_worker_count: 1 },
    claims: { source_baseline_verified: true },
  },
  {
    kind: "pr-172-adjudication",
    result: critical,
    safeCounts: { pr_head_tree_match_count: 1, pr_head_ancestor_count: 1, isolated_worker_count: 1 },
    claims: { pr_172_reuse_adjudicated: true },
  },
  {
    kind: "source-field-contract",
    result: critical,
    safeCounts: { ...commonSafeCounts, source_inventory_contract_count: 1 },
    claims: { source_field_contract_verified: true },
  },
  {
    kind: "internal-password-authority",
    result: byId.get("private-staging-internal-auth-contract"),
    safeCounts: { pass_count: Number(byId.get("private-staging-internal-auth-contract")?.pass_count ?? 0), external_identity_prerequisite_count: 0, isolated_worker_count: 1 },
    claims: { internal_password_authority_verified: true, entra_required: false },
  },
  {
    kind: "migration-engine",
    result: critical,
    safeCounts: { ...commonSafeCounts, json_postgres_migration_engine_count: 1 },
    claims: { migration_engine_verified: true },
  },
  {
    kind: "local-postgres-validation",
    result: critical,
    safeCounts: { pass_count: Number(critical.pass_count), fail_count: 0, skipped_count: Number(critical.skipped_count), isolated_worker_count: 1 },
    claims: { disposable_postgres_verified: true, cut_007_api_flow_verified: true },
  },
  {
    kind: "artifact-verification",
    result: artifact,
    safeCounts: { artifact_verification_count: 1, artifact_digest_difference_count: 0, artifact_runtime_store_entry_count: 0, artifact_real_json_store_count: 0, isolated_worker_count: 1 },
    claims: { artifact_verified: true, artifact_reproduced: false },
  },
];
const outputDir = outputDirectory(requiredOption("--output-dir"));
const paths = [];
for (const spec of specs) {
  if (!spec.result || spec.result.exit_code !== 0) throw new Error(`local receipt evidence is missing or failed: ${spec.kind}`);
  const receipt = buildPrivateStagingExecutionReceipt({
    kind: spec.kind,
    keyId: approvalReceipt.key_id,
    approvalId: approval.approval_id,
    packet,
    startedAt: spec.result.started_at,
    finishedAt: spec.result.finished_at,
    command: spec.result.command,
    profile: "source-local-node22-sandboxed",
    safeCounts: spec.safeCounts,
    digests: { local_gates_sha256: summarySha256, command_stdout_sha256: spec.result.stdout_sha256, command_stderr_sha256: spec.result.stderr_sha256 },
    claims: spec.claims,
  });
  const path = resolve(outputDir, `${receipt.receipt_id}.json`);
  writeFileSync(path, `${JSON.stringify(receipt, null, 2)}\n`, { flag: "wx", mode: 0o600 });
  chmodSync(path, 0o600);
  paths.push(path);
}
process.stdout.write(`${JSON.stringify({ verdict: "PASS", unsigned_receipt_count: paths.length, output_directory: outputDir, receipt_file_fingerprints: paths.map((path) => sha256(basename(path))) }, null, 2)}\n`);
