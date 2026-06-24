const REVIEW_STATES = Object.freeze(["pending_review", "reviewed", "escalated", "blocked"]);
const REVIEW_TYPES = Object.freeze(["conflict_check", "ethical_wall"]);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function optionalString(input, field) {
  const value = input?.[field];
  if (value === undefined || value === null || String(value).trim() === "") return null;
  return String(value).trim();
}

function requireOneOf(value, allowed, field) {
  if (!allowed.includes(value)) throw new TypeError(`${field} must be one of ${allowed.join(", ")}`);
  return value;
}

function tenantRows(rows, tenantId) {
  return rows.filter((row) => row.tenant_id === tenantId);
}

function countBy(rows, field) {
  return Object.freeze(rows.reduce((acc, row) => {
    const key = row[field] ?? "unknown";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {}));
}

function canViewReviewerDetails(permissionContext = {}) {
  return permissionContext.can_view_sensitive_relationship_details === true;
}

export function createEthicsReviewQueueItem(input = {}) {
  const state = requireOneOf(input.state ?? "pending_review", REVIEW_STATES, "state");
  const review_type = requireOneOf(input.review_type ?? "conflict_check", REVIEW_TYPES, "review_type");
  return Object.freeze({
    schema_version: "lawos.lcx_ppl.ethics_review_queue_item.v0.1",
    tenant_id: requiredString(input, "tenant_id"),
    review_item_id: requiredString(input, "review_item_id"),
    review_type,
    subject_person_id: requiredString(input, "subject_person_id"),
    related_ref: requiredString(input, "related_ref"),
    matter_id: optionalString(input, "matter_id"),
    client_id: optionalString(input, "client_id"),
    state,
    priority: input.priority ?? "normal",
    reviewer_role_required: input.reviewer_role_required ?? "conflicts_reviewer",
    reviewer_required: true,
    source_ref: input.source_ref ?? `LegalPeopleEthics:${input.review_item_id}`,
    ai_signal_state: "supporting_signal_only",
    ai_final_decision_allowed: false,
    final_decision: false,
    reviewer_receipt_id: optionalString(input, "reviewer_receipt_id"),
    created_at: input.created_at ?? "2026-06-24T00:00:00.000Z",
    updated_at: input.updated_at ?? "2026-06-24T00:00:00.000Z"
  });
}

export function createEthicalWallDisplay(input = {}) {
  return Object.freeze({
    schema_version: "lawos.lcx_ppl.ethical_wall_display.v0.1",
    tenant_id: requiredString(input, "tenant_id"),
    wall_ref_id: requiredString(input, "wall_ref_id"),
    subject_person_id: requiredString(input, "subject_person_id"),
    matter_id: requiredString(input, "matter_id"),
    wall_status: input.wall_status ?? "review_required",
    access_effect: input.access_effect ?? "review_required",
    reason_code: input.reason_code ?? "relationship_sensitive",
    evidence_ref: input.evidence_ref ?? `Evidence:${input.wall_ref_id}`,
    reviewer_receipt_id: optionalString(input, "reviewer_receipt_id"),
    restricted_notice: "reviewer_required",
    raw_reason_payload_included: false,
    ai_final_decision_allowed: false,
    final_decision: false
  });
}

export function createEthicsPermissionLink(input = {}) {
  return Object.freeze({
    schema_version: "lawos.lcx_ppl.ethics_permission_link.v0.1",
    tenant_id: requiredString(input, "tenant_id"),
    link_id: requiredString(input, "link_id"),
    sensitive_field: requiredString(input, "sensitive_field"),
    people_surface_ref: input.people_surface_ref ?? "People:legal-people-conflicts",
    admin_surface_ref: input.admin_surface_ref ?? "People:permission-admin",
    permission_set_id: input.permission_set_id ?? "permission_set_client_matter_reviewer",
    required_role: input.required_role ?? "conflicts_reviewer",
    visible_to_roles: Object.freeze([...(input.visible_to_roles ?? ["security_admin", "legal_ops", "conflicts_reviewer"])]),
    field_visibility: input.field_visibility ?? "restricted_until_review",
    sensitive_fields_visible: input.sensitive_fields_visible === true,
    agrees_with_people_permission: true,
    production_ready_claim: false
  });
}

export function createReviewerReceipt(input = {}) {
  return Object.freeze({
    schema_version: "lawos.lcx_ppl.reviewer_receipt.v0.1",
    tenant_id: requiredString(input, "tenant_id"),
    receipt_id: requiredString(input, "receipt_id"),
    review_item_id: requiredString(input, "review_item_id"),
    reviewer_id: requiredString(input, "reviewer_id"),
    reviewer_role: input.reviewer_role ?? "conflicts_reviewer",
    decision: input.decision ?? "needs_human_review",
    decided_at: input.decided_at ?? "2026-06-24T00:00:00.000Z",
    notes_ref: input.notes_ref ?? `ReceiptNotes:${input.receipt_id}`,
    rollback_ref: input.rollback_ref ?? `Rollback:${input.receipt_id}`,
    audit_ref: input.audit_ref ?? `Audit:${input.receipt_id}`,
    raw_notes_included: false,
    ai_final_decision_allowed: false,
    production_ready_claim: false
  });
}

export function createLegalPeopleEthicsSeed(tenantId = "tenant-a") {
  const tenant_id = requiredString({ tenant_id: tenantId }, "tenant_id");
  const review_queue = Object.freeze([
    createEthicsReviewQueueItem({
      tenant_id,
      review_item_id: "ethics_review_conflict_pending_001",
      review_type: "conflict_check",
      subject_person_id: "person_counterparty_001",
      related_ref: "client:client_lcx_001",
      client_id: "client_lcx_001",
      state: "pending_review",
      priority: "high"
    }),
    createEthicsReviewQueueItem({
      tenant_id,
      review_item_id: "ethics_review_wall_reviewed_001",
      review_type: "ethical_wall",
      subject_person_id: "person_internal_lawyer_001",
      related_ref: "matter:matter_lcx_001",
      matter_id: "matter_lcx_001",
      state: "reviewed",
      reviewer_receipt_id: "receipt_wall_reviewed_001"
    }),
    createEthicsReviewQueueItem({
      tenant_id,
      review_item_id: "ethics_review_conflict_escalated_001",
      review_type: "conflict_check",
      subject_person_id: "person_opposing_counsel_001",
      related_ref: "matter:matter_lcx_001",
      matter_id: "matter_lcx_001",
      state: "escalated",
      priority: "urgent",
      reviewer_receipt_id: "receipt_conflict_escalated_001"
    }),
    createEthicsReviewQueueItem({
      tenant_id,
      review_item_id: "ethics_review_wall_blocked_001",
      review_type: "ethical_wall",
      subject_person_id: "person_expert_witness_001",
      related_ref: "matter:matter_lcx_001",
      matter_id: "matter_lcx_001",
      state: "blocked",
      priority: "high",
      reviewer_receipt_id: "receipt_wall_blocked_001"
    })
  ]);

  return Object.freeze({
    review_queue,
    ethical_walls: Object.freeze([
      createEthicalWallDisplay({
        tenant_id,
        wall_ref_id: "wall_ref_lcx_001",
        subject_person_id: "person_internal_lawyer_001",
        matter_id: "matter_lcx_001",
        wall_status: "review_required",
        access_effect: "review_required",
        reviewer_receipt_id: "receipt_wall_reviewed_001"
      }),
      createEthicalWallDisplay({
        tenant_id,
        wall_ref_id: "wall_ref_lcx_blocked_001",
        subject_person_id: "person_expert_witness_001",
        matter_id: "matter_lcx_001",
        wall_status: "blocked",
        access_effect: "blocked",
        reviewer_receipt_id: "receipt_wall_blocked_001"
      })
    ]),
    permission_links: Object.freeze([
      createEthicsPermissionLink({
        tenant_id,
        link_id: "ethics_permission_conflict_sensitive_refs",
        sensitive_field: "conflict_references",
        required_role: "conflicts_reviewer"
      }),
      createEthicsPermissionLink({
        tenant_id,
        link_id: "ethics_permission_wall_sensitive_refs",
        sensitive_field: "ethical_wall_references",
        required_role: "legal_ops"
      })
    ]),
    reviewer_receipts: Object.freeze([
      createReviewerReceipt({
        tenant_id,
        receipt_id: "receipt_wall_reviewed_001",
        review_item_id: "ethics_review_wall_reviewed_001",
        reviewer_id: "reviewer-legal-001",
        decision: "allow_limited_reference"
      }),
      createReviewerReceipt({
        tenant_id,
        receipt_id: "receipt_conflict_escalated_001",
        review_item_id: "ethics_review_conflict_escalated_001",
        reviewer_id: "reviewer-conflicts-001",
        decision: "escalate"
      }),
      createReviewerReceipt({
        tenant_id,
        receipt_id: "receipt_wall_blocked_001",
        review_item_id: "ethics_review_wall_blocked_001",
        reviewer_id: "reviewer-conflicts-002",
        decision: "block_access"
      })
    ])
  });
}

function visibleReceipt(receipt, permissionContext) {
  if (canViewReviewerDetails(permissionContext)) return Object.freeze(clone(receipt));
  return Object.freeze({
    schema_version: receipt.schema_version,
    tenant_id: receipt.tenant_id,
    receipt_id: receipt.receipt_id,
    review_item_id: receipt.review_item_id,
    reviewer_role: receipt.reviewer_role,
    decision: "restricted_reference",
    reviewer_id: null,
    decided_at: null,
    notes_ref: null,
    rollback_ref: null,
    audit_ref: null,
    raw_notes_included: false,
    ai_final_decision_allowed: false,
    production_ready_claim: false,
    access_state: "restricted"
  });
}

export function createLegalPeopleEthicsReadModel({ seed } = {}) {
  const sourceSeed = seed ?? createLegalPeopleEthicsSeed();
  const reviewQueue = Object.freeze([...(sourceSeed.review_queue ?? [])].map(clone));
  const ethicalWalls = Object.freeze([...(sourceSeed.ethical_walls ?? [])].map(clone));
  const permissionLinks = Object.freeze([...(sourceSeed.permission_links ?? [])].map(clone));
  const reviewerReceipts = Object.freeze([...(sourceSeed.reviewer_receipts ?? [])].map(clone));

  function getEthicsOverview(query = {}, permissionContext = {}) {
    const tenant_id = requiredString(query, "tenant_id");
    const personId = optionalString(query, "person_id");
    const matterId = optionalString(query, "matter_id");
    const state = optionalString(query, "state");
    const reviewType = optionalString(query, "review_type");
    const rows = tenantRows(reviewQueue, tenant_id)
      .filter((item) => !personId || item.subject_person_id === personId)
      .filter((item) => !matterId || item.matter_id === matterId)
      .filter((item) => !state || item.state === state)
      .filter((item) => !reviewType || item.review_type === reviewType);
    const walls = tenantRows(ethicalWalls, tenant_id)
      .filter((item) => !personId || item.subject_person_id === personId)
      .filter((item) => !matterId || item.matter_id === matterId);
    const receipts = tenantRows(reviewerReceipts, tenant_id)
      .filter((receipt) => rows.some((item) => item.reviewer_receipt_id === receipt.receipt_id))
      .map((receipt) => visibleReceipt(receipt, permissionContext));

    return Object.freeze({
      schema_version: "lawos.lcx_ppl.ethics_surface_response.v0.1",
      outcome: "ok",
      review_queue: Object.freeze(rows.map((row) => Object.freeze(clone(row)))),
      ethical_walls: Object.freeze(walls.map((row) => Object.freeze(clone(row)))),
      permission_links: Object.freeze(tenantRows(permissionLinks, tenant_id).map((row) => Object.freeze(clone(row)))),
      reviewer_receipts: Object.freeze(receipts),
      state_counts: countBy(rows, "state"),
      filters: Object.freeze({
        person_id: personId,
        matter_id: matterId,
        state,
        review_type: reviewType
      }),
      permission_summary: Object.freeze({
        can_view_reviewer_details: canViewReviewerDetails(permissionContext),
        sensitive_fields_visible: permissionContext.can_view_sensitive_relationship_details === true,
        ai_final_decision_allowed: false
      }),
      claim_boundary: LCX_PPL_ETHICS_BOUNDARY
    });
  }

  return Object.freeze({ getEthicsOverview });
}

export const LCX_PPL_ETHICS_BOUNDARY = Object.freeze({
  ethical_wall_ui_complete: true,
  conflict_review_queue_complete: true,
  permission_admin_linkage_complete: true,
  reviewer_receipt_model_complete: true,
  browser_qa_complete: false,
  runtime_ready_candidate_complete: false,
  production_ready: false,
  go_live_approved: false,
  enterprise_trust_approved: false,
  raw_notes_included: false,
  ai_final_decision_allowed: false
});
