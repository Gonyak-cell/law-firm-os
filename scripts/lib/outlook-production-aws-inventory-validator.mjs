import {
  ALLOWED_FUNCTIONS,
  EXPECTED_ACCOUNT_ID,
  EXPECTED_CLOUDFORMATION_STACKS,
  EXPECTED_REGION,
  ENVIRONMENT_VALUES_UNAVAILABLE,
  FUNCTION_METRICS,
  PROJECTION_AUDITOR_EXECUTION_ROLE_ARN,
  PROJECTION_AUDITOR_FORBIDDEN_ENV_KEYS,
  PROJECTION_AUDITOR_REQUIRED_ENV_KEYS,
  READ_ONLY_AWS_OPERATIONS,
  SCHEMA_VERSION,
  TOP_LEVEL_KEYS,
  canonicalJson,
  environmentKeyInventoryDigest,
  exactKeys,
  expectedFunctionUrlPolicy,
  isCanonicalCodeSha256Base64,
  isSha256Hex,
  sha256,
} from "./outlook-production-aws-inventory-contract.mjs";
import {
  PROVISIONED_KEYS,
  validateAdditionalConfiguration,
  validateRollback,
  validateSourceVariables,
  validateStableProjection,
} from "./outlook-production-aws-inventory-validator-function.mjs";
import {
  validateAlarms,
  validateMetricSet,
  validateRds,
} from "./outlook-production-aws-inventory-validator-surfaces.mjs";
import { validateTopology } from "./outlook-production-aws-inventory-validator-topology.mjs";

const IDENTITY_KEYS = ["account_id", "account_matches", "readonly_role_matches", "arn_sha256", "user_id_sha256"];
const ENV_KEYS = ["read_status", "values_read", "schema_status", "error_code", "expected_keys", "observed_keys", "present", "missing", "unexpected", "expected_key_inventory_sha256", "observed_key_inventory_sha256", "key_inventory_sha256"];
const READ_ONLY_KEYS = ["mode", "mutation_count", "secret_read_count", "lambda_invoke_count", "command_allowlist"];
const FUNCTION_KEYS = ["name", "status", "error_code", "function_arn_sha256", "role_sha256", "revision_id", "last_modified", "runtime", "architecture", "handler", "state", "last_update_status", "config", "source_variables", "code", "direct_invoke", "tags", "logs", "metrics", "rollback_code", "configuration_fingerprint_sha256", "non_code_configuration_fingerprint_sha256", "config_stable_projection"];
const CONFIG_KEYS = ["timeout", "memory_size", "ephemeral_storage_size", "vpc_id_sha256", "subnet_id_sha256", "security_group_id_sha256", "ipv6_allowed_for_dual_stack", "vpc_present", "subnet_count", "security_group_count", "reserved_concurrent_executions", "provisioned_concurrency", "environment", "additional_configuration"];
const CODE_KEYS = ["code_sha256_base64", "location_present", "url_stripped"];
const DIRECT_KEYS = ["status", "error_code", "function_url_present", "auth_type", "url_stripped"];
const TAG_KEYS = ["status", "error_code", "key_count", "presence"];
const LOG_KEYS = ["status", "error_code", "complete", "event_count", "first_event_at", "last_event_at", "first_failure_at", "classes", "request_ids"];
const CF_KEYS = ["status", "error_code", "complete", "function_keys", "missing_functions", "rds_identifiers", "resource_count"];
const CF_FUNCTION_KEYS = ["logical_id", "expected_keys", "expected_key_inventory_sha256"];
const AWS_CALL_KEYS = ["service", "operation", "target"];
const REQUEST_ID_KEYS = ["request_id_sha256", "event_count", "first_event_at", "last_event_at"];

function digest(value, label) {
  if (!isSha256Hex(value)) throw new Error(`${label} must be a lowercase SHA-256 digest`);
}

function validateSurfaceStatus(value, label, statuses = ["PASS", "ERROR"]) {
  if (!statuses.includes(value.status) || (["PASS", "NOT_CONFIGURED", "NOT_READ"].includes(value.status) ? value.error_code !== null : typeof value.error_code !== "string")) throw new Error(`${label} status is invalid`);
}

function validateCloudFormation(value) {
  exactKeys(value, CF_KEYS, "inventory cloudformation");
  if (!["PASS", "INCOMPLETE", "ERROR"].includes(value.status) || (value.complete ? value.status !== "PASS" || value.error_code !== null : typeof value.error_code !== "string") || typeof value.complete !== "boolean" || !Array.isArray(value.missing_functions) || value.missing_functions.some((name) => !ALLOWED_FUNCTIONS.includes(name)) || value.missing_functions.join("\n") !== [...value.missing_functions].sort().join("\n") || new Set(value.missing_functions).size !== value.missing_functions.length || !Array.isArray(value.rds_identifiers) || value.rds_identifiers.some((id) => typeof id !== "string" || !id) || value.rds_identifiers.join("\n") !== [...value.rds_identifiers].sort().join("\n") || new Set(value.rds_identifiers).size !== value.rds_identifiers.length || !Number.isInteger(value.resource_count) || value.resource_count < 0 || !value.function_keys || typeof value.function_keys !== "object" || Array.isArray(value.function_keys)) throw new Error("inventory cloudformation shape is invalid");
  for (const [name, entry] of Object.entries(value.function_keys)) {
    if (!ALLOWED_FUNCTIONS.includes(name)) throw new Error("inventory cloudformation contains an unapproved function");
    exactKeys(entry, CF_FUNCTION_KEYS, `cloudformation function ${name}`);
    if (typeof entry.logical_id !== "string" || !entry.logical_id || !Array.isArray(entry.expected_keys) || entry.expected_keys.some((key) => typeof key !== "string") || entry.expected_keys.join("\n") !== [...entry.expected_keys].sort().join("\n") || new Set(entry.expected_keys).size !== entry.expected_keys.length) throw new Error(`cloudformation function ${name} key inventory is invalid`);
    digest(entry.expected_key_inventory_sha256, `cloudformation function ${name} expected key inventory`);
    if (entry.expected_key_inventory_sha256 !== environmentKeyInventoryDigest(name, entry.logical_id, entry.expected_keys)) throw new Error(`cloudformation function ${name} expected key digest mismatch`);
  }
  const expectedMissing = ALLOWED_FUNCTIONS.filter((name) => !Object.prototype.hasOwnProperty.call(value.function_keys, name)).sort();
  if (value.missing_functions.join("\n") !== expectedMissing.join("\n")) throw new Error("CloudFormation missing-function inventory is inconsistent");
  if (value.complete && (Object.keys(value.function_keys).sort().join("\n") !== [...ALLOWED_FUNCTIONS].sort().join("\n") || value.missing_functions.length !== 0 || value.status !== "PASS" || value.error_code !== null)) throw new Error("complete CloudFormation inventory is semantically invalid");
}

function validateEnvironment(environment, name, cloudformation) {
  exactKeys(environment, ENV_KEYS, `function ${name} environment`);
  if (!["NOT_READ", "VALUES_AVAILABLE", "VALUES_UNAVAILABLE", "ERROR"].includes(environment.read_status) || !["PASS", "DRIFT", "UNAVAILABLE", "ERROR"].includes(environment.schema_status) || typeof environment.values_read !== "boolean") throw new Error(`function ${name} environment status is invalid`);
  if (!Array.isArray(environment.expected_keys) || environment.expected_keys.some((key) => typeof key !== "string") || environment.expected_keys.join("\n") !== [...environment.expected_keys].sort().join("\n") || new Set(environment.expected_keys).size !== environment.expected_keys.length) throw new Error(`function ${name} expected environment keys are invalid`);
  const authority = cloudformation.function_keys?.[name];
  if (authority) {
    if (environment.expected_keys.join("\n") !== authority.expected_keys.join("\n") || environment.expected_key_inventory_sha256 !== authority.expected_key_inventory_sha256) throw new Error(`function ${name} environment authority drifted`);
  }
  digest(environment.expected_key_inventory_sha256, `function ${name} expected key inventory`);
  if (authority && environment.expected_key_inventory_sha256 !== environmentKeyInventoryDigest(name, authority.logical_id, environment.expected_keys)) throw new Error(`function ${name} expected key digest mismatch`);
  digest(environment.key_inventory_sha256, `function ${name} key inventory`);
  if (environment.key_inventory_sha256 !== sha256(canonicalJson({ authority: "PROCESSED_CLOUDFORMATION", expected_keys: environment.expected_keys }))) throw new Error(`function ${name} key inventory digest mismatch`);
  if (environment.read_status === "VALUES_UNAVAILABLE") {
    if (environment.values_read || environment.error_code !== ENVIRONMENT_VALUES_UNAVAILABLE || environment.observed_keys !== null || environment.present !== null || environment.observed_key_inventory_sha256 !== null || environment.missing.length !== 0 || environment.unexpected.length !== 0 || environment.schema_status !== (authority && cloudformation.complete ? "PASS" : "UNAVAILABLE")) throw new Error(`function ${name} unavailable environment is not sanitized`);
  } else if (environment.values_read) {
    if (environment.error_code !== null) throw new Error(`function ${name} readable environment has an error code`);
    if (!Array.isArray(environment.observed_keys) || environment.observed_keys.join("\n") !== [...environment.observed_keys].sort().join("\n") || new Set(environment.observed_keys).size !== environment.observed_keys.length || !environment.present || typeof environment.present !== "object" || Array.isArray(environment.present) || Object.values(environment.present).some((present) => typeof present !== "boolean")) throw new Error(`function ${name} observed environment keys are invalid`);
    const expectedPresent = Object.fromEntries(environment.expected_keys.map((key) => [key, Boolean(environment.present[key])]));
    if (canonicalJson(expectedPresent) !== canonicalJson(environment.present)) throw new Error(`function ${name} environment presence drifted`);
    const missing = environment.expected_keys.filter((key) => !environment.present[key]);
    const unexpected = environment.observed_keys.filter((key) => !environment.expected_keys.includes(key));
    if (canonicalJson(missing) !== canonicalJson(environment.missing) || canonicalJson(unexpected) !== canonicalJson(environment.unexpected)) throw new Error(`function ${name} environment schema drifted`);
    digest(environment.observed_key_inventory_sha256, `function ${name} observed key inventory`);
    const observedDigest = sha256(canonicalJson({ function_name: name, logical_id: authority?.logical_id ?? null, observed_keys: environment.observed_keys }));
    if (environment.observed_key_inventory_sha256 !== observedDigest) throw new Error(`function ${name} observed key digest mismatch`);
    const expectedSchema = missing.length || unexpected.length ? "DRIFT" : authority && cloudformation.complete ? "PASS" : "UNAVAILABLE";
    if (environment.schema_status !== expectedSchema) throw new Error(`function ${name} environment schema status mismatch`);
  } else {
    if (environment.read_status !== "ERROR" && environment.read_status !== "NOT_READ") throw new Error(`function ${name} unread environment status is inconsistent`);
    if (environment.read_status === "ERROR" && environment.schema_status !== "ERROR") throw new Error(`function ${name} error environment status is inconsistent`);
    if (environment.read_status === "NOT_READ" && environment.schema_status !== "UNAVAILABLE") throw new Error(`function ${name} unread environment status is inconsistent`);
    if (environment.error_code !== null && environment.error_code !== "AWS_ENVIRONMENT_READ_FAILED" && environment.error_code !== "AWS_NOT_READ") throw new Error(`function ${name} unread environment error is not sanitized`);
    if (environment.observed_keys !== null || environment.present !== null || environment.observed_key_inventory_sha256 !== null) throw new Error(`function ${name} unread environment shape is invalid`);
  }
}

export function validateInventoryEvidence(evidence) {
  exactKeys(evidence, TOP_LEVEL_KEYS, "inventory evidence");
  if (evidence.schema_version !== SCHEMA_VERSION || typeof evidence.profile !== "string" || evidence.region !== EXPECTED_REGION || typeof evidence.observed_at !== "string" || !Array.isArray(evidence.cloudformation_stacks) || evidence.cloudformation_stacks.join("\n") !== EXPECTED_CLOUDFORMATION_STACKS.join("\n")) throw new Error("inventory identity or CloudFormation authority is incomplete");
  if (!["PASS", "BLOCKED_INCOMPLETE_READBACK", "BLOCKED_PENDING_AWS_AUTH"].includes(evidence.outcome)) throw new Error("inventory outcome is invalid");
  if (evidence.outcome === "PASS" && evidence.blocked_reason !== null) throw new Error("PASS inventory cannot have a blocked reason");
  if (evidence.outcome !== "PASS" && typeof evidence.blocked_reason !== "string") throw new Error("blocked inventory must preserve a reason");
  exactKeys(evidence.identity, IDENTITY_KEYS, "inventory identity");
  if (evidence.identity.account_id !== null && typeof evidence.identity.account_id !== "string") throw new Error("inventory account identity is invalid");
  for (const field of ["account_matches", "readonly_role_matches"]) if (typeof evidence.identity[field] !== "boolean") throw new Error(`inventory ${field} is invalid`);
  for (const field of ["arn_sha256", "user_id_sha256"]) if (evidence.identity[field] !== null) digest(evidence.identity[field], `inventory identity ${field}`);
  if (evidence.outcome === "PASS" && (evidence.identity.account_id !== EXPECTED_ACCOUNT_ID || !evidence.identity.account_matches || !evidence.identity.readonly_role_matches)) throw new Error("PASS inventory identity is not pinned");
  if (!Array.isArray(evidence.function_allowlist) || evidence.function_allowlist.join("\n") !== [...ALLOWED_FUNCTIONS].sort().join("\n")) throw new Error("inventory function allowlist drifted");
  validateCloudFormation(evidence.cloudformation);
  if (!Array.isArray(evidence.functions) || evidence.functions.length !== ALLOWED_FUNCTIONS.length) throw new Error("inventory functions must contain exactly four rows");
  const functionNames = evidence.functions.map((row) => row?.name).sort();
  if (functionNames.join("\n") !== [...ALLOWED_FUNCTIONS].sort().join("\n") || new Set(functionNames).size !== ALLOWED_FUNCTIONS.length) throw new Error("inventory functions must contain one unique row for every approved function");
  for (const row of evidence.functions) {
    exactKeys(row, FUNCTION_KEYS, `function ${row.name}`);
    if (!ALLOWED_FUNCTIONS.includes(row.name) || !["PASS", "ERROR"].includes(row.status) || (row.status === "ERROR" ? typeof row.error_code !== "string" : row.error_code !== null)) throw new Error(`function ${row.name} semantics are invalid`);
    for (const field of ["function_arn_sha256", "role_sha256"]) if (row[field] !== null) digest(row[field], `function ${row.name} ${field}`);
    for (const field of ["revision_id", "last_modified", "runtime", "handler", "state", "last_update_status"]) if (row[field] !== null && typeof row[field] !== "string") throw new Error(`function ${row.name} ${field} is invalid`);
    exactKeys(row.config, CONFIG_KEYS, `function ${row.name} config`);
    for (const field of ["timeout", "memory_size", "ephemeral_storage_size"]) if (row.config[field] !== null && (!Number.isInteger(row.config[field]) || row.config[field] < 0)) throw new Error(`function ${row.name} ${field} is invalid`);
    if (row.config.vpc_id_sha256 !== null) digest(row.config.vpc_id_sha256, `function ${row.name} VPC identity`);
    if (typeof row.config.vpc_present !== "boolean" || !Number.isInteger(row.config.subnet_count) || row.config.subnet_count < 0 || !Number.isInteger(row.config.security_group_count) || row.config.security_group_count < 0 || row.config.reserved_concurrent_executions !== null && (!Number.isInteger(row.config.reserved_concurrent_executions) || row.config.reserved_concurrent_executions < 0)) throw new Error(`function ${row.name} configuration values are invalid`);
    validateEnvironment(row.config.environment, row.name, evidence.cloudformation);
    validateSourceVariables(row.source_variables, row.name);
    exactKeys(row.code, CODE_KEYS, `function ${row.name} code`);
    if ((row.status === "PASS" && !isCanonicalCodeSha256Base64(row.code.code_sha256_base64)) || (row.code.code_sha256_base64 !== null && !isCanonicalCodeSha256Base64(row.code.code_sha256_base64)) || typeof row.code.location_present !== "boolean" || row.code.url_stripped !== true) throw new Error(`function ${row.name} code projection is invalid`);
    exactKeys(row.direct_invoke, DIRECT_KEYS, `function ${row.name} direct invoke`);
    validateSurfaceStatus(row.direct_invoke, `function ${row.name} direct invoke`, ["PASS", "ERROR", "NOT_CONFIGURED", "NOT_READ"]);
    if (typeof row.direct_invoke.function_url_present !== "boolean" || row.direct_invoke.auth_type !== null && typeof row.direct_invoke.auth_type !== "string" || row.direct_invoke.url_stripped !== true) throw new Error(`function ${row.name} direct invoke projection is invalid`);
    const urlPolicy = expectedFunctionUrlPolicy(row.name);
    if (!urlPolicy) throw new Error(`function ${row.name} Function URL policy is missing`);
    if (row.direct_invoke.status === "PASS" && (urlPolicy.mode !== "CONFIGURED" || row.direct_invoke.function_url_present !== true || row.direct_invoke.auth_type !== urlPolicy.auth_type)) throw new Error(`function ${row.name} successful Function URL response violates policy`);
    if (row.direct_invoke.status === "NOT_CONFIGURED" && urlPolicy.mode !== "NONE") throw new Error(`function ${row.name} required Function URL is not configured`);
    if (row.name === "lawos-production-projection-auditor" && (row.status === "PASS" || evidence.outcome === "PASS")) {
      const expectedAuditorKeys = [...PROJECTION_AUDITOR_REQUIRED_ENV_KEYS].sort();
      const actualAuditorKeys = [...row.config.environment.expected_keys].sort();
      if (row.role_sha256 !== sha256(PROJECTION_AUDITOR_EXECUTION_ROLE_ARN) || actualAuditorKeys.join("\n") !== expectedAuditorKeys.join("\n") || actualAuditorKeys.some((key) => PROJECTION_AUDITOR_FORBIDDEN_ENV_KEYS.includes(key)) || row.direct_invoke.status !== "NOT_CONFIGURED" || row.direct_invoke.function_url_present !== false) throw new Error("projection-auditor authority or direct-invoke boundary drifted");
    }
    exactKeys(row.tags, TAG_KEYS, `function ${row.name} tags`);
    validateSurfaceStatus(row.tags, `function ${row.name} tags`, ["PASS", "ERROR", "NOT_READ"]);
    if (!Number.isInteger(row.tags.key_count) || row.tags.key_count < 0 || !row.tags.presence || typeof row.tags.presence !== "object" || Array.isArray(row.tags.presence) || Object.values(row.tags.presence).some((present) => present !== true) || row.tags.key_count !== Object.keys(row.tags.presence).length || Object.keys(row.tags.presence).join("\n") !== [...Object.keys(row.tags.presence)].sort().join("\n")) throw new Error(`function ${row.name} tags projection is invalid`);
    exactKeys(row.logs, LOG_KEYS, `function ${row.name} logs`);
    validateSurfaceStatus(row.logs, `function ${row.name} logs`, ["PASS", "ERROR", "INCOMPLETE", "NOT_READ"]);
    if (typeof row.logs.complete !== "boolean" || !Number.isInteger(row.logs.event_count) || row.logs.event_count < 0 || (row.logs.status === "PASS" && row.logs.complete !== true) || (row.logs.status === "INCOMPLETE" && row.logs.complete !== false) || row.logs.first_event_at !== null && typeof row.logs.first_event_at !== "string" || row.logs.last_event_at !== null && typeof row.logs.last_event_at !== "string" || row.logs.first_failure_at !== null && typeof row.logs.first_failure_at !== "string" || !Array.isArray(row.logs.classes) || row.logs.classes.some((entry) => typeof entry !== "string") || row.logs.classes.join("\n") !== [...row.logs.classes].sort().join("\n") || new Set(row.logs.classes).size !== row.logs.classes.length || !Array.isArray(row.logs.request_ids)) throw new Error(`function ${row.name} log summary is invalid`);
    for (const requestId of row.logs.request_ids) { exactKeys(requestId, REQUEST_ID_KEYS, `function ${row.name} request id`); digest(requestId.request_id_sha256, "request id digest"); if (!Number.isInteger(requestId.event_count) || requestId.event_count < 1 || requestId.first_event_at !== null && typeof requestId.first_event_at !== "string" || requestId.last_event_at !== null && typeof requestId.last_event_at !== "string") throw new Error(`function ${row.name} request id summary is invalid`); }
    if (row.logs.request_ids.map((entry) => entry.request_id_sha256).join("\n") !== [...row.logs.request_ids].map((entry) => entry.request_id_sha256).sort().join("\n")) throw new Error(`function ${row.name} request id order is invalid`);
    validateMetricSet(row.metrics, FUNCTION_METRICS, `function ${row.name}`);
    if (!Array.isArray(row.config.architectures ?? row.architecture) || row.architecture.some((value) => typeof value !== "string") || row.architecture.join("\n") !== [...row.architecture].sort().join("\n") || new Set(row.architecture).size !== row.architecture.length) throw new Error(`function ${row.name} architectures are invalid`);
    if (!Array.isArray(row.config.subnet_id_sha256) || row.config.subnet_id_sha256.some((value) => !isSha256Hex(value)) || row.config.subnet_id_sha256.join("\n") !== [...row.config.subnet_id_sha256].sort().join("\n") || new Set(row.config.subnet_id_sha256).size !== row.config.subnet_id_sha256.length || !Array.isArray(row.config.security_group_id_sha256) || row.config.security_group_id_sha256.some((value) => !isSha256Hex(value)) || row.config.security_group_id_sha256.join("\n") !== [...row.config.security_group_id_sha256].sort().join("\n") || new Set(row.config.security_group_id_sha256).size !== row.config.security_group_id_sha256.length) throw new Error(`function ${row.name} network identities are invalid`);
    if (typeof row.config.ipv6_allowed_for_dual_stack !== "boolean") throw new Error(`function ${row.name} IPv6 network setting is invalid`);
    validateAdditionalConfiguration(row.config.additional_configuration, `function ${row.name} additional configuration`);
    if (!Array.isArray(row.config.provisioned_concurrency)) throw new Error(`function ${row.name} provisioned concurrency is invalid`);
    for (const concurrency of row.config.provisioned_concurrency) { exactKeys(concurrency, PROVISIONED_KEYS, `function ${row.name} provisioned concurrency`); if (typeof concurrency.qualifier !== "string" || !concurrency.qualifier || !Number.isInteger(concurrency.requested) || concurrency.requested < 0) throw new Error(`function ${row.name} provisioned concurrency values are invalid`); }
    if (row.config.provisioned_concurrency.map((entry) => String(entry.qualifier)).join("\n") !== [...row.config.provisioned_concurrency].map((entry) => String(entry.qualifier)).sort().join("\n")) throw new Error(`function ${row.name} provisioned concurrency order is invalid`);
    validateStableProjection(row, evidence.cloudformation);
    validateRollback(row, row.name === "lawos-production-projection-auditor", evidence.outcome);
    if (row.status === "PASS" && row.config.environment.schema_status !== "PASS") throw new Error(`function ${row.name} PASS lacks processed environment authority`);
    const expectedDirectStatus = urlPolicy.mode === "NONE" ? "NOT_CONFIGURED" : "PASS";
    if (row.status === "PASS" && (row.direct_invoke.status !== expectedDirectStatus || row.tags.status !== "PASS" || row.logs.status !== "PASS" || row.metrics.some((metric) => metric.status !== "PASS"))) throw new Error(`function ${row.name} PASS has an incomplete read surface`);
    if (row.code.location_present !== true && row.code.url_stripped !== true) throw new Error(`function ${row.name} code location projection is invalid`);
  }
  validateTopology(evidence.topology);
  validateAlarms(evidence.cloudwatch_alarms);
  validateRds(evidence.rds);
  exactKeys(evidence.read_only, READ_ONLY_KEYS, "inventory read-only controls");
  if (evidence.read_only.mode !== "read-only" || evidence.read_only.mutation_count !== 0 || evidence.read_only.secret_read_count !== 0 || evidence.read_only.lambda_invoke_count !== 0 || JSON.stringify([...evidence.read_only.command_allowlist].sort()) !== JSON.stringify([...READ_ONLY_AWS_OPERATIONS].sort())) throw new Error("inventory mutation, secret-read, or command allowlist semantics are invalid");
  if (!Array.isArray(evidence.aws_calls) || evidence.aws_calls.some((call) => { exactKeys(call, AWS_CALL_KEYS, "inventory AWS call"); return !READ_ONLY_AWS_OPERATIONS.has(`${call.service}:${call.operation}`) || (call.target !== null && typeof call.target !== "string"); })) throw new Error("inventory contains a non-read-only AWS call");
  if (/X-Amz-|presigned[^a-z]|location_sha256|url_sha256|values_sha256|synthetic-password|super-secret-password/iu.test(JSON.stringify(evidence))) throw new Error("inventory contains forbidden URL or value-derived material");
  if (evidence.outcome === "PASS" && (!evidence.cloudformation.complete || !evidence.rds.complete || !evidence.topology.complete || !evidence.cloudwatch_alarms.complete || evidence.functions.some((row) => row.status !== "PASS" || row.logs?.complete !== true || row.config.environment.schema_status !== "PASS"))) throw new Error("PASS inventory is incomplete");
  const withoutDigest = { ...evidence, inventory_sha256: null };
  digest(evidence.inventory_sha256, "inventory digest");
  if (evidence.inventory_sha256 !== sha256(canonicalJson(withoutDigest))) throw new Error("inventory digest mismatch");
  return evidence;
}
