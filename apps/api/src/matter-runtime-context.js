import {
  createMatterActivityCalendarChannelService,
  createMatterCoreSyntheticFixture,
  createMatterDocumentEmailBuilderService,
  createMatterRepository,
} from "../../../packages/matter/src/index.js";
import { addMatterTeamMember } from "../../../packages/matter/src/staffing-service.js";
import { appendMatterAuditEvent } from "../../../packages/matter/src/audit.js";
import { openMatterTransaction } from "../../../packages/matter/src/opening-service.js";
import { openMatterWithVault } from "../../../packages/matter/src/matter-opening-orchestrator.js";
import { createMatterVaultSummary, serializeMatterVaultLinkSafe } from "../../../packages/matter/src/matter-vault-link.js";
import { getMatterVaultLink } from "../../../packages/matter/src/matter-vault-link-repository.js";
import { buildMatterTimelineReadModel } from "../../../packages/matter/src/timeline-read-model.js";
import { createMatterClientReportProjection } from "../../../packages/matter/src/client-report.js";
import { uploadDocument } from "../../../packages/dms/src/document-service.js";
import { serializeFileObjectSafe } from "../../../packages/dms/src/file-object-service.js";
import { evaluateRouteDecision, trimItemsByPermission } from "./permission-gate.js";

export const MATTER_API_ERROR_CODES = Object.freeze({
  tenant_required: "MATTER_TENANT_REQUIRED",
  permission_required: "MATTER_PERMISSION_REQUIRED",
  audit_hint_required: "MATTER_AUDIT_HINT_REQUIRED",
  validation_error: "MATTER_API_VALIDATION_ERROR",
  unauthorized_omission: "MATTER_UNAUTHORIZED_OMISSION",
  review_required: "MATTER_REVIEW_REQUIRED",
  approval_required: "MATTER_APPROVAL_REQUIRED",
  not_found: "MATTER_NOT_FOUND",
});

export const MATTER_BOUNDED_CONTEXT = Object.freeze({
  bounded_context: "matter-core",
  contract_ref: "contracts/matter-core-contract.json",
  contract_schema_version: "law-firm-os.matter-core-contract.v0.1",
  endpoints: Object.freeze([
    "GET /api/matters",
    "GET /api/matters/:matter_id",
    "GET /api/matters/:matter_id/command-center",
    "GET /api/matters/:matter_id/vault-summary",
    "GET /api/matters/:matter_id/timeline",
    "GET /api/matters/:matter_id/activities",
    "POST /api/matters/:matter_id/activities",
    "PATCH /api/matters/:matter_id/activities/:activity_id",
    "GET /api/matters/:matter_id/calendar-events",
    "POST /api/matters/:matter_id/calendar-events",
    "PATCH /api/matters/:matter_id/calendar-events/:event_id",
    "GET /api/matters/:matter_id/deadlines",
    "POST /api/matters/:matter_id/deadlines/:deadline_id/confirm-change",
    "GET /api/matters/:matter_id/channel",
    "POST /api/matters/:matter_id/channel/messages",
    "POST /api/matters/:matter_id/channel/provider-sync",
    "GET /api/matters/:matter_id/document-templates",
    "POST /api/matters/:matter_id/builder-drafts",
    "PATCH /api/matters/:matter_id/builder-drafts/:draft_id",
    "GET /api/matters/:matter_id/builder-drafts/:draft_id/preview",
    "POST /api/matters/:matter_id/builder-drafts/:draft_id/approval-requests",
    "GET /api/matters/:matter_id/builder-approval-requests",
    "POST /api/matters/:matter_id/builder-drafts/:draft_id/publish-to-vault",
    "POST /api/matters/:matter_id/email-drafts",
    "PATCH /api/matters/:matter_id/email-drafts/:draft_id",
    "POST /api/matters/:matter_id/email-drafts/:draft_id/send",
    "GET /api/matters/list-views",
    "GET /api/matters/recently-viewed",
    "PATCH /api/matters/:matter_id",
    "POST /api/matters/openings",
    "POST /api/matters/list-views",
    "POST /api/matters/bulk/status-transitions",
    "POST /api/matters/:matter_id/documents",
    "POST /api/matters/:matter_id/owner-change",
    "POST /api/matters/:matter_id/team-members",
    "POST /api/matters/:matter_id/status-transitions",
    "POST /api/matters/:matter_id/recently-viewed",
    "GET /api/matters/audit",
  ]),
  data_source: "matter_runtime_repository",
  runtime_persistence: "file_backed_repository",
  runtime_write_ready: true,
  r5_r6_owner_decision_ready: true,
  production_ready_claim: false,
  fail_closed: true,
});

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;
const MAX_BULK_MATTERS = 25;
const DEFAULT_TENANT = "tenant_rp05_synthetic";
const ALLOWED_MATTER_STATUS_TRANSITIONS = new Set(["opening", "open", "closed"]);
const ALLOWED_MATTER_LIST_VIEW_STATUSES = new Set(["all", "opening", "open", "closed", "review_required"]);
const ALLOWED_MATTER_INLINE_WIP_STATUSES = new Set(["not_started", "opening_wip_clear", "review_required", "completed"]);
const ALLOWED_MATTER_INLINE_RISK_LEVELS = new Set(["standard", "elevated", "high"]);
const DEFAULT_MATTER_LIST_VIEWS = Object.freeze([
  Object.freeze({ list_view_id: "matter_view_all", label: "전체 Matter", filter: Object.freeze({ status: "all" }), sort: "updated_desc" }),
  Object.freeze({ list_view_id: "matter_view_opening", label: "개시 중", filter: Object.freeze({ status: "opening" }), sort: "updated_desc" }),
  Object.freeze({ list_view_id: "matter_view_closed", label: "종료", filter: Object.freeze({ status: "closed" }), sort: "updated_desc" }),
]);

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function createMatterRuntimeSeed() {
  const fixture = createMatterCoreSyntheticFixture();
  const records = fixture.records.map((record) => {
    if (record.model_type === "Matter") {
      return {
        ...record,
        matter_code: "AMIC/general/합성개시",
        matter_name: record.title,
        matter_number: "M-TENANT-RP05-0001",
        client_display_name: "AMIC synthetic client",
        matter_type_english: "general",
        matter_detail_type_korean: "합성개시",
        source_revision: "runtime-seed-rp05",
        legal_client_party_id: "party_rp04_amic",
        billing_client_party_id: "party_rp04_amic",
        dms_workspace_id: "dms_workspace_rp05_synthetic",
        billing_ledger_id: "billing_ledger_rp05_synthetic",
        document_count: 0,
        wip_status: "opening_wip_clear",
        risk_level: "standard",
        opened_at: record.opened_at ?? "2026-06-09T00:00:00.000Z",
      };
    }
    if (record.model_type === "MatterMember") {
      return {
        ...record,
        employee_id: "emp-001",
      };
    }
    return record;
  });
  records.push({
    model_type: "MatterClient",
    tenant_id: fixture.tenant_id,
    client_id: "client_rp05_amic",
    client_display_name: "AMIC synthetic client",
    client_short_name: "AMIC",
    status: "active",
    source_revision: "runtime-seed-rp05",
    created_by: "user_rp05_owner",
    created_at: "2026-06-09T00:00:00.000Z",
    updated_by: "user_rp05_owner",
    updated_at: "2026-06-09T00:00:00.000Z",
  });
  records.push({
    model_type: "Matter",
    matter_id: "matter_rp05_silent_wall",
    tenant_id: fixture.tenant_id,
    client_id: "client_rp05_silent",
    matter_code: "Silent/general/윤리장벽",
    matter_name: "Silent ethical wall matter",
    client_display_name: "Silent synthetic client",
    matter_type_english: "general",
    matter_detail_type_korean: "윤리장벽",
    source_revision: "runtime-seed-rp05",
    legal_client_party_id: "party_rp05_silent",
    billing_client_party_id: "party_rp05_silent",
    title: "Silent ethical wall matter",
    status: "open",
    created_by: "user_rp05_owner",
    created_at: "2026-06-09T00:05:00.000Z",
    matter_number: "M-TENANT-RP05-0002",
    permission_envelope_id: "perm_rp05_silent_matter",
    audit_trace_id: "audit_rp05_silent_matter",
    document_count: 0,
    wip_status: "ethical_wall",
    risk_level: "restricted",
    silent: true,
  });
  for (const view of DEFAULT_MATTER_LIST_VIEWS) {
    records.push({
      model_type: "MatterListView",
      resource_id: view.list_view_id,
      tenant_id: fixture.tenant_id,
      list_view_id: view.list_view_id,
      label: view.label,
      filter: view.filter,
      sort: view.sort,
      system_view: true,
      owner_user_id: null,
      created_at: "2026-06-20T00:00:00.000Z",
      updated_at: "2026-06-20T00:00:00.000Z",
    });
  }
  return Object.freeze({
    ...fixture,
    records: Object.freeze(records),
  });
}

export const MATTER_RUNTIME_SEED = createMatterRuntimeSeed();

export const MATTER_EMPLOYEE_DIRECTORY_SEED = Object.freeze([
  Object.freeze({
    tenant_id: DEFAULT_TENANT,
    employee_id: "emp-001",
    user_id: "user_rp05_owner",
    display_name: "Synthetic Responsible Attorney",
    status: "active",
    availability: "available",
  }),
  Object.freeze({
    tenant_id: DEFAULT_TENANT,
    employee_id: "emp-002",
    user_id: "user_rp05_associate",
    display_name: "Synthetic Associate",
    status: "active",
    availability: "available",
  }),
  Object.freeze({
    tenant_id: DEFAULT_TENANT,
    employee_id: "emp-offboarded",
    user_id: "user_rp05_offboarded",
    display_name: "Offboarded Employee",
    status: "offboarded",
    availability: "unavailable",
  }),
]);

function defaultEmployeeDirectory(seed = MATTER_EMPLOYEE_DIRECTORY_SEED) {
  return Object.freeze({
    get({ tenant_id, employee_id } = {}) {
      return seed.find((employee) => employee.tenant_id === tenant_id && employee.employee_id === employee_id) ?? null;
    },
  });
}

function createSideEffectAdapter(prefix) {
  return Object.freeze({
    createWorkspace({ tenant_id, matter_id } = {}) {
      return Object.freeze({ tenant_id, matter_id, workspace_id: `${prefix}_workspace_${matter_id}` });
    },
    createMatterLedger({ tenant_id, matter_id } = {}) {
      return Object.freeze({ tenant_id, matter_id, ledger_id: `${prefix}_ledger_${matter_id}` });
    },
  });
}

export function createMatterRuntimeContext({
  repository = createMatterRepository({ seedRecords: MATTER_RUNTIME_SEED.records }),
  employeeDirectory = defaultEmployeeDirectory(),
  dms = createSideEffectAdapter("matter_dms"),
  dmsRuntime = null,
  billing = createSideEffectAdapter("matter_billing"),
} = {}) {
  return Object.freeze({
    repository,
    employeeDirectory,
    dms,
    dmsRuntime,
    billing,
    seed_ref: MATTER_RUNTIME_SEED.fixture_id,
  });
}

const DEFAULT_MATTER_RUNTIME = createMatterRuntimeContext();

function errorResponse(status, requestId, codes, extra = {}) {
  return {
    status,
    body: {
      request_id: requestId,
      outcome: "blocked",
      items: [],
      safe_error_codes: codes,
      audit_hint_ref: extra.audit_hint_ref ?? null,
      ui_state: extra.ui_state ?? null,
      count_leak_prevented: true,
      production_ready_claim: false,
    },
  };
}

function validateCommonQuery(query, requestId) {
  if (!query.tenant_id) return errorResponse(400, requestId, [MATTER_API_ERROR_CODES.tenant_required]);
  if (!query.permission_ref) return errorResponse(400, requestId, [MATTER_API_ERROR_CODES.permission_required]);
  if (!query.audit_hint_ref) {
    return errorResponse(400, requestId, [MATTER_API_ERROR_CODES.audit_hint_required]);
  }
  return null;
}

function parseLimit(rawLimit, requestId) {
  if (rawLimit === undefined || rawLimit === null || rawLimit === "") return { limit: DEFAULT_LIMIT };
  const limit = Number(rawLimit);
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    return { error: errorResponse(400, requestId, [MATTER_API_ERROR_CODES.validation_error]) };
  }
  return { limit };
}

function parseCursor(rawCursor, requestId) {
  if (rawCursor === undefined || rawCursor === null || rawCursor === "") return { offset: 0 };
  const offset = Number(rawCursor);
  if (!Number.isInteger(offset) || offset < 0) {
    return { error: errorResponse(400, requestId, [MATTER_API_ERROR_CODES.validation_error]) };
  }
  return { offset };
}

function gateDecisionResponse(decision, requestId, auditHintRef) {
  if (decision.effect === "allow") return null;
  if (decision.effect === "review_required") {
    return {
      status: 200,
      body: {
        request_id: requestId,
        outcome: "review_required",
        items: [],
        safe_error_codes: [MATTER_API_ERROR_CODES.review_required],
        audit_hint_ref: auditHintRef,
        ui_state: "review_required",
        count_leak_prevented: true,
        production_ready_claim: false,
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
        safe_error_codes: [MATTER_API_ERROR_CODES.approval_required],
        audit_hint_ref: auditHintRef,
        ui_state: "review_required",
        count_leak_prevented: true,
        production_ready_claim: false,
      },
    };
  }
  return errorResponse(403, requestId, [MATTER_API_ERROR_CODES.unauthorized_omission], {
    audit_hint_ref: auditHintRef,
    ui_state: "denied",
  });
}

function serializeMatter(record, runtime) {
  const teamMemberCount =
    runtime?.repository
      ?.list({ tenant_id: record.tenant_id, model_type: "MatterMember", matter_id: record.matter_id })
      ?.length ?? record.team_member_count ?? 0;
  const link = runtime?.repository
    ? getMatterVaultLink({ repository: runtime.repository, tenant_id: record.tenant_id, matter_id: record.matter_id })
    : null;
  return Object.freeze({
    tenant_id: record.tenant_id,
    resource_id: record.matter_id,
    matter_id: record.matter_id,
    matter_code: record.matter_code ?? null,
    matter_number: record.matter_number ?? null,
    matter_name: record.matter_name ?? record.title,
    title: record.title,
    status: record.status,
    client_id: record.client_id ?? record.legal_client_party_id ?? null,
    client_display_name: record.client_display_name ?? null,
    legal_client_party_id: record.legal_client_party_id ?? record.client_id ?? null,
    billing_client_party_id: record.billing_client_party_id ?? record.legal_client_party_id ?? record.client_id ?? null,
    matter_type_english: record.matter_type_english ?? null,
    matter_detail_type_korean: record.matter_detail_type_korean ?? null,
    source_revision: record.source_revision ?? null,
    owner_module: record.owner_module,
    owner_employee_id: record.owner_employee_id ?? null,
    owner_user_id: record.owner_user_id ?? null,
    owner_display_name: record.owner_display_name ?? null,
    permission_envelope_id: record.permission_envelope_id,
    audit_trace_id: record.audit_trace_id,
    document_count: record.document_count ?? 0,
    vault_workspace_id: link?.vault_workspace_id ?? record.dms_workspace_id ?? null,
    matter_vault_linked: Boolean(link),
    team_member_count: teamMemberCount,
    wip_status: record.wip_status ?? "not_started",
    risk_level: record.risk_level ?? "standard",
    opened_at: record.opened_at ?? null,
    closed_at: record.closed_at ?? null,
    runtime_write_ready: true,
    r5_r6_owner_decision_ready: true,
    production_ready_claim: false,
  });
}

function serializeMember(record) {
  return Object.freeze({
    tenant_id: record.tenant_id,
    resource_id: record.member_id,
    member_id: record.member_id,
    matter_id: record.matter_id,
    employee_id: record.employee_id,
    user_id: record.user_id,
    role: record.role,
    status: record.status,
    access_scope: record.access_scope,
  });
}

function serializeRecentMatterView(record, runtime) {
  const matter = runtime.repository.get({
    tenant_id: record.tenant_id,
    model_type: "Matter",
    matter_id: record.matter_id,
  });
  if (!matter || matter.silent === true || matter.hidden_from_actor === true) return null;
  const safeMatter = serializeMatter(matter, runtime);
  return Object.freeze({
    tenant_id: record.tenant_id,
    resource_id: `matter_recent:${record.matter_id}`,
    matter_id: record.matter_id,
    object_type: "Matter",
    title: safeMatter.title,
    matter_number: safeMatter.matter_number,
    status: safeMatter.status,
    viewed_at: record.viewed_at,
    viewer_scoped: true,
    production_ready_claim: false,
  });
}

function serializeMatterListView(record) {
  const filter = record.filter && typeof record.filter === "object" ? record.filter : {};
  return Object.freeze({
    tenant_id: record.tenant_id,
    resource_id: record.resource_id ?? record.list_view_id,
    list_view_id: record.list_view_id,
    label: record.label,
    filter: Object.freeze({
      status: ALLOWED_MATTER_LIST_VIEW_STATUSES.has(filter.status) ? filter.status : "all",
    }),
    sort: record.sort ?? "updated_desc",
    system_view: record.system_view === true,
    owner_scoped: record.system_view !== true,
    created_at: record.created_at ?? null,
    updated_at: record.updated_at ?? null,
    production_ready_claim: false,
  });
}

function normalizeMatterListViewBody(body = {}, requestId) {
  const label = String(body.label ?? "").trim();
  if (label.length < 2 || label.length > 80) {
    return {
      error: errorResponse(400, requestId, [MATTER_API_ERROR_CODES.validation_error], {
        audit_hint_ref: body.audit_hint_ref,
        ui_state: "blocked",
      }),
    };
  }
  const rawStatus = body.filter?.status ?? "all";
  const status = ALLOWED_MATTER_LIST_VIEW_STATUSES.has(rawStatus) ? rawStatus : null;
  if (!status) {
    return {
      error: errorResponse(400, requestId, [MATTER_API_ERROR_CODES.validation_error], {
        audit_hint_ref: body.audit_hint_ref,
        ui_state: "blocked",
      }),
    };
  }
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
  return {
    value: Object.freeze({
      label,
      status,
      listViewId: String(body.list_view_id ?? `matter_view_user_${slug || "custom"}`).replace(/[^a-zA-Z0-9_-]/g, "_"),
      sort: body.sort === "title_asc" ? "title_asc" : "updated_desc",
    }),
  };
}

function visibleMatterRecords(records) {
  return records.filter((record) => record.silent !== true && record.hidden_from_actor !== true);
}

function routeGate({ context, query, requestId, action, resource }) {
  const invalid = validateCommonQuery(query, requestId);
  if (invalid) return invalid;
  const decision = evaluateRouteDecision({
    context,
    resource: {
      tenant_id: query.tenant_id,
      resource_type: resource.resource_type,
      resource_id: resource.resource_id ?? undefined,
      matter_id: resource.matter_id ?? null,
    },
    action,
  });
  return gateDecisionResponse(decision, requestId, query.audit_hint_ref);
}

function queryFromBody(body = {}) {
  return {
    tenant_id: body.tenant_id,
    permission_ref: body.permission_ref,
    audit_hint_ref: body.audit_hint_ref,
  };
}

function matterActivityService(runtime) {
  return createMatterActivityCalendarChannelService({ repository: runtime.repository });
}

function matterDocumentEmailBuilderService(runtime) {
  return createMatterDocumentEmailBuilderService({ repository: runtime.repository });
}

function matterRuntimeReplay(repository, query, idempotencyKey, requestId) {
  const replay = repository?.getIdempotency?.({ tenant_id: query.tenant_id, idempotency_key: idempotencyKey });
  if (!replay?.response) return null;
  return {
    status: 200,
    body: {
      ...replay.response,
      request_id: requestId,
      outcome: "idempotent_replay",
      idempotent_replay: true,
      state_idempotent: true,
      production_ready_claim: false,
    },
  };
}

function recordMatterRuntimeReplay(repository, query, idempotencyKey, operation, response) {
  repository?.recordIdempotency?.({
    tenant_id: query.tenant_id,
    idempotency_key: idempotencyKey,
    operation,
    response,
    created_at: new Date().toISOString(),
  });
}

function activityCollectionResponse({ items, requestId, query }) {
  return {
    status: 200,
    body: {
      request_id: requestId,
      outcome: "passed",
      items,
      page_info: { returned_count: items.length, omitted_item_count: null },
      safe_error_codes: [],
      audit_hint_ref: query.audit_hint_ref,
      ui_state: items.length === 0 ? "empty" : null,
      count_leak_prevented: true,
      production_ready_claim: false,
    },
  };
}

function activityItemResponse({ result, requestId, query, outcome = "created" }) {
  return {
    request_id: requestId,
    outcome: result.outcome ?? outcome,
    ui_state: result.ui_state ?? null,
    item: result.item ?? null,
    audit_event: result.audit_event ?? null,
    timeline_event: result.timeline_event ?? null,
    deadline_change_request: result.deadline_change_request ?? null,
    confirmation: result.confirmation ?? null,
    provider_state: result.provider_state ?? null,
    approval_request: result.approval_request ?? null,
    publish_state: result.publish_state ?? null,
    safe_error_codes: [],
    audit_hint_ref: query.audit_hint_ref,
    state_idempotent: true,
    idempotent_replay: false,
    count_leak_prevented: true,
    production_ready_claim: false,
  };
}

function appendAudit(runtime, event) {
  return appendMatterAuditEvent({
    repository: runtime.repository,
    event: {
      event_id: event.event_id,
      tenant_id: event.tenant_id,
      actor_id: event.actor_id,
      action: event.action,
      object_type: event.object_type,
      object_id: event.object_id,
      decision: event.decision ?? "allow",
      reason: event.reason,
      occurred_at: event.occurred_at ?? new Date().toISOString(),
      metadata: clone(event.metadata ?? {}),
    },
  });
}

function createMatterVaultTimelineEvent(runtime, event = {}) {
  const record = Object.freeze({
    model_type: "MatterTimelineEvent",
    resource_id: event.event_id,
    event_id: event.event_id,
    tenant_id: event.tenant_id,
    matter_id: event.matter_id,
    occurred_at: event.occurred_at ?? new Date().toISOString(),
    type: event.type,
    title: event.title,
    source_ref: event.source_ref ?? null,
    source_module: event.source_module ?? "vault",
    source_object_id: event.source_object_id ?? null,
    safe_summary: Object.freeze({ ...(event.safe_summary ?? {}) }),
    raw_storage_path_included: false,
    document_bytes_included: false,
  });
  return runtime.repository.create(record);
}

function readMatterVaultSummary({ runtime, tenant_id, matter_id } = {}) {
  const link = getMatterVaultLink({ repository: runtime.repository, tenant_id, matter_id });
  if (!link) return null;
  const dmsRepository = runtime.dmsRuntime?.repository;
  const workspace = dmsRepository?.get({
    tenant_id,
    model_type: "DmsWorkspace",
    workspace_id: link.vault_workspace_id,
  });
  const documents =
    dmsRepository?.list({ tenant_id, model_type: "DmsDocument", matter_id }) ?? [];
  return createMatterVaultSummary({ link, workspace, documents });
}

export function handleMatterList({ query, context, requestId, runtime = DEFAULT_MATTER_RUNTIME } = {}) {
  const gated = routeGate({
    context,
    query,
    requestId,
    action: "matter:read",
    resource: { resource_type: "matter" },
  });
  if (gated) return gated;
  const { limit, error: limitError } = parseLimit(query.limit, requestId);
  if (limitError) return limitError;
  const { offset, error: cursorError } = parseCursor(query.cursor, requestId);
  if (cursorError) return cursorError;
  const records = visibleMatterRecords(runtime.repository.list({ tenant_id: query.tenant_id, model_type: "Matter" }));
  const serialized = records.map((record) => serializeMatter(record, runtime));
  const { allowed } = trimItemsByPermission({
    context,
    items: serialized,
    action: "matter:read",
    resourceType: "matter",
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
        omitted_matter_count: null,
      },
      safe_error_codes: [],
      audit_hint_ref: query.audit_hint_ref,
      ui_state: page.length === 0 ? "empty" : null,
      count_leak_prevented: true,
      production_ready_claim: false,
    },
  };
}

export function handleMatterDetail({ matterId, query, context, requestId, runtime = DEFAULT_MATTER_RUNTIME } = {}) {
  const gated = routeGate({
    context,
    query,
    requestId,
    action: "matter:read",
    resource: { resource_type: "matter", resource_id: matterId, matter_id: matterId },
  });
  if (gated) return gated;
  const record = runtime.repository.get({ tenant_id: query.tenant_id, model_type: "Matter", matter_id: matterId });
  if (!record || record.silent === true || record.hidden_from_actor === true) {
    return errorResponse(404, requestId, [MATTER_API_ERROR_CODES.not_found], {
      audit_hint_ref: query.audit_hint_ref,
      ui_state: "empty",
    });
  }
  const { allowed } = trimItemsByPermission({
    context,
    items: [serializeMatter(record, runtime)],
    action: "matter:read",
    resourceType: "matter",
  });
  if (allowed.length === 0) {
    return errorResponse(404, requestId, [MATTER_API_ERROR_CODES.not_found], {
      audit_hint_ref: query.audit_hint_ref,
      ui_state: "empty",
    });
  }
  const team = runtime.repository
    .list({ tenant_id: query.tenant_id, model_type: "MatterMember", matter_id: matterId })
    .map(serializeMember);
  const report = createMatterClientReportProjection({
    tenant_id: query.tenant_id,
    matter_id: matterId,
    report_id: `matter_report:${matterId}`,
    sections: [
      { section_id: "status", title: "Status", body: record.status, client_visible: true },
      { section_id: "internal", title: "Internal", privileged_strategy: "hidden", privileged: true },
    ],
  });
  return {
    status: 200,
    body: {
      request_id: requestId,
      outcome: "passed",
      item: allowed[0],
      team,
      client_report: report,
      safe_error_codes: [],
      audit_hint_ref: query.audit_hint_ref,
      ui_state: null,
      count_leak_prevented: true,
      production_ready_claim: false,
    },
  };
}

export function handleMatterVaultSummary({ matterId, query, context, requestId, runtime = DEFAULT_MATTER_RUNTIME } = {}) {
  const gated = routeGate({
    context,
    query,
    requestId,
    action: "matter:vault:read",
    resource: { resource_type: "matter_vault", resource_id: matterId, matter_id: matterId },
  });
  if (gated) return gated;
  const summary = readMatterVaultSummary({ runtime, tenant_id: query.tenant_id, matter_id: matterId });
  if (!summary) {
    return {
      status: 200,
      body: {
        request_id: requestId,
        outcome: "passed",
        item: null,
        safe_error_codes: [],
        audit_hint_ref: query.audit_hint_ref,
        ui_state: "empty",
        count_leak_prevented: true,
        production_ready_claim: false,
      },
    };
  }
  appendAudit(runtime, {
    event_id: `matter.vault_summary.viewed:${query.tenant_id}:${matterId}:${requestId}`,
    tenant_id: query.tenant_id,
    actor_id: context.principal.user_id,
    action: "matter.vault_summary.viewed",
    object_type: "MatterVaultLink",
    object_id: `${matterId}:${summary.vault_workspace_id}`,
    reason: "permission_gated_vault_summary_read",
    metadata: { permission_ref: query.permission_ref },
  });
  return {
    status: 200,
    body: {
      request_id: requestId,
      outcome: "passed",
      item: summary,
      safe_error_codes: [],
      audit_hint_ref: query.audit_hint_ref,
      ui_state: summary.document_count === 0 ? "empty" : null,
      count_leak_prevented: true,
      production_ready_claim: false,
    },
  };
}

export function handleMatterCommandCenter({ matterId, query, context, requestId, runtime = DEFAULT_MATTER_RUNTIME } = {}) {
  const detail = handleMatterDetail({ matterId, query, context, requestId, runtime });
  if (detail.status !== 200) return detail;
  const vaultSummary = readMatterVaultSummary({ runtime, tenant_id: query.tenant_id, matter_id: matterId });
  appendAudit(runtime, {
    event_id: `matter.command_center.viewed:${query.tenant_id}:${matterId}:${requestId}`,
    tenant_id: query.tenant_id,
    actor_id: context.principal.user_id,
    action: "matter.command_center.viewed",
    object_type: "Matter",
    object_id: matterId,
    reason: "permission_gated_command_center_read",
    metadata: { permission_ref: query.permission_ref },
  });
  return {
    status: 200,
    body: {
      ...detail.body,
      vault_summary: vaultSummary,
      matter_vault_link: vaultSummary
        ? serializeMatterVaultLinkSafe(
            getMatterVaultLink({ repository: runtime.repository, tenant_id: query.tenant_id, matter_id: matterId }),
          )
        : null,
    },
  };
}

export function handleMatterOpening({ body, context, requestId, runtime = DEFAULT_MATTER_RUNTIME } = {}) {
  const query = {
    tenant_id: body?.matter?.tenant_id ?? body?.tenant_id,
    permission_ref: body?.permission_ref,
    audit_hint_ref: body?.audit_hint_ref,
  };
  const gated = routeGate({
    context,
    query,
    requestId,
    action: "matter:open",
    resource: { resource_type: "matter" },
  });
  if (gated) return gated;
  try {
    const actorId = body.actor_id ?? context.principal.user_id;
    const result = runtime.dmsRuntime?.repository
      ? openMatterWithVault({
          matterRepository: runtime.repository,
          dmsRepository: runtime.dmsRuntime.repository,
          matter: body.matter,
          clearance_token: body.clearance_token,
          matter_number_seed: body.matter_number_seed,
          idempotency_key: body.idempotency_key,
          client: body.client,
          require_canonical_matter_code: body.require_canonical_matter_code === true,
          billing: runtime.billing,
          actor_id: actorId,
        })
      : openMatterTransaction({
          repository: runtime.repository,
          matter: body.matter,
          clearance_token: body.clearance_token,
          matter_number_seed: body.matter_number_seed,
          idempotency_key: body.idempotency_key,
          client: body.client,
          require_canonical_matter_code: body.require_canonical_matter_code === true,
          dms: runtime.dms,
          billing: runtime.billing,
          actor_id: actorId,
        });
    return {
      status: result.idempotent_replay ? 200 : 201,
      body: {
        request_id: requestId,
        outcome: result.idempotent_replay ? "idempotent_replay" : "created",
        item: serializeMatter(result.matter, runtime),
        dms_workspace: result.dms_workspace,
        default_folder: result.default_folder ?? null,
        matter_vault_link: result.matter_vault_link ? serializeMatterVaultLinkSafe(result.matter_vault_link) : null,
        billing_ledger: result.billing_ledger,
        audit_event: result.audit_event,
        link_audit_event: result.link_audit_event ?? null,
        idempotent_replay: result.idempotent_replay,
        safe_error_codes: [],
        audit_hint_ref: query.audit_hint_ref,
        state_idempotent: true,
        production_ready_claim: false,
      },
    };
  } catch (error) {
    return errorResponse(400, requestId, [MATTER_API_ERROR_CODES.validation_error], {
      audit_hint_ref: query.audit_hint_ref,
      ui_state: "blocked",
      message: error.message,
    });
  }
}

export function handleMatterDocumentFacade({ matterId, body, context, requestId, runtime = DEFAULT_MATTER_RUNTIME } = {}) {
  const query = {
    tenant_id: body?.document?.tenant_id ?? body?.tenant_id,
    permission_ref: body?.permission_ref,
    audit_hint_ref: body?.audit_hint_ref,
  };
  const gated = routeGate({
    context,
    query,
    requestId,
    action: "matter:document:write",
    resource: { resource_type: "matter_document_facade", resource_id: matterId, matter_id: matterId },
  });
  if (gated) return gated;
  const link = getMatterVaultLink({ repository: runtime.repository, tenant_id: query.tenant_id, matter_id: matterId });
  if (!link || !runtime.dmsRuntime?.repository || !runtime.dmsRuntime?.storage) {
    return errorResponse(404, requestId, [MATTER_API_ERROR_CODES.not_found], {
      audit_hint_ref: query.audit_hint_ref,
      ui_state: "empty",
    });
  }
  try {
    const document = {
      ...body.document,
      tenant_id: query.tenant_id,
      matter_id: matterId,
      workspace_id: link.vault_workspace_id,
      folder_id: body.document?.folder_id ?? link.default_folder_id,
      permission_envelope_id: body.document?.permission_envelope_id ?? link.permission_envelope_id,
      audit_trace_id: body.document?.audit_trace_id ?? `audit:${matterId}:vault-document`,
    };
    const result = uploadDocument({
      repository: runtime.dmsRuntime.repository,
      storage: runtime.dmsRuntime.storage,
      document,
      bytes: body.content_text ?? "",
      actor_id: body.actor_id ?? context.principal.user_id,
      idempotency_key: body.idempotency_key,
    });
    const timelineEventId = `matter.timeline.vault_document:${query.tenant_id}:${matterId}:${result.document.document_id}`;
    const auditEventId = `matter.document_facade.uploaded:${query.tenant_id}:${matterId}:${result.document.document_id}`;
    const existingTimeline = result.idempotent_replay
      ? runtime.repository
          .list({ tenant_id: query.tenant_id, model_type: "MatterTimelineEvent", matter_id: matterId })
          .find((event) => event.event_id === timelineEventId)
      : null;
    const timeline = existingTimeline ?? createMatterVaultTimelineEvent(runtime, {
      event_id: timelineEventId,
      tenant_id: query.tenant_id,
      matter_id: matterId,
      type: "document.version.created",
      title: result.document.title,
      source_ref: result.document.document_id,
      source_object_id: result.document.document_id,
      safe_summary: { document_id: result.document.document_id, version_id: result.version.version_id },
    });
    const existingMatterAudit = result.idempotent_replay
      ? runtime.repository
          .listAudit({ tenant_id: query.tenant_id })
          .find((event) => event.event_id === auditEventId)
      : null;
    const matterAudit = existingMatterAudit ?? appendAudit(runtime, {
      event_id: auditEventId,
      tenant_id: query.tenant_id,
      actor_id: body.actor_id ?? context.principal.user_id,
      action: "matter.document_facade.uploaded",
      object_type: "DmsDocument",
      object_id: result.document.document_id,
      reason: "matter_facade_delegated_bytes_to_vault",
      metadata: { vault_workspace_id: link.vault_workspace_id, timeline_event_id: timeline.event_id },
    });
    return {
      status: result.idempotent_replay ? 200 : 201,
      body: {
        request_id: requestId,
        outcome: result.idempotent_replay ? "idempotent_replay" : "created",
        item: {
          tenant_id: result.document.tenant_id,
          matter_id: result.document.matter_id,
          document_id: result.document.document_id,
          title: result.document.title,
          status: result.document.status,
          current_version_id: result.document.current_version_id,
          vault_workspace_id: result.document.workspace_id,
          raw_storage_path_included: false,
          document_bytes_included: false,
          matter_owns_document_bytes: false,
        },
        version: result.version,
        file_object: serializeFileObjectSafe(result.file_object),
        audit_event: result.audit_event,
        matter_audit_event: matterAudit,
        timeline_event: timeline,
        idempotent_replay: result.idempotent_replay,
        safe_error_codes: [],
        audit_hint_ref: query.audit_hint_ref,
        production_ready_claim: false,
      },
    };
  } catch (error) {
    return errorResponse(400, requestId, [MATTER_API_ERROR_CODES.validation_error], {
      audit_hint_ref: query.audit_hint_ref,
      ui_state: "blocked",
      message: error.message,
    });
  }
}

export function handleMatterTimeline({ matterId, query, context, requestId, runtime = DEFAULT_MATTER_RUNTIME } = {}) {
  const gated = routeGate({
    context,
    query,
    requestId,
    action: "matter:timeline:read",
    resource: { resource_type: "matter_timeline", resource_id: matterId, matter_id: matterId },
  });
  if (gated) return gated;
  const entries = runtime.repository.list({ tenant_id: query.tenant_id, model_type: "MatterTimelineEvent", matter_id: matterId });
  const timeline = buildMatterTimelineReadModel({
    entries,
    actor: context.principal,
    tenant_id: query.tenant_id,
    matter_id: matterId,
  });
  appendAudit(runtime, {
    event_id: `matter.timeline.viewed:${query.tenant_id}:${matterId}:${requestId}`,
    tenant_id: query.tenant_id,
    actor_id: context.principal.user_id,
    action: "matter.timeline.viewed",
    object_type: "MatterTimeline",
    object_id: matterId,
    reason: "permission_gated_timeline_read",
    metadata: { permission_ref: query.permission_ref },
  });
  return {
    status: 200,
    body: {
      request_id: requestId,
      outcome: "passed",
      item: timeline,
      safe_error_codes: [],
      audit_hint_ref: query.audit_hint_ref,
      ui_state: timeline.visible_entries.length === 0 ? "empty" : null,
      count_leak_prevented: true,
      production_ready_claim: false,
    },
  };
}

export function handleMatterActivitiesList({ matterId, query, context, requestId, runtime = DEFAULT_MATTER_RUNTIME } = {}) {
  const gated = routeGate({
    context,
    query,
    requestId,
    action: "matter:activity:read",
    resource: { resource_type: "matter_activity", resource_id: matterId, matter_id: matterId },
  });
  if (gated) return gated;
  return activityCollectionResponse({
    items: matterActivityService(runtime).listActivities({ tenant_id: query.tenant_id, matter_id: matterId }),
    requestId,
    query,
  });
}

export function handleMatterActivityCreate({ matterId, body, context, requestId, runtime = DEFAULT_MATTER_RUNTIME } = {}) {
  const query = queryFromBody(body);
  const gated = routeGate({
    context,
    query,
    requestId,
    action: "matter:activity:write",
    resource: { resource_type: "matter_activity", resource_id: matterId, matter_id: matterId },
  });
  if (gated) return gated;
  const idempotencyKey = body?.idempotency_key ?? `matter.activity.create:${matterId}:${body?.activity?.activity_id ?? body?.activity?.title ?? requestId}`;
  const replay = matterRuntimeReplay(runtime.repository, query, idempotencyKey, requestId);
  if (replay) return replay;
  try {
    const result = matterActivityService(runtime).createActivity({
      tenant_id: query.tenant_id,
      matter_id: matterId,
      activity: body?.activity,
      actor_id: body?.actor_id ?? context.principal.user_id,
      occurred_at: body?.occurred_at,
    });
    const response = activityItemResponse({ result, requestId, query, outcome: "created" });
    recordMatterRuntimeReplay(runtime.repository, query, idempotencyKey, "matter_activity_create", response);
    return { status: 201, body: response };
  } catch (error) {
    return errorResponse(400, requestId, [MATTER_API_ERROR_CODES.validation_error], {
      audit_hint_ref: query.audit_hint_ref,
      ui_state: "blocked",
      message: error.message,
    });
  }
}

export function handleMatterActivityPatch({ matterId, activityId, body, context, requestId, runtime = DEFAULT_MATTER_RUNTIME } = {}) {
  const query = queryFromBody(body);
  const gated = routeGate({
    context,
    query,
    requestId,
    action: "matter:activity:patch",
    resource: { resource_type: "matter_activity", resource_id: activityId, matter_id: matterId },
  });
  if (gated) return gated;
  const idempotencyKey = body?.idempotency_key ?? `matter.activity.patch:${matterId}:${activityId}:${requestId}`;
  const replay = matterRuntimeReplay(runtime.repository, query, idempotencyKey, requestId);
  if (replay) return replay;
  try {
    const result = matterActivityService(runtime).patchActivity({
      tenant_id: query.tenant_id,
      matter_id: matterId,
      activity_id: activityId,
      patch: body?.patch,
      actor_id: body?.actor_id ?? context.principal.user_id,
      occurred_at: body?.occurred_at,
    });
    const response = activityItemResponse({ result, requestId, query, outcome: "updated" });
    recordMatterRuntimeReplay(runtime.repository, query, idempotencyKey, "matter_activity_patch", response);
    return { status: 200, body: response };
  } catch (error) {
    return errorResponse(error.message === "activity not found" ? 404 : 400, requestId, [MATTER_API_ERROR_CODES.validation_error], {
      audit_hint_ref: query.audit_hint_ref,
      ui_state: error.message === "activity not found" ? "empty" : "blocked",
      message: error.message,
    });
  }
}

export function handleMatterCalendarList({ matterId, query, context, requestId, runtime = DEFAULT_MATTER_RUNTIME } = {}) {
  const gated = routeGate({
    context,
    query,
    requestId,
    action: "matter:calendar:read",
    resource: { resource_type: "matter_calendar", resource_id: matterId, matter_id: matterId },
  });
  if (gated) return gated;
  return activityCollectionResponse({
    items: matterActivityService(runtime).listCalendarEvents({ tenant_id: query.tenant_id, matter_id: matterId }),
    requestId,
    query,
  });
}

export function handleMatterCalendarCreate({ matterId, body, context, requestId, runtime = DEFAULT_MATTER_RUNTIME } = {}) {
  const query = queryFromBody(body);
  const gated = routeGate({
    context,
    query,
    requestId,
    action: "matter:calendar:write",
    resource: { resource_type: "matter_calendar", resource_id: matterId, matter_id: matterId },
  });
  if (gated) return gated;
  const idempotencyKey = body?.idempotency_key ?? `matter.calendar.create:${matterId}:${body?.event?.event_id ?? body?.event?.title ?? requestId}`;
  const replay = matterRuntimeReplay(runtime.repository, query, idempotencyKey, requestId);
  if (replay) return replay;
  try {
    const result = matterActivityService(runtime).createCalendarEvent({
      tenant_id: query.tenant_id,
      matter_id: matterId,
      event: body?.event,
      actor_id: body?.actor_id ?? context.principal.user_id,
      occurred_at: body?.occurred_at,
    });
    const response = activityItemResponse({ result, requestId, query, outcome: "created" });
    recordMatterRuntimeReplay(runtime.repository, query, idempotencyKey, "matter_calendar_create", response);
    return { status: 201, body: response };
  } catch (error) {
    return errorResponse(400, requestId, [MATTER_API_ERROR_CODES.validation_error], {
      audit_hint_ref: query.audit_hint_ref,
      ui_state: "blocked",
      message: error.message,
    });
  }
}

export function handleMatterCalendarPatch({ matterId, eventId, body, context, requestId, runtime = DEFAULT_MATTER_RUNTIME } = {}) {
  const query = queryFromBody(body);
  const gated = routeGate({
    context,
    query,
    requestId,
    action: "matter:calendar:patch",
    resource: { resource_type: "matter_calendar", resource_id: eventId, matter_id: matterId },
  });
  if (gated) return gated;
  const idempotencyKey = body?.idempotency_key ?? `matter.calendar.patch:${matterId}:${eventId}:${requestId}`;
  const replay = matterRuntimeReplay(runtime.repository, query, idempotencyKey, requestId);
  if (replay) return replay;
  try {
    const result = matterActivityService(runtime).patchCalendarEvent({
      tenant_id: query.tenant_id,
      matter_id: matterId,
      event_id: eventId,
      patch: body?.patch,
      actor_id: body?.actor_id ?? context.principal.user_id,
      occurred_at: body?.occurred_at,
    });
    const response = activityItemResponse({ result, requestId, query, outcome: "updated" });
    recordMatterRuntimeReplay(runtime.repository, query, idempotencyKey, "matter_calendar_patch", response);
    return { status: 200, body: response };
  } catch (error) {
    return errorResponse(error.message === "calendar event not found" ? 404 : 400, requestId, [MATTER_API_ERROR_CODES.validation_error], {
      audit_hint_ref: query.audit_hint_ref,
      ui_state: error.message === "calendar event not found" ? "empty" : "blocked",
      message: error.message,
    });
  }
}

export function handleMatterDeadlinesList({ matterId, query, context, requestId, runtime = DEFAULT_MATTER_RUNTIME } = {}) {
  const gated = routeGate({
    context,
    query,
    requestId,
    action: "matter:deadline:read",
    resource: { resource_type: "matter_deadline", resource_id: matterId, matter_id: matterId },
  });
  if (gated) return gated;
  return activityCollectionResponse({
    items: matterActivityService(runtime).listDeadlines({ tenant_id: query.tenant_id, matter_id: matterId }),
    requestId,
    query,
  });
}

export function handleMatterDeadlineConfirm({ matterId, deadlineId, body, context, requestId, runtime = DEFAULT_MATTER_RUNTIME } = {}) {
  const query = queryFromBody(body);
  const gated = routeGate({
    context,
    query,
    requestId,
    action: "matter:deadline:confirm_change",
    resource: { resource_type: "matter_deadline", resource_id: deadlineId, matter_id: matterId },
  });
  if (gated) return gated;
  const idempotencyKey = body?.idempotency_key ?? `matter.deadline.confirm:${matterId}:${deadlineId}:${body?.confirmer_user_id ?? requestId}`;
  const replay = matterRuntimeReplay(runtime.repository, query, idempotencyKey, requestId);
  if (replay) return replay;
  try {
    const result = matterActivityService(runtime).confirmDeadlineChange({
      tenant_id: query.tenant_id,
      matter_id: matterId,
      deadline_id: deadlineId,
      confirmer_user_id: body?.confirmer_user_id ?? body?.actor_id ?? context.principal.user_id,
      occurred_at: body?.occurred_at,
    });
    const response = activityItemResponse({ result, requestId, query, outcome: "confirmed" });
    recordMatterRuntimeReplay(runtime.repository, query, idempotencyKey, "matter_deadline_confirm", response);
    return { status: 200, body: response };
  } catch (error) {
    return errorResponse(400, requestId, [MATTER_API_ERROR_CODES.validation_error], {
      audit_hint_ref: query.audit_hint_ref,
      ui_state: "blocked",
      message: error.message,
    });
  }
}

export function handleMatterChannelRead({ matterId, query, context, requestId, runtime = DEFAULT_MATTER_RUNTIME } = {}) {
  const gated = routeGate({
    context,
    query,
    requestId,
    action: "matter:channel:read",
    resource: { resource_type: "matter_channel", resource_id: matterId, matter_id: matterId },
  });
  if (gated) return gated;
  const channel = matterActivityService(runtime).listChannel({ tenant_id: query.tenant_id, matter_id: matterId });
  return {
    status: 200,
    body: {
      request_id: requestId,
      outcome: "passed",
      item: channel,
      safe_error_codes: [],
      audit_hint_ref: query.audit_hint_ref,
      ui_state: channel.messages.length === 0 ? "empty" : null,
      count_leak_prevented: true,
      production_ready_claim: false,
    },
  };
}

export function handleMatterChannelMessageCreate({ matterId, body, context, requestId, runtime = DEFAULT_MATTER_RUNTIME } = {}) {
  const query = queryFromBody(body);
  const gated = routeGate({
    context,
    query,
    requestId,
    action: "matter:channel:message_write",
    resource: { resource_type: "matter_channel", resource_id: matterId, matter_id: matterId },
  });
  if (gated) return gated;
  const idempotencyKey = body?.idempotency_key ?? `matter.channel.message:${matterId}:${body?.message?.message_id ?? requestId}`;
  const replay = matterRuntimeReplay(runtime.repository, query, idempotencyKey, requestId);
  if (replay) return replay;
  try {
    const result = matterActivityService(runtime).createChannelMessage({
      tenant_id: query.tenant_id,
      matter_id: matterId,
      message: body?.message,
      actor_id: body?.actor_id ?? context.principal.user_id,
      occurred_at: body?.occurred_at,
    });
    const response = activityItemResponse({ result, requestId, query, outcome: "created" });
    recordMatterRuntimeReplay(runtime.repository, query, idempotencyKey, "matter_channel_message_create", response);
    return { status: 201, body: response };
  } catch (error) {
    return errorResponse(400, requestId, [MATTER_API_ERROR_CODES.validation_error], {
      audit_hint_ref: query.audit_hint_ref,
      ui_state: "blocked",
      message: error.message,
    });
  }
}

export function handleMatterChannelProviderSync({ matterId, body, context, requestId, runtime = DEFAULT_MATTER_RUNTIME } = {}) {
  const query = queryFromBody(body);
  const gated = routeGate({
    context,
    query,
    requestId,
    action: "matter:channel:provider_sync",
    resource: { resource_type: "matter_channel_provider", resource_id: matterId, matter_id: matterId },
  });
  if (gated) return gated;
  const result = matterActivityService(runtime).providerSyncBlocked({
    tenant_id: query.tenant_id,
    matter_id: matterId,
    actor_id: body?.actor_id ?? context.principal.user_id,
    occurred_at: body?.occurred_at,
  });
  return {
    status: 200,
    body: activityItemResponse({ result, requestId, query, outcome: "provider_blocked" }),
  };
}

export function handleMatterDocumentTemplates({ matterId, query, context, requestId, runtime = DEFAULT_MATTER_RUNTIME } = {}) {
  const gated = routeGate({
    context,
    query,
    requestId,
    action: "matter:builder:templates:read",
    resource: { resource_type: "matter_document_template", resource_id: matterId, matter_id: matterId },
  });
  if (gated) return gated;
  return activityCollectionResponse({
    items: matterDocumentEmailBuilderService(runtime).listDocumentTemplates({ tenant_id: query.tenant_id, matter_id: matterId }),
    requestId,
    query,
  });
}

export function handleMatterBuilderDraftCreate({ matterId, body, context, requestId, runtime = DEFAULT_MATTER_RUNTIME } = {}) {
  const query = queryFromBody(body);
  const gated = routeGate({
    context,
    query,
    requestId,
    action: "matter:builder:draft:create",
    resource: { resource_type: "matter_builder_draft", resource_id: matterId, matter_id: matterId },
  });
  if (gated) return gated;
  const idempotencyKey = body?.idempotency_key ?? `matter.builder.draft.create:${matterId}:${body?.draft?.draft_id ?? body?.draft?.title ?? requestId}`;
  const replay = matterRuntimeReplay(runtime.repository, query, idempotencyKey, requestId);
  if (replay) return replay;
  try {
    const result = matterDocumentEmailBuilderService(runtime).createBuilderDraft({
      tenant_id: query.tenant_id,
      matter_id: matterId,
      draft: body?.draft,
      actor_id: body?.actor_id ?? context.principal.user_id,
      occurred_at: body?.occurred_at,
    });
    const response = activityItemResponse({ result, requestId, query, outcome: "created" });
    recordMatterRuntimeReplay(runtime.repository, query, idempotencyKey, "matter_builder_draft_create", response);
    return { status: 201, body: response };
  } catch (error) {
    return errorResponse(400, requestId, [MATTER_API_ERROR_CODES.validation_error], {
      audit_hint_ref: query.audit_hint_ref,
      ui_state: "blocked",
      message: error.message,
    });
  }
}

export function handleMatterBuilderDraftPatch({ matterId, draftId, body, context, requestId, runtime = DEFAULT_MATTER_RUNTIME } = {}) {
  const query = queryFromBody(body);
  const gated = routeGate({
    context,
    query,
    requestId,
    action: "matter:builder:draft:patch",
    resource: { resource_type: "matter_builder_draft", resource_id: draftId, matter_id: matterId },
  });
  if (gated) return gated;
  const idempotencyKey = body?.idempotency_key ?? `matter.builder.draft.patch:${matterId}:${draftId}:${requestId}`;
  const replay = matterRuntimeReplay(runtime.repository, query, idempotencyKey, requestId);
  if (replay) return replay;
  try {
    const result = matterDocumentEmailBuilderService(runtime).patchBuilderDraft({
      tenant_id: query.tenant_id,
      matter_id: matterId,
      draft_id: draftId,
      patch: body?.patch,
      actor_id: body?.actor_id ?? context.principal.user_id,
      occurred_at: body?.occurred_at,
    });
    const response = activityItemResponse({ result, requestId, query, outcome: "updated" });
    recordMatterRuntimeReplay(runtime.repository, query, idempotencyKey, "matter_builder_draft_patch", response);
    return { status: 200, body: response };
  } catch (error) {
    return errorResponse(error.message === "builder draft not found" ? 404 : 400, requestId, [MATTER_API_ERROR_CODES.validation_error], {
      audit_hint_ref: query.audit_hint_ref,
      ui_state: error.message === "builder draft not found" ? "empty" : "blocked",
      message: error.message,
    });
  }
}

export function handleMatterBuilderDraftPreview({ matterId, draftId, query, context, requestId, runtime = DEFAULT_MATTER_RUNTIME } = {}) {
  const gated = routeGate({
    context,
    query,
    requestId,
    action: "matter:builder:draft:preview",
    resource: { resource_type: "matter_builder_preview", resource_id: draftId, matter_id: matterId },
  });
  if (gated) return gated;
  try {
    const result = matterDocumentEmailBuilderService(runtime).previewBuilderDraft({
      tenant_id: query.tenant_id,
      matter_id: matterId,
      draft_id: draftId,
    });
    return {
      status: 200,
      body: {
        ...activityItemResponse({ result, requestId, query, outcome: "passed" }),
        outcome: "passed",
      },
    };
  } catch (error) {
    return errorResponse(error.message === "builder draft not found" ? 404 : 400, requestId, [MATTER_API_ERROR_CODES.validation_error], {
      audit_hint_ref: query.audit_hint_ref,
      ui_state: error.message === "builder draft not found" ? "empty" : "blocked",
      message: error.message,
    });
  }
}

export function handleMatterBuilderApprovalRequest({ matterId, draftId, body, context, requestId, runtime = DEFAULT_MATTER_RUNTIME } = {}) {
  const query = queryFromBody(body);
  const gated = routeGate({
    context,
    query,
    requestId,
    action: "matter:builder:approval:request",
    resource: { resource_type: "matter_builder_approval", resource_id: draftId, matter_id: matterId },
  });
  if (gated) return gated;
  const idempotencyKey = body?.idempotency_key ?? `matter.builder.approval:${matterId}:${draftId}:${requestId}`;
  const replay = matterRuntimeReplay(runtime.repository, query, idempotencyKey, requestId);
  if (replay) return replay;
  try {
    const result = matterDocumentEmailBuilderService(runtime).requestBuilderApproval({
      tenant_id: query.tenant_id,
      matter_id: matterId,
      draft_id: draftId,
      actor_id: body?.actor_id ?? context.principal.user_id,
      occurred_at: body?.occurred_at,
    });
    const response = activityItemResponse({ result, requestId, query, outcome: "approval_required" });
    recordMatterRuntimeReplay(runtime.repository, query, idempotencyKey, "matter_builder_approval_request", response);
    return { status: 200, body: response };
  } catch (error) {
    return errorResponse(error.message === "builder draft not found" ? 404 : 400, requestId, [MATTER_API_ERROR_CODES.validation_error], {
      audit_hint_ref: query.audit_hint_ref,
      ui_state: error.message === "builder draft not found" ? "empty" : "blocked",
      message: error.message,
    });
  }
}

export function handleMatterBuilderApprovalList({ matterId, query, context, requestId, runtime = DEFAULT_MATTER_RUNTIME } = {}) {
  const gated = routeGate({
    context,
    query,
    requestId,
    action: "matter:builder:approval:read",
    resource: { resource_type: "matter_builder_approval", resource_id: matterId, matter_id: matterId },
  });
  if (gated) return gated;
  return activityCollectionResponse({
    items: matterDocumentEmailBuilderService(runtime).listBuilderApprovalRequests({ tenant_id: query.tenant_id, matter_id: matterId }),
    requestId,
    query,
  });
}

export function handleMatterBuilderPublishToVault({ matterId, draftId, body, context, requestId, runtime = DEFAULT_MATTER_RUNTIME } = {}) {
  const query = queryFromBody(body);
  const gated = routeGate({
    context,
    query,
    requestId,
    action: "matter:builder:publish",
    resource: { resource_type: "matter_builder_publish", resource_id: draftId, matter_id: matterId },
  });
  if (gated) return gated;
  try {
    const result = matterDocumentEmailBuilderService(runtime).publishBuilderDraftToVault({
      tenant_id: query.tenant_id,
      matter_id: matterId,
      draft_id: draftId,
      actor_id: body?.actor_id ?? context.principal.user_id,
      occurred_at: body?.occurred_at,
    });
    return {
      status: 200,
      body: activityItemResponse({ result, requestId, query, outcome: "owner_blocked" }),
    };
  } catch (error) {
    return errorResponse(error.message === "builder draft not found" ? 404 : 400, requestId, [MATTER_API_ERROR_CODES.validation_error], {
      audit_hint_ref: query.audit_hint_ref,
      ui_state: error.message === "builder draft not found" ? "empty" : "blocked",
      message: error.message,
    });
  }
}

export function handleMatterEmailDraftCreate({ matterId, body, context, requestId, runtime = DEFAULT_MATTER_RUNTIME } = {}) {
  const query = queryFromBody(body);
  const gated = routeGate({
    context,
    query,
    requestId,
    action: "matter:email:draft:create",
    resource: { resource_type: "matter_email_draft", resource_id: matterId, matter_id: matterId },
  });
  if (gated) return gated;
  const idempotencyKey = body?.idempotency_key ?? `matter.email.draft.create:${matterId}:${body?.draft?.draft_id ?? body?.draft?.subject ?? requestId}`;
  const replay = matterRuntimeReplay(runtime.repository, query, idempotencyKey, requestId);
  if (replay) return replay;
  try {
    const result = matterDocumentEmailBuilderService(runtime).createEmailDraft({
      tenant_id: query.tenant_id,
      matter_id: matterId,
      draft: body?.draft,
      actor_id: body?.actor_id ?? context.principal.user_id,
      occurred_at: body?.occurred_at,
    });
    const response = activityItemResponse({ result, requestId, query, outcome: "created" });
    recordMatterRuntimeReplay(runtime.repository, query, idempotencyKey, "matter_email_draft_create", response);
    return { status: 201, body: response };
  } catch (error) {
    return errorResponse(400, requestId, [MATTER_API_ERROR_CODES.validation_error], {
      audit_hint_ref: query.audit_hint_ref,
      ui_state: "blocked",
      message: error.message,
    });
  }
}

export function handleMatterEmailDraftPatch({ matterId, draftId, body, context, requestId, runtime = DEFAULT_MATTER_RUNTIME } = {}) {
  const query = queryFromBody(body);
  const gated = routeGate({
    context,
    query,
    requestId,
    action: "matter:email:draft:patch",
    resource: { resource_type: "matter_email_draft", resource_id: draftId, matter_id: matterId },
  });
  if (gated) return gated;
  const idempotencyKey = body?.idempotency_key ?? `matter.email.draft.patch:${matterId}:${draftId}:${requestId}`;
  const replay = matterRuntimeReplay(runtime.repository, query, idempotencyKey, requestId);
  if (replay) return replay;
  try {
    const result = matterDocumentEmailBuilderService(runtime).patchEmailDraft({
      tenant_id: query.tenant_id,
      matter_id: matterId,
      draft_id: draftId,
      patch: body?.patch,
      actor_id: body?.actor_id ?? context.principal.user_id,
      occurred_at: body?.occurred_at,
    });
    const response = activityItemResponse({ result, requestId, query, outcome: "updated" });
    recordMatterRuntimeReplay(runtime.repository, query, idempotencyKey, "matter_email_draft_patch", response);
    return { status: 200, body: response };
  } catch (error) {
    return errorResponse(error.message === "email draft not found" ? 404 : 400, requestId, [MATTER_API_ERROR_CODES.validation_error], {
      audit_hint_ref: query.audit_hint_ref,
      ui_state: error.message === "email draft not found" ? "empty" : "blocked",
      message: error.message,
    });
  }
}

export function handleMatterEmailDraftSend({ matterId, draftId, body, context, requestId, runtime = DEFAULT_MATTER_RUNTIME } = {}) {
  const query = queryFromBody(body);
  const gated = routeGate({
    context,
    query,
    requestId,
    action: "matter:email:draft:send",
    resource: { resource_type: "matter_email_provider", resource_id: draftId, matter_id: matterId },
  });
  if (gated) return gated;
  try {
    const result = matterDocumentEmailBuilderService(runtime).sendEmailDraftBlocked({
      tenant_id: query.tenant_id,
      matter_id: matterId,
      draft_id: draftId,
      actor_id: body?.actor_id ?? context.principal.user_id,
      occurred_at: body?.occurred_at,
    });
    return {
      status: 200,
      body: activityItemResponse({ result, requestId, query, outcome: "provider_blocked" }),
    };
  } catch (error) {
    return errorResponse(error.message === "email draft not found" ? 404 : 400, requestId, [MATTER_API_ERROR_CODES.validation_error], {
      audit_hint_ref: query.audit_hint_ref,
      ui_state: error.message === "email draft not found" ? "empty" : "blocked",
      message: error.message,
    });
  }
}

export function handleMatterTeamMemberCreate({ matterId, body, context, requestId, runtime = DEFAULT_MATTER_RUNTIME } = {}) {
  const query = {
    tenant_id: body?.member?.tenant_id ?? body?.tenant_id,
    permission_ref: body?.permission_ref,
    audit_hint_ref: body?.audit_hint_ref,
  };
  const gated = routeGate({
    context,
    query,
    requestId,
    action: "matter:team:write",
    resource: { resource_type: "matter_team", resource_id: matterId, matter_id: matterId },
  });
  if (gated) return gated;
  const matter = runtime.repository.get({ tenant_id: query.tenant_id, model_type: "Matter", matter_id: matterId });
  if (!matter) {
    return errorResponse(404, requestId, [MATTER_API_ERROR_CODES.not_found], {
      audit_hint_ref: query.audit_hint_ref,
      ui_state: "empty",
    });
  }
  try {
    const audit = {
      append: (event) =>
        appendAudit(runtime, {
          ...event,
          event_id: `matter_team:${event.object_id}:${Date.now()}`,
        }),
    };
    const persisted = addMatterTeamMember({
      repository: runtime.repository,
      employeeDirectory: runtime.employeeDirectory,
      matter,
      member: { ...body.member, matter_id: matterId },
      actor_id: body.actor_id ?? context.principal.user_id,
      audit,
    });
    const employee = runtime.employeeDirectory?.get?.({
      tenant_id: query.tenant_id,
      employee_id: persisted.employee_id,
    }) ?? null;
    const ownerAssignment = persisted.role === "responsible_attorney"
      ? {
          owner_employee_id: persisted.employee_id,
          owner_user_id: persisted.user_id ?? employee?.user_id ?? null,
          owner_display_name: employee?.display_name ?? persisted.member_id,
          assigned_at: new Date().toISOString(),
        }
      : null;
    const updatedMatter = ownerAssignment
      ? runtime.repository.update(
          { tenant_id: query.tenant_id, model_type: "Matter", matter_id: matterId },
          {
            ...ownerAssignment,
            owner_module: "matter_team",
            updated_by: body.actor_id ?? context.principal.user_id,
            updated_at: ownerAssignment.assigned_at,
          },
        )
      : null;
    const ownerAuditEvent = ownerAssignment
      ? appendAudit(runtime, {
          event_id: `matter.owner.assignment:${query.tenant_id}:${matterId}:${persisted.member_id}`,
          tenant_id: query.tenant_id,
          actor_id: body.actor_id ?? context.principal.user_id,
          action: "matter.owner.assignment",
          object_type: "Matter",
          object_id: matterId,
          reason: "responsible_attorney_assigned",
          occurred_at: ownerAssignment.assigned_at,
          metadata: {
            member_id: persisted.member_id,
            employee_id: ownerAssignment.owner_employee_id,
            user_id_scoped: Boolean(ownerAssignment.owner_user_id),
            permission_ref: query.permission_ref,
          },
        })
      : null;
    return {
      status: 201,
      body: {
        request_id: requestId,
        outcome: "created",
        item: serializeMember(persisted),
        matter: updatedMatter ? serializeMatter(updatedMatter, runtime) : null,
        owner_assignment: ownerAssignment,
        audit_event: ownerAuditEvent,
        safe_error_codes: [],
        audit_hint_ref: query.audit_hint_ref,
        production_ready_claim: false,
      },
    };
  } catch (error) {
    return errorResponse(400, requestId, [MATTER_API_ERROR_CODES.validation_error], {
      audit_hint_ref: query.audit_hint_ref,
      ui_state: "blocked",
      message: error.message,
    });
  }
}

export function handleMatterOwnerChange({ matterId, body, context, requestId, runtime = DEFAULT_MATTER_RUNTIME } = {}) {
  const query = {
    tenant_id: body?.tenant_id,
    permission_ref: body?.permission_ref,
    audit_hint_ref: body?.audit_hint_ref,
  };
  const gated = routeGate({
    context,
    query,
    requestId,
    action: "matter:owner:change",
    resource: { resource_type: "matter_owner_change", resource_id: matterId, matter_id: matterId },
  });
  if (gated) return gated;
  const matter = runtime.repository.get({ tenant_id: query.tenant_id, model_type: "Matter", matter_id: matterId });
  if (!matter || matter.silent === true || matter.hidden_from_actor === true) {
    return errorResponse(404, requestId, [MATTER_API_ERROR_CODES.not_found], {
      audit_hint_ref: query.audit_hint_ref,
      ui_state: "empty",
    });
  }
  const actorId = body?.actor_id ?? context?.principal?.user_id;
  const employeeId = body?.owner?.employee_id ?? body?.employee_id;
  if (typeof actorId !== "string" || actorId.trim() === "" || typeof employeeId !== "string" || employeeId.trim() === "") {
    return errorResponse(400, requestId, [MATTER_API_ERROR_CODES.validation_error], {
      audit_hint_ref: query.audit_hint_ref,
      ui_state: "blocked",
    });
  }
  const employee = runtime.employeeDirectory?.get?.({ tenant_id: query.tenant_id, employee_id: employeeId }) ?? null;
  if (!employee || employee.status !== "active") {
    return errorResponse(400, requestId, [MATTER_API_ERROR_CODES.validation_error], {
      audit_hint_ref: query.audit_hint_ref,
      ui_state: "blocked",
    });
  }
  const assignedAt = body?.assigned_at && !Number.isNaN(Date.parse(body.assigned_at)) ? body.assigned_at : new Date().toISOString();
  const idempotencyKey = body?.idempotency_key ?? `matter-owner-change:${matterId}:${employee.employee_id}`;
  const replay = runtime.repository.getIdempotency({ tenant_id: query.tenant_id, idempotency_key: idempotencyKey });
  if (replay?.response) {
    return {
      status: 200,
      body: {
        ...replay.response,
        request_id: requestId,
        outcome: "idempotent_replay",
        idempotent_replay: true,
        audit_hint_ref: query.audit_hint_ref,
        production_ready_claim: false,
      },
    };
  }
  const ownerAssignment = {
    owner_employee_id: employee.employee_id,
    owner_user_id: employee.user_id ?? null,
    owner_display_name: employee.display_name ?? "책임자",
    assigned_at: assignedAt,
  };
  const updated = runtime.repository.update(
    { tenant_id: query.tenant_id, model_type: "Matter", matter_id: matterId },
    {
      ...ownerAssignment,
      owner_module: "matter_owner_change",
      updated_by: actorId,
      updated_at: assignedAt,
    },
  );
  const auditEvent = appendAudit(runtime, {
    event_id: `matter.owner.change:${query.tenant_id}:${matterId}:${employee.employee_id}`,
    tenant_id: query.tenant_id,
    actor_id: actorId,
    action: "matter.owner.change",
    object_type: "Matter",
    object_id: matterId,
    reason: body?.reason ?? "record_owner_changed",
    occurred_at: assignedAt,
    metadata: {
      previous_owner_employee_id: matter.owner_employee_id ?? null,
      owner_employee_id: ownerAssignment.owner_employee_id,
      user_id_scoped: Boolean(ownerAssignment.owner_user_id),
      permission_ref: query.permission_ref,
    },
  });
  const response = {
    request_id: requestId,
    outcome: "updated",
    item: serializeMatter(updated, runtime),
    owner_assignment: ownerAssignment,
    audit_event: auditEvent,
    idempotent_replay: false,
    safe_error_codes: [],
    audit_hint_ref: query.audit_hint_ref,
    state_idempotent: true,
    production_ready_claim: false,
  };
  runtime.repository.recordIdempotency({
    tenant_id: query.tenant_id,
    idempotency_key: idempotencyKey,
    operation: "matter_owner_change",
    response,
    created_at: assignedAt,
  });
  return { status: 200, body: response };
}

function normalizeMatterInlinePatch(body = {}, requestId) {
  const updates = body.field_updates && typeof body.field_updates === "object" && !Array.isArray(body.field_updates)
    ? body.field_updates
    : {};
  const patch = {};
  const changedFields = [];
  for (const [field, rawValue] of Object.entries(updates)) {
    if (field === "title") {
      const value = String(rawValue ?? "").trim();
      if (value.length < 2 || value.length > 120) {
        return {
          error: errorResponse(400, requestId, [MATTER_API_ERROR_CODES.validation_error], {
            audit_hint_ref: body.audit_hint_ref,
            ui_state: "blocked",
          }),
        };
      }
      patch.title = value;
      changedFields.push(field);
      continue;
    }
    if (field === "wip_status") {
      if (!ALLOWED_MATTER_INLINE_WIP_STATUSES.has(rawValue)) {
        return {
          error: errorResponse(400, requestId, [MATTER_API_ERROR_CODES.validation_error], {
            audit_hint_ref: body.audit_hint_ref,
            ui_state: "blocked",
          }),
        };
      }
      patch.wip_status = rawValue;
      changedFields.push(field);
      continue;
    }
    if (field === "risk_level") {
      if (!ALLOWED_MATTER_INLINE_RISK_LEVELS.has(rawValue)) {
        return {
          error: errorResponse(400, requestId, [MATTER_API_ERROR_CODES.validation_error], {
            audit_hint_ref: body.audit_hint_ref,
            ui_state: "blocked",
          }),
        };
      }
      patch.risk_level = rawValue;
      changedFields.push(field);
      continue;
    }
    return {
      error: errorResponse(400, requestId, [MATTER_API_ERROR_CODES.validation_error], {
        audit_hint_ref: body.audit_hint_ref,
        ui_state: "blocked",
      }),
    };
  }
  if (changedFields.length === 0) {
    return {
      error: errorResponse(400, requestId, [MATTER_API_ERROR_CODES.validation_error], {
        audit_hint_ref: body.audit_hint_ref,
        ui_state: "blocked",
      }),
    };
  }
  return { value: Object.freeze({ patch: Object.freeze(patch), changedFields: Object.freeze(changedFields) }) };
}

export function handleMatterInlinePatch({ matterId, body, context, requestId, runtime = DEFAULT_MATTER_RUNTIME } = {}) {
  const query = {
    tenant_id: body?.tenant_id,
    permission_ref: body?.permission_ref,
    audit_hint_ref: body?.audit_hint_ref,
  };
  const gated = routeGate({
    context,
    query,
    requestId,
    action: "matter:inline:patch",
    resource: { resource_type: "matter_inline_patch", resource_id: matterId, matter_id: matterId },
  });
  if (gated) return gated;
  const matter = runtime.repository.get({ tenant_id: query.tenant_id, model_type: "Matter", matter_id: matterId });
  if (!matter || matter.silent === true || matter.hidden_from_actor === true) {
    return errorResponse(404, requestId, [MATTER_API_ERROR_CODES.not_found], {
      audit_hint_ref: query.audit_hint_ref,
      ui_state: "empty",
    });
  }
  const actorId = body?.actor_id ?? context?.principal?.user_id;
  if (typeof actorId !== "string" || actorId.trim() === "") {
    return errorResponse(400, requestId, [MATTER_API_ERROR_CODES.validation_error], {
      audit_hint_ref: query.audit_hint_ref,
      ui_state: "blocked",
    });
  }
  const normalized = normalizeMatterInlinePatch(body, requestId);
  if (normalized.error) return normalized.error;
  const editedAt = body?.edited_at && !Number.isNaN(Date.parse(body.edited_at)) ? body.edited_at : new Date().toISOString();
  const idempotencyKey = body?.idempotency_key ?? `matter-inline-patch:${matterId}:${normalized.value.changedFields.join(",")}`;
  const replay = runtime.repository.getIdempotency({ tenant_id: query.tenant_id, idempotency_key: idempotencyKey });
  if (replay?.response) {
    return {
      status: 200,
      body: {
        ...replay.response,
        request_id: requestId,
        outcome: "idempotent_replay",
        idempotent_replay: true,
        audit_hint_ref: query.audit_hint_ref,
        production_ready_claim: false,
      },
    };
  }
  const patch = {
    ...normalized.value.patch,
    updated_by: actorId,
    updated_at: editedAt,
  };
  const updated = runtime.repository.update(
    { tenant_id: query.tenant_id, model_type: "Matter", matter_id: matterId },
    patch,
  );
  const previousValues = {};
  for (const field of normalized.value.changedFields) previousValues[field] = matter[field] ?? null;
  const auditEvent = appendAudit(runtime, {
    event_id: `matter.inline.patch:${query.tenant_id}:${matterId}:${normalized.value.changedFields.join("_")}`,
    tenant_id: query.tenant_id,
    actor_id: actorId,
    action: "matter.inline.patch",
    object_type: "Matter",
    object_id: matterId,
    reason: body?.reason ?? "inline_field_edit",
    occurred_at: editedAt,
    metadata: {
      changed_fields: [...normalized.value.changedFields],
      previous_values: previousValues,
      permission_ref: query.permission_ref,
      field_level_allowlist: true,
    },
  });
  const response = {
    request_id: requestId,
    outcome: "updated",
    item: serializeMatter(updated, runtime),
    field_patch: {
      changed_fields: [...normalized.value.changedFields],
      edited_at: editedAt,
      field_level_allowlist: true,
    },
    audit_event: auditEvent,
    idempotent_replay: false,
    safe_error_codes: [],
    audit_hint_ref: query.audit_hint_ref,
    state_idempotent: true,
    production_ready_claim: false,
  };
  runtime.repository.recordIdempotency({
    tenant_id: query.tenant_id,
    idempotency_key: idempotencyKey,
    operation: "matter_inline_patch",
    response,
    created_at: editedAt,
  });
  return { status: 200, body: response };
}

function normalizeMatterStatusTransition(body = {}) {
  const targetStatus = body.target_status ?? body.transition?.target_status ?? "closed";
  if (!ALLOWED_MATTER_STATUS_TRANSITIONS.has(targetStatus)) {
    throw new Error(`Unsupported Matter status transition: ${targetStatus}`);
  }
  return {
    targetStatus,
    reason: body.reason ?? body.transition?.reason ?? "status_complete",
    occurredAt: body.occurred_at ?? body.transition?.occurred_at ?? new Date().toISOString(),
  };
}

function normalizeMatterBulkIds(body = {}, requestId) {
  const ids = Array.isArray(body.matter_ids) ? body.matter_ids : [];
  const uniqueIds = [...new Set(ids.map((id) => String(id ?? "").trim()).filter(Boolean))];
  if (uniqueIds.length === 0 || uniqueIds.length > MAX_BULK_MATTERS) {
    return {
      error: errorResponse(400, requestId, [MATTER_API_ERROR_CODES.validation_error], {
        audit_hint_ref: body.audit_hint_ref,
        ui_state: "blocked",
      }),
    };
  }
  return { value: Object.freeze(uniqueIds) };
}

export function handleMatterStatusTransition({ matterId, body, context, requestId, runtime = DEFAULT_MATTER_RUNTIME } = {}) {
  const query = {
    tenant_id: body?.tenant_id,
    permission_ref: body?.permission_ref,
    audit_hint_ref: body?.audit_hint_ref,
  };
  const gated = routeGate({
    context,
    query,
    requestId,
    action: "matter:status:transition",
    resource: { resource_type: "matter_status_transition", resource_id: matterId, matter_id: matterId },
  });
  if (gated) return gated;
  const matter = runtime.repository.get({ tenant_id: query.tenant_id, model_type: "Matter", matter_id: matterId });
  if (!matter || matter.silent === true || matter.hidden_from_actor === true) {
    return errorResponse(404, requestId, [MATTER_API_ERROR_CODES.not_found], {
      audit_hint_ref: query.audit_hint_ref,
      ui_state: "empty",
    });
  }
  try {
    const transition = normalizeMatterStatusTransition(body);
    const idempotencyKey = body.idempotency_key ?? `matter-status:${matterId}:${transition.targetStatus}`;
    const replay = runtime.repository.getIdempotency({ tenant_id: query.tenant_id, idempotency_key: idempotencyKey });
    if (replay?.response) {
      return {
        status: 200,
        body: {
          ...replay.response,
          request_id: requestId,
          outcome: "idempotent_replay",
          idempotent_replay: true,
          audit_hint_ref: query.audit_hint_ref,
          production_ready_claim: false,
        },
      };
    }
    const patch = {
      status: transition.targetStatus,
      status_transitioned_at: transition.occurredAt,
      status_transition_reason: transition.reason,
      updated_by: body.actor_id ?? context.principal.user_id,
      updated_at: transition.occurredAt,
    };
    if (transition.targetStatus === "closed") {
      patch.closed_at = transition.occurredAt;
      patch.wip_status = matter.wip_status === "ethical_wall" ? matter.wip_status : "completed";
    }
    const updated = runtime.repository.update(
      { tenant_id: query.tenant_id, model_type: "Matter", matter_id: matterId },
      patch,
    );
    const auditEvent = appendAudit(runtime, {
      event_id: `matter.status.transitioned:${query.tenant_id}:${matterId}:${transition.targetStatus}`,
      tenant_id: query.tenant_id,
      actor_id: body.actor_id ?? context.principal.user_id,
      action: "matter.status.transitioned",
      object_type: "Matter",
      object_id: matterId,
      reason: transition.reason,
      occurred_at: transition.occurredAt,
      metadata: {
        previous_status: matter.status,
        target_status: transition.targetStatus,
        permission_ref: query.permission_ref,
      },
    });
    const timeline = createMatterVaultTimelineEvent(runtime, {
      event_id: `matter.timeline.status_transition:${query.tenant_id}:${matterId}:${transition.targetStatus}`,
      tenant_id: query.tenant_id,
      matter_id: matterId,
      occurred_at: transition.occurredAt,
      type: "matter.status.transitioned",
      title: "Matter status updated",
      source_ref: transition.targetStatus,
      source_module: "matter",
      source_object_id: matterId,
      safe_summary: { previous_status: matter.status, target_status: transition.targetStatus },
    });
    const response = {
      request_id: requestId,
      outcome: "updated",
      item: serializeMatter(updated, runtime),
      transition: {
        previous_status: matter.status,
        target_status: transition.targetStatus,
        occurred_at: transition.occurredAt,
        automatic_matter_creation: false,
      },
      audit_event: auditEvent,
      timeline_event: timeline,
      idempotent_replay: false,
      safe_error_codes: [],
      audit_hint_ref: query.audit_hint_ref,
      state_idempotent: true,
      production_ready_claim: false,
    };
    runtime.repository.recordIdempotency({
      tenant_id: query.tenant_id,
      idempotency_key: idempotencyKey,
      operation: "matter_status_transition",
      response,
      created_at: transition.occurredAt,
    });
    return { status: 200, body: response };
  } catch (error) {
    return errorResponse(400, requestId, [MATTER_API_ERROR_CODES.validation_error], {
      audit_hint_ref: query.audit_hint_ref,
      ui_state: "blocked",
      message: error.message,
    });
  }
}

export function handleMatterBulkStatusTransition({ body, context, requestId, runtime = DEFAULT_MATTER_RUNTIME } = {}) {
  const query = {
    tenant_id: body?.tenant_id,
    permission_ref: body?.permission_ref,
    audit_hint_ref: body?.audit_hint_ref,
  };
  const gated = routeGate({
    context,
    query,
    requestId,
    action: "matter:bulk:status:transition",
    resource: { resource_type: "matter_bulk_status_transition" },
  });
  if (gated) return gated;
  const actorId = body?.actor_id ?? context?.principal?.user_id;
  if (typeof actorId !== "string" || actorId.trim() === "") {
    return errorResponse(400, requestId, [MATTER_API_ERROR_CODES.validation_error], {
      audit_hint_ref: query.audit_hint_ref,
      ui_state: "blocked",
    });
  }
  const normalizedIds = normalizeMatterBulkIds(body, requestId);
  if (normalizedIds.error) return normalizedIds.error;
  try {
    const transition = normalizeMatterStatusTransition(body);
    const idempotencyKey = body.idempotency_key ?? `matter-bulk-status:${transition.targetStatus}:${normalizedIds.value.join(":")}`;
    const replay = runtime.repository.getIdempotency({ tenant_id: query.tenant_id, idempotency_key: idempotencyKey });
    if (replay?.response) {
      return {
        status: 200,
        body: {
          ...replay.response,
          request_id: requestId,
          outcome: "idempotent_replay",
          idempotent_replay: true,
          audit_hint_ref: query.audit_hint_ref,
          production_ready_claim: false,
        },
      };
    }
    const matters = normalizedIds.value.map((matterId) =>
      runtime.repository.get({ tenant_id: query.tenant_id, model_type: "Matter", matter_id: matterId }),
    );
    if (matters.some((matter) => !matter || matter.silent === true || matter.hidden_from_actor === true)) {
      return errorResponse(404, requestId, [MATTER_API_ERROR_CODES.not_found], {
        audit_hint_ref: query.audit_hint_ref,
        ui_state: "empty",
      });
    }
    const safeBulkId = String(idempotencyKey).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80);
    const updatedItems = [];
    const timelineEvents = [];
    const auditEvents = [];
    runtime.repository.transaction(() => {
      for (const matter of matters) {
        const patch = {
          status: transition.targetStatus,
          status_transitioned_at: transition.occurredAt,
          status_transition_reason: transition.reason,
          updated_by: actorId,
          updated_at: transition.occurredAt,
        };
        if (transition.targetStatus === "closed") {
          patch.closed_at = transition.occurredAt;
          patch.wip_status = matter.wip_status === "ethical_wall" ? matter.wip_status : "completed";
        }
        const updated = runtime.repository.update(
          { tenant_id: query.tenant_id, model_type: "Matter", matter_id: matter.matter_id },
          patch,
        );
        const auditEvent = appendAudit(runtime, {
          event_id: `matter.status.bulk_transitioned:${query.tenant_id}:${matter.matter_id}:${safeBulkId}`,
          tenant_id: query.tenant_id,
          actor_id: actorId,
          action: "matter.status.bulk_transitioned",
          object_type: "Matter",
          object_id: matter.matter_id,
          reason: transition.reason,
          occurred_at: transition.occurredAt,
          metadata: {
            previous_status: matter.status,
            target_status: transition.targetStatus,
            permission_ref: query.permission_ref,
            bulk_action_ref: safeBulkId,
          },
        });
        const timeline = createMatterVaultTimelineEvent(runtime, {
          event_id: `matter.timeline.bulk_status_transition:${query.tenant_id}:${matter.matter_id}:${safeBulkId}`,
          tenant_id: query.tenant_id,
          matter_id: matter.matter_id,
          occurred_at: transition.occurredAt,
          type: "matter.status.bulk_transitioned",
          title: "Matter bulk status updated",
          source_ref: transition.targetStatus,
          source_module: "matter",
          source_object_id: matter.matter_id,
          safe_summary: { previous_status: matter.status, target_status: transition.targetStatus },
        });
        updatedItems.push(serializeMatter(updated, runtime));
        auditEvents.push(auditEvent);
        timelineEvents.push(timeline);
      }
    });
    const auditEvent = appendAudit(runtime, {
      event_id: `matter.bulk.status_transition:${query.tenant_id}:${safeBulkId}`,
      tenant_id: query.tenant_id,
      actor_id: actorId,
      action: "matter.bulk.status_transition",
      object_type: "MatterBulkAction",
      object_id: safeBulkId,
      reason: transition.reason,
      occurred_at: transition.occurredAt,
      metadata: {
        target_status: transition.targetStatus,
        requested_count: normalizedIds.value.length,
        updated_count: updatedItems.length,
        permission_ref: query.permission_ref,
      },
    });
    const response = {
      request_id: requestId,
      outcome: "updated",
      items: updatedItems,
      bulk_action: {
        target_status: transition.targetStatus,
        requested_count: normalizedIds.value.length,
        updated_count: updatedItems.length,
        automatic_matter_creation: false,
        partial_update: false,
      },
      audit_event: auditEvent,
      audit_events: auditEvents,
      timeline_events: timelineEvents,
      idempotent_replay: false,
      safe_error_codes: [],
      audit_hint_ref: query.audit_hint_ref,
      state_idempotent: true,
      count_leak_prevented: true,
      production_ready_claim: false,
    };
    runtime.repository.recordIdempotency({
      tenant_id: query.tenant_id,
      idempotency_key: idempotencyKey,
      operation: "matter_bulk_status_transition",
      response,
      created_at: transition.occurredAt,
    });
    return { status: 200, body: response };
  } catch (error) {
    return errorResponse(400, requestId, [MATTER_API_ERROR_CODES.validation_error], {
      audit_hint_ref: query.audit_hint_ref,
      ui_state: "blocked",
      message: error.message,
    });
  }
}

export function handleMatterRecentlyViewedList({ query, context, requestId, runtime = DEFAULT_MATTER_RUNTIME } = {}) {
  const gated = routeGate({
    context,
    query,
    requestId,
    action: "matter:recent:read",
    resource: { resource_type: "matter_recent_view" },
  });
  if (gated) return gated;
  const { limit, error } = parseLimit(query.limit, requestId);
  if (error) return error;
  const actorId = context?.principal?.user_id ?? "unknown";
  const items = runtime.repository
    .list({ tenant_id: query.tenant_id, model_type: "MatterRecentView" })
    .filter((record) => record.viewer_user_id === actorId)
    .sort((left, right) => String(right.viewed_at ?? "").localeCompare(String(left.viewed_at ?? "")))
    .map((record) => serializeRecentMatterView(record, runtime))
    .filter(Boolean)
    .slice(0, limit);
  return {
    status: 200,
    body: {
      request_id: requestId,
      outcome: "passed",
      items,
      safe_error_codes: [],
      audit_hint_ref: query.audit_hint_ref,
      ui_state: items.length === 0 ? "empty" : null,
      count_leak_prevented: true,
      production_ready_claim: false,
    },
  };
}

export function handleMatterListViewList({ query, context, requestId, runtime = DEFAULT_MATTER_RUNTIME } = {}) {
  const gated = routeGate({
    context,
    query,
    requestId,
    action: "matter:list_view:read",
    resource: { resource_type: "matter_list_view" },
  });
  if (gated) return gated;
  const { limit, error } = parseLimit(query.limit, requestId);
  if (error) return error;
  const actorId = context?.principal?.user_id ?? "unknown";
  const items = runtime.repository
    .list({ tenant_id: query.tenant_id, model_type: "MatterListView" })
    .filter((record) => record.system_view === true || record.owner_user_id === actorId)
    .sort((left, right) => {
      if (left.system_view === true && right.system_view !== true) return -1;
      if (left.system_view !== true && right.system_view === true) return 1;
      return String(right.updated_at ?? right.created_at ?? "").localeCompare(String(left.updated_at ?? left.created_at ?? ""));
    })
    .map((record) => serializeMatterListView(record))
    .slice(0, limit);
  return {
    status: 200,
    body: {
      request_id: requestId,
      outcome: "passed",
      items,
      safe_error_codes: [],
      audit_hint_ref: query.audit_hint_ref,
      ui_state: items.length === 0 ? "empty" : null,
      count_leak_prevented: true,
      production_ready_claim: false,
    },
  };
}

export function handleMatterListViewSave({ body, context, requestId, runtime = DEFAULT_MATTER_RUNTIME } = {}) {
  const query = {
    tenant_id: body?.tenant_id,
    permission_ref: body?.permission_ref,
    audit_hint_ref: body?.audit_hint_ref,
  };
  const gated = routeGate({
    context,
    query,
    requestId,
    action: "matter:list_view:write",
    resource: { resource_type: "matter_list_view" },
  });
  if (gated) return gated;
  const actorId = body?.actor_id ?? context?.principal?.user_id;
  if (typeof actorId !== "string" || actorId.trim() === "") {
    return errorResponse(400, requestId, [MATTER_API_ERROR_CODES.validation_error], {
      audit_hint_ref: query.audit_hint_ref,
      ui_state: "blocked",
    });
  }
  const normalized = normalizeMatterListViewBody(body, requestId);
  if (normalized.error) return normalized.error;
  if (DEFAULT_MATTER_LIST_VIEWS.some((view) => view.list_view_id === normalized.value.listViewId)) {
    return errorResponse(400, requestId, [MATTER_API_ERROR_CODES.validation_error], {
      audit_hint_ref: query.audit_hint_ref,
      ui_state: "blocked",
    });
  }
  const existing = runtime.repository.get({
    tenant_id: query.tenant_id,
    model_type: "MatterListView",
    resource_id: normalized.value.listViewId,
  });
  if (existing && existing.system_view === true) {
    return errorResponse(400, requestId, [MATTER_API_ERROR_CODES.validation_error], {
      audit_hint_ref: query.audit_hint_ref,
      ui_state: "blocked",
    });
  }
  const now = body?.updated_at && !Number.isNaN(Date.parse(body.updated_at)) ? body.updated_at : new Date().toISOString();
  const persisted = runtime.repository.upsert({
    model_type: "MatterListView",
    resource_id: normalized.value.listViewId,
    list_view_id: normalized.value.listViewId,
    tenant_id: query.tenant_id,
    label: normalized.value.label,
    filter: { status: normalized.value.status },
    sort: normalized.value.sort,
    system_view: false,
    owner_user_id: actorId,
    created_at: existing?.created_at ?? now,
    updated_at: now,
  });
  const auditEvent = appendAudit(runtime, {
    event_id: `matter.list_view.saved:${query.tenant_id}:${normalized.value.listViewId}:${now}`,
    tenant_id: query.tenant_id,
    actor_id: actorId,
    action: "matter.list_view.saved",
    object_type: "MatterListView",
    object_id: normalized.value.listViewId,
    reason: "matter_saved_list_view_updated",
    occurred_at: now,
    metadata: {
      filter_status: normalized.value.status,
      permission_ref: query.permission_ref,
      owner_scoped: true,
    },
  });
  return {
    status: existing ? 200 : 201,
    body: {
      request_id: requestId,
      outcome: existing ? "updated" : "created",
      item: serializeMatterListView(persisted),
      audit_event: auditEvent,
      safe_error_codes: [],
      audit_hint_ref: query.audit_hint_ref,
      state_idempotent: true,
      production_ready_claim: false,
    },
  };
}

export function handleMatterRecentlyViewedMark({ matterId, body, context, requestId, runtime = DEFAULT_MATTER_RUNTIME } = {}) {
  const query = {
    tenant_id: body?.tenant_id,
    permission_ref: body?.permission_ref,
    audit_hint_ref: body?.audit_hint_ref,
  };
  const gated = routeGate({
    context,
    query,
    requestId,
    action: "matter:recent:write",
    resource: { resource_type: "matter_recent_view", resource_id: matterId, matter_id: matterId },
  });
  if (gated) return gated;
  const matter = runtime.repository.get({ tenant_id: query.tenant_id, model_type: "Matter", matter_id: matterId });
  if (!matter || matter.silent === true || matter.hidden_from_actor === true) {
    return errorResponse(404, requestId, [MATTER_API_ERROR_CODES.not_found], {
      audit_hint_ref: query.audit_hint_ref,
      ui_state: "empty",
    });
  }
  const actorId = body?.actor_id ?? context?.principal?.user_id;
  if (typeof actorId !== "string" || actorId.trim() === "") {
    return errorResponse(400, requestId, [MATTER_API_ERROR_CODES.validation_error], {
      audit_hint_ref: query.audit_hint_ref,
      ui_state: "blocked",
    });
  }
  const viewedAt = body?.viewed_at ?? new Date().toISOString();
  if (Number.isNaN(Date.parse(viewedAt))) {
    return errorResponse(400, requestId, [MATTER_API_ERROR_CODES.validation_error], {
      audit_hint_ref: query.audit_hint_ref,
      ui_state: "blocked",
    });
  }
  const resourceId = `matter_recent:${actorId}:${matterId}`;
  const persisted = runtime.repository.upsert({
    model_type: "MatterRecentView",
    resource_id: resourceId,
    recent_view_id: resourceId,
    tenant_id: query.tenant_id,
    matter_id: matterId,
    viewer_user_id: actorId,
    viewed_at: viewedAt,
  });
  const auditEvent = appendAudit(runtime, {
    event_id: `matter.recently_viewed.mark:${query.tenant_id}:${matterId}:${actorId}`,
    tenant_id: query.tenant_id,
    actor_id: actorId,
    action: "matter.recently_viewed.mark",
    object_type: "Matter",
    object_id: matterId,
    reason: "matter_record_recently_viewed",
    occurred_at: viewedAt,
    metadata: {
      viewer_scoped: true,
      permission_ref: query.permission_ref,
    },
  });
  return {
    status: 200,
    body: {
      request_id: requestId,
      outcome: "updated",
      item: serializeRecentMatterView(persisted, runtime),
      audit_event: auditEvent,
      safe_error_codes: [],
      audit_hint_ref: query.audit_hint_ref,
      state_idempotent: true,
      production_ready_claim: false,
    },
  };
}

export function handleMatterAudit({ query, context, requestId, runtime = DEFAULT_MATTER_RUNTIME } = {}) {
  const gated = routeGate({
    context,
    query,
    requestId,
    action: "matter:audit:read",
    resource: { resource_type: "matter_audit" },
  });
  if (gated) return gated;
  return {
    status: 200,
    body: {
      request_id: requestId,
      outcome: "passed",
      items: runtime.repository.listAudit({ tenant_id: query.tenant_id }),
      safe_error_codes: [],
      audit_hint_ref: query.audit_hint_ref,
      ui_state: null,
      production_ready_claim: false,
    },
  };
}

export async function handleMatterApiRequest({
  pathname,
  method,
  query,
  body,
  context,
  requestId,
  runtime = DEFAULT_MATTER_RUNTIME,
} = {}) {
  if (pathname === "/api/matters" && method === "GET") {
    return handleMatterList({ query, context, requestId, runtime });
  }
  if (pathname === "/api/matters/audit" && method === "GET") {
    return handleMatterAudit({ query, context, requestId, runtime });
  }
  if (pathname === "/api/matters/recently-viewed" && method === "GET") {
    return handleMatterRecentlyViewedList({ query, context, requestId, runtime });
  }
  if (pathname === "/api/matters/list-views" && method === "GET") {
    return handleMatterListViewList({ query, context, requestId, runtime });
  }
  if (pathname === "/api/matters/openings" && method === "POST") {
    return handleMatterOpening({ body, context, requestId, runtime });
  }
  if (pathname === "/api/matters/list-views" && method === "POST") {
    return handleMatterListViewSave({ body, context, requestId, runtime });
  }
  if (pathname === "/api/matters/bulk/status-transitions" && method === "POST") {
    return handleMatterBulkStatusTransition({ body, context, requestId, runtime });
  }
  const commandCenterMatch = pathname.match(/^\/api\/matters\/([^/]+)\/command-center$/);
  if (commandCenterMatch && method === "GET") {
    return handleMatterCommandCenter({
      matterId: decodeURIComponent(commandCenterMatch[1]),
      query,
      context,
      requestId,
      runtime,
    });
  }
  const vaultSummaryMatch = pathname.match(/^\/api\/matters\/([^/]+)\/vault-summary$/);
  if (vaultSummaryMatch && method === "GET") {
    return handleMatterVaultSummary({
      matterId: decodeURIComponent(vaultSummaryMatch[1]),
      query,
      context,
      requestId,
      runtime,
    });
  }
  const timelineMatch = pathname.match(/^\/api\/matters\/([^/]+)\/timeline$/);
  if (timelineMatch && method === "GET") {
    return handleMatterTimeline({
      matterId: decodeURIComponent(timelineMatch[1]),
      query,
      context,
      requestId,
      runtime,
    });
  }
  const activitiesMatch = pathname.match(/^\/api\/matters\/([^/]+)\/activities$/);
  if (activitiesMatch && method === "GET") {
    return handleMatterActivitiesList({
      matterId: decodeURIComponent(activitiesMatch[1]),
      query,
      context,
      requestId,
      runtime,
    });
  }
  if (activitiesMatch && method === "POST") {
    return handleMatterActivityCreate({
      matterId: decodeURIComponent(activitiesMatch[1]),
      body,
      context,
      requestId,
      runtime,
    });
  }
  const activityPatchMatch = pathname.match(/^\/api\/matters\/([^/]+)\/activities\/([^/]+)$/);
  if (activityPatchMatch && method === "PATCH") {
    return handleMatterActivityPatch({
      matterId: decodeURIComponent(activityPatchMatch[1]),
      activityId: decodeURIComponent(activityPatchMatch[2]),
      body,
      context,
      requestId,
      runtime,
    });
  }
  const calendarMatch = pathname.match(/^\/api\/matters\/([^/]+)\/calendar-events$/);
  if (calendarMatch && method === "GET") {
    return handleMatterCalendarList({
      matterId: decodeURIComponent(calendarMatch[1]),
      query,
      context,
      requestId,
      runtime,
    });
  }
  if (calendarMatch && method === "POST") {
    return handleMatterCalendarCreate({
      matterId: decodeURIComponent(calendarMatch[1]),
      body,
      context,
      requestId,
      runtime,
    });
  }
  const calendarPatchMatch = pathname.match(/^\/api\/matters\/([^/]+)\/calendar-events\/([^/]+)$/);
  if (calendarPatchMatch && method === "PATCH") {
    return handleMatterCalendarPatch({
      matterId: decodeURIComponent(calendarPatchMatch[1]),
      eventId: decodeURIComponent(calendarPatchMatch[2]),
      body,
      context,
      requestId,
      runtime,
    });
  }
  const deadlinesMatch = pathname.match(/^\/api\/matters\/([^/]+)\/deadlines$/);
  if (deadlinesMatch && method === "GET") {
    return handleMatterDeadlinesList({
      matterId: decodeURIComponent(deadlinesMatch[1]),
      query,
      context,
      requestId,
      runtime,
    });
  }
  const deadlineConfirmMatch = pathname.match(/^\/api\/matters\/([^/]+)\/deadlines\/([^/]+)\/confirm-change$/);
  if (deadlineConfirmMatch && method === "POST") {
    return handleMatterDeadlineConfirm({
      matterId: decodeURIComponent(deadlineConfirmMatch[1]),
      deadlineId: decodeURIComponent(deadlineConfirmMatch[2]),
      body,
      context,
      requestId,
      runtime,
    });
  }
  const channelMatch = pathname.match(/^\/api\/matters\/([^/]+)\/channel$/);
  if (channelMatch && method === "GET") {
    return handleMatterChannelRead({
      matterId: decodeURIComponent(channelMatch[1]),
      query,
      context,
      requestId,
      runtime,
    });
  }
  const channelMessagesMatch = pathname.match(/^\/api\/matters\/([^/]+)\/channel\/messages$/);
  if (channelMessagesMatch && method === "POST") {
    return handleMatterChannelMessageCreate({
      matterId: decodeURIComponent(channelMessagesMatch[1]),
      body,
      context,
      requestId,
      runtime,
    });
  }
  const channelProviderSyncMatch = pathname.match(/^\/api\/matters\/([^/]+)\/channel\/provider-sync$/);
  if (channelProviderSyncMatch && method === "POST") {
    return handleMatterChannelProviderSync({
      matterId: decodeURIComponent(channelProviderSyncMatch[1]),
      body,
      context,
      requestId,
      runtime,
    });
  }
  const documentTemplatesMatch = pathname.match(/^\/api\/matters\/([^/]+)\/document-templates$/);
  if (documentTemplatesMatch && method === "GET") {
    return handleMatterDocumentTemplates({
      matterId: decodeURIComponent(documentTemplatesMatch[1]),
      query,
      context,
      requestId,
      runtime,
    });
  }
  const builderDraftsMatch = pathname.match(/^\/api\/matters\/([^/]+)\/builder-drafts$/);
  if (builderDraftsMatch && method === "POST") {
    return handleMatterBuilderDraftCreate({
      matterId: decodeURIComponent(builderDraftsMatch[1]),
      body,
      context,
      requestId,
      runtime,
    });
  }
  const builderDraftMatch = pathname.match(/^\/api\/matters\/([^/]+)\/builder-drafts\/([^/]+)$/);
  if (builderDraftMatch && method === "PATCH") {
    return handleMatterBuilderDraftPatch({
      matterId: decodeURIComponent(builderDraftMatch[1]),
      draftId: decodeURIComponent(builderDraftMatch[2]),
      body,
      context,
      requestId,
      runtime,
    });
  }
  const builderPreviewMatch = pathname.match(/^\/api\/matters\/([^/]+)\/builder-drafts\/([^/]+)\/preview$/);
  if (builderPreviewMatch && method === "GET") {
    return handleMatterBuilderDraftPreview({
      matterId: decodeURIComponent(builderPreviewMatch[1]),
      draftId: decodeURIComponent(builderPreviewMatch[2]),
      query,
      context,
      requestId,
      runtime,
    });
  }
  const builderApprovalRequestMatch = pathname.match(/^\/api\/matters\/([^/]+)\/builder-drafts\/([^/]+)\/approval-requests$/);
  if (builderApprovalRequestMatch && method === "POST") {
    return handleMatterBuilderApprovalRequest({
      matterId: decodeURIComponent(builderApprovalRequestMatch[1]),
      draftId: decodeURIComponent(builderApprovalRequestMatch[2]),
      body,
      context,
      requestId,
      runtime,
    });
  }
  const builderApprovalListMatch = pathname.match(/^\/api\/matters\/([^/]+)\/builder-approval-requests$/);
  if (builderApprovalListMatch && method === "GET") {
    return handleMatterBuilderApprovalList({
      matterId: decodeURIComponent(builderApprovalListMatch[1]),
      query,
      context,
      requestId,
      runtime,
    });
  }
  const builderPublishMatch = pathname.match(/^\/api\/matters\/([^/]+)\/builder-drafts\/([^/]+)\/publish-to-vault$/);
  if (builderPublishMatch && method === "POST") {
    return handleMatterBuilderPublishToVault({
      matterId: decodeURIComponent(builderPublishMatch[1]),
      draftId: decodeURIComponent(builderPublishMatch[2]),
      body,
      context,
      requestId,
      runtime,
    });
  }
  const emailDraftsMatch = pathname.match(/^\/api\/matters\/([^/]+)\/email-drafts$/);
  if (emailDraftsMatch && method === "POST") {
    return handleMatterEmailDraftCreate({
      matterId: decodeURIComponent(emailDraftsMatch[1]),
      body,
      context,
      requestId,
      runtime,
    });
  }
  const emailDraftMatch = pathname.match(/^\/api\/matters\/([^/]+)\/email-drafts\/([^/]+)$/);
  if (emailDraftMatch && method === "PATCH") {
    return handleMatterEmailDraftPatch({
      matterId: decodeURIComponent(emailDraftMatch[1]),
      draftId: decodeURIComponent(emailDraftMatch[2]),
      body,
      context,
      requestId,
      runtime,
    });
  }
  const emailDraftSendMatch = pathname.match(/^\/api\/matters\/([^/]+)\/email-drafts\/([^/]+)\/send$/);
  if (emailDraftSendMatch && method === "POST") {
    return handleMatterEmailDraftSend({
      matterId: decodeURIComponent(emailDraftSendMatch[1]),
      draftId: decodeURIComponent(emailDraftSendMatch[2]),
      body,
      context,
      requestId,
      runtime,
    });
  }
  const documentFacadeMatch = pathname.match(/^\/api\/matters\/([^/]+)\/documents$/);
  if (documentFacadeMatch && method === "POST") {
    return handleMatterDocumentFacade({
      matterId: decodeURIComponent(documentFacadeMatch[1]),
      body,
      context,
      requestId,
      runtime,
    });
  }
  const ownerChangeMatch = pathname.match(/^\/api\/matters\/([^/]+)\/owner-change$/);
  if (ownerChangeMatch && method === "POST") {
    return handleMatterOwnerChange({
      matterId: decodeURIComponent(ownerChangeMatch[1]),
      body,
      context,
      requestId,
      runtime,
    });
  }
  const statusTransitionMatch = pathname.match(/^\/api\/matters\/([^/]+)\/status-transitions$/);
  if (statusTransitionMatch && method === "POST") {
    return handleMatterStatusTransition({
      matterId: decodeURIComponent(statusTransitionMatch[1]),
      body,
      context,
      requestId,
      runtime,
    });
  }
  const recentlyViewedMatch = pathname.match(/^\/api\/matters\/([^/]+)\/recently-viewed$/);
  if (recentlyViewedMatch && method === "POST") {
    return handleMatterRecentlyViewedMark({
      matterId: decodeURIComponent(recentlyViewedMatch[1]),
      body,
      context,
      requestId,
      runtime,
    });
  }
  const inlinePatchMatch = pathname.match(/^\/api\/matters\/([^/]+)$/);
  if (inlinePatchMatch && method === "PATCH") {
    return handleMatterInlinePatch({
      matterId: decodeURIComponent(inlinePatchMatch[1]),
      body,
      context,
      requestId,
      runtime,
    });
  }
  const detailMatch = pathname.match(/^\/api\/matters\/([^/]+)$/);
  if (detailMatch && method === "GET") {
    return handleMatterDetail({
      matterId: decodeURIComponent(detailMatch[1]),
      query,
      context,
      requestId,
      runtime,
    });
  }
  const teamMatch = pathname.match(/^\/api\/matters\/([^/]+)\/team-members$/);
  if (teamMatch && method === "POST") {
    return handleMatterTeamMemberCreate({
      matterId: decodeURIComponent(teamMatch[1]),
      body,
      context,
      requestId,
      runtime,
    });
  }
  return errorResponse(404, requestId, [MATTER_API_ERROR_CODES.not_found], { audit_hint_ref: query.audit_hint_ref });
}
