import { createHash, randomUUID } from "node:crypto";

const ACTOR = "graph-subscription-reconciler";

export function hashGraphSubscriptionSecret(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function graphSubscriptionSafeCode(error) {
  const value = error?.safe_error_code ?? error?.code;
  return typeof value === "string" && /^[A-Z0-9_]{1,80}$/u.test(value)
    ? value
    : "GRAPH_SUBSCRIPTION_FAILED";
}

export function createGraphSubscriptionAuditor(tenantId) {
  return async function audit(client, event, row, at, details = {}) {
    await client.query(
      `INSERT INTO lawos_email_dms.graph_sync_audit_events
        (tenant_id,event_id,event_type,object_id,actor_id,details,occurred_at)
       VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7)`,
      [tenantId, randomUUID(), `graph_subscription.${event}`,
        row.subscription_id, ACTOR, JSON.stringify(details), at.toISOString()],
    );
  };
}
