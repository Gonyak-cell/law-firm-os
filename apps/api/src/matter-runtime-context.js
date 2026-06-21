import { createMatterCoreSyntheticFixture, createMatterRepository } from "../../../packages/matter/src/index.js";
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
    "POST /api/matters/openings",
    "POST /api/matters/:matter_id/documents",
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
          billing: runtime.billing,
          actor_id: actorId,
        })
      : openMatterTransaction({
          repository: runtime.repository,
          matter: body.matter,
          clearance_token: body.clearance_token,
          matter_number_seed: body.matter_number_seed,
          idempotency_key: body.idempotency_key,
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
    const timeline = createMatterVaultTimelineEvent(runtime, {
      event_id: `matter.timeline.vault_document:${query.tenant_id}:${matterId}:${result.document.document_id}`,
      tenant_id: query.tenant_id,
      matter_id: matterId,
      type: "document.version.created",
      title: result.document.title,
      source_ref: result.document.document_id,
      source_object_id: result.document.document_id,
      safe_summary: { document_id: result.document.document_id, version_id: result.version.version_id },
    });
    appendAudit(runtime, {
      event_id: `matter.document_facade.uploaded:${query.tenant_id}:${matterId}:${result.document.document_id}`,
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
