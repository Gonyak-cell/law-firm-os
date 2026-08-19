import {
  assignmentIdentifier,
  assignmentIso,
  assignmentSha256,
} from "./outlook-desktop-assignment-contract.js";

const INPUT_KEYS = Object.freeze([
  "client", "database_now", "entra_subject_id", "tenant_id", "user_id",
]);

function invalid(reason) {
  throw Object.assign(new Error(reason), {
    safe_error_code: "OUTLOOK_ASSIGNMENT_TRUST_AUTHORITY_INVALID",
    status: 500,
  });
}

function exactInput(input) {
  if (input === null || typeof input !== "object" || Array.isArray(input)
      || JSON.stringify(Object.keys(input).sort()) !== JSON.stringify(INPUT_KEYS)) {
    invalid("outlook_assignment_trust_authority_input_invalid");
  }
  if (!input.client?.query) throw new TypeError("PostgreSQL client is required");
}

function instant(value) {
  if (value === null || value === undefined) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) invalid("outlook_assignment_trust_time_invalid");
  return date.toISOString();
}

const TRUSTED_INSTALLATIONS_SQL = `
  SELECT installation.installation_id,installation.state_version,
         installation.last_seen_at,installation.lease_expires_at,
         installation.retired_at,binding.authenticated_at,
         binding.release_artifact_id,binding.installation_release_binding_sha256,
         artifact.valid_until AS artifact_valid_until,
         artifact.revoked_at AS artifact_revoked_at,
         CASE WHEN binding.installation_id IS NOT NULL
           AND installation.retired_at IS NULL
           AND installation.lease_expires_at > $4
           AND binding.authenticated_at IS NOT NULL
           AND binding.release_valid_until > $4
           AND binding.platform='darwin'
           AND artifact.release_artifact_id IS NOT NULL
           AND artifact.platform='darwin'
           AND artifact.revoked_at IS NULL
           AND artifact.valid_from <= $4 AND artifact.valid_until > $4
           AND binding.release_valid_until=artifact.valid_until
           AND binding.release_ticket_id=artifact.release_ticket_id
           AND binding.release_ticket_sha256=artifact.embedded_release_ticket_sha256
           AND binding.release_ticket_signature_sha256=artifact.embedded_release_ticket_signature_sha256
           AND binding.app_version=artifact.app_version
           AND binding.source_sha=artifact.source_sha
           AND binding.source_tree=artifact.source_tree
           AND binding.embedded_build_manifest_sha256=artifact.embedded_build_manifest_sha256
           AND binding.measured_inner_artifact_sha256=artifact.embedded_inner_artifact_sha256
           AND binding.measured_inner_artifact_bytes=artifact.embedded_inner_artifact_bytes
           AND binding.registered_final_artifact_sha256=artifact.final_artifact_sha256
           AND binding.registered_final_artifact_bytes=artifact.final_artifact_bytes
           AND binding.approval_sha256=artifact.approval_sha256
           AND binding.trust_registry_sha256=artifact.trust_registry_sha256
           AND binding.trust_registry_serial=artifact.trust_registry_serial
           AND approval.event_id=binding.approval_audit_event_id
           AND approval.event_binding_sha256=binding.approval_audit_event_binding_sha256
           AND approval.release_ticket_sha256=artifact.embedded_release_ticket_sha256
           AND approval.final_artifact_sha256=artifact.final_artifact_sha256
           AND approval.approval_sha256=artifact.approval_sha256
         THEN true ELSE false END AS trusted_active
    FROM lawos_email_dms.outlook_desktop_installations AS installation
    LEFT JOIN lawos_email_dms.outlook_desktop_installation_release_bindings AS binding
      ON binding.tenant_id=installation.tenant_id
     AND binding.installation_id=installation.installation_id
    LEFT JOIN lawos_email_dms.outlook_desktop_release_artifacts AS artifact
      ON artifact.tenant_id=binding.tenant_id
     AND artifact.release_artifact_id=binding.release_artifact_id
    LEFT JOIN lawos_email_dms.outlook_desktop_release_trust_audit_events AS approval
      ON approval.tenant_id=artifact.tenant_id
     AND approval.release_artifact_id=artifact.release_artifact_id
     AND approval.event_type='approved'
   WHERE installation.tenant_id=$1 AND installation.user_id=$2
     AND installation.entra_subject_id=$3
   ORDER BY installation.installation_id
   FOR KEY SHARE OF installation`;

export async function readPostgresOutlookDesktopTrustedInstallAuthority(
  input,
) {
  exactInput(input);
  const principal = Object.freeze({
    tenant_id: assignmentIdentifier(input.tenant_id, "trust tenant_id"),
    user_id: assignmentIdentifier(input.user_id, "trust user_id"),
    entra_subject_id: assignmentIdentifier(
      input.entra_subject_id,
      "trust entra_subject_id",
    ),
  });
  const now = assignmentIso(input.database_now, "trust database_now");
  const rows = (await input.client.query(TRUSTED_INSTALLATIONS_SQL, [
    principal.tenant_id,
    principal.user_id,
    principal.entra_subject_id,
    now,
  ])).rows;
  const activeRows = rows.filter(({ trusted_active: trusted }) => trusted === true);
  const revision = rows.reduce((total, row) => {
    const value = Number(row.state_version);
    if (!Number.isSafeInteger(value) || value < 1
        || !Number.isSafeInteger(total + value)) {
      invalid("outlook_assignment_trust_revision_invalid");
    }
    return total + value;
  }, 1);
  const bindingMaterial = rows.map((row) => Object.freeze([
    row.installation_id,
    Number(row.state_version),
    instant(row.last_seen_at),
    instant(row.lease_expires_at),
    instant(row.retired_at),
    instant(row.authenticated_at),
    row.release_artifact_id ?? null,
    row.installation_release_binding_sha256 ?? null,
    instant(row.artifact_valid_until),
    instant(row.artifact_revoked_at),
    row.trusted_active === true,
  ]));
  return Object.freeze({
    schema_version: "lawos.outlook-desktop-trust-count.v1",
    authority: "postgres-release-bound-installations",
    ...principal,
    active_trusted_install_count: activeRows.length,
    authority_revision: revision,
    authority_binding_sha256: assignmentSha256(
      "lawos.outlook-assignment.trusted-install-authority.v1",
      [principal, now, bindingMaterial],
    ),
  });
}
