import { createHash, randomUUID } from "node:crypto";
import {
  evaluatePermissionControlRequest,
} from "../../../packages/authz/src/index.js";
import {
  buildAuditEventInput,
  createAuditLedger,
  recordSensitiveRead,
} from "../../../packages/audit/src/index.js";

const TRUST_FOUNDATION_PREFIXES = Object.freeze([
  "/permissions/evaluate",
  "/permissions/contexts",
  "/admin/policies",
  "/object-acl",
  "/admin/ethical-walls",
  "/admin/legal-holds",
  "/admin/permission-simulator",
  "/audit/events/export",
  "/audit/verify",
  "/audit/sensitive-read",
]);

export const CMP_G1_TUW_IDS = Object.freeze([
  "CMP-G1-W01-T001",
  "CMP-G1-W01-T002",
  "CMP-G1-W01-T003",
  "CMP-G1-W01-T004",
  "CMP-G1-W01-T005",
  "CMP-G1-W01-T006",
  "CMP-G1-W01-T007",
  "CMP-G1-W01-T008",
  "CMP-G1-W01-T009",
  "CMP-G1-W01-T010",
  "CMP-G1-W01-T011",
  "CMP-G1-W01-T012",
  "CMP-G1-W01-T013",
  "CMP-G1-W01-T014",
  "CMP-G1-W01-T015",
  "CMP-G1-W01-T016",
  "CMP-G1-W01-T017",
  "CMP-G1-W01-T018",
  "CMP-G1-W01-T019",
  "CMP-G1-W01-T020",
  "CMP-G1-W01-T021",
  "CMP-G1-W01-T022",
  "CMP-G1-W01-T023",
  "CMP-G1-W01-T024",
]);

export const TRUST_FOUNDATION_BOUNDED_CONTEXT = Object.freeze({
  bounded_context: "trust-foundation",
  cmp_gate: "CMP-G1",
  cmp_work_package: "CMP-G1-W01",
  contract_refs: Object.freeze([
    "contracts/permission-kernel-contract.json",
    "contracts/audit-compliance-contract.json",
  ]),
  runtime_routes: Object.freeze([...TRUST_FOUNDATION_PREFIXES]),
  tuw_ids: CMP_G1_TUW_IDS,
  runtime_readiness_claim: "runtime_api_evidence_only__durable_persistence_open",
});

export function isTrustFoundationPath(pathname) {
  return TRUST_FOUNDATION_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function createTrustFoundationRuntime() {
  return {
    policies: [],
    objectAcls: [],
    ethicalWalls: [],
    legalHolds: [],
    permissionContexts: new Map(),
    decisionReceipts: new Map(),
    auditLedger: createAuditLedger(),
  };
}

export async function handleTrustFoundationApiRequest({ pathname, method, query = {}, body = {}, requestId, context }) {
  try {
    if (pathname === "/permissions/evaluate") {
      if (method !== "POST") return response(405, safeError("CMP_G1_METHOD_NOT_ALLOWED", "method_not_allowed"));
      return handlePermissionEvaluate({ body, requestId, context, simulator: false });
    }

    if (pathname === "/admin/permission-simulator") {
      if (method !== "POST") return response(405, safeError("CMP_G1_METHOD_NOT_ALLOWED", "method_not_allowed"));
      return handlePermissionEvaluate({ body, requestId, context, simulator: true });
    }

    if (pathname === "/permissions/contexts") {
      if (method !== "GET") return response(405, safeError("CMP_G1_METHOD_NOT_ALLOWED", "method_not_allowed"));
      const tenantId = requireTenantQuery(query);
      return response(200, {
        outcome: "passed",
        items: [...context.permissionContexts.values()].filter((entry) => entry.tenant_id === tenantId),
        tuw_ids: ["CMP-G1-W01-T004"],
      });
    }

    if (pathname === "/admin/policies") {
      return handleCollectionRoute({
        method,
        query,
        body,
        collection: context.policies,
        idField: "id",
        defaultPrefix: "policy",
        createdTuwId: "CMP-G1-W01-T005",
      });
    }

    if (pathname === "/object-acl") {
      return handleCollectionRoute({
        method,
        query,
        body,
        collection: context.objectAcls,
        idField: "id",
        defaultPrefix: "object_acl",
        createdTuwId: "CMP-G1-W01-T009",
      });
    }

    if (pathname === "/admin/ethical-walls") {
      return handleCollectionRoute({
        method,
        query,
        body,
        collection: context.ethicalWalls,
        idField: "id",
        defaultPrefix: "ethical_wall",
        createdTuwId: "CMP-G1-W01-T011",
      });
    }

    if (pathname === "/admin/legal-holds") {
      return handleCollectionRoute({
        method,
        query,
        body,
        collection: context.legalHolds,
        idField: "id",
        defaultPrefix: "legal_hold",
        createdTuwId: "CMP-G1-W01-T012",
      });
    }

    if (pathname === "/audit/events/export") {
      if (method !== "GET") return response(405, safeError("CMP_G1_METHOD_NOT_ALLOWED", "method_not_allowed"));
      const tenantId = requireTenantQuery(query);
      return response(200, {
        outcome: "passed",
        items: context.auditLedger.list({ tenant_id: tenantId }),
        tuw_ids: ["CMP-G1-W01-T019"],
      });
    }

    if (pathname === "/audit/verify") {
      if (method !== "GET") return response(405, safeError("CMP_G1_METHOD_NOT_ALLOWED", "method_not_allowed"));
      const tenantId = requireTenantQuery(query);
      return response(200, {
        outcome: "passed",
        verification: context.auditLedger.verify({ tenant_id: tenantId }),
        tuw_ids: ["CMP-G1-W01-T018"],
      });
    }

    if (pathname === "/audit/sensitive-read") {
      if (method !== "POST") return response(405, safeError("CMP_G1_METHOD_NOT_ALLOWED", "method_not_allowed"));
      return handleSensitiveRead({ body, context });
    }

    return response(404, safeError("CMP_G1_NOT_FOUND", "not_found"));
  } catch (error) {
    return response(error.status_code ?? 400, safeError(error.safe_error_code ?? "CMP_G1_VALIDATION_ERROR", error.message));
  }
}

function handlePermissionEvaluate({ body, requestId, context, simulator }) {
  const request = {
    request_id: body.request?.request_id ?? requestId,
    trace_id: body.request?.trace_id ?? `trace_${requestId}`,
    span_id: body.request?.span_id ?? "span_permission_evaluate",
    idempotency_key: body.request?.idempotency_key ?? `idem_${requestId}`,
    source_service: simulator ? "permission-simulator" : "permissions-api",
  };
  const principal = normalizePrincipal(body.principal ?? body.actor);
  const resource = body.resource ?? {};
  const evaluationTenantId = principal.tenant_id ?? resource.tenant_id ?? body.tenant_id ?? null;
  const action = body.action ?? "permission.evaluate";
  const rules = [
    ...context.policies.filter((entry) => tenantScoped(entry, evaluationTenantId)),
    ...(Array.isArray(body.rules) ? body.rules : []),
  ];
  const objectAcl = [
    ...context.objectAcls.filter((entry) => tenantScoped(entry, evaluationTenantId) && aclApplies(entry, resource)),
    ...(Array.isArray(body.object_acl) ? body.object_acl : []),
  ];
  const ethicalWalls = [
    ...context.ethicalWalls.filter((entry) => tenantScoped(entry, evaluationTenantId)),
    ...(Array.isArray(body.ethical_walls) ? body.ethical_walls : []),
  ];
  const legalHolds = [
    ...context.legalHolds.filter((entry) => tenantScoped(entry, evaluationTenantId)),
    ...(Array.isArray(body.legal_holds) ? body.legal_holds : []),
  ];

  const result = evaluatePermissionControlRequest({
    principal,
    resource,
    action,
    request,
    rules,
    objectAcl,
    ethicalWalls,
    legalHolds,
    breakGlass: body.break_glass ?? null,
  });

  const permissionDecisionId = stableId("pdr", {
    tenant_id: principal.tenant_id ?? "unknown",
    actor_id: principal.user_id ?? principal.actor_id ?? "unknown",
    action,
    resource_id: resource.resource_id ?? resource.document_id ?? resource.matter_id ?? "unknown",
    request_id: request.request_id,
    effect: result.decision.effect,
  });
  const receipt = {
    permission_decision_id: permissionDecisionId,
    permission_context_id: result.permission_context_id,
    tenant_id: principal.tenant_id ?? resource.tenant_id ?? "unknown",
    actor_id: principal.user_id ?? principal.actor_id ?? "unknown",
    action,
    resource_id: resource.resource_id ?? resource.document_id ?? resource.matter_id ?? "unknown",
    effect: result.decision.effect,
    reason: result.decision.reason,
    matched_rule_id: result.decision.matched_rule_id,
    simulator,
    created_at: new Date().toISOString(),
  };

  if (result.permission_context_id) {
    context.permissionContexts.set(result.permission_context_id, {
      permission_context_id: result.permission_context_id,
      tenant_id: receipt.tenant_id,
      actor_id: receipt.actor_id,
      action,
      resource_id: receipt.resource_id,
      request_id: request.request_id,
      persisted_at: receipt.created_at,
      tuw_ids: ["CMP-G1-W01-T004"],
    });
  }
  context.decisionReceipts.set(permissionDecisionId, receipt);
  const auditEvent = appendDecisionAudit({ context, principal, resource, action, request, receipt });

  return response(result.status_code, {
    outcome: result.decision.effect,
    ok: result.ok,
    decision: {
      ...result.decision,
      permission_decision_id: permissionDecisionId,
    },
    permission_context_id: result.permission_context_id,
    decision_receipt: receipt,
    audit_event_id: auditEvent.event_id,
    safe_error_codes: result.decision.effect === "deny" ? ["CMP_G1_PERMISSION_DENIED"] : [],
    control_evidence: result.control_evidence,
    tuw_ids: CMP_G1_TUW_IDS,
    runtime_readiness: "runtime_api_evidence_only__durable_persistence_open",
  });
}

function handleCollectionRoute({ method, query, body, collection, idField, defaultPrefix, createdTuwId }) {
  if (method === "GET") {
    const tenantId = requireTenantQuery(query);
    return response(200, {
      outcome: "passed",
      items: collection.filter((entry) => entry.tenant_id === tenantId),
      tuw_ids: [createdTuwId],
    });
  }
  if (method !== "POST") return response(405, safeError("CMP_G1_METHOD_NOT_ALLOWED", "method_not_allowed"));
  const tenantId = body.tenant_id ?? body.principal?.tenant_id;
  if (!tenantId) return response(400, safeError("CMP_G1_TENANT_REQUIRED", "tenant_id is required"));
  const entry = Object.freeze({
    ...body,
    tenant_id: tenantId,
    [idField]: body[idField] ?? stableId(defaultPrefix, body),
    created_at: new Date().toISOString(),
  });
  collection.push(entry);
  return response(201, {
    outcome: "passed",
    item: entry,
    tuw_ids: [createdTuwId],
  });
}

function handleSensitiveRead({ body, context }) {
  const permissionDecision = body.permission_decision ?? {};
  const event = recordSensitiveRead({
    ledger: context.auditLedger,
    actor: body.actor ?? {
      actor_id: permissionDecision.actor_id,
      actor_type: permissionDecision.actor_type ?? "user",
      tenant_id: permissionDecision.tenant_id,
    },
    object: body.object,
    permissionDecision,
    request: body.request,
    source_service: "audit-sensitive-read-api",
    evidence_refs: body.evidence_refs ?? [],
  });
  return response(201, {
    outcome: "passed",
    sensitive_read_receipt: event,
    tuw_ids: ["CMP-G1-W01-T017"],
  });
}

function appendDecisionAudit({ context, principal, resource, action, request, receipt }) {
  const actorId = principal.user_id ?? principal.actor_id ?? "unknown";
  const actorType = principal.actor_type ?? (principal.service_principal_id ? "service_principal" : "user");
  const objectId = resource.resource_id ?? resource.document_id ?? resource.matter_id ?? receipt.resource_id;
  const objectType = resource.resource_type ?? resource.object_type ?? "PermissionDecision";
  const input = buildAuditEventInput({
    tenant_id: receipt.tenant_id,
    actor: { actor_id: actorId, actor_type: actorType },
    action: `permission.${receipt.effect}`,
    object: { object_id: objectId, object_type: objectType },
    outcome: receipt.effect,
    decision: receipt.effect,
    reason_code: receipt.reason,
    source_service: request.source_service,
    request,
    payload: {
      payload_classification: "metadata_plus_digest",
      permission_decision_id: receipt.permission_decision_id,
      matched_rule_id: receipt.matched_rule_id,
    },
    evidence_refs: ["docs/reorganization/client-matter-os/cmp-v1/03-cmp-g1-trust-foundation-runtime-report.md"],
    matter_id: resource.matter_id ?? null,
    document_version_id: resource.document_version_id ?? null,
    permission_decision_id: receipt.permission_decision_id,
  });
  return context.auditLedger.append(input);
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
  };
}

function aclApplies(entry, resource) {
  if (entry.resource_id && entry.resource_id !== resource.resource_id && entry.resource_id !== resource.document_id) return false;
  if (entry.resource_type && entry.resource_type !== resource.resource_type) return false;
  return true;
}

function tenantScoped(entry, tenantId) {
  return !entry.tenant_id || !tenantId || entry.tenant_id === tenantId;
}

function requireTenantQuery(query = {}) {
  if (!query.tenant_id) {
    const error = new Error("tenant_id is required");
    error.safe_error_code = "CMP_G1_TENANT_REQUIRED";
    error.status_code = 400;
    throw error;
  }
  return query.tenant_id;
}

function safeError(code, reason) {
  return {
    outcome: "blocked",
    safe_error_codes: [code],
    reason,
    tuw_ids: CMP_G1_TUW_IDS,
  };
}

function response(status, body) {
  return { status, body };
}

function stableId(prefix, value) {
  return `${prefix}_${createHash("sha256").update(JSON.stringify(value ?? randomUUID())).digest("hex").slice(0, 24)}`;
}
