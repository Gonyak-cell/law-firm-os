import assert from "node:assert/strict";
import test from "node:test";

import {
  createMatterG4AOpeningFoundationCloseoutDescriptor,
  createMatterG4Member,
  createMatterG4OpeningRecord,
  createMatterMemberPermissionDescriptor,
  createMatterNumberReservationDescriptor,
  createMatterOpeningTransactionDescriptor,
  MATTER_G4A_MEMBER_ROLES,
  validateMatterCoreRecord,
} from "../src/index.js";

const tenant_id = "tenant_g4a_validator";
const actor_id = "actor_g4a_validator";

function clearanceToken(overrides = {}) {
  return {
    clearance_token_id: "clearance_g4a",
    tenant_id,
    intake_request_id: "intake_g4a",
    conflict_check_id: "conflict_check_g4a",
    engagement_id: "engagement_g4a",
    snapshot_hash: "snapshot:g4a",
    token_state: "candidate",
    outcome: "review_required",
    blocked_claims: [],
    clearance_receipt: {
      valid_for_runtime_matter_opening: false,
    },
    ...overrides,
  };
}

function matterRecord(overrides = {}) {
  return createMatterG4OpeningRecord({
    matter_id: "matter_g4a",
    tenant_id,
    legal_client_party_id: "party_g4a_legal_client",
    billing_profile_id: "billing_profile_g4a",
    title: "G4-A synthetic matter opening",
    created_by: actor_id,
    created_at: "2026-06-19T00:00:00.000Z",
    permission_envelope_id: "perm_g4a_matter",
    audit_trace_id: "audit_g4a_matter",
    matter_number: "M-G4A-001",
    clearance_token: clearanceToken(),
    ...overrides,
  });
}

test("G4-A Matter opening record requires G3 clearance token evidence", () => {
  assert.throws(
    () =>
      createMatterG4OpeningRecord({
        matter_id: "matter_missing_clearance",
        tenant_id,
        legal_client_party_id: "party_g4a_legal_client",
        title: "Missing clearance",
        created_by: actor_id,
        created_at: "2026-06-19T00:00:00.000Z",
        permission_envelope_id: "perm_g4a_matter",
        audit_trace_id: "audit_g4a_matter",
      }),
    /G3 clearance token/,
  );

  const matter = matterRecord();
  const validation = validateMatterCoreRecord("Matter", matter, { expected_tenant_id: tenant_id });

  assert.equal(validation.valid, true);
  assert.equal(matter.clearance_token_id, "clearance_g4a");
  assert.equal(matter.intake_request_id, "intake_g4a");
  assert.equal(matter.legal_client_party_id, "party_g4a_legal_client");
  assert.equal(matter.client_id, "party_g4a_legal_client");
  assert.equal(matter.g3_clearance_required_before_matter_opening, true);
  assert.equal(matter.opportunity_to_matter_shortcut_blocked, true);
  assert.equal(matter.writes_product_state, false);
  assert.equal(matter.g4_runtime_readiness_claim, "open");
});

test("G4-A Matter opening blocks direct Opportunity-to-Matter shortcut", () => {
  assert.throws(
    () =>
      matterRecord({
        opportunity_id: "opportunity_g4a_shortcut",
        intake_request_id: "",
        clearance_token: clearanceToken({ intake_request_id: "intake_g4a" }),
      }),
    /cannot bypass Intake clearance/,
  );
});

test("G4-A matter number reservation is idempotent and duplicate-safe", () => {
  const first = createMatterNumberReservationDescriptor({
    tenant_id,
    matter_number_seed: "2026 commercial dispute 0001",
    idempotency_key: "idem:g4a:number",
  });

  assert.equal(first.outcome, "review_required");
  assert.equal(first.matter_number, "M-TENANT-G4A-VALIDATOR-2026-COMMERCIAL-DISPUTE-0001");
  assert.equal(first.reservation_receipt.reservation_persisted, false);

  const replay = createMatterNumberReservationDescriptor({
    tenant_id,
    matter_number_seed: "2026 commercial dispute 0001",
    idempotency_key: "idem:g4a:number",
    existing_reservations: [first],
  });

  assert.equal(replay.outcome, "review_required");
  assert.equal(replay.idempotent_replay_detected, true);
  assert.equal(replay.matter_number, first.matter_number);

  const duplicate = createMatterNumberReservationDescriptor({
    tenant_id,
    matter_number_seed: "2026 commercial dispute 0001",
    idempotency_key: "idem:g4a:other",
    existing_reservations: [first],
  });

  assert.equal(duplicate.outcome, "blocked");
  assert.ok(duplicate.blocked_claims.includes("matter_number_duplicate_detected"));
});

test("G4-A Matter opening transaction requires atomic ACL, DMS, and Billing refs", () => {
  const matter = matterRecord();
  const reservation = createMatterNumberReservationDescriptor({
    tenant_id,
    matter_number_seed: "2026 commercial dispute 0001",
    idempotency_key: "idem:g4a:number",
  });

  const blocked = createMatterOpeningTransactionDescriptor({
    tenant_id,
    actor_id,
    matter,
    matter_number_reservation: reservation,
    acl_ref: "acl:g4a",
    billing_ref: "billing:g4a",
    idempotency_key: "idem:g4a:opening",
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("opening_transaction_atomic_refs_required"));

  const descriptor = createMatterOpeningTransactionDescriptor({
    tenant_id,
    actor_id,
    matter,
    matter_number_reservation: reservation,
    acl_ref: "acl:g4a",
    dms_workspace_ref: "dms-workspace:g4a",
    billing_ref: "billing:g4a",
    idempotency_key: "idem:g4a:opening",
  });

  assert.equal(descriptor.outcome, "review_required");
  assert.equal(descriptor.transaction_receipt.atomic_commit_required, true);
  assert.equal(descriptor.transaction_receipt.partial_state_allowed, false);
  assert.equal(descriptor.transaction_receipt.transaction_persisted, false);
  assert.equal(descriptor.atomic_refs.dms_workspace_ref, "dms-workspace:g4a");
});

test("G4-A MatterMember permission descriptor validates member role permissions", () => {
  assert.ok(MATTER_G4A_MEMBER_ROLES.includes("responsible_attorney"));

  const matter = matterRecord();
  const member = createMatterG4Member({
    member_id: "member_g4a_owner",
    tenant_id,
    matter_id: matter.matter_id,
    user_id: "user_g4a_owner",
    role: "responsible_attorney",
    status: "active",
    permission_envelope_id: "perm_g4a_member",
    audit_trace_id: "audit_g4a_member",
  });

  const blocked = createMatterMemberPermissionDescriptor({
    tenant_id,
    actor_id,
    matter,
    member: { ...member, role: "unknown_role" },
    role_permissions: {
      responsible_attorney: true,
    },
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("matter_member_role_unknown"));
  assert.ok(blocked.blocked_claims.includes("member_role_permission_required"));

  const descriptor = createMatterMemberPermissionDescriptor({
    tenant_id,
    actor_id,
    matter,
    member,
    role_permissions: {
      responsible_attorney: true,
    },
  });

  assert.equal(descriptor.outcome, "review_required");
  assert.equal(descriptor.permission_receipt.role_permission_required, true);
  assert.equal(descriptor.permission_receipt.permission_evaluated, false);
  assert.equal(descriptor.permission_receipt.member_write_persisted, false);
  assert.equal(descriptor.g4_runtime_readiness_claim, "open");
});

test("G4-A closeout descriptor summarizes opening foundation evidence without runtime claim", () => {
  const matter = matterRecord();
  const reservation = createMatterNumberReservationDescriptor({
    tenant_id,
    matter_number_seed: "2026 commercial dispute 0001",
    idempotency_key: "idem:g4a:number",
  });
  const transaction = createMatterOpeningTransactionDescriptor({
    tenant_id,
    actor_id,
    matter,
    matter_number_reservation: reservation,
    acl_ref: "acl:g4a",
    dms_workspace_ref: "dms-workspace:g4a",
    billing_ref: "billing:g4a",
    idempotency_key: "idem:g4a:opening",
  });
  const member = createMatterG4Member({
    member_id: "member_g4a_owner",
    tenant_id,
    matter_id: matter.matter_id,
    user_id: "user_g4a_owner",
    role: "responsible_attorney",
    status: "active",
    permission_envelope_id: "perm_g4a_member",
    audit_trace_id: "audit_g4a_member",
  });
  const memberPermission = createMatterMemberPermissionDescriptor({
    tenant_id,
    actor_id,
    matter,
    member,
    role_permissions: {
      responsible_attorney: true,
    },
  });

  const closeout = createMatterG4AOpeningFoundationCloseoutDescriptor({
    tenant_id,
    descriptors: [matter, reservation, transaction, memberPermission],
  });

  assert.equal(closeout.outcome, "review_required");
  assert.deepEqual(closeout.tuw_coverage, [
    "LFOS-G4-W05-T001",
    "LFOS-G4-W05-T002",
    "LFOS-G4-W05-T003",
    "LFOS-G4-W05-T004",
  ]);
  assert.equal(closeout.matter_number_idempotency_tested, true);
  assert.equal(closeout.opening_transaction_atomic_refs_tested, true);
  assert.equal(closeout.matter_member_role_permission_tested, true);
  assert.equal(closeout.closeout_receipt.runtime_readiness_claim, "open");
});
