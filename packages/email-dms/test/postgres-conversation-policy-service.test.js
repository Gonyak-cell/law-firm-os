import assert from "node:assert/strict";
import test from "node:test";

import { createMigratedPostgresFixture } from "../../persistence/test/helpers/disposable-postgres.js";
import { listEmailDmsPostgresMigrations } from "../src/migrations/index.js";
import { createPostgresConversationPolicyService } from "../src/postgres-conversation-policy-service.js";

const TENANT = "tenant-outm25-policy";

function enableInput(overrides = {}) {
  return {
    tenant_id: TENANT,
    user_id: "user-owner",
    entra_subject_id: "subject-owner",
    actor_id: "user-owner",
    m365_connection_id: "connection-owner",
    mailbox_ref: "a".repeat(64),
    matter_id: "matter-owner",
    conversation_id: "conversation-owner",
    seed_email_thread_id: "thread-owner",
    seed_filing_receipt_ref: "receipt-owner",
    expected_version: 0,
    idempotency_key: "enable-owner",
    ...overrides,
  };
}

async function runtime(t) {
  const fixture = await createMigratedPostgresFixture(t, { appPoolMax: 4 });
  if (!fixture) return null;
  const migrations = listEmailDmsPostgresMigrations();
  await fixture.adminPool.query(migrations[0].sql);
  await fixture.adminPool.query(migrations[2].sql);
  return { fixture, service: createPostgresConversationPolicyService({
    pool: fixture.appPool,
    tenant_id: TENANT,
    clock: () => new Date("2026-08-08T00:00:00.000Z"),
  }) };
}

test("OUTM-25 PostgreSQL policy mutation requires live authority and binds revoke to the owner", async (t) => {
  const value = await runtime(t);
  if (!value) return;
  const { service } = value;
  await assert.rejects(service.enable(enableInput()), /authority callback/u);
  const allow = async ({ operation }) => operation === "enable" || operation === "revoke";
  const created = await service.enable(enableInput(), { authorize: allow });
  assert.equal(created.outcome, "created");
  assert.equal(created.policy.version, 1);
  assert.equal((await service.enable(enableInput(), { authorize: allow })).outcome, "idempotent_replay");

  await assert.rejects(service.revoke({
    tenant_id: TENANT,
    policy_id: created.policy.policy_id,
    user_id: "same-tenant-intruder",
    entra_subject_id: "subject-intruder",
    actor_id: "same-tenant-intruder",
    m365_connection_id: "connection-owner",
    matter_id: "matter-owner",
    expected_version: 1,
    reason: "intruder",
    idempotency_key: "revoke-intruder",
  }, { authorize: allow }), /owner authority/u);

  const revoked = await service.revoke({
    tenant_id: TENANT,
    policy_id: created.policy.policy_id,
    user_id: "user-owner",
    entra_subject_id: "subject-owner",
    actor_id: "user-owner",
    m365_connection_id: "connection-owner",
    matter_id: "matter-owner",
    expected_version: 1,
    reason: "disabled_by_owner",
    idempotency_key: "revoke-owner",
  }, { authorize: allow });
  assert.equal(revoked.policy.status, "revoked");
  assert.equal(revoked.policy.version, 2);
});

test("OUTM-28 service pause records the service actor and is version-bound", async (t) => {
  const value = await runtime(t);
  if (!value) return;
  const { service } = value;
  const created = await service.enable(enableInput(), { authorize: async () => true });
  const paused = await service.pause({
    tenant_id: TENANT,
    policy_id: created.policy.policy_id,
    expected_version: 1,
    reason: "matter_access_changed",
    actor_id: "outlook-conversation-sync-service",
  });
  assert.equal(paused.policy.status, "paused");
  assert.equal(paused.policy.pause_reason, "matter_access_changed");
  await assert.rejects(service.pause({
    tenant_id: TENANT,
    policy_id: created.policy.policy_id,
    expected_version: 1,
    reason: "again",
    actor_id: "outlook-conversation-sync-service",
  }), /version conflict/u);
});
