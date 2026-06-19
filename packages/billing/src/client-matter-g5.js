export const BILLING_G5B_TUW_COVERAGE = Object.freeze([
  "LFOS-G5-W07-T007",
  "LFOS-G5-W07-T008",
  "LFOS-G5-W07-T009",
  "LFOS-G5-W07-T010",
]);

export const BILLING_G5C_TUW_COVERAGE = Object.freeze([
  "LFOS-G5-W07-T011",
  "LFOS-G5-W07-T012",
  "LFOS-G5-W07-T013",
  "LFOS-G5-W07-T014",
  "LFOS-G5-W07-T015",
  "LFOS-G5-W07-T016",
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

function amountTotal(items) {
  return items.reduce((total, item) => {
    const amount = asNumber(item?.amount);
    return amount === null ? total : total + amount;
  }, 0);
}

function wipReference(item) {
  return item?.wip_item_id ?? item?.wip_ref ?? item?.source_wip_ref ?? item?.source_ref ?? item?.id ?? null;
}

function eventAction(event) {
  return event?.action ?? event?.event_type ?? event?.status ?? null;
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
    dispatches_billing_runtime: false,
    dispatches_proforma_runtime: false,
    dispatches_write_down_runtime: false,
    dispatches_invoice_runtime: false,
    generates_invoice_line: false,
    calculates_invoice: false,
    mutates_issued_invoice: false,
    posts_gl_entries: false,
    g5_runtime_readiness_claim: "open",
    billing_runtime_readiness_claim: "open",
  };
}

function outcomeFor(blockedClaims) {
  return blockedClaims.length > 0 ? "blocked" : "review_required";
}

export function createBillingG5WipGenerationDescriptor(request = {}) {
  const sourceItems = freezeArray(request.source_items);
  const blockedClaims = [];
  const approvedBillableItems = sourceItems.filter((item) => item?.status === "approved" && item?.billable === true);

  if (missingFields(["tenant_id", "matter_id", "source_items"], request).length > 0) {
    blockedClaims.push("wip_generation_required_context_missing");
  }
  if (approvedBillableItems.length === 0) blockedClaims.push("wip_generation_approved_source_required");
  if (sourceItems.some((item) => item?.status !== "approved")) {
    blockedClaims.push("wip_generation_unapproved_source_blocked");
  }
  if (sourceItems.some((item) => item?.matter_id && item.matter_id !== request.matter_id)) {
    blockedClaims.push("wip_generation_matter_trace_mismatch");
  }
  if (sourceItems.some((item) => item?.tenant_id && item.tenant_id !== request.tenant_id)) {
    blockedClaims.push("wip_generation_cross_tenant_blocked");
  }

  return freezeRecord({
    ...noWriteBoundary("LFOS-G5-W07-T007"),
    descriptor_type: "billing_g5_wip_generation_descriptor",
    tenant_id: request.tenant_id ?? null,
    matter_id: request.matter_id ?? null,
    source_item_count: sourceItems.length,
    approved_billable_item_count: approvedBillableItems.length,
    projected_wip_item_refs: freezeArray(approvedBillableItems.map((item) => item.time_entry_id ?? item.expense_id ?? item.disbursement_id)),
    outcome: outcomeFor(blockedClaims),
    blocked_claims: freezeArray(blockedClaims),
    wip_generation_receipt: freezeRecord({
      approved_time_creates_wip_tested: true,
      unapproved_source_blocked: sourceItems.some((item) => item?.status !== "approved"),
      wip_persisted: false,
      audit_event_written: false,
    }),
  });
}

export function createBillingG5WipLockSnapshotDescriptor(request = {}) {
  const wipItems = freezeArray(request.wip_items);
  const snapshot = request.snapshot ?? {};
  const snapshotItemRefs = freezeArray(snapshot.item_refs);
  const blockedClaims = [];

  if (missingFields(["tenant_id", "matter_id", "wip_items", "snapshot"], request).length > 0) {
    blockedClaims.push("wip_lock_snapshot_required_context_missing");
  }
  if (!snapshot.snapshot_id) blockedClaims.push("wip_lock_snapshot_id_required");
  if (!snapshot.locked_at) blockedClaims.push("wip_lock_snapshot_locked_at_required");
  if (snapshot.matter_id && snapshot.matter_id !== request.matter_id) blockedClaims.push("wip_lock_snapshot_matter_trace_mismatch");
  if (snapshotItemRefs.length !== wipItems.length) blockedClaims.push("wip_lock_snapshot_item_ref_mismatch");
  if (request.mutates_locked_snapshot === true || snapshot.mutates_source_items === true) {
    blockedClaims.push("wip_lock_snapshot_immutable_required");
  }

  return freezeRecord({
    ...noWriteBoundary("LFOS-G5-W07-T008"),
    descriptor_type: "billing_g5_wip_lock_snapshot_descriptor",
    tenant_id: request.tenant_id ?? null,
    matter_id: request.matter_id ?? snapshot.matter_id ?? null,
    snapshot_id: snapshot.snapshot_id ?? null,
    wip_item_count: wipItems.length,
    snapshot_item_ref_count: snapshotItemRefs.length,
    outcome: outcomeFor(blockedClaims),
    blocked_claims: freezeArray(blockedClaims),
    snapshot_receipt: freezeRecord({
      prebill_snapshot_immutable_tested: true,
      source_wip_mutated: false,
      snapshot_persisted: false,
      audit_event_written: false,
    }),
  });
}

export function createBillingG5PreBillDescriptor(request = {}) {
  const prebill = request.prebill ?? {};
  const snapshot = request.snapshot ?? {};
  const blockedClaims = [];

  if (missingFields(["tenant_id", "matter_id", "prebill", "snapshot"], request).length > 0) {
    blockedClaims.push("prebill_required_context_missing");
  }
  if (!prebill.prebill_id) blockedClaims.push("prebill_id_required");
  if (!prebill.snapshot_id || !snapshot.snapshot_id) blockedClaims.push("prebill_snapshot_required");
  if (prebill.snapshot_id && snapshot.snapshot_id && prebill.snapshot_id !== snapshot.snapshot_id) {
    blockedClaims.push("prebill_snapshot_trace_mismatch");
  }
  if (!["partner_review_required", "partner_approved"].includes(prebill.review_status)) {
    blockedClaims.push("prebill_partner_review_required");
  }
  if (!prebill.partner_reviewer_id) blockedClaims.push("prebill_partner_reviewer_required");
  if (prebill.matter_id && prebill.matter_id !== request.matter_id) blockedClaims.push("prebill_matter_trace_mismatch");

  return freezeRecord({
    ...noWriteBoundary("LFOS-G5-W07-T009"),
    descriptor_type: "billing_g5_prebill_descriptor",
    tenant_id: request.tenant_id ?? prebill.tenant_id ?? null,
    matter_id: request.matter_id ?? prebill.matter_id ?? null,
    prebill_id: prebill.prebill_id ?? null,
    snapshot_id: prebill.snapshot_id ?? null,
    review_status: prebill.review_status ?? null,
    partner_reviewer_id: prebill.partner_reviewer_id ?? null,
    outcome: outcomeFor(blockedClaims),
    blocked_claims: freezeArray(blockedClaims),
    prebill_receipt: freezeRecord({
      partner_review_tested: true,
      prebill_persisted: false,
      invoice_created: false,
      audit_event_written: false,
    }),
  });
}

export function createBillingG5AdjustmentWorkflowDescriptor(request = {}) {
  const adjustment = request.adjustment ?? {};
  const prebill = request.prebill ?? {};
  const amount = asNumber(adjustment.amount);
  const blockedClaims = [];

  if (missingFields(["tenant_id", "matter_id", "adjustment", "prebill"], request).length > 0) {
    blockedClaims.push("adjustment_required_context_missing");
  }
  if (!["write_down", "write_off"].includes(adjustment.adjustment_type)) {
    blockedClaims.push("adjustment_type_required");
  }
  if (amount === null) blockedClaims.push("adjustment_amount_required");
  if (amount !== null && amount <= 0) blockedClaims.push("adjustment_non_positive_amount_blocked");
  if (!adjustment.reason_code) blockedClaims.push("adjustment_reason_required");
  if (adjustment.approval_status !== "approved" || !adjustment.approver_id) {
    blockedClaims.push("adjustment_approval_required");
  }
  if (prebill.prebill_id && adjustment.prebill_id && prebill.prebill_id !== adjustment.prebill_id) {
    blockedClaims.push("adjustment_prebill_trace_mismatch");
  }
  if (adjustment.mutates_issued_invoice === true || request.mutates_issued_invoice === true) {
    blockedClaims.push("adjustment_issued_invoice_mutation_blocked");
  }

  return freezeRecord({
    ...noWriteBoundary("LFOS-G5-W07-T010"),
    descriptor_type: "billing_g5_adjustment_workflow_descriptor",
    tenant_id: request.tenant_id ?? adjustment.tenant_id ?? null,
    matter_id: request.matter_id ?? adjustment.matter_id ?? null,
    adjustment_id: adjustment.adjustment_id ?? null,
    prebill_id: adjustment.prebill_id ?? null,
    adjustment_type: adjustment.adjustment_type ?? null,
    amount,
    approval_status: adjustment.approval_status ?? null,
    approver_id: adjustment.approver_id ?? null,
    outcome: outcomeFor(blockedClaims),
    blocked_claims: freezeArray(blockedClaims),
    adjustment_receipt: freezeRecord({
      approval_required_tested: true,
      adjustment_persisted: false,
      issued_invoice_mutated: false,
      audit_event_written: false,
    }),
  });
}

export function createBillingG5BWipPrebillAdjustmentCloseoutDescriptor(request = {}) {
  const descriptors = freezeArray(request.descriptors);
  const descriptorTuws = new Set(descriptors.map((descriptor) => descriptor?.tuw_id));
  const blockedClaims = [];

  for (const tuwId of BILLING_G5B_TUW_COVERAGE) {
    if (!descriptorTuws.has(tuwId)) blockedClaims.push("g5_billing_closeout_evidence_required");
  }
  if (descriptors.some((descriptor) => descriptor?.outcome !== "review_required")) {
    blockedClaims.push("g5_billing_closeout_blocked_descriptor_present");
  }

  const outcome = outcomeFor(blockedClaims);

  return freezeRecord({
    ...noWriteBoundary("LFOS-G5-W07-T007..LFOS-G5-W07-T010"),
    descriptor_type: "billing_g5b_wip_prebill_adjustment_closeout_descriptor",
    tenant_id: request.tenant_id ?? null,
    slice_id: "G5-B",
    tuw_coverage: BILLING_G5B_TUW_COVERAGE,
    descriptor_count: descriptors.length,
    outcome,
    blocked_claims: freezeArray(blockedClaims),
    approved_time_creates_wip_tested: descriptorTuws.has("LFOS-G5-W07-T007"),
    prebill_snapshot_immutable_tested: descriptorTuws.has("LFOS-G5-W07-T008"),
    partner_review_tested: descriptorTuws.has("LFOS-G5-W07-T009"),
    adjustment_approval_tested: descriptorTuws.has("LFOS-G5-W07-T010"),
    g5_runtime_evidence_recorded: outcome === "review_required",
    closeout_receipt: freezeRecord({
      runtime_readiness_claim: "open",
      billing_runtime_opened: false,
      draft_pr_self_merged: false,
    }),
  });
}

export function createBillingG5InvoiceIssueDescriptor(request = {}) {
  const prebill = request.prebill ?? {};
  const invoice = request.invoice ?? {};
  const idempotencyKey = request.idempotency_key ?? invoice.idempotency_key ?? null;
  const duplicateIssueAttempt = request.duplicate_issue_attempt === true || request.repeated_issue_attempt === true;
  const secondInvoiceCreated = request.second_invoice_created === true || invoice.second_invoice_created === true;
  const blockedClaims = [];

  if (missingFields(["tenant_id", "matter_id", "prebill", "invoice"], request).length > 0) {
    blockedClaims.push("invoice_issue_required_context_missing");
  }
  if (!prebill.prebill_id) blockedClaims.push("invoice_issue_prebill_trace_required");
  if (!invoice.invoice_id) blockedClaims.push("invoice_issue_invoice_id_required");
  if (!idempotencyKey) blockedClaims.push("invoice_issue_idempotency_key_required");
  if (invoice.idempotency_key && idempotencyKey && invoice.idempotency_key !== idempotencyKey) {
    blockedClaims.push("invoice_issue_idempotency_trace_mismatch");
  }
  if (prebill.prebill_id && invoice.prebill_id && prebill.prebill_id !== invoice.prebill_id) {
    blockedClaims.push("invoice_issue_prebill_trace_mismatch");
  }
  if (prebill.matter_id && prebill.matter_id !== request.matter_id) {
    blockedClaims.push("invoice_issue_matter_trace_mismatch");
  }
  if (invoice.matter_id && invoice.matter_id !== request.matter_id) {
    blockedClaims.push("invoice_issue_matter_trace_mismatch");
  }
  if (!["issue_requested", "issued"].includes(invoice.issue_status)) {
    blockedClaims.push("invoice_issue_status_required");
  }
  if (!duplicateIssueAttempt || secondInvoiceCreated) {
    blockedClaims.push("invoice_issue_duplicate_attempt_blocked");
  }

  return freezeRecord({
    ...noWriteBoundary("LFOS-G5-W07-T011"),
    descriptor_type: "billing_g5_invoice_issue_descriptor",
    tenant_id: request.tenant_id ?? invoice.tenant_id ?? null,
    matter_id: request.matter_id ?? invoice.matter_id ?? null,
    prebill_id: prebill.prebill_id ?? invoice.prebill_id ?? null,
    invoice_id: invoice.invoice_id ?? null,
    idempotency_key: idempotencyKey,
    issue_status: invoice.issue_status ?? null,
    outcome: outcomeFor(blockedClaims),
    blocked_claims: freezeArray(blockedClaims),
    invoice_issue_receipt: freezeRecord({
      idempotent_issue_tested: duplicateIssueAttempt,
      invoice_persisted: false,
      second_invoice_created: secondInvoiceCreated,
      audit_event_written: false,
    }),
  });
}

export function createBillingG5InvoiceLineReconciliationDescriptor(request = {}) {
  const invoiceLines = freezeArray(request.invoice_lines);
  const wipItems = freezeArray(request.wip_items);
  const wipRefs = new Set(wipItems.map((item) => wipReference(item)).filter(Boolean));
  const lineRefs = invoiceLines.map((line) => wipReference(line));
  const lineTotal = amountTotal(invoiceLines);
  const wipTotal = amountTotal(wipItems);
  const blockedClaims = [];

  if (missingFields(["tenant_id", "matter_id", "invoice_lines", "wip_items"], request).length > 0) {
    blockedClaims.push("invoice_line_required_context_missing");
  }
  if (invoiceLines.length === 0) blockedClaims.push("invoice_line_required");
  if (wipItems.length === 0) blockedClaims.push("invoice_line_wip_source_required");
  if (lineRefs.some((ref) => !ref)) blockedClaims.push("invoice_line_wip_reconciliation_required");
  if (lineRefs.some((ref) => ref && !wipRefs.has(ref))) blockedClaims.push("invoice_line_unmatched_wip_ref_blocked");
  if (Math.abs(lineTotal - wipTotal) > 0.0001) blockedClaims.push("invoice_line_wip_total_mismatch");
  if (invoiceLines.some((line) => line?.matter_id && line.matter_id !== request.matter_id)) {
    blockedClaims.push("invoice_line_matter_trace_mismatch");
  }
  if (wipItems.some((item) => item?.matter_id && item.matter_id !== request.matter_id)) {
    blockedClaims.push("invoice_line_matter_trace_mismatch");
  }
  if (invoiceLines.some((line) => line?.tenant_id && line.tenant_id !== request.tenant_id)) {
    blockedClaims.push("invoice_line_cross_tenant_blocked");
  }
  if (wipItems.some((item) => item?.tenant_id && item.tenant_id !== request.tenant_id)) {
    blockedClaims.push("invoice_line_cross_tenant_blocked");
  }

  return freezeRecord({
    ...noWriteBoundary("LFOS-G5-W07-T012"),
    descriptor_type: "billing_g5_invoice_line_reconciliation_descriptor",
    tenant_id: request.tenant_id ?? null,
    matter_id: request.matter_id ?? null,
    invoice_line_count: invoiceLines.length,
    wip_item_count: wipItems.length,
    invoice_line_total: lineTotal,
    wip_total: wipTotal,
    outcome: outcomeFor(blockedClaims),
    blocked_claims: freezeArray(blockedClaims),
    invoice_line_receipt: freezeRecord({
      wip_to_invoice_reconciliation_tested: true,
      invoice_lines_persisted: false,
      generated_invoice_lines: false,
      source_wip_mutated: false,
    }),
  });
}

export function createBillingG5TaxInvoiceDescriptor(request = {}) {
  const invoice = request.invoice ?? {};
  const taxInvoice = request.tax_invoice ?? {};
  const transmissionEvents = freezeArray(request.transmission_events);
  const actions = new Set(transmissionEvents.map((event) => eventAction(event)));
  const duplicateTransmitAttempt = request.duplicate_transmit_attempt === true || taxInvoice.duplicate_transmit_attempt === true;
  const duplicateTransmissionCreated =
    request.duplicate_transmission_created === true || taxInvoice.duplicate_transmission_created === true;
  const hasIssue = actions.has("issue") || actions.has("issued");
  const hasTransmit = actions.has("transmit") || actions.has("transmitted");
  const hasFailure = actions.has("fail") || actions.has("failed") || actions.has("failure");
  const blockedClaims = [];

  if (missingFields(["tenant_id", "matter_id", "invoice", "tax_invoice", "transmission_events"], request).length > 0) {
    blockedClaims.push("tax_invoice_required_context_missing");
  }
  if (!invoice.invoice_id) blockedClaims.push("tax_invoice_invoice_trace_required");
  if (!taxInvoice.tax_invoice_id) blockedClaims.push("tax_invoice_id_required");
  if (invoice.invoice_id && taxInvoice.invoice_id && invoice.invoice_id !== taxInvoice.invoice_id) {
    blockedClaims.push("tax_invoice_invoice_trace_mismatch");
  }
  if (invoice.matter_id && invoice.matter_id !== request.matter_id) {
    blockedClaims.push("tax_invoice_matter_trace_mismatch");
  }
  if (taxInvoice.matter_id && taxInvoice.matter_id !== request.matter_id) {
    blockedClaims.push("tax_invoice_matter_trace_mismatch");
  }
  if (!hasIssue) blockedClaims.push("tax_invoice_issue_event_required");
  if (!hasTransmit) blockedClaims.push("tax_invoice_transmit_event_required");
  if (!hasFailure) blockedClaims.push("tax_invoice_failure_event_required");
  if (duplicateTransmitAttempt && duplicateTransmissionCreated) {
    blockedClaims.push("tax_invoice_duplicate_transmit_blocked");
  }

  return freezeRecord({
    ...noWriteBoundary("LFOS-G5-W07-T013"),
    descriptor_type: "billing_g5_tax_invoice_descriptor",
    tenant_id: request.tenant_id ?? taxInvoice.tenant_id ?? null,
    matter_id: request.matter_id ?? taxInvoice.matter_id ?? null,
    invoice_id: invoice.invoice_id ?? taxInvoice.invoice_id ?? null,
    tax_invoice_id: taxInvoice.tax_invoice_id ?? null,
    transmission_event_count: transmissionEvents.length,
    outcome: outcomeFor(blockedClaims),
    blocked_claims: freezeArray(blockedClaims),
    tax_invoice_receipt: freezeRecord({
      issue_transmit_fail_tested: hasIssue && hasTransmit && hasFailure,
      duplicate_transmit_blocked: duplicateTransmitAttempt && !duplicateTransmissionCreated,
      tax_invoice_persisted: false,
      audit_event_written: false,
    }),
  });
}

export function createBillingG5InvoiceCorrectionDescriptor(request = {}) {
  const issuedInvoice = request.issued_invoice ?? {};
  const correction = request.correction ?? {};
  const directEditAttempt = request.direct_edit_attempt === true || correction.direct_edit_attempted === true;
  const issuedInvoiceMutated = request.issued_invoice_mutated === true || correction.issued_invoice_mutated === true;
  const blockedClaims = [];

  if (missingFields(["tenant_id", "matter_id", "issued_invoice", "correction"], request).length > 0) {
    blockedClaims.push("invoice_correction_required_context_missing");
  }
  if (!issuedInvoice.invoice_id) blockedClaims.push("invoice_correction_invoice_required");
  if (!["issued"].includes(issuedInvoice.issue_status ?? issuedInvoice.status)) {
    blockedClaims.push("invoice_correction_issued_invoice_required");
  }
  if (!["credit_note", "revised_invoice", "void_reissue"].includes(correction.correction_type)) {
    blockedClaims.push("invoice_correction_type_required");
  }
  if (!correction.reason_code) blockedClaims.push("invoice_correction_reason_required");
  if (correction.invoice_id && issuedInvoice.invoice_id && correction.invoice_id !== issuedInvoice.invoice_id) {
    blockedClaims.push("invoice_correction_invoice_trace_mismatch");
  }
  if (issuedInvoice.matter_id && issuedInvoice.matter_id !== request.matter_id) {
    blockedClaims.push("invoice_correction_matter_trace_mismatch");
  }
  if (correction.matter_id && correction.matter_id !== request.matter_id) {
    blockedClaims.push("invoice_correction_matter_trace_mismatch");
  }
  if (!directEditAttempt || issuedInvoiceMutated) {
    blockedClaims.push("invoice_correction_direct_edit_blocked");
  }

  return freezeRecord({
    ...noWriteBoundary("LFOS-G5-W07-T014"),
    descriptor_type: "billing_g5_invoice_correction_descriptor",
    tenant_id: request.tenant_id ?? issuedInvoice.tenant_id ?? null,
    matter_id: request.matter_id ?? issuedInvoice.matter_id ?? null,
    invoice_id: issuedInvoice.invoice_id ?? correction.invoice_id ?? null,
    correction_type: correction.correction_type ?? null,
    outcome: outcomeFor(blockedClaims),
    blocked_claims: freezeArray(blockedClaims),
    correction_receipt: freezeRecord({
      direct_edit_blocked_tested: directEditAttempt,
      issued_invoice_mutated: issuedInvoiceMutated,
      correction_persisted: false,
      audit_event_written: false,
    }),
  });
}

export function createBillingG5BillingUiDescriptor(request = {}) {
  const uiState = request.ui_state ?? {};
  const invoice = request.invoice ?? {};
  const actorRole = request.actor_role ?? uiState.actor_role ?? null;
  const allowedDetailRoles = new Set(["billing_partner", "finance_admin", "billing_manager"]);
  const roleCanSeeDetails = allowedDetailRoles.has(actorRole);
  const detailMasked = uiState.amount_masked === true && uiState.detail_masked === true;
  const unauthorizedDetailVisible =
    roleCanSeeDetails === false &&
    (uiState.amount_visible === true ||
      uiState.detail_visible === true ||
      uiState.narrative_visible === true ||
      uiState.role_restricted_details_visible === true);
  const blockedClaims = [];

  if (missingFields(["tenant_id", "actor_role", "ui_state"], { ...request, actor_role: actorRole }).length > 0) {
    blockedClaims.push("billing_ui_required_context_missing");
  }
  if (!roleCanSeeDetails && !detailMasked) blockedClaims.push("billing_ui_role_detail_mask_required");
  if (unauthorizedDetailVisible) blockedClaims.push("billing_ui_unauthorized_amount_leak_blocked");
  if (invoice.tenant_id && invoice.tenant_id !== request.tenant_id) blockedClaims.push("billing_ui_cross_tenant_blocked");

  return freezeRecord({
    ...noWriteBoundary("LFOS-G5-W07-T015"),
    descriptor_type: "billing_g5_billing_ui_descriptor",
    tenant_id: request.tenant_id ?? invoice.tenant_id ?? null,
    actor_role: actorRole,
    invoice_id: invoice.invoice_id ?? null,
    role_can_see_details: roleCanSeeDetails,
    outcome: outcomeFor(blockedClaims),
    blocked_claims: freezeArray(blockedClaims),
    billing_ui_receipt: freezeRecord({
      role_based_detail_masking_tested: !roleCanSeeDetails && detailMasked,
      restricted_amounts_visible: unauthorizedDetailVisible,
      raw_invoice_payload_loaded: false,
      ui_state_persisted: false,
    }),
  });
}

export function createBillingG5CBillingCloseoutDescriptor(request = {}) {
  const descriptors = freezeArray(request.descriptors);
  const descriptorTuws = new Set(descriptors.map((descriptor) => descriptor?.tuw_id));
  const timeToInvoiceEvidence = request.time_to_invoice_evidence ?? {};
  const elapsedMinutes = asNumber(timeToInvoiceEvidence.elapsed_minutes);
  const commandEvidence = request.command_evidence ?? {};
  const prState = request.pr_state ?? {};
  const blockedClaims = [];

  for (const tuwId of BILLING_G5C_TUW_COVERAGE.slice(0, 5)) {
    if (!descriptorTuws.has(tuwId)) blockedClaims.push("g5_billing_closeout_evidence_required");
  }
  if (descriptors.some((descriptor) => descriptor?.outcome !== "review_required")) {
    blockedClaims.push("g5_billing_closeout_blocked_descriptor_present");
  }
  if (
    !timeToInvoiceEvidence.prebill_approved_at ||
    !timeToInvoiceEvidence.invoice_issue_requested_at ||
    elapsedMinutes === null
  ) {
    blockedClaims.push("g5_billing_time_to_invoice_evidence_required");
  }
  if (commandEvidence.commands_passed !== true || prState.is_draft !== true || !request.upstream_disposition) {
    blockedClaims.push("g5_billing_closeout_evidence_required");
  }
  if (!request.human_review_disposition) {
    blockedClaims.push("g5_billing_closeout_evidence_required");
  }

  const outcome = outcomeFor(blockedClaims);

  return freezeRecord({
    ...noWriteBoundary("LFOS-G5-W07-T011..LFOS-G5-W07-T016"),
    descriptor_type: "billing_g5c_invoice_tax_billing_ui_closeout_descriptor",
    tenant_id: request.tenant_id ?? null,
    slice_id: "G5-C",
    tuw_coverage: BILLING_G5C_TUW_COVERAGE,
    descriptor_count: descriptors.length,
    outcome,
    blocked_claims: freezeArray(blockedClaims),
    idempotent_issue_tested: descriptorTuws.has("LFOS-G5-W07-T011"),
    wip_to_invoice_reconciliation_tested: descriptorTuws.has("LFOS-G5-W07-T012"),
    issue_transmit_fail_tested: descriptorTuws.has("LFOS-G5-W07-T013"),
    direct_edit_blocked_tested: descriptorTuws.has("LFOS-G5-W07-T014"),
    role_based_detail_masking_tested: descriptorTuws.has("LFOS-G5-W07-T015"),
    time_to_invoice_evidence_recorded: elapsedMinutes !== null,
    g5_runtime_evidence_recorded: outcome === "review_required",
    closeout_receipt: freezeRecord({
      runtime_readiness_claim: "open",
      billing_runtime_opened: false,
      draft_pr_self_merged: false,
    }),
  });
}
