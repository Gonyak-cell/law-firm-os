import { canonicalFinanceRequestFingerprint } from "../../packages/billing/src/finance-repository.js";
import {
  backfillPaymentMatchesAsAllocations,
  buildPaymentAllocationMigrationPlan,
} from "../../packages/payments/src/payment-allocation-migration.js";

const SYNTHETIC_TENANT_PATTERN = /^tenant-[a-z0-9-]+-synthetic$/u;
const LOCAL_RECEIPT_ENVELOPE_KEYS = new Set(["plan_hash", "current_plan_hash", "write_observation"]);

function requireSyntheticIdentity(value, field) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  const normalized = value.trim();
  if (field === "tenantId" && !SYNTHETIC_TENANT_PATTERN.test(normalized)) {
    throw new TypeError("local migration requires a synthetic tenant");
  }
  return normalized;
}

function assertSnapshot(snapshot) {
  if (!snapshot || !Array.isArray(snapshot.records) || !Array.isArray(snapshot.audit_events) || !Array.isArray(snapshot.idempotency)) {
    throw new TypeError("local migration requires an observable repository snapshot");
  }
  return snapshot;
}

function assertLocalRepository(repository) {
  if (!repository || typeof repository !== "object") throw new TypeError("local repository adapter is required");
  for (const method of ["list", "get", "getIdempotency", "transaction", "snapshot"]) {
    if (typeof repository[method] !== "function") {
      throw new TypeError(`local repository adapter must implement ${method}()`);
    }
  }
  assertSnapshot(repository.snapshot());
  return repository;
}

function writeState(repository) {
  const snapshot = assertSnapshot(repository.snapshot());
  return Object.freeze({
    payment_allocations: snapshot.records.filter((row) => row.model_type === "PaymentAllocation").length,
    audit_events: snapshot.audit_events.length,
    idempotency_entries: snapshot.idempotency.length,
  });
}

function writeObservation(before, after) {
  const counts = Object.fromEntries(Object.keys(before).map((key) => [key, after[key] - before[key]]));
  return Object.freeze({
    observed: true,
    ...counts,
    total: Object.values(counts).reduce((sum, count) => sum + count, 0),
  });
}

function planSummary(repository, tenantId, plan, planHash) {
  return Object.freeze({
    plan_hash: planHash,
    pending_backfill_count: plan.invoice_payment_backfill.length,
    matched_payment_count: plan.matched_payments.length,
    unallocated_payment_count: plan.unallocated_payments.length,
    payment_allocation_count: repository.list({ tenant_id: tenantId, model_type: "PaymentAllocation" }).length,
    auto_promoted_revenue_count: plan.auto_promoted_revenue_count,
    raw_values_returned: false,
  });
}

function receiptSummary(receipt, planHash, currentPlanHash, observation) {
  return Object.freeze({
    plan_hash: planHash,
    current_plan_hash: currentPlanHash,
    created_count: Number(receipt.created_count ?? 0),
    idempotent_replay: receipt.idempotent_replay === true,
    dry_run: receipt.dry_run === true,
    audit_event_recorded: Boolean(receipt.audit_event),
    unallocated_payment_count: Array.isArray(receipt.unallocated_payments)
      ? receipt.unallocated_payments.length
      : 0,
    auto_promoted_revenue_count: Number(receipt.auto_promoted_revenue_count ?? 0),
    raw_values_returned: false,
    write_observation: observation,
  });
}

function withoutEnvelope(receipt) {
  return Object.fromEntries(
    Object.entries(receipt).filter(([key]) => !LOCAL_RECEIPT_ENVELOPE_KEYS.has(key)),
  );
}

/**
 * Execute the local synthetic migration contract with no production imports.
 * This module intentionally has no Lambda, AWS, git, network, or environment
 * dependency. The repository must expose snapshots so write claims are real.
 */
export function runLocalDirectReceiptMigration({
  repository,
  tenantId,
  actorId = "actor-rfd-tuw-021-synthetic",
  idempotencyKey = "local-direct-receipt-migration",
} = {}) {
  assertLocalRepository(repository);
  const tenant = requireSyntheticIdentity(tenantId, "tenantId");
  const actor = requireSyntheticIdentity(actorId, "actorId");
  const key = requireSyntheticIdentity(idempotencyKey, "idempotencyKey");

  const dryPlan = buildPaymentAllocationMigrationPlan({ repository, tenant_id: tenant });
  const dryPlanHash = canonicalFinanceRequestFingerprint(dryPlan);
  const initialSummary = planSummary(repository, tenant, dryPlan, dryPlanHash);
  const beforeDryRun = writeState(repository);
  const dryReceipt = backfillPaymentMatchesAsAllocations({
    repository,
    tenant_id: tenant,
    plan_hash: dryPlanHash,
    dry_run: true,
  });
  const afterDryRun = writeState(repository);
  if (dryReceipt.plan_hash !== dryPlanHash) throw new Error("local migration dry-run plan hash mismatch");
  const dryRun = receiptSummary(dryReceipt, dryReceipt.plan_hash, dryReceipt.plan_hash, writeObservation(beforeDryRun, afterDryRun));

  const executePlan = buildPaymentAllocationMigrationPlan({ repository, tenant_id: tenant });
  const executePlanHash = canonicalFinanceRequestFingerprint(executePlan);
  if (executePlanHash !== dryPlanHash) throw new Error("local migration plan changed between dry-run and execute");
  const beforeExecute = writeState(repository);
  const executeReceipt = backfillPaymentMatchesAsAllocations({
    repository,
    tenant_id: tenant,
    actor_id: actor,
    idempotency_key: key,
    plan_hash: executePlanHash,
    dry_run: false,
  });
  const afterExecute = writeState(repository);
  if (executeReceipt.plan_hash !== executePlanHash) throw new Error("local migration execute plan hash mismatch");
  const execute = receiptSummary(
    executeReceipt,
    executeReceipt.plan_hash,
    executePlanHash,
    writeObservation(beforeExecute, afterExecute),
  );

  const replayCurrentPlan = buildPaymentAllocationMigrationPlan({ repository, tenant_id: tenant });
  const replayCurrentPlanHash = canonicalFinanceRequestFingerprint(replayCurrentPlan);
  const beforeReplay = writeState(repository);
  const replayReceipt = backfillPaymentMatchesAsAllocations({
    repository,
    tenant_id: tenant,
    actor_id: actor,
    idempotency_key: key,
    plan_hash: replayCurrentPlanHash,
    dry_run: false,
  });
  const afterReplay = writeState(repository);
  if (replayReceipt.plan_hash !== executePlanHash) throw new Error("local migration replay receipt plan hash mismatch");
  const replayReceiptEqual = JSON.stringify({ ...replayReceipt, idempotent_replay: false })
    === JSON.stringify(executeReceipt);
  if (!replayReceiptEqual) throw new Error("local migration replay receipt bytes changed");
  const replay = receiptSummary(
    replayReceipt,
    replayReceipt.plan_hash,
    replayCurrentPlanHash,
    writeObservation(beforeReplay, afterReplay),
  );
  if (JSON.stringify(withoutEnvelope(replay), null, 0) !== JSON.stringify({ ...withoutEnvelope(execute), idempotent_replay: true }, null, 0)) {
    throw new Error("local migration replay receipt is incomplete");
  }

  return Object.freeze({
    scenario: "local_synthetic",
    plan_hashes: Object.freeze({
      dry_run: dryRun.plan_hash,
      execute: execute.plan_hash,
      replay_receipt: replay.plan_hash,
      replay_current_state: replay.current_plan_hash,
    }),
    dry_run: dryRun,
    execute,
    replay,
    replay_receipt_equal: replayReceiptEqual,
    before: initialSummary,
    after: planSummary(repository, tenant, replayCurrentPlan, replayCurrentPlanHash),
    unmatched_bank_inflow: Object.freeze({
      unallocated_payment_count: dryPlan.unallocated_payments.length,
      auto_promoted_revenue_count: dryPlan.auto_promoted_revenue_count,
      raw_values_returned: false,
    }),
  });
}
