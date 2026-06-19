// Master Data bounded context (read surface).
//
// Serves the three GET descriptors of contracts/master-data-contract.json v0.21
// (records_search, relationship_lookup, client_group_resolution) with the
// contract's request/response fields, error-code taxonomy, and UI-state catalog.
//
// SYNTHETIC DATA NOTICE: the master-data contract and packages/master-data are
// descriptor-only (no persistence, no real client data). The rows served here come
// from `createMasterDataSyntheticFixture()` exported by packages/master-data
// (fixture tenant `tenant_rp04_synthetic`). Matter-core enrichment comes from
// `createMatterCoreSyntheticFixture()` in packages/matter, which uses a different
// synthetic tenant (`tenant_rp05_synthetic`), so the enrichment is attached as an
// explicitly flagged synthetic crosswalk, not a real tenant-scoped join.
import {
  MASTER_DATA_API_REFERENCE_SURFACE,
  MASTER_DATA_CP156_HIDDEN_SOURCE_FIELDS,
  MASTER_DATA_PROGRAM_CONTRACT,
  MASTER_DATA_UI_SURFACE_STATES,
  createMasterDataSyntheticFixture,
} from "../../../packages/master-data/src/index.js";
import { createMatterCoreSyntheticFixture } from "../../../packages/matter/src/index.js";
import { evaluateRouteDecision, trimItemsByPermission } from "./permission-gate.js";

export const ERROR_CODES = MASTER_DATA_API_REFERENCE_SURFACE.error_code_taxonomy;

const SAFE_REVIEW_REQUIRED_CODE = "MASTER_DATA_REVIEW_REQUIRED";
const SAFE_APPROVAL_REQUIRED_CODE = "MASTER_DATA_APPROVAL_REQUIRED";

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

const masterDataFixture = createMasterDataSyntheticFixture();
const matterFixture = createMatterCoreSyntheticFixture();

const matterRecord = matterFixture.records.find((record) => record.model_type === "Matter");
const matterMembers = matterFixture.records.filter((record) => record.model_type === "MatterMember");

// matter-core v0.1 enrichment, flagged as a synthetic crosswalk (see notice above).
const MATTER_CORE_ENRICHMENT = Object.freeze({
  source_fixture_id: matterFixture.fixture_id,
  synthetic_crosswalk: true,
  matter_id: matterRecord?.matter_id ?? null,
  matter_title: matterRecord?.title ?? null,
  matter_status: matterRecord?.status ?? null,
  member_roles: Object.freeze(matterMembers.map((member) => member.role)),
});

export const MASTER_DATA_BOUNDED_CONTEXT = Object.freeze({
  bounded_context: "master-data",
  contract_ref: "contracts/master-data-contract.json",
  contract_schema_version: "law-firm-os.master-data-contract.v0.21",
  program_id: MASTER_DATA_PROGRAM_CONTRACT.program_id,
  api_surface_id: MASTER_DATA_API_REFERENCE_SURFACE.api_surface_id,
  ui_surface_id: MASTER_DATA_UI_SURFACE_STATES.surface_id,
  endpoints: MASTER_DATA_API_REFERENCE_SURFACE.endpoints,
  data_source: masterDataFixture.fixture_id,
  synthetic_only: true,
  uses_real_client_data: false,
  fail_closed: true,
});

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

function serializeRecord(record) {
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
  out.matter_core_enrichment = MATTER_CORE_ENRICHMENT;
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

function listResponse({ records, query, context, requestId, action, resourceType, supportedFilterKeys }) {
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

  const serialized = scoped.map(serializeRecord);
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

export function handleRecordsSearch({ query, context, requestId }) {
  const records = masterDataFixture.records.filter((record) => record.model_type !== "Relationship");
  return listResponse({
    records,
    query,
    context,
    requestId,
    action: "search",
    resourceType: "master_data_record",
    supportedFilterKeys: SUPPORTED_FILTER_KEYS.records,
  });
}

export function handleRelationshipLookup({ query, context, requestId }) {
  const records = masterDataFixture.records.filter((record) => record.model_type === "Relationship");
  return listResponse({
    records,
    query,
    context,
    requestId,
    action: "search",
    resourceType: "master_data_relationship",
    supportedFilterKeys: SUPPORTED_FILTER_KEYS.relationships,
  });
}

export function handleClientGroupResolution({ clientGroupId, query, context, requestId }) {
  const invalid = validateCommonQuery(query, requestId);
  if (invalid) return invalid;

  const decision = evaluateRouteDecision({
    context,
    resource: {
      tenant_id: query.tenant_id,
      resource_type: "master_data_client_group",
      resource_id: clientGroupId,
    },
    action: "view",
  });
  const gated = gateDecisionResponse(decision, requestId, query.audit_hint_ref);
  if (gated) return gated;

  const group = masterDataFixture.records.find(
    (record) =>
      record.model_type === "ClientGroup" &&
      record.client_group_id === clientGroupId &&
      record.tenant_id === query.tenant_id,
  );
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
    items: [serializeRecord(group).item],
    action: "view",
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
    const entity = masterDataFixture.records.find(
      (record) => record.model_type === "Entity" && record.entity_id === entityId,
    );
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
