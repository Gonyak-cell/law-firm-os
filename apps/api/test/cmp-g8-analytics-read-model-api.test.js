// Deterministic in-process tests for the CMP-G8 Analytics read-model runtime slice.
import test from "node:test";
import assert from "node:assert/strict";
import { startApiServer } from "../src/server.js";

const TENANT = "tenant-a";
const ACTOR = "cmp-g8-analytics-ops";
const MATTER_ID = "matter-cmp-g8-runtime";
const CLIENT_GROUP_ID = "client-group-cmp-g8-runtime";
const ACTOR_ID = "employee-cmp-g8-runtime";

let server;
let baseUrl;

async function json(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  return { status: response.status, body: await response.json() };
}

function query(params = {}) {
  return new URLSearchParams({ tenant_id: TENANT, actor_id: ACTOR, ...params }).toString();
}

test.before(async () => {
  const started = await startApiServer({ port: 0 });
  server = started.server;
  baseUrl = `http://${started.host}:${started.port}`;
});

test.after(() => new Promise((resolve) => server.close(resolve)));

test("CMP-G8 health descriptor exposes Analytics read models after G1-G7", async () => {
  const { status, body } = await json("/api/health");
  assert.equal(status, 200);
  const analytics = body.bounded_contexts.find((context) => context.bounded_context === "analytics-read-models");
  assert.ok(analytics);
  assert.equal(analytics.cmp_gate, "CMP-G8");
  assert.deepEqual(analytics.depends_on, ["CMP-G1-W01", "CMP-G2-W02", "CMP-G3-W03", "CMP-G4-W04", "CMP-G5-W05", "CMP-G6-W06", "CMP-G7-W07"]);
  assert.equal(analytics.tuw_ids.length, 14);
  assert.equal(analytics.tuw_ids[0], "CMP-G8-W08-T001");
  assert.equal(analytics.tuw_ids.at(-1), "CMP-G8-W08-T014");
  assert.equal(analytics.runtime_readiness_claim, "runtime_api_evidence_only__durable_persistence_open");
});

test("CMP-G8 blocks source mutation attempts before read-model generation", async () => {
  const blocked = await json(`/api/analytics-read-models/source-mutation-test?${query()}`, {
    method: "POST",
    body: JSON.stringify({
      mutates_source_object: true,
      writes_finance_source: true,
    }),
  });
  assert.equal(blocked.status, 400);
  assert.equal(blocked.body.safe_error_code, "CMP_G8_SOURCE_MUTATION_BLOCKED");
  assert.equal(blocked.body.source_mutation_negative_tested, true);
  assert.equal(blocked.body.source_objects_mutated, false);

  const blockedNested = await json(`/api/analytics-read-models/matter-profitability?${query()}`, {
    method: "POST",
    body: JSON.stringify({
      matter_id: MATTER_ID,
      read_model: { mutates_source_object: true },
    }),
  });
  assert.equal(blockedNested.status, 400);
  assert.equal(blockedNested.body.safe_error_code, "CMP_G8_SOURCE_MUTATION_BLOCKED");
});

test("CMP-G8 generates matter, client, utilization, and realization read models without persistence", async () => {
  const event = await json(`/api/analytics-read-models/events?${query()}`, {
    method: "POST",
    body: JSON.stringify({
      matter_id: MATTER_ID,
      analytics_event_id: "analytics-event-cmp-g8-runtime",
      source_refs: [{ source_type: "invoice", source_id: "invoice-cmp-g8-runtime" }],
    }),
  });
  assert.equal(event.status, 200);
  assert.equal(event.body.analytics_event.analytics_event_persisted, false);
  assert.equal(event.body.analytics_event.source_objects_mutated, false);

  const matterProfitability = await json(`/api/analytics-read-models/matter-profitability?${query()}`, {
    method: "POST",
    body: JSON.stringify({ matter_id: MATTER_ID }),
  });
  assert.equal(matterProfitability.status, 200);
  assert.equal(matterProfitability.body.read_model.read_model_type, "MatterProfitability");
  assert.equal(matterProfitability.body.read_model.read_model_persisted, false);
  assert.equal(matterProfitability.body.read_model.source_objects_mutated, false);

  const clientProfitability = await json(`/api/analytics-read-models/client-profitability?${query()}`, {
    method: "POST",
    body: JSON.stringify({ client_group_id: CLIENT_GROUP_ID }),
  });
  assert.equal(clientProfitability.status, 200);
  assert.equal(clientProfitability.body.read_model.created_client_identity, false);
  assert.equal(clientProfitability.body.read_model.profitability_total, 750);

  const utilization = await json(`/api/analytics-read-models/utilization?${query()}`, {
    method: "POST",
    body: JSON.stringify({
      actor_id: ACTOR_ID,
      period_id: "period-cmp-g8-runtime",
      capacity: { denominator_hours: 10 },
    }),
  });
  assert.equal(utilization.status, 200);
  assert.equal(utilization.body.read_model.utilization_rate, 0.5);
  assert.equal(utilization.body.read_model.used_hr_payroll_data, false);

  const realization = await json(`/api/analytics-read-models/realization?${query()}`, {
    method: "POST",
    body: JSON.stringify({ matter_id: MATTER_ID }),
  });
  assert.equal(realization.status, 200);
  assert.equal(realization.body.read_model.realization_rate, 0.9);
});

test("CMP-G8 dashboards enforce finance permission, detail omission, and role visibility", async () => {
  const blockedAr = await json(`/api/analytics-read-models/dashboards/ar-aging?${query()}`, {
    method: "POST",
    body: JSON.stringify({ permissions: [] }),
  });
  assert.equal(blockedAr.status, 400);
  assert.ok(blockedAr.body.descriptor.blocked_claims.includes("ar_aging_finance_permission_required"));

  const ar = await json(`/api/analytics-read-models/dashboards/ar-aging?${query()}`, {
    method: "POST",
    body: JSON.stringify({ permissions: ["finance:ar:read"] }),
  });
  assert.equal(ar.status, 200);
  assert.equal(ar.body.dashboard.finance_permission_tested, true);
  assert.equal(ar.body.dashboard.source_objects_mutated, false);

  const health = await json(`/api/analytics-read-models/dashboards/client-health?${query()}`, {
    method: "POST",
    body: JSON.stringify({ client_group_id: CLIENT_GROUP_ID }),
  });
  assert.equal(health.status, 200);
  assert.equal(health.body.dashboard.conflict_detail_visible, false);
  assert.equal(health.body.dashboard.matter_detail_visible, false);

  const blockedPnl = await json(`/api/analytics-read-models/dashboards/practice-pnl?${query()}`, {
    method: "POST",
    body: JSON.stringify({
      role_id: "role-finance-partner",
      permissions: ["analytics:practice-pnl:read"],
      practice_pnl_rows: [{ tenant_id: TENANT, practice_id: "practice-cmp-g8-runtime", visible_to_role: "other-role", pnl_amount: 5000 }],
    }),
  });
  assert.equal(blockedPnl.status, 400);
  assert.ok(blockedPnl.body.descriptor.blocked_claims.includes("practice_pnl_unauthorized_visibility_blocked"));

  const pnl = await json(`/api/analytics-read-models/dashboards/practice-pnl?${query()}`, {
    method: "POST",
    body: JSON.stringify({ role_id: "role-finance-partner" }),
  });
  assert.equal(pnl.status, 200);
  assert.equal(pnl.body.dashboard.role_visibility_tested, true);
});

test("CMP-G8 export and KPI console remain projection-only", async () => {
  const blockedExport = await json(`/api/analytics-read-models/exports?${query()}`, {
    method: "POST",
    body: JSON.stringify({
      export_rows: [{ tenant_id: TENANT, privileged_text: "unmasked" }],
      read_model_refs: [{ read_model_type: "MatterProfitability", read_model_id: "read-model-cmp-g8-runtime" }],
      audit_receipt: { tenant_id: TENANT, audit_event_id: "audit-cmp-g8-export", export_id: "export-cmp-g8-runtime" },
      masking_tested: true,
      tenant_scoped: true,
    }),
  });
  assert.equal(blockedExport.status, 400);
  assert.ok(blockedExport.body.descriptor.blocked_claims.includes("analytics_export_unmasked_sensitive_data_blocked"));

  const exportPreview = await json(`/api/analytics-read-models/exports?${query()}`, {
    method: "POST",
    body: JSON.stringify({ export_id: "export-cmp-g8-runtime" }),
  });
  assert.equal(exportPreview.status, 200);
  assert.equal(exportPreview.body.export_preview.export_file_written, false);
  assert.equal(exportPreview.body.export_preview.source_objects_mutated, false);

  const consoleView = await json(`/api/analytics-read-models/ui/kpi-console?${query({ launch_kpi_ref: "docs/launch/kpi/cmp-g8" })}`);
  assert.equal(consoleView.status, 200);
  assert.equal(consoleView.body.kpi_console.dashboard_persisted, false);
  assert.equal(consoleView.body.kpi_console.source_objects_mutated, false);
  assert.equal(consoleView.body.kpi_console.tiles.length, 4);
});

test("CMP-G8 runtime evidence preserves read-model-only boundary without R4 claim", async () => {
  const evidence = await json(`/api/analytics-read-models/runtime/evidence?${query()}`);
  assert.equal(evidence.status, 200);
  assert.equal(evidence.body.evidence.cmp_gate, "CMP-G8");
  assert.equal(evidence.body.evidence.tuw_ids.length, 14);
  assert.equal(evidence.body.evidence.read_model_only_runtime, true);
  assert.equal(evidence.body.evidence.source_mutation_negative_tests, true);
  assert.equal(evidence.body.evidence.source_objects_mutated, false);
  assert.equal(evidence.body.evidence.read_model_persistence, false);
  assert.equal(evidence.body.evidence.export_file_persistence, false);
  assert.equal(evidence.body.evidence.runtime_readiness, "runtime_api_evidence_only__durable_persistence_open");
});
