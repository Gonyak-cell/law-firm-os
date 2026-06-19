import assert from "node:assert/strict";
import test from "node:test";

import {
  createMatterClosingChecklistDescriptor,
  createMatterCoreRecord,
  createMatterDashboardUiStateDescriptor,
  createMatterG4ClosingChecklist,
  createMatterG4CMatterCloseoutDescriptor,
  createMatterSilentMatterVisibilityDescriptor,
} from "../src/index.js";

const tenant_id = "tenant_g4c_validator";
const actor_id = "actor_g4c_validator";
const matter_id = "matter_g4c";

function matter(overrides = {}) {
  return createMatterCoreRecord("Matter", {
    matter_id,
    tenant_id,
    client_id: "party_g4c_client",
    title: "G4-C synthetic closing matter",
    status: "open",
    created_by: actor_id,
    created_at: "2026-06-19T00:00:00.000Z",
    permission_envelope_id: "perm_g4c_matter",
    audit_trace_id: "audit_g4c_matter",
    ...overrides,
  });
}

function checklist(overrides = {}) {
  return createMatterG4ClosingChecklist({
    checklist_id: "checklist_g4c",
    tenant_id,
    matter_id,
    title: "Matter closing checklist",
    status: "active",
    item_ids: ["wip", "ar", "retention", "tasks"],
    permission_envelope_id: "perm_g4c_checklist",
    audit_trace_id: "audit_g4c_checklist",
    ...overrides,
  });
}

function clearClosingMetrics(overrides = {}) {
  return {
    open_wip_amount: 0,
    open_ar_amount: 0,
    open_hold_count: 0,
    unresolved_task_count: 0,
    retention_acknowledged: true,
    final_invoice_reviewed: true,
    ...overrides,
  };
}

test("G4-C closing checklist blocks WIP and AR before closing", () => {
  const blocked = createMatterClosingChecklistDescriptor({
    tenant_id,
    actor_id,
    matter: matter(),
    checklist: checklist(),
    closing_metrics: clearClosingMetrics({
      open_wip_amount: 1250,
      open_ar_amount: 300,
      unresolved_task_count: 2,
    }),
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("matter_closing_wip_open"));
  assert.ok(blocked.blocked_claims.includes("matter_closing_ar_open"));
  assert.ok(blocked.blocked_claims.includes("matter_closing_unresolved_tasks"));
  assert.equal(blocked.closing_receipt.closing_persisted, false);
  assert.equal(blocked.g4_runtime_readiness_claim, "open");

  const descriptor = createMatterClosingChecklistDescriptor({
    tenant_id,
    actor_id,
    matter: matter({ status: "closing" }),
    checklist: checklist({ status: "completed" }),
    closing_metrics: clearClosingMetrics(),
  });

  assert.equal(descriptor.outcome, "review_required");
  assert.equal(descriptor.closing_receipt.wip_ar_block_tested, true);
  assert.equal(descriptor.closing_receipt.audit_event_written, false);
});

test("G4-C silent matter visibility omits unauthorized matters without count leaks", () => {
  const descriptor = createMatterSilentMatterVisibilityDescriptor({
    tenant_id,
    actor_id,
    matters: [
      {
        matter_id: "matter_g4c_visible",
        client_id: "party_visible",
        title: "Visible matter",
        status: "open",
        actor_can_view: true,
      },
      {
        matter_id: "matter_g4c_silent",
        client_id: "party_silent",
        title: "Silent matter",
        status: "open",
        silent_matter: true,
        actor_can_view: false,
        hidden_from_actor: true,
      },
    ],
  });

  assert.equal(descriptor.outcome, "review_required");
  assert.deepEqual(
    descriptor.visible_matters.map((visibleMatter) => visibleMatter.matter_id),
    ["matter_g4c_visible"],
  );
  assert.equal(descriptor.omitted_matter_count_exposed, null);
  assert.equal(descriptor.omitted_silent_matter_count_exposed, null);
  assert.equal(descriptor.silent_matter_presence_leaked, false);
  assert.equal(descriptor.unauthorized_count_leaked, false);

  const blocked = createMatterSilentMatterVisibilityDescriptor({
    tenant_id,
    actor_id,
    matters: [],
    expose_unauthorized_counts: true,
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("silent_matter_unauthorized_count_leak_blocked"));
});

test("G4-C dashboard UI trims hidden fields and avoids unauthorized detail", () => {
  const descriptor = createMatterDashboardUiStateDescriptor({
    tenant_id,
    actor_id,
    selected_matter_id: "matter_g4c_hidden",
    matters: [
      {
        matter_id: "matter_g4c_visible",
        client_id: "party_visible",
        matter_number: "M-G4C-001",
        title: "Visible matter",
        status: "open",
        actor_can_view: true,
        conflict_memo: "Never show",
        raw_audit_event: { body: "internal" },
        silent_matter: false,
      },
      {
        matter_id: "matter_g4c_hidden",
        client_id: "party_hidden",
        title: "Hidden matter",
        status: "open",
        actor_can_view: false,
        hidden_from_actor: true,
        silent_matter: true,
      },
    ],
  });

  assert.equal(descriptor.outcome, "review_required");
  assert.equal(descriptor.visible_matter_cards.length, 1);
  assert.equal(descriptor.visible_matter_cards[0].matter_id, "matter_g4c_visible");
  assert.equal(descriptor.visible_matter_cards[0].conflict_memo, undefined);
  assert.ok(descriptor.visible_matter_cards[0].removed_fields.includes("conflict_memo"));
  assert.ok(descriptor.visible_matter_cards[0].removed_fields.includes("raw_audit_event"));
  assert.equal(descriptor.detail_panel.state, "not_found_or_not_authorized");
  assert.equal(descriptor.detail_panel.matter, null);
  assert.equal(descriptor.unauthorized_count_exposed, null);
  assert.equal(descriptor.dashboard_receipt.live_dom_rendered, false);
});

test("G4-C closeout descriptor summarizes Matter closeout UI evidence", () => {
  const closing = createMatterClosingChecklistDescriptor({
    tenant_id,
    actor_id,
    matter: matter({ status: "closing" }),
    checklist: checklist({ status: "completed" }),
    closing_metrics: clearClosingMetrics(),
  });
  const visibility = createMatterSilentMatterVisibilityDescriptor({
    tenant_id,
    actor_id,
    matters: [{ matter_id, title: "Visible", status: "closing", actor_can_view: true }],
  });
  const dashboard = createMatterDashboardUiStateDescriptor({
    tenant_id,
    actor_id,
    selected_matter_id: matter_id,
    matters: [{ matter_id, title: "Visible", status: "closing", actor_can_view: true }],
  });

  const closeout = createMatterG4CMatterCloseoutDescriptor({
    tenant_id,
    descriptors: [closing, visibility, dashboard],
  });

  assert.equal(closeout.outcome, "review_required");
  assert.deepEqual(closeout.tuw_coverage, [
    "LFOS-G4-W05-T011",
    "LFOS-G4-W05-T012",
    "LFOS-G4-W05-T013",
    "LFOS-G4-W05-T014",
  ]);
  assert.equal(closeout.matter_closing_checklist_tested, true);
  assert.equal(closeout.silent_matter_omission_tested, true);
  assert.equal(closeout.dashboard_acl_trimming_tested, true);
  assert.equal(closeout.matter_runtime_evidence_status, "descriptor_evidence_only");
  assert.equal(closeout.closeout_receipt.runtime_readiness_claim, "open");
});
