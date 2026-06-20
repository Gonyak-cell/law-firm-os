import { appendCrmAuditEvent } from "./audit.js";

const ALLOWED_STAGE_TRANSITIONS = Object.freeze({
  new: Object.freeze(["qualified", "closed_lost"]),
  qualified: Object.freeze(["intake_requested", "closed_lost"]),
  intake_requested: Object.freeze(["intake_opened", "closed_lost"]),
  intake_opened: Object.freeze(["closed_won", "closed_lost"]),
  closed_lost: Object.freeze([]),
  closed_won: Object.freeze([]),
});

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function assertNoMatterShortcut(input = {}) {
  if (input.matter_id || input.matter_ref || input.matter_number || input.matter_create_command || input.matter_open_command) {
    throw new Error("Opportunity cannot convert directly to Matter; Intake clearance is required");
  }
}

export function createOpportunity({ repository, opportunity, actor_id, idempotency_key } = {}) {
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  requiredString(opportunity, "tenant_id");
  assertNoMatterShortcut(opportunity);
  const replay = repository.getIdempotency({ tenant_id: opportunity.tenant_id, idempotency_key });
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });

  return repository.transaction((tx) => {
    const record = tx.create({
      ...opportunity,
      model_type: "Opportunity",
      stage: opportunity.stage ?? "new",
      status: opportunity.status ?? "active",
      owner_user_id: opportunity.owner_user_id ?? actor_id,
    });
    const auditEvent = appendCrmAuditEvent({
      repository: tx,
      event: {
        tenant_id: record.tenant_id,
        actor_id,
        action: "crm.opportunity.created",
        object_type: "Opportunity",
        object_id: record.opportunity_id,
        idempotency_key,
      },
    });
    const response = Object.freeze({ outcome: "created", opportunity: record, audit_event: auditEvent, idempotent_replay: false });
    tx.recordIdempotency({ tenant_id: record.tenant_id, idempotency_key, operation: "crm_opportunity_create", response });
    return response;
  });
}

export function transitionOpportunityStage({
  repository,
  tenant_id,
  opportunity_id,
  next_stage,
  actor_id,
  idempotency_key,
  patch = {},
} = {}) {
  requiredString({ tenant_id }, "tenant_id");
  requiredString({ opportunity_id }, "opportunity_id");
  requiredString({ next_stage }, "next_stage");
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  assertNoMatterShortcut(patch);
  const replay = repository.getIdempotency({ tenant_id, idempotency_key });
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });

  return repository.transaction((tx) => {
    const current = tx.get({ tenant_id, model_type: "Opportunity", opportunity_id });
    if (!current) throw new Error(`Opportunity not found: ${opportunity_id}`);
    if (!ALLOWED_STAGE_TRANSITIONS[current.stage]?.includes(next_stage)) {
      throw new Error(`Opportunity stage transition ${current.stage}->${next_stage} is not allowed`);
    }
    const updated = tx.update(
      { tenant_id, model_type: "Opportunity", opportunity_id },
      {
        ...patch,
        stage: next_stage,
        updates_database_rows: true,
      },
    );
    const auditEvent = appendCrmAuditEvent({
      repository: tx,
      event: {
        tenant_id,
        actor_id,
        action: "crm.opportunity.stage.transition",
        object_type: "Opportunity",
        object_id: opportunity_id,
        idempotency_key,
        metadata: { from_stage: current.stage, to_stage: next_stage },
      },
    });
    const response = Object.freeze({ outcome: "updated", opportunity: updated, audit_event: auditEvent, idempotent_replay: false });
    tx.recordIdempotency({ tenant_id, idempotency_key, operation: "crm_opportunity_stage_transition", response });
    return response;
  });
}
