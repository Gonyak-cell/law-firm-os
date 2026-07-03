import assert from "node:assert/strict";
import test from "node:test";
import { createHrxAiSourceRegistry } from "../src/ai/source-registry.js";
import { createHrxPermissionAwareRetriever } from "../src/ai/rag.js";
import { createInMemoryHrxAiSourceChunkIndex, ingestHrxAiSourceChunks } from "../src/ai/source-ingestion.js";

function authzPort() {
  return {
    async evaluate(request) {
      if (request.resource.source_ref === "HRDoc:emp-001:salary") {
        return { effect: "deny", reason: "hrx_compensation_scope_required" };
      }
      return { effect: "allow", reason: "test_allow" };
    },
  };
}

test("permission-aware RAG excludes denied sources before prompt construction", async () => {
  const registry = createHrxAiSourceRegistry([
    {
      tenant_id: "tenant-a",
      source_ref: "Policy:pay:2026",
      source_type: "policy_document",
      title: "Pay policy metadata",
      tags: ["pay"],
    },
    {
      tenant_id: "tenant-a",
      source_ref: "HRDoc:emp-001:salary",
      source_type: "hr_document",
      title: "Pay record metadata",
      tags: ["pay"],
      sensitivity: "compensation",
    },
  ]);
  const retriever = createHrxPermissionAwareRetriever({ registry, authz: authzPort() });

  const result = await retriever.retrieve(
    { tenant_id: "tenant-a", actor_id: "manager-001", actor_role: "hr_manager" },
    { query: "pay", limit: 5 },
  );

  assert.deepEqual(result.allowed_sources.map((source) => source.source_ref), ["Policy:pay:2026"]);
  assert.deepEqual(result.denied_source_refs, ["HRDoc:emp-001:salary"]);
  assert.deepEqual(result.prompt_context.source_refs, ["Policy:pay:2026"]);
  assert.equal(JSON.stringify(result.prompt_context).includes("HRDoc:emp-001:salary"), false);
  assert.equal(result.prompt_context.context_payload_policy, "metadata_only");
});

test("permission-aware RAG requires registry and authz ports", () => {
  assert.throws(() => createHrxPermissionAwareRetriever({}), /source registry port/);
  assert.throws(
    () => createHrxPermissionAwareRetriever({ registry: { search: () => [] }, authz: {} }),
    /authz port missing evaluate/,
  );
});

test("permission-aware RAG retrieves policy sources from indexed body terms only within actor scopes", async () => {
  const registry = createHrxAiSourceRegistry([
    {
      tenant_id: "tenant-a",
      source_ref: "Policy:employment-rules:2026",
      source_type: "policy_document",
      title: "취업규칙",
      tags: ["policy"],
    },
    {
      tenant_id: "tenant-a",
      source_ref: "HRDoc:emp-001:salary",
      source_type: "hr_document",
      title: "Compensation source metadata",
      tags: ["policy"],
      sensitivity: "compensation",
    },
  ]);
  const chunkIndex = createInMemoryHrxAiSourceChunkIndex([
    ...ingestHrxAiSourceChunks({
      tenant_id: "tenant-a",
      source_ref: "Policy:employment-rules:2026",
      source_type: "policy_document",
      chunks: [{ chunk_id: "rules-001", text: "취업규칙은 초과근로와 법정교육 기준을 포함한다." }],
    }),
    ...ingestHrxAiSourceChunks({
      tenant_id: "tenant-a",
      source_ref: "HRDoc:emp-001:salary",
      source_type: "hr_document",
      chunks: [{ chunk_id: "salary-001", text: "compensation review notes" }],
    }),
  ]);
  const retriever = createHrxPermissionAwareRetriever({
    registry,
    chunkIndex,
    authz: {
      async evaluate(request) {
        return request.actor_scopes.includes("hrx.document.read") && request.resource.sensitivity !== "compensation"
          ? { effect: "allow", reason: "scope_allow" }
          : { effect: "deny", reason: "scope_deny" };
      },
    },
  });

  const result = await retriever.retrieve(
    { tenant_id: "tenant-a", actor_id: "manager-001", actor_role: "people_ops", hrx_scopes: ["hrx.document.read"] },
    { query: "초과근로 법정교육 compensation", limit: 5 },
  );

  assert.deepEqual(result.allowed_sources.map((source) => source.source_ref), ["Policy:employment-rules:2026"]);
  assert.deepEqual(result.denied_source_refs, ["HRDoc:emp-001:salary"]);
  assert.equal(result.prompt_context.context_payload_policy, "metadata_only");
  assert.equal(result.prompt_context.matched_chunks.length, 1);
  assert.deepEqual(result.prompt_context.matched_chunks[0].matched_terms, ["초과근로", "법정교육"]);
  assert.equal(JSON.stringify(result.prompt_context).includes("compensation review notes"), false);
  assert.equal(JSON.stringify(result.prompt_context).includes("HRDoc:emp-001:salary"), false);
});
