import { createRecordDomainDescriptor } from "../../persistence/src/record-domain-adapter.js";

const APPEND_ONLY_TYPES = new Set([
  "ConflictHit",
  "ConflictDecision",
  "ClearanceToken",
]);

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
  if (record.model_type !== "IntakeRequest") add("intake_request", "IntakeRequest", record.intake_request_id, { required: true });
  if (record.model_type !== "ConflictCheck") add("conflict_check", "ConflictCheck", record.conflict_check_id);
  add("conflict_hit", "ConflictHit", record.conflict_hit_id);
  add("conflict_decision", "ConflictDecision", record.conflict_decision_id);
  add("waiver", "Waiver", record.waiver_id);
  add("engagement", "Engagement", record.engagement_id);
  add("opportunity", "Opportunity", record.opportunity_id, { target_domain_id: "crm" });
  add("canonical_party", "Party", record.party_id ?? record.canonical_party_id, { target_domain_id: "master-data" });
  add("matter", "Matter", record.matter_id, { target_domain_id: "matter" });
  return values;
}

function uniqueKey(record) {
  if (record.model_type === "ClearanceToken" && record.intake_request_id) {
    return `clearance:${record.intake_request_id}`;
  }
  if (record.model_type === "ConflictDecision" && record.conflict_check_id) {
    return `decision:${record.conflict_check_id}`;
  }
  return null;
}

export const INTAKE_DOMAIN_DESCRIPTOR = createRecordDomainDescriptor({
  domain_id: "intake",
  resolve_record_id: (record) => record.resource_id ?? record.id,
  unique_key: uniqueKey,
  append_only: (record) => APPEND_ONLY_TYPES.has(record.model_type),
  references,
  pii_fields: [
    "requester_name",
    "client_name",
    "counterparty_name",
    "email",
    "phone",
    "conflict_memo",
    "party_snapshot",
  ],
  primary_key_fields: [
    "resource_id",
    "intake_request_id",
    "conflict_check_id",
    "conflict_hit_id",
    "conflict_search_id",
    "conflict_decision_id",
    "waiver_id",
    "engagement_id",
    "fee_terms_id",
    "risk_approval_id",
    "clearance_token_id",
  ],
  unique_rules: [
    "ClearanceToken.intake_request_id",
    "ConflictDecision.conflict_check_id",
  ],
  reference_rules: [
    "*.intake_request_id->IntakeRequest",
    "*.conflict_check_id->ConflictCheck",
    "*.opportunity_id->crm.Opportunity",
    "*.party_id->master-data.Party",
    "*.matter_id->matter.Matter",
  ],
});
