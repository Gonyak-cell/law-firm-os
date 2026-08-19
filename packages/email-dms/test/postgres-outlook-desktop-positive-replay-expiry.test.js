import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import test from "node:test";

import {
  authorityBinding,
  authorityDigest,
  authorizeLifecycle,
  createOutlookAssignmentAuthorityFixture,
  prepareRegistration,
  roleDatabaseNow,
} from "./support/postgres-outlook-desktop-assignment-authority-fixture.js";
import {
  expandedRoster,
  policyApproval,
  preparedAuthorizationPayloads,
  roleQuery,
} from "./support/postgres-outlook-desktop-positive-role-fixture.js";

const SHORT_LIFETIME_MILLISECONDS = 10_000;

function roleText(authority, pool, name, payload) {
  return roleQuery(pool, authority.tenantId,
    `SELECT lawos_email_dms.${name}($1,$2::jsonb)::text AS value`,
    [authority.tenantId, JSON.stringify(payload)]);
}

async function shortCanary(authority, suffix) {
  const now = Date.parse(await roleDatabaseNow(authority.controlPool, authority.tenantId));
  const approvedAt = new Date(now - 1_000).toISOString();
  const validUntil = new Date(now + SHORT_LIFETIME_MILLISECONDS).toISOString();
  const rosterVersion = `short-canary-roster-${suffix}`;
  const ownerApproval = authorityDigest(`short-owner-${suffix}`);
  const memberBinding = authorityBinding("lawos.outlook-desktop-assignment-roster-member.v1",
    [authority.tenantId, rosterVersion, authority.principal.user_id,
      authority.principal.entra_subject_id]);
  const roster = Object.freeze({
    roster_version: rosterVersion, rollout_stage: "jwsuh_canary",
    roster_binding_sha256: authorityBinding("lawos.outlook-desktop-assignment-roster.v1",
      [authority.tenantId, rosterVersion, "jwsuh_canary", "none", ownerApproval,
        approvedAt, approvedAt, validUntil, memberBinding]),
    owner_approval_sha256: ownerApproval, expansion_authorization_id: null,
    approved_at: approvedAt, valid_from: approvedAt, valid_until: validUntil,
    members: [{ ...authority.principal, member_binding_sha256: memberBinding }],
  });
  const rosterText = await roleText(authority, authority.controlPool,
    "import_outlook_desktop_assignment_roster", roster);
  const approval = await policyApproval(authority, roster, authority.principal, {
    revision: 91, suffix: "expiry", validUntil,
  });
  const policyText = await roleText(authority, authority.controlPool,
    "approve_outlook_desktop_assignment_policy", approval);
  return Object.freeze({ approval, policyText, roster, rosterText });
}

async function shortRegistration(authority, suffix) {
  const base = await prepareRegistration(authority, `${suffix}-base`, {
    lifetimeMilliseconds: SHORT_LIFETIME_MILLISECONDS,
  });
  const payloads = preparedAuthorizationPayloads(authority, base, `${suffix}-base`);
  const activationText = await roleText(authority, authority.controlPool,
    "authorize_outlook_desktop_activation", payloads.activation);
  const verifierText = await roleText(authority, authority.verifierPool,
    "mint_outlook_desktop_lifecycle_verifier_receipt", payloads.verifier);
  return Object.freeze({
    activation: payloads.activation,
    activationText,
    expiresAt: base.registration.expires_at,
    verifier: payloads.verifier,
    verifierText,
    registration: base.registration,
  });
}

async function shortLifecycle(authority, registered, operation, version, suffix) {
  return authorizeLifecycle(
    authority, registered, operation, version, `short-${suffix}`,
    { challengeLifetimeMilliseconds: SHORT_LIFETIME_MILLISECONDS },
  );
}

async function runtimeSnapshot(authority) {
  return (await authority.observerPool.query(
    `SELECT jsonb_build_object(
      'expansion',(SELECT jsonb_agg(to_jsonb(row) ORDER BY expansion_authorization_id)
        FROM lawos_email_dms.outlook_desktop_assignment_expansion_authorizations row WHERE tenant_id=$1),
      'roster',(SELECT jsonb_agg(to_jsonb(row) ORDER BY roster_version)
        FROM lawos_email_dms.outlook_desktop_assignment_rosters row WHERE tenant_id=$1),
      'approval',(SELECT jsonb_agg(to_jsonb(row) ORDER BY approval_id)
        FROM lawos_email_dms.outlook_desktop_assignment_policy_approvals row WHERE tenant_id=$1),
      'policy',(SELECT jsonb_agg(to_jsonb(row) ORDER BY user_id)
        FROM lawos_email_dms.outlook_desktop_assignment_policies row WHERE tenant_id=$1),
      'activation',(SELECT jsonb_agg(to_jsonb(row) ORDER BY activation_authorization_id)
        FROM lawos_email_dms.outlook_desktop_activation_authorizations row WHERE tenant_id=$1),
      'lifecycle',(SELECT jsonb_agg(to_jsonb(row) ORDER BY lifecycle_authorization_id)
        FROM lawos_email_dms.outlook_desktop_lifecycle_authorizations row WHERE tenant_id=$1),
      'installation',(SELECT jsonb_agg(to_jsonb(row) ORDER BY installation_id)
        FROM lawos_email_dms.outlook_desktop_installations row WHERE tenant_id=$1),
      'idempotency',(SELECT jsonb_agg(to_jsonb(row) ORDER BY idempotency_key)
        FROM lawos_email_dms.outlook_desktop_installation_idempotency row WHERE tenant_id=$1),
      'state',(SELECT jsonb_agg(to_jsonb(row) ORDER BY user_id)
        FROM lawos_email_dms.outlook_desktop_assignment_states row WHERE tenant_id=$1),
      'outbox',(SELECT jsonb_agg(to_jsonb(row) ORDER BY provider_generation)
        FROM lawos_email_dms.outlook_desktop_assignment_outbox row WHERE tenant_id=$1)
    )::text AS value`, [authority.tenantId])).rows[0].value;
}

test("completed exact-role operations replay without mutation after proof expiry", async (t) => {
  const authority = await createOutlookAssignmentAuthorityFixture(t, {
    tenantId: "tenant-positive-completed-replay-expiry-a",
  });
  if (!authority) return;
  const canary = await shortCanary(authority, "expiry");
  assert.equal(JSON.parse(canary.rosterText).outcome, "imported");
  assert.equal(JSON.parse(canary.policyText).outcome, "approved");
  const expansion = await expandedRoster(authority, canary.roster, "expiry", {
    authorizationLifetimeMilliseconds: SHORT_LIFETIME_MILLISECONDS,
  });
  const expansionText = await roleText(authority, authority.controlPool,
    "authorize_outlook_desktop_assignment_expansion", expansion.authorization);
  assert.equal(JSON.parse(expansionText).outcome, "authorized");
  const prepared = await shortRegistration(authority, "expiry");
  const registeredText = await roleText(authority, authority.appPool,
    "register_outlook_desktop_installation", prepared.registration);
  assert.equal(JSON.parse(registeredText).body.outcome, "registered");
  const heartbeat = await shortLifecycle(authority, prepared, "heartbeat", 1, "expiry");
  const heartbeatText = await roleText(authority, authority.appPool,
    "heartbeat_outlook_desktop_installation", heartbeat);
  assert.equal(JSON.parse(heartbeatText).body.installation.state_version, 2);
  const retirement = await shortLifecycle(authority, prepared, "retire", 2, "expiry");
  const retirementText = await roleText(authority, authority.appPool,
    "retire_outlook_desktop_installation", retirement);
  assert.equal(JSON.parse(retirementText).body.installation.status, "retired");
  const deadline = Math.max(Date.parse(expansion.authorization.valid_until),
    Date.parse(canary.roster.valid_until), Date.parse(prepared.expiresAt),
    Date.parse(heartbeat.expires_at),
    Date.parse(retirement.expires_at));
  await delay(Math.max(0, deadline - Date.now()) + 150);
  const completed = await runtimeSnapshot(authority);

  assert.equal(await roleText(authority, authority.controlPool,
    "import_outlook_desktop_assignment_roster", canary.roster), canary.rosterText);
  assert.equal(await roleText(authority, authority.controlPool,
    "approve_outlook_desktop_assignment_policy", canary.approval), canary.policyText);
  assert.equal(await roleText(authority, authority.controlPool,
    "authorize_outlook_desktop_assignment_expansion", expansion.authorization),
  expansionText);
  assert.equal(await roleText(authority, authority.controlPool,
    "authorize_outlook_desktop_activation", prepared.activation), prepared.activationText);
  assert.equal(await roleText(authority, authority.verifierPool,
    "mint_outlook_desktop_lifecycle_verifier_receipt", prepared.verifier),
  prepared.verifierText);
  assert.equal(await roleText(authority, authority.appPool,
    "register_outlook_desktop_installation", prepared.registration), registeredText);
  assert.equal(await roleText(authority, authority.appPool,
    "heartbeat_outlook_desktop_installation", heartbeat), heartbeatText);
  assert.equal(await roleText(authority, authority.appPool,
    "retire_outlook_desktop_installation", retirement), retirementText);
  assert.equal(await runtimeSnapshot(authority), completed);
});
