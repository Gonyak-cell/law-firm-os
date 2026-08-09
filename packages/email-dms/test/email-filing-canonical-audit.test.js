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

function verifyWithoutMutation(repository, thread = THREAD) {
  const before = JSON.stringify(repository.snapshot());
  const result = canonicalFilingAudit(repository, thread);
  assert.equal(JSON.stringify(repository.snapshot()), before);
  return result;
}

test("canonical filing audit accepts the exact raw and redacted event hash without mutation", () => {
  const raw = outlookEmailFilingAuditEvent(THREAD);
  const rawRepository = createDmsRepository();
  rawRepository.appendAudit(raw);
  assert.equal(verifyWithoutMutation(rawRepository)?.event_id, raw.event_id);

  const redactedRepository = createDmsRepository();
  const redacted = redactedEvent();
  redactedRepository.appendAudit(redacted);
  assert.equal(redacted.payload.imported_event_hash, hashDomainValue(raw));
  assert.equal(
    verifyWithoutMutation(redactedRepository)?.payload.imported_event_hash,
    hashDomainValue(raw),
  );
});

test("canonical filing audit rejects tampered, foreign, missing, and tuple-drift receipts without mutation", () => {
  const tampered = redactedEvent({
    payload: {
      imported_event_hash: "b".repeat(64),
      source_payload_included: false,
    },
  });
  const foreign = redactedEvent({ actor_id: "actor-foreign" });
  const invalidCreatedAt = redactedEvent({ created_at: "not-a-timestamp" });
  const extraPayload = redactedEvent({
    payload: {
      ...redactedEvent().payload,
      untrusted: true,
    },
  });
  for (const event of [tampered, foreign, invalidCreatedAt, extraPayload]) {
    const repository = createDmsRepository();
    repository.appendAudit(event);
    assert.equal(verifyWithoutMutation(repository), null);
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
