import { hashDomainValue } from "../../persistence/src/domain-ledger.js";
import { createRecordDomainDescriptor } from "../../persistence/src/record-domain-adapter.js";

function references(record) {
  const values = [];
  const add = (reference_name, target_record_type, target_record_id, options = {}) => {
    if (target_record_id) values.push({
      reference_name,
      target_domain_id: options.target_domain_id,
      target_record_type,
      target_record_id,
      required: options.required === true,
    });
  };
  if (record.model_type !== "Lead") add("lead", "Lead", record.lead_id);
  if (record.model_type !== "Opportunity") add("opportunity", "Opportunity", record.opportunity_id);
  add("proposal", "Proposal", record.proposal_id);
  add("referral", "Referral", record.referral_id);
  add("canonical_party", "Party", record.party_id ?? record.canonical_party_id, { target_domain_id: "master-data" });
  add("canonical_entity", "Entity", record.entity_id ?? record.canonical_entity_id, { target_domain_id: "master-data" });
  add("intake_request", "IntakeRequest", record.intake_request_id, { target_domain_id: "intake" });
  return values;
}

function uniqueKey(record) {
  if (record.model_type === "Lead" && record.email) {
    return `lead-email:${hashDomainValue(String(record.email).trim().toLowerCase())}`;
  }
  if (record.model_type === "Opportunity" && record.opportunity_code) {
    return `opportunity-code:${record.opportunity_code}`;
  }
  return null;
}

export const CRM_DOMAIN_DESCRIPTOR = createRecordDomainDescriptor({
  domain_id: "crm",
  resolve_record_id: (record) => record.resource_id ?? record.id,
  unique_key: uniqueKey,
  references,
  pii_fields: [
    "display_name",
    "contact_name",
    "email",
    "phone",
    "notes",
    "proposal_summary",
  ],
  primary_key_fields: [
    "resource_id",
    "lead_id",
    "opportunity_id",
    "crm_activity_id",
    "proposal_id",
    "referral_id",
    "campaign_id",
  ],
  unique_rules: [
    "Lead.normalized_email_hash",
    "Opportunity.opportunity_code",
  ],
  reference_rules: [
    "*.lead_id->Lead",
    "*.opportunity_id->Opportunity",
    "*.proposal_id->Proposal",
    "*.party_id->master-data.Party",
    "*.intake_request_id->intake.IntakeRequest",
  ],
});
