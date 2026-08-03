import { appendFinanceAuditEvent } from "../../billing/src/finance-audit.js";
import { canonicalFinanceRequestFingerprint } from "../../billing/src/finance-repository.js";

const EXCLUDED_STATUSES = new Set(["cancelled", "canceled", "void", "rejected", "deleted"]);

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function optionalString(value) {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

export function buildPaymentAllocationMigrationPlan({ repository, tenant_id } = {}) {
  const tenantId = requiredString({ tenant_id }, "tenant_id");
  const payments = repository.list({ tenant_id: tenantId, model_type: "Payment" });
  const matches = repository
    .list({ tenant_id: tenantId, model_type: "PaymentMatch" })
    .filter((row) => !EXCLUDED_STATUSES.has(String(row.status ?? "").toLowerCase()));
  const allocations = repository.list({ tenant_id: tenantId, model_type: "PaymentAllocation" });
  const representedMatches = new Set(allocations.map((row) => optionalString(row.source_payment_match_id)).filter(Boolean));
  const matchesByPayment = new Map();
  for (const match of matches) {
    const rows = matchesByPayment.get(match.payment_id) ?? [];
    rows.push(match);
    matchesByPayment.set(match.payment_id, rows);
  }
  const invoicePaymentBackfill = matches
    .filter((match) => !representedMatches.has(match.payment_match_id))
    .map((match) => ({
      payment_allocation_id: `allocation:${match.payment_match_id}`,
      tenant_id: tenantId,
      payment_id: match.payment_id,
      invoice_id: match.invoice_id,
      allocation_type: "invoice_payment",
      amount: Number(match.amount ?? match.matched_amount ?? 0),
      currency: match.currency ?? null,
      matter_id: match.matter_id ?? null,
      allocated_at: match.matched_at ?? match.created_at ?? null,
      source_payment_match_id: match.payment_match_id,
    }))
    .sort((left, right) => left.payment_allocation_id.localeCompare(right.payment_allocation_id));
  const matchedPayments = payments
    .filter((row) => matchesByPayment.has(row.payment_id))
    .map((row) => ({
      payment_id: row.payment_id,
      payment_amount: Number(row.amount ?? 0),
      matched_amount: matchesByPayment.get(row.payment_id).reduce((total, match) => total + Number(match.amount ?? match.matched_amount ?? 0), 0),
    }))
    .sort((left, right) => left.payment_id.localeCompare(right.payment_id));
  const allocatedPaymentIds = new Set(allocations.map((row) => row.payment_id));
  const unallocatedPayments = payments
    .filter((row) => !matchesByPayment.has(row.payment_id) && !allocatedPaymentIds.has(row.payment_id))
    .map((row) => ({ payment_id: row.payment_id, amount: Number(row.amount ?? 0), currency: row.currency ?? null }))
    .sort((left, right) => left.payment_id.localeCompare(right.payment_id));
  return Object.freeze({
    tenant_id: tenantId,
    invoice_payment_backfill: Object.freeze(invoicePaymentBackfill),
    matched_payments: Object.freeze(matchedPayments),
    unallocated_payments: Object.freeze(unallocatedPayments),
    auto_promoted_revenue_count: 0,
    dry_run: true,
  });
}

export function backfillPaymentMatchesAsAllocations({
  repository,
  tenant_id,
  actor_id,
  idempotency_key,
  plan_hash = null,
  dry_run = true,
} = {}) {
  const tenantId = requiredString({ tenant_id }, "tenant_id");
  const plan = buildPaymentAllocationMigrationPlan({ repository, tenant_id: tenantId });
  const computedPlanHash = canonicalFinanceRequestFingerprint(plan);
  if (plan_hash !== null) {
    if (typeof plan_hash !== "string" || !/^[a-f0-9]{64}$/u.test(plan_hash)) {
      throw new TypeError("plan_hash must be a SHA-256 hex digest");
    }
    if (plan_hash !== computedPlanHash) throw new Error("payment allocation migration plan hash mismatch");
  }
  if (dry_run) return plan_hash === null ? plan : Object.freeze({ ...plan, plan_hash: computedPlanHash });
  const actorId = requiredString({ actor_id }, "actor_id");
  const idempotencyKey = requiredString({ idempotency_key }, "idempotency_key");
  const replay = repository.getIdempotency({ tenant_id: tenantId, idempotency_key: idempotencyKey });
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });
  return repository.transaction((tx) => {
    const created = [];
    for (const candidate of plan.invoice_payment_backfill) {
      const match = tx.get({
        tenant_id: tenantId,
        model_type: "PaymentMatch",
        payment_match_id: candidate.source_payment_match_id,
      });
      const payment = tx.get({ tenant_id: tenantId, model_type: "Payment", payment_id: candidate.payment_id });
      const invoice = tx.get({ tenant_id: tenantId, model_type: "Invoice", invoice_id: candidate.invoice_id });
      if (!match || !payment || !invoice) throw new Error("PaymentMatch backfill requires Payment and Invoice");
      if (payment.currency !== invoice.currency) throw new Error("PaymentMatch backfill currency mismatch");
      created.push(tx.create({
        ...candidate,
        model_type: "PaymentAllocation",
        amount: Number(candidate.amount),
        currency: candidate.currency ?? payment.currency,
        matter_id: candidate.matter_id ?? invoice.matter_id ?? payment.matter_id ?? null,
        client_group_id: invoice.client_group_id ?? payment.client_group_id ?? null,
        status: "posted",
        allocated_at: candidate.allocated_at ?? match.matched_at ?? match.created_at,
        actor_id: actorId,
        reason_code: "legacy_payment_match_backfill",
        migration_backfill: true,
      }));
    }
    const auditEvent = appendFinanceAuditEvent({
      repository: tx,
      event: {
        tenant_id: tenantId,
        actor_id: actorId,
        action: "payment.allocation.backfill",
        object_type: "PaymentAllocation",
        object_id: "legacy-payment-match-backfill",
        idempotency_key: idempotencyKey,
        metadata: {
          created_count: created.length,
          unmatched_payment_count: plan.unallocated_payments.length,
          automatic_revenue_promotion_applied: false,
        },
      },
    });
    const response = Object.freeze({
      outcome: "created",
      created_count: created.length,
      payment_allocations: Object.freeze(created),
      unallocated_payments: plan.unallocated_payments,
      auto_promoted_revenue_count: 0,
      audit_event: auditEvent,
      dry_run: false,
      idempotent_replay: false,
      ...(plan_hash === null ? {} : { plan_hash: computedPlanHash }),
    });
    tx.recordIdempotency({
      tenant_id: tenantId,
      idempotency_key: idempotencyKey,
      operation: "payment_allocation_backfill",
      request: plan_hash === null ? undefined : { plan_hash: computedPlanHash },
      response,
    });
    return response;
  });
}
