import { randomUUID } from "node:crypto";
import { appendHrxAiAuditEvent } from "../../../../../packages/hrx/src/ai/audit.js";
import { createHrxAiAnswer, createHrxInsufficientSourcesAnswer, groundHrxAiAnswer } from "../../../../../packages/hrx/src/ai/answer-schema.js";
import { enforceHrxNoFinalDecisionGuard } from "../../../../../packages/hrx/src/ai/decision-guard.js";
import { createHrxModelGateway } from "../../../../../packages/hrx/src/ai/model-gateway.js";
import { routeHrxAiAnswerToReview } from "../../../../../packages/hrx/src/ai/review-queue.js";

function response(status, body) {
  return Object.freeze({ status, body: Object.freeze(body) });
}

function citationFor(source) {
  return Object.freeze({ source_ref: source.source_ref, label: source.title ?? source.source_ref });
}

function localGroundedAnswer(question, retrieval) {
  const sourceLabels = retrieval.allowed_sources.map((source) => source.title ?? source.source_ref).join(", ");
  const matchedTerms = [
    ...new Set((retrieval.prompt_context?.matched_chunks ?? []).flatMap((chunk) => chunk.matched_terms ?? [])),
  ];
  const basis = matchedTerms.length > 0
    ? `${sourceLabels}에서 ${matchedTerms.slice(0, 4).join(", ")} 항목을 확인했습니다.`
    : `${sourceLabels}에서 조회 가능한 근거를 확인했습니다.`;
  return `${basis} 최종 인사 판단은 담당자가 검토합니다.`;
}

function safeModelReceipt(gatewayResult = {}) {
  if (gatewayResult.external_call_made !== true) return null;
  const metadata = gatewayResult.provider_metadata ?? {};
  return Object.freeze({
    provider: metadata.provider ?? null,
    model: metadata.model ?? gatewayResult.model ?? null,
    request_hash: metadata.request_hash ?? null,
    response_hash: metadata.response_hash ?? null,
    endpoint_hash: metadata.endpoint_hash ?? null,
    provider_request_id_hash: metadata.provider_request_id_hash ?? null,
    external_call_made: true,
  });
}

async function advisoryAnswer(question, retrieval, gateway) {
  if (retrieval.allowed_sources.length === 0) {
    return Object.freeze({ answer: createHrxInsufficientSourcesAnswer(), model_receipt: null });
  }
  const gatewayResult = await gateway.complete({ question, prompt_context: retrieval.prompt_context });
  const gatewayOutput = gatewayResult.status === "completed" && typeof gatewayResult.output === "string" && gatewayResult.output.trim()
    ? gatewayResult.output.trim()
    : localGroundedAnswer(question, retrieval);
  const answer = groundHrxAiAnswer({
    status: gatewayResult.external_call_made === true ? "review_required" : "answered",
    answer: gatewayOutput,
    citations: retrieval.allowed_sources.map(citationFor),
    allowed_sources: retrieval.allowed_sources,
  });
  return Object.freeze({ answer, model_receipt: safeModelReceipt(gatewayResult) });
}

export function createHrxAiRoute({ retriever, reviewQueue, audit, modelGateway = createHrxModelGateway() } = {}) {
  if (!retriever || typeof retriever.retrieve !== "function") throw new TypeError("HRX AI route requires retriever port");
  if (!reviewQueue || typeof reviewQueue.enqueue !== "function" || typeof reviewQueue.list !== "function") {
    throw new TypeError("HRX AI route requires review queue port");
  }
  if (!audit || typeof audit.append !== "function") throw new TypeError("HRX AI route requires audit append port");
  if (!modelGateway || typeof modelGateway.complete !== "function") throw new TypeError("HRX AI route requires model gateway port");

  return Object.freeze({
    async handle(request = {}) {
      try {
        if (request.params?.action === "reviews" && request.method === "GET") {
          return response(200, {
            outcome: "ok",
            reviews: reviewQueue.list({ tenant_id: request.context?.tenant_id }).map((item) => ({ ...item })),
          });
        }
        if (request.params?.action !== "assistant" || request.method !== "POST") {
          return response(405, { outcome: "blocked", safe_error_code: "METHOD_NOT_ALLOWED" });
        }

        const question = request.body?.question;
        const interactionId = request.body?.interaction_id ?? `ai-${randomUUID()}`;
        const guard = enforceHrxNoFinalDecisionGuard({
          question,
          decision_domain: request.body?.decision_domain,
          decision_mode: request.body?.decision_mode,
          final_decision: request.body?.final_decision,
        });
        const retrieval = guard.status === "blocked"
          ? { allowed_sources: [], denied_source_refs: [], prompt_context: { source_refs: [] } }
          : await retriever.retrieve(request.context, {
              query: question,
              limit: request.body?.limit ?? 5,
              purpose: "people_ai_assistance",
            });
        const advisory = guard.status === "blocked"
          ? {
              answer: createHrxAiAnswer({ status: "blocked", answer: "Human review required before any final people decision.", citations: [{ source_ref: "HRX:decision-guard" }] }),
              model_receipt: null,
            }
          : await advisoryAnswer(question, retrieval, modelGateway);
        const answer = advisory.answer;
        const review = routeHrxAiAnswerToReview({
          queue: reviewQueue,
          context: request.context,
          interaction_id: interactionId,
          answer,
          guard,
        });

        const auditEvent = await appendHrxAiAuditEvent({
          audit,
          context: request.context,
          interaction_id: interactionId,
          prompt: question,
          retrieval,
          output: review ? { status: "review_required", citations: answer.citations ?? [] } : answer,
          blocked_decision: guard.status === "blocked",
        });

        if (review) {
          return response(202, {
            outcome: "review_required",
            answer_status: answer.status,
            review_item: review,
            citations: answer.citations ?? [],
            source_refs: answer.source_refs ?? [],
            retrieval: {
              allowed_source_refs: retrieval.allowed_sources.map((source) => source.source_ref),
              denied_source_refs: retrieval.denied_source_refs ?? [],
              matched_chunks: retrieval.prompt_context?.matched_chunks ?? [],
              context_payload_policy: retrieval.prompt_context?.context_payload_policy,
            },
            model_receipt: advisory.model_receipt,
            audit_event_id: auditEvent.event_id,
          });
        }
        return response(200, {
          outcome: "answered",
          answer,
          citations: answer.citations,
          source_refs: answer.source_refs,
          retrieval: {
            allowed_source_refs: retrieval.allowed_sources.map((source) => source.source_ref),
            denied_source_refs: retrieval.denied_source_refs ?? [],
            matched_chunks: retrieval.prompt_context?.matched_chunks ?? [],
            context_payload_policy: retrieval.prompt_context?.context_payload_policy,
          },
          model_receipt: advisory.model_receipt,
          audit_event_id: auditEvent.event_id,
        });
      } catch (error) {
        return response(400, { outcome: "blocked", safe_error_code: "HRX_AI_ROUTE_ERROR", reason: error.message });
      }
    },
  });
}
