import {
  FUNCTION_METRICS,
  expectedFunctionIdentity,
  expectedFunctionUrlPolicy,
  PROJECTION_AUDITOR_EXECUTION_ROLE_ARN,
  PROJECTION_AUDITOR_FORBIDDEN_ENV_KEYS,
  PROJECTION_AUDITOR_REQUIRED_ENV_KEYS,
  isCanonicalCodeSha256Base64,
  optionalHashableIdentifier,
  safeDate,
  sortedUnique,
} from "./outlook-production-aws-inventory-contract.mjs";
import {
  validateFunctionResponsePair,
} from "./outlook-production-aws-inventory-function-boundary.mjs";
import {
  CONFIGURATION_FIELDS,
  additionalConfigurationProjection,
  configurationProjection,
  finite,
  networkProjection,
  normalizedProvisionedConcurrency,
} from "./outlook-production-aws-inventory-projection-configuration.mjs";
import {
  emptyEnvironment,
  projectEnvironment,
  projectSourceVariables,
} from "./outlook-production-aws-inventory-projection-environment.mjs";
import {
  projectAlarms,
  projectDirectInvoke,
  projectLogs,
  projectMetric,
  projectRds,
  projectTags,
} from "./outlook-production-aws-inventory-projection-surfaces.mjs";

export function projectFunction({ name, getFunctionResponse = {}, configurationResponse = {}, configurationError = null, responseBoundaryError = null, validatedResponseBoundary = null, expectedKeys = [], expectedKeyInfo = {}, directInvoke, tags, logs, metrics, rollbackCode, reservedConcurrency = null, provisionedConcurrency = [] }) {
  const responseBoundary = validatedResponseBoundary ?? (responseBoundaryError
    ? { error_code: responseBoundaryError, configuration: null, getFunction: null, configurationResponse: null, code_location: null }
    : validateFunctionResponsePair({ name, getFunctionResponse, configurationResponse, configurationError }));
  const boundaryFailed = Boolean(responseBoundary.error_code);
  // Only the independently validated boundary projections may reach the
  // projector. On any boundary error the sanitized empty projections force an
  // ERROR row and prevent malformed provider fields from being re-merged.
  const functionData = boundaryFailed ? (responseBoundary.getFunction ?? {}) : (responseBoundary.getFunction ?? {});
  const configuration = boundaryFailed ? (responseBoundary.configuration ?? {}) : (responseBoundary.configuration ?? {});
  const effectiveConfiguration = { ...(functionData ?? {}), ...(configuration ?? {}) };
  const unhandledConfiguration = Object.keys(effectiveConfiguration).filter((key) => !CONFIGURATION_FIELDS.has(key));
  const expected = Array.isArray(expectedKeys) && expectedKeys.length ? { ...expectedKeyInfo, expected_keys: expectedKeys } : expectedKeyInfo && Object.keys(expectedKeyInfo).length ? expectedKeyInfo : expectedKeys;
  const environment = projectEnvironment(effectiveConfiguration, expected, { functionName: name, configurationError });
  const rawCodeSha = responseBoundary.code_sha_invalid === true
    ? null
    : effectiveConfiguration?.CodeSha256 ?? functionData?.CodeSha256 ?? null;
  const codeShaValid = isCanonicalCodeSha256Base64(rawCodeSha);
  const codeSha = codeShaValid ? rawCodeSha : null;
  const functionArn = effectiveConfiguration?.FunctionArn ?? functionData?.FunctionArn ?? null;
  const roleArn = effectiveConfiguration?.Role ?? functionData?.Role ?? null;
  const revisionId = effectiveConfiguration?.RevisionId ?? functionData?.RevisionId ?? null;
  const expectedIdentity = expectedFunctionIdentity(name);
  const architecture = Array.isArray(effectiveConfiguration?.Architectures) ? sortedUnique(effectiveConfiguration.Architectures) : [];
  const identityFieldsValid = Boolean(expectedIdentity)
    && effectiveConfiguration?.FunctionName === name
    && functionArn === expectedIdentity.function_arn
    && roleArn === expectedIdentity.role_arn
    && effectiveConfiguration?.Runtime === expectedIdentity.runtime
    && effectiveConfiguration?.Handler === expectedIdentity.handler
    && effectiveConfiguration?.PackageType === expectedIdentity.package_type
    && architecture.length === 1
    && architecture[0] === expectedIdentity.architecture
    && typeof revisionId === "string"
    && revisionId.trim().length > 0
    && safeDate(effectiveConfiguration?.LastModified ?? functionData?.LastModified) !== null
    && effectiveConfiguration?.State === "Active"
    && effectiveConfiguration?.LastUpdateStatus === "Successful";
  const identityValid = identityFieldsValid && codeShaValid;
  const network = networkProjection(effectiveConfiguration);
  const configProjection = configurationProjection({ name, functionData, configuration: effectiveConfiguration, environment, directInvoke, reservedConcurrency, provisionedConcurrency, codeSha256: codeSha });
  const record = {
    name,
    status: "PASS",
    error_code: null,
    function_arn_sha256: optionalHashableIdentifier(functionArn),
    role_sha256: optionalHashableIdentifier(roleArn),
    revision_id: revisionId,
    last_modified: safeDate(effectiveConfiguration?.LastModified ?? functionData?.LastModified),
    runtime: effectiveConfiguration?.Runtime ?? functionData?.Runtime ?? null,
    architecture,
    handler: effectiveConfiguration?.Handler ?? functionData?.Handler ?? null,
    state: effectiveConfiguration?.State ?? functionData?.State ?? null,
    last_update_status: effectiveConfiguration?.LastUpdateStatus ?? functionData?.LastUpdateStatus ?? null,
    config: {
      timeout: finite(effectiveConfiguration?.Timeout),
      memory_size: finite(effectiveConfiguration?.MemorySize),
      ephemeral_storage_size: finite(effectiveConfiguration?.EphemeralStorage?.Size),
      vpc_id_sha256: network.vpc_id_sha256,
      subnet_id_sha256: network.subnet_id_sha256,
      security_group_id_sha256: network.security_group_id_sha256,
      ipv6_allowed_for_dual_stack: network.ipv6_allowed_for_dual_stack,
      vpc_present: network.vpc_present,
      subnet_count: network.subnet_count,
      security_group_count: network.security_group_count,
      reserved_concurrent_executions: reservedConcurrency,
      provisioned_concurrency: normalizedProvisionedConcurrency(provisionedConcurrency),
      environment,
      additional_configuration: additionalConfigurationProjection(effectiveConfiguration),
    },
    source_variables: projectSourceVariables(environment),
    code: {
      code_sha256_base64: codeSha,
      location_present: typeof responseBoundary.code_location === "string" && responseBoundary.code_location.length > 0,
      url_stripped: true,
    },
    direct_invoke: directInvoke,
    tags,
    logs,
    metrics,
    rollback_code: rollbackCode,
    configuration_fingerprint_sha256: configProjection.fingerprint_sha256,
    non_code_configuration_fingerprint_sha256: configProjection.nonCodeFingerprintSha256,
    config_stable_projection: configProjection.stable,
  };
  if (environment.schema_status !== "PASS") {
    record.status = "ERROR";
    record.error_code = environment.error_code ?? "AWS_ENVIRONMENT_KEY_DRIFT";
  }
  if (responseBoundary.error_code) {
    record.status = "ERROR";
    record.error_code = responseBoundary.error_code;
  }
  const urlPolicy = expectedFunctionUrlPolicy(name);
  if (!responseBoundary.error_code && urlPolicy?.mode === "NONE" && directInvoke?.status === "PASS") {
    record.status = "ERROR";
    record.error_code = "AWS_FUNCTION_URL_UNEXPECTED";
  }
  if (!responseBoundary.error_code && urlPolicy?.mode === "CONFIGURED" && directInvoke?.status === "NOT_CONFIGURED") {
    record.status = "ERROR";
    record.error_code = "AWS_FUNCTION_URL_REQUIRED";
  }
  if (!responseBoundary.error_code && unhandledConfiguration.length) {
    record.status = "ERROR";
    record.error_code = "AWS_CONFIGURATION_SURFACE_UNHANDLED";
  }
  if (!responseBoundary.error_code && !codeShaValid) {
    record.status = "ERROR";
    record.error_code = "AWS_CODE_SHA256_INVALID";
  }
  if ((!responseBoundary.error_code || responseBoundary.error_code === "AWS_CODE_SHA256_INVALID")
    && !identityValid && !identityFieldsValid && (record.status === "PASS" || rawCodeSha === null || rawCodeSha === "")) {
    record.status = "ERROR";
    record.error_code = "AWS_FUNCTION_IDENTITY_INVALID";
  }
  if (name === "lawos-production-projection-auditor") {
    const expectedKeys = [...PROJECTION_AUDITOR_REQUIRED_ENV_KEYS].sort();
    const observedKeys = [...environment.expected_keys].sort();
    const forbidden = observedKeys.some((key) => PROJECTION_AUDITOR_FORBIDDEN_ENV_KEYS.includes(key));
    const rawRole = effectiveConfiguration.Role ?? null;
    if (record.role_sha256 !== optionalHashableIdentifier(PROJECTION_AUDITOR_EXECUTION_ROLE_ARN)
      || rawRole !== PROJECTION_AUDITOR_EXECUTION_ROLE_ARN
      || (responseBoundary.error_code && responseBoundary.error_code !== "AWS_CONFIGURATION_SHAPE_INVALID")
      || observedKeys.join("\n") !== expectedKeys.join("\n")
      || forbidden
      || directInvoke?.status !== "NOT_CONFIGURED"
      || directInvoke?.function_url_present !== false) {
      record.status = "ERROR";
      record.error_code = "AWS_PROJECTION_AUDITOR_AUTHORITY_DRIFT";
    }
  }
  return record;
}

export function emptyFunctionRecord(name) {
  return projectFunction({
    name,
    getFunctionResponse: {},
    configurationResponse: { Environment: { Variables: {} } },
    expectedKeys: [],
    expectedKeyInfo: { expected_keys: [], logical_id: null, complete: false },
    directInvoke: { status: "NOT_READ", error_code: null, function_url_present: false, auth_type: null, url_stripped: true },
    tags: { status: "NOT_READ", error_code: null, key_count: 0, presence: {} },
    logs: { status: "NOT_READ", error_code: null, complete: false, event_count: 0, first_event_at: null, last_event_at: null, first_failure_at: null, classes: [], request_ids: [] },
    metrics: FUNCTION_METRICS.map((metricName) => projectMetric(metricName, null, "AWS_NOT_READ")),
    rollbackCode: { status: "NOT_REQUESTED", error_code: null, path: null, manifest_path: null, bytes: null, zip_sha256: null, code_sha256_base64: null, matches_code_sha256: null },
  });
}

export { FUNCTION_METRICS };
export { emptyEnvironment, projectEnvironment, projectSourceVariables } from "./outlook-production-aws-inventory-projection-environment.mjs";
export { projectAlarms, projectDirectInvoke, projectLogs, projectMetric, projectRds, projectTags } from "./outlook-production-aws-inventory-projection-surfaces.mjs";
