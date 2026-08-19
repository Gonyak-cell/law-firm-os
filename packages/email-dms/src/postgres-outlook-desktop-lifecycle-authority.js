import { withPostgresTransaction } from "../../persistence/src/postgres/transaction.js";
import {
  assignmentExactKeys,
  assignmentIdentifier,
  normalizeAssignmentPrincipal,
  normalizeOutlookDesktopLifecycleAuthorizationReceipt,
  normalizeOutlookDesktopLifecycleAuthorizationRequest,
  normalizeOutlookDesktopLifecycleChallengeReceipt,
  normalizeOutlookDesktopLifecycleChallengeRequest,
} from "./outlook-desktop-assignment-contract.js";
import {
  createPostgresOutlookDesktopInstallationAuthorityService,
} from "./postgres-outlook-desktop-installation-authority-service.js";

export const OUTLOOK_DESKTOP_LIFECYCLE_AUTHORITY_SCHEMA_VERSION =
  "lawos.outlook-desktop-lifecycle-authority.v1";
export const OUTLOOK_DESKTOP_LIFECYCLE_AUTHORITY_FUNCTIONS = Object.freeze({
  issueLifecycleChallenge: "issue_outlook_desktop_lifecycle_challenge",
  verifyLifecycleTransition: "mint_outlook_desktop_lifecycle_verifier_receipt",
});

const INSTANCES = new WeakSet();
const OPERATIONS = new Set(["register", "heartbeat", "retire"]);
const ERROR_BY_POSTGRES_CODE = new Map([
  ["LCH01", Object.freeze({
    code: "LAWOS_OUTLOOK_DESKTOP_LIFECYCLE_CHALLENGE_REPLAY_CONFLICT",
    safe_error_code: "OUTLOOK_DESKTOP_LIFECYCLE_CHALLENGE_REPLAY_CONFLICT",
    status: 409,
  })],
  ["LLC01", Object.freeze({
    code: "LAWOS_OUTLOOK_DESKTOP_LIFECYCLE_AUTHORIZATION_REPLAY_CONFLICT",
    safe_error_code: "OUTLOOK_DESKTOP_LIFECYCLE_AUTHORIZATION_REPLAY_CONFLICT",
    status: 409,
  })],
  ["LOU01", Object.freeze({
    code: "LAWOS_OUTLOOK_DESKTOP_RELEASE_UNTRUSTED",
    safe_error_code: "OUTLOOK_DESKTOP_RELEASE_UNTRUSTED",
    status: 409,
  })],
]);

function mapAuthorityError(error) {
  const mapped = ERROR_BY_POSTGRES_CODE.get(error?.postgres_code);
  if (!mapped) return error;
  return Object.assign(new Error(mapped.safe_error_code.toLowerCase()), mapped);
}

function mismatch() {
  throw Object.assign(new Error("outlook_desktop_lifecycle_binding_mismatch"), {
    code: "LAWOS_OUTLOOK_DESKTOP_LIFECYCLE_BINDING_MISMATCH",
    safe_error_code: "OUTLOOK_DESKTOP_LIFECYCLE_BINDING_MISMATCH",
    status: 403,
  });
}

function boundPrincipal(value, tenantId) {
  const principal = normalizeAssignmentPrincipal(value);
  if (principal.tenant_id !== tenantId) mismatch();
  return principal;
}

function matchPrincipal(principal, material) {
  if (material.user_id !== principal.user_id
      || material.entra_subject_id !== principal.entra_subject_id) {
    mismatch();
  }
}

export function assertPostgresOutlookDesktopLifecycleAuthority(value) {
  if (!INSTANCES.has(value) || !Object.isFrozen(value)) {
    throw new TypeError("PostgreSQL Outlook lifecycle authority is required");
  }
  return value;
}

export function createPostgresOutlookDesktopLifecycleAuthority(options = {}) {
  assignmentExactKeys(
    options,
    ["app_pool", "tenant_id", "verifier_pool"],
    "lifecycle authority options",
  );
  if (!options.app_pool?.connect) {
    throw new TypeError("PostgreSQL application pool is required");
  }
  if (!options.verifier_pool?.connect) {
    throw new TypeError("PostgreSQL verifier pool is required");
  }
  const tenantId = assignmentIdentifier(options.tenant_id, "tenant_id");
  const installationAuthority =
    createPostgresOutlookDesktopInstallationAuthorityService({
      pool: options.app_pool,
      tenant_id: tenantId,
    });
  const invoke = async (pool, name, request, normalize) => {
    try {
      return await withPostgresTransaction(
        pool,
        { tenant_id: tenantId, isolationLevel: "serializable" },
        async (client) => normalize((await client.query(
          `SELECT lawos_email_dms.${name}($1,$2::jsonb) AS value`,
          [tenantId, JSON.stringify(request)],
        )).rows[0]?.value),
      );
    } catch (error) {
      throw mapAuthorityError(error);
    }
  };

  const issueLifecycleChallenge = (input = {}) => {
    assignmentExactKeys(
      input,
      ["principal", "request"],
      "lifecycle challenge input",
    );
    const principal = boundPrincipal(input.principal, tenantId);
    const request = normalizeOutlookDesktopLifecycleChallengeRequest(input.request);
    matchPrincipal(principal, request);
    return invoke(
      options.app_pool,
      OUTLOOK_DESKTOP_LIFECYCLE_AUTHORITY_FUNCTIONS.issueLifecycleChallenge,
      request,
      normalizeOutlookDesktopLifecycleChallengeReceipt,
    );
  };

  const verifyLifecycleTransition = (input = {}) => {
    assignmentExactKeys(
      input,
      ["authorization"],
      "lifecycle verification input",
    );
    const authorization = normalizeOutlookDesktopLifecycleAuthorizationRequest(
      input.authorization,
    );
    return invoke(
      options.verifier_pool,
      OUTLOOK_DESKTOP_LIFECYCLE_AUTHORITY_FUNCTIONS.verifyLifecycleTransition,
      authorization,
      normalizeOutlookDesktopLifecycleAuthorizationReceipt,
    );
  };

  const consumeLifecycleTransition = (input = {}) => {
    assignmentExactKeys(
      input,
      ["authorization", "operation", "principal"],
      "lifecycle consumption input",
    );
    if (!OPERATIONS.has(input.operation)) {
      throw new TypeError("register, heartbeat, or retire is required");
    }
    const principal = boundPrincipal(input.principal, tenantId);
    if (input.authorization?.operation !== undefined
        && input.authorization.operation !== input.operation) {
      mismatch();
    }
    matchPrincipal(principal, input.authorization ?? {});
    return installationAuthority[input.operation]({
      authorization: input.authorization,
      principal,
    });
  };

  const authority = Object.freeze({
    schema_version: OUTLOOK_DESKTOP_LIFECYCLE_AUTHORITY_SCHEMA_VERSION,
    verifyLifecycleTransition,
    issueLifecycleChallenge,
    consumeLifecycleTransition,
  });
  INSTANCES.add(authority);
  return authority;
}
