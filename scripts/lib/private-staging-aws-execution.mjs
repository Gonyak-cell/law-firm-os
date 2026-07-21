import { createHash } from "node:crypto";
import { PRIVATE_STAGING_ACCOUNT_ID, PRIVATE_STAGING_REGION } from "./private-staging-contract.mjs";
import { PRIVATE_STAGING_EXECUTION_RECEIPT_SCHEMA, validatePrivateStagingExecutionReceipt } from "./private-staging-execution-receipt.mjs";

const SHA1 = /^[0-9a-f]{40}$/u;
const SHA256 = /^[0-9a-f]{64}$/u;
const LEGACY_ENV = /(?:JSON|STORE_PATH|FILE_CURRENT|DUAL_WRITE)/u;
const PROTECTED_MARKER = /(?:amic-vault-staging|matter-lawos-api-staging|matter-lawos-api-prod|matter-prod-deploy-admin|matter-cutover-operator)/iu;

function fail(message) {
  const error = new Error(message);
  error.code = "PRIVATE_STAGING_AWS_EXECUTION_INVALID";
  throw error;
}

function requiredText(value, name, pattern = null) {
  const text = String(value ?? "").trim();
  if (!text || (pattern && !pattern.test(text))) fail(`${name} is invalid`);
  return text;
}

function requiredExactText(value, name) {
  if (typeof value !== "string" || !value.trim()) fail(`${name} is invalid`);
  return value;
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function sha256AwsEvidence(value) {
  return createHash("sha256").update(typeof value === "string" || Buffer.isBuffer(value) ? value : JSON.stringify(value)).digest("hex");
}

export function assertPrivateStagingCallerIdentity(identity) {
  const approvedArn = new RegExp(`^arn:aws:sts::${PRIVATE_STAGING_ACCOUNT_ID}:assumed-role/matter-staging-admin/[A-Za-z0-9_+=,.@-]{2,64}$`, "u");
  if (!isRecord(identity) || identity.Account !== PRIVATE_STAGING_ACCOUNT_ID || !approvedArn.test(identity.Arn ?? "") || PROTECTED_MARKER.test(identity.Arn ?? "")) {
    fail("AWS caller identity is outside the approved staging role/account boundary");
  }
  return Object.freeze({ account_id: PRIVATE_STAGING_ACCOUNT_ID, role_name: "matter-staging-admin", protected_role_count: 0 });
}

export function validatePrivateStagingExecutionInputs(input) {
  if (!isRecord(input) || input.schema_version !== "law-firm-os.private-staging.execution-inputs.v1") fail("execution input schema is invalid");
  const allowed = ["schema_version", "data_scope", "real_data_allowed", "password_reset_ses_identity_arn", "password_reset_from_email", "owner", "review_date", "expiration_date"];
  const extras = Object.keys(input).filter((key) => !allowed.includes(key));
  if (extras.length) fail(`execution inputs contain unsupported fields: ${extras.join(", ")}`);
  if (input.data_scope !== "synthetic-only" || input.real_data_allowed !== false) fail("execution inputs must remain synthetic-only");
  const sesArn = requiredText(input.password_reset_ses_identity_arn, "password_reset_ses_identity_arn", /^arn:[a-z0-9-]+:ses:ap-northeast-2:770880870480:identity\/.+$/u);
  const fromEmail = requiredText(input.password_reset_from_email, "password_reset_from_email", /^[^@\s]+@[^@\s]+\.[^@\s]+$/u).toLowerCase();
  const identity = sesArn.slice(sesArn.indexOf("identity/") + "identity/".length).toLowerCase();
  if (!(fromEmail === identity || fromEmail.endsWith(`@${identity}`))) fail("password reset sender is outside the approved SES identity");
  const owner = requiredText(input.owner ?? "law-firm-os-owner", "owner", /^[A-Za-z0-9._@-]{3,64}$/u);
  const reviewDate = requiredText(input.review_date ?? "2026-07-27", "review_date", /^2026-[0-9]{2}-[0-9]{2}$/u);
  const expirationDate = requiredText(input.expiration_date ?? "2026-08-31", "expiration_date", /^2026-[0-9]{2}-[0-9]{2}$/u);
  return Object.freeze({
    schema_version: "law-firm-os.private-staging.execution-inputs.v1",
    data_scope: "synthetic-only",
    real_data_allowed: false,
    password_reset_ses_identity_arn: sesArn,
    password_reset_from_email: fromEmail,
    owner,
    review_date: reviewDate,
    expiration_date: expirationDate,
  });
}

export function buildPrivateStagingStackParameters({ packet, artifactBucket, artifactVersionId, approvalId, ownerTrustRegistrySha256, inputs, eniBootstrap, runtimeGeneration } = {}) {
  if (!isRecord(packet) || !SHA1.test(packet.source_sha ?? "") || !SHA1.test(packet.source_tree ?? "") || !SHA256.test(packet.artifact_sha256 ?? "")) fail("exact-head packet binding is invalid");
  const normalizedInputs = validatePrivateStagingExecutionInputs(inputs);
  const bucket = requiredText(artifactBucket, "artifactBucket", /^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/u);
  const version = requiredText(artifactVersionId, "artifactVersionId", /^[A-Za-z0-9._~+/=-]{1,1024}$/u);
  if (version === "null") fail("artifactVersionId is invalid");
  const approved = requiredText(approvalId, "approvalId", /^[A-Za-z0-9._:@/+=-]{16,256}$/u);
  const instructionSha = requiredText(packet.packet_sha256, "packet.packet_sha256", SHA256);
  const registrySha = requiredText(ownerTrustRegistrySha256, "ownerTrustRegistrySha256", SHA256);
  const generation = requiredText(runtimeGeneration, "runtimeGeneration", /^[a-z0-9-]{8,64}$/u);
  const values = {
    ArtifactBucket: bucket,
    ArtifactKey: packet.artifact_s3_key,
    ArtifactVersion: version,
    SourceSha: packet.source_sha,
    SourceTree: packet.source_tree,
    ArtifactSha256: packet.artifact_sha256,
    OwnerInstructionSha256: instructionSha,
    OwnerTrustRegistrySha256: registrySha,
    BootstrapApprovalId: approved,
    Cut005ApprovalId: approved,
    Cut006ApprovalId: approved,
    Cut007ApprovalId: approved,
    Owner: normalizedInputs.owner,
    ReviewDate: normalizedInputs.review_date,
    ExpirationDate: normalizedInputs.expiration_date,
    AllowedOrigins: "https://lawos-private-staging.invalid",
    PasswordResetSesIdentityArn: normalizedInputs.password_reset_ses_identity_arn,
    PasswordResetFromEmail: normalizedInputs.password_reset_from_email,
    EnableLambdaEniBootstrap: eniBootstrap === true ? "true" : "false",
    RuntimeGeneration: generation,
  };
  return Object.freeze(Object.entries(values).map(([key, value]) => Object.freeze({ key, value })));
}

export function assertPrivateStagingChangeSet(changeSet, {
  mode = "create",
  allowedModifiedLogicalIds = [],
  allowedRemovedLogicalIds = [],
  allowedConditionalReplacementLogicalIds = [],
} = {}) {
  if (!isRecord(changeSet) || changeSet.Status !== "CREATE_COMPLETE" || !Array.isArray(changeSet.Changes)) fail("CloudFormation change set is not ready");
  const allowed = new Set(allowedModifiedLogicalIds);
  const allowedRemoved = new Set(allowedRemovedLogicalIds);
  const allowedConditional = new Set(allowedConditionalReplacementLogicalIds);
  for (const change of changeSet.Changes) {
    const resource = change?.ResourceChange;
    const logicalId = requiredText(resource?.LogicalResourceId, "change-set logical id", /^[A-Za-z0-9]+$/u);
    const serialized = JSON.stringify(resource);
    if (PROTECTED_MARKER.test(serialized)) fail("CloudFormation change set references a protected AMIC or production resource");
    if (resource.Action === "Remove" && !allowedRemoved.has(logicalId)) fail("CloudFormation resource removal is forbidden in the initial/private staging execution");
    if (resource.Replacement === "True") fail(`CloudFormation replacement is forbidden: ${logicalId}`);
    if (resource.Replacement === "Conditional") {
      const details = resource.Details ?? [];
      const exactScheduleDependency = resource.Action === "Modify"
        && resource.ResourceType === "AWS::Lambda::Permission"
        && details.length === 1
        && details[0]?.Target?.Attribute === "Properties"
        && details[0]?.Target?.Name === "SourceArn"
        && details[0]?.Target?.RequiresRecreation === "Always"
        && details[0]?.Evaluation === "Dynamic"
        && details[0]?.ChangeSource === "ResourceAttribute"
        && details[0]?.CausingEntity === "PasswordResetWorkerSchedule.Arn";
      if (!allowedConditional.has(logicalId) || !exactScheduleDependency) fail(`CloudFormation replacement is forbidden: ${logicalId}`);
    }
    if (mode === "create" && resource.Action !== "Add") fail(`initial stack change must only add resources: ${logicalId}`);
    if (mode === "update" && resource.Action === "Modify" && !allowed.has(logicalId)) fail(`unexpected stack update target: ${logicalId}`);
  }
  return Object.freeze({
    change_count: changeSet.Changes.length,
    protected_resource_change_count: 0,
    replacement_count: 0,
    conditional_dependency_recreation_count: changeSet.Changes.filter((change) => change?.ResourceChange?.Replacement === "Conditional").length,
  });
}

export function assertPrivateStagingLambdaConfiguration(configuration, { functionName, sourceSha, sourceTree, artifactSha256, instructionSha256, ownerTrustRegistrySha256 } = {}) {
  if (!isRecord(configuration) || configuration.FunctionName !== functionName) fail("Lambda function identity mismatch");
  if (configuration.State !== "Active" || configuration.LastUpdateStatus !== "Successful") fail("Lambda is not Active/Successful");
  if (!String(configuration.Role ?? "").endsWith(`/${functionName}-role`)) fail("Lambda does not use its dedicated staging role");
  if (configuration.Runtime !== "nodejs22.x" || !configuration.Architectures?.includes("arm64")) fail("Lambda runtime or architecture drifted");
  const expectedCodeSha256 = Buffer.from(requiredText(artifactSha256, "artifactSha256", SHA256), "hex").toString("base64");
  if (configuration.CodeSha256 !== expectedCodeSha256) fail("Lambda code digest differs from the approved artifact");
  if (!(configuration.VpcConfig?.VpcId && (configuration.VpcConfig?.SubnetIds ?? []).length === 2 && (configuration.VpcConfig?.SecurityGroupIds ?? []).length === 1)) fail("Lambda is not attached to the isolated VPC");
  const env = configuration.Environment?.Variables ?? {};
  if (env.LAWOS_RUNTIME_PROFILE !== "operational" || env.LAWOS_PERSISTENCE_AUTHORITY !== "postgres-v2" || env.LAWOS_STAFF_AUTHORITY !== "internal-password" || env.LAWOS_DATA_SCOPE !== "synthetic-only") fail("Lambda runtime authority drifted");
  if (env.LAWOS_DEPLOYMENT_COMMIT !== sourceSha || env.LAWOS_DEPLOYMENT_TREE !== sourceTree || env.LAWOS_DEPLOYMENT_ARTIFACT_SHA256 !== artifactSha256) fail("Lambda exact-head binding drifted");
  if (functionName.endsWith("admin")) {
    if (env.LAWOS_OWNER_INSTRUCTION_SHA256 !== instructionSha256) fail("admin Lambda owner instruction binding drifted");
    if (env.LAWOS_OWNER_TRUST_REGISTRY_SHA256 !== ownerTrustRegistrySha256) fail("admin Lambda owner trust registry binding drifted");
    if (!env.LAWOS_APPROVAL_AUDIT_BUCKET || !env.LAWOS_STAGING_KMS_KEY_ARN) fail("admin Lambda immutable approval audit authority is incomplete");
  }
  if (Object.keys(env).some((key) => LEGACY_ENV.test(key))) fail("Lambda environment re-enabled a legacy persistence path");
  return Object.freeze({ active_successful_count: 1, legacy_environment_key_count: 0, vpc_attached_count: 1 });
}

export function assertPrivateStagingRds(instance) {
  if (!isRecord(instance) || instance.DBInstanceIdentifier !== "lawos-private-staging-postgres") fail("RDS instance identity mismatch");
  if (instance.PubliclyAccessible !== false || instance.StorageEncrypted !== true || instance.DeletionProtection !== true || Number(instance.BackupRetentionPeriod) < 7) fail("RDS private/encryption/protection/PITR contract failed");
  if (instance.DBInstanceStatus !== "available" || !instance.Endpoint?.Address || Number(instance.Endpoint?.Port) !== 5432) fail("RDS is not available");
  return Object.freeze({ private_rds_count: 1, public_rds_count: 0, pitr_enabled_count: 1 });
}

export function assertPrivateStagingBucket({ versioning, publicAccess, encryption, objectLock } = {}) {
  if (versioning?.Status !== "Enabled") fail("DMS bucket versioning is not enabled");
  if (!["BlockPublicAcls", "IgnorePublicAcls", "BlockPublicPolicy", "RestrictPublicBuckets"].every((key) => publicAccess?.PublicAccessBlockConfiguration?.[key] === true)) fail("DMS public access block is incomplete");
  if (!JSON.stringify(encryption).includes("aws:kms")) fail("DMS SSE-KMS is not active");
  if (objectLock?.ObjectLockConfiguration?.ObjectLockEnabled !== "Enabled") fail("DMS Object Lock is not active");
  return Object.freeze({ versioned_bucket_count: 1, public_bucket_count: 0, kms_encrypted_bucket_count: 1, object_lock_bucket_count: 1 });
}

export function assertPrivateStagingSesReadiness({ account, senderIdentity, recipientIdentities = [] } = {}) {
  if (!isRecord(account) || typeof account.ProductionAccessEnabled !== "boolean") fail("SES account readiness is invalid");
  if (!isRecord(senderIdentity) || senderIdentity.VerifiedForSendingStatus !== true || senderIdentity.VerificationStatus !== "SUCCESS") {
    fail("SES sender identity is not verified for sending");
  }
  if (!Array.isArray(recipientIdentities)) fail("SES recipient identity results are invalid");
  if (account.ProductionAccessEnabled === false) {
    if (recipientIdentities.length === 0 || recipientIdentities.some((identity) => !isRecord(identity) || identity.VerifiedForSendingStatus !== true || identity.VerificationStatus !== "SUCCESS")) {
      fail("SES sandbox requires every synthetic recipient identity to be verified");
    }
  }
  return Object.freeze({
    ses_production_access_count: account.ProductionAccessEnabled ? 1 : 0,
    verified_sender_identity_count: 1,
    verified_sandbox_recipient_count: account.ProductionAccessEnabled ? 0 : recipientIdentities.length,
  });
}

export function assertPrivateStagingBudget(budget) {
  if (!isRecord(budget) || budget.BudgetName !== "lawos-private-staging-monthly") fail("private staging budget identity mismatch");
  if (budget.BudgetType !== "COST" || budget.TimeUnit !== "MONTHLY") fail("private staging budget type or cadence drifted");
  const amount = Number(budget.BudgetLimit?.Amount);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 100 || budget.BudgetLimit?.Unit !== "USD") fail("private staging budget limit exceeds USD 100");
  const tagFilters = budget.CostFilters?.TagKeyValue ?? [];
  if (!Array.isArray(tagFilters) || !tagFilters.includes("user:environment$lawos-staging")) fail("private staging budget is not scoped to the LawOS staging tag");
  const actualSpend = Number(budget.CalculatedSpend?.ActualSpend?.Amount ?? 0);
  const forecast = budget.CalculatedSpend?.ForecastedSpend?.Amount == null ? null : Number(budget.CalculatedSpend.ForecastedSpend.Amount);
  if (!Number.isFinite(actualSpend) || actualSpend < 0 || actualSpend > amount) fail("private staging actual spend exceeds its budget");
  if (forecast != null && (!Number.isFinite(forecast) || forecast < 0 || forecast > amount)) fail("private staging forecast exceeds its budget");
  return Object.freeze({
    monthly_budget_usd: amount,
    monthly_budget_count: 1,
    actual_spend_usd: actualSpend,
    forecast_present_count: forecast == null ? 0 : 1,
    forecast_spend_usd: forecast ?? 0,
  });
}

function ownerAuthorizationBundle(value) {
  if (!isRecord(value)) fail("ownerAuthorization must be an object");
  const keys = Object.keys(value).sort();
  if (JSON.stringify(keys) !== JSON.stringify(["receipt_json", "registry_json", "signature_base64"])) fail("ownerAuthorization shape is invalid");
  return Object.freeze({
    registry_json: requiredExactText(value.registry_json, "ownerAuthorization.registry_json"),
    receipt_json: requiredExactText(value.receipt_json, "ownerAuthorization.receipt_json"),
    signature_base64: requiredText(value.signature_base64, "ownerAuthorization.signature_base64", /^[A-Za-z0-9+/]+={0,2}$/u),
  });
}

export function buildPrivateStagingAdminEvent({ action, packet, approvalId, syntheticManifestSha256, ownerAuthorization, extra = {} } = {}) {
  const protectedFields = new Set(["action", "approval_id", "data_scope", "source_sha", "source_tree", "artifact_sha256", "owner_instruction_sha256", "synthetic_manifest_sha256", "owner_authorization"]);
  if (!isRecord(extra) || Object.keys(extra).some((key) => protectedFields.has(key))) fail("admin event extra fields may not override authorization bindings");
  return Object.freeze({
    action: requiredText(action, "admin action", /^lawos-private-staging-[a-z0-9-]+$/u),
    approval_id: requiredText(approvalId, "approvalId"),
    data_scope: "synthetic-only",
    source_sha: requiredText(packet?.source_sha, "source_sha", SHA1),
    source_tree: requiredText(packet?.source_tree, "source_tree", SHA1),
    artifact_sha256: requiredText(packet?.artifact_sha256, "artifact_sha256", SHA256),
    owner_instruction_sha256: requiredText(packet?.packet_sha256, "owner_instruction_sha256", SHA256),
    synthetic_manifest_sha256: requiredText(syntheticManifestSha256, "synthetic_manifest_sha256", SHA256),
    owner_authorization: ownerAuthorizationBundle(ownerAuthorization),
    ...extra,
  });
}

export function assertPrivateStagingAdminResult(result, { action, packet, approvalId } = {}) {
  if (!isRecord(result) || result.outcome !== "PASS" || result.action !== action) fail(`${action} did not PASS`);
  if (result.source_sha !== packet.source_sha || result.source_tree !== packet.source_tree || result.artifact_sha256 !== packet.artifact_sha256 || result.owner_instruction_sha256 !== packet.packet_sha256 || result.approval_id !== approvalId) fail(`${action} exact authority binding drifted`);
  if (result.secret_material_returned !== false || result.production_ready_claim !== false || result.production_contacted === true || result.real_data_count > 0) fail(`${action} crossed a data or production boundary`);
  return result;
}

export function assertPrivateStagingCut005Result(result, expected) {
  assertPrivateStagingAdminResult(result, expected);
  if (result.source_record_count !== result.accepted_record_count + result.rejected_row_count || result.unexpected_rejection_count !== 0 || result.shadow_difference_count !== 0 || result.tenant_negative_visible_count !== 0) fail("CUT-005 count/hash/tenant invariant failed");
  if (result.json_fallback_count !== 0 || result.json_writer_count !== 0 || result.dual_write_count !== 0 || result.transactional_rollback?.residual_item_count !== 0 || result.resume_equivalence?.resume_equal !== true || result.resume_equivalence?.immediate_replay_noop !== true) fail("CUT-005 rollback/replay/legacy-authority invariant failed");
  return result;
}

export function assertPrivateStagingCut006Result(result, expected) {
  assertPrivateStagingAdminResult(result, expected);
  for (const key of ["json_fallback_count", "json_writer_count", "dual_write_count", "file_current_authority_count", "offline_mutation_count", "memory_fallback_count", "artifact_runtime_store_entry_count", "artifact_real_json_store_count", "file_adapter_sentinel_invocation_count", "tenant_negative_visible_count"]) {
    if (result[key] !== 0) fail(`CUT-006 ${key} must equal zero`);
  }
  if (result.configuration?.cold_start_observed !== true || result.postgres_write_target_count !== result.postgres_readback_equal_count) fail("CUT-006 cold-start or PostgreSQL readback invariant failed");
  return result;
}

export function buildPrivateStagingExecutionReceipt({
  kind,
  keyId,
  approvalId,
  packet,
  startedAt,
  finishedAt,
  command,
  profile,
  safeCounts,
  digests,
  claims = {},
} = {}) {
  const receipt = {
    schema_version: PRIVATE_STAGING_EXECUTION_RECEIPT_SCHEMA,
    receipt_id: `lawos-private-staging-${kind}-${packet.source_sha.slice(0, 12)}`,
    receipt_kind: kind,
    key_id: keyId,
    approval_id: approvalId,
    owner_instruction_sha256: packet.packet_sha256,
    execution_state: "PASS",
    started_at: startedAt,
    finished_at: finishedAt,
    command,
    exit_code: 0,
    profile,
    environment: kind === "source-baseline" || kind.includes("local") ? "source-local" : "lawos-staging",
    data_scope: ["source-baseline", "pr-172-adjudication", "source-field-contract", "internal-password-authority", "migration-engine", "local-postgres-validation", "artifact-verification", "exact-head-ci", "security-review", "cost-verification"].includes(kind) ? "none" : "synthetic-only",
    contact_scope: kind === "cut-007" ? "synthetic-mailbox-only" : "none",
    source_sha: packet.source_sha,
    source_tree: packet.source_tree,
    artifact_sha256: packet.artifact_sha256,
    safe_counts: safeCounts,
    digests,
    claims: {
      secret_material_returned: false,
      raw_pii_returned: false,
      production_contacted: false,
      real_data_contacted: false,
      ...claims,
    },
    blockers: [],
  };
  validatePrivateStagingExecutionReceipt(receipt);
  return Object.freeze(receipt);
}
