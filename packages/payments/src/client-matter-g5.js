export const PAYMENTS_G5D_TUW_COVERAGE = Object.freeze([
  "LFOS-G5-W08-T001",
  "LFOS-G5-W08-T002",
  "LFOS-G5-W08-T003",
  "LFOS-G5-W08-T004",
  "LFOS-G5-W08-T005",
]);

export const PAYMENTS_G5E_TUW_COVERAGE = Object.freeze([
  "LFOS-G5-W08-T006",
  "LFOS-G5-W08-T007",
  "LFOS-G5-W08-T008",
]);

function freezeRecord(record) {
  return Object.freeze(record);
}

function freezeArray(values) {
  return Object.freeze([...(values ?? [])]);
}

function missingFields(fields, input) {
  return fields.filter((field) => input?.[field] === undefined || input?.[field] === null || input?.[field] === "");
}

function asNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function amountTotal(items, field = "amount") {
  return items.reduce((total, item) => {
    const amount = asNumber(item?.[field]);
    return amount === null ? total : total + amount;
  }, 0);
}

function noWriteBoundary(tuwId) {
  return {
    tuw_id: tuwId,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    creates_database_rows: false,
    updates_database_rows: false,
    deletes_database_rows: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    appends_audit_event: false,
    executes_api_handler: false,
    dispatches_payments_runtime: false,
    dispatches_payment_import_runtime: false,
    dispatches_payment_matching_runtime: false,
    dispatches_ar_runtime: false,
    dispatches_ar_aging_runtime: false,
    dispatches_accounting_export_runtime: false,
    dispatches_tax_export_runtime: false,
    recognizes_cash: false,
    creates_ledger_entry: false,
    posts_journal_entry: false,
    mutates_invoice: false,
    g5_runtime_readiness_claim: "open",
    payments_runtime_readiness_claim: "open",
  };
}

function outcomeFor(blockedClaims) {
  return blockedClaims.length > 0 ? "blocked" : "review_required";
}

export function createPaymentsG5PaymentSchemaDescriptor(request = {}) {
  const payment = request.payment ?? {};
  const amount = asNumber(payment.amount);
  const blockedClaims = [];

  if (missingFields(["tenant_id", "matter_id", "payment"], request).length > 0) {
    blockedClaims.push("payment_required_context_missing");
  }
  if (!payment.payment_id) blockedClaims.push("payment_id_required");
  if (!payment.import_ref) blockedClaims.push("payment_import_ref_required");
  if (amount === null || amount <= 0) blockedClaims.push("payment_amount_required");
  if (!["imported", "unmatched"].includes(payment.status)) {
    blockedClaims.push("payment_imported_unmatched_state_required");
  }
  if (payment.matter_id && payment.matter_id !== request.matter_id) {
    blockedClaims.push("payment_matter_trace_mismatch");
  }
  if (payment.tenant_id && payment.tenant_id !== request.tenant_id) {
    blockedClaims.push("payment_cross_tenant_blocked");
  }

  return freezeRecord({
    ...noWriteBoundary("LFOS-G5-W08-T001"),
    descriptor_type: "payments_g5_payment_schema_descriptor",
    tenant_id: request.tenant_id ?? payment.tenant_id ?? null,
    matter_id: request.matter_id ?? payment.matter_id ?? null,
    payment_id: payment.payment_id ?? null,
    import_ref: payment.import_ref ?? null,
    status: payment.status ?? null,
    amount,
    outcome: outcomeFor(blockedClaims),
    blocked_claims: freezeArray(blockedClaims),
    payment_schema_receipt: freezeRecord({
      imported_unmatched_state_tested: ["imported", "unmatched"].includes(payment.status),
      payment_persisted: false,
      audit_event_written: false,
    }),
  });
}

export function createPaymentsG5JournalEntryDescriptor(request = {}) {
  const journalEntry = request.journal_entry ?? {};
  const lines = freezeArray(journalEntry.lines);
  const sourceEvents = freezeArray(request.source_events);
  const debitTotal = amountTotal(lines.filter((line) => line?.side === "debit"));
  const creditTotal = amountTotal(lines.filter((line) => line?.side === "credit"));
  const postedToGl = request.posted_to_gl === true || journalEntry.posted_to_gl === true;
  const blockedClaims = [];

  if (missingFields(["tenant_id", "matter_id", "journal_entry", "source_events"], request).length > 0) {
    blockedClaims.push("journal_entry_required_context_missing");
  }
  if (!journalEntry.journal_entry_id) blockedClaims.push("journal_entry_id_required");
  if (sourceEvents.length === 0) blockedClaims.push("journal_entry_source_event_required");
  if (lines.length < 2 || Math.abs(debitTotal - creditTotal) > 0.0001) {
    blockedClaims.push("journal_entry_balanced_entry_required");
  }
  if (postedToGl) blockedClaims.push("journal_entry_posting_blocked");
  if (journalEntry.matter_id && journalEntry.matter_id !== request.matter_id) {
    blockedClaims.push("journal_entry_matter_trace_mismatch");
  }
  if (journalEntry.tenant_id && journalEntry.tenant_id !== request.tenant_id) {
    blockedClaims.push("journal_entry_cross_tenant_blocked");
  }

  return freezeRecord({
    ...noWriteBoundary("LFOS-G5-W08-T006"),
    descriptor_type: "payments_g5_journal_entry_descriptor",
    tenant_id: request.tenant_id ?? journalEntry.tenant_id ?? null,
    matter_id: request.matter_id ?? journalEntry.matter_id ?? null,
    journal_entry_id: journalEntry.journal_entry_id ?? null,
    source_event_count: sourceEvents.length,
    debit_total: debitTotal,
    credit_total: creditTotal,
    outcome: outcomeFor(blockedClaims),
    blocked_claims: freezeArray(blockedClaims),
    journal_entry_receipt: freezeRecord({
      balanced_entry_tested: lines.length >= 2 && Math.abs(debitTotal - creditTotal) <= 0.0001,
      journal_entry_persisted: false,
      posted_to_gl: postedToGl,
      audit_event_written: false,
    }),
  });
}

export function createPaymentsG5AccountingExportDescriptor(request = {}) {
  const exportBatch = request.export_batch ?? {};
  const journalEntries = freezeArray(request.journal_entries);
  const auditEvidence = request.audit_evidence ?? {};
  const dispatchedRuntime = request.dispatched_runtime === true || exportBatch.dispatched_runtime === true;
  const blockedClaims = [];

  if (missingFields(["tenant_id", "export_batch", "journal_entries", "audit_evidence"], request).length > 0) {
    blockedClaims.push("accounting_export_required_context_missing");
  }
  if (!exportBatch.export_batch_id) blockedClaims.push("accounting_export_batch_id_required");
  if (!exportBatch.export_format) blockedClaims.push("accounting_export_format_required");
  if (journalEntries.length === 0) blockedClaims.push("accounting_export_journal_entries_required");
  if (!auditEvidence.export_audit_ref) blockedClaims.push("accounting_export_audit_evidence_required");
  if (
    journalEntries.some((entry) => {
      const lines = freezeArray(entry?.lines);
      const debitTotal = amountTotal(lines.filter((line) => line?.side === "debit"));
      const creditTotal = amountTotal(lines.filter((line) => line?.side === "credit"));
      return lines.length < 2 || Math.abs(debitTotal - creditTotal) > 0.0001;
    })
  ) {
    blockedClaims.push("accounting_export_balanced_entry_required");
  }
  if (dispatchedRuntime) blockedClaims.push("accounting_export_runtime_dispatch_blocked");

  return freezeRecord({
    ...noWriteBoundary("LFOS-G5-W08-T007"),
    descriptor_type: "payments_g5_accounting_export_descriptor",
    tenant_id: request.tenant_id ?? exportBatch.tenant_id ?? null,
    export_batch_id: exportBatch.export_batch_id ?? null,
    export_format: exportBatch.export_format ?? null,
    journal_entry_count: journalEntries.length,
    outcome: outcomeFor(blockedClaims),
    blocked_claims: freezeArray(blockedClaims),
    accounting_export_receipt: freezeRecord({
      export_audit_tested: Boolean(auditEvidence.export_audit_ref),
      export_file_written: false,
      dispatched_runtime: dispatchedRuntime,
      audit_event_written: false,
    }),
  });
}

export function createPaymentsG5VatTaxExportDescriptor(request = {}) {
  const taxExport = request.tax_export ?? {};
  const period = request.period ?? {};
  const invoiceTaxSummaries = freezeArray(request.invoice_tax_summaries);
  const expectedTaxTotal = asNumber(taxExport.tax_total);
  const summaryTaxTotal = amountTotal(invoiceTaxSummaries, "tax_amount");
  const exportedWithoutLock = request.exported_without_lock === true || taxExport.exported_without_lock === true;
  const blockedClaims = [];

  if (missingFields(["tenant_id", "tax_export", "period", "invoice_tax_summaries"], request).length > 0) {
    blockedClaims.push("vat_tax_export_required_context_missing");
  }
  if (!taxExport.tax_export_id) blockedClaims.push("vat_tax_export_id_required");
  if (!period.period_id) blockedClaims.push("vat_tax_export_period_required");
  if (period.locked !== true || exportedWithoutLock) blockedClaims.push("vat_tax_export_period_lock_required");
  if (invoiceTaxSummaries.length === 0) blockedClaims.push("vat_tax_export_invoice_tax_summary_required");
  if (expectedTaxTotal === null || Math.abs(expectedTaxTotal - summaryTaxTotal) > 0.0001) {
    blockedClaims.push("vat_tax_export_amount_reconciliation_required");
  }

  return freezeRecord({
    ...noWriteBoundary("LFOS-G5-W08-T008"),
    descriptor_type: "payments_g5_vat_tax_export_descriptor",
    tenant_id: request.tenant_id ?? taxExport.tenant_id ?? null,
    tax_export_id: taxExport.tax_export_id ?? null,
    period_id: period.period_id ?? null,
    invoice_tax_summary_count: invoiceTaxSummaries.length,
    tax_total: expectedTaxTotal,
    summary_tax_total: summaryTaxTotal,
    outcome: outcomeFor(blockedClaims),
    blocked_claims: freezeArray(blockedClaims),
    vat_tax_export_receipt: freezeRecord({
      period_lock_tested: period.locked === true,
      tax_export_persisted: false,
      exported_without_lock: exportedWithoutLock,
      audit_event_written: false,
    }),
  });
}

export function createPaymentsG5PaymentImportDescriptor(request = {}) {
  const payment = request.payment ?? {};
  const importBatch = request.import_batch ?? {};
  const idempotencyKey = request.idempotency_key ?? importBatch.idempotency_key ?? payment.idempotency_key ?? null;
  const duplicateImportAttempt = request.duplicate_import_attempt === true || importBatch.duplicate_import_attempt === true;
  const secondPaymentCreated = request.second_payment_created === true || payment.second_payment_created === true;
  const blockedClaims = [];

  if (missingFields(["tenant_id", "import_batch", "payment"], request).length > 0) {
    blockedClaims.push("payment_import_required_context_missing");
  }
  if (!importBatch.import_batch_id) blockedClaims.push("payment_import_batch_id_required");
  if (!payment.payment_id) blockedClaims.push("payment_import_payment_id_required");
  if (!idempotencyKey) blockedClaims.push("payment_import_idempotency_key_required");
  if (payment.import_ref && importBatch.import_ref && payment.import_ref !== importBatch.import_ref) {
    blockedClaims.push("payment_import_trace_mismatch");
  }
  if (!duplicateImportAttempt || secondPaymentCreated) {
    blockedClaims.push("payment_import_duplicate_attempt_blocked");
  }

  return freezeRecord({
    ...noWriteBoundary("LFOS-G5-W08-T002"),
    descriptor_type: "payments_g5_payment_import_descriptor",
    tenant_id: request.tenant_id ?? payment.tenant_id ?? null,
    import_batch_id: importBatch.import_batch_id ?? null,
    payment_id: payment.payment_id ?? null,
    idempotency_key: idempotencyKey,
    outcome: outcomeFor(blockedClaims),
    blocked_claims: freezeArray(blockedClaims),
    payment_import_receipt: freezeRecord({
      duplicate_import_idempotency_tested: duplicateImportAttempt,
      payment_persisted: false,
      second_payment_created: secondPaymentCreated,
      audit_event_written: false,
    }),
  });
}

export function createPaymentsG5PaymentMatchingDescriptor(request = {}) {
  const payment = request.payment ?? {};
  const invoice = request.invoice ?? {};
  const match = request.match ?? {};
  const paymentAmount = asNumber(payment.amount);
  const invoiceOutstanding = asNumber(invoice.outstanding_amount ?? invoice.amount);
  const matchAmount = asNumber(match.amount);
  const blockedClaims = [];

  if (missingFields(["tenant_id", "matter_id", "payment", "invoice", "match"], request).length > 0) {
    blockedClaims.push("payment_match_required_context_missing");
  }
  if (!payment.payment_id) blockedClaims.push("payment_match_payment_trace_required");
  if (!invoice.invoice_id) blockedClaims.push("payment_match_invoice_trace_required");
  if (match.invoice_id && invoice.invoice_id && match.invoice_id !== invoice.invoice_id) {
    blockedClaims.push("payment_match_invoice_trace_mismatch");
  }
  if (match.payment_id && payment.payment_id && match.payment_id !== payment.payment_id) {
    blockedClaims.push("payment_match_payment_trace_mismatch");
  }
  if (match.match_type !== "partial" || matchAmount === null || matchAmount <= 0) {
    blockedClaims.push("payment_match_partial_match_required");
  }
  if (
    matchAmount !== null &&
    ((paymentAmount !== null && matchAmount > paymentAmount) ||
      (invoiceOutstanding !== null && matchAmount > invoiceOutstanding))
  ) {
    blockedClaims.push("payment_match_overallocation_blocked");
  }
  if (match.duplicate_cash_recognized === true || request.duplicate_cash_recognized === true) {
    blockedClaims.push("payment_match_duplicate_cash_blocked");
  }

  return freezeRecord({
    ...noWriteBoundary("LFOS-G5-W08-T003"),
    descriptor_type: "payments_g5_payment_matching_descriptor",
    tenant_id: request.tenant_id ?? payment.tenant_id ?? null,
    matter_id: request.matter_id ?? payment.matter_id ?? invoice.matter_id ?? null,
    payment_id: payment.payment_id ?? match.payment_id ?? null,
    invoice_id: invoice.invoice_id ?? match.invoice_id ?? null,
    match_amount: matchAmount,
    outcome: outcomeFor(blockedClaims),
    blocked_claims: freezeArray(blockedClaims),
    payment_match_receipt: freezeRecord({
      partial_match_tested: match.match_type === "partial" && matchAmount !== null,
      payment_match_persisted: false,
      duplicate_cash_recognized: request.duplicate_cash_recognized === true || match.duplicate_cash_recognized === true,
      audit_event_written: false,
    }),
  });
}

export function createPaymentsG5ARBalanceDescriptor(request = {}) {
  const invoice = request.invoice ?? {};
  const arBalance = request.ar_balance ?? {};
  const invoiceAmount = asNumber(invoice.amount);
  const outstandingAmount = asNumber(arBalance.outstanding_amount);
  const blockedClaims = [];

  if (missingFields(["tenant_id", "matter_id", "invoice", "ar_balance"], request).length > 0) {
    blockedClaims.push("ar_balance_required_context_missing");
  }
  if (!invoice.invoice_id || !["issued"].includes(invoice.issue_status ?? invoice.status)) {
    blockedClaims.push("ar_balance_invoice_issue_source_required");
  }
  if (!arBalance.ar_balance_id) blockedClaims.push("ar_balance_id_required");
  if (invoice.invoice_id && arBalance.invoice_id && invoice.invoice_id !== arBalance.invoice_id) {
    blockedClaims.push("ar_balance_invoice_trace_mismatch");
  }
  if (invoiceAmount === null || outstandingAmount === null || Math.abs(invoiceAmount - outstandingAmount) > 0.0001) {
    blockedClaims.push("ar_balance_amount_reconciliation_required");
  }
  if (arBalance.editable_source_object === true || request.editable_source_object === true) {
    blockedClaims.push("ar_balance_editable_source_blocked");
  }

  return freezeRecord({
    ...noWriteBoundary("LFOS-G5-W08-T004"),
    descriptor_type: "payments_g5_ar_balance_descriptor",
    tenant_id: request.tenant_id ?? arBalance.tenant_id ?? null,
    matter_id: request.matter_id ?? arBalance.matter_id ?? invoice.matter_id ?? null,
    invoice_id: invoice.invoice_id ?? arBalance.invoice_id ?? null,
    ar_balance_id: arBalance.ar_balance_id ?? null,
    outstanding_amount: outstandingAmount,
    outcome: outcomeFor(blockedClaims),
    blocked_claims: freezeArray(blockedClaims),
    ar_balance_receipt: freezeRecord({
      invoice_issue_creates_ar_tested: invoice.issue_status === "issued" || invoice.status === "issued",
      ar_balance_persisted: false,
      editable_source_object: arBalance.editable_source_object === true || request.editable_source_object === true,
      audit_event_written: false,
    }),
  });
}

export function createPaymentsG5ARAgingDescriptor(request = {}) {
  const arBalance = request.ar_balance ?? {};
  const agingSnapshot = request.aging_snapshot ?? {};
  const balanceRefs = freezeArray(agingSnapshot.balance_refs);
  const balanceAmount = asNumber(arBalance.outstanding_amount);
  const bucketAmount = asNumber(agingSnapshot.bucket_amount);
  const validBuckets = new Set(["current", "1_30", "31_60", "61_90", "90_plus"]);
  const blockedClaims = [];

  if (missingFields(["tenant_id", "matter_id", "ar_balance", "aging_snapshot"], request).length > 0) {
    blockedClaims.push("ar_aging_required_context_missing");
  }
  if (!agingSnapshot.as_of_date) blockedClaims.push("ar_aging_as_of_date_required");
  if (!validBuckets.has(agingSnapshot.bucket)) blockedClaims.push("ar_aging_bucket_required");
  if (!arBalance.ar_balance_id || !balanceRefs.includes(arBalance.ar_balance_id)) {
    blockedClaims.push("ar_aging_balance_ref_required");
  }
  if (balanceAmount === null || bucketAmount === null || Math.abs(balanceAmount - bucketAmount) > 0.0001) {
    blockedClaims.push("ar_aging_bucket_calculation_required");
  }
  if (agingSnapshot.editable_source_object === true || request.editable_source_object === true) {
    blockedClaims.push("ar_aging_editable_source_blocked");
  }

  return freezeRecord({
    ...noWriteBoundary("LFOS-G5-W08-T005"),
    descriptor_type: "payments_g5_ar_aging_descriptor",
    tenant_id: request.tenant_id ?? arBalance.tenant_id ?? null,
    matter_id: request.matter_id ?? arBalance.matter_id ?? null,
    ar_balance_id: arBalance.ar_balance_id ?? null,
    bucket: agingSnapshot.bucket ?? null,
    bucket_amount: bucketAmount,
    outcome: outcomeFor(blockedClaims),
    blocked_claims: freezeArray(blockedClaims),
    ar_aging_receipt: freezeRecord({
      aging_bucket_tested: validBuckets.has(agingSnapshot.bucket),
      ar_aging_persisted: false,
      editable_source_object: agingSnapshot.editable_source_object === true || request.editable_source_object === true,
      audit_event_written: false,
    }),
  });
}
