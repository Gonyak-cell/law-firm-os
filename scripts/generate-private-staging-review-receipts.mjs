#!/usr/bin/env node
import { createHash } from "node:crypto";
import { chmodSync, existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { buildPrivateStagingExecutionReceipt } from "./lib/private-staging-aws-execution.mjs";
import { PRIVATE_STAGING_EXACT_HEAD_ACTION, validatePrivateStagingExactHeadPacket } from "./lib/private-staging-exact-head-authority.mjs";
import { validateRuntimeSafetyApprovalBundle } from "./lib/runtime-safety-approval-contract.mjs";
import { PRIVATE_STAGING_TRUSTED_SECURITY_CHECK } from "./lib/private-staging-github-authority.mjs";

function option(name, fallback = null) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) throw new TypeError(`${name} is required`);
  return value;
}
function requiredOption(name) { const value = option(name); if (!value) throw new TypeError(`${name} is required`); return value; }
function sha256(value) { return createHash("sha256").update(value).digest("hex"); }
function privateFile(candidate, name) {
  const input = resolve(candidate);
  if (!existsSync(input) || lstatSync(input).isSymbolicLink()) throw new Error(`${name} must be an existing non-symlink file`);
  const path = realpathSync(input);
  if (!statSync(path).isFile() || (statSync(path).mode & 0o077) !== 0) throw new Error(`${name} must be mode 0600`);
  return path;
}
function outputDirectory(candidate) {
  const root = realpathSync(process.cwd()); const input = resolve(candidate); let parent = input;
  while (!existsSync(parent)) parent = dirname(parent);
  const path = resolve(realpathSync(parent), relative(parent, input)); const rel = relative(root, path);
  if (!(rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel))) throw new Error("receipt output must remain outside the worktree");
  if (existsSync(path) && lstatSync(path).isSymbolicLink()) throw new Error("receipt output cannot be a symlink");
  mkdirSync(path, { recursive: true, mode: 0o700 }); chmodSync(path, 0o700); return path;
}
const rawPacket = JSON.parse(readFileSync(privateFile(requiredOption("--packet"), "exact-head packet"), "utf8"));
const packetResult = validatePrivateStagingExactHeadPacket(rawPacket);
const packet = Object.freeze({ ...rawPacket, packet_sha256: packetResult.packet_sha256 });
const registryPath = privateFile(requiredOption("--registry"), "owner trust registry");
const registrySha256 = requiredOption("--registry-sha256");
if (sha256(readFileSync(registryPath)) !== registrySha256) throw new Error("owner registry digest mismatch");
const approvalReceiptPath = privateFile(requiredOption("--approval-receipt"), "exact-head approval receipt");
const approvalSignaturePath = privateFile(option("--approval-signature", `${approvalReceiptPath}.sig`), "exact-head approval signature");
const approvalReceipt = JSON.parse(readFileSync(approvalReceiptPath, "utf8"));
const approval = validateRuntimeSafetyApprovalBundle({ registryPath, expectedRegistrySha256: registrySha256, receiptPath: approvalReceiptPath, signaturePath: approvalSignaturePath, expectedRole: "owner", expectedAction: PRIVATE_STAGING_EXACT_HEAD_ACTION, expectedEnvironment: "staging", expectedPacketSha256: packet.packet_sha256, expectedSourceSha: packet.source_sha, expectedSourceTree: packet.source_tree, allowedDataScope: ["synthetic-only"], allowedContactScope: ["synthetic-mailbox-only"] });
if (approval.decision !== "approved") throw new Error("exact-head approval is not approved");
const ciPath = privateFile(requiredOption("--ci-evidence"), "CI evidence");
const securityPath = privateFile(requiredOption("--security-evidence"), "security evidence");
const ci = JSON.parse(readFileSync(ciPath, "utf8"));
const security = JSON.parse(readFileSync(securityPath, "utf8"));
for (const [evidence, schema] of [[ci, "law-firm-os.private-staging.github-ci-evidence.v1"], [security, "law-firm-os.private-staging.github-security-evidence.v1"]]) {
  if (evidence.schema_version !== schema || evidence.execution_state !== "PASS" || evidence.exit_code !== 0 || evidence.source_sha !== packet.source_sha || evidence.source_tree !== packet.source_tree || evidence.artifact_sha256 !== packet.artifact_sha256 || evidence.packet_sha256 !== packet.packet_sha256 || evidence.real_data_count !== 0 || evidence.secret_material_returned !== false) throw new Error(`${schema} is not an exact-head safe PASS`);
}
if (ci.skipped_count !== 0 || ci.check_count !== ci.success_count || ci.check_count < 1) throw new Error("CI evidence is incomplete");
if (security.open_code_critical_high_count !== 0 || security.open_dependency_critical_high_count !== 0 || security.open_secret_alert_count !== 0 || security.security_check_count < 1) throw new Error("security evidence contains blockers");
const trustedSecurity = security.trusted_security_checks ?? [];
const trusted = trustedSecurity[0];
if (trustedSecurity.length !== 1
  || trusted.name !== PRIVATE_STAGING_TRUSTED_SECURITY_CHECK.name
  || trusted.publisher_app_id !== PRIVATE_STAGING_TRUSTED_SECURITY_CHECK.app_id
  || trusted.publisher_app_slug !== PRIVATE_STAGING_TRUSTED_SECURITY_CHECK.app_slug
  || trusted.workflow_name !== PRIVATE_STAGING_TRUSTED_SECURITY_CHECK.workflow_name
  || trusted.workflow_path !== PRIVATE_STAGING_TRUSTED_SECURITY_CHECK.workflow_path
  || trusted.workflow_event !== PRIVATE_STAGING_TRUSTED_SECURITY_CHECK.event
  || trusted.head_sha !== packet.source_sha
  || trusted.workflow_sha256 !== security.trusted_security_workflow_sha256
  || !/^[0-9a-f]{64}$/u.test(trusted.workflow_sha256 ?? "")) throw new Error("security evidence lacks the exact trusted GitHub identity");
const outputDir = outputDirectory(requiredOption("--output-dir"));
const specs = [
  { kind: "exact-head-ci", evidence: ci, path: ciPath, safeCounts: { check_count: ci.check_count, success_count: ci.success_count, skipped_count: 0, real_data_count: 0 }, claims: { exact_head_ci_passed: true } },
  { kind: "security-review", evidence: security, path: securityPath, safeCounts: { security_check_count: 1, open_code_critical_high_count: 0, open_dependency_critical_high_count: 0, open_secret_alert_count: 0, real_data_count: 0 }, claims: { security_review_passed: true } },
];
for (const spec of specs) {
  const receipt = buildPrivateStagingExecutionReceipt({ kind: spec.kind, keyId: approvalReceipt.key_id, approvalId: approval.approval_id, packet, startedAt: spec.evidence.started_at, finishedAt: spec.evidence.finished_at, command: spec.evidence.command, profile: spec.evidence.profile, safeCounts: spec.safeCounts, digests: { evidence_sha256: sha256(readFileSync(spec.path)), pr_url_sha256: spec.evidence.pr_url_sha256 }, claims: spec.claims });
  const path = resolve(outputDir, `${receipt.receipt_id}.json`); writeFileSync(path, `${JSON.stringify(receipt, null, 2)}\n`, { flag: "wx", mode: 0o600 }); chmodSync(path, 0o600);
}
process.stdout.write(`${JSON.stringify({ verdict: "PASS", unsigned_receipt_count: 2, output_directory: outputDir }, null, 2)}\n`);
