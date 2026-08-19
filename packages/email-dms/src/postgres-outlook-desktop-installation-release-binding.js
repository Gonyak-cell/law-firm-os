import {
  normalizeOutlookDesktopInstallationReleaseAuthority,
  normalizeOutlookDesktopRegistrationReleaseProvenance,
  OUTLOOK_DESKTOP_INSTALLATION_RELEASE_AUTHORITY_SCHEMA,
  outlookDesktopInstallationReleaseBindingSha256,
} from "./outlook-desktop-installation-release-binding.js";

const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/u;
const SHA256 = /^[a-f0-9]{64}$/u;

function fail(code, reason, status = 403) {
  throw Object.assign(new Error(reason), { safe_error_code: code, status });
}

function identifier(value, field) {
  if (typeof value !== "string" || !IDENTIFIER.test(value)) {
    fail("OUTLOOK_DESKTOP_RELEASE_BINDING_INVALID", `${field}_invalid`, 500);
  }
  return value;
}

function digest(value, field) {
  if (typeof value !== "string" || !SHA256.test(value)) {
    fail("OUTLOOK_DESKTOP_RELEASE_BINDING_INVALID", `${field}_invalid`, 500);
  }
  return value;
}

function iso(value, field) {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) {
    fail("OUTLOOK_DESKTOP_RELEASE_BINDING_INVALID", `${field}_invalid`, 500);
  }
  return date.toISOString();
}

function authorityFromRow(row) {
  return normalizeOutlookDesktopInstallationReleaseAuthority({
    schema_version: OUTLOOK_DESKTOP_INSTALLATION_RELEASE_AUTHORITY_SCHEMA,
    valid: true,
    tenant_id: row.tenant_id,
    release_artifact_id: row.release_artifact_id,
    release_ticket_id: row.release_ticket_id,
    release_ticket_sha256: row.embedded_release_ticket_sha256,
    release_ticket_signature_sha256:
      row.embedded_release_ticket_signature_sha256,
    platform: row.platform,
    channel: row.channel,
    app_version: row.app_version,
    app_id: row.app_id,
    arch: row.arch,
    source_sha: row.source_sha,
    source_tree: row.source_tree,
    embedded_build_manifest_sha256: row.embedded_build_manifest_sha256,
    measured_inner_artifact_sha256: row.embedded_inner_artifact_sha256,
    measured_inner_artifact_bytes: Number(row.embedded_inner_artifact_bytes),
    registered_final_artifact_sha256: row.final_artifact_sha256,
    registered_final_artifact_bytes: Number(row.final_artifact_bytes),
    approval_sha256: row.approval_sha256,
    approval_audit_event_id: row.approval_audit_event_id,
    approval_audit_event_binding_sha256:
      row.approval_audit_event_binding_sha256,
    macos_technical_evidence_sha256: row.macos_technical_evidence_sha256,
    trust_registry_sha256: row.trust_registry_sha256,
    trust_registry_serial: Number(row.trust_registry_serial),
    valid_until: iso(row.valid_until, "valid_until"),
  });
}

const ACTIVE_RELEASE_SELECT = `
  SELECT artifact.*,
         approval.event_id AS approval_audit_event_id,
         approval.event_binding_sha256 AS approval_audit_event_binding_sha256
    FROM lawos_email_dms.outlook_desktop_release_artifacts AS artifact
    JOIN lawos_email_dms.outlook_desktop_release_trust_audit_events AS approval
      ON approval.tenant_id=artifact.tenant_id
     AND approval.release_artifact_id=artifact.release_artifact_id
     AND approval.event_type='approved'
   WHERE artifact.tenant_id=$1
     AND artifact.release_ticket_id=$2
     AND artifact.embedded_release_ticket_sha256=$3
     AND artifact.embedded_release_ticket_signature_sha256=$4
     AND artifact.platform=$5 AND artifact.channel=$6
     AND artifact.app_version=$7 AND artifact.app_id=$8
     AND artifact.arch=$9 AND artifact.source_sha=$10
     AND artifact.source_tree=$11
     AND artifact.embedded_build_manifest_sha256=$12
     AND artifact.embedded_inner_artifact_sha256=$13
     AND artifact.embedded_inner_artifact_bytes=$14
     AND artifact.revoked_at IS NULL
     AND artifact.valid_from<=$15 AND artifact.valid_until>$15
     AND approval.release_ticket_sha256=artifact.embedded_release_ticket_sha256
     AND approval.final_artifact_sha256=artifact.final_artifact_sha256
     AND approval.approval_sha256=artifact.approval_sha256
   LIMIT 2 FOR KEY SHARE OF artifact`;

export async function resolvePostgresOutlookDesktopRegistrationRelease(input) {
  const identity = Object.freeze({
    platform: input.package_identity?.platform,
    app_version: input.package_identity?.app_version,
    source_sha: input.package_identity?.source_sha,
  });
  const provenance = normalizeOutlookDesktopRegistrationReleaseProvenance(
    input.provenance,
    identity,
  );
  if (!input.client?.query) throw new TypeError("PostgreSQL client is required");
  const tenantId = identifier(input.tenant_id, "tenant_id");
  const now = iso(input.database_now, "database_now");
  const result = await input.client.query(ACTIVE_RELEASE_SELECT, [
    tenantId,
    provenance.release_ticket_id,
    provenance.release_ticket_sha256,
    provenance.release_ticket_signature_sha256,
    identity.platform,
    provenance.channel,
    identity.app_version,
    provenance.app_id,
    provenance.arch,
    identity.source_sha,
    provenance.source_tree,
    provenance.build_manifest_sha256,
    provenance.inner_artifact_sha256,
    provenance.inner_artifact_bytes,
    now,
  ]);
  if (result.rows.length !== 1) {
    fail(
      result.rows.length === 0
        ? "OUTLOOK_DESKTOP_RELEASE_NOT_APPROVED"
        : "OUTLOOK_DESKTOP_RELEASE_AMBIGUOUS",
      result.rows.length === 0
        ? "outlook_desktop_release_not_approved"
        : "outlook_desktop_release_ambiguous",
    );
  }
  return authorityFromRow(result.rows[0]);
}

export async function persistPostgresOutlookDesktopInstallationReleaseBinding({
  client,
  installation,
  authority: authorityInput,
  device_proof_request_sha256: requestFingerprintInput,
  database_now: nowInput,
}) {
  const authority = normalizeOutlookDesktopInstallationReleaseAuthority(
    authorityInput,
  );
  const requestFingerprint = digest(
    requestFingerprintInput,
    "device_proof_request_sha256",
  );
  const now = iso(nowInput, "database_now");
  if (authority.tenant_id !== installation.tenant_id
      || authority.platform !== installation.platform
      || authority.app_version !== installation.app_version
      || authority.source_sha !== installation.source_sha) {
    fail(
      "OUTLOOK_DESKTOP_RELEASE_BINDING_MISMATCH",
      "outlook_desktop_release_binding_mismatch",
    );
  }
  const bindingSha = outlookDesktopInstallationReleaseBindingSha256([
    installation.tenant_id, installation.installation_id,
    installation.user_id, installation.entra_subject_id,
    installation.device_key_fingerprint, requestFingerprint,
    ...Object.keys(authority).sort().map((key) => authority[key]),
    now,
  ]);
  await client.query(
    `INSERT INTO lawos_email_dms.outlook_desktop_installation_release_bindings
       (tenant_id,installation_id,release_artifact_id,release_ticket_id,
        release_ticket_sha256,release_ticket_signature_sha256,platform,
        channel,app_version,app_id,arch,source_sha,source_tree,
        embedded_build_manifest_sha256,measured_inner_artifact_sha256,
        measured_inner_artifact_bytes,registered_final_artifact_sha256,
        registered_final_artifact_bytes,approval_sha256,
        approval_audit_event_id,approval_audit_event_binding_sha256,
        macos_technical_evidence_sha256,trust_registry_sha256,
        trust_registry_serial,release_valid_until,
        device_proof_request_sha256,installation_release_binding_sha256,
        authenticated_at)
     VALUES (${Array.from({ length: 28 }, (_, index) => `$${index + 1}`).join(",")})`,
    [installation.tenant_id, installation.installation_id,
      authority.release_artifact_id, authority.release_ticket_id,
      authority.release_ticket_sha256, authority.release_ticket_signature_sha256,
      authority.platform, authority.channel, authority.app_version,
      authority.app_id, authority.arch, authority.source_sha,
      authority.source_tree, authority.embedded_build_manifest_sha256,
      authority.measured_inner_artifact_sha256,
      authority.measured_inner_artifact_bytes,
      authority.registered_final_artifact_sha256,
      authority.registered_final_artifact_bytes, authority.approval_sha256,
      authority.approval_audit_event_id,
      authority.approval_audit_event_binding_sha256,
      authority.macos_technical_evidence_sha256,
      authority.trust_registry_sha256, authority.trust_registry_serial,
      authority.valid_until, requestFingerprint, bindingSha, now],
  );
  return Object.freeze({
    release_artifact_id: authority.release_artifact_id,
    installation_release_binding_sha256: bindingSha,
  });
}

export async function assertPostgresOutlookDesktopInstallationReleaseTrusted({
  client,
  tenant_id: tenantIdInput,
  installation_id: installationIdInput,
  database_now: nowInput,
}) {
  const tenantId = identifier(tenantIdInput, "tenant_id");
  const installationId = identifier(installationIdInput, "installation_id");
  const now = iso(nowInput, "database_now");
  const result = await client.query(
    `SELECT binding.release_artifact_id,binding.installation_release_binding_sha256
       FROM lawos_email_dms.outlook_desktop_installation_release_bindings AS binding
       JOIN lawos_email_dms.outlook_desktop_release_artifacts AS artifact
         ON artifact.tenant_id=binding.tenant_id
        AND artifact.release_artifact_id=binding.release_artifact_id
       JOIN lawos_email_dms.outlook_desktop_release_trust_audit_events AS approval
         ON approval.tenant_id=artifact.tenant_id
        AND approval.release_artifact_id=artifact.release_artifact_id
        AND approval.event_type='approved'
      WHERE binding.tenant_id=$1 AND binding.installation_id=$2
        AND artifact.revoked_at IS NULL
        AND artifact.valid_from<=$3 AND artifact.valid_until>$3
        AND binding.release_valid_until=artifact.valid_until
        AND binding.release_ticket_sha256=artifact.embedded_release_ticket_sha256
        AND binding.release_ticket_signature_sha256=artifact.embedded_release_ticket_signature_sha256
        AND binding.approval_audit_event_id=approval.event_id
        AND binding.approval_audit_event_binding_sha256=approval.event_binding_sha256
      FOR KEY SHARE OF artifact`,
    [tenantId, installationId, now],
  );
  if (result.rows.length !== 1) {
    fail(
      "OUTLOOK_DESKTOP_INSTALLATION_RELEASE_UNTRUSTED",
      "outlook_desktop_installation_release_untrusted",
    );
  }
  return Object.freeze({
    trusted: true,
    release_artifact_id: result.rows[0].release_artifact_id,
    installation_release_binding_sha256:
      result.rows[0].installation_release_binding_sha256,
  });
}
