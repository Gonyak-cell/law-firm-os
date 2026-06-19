import assert from "node:assert/strict";
import test from "node:test";

import {
  createIntakeConflictMemoBoundaryDescriptor,
  createIntakeEngagementApprovalUiStateDescriptor,
  createIntakeG3CloseoutDescriptor,
  createIntakeWaiverApprovalUiStateDescriptor,
  INTAKE_G3E_CONFLICT_MEMO_HIDDEN_FIELDS,
} from "../src/index.js";

const tenant_id = "tenant_g3e_validator";
const actor_id = "actor_g3e_validator";

test("G3-E conflict memo boundary denies CRM user without leaking memo fields", () => {
  const descriptor = createIntakeConflictMemoBoundaryDescriptor({
    tenant_id,
    actor_id,
    actor_module: "crm",
    conflict_check_id: "conflict_check_g3e",
    source_payload: {
      conflict_memo_body: "must not leak",
      conflict_hit_detail: "must not leak",
      unauthorized_count: 7,
    },
  });

  assert.equal(descriptor.outcome, "denied");
  assert.equal(descriptor.customer_visible_memo, null);
  assert.equal(descriptor.safe_error_code, "INTAKE_CONFLICT_MEMO_DENIED");
  assert.ok(descriptor.blocked_claims.includes("crm_user_conflict_memo_denied"));
  assert.equal(descriptor.leak_guard.unauthorized_count_visible, false);
  assert.equal(descriptor.leak_guard.source_payload_contains_hidden_fields, true);
  assert.deepEqual(INTAKE_G3E_CONFLICT_MEMO_HIDDEN_FIELDS, [
    "conflict_memo_body",
    "conflict_hit_detail",
    "waiver_document_body",
    "raw_permission_decision",
    "audit_event_body",
    "unauthorized_count",
  ]);
});

test("G3-E waiver approval UI handles denied and review-required states", () => {
  const waiver = {
    waiver_id: "waiver_g3e",
    tenant_id,
    approval_state: "review_required",
  };
  const denied = createIntakeWaiverApprovalUiStateDescriptor({
    tenant_id,
    actor_id,
    waiver,
    permission_outcome: "denied",
  });

  assert.equal(denied.ui_state, "denied");
  assert.equal(denied.customer_visible_waiver, null);
  assert.ok(denied.blocked_claims.includes("waiver_ui_denied_state"));

  const review = createIntakeWaiverApprovalUiStateDescriptor({
    tenant_id,
    actor_id,
    waiver,
    permission_outcome: "review_required",
  });

  assert.equal(review.ui_state, "review_required");
  assert.equal(review.customer_visible_waiver.consent_document_visible, false);
  assert.equal(review.leak_guard.unauthorized_count_visible, false);
  assert.ok(review.review_required_claims.includes("waiver_ui_review_required_state"));
});

test("G3-E engagement approval UI exposes signed and approved states without raw documents", () => {
  const approved = createIntakeEngagementApprovalUiStateDescriptor({
    tenant_id,
    actor_id,
    engagement: {
      engagement_id: "engagement_g3e_approved",
      tenant_id,
      legal_client_party_id: "party_g3e_client",
      approval_state: "approved",
    },
  });

  assert.equal(approved.outcome, "review_required");
  assert.equal(approved.customer_visible_engagement.approved_state_visible, true);
  assert.equal(approved.customer_visible_engagement.signed_state_visible, false);
  assert.equal(approved.leak_guard.signed_document_body_visible, false);

  const signed = createIntakeEngagementApprovalUiStateDescriptor({
    tenant_id,
    actor_id,
    engagement: {
      engagement_id: "engagement_g3e_signed",
      tenant_id,
      legal_client_party_id: "party_g3e_client",
      approval_state: "signed",
    },
  });

  assert.equal(signed.outcome, "review_required");
  assert.equal(signed.customer_visible_engagement.approved_state_visible, true);
  assert.equal(signed.customer_visible_engagement.signed_state_visible, true);
  assert.ok(signed.review_required_claims.includes("engagement_ui_signed_or_approved_state"));
});

test("G3-E closeout records evidence and blocks Opportunity-to-Matter bypass", () => {
  const descriptor = createIntakeG3CloseoutDescriptor({
    crm_evidence: ["G3-A/G3-B CRM evidence"],
    intake_schema_evidence: ["G3-C schema evidence"],
    workflow_evidence: ["G3-D workflow evidence"],
    ui_boundary_evidence: ["conflict memo, waiver, engagement UI evidence"],
    command_evidence: ["npm run client-matter:g3e:validate"],
    pr_state: {
      branch: "codex/lawos-g3-intake-ui-closeout",
      base_branch: "codex/lawos-g3-conflict-engagement-workflow",
      draft: true,
      clean: true,
      merge_authority: "human_only",
    },
    g1_g2_evidence_disposition: "draft_stack_pending_human_review",
    human_review_disposition: "pending",
  });

  assert.equal(descriptor.outcome, "review_required");
  assert.equal(descriptor.missing_evidence.length, 0);
  assert.equal(descriptor.opportunity_to_matter_shortcut_prohibited, true);
  assert.equal(descriptor.intake_evidence_required_for_matter_opening, true);
  assert.equal(descriptor.creates_matter, false);
  assert.equal(descriptor.g3_runtime_readiness_claim, "open");

  const blocked = createIntakeG3CloseoutDescriptor({
    crm_evidence: ["G3-A/G3-B CRM evidence"],
    intake_schema_evidence: ["G3-C schema evidence"],
    workflow_evidence: ["G3-D workflow evidence"],
    ui_boundary_evidence: ["G3-E UI evidence"],
    command_evidence: ["npm run client-matter:g3e:validate"],
    pr_state: { draft: true, merge_authority: "human_only" },
    g1_g2_evidence_disposition: "draft_stack_pending_human_review",
    human_review_disposition: "pending",
    opportunity_to_matter_bypass_attempt: true,
    create_matter: true,
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("opportunity_cannot_bypass_intake"));
});
