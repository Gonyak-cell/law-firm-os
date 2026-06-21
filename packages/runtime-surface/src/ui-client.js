import { createRuntimeSurfaceService, RUNTIME_SURFACE_DEFAULT_PRINCIPAL } from "./service.js";

function uiState(response) {
  const body = response.body;
  if (body.outcome === "denied") return "denied";
  if (body.outcome === "review_required") return "review_required";
  if (Array.isArray(body.items) && body.items.length === 0 && !body.item) return "empty";
  return body.ui_state ?? "data";
}

function mapResponse(response) {
  return Object.freeze({
    kind: response.status >= 400 ? "error" : "data",
    ui_state: uiState(response),
    outcome: response.body.outcome,
    item: response.body.item,
    items: response.body.items,
    safe_error_codes: response.body.safe_error_codes,
    audit_event: response.body.audit_event,
    production_ready_claim: response.body.production_ready_claim,
    runtime_ready_candidate: response.body.runtime_ready_candidate,
    extra: Object.freeze({
      export_only: response.body.export_only ?? false,
      raw_payload_included: response.body.raw_payload_included ?? null
    })
  });
}

export function createRuntimeSurfaceUiClient({
  service = createRuntimeSurfaceService(),
  principal = RUNTIME_SURFACE_DEFAULT_PRINCIPAL,
  permission_context_id = "ui-runtime-surface"
} = {}) {
  const base = Object.freeze({ principal, permission_context_id });
  return Object.freeze({
    session() {
      return mapResponse(service.getSession(base));
    },
    tenant() {
      return mapResponse(service.getCurrentTenant(base));
    },
    clients() {
      return mapResponse(service.listClients(base));
    },
    createClient(input = {}) {
      return mapResponse(service.createClient({ ...base, ...input }));
    },
    matters() {
      return mapResponse(service.listMatters(base));
    },
    createMatter(input = {}) {
      return mapResponse(service.createMatter({ ...base, ...input }));
    },
    assignMember(input = {}) {
      return mapResponse(service.assignMatterMember({ ...base, ...input }));
    },
    people() {
      return mapResponse(service.listEmployees(base));
    },
    tasks() {
      return mapResponse(service.listTasks(base));
    },
    createTask(input = {}) {
      return mapResponse(service.createTask({ ...base, ...input }));
    },
    wiki(matter_id) {
      return mapResponse(service.readMatterWiki({ ...base, matter_id }));
    },
    updateWiki(input = {}) {
      return mapResponse(service.updateMatterWiki({ ...base, ...input }));
    },
    vaultExport(input = {}) {
      return mapResponse(service.exportVault({ ...base, ...input }));
    },
    featureLocks() {
      return mapResponse(service.getFeatureLocks(base));
    }
  });
}
