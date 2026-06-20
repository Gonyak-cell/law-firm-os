import { appendAiAuditEvent } from "./audit.js";

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function hasAll(values = [], expected = []) {
  const set = new Set(values);
  return expected.every((value) => set.has(value));
}

export function createAiPolicy({ repository, policy, actor_id, idempotency_key } = {}) {
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  requiredString(policy, "tenant_id");
  if (!hasAll(policy.matter_sensitivity_routes, ["public", "confidential", "privileged"])) throw new Error("AI policy requires matter sensitivity routes");
  if (!hasAll(policy.privilege_label_routes, ["attorney_client", "work_product", "legal_hold"])) throw new Error("AI policy requires privilege label routes");
  const replay = repository.getIdempotency({ tenant_id: policy.tenant_id, idempotency_key });
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });
  return repository.transaction((tx) => {
    const record = tx.upsert({ ...policy, model_type: "AiPolicy", status: policy.status ?? "active", disable_switch_on: policy.disable_switch_on === true });
    const auditEvent = appendAiAuditEvent({ repository: tx, event: { tenant_id: record.tenant_id, actor_id, action: "ai.policy.upsert", object_type: "AiPolicy", object_id: record.ai_policy_id, idempotency_key } });
    const response = Object.freeze({ outcome: "updated", ai_policy: record, audit_event: auditEvent, idempotent_replay: false });
    tx.recordIdempotency({ tenant_id: record.tenant_id, idempotency_key, operation: "ai_policy_upsert", response });
    return response;
  });
}

export function setAiDisableSwitch({ repository, tenant_id, ai_policy_id, disable_switch_on, actor_id, idempotency_key } = {}) {
  requiredString({ tenant_id }, "tenant_id");
  requiredString({ ai_policy_id }, "ai_policy_id");
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  const replay = repository.getIdempotency({ tenant_id, idempotency_key });
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });
  return repository.transaction((tx) => {
    const policy = tx.update({ tenant_id, model_type: "AiPolicy", ai_policy_id }, { disable_switch_on: disable_switch_on === true, updates_database_rows: true });
    const record = tx.create({ model_type: "AiDisableSwitch", disable_switch_id: `disable:${tenant_id}:${ai_policy_id}:${Date.now()}`, tenant_id, ai_policy_id, disable_switch_on: disable_switch_on === true, status: "recorded" });
    const auditEvent = appendAiAuditEvent({ repository: tx, event: { tenant_id, actor_id, action: "ai.disable_switch.set", object_type: "AiDisableSwitch", object_id: record.disable_switch_id, idempotency_key } });
    const response = Object.freeze({ outcome: "updated", ai_policy: policy, disable_switch: record, audit_event: auditEvent, idempotent_replay: false });
    tx.recordIdempotency({ tenant_id, idempotency_key, operation: "ai_disable_switch_set", response });
    return response;
  });
}
