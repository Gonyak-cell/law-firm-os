import {
  ENVIRONMENT_VALUES_UNAVAILABLE,
  SOURCE_VARIABLE_NAMES,
  canonicalJson,
  environmentKeyInventoryDigest,
  sha256,
  sortedUnique,
} from "./outlook-production-aws-inventory-contract.mjs";

function expectedInfo(value) {
  if (Array.isArray(value)) return { expectedKeys: sortedUnique(value), logicalId: null, complete: false, digest: null };
  const expectedKeys = sortedUnique(value?.expected_keys ?? []);
  return {
    expectedKeys,
    logicalId: typeof value?.logical_id === "string" ? value.logical_id : null,
    complete: value?.complete === true,
    digest: typeof value?.expected_key_inventory_sha256 === "string" ? value.expected_key_inventory_sha256 : null,
  };
}

function keyInventory({ functionName, logicalId, observedKeys }) {
  return sha256(canonicalJson({ function_name: functionName, logical_id: logicalId ?? null, observed_keys: [...observedKeys].sort() }));
}

function environmentBase({ functionName, logicalId, expectedKeys, expectedComplete }) {
  const expectedKeyInventorySha256 = environmentKeyInventoryDigest(functionName, logicalId, expectedKeys);
  return {
    read_status: "NOT_READ",
    values_read: false,
    schema_status: expectedComplete ? "PASS" : "UNAVAILABLE",
    error_code: null,
    expected_keys: expectedKeys,
    observed_keys: null,
    present: null,
    missing: [],
    unexpected: [],
    expected_key_inventory_sha256: expectedKeyInventorySha256,
    observed_key_inventory_sha256: null,
    key_inventory_sha256: sha256(canonicalJson({ authority: "PROCESSED_CLOUDFORMATION", expected_keys: expectedKeys })),
  };
}

export function emptyEnvironment(expectedKeys = [], expectedKeyInfo = {}) {
  const info = expectedInfo(expectedKeyInfo);
  return environmentBase({ functionName: "", logicalId: info.logicalId, expectedKeys: sortedUnique(expectedKeys.length ? expectedKeys : info.expectedKeys), expectedComplete: false });
}

export function projectEnvironment(configuration, expectedKeyInfo, { functionName = "", configurationError = null } = {}) {
  const info = expectedInfo(expectedKeyInfo);
  const expectedKeys = info.expectedKeys;
  const expectedComplete = info.complete && Boolean(info.logicalId);
  const base = environmentBase({ functionName, logicalId: info.logicalId, expectedKeys, expectedComplete });
  const environment = configuration?.Environment;
  const hasError = environment && Object.prototype.hasOwnProperty.call(environment, "Error");
  const errorCode = typeof environment?.Error === "string"
    ? environment.Error
    : environment?.Error && typeof environment.Error === "object"
      ? environment.Error.ErrorCode ?? environment.Error.Code ?? environment.Error.code
      : null;
  const accessDeniedExpected = ["AccessDeniedException", "KMSAccessDeniedException", "AWS_ACCESS_DENIED"].includes(errorCode) || configurationError === "AWS_ACCESS_DENIED";
  if (accessDeniedExpected) {
    return {
      ...base,
      read_status: "VALUES_UNAVAILABLE",
      values_read: false,
      schema_status: expectedComplete ? "PASS" : "UNAVAILABLE",
      error_code: ENVIRONMENT_VALUES_UNAVAILABLE,
    };
  }
  if (hasError || configurationError) return { ...base, read_status: "ERROR", values_read: false, schema_status: "ERROR", error_code: "AWS_ENVIRONMENT_READ_FAILED" };
  if (!environment || !Object.prototype.hasOwnProperty.call(environment, "Variables") || !environment.Variables || typeof environment.Variables !== "object" || Array.isArray(environment.Variables)) {
    return { ...base, read_status: "ERROR", values_read: false, schema_status: "ERROR", error_code: "AWS_ENVIRONMENT_READ_FAILED" };
  }
  const observedKeys = Object.keys(environment.Variables).sort();
  const present = Object.fromEntries(expectedKeys.map((key) => [key, Object.prototype.hasOwnProperty.call(environment.Variables, key)]));
  const missing = expectedKeys.filter((key) => !present[key]);
  const unexpected = observedKeys.filter((key) => !expectedKeys.includes(key));
  const drift = missing.length > 0 || unexpected.length > 0;
  return {
    ...base,
    read_status: "VALUES_AVAILABLE",
    values_read: true,
    schema_status: drift ? "DRIFT" : expectedComplete ? "PASS" : "UNAVAILABLE",
    error_code: null,
    observed_keys: observedKeys,
    present,
    missing,
    unexpected,
    observed_key_inventory_sha256: keyInventory({ functionName, logicalId: info.logicalId, observedKeys }),
  };
}

export function projectSourceVariables(environmentProjection) {
  const unavailable = environmentProjection.read_status !== "VALUES_AVAILABLE";
  return SOURCE_VARIABLE_NAMES.map((name) => ({ name, present: unavailable ? null : Boolean(environmentProjection.present?.[name]), status: unavailable ? "UNAVAILABLE" : "OBSERVED" }));
}
