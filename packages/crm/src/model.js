export const CRM_CORE_LIFECYCLE_STATUSES = Object.freeze(["draft", "active", "review_required", "blocked", "archived"]);

export const CRM_CORE_OPPORTUNITY_STAGES = Object.freeze([
  "new",
  "qualified",
  "intake_requested",
  "intake_opened",
  "closed_lost",
  "closed_won",
]);

export const CRM_CORE_ACTIVITY_TYPES = Object.freeze(["call", "email", "meeting", "note", "task"]);

export const CRM_CORE_PROPOSAL_STATUSES = Object.freeze(["draft", "sent", "accepted", "declined", "expired"]);

export const CRM_CORE_CAMPAIGN_CONTACT_CONSENT_STATUSES = Object.freeze(["opted_in", "opted_out"]);

export const CRM_CORE_DIRECT_MATTER_REFERENCE_FIELDS = Object.freeze([
  "matter_id",
  "matter_ref",
  "matter_number",
  "matter_create_command",
  "matter_open_command",
]);

export const CRM_CORE_MODEL_DEFINITIONS = Object.freeze({
  Lead: Object.freeze({
    model_type: "Lead",
    id_field: "lead_id",
    required_fields: Object.freeze(["lead_id", "tenant_id", "party_id", "display_name", "status", "owner_user_id"]),
    party_reference_fields: Object.freeze(["party_id"]),
    tuw_id: "LFOS-G3-W03-T001",
    prohibits_direct_matter_reference: true,
  }),
  Opportunity: Object.freeze({
    model_type: "Opportunity",
    id_field: "opportunity_id",
    required_fields: Object.freeze([
      "opportunity_id",
      "tenant_id",
      "party_id",
      "display_name",
      "stage",
      "status",
      "owner_user_id",
    ]),
    party_reference_fields: Object.freeze(["party_id"]),
    tuw_id: "LFOS-G3-W03-T002",
    allowed_conversion_target: "IntakeRequest",
    prohibits_direct_matter_reference: true,
  }),
  CRMActivity: Object.freeze({
    model_type: "CRMActivity",
    id_field: "crm_activity_id",
    required_fields: Object.freeze([
      "crm_activity_id",
      "tenant_id",
      "party_id",
      "activity_type",
      "subject",
      "confidential",
      "status",
      "owner_user_id",
    ]),
    party_reference_fields: Object.freeze(["party_id"]),
    tuw_id: "LFOS-G3-W03-T003",
    confidential_activity_permission_trim_required: true,
    prohibits_direct_matter_reference: true,
  }),
  Proposal: Object.freeze({
    model_type: "Proposal",
    id_field: "proposal_id",
    required_fields: Object.freeze([
      "proposal_id",
      "tenant_id",
      "opportunity_id",
      "party_id",
      "fee_estimate_ref",
      "display_name",
      "status",
      "proposal_status",
      "owner_user_id",
    ]),
    party_reference_fields: Object.freeze(["party_id"]),
    tuw_id: "LFOS-G3-W03-T004",
    prohibits_direct_matter_reference: true,
  }),
  Referral: Object.freeze({
    model_type: "Referral",
    id_field: "referral_id",
    required_fields: Object.freeze([
      "referral_id",
      "tenant_id",
      "source_party_id",
      "target_party_id",
      "display_name",
      "status",
      "owner_user_id",
    ]),
    party_reference_fields: Object.freeze(["source_party_id", "target_party_id"]),
    tuw_id: "LFOS-G3-W03-T005",
    prohibits_direct_matter_reference: true,
  }),
  Campaign: Object.freeze({
    model_type: "Campaign",
    id_field: "campaign_id",
    required_fields: Object.freeze([
      "campaign_id",
      "tenant_id",
      "display_name",
      "contact_party_ids",
      "contact_consent_by_party_id",
      "status",
      "owner_user_id",
    ]),
    party_reference_fields: Object.freeze(["contact_party_ids"]),
    tuw_id: "LFOS-G3-W03-T006",
    requires_contact_consent: true,
    prohibits_direct_matter_reference: true,
  }),
});

function freezeRecord(record) {
  return Object.freeze(record);
}

function freezeArray(values) {
  return Object.freeze([...(values ?? [])]);
}

function freezeObject(value) {
  return Object.freeze({ ...(value ?? {}) });
}

function normalizeSearchValue(value) {
  return String(value ?? "").trim().toLowerCase();
}

function getCrmCoreModelDefinition(modelType) {
  const definition = CRM_CORE_MODEL_DEFINITIONS[modelType];
  if (!definition) throw new Error(`Unknown CRM Core model type ${modelType}`);
  return definition;
}

function missingRequiredFields(modelType, input) {
  const definition = getCrmCoreModelDefinition(modelType);
  return definition.required_fields.filter((field) => input?.[field] === undefined || input?.[field] === null || input?.[field] === "");
}

function assertRequiredFields(modelType, input) {
  const missing = missingRequiredFields(modelType, input);
  if (missing.length > 0) throw new Error(`${modelType} missing required fields: ${missing.join(", ")}`);
}

function assertLifecycleStatus(modelType, status) {
  if (!CRM_CORE_LIFECYCLE_STATUSES.includes(status)) {
    throw new Error(`${modelType} status must be one of ${CRM_CORE_LIFECYCLE_STATUSES.join(", ")}`);
  }
}

function assertNoDirectMatterReference(modelType, input) {
  for (const field of CRM_CORE_DIRECT_MATTER_REFERENCE_FIELDS) {
    if (input?.[field] !== undefined && input?.[field] !== null && input?.[field] !== "") {
      throw new Error(`${modelType} cannot include direct Matter reference field: ${field}`);
    }
  }
}

function assertOpportunityStage(stage) {
  if (!CRM_CORE_OPPORTUNITY_STAGES.includes(stage)) {
    throw new Error(`Opportunity stage must be one of ${CRM_CORE_OPPORTUNITY_STAGES.join(", ")}`);
  }
}

function assertActivityType(activityType) {
  if (!CRM_CORE_ACTIVITY_TYPES.includes(activityType)) {
    throw new Error(`CRMActivity activity_type must be one of ${CRM_CORE_ACTIVITY_TYPES.join(", ")}`);
  }
}

function assertProposalStatus(status) {
  if (!CRM_CORE_PROPOSAL_STATUSES.includes(status)) {
    throw new Error(`Proposal status must be one of ${CRM_CORE_PROPOSAL_STATUSES.join(", ")}`);
  }
}

function assertCampaignContactConsent(contactPartyIds, consentByPartyId) {
  if (!Array.isArray(contactPartyIds) || contactPartyIds.length === 0) {
    throw new Error("Campaign contact_party_ids must include at least one Party reference");
  }
  for (const partyId of contactPartyIds) {
    const consentStatus = consentByPartyId?.[partyId];
    if (!CRM_CORE_CAMPAIGN_CONTACT_CONSENT_STATUSES.includes(consentStatus)) {
      throw new Error(`Campaign contact ${partyId} must have opted_in or opted_out consent`);
    }
  }
}

function baseCrmRecord(modelType, input) {
  assertRequiredFields(modelType, input);
  assertLifecycleStatus(modelType, input.status);
  assertNoDirectMatterReference(modelType, input);
  const definition = getCrmCoreModelDefinition(modelType);
  return {
    model_type: modelType,
    tenant_id: input.tenant_id,
    status: input.status,
    owner_module: "crm",
    owner_user_id: input.owner_user_id,
    permission_ref: input.permission_ref ?? null,
    audit_hint_ref: input.audit_hint_ref ?? null,
    synthetic_only: input.synthetic_only ?? true,
    no_real_data: true,
    writes_product_state: false,
    creates_database_rows: false,
    updates_database_rows: false,
    deletes_database_rows: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    dispatches_crm_runtime: false,
    executes_api_handler: false,
    g3_runtime_readiness_claim: "open",
    party_reference_fields: definition.party_reference_fields,
    direct_matter_reference_prohibited: true,
  };
}

export function createCrmCoreLead(input) {
  return freezeRecord({
    ...baseCrmRecord("Lead", input),
    lead_id: input.lead_id,
    party_id: input.party_id,
    display_name: input.display_name,
    lead_source: input.lead_source ?? null,
    lead_key: input.lead_key ?? `${input.tenant_id}:lead:${input.party_id}:${normalizeSearchValue(input.display_name)}`,
  });
}

export function createCrmCoreOpportunity(input) {
  assertOpportunityStage(input.stage);
  return freezeRecord({
    ...baseCrmRecord("Opportunity", input),
    opportunity_id: input.opportunity_id,
    party_id: input.party_id,
    display_name: input.display_name,
    stage: input.stage,
    intake_request_id: input.intake_request_id ?? null,
    allowed_conversion_target: "IntakeRequest",
    matter_id: null,
    opportunity_key:
      input.opportunity_key ?? `${input.tenant_id}:opportunity:${input.party_id}:${normalizeSearchValue(input.display_name)}`,
  });
}

export function createCrmCoreCRMActivity(input) {
  assertActivityType(input.activity_type);
  const confidential = input.confidential === true;
  return freezeRecord({
    ...baseCrmRecord("CRMActivity", input),
    crm_activity_id: input.crm_activity_id,
    party_id: input.party_id,
    opportunity_id: input.opportunity_id ?? null,
    activity_type: input.activity_type,
    subject: input.subject,
    confidential,
    permission_trim_required: confidential,
    activity_key:
      input.activity_key ?? `${input.tenant_id}:crm-activity:${input.party_id}:${input.activity_type}:${normalizeSearchValue(input.subject)}`,
  });
}

export function createCrmCoreProposal(input) {
  assertProposalStatus(input.proposal_status);
  return freezeRecord({
    ...baseCrmRecord("Proposal", input),
    proposal_id: input.proposal_id,
    opportunity_id: input.opportunity_id,
    party_id: input.party_id,
    fee_estimate_ref: input.fee_estimate_ref,
    display_name: input.display_name,
    proposal_status: input.proposal_status,
    proposal_key: input.proposal_key ?? `${input.tenant_id}:proposal:${input.opportunity_id}:${input.fee_estimate_ref}`,
  });
}

export function createCrmCoreReferral(input) {
  return freezeRecord({
    ...baseCrmRecord("Referral", input),
    referral_id: input.referral_id,
    source_party_id: input.source_party_id,
    target_party_id: input.target_party_id,
    display_name: input.display_name,
    referral_source_note: input.referral_source_note ?? null,
    referral_key: input.referral_key ?? `${input.tenant_id}:referral:${input.source_party_id}:${input.target_party_id}`,
  });
}

export function createCrmCoreCampaign(input) {
  assertCampaignContactConsent(input.contact_party_ids, input.contact_consent_by_party_id);
  const contactPartyIds = freezeArray(input.contact_party_ids);
  const consentByPartyId = freezeObject(input.contact_consent_by_party_id);
  return freezeRecord({
    ...baseCrmRecord("Campaign", input),
    campaign_id: input.campaign_id,
    display_name: input.display_name,
    contact_party_ids: contactPartyIds,
    contact_consent_by_party_id: consentByPartyId,
    campaign_key: input.campaign_key ?? `${input.tenant_id}:campaign:${normalizeSearchValue(input.display_name)}`,
  });
}

const FACTORIES = Object.freeze({
  Lead: createCrmCoreLead,
  Opportunity: createCrmCoreOpportunity,
  CRMActivity: createCrmCoreCRMActivity,
  Proposal: createCrmCoreProposal,
  Referral: createCrmCoreReferral,
  Campaign: createCrmCoreCampaign,
});

export function createCrmCoreRecord(modelType, input) {
  const factory = FACTORIES[modelType];
  if (!factory) throw new Error(`Unknown CRM Core model type ${modelType}`);
  return factory(input);
}

export function listCrmCoreModelTypes() {
  return Object.freeze(Object.keys(CRM_CORE_MODEL_DEFINITIONS));
}

export function validateCrmCoreRecord(modelType, record) {
  const errors = [];
  const review_required_claims = [];
  const blocked_claims = [];
  const definition = CRM_CORE_MODEL_DEFINITIONS[modelType];

  if (!definition) {
    errors.push(`unknown_model_type:${modelType}`);
  } else {
    for (const field of definition.required_fields) {
      if (record?.[field] === undefined || record?.[field] === null || record?.[field] === "") {
        errors.push(`missing_required_field:${field}`);
      }
    }
  }

  for (const field of CRM_CORE_DIRECT_MATTER_REFERENCE_FIELDS) {
    if (record?.[field] !== undefined && record?.[field] !== null && record?.[field] !== "") {
      errors.push(`direct_matter_reference_prohibited:${field}`);
      blocked_claims.push("opportunity_to_matter_shortcut_blocked");
    }
  }

  if (record?.status !== undefined && !CRM_CORE_LIFECYCLE_STATUSES.includes(record.status)) {
    errors.push(`invalid_status:${record.status}`);
  }

  if (modelType === "Opportunity" && record?.stage !== undefined && !CRM_CORE_OPPORTUNITY_STAGES.includes(record.stage)) {
    errors.push(`invalid_opportunity_stage:${record.stage}`);
  }

  if (modelType === "CRMActivity") {
    if (record?.activity_type !== undefined && !CRM_CORE_ACTIVITY_TYPES.includes(record.activity_type)) {
      errors.push(`invalid_activity_type:${record.activity_type}`);
    }
    if (record?.confidential === true) {
      review_required_claims.push("confidential_crm_activity_permission_trim_required");
    }
  }

  if (modelType === "Proposal" && record?.fee_estimate_ref) {
    if (record?.proposal_status !== undefined && !CRM_CORE_PROPOSAL_STATUSES.includes(record.proposal_status)) {
      errors.push(`invalid_proposal_status:${record.proposal_status}`);
    }
    review_required_claims.push("proposal_fee_estimate_reference_present");
  }

  if (modelType === "Campaign" && Array.isArray(record?.contact_party_ids)) {
    for (const partyId of record.contact_party_ids) {
      const consentStatus = record.contact_consent_by_party_id?.[partyId];
      if (!CRM_CORE_CAMPAIGN_CONTACT_CONSENT_STATUSES.includes(consentStatus)) {
        errors.push(`missing_campaign_contact_consent:${partyId}`);
      }
      if (consentStatus === "opted_out") {
        review_required_claims.push("campaign_contact_opt_out_present");
      }
    }
  }

  if (record?.writes_product_state !== false) errors.push("writes_product_state_must_be_false");
  if (record?.creates_database_rows !== false) errors.push("creates_database_rows_must_be_false");
  if (record?.updates_database_rows !== false) errors.push("updates_database_rows_must_be_false");
  if (record?.writes_audit_event !== false) errors.push("writes_audit_event_must_be_false");
  if (record?.dispatches_crm_runtime !== false) errors.push("dispatches_crm_runtime_must_be_false");
  if (record?.g3_runtime_readiness_claim !== "open") errors.push("g3_runtime_readiness_claim_must_remain_open");

  return Object.freeze({
    valid: errors.length === 0,
    errors: freezeArray(errors),
    review_required_claims: freezeArray([...new Set(review_required_claims)]),
    blocked_claims: freezeArray([...new Set(blocked_claims)]),
  });
}
