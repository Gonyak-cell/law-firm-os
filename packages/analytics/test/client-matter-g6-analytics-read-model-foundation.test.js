import assert from "node:assert/strict";
import test from "node:test";

import {
  ANALYTICS_G6A_TUW_COVERAGE,
  createAnalyticsG6AReadModelFoundationCloseoutDescriptor,
  createAnalyticsG6AnalyticsEventDescriptor,
  createAnalyticsG6ClientProfitabilityDescriptor,
  createAnalyticsG6MatterProfitabilityDescriptor,
  createAnalyticsG6RealizationMetricDescriptor,
  createAnalyticsG6UtilizationMetricDescriptor,
} from "../src/index.js";

const tenant_id = "tenant_g6a_validator";
const matter_id = "matter_g6a";
const client_group_id = "client_group_g6a";
const actor_id = "actor_g6a";
const period_id = "period_2026_06";

function analyticsEvent(overrides = {}) {
  return {
    analytics_event_id: "analytics_event_g6a_001",
    tenant_id,
    matter_id,
    event_type: "invoice_payment_time_joined",
    occurred_at: "2026-06-19T08:00:00Z",
    ...overrides,
  };
}

function timeEntry(overrides = {}) {
  return { time_entry_id: "time_g6a_001", tenant_id, matter_id, actor_id, standard_value: 1000, billable_hours: 5, ...overrides };
}

function invoice(overrides = {}) {
  return { invoice_id: "invoice_g6a_001", tenant_id, matter_id, invoice_total: 900, ...overrides };
}

function payment(overrides = {}) {
  return { payment_id: "payment_g6a_001", tenant_id, matter_id, payment_total: 700, ...overrides };
}

test("G6-A AnalyticsEvent descriptor requires no source mutation evidence", () => {
  const descriptor = createAnalyticsG6AnalyticsEventDescriptor({
    tenant_id,
    matter_id,
    analytics_event: analyticsEvent(),
    source_refs: [{ source_type: "invoice", source_id: "invoice_g6a_001" }],
  });

  assert.equal(descriptor.outcome, "review_required");
  assert.equal(descriptor.analytics_event_receipt.no_source_mutation_tested, true);
  assert.equal(descriptor.analytics_event_receipt.analytics_event_persisted, false);

  const blocked = createAnalyticsG6AnalyticsEventDescriptor({
    tenant_id,
    matter_id,
    analytics_event: analyticsEvent({ source_object_mutated: true }),
    source_refs: [],
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("analytics_event_source_ref_required"));
  assert.ok(blocked.blocked_claims.includes("analytics_event_no_source_mutation_required"));
});

test("G6-A MatterProfitability descriptor requires invoice payment time join evidence", () => {
  const descriptor = createAnalyticsG6MatterProfitabilityDescriptor({
    tenant_id,
    matter_id,
    time_entries: [timeEntry()],
    invoices: [invoice()],
    payments: [payment()],
  });

  assert.equal(descriptor.outcome, "review_required");
  assert.equal(descriptor.matter_profitability_receipt.invoice_payment_time_join_tested, true);
  assert.equal(descriptor.matter_profitability_receipt.read_model_persisted, false);

  const blocked = createAnalyticsG6MatterProfitabilityDescriptor({
    tenant_id,
    matter_id,
    time_entries: [],
    invoices: [invoice({ matter_id: "wrong" })],
    payments: [],
    source_object_mutated: true,
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("matter_profitability_join_evidence_required"));
  assert.ok(blocked.blocked_claims.includes("matter_profitability_matter_trace_mismatch"));
  assert.ok(blocked.blocked_claims.includes("matter_profitability_source_mutation_blocked"));
});

test("G6-A ClientProfitability descriptor aggregates by Party Master client group", () => {
  const descriptor = createAnalyticsG6ClientProfitabilityDescriptor({
    tenant_id,
    client_group_id,
    matter_profitability_rows: [
      { tenant_id, matter_id: "matter_one", client_group_id, profitability_amount: 100 },
      { tenant_id, matter_id: "matter_two", client_group_id, profitability_amount: 200 },
    ],
  });

  assert.equal(descriptor.outcome, "review_required");
  assert.equal(descriptor.profitability_total, 300);
  assert.equal(descriptor.client_profitability_receipt.client_group_aggregation_tested, true);

  const blocked = createAnalyticsG6ClientProfitabilityDescriptor({
    tenant_id,
    client_group_id,
    matter_profitability_rows: [{ tenant_id, client_group_id: "other", profitability_amount: 100 }],
    created_client_identity: true,
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("client_profitability_client_group_trace_mismatch"));
  assert.ok(blocked.blocked_claims.includes("client_profitability_duplicate_client_identity_blocked"));
});

test("G6-A UtilizationMetric descriptor requires capacity denominator evidence", () => {
  const descriptor = createAnalyticsG6UtilizationMetricDescriptor({
    tenant_id,
    actor_id,
    period_id,
    capacity: { denominator_hours: 10 },
    time_entries: [timeEntry()],
  });

  assert.equal(descriptor.outcome, "review_required");
  assert.equal(descriptor.utilization_rate, 0.5);
  assert.equal(descriptor.utilization_receipt.capacity_denominator_tested, true);

  const blocked = createAnalyticsG6UtilizationMetricDescriptor({
    tenant_id,
    actor_id,
    period_id,
    capacity: { denominator_hours: 0 },
    time_entries: [],
    used_hr_payroll_data: true,
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("utilization_capacity_denominator_required"));
  assert.ok(blocked.blocked_claims.includes("utilization_time_entries_required"));
  assert.ok(blocked.blocked_claims.includes("utilization_hrx_boundary_blocked"));
});

test("G6-A RealizationMetric descriptor requires billed versus standard value evidence", () => {
  const descriptor = createAnalyticsG6RealizationMetricDescriptor({
    tenant_id,
    matter_id,
    billed_items: [{ tenant_id, matter_id, billed_value: 900 }],
    standard_value_items: [timeEntry()],
  });

  assert.equal(descriptor.outcome, "review_required");
  assert.equal(descriptor.realization_rate, 0.9);
  assert.equal(descriptor.realization_receipt.billed_vs_standard_value_tested, true);

  const blocked = createAnalyticsG6RealizationMetricDescriptor({
    tenant_id,
    matter_id,
    billed_items: [],
    standard_value_items: [{ tenant_id, matter_id, standard_value: 0 }],
    source_object_mutated: true,
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("realization_billed_standard_value_required"));
  assert.ok(blocked.blocked_claims.includes("realization_source_mutation_blocked"));
});

test("G6-A closeout descriptor summarizes read-model foundation evidence", () => {
  const event = createAnalyticsG6AnalyticsEventDescriptor({
    tenant_id,
    matter_id,
    analytics_event: analyticsEvent(),
    source_refs: [{ source_type: "invoice", source_id: "invoice_g6a_001" }],
  });
  const matter = createAnalyticsG6MatterProfitabilityDescriptor({
    tenant_id,
    matter_id,
    time_entries: [timeEntry()],
    invoices: [invoice()],
    payments: [payment()],
  });
  const client = createAnalyticsG6ClientProfitabilityDescriptor({
    tenant_id,
    client_group_id,
    matter_profitability_rows: [{ tenant_id, matter_id, client_group_id, profitability_amount: 100 }],
  });
  const utilization = createAnalyticsG6UtilizationMetricDescriptor({
    tenant_id,
    actor_id,
    period_id,
    capacity: { denominator_hours: 10 },
    time_entries: [timeEntry()],
  });
  const realization = createAnalyticsG6RealizationMetricDescriptor({
    tenant_id,
    matter_id,
    billed_items: [{ tenant_id, matter_id, billed_value: 900 }],
    standard_value_items: [timeEntry()],
  });

  const closeout = createAnalyticsG6AReadModelFoundationCloseoutDescriptor({
    tenant_id,
    descriptors: [event, matter, client, utilization, realization],
  });

  assert.equal(closeout.outcome, "review_required");
  assert.equal(closeout.tuw_coverage.length, 5);
  assert.equal(closeout.no_source_mutation_tested, true);
  assert.equal(closeout.invoice_payment_time_join_tested, true);
  assert.equal(closeout.client_group_aggregation_tested, true);
  assert.equal(closeout.capacity_denominator_tested, true);
  assert.equal(closeout.billed_vs_standard_value_tested, true);
  assert.equal(closeout.closeout_receipt.runtime_readiness_claim, "open");
  assert.equal(ANALYTICS_G6A_TUW_COVERAGE.length, 5);
});
