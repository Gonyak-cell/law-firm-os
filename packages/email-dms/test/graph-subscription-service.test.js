import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  GRAPH_MESSAGE_RESOURCES,
} from "../src/index.js";
import { createConversationPolicyService } from "../src/conversation-policy-service.js";
import { createConversationSyncRepository } from "../src/conversation-sync-repository.js";
import { createGraphSubscriptionService } from "../src/graph-subscription-service.js";

const TENANT = "tenant-outm26";
const USER = "user-outm26";
const SUBJECT = "subject-outm26";
const CONNECTION = "m365-connection-outm26";

function fixture({ filePath, activePolicy = true, providerPrefix = "provider-outm26", failCreates = false } = {}) {
  const repository = createConversationSyncRepository({ filePath });
  let now = new Date("2026-08-08T00:00:00.000Z");
  let revokedAt = null;
  let providerSequence = 0;
  const calls = [];
  const remote = [];
  const provider = {
    async listOwnMessageSubscriptions() {
      calls.push({ operation: "list" });
      return structuredClone(remote);
    },
    async createOwnMessageSubscription(input) {
      calls.push({ operation: "create", input: structuredClone(input) });
      if (failCreates) throw Object.assign(new Error("provider unavailable"), { safe_error_code: "GRAPH_UPSTREAM_UNAVAILABLE" });
      providerSequence += 1;
      const result = {
        provider_subscription_id: `${providerPrefix}-${providerSequence}`,
        resource: input.resource,
        change_type: "created",
        client_state_hash: input.client_state_hash,
        expires_at: new Date(now.getTime() + 60 * 60 * 1000).toISOString(),
      };
      remote.push(result);
      return result;
    },
    async renewOwnMessageSubscription(input) {
      calls.push({ operation: "renew", input: structuredClone(input) });
      const found = remote.find(({ provider_subscription_id: id }) => id === input.provider_subscription_id);
      found.expires_at = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
      return structuredClone(found);
    },
    async deleteOwnMessageSubscription(input) {
      calls.push({ operation: "delete", input: structuredClone(input) });
      const index = remote.findIndex(({ provider_subscription_id: id }) => id === input.provider_subscription_id);
      if (index >= 0) remote.splice(index, 1);
      return { deleted: true };
    },
  };
  if (activePolicy) {
    const policy = createConversationPolicyService({
      repository,
      clock: () => now,
      seed_filing_lookup: () => ({
        tenant_id: TENANT,
        matter_id: "matter-outm26",
        email_thread_id: "thread-outm26",
        conversation_id: "conversation-outm26",
        account_ref: CONNECTION,
        mailbox_ref: "mailbox-outm26",
        status: "active",
        filing_receipt_ref: "receipt-outm26",
        filed_document_ids: ["document-outm26"],
      }),
      connection_lookup: () => ({
        tenant_id: TENANT,
        user_id: USER,
        entra_subject_id: SUBJECT,
        m365_connection_id: CONNECTION,
        mailbox_address_hash: "a".repeat(64),
        granted_scopes: ["Mail.Read"],
        expires_at: "2027-08-08T00:00:00.000Z",
        connection_authority: "delegated",
        mailbox_scope: "me",
      }),
      matter_access: () => true,
    });
    policy.enable({
      tenant_id: TENANT,
      user_id: USER,
      entra_subject_id: SUBJECT,
      actor_id: USER,
      m365_connection_id: CONNECTION,
      mailbox_address_hash: "a".repeat(64),
      matter_id: "matter-outm26",
      conversation_id: "conversation-outm26",
      seed_email_thread_id: "thread-outm26",
      seed_filing_receipt_ref: "receipt-outm26",
      idempotency_key: "enable-outm26",
      expected_version: 0,
    });
  }
  const service = createGraphSubscriptionService({
    repository,
    provider,
    connection_lookup: () => ({
      tenant_id: TENANT,
      user_id: USER,
      entra_subject_id: SUBJECT,
      m365_connection_id: CONNECTION,
      mailbox_address_hash: "a".repeat(64),
      granted_scopes: ["Mail.Read"],
      expires_at: "2027-08-08T00:00:00.000Z",
      connection_authority: "delegated",
      mailbox_scope: "me",
      revoked_at: revokedAt,
    }),
    clock: () => now,
    client_state_factory: () => `client-state-outm26-${++providerSequence}`,
    expiration_factory: () => new Date(now.getTime() + 47 * 60 * 1000).toISOString(),
  });
  return {
    calls,
    remote,
    repository,
    service,
    advance(milliseconds) { now = new Date(now.getTime() + milliseconds); },
    revokeConnection() { revokedAt = now.toISOString(); },
  };
}

function input() {
  return {
    tenant_id: TENANT,
    user_id: USER,
    entra_subject_id: SUBJECT,
    entra_tenant_id: "entra-tenant-outm26",
    actor_id: "graph-subscription-reconciler",
    m365_connection_id: CONNECTION,
  };
}

test("OUTM-26 creates only the Inbox and Sent Items me subscriptions after explicit policy enablement", async () => {
  // Given
  const disabled = fixture({ activePolicy: false });

  // When
  const disabledResult = await disabled.service.reconcile(input());
  const enabled = fixture();
  const enabledResult = await enabled.service.reconcile(input());

  // Then
  assert.equal(disabledResult.outcome, "disabled_without_active_policy");
  assert.equal(disabled.calls.length, 0);
  assert.deepEqual(enabledResult.subscriptions.map(({ resource }) => resource).sort(), [...GRAPH_MESSAGE_RESOURCES].sort());
  const createCalls = enabled.calls.filter(({ operation }) => operation === "create");
  assert.equal(createCalls.length, 2);
  assert.ok(createCalls.every(({ input: request }) => request.mailbox_scope === "me" && request.change_type === "created"));
  assert.ok(createCalls.every(({ input: request }) => request.expiration_datetime === "2026-08-08T00:47:00.000Z"));
  assert.ok(createCalls.every(({ input: request }) => !Object.hasOwn(request, "include_resource_data")));
  const serialized = JSON.stringify(enabled.repository.snapshot());
  assert.equal(serialized.includes("client-state-outm26"), false);
  assert.match(enabled.repository.snapshot().subscriptions[0].client_state_hash, /^[a-f0-9]{64}$/u);
});

test("OUTM-26 survives restart and renewal without deleting an unknown same-callback subscription", async () => {
  // Given
  const filePath = join(mkdtempSync(join(tmpdir(), "outm26-subscription-")), "state.json");
  const first = fixture({ filePath, providerPrefix: "provider-first-outm26" });
  await first.service.reconcile(input());
  const originalIds = first.repository.snapshot().subscriptions.map(({ provider_subscription_id: id }) => id);
  const restarted = fixture({ filePath, activePolicy: false, providerPrefix: "provider-restart-outm26" });
  restarted.remote.push(...first.remote);

  // When
  restarted.advance(55 * 60 * 1000);
  const renewed = await restarted.service.reconcile(input());
  restarted.remote.splice(0);
  const recovered = await restarted.service.reconcile(input());
  restarted.remote.push({
    provider_subscription_id: "provider-orphan-outm26",
    resource: GRAPH_MESSAGE_RESOURCES[0],
    change_type: "created",
    client_state_hash: "f".repeat(64),
    expires_at: "2026-08-08T02:00:00.000Z",
  });
  await restarted.service.reconcile(input());

  // Then
  assert.deepEqual(renewed.subscriptions.map(({ provider_subscription_id: id }) => id), originalIds);
  assert.equal(restarted.calls.filter(({ operation }) => operation === "renew").length, 2);
  assert.ok(recovered.subscriptions.every(({ provider_subscription_id: id }) => !originalIds.includes(id)));
  assert.equal(restarted.calls.filter(({ operation }) => operation === "create").length, 2);
  assert.equal(restarted.calls.some(({ operation, input: request }) => operation === "delete" && request.provider_subscription_id === "provider-orphan-outm26"), false);
  assert.equal(restarted.remote.some(({ provider_subscription_id: id }) => id === "provider-orphan-outm26"), true);
  assert.equal(restarted.repository.snapshot().subscriptions.length, 2);
});

test("OUTM-26 revokes the provider pair when the final active policy is gone", async () => {
  // Given
  const runtime = fixture();
  await runtime.service.reconcile(input());
  runtime.repository.transaction((state) => {
    state.policies[0].status = "revoked";
  });

  // When
  const result = await runtime.service.reconcile(input());

  // Then
  assert.equal(result.outcome, "revoked_without_active_policy");
  assert.equal(runtime.calls.filter(({ operation }) => operation === "delete").length, 2);
  assert.ok(runtime.repository.snapshot().subscriptions.every(({ status }) => status === "revoked"));
  assert.equal(runtime.repository.snapshot().audit_events.filter(({ event_type: type }) => type === "graph_subscription.revoked").length, 2);
});

test("OUTM-26 concurrent reconcilers acquire one provider create lease per shared folder", async () => {
  // Given
  const runtime = fixture();

  // When
  await Promise.all([runtime.service.reconcile(input()), runtime.service.reconcile(input())]);

  // Then
  assert.equal(runtime.calls.filter(({ operation }) => operation === "create").length, 2);
  assert.equal(runtime.repository.snapshot().subscriptions.length, 2);
  assert.ok(runtime.repository.snapshot().subscriptions.every(({ status }) => status === "active"));
});

test("OUTM-26 revokes the shared provider pair when its Microsoft connection is revoked", async () => {
  // Given
  const runtime = fixture();
  await runtime.service.reconcile(input());
  runtime.revokeConnection();

  // When
  const result = await runtime.service.reconcile(input());

  // Then
  assert.equal(result.outcome, "revoked_connection");
  assert.equal(runtime.calls.filter(({ operation }) => operation === "delete").length, 2);
  assert.ok(runtime.repository.snapshot().subscriptions.every(({ status }) => status === "revoked"));
});

test("OUTM-26 records a bounded retry and safe audit when provider creation fails", async () => {
  const runtime = fixture({ failCreates: true });
  await assert.rejects(runtime.service.reconcile(input()), /provider unavailable/u);
  const snapshot = runtime.repository.snapshot();
  assert.equal(snapshot.subscriptions[0].status, "pending");
  assert.equal(snapshot.subscriptions[0].attempt_count, 1);
  assert.equal(snapshot.subscriptions[0].last_error_code, "GRAPH_UPSTREAM_UNAVAILABLE");
  assert.equal(snapshot.audit_events.at(-1).event_type, "graph_subscription.retry_scheduled");
  assert.equal(JSON.stringify(snapshot).includes("provider unavailable"), false);
});
