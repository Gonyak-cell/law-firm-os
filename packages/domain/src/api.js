import { assertSameTenant } from "./invariants.js";
import { getCoreDomainEntityDefinition } from "./ownership.js";
import { executeCoreDomainWorkflow } from "./workflow.js";

export const CORE_DOMAIN_API_PACK_BINDING = Object.freeze({
  pack_id: "CP00-097",
  planned_pack_id: "CP00-097",
  risk_class: "C",
  unit_count: 150,
  range: "RP01.P02.M06.S07-RP01.P04.M02.S03",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
});

export const CORE_DOMAIN_API_CONTRACT = Object.freeze({
  pack_id: "CP00-097",
  contract_id: "core_domain_synthetic_api_contract",
  source_unit_range: "RP01.P03.M00.S01-RP01.P04.M02.S03",
  accepts_real_client_data: false,
  evaluates_runtime_permission: false,
  writes_audit_event: false,
  writes_product_state: false,
  unauthorized_data_policy: "explicit_visibility_allowlist_only",
  endpoints: Object.freeze([
    "core_domain.workflow.execute",
    "core_domain.documents.list",
    "core_domain.matters.summary",
    "core_domain.evidence.packet",
  ]),
  response_fields: Object.freeze([
    "api_contract_id",
    "endpoint_id",
    "status",
    "data",
    "errors",
    "pagination",
    "permission_evaluated",
    "audit_written",
    "writes_product_state",
    "unauthorized_data_omitted",
  ]),
});

const DEFAULT_VISIBLE_FIELDS = Object.freeze(["tenant_id", "matter_id", "display_name", "status", "document_id"]);
const DEFAULT_PAGE_LIMIT = 25;

function requireApiFields(input, fields) {
  const missing = fields.filter((field) => input?.[field] === undefined || input?.[field] === null || input?.[field] === "");
  if (missing.length > 0) throw new Error(`CoreDomainApiRequest missing required fields: ${missing.join(", ")}`);
}

function primaryIdFor(entityType, record) {
  const definition = getCoreDomainEntityDefinition(entityType);
  return record?.[definition.primary_id] ?? null;
}

function freezeApiResult(result) {
  return Object.freeze({
    ...result,
    data: Object.freeze(result.data ?? []),
    errors: Object.freeze(result.errors ?? []),
    pagination: Object.freeze(result.pagination ?? {}),
  });
}

export function createCoreDomainApiRequest(input) {
  requireApiFields(input, ["endpoint_id", "tenant_id", "actor_user_id", "requested_at"]);
  if (!CORE_DOMAIN_API_CONTRACT.endpoints.includes(input.endpoint_id)) {
    throw new Error(`CoreDomainApiRequest endpoint_id must be one of ${CORE_DOMAIN_API_CONTRACT.endpoints.join(", ")}`);
  }
  if (input.synthetic_only === false) throw new Error("CoreDomainApiRequest must remain synthetic-only in RP01");
  const limit = input.pagination?.limit ?? DEFAULT_PAGE_LIMIT;
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new Error("CoreDomainApiRequest pagination.limit must be an integer from 1 to 100");
  }
  return Object.freeze({
    request_id: input.request_id ?? `api-${input.endpoint_id}`,
    endpoint_id: input.endpoint_id,
    tenant_id: input.tenant_id,
    actor_user_id: input.actor_user_id,
    matter_id: input.matter_id ?? null,
    requested_at: input.requested_at,
    filters: Object.freeze(input.filters ?? {}),
    pagination: Object.freeze({
      limit,
      cursor: input.pagination?.cursor ?? null,
    }),
    visibility: Object.freeze({
      entity_type: input.visibility?.entity_type ?? null,
      visible_fields: Object.freeze(input.visibility?.visible_fields ?? []),
      allowed_record_ids: Object.freeze(input.visibility?.allowed_record_ids ?? []),
    }),
    synthetic_only: true,
  });
}

export function serializeCoreDomainApiRecord(entityType, record, visibility = {}) {
  const recordId = primaryIdFor(entityType, record);
  const allowedRecordIds = visibility.allowed_record_ids ?? [];
  const visibleFields = visibility.visible_fields ?? [];
  if (allowedRecordIds.length === 0 || visibleFields.length === 0) return null;
  if (!allowedRecordIds.includes(recordId)) return null;
  const fields = visibleFields.length > 0 ? visibleFields : DEFAULT_VISIBLE_FIELDS;
  const serialized = {};
  for (const field of fields) {
    if (Object.hasOwn(record, field)) serialized[field] = record[field];
  }
  return Object.freeze(serialized);
}

export function createCoreDomainApiPagination(total_count, request, returned_count = Math.min(total_count, request.pagination.limit)) {
  return Object.freeze({
    limit: request.pagination.limit,
    cursor: request.pagination.cursor,
    returned_count,
    total_count,
    next_cursor: total_count > request.pagination.limit ? "synthetic-next" : null,
  });
}

function summarizeWorkflowForApi(workflow) {
  return Object.freeze({
    workflow_id: workflow.workflow_id,
    status: workflow.status,
    route: workflow.route?.route ?? "blocked",
    state_path: workflow.state_path,
    blocked_claims: workflow.blocked_claims,
    writes_product_state: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
  });
}

export function executeCoreDomainApiContract(input, context = {}) {
  try {
    const request = createCoreDomainApiRequest(input);
    const records = context.records ?? [];
    for (const record of records) assertSameTenant(request, record);

    if (request.endpoint_id === "core_domain.workflow.execute") {
      const workflow = executeCoreDomainWorkflow(context.workflow_request ?? context.fixture_request ?? input.workflow_request, context.workflow_context ?? context.fixture_context ?? {});
      return freezeApiResult({
        api_contract_id: CORE_DOMAIN_API_CONTRACT.contract_id,
        endpoint_id: request.endpoint_id,
        status: workflow.status,
        data: [summarizeWorkflowForApi(workflow)],
        errors: workflow.validation_errors,
        pagination: createCoreDomainApiPagination(1, request),
        permission_evaluated: false,
        audit_written: false,
        writes_product_state: false,
        unauthorized_data_omitted: true,
      });
    }

    const entityType = request.visibility.entity_type ?? context.entity_type ?? "DocumentReference";
    const candidates = records.filter((record) => !request.matter_id || record.matter_id === request.matter_id);
    const serialized = candidates
      .map((record) => serializeCoreDomainApiRecord(entityType, record, request.visibility))
      .filter(Boolean);
    const page = serialized.slice(0, request.pagination.limit);
    const unauthorizedDataOmitted =
      serialized.length < candidates.length ||
      page.some((item, index) => Object.keys(item).length < Object.keys(candidates[index] ?? {}).length);

    return freezeApiResult({
      api_contract_id: CORE_DOMAIN_API_CONTRACT.contract_id,
      endpoint_id: request.endpoint_id,
      status: "completed",
      data: page,
      errors: [],
      pagination: createCoreDomainApiPagination(candidates.length, request, page.length),
      permission_evaluated: false,
      audit_written: false,
      writes_product_state: false,
      unauthorized_data_omitted: unauthorizedDataOmitted,
    });
  } catch (error) {
    return freezeApiResult({
      api_contract_id: CORE_DOMAIN_API_CONTRACT.contract_id,
      endpoint_id: input?.endpoint_id ?? "unknown",
      status: "blocked",
      data: [],
      errors: [error instanceof Error ? error.message : String(error)],
      pagination: { limit: 0, cursor: null, returned_count: 0, total_count: 0, next_cursor: null },
      permission_evaluated: false,
      audit_written: false,
      writes_product_state: false,
      unauthorized_data_omitted: true,
    });
  }
}
