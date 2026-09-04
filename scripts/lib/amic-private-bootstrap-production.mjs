import { createHash } from "node:crypto";
import {
  validateAmicPrivateBootstrapExecutionPacket,
  validateAmicPrivateBootstrapProductionTarget,
} from "./amic-private-bootstrap-execution.mjs";

const AWS_ROLE = /^[A-Za-z0-9+=,.@_-]{1,64}$/u;
const SAFE_REF = /^[A-Za-z0-9_.:-]{1,160}$/u;
const SHA1 = /^[a-f0-9]{40}$/u;
const SHA256 = /^[a-f0-9]{64}$/u;
const SECRET_ARN = /^arn:aws:secretsmanager:([a-z0-9-]+):(\d{12}):secret:[A-Za-z0-9_+=.@/-]{1,512}$/u;
const INPUT_KEYS = Object.freeze([
  "schema_version",
  "packet_id",
  "environment",
  "negative_tenant_id",
  "production_target",
]);
export const AMIC_PRIVATE_BOOTSTRAP_PACKET_INPUT_VERSION =
  "law-firm-os.amic-private-bootstrap-packet-input.v1";

function fail(code, message) {
  throw Object.assign(new Error(message), { code });
}

function sha256(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}

function closedObject(value, keys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail("AMIC_PRIVATE_BOOTSTRAP_INPUT", `${label} must be an object`);
  }
  const extras = Object.keys(value).filter((key) => !keys.includes(key));
  if (extras.length > 0 || Object.keys(value).length !== keys.length) {
    fail("AMIC_PRIVATE_BOOTSTRAP_INPUT", `${label} fields are not exact`);
  }
}

function requiredRef(value, label) {
  const ref = String(value ?? "").trim();
  if (!SAFE_REF.test(ref)) {
    fail("AMIC_PRIVATE_BOOTSTRAP_INPUT", `${label} is invalid`);
  }
  return ref;
}

export function createAmicPrivateBootstrapPhotoStorageAdapterId(target) {
  const production = validateAmicPrivateBootstrapProductionTarget(target);
  return `amic-private-bootstrap-s3-${sha256(JSON.stringify(production)).slice(0, 32)}`;
}

export function validateAmicPrivateBootstrapPacketInput(value = {}) {
  closedObject(value, INPUT_KEYS, "private bootstrap packet input");
  if (value.schema_version !== AMIC_PRIVATE_BOOTSTRAP_PACKET_INPUT_VERSION
      || !new Set(["lawos-private-rehearsal", "lawos-production"])
        .has(value.environment)) {
    fail("AMIC_PRIVATE_BOOTSTRAP_INPUT", "packet input scope is invalid");
  }
  return Object.freeze({
    schema_version: AMIC_PRIVATE_BOOTSTRAP_PACKET_INPUT_VERSION,
    packet_id: requiredRef(value.packet_id, "packet_id"),
    environment: value.environment,
    negative_tenant_id: requiredRef(
      value.negative_tenant_id,
      "negative_tenant_id",
    ),
    production_target: validateAmicPrivateBootstrapProductionTarget(
      value.production_target,
    ),
  });
}

export function validateAmicPrivateBootstrapPacketInputBinding({
  packet,
  input,
} = {}) {
  validateAmicPrivateBootstrapExecutionPacket(packet);
  const normalized = validateAmicPrivateBootstrapPacketInput(input);
  const adapterId = createAmicPrivateBootstrapPhotoStorageAdapterId(
    normalized.production_target,
  );
  if (packet.packet_id !== normalized.packet_id
      || packet.environment !== normalized.environment
      || packet.target.photo_storage_provider !== "s3"
      || packet.target.negative_tenant_ref_sha256
        !== sha256(normalized.negative_tenant_id)
      || packet.target.photo_storage_adapter_ref_sha256 !== sha256(adapterId)
      || JSON.stringify(packet.target.production)
        !== JSON.stringify(normalized.production_target)) {
    fail(
      "AMIC_PRIVATE_BOOTSTRAP_INPUT_BINDING",
      "private bootstrap packet input drifted after approval",
    );
  }
  return Object.freeze({
    input: normalized,
    photo_storage_adapter_id: adapterId,
    packet_sha256: packet.packet_sha256,
    valid: true,
  });
}

export function validateAmicPrivateBootstrapGitState({
  status,
  sourceSha,
  sourceTree,
  originMain,
  environment,
  packet = null,
} = {}) {
  if (status !== ""
      || !SHA1.test(String(sourceSha ?? ""))
      || !SHA1.test(String(sourceTree ?? ""))
      || !new Set(["lawos-private-rehearsal", "lawos-production"])
        .has(environment)
      || (environment === "lawos-production" && originMain !== sourceSha)
      || (packet != null && (
        packet.source_sha !== sourceSha
        || packet.source_tree !== sourceTree
        || packet.environment !== environment
      ))) {
    fail(
      "AMIC_PRIVATE_BOOTSTRAP_GIT_STATE",
      "private bootstrap requires a clean exact-head source state",
    );
  }
  return Object.freeze({
    source_sha: sourceSha,
    source_tree: sourceTree,
    exact_origin_main: environment === "lawos-production",
    clean: true,
  });
}

export function verifyAmicPrivateBootstrapAwsCaller({
  identity,
  target,
  expectedRole = "matter-cutover-operator",
} = {}) {
  const production = validateAmicPrivateBootstrapProductionTarget(target);
  const role = String(expectedRole ?? "");
  const account = String(identity?.Account ?? "");
  const arn = String(identity?.Arn ?? "");
  if (!AWS_ROLE.test(role)
      || account !== production.aws_account
      || !new RegExp(
        `^arn:aws:sts::${production.aws_account}:assumed-role/${role.replaceAll(/[.*+?^${}()|[\]\\]/gu, "\\$&")}/[^/]+$`,
        "u",
      ).test(arn)) {
    fail(
      "AMIC_PRIVATE_BOOTSTRAP_AWS_CALLER",
      "AWS caller does not match the signed account and operator role",
    );
  }
  return Object.freeze({
    account,
    role,
    caller_arn_sha256: sha256(arn),
    verified: true,
    raw_arn_returned: false,
  });
}

export function validateAmicPrivateBootstrapS3Controls({
  target,
  location,
  versioning,
  publicAccessBlock,
  encryption,
  ownership,
  kms,
} = {}) {
  const production = validateAmicPrivateBootstrapProductionTarget(target);
  const publicAccess = publicAccessBlock?.PublicAccessBlockConfiguration;
  const encryptionRules = encryption?.ServerSideEncryptionConfiguration?.Rules;
  const encryptionRule = Array.isArray(encryptionRules)
    && encryptionRules.length === 1
    ? encryptionRules[0]
    : null;
  const encryptionDefault = encryptionRule?.ApplyServerSideEncryptionByDefault;
  const ownershipRules = ownership?.OwnershipControls?.Rules;
  const key = kms?.KeyMetadata;
  if (location?.LocationConstraint !== production.aws_region
      || versioning?.Status !== "Enabled"
      || publicAccess?.BlockPublicAcls !== true
      || publicAccess?.IgnorePublicAcls !== true
      || publicAccess?.BlockPublicPolicy !== true
      || publicAccess?.RestrictPublicBuckets !== true
      || !encryptionRule
      || encryptionDefault?.SSEAlgorithm !== "aws:kms"
      || encryptionDefault?.KMSMasterKeyID !== production.photo_kms_key_arn
      || encryptionRule.BucketKeyEnabled !== true
      || !Array.isArray(ownershipRules)
      || ownershipRules.length !== 1
      || ownershipRules[0]?.ObjectOwnership !== "BucketOwnerEnforced"
      || key?.Arn !== production.photo_kms_key_arn
      || key?.AWSAccountId !== production.aws_account
      || key?.Enabled !== true
      || key?.KeyState !== "Enabled"
      || key?.KeyUsage !== "ENCRYPT_DECRYPT"
      || key?.Origin !== "AWS_KMS"
      || key?.KeyManager !== "CUSTOMER") {
    fail(
      "AMIC_PRIVATE_BOOTSTRAP_S3_CONTROLS",
      "S3 or KMS controls do not match the signed production target",
    );
  }
  return Object.freeze({
    bucket_ref_sha256: sha256(production.photo_bucket_name),
    kms_key_ref_sha256: sha256(production.photo_kms_key_arn),
    region: production.aws_region,
    versioning_enabled: true,
    public_access_blocked: true,
    bucket_owner_enforced: true,
    default_encryption: "aws:kms",
    bucket_key_enabled: true,
    kms_key_enabled: true,
    verified: true,
    raw_bucket_returned: false,
    raw_kms_key_returned: false,
  });
}

export function discoverAmicPrivateBootstrapProductionTarget({
  stack,
  resources,
  databaseSecret,
  tenantContextSecret,
  kms,
  expectedAccount,
  expectedRegion,
  expectedStack,
} = {}) {
  const stackArn = new RegExp(
    `^arn:aws:cloudformation:${expectedRegion}:${expectedAccount}:stack/${expectedStack}/[A-Za-z0-9-]+$`,
    "u",
  );
  if (stack?.StackName !== expectedStack
      || !stackArn.test(stack?.StackId ?? "")
      || !/^(?:CREATE|UPDATE)_COMPLETE$/u.test(stack?.StackStatus ?? "")
      || !Array.isArray(resources)) {
    fail(
      "AMIC_PRIVATE_BOOTSTRAP_AWS_STACK",
      "production stack identity or state is invalid",
    );
  }
  const resource = (logicalId, resourceType) => {
    const matches = resources.filter((row) =>
      row?.LogicalResourceId === logicalId);
    const row = matches.length === 1 ? matches[0] : null;
    if (!row
        || row.ResourceType !== resourceType
        || !/^(?:CREATE|UPDATE)_COMPLETE$/u.test(row.ResourceStatus ?? "")
        || typeof row.PhysicalResourceId !== "string"
        || !row.PhysicalResourceId) {
      fail(
        "AMIC_PRIVATE_BOOTSTRAP_AWS_STACK_RESOURCE",
        "production stack resource binding is invalid",
      );
    }
    return row.PhysicalResourceId;
  };
  const databasePhysical = resource(
    "ApplicationDatabaseSecret",
    "AWS::SecretsManager::Secret",
  );
  const tenantContextPhysical = resource(
    "TenantContextSecret",
    "AWS::SecretsManager::Secret",
  );
  const bucketPhysical = resource("DmsBucket", "AWS::S3::Bucket");
  const kmsPhysical = resource("ProductionKey", "AWS::KMS::Key");
  const exactSecretArn = (description, physicalId) => {
    const arn = String(description?.ARN ?? "");
    const match = SECRET_ARN.exec(arn);
    if (!match
        || match[1] !== expectedRegion
        || match[2] !== expectedAccount
        || description.DeletedDate != null
        || !new Set([arn, description?.Name]).has(physicalId)) {
      fail(
        "AMIC_PRIVATE_BOOTSTRAP_AWS_SECRET",
        "production secret reference is invalid",
      );
    }
    return arn;
  };
  const key = kms?.KeyMetadata;
  if (key?.AWSAccountId !== expectedAccount
      || key?.Arn !== stack.Outputs?.find((row) =>
        row.OutputKey === "ProgramInputKmsKeyArn")?.OutputValue
      || !new Set([key?.Arn, key?.KeyId]).has(kmsPhysical)) {
    fail(
      "AMIC_PRIVATE_BOOTSTRAP_AWS_KMS",
      "production KMS stack binding is invalid",
    );
  }
  const parameters = Object.fromEntries((stack.Parameters ?? []).map((row) =>
    [row.ParameterKey, row.ParameterValue]));
  const outputs = Object.fromEntries((stack.Outputs ?? []).map((row) =>
    [row.OutputKey, row.OutputValue]));
  if (parameters.DmsBucketName !== bucketPhysical
      || outputs.DmsBucketName !== bucketPhysical
      || outputs.ExternalReadProvidersEnabled !== "false"
      || !SHA1.test(parameters.SourceSha ?? "")
      || !SHA1.test(parameters.SourceTree ?? "")
      || !SHA256.test(parameters.ExecutionPacketSha256 ?? "")) {
    fail(
      "AMIC_PRIVATE_BOOTSTRAP_AWS_STACK_BINDING",
      "production stack parameter or output binding is invalid",
    );
  }
  return validateAmicPrivateBootstrapProductionTarget({
    aws_account: expectedAccount,
    aws_region: expectedRegion,
    database_secret_ref: exactSecretArn(databaseSecret, databasePhysical),
    tenant_context_secret_ref: exactSecretArn(
      tenantContextSecret,
      tenantContextPhysical,
    ),
    photo_bucket_name: bucketPhysical,
    photo_expected_bucket_owner: expectedAccount,
    photo_kms_key_arn: key.Arn,
    photo_prefix: "approved-real-migration/member-photos",
    bucket_versioning_required: true,
    bucket_owner_enforced: true,
    public_access_block_required: true,
    server_side_encryption: "aws:kms",
  });
}
