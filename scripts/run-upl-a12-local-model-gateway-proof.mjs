#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createDefaultHrxRuntime } from "../apps/api/src/server.js";
import { createHrxModelGatewayFromEnv } from "../packages/hrx/src/ai/model-provider-registry.js";

const ROOT = process.cwd();
const ARTIFACT_JSON = join(ROOT, "artifacts/manual-qa/upl-a12-local-model-gateway-proof.json");
const ARTIFACT_MD = join(ROOT, "artifacts/manual-qa/upl-a12-local-model-gateway-proof.md");
const DEFAULT_MODEL = "gemma4:12b";
const DEFAULT_OLLAMA_URL = "http://127.0.0.1:11434";

function stableHash(value) {
  const serialized = typeof value === "string" ? value : JSON.stringify(value ?? null);
  return createHash("sha256").update(serialized).digest("hex");
}

function requireHash(value, label) {
  if (!/^[a-f0-9]{64}$/.test(String(value ?? ""))) throw new Error(`${label} must be a sha256 hex hash`);
  return value;
}

async function assertOllamaModelAvailable({ endpoint, model }) {
  const response = await fetch(`${endpoint.replace(/\/+$/, "")}/api/tags`);
  const body = await response.json();
  if (!response.ok) throw new Error(`Ollama tags failed: ${response.status}`);
  const models = Array.isArray(body.models) ? body.models : [];
  const found = models.find((item) => item.name === model || item.model === model);
  if (!found) throw new Error(`Ollama model not installed: ${model}`);
  return Object.freeze({
    name: found.name ?? found.model,
    digest: found.digest ?? null,
    size: found.size ?? null,
    details: found.details ?? {},
    capabilities: found.capabilities ?? [],
  });
}

async function blockedFieldChecks(gateway) {
  const fields = ["employee_salary", "document_body", "client_secret"];
  const checks = [];
  for (const field of fields) {
    try {
      await gateway.complete({ question: "blocked field check", [field]: "raw-fixture-value-not-sent" });
      checks.push(Object.freeze({ field, passed: false, safe_error: null }));
    } catch (error) {
      checks.push(Object.freeze({ field, passed: /must not include/.test(error.message), safe_error: error.message }));
    }
  }
  return Object.freeze(checks);
}

const model = process.env.LAWOS_MODEL_GATEWAY_MODEL ?? process.env.LAWOS_OLLAMA_MODEL ?? DEFAULT_MODEL;
const endpoint = process.env.LAWOS_OLLAMA_URL ?? DEFAULT_OLLAMA_URL;
const modelManifest = await assertOllamaModelAvailable({ endpoint, model });
const env = {
  ...process.env,
  LAWOS_MODEL_GATEWAY_ENABLED: "1",
  LAWOS_MODEL_GATEWAY_PROVIDER: process.env.LAWOS_MODEL_GATEWAY_PROVIDER ?? "ollama",
  LAWOS_MODEL_GATEWAY_MODEL: model,
  LAWOS_OLLAMA_MODEL: model,
  LAWOS_OLLAMA_URL: endpoint,
  LAWOS_MODEL_GATEWAY_NUM_PREDICT: process.env.LAWOS_MODEL_GATEWAY_NUM_PREDICT ?? "160",
};
const modelGateway = createHrxModelGatewayFromEnv({ env });
const context = createDefaultHrxRuntime({ modelGateway });
const interactionId = `upl-a12-local-model-${stableHash(`${model}:${Date.now()}`).slice(0, 12)}`;
const actorContext = {
  tenant_id: "tenant-a",
  actor_id: "upl_a12_model_receipt_operator",
  actor_role: "people_ops",
  hrx_scopes: Object.freeze(["hrx.ai.assistant", "hrx.ai.review.read", "hrx.document.read"]),
};

const routeResult = await context.aiRoute.handle({
  method: "POST",
  context: actorContext,
  params: { action: "assistant" },
  body: {
    interaction_id: interactionId,
    question: "Summarize leave policy guidance for HR review.",
    decision_mode: "advisory",
    limit: 3,
  },
});

const modelReceipt = routeResult.body?.model_receipt;
const reviewItem = routeResult.body?.review_item;
const auditEvents = context.audit.list({ tenant_id: actorContext.tenant_id }).filter((event) => event.object_id === interactionId);
const auditEvent = auditEvents.at(-1);
const blockedFields = await blockedFieldChecks(modelGateway);
const checks = [
  { id: "ollama-model-installed", passed: modelManifest.name === model },
  { id: "route-used-real-model", passed: routeResult.status === 202 && modelReceipt?.external_call_made === true },
  { id: "model-request-hash-present", passed: /^[a-f0-9]{64}$/.test(modelReceipt?.request_hash ?? "") },
  { id: "model-response-hash-present", passed: /^[a-f0-9]{64}$/.test(modelReceipt?.response_hash ?? "") },
  { id: "review-queue-item-created", passed: reviewItem?.review_id === `review-${interactionId}` && reviewItem?.state === "pending_review" },
  { id: "audit-event-created", passed: typeof auditEvent?.event_id === "string" && auditEvent.event_id.length > 0 },
  { id: "audit-payload-policy-metadata-only", passed: auditEvent?.metadata?.payload_policy === "metadata_only" },
  { id: "blocked-raw-fields-rejected", passed: blockedFields.every((item) => item.passed) },
  { id: "artifact-omits-prompt-and-response-text", passed: true },
];

requireHash(modelReceipt?.request_hash, "model request_hash");
requireHash(modelReceipt?.response_hash, "model response_hash");
requireHash(auditEvent?.metadata?.prompt_hash, "audit prompt_hash");
requireHash(auditEvent?.metadata?.output_hash, "audit output_hash");

const artifact = {
  schema_version: "lawos.wave1.upl-a12.local-model-gateway-proof.v1",
  generated_at: new Date().toISOString(),
  row_ids: ["UPL-A-12", "UPL-D-16"],
  status: checks.every((check) => check.passed) ? "PASS" : "FAIL",
  strict_boundary: {
    approved_local_model_gateway: true,
    provider: modelReceipt.provider,
    model: modelReceipt.model,
    external_cloud_call: false,
    production_ready_claim: false,
    prompt_response_text_stored: false,
  },
  model_manifest: {
    name: modelManifest.name,
    digest: modelManifest.digest,
    size: modelManifest.size,
    parameter_size: modelManifest.details?.parameter_size ?? null,
    quantization_level: modelManifest.details?.quantization_level ?? null,
    context_length: modelManifest.details?.context_length ?? null,
  },
  provider_receipt: {
    provider: modelReceipt.provider,
    model: modelReceipt.model,
    endpoint_hash: modelReceipt.endpoint_hash,
    request_hash: modelReceipt.request_hash,
    response_hash: modelReceipt.response_hash,
    provider_request_id_hash: modelReceipt.provider_request_id_hash,
    external_call_made: modelReceipt.external_call_made,
  },
  route_receipt: {
    status: routeResult.status,
    outcome: routeResult.body?.outcome,
    answer_status: routeResult.body?.answer_status,
    source_refs: routeResult.body?.source_refs ?? [],
    allowed_source_refs: routeResult.body?.retrieval?.allowed_source_refs ?? [],
    denied_source_refs: routeResult.body?.retrieval?.denied_source_refs ?? [],
    context_payload_policy: routeResult.body?.retrieval?.context_payload_policy,
  },
  review_queue_receipt: {
    review_id: reviewItem?.review_id,
    interaction_id: reviewItem?.interaction_id,
    state: reviewItem?.state,
    risk_level: reviewItem?.risk_level,
    answer_status: reviewItem?.answer_status,
    source_refs: reviewItem?.source_refs ?? [],
  },
  audit_receipt: {
    event_id: auditEvent?.event_id,
    action: auditEvent?.action,
    object_id: auditEvent?.object_id,
    decision: auditEvent?.decision,
    prompt_hash: auditEvent?.metadata?.prompt_hash,
    output_hash: auditEvent?.metadata?.output_hash,
    output_status: auditEvent?.metadata?.output_status,
    citation_count: auditEvent?.metadata?.citation_count,
    payload_policy: auditEvent?.metadata?.payload_policy,
  },
  blocked_field_checks: blockedFields,
  checks,
};

const serialized = JSON.stringify(artifact, null, 2);
for (const forbidden of ["Summarize leave policy guidance", "raw-fixture-value-not-sent"]) {
  if (serialized.includes(forbidden)) throw new Error(`Artifact leaked forbidden fixture text: ${forbidden}`);
}

mkdirSync(dirname(ARTIFACT_JSON), { recursive: true });
writeFileSync(ARTIFACT_JSON, `${serialized}\n`);
writeFileSync(
  ARTIFACT_MD,
  [
    "# UPL-A-12 Local Model Gateway Proof",
    "",
    `Status: ${artifact.status}`,
    "",
    `- Provider: ${artifact.provider_receipt.provider}`,
    `- Model: ${artifact.provider_receipt.model}`,
    `- Request hash: ${artifact.provider_receipt.request_hash}`,
    `- Response hash: ${artifact.provider_receipt.response_hash}`,
    `- Review item: ${artifact.review_queue_receipt.review_id}`,
    `- Audit event: ${artifact.audit_receipt.event_id}`,
    `- Production ready claim: ${artifact.strict_boundary.production_ready_claim}`,
    "",
  ].join("\n"),
);

if (artifact.status !== "PASS") throw new Error(`UPL-A-12 local model gateway proof failed: ${ARTIFACT_JSON}`);
console.log(`UPL-A-12 local model gateway proof PASS -> ${ARTIFACT_JSON}`);
