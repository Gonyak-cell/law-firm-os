import { appendAiAuditEvent } from "./audit.js";

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

export function invokeModelGateway({ repository, invocation, actor_id, idempotency_key } = {}) {
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  requiredString(invocation, "tenant_id");
  requiredString(invocation, "model_ref");
  if (!invocation.policy_checked || !invocation.retrieval_request_id) throw new Error("model gateway requires policy-checked retrieval");
  const replay = repository.getIdempotency({ tenant_id: invocation.tenant_id, idempotency_key });
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });
  return repository.transaction((tx) => {
    const record = tx.create({ ...invocation, model_type: "ModelGatewayInvocation", status: "dispatched", raw_prompt_included: false, raw_output_included: false });
    const auditEvent = appendAiAuditEvent({ repository: tx, event: { tenant_id: record.tenant_id, actor_id, action: "ai.model_gateway.invoke", object_type: "ModelGatewayInvocation", object_id: record.gateway_invocation_id, idempotency_key } });
    const response = Object.freeze({ outcome: "created", model_gateway_invocation: record, audit_event: auditEvent, idempotent_replay: false });
    tx.recordIdempotency({ tenant_id: record.tenant_id, idempotency_key, operation: "ai_model_gateway_invoke", response });
    return response;
  });
}
