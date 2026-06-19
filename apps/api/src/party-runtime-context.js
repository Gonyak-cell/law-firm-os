import { createHash, randomUUID } from "node:crypto";
import {
  createMasterDataDuplicateCandidateQueue,
  createMasterDataPartyMergeSplitWorkflowDescriptor,
  createMasterDataRecord,
  createMasterDataRelatedPartySearchDescriptor,
  createMasterDataSyntheticFixture,
  validateMasterDataRecord,
} from "../../../packages/master-data/src/index.js";
import { evaluatePermissionControlRequest } from "../../../packages/authz/src/index.js";
import { buildAuditEventInput, createAuditLedger } from "../../../packages/audit/src/index.js";
import { PERMISSION_CONTEXT_HEADER } from "./permission-gate.js";

const PARTY_MASTER_PREFIXES = Object.freeze([
  "/party-master/records",
  "/party-master/parties",
  "/party-master/entities",
  "/party-master/people",
  "/party-master/organizations",
  "/party-master/aliases",
  "/party-master/identifiers",
  "/party-master/client-groups",
  "/party-master/relationships",
  "/party-master/contact-points",
  "/party-master/billing-profiles",
  "/party-master/duplicates/search",
  "/party-master/merge-split",
  "/party-master/audit/events",
  "/party-master/audit/verify",
]);

const MODEL_ROUTES = Object.freeze({
  "/party-master/parties": { modelType: "Party", idField: "party_id", prefix: "party" },
  "/party-master/entities": { modelType: "Entity", idField: "entity_id", prefix: "entity" },
  "/party-master/people": { modelType: "Person", idField: "person_id", prefix: "person" },
  "/party-master/organizations": { modelType: "Organization", idField: "organization_id", prefix: "org" },
  "/party-master/aliases": { modelType: "PartyAlias", idField: "party_alias_id", prefix: "alias" },
  "/party-master/identifiers": { modelType: "PartyIdentifier", idField: "party_identifier_id", prefix: "identifier" },
  "/party-master/client-groups": { modelType: "ClientGroup", idField: "client_group_id", prefix: "client_group" },
  "/party-master/relationships": { modelType: "Relationship", idField: "relationship_id", prefix: "relationship" },
  "/party-master/contact-points": { modelType: "ContactPoint", idField: "contact_point_id", prefix: "contact" },
  "/party-master/billing-profiles": { modelType: "BillingProfile", idField: "billing_profile_id", prefix: "billing_profile" },
});

export const CMP_G2_TUW_IDS = Object.freeze([
  "CMP-G2-W02-T001",
  "CMP-G2-W02-T002",
  "CMP-G2-W02-T003",
  "CMP-G2-W02-T004",
  "CMP-G2-W02-T005",
  "CMP-G2-W02-T006",
  "CMP-G2-W02-T007",
  "CMP-G2-W02-T008",
  "CMP-G2-W02-T009",
  "CMP-G2-W02-T010",
  "CMP-G2-W02-T011",
  "CMP-G2-W02-T012",
  "CMP-G2-W02-T013",
  "CMP-G2-W02-T014",
  "CMP-G2-W02-T015",
  "CMP-G2-W02-T016",
  "CMP-G2-W02-T017",
  "CMP-G2-W02-T018",
  "CMP-G2-W02-T019",
]);

export const PARTY_MASTER_BOUNDED_CONTEXT = Object.freeze({
  bounded_context: "party-master",
  cmp_gate: "CMP-G2",
  cmp_work_package: "CMP-G2-W02",
  depends_on: "CMP-G1-W01",
  package_ref: "packages/master-data",
  runtime_routes: Object.freeze([...PARTY_MASTER_PREFIXES]),
  tuw_ids: CMP_G2_TUW_IDS,
  runtime_readiness_claim: "runtime_api_evidence_only__durable_persistence_open",
});

export function isPartyMasterPath(pathname) {
  return PARTY_MASTER_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function createPartyMasterRuntimeContext({ seedSyntheticFixture = true } = {}) {
  const records = new Map(Object.values(MODEL_ROUTES).map(({ modelType }) => [modelType, new Map()]));
  if (seedSyntheticFixture) {
    for (const record of createMasterDataSyntheticFixture().records) {
      const config = configForModelType(record.model_type);
      if (config) records.get(config.modelType).set(record[config.idField], record);
    }
  }
  return {
    records,
    workflows: [],
    decisionReceipts: new Map(),
    idempotencyReceipts: new Map(),
    auditLedger: createAuditLedger(),
  };
}

export async function handlePartyMasterApiRequest({
  pathname,
  method,
  query = {},
  body = {},
  headers = {},
  requestId,
  context,
}) {
  try {
    if (pathname === "/party-master/records") {
      if (method !== "GET") return response(405, safeError("CMP_G2_METHOD_NOT_ALLOWED", "method_not_allowed"));
      return handleAllRecordsList({ query, headers, requestId, context });
    }

    if (pathname === "/party-master/duplicates/search") {
      if (method !== "POST") return response(405, safeError("CMP_G2_METHOD_NOT_ALLOWED", "method_not_allowed"));
      return handleDuplicateSearch({ body, headers, requestId, context });
    }

    if (pathname === "/party-master/merge-split") {
      if (method !== "POST") return response(405, safeError("CMP_G2_METHOD_NOT_ALLOWED", "method_not_allowed"));
      return handleMergeSplit({ body, headers, requestId, context });
    }

    if (pathname === "/party-master/audit/events") {
      if (method !== "GET") return response(405, safeError("CMP_G2_METHOD_NOT_ALLOWED", "method_not_allowed"));
      const tenantId = requireTenantQuery(query);
      const authz = authorize({
        body: {},
        headers,
        query,
        requestId,
        context,
        action: "party_master.audit.events",
        resource: { tenant_id: tenantId, resource_id: "party_master_audit_events", resource_type: "PartyMasterAudit" },
      });
      if (!authz.ok) return permissionDenied(authz);
      return response(200, {
        outcome: "passed",
        items: context.auditLedger.list({ tenant_id: tenantId }),
        decision_receipt: authz.receipt,
        tuw_ids: ["CMP-G2-W02-T018"],
      });
    }

    if (pathname === "/party-master/audit/verify") {
      if (method !== "GET") return response(405, safeError("CMP_G2_METHOD_NOT_ALLOWED", "method_not_allowed"));
      const tenantId = requireTenantQuery(query);
      const authz = authorize({
        body: {},
        headers,
        query,
        requestId,
        context,
        action: "party_master.audit.verify",
        resource: { tenant_id: tenantId, resource_id: "party_master_audit_verify", resource_type: "PartyMasterAudit" },
      });
      if (!authz.ok) return permissionDenied(authz);
      return response(200, {
        outcome: "passed",
        verification: context.auditLedger.verify({ tenant_id: tenantId }),
        decision_receipt: authz.receipt,
        tuw_ids: ["CMP-G2-W02-T019"],
      });
    }

    const exactConfig = MODEL_ROUTES[pathname];
    if (exactConfig) {
      if (method === "GET") return handleModelList({ config: exactConfig, query, headers, requestId, context });
      if (method === "POST") return handleModelCreate({ config: exactConfig, body, headers, requestId, context });
      return response(405, safeError("CMP_G2_METHOD_NOT_ALLOWED", "method_not_allowed"));
    }

    const itemMatch = pathname.match(/^\/party-master\/([^/]+)\/([^/]+)$/);
    if (itemMatch) {
      const route = `/party-master/${itemMatch[1]}`;
      const config = MODEL_ROUTES[route];
      if (!config) return response(404, safeError("CMP_G2_NOT_FOUND", "not_found"));
      const id = decodeURIComponent(itemMatch[2]);
      if (method === "GET") return handleModelGet({ config, id, query, headers, requestId, context });
      if (method === "PATCH") return handleModelPatch({ config, id, body, headers, requestId, context });
      return response(405, safeError("CMP_G2_METHOD_NOT_ALLOWED", "method_not_allowed"));
    }

    return response(404, safeError("CMP_G2_NOT_FOUND", "not_found"));
  } catch (error) {
    return response(error.status_code ?? 400, safeError(error.safe_error_code ?? "CMP_G2_VALIDATION_ERROR", error.message));
  }
}

function handleAllRecordsList({ query, headers, requestId, context }) {
  const tenantId = requireTenantQuery(query);
  const authz = authorize({
    body: {},
    headers,
    query,
    requestId,
    context,
    action: "party_master.records.list",
    resource: { tenant_id: tenantId, resource_id: "party_master_records", resource_type: "PartyMasterRecord" },
  });
  if (!authz.ok) return permissionDenied(authz);
  const items = allRecords(context).filter((record) => record.tenant_id === tenantId).map(serializeRecord);
  return response(200, {
    outcome: "passed",
    items,
    page_info: { returned_count: items.length },
    decision_receipt: authz.receipt,
    tuw_ids: CMP_G2_TUW_IDS,
  });
}

function handleModelList({ config, query, headers, requestId, context }) {
  const tenantId = requireTenantQuery(query);
  const authz = authorize({
    body: {},
    headers,
    query,
    requestId,
    context,
    action: `party_master.${config.modelType}.list`,
    resource: { tenant_id: tenantId, resource_id: `${config.modelType}:list`, resource_type: `PartyMaster${config.modelType}` },
  });
  if (!authz.ok) return permissionDenied(authz);

  const records = recordsFor(context, config.modelType).filter((record) => record.tenant_id === tenantId);
  if (config.modelType === "Relationship" && query.query_party_id) {
    const descriptor = createMasterDataRelatedPartySearchDescriptor({
      tenant_id: tenantId,
      query_party_id: query.query_party_id,
      relationships: records,
      parties_by_id: partyIndex(context, tenantId),
    });
    return response(200, {
      outcome: "passed",
      descriptor,
      items: descriptor.related_parties,
      decision_receipt: authz.receipt,
      tuw_ids: ["CMP-G2-W02-T011"],
    });
  }
  return response(200, {
    outcome: "passed",
    items: records.map(serializeRecord),
    page_info: { returned_count: records.length },
    decision_receipt: authz.receipt,
    tuw_ids: tuwsForModel(config.modelType),
  });
}

function handleModelGet({ config, id, query, headers, requestId, context }) {
  const tenantId = requireTenantQuery(query);
  const record = context.records.get(config.modelType).get(id);
  const authz = authorize({
    body: {},
    headers,
    query,
    requestId,
    context,
    action: `party_master.${config.modelType}.view`,
    resource: { tenant_id: tenantId, resource_id: id, resource_type: `PartyMaster${config.modelType}` },
  });
  if (!authz.ok) return permissionDenied(authz);
  if (!record || record.tenant_id !== tenantId) {
    return response(404, { outcome: "passed", item: null, safe_error_codes: [], ui_state: "empty", tuw_ids: tuwsForModel(config.modelType) });
  }
  return response(200, {
    outcome: record.status === "review_required" ? "review_required" : "passed",
    item: serializeRecord(record),
    decision_receipt: authz.receipt,
    tuw_ids: tuwsForModel(config.modelType),
  });
}

function handleModelCreate({ config, body, headers, requestId, context }) {
  const normalized = normalizeRecordInput({ config, body, requestId });
  const authz = authorize({
    body,
    headers,
    query: {},
    requestId,
    context,
    action: `party_master.${config.modelType}.create`,
    resource: {
      tenant_id: normalized.tenant_id,
      resource_id: normalized[config.idField],
      resource_type: `PartyMaster${config.modelType}`,
    },
  });
  if (!authz.ok) return permissionDenied(authz);

  const idempotencyKey = authz.request.idempotency_key;
  const existingReceipt = context.idempotencyReceipts.get(idempotencyKey);
  if (existingReceipt) return response(existingReceipt.status, existingReceipt.body);

  const record = createRuntimeRecord(config.modelType, normalized);
  const validation = validateMasterDataRecord(config.modelType, record, validationOptions({ context, record, modelType: config.modelType }));
  if (!validation.valid) {
    return response(400, {
      outcome: "blocked",
      safe_error_codes: ["CMP_G2_RECORD_VALIDATION_FAILED"],
      validation,
      tuw_ids: tuwsForModel(config.modelType),
    });
  }

  context.records.get(config.modelType).set(record[config.idField], record);
  const auditEvent = appendPartyAudit({
    context,
    authz,
    action: `party_master.${config.modelType}.create`,
    objectId: record[config.idField],
    objectType: config.modelType,
    outcome: validation.review_required_claims.length > 0 ? "review_required" : "allow",
    reason: validation.review_required_claims[0] ?? "party_master_record_created",
    payload: { model_type: config.modelType, identity_key: record.identity_key ?? null },
  });
  const status = validation.review_required_claims.length > 0 ? 202 : 201;
  const result = {
    status,
    body: {
      outcome: status === 202 ? "review_required" : "passed",
      item: serializeRecord(record),
      validation,
      decision_receipt: authz.receipt,
      audit_event_id: auditEvent.event_id,
      tuw_ids: tuwsForModel(config.modelType),
      runtime_readiness: "runtime_api_evidence_only__durable_persistence_open",
    },
  };
  context.idempotencyReceipts.set(idempotencyKey, result);
  return response(status, result.body);
}

function handleModelPatch({ config, id, body, headers, requestId, context }) {
  const existing = context.records.get(config.modelType).get(id);
  const tenantId = body.tenant_id ?? existing?.tenant_id;
  const authz = authorize({
    body,
    headers,
    query: {},
    requestId,
    context,
    action: `party_master.${config.modelType}.update`,
    resource: { tenant_id: tenantId, resource_id: id, resource_type: `PartyMaster${config.modelType}` },
  });
  if (!authz.ok) return permissionDenied(authz);
  if (!existing || existing.tenant_id !== tenantId) {
    return response(404, { outcome: "passed", item: null, safe_error_codes: [], ui_state: "empty", tuw_ids: tuwsForModel(config.modelType) });
  }
  const candidate = createRuntimeRecord(config.modelType, { ...existing, ...body, [config.idField]: id, tenant_id: existing.tenant_id });
  const validation = validateMasterDataRecord(config.modelType, candidate, validationOptions({ context, record: candidate, modelType: config.modelType }));
  if (!validation.valid) {
    return response(400, {
      outcome: "blocked",
      safe_error_codes: ["CMP_G2_RECORD_VALIDATION_FAILED"],
      validation,
      tuw_ids: tuwsForModel(config.modelType),
    });
  }
  context.records.get(config.modelType).set(id, candidate);
  const auditEvent = appendPartyAudit({
    context,
    authz,
    action: `party_master.${config.modelType}.update`,
    objectId: id,
    objectType: config.modelType,
    outcome: "allow",
    reason: "party_master_record_updated",
    payload: { model_type: config.modelType },
  });
  return response(200, {
    outcome: "passed",
    item: serializeRecord(candidate),
    validation,
    decision_receipt: authz.receipt,
    audit_event_id: auditEvent.event_id,
    tuw_ids: tuwsForModel(config.modelType),
  });
}

function handleDuplicateSearch({ body, headers, requestId, context }) {
  const tenantId = requireTenantBody(body);
  const authz = authorize({
    body,
    headers,
    query: {},
    requestId,
    context,
    action: "party_master.duplicates.search",
    resource: { tenant_id: tenantId, resource_id: body.source_party_id ?? "duplicate_search", resource_type: "PartyMasterDuplicateSearch" },
  });
  if (!authz.ok) return permissionDenied(authz);
  const candidates = recordsFor(context, "Party").filter((party) => party.tenant_id === tenantId && party.party_id !== body.source_party_id);
  const descriptor = createMasterDataDuplicateCandidateQueue({
    tenant_id: tenantId,
    source_party_id: body.source_party_id,
    source_display_name: body.source_display_name,
    review_threshold: body.review_threshold ?? 0.5,
    candidates,
  });
  const auditEvent = appendPartyAudit({
    context,
    authz,
    action: "party_master.duplicates.search",
    objectId: body.source_party_id ?? "duplicate_search",
    objectType: "PartyDuplicateSearch",
    outcome: descriptor.outcome === "review_required" ? "review_required" : "allow",
    reason: descriptor.review_required_claims[0] ?? "duplicate_search_completed",
    payload: { candidate_count: descriptor.candidate_count },
  });
  return response(200, {
    outcome: descriptor.outcome,
    descriptor,
    duplicate_candidates: descriptor.duplicate_candidates,
    decision_receipt: authz.receipt,
    audit_event_id: auditEvent.event_id,
    tuw_ids: ["CMP-G2-W02-T010"],
  });
}

function handleMergeSplit({ body, headers, requestId, context }) {
  const tenantId = requireTenantBody(body);
  const authz = authorize({
    body,
    headers,
    query: {},
    requestId,
    context,
    action: `party_master.${body.workflow_type ?? "merge"}.review`,
    resource: { tenant_id: tenantId, resource_id: body.target_party_id ?? body.source_party_id ?? "merge_split", resource_type: "PartyMasterMergeSplit" },
  });
  if (!authz.ok) return permissionDenied(authz);
  const descriptor = createMasterDataPartyMergeSplitWorkflowDescriptor(body);
  const auditEvent = appendPartyAudit({
    context,
    authz,
    action: `party_master.${descriptor.workflow_type}.review`,
    objectId: descriptor.target_party_ids[0] ?? descriptor.source_party_ids[0] ?? "merge_split",
    objectType: "PartyMergeSplit",
    outcome: descriptor.outcome === "blocked" ? "deny" : "review_required",
    reason: descriptor.blocked_claims[0] ?? descriptor.review_required_claims[0] ?? "merge_split_review_required",
    payload: { workflow_type: descriptor.workflow_type, source_party_ids: descriptor.source_party_ids },
  });
  const workflow = Object.freeze({
    workflow_id: stableId("party_merge_split", { tenantId, requestId, source: descriptor.source_party_ids, target: descriptor.target_party_ids }),
    descriptor,
    audit_event_id: auditEvent.event_id,
    created_at: new Date().toISOString(),
  });
  context.workflows.push(workflow);
  return response(descriptor.outcome === "blocked" ? 400 : 202, {
    outcome: descriptor.outcome,
    workflow,
    decision_receipt: authz.receipt,
    audit_event_id: auditEvent.event_id,
    tuw_ids: ["CMP-G2-W02-T012"],
  });
}

function authorize({ body, headers, query, requestId, context, action, resource }) {
  const permissionInput = permissionInputFromRequest({ body, headers, query, requestId });
  const result = evaluatePermissionControlRequest({
    principal: permissionInput.principal,
    resource,
    action,
    request: permissionInput.request,
    rules: permissionInput.rules,
    objectAcl: permissionInput.object_acl,
    ethicalWalls: permissionInput.ethical_walls,
    legalHolds: permissionInput.legal_holds,
    breakGlass: permissionInput.break_glass,
  });
  const permissionDecisionId = stableId("party_pdr", {
    tenant_id: permissionInput.principal?.tenant_id ?? resource.tenant_id,
    actor_id: permissionInput.principal?.user_id ?? permissionInput.principal?.actor_id,
    action,
    resource_id: resource.resource_id,
    request_id: permissionInput.request.request_id,
    effect: result.decision.effect,
  });
  const receipt = Object.freeze({
    permission_decision_id: permissionDecisionId,
    permission_context_id: result.permission_context_id,
    tenant_id: permissionInput.principal?.tenant_id ?? resource.tenant_id,
    actor_id: permissionInput.principal?.user_id ?? permissionInput.principal?.actor_id ?? "unknown",
    actor_type: permissionInput.principal?.actor_type ?? "user",
    action,
    resource_id: resource.resource_id,
    effect: result.decision.effect,
    reason: result.decision.reason,
    matched_rule_id: result.decision.matched_rule_id,
    created_at: new Date().toISOString(),
  });
  context.decisionReceipts.set(permissionDecisionId, receipt);
  if (result.decision.effect === "deny") {
    appendPartyAudit({
      context,
      authz: { receipt, request: permissionInput.request, principal: permissionInput.principal },
      action,
      objectId: resource.resource_id,
      objectType: resource.resource_type,
      outcome: "deny",
      reason: result.decision.reason,
      payload: { matched_rule_id: result.decision.matched_rule_id },
    });
  }
  return {
    ok: result.ok,
    status: result.status_code,
    decision: result.decision,
    receipt,
    request: permissionInput.request,
    principal: permissionInput.principal,
    result,
  };
}

function permissionInputFromRequest({ body, headers, query, requestId }) {
  const headerContext = parsePermissionHeader(headers);
  const principal = normalizePrincipal(body.principal ?? headerContext.principal ?? {
    user_id: query.actor_user_id,
    tenant_id: query.tenant_id,
    role_ids: query.role_ids ? String(query.role_ids).split(",").filter(Boolean) : [],
  });
  return {
    principal,
    rules: body.rules ?? headerContext.rules ?? [],
    object_acl: body.object_acl ?? headerContext.object_acl ?? [],
    ethical_walls: body.ethical_walls ?? headerContext.ethical_walls ?? [],
    legal_holds: body.legal_holds ?? headerContext.legal_holds ?? [],
    break_glass: body.break_glass ?? headerContext.break_glass ?? null,
    request: {
      request_id: body.request?.request_id ?? query.request_id ?? requestId,
      trace_id: body.request?.trace_id ?? query.trace_id ?? `trace_${requestId}`,
      span_id: body.request?.span_id ?? "span_party_master",
      idempotency_key: body.request?.idempotency_key ?? `idem_${requestId}`,
      source_service: "party-master-api",
    },
  };
}

function parsePermissionHeader(headers = {}) {
  const raw = headers[PERMISSION_CONTEXT_HEADER] ?? headers[PERMISSION_CONTEXT_HEADER.toLowerCase()];
  if (!raw) return {};
  try {
    return JSON.parse(Array.isArray(raw) ? raw[0] : raw);
  } catch {
    return {};
  }
}

function normalizePrincipal(principal = {}) {
  if (principal.service_principal_id && !principal.user_id) {
    return {
      ...principal,
      user_id: principal.service_principal_id,
      actor_id: principal.service_principal_id,
      actor_type: "service_principal",
      role_ids: principal.role_ids ?? ["service_principal"],
    };
  }
  return {
    ...principal,
    actor_id: principal.actor_id ?? principal.user_id,
    actor_type: principal.actor_type ?? "user",
    role_ids: principal.role_ids ?? [],
  };
}

function permissionDenied(authz) {
  return response(authz.status, {
    outcome: "blocked",
    decision: authz.decision,
    decision_receipt: authz.receipt,
    safe_error_codes: ["CMP_G2_PERMISSION_DENIED"],
    tuw_ids: CMP_G2_TUW_IDS,
  });
}

function normalizeRecordInput({ config, body, requestId }) {
  const principal = normalizePrincipal(body.principal ?? {});
  const tenantId = requireTenantBody(body);
  const id = body[config.idField] ?? stableId(config.prefix, { tenantId, requestId, display_name: body.display_name, value: body.value });
  return {
    ...body,
    [config.idField]: id,
    tenant_id: tenantId,
    status: body.status ?? "active",
    owner_user_id: body.owner_user_id ?? principal.user_id ?? principal.actor_id ?? "system_party_master",
    audit_hint_ref: body.audit_hint_ref ?? `audit_hint_${requestId}`,
    permission_ref: body.permission_ref ?? `permission_ref_${requestId}`,
  };
}

function createRuntimeRecord(modelType, input) {
  const record = createMasterDataRecord(modelType, input);
  return Object.freeze({
    ...record,
    synthetic_only: input.synthetic_only ?? false,
    writes_product_state: true,
    evaluates_runtime_permission: true,
    writes_audit_event: true,
    runtime_source: "cmp_g2_party_master_api",
  });
}

function validationOptions({ context, record, modelType }) {
  const tenantRecords = allRecords(context).filter((candidate) => candidate.tenant_id === record.tenant_id);
  const partyById = Object.fromEntries(recordsFor(context, "Party").filter((party) => party.tenant_id === record.tenant_id).map((party) => [party.party_id, party]));
  const partyTypesById = Object.fromEntries(Object.entries(partyById).map(([partyId, party]) => [partyId, party.party_type]));
  const option = {
    expected_tenant_id: record.tenant_id,
    owner_module: "MasterData",
    known_identity_keys: tenantRecords
      .filter((candidate) => candidate.model_type === modelType)
      .filter((candidate) => primaryId(candidate) !== primaryId(record))
      .map((candidate) => candidate.identity_key)
      .filter(Boolean),
    party_types_by_id: partyTypesById,
  };
  if (modelType === "ClientGroup") {
    const allPartiesById = Object.fromEntries(recordsFor(context, "Party").map((party) => [party.party_id, party]));
    option.member_tenant_ids = [
      ...(record.member_party_ids ?? []).map((partyId) => allPartiesById[partyId]?.tenant_id ?? record.tenant_id),
    ];
  }
  if (modelType === "BillingProfile") {
    option.require_legal_and_billing_client_refs = Boolean(record.legal_client_party_id || record.billing_client_party_id);
    option.require_distinct_billing_client = Boolean(record.legal_client_party_id && record.billing_client_party_id);
  }
  return option;
}

function appendPartyAudit({ context, authz, action, objectId, objectType, outcome, reason, payload = {} }) {
  const tenantId = authz.receipt.tenant_id ?? authz.principal?.tenant_id ?? "unknown";
  const input = buildAuditEventInput({
    tenant_id: tenantId,
    actor: {
      actor_id: authz.receipt.actor_id ?? authz.principal?.user_id ?? "unknown",
      actor_type: authz.receipt.actor_type ?? authz.principal?.actor_type ?? "user",
    },
    action,
    object: { object_id: objectId ?? "unknown", object_type: objectType ?? "PartyMasterRecord" },
    outcome,
    decision: outcome,
    reason_code: reason,
    source_service: "party-master-api",
    request: authz.request,
    payload: {
      payload_classification: "metadata_plus_digest",
      permission_decision_id: authz.receipt.permission_decision_id,
      ...payload,
    },
    evidence_refs: ["docs/reorganization/client-matter-os/cmp-v1/04-cmp-g2-party-runtime-report.md"],
    permission_decision_id: authz.receipt.permission_decision_id,
  });
  return context.auditLedger.append(input);
}

function allRecords(context) {
  return [...context.records.values()].flatMap((map) => [...map.values()]);
}

function recordsFor(context, modelType) {
  return [...context.records.get(modelType).values()];
}

function partyIndex(context, tenantId) {
  return Object.fromEntries(recordsFor(context, "Party").filter((party) => party.tenant_id === tenantId).map((party) => [party.party_id, party]));
}

function serializeRecord(record) {
  const { bank_account_number, secret, credential, access_token, private_key, ...safe } = record;
  return { ...safe, resource_id: primaryId(record) };
}

function primaryId(record) {
  const config = configForModelType(record.model_type);
  return config ? record[config.idField] : null;
}

function configForModelType(modelType) {
  return Object.values(MODEL_ROUTES).find((config) => config.modelType === modelType);
}

function tuwsForModel(modelType) {
  const mapping = {
    Party: ["CMP-G2-W02-T001", "CMP-G2-W02-T002"],
    Entity: ["CMP-G2-W02-T001"],
    Person: ["CMP-G2-W02-T003"],
    Organization: ["CMP-G2-W02-T004"],
    PartyAlias: ["CMP-G2-W02-T005"],
    PartyIdentifier: ["CMP-G2-W02-T006"],
    ClientGroup: ["CMP-G2-W02-T007", "CMP-G2-W02-T008"],
    Relationship: ["CMP-G2-W02-T009", "CMP-G2-W02-T011"],
    ContactPoint: ["CMP-G2-W02-T013", "CMP-G2-W02-T014"],
    BillingProfile: ["CMP-G2-W02-T015", "CMP-G2-W02-T016"],
  };
  return mapping[modelType] ?? CMP_G2_TUW_IDS;
}

function requireTenantQuery(query = {}) {
  if (!query.tenant_id) throwValidation("CMP_G2_TENANT_REQUIRED", "tenant_id is required");
  return query.tenant_id;
}

function requireTenantBody(body = {}) {
  const tenantId = body.tenant_id ?? body.principal?.tenant_id;
  if (!tenantId) throwValidation("CMP_G2_TENANT_REQUIRED", "tenant_id is required");
  return tenantId;
}

function safeError(code, reason) {
  return {
    outcome: "blocked",
    safe_error_codes: [code],
    reason,
    tuw_ids: CMP_G2_TUW_IDS,
  };
}

function throwValidation(code, message) {
  const error = new Error(message);
  error.safe_error_code = code;
  error.status_code = 400;
  throw error;
}

function response(status, body) {
  return { status, body };
}

function stableId(prefix, value) {
  return `${prefix}_${createHash("sha256").update(JSON.stringify(value ?? randomUUID())).digest("hex").slice(0, 24)}`;
}
