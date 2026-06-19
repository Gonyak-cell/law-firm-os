import assert from "node:assert/strict";
import test from "node:test";

import {
  AI_LEGAL_WORKFLOWS_G6E_TUW_COVERAGE,
  createAiLegalWorkflowsG6AIOutputExportDescriptor,
  createAiLegalWorkflowsG6ELegalWorkflowsCloseoutDescriptor,
  createAiLegalWorkflowsG6LegalWorkflowModelDescriptor,
  createAiLegalWorkflowsG6WorkflowBuilderUIDescriptor,
} from "../src/index.js";

const tenant_id = "tenant_g6e_validator";
const matter_id = "matter_g6e";
const workflow_id = "workflow_g6e";
const ai_output_id = "ai_output_g6e";

function legalWorkflow(overrides = {}) {
  return {
    tenant_id,
    matter_id,
    workflow_id,
    steps: [
      { step_id: "draft", type: "draft" },
      { step_id: "partner_review", type: "human_approval", requires_human_approval: true },
    ],
    ...overrides,
  };
}

function builderConfig(overrides = {}) {
  return {
    human_approval_step_locked: true,
    allows_auto_final_legal_decision: false,
    steps: [{ step_id: "partner_review", type: "human_approval", requires_human_approval: true }],
    ...overrides,
  };
}

function aiOutput(overrides = {}) {
  return {
    tenant_id,
    matter_id,
    ai_output_id,
    privilege_label: "attorney_client_privileged",
    ...overrides,
  };
}

function exportRequest(overrides = {}) {
  return {
    export_request_id: "export_g6e",
    privilege_label_inherited: true,
    dms_acl_inherited: true,
    permission_inherited: true,
    external_share_boundary_checked: true,
    ...overrides,
  };
}

test("G6-E legal workflow model requires a human approval step", () => {
  const descriptor = createAiLegalWorkflowsG6LegalWorkflowModelDescriptor({
    tenant_id,
    matter_id,
    legal_workflow: legalWorkflow(),
  });

  assert.equal(descriptor.outcome, "review_required");
  assert.equal(descriptor.legal_workflow_receipt.human_approval_step_tested, true);
  assert.equal(descriptor.legal_workflow_receipt.workflow_model_persisted, false);

  const blocked = createAiLegalWorkflowsG6LegalWorkflowModelDescriptor({
    tenant_id,
    matter_id,
    legal_workflow: legalWorkflow({
      steps: [{ step_id: "auto_final", action: "final_legal_decision", auto_final_legal_decision: true }],
      dispatched_runtime: true,
    }),
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("legal_workflow_human_approval_step_required"));
  assert.ok(blocked.blocked_claims.includes("legal_workflow_auto_final_legal_decision_blocked"));
  assert.ok(blocked.blocked_claims.includes("legal_workflow_runtime_dispatch_blocked"));
});

test("G6-E workflow builder UI blocks auto-final legal decisions", () => {
  const descriptor = createAiLegalWorkflowsG6WorkflowBuilderUIDescriptor({
    tenant_id,
    matter_id,
    workflow_id,
    builder_config: builderConfig(),
  });

  assert.equal(descriptor.outcome, "review_required");
  assert.equal(descriptor.workflow_builder_receipt.human_approval_step_locked, true);
  assert.equal(descriptor.workflow_builder_receipt.no_auto_final_legal_decision_tested, true);

  const blocked = createAiLegalWorkflowsG6WorkflowBuilderUIDescriptor({
    tenant_id,
    matter_id,
    workflow_id,
    builder_config: builderConfig({
      human_approval_step_locked: false,
      allows_auto_final_legal_decision: true,
      executes_ui_runtime: true,
      steps: [],
    }),
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("workflow_builder_human_approval_lock_required"));
  assert.ok(blocked.blocked_claims.includes("workflow_builder_no_auto_final_legal_decision_required"));
  assert.ok(blocked.blocked_claims.includes("workflow_builder_runtime_ui_execution_blocked"));
});

test("G6-E AI output export inherits privilege labels and ACLs", () => {
  const descriptor = createAiLegalWorkflowsG6AIOutputExportDescriptor({
    tenant_id,
    matter_id,
    ai_output_id,
    ai_output: aiOutput(),
    export_request: exportRequest(),
  });

  assert.equal(descriptor.outcome, "review_required");
  assert.equal(descriptor.ai_output_export_receipt.privilege_label_inheritance_tested, true);
  assert.equal(descriptor.ai_output_export_receipt.acl_inheritance_tested, true);
  assert.equal(descriptor.ai_output_export_receipt.export_persisted, false);

  const blocked = createAiLegalWorkflowsG6AIOutputExportDescriptor({
    tenant_id,
    matter_id,
    ai_output_id,
    ai_output: aiOutput({ privilege_label: undefined }),
    export_request: exportRequest({
      privilege_label_inherited: false,
      dms_acl_inherited: false,
      permission_inherited: false,
      external_share_boundary_checked: false,
      bypasses_acl: true,
    }),
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("ai_output_export_privilege_label_inheritance_required"));
  assert.ok(blocked.blocked_claims.includes("ai_output_export_acl_inheritance_required"));
  assert.ok(blocked.blocked_claims.includes("ai_output_export_acl_bypass_blocked"));
});

test("G6-E closeout descriptor summarizes AI legal workflow controls", () => {
  const workflow = createAiLegalWorkflowsG6LegalWorkflowModelDescriptor({
    tenant_id,
    matter_id,
    legal_workflow: legalWorkflow(),
  });
  const builder = createAiLegalWorkflowsG6WorkflowBuilderUIDescriptor({
    tenant_id,
    matter_id,
    workflow_id,
    builder_config: builderConfig(),
  });
  const outputExport = createAiLegalWorkflowsG6AIOutputExportDescriptor({
    tenant_id,
    matter_id,
    ai_output_id,
    ai_output: aiOutput(),
    export_request: exportRequest(),
  });

  const closeout = createAiLegalWorkflowsG6ELegalWorkflowsCloseoutDescriptor({
    tenant_id,
    descriptors: [workflow, builder, outputExport, { tuw_id: "LFOS-G6-W10-T012", outcome: "review_required" }],
    ai_output_review_closed: true,
  });

  assert.equal(closeout.outcome, "review_required");
  assert.equal(closeout.tuw_coverage.length, 4);
  assert.equal(closeout.human_approval_step_tested, true);
  assert.equal(closeout.no_auto_final_legal_decision_tested, true);
  assert.equal(closeout.privilege_label_inheritance_tested, true);
  assert.equal(closeout.ai_acl_bypass_blocked, true);
  assert.equal(closeout.closeout_receipt.runtime_readiness_claim, "open");
  assert.equal(AI_LEGAL_WORKFLOWS_G6E_TUW_COVERAGE.length, 4);
});
