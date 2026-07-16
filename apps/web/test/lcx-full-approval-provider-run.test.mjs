import assert from "node:assert/strict";
import test from "node:test";
import {
  advanceExecutionRun,
  createApprovalRequest,
  createExecutionRun,
  decideApprovalRequest,
  evaluateProviderReceipt,
  projectConnectorReceipt
} from "../src/data/approvalProviderRunKernel.js";
import { assertNoForbiddenProjection } from "../src/data/readinessModel.js";

test("LCX-FULL approval decisions require human owner receipt fields", () => {
  const request = createApprovalRequest({
    actor_ref: "actor:operator",
    object_ref: "matter:alpha",
    reason_ref: "reason:owner-change",
    approval_scope: "matter-owner-change"
  });
  const agentAttempt = decideApprovalRequest(request, { action: "approve", inferred_by: "agent" });
  assert.equal(agentAttempt.transition_allowed, false);
  assert.equal(agentAttempt.blocked_reason, "human_owner_receipt_required");

  const approved = decideApprovalRequest(request, {
    action: "approve",
    decided_by_ref: "owner:managing-partner",
    owner_receipt_ref: "owner-receipt:approval-001"
  });
  assert.equal(approved.transition_allowed, true);
  assert.equal(approved.approval_state, "approved");
  assert.equal(approved.owner_approval_claim, "receipt_recorded_not_launch_approval");
  assert.equal(approved.audit_events.length, 2);
});

test("LCX-FULL provider receipts fail closed when missing expired sandbox or wrong-scope", () => {
  assert.equal(evaluateProviderReceipt({ requiredScope: "send" }).reason, "provider_receipt_missing");
  assert.equal(
    evaluateProviderReceipt({
      requiredScope: "send",
      receipt: { sandbox_receipt_ref: "sandbox:mail", scopes: ["send"], expires_at: "2999-01-01T00:00:00.000Z" }
    }).reason,
    "production_provider_receipt_required"
  );
  assert.equal(
    evaluateProviderReceipt({
      requiredScope: "send",
      receipt: {
        environment: "production",
        production_receipt_ref: "prod:mail",
        scopes: ["read"],
        expires_at: "2999-01-01T00:00:00.000Z"
      }
    }).reason,
    "provider_receipt_scope_missing"
  );
  assert.equal(
    evaluateProviderReceipt({
      requiredScope: "send",
      receipt: {
        environment: "production",
        production_receipt_ref: "prod:mail",
        scopes: ["send"],
        expires_at: "2001-01-01T00:00:00.000Z"
      }
    }).reason,
    "provider_receipt_expired"
  );
});

test("LCX-FULL provider receipt projection exposes no secrets", () => {
  const receipt = projectConnectorReceipt({
    environment: "production",
    production_receipt_ref: "prod:mail",
    provider_url: "https://provider.example.com",
    access_token: "Bearer secret",
    scopes: ["send"],
    expires_at: "2999-01-01T00:00:00.000Z"
  });
  assert.equal(assertNoForbiddenProjection(receipt).valid, true);
  assert.equal(receipt.private_material_included, false);
  assert.equal(receipt.provider_production_write_claim, false);
});

test("LCX-FULL run lifecycle blocks execute until approval provider and explicit synthetic execute are present", () => {
  const registry = new Map();
  const request = createApprovalRequest({ actor_ref: "actor:operator", object_ref: "matter:alpha", reason_ref: "reason:execute" });
  const approved = decideApprovalRequest(request, {
    action: "approve",
    decided_by_ref: "owner:managing-partner",
    owner_receipt_ref: "owner-receipt:run-001"
  });
  const run = createExecutionRun({
    execution_run_id: "run:001",
    idempotency_key_ref: "idem:001",
    safe_input: { provider_url: "https://provider.example.com/raw", value: "safe" }
  });
  const dryRun = advanceExecutionRun(run, { step: "dry_run" }, registry);
  assert.equal(dryRun.run_state, "dry_run_passed");
  assert.equal(assertNoForbiddenProjection(dryRun.safe_input_projection).valid, true);

  const blocked = advanceExecutionRun(dryRun, { step: "execute", approval: approved, required_provider_scope: "send" }, registry);
  assert.equal(blocked.run_state, "execute_blocked");
  assert.equal(blocked.mutation_count, 0);

  const executed = advanceExecutionRun(
    dryRun,
    {
      step: "execute",
      approval: approved,
      required_provider_scope: "send",
      allow_synthetic_execute: true,
      provider_receipt: {
        environment: "production",
        production_receipt_ref: "prod:send",
        scopes: ["send"],
        expires_at: "2999-01-01T00:00:00.000Z"
      }
    },
    registry
  );
  assert.equal(executed.run_state, "executed");
  assert.equal(executed.external_mutation_performed, false);
  const duplicate = advanceExecutionRun(executed, { step: "execute", approval: approved }, registry);
  assert.equal(duplicate.duplicate, true);
  assert.equal(duplicate.mutation_count, 1);
});
