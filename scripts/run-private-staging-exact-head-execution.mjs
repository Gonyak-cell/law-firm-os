#!/usr/bin/env node
import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { buildPrivateStagingSyntheticSources } from "./lib/private-staging-artifact.mjs";
import {
  assertPrivateStagingBucket,
  assertPrivateStagingBudget,
  assertPrivateStagingCallerIdentity,
  assertPrivateStagingChangeSet,
  assertPrivateStagingCut005Result,
  assertPrivateStagingCut006Result,
  assertPrivateStagingLambdaConfiguration,
  assertPrivateStagingRds,
  assertPrivateStagingSesReadiness,
  buildPrivateStagingAdminEvent,
  buildPrivateStagingColdGenerationPhases,
  buildPrivateStagingExecutionReceipt,
  buildPrivateStagingStackParameters,
  sha256AwsEvidence,
  validatePrivateStagingExecutionInputs,
} from "./lib/private-staging-aws-execution.mjs";
import { runPrivateStagingForestBrowserSmoke } from "./lib/private-staging-browser-smoke.mjs";
import { createPrivateStagingHttpTransport, runPrivateStagingCut007 } from "./lib/private-staging-cut007.mjs";
import {
  PRIVATE_STAGING_EXACT_HEAD_ACTION,
  privateStagingPacketSha256,
  validatePrivateStagingExactHeadPacket,
} from "./lib/private-staging-exact-head-authority.mjs";
import {
  privateStagingReceiptSignerScope,
  resolvePrivateStagingReceiptSigner,
  verifyPrivateStagingExecutionReceipt,
} from "./lib/private-staging-execution-receipt.mjs";
import { canonicalSha256, validatePrivateStagingCost, validatePrivateStagingTemplate } from "./lib/private-staging-contract.mjs";
import { validateRuntimeSafetyApprovalBundle } from "./lib/runtime-safety-approval-contract.mjs";

const ACCOUNT_ID = "770880870480";
const REGION = "ap-northeast-2";
const STACK_NAME = "lawos-private-staging";
const ARTIFACT_BUCKET = `lawos-private-staging-artifacts-${ACCOUNT_ID}-${REGION}`;
const ADMIN_FUNCTION = "lawos-private-staging-admin";
const API_FUNCTION = "lawos-private-staging-api";
const PHASES = new Set(["preflight", "deploy", "cut005", "cut006", "cut007", "all"]);
const SYNTHETIC_MANIFEST = JSON.parse(JSON.parse(readFileSync("infra/lawos-private-staging/template.json", "utf8")).Resources.SyntheticManifestSecret.Properties.SecretString);
let artifactVersionId = null;
let ownerAuthorization = null;

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

function ed25519SignatureBase64(bytes) {
  if (bytes.length === 64) return bytes.toString("base64");
  const text = bytes.toString("utf8").trim();
  const decoded = /^[a-f0-9]{128}$/iu.test(text) ? Buffer.from(text, "hex") : Buffer.from(text, "base64");
  if (decoded.length !== 64) throw new Error("owner approval signature is not Ed25519");
  return decoded.toString("base64");
}

function git(...args) {
  return execFileSync("git", args, { cwd: process.cwd(), encoding: "utf8" }).trim();
}

function privateRegularFile(candidate, name, { outsideWorktree = true } = {}) {
  const input = resolve(candidate);
  if (!existsSync(input) || lstatSync(input).isSymbolicLink()) throw new Error(`${name} must be an existing non-symlink file`);
  const path = realpathSync(input);
  if (!statSync(path).isFile() || (statSync(path).mode & 0o077) !== 0) throw new Error(`${name} must be a private 0600 regular file`);
  if (outsideWorktree) {
    const rel = relative(realpathSync(process.cwd()), path);
    if (!(rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel))) throw new Error(`${name} must remain outside the worktree`);
  }
  return path;
}

function outsideWorktreeDirectory(candidate) {
  const root = realpathSync(process.cwd());
  const input = resolve(candidate);
  let parent = input;
  while (!existsSync(parent)) parent = dirname(parent);
  const path = resolve(realpathSync(parent), relative(parent, input));
  const rel = relative(root, path);
  if (!(rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel))) throw new Error("execution evidence must remain outside the worktree");
  if (existsSync(path) && lstatSync(path).isSymbolicLink()) throw new Error("execution evidence directory cannot be a symlink");
  mkdirSync(path, { recursive: true, mode: 0o700 });
  chmodSync(path, 0o700);
  return path;
}

function writePrivateJson(directory, name, value) {
  const path = resolve(directory, name);
  if (existsSync(path)) throw new Error(`execution evidence already exists: ${basename(path)}`);
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, { flag: "wx", mode: 0o600 });
  chmodSync(path, 0o600);
  return Object.freeze({ path, sha256: sha256(readFileSync(path)) });
}

function progress(phase, status, safe = {}) {
  process.stdout.write(`${JSON.stringify({ phase, status, ...safe })}\n`);
}

function awsArgs(args, { region = true } = {}) {
  return [
    ...args,
    "--profile", awsProfile,
    ...(region ? ["--region", REGION] : []),
    "--no-cli-pager",
    "--output", "json",
  ];
}

function awsJson(args, options = {}) {
  const text = execFileSync("aws", awsArgs(args, options), {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
  return text ? JSON.parse(text) : {};
}

function awsWait(args) {
  execFileSync("aws", awsArgs(args), {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 4 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function awsTryJson(args) {
  const result = spawnSync("aws", awsArgs(args), { cwd: process.cwd(), encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  if (result.status === 0) return JSON.parse(result.stdout || "{}");
  if (/(?:does not exist|not found|NoSuchEntity|NoSuchBucket|ResourceNotFoundException)/iu.test(result.stderr ?? "")) return null;
  throw new Error(`AWS read failed (${sha256(result.stderr ?? "").slice(0, 16)})`);
}

function stackParameterArgs(parameters) {
  return parameters.map(({ key, value }) => `ParameterKey=${key},ParameterValue=${value}`);
}

function stackOutputMap(stack) {
  return Object.fromEntries((stack?.Outputs ?? []).map(({ OutputKey, OutputValue }) => [OutputKey, OutputValue]));
}

function stackParameterMap(stack) {
  return Object.fromEntries((stack?.Parameters ?? []).map(({ ParameterKey, ParameterValue }) => [ParameterKey, ParameterValue]));
}

function assertExactExistingStack(stack) {
  const parameters = stackParameterMap(stack);
  for (const [key, expected] of [["SourceSha", packet.source_sha], ["SourceTree", packet.source_tree], ["ArtifactSha256", packet.artifact_sha256], ["OwnerInstructionSha256", packet.packet_sha256], ["OwnerTrustRegistrySha256", registrySha256]]) {
    if (parameters[key] !== expected) throw new Error(`existing private staging stack ${key} does not match the approved exact head`);
  }
  if (!parameters.ArtifactVersion) throw new Error("existing private staging stack has no immutable artifact version");
  if (artifactVersionId && parameters.ArtifactVersion !== artifactVersionId) throw new Error("existing private staging stack artifact version drifted");
  artifactVersionId = parameters.ArtifactVersion;
  if (!/(?:CREATE|UPDATE)_COMPLETE/u.test(stack.StackStatus ?? "")) throw new Error(`private staging stack is not complete: ${stack.StackStatus ?? "unknown"}`);
}

function createAndExecuteChangeSet({
  parameters,
  label,
  mode,
  allowedModifiedLogicalIds = [],
  allowedRemovedLogicalIds = [],
  allowedConditionalReplacementLogicalIds = [],
}) {
  const changeSetName = `lawos-${label}-${packet.source_sha.slice(0, 12)}-${Date.now().toString(36)}`;
  progress(`cloudformation-${label}`, "creating", { change_set_fingerprint: sha256(changeSetName) });
  const created = awsJson([
    "cloudformation", "create-change-set",
    "--stack-name", STACK_NAME,
    "--change-set-name", changeSetName,
    "--change-set-type", mode === "create" ? "CREATE" : "UPDATE",
    "--template-body", `file://${cloudFormationTemplatePath}`,
    "--capabilities", "CAPABILITY_NAMED_IAM",
    "--parameters", ...stackParameterArgs(parameters),
    "--description", `Exact-head synthetic-only LawOS private staging ${label}`,
  ]);
  awsWait(["cloudformation", "wait", "change-set-create-complete", "--change-set-name", created.Id]);
  const described = awsJson(["cloudformation", "describe-change-set", "--change-set-name", created.Id]);
  const review = assertPrivateStagingChangeSet(described, {
    mode,
    allowedModifiedLogicalIds,
    allowedRemovedLogicalIds,
    allowedConditionalReplacementLogicalIds,
  });
  const evidence = writePrivateJson(changeSetDir, `${label}-change-set.json`, described);
  progress(`cloudformation-${label}`, "reviewed", { change_count: review.change_count, protected_resource_change_count: 0, evidence_sha256: evidence.sha256 });
  awsJson(["cloudformation", "execute-change-set", "--change-set-name", created.Id]);
  awsWait(["cloudformation", "wait", mode === "create" ? "stack-create-complete" : "stack-update-complete", "--stack-name", STACK_NAME]);
  const stack = awsJson(["cloudformation", "describe-stacks", "--stack-name", STACK_NAME]).Stacks?.[0];
  assertExactExistingStack(stack);
  progress(`cloudformation-${label}`, "complete", { stack_status: stack.StackStatus });
  return stack;
}

function assertCloudFormationTemplateApi() {
  const result = awsJson(["cloudformation", "validate-template", "--template-body", `file://${cloudFormationTemplatePath}`]);
  const parameterKeys = new Set((result.Parameters ?? []).map((parameter) => parameter.ParameterKey));
  for (const required of ["SourceSha", "SourceTree", "ArtifactSha256", "ArtifactVersion", "OwnerInstructionSha256", "OwnerTrustRegistrySha256", "EnableLambdaEniBootstrap", "RuntimeGeneration"]) {
    if (!parameterKeys.has(required)) throw new Error(`CloudFormation validation omitted required parameter ${required}`);
  }
  return Object.freeze({ cloudformation_template_valid_count: 1, cloudformation_parameter_count: parameterKeys.size });
}

function currentStack() {
  const result = awsTryJson(["cloudformation", "describe-stacks", "--stack-name", STACK_NAME]);
  return result?.Stacks?.[0] ?? null;
}

function protectedResourceFingerprint() {
  const rds = awsJson(["rds", "describe-db-instances", "--db-instance-identifier", "amic-vault-staging-postgres"]).DBInstances?.[0];
  const lambda = awsJson(["lambda", "get-function-configuration", "--function-name", "matter-lawos-api-staging"]);
  return sha256AwsEvidence({
    rds: {
      arn: rds?.DBInstanceArn,
      id: rds?.DBInstanceIdentifier,
      engine_version: rds?.EngineVersion,
      publicly_accessible: rds?.PubliclyAccessible,
      vpc_id: rds?.DBSubnetGroup?.VpcId,
      status: rds?.DBInstanceStatus,
    },
    lambda: {
      arn: lambda?.FunctionArn,
      role: lambda?.Role,
      vpc_id: lambda?.VpcConfig?.VpcId ?? null,
      code_sha256: lambda?.CodeSha256,
      last_modified: lambda?.LastModified,
    },
  });
}

function assertArtifactStore() {
  const versioning = awsJson(["s3api", "get-bucket-versioning", "--bucket", ARTIFACT_BUCKET]);
  const publicAccess = awsJson(["s3api", "get-public-access-block", "--bucket", ARTIFACT_BUCKET]);
  const encryption = awsJson(["s3api", "get-bucket-encryption", "--bucket", ARTIFACT_BUCKET]);
  if (versioning.Status !== "Enabled" || !Object.values(publicAccess.PublicAccessBlockConfiguration ?? {}).every(Boolean) || !JSON.stringify(encryption).includes("AES256")) throw new Error("artifact bucket security contract failed");
}

function assertSesPreflight() {
  const senderName = inputs.password_reset_ses_identity_arn.slice(inputs.password_reset_ses_identity_arn.indexOf("identity/") + "identity/".length);
  const account = awsJson(["sesv2", "get-account"]);
  const senderIdentity = awsJson(["sesv2", "get-email-identity", "--email-identity", senderName]);
  const syntheticSources = buildPrivateStagingSyntheticSources(syntheticIdentity);
  const recipientIdentities = account.ProductionAccessEnabled === false
    ? syntheticSources.account_seed.users.map((accountEntry) => awsJson(["sesv2", "get-email-identity", "--email-identity", accountEntry.email]))
    : [];
  return assertPrivateStagingSesReadiness({ account, senderIdentity, recipientIdentities });
}

function assertDeployedBudget() {
  const result = awsJson(["budgets", "describe-budget", "--account-id", ACCOUNT_ID, "--budget-name", "lawos-private-staging-monthly"], { region: false });
  return assertPrivateStagingBudget(result.Budget);
}

function uploadExactArtifact() {
  assertArtifactStore();
  const head = awsTryJson(["s3api", "head-object", "--bucket", ARTIFACT_BUCKET, "--key", packet.artifact_s3_key]);
  let versionId = head?.VersionId ?? null;
  if (!head) {
    progress("artifact-upload", "executing", { artifact_sha256: packet.artifact_sha256 });
    const uploaded = awsJson([
      "s3api", "put-object", "--bucket", ARTIFACT_BUCKET, "--key", packet.artifact_s3_key,
      "--body", artifactPath,
      "--server-side-encryption", "AES256",
      "--metadata", `sha256=${packet.artifact_sha256},source-sha=${packet.source_sha},data-scope=synthetic-only`,
      "--tagging", "environment=lawos-staging&system=lawos&data-scope=synthetic-only",
    ]);
    versionId = uploaded.VersionId ?? null;
  }
  if (!versionId || versionId === "null") throw new Error("artifact upload did not return an immutable S3 VersionId");
  const verified = awsJson(["s3api", "head-object", "--bucket", ARTIFACT_BUCKET, "--key", packet.artifact_s3_key, "--version-id", versionId]);
  if (verified.VersionId !== versionId || Number(verified.ContentLength) !== artifactManifest.artifact_byte_size || verified.Metadata?.sha256 !== packet.artifact_sha256 || verified.Metadata?.["source-sha"] !== packet.source_sha) throw new Error("uploaded exact-head artifact metadata or version mismatch");
  artifactVersionId = versionId;
  return verified;
}

function lambdaConfiguration(functionName) {
  const configuration = awsJson(["lambda", "get-function-configuration", "--function-name", functionName]);
  assertPrivateStagingLambdaConfiguration(configuration, {
    functionName,
    sourceSha: packet.source_sha,
    sourceTree: packet.source_tree,
    artifactSha256: packet.artifact_sha256,
    instructionSha256: packet.packet_sha256,
    ownerTrustRegistrySha256: registrySha256,
  });
  return configuration;
}

function invokeAdmin(event, label) {
  const eventFile = writePrivateJson(invokeDir, `${label}-event.json`, event);
  const responsePath = resolve(invokeDir, `${label}-response.json`);
  if (existsSync(responsePath)) throw new Error(`admin response already exists: ${label}`);
  const metadata = awsJson([
    "lambda", "invoke", "--function-name", ADMIN_FUNCTION,
    "--cli-binary-format", "raw-in-base64-out",
    "--payload", `fileb://${eventFile.path}`,
    responsePath,
  ]);
  chmodSync(responsePath, 0o600);
  if (metadata.StatusCode !== 200 || metadata.FunctionError) throw new Error(`admin Lambda invocation failed: ${label}`);
  const result = JSON.parse(readFileSync(responsePath, "utf8"));
  progress(label, result.outcome === "PASS" ? "pass" : "blocked", { response_sha256: sha256(readFileSync(responsePath)) });
  return Object.freeze({ result, responsePath, responseSha256: sha256(readFileSync(responsePath)) });
}

async function health() {
  const response = await fetch(new URL("/api/health", apiEndpoint), { signal: AbortSignal.timeout(30_000) });
  const body = await response.json();
  const contexts = Array.isArray(body.bounded_contexts) ? body.bounded_contexts : [];
  const invalidContexts = contexts.filter((context) => (
    context.postgres_authority_active !== true
    || !String(context.runtime_persistence ?? "").startsWith("postgres-")
    || context.json_fallback !== false
    || context.dual_write !== false
    || context.tenant_rls !== true
    || context.optimistic_version !== true
    || context.idempotency !== true
    || context.audit !== true
    || context.outbox !== true
  ));
  const capabilities = body.persistence_authority_capabilities ?? {};
  if (!response.ok
    || body.persistence_authority !== "postgres-v2"
    || body.auth_authority?.staff_auth_authority !== "internal-password"
    || body.runtime_safety_policy?.offline_capability !== "rejected"
    || body.synthetic_only !== true
    || body.uses_real_client_data !== false
    || contexts.length === 0
    || invalidContexts.length !== 0
    || capabilities.authority !== "postgres-v2"
    || capabilities.json_fallback !== false
    || capabilities.dual_write !== false
    || capabilities.offline_mutation !== false
    || !/^[0-9a-f]{32}$/u.test(body.runtime_instance_fingerprint ?? "")) {
    throw new Error("deployed API health authority contract failed");
  }
  return body;
}

async function forceColdGeneration(label) {
  const before = await health();
  const generation = `${label}-${Date.now().toString(36)}`;
  const currentParameters = stackParameterMap(stack);
  const phases = buildPrivateStagingColdGenerationPhases({
    currentGeneration: currentParameters.RuntimeGeneration ?? `initial-${packet.source_sha.slice(0, 12)}`,
    nextGeneration: generation,
  });
  const runPhase = (phase) => createAndExecuteChangeSet({
    parameters: buildPrivateStagingStackParameters({
      packet,
      artifactBucket: ARTIFACT_BUCKET,
      artifactVersionId,
      approvalId,
      ownerTrustRegistrySha256: registrySha256,
      inputs,
      eniBootstrap: phase.eni_bootstrap,
      runtimeGeneration: phase.runtime_generation,
    }),
    label: `${label}-${phase.label}`,
    mode: "update",
    allowedModifiedLogicalIds: phase.allowed_modified_logical_ids,
    allowedConditionalReplacementLogicalIds: phase.allowed_conditional_replacement_logical_ids,
  });
  if (currentParameters.EnableLambdaEniBootstrap !== "true") stack = runPhase(phases[0]);
  try {
    stack = runPhase(phases[1]);
    lambdaConfiguration(API_FUNCTION);
    lambdaConfiguration(ADMIN_FUNCTION);
  } finally {
    const deployed = currentStack();
    const deployedParameters = stackParameterMap(deployed);
    if (deployedParameters.EnableLambdaEniBootstrap === "true") {
      stack = runPhase(Object.freeze({ ...phases[2], runtime_generation: deployedParameters.RuntimeGeneration ?? generation }));
    }
  }
  for (const role of ["lawos-private-staging-api-role", "lawos-private-staging-admin-role"]) {
    const policies = awsJson(["iam", "list-role-policies", "--role-name", role], { region: false }).PolicyNames ?? [];
    if (policies.some((name) => name.includes("vpc-eni-bootstrap"))) throw new Error("temporary Lambda VPC ENI Allow was not removed after cold generation");
  }
  lambdaConfiguration(API_FUNCTION);
  lambdaConfiguration(ADMIN_FUNCTION);
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    const after = await health().catch(() => null);
    if (after?.runtime_instance_fingerprint && after.runtime_instance_fingerprint !== before.runtime_instance_fingerprint) {
      const contexts = after.bounded_contexts;
      const authorityEvidence = {
        bounded_context_count: contexts.length,
        file_current_authority_count: contexts.filter((context) => /(?:file|json)/iu.test(String(context.runtime_persistence ?? ""))).length,
        postgres_authority_count: contexts.filter((context) => context.postgres_authority_active === true).length,
        json_fallback_count: contexts.filter((context) => context.json_fallback !== false).length,
        dual_write_count: contexts.filter((context) => context.dual_write !== false).length,
      };
      return Object.freeze({
        outcome: "PASS",
        cold_start_observed: true,
        request_id: after.runtime_instance_fingerprint,
        before_fingerprint: sha256(before.runtime_instance_fingerprint),
        after_fingerprint: sha256(after.runtime_instance_fingerprint),
        authority_evidence: Object.freeze(authorityEvidence),
        authority_evidence_sha256: sha256AwsEvidence(authorityEvidence),
      });
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 2_000));
  }
  throw new Error(`${label} cold execution environment was not observed`);
}

function receiptCommand(kind) {
  return `node scripts/run-private-staging-exact-head-execution.mjs --phase ${kind} --private-inputs redacted`;
}

function writeReceipt(kind, startedAt, safeCounts, digests, claims) {
  const finishedAt = new Date(Math.max(Date.now(), Date.parse(startedAt) + 1)).toISOString();
  const receipt = buildPrivateStagingExecutionReceipt({
    kind,
    keyId: approvalReceipt.key_id,
    approvalId,
    packet,
    startedAt,
    finishedAt,
    command: receiptCommand(kind),
    profile: awsProfile,
    safeCounts,
    digests,
    claims,
  });
  return writePrivateJson(unsignedReceiptDir, `${receipt.receipt_id}.json`, receipt);
}

async function deploy() {
  const startedAt = new Date().toISOString();
  const beforeProtected = protectedResourceFingerprint();
  const sesReadiness = assertSesPreflight();
  uploadExactArtifact();
  stack = currentStack();
  if (stack) assertExactExistingStack(stack);
  if (!stack) {
    stack = createAndExecuteChangeSet({
      parameters: buildPrivateStagingStackParameters({ packet, artifactBucket: ARTIFACT_BUCKET, artifactVersionId, approvalId, ownerTrustRegistrySha256: registrySha256, inputs, eniBootstrap: true, runtimeGeneration: `initial-${packet.source_sha.slice(0, 12)}` }),
      label: "initial-deploy",
      mode: "create",
    });
  }
  lambdaConfiguration(API_FUNCTION);
  lambdaConfiguration(ADMIN_FUNCTION);
  const currentParameters = stackParameterMap(stack);
  if (currentParameters.EnableLambdaEniBootstrap !== "false") {
    stack = createAndExecuteChangeSet({
      parameters: buildPrivateStagingStackParameters({ packet, artifactBucket: ARTIFACT_BUCKET, artifactVersionId, approvalId, ownerTrustRegistrySha256: registrySha256, inputs, eniBootstrap: false, runtimeGeneration: currentParameters.RuntimeGeneration ?? `initial-${packet.source_sha.slice(0, 12)}` }),
      label: "remove-eni-bootstrap",
      mode: "update",
      allowedModifiedLogicalIds: ["ApiExecutionRole", "AdminExecutionRole", "ApiFunction", "AdminFunction"],
      allowedRemovedLogicalIds: ["LambdaVpcEniBootstrapPolicy"],
    });
  }
  for (const role of ["lawos-private-staging-api-role", "lawos-private-staging-admin-role"]) {
    const policies = awsJson(["iam", "list-role-policies", "--role-name", role], { region: false }).PolicyNames ?? [];
    if (policies.some((name) => name.includes("vpc-eni-bootstrap"))) throw new Error("temporary Lambda VPC ENI Allow was not removed");
  }
  const outputs = stackOutputMap(stack);
  apiEndpoint = new URL(outputs.ApiEndpoint);
  const bootstrapEvent = buildPrivateStagingAdminEvent({
    action: "lawos-private-staging-database-bootstrap", packet, approvalId, syntheticManifestSha256, ownerAuthorization,
  });
  const bootstrap = invokeAdmin(bootstrapEvent, "database-bootstrap");
  if (bootstrap.result.outcome !== "PASS"
    || bootstrap.result.action !== bootstrapEvent.action
    || bootstrap.result.source_sha !== packet.source_sha
    || bootstrap.result.source_tree !== packet.source_tree
    || bootstrap.result.artifact_sha256 !== packet.artifact_sha256
    || bootstrap.result.owner_instruction_sha256 !== packet.packet_sha256
    || bootstrap.result.approval_id !== approvalId
    || bootstrap.result.secret_material_returned !== false
    || bootstrap.result.real_data_count !== 0) throw new Error("database bootstrap exact-head result failed");

  const rds = awsJson(["rds", "describe-db-instances", "--db-instance-identifier", "lawos-private-staging-postgres"]).DBInstances?.[0];
  const rdsCheck = assertPrivateStagingRds(rds);
  const bucketName = outputs.DmsBucketName;
  const bucketCheck = assertPrivateStagingBucket({
    versioning: awsJson(["s3api", "get-bucket-versioning", "--bucket", bucketName]),
    publicAccess: awsJson(["s3api", "get-public-access-block", "--bucket", bucketName]),
    encryption: awsJson(["s3api", "get-bucket-encryption", "--bucket", bucketName]),
    objectLock: awsJson(["s3api", "get-object-lock-configuration", "--bucket", bucketName]),
  });
  const budgetCheck = assertDeployedBudget();
  const afterProtected = protectedResourceFingerprint();
  if (afterProtected !== beforeProtected) throw new Error("protected AMIC staging resources changed during LawOS deployment");
  const infrastructureEvidence = writePrivateJson(infrastructureDir, "deployed-infrastructure-summary.json", {
    source_sha: packet.source_sha,
    source_tree: packet.source_tree,
    artifact_sha256: packet.artifact_sha256,
    artifact_s3_version_sha256: sha256(artifactVersionId),
    stack_id_fingerprint: sha256(stack.StackId),
    stack_status: stack.StackStatus,
    lambda_active_successful_count: 2,
    eni_bootstrap_policy_count: 0,
    ...rdsCheck,
    ...bucketCheck,
    ...budgetCheck,
    ...sesReadiness,
    protected_resource_mutation_count: 0,
    real_data_count: 0,
  });
  writeReceipt("infrastructure-deployment", startedAt, {
    lambda_active_successful_count: 2,
    eni_bootstrap_policy_count: 0,
    public_rds_count: 0,
    public_bucket_count: 0,
    monthly_budget_count: budgetCheck.monthly_budget_count,
    verified_sender_identity_count: sesReadiness.verified_sender_identity_count,
    verified_sandbox_recipient_count: sesReadiness.verified_sandbox_recipient_count,
    protected_resource_mutation_count: 0,
    real_data_count: 0,
  }, { infrastructure_evidence_sha256: infrastructureEvidence.sha256, template_sha256: templateSha256, artifact_s3_version_sha256: sha256(artifactVersionId) }, { staging_deployment_executed: true });
  writeReceipt("database-bootstrap", startedAt, {
    migration_count: Number(bootstrap.result.migration_count),
    migration_applied_count: Number(bootstrap.result.migration_applied_count),
    application_role_grant_count: Number(bootstrap.result.application_role_grant_count),
    tenant_authority_count: Number(bootstrap.result.tenant_authority_count),
    cut005_directory_repair_count: Number(bootstrap.result.cut005_directory_repair_count),
    cut005_directory_repair_scanned_count: Number(bootstrap.result.cut005_directory_repair_scanned_count),
    cut005_directory_restore_count: Number(bootstrap.result.cut005_directory_restore_count),
    cut005_directory_repair_audit_delete_count: Number(bootstrap.result.cut005_directory_repair_audit_delete_count),
    json_fallback_count: 0,
    json_writer_count: 0,
    dual_write_count: 0,
    real_data_count: 0,
  }, { bootstrap_response_sha256: bootstrap.responseSha256, synthetic_manifest_sha256: syntheticManifestSha256 }, { database_bootstrap_executed: true });
  writeReceipt("cost-verification", startedAt, {
    monthly_estimate_krw: cost.total_monthly_estimate_krw,
    monthly_estimate_usd: cost.total_monthly_estimate_usd,
    cost_limit_krw: 300000,
    monthly_budget_usd: budgetCheck.monthly_budget_usd,
    actual_spend_usd: budgetCheck.actual_spend_usd,
    forecast_present_count: budgetCheck.forecast_present_count,
    forecast_spend_usd: budgetCheck.forecast_spend_usd,
    real_data_count: 0,
  }, { cost_model_sha256: costModelSha256 }, { cost_limit_verified: true });
  writeReceipt("protected-resource-non-interference", startedAt, {
    protected_resource_fingerprint_count: 2,
    protected_resource_mutation_count: 0,
    real_data_count: 0,
  }, { protected_resources_before_sha256: beforeProtected, protected_resources_after_sha256: afterProtected }, { protected_resources_unchanged: true });
  progress("deploy", "pass", { unsigned_receipt_count: 4, protected_resource_mutation_count: 0 });
}

function requireStack() {
  stack = currentStack();
  if (!stack) throw new Error("exact-head private staging stack is not deployed");
  assertExactExistingStack(stack);
  apiEndpoint = new URL(stackOutputMap(stack).ApiEndpoint);
  lambdaConfiguration(API_FUNCTION);
  lambdaConfiguration(ADMIN_FUNCTION);
}

async function cut005() {
  const startedAt = new Date().toISOString();
  requireStack();
  const action = "lawos-private-staging-cut-005";
  const invocation = invokeAdmin(buildPrivateStagingAdminEvent({ action, packet, approvalId, syntheticManifestSha256, ownerAuthorization }), "cut-005");
  const result = assertPrivateStagingCut005Result(invocation.result, { action, packet, approvalId });
  writeReceipt("cut-005", startedAt, {
    domain_count: Number(result.domain_count),
    source_record_count: Number(result.source_record_count),
    accepted_record_count: Number(result.accepted_record_count),
    rejected_row_count: Number(result.rejected_row_count),
    unexpected_rejection_count: Number(result.unexpected_rejection_count),
    shadow_difference_count: Number(result.shadow_difference_count),
    tenant_negative_visible_count: Number(result.tenant_negative_visible_count),
    replay_residual_count: 0,
    rollback_residual_count: 0,
    real_data_count: 0,
  }, { response_sha256: invocation.responseSha256, source_manifest_sha256: result.source_manifest_sha256, invariant_sha256: result.safe_hash_summary_sha256 }, { cut_005_executed: true });
  progress("cut-005", "pass", { source_record_count: result.source_record_count, rejected_row_count: result.rejected_row_count });
}

async function cut006() {
  const startedAt = new Date().toISOString();
  requireStack();
  const cold = await forceColdGeneration("cut006");
  const apiConfiguration = lambdaConfiguration(API_FUNCTION);
  const apiConfigurationSha256 = sha256AwsEvidence({
    code_sha256: apiConfiguration.CodeSha256,
    runtime: apiConfiguration.Runtime,
    architectures: apiConfiguration.Architectures,
    role: apiConfiguration.Role,
    vpc: apiConfiguration.VpcConfig,
    environment: apiConfiguration.Environment?.Variables,
  });
  const action = "lawos-private-staging-cut-006";
  const event = buildPrivateStagingAdminEvent({
    action, packet, approvalId, syntheticManifestSha256, ownerAuthorization,
    extra: {
      artifact_entry_manifest_sha256: artifactManifest.artifact_entries_sha256,
      artifact_runtime_store_entry_count: artifactManifest.artifact_runtime_store_entry_count,
      artifact_real_json_store_count: artifactManifest.artifact_real_json_store_count,
      file_current_initialized_count: cold.authority_evidence.file_current_authority_count,
      api_configuration_sha256: apiConfigurationSha256,
      api_cold_start_observed: true,
      api_cold_start_request_id: cold.request_id,
    },
  });
  const invocation = invokeAdmin(event, "cut-006");
  const result = assertPrivateStagingCut006Result(invocation.result, { action, packet, approvalId });
  writeReceipt("cut-006", startedAt, {
    postgres_write_target_count: Number(result.postgres_write_target_count),
    postgres_readback_equal_count: Number(result.postgres_readback_equal_count),
    zero_counter_count: 6,
    json_fallback_count: 0,
    json_writer_count: 0,
    dual_write_count: 0,
    file_current_authority_count: 0,
    offline_mutation_count: 0,
    memory_fallback_count: 0,
    tenant_negative_visible_count: 0,
    real_data_count: 0,
  }, { response_sha256: invocation.responseSha256, api_configuration_sha256: apiConfigurationSha256, artifact_entries_sha256: artifactManifest.artifact_entries_sha256, cold_start_before_sha256: cold.before_fingerprint, cold_start_after_sha256: cold.after_fingerprint, deployed_authority_evidence_sha256: cold.authority_evidence_sha256 }, { cut_006_executed: true, missing_json_smoke_passed: true });
  progress("cut-006", "pass", { zero_counter_count: 6, postgres_write_target_count: result.postgres_write_target_count });
}

async function cut007() {
  const startedAt = new Date().toISOString();
  requireStack();
  const baselineAction = "lawos-private-staging-synthetic-baseline";
  const baseline = invokeAdmin(buildPrivateStagingAdminEvent({ action: baselineAction, packet, approvalId, syntheticManifestSha256, ownerAuthorization }), "cut-007-baseline");
  if (baseline.result.outcome !== "PASS" || baseline.result.action !== baselineAction || baseline.result.source_sha !== packet.source_sha) throw new Error("CUT-007 synthetic baseline failed");
  const brokerPath = privateRegularFile(requiredOption("--mailbox-broker-module"), "synthetic mailbox broker module");
  const broker = await import(`${pathToFileURL(brokerPath).href}?run=${Date.now()}`);
  if (typeof broker.waitForResetToken !== "function") throw new Error("synthetic mailbox broker must export waitForResetToken");
  const { chromium } = await import("playwright");
  const { createServer: createViteServer } = await import("vite");
  let result;
  try {
    result = await runPrivateStagingCut007({
      transport: createPrivateStagingHttpTransport({ baseUrl: apiEndpoint.href }),
      accounts: syntheticIdentity.accounts,
      tenantIds: SYNTHETIC_MANIFEST.purpose_tenants.cut007,
      runId: `cut007-${packet.source_sha.slice(0, 12)}-${Date.now().toString(36)}`,
      mailboxTokenProvider: ({ email, purpose, requested_at }) => broker.waitForResetToken({ email, purpose, requested_at, environment: "lawos-staging" }),
      coldRestart: async () => {
        const cold = await forceColdGeneration("cut007");
        return { outcome: "PASS", cold_start_observed: true, evidence_fingerprint: sha256AwsEvidence(cold) };
      },
      readback: ({ execution_id, expected }) => {
        const action = "lawos-private-staging-cut-007-readback";
        const invocation = invokeAdmin(buildPrivateStagingAdminEvent({ action, packet, approvalId, syntheticManifestSha256, ownerAuthorization, extra: { run_id: execution_id, expected } }), "cut-007-readback");
        if (invocation.result.outcome !== "PASS" || invocation.result.action !== action || invocation.result.source_sha !== packet.source_sha) throw new Error("CUT-007 independent readback failed");
        return invocation.result;
      },
      browserSmoke: ({ account, password, expected }) => runPrivateStagingForestBrowserSmoke({
        apiBaseUrl: apiEndpoint.href,
        account,
        password,
        expected,
        evidenceDir: browserEvidenceDir,
        createViteServer,
        launchBrowser: (options) => chromium.launch(options),
      }),
    });
  } finally {
    await broker.close?.();
  }
  if (result.outcome !== "PASS" || ["json_fallback_count", "json_writer_count", "dual_write_count", "file_current_authority_count", "offline_mutation_count", "memory_fallback_count", "wrong_tenant_visible_count", "real_data_count"].some((key) => result[key] !== 0)) throw new Error("CUT-007 final result failed or observed a forbidden authority");
  const resultEvidence = writePrivateJson(cut007Dir, "cut-007-result.json", result);
  writeReceipt("cut-007", startedAt, {
    ...result.safe_counts,
    browser_critical_flow_count: Number(result.browser_smoke.critical_flow_count),
    browser_screenshot_count: Number(result.browser_smoke.screenshot_count),
    json_fallback_count: 0,
    json_writer_count: 0,
    dual_write_count: 0,
    file_current_authority_count: 0,
    offline_mutation_count: 0,
    memory_fallback_count: 0,
    wrong_tenant_visible_count: 0,
    real_data_count: 0,
  }, { result_sha256: resultEvidence.sha256, execution_fingerprint_sha256: result.execution_fingerprint, readback_fingerprint_sha256: result.readback_fingerprint, browser_evidence_fingerprint_sha256: result.browser_smoke.evidence_fingerprint }, { cut_007_executed: true, browser_smoke_passed: true, synthetic_mailbox_delivery_verified: true });
  progress("cut-007", "pass", { api_call_count: result.safe_counts.api_call_count, browser_screenshot_count: result.browser_smoke.screenshot_count });
}

const phase = option("--phase", "all");
if (!PHASES.has(phase)) throw new TypeError("--phase must be preflight, deploy, cut005, cut006, cut007, or all");
const awsProfile = option("--profile", "matter-staging-admin");
if (awsProfile !== "matter-staging-admin") throw new Error("private staging execution requires the dedicated matter-staging-admin profile");
const sourceSha = git("rev-parse", "HEAD^{commit}");
const sourceTree = git("rev-parse", "HEAD^{tree}");
if (git("status", "--porcelain=v1", "--untracked-files=all")) throw new Error("private staging execution requires a clean exact-head worktree");

const packetPath = privateRegularFile(requiredOption("--packet"), "exact-head authorization packet");
const rawPacket = JSON.parse(readFileSync(packetPath, "utf8"));
const packetValidation = validatePrivateStagingExactHeadPacket(rawPacket, {
  sourceSha,
  sourceTree,
  baseMainSha: git("rev-parse", "origin/main^{commit}"),
  baseMainTree: git("rev-parse", "origin/main^{tree}"),
});
const packet = Object.freeze({ ...rawPacket, packet_sha256: packetValidation.packet_sha256 });
const artifactManifestPath = privateRegularFile(requiredOption("--artifact-manifest"), "artifact manifest");
const artifactManifestBytes = readFileSync(artifactManifestPath);
const artifactManifest = JSON.parse(artifactManifestBytes);
if (sha256(artifactManifestBytes) !== packet.artifact_manifest_sha256 || artifactManifest.source_sha !== sourceSha || artifactManifest.source_tree !== sourceTree || artifactManifest.artifact_sha256 !== packet.artifact_sha256 || artifactManifest.synthetic_identity_manifest_sha256 !== packet.synthetic_identity_manifest_sha256) throw new Error("artifact manifest does not match the exact-head packet");
for (const field of ["artifact_entries_sha256"]) if (!/^[0-9a-f]{64}$/u.test(artifactManifest[field] ?? "")) throw new Error(`${field} is missing from the artifact manifest`);
for (const field of ["artifact_runtime_store_entry_count", "artifact_real_json_store_count"]) if (artifactManifest[field] !== 0) throw new Error(`${field} must equal zero`);
const artifactPath = privateRegularFile(artifactManifest.artifact_path, "artifact archive");
if (sha256(readFileSync(artifactPath)) !== packet.artifact_sha256) throw new Error("artifact archive digest drifted");

const registryPath = privateRegularFile(requiredOption("--registry"), "owner trust registry");
const registryBytes = readFileSync(registryPath);
const registrySha256 = requiredOption("--registry-sha256");
if (sha256(registryBytes) !== registrySha256) throw new Error("owner trust registry digest mismatch");
const approvalReceiptPath = privateRegularFile(requiredOption("--approval-receipt"), "exact-head approval receipt");
const approvalSignaturePath = privateRegularFile(option("--approval-signature", `${approvalReceiptPath}.sig`), "exact-head approval signature");
const approvalReceiptBytes = readFileSync(approvalReceiptPath);
const approvalSignatureBytes = readFileSync(approvalSignaturePath);
const approvalReceipt = JSON.parse(approvalReceiptBytes);
const approval = validateRuntimeSafetyApprovalBundle({
  registryPath,
  expectedRegistrySha256: registrySha256,
  receiptPath: approvalReceiptPath,
  signaturePath: approvalSignaturePath,
  expectedRole: "owner",
  expectedAction: PRIVATE_STAGING_EXACT_HEAD_ACTION,
  expectedEnvironment: "staging",
  expectedPacketSha256: packet.packet_sha256,
  expectedSourceSha: sourceSha,
  expectedSourceTree: sourceTree,
  allowedDataScope: ["synthetic-only"],
  allowedContactScope: ["synthetic-mailbox-only"],
});
if (!approval.valid || approval.decision !== "approved") throw new Error("exact-head owner approval is not approved");
const approvalId = approval.approval_id;
ownerAuthorization = Object.freeze({
  registry_json: registryBytes.toString("utf8"),
  receipt_json: approvalReceiptBytes.toString("utf8"),
  signature_base64: ed25519SignatureBase64(approvalSignatureBytes),
});

const registry = JSON.parse(registryBytes);
for (const [name, kind] of [[requiredOption("--ci-receipt"), "exact-head-ci"], [requiredOption("--security-receipt"), "security-review"]]) {
  const path = privateRegularFile(name, `${kind} receipt`);
  const receipt = JSON.parse(readFileSync(path, "utf8"));
  const signature = readFileSync(privateRegularFile(`${path}.sig`, `${kind} signature`));
  const signerScope = privateStagingReceiptSignerScope(receipt.receipt_kind);
  const signer = resolvePrivateStagingReceiptSigner(registry, receipt.key_id, Date.now(), {
    expectedRole: signerScope.role,
    expectedAction: signerScope.action,
    expectedEnvironment: signerScope.environment,
    receiptEnvironment: receipt.environment,
    receiptStartedAt: Date.parse(receipt.started_at),
    receiptFinishedAt: Date.parse(receipt.finished_at),
  });
  const verified = verifyPrivateStagingExecutionReceipt({ receipt, signature, publicKey: signer.public_key_spki_pem, expected: { sourceSha, sourceTree, artifactSha256: packet.artifact_sha256, ownerInstructionSha256: packet.packet_sha256, approvalId, executionState: "PASS" } });
  if (verified.receipt_kind !== kind) throw new Error(`${kind} receipt kind mismatch`);
}

const executionInputsPath = privateRegularFile(requiredOption("--execution-inputs"), "private staging execution inputs");
const inputs = validatePrivateStagingExecutionInputs(JSON.parse(readFileSync(executionInputsPath, "utf8")));
const syntheticIdentityPath = privateRegularFile(requiredOption("--synthetic-identity-manifest"), "synthetic identity manifest");
const syntheticIdentityBytes = readFileSync(syntheticIdentityPath);
if (sha256(syntheticIdentityBytes) !== packet.synthetic_identity_manifest_sha256) throw new Error("synthetic identity manifest digest mismatch");
const syntheticIdentity = JSON.parse(syntheticIdentityBytes);
buildPrivateStagingSyntheticSources(syntheticIdentity);

const outputDir = outsideWorktreeDirectory(requiredOption("--output-dir"));
const changeSetDir = outsideWorktreeDirectory(resolve(outputDir, "aws-change-sets"));
const infrastructureDir = outsideWorktreeDirectory(resolve(outputDir, "infrastructure"));
const invokeDir = outsideWorktreeDirectory(resolve(outputDir, "invocations"));
const cut007Dir = outsideWorktreeDirectory(resolve(outputDir, "cut-007"));
const browserEvidenceDir = outsideWorktreeDirectory(resolve(cut007Dir, "browser"));
const unsignedReceiptDir = outsideWorktreeDirectory(resolve(outputDir, "receipts", "unsigned"));
const infrastructureTemplate = JSON.parse(readFileSync("infra/lawos-private-staging/template.json", "utf8"));
validatePrivateStagingTemplate(infrastructureTemplate);
const templateSha256 = canonicalSha256(infrastructureTemplate);
const cloudFormationTemplateBytes = Buffer.from(JSON.stringify(infrastructureTemplate));
if (cloudFormationTemplateBytes.byteLength > 51_200) throw new Error("minified CloudFormation template exceeds the inline API limit");
const cloudFormationTemplatePath = resolve(changeSetDir, "cloudformation-template.min.json");
if (existsSync(cloudFormationTemplatePath)) throw new Error("CloudFormation template evidence already exists");
writeFileSync(cloudFormationTemplatePath, cloudFormationTemplateBytes, { flag: "wx", mode: 0o600 });
chmodSync(cloudFormationTemplatePath, 0o600);
const costModel = JSON.parse(readFileSync("infra/lawos-private-staging/cost-estimate.json", "utf8"));
const cost = validatePrivateStagingCost(costModel);
const costModelSha256 = canonicalSha256(costModel);
const syntheticManifestSha256 = sha256(JSON.stringify(SYNTHETIC_MANIFEST));

const identity = awsJson(["sts", "get-caller-identity"]);
assertPrivateStagingCallerIdentity(identity);
progress("authorization", "pass", { source_sha: sourceSha, source_tree: sourceTree, artifact_sha256: packet.artifact_sha256, approval_id: approvalId, profile: awsProfile });
if (["preflight", "deploy", "all"].includes(phase)) {
  const templateValidation = assertCloudFormationTemplateApi();
  progress("cloudformation-template-validation", "pass", templateValidation);
}

let stack = null;
let apiEndpoint = null;
if (phase === "preflight") {
  assertArtifactStore();
  assertSesPreflight();
  protectedResourceFingerprint();
  const existing = currentStack();
  if (existing) assertExactExistingStack(existing);
  progress("preflight", "pass", { aws_mutation_count: 0, real_data_count: 0, production_contacted: false });
}
if (phase === "deploy" || phase === "all") await deploy();
if (phase === "cut005" || phase === "all") await cut005();
if (phase === "cut006" || phase === "all") await cut006();
if (phase === "cut007" || phase === "all") await cut007();

process.stdout.write(`${JSON.stringify({
  verdict: "PASS",
  phase,
  source_sha: sourceSha,
  source_tree: sourceTree,
  artifact_sha256: packet.artifact_sha256,
  approval_id: approvalId,
  unsigned_receipt_directory: unsignedReceiptDir,
  signing_required: true,
  production_contacted: false,
  real_data_contacted: false,
  release_executed: false,
  go_live: false,
}, null, 2)}\n`);
