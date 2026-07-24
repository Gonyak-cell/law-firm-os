const STORE_PATH_ENV = /^LAWOS_[A-Z0-9_]*(?:STORE|OBJECT_STORE)_PATH$/u;

function nonNegativeInteger(value, name) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 0) {
    throw new TypeError(`${name} must be a non-negative integer`);
  }
  return number;
}

export function validatePostgresOnlyRuntimeConfiguration({
  env = {},
  artifactRuntimeStoreEntryCount = 0,
  artifactRealJsonStoreCount = 0,
  fileCurrentInitializedCount = 0,
  coldStartObserved = false,
} = {}) {
  if (env.LAWOS_RUNTIME_PROFILE !== "operational") {
    throw new Error("operational PostgreSQL runtime profile is required");
  }
  if (env.LAWOS_PERSISTENCE_AUTHORITY !== "postgres-v2") {
    throw new Error("postgres-v2 authority is required");
  }
  if (env.LAWOS_STAFF_AUTHORITY !== "internal-password") {
    throw new Error("internal-password staff authority is required");
  }
  const populatedStorePathKeys = Object.entries(env)
    .filter(([key, value]) => STORE_PATH_ENV.test(key) && String(value ?? "").trim())
    .map(([key]) => key)
    .sort();
  if (populatedStorePathKeys.length) {
    throw new Error("JSON/file store-path environment variables are forbidden");
  }
  const runtimeStoreEntries = nonNegativeInteger(
    artifactRuntimeStoreEntryCount,
    "artifactRuntimeStoreEntryCount",
  );
  const realJsonStores = nonNegativeInteger(
    artifactRealJsonStoreCount,
    "artifactRealJsonStoreCount",
  );
  const fileCurrentInitialized = nonNegativeInteger(
    fileCurrentInitializedCount,
    "fileCurrentInitializedCount",
  );
  if (runtimeStoreEntries !== 0 || realJsonStores !== 0 || fileCurrentInitialized !== 0) {
    throw new Error("artifact or runtime initialized a legacy file authority");
  }
  if (coldStartObserved !== true) {
    throw new Error("a deployed cold-start observation is required");
  }
  return Object.freeze({
    runtime_profile: "operational",
    persistence_authority: "postgres-v2",
    staff_authority: "internal-password",
    populated_store_path_key_count: 0,
    artifact_runtime_store_entry_count: 0,
    artifact_real_json_store_count: 0,
    file_current_initialized_count: 0,
    cold_start_observed: true,
  });
}
