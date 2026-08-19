import { withPostgresTransaction } from "../../persistence/src/postgres/transaction.js";

const OPTIONS = new Set([
  "assignment_projector", "authorize_revoke", "fault_injector", "pool",
  "tenant_id",
]);
const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/u;

function fail(code, reason, status = 400) {
  throw Object.assign(new Error(reason), { safe_error_code: code, status });
}

function identifier(value, field) {
  if (typeof value !== "string" || !IDENTIFIER.test(value)) {
    fail("OUTLOOK_RELEASE_REVOCATION_INVALID", `${field}_invalid`);
  }
  return value;
}

function exact(value, keys, field) {
  if (value === null || typeof value !== "object" || Array.isArray(value)
      || JSON.stringify(Object.keys(value).sort()) !== JSON.stringify(keys)) {
    fail("OUTLOOK_RELEASE_REVOCATION_INVALID", `${field}_invalid`);
  }
}

function canonicalNow(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) {
    fail("OUTLOOK_RELEASE_REVOCATION_TIME_INVALID", "release_revocation_time_invalid", 500);
  }
  return date.toISOString();
}

export function createPostgresOutlookDesktopReleaseRevocationService(
  options = {},
) {
  exact(options, Object.keys(options).sort(), "options");
  for (const key of Object.keys(options)) {
    if (!OPTIONS.has(key)) throw new TypeError(`unknown option: ${key}`);
  }
  if (!options.pool?.connect) throw new TypeError("PostgreSQL pool is required");
  if (typeof options.authorize_revoke !== "function") {
    fail("OUTLOOK_RELEASE_REVOCATION_AUTHORITY_REQUIRED", "release_revocation_authority_required", 500);
  }
  if (typeof options.assignment_projector !== "function") {
    fail("OUTLOOK_RELEASE_REVOCATION_PROJECTOR_REQUIRED", "release_revocation_projector_required", 500);
  }
  if (options.fault_injector !== undefined
      && typeof options.fault_injector !== "function") {
    throw new TypeError("fault_injector must be a function");
  }
  const tenantId = identifier(options.tenant_id, "tenant_id");
  const tx = (callback) => withPostgresTransaction(options.pool, {
    tenant_id: tenantId,
    isolationLevel: "serializable",
  }, callback);

  async function revoke(command = {}) {
    exact(
      command,
      ["release_artifact_id", "revocation_event_id", "revocation_reason"],
      "command",
    );
    const releaseArtifactId = identifier(
      command.release_artifact_id,
      "release_artifact_id",
    );
    const eventId = identifier(command.revocation_event_id, "revocation_event_id");
    const reason = identifier(command.revocation_reason, "revocation_reason");
    return tx(async (client) => {
      const now = canonicalNow((await client.query(
        "SELECT date_trunc('milliseconds', clock_timestamp()) AS now",
      )).rows[0]?.now);
      const artifact = (await client.query(
        `SELECT artifact.*,
                revocation.event_id AS revocation_audit_event_id,
                revocation.event_binding_sha256 AS revocation_audit_binding_sha256
           FROM lawos_email_dms.outlook_desktop_release_artifacts AS artifact
           LEFT JOIN lawos_email_dms.outlook_desktop_release_trust_audit_events AS revocation
             ON revocation.tenant_id=artifact.tenant_id
            AND revocation.release_artifact_id=artifact.release_artifact_id
            AND revocation.event_type='revoked'
          WHERE artifact.tenant_id=$1 AND artifact.release_artifact_id=$2
          FOR UPDATE OF artifact`,
        [tenantId, releaseArtifactId],
      )).rows[0];
      if (!artifact) {
        fail("OUTLOOK_RELEASE_REVOCATION_NOT_FOUND", "release_revocation_not_found", 404);
      }
      if (await options.authorize_revoke(Object.freeze({
        operation: "revoke", tenant_id: tenantId,
        release_artifact_id: releaseArtifactId,
        revocation_event_id: eventId, revocation_reason: reason,
        database_now: now,
      })) !== true) {
        fail("OUTLOOK_RELEASE_REVOCATION_NOT_AUTHORIZED", "release_revocation_not_authorized", 403);
      }
      if (artifact.revoked_at !== null) {
        if (artifact.revocation_reason !== reason
            || artifact.revocation_audit_event_id !== eventId
            || !artifact.revocation_audit_binding_sha256) {
          fail("OUTLOOK_RELEASE_REVOCATION_CONFLICT", "release_revocation_conflict", 409);
        }
        return Object.freeze({
          outcome: "replayed", tenant_id: tenantId,
          release_artifact_id: releaseArtifactId,
          revocation_event_id: eventId,
          revoked_at: new Date(artifact.revoked_at).toISOString(),
          projected_principal_count: 0,
          production_ready_claim: false,
        });
      }
      await client.query(
        `UPDATE lawos_email_dms.outlook_desktop_release_artifacts
            SET revoked_at=$3,revocation_reason=$4
          WHERE tenant_id=$1 AND release_artifact_id=$2`,
        [tenantId, releaseArtifactId, now, reason],
      );
      await options.fault_injector?.("after_revocation", artifact);
      const binding = (await client.query(
        `SELECT lawos_email_dms.outlook_desktop_release_audit_binding_sha256(
          $1,$2,$3,'revoked',$4,$5,$6,$7) AS binding`,
        [tenantId, eventId, releaseArtifactId,
          artifact.embedded_release_ticket_sha256,
          artifact.final_artifact_sha256, artifact.approval_sha256, now],
      )).rows[0]?.binding;
      await client.query(
        `INSERT INTO lawos_email_dms.outlook_desktop_release_trust_audit_events
           (tenant_id,event_id,release_artifact_id,event_type,
            release_ticket_sha256,final_artifact_sha256,approval_sha256,
            event_binding_sha256,occurred_at)
         VALUES ($1,$2,$3,'revoked',$4,$5,$6,$7,$8)`,
        [tenantId, eventId, releaseArtifactId,
          artifact.embedded_release_ticket_sha256,
          artifact.final_artifact_sha256, artifact.approval_sha256,
          binding, now],
      );
      await options.fault_injector?.("after_revocation_audit", artifact);
      const principals = (await client.query(
        `SELECT DISTINCT installation.user_id,installation.entra_subject_id
           FROM lawos_email_dms.outlook_desktop_installation_release_bindings AS binding
           JOIN lawos_email_dms.outlook_desktop_installations AS installation
             ON installation.tenant_id=binding.tenant_id
            AND installation.installation_id=binding.installation_id
          WHERE binding.tenant_id=$1 AND binding.release_artifact_id=$2
          ORDER BY installation.user_id,installation.entra_subject_id`,
        [tenantId, releaseArtifactId],
      )).rows;
      for (const principal of principals) {
        await options.assignment_projector(Object.freeze({
          client,
          database_now: now,
          principal: Object.freeze({ tenant_id: tenantId, ...principal }),
          reason: "release_revoked",
        }));
      }
      await options.fault_injector?.("after_assignment_projection", artifact);
      return Object.freeze({
        outcome: "revoked", tenant_id: tenantId,
        release_artifact_id: releaseArtifactId,
        revocation_event_id: eventId, revoked_at: now,
        projected_principal_count: principals.length,
        production_ready_claim: false,
      });
    });
  }

  return Object.freeze({
    authority: "postgres-outlook-desktop-release-revocation",
    revoke,
  });
}
