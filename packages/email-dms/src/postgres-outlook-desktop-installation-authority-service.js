import { withPostgresTransaction } from "../../persistence/src/postgres/transaction.js";
import {
  assignmentExactKeys,
  assignmentIdentifier,
  assignmentRecord,
  normalizeAssignmentPrincipal,
} from "./outlook-desktop-assignment-contract.js";

export const OUTLOOK_DESKTOP_INSTALLATION_AUTHORITY_FUNCTIONS = Object.freeze({
  heartbeat: "heartbeat_outlook_desktop_installation",
  projectAssignmentState: "read_outlook_desktop_assignment_state",
  read: "read_outlook_desktop_installation",
  readCurrent: "read_current_outlook_desktop_installation",
  register: "register_outlook_desktop_installation",
  retire: "retire_outlook_desktop_installation",
});

function mismatch() {
  throw Object.assign(new Error("outlook_desktop_installation_binding_mismatch"), {
    safe_error_code: "OUTLOOK_DESKTOP_INSTALLATION_BINDING_MISMATCH",
    status: 403,
  });
}

function mapHeartbeatError(error) {
  if (error?.postgres_code !== "LOU01") return error;
  return Object.assign(new Error("outlook_desktop_release_untrusted"), {
    code: "LAWOS_OUTLOOK_DESKTOP_RELEASE_UNTRUSTED",
    safe_error_code: "OUTLOOK_DESKTOP_RELEASE_UNTRUSTED",
    status: 409,
  });
}

function boundPrincipal(value, tenantId) {
  const principal = normalizeAssignmentPrincipal(value);
  if (principal.tenant_id !== tenantId) mismatch();
  return principal;
}

function transitionInput(value, tenantId) {
  assignmentExactKeys(value, ["authorization", "principal"], "authority input");
  const principal = boundPrincipal(value.principal, tenantId);
  const authorization = assignmentRecord(value.authorization, "authorization");
  if (authorization.user_id !== principal.user_id
      || authorization.entra_subject_id !== principal.entra_subject_id) {
    mismatch();
  }
  return { authorization, principal };
}

export function createPostgresOutlookDesktopInstallationAuthorityService(
  options = {},
) {
  assignmentExactKeys(options, ["pool", "tenant_id"], "authority options");
  if (!options.pool?.connect) throw new TypeError("PostgreSQL pool is required");
  const tenantId = assignmentIdentifier(options.tenant_id, "tenant_id");
  const tx = (callback, readOnly = false) => withPostgresTransaction(
    options.pool,
    { tenant_id: tenantId, isolationLevel: "serializable", readOnly },
    callback,
  );

  const transition = async (operation, value) => {
    const { authorization } = transitionInput(value, tenantId);
    try {
      return await tx(async (client) => (
        await client.query(
          `SELECT lawos_email_dms.${OUTLOOK_DESKTOP_INSTALLATION_AUTHORITY_FUNCTIONS[operation]}($1,$2::jsonb) AS value`,
          [tenantId, JSON.stringify(authorization)],
        )
      ).rows[0]?.value);
    } catch (error) {
      throw operation === "heartbeat"
        ? mapHeartbeatError(error)
        : error;
    }
  };

  const read = (value = {}) => {
    assignmentExactKeys(value, ["installation_id", "principal"], "read input");
    const principal = boundPrincipal(value.principal, tenantId);
    const installationId = assignmentIdentifier(
      value.installation_id,
      "installation_id",
    );
    return tx(async (client) => (await client.query(
      `SELECT lawos_email_dms.${OUTLOOK_DESKTOP_INSTALLATION_AUTHORITY_FUNCTIONS.read}($1,$2,$3,$4) AS value`,
      [tenantId, principal.user_id, principal.entra_subject_id, installationId],
    )).rows[0]?.value ?? null, true);
  };

  const principalRead = (operation, value = {}, readOnly = true) => {
    assignmentExactKeys(value, ["principal"], `${operation} input`);
    const principal = boundPrincipal(value.principal, tenantId);
    return tx(async (client) => (await client.query(
      `SELECT lawos_email_dms.${OUTLOOK_DESKTOP_INSTALLATION_AUTHORITY_FUNCTIONS[operation]}($1,$2,$3) AS value`,
      [tenantId, principal.user_id, principal.entra_subject_id],
    )).rows[0]?.value ?? null, readOnly);
  };

  return Object.freeze({
    authority: "postgres-outlook-desktop-installation-authority",
    register: (value) => transition("register", value),
    heartbeat: (value) => transition("heartbeat", value),
    retire: (value) => transition("retire", value),
    read,
    readCurrent: (value) => principalRead("readCurrent", value),
    projectAssignmentState: (value) => (
      principalRead("projectAssignmentState", value, false)
    ),
  });
}
