import { createHash } from "node:crypto";

export const SCHEMA_VERSION = "amic-os.outlook.production-aws-inventory.v2";

export const EXPECTED_ACCOUNT_ID = "770880870480";
export const EXPECTED_READONLY_ROLE = "matter-readonly-auditor";
export const EXPECTED_REGION = "ap-northeast-2";
export const EXPECTED_CLOUDFORMATION_STACKS = Object.freeze(["lawos-production"]);
export const PROJECTION_AUDITOR_EXECUTION_ROLE_ARN = "arn:aws:iam::770880870480:role/lawos-production-projection-auditor-role";
export const EXPECTED_FUNCTION_URL_AUTH_TYPE = "AWS_IAM";
export const FUNCTION_URL_POLICIES = Object.freeze({
  "lawos-production-admin": Object.freeze({ mode: "NONE", auth_type: null }),
  "lawos-production-api": Object.freeze({ mode: "NONE", auth_type: null }),
  "lawos-production-projection-auditor": Object.freeze({ mode: "NONE", auth_type: null }),
  "matter-lawos-api-prod": Object.freeze({ mode: "CONFIGURED", auth_type: EXPECTED_FUNCTION_URL_AUTH_TYPE }),
});
export const EXPECTED_FUNCTION_IDENTITIES = Object.freeze({
  "lawos-production-admin": Object.freeze({
    function_arn: "arn:aws:lambda:ap-northeast-2:770880870480:function:lawos-production-admin",
    role_arn: "arn:aws:iam::770880870480:role/lawos-production-admin-role",
    runtime: "nodejs22.x",
    handler: "apps/api/src/json-postgres-program-admin-lambda.handler",
    architecture: "arm64",
    package_type: "Zip",
  }),
  "lawos-production-api": Object.freeze({
    function_arn: "arn:aws:lambda:ap-northeast-2:770880870480:function:lawos-production-api",
    role_arn: "arn:aws:iam::770880870480:role/lawos-production-api-role",
    runtime: "nodejs22.x",
    handler: "apps/api/src/lambda.handler",
    architecture: "arm64",
    package_type: "Zip",
  }),
  "lawos-production-projection-auditor": Object.freeze({
    function_arn: "arn:aws:lambda:ap-northeast-2:770880870480:function:lawos-production-projection-auditor",
    role_arn: PROJECTION_AUDITOR_EXECUTION_ROLE_ARN,
    runtime: "nodejs22.x",
    handler: "apps/api/src/json-postgres-program-admin-lambda.handler",
    architecture: "arm64",
    package_type: "Zip",
  }),
  "matter-lawos-api-prod": Object.freeze({
    function_arn: "arn:aws:lambda:ap-northeast-2:770880870480:function:matter-lawos-api-prod",
    role_arn: "arn:aws:iam::770880870480:role/matter-lawos-api-prod-lambda-role",
    runtime: "nodejs22.x",
    handler: "apps/api/src/lambda.handler",
    architecture: "arm64",
    package_type: "Zip",
  }),
});
export const PROJECTION_AUDITOR_REQUIRED_ENV_KEYS = Object.freeze([
  "LAWOS_APPROVAL_AUDIT_BUCKET",
  "LAWOS_AWS_ACCOUNT_ID",
  "LAWOS_DATABASE_HOST",
  "LAWOS_DATABASE_IDENTIFIER",
  "LAWOS_DATABASE_NAME",
  "LAWOS_DATABASE_PORT",
  "LAWOS_DEPLOYMENT_ARTIFACT_SHA256",
  "LAWOS_DEPLOYMENT_COMMIT",
  "LAWOS_DEPLOYMENT_TREE",
  "LAWOS_EXECUTION_PACKET_SHA256",
  "LAWOS_OWNER_TRUST_REGISTRY_SHA256",
  "LAWOS_PERSISTENCE_AUTHORITY",
  "LAWOS_POSTGRES_SSL_MODE",
  "LAWOS_POSTGRES_TENANT_CONTEXT_SECRET_ID",
  "LAWOS_PROJECTION_AUDITOR_DATABASE_SECRET_ID",
  "LAWOS_PROGRAM_EXECUTION_ROLE",
  "LAWOS_PROGRAM_INPUT_BUCKET",
  "LAWOS_PROGRAM_INPUT_KMS_KEY_ARN",
  "LAWOS_RUNTIME_PROFILE",
  "NODE_EXTRA_CA_CERTS",
]);
export const PROJECTION_AUDITOR_FORBIDDEN_ENV_KEYS = Object.freeze([
  "LAWOS_ADMIN_DATABASE_SECRET_ID",
  "LAWOS_APPLICATION_DATABASE_SECRET_ID",
  "LAWOS_MASTER_DATABASE_SECRET_ID",
  "LAWOS_PROJECTION_DATABASE_SECRET_ID",
  "LAWOS_PROJECTION_WRITER_DATABASE_SECRET_ID",
]);
export const AWS_READ_TIMEOUT_MS = 15_000;
export const ROLLBACK_DOWNLOAD_TIMEOUT_MS = 15_000;
export const ROLLBACK_ZIP_VERIFY_TIMEOUT_MS = 5_000;
export const ENVIRONMENT_VALUES_UNAVAILABLE = "AWS_ENVIRONMENT_VALUES_UNAVAILABLE";

export const ALLOWED_FUNCTIONS = Object.freeze([
  "lawos-production-admin",
  "lawos-production-api",
  "lawos-production-projection-auditor",
  "matter-lawos-api-prod",
]);

export const READ_ONLY_AWS_OPERATIONS = new Set([
  "sts:get-caller-identity",
  "lambda:get-function",
  "lambda:get-function-configuration",
  "lambda:get-function-concurrency",
  "lambda:list-provisioned-concurrency-configs",
  "lambda:get-function-event-invoke-config",
  "lambda:get-function-url-config",
  "lambda:list-tags",
  "logs:filter-log-events",
  "cloudwatch:get-metric-statistics",
  "cloudwatch:describe-alarms",
  "rds:describe-db-instances",
  "rds:describe-db-clusters",
  "cloudformation:get-template",
  "apigatewayv2:get-api",
  "apigatewayv2:get-routes",
  "apigatewayv2:get-integrations",
  "apigatewayv2:get-stages",
  "cloudfront:get-distribution-config",
  "events:describe-rule",
  "events:list-targets-by-rule",
]);

export const FUNCTION_METRICS = Object.freeze(["Errors", "Invocations"]);
export const TOPOLOGY_METRICS = Object.freeze([
  Object.freeze({ namespace: "AWS/ApiGateway", metric_name: "5XXError", dimension_name: "ApiId", key: "http_api_5xx" }),
  Object.freeze({ namespace: "AWS/CloudFront", metric_name: "5xxErrorRate", dimension_name: "DistributionId", key: "cloudfront_5xx" }),
  Object.freeze({ namespace: "AWS/RDS", metric_name: "DatabaseConnections", dimension_name: "DBInstanceIdentifier", key: "rds_connections" }),
]);

export const SOURCE_VARIABLE_NAMES = Object.freeze([
  "LAWOS_DEPLOYMENT_COMMIT",
  "LAWOS_DEPLOYMENT_TREE",
  "LAWOS_DEPLOYMENT_ARTIFACT_SHA256",
  "LAWOS_RUNTIME_PROFILE",
  "LAWOS_PERSISTENCE_AUTHORITY",
]);

export const TOP_LEVEL_KEYS = Object.freeze([
  "schema_version",
  "outcome",
  "blocked_reason",
  "observed_at",
  "profile",
  "region",
  "cloudformation_stacks",
  "identity",
  "function_allowlist",
  "cloudformation",
  "functions",
  "topology",
  "cloudwatch_alarms",
  "rds",
  "read_only",
  "aws_calls",
  "inventory_sha256",
]);

export function canonicalJson(value) {
  return JSON.stringify(sortCanonical(value));
}

function sortCanonical(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("canonical JSON does not support non-finite numbers");
    return value;
  }
  if (Array.isArray(value)) return value.map(sortCanonical);
  if (value && typeof value === "object") {
    const sorted = {};
    for (const key of Object.keys(value).sort()) sorted[key] = sortCanonical(value[key]);
    return sorted;
  }
  throw new TypeError(`canonical JSON does not support ${typeof value}`);
}

export function sha256(value, { encoding = "hex" } = {}) {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(String(value), "utf8");
  return createHash("sha256").update(bytes).digest(encoding);
}

export function exactKeys(value, expected, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${label} must be an object`);
  const expectedSet = new Set(expected);
  const actual = Object.keys(value);
  const extra = actual.filter((key) => !expectedSet.has(key));
  const missing = expected.filter((key) => !Object.prototype.hasOwnProperty.call(value, key));
  if (extra.length) throw new Error(`${label} has unexpected field(s): ${extra.join(", ")}`);
  if (missing.length) throw new Error(`${label} is missing field(s): ${missing.join(", ")}`);
}

export function requiredString(value, label) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${label} is required`);
  return value.trim();
}

export function optionalHashableIdentifier(value) {
  return typeof value === "string" && value.trim() ? sha256(value.trim()) : null;
}

export function hashOpaqueString(value) {
  return typeof value === "string" ? sha256(value) : null;
}

export function expectedFunctionIdentity(name) {
  return EXPECTED_FUNCTION_IDENTITIES[name] ?? null;
}

export function expectedFunctionUrlPolicy(name) {
  return FUNCTION_URL_POLICIES[name] ?? null;
}

export function hashSortedIdentifiers(values) {
  const normalized = Array.isArray(values)
    ? values.filter((value) => typeof value === "string").map((value) => value.trim()).filter(Boolean)
    : [];
  return [...new Set(normalized.map((value) => sha256(value)))].sort();
}

export function isCanonicalCodeSha256Base64(value) {
  if (typeof value !== "string" || !/^(?:[A-Za-z0-9+/]{4}){10}[A-Za-z0-9+/]{3}=$/u.test(value)) return false;
  const bytes = Buffer.from(value, "base64");
  return bytes.byteLength === 32 && bytes.toString("base64") === value;
}

export function environmentKeyInventoryDigest(functionName, logicalId, expectedKeys) {
  return sha256(canonicalJson({ function_name: functionName, logical_id: logicalId ?? null, expected_keys: [...expectedKeys].sort() }));
}

export function environmentStableProjection(expectedKeys, expectedKeyInventorySha256) {
  return {
    authority: "PROCESSED_CLOUDFORMATION",
    expected_keys: [...expectedKeys].sort(),
    expected_key_inventory_sha256: expectedKeyInventorySha256,
  };
}

export function nonCodeStableProjection(stable) {
  const nonCode = { ...stable, additional_configuration: { ...stable.additional_configuration } };
  delete nonCode.code_sha256_base64;
  for (const field of ["code_size", "version", "signing_profile_version_arn_sha256", "signing_job_arn_sha256"]) delete nonCode.additional_configuration[field];
  return nonCode;
}

export function configurationFingerprints(stable) {
  const nonCode = nonCodeStableProjection(stable);
  return {
    stable,
    non_code_stable: nonCode,
    configuration_fingerprint_sha256: sha256(canonicalJson(stable)),
    non_code_configuration_fingerprint_sha256: sha256(canonicalJson(nonCode)),
  };
}

export function isSha256Hex(value) {
  return typeof value === "string" && /^[0-9a-f]{64}$/u.test(value);
}

export function safeDate(value) {
  if (typeof value === "number" && Number.isFinite(value)) return new Date(value).toISOString();
  if (typeof value === "string" && Number.isFinite(Date.parse(value))) return new Date(value).toISOString();
  return null;
}

export function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function sortedUnique(values) {
  return [...new Set(values)].sort();
}
