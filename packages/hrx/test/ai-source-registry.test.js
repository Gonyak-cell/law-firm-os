import assert from "node:assert/strict";
import test from "node:test";
import { createHrxAiSourceRecord, createHrxAiSourceRegistry } from "../src/ai/source-registry.js";

test("AI source registry indexes policy, HR document, and case records by source_ref only", () => {
  const registry = createHrxAiSourceRegistry([
    {
      tenant_id: "tenant-a",
      source_ref: "Policy:leave:2026",
      source_type: "policy_document",
      title: "Leave policy",
      tags: ["leave", "policy"],
    },
    {
      tenant_id: "tenant-a",
      source_ref: "HRDoc:emp-001:contract",
      source_type: "hr_document",
      title: "Employment contract metadata",
      tags: ["contract"],
    },
    {
      tenant_id: "tenant-a",
      source_ref: "Case:emp-001:leave",
      source_type: "case_record",
      title: "Leave accommodation case metadata",
      tags: ["leave"],
    },
  ]);

  const leaveSources = registry.search({ tenant_id: "tenant-a", query: "leave" });
  assert.deepEqual(
    leaveSources.map((source) => source.source_ref),
    ["Policy:leave:2026", "Case:emp-001:leave"],
  );
  assert.equal(leaveSources[0].source_key, "Policy:leave:2026");
  assert.equal(leaveSources[0].indexed_by, "source_ref");
  assert.equal(leaveSources[0].raw_payload_present, false);
  assert.equal(leaveSources[1].sensitivity, "employee");
});

test("AI source registry rejects raw payloads and alternate ids", () => {
  const base = {
    tenant_id: "tenant-a",
    source_ref: "HRDoc:emp-001:review",
    source_type: "hr_document",
  };

  assert.throws(() => createHrxAiSourceRecord({ ...base, document_body: "review body" }), /must not include document_body/);
  assert.throws(() => createHrxAiSourceRecord({ ...base, document_id: "doc-001" }), /must not include document_id/);
  assert.throws(() => createHrxAiSourceRecord({ ...base, source_id: "doc-001" }), /must not include source_id/);
});
