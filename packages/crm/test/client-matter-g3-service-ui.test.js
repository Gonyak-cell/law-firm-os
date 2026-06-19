import assert from "node:assert/strict";
import test from "node:test";

import {
  createCrmActivityPermissionTrimDescriptor,
  createCrmCoreCRMActivity,
  createCrmCoreOpportunity,
  createCrmG3PartialCloseoutDescriptor,
  createCrmKeyClientPlanUiStateDescriptor,
  createCrmOpportunityPipelineDescriptor,
  createCrmOpportunityToIntakeCommandDescriptor,
  createCrmSummaryUiStateDescriptor,
} from "../src/index.js";

const tenant_id = "tenant_g3b_validator";
const actor_id = "actor_g3b_validator";
const owner_user_id = "user_g3b_owner";
const party_id = "party_g3b_client";

function opportunity(overrides = {}) {
  return createCrmCoreOpportunity({
    opportunity_id: "opp_g3b_schema",
    tenant_id,
    party_id,
    display_name: "AMIC G3-B Opportunity",
    stage: "qualified",
    status: "active",
    owner_user_id,
    ...overrides,
  });
}

test("G3-B Opportunity pipeline descriptor accepts valid stage transition without writes", () => {
  const descriptor = createCrmOpportunityPipelineDescriptor({
    tenant_id,
    actor_id,
    opportunity: opportunity(),
    requested_stage: "intake_requested",
  });

  assert.equal(descriptor.route, "/crm/opportunities");
  assert.equal(descriptor.stage_transition.from, "qualified");
  assert.equal(descriptor.stage_transition.to, "intake_requested");
  assert.equal(descriptor.stage_transition.executed, false);
  assert.equal(descriptor.outcome, "review_required");
  assert.equal(descriptor.writes_product_state, false);
  assert.equal(descriptor.g3_runtime_readiness_claim, "open");
});

test("G3-B Opportunity pipeline blocks invalid stage and Matter shortcut", () => {
  const descriptor = createCrmOpportunityPipelineDescriptor({
    tenant_id,
    actor_id,
    opportunity: opportunity(),
    requested_stage: "closed_won",
    matter_id: "matter_should_not_exist",
  });

  assert.equal(descriptor.outcome, "blocked");
  assert.ok(descriptor.blocked_claims.includes("opportunity_stage_transition_invalid"));
  assert.ok(descriptor.blocked_claims.includes("opportunity_to_matter_shortcut_blocked"));
  assert.equal(descriptor.customer_safe_response.safe_error_code, "CRM_OPPORTUNITY_STAGE_TRANSITION_BLOCKED");
});

test("G3-B confidential CRM activity is trimmed for denied actor", () => {
  const activity = createCrmCoreCRMActivity({
    crm_activity_id: "activity_g3b_confidential",
    tenant_id,
    party_id,
    opportunity_id: "opp_g3b_schema",
    activity_type: "meeting",
    subject: "Confidential development meeting",
    confidential: true,
    status: "active",
    owner_user_id,
  });

  const descriptor = createCrmActivityPermissionTrimDescriptor({
    tenant_id,
    actor_id,
    activity,
    permission_outcome: "denied",
  });

  assert.equal(descriptor.outcome, "denied");
  assert.equal(descriptor.customer_visible_activity, null);
  assert.equal(descriptor.safe_error_code, "CRM_ACTIVITY_CONFIDENTIAL_DENIED");
  assert.ok(descriptor.blocked_claims.includes("confidential_crm_activity_denied"));
  assert.equal(JSON.stringify(descriptor.customer_visible_activity).includes("permission_ref"), false);
});

test("G3-B CRM summary hides conflict memo and billing detail fields", () => {
  const descriptor = createCrmSummaryUiStateDescriptor({
    tenant_id,
    actor_id,
    party: {
      party_id,
      display_name: "AMIC Client",
      party_type: "organization",
      status: "active",
    },
    opportunities: [opportunity()],
    source_payload: {
      conflict_memo: "must not leak",
      billing_detail: "must not leak",
    },
  });

  const visible = JSON.stringify(descriptor.customer_visible_summary);
  assert.equal(descriptor.renders_ui, false);
  assert.equal(descriptor.customer_visible_summary.conflict_details_visible, false);
  assert.equal(descriptor.customer_visible_summary.finance_details_visible, false);
  assert.equal(visible.includes("conflict_memo"), false);
  assert.equal(visible.includes("billing_detail"), false);
});

test("G3-B Opportunity-to-Intake command blocks Matter creation", () => {
  const descriptor = createCrmOpportunityToIntakeCommandDescriptor({
    tenant_id,
    actor_id,
    opportunity_id: "opp_g3b_schema",
    party_id,
    intake_request_id: "intake_g3b_schema",
  });

  assert.equal(descriptor.outcome, "review_required");
  assert.equal(descriptor.allowed_conversion_target, "IntakeRequest");
  assert.equal(descriptor.command_receipt.creates_matter, false);
  assert.equal(descriptor.matter_id, null);

  const blocked = createCrmOpportunityToIntakeCommandDescriptor({
    tenant_id,
    actor_id,
    opportunity_id: "opp_g3b_schema",
    party_id,
    intake_request_id: "intake_g3b_schema",
    create_matter: true,
  });
  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("opportunity_to_matter_shortcut_blocked"));
});

test("G3-B key client plan masks AR and billing detail", () => {
  const descriptor = createCrmKeyClientPlanUiStateDescriptor({
    tenant_id,
    actor_id,
    party: {
      party_id,
      display_name: "AMIC Key Client",
      party_type: "organization",
      status: "active",
    },
    opportunities: [opportunity({ opportunity_id: "opp_g3b_key_client" })],
    relationship_owner_user_id: owner_user_id,
    next_best_action: "Schedule relationship review",
    source_payload: {
      ar_balance: 500000,
      invoice_detail: "must not leak",
    },
  });

  const visible = JSON.stringify(descriptor);
  assert.equal(descriptor.masked_finance_summary.ar_balance, "masked");
  assert.equal(descriptor.masked_finance_summary.invoice_detail_visible, false);
  assert.equal(descriptor.leak_guard.customer_visible_plan_contains_finance_detail, false);
  assert.equal(visible.includes("500000"), false);
  assert.ok(descriptor.review_required_claims.includes("key_client_plan_finance_detail_mask_required"));
});

test("G3-B partial closeout records CRM evidence and keeps readiness open", () => {
  const closeout = createCrmG3PartialCloseoutDescriptor({
    pipeline_evidence: ["npm run client-matter:g3b:validate"],
    permission_trim_evidence: ["confidential activity denied test"],
    summary_ui_evidence: ["no conflict memo or billing detail leak test"],
    opportunity_to_intake_evidence: ["Opportunity-to-Intake only command evidence"],
    key_client_plan_evidence: ["AR/detail masking test"],
    command_evidence: ["npm --workspace @law-firm-os/crm run test"],
    pr_state: {
      branch: "codex/lawos-g3-crm-service-ui-closeout",
      base_branch: "codex/lawos-g3-crm-schema",
      draft: true,
      clean: true,
      merge_authority: "human_only",
    },
    g1_g2_evidence_disposition: "draft_stack_pending_human_review",
    human_review_disposition: "pending",
  });

  assert.equal(closeout.g3_crm_descriptor, "crm_g3_partial_closeout_descriptor");
  assert.equal(closeout.outcome, "review_required");
  assert.equal(closeout.missing_evidence.length, 0);
  assert.equal(closeout.opportunity_to_intake_only_evidence, true);
  assert.equal(closeout.opportunity_to_matter_shortcut_prohibited, true);
  assert.equal(closeout.g3_runtime_readiness_claim, "open");

  const blocked = createCrmG3PartialCloseoutDescriptor({
    pr_state: { draft: true, merge_authority: "human_only" },
  });
  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("g3_crm_partial_closeout_evidence_missing"));
});
