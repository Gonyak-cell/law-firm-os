import { transitionOpportunityStage } from "./opportunity-service.js";

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

export function handoffOpportunityToIntake({
  crmRepository,
  intakeService,
  tenant_id,
  opportunity_id,
  actor_id,
  idempotency_key,
  intake_request_id,
  requested_scope_summary,
} = {}) {
  requiredString({ tenant_id }, "tenant_id");
  requiredString({ opportunity_id }, "opportunity_id");
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  requiredString({ intake_request_id }, "intake_request_id");
  const opportunity = crmRepository.get({ tenant_id, model_type: "Opportunity", opportunity_id });
  if (!opportunity) throw new Error(`Opportunity not found: ${opportunity_id}`);
  if (opportunity.matter_id || opportunity.matter_ref) throw new Error("Opportunity contains forbidden direct Matter reference");

  const intakeResult = intakeService.createIntakeRequest({
    request: {
      intake_request_id,
      tenant_id,
      opportunity_id,
      requesting_party_id: opportunity.party_id,
      party_ids: [opportunity.party_id],
      status: "open",
      owner_user_id: actor_id,
      requested_scope_summary: requested_scope_summary ?? opportunity.display_name,
    },
    actor_id,
    idempotency_key: `${idempotency_key}:intake`,
  });
  const transition = transitionOpportunityStage({
    repository: crmRepository,
    tenant_id,
    opportunity_id,
    next_stage: "intake_requested",
    actor_id,
    idempotency_key: `${idempotency_key}:opportunity`,
    patch: { intake_request_id },
  });

  return Object.freeze({
    outcome: "created",
    opportunity: transition.opportunity,
    intake_request: intakeResult.intake_request,
    audit_events: Object.freeze([transition.audit_event, intakeResult.audit_event]),
    idempotent_replay: intakeResult.idempotent_replay || transition.idempotent_replay,
    production_ready_claim: false,
  });
}
