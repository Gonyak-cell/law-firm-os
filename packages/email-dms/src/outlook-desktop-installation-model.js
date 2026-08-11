import { randomBytes } from "node:crypto";

export const OUTLOOK_DESKTOP_INSTALLATION_LEASE_MS =
  7 * 24 * 60 * 60 * 1000;

const IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/u;
const INSTALLATION_ID_PATTERN = /^odi_[A-Za-z0-9_-]{20,128}$/u;
const PUBLIC_KEY_PATTERN = /^[A-Za-z0-9+/_=-]{40,512}$/u;
const FINGERPRINT_PATTERN = /^[a-f0-9]{64}$/u;
const VERSION_PATTERN = /^\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?$/u;
const SOURCE_SHA_PATTERN = /^[a-f0-9]{40}$/u;
const PLATFORMS = new Set(["darwin", "win32"]);
const RETIRE_REASONS = new Set([
  "device_disconnect",
  "windows_uninstall",
  "account_removed",
  "installation_replaced",
]);

function lifecycleError(code, reason, status) {
  return Object.assign(new Error(reason), {
    safe_error_code: code,
    reason,
    status,
  });
}

function invalid(reason) {
  throw lifecycleError(
    "OUTLOOK_DESKTOP_INSTALLATION_INVALID",
    reason,
    400,
  );
}

function identifier(value, field) {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!IDENTIFIER_PATTERN.test(normalized)) invalid(`${field}_invalid`);
  return normalized;
}

function boundedString(value, pattern, field) {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!pattern.test(normalized)) invalid(`${field}_invalid`);
  return normalized;
}

function instant(value, field = "server_time") {
  const parsed = value instanceof Date ? new Date(value) : new Date(value);
  if (!Number.isFinite(parsed.getTime())) invalid(`${field}_invalid`);
  return parsed;
}

function installationId(factory) {
  const value = String(
    factory?.() ?? `odi_${randomBytes(24).toString("base64url")}`,
  ).trim();
  if (!INSTALLATION_ID_PATTERN.test(value)) invalid("installation_id_invalid");
  return value;
}

function normalizeInput(input = {}) {
  const platform = String(input.platform ?? "").trim();
  if (!PLATFORMS.has(platform)) invalid("platform_invalid");
  return Object.freeze({
    tenant_id: identifier(input.tenant_id, "tenant_id"),
    user_id: identifier(input.user_id, "user_id"),
    entra_subject_id: identifier(
      input.entra_subject_id,
      "entra_subject_id",
    ),
    device_public_key: boundedString(
      input.device_public_key,
      PUBLIC_KEY_PATTERN,
      "device_public_key",
    ),
    device_key_fingerprint: boundedString(
      input.device_key_fingerprint,
      FINGERPRINT_PATTERN,
      "device_key_fingerprint",
    ),
    platform,
    app_version: boundedString(
      input.app_version,
      VERSION_PATTERN,
      "app_version",
    ),
    source_sha: boundedString(
      input.source_sha,
      SOURCE_SHA_PATTERN,
      "source_sha",
    ),
  });
}

function assertStateVersion(installation, expectedStateVersion) {
  if (
    !Number.isSafeInteger(expectedStateVersion)
    || expectedStateVersion < 1
    || installation.state_version !== expectedStateVersion
  ) {
    throw lifecycleError(
      "OUTLOOK_DESKTOP_STATE_VERSION_CONFLICT",
      "outlook_desktop_state_version_conflict",
      409,
    );
  }
}

export function createOutlookDesktopInstallation(input, options = {}) {
  const normalized = normalizeInput(input);
  const registeredAt = instant(options.now ?? new Date());
  const registeredAtIso = registeredAt.toISOString();
  return Object.freeze({
    tenant_id: normalized.tenant_id,
    installation_id: installationId(options.installation_id_factory),
    user_id: normalized.user_id,
    entra_subject_id: normalized.entra_subject_id,
    device_public_key: normalized.device_public_key,
    device_key_fingerprint: normalized.device_key_fingerprint,
    platform: normalized.platform,
    app_version: normalized.app_version,
    source_sha: normalized.source_sha,
    registered_at: registeredAtIso,
    last_seen_at: registeredAtIso,
    lease_expires_at: new Date(
      registeredAt.getTime() + OUTLOOK_DESKTOP_INSTALLATION_LEASE_MS,
    ).toISOString(),
    retired_at: null,
    retire_reason: null,
    state_version: 1,
  });
}

export function assertOutlookDesktopInstallationBinding(
  installation,
  input = {},
) {
  const matches = Boolean(
    installation
      && installation.tenant_id === String(input.tenant_id ?? "").trim()
      && installation.user_id === String(input.user_id ?? "").trim()
      && installation.entra_subject_id
        === String(input.entra_subject_id ?? "").trim()
      && installation.device_key_fingerprint
        === String(input.device_key_fingerprint ?? "").trim(),
  );
  if (!matches) {
    throw lifecycleError(
      "OUTLOOK_DESKTOP_INSTALLATION_BINDING_MISMATCH",
      "outlook_desktop_installation_binding_mismatch",
      403,
    );
  }
  return true;
}

export function projectOutlookDesktopInstallation(
  installation,
  { now = new Date() } = {},
) {
  const at = instant(now);
  const status = installation.retired_at
    ? "retired"
    : at.getTime() >= instant(installation.lease_expires_at).getTime()
      ? "expired"
      : "active";
  return Object.freeze({
    installation_id: installation.installation_id,
    status,
    state_version: installation.state_version,
    lease_expires_at: installation.lease_expires_at,
    retired_at: installation.retired_at,
  });
}

export function heartbeatOutlookDesktopInstallation(
  installation,
  input,
  { now = new Date() } = {},
) {
  assertOutlookDesktopInstallationBinding(installation, input);
  assertStateVersion(installation, input.expected_state_version);
  if (installation.retired_at) {
    throw lifecycleError(
      "OUTLOOK_DESKTOP_INSTALLATION_RETIRED",
      "outlook_desktop_installation_retired",
      409,
    );
  }
  const at = instant(now);
  if (at.getTime() < instant(installation.registered_at).getTime()) {
    invalid("server_time_before_registration");
  }
  const transition = projectOutlookDesktopInstallation(installation, {
    now: at,
  }).status === "expired" ? "resumed" : "heartbeat";
  return Object.freeze({
    transition,
    installation: Object.freeze({
      ...installation,
      last_seen_at: at.toISOString(),
      lease_expires_at: new Date(
        at.getTime() + OUTLOOK_DESKTOP_INSTALLATION_LEASE_MS,
      ).toISOString(),
      state_version: installation.state_version + 1,
    }),
  });
}

export function retireOutlookDesktopInstallation(
  installation,
  input,
  { now = new Date() } = {},
) {
  assertOutlookDesktopInstallationBinding(installation, input);
  assertStateVersion(installation, input.expected_state_version);
  const retireReason = String(input.retire_reason ?? "").trim();
  if (!RETIRE_REASONS.has(retireReason)) {
    throw lifecycleError(
      "OUTLOOK_DESKTOP_RETIRE_REASON_INVALID",
      "outlook_desktop_retire_reason_invalid",
      400,
    );
  }
  if (installation.retired_at) {
    return Object.freeze({
      transition: "already_retired",
      installation,
    });
  }
  const at = instant(now);
  if (at.getTime() < instant(installation.registered_at).getTime()) {
    invalid("server_time_before_registration");
  }
  return Object.freeze({
    transition: "retired",
    installation: Object.freeze({
      ...installation,
      retired_at: at.toISOString(),
      retire_reason: retireReason,
      state_version: installation.state_version + 1,
    }),
  });
}
