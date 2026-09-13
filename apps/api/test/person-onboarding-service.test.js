import assert from "node:assert/strict";
import test from "node:test";
import { createMasterDataRepository } from "../../../packages/master-data/src/repository.js";
import { createInMemoryHrxRepository } from "../../../packages/hrx/src/repository.js";
import { createClientPortalRepository } from "../../../packages/client-portal/src/runtime-repository.js";
import { createPersonOnboardingService } from "../src/person-onboarding-service.js";

const tenantId = "tenant_person_onboarding_synthetic";
const actor = Object.freeze({ user_id: "user_admin", tenant_id: tenantId, scopes: ["security.admin"] });

function fixture({ failProvision = false } = {}) {
  const master = createMasterDataRepository({ seedRecords: [{
    model_type: "ClientGroup", tenant_id: tenantId, client_group_id: "client_group_synthetic",
    display_name: "Synthetic Client", canonical_display_name: "Synthetic Client", status: "active", owner_user_id: "user_admin",
  }] });
  const hrx = createInMemoryHrxRepository();
  const portal = createClientPortalRepository();
  const users = new Map();
  const receipts = [];
  let remainingProvisionFailures = failProvision ? 1 : 0;
  const identity = {
    findByEmail: ({ tenant_id, email }) => [...users.values()].find(user => user.tenant_id === tenant_id && user.email === email) ?? null,
    findByUserId: ({ tenant_id, user_id }) => users.get(user_id)?.tenant_id === tenant_id ? users.get(user_id) : null,
    provisionInvitation(input) {
      if (remainingProvisionFailures > 0) { remainingProvisionFailures -= 1; throw new Error("synthetic identity failure"); }
      if (users.has(input.user_id)) throw new Error("duplicate user");
      const user = { ...input, status: "invited" };
      users.set(user.user_id, user);
      receipts.push(user.user_id);
      return { user, setup_url: `/setup?token=synthetic-${user.user_id}`, expires_at: "2030-01-01T00:00:00.000Z" };
    },
    cancelInvitation({ user_id }) { users.delete(user_id); },
  };
  return { master, hrx, portal, users, receipts, service: createPersonOnboardingService({
    masterRepository: master, hrxRepository: hrx, portalRepository: portal, identityGateway: identity,
  }) };
}

const internal = Object.freeze({ type: "internal", email: "internal@example.test", display_name: "Internal Synthetic",
  legal_name: "Internal Legal", mobile_phone: "010-1000-2000", employment_type: "full_time", title: "Associate",
  effective_from: "2026-09-13" });
const external = Object.freeze({ type: "external", email: "external@example.test", display_name: "External Synthetic",
  legal_name: "External Legal", client_group_id: "client_group_synthetic" });

test("internal onboarding creates one Person and linked HRX extension plus account invitation", async () => {
  const f = fixture();
  const result = await f.service.onboard({ actor, input: internal, idempotency_key: "invite-internal-1" });
  assert.equal(result.outcome, "created");
  assert.match(result.invitation.setup_url, /token=/);
  assert.equal(f.master.list({ tenant_id: tenantId, model_type: "Person" }).length, 1);
  const person = f.master.list({ tenant_id: tenantId, model_type: "Person" })[0];
  const employee = f.hrx.listEmployees({ tenant_id: tenantId })[0];
  const profile = f.hrx.listEmploymentProfiles({ tenant_id: tenantId })[0];
  const link = f.hrx.listEmployeeUserLinks({ tenant_id: tenantId })[0];
  assert.equal(employee.person_id, person.person_id);
  assert.equal(profile.person_id, person.person_id);
  assert.equal(link.user_id, person.account_user_id);
  assert.equal(f.portal.list({ tenant_id: tenantId, model_type: "ExternalUser" }).length, 0);
});

test("external onboarding creates one Person and linked ExternalUser without any Matter ACL", async () => {
  const f = fixture();
  const result = await f.service.onboard({ actor, input: external, idempotency_key: "invite-external-1" });
  const person = f.master.list({ tenant_id: tenantId, model_type: "Person" })[0];
  const extension = f.portal.list({ tenant_id: tenantId, model_type: "ExternalUser" })[0];
  assert.equal(extension.person_id, person.person_id);
  assert.equal(extension.user_id, person.account_user_id);
  assert.equal(extension.client_group_id, "client_group_synthetic");
  assert.equal(f.hrx.listEmployees({ tenant_id: tenantId }).length, 0);
  assert.equal(f.portal.list({ tenant_id: tenantId, model_type: "ExternalAcl" }).length, 0);
  assert.equal(result.access.matter_access, "denied_until_explicit_acl");
});

test("onboarding replay is safe, conflict is rejected, and invitation secret is returned once", async () => {
  const f = fixture();
  const first = await f.service.onboard({ actor, input: internal, idempotency_key: "invite-replay-1" });
  const replay = await f.service.onboard({ actor, input: internal, idempotency_key: "invite-replay-1" });
  assert.match(first.invitation.setup_url, /token=/);
  assert.equal(replay.idempotent_replay, true);
  assert.equal(replay.invitation.setup_url, null);
  assert.equal(f.receipts.length, 1);
  await assert.rejects(() => f.service.onboard({ actor, input: { ...internal, title: "Partner" }, idempotency_key: "invite-replay-1" }), /ONBOARDING_IDEMPOTENCY_CONFLICT/);
});

test("onboarding rejects unauthorized, cross-tenant, duplicate identity, and role conflation", async () => {
  const f = fixture();
  await assert.rejects(() => f.service.onboard({ actor: { ...actor, scopes: [] }, input: internal, idempotency_key: "invite-denied-1" }), /ONBOARDING_PERMISSION_DENIED/);
  await assert.rejects(() => f.service.onboard({ actor, input: { ...internal, tenant_id: "other" }, idempotency_key: "invite-tenant-1" }), /ONBOARDING_TENANT_DENIED/);
  const created = await f.service.onboard({ actor, input: internal, idempotency_key: "invite-duplicate-1" });
  await assert.rejects(() => f.service.onboard({ actor, input: { ...external, email: internal.email }, idempotency_key: "invite-duplicate-2" }), /ONBOARDING_IDENTITY_CONFLICT/);
  const person = f.master.list({ tenant_id: tenantId, model_type: "Person" })[0];
  assert.equal(person.account_user_id, created.user.user_id);
  assert.equal(f.portal.list({ tenant_id: tenantId, model_type: "ExternalUser" }).length, 0);
});

test("provisioning failure rolls back Person and role extension so retry can recover", async () => {
  const failed = fixture({ failProvision: true });
  await assert.rejects(() => failed.service.onboard({ actor, input: external, idempotency_key: "invite-recover-1" }), /synthetic identity failure/);
  assert.equal(failed.master.list({ tenant_id: tenantId, model_type: "Person" }).length, 0);
  assert.equal(failed.portal.list({ tenant_id: tenantId, model_type: "ExternalUser" }).length, 0);
  assert.equal((await failed.service.onboard({ actor, input: external, idempotency_key: "invite-recover-1" })).outcome, "created");
});
