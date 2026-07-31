import {
  createHash,
  randomUUID,
} from "node:crypto";
import {
  CLIENT_FIXED_REPORT_MAX_CSV_BYTES,
  CLIENT_FIXED_REPORT_MAX_TOKEN_BYTES,
  CLIENT_FIXED_REPORT_SNAPSHOT_VERSION,
  clientFixedReportCapabilityBinding,
  createClientFixedReportService,
  createReportBuilderService,
} from "../../../packages/reports/src/index.js";
import { evaluateRouteDecision } from "./permission-gate.js";
import { matchReportRoute } from "./routes/reports.js";

export const REPORTS_API_ERROR_CODES = Object.freeze({
  tenant_required: "REPORTS_TENANT_REQUIRED",
  permission_required: "REPORTS_PERMISSION_REQUIRED",
  audit_hint_required: "REPORTS_AUDIT_HINT_REQUIRED",
  validation_error: "REPORTS_VALIDATION_ERROR",
  not_found: "REPORTS_NOT_FOUND",
  review_required: "REPORTS_REVIEW_REQUIRED",
  approval_required: "REPORTS_APPROVAL_REQUIRED",
  fixed_runtime_unavailable:
    "CLIENT_FIXED_REPORT_RUNTIME_UNAVAILABLE",
  fixed_read_denied: "CLIENT_FIXED_REPORT_READ_DENIED",
  fixed_export_denied: "CLIENT_FIXED_REPORT_EXPORT_DENIED",
  fixed_source_denied: "CLIENT_FIXED_REPORT_SOURCE_DENIED",
  fixed_source_unavailable:
    "CLIENT_FIXED_REPORT_SOURCE_UNAVAILABLE",
  fixed_source_invalid: "CLIENT_FIXED_REPORT_SOURCE_INVALID",
  fixed_snapshot_required:
    "CLIENT_FIXED_REPORT_SNAPSHOT_REQUIRED",
  fixed_snapshot_invalid:
    "CLIENT_FIXED_REPORT_SNAPSHOT_INVALID",
  fixed_snapshot_expired:
    "CLIENT_FIXED_REPORT_SNAPSHOT_EXPIRED",
  fixed_idempotency_required:
    "CLIENT_FIXED_REPORT_IDEMPOTENCY_REQUIRED",
  fixed_idempotency_conflict:
    "CLIENT_FIXED_REPORT_IDEMPOTENCY_CONFLICT",
  fixed_client_payload_rejected:
    "CLIENT_FIXED_REPORT_CLIENT_PAYLOAD_REJECTED",
  fixed_request_too_large:
    "CLIENT_FIXED_REPORT_REQUEST_TOO_LARGE",
  fixed_snapshot_too_large:
    "CLIENT_FIXED_REPORT_SNAPSHOT_TOO_LARGE",
  fixed_csv_too_large:
    "CLIENT_FIXED_REPORT_CSV_TOO_LARGE",
});

export const CLIENT_FIXED_REPORT_MAX_EXPORT_BODY_BYTES =
  24 * 1024;

export const REPORTS_BOUNDED_CONTEXT = Object.freeze({
  bounded_context: "report-builder",
  contract_ref: "docs/goal-closeout/sf-client-matter-parity/backend-contracts/sf-b-w08-reporting-builder-contract.json",
  contract_schema_version: "law-firm-os.sf-client-matter-parity.report-builder.v0.1",
  endpoints: Object.freeze([
    "GET /api/reports",
    "POST /api/reports",
    "GET /api/reports/:reportId",
    "PATCH /api/reports/:reportId",
    "POST /api/reports/:reportId/run",
    "POST /api/reports/:reportId/share",
    "GET /api/reports/:reportId/audit",
    "GET /api/reports/audit",
    "GET /api/reports/clients/fixed/:reportId",
    "POST /api/reports/clients/fixed/:reportId.csv",
  ]),
  data_source: "analytics_runtime_repository/report_builder_records",
  runtime_write_ready: true,
  safe_query_runtime_enabled: true,
  owner_gated_effects: true,
  arbitrary_sql_enabled: false,
  raw_query_payload_allowed: false,
  source_object_mutation_allowed: false,
  fixed_client_report_token_max_bytes:
    CLIENT_FIXED_REPORT_MAX_TOKEN_BYTES,
  fixed_client_report_export_body_max_bytes:
    CLIENT_FIXED_REPORT_MAX_EXPORT_BODY_BYTES,
  fixed_client_report_csv_max_bytes:
    CLIENT_FIXED_REPORT_MAX_CSV_BYTES,
  fixed_client_report_object_acl_authority:
    "required_server_session_resolver",
  fixed_client_report_unavailable_without_object_acl_authority:
    true,
  caller_permission_context_object_acl_trusted: false,
  production_ready_claim: false,
  fail_closed: true,
});

function errorResponse(status, requestId, codes, extra = {}) {
  return {
    status,
    body: {
      request_id: requestId,
      outcome: status === 403 ? "denied" : "blocked",
      items: [],
      safe_error_codes: codes,
      count_leak_prevented: true,
      production_ready_claim: false,
      ...extra,
    },
  };
}

function validateCommon(query = {}, requestId) {
  if (typeof query.tenant_id !== "string" || query.tenant_id.trim() === "") {
    return errorResponse(400, requestId, [REPORTS_API_ERROR_CODES.tenant_required]);
  }
  if (typeof query.permission_ref !== "string" || query.permission_ref.trim() === "") {
    return errorResponse(400, requestId, [REPORTS_API_ERROR_CODES.permission_required]);
  }
  if (typeof query.audit_hint_ref !== "string" || query.audit_hint_ref.trim() === "") {
    return errorResponse(400, requestId, [REPORTS_API_ERROR_CODES.audit_hint_required]);
  }
  return null;
}

function queryWithBody(query, body) {
  return {
    ...query,
    tenant_id: body?.tenant_id ?? query?.tenant_id,
    permission_ref: body?.permission_ref ?? query?.permission_ref,
    audit_hint_ref: body?.audit_hint_ref ?? query?.audit_hint_ref,
  };
}

function gateDecisionResponse(decision, requestId, auditHintRef) {
  if (decision.effect === "allow") return null;
  if (decision.effect === "review_required") {
    return errorResponse(200, requestId, [REPORTS_API_ERROR_CODES.review_required], {
      outcome: "review_required",
      ui_state: "review_required",
      audit_hint_ref: auditHintRef,
    });
  }
  if (decision.effect === "approval_required") {
    return errorResponse(200, requestId, [REPORTS_API_ERROR_CODES.approval_required], {
      outcome: "approval_required",
      ui_state: "approval_required",
      audit_hint_ref: auditHintRef,
    });
  }
  return errorResponse(403, requestId, [REPORTS_API_ERROR_CODES.permission_required], {
    ui_state: "denied",
    audit_hint_ref: auditHintRef,
  });
}

function routeGate({ context, query, requestId, policy, resourceId }) {
  const invalid = validateCommon(query, requestId);
  if (invalid) return invalid;
  const decision = evaluateRouteDecision({
    context,
    resource: {
      tenant_id: query.tenant_id,
      resource_type: policy.resource_type,
      resource_id: resourceId ?? null,
    },
    action: policy.action,
  });
  return gateDecisionResponse(decision, requestId, query.audit_hint_ref);
}

function createRuntime(runtime = {}) {
  const analyticsRuntime = runtime.analyticsRuntime ?? runtime.analytics ?? {};
  return Object.freeze({
    repository: analyticsRuntime.repository,
    clientOperationsReadModel:
      analyticsRuntime.clientOperationsReadModel,
    clientFixedReportTokenAuthority:
      analyticsRuntime.clientFixedReportTokenAuthority,
    clientFixedReportClock:
      analyticsRuntime.clientFixedReportClock,
  });
}

function service(runtime) {
  return createReportBuilderService({ repository: runtime.repository });
}

function idempotencyReplay(repository, query, idempotencyKey, requestId) {
  if (!idempotencyKey) return null;
  const replay = repository?.getIdempotency?.({ tenant_id: query.tenant_id, idempotency_key: idempotencyKey });
  if (!replay?.response) return null;
  return {
    status: 200,
    body: {
      ...replay.response,
      request_id: requestId,
      outcome: "idempotent_replay",
      idempotent_replay: true,
      production_ready_claim: false,
    },
  };
}

function recordIdempotency(repository, query, idempotencyKey, operation, response) {
  if (!idempotencyKey) return;
  repository?.recordIdempotency?.({
    tenant_id: query.tenant_id,
    idempotency_key: idempotencyKey,
    operation,
    response,
    created_at: new Date().toISOString(),
  });
}

function responseBody(requestId, query, payload = {}) {
  return {
    request_id: requestId,
    safe_error_codes: [],
    audit_hint_ref: query.audit_hint_ref,
    production_ready_claim: false,
    raw_sql_included: false,
    raw_query_payload_included: false,
    source_payload_included: false,
    ...payload,
  };
}

function actorFrom(context) {
  return context?.principal?.user_id;
}

function commonInput(query, body, context) {
  return {
    tenant_id: query.tenant_id,
    permission_ref: query.permission_ref,
    audit_hint_ref: query.audit_hint_ref,
    actor_id: actorFrom(context),
  };
}

function validateIdempotentWrite(repository, query, body, requestId, operation) {
  const idempotencyKey = body?.idempotency_key;
  const replay = idempotencyReplay(repository, query, idempotencyKey, requestId);
  if (replay) return { replay };
  return { idempotencyKey, operation };
}

function fixedReportPermissionContext(
  context,
  reportId,
  resourceType,
) {
  if (!context || typeof context !== "object") return context;
  return {
    ...context,
    object_acl: Array.isArray(context.object_acl)
      ? context.object_acl.filter((entry) => {
        const clientGroupScoped = (
          entry?.client_group_id !== undefined
          && entry.client_group_id !== null
        );
        if (clientGroupScoped) return false;
        const entryResourceType = entry?.resource_type;
        const resourceTypeMatches = (
          entryResourceType === undefined
          || entryResourceType === null
          || entryResourceType === "*"
          || entryResourceType === resourceType
        );
        if (!resourceTypeMatches) return false;
        const resourceId = entry?.resource_id;
        return resourceId === undefined
          || resourceId === null
          || resourceId === "*"
          || resourceId === reportId;
      })
      : [],
  };
}

function hasAuthoritativeObjectAcl(context) {
  return (
    context?.object_acl_authority?.status === "authoritative"
    && Array.isArray(context?.object_acl)
  );
}

function authoritativeTenantId(context) {
  const tenantId = context?.principal?.tenant_id;
  return typeof tenantId === "string" && tenantId.trim()
    ? tenantId.trim()
    : null;
}

function fixedAuditAction(route, decision) {
  if (decision === "deny") {
    return "report.client_fixed.denied";
  }
  if (decision === "replay") {
    return "report.client_fixed.csv.replay";
  }
  return route.action === "analytics:client:export"
    ? "report.client_fixed.csv.export"
    : "report.client_fixed.screen.read";
}

function safeFixedAuditEvent(event = {}) {
  return Object.freeze({
    event_id: event.event_id,
    action: event.action,
    decision: event.decision,
    tenant_authority: "signed_session",
    actor_id_included: false,
    tenant_id_included: false,
    raw_rows_included: false,
    source_values_included: false,
    production_ready_claim: false,
  });
}

function appendFixedAudit({
  repository,
  context,
  route,
  reportId,
  decision,
  reason,
  query,
  metadata = {},
}) {
  const tenantId = authoritativeTenantId(context);
  if (
    !tenantId
    || typeof repository?.appendAudit !== "function"
  ) {
    throw Object.assign(
      new Error("fixed report audit runtime is unavailable"),
      {
        safe_error_code:
          REPORTS_API_ERROR_CODES.fixed_runtime_unavailable,
      },
    );
  }
  return repository.appendAudit({
    event_id: `client_fixed_report_audit_${randomUUID()}`,
    tenant_id: tenantId,
    actor_id:
      context?.principal?.user_id
      ?? context?.principal?.actor_id
      ?? "unknown_actor",
    action: fixedAuditAction(route, decision),
    object_type: route.resource_type,
    object_id: reportId,
    decision,
    reason,
    occurred_at: new Date().toISOString(),
    metadata: {
      permission_ref_sha256: query?.permission_ref
        ? fingerprint(query.permission_ref)
        : null,
      audit_hint_ref_sha256: query?.audit_hint_ref
        ? fingerprint(query.audit_hint_ref)
        : null,
      authoritative_tenant_source: "signed_session",
      client_supplied_tenant_used: false,
      raw_rows_included: false,
      source_values_included: false,
      contact_pii_included: false,
      internal_ids_included: false,
      ...metadata,
    },
  });
}

function fixedErrorResponse(
  status,
  requestId,
  codes,
  extra = {},
) {
  return errorResponse(status, requestId, codes, {
    ui_state: status === 403 ? "denied" : "blocked",
    row_count_included: false,
    value_leak_prevented: true,
    snapshot_issued: false,
    csv_included: false,
    raw_bank_source_included: false,
    raw_source_payload_included: false,
    contact_pii_included: false,
    internal_ids_included: false,
    ...extra,
  });
}

function fixedPermissionDecision({
  context,
  query,
  route,
  reportId,
}) {
  const readDecision = evaluateRouteDecision({
    context: fixedReportPermissionContext(
      context,
      reportId,
      "client_fixed_report",
    ),
    resource: {
      tenant_id: query.tenant_id,
      resource_type: "client_fixed_report",
      resource_id: reportId,
    },
    action: "analytics:client:read",
  });
  if (readDecision.effect !== "allow") return readDecision;
  if (route.action !== "analytics:client:export") {
    return readDecision;
  }
  return evaluateRouteDecision({
    context: fixedReportPermissionContext(
      context,
      reportId,
      route.resource_type,
    ),
    resource: {
      tenant_id: query.tenant_id,
      resource_type: route.resource_type,
      resource_id: reportId,
    },
    action: "analytics:client:export",
  });
}

function fixedGate({
  repository,
  context,
  query,
  route,
  reportId,
  requestId,
}) {
  const invalid = validateCommon(query, requestId);
  if (invalid) {
    appendFixedAudit({
      repository,
      context,
      route,
      reportId,
      decision: "deny",
      reason: "fixed_report_common_input_invalid",
      query,
    });
    return fixedErrorResponse(
      invalid.status,
      requestId,
      invalid.body.safe_error_codes,
    );
  }
  if (!hasAuthoritativeObjectAcl(context)) {
    appendFixedAudit({
      repository,
      context,
      route,
      reportId,
      decision: "deny",
      reason: "fixed_report_object_acl_authority_unavailable",
      query,
      metadata: {
        object_acl_authority_status:
          context?.object_acl_authority?.status
          ?? "missing",
      },
    });
    return fixedErrorResponse(
      503,
      requestId,
      [REPORTS_API_ERROR_CODES.fixed_runtime_unavailable],
      { audit_recorded: true },
    );
  }
  const decision = fixedPermissionDecision({
    context,
    query,
    route,
    reportId,
  });
  if (decision.effect === "allow") return null;
  appendFixedAudit({
    repository,
    context,
    route,
    reportId,
    decision: "deny",
    reason: decision.reason ?? "fixed_report_permission_denied",
    query,
  });
  return fixedErrorResponse(
    403,
    requestId,
    [route.action === "analytics:client:export"
      ? REPORTS_API_ERROR_CODES.fixed_export_denied
      : REPORTS_API_ERROR_CODES.fixed_read_denied],
    { audit_recorded: true },
  );
}

function clientFixedReportService(runtime) {
  return createClientFixedReportService({
    clientOperationsReadModel:
      runtime.clientOperationsReadModel,
    tokenAuthority:
      runtime.clientFixedReportTokenAuthority,
    now: runtime.clientFixedReportClock,
  });
}

const FORBIDDEN_FIXED_EXPORT_FIELDS = Object.freeze([
  "capability_binding",
  "capability_ref",
  "columns",
  "csv_sha256",
  "csv_text",
  "digest",
  "report_id",
  "rows",
  "screen_rows",
  "source_digest",
]);

function fixedExportInput(body = {}) {
  let bodyByteSize;
  try {
    bodyByteSize = Buffer.byteLength(
      JSON.stringify(body),
      "utf8",
    );
  } catch {
    bodyByteSize =
      CLIENT_FIXED_REPORT_MAX_EXPORT_BODY_BYTES + 1;
  }
  if (
    bodyByteSize
      > CLIENT_FIXED_REPORT_MAX_EXPORT_BODY_BYTES
  ) {
    throw Object.assign(
      new Error("fixed report export request is too large"),
      {
        safe_error_code:
          REPORTS_API_ERROR_CODES.fixed_request_too_large,
      },
    );
  }
  if (
    FORBIDDEN_FIXED_EXPORT_FIELDS.some((field) => (
      Object.hasOwn(body, field)
    ))
  ) {
    throw Object.assign(
      new Error("client-authored export payload is rejected"),
      {
        safe_error_code:
          REPORTS_API_ERROR_CODES.fixed_client_payload_rejected,
      },
    );
  }
  const snapshotToken = typeof body.snapshot_token === "string"
    ? body.snapshot_token
    : "";
  if (!snapshotToken) {
    throw Object.assign(
      new Error("snapshot token is required"),
      {
        safe_error_code:
          REPORTS_API_ERROR_CODES.fixed_snapshot_required,
      },
    );
  }
  if (
    Buffer.byteLength(snapshotToken, "utf8")
      > CLIENT_FIXED_REPORT_MAX_TOKEN_BYTES
  ) {
    throw Object.assign(
      new Error("fixed report snapshot token is too large"),
      {
        safe_error_code:
          REPORTS_API_ERROR_CODES.fixed_request_too_large,
      },
    );
  }
  if (
    body.snapshot_version
      !== CLIENT_FIXED_REPORT_SNAPSHOT_VERSION
  ) {
    throw Object.assign(
      new Error("snapshot version is invalid"),
      {
        safe_error_code:
          REPORTS_API_ERROR_CODES.fixed_snapshot_invalid,
      },
    );
  }
  const idempotencyKey = typeof body.idempotency_key === "string"
    ? body.idempotency_key.trim()
    : "";
  if (
    !/^[A-Za-z0-9._:~-]{1,200}$/u.test(idempotencyKey)
  ) {
    throw Object.assign(
      new Error("idempotency key is required"),
      {
        safe_error_code:
          REPORTS_API_ERROR_CODES.fixed_idempotency_required,
      },
    );
  }
  return Object.freeze({
    snapshotToken,
    snapshotVersion: body.snapshot_version,
    idempotencyKey,
  });
}

function fingerprint(value) {
  return createHash("sha256")
    .update(String(value), "utf8")
    .digest("hex");
}

function fixedErrorStatus(code) {
  if (
    code === REPORTS_API_ERROR_CODES.fixed_read_denied
    || code === REPORTS_API_ERROR_CODES.fixed_export_denied
    || code === REPORTS_API_ERROR_CODES.fixed_source_denied
  ) return 403;
  if (
    code === REPORTS_API_ERROR_CODES.fixed_runtime_unavailable
    || code === REPORTS_API_ERROR_CODES.fixed_source_unavailable
  ) return 503;
  if (
    code === REPORTS_API_ERROR_CODES.fixed_request_too_large
    || code === REPORTS_API_ERROR_CODES.fixed_snapshot_too_large
    || code === REPORTS_API_ERROR_CODES.fixed_csv_too_large
  ) return 413;
  if (code === "CLIENT_FIXED_REPORT_NOT_FOUND") return 404;
  if (
    code
      === REPORTS_API_ERROR_CODES.fixed_idempotency_conflict
  ) return 409;
  return 400;
}

function fixedFailure({
  error,
  repository,
  context,
  route,
  reportId,
  query,
  requestId,
}) {
  const code = typeof error?.safe_error_code === "string"
    ? error.safe_error_code
    : REPORTS_API_ERROR_CODES.validation_error;
  const status = fixedErrorStatus(code);
  let auditRecorded = false;
  try {
    appendFixedAudit({
      repository,
      context,
      route,
      reportId,
      decision: "deny",
      reason: code,
      query,
    });
    auditRecorded = true;
  } catch {
    if (
      code
        !== REPORTS_API_ERROR_CODES.fixed_runtime_unavailable
    ) {
      return fixedErrorResponse(
        503,
        requestId,
        [REPORTS_API_ERROR_CODES.fixed_runtime_unavailable],
      );
    }
  }
  return fixedErrorResponse(status, requestId, [code], {
    audit_recorded: auditRecorded,
  });
}

function handleClientFixedReportScreen({
  route,
  reportId,
  query,
  context,
  requestId,
  runtime,
}) {
  const gated = fixedGate({
    repository: runtime.repository,
    context,
    query,
    route,
    reportId,
    requestId,
  });
  if (gated) return gated;
  try {
    const item = clientFixedReportService(runtime).readScreen({
      tenant_id: authoritativeTenantId(context),
      actor_id: actorFrom(context),
      capability_binding:
        clientFixedReportCapabilityBinding(context),
      permission_context: context,
      report_access_authorized: true,
      report_id: reportId,
      as_of: query.as_of,
      timezone: query.timezone ?? "Asia/Seoul",
      revenue_ranking_period:
        query.revenue_ranking_period ?? "year",
    });
    const auditEvent = appendFixedAudit({
      repository: runtime.repository,
      context,
      route,
      reportId,
      decision: "allow",
      reason: "fixed_report_screen_authorized",
      query,
      metadata: {
        returned_row_count: item.row_count,
        snapshot_version: item.snapshot.version,
      },
    });
    return {
      status: 200,
      body: responseBody(requestId, query, {
        outcome: item.source_status === "partial"
          ? "partial"
          : item.row_count === 0
            ? "empty"
            : "passed",
        ui_state: item.source_status === "partial"
          ? "partial"
          : item.row_count === 0
            ? "no_data"
            : null,
        item,
        audit_event: safeFixedAuditEvent(auditEvent),
        count_leak_prevented: true,
      }),
    };
  } catch (error) {
    return fixedFailure({
      error,
      repository: runtime.repository,
      context,
      route,
      reportId,
      query,
      requestId,
    });
  }
}

function handleClientFixedReportCsv({
  route,
  reportId,
  query,
  body,
  context,
  requestId,
  runtime,
}) {
  const gated = fixedGate({
    repository: runtime.repository,
    context,
    query,
    route,
    reportId,
    requestId,
  });
  if (gated) return gated;
  try {
    const input = fixedExportInput(body);
    const capabilityBinding =
      clientFixedReportCapabilityBinding(context);
    const item = clientFixedReportService(runtime).exportCsv({
      tenant_id: authoritativeTenantId(context),
      actor_id: actorFrom(context),
      capability_binding: capabilityBinding,
      report_id: reportId,
      snapshot_token: input.snapshotToken,
      snapshot_version: input.snapshotVersion,
    });
    const operation = [
      "client_fixed_report_csv",
      actorFrom(context),
      reportId,
      fingerprint(input.snapshotToken),
      `v${input.snapshotVersion}`,
    ].join(":");
    const prior = runtime.repository?.getIdempotency?.({
      tenant_id: authoritativeTenantId(context),
      idempotency_key: input.idempotencyKey,
    });
    if (prior) {
      if (prior.operation !== operation || !prior.response) {
        throw Object.assign(
          new Error("fixed report idempotency conflict"),
          {
            safe_error_code:
              REPORTS_API_ERROR_CODES.fixed_idempotency_conflict,
          },
        );
      }
      const auditEvent = appendFixedAudit({
        repository: runtime.repository,
        context,
        route,
        reportId,
        decision: "replay",
        reason: "fixed_report_csv_idempotent_replay",
        query,
        metadata: {
          idempotency_key_sha256:
            fingerprint(input.idempotencyKey),
          snapshot_version: input.snapshotVersion,
        },
      });
      return {
        status: 200,
        body: {
          ...prior.response,
          request_id: requestId,
          outcome:
            prior.response.item?.source_status === "partial"
              ? "partial"
              : "idempotent_replay",
          idempotent_replay: true,
          audit_event: safeFixedAuditEvent(auditEvent),
          production_ready_claim: false,
        },
      };
    }
    const response = responseBody(requestId, query, {
      outcome: item.source_status === "partial"
        ? "partial"
        : "created",
      ui_state: item.source_status === "partial"
        ? "partial"
        : null,
      item,
      idempotent_replay: false,
      count_leak_prevented: true,
    });
    let auditEvent;
    const persist = (repository) => {
      repository.recordIdempotency({
        tenant_id: authoritativeTenantId(context),
        idempotency_key: input.idempotencyKey,
        operation,
        response,
        created_at: new Date().toISOString(),
      });
      auditEvent = appendFixedAudit({
        repository,
        context,
        route,
        reportId,
        decision: "allow",
        reason: "fixed_report_csv_authorized",
        query,
        metadata: {
          returned_row_count: item.row_count,
          idempotency_key_sha256:
            fingerprint(input.idempotencyKey),
          snapshot_version: item.snapshot_version,
          csv_sha256: item.csv_sha256,
        },
      });
    };
    if (typeof runtime.repository?.transaction === "function") {
      runtime.repository.transaction(persist);
    } else {
      persist(runtime.repository);
    }
    return {
      status: 201,
      body: {
        ...response,
        audit_event: safeFixedAuditEvent(auditEvent),
      },
    };
  } catch (error) {
    return fixedFailure({
      error,
      repository: runtime.repository,
      context,
      route,
      reportId,
      query,
      requestId,
    });
  }
}

function handleClientFixedReport({
  route,
  reportId,
  query,
  body,
  context,
  requestId,
  runtime,
}) {
  if (
    !runtime.repository
    || !runtime.clientOperationsReadModel
    || !runtime.clientFixedReportTokenAuthority
  ) {
    return fixedErrorResponse(
      503,
      requestId,
      [REPORTS_API_ERROR_CODES.fixed_runtime_unavailable],
    );
  }
  return route.action === "analytics:client:export"
    ? handleClientFixedReportCsv({
      route,
      reportId,
      query,
      body,
      context,
      requestId,
      runtime,
    })
    : handleClientFixedReportScreen({
      route,
      reportId,
      query,
      context,
      requestId,
      runtime,
    });
}

export function handleReportsApiRequest({ pathname, method, query, body, context, requestId, runtime } = {}) {
  const route = matchReportRoute({ pathname, method });
  if (!route) return errorResponse(404, requestId, [REPORTS_API_ERROR_CODES.not_found], { ui_state: "empty" });
  const mergedQuery = queryWithBody(query, body);
  const reportId = route.params[0] ? decodeURIComponent(route.params[0]) : null;
  if (route.fixed_client_report) {
    return handleClientFixedReport({
      route,
      reportId,
      query: mergedQuery,
      body,
      context,
      requestId,
      runtime: createRuntime(runtime),
    });
  }
  const gated = routeGate({ context, query: mergedQuery, requestId, policy: route, resourceId: reportId });
  if (gated) return gated;
  const repositories = createRuntime(runtime);
  const reportService = service(repositories);

  try {
    if (route.action === "reports:definition:read" && method === "GET" && reportId) {
      return {
        status: 200,
        body: responseBody(requestId, mergedQuery, {
          outcome: "passed",
          item: reportService.getReport({ tenant_id: mergedQuery.tenant_id, report_id: reportId }),
        }),
      };
    }
    if (route.action === "reports:definition:read") {
      return {
        status: 200,
        body: responseBody(requestId, mergedQuery, {
          outcome: "passed",
          items: reportService.listReports({ tenant_id: mergedQuery.tenant_id }),
        }),
      };
    }
    if (route.action === "reports:audit:read") {
      return {
        status: 200,
        body: responseBody(requestId, mergedQuery, {
          outcome: "passed",
          items: reportService.listAudit({ tenant_id: mergedQuery.tenant_id, report_id: reportId }),
        }),
      };
    }

    const writeCheck = validateIdempotentWrite(repositories.repository, mergedQuery, body, requestId, route.action);
    if (writeCheck.replay) return writeCheck.replay;
    const common = commonInput(mergedQuery, body, context);
    let status = 200;
    let payload;
    if (route.action === "reports:definition:write") {
      const result = reportService.createReport({ ...common, ...body });
      status = 201;
      payload = { outcome: "passed", ui_state: "route_mounted", item: result.report, audit_event: result.audit_event };
    } else if (route.action === "reports:definition:patch") {
      const result = reportService.patchReport({ ...common, ...body, report_id: reportId });
      payload = { outcome: "passed", ui_state: "route_mounted", item: result.report, audit_event: result.audit_event };
    } else if (route.action === "reports:query:run") {
      const result = reportService.runReport({ ...common, ...body, report_id: reportId });
      payload = {
        outcome: "passed",
        ui_state: "route_mounted",
        item: result.query_run,
        audit_event: result.audit_event,
        arbitrary_sql_executed: false,
        source_object_mutated: false,
      };
    } else if (route.action === "reports:share:write") {
      const result = reportService.shareReport({ ...common, ...body, report_id: reportId });
      payload = { outcome: "owner_blocked", ui_state: "owner_blocked", item: result.share_grant, audit_event: result.audit_event };
    } else {
      return errorResponse(404, requestId, [REPORTS_API_ERROR_CODES.not_found], { ui_state: "empty" });
    }
    const response = responseBody(requestId, mergedQuery, payload);
    recordIdempotency(repositories.repository, mergedQuery, writeCheck.idempotencyKey, writeCheck.operation, response);
    return { status, body: response };
  } catch (error) {
    return errorResponse(400, requestId, [REPORTS_API_ERROR_CODES.validation_error], {
      ui_state: "blocked",
      validation_message: error instanceof Error ? error.message : "report validation failed",
    });
  }
}
