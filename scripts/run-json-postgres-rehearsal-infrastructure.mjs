#!/usr/bin/env node
import { execFileSync, spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  readFileSync,
} from "node:fs";
import { basename, join } from "node:path";
import {
  validateJsonPostgresExecutionPacket,
  verifyJsonPostgresExecutionApproval,
} from "../packages/persistence/src/postgres/execution-contract.js";
import {
  validateJsonPostgresProductionDeploymentManifest,
} from "./lib/json-postgres-production-artifact.mjs";
import {
  buildVersionedS3TemplateUrl,
  cloudFormationParameterArgs,
  cloudFormationTemplateArgs,
  cloudFormationTemplateRequiresUrl,
  validateCloudFormationChangeSetTemplate,
} from "./lib/cloudformation-template-transport.mjs";
import {
  validateJsonPostgresRehearsalBackupRetentionContract,
} from "./lib/json-postgres-rehearsal-contracts.mjs";
import {
  JSON_POSTGRES_REHEARSAL_ENI_ACTIONS,
  buildJsonPostgresRehearsalStackParameters,
  classifyJsonPostgresRehearsalHostTemplate,
  jsonPostgresRehearsalCombinedTemplateSha256,
  validateJsonPostgresRehearsalArtifactStoreTemplate,
  validateJsonPostgresRehearsalTemplate,
} from "./lib/json-postgres-rehearsal-infrastructure.mjs";
import {
  JSON_POSTGRES_REHEARSAL_ACCOUNT,
  JSON_POSTGRES_REHEARSAL_ARTIFACT_BUCKET,
  JSON_POSTGRES_REHEARSAL_ARTIFACT_PREFIX,
  JSON_POSTGRES_REHEARSAL_ARTIFACT_STACK,
  JSON_POSTGRES_REHEARSAL_FUNCTION,
  JSON_POSTGRES_REHEARSAL_MONTHLY_FORECAST_KRW,
  JSON_POSTGRES_REHEARSAL_PROFILE,
  JSON_POSTGRES_REHEARSAL_PROGRAM_INPUT_BUCKET,
  JSON_POSTGRES_REHEARSAL_REGION,
  JSON_POSTGRES_REHEARSAL_ROLE,
  JSON_POSTGRES_REHEARSAL_STACK,
  assertJsonPostgresRehearsalBucketState,
  assertJsonPostgresRehearsalCaller,
  assertJsonPostgresRehearsalEniAuthority,
  assertJsonPostgresRehearsalLambda,
  assertJsonPostgresRehearsalStack,
  buildJsonPostgresRehearsalArtifactStoreParameters,
  createJsonPostgresImmutableInputLocator,
  isJsonPostgresRehearsalHostStackComplete,
  jsonPostgresRehearsalParametersSha256,
  jsonPostgresRehearsalResultSha256,
  validateJsonPostgresRehearsalChangeSet,
} from "./lib/json-postgres-rehearsal-execution.mjs";
import {
  assertPrivateStagingBudget,
  assertPrivateStagingRds,
} from "./lib/private-staging-aws-execution.mjs";
import {
  validatePrivateStagingCost,
} from "./lib/private-staging-contract.mjs";
import {
  createPrivateProgramOutputDirectory,
  readPrivateProgramBytes,
  readPrivateProgramJson,
  sha256ProgramBytes,
  writePrivateProgramJson,
} from "./lib/json-postgres-program-files.mjs";

const OPERATIONS = new Set(["preflight", "deploy", "bootstrap"]);
const INPUT_VERSION =
  "law-firm-os.json-postgres-rehearsal-infrastructure-input.v1";
const RESULT_VERSION =
  "law-firm-os.json-postgres-rehearsal-infrastructure-result.v1";
const BOOTSTRAP_ACTION = "lawos-json-postgres-rehearsal-bootstrap";
const SHA256 = /^[0-9a-f]{64}$/u;

function option(name, fallback = null) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new TypeError(`${name} is required`);
  }
  return value;
}

function requiredOption(name) {
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

function stableJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function stableSha256(value) {
  return sha256ProgramBytes(stableJson(value));
}

function awsArgs(args, { region = true } = {}) {
  return [
    ...args,
    "--profile", profile,
    ...(region
      ? ["--region", JSON_POSTGRES_REHEARSAL_REGION]
      : []),
    "--no-cli-pager",
    "--output", "json",
  ];
}

function awsJson(args, options = {}) {
  const output = execFileSync("aws", awsArgs(args, options), {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
  return output ? JSON.parse(output) : {};
}

function awsTryJson(args, options = {}) {
  const result = spawnSync("aws", awsArgs(args, options), {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
  if (result.status === 0) {
    return result.stdout.trim() ? JSON.parse(result.stdout) : {};
  }
  if (/(?:does not exist|not found|NoSuch|ResourceNotFound|DBInstanceNotFound|ValidationError)/iu
    .test(result.stderr ?? "")) {
    return null;
  }
  throw new Error(
    `AWS read failed (${sha256ProgramBytes(result.stderr ?? "").slice(0, 16)})`,
  );
}

function awsWait(args) {
  execFileSync("aws", awsArgs(args), {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function parameterMap(stack) {
  return Object.fromEntries(
    (stack?.Parameters ?? []).map(({ ParameterKey, ParameterValue }) => [
      ParameterKey,
      ParameterValue,
    ]),
  );
}

function outputMap(stack) {
  return Object.fromEntries(
    (stack?.Outputs ?? []).map(({ OutputKey, OutputValue }) => [
      OutputKey,
      OutputValue,
    ]),
  );
}

function currentStack(name) {
  return awsTryJson([
    "cloudformation",
    "describe-stacks",
    "--stack-name",
    name,
  ])?.Stacks?.[0] ?? null;
}

function deployedTemplate(name) {
  const response = awsJson([
    "cloudformation",
    "get-template",
    "--stack-name",
    name,
    "--template-stage",
    "Original",
  ]);
  return typeof response.TemplateBody === "string"
    ? JSON.parse(response.TemplateBody)
    : response.TemplateBody;
}

function assertChangeSetTemplate(changeSetId, expectedSha256) {
  return validateCloudFormationChangeSetTemplate({
    response: awsJson([
      "cloudformation",
      "get-template",
      "--change-set-name",
      changeSetId,
      "--template-stage",
      "Original",
    ]),
    expectedSha256,
  });
}

function writeResult(directory, operation, source) {
  const material = {
    schema_version: RESULT_VERSION,
    source_sha: sourceSha,
    source_tree: sourceTree,
    packet_sha256: packet.packet_sha256,
    approval_receipt_sha256: approval.receipt_sha256,
    registry_sha256: approval.registry_sha256,
    generated_at: new Date().toISOString(),
    operation,
    ...source,
    raw_pii_evidence_count: 0,
    secret_material_recorded: false,
  };
  return writePrivateProgramJson(
    join(directory, `${operation}-result.json`),
    {
      ...material,
      result_sha256: jsonPostgresRehearsalResultSha256(material),
    },
  );
}

function validatePriorResult(path, operation) {
  const result = readPrivateProgramJson(path, `${operation} result`);
  if (result?.schema_version !== RESULT_VERSION
    || result.operation !== operation
    || result.outcome !== "PASS"
    || result.source_sha !== sourceSha
    || result.source_tree !== sourceTree
    || result.packet_sha256 !== packet.packet_sha256
    || result.registry_sha256 !== approval.registry_sha256
    || result.approval_receipt_sha256 !== approval.receipt_sha256
    || jsonPostgresRehearsalResultSha256(result)
      !== result.result_sha256) {
    throw new Error(`${operation} result exact binding drifted`);
  }
  return result;
}

function validateHostStack(stack) {
  if (!stack
    || !isJsonPostgresRehearsalHostStackComplete(stack.StackStatus)) {
    throw new Error("existing private staging stack is not complete");
  }
  const parameters = parameterMap(stack);
  if (parameters.EnableLambdaEniBootstrap !== "false") {
    throw new Error("existing private staging Lambda ENI bootstrap is active");
  }
  const localBase = JSON.parse(readFileSync(
    "infra/lawos-private-staging/template.json",
    "utf8",
  ));
  const deployed = deployedTemplate(JSON_POSTGRES_REHEARSAL_STACK);
  const hasW12 = Boolean(
    deployed.Resources?.RehearsalAdminFunction
      && deployed.Resources?.RehearsalAdminExecutionRole,
  );
  const templateState = classifyJsonPostgresRehearsalHostTemplate({
    deployedTemplate: deployed,
    localBaseTemplate: localBase,
    rehearsalTemplate,
    hasW12,
  });
  return Object.freeze({
    stack,
    parameters,
    hasW12,
    ...templateState,
  });
}

function createReviewedChangeSet({
  stackName,
  type,
  templatePath,
  phase,
  templateSha256,
  parameters,
  templateUrl = null,
  allowIdentityTenantRebind = false,
  existingLambdaEniBootstrapTransition = false,
}) {
  const name =
    `lawos-w12-${phase}-${sourceSha.slice(0, 10)}-${input.attempt_ref}`;
  const created = awsJson([
    "cloudformation",
    "create-change-set",
    "--stack-name", stackName,
    "--change-set-name", name,
    "--change-set-type", type,
    ...cloudFormationTemplateArgs({
      templatePath,
      templateByteSize: readFileSync(templatePath).byteLength,
      templateUrl,
    }).args,
    "--capabilities", "CAPABILITY_NAMED_IAM",
    "--parameters", ...cloudFormationParameterArgs(parameters),
    "--description",
    `Exact W12 packet ${packet.packet_sha256} ${phase}`,
  ]);
  awsWait([
    "cloudformation",
    "wait",
    "change-set-create-complete",
    "--change-set-name",
    created.Id,
  ]);
  const described = awsJson([
    "cloudformation",
    "describe-change-set",
    "--change-set-name",
    created.Id,
  ]);
  assertChangeSetTemplate(created.Id, templateSha256);
  return validateJsonPostgresRehearsalChangeSet(described, {
    stackName,
    changeSetType: type,
    phase,
    templateSha256,
    parametersSha256:
      jsonPostgresRehearsalParametersSha256(parameters),
    templateUrl,
    allowIdentityTenantRebind,
    existingLambdaEniBootstrapTransition,
  });
}

function executeReviewedChangeSet(review) {
  const current = awsJson([
    "cloudformation",
    "describe-change-set",
    "--change-set-name",
    review.change_set_id,
  ]);
  assertChangeSetTemplate(
    review.change_set_id,
    review.template_sha256,
  );
  const validated = validateJsonPostgresRehearsalChangeSet(current, {
    stackName: review.stack_name,
    changeSetType: review.change_set_type,
    phase: review.phase,
    templateSha256: review.template_sha256,
    parametersSha256: review.parameters_sha256,
    templateUrl: review.template_url ?? null,
    allowIdentityTenantRebind:
      review.identity_tenant_rebind ?? false,
    existingLambdaEniBootstrapTransition:
      review.existing_lambda_eni_bootstrap_transition ?? false,
  });
  if (validated.reviewed_change_set_sha256
    !== review.reviewed_change_set_sha256) {
    throw new Error("reviewed W12 change set drifted");
  }
  awsJson([
    "cloudformation",
    "execute-change-set",
    "--change-set-name",
    review.change_set_id,
  ]);
  awsWait([
    "cloudformation",
    "wait",
    review.change_set_type === "CREATE"
      ? "stack-create-complete"
      : "stack-update-complete",
    "--stack-name",
    review.stack_name,
  ]);
  return currentStack(review.stack_name);
}

function bucketState(bucketName, expectedKmsKeyArn) {
  return assertJsonPostgresRehearsalBucketState({
    bucketName,
    expectedBucketName: bucketName,
    expectedKmsKeyArn,
    versioning: awsJson([
      "s3api", "get-bucket-versioning",
      "--bucket", bucketName,
      "--expected-bucket-owner", JSON_POSTGRES_REHEARSAL_ACCOUNT,
    ]),
    publicAccess: awsJson([
      "s3api", "get-public-access-block",
      "--bucket", bucketName,
      "--expected-bucket-owner", JSON_POSTGRES_REHEARSAL_ACCOUNT,
    ]),
    objectLock: awsJson([
      "s3api", "get-object-lock-configuration",
      "--bucket", bucketName,
      "--expected-bucket-owner", JSON_POSTGRES_REHEARSAL_ACCOUNT,
    ]),
    encryption: awsJson([
      "s3api", "get-bucket-encryption",
      "--bucket", bucketName,
      "--expected-bucket-owner", JSON_POSTGRES_REHEARSAL_ACCOUNT,
    ]),
  });
}

function artifactStoreState(stack) {
  if (!stack
    || !/^(?:CREATE|UPDATE)_COMPLETE$/u.test(stack.StackStatus ?? "")) {
    throw new Error("W12 artifact-store stack is not complete");
  }
  if (stableSha256(deployedTemplate(JSON_POSTGRES_REHEARSAL_ARTIFACT_STACK))
    !== artifactStoreValidation.template_sha256) {
    throw new Error("W12 artifact-store deployed template drifted");
  }
  const outputs = outputMap(stack);
  if (outputs.ArtifactBucketName !== JSON_POSTGRES_REHEARSAL_ARTIFACT_BUCKET
    || !outputs.ArtifactKmsKeyArn) {
    throw new Error("W12 artifact-store outputs drifted");
  }
  const key = awsJson([
    "kms",
    "describe-key",
    "--key-id",
    packet.target.artifact_kms_key_ref,
  ]);
  if (key.KeyMetadata?.Arn !== outputs.ArtifactKmsKeyArn
    || key.KeyMetadata?.Enabled !== true) {
    throw new Error("W12 artifact KMS alias drifted");
  }
  const tags = awsJson([
    "s3api",
    "get-bucket-tagging",
    "--bucket",
    outputs.ArtifactBucketName,
    "--expected-bucket-owner",
    JSON_POSTGRES_REHEARSAL_ACCOUNT,
  ]).TagSet ?? [];
  const tagMap = Object.fromEntries(tags.map(({ Key, Value }) => [Key, Value]));
  if (tagMap.environment !== "lawos-staging"
    || tagMap.program !== "lawos-private-rehearsal") {
    throw new Error("W12 artifact store is outside the staging cost boundary");
  }
  return Object.freeze({
    kms_key_arn: outputs.ArtifactKmsKeyArn,
    ...bucketState(outputs.ArtifactBucketName, outputs.ArtifactKmsKeyArn),
  });
}

function putImmutableObject({
  bucket,
  key,
  path,
  kmsKeyArn,
  contentType,
  packetMetadata = true,
}) {
  const bytes = readFileSync(path);
  const digest = sha256ProgramBytes(bytes);
  let head = awsTryJson([
    "s3api",
    "head-object",
    "--bucket", bucket,
    "--key", key,
    "--expected-bucket-owner", JSON_POSTGRES_REHEARSAL_ACCOUNT,
    "--checksum-mode", "ENABLED",
  ]);
  if (!head) {
    const metadata = packetMetadata
      ? `sha256=${digest},source-sha=${sourceSha},source-tree=${sourceTree},packet-sha256=${packet.packet_sha256}`
      : `sha256=${digest},packet-sha256=${packet.packet_sha256}`;
    const uploaded = awsJson([
      "s3api",
      "put-object",
      "--bucket", bucket,
      "--key", key,
      "--body", path,
      "--expected-bucket-owner", JSON_POSTGRES_REHEARSAL_ACCOUNT,
      "--content-type", contentType,
      "--server-side-encryption", "aws:kms",
      "--ssekms-key-id", kmsKeyArn,
      "--checksum-algorithm", "SHA256",
      "--checksum-sha256", Buffer.from(digest, "hex").toString("base64"),
      "--object-lock-mode", "COMPLIANCE",
      "--object-lock-retain-until-date", retention.contract.dms_retain_until,
      "--metadata", metadata,
      "--tagging",
      "environment=lawos-staging&program=lawos-private-rehearsal",
    ]);
    if (!uploaded.VersionId || uploaded.VersionId === "null") {
      throw new Error("W12 immutable upload returned no S3 version");
    }
    head = awsJson([
      "s3api",
      "head-object",
      "--bucket", bucket,
      "--key", key,
      "--version-id", uploaded.VersionId,
      "--expected-bucket-owner", JSON_POSTGRES_REHEARSAL_ACCOUNT,
      "--checksum-mode", "ENABLED",
    ]);
  }
  if (!head.VersionId
    || head.VersionId === "null"
    || Number(head.ContentLength) !== bytes.byteLength
    || head.ServerSideEncryption !== "aws:kms"
    || head.SSEKMSKeyId !== kmsKeyArn
    || head.ChecksumSHA256 !== Buffer.from(digest, "hex").toString("base64")
    || head.ObjectLockMode !== "COMPLIANCE"
    || Date.parse(head.ObjectLockRetainUntilDate)
      < Date.parse(retention.contract.dms_retain_until)
    || head.Metadata?.sha256 !== digest
    || head.Metadata?.["packet-sha256"] !== packet.packet_sha256) {
    throw new Error("W12 immutable object binding drifted");
  }
  return Object.freeze({
    version_id: head.VersionId,
    sha256: digest,
    byte_size: bytes.byteLength,
  });
}

function uploadArtifact(kmsKeyArn) {
  const key =
    `${JSON_POSTGRES_REHEARSAL_ARTIFACT_PREFIX}/${sourceSha}/`
    + `${packet.bindings.artifact_sha256}.zip`;
  const uploaded = putImmutableObject({
    bucket: packet.target.artifact_bucket_name,
    key,
    path: artifactPath,
    kmsKeyArn,
    contentType: "application/zip",
  });
  if (uploaded.sha256 !== packet.bindings.artifact_sha256
    || uploaded.byte_size !== artifactBytes.byteLength) {
    throw new Error("W12 uploaded artifact drifted from the exact packet");
  }
  return Object.freeze({ key, ...uploaded });
}

function uploadRehearsalTemplate(kmsKeyArn) {
  const bytes = readFileSync(rehearsalTemplatePath);
  const digest = sha256ProgramBytes(bytes);
  const key =
    `cloudformation-template/${sourceSha}/${digest}.json`;
  const uploaded = putImmutableObject({
    bucket: packet.target.artifact_bucket_name,
    key,
    path: rehearsalTemplatePath,
    kmsKeyArn,
    contentType: "application/json",
  });
  const templateUrl = buildVersionedS3TemplateUrl({
    bucket: packet.target.artifact_bucket_name,
    region: JSON_POSTGRES_REHEARSAL_REGION,
    key,
    versionId: uploaded.version_id,
  });
  const validation = awsJson([
    "cloudformation",
    "validate-template",
    ...cloudFormationTemplateArgs({
      templatePath: rehearsalTemplatePath,
      templateByteSize: bytes.byteLength,
      templateUrl,
    }).args,
  ]);
  const parameterCount = Object.keys(
    rehearsalTemplate.Parameters ?? {},
  ).length;
  if (uploaded.sha256 !== digest
    || uploaded.byte_size !== bytes.byteLength
    || validation.Parameters?.length !== parameterCount) {
    throw new Error("W12 uploaded CloudFormation template validation drifted");
  }
  return Object.freeze({
    key,
    template_url: templateUrl,
    parameter_count: parameterCount,
    ...uploaded,
  });
}

function rolePolicyState(roleName, expectedPolicyName) {
  const listed = awsJson([
    "iam",
    "list-role-policies",
    "--role-name",
    roleName,
  ], { region: false });
  if (JSON.stringify(listed.PolicyNames) !== JSON.stringify([
    expectedPolicyName,
  ])) {
    throw new Error(`unexpected inline policy remains on ${roleName}`);
  }
  const policy = awsJson([
    "iam",
    "get-role-policy",
    "--role-name",
    roleName,
    "--policy-name",
    expectedPolicyName,
  ], { region: false }).PolicyDocument;
  return Object.freeze({
    names: listed.PolicyNames,
    documents: [policy],
  });
}

function assertExistingRoleEniSafe(roleName, expectedPolicyName) {
  const state = rolePolicyState(roleName, expectedPolicyName);
  const statements = state.documents[0]?.Statement ?? [];
  const temporary = statements.filter((statement) => {
    const actions = new Set(
      Array.isArray(statement.Action)
        ? statement.Action
        : [statement.Action],
    );
    return statement.Effect === "Allow"
      && statement.Resource === "*"
      && JSON_POSTGRES_REHEARSAL_ENI_ACTIONS
        .some((action) => actions.has(action));
  });
  const denies = statements.filter((statement) =>
    statement.Sid === "DenyFunctionCodeEc2Networking"
      && statement.Effect === "Deny"
      && statement.Resource === "*"
      && statement.Condition?.ArnEquals?.["lambda:SourceFunctionArn"]);
  if (temporary.length !== 0 || denies.length !== 1) {
    throw new Error(`${roleName} ENI safety boundary drifted`);
  }
  return { temporary_eni_allow_count: 0, explicit_deny_count: 1 };
}

function assertAllEniAuthorityRemoved() {
  const w12 = rolePolicyState(
    JSON_POSTGRES_REHEARSAL_ROLE,
    "lawos-private-rehearsal-admin-runtime",
  );
  assertJsonPostgresRehearsalEniAuthority({
    policyNames: w12.names,
    policyDocuments: w12.documents,
  });
  assertExistingRoleEniSafe(
    "lawos-private-staging-api-role",
    "lawos-private-staging-api-runtime",
  );
  assertExistingRoleEniSafe(
    "lawos-private-staging-admin-role",
    "lawos-private-staging-admin-runtime",
  );
  return Object.freeze({
    temporary_eni_allow_count: 0,
    source_function_explicit_deny_count: 3,
  });
}

function protectedResourceFingerprint() {
  const rds = awsTryJson([
    "rds",
    "describe-db-instances",
    "--db-instance-identifier",
    "amic-vault-staging-postgres",
  ])?.DBInstances?.[0] ?? null;
  const lambda = awsTryJson([
    "lambda",
    "get-function-configuration",
    "--function-name",
    "matter-lawos-api-staging",
  ]);
  return stableSha256({
    rds: rds
      ? {
          arn: rds.DBInstanceArn,
          status: rds.DBInstanceStatus,
          engine_version: rds.EngineVersion,
          vpc_id: rds.DBSubnetGroup?.VpcId,
          publicly_accessible: rds.PubliclyAccessible,
        }
      : null,
    lambda: lambda
      ? {
          arn: lambda.FunctionArn,
          role: lambda.Role,
          state: lambda.State,
          code_sha256: lambda.CodeSha256,
          vpc_id: lambda.VpcConfig?.VpcId ?? null,
        }
      : null,
  });
}

function readBudget() {
  const budget = awsJson([
    "budgets",
    "describe-budget",
    "--account-id",
    JSON_POSTGRES_REHEARSAL_ACCOUNT,
    "--budget-name",
    "lawos-private-staging-monthly",
  ], { region: false }).Budget;
  return assertPrivateStagingBudget(budget);
}

function validateExecutionInput(value) {
  const keys = [
    "schema_version",
    "attempt_ref",
    "owner",
    "review_date",
    "expiration_date",
  ];
  if (value?.schema_version !== INPUT_VERSION
    || Object.keys(value).some((key) => !keys.includes(key))
    || !/^[a-z0-9][a-z0-9-]{0,39}$/u.test(value.attempt_ref ?? "")
    || !/^[A-Za-z0-9._@+-]{1,128}$/u.test(value.owner ?? "")
    || !/^\d{4}-\d{2}-\d{2}$/u.test(value.review_date ?? "")
    || !/^\d{4}-\d{2}-\d{2}$/u.test(value.expiration_date ?? "")
    || Date.parse(`${value.expiration_date}T23:59:59.999Z`)
      <= Date.now()) {
    throw new Error("W12 infrastructure execution input is invalid");
  }
  return Object.freeze(value);
}

const operation = requiredOption("--operation");
if (!OPERATIONS.has(operation)) {
  throw new Error("unsupported W12 infrastructure operation");
}
const profile = option("--profile", JSON_POSTGRES_REHEARSAL_PROFILE);
if (profile !== JSON_POSTGRES_REHEARSAL_PROFILE) {
  throw new Error(
    `W12 infrastructure requires --profile ${JSON_POSTGRES_REHEARSAL_PROFILE}`,
  );
}
const sourceSha = git("rev-parse", "HEAD");
const sourceTree = git("rev-parse", "HEAD^{tree}");
if (git("status", "--porcelain=v1", "--untracked-files=all")) {
  throw new Error("W12 infrastructure execution requires a clean exact-head worktree");
}
const packetPath = requiredOption("--packet");
const packetSource = readPrivateProgramJson(packetPath, "W12 execution packet");
const packetValidation = validateJsonPostgresExecutionPacket(packetSource, {
  sourceSha,
  sourceTree,
  phase: "w12-real-data-rehearsal",
});
const packet = Object.freeze({
  ...packetSource,
  packet_sha256: packetValidation.packet_sha256,
});
const registryPath = requiredOption("--trust-registry");
const registrySha256 = requiredOption("--trust-registry-sha256");
if (!SHA256.test(registrySha256)) {
  throw new Error("W12 trust registry SHA-256 is invalid");
}
const approvalReceiptPath = requiredOption("--approval-receipt");
const approvalSignaturePath = requiredOption("--approval-signature");
const approvalSignatureBytes = readPrivateProgramBytes(
  approvalSignaturePath,
  "W12 execution approval signature",
);
if (sha256ProgramBytes(approvalSignatureBytes)
  !== sha256ProgramBytes(readPrivateProgramBytes(
    `${approvalReceiptPath}.sig`,
    "W12 default execution approval signature",
  ))) {
  throw new Error("W12 approval signature path drifted from its receipt");
}
const approval = verifyJsonPostgresExecutionApproval({
  packet: packetSource,
  sourceSha,
  sourceTree,
  trustRegistryPath: registryPath,
  trustRegistrySha256: registrySha256,
  approvalReceiptPath,
});
const artifactPath = requiredOption("--artifact");
const artifactBytes = readPrivateProgramBytes(
  artifactPath,
  "W12 exact artifact",
);
const artifactManifestPath = requiredOption("--artifact-manifest");
const artifactManifestBytes = readPrivateProgramBytes(
  artifactManifestPath,
  "W12 artifact manifest",
);
const artifactManifest = JSON.parse(artifactManifestBytes);
validateJsonPostgresProductionDeploymentManifest(artifactManifest);
if (sha256ProgramBytes(artifactBytes) !== packet.bindings.artifact_sha256
  || artifactManifest.artifact_sha256 !== packet.bindings.artifact_sha256
  || artifactManifest.source_sha !== sourceSha
  || artifactManifest.source_tree !== sourceTree
  || artifactManifest.artifact_filename !== basename(artifactPath)
  || artifactManifest.artifact_byte_size !== artifactBytes.byteLength
  || sha256ProgramBytes(artifactManifestBytes)
    !== packet.bindings.artifact_manifest_sha256) {
  throw new Error("W12 artifact exact packet binding drifted");
}
const artifactStoreTemplatePath =
  requiredOption("--artifact-store-template");
const rehearsalTemplatePath = requiredOption("--rehearsal-template");
const artifactStoreTemplate = readPrivateProgramJson(
  artifactStoreTemplatePath,
  "W12 artifact-store template",
);
const rehearsalTemplate = readPrivateProgramJson(
  rehearsalTemplatePath,
  "W12 rehearsal template",
);
const artifactStoreValidation =
  validateJsonPostgresRehearsalArtifactStoreTemplate(
    artifactStoreTemplate,
  );
const rehearsalTemplateValidation =
  validateJsonPostgresRehearsalTemplate(rehearsalTemplate);
if (jsonPostgresRehearsalCombinedTemplateSha256({
  artifactStoreTemplate,
  rehearsalTemplate,
}) !== packet.bindings.infrastructure_template_sha256) {
  throw new Error("W12 combined infrastructure template binding drifted");
}
const retention = validateJsonPostgresRehearsalBackupRetentionContract(
  readPrivateProgramJson(
    requiredOption("--backup-retention-contract"),
    "W12 backup and retention contract",
  ),
);
if (retention.contract_sha256
  !== packet.bindings.backup_retention_contract_sha256
  || !Number.isFinite(Date.parse(retention.contract.dms_retain_until))
  || Date.parse(retention.contract.dms_retain_until) <= Date.now()) {
  throw new Error("W12 backup and retention contract binding drifted");
}
const input = validateExecutionInput(readPrivateProgramJson(
  requiredOption("--execution-input"),
  "W12 infrastructure execution input",
));
validatePrivateStagingCost(JSON.parse(readFileSync(
  "infra/lawos-private-staging/cost-estimate.json",
  "utf8",
)));
if (JSON_POSTGRES_REHEARSAL_MONTHLY_FORECAST_KRW
  > packet.target.monthly_cost_ceiling_krw) {
  throw new Error("W12 monthly forecast exceeds the approved ceiling");
}
const evidenceDir = createPrivateProgramOutputDirectory(
  requiredOption("--evidence-dir"),
);
const caller = assertJsonPostgresRehearsalCaller(
  awsJson(["sts", "get-caller-identity"]),
);

let result;
if (operation === "preflight") {
  const artifactStoreBytes = readFileSync(artifactStoreTemplatePath);
  const rehearsalBytes = readFileSync(rehearsalTemplatePath);
  const artifactValidation = awsJson([
    "cloudformation",
    "validate-template",
    ...cloudFormationTemplateArgs({
      templatePath: artifactStoreTemplatePath,
      templateByteSize: artifactStoreBytes.byteLength,
    }).args,
  ]);
  const rehearsalRequiresUrl = cloudFormationTemplateRequiresUrl(
    rehearsalBytes.byteLength,
  );
  const rehearsalValidation = rehearsalRequiresUrl
    ? null
    : awsJson([
        "cloudformation",
        "validate-template",
        ...cloudFormationTemplateArgs({
          templatePath: rehearsalTemplatePath,
          templateByteSize: rehearsalBytes.byteLength,
        }).args,
      ]);
  const host = validateHostStack(
    currentStack(JSON_POSTGRES_REHEARSAL_STACK),
  );
  const rds = awsJson([
    "rds",
    "describe-db-instances",
    "--db-instance-identifier",
    "lawos-private-staging-postgres",
  ]).DBInstances?.[0];
  result = {
    outcome: "PASS",
    caller,
    artifact_store_template_sha256:
      artifactStoreValidation.template_sha256,
    rehearsal_template_sha256:
      rehearsalTemplateValidation.template_sha256,
    combined_template_sha256:
      packet.bindings.infrastructure_template_sha256,
    artifact_store_parameter_count:
      artifactValidation.Parameters?.length ?? 0,
    rehearsal_parameter_count:
      rehearsalValidation?.Parameters?.length
        ?? Object.keys(rehearsalTemplate.Parameters ?? {}).length,
    artifact_store_template_transport: "inline-body",
    rehearsal_template_transport: rehearsalRequiresUrl
      ? "deferred-versioned-s3-url"
      : "inline-body",
    rehearsal_template_byte_size: rehearsalBytes.byteLength,
    existing_host_stack_status: host.stack.StackStatus,
    existing_w12_binding_count: host.hasW12 ? 1 : 0,
    identity_tenant_rebind_required:
      host.legacy_identity_tenant_rebind_required,
    readonly_audit_permission_rebind_required:
      host.readonly_audit_permission_rebind_required,
    retained_resource_imported:
      host.retained_resource_imported,
    rds: assertPrivateStagingRds(rds),
    budget: readBudget(),
    monthly_forecast_krw:
      JSON_POSTGRES_REHEARSAL_MONTHLY_FORECAST_KRW,
    monthly_cost_ceiling_krw: packet.target.monthly_cost_ceiling_krw,
    protected_resource_fingerprint: protectedResourceFingerprint(),
    aws_mutation_count: 0,
    postgres_mutation_count: 0,
    real_data_read_count: 0,
    real_data_mutation_count: 0,
    external_email_send_count: 0,
  };
} else if (operation === "deploy") {
  const preflight = validatePriorResult(
    requiredOption("--preflight-result"),
    "preflight",
  );
  const protectedBefore = protectedResourceFingerprint();
  if (protectedBefore !== preflight.protected_resource_fingerprint) {
    throw new Error("protected AMIC resource state drifted after W12 preflight");
  }
  readBudget();
  let mutationCount = 0;
  let artifactStack = currentStack(
    JSON_POSTGRES_REHEARSAL_ARTIFACT_STACK,
  );
  let artifactReview = null;
  if (!artifactStack) {
    const parameters = buildJsonPostgresRehearsalArtifactStoreParameters({
      owner: input.owner,
      reviewDate: input.review_date,
      expirationDate: input.expiration_date,
    });
    artifactReview = createReviewedChangeSet({
      stackName: JSON_POSTGRES_REHEARSAL_ARTIFACT_STACK,
      type: "CREATE",
      templatePath: artifactStoreTemplatePath,
      phase: "artifact-store",
      templateSha256: artifactStoreValidation.template_sha256,
      parameters,
    });
    mutationCount += 1;
    artifactStack = executeReviewedChangeSet(artifactReview);
    mutationCount += 1;
  }
  const artifactStore = artifactStoreState(artifactStack);
  const artifactUpload = uploadArtifact(artifactStore.kms_key_arn);
  mutationCount += 1;
  const templateUpload = uploadRehearsalTemplate(
    artifactStore.kms_key_arn,
  );
  mutationCount += 1;

  let host = validateHostStack(
    currentStack(JSON_POSTGRES_REHEARSAL_STACK),
  );
  let enableReview = null;
  let removeReview = null;
  if (host.hasW12) {
    assertJsonPostgresRehearsalStack(host.stack, {
      packet,
      artifactVersion: artifactUpload.version_id,
      trustRegistrySha256: registrySha256,
      approvalId: approval.approval_id,
      eniBootstrapEnabled:
        host.parameters.EnableW12LambdaEniBootstrap === "true",
    });
  } else {
    const parameters = buildJsonPostgresRehearsalStackParameters({
      existingParameters: host.parameters,
      sourceSha,
      sourceTree,
      artifactSha256: packet.bindings.artifact_sha256,
      artifactBucketName: packet.target.artifact_bucket_name,
      artifactKey: artifactUpload.key,
      artifactVersion: artifactUpload.version_id,
      executionPacketSha256: packet.packet_sha256,
      trustRegistrySha256: registrySha256,
      approvalId: approval.approval_id,
      programInputBucketName: packet.target.program_input_bucket_name,
      dmsBucketName: packet.target.dms_bucket_name,
      enableExistingLambdaEniBootstrap:
        host.legacy_identity_tenant_rebind_required,
      enableW12LambdaEniBootstrap: true,
    });
    enableReview = createReviewedChangeSet({
      stackName: JSON_POSTGRES_REHEARSAL_STACK,
      type: "UPDATE",
      templatePath: rehearsalTemplatePath,
      phase: "enable-eni",
      templateSha256: rehearsalTemplateValidation.template_sha256,
      parameters,
      templateUrl: templateUpload.template_url,
      allowIdentityTenantRebind:
        host.legacy_identity_tenant_rebind_required,
      existingLambdaEniBootstrapTransition:
        host.legacy_identity_tenant_rebind_required,
    });
    mutationCount += 1;
    host = {
      stack: executeReviewedChangeSet(enableReview),
      parameters: Object.fromEntries(parameters.map(({ key, value }) => [
        key,
        value,
      ])),
      hasW12: true,
    };
    mutationCount += 1;
  }
  assertJsonPostgresRehearsalStack(host.stack, {
    packet,
    artifactVersion: artifactUpload.version_id,
    trustRegistrySha256: registrySha256,
    approvalId: approval.approval_id,
    existingEniBootstrapEnabled:
      parameterMap(host.stack).EnableLambdaEniBootstrap === "true",
    eniBootstrapEnabled:
      parameterMap(host.stack).EnableW12LambdaEniBootstrap === "true",
  });
  const stackOutputs = outputMap(host.stack);
  const lambda = awsJson([
    "lambda",
    "get-function-configuration",
    "--function-name",
    JSON_POSTGRES_REHEARSAL_FUNCTION,
  ]);
  assertJsonPostgresRehearsalLambda(lambda, {
    packet,
    expectedVpcId: stackOutputs.VpcId,
  });

  if (parameterMap(host.stack).EnableW12LambdaEniBootstrap === "true") {
    const parameters = buildJsonPostgresRehearsalStackParameters({
      existingParameters: parameterMap(host.stack),
      sourceSha,
      sourceTree,
      artifactSha256: packet.bindings.artifact_sha256,
      artifactBucketName: packet.target.artifact_bucket_name,
      artifactKey: artifactUpload.key,
      artifactVersion: artifactUpload.version_id,
      executionPacketSha256: packet.packet_sha256,
      trustRegistrySha256: registrySha256,
      approvalId: approval.approval_id,
      programInputBucketName: packet.target.program_input_bucket_name,
      dmsBucketName: packet.target.dms_bucket_name,
      enableExistingLambdaEniBootstrap: false,
      enableW12LambdaEniBootstrap: false,
    });
    removeReview = createReviewedChangeSet({
      stackName: JSON_POSTGRES_REHEARSAL_STACK,
      type: "UPDATE",
      templatePath: rehearsalTemplatePath,
      phase: "remove-eni",
      templateSha256: rehearsalTemplateValidation.template_sha256,
      parameters,
      templateUrl: templateUpload.template_url,
      existingLambdaEniBootstrapTransition:
        parameterMap(host.stack).EnableLambdaEniBootstrap === "true",
    });
    mutationCount += 1;
    host = {
      stack: executeReviewedChangeSet(removeReview),
      parameters: Object.fromEntries(parameters.map(({ key, value }) => [
        key,
        value,
      ])),
      hasW12: true,
    };
    mutationCount += 1;
  }
  assertJsonPostgresRehearsalStack(host.stack, {
    packet,
    artifactVersion: artifactUpload.version_id,
    trustRegistrySha256: registrySha256,
    approvalId: approval.approval_id,
    eniBootstrapEnabled: false,
  });
  const finalOutputs = outputMap(host.stack);
  const eni = assertAllEniAuthorityRemoved();
  const finalLambda = assertJsonPostgresRehearsalLambda(
    awsJson([
      "lambda",
      "get-function-configuration",
      "--function-name",
      JSON_POSTGRES_REHEARSAL_FUNCTION,
    ]),
    { packet, expectedVpcId: finalOutputs.VpcId },
  );
  const programInput = bucketState(
    packet.target.program_input_bucket_name,
    finalOutputs.StagingKmsKeyArn,
  );
  const dms = bucketState(
    packet.target.dms_bucket_name,
    finalOutputs.StagingKmsKeyArn,
  );
  const protectedAfter = protectedResourceFingerprint();
  if (protectedAfter !== protectedBefore) {
    throw new Error("protected AMIC resources changed during W12 deployment");
  }
  result = {
    outcome: "PASS",
    caller,
    artifact_store: artifactStore,
    artifact_upload: artifactUpload,
    cloudformation_template_upload: templateUpload,
    artifact_store_change_set: artifactReview,
    enable_eni_change_set: enableReview,
    remove_eni_change_set: removeReview,
    host_stack_status: host.stack.StackStatus,
    host_stack_outputs_sha256: stableSha256(finalOutputs),
    program_input_kms_key_arn_sha256:
      sha256ProgramBytes(finalOutputs.StagingKmsKeyArn),
    program_input_bucket: programInput,
    dms_bucket: dms,
    lambda: finalLambda,
    ...eni,
    protected_resource_fingerprint: protectedAfter,
    monthly_forecast_krw:
      JSON_POSTGRES_REHEARSAL_MONTHLY_FORECAST_KRW,
    monthly_cost_ceiling_krw: packet.target.monthly_cost_ceiling_krw,
    artifact_version: artifactUpload.version_id,
    aws_mutation_count: mutationCount,
    postgres_mutation_count: 0,
    real_data_read_count: 0,
    real_data_mutation_count: 0,
    external_email_send_count: 0,
  };
} else {
  const deployment = validatePriorResult(
    requiredOption("--deploy-result"),
    "deploy",
  );
  const host = validateHostStack(
    currentStack(JSON_POSTGRES_REHEARSAL_STACK),
  );
  assertJsonPostgresRehearsalStack(host.stack, {
    packet,
    artifactVersion: deployment.artifact_version,
    trustRegistrySha256: registrySha256,
    approvalId: approval.approval_id,
    eniBootstrapEnabled: false,
  });
  const outputs = outputMap(host.stack);
  assertAllEniAuthorityRemoved();
  assertJsonPostgresRehearsalLambda(
    awsJson([
      "lambda",
      "get-function-configuration",
      "--function-name",
      JSON_POSTGRES_REHEARSAL_FUNCTION,
    ]),
    { packet, expectedVpcId: outputs.VpcId },
  );
  bucketState(
    packet.target.program_input_bucket_name,
    outputs.StagingKmsKeyArn,
  );
  const authorizationInputs = [
    ["packet", packetPath, "application/json"],
    ["trust-registry", registryPath, "application/json"],
    ["approval-receipt", approvalReceiptPath, "application/json"],
    ["approval-signature", approvalSignaturePath, "application/octet-stream"],
  ];
  const locators = {};
  let mutationCount = 0;
  for (const [name, path, contentType] of authorizationInputs) {
    const key =
      `program-input/${packet.packet_sha256}/authorization/${name}`;
    const uploaded = putImmutableObject({
      bucket: packet.target.program_input_bucket_name,
      key,
      path,
      kmsKeyArn: outputs.StagingKmsKeyArn,
      contentType,
      packetMetadata: false,
    });
    locators[name.replaceAll("-", "_")] =
      createJsonPostgresImmutableInputLocator({
        bucket: packet.target.program_input_bucket_name,
        key,
        versionId: uploaded.version_id,
        expectedBucketOwner: JSON_POSTGRES_REHEARSAL_ACCOUNT,
        sha256: uploaded.sha256,
        byteSize: uploaded.byte_size,
      });
    mutationCount += 1;
  }
  const event = {
    action: BOOTSTRAP_ACTION,
    attempt_ref: input.attempt_ref,
    phase: "w12-real-data-rehearsal",
    mode: "preflight",
    source_sha: sourceSha,
    source_tree: sourceTree,
    artifact_sha256: packet.bindings.artifact_sha256,
    packet_sha256: packet.packet_sha256,
    authorization: {
      packet: locators.packet,
      trust_registry: locators.trust_registry,
      approval_receipt: locators.approval_receipt,
      approval_signature: locators.approval_signature,
    },
  };
  const eventOutput = writePrivateProgramJson(
    join(evidenceDir, "bootstrap-event.json"),
    event,
  );
  const responsePath = join(evidenceDir, "bootstrap-response.json");
  const invocation = awsJson([
    "lambda",
    "invoke",
    "--function-name",
    JSON_POSTGRES_REHEARSAL_FUNCTION,
    "--invocation-type",
    "RequestResponse",
    "--cli-binary-format",
    "raw-in-base64-out",
    "--payload",
    `fileb://${eventOutput.path}`,
    responsePath,
  ]);
  if (invocation.FunctionError || !existsSync(responsePath)) {
    throw new Error("W12 database bootstrap Lambda invocation failed");
  }
  chmodSync(responsePath, 0o600);
  const responseBytes = readFileSync(responsePath);
  const response = JSON.parse(responseBytes);
  if (response.outcome !== "PASS"
    || response.action !== BOOTSTRAP_ACTION
    || response.phase !== "w12-real-data-rehearsal"
    || response.source_sha !== sourceSha
    || response.source_tree !== sourceTree
    || response.packet_sha256 !== packet.packet_sha256
    || response.rehearsal_database_ready_count !== 1
    || ![0, 1].includes(response.rehearsal_database_created_count)
    || response.approved_tenant_count
      !== packet.target.approved_tenant_ids.length
    || response.synthetic_wildcard_count !== 0
    || response.production_data_write_count !== 0
    || response.external_email_send_count !== 0
    || [
      "json_fallback_count",
      "json_writer_count",
      "dual_write_count",
      "file_current_authority_count",
      "offline_mutation_count",
      "memory_fallback_count",
    ].some((key) => response[key] !== 0)
    || response.raw_value_returned !== false
    || response.pii_returned !== false
    || response.secret_material_returned !== false) {
    throw new Error("W12 database bootstrap result failed");
  }
  result = {
    outcome: "PASS",
    caller,
    bootstrap_response_sha256: sha256ProgramBytes(responseBytes),
    authorization_locator_set_sha256: stableSha256(locators),
    rehearsal_database_created_count:
      response.rehearsal_database_created_count,
    rehearsal_database_ready_count: 1,
    migration_count: response.migration_count,
    migration_applied_count: response.migration_applied_count,
    approved_tenant_count: response.approved_tenant_count,
    temporary_eni_allow_count: 0,
    legacy_authority_counter_total: 0,
    production_data_write_count: 0,
    real_data_read_count: 0,
    real_data_mutation_count: 0,
    external_email_send_count: 0,
    aws_mutation_count: mutationCount + 1,
  };
}

const evidence = writeResult(evidenceDir, operation, result);
process.stdout.write(`${JSON.stringify({
  verdict: "PASS",
  operation,
  source_sha: sourceSha,
  source_tree: sourceTree,
  packet_sha256: packet.packet_sha256,
  result_path: evidence.path,
  result_file_sha256: evidence.sha256,
}, null, 2)}\n`);
