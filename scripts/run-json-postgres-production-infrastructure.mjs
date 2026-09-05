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
  validateJsonPostgresW15InventoryBootstrapPacket,
  verifyJsonPostgresW15InventoryBootstrapApproval,
} from "../packages/persistence/src/postgres/w15-inventory-bootstrap-contract.js";
import {
  verifyJsonPostgresProgramReceipt,
} from "../packages/persistence/src/postgres/program-receipt.js";
import {
  buildVersionedS3TemplateUrl,
  cloudFormationParameterJsonArgs,
  cloudFormationTemplateArgs,
  cloudFormationTemplateRequiresUrl,
  cloudFormationTemplateSha256,
  validateCloudFormationChangeSetTemplate,
} from "./lib/cloudformation-template-transport.mjs";
import {
  JSON_POSTGRES_EXTERNAL_READ_DISABLED_PACK_SECRET_NAME,
  JSON_POSTGRES_EXTERNAL_READ_DISABLED_PACK_SHA256,
  JSON_POSTGRES_OUTLOOK_DISABLED_CONFIG_SECRET_NAME,
  JSON_POSTGRES_OUTLOOK_DISABLED_CREDENTIAL_SECRET_PREFIX,
  buildJsonPostgresProductionArtifactStoreWindowsHandoffBaselineTemplate,
  buildJsonPostgresProductionArtifactStoreWindowsHandoffV2Template,
  buildJsonPostgresProductionArtifactStoreWindowsHandoffV3Template,
  classifyJsonPostgresProductionArtifactStoreWindowsHandoffTemplate,
  validateJsonPostgresProductionArtifactStoreTemplate,
  validateJsonPostgresProductionArtifactStoreWindowsHandoffLiveGovernance,
  validateJsonPostgresProductionArtifactStoreWindowsHandoffChangeSet,
  validateJsonPostgresProductionCost,
  validateJsonPostgresProductionTemplate,
} from "./lib/json-postgres-production-infrastructure.mjs";
import {
  JSON_POSTGRES_PRODUCTION_ACCOUNT,
  JSON_POSTGRES_AMIC_INTERNAL_DISTRIBUTION_STACK,
  JSON_POSTGRES_PRODUCTION_ARTIFACT_STACK,
  JSON_POSTGRES_PRODUCTION_CUTOVER_PROFILE,
  JSON_POSTGRES_PRODUCTION_DEPLOY_PROFILE,
  JSON_POSTGRES_DISABLED_AMIC_INTERNAL_UPDATE_PARAMETERS,
  JSON_POSTGRES_DISABLED_HRX_MAPPING_OBJECT_KEY,
  JSON_POSTGRES_DISABLED_HRX_VALIDATION_OBJECT_KEY,
  JSON_POSTGRES_PRODUCTION_REGION,
  JSON_POSTGRES_PRODUCTION_STACK,
  assertJsonPostgresArtifactBucketState,
  assertJsonPostgresArtifactStoreBinding,
  assertJsonPostgresProductionCaller,
  assertJsonPostgresProductionStack,
  buildJsonPostgresAmicInternalUpdateBrokerParameters,
  buildJsonPostgresArtifactStoreParameters,
  buildJsonPostgresProductionStackParameters,
  createJsonPostgresProductionWorkerEventLocator,
  jsonPostgresProductionCombinedTemplateSha256,
  jsonPostgresProductionInfrastructureResultSha256,
  jsonPostgresProductionParametersSha256,
  validateJsonPostgresAmicInternalUpdateBinding,
  validateJsonPostgresAmicInternalUpdateBrokerChangeSet,
  validateJsonPostgresProductionEniPolicyInventory,
  validateJsonPostgresProductionChangeSet,
  validateJsonPostgresW15ProductionChangeSet,
  validateJsonPostgresW15WorkerObservability,
} from "./lib/json-postgres-production-execution.mjs";
import {
  normalizeImmutableProgramInputLocator,
} from "../apps/api/src/immutable-program-input.js";
import {
  validateJsonPostgresProductionDeploymentManifest,
} from "./lib/json-postgres-production-artifact.mjs";
import {
  validateJsonPostgresW15ProjectionEvent,
} from "./lib/json-postgres-w15-execution.mjs";
import {
  assertJsonPostgresW15SourcePublished,
  validateJsonPostgresW15BootstrapEvent,
} from "./lib/json-postgres-w15-bootstrap-event.mjs";
import {
  createPrivateProgramOutputDirectory,
  readPrivateProgramBytes,
  readPrivateProgramJson,
  sha256ProgramBytes,
  writePrivateProgramJson,
} from "./lib/json-postgres-program-files.mjs";
import {
  AWS_LAMBDA_ENVIRONMENT_MAX_BYTES,
  assertLambdaEnvironmentBudget,
  resolveW15ApiEnvironment,
} from "./lib/lambda-environment-budget.mjs";

const OPERATIONS = new Set([
  "preflight",
  "bootstrap-artifact-store",
  "update-artifact-store-windows-handoff",
  "upload-artifact",
  "create-production-change-set",
  "execute-production-change-set",
  "remove-eni-bootstrap",
  "bootstrap-database",
  "create-runtime-restart-change-set",
  "execute-runtime-restart-change-set",
  "create-go-live-change-set",
  "execute-go-live-change-set",
  "w15-preflight",
  "w15-bootstrap-preflight",
  "w15-bootstrap-upload-artifact",
  "w15-bootstrap-create-change-set",
  "w15-bootstrap-execute-change-set",
  "w15-bootstrap-remove-eni-bootstrap",
  "w15-bootstrap-verify",
  "w15-bootstrap-invoke",
  "w15-upload-artifact",
  "w15-create-change-set",
  "w15-execute-change-set",
  "w15-remove-eni-bootstrap",
  "w15-verify",
  "w15-invoke-projection",
  "w15-create-worker-enable-change-set",
  "w15-execute-worker-enable-change-set",
  "w15-create-worker-disable-change-set",
  "w15-execute-worker-disable-change-set",
  "create-internal-update-broker-change-set",
  "execute-internal-update-broker-change-set",
  "verify-internal-update-broker",
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

function gitIsAncestor(ancestor, descendant) {
  return spawnSync("git", ["merge-base", "--is-ancestor", ancestor, descendant], {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  }).status === 0;
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

function requiredInternalUpdateBinding() {
  return validateJsonPostgresAmicInternalUpdateBinding(
    readPrivateProgramJson(
      requiredOption("--internal-update-binding"),
      "AMIC internal update runtime binding",
    ),
  );
}

function resolveCurrentInternalUpdateBinding(parameters) {
  if (parameters.EnableAmicInternalUnsignedUpdateBroker === "false") {
    if (Object.entries(JSON_POSTGRES_DISABLED_AMIC_INTERNAL_UPDATE_PARAMETERS)
      .some(([key, value]) => parameters[key] !== value)) {
      throw new Error("disabled AMIC internal update broker parameters drifted");
    }
    return null;
  }
  if (parameters.EnableAmicInternalUnsignedUpdateBroker !== "true") {
    throw new Error("AMIC internal update broker activation state is invalid");
  }
  const binding = requiredInternalUpdateBinding();
  const expected = buildJsonPostgresAmicInternalUpdateBrokerParameters(binding);
  if (Object.entries(expected).some(([key, value]) =>
    parameters[key] !== value)) {
    throw new Error("active AMIC internal update broker parameters drifted");
  }
  assertInternalUpdateDistributionState(binding);
  return binding;
}

function assertInternalUpdateDistributionState(binding) {
  const stack = currentStack(JSON_POSTGRES_AMIC_INTERNAL_DISTRIBUTION_STACK);
  const parameters = parameterMap(stack);
  const outputs = outputMap(stack);
  if (!stack
    || !/^(?:CREATE|UPDATE)_COMPLETE$/u.test(stack.StackStatus ?? "")
    || stack.StackId !== binding.distribution_stack_id
    || parameters.EnableDistribution !== "true"
    || parameters.RuntimeDownloadBrokerRoleName
      !== "lawos-production-api-role"
    || parameters.GitHubOidcProviderArn
      !== `arn:aws:iam::${JSON_POSTGRES_PRODUCTION_ACCOUNT}:oidc-provider/`
        + "token.actions.githubusercontent.com"
    || outputs.ArtifactBucketName !== binding.artifact_bucket_name
    || outputs.ArtifactKeyArn !== binding.artifact_kms_key_arn
    || outputs.CloudFrontDistributionId
      !== binding.cloudfront_distribution_id
    || outputs.CloudFrontDomainName !== binding.cloudfront_domain
    || outputs.CloudFrontKeyGroupId !== binding.cloudfront_key_group_id
    || outputs.CloudFrontPublicKeyId !== binding.cloudfront_key_pair_id
    || outputs.RuntimeDownloadBrokerPolicyArn
      !== binding.runtime_download_broker_policy_arn) {
    throw new Error("AMIC internal distribution stack binding drifted");
  }
  const attached = awsJson([
    "iam", "list-attached-role-policies",
    "--role-name", "lawos-production-api-role",
  ], { region: false }).AttachedPolicies ?? [];
  if (!attached.some(({ PolicyArn }) =>
    PolicyArn === binding.runtime_download_broker_policy_arn)) {
    throw new Error("AMIC internal download broker policy is not attached");
  }
  const policy = awsJson([
    "iam", "get-policy",
    "--policy-arn", binding.runtime_download_broker_policy_arn,
  ], { region: false }).Policy;
  const document = awsJson([
    "iam", "get-policy-version",
    "--policy-arn", binding.runtime_download_broker_policy_arn,
    "--version-id", policy?.DefaultVersionId ?? "missing",
  ], { region: false }).PolicyVersion?.Document;
  const statements = document?.Statement ?? [];
  const objectRead = statements.find(({ Sid }) =>
    Sid === "ReadOnlyInternalUnsignedObjects");
  const signerRead = statements.find(({ Sid }) =>
    Sid === "ReadOnlyCloudFrontViewerSigningSecret");
  if (JSON.stringify(objectRead?.Action)
      !== JSON.stringify(["s3:GetObject", "s3:GetObjectVersion"])
    || objectRead?.Resource
      !== `arn:aws:s3:::${binding.artifact_bucket_name}/internal-unsigned/*`
    || JSON.stringify(signerRead?.Action)
      !== JSON.stringify([
        "secretsmanager:DescribeSecret",
        "secretsmanager:GetSecretValue",
      ])
    || signerRead?.Resource
      !== binding.cloudfront_private_key_secret_arn) {
    throw new Error("AMIC internal download broker live policy drifted");
  }
  const distribution = awsJson([
    "cloudfront", "get-distribution",
    "--id", binding.cloudfront_distribution_id,
  ], { region: false }).Distribution;
  if (distribution?.Status !== "Deployed"
    || distribution.DomainName !== binding.cloudfront_domain
    || distribution.DistributionConfig?.Enabled !== true) {
    throw new Error("AMIC internal CloudFront distribution is not deployed");
  }
  const publicAccess = awsJson([
    "s3api", "get-public-access-block",
    "--bucket", binding.artifact_bucket_name,
    "--expected-bucket-owner", JSON_POSTGRES_PRODUCTION_ACCOUNT,
  ]).PublicAccessBlockConfiguration ?? {};
  const versioning = awsJson([
    "s3api", "get-bucket-versioning",
    "--bucket", binding.artifact_bucket_name,
    "--expected-bucket-owner", JSON_POSTGRES_PRODUCTION_ACCOUNT,
  ]);
  const objectLock = awsJson([
    "s3api", "get-object-lock-configuration",
    "--bucket", binding.artifact_bucket_name,
    "--expected-bucket-owner", JSON_POSTGRES_PRODUCTION_ACCOUNT,
  ]).ObjectLockConfiguration;
  const encryption = awsJson([
    "s3api", "get-bucket-encryption",
    "--bucket", binding.artifact_bucket_name,
    "--expected-bucket-owner", JSON_POSTGRES_PRODUCTION_ACCOUNT,
  ]).ServerSideEncryptionConfiguration?.Rules?.[0]
    ?.ApplyServerSideEncryptionByDefault;
  if (Object.keys(publicAccess).length !== 4
    || !Object.values(publicAccess).every(Boolean)
    || versioning.Status !== "Enabled"
    || objectLock?.ObjectLockEnabled !== "Enabled"
    || objectLock?.Rule?.DefaultRetention?.Mode !== "COMPLIANCE"
    || encryption?.SSEAlgorithm !== "aws:kms"
    || encryption?.KMSMasterKeyID !== binding.artifact_kms_key_arn) {
    throw new Error("AMIC internal artifact bucket governance drifted");
  }
  const signer = awsJson([
    "secretsmanager", "describe-secret",
    "--secret-id", binding.cloudfront_private_key_secret_arn,
  ]);
  if (signer.ARN !== binding.cloudfront_private_key_secret_arn
    || signer.DeletedDate != null
    || !signer.KmsKeyId) {
    throw new Error("AMIC internal CloudFront signer secret drifted");
  }
  return Object.freeze({
    stack_status: stack.StackStatus,
    stack_id_sha256: sha256ProgramBytes(Buffer.from(stack.StackId)),
    bucket_governance_verified: true,
    cloudfront_deployed: true,
    broker_policy_attached: true,
    signer_secret_described_without_value_read: true,
  });
}

function assertInternalUpdateApiEnvironment(binding) {
  const configuration = awsJson([
    "lambda", "get-function-configuration",
    "--function-name", "lawos-production-api",
  ]);
  const environment = configuration.Environment?.Variables ?? {};
  const expected = {
    LAWOS_AMIC_INTERNAL_UPDATE_ENABLED: "true",
    LAWOS_AMIC_INTERNAL_UPDATE_AWS_ACCOUNT_ID:
      JSON_POSTGRES_PRODUCTION_ACCOUNT,
    LAWOS_AMIC_INTERNAL_UPDATE_BUCKET: binding.artifact_bucket_name,
    LAWOS_AMIC_INTERNAL_UPDATE_KMS_KEY_ARN: binding.artifact_kms_key_arn,
    LAWOS_AMIC_INTERNAL_UPDATE_CLOUDFRONT_DOMAIN:
      binding.cloudfront_domain,
    LAWOS_AMIC_INTERNAL_UPDATE_CLOUDFRONT_KEY_PAIR_ID:
      binding.cloudfront_key_pair_id,
    LAWOS_AMIC_INTERNAL_UPDATE_CLOUDFRONT_PRIVATE_KEY_SECRET_ARN:
      binding.cloudfront_private_key_secret_arn,
    LAWOS_AMIC_INTERNAL_UPDATE_ED25519_PUBLIC_KEY_SPKI_BASE64:
      binding.metadata_public_key_spki_base64,
  };
  if (configuration.State !== "Active"
    || configuration.LastUpdateStatus !== "Successful"
    || Object.entries(expected).some(([key, value]) =>
      environment[key] !== value)) {
    throw new Error("AMIC internal update API runtime binding drifted");
  }
  return Object.freeze({
    lambda_state: configuration.State,
    lambda_last_update_status: configuration.LastUpdateStatus,
    environment_binding_count: Object.keys(expected).length,
    metadata_public_key_sha256:
      binding.metadata_public_key_sha256,
  });
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
  w15 = false,
  w15InternalUpdateBinding = null,
  internalUpdateBinding = null,
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
    "--parameters", ...cloudFormationParameterJsonArgs(parameters),
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
  const validationInput = {
    template,
    parametersSha256: jsonPostgresProductionParametersSha256(parameters),
    templateSha256,
    templateUrl: resolvedTemplateUrl,
  };
  return internalUpdateBinding
    ? validateJsonPostgresAmicInternalUpdateBrokerChangeSet(
      described,
      { ...validationInput, binding: internalUpdateBinding },
    )
    : w15
      ? validateJsonPostgresW15ProductionChangeSet(
      described,
      {
        ...validationInput,
        internalUpdateBinding: w15InternalUpdateBinding,
      },
      )
      : validateJsonPostgresProductionChangeSet(described, {
        stackName,
        changeSetType: type,
        ...validationInput,
      });
}

function executeReviewedChangeSet(review, {
  internalUpdateBinding = null,
  w15InternalUpdateBinding = null,
} = {}) {
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
  const validationInput = {
    template,
    parametersSha256: review.parameters_sha256,
    templateSha256: review.template_sha256,
    templateUrl: review.template_url ?? null,
  };
  const validated = review.purpose === "amic-internal-update-broker-activation"
    ? validateJsonPostgresAmicInternalUpdateBrokerChangeSet(current, {
      ...validationInput,
      binding: internalUpdateBinding,
    })
    : review.purpose === "w15-relational-projection-rebind"
    || review.purpose === "w15-incremental-worker-enable"
    || review.purpose === "w15-incremental-worker-disable"
    ? validateJsonPostgresW15ProductionChangeSet(current, {
      ...validationInput,
      internalUpdateBinding: w15InternalUpdateBinding,
    })
    : validateJsonPostgresProductionChangeSet(current, {
      stackName: review.stack_name,
      changeSetType: review.change_set_type,
      ...validationInput,
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

function parseAwsPolicy(value, label) {
  if (value && typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`${label} is not a JSON policy`);
  }
}

function artifactStoreState(stack, {
  requireExactPacketBinding = false,
  expectedWindowsHandoffTemplate = null,
} = {}) {
  const outputs = outputMap(stack);
  const binding = assertJsonPostgresArtifactStoreBinding({
    packet,
    outputs,
    sourceIsAncestor: gitIsAncestor(outputs.SourceSha, packet.source_sha),
    sourceTreeMatches:
      git("rev-parse", `${outputs.SourceSha}^{tree}`) === outputs.SourceTree,
  });
  if (requireExactPacketBinding && !binding.exact_packet_binding) {
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
  const liveGovernance = expectedWindowsHandoffTemplate === null
    ? {}
    : (() => {
        const [
          location,
          ownership,
          bucketPolicy,
          artifactKeyPolicy,
          artifactKeyAliases,
          artifactKeyRotation,
        ] = [
          awsJson(["s3api", "get-bucket-location", "--bucket", bucket, "--expected-bucket-owner", JSON_POSTGRES_PRODUCTION_ACCOUNT]),
          awsJson(["s3api", "get-bucket-ownership-controls", "--bucket", bucket, "--expected-bucket-owner", JSON_POSTGRES_PRODUCTION_ACCOUNT]),
          awsJson(["s3api", "get-bucket-policy", "--bucket", bucket, "--expected-bucket-owner", JSON_POSTGRES_PRODUCTION_ACCOUNT]),
          awsJson(["kms", "get-key-policy", "--key-id", outputs.ArtifactKmsKeyArn, "--policy-name", "default"]),
          awsJson(["kms", "list-aliases", "--key-id", outputs.ArtifactKmsKeyArn]),
          awsJson(["kms", "get-key-rotation-status", "--key-id", outputs.ArtifactKmsKeyArn]),
        ];
        return {
          ...validateJsonPostgresProductionArtifactStoreWindowsHandoffLiveGovernance({
            template: expectedWindowsHandoffTemplate,
            outputs,
            artifactKmsKeyRef: packet.target.artifact_kms_key_ref,
            location,
            ownership,
            bucketPolicy: parseAwsPolicy(
              bucketPolicy.Policy,
              "production artifact bucket policy",
            ),
            expectedBucketPolicy: resolveWindowsHandoffTemplateValue(
              expectedWindowsHandoffTemplate.Resources.ArtifactBucketPolicy
                .Properties.PolicyDocument,
              outputs,
            ),
            artifactKeyPolicy: parseAwsPolicy(
              artifactKeyPolicy.Policy,
              "production artifact KMS key policy",
            ),
            expectedArtifactKeyPolicy: resolveWindowsHandoffTemplateValue(
              expectedWindowsHandoffTemplate.Resources.ArtifactKey.Properties
                .KeyPolicy,
              outputs,
            ),
            artifactKey: key.KeyMetadata,
            artifactKeyAliases,
            artifactKeyRotation,
          }),
          live_governance_readback_count: 11,
        };
      })();
  return {
    ...binding,
    ...assertJsonPostgresArtifactBucketState({
      packet,
      expectedKmsKeyArn: outputs.ArtifactKmsKeyArn,
      versioning,
      publicAccess,
      objectLock,
      encryption,
    }),
    ...liveGovernance,
    artifact_kms_key_arn: outputs.ArtifactKmsKeyArn,
  };
}

function sameJson(left, right) {
  return cloudFormationTemplateSha256(left)
    === cloudFormationTemplateSha256(right);
}

function deployedArtifactStoreWindowsHandoffTemplate() {
  const response = awsJson([
    "cloudformation", "get-template",
    "--stack-name", JSON_POSTGRES_PRODUCTION_ARTIFACT_STACK,
    "--template-stage", "Original",
  ]);
  let template = response.TemplateBody;
  if (typeof template === "string") {
    try {
      template = JSON.parse(template);
    } catch {
      throw new Error("production artifact-store template is not JSON");
    }
  }
  return Object.freeze({
    ...classifyJsonPostgresProductionArtifactStoreWindowsHandoffTemplate(
      template,
    ),
    template,
  });
}

function assertArtifactStoreWindowsHandoffParameters(stack, template) {
  const expectedParameterKeys = Object.keys(template.Parameters).sort();
  const parameters = parameterMap(stack);
  if (JSON.stringify(Object.keys(parameters).sort())
      !== JSON.stringify(expectedParameterKeys)
    || parameters.ArtifactBucketName
      !== packet.target.artifact_bucket_name
    || !/^[0-9a-f]{40}$/u.test(parameters.SourceSha ?? "")
    || !/^[0-9a-f]{40}$/u.test(parameters.SourceTree ?? "")
    || !/^[0-9a-f]{64}$/u.test(parameters.ExecutionPacketSha256 ?? "")
    || !/^[A-Za-z0-9._@+-]{1,128}$/u.test(parameters.Owner ?? "")
    || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/u.test(
      parameters.ReviewDate ?? "",
    )) {
    throw new Error("production artifact-store parameters drifted");
  }
  return parameters;
}

function assertArtifactStoreWindowsHandoffBaseline(
  stack,
  deployment = deployedArtifactStoreWindowsHandoffTemplate(),
) {
  if (!stack || !["CREATE_COMPLETE", "UPDATE_COMPLETE"].includes(
    stack.StackStatus,
  ) || ![
    "legacy-v1",
    "windows-handoff-v2",
    "windows-handoff-v3",
  ].includes(deployment.state)) {
    throw new Error("production artifact-store baseline stack is not stable");
  }
  const baseline = {
    "legacy-v1":
      buildJsonPostgresProductionArtifactStoreWindowsHandoffBaselineTemplate,
    "windows-handoff-v2":
      buildJsonPostgresProductionArtifactStoreWindowsHandoffV2Template,
    "windows-handoff-v3":
      buildJsonPostgresProductionArtifactStoreWindowsHandoffV3Template,
  }[deployment.state]();
  const baselineSha256 = cloudFormationTemplateSha256(baseline);
  if (deployment.template_sha256 !== baselineSha256) {
    throw new Error("production artifact-store baseline template drifted");
  }
  const outputs = outputMap(stack);
  const parameters =
    assertArtifactStoreWindowsHandoffParameters(stack, baseline);
  if (deployment.state !== "legacy-v1") {
    return Object.freeze({
      baseline_state: deployment.state,
      template_sha256: baselineSha256,
      output_count: Object.keys(outputs).length,
      parameter_count: Object.keys(parameters).length,
      artifact_store: assertArtifactStoreWindowsHandoffState(
        stack,
        deployment,
        { expectedState: deployment.state, template: baseline },
      ),
      parameters,
    });
  }
  if (JSON.stringify(Object.keys(outputs).sort())
      !== JSON.stringify(Object.keys(baseline.Outputs).sort())
    || outputs.ArtifactBucketName !== packet.target.artifact_bucket_name
    || outputs.ArtifactBucketArn
      !== `arn:aws:s3:::${packet.target.artifact_bucket_name}`
    || !new RegExp(
      `^arn:aws:kms:${JSON_POSTGRES_PRODUCTION_REGION}:`
        + `${JSON_POSTGRES_PRODUCTION_ACCOUNT}:key/[0-9a-f-]+$`,
      "u",
    ).test(outputs.ArtifactKmsKeyArn ?? "")
    || outputs.SourceSha !== stack.Parameters?.find((item) =>
      item.ParameterKey === "SourceSha")?.ParameterValue
    || outputs.SourceTree !== stack.Parameters?.find((item) =>
      item.ParameterKey === "SourceTree")?.ParameterValue
    || outputs.ExecutionPacketSha256 !== stack.Parameters?.find((item) =>
      item.ParameterKey === "ExecutionPacketSha256")?.ParameterValue) {
    throw new Error("production artifact-store baseline outputs drifted");
  }
  return Object.freeze({
    baseline_state: deployment.state,
    template_sha256: baselineSha256,
    output_count: Object.keys(outputs).length,
    parameter_count: Object.keys(parameters).length,
    artifact_store: artifactStoreState(stack, {
      expectedWindowsHandoffTemplate: baseline,
    }),
    parameters,
  });
}

function resolveWindowsHandoffTemplateValue(value, outputs) {
  if (Array.isArray(value)) {
    return value.map((item) =>
      resolveWindowsHandoffTemplateValue(item, outputs));
  }
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value["Fn::GetAtt"])) {
    const [logicalId, attribute] = value["Fn::GetAtt"];
    if (attribute !== "Arn") {
      throw new Error("Windows handoff role uses an unsupported GetAtt");
    }
    const outputName = {
      ArtifactBucket: "ArtifactBucketArn",
      ArtifactKey: "ArtifactKmsKeyArn",
      WindowsSignedArtifactWrappingKey:
        "WindowsSignedArtifactWrappingKeyArn",
    }[logicalId];
    if (!outputName || !outputs[outputName]) {
      throw new Error("Windows handoff role GetAtt output is missing");
    }
    return outputs[outputName];
  }
  if (typeof value["Fn::Sub"] === "string") {
    return value["Fn::Sub"]
      .replaceAll("${AWS::Partition}", "aws")
      .replaceAll(
        "${AWS::AccountId}",
        JSON_POSTGRES_PRODUCTION_ACCOUNT,
      )
      .replaceAll("${AWS::Region}", JSON_POSTGRES_PRODUCTION_REGION)
      .replaceAll("${ArtifactBucket.Arn}", outputs.ArtifactBucketArn);
  }
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [
    key,
    resolveWindowsHandoffTemplateValue(item, outputs),
  ]));
}

function assertWindowsHandoffRole({
  logicalId,
  outputName,
  outputs,
  template = artifactStoreTemplate,
}) {
  const expected = template.Resources[logicalId].Properties;
  const role = awsJson([
    "iam", "get-role", "--role-name", expected.RoleName,
  ], { region: false }).Role;
  if (role?.RoleName !== expected.RoleName
    || role?.Arn !== outputs[outputName]
    || role?.Path !== "/"
    || role?.MaxSessionDuration !== expected.MaxSessionDuration
    || role?.PermissionsBoundary != null
    || !sameJson(
      role?.AssumeRolePolicyDocument,
      resolveWindowsHandoffTemplateValue(
        expected.AssumeRolePolicyDocument,
        outputs,
      ),
    )
    || !sameJson(
      Object.fromEntries((role?.Tags ?? []).map(({ Key, Value }) =>
        [Key, Value])),
      Object.fromEntries(expected.Tags.map(({ Key, Value }) =>
        [Key, Value])),
    )) {
    throw new Error(`${expected.RoleName} identity or trust drifted`);
  }
  const policyName = expected.Policies[0].PolicyName;
  const inline = awsJson([
    "iam", "list-role-policies", "--role-name", expected.RoleName,
  ], { region: false }).PolicyNames;
  const attached = awsJson([
    "iam", "list-attached-role-policies", "--role-name", expected.RoleName,
  ], { region: false }).AttachedPolicies;
  const policy = awsJson([
    "iam", "get-role-policy",
    "--role-name", expected.RoleName,
    "--policy-name", policyName,
  ], { region: false }).PolicyDocument;
  if (JSON.stringify(inline) !== JSON.stringify([policyName])
    || !Array.isArray(attached) || attached.length !== 0
    || !sameJson(
      policy,
      resolveWindowsHandoffTemplateValue(
        expected.Policies[0].PolicyDocument,
        outputs,
      ),
    )) {
    throw new Error(`${expected.RoleName} permission policy drifted`);
  }
  return Object.freeze({
    role_arn: role.Arn,
    max_session_duration_seconds: role.MaxSessionDuration,
    inline_policy_count: 1,
    attached_policy_count: 0,
  });
}

function assertArtifactStoreWindowsHandoffState(
  stack,
  deployment = deployedArtifactStoreWindowsHandoffTemplate(),
  {
    expectedState = "windows-handoff-v4",
    template = artifactStoreTemplate,
  } = {},
) {
  if (!stack || !["CREATE_COMPLETE", "UPDATE_COMPLETE"].includes(
    stack.StackStatus,
  ) || deployment.state !== expectedState
    || deployment.template_sha256
      !== cloudFormationTemplateSha256(template)) {
    throw new Error("production Windows handoff stack update is incomplete");
  }
  const outputs = outputMap(stack);
  const parameters = assertArtifactStoreWindowsHandoffParameters(
    stack,
    template,
  );
  if (JSON.stringify(Object.keys(outputs).sort())
      !== JSON.stringify(Object.keys(template.Outputs).sort())) {
    throw new Error("production Windows handoff output set drifted");
  }
  const literalOutputs = {
    WindowsSignedArtifactPrefix: "windows/signed/v1/",
    WindowsSignedArtifactKeyPattern:
      "windows/signed/v1/{source_sha}/{version}/{candidate_role}/{artifact_kind}/sha256/{artifact_sha256}/{filename}",
    WindowsSignedArtifactAwsAccountId:
      JSON_POSTGRES_PRODUCTION_ACCOUNT,
    WindowsSignedArtifactAwsRegion:
      JSON_POSTGRES_PRODUCTION_REGION,
    WindowsSignedArtifactDefaultRetentionDays: "365",
    WindowsSignedArtifactUploaderEnvironment:
      "windows-signed-artifact-handoff",
    WindowsSignedArtifactReaderEnvironment:
      "windows-formal-update-rollback",
    WindowsSignedArtifactUploaderWorkflowRef:
      "Gonyak-cell/law-firm-os/.github/workflows/windows-authenticode-package-qa.yml@refs/heads/main",
    WindowsSignedArtifactReaderWorkflowRef:
      "Gonyak-cell/law-firm-os/.github/workflows/windows-formal-update-rollback-qa.yml@refs/heads/main",
    WindowsSignedArtifactUploaderJobWorkflowRef:
      "Gonyak-cell/law-firm-os/.github/workflows/windows-signed-artifact-private-handoff-oidc.yml@refs/heads/main",
    WindowsSignedArtifactReaderJobWorkflowRef:
      "Gonyak-cell/law-firm-os/.github/workflows/windows-formal-update-private-reader-oidc.yml@refs/heads/main",
    WindowsSignedArtifactGovernancePrefix:
      "windows/governance/v1/",
    WindowsSignedArtifactGovernanceKeyPattern:
      "windows/governance/v1/{artifact_id}/sha256/{artifact_sha256}/{filename}",
    WindowsSignedArtifactLocatorSealEnvironment:
      "windows-formal-update-private-locator-seal",
    WindowsSignedArtifactLocatorSealWorkflowRef:
      "Gonyak-cell/law-firm-os/.github/workflows/windows-formal-update-private-locator-seal.yml@refs/heads/main",
    WindowsSignedArtifactLocatorSealJobWorkflowRef:
      "Gonyak-cell/law-firm-os/.github/workflows/windows-formal-update-private-locator-seal-oidc.yml@refs/heads/main",
    WindowsSignedArtifactLocatorSealJob: "seal-private-locator",
    WindowsSignedArtifactWrappingEncryptionAlgorithm:
      "RSAES_OAEP_SHA_256",
    WindowsSignedArtifactWrappingPublicKeyFormat: "DER_SPKI_BASE64",
    WindowsSignedArtifactWrappingPublicKeyFingerprintAlgorithm: "SHA-256",
  };
  if (Object.entries(literalOutputs).some(([key, value]) =>
    Object.hasOwn(template.Outputs, key) && outputs[key] !== value)
    || outputs.ArtifactBucketName !== packet.target.artifact_bucket_name
    || outputs.ArtifactBucketArn
      !== `arn:aws:s3:::${packet.target.artifact_bucket_name}`
    || outputs.SourceSha !== parameters.SourceSha
    || outputs.SourceTree !== parameters.SourceTree
    || outputs.ExecutionPacketSha256 !== parameters.ExecutionPacketSha256
    || outputs.WindowsSignedArtifactUploaderRoleArn
      !== `arn:aws:iam::${JSON_POSTGRES_PRODUCTION_ACCOUNT}:role/lawos-production-windows-signed-uploader`
    || outputs.WindowsSignedArtifactReaderRoleArn
      !== `arn:aws:iam::${JSON_POSTGRES_PRODUCTION_ACCOUNT}:role/lawos-production-windows-signed-operator-reader`
    || (Object.hasOwn(
      template.Outputs,
      "WindowsSignedArtifactLocatorSealRoleArn",
    ) && outputs.WindowsSignedArtifactLocatorSealRoleArn
      !== `arn:aws:iam::${JSON_POSTGRES_PRODUCTION_ACCOUNT}:role/lawos-production-windows-update-locator-sealer`)
    || outputs.WindowsSignedArtifactWrappingKeyArn
      !== `arn:aws:kms:${JSON_POSTGRES_PRODUCTION_REGION}:`
        + `${JSON_POSTGRES_PRODUCTION_ACCOUNT}:key/`
        + outputs.WindowsSignedArtifactWrappingKeyId
    || (Object.hasOwn(
      template.Outputs,
      "WindowsSignedArtifactLocatorUnwrapKmsKeyArn",
    ) && outputs.WindowsSignedArtifactLocatorUnwrapKmsKeyArn
      !== outputs.WindowsSignedArtifactWrappingKeyArn)) {
    throw new Error("production Windows handoff output values drifted");
  }
  const artifactState = artifactStoreState(stack, {
    expectedWindowsHandoffTemplate: template,
  });
  const liveWrappingKeyPolicy = parseAwsPolicy(awsJson([
    "kms", "get-key-policy",
    "--key-id", outputs.WindowsSignedArtifactWrappingKeyArn,
    "--policy-name", "default",
  ]).Policy, "production Windows wrapping key policy");
  if (!sameJson(
    liveWrappingKeyPolicy,
    resolveWindowsHandoffTemplateValue(
      template.Resources.WindowsSignedArtifactWrappingKey
        .Properties.KeyPolicy,
      outputs,
    ),
  )) {
    throw new Error("production Windows handoff live policy drifted");
  }
  const wrappingKey = awsJson([
    "kms", "describe-key",
    "--key-id", outputs.WindowsSignedArtifactWrappingKeyArn,
  ]).KeyMetadata;
  if (wrappingKey?.Arn !== outputs.WindowsSignedArtifactWrappingKeyArn
    || wrappingKey?.KeyId !== outputs.WindowsSignedArtifactWrappingKeyId
    || wrappingKey?.KeySpec !== "RSA_4096"
    || wrappingKey?.KeyUsage !== "ENCRYPT_DECRYPT"
    || wrappingKey?.Enabled !== true
    || wrappingKey?.KeyState !== "Enabled"
    || wrappingKey?.KeyManager !== "CUSTOMER"
    || wrappingKey?.Origin !== "AWS_KMS"
    || wrappingKey?.MultiRegion !== false
    || !Array.isArray(wrappingKey?.EncryptionAlgorithms)
    || !wrappingKey.EncryptionAlgorithms.includes("RSAES_OAEP_SHA_256")) {
    throw new Error("production Windows handoff wrapping key state drifted");
  }
  const roleReadback = {
    uploader: assertWindowsHandoffRole({
      logicalId: "WindowsSignedArtifactUploaderRole",
      outputName: "WindowsSignedArtifactUploaderRoleArn",
      outputs,
      template,
    }),
    reader: assertWindowsHandoffRole({
      logicalId: "WindowsSignedArtifactReaderRole",
      outputName: "WindowsSignedArtifactReaderRoleArn",
      outputs,
      template,
    }),
    ...(template.Resources.WindowsSignedArtifactLocatorSealerRole ? {
      aggregate_sealer: assertWindowsHandoffRole({
        logicalId: "WindowsSignedArtifactLocatorSealerRole",
        outputName: "WindowsSignedArtifactLocatorSealRoleArn",
        outputs,
        template,
      }),
    } : {}),
  };
  return Object.freeze({
    ...artifactState,
    signed_artifact_prefix: outputs.WindowsSignedArtifactPrefix,
    signed_artifact_key_pattern: outputs.WindowsSignedArtifactKeyPattern,
    ...(outputs.WindowsSignedArtifactGovernancePrefix ? {
      governance_prefix: outputs.WindowsSignedArtifactGovernancePrefix,
      governance_key_pattern:
        outputs.WindowsSignedArtifactGovernanceKeyPattern,
      locator_unwrap_kms_key_arn:
        outputs.WindowsSignedArtifactLocatorUnwrapKmsKeyArn,
    } : {}),
    ...roleReadback,
    ...(outputs.WindowsSignedArtifactUploaderJobWorkflowRef ? {
      oidc_job_workflow_refs: {
        uploader: outputs.WindowsSignedArtifactUploaderJobWorkflowRef,
        reader: outputs.WindowsSignedArtifactReaderJobWorkflowRef,
        aggregate_sealer:
          outputs.WindowsSignedArtifactLocatorSealJobWorkflowRef,
      },
    } : {}),
    wrapping_key_arn: wrappingKey.Arn,
    wrapping_key_id: wrappingKey.KeyId,
    wrapping_key_spec: wrappingKey.KeySpec,
    wrapping_key_usage: wrappingKey.KeyUsage,
    wrapping_encryption_algorithm: "RSAES_OAEP_SHA_256",
    wrapping_public_key_export_required: true,
    live_policy_drift_count: 0,
  });
}

function createWindowsHandoffArtifactStoreChangeSet(
  parameters,
  baselineState,
) {
  const templateSha256 = artifactStoreValidation.template_sha256;
  const parametersSha256 =
    jsonPostgresProductionParametersSha256(parameters);
  const name = `lawos-windows-handoff-${packet.source_sha.slice(0, 10)}-${input.attempt_ref}`;
  const created = awsJson([
    "cloudformation", "create-change-set",
    "--stack-name", JSON_POSTGRES_PRODUCTION_ARTIFACT_STACK,
    "--change-set-name", name,
    "--change-set-type", "UPDATE",
    ...cloudFormationTemplateArgs({
      templatePath: artifactStoreTemplatePath,
      templateByteSize: readFileSync(artifactStoreTemplatePath).byteLength,
    }).args,
    "--capabilities", "CAPABILITY_NAMED_IAM",
    "--parameters", ...cloudFormationParameterJsonArgs(parameters),
    "--description",
    `Exact-packet ${packet.packet_sha256} Windows signed artifact handoff infrastructure`,
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
  const actualParametersSha256 = jsonPostgresProductionParametersSha256(
    Object.fromEntries((described.Parameters ?? []).map((entry) => [
      entry.ParameterKey,
      entry.ParameterValue,
    ])),
  );
  return validateJsonPostgresProductionArtifactStoreWindowsHandoffChangeSet(
    described,
    {
      templateSha256,
      parametersSha256,
      actualParametersSha256,
      baselineState,
    },
  );
}

function executeWindowsHandoffArtifactStoreChangeSet(review) {
  const baseline = assertArtifactStoreWindowsHandoffBaseline(
    currentStack(JSON_POSTGRES_PRODUCTION_ARTIFACT_STACK),
  );
  if (baseline.baseline_state !== review.baseline_state) {
    throw new Error("reviewed Windows handoff baseline state drifted");
  }
  const current = awsJson([
    "cloudformation", "describe-change-set",
    "--change-set-name", review.change_set_id,
  ]);
  assertChangeSetTemplate(review.change_set_id, review.template_sha256);
  const validated =
    validateJsonPostgresProductionArtifactStoreWindowsHandoffChangeSet(
      current,
      {
        templateSha256: review.template_sha256,
        parametersSha256: review.parameters_sha256,
        actualParametersSha256:
          jsonPostgresProductionParametersSha256(
            Object.fromEntries((current.Parameters ?? []).map((entry) => [
              entry.ParameterKey,
              entry.ParameterValue,
            ])),
          ),
        baselineState: review.baseline_state,
      },
    );
  if (validated.reviewed_change_set_sha256
      !== review.reviewed_change_set_sha256) {
    throw new Error("reviewed Windows handoff change set drifted");
  }
  awsJson([
    "cloudformation", "execute-change-set",
    "--change-set-name", review.change_set_id,
  ]);
  awsWait([
    "cloudformation", "wait", "stack-update-complete",
    "--stack-name", JSON_POSTGRES_PRODUCTION_ARTIFACT_STACK,
  ]);
  return currentStack(JSON_POSTGRES_PRODUCTION_ARTIFACT_STACK);
}

function putImmutableProductionObject({
  key,
  path,
  expectedSha256,
  kmsKeyArn,
  contentType,
  allowUpload,
  bucket = packet.target.artifact_bucket_name,
  inputKind = null,
}) {
  const bytes = readFileSync(path);
  const digest = sha256ProgramBytes(bytes);
  if (digest !== expectedSha256) {
    throw new Error("production immutable object digest drifted");
  }
  let mutationCount = 0;
  let head = awsTryJson([
    "s3api", "head-object",
    "--bucket", bucket,
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
      "--bucket", bucket,
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
      `sha256=${digest},source-sha=${sourceSha},source-tree=${sourceTree},packet-sha256=${packet.packet_sha256}`
        + (inputKind ? `,input-kind=${inputKind}` : ""),
    ]);
    if (!uploaded.VersionId || uploaded.VersionId === "null") {
      throw new Error("production immutable object upload returned no version");
    }
    mutationCount = 1;
    head = awsJson([
      "s3api", "head-object",
      "--bucket", bucket,
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
    || (inputKind && head.Metadata?.["input-kind"] !== inputKind)
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

function validateEniAuthorityRemoved({ includeProjection = false } = {}) {
  let temporaryAllowCount = 0;
  let explicitDenyCount = 0;
  const roles = [
    ["lawos-production-api-role", "lawos-production-api-runtime"],
    ["lawos-production-admin-role", "lawos-production-admin-runtime"],
    ...(includeProjection ? [
      [
        "lawos-production-projection-auditor-role",
        "lawos-production-projection-auditor-runtime",
      ],
      [
        "lawos-production-projection-worker-role",
        "lawos-production-projection-worker-runtime",
      ],
    ] : []),
  ];
  for (const [roleName, policyName] of roles) {
    const listed = awsJson(["iam", "list-role-policies", "--role-name", roleName], { region: false });
    if (!Array.isArray(listed.PolicyNames)
      || new Set(listed.PolicyNames).size !== listed.PolicyNames.length) {
      throw new Error(`invalid inline policy inventory on ${roleName}`);
    }
    const policyDocuments = Object.fromEntries(listed.PolicyNames.map((name) => [
      name,
      awsJson([
        "iam", "get-role-policy",
        "--role-name", roleName,
        "--policy-name", name,
      ], { region: false }).PolicyDocument,
    ]));
    const validation = validateJsonPostgresProductionEniPolicyInventory({
      runtimePolicyName: policyName,
      policyDocuments,
    });
    temporaryAllowCount += validation.temporary_eni_allow_count;
    explicitDenyCount += validation.source_function_explicit_deny_count;
  }
  if (temporaryAllowCount !== 0 || explicitDenyCount !== roles.length) {
    throw new Error("production Lambda ENI authority removal failed");
  }
  return {
    temporary_eni_allow_count: 0,
    source_function_explicit_deny_count: roles.length,
  };
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

const W15_WORKER_TOGGLE_CHANGE_IDS = new Set([
  "ApiExecutionRole",
  "ApiFunction",
  "HttpApiIntegration",
  "ProjectionWorkerSchedule",
  "ProjectionWorkerInvokePermission",
  "ProjectionWorkerDeadLetterQueuePolicy",
  "SecretsManagerEndpoint",
]);

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
const w15BootstrapOperation = operation.startsWith("w15-bootstrap-");
const w15Operation = operation.startsWith("w15-");
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
if (w15Operation) {
  const originMainSha = git("rev-parse", "origin/main");
  assertJsonPostgresW15SourcePublished({
    sourceSha,
    sourceTree,
    originMainSha,
    originMainTree: git("rev-parse", "origin/main^{tree}"),
    sourceIsAncestor: gitIsAncestor(sourceSha, originMainSha),
  });
}
const packetPath = requiredOption("--packet");
const packetSource = readPrivateProgramJson(packetPath, "execution packet");
const packetValidation = w15BootstrapOperation
  ? validateJsonPostgresW15InventoryBootstrapPacket(packetSource, {
      sourceSha,
      sourceTree,
    })
  : validateJsonPostgresExecutionPacket(packetSource, {
      sourceSha,
      sourceTree,
      phase: w15Operation
        ? "w15-relational-projection"
        : "w13-production-cutover",
    });
const registrySha256 = requiredOption("--trust-registry-sha256");
if (!SHA256.test(registrySha256)) throw new Error("trust registry SHA-256 is invalid");
const approval = w15BootstrapOperation
  ? verifyJsonPostgresW15InventoryBootstrapApproval({
      packet: packetSource,
      sourceSha,
      sourceTree,
      trustRegistryPath: requiredOption("--trust-registry"),
      trustRegistrySha256: registrySha256,
      approvalReceiptPath: requiredOption("--approval-receipt"),
    })
  : verifyJsonPostgresExecutionApproval({
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
  "primary_tenant_id", "runtime_generation", "projection_worker_event_json",
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
if (operation === "preflight"
  || operation === "w15-preflight"
  || operation === "w15-bootstrap-preflight") {
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
    artifact_store: artifactStoreState(stack, {
      requireExactPacketBinding: true,
    }),
    aws_mutation_count: 2,
    production_write_count: 0,
  };
} else if (operation === "update-artifact-store-windows-handoff") {
  const stack = currentStack(JSON_POSTGRES_PRODUCTION_ARTIFACT_STACK);
  if (!stack) {
    throw new Error(
      "Windows handoff update requires the existing production artifact store",
    );
  }
  const deployment = deployedArtifactStoreWindowsHandoffTemplate();
  const alreadyApplied = deployment.state === "windows-handoff-v4";
  const baseline = alreadyApplied
    ? null
    : assertArtifactStoreWindowsHandoffBaseline(stack, deployment);
  const review = alreadyApplied
    ? null
    : createWindowsHandoffArtifactStoreChangeSet(
        baseline.parameters,
        baseline.baseline_state,
      );
  const updated = alreadyApplied
    ? stack
    : executeWindowsHandoffArtifactStoreChangeSet(review);
  const handoff = assertArtifactStoreWindowsHandoffState(
    updated,
    alreadyApplied ? deployment : undefined,
  );
  result = {
    schema_version:
      "law-firm-os.windows-signed-artifact-infrastructure-update.v2",
    operation,
    outcome: "PASS",
    caller,
    already_applied: alreadyApplied,
    baseline: baseline === null ? null : {
      template_sha256: baseline.template_sha256,
      baseline_state: baseline.baseline_state,
      output_count: baseline.output_count,
      parameter_count: baseline.parameter_count,
      artifact_store: baseline.artifact_store,
    },
    review,
    stack_status: updated.StackStatus,
    handoff,
    wrapping_public_key_ceremony: {
      required: true,
      aws_profile: JSON_POSTGRES_PRODUCTION_DEPLOY_PROFILE,
      aws_region: JSON_POSTGRES_PRODUCTION_REGION,
      get_public_key_algorithm: "RSAES_OAEP_SHA_256",
      public_key_format: "DER_SPKI_BASE64",
      fingerprint_algorithm: "SHA-256",
      protected_environment: "windows-signed-artifact-handoff",
      protected_environments: [
        "windows-signed-artifact-handoff",
        "windows-formal-update-private-locator-seal",
        "windows-formal-update-rollback",
      ],
      protected_variable_names: [
        "LAWOS_WINDOWS_HANDOFF_ENVIRONMENT_GUARD",
        "LAWOS_WINDOWS_HANDOFF_ACCOUNT_ID",
        "LAWOS_WINDOWS_HANDOFF_REGION",
        "LAWOS_WINDOWS_HANDOFF_BUCKET",
        "LAWOS_WINDOWS_HANDOFF_PREFIX",
        "LAWOS_WINDOWS_HANDOFF_KEY_PATTERN",
        "LAWOS_WINDOWS_HANDOFF_RETENTION_DAYS",
        "LAWOS_WINDOWS_HANDOFF_RETAIN_UNTIL",
        "LAWOS_WINDOWS_HANDOFF_CANDIDATE_ROLE",
        "LAWOS_WINDOWS_HANDOFF_UPLOADER_ROLE_ARN",
        "LAWOS_WINDOWS_HANDOFF_ARTIFACT_KMS_KEY_ARN",
        "LAWOS_WINDOWS_HANDOFF_WRAPPING_KMS_KEY_ARN",
        "LAWOS_WINDOWS_HANDOFF_WRAPPING_KEY_ID",
        "LAWOS_WINDOWS_HANDOFF_WRAPPING_ALGORITHM",
        "LAWOS_WINDOWS_HANDOFF_WRAPPING_PUBLIC_KEY_SPKI_B64",
        "LAWOS_WINDOWS_HANDOFF_WRAPPING_PUBLIC_KEY_SHA256",
      ],
      aggregate_sealer_protected_variable_names: [
        "WINDOWS_UPDATE_LOCATOR_SEAL_ENVIRONMENT_GUARD",
        "WINDOWS_UPDATE_HANDOFF_ACCOUNT_ID",
        "WINDOWS_UPDATE_HANDOFF_REGION",
        "WINDOWS_UPDATE_HANDOFF_BUCKET",
        "WINDOWS_UPDATE_HANDOFF_KMS_KEY_ARN",
        "WINDOWS_UPDATE_HANDOFF_PREFIX",
        "WINDOWS_UPDATE_GOVERNANCE_PREFIX",
        "WINDOWS_UPDATE_LOCATOR_SEAL_ROLE_ARN",
        "WINDOWS_UPDATE_LOCATOR_WRAPPING_KMS_KEY_ARN",
        "WINDOWS_UPDATE_LOCATOR_WRAPPING_PUBLIC_KEY_SPKI_B64",
        "WINDOWS_UPDATE_LOCATOR_WRAPPING_PUBLIC_KEY_SHA256",
        "WINDOWS_UPDATE_READER_ROLE_ARN",
        "WINDOWS_UPDATE_LOCATOR_RETAIN_UNTIL",
      ],
      aggregate_sealer_repository_secret_names: [
        "WINDOWS_UPDATE_LOCATOR_ARTIFACT_READ_TOKEN",
      ],
      aggregate_sealer_protected_secret_names: [
        "WINDOWS_UPDATE_BASELINE_RELEASE_MANIFEST_B64",
        "WINDOWS_UPDATE_BASELINE_METADATA_B64",
        "WINDOWS_UPDATE_BASELINE_METADATA_SIGNATURE_B64",
        "WINDOWS_UPDATE_TARGET_RELEASE_MANIFEST_B64",
        "WINDOWS_UPDATE_TARGET_METADATA_B64",
        "WINDOWS_UPDATE_TARGET_METADATA_SIGNATURE_B64",
        "WINDOWS_UPDATE_EXECUTION_INPUT_B64",
        "WINDOWS_UPDATE_APPROVAL_RECEIPT_B64",
        "WINDOWS_UPDATE_APPROVAL_SIGNATURE_B64",
      ],
      reader_protected_variable_names: [
        "WINDOWS_UPDATE_ENVIRONMENT_GUARD",
        "WINDOWS_UPDATE_HANDOFF_ACCOUNT_ID",
        "WINDOWS_UPDATE_HANDOFF_REGION",
        "WINDOWS_UPDATE_HANDOFF_BUCKET",
        "WINDOWS_UPDATE_HANDOFF_KMS_KEY_ARN",
        "WINDOWS_UPDATE_HANDOFF_PREFIX",
        "WINDOWS_UPDATE_READER_ROLE_ARN",
        "WINDOWS_UPDATE_LOCATOR_WRAPPING_KMS_KEY_ARN",
        "WINDOWS_UPDATE_BRIDGE_PUBLIC_KEY_SPKI_B64",
        "WINDOWS_UPDATE_BRIDGE_PUBLIC_KEY_SHA256",
        "WINDOWS_UPDATE_BRIDGE_PRIVATE_KEY_PATH",
      ],
      performed: false,
    },
    aws_mutation_count: alreadyApplied ? 0 : 2,
    production_write_count: 0,
  };
} else if (operation === "upload-artifact"
  || operation === "w15-upload-artifact"
  || operation === "w15-bootstrap-upload-artifact") {
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
} else if (operation === "w15-create-change-set"
  || operation === "w15-bootstrap-create-change-set") {
  const upload = readPrivateProgramJson(
    requiredOption("--artifact-upload-evidence"),
    "W15 artifact upload evidence",
  );
  if (upload?.schema_version
      !== "law-firm-os.json-postgres-production-artifact-upload.v1"
    || upload.outcome !== "PASS"
    || upload.artifact_sha256 !== packet.bindings.artifact_sha256
    || !upload.artifact_version
    || upload.cloudformation_template?.sha256
      !== sha256ProgramBytes(readFileSync(productionTemplatePath))
    || !upload.cloudformation_template?.version_id) {
    throw new Error("W15 artifact upload evidence is invalid");
  }
  const stack = currentStack(JSON_POSTGRES_PRODUCTION_STACK);
  if (!stack) throw new Error("W15 requires the completed production stack");
  const current = parameterMap(stack);
  if (current.EnableLambdaEniBootstrap !== "false"
    || current.EnableProductionTraffic !== "true") {
    throw new Error("W15 requires completed go-live with ENI bootstrap removed");
  }
  if (w15BootstrapOperation
    && current.EnableProjectionWorker !== "false") {
    throw new Error(
      "W15 inventory bootstrap cannot disable an active projection worker; use an exact W15 rebind",
    );
  }
  const parameters = {
    ...current,
    ArtifactBucket: packet.target.artifact_bucket_name,
    ArtifactKey:
      `lawos-production/${sourceSha}/${packet.bindings.artifact_sha256}.zip`,
    ArtifactVersion: upload.artifact_version,
    SourceSha: sourceSha,
    SourceTree: sourceTree,
    ArtifactSha256: packet.bindings.artifact_sha256,
    OwnerTrustRegistrySha256: registrySha256,
    BootstrapApprovalId: approval.approval_id,
    ExecutionPacketSha256: packet.packet_sha256,
    EnableLambdaEniBootstrap: "true",
    EnableExternalReadProviders: "false",
    ExternalReadProviderPackSecretName:
      JSON_POSTGRES_EXTERNAL_READ_DISABLED_PACK_SECRET_NAME,
    ExternalReadProviderPackSha256:
      JSON_POSTGRES_EXTERNAL_READ_DISABLED_PACK_SHA256,
    ...JSON_POSTGRES_DISABLED_AMIC_INTERNAL_UPDATE_PARAMETERS,
    EnableOutlookConversationWorker: "false",
    ClientOutlookM365ConfigSecretName:
      JSON_POSTGRES_OUTLOOK_DISABLED_CONFIG_SECRET_NAME,
    ClientOutlookCredentialSecretPrefix:
      JSON_POSTGRES_OUTLOOK_DISABLED_CREDENTIAL_SECRET_PREFIX,
    EnableProjectionWorker: "false",
    ProjectionWorkerEventJson: "{}",
    HrxProjectionMappingObjectKey:
      JSON_POSTGRES_DISABLED_HRX_MAPPING_OBJECT_KEY,
    HrxProjectionValidationObjectKey:
      JSON_POSTGRES_DISABLED_HRX_VALIDATION_OBJECT_KEY,
    ProjectionWorkerLagThresholdMs: "24",
  };
  const apiConfiguration = awsJson([
    "lambda", "get-function-configuration",
    "--function-name", "lawos-production-api",
  ]);
  if (apiConfiguration.FunctionName !== "lawos-production-api"
    || apiConfiguration.Environment?.Error
    || apiConfiguration.Environment?.Variables?.LAWOS_DEPLOYMENT_COMMIT !== current.SourceSha
    || apiConfiguration.Environment?.Variables?.LAWOS_DEPLOYMENT_TREE !== current.SourceTree
    || apiConfiguration.Environment?.Variables?.LAWOS_DEPLOYMENT_ARTIFACT_SHA256 !== current.ArtifactSha256) {
    throw new Error("W15 API environment readback is unavailable");
  }
  let deployedTemplate = awsJson([
    "cloudformation", "get-template",
    "--stack-name", JSON_POSTGRES_PRODUCTION_STACK,
    "--template-stage", "Original",
  ]).TemplateBody;
  if (typeof deployedTemplate === "string") {
    try {
      deployedTemplate = JSON.parse(deployedTemplate);
    } catch {
      throw new Error("W15 deployed template is not JSON");
    }
  }
  const apiEnvironmentBudget = assertLambdaEnvironmentBudget(resolveW15ApiEnvironment({
    variables: productionTemplate.Resources.ApiFunction.Properties.Environment.Variables,
    deployedVariables: deployedTemplate?.Resources?.ApiFunction?.Properties?.Environment?.Variables,
    liveVariables: apiConfiguration.Environment?.Variables,
    parameters,
    outputs: outputMap(stack),
    accountId: JSON_POSTGRES_PRODUCTION_ACCOUNT,
    region: JSON_POSTGRES_PRODUCTION_REGION,
  }));
  const review = createChangeSet({
    stackName: JSON_POSTGRES_PRODUCTION_STACK,
    type: "UPDATE",
    templatePath: productionTemplatePath,
    template: productionTemplate,
    templateSha256: productionValidation.template_sha256,
    parameters,
    label: w15BootstrapOperation
      ? "w15-inventory-bootstrap"
      : "w15-relational-projection",
    templateUrl: upload.cloudformation_template.template_url,
    w15: true,
  });
  result = {
    schema_version:
      "law-firm-os.json-postgres-production-reviewed-change-set.v1",
    operation,
    outcome: "PASS",
    caller,
    ...review,
    artifact_version: upload.artifact_version,
    production_traffic_enabled: true,
    projection_worker_enabled: false,
    inventory_bootstrap_only: w15BootstrapOperation,
    api_environment_budget: apiEnvironmentBudget,
    aws_mutation_count: 1,
    production_write_count: 0,
  };
} else if (operation === "w15-execute-change-set"
  || operation === "w15-bootstrap-execute-change-set") {
  const review = readPrivateProgramJson(
    requiredOption("--reviewed-change-set"),
    "reviewed W15 production change set",
  );
  if (review?.schema_version
      !== "law-firm-os.json-postgres-production-reviewed-change-set.v1"
    || review.purpose !== "w15-relational-projection-rebind"
    || review.outcome !== "PASS"
    || review.stack_name !== JSON_POSTGRES_PRODUCTION_STACK
    || review.production_traffic_enabled !== true
    || review.projection_worker_enabled !== false
    || review.inventory_bootstrap_only !== w15BootstrapOperation) {
    throw new Error("reviewed W15 production change set is invalid");
  }
  const stack = executeReviewedChangeSet(review);
  assertJsonPostgresProductionStack(stack, {
    packet,
    artifactVersion: review.artifact_version,
    trustRegistrySha256: registrySha256,
    trafficEnabled: true,
    eniBootstrapEnabled: true,
    projectionWorkerEnabled: false,
  });
  for (const functionName of [
    "lawos-production-api",
    "lawos-production-admin",
    "lawos-production-projection-auditor",
    "lawos-production-projection-worker",
  ]) {
    const configuration = awsJson([
      "lambda", "get-function-configuration", "--function-name", functionName,
    ]);
    if (configuration.State !== "Active"
      || configuration.LastUpdateStatus !== "Successful"
      || configuration.Environment?.Variables?.LAWOS_DEPLOYMENT_COMMIT
        !== sourceSha
      || configuration.Environment?.Variables?.LAWOS_DEPLOYMENT_TREE
        !== sourceTree
      || configuration.Environment?.Variables
        ?.LAWOS_DEPLOYMENT_ARTIFACT_SHA256
        !== packet.bindings.artifact_sha256) {
      throw new Error(`${functionName} W15 exact deployment binding failed`);
    }
  }
  result = {
    operation,
    outcome: "PASS",
    caller,
    stack_status: stack.StackStatus,
    artifact_version: review.artifact_version,
    lambda_active_count: 4,
    temporary_eni_allow_count: 4,
    production_traffic_enabled: true,
    projection_worker_enabled: false,
    inventory_bootstrap_only: w15BootstrapOperation,
    aws_mutation_count: 1,
    production_write_count: 0,
  };
} else if (operation === "w15-remove-eni-bootstrap"
  || operation === "w15-bootstrap-remove-eni-bootstrap") {
  const stack = currentStack(JSON_POSTGRES_PRODUCTION_STACK);
  if (!stack) throw new Error("production stack does not exist");
  const parameters = {
    ...parameterMap(stack),
    EnableLambdaEniBootstrap: "false",
  };
  const review = createChangeSet({
    stackName: JSON_POSTGRES_PRODUCTION_STACK,
    type: "UPDATE",
    templatePath: productionTemplatePath,
    template: productionTemplate,
    templateSha256: productionValidation.template_sha256,
    parameters,
    label: "w15-eni-removal",
    w15: true,
  });
  const updated = executeReviewedChangeSet(review);
  assertJsonPostgresProductionStack(updated, {
    packet,
    artifactVersion: parameters.ArtifactVersion,
    trustRegistrySha256: registrySha256,
    trafficEnabled: true,
    eniBootstrapEnabled: false,
    projectionWorkerEnabled: false,
  });
  result = {
    operation,
    outcome: "PASS",
    caller,
    review,
    stack_status: updated.StackStatus,
    ...validateEniAuthorityRemoved({ includeProjection: true }),
    production_traffic_enabled: true,
    projection_worker_enabled: false,
    inventory_bootstrap_only: w15BootstrapOperation,
    aws_mutation_count: 2,
    production_write_count: 0,
  };
} else if (operation === "w15-verify"
  || operation === "w15-bootstrap-verify") {
  const stack = currentStack(JSON_POSTGRES_PRODUCTION_STACK);
  if (!stack) throw new Error("production stack does not exist");
  const parameters = parameterMap(stack);
  assertJsonPostgresProductionStack(stack, {
    packet,
    artifactVersion: parameters.ArtifactVersion,
    trustRegistrySha256: registrySha256,
    trafficEnabled: true,
    eniBootstrapEnabled: false,
    projectionWorkerEnabled:
      parameters.EnableProjectionWorker === "true",
  });
  const eni = validateEniAuthorityRemoved({ includeProjection: true });
  const rule = awsJson([
    "events", "describe-rule",
    "--name", "lawos-production-projection-worker",
  ]);
  const expectedRuleState = parameters.EnableProjectionWorker === "true"
    ? "ENABLED"
    : "DISABLED";
  if (rule.State !== expectedRuleState) {
    throw new Error("W15 projection worker schedule state drifted");
  }
  const targets = awsJson([
    "events", "list-targets-by-rule",
    "--rule", "lawos-production-projection-worker",
  ]);
  const invokeConfig = awsJson([
    "lambda", "get-function-event-invoke-config",
    "--function-name", "lawos-production-projection-worker",
    "--qualifier", "$LATEST",
  ]);
  const queue = awsJson([
    "sqs", "get-queue-url",
    "--queue-name", "lawos-production-projection-worker-dead-letter",
  ]);
  const queueAttributes = awsJson([
    "sqs", "get-queue-attributes",
    "--queue-url", queue.QueueUrl,
    "--attribute-names", "All",
  ]);
  const alarms = awsJson([
    "cloudwatch", "describe-alarms",
    "--alarm-names",
    "lawos-production-projection-worker-errors",
    "lawos-production-projection-worker-delivery-failures",
    "lawos-production-projection-worker-dead-letter",
    "lawos-production-projection-worker-lag",
  ]);
  const observability = validateJsonPostgresW15WorkerObservability({
    rule,
    targets,
    invokeConfig,
    queueUrl: queue.QueueUrl,
    queueAttributes,
    alarms,
  });
  const apiConfiguration = awsJson([
    "lambda", "get-function-configuration",
    "--function-name", "lawos-production-api",
  ]);
  const apiEnvironment = apiConfiguration.Environment?.Variables ?? {};
  if (apiEnvironment.LAWOS_HRX_RELATIONAL_PROJECTION_ENABLED
      !== (parameters.EnableProjectionWorker === "true"
        ? "true"
        : "false")
    || apiEnvironment.LAWOS_HRX_RELATIONAL_PROJECTION_EVENT_LOCATOR
      !== parameters.ProjectionWorkerEventJson
    || apiEnvironment.LAWOS_HRX_RELATIONAL_PROJECTION_MAPPING_OBJECT_KEY
      != null
    || apiEnvironment.LAWOS_HRX_RELATIONAL_PROJECTION_VALIDATION_OBJECT_KEY
      != null
    || apiEnvironment.LAWOS_EXECUTION_PACKET_SHA256
      !== packet.packet_sha256) {
    throw new Error("W15 production API projection input binding drifted");
  }
  result = {
    operation,
    outcome: "PASS",
    caller,
    stack_status: stack.StackStatus,
    ...eni,
    production_traffic_enabled: true,
    projection_worker_enabled: expectedRuleState === "ENABLED",
    worker_observability: observability,
    inventory_bootstrap_only: w15BootstrapOperation,
    aws_mutation_count: 0,
    production_write_count: 0,
  };
} else if (operation === "w15-bootstrap-invoke") {
  const stack = currentStack(JSON_POSTGRES_PRODUCTION_STACK);
  if (!stack) throw new Error("production stack does not exist");
  const parameters = parameterMap(stack);
  assertJsonPostgresProductionStack(stack, {
    packet,
    artifactVersion: parameters.ArtifactVersion,
    trustRegistrySha256: registrySha256,
    trafficEnabled: true,
    eniBootstrapEnabled: false,
    projectionWorkerEnabled: false,
  });
  validateEniAuthorityRemoved({ includeProjection: true });
  const eventPath = requiredOption("--bootstrap-event");
  const event = readPrivateProgramJson(
    eventPath,
    "W15 inventory bootstrap event",
  );
  validateJsonPostgresW15BootstrapEvent(event, {
    packet: packetSource,
    artifactSha256: packet.bindings.artifact_sha256,
  });
  const functionName = event.mode === "inventory-read"
    ? "lawos-production-projection-auditor"
    : "lawos-production-admin";
  const invocationPath = join(
    evidenceDir,
    `w15-${event.attempt_ref}-response.json`,
  );
  const invocation = awsJson([
    "lambda", "invoke",
    "--function-name", functionName,
    "--invocation-type", "RequestResponse",
    "--cli-binary-format", "raw-in-base64-out",
    "--payload", `fileb://${eventPath}`,
    invocationPath,
  ]);
  if (invocation.FunctionError || !existsSync(invocationPath)) {
    throw new Error("W15 inventory bootstrap Lambda invocation failed");
  }
  chmodSync(invocationPath, 0o600);
  const responseBytes = readFileSync(invocationPath);
  const response = JSON.parse(responseBytes);
  if (response.outcome !== "PASS"
    || response.action
      !== "lawos-json-postgres-w15-inventory-bootstrap"
    || response.phase !== "w15-inventory-bootstrap"
    || response.mode !== event.mode
    || response.source_sha !== sourceSha
    || response.source_tree !== sourceTree
    || response.packet_sha256 !== packet.packet_sha256
    || response.claims?.generic_ledger_authority_preserved !== true
    || response.claims?.projection_data_written !== false
    || response.claims?.consumer_rollout_performed !== false
    || response.claims?.raw_value_returned !== false
    || response.claims?.pii_returned !== false
    || response.claims?.secret_material_returned !== false
    || response.safe_counts?.projection_data_write_count !== 0
    || response.safe_counts?.source_authority_write_count !== 0
    || response.safe_counts?.consumer_route_change_count !== 0
    || (event.mode === "inventory-read"
      && (response.inventory?.inventory_sha256 == null
        || response.schema == null
        || response.provenance?.provenance_sha256
          !== response.inventory.inventory_provenance_sha256))) {
    throw new Error(
      "W15 inventory bootstrap result failed its closed authority gate",
    );
  }
  result = {
    schema_version:
      "law-firm-os.json-postgres-w15-bootstrap-invocation-evidence.v1",
    operation,
    outcome: "PASS",
    caller,
    function_name: functionName,
    mode: event.mode,
    attempt_ref: event.attempt_ref,
    response_path: invocationPath,
    response_sha256: sha256ProgramBytes(responseBytes),
    result_sha256: response.result_sha256,
    execution_evidence_sha256: response.execution_evidence_sha256,
    ...(event.mode === "inventory-read" ? {
      inventory_sha256: response.inventory.inventory_sha256,
      inventory_provenance_sha256:
        response.inventory.inventory_provenance_sha256,
    } : {}),
    projection_data_write_count: 0,
    source_authority_write_count: 0,
    consumer_route_change_count: 0,
    raw_value_returned: false,
    pii_returned: false,
    secret_material_returned: false,
    aws_mutation_count: 1,
    production_write_count: 0,
  };
} else if (operation === "w15-invoke-projection") {
  const stack = currentStack(JSON_POSTGRES_PRODUCTION_STACK);
  if (!stack) throw new Error("production stack does not exist");
  const parameters = parameterMap(stack);
  assertJsonPostgresProductionStack(stack, {
    packet,
    artifactVersion: parameters.ArtifactVersion,
    trustRegistrySha256: registrySha256,
    trafficEnabled: true,
    eniBootstrapEnabled: false,
    projectionWorkerEnabled:
      parameters.EnableProjectionWorker === "true",
  });
  validateEniAuthorityRemoved({ includeProjection: true });
  const eventPath = requiredOption("--projection-event");
  const event = readPrivateProgramJson(eventPath, "W15 projection event");
  validateJsonPostgresW15ProjectionEvent(event, {
    packet: packetSource,
    artifactSha256: packet.bindings.artifact_sha256,
  });
  const readOnly = ["readback", "reconcile"].includes(event.mode);
  const functionName = readOnly
    ? "lawos-production-projection-auditor"
    : "lawos-production-admin";
  const invocationPath = join(
    evidenceDir,
    `w15-${event.attempt_ref}-response.json`,
  );
  const invocation = awsJson([
    "lambda", "invoke",
    "--function-name", functionName,
    "--invocation-type", "RequestResponse",
    "--cli-binary-format", "raw-in-base64-out",
    "--payload", `fileb://${eventPath}`,
    invocationPath,
  ]);
  if (invocation.FunctionError || !existsSync(invocationPath)) {
    throw new Error("W15 projection Lambda invocation failed");
  }
  chmodSync(invocationPath, 0o600);
  const responseBytes = readFileSync(invocationPath);
  const response = JSON.parse(responseBytes);
  const zeroKeys = [
    "source_authority_write_count",
    "dual_write_count",
    "partial_commit_count",
    "tenant_negative_visible_count",
    "projection_authority_promotion_count",
    "authority_promotion_count",
    "json_fallback_count",
  ];
  if (response.outcome !== "PASS"
    || response.action !== "lawos-json-postgres-relational-projection"
    || response.phase !== "w15-relational-projection"
    || response.source_sha !== sourceSha
    || response.source_tree !== sourceTree
    || response.packet_sha256 !== packet.packet_sha256
    || zeroKeys.some((key) =>
      response.safe_counts?.[key] != null
      && response.safe_counts[key] !== 0)
    || response.claims?.generic_ledger_authority_preserved !== true
    || response.claims?.raw_value_returned !== false
    || response.claims?.pii_returned !== false
    || response.claims?.secret_material_returned !== false
    || (event.mode === "rollout"
      && (response.mode !== "rollout"
        || response.rollout_action !== event.rollout_action))
    || (event.backfill_wave != null
      && response.backfill_wave !== event.backfill_wave)) {
    throw new Error("W15 projection Lambda result failed the authority gate");
  }
  result = {
    schema_version:
      "law-firm-os.json-postgres-w15-invocation-evidence.v1",
    operation,
    outcome: "PASS",
    caller,
    function_name: functionName,
    mode: event.mode,
    attempt_ref: event.attempt_ref,
    response_sha256: sha256ProgramBytes(responseBytes),
    result_sha256: response.result_sha256,
    execution_evidence_sha256: response.execution_evidence_sha256
      ?? response.validation_evidence_sha256,
    source_authority_write_count: 0,
    projection_authority_promotion_count: 0,
    raw_value_returned: false,
    pii_returned: false,
    secret_material_returned: false,
    aws_mutation_count: 1,
    production_write_count: 0,
  };
} else if (operation === "w15-create-worker-enable-change-set") {
  const backfill = verifiedReceipt(
    requiredOption("--backfill-wave-5-receipt"),
    "w15-backfill-wave-5",
    trustRegistry,
    packet,
  );
  const workerEventPath = requiredOption("--worker-event");
  const workerEvent = readPrivateProgramJson(
    workerEventPath,
    "W15 projection worker event",
  );
  if (workerEvent.action !== "lawos-json-postgres-relational-projection"
    || workerEvent.phase !== "w15-relational-projection"
    || workerEvent.mode !== "resume"
    || workerEvent.source_sha !== sourceSha
    || workerEvent.source_tree !== sourceTree
    || workerEvent.artifact_sha256 !== packet.bindings.artifact_sha256
    || workerEvent.packet_sha256 !== packet.packet_sha256) {
    throw new Error("W15 projection worker event exact binding drifted");
  }
  validateJsonPostgresW15ProjectionEvent(workerEvent, {
    packet: packetSource,
    artifactSha256: packet.bindings.artifact_sha256,
  });
  const mappingLocator = normalizeImmutableProgramInputLocator(
    workerEvent.inputs.mapping_manifest,
    {
      bucket: packet.target.program_input_bucket_name,
      expectedBucketOwner:
        packet.target.program_input_expected_bucket_owner,
    },
  );
  const validationLocator = normalizeImmutableProgramInputLocator(
    workerEvent.inputs.validation_evidence,
    {
      bucket: packet.target.program_input_bucket_name,
      expectedBucketOwner:
        packet.target.program_input_expected_bucket_owner,
    },
  );
  const stack = currentStack(JSON_POSTGRES_PRODUCTION_STACK);
  if (!stack) throw new Error("production stack does not exist");
  const current = parameterMap(stack);
  const outputs = outputMap(stack);
  const internalUpdateBinding =
    resolveCurrentInternalUpdateBinding(current);
  assertJsonPostgresProductionStack(stack, {
    packet,
    artifactVersion: current.ArtifactVersion,
    trustRegistrySha256: registrySha256,
    trafficEnabled: true,
    eniBootstrapEnabled: false,
    projectionWorkerEnabled: false,
    internalUpdateBrokerBinding: internalUpdateBinding,
  });
  validateEniAuthorityRemoved({ includeProjection: true });
  const resolvedProgramInputKey = awsJson([
    "kms", "describe-key",
    "--key-id", packet.target.program_input_kms_key_ref,
  ]).KeyMetadata?.Arn;
  if (outputs.ProgramInputBucketName
      !== packet.target.program_input_bucket_name
    || !outputs.ProgramInputKmsKeyArn
    || resolvedProgramInputKey !== outputs.ProgramInputKmsKeyArn) {
    throw new Error("production program-input storage binding drifted");
  }
  const workerEventSha256 = sha256ProgramBytes(
    readPrivateProgramBytes(workerEventPath, "W15 projection worker event"),
  );
  const workerEventKey =
    `program-input/${packet.packet_sha256}/w15-worker-event/`
    + `${sourceSha}/${workerEventSha256}.json`;
  const storedWorkerEvent = putImmutableProductionObject({
    key: workerEventKey,
    path: workerEventPath,
    expectedSha256: workerEventSha256,
    kmsKeyArn: outputs.ProgramInputKmsKeyArn,
    contentType: "application/json",
    allowUpload: true,
    bucket: packet.target.program_input_bucket_name,
    inputKind: "w15-worker-event",
  });
  const workerEventLocator =
    createJsonPostgresProductionWorkerEventLocator({
      packet,
      key: workerEventKey,
      versionId: storedWorkerEvent.version_id,
      sha256: storedWorkerEvent.sha256,
      byteSize: storedWorkerEvent.byte_size,
    });
  const serializedWorkerEventLocator = JSON.stringify(workerEventLocator);
  if (Buffer.byteLength(serializedWorkerEventLocator) > 640) {
    throw new Error("W15 projection worker event locator exceeds the CloudFormation parameter limit");
  }
  const apiEnvironment = {
    ...(awsJson([
      "lambda", "get-function-configuration",
      "--function-name", "lawos-production-api",
    ]).Environment?.Variables ?? {}),
    LAWOS_HRX_RELATIONAL_PROJECTION_ENABLED: "true",
    LAWOS_HRX_RELATIONAL_PROJECTION_EVENT_LOCATOR:
      serializedWorkerEventLocator,
  };
  delete apiEnvironment.LAWOS_HRX_RELATIONAL_PROJECTION_MAPPING_OBJECT_KEY;
  delete apiEnvironment.LAWOS_HRX_RELATIONAL_PROJECTION_VALIDATION_OBJECT_KEY;
  const apiEnvironmentSizeBytes = assertLambdaEnvironmentBudget(apiEnvironment).size_bytes;
  const parameters = {
    ...current,
    EnableExternalReadProviders: "false",
    ExternalReadProviderPackSecretName:
      JSON_POSTGRES_EXTERNAL_READ_DISABLED_PACK_SECRET_NAME,
    ExternalReadProviderPackSha256:
      JSON_POSTGRES_EXTERNAL_READ_DISABLED_PACK_SHA256,
    EnableOutlookConversationWorker: "false",
    ClientOutlookM365ConfigSecretName:
      JSON_POSTGRES_OUTLOOK_DISABLED_CONFIG_SECRET_NAME,
    ClientOutlookCredentialSecretPrefix:
      JSON_POSTGRES_OUTLOOK_DISABLED_CREDENTIAL_SECRET_PREFIX,
    EnableProjectionWorker: "true",
    ProjectionWorkerEventJson: serializedWorkerEventLocator,
    HrxProjectionMappingObjectKey: mappingLocator.key,
    HrxProjectionValidationObjectKey: validationLocator.key,
  };
  const review = createChangeSet({
    stackName: JSON_POSTGRES_PRODUCTION_STACK,
    type: "UPDATE",
    templatePath: productionTemplatePath,
    template: productionTemplate,
    templateSha256: productionValidation.template_sha256,
    parameters,
    label: "w15-worker-enable",
    w15: true,
    w15InternalUpdateBinding: internalUpdateBinding,
  });
  assertReviewedChangeSubset(
    review,
    W15_WORKER_TOGGLE_CHANGE_IDS,
    "W15 worker enable",
  );
  result = {
    schema_version:
      "law-firm-os.json-postgres-production-reviewed-change-set.v1",
    operation,
    outcome: "PASS",
    caller,
    ...review,
    purpose: "w15-incremental-worker-enable",
    artifact_version: current.ArtifactVersion,
    backfill_wave_5_receipt_sha256: backfill.canonical_sha256,
    worker_event_sha256: workerEventSha256,
    worker_event_locator: workerEventLocator,
    worker_event_locator_sha256:
      sha256ProgramBytes(serializedWorkerEventLocator),
    worker_event_upload_mutation_count: storedWorkerEvent.mutation_count,
    api_environment_size_bytes: apiEnvironmentSizeBytes,
    api_environment_headroom_bytes:
      AWS_LAMBDA_ENVIRONMENT_MAX_BYTES - apiEnvironmentSizeBytes,
    hrx_projection_mapping_object_key: mappingLocator.key,
    hrx_projection_validation_object_key: validationLocator.key,
    production_traffic_enabled: true,
    projection_worker_enabled: false,
    internal_update_broker_enabled: internalUpdateBinding != null,
    ...(internalUpdateBinding ? {
      internal_update_binding_sha256:
        jsonPostgresProductionParametersSha256(internalUpdateBinding),
    } : {}),
    aws_mutation_count: 1 + storedWorkerEvent.mutation_count,
    production_write_count: 0,
  };
} else if (operation === "w15-execute-worker-enable-change-set") {
  const backfill = verifiedReceipt(
    requiredOption("--backfill-wave-5-receipt"),
    "w15-backfill-wave-5",
    trustRegistry,
    packet,
  );
  const review = readPrivateProgramJson(
    requiredOption("--reviewed-change-set"),
    "reviewed W15 worker enable change set",
  );
  if (review?.schema_version
      !== "law-firm-os.json-postgres-production-reviewed-change-set.v1"
    || review.purpose !== "w15-incremental-worker-enable"
    || review.outcome !== "PASS"
    || review.stack_name !== JSON_POSTGRES_PRODUCTION_STACK
    || review.backfill_wave_5_receipt_sha256
      !== backfill.canonical_sha256
    || review.worker_event_locator_sha256
      !== sha256ProgramBytes(JSON.stringify(review.worker_event_locator))
    || !/^[A-Za-z0-9][A-Za-z0-9._/-]{0,511}$/u
      .test(review.hrx_projection_mapping_object_key ?? "")
    || !/^[A-Za-z0-9][A-Za-z0-9._/-]{0,511}$/u
      .test(review.hrx_projection_validation_object_key ?? "")
    || review.hrx_projection_mapping_object_key
      === JSON_POSTGRES_DISABLED_HRX_MAPPING_OBJECT_KEY
    || review.hrx_projection_validation_object_key
      === JSON_POSTGRES_DISABLED_HRX_VALIDATION_OBJECT_KEY) {
    throw new Error("reviewed W15 worker enable change set is invalid");
  }
  const verifiedWorkerEventLocator =
    createJsonPostgresProductionWorkerEventLocator({
      packet,
      key: review.worker_event_locator?.key,
      versionId: review.worker_event_locator?.version_id,
      sha256: review.worker_event_locator?.sha256,
      byteSize: review.worker_event_locator?.byte_size,
    });
  if (JSON.stringify(verifiedWorkerEventLocator)
      !== JSON.stringify(review.worker_event_locator)) {
    throw new Error("reviewed W15 worker event locator binding drifted");
  }
  assertReviewedChangeSubset(
    review,
    W15_WORKER_TOGGLE_CHANGE_IDS,
    "W15 worker enable",
  );
  const current = parameterMap(currentStack(JSON_POSTGRES_PRODUCTION_STACK));
  const internalUpdateBinding =
    resolveCurrentInternalUpdateBinding(current);
  if (review.internal_update_broker_enabled
      !== (internalUpdateBinding != null)
    || (internalUpdateBinding
      && review.internal_update_binding_sha256
        !== jsonPostgresProductionParametersSha256(internalUpdateBinding))) {
    throw new Error("reviewed W15 worker update broker binding drifted");
  }
  const updated = executeReviewedChangeSet(review, {
    w15InternalUpdateBinding: internalUpdateBinding,
  });
  assertJsonPostgresProductionStack(updated, {
    packet,
    artifactVersion: review.artifact_version,
    trustRegistrySha256: registrySha256,
    trafficEnabled: true,
    eniBootstrapEnabled: false,
    projectionWorkerEnabled: true,
    internalUpdateBrokerBinding: internalUpdateBinding,
  });
  validateEniAuthorityRemoved({ includeProjection: true });
  const rule = awsJson([
    "events", "describe-rule",
    "--name", "lawos-production-projection-worker",
  ]);
  if (rule.State !== "ENABLED") {
    throw new Error("W15 projection worker did not enter the approved state");
  }
  result = {
    operation,
    outcome: "PASS",
    caller,
    stack_status: updated.StackStatus,
    backfill_wave_5_receipt_sha256: backfill.canonical_sha256,
    production_traffic_enabled: true,
    projection_worker_enabled: true,
    internal_update_broker_enabled: internalUpdateBinding != null,
    temporary_eni_allow_count: 0,
    aws_mutation_count: 1,
    production_write_count: 0,
  };
} else if (operation === "w15-create-worker-disable-change-set") {
  const stack = currentStack(JSON_POSTGRES_PRODUCTION_STACK);
  if (!stack) throw new Error("production stack does not exist");
  const current = parameterMap(stack);
  const internalUpdateBinding =
    resolveCurrentInternalUpdateBinding(current);
  assertJsonPostgresProductionStack(stack, {
    packet,
    artifactVersion: current.ArtifactVersion,
    trustRegistrySha256: registrySha256,
    trafficEnabled: true,
    eniBootstrapEnabled: false,
    projectionWorkerEnabled: true,
    internalUpdateBrokerBinding: internalUpdateBinding,
  });
  validateEniAuthorityRemoved({ includeProjection: true });
  const parameters = {
    ...current,
    EnableExternalReadProviders: "false",
    ExternalReadProviderPackSecretName:
      JSON_POSTGRES_EXTERNAL_READ_DISABLED_PACK_SECRET_NAME,
    ExternalReadProviderPackSha256:
      JSON_POSTGRES_EXTERNAL_READ_DISABLED_PACK_SHA256,
    EnableOutlookConversationWorker: "false",
    ClientOutlookM365ConfigSecretName:
      JSON_POSTGRES_OUTLOOK_DISABLED_CONFIG_SECRET_NAME,
    ClientOutlookCredentialSecretPrefix:
      JSON_POSTGRES_OUTLOOK_DISABLED_CREDENTIAL_SECRET_PREFIX,
    EnableProjectionWorker: "false",
    ProjectionWorkerEventJson: "{}",
    HrxProjectionMappingObjectKey:
      JSON_POSTGRES_DISABLED_HRX_MAPPING_OBJECT_KEY,
    HrxProjectionValidationObjectKey:
      JSON_POSTGRES_DISABLED_HRX_VALIDATION_OBJECT_KEY,
  };
  const review = createChangeSet({
    stackName: JSON_POSTGRES_PRODUCTION_STACK,
    type: "UPDATE",
    templatePath: productionTemplatePath,
    template: productionTemplate,
    templateSha256: productionValidation.template_sha256,
    parameters,
    label: "w15-worker-disable",
    w15: true,
    w15InternalUpdateBinding: internalUpdateBinding,
  });
  assertReviewedChangeSubset(
    review,
    W15_WORKER_TOGGLE_CHANGE_IDS,
    "W15 worker disable",
  );
  result = {
    schema_version:
      "law-firm-os.json-postgres-production-reviewed-change-set.v1",
    operation,
    outcome: "PASS",
    caller,
    ...review,
    purpose: "w15-incremental-worker-disable",
    artifact_version: current.ArtifactVersion,
    production_traffic_enabled: true,
    projection_worker_enabled: true,
    internal_update_broker_enabled: internalUpdateBinding != null,
    ...(internalUpdateBinding ? {
      internal_update_binding_sha256:
        jsonPostgresProductionParametersSha256(internalUpdateBinding),
    } : {}),
    aws_mutation_count: 1,
    production_write_count: 0,
  };
} else if (operation === "w15-execute-worker-disable-change-set") {
  const review = readPrivateProgramJson(
    requiredOption("--reviewed-change-set"),
    "reviewed W15 worker disable change set",
  );
  if (review?.schema_version
      !== "law-firm-os.json-postgres-production-reviewed-change-set.v1"
    || review.purpose !== "w15-incremental-worker-disable"
    || review.outcome !== "PASS"
    || review.stack_name !== JSON_POSTGRES_PRODUCTION_STACK
    || review.projection_worker_enabled !== true) {
    throw new Error("reviewed W15 worker disable change set is invalid");
  }
  assertReviewedChangeSubset(
    review,
    W15_WORKER_TOGGLE_CHANGE_IDS,
    "W15 worker disable",
  );
  const current = parameterMap(currentStack(JSON_POSTGRES_PRODUCTION_STACK));
  const internalUpdateBinding =
    resolveCurrentInternalUpdateBinding(current);
  if (review.internal_update_broker_enabled
      !== (internalUpdateBinding != null)
    || (internalUpdateBinding
      && review.internal_update_binding_sha256
        !== jsonPostgresProductionParametersSha256(internalUpdateBinding))) {
    throw new Error("reviewed W15 worker rollback broker binding drifted");
  }
  const updated = executeReviewedChangeSet(review, {
    w15InternalUpdateBinding: internalUpdateBinding,
  });
  assertJsonPostgresProductionStack(updated, {
    packet,
    artifactVersion: review.artifact_version,
    trustRegistrySha256: registrySha256,
    trafficEnabled: true,
    eniBootstrapEnabled: false,
    projectionWorkerEnabled: false,
    internalUpdateBrokerBinding: internalUpdateBinding,
  });
  validateEniAuthorityRemoved({ includeProjection: true });
  const rule = awsJson([
    "events", "describe-rule",
    "--name", "lawos-production-projection-worker",
  ]);
  if (rule.State !== "DISABLED") {
    throw new Error("W15 projection worker rollback did not disable the schedule");
  }
  result = {
    operation,
    outcome: "PASS",
    caller,
    stack_status: updated.StackStatus,
    production_traffic_enabled: true,
    projection_worker_enabled: false,
    internal_update_broker_enabled: internalUpdateBinding != null,
    temporary_eni_allow_count: 0,
    aws_mutation_count: 1,
    production_write_count: 0,
  };
} else if (operation === "create-internal-update-broker-change-set") {
  const binding = requiredInternalUpdateBinding();
  const stack = currentStack(JSON_POSTGRES_PRODUCTION_STACK);
  if (!stack) throw new Error("production stack does not exist");
  const current = parameterMap(stack);
  const projectionWorkerEnabled = current.EnableProjectionWorker === "true";
  assertJsonPostgresProductionStack(stack, {
    packet,
    artifactVersion: current.ArtifactVersion,
    trustRegistrySha256: registrySha256,
    trafficEnabled: true,
    eniBootstrapEnabled: false,
    projectionWorkerEnabled,
  });
  validateEniAuthorityRemoved({ includeProjection: true });
  const distribution = assertInternalUpdateDistributionState(binding);
  const parameters = {
    ...current,
    ...buildJsonPostgresAmicInternalUpdateBrokerParameters(binding),
  };
  const review = createChangeSet({
    stackName: JSON_POSTGRES_PRODUCTION_STACK,
    type: "UPDATE",
    templatePath: productionTemplatePath,
    template: productionTemplate,
    templateSha256: productionValidation.template_sha256,
    parameters,
    label: "amic-internal-update-broker",
    internalUpdateBinding: binding,
  });
  result = {
    schema_version:
      "law-firm-os.json-postgres-production-reviewed-change-set.v1",
    operation,
    outcome: "PASS",
    caller,
    ...review,
    artifact_version: current.ArtifactVersion,
    production_traffic_enabled: true,
    projection_worker_enabled: projectionWorkerEnabled,
    distribution,
    aws_mutation_count: 1,
    production_write_count: 0,
  };
} else if (operation === "execute-internal-update-broker-change-set") {
  const binding = requiredInternalUpdateBinding();
  const review = readPrivateProgramJson(
    requiredOption("--reviewed-change-set"),
    "reviewed AMIC internal update broker change set",
  );
  if (review?.schema_version
      !== "law-firm-os.json-postgres-production-reviewed-change-set.v1"
    || review.purpose !== "amic-internal-update-broker-activation"
    || review.outcome !== "PASS"
    || review.stack_name !== JSON_POSTGRES_PRODUCTION_STACK
    || review.internal_update_binding_sha256
      !== jsonPostgresProductionParametersSha256(binding)
    || review.production_traffic_enabled !== true
    || typeof review.projection_worker_enabled !== "boolean") {
    throw new Error("reviewed AMIC internal update broker change set is invalid");
  }
  const distribution = assertInternalUpdateDistributionState(binding);
  const updated = executeReviewedChangeSet(review, {
    internalUpdateBinding: binding,
  });
  assertJsonPostgresProductionStack(updated, {
    packet,
    artifactVersion: review.artifact_version,
    trustRegistrySha256: registrySha256,
    trafficEnabled: true,
    eniBootstrapEnabled: false,
    projectionWorkerEnabled: review.projection_worker_enabled,
    internalUpdateBrokerBinding: binding,
  });
  validateEniAuthorityRemoved({ includeProjection: true });
  const runtime = assertInternalUpdateApiEnvironment(binding);
  result = {
    operation,
    outcome: "PASS",
    caller,
    stack_status: updated.StackStatus,
    internal_update_binding_sha256:
      jsonPostgresProductionParametersSha256(binding),
    distribution,
    runtime,
    production_traffic_enabled: true,
    internal_update_broker_enabled: true,
    projection_worker_enabled: review.projection_worker_enabled,
    temporary_eni_allow_count: 0,
    aws_mutation_count: 1,
    production_write_count: 0,
  };
} else if (operation === "verify-internal-update-broker") {
  const binding = requiredInternalUpdateBinding();
  const stack = currentStack(JSON_POSTGRES_PRODUCTION_STACK);
  if (!stack) throw new Error("production stack does not exist");
  const current = parameterMap(stack);
  const projectionWorkerEnabled = current.EnableProjectionWorker === "true";
  assertJsonPostgresProductionStack(stack, {
    packet,
    artifactVersion: current.ArtifactVersion,
    trustRegistrySha256: registrySha256,
    trafficEnabled: true,
    eniBootstrapEnabled: false,
    projectionWorkerEnabled,
    internalUpdateBrokerBinding: binding,
  });
  const eni = validateEniAuthorityRemoved({ includeProjection: true });
  result = {
    operation,
    outcome: "PASS",
    caller,
    stack_status: stack.StackStatus,
    internal_update_binding_sha256:
      jsonPostgresProductionParametersSha256(binding),
    distribution: assertInternalUpdateDistributionState(binding),
    runtime: assertInternalUpdateApiEnvironment(binding),
    ...eni,
    production_traffic_enabled: true,
    internal_update_broker_enabled: true,
    projection_worker_enabled: projectionWorkerEnabled,
    aws_mutation_count: 0,
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
    "OutlookConversationWorkerFunction",
    "OutlookConversationWorkerSchedule",
    "OutlookConversationWorkerInvokePermission",
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
    "OutlookConversationWorkerFunction",
    "OutlookConversationWorkerSchedule",
    "OutlookConversationWorkerInvokePermission",
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
    "OutlookConversationWorkerFunction",
    "OutlookConversationWorkerSchedule",
    "OutlookConversationWorkerInvokePermission",
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
    "OutlookConversationWorkerFunction",
    "OutlookConversationWorkerSchedule",
    "OutlookConversationWorkerInvokePermission",
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
