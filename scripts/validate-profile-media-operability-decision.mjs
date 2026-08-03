#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, realpathSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  PROFILE_MEDIA_ADMIN_GOAL_SCHEMA_VERSION,
  PROFILE_MEDIA_ADMIN_TUWS,
  readAndValidateProfileMediaAdminGoal,
} from "./lib/profile-media-admin-goal.mjs";
import {
  ProfileMediaEvidenceError,
  assertNoPrivateMaterial,
  evidenceFail,
  exactObject,
} from "./lib/profile-media-evidence-shared.mjs";
import { validateTestOnlyProfileMediaMeasurementReceipt } from "./lib/profile-media-measurement-validator.mjs";
import { readOwnerOnlyProductionEvidence } from "./lib/profile-media-production-evidence-files.mjs";
import {
  validateProfileDecisionEvidence,
  validateProfileMeasurementProducerEvidence,
  validateProfileOperationEvidence,
} from "./lib/matter-rf13-operational-evidence.mjs";

export { PROFILE_MEDIA_ADMIN_GOAL_SCHEMA_VERSION };
export { ProfileMediaEvidenceError as ProfileMediaDecisionValidationError };
export const PROFILE_MEDIA_DECISION_SCHEMA_VERSION = "law-firm-os.profile-media-operability-decision.v4";
export const PROFILE_MEDIA_BLOCKER_SCHEMA_VERSION = "law-firm-os.profile-media-operability-blocker.v1";
export const PROFILE_MEDIA_REQUIRED_ADMIN_CAPABILITIES = Object.freeze(PROFILE_MEDIA_ADMIN_TUWS.map((item) => item.capability));
export const PROFILE_MEDIA_OWNER_ROLES = Object.freeze([
  "people_operations_owner",
  "profile_media_operations_owner",
  "profile_media_product_owner",
  "profile_platform_owner",
  "profile_api_owner",
  "profile_security_owner",
  "profile_release_owner",
  "profile_rollback_owner",
]);

const DECISION_KEYS = ["defer_server_file", "create_admin_goal"];
const BLOCKED_METRICS = ["monthly_changes", "operator_minutes_p95", "desktop_reinstall_count", "profile_api_reads", "rollback_rehearsal"];
const REPO_ROOT = realpathSync(fileURLToPath(new URL("../", import.meta.url)));
const SHA1 = /^[a-f0-9]{40}$/u;
const SHA256 = /^[a-f0-9]{64}$/u;
const PRODUCTION_PATH_FLAGS = new Set([
  "--decision",
  "--measurement-receipt",
  "--operation-receipt",
  "--promote-review-receipt",
  "--promote-execution-receipt",
  "--candidate-smoke-receipt",
  "--rollback-review-receipt",
  "--rollback-execution-receipt",
  "--restored-smoke-receipt",
  "--prior-promote-execution-receipt-authority",
  "--prior-promote-execution-receipt-signature",
  "--prior-promote-execution-receipt-trust-registry",
  "--trust-registry",
  "--measurement-attestation-packet",
  "--measurement-attestation-receipt",
  "--measurement-attestation-signature",
  "--operation-attestation-receipt",
  "--operation-attestation-signature",
  "--decision-attestation-receipt",
  "--decision-attestation-signature",
]);
const PRODUCTION_VALUE_FLAGS = new Set([
  "--operation-reference",
  "--decision-reference",
]);
const TRUST_REGISTRY_PIN_ENV = "LAWOS_OWNER_TRUST_REGISTRY_SHA256";
const PRODUCTION_INPUT_MAX_BYTES = Object.freeze({
  decision: 2 * 1024 * 1024,
  measurement_receipt: 2 * 1024 * 1024,
  operation_receipt: 4 * 1024 * 1024,
  promote_review_receipt: 2 * 1024 * 1024,
  promote_execution_receipt: 2 * 1024 * 1024,
  candidate_smoke_receipt: 2 * 1024 * 1024,
  rollback_review_receipt: 2 * 1024 * 1024,
  rollback_execution_receipt: 2 * 1024 * 1024,
  restored_smoke_receipt: 2 * 1024 * 1024,
  prior_promote_execution_receipt_authority: 256 * 1024,
  prior_promote_execution_receipt_signature: 4096,
  prior_promote_execution_receipt_trust_registry: 1024 * 1024,
  trust_registry: 1024 * 1024,
  measurement_attestation_packet: 2 * 1024 * 1024,
  measurement_attestation_receipt: 256 * 1024,
  measurement_attestation_signature: 4096,
  operation_attestation_receipt: 256 * 1024,
  operation_attestation_signature: 4096,
  decision_attestation_receipt: 256 * 1024,
  decision_attestation_signature: 4096,
});

function ownerRole(value) {
  if (!PROFILE_MEDIA_OWNER_ROLES.includes(value)) evidenceFail("OWNER_ROLE_INVALID", "owner must be an approved non-personal role");
}

function reviewDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/u.test(value)) evidenceFail("REVIEW_DATE_INVALID", "review date must be YYYY-MM-DD");
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== value) evidenceFail("REVIEW_DATE_INVALID", "review date is invalid");
}

export function isProfileMediaDeferEligible(metrics) {
  return metrics.monthly_changes <= 1
    && metrics.operator_minutes_p95 <= 30
    && metrics.desktop_reinstall_count === 0
    && metrics.profile_api_reads.expected === 10
    && metrics.profile_api_reads.passed === 10
    && metrics.rollback.minutes <= 15
    && metrics.rollback.exact_hash_match === true
    && metrics.rollback.profile_reads_passed === 10;
}

function validateDecisionShape(record) {
  assertNoPrivateMaterial(record);
  exactObject(record, [
    "schema_version", "status", "decision", "measurement_receipt", "owner_role", "review_date", "admin_goal_reference",
  ], "profile media decision");
  if (record.schema_version !== PROFILE_MEDIA_DECISION_SCHEMA_VERSION || record.status !== "DECIDED") {
    evidenceFail("DECISION_SCHEMA", "decision schema or status is invalid");
  }
  ownerRole(record.owner_role);
  reviewDate(record.review_date);
  exactObject(record.decision, DECISION_KEYS, "decision choice");
  if (DECISION_KEYS.some((key) => typeof record.decision[key] !== "boolean")) evidenceFail("DECISION_CHOICE_INVALID", "decision choices must be booleans");
  const selected = DECISION_KEYS.filter((key) => record.decision[key]);
  if (selected.length !== 1) evidenceFail("DECISION_CARDINALITY", "exactly one decision choice is required");
  return selected[0];
}

export function validateProfileMediaDecision(record) {
  validateDecisionShape(record);
  evidenceFail(
    "PRODUCTION_CAPABILITY_UNAVAILABLE",
    "a source-authored receipt cannot establish production authority; retain BLOCKED_BY_EVIDENCE until an independent operator capability exists",
  );
}

export function validateTestOnlyProfileMediaDecision(record, {
  repoRoot,
  root,
  desktopMarkerPath,
  now = new Date(),
} = {}) {
  const selected = validateDecisionShape(record);
  const measurement = validateTestOnlyProfileMediaMeasurementReceipt(record.measurement_receipt, {
    repoRoot, root, desktopMarkerPath, now,
  });
  if (record.review_date !== measurement.generated_at.slice(0, 10)) {
    evidenceFail("DECISION_REVIEW_BINDING", "decision review date must match fresh measurement generation date");
  }
  const eligible = isProfileMediaDeferEligible(measurement.metrics);
  if (selected === "defer_server_file") {
    if (!eligible) evidenceFail("DEFER_THRESHOLD_VIOLATION", "canonical measurement does not satisfy every defer threshold");
    if (record.admin_goal_reference !== null) evidenceFail("ADMIN_GOAL_REFERENCE_FORBIDDEN", "defer decision must not claim an admin Goal");
    return Object.freeze({ choice: selected, environment: "TEST_ONLY", defer_eligible: true, measurement_receipt_validated: true, admin_goal_validated: false, admin_goal_tuw_count: 0 });
  }

  const goal = readAndValidateProfileMediaAdminGoal(repoRoot, record.admin_goal_reference);
  return Object.freeze({
    choice: selected,
    environment: "TEST_ONLY",
    defer_eligible: eligible,
    measurement_receipt_validated: true,
    admin_goal_validated: true,
    admin_goal_tuw_count: goal.tuw_count,
  });
}

export function validateProfileMediaEvidenceBlocker(record) {
  assertNoPrivateMaterial(record);
  exactObject(record, ["schema_version", "status", "decision_recorded", "owner_role", "review_date", "missing_metrics", "boundary"], "blocker receipt");
  if (record.schema_version !== PROFILE_MEDIA_BLOCKER_SCHEMA_VERSION || record.status !== "BLOCKED_BY_EVIDENCE" || record.decision_recorded !== false) {
    evidenceFail("BLOCKER_SCHEMA", "blocker schema, status, or decision state is invalid");
  }
  ownerRole(record.owner_role);
  reviewDate(record.review_date);
  if (!Array.isArray(record.missing_metrics) || record.missing_metrics.length !== BLOCKED_METRICS.length
    || [...record.missing_metrics].sort().some((value, index) => value !== [...BLOCKED_METRICS].sort()[index])) {
    evidenceFail("BLOCKER_METRICS", "blocker must list every missing measurement group");
  }
  exactObject(record.boundary, ["production_profile_mutation_executed", "deployment_executed", "desktop_reinstall_executed"], "blocker boundary");
  if (Object.values(record.boundary).some((value) => value !== false)) evidenceFail("BLOCKER_BOUNDARY", "blocker boundary must keep every mutation false");
  return Object.freeze({ decision_recorded: false, missing_metric_group_count: BLOCKED_METRICS.length });
}

function readDecision(path) {
  try { return JSON.parse(readFileSync(path, "utf8")); } catch { evidenceFail("DECISION_READ_FAILED", "decision JSON could not be read"); }
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function parseJson(bytes, code) {
  try { return JSON.parse(bytes.toString("utf8")); } catch {
    evidenceFail(code, "production evidence is not valid JSON");
  }
}

function exactGitSource(repoRoot, execute = execFileSync) {
  const git = (...args) => execute("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
  const status = () => git("status", "--porcelain=v1", "--untracked-files=all");
  try {
    if (status()) throw new Error("dirty source");
    const sha = git("rev-parse", "HEAD");
    const tree = git("rev-parse", "HEAD^{tree}");
    if (!SHA1.test(sha) || !SHA1.test(tree)
      || status()
      || git("rev-parse", "HEAD") !== sha
      || git("rev-parse", "HEAD^{tree}") !== tree) {
      throw new Error("source drift");
    }
    return Object.freeze({ sha, tree, dirty: false });
  } catch {
    evidenceFail("PROFILE_PRODUCTION_SOURCE_UNSEALED", "production decision requires an unchanged clean Git SHA/tree");
  }
}

function parseProductionArgs(argv) {
  if (argv[0] !== "--production-verify") {
    evidenceFail("INVALID_ARGUMENT", "production verification requires --production-verify");
  }
  const options = {};
  const seen = new Set(["--production-verify"]);
  for (let index = 1; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if ((!PRODUCTION_PATH_FLAGS.has(flag) && !PRODUCTION_VALUE_FLAGS.has(flag))
      || seen.has(flag)
      || typeof value !== "string"
      || !value
      || value.startsWith("--")) {
      evidenceFail("INVALID_ARGUMENT", "production verification arguments are invalid");
    }
    const key = flag.slice(2).replaceAll("-", "_");
    options[key] = PRODUCTION_PATH_FLAGS.has(flag) ? resolve(value) : value;
    seen.add(flag);
  }
  if (argv.length !== 1 + 2 * (PRODUCTION_PATH_FLAGS.size + PRODUCTION_VALUE_FLAGS.size)
    || seen.size !== 1 + PRODUCTION_PATH_FLAGS.size + PRODUCTION_VALUE_FLAGS.size) {
    evidenceFail("INVALID_ARGUMENT", "production verification requires every closed evidence argument exactly once");
  }
  return Object.freeze(options);
}

function loadProductionInputs(options, repoRoot, expectedRegistrySha256) {
  const loaded = {};
  for (const [key, maxBytes] of Object.entries(PRODUCTION_INPUT_MAX_BYTES)) {
    loaded[key] = readOwnerOnlyProductionEvidence(options[key], { repoRoot, maxBytes });
  }
  if (!SHA256.test(expectedRegistrySha256 ?? "")
    || sha256(loaded.trust_registry) !== expectedRegistrySha256) {
    evidenceFail("PROFILE_PRODUCTION_TRUST_REGISTRY_MISMATCH", "external trust registry digest is not exact");
  }
  return Object.freeze(loaded);
}

function exactMeasurementReference(record, bytes) {
  exactObject(record?.measurement_receipt, ["path", "sha256", "bytes"], "production measurement reference");
  const observed = Object.freeze({
    path: record.measurement_receipt.path,
    sha256: sha256(bytes),
    bytes: bytes.length,
  });
  if (JSON.stringify(observed) !== JSON.stringify(record.measurement_receipt)) {
    evidenceFail("PROFILE_PRODUCTION_MEASUREMENT_MISMATCH", "decision does not bind the exact measurement receipt bytes");
  }
  return observed;
}

function contentReference(path, bytes) {
  return Object.freeze({ path, sha256: sha256(bytes), bytes: bytes.length });
}

function attestation(registryBytes, expectedRegistrySha256, receiptBytes, signatureBytes, packetBytes) {
  return Object.freeze({
    registryBytes,
    receiptBytes,
    signatureBytes,
    expectedRegistrySha256,
    ...(packetBytes ? { packetBytes } : {}),
  });
}

async function runProductionValidation(options) {
  const canonicalRepoRoot = REPO_ROOT;
  const exactSource = exactGitSource(canonicalRepoRoot);
  const registrySha256 = process.env[TRUST_REGISTRY_PIN_ENV];
  const inputs = loadProductionInputs(options, canonicalRepoRoot, registrySha256);
  const record = parseJson(inputs.decision, "DECISION_READ_FAILED");
  const operationRecord = parseJson(inputs.operation_receipt, "PROFILE_PRODUCTION_OPERATION_READ_FAILED");
  const measurementReference = exactMeasurementReference(record, inputs.measurement_receipt);
  const operationReference = contentReference(options.operation_reference, inputs.operation_receipt);
  const decisionReference = contentReference(options.decision_reference, inputs.decision);
  const receiptSource = Object.freeze({ sha: exactSource.sha, tree: exactSource.tree, dirty: false });
  const registry = inputs.trust_registry;
  const measurementAttestation = attestation(
    registry,
    registrySha256,
    inputs.measurement_attestation_receipt,
    inputs.measurement_attestation_signature,
    inputs.measurement_attestation_packet,
  );
  const operationAttestation = attestation(
    registry,
    registrySha256,
    inputs.operation_attestation_receipt,
    inputs.operation_attestation_signature,
  );
  const decisionAttestation = attestation(
    registry,
    registrySha256,
    inputs.decision_attestation_receipt,
    inputs.decision_attestation_signature,
  );
  const pinnedOperationalReceipts = Object.freeze(Object.fromEntries([
    ["promote_review", "promote_review_receipt"],
    ["promote_execution", "promote_execution_receipt"],
    ["candidate_smoke", "candidate_smoke_receipt"],
    ["rollback_review", "rollback_review_receipt"],
    ["rollback_execution", "rollback_execution_receipt"],
    ["restored_smoke", "restored_smoke_receipt"],
  ].map(([key, inputKey]) => [key, Object.freeze({
    reference: operationRecord?.operational_receipts?.[key],
    bytes: inputs[inputKey],
  })])));
  const acceptedMeasurement = await validateProfileMeasurementProducerEvidence({
    bytes: inputs.measurement_receipt,
    reference: measurementReference,
    receiptSource,
    attestation: measurementAttestation,
  });
  const acceptedOperation = await validateProfileOperationEvidence({
    bytes: inputs.operation_receipt,
    reference: operationReference,
    measurementReference,
    acceptedMeasurement,
    pinnedOperationalReceipts,
    priorPromoteExecutionAuthority: Object.freeze({
      authorityBytes: inputs.prior_promote_execution_receipt_authority,
      signatureBytes: inputs.prior_promote_execution_receipt_signature,
      trustRegistryBytes: inputs.prior_promote_execution_receipt_trust_registry,
    }),
    receiptSource,
    attestation: operationAttestation,
  });
  if (acceptedOperation.owner_trust_registry_sha256 !== registrySha256) {
    evidenceFail(
      "PROFILE_PRODUCTION_TRUST_REGISTRY_MISMATCH",
      "production operation does not bind the independently pinned trust registry",
    );
  }
  const acceptedDecision = await validateProfileDecisionEvidence({
    bytes: inputs.decision,
    reference: decisionReference,
    measurementReference,
    repoRoot: canonicalRepoRoot,
    acceptedMeasurement,
    acceptedOperation,
    attestation: decisionAttestation,
  });
  const sourceAfterValidation = exactGitSource(canonicalRepoRoot);
  if (sourceAfterValidation.sha !== exactSource.sha || sourceAfterValidation.tree !== exactSource.tree) {
    evidenceFail("PROFILE_PRODUCTION_SOURCE_UNSEALED", "production source changed during validation");
  }
  return Object.freeze({
    validator: "profile-media-operability-decision",
    verdict: "PASS",
    environment: "PRODUCTION",
    decision_recorded: true,
    choice: acceptedDecision.decision,
    defer_eligible: acceptedDecision.defer_eligible,
    measurement_receipt_validated: true,
    operation_receipt_validated: true,
    decision_receipt_validated: true,
    source_clean: true,
    lineage_validated: true,
    independent_attestation_count: 3,
    profile_api_reads_expected: acceptedMeasurement.metrics.profile_api_reads.expected,
    profile_api_reads_passed: acceptedMeasurement.metrics.profile_api_reads.passed,
    rollback_minutes: acceptedOperation.rollback_minutes,
    admin_goal_validated: acceptedDecision.decision === "create_admin_goal",
    private_values_emitted: false,
    mutation_executed: false,
  });
}

export function runValidation({ decisionPath, repoRoot = process.cwd(), now = new Date() } = {}) {
  if (typeof decisionPath !== "string" || !decisionPath) evidenceFail("DECISION_PATH_REQUIRED", "decision path is required");
  const record = readDecision(decisionPath);
  if (record?.status === "BLOCKED_BY_EVIDENCE") {
    return Object.freeze({
      validator: "profile-media-operability-decision",
      verdict: "BLOCKED_BY_EVIDENCE",
      ...validateProfileMediaEvidenceBlocker(record),
      private_values_emitted: false,
      mutation_executed: false,
    });
  }
  return Object.freeze({
    validator: "profile-media-operability-decision",
    verdict: "PASS",
    ...validateProfileMediaDecision(record, { repoRoot, now }),
    private_values_emitted: false,
    mutation_executed: false,
  });
}

export async function main(argv = process.argv.slice(2)) {
  try {
    const legacy = argv.length === 2 && argv[0] === "--decision" && argv[1];
    const result = legacy
      ? runValidation({ decisionPath: resolve(argv[1]) })
      : await runProductionValidation(parseProductionArgs(argv));
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return result.verdict === "BLOCKED_BY_EVIDENCE" ? 2 : 0;
  } catch (error) {
    process.stderr.write(`${JSON.stringify({
      validator: "profile-media-operability-decision",
      verdict: "FAIL",
      code: typeof error?.code === "string" && /^[A-Z0-9_]+$/u.test(error.code) ? error.code : "PROFILE_MEDIA_DECISION_VALIDATION_FAILED",
      private_values_emitted: false,
      mutation_executed: false,
      success_claimed: false,
    })}\n`);
    return 1;
  }
}

const isMain = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (isMain) process.exitCode = await main();
