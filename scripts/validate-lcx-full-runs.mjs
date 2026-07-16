#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  advanceExecutionRun,
  createApprovalRequest,
  createExecutionRun,
  decideApprovalRequest
} from "../apps/web/src/data/approvalProviderRunKernel.js";
import { assertNoForbiddenProjection } from "../apps/web/src/data/readinessModel.js";
import {
  RUN_RECEIPT_MD_PATH,
  RUN_RECEIPT_PATH,
  markdownTable,
  readJson,
  writeJson,
  writeText
} from "./lcx-full-helpers.mjs";

const packageJson = readJson("package.json");
assert.equal(packageJson.scripts?.["lcx:full:runs:validate"], "node scripts/validate-lcx-full-runs.mjs");

const registry = new Map();
const request = createApprovalRequest({ actor_ref: "actor:run-validator", object_ref: "matter:run-validator", reason_ref: "reason:execute" });
const approved = decideApprovalRequest(request, {
  action: "approve",
  decided_by_ref: "owner:run-validator",
  owner_receipt_ref: "owner-receipt:run-validator"
});
const run = createExecutionRun({
  execution_run_id: "run:validator",
  idempotency_key_ref: "idem:validator",
  safe_input: { provider_url: "https://provider.example.com/raw", storage_pointer: "s3://bucket/raw", value: "safe" }
});
const dryRun = advanceExecutionRun(run, { step: "dry_run" }, registry);
const blocked = advanceExecutionRun(dryRun, { step: "execute", approval: approved, required_provider_scope: "send" }, registry);
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
const duplicate = advanceExecutionRun(executed, { step: "execute", approval: approved }, registry);
const rollback = advanceExecutionRun(blocked, { step: "rollback", safe_error_code: "provider_receipt_missing" }, registry);

assert.equal(run.run_state, "not_started");
assert.equal(assertNoForbiddenProjection(run.safe_input_projection).valid, true);
assert.equal(dryRun.run_state, "dry_run_passed");
assert.equal(blocked.run_state, "execute_blocked");
assert.equal(blocked.mutation_count, 0);
assert.equal(executed.run_state, "executed");
assert.equal(executed.external_mutation_performed, false);
assert.equal(duplicate.duplicate, true);
assert.equal(rollback.run_state, "rolled_back");
assert.equal(rollback.rollback_report.safe_error_code, "provider_receipt_missing");

const receipt = {
  schema_version: "law-firm-os.lazycodex.lcx_full.run_receipt.v0.1",
  generated_at: new Date().toISOString(),
  tuw_ids: ["LCX-FULL-05.01", "LCX-FULL-05.02", "LCX-FULL-05.03", "LCX-FULL-05.04", "LCX-FULL-05.05"],
  verdict: "PASS",
  states: [run.run_state, dryRun.run_state, blocked.run_state, executed.run_state, rollback.run_state],
  duplicate_blocked: duplicate.blocked_reason,
  safe_input_hash: run.safe_input_hash,
  audit_event_count: dryRun.audit_events.length + blocked.audit_events.length + executed.audit_events.length + rollback.audit_events.length,
  boundary: {
    external_mutation_ready_claim: false,
    external_mutation_performed: false,
    production_go_live_claim: false,
    public_release_claim: false
  }
};

writeJson(RUN_RECEIPT_PATH, receipt);
writeText(
  RUN_RECEIPT_MD_PATH,
  [
    "# LCX-FULL-05 Run Receipt",
    "",
    `Generated at: ${receipt.generated_at}`,
    "",
    "Verdict: PASS",
    "",
    markdownTable([
      { Step: "create", State: run.run_state },
      { Step: "dry-run", State: dryRun.run_state },
      { Step: "execute without provider", State: blocked.run_state },
      { Step: "synthetic execute", State: executed.run_state },
      { Step: "duplicate", State: duplicate.blocked_reason },
      { Step: "rollback", State: rollback.run_state }
    ], ["Step", "State"]),
    "",
    "## Boundary",
    "",
    "- Duplicate execute is blocked by idempotency key.",
    "- Safe snapshots are redacted and hashed.",
    "- Synthetic execution does not perform external mutation or claim production readiness."
  ].join("\n") + "\n"
);

console.log(JSON.stringify({ verdict: "PASS", receipt: RUN_RECEIPT_PATH, states: receipt.states }, null, 2));
