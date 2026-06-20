import { createMatterCoreSyntheticFixture, createMatterRepository } from "../../../packages/matter/src/index.js";
import { addMatterTeamMember } from "../../../packages/matter/src/staffing-service.js";
import { appendMatterAuditEvent } from "../../../packages/matter/src/audit.js";
import { openMatterTransaction } from "../../../packages/matter/src/opening-service.js";
import { createMatterClientReportProjection } from "../../../packages/matter/src/client-report.js";
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
    "POST /api/matters/openings",
    "POST /api/matters/:matter_id/team-members",
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
const DEFAULT_TENANT = "tenant_rp05_synthetic";

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function createMatterRuntimeSeed() {
  const fixture = createMatterCoreSyntheticFixture();
  const records = fixture.records.map((record) => {
    if (record.model_type === "Matter") {
      return {
        ...record,
        matter_number: "M-TENANT-RP05-0001",
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
    model_type: "Matter",
    matter_id: "matter_rp05_silent_wall",
    tenant_id: fixture.tenant_id,
    client_id: "client_rp05_silent",
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
  billing = createSideEffectAdapter("matter_billing"),
} = {}) {
  return Object.freeze({
    repository,
    employeeDirectory,
    dms,
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
  return Object.freeze({
    tenant_id: record.tenant_id,
    resource_id: record.matter_id,
    matter_id: record.matter_id,
    matter_number: record.matter_number ?? null,
    title: record.title,
    status: record.status,
    client_id: record.client_id ?? record.legal_client_party_id ?? null,
    legal_client_party_id: record.legal_client_party_id ?? record.client_id ?? null,
    billing_client_party_id: record.billing_client_party_id ?? record.legal_client_party_id ?? record.client_id ?? null,
    owner_module: record.owner_module,
    permission_envelope_id: record.permission_envelope_id,
    audit_trace_id: record.audit_trace_id,
    document_count: record.document_count ?? 0,
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
    const result = openMatterTransaction({
      repository: runtime.repository,
      matter: body.matter,
      clearance_token: body.clearance_token,
      matter_number_seed: body.matter_number_seed,
      idempotency_key: body.idempotency_key,
      dms: runtime.dms,
      billing: runtime.billing,
      actor_id: body.actor_id ?? context.principal.user_id,
    });
    return {
      status: result.idempotent_replay ? 200 : 201,
      body: {
        request_id: requestId,
        outcome: result.idempotent_replay ? "idempotent_replay" : "created",
      item: serializeMatter(result.matter, runtime),
        dms_workspace: result.dms_workspace,
        billing_ledger: result.billing_ledger,
        audit_event: result.audit_event,
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
    return {
      status: 201,
      body: {
        request_id: requestId,
        outcome: "created",
        item: serializeMember(persisted),
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
  if (pathname === "/api/matters/openings" && method === "POST") {
    return handleMatterOpening({ body, context, requestId, runtime });
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
