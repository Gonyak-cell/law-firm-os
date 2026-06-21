import { createRuntimeAuditMiddleware, createRuntimeAuditWriter } from "../../audit/src/index.js";
import { CANONICAL_SEED_FIXTURE, createCanonicalRecord } from "../../runtime-model/src/index.js";
import { RUNTIME_SURFACE_FEATURE_LOCKS, evaluateRuntimeSurfacePermission } from "./permission-matrix.js";
import { RUNTIME_SURFACE_ROUTE_CATALOG } from "./route-catalog.js";
import { RUNTIME_SURFACE_ERROR_CODES, createRuntimeSurfaceError, createRuntimeSurfaceResponse } from "./safe-error.js";

const DEFAULT_PRINCIPAL = Object.freeze({
  source: "server-derived",
  header_only_trust_allowed: false,
  tenant_id: "tenant-runtime-spine",
  user_id: "user-runtime-spine",
  actor_type: "user",
  role_ids: Object.freeze(["admin", "member"])
});

function clone(record) {
  return JSON.parse(JSON.stringify(record));
}

function routeById(routeId) {
  return RUNTIME_SURFACE_ROUTE_CATALOG.find((route) => route.id === routeId);
}

function primaryIdField(objectType) {
  return {
    Client: "client_id",
    Matter: "matter_id",
    MatterMember: "matter_member_id",
    Document: "document_id",
    Task: "task_id",
    Issue: "issue_id",
    MatterWiki: "wiki_id"
  }[objectType];
}

function resourceFor(route, input = {}, tenantId) {
  const matterScoped = new Set(["Matter", "Document", "DocumentVersion", "Task", "Issue", "MatterWiki", "VaultSnapshot"]);
  const documentScoped = new Set(["Document", "DocumentVersion"]);
  return {
    tenant_id: tenantId,
    resource_id: input.resource_id ?? input.matter_id ?? input.client_id ?? input.document_id ?? input.task_id ?? route.id,
    resource_type: route.canonical_object,
    matter_id: input.matter_id ?? (matterScoped.has(route.canonical_object) ? "matter-runtime-spine" : null),
    document_version_id: input.document_version_id ?? (documentScoped.has(route.canonical_object) ? "document-version-runtime-spine" : null),
    data_classification: "metadata_plus_digest"
  };
}

export function createRuntimeSurfaceService({ seedRecords = CANONICAL_SEED_FIXTURE, auditWriter = createRuntimeAuditWriter() } = {}) {
  const records = seedRecords.map(clone);
  const audit = createRuntimeAuditMiddleware({ writer: auditWriter });

  function requireRuntimeContext({ principal = DEFAULT_PRINCIPAL, permission_context_id } = {}) {
    if (principal?.source !== "server-derived" || principal?.header_only_trust_allowed !== false) {
      return createRuntimeSurfaceError({ code: RUNTIME_SURFACE_ERROR_CODES.server_principal_required });
    }
    if (!principal.tenant_id) return createRuntimeSurfaceError({ code: RUNTIME_SURFACE_ERROR_CODES.tenant_required, status: 400 });
    if (!permission_context_id) return createRuntimeSurfaceError({ code: RUNTIME_SURFACE_ERROR_CODES.permission_context_required, status: 400 });
    return null;
  }

  function appendAudit({ route, principal, permission_context_id, decision, input = {} }) {
    const payload = {
      principal,
      permission_context_id,
      resource: resourceFor(route, input, principal.tenant_id),
      decision,
      request: {
        request_id: `${route.id}:${permission_context_id}`,
        trace_id: `trace:${route.id}`,
        span_id: `span:${route.id}`,
        source_service: "runtime-surface"
      },
      evidence_refs: ["packages/runtime-surface/src/service.js"]
    };
    if (route.audit_action.includes("write")) return audit.recordWrite(payload);
    if (route.audit_action.includes("export")) return audit.recordExport(payload);
    if (route.audit_action.includes("permission")) return audit.recordPermission(payload);
    return audit.recordRead(payload);
  }

  function invoke(routeId, input = {}, handler = () => ({})) {
    const route = routeById(routeId);
    const principal = input.principal ?? DEFAULT_PRINCIPAL;
    const permission_context_id = input.permission_context_id;
    const contextError = requireRuntimeContext({ principal, permission_context_id });
    if (contextError) return contextError;
    const decision = evaluateRuntimeSurfacePermission({ principal, scope: route.permission_scope, decision: input.decision });
    const auditEvent = appendAudit({ route, principal, permission_context_id, decision, input });
    if (decision.effect === "review_required") {
      return createRuntimeSurfaceError({
        code: RUNTIME_SURFACE_ERROR_CODES.review_required,
        status: 200,
        outcome: "review_required",
        ui_state: "review_required",
        extra: { audit_event: auditEvent }
      });
    }
    if (decision.effect !== "allow") {
      return createRuntimeSurfaceError({
        code: RUNTIME_SURFACE_ERROR_CODES.permission_denied,
        extra: { audit_event: auditEvent }
      });
    }
    const result = handler({ principal, input });
    return createRuntimeSurfaceResponse({ ...result, audit_event: auditEvent });
  }

  function list(objectType, tenantId = DEFAULT_PRINCIPAL.tenant_id) {
    return Object.freeze(records.filter((record) => record.object_type === objectType && record.tenant_id === tenantId).map(Object.freeze));
  }

  function upsert(record) {
    const idField = primaryIdField(record.object_type);
    const index = records.findIndex((item) => idField && item.object_type === record.object_type && item[idField] === record[idField]);
    if (index >= 0) records[index] = clone(record);
    else records.push(clone(record));
    return Object.freeze(clone(record));
  }

  return Object.freeze({
    production_ready_claim: false,
    getSession(input = {}) {
      return invoke("session.read", input, ({ principal }) => ({ item: { tenant_id: principal.tenant_id, user_id: principal.user_id, role_ids: principal.role_ids } }));
    },
    getCurrentTenant(input = {}) {
      return invoke("tenant.current", input, ({ principal }) => ({ item: list("Tenant", principal.tenant_id)[0] ?? null }));
    },
    listClients(input = {}) {
      return invoke("client.list", input, ({ principal }) => ({ items: list("Client", principal.tenant_id) }));
    },
    createClient(input = {}) {
      return invoke("client.create", input, ({ principal }) => {
        const record = createCanonicalRecord("Client", {
          tenant_id: principal.tenant_id,
          client_id: input.client_id ?? "client-runtime-created",
          party_id: input.party_id ?? "party-runtime-spine",
          display_name: input.display_name ?? "Runtime Created Client",
          status: input.status ?? "active"
        });
        return { item: upsert(record) };
      });
    },
    getClient(input = {}) {
      return invoke("client.detail", input, ({ principal }) => ({ item: list("Client", principal.tenant_id).find((record) => record.client_id === input.client_id) ?? null }));
    },
    listMatters(input = {}) {
      return invoke("matter.list", input, ({ principal }) => ({ items: list("Matter", principal.tenant_id) }));
    },
    createMatter(input = {}) {
      return invoke("matter.create", input, ({ principal }) => {
        const record = createCanonicalRecord("Matter", {
          tenant_id: principal.tenant_id,
          matter_id: input.matter_id ?? "matter-runtime-created",
          client_id: input.client_id ?? "client-runtime-spine",
          title: input.title ?? "Runtime Created Matter",
          status: input.status ?? "open"
        });
        return { item: upsert(record) };
      });
    },
    getMatter(input = {}) {
      return invoke("matter.detail", input, ({ principal }) => ({ item: list("Matter", principal.tenant_id).find((record) => record.matter_id === input.matter_id) ?? null }));
    },
    assignMatterMember(input = {}) {
      return invoke("matter_member.assign", input, ({ principal }) => {
        const record = createCanonicalRecord("MatterMember", {
          tenant_id: principal.tenant_id,
          matter_member_id: input.matter_member_id ?? `member:${input.matter_id}:runtime`,
          matter_id: input.matter_id,
          employee_id: input.employee_id,
          user_id: input.user_id,
          role: input.role ?? "responsible_attorney",
          status: "active"
        });
        return { item: upsert(record) };
      });
    },
    listEmployees(input = {}) {
      return invoke("employee.list", input, ({ principal }) => ({ items: list("Employee", principal.tenant_id) }));
    },
    listParties(input = {}) {
      return invoke("party.list", input, ({ principal }) => ({ items: list("Party", principal.tenant_id) }));
    },
    listContactRoles(input = {}) {
      return invoke("contact_role.list", input, ({ principal }) => ({ items: list("ContactRole", principal.tenant_id) }));
    },
    listDocuments(input = {}) {
      return invoke("document.list", input, ({ principal }) => ({ items: list("Document", principal.tenant_id) }));
    },
    linkMatterDocument(input = {}) {
      return invoke("matter_document.link", input, ({ principal }) => {
        const record = createCanonicalRecord("Document", {
          tenant_id: principal.tenant_id,
          document_id: input.document_id ?? `document:${input.matter_id}:runtime`,
          matter_id: input.matter_id,
          title: input.title ?? "Runtime Linked Document",
          status: "active",
          classification_envelope_id: input.classification_envelope_id ?? "class-runtime-spine"
        });
        return { item: upsert(record) };
      });
    },
    listTasks(input = {}) {
      return invoke("task.list", input, ({ principal }) => ({ items: list("Task", principal.tenant_id) }));
    },
    createTask(input = {}) {
      return invoke("task.create", input, ({ principal }) => {
        const record = createCanonicalRecord("Task", {
          tenant_id: principal.tenant_id,
          task_id: input.task_id ?? "task-runtime-created",
          matter_id: input.matter_id,
          title: input.title ?? "Runtime Created Task",
          status: input.status ?? "open"
        });
        return { item: upsert(record) };
      });
    },
    listIssues(input = {}) {
      return invoke("issue.list", input, ({ principal }) => ({ items: list("Issue", principal.tenant_id) }));
    },
    createIssue(input = {}) {
      return invoke("issue.create", input, ({ principal }) => {
        const record = createCanonicalRecord("Issue", {
          tenant_id: principal.tenant_id,
          issue_id: input.issue_id ?? "issue-runtime-created",
          matter_id: input.matter_id,
          title: input.title ?? "Runtime Created Issue",
          status: input.status ?? "open"
        });
        return { item: upsert(record) };
      });
    },
    readMatterWiki(input = {}) {
      return invoke("wiki.read", input, ({ principal }) => ({ item: list("MatterWiki", principal.tenant_id).find((record) => record.matter_id === input.matter_id) ?? null }));
    },
    updateMatterWiki(input = {}) {
      return invoke("wiki.update", input, ({ principal }) => {
        const current = list("MatterWiki", principal.tenant_id).find((record) => record.matter_id === input.matter_id);
        const record = createCanonicalRecord("MatterWiki", {
          tenant_id: principal.tenant_id,
          wiki_id: current?.wiki_id ?? `wiki:${input.matter_id}:runtime`,
          matter_id: input.matter_id,
          snapshot_version: Number(current?.snapshot_version ?? 0) + 1,
          status: "draft"
        });
        return { item: upsert(record) };
      });
    },
    exportVault(input = {}) {
      return invoke("vault.export", input, ({ principal }) => ({ item: list("VaultSnapshot", principal.tenant_id).find((record) => record.matter_id === input.matter_id) ?? null, extra: { export_only: true, raw_payload_included: false } }));
    },
    evaluatePermission(input = {}) {
      return invoke("permission.evaluate", input, () => ({ item: { effect: "allow", source: "runtime-surface-permission-matrix" } }));
    },
    getFeatureLocks(input = {}) {
      return invoke("feature.locks", input, () => ({ item: RUNTIME_SURFACE_FEATURE_LOCKS }));
    },
    auditEvents() {
      return auditWriter.list({ tenant_id: DEFAULT_PRINCIPAL.tenant_id });
    },
    routeCatalog() {
      return RUNTIME_SURFACE_ROUTE_CATALOG;
    },
    records() {
      return Object.freeze(records.map(Object.freeze));
    }
  });
}

export { DEFAULT_PRINCIPAL as RUNTIME_SURFACE_DEFAULT_PRINCIPAL };
