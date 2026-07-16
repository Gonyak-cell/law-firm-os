import { randomBytes } from "node:crypto";

export const LAWOS_RUNTIME_PROFILE_ENV = "LAWOS_RUNTIME_PROFILE";
export const LAWOS_RUNTIME_PROFILES = Object.freeze({
  operational: "operational",
  localDev: "local-dev",
});

export function resolveRuntimeProfile(env = process.env) {
  const value = String(env[LAWOS_RUNTIME_PROFILE_ENV] ?? LAWOS_RUNTIME_PROFILES.localDev).trim() || LAWOS_RUNTIME_PROFILES.localDev;
  if (value === LAWOS_RUNTIME_PROFILES.operational) return LAWOS_RUNTIME_PROFILES.operational;
  if (value === LAWOS_RUNTIME_PROFILES.localDev || value === "dev" || value === "test" || value === "desktop") {
    return LAWOS_RUNTIME_PROFILES.localDev;
  }
  throw new Error(`Unsupported ${LAWOS_RUNTIME_PROFILE_ENV}: ${value}`);
}

function runtimePreflightError(message) {
  const error = new Error(message);
  error.code = "LAWOS_RUNTIME_PREFLIGHT_FAILED";
  error.exitCode = 78;
  return error;
}

export function resolveSessionSecret({
  env = process.env,
  profile = resolveRuntimeProfile(env),
  explicitSecret,
} = {}) {
  const secret = explicitSecret ?? env.LAWOS_API_SESSION_SECRET;
  if (secret) {
    return profile === LAWOS_RUNTIME_PROFILES.operational ? assertOperationalSessionSecret(secret) : String(secret);
  }
  if (profile === LAWOS_RUNTIME_PROFILES.operational) {
    throw runtimePreflightError("LAWOS_API_SESSION_SECRET is required for operational runtime profile");
  }
  return randomBytes(32).toString("hex");
}

export function assertOperationalSessionSecret(secret) {
  const value = String(secret ?? "");
  if (value.length < 32) {
    throw runtimePreflightError("LAWOS_API_SESSION_SECRET must be at least 32 characters for operational runtime profile");
  }
  return value;
}
