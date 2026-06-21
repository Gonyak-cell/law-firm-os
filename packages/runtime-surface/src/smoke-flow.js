import { createRuntimeSurfaceService, RUNTIME_SURFACE_DEFAULT_PRINCIPAL } from "./service.js";
import { createRuntimeSurfaceUiClient } from "./ui-client.js";

export function runRuntimeSurfaceSmoke({
  service = createRuntimeSurfaceService(),
  principal = RUNTIME_SURFACE_DEFAULT_PRINCIPAL,
  permission_context_id = "smoke-runtime-surface"
} = {}) {
  const client = createRuntimeSurfaceUiClient({ service, principal, permission_context_id });
  const clientResult = client.createClient({ client_id: "client-smoke", display_name: "Smoke Client", party_id: "party-runtime-spine" });
  const matterResult = client.createMatter({ matter_id: "matter-smoke", client_id: "client-smoke", title: "Smoke Matter" });
  const memberResult = client.assignMember({ matter_id: "matter-smoke", employee_id: "employee-runtime-spine", role: "responsible_attorney" });
  const taskResult = client.createTask({ task_id: "task-smoke", matter_id: "matter-smoke", title: "Smoke Task" });
  const wikiResult = client.updateWiki({ matter_id: "matter-smoke" });
  const vaultResult = client.vaultExport({ matter_id: "matter-runtime-spine" });
  const featureLocks = client.featureLocks();

  return Object.freeze({
    ok: [clientResult, matterResult, memberResult, taskResult, wikiResult, vaultResult, featureLocks].every((result) => result.kind === "data"),
    results: Object.freeze([clientResult, matterResult, memberResult, taskResult, wikiResult, vaultResult, featureLocks]),
    audit_event_count: service.auditEvents().length,
    runtime_ready_candidate: false,
    actual_launch_go_live_claim: false
  });
}
