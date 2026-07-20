import assert from "node:assert/strict";
import test from "node:test";
import {
  assertPrivateStagingBucket,
  assertPrivateStagingBudget,
  assertPrivateStagingChangeSet,
  assertPrivateStagingCut005Result,
  assertPrivateStagingCut006Result,
  assertPrivateStagingLambdaConfiguration,
  assertPrivateStagingRds,
  assertPrivateStagingSesReadiness,
  buildPrivateStagingAdminEvent,
  buildPrivateStagingExecutionReceipt,
  buildPrivateStagingStackParameters,
  validatePrivateStagingExecutionInputs,
} from "../lib/private-staging-aws-execution.mjs";

const packet = {
  source_sha: "a".repeat(40), source_tree: "b".repeat(40), artifact_sha256: "c".repeat(64),
  artifact_s3_key: `lawos-private-staging/${"a".repeat(40)}/${"c".repeat(64)}.zip`, packet_sha256: "d".repeat(64),
};
const inputs = {
  schema_version: "law-firm-os.private-staging.execution-inputs.v1",
  data_scope: "synthetic-only",
  real_data_allowed: false,
  password_reset_ses_identity_arn: "arn:aws:ses:ap-northeast-2:770880870480:identity/example.invalid",
  password_reset_from_email: "lawos-staging@example.invalid",
  owner: "law-firm-os-owner",
  review_date: "2026-07-27",
  expiration_date: "2026-08-31",
};
const ownerAuthorization = Object.freeze({
  registry_json: "{\"schema_version\":\"test\"}\n",
  receipt_json: "{\"schema_version\":\"test\"}\n",
  signature_base64: Buffer.alloc(64, 7).toString("base64"),
});

test("execution inputs and stack parameters stay exact-head and synthetic-only", () => {
  assert.equal(validatePrivateStagingExecutionInputs(inputs).owner, "law-firm-os-owner");
  const values = Object.fromEntries(buildPrivateStagingStackParameters({
    packet, artifactBucket: "lawos-private-staging-artifacts-770880870480-ap-northeast-2",
    artifactVersionId: "3LgP4ZVjZ8.example-version",
    approvalId: "LAWOS-PRIVATE-STAGING-EXACT-HEAD-APPROVAL-20260720", inputs, eniBootstrap: true,
    ownerTrustRegistrySha256: "e".repeat(64),
    runtimeGeneration: "initial-aaaaaaaaaaaa",
  }).map(({ key, value }) => [key, value]));
  assert.equal(values.EnableLambdaEniBootstrap, "true");
  assert.equal(values.SourceSha, packet.source_sha);
  assert.equal(values.ArtifactVersion, "3LgP4ZVjZ8.example-version");
  assert.equal(values.OwnerInstructionSha256, packet.packet_sha256);
  assert.equal(values.OwnerTrustRegistrySha256, "e".repeat(64));
  assert.equal(values.PasswordResetBaseUrl, undefined);
});

test("change-set review rejects protected resources, removals, and replacements", () => {
  const valid = { Status: "CREATE_COMPLETE", Changes: [{ ResourceChange: { Action: "Add", LogicalResourceId: "Vpc", ResourceType: "AWS::EC2::VPC", Replacement: "False" } }] };
  assert.equal(assertPrivateStagingChangeSet(valid).change_count, 1);
  const protectedChange = structuredClone(valid);
  protectedChange.Changes[0].ResourceChange.PhysicalResourceId = "amic-vault-staging-postgres";
  assert.throws(() => assertPrivateStagingChangeSet(protectedChange), /protected/u);
  const replacement = structuredClone(valid);
  replacement.Changes[0].ResourceChange.Action = "Modify";
  replacement.Changes[0].ResourceChange.Replacement = "True";
  assert.throws(() => assertPrivateStagingChangeSet(replacement, { mode: "update", allowedModifiedLogicalIds: ["Vpc"] }), /replacement/u);
});

test("deployed Lambda, RDS, and DMS bucket contracts fail closed", () => {
  const lambda = {
    FunctionName: "lawos-private-staging-api", State: "Active", LastUpdateStatus: "Successful",
    CodeSha256: Buffer.from(packet.artifact_sha256, "hex").toString("base64"),
    Role: "arn:aws:iam::770880870480:role/lawos-private-staging-api-role", Runtime: "nodejs22.x", Architectures: ["arm64"],
    VpcConfig: { VpcId: "vpc-1", SubnetIds: ["subnet-a", "subnet-b"], SecurityGroupIds: ["sg-1"] },
    Environment: { Variables: { LAWOS_RUNTIME_PROFILE: "operational", LAWOS_PERSISTENCE_AUTHORITY: "postgres-v2", LAWOS_STAFF_AUTHORITY: "internal-password", LAWOS_DATA_SCOPE: "synthetic-only", LAWOS_DEPLOYMENT_COMMIT: packet.source_sha, LAWOS_DEPLOYMENT_TREE: packet.source_tree, LAWOS_DEPLOYMENT_ARTIFACT_SHA256: packet.artifact_sha256 } },
  };
  assert.equal(assertPrivateStagingLambdaConfiguration(lambda, { functionName: lambda.FunctionName, sourceSha: packet.source_sha, sourceTree: packet.source_tree, artifactSha256: packet.artifact_sha256, instructionSha256: packet.packet_sha256 }).legacy_environment_key_count, 0);
  const wrongCode = structuredClone(lambda);
  wrongCode.CodeSha256 = Buffer.from("f".repeat(64), "hex").toString("base64");
  assert.throws(() => assertPrivateStagingLambdaConfiguration(wrongCode, { functionName: wrongCode.FunctionName, sourceSha: packet.source_sha, sourceTree: packet.source_tree, artifactSha256: packet.artifact_sha256 }), /code digest/u);
  const drift = structuredClone(lambda);
  drift.Environment.Variables.LAWOS_MATTER_STORE_PATH = "/tmp/matter.json";
  assert.throws(() => assertPrivateStagingLambdaConfiguration(drift, { functionName: drift.FunctionName, sourceSha: packet.source_sha, sourceTree: packet.source_tree, artifactSha256: packet.artifact_sha256 }), /legacy/u);
  const admin = structuredClone(lambda);
  admin.FunctionName = "lawos-private-staging-admin";
  admin.Role = "arn:aws:iam::770880870480:role/lawos-private-staging-admin-role";
  Object.assign(admin.Environment.Variables, {
    LAWOS_OWNER_INSTRUCTION_SHA256: packet.packet_sha256,
    LAWOS_OWNER_TRUST_REGISTRY_SHA256: "e".repeat(64),
    LAWOS_APPROVAL_AUDIT_BUCKET: "lawos-private-staging-dms-test",
    LAWOS_STAGING_KMS_KEY_ARN: "arn:aws:kms:ap-northeast-2:770880870480:key/test",
  });
  assert.equal(assertPrivateStagingLambdaConfiguration(admin, { functionName: admin.FunctionName, sourceSha: packet.source_sha, sourceTree: packet.source_tree, artifactSha256: packet.artifact_sha256, instructionSha256: packet.packet_sha256, ownerTrustRegistrySha256: "e".repeat(64) }).active_successful_count, 1);
  admin.Environment.Variables.LAWOS_OWNER_TRUST_REGISTRY_SHA256 = "f".repeat(64);
  assert.throws(() => assertPrivateStagingLambdaConfiguration(admin, { functionName: admin.FunctionName, sourceSha: packet.source_sha, sourceTree: packet.source_tree, artifactSha256: packet.artifact_sha256, instructionSha256: packet.packet_sha256, ownerTrustRegistrySha256: "e".repeat(64) }), /trust registry/u);
  assert.equal(assertPrivateStagingRds({ DBInstanceIdentifier: "lawos-private-staging-postgres", PubliclyAccessible: false, StorageEncrypted: true, DeletionProtection: true, BackupRetentionPeriod: 7, DBInstanceStatus: "available", Endpoint: { Address: "private", Port: 5432 } }).public_rds_count, 0);
  assert.equal(assertPrivateStagingBucket({ versioning: { Status: "Enabled" }, publicAccess: { PublicAccessBlockConfiguration: { BlockPublicAcls: true, IgnorePublicAcls: true, BlockPublicPolicy: true, RestrictPublicBuckets: true } }, encryption: { ServerSideEncryptionConfiguration: [{ ApplyServerSideEncryptionByDefault: { SSEAlgorithm: "aws:kms" } }] }, objectLock: { ObjectLockEnabled: "Enabled" } }).public_bucket_count, 0);
});

test("SES and budget readiness fail closed before synthetic contact or cost claims", () => {
  const verified = { VerifiedForSendingStatus: true, VerificationStatus: "SUCCESS" };
  assert.deepEqual(assertPrivateStagingSesReadiness({
    account: { ProductionAccessEnabled: false },
    senderIdentity: verified,
    recipientIdentities: [verified, verified, verified],
  }), {
    ses_production_access_count: 0,
    verified_sender_identity_count: 1,
    verified_sandbox_recipient_count: 3,
  });
  assert.throws(() => assertPrivateStagingSesReadiness({
    account: { ProductionAccessEnabled: false },
    senderIdentity: verified,
    recipientIdentities: [verified, { VerifiedForSendingStatus: false, VerificationStatus: "PENDING" }],
  }), /sandbox/u);
  assert.equal(assertPrivateStagingBudget({
    BudgetName: "lawos-private-staging-monthly",
    BudgetType: "COST",
    TimeUnit: "MONTHLY",
    BudgetLimit: { Amount: "100", Unit: "USD" },
    CostFilters: { TagKeyValue: ["user:environment$lawos-staging"] },
    CalculatedSpend: { ActualSpend: { Amount: "1.25", Unit: "USD" }, ForecastedSpend: { Amount: "9.5", Unit: "USD" } },
  }).monthly_budget_usd, 100);
  assert.throws(() => assertPrivateStagingBudget({
    BudgetName: "lawos-private-staging-monthly",
    BudgetType: "COST",
    TimeUnit: "MONTHLY",
    BudgetLimit: { Amount: "101", Unit: "USD" },
    CostFilters: { TagKeyValue: ["user:environment$lawos-staging"] },
  }), /USD 100/u);
  assert.throws(() => assertPrivateStagingBudget({
    BudgetName: "lawos-private-staging-monthly",
    BudgetType: "COST",
    TimeUnit: "MONTHLY",
    BudgetLimit: { Amount: "100", Unit: "USD" },
    CostFilters: { TagKeyValue: ["user:environment$lawos-staging"] },
    CalculatedSpend: { ActualSpend: { Amount: "1", Unit: "USD" }, ForecastedSpend: { Amount: "101", Unit: "USD" } },
  }), /forecast/u);
});

test("admin events and CUT-005/CUT-006 results require exact bindings and zero counters", () => {
  const approvalId = "LAWOS-PRIVATE-STAGING-EXACT-HEAD-APPROVAL-20260720";
  const event = buildPrivateStagingAdminEvent({ action: "lawos-private-staging-cut-006", packet, approvalId, syntheticManifestSha256: "e".repeat(64), ownerAuthorization, extra: { api_cold_start_observed: true } });
  assert.equal(event.source_sha, packet.source_sha);
  assert.equal(event.owner_authorization.signature_base64, ownerAuthorization.signature_base64);
  assert.throws(() => buildPrivateStagingAdminEvent({ action: "lawos-private-staging-cut-006", packet, approvalId, syntheticManifestSha256: "e".repeat(64), ownerAuthorization, extra: { source_sha: "f".repeat(40) } }), /override/u);
  const common = { outcome: "PASS", source_sha: packet.source_sha, source_tree: packet.source_tree, artifact_sha256: packet.artifact_sha256, owner_instruction_sha256: packet.packet_sha256, approval_id: approvalId, secret_material_returned: false, production_ready_claim: false, real_data_count: 0 };
  const cut005 = { ...common, action: "lawos-private-staging-cut-005", source_record_count: 20, accepted_record_count: 13, rejected_row_count: 7, unexpected_rejection_count: 0, shadow_difference_count: 0, tenant_negative_visible_count: 0, json_fallback_count: 0, json_writer_count: 0, dual_write_count: 0, transactional_rollback: { residual_item_count: 0 }, resume_equivalence: { resume_equal: true, immediate_replay_noop: true } };
  assert.equal(assertPrivateStagingCut005Result(cut005, { action: cut005.action, packet, approvalId }).outcome, "PASS");
  const cut006 = { ...common, action: "lawos-private-staging-cut-006", configuration: { cold_start_observed: true }, postgres_write_target_count: 14, postgres_readback_equal_count: 14, json_fallback_count: 0, json_writer_count: 0, dual_write_count: 0, file_current_authority_count: 0, offline_mutation_count: 0, memory_fallback_count: 0, artifact_runtime_store_entry_count: 0, artifact_real_json_store_count: 0, file_adapter_sentinel_invocation_count: 0, tenant_negative_visible_count: 0 };
  assert.equal(assertPrivateStagingCut006Result(cut006, { action: cut006.action, packet, approvalId }).outcome, "PASS");
  cut006.dual_write_count = 1;
  assert.throws(() => assertPrivateStagingCut006Result(cut006, { action: cut006.action, packet, approvalId }), /dual_write_count/u);
});

test("execution receipt builder populates every strict W11 field", () => {
  const value = buildPrivateStagingExecutionReceipt({
    kind: "cut-006", keyId: "lawos-owner-ed25519-20260717", approvalId: "LAWOS-PRIVATE-STAGING-EXACT-HEAD-APPROVAL-20260720", packet,
    startedAt: "2026-07-20T00:00:00.000Z", finishedAt: "2026-07-20T00:01:00.000Z", command: "node scripts/run-private-staging-exact-head-execution.mjs --phase cut006 --private-inputs redacted", profile: "matter-staging-admin",
    safeCounts: { zero_counter_count: 6, real_data_count: 0 }, digests: { cut_result_sha256: "e".repeat(64) }, claims: { cut_006_executed: true },
  });
  assert.equal(value.execution_state, "PASS");
  assert.equal(value.safe_counts.zero_counter_count, 6);
});
