import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  createCampaign,
  createCrmActivity,
  createCrmRuntimeRepository,
  createLead,
  createOpportunity,
  createProposal,
  createReferral,
  handoffOpportunityToIntake,
} from "../../crm/src/index.js";
import {
  approveEngagement,
  approveFeeTerms,
  approveRisk,
  approveWaiver,
  createConflictCheck,
  createConflictHit,
  createIntakeRequest,
  createIntakeRuntimeRepository,
  decideConflict,
  executeConflictSearch,
  issueClearanceToken,
  serializeConflictMemo,
  validateClearanceToken,
} from "../src/index.js";

const TENANT = "tenant-cmp-g6";
const ACTOR = "user-cmp-g6";
const PARTY = "party-cmp-g6-client";

function crmRepo() {
  return createCrmRuntimeRepository();
}

function intakeRepo() {
  return createIntakeRuntimeRepository();
}

function opportunityFixture(overrides = {}) {
  return {
    opportunity_id: "opp-cmp-g6-001",
    tenant_id: TENANT,
    party_id: PARTY,
    display_name: "G6 opportunity",
    stage: "qualified",
    status: "active",
    owner_user_id: ACTOR,
    ...overrides,
  };
}

function intakeRequestFixture(overrides = {}) {
  return {
    intake_request_id: "intake-cmp-g6-001",
    tenant_id: TENANT,
    opportunity_id: "opp-cmp-g6-001",
    requesting_party_id: PARTY,
    party_ids: [PARTY],
    status: "open",
    owner_user_id: ACTOR,
    ...overrides,
  };
}

function conflictCheckFixture(overrides = {}) {
  return {
    conflict_check_id: "conflict-cmp-g6-001",
    tenant_id: TENANT,
    intake_request_id: "intake-cmp-g6-001",
    party_snapshot: { party_ids: [PARTY], aliases: ["G6 Client"] },
    status: "snapshot_recorded",
    owner_user_id: ACTOR,
    ...overrides,
  };
}

test("G6 CRM and Intake repositories persist runtime records, audit, and idempotency across reopen", () => {
  const crmStorePath = join(mkdtempSync(join(tmpdir(), "crm-g6-")), "crm.json");
  const intakeStorePath = join(mkdtempSync(join(tmpdir(), "intake-g6-")), "intake.json");
  const crm = createCrmRuntimeRepository({ filePath: crmStorePath });
  const intake = createIntakeRuntimeRepository({ filePath: intakeStorePath });

  createLead({
    repository: crm,
    lead: {
      lead_id: "lead-cmp-g6-001",
      tenant_id: TENANT,
      party_id: PARTY,
      display_name: "G6 lead",
      status: "active",
      owner_user_id: ACTOR,
    },
    actor_id: ACTOR,
    idempotency_key: "lead-1",
  });
  createIntakeRequest({
    repository: intake,
    request: intakeRequestFixture(),
    actor_id: ACTOR,
    idempotency_key: "intake-1",
  });
  crm.close();
  intake.close();

  const reopenedCrm = createCrmRuntimeRepository({ filePath: crmStorePath });
  const reopenedIntake = createIntakeRuntimeRepository({ filePath: intakeStorePath });
  assert.equal(reopenedCrm.list({ tenant_id: TENANT, model_type: "Lead" }).length, 1);
  assert.equal(reopenedCrm.getIdempotency({ tenant_id: TENANT, idempotency_key: "lead-1" }).operation, "crm_lead_create");
  assert.equal(reopenedIntake.list({ tenant_id: TENANT, model_type: "IntakeRequest" }).length, 1);
  assert.equal(reopenedIntake.listAudit({ tenant_id: TENANT }).some((event) => event.action === "intake.request.create"), true);
});

test("G6 CRM services block Matter shortcuts and enforce permission/idempotency guards", () => {
  const crm = crmRepo();
  assert.throws(
    () =>
      createOpportunity({
        repository: crm,
        opportunity: opportunityFixture({ matter_id: "matter-shortcut" }),
        actor_id: ACTOR,
        idempotency_key: "opp-shortcut",
      }),
    /directly to Matter/,
  );

  const created = createOpportunity({
    repository: crm,
    opportunity: opportunityFixture(),
    actor_id: ACTOR,
    idempotency_key: "opp-1",
  });
  assert.equal(created.opportunity.direct_matter_reference_included, undefined);
  assert.equal(createOpportunity({ repository: crm, opportunity: opportunityFixture(), actor_id: ACTOR, idempotency_key: "opp-1" }).idempotent_replay, true);
  assert.throws(
    () =>
      createCrmActivity({
        repository: crm,
        activity: {
          crm_activity_id: "act-cmp-g6-001",
          tenant_id: TENANT,
          party_id: PARTY,
          activity_type: "note",
          subject: "Confidential",
          confidential: true,
          status: "active",
          owner_user_id: ACTOR,
        },
        actor_id: ACTOR,
        idempotency_key: "activity-deny",
      }),
    /permission_ref/,
  );
  createCrmActivity({
    repository: crm,
    activity: {
      crm_activity_id: "act-cmp-g6-002",
      tenant_id: TENANT,
      party_id: PARTY,
      activity_type: "email",
      subject: "Allowed confidential",
      confidential: true,
      status: "active",
      owner_user_id: ACTOR,
    },
    actor_id: ACTOR,
    permission_ref: "perm-confidential",
    idempotency_key: "activity-allow",
  });
  createProposal({
    repository: crm,
    proposal: {
      proposal_id: "proposal-cmp-g6-001",
      tenant_id: TENANT,
      opportunity_id: "opp-cmp-g6-001",
      party_id: PARTY,
      fee_estimate_ref: "fee-estimate-001",
      display_name: "Proposal",
      status: "active",
      proposal_status: "sent",
      owner_user_id: ACTOR,
    },
    actor_id: ACTOR,
    idempotency_key: "proposal-1",
  });
  createReferral({
    repository: crm,
    referral: {
      referral_id: "ref-cmp-g6-001",
      tenant_id: TENANT,
      source_party_id: "party-referrer",
      target_party_id: PARTY,
      display_name: "Referral",
      status: "active",
      owner_user_id: ACTOR,
    },
    actor_id: ACTOR,
    idempotency_key: "referral-1",
  });
  assert.throws(
    () =>
      createCampaign({
        repository: crm,
        campaign: {
          campaign_id: "campaign-cmp-g6-001",
          tenant_id: TENANT,
          display_name: "Campaign",
          contact_party_ids: [PARTY],
          contact_consent_by_party_id: { [PARTY]: "opted_out" },
          status: "active",
          owner_user_id: ACTOR,
        },
        actor_id: ACTOR,
        idempotency_key: "campaign-deny",
      }),
    /opted-out/,
  );
});

test("G6 opportunity handoff and conflict workflow produce a valid clearance token without creating Matter", () => {
  const crm = crmRepo();
  const intake = intakeRepo();
  createOpportunity({ repository: crm, opportunity: opportunityFixture(), actor_id: ACTOR, idempotency_key: "opp-1" });
  const handoff = handoffOpportunityToIntake({
    crmRepository: crm,
    intakeService: {
      createIntakeRequest: ({ request, actor_id, idempotency_key }) =>
        createIntakeRequest({ repository: intake, request, actor_id, idempotency_key }),
    },
    tenant_id: TENANT,
    opportunity_id: "opp-cmp-g6-001",
    intake_request_id: "intake-cmp-g6-001",
    actor_id: ACTOR,
    idempotency_key: "handoff-1",
  });
  assert.equal(handoff.intake_request.creates_matter, false);
  assert.equal(handoff.opportunity.stage, "intake_requested");

  const check = createConflictCheck({
    repository: intake,
    conflict_check: conflictCheckFixture(),
    actor_id: ACTOR,
    idempotency_key: "check-1",
  });
  createConflictHit({
    repository: intake,
    hit: {
      conflict_hit_id: "hit-cmp-g6-001",
      tenant_id: TENANT,
      conflict_check_id: check.conflict_check.conflict_check_id,
      matched_party_id: PARTY,
      hit_source: "party_master",
      source_record_ref: "party-master:party-cmp-g6-client",
      severity: "low",
      audit_hint_ref: "audit-hit-source",
      status: "review_required",
      owner_user_id: ACTOR,
    },
    actor_id: ACTOR,
    idempotency_key: "hit-1",
  });
  executeConflictSearch({
    repository: intake,
    search: {
      conflict_search_id: "search-cmp-g6-001",
      tenant_id: TENANT,
      conflict_check_id: check.conflict_check.conflict_check_id,
      aliases: ["G6 Client"],
      relationship_refs: ["party-relationship:1"],
    },
    actor_id: ACTOR,
    idempotency_key: "search-1",
  });
  decideConflict({
    repository: intake,
    decision: {
      conflict_decision_id: "decision-cmp-g6-001",
      tenant_id: TENANT,
      conflict_check_id: check.conflict_check.conflict_check_id,
      reviewer_id: ACTOR,
      decision: "clear",
    },
    actor_id: ACTOR,
    idempotency_key: "decision-1",
  });
  approveWaiver({
    repository: intake,
    waiver: {
      waiver_id: "waiver-cmp-g6-001",
      tenant_id: TENANT,
      intake_request_id: "intake-cmp-g6-001",
      conflict_check_id: check.conflict_check.conflict_check_id,
      consent_document_id: "doc-waiver-001",
      approver_id: ACTOR,
    },
    actor_id: ACTOR,
    idempotency_key: "waiver-1",
  });
  const engagement = approveEngagement({
    repository: intake,
    engagement: {
      engagement_id: "engagement-cmp-g6-001",
      tenant_id: TENANT,
      intake_request_id: "intake-cmp-g6-001",
      signed_document_id: "doc-engagement-001",
    },
    actor_id: ACTOR,
    idempotency_key: "engagement-1",
  });
  approveFeeTerms({
    repository: intake,
    fee_terms: {
      fee_terms_id: "fee-cmp-g6-001",
      tenant_id: TENANT,
      intake_request_id: "intake-cmp-g6-001",
      billing_profile_id: "billing-profile-001",
      rate_card_ref: "rate-card-001",
    },
    actor_id: ACTOR,
    idempotency_key: "fee-1",
  });
  approveRisk({
    repository: intake,
    risk_approval: {
      risk_approval_id: "risk-cmp-g6-001",
      tenant_id: TENANT,
      intake_request_id: "intake-cmp-g6-001",
      approver_id: ACTOR,
      risk_level: "standard",
    },
    actor_id: ACTOR,
    idempotency_key: "risk-1",
  });
  const token = issueClearanceToken({
    repository: intake,
    token: {
      clearance_token_id: "clearance-cmp-g6-001",
      tenant_id: TENANT,
      intake_request_id: "intake-cmp-g6-001",
      conflict_check_id: check.conflict_check.conflict_check_id,
      engagement_id: engagement.engagement.engagement_id,
      snapshot_hash: check.conflict_check.snapshot_hash,
      expires_at: "2026-06-27T00:00:00.000Z",
    },
    actor_id: ACTOR,
    idempotency_key: "token-1",
  });
  assert.equal(validateClearanceToken(token.clearance_token, { now: "2026-06-20T00:00:00.000Z" }).valid, true);
  assert.equal(
    validateClearanceToken({ ...token.clearance_token, snapshot_stale: true }, { now: "2026-06-20T00:00:00.000Z" }).token_state,
    "stale",
  );
  assert.equal(validateClearanceToken(token.clearance_token, { now: "2026-06-28T00:00:00.000Z" }).token_state, "expired");
});

test("G6 conflict memo ACL omits unauthorized memo body without leaking counts", () => {
  const memo = {
    conflict_memo_id: "memo-cmp-g6-001",
    tenant_id: TENANT,
    conflict_check_id: "conflict-cmp-g6-001",
    summary: "Potential relationship",
    body: "Privileged conflict memo body",
  };
  const denied = serializeConflictMemo({ memo, principal: { user_id: "viewer", role_ids: [] }, object_acl: [] });
  assert.equal(denied.visible, false);
  assert.equal(denied.body_included, false);
  assert.equal(denied.count_leak_prevented, true);
  const allowed = serializeConflictMemo({
    memo,
    principal: { user_id: "reviewer", role_ids: [] },
    object_acl: [{ resource_id: "memo-cmp-g6-001", principal_id: "reviewer", effect: "allow" }],
  });
  assert.equal(allowed.visible, true);
  assert.equal(allowed.body, "Privileged conflict memo body");
});
