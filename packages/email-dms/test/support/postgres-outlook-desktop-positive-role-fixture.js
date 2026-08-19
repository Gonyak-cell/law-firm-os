import assert from "node:assert/strict";
import { withPostgresTransaction } from "../../../persistence/src/postgres/transaction.js";
import { OUTLOOK_DESKTOP_RELEASE_IMPORT_ARTIFACT_KEYS } from "../../src/postgres-outlook-desktop-release-artifact-importer.js";
import { releaseArtifact } from "../helpers/outlook-desktop-release-trust-migration-fixture.js";
import {
  authorityBinding,
  authorityDigest,
  roleDatabaseNow,
} from "./postgres-outlook-desktop-assignment-authority-fixture.js";

export function roleQuery(
  pool,
  tenantId,
  statement,
  values = [],
  readOnly = false,
  tenantContextSecret,
) {
  return withPostgresTransaction(
    pool,
    {
      tenant_id: tenantId,
      isolationLevel: "serializable",
      readOnly,
      tenantContextSecret,
    },
    async (client) => (await client.query(statement, values)).rows[0]?.value,
  );
}

export async function assertTenantContextBoundary(
  pool,
  tenantId,
  role,
  signature,
  statement,
  values,
) {
  const authority = (await pool.query(
    `SELECT session_user::text,current_user::text,
            has_schema_privilege(session_user,'lawos_email_dms','USAGE') AS schema_usage,
            has_function_privilege(session_user,$1,'EXECUTE') AS function_execute`,
    [signature],
  )).rows[0];
  assert.deepEqual(authority, {
    session_user: role,
    current_user: role,
    schema_usage: true,
    function_execute: true,
  });
  await assert.rejects(
    roleQuery(pool, tenantId, statement, values, false, ""),
    (error) => error?.code === "LAWOS_POSTGRES_TENANT_CONTEXT_REQUIRED"
      && error?.safe_error_code === "POSTGRES_TENANT_CONTEXT_REQUIRED" && error?.status === 500,
  );
  await assert.rejects(
    roleQuery(pool, tenantId, statement, values, false, "wrong-secret".repeat(4)),
    (error) => error?.code === "LAWOS_POSTGRES_TENANT_CONTEXT_AUTHENTICATION_FAILED"
      && error?.safe_error_code === "POSTGRES_TENANT_CONTEXT_AUTHENTICATION_FAILED" && error?.status === 403,
  );
}

export async function assertProtectedObservationBoundary(authority) {
  await assert.rejects(
    authority.adminPool.query("SELECT 1 FROM lawos_email_dms.outlook_desktop_assignment_states LIMIT 1"),
    (error) => error?.code === "42501",
  );
  const identity = (await authority.observerPool.query(`SELECT session_user::text,
    current_user::text,(SELECT rolsuper FROM pg_roles WHERE rolname=session_user) AS rolsuper`)).rows[0];
  assert.notEqual(identity.session_user, "lawos_admin");
  assert.equal(identity.current_user, identity.session_user);
  assert.equal(identity.rolsuper, true);
}

export async function simultaneousRoleOperations(operations, { settled = false } = {}) {
  assert.equal(operations.length, 2);
  let arrived = 0;
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const execute = ({ pool, tenantId, statement, values }) => {
    let initialBackendPid;
    const operation = withPostgresTransaction(
      pool,
      { tenant_id: tenantId, isolationLevel: "serializable" },
      async (client) => {
        const backendPid = (await client.query("SELECT pg_backend_pid() AS pid")).rows[0].pid;
        initialBackendPid ??= backendPid;
        arrived += 1;
        if (arrived === 2) release();
        await gate;
        const value = (await client.query(statement, values)).rows[0]?.value;
        return Object.freeze({ backend_pid: initialBackendPid, value });
      },
    );
    return operation.catch((error) => {
      error.backend_pid = initialBackendPid;
      throw error;
    });
  };
  const promises = operations.map(execute);
  return settled ? Promise.allSettled(promises) : Promise.all(promises);
}

export async function releaseImportPayload(authority, suffix = "2") {
  const now = Date.parse(await roleDatabaseNow(authority.controlPool, authority.tenantId));
  const validFrom = new Date(now + 60_000).toISOString();
  const artifact = releaseArtifact(suffix, {
    tenant_id: authority.tenantId,
    release_artifact_id: `positive-release-${suffix}`,
    release_ticket_id: `positive-ticket-${suffix}`,
    approval_audit_event_id: `positive-approval-${suffix}`,
    macos_certificate_valid_from: new Date(now - 86_400_000).toISOString(),
    macos_certificate_valid_until: new Date(now + 86_400_000).toISOString(),
    macos_evidence_observed_at: new Date(now - 60_000).toISOString(),
    macos_evidence_expires_at: new Date(now + 86_400_000).toISOString(),
    ticket_issued_at: new Date(now - 60_000).toISOString(),
    ticket_expires_at: new Date(now + 86_400_000).toISOString(),
    valid_from: validFrom,
    valid_until: new Date(now + 86_400_000).toISOString(),
  });
  return Object.freeze(Object.fromEntries(
    OUTLOOK_DESKTOP_RELEASE_IMPORT_ARTIFACT_KEYS.map((key) => [key, artifact[key]]),
  ));
}

export async function expandedRoster(authority, canaryRoster, suffix = "1", {
  authorizationLifetimeMilliseconds = 120_000,
} = {}) {
  const now = Date.parse(await roleDatabaseNow(authority.controlPool, authority.tenantId));
  const rosterVersion = `positive-expanded-roster-${suffix}`;
  const expansionId = `positive-expansion-${suffix}`;
  const ownerApproval = authorityDigest(`positive-expanded-owner-${suffix}`);
  const approvedAt = new Date(now - 1_000).toISOString();
  const validFrom = approvedAt;
  const validUntil = new Date(now + 3_600_000).toISOString();
  const principals = [
    authority.principal,
    { user_id: `positive-user-${suffix}`, entra_subject_id: `positive-subject-${suffix}` },
  ];
  const members = principals.map((principal) => ({
    ...principal,
    member_binding_sha256: authorityBinding(
      "lawos.outlook-desktop-assignment-roster-member.v1",
      [authority.tenantId, rosterVersion, principal.user_id, principal.entra_subject_id],
    ),
  }));
  const rosterBinding = authorityBinding(
    "lawos.outlook-desktop-assignment-roster.v1",
    [authority.tenantId, rosterVersion, "expanded", expansionId, ownerApproval,
      approvedAt, validFrom, validUntil,
      ...members.map(({ member_binding_sha256: value }) => value).sort()],
  );
  const roster = Object.freeze({
    roster_version: rosterVersion,
    rollout_stage: "expanded",
    roster_binding_sha256: rosterBinding,
    owner_approval_sha256: ownerApproval,
    expansion_authorization_id: expansionId,
    approved_at: approvedAt,
    valid_from: validFrom,
    valid_until: validUntil,
    members,
  });
  const authorization = Object.freeze({
    expansion_authorization_id: expansionId,
    canary_roster_version: canaryRoster.roster_version,
    canary_success_evidence_sha256: authorityDigest(`positive-canary-${suffix}`),
    expanded_roster_version: rosterVersion,
    expanded_roster_binding_sha256: rosterBinding,
    owner_approval_sha256: ownerApproval,
    valid_until: new Date(now + authorizationLifetimeMilliseconds).toISOString(),
  });
  return Object.freeze({ authorization, principals, roster });
}

export async function policyApproval(authority, roster, principal, {
  revision,
  suffix,
  enabled = true,
  validUntil = roster.valid_until,
} = {}) {
  const approvedAt = await roleDatabaseNow(authority.controlPool, authority.tenantId);
  const validFrom = approvedAt;
  const approvalId = `positive-policy-${suffix}-${revision}`;
  const values = [enabled, enabled, enabled, enabled];
  const binding = authorityBinding(
    "lawos.outlook-desktop-assignment-policy-approval.v1",
    [authority.tenantId, approvalId, principal.user_id, principal.entra_subject_id,
      roster.rollout_stage, ...values, revision, roster.roster_version,
      roster.roster_binding_sha256, roster.owner_approval_sha256,
      String(Date.parse(approvedAt)), String(Date.parse(validFrom)),
      String(Date.parse(validUntil))],
  );
  return Object.freeze({
    approval_id: approvalId,
    ...principal,
    rollout_stage: roster.rollout_stage,
    maximum_entitled: enabled,
    rollout_authorized: enabled,
    account_active: enabled,
    release_allowed: enabled,
    policy_revision: revision,
    roster_version: roster.roster_version,
    roster_binding_sha256: roster.roster_binding_sha256,
    owner_approval_sha256: roster.owner_approval_sha256,
    policy_binding_sha256: binding,
    approved_at: approvedAt,
    valid_from: validFrom,
    valid_until: validUntil,
  });
}

export function preparedAuthorizationPayloads(authority, prepared, suffix) {
  void authority;
  void suffix;
  return Object.freeze({
    activation: prepared.activationAuthorization,
    verifier: prepared.verifierAuthorization,
  });
}
