import path from "node:path";
import {
  expectedFunctionIdentity,
  SOURCE_VARIABLE_NAMES,
  canonicalJson,
  configurationFingerprints,
  environmentStableProjection,
  exactKeys,
  isCanonicalCodeSha256Base64,
  isSha256Hex,
  sha256,
} from "./outlook-production-aws-inventory-contract.mjs";

const ROLLBACK_KEYS = ["status", "error_code", "path", "manifest_path", "bytes", "zip_sha256", "code_sha256_base64", "matches_code_sha256"];
export const PROVISIONED_KEYS = ["qualifier", "requested"];
const STABLE_CONFIG_KEYS = ["function_name", "function_arn_sha256", "role_sha256", "runtime", "handler", "code_sha256_base64", "timeout", "memory_size", "ephemeral_storage_size", "architectures", "vpc_id_sha256", "subnet_id_sha256", "security_group_id_sha256", "ipv6_allowed_for_dual_stack", "reserved_concurrent_executions", "provisioned_concurrency", "environment_key_inventory", "function_url_present", "function_url_auth_type", "additional_configuration"];
const ENV_STABLE_KEYS = ["authority", "expected_keys", "expected_key_inventory_sha256"];
const ADDITIONAL_CONFIG_KEYS = ["package_type", "code_size", "version", "description_sha256", "dead_letter_target_sha256", "kms_key_sha256", "tracing_mode", "layers_sha256", "file_system_configs", "image_config", "snap_start", "logging_config", "runtime_version_arn_sha256", "code_signing_config_arn_sha256", "function_url_auth_type_config", "master_arn_sha256", "signing_profile_version_arn_sha256", "signing_job_arn_sha256"];
const FILE_SYSTEM_CONFIG_KEYS = ["arn_sha256", "local_mount_path"];
const IMAGE_CONFIG_KEYS = ["entry_point_sha256", "command_sha256", "working_directory"];
const SNAP_START_KEYS = ["apply_on", "optimization_status"];
const LOGGING_CONFIG_KEYS = ["log_format", "application_log_level", "system_log_level", "log_group_name_sha256"];
const SOURCE_VARIABLE_KEYS = ["name", "present", "status"];

export function validateAdditionalConfiguration(value, label) {
  exactKeys(value, ADDITIONAL_CONFIG_KEYS, label);
  if (value.package_type !== null && typeof value.package_type !== "string") throw new Error(`${label} package type is invalid`);
  if (value.code_size !== null && (!Number.isInteger(value.code_size) || value.code_size < 0)) throw new Error(`${label} code size is invalid`);
  if (value.version !== null && typeof value.version !== "string") throw new Error(`${label} version is invalid`);
  for (const field of ["description_sha256", "dead_letter_target_sha256", "kms_key_sha256", "runtime_version_arn_sha256", "code_signing_config_arn_sha256", "master_arn_sha256", "signing_profile_version_arn_sha256", "signing_job_arn_sha256"]) if (value[field] !== null && !isSha256Hex(value[field])) throw new Error(`${label} ${field} is invalid`);
  if (value.tracing_mode !== null && typeof value.tracing_mode !== "string") throw new Error(`${label} tracing mode is invalid`);
  if (!Array.isArray(value.layers_sha256) || value.layers_sha256.some((entry) => !isSha256Hex(entry))) throw new Error(`${label} layers are invalid`);
  if (!Array.isArray(value.file_system_configs)) throw new Error(`${label} file system configs are invalid`);
  for (const entry of value.file_system_configs) { exactKeys(entry, FILE_SYSTEM_CONFIG_KEYS, `${label} file system config`); if (entry.arn_sha256 !== null) digest(entry.arn_sha256, `${label} file system ARN`); if (entry.local_mount_path !== null && typeof entry.local_mount_path !== "string") throw new Error(`${label} local mount path is invalid`); }
  if (value.file_system_configs.map((entry) => `${entry.arn_sha256}:${entry.local_mount_path}`).join("\n") !== [...value.file_system_configs].map((entry) => `${entry.arn_sha256}:${entry.local_mount_path}`).sort().join("\n")) throw new Error(`${label} file system configs are not sorted`);
  exactKeys(value.image_config, IMAGE_CONFIG_KEYS, `${label} image config`);
  for (const field of ["entry_point_sha256", "command_sha256"]) if (!Array.isArray(value.image_config[field]) || value.image_config[field].some((entry) => !isSha256Hex(entry))) throw new Error(`${label} image ${field} is invalid`);
  if (value.image_config.working_directory !== null && typeof value.image_config.working_directory !== "string") throw new Error(`${label} image working directory is invalid`);
  exactKeys(value.snap_start, SNAP_START_KEYS, `${label} SnapStart`);
  for (const field of SNAP_START_KEYS) if (value.snap_start[field] !== null && typeof value.snap_start[field] !== "string") throw new Error(`${label} SnapStart ${field} is invalid`);
  exactKeys(value.logging_config, LOGGING_CONFIG_KEYS, `${label} logging config`);
  for (const field of ["log_format", "application_log_level", "system_log_level"]) if (value.logging_config[field] !== null && typeof value.logging_config[field] !== "string") throw new Error(`${label} logging ${field} is invalid`);
  if (value.logging_config.log_group_name_sha256 !== null) digest(value.logging_config.log_group_name_sha256, `${label} logging group`);
  if (value.function_url_auth_type_config !== null && typeof value.function_url_auth_type_config !== "string") throw new Error(`${label} function URL auth type is invalid`);
}

function digest(value, label) {
  if (!isSha256Hex(value)) throw new Error(`${label} must be a lowercase SHA-256 digest`);
}

export function validateStableProjection(row, cloudformation) {
  exactKeys(row.config_stable_projection, STABLE_CONFIG_KEYS, `function ${row.name} stable projection`);
  const stable = row.config_stable_projection;
  for (const field of ["function_arn_sha256", "role_sha256", "vpc_id_sha256"]) if (stable[field] !== null) digest(stable[field], `function ${row.name} ${field}`);
  for (const field of ["subnet_id_sha256", "security_group_id_sha256"]) if (!Array.isArray(stable[field]) || stable[field].some((value) => !isSha256Hex(value)) || stable[field].join("\n") !== [...stable[field]].sort().join("\n") || new Set(stable[field]).size !== stable[field].length) throw new Error(`function ${row.name} ${field} is invalid`);
  if (typeof stable.ipv6_allowed_for_dual_stack !== "boolean") throw new Error(`function ${row.name} IPv6 network setting is invalid`);
  for (const field of ["runtime", "handler", "function_url_auth_type"]) if (stable[field] !== null && typeof stable[field] !== "string") throw new Error(`function ${row.name} stable ${field} is invalid`);
  if (stable.code_sha256_base64 !== null && !isCanonicalCodeSha256Base64(stable.code_sha256_base64) || !Array.isArray(stable.architectures) || stable.architectures.some((value) => typeof value !== "string") || stable.architectures.join("\n") !== [...stable.architectures].sort().join("\n") || new Set(stable.architectures).size !== stable.architectures.length) throw new Error(`function ${row.name} stable code/config types are invalid`);
  for (const field of ["timeout", "memory_size", "ephemeral_storage_size"]) if (stable[field] !== null && (!Number.isInteger(stable[field]) || stable[field] < 0)) throw new Error(`function ${row.name} stable ${field} is invalid`);
  if (stable.reserved_concurrent_executions !== null && (!Number.isInteger(stable.reserved_concurrent_executions) || stable.reserved_concurrent_executions < 0) || !Array.isArray(stable.provisioned_concurrency)) throw new Error(`function ${row.name} stable concurrency is invalid`);
  validateAdditionalConfiguration(stable.additional_configuration, `function ${row.name} stable additional configuration`);
  exactKeys(stable.environment_key_inventory, ENV_STABLE_KEYS, `function ${row.name} environment stable projection`);
  if (stable.environment_key_inventory.authority !== "PROCESSED_CLOUDFORMATION" || stable.environment_key_inventory.expected_keys.join("\n") !== row.config.environment.expected_keys.join("\n") || stable.environment_key_inventory.expected_key_inventory_sha256 !== row.config.environment.expected_key_inventory_sha256) throw new Error(`function ${row.name} stable environment projection drifted`);
  const expectedStable = {
    function_name: row.name,
    function_arn_sha256: row.function_arn_sha256,
    role_sha256: row.role_sha256,
    runtime: row.runtime,
    handler: row.handler,
    code_sha256_base64: row.code.code_sha256_base64,
    timeout: row.config.timeout,
    memory_size: row.config.memory_size,
    ephemeral_storage_size: row.config.ephemeral_storage_size,
    architectures: row.architecture,
    vpc_id_sha256: row.config.vpc_id_sha256,
    subnet_id_sha256: row.config.subnet_id_sha256,
    security_group_id_sha256: row.config.security_group_id_sha256,
    ipv6_allowed_for_dual_stack: row.config.ipv6_allowed_for_dual_stack,
    reserved_concurrent_executions: row.config.reserved_concurrent_executions,
    provisioned_concurrency: row.config.provisioned_concurrency,
    environment_key_inventory: environmentStableProjection(row.config.environment.expected_keys, row.config.environment.expected_key_inventory_sha256),
    function_url_present: row.direct_invoke.function_url_present,
    function_url_auth_type: row.direct_invoke.auth_type,
    additional_configuration: row.config.additional_configuration,
  };
  if (canonicalJson(expectedStable) !== canonicalJson(stable)) throw new Error(`function ${row.name} stable projection is not cross-bound`);
  if (!Object.prototype.hasOwnProperty.call(stable, "code_sha256_base64")) throw new Error(`function ${row.name} full projection code identity is missing`);
  if (row.status === "PASS") {
    const expected = expectedFunctionIdentity(row.name);
    if (!expected
      || row.function_arn_sha256 !== sha256(expected.function_arn)
      || row.role_sha256 !== sha256(expected.role_arn)
      || row.runtime !== expected.runtime
      || row.handler !== expected.handler
      || row.architecture.length !== 1
      || row.architecture[0] !== expected.architecture
      || stable.additional_configuration.package_type !== expected.package_type
      || !isCanonicalCodeSha256Base64(row.code.code_sha256_base64)
      || typeof row.revision_id !== "string"
      || row.revision_id.trim() === ""
      || row.state !== "Active"
      || row.last_update_status !== "Successful"
      || row.last_modified === null) throw new Error(`function ${row.name} PASS identity is incomplete`);
  }
  const fingerprints = configurationFingerprints(stable);
  digest(row.configuration_fingerprint_sha256, `function ${row.name} configuration fingerprint`);
  digest(row.non_code_configuration_fingerprint_sha256, `function ${row.name} non-code fingerprint`);
  if (row.configuration_fingerprint_sha256 !== fingerprints.configuration_fingerprint_sha256 || row.non_code_configuration_fingerprint_sha256 !== fingerprints.non_code_configuration_fingerprint_sha256) throw new Error(`function ${row.name} configuration fingerprint mismatch`);
  if (cloudformation.function_keys?.[row.name] && stable.environment_key_inventory.expected_key_inventory_sha256 !== cloudformation.function_keys[row.name].expected_key_inventory_sha256) throw new Error(`function ${row.name} stable projection authority mismatch`);
}

export function validateSourceVariables(value, name) {
  if (!Array.isArray(value) || value.length !== SOURCE_VARIABLE_NAMES.length) throw new Error(`function ${name} source variable inventory is invalid`);
  const names = value.map((entry) => entry?.name).sort();
  if (names.join("\n") !== [...SOURCE_VARIABLE_NAMES].sort().join("\n") || new Set(names).size !== names.length) throw new Error(`function ${name} source variable allowlist drifted`);
  for (const entry of value) { exactKeys(entry, SOURCE_VARIABLE_KEYS, `function ${name} source variable`); if (!["OBSERVED", "UNAVAILABLE"].includes(entry.status) || (entry.status === "OBSERVED" ? typeof entry.present !== "boolean" : entry.present !== null)) throw new Error(`function ${name} source variable presence is invalid`); }
}

export function validateRollback(row, isAuditor, outcome) {
  exactKeys(row.rollback_code, ROLLBACK_KEYS, `function ${row.name} rollback`);
  if (row.rollback_code.status === "CAPTURED") {
    if (!isAuditor || row.rollback_code.error_code !== null || !Number.isInteger(row.rollback_code.bytes) || row.rollback_code.bytes <= 0 || typeof row.rollback_code.path !== "string" || !path.isAbsolute(row.rollback_code.path) || typeof row.rollback_code.manifest_path !== "string" || !path.isAbsolute(row.rollback_code.manifest_path) || !isSha256Hex(row.rollback_code.zip_sha256) || !isCanonicalCodeSha256Base64(row.rollback_code.code_sha256_base64) || row.rollback_code.code_sha256_base64 !== row.code.code_sha256_base64 || row.rollback_code.matches_code_sha256 !== true) throw new Error(`function ${row.name} rollback binding is invalid`);
  } else if (row.rollback_code.status === "NOT_REQUESTED") {
    if (row.rollback_code.error_code !== null || row.rollback_code.path !== null || row.rollback_code.manifest_path !== null || row.rollback_code.bytes !== null || row.rollback_code.zip_sha256 !== null || row.rollback_code.code_sha256_base64 !== null || row.rollback_code.matches_code_sha256 !== null) throw new Error(`function ${row.name} rollback not-requested shape is invalid`);
  } else if (row.rollback_code.status === "BLOCKED_ROLLBACK_CAPTURE_FAILED") {
    if (typeof row.rollback_code.error_code !== "string" || row.rollback_code.path !== null || row.rollback_code.manifest_path !== null || row.rollback_code.bytes !== null || row.rollback_code.zip_sha256 !== null || row.rollback_code.code_sha256_base64 !== null || row.rollback_code.matches_code_sha256 !== false) throw new Error(`function ${row.name} rollback blocked shape is invalid`);
  } else throw new Error(`function ${row.name} rollback status is invalid`);
  if (isAuditor && outcome === "PASS" && row.rollback_code.status !== "CAPTURED") throw new Error("PASS inventory requires captured projection-auditor rollback");
  if (!isAuditor && row.rollback_code.status !== "NOT_REQUESTED") throw new Error(`function ${row.name} must not carry rollback material`);
}
