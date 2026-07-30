import assert from "node:assert/strict";
import test from "node:test";
import { handleFinancePostgresApiRequest } from "../../../apps/api/src/finance-runtime-context.js";
import { createFinanceRepository } from "../src/finance-repository.js";
import {
  FINANCE_APPEND_ONLY_RECORD_TYPES,
  FINANCE_DOMAIN_DESCRIPTOR,
  createFinanceDomainSnapshot,
  reconcileFinanceRecords,
  runFinancePostgresCommand,
} from "../src/central-ledger.js";
import { approveTimeEntryForWip, createTimeEntry } from "../../time-expense/src/time-entry-service.js";
import { createRateCard } from "../../time-expense/src/rate-card-service.js";
import { generateWipFromApprovedItems, lockWipSnapshot } from "../src/wip-service.js";
import { approvePreBillWithoutAdjustment, createPreBill } from "../src/prebill-service.js";
import { createInvoiceFromPreBill } from "../src/invoice-service.js";
import { normalizeClientDepositAllocation } from "../src/client-deposit-allocation-model.js";
import { normalizeFeeCommitment } from "../src/fee-commitment-model.js";
import { importPayment } from "../../payments/src/payment-service.js";
import { matchPaymentToInvoice } from "../../payments/src/matching-service.js";
import { computeArBalance } from "../../payments/src/ar-service.js";
import { createJournalEntry } from "../../payments/src/journal-service.js";
import { drawdownTrustToInvoice, receiveTrustDeposit } from "../../payments/src/trust-ledger-service.js";
import { createPostgresDomainLedger } from "../../persistence/src/postgres/domain-ledger.js";
import { createMigratedPostgresFixture } from "../../persistence/test/helpers/disposable-postgres.js";
import { reportDomainReceiptEvidence } from "../../persistence/test/helpers/domain-receipt-evidence.js";

const TENANT = "tenant-rs-dom-finance";
const MATTER = "matter-rs-dom-finance";
const ACTOR = "user-rs-dom-finance";

function buildFinanceSource() {
  const repository = createFinanceRepository();
  const rate = createRateCard({
    repository,
    rate_card: {
      rate_card_id: "rate-rs-dom-finance",
      tenant_id: TENANT,
      currency: "KRW",
      effective_from: "2026-07-16",
      role_rates: [{ role_id: "partner", hourly_rate: 100000 }],
    },
    actor_id: ACTOR,
    idempotency_key: "rate-rs-dom-finance",
  });
  createTimeEntry({
    repository,
    time_entry: {
      time_entry_id: "time-rs-dom-finance",
      tenant_id: TENANT,
      matter_id: MATTER,
      role_id: "partner",
      work_date: "2026-07-16",
      narrative: "Synthetic central-ledger finance rehearsal",
      duration_minutes: 60,
      billable: true,
    },
    actor_id: ACTOR,
    idempotency_key: "time-rs-dom-finance",
  });
  approveTimeEntryForWip({
    repository,
    tenant_id: TENANT,
    time_entry_id: "time-rs-dom-finance",
    actor_id: ACTOR,
    idempotency_key: "time-approve-rs-dom-finance",
  });
  const wip = generateWipFromApprovedItems({
    repository,
    tenant_id: TENANT,
    matter_id: MATTER,
    rate_card: rate.rate_card,
    actor_id: ACTOR,
    idempotency_key: "wip-rs-dom-finance",
  });
  const wipSnapshot = lockWipSnapshot({
    repository,
    tenant_id: TENANT,
    matter_id: MATTER,
    wip_item_ids: wip.wip_items.map((item) => item.wip_item_id),
    wip_snapshot_id: "wip-snapshot-rs-dom-finance",
    actor_id: ACTOR,
    idempotency_key: "wip-snapshot-rs-dom-finance",
  });
  const prebill = createPreBill({
    repository,
    prebill: {
      prebill_id: "prebill-rs-dom-finance",
      tenant_id: TENANT,
      matter_id: MATTER,
      wip_snapshot_id: wipSnapshot.wip_snapshot.wip_snapshot_id,
      partner_reviewer_id: ACTOR,
      currency: "KRW",
    },
    actor_id: ACTOR,
    idempotency_key: "prebill-rs-dom-finance",
  });
  approvePreBillWithoutAdjustment({
    repository,
    tenant_id: TENANT,
    prebill_id: prebill.prebill.prebill_id,
    actor_id: ACTOR,
    idempotency_key: "prebill-approve-rs-dom-finance",
  });
  const invoice = createInvoiceFromPreBill({
    repository,
    invoice: {
      invoice_id: "invoice-rs-dom-finance",
      tenant_id: TENANT,
      matter_id: MATTER,
      prebill_id: prebill.prebill.prebill_id,
      billing_client_party_id: "party-rs-dom-finance",
      currency: "KRW",
      issued_at: "2026-07-16T00:00:00.000Z",
      due_date: "2026-08-15",
    },
    actor_id: ACTOR,
    idempotency_key: "invoice-rs-dom-finance",
  });
  const payment = importPayment({
    repository,
    payment: {
      payment_id: "payment-rs-dom-finance",
      tenant_id: TENANT,
      matter_id: MATTER,
      bank_reference: "synthetic-bank-reference-rs-dom-finance",
      amount: 20000,
      currency: "KRW",
    },
    actor_id: ACTOR,
    idempotency_key: "payment-rs-dom-finance",
  });
  matchPaymentToInvoice({
    repository,
    match: {
      payment_match_id: "payment-match-rs-dom-finance",
      tenant_id: TENANT,
      payment_id: payment.payment.payment_id,
      invoice_id: invoice.invoice.invoice_id,
      amount: 20000,
    },
    actor_id: ACTOR,
    idempotency_key: "payment-match-rs-dom-finance",
  });
  receiveTrustDeposit({
    repository,
    deposit: {
      trust_ledger_entry_id: "trust-deposit-rs-dom-finance",
      tenant_id: TENANT,
      matter_id: MATTER,
      amount: 30000,
      currency: "KRW",
    },
    actor_id: ACTOR,
    idempotency_key: "trust-deposit-rs-dom-finance",
  });
  drawdownTrustToInvoice({
    repository,
    drawdown: {
      trust_ledger_entry_id: "trust-drawdown-rs-dom-finance",
      tenant_id: TENANT,
      matter_id: MATTER,
      invoice_id: invoice.invoice.invoice_id,
      amount: 30000,
      currency: "KRW",
    },
    actor_id: ACTOR,
    idempotency_key: "trust-drawdown-rs-dom-finance",
  });
  computeArBalance({
    repository,
    tenant_id: TENANT,
    invoice_id: invoice.invoice.invoice_id,
    ar_balance_id: "ar-rs-dom-finance",
    actor_id: ACTOR,
    idempotency_key: "ar-rs-dom-finance",
  });
  createJournalEntry({
    repository,
    journal_entry: {
      journal_entry_id: "journal-rs-dom-finance",
      tenant_id: TENANT,
      matter_id: MATTER,
      source_ref: invoice.invoice.invoice_id,
      currency: "KRW",
      lines: [
        { account: "ar", debit: 100000, credit: 0 },
        { account: "revenue", debit: 0, credit: 100000 },
      ],
    },
    actor_id: ACTOR,
    idempotency_key: "journal-rs-dom-finance",
  });
  repository.create(normalizeFeeCommitment({
    fee_commitment_id: "fee-commitment-rs-dom-finance",
    tenant_id: TENANT,
    client_group_id: "client-rs-dom-finance",
    opportunity_id: "opportunity-rs-dom-finance",
    matter_id: MATTER,
    currency: "KRW",
    agreed_amount: 12000000,
    due_date: "2026-08-15",
    accepted_at: "2026-07-16T00:00:00.000Z",
    status: "active",
    source_fee_arrangement_id: null,
    state_version: 1,
    created_by: ACTOR,
    updated_by: ACTOR,
    reason: "synthetic_fee_commitment_schema_rehearsal",
  }));
  repository.create({
    model_type: "BankImportBatch",
    bank_import_batch_id: "bank-batch-rs-dom-finance",
    tenant_id: TENANT,
    source_manifest_hash: "b".repeat(64),
    account_ref: "bank-account-rs-dom-finance",
    transaction_count: 1,
    status: "reconciled",
  });
  repository.create({
    model_type: "BankTransaction",
    bank_transaction_id: "bank-transaction-rs-dom-finance",
    tenant_id: TENANT,
    bank_import_batch_id: "bank-batch-rs-dom-finance",
    transaction_fingerprint: "c".repeat(64),
    account_ref: "bank-account-rs-dom-finance",
    date: "2026-07-16",
    occurred_at: "2026-07-16T09:00:00.000Z",
    direction: "inflow",
    amount: 12000000,
    balance_after: 12000000,
    currency: "KRW",
    status: "posted",
  });
  repository.create({
    model_type: "BankTransactionClassification",
    bank_transaction_classification_id: "classification-rs-dom-finance",
    tenant_id: TENANT,
    bank_transaction_id: "bank-transaction-rs-dom-finance",
    client_group_id: "client-rs-dom-finance",
    transaction_direction: "inflow",
    transaction_date: "2026-07-16",
    amount: 12000000,
    currency: "KRW",
    category: "client_receipt",
    status: "confirmed",
  });
  repository.create(normalizeClientDepositAllocation({
    client_deposit_allocation_id: "allocation-rs-dom-finance",
    tenant_id: TENANT,
    client_group_id: "client-rs-dom-finance",
    bank_transaction_id: "bank-transaction-rs-dom-finance",
    bank_transaction_classification_id: "classification-rs-dom-finance",
    fee_commitment_id: "fee-commitment-rs-dom-finance",
    currency: "KRW",
    allocated_amount: 12000000,
    reversed_amount: 0,
    allocation_source: "automatic",
    manual_lock: false,
    state_version: 1,
    allocated_at: "2026-07-16T09:00:00.000Z",
    created_by: ACTOR,
    updated_by: ACTOR,
    reason: "synthetic_deposit_allocation_schema_rehearsal",
  }));
  return repository;
}

test("Finance inventory classifies mutable documents and append-only ledgers and reconciles KRW, WIP, AR, invoice, trust, and time", () => {
  const repository = buildFinanceSource();
  try {
    const result = createFinanceDomainSnapshot({
      repositories: [{ source_id: "finance-file-v2", repository }],
      tenant_id: TENANT,
    });
    assert.equal(result.inventory.tenant_mismatch_count, 0);
    assert.equal(result.inventory.append_only_record_types.includes("JournalEntry"), true);
    assert.equal(result.inventory.append_only_record_types.includes("TrustLedgerEntry"), true);
    assert.equal(result.inventory.mutable_record_types.includes("Invoice"), true);
    assert.equal(FINANCE_APPEND_ONLY_RECORD_TYPES.includes("PaymentMatch"), true);
    assert.equal(result.inventory.reconciliation.currency_mismatch_count, 0);
    assert.equal(result.inventory.reconciliation.time_minutes, 60);
    assert.equal(result.inventory.reconciliation.wip_item_count, 1);
    assert.equal(result.inventory.reconciliation.wip_snapshot_count, 1);
    assert.equal(result.inventory.reconciliation.invoice_count, 1);
    assert.equal(result.inventory.reconciliation.invoice_prebill_matched_count, 1);
    assert.equal(result.inventory.reconciliation.invoice_prebill_missing_count, 0);
    assert.equal(result.inventory.reconciliation.ar_balance_count, 1);
    assert.equal(result.inventory.reconciliation.payment_match_count, 1);
    assert.equal(result.inventory.reconciliation.journal_entry_count, 1);
    assert.equal(result.inventory.reconciliation.trust_ledger_entry_count, 2);
    assert.equal(result.inventory.reconciliation.fee_commitment_count, 1);
    assert.equal(result.inventory.reconciliation.client_deposit_allocation_count, 1);
    assert.equal(result.inventory.reconciliation.client_deposit_active_total, 12000000);
    assert.match(result.inventory.reconciliation.invariant_hash, /^[a-f0-9]{64}$/u);

    const brokenWip = result.snapshot.records.map((record) => structuredClone(record.payload));
    brokenWip.find((record) => record.model_type === "WipSnapshot").total_amount += 1;
    assert.throws(
      () => reconcileFinanceRecords(brokenWip),
      (error) => error?.safe_error_code === "FINANCE_RECONCILIATION_FAILED",
    );
  } finally {
    repository.close();
  }
});

test("Finance PostgreSQL import, async API command, append-only guard, shadow, and rehearsal preserve source invariants", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const ledger = createPostgresDomainLedger({
    pool: fixture.appPool,
    clock: () => new Date("2026-07-16T21:00:00.000Z"),
  });
  const sourceRepository = buildFinanceSource();
  const source = createFinanceDomainSnapshot({
    repositories: [{ source_id: "finance-file-v2", repository: sourceRepository }],
    tenant_id: TENANT,
  });
  sourceRepository.close();

  const imported = await ledger.importSnapshot(source.snapshot);
  assert.equal(imported.replayed, false);
  assert.equal(imported.receipt.rejected_count, 0);
  const secondImport = await ledger.importSnapshot(source.snapshot);
  assert.equal(secondImport.replayed, true);
  const persistedFeeCommitment = await ledger.read({
    tenant_id: TENANT,
    domain_id: FINANCE_DOMAIN_DESCRIPTOR.domain_id,
    record_type: "FeeCommitment",
    record_id: "fee-commitment-rs-dom-finance",
  });
  assert.equal(persistedFeeCommitment.payload.client_group_id, "client-rs-dom-finance");
  assert.equal(persistedFeeCommitment.payload.agreed_amount, 12000000);
  assert.equal(persistedFeeCommitment.append_only, false);
  const persistedAllocation = await ledger.read({
    tenant_id: TENANT,
    domain_id: FINANCE_DOMAIN_DESCRIPTOR.domain_id,
    record_type: "ClientDepositAllocation",
    record_id: "allocation-rs-dom-finance",
  });
  assert.equal(
    persistedAllocation.payload.bank_transaction_id,
    "bank-transaction-rs-dom-finance",
  );
  assert.equal(
    persistedAllocation.payload.fee_commitment_id,
    "fee-commitment-rs-dom-finance",
  );
  assert.equal(persistedAllocation.payload.allocated_amount, 12000000);
  assert.equal(persistedAllocation.append_only, false);
  const shadow = await ledger.compareSnapshot(source.snapshot);
  assert.equal(shadow.comparison.equal, true);
  const rehearsal = await ledger.recordRehearsal({
    tenant_id: TENANT,
    domain_id: FINANCE_DOMAIN_DESCRIPTOR.domain_id,
    import_receipt_id: imported.receipt.receipt_id,
    shadow_receipt_id: shadow.receipt.receipt_id,
    smoke_result: {
      status: "passed",
      synthetic_only: true,
      environment: "test",
      adapter: "finance-postgres-domain-ledger",
      executed_at: "2026-07-16T21:00:00.000Z",
      source_snapshot_hash: shadow.comparison.source_hash,
      checks: {
        source_imported: imported.receipt.status === "source_imported",
        idempotency_replayed: secondImport.replayed,
        shadow_equal: shadow.comparison.equal,
        readback_equal: shadow.comparison.source_hash === shadow.comparison.target_hash,
        json_dual_write_absent: true,
      },
      production_migrated: false,
    },
  });

  const api = await handleFinancePostgresApiRequest({
    ledger,
    pathname: "/api/finance/time-entries",
    method: "POST",
    query: {},
    body: {
      permission_ref: "perm-rs-dom-finance",
      audit_hint_ref: "audit-rs-dom-finance",
      actor_id: ACTOR,
      idempotency_key: "api-time-rs-dom-finance",
      time_entry: {
        time_entry_id: "time-api-rs-dom-finance",
        tenant_id: TENANT,
        matter_id: MATTER,
        role_id: "partner",
        work_date: "2026-07-16",
        narrative: "Synthetic async Finance API command",
        duration_minutes: 30,
        billable: true,
      },
    },
    context: {
      principal: {
        user_id: ACTOR,
        tenant_id: TENANT,
        role_ids: ["partner"],
        scopes: ["finance.time.write"],
      },
      rules: [{ id: "allow-finance-rs-dom", effect: "allow", action: "*" }],
      object_acl: [],
    },
    requestId: "request-rs-dom-finance",
  });
  assert.equal(api.response.status, 201);
  assert.equal(api.response.body.item.time_entry_id, "time-api-rs-dom-finance");
  assert.equal(api.persistence.shadow_equal, true);
  assert.equal(api.persistence.production_migrated, false);
  assert.ok(await ledger.read({
    tenant_id: TENANT,
    domain_id: FINANCE_DOMAIN_DESCRIPTOR.domain_id,
    record_type: "TimeEntry",
    record_id: "time-api-rs-dom-finance",
  }));

  await assert.rejects(
    runFinancePostgresCommand({
      ledger,
      tenant_id: TENANT,
      command(repository) {
        return repository.update(
          { tenant_id: TENANT, model_type: "WipSnapshot", wip_snapshot_id: "wip-snapshot-rs-dom-finance" },
          { status: "tampered" },
        );
      },
    }),
  );
  const targetRecords = await ledger.list({ tenant_id: TENANT, domain_id: FINANCE_DOMAIN_DESCRIPTOR.domain_id });
  const reconciliation = reconcileFinanceRecords(targetRecords.map((record) => record.payload));
  assert.equal(reconciliation.time_minutes, 90);
  assert.equal(reconciliation.invariant_passed, true);

  assert.equal(rehearsal.status, "source_ready");
  assert.equal(rehearsal.production_migrated, false);
  reportDomainReceiptEvidence({ source: source.snapshot, imported, secondImport, shadow, rehearsal });
});
