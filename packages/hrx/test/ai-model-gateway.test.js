import assert from "node:assert/strict";
import test from "node:test";
import { createHrxModelGateway } from "../src/ai/model-gateway.js";

test("HRX model gateway blocks external calls unless explicitly configured", async () => {
  let called = false;
  const gateway = createHrxModelGateway({
    provider: {
      async complete() {
        called = true;
        return { output: "should not run" };
      },
    },
  });
  const result = await gateway.complete({ question: "Summarize policy" });
  assert.equal(result.status, "blocked");
  assert.equal(result.external_call_made, false);
  assert.equal(called, false);
});

test("HRX model gateway passes metadata prompt context only when enabled", async () => {
  const gateway = createHrxModelGateway({
    enabled: true,
    model: "synthetic-test-model",
    provider: {
      async complete(request) {
        return { output: `sources:${request.prompt_context.source_refs.length}` };
      },
    },
  });
  const result = await gateway.complete({
    question: "Summarize policy",
    prompt_context: { source_refs: ["Policy:leave:2026"], context_payload_policy: "metadata_only" },
  });
  assert.equal(result.status, "completed");
  assert.equal(result.external_call_made, true);
  assert.equal(result.output, "sources:1");
  await assert.rejects(() => gateway.complete({ document_body: "raw" }), /must not include document_body/);
});
