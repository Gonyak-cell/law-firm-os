import { appendCrmAuditEvent } from "./audit.js";

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

export function createProposal({ repository, proposal, actor_id, idempotency_key } = {}) {
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  requiredString(proposal, "tenant_id");
  requiredString(proposal, "fee_estimate_ref");
  const replay = repository.getIdempotency({ tenant_id: proposal.tenant_id, idempotency_key });
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });

  return repository.transaction((tx) => {
    const record = tx.create({
      ...proposal,
      model_type: "Proposal",
      status: proposal.status ?? "active",
      proposal_status: proposal.proposal_status ?? "sent",
      owner_user_id: proposal.owner_user_id ?? actor_id,
    });
    const auditEvent = appendCrmAuditEvent({
      repository: tx,
      event: {
        tenant_id: record.tenant_id,
        actor_id,
        action: "crm.proposal.create",
        object_type: "Proposal",
        object_id: record.proposal_id,
        idempotency_key,
        metadata: { fee_estimate_ref: record.fee_estimate_ref },
      },
    });
    const response = Object.freeze({ outcome: "created", proposal: record, audit_event: auditEvent, idempotent_replay: false });
    tx.recordIdempotency({ tenant_id: record.tenant_id, idempotency_key, operation: "crm_proposal_create", response });
    return response;
  });
}
