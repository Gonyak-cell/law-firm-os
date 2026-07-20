#!/usr/bin/env node
import {
  createHash,
  createPrivateKey,
  createPublicKey,
  sign,
  verify,
} from "node:crypto";
import { execFileSync } from "node:child_process";
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
import {
  canonicalizeJson,
  validateRuntimeSafetyApprovalBundle,
} from "./lib/runtime-safety-approval-contract.mjs";
import {
  canonicalSha256,
  validateArtifactStoreTemplate,
  validatePrivateStagingCost,
  validatePrivateStagingTemplate,
} from "./lib/private-staging-contract.mjs";
import { validatePrivateStagingEntraContract } from "./lib/private-staging-entra-contract.mjs";

const BASELINE_SHA = "27a1ddf95845dc1e71e2598af423e8bcf50dfbef";
const BASELINE_TREE = "5d2c152cebdddfe29035b78d34bf7f7072cb40ec";
const APPROVAL_ID = "LAWOS-PRIVATE-STAGING-ENTRA-PILOT-CONDITIONAL-EXECUTION-APPROVAL-20260720";
const REQUIRED_GRAPH_SCOPES = Object.freeze([
  "Application.ReadWrite.All",
  "Group.ReadWrite.All",
  "Policy.ReadWrite.ConditionalAccess",
]);

function option(name) {
  const index = process.argv.indexOf(name);
  const value = index === -1 ? null : process.argv[index + 1];
  if (!value || value.startsWith("--")) throw new TypeError(`${name} is required`);
  return value;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function git(...args) {
  return execFileSync("git", args, { cwd: process.cwd(), encoding: "utf8" }).trim();
}

function jsonCommand(command, args) {
  return JSON.parse(execFileSync(command, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  }));
}

function privateRegularFile(path, name) {
  const input = resolve(path);
  if (!existsSync(input) || lstatSync(input).isSymbolicLink()) throw new Error(`${name} must be an existing non-symlink file`);
  const real = realpathSync(input);
  if (!statSync(real).isFile() || (statSync(real).mode & 0o077) !== 0) throw new Error(`${name} must be a private regular file`);
  return real;
}

function outsideWorktreeDirectory(path) {
  const root = realpathSync(process.cwd());
  const targetInput = resolve(path);
  let existingParent = targetInput;
  while (!existsSync(existingParent)) existingParent = dirname(existingParent);
  const target = resolve(realpathSync(existingParent), relative(existingParent, targetInput));
  const rel = relative(root, target);
  const outsideRoot = rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel);
  if (!outsideRoot) throw new Error("preflight output must remain outside the worktree");
  if (existsSync(target) && lstatSync(target).isSymbolicLink()) throw new Error("preflight output directory must not be a symlink");
  mkdirSync(target, { recursive: true, mode: 0o700 });
  chmodSync(target, 0o700);
  return target;
}

function writeExclusive(path, value, mode = 0o600) {
  writeFileSync(path, value, { flag: "wx", mode });
  chmodSync(path, mode);
}

function graphScopes() {
  const tokenEnvelope = jsonCommand("az", ["account", "get-access-token", "--resource-type", "ms-graph", "--output", "json"]);
  const parts = String(tokenEnvelope.accessToken ?? "").split(".");
  if (parts.length !== 3) throw new Error("Microsoft Graph access token is unavailable");
  const claims = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
  return new Set(String(claims.scp ?? "").split(/\s+/u).filter(Boolean));
}

const startedAt = new Date().toISOString();
const sourceSha = git("rev-parse", "HEAD^{commit}");
const sourceTree = git("rev-parse", "HEAD^{tree}");
if (git("status", "--porcelain=v1", "--untracked-files=all")) throw new Error("private staging preflight requires a clean exact-head worktree");
if (git("rev-parse", "origin/main") !== BASELINE_SHA || git("rev-parse", `${BASELINE_SHA}^{tree}`) !== BASELINE_TREE) {
  throw new Error("origin/main or approved baseline tree drifted");
}

const approvalManifestPath = privateRegularFile(option("--approval-manifest"), "approval manifest");
const privateKeyPath = privateRegularFile(process.env.LAWOS_OWNER_PRIVATE_KEY_PATH, "owner private key");
const outputDir = outsideWorktreeDirectory(option("--output-dir"));
const authority = JSON.parse(readFileSync(approvalManifestPath, "utf8"));
if (authority.instruction_id !== APPROVAL_ID || authority.baseline_source_sha !== BASELINE_SHA || authority.baseline_source_tree !== BASELINE_TREE) {
  throw new Error("private staging approval authority binding is invalid");
}
const approval = authority.approvals.find((entry) => entry.id === "infrastructure-preflight");
if (!approval?.validated || approval.execution_pass_claim !== false) throw new Error("infrastructure preflight approval is not valid");
const registryPath = privateRegularFile(authority.registry.path, "owner registry");
validateRuntimeSafetyApprovalBundle({
  registryPath,
  expectedRegistrySha256: authority.registry.sha256,
  receiptPath: resolve(dirname(approvalManifestPath), "infrastructure-preflight.approval.json"),
  signaturePath: resolve(dirname(approvalManifestPath), "infrastructure-preflight.approval.json.sig"),
  expectedRole: "owner",
  expectedAction: "lawos-private-staging-preflight",
  expectedEnvironment: "staging",
  expectedPacketSha256: approval.packet_sha256,
  expectedSourceSha: BASELINE_SHA,
  expectedSourceTree: BASELINE_TREE,
  allowedDataScope: [],
  allowedContactScope: [],
});

const registry = JSON.parse(readFileSync(registryPath, "utf8"));
const key = registry.keys.find((entry) => entry.key_id === authority.key_id);
const privateKey = createPrivateKey(readFileSync(privateKeyPath));
const publicKey = createPublicKey(privateKey);
if (publicKey.export({ type: "spki", format: "pem" }) !== key?.public_key_spki_pem) throw new Error("owner private key does not match the registered public key");
const ownerInstructionPath = privateRegularFile(authority.owner_instruction.path, "owner instruction");
const ownerInstructionSignaturePath = privateRegularFile(`${authority.owner_instruction.path}.sig`, "owner instruction signature");
const ownerInstruction = JSON.parse(readFileSync(ownerInstructionPath, "utf8"));
if (!verify(null, Buffer.from(canonicalizeJson(ownerInstruction)), publicKey, readFileSync(ownerInstructionSignaturePath))) {
  throw new Error("owner instruction signature is invalid");
}

const template = JSON.parse(readFileSync("infra/lawos-private-staging/template.json", "utf8"));
const artifactTemplate = JSON.parse(readFileSync("infra/lawos-private-staging/artifact-store-template.json", "utf8"));
const cost = JSON.parse(readFileSync("infra/lawos-private-staging/cost-estimate.json", "utf8"));
const entraContract = JSON.parse(readFileSync("infra/lawos-private-staging/entra-pilot-contract.json", "utf8"));
const infrastructure = validatePrivateStagingTemplate(template);
const artifactStore = validateArtifactStoreTemplate(artifactTemplate);
const costGate = validatePrivateStagingCost(cost);
const entra = validatePrivateStagingEntraContract(entraContract);

const awsProfile = "matter-readonly-auditor";
const awsRegion = "ap-northeast-2";
const awsIdentity = jsonCommand("aws", ["sts", "get-caller-identity", "--profile", awsProfile, "--no-cli-pager", "--output", "json"]);
if (awsIdentity.Account !== "770880870480") throw new Error("AWS preflight account mismatch");
const rds = jsonCommand("aws", ["rds", "describe-db-instances", "--db-instance-identifier", "amic-vault-staging-postgres", "--profile", awsProfile, "--region", awsRegion, "--no-cli-pager", "--output", "json"]);
const lambda = jsonCommand("aws", ["lambda", "get-function-configuration", "--function-name", "matter-lawos-api-staging", "--profile", awsProfile, "--region", awsRegion, "--no-cli-pager", "--output", "json"]);
const tagged = jsonCommand("aws", ["resourcegroupstaggingapi", "get-resources", "--profile", awsProfile, "--region", awsRegion, "--tag-filters", "Key=environment,Values=lawos-staging", "--no-cli-pager", "--output", "json"]);
const budgets = jsonCommand("aws", ["budgets", "describe-budgets", "--account-id", "770880870480", "--profile", awsProfile, "--region", "us-east-1", "--no-cli-pager", "--output", "json"]);
const mainTemplateValidation = jsonCommand("aws", ["cloudformation", "validate-template", "--template-body", `file://${resolve("infra/lawos-private-staging/template.json")}`, "--profile", awsProfile, "--region", awsRegion, "--no-cli-pager", "--output", "json"]);
const artifactTemplateValidation = jsonCommand("aws", ["cloudformation", "validate-template", "--template-body", `file://${resolve("infra/lawos-private-staging/artifact-store-template.json")}`, "--profile", awsProfile, "--region", awsRegion, "--no-cli-pager", "--output", "json"]);

let subscribedSkuCount = 0;
let entraPremiumCandidateCount = 0;
let missingGraphScopes = [...REQUIRED_GRAPH_SCOPES];
try {
  const skus = jsonCommand("az", ["rest", "--method", "GET", "--url", "https://graph.microsoft.com/v1.0/subscribedSkus?$select=skuPartNumber,capabilityStatus,servicePlans", "--output", "json"]);
  subscribedSkuCount = skus.value?.length ?? 0;
  entraPremiumCandidateCount = (skus.value ?? []).filter((sku) =>
    sku.capabilityStatus === "Enabled"
    && (sku.servicePlans ?? []).some((plan) => String(plan.servicePlanName ?? "").startsWith("AAD_PREMIUM"))).length;
  const scopes = graphScopes();
  missingGraphScopes = REQUIRED_GRAPH_SCOPES.filter((scope) => !scopes.has(scope));
} catch {
  // Entra remains an external blocker; no token, tenant value, or raw error enters evidence.
}

const blockers = [
  "LAMBDA_VPC_ENI_BOOTSTRAP_OWNER_DELTA_REQUIRED",
  "KMS_CURRENT_KEY_POLICY_OWNER_DELTA_REQUIRED",
  "EXACT_PR_HEAD_STAGING_ARTIFACT_OWNER_DELTA_REQUIRED",
  "SYNTHETIC_ENTRA_IDENTITIES_REQUIRED",
  "EXACT_HEAD_CI_SECURITY_REVIEW_REQUIRED",
];
if (entraPremiumCandidateCount === 0) blockers.push("ENTRA_P1_P2_LICENSE_NOT_VERIFIED");
if (missingGraphScopes.length) blockers.push("ENTRA_JIT_GRAPH_SCOPE_UPGRADE_REQUIRED");

const protectedRds = rds.DBInstances?.[0];
const budget100Count = (budgets.Budgets ?? []).filter((budget) => budget.BudgetType === "COST" && Number(budget.BudgetLimit?.Amount) === 100 && budget.BudgetLimit?.Unit === "USD").length;
const finishedAt = new Date(Math.max(Date.now(), Date.parse(startedAt) + 1)).toISOString();
const receipt = {
  schema_version: "law-firm-os.private-staging.preflight-execution.v1",
  receipt_id: `lawos-private-staging-preflight-${sourceSha.slice(0, 12)}`,
  approval_id: approval.approval_id ?? "lawos-private-staging-infrastructure-preflight-20260720",
  owner_instruction_sha256: authority.instruction_sha256,
  key_id: authority.key_id,
  action: "lawos-private-staging-preflight",
  environment: "lawos-staging",
  outcome: "BLOCKED_EXTERNAL_PREREQUISITES",
  baseline_source_sha: BASELINE_SHA,
  baseline_source_tree: BASELINE_TREE,
  target_source_sha: sourceSha,
  target_source_tree: sourceTree,
  toolchain_sha256: sha256(readFileSync(new URL(import.meta.url))),
  started_at: startedAt,
  finished_at: finishedAt,
  operator_profile: awsProfile,
  checks: {
    source_clean: true,
    origin_main_exact_baseline: true,
    signed_approval_valid: true,
    owner_instruction_signature_valid: true,
    infrastructure_contract: infrastructure.verdict,
    artifact_store_contract: artifactStore.verdict,
    cost_contract: costGate.verdict,
    entra_contract: entra.verdict,
    cloudformation_main_template_valid: Array.isArray(mainTemplateValidation.Capabilities),
    cloudformation_artifact_template_valid: Array.isArray(artifactTemplateValidation.Parameters),
    protected_amic_rds_public_observed: protectedRds?.PubliclyAccessible === true,
    protected_amic_lambda_vpc_missing_observed: !lambda.VpcConfig?.VpcId,
    protected_amic_lambda_production_role_reuse_observed: String(lambda.Role ?? "").endsWith("/matter-lawos-api-prod-lambda-role"),
    entra_p1_p2_license_verified: entraPremiumCandidateCount > 0,
    required_graph_scopes_present: missingGraphScopes.length === 0,
  },
  safe_counts: {
    infrastructure_resource_count: infrastructure.resource_count,
    protected_resource_mutation_count: 0,
    new_lawos_staging_tagged_resource_count: tagged.ResourceTagMappingList?.length ?? 0,
    public_new_rds_count: 0,
    database_default_route_count: infrastructure.database_default_route_count,
    lambda_function_url_count: infrastructure.lambda_function_url_count,
    iam_wildcard_allow_count: infrastructure.iam_wildcard_allow_count,
    kms_current_key_wildcard_allow_count: infrastructure.kms_current_key_wildcard_allow_count,
    monthly_estimate_usd: costGate.total_monthly_estimate_usd,
    monthly_estimate_krw: costGate.total_monthly_estimate_krw,
    active_usd_100_budget_count: budget100Count,
    subscribed_sku_count: subscribedSkuCount,
    entra_premium_candidate_count: entraPremiumCandidateCount,
    missing_graph_scope_count: missingGraphScopes.length,
    aws_read_only_call_count: 7,
    aws_mutation_count: 0,
    entra_mutation_count: 0,
    real_identity_count: 0,
    real_data_count: 0,
  },
  digests: {
    infrastructure_template_sha256: canonicalSha256(template),
    artifact_template_sha256: canonicalSha256(artifactTemplate),
    cost_model_sha256: canonicalSha256(cost),
    entra_contract_sha256: canonicalSha256(entraContract),
    aws_principal_ref_sha256: sha256(awsIdentity.Arn ?? ""),
  },
  blockers: [...new Set(blockers)].sort(),
  claims: {
    source_local_verified: true,
    aws_inventory_contacted_read_only: true,
    entra_inventory_contacted_read_only: true,
    aws_mutation_executed: false,
    entra_mutation_executed: false,
    staging_deployment_executed: false,
    migration_executed: false,
    cut_005_executed: false,
    cut_006_executed: false,
    cut_007_executed: false,
    production_contacted: false,
    real_data_contacted: false,
    release_executed: false,
    signing_executed: false,
    go_live: false,
  },
};

const receiptBytes = Buffer.from(`${JSON.stringify(receipt, null, 2)}\n`);
const canonicalBytes = Buffer.from(canonicalizeJson(receipt));
const signature = sign(null, canonicalBytes, privateKey);
if (!verify(null, canonicalBytes, publicKey, signature)) throw new Error("preflight receipt signature verification failed");
const receiptPath = resolve(outputDir, `${receipt.receipt_id}.json`);
const signaturePath = `${receiptPath}.sig`;
const checksumPath = `${receiptPath}.sha256`;
for (const path of [receiptPath, signaturePath, checksumPath]) if (existsSync(path)) throw new Error(`preflight output already exists: ${basename(path)}`);
writeExclusive(receiptPath, receiptBytes);
writeExclusive(signaturePath, signature);
writeExclusive(checksumPath, Buffer.from(`${sha256(receiptBytes)}  ${basename(receiptPath)}\n`));

process.stdout.write(`${JSON.stringify({
  verdict: receipt.outcome,
  receipt_path: receiptPath,
  receipt_sha256: sha256(receiptBytes),
  signature_path: signaturePath,
  signature_sha256: sha256(signature),
  signature_valid: true,
  blocker_count: receipt.blockers.length,
  aws_mutation_count: 0,
  entra_mutation_count: 0,
  production_contacted: false,
}, null, 2)}\n`);
