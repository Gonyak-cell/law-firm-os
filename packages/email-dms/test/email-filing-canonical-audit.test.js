import assert from "node:assert/strict";
import test from "node:test";
import { createDmsRepository } from "../../dms/src/index.js";
import { hashDomainValue } from "../../persistence/src/domain-ledger.js";
import {
  canonicalFilingAudit,
  outlookEmailFilingAuditEvent,
} from "../src/email-filing-service.js";

const MIME_SHA256 = "a".repeat(64);
const THREAD = Object.freeze({
  tenant_id: "tenant-canonical-filing-audit",
  matter_id: "matter-canonical-filing-audit",
  email_thread_id: "thread-canonical-filing-audit",
  graph_message_id: "immutable-canonical-filing-audit",
  internet_message_id: "<canonical-filing-audit@example.test>",
  conversation_id: "conversation-canonical-filing-audit",
  filing_mode: "manual",
  filed_document_ids: Object.freeze([
    `doc:thread-canonical-filing-audit:original-mime:${MIME_SHA256}`,
  ]),
  filing_user: "actor-canonical-filing-audit",
  filing_time: "2026-08-07T00:00:01.000Z",
});

function redactedEvent(overrides = {}) {
  const raw = outlookEmailFilingAuditEvent(THREAD);
  return {
    tenant_id: raw.tenant_id,
    event_id: raw.event_id,
    action: raw.action,
    actor_id: raw.actor_id,
    object_type: raw.object_type,
    object_id: raw.object_id,
    payload: {
      imported_event_hash: hashDomainValue(raw),
      source_payload_included: false,
    },
    created_at: "2026-08-07T00:00:02.000Z",
    ...overrides,
  };
}

function repositoryWith(event) {
  const events = event ? [structuredClone(event)] : [];
  return {
    listAudit: () => structuredClone(events),
    snapshot: () => structuredClone(events),
  };
}

function verifyWithoutMutation(repository, thread = THREAD) {
  const before = JSON.stringify(repository.snapshot());
  const beforeCount = repository.listAudit().length;
  const result = canonicalFilingAudit(repository, thread);
  const after = JSON.stringify(repository.snapshot());
  assert.equal(after, before);
  assert.equal(Buffer.byteLength(after), Buffer.byteLength(before));
  assert.equal(repository.listAudit().length, beforeCount);
  return result;
}

test("canonical filing audit accepts the exact raw and redacted event hash without mutation", () => {
  const raw = outlookEmailFilingAuditEvent(THREAD);
  const rawRepository = createDmsRepository();
  rawRepository.appendAudit(raw);
  assert.deepEqual(Object.keys(rawRepository.listAudit()[0]).sort(), [
    "action", "actor_id", "decision", "event_id", "metadata", "object_id",
    "object_type", "occurred_at", "reason", "tenant_id",
  ]);
  assert.equal(Object.keys(raw.metadata).length, 12);
  assert.equal(verifyWithoutMutation(rawRepository)?.event_id, raw.event_id);

  const redactedRepository = createDmsRepository();
  const redacted = redactedEvent();
  redactedRepository.appendAudit(redacted);
  assert.deepEqual(Object.keys(redactedRepository.listAudit()[0]).sort(), [
    "action", "actor_id", "created_at", "event_id", "object_id", "object_type",
    "payload", "tenant_id",
  ]);
  assert.equal(redacted.payload.imported_event_hash, hashDomainValue(raw));
  assert.equal(
    verifyWithoutMutation(redactedRepository)?.payload.imported_event_hash,
    hashDomainValue(raw),
  );
});

test("canonical filing audit rejects noncanonical raw shape and authority flags without mutation", () => {
  const raw = outlookEmailFilingAuditEvent(THREAD);
  const { raw_provider_payload_included: _raw, ...missingRawFlag } = raw.metadata;
  const { credential_material_included: _credential, ...missingCredentialFlag } = raw.metadata;
  const cases = [
    ["wrong event", { ...raw, event_id: "outlook.email.file:foreign" }],
    ["wrong action", { ...raw, action: "dms.email.thread.foreign" }],
    ["wrong actor", { ...raw, actor_id: "actor-foreign" }],
    ["wrong object", { ...raw, object_id: "thread-foreign" }],
    ["wrong time", { ...raw, occurred_at: "2026-08-07T00:00:02.000Z" }],
    ["extra metadata", { ...raw, metadata: { ...raw.metadata, untrusted: true } }],
    ["raw provider flag true", { ...raw, metadata: { ...raw.metadata, raw_provider_payload_included: true } }],
    ["credential flag true", { ...raw, metadata: { ...raw.metadata, credential_material_included: true } }],
    ["raw provider flag missing", { ...raw, metadata: missingRawFlag }],
    ["credential flag missing", { ...raw, metadata: missingCredentialFlag }],
    ["extra top-level", { ...raw, untrusted: true }],
  ];
  for (const [name, event] of cases) {
    assert.equal(verifyWithoutMutation(repositoryWith(event)), null, name);
  }
});

test("canonical filing audit rejects noncanonical imported shape, hash, and tuple without mutation", () => {
  const tampered = redactedEvent({
    payload: {
      imported_event_hash: "b".repeat(64),
      source_payload_included: false,
    },
  });
  const foreign = redactedEvent({ actor_id: "actor-foreign" });
  const invalidCreatedAt = redactedEvent({ created_at: "not-a-timestamp" });
  const wrongEvent = redactedEvent({ event_id: "outlook.email.file:foreign" });
  const wrongAction = redactedEvent({ action: "dms.email.thread.foreign" });
  const wrongObject = redactedEvent({ object_id: "thread-foreign" });
  const extraPayload = redactedEvent({
    payload: {
      ...redactedEvent().payload,
      untrusted: true,
    },
  });
  const extraTopLevel = { ...redactedEvent(), production_ready_claim: false };
  const missingCreatedAt = redactedEvent();
  delete missingCreatedAt.created_at;
  const noncanonicalInstants = [
    0,
    "0",
    "01/01/2026",
    "2026-02-30T00:00:00.000Z",
    "2026-08-07T09:00:02.000+09:00",
    "2026-08-07T00:00:02Z",
    "2026-08-07T00:00:02.00Z",
    "2026-08-07 00:00:02.000Z",
  ].map((created_at) => redactedEvent({ created_at }));
  for (const event of [extraTopLevel, tampered, foreign, invalidCreatedAt,
    wrongEvent, wrongAction, wrongObject, extraPayload, missingCreatedAt,
    ...noncanonicalInstants]) {
    assert.equal(verifyWithoutMutation(repositoryWith(event)), null);
  }

  const missing = createDmsRepository();
  assert.equal(verifyWithoutMutation(missing), null);

  const tupleDrift = createDmsRepository();
  tupleDrift.appendAudit(redactedEvent());
  assert.equal(verifyWithoutMutation(tupleDrift, {
    ...THREAD,
    matter_id: "matter-foreign",
  }), null);
});
