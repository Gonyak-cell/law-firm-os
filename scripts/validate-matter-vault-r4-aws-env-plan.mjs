#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const planPath = path.join(
  ROOT,
  "docs/reorganization/client-matter-os/matter-vault-r4/launch/aws-production-equivalent-environment-plan.md",
);
const receiptPath = path.join(
  ROOT,
  "docs/reorganization/client-matter-os/matter-vault-r4/launch/aws-temporary-execute-api-receipt.json",
);
const remainingPath = path.join(
  ROOT,
  "docs/reorganization/client-matter-os/matter-vault-r4/launch/remaining-external-receipts.md",
);

const requiredPlanPhrases = [
  "Status: temporary-synthetic-runtime-created-desktop-domain-nonblocking",
  "does not create production application infrastructure",
  "temporary synthetic Lambda runtime",
  "actual production go-live",
  "770880870480",
  "ap-northeast-2",
  "AWS Account Binding",
  "Matter IAM And Namespace Decisions",
  "Matter Staging Admin Role Evidence",
  "Additional Matter Role Bootstrap Evidence",
  "Temporary Synthetic Runtime Evidence",
  "launch/aws-temporary-execute-api-receipt.json",
  "matter-temp-desktop-api",
  "73o8hpqpgl",
  "https://73o8hpqpgl.execute-api.ap-northeast-2.amazonaws.com/staging",
  "matter-temp-desktop-runtime",
  "aws-temporary-execute-api",
  "/matter/staging/operator-token",
  "/matter/staging/desktop-auth-state",
  "Bearer token required",
  "SHA-256 hash",
  "password login required",
  "aws_secrets_manager",
  "/api/desktop/password-reset/request",
  "/api/desktop/password-reset/confirm",
  "reset password",
  "jwsuh@amic.kr",
  "arn:aws:iam::770880870480:role/matter-staging-admin",
  "arn:aws:iam::770880870480:role/matter-prod-deploy-admin",
  "arn:aws:iam::770880870480:role/matter-cutover-operator",
  "arn:aws:iam::770880870480:role/matter-readonly-auditor",
  "arn:aws:iam::770880870480:role/matter-runtime-role",
  "AWSReservedSSO_AdministratorAccess_d1cc17f134ec2921",
  "arn:aws:iam::aws:policy/AdministratorAccess",
  "arn:aws:iam::aws:policy/ReadOnlyAccess",
  "AWSLambdaBasicExecutionRole",
  "AmazonECSTaskExecutionRolePolicy",
  "These roles are bootstrap roles only.",
  "STS result",
  "matter-staging-admin",
  "matter-prod-deploy-admin",
  "matter-runtime-role",
  "matter-cutover-operator",
  "matter-readonly-auditor",
  "/matter/staging/...",
  "/matter/prod/...",
  "matter-staging-cluster",
  "matter-prod-cluster",
  "matter-api",
  "App",
  "matter",
  "Environment",
  "Read-Only AWS Preflight",
  "amic-vault-staging-admin",
  "amic-vault-admin",
  "STS account `770880870480`",
  "assumed role `matter-staging-admin`",
  "This confirms account reachability and Matter profile creation.",
  "Route 53 hosted zone preflight returned an empty list",
  "not required for desktop-first internal release",
  "retained staging",
  "jws",
  "firm/matter",
  "Not required for desktop-first internal/temporary release.",
  "api.matter.example.com",
  "Domain Decision For Desktop-First Release",
  "AWS-generated HTTPS endpoint",
  "matterlegal.com",
  "AVAILABLE",
  "No domain was registered.",
  "AWS Resources To Create",
  "Required Matter-Vault Values",
  "Non-AWS Dependencies",
  "Execution Sequence",
  "Abort Conditions",
  "Completion Gate",
  "MATTER_VAULT_R4_PRODUCTION_BASE_URL",
  "MATTER_VAULT_R4_PRODUCTION_TENANT_ID",
  "MATTER_VAULT_R4_OPERATOR_ACTOR",
  "MATTER_VAULT_R4_OPERATOR_TOKEN",
  "MATTER_VAULT_R4_MIGRATION_WINDOW",
  "npm run matter-vault:r4:local-secrets:validate",
  "npm run matter-vault:r4:launch:validate",
  "launch/external-production-smoke-receipt.json",
  "launch/production-migration-operator-receipt.json",
  "actual launch/go-live completed false",
  "Vault admin profiles not reused directly",
  "Custom domain is requested but real owned API domain is not confirmed",
];

const requiredRemainingPhrases = [
  "AWS Production-Equivalent Environment Packet",
  "launch/aws-production-equivalent-environment-plan.md",
  "launch/aws-temporary-execute-api-receipt.json",
  "770880870480",
  "ap-northeast-2",
  "matter-staging-admin",
  "Matter-specific role/profile and resource namespace isolation",
  "does not create production application infrastructure",
  "does not",
  "custom domain is not required",
  "desktop-first internal or temporary release",
  "temporary synthetic Lambda runtime",
  "https://73o8hpqpgl.execute-api.ap-northeast-2.amazonaws.com/staging",
  "Operator token material is provisioned",
  "/matter/staging/operator-token",
  "/matter/staging/desktop-auth-state",
  "SHA-256 hash",
  "Desktop login now requires password reset confirmation first",
];

const forbiddenPlanPhrases = [
  /production-ready completed claim\s*[:=]\s*true/i,
  /actual launch\/go-live completed\s*[:=]\s*true/i,
  /public release\s*[:=]\s*true/i,
  /MATTER_VAULT_R4_OPERATOR_TOKEN\s*=\s*\S+/,
];

function addMissing(errors, text, phrases, label) {
  for (const phrase of phrases) {
    if (!text.includes(phrase)) errors.push(`${label} missing phrase: ${phrase}`);
  }
}

const errors = [];

if (!existsSync(planPath)) errors.push(`missing AWS environment plan: ${path.relative(ROOT, planPath)}`);
if (!existsSync(remainingPath)) errors.push(`missing remaining receipts doc: ${path.relative(ROOT, remainingPath)}`);
if (!existsSync(receiptPath)) errors.push(`missing AWS temporary execute-api receipt: ${path.relative(ROOT, receiptPath)}`);

if (errors.length === 0) {
  const plan = readFileSync(planPath, "utf8");
  const remaining = readFileSync(remainingPath, "utf8");
  const receipt = JSON.parse(readFileSync(receiptPath, "utf8"));

  addMissing(errors, plan, requiredPlanPhrases, "aws env plan");
  addMissing(errors, remaining, requiredRemainingPhrases, "remaining receipts doc");

  for (const pattern of forbiddenPlanPhrases) {
    if (pattern.test(plan)) errors.push(`aws env plan contains forbidden claim or secret pattern: ${pattern}`);
  }

  if (receipt.status !== "temporary_execute_api_runtime_created") errors.push("temporary execute-api receipt status mismatch");
  if (receipt.base_url !== "https://73o8hpqpgl.execute-api.ap-northeast-2.amazonaws.com/staging") {
    errors.push("temporary execute-api base URL mismatch");
  }
  if (receipt.lambda?.function_name !== "matter-temp-desktop-runtime") errors.push("temporary runtime lambda missing");
  if (receipt.resource_boundary?.custom_domain_required !== false) errors.push("temporary runtime must not require custom domain");
  if (receipt.resource_boundary?.application_runtime_type !== "temporary_synthetic_lambda") {
    errors.push("temporary runtime type mismatch");
  }
  if (receipt.resource_boundary?.real_client_data_used !== false) errors.push("temporary runtime must not use real client data");
  if (receipt.claim_boundary?.production_go_live_completed !== false) errors.push("production go-live must remain false");
  if (receipt.operator_token?.status !== "provisioned") errors.push("operator token must be provisioned");
  if (receipt.operator_token?.plaintext_token_in_repo !== false) errors.push("operator token must not be in repo");
  if (receipt.operator_token?.plaintext_token_in_lambda_environment !== false) {
    errors.push("operator token plaintext must not be in lambda environment");
  }
  if (receipt.operator_token?.token_material_printed !== false) errors.push("operator token material must not be printed");
  if (receipt.local_secret_candidate?.remaining_required_secret_keys?.length !== 0) {
    errors.push("local secret candidate should have no remaining required keys");
  }
  if (receipt.health_smoke?.response?.operator_token_configured !== true) errors.push("operator token configured health smoke missing");
  if (receipt.health_smoke?.response?.password_login_required !== true) errors.push("password login health smoke missing");
  if (receipt.health_smoke?.response?.password_reset_delivery_mode !== "synthetic_email_outbox") {
    errors.push("password reset delivery smoke missing");
  }
  if (receipt.health_smoke?.response?.password_credential_store !== "aws_secrets_manager") {
    errors.push("password credential store must be aws_secrets_manager");
  }
  if (receipt.auth_state_store?.aws_secret_name !== "/matter/staging/desktop-auth-state") {
    errors.push("auth state secret receipt missing");
  }
  if (receipt.auth_state_store?.plaintext_passwords_stored !== false) {
    errors.push("plaintext passwords must not be stored");
  }
  if (receipt.auth_state_store?.reset_token_material_printed !== false) {
    errors.push("reset token material must not be printed");
  }
  if (receipt.runtime_smoke?.missing_operator_token?.http_status !== 401) errors.push("missing token 401 smoke missing");
  if (receipt.runtime_smoke?.invalid_operator_token?.http_status !== 403) errors.push("invalid token 403 smoke missing");
  if (receipt.runtime_smoke?.jwsuh_login?.system_super_admin !== true) errors.push("jwsuh system super admin smoke missing");
  if (receipt.runtime_smoke?.jwsuh_login?.password_reset_confirmed !== true) {
    errors.push("jwsuh password reset smoke missing");
  }
  if (receipt.runtime_smoke?.general_account_password_login?.password_reset_confirmed !== true) {
    errors.push("general account password reset smoke missing");
  }
  if (receipt.runtime_smoke?.non_highest_admin_denial?.http_status !== 403) errors.push("non-highest denial smoke missing");
}

if (errors.length > 0) {
  console.error("Matter-Vault R4 AWS environment plan validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Matter-Vault R4 AWS environment plan validation passed.");
console.log(`plan: ${path.relative(ROOT, planPath)}`);
console.log("iam_role_created: true");
console.log("temporary_synthetic_application_runtime_created: true");
console.log("production_application_infrastructure_created: false");
console.log("secret_values_printed: false");
