import { hashEventBody } from "../../audit/src/events.js";
import {
  autoAllocateConfirmedClientDeposits,
} from "../../billing/src/client-deposit-allocation-service.js";
import {
  synchronizeClientDepositAllocationReversals,
} from "../../billing/src/client-deposit-reallocation-service.js";
import {
  createFeeCommitment,
  updateFeeCommitment,
} from "../../billing/src/fee-commitment-service.js";
import { createClientGroupService } from "../../master-data/src/client-group-service.js";
import { appendCrmAuditEvent } from "./audit.js";
import {
  CRM_ENGAGEMENT_DECISIONS,
  normalizeCrmLeadInquiryFields,
} from "./model.js";

export const CRM_ENGAGEMENT_WORKFLOW_STEPS = Object.freeze({
  decision_recorded: "decision_recorded",
  client_group_resolved: "client_group_resolved",
  fee_commitment_created: "fee_commitment_created",
  fee_commitment_cancelled: "fee_commitment_cancelled",
});

export const CRM_ENGAGEMENT_ERROR_CODES = Object.freeze({
  client_group_ambiguous: "CRM_ENGAGEMENT_CLIENT_GROUP_AMBIGUOUS",
  client_group_step_failed: "CRM_ENGAGEMENT_CLIENT_GROUP_STEP_FAILED",
  finance_step_failed: "CRM_ENGAGEMENT_FINANCE_STEP_FAILED",
  idempotency_conflict: "CRM_ENGAGEMENT_IDEMPOTENCY_CONFLICT",
  invalid_transition: "CRM_ENGAGEMENT_TRANSITION_INVALID",
  inquiry_not_found: "CRM_ENGAGEMENT_INQUIRY_NOT_FOUND",
  inquiry_version_conflict: "CRM_ENGAGEMENT_INQUIRY_VERSION_CONFLICT",
  opportunity_not_found: "CRM_ENGAGEMENT_OPPORTUNITY_NOT_FOUND",
  party_not_found: "CRM_ENGAGEMENT_PARTY_NOT_FOUND",
  repair_not_required: "CRM_ENGAGEMENT_REPAIR_NOT_REQUIRED",
  version_conflict: "CRM_ENGAGEMENT_VERSION_CONFLICT",
  workflow_incomplete: "CRM_ENGAGEMENT_WORKFLOW_INCOMPLETE",
  workflow_not_found: "CRM_ENGAGEMENT_WORKFLOW_NOT_FOUND",
});

const DECISION_TRANSITIONS = Object.freeze({
  pending: Object.freeze(["accepted", "declined"]),
  accepted: Object.freeze(["pending"]),
  declined: Object.freeze(["pending"]),
});

const CLOSED_OPPORTUNITY_STAGES = new Set(["closed_lost", "closed_won"]);
const INACTIVE_CLIENT_GROUP_STATUSES = new Set([
  "archived",
  "blocked",
  "deleted",
  "inactive",
  "merged",
]);

function commandError(code, message, status = 409) {
  return Object.assign(new Error(message), {
    safe_error_code: code,
    status,
  });
}

function requiredString(input, field, maxLength = 500) {
  const value = input?.[field];
  if (
    typeof value !== "string"
    || value.trim() === ""
    || value.trim().length > maxLength
  ) {
    throw new TypeError(`${field} is required`);
  }
  return value.trim();
}

function positiveInteger(value, field) {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new TypeError(`${field} must be a positive integer`);
  }
  return value;
}

function optionalCalendarDate(value, field) {
  if (value === undefined || value === null || value === "") return null;
  const normalized = requiredString({ [field]: value }, field, 10);
  if (
    !/^\d{4}-\d{2}-\d{2}$/u.test(normalized)
    || new Date(`${normalized}T00:00:00.000Z`).toISOString().slice(0, 10)
      !== normalized
  ) {
    throw new TypeError(`${field} must be a valid YYYY-MM-DD date`);
  }
  return normalized;
}

function occurredAt(clock) {
  const value = clock();
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) throw new TypeError("clock returned an invalid instant");
  return date.toISOString();
}

function normalizeDecision(value) {
  const decision = requiredString(
    { engagement_decision: value },
    "engagement_decision",
    32,
  );
  if (!CRM_ENGAGEMENT_DECISIONS.includes(decision)) {
    throw new TypeError(
      `engagement_decision must be one of ${CRM_ENGAGEMENT_DECISIONS.join(", ")}`,
    );
  }
  return decision;
}

function normalizeDecisionDetails({
  decision,
  agreed_amount,
  amount_unknown_confirmed,
  due_date,
  close_reason,
}) {
  if (decision === "accepted") {
    const amountMissing = agreed_amount === undefined || agreed_amount === null;
    if (
      !amountMissing
      && (
        typeof agreed_amount !== "number"
        || !Number.isSafeInteger(agreed_amount)
        || agreed_amount < 0
      )
    ) {
      throw new TypeError("agreed_amount must be a non-negative whole KRW amount");
    }
    if (!amountMissing && amount_unknown_confirmed === true) {
      throw new TypeError(
        "amount_unknown_confirmed cannot be true when agreed_amount is entered",
      );
    }
    if (amountMissing && amount_unknown_confirmed !== true) {
      throw new TypeError("amount_unknown_confirmed must be true when agreed_amount is not entered");
    }
    if (close_reason !== undefined && close_reason !== null && close_reason !== "") {
      throw new TypeError("close_reason is only allowed for a declined decision");
    }
    return Object.freeze({
      agreed_amount: amountMissing ? null : agreed_amount,
      agreed_amount_state: amountMissing ? "not_entered" : "entered",
      amount_unknown_confirmed: amountMissing,
      due_date: optionalCalendarDate(due_date, "due_date"),
      close_reason: null,
    });
  }
  if (decision === "declined") {
    if (
      agreed_amount !== undefined
      || amount_unknown_confirmed !== undefined
      || due_date !== undefined
    ) {
      throw new TypeError("fee fields are only allowed for an accepted decision");
    }
    return Object.freeze({
      agreed_amount: null,
      agreed_amount_state: "not_applicable",
      amount_unknown_confirmed: false,
      due_date: null,
      close_reason: requiredString({ close_reason }, "close_reason", 500),
    });
  }
  if (
    agreed_amount !== undefined
    || amount_unknown_confirmed !== undefined
    || due_date !== undefined
    || close_reason !== undefined
  ) {
    throw new TypeError("fee and close fields are not allowed when reopening engagement review");
  }
  return Object.freeze({
    agreed_amount: null,
    agreed_amount_state: "not_applicable",
    amount_unknown_confirmed: false,
    due_date: null,
    close_reason: null,
  });
}

function assertNoMatterShortcut(input = {}) {
  const prohibited = [
    "matter_id",
    "matter_ref",
    "matter_number",
    "matter_create_command",
    "matter_open_command",
  ];
  if (prohibited.some((field) => input[field] !== undefined && input[field] !== null)) {
    throw new TypeError("Engagement decision cannot create or select a Matter");
  }
}

function decisionFingerprint(input) {
  return hashEventBody({
    operation: "crm_engagement_decision_v1",
    tenant_id: input.tenant_id,
    lead_id: input.lead_id,
    engagement_decision: input.engagement_decision,
    expected_inquiry_version: input.expected_inquiry_version,
    expected_engagement_version: input.expected_engagement_version,
    agreed_amount: input.agreed_amount,
    agreed_amount_state: input.agreed_amount_state,
    amount_unknown_confirmed: input.amount_unknown_confirmed,
    due_date: input.due_date,
    close_reason: input.close_reason,
    reason: input.reason,
    actor_id: input.actor_id,
  });
}

function repairFingerprint(input) {
  return hashEventBody({
    operation: "crm_engagement_repair_v1",
    tenant_id: input.tenant_id,
    lead_id: input.lead_id,
    engagement_workflow_id: input.engagement_workflow_id,
    expected_workflow_version: input.expected_workflow_version,
    reason: input.reason,
    actor_id: input.actor_id,
  });
}

function processIdFor({ tenant_id, lead_id, idempotency_key }) {
  return `engagement_process_${hashEventBody({
    tenant_id,
    lead_id,
    idempotency_key,
  }).slice(0, 32)}`;
}

function clientGroupIdFor({ tenant_id, party_id }) {
  return `client_group_engagement_${hashEventBody({
    tenant_id,
    party_id,
  }).slice(0, 24)}`;
}

function feeCommitmentIdFor({ tenant_id, opportunity_id, process_id }) {
  return `fee_commitment_engagement_${hashEventBody({
    tenant_id,
    opportunity_id,
    process_id,
  }).slice(0, 24)}`;
}

function stepIdempotencyKey(processId, step) {
  return `${processId}:${step}`;
}

function assertReplayMatches(replay, operation, fingerprint) {
  if (
    replay.operation !== operation
    || replay.request_fingerprint !== fingerprint
  ) {
    throw commandError(
      CRM_ENGAGEMENT_ERROR_CODES.idempotency_conflict,
      "Idempotency key is already bound to another engagement request",
    );
  }
}

function recordWorkflowIdempotency({
  repository,
  tenantId,
  idempotencyKey,
  operation,
  fingerprint,
  process,
}) {
  return repository.recordIdempotency({
    tenant_id: tenantId,
    idempotency_key: idempotencyKey,
    operation,
    request_fingerprint: fingerprint,
    response: {
      engagement_workflow_id: process.engagement_workflow_id,
      workflow_status: process.workflow_status,
    },
  });
}

function canonicalLead(repository, tenantId, leadId) {
  const lead = repository.get({
    tenant_id: tenantId,
    model_type: "Lead",
    lead_id: leadId,
  });
  if (!lead) {
    throw commandError(
      CRM_ENGAGEMENT_ERROR_CODES.inquiry_not_found,
      "CRM inquiry was not found",
      404,
    );
  }
  return Object.freeze({
    ...lead,
    ...normalizeCrmLeadInquiryFields(lead),
  });
}

function linkedOpportunity(repository, lead) {
  if (lead.opportunity_id) {
    const opportunity = repository.get({
      tenant_id: lead.tenant_id,
      model_type: "Opportunity",
      opportunity_id: lead.opportunity_id,
    });
    if (opportunity) return opportunity;
  }
  const candidates = repository
    .list({ tenant_id: lead.tenant_id, model_type: "Opportunity" })
    .filter((opportunity) => opportunity.lead_id === lead.lead_id);
  if (candidates.length === 1) return candidates[0];
  throw commandError(
    CRM_ENGAGEMENT_ERROR_CODES.opportunity_not_found,
    candidates.length === 0
      ? "Engagement decision requires a linked Opportunity"
      : "Engagement decision requires one unambiguous Opportunity",
    candidates.length === 0 ? 404 : 409,
  );
}

function workflowProcess(repository, tenantId, workflowId) {
  return repository.get({
    tenant_id: tenantId,
    model_type: "EngagementDecisionProcess",
    resource_id: workflowId,
  });
}

function workflowRequiredSteps(decision, priorFeeCommitmentId) {
  if (decision === "accepted") {
    return Object.freeze([
      CRM_ENGAGEMENT_WORKFLOW_STEPS.decision_recorded,
      CRM_ENGAGEMENT_WORKFLOW_STEPS.client_group_resolved,
      CRM_ENGAGEMENT_WORKFLOW_STEPS.fee_commitment_created,
    ]);
  }
  if (decision === "pending" && priorFeeCommitmentId) {
    return Object.freeze([
      CRM_ENGAGEMENT_WORKFLOW_STEPS.decision_recorded,
      CRM_ENGAGEMENT_WORKFLOW_STEPS.fee_commitment_cancelled,
    ]);
  }
  return Object.freeze([CRM_ENGAGEMENT_WORKFLOW_STEPS.decision_recorded]);
}

function decisionLabel(decision) {
  return {
    accepted: "수임 확정",
    declined: "수임하지 않음",
    pending: "수임 검토 중",
  }[decision];
}

function workflowLabel(status) {
  return {
    completed: "반영 완료",
    in_progress: "수임 확정 처리 중",
    repair_required: "반영 확인 필요",
  }[status];
}

function amountDisplay(process) {
  if (process.decision !== "accepted") return null;
  return process.agreed_amount === null
    ? "금액 미입력"
    : `${process.agreed_amount.toLocaleString("ko-KR")}원`;
}

export function summarizeEngagementDecisionProcess(process) {
  if (!process) return null;
  return Object.freeze({
    engagement_workflow_id: process.engagement_workflow_id,
    lead_id: process.lead_id,
    opportunity_id: process.opportunity_id,
    decision: process.decision,
    decision_label: decisionLabel(process.decision),
    workflow_status: process.workflow_status,
    workflow_status_label: workflowLabel(process.workflow_status),
    workflow_version: process.workflow_version,
    completed_steps: Object.freeze([...(process.completed_steps ?? [])]),
    failed_step: process.failed_step ?? null,
    safe_error_code: process.safe_error_code ?? null,
    client_group_id: process.client_group_id ?? null,
    fee_commitment_id: process.fee_commitment_id ?? null,
    agreed_amount: process.decision === "accepted"
      ? process.agreed_amount
      : null,
    agreed_amount_display: amountDisplay(process),
    due_date: process.decision === "accepted" ? process.due_date : null,
    automatic_matter_creation: false,
    direct_matter_reference_included: false,
    production_ready_claim: false,
  });
}

function recordDecision({
  repository,
  tenantId,
  lead,
  opportunity,
  decision,
  details,
  expectedEngagementVersion,
  reason,
  actorId,
  processId,
  requestFingerprint,
  idempotencyKey,
  clock,
}) {
  const timestamp = occurredAt(clock);
  const currentDecision = opportunity.engagement_decision ?? "pending";
  const currentVersion = opportunity.engagement_decision_version ?? 1;
  if (currentVersion !== expectedEngagementVersion) {
    throw commandError(
      CRM_ENGAGEMENT_ERROR_CODES.version_conflict,
      "Engagement decision version is stale",
    );
  }
  if (!DECISION_TRANSITIONS[currentDecision]?.includes(decision)) {
    throw commandError(
      CRM_ENGAGEMENT_ERROR_CODES.invalid_transition,
      `Engagement decision transition ${currentDecision}->${decision} is not allowed`,
    );
  }
  if (
    decision !== "pending"
    && CLOSED_OPPORTUNITY_STAGES.has(opportunity.stage)
  ) {
    throw commandError(
      CRM_ENGAGEMENT_ERROR_CODES.invalid_transition,
      "A closed Opportunity must be reopened before another decision",
    );
  }
  if (decision !== "pending" && lead.inquiry_status === "closed") {
    throw commandError(
      CRM_ENGAGEMENT_ERROR_CODES.invalid_transition,
      "A closed inquiry must be reopened before another decision",
    );
  }

  const priorFeeCommitmentId = opportunity.engagement_fee_commitment_id ?? null;
  const requiredSteps = workflowRequiredSteps(
    decision,
    currentDecision === "accepted" ? priorFeeCommitmentId : null,
  );
  const completedSteps = [
    CRM_ENGAGEMENT_WORKFLOW_STEPS.decision_recorded,
  ];
  const workflowStatus = requiredSteps.length === 1
    ? "completed"
    : "in_progress";
  const nextStage = decision === "declined"
    ? "closed_lost"
    : decision === "pending" && currentDecision === "declined"
      ? opportunity.engagement_previous_stage ?? "qualified"
      : opportunity.stage;
  const nextInquiryStatus = decision === "declined"
    ? "closed"
    : "reviewing";
  const nextAction = decision === "declined"
    ? null
    : decision === "accepted"
      ? "수임 절차 확인"
      : "수임 여부 검토";

  return repository.transaction((tx) => {
    const updatedLead = tx.update({
      tenant_id: tenantId,
      model_type: "Lead",
      lead_id: lead.lead_id,
    }, {
      ...normalizeCrmLeadInquiryFields(lead),
      opportunity_id: opportunity.opportunity_id,
      inquiry_status: nextInquiryStatus,
      next_action: nextAction,
      version: lead.version + 1,
      updated_by: actorId,
      updated_at: timestamp,
      updates_database_rows: true,
    });
    const updatedOpportunity = tx.update({
      tenant_id: tenantId,
      model_type: "Opportunity",
      opportunity_id: opportunity.opportunity_id,
    }, {
      engagement_decision: decision,
      engagement_decision_version: currentVersion + 1,
      engagement_decided_at: timestamp,
      engagement_decided_by: actorId,
      engagement_close_reason: details.close_reason,
      engagement_previous_stage: decision === "declined"
        ? opportunity.stage
        : opportunity.engagement_previous_stage ?? null,
      engagement_workflow_id: processId,
      engagement_workflow_status: workflowStatus,
      engagement_completed_steps: completedSteps,
      stage: nextStage,
      updated_by: actorId,
      updated_at: timestamp,
      updates_database_rows: true,
    });
    const process = tx.create({
      model_type: "EngagementDecisionProcess",
      resource_id: processId,
      engagement_workflow_id: processId,
      tenant_id: tenantId,
      lead_id: lead.lead_id,
      opportunity_id: opportunity.opportunity_id,
      party_id: opportunity.party_id,
      decision,
      prior_decision: currentDecision,
      engagement_decision_version: currentVersion + 1,
      workflow_status: workflowStatus,
      workflow_version: 1,
      required_steps: requiredSteps,
      completed_steps: completedSteps,
      current_step: requiredSteps[1] ?? null,
      failed_step: null,
      safe_error_code: null,
      failure_count: 0,
      agreed_amount: details.agreed_amount,
      agreed_amount_state: details.agreed_amount_state,
      amount_unknown_confirmed: details.amount_unknown_confirmed,
      due_date: details.due_date,
      close_reason: details.close_reason,
      prior_fee_commitment_id: priorFeeCommitmentId,
      client_group_id: opportunity.engagement_client_group_id
        ?? lead.client_group_id
        ?? null,
      fee_commitment_id: priorFeeCommitmentId,
      request_fingerprint: requestFingerprint,
      step_receipts: {
        [CRM_ENGAGEMENT_WORKFLOW_STEPS.decision_recorded]: {
          idempotency_key_sha256: hashEventBody({
            idempotency_key: stepIdempotencyKey(
              processId,
              CRM_ENGAGEMENT_WORKFLOW_STEPS.decision_recorded,
            ),
          }),
          outcome: "completed",
          completed_at: timestamp,
        },
      },
      created_by: actorId,
      updated_by: actorId,
      created_at: timestamp,
      updated_at: timestamp,
      writes_product_state: true,
      evaluates_runtime_permission: true,
      writes_audit_event: true,
      automatic_matter_creation: false,
      production_ready_claim: false,
    });
    recordWorkflowIdempotency({
      repository: tx,
      tenantId,
      idempotencyKey,
      operation: "crm_engagement_decision",
      fingerprint: requestFingerprint,
      process,
    });
    const auditEvent = appendCrmAuditEvent({
      repository: tx,
      event: {
        tenant_id: tenantId,
        actor_id: actorId,
        action: "crm.engagement.decision.recorded",
        object_type: "Opportunity",
        object_id: opportunity.opportunity_id,
        idempotency_key: stepIdempotencyKey(
          processId,
          CRM_ENGAGEMENT_WORKFLOW_STEPS.decision_recorded,
        ),
        reason,
        occurred_at: timestamp,
        metadata: {
          engagement_workflow_id: processId,
          from_decision: currentDecision,
          to_decision: decision,
          from_version: currentVersion,
          to_version: currentVersion + 1,
          workflow_status: workflowStatus,
          agreed_amount_state: details.agreed_amount_state,
          close_reason_sha256: details.close_reason
            ? hashEventBody({ close_reason: details.close_reason })
            : null,
          raw_close_reason_included: false,
          direct_matter_reference_included: false,
          automatic_matter_creation: false,
        },
      },
    });
    return Object.freeze({
      lead: updatedLead,
      opportunity: updatedOpportunity,
      process,
      audit_event: auditEvent,
    });
  });
}

function activeClientGroupsForParty(repository, tenantId, partyId) {
  return repository
    .list({ tenant_id: tenantId, model_type: "ClientGroup" })
    .filter((group) => !INACTIVE_CLIENT_GROUP_STATUSES.has(group.status))
    .filter((group) => (
      group.primary_party_id === partyId
      || (group.member_party_ids ?? []).includes(partyId)
    ));
}

function resolveClientGroup({
  repository,
  process,
  actorId,
  permissionRef,
  auditHintRef,
}) {
  if (
    typeof repository?.transaction !== "function"
    || typeof repository?.list !== "function"
  ) {
    throw commandError(
      CRM_ENGAGEMENT_ERROR_CODES.client_group_step_failed,
      "Master Data repository is unavailable",
      503,
    );
  }
  const existing = activeClientGroupsForParty(
    repository,
    process.tenant_id,
    process.party_id,
  );
  if (existing.length > 1) {
    throw commandError(
      CRM_ENGAGEMENT_ERROR_CODES.client_group_ambiguous,
      "More than one active ClientGroup contains the inquiry Party",
    );
  }
  if (existing.length === 1) {
    return Object.freeze({
      client_group: existing[0],
      resolution: "reused",
    });
  }
  const party = repository.get({
    tenant_id: process.tenant_id,
    model_type: "Party",
    party_id: process.party_id,
  });
  if (!party) {
    throw commandError(
      CRM_ENGAGEMENT_ERROR_CODES.party_not_found,
      "The inquiry Party was not found in Master Data",
      404,
    );
  }
  const clientGroupId = clientGroupIdFor({
    tenant_id: process.tenant_id,
    party_id: process.party_id,
  });
  return repository.transaction((tx) => {
    const concurrent = activeClientGroupsForParty(
      tx,
      process.tenant_id,
      process.party_id,
    );
    if (concurrent.length > 1) {
      throw commandError(
        CRM_ENGAGEMENT_ERROR_CODES.client_group_ambiguous,
        "More than one active ClientGroup contains the inquiry Party",
      );
    }
    if (concurrent.length === 1) {
      return Object.freeze({
        client_group: concurrent[0],
        resolution: "reused",
      });
    }
    const clientGroup = createClientGroupService({ repository: tx }).create({
      client_group_id: clientGroupId,
      tenant_id: process.tenant_id,
      display_name: party.display_name,
      canonical_display_name: party.display_name,
      member_entity_ids: party.canonical_entity_id
        ? [party.canonical_entity_id]
        : [],
      member_party_ids: [party.party_id],
      primary_entity_id: party.canonical_entity_id ?? null,
      primary_party_id: party.party_id,
      status: "active",
      owner_user_id: actorId,
      permission_ref: permissionRef,
      audit_hint_ref: auditHintRef,
      confidentiality: "confidential",
      synthetic_only: party.synthetic_only ?? true,
    });
    tx.appendAudit({
      event_id: `master-data:${stepIdempotencyKey(
        process.engagement_workflow_id,
        CRM_ENGAGEMENT_WORKFLOW_STEPS.client_group_resolved,
      )}`,
      tenant_id: process.tenant_id,
      actor_id: actorId,
      action: "master_data.client_group.created_from_engagement",
      object_type: "ClientGroup",
      object_id: clientGroup.client_group_id,
      decision: "allow",
      reason: "engagement_decision_client_group_resolution",
      occurred_at: new Date().toISOString(),
      metadata: {
        party_id: process.party_id,
        engagement_workflow_id: process.engagement_workflow_id,
        raw_party_details_included: false,
        automatic_matter_creation: false,
      },
      production_ready_claim: false,
    });
    tx.recordIdempotency({
      tenant_id: process.tenant_id,
      idempotency_key: stepIdempotencyKey(
        process.engagement_workflow_id,
        CRM_ENGAGEMENT_WORKFLOW_STEPS.client_group_resolved,
      ),
      operation: "engagement_client_group_resolve",
      response: {
        outcome: "created",
        client_group_id: clientGroup.client_group_id,
      },
    });
    return Object.freeze({ client_group: clientGroup, resolution: "created" });
  });
}

function createAcceptedFeeCommitment({
  financeRepository,
  masterDataRepository,
  crmRepository,
  matterRepository,
  process,
  actorId,
  reason,
}) {
  if (
    typeof financeRepository?.transaction !== "function"
    || typeof financeRepository?.getIdempotency !== "function"
  ) {
    throw commandError(
      CRM_ENGAGEMENT_ERROR_CODES.finance_step_failed,
      "Finance repository is unavailable",
      503,
    );
  }
  const step = CRM_ENGAGEMENT_WORKFLOW_STEPS.fee_commitment_created;
  const idempotencyKey = stepIdempotencyKey(
    process.engagement_workflow_id,
    step,
  );
  const feeCommitmentId = feeCommitmentIdFor({
    tenant_id: process.tenant_id,
    opportunity_id: process.opportunity_id,
    process_id: process.engagement_workflow_id,
  });
  return financeRepository.transaction(() => {
    const result = createFeeCommitment({
      repository: financeRepository,
      master_data_repository: masterDataRepository,
      crm_repository: crmRepository,
      matter_repository: matterRepository,
      fee_commitment: {
        fee_commitment_id: feeCommitmentId,
        tenant_id: process.tenant_id,
        client_group_id: process.client_group_id,
        opportunity_id: process.opportunity_id,
        matter_id: null,
        currency: "KRW",
        agreed_amount: process.agreed_amount,
        due_date: process.due_date,
        accepted_at: process.created_at,
        source_fee_arrangement_id: null,
        reason,
      },
      actor_id: actorId,
      idempotency_key: idempotencyKey,
    });
    if (!result.idempotent_replay) {
      synchronizeClientDepositAllocationReversals({
        repository: financeRepository,
        tenant_id: process.tenant_id,
        actor_id: actorId,
        idempotency_key: `${idempotencyKey}:allocation-reversal`,
      });
      autoAllocateConfirmedClientDeposits({
        repository: financeRepository,
        tenant_id: process.tenant_id,
        actor_id: actorId,
        idempotency_key: `${idempotencyKey}:allocation`,
      });
    }
    return result;
  });
}

function cancelAcceptedFeeCommitment({
  financeRepository,
  masterDataRepository,
  crmRepository,
  matterRepository,
  process,
  actorId,
  reason,
}) {
  if (
    typeof financeRepository?.transaction !== "function"
    || typeof financeRepository?.getIdempotency !== "function"
  ) {
    throw commandError(
      CRM_ENGAGEMENT_ERROR_CODES.finance_step_failed,
      "Finance repository is unavailable",
      503,
    );
  }
  const current = financeRepository.get({
    tenant_id: process.tenant_id,
    model_type: "FeeCommitment",
    fee_commitment_id: process.prior_fee_commitment_id,
  });
  if (!current) {
    throw commandError(
      CRM_ENGAGEMENT_ERROR_CODES.finance_step_failed,
      "The prior FeeCommitment was not found",
      409,
    );
  }
  const step = CRM_ENGAGEMENT_WORKFLOW_STEPS.fee_commitment_cancelled;
  const idempotencyKey = stepIdempotencyKey(
    process.engagement_workflow_id,
    step,
  );
  return financeRepository.transaction(() => {
    const result = updateFeeCommitment({
      repository: financeRepository,
      master_data_repository: masterDataRepository,
      crm_repository: crmRepository,
      matter_repository: matterRepository,
      tenant_id: process.tenant_id,
      fee_commitment_id: current.fee_commitment_id,
      expected_state_version: current.state_version,
      changes: { status: "cancelled" },
      reason,
      actor_id: actorId,
      idempotency_key: idempotencyKey,
    });
    if (!result.idempotent_replay) {
      synchronizeClientDepositAllocationReversals({
        repository: financeRepository,
        tenant_id: process.tenant_id,
        actor_id: actorId,
        idempotency_key: `${idempotencyKey}:allocation-reversal`,
      });
      autoAllocateConfirmedClientDeposits({
        repository: financeRepository,
        tenant_id: process.tenant_id,
        actor_id: actorId,
        idempotency_key: `${idempotencyKey}:allocation`,
      });
    }
    return result;
  });
}

function recordWorkflowState({
  repository,
  process,
  actorId,
  step = null,
  receipt = null,
  status = null,
  safeErrorCode = null,
  reason,
  clock,
  idempotency = null,
}) {
  const timestamp = occurredAt(clock);
  return repository.transaction((tx) => {
    const current = workflowProcess(
      tx,
      process.tenant_id,
      process.engagement_workflow_id,
    );
    if (!current) {
      throw commandError(
        CRM_ENGAGEMENT_ERROR_CODES.workflow_not_found,
        "Engagement workflow was not found",
        404,
      );
    }
    const completedSteps = new Set(current.completed_steps ?? []);
    if (step) completedSteps.add(step);
    const nextCompletedSteps = [...completedSteps];
    const nextStatus = status ?? current.workflow_status;
    const nextStep = current.required_steps.find(
      (requiredStep) => !completedSteps.has(requiredStep),
    ) ?? null;
    const stepReceipts = {
      ...(current.step_receipts ?? {}),
      ...(step
        ? {
            [step]: {
              idempotency_key_sha256: hashEventBody({
                idempotency_key: stepIdempotencyKey(
                  current.engagement_workflow_id,
                  step,
                ),
              }),
              outcome: receipt?.outcome ?? "completed",
              resource_id: receipt?.resource_id ?? null,
              resolution: receipt?.resolution ?? null,
              completed_at: timestamp,
            },
          }
        : {}),
    };
    const updatedProcess = tx.update({
      tenant_id: current.tenant_id,
      model_type: "EngagementDecisionProcess",
      resource_id: current.engagement_workflow_id,
    }, {
      workflow_status: nextStatus,
      workflow_version: current.workflow_version + 1,
      completed_steps: nextCompletedSteps,
      current_step: nextStatus === "repair_required" ? current.current_step : nextStep,
      failed_step: nextStatus === "repair_required" ? current.current_step : null,
      safe_error_code: nextStatus === "repair_required" ? safeErrorCode : null,
      failure_count: nextStatus === "repair_required"
        ? (current.failure_count ?? 0) + 1
        : current.failure_count ?? 0,
      client_group_id: receipt?.client_group_id ?? current.client_group_id ?? null,
      fee_commitment_id: receipt?.fee_commitment_id ?? current.fee_commitment_id ?? null,
      step_receipts: stepReceipts,
      updated_by: actorId,
      updated_at: timestamp,
    });
    if (idempotency) {
      recordWorkflowIdempotency({
        repository: tx,
        tenantId: current.tenant_id,
        idempotencyKey: idempotency.idempotency_key,
        operation: idempotency.operation,
        fingerprint: idempotency.request_fingerprint,
        process: updatedProcess,
      });
    }
    const opportunity = tx.update({
      tenant_id: current.tenant_id,
      model_type: "Opportunity",
      opportunity_id: current.opportunity_id,
    }, {
      engagement_workflow_status: nextStatus,
      engagement_completed_steps: nextCompletedSteps,
      engagement_client_group_id:
        receipt?.client_group_id
        ?? current.client_group_id
        ?? null,
      engagement_fee_commitment_id:
        receipt?.fee_commitment_id
        ?? current.fee_commitment_id
        ?? null,
      updated_by: actorId,
      updated_at: timestamp,
      updates_database_rows: true,
    });
    let lead = tx.get({
      tenant_id: current.tenant_id,
      model_type: "Lead",
      lead_id: current.lead_id,
    });
    if (
      receipt?.client_group_id
      && lead
      && lead.client_group_id !== receipt.client_group_id
    ) {
      lead = tx.update({
        tenant_id: current.tenant_id,
        model_type: "Lead",
        lead_id: current.lead_id,
      }, {
        client_group_id: receipt.client_group_id,
        updated_by: actorId,
        updated_at: timestamp,
        updates_database_rows: true,
      });
    }
    const action = nextStatus === "repair_required"
      ? "crm.engagement.workflow.repair_required"
      : nextStatus === "completed"
        ? "crm.engagement.workflow.completed"
        : "crm.engagement.workflow.step.completed";
    const auditEvent = appendCrmAuditEvent({
      repository: tx,
      event: {
        tenant_id: current.tenant_id,
        actor_id: actorId,
        action,
        object_type: "EngagementDecisionProcess",
        object_id: current.engagement_workflow_id,
        idempotency_key: `${current.engagement_workflow_id}:${updatedProcess.workflow_version}`,
        reason,
        occurred_at: timestamp,
        metadata: {
          completed_step: step,
          completed_step_count: nextCompletedSteps.length,
          required_step_count: current.required_steps.length,
          workflow_status: nextStatus,
          safe_error_code: safeErrorCode,
          client_group_resolution: receipt?.resolution ?? null,
          raw_error_included: false,
          automatic_matter_creation: false,
        },
      },
    });
    return Object.freeze({
      process: updatedProcess,
      opportunity,
      lead,
      audit_event: auditEvent,
    });
  });
}

function safeStepError(error, step) {
  if (
    error?.safe_error_code === CRM_ENGAGEMENT_ERROR_CODES.client_group_ambiguous
    || error?.safe_error_code === CRM_ENGAGEMENT_ERROR_CODES.party_not_found
  ) {
    return error.safe_error_code;
  }
  return step === CRM_ENGAGEMENT_WORKFLOW_STEPS.client_group_resolved
    ? CRM_ENGAGEMENT_ERROR_CODES.client_group_step_failed
    : CRM_ENGAGEMENT_ERROR_CODES.finance_step_failed;
}

function runRemainingSteps({
  crmRepository,
  masterDataRepository,
  financeRepository,
  matterRepository,
  process,
  actorId,
  permissionRef,
  auditHintRef,
  reason,
  clock,
}) {
  let current = process;
  const completed = () => new Set(current.completed_steps ?? []);
  const runStep = (step, command) => {
    if (completed().has(step)) return true;
    try {
      const receipt = command();
      current = recordWorkflowState({
        repository: crmRepository,
        process: current,
        actorId,
        step,
        receipt,
        reason,
        clock,
      }).process;
      return true;
    } catch (error) {
      current = recordWorkflowState({
        repository: crmRepository,
        process: current,
        actorId,
        status: "repair_required",
        safeErrorCode: safeStepError(error, step),
        reason,
        clock,
      }).process;
      return false;
    }
  };

  if (current.decision === "accepted") {
    const groupStep = CRM_ENGAGEMENT_WORKFLOW_STEPS.client_group_resolved;
    if (!runStep(groupStep, () => {
      const result = resolveClientGroup({
        repository: masterDataRepository,
        process: current,
        actorId,
        permissionRef,
        auditHintRef,
      });
      return {
        outcome: "completed",
        resource_id: result.client_group.client_group_id,
        client_group_id: result.client_group.client_group_id,
        resolution: result.resolution,
      };
    })) return current;

    const feeStep = CRM_ENGAGEMENT_WORKFLOW_STEPS.fee_commitment_created;
    if (!runStep(feeStep, () => {
      const result = createAcceptedFeeCommitment({
        financeRepository,
        masterDataRepository,
        crmRepository,
        matterRepository,
        process: current,
        actorId,
        reason,
      });
      return {
        outcome: result.idempotent_replay ? "replayed" : "completed",
        resource_id: result.fee_commitment.fee_commitment_id,
        fee_commitment_id: result.fee_commitment.fee_commitment_id,
      };
    })) return current;
  }

  if (
    current.decision === "pending"
    && current.prior_fee_commitment_id
  ) {
    const cancelStep = CRM_ENGAGEMENT_WORKFLOW_STEPS.fee_commitment_cancelled;
    if (!runStep(cancelStep, () => {
      const result = cancelAcceptedFeeCommitment({
        financeRepository,
        masterDataRepository,
        crmRepository,
        matterRepository,
        process: current,
        actorId,
        reason,
      });
      return {
        outcome: result.idempotent_replay ? "replayed" : "completed",
        resource_id: result.fee_commitment.fee_commitment_id,
        fee_commitment_id: result.fee_commitment.fee_commitment_id,
      };
    })) return current;
  }

  if (current.workflow_status !== "completed") {
    current = recordWorkflowState({
      repository: crmRepository,
      process: current,
      actorId,
      status: "completed",
      reason,
      clock,
    }).process;
  }
  return current;
}

function resumeInProgressWorkflow({
  crmRepository,
  masterDataRepository,
  financeRepository,
  matterRepository,
  process,
  actorId,
  permissionRef,
  auditHintRef,
  reason,
  clock,
}) {
  if (process.workflow_status !== "in_progress") return process;
  return runRemainingSteps({
    crmRepository,
    masterDataRepository,
    financeRepository,
    matterRepository,
    process,
    actorId,
    permissionRef,
    auditHintRef,
    reason,
    clock,
  });
}

function responseForProcess(repository, process, { idempotentReplay = false } = {}) {
  return Object.freeze({
    outcome: process.workflow_status === "repair_required"
      ? "repair_required"
      : idempotentReplay
        ? "idempotent_replay"
        : "completed",
    lead: repository.get({
      tenant_id: process.tenant_id,
      model_type: "Lead",
      lead_id: process.lead_id,
    }),
    opportunity: repository.get({
      tenant_id: process.tenant_id,
      model_type: "Opportunity",
      opportunity_id: process.opportunity_id,
    }),
    process,
    process_summary: summarizeEngagementDecisionProcess(process),
    idempotent_replay: idempotentReplay,
    automatic_matter_creation: false,
  });
}

export function decideInquiryEngagement({
  crm_repository,
  master_data_repository,
  finance_repository,
  matter_repository = null,
  tenant_id,
  lead_id,
  engagement_decision,
  expected_inquiry_version,
  expected_engagement_version,
  agreed_amount,
  amount_unknown_confirmed,
  due_date,
  close_reason,
  reason,
  permission_ref = null,
  audit_hint_ref = null,
  actor_id,
  idempotency_key,
  clock = () => new Date(),
  ...unsupported
} = {}) {
  if (
    typeof crm_repository?.transaction !== "function"
    || typeof crm_repository?.getIdempotency !== "function"
  ) {
    throw new TypeError("CRM repository is required");
  }
  assertNoMatterShortcut(unsupported);
  const tenantId = requiredString({ tenant_id }, "tenant_id");
  const leadId = requiredString({ lead_id }, "lead_id");
  const decision = normalizeDecision(engagement_decision);
  const expectedInquiryVersion = positiveInteger(
    expected_inquiry_version,
    "expected_inquiry_version",
  );
  const expectedEngagementVersion = positiveInteger(
    expected_engagement_version,
    "expected_engagement_version",
  );
  const changeReason = requiredString({ reason }, "reason");
  const actorId = requiredString({ actor_id }, "actor_id");
  const idempotencyKey = requiredString(
    { idempotency_key },
    "idempotency_key",
  );
  const details = normalizeDecisionDetails({
    decision,
    agreed_amount,
    amount_unknown_confirmed,
    due_date,
    close_reason,
  });
  const fingerprint = decisionFingerprint({
    tenant_id: tenantId,
    lead_id: leadId,
    engagement_decision: decision,
    expected_inquiry_version: expectedInquiryVersion,
    expected_engagement_version: expectedEngagementVersion,
    ...details,
    reason: changeReason,
    actor_id: actorId,
  });
  const processId = processIdFor({
    tenant_id: tenantId,
    lead_id: leadId,
    idempotency_key: idempotencyKey,
  });
  const replay = crm_repository.getIdempotency({
    tenant_id: tenantId,
    idempotency_key: idempotencyKey,
  });
  if (replay) {
    assertReplayMatches(replay, "crm_engagement_decision", fingerprint);
    const storedProcess = workflowProcess(
      crm_repository,
      tenantId,
      replay.response.engagement_workflow_id ?? processId,
    );
    if (!storedProcess) {
      throw commandError(
        CRM_ENGAGEMENT_ERROR_CODES.workflow_not_found,
        "Engagement workflow was not found",
        404,
      );
    }
    const replayProcess = resumeInProgressWorkflow({
      crmRepository: crm_repository,
      masterDataRepository: master_data_repository,
      financeRepository: finance_repository,
      matterRepository: matter_repository,
      process: storedProcess,
      actorId,
      permissionRef: permission_ref,
      auditHintRef: audit_hint_ref,
      reason: changeReason,
      clock,
    });
    recordWorkflowIdempotency({
      repository: crm_repository,
      tenantId,
      idempotencyKey,
      operation: "crm_engagement_decision",
      fingerprint,
      process: replayProcess,
    });
    return responseForProcess(crm_repository, replayProcess, {
      idempotentReplay: true,
    });
  }

  const existingProcess = workflowProcess(
    crm_repository,
    tenantId,
    processId,
  );
  if (existingProcess) {
    if (existingProcess.request_fingerprint !== fingerprint) {
      throw commandError(
        CRM_ENGAGEMENT_ERROR_CODES.idempotency_conflict,
        "Engagement workflow is already bound to another request",
      );
    }
    const replayProcess = resumeInProgressWorkflow({
      crmRepository: crm_repository,
      masterDataRepository: master_data_repository,
      financeRepository: finance_repository,
      matterRepository: matter_repository,
      process: existingProcess,
      actorId,
      permissionRef: permission_ref,
      auditHintRef: audit_hint_ref,
      reason: changeReason,
      clock,
    });
    recordWorkflowIdempotency({
      repository: crm_repository,
      tenantId,
      idempotencyKey,
      operation: "crm_engagement_decision",
      fingerprint,
      process: replayProcess,
    });
    return responseForProcess(crm_repository, replayProcess, {
      idempotentReplay: true,
    });
  }

  const lead = canonicalLead(crm_repository, tenantId, leadId);
  if (lead.version !== expectedInquiryVersion) {
    throw commandError(
      CRM_ENGAGEMENT_ERROR_CODES.inquiry_version_conflict,
      "CRM inquiry version is stale",
    );
  }
  const opportunity = linkedOpportunity(crm_repository, lead);
  if (
    opportunity.party_id !== lead.party_id
    || opportunity.status === "archived"
    || opportunity.status === "blocked"
  ) {
    throw commandError(
      CRM_ENGAGEMENT_ERROR_CODES.invalid_transition,
      "The inquiry and Opportunity relationship is invalid",
    );
  }
  if (
    opportunity.engagement_workflow_status === "in_progress"
    || opportunity.engagement_workflow_status === "repair_required"
  ) {
    throw commandError(
      CRM_ENGAGEMENT_ERROR_CODES.workflow_incomplete,
      "The previous engagement workflow must be completed before another decision",
    );
  }

  const recorded = recordDecision({
    repository: crm_repository,
    tenantId,
    lead,
    opportunity,
    decision,
    details,
    expectedEngagementVersion,
    reason: changeReason,
    actorId,
    processId,
    requestFingerprint: fingerprint,
    idempotencyKey,
    clock,
  });
  const process = runRemainingSteps({
    crmRepository: crm_repository,
    masterDataRepository: master_data_repository,
    financeRepository: finance_repository,
    matterRepository: matter_repository,
    process: recorded.process,
    actorId,
    permissionRef: permission_ref,
    auditHintRef: audit_hint_ref,
    reason: changeReason,
    clock,
  });
  const response = responseForProcess(crm_repository, process);
  recordWorkflowIdempotency({
    repository: crm_repository,
    tenantId,
    idempotencyKey,
    operation: "crm_engagement_decision",
    fingerprint,
    process,
  });
  return Object.freeze({
    ...response,
    decision_audit_event: recorded.audit_event,
  });
}

export function repairInquiryEngagement({
  crm_repository,
  master_data_repository,
  finance_repository,
  matter_repository = null,
  tenant_id,
  lead_id,
  expected_workflow_version,
  reason,
  permission_ref = null,
  audit_hint_ref = null,
  actor_id,
  idempotency_key,
  clock = () => new Date(),
} = {}) {
  if (
    typeof crm_repository?.transaction !== "function"
    || typeof crm_repository?.getIdempotency !== "function"
  ) {
    throw new TypeError("CRM repository is required");
  }
  const tenantId = requiredString({ tenant_id }, "tenant_id");
  const leadId = requiredString({ lead_id }, "lead_id");
  const expectedWorkflowVersion = positiveInteger(
    expected_workflow_version,
    "expected_workflow_version",
  );
  const changeReason = requiredString({ reason }, "reason");
  const actorId = requiredString({ actor_id }, "actor_id");
  const idempotencyKey = requiredString(
    { idempotency_key },
    "idempotency_key",
  );
  const lead = canonicalLead(crm_repository, tenantId, leadId);
  const opportunity = linkedOpportunity(crm_repository, lead);
  const workflowId = opportunity.engagement_workflow_id;
  if (!workflowId) {
    throw commandError(
      CRM_ENGAGEMENT_ERROR_CODES.workflow_not_found,
      "Engagement workflow was not found",
      404,
    );
  }
  const fingerprint = repairFingerprint({
    tenant_id: tenantId,
    lead_id: leadId,
    engagement_workflow_id: workflowId,
    expected_workflow_version: expectedWorkflowVersion,
    reason: changeReason,
    actor_id: actorId,
  });
  const replay = crm_repository.getIdempotency({
    tenant_id: tenantId,
    idempotency_key: idempotencyKey,
  });
  if (replay) {
    assertReplayMatches(replay, "crm_engagement_repair", fingerprint);
    const storedProcess = workflowProcess(
      crm_repository,
      tenantId,
      workflowId,
    );
    if (!storedProcess) {
      throw commandError(
        CRM_ENGAGEMENT_ERROR_CODES.workflow_not_found,
        "Engagement workflow was not found",
        404,
      );
    }
    const replayProcess = resumeInProgressWorkflow({
      crmRepository: crm_repository,
      masterDataRepository: master_data_repository,
      financeRepository: finance_repository,
      matterRepository: matter_repository,
      process: storedProcess,
      actorId,
      permissionRef: permission_ref,
      auditHintRef: audit_hint_ref,
      reason: changeReason,
      clock,
    });
    recordWorkflowIdempotency({
      repository: crm_repository,
      tenantId,
      idempotencyKey,
      operation: "crm_engagement_repair",
      fingerprint,
      process: replayProcess,
    });
    return responseForProcess(crm_repository, replayProcess, {
      idempotentReplay: true,
    });
  }
  let process = workflowProcess(crm_repository, tenantId, workflowId);
  if (!process) {
    throw commandError(
      CRM_ENGAGEMENT_ERROR_CODES.workflow_not_found,
      "Engagement workflow was not found",
      404,
    );
  }
  if (process.workflow_status !== "repair_required") {
    throw commandError(
      CRM_ENGAGEMENT_ERROR_CODES.repair_not_required,
      "Engagement workflow does not require repair",
    );
  }
  if (process.workflow_version !== expectedWorkflowVersion) {
    throw commandError(
      CRM_ENGAGEMENT_ERROR_CODES.version_conflict,
      "Engagement workflow version is stale",
    );
  }
  process = recordWorkflowState({
    repository: crm_repository,
    process,
    actorId,
    status: "in_progress",
    reason: changeReason,
    clock,
    idempotency: {
      idempotency_key: idempotencyKey,
      operation: "crm_engagement_repair",
      request_fingerprint: fingerprint,
    },
  }).process;
  process = runRemainingSteps({
    crmRepository: crm_repository,
    masterDataRepository: master_data_repository,
    financeRepository: finance_repository,
    matterRepository: matter_repository,
    process,
    actorId,
    permissionRef: permission_ref,
    auditHintRef: audit_hint_ref,
    reason: changeReason,
    clock,
  });
  const response = responseForProcess(crm_repository, process);
  recordWorkflowIdempotency({
    repository: crm_repository,
    tenantId,
    idempotencyKey,
    operation: "crm_engagement_repair",
    fingerprint,
    process,
  });
  return response;
}
