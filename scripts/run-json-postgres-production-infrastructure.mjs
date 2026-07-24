#!/usr/bin/env node
import { execFileSync, spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { basename, join } from "node:path";
import {
  validateJsonPostgresExecutionPacket,
  verifyJsonPostgresExecutionApproval,
} from "../packages/persistence/src/postgres/execution-contract.js";
import {
  verifyJsonPostgresProgramReceipt,
} from "../packages/persistence/src/postgres/program-receipt.js";
import {
  buildVersionedS3TemplateUrl,
  cloudFormationTemplateArgs,
  cloudFormationTemplateRequiresUrl,
  validateCloudFormationChangeSetTemplate,
} from "./lib/cloudformation-template-transport.mjs";
import {
  JSON_POSTGRES_PRODUCTION_ENI_ACTIONS,
  validateJsonPostgresProductionArtifactStoreTemplate,
  validateJsonPostgresProductionCost,
  validateJsonPostgresProductionTemplate,
} from "./lib/json-postgres-production-infrastructure.mjs";
import {
  JSON_POSTGRES_PRODUCTION_ACCOUNT,
  JSON_POSTGRES_PRODUCTION_ARTIFACT_STACK,
  JSON_POSTGRES_PRODUCTION_CUTOVER_PROFILE,
  JSON_POSTGRES_PRODUCTION_DEPLOY_PROFILE,
  JSON_POSTGRES_PRODUCTION_REGION,
  JSON_POSTGRES_PRODUCTION_STACK,
  assertJsonPostgresArtifactBucketState,
  assertJsonPostgresProductionCaller,
  assertJsonPostgresProductionStack,
  buildJsonPostgresArtifactStoreParameters,
  buildJsonPostgresProductionStackParameters,
  jsonPostgresProductionCombinedTemplateSha256,
  jsonPostgresProductionInfrastructureResultSha256,
  jsonPostgresProductionParametersSha256,
  validateJsonPostgresProductionChangeSet,
} from "./lib/json-postgres-production-execution.mjs";
import {
  validateJsonPostgresProductionDeploymentManifest,
} from "./lib/json-postgres-production-artifact.mjs";
import {
  createPrivateProgramOutputDirectory,
  readPrivateProgramBytes,
  readPrivateProgramJson,
  sha256ProgramBytes,
  writePrivateProgramJson,
} from "./lib/json-postgres-program-files.mjs";

const OPERATIONS = new Set([
  "preflight",
  "bootstrap-artifact-store",
  "upload-artifact",
  "create-production-change-set",
  "execute-production-change-set",
  "remove-eni-bootstrap",
  "bootstrap-database",
  "create-runtime-restart-change-set",
  "execute-runtime-restart-change-set",
  "create-go-live-change-set",
  "execute-go-live-change-set",
]);
const INPUT_VERSION = "law-firm-os.json-postgres-production-infrastructure-input.v1";
const SHA256 = /^[a-f0-9]{64}$/u;

function option(name, fallback = null) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${name} is required`);
  return value;
}

function requiredOption(name) {
  const value = option(name);
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function git(...args) {
  return execFileSync("git", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  }).trim();
}

function awsArgs(args, { region = true } = {}) {
  return [
    ...args,
    "--profile", profile,
    ...(region ? ["--region", JSON_POSTGRES_PRODUCTION_REGION] : []),
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
  if (result.status === 0) return result.stdout.trim() ? JSON.parse(result.stdout) : {};
  if (/(?:does not exist|not found|ValidationError|NoSuchBucket|ResourceNotFoundException)/iu.test(result.stderr ?? "")) {
    return null;
  }
  throw new Error(`AWS read failed (${sha256ProgramBytes(result.stderr ?? "").slice(0, 16)})`);
}

function awsWait(args) {
  execFileSync("aws", awsArgs(args), {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function parameterArgs(parameters) {
  return Object.entries(parameters)
    .map(([key, value]) => `ParameterKey=${key},ParameterValue=${value}`);
}

function outputMap(stack) {
  return Object.fromEntries(
    (stack?.Outputs ?? []).map(({ OutputKey, OutputValue }) => [OutputKey, OutputValue]),
  );
}

function parameterMap(stack) {
  return Object.fromEntries(
    (stack?.Parameters ?? []).map(({ ParameterKey, ParameterValue }) => [ParameterKey, ParameterValue]),
  );
}

function currentStack(name) {
  return awsTryJson(["cloudformation", "describe-stacks", "--stack-name", name])
    ?.Stacks?.[0] ?? null;
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

function createChangeSet({
  stackName,
  type,
  templatePath,
  template,
  templateSha256,
  parameters,
  label,
  templateUrl = null,
}) {
  const templateByteSize = readFileSync(templatePath).byteLength;
  let resolvedTemplateUrl = templateUrl;
  if (resolvedTemplateUrl === null
    && cloudFormationTemplateRequiresUrl(templateByteSize)) {
    const artifactStack = currentStack(
      JSON_POSTGRES_PRODUCTION_ARTIFACT_STACK,
    );
    if (!artifactStack) {
      throw new Error("production template URL requires the artifact store");
    }
    resolvedTemplateUrl = productionTemplateReference({
      kmsKeyArn: artifactStoreState(artifactStack).artifact_kms_key_arn,
    }).template_url;
  }
  const name = `lawos-${label}-${packet.source_sha.slice(0, 10)}-${input.attempt_ref}`;
  const created = awsJson([
    "cloudformation", "create-change-set",
    "--stack-name", stackName,
    "--change-set-name", name,
    "--change-set-type", type,
    ...cloudFormationTemplateArgs({
      templatePath,
      templateByteSize,
      templateUrl: resolvedTemplateUrl,
    }).args,
    "--capabilities", "CAPABILITY_NAMED_IAM",
    "--parameters", ...parameterArgs(parameters),
    "--description", `Exact-packet ${packet.packet_sha256} ${label}`,
  ]);
  awsWait([
    "cloudformation", "wait", "change-set-create-complete",
    "--change-set-name", created.Id,
  ]);
  const described = awsJson([
    "cloudformation", "describe-change-set",
    "--change-set-name", created.Id,
  ]);
  assertChangeSetTemplate(created.Id, templateSha256);
  return validateJsonPostgresProductionChangeSet(described, {
    stackName,
    changeSetType: type,
    template,
    parametersSha256: jsonPostgresProductionParametersSha256(parameters),
    templateSha256,
    templateUrl: resolvedTemplateUrl,
  });
}

function executeReviewedChangeSet(review) {
  const current = awsJson([
    "cloudformation", "describe-change-set",
    "--change-set-name", review.change_set_id,
  ]);
  assertChangeSetTemplate(
    review.change_set_id,
    review.template_sha256,
  );
  const template = review.stack_name === JSON_POSTGRES_PRODUCTION_ARTIFACT_STACK
    ? artifactStoreTemplate
    : productionTemplate;
  const validated = validateJsonPostgresProductionChangeSet(current, {
    stackName: review.stack_name,
    changeSetType: review.change_set_type,
    template,
    parametersSha256: review.parameters_sha256,
    templateSha256: review.template_sha256,
    templateUrl: review.template_url ?? null,
  });
  if (validated.reviewed_change_set_sha256 !== review.reviewed_change_set_sha256) {
    throw new Error("reviewed CloudFormation change set drifted");
  }
  awsJson([
    "cloudformation", "execute-change-set",
    "--change-set-name", review.change_set_id,
  ]);
  awsWait([
    "cloudformation", "wait",
    review.change_set_type === "CREATE" ? "stack-create-complete" : "stack-update-complete",
    "--stack-name", review.stack_name,
  ]);
  return currentStack(review.stack_name);
}

function artifactStoreState(stack) {
  const outputs = outputMap(stack);
  if (outputs.ArtifactBucketName !== packet.target.artifact_bucket_name
    || outputs.SourceSha !== packet.source_sha
    || outputs.SourceTree !== packet.source_tree
    || outputs.ExecutionPacketSha256 !== packet.packet_sha256
    || !outputs.ArtifactKmsKeyArn) {
    throw new Error("production artifact-store stack exact binding drifted");
  }
  const bucket = packet.target.artifact_bucket_name;
  const [versioning, publicAccess, objectLock, encryption, key] = [
    awsJson(["s3api", "get-bucket-versioning", "--bucket", bucket, "--expected-bucket-owner", JSON_POSTGRES_PRODUCTION_ACCOUNT]),
    awsJson(["s3api", "get-public-access-block", "--bucket", bucket, "--expected-bucket-owner", JSON_POSTGRES_PRODUCTION_ACCOUNT]),
    awsJson(["s3api", "get-object-lock-configuration", "--bucket", bucket, "--expected-bucket-owner", JSON_POSTGRES_PRODUCTION_ACCOUNT]),
    awsJson(["s3api", "get-bucket-encryption", "--bucket", bucket, "--expected-bucket-owner", JSON_POSTGRES_PRODUCTION_ACCOUNT]),
    awsJson(["kms", "describe-key", "--key-id", packet.target.artifact_kms_key_ref]),
  ];
  if (key.KeyMetadata?.Arn !== outputs.ArtifactKmsKeyArn) {
    throw new Error("production artifact KMS alias does not resolve to the exact stack key");
  }
  return {
    ...assertJsonPostgresArtifactBucketState({
      packet,
      expectedKmsKeyArn: outputs.ArtifactKmsKeyArn,
      versioning,
      publicAccess,
      objectLock,
      encryption,
    }),
    artifact_kms_key_arn: outputs.ArtifactKmsKeyArn,
  };
}

function putImmutableProductionObject({
  key,
  path,
  expectedSha256,
  kmsKeyArn,
  contentType,
  allowUpload,
}) {
  const bytes = readFileSync(path);
  const digest = sha256ProgramBytes(bytes);
  if (digest !== expectedSha256) {
    throw new Error("production immutable object digest drifted");
  }
  let mutationCount = 0;
  let head = awsTryJson([
    "s3api", "head-object",
    "--bucket", packet.target.artifact_bucket_name,
    "--key", key,
    "--expected-bucket-owner", JSON_POSTGRES_PRODUCTION_ACCOUNT,
    "--checksum-mode", "ENABLED",
  ]);
  if (!head) {
    if (!allowUpload) {
      throw new Error("production immutable object is not uploaded");
    }
    const retainUntil =
      new Date(Date.now() + 366 * 24 * 60 * 60 * 1000).toISOString();
    const uploaded = awsJson([
      "s3api", "put-object",
      "--bucket", packet.target.artifact_bucket_name,
      "--key", key,
      "--body", path,
      "--expected-bucket-owner", JSON_POSTGRES_PRODUCTION_ACCOUNT,
      "--content-type", contentType,
      "--server-side-encryption", "aws:kms",
      "--ssekms-key-id", kmsKeyArn,
      "--checksum-algorithm", "SHA256",
      "--checksum-sha256", Buffer.from(digest, "hex").toString("base64"),
      "--object-lock-mode", "COMPLIANCE",
      "--object-lock-retain-until-date", retainUntil,
      "--metadata",
      `sha256=${digest},source-sha=${sourceSha},source-tree=${sourceTree},packet-sha256=${packet.packet_sha256}`,
    ]);
    if (!uploaded.VersionId || uploaded.VersionId === "null") {
      throw new Error("production immutable object upload returned no version");
    }
    mutationCount = 1;
    head = awsJson([
      "s3api", "head-object",
      "--bucket", packet.target.artifact_bucket_name,
      "--key", key,
      "--version-id", uploaded.VersionId,
      "--expected-bucket-owner", JSON_POSTGRES_PRODUCTION_ACCOUNT,
      "--checksum-mode", "ENABLED",
    ]);
  }
  if (!head.VersionId || head.VersionId === "null"
    || Number(head.ContentLength) !== bytes.byteLength
    || head.ServerSideEncryption !== "aws:kms"
    || head.SSEKMSKeyId !== kmsKeyArn
    || head.Metadata?.sha256 !== digest
    || head.Metadata?.["source-sha"] !== sourceSha
    || head.Metadata?.["source-tree"] !== sourceTree
    || head.Metadata?.["packet-sha256"] !== packet.packet_sha256
    || head.ChecksumSHA256
      !== Buffer.from(digest, "hex").toString("base64")
    || head.ObjectLockMode !== "COMPLIANCE"
    || Date.parse(head.ObjectLockRetainUntilDate) <= Date.now()) {
    throw new Error("production immutable object binding drifted");
  }
  return Object.freeze({
    key,
    version_id: head.VersionId,
    sha256: digest,
    byte_size: bytes.byteLength,
    mutation_count: mutationCount,
  });
}

function productionTemplateReference({
  kmsKeyArn,
  allowUpload = false,
} = {}) {
  const bytes = readFileSync(productionTemplatePath);
  const digest = sha256ProgramBytes(bytes);
  const key = `cloudformation-template/${sourceSha}/${digest}.json`;
  const object = putImmutableProductionObject({
    key,
    path: productionTemplatePath,
    expectedSha256: digest,
    kmsKeyArn,
    contentType: "application/json",
    allowUpload,
  });
  const templateUrl = buildVersionedS3TemplateUrl({
    bucket: packet.target.artifact_bucket_name,
    region: JSON_POSTGRES_PRODUCTION_REGION,
    key,
    versionId: object.version_id,
  });
  const validation = awsJson([
    "cloudformation", "validate-template",
    ...cloudFormationTemplateArgs({
      templatePath: productionTemplatePath,
      templateByteSize: bytes.byteLength,
      templateUrl,
    }).args,
  ]);
  const parameterCount = Object.keys(productionTemplate.Parameters ?? {}).length;
  if (validation.Parameters?.length !== parameterCount) {
    throw new Error("production CloudFormation template validation drifted");
  }
  return Object.freeze({
    ...object,
    template_url: templateUrl,
    parameter_count: parameterCount,
  });
}

function validateEniAuthorityRemoved() {
  let temporaryAllowCount = 0;
  let explicitDenyCount = 0;
  for (const [roleName, policyName] of [
    ["lawos-production-api-role", "lawos-production-api-runtime"],
    ["lawos-production-admin-role", "lawos-production-admin-runtime"],
  ]) {
    const listed = awsJson(["iam", "list-role-policies", "--role-name", roleName], { region: false });
    if (JSON.stringify(listed.PolicyNames) !== JSON.stringify([policyName])) {
      throw new Error(`unexpected inline policy remains on ${roleName}`);
    }
    const policy = awsJson([
      "iam", "get-role-policy",
      "--role-name", roleName,
      "--policy-name", policyName,
    ], { region: false }).PolicyDocument;
    for (const statement of policy.Statement ?? []) {
      const actions = new Set(Array.isArray(statement.Action) ? statement.Action : [statement.Action]);
      if (statement.Effect === "Allow"
        && statement.Resource === "*"
        && JSON_POSTGRES_PRODUCTION_ENI_ACTIONS.every((action) => actions.has(action))) {
        temporaryAllowCount += 1;
      }
      if (statement.Sid === "DenyFunctionCodeEc2Networking"
        && statement.Effect === "Deny"
        && statement.Resource === "*"
        && statement.Condition?.ArnEquals?.["lambda:SourceFunctionArn"]) {
        explicitDenyCount += 1;
      }
    }
  }
  if (temporaryAllowCount !== 0 || explicitDenyCount !== 2) {
    throw new Error("production Lambda ENI authority removal failed");
  }
  return { temporary_eni_allow_count: 0, source_function_explicit_deny_count: 2 };
}

function assertReviewedChangeSubset(review, allowed, label) {
  if (!Array.isArray(review?.changes) || review.changes.length < 1) {
    throw new Error(`${label} change set is empty`);
  }
  const unexpected = review.changes.filter((change) =>
    !allowed.has(change.logical_resource_id)
    || change.action !== "Modify"
    || change.replacement === "True");
  if (unexpected.length) throw new Error(`${label} change set contains an unapproved resource change`);
}

function verifiedReceipt(path, kind, trustRegistry, packet) {
  const receipt = verifyJsonPostgresProgramReceipt({
    receipt: readPrivateProgramJson(path, `${kind} receipt`),
    signature: readPrivateProgramBytes(`${path}.sig`, `${kind} receipt signature`),
    trustRegistry,
  });
  if (receipt.receipt_kind !== kind
    || receipt.execution_state !== "PASS"
    || receipt.source_sha !== packet.source_sha
    || receipt.source_tree !== packet.source_tree
    || receipt.packet_sha256 !== packet.packet_sha256) {
    throw new Error(`${kind} receipt exact binding drifted`);
  }
  return receipt;
}

const operation = requiredOption("--operation");
if (!OPERATIONS.has(operation)) throw new Error("unsupported production infrastructure operation");
const goLiveOperation = operation === "create-go-live-change-set"
  || operation === "execute-go-live-change-set";
const expectedProfile = goLiveOperation
  ? JSON_POSTGRES_PRODUCTION_CUTOVER_PROFILE
  : JSON_POSTGRES_PRODUCTION_DEPLOY_PROFILE;
const profile = option("--profile", expectedProfile);
if (profile !== expectedProfile) {
  throw new Error(`production infrastructure requires --profile ${expectedProfile}`);
}
const sourceSha = git("rev-parse", "HEAD");
const sourceTree = git("rev-parse", "HEAD^{tree}");
if (git("status", "--porcelain=v1", "--untracked-files=all")) {
  throw new Error("production infrastructure execution requires a clean exact-head worktree");
}
const packetPath = requiredOption("--packet");
const packetSource = readPrivateProgramJson(packetPath, "execution packet");
const packetValidation = validateJsonPostgresExecutionPacket(packetSource, {
  sourceSha,
  sourceTree,
  phase: "w13-production-cutover",
});
const registrySha256 = requiredOption("--trust-registry-sha256");
if (!SHA256.test(registrySha256)) throw new Error("trust registry SHA-256 is invalid");
const approval = verifyJsonPostgresExecutionApproval({
  packet: packetSource,
  sourceSha,
  sourceTree,
  trustRegistryPath: requiredOption("--trust-registry"),
  trustRegistrySha256: registrySha256,
  approvalReceiptPath: requiredOption("--approval-receipt"),
});
const trustRegistry = readPrivateProgramJson(
  requiredOption("--trust-registry"),
  "owner trust registry",
);
const packet = Object.freeze({
  ...packetSource,
  packet_sha256: packetValidation.packet_sha256,
});
const artifactPath = requiredOption("--artifact");
const artifactBytes = readPrivateProgramBytes(artifactPath, "production artifact");
const artifactManifestBytes = readPrivateProgramBytes(
  requiredOption("--artifact-manifest"),
  "production artifact manifest",
);
const artifactManifest = JSON.parse(artifactManifestBytes);
validateJsonPostgresProductionDeploymentManifest(artifactManifest);
if (sha256ProgramBytes(artifactBytes) !== packet.bindings.artifact_sha256
  || artifactManifest.artifact_sha256 !== packet.bindings.artifact_sha256
  || artifactManifest.source_sha !== sourceSha
  || artifactManifest.source_tree !== sourceTree
  || artifactManifest.artifact_filename !== basename(artifactPath)
  || sha256ProgramBytes(artifactManifestBytes) !== packet.bindings.artifact_manifest_sha256) {
  throw new Error("production artifact exact packet binding drifted");
}
const artifactStoreTemplatePath = requiredOption("--artifact-store-template");
const productionTemplatePath = requiredOption("--production-template");
const artifactStoreTemplate = readPrivateProgramJson(
  artifactStoreTemplatePath,
  "production artifact-store template",
);
const productionTemplate = readPrivateProgramJson(
  productionTemplatePath,
  "production infrastructure template",
);
const artifactStoreValidation =
  validateJsonPostgresProductionArtifactStoreTemplate(artifactStoreTemplate);
const productionValidation =
  validateJsonPostgresProductionTemplate(productionTemplate);
if (jsonPostgresProductionCombinedTemplateSha256({
  artifactStoreTemplate,
  productionTemplate,
}) !== packet.bindings.infrastructure_template_sha256) {
  throw new Error("production combined infrastructure template binding drifted");
}
validateJsonPostgresProductionCost(
  JSON.parse(readFileSync("infra/lawos-production/cost-estimate.json", "utf8")),
);
const input = readPrivateProgramJson(
  requiredOption("--execution-input"),
  "production infrastructure input",
);
const inputKeys = [
  "schema_version", "attempt_ref", "owner", "review_date", "expiration_date",
  "allowed_origins", "password_reset_ses_identity_arn", "password_reset_from_email",
  "primary_tenant_id", "runtime_generation",
];
if (input?.schema_version !== INPUT_VERSION
  || Object.keys(input).some((key) => !inputKeys.includes(key))
  || !/^[a-z0-9][a-z0-9-]{0,39}$/u.test(input.attempt_ref ?? "")) {
  throw new Error("production infrastructure input schema is invalid");
}
const evidenceDir = createPrivateProgramOutputDirectory(requiredOption("--evidence-dir"));
const caller = assertJsonPostgresProductionCaller(
  awsJson(["sts", "get-caller-identity"]),
  { role: expectedProfile },
);

let result;
if (operation === "preflight") {
  const artifactStoreBytes = readFileSync(artifactStoreTemplatePath);
  const productionBytes = readFileSync(productionTemplatePath);
  const artifactValidation = awsJson([
    "cloudformation", "validate-template",
    ...cloudFormationTemplateArgs({
      templatePath: artifactStoreTemplatePath,
      templateByteSize: artifactStoreBytes.byteLength,
    }).args,
  ]);
  const productionRequiresUrl = cloudFormationTemplateRequiresUrl(
    productionBytes.byteLength,
  );
  const infrastructureValidation = productionRequiresUrl
    ? null
    : awsJson([
        "cloudformation", "validate-template",
        ...cloudFormationTemplateArgs({
          templatePath: productionTemplatePath,
          templateByteSize: productionBytes.byteLength,
        }).args,
      ]);
  result = {
    operation,
    outcome: "PASS",
    caller,
    artifact_store_template_sha256: artifactStoreValidation.template_sha256,
    production_template_sha256: productionValidation.template_sha256,
    combined_template_sha256: packet.bindings.infrastructure_template_sha256,
    artifact_store_parameter_count: artifactValidation.Parameters?.length ?? 0,
    production_parameter_count:
      infrastructureValidation?.Parameters?.length
        ?? Object.keys(productionTemplate.Parameters ?? {}).length,
    artifact_store_template_transport: "inline-body",
    production_template_transport: productionRequiresUrl
      ? "deferred-versioned-s3-url"
      : "inline-body",
    production_template_byte_size: productionBytes.byteLength,
    existing_artifact_store_stack_count: currentStack(JSON_POSTGRES_PRODUCTION_ARTIFACT_STACK) ? 1 : 0,
    existing_production_stack_count: currentStack(JSON_POSTGRES_PRODUCTION_STACK) ? 1 : 0,
    aws_mutation_count: 0,
    production_write_count: 0,
  };
} else if (operation === "bootstrap-artifact-store") {
  if (currentStack(JSON_POSTGRES_PRODUCTION_ARTIFACT_STACK)) {
    throw new Error("production artifact-store stack already exists; bootstrap is create-only");
  }
  const parameters = buildJsonPostgresArtifactStoreParameters({
    packet,
    owner: input.owner,
    reviewDate: input.review_date,
  });
  const review = createChangeSet({
    stackName: JSON_POSTGRES_PRODUCTION_ARTIFACT_STACK,
    type: "CREATE",
    templatePath: artifactStoreTemplatePath,
    template: artifactStoreTemplate,
    templateSha256: artifactStoreValidation.template_sha256,
    parameters,
    label: "production-artifact-store",
  });
  const stack = executeReviewedChangeSet(review);
  result = {
    operation,
    outcome: "PASS",
    caller,
    review,
    stack_status: stack.StackStatus,
    artifact_store: artifactStoreState(stack),
    aws_mutation_count: 2,
    production_write_count: 0,
  };
} else if (operation === "upload-artifact") {
  const stack = currentStack(JSON_POSTGRES_PRODUCTION_ARTIFACT_STACK);
  if (!stack) throw new Error("production artifact-store stack does not exist");
  const state = artifactStoreState(stack);
  const key = `lawos-production/${sourceSha}/${packet.bindings.artifact_sha256}.zip`;
  const artifact = putImmutableProductionObject({
    key,
    path: artifactPath,
    expectedSha256: packet.bindings.artifact_sha256,
    kmsKeyArn: state.artifact_kms_key_arn,
    contentType: "application/zip",
    allowUpload: true,
  });
  const template = productionTemplateReference({
    kmsKeyArn: state.artifact_kms_key_arn,
    allowUpload: true,
  });
  result = {
    schema_version: "law-firm-os.json-postgres-production-artifact-upload.v1",
    operation,
    outcome: "PASS",
    caller,
    artifact_sha256: packet.bindings.artifact_sha256,
    artifact_key: key,
    artifact_version: artifact.version_id,
    artifact_byte_size: artifactBytes.byteLength,
    object_lock_mode: "COMPLIANCE",
    cloudformation_template: template,
    aws_mutation_count:
      artifact.mutation_count + template.mutation_count,
    production_write_count: 0,
  };
} else if (operation === "create-production-change-set") {
  const upload = readPrivateProgramJson(
    requiredOption("--artifact-upload-evidence"),
    "artifact upload evidence",
  );
  if (upload?.schema_version !== "law-firm-os.json-postgres-production-artifact-upload.v1"
    || upload.outcome !== "PASS"
    || upload.artifact_sha256 !== packet.bindings.artifact_sha256
    || !upload.artifact_version
    || upload.cloudformation_template?.sha256
      !== sha256ProgramBytes(readFileSync(productionTemplatePath))
    || !upload.cloudformation_template?.version_id) {
    throw new Error("artifact upload evidence is invalid");
  }
  const parameters = buildJsonPostgresProductionStackParameters({
    packet,
    artifactVersion: upload.artifact_version,
    trustRegistrySha256: registrySha256,
    approvalId: approval.approval_id,
    owner: input.owner,
    reviewDate: input.review_date,
    expirationDate: input.expiration_date,
    allowedOrigins: input.allowed_origins,
    passwordResetSesIdentityArn: input.password_reset_ses_identity_arn,
    passwordResetFromEmail: input.password_reset_from_email,
    primaryTenantId: input.primary_tenant_id,
    runtimeGeneration: input.runtime_generation,
    enableLambdaEniBootstrap: true,
    enableProductionTraffic: false,
  });
  const type = currentStack(JSON_POSTGRES_PRODUCTION_STACK) ? "UPDATE" : "CREATE";
  const review = createChangeSet({
    stackName: JSON_POSTGRES_PRODUCTION_STACK,
    type,
    templatePath: productionTemplatePath,
    template: productionTemplate,
    templateSha256: productionValidation.template_sha256,
    parameters,
    label: "production-infrastructure",
    templateUrl: upload.cloudformation_template.template_url,
  });
  result = {
    schema_version: "law-firm-os.json-postgres-production-reviewed-change-set.v1",
    operation,
    outcome: "PASS",
    caller,
    ...review,
    artifact_version: upload.artifact_version,
    aws_mutation_count: 1,
    production_write_count: 0,
  };
} else if (operation === "execute-production-change-set") {
  const review = readPrivateProgramJson(
    requiredOption("--reviewed-change-set"),
    "reviewed production change set",
  );
  if (review?.schema_version !== "law-firm-os.json-postgres-production-reviewed-change-set.v1"
    || review.outcome !== "PASS"
    || review.stack_name !== JSON_POSTGRES_PRODUCTION_STACK) {
    throw new Error("reviewed production change-set evidence is invalid");
  }
  const stack = executeReviewedChangeSet(review);
  assertJsonPostgresProductionStack(stack, {
    packet,
    artifactVersion: review.artifact_version,
    trustRegistrySha256: registrySha256,
    eniBootstrapEnabled: true,
  });
  for (const functionName of ["lawos-production-api", "lawos-production-admin"]) {
    const configuration = awsJson([
      "lambda", "get-function-configuration", "--function-name", functionName,
    ]);
    if (configuration.State !== "Active"
      || configuration.LastUpdateStatus !== "Successful"
      || configuration.Environment?.Variables?.LAWOS_DEPLOYMENT_COMMIT !== sourceSha
      || configuration.Environment?.Variables?.LAWOS_DEPLOYMENT_TREE !== sourceTree
      || configuration.Environment?.Variables?.LAWOS_DEPLOYMENT_ARTIFACT_SHA256 !== packet.bindings.artifact_sha256) {
      throw new Error(`${functionName} exact deployment binding failed`);
    }
  }
  result = {
    operation,
    outcome: "PASS",
    caller,
    stack_status: stack.StackStatus,
    artifact_version: review.artifact_version,
    lambda_active_count: 2,
    temporary_eni_allow_count: 2,
    production_traffic_enabled: false,
    aws_mutation_count: 1,
    production_write_count: 0,
  };
} else if (operation === "remove-eni-bootstrap") {
  const stack = currentStack(JSON_POSTGRES_PRODUCTION_STACK);
  if (!stack) throw new Error("production stack does not exist");
  const parameters = { ...parameterMap(stack), EnableLambdaEniBootstrap: "false" };
  const review = createChangeSet({
    stackName: JSON_POSTGRES_PRODUCTION_STACK,
    type: "UPDATE",
    templatePath: productionTemplatePath,
    template: productionTemplate,
    templateSha256: productionValidation.template_sha256,
    parameters,
    label: "production-eni-removal",
  });
  const updated = executeReviewedChangeSet(review);
  assertJsonPostgresProductionStack(updated, {
    packet,
    artifactVersion: parameters.ArtifactVersion,
    trustRegistrySha256: registrySha256,
    eniBootstrapEnabled: false,
  });
  result = {
    operation,
    outcome: "PASS",
    caller,
    review,
    stack_status: updated.StackStatus,
    ...validateEniAuthorityRemoved(),
    production_traffic_enabled: false,
    aws_mutation_count: 2,
    production_write_count: 0,
  };
} else if (operation === "bootstrap-database") {
  const stack = currentStack(JSON_POSTGRES_PRODUCTION_STACK);
  if (!stack) throw new Error("production stack does not exist");
  const parameters = parameterMap(stack);
  assertJsonPostgresProductionStack(stack, {
    packet,
    artifactVersion: parameters.ArtifactVersion,
    trustRegistrySha256: registrySha256,
    eniBootstrapEnabled: false,
  });
  validateEniAuthorityRemoved();
  const eventPath = requiredOption("--bootstrap-event");
  const event = readPrivateProgramJson(eventPath, "production bootstrap event");
  if (event.action !== "lawos-json-postgres-production-bootstrap"
    || event.phase !== "w13-production-cutover"
    || event.mode !== "preflight"
    || event.source_sha !== sourceSha
    || event.source_tree !== sourceTree
    || event.artifact_sha256 !== packet.bindings.artifact_sha256
    || event.packet_sha256 !== packet.packet_sha256) {
    throw new Error("production bootstrap event exact binding drifted");
  }
  const invocationPath = join(evidenceDir, "lambda-bootstrap-response.json");
  const invocation = awsJson([
    "lambda", "invoke",
    "--function-name", "lawos-production-admin",
    "--invocation-type", "RequestResponse",
    "--cli-binary-format", "raw-in-base64-out",
    "--payload", `fileb://${eventPath}`,
    invocationPath,
  ]);
  if (invocation.FunctionError || !existsSync(invocationPath)) {
    throw new Error("production database bootstrap Lambda invocation failed");
  }
  chmodSync(invocationPath, 0o600);
  const response = JSON.parse(readFileSync(invocationPath, "utf8"));
  if (response.outcome !== "PASS"
    || response.source_sha !== sourceSha
    || response.source_tree !== sourceTree
    || response.packet_sha256 !== packet.packet_sha256
    || response.production_data_write_count !== 0
    || [
      "json_fallback_count", "json_writer_count", "dual_write_count",
      "file_current_authority_count", "offline_mutation_count", "memory_fallback_count",
    ].some((key) => response[key] !== 0)
    || response.raw_value_returned !== false
    || response.pii_returned !== false
    || response.secret_material_returned !== false) {
    throw new Error("production database bootstrap result failed");
  }
  result = {
    operation,
    outcome: "PASS",
    caller,
    response_sha256: sha256ProgramBytes(readFileSync(invocationPath)),
    migration_count: response.migration_count,
    migration_applied_count: response.migration_applied_count,
    approved_tenant_count: response.approved_tenant_count,
    temporary_eni_allow_count: 0,
    legacy_authority_counter_total: 0,
    production_data_write_count: 0,
    aws_mutation_count: 1,
  };
} else if (operation === "create-runtime-restart-change-set") {
  const stack = currentStack(JSON_POSTGRES_PRODUCTION_STACK);
  if (!stack) throw new Error("production stack does not exist");
  const current = parameterMap(stack);
  assertJsonPostgresProductionStack(stack, {
    packet,
    artifactVersion: current.ArtifactVersion,
    trustRegistrySha256: registrySha256,
    trafficEnabled: false,
    eniBootstrapEnabled: false,
  });
  validateEniAuthorityRemoved();
  const currentGeneration = Number(current.RuntimeGeneration);
  if (!Number.isSafeInteger(currentGeneration)
    || input.runtime_generation !== currentGeneration + 1) {
    throw new Error("runtime restart must advance the generation by exactly one");
  }
  const parameters = {
    ...current,
    RuntimeGeneration: String(input.runtime_generation),
  };
  const review = createChangeSet({
    stackName: JSON_POSTGRES_PRODUCTION_STACK,
    type: "UPDATE",
    templatePath: productionTemplatePath,
    template: productionTemplate,
    templateSha256: productionValidation.template_sha256,
    parameters,
    label: "production-runtime-restart",
  });
  assertReviewedChangeSubset(review, new Set([
    "ApiFunction",
    "AdminFunction",
    "HttpApiIntegration",
    "PasswordResetWorkerSchedule",
    "PasswordResetWorkerInvokePermission",
  ]), "runtime restart");
  result = {
    schema_version: "law-firm-os.json-postgres-production-reviewed-change-set.v1",
    operation,
    purpose: "cut-011-cold-start",
    outcome: "PASS",
    caller,
    ...review,
    artifact_version: current.ArtifactVersion,
    previous_runtime_generation: currentGeneration,
    target_runtime_generation: input.runtime_generation,
    aws_mutation_count: 1,
    production_write_count: 0,
  };
} else if (operation === "execute-runtime-restart-change-set") {
  const review = readPrivateProgramJson(
    requiredOption("--reviewed-change-set"),
    "reviewed runtime restart change set",
  );
  if (review?.schema_version !== "law-firm-os.json-postgres-production-reviewed-change-set.v1"
    || review.purpose !== "cut-011-cold-start"
    || review.outcome !== "PASS"
    || review.stack_name !== JSON_POSTGRES_PRODUCTION_STACK
    || !Number.isSafeInteger(review.target_runtime_generation)
    || review.target_runtime_generation !== review.previous_runtime_generation + 1) {
    throw new Error("reviewed runtime restart change set is invalid");
  }
  assertReviewedChangeSubset(review, new Set([
    "ApiFunction",
    "AdminFunction",
    "HttpApiIntegration",
    "PasswordResetWorkerSchedule",
    "PasswordResetWorkerInvokePermission",
  ]), "runtime restart");
  const updated = executeReviewedChangeSet(review);
  assertJsonPostgresProductionStack(updated, {
    packet,
    artifactVersion: review.artifact_version,
    trustRegistrySha256: registrySha256,
    trafficEnabled: false,
    eniBootstrapEnabled: false,
  });
  validateEniAuthorityRemoved();
  for (const functionName of ["lawos-production-api", "lawos-production-admin"]) {
    const configuration = awsJson([
      "lambda", "get-function-configuration", "--function-name", functionName,
    ]);
    if (configuration.State !== "Active"
      || configuration.LastUpdateStatus !== "Successful"
      || Number(configuration.Environment?.Variables?.LAWOS_RUNTIME_GENERATION)
        !== review.target_runtime_generation) {
      throw new Error(`${functionName} did not enter the reviewed runtime generation`);
    }
  }
  result = {
    operation,
    purpose: "cut-011-cold-start",
    outcome: "PASS",
    caller,
    stack_status: updated.StackStatus,
    target_runtime_generation: review.target_runtime_generation,
    active_function_count: 2,
    temporary_eni_allow_count: 0,
    production_traffic_enabled: false,
    aws_mutation_count: 1,
    production_write_count: 0,
  };
} else if (operation === "create-go-live-change-set") {
  const cut012 = verifiedReceipt(
    requiredOption("--cut012-receipt"),
    "cut-012",
    trustRegistry,
    packet,
  );
  const formalRelease = verifiedReceipt(
    requiredOption("--formal-release-receipt"),
    "formal-release",
    trustRegistry,
    packet,
  );
  if (cut012.claims?.json_authority_disabled !== true
    || formalRelease.claims?.release !== true
    || formalRelease.claims?.first_production_write_started !== true) {
    throw new Error("go-live predecessors do not prove CUT-012 and formal release completion");
  }
  const stack = currentStack(JSON_POSTGRES_PRODUCTION_STACK);
  if (!stack) throw new Error("production stack does not exist");
  const current = parameterMap(stack);
  assertJsonPostgresProductionStack(stack, {
    packet,
    artifactVersion: current.ArtifactVersion,
    trustRegistrySha256: registrySha256,
    trafficEnabled: false,
    eniBootstrapEnabled: false,
  });
  validateEniAuthorityRemoved();
  const parameters = { ...current, EnableProductionTraffic: "true" };
  const review = createChangeSet({
    stackName: JSON_POSTGRES_PRODUCTION_STACK,
    type: "UPDATE",
    templatePath: productionTemplatePath,
    template: productionTemplate,
    templateSha256: productionValidation.template_sha256,
    parameters,
    label: "production-go-live",
  });
  assertReviewedChangeSubset(review, new Set([
    "HttpApi",
    "HttpApiIntegration",
    "HttpApiInvokePermission",
    "HttpApiStage",
    "PasswordResetWorkerSchedule",
    "PasswordResetWorkerInvokePermission",
  ]), "go-live traffic");
  result = {
    schema_version: "law-firm-os.json-postgres-production-reviewed-change-set.v1",
    operation,
    purpose: "go-live-traffic-activation",
    outcome: "PASS",
    caller,
    ...review,
    artifact_version: current.ArtifactVersion,
    cut012_receipt_sha256: cut012.canonical_sha256,
    formal_release_receipt_sha256: formalRelease.canonical_sha256,
    aws_mutation_count: 1,
    production_write_count: 0,
    production_traffic_enabled: false,
  };
} else {
  const cut012 = verifiedReceipt(
    requiredOption("--cut012-receipt"),
    "cut-012",
    trustRegistry,
    packet,
  );
  const formalRelease = verifiedReceipt(
    requiredOption("--formal-release-receipt"),
    "formal-release",
    trustRegistry,
    packet,
  );
  const review = readPrivateProgramJson(
    requiredOption("--reviewed-change-set"),
    "reviewed go-live change set",
  );
  if (review?.schema_version !== "law-firm-os.json-postgres-production-reviewed-change-set.v1"
    || review.purpose !== "go-live-traffic-activation"
    || review.outcome !== "PASS"
    || review.stack_name !== JSON_POSTGRES_PRODUCTION_STACK
    || review.cut012_receipt_sha256 !== cut012.canonical_sha256
    || review.formal_release_receipt_sha256 !== formalRelease.canonical_sha256) {
    throw new Error("reviewed go-live change set is invalid");
  }
  assertReviewedChangeSubset(review, new Set([
    "HttpApi",
    "HttpApiIntegration",
    "HttpApiInvokePermission",
    "HttpApiStage",
    "PasswordResetWorkerSchedule",
    "PasswordResetWorkerInvokePermission",
  ]), "go-live traffic");
  const updated = executeReviewedChangeSet(review);
  assertJsonPostgresProductionStack(updated, {
    packet,
    artifactVersion: review.artifact_version,
    trustRegistrySha256: registrySha256,
    trafficEnabled: true,
    eniBootstrapEnabled: false,
  });
  validateEniAuthorityRemoved();
  result = {
    operation,
    purpose: "go-live-traffic-activation",
    outcome: "PASS",
    caller,
    stack_status: updated.StackStatus,
    cut012_receipt_sha256: cut012.canonical_sha256,
    formal_release_receipt_sha256: formalRelease.canonical_sha256,
    production_traffic_enabled: true,
    temporary_eni_allow_count: 0,
    aws_mutation_count: 1,
    production_write_count: 0,
  };
}

const evidenceMaterial = {
  schema_version: "law-firm-os.json-postgres-production-infrastructure-result.v1",
  source_sha: sourceSha,
  source_tree: sourceTree,
  packet_sha256: packet.packet_sha256,
  approval_receipt_sha256: approval.receipt_sha256,
  registry_sha256: approval.registry_sha256,
  generated_at: new Date().toISOString(),
  ...result,
  raw_pii_evidence_count: 0,
  secret_material_recorded: false,
};
const evidence = writePrivateProgramJson(
  join(evidenceDir, `${operation}-result.json`),
  {
    ...evidenceMaterial,
    result_sha256: jsonPostgresProductionInfrastructureResultSha256(evidenceMaterial),
  },
);
process.stdout.write(`${JSON.stringify({
  verdict: "PASS",
  operation,
  source_sha: sourceSha,
  source_tree: sourceTree,
  packet_sha256: packet.packet_sha256,
  result_path: evidence.path,
  result_sha256: evidence.sha256,
}, null, 2)}\n`);
