import { withPostgresTransaction } from "../../persistence/src/postgres/transaction.js";
import { requiredSyncString } from "./conversation-sync-model.js";
import { isOwnedDelegatedConnection } from "./graph-subscription-binding.js";

function exactInstantMilliseconds(value) {
  if (typeof value !== "string") return null;
  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds)
    && new Date(milliseconds).toISOString() === value
    ? milliseconds
    : null;
}

export function classifyMaintenanceConnection(connection, input, at) {
  if (!isOwnedDelegatedConnection(connection, input)
    || connection.model_type !== "M365Connection") {
    throw new Error("owned delegated Microsoft cleanup authority is required");
  }
  if (connection.revoked_at) return "revoked_connection";
  const expiresAt = exactInstantMilliseconds(connection.expires_at);
  if (expiresAt === null || expiresAt <= at.getTime()) return "expired_connection";
  if (!Array.isArray(connection.granted_scopes)
    || !connection.granted_scopes.includes("Mail.Read")) {
    return "scope_lost_connection";
  }
  return null;
}

export function createPostgresConversationMaintenanceAuthorityLookup({
  pool,
  tenant_id,
} = {}) {
  if (!pool?.connect) throw new TypeError("PostgreSQL pool is required");
  const tenantId = requiredSyncString({ tenant_id }, "tenant_id");

  return async function readConnectionMaintenanceAuthority(input = {}) {
    for (const field of ["tenant_id", "user_id", "entra_subject_id", "m365_connection_id"]) {
      requiredSyncString(input, field);
    }
    if (input.tenant_id !== tenantId) {
      throw new Error("Graph maintenance tenant authority does not match");
    }
    return withPostgresTransaction(
      pool,
      { tenant_id: tenantId, readOnly: true },
      async (client) => {
        const connection = (await client.query(
          `SELECT payload->>'model_type' AS model_type,
                  payload->>'tenant_id' AS tenant_id,
                  payload->>'user_id' AS user_id,
                  payload->>'entra_subject_id' AS entra_subject_id,
                  payload->>'m365_connection_id' AS m365_connection_id,
                  payload->>'mailbox_address_hash' AS mailbox_address_hash,
                  payload->'granted_scopes' AS granted_scopes,
                  payload->>'expires_at' AS expires_at,
                  payload->>'revoked_at' AS revoked_at,
                  payload->>'connection_authority' AS connection_authority,
                  payload->>'mailbox_scope' AS mailbox_scope
             FROM lawos_domain.records
            WHERE tenant_id=$1 AND domain_id='email-dms'
              AND record_type='M365Connection' AND record_id=$2
              AND payload->>'model_type'='M365Connection'
              AND payload->>'tenant_id'=$1 AND payload->>'user_id'=$3
              AND payload->>'entra_subject_id'=$4
              AND payload->>'m365_connection_id'=$2`,
          [tenantId, input.m365_connection_id, input.user_id,
            input.entra_subject_id],
        )).rows[0];
        if (!connection) return null;
        const subscriptions = (await client.query(
          `SELECT subscription_id,provider_subscription_id,resource,status,
                  next_attempt_at,attempt_count
             FROM lawos_email_dms.graph_subscriptions
            WHERE tenant_id=$1 AND user_id=$2 AND entra_subject_id=$3
              AND m365_connection_id=$4 AND status<>'revoked'`,
          [tenantId, input.user_id, input.entra_subject_id,
            input.m365_connection_id],
        )).rows;
        return Object.freeze({
          connection: Object.freeze(connection),
          subscriptions: Object.freeze(subscriptions.map(Object.freeze)),
        });
      },
    );
  };
}
