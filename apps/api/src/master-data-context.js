// Master Data bounded context.
//
// Serves the three GET operations of contracts/master-data-contract.json v0.21
// plus the ClientGroup registration review/write extension through the same
// repository, permission, audit, and UI-state boundaries.
import { createHash } from "node:crypto";

import {
  MASTER_DATA_API_REFERENCE_SURFACE,
  MASTER_DATA_CP156_HIDDEN_SOURCE_FIELDS,
  MASTER_DATA_PROGRAM_CONTRACT,
  MASTER_DATA_UI_SURFACE_STATES,
  createClientRegistrationService,
  createMasterDataRepository,
  createMasterDataSyntheticFixture,
} from "../../../packages/master-data/src/index.js";
import { createMatterCoreSyntheticFixture } from "../../../packages/matter/src/index.js";
import { evaluateRouteDecision, trimItemsByPermission } from "./permission-gate.js";

export const ERROR_CODES = MASTER_DATA_API_REFERENCE_SURFACE.error_code_taxonomy;

const SAFE_REVIEW_REQUIRED_CODE = "MASTER_DATA_REVIEW_REQUIRED";
const SAFE_APPROVAL_REQUIRED_CODE = "MASTER_DATA_APPROVAL_REQUIRED";
const CLIENT_REGISTRATION_ERROR_CODES = Object.freeze({
  restricted_duplicate: "MASTER_DATA_CLIENT_REGISTRATION_RESTRICTED_DUPLICATE",
  runtime_unavailable: "MASTER_DATA_CLIENT_REGISTRATION_RUNTIME_UNAVAILABLE",
});
const CLIENT_REGISTRATION_CONFLICT_CODES = new Set([
  "MASTER_DATA_CLIENT_REGISTRATION_REVIEW_DIGEST_MISMATCH",
  "MASTER_DATA_CLIENT_REGISTRATION_DISTINCT_CONFIRMATION_REQUIRED",
  "MASTER_DATA_CLIENT_REGISTRATION_UNLINKED_DUPLICATE",
  "MASTER_DATA_CLIENT_REGISTRATION_IDENTIFIER_CONFLICT",
  "MASTER_DATA_CLIENT_REGISTRATION_IDEMPOTENCY_CONFLICT",
  "LAWOS_IDEMPOTENCY_CONFLICT",
]);

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

const RECORD_MODEL_TYPES = Object.freeze([
  "Entity",
  "Person",
  "Organization",
  "ClientGroup",
  "ContactPoint",
  "BillingProfile",
]);

const SUPPORTED_FILTER_KEYS = Object.freeze({
  records: ["status", "model_type", "owner_user_id", "entity_kind"],
  relationships: ["status", "relationship_type", "direction", "from_entity_id", "to_entity_id"],
});

export const MASTER_DATA_RUNTIME_SEED = createMasterDataSyntheticFixture();
const matterSeed = createMatterCoreSyntheticFixture();

const matterRecord = matterSeed.records.find((record) => record.model_type === "Matter");
const matterMembers = matterSeed.records.filter((record) => record.model_type === "MatterMember");

const DEFAULT_MATTER_CORE_ENRICHMENT = Object.freeze({
  source_fixture_id: matterSeed.fixture_id,
  runtime_seed_crosswalk: true,
  matter_id: matterRecord?.matter_id ?? null,
  matter_title: matterRecord?.title ?? null,
  matter_status: matterRecord?.status ?? null,
  member_roles: Object.freeze(matterMembers.map((member) => member.role)),
});

export function createMasterDataRuntimeContext({
  repository = createMasterDataRepository({ seedRecords: MASTER_DATA_RUNTIME_SEED.records }),
  matterCoreEnrichment = DEFAULT_MATTER_CORE_ENRICHMENT,
} = {}) {
  return Object.freeze({
    repository,
    seed_ref: MASTER_DATA_RUNTIME_SEED.fixture_id,
    matter_core_enrichment: matterCoreEnrichment,
  });
}

const DEFAULT_MASTER_DATA_RUNTIME = createMasterDataRuntimeContext();

export const MASTER_DATA_BOUNDED_CONTEXT = Object.freeze({
  bounded_context: "master-data",
  contract_ref: "contracts/master-data-contract.json",
  contract_schema_version: "law-firm-os.master-data-contract.v0.21",
  program_id: MASTER_DATA_PROGRAM_CONTRACT.program_id,
  api_surface_id: MASTER_DATA_API_REFERENCE_SURFACE.api_surface_id,
  ui_surface_id: MASTER_DATA_UI_SURFACE_STATES.surface_id,
  endpoints: MASTER_DATA_API_REFERENCE_SURFACE.endpoints,
  client_registration_endpoints: Object.freeze({
    review: Object.freeze({
      method: "POST",
      path: "/master-data/client-groups/review",
    }),
    create: Object.freeze({
      method: "POST",
      path: "/master-data/client-groups",
    }),
  }),
  data_source: "master_data_runtime_repository",
  runtime_persistence: "file_backed_repository",
  uses_real_client_data: true,
  fail_closed: true,
});

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function registrationErrorResponse(
  status,
  requestId,
  code,
  auditHintRef = null,
  { outcome = "blocked", uiState = null } = {},
) {
  return {
    status,
    body: {
      request_id: requestId,
      outcome,
      item: null,
      safe_error_codes: [code],
      audit_hint_ref: auditHintRef,
      ui_state: uiState,
      count_leak_prevented: true,
      production_ready_claim: false,
    },
  };
}

function validateClientRegistrationBody(body, requestId) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return registrationErrorResponse(400, requestId, ERROR_CODES.validation_error);
  }
  if (!text(body.tenant_id)) {
    return registrationErrorResponse(400, requestId, ERROR_CODES.tenant_required);
  }
  if (!text(body.permission_ref)) {
    return registrationErrorResponse(400, requestId, ERROR_CODES.permission_required);
  }
  if (!text(body.audit_hint_ref)) {
    return registrationErrorResponse(400, requestId, ERROR_CODES.audit_hint_required);
  }
  if (!body.client || typeof body.client !== "object" || Array.isArray(body.client)) {
    return registrationErrorResponse(
      400,
      requestId,
      ERROR_CODES.validation_error,
      text(body.audit_hint_ref) || null,
    );
  }
  return null;
}

function registrationRouteGate({ body, context, requestId, action }) {
  const invalid = validateClientRegistrationBody(body, requestId);
  if (invalid) return invalid;
  const decision = evaluateRouteDecision({
    context,
    resource: {
      tenant_id: text(body.tenant_id),
      resource_type: "master_data_client_group",
    },
    action,
  });
  return gateDecisionResponse(
    decision,
    requestId,
    text(body.audit_hint_ref),
  );
}

function registrationInput({ body, context }) {
  const client = body.client;
  return {
    tenant_id: context.principal.tenant_id,
    actor_id: context.principal.user_id,
    permission_ref: text(body.permission_ref),
    audit_hint_ref: text(body.audit_hint_ref),
    client_type: text(client.client_type),
    display_name: text(client.display_name),
    legal_form: text(client.legal_form) || null,
    registration_number: text(client.registration_number) || null,
    email: text(client.email) || null,
    phone: text(client.phone) || null,
    depositor_alias: text(client.depositor_alias) || null,
  };
}

function safeCandidate(candidate) {
  return Object.freeze({
    client_group_id: text(candidate.client_group_id),
    display_name: text(candidate.display_name),
    client_type: text(candidate.client_type),
    reasons: Object.freeze(
      (candidate.reason_codes ?? candidate.reasons ?? [])
        .filter((reason) => typeof reason === "string" && reason.trim())
        .map((reason) => reason.trim()),
    ),
  });
}

function permissionContextFingerprint({ context, tenantId }) {
  const principal = context?.principal ?? {};
  return createHash("sha256")
    .update(JSON.stringify({
      tenant_id: tenantId,
      principal: {
        user_id: principal.user_id ?? null,
        tenant_id: principal.tenant_id ?? null,
        role_profile_id: principal.role_profile_id ?? null,
        role_ids: principal.role_ids ?? [],
        group_ids: principal.group_ids ?? [],
        scopes: principal.scopes ?? [],
        hrx_scopes: principal.hrx_scopes ?? [],
        highest_privilege: principal.highest_privilege === true,
      },
      rules: context?.rules ?? [],
      object_acl: context?.object_acl ?? [],
    }))
    .digest("hex");
}

function buildRegistrationPermissionProof({
  context,
  tenantId,
  visibleCandidates,
  omittedCount,
}) {
  const routeDecision = evaluateRouteDecision({
    context,
    resource: {
      tenant_id: tenantId,
      resource_type: "master_data_client_group",
    },
    action: "master_data:client:review",
  });
  return Object.freeze({
    principal_id: text(context?.principal?.user_id),
    principal_tenant_id: text(context?.principal?.tenant_id),
    role_ids: Object.freeze(
      (context?.principal?.role_ids ?? [])
        .filter((roleId) => typeof roleId === "string" && roleId.trim() !== "")
        .map((roleId) => roleId.trim())
        .sort(),
    ),
    permission_action: "analytics:client:read",
    permission_decision: omittedCount > 0 ? "allow_partial" : "allow",
    route_action: "master_data:client:review",
    route_effect: text(routeDecision.effect),
    route_reason: text(routeDecision.reason),
    route_rule_id: text(routeDecision.matched_rule_id),
    hidden_candidate_presence: omittedCount > 0,
    visible_candidate_snapshot: Object.freeze(
      visibleCandidates.map((candidate) => safeCandidate(candidate)),
    ),
    permission_context_fingerprint: permissionContextFingerprint({ context, tenantId }),
  });
}

function permissionTrimmedRegistrationReview({ review, context, tenantId, withProof = false }) {
  const candidates = (
    review.client_group_candidates
    ?? review.visible_candidates
    ?? review.candidates
    ?? []
  ).map((candidate) => ({
    ...safeCandidate(candidate),
    tenant_id: tenantId,
    resource_id: candidate.client_group_id,
  }));
  const { allowed, omittedCount } = trimItemsByPermission({
    context,
    items: candidates,
    action: "analytics:client:read",
    resourceType: "ClientGroup",
  });
  const visibleCandidates = allowed.map(({ tenant_id, resource_id, ...candidate }) =>
    Object.freeze(candidate));
  const hasRestrictedCandidates =
    omittedCount > 0
    || review.has_unmatched_duplicate_candidates === true;
  const hasIdentifierConflict = review.has_exact_identifier_conflict === true;
  const item = Object.freeze({
    review_digest: text(review.review_digest),
    candidates: Object.freeze(visibleCandidates),
    has_restricted_candidates: hasRestrictedCandidates,
    can_create: !hasRestrictedCandidates && !hasIdentifierConflict,
    requires_distinct_confirmation: visibleCandidates.length > 0,
  });
  if (!withProof) return item;
  return Object.freeze({
    item,
    permission_proof: buildRegistrationPermissionProof({
      context,
      tenantId,
      visibleCandidates,
      omittedCount,
    }),
  });
}

function registrationReviewResponse({
  requestId,
  auditHintRef,
  item,
  restrictedCode = null,
  status = 200,
}) {
  const reviewRequired = item.can_create !== true;
  return {
    status,
    body: {
      request_id: requestId,
      outcome: reviewRequired ? "review_required" : "passed",
      item,
      safe_error_codes: restrictedCode ? [restrictedCode] : [],
      audit_hint_ref: auditHintRef,
      ui_state: reviewRequired ? "review_required" : null,
      count_leak_prevented: true,
      production_ready_claim: false,
    },
  };
}

function clientRegistrationError(error, requestId, auditHintRef) {
  const code = text(error?.code) || text(error?.safe_error_code);
  if (
    code === "MASTER_DATA_CLIENT_REGISTRATION_INVALID_INPUT"
    || error?.status === 400
  ) {
    return registrationErrorResponse(
      400,
      requestId,
      code || ERROR_CODES.validation_error,
      auditHintRef,
    );
  }
  if (CLIENT_REGISTRATION_CONFLICT_CODES.has(code)) {
    const safeCode = code === "LAWOS_IDEMPOTENCY_CONFLICT"
      ? "MASTER_DATA_CLIENT_REGISTRATION_IDEMPOTENCY_CONFLICT"
      : code;
    return registrationErrorResponse(
      409,
      requestId,
      safeCode,
      auditHintRef,
      { outcome: "review_required", uiState: "review_required" },
    );
  }
  if (error instanceof TypeError) {
    return registrationErrorResponse(
      400,
      requestId,
      ERROR_CODES.validation_error,
      auditHintRef,
    );
  }
  return registrationErrorResponse(
    503,
    requestId,
    CLIENT_REGISTRATION_ERROR_CODES.runtime_unavailable,
    auditHintRef,
  );
}

function clientRegistrationCreateSuccess({ result, body, requestId, auditHintRef }) {
  const clientGroupId = text(
    result.client_group_id
    ?? result.client_group?.client_group_id
    ?? result.item?.client_group_id,
  );
  if (!clientGroupId) throw new Error("Client registration result is incomplete");
  const replayed = result.idempotent_replay === true || result.replayed === true;
  const client = body.client;
  return {
    status: replayed ? 200 : 201,
    body: {
      request_id: requestId,
      outcome: "passed",
      item: {
        client_group_id: clientGroupId,
        display_name: text(result.display_name) || text(client.display_name),
        client_type: text(result.client_type) || text(client.client_type),
        depositor_alias_saved:
          result.depositor_alias_saved === true
          || Boolean(text(client.depositor_alias)),
        registration_number_saved:
          result.registration_number_saved === true
          || (
            text(client.client_type) === "organization"
            && Boolean(text(client.registration_number))
          ),
        contact_saved:
          result.contact_saved === true
          || (
            text(client.client_type) === "person"
            && Boolean(text(client.email) || text(client.phone))
          ),
      },
      replayed,
      audit_event_ref: text(
        result.audit_event_id
        ?? result.audit_event_ref
        ?? result.audit_event?.event_id,
      ) || null,
      safe_error_codes: [],
      audit_hint_ref: auditHintRef,
      ui_state: null,
      count_leak_prevented: true,
      production_ready_claim: false,
    },
  };
}

function primaryIdOf(record) {
  switch (record.model_type) {
    case "Entity": return record.entity_id;
    case "Person": return record.person_id;
    case "Organization": return record.organization_id;
    case "ClientGroup": return record.client_group_id;
    case "Relationship": return record.relationship_id;
    case "ContactPoint": return record.contact_point_id;
    case "BillingProfile": return record.billing_profile_id;
    default: return null;
  }
}

function serializeRecord(record, runtime) {
  const out = {};
  const omitted = [];
  for (const [key, value] of Object.entries(record)) {
    if (MASTER_DATA_CP156_HIDDEN_SOURCE_FIELDS.includes(key)) {
      omitted.push(key);
      continue;
    }
    out[key] = value;
  }
  out.resource_id = primaryIdOf(record);
  out.matter_core_enrichment = runtime.matter_core_enrichment;
  return { item: out, omitted };
}

function errorResponse(status, requestId, codes, extra = {}) {
  return {
    status,
    body: {
      request_id: requestId,
      outcome: "blocked",
      items: [],
      page_info: null,
      safe_error_codes: codes,
      omitted_fields: [],
      audit_hint_ref: extra.audit_hint_ref ?? null,
      ui_state: extra.ui_state ?? null,
    },
  };
}

function validateCommonQuery(query, requestId) {
  if (!query.tenant_id) {
    return errorResponse(400, requestId, [ERROR_CODES.tenant_required]);
  }
  if (!query.permission_ref) {
    return errorResponse(400, requestId, [ERROR_CODES.permission_required]);
  }
  if (!query.audit_hint_ref) {
    return errorResponse(400, requestId, [ERROR_CODES.audit_hint_required], {
      audit_hint_ref: null,
    });
  }
  return null;
}

function parseLimit(rawLimit, requestId) {
  if (rawLimit === undefined || rawLimit === null || rawLimit === "") {
    return { limit: DEFAULT_LIMIT };
  }
  const limit = Number(rawLimit);
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    return { error: errorResponse(400, requestId, [ERROR_CODES.validation_error]) };
  }
  return { limit };
}

function parseCursor(rawCursor, requestId) {
  if (rawCursor === undefined || rawCursor === null || rawCursor === "") return { offset: 0 };
  const offset = Number(rawCursor);
  if (!Number.isInteger(offset) || offset < 0) {
    return { error: errorResponse(400, requestId, [ERROR_CODES.validation_error]) };
  }
  return { offset };
}

function parseFilters(rawFilters, supportedKeys, requestId) {
  if (rawFilters === undefined || rawFilters === null || rawFilters === "") return { filters: {} };
  let parsed;
  try {
    parsed = JSON.parse(rawFilters);
  } catch {
    return { error: errorResponse(400, requestId, [ERROR_CODES.validation_error]) };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { error: errorResponse(400, requestId, [ERROR_CODES.validation_error]) };
  }
  for (const key of Object.keys(parsed)) {
    if (!supportedKeys.includes(key)) {
      return { error: errorResponse(400, requestId, [ERROR_CODES.unsupported_filter]) };
    }
  }
  return { filters: parsed };
}

function gateDecisionResponse(decision, requestId, auditHintRef) {
  if (decision.effect === "allow") return null;
  if (decision.effect === "review_required") {
    // UI-state catalog: show_review_required_badge_without_dispatch — items withheld,
    // no review route is dispatched by this read API.
    return {
      status: 200,
      body: {
        request_id: requestId,
        outcome: "review_required",
        items: [],
        page_info: null,
        safe_error_codes: [SAFE_REVIEW_REQUIRED_CODE],
        omitted_fields: [],
        audit_hint_ref: auditHintRef,
        ui_state: "review_required",
      },
    };
  }
  if (decision.effect === "approval_required") {
    return {
      status: 200,
      body: {
        request_id: requestId,
        outcome: "approval_required",
        items: [],
        page_info: null,
        safe_error_codes: [SAFE_APPROVAL_REQUIRED_CODE],
        omitted_fields: [],
        audit_hint_ref: auditHintRef,
        ui_state: "review_required",
      },
    };
  }
  // deny (including the fail-closed default): omit items, safe error codes only.
  return errorResponse(403, requestId, [ERROR_CODES.unauthorized_omission], {
    audit_hint_ref: auditHintRef,
    ui_state: "denied",
  });
}

function applyFilters(records, filters) {
  return records.filter((record) =>
    Object.entries(filters).every(([key, value]) => record[key] === value),
  );
}

function listResponse({ records, query, context, requestId, action, resourceType, supportedFilterKeys, runtime }) {
  const invalid = validateCommonQuery(query, requestId);
  if (invalid) return invalid;

  const { limit, error: limitError } = parseLimit(query.limit, requestId);
  if (limitError) return limitError;
  const { offset, error: cursorError } = parseCursor(query.cursor, requestId);
  if (cursorError) return cursorError;
  const { filters, error: filterError } = parseFilters(query.filters, supportedFilterKeys, requestId);
  if (filterError) return filterError;

  const decision = evaluateRouteDecision({
    context,
    resource: { tenant_id: query.tenant_id, resource_type: resourceType },
    action,
  });
  const gated = gateDecisionResponse(decision, requestId, query.audit_hint_ref);
  if (gated) return gated;

  // Tenant scoping happens before trimming so cross-tenant rows are out of scope
  // entirely (never counted, never leaked).
  let scoped = records.filter((record) => record.tenant_id === query.tenant_id);
  if (query.model_type) {
    if (!RECORD_MODEL_TYPES.includes(query.model_type)) {
      return errorResponse(400, requestId, [ERROR_CODES.validation_error]);
    }
    scoped = scoped.filter((record) => record.model_type === query.model_type);
  }
  scoped = applyFilters(scoped, filters);

  const serialized = scoped.map((record) => serializeRecord(record, runtime));
  const omittedFields = [...new Set(serialized.flatMap((entry) => entry.omitted))];
  const { allowed, omittedCount } = trimItemsByPermission({
    context,
    items: serialized.map((entry) => entry.item),
    action,
    resourceType,
  });

  const page = allowed.slice(offset, offset + limit);
  const nextOffset = offset + limit;
  return {
    status: 200,
    body: {
      request_id: requestId,
      outcome: "passed",
      items: page,
      page_info: {
        limit,
        cursor: query.cursor ?? null,
        next_cursor: nextOffset < allowed.length ? String(nextOffset) : null,
        returned_count: page.length,
        omitted_item_count: omittedCount,
      },
      safe_error_codes: [],
      omitted_fields: omittedFields,
      audit_hint_ref: query.audit_hint_ref,
      ui_state: allowed.length === 0 ? "empty" : null,
    },
  };
}

export function handleRecordsSearch({ query, context, requestId, runtime = DEFAULT_MASTER_DATA_RUNTIME }) {
  const records = runtime.repository.list({ tenant_id: query.tenant_id }).filter((record) => record.model_type !== "Relationship");
  return listResponse({
    records,
    query,
    context,
    requestId,
    action: "master_data:search",
    resourceType: "master_data_record",
    supportedFilterKeys: SUPPORTED_FILTER_KEYS.records,
    runtime,
  });
}

export function handleRelationshipLookup({ query, context, requestId, runtime = DEFAULT_MASTER_DATA_RUNTIME }) {
  const records = runtime.repository.list({ tenant_id: query.tenant_id, model_type: "Relationship" });
  return listResponse({
    records,
    query,
    context,
    requestId,
    action: "master_data:search",
    resourceType: "master_data_relationship",
    supportedFilterKeys: SUPPORTED_FILTER_KEYS.relationships,
    runtime,
  });
}

export function handleClientGroupResolution({ clientGroupId, query, context, requestId, runtime = DEFAULT_MASTER_DATA_RUNTIME }) {
  const invalid = validateCommonQuery(query, requestId);
  if (invalid) return invalid;

  const decision = evaluateRouteDecision({
    context,
    resource: {
      tenant_id: query.tenant_id,
      resource_type: "master_data_client_group",
      resource_id: clientGroupId,
    },
    action: "master_data:view",
  });
  const gated = gateDecisionResponse(decision, requestId, query.audit_hint_ref);
  if (gated) return gated;

  const group = runtime.repository.get({
    tenant_id: query.tenant_id,
    model_type: "ClientGroup",
    id: clientGroupId,
  });
  if (!group) {
    // Unknown and out-of-tenant ids are indistinguishable: empty-state shape, no existence leak.
    return {
      status: 404,
      body: {
        request_id: requestId,
        outcome: "passed",
        items: [],
        page_info: null,
        safe_error_codes: [],
        omitted_fields: [],
        audit_hint_ref: query.audit_hint_ref,
        ui_state: "empty",
      },
    };
  }

  const { allowed } = trimItemsByPermission({
    context,
    items: [serializeRecord(group, runtime).item],
    action: "master_data:view",
    resourceType: "master_data_client_group",
  });
  if (allowed.length === 0) {
    return errorResponse(403, requestId, [ERROR_CODES.unauthorized_omission], {
      audit_hint_ref: query.audit_hint_ref,
      ui_state: "denied",
    });
  }

  const item = allowed[0];
  item.members = group.member_entity_ids.map((entityId) => {
    const entity = runtime.repository.get({
      tenant_id: query.tenant_id,
      model_type: "Entity",
      id: entityId,
    });
    return {
      entity_id: entityId,
      display_name: entity?.display_name ?? null,
      entity_kind: entity?.entity_kind ?? null,
      status: entity?.status ?? null,
    };
  });

  const reviewRequired = group.status === "review_required";
  return {
    status: 200,
    body: {
      request_id: requestId,
      outcome: reviewRequired ? "review_required" : "passed",
      items: [item],
      page_info: null,
      safe_error_codes: reviewRequired ? [SAFE_REVIEW_REQUIRED_CODE] : [],
      omitted_fields: [],
      audit_hint_ref: query.audit_hint_ref,
      ui_state: reviewRequired ? "review_required" : null,
    },
  };
}

export function handleClientGroupRegistrationReview({
  body,
  context,
  requestId,
  runtime = DEFAULT_MASTER_DATA_RUNTIME,
} = {}) {
  const gated = registrationRouteGate({
    body,
    context,
    requestId,
    action: "master_data:client:review",
  });
  if (gated) return gated;

  try {
    const input = registrationInput({ body, context });
    const service = createClientRegistrationService({
      repository: runtime.repository,
      tenant_id: input.tenant_id,
      actor_id: input.actor_id,
    });

    const rawReview = service.review(input);
    const trimmedReview = permissionTrimmedRegistrationReview({
      review: rawReview,
      context,
      tenantId: input.tenant_id,
      withProof: true,
    });
    const review = service.review(input, {
      permission_proof: trimmedReview.permission_proof,
    });
    const item = permissionTrimmedRegistrationReview({
      review,
      context,
      tenantId: input.tenant_id,
    });
    const restrictedCode = item.has_restricted_candidates
      ? CLIENT_REGISTRATION_ERROR_CODES.restricted_duplicate
      : null;
    return registrationReviewResponse({
      requestId,
      auditHintRef: input.audit_hint_ref,
      item,
      restrictedCode,
    });
  } catch (error) {
    return clientRegistrationError(
      error,
      requestId,
      text(body?.audit_hint_ref) || null,
    );
  }
}

export function handleClientGroupRegistrationCreate({
  body,
  context,
  requestId,
  runtime = DEFAULT_MASTER_DATA_RUNTIME,
} = {}) {
  const gated = registrationRouteGate({
    body,
    context,
    requestId,
    action: "master_data:client:create",
  });
  if (gated) return gated;
  const auditHintRef = text(body.audit_hint_ref);
  if (!text(body.idempotency_key) || !text(body.review_digest)) {
    return registrationErrorResponse(
      400,
      requestId,
      ERROR_CODES.validation_error,
      auditHintRef,
    );
  }

  try {
    const input = {
      ...registrationInput({ body, context }),
      idempotency_key: text(body.idempotency_key),
      review_digest: text(body.review_digest),
      confirm_distinct_client: body.confirm_distinct_client === true,
    };
    const service = createClientRegistrationService({
      repository: runtime.repository,
      tenant_id: input.tenant_id,
      actor_id: input.actor_id,
    });

    // A successful command is replay-safe even if the current duplicate or
    // object-ACL snapshot has changed. Keep the signed create route gate above,
    // then let the service perform its authoritative fingerprint/actor check
    // before consulting the current review state for a new idempotency key.
    const existingIdempotency = typeof runtime.repository.getIdempotency === "function"
      ? runtime.repository.getIdempotency({
          tenant_id: input.tenant_id,
          idempotency_key: input.idempotency_key,
        })
      : undefined;
    if (existingIdempotency) {
      const result = service.create(input);
      return clientRegistrationCreateSuccess({
        result,
        body,
        requestId,
        auditHintRef,
      });
    }

    const rawReview = service.review(input);
    const trimmedReview = permissionTrimmedRegistrationReview({
      review: rawReview,
      context,
      tenantId: input.tenant_id,
      withProof: true,
    });
    const review = service.review(input, {
      permission_proof: trimmedReview.permission_proof,
    });
    const reviewItem = permissionTrimmedRegistrationReview({
      review,
      context,
      tenantId: input.tenant_id,
    });
    if (reviewItem.has_restricted_candidates) {
      return registrationReviewResponse({
        requestId,
        auditHintRef,
        item: reviewItem,
        restrictedCode: CLIENT_REGISTRATION_ERROR_CODES.restricted_duplicate,
        status: 409,
      });
    }

    const result = service.create({
      ...input,
      permission_proof: trimmedReview.permission_proof,
    });
    return clientRegistrationCreateSuccess({
      result,
      body,
      requestId,
      auditHintRef,
    });
  } catch (error) {
    return clientRegistrationError(error, requestId, auditHintRef);
  }
}
