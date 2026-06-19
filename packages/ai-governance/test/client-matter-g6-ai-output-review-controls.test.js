import assert from "node:assert/strict";
import test from "node:test";

import {
  AI_GOVERNANCE_G6D_TUW_COVERAGE,
  createAiGovernanceG6AIOutputDescriptor,
  createAiGovernanceG6CitationDescriptor,
  createAiGovernanceG6DAIOutputReviewCloseoutDescriptor,
  createAiGovernanceG6DisableSwitchDescriptor,
  createAiGovernanceG6HumanReviewQueueDescriptor,
} from "../src/index.js";

const tenant_id = "tenant_g6d_validator";
const matter_id = "matter_g6d";
const actor_id = "actor_g6d";
const ai_output_id = "ai_output_g6d";

function aiOutput(overrides = {}) {
  return {
    ai_output_id,
    tenant_id,
    matter_id,
    actor_id,
    prompt_log_id: "prompt_g6d",
    retrieval_request_id: "retrieval_g6d",
    state: "candidate",
    ...overrides,
  };
}

function citation(overrides = {}) {
  return {
    tenant_id,
    matter_id,
    document_id: "doc_g6d",
    span_ref: "p3:12-14",
    permission_inherited: true,
    privilege_label_inherited: true,
    ...overrides,
  };
}

function reviewAction(overrides = {}) {
  return {
    tenant_id,
    matter_id,
    reviewer_id: "reviewer_g6d",
    action: "confirm",
    audit_receipt_id: "audit_g6d",
    ...overrides,
  };
}

test("G6-D AIOutput descriptor requires candidate default state", () => {
  const descriptor = createAiGovernanceG6AIOutputDescriptor({
    tenant_id,
    matter_id,
    actor_id,
    ai_output: aiOutput(),
  });

  assert.equal(descriptor.outcome, "review_required");
  assert.equal(descriptor.ai_output_receipt.candidate_default_state_tested, true);
  assert.equal(descriptor.ai_output_receipt.ai_output_persisted, false);

  const blocked = createAiGovernanceG6AIOutputDescriptor({
    tenant_id,
    matter_id,
    actor_id,
    ai_output: aiOutput({ state: "confirmed", final_state_requested: true, dispatched_runtime: true }),
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("ai_output_candidate_default_state_required"));
  assert.ok(blocked.blocked_claims.includes("ai_output_final_state_blocked"));
  assert.ok(blocked.blocked_claims.includes("ai_output_runtime_dispatch_blocked"));
});

test("G6-D Citation descriptor requires citations before confirm", () => {
  const descriptor = createAiGovernanceG6CitationDescriptor({
    tenant_id,
    matter_id,
    ai_output_id,
    citations: [citation()],
    confirm_requested: true,
  });

  assert.equal(descriptor.outcome, "review_required");
  assert.equal(descriptor.citation_receipt.citation_required_for_confirm_tested, true);
  assert.equal(descriptor.citation_receipt.acl_privilege_inheritance_tested, true);

  const blocked = createAiGovernanceG6CitationDescriptor({
    tenant_id,
    matter_id,
    ai_output_id,
    citations: [citation({ span_ref: "", permission_inherited: false })],
    confirm_requested: true,
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("citation_source_span_required"));
  assert.ok(blocked.blocked_claims.includes("citation_acl_privilege_inheritance_required"));

  const missing = createAiGovernanceG6CitationDescriptor({
    tenant_id,
    matter_id,
    ai_output_id,
    citations: [],
    confirm_requested: true,
  });
  assert.ok(missing.blocked_claims.includes("citation_required_for_confirm"));
});

test("G6-D HumanReviewQueue descriptor requires confirm/reject audit evidence", () => {
  const descriptor = createAiGovernanceG6HumanReviewQueueDescriptor({
    tenant_id,
    matter_id,
    ai_output_id,
    review_actions: [reviewAction(), reviewAction({ action: "reject", audit_receipt_id: "audit_reject_g6d" })],
  });

  assert.equal(descriptor.outcome, "review_required");
  assert.equal(descriptor.human_review_receipt.confirm_reject_audit_tested, true);
  assert.equal(descriptor.human_review_receipt.review_queue_persisted, false);

  const blocked = createAiGovernanceG6HumanReviewQueueDescriptor({
    tenant_id,
    matter_id,
    ai_output_id,
    review_actions: [reviewAction({ action: "approve", audit_receipt_id: "" })],
    direct_final_approval: true,
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("human_review_confirm_reject_audit_required"));
  assert.ok(blocked.blocked_claims.includes("human_review_direct_final_approval_blocked"));
});

test("G6-D DisableSwitch descriptor requires dark launch off evidence", () => {
  const descriptor = createAiGovernanceG6DisableSwitchDescriptor({
    tenant_id,
    switch_state: {
      tenant_id,
      switch_id: "switch_g6d",
      dark_launch_enabled: false,
      ai_disabled: true,
    },
  });

  assert.equal(descriptor.outcome, "review_required");
  assert.equal(descriptor.disable_switch_receipt.dark_launch_off_tested, true);
  assert.equal(descriptor.disable_switch_receipt.ai_disabled_tested, true);

  const blocked = createAiGovernanceG6DisableSwitchDescriptor({
    tenant_id,
    switch_state: {
      tenant_id,
      switch_id: "switch_g6d",
      dark_launch_enabled: true,
      ai_disabled: false,
      dispatched_runtime: true,
    },
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("ai_disable_switch_dark_launch_off_required"));
  assert.ok(blocked.blocked_claims.includes("ai_disable_switch_runtime_dispatch_blocked"));
});

test("G6-D closeout descriptor summarizes AI output review controls", () => {
  const output = createAiGovernanceG6AIOutputDescriptor({ tenant_id, matter_id, actor_id, ai_output: aiOutput() });
  const citationDescriptor = createAiGovernanceG6CitationDescriptor({
    tenant_id,
    matter_id,
    ai_output_id,
    citations: [citation()],
    confirm_requested: true,
  });
  const review = createAiGovernanceG6HumanReviewQueueDescriptor({
    tenant_id,
    matter_id,
    ai_output_id,
    review_actions: [reviewAction(), reviewAction({ action: "reject", audit_receipt_id: "audit_reject_g6d" })],
  });
  const disable = createAiGovernanceG6DisableSwitchDescriptor({
    tenant_id,
    switch_state: { tenant_id, switch_id: "switch_g6d", dark_launch_enabled: false, ai_disabled: true },
  });

  const closeout = createAiGovernanceG6DAIOutputReviewCloseoutDescriptor({
    tenant_id,
    descriptors: [output, citationDescriptor, review, disable],
    policy_retrieval_audit_closed: true,
  });

  assert.equal(closeout.outcome, "review_required");
  assert.equal(closeout.tuw_coverage.length, 4);
  assert.equal(closeout.candidate_default_state_tested, true);
  assert.equal(closeout.citation_required_for_confirm_tested, true);
  assert.equal(closeout.confirm_reject_audit_tested, true);
  assert.equal(closeout.dark_launch_off_tested, true);
  assert.equal(closeout.closeout_receipt.runtime_readiness_claim, "open");
  assert.equal(AI_GOVERNANCE_G6D_TUW_COVERAGE.length, 4);
});
