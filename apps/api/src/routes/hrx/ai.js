import { randomUUID } from "node:crypto";
import { appendHrxAiAuditEvent } from "../../../../../packages/hrx/src/ai/audit.js";
import { createHrxAiAnswer, createHrxInsufficientSourcesAnswer, groundHrxAiAnswer } from "../../../../../packages/hrx/src/ai/answer-schema.js";
import { enforceHrxNoFinalDecisionGuard } from "../../../../../packages/hrx/src/ai/decision-guard.js";
import { routeHrxAiAnswerToReview } from "../../../../../packages/hrx/src/ai/review-queue.js";

function response(status, body) {
  return Object.freeze({ status, body: Object.freeze(body) });
}

function advisoryAnswer(question, retrieval) {
  if (retrieval.allowed_sources.length === 0) return createHrxInsufficientSourcesAnswer();
  const [source] = retrieval.allowed_sources;
  return groundHrxAiAnswer({
    answer: `Grounded HRX advisory response for: ${question}`,
    citations: [{ source_ref: source.source_ref, label: source.title ?? source.source_ref }],
    allowed_sources: retrieval.allowed_sources,
  });
}

export function createHrxAiRoute({ retriever, reviewQueue, audit } = {}) {
  if (!retriever || typeof retriever.retrieve !== "function") throw new TypeError("HRX AI route requires retriever port");
  if (!reviewQueue || typeof reviewQueue.enqueue !== "function" || typeof reviewQueue.list !== "function") {
    throw new TypeError("HRX AI route requires review queue port");
  }
  if (!audit || typeof audit.append !== "function") throw new TypeError("HRX AI route requires audit append port");

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
        const answer = guard.status === "blocked"
          ? createHrxAiAnswer({ status: "blocked", answer: "Human review required before any final people decision.", citations: [{ source_ref: "HRX:decision-guard" }] })
          : advisoryAnswer(question, retrieval);
        const review = routeHrxAiAnswerToReview({
          queue: reviewQueue,
          context: request.context,
          interaction_id: interactionId,
          answer,
          guard,
        });

        await appendHrxAiAuditEvent({
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
          });
        }
        return response(200, {
          outcome: "answered",
          answer,
          citations: answer.citations,
          source_refs: answer.source_refs,
        });
      } catch (error) {
        return response(400, { outcome: "blocked", safe_error_code: "HRX_AI_ROUTE_ERROR", reason: error.message });
      }
    },
  });
}
