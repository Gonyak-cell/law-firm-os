import { createHash } from "node:crypto";

export const OUTLOOK_DESKTOP_REGISTRATION_RELEASE_SCHEMA =
  "lawos.outlook-desktop-registration-release.v1";
export const OUTLOOK_DESKTOP_INSTALLATION_RELEASE_AUTHORITY_SCHEMA =
  "lawos.outlook-desktop-installation-release-authority.v1";
export const OUTLOOK_DESKTOP_INSTALLATION_REGISTRATION_BODY_KEYS =
  Object.freeze([
    "app_version", "device_public_key", "platform", "release_provenance",
    "source_sha",
  ]);
export const OUTLOOK_DESKTOP_REGISTRATION_RELEASE_PROVENANCE_KEYS =
  Object.freeze([
    "app_id", "arch", "build_manifest_sha256", "channel",
    "inner_artifact_bytes", "inner_artifact_sha256", "release_ticket_id",
    "release_ticket_sha256", "release_ticket_signature_sha256",
    "schema_version", "source_tree",
  ]);
export const OUTLOOK_DESKTOP_INSTALLATION_RELEASE_AUTHORITY_KEYS =
  Object.freeze([
    "app_id", "app_version", "approval_audit_event_binding_sha256",
    "approval_audit_event_id", "approval_sha256", "arch", "channel",
    "embedded_build_manifest_sha256", "macos_technical_evidence_sha256",
    "measured_inner_artifact_bytes", "measured_inner_artifact_sha256",
    "platform", "registered_final_artifact_bytes",
    "registered_final_artifact_sha256", "release_artifact_id",
    "release_ticket_id", "release_ticket_sha256",
    "release_ticket_signature_sha256", "schema_version", "source_sha",
    "source_tree", "tenant_id", "trust_registry_serial",
    "trust_registry_sha256", "valid", "valid_until",
  ]);

const IDENTITY_KEYS = Object.freeze(["app_version", "platform", "source_sha"]);
const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/u;
const SHA1 = /^[a-f0-9]{40}$/u;
const SHA256 = /^[a-f0-9]{64}$/u;
const VERSION = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/u;

function invalid(code, reason, status = 400) {
  throw Object.assign(new Error(reason), { safe_error_code: code, status });
}

function record(value, field) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    invalid("OUTLOOK_DESKTOP_RELEASE_PROVENANCE_INVALID", `${field}_invalid`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    invalid("OUTLOOK_DESKTOP_RELEASE_PROVENANCE_INVALID", `${field}_invalid`);
  }
  return value;
}

function exact(value, keys, field) {
  record(value, field);
  if (JSON.stringify(Object.keys(value).sort()) !== JSON.stringify(keys)) {
    invalid("OUTLOOK_DESKTOP_RELEASE_PROVENANCE_INVALID", `${field}_fields_invalid`);
  }
}

function string(value, pattern, field) {
  if (typeof value !== "string" || !pattern.test(value)) {
    invalid("OUTLOOK_DESKTOP_RELEASE_PROVENANCE_INVALID", `${field}_invalid`);
  }
  return value;
}

function bytes(value, field, maximum) {
  if (!Number.isSafeInteger(value) || value < 1 || value > maximum) {
    invalid("OUTLOOK_DESKTOP_RELEASE_PROVENANCE_INVALID", `${field}_invalid`);
  }
  return value;
}

function timestamp(value, field) {
  if (typeof value !== "string") {
    invalid("OUTLOOK_DESKTOP_RELEASE_PROVENANCE_INVALID", `${field}_invalid`);
  }
  const date = new Date(value);
  if (!Number.isFinite(date.getTime()) || date.toISOString() !== value) {
    invalid("OUTLOOK_DESKTOP_RELEASE_PROVENANCE_INVALID", `${field}_invalid`);
  }
  return value;
}

export function normalizeOutlookDesktopRegistrationReleaseProvenance(
  value,
  identity,
) {
  exact(identity, IDENTITY_KEYS, "package_identity");
  const platform = string(identity.platform, IDENTIFIER, "platform");
  if (platform === "win32") {
    invalid(
      "WINDOWS_AUTHENTICODE_REQUIRED",
      "outlook_desktop_windows_authenticode_required",
      403,
    );
  }
  if (platform !== "darwin") {
    invalid("OUTLOOK_DESKTOP_RELEASE_PROVENANCE_INVALID", "platform_invalid");
  }
  string(identity.app_version, VERSION, "app_version");
  string(identity.source_sha, SHA1, "source_sha");
  exact(
    value,
    OUTLOOK_DESKTOP_REGISTRATION_RELEASE_PROVENANCE_KEYS,
    "release_provenance",
  );
  if (value.schema_version !== OUTLOOK_DESKTOP_REGISTRATION_RELEASE_SCHEMA
      || value.channel !== "formal"
      || value.app_id !== "com.amic.matter.desktop"
      || !new Set(["arm64", "x64"]).has(value.arch)) {
    invalid(
      "OUTLOOK_DESKTOP_RELEASE_PROVENANCE_INVALID",
      "release_provenance_identity_invalid",
    );
  }
  return Object.freeze({
    schema_version: value.schema_version,
    release_ticket_id: string(value.release_ticket_id, IDENTIFIER, "release_ticket_id"),
    release_ticket_sha256: string(value.release_ticket_sha256, SHA256, "release_ticket_sha256"),
    release_ticket_signature_sha256: string(
      value.release_ticket_signature_sha256,
      SHA256,
      "release_ticket_signature_sha256",
    ),
    channel: value.channel,
    app_id: value.app_id,
    arch: value.arch,
    source_tree: string(value.source_tree, SHA1, "source_tree"),
    build_manifest_sha256: string(value.build_manifest_sha256, SHA256, "build_manifest_sha256"),
    inner_artifact_sha256: string(value.inner_artifact_sha256, SHA256, "inner_artifact_sha256"),
    inner_artifact_bytes: bytes(value.inner_artifact_bytes, "inner_artifact_bytes", 536_870_912),
  });
}

export function normalizeOutlookDesktopInstallationReleaseAuthority(value) {
  exact(
    value,
    OUTLOOK_DESKTOP_INSTALLATION_RELEASE_AUTHORITY_KEYS,
    "release_authority",
  );
  if (value.schema_version !== OUTLOOK_DESKTOP_INSTALLATION_RELEASE_AUTHORITY_SCHEMA
      || value.valid !== true || value.platform !== "darwin"
      || value.channel !== "formal" || value.app_id !== "com.amic.matter.desktop") {
    invalid("OUTLOOK_DESKTOP_RELEASE_AUTHORITY_INVALID", "release_authority_invalid", 500);
  }
  const normalized = {
    ...value,
    tenant_id: string(value.tenant_id, IDENTIFIER, "tenant_id"),
    release_artifact_id: string(value.release_artifact_id, IDENTIFIER, "release_artifact_id"),
    release_ticket_id: string(value.release_ticket_id, IDENTIFIER, "release_ticket_id"),
    release_ticket_sha256: string(value.release_ticket_sha256, SHA256, "release_ticket_sha256"),
    release_ticket_signature_sha256: string(value.release_ticket_signature_sha256, SHA256, "release_ticket_signature_sha256"),
    app_version: string(value.app_version, VERSION, "app_version"),
    arch: string(value.arch, IDENTIFIER, "arch"),
    source_sha: string(value.source_sha, SHA1, "source_sha"),
    source_tree: string(value.source_tree, SHA1, "source_tree"),
    embedded_build_manifest_sha256: string(value.embedded_build_manifest_sha256, SHA256, "embedded_build_manifest_sha256"),
    measured_inner_artifact_sha256: string(value.measured_inner_artifact_sha256, SHA256, "measured_inner_artifact_sha256"),
    measured_inner_artifact_bytes: bytes(value.measured_inner_artifact_bytes, "measured_inner_artifact_bytes", 536_870_912),
    registered_final_artifact_sha256: string(value.registered_final_artifact_sha256, SHA256, "registered_final_artifact_sha256"),
    registered_final_artifact_bytes: bytes(value.registered_final_artifact_bytes, "registered_final_artifact_bytes", 8_589_934_592),
    approval_sha256: string(value.approval_sha256, SHA256, "approval_sha256"),
    approval_audit_event_id: string(value.approval_audit_event_id, IDENTIFIER, "approval_audit_event_id"),
    approval_audit_event_binding_sha256: string(value.approval_audit_event_binding_sha256, SHA256, "approval_audit_event_binding_sha256"),
    macos_technical_evidence_sha256: string(value.macos_technical_evidence_sha256, SHA256, "macos_technical_evidence_sha256"),
    trust_registry_sha256: string(value.trust_registry_sha256, SHA256, "trust_registry_sha256"),
    trust_registry_serial: bytes(value.trust_registry_serial, "trust_registry_serial", Number.MAX_SAFE_INTEGER),
    valid_until: timestamp(value.valid_until, "valid_until"),
  };
  return Object.freeze(normalized);
}

export function outlookDesktopInstallationReleaseBindingSha256(material) {
  return createHash("sha256")
    .update(`lawos.outlook-desktop-installation-release-binding.v1\u001f${JSON.stringify(material)}`)
    .digest("hex");
}
