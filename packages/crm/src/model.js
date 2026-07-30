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

export const CRM_INQUIRY_STATUSES = Object.freeze(["new", "reviewing", "closed"]);

export const CRM_INQUIRY_SOURCES = Object.freeze(["outlook_addin", "manual"]);

export const CRM_ENGAGEMENT_DECISIONS = Object.freeze([
  "pending",
  "accepted",
  "declined",
]);

export const CRM_ENGAGEMENT_WORKFLOW_STATUSES = Object.freeze([
  "in_progress",
  "repair_required",
  "completed",
]);

export const CRM_INQUIRY_STATUS_TRANSITIONS = Object.freeze({
  new: Object.freeze(["reviewing", "closed"]),
  reviewing: Object.freeze(["closed"]),
  closed: Object.freeze(["reviewing"]),
});

export const CRM_ACTIVITY_KINDS = Object.freeze(["consultation"]);

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
    required_fields: Object.freeze([
      "lead_id",
      "tenant_id",
      "party_id",
      "display_name",
      "status",
      "owner_user_id",
      "inquiry_status",
      "source",
      "received_at",
      "version",
    ]),
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
    optional_fields: Object.freeze([
      "lead_id",
      "engagement_decision",
      "engagement_decision_version",
      "engagement_decided_at",
      "engagement_decided_by",
      "engagement_close_reason",
      "engagement_previous_stage",
      "engagement_workflow_id",
      "engagement_workflow_status",
      "engagement_completed_steps",
      "engagement_client_group_id",
      "engagement_fee_commitment_id",
      "intake_handoff_snapshot_sha256",
      "intake_handoff_evidence_count",
      "intake_handoff_activity_count",
      "intake_handoff_recorded_at",
    ]),
    engagement_optimistic_concurrency_field:
      "engagement_decision_version",
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
      "version",
    ]),
    optional_fields: Object.freeze([
      "activity_kind",
      "lead_id",
      "opportunity_id",
      "scheduled_start",
      "scheduled_end",
      "timezone",
      "completed_at",
      "outcome",
      "next_action",
      "outlook_event_id",
      "outlook_event_web_link",
      "outlook_event_transaction_id",
      "outlook_event_created_at",
      "outlook_event_created_by",
      "outlook_event_provider_request_ref",
      "outlook_event_schedule_sha256",
      "outlook_event_mailbox_scope",
    ]),
    consultation_required_schedule_fields: Object.freeze([
      "lead_id",
      "scheduled_start",
      "scheduled_end",
      "timezone",
    ]),
    consultation_required_completion_fields: Object.freeze([
      "completed_at",
      "outcome",
      "next_action",
    ]),
    optimistic_concurrency_field: "version",
    consultation_schedule_authority: "law_firm_os_app",
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

function optionalString(value, field, maxLength = 240) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || value.trim() === "" || value.trim().length > maxLength) {
    throw new TypeError(`${field} must be a non-empty string up to ${maxLength} characters`);
  }
  return value.trim();
}

function normalizeInstant(value, field) {
  if (
    typeof value !== "string"
    || value.trim() === ""
    || !/^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d{2}:\d{2})$/u.test(value.trim())
    || !Number.isFinite(Date.parse(value.trim()))
  ) {
    throw new TypeError(`${field} must be a valid instant with an explicit UTC offset`);
  }
  return value.trim();
}

function normalizeIanaTimezone(value, field) {
  const timezone = optionalString(value, field, 120);
  if (!timezone) throw new TypeError(`${field} is required`);
  try {
    new Intl.DateTimeFormat("en", { timeZone: timezone }).format(new Date(0));
  } catch {
    throw new TypeError(`${field} must be a valid IANA timezone`);
  }
  return timezone;
}

function canonicalInstant(value, field) {
  return new Date(normalizeInstant(value, field)).toISOString();
}

function positiveInteger(value, field) {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new TypeError(`${field} must be a positive integer`);
  }
  return value;
}

function nonNegativeInteger(value, field) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError(`${field} must be a non-negative integer`);
  }
  return value;
}

export function normalizeCrmOpportunityEngagementFields(input = {}) {
  const decision = input.engagement_decision === undefined
    || input.engagement_decision === null
    || input.engagement_decision === ""
    ? null
    : optionalString(
      input.engagement_decision,
      "Opportunity engagement_decision",
      32,
    );
  if (decision !== null && !CRM_ENGAGEMENT_DECISIONS.includes(decision)) {
    throw new TypeError(
      `Opportunity engagement_decision must be one of ${CRM_ENGAGEMENT_DECISIONS.join(", ")}`,
    );
  }
  const workflowStatus = input.engagement_workflow_status === undefined
    || input.engagement_workflow_status === null
    || input.engagement_workflow_status === ""
    ? null
    : optionalString(
      input.engagement_workflow_status,
      "Opportunity engagement_workflow_status",
      32,
    );
  if (
    workflowStatus !== null
    && !CRM_ENGAGEMENT_WORKFLOW_STATUSES.includes(workflowStatus)
  ) {
    throw new TypeError(
      `Opportunity engagement_workflow_status must be one of ${CRM_ENGAGEMENT_WORKFLOW_STATUSES.join(", ")}`,
    );
  }
  const previousStage = optionalString(
    input.engagement_previous_stage,
    "Opportunity engagement_previous_stage",
    32,
  );
  if (
    previousStage !== null
    && !CRM_CORE_OPPORTUNITY_STAGES.includes(previousStage)
  ) {
    throw new TypeError("Opportunity engagement_previous_stage is invalid");
  }
  const completedSteps = input.engagement_completed_steps ?? [];
  if (
    !Array.isArray(completedSteps)
    || completedSteps.some(
      (step) => typeof step !== "string" || step.trim() === "",
    )
  ) {
    throw new TypeError(
      "Opportunity engagement_completed_steps must be an array of strings",
    );
  }
  return Object.freeze({
    engagement_decision: decision,
    engagement_decision_version: positiveInteger(
      input.engagement_decision_version ?? 1,
      "Opportunity engagement_decision_version",
    ),
    engagement_decided_at: input.engagement_decided_at
      ? canonicalInstant(
        input.engagement_decided_at,
        "Opportunity engagement_decided_at",
      )
      : null,
    engagement_decided_by: optionalString(
      input.engagement_decided_by,
      "Opportunity engagement_decided_by",
      240,
    ),
    engagement_close_reason: optionalString(
      input.engagement_close_reason,
      "Opportunity engagement_close_reason",
      500,
    ),
    engagement_previous_stage: previousStage,
    engagement_workflow_id: optionalString(
      input.engagement_workflow_id,
      "Opportunity engagement_workflow_id",
      240,
    ),
    engagement_workflow_status: workflowStatus,
    engagement_completed_steps: freezeArray(completedSteps),
    engagement_client_group_id: optionalString(
      input.engagement_client_group_id,
      "Opportunity engagement_client_group_id",
      240,
    ),
    engagement_fee_commitment_id: optionalString(
      input.engagement_fee_commitment_id,
      "Opportunity engagement_fee_commitment_id",
      240,
    ),
  });
}

const OUTLOOK_EVENT_FIELDS = Object.freeze([
  "outlook_event_id",
  "outlook_event_web_link",
  "outlook_event_transaction_id",
  "outlook_event_created_at",
  "outlook_event_created_by",
  "outlook_event_provider_request_ref",
  "outlook_event_schedule_sha256",
  "outlook_event_mailbox_scope",
]);

function normalizeOutlookEventWebLink(value) {
  const text = optionalString(
    value,
    "CRMActivity outlook_event_web_link",
    2_048,
  );
  if (!text) return null;
  let url;
  try {
    url = new URL(text);
  } catch {
    throw new TypeError(
      "CRMActivity outlook_event_web_link must be a valid URL",
    );
  }
  const hostname = url.hostname.toLowerCase();
  const allowedHost = [
    "outlook.office.com",
    "outlook.office365.com",
  ].some((host) => hostname === host || hostname.endsWith(`.${host}`));
  if (
    url.protocol !== "https:"
    || url.username
    || url.password
    || !allowedHost
  ) {
    throw new TypeError(
      "CRMActivity outlook_event_web_link must be an Outlook HTTPS URL",
    );
  }
  return url.toString();
}

function normalizeCrmOutlookEventFields(input = {}) {
  const supplied = OUTLOOK_EVENT_FIELDS.some((field) => (
    input[field] !== undefined
    && input[field] !== null
    && input[field] !== ""
  ));
  if (!supplied) {
    return Object.freeze(Object.fromEntries(
      OUTLOOK_EVENT_FIELDS.map((field) => [field, null]),
    ));
  }
  const eventId = optionalString(
    input.outlook_event_id,
    "CRMActivity outlook_event_id",
    2_048,
  );
  const transactionId = optionalString(
    input.outlook_event_transaction_id,
    "CRMActivity outlook_event_transaction_id",
    128,
  );
  const createdBy = optionalString(
    input.outlook_event_created_by,
    "CRMActivity outlook_event_created_by",
    240,
  );
  if (!eventId || !transactionId || !createdBy) {
    throw new TypeError(
      "CRMActivity Outlook event link requires event ID, transaction ID, and creator",
    );
  }
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u
      .test(transactionId)
  ) {
    throw new TypeError(
      "CRMActivity outlook_event_transaction_id must be a deterministic UUID",
    );
  }
  const providerRequestRef = optionalString(
    input.outlook_event_provider_request_ref,
    "CRMActivity outlook_event_provider_request_ref",
    64,
  );
  const scheduleSha256 = optionalString(
    input.outlook_event_schedule_sha256,
    "CRMActivity outlook_event_schedule_sha256",
    64,
  );
  if (
    (providerRequestRef && !/^[0-9a-f]{64}$/u.test(providerRequestRef))
    || !scheduleSha256
    || !/^[0-9a-f]{64}$/u.test(scheduleSha256)
  ) {
    throw new TypeError(
      "CRMActivity Outlook event references must be SHA-256 values",
    );
  }
  if (input.outlook_event_mailbox_scope !== "me") {
    throw new TypeError(
      "CRMActivity outlook_event_mailbox_scope must be me",
    );
  }
  return Object.freeze({
    outlook_event_id: eventId,
    outlook_event_web_link: normalizeOutlookEventWebLink(
      input.outlook_event_web_link,
    ),
    outlook_event_transaction_id: transactionId,
    outlook_event_created_at: canonicalInstant(
      input.outlook_event_created_at,
      "CRMActivity outlook_event_created_at",
    ),
    outlook_event_created_by: createdBy,
    outlook_event_provider_request_ref: providerRequestRef,
    outlook_event_schedule_sha256: scheduleSha256,
    outlook_event_mailbox_scope: "me",
  });
}

export function normalizeCrmInquirySource(value) {
  const source = value === "outlook" ? "outlook_addin" : value;
  if (!CRM_INQUIRY_SOURCES.includes(source)) {
    throw new TypeError(`Lead source must be one of ${CRM_INQUIRY_SOURCES.join(", ")}`);
  }
  return source;
}

export function normalizeCrmLeadInquiryFields(input = {}) {
  const inquiryStatus = input.inquiry_status ?? "new";
  if (!CRM_INQUIRY_STATUSES.includes(inquiryStatus)) {
    throw new TypeError(`Lead inquiry_status must be one of ${CRM_INQUIRY_STATUSES.join(", ")}`);
  }
  const source = normalizeCrmInquirySource(input.source ?? input.lead_source ?? "manual");
  if (
    input.source !== undefined
    && input.lead_source !== undefined
    && normalizeCrmInquirySource(input.source) !== normalizeCrmInquirySource(input.lead_source)
  ) {
    throw new TypeError("Lead source and legacy lead_source disagree");
  }
  const receivedAt = normalizeInstant(input.received_at ?? input.created_at, "Lead received_at");
  const version = input.version ?? 1;
  if (!Number.isSafeInteger(version) || version < 1) {
    throw new TypeError("Lead version must be a positive integer");
  }
  const suppliedNextAction = optionalString(input.next_action, "Lead next_action");
  const nextAction = inquiryStatus === "closed"
    ? null
    : suppliedNextAction ?? "문의 확인";
  if (inquiryStatus === "closed" && suppliedNextAction !== null) {
    throw new TypeError("Closed Lead cannot have next_action");
  }
  return Object.freeze({
    inquiry_status: inquiryStatus,
    source,
    received_at: receivedAt,
    next_action: nextAction,
    version,
  });
}

export function normalizeCrmActivityFields(input = {}) {
  const version = input.version ?? 1;
  if (!Number.isSafeInteger(version) || version < 1) {
    throw new TypeError("CRMActivity version must be a positive integer");
  }
  const activityKind = input.activity_kind ?? null;
  if (activityKind === null) {
    if (OUTLOOK_EVENT_FIELDS.some((field) => input[field] != null)) {
      throw new TypeError(
        "Only consultation CRMActivity can link an Outlook event",
      );
    }
    return Object.freeze({
      activity_kind: null,
      lead_id: input.lead_id ?? null,
      scheduled_start: input.scheduled_start ?? input.scheduled_at ?? null,
      scheduled_end: input.scheduled_end ?? null,
      timezone: input.timezone ?? null,
      completed_at: input.completed_at ?? null,
      outcome: input.outcome ?? null,
      next_action: input.next_action ?? null,
      version,
      ...normalizeCrmOutlookEventFields(),
    });
  }
  if (!CRM_ACTIVITY_KINDS.includes(activityKind)) {
    throw new TypeError(
      `CRMActivity activity_kind must be one of ${CRM_ACTIVITY_KINDS.join(", ")}`,
    );
  }
  if (activityKind !== "consultation") {
    throw new TypeError("Unsupported CRMActivity activity_kind");
  }
  if (input.activity_type !== "meeting") {
    throw new TypeError("Consultation CRMActivity must use activity_type=meeting");
  }
  const leadId = optionalString(input.lead_id, "CRMActivity lead_id");
  if (!leadId) throw new TypeError("Consultation CRMActivity requires lead_id");
  const scheduledStart = canonicalInstant(
    input.scheduled_start,
    "CRMActivity scheduled_start",
  );
  const scheduledEnd = canonicalInstant(
    input.scheduled_end,
    "CRMActivity scheduled_end",
  );
  if (Date.parse(scheduledEnd) <= Date.parse(scheduledStart)) {
    throw new TypeError(
      "CRMActivity scheduled_end must be after scheduled_start",
    );
  }
  const timezone = normalizeIanaTimezone(
    input.timezone,
    "CRMActivity timezone",
  );
  const completedAt = input.completed_at == null || input.completed_at === ""
    ? null
    : canonicalInstant(input.completed_at, "CRMActivity completed_at");
  if (
    completedAt
    && Date.parse(completedAt) < Date.parse(scheduledStart)
  ) {
    throw new TypeError(
      "CRMActivity completed_at cannot be before scheduled_start",
    );
  }
  const outcome = optionalString(
    input.outcome,
    "CRMActivity outcome",
    2_000,
  );
  if (completedAt && !outcome) {
    throw new TypeError("Completed consultation requires outcome");
  }
  if (!completedAt && outcome) {
    throw new TypeError(
      "Consultation outcome requires completed_at",
    );
  }
  return Object.freeze({
    activity_kind: "consultation",
    lead_id: leadId,
    scheduled_start: scheduledStart,
    scheduled_end: scheduledEnd,
    timezone,
    completed_at: completedAt,
    outcome,
    next_action: optionalString(
      input.next_action,
      "CRMActivity next_action",
      240,
    ),
    version,
    ...normalizeCrmOutlookEventFields(input),
  });
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
  const inquiry = normalizeCrmLeadInquiryFields(input);
  return freezeRecord({
    ...baseCrmRecord("Lead", { ...input, ...inquiry }),
    lead_id: input.lead_id,
    party_id: input.party_id,
    display_name: input.display_name,
    ...inquiry,
    lead_key: input.lead_key ?? `${input.tenant_id}:lead:${input.party_id}:${normalizeSearchValue(input.display_name)}`,
  });
}

export function createCrmCoreOpportunity(input) {
  assertOpportunityStage(input.stage);
  const engagement = normalizeCrmOpportunityEngagementFields(input);
  return freezeRecord({
    ...baseCrmRecord("Opportunity", input),
    opportunity_id: input.opportunity_id,
    party_id: input.party_id,
    display_name: input.display_name,
    stage: input.stage,
    ...engagement,
    intake_request_id: input.intake_request_id ?? null,
    intake_handoff_snapshot_sha256: optionalString(
      input.intake_handoff_snapshot_sha256,
      "Opportunity intake_handoff_snapshot_sha256",
      128,
    ),
    intake_handoff_evidence_count:
      nonNegativeInteger(
        input.intake_handoff_evidence_count ?? 0,
        "Opportunity intake_handoff_evidence_count",
      ),
    intake_handoff_activity_count:
      nonNegativeInteger(
        input.intake_handoff_activity_count ?? 0,
        "Opportunity intake_handoff_activity_count",
      ),
    intake_handoff_recorded_at: input.intake_handoff_recorded_at
      ? canonicalInstant(
        input.intake_handoff_recorded_at,
        "Opportunity intake_handoff_recorded_at",
      )
      : null,
    allowed_conversion_target: "IntakeRequest",
    matter_id: null,
    opportunity_key:
      input.opportunity_key ?? `${input.tenant_id}:opportunity:${input.party_id}:${normalizeSearchValue(input.display_name)}`,
  });
}

export function createCrmCoreCRMActivity(input) {
  assertActivityType(input.activity_type);
  const activity = normalizeCrmActivityFields(input);
  const subject = optionalString(input.subject, "CRMActivity subject", 160);
  if (!subject) throw new TypeError("CRMActivity subject is required");
  const confidential = input.confidential === true;
  return freezeRecord({
    ...baseCrmRecord("CRMActivity", { ...input, ...activity }),
    crm_activity_id: input.crm_activity_id,
    party_id: input.party_id,
    opportunity_id: input.opportunity_id ?? null,
    activity_type: input.activity_type,
    subject,
    confidential,
    permission_trim_required: confidential,
    ...activity,
    activity_key:
      input.activity_key ?? `${input.tenant_id}:crm-activity:${input.party_id}:${input.activity_type}:${normalizeSearchValue(subject)}`,
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

  if (modelType === "Lead") {
    if (record?.next_action === undefined) {
      errors.push("missing_required_field:next_action");
    }
    try {
      normalizeCrmLeadInquiryFields(record);
    } catch {
      errors.push("invalid_lead_inquiry_fields");
    }
  }

  if (modelType === "Opportunity" && record?.stage !== undefined && !CRM_CORE_OPPORTUNITY_STAGES.includes(record.stage)) {
    errors.push(`invalid_opportunity_stage:${record.stage}`);
  }
  if (modelType === "Opportunity") {
    try {
      normalizeCrmOpportunityEngagementFields(record);
    } catch {
      errors.push("invalid_opportunity_engagement_fields");
    }
  }

  if (modelType === "CRMActivity") {
    if (record?.activity_type !== undefined && !CRM_CORE_ACTIVITY_TYPES.includes(record.activity_type)) {
      errors.push(`invalid_activity_type:${record.activity_type}`);
    }
    try {
      normalizeCrmActivityFields(record);
    } catch {
      errors.push("invalid_crm_activity_fields");
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
