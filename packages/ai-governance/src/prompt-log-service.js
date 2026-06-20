import { createHash } from "node:crypto";
import { appendAiAuditEvent } from "./audit.js";

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

export function hashPrompt(prompt) {
  return createHash("sha256").update(String(prompt ?? "")).digest("hex");
}

export function createPromptLog({ repository, prompt_log, actor_id, idempotency_key } = {}) {
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  requiredString(prompt_log, "tenant_id");
  requiredString(prompt_log, "matter_id");
  requiredString(prompt_log, "retrieval_request_id");
  const replay = repository.getIdempotency({ tenant_id: prompt_log.tenant_id, idempotency_key });
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });
  return repository.transaction((tx) => {
    const { raw_prompt, ...safe } = prompt_log;
    const record = tx.create({ ...safe, model_type: "PromptLog", prompt_hash: prompt_log.prompt_hash ?? hashPrompt(raw_prompt), raw_prompt_included: false, created_at: prompt_log.created_at ?? new Date().toISOString() });
    const auditEvent = appendAiAuditEvent({ repository: tx, event: { tenant_id: record.tenant_id, actor_id, action: "ai.prompt.log", object_type: "PromptLog", object_id: record.prompt_log_id, idempotency_key } });
    const response = Object.freeze({ outcome: "created", prompt_log: record, audit_event: auditEvent, idempotent_replay: false });
    tx.recordIdempotency({ tenant_id: record.tenant_id, idempotency_key, operation: "ai_prompt_log", response });
    return response;
  });
}
