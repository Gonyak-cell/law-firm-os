import assert from "node:assert/strict";
import test from "node:test";
import { createHrxModelGateway } from "../src/ai/model-gateway.js";
import {
  buildHrxModelPrompt,
  createHrxModelGatewayFromEnv,
  createOllamaHrxModelProvider,
  resolveHrxModelGatewayConfig,
} from "../src/ai/model-provider-registry.js";

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

test("HRX model provider registry keeps gateway disabled until explicitly enabled", async () => {
  const config = resolveHrxModelGatewayConfig({});
  assert.equal(config.enabled, false);
  assert.equal(config.provider, "ollama");
  assert.equal(config.model, "gemma4:12b");

  const gateway = createHrxModelGatewayFromEnv({ env: {} });
  const result = await gateway.complete({ question: "Summarize policy" });
  assert.equal(result.status, "blocked");
  assert.equal(result.external_call_made, false);
});

test("Ollama HRX provider is model-switchable and stores only hashes as receipt metadata", async () => {
  let requestBody;
  const fetchImpl = async (url, init) => {
    requestBody = JSON.parse(init.body);
    assert.equal(url, "http://127.0.0.1:11434/api/generate");
    return new Response(JSON.stringify({
      model: requestBody.model,
      response: "연차 정책은 승인된 출처에 근거해 검토해야 합니다.",
      done: true,
      done_reason: "stop",
      prompt_eval_count: 42,
      eval_count: 17,
      total_duration: 1000,
    }), { status: 200, headers: { "content-type": "application/json" } });
  };
  const provider = createOllamaHrxModelProvider({
    model: "custom-local-model:latest",
    fetchImpl,
    num_predict: 48,
  });
  const result = await provider.complete({
    model: "custom-local-model:latest",
    question: "연차 정책 요약",
    prompt_context: {
      source_refs: ["Policy:leave:2026"],
      context_payload_policy: "metadata_only",
      matched_chunks: [{ matched_terms: ["연차", "정책"] }],
    },
  });

  assert.equal(requestBody.model, "custom-local-model:latest");
  assert.equal(requestBody.stream, false);
  assert.equal(requestBody.think, false);
  assert.equal(requestBody.options.num_predict, 48);
  assert.equal(result.output, "연차 정책은 승인된 출처에 근거해 검토해야 합니다.");
  assert.equal(result.provider_metadata.provider, "ollama");
  assert.equal(result.provider_metadata.model, "custom-local-model:latest");
  assert.match(result.provider_metadata.request_hash, /^[a-f0-9]{64}$/);
  assert.match(result.provider_metadata.response_hash, /^[a-f0-9]{64}$/);
  assert.equal(JSON.stringify(result.provider_metadata).includes("연차 정책은"), false);
});

test("HRX model prompt is metadata-only", () => {
  const prompt = buildHrxModelPrompt({
    question: "연차 정책 요약",
    prompt_context: {
      source_refs: ["Policy:leave:2026"],
      context_payload_policy: "metadata_only",
      matched_chunks: [{ matched_terms: ["연차"] }],
    },
  });
  assert.match(prompt, /Payload policy: metadata_only/);
  assert.match(prompt, /Source refs: Policy:leave:2026/);
  assert.equal(prompt.includes("document_body"), false);
  assert.equal(prompt.includes("employee_salary"), false);
});
