import { createHash } from "node:crypto";
import { evaluateRouteDecision } from "./permission-gate.js";

const SAFE_CODE = /^[A-Z0-9_]+$/u;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;

function requiredId(value, field) {
  const text = String(value ?? "").normalize("NFKC").trim();
  if (!SAFE_ID.test(text)) throw new TypeError(`${field} is invalid`);
  return text;
}

function digest(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function safeError(status, requestId, code) {
  return { status, body: { request_id: requestId, outcome: "blocked", items: [],
    next_cursor: null, safe_error_codes: [code], count_leak_prevented: true,
    raw_body_included: false, storage_pointer_ref_included: false,
    authoritative: false, production_ready_claim: false } };
}

function principal(context, requestedTenantId) {
  const tenantId = requiredId(context?.principal?.tenant_id, "principal.tenant_id");
  if (requestedTenantId != null && requestedTenantId !== ""
      && requiredId(requestedTenantId, "tenant_id") !== tenantId) {
    throw Object.assign(new Error("Outlook precedent tenant mismatch"), {
      status: 403, safe_error_code: "OUTLOOK_PRECEDENT_TENANT_MISMATCH" });
  }
  return Object.freeze({ tenant_id: tenantId,
    actor_id: requiredId(context.principal.user_id ?? context.principal.actor_id,
      "principal.user_id") });
}

function decisionRecord(decision, resourceId) {
  return Object.freeze({ resource_id: resourceId, effect: decision.effect,
    reason: decision.reason ?? null, matched_rule_id: decision.matched_rule_id ?? null,
    fail_closed: decision.fail_closed === true });
}

function sourceDecision(context, descriptor) {
  const scoped = { ...context, object_acl: (context.object_acl ?? []).filter((entry) => (
    entry.resource_id === undefined || entry.resource_id === descriptor.document_id
  )) };
  return evaluateRouteDecision({ context: scoped, action: "dms:document:read",
    resource: { tenant_id: descriptor.tenant_id, matter_id: descriptor.matter_id,
      resource_type: "dms_document", resource_id: descriptor.document_id } });
}

async function authorize({ query, context, requestId, runtime }) {
  const user = principal(context, query.tenant_id);
  const matterId = requiredId(query.matter_id, "matter_id");
  const repository = runtime?.precedentSearchRuntime?.repository;
  const matterRepository = runtime?.matterRuntime?.repository;
  if (!repository?.listSourceDescriptors || !repository?.readiness || !repository?.search
      || !matterRepository?.get) return { response: safeError(503, requestId,
    "OUTLOOK_PRECEDENT_RUNTIME_UNAVAILABLE") };
  const matterDecision = evaluateRouteDecision({ context,
    action: "outlook:precedent:search",
    resource: { tenant_id: user.tenant_id, matter_id: matterId,
      resource_type: "matter", resource_id: matterId } });
  if (matterDecision.effect !== "allow") return { response: safeError(403, requestId,
    "OUTLOOK_PRECEDENT_PERMISSION_DENIED") };
  const matter = matterRepository.get({ tenant_id: user.tenant_id,
    model_type: "Matter", matter_id: matterId });
  if (!matter) return { response: safeError(404, requestId,
    "OUTLOOK_PRECEDENT_MATTER_NOT_FOUND") };
  const descriptors = await repository.listSourceDescriptors({ tenant_id: user.tenant_id });
  const decisions = descriptors.map((descriptor) => ({ descriptor,
    decision: sourceDecision(context, descriptor) }));
  const allowed = decisions.filter(({ decision }) => decision.effect === "allow")
    .map(({ descriptor }) => descriptor);
  return { user, matterId, repository, allowed,
    authorization_decision_sha256: digest({ matter: decisionRecord(matterDecision, matterId),
      sources: decisions.map(({ descriptor, decision }) => decisionRecord(decision, descriptor.document_id)) }),
    authorized_source_set_sha256: digest(allowed.map(({ source_id, document_id, version_id }) => (
      { source_id, document_id, version_id }
    )).sort((a, b) => a.source_id.localeCompare(b.source_id))) };
}

function readinessError(readiness, requestId) {
  const code = SAFE_CODE.test(readiness.safe_error_code ?? "")
    ? readiness.safe_error_code : "OUTLOOK_PRECEDENT_RUNTIME_UNAVAILABLE";
  return safeError(code === "PRECEDENT_INDEX_STALE" ? 409 : 503, requestId, code);
}

export async function handleOutlookPrecedentReadiness(input = {}) {
  try {
    const authorized = await authorize(input);
    if (authorized.response) return authorized.response;
    const readiness = await authorized.repository.readiness({
      tenant_id: authorized.user.tenant_id,
      allowed_document_ids: authorized.allowed.map(({ document_id }) => document_id),
    });
    if (readiness.runtime_ready !== true || readiness.authoritative !== true) {
      return readinessError(readiness, input.requestId);
    }
    return { status: 200, body: { request_id: input.requestId, outcome: "passed",
      runtime_ready: true, authoritative: true, index_version: readiness.index_version,
      authority_fingerprint: readiness.authority_fingerprint,
      safe_error_codes: [], production_ready_claim: false } };
  } catch (error) {
    const code = SAFE_CODE.test(error?.safe_error_code ?? "")
      ? error.safe_error_code : "OUTLOOK_PRECEDENT_VALIDATION_ERROR";
    return safeError(Number.isInteger(error?.status) ? error.status : 400, input.requestId, code);
  }
}

export async function handleOutlookPrecedentSearch(input = {}) {
  try {
    const authorized = await authorize(input);
    if (authorized.response) return authorized.response;
    const readiness = await authorized.repository.readiness({
      tenant_id: authorized.user.tenant_id,
      allowed_document_ids: authorized.allowed.map(({ document_id }) => document_id),
    });
    if (readiness.runtime_ready !== true || readiness.authoritative !== true) {
      return readinessError(readiness, input.requestId);
    }
    const result = await authorized.repository.search({
      tenant_id: authorized.user.tenant_id, matter_id: authorized.matterId,
      actor_id: authorized.user.actor_id, request_occurrence_id: input.requestId,
      authorization_decision_sha256: authorized.authorization_decision_sha256,
      authorized_source_set_sha256: authorized.authorized_source_set_sha256,
      query: input.query.q,
      limit: input.query.limit == null || input.query.limit === "" ? 10 : Number(input.query.limit),
      cursor: input.query.cursor,
      allowed_document_ids: authorized.allowed.map(({ document_id }) => document_id),
      include_current_matter: false, search_mode: "precedent",
    });
    return { status: 200, body: { request_id: input.requestId, outcome: "passed",
      items: result.items, next_cursor: result.next_cursor,
      page_info: { returned_count: result.items.length, has_more: result.next_cursor != null },
      safe_error_codes: [], count_leak_prevented: true, raw_body_included: false,
      storage_pointer_ref_included: false, index_version: result.index_version,
      index_stale: false, authoritative: true, production_ready_claim: false } };
  } catch (error) {
    const code = SAFE_CODE.test(error?.safe_error_code ?? "")
      ? error.safe_error_code : "OUTLOOK_PRECEDENT_VALIDATION_ERROR";
    return safeError(Number.isInteger(error?.status) ? error.status : 400, input.requestId, code);
  }
}
