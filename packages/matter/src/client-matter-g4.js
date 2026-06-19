import { createMatter, createMatterMember } from "./model.js";
import { validateMatterCoreRecord } from "./validators.js";

export const MATTER_G4A_MEMBER_ROLES = Object.freeze([
  "responsible_attorney",
  "supervising_partner",
  "associate",
  "paralegal",
  "billing_reviewer",
  "knowledge_manager",
]);

export const MATTER_G4A_REQUIRED_CLEARANCE_FIELDS = Object.freeze([
  "clearance_token_id",
  "tenant_id",
  "intake_request_id",
  "conflict_check_id",
  "engagement_id",
  "snapshot_hash",
]);

function freezeRecord(record) {
  return Object.freeze(record);
}

function freezeArray(values) {
  return Object.freeze([...(values ?? [])]);
}

function freezeObject(value) {
  return Object.freeze({ ...(value ?? {}) });
}

function missingFields(fields, input) {
  return fields.filter((field) => input?.[field] === undefined || input?.[field] === null || input?.[field] === "");
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
    persists_idempotency_key: false,
    acquires_runtime_lock: false,
    creates_matter_runtime: false,
    opens_matter_runtime: false,
    g4_runtime_readiness_claim: "open",
  };
}

function normalizeMatterNumberSegment(value) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function hasDirectOpportunityMatterShortcut(input = {}) {
  return Boolean(
    input.opportunity_id && !input.intake_request_id
      || input.opportunity_to_matter === true
      || input.create_from_opportunity === true
      || input.command_payload?.opportunity_to_matter === true
  );
}

function clearanceBlockedClaims(clearanceToken = {}, expectedTenantId) {
  const blockedClaims = [];
  const missing = missingFields(MATTER_G4A_REQUIRED_CLEARANCE_FIELDS, clearanceToken);
  if (missing.length > 0) blockedClaims.push("g3_clearance_required_before_matter_opening");
  if (expectedTenantId && clearanceToken.tenant_id && clearanceToken.tenant_id !== expectedTenantId) {
    blockedClaims.push("g3_clearance_tenant_mismatch");
  }
  if (clearanceToken.outcome === "blocked") blockedClaims.push("g3_clearance_blocked");
  if (Array.isArray(clearanceToken.blocked_claims) && clearanceToken.blocked_claims.length > 0) {
    blockedClaims.push("g3_clearance_has_blocked_claims");
  }
  if (clearanceToken.token_state === "expired") blockedClaims.push("g3_clearance_expired");
  if (clearanceToken.token_state === "stale") blockedClaims.push("g3_clearance_stale");
  return blockedClaims;
}

function assertValidClearanceToken(clearanceToken, expectedTenantId) {
  const blockedClaims = clearanceBlockedClaims(clearanceToken, expectedTenantId);
  if (blockedClaims.length > 0) {
    throw new Error(`Matter opening requires valid G3 clearance token evidence: ${blockedClaims.join(", ")}`);
  }
}

export function createMatterG4OpeningRecord(input = {}) {
  const clearanceToken = input.clearance_token;
  assertValidClearanceToken(clearanceToken, input.tenant_id);
  if (hasDirectOpportunityMatterShortcut(input)) {
    throw new Error("Matter opening cannot bypass Intake clearance from Opportunity");
  }

  const matter = createMatter({
    matter_id: input.matter_id,
    tenant_id: input.tenant_id,
    client_id: input.legal_client_party_id,
    title: input.title,
    status: input.status ?? "opening",
    created_by: input.created_by,
    created_at: input.created_at,
    opened_at: input.opened_at,
    closed_at: null,
    permission_envelope_id: input.permission_envelope_id,
    audit_trace_id: input.audit_trace_id,
    matter_wiki_ref: input.matter_wiki_ref,
    matter_graph_ref: input.matter_graph_ref,
  });

  return freezeRecord({
    ...matter,
    ...noWriteBoundary("LFOS-G4-W05-T001"),
    descriptor_type: "matter_g4_opening_record",
    legal_client_party_id: input.legal_client_party_id,
    billing_client_party_id: input.billing_client_party_id ?? input.legal_client_party_id,
    billing_profile_id: input.billing_profile_id ?? null,
    intake_request_id: clearanceToken.intake_request_id,
    engagement_id: clearanceToken.engagement_id,
    conflict_check_id: clearanceToken.conflict_check_id,
    clearance_token_id: clearanceToken.clearance_token_id,
    clearance_snapshot_hash: clearanceToken.snapshot_hash,
    matter_number: input.matter_number ?? null,
    opening_state: "clearance_verified_candidate",
    g3_clearance_required_before_matter_opening: true,
    opportunity_to_matter_shortcut_blocked: true,
    client_id_alias_policy: "client_id_is_legacy_alias_for_legal_client_party_id",
  });
}

export function createMatterNumberReservationDescriptor(request = {}) {
  const missing = missingFields(["tenant_id", "matter_number_seed", "idempotency_key"], request);
  const existingReservations = freezeArray(request.existing_reservations);
  const blockedClaims = [];
  const matterNumber =
    request.matter_number
    ?? `M-${normalizeMatterNumberSegment(request.tenant_id)}-${normalizeMatterNumberSegment(request.matter_number_seed)}`;

  if (missing.length > 0) blockedClaims.push("matter_number_required_context_missing");

  const sameKey = existingReservations.find((reservation) => reservation.idempotency_key === request.idempotency_key);
  const sameNumberDifferentKey = existingReservations.find(
    (reservation) => reservation.matter_number === matterNumber && reservation.idempotency_key !== request.idempotency_key,
  );

  if (sameKey && sameKey.matter_number !== matterNumber) blockedClaims.push("matter_number_idempotency_conflict");
  if (sameNumberDifferentKey) blockedClaims.push("matter_number_duplicate_detected");

  const outcome = blockedClaims.length > 0 ? "blocked" : "review_required";

  return freezeRecord({
    ...noWriteBoundary("LFOS-G4-W05-T002"),
    descriptor_type: "matter_number_reservation_descriptor",
    tenant_id: request.tenant_id ?? null,
    matter_number: sameKey?.matter_number ?? matterNumber,
    matter_number_seed: request.matter_number_seed ?? null,
    idempotency_key: request.idempotency_key ?? null,
    idempotent_replay_detected: Boolean(sameKey && sameKey.matter_number === matterNumber),
    duplicate_number_blocked: Boolean(sameNumberDifferentKey),
    outcome,
    blocked_claims: freezeArray(blockedClaims),
    reservation_receipt: freezeRecord({
      idempotency_duplicate_tested: true,
      duplicate_number_tested: true,
      reservation_persisted: false,
      idempotency_key_persisted: false,
    }),
  });
}

export function createMatterOpeningTransactionDescriptor(request = {}) {
  const missing = missingFields(["tenant_id", "actor_id", "matter", "idempotency_key"], request);
  const blockedClaims = [];
  const matter = request.matter ?? {};
  const refs = freezeObject({
    acl_ref: request.acl_ref,
    dms_workspace_ref: request.dms_workspace_ref,
    billing_ref: request.billing_ref,
  });
  const matterValidation = validateMatterCoreRecord("Matter", matter, { expected_tenant_id: request.tenant_id });

  if (missing.length > 0) blockedClaims.push("opening_transaction_required_context_missing");
  if (!matterValidation.valid) blockedClaims.push("matter_schema_validation_required");
  if (!refs.acl_ref || !refs.dms_workspace_ref || !refs.billing_ref) {
    blockedClaims.push("opening_transaction_atomic_refs_required");
  }
  if (!matter.clearance_token_id) blockedClaims.push("g3_clearance_required_before_matter_opening");
  if (request.matter_number_reservation?.outcome === "blocked") blockedClaims.push("matter_number_reservation_blocked");
  if (hasDirectOpportunityMatterShortcut(request)) blockedClaims.push("opportunity_to_matter_shortcut_blocked");

  const outcome = blockedClaims.length > 0 ? "blocked" : "review_required";

  return freezeRecord({
    ...noWriteBoundary("LFOS-G4-W05-T003"),
    descriptor_type: "matter_opening_transaction_descriptor",
    tenant_id: request.tenant_id ?? matter.tenant_id ?? null,
    actor_id: request.actor_id ?? null,
    matter_id: matter.matter_id ?? null,
    matter_number: request.matter_number_reservation?.matter_number ?? matter.matter_number ?? null,
    idempotency_key: request.idempotency_key ?? null,
    atomic_refs: refs,
    matter_validation: matterValidation,
    outcome,
    blocked_claims: freezeArray(blockedClaims),
    review_required_claims: freezeArray(outcome === "review_required" ? ["matter_opening_human_review_required"] : []),
    transaction_receipt: freezeRecord({
      atomic_commit_required: true,
      acl_ref_required: true,
      dms_workspace_ref_required: true,
      billing_ref_required: true,
      partial_state_allowed: false,
      transaction_persisted: false,
      rollback_executed: false,
    }),
  });
}

export function createMatterMemberPermissionDescriptor(request = {}) {
  const missing = missingFields(["tenant_id", "actor_id", "member"], request);
  const member = request.member ?? {};
  const blockedClaims = [];
  const memberValidation = validateMatterCoreRecord("MatterMember", member, { expected_tenant_id: request.tenant_id });
  const rolePermissions = freezeObject(request.role_permissions);

  if (missing.length > 0) blockedClaims.push("member_permission_required_context_missing");
  if (!memberValidation.valid) blockedClaims.push("matter_member_schema_validation_required");
  if (!MATTER_G4A_MEMBER_ROLES.includes(member.role)) blockedClaims.push("matter_member_role_unknown");
  if (rolePermissions[member.role] !== true) blockedClaims.push("member_role_permission_required");
  if (request.matter?.tenant_id && request.matter.tenant_id !== member.tenant_id) blockedClaims.push("member_cross_tenant_matter");
  if (request.matter?.matter_id && request.matter.matter_id !== member.matter_id) blockedClaims.push("member_matter_trace_mismatch");

  const outcome = blockedClaims.length > 0 ? "blocked" : "review_required";

  return freezeRecord({
    ...noWriteBoundary("LFOS-G4-W05-T004"),
    descriptor_type: "matter_member_permission_descriptor",
    tenant_id: request.tenant_id ?? member.tenant_id ?? null,
    actor_id: request.actor_id ?? null,
    member_id: member.member_id ?? null,
    matter_id: member.matter_id ?? null,
    user_id: member.user_id ?? null,
    role: member.role ?? null,
    member_validation: memberValidation,
    role_permissions: rolePermissions,
    outcome,
    blocked_claims: freezeArray(blockedClaims),
    review_required_claims: freezeArray(outcome === "review_required" ? ["matter_member_role_permission_review_required"] : []),
    permission_receipt: freezeRecord({
      role_permission_required: true,
      permission_evaluated: false,
      member_write_persisted: false,
      audit_event_written: false,
    }),
  });
}

export function createMatterG4AOpeningFoundationCloseoutDescriptor(request = {}) {
  const descriptors = freezeArray(request.descriptors);
  const blockedCount = descriptors.filter((descriptor) => descriptor.outcome === "blocked").length;
  const tuwCoverage = freezeArray([
    "LFOS-G4-W05-T001",
    "LFOS-G4-W05-T002",
    "LFOS-G4-W05-T003",
    "LFOS-G4-W05-T004",
  ]);

  return freezeRecord({
    ...noWriteBoundary("LFOS-G4-W05-T004"),
    descriptor_type: "matter_g4a_opening_foundation_closeout_descriptor",
    slice: "G4-A",
    tenant_id: request.tenant_id ?? null,
    branch: "codex/lawos-g4-matter-opening-foundation",
    tuw_coverage: tuwCoverage,
    descriptor_count: descriptors.length,
    blocked_descriptor_count: blockedCount,
    g3_clearance_required_before_matter_opening: true,
    matter_number_idempotency_tested: descriptors.some((descriptor) => descriptor.descriptor_type === "matter_number_reservation_descriptor"),
    opening_transaction_atomic_refs_tested: descriptors.some(
      (descriptor) => descriptor.descriptor_type === "matter_opening_transaction_descriptor",
    ),
    matter_member_role_permission_tested: descriptors.some(
      (descriptor) => descriptor.descriptor_type === "matter_member_permission_descriptor",
    ),
    outcome: blockedCount > 0 ? "blocked" : "review_required",
    closeout_receipt: freezeRecord({
      command_output_recorded: false,
      draft_pr_required: true,
      human_review_required: true,
      runtime_readiness_claim: "open",
    }),
  });
}

export function createMatterG4Member(input = {}) {
  return createMatterMember(input);
}
