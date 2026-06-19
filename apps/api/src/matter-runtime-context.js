import { randomUUID } from "node:crypto";
import { buildAuditEventInput, createAuditLedger } from "../../../packages/audit/src/index.js";
import { createIntakeClearanceTokenDescriptor } from "../../../packages/intake/src/index.js";
import {
  createMatterCalendarDeadlineChangeDescriptor,
  createMatterClientReportProjectionDescriptor,
  createMatterClosingChecklistDescriptor,
  createMatterCoreRecord,
  createMatterCriticalDeadlineDualControlDescriptor,
  createMatterDashboardUiStateDescriptor,
  createMatterG4AOpeningFoundationCloseoutDescriptor,
  createMatterG4BExecutionWorkflowCloseoutDescriptor,
  createMatterG4CMatterCloseoutDescriptor,
  createMatterG4ClosingChecklist,
  createMatterG4Member,
  createMatterG4OpeningRecord,
  createMatterGraphSkeletonForMatter,
  createMatterMemberPermissionDescriptor,
  createMatterNumberReservationDescriptor,
  createMatterOpeningTransactionDescriptor,
  createMatterSilentMatterVisibilityDescriptor,
  createMatterStatusHistoryDescriptor,
  createMatterTaskTransitionDescriptor,
  createMatterTeamUiStateDescriptor,
  createMatterWikiShellForMatter,
} from "../../../packages/matter/src/index.js";

const SYNTHETIC_TENANT = "tenant-a";
const RUNTIME_READINESS = "runtime_api_evidence_only__durable_persistence_open";

const MATTER_PREFIXES = Object.freeze([
  "/api/matter/runtime/evidence",
  "/api/matter/clearance-tokens",
  "/api/matter/matter-numbers/reservations",
  "/api/matter/opening/transactions",
  "/api/matter/matters",
  "/api/matter/dashboard",
  "/api/matter/audit",
]);

export const CMP_G4_TUW_IDS = Object.freeze([
  "CMP-G4-W04-T001",
  "CMP-G4-W04-T002",
  "CMP-G4-W04-T003",
  "CMP-G4-W04-T004",
  "CMP-G4-W04-T005",
  "CMP-G4-W04-T006",
  "CMP-G4-W04-T007",
  "CMP-G4-W04-T008",
  "CMP-G4-W04-T009",
  "CMP-G4-W04-T010",
  "CMP-G4-W04-T011",
  "CMP-G4-W04-T012",
  "CMP-G4-W04-T013",
  "CMP-G4-W04-T014",
  "CMP-G4-W04-T015",
  "CMP-G4-W04-T016",
  "CMP-G4-W04-T017",
  "CMP-G4-W04-T018",
  "CMP-G4-W04-T019",
  "CMP-G4-W04-T020",
  "CMP-G4-W04-T021",
  "CMP-G4-W04-T022",
  "CMP-G4-W04-T023",
]);

export const MATTER_CORE_BOUNDED_CONTEXT = Object.freeze({
  bounded_context: "matter-core",
  cmp_gate: "CMP-G4",
  cmp_work_package: "CMP-G4-W04",
  depends_on: Object.freeze(["CMP-G1-W01", "CMP-G2-W02", "CMP-G3-W03"]),
  package_ref: "packages/matter",
  source_boundary_refs: Object.freeze(["packages/crm", "packages/intake", "packages/hrx"]),
  ui_refs: Object.freeze(["apps/web/src/data/matterApiClient.js", "apps/web/src/components/MatterModal.jsx"]),
  runtime_routes: MATTER_PREFIXES,
  tuw_ids: CMP_G4_TUW_IDS,
  legacy_reference_tuw_ids: Object.freeze([
    "LFOS-G4-W05-T001",
    "LFOS-G4-W05-T002",
    "LFOS-G4-W05-T003",
    "LFOS-G4-W05-T004",
    "LFOS-G4-W05-T005",
    "LFOS-G4-W05-T006",
    "LFOS-G4-W05-T007",
    "LFOS-G4-W05-T008",
    "LFOS-G4-W05-T009",
    "LFOS-G4-W05-T010",
    "LFOS-G4-W05-T011",
    "LFOS-G4-W05-T012",
    "LFOS-G4-W05-T013",
    "LFOS-G4-W05-T014",
  ]),
  runtime_readiness_claim: RUNTIME_READINESS,
});

export function isMatterPath(pathname) {
  return MATTER_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function response(status, body) {
  return { status, body };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function key(tenantId, id) {
  return `${tenantId}:${id}`;
}

function requireTenant(query = {}) {
  if (query.tenant_id !== SYNTHETIC_TENANT) {
    const error = new Error("Matter synthetic tenant is required");
    error.safe_error_code = "CMP_G4_TENANT_REQUIRED";
    throw error;
  }
  return query.tenant_id;
}

function actorContext(query = {}) {
  return {
    actor_id: query.actor_id ?? "matter-runtime-actor",
    actor_type: "user",
    tenant_id: query.tenant_id,
  };
}

function safeError(error) {
  return response(400, {
    outcome: "blocked",
    safe_error_code: error.safe_error_code ?? "CMP_G4_VALIDATION_ERROR",
    reason: error.message,
  });
}

function notFound(code, reason = "not_found") {
  return response(404, { outcome: "not_found", safe_error_code: code, reason });
}

function appendMatterAudit(context, { tenant_id, actor_id, action, object_type, object_id, reason, matter_id, evidence_refs = [] }) {
  const event = context.auditLedger.append(
    buildAuditEventInput({
      tenant_id,
      actor: { actor_id, actor_type: "user" },
      action,
      object: { object_type, object_id },
      outcome: "success",
      decision: "allow",
      reason_code: reason,
      source_service: "@law-firm-os/api:matter-runtime",
      request: {
        request_id: `cmp_g4_req_${randomUUID()}`,
        trace_id: `cmp_g4_trace_${matter_id ?? object_id}`,
        span_id: "cmp_g4_runtime",
        idempotency_key: `${tenant_id}:${action}:${object_id}:${matter_id ?? "tenant"}`,
      },
      matter_id,
      evidence_refs,
      permission_decision_id: `cmp_g4_permission_${object_type}_${object_id}`,
    }),
  );
  return clone(event);
}

function defaultClearanceInput({ tenant_id, actor_id, body = {} }) {
  const issuedAt = body.issued_at ?? "2026-06-20T00:00:00.000Z";
  const snapshotHash = body.snapshot_hash ?? "cmp-g4-clearance-snapshot-hash";
  return {
    tenant_id,
    actor_id,
    clearance_token_id: body.clearance_token_id ?? `clearance-cmp-g4-${randomUUID()}`,
    intake_request_id: body.intake_request_id ?? "intake-cmp-g4",
    conflict_check_id: body.conflict_check_id ?? "conflict-cmp-g4",
    engagement_id: body.engagement_id ?? "engagement-cmp-g4",
    issued_at: issuedAt,
    expires_at: body.expires_at ?? "2030-01-01T00:00:00.000Z",
    snapshot_hash: snapshotHash,
    current_snapshot_hash: body.current_snapshot_hash ?? snapshotHash,
    current_time: body.current_time ?? issuedAt,
    matter_id: body.matter_id,
    matter_number: body.matter_number,
    create_matter: body.create_matter,
    matter_creation_requested: body.matter_creation_requested,
    command_payload: body.command_payload,
  };
}

function materializeClearanceToken(descriptor) {
  return Object.freeze({
    clearance_token_id: descriptor.clearance_token_id,
    tenant_id: descriptor.tenant_id,
    intake_request_id: descriptor.intake_request_id,
    conflict_check_id: descriptor.conflict_check_id,
    engagement_id: descriptor.engagement_id,
    issued_at: descriptor.issued_at,
    expires_at: descriptor.expires_at,
    snapshot_hash: descriptor.snapshot_hash,
    current_snapshot_hash: descriptor.current_snapshot_hash,
    token_state: descriptor.token_state,
    outcome: descriptor.outcome,
    blocked_claims: descriptor.blocked_claims,
    review_required_claims: descriptor.review_required_claims,
    clearance_receipt: descriptor.clearance_receipt,
    source_descriptor_type: descriptor.descriptor_type,
    crm_intake_clearance_required_before_matter_opening: true,
  });
}

function lookupMatter(context, tenantId, matterId) {
  return context.matters.get(key(tenantId, matterId)) ?? null;
}

function publicMatterProjection(entry) {
  return {
    matter_id: entry.matter.matter_id,
    matter_number: entry.matter.matter_number,
    title: entry.matter.title,
    status: entry.matter.status,
    legal_client_party_id: entry.matter.legal_client_party_id,
    clearance_token_id: entry.matter.clearance_token_id,
    matter_wiki_ref: entry.matter.matter_wiki_ref,
    matter_graph_ref: entry.matter.matter_graph_ref,
  };
}

function createDefaultTask({ tenant_id, matter_id, actor_id }) {
  return createMatterCoreRecord("MatterTask", {
    task_id: `task-${matter_id}-opening`,
    tenant_id,
    matter_id,
    title: "Confirm matter opening checklist",
    status: "todo",
    created_by: actor_id,
    permission_envelope_id: `perm-${matter_id}-task`,
    audit_trace_id: `audit-${matter_id}-task`,
  });
}

function createDefaultCalendarEvent({ tenant_id, matter_id }) {
  return createMatterCoreRecord("MatterCalendarEvent", {
    event_id: `deadline-${matter_id}-filing`,
    tenant_id,
    matter_id,
    title: "Initial filing deadline",
    status: "scheduled",
    starts_at: "2026-07-01T00:00:00.000Z",
    ends_at: "2026-07-01T01:00:00.000Z",
    permission_envelope_id: `perm-${matter_id}-deadline`,
    audit_trace_id: `audit-${matter_id}-deadline`,
  });
}

function createClosingChecklist({ tenant_id, matter_id }) {
  return createMatterG4ClosingChecklist({
    checklist_id: `closing-${matter_id}`,
    tenant_id,
    matter_id,
    title: "Matter closing checklist",
    status: "active",
    item_ids: ["wip", "ar", "retention", "tasks"],
    permission_envelope_id: `perm-${matter_id}-closing`,
    audit_trace_id: `audit-${matter_id}-closing`,
  });
}

export function createMatterRuntimeContext() {
  return {
    clearanceTokens: new Map(),
    reservations: [],
    openingTransactions: [],
    openingsByIdempotencyKey: new Map(),
    matters: new Map(),
    members: new Map(),
    tasks: new Map(),
    calendarEvents: new Map(),
    statusHistory: [],
    clientReportProjections: [],
    closingDescriptors: [],
    auditLedger: createAuditLedger(),
  };
}

function currentMattersForTenant(context, tenantId) {
  return [...context.matters.values()]
    .filter((entry) => entry.matter.tenant_id === tenantId)
    .map((entry) => ({
      ...entry.matter,
      actor_can_view: entry.hidden_from_actor !== true,
      hidden_from_actor: entry.hidden_from_actor === true,
      silent_matter: entry.silent_matter === true,
    }));
}

export function createMatterCmpG4RuntimeEvidence(context, tenantId = SYNTHETIC_TENANT) {
  const matters = currentMattersForTenant(context, tenantId);
  const firstEntry = [...context.matters.values()].find((entry) => entry.matter.tenant_id === tenantId) ?? null;
  const firstMatter = firstEntry?.matter ?? null;
  const descriptors = [];

  if (firstMatter) {
    const matterMembers = context.members.get(key(tenantId, firstMatter.matter_id)) ?? [];
    const storedTask = context.tasks.get(key(tenantId, `task-${firstMatter.matter_id}-opening`));
    const storedEvent = context.calendarEvents.get(key(tenantId, `deadline-${firstMatter.matter_id}-filing`));
    const task = storedTask ? { ...storedTask, status: "todo" } : createDefaultTask({
      tenant_id: tenantId,
      matter_id: firstMatter.matter_id,
      actor_id: "cmp-g4-runtime-evidence",
    });
    const event = storedEvent ? { ...storedEvent, status: "scheduled", starts_at: "2026-07-01T00:00:00.000Z" } : createDefaultCalendarEvent({
      tenant_id: tenantId,
      matter_id: firstMatter.matter_id,
    });
    descriptors.push(
      createMatterTeamUiStateDescriptor({
        tenant_id: tenantId,
        actor_id: "cmp-g4-runtime-evidence",
        matter_id: firstMatter.matter_id,
        members: matterMembers,
        audit_ref: "audit:cmp-g4:team",
        action: "view",
      }),
      createMatterTaskTransitionDescriptor({
        tenant_id: tenantId,
        actor_id: "cmp-g4-runtime-evidence",
        task,
        to_status: "in_progress",
        transition_reason: "runtime evidence transition check",
        audit_ref: "audit:cmp-g4:task",
      }),
      createMatterCalendarDeadlineChangeDescriptor({
        tenant_id: tenantId,
        actor_id: "cmp-g4-runtime-evidence",
        event,
        new_starts_at: "2026-07-02T00:00:00.000Z",
        change_reason: "runtime evidence deadline change",
        audit_ref: "audit:cmp-g4:deadline",
      }),
      createMatterCriticalDeadlineDualControlDescriptor({
        tenant_id: tenantId,
        matter_id: firstMatter.matter_id,
        event_id: event?.event_id,
        requester_user_id: "user-cmp-g4-owner",
        confirmer_user_id: "user-cmp-g4-partner",
        confirmation_audit_ref: "audit:cmp-g4:dual-control",
      }),
      createMatterStatusHistoryDescriptor({
        tenant_id: tenantId,
        matter_id: firstMatter.matter_id,
        from_status: "opening",
        to_status: "open",
        actor_id: "cmp-g4-runtime-evidence",
        reason: "runtime evidence status check",
        audit_ref: "audit:cmp-g4:status",
      }),
      createMatterClientReportProjectionDescriptor({
        tenant_id: tenantId,
        matter_id: firstMatter.matter_id,
        client_report_id: "client-report-cmp-g4",
        source_report: { sections: [{ section_id: "summary", body: "Safe summary", client_visible: true }] },
      }),
      createMatterClosingChecklistDescriptor({
        tenant_id: tenantId,
        actor_id: "cmp-g4-runtime-evidence",
        matter: { ...firstMatter, status: "closing" },
        checklist: createClosingChecklist({ tenant_id: tenantId, matter_id: firstMatter.matter_id }),
        closing_metrics: {
          open_wip_amount: 0,
          open_ar_amount: 0,
          open_hold_count: 0,
          unresolved_task_count: 0,
          retention_acknowledged: true,
          final_invoice_reviewed: true,
        },
      }),
    );
  }

  const silentVisibility = createMatterSilentMatterVisibilityDescriptor({
    tenant_id: tenantId,
    actor_id: "cmp-g4-runtime-evidence",
    matters,
  });
  const dashboard = createMatterDashboardUiStateDescriptor({
    tenant_id: tenantId,
    actor_id: "cmp-g4-runtime-evidence",
    selected_matter_id: firstMatter?.matter_id,
    matters,
  });

  return Object.freeze({
    cmp_gate: "CMP-G4",
    cmp_work_package: "CMP-G4-W04",
    depends_on: Object.freeze(["CMP-G1-W01", "CMP-G2-W02", "CMP-G3-W03"]),
    tuw_ids: CMP_G4_TUW_IDS,
    legacy_reference_tuw_ids: MATTER_CORE_BOUNDED_CONTEXT.legacy_reference_tuw_ids,
    runtime_routes: MATTER_CORE_BOUNDED_CONTEXT.runtime_routes,
    runtime_readiness: RUNTIME_READINESS,
    crm_intake_clearance_required_before_matter_opening: true,
    opportunity_to_matter_shortcut_blocked: true,
    durable_persistence_open: true,
    clearance_token_count: [...context.clearanceTokens.values()].filter((token) => token.tenant_id === tenantId).length,
    matter_count: matters.length,
    opening_transaction_count: context.openingTransactions.length,
    descriptor_closeouts: Object.freeze({
      opening: createMatterG4AOpeningFoundationCloseoutDescriptor({
        tenant_id: tenantId,
        descriptors: [...context.openingTransactions.map((entry) => entry.descriptor)],
      }),
      execution: createMatterG4BExecutionWorkflowCloseoutDescriptor({ tenant_id: tenantId, descriptors }),
      closeout_ui: createMatterG4CMatterCloseoutDescriptor({
        tenant_id: tenantId,
        descriptors: [...descriptors, silentVisibility, dashboard],
      }),
    }),
  });
}

export async function handleMatterApiRequest({ pathname, method, query = {}, body = {}, context }) {
  try {
    const tenantId = requireTenant(query);
    const actor = actorContext({ ...query, tenant_id: tenantId });

    if (pathname === "/api/matter/runtime/evidence" && method === "GET") {
      return response(200, { outcome: "ok", evidence: createMatterCmpG4RuntimeEvidence(context, tenantId), tuw_ids: CMP_G4_TUW_IDS });
    }

    if (pathname === "/api/matter/clearance-tokens" && method === "POST") {
      const descriptor = createIntakeClearanceTokenDescriptor(defaultClearanceInput({ tenant_id: tenantId, actor_id: actor.actor_id, body }));
      const token = materializeClearanceToken(descriptor);
      if (token.outcome === "blocked") return response(400, { outcome: "blocked", safe_error_code: "CMP_G4_CLEARANCE_BLOCKED", token });
      context.clearanceTokens.set(key(tenantId, token.clearance_token_id), token);
      const audit_event = appendMatterAudit(context, {
        tenant_id: tenantId,
        actor_id: actor.actor_id,
        action: "matter.clearance_token.accept",
        object_type: "IntakeClearanceToken",
        object_id: token.clearance_token_id,
        reason: "crm_intake_clearance_token_registered",
        evidence_refs: ["packages/intake/src/client-matter-g3.js"],
      });
      return response(201, { outcome: "created", clearance_token: token, audit_event, tuw_ids: ["CMP-G4-W04-T001", "CMP-G4-W04-T020"] });
    }

    const clearanceMatch = pathname.match(/^\/api\/matter\/clearance-tokens\/([^/]+)$/);
    if (clearanceMatch && method === "GET") {
      const tokenId = decodeURIComponent(clearanceMatch[1]);
      const token = context.clearanceTokens.get(key(tenantId, tokenId));
      if (!token) return notFound("CMP_G4_CLEARANCE_NOT_FOUND");
      return response(200, { outcome: "ok", clearance_token: token, tuw_ids: ["CMP-G4-W04-T001"] });
    }

    if (pathname === "/api/matter/matter-numbers/reservations" && method === "POST") {
      const descriptor = createMatterNumberReservationDescriptor({
        tenant_id: tenantId,
        matter_number_seed: body.matter_number_seed,
        matter_number: body.matter_number,
        idempotency_key: body.idempotency_key,
        existing_reservations: context.reservations.map((entry) => entry.descriptor),
      });
      if (descriptor.outcome === "blocked") {
        return response(400, { outcome: "blocked", safe_error_code: "CMP_G4_NUMBER_RESERVATION_BLOCKED", reservation: descriptor });
      }
      context.reservations.push({ tenant_id: tenantId, descriptor });
      appendMatterAudit(context, {
        tenant_id: tenantId,
        actor_id: actor.actor_id,
        action: "matter.number.reserve",
        object_type: "MatterNumberReservation",
        object_id: descriptor.matter_number,
        reason: "matter_number_reserved_in_runtime",
      });
      return response(201, { outcome: "reserved", reservation: descriptor, tuw_ids: ["CMP-G4-W04-T002", "CMP-G4-W04-T016"] });
    }

    if (pathname === "/api/matter/opening/transactions" && method === "POST") {
      const entry = body.matter_id ? lookupMatter(context, tenantId, body.matter_id) : null;
      const descriptor = createMatterOpeningTransactionDescriptor({
        tenant_id: tenantId,
        actor_id: actor.actor_id,
        matter: body.matter ?? entry?.matter,
        matter_number_reservation: body.matter_number_reservation,
        acl_ref: body.acl_ref,
        dms_workspace_ref: body.dms_workspace_ref,
        billing_ref: body.billing_ref,
        idempotency_key: body.idempotency_key,
        opportunity_id: body.opportunity_id,
        opportunity_to_matter: body.opportunity_to_matter,
        create_from_opportunity: body.create_from_opportunity,
        command_payload: body.command_payload,
      });
      if (descriptor.outcome === "blocked") {
        return response(400, { outcome: "blocked", safe_error_code: "CMP_G4_OPENING_TRANSACTION_BLOCKED", opening_transaction: descriptor });
      }
      return response(200, { outcome: "review_required", opening_transaction: descriptor, tuw_ids: ["CMP-G4-W04-T004", "CMP-G4-W04-T017", "CMP-G4-W04-T018", "CMP-G4-W04-T019"] });
    }

    if (pathname === "/api/matter/matters" && method === "GET") {
      const visibility = createMatterSilentMatterVisibilityDescriptor({
        tenant_id: tenantId,
        actor_id: actor.actor_id,
        matters: currentMattersForTenant(context, tenantId),
      });
      return response(200, {
        outcome: "ok",
        matters: visibility.visible_matters,
        omitted_matter_count_exposed: visibility.omitted_matter_count_exposed,
        tuw_ids: ["CMP-G4-W04-T013", "CMP-G4-W04-T015"],
      });
    }

    if (pathname === "/api/matter/matters" && method === "POST") {
      return handleMatterOpening({ tenantId, actor, body, context });
    }

    const matterMatch = pathname.match(/^\/api\/matter\/matters\/([^/]+)$/);
    if (matterMatch && method === "GET") {
      const matterId = decodeURIComponent(matterMatch[1]);
      const entry = lookupMatter(context, tenantId, matterId);
      if (!entry) return notFound("CMP_G4_MATTER_NOT_FOUND");
      return response(200, {
        outcome: "ok",
        matter: publicMatterProjection(entry),
        wiki_shell: entry.wikiShell,
        graph_skeleton: entry.graphSkeleton,
        tuw_ids: ["CMP-G4-W04-T003", "CMP-G4-W04-T021", "CMP-G4-W04-T022"],
      });
    }

    const memberMatch = pathname.match(/^\/api\/matter\/matters\/([^/]+)\/members$/);
    if (memberMatch && method === "POST") {
      return handleMemberCreate({ tenantId, actor, matterId: decodeURIComponent(memberMatch[1]), body, context });
    }
    if (memberMatch && method === "GET") {
      return handleTeamRead({ tenantId, actor, matterId: decodeURIComponent(memberMatch[1]), context });
    }

    const taskMatch = pathname.match(/^\/api\/matter\/matters\/([^/]+)\/tasks\/([^/]+)\/transitions$/);
    if (taskMatch && method === "POST") {
      return handleTaskTransition({
        tenantId,
        actor,
        matterId: decodeURIComponent(taskMatch[1]),
        taskId: decodeURIComponent(taskMatch[2]),
        body,
        context,
      });
    }

    const deadlineMatch = pathname.match(/^\/api\/matter\/matters\/([^/]+)\/calendar\/([^/]+)\/deadline-change$/);
    if (deadlineMatch && method === "POST") {
      return handleDeadlineChange({
        tenantId,
        actor,
        matterId: decodeURIComponent(deadlineMatch[1]),
        eventId: decodeURIComponent(deadlineMatch[2]),
        body,
        context,
      });
    }

    const dualControlMatch = pathname.match(/^\/api\/matter\/matters\/([^/]+)\/calendar\/([^/]+)\/dual-control$/);
    if (dualControlMatch && method === "POST") {
      return handleDualControl({
        tenantId,
        actor,
        matterId: decodeURIComponent(dualControlMatch[1]),
        eventId: decodeURIComponent(dualControlMatch[2]),
        body,
        context,
      });
    }

    const statusMatch = pathname.match(/^\/api\/matter\/matters\/([^/]+)\/status-history$/);
    if (statusMatch && method === "POST") {
      return handleStatusHistory({ tenantId, actor, matterId: decodeURIComponent(statusMatch[1]), body, context });
    }

    const reportMatch = pathname.match(/^\/api\/matter\/matters\/([^/]+)\/client-report\/projection$/);
    if (reportMatch && method === "POST") {
      return handleClientReportProjection({ tenantId, matterId: decodeURIComponent(reportMatch[1]), body, context });
    }

    const closingMatch = pathname.match(/^\/api\/matter\/matters\/([^/]+)\/closing-checklist$/);
    if (closingMatch && method === "POST") {
      return handleClosingChecklist({ tenantId, actor, matterId: decodeURIComponent(closingMatch[1]), body, context });
    }

    if (pathname === "/api/matter/dashboard" && method === "GET") {
      const dashboard = createMatterDashboardUiStateDescriptor({
        tenant_id: tenantId,
        actor_id: actor.actor_id,
        selected_matter_id: query.selected_matter_id,
        matters: currentMattersForTenant(context, tenantId),
      });
      return response(200, { outcome: "ok", dashboard, tuw_ids: ["CMP-G4-W04-T014", "CMP-G4-W04-T015"] });
    }

    if (pathname === "/api/matter/audit" && method === "GET") {
      return response(200, {
        outcome: "ok",
        events: context.auditLedger.list({ tenant_id: tenantId }).map(clone),
        verification: context.auditLedger.verify({ tenant_id: tenantId }),
        tuw_ids: ["CMP-G4-W04-T015", "CMP-G4-W04-T023"],
      });
    }

    return response(404, { outcome: "blocked", safe_error_code: "CMP_G4_NOT_FOUND", reason: "not_found" });
  } catch (error) {
    return safeError(error);
  }
}

function handleMatterOpening({ tenantId, actor, body, context }) {
  const idempotencyKey = body.idempotency_key;
  if (idempotencyKey && context.openingsByIdempotencyKey.has(key(tenantId, idempotencyKey))) {
    const existing = context.openingsByIdempotencyKey.get(key(tenantId, idempotencyKey));
    return response(200, {
      outcome: "idempotent_replay",
      matter: publicMatterProjection(existing),
      opening_transaction: existing.openingTransaction,
      idempotent_replay_detected: true,
      tuw_ids: ["CMP-G4-W04-T003", "CMP-G4-W04-T004", "CMP-G4-W04-T016"],
    });
  }

  const token = context.clearanceTokens.get(key(tenantId, body.clearance_token_id));
  if (!token) {
    return response(400, {
      outcome: "blocked",
      safe_error_code: "CMP_G4_CLEARANCE_REQUIRED",
      blocked_claims: ["g3_clearance_required_before_matter_opening"],
      tuw_ids: ["CMP-G4-W04-T001", "CMP-G4-W04-T020"],
    });
  }

  const matter = createMatterG4OpeningRecord({
    matter_id: body.matter_id ?? `matter-cmp-g4-${randomUUID()}`,
    tenant_id: tenantId,
    legal_client_party_id: body.legal_client_party_id,
    billing_client_party_id: body.billing_client_party_id,
    billing_profile_id: body.billing_profile_id,
    title: body.title,
    status: body.status ?? "opening",
    created_by: actor.actor_id,
    created_at: body.created_at ?? "2026-06-20T00:00:00.000Z",
    opened_at: body.opened_at,
    permission_envelope_id: body.permission_envelope_id ?? `perm-${body.matter_id ?? "cmp-g4"}`,
    audit_trace_id: body.audit_trace_id ?? `audit-${body.matter_id ?? "cmp-g4"}`,
    matter_number: body.matter_number,
    clearance_token: token,
    opportunity_id: body.opportunity_id,
    opportunity_to_matter: body.opportunity_to_matter,
    create_from_opportunity: body.create_from_opportunity,
    command_payload: body.command_payload,
  });
  const existingReservation = context.reservations.find(
    (entry) => entry.tenant_id === tenantId && entry.descriptor.matter_number === body.matter_number,
  );
  const reservation =
    existingReservation?.descriptor ??
    (body.matter_number
      ? createMatterNumberReservationDescriptor({
          tenant_id: tenantId,
          matter_number: body.matter_number,
          matter_number_seed: body.matter_number_seed ?? body.matter_id ?? matter.matter_id,
          idempotency_key: `number:${idempotencyKey ?? matter.matter_id}`,
          existing_reservations: context.reservations.map((entry) => entry.descriptor),
        })
      : null);
  const openingTransaction = createMatterOpeningTransactionDescriptor({
    tenant_id: tenantId,
    actor_id: actor.actor_id,
    matter,
    matter_number_reservation: reservation,
    acl_ref: body.acl_ref,
    dms_workspace_ref: body.dms_workspace_ref,
    billing_ref: body.billing_ref,
    idempotency_key: idempotencyKey,
  });
  if (openingTransaction.outcome === "blocked") {
    return response(400, { outcome: "blocked", safe_error_code: "CMP_G4_OPENING_TRANSACTION_BLOCKED", opening_transaction: openingTransaction });
  }

  const wikiShell = createMatterWikiShellForMatter(matter);
  const graphSkeleton = createMatterGraphSkeletonForMatter(matter);
  const task = createDefaultTask({ tenant_id: tenantId, matter_id: matter.matter_id, actor_id: actor.actor_id });
  const event = createDefaultCalendarEvent({ tenant_id: tenantId, matter_id: matter.matter_id });
  const entry = {
    matter,
    openingTransaction,
    wikiShell,
    graphSkeleton,
    silent_matter: body.silent_matter === true,
    hidden_from_actor: body.hidden_from_actor === true,
  };
  context.matters.set(key(tenantId, matter.matter_id), entry);
  context.tasks.set(key(tenantId, task.task_id), task);
  context.calendarEvents.set(key(tenantId, event.event_id), event);
  context.openingTransactions.push({ tenant_id: tenantId, descriptor: openingTransaction });
  if (idempotencyKey) context.openingsByIdempotencyKey.set(key(tenantId, idempotencyKey), entry);

  if (body.responsible_attorney_user_id) {
    const member = createMatterG4Member({
      member_id: `member-${matter.matter_id}-responsible`,
      tenant_id: tenantId,
      matter_id: matter.matter_id,
      user_id: body.responsible_attorney_user_id,
      role: "responsible_attorney",
      status: "active",
      permission_envelope_id: `${matter.permission_envelope_id}:member`,
      audit_trace_id: `${matter.audit_trace_id}:member`,
    });
    context.members.set(key(tenantId, matter.matter_id), [member]);
  }

  const audit_event = appendMatterAudit(context, {
    tenant_id: tenantId,
    actor_id: actor.actor_id,
    action: "matter.opening.create",
    object_type: "Matter",
    object_id: matter.matter_id,
    reason: "clearance_gated_matter_opening_created",
    matter_id: matter.matter_id,
    evidence_refs: [token.clearance_token_id, body.acl_ref, body.dms_workspace_ref, body.billing_ref].filter(Boolean),
  });

  return response(201, {
    outcome: "created",
    matter: publicMatterProjection(entry),
    opening_transaction: openingTransaction,
    wiki_shell: wikiShell,
    graph_skeleton: graphSkeleton,
    audit_event,
    tuw_ids: [
      "CMP-G4-W04-T003",
      "CMP-G4-W04-T004",
      "CMP-G4-W04-T017",
      "CMP-G4-W04-T018",
      "CMP-G4-W04-T019",
      "CMP-G4-W04-T021",
      "CMP-G4-W04-T022",
    ],
  });
}

function handleMemberCreate({ tenantId, actor, matterId, body, context }) {
  const entry = lookupMatter(context, tenantId, matterId);
  if (!entry) return notFound("CMP_G4_MATTER_NOT_FOUND");
  const member = createMatterG4Member({
    member_id: body.member_id ?? `member-${matterId}-${randomUUID()}`,
    tenant_id: tenantId,
    matter_id: matterId,
    user_id: body.user_id,
    role: body.role,
    status: body.status ?? "active",
    permission_envelope_id: body.permission_envelope_id ?? `${entry.matter.permission_envelope_id}:member`,
    audit_trace_id: body.audit_trace_id ?? `${entry.matter.audit_trace_id}:member`,
  });
  const descriptor = createMatterMemberPermissionDescriptor({
    tenant_id: tenantId,
    actor_id: actor.actor_id,
    matter: entry.matter,
    member,
    role_permissions: body.role_permissions ?? { [member.role]: true },
  });
  if (descriptor.outcome === "blocked") {
    return response(400, { outcome: "blocked", safe_error_code: "CMP_G4_MEMBER_PERMISSION_BLOCKED", descriptor });
  }
  const members = context.members.get(key(tenantId, matterId)) ?? [];
  members.push(member);
  context.members.set(key(tenantId, matterId), members);
  appendMatterAudit(context, {
    tenant_id: tenantId,
    actor_id: actor.actor_id,
    action: "matter.member.create",
    object_type: "MatterMember",
    object_id: member.member_id,
    reason: "member_role_permission_checked",
    matter_id: matterId,
  });
  return response(201, { outcome: "created", member, descriptor, tuw_ids: ["CMP-G4-W04-T005", "CMP-G4-W04-T006"] });
}

function handleTeamRead({ tenantId, actor, matterId, context }) {
  const entry = lookupMatter(context, tenantId, matterId);
  if (!entry) return notFound("CMP_G4_MATTER_NOT_FOUND");
  const descriptor = createMatterTeamUiStateDescriptor({
    tenant_id: tenantId,
    actor_id: actor.actor_id,
    matter_id: matterId,
    members: context.members.get(key(tenantId, matterId)) ?? [],
    action: "view",
  });
  return response(200, { outcome: "ok", team: descriptor, tuw_ids: ["CMP-G4-W04-T006", "CMP-G4-W04-T015"] });
}

function handleTaskTransition({ tenantId, actor, matterId, taskId, body, context }) {
  if (!lookupMatter(context, tenantId, matterId)) return notFound("CMP_G4_MATTER_NOT_FOUND");
  const task = context.tasks.get(key(tenantId, taskId));
  if (!task) return notFound("CMP_G4_TASK_NOT_FOUND");
  const descriptor = createMatterTaskTransitionDescriptor({
    tenant_id: tenantId,
    actor_id: actor.actor_id,
    task,
    to_status: body.to_status,
    transition_reason: body.transition_reason,
    audit_ref: body.audit_ref,
  });
  if (descriptor.outcome === "blocked") {
    return response(400, { outcome: "blocked", safe_error_code: "CMP_G4_TASK_TRANSITION_BLOCKED", descriptor });
  }
  const nextTask = { ...task, status: body.to_status };
  context.tasks.set(key(tenantId, taskId), nextTask);
  appendMatterAudit(context, {
    tenant_id: tenantId,
    actor_id: actor.actor_id,
    action: "matter.task.transition",
    object_type: "MatterTask",
    object_id: taskId,
    reason: "task_transition_audited",
    matter_id: matterId,
  });
  return response(200, { outcome: "updated", task: nextTask, descriptor, tuw_ids: ["CMP-G4-W04-T007", "CMP-G4-W04-T015"] });
}

function handleDeadlineChange({ tenantId, actor, matterId, eventId, body, context }) {
  if (!lookupMatter(context, tenantId, matterId)) return notFound("CMP_G4_MATTER_NOT_FOUND");
  const event = context.calendarEvents.get(key(tenantId, eventId));
  if (!event) return notFound("CMP_G4_EVENT_NOT_FOUND");
  const descriptor = createMatterCalendarDeadlineChangeDescriptor({
    tenant_id: tenantId,
    actor_id: actor.actor_id,
    event,
    new_starts_at: body.new_starts_at,
    new_ends_at: body.new_ends_at,
    change_reason: body.change_reason,
    audit_ref: body.audit_ref,
  });
  if (descriptor.outcome === "blocked") {
    return response(400, { outcome: "blocked", safe_error_code: "CMP_G4_DEADLINE_CHANGE_BLOCKED", descriptor });
  }
  const nextEvent = { ...event, status: "rescheduled", starts_at: body.new_starts_at, ends_at: body.new_ends_at ?? event.ends_at };
  context.calendarEvents.set(key(tenantId, eventId), nextEvent);
  appendMatterAudit(context, {
    tenant_id: tenantId,
    actor_id: actor.actor_id,
    action: "matter.deadline.change",
    object_type: "MatterCalendarEvent",
    object_id: eventId,
    reason: "deadline_change_audited",
    matter_id: matterId,
  });
  return response(200, { outcome: "updated", event: nextEvent, descriptor, tuw_ids: ["CMP-G4-W04-T008", "CMP-G4-W04-T015"] });
}

function handleDualControl({ tenantId, actor, matterId, eventId, body, context }) {
  if (!lookupMatter(context, tenantId, matterId)) return notFound("CMP_G4_MATTER_NOT_FOUND");
  const descriptor = createMatterCriticalDeadlineDualControlDescriptor({
    tenant_id: tenantId,
    matter_id: matterId,
    event_id: eventId,
    requester_user_id: body.requester_user_id ?? actor.actor_id,
    confirmer_user_id: body.confirmer_user_id,
    confirmation_audit_ref: body.confirmation_audit_ref,
  });
  if (descriptor.outcome === "blocked") {
    return response(400, { outcome: "blocked", safe_error_code: "CMP_G4_DUAL_CONTROL_BLOCKED", descriptor });
  }
  appendMatterAudit(context, {
    tenant_id: tenantId,
    actor_id: actor.actor_id,
    action: "matter.deadline.dual_control",
    object_type: "MatterCalendarEvent",
    object_id: eventId,
    reason: "critical_deadline_dual_control_audited",
    matter_id: matterId,
  });
  return response(200, { outcome: "review_required", descriptor, tuw_ids: ["CMP-G4-W04-T009", "CMP-G4-W04-T015"] });
}

function handleStatusHistory({ tenantId, actor, matterId, body, context }) {
  const entry = lookupMatter(context, tenantId, matterId);
  if (!entry) return notFound("CMP_G4_MATTER_NOT_FOUND");
  const descriptor = createMatterStatusHistoryDescriptor({
    tenant_id: tenantId,
    matter_id: matterId,
    from_status: entry.matter.status,
    to_status: body.to_status,
    actor_id: actor.actor_id,
    reason: body.reason,
    audit_ref: body.audit_ref,
    changed_at: body.changed_at ?? "2026-06-20T00:00:00.000Z",
  });
  if (descriptor.outcome === "blocked") {
    return response(400, { outcome: "blocked", safe_error_code: "CMP_G4_STATUS_HISTORY_BLOCKED", descriptor });
  }
  const nextMatter = { ...entry.matter, status: body.to_status };
  context.matters.set(key(tenantId, matterId), { ...entry, matter: nextMatter });
  context.statusHistory.push(descriptor.history_record);
  appendMatterAudit(context, {
    tenant_id: tenantId,
    actor_id: actor.actor_id,
    action: "matter.status.history.append",
    object_type: "MatterStatusHistory",
    object_id: descriptor.history_record.status_history_id,
    reason: "immutable_status_history_appended",
    matter_id: matterId,
  });
  return response(200, { outcome: "updated", matter: publicMatterProjection({ ...entry, matter: nextMatter }), descriptor, tuw_ids: ["CMP-G4-W04-T010", "CMP-G4-W04-T015"] });
}

function handleClientReportProjection({ tenantId, matterId, body, context }) {
  if (!lookupMatter(context, tenantId, matterId)) return notFound("CMP_G4_MATTER_NOT_FOUND");
  const descriptor = createMatterClientReportProjectionDescriptor({
    tenant_id: tenantId,
    matter_id: matterId,
    client_report_id: body.client_report_id ?? `client-report-${matterId}`,
    source_report: body.source_report,
  });
  if (descriptor.outcome === "blocked") {
    return response(400, { outcome: "blocked", safe_error_code: "CMP_G4_CLIENT_REPORT_BLOCKED", descriptor });
  }
  context.clientReportProjections.push(descriptor);
  return response(200, { outcome: "projected", projection: descriptor, tuw_ids: ["CMP-G4-W04-T011", "CMP-G4-W04-T015"] });
}

function handleClosingChecklist({ tenantId, actor, matterId, body, context }) {
  const entry = lookupMatter(context, tenantId, matterId);
  if (!entry) return notFound("CMP_G4_MATTER_NOT_FOUND");
  const checklist = createClosingChecklist({ tenant_id: tenantId, matter_id: matterId });
  const descriptor = createMatterClosingChecklistDescriptor({
    tenant_id: tenantId,
    actor_id: actor.actor_id,
    matter: entry.matter,
    checklist,
    closing_metrics: body.closing_metrics,
  });
  if (descriptor.outcome === "blocked") {
    return response(400, { outcome: "blocked", safe_error_code: "CMP_G4_CLOSING_BLOCKED", descriptor });
  }
  context.closingDescriptors.push(descriptor);
  return response(200, { outcome: "review_required", closing: descriptor, tuw_ids: ["CMP-G4-W04-T012", "CMP-G4-W04-T023"] });
}
