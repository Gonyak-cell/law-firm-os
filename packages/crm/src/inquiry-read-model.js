import { normalizeCrmLeadInquiryFields } from "./model.js";

export const CRM_INQUIRY_VISIBLE_STATUSES = Object.freeze([
  Object.freeze({ code: "new", label: "새 문의" }),
  Object.freeze({ code: "reviewing", label: "확인 중" }),
  Object.freeze({ code: "consultation_scheduled", label: "상담 예정" }),
  Object.freeze({ code: "engagement_review", label: "수임 검토 중" }),
  Object.freeze({ code: "engaged", label: "수임 확정" }),
  Object.freeze({ code: "not_engaged", label: "수임하지 않음" }),
]);

const STATUS_BY_CODE = new Map(
  CRM_INQUIRY_VISIBLE_STATUSES.map((status) => [status.code, status]),
);

const STATUS_BY_LABEL = new Map(
  CRM_INQUIRY_VISIBLE_STATUSES.map((status) => [status.label, status]),
);

const CLOSED_ACTIVITY_STATUSES = new Set(["archived", "cancelled"]);

function primaryId(record = {}) {
  return record.resource_id
    ?? record.crm_activity_id
    ?? record.activity_id
    ?? record.opportunity_id
    ?? null;
}

function activityTimestamp(activity = {}) {
  return activity.scheduled_start
    ?? activity.scheduled_at
    ?? activity.occurred_at
    ?? activity.created_at
    ?? null;
}

function isConsultation(activity = {}) {
  return activity.activity_kind === "consultation"
    || activity.consultation === true
    || (
      activity.activity_type === "meeting"
      && Boolean(activity.scheduled_start ?? activity.scheduled_at)
    );
}

function isIncompleteConsultation(activity = {}) {
  return isConsultation(activity)
    && activity.completed_at == null
    && !CLOSED_ACTIVITY_STATUSES.has(activity.status);
}

function compareTimestampAscending(left, right) {
  return String(left ?? "\uffff").localeCompare(String(right ?? "\uffff"));
}

function compareConsultations(left, right) {
  const leftIncomplete = isIncompleteConsultation(left);
  const rightIncomplete = isIncompleteConsultation(right);
  if (leftIncomplete !== rightIncomplete) return leftIncomplete ? -1 : 1;
  const timestampOrder = compareTimestampAscending(
    activityTimestamp(left),
    activityTimestamp(right),
  );
  if (timestampOrder !== 0) return timestampOrder;
  return String(primaryId(left) ?? "").localeCompare(String(primaryId(right) ?? ""));
}

function compareOpportunities(left, right) {
  const updatedOrder = String(right.updated_at ?? right.created_at ?? "")
    .localeCompare(String(left.updated_at ?? left.created_at ?? ""));
  if (updatedOrder !== 0) return updatedOrder;
  return String(left.opportunity_id ?? "").localeCompare(
    String(right.opportunity_id ?? ""),
  );
}

function linkedOpportunities(lead, opportunities = []) {
  return opportunities
    .filter((opportunity) => opportunity.tenant_id === lead.tenant_id)
    .filter((opportunity) => (
      opportunity.lead_id === lead.lead_id
      || (
        lead.opportunity_id
        && opportunity.opportunity_id === lead.opportunity_id
      )
    ))
    .sort(compareOpportunities);
}

function primaryOpportunity(lead, opportunities) {
  if (lead.opportunity_id) {
    return opportunities.find(
      (opportunity) => opportunity.opportunity_id === lead.opportunity_id,
    ) ?? null;
  }
  return opportunities[0] ?? null;
}

function linkedConsultations(lead, opportunities, activities = []) {
  const opportunityIds = new Set(
    opportunities.map(({ opportunity_id }) => opportunity_id),
  );
  return activities
    .filter((activity) => activity.tenant_id === lead.tenant_id)
    .filter(isConsultation)
    .filter((activity) => (
      activity.lead_id === lead.lead_id
      || opportunityIds.has(activity.opportunity_id)
    ))
    .sort(compareConsultations);
}

function statusFor({ lead, opportunity, consultations }) {
  const engagementDecision =
    opportunity?.engagement_decision
    ?? lead.engagement_decision
    ?? null;
  if (engagementDecision === "accepted") return STATUS_BY_CODE.get("engaged");
  if (
    engagementDecision === "declined"
    || opportunity?.stage === "closed_lost"
    || lead.inquiry_status === "closed"
  ) {
    return STATUS_BY_CODE.get("not_engaged");
  }
  if (engagementDecision === "pending" || opportunity) {
    return STATUS_BY_CODE.get("engagement_review");
  }
  if (consultations.some(isIncompleteConsultation)) {
    return STATUS_BY_CODE.get("consultation_scheduled");
  }
  return STATUS_BY_CODE.get(
    lead.inquiry_status === "new" ? "new" : "reviewing",
  );
}

function projectionWarnings({ lead, opportunities, opportunity, engagementDecision }) {
  const warnings = [];
  if (opportunities.length > 1) warnings.push("multiple_opportunities");
  if (lead.opportunity_id && !opportunity) warnings.push("opportunity_not_found");
  if (
    engagementDecision != null
    && !["pending", "accepted", "declined"].includes(engagementDecision)
  ) {
    warnings.push("engagement_decision_invalid");
  }
  if (
    engagementDecision === "accepted"
    && (
      lead.inquiry_status === "closed"
      || opportunity?.stage === "closed_lost"
    )
  ) {
    warnings.push("accepted_inquiry_is_closed");
  }
  return Object.freeze(warnings);
}

function consultationSummary(activity) {
  const confidential = activity.confidential === true;
  return Object.freeze({
    activity_id: primaryId(activity),
    scheduled_start: activity.scheduled_start ?? activity.scheduled_at ?? null,
    scheduled_end: activity.scheduled_end ?? null,
    timezone: activity.timezone ?? null,
    completed_at: activity.completed_at ?? null,
    subject: confidential ? "보호된 상담" : activity.subject ?? null,
    outcome: confidential ? null : activity.outcome ?? null,
    next_action: confidential ? null : activity.next_action ?? null,
    confidential,
    confidential_details_included: !confidential,
    status: activity.status ?? null,
    production_ready_claim: false,
  });
}

function intakeStatus(opportunity) {
  if (!opportunity || opportunity.engagement_decision !== "accepted") {
    return Object.freeze({ code: null, label: null });
  }
  if (opportunity.stage === "closed_won") {
    return Object.freeze({
      code: "engagement_process_completed",
      label: "수임 절차 완료",
    });
  }
  if (opportunity.stage === "intake_opened") {
    return Object.freeze({
      code: "matter_opening_ready",
      label: "Matter 개설 준비",
    });
  }
  if (opportunity.intake_request_id || opportunity.stage === "intake_requested") {
    return Object.freeze({
      code: "intake_reviewing",
      label: "계약·이해상충 확인 중",
    });
  }
  return Object.freeze({
    code: "intake_not_started",
    label: "계약·이해상충 확인 시작 전",
  });
}

function opportunitySummary(opportunity) {
  if (!opportunity) return null;
  const workflowStatusLabel = {
    completed: "반영 완료",
    in_progress: "수임 확정 처리 중",
    repair_required: "반영 확인 필요",
  }[opportunity.engagement_workflow_status] ?? null;
  const intake = intakeStatus(opportunity);
  return Object.freeze({
    opportunity_id: opportunity.opportunity_id,
    stage: opportunity.stage,
    engagement_decision: opportunity.engagement_decision ?? null,
    engagement_decision_version:
      opportunity.engagement_decision_version ?? 1,
    engagement_decided_at: opportunity.engagement_decided_at ?? null,
    engagement_workflow_status:
      opportunity.engagement_workflow_status ?? null,
    engagement_workflow_status_label: workflowStatusLabel,
    engagement_client_group_id:
      opportunity.engagement_client_group_id ?? null,
    engagement_fee_commitment_id:
      opportunity.engagement_fee_commitment_id ?? null,
    intake_request_id: opportunity.intake_request_id ?? null,
    intake_status: intake.code,
    intake_status_label: intake.label,
    matter_opening_state:
      opportunity.intake_request_id
        ? "waiting_for_intake_clearance"
        : null,
    intake_handoff_evidence_count:
      opportunity.intake_handoff_evidence_count ?? 0,
    intake_handoff_activity_count:
      opportunity.intake_handoff_activity_count ?? 0,
    owner_user_id: opportunity.owner_user_id ?? null,
    direct_matter_reference_included: false,
    production_ready_claim: false,
  });
}

export function normalizeCrmInquiryVisibleStatus(value) {
  const normalized = String(value ?? "").trim();
  if (!normalized) return null;
  return STATUS_BY_CODE.get(normalized) ?? STATUS_BY_LABEL.get(normalized) ?? null;
}

export function projectCrmInquiry({
  lead,
  opportunities = [],
  activities = [],
} = {}) {
  if (!lead || lead.model_type !== "Lead") {
    throw new TypeError("Lead is required for CRM inquiry projection");
  }
  const canonicalLead = Object.freeze({
    ...lead,
    ...normalizeCrmLeadInquiryFields(lead),
  });
  const relatedOpportunities = linkedOpportunities(
    canonicalLead,
    opportunities,
  );
  const opportunity = primaryOpportunity(
    canonicalLead,
    relatedOpportunities,
  );
  const consultations = linkedConsultations(
    canonicalLead,
    relatedOpportunities,
    activities,
  );
  const engagementDecision =
    opportunity?.engagement_decision
    ?? canonicalLead.engagement_decision
    ?? null;
  const visibleStatus = statusFor({
    lead: canonicalLead,
    opportunity,
    consultations,
  });
  const warnings = projectionWarnings({
    lead: canonicalLead,
    opportunities: relatedOpportunities,
    opportunity,
    engagementDecision,
  });
  const consultationItems = Object.freeze(
    consultations.map(consultationSummary),
  );
  const nextConsultation =
    consultationItems.find(({ completed_at, status }) => (
      completed_at == null
      && !CLOSED_ACTIVITY_STATUSES.has(status)
    )) ?? null;
  return Object.freeze({
    resource_id: canonicalLead.lead_id,
    tenant_id: canonicalLead.tenant_id,
    lead_id: canonicalLead.lead_id,
    party_id: canonicalLead.party_id,
    client_group_id:
      opportunity?.engagement_client_group_id
      ?? canonicalLead.client_group_id
      ?? null,
    display_name: canonicalLead.display_name,
    visible_status: visibleStatus.code,
    visible_status_label: visibleStatus.label,
    inquiry_status: canonicalLead.inquiry_status,
    source: canonicalLead.source,
    received_at: canonicalLead.received_at,
    next_action: canonicalLead.next_action,
    assigned_user_id: canonicalLead.assigned_user_id ?? null,
    owner_user_id: canonicalLead.owner_user_id ?? null,
    record_status: canonicalLead.status,
    version: canonicalLead.version,
    opportunity_id: opportunity?.opportunity_id ?? null,
    engagement_decision: engagementDecision,
    engagement_workflow_status:
      opportunity?.engagement_workflow_status ?? null,
    next_consultation: nextConsultation,
    opportunity: opportunitySummary(opportunity),
    consultations: consultationItems,
    needs_review: warnings.length > 0,
    review_codes: warnings,
    detail_path: `/api/crm/inquiries/${encodeURIComponent(canonicalLead.lead_id)}`,
    direct_matter_reference_included: false,
    production_ready_claim: false,
  });
}

export function summarizeCrmInquiry(projection) {
  return Object.freeze({
    resource_id: projection.resource_id,
    tenant_id: projection.tenant_id,
    lead_id: projection.lead_id,
    party_id: projection.party_id,
    client_group_id: projection.client_group_id,
    display_name: projection.display_name,
    visible_status: projection.visible_status,
    visible_status_label: projection.visible_status_label,
    inquiry_status: projection.inquiry_status,
    source: projection.source,
    received_at: projection.received_at,
    next_action: projection.next_action,
    assigned_user_id: projection.assigned_user_id,
    version: projection.version,
    opportunity_id: projection.opportunity_id,
    engagement_decision: projection.engagement_decision,
    engagement_workflow_status: projection.engagement_workflow_status,
    next_consultation: projection.next_consultation,
    needs_review: projection.needs_review,
    review_codes: projection.review_codes,
    detail_path: projection.detail_path,
    direct_matter_reference_included: false,
    production_ready_claim: false,
  });
}

export function compareCrmInquirySummaries(left, right) {
  const receivedOrder = String(right.received_at ?? "")
    .localeCompare(String(left.received_at ?? ""));
  if (receivedOrder !== 0) return receivedOrder;
  return String(left.lead_id).localeCompare(String(right.lead_id));
}
