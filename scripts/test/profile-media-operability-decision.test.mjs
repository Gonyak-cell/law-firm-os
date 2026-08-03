import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash, generateKeyPairSync, sign } from "node:crypto";
import {
  chmodSync,
  cpSync,
  linkSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";
import {
  PROFILE_MEDIA_ADMIN_TUWS,
  PROFILE_MEDIA_ADMIN_GOAL_SCHEMA_VERSION,
  readAndValidateProfileMediaAdminGoal,
} from "../lib/profile-media-admin-goal.mjs";
import { describeRepoFile } from "../lib/profile-media-evidence-shared.mjs";
import { PROFILE_MEDIA_JOURNAL_EVENT_SCHEMA, runProfileMediaOperabilityMeasurement } from "../lib/profile-media-measurement.mjs";
import { readOwnerOnlyProductionEvidence } from "../lib/profile-media-production-evidence-files.mjs";
import { prepareProfilePhotoChange, readPreparedProfilePhotoChange } from "../lib/profile-photo-server-operation.mjs";
import {
  RF13_OPERATIONAL_ATTESTATION_POLICIES,
  buildRf13ProfileMeasurementPacket,
  buildRf13ReceiptAttestationPacket,
  hashRf13OperationalPacket,
} from "../lib/matter-rf13-operational-attestation.mjs";
import {
  RF13_PROFILE_MEASUREMENT_RECEIPT_SCHEMA,
  RF13_PROFILE_OPERATION_RECEIPT_SCHEMA,
  validateProfileDecisionEvidence,
  validateProfileMeasurementProducerEvidence,
  validateProfileOperationEvidence,
} from "../lib/matter-rf13-operational-evidence.mjs";
import {
  JSON_POSTGRES_PROFILE_ARTIFACT_PROMOTE_AUTHORITY_ACTION,
  JSON_POSTGRES_PROFILE_ARTIFACT_PROMOTE_AUTHORITY_ENVIRONMENT,
  JSON_POSTGRES_PROFILE_ARTIFACT_PROMOTE_AUTHORITY_ROLE,
  JSON_POSTGRES_PROFILE_ARTIFACT_PROMOTE_AUTHORITY_VERSION,
  jsonPostgresProductionInfrastructureResultSha256,
} from "../lib/json-postgres-production-execution.mjs";
import { canonicalizeJson } from "../lib/runtime-safety-approval-contract.mjs";
import {
  PROFILE_MEDIA_BLOCKER_SCHEMA_VERSION,
  PROFILE_MEDIA_DECISION_SCHEMA_VERSION,
  runValidation,
  validateProfileMediaDecision,
  validateTestOnlyProfileMediaDecision,
} from "../validate-profile-media-operability-decision.mjs";
import {
  createActiveProfileReader,
  createFixtureRepo,
  opaqueChangeRef,
  provisionOperationRoot,
  sequenceClock,
  tempRoot,
} from "./profile-media-test-fixture.mjs";

const SCRIPT = fileURLToPath(new URL("../validate-profile-media-operability-decision.mjs", import.meta.url));
const SOURCE_REPO_ROOT = realpathSync(fileURLToPath(new URL("../../", import.meta.url)));
const CLOCK = [
  "2026-08-01T00:00:00.000Z", "2026-08-01T00:00:01.000Z", "2026-08-01T00:10:01.000Z",
  "2026-08-01T00:10:02.000Z", "2026-08-01T00:12:02.000Z", "2026-08-01T00:13:02.000Z",
  "2026-08-01T00:14:02.000Z", "2026-08-01T00:14:03.000Z",
];

function shaDescriptor(relativePath, absolutePath) {
  const bytes = readFileSync(absolutePath);
  return { path: relativePath, sha256: createHash("sha256").update(bytes).digest("hex"), bytes: bytes.length };
}

async function measuredDecisionFixture(testContext, {
  priorEvents = [],
  label = "decision-01",
  clock = CLOCK,
  initializedAt,
} = {}) {
  const operation = provisionOperationRoot(testContext, {
    changeRef: opaqueChangeRef(label), priorEvents, ...(initializedAt ? { initializedAt } : {}),
  });
  const options = { ...operation, testOnly: true, execute: true };
  prepareProfilePhotoChange(options);
  const state = readPreparedProfilePhotoChange(options);
  const repoRoot = createFixtureRepo(testContext);
  const suffix = operation.changeRef.slice("profile_change_".length);
  const relativeReceipt = `.omo/evidence/profile-media-operability-measurement-${suffix}.json`;
  const receiptPath = join(repoRoot, relativeReceipt);
  const desktopMarkerPath = join(operation.root, ".desktop-package-marker");
  writeFileSync(desktopMarkerPath, "test-only-package-marker\n", { mode: 0o600 });
  await runProfileMediaOperabilityMeasurement({
    ...options,
    repoRoot,
    receiptPath,
    desktopMarkerPath,
    now: sequenceClock(clock),
    readProfile: createActiveProfileReader({ root: operation.root, state }),
  });
  const record = {
    schema_version: PROFILE_MEDIA_DECISION_SCHEMA_VERSION,
    status: "DECIDED",
    decision: { defer_server_file: true, create_admin_goal: false },
    measurement_receipt: shaDescriptor(relativeReceipt, receiptPath),
    owner_role: "people_operations_owner",
    review_date: "2026-08-01",
    admin_goal_reference: null,
  };
  return { operation, repoRoot, receiptPath, desktopMarkerPath, record };
}

function testContextFor(fixture, now = new Date("2026-08-01T01:00:00.000Z")) {
  return { repoRoot: fixture.repoRoot, root: fixture.operation.root, desktopMarkerPath: fixture.desktopMarkerPath, now };
}

function blockerReceipt() {
  return {
    schema_version: PROFILE_MEDIA_BLOCKER_SCHEMA_VERSION,
    status: "BLOCKED_BY_EVIDENCE",
    decision_recorded: false,
    owner_role: "people_operations_owner",
    review_date: "2026-08-31",
    missing_metrics: ["monthly_changes", "operator_minutes_p95", "desktop_reinstall_count", "profile_api_reads", "rollback_rehearsal"],
    boundary: { production_profile_mutation_executed: false, deployment_executed: false, desktop_reinstall_executed: false },
  };
}

function assertCode(callback, code) {
  assert.throws(callback, (error) => error?.code === code);
}

function materializeAdminGoal(repoRoot) {
  const tuws = PROFILE_MEDIA_ADMIN_TUWS.map((required) => {
    const testPath = join(repoRoot, required.test_path);
    mkdirSync(dirname(testPath), { recursive: true, mode: 0o700 });
    writeFileSync(testPath, `import test from "node:test";\ntest("${required.id}", () => {});\n`, { mode: 0o600 });
    return {
      id: required.id,
      capability: required.capability,
      owner_role: required.owner_role,
      test: describeRepoFile(repoRoot, required.test_path, `${required.id} test`),
    };
  });
  const contract = {
    schema_version: PROFILE_MEDIA_ADMIN_GOAL_SCHEMA_VERSION,
    goal_id: "PROFILE-MEDIA-ADMIN-GOAL-TEST-ONLY",
    owner_role: "profile_media_product_owner",
    tuws,
  };
  const relativePath = "workbook/matter-profile-media-admin-goal-test-only.md";
  mkdirSync(dirname(join(repoRoot, relativePath)), { recursive: true, mode: 0o700 });
  writeFileSync(join(repoRoot, relativePath), [
    "# Profile media admin Goal", "", "```json profile-media-admin-goal-contract",
    JSON.stringify(contract, null, 2), "```", "",
  ].join("\n"), { mode: 0o600 });
  return describeRepoFile(repoRoot, relativePath, "profile media admin Goal");
}

function runAdminGoalRace(repoRoot, reference, raceKind) {
  const moduleUrl = pathToFileURL(fileURLToPath(new URL(
    "../lib/profile-media-admin-goal.mjs",
    import.meta.url,
  ))).href;
  return spawnSync(process.execPath, ["--input-type=module", "--eval", `
    import fs from "node:fs";
    import path from "node:path";
    import { syncBuiltinESMExports } from "node:module";
    const target = path.join(process.env.PROFILE_ADMIN_GOAL_REPO_ROOT, JSON.parse(process.env.PROFILE_ADMIN_GOAL_REFERENCE).path);
    const originalBytes = fs.readFileSync(target);
    const originalOpen = fs.openSync;
    fs.openSync = (candidate, ...args) => {
      if (candidate === target) {
        fs.openSync = originalOpen;
        if (process.env.PROFILE_ADMIN_GOAL_RACE_KIND === "file") {
          fs.renameSync(target, target + ".original");
          fs.writeFileSync(target, originalBytes, { mode: 0o600 });
        } else {
          const parent = path.dirname(target);
          fs.renameSync(parent, parent + ".original");
          fs.mkdirSync(parent, { mode: 0o700 });
          fs.writeFileSync(target, originalBytes, { mode: 0o600 });
        }
      }
      return originalOpen(candidate, ...args);
    };
    syncBuiltinESMExports();
    const { readAndValidateProfileMediaAdminGoal } = await import(process.env.PROFILE_ADMIN_GOAL_MODULE_URL);
    try {
      readAndValidateProfileMediaAdminGoal(
        process.env.PROFILE_ADMIN_GOAL_REPO_ROOT,
        JSON.parse(process.env.PROFILE_ADMIN_GOAL_REFERENCE),
      );
      process.exitCode = 2;
    } catch (error) {
      process.exitCode = error?.code === "ADMIN_GOAL_FILE_INVALID" ? 0 : 3;
    }
  `], {
    encoding: "utf8",
    env: {
      ...process.env,
      PROFILE_ADMIN_GOAL_MODULE_URL: `${moduleUrl}?race=${raceKind}-${Date.now()}`,
      PROFILE_ADMIN_GOAL_RACE_KIND: raceKind,
      PROFILE_ADMIN_GOAL_REFERENCE: JSON.stringify(reference),
      PROFILE_ADMIN_GOAL_REPO_ROOT: repoRoot,
    },
  });
}

const PRODUCTION_EVIDENCE_PREFIX = ".omo/evidence/rf13-debt-remediation-20260731/production-cli";
const PROFILE_SMOKE_SCHEMA = "law-firm-os.profile-production-api-smoke.v1";
const PROFILE_REVIEW_SCHEMA = "law-firm-os.json-postgres-production-reviewed-change-set.v1";
const PROFILE_EXECUTION_SCHEMA = "law-firm-os.json-postgres-production-infrastructure-result.v1";

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}

function git(repoRoot, args) {
  return execFileSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function cleanProductionVerifier(testContext) {
  const fixtureRoot = realpathSync(tempRoot(testContext, "lawos-production-decision-cli-"));
  const repoRoot = join(fixtureRoot, "verifier-repository");
  const privateRoot = join(fixtureRoot, "private-evidence");
  mkdirSync(repoRoot, { mode: 0o700 });
  mkdirSync(privateRoot, { mode: 0o700 });
  cpSync(join(SOURCE_REPO_ROOT, "scripts"), join(repoRoot, "scripts"), { recursive: true });
  cpSync(join(SOURCE_REPO_ROOT, "packages", "runtime-auth"), join(repoRoot, "packages", "runtime-auth"), { recursive: true });
  mkdirSync(join(repoRoot, "apps", "api", "src"), { recursive: true, mode: 0o700 });
  cpSync(
    join(SOURCE_REPO_ROOT, "apps", "api", "src", "hrx-role-scope-matrix.js"),
    join(repoRoot, "apps", "api", "src", "hrx-role-scope-matrix.js"),
  );
  cpSync(join(SOURCE_REPO_ROOT, "package.json"), join(repoRoot, "package.json"));
  writeFileSync(join(repoRoot, ".gitignore"), "node_modules/\n", { mode: 0o600 });
  symlinkSync(join(SOURCE_REPO_ROOT, "node_modules"), join(repoRoot, "node_modules"));
  const adminGoalReference = materializeAdminGoal(repoRoot);
  git(repoRoot, ["init", "-b", "main"]);
  git(repoRoot, ["config", "user.name", "Profile Decision Test"]);
  git(repoRoot, ["config", "user.email", "profile-decision@example.invalid"]);
  git(repoRoot, ["add", "."]);
  git(repoRoot, ["commit", "-m", "sealed production verifier fixture"]);
  const importProbe = spawnSync(process.execPath, [
    "--input-type=module",
    "--eval",
    "await import(process.argv[1]);",
    pathToFileURL(join(repoRoot, "scripts", "lib", "matter-rf13-operational-evidence.mjs")).href,
  ], { cwd: repoRoot, encoding: "utf8" });
  assert.equal(importProbe.status, 0, importProbe.stderr);
  return Object.freeze({
    repoRoot: realpathSync(repoRoot),
    privateRoot: realpathSync(privateRoot),
    adminGoalReference,
    script: join(repoRoot, "scripts", "validate-profile-media-operability-decision.mjs"),
    source: Object.freeze({
      sha: git(repoRoot, ["rev-parse", "HEAD"]),
      tree: git(repoRoot, ["rev-parse", "HEAD^{tree}"]),
      dirty: false,
    }),
  });
}

function privateEvidenceFile(root, name, value) {
  const bytes = Buffer.isBuffer(value)
    ? value
    : Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
  const path = join(root, name);
  writeFileSync(path, bytes, { mode: 0o600 });
  chmodSync(path, 0o600);
  return Object.freeze({ path: realpathSync(path), bytes });
}

function evidenceReference(file, logicalName, schemaVersion) {
  return Object.freeze({
    path: `${PRODUCTION_EVIDENCE_PREFIX}/${logicalName}`,
    sha256: digest(file.bytes),
    bytes: file.bytes.length,
    ...(schemaVersion ? { schema_version: schemaVersion } : {}),
  });
}

function profileMetrics(overrides = {}) {
  const base = {
    monthly_changes: 1,
    operator_minutes_p95: 30,
    desktop_reinstall_count: 0,
    profile_api_reads: { expected: 10, passed: 10 },
    rollback: { minutes: 15, exact_hash_match: true, profile_reads_passed: 10 },
  };
  return {
    ...base,
    ...overrides,
    profile_api_reads: { ...base.profile_api_reads, ...(overrides.profile_api_reads ?? {}) },
    rollback: { ...base.rollback, ...(overrides.rollback ?? {}) },
  };
}

function profileSmoke({ source, generatedAt, artifact }) {
  return {
    schema_version: PROFILE_SMOKE_SCHEMA,
    producer: "run-profile-production-api-smoke",
    generated_at: generatedAt,
    verdict: "PASS",
    source: { sha: source.sha, tree: source.tree, api_source_revision: source.sha },
    api_artifact: { filename: artifact.filename, sha256: artifact.sha256, bytes: artifact.bytes },
    profile_photo: { generation_verified: true, expected_profile_count: 10, passed_profile_count: 10 },
    profile_reads: {
      expected: 10,
      passed: 10,
      http_200: 10,
      outcome_passed: 10,
      ui_state_populated: 10,
      photo_included: 10,
      png_decoded: 10,
      generation_match: 10,
      content_digest_match: 10,
    },
    boundary: {
      authorized_production_read_only: true,
      health_get_count: 1,
      authenticated_get_count: 10,
      total_get_count: 11,
      api_write_request_count: 0,
      external_mutation_count: 0,
      database_mutation_count: 0,
      aws_control_plane_call_count: 0,
      deployment_count: 0,
      desktop_deploy_count: 0,
      desktop_reinstall_count: 0,
      local_receipt_write_count: 1,
    },
    private_values_emitted: false,
  };
}

function profileInfrastructureReceipt({
  source,
  kind,
  action,
  generatedAt,
  baselineArtifact,
  targetArtifact,
  baselineManifest,
  targetManifest,
  targetArtifactVersion,
  transitionSha256,
  lineage,
  priorPromoteExecutionAuthority,
}) {
  const value = {
    schema_version: kind === "review" ? PROFILE_REVIEW_SCHEMA : PROFILE_EXECUTION_SCHEMA,
    operation: kind === "review" ? "create-profile-artifact-change-set" : "execute-profile-artifact-change-set",
    purpose: "profile-artifact-rebind",
    outcome: "PASS",
    source_sha: source.sha,
    source_tree: source.tree,
    profile_artifact_action: action,
    baseline_artifact_sha256: baselineArtifact.sha256,
    baseline_artifact_manifest_sha256: digest(`artifact-manifest:${baselineArtifact.sha256}`),
    baseline_artifact_key: `lawos-production/${source.sha}/${baselineArtifact.sha256}.zip`,
    target_artifact_sha256: targetArtifact.sha256,
    target_artifact_manifest_sha256: digest(`artifact-manifest:${targetArtifact.sha256}`),
    target_artifact_key: `lawos-production/${source.sha}/${targetArtifact.sha256}.zip`,
    baseline_profile_generation_ref: baselineArtifact.generation_ref,
    target_profile_generation_ref: targetArtifact.generation_ref,
    baseline_private_manifest_sha256: baselineManifest.sha256,
    baseline_profile_counts: {
      private_manifest_entry_count: 10,
      injected_photo_entry_count: 10,
      git_source_photo_entry_count: 0,
    },
    target_private_manifest_sha256: targetManifest.sha256,
    target_profile_counts: {
      private_manifest_entry_count: 10,
      injected_photo_entry_count: 10,
      git_source_photo_entry_count: 0,
    },
    target_artifact_version_verified: true,
    target_artifact_version_head_verified_count: 1,
    target_artifact_object_lock_mode: "COMPLIANCE",
    target_artifact_server_side_encryption: "aws:kms",
    target_artifact_kms_key_ref_sha256: digest("profile-artifact-kms-key"),
    target_artifact_version: targetArtifactVersion,
    profile_artifact_transition_sha256: transitionSha256,
    baseline_artifact_version: lineage.baseline_artifact_version,
    baseline_execution_packet_sha256: lineage.baseline_execution_packet_sha256,
    target_artifact_upload_packet_sha256: lineage.target_artifact_upload_packet_sha256,
    target_artifact_upload_receipt_sha256: lineage.target_artifact_upload_receipt_sha256,
    previous_runtime_generation: lineage.previous_runtime_generation,
    target_execution_packet_sha256: lineage.target_execution_packet_sha256,
    target_runtime_generation: lineage.target_runtime_generation,
    baseline_approval_id_sha256: lineage.baseline_approval_id_sha256,
    target_approval_id_sha256: lineage.target_approval_id_sha256,
    baseline_owner_trust_registry_sha256: lineage.baseline_owner_trust_registry_sha256,
    target_owner_trust_registry_sha256: lineage.target_owner_trust_registry_sha256,
    target_parameters_sha256: lineage.target_parameters_sha256,
    ...(priorPromoteExecutionAuthority ?? {}),
    packet_sha256: lineage.target_execution_packet_sha256,
    approval_receipt_sha256: digest(`approval-receipt:${action}:${kind}`),
    registry_sha256: lineage.target_owner_trust_registry_sha256,
    generated_at: generatedAt,
    aws_mutation_count: 1,
    production_data_write_count: 0,
    production_write_count: 0,
    raw_pii_evidence_count: 0,
    secret_material_recorded: false,
    reviewed_change_set_sha256: digest(`reviewed:${action}:${transitionSha256}`),
    ...(kind === "execution"
      ? { production_traffic_enabled: true, lambda_eni_bootstrap_enabled: false, temporary_eni_allow_count: 0 }
      : {}),
  };
  return {
    ...value,
    result_sha256: jsonPostgresProductionInfrastructureResultSha256(value),
  };
}

function combinedTrustRegistry({
  now,
  keyOverrides = {},
  reuseDecisionKey = false,
  reusePriorPromoteKey = false,
}) {
  const channels = [
    ["measurement", RF13_OPERATIONAL_ATTESTATION_POLICIES.profileMeasurement],
    ["operation", RF13_OPERATIONAL_ATTESTATION_POLICIES.profileOperation],
    ["decision", RF13_OPERATIONAL_ATTESTATION_POLICIES.profileDecision],
    ["priorPromote", {
      role: JSON_POSTGRES_PROFILE_ARTIFACT_PROMOTE_AUTHORITY_ROLE,
      action: JSON_POSTGRES_PROFILE_ARTIFACT_PROMOTE_AUTHORITY_ACTION,
      environment: JSON_POSTGRES_PROFILE_ARTIFACT_PROMOTE_AUTHORITY_ENVIRONMENT,
    }],
  ];
  const privateKeys = {};
  const pairs = {};
  const keys = channels.map(([channel, policy]) => {
    const pair = channel === "decision" && reuseDecisionKey
      ? pairs.operation
      : channel === "priorPromote" && reusePriorPromoteKey
        ? pairs.operation
        : generateKeyPairSync("ed25519");
    pairs[channel] = pair;
    privateKeys[channel] = pair.privateKey;
    return {
      key_id: channel === "priorPromote" ? "profile-prior-promote-key" : `profile-${channel}-key`,
      algorithm: "Ed25519",
      public_key_spki_pem: pair.publicKey.export({ type: "spki", format: "pem" }).toString(),
      roles: [policy.role],
      actions: [policy.action],
      environments: [policy.environment],
      valid_from: new Date(now - 365 * 86_400_000).toISOString(),
      valid_until: new Date(now + 365 * 86_400_000).toISOString(),
      revoked_at: null,
      ...(keyOverrides[channel] ?? {}),
    };
  });
  const registry = {
    schema_version: "law-firm-os.runtime-safety.approval-trust-registry.v1",
    generated_at: new Date(now - 86_400_000).toISOString(),
    keys,
  };
  const bytes = Buffer.from(`${JSON.stringify(registry, null, 2)}\n`);
  return { registry, bytes, sha256: digest(bytes), privateKeys, pairs };
}

function signedApproval({
  policy,
  packet,
  source,
  channel,
  signedAt,
  expiresAt,
  privateKey,
  receiptOverrides = {},
  signingPrivateKey,
}) {
  const receipt = {
    schema_version: "law-firm-os.runtime-safety.approval.v1",
    approval_id: `profile-${channel}-approval`,
    key_id: `profile-${channel}-key`,
    role: policy.role,
    decision: "approved",
    packet_sha256: hashRf13OperationalPacket(packet),
    source_sha: source.sha,
    source_tree: source.tree,
    action: policy.action,
    environment: policy.environment,
    signed_at: signedAt,
    expires_at: expiresAt,
    data_scope: [],
    contact_scope: [],
    ...receiptOverrides,
  };
  return {
    receipt,
    receiptBytes: Buffer.from(`${JSON.stringify(receipt, null, 2)}\n`),
    signatureBytes: sign(
      null,
      Buffer.from(canonicalizeJson(receipt)),
      signingPrivateKey ?? privateKey,
    ),
  };
}

let productionFixtureSequence = 0;

function productionEvidenceBundle(verifier, {
  metrics = profileMetrics(),
  decisionChoice = "defer_server_file",
  adminGoalReference = null,
  keyOverrides = {},
  reuseDecisionKey = false,
  reusePriorPromoteKey = false,
  approvalOverrides = {},
  wrongSigningKey,
  wrongPriorPromoteSigningKey = false,
  mismatchedPriorPromoteRegistry = false,
  mutatePriorPromoteAuthority = (value) => value,
  mutateMeasurement = (value) => value,
  mutateNestedReceipts = (value) => value,
  mutateOperation = (value) => value,
  mutateDecision = (value) => value,
} = {}) {
  productionFixtureSequence += 1;
  const root = join(verifier.privateRoot, `bundle-${String(productionFixtureSequence).padStart(3, "0")}`);
  mkdirSync(root, { mode: 0o700 });
  const now = Date.now();
  const baselineStarted = now - 4 * 60 * 60 * 1000;
  const measurementGeneratedAt = new Date(baselineStarted - 20 * 60_000).toISOString();
  const measurementSignedAt = new Date(baselineStarted - 19 * 60_000).toISOString();
  const operationGeneratedAt = new Date(baselineStarted + 22 * 60_000).toISOString();
  const operationSignedAt = new Date(baselineStarted + 23 * 60_000).toISOString();
  const decisionSignedAt = new Date(now - 60_000).toISOString();
  const defaultExpiry = new Date(now + 86_400_000).toISOString();
  const trust = combinedTrustRegistry({
    now,
    keyOverrides,
    reuseDecisionKey,
    reusePriorPromoteKey,
  });
  const registryFile = privateEvidenceFile(root, "owner-trust-registry.json", trust.bytes);
  const priorPromoteRegistryBytes = mismatchedPriorPromoteRegistry
    ? Buffer.from(`${JSON.stringify({
      ...trust.registry,
      generated_at: new Date(Date.parse(trust.registry.generated_at) + 1_000).toISOString(),
    }, null, 2)}\n`)
    : trust.bytes;
  const priorPromoteRegistrySha256 = digest(priorPromoteRegistryBytes);
  const priorPromoteRegistryFile = privateEvidenceFile(
    root,
    "prior-promote-execution-receipt-trust-registry.json",
    priorPromoteRegistryBytes,
  );
  const sourceReceipt = {
    source_sha: verifier.source.sha,
    source_tree: verifier.source.tree,
    source_dirty: false,
  };
  const measurementBody = mutateMeasurement({
    schema_version: RF13_PROFILE_MEASUREMENT_RECEIPT_SCHEMA,
    producer: "profile-media-production-observer",
    generated_at: measurementGeneratedAt,
    environment: "PRODUCTION",
    source: sourceReceipt,
    metrics,
  });
  const measurementFile = privateEvidenceFile(root, "measurement.json", measurementBody);
  const measurementReference = evidenceReference(measurementFile, "measurement.json");
  const measurementSchemaReference = {
    ...measurementReference,
    schema_version: RF13_PROFILE_MEASUREMENT_RECEIPT_SCHEMA,
  };
  const baselineArtifact = {
    filename: "lawos-production-baseline.zip",
    sha256: "b".repeat(64),
    bytes: 4096,
    generation_ref: `profile_generation_${"b".repeat(32)}`,
  };
  const candidateArtifact = {
    filename: "lawos-production-candidate.zip",
    sha256: "a".repeat(64),
    bytes: 4200,
    generation_ref: `profile_generation_${"a".repeat(32)}`,
  };
  const baselineManifest = { sha256: "c".repeat(64), bytes: 1024, profile_count: 10 };
  const candidateManifest = { sha256: "d".repeat(64), bytes: 1088, profile_count: 10 };
  const promoteVersion = "immutable-profile-version-candidate";
  const rollbackVersion = "immutable-profile-version-baseline";
  const baselineUploadPacket = digest(`upload-packet:${baselineArtifact.sha256}`);
  const candidatePacket = digest(`upload-packet:${candidateArtifact.sha256}`);
  const promoteLineage = {
    baseline_artifact_version: rollbackVersion,
    baseline_execution_packet_sha256: baselineUploadPacket,
    target_artifact_upload_packet_sha256: candidatePacket,
    target_artifact_upload_receipt_sha256: digest(`upload-receipt:${candidateArtifact.sha256}`),
    previous_runtime_generation: 7,
    target_execution_packet_sha256: candidatePacket,
    target_runtime_generation: 8,
    baseline_approval_id_sha256: digest("baseline-a-approval"),
    target_approval_id_sha256: digest("candidate-b-approval"),
    baseline_owner_trust_registry_sha256: trust.sha256,
    target_owner_trust_registry_sha256: trust.sha256,
    target_parameters_sha256: digest("candidate-b-stack-parameters"),
  };
  const rollbackLineage = {
    baseline_artifact_version: promoteVersion,
    baseline_execution_packet_sha256: candidatePacket,
    target_artifact_upload_packet_sha256: baselineUploadPacket,
    target_artifact_upload_receipt_sha256: digest(`upload-receipt:${baselineArtifact.sha256}`),
    previous_runtime_generation: 8,
    target_execution_packet_sha256: digest("restored-a-execution-packet"),
    target_runtime_generation: 9,
    baseline_approval_id_sha256: promoteLineage.target_approval_id_sha256,
    target_approval_id_sha256: digest("restored-a-approval"),
    baseline_owner_trust_registry_sha256: trust.sha256,
    target_owner_trust_registry_sha256: trust.sha256,
    target_parameters_sha256: digest("restored-a-stack-parameters"),
  };
  const promoteExecution = profileInfrastructureReceipt({
    source: verifier.source,
    kind: "execution",
    action: "promote",
    generatedAt: new Date(baselineStarted + 150_000).toISOString(),
    baselineArtifact,
    targetArtifact: candidateArtifact,
    baselineManifest,
    targetManifest: candidateManifest,
    targetArtifactVersion: promoteVersion,
    transitionSha256: digest("profile-promote-transition"),
    lineage: promoteLineage,
  });
  const promoteExecutionBytes = Buffer.from(`${JSON.stringify(promoteExecution, null, 2)}\n`);
  const priorPromoteAuthorityBody = mutatePriorPromoteAuthority({
    schema_version: JSON_POSTGRES_PROFILE_ARTIFACT_PROMOTE_AUTHORITY_VERSION,
    action: JSON_POSTGRES_PROFILE_ARTIFACT_PROMOTE_AUTHORITY_ACTION,
    environment: JSON_POSTGRES_PROFILE_ARTIFACT_PROMOTE_AUTHORITY_ENVIRONMENT,
    receipt_bytes_sha256: digest(promoteExecutionBytes),
    receipt_result_sha256: promoteExecution.result_sha256,
    trust_registry_sha256: priorPromoteRegistrySha256,
    source_sha: verifier.source.sha,
    source_tree: verifier.source.tree,
    signer_key_id: "profile-prior-promote-key",
    signer_fingerprint_sha256: digest(trust.pairs.priorPromote.publicKey.export({
      type: "spki",
      format: "der",
    })),
    signed_at: new Date(baselineStarted + 160_000).toISOString(),
  });
  const priorPromoteAuthorityBytes = Buffer.from(`${JSON.stringify(priorPromoteAuthorityBody, null, 2)}\n`);
  const priorPromoteSignatureBytes = sign(
    null,
    Buffer.from(canonicalizeJson(priorPromoteAuthorityBody)),
    wrongPriorPromoteSigningKey
      ? generateKeyPairSync("ed25519").privateKey
      : trust.privateKeys.priorPromote,
  );
  const priorPromoteAuthorityLineage = {
    prior_promote_execution_receipt_sha256: promoteExecution.result_sha256,
    prior_promote_execution_receipt_bytes_sha256: digest(promoteExecutionBytes),
    prior_promote_execution_receipt_authority_sha256: digest(priorPromoteAuthorityBytes),
    prior_promote_execution_receipt_signature_sha256: digest(priorPromoteSignatureBytes),
    prior_promote_execution_receipt_trust_registry_sha256: priorPromoteRegistrySha256,
    prior_promote_execution_receipt_signer_key_id: priorPromoteAuthorityBody.signer_key_id,
    prior_promote_execution_receipt_signer_fingerprint_sha256:
      priorPromoteAuthorityBody.signer_fingerprint_sha256,
    prior_promote_execution_receipt_authority_signed_at: priorPromoteAuthorityBody.signed_at,
  };
  const nestedBodies = mutateNestedReceipts({
    promote_review: profileInfrastructureReceipt({
      source: verifier.source,
      kind: "review",
      action: "promote",
      generatedAt: new Date(baselineStarted + 90_000).toISOString(),
      baselineArtifact,
      targetArtifact: candidateArtifact,
      baselineManifest,
      targetManifest: candidateManifest,
      targetArtifactVersion: promoteVersion,
      transitionSha256: digest("profile-promote-transition"),
      lineage: promoteLineage,
    }),
    promote_execution: promoteExecution,
    candidate_smoke: profileSmoke({
      source: verifier.source,
      generatedAt: new Date(baselineStarted + 270_000).toISOString(),
      artifact: candidateArtifact,
    }),
    rollback_review: profileInfrastructureReceipt({
      source: verifier.source,
      kind: "review",
      action: "rollback",
      generatedAt: new Date(baselineStarted + 330_000).toISOString(),
      baselineArtifact: candidateArtifact,
      targetArtifact: baselineArtifact,
      baselineManifest: candidateManifest,
      targetManifest: baselineManifest,
      targetArtifactVersion: rollbackVersion,
      transitionSha256: digest("profile-rollback-transition"),
      lineage: rollbackLineage,
      priorPromoteExecutionAuthority: priorPromoteAuthorityLineage,
    }),
    rollback_execution: profileInfrastructureReceipt({
      source: verifier.source,
      kind: "execution",
      action: "rollback",
      generatedAt: new Date(baselineStarted + 390_000).toISOString(),
      baselineArtifact: candidateArtifact,
      targetArtifact: baselineArtifact,
      baselineManifest: candidateManifest,
      targetManifest: baselineManifest,
      targetArtifactVersion: rollbackVersion,
      transitionSha256: digest("profile-rollback-transition"),
      lineage: rollbackLineage,
      priorPromoteExecutionAuthority: priorPromoteAuthorityLineage,
    }),
    restored_smoke: profileSmoke({
      source: verifier.source,
      generatedAt: new Date(baselineStarted + 20.5 * 60_000).toISOString(),
      artifact: baselineArtifact,
    }),
  });
  const nestedSchemas = {
    promote_review: PROFILE_REVIEW_SCHEMA,
    promote_execution: PROFILE_EXECUTION_SCHEMA,
    candidate_smoke: PROFILE_SMOKE_SCHEMA,
    rollback_review: PROFILE_REVIEW_SCHEMA,
    rollback_execution: PROFILE_EXECUTION_SCHEMA,
    restored_smoke: PROFILE_SMOKE_SCHEMA,
  };
  const nestedFiles = {};
  const operationalReceipts = {};
  for (const [key, value] of Object.entries(nestedBodies)) {
    nestedFiles[key] = privateEvidenceFile(root, `${key}.json`, value);
    operationalReceipts[key] = evidenceReference(
      nestedFiles[key],
      `${key}.json`,
      nestedSchemas[key],
    );
  }
  const priorPromoteAuthorityFile = privateEvidenceFile(
    root,
    "prior-promote-execution-receipt-authority.json",
    priorPromoteAuthorityBytes,
  );
  const priorPromoteSignatureFile = privateEvidenceFile(
    root,
    "prior-promote-execution-receipt-authority.sig",
    priorPromoteSignatureBytes,
  );
  const priorPromoteExecutionAuthorityReferences = {
    authority: evidenceReference(
      priorPromoteAuthorityFile,
      "prior-promote-execution-receipt-authority.json",
    ),
    signature: evidenceReference(
      priorPromoteSignatureFile,
      "prior-promote-execution-receipt-authority.sig",
    ),
    trust_registry: evidenceReference(
      priorPromoteRegistryFile,
      "prior-promote-execution-receipt-trust-registry.json",
    ),
  };
  const operationBody = mutateOperation({
    schema_version: RF13_PROFILE_OPERATION_RECEIPT_SCHEMA,
    producer: "profile-media-api-operation",
    generated_at: operationGeneratedAt,
    environment: "PRODUCTION",
    source: sourceReceipt,
    measurement_receipt: measurementReference,
    artifacts: {
      baseline: baselineArtifact,
      candidate: candidateArtifact,
      restored: { ...baselineArtifact },
    },
    private_manifests: {
      baseline: baselineManifest,
      candidate: candidateManifest,
      restored: { ...baselineManifest },
    },
    operational_receipts: operationalReceipts,
    prior_promote_execution_authority: priorPromoteExecutionAuthorityReferences,
    deployment_controls: {
      immutable_versioned_object: true,
      candidate_object_version_ref_sha256: digest(promoteVersion),
      restored_object_version_ref_sha256: digest(rollbackVersion),
      at_rest_encryption: "AWS_KMS",
      kms_key_ref_sha256: digest("profile-artifact-kms-key"),
      owner_trust_registry_sha256: trust.sha256,
      reviewed_change_set: true,
      promote_review_receipt_sha256: operationalReceipts.promote_review.sha256,
      promote_execution_receipt_sha256: operationalReceipts.promote_execution.sha256,
      rollback_review_receipt_sha256: operationalReceipts.rollback_review.sha256,
      rollback_execution_receipt_sha256: operationalReceipts.rollback_execution.sha256,
      ad_hoc_direct_update: false,
    },
    events: [
      {
        step: "baseline_read",
        started_at: new Date(baselineStarted).toISOString(),
        completed_at: new Date(baselineStarted + 60_000).toISOString(),
        artifact_sha256: baselineArtifact.sha256,
        profile_reads_expected: 10,
        profile_reads_passed: 10,
      },
      {
        step: "candidate_deploy",
        started_at: new Date(baselineStarted + 2 * 60_000).toISOString(),
        completed_at: new Date(baselineStarted + 3 * 60_000).toISOString(),
        from_artifact_sha256: baselineArtifact.sha256,
        to_artifact_sha256: candidateArtifact.sha256,
        review_receipt_sha256: operationalReceipts.promote_review.sha256,
        execution_receipt_sha256: operationalReceipts.promote_execution.sha256,
      },
      {
        step: "candidate_read",
        started_at: new Date(baselineStarted + 4 * 60_000).toISOString(),
        completed_at: new Date(baselineStarted + 5 * 60_000).toISOString(),
        artifact_sha256: candidateArtifact.sha256,
        smoke_receipt_sha256: operationalReceipts.candidate_smoke.sha256,
        profile_reads_expected: 10,
        profile_reads_passed: 10,
      },
      {
        step: "rollback_deploy",
        started_at: new Date(baselineStarted + 6 * 60_000).toISOString(),
        completed_at: new Date(baselineStarted + 7 * 60_000).toISOString(),
        from_artifact_sha256: candidateArtifact.sha256,
        to_artifact_sha256: baselineArtifact.sha256,
        review_receipt_sha256: operationalReceipts.rollback_review.sha256,
        execution_receipt_sha256: operationalReceipts.rollback_execution.sha256,
      },
      {
        step: "restored_baseline_read",
        started_at: new Date(baselineStarted + 20 * 60_000).toISOString(),
        completed_at: new Date(baselineStarted + 21 * 60_000).toISOString(),
        artifact_sha256: baselineArtifact.sha256,
        smoke_receipt_sha256: operationalReceipts.restored_smoke.sha256,
        profile_reads_expected: 10,
        profile_reads_passed: 10,
      },
    ],
    desktop: { redeploys: 0, reinstalls: 0 },
  });
  const operationFile = privateEvidenceFile(root, "operation.json", operationBody);
  const operationReference = evidenceReference(operationFile, "operation.json");
  const operationSchemaReference = {
    ...operationReference,
    schema_version: RF13_PROFILE_OPERATION_RECEIPT_SCHEMA,
  };
  const decisionBody = mutateDecision({
    schema_version: PROFILE_MEDIA_DECISION_SCHEMA_VERSION,
    status: "DECIDED",
    decision: {
      defer_server_file: decisionChoice === "defer_server_file",
      create_admin_goal: decisionChoice === "create_admin_goal",
    },
    measurement_receipt: measurementReference,
    owner_role: "profile_media_product_owner",
    review_date: decisionSignedAt.slice(0, 10),
    admin_goal_reference: adminGoalReference,
  });
  const decisionFile = privateEvidenceFile(root, "decision.json", decisionBody);
  const decisionReference = evidenceReference(decisionFile, "decision.json");
  const decisionSchemaReference = {
    ...decisionReference,
    schema_version: PROFILE_MEDIA_DECISION_SCHEMA_VERSION,
  };
  const packets = {
    measurement: buildRf13ProfileMeasurementPacket({
      reference: measurementSchemaReference,
      source: verifier.source,
      generatedAt: measurementBody.generated_at,
      metrics: measurementBody.metrics,
    }),
    operation: buildRf13ReceiptAttestationPacket({
      purpose: RF13_OPERATIONAL_ATTESTATION_POLICIES.profileOperation.purpose,
      reference: operationSchemaReference,
      source: verifier.source,
    }),
    decision: buildRf13ReceiptAttestationPacket({
      purpose: RF13_OPERATIONAL_ATTESTATION_POLICIES.profileDecision.purpose,
      reference: decisionSchemaReference,
      source: verifier.source,
    }),
  };
  const approvals = {
    measurement: signedApproval({
      policy: RF13_OPERATIONAL_ATTESTATION_POLICIES.profileMeasurement,
      packet: packets.measurement,
      source: verifier.source,
      channel: "measurement",
      signedAt: measurementSignedAt,
      expiresAt: defaultExpiry,
      privateKey: trust.privateKeys.measurement,
      receiptOverrides: approvalOverrides.measurement,
      signingPrivateKey: wrongSigningKey === "measurement" ? generateKeyPairSync("ed25519").privateKey : undefined,
    }),
    operation: signedApproval({
      policy: RF13_OPERATIONAL_ATTESTATION_POLICIES.profileOperation,
      packet: packets.operation,
      source: verifier.source,
      channel: "operation",
      signedAt: operationSignedAt,
      expiresAt: defaultExpiry,
      privateKey: trust.privateKeys.operation,
      receiptOverrides: approvalOverrides.operation,
      signingPrivateKey: wrongSigningKey === "operation" ? generateKeyPairSync("ed25519").privateKey : undefined,
    }),
    decision: signedApproval({
      policy: RF13_OPERATIONAL_ATTESTATION_POLICIES.profileDecision,
      packet: packets.decision,
      source: verifier.source,
      channel: "decision",
      signedAt: decisionSignedAt,
      expiresAt: defaultExpiry,
      privateKey: trust.privateKeys.decision,
      receiptOverrides: approvalOverrides.decision,
      signingPrivateKey: wrongSigningKey === "decision" ? generateKeyPairSync("ed25519").privateKey : undefined,
    }),
  };
  const files = {
    decision: decisionFile,
    measurement_receipt: measurementFile,
    operation_receipt: operationFile,
    promote_review_receipt: nestedFiles.promote_review,
    promote_execution_receipt: nestedFiles.promote_execution,
    candidate_smoke_receipt: nestedFiles.candidate_smoke,
    rollback_review_receipt: nestedFiles.rollback_review,
    rollback_execution_receipt: nestedFiles.rollback_execution,
    restored_smoke_receipt: nestedFiles.restored_smoke,
    prior_promote_execution_receipt_authority: priorPromoteAuthorityFile,
    prior_promote_execution_receipt_signature: priorPromoteSignatureFile,
    prior_promote_execution_receipt_trust_registry: priorPromoteRegistryFile,
    trust_registry: registryFile,
    measurement_attestation_packet: privateEvidenceFile(root, "measurement-packet.json", packets.measurement),
    measurement_attestation_receipt: privateEvidenceFile(root, "measurement-approval.json", approvals.measurement.receiptBytes),
    measurement_attestation_signature: privateEvidenceFile(root, "measurement-approval.sig", approvals.measurement.signatureBytes),
    operation_attestation_receipt: privateEvidenceFile(root, "operation-approval.json", approvals.operation.receiptBytes),
    operation_attestation_signature: privateEvidenceFile(root, "operation-approval.sig", approvals.operation.signatureBytes),
    decision_attestation_receipt: privateEvidenceFile(root, "decision-approval.json", approvals.decision.receiptBytes),
    decision_attestation_signature: privateEvidenceFile(root, "decision-approval.sig", approvals.decision.signatureBytes),
  };
  const flagValues = new Map(Object.entries(files).map(([key, file]) => [
    `--${key.replaceAll("_", "-")}`,
    file.path,
  ]));
  flagValues.set("--operation-reference", operationReference.path);
  flagValues.set("--decision-reference", decisionReference.path);
  return {
    root,
    registrySha256: trust.sha256,
    files,
    flagValues,
    approvals,
    packets,
    references: {
      measurement: measurementReference,
      operation: operationReference,
      decision: decisionReference,
      operational: operationalReceipts,
    },
    records: { measurement: measurementBody, operation: operationBody, decision: decisionBody },
  };
}

async function directlyValidateProductionBundle(verifier, fixture) {
  const registryBytes = fixture.files.trust_registry.bytes;
  const acceptedMeasurement = validateProfileMeasurementProducerEvidence({
    bytes: fixture.files.measurement_receipt.bytes,
    reference: fixture.references.measurement,
    receiptSource: verifier.source,
    attestation: {
      registryBytes,
      receiptBytes: fixture.files.measurement_attestation_receipt.bytes,
      signatureBytes: fixture.files.measurement_attestation_signature.bytes,
      packetBytes: fixture.files.measurement_attestation_packet.bytes,
      expectedRegistrySha256: fixture.registrySha256,
    },
  });
  const acceptedOperation = await validateProfileOperationEvidence({
    bytes: fixture.files.operation_receipt.bytes,
    reference: fixture.references.operation,
    measurementReference: fixture.references.measurement,
    acceptedMeasurement,
    receiptSource: verifier.source,
    pinnedOperationalReceipts: Object.fromEntries(Object.entries(fixture.references.operational).map(([key, reference]) => [
      key,
      { reference, bytes: fixture.files[`${key}_receipt`].bytes },
    ])),
    priorPromoteExecutionAuthority: {
      authorityBytes: fixture.files.prior_promote_execution_receipt_authority.bytes,
      signatureBytes: fixture.files.prior_promote_execution_receipt_signature.bytes,
      trustRegistryBytes: fixture.files.prior_promote_execution_receipt_trust_registry.bytes,
    },
    attestation: {
      registryBytes,
      receiptBytes: fixture.files.operation_attestation_receipt.bytes,
      signatureBytes: fixture.files.operation_attestation_signature.bytes,
      expectedRegistrySha256: fixture.registrySha256,
    },
  });
  return validateProfileDecisionEvidence({
    bytes: fixture.files.decision.bytes,
    reference: fixture.references.decision,
    measurementReference: fixture.references.measurement,
    repoRoot: verifier.repoRoot,
    acceptedMeasurement,
    acceptedOperation,
    attestation: {
      registryBytes,
      receiptBytes: fixture.files.decision_attestation_receipt.bytes,
      signatureBytes: fixture.files.decision_attestation_signature.bytes,
      expectedRegistrySha256: fixture.registrySha256,
    },
  });
}

function runProductionCli(verifier, fixture, { pin = fixture.registrySha256, argumentOverrides = {} } = {}) {
  const values = new Map(fixture.flagValues);
  for (const [flag, value] of Object.entries(argumentOverrides)) values.set(flag, value);
  const env = { ...process.env };
  if (pin === null) delete env.LAWOS_OWNER_TRUST_REGISTRY_SHA256;
  else env.LAWOS_OWNER_TRUST_REGISTRY_SHA256 = pin;
  return spawnSync(process.execPath, [
    verifier.script,
    "--production-verify",
    ...[...values.entries()].flat(),
  ], {
    cwd: verifier.repoRoot,
    encoding: "utf8",
    env,
  });
}

function assertSanitizedCliOutput(result, verifier, fixture) {
  const output = `${result.stdout}${result.stderr}`;
  for (const forbidden of [
    verifier.privateRoot,
    verifier.source.sha,
    verifier.source.tree,
    fixture.registrySha256,
    "BEGIN PUBLIC KEY",
    "profile-measurement-key",
    "profile-operation-key",
    "profile-decision-key",
    "profile-measurement-approval",
    "profile-operation-approval",
    "profile-decision-approval",
  ]) {
    assert.equal(output.includes(forbidden), false, `CLI output disclosed ${forbidden}`);
  }
  assert.doesNotMatch(output, /[a-f0-9]{64}/u);
}

function assertProductionFailure(result, verifier, fixture) {
  assert.equal(result.status, 1, result.stdout || result.stderr);
  assert.equal(result.stdout, "");
  const failure = JSON.parse(result.stderr);
  assert.equal(failure.verdict, "FAIL");
  assert.equal(failure.private_values_emitted, false);
  assert.equal(failure.mutation_executed, false);
  assert.equal(failure.success_claimed, false);
  assertSanitizedCliOutput(result, verifier, fixture);
}

test("explicit TEST_ONLY validation exercises threshold policy without granting production eligibility", async (testContext) => {
  const fixture = await measuredDecisionFixture(testContext);
  const result = validateTestOnlyProfileMediaDecision(fixture.record, testContextFor(fixture));
  assert.deepEqual(result, {
    choice: "defer_server_file",
    environment: "TEST_ONLY",
    defer_eligible: true,
    measurement_receipt_validated: true,
    admin_goal_validated: false,
    admin_goal_tuw_count: 0,
  });
  assertCode(() => validateProfileMediaDecision(fixture.record), "PRODUCTION_CAPABILITY_UNAVAILABLE");
});

test("fabricated production sentinel, repository, journal, and marker fields cannot mint a production PASS", async (testContext) => {
  const fixture = await measuredDecisionFixture(testContext, { label: "fabricated-bundle" });
  const receipt = JSON.parse(readFileSync(fixture.receiptPath, "utf8"));
  receipt.environment = "production";
  receipt.observation_journal.path = join(fixture.operation.root, ".lawos-profile-media-operations.jsonl");
  receipt.desktop_marker.path = fixture.desktopMarkerPath;
  const forgedPath = join(fixture.repoRoot, ".omo", "evidence", "forged-production.json");
  writeFileSync(forgedPath, `${JSON.stringify(receipt)}\n`, { mode: 0o600 });
  fixture.record.measurement_receipt = shaDescriptor(".omo/evidence/forged-production.json", forgedPath);
  assertCode(() => validateProfileMediaDecision(fixture.record), "PRODUCTION_CAPABILITY_UNAVAILABLE");

  const decisionPath = join(fixture.repoRoot, "forged-decision.json");
  writeFileSync(decisionPath, `${JSON.stringify(fixture.record)}\n`);
  const cli = spawnSync(process.execPath, [SCRIPT, "--decision", decisionPath], { cwd: fixture.repoRoot, encoding: "utf8" });
  assert.equal(cli.status, 1);
  assert.equal(JSON.parse(cli.stderr).code, "PRODUCTION_CAPABILITY_UNAVAILABLE");
});

test("TEST_ONLY validator independently re-reads receipt, source, journal, and marker bytes", async (testContext) => {
  const receiptTamper = await measuredDecisionFixture(testContext, { label: "receipt-tamper" });
  writeFileSync(receiptTamper.receiptPath, `${readFileSync(receiptTamper.receiptPath, "utf8")} `);
  assertCode(() => validateTestOnlyProfileMediaDecision(receiptTamper.record, testContextFor(receiptTamper)), "ARTIFACT_BINDING_MISMATCH");

  const sourceDrift = await measuredDecisionFixture(testContext, { label: "source-drift" });
  writeFileSync(join(sourceDrift.repoRoot, "scripts/lib/profile-media-api-smoke.mjs"), "// drift\n");
  assertCode(() => validateTestOnlyProfileMediaDecision(sourceDrift.record, testContextFor(sourceDrift)), "ARTIFACT_BINDING_MISMATCH");

  const markerDrift = await measuredDecisionFixture(testContext, { label: "marker-drift" });
  writeFileSync(markerDrift.desktopMarkerPath, "changed-marker\n", { mode: 0o600 });
  assertCode(() => validateTestOnlyProfileMediaDecision(markerDrift.record, testContextFor(markerDrift)), "DESKTOP_MARKER_BINDING_MISMATCH");

  const journalDrift = await measuredDecisionFixture(testContext, { label: "journal-drift" });
  writeFileSync(join(journalDrift.operation.root, ".lawos-profile-media-operations.jsonl"), `${JSON.stringify({
    schema_version: PROFILE_MEDIA_JOURNAL_EVENT_SCHEMA,
    event_ref: opaqueChangeRef("post-receipt-drift"),
    started_at: "2026-08-01T00:20:00.000Z",
    completed_at: "2026-08-01T00:21:00.000Z",
    desktop_install_state_changed: false,
  })}\n`, { flag: "a" });
  assertCode(() => validateTestOnlyProfileMediaDecision(journalDrift.record, testContextFor(journalDrift)), "JOURNAL_BINDING_MISMATCH");
});

test("TEST_ONLY policy recomputes rollback and observation thresholds", async (testContext) => {
  const slowClock = [
    "2026-08-01T00:00:00.000Z", "2026-08-01T00:00:01.000Z", "2026-08-01T00:10:01.000Z",
    "2026-08-01T00:10:02.000Z", "2026-08-01T00:20:02.000Z", "2026-08-01T00:25:02.000Z",
    "2026-08-01T00:26:02.000Z", "2026-08-01T00:26:03.000Z",
  ];
  const slow = await measuredDecisionFixture(testContext, { label: "slow", clock: slowClock });
  assertCode(() => validateTestOnlyProfileMediaDecision(slow.record, testContextFor(slow)), "DEFER_THRESHOLD_VIOLATION");

  const short = await measuredDecisionFixture(testContext, { label: "short", initializedAt: "2026-07-15T00:00:00.000Z" });
  assertCode(() => validateTestOnlyProfileMediaDecision(short.record, testContextFor(short)), "OBSERVATION_WINDOW_INVALID");
});

test("complete exact admin Goal is structurally reviewable only in TEST_ONLY policy", async (testContext) => {
  const prior = {
    schema_version: PROFILE_MEDIA_JOURNAL_EVENT_SCHEMA,
    event_ref: opaqueChangeRef("prior-admin"),
    started_at: "2026-07-15T00:00:00.000Z",
    completed_at: "2026-07-15T00:45:00.000Z",
    desktop_install_state_changed: false,
  };
  const fixture = await measuredDecisionFixture(testContext, { label: "admin", priorEvents: [prior] });
  fixture.record.decision = { defer_server_file: false, create_admin_goal: true };
  fixture.record.admin_goal_reference = materializeAdminGoal(fixture.repoRoot);
  const result = validateTestOnlyProfileMediaDecision(fixture.record, testContextFor(fixture));
  assert.equal(result.environment, "TEST_ONLY");
  assert.equal(result.admin_goal_tuw_count, 8);
  assertCode(() => validateProfileMediaDecision(fixture.record), "PRODUCTION_CAPABILITY_UNAVAILABLE");
});

test("admin Goal reference rejects changed bytes and deterministic path or container swaps", (testContext) => {
  const changedRoot = realpathSync(createFixtureRepo(testContext));
  const changedReference = materializeAdminGoal(changedRoot);
  assert.equal(readAndValidateProfileMediaAdminGoal(changedRoot, changedReference).tuw_count, 8);
  const changedPath = join(changedRoot, changedReference.path);
  const changedBytes = Buffer.from(readFileSync(changedPath));
  changedBytes[0] = changedBytes[0] === 0x23 ? 0x21 : 0x23;
  writeFileSync(changedPath, changedBytes, { mode: 0o600 });
  assertCode(
    () => readAndValidateProfileMediaAdminGoal(changedRoot, changedReference),
    "ADMIN_GOAL_BINDING_MISMATCH",
  );

  for (const raceKind of ["file", "container"]) {
    const racedRoot = realpathSync(createFixtureRepo(testContext));
    const racedReference = materializeAdminGoal(racedRoot);
    const raced = runAdminGoalRace(racedRoot, racedReference, raceKind);
    assert.equal(raced.status, 0, raced.stderr);
    assert.equal(raced.stdout, "");
  }
});

test("manual metrics, invalid cardinality, and private fields fail before any success claim", () => {
  const record = {
    schema_version: PROFILE_MEDIA_DECISION_SCHEMA_VERSION,
    status: "DECIDED",
    decision: { defer_server_file: false, create_admin_goal: false },
    measurement_receipt: {},
    owner_role: "people_operations_owner",
    review_date: "2026-08-01",
    admin_goal_reference: null,
  };
  assertCode(() => validateProfileMediaDecision(record), "DECISION_CARDINALITY");
  record.decision = { defer_server_file: true, create_admin_goal: true };
  assertCode(() => validateProfileMediaDecision(record), "DECISION_CARDINALITY");
  record.photo_bytes = "data:image/png;base64,private";
  assertCode(() => validateProfileMediaDecision(record), "PRIVATE_FIELD");
});

test("honest BLOCKED_BY_EVIDENCE remains valid, mutation-free, and CLI exit 2", (testContext) => {
  const root = tempRoot(testContext, "lawos-profile-blocker-");
  const path = join(root, "blocked.json");
  writeFileSync(path, `${JSON.stringify(blockerReceipt(), null, 2)}\n`);
  const result = runValidation({ decisionPath: path, repoRoot: root });
  assert.equal(result.verdict, "BLOCKED_BY_EVIDENCE");
  assert.equal(result.decision_recorded, false);
  assert.equal(result.mutation_executed, false);
  const cli = spawnSync(process.execPath, [SCRIPT, "--decision", path], { cwd: root, encoding: "utf8" });
  assert.equal(cli.status, 2);
  assert.equal(JSON.parse(cli.stdout).verdict, "BLOCKED_BY_EVIDENCE");
  assert.equal(cli.stderr, "");
});

test("production evidence loader rejects repository, public, symlink, and swapped files", (testContext) => {
  const root = realpathSync(tempRoot(testContext, "lawos-production-evidence-loader-"));
  const repoRoot = join(root, "repository");
  const privateRoot = join(root, "private");
  mkdirSync(repoRoot, { mode: 0o700 });
  mkdirSync(privateRoot, { mode: 0o700 });

  const acceptedPath = join(privateRoot, "accepted.json");
  writeFileSync(acceptedPath, "{}\n", { mode: 0o600 });
  assert.equal(readOwnerOnlyProductionEvidence(acceptedPath, {
    repoRoot,
    maxBytes: 1024,
  }).toString("utf8"), "{}\n");

  const publicPath = join(privateRoot, "public.json");
  writeFileSync(publicPath, "{}\n", { mode: 0o600 });
  chmodSync(publicPath, 0o644);
  assertCode(() => readOwnerOnlyProductionEvidence(publicPath, {
    repoRoot,
    maxBytes: 1024,
  }), "PROFILE_PRODUCTION_EVIDENCE_INPUT");

  chmodSync(privateRoot, 0o755);
  assertCode(() => readOwnerOnlyProductionEvidence(acceptedPath, {
    repoRoot,
    maxBytes: 1024,
  }), "PROFILE_PRODUCTION_EVIDENCE_INPUT");
  chmodSync(privateRoot, 0o700);

  const repositoryPath = join(repoRoot, "repository.json");
  writeFileSync(repositoryPath, "{}\n", { mode: 0o600 });
  assertCode(() => readOwnerOnlyProductionEvidence(repositoryPath, {
    repoRoot,
    maxBytes: 1024,
  }), "PROFILE_PRODUCTION_EVIDENCE_INPUT");

  const hardlinkPath = join(privateRoot, "hardlink.json");
  linkSync(acceptedPath, hardlinkPath);
  assertCode(() => readOwnerOnlyProductionEvidence(hardlinkPath, {
    repoRoot,
    maxBytes: 1024,
  }), "PROFILE_PRODUCTION_EVIDENCE_INPUT");

  const oversizedPath = join(privateRoot, "oversized.json");
  writeFileSync(oversizedPath, `${"x".repeat(1024)}\n`, { mode: 0o600 });
  assertCode(() => readOwnerOnlyProductionEvidence(oversizedPath, {
    repoRoot,
    maxBytes: 1024,
  }), "PROFILE_PRODUCTION_EVIDENCE_INPUT");

  const symlinkPath = join(privateRoot, "symlink.json");
  symlinkSync(acceptedPath, symlinkPath);
  assertCode(() => readOwnerOnlyProductionEvidence(symlinkPath, {
    repoRoot,
    maxBytes: 1024,
  }), "PROFILE_PRODUCTION_EVIDENCE_INPUT");

  const swappedPath = join(privateRoot, "swapped.json");
  const originalPath = join(privateRoot, "swapped-original.json");
  writeFileSync(swappedPath, "{\"version\":1}\n", { mode: 0o600 });
  const helperUrl = pathToFileURL(fileURLToPath(new URL(
    "../lib/profile-media-production-evidence-files.mjs",
    import.meta.url,
  ))).href;
  const raced = spawnSync(process.execPath, ["--input-type=module", "--eval", `
    import fs from "node:fs";
    import { syncBuiltinESMExports } from "node:module";
    const originalOpen = fs.openSync;
    fs.openSync = (path, ...args) => {
      if (path === process.env.PROFILE_EVIDENCE_SWAP_PATH) {
        fs.renameSync(path, process.env.PROFILE_EVIDENCE_ORIGINAL_PATH);
        fs.writeFileSync(path, "{\\\"version\\\":2}\\n", { mode: 0o600 });
      }
      return originalOpen(path, ...args);
    };
    syncBuiltinESMExports();
    const { readOwnerOnlyProductionEvidence } = await import(process.env.PROFILE_EVIDENCE_HELPER_URL);
    try {
      readOwnerOnlyProductionEvidence(process.env.PROFILE_EVIDENCE_SWAP_PATH, {
        repoRoot: process.env.PROFILE_EVIDENCE_REPO_ROOT,
        maxBytes: 1024,
      });
      process.exitCode = 2;
    } catch (error) {
      process.exitCode = error?.code === "PROFILE_PRODUCTION_EVIDENCE_INPUT" ? 0 : 3;
    }
  `], {
    encoding: "utf8",
    env: {
      ...process.env,
      PROFILE_EVIDENCE_HELPER_URL: `${helperUrl}?swap-test=${Date.now()}`,
      PROFILE_EVIDENCE_ORIGINAL_PATH: originalPath,
      PROFILE_EVIDENCE_REPO_ROOT: repoRoot,
      PROFILE_EVIDENCE_SWAP_PATH: swappedPath,
    },
  });
  assert.equal(raced.status, 0, raced.stderr);
  assert.equal(raced.stdout, "");
});

test("standalone production mode accepts only exact independently signed A-to-B-to-A evidence", async (testContext) => {
  const verifier = cleanProductionVerifier(testContext);

  await testContext.test("accepts a clean exact-source aggregate-only production decision", async () => {
    const fixture = productionEvidenceBundle(verifier);
    const direct = await directlyValidateProductionBundle(verifier, fixture);
    assert.equal(direct.decision, "defer_server_file");
    const result = runProductionCli(verifier, fixture);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, "");
    const accepted = JSON.parse(result.stdout);
    assert.deepEqual(accepted, {
      validator: "profile-media-operability-decision",
      verdict: "PASS",
      environment: "PRODUCTION",
      decision_recorded: true,
      choice: "defer_server_file",
      defer_eligible: true,
      measurement_receipt_validated: true,
      operation_receipt_validated: true,
      decision_receipt_validated: true,
      source_clean: true,
      lineage_validated: true,
      independent_attestation_count: 3,
      profile_api_reads_expected: 10,
      profile_api_reads_passed: 10,
      rollback_minutes: 15,
      admin_goal_validated: false,
      private_values_emitted: false,
      mutation_executed: false,
    });
    assertSanitizedCliOutput(result, verifier, fixture);
  });

  await testContext.test("accepts an ineligible decision only with the signed content-addressed admin Goal", async () => {
    const fixture = productionEvidenceBundle(verifier, {
      metrics: profileMetrics({ monthly_changes: 2 }),
      decisionChoice: "create_admin_goal",
      adminGoalReference: verifier.adminGoalReference,
    });
    const direct = await directlyValidateProductionBundle(verifier, fixture);
    assert.equal(direct.decision, "create_admin_goal");
    const result = runProductionCli(verifier, fixture);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, "");
    const accepted = JSON.parse(result.stdout);
    assert.equal(accepted.choice, "create_admin_goal");
    assert.equal(accepted.defer_eligible, false);
    assert.equal(accepted.admin_goal_validated, true);
    assertSanitizedCliOutput(result, verifier, fixture);
  });

  const invalidAuthorities = [
    ["wrong detached key", { wrongSigningKey: "decision" }],
    ["same Ed25519 key under a different key id", { reuseDecisionKey: true }],
    ["duplicate approval id", {
      approvalOverrides: { decision: { approval_id: "profile-operation-approval" } },
    }],
    ["wrong approval role", { approvalOverrides: { decision: { role: "wrong_profile_role" } } }],
    ["wrong approval action", { approvalOverrides: { decision: { action: "wrong-profile-action" } } }],
    ["wrong approval environment", { approvalOverrides: { decision: { environment: "staging" } } }],
    ["wrong approval source", { approvalOverrides: { decision: { source_sha: "9".repeat(40) } } }],
    ["future approval", {
      approvalOverrides: { decision: {
        signed_at: new Date(Date.now() + 60 * 60_000).toISOString(),
        expires_at: new Date(Date.now() + 2 * 60 * 60_000).toISOString(),
      } },
    }],
    ["expired approval", {
      approvalOverrides: { decision: {
        signed_at: new Date(Date.now() - 2 * 60_000).toISOString(),
        expires_at: new Date(Date.now() - 60_000).toISOString(),
      } },
    }],
    ["revoked approval key", {
      keyOverrides: { decision: { revoked_at: new Date(Date.now() - 2 * 60_000).toISOString() } },
    }],
  ];
  for (const [label, options] of invalidAuthorities) {
    await testContext.test(`rejects ${label}`, () => {
      const fixture = productionEvidenceBundle(verifier, options);
      assertProductionFailure(runProductionCli(verifier, fixture), verifier, fixture);
    });
  }

  await testContext.test("rejects a forged signed prior-promote authority", () => {
    const fixture = productionEvidenceBundle(verifier, {
      mutatePriorPromoteAuthority(value) {
        return { ...value, receipt_result_sha256: "e".repeat(64) };
      },
    });
    assertProductionFailure(runProductionCli(verifier, fixture), verifier, fixture);
  });

  await testContext.test("rejects a prior-promote authority signed by the wrong key", () => {
    const fixture = productionEvidenceBundle(verifier, { wrongPriorPromoteSigningKey: true });
    assertProductionFailure(runProductionCli(verifier, fixture), verifier, fixture);
  });

  await testContext.test("rejects tampered prior-promote receipt bytes", () => {
    const fixture = productionEvidenceBundle(verifier);
    writeFileSync(
      fixture.files.promote_execution_receipt.path,
      Buffer.concat([fixture.files.promote_execution_receipt.bytes, Buffer.from(" \n")]),
      { mode: 0o600 },
    );
    assertProductionFailure(runProductionCli(verifier, fixture), verifier, fixture);
  });

  await testContext.test("rejects tampered prior-promote authority bytes", () => {
    const fixture = productionEvidenceBundle(verifier);
    writeFileSync(
      fixture.files.prior_promote_execution_receipt_authority.path,
      Buffer.concat([
        fixture.files.prior_promote_execution_receipt_authority.bytes,
        Buffer.from(" \n"),
      ]),
      { mode: 0o600 },
    );
    assertProductionFailure(runProductionCli(verifier, fixture), verifier, fixture);
  });

  await testContext.test("rejects reuse of the top operation key under a prior-promote key id", () => {
    const fixture = productionEvidenceBundle(verifier, { reusePriorPromoteKey: true });
    assertProductionFailure(runProductionCli(verifier, fixture), verifier, fixture);
  });

  await testContext.test("rejects prior-promote trust-registry drift", () => {
    const fixture = productionEvidenceBundle(verifier, { mismatchedPriorPromoteRegistry: true });
    assertProductionFailure(runProductionCli(verifier, fixture), verifier, fixture);
  });

  await testContext.test("rejects a wrong logical operation reference", () => {
    const fixture = productionEvidenceBundle(verifier);
    const result = runProductionCli(verifier, fixture, {
      argumentOverrides: { "--operation-reference": `${PRODUCTION_EVIDENCE_PREFIX}/wrong-operation.json` },
    });
    assertProductionFailure(result, verifier, fixture);
  });

  await testContext.test("rejects a wrong nested receipt schema", () => {
    const fixture = productionEvidenceBundle(verifier, {
      mutateNestedReceipts(value) {
        value.candidate_smoke.schema_version = "law-firm-os.profile-production-api-smoke.wrong";
        return value;
      },
    });
    assertProductionFailure(runProductionCli(verifier, fixture), verifier, fixture);
  });

  await testContext.test("rejects a measurement source mismatch", () => {
    const fixture = productionEvidenceBundle(verifier, {
      mutateMeasurement(value) {
        value.source.source_sha = "8".repeat(40);
        return value;
      },
    });
    assertProductionFailure(runProductionCli(verifier, fixture), verifier, fixture);
  });

  await testContext.test("rejects decision-byte tampering after signing", () => {
    const fixture = productionEvidenceBundle(verifier);
    writeFileSync(
      fixture.files.decision.path,
      Buffer.concat([fixture.files.decision.bytes, Buffer.from(" \n")]),
      { mode: 0o600 },
    );
    assertProductionFailure(runProductionCli(verifier, fixture), verifier, fixture);
  });

  await testContext.test("rejects replay of the operation approval as a decision approval", () => {
    const fixture = productionEvidenceBundle(verifier);
    writeFileSync(
      fixture.files.decision_attestation_receipt.path,
      fixture.approvals.operation.receiptBytes,
      { mode: 0o600 },
    );
    writeFileSync(
      fixture.files.decision_attestation_signature.path,
      fixture.approvals.operation.signatureBytes,
      { mode: 0o600 },
    );
    assertProductionFailure(runProductionCli(verifier, fixture), verifier, fixture);
  });

  await testContext.test("rejects a missing or wrong independent trust-registry pin", () => {
    const missing = productionEvidenceBundle(verifier);
    assertProductionFailure(runProductionCli(verifier, missing, { pin: null }), verifier, missing);
    const wrong = productionEvidenceBundle(verifier);
    assertProductionFailure(runProductionCli(verifier, wrong, { pin: "f".repeat(64) }), verifier, wrong);
  });

  await testContext.test("rejects threshold-inconsistent defer and an unimplemented admin Goal", () => {
    const inconsistent = productionEvidenceBundle(verifier, {
      metrics: profileMetrics({ monthly_changes: 2 }),
    });
    assertProductionFailure(runProductionCli(verifier, inconsistent), verifier, inconsistent);
    const missingGoal = productionEvidenceBundle(verifier, {
      metrics: profileMetrics({ monthly_changes: 2 }),
      decisionChoice: "create_admin_goal",
      adminGoalReference: {
        path: "workbook/matter-profile-media-admin-goal-missing.md",
        sha256: "7".repeat(64),
        bytes: 128,
      },
    });
    assertProductionFailure(runProductionCli(verifier, missingGoal), verifier, missingGoal);
  });

  await testContext.test("rejects an unsealed executing source", () => {
    const fixture = productionEvidenceBundle(verifier);
    const dirtyPath = join(verifier.repoRoot, "untracked-production-source.txt");
    writeFileSync(dirtyPath, "dirty\n", { mode: 0o600 });
    try {
      assertProductionFailure(runProductionCli(verifier, fixture), verifier, fixture);
    } finally {
      unlinkSync(dirtyPath);
    }
    assert.equal(git(verifier.repoRoot, ["status", "--porcelain=v1", "--untracked-files=all"]), "");
  });
});
