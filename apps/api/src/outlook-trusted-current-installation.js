import { types } from "node:util";

const TRUSTED_CURRENT_INSTALLATION_KEYS = Object.freeze([
  "installation_id",
  "status",
  "state_version",
  "lease_expires_at",
  "retired_at",
  "release_trusted",
  "authority_snapshot_at",
]);
const INSTALLATION_ID = /^odi_[A-Za-z0-9_-]{20,128}$/u;

function unavailable() {
  throw Object.assign(
    new Error("Outlook desktop trusted installation projection unavailable"),
    {
      safe_error_code: "OUTLOOK_DESKTOP_INSTALLATION_RUNTIME_UNAVAILABLE",
      status: 503,
    },
  );
}

function safeErrorCode(error) {
  try {
    const descriptor = error && typeof error === "object"
      ? Object.getOwnPropertyDescriptor(error, "safe_error_code")
      : null;
    return descriptor && Object.hasOwn(descriptor, "value")
      ? descriptor.value
      : null;
  } catch {
    return null;
  }
}

function canonicalTimestamp(candidate) {
  const milliseconds = typeof candidate === "string"
    ? Date.parse(candidate)
    : Number.NaN;
  return Number.isFinite(milliseconds)
    && new Date(milliseconds).toISOString() === candidate;
}

export function parseOutlookTrustedCurrentInstallation(value) {
  if (value === null) return null;
  let prototype;
  let descriptors;
  try {
    if (!value || typeof value !== "object" || Array.isArray(value)
        || types.isProxy(value)) unavailable();
    prototype = Object.getPrototypeOf(value);
    descriptors = Object.getOwnPropertyDescriptors(value);
  } catch (error) {
    if (safeErrorCode(error)) throw error;
    unavailable();
  }
  const keys = Reflect.ownKeys(descriptors);
  if ((prototype !== Object.prototype && prototype !== null)
      || keys.length !== TRUSTED_CURRENT_INSTALLATION_KEYS.length
      || keys.some((key) => typeof key !== "string"
        || !TRUSTED_CURRENT_INSTALLATION_KEYS.includes(key)
        || !Object.hasOwn(descriptors[key], "value")
        || descriptors[key].enumerable !== true)) {
    unavailable();
  }
  const snapshot = Object.fromEntries(
    TRUSTED_CURRENT_INSTALLATION_KEYS.map((key) => (
      [key, descriptors[key].value]
    )),
  );
  if (!INSTALLATION_ID.test(snapshot.installation_id)
      || snapshot.status !== "active"
      || !Number.isSafeInteger(snapshot.state_version)
      || snapshot.state_version < 1
      || !canonicalTimestamp(snapshot.lease_expires_at)
      || snapshot.retired_at !== null
      || snapshot.release_trusted !== true
      || !canonicalTimestamp(snapshot.authority_snapshot_at)
      || Date.parse(snapshot.lease_expires_at)
        <= Date.parse(snapshot.authority_snapshot_at)) {
    unavailable();
  }
  return Object.freeze({
    installation: Object.freeze({
      installation_id: snapshot.installation_id,
      status: snapshot.status,
      state_version: snapshot.state_version,
      lease_expires_at: snapshot.lease_expires_at,
      retired_at: snapshot.retired_at,
    }),
    authority_snapshot_at: snapshot.authority_snapshot_at,
  });
}
