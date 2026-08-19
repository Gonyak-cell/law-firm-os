import { withPostgresTransaction } from "../../persistence/src/postgres/transaction.js";
import {
  inspectOutlookDesktopReleaseArtifactSnapshot,
} from "./outlook-desktop-release-artifact-snapshot.js";

export const OUTLOOK_DESKTOP_RELEASE_IMPORT_ARTIFACT_KEYS = Object.freeze([
  "app_id", "app_version", "approval_audit_event_id", "approval_sha256",
  "arch", "channel", "embedded_build_manifest_sha256",
  "embedded_inner_artifact_bytes", "embedded_inner_artifact_sha256",
  "embedded_release_ticket_sha256",
  "embedded_release_ticket_signature_sha256", "final_artifact_bytes",
  "final_artifact_sha256", "macos_certificate_sha256",
  "macos_certificate_valid_from", "macos_certificate_valid_until",
  "macos_evidence_expires_at", "macos_evidence_observed_at",
  "macos_gatekeeper_status", "macos_notarized", "macos_signature_valid",
  "macos_stapled", "macos_team_id", "macos_technical_evidence_sha256",
  "platform", "release_artifact_id", "release_ticket_id",
  "release_ticket_key_id", "signature_algorithm", "source_sha",
  "source_tree", "ticket_expires_at", "ticket_issued_at",
  "trust_registry_serial", "trust_registry_sha256", "valid_from",
  "valid_until", "windows_authenticode_status",
]);

const RECEIPT_KEYS = Object.freeze([
  "approval_audit_event_binding_sha256", "approval_audit_event_id",
  "approval_sha256", "approved_at", "authority", "final_artifact_bytes",
  "final_artifact_sha256", "outcome", "production_ready_claim",
  "release_artifact_id", "release_authority_sha256",
  "release_ticket_sha256", "revoked", "tenant_id", "valid_until",
]);
const OPTIONS = new Set([
  "authorize_import", "control_pool", "tenant_id",
]);
const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/u;
const SHA1 = /^[a-f0-9]{40}$/u;
const SHA256 = /^[a-f0-9]{64}$/u;
const VERSION = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/u;
const DIGESTS = OUTLOOK_DESKTOP_RELEASE_IMPORT_ARTIFACT_KEYS.filter((key) =>
  key.endsWith("_sha256"));
const TIMES = OUTLOOK_DESKTOP_RELEASE_IMPORT_ARTIFACT_KEYS.filter((key) =>
  key.endsWith("_at") || key.endsWith("_from") || key.endsWith("_until"));

function fail(code, reason, status = 400) {
  throw Object.assign(new Error(reason), { safe_error_code: code, status });
}

function exactRecord(value, keys, field) {
  if (value === null || typeof value !== "object" || Array.isArray(value)
      || JSON.stringify(Object.keys(value).sort()) !== JSON.stringify(keys)) {
    fail("OUTLOOK_RELEASE_IMPORT_INVALID", `${field}_invalid`);
  }
}

function string(value, pattern, field) {
  if (typeof value !== "string" || !pattern.test(value)) {
    fail("OUTLOOK_RELEASE_IMPORT_INVALID", `${field}_invalid`);
  }
  return value;
}

function time(value, field) {
  if (typeof value !== "string") {
    fail("OUTLOOK_RELEASE_IMPORT_INVALID", `${field}_invalid`);
  }
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString() !== value) {
    fail("OUTLOOK_RELEASE_IMPORT_INVALID", `${field}_invalid`);
  }
  return value;
}

function integer(value, field, maximum) {
  if (!Number.isSafeInteger(value) || value < 1 || value > maximum) {
    fail("OUTLOOK_RELEASE_IMPORT_INVALID", `${field}_invalid`);
  }
  return value;
}

function normalizeArtifact(value) {
  exactRecord(value, OUTLOOK_DESKTOP_RELEASE_IMPORT_ARTIFACT_KEYS, "artifact");
  const artifact = Object.freeze(Object.fromEntries(
    OUTLOOK_DESKTOP_RELEASE_IMPORT_ARTIFACT_KEYS.map((key) => [key, value[key]]),
  ));
  for (const field of DIGESTS) string(artifact[field], SHA256, field);
  for (const field of TIMES) time(artifact[field], field);
  for (const field of [
    "approval_audit_event_id", "release_artifact_id", "release_ticket_id",
    "release_ticket_key_id",
  ]) string(artifact[field], IDENTIFIER, field);
  string(artifact.source_sha, SHA1, "source_sha");
  string(artifact.source_tree, SHA1, "source_tree");
  string(artifact.app_version, VERSION, "app_version");
  string(artifact.macos_team_id, /^[A-Z0-9]{10}$/u, "macos_team_id");
  integer(
    artifact.embedded_inner_artifact_bytes,
    "embedded_inner_artifact_bytes",
    536_870_912,
  );
  integer(artifact.final_artifact_bytes, "final_artifact_bytes", 8_589_934_592);
  integer(artifact.trust_registry_serial, "trust_registry_serial", Number.MAX_SAFE_INTEGER);
  if (artifact.platform === "win32") {
    fail(
      "WINDOWS_AUTHENTICODE_REQUIRED",
      "outlook_release_import_windows_authenticode_required",
      403,
    );
  }
  if (artifact.platform !== "darwin" || artifact.channel !== "formal"
      || artifact.app_id !== "com.amic.matter.desktop"
      || !new Set(["arm64", "x64"]).has(artifact.arch)
      || artifact.signature_algorithm !== "Ed25519"
      || artifact.macos_signature_valid !== true || artifact.macos_notarized !== true
      || artifact.macos_stapled !== true
      || artifact.macos_gatekeeper_status !== "accepted"
      || artifact.windows_authenticode_status !== "not_applicable") {
    fail("OUTLOOK_RELEASE_IMPORT_INVALID", "artifact_platform_trust_invalid");
  }
  return artifact;
}

function databaseTime(value) {
  const parsed = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(parsed.getTime())) {
    fail(
      "OUTLOOK_RELEASE_IMPORT_DATABASE_TIME_INVALID",
      "release_import_database_time_invalid",
      500,
    );
  }
  return parsed.toISOString();
}

function measurement(artifact, artifactSnapshot) {
  let measured;
  try {
    measured = inspectOutlookDesktopReleaseArtifactSnapshot(artifactSnapshot);
  } catch (error) {
    if (error?.code === "RELEASE_ARTIFACT_SNAPSHOT_INVALID") {
      fail(
        "OUTLOOK_RELEASE_IMPORT_FINAL_ARTIFACT_SNAPSHOT_INVALID",
        "release_import_final_artifact_snapshot_invalid",
      );
    }
    throw error;
  }
  if (measured.sha256 !== artifact.final_artifact_sha256
      || measured.size !== artifact.final_artifact_bytes) {
    fail(
      "OUTLOOK_RELEASE_IMPORT_FINAL_ARTIFACT_MISMATCH",
      "release_import_final_artifact_mismatch",
    );
  }
  return measured;
}

function responseError() {
  fail(
    "OUTLOOK_RELEASE_IMPORT_RESPONSE_INVALID",
    "release_import_response_invalid",
    500,
  );
}

function parseReceipt(responseText, tenantId, artifact) {
  let row;
  try {
    row = JSON.parse(responseText);
  } catch {
    responseError();
  }
  if (row === null || typeof row !== "object" || Array.isArray(row)
      || JSON.stringify(Object.keys(row).sort()) !== JSON.stringify(RECEIPT_KEYS)
      || row.authority !== "postgres-outlook-desktop-release-artifact-importer"
      || row.outcome !== "imported" || row.tenant_id !== tenantId
      || row.release_artifact_id !== artifact.release_artifact_id
      || row.release_ticket_sha256 !== artifact.embedded_release_ticket_sha256
      || row.final_artifact_sha256 !== artifact.final_artifact_sha256
      || row.final_artifact_bytes !== artifact.final_artifact_bytes
      || row.approval_sha256 !== artifact.approval_sha256
      || row.approval_audit_event_id !== artifact.approval_audit_event_id
      || typeof row.approval_audit_event_binding_sha256 !== "string"
      || !SHA256.test(row.approval_audit_event_binding_sha256)
      || typeof row.release_authority_sha256 !== "string"
      || !SHA256.test(row.release_authority_sha256)
      || typeof row.approved_at !== "string"
      || typeof row.valid_until !== "string"
      || row.revoked !== false || row.production_ready_claim !== false) {
    responseError();
  }
  const approvedAt = new Date(row.approved_at);
  const validUntil = new Date(row.valid_until);
  if (!Number.isFinite(approvedAt.getTime()) || !Number.isFinite(validUntil.getTime())
      || validUntil.getTime() !== Date.parse(artifact.valid_until)) {
    responseError();
  }
  return Object.freeze({
    ...row,
    approved_at: approvedAt.toISOString(),
    valid_until: validUntil.toISOString(),
  });
}

export function createPostgresOutlookDesktopReleaseArtifactImporter(options = {}) {
  if (options === null || typeof options !== "object" || Array.isArray(options)) {
    throw new TypeError("options must be an object");
  }
  for (const key of Object.keys(options)) {
    if (!OPTIONS.has(key)) throw new TypeError(`unknown option: ${key}`);
  }
  const controlPool = options.control_pool;
  const authorizeImport = options.authorize_import;
  if (!controlPool?.connect) {
    throw new TypeError("PostgreSQL control pool is required");
  }
  if (typeof authorizeImport !== "function") {
    fail(
      "OUTLOOK_RELEASE_IMPORT_AUTHORITY_REQUIRED",
      "release_import_authority_required",
      500,
    );
  }
  const tenantId = string(options.tenant_id, IDENTIFIER, "tenant_id");
  const tx = (readOnly, callback) => withPostgresTransaction(
    controlPool,
    {
      tenant_id: tenantId,
      isolationLevel: "serializable",
      readOnly,
    },
    callback,
  );

  function normalizeCommand(command) {
    exactRecord(
      command,
      ["artifact", "artifact_snapshot", "request_id"],
      "command",
    );
    const requestId = string(command.request_id, IDENTIFIER, "request_id");
    const artifact = normalizeArtifact(command.artifact);
    return Object.freeze({ artifact, requestId });
  }

  async function prepare(command) {
    const { artifact, requestId } = normalizeCommand(command);
    const measured = measurement(artifact, command.artifact_snapshot);
    const now = await tx(true, async (client) => databaseTime((await client.query(
      "SELECT date_trunc('milliseconds', clock_timestamp()) AS now",
    )).rows[0]?.now));
    if (Date.parse(now) > Date.parse(artifact.valid_from)
        || Date.parse(artifact.macos_evidence_observed_at) > Date.parse(now)
        || Date.parse(now) < Date.parse(artifact.macos_certificate_valid_from)
        || Date.parse(now) >= Date.parse(artifact.macos_certificate_valid_until)) {
      fail("OUTLOOK_RELEASE_IMPORT_TIME_INVALID", "release_import_time_invalid");
    }
    const allowed = await authorizeImport(Object.freeze({
      operation: "import",
      tenant_id: tenantId,
      request_id: requestId,
      artifact,
      final_artifact_measurement: measured,
      database_now: now,
    }));
    if (allowed !== true) {
      fail(
        "OUTLOOK_RELEASE_IMPORT_NOT_AUTHORIZED",
        "release_import_not_authorized",
        403,
      );
    }
    return Object.freeze({ artifact, now, requestId });
  }

  const validate = async (command = {}) => {
    const { artifact, now, requestId } = await prepare(command);
    return Object.freeze({
      authority: "postgres-outlook-desktop-release-artifact-importer",
      outcome: "validated",
      tenant_id: tenantId,
      request_id: requestId,
      release_artifact_id: artifact.release_artifact_id,
      final_artifact_sha256: artifact.final_artifact_sha256,
      validated_at: now,
      writes: 0,
      production_ready_claim: false,
    });
  };

  const invoke = async ({ artifact, requestId }, name, allowAbsent, readOnly) =>
    tx(readOnly, async (client) => {
      const responseText = (await client.query(
        `SELECT lawos_email_dms.${name}($1,$2,$3::jsonb) AS response_text`,
        [tenantId, requestId, JSON.stringify(artifact)],
      )).rows[0]?.response_text;
      if (allowAbsent && responseText === null) return null;
      if (typeof responseText !== "string") responseError();
      return parseReceipt(responseText, tenantId, artifact);
    });

  return Object.freeze({
    authority: "postgres-outlook-desktop-release-artifact-importer",
    validate,
    execute: async (command = {}) => invoke(
      await prepare(command),
      "import_outlook_desktop_release_artifact", false, false,
    ),
    replay: (command = {}) => invoke(
      normalizeCommand(command),
      "replay_outlook_desktop_release_import", true, true,
    ),
  });
}
