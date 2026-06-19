import assert from "node:assert/strict";
import test from "node:test";

import {
  createCrmCoreCRMActivity,
  createCrmCoreCampaign,
  createCrmCoreLead,
  createCrmCoreOpportunity,
  createCrmCoreProposal,
  createCrmCoreRecord,
  createCrmCoreReferral,
  listCrmCoreModelTypes,
  validateCrmCoreRecord,
} from "../src/index.js";

const tenant_id = "tenant_g3_validator";
const owner_user_id = "user_g3_validator";
const party_id = "party_g3_client";

test("G3-A Lead requires a Party reference and stays synthetic-only", () => {
  const lead = createCrmCoreLead({
    lead_id: "lead_g3_schema",
    tenant_id,
    party_id,
    display_name: "AMIC G3 Lead",
    status: "active",
    owner_user_id,
  });

  assert.equal(lead.party_id, party_id);
  assert.equal(lead.synthetic_only, true);
  assert.equal(lead.writes_product_state, false);
  assert.equal(lead.dispatches_crm_runtime, false);
  assert.equal(lead.g3_runtime_readiness_claim, "open");
  assert.equal(validateCrmCoreRecord("Lead", lead).valid, true);
});

test("G3-A Opportunity blocks direct Matter references", () => {
  assert.throws(
    () =>
      createCrmCoreOpportunity({
        opportunity_id: "opp_g3_bad",
        tenant_id,
        party_id,
        display_name: "AMIC G3 Opportunity",
        stage: "qualified",
        status: "active",
        owner_user_id,
        matter_id: "matter_should_not_exist",
      }),
    /cannot include direct Matter reference field: matter_id/
  );

  const opportunity = createCrmCoreOpportunity({
    opportunity_id: "opp_g3_schema",
    tenant_id,
    party_id,
    display_name: "AMIC G3 Opportunity",
    stage: "intake_requested",
    status: "active",
    owner_user_id,
    intake_request_id: "intake_g3_allowed",
  });

  assert.equal(opportunity.allowed_conversion_target, "IntakeRequest");
  assert.equal(opportunity.matter_id, null);
  assert.equal(validateCrmCoreRecord("Opportunity", opportunity).valid, true);
});

test("G3-A CRMActivity preserves confidential permission-trim evidence", () => {
  const activity = createCrmCoreCRMActivity({
    crm_activity_id: "activity_g3_schema",
    tenant_id,
    party_id,
    opportunity_id: "opp_g3_schema",
    activity_type: "meeting",
    subject: "Confidential client development call",
    confidential: true,
    status: "active",
    owner_user_id,
  });

  const validation = validateCrmCoreRecord("CRMActivity", activity);
  assert.equal(activity.confidential, true);
  assert.equal(activity.permission_trim_required, true);
  assert.deepEqual(validation.review_required_claims, ["confidential_crm_activity_permission_trim_required"]);
});

test("G3-A Proposal requires fee estimate reference", () => {
  assert.throws(
    () =>
      createCrmCoreProposal({
        proposal_id: "proposal_g3_bad",
        tenant_id,
        opportunity_id: "opp_g3_schema",
        party_id,
        display_name: "AMIC G3 Proposal",
        status: "active",
        proposal_status: "sent",
        owner_user_id,
      }),
    /missing required fields: fee_estimate_ref/
  );

  const proposal = createCrmCoreProposal({
    proposal_id: "proposal_g3_schema",
    tenant_id,
    opportunity_id: "opp_g3_schema",
    party_id,
    fee_estimate_ref: "fee_estimate_g3_001",
    display_name: "AMIC G3 Proposal",
    status: "active",
    proposal_status: "sent",
    owner_user_id,
  });

  assert.equal(proposal.fee_estimate_ref, "fee_estimate_g3_001");
  assert.equal(proposal.proposal_status, "sent");
  assert.equal(validateCrmCoreRecord("Proposal", proposal).valid, true);
});

test("G3-A Referral requires source and target Party references", () => {
  assert.throws(
    () =>
      createCrmCoreReferral({
        referral_id: "referral_g3_bad",
        tenant_id,
        target_party_id: party_id,
        display_name: "AMIC G3 Referral",
        status: "active",
        owner_user_id,
      }),
    /missing required fields: source_party_id/
  );

  const referral = createCrmCoreReferral({
    referral_id: "referral_g3_schema",
    tenant_id,
    source_party_id: "party_g3_referrer",
    target_party_id: party_id,
    display_name: "AMIC G3 Referral",
    status: "active",
    owner_user_id,
  });

  assert.equal(referral.source_party_id, "party_g3_referrer");
  assert.equal(referral.target_party_id, party_id);
  assert.equal(validateCrmCoreRecord("Referral", referral).valid, true);
});

test("G3-A Campaign records opt-in and opt-out contact consent", () => {
  assert.throws(
    () =>
      createCrmCoreCampaign({
        campaign_id: "campaign_g3_bad",
        tenant_id,
        display_name: "AMIC G3 Campaign",
        contact_party_ids: [party_id],
        contact_consent_by_party_id: {},
        status: "active",
        owner_user_id,
      }),
    /must have opted_in or opted_out consent/
  );

  const campaign = createCrmCoreCampaign({
    campaign_id: "campaign_g3_schema",
    tenant_id,
    display_name: "AMIC G3 Campaign",
    contact_party_ids: [party_id, "party_g3_opt_out"],
    contact_consent_by_party_id: {
      [party_id]: "opted_in",
      party_g3_opt_out: "opted_out",
    },
    status: "active",
    owner_user_id,
  });

  const validation = validateCrmCoreRecord("Campaign", campaign);
  assert.deepEqual(campaign.contact_party_ids, [party_id, "party_g3_opt_out"]);
  assert.equal(campaign.contact_consent_by_party_id.party_g3_opt_out, "opted_out");
  assert.deepEqual(validation.review_required_claims, ["campaign_contact_opt_out_present"]);
});

test("G3-A record factory exposes all CRM schema models", () => {
  assert.deepEqual(listCrmCoreModelTypes(), ["Lead", "Opportunity", "CRMActivity", "Proposal", "Referral", "Campaign"]);

  const record = createCrmCoreRecord("Lead", {
    lead_id: "lead_g3_factory",
    tenant_id,
    party_id,
    display_name: "AMIC G3 Factory Lead",
    status: "active",
    owner_user_id,
  });

  assert.equal(record.model_type, "Lead");
  assert.equal(validateCrmCoreRecord("Lead", record).valid, true);
});
