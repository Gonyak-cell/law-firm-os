import {
  canonicalJson,
  expectedFunctionIdentity,
  isCanonicalCodeSha256Base64,
  safeDate,
} from "./outlook-production-aws-inventory-contract.mjs";
import {
  CONFIGURATION_FIELDS,
  validateLambdaConfigurationShape,
} from "./outlook-production-aws-inventory-projection-configuration.mjs";

const REQUIRED_IDENTITY_FIELDS = [
  "FunctionName",
  "FunctionArn",
  "Role",
  "Runtime",
  "Handler",
  "PackageType",
  "Architectures",
  "CodeSha256",
  "RevisionId",
  "LastModified",
  "State",
  "LastUpdateStatus",
];

export const FUNCTION_RESPONSE_OVERLAP_FIELDS = Object.freeze([
  ...new Set([
    ...REQUIRED_IDENTITY_FIELDS,
    ...CONFIGURATION_FIELDS,
  ]),
]);

function plainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function safeConfigurationProjection(configuration) {
  if (!plainObject(configuration)) return {};
  const identityFields = new Set(REQUIRED_IDENTITY_FIELDS);
  return Object.fromEntries(Object.entries(configuration).filter(([key]) => !identityFields.has(key)));
}

function extractConfiguration(response, kind) {
  if (!plainObject(response)) return null;
  if (kind === "get-function") {
    // Configuration is the independently validated identity/configuration surface.
    // The optional Code envelope only carries a presigned location, which is
    // deliberately stripped and is not required for the projection boundary.
    if (!plainObject(response.Configuration)) return null;
    return response.Configuration;
  }
  return plainObject(response.Configuration) ? response.Configuration : response;
}

function identityValid(name, configuration) {
  const expected = expectedFunctionIdentity(name);
  if (!expected || !plainObject(configuration)) return false;
  const architectures = configuration.Architectures;
  return configuration.FunctionName === name
    && configuration.FunctionArn === expected.function_arn
    && configuration.Role === expected.role_arn
    && configuration.Runtime === expected.runtime
    && configuration.Handler === expected.handler
    && configuration.PackageType === expected.package_type
    && Array.isArray(architectures)
    && architectures.length === 1
    && architectures[0] === expected.architecture
    && isCanonicalCodeSha256Base64(configuration.CodeSha256)
    && typeof configuration.RevisionId === "string"
    && configuration.RevisionId.trim().length > 0
    && safeDate(configuration.LastModified) !== null
    && configuration.State === "Active"
    && configuration.LastUpdateStatus === "Successful";
}

export function validateFunctionResponse({ name, response, kind }) {
  const configuration = extractConfiguration(response, kind);
  if (!configuration) return { error_code: "AWS_RESPONSE_INVALID", configuration: null, code_location: null };
  const shapeError = validateLambdaConfigurationShape(configuration);
  if (shapeError) return { error_code: shapeError, configuration: null, safe_configuration: {}, code_location: null };
  if (!isCanonicalCodeSha256Base64(configuration.CodeSha256)) return { error_code: "AWS_CODE_SHA256_INVALID", configuration: null, safe_configuration: safeConfigurationProjection(configuration), code_location: null, code_sha_invalid: true };
  if (!identityValid(name, configuration)) return { error_code: "AWS_FUNCTION_IDENTITY_INVALID", configuration: null, safe_configuration: safeConfigurationProjection(configuration), code_location: null };
  return {
    error_code: null,
    configuration,
    safe_configuration: configuration,
    code_location: kind === "get-function" && typeof response.Code?.Location === "string" && response.Code.Location.length > 0
      ? response.Code.Location
      : null,
  };
}

function exactValue(value) {
  try {
    return canonicalJson(value);
  } catch {
    return null;
  }
}

export function findFunctionResponseConflict(left, right) {
  if (!plainObject(left) || !plainObject(right)) return "AWS_RESPONSE_INVALID";
  for (const field of FUNCTION_RESPONSE_OVERLAP_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(left, field) || !Object.prototype.hasOwnProperty.call(right, field)) continue;
    if (exactValue(left[field]) !== exactValue(right[field])) return field;
  }
  return null;
}

export function validateFunctionResponsePair({ name, getFunctionResponse, configurationResponse, configurationError = null }) {
  const getFunction = validateFunctionResponse({ name, response: getFunctionResponse, kind: "get-function" });
  if (getFunction.error_code) {
    // A failed first boundary is terminal for this row. Never pass a raw or
    // independently fetched raw fallback into projection after a parse
    // failure. A separately validated second response is a safe, sanitized
    // projection only; it cannot clear the first boundary error.
    const fallback = configurationError === "AWS_ACCESS_DENIED"
      ? null
      : validateFunctionResponse({ name, response: configurationResponse, kind: "get-function-configuration" });
    const safe = fallback && !fallback.error_code ? fallback.configuration : {};
    return {
      error_code: getFunction.error_code,
      configuration: safe,
      getFunction: safe,
      configurationResponse: safe,
      code_location: null,
      code_sha_invalid: getFunction.code_sha_invalid === true,
    };
  }
  if (configurationError === "AWS_ACCESS_DENIED") {
    return {
      error_code: null,
      configuration: getFunction.configuration,
      getFunction: getFunction.configuration,
      configurationResponse: null,
      code_location: getFunction.code_location,
      code_sha_invalid: false,
    };
  }
  const configuration = validateFunctionResponse({ name, response: configurationResponse, kind: "get-function-configuration" });
  if (configuration.error_code) {
    // The second boundary is independently required. Even though the first
    // projection was valid, a second boundary error must not be merged with
    // an untrusted partial response. Reusing only the first validated
    // projection preserves stable readback fields while the row remains
    // ERROR/BLOCKED with the second boundary error.
    const safeConfiguration = configuration.safe_configuration ?? {};
    const mergedSafe = { ...getFunction.configuration, ...safeConfiguration };
    return {
      error_code: configuration.error_code,
      configuration: mergedSafe,
      getFunction: getFunction.configuration,
      configurationResponse: mergedSafe,
      code_location: getFunction.code_location,
      code_sha_invalid: getFunction.code_sha_invalid === true || configuration.code_sha_invalid === true,
    };
  }
  const conflict = findFunctionResponseConflict(getFunction.configuration, configuration.configuration);
  if (conflict) return {
    error_code: "AWS_FUNCTION_RESPONSE_CONFLICT",
    conflict_field: conflict,
    configuration: getFunction.configuration,
    getFunction: getFunction.configuration,
    configurationResponse: getFunction.configuration,
    code_location: getFunction.code_location,
    code_sha_invalid: false,
  };
  return {
    error_code: null,
    configuration: { ...getFunction.configuration, ...configuration.configuration },
    getFunction: getFunction.configuration,
    configurationResponse: configuration.configuration,
    code_location: getFunction.code_location,
  };
}

export { identityValid };
