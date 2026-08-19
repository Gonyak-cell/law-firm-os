import {
  catalogReadbackCanonicalSnapshot,
} from "../../packages/persistence/src/postgres/catalog-readback-canonical.js";
import {
  CATALOG_READBACK_TOKEN as REVISION_ID,
} from "../../packages/persistence/src/postgres/catalog-readback-authorization-fields.js";
import {
  canonicalizeJson,
} from "../../packages/runtime-auth/src/runtime-safety-approval-contract.js";
import {
  configurationFingerprints,
  expectedFunctionIdentity,
  optionalHashableIdentifier,
} from "./outlook-production-aws-inventory-contract.mjs";
import {
  TASK3_SHA256 as SHA256,
  task3ExactKeys as exactKeys,
  task3Fail as fail,
} from "./production-catalog-readback-common.mjs";
import {
  exactProjectionAuditorEnvironment,
} from "./production-catalog-readback-task2-authority.mjs";

const STATE_KEYS = Object.freeze([
  "revision_id",
  "code_sha256_base64",
  "configuration_fingerprint_sha256",
  "non_code_configuration_fingerprint_sha256",
  "config_stable_projection",
  "non_code_configuration",
  "state",
  "last_update_status",
]);
const UPDATE_RESULT_KEYS = Object.freeze([
  "revision_id",
  "code_sha256_base64",
]);
const NON_CODE_CONFIGURATION_KEYS = Object.freeze([
  "function_name",
  "function_arn_sha256",
  "role_sha256",
  "runtime",
  "handler",
  "timeout",
  "memory_size",
  "ephemeral_storage_size",
  "architectures",
  "vpc_id_sha256",
  "subnet_id_sha256",
  "security_group_id_sha256",
  "ipv6_allowed_for_dual_stack",
  "reserved_concurrent_executions",
  "provisioned_concurrency",
  "environment_key_inventory",
  "function_url_present",
  "function_url_auth_type",
  "additional_configuration",
]);
const EXPECTED_FUNCTION_IDENTITY = expectedFunctionIdentity(
  "lawos-production-projection-auditor",
);
const EXPECTED_FUNCTION_ARN_SHA256 = optionalHashableIdentifier(
  EXPECTED_FUNCTION_IDENTITY.function_arn,
);
const EXPECTED_ROLE_SHA256 = optionalHashableIdentifier(
  EXPECTED_FUNCTION_IDENTITY.role_arn,
);

function validateSortedDigests(value, label, { allowEmpty = true } = {}) {
  if (!Array.isArray(value)
    || (!allowEmpty && value.length === 0)
    || value.some((entry) => !SHA256.test(entry ?? ""))
    || value.join("\n") !== [...value].sort().join("\n")
    || new Set(value).size !== value.length) {
    fail("TASK3_FUNCTION_STATE_DRIFT", `${label} is invalid`);
  }
}

function validateNonCodeConfiguration(value, label) {
  exactKeys(
    value,
    NON_CODE_CONFIGURATION_KEYS,
    "TASK3_FUNCTION_STATE_DRIFT",
    label,
  );
  if (value.function_name !== "lawos-production-projection-auditor"
    || value.function_arn_sha256 !== EXPECTED_FUNCTION_ARN_SHA256
    || value.role_sha256 !== EXPECTED_ROLE_SHA256
    || value.runtime !== "nodejs22.x"
    || value.handler
      !== "apps/api/src/json-postgres-program-admin-lambda.handler"
    || !Array.isArray(value.architectures)
    || value.architectures.join("\n") !== "arm64"
    || !SHA256.test(value.vpc_id_sha256 ?? "")
    || typeof value.ipv6_allowed_for_dual_stack !== "boolean"
    || value.reserved_concurrent_executions !== 1
    || !Array.isArray(value.provisioned_concurrency)
    || value.function_url_present !== false
    || value.function_url_auth_type !== null
    || !exactProjectionAuditorEnvironment(value.environment_key_inventory)
    || !value.additional_configuration
    || typeof value.additional_configuration !== "object"
    || Array.isArray(value.additional_configuration)) {
    fail("TASK3_FUNCTION_STATE_DRIFT", `${label} is invalid`);
  }
  validateSortedDigests(value.subnet_id_sha256, `${label} subnet identity`, {
    allowEmpty: false,
  });
  validateSortedDigests(
    value.security_group_id_sha256,
    `${label} security-group identity`,
    { allowEmpty: false },
  );
  return value;
}

function validateCodeSha(value, label) {
  let bytes;
  try {
    bytes = Buffer.from(value ?? "", "base64");
  } catch {
    bytes = Buffer.alloc(0);
  }
  if (typeof value !== "string" || bytes.byteLength !== 32
    || bytes.equals(Buffer.alloc(32))
    || bytes.toString("base64") !== value) {
    fail("TASK3_FUNCTION_STATE_DRIFT", `${label} is invalid`);
  }
}

export function validateState(value, label) {
  const snapshot = catalogReadbackCanonicalSnapshot(value);
  exactKeys(snapshot, STATE_KEYS, "TASK3_FUNCTION_STATE_DRIFT", label);
  if (!REVISION_ID.test(snapshot.revision_id ?? "")
    || !SHA256.test(snapshot.configuration_fingerprint_sha256 ?? "")
    || !SHA256.test(snapshot.non_code_configuration_fingerprint_sha256 ?? "")
    || snapshot.state !== "Active"
    || snapshot.last_update_status !== "Successful") {
    fail("TASK3_FUNCTION_STATE_DRIFT", `${label} is invalid`);
  }
  validateCodeSha(snapshot.code_sha256_base64, `${label} CodeSha256`);
  const nonCode = validateNonCodeConfiguration(
    snapshot.non_code_configuration,
    `${label} non-code configuration`,
  );
  exactKeys(
    snapshot.config_stable_projection,
    [...NON_CODE_CONFIGURATION_KEYS, "code_sha256_base64"],
    "TASK3_FUNCTION_STATE_DRIFT",
    `${label} full stable projection`,
  );
  const recomputed = configurationFingerprints(
    snapshot.config_stable_projection,
  );
  if (snapshot.config_stable_projection.code_sha256_base64
      !== snapshot.code_sha256_base64
    || snapshot.non_code_configuration_fingerprint_sha256
      !== recomputed.non_code_configuration_fingerprint_sha256
    || snapshot.configuration_fingerprint_sha256
      !== recomputed.configuration_fingerprint_sha256
    || canonicalizeJson(nonCode)
      !== canonicalizeJson(recomputed.non_code_stable)) {
    fail("TASK3_FUNCTION_STATE_DRIFT", `${label} fingerprint is invalid`);
  }
  return snapshot;
}

export function validateUpdateResult(value, label) {
  const snapshot = catalogReadbackCanonicalSnapshot(value);
  exactKeys(snapshot, UPDATE_RESULT_KEYS, "TASK3_CODE_UPDATE_DRIFT", label);
  if (!REVISION_ID.test(snapshot.revision_id ?? "")) {
    fail("TASK3_CODE_UPDATE_DRIFT", `${label} RevisionId is invalid`);
  }
  validateCodeSha(snapshot.code_sha256_base64, `${label} CodeSha256`);
  return snapshot;
}

export function sameRawNonCode(left, right) {
  return canonicalizeJson(left) === canonicalizeJson(right);
}

export function validatePreState(state, packet) {
  const snapshot = validateState(state, "pre-deploy function state");
  if (snapshot.revision_id !== packet.pre_state.revision_id
    || snapshot.code_sha256_base64 !== packet.pre_state.code_sha256_base64
    || snapshot.configuration_fingerprint_sha256
      !== packet.pre_state.configuration_fingerprint_sha256
    || snapshot.non_code_configuration_fingerprint_sha256
      !== packet.pre_state.non_code_configuration_fingerprint_sha256) {
    fail("TASK3_PREFLIGHT_STATE_DRIFT", "pre-deploy function state drifted");
  }
  return snapshot;
}

export function validateDiagnosticState(state, packet, revisionId, rawNonCode) {
  const snapshot = validateState(state, "diagnostic function state");
  if (snapshot.revision_id !== revisionId
    || snapshot.revision_id === packet.pre_state.revision_id
    || snapshot.code_sha256_base64
      !== packet.diagnostic_artifact.code_sha256_base64
    || snapshot.configuration_fingerprint_sha256
      === packet.pre_state.configuration_fingerprint_sha256
    || snapshot.non_code_configuration_fingerprint_sha256
      !== packet.pre_state.non_code_configuration_fingerprint_sha256
    || !sameRawNonCode(snapshot.non_code_configuration, rawNonCode)) {
    fail("TASK3_DIAGNOSTIC_STATE_DRIFT", "diagnostic function state drifted");
  }
  return snapshot;
}

export function validateRestoredState(
  state,
  packet,
  diagnosticRevisionId,
  restoredRevisionId,
  rawNonCode,
) {
  const snapshot = validateState(state, "restored function state");
  if (snapshot.revision_id !== restoredRevisionId
    || new Set([
      packet.pre_state.revision_id,
      diagnosticRevisionId,
      restoredRevisionId,
    ]).size !== 3
    || snapshot.code_sha256_base64 !== packet.pre_state.code_sha256_base64
    || snapshot.configuration_fingerprint_sha256
      !== packet.pre_state.configuration_fingerprint_sha256
    || snapshot.non_code_configuration_fingerprint_sha256
      !== packet.pre_state.non_code_configuration_fingerprint_sha256
    || !sameRawNonCode(snapshot.non_code_configuration, rawNonCode)) {
    fail("TASK3_RESTORED_STATE_DRIFT", "restored function state drifted");
  }
  return snapshot;
}

export function safeOperationCode(error, fallback) {
  const code = String(error?.code ?? "");
  if (/^(?:LAWOS_CATALOG_READBACK|TASK3_)[A-Z0-9_]*$/u.test(code)) {
    return code.replace(/^LAWOS_/u, "");
  }
  return fallback;
}

export function requireAwsPort(aws) {
  for (const method of [
    "getCallerIdentity",
    "getFunctionState",
    "updateFunctionCode",
    "waitForFunctionActive",
    "invokeFunction",
  ]) {
    if (typeof aws?.[method] !== "function") {
      fail("TASK3_AWS_PORT_INVALID", `AWS port ${method} is required`);
    }
  }
  return aws;
}
