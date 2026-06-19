export const BILLING_G5B_TUW_COVERAGE = Object.freeze([
  "LFOS-G5-W07-T007",
  "LFOS-G5-W07-T008",
  "LFOS-G5-W07-T009",
  "LFOS-G5-W07-T010",
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
