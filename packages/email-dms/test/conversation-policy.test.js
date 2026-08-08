import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  createConversationPolicyService,
  createConversationSyncRepository,
} from "../src/index.js";

const TENANT = "tenant-outm25";
const USER = "user-outm25";
const SUBJECT = "subject-outm25";
const CONNECTION = "m365-connection-outm25";
const MATTER = "matter-outm25";
const CONVERSATION = "conversation-outm25";
const THREAD = "thread-outm25";

function fixture(filePath, { dynamicSeed = false } = {}) {
  const repository = createConversationSyncRepository({ filePath });
  let matterAllowed = true;
  let connectionExpiresAt = "2027-08-08T00:00:00.000Z";
  const graphCalls = [];
  const service = createConversationPolicyService({
    repository,
    seed_filing_lookup: (input) => ({
      tenant_id: TENANT,
      matter_id: dynamicSeed ? input.matter_id : MATTER,
      email_thread_id: dynamicSeed ? input.seed_email_thread_id : THREAD,
      conversation_id: CONVERSATION,
      account_ref: CONNECTION,
      mailbox_ref: "mailbox-hash-outm25",
      status: "active",
      filing_receipt_ref: dynamicSeed ? input.seed_filing_receipt_ref : "receipt-outm25",
      filed_document_ids: ["document-original-mime-outm25"],
    }),
    connection_lookup: () => ({
      tenant_id: TENANT,
      m365_connection_id: CONNECTION,
      user_id: USER,
      entra_subject_id: SUBJECT,
      mailbox_address_hash: "a".repeat(64),
      granted_scopes: ["Mail.Read", "Calendars.ReadWrite", "offline_access"],
      expires_at: connectionExpiresAt,
      revoked_at: null,
      connection_authority: "delegated",
      mailbox_scope: "me",
    }),
    matter_access: () => matterAllowed,
    clock: () => new Date("2026-08-08T00:00:00.000Z"),
  });
  return {
    repository,
    service,
    graphCalls,
    denyMatter() { matterAllowed = false; },
    expireConnection() { connectionExpiresAt = "2026-08-07T23:59:59.000Z"; },
  };
}

function enableInput(overrides = {}) {
  return {
    tenant_id: TENANT,
    user_id: USER,
    entra_subject_id: SUBJECT,
    actor_id: USER,
    m365_connection_id: CONNECTION,
    matter_id: MATTER,
    conversation_id: CONVERSATION,
    seed_email_thread_id: THREAD,
    seed_filing_receipt_ref: "receipt-outm25",
    idempotency_key: "enable-outm25",
    expected_version: 0,
    ...overrides,
  };
}

function revokeInput(policy, overrides = {}) {
  return {
    tenant_id: TENANT,
    user_id: USER,
    entra_subject_id: SUBJECT,
    actor_id: USER,
    m365_connection_id: CONNECTION,
    matter_id: policy.matter_id,
    policy_id: policy.policy_id,
    reason: "user_disabled",
    expected_version: policy.version,
    idempotency_key: "revoke-outm25",
    ...overrides,
  };
}

test("OUTM-25 enables, replays, revokes, and re-enables one explicitly filed conversation", () => {
  // Given
  const filePath = join(mkdtempSync(join(tmpdir(), "outm25-policy-")), "state.json");
  const firstRuntime = fixture(filePath);

  // When
  const enabled = firstRuntime.service.enable(enableInput());
  const replay = firstRuntime.service.enable(enableInput());
  const revoked = firstRuntime.service.revoke(revokeInput(enabled.policy));
  const secondRuntime = fixture(filePath);
  const reenabled = secondRuntime.service.enable(enableInput({
    idempotency_key: "reenable-outm25",
    expected_version: 2,
  }));

  // Then
  assert.equal(enabled.outcome, "created");
  assert.equal(replay.outcome, "idempotent_replay");
  assert.equal(revoked.policy.status, "revoked");
  assert.equal(reenabled.policy.status, "active");
  assert.equal(reenabled.policy.version, 3);
  assert.equal(reenabled.policy.seed_email_thread_id, THREAD);
  assert.equal(reenabled.policy.seed_filing_receipt_ref, "receipt-outm25");
  assert.equal(reenabled.policy.enabling_actor_id, USER);
  assert.equal(secondRuntime.repository.snapshot().audit_events.length, 3);
  assert.equal(firstRuntime.graphCalls.length, 0);
});

test("OUTM-25 rejects unfiled, mismatched, conflicting, stale, and changed-idempotency requests", () => {
  // Given
  const runtime = fixture();
  const enabled = runtime.service.enable(enableInput());

  // When / Then
  assert.throws(
    () => runtime.service.enable(enableInput({ matter_id: "matter-other", idempotency_key: "other-matter" })),
    /seed filing does not match/u,
  );
  assert.throws(
    () => runtime.service.enable(enableInput({ conversation_id: "conversation-other", idempotency_key: "other-conversation" })),
    /seed filing does not match/u,
  );
  assert.throws(
    () => runtime.service.enable(enableInput({ idempotency_key: "enable-outm25", seed_filing_receipt_ref: "changed" })),
    /idempotency key conflicts/u,
  );
  assert.throws(
    () => runtime.service.revoke(revokeInput(enabled.policy, {
      reason: "stale",
      expected_version: 9,
      idempotency_key: "stale-revoke",
    })),
    /version conflict/u,
  );
  assert.equal(runtime.repository.snapshot().policies.length, 1);
});

test("OUTM-25 pauses an active policy when current Matter permission changes", () => {
  // Given
  const runtime = fixture();
  const enabled = runtime.service.enable(enableInput());
  runtime.denyMatter();

  // When
  const reconciled = runtime.service.reconcile({
    tenant_id: TENANT,
    user_id: USER,
    entra_subject_id: SUBJECT,
    m365_connection_id: CONNECTION,
    matter_id: MATTER,
    policy_id: enabled.policy.policy_id,
    actor_id: "conversation-policy-reconciler",
  });

  // Then
  assert.equal(reconciled.policy.status, "paused");
  assert.equal(reconciled.policy.pause_reason, "matter_access_changed");
  assert.equal(reconciled.policy.version, 2);
});

test("OUTM-25 pauses an active policy when its delegated connection expires", () => {
  const runtime = fixture();
  const enabled = runtime.service.enable(enableInput());
  runtime.expireConnection();
  const reconciled = runtime.service.reconcile({ tenant_id: TENANT, user_id: USER, entra_subject_id: SUBJECT, m365_connection_id: CONNECTION, matter_id: MATTER, policy_id: enabled.policy.policy_id, actor_id: "conversation-policy-reconciler" });
  assert.equal(reconciled.policy.status, "paused");
  assert.equal(reconciled.policy.pause_reason, "connection_invalid");
});

test("OUTM-25 requires revoke before moving one conversation to another Matter", () => {
  // Given
  const runtime = fixture(undefined, { dynamicSeed: true });
  const first = runtime.service.enable(enableInput());
  const movedInput = enableInput({
    matter_id: "matter-outm25-next",
    seed_email_thread_id: "thread-outm25-next",
    seed_filing_receipt_ref: "receipt-outm25-next",
    idempotency_key: "move-outm25",
  });

  // When / Then
  assert.throws(() => runtime.service.enable(movedInput), /revoke it first/u);
  runtime.service.revoke(revokeInput(first.policy, {
    reason: "matter_changed",
    idempotency_key: "revoke-before-move-outm25",
  }));
  const moved = runtime.service.enable(movedInput);
  assert.equal(moved.outcome, "created");
  assert.equal(moved.policy.matter_id, "matter-outm25-next");
  assert.equal(runtime.repository.snapshot().policies.filter(({ status }) => status === "active").length, 1);
});

test("OUTM-25 rejects a same-tenant intruder before revoke or policy reconciliation", () => {
  const runtime = fixture();
  const enabled = runtime.service.enable(enableInput());
  const intruder = {
    user_id: "user-same-tenant-intruder",
    entra_subject_id: "subject-same-tenant-intruder",
    actor_id: "user-same-tenant-intruder",
  };
  assert.throws(
    () => runtime.service.revoke(revokeInput(enabled.policy, { ...intruder, idempotency_key: "intruder-revoke" })),
    /owner authority/u,
  );
  assert.throws(
    () => runtime.service.reconcile({
      tenant_id: TENANT,
      ...intruder,
      m365_connection_id: CONNECTION,
      matter_id: MATTER,
      policy_id: enabled.policy.policy_id,
    }),
    /owner authority/u,
  );
  assert.equal(runtime.repository.snapshot().policies[0].status, "active");
});
