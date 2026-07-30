import { hashEventBody } from "../../audit/src/events.js";
import { transitionOpportunityStage } from "./opportunity-service.js";

export const CRM_INTAKE_HANDOFF_ERROR_CODES = Object.freeze({
  direct_matter_blocked: "CRM_INTAKE_HANDOFF_DIRECT_MATTER_BLOCKED",
  engagement_required: "CRM_INTAKE_HANDOFF_ENGAGEMENT_REQUIRED",
  evidence_required: "CRM_INTAKE_HANDOFF_EVIDENCE_REQUIRED",
  evidence_unavailable: "CRM_INTAKE_HANDOFF_EVIDENCE_UNAVAILABLE",
  intake_conflict: "CRM_INTAKE_HANDOFF_CONFLICT",
  inquiry_invalid: "CRM_INTAKE_HANDOFF_INQUIRY_INVALID",
  not_found: "CRM_INTAKE_HANDOFF_OPPORTUNITY_NOT_FOUND",
  workflow_incomplete: "CRM_INTAKE_HANDOFF_WORKFLOW_INCOMPLETE",
});

const MATTER_SHORTCUT_FIELDS = Object.freeze([
  "matter_id",
  "matter_ref",
  "matter_number",
  "matter_create_command",
  "matter_open_command",
  "create_matter",
  "create_from_opportunity",
  "opportunity_to_matter",
]);

function commandError(code, message, status = 409) {
  return Object.assign(new Error(message), {
    safe_error_code: code,
    status,
  });
}

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${field} is required`);
  }
  return value.trim();
}

function recordedAt(clock) {
  const value = clock();
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) {
    throw new TypeError("clock returned an invalid instant");
  }
  return date.toISOString();
}

function assertNoMatterShortcut(input = {}) {
  if (
    MATTER_SHORTCUT_FIELDS.some(
      (field) => input?.[field] !== undefined
        && input?.[field] !== null
        && input?.[field] !== false
        && input?.[field] !== "",
    )
  ) {
    throw commandError(
      CRM_INTAKE_HANDOFF_ERROR_CODES.direct_matter_blocked,
      "Opportunity cannot convert directly to Matter; Intake clearance is required",
    );
  }
}

function linkedInquiry(crmRepository, opportunity) {
  if (opportunity.lead_id) {
    const lead = crmRepository.get({
      tenant_id: opportunity.tenant_id,
      model_type: "Lead",
      lead_id: opportunity.lead_id,
    });
    if (!lead) {
      throw commandError(
        CRM_INTAKE_HANDOFF_ERROR_CODES.inquiry_invalid,
        "The Opportunity inquiry link is invalid",
      );
    }
    return lead;
  }
  const candidates = crmRepository
    .list({ tenant_id: opportunity.tenant_id, model_type: "Lead" })
    .filter((lead) => lead.opportunity_id === opportunity.opportunity_id);
  if (candidates.length > 1) {
    throw commandError(
      CRM_INTAKE_HANDOFF_ERROR_CODES.inquiry_invalid,
      "The Opportunity is linked to more than one inquiry",
    );
  }
  return candidates[0] ?? null;
}

function assertInquiryReadyForIntake(inquiry, opportunity) {
  if (!inquiry) return;
  if (
    inquiry.party_id !== opportunity.party_id
    || inquiry.inquiry_status === "closed"
  ) {
    throw commandError(
      CRM_INTAKE_HANDOFF_ERROR_CODES.inquiry_invalid,
      "The inquiry and Opportunity relationship is invalid",
    );
  }
  if (opportunity.engagement_decision !== "accepted") {
    throw commandError(
      CRM_INTAKE_HANDOFF_ERROR_CODES.engagement_required,
      "The inquiry must be accepted before Intake handoff",
    );
  }
  if (
    opportunity.engagement_workflow_status !== "completed"
    || !opportunity.engagement_workflow_id
    || !opportunity.engagement_client_group_id
    || !opportunity.engagement_fee_commitment_id
  ) {
    throw commandError(
      CRM_INTAKE_HANDOFF_ERROR_CODES.workflow_incomplete,
      "The engagement decision workflow must be completed before Intake handoff",
    );
  }
}

function stableIds(values) {
  return Object.freeze(
    [...new Set(values.filter(Boolean))].sort((left, right) =>
      left.localeCompare(right)),
  );
}

function inquiryEvidenceIds({
  evidenceRepository,
  inquiry,
}) {
  if (!inquiry) return Object.freeze([]);
  if (typeof evidenceRepository?.list !== "function") {
    if (inquiry.source === "outlook_addin") {
      throw commandError(
        CRM_INTAKE_HANDOFF_ERROR_CODES.evidence_unavailable,
        "Outlook inquiry evidence is unavailable",
        503,
      );
    }
    return Object.freeze([]);
  }
  let records;
  try {
    records = evidenceRepository.list({
      tenant_id: inquiry.tenant_id,
      model_type: "InquiryEmailEvidence",
      lead_id: inquiry.lead_id,
    });
  } catch {
    throw commandError(
      CRM_INTAKE_HANDOFF_ERROR_CODES.evidence_unavailable,
      "Inquiry evidence could not be read",
      503,
    );
  }
  const ids = stableIds(
    records
      .filter((evidence) => (
        evidence.lead_id === inquiry.lead_id
        && evidence.capture_status === "complete"
      ))
      .map(({ inquiry_email_evidence_id }) => inquiry_email_evidence_id),
  );
  if (inquiry.source === "outlook_addin" && ids.length === 0) {
    throw commandError(
      CRM_INTAKE_HANDOFF_ERROR_CODES.evidence_required,
      "Outlook inquiry evidence must be complete before Intake handoff",
    );
  }
  return ids;
}

function inquiryActivityIds({
  crmRepository,
  inquiry,
  opportunity,
}) {
  if (!inquiry) return Object.freeze([]);
  return stableIds(
    crmRepository
      .list({
        tenant_id: opportunity.tenant_id,
        model_type: "CRMActivity",
      })
      .filter((activity) => (
        activity.lead_id === inquiry.lead_id
        || activity.opportunity_id === opportunity.opportunity_id
      ))
      .map(({ crm_activity_id, resource_id }) =>
        crm_activity_id ?? resource_id),
  );
}

function intakeRequestsForOpportunity(
  intakeRepository,
  tenantId,
  opportunityId,
) {
  if (typeof intakeRepository?.list !== "function") return [];
  return intakeRepository
    .list({ tenant_id: tenantId, model_type: "IntakeRequest" })
    .filter(({ opportunity_id }) => opportunity_id === opportunityId);
}

function intakeRequestById(intakeRepository, tenantId, intakeRequestId) {
  if (typeof intakeRepository?.get !== "function") return null;
  return intakeRepository.get({
    tenant_id: tenantId,
    model_type: "IntakeRequest",
    intake_request_id: intakeRequestId,
  });
}

function assertOneIntakeRequest({
  existing,
  intakeRequestId,
}) {
  if (
    existing.length > 1
    || (existing[0] && existing[0].intake_request_id !== intakeRequestId)
  ) {
    throw commandError(
      CRM_INTAKE_HANDOFF_ERROR_CODES.intake_conflict,
      "The Opportunity is already linked to another Intake request",
    );
  }
  return existing[0] ?? null;
}

function assertIntakeRequestMatches({
  intakeRequest,
  inquiry,
  opportunity,
}) {
  const requiredMatches = [
    ["opportunity_id", opportunity.opportunity_id],
    ["requesting_party_id", opportunity.party_id],
  ];
  if (inquiry) {
    requiredMatches.push(
      ["source_inquiry_id", inquiry.lead_id],
      [
        "source_engagement_workflow_id",
        opportunity.engagement_workflow_id,
      ],
      [
        "source_client_group_id",
        opportunity.engagement_client_group_id,
      ],
      [
        "source_fee_commitment_id",
        opportunity.engagement_fee_commitment_id,
      ],
      ["engagement_decision", "accepted"],
      ["matter_opening_state", "waiting_for_intake_clearance"],
    );
  }
  if (
    requiredMatches.some(
      ([field, value]) => intakeRequest?.[field] !== value,
    )
    || !intakeRequest.party_ids?.includes(opportunity.party_id)
    || intakeRequest.matter_id
    || intakeRequest.creates_matter === true
    || (
      inquiry
      && (
        intakeRequest.conflict_check_required !== true
        || intakeRequest.signed_engagement_required !== true
        || intakeRequest.source_evidence_bytes_copied !== false
        || intakeRequest.source_activity_content_copied !== false
      )
    )
  ) {
    throw commandError(
      CRM_INTAKE_HANDOFF_ERROR_CODES.intake_conflict,
      "The existing Intake request does not match the accepted inquiry",
    );
  }
  return intakeRequest;
}

function referenceSummary(intakeRequest) {
  const evidenceIds = intakeRequest.source_inquiry_evidence_ids ?? [];
  const activityIds = intakeRequest.source_crm_activity_ids ?? [];
  return Object.freeze({
    source_inquiry_id: intakeRequest.source_inquiry_id ?? null,
    engagement_workflow_id:
      intakeRequest.source_engagement_workflow_id ?? null,
    evidence_reference_count: evidenceIds.length,
    activity_reference_count: activityIds.length,
    reference_snapshot_sha256:
      intakeRequest.source_reference_snapshot_sha256 ?? null,
    evidence_bytes_copied: false,
    activity_content_copied: false,
    automatic_matter_creation: false,
    matter_opening_state:
      intakeRequest.matter_opening_state
      ?? "waiting_for_intake_clearance",
  });
}

function replayResult({
  opportunity,
  intakeRequest,
}) {
  return Object.freeze({
    outcome: "idempotent_replay",
    opportunity,
    intake_request: intakeRequest,
    audit_events: Object.freeze([]),
    handoff: referenceSummary(intakeRequest),
    idempotent_replay: true,
    production_ready_claim: false,
  });
}

export function handoffOpportunityToIntake({
  crmRepository,
  intakeRepository = null,
  evidenceRepository = null,
  intakeService,
  tenant_id,
  opportunity_id,
  actor_id,
  idempotency_key,
  intake_request_id,
  requested_scope_summary,
  clock = () => new Date(),
  ...unsupported
} = {}) {
  const tenantId = requiredString({ tenant_id }, "tenant_id");
  const opportunityId = requiredString(
    { opportunity_id },
    "opportunity_id",
  );
  const actorId = requiredString({ actor_id }, "actor_id");
  const idempotencyKey = requiredString(
    { idempotency_key },
    "idempotency_key",
  );
  const intakeRequestId = requiredString(
    { intake_request_id },
    "intake_request_id",
  );
  assertNoMatterShortcut(unsupported);
  const opportunity = crmRepository.get({
    tenant_id: tenantId,
    model_type: "Opportunity",
    opportunity_id: opportunityId,
  });
  if (!opportunity) {
    throw commandError(
      CRM_INTAKE_HANDOFF_ERROR_CODES.not_found,
      "Opportunity was not found",
      404,
    );
  }
  assertNoMatterShortcut(opportunity);
  const inquiry = linkedInquiry(crmRepository, opportunity);
  assertInquiryReadyForIntake(inquiry, opportunity);

  if (opportunity.intake_request_id) {
    if (opportunity.intake_request_id !== intakeRequestId) {
      throw commandError(
        CRM_INTAKE_HANDOFF_ERROR_CODES.intake_conflict,
        "The Opportunity is already linked to another Intake request",
      );
    }
    const completedRequest = intakeRequestById(
      intakeRepository,
      tenantId,
      intakeRequestId,
    );
    if (completedRequest) {
      return replayResult({
        opportunity,
        intakeRequest: assertIntakeRequestMatches({
          intakeRequest: completedRequest,
          inquiry,
          opportunity,
        }),
      });
    }
  }

  const existingRequest = assertOneIntakeRequest({
    existing: intakeRequestsForOpportunity(
      intakeRepository,
      tenantId,
      opportunityId,
    ),
    intakeRequestId,
  });
  if (existingRequest) {
    assertIntakeRequestMatches({
      intakeRequest: existingRequest,
      inquiry,
      opportunity,
    });
  }
  const timestamp = recordedAt(clock);
  let intakeResult;
  if (existingRequest) {
    intakeResult = Object.freeze({
      outcome: "idempotent_replay",
      intake_request: existingRequest,
      audit_event: null,
      idempotent_replay: true,
    });
  } else {
    const evidenceIds = inquiryEvidenceIds({
      evidenceRepository,
      inquiry,
    });
    const activityIds = inquiryActivityIds({
      crmRepository,
      inquiry,
      opportunity,
    });
    const referenceSnapshot = {
      tenant_id: tenantId,
      opportunity_id: opportunityId,
      source_inquiry_id: inquiry?.lead_id ?? null,
      source_engagement_workflow_id:
        opportunity.engagement_workflow_id ?? null,
      source_client_group_id:
        opportunity.engagement_client_group_id ?? null,
      source_fee_commitment_id:
        opportunity.engagement_fee_commitment_id ?? null,
      source_inquiry_evidence_ids: evidenceIds,
      source_crm_activity_ids: activityIds,
    };
    intakeResult = intakeService.createIntakeRequest({
      request: {
        intake_request_id: intakeRequestId,
        tenant_id: tenantId,
        opportunity_id: opportunityId,
        requesting_party_id: opportunity.party_id,
        party_ids: [opportunity.party_id],
        status: "open",
        owner_user_id: actorId,
        requested_scope_summary:
          requested_scope_summary ?? opportunity.display_name,
        conflict_check_required: true,
        signed_engagement_required: true,
        engagement_decision: inquiry ? "accepted" : null,
        source_inquiry_id: referenceSnapshot.source_inquiry_id,
        source_engagement_workflow_id:
          referenceSnapshot.source_engagement_workflow_id,
        source_client_group_id:
          referenceSnapshot.source_client_group_id,
        source_fee_commitment_id:
          referenceSnapshot.source_fee_commitment_id,
        source_inquiry_evidence_ids:
          referenceSnapshot.source_inquiry_evidence_ids,
        source_crm_activity_ids:
          referenceSnapshot.source_crm_activity_ids,
        source_reference_snapshot_sha256:
          hashEventBody(referenceSnapshot),
        source_handoff_recorded_at: timestamp,
        source_evidence_bytes_copied: false,
        source_activity_content_copied: false,
        matter_opening_state: "waiting_for_intake_clearance",
        matter_id: null,
        creates_matter: false,
      },
      actor_id: actorId,
      idempotency_key: `${idempotencyKey}:intake`,
    });
    if (
      intakeResult.intake_request?.intake_request_id !== intakeRequestId
      || intakeResult.intake_request?.opportunity_id !== opportunityId
    ) {
      throw commandError(
        CRM_INTAKE_HANDOFF_ERROR_CODES.intake_conflict,
        "The Intake idempotency key is bound to another request",
      );
    }
  }
  assertIntakeRequestMatches({
    intakeRequest: intakeResult.intake_request,
    inquiry,
    opportunity,
  });

  let transition;
  if (
    opportunity.stage === "intake_requested"
    && opportunity.intake_request_id === intakeRequestId
  ) {
    transition = Object.freeze({
      opportunity,
      audit_event: null,
      idempotent_replay: true,
    });
  } else {
    transition = transitionOpportunityStage({
      repository: crmRepository,
      tenant_id: tenantId,
      opportunity_id: opportunityId,
      next_stage: "intake_requested",
      actor_id: actorId,
      idempotency_key: `${idempotencyKey}:opportunity`,
      patch: {
        intake_request_id: intakeRequestId,
        intake_handoff_snapshot_sha256:
          intakeResult.intake_request.source_reference_snapshot_sha256
          ?? null,
        intake_handoff_evidence_count:
          intakeResult.intake_request.source_inquiry_evidence_ids?.length
          ?? 0,
        intake_handoff_activity_count:
          intakeResult.intake_request.source_crm_activity_ids?.length
          ?? 0,
        intake_handoff_recorded_at:
          intakeResult.intake_request.source_handoff_recorded_at
          ?? timestamp,
      },
    });
  }

  return Object.freeze({
    outcome: existingRequest ? "recovered" : "created",
    opportunity: transition.opportunity,
    intake_request: intakeResult.intake_request,
    audit_events: Object.freeze([
      transition.audit_event ?? null,
      intakeResult.audit_event ?? null,
    ]),
    handoff: referenceSummary(intakeResult.intake_request),
    idempotent_replay:
      intakeResult.idempotent_replay
      && transition.idempotent_replay,
    production_ready_claim: false,
  });
}
