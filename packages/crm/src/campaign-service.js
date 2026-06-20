import { appendCrmAuditEvent } from "./audit.js";

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function assertNoOptedOutSend(campaign = {}) {
  for (const partyId of campaign.contact_party_ids ?? []) {
    if (campaign.contact_consent_by_party_id?.[partyId] === "opted_out") {
      throw new Error(`Campaign cannot activate opted-out contact: ${partyId}`);
    }
  }
}

export function createCampaign({ repository, campaign, actor_id, idempotency_key } = {}) {
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  requiredString(campaign, "tenant_id");
  assertNoOptedOutSend(campaign);
  const replay = repository.getIdempotency({ tenant_id: campaign.tenant_id, idempotency_key });
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });

  return repository.transaction((tx) => {
    const record = tx.create({
      ...campaign,
      model_type: "Campaign",
      status: campaign.status ?? "active",
      owner_user_id: campaign.owner_user_id ?? actor_id,
    });
    const auditEvent = appendCrmAuditEvent({
      repository: tx,
      event: {
        tenant_id: record.tenant_id,
        actor_id,
        action: "crm.campaign.create",
        object_type: "Campaign",
        object_id: record.campaign_id,
        idempotency_key,
      },
    });
    const response = Object.freeze({ outcome: "created", campaign: record, audit_event: auditEvent, idempotent_replay: false });
    tx.recordIdempotency({ tenant_id: record.tenant_id, idempotency_key, operation: "crm_campaign_create", response });
    return response;
  });
}
