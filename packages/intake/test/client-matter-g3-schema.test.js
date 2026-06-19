import assert from "node:assert/strict";
import test from "node:test";

import {
  createIntakeCoreConflictCheck,
  createIntakeCoreConflictHit,
  createIntakeCoreIntakeRequest,
  createIntakeCoreRecord,
  listIntakeCoreModelTypes,
  validateIntakeCoreRecord,
} from "../src/index.js";

const tenant_id = "tenant_g3c_validator";
const owner_user_id = "user_g3c_owner";
const party_ids = ["party_g3c_client", "party_g3c_counterparty"];

test("G3-C IntakeRequest requires parties and blocks pre-clearance Matter creation", () => {
  assert.throws(
    () =>
      createIntakeCoreIntakeRequest({
        intake_request_id: "intake_g3c_missing_parties",
        tenant_id,
        opportunity_id: "opp_g3c",
        requesting_party_id: party_ids[0],
        party_ids: [],
        status: "open",
        owner_user_id,
      }),
    /party_ids must include at least one Party reference/
  );

  assert.throws(
    () =>
      createIntakeCoreIntakeRequest({
        intake_request_id: "intake_g3c_matter_shortcut",
        tenant_id,
        opportunity_id: "opp_g3c",
        requesting_party_id: party_ids[0],
        party_ids,
        status: "open",
        owner_user_id,
        create_matter: true,
      }),
    /cannot create or reference Matter before Intake clearance/
  );

  const intakeRequest = createIntakeCoreIntakeRequest({
    intake_request_id: "intake_g3c_schema",
    tenant_id,
    opportunity_id: "opp_g3c",
    requesting_party_id: party_ids[0],
    party_ids,
    requested_scope_summary: "Synthetic intake request for G3-C",
    status: "open",
    owner_user_id,
  });

  const validation = validateIntakeCoreRecord("IntakeRequest", intakeRequest);
  assert.equal(intakeRequest.party_ids.length, 2);
  assert.equal(intakeRequest.matter_id, null);
  assert.equal(intakeRequest.creates_matter, false);
  assert.equal(intakeRequest.writes_product_state, false);
  assert.equal(intakeRequest.g3_runtime_readiness_claim, "open");
  assert.equal(validation.valid, true);
});

test("G3-C ConflictCheck freezes party snapshot evidence", () => {
  const originalSnapshotPartyIds = ["party_g3c_client", "party_g3c_counterparty"];
  const mutableSnapshot = {
    party_ids: [...originalSnapshotPartyIds],
    aliases: [{ party_id: party_ids[0], alias_value: "AMIC Korea" }],
    relationships: [{ from_party_id: party_ids[0], to_party_id: party_ids[1], relationship_type: "adverse" }],
  };

  const conflictCheck = createIntakeCoreConflictCheck({
    conflict_check_id: "conflict_check_g3c_schema",
    tenant_id,
    intake_request_id: "intake_g3c_schema",
    party_snapshot: mutableSnapshot,
    snapshot_recorded_at: "2026-06-19T00:00:00.000Z",
    status: "snapshot_recorded",
    owner_user_id,
  });

  mutableSnapshot.party_ids.push("party_should_not_appear");
  mutableSnapshot.aliases[0].alias_value = "MUTATED";

  const validation = validateIntakeCoreRecord("ConflictCheck", conflictCheck);
  assert.equal(conflictCheck.immutable_snapshot, true);
  assert.equal(Object.isFrozen(conflictCheck.party_snapshot), true);
  assert.equal(Object.isFrozen(conflictCheck.party_snapshot.aliases[0]), true);
  assert.deepEqual(conflictCheck.party_snapshot.party_ids, originalSnapshotPartyIds);
  assert.equal(conflictCheck.party_snapshot.aliases[0].alias_value, "AMIC Korea");
  assert.equal(validation.valid, true);
  assert.deepEqual(validation.review_required_claims, ["conflict_snapshot_review_required"]);
});

test("G3-C ConflictHit requires audited hit source evidence", () => {
  assert.throws(
    () =>
      createIntakeCoreConflictHit({
        conflict_hit_id: "conflict_hit_g3c_bad_source",
        tenant_id,
        conflict_check_id: "conflict_check_g3c_schema",
        matched_party_id: party_ids[1],
        hit_source: "untracked_source",
        source_record_ref: "former_matter:001",
        severity: "high",
        audit_hint_ref: "audit_hint_g3c",
        status: "review_required",
        owner_user_id,
      }),
    /hit_source must be one of/
  );

  assert.throws(
    () =>
      createIntakeCoreConflictHit({
        conflict_hit_id: "conflict_hit_g3c_missing_audit",
        tenant_id,
        conflict_check_id: "conflict_check_g3c_schema",
        matched_party_id: party_ids[1],
        hit_source: "former_matter",
        source_record_ref: "former_matter:001",
        severity: "high",
        status: "review_required",
        owner_user_id,
      }),
    /missing required fields: audit_hint_ref/
  );

  const conflictHit = createIntakeCoreConflictHit({
    conflict_hit_id: "conflict_hit_g3c_schema",
    tenant_id,
    conflict_check_id: "conflict_check_g3c_schema",
    matched_party_id: party_ids[1],
    hit_source: "former_matter",
    source_record_ref: "former_matter:001",
    severity: "high",
    audit_hint_ref: "audit_hint_g3c_hit_source",
    hit_summary: "Synthetic former matter conflict hit",
    status: "review_required",
    owner_user_id,
  });

  const validation = validateIntakeCoreRecord("ConflictHit", conflictHit);
  assert.equal(conflictHit.hit_source_audit_required, true);
  assert.equal(conflictHit.raw_hit_payload_visible, false);
  assert.equal(conflictHit.audit_hint_ref, "audit_hint_g3c_hit_source");
  assert.equal(validation.valid, true);
  assert.deepEqual(validation.review_required_claims, ["conflict_hit_source_audit_required"]);
});

test("G3-C factory exposes Intake schema model types", () => {
  assert.deepEqual(listIntakeCoreModelTypes(), ["IntakeRequest", "ConflictCheck", "ConflictHit"]);

  const record = createIntakeCoreRecord("IntakeRequest", {
    intake_request_id: "intake_g3c_factory",
    tenant_id,
    opportunity_id: "opp_g3c_factory",
    requesting_party_id: party_ids[0],
    party_ids,
    status: "open",
    owner_user_id,
  });

  assert.equal(record.model_type, "IntakeRequest");
  assert.equal(validateIntakeCoreRecord("IntakeRequest", record).valid, true);
});
