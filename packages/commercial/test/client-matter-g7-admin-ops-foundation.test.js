import assert from "node:assert/strict";
import test from "node:test";

import {
  COMMERCIAL_G7A_TUW_COVERAGE,
  createCommercialG7IncidentRunbookDescriptor,
  createCommercialG7ObservabilityBaselineDescriptor,
  createCommercialG7ReleaseCandidateDescriptor,
} from "../src/index.js";

const tenant_id = "tenant_g7a_commercial";

function observability(overrides = {}) {
  return {
    tenant_id,
    metric_refs: ["metric_route_latency_p95", "metric_error_rate"],
    route_latency_dashboard_ref: "dashboard_latency_g7a",
    log_redaction: true,
    customer_data_redacted: true,
    ...overrides,
  };
}

function incidentRunbook(overrides = {}) {
  return {
    tenant_id,
    runbook_id: "incident_runbook_g7a",
    lifecycle_states: ["triage", "contained", "resolved"],
    owner_role: "ops_lead",
    escalation_path: "sev1_to_dri",
    customer_safe_comms: true,
    ...overrides,
  };
}

function releaseCandidate(overrides = {}) {
  return {
    tenant_id,
    release_candidate_id: "rc_g7a",
    approval_required: true,
    approval_gate_ref: "release_approval_gate_g7a",
    deployment_blocked_until_approved: true,
    ...overrides,
  };
}

test("G7-A observability baseline requires metrics, dashboard, and redaction", () => {
  const descriptor = createCommercialG7ObservabilityBaselineDescriptor({
    tenant_id,
    observability: observability(),
  });

  assert.equal(descriptor.outcome, "review_required");
  assert.equal(descriptor.observability_receipt.metrics_logging_tested, true);
  assert.equal(descriptor.observability_receipt.route_latency_dashboard_tested, true);
  assert.equal(descriptor.observability_receipt.customer_data_redaction_tested, true);
  assert.equal(descriptor.g7_runtime_readiness_claim, "open");

  const blocked = createCommercialG7ObservabilityBaselineDescriptor({
    tenant_id,
    observability: observability({
      metric_refs: [],
      route_latency_dashboard_ref: "",
      log_redaction: false,
      customer_data_redacted: false,
      customer_data_leak: true,
      dispatched_runtime: true,
    }),
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("observability_metric_refs_required"));
  assert.ok(blocked.blocked_claims.includes("observability_route_latency_dashboard_required"));
  assert.ok(blocked.blocked_claims.includes("observability_customer_data_redaction_required"));
  assert.ok(blocked.blocked_claims.includes("observability_runtime_dispatch_blocked"));
});

test("G7-A incident runbook requires lifecycle, escalation, and safe comms", () => {
  const descriptor = createCommercialG7IncidentRunbookDescriptor({
    tenant_id,
    incident_runbook: incidentRunbook(),
  });

  assert.equal(descriptor.outcome, "review_required");
  assert.equal(descriptor.incident_runbook_receipt.incident_lifecycle_tested, true);
  assert.equal(descriptor.incident_runbook_receipt.escalation_path_tested, true);
  assert.equal(descriptor.incident_runbook_receipt.customer_safe_comms_tested, true);

  const blocked = createCommercialG7IncidentRunbookDescriptor({
    tenant_id,
    incident_runbook: incidentRunbook({
      lifecycle_states: ["triage"],
      owner_role: "",
      escalation_path: "",
      customer_safe_comms: false,
      dispatched_runtime: true,
    }),
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("incident_runbook_lifecycle_required"));
  assert.ok(blocked.blocked_claims.includes("incident_runbook_escalation_required"));
  assert.ok(blocked.blocked_claims.includes("incident_runbook_customer_safe_comms_required"));
  assert.ok(blocked.blocked_claims.includes("incident_runbook_runtime_dispatch_blocked"));
});

test("G7-A release candidate requires approval and blocks readiness overclaims", () => {
  const descriptor = createCommercialG7ReleaseCandidateDescriptor({
    tenant_id,
    release_candidate: releaseCandidate(),
  });

  assert.deepEqual(COMMERCIAL_G7A_TUW_COVERAGE, ["LFOS-G7-W12-T003", "LFOS-G7-W12-T004", "LFOS-G7-W12-T005"]);
  assert.equal(descriptor.outcome, "review_required");
  assert.equal(descriptor.release_candidate_receipt.approval_required_tested, true);
  assert.equal(descriptor.release_candidate_receipt.deployment_blocked_until_approved, true);
  assert.equal(descriptor.release_candidate_receipt.production_readiness_claim, "open");
  assert.equal(descriptor.release_candidate_receipt.go_live_approval_claimed, false);

  const blocked = createCommercialG7ReleaseCandidateDescriptor({
    tenant_id,
    release_candidate: releaseCandidate({
      approval_required: false,
      approval_gate_ref: "",
      claims_production_ready: true,
      claims_go_live_approval: true,
      dispatched_runtime: true,
    }),
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("release_candidate_approval_required"));
  assert.ok(blocked.blocked_claims.includes("release_candidate_production_ready_claim_blocked"));
  assert.ok(blocked.blocked_claims.includes("release_candidate_go_live_claim_blocked"));
  assert.ok(blocked.blocked_claims.includes("release_candidate_runtime_dispatch_blocked"));
});
