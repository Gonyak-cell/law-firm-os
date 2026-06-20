import assert from "node:assert/strict";
import test from "node:test";
import { createHrxAuditEventStore } from "../../audit/src/hrx-event-store.js";
import { appendHrxAiAuditEvent, createHrxAiAuditEvent, createHrxAiAuditMetadata } from "../src/ai/audit.js";

test("AI audit metadata stores prompt, retrieval, and output metadata without sensitive payload", () => {
  const metadata = createHrxAiAuditMetadata({
    prompt: "Sensitive salary prompt for employee emp-001",
    retrieval: {
      allowed_sources: [{ source_ref: "Policy:pay:2026" }],
      denied_source_refs: ["HRDoc:emp-001:salary"],
    },
    output: {
      status: "answered",
      answer: "Sensitive salary answer",
      citations: [{ source_ref: "Policy:pay:2026" }],
    },
  });

  assert.equal(metadata.prompt_length, "Sensitive salary prompt for employee emp-001".length);
  assert.deepEqual(metadata.retrieval_source_refs, ["Policy:pay:2026"]);
  assert.equal(metadata.retrieval_denied_count, 1);
  assert.equal(metadata.citation_count, 1);
  assert.equal(JSON.stringify(metadata).includes("Sensitive salary prompt"), false);
  assert.equal(JSON.stringify(metadata).includes("Sensitive salary answer"), false);
});

test("AI audit event appends through HRX audit store with metadata-only payload", async () => {
  const store = createHrxAuditEventStore();
  const event = await appendHrxAiAuditEvent({
    audit: store,
    context: { tenant_id: "tenant-a", actor_id: "hr-001" },
    interaction_id: "ai-interaction-001",
    prompt: "Raw prompt must not be stored",
    retrieval: { prompt_context: { source_refs: ["Policy:leave:2026"] } },
    output: { status: "blocked", citations: [] },
  });

  assert.equal(event.object_type, "HrxAiInteraction");
  assert.equal(event.decision, "deny");
  assert.equal(event.metadata.payload_policy, "metadata_only");
  assert.equal(JSON.stringify(event).includes("Raw prompt must not be stored"), false);

  const [stored] = store.list({ tenant_id: "tenant-a", object_id: "ai-interaction-001" });
  assert.equal(stored.source, "hrx-ai");
  assert.deepEqual(stored.metadata.retrieval_source_refs, ["Policy:leave:2026"]);
});

test("AI audit event requires tenant and actor context", () => {
  assert.throws(() => createHrxAiAuditEvent({ context: { tenant_id: "tenant-a" } }), /actor_id is required/);
});
