import { createHash, randomUUID } from "node:crypto";

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function stableHash(value) {
  const serialized = typeof value === "string" ? value : JSON.stringify(value ?? null);
  return createHash("sha256").update(serialized).digest("hex");
}

function sourceRefsFrom(input) {
  const refs = input?.source_refs ?? input?.prompt_context?.source_refs ?? input?.allowed_sources?.map((source) => source.source_ref) ?? [];
  if (!Array.isArray(refs)) return Object.freeze([]);
  return Object.freeze([...new Set(refs.filter((ref) => typeof ref === "string" && ref.trim() !== "").map((ref) => ref.trim()))]);
}

function decisionFor(status) {
  if (status === "blocked") return "deny";
  if (status === "review_required") return "review_required";
  return "allow";
}

export function createHrxAiAuditMetadata(input = {}) {
  const prompt = input.prompt ?? input.question ?? "";
  const output = input.output ?? input.answer ?? null;
  const retrieval = input.retrieval ?? {};
  return Object.freeze({
    prompt_hash: stableHash(prompt),
    prompt_length: typeof prompt === "string" ? prompt.length : JSON.stringify(prompt).length,
    retrieval_source_refs: sourceRefsFrom(retrieval),
    retrieval_allowed_count: Array.isArray(retrieval.allowed_sources) ? retrieval.allowed_sources.length : sourceRefsFrom(retrieval).length,
    retrieval_denied_count: Array.isArray(retrieval.denied_source_refs) ? retrieval.denied_source_refs.length : 0,
    output_hash: stableHash(output),
    output_status: input.output_status ?? output?.status ?? null,
    citation_count: Array.isArray(output?.citations) ? output.citations.length : 0,
    blocked_decision: input.blocked_decision === true || output?.status === "blocked",
    payload_policy: "metadata_only",
  });
}

export function createHrxAiAuditEvent(input = {}) {
  const context = input.context ?? {};
  const metadata = createHrxAiAuditMetadata(input);
  const objectId = input.interaction_id ?? `hrx_ai_${randomUUID()}`;
  return Object.freeze({
    event_id: input.event_id ?? `hrx_ai_evt_${randomUUID()}`,
    tenant_id: requiredString(context, "tenant_id"),
    actor_id: requiredString(context, "actor_id"),
    action: input.action ?? "hrx.ai.interaction",
    object_type: "HrxAiInteraction",
    object_id: objectId,
    decision: decisionFor(metadata.output_status),
    reason: input.reason ?? "hrx_ai_metadata_audit",
    source: "hrx-ai",
    metadata,
  });
}

export async function appendHrxAiAuditEvent({ audit, ...input } = {}) {
  if (!audit || typeof audit.append !== "function") throw new TypeError("HRX AI audit append port is required");
  const event = createHrxAiAuditEvent(input);
  return audit.append(event);
}
