import { randomUUID } from "node:crypto";
import { withPostgresTransaction } from "../../persistence/src/postgres/transaction.js";
import {
  conversationPolicyId,
  normalizeConversationPolicy,
  requiredSyncString,
  syncDigest,
} from "./conversation-sync-model.js";

const SERVICE_ACTOR = "outlook-conversation-sync-service";

function version(value) {
  if (!Number.isSafeInteger(value) || value < 0) throw new TypeError("expected_version must be a non-negative integer");
  return value;
}

function instant(value) {
  return value instanceof Date ? value.toISOString() : value;
}

function policyRow(row) {
  return normalizeConversationPolicy({
    ...row,
    version: Number(row.version),
    created_at: instant(row.created_at),
    updated_at: instant(row.updated_at),
    revoked_at: row.revoked_at ? instant(row.revoked_at) : null,
  });
}

function fingerprint(operation, input) {
  return syncDigest("request", {
    operation,
    tenant_id: input.tenant_id,
    policy_id: input.policy_id ?? null,
    user_id: input.user_id ?? null,
    entra_subject_id: input.entra_subject_id ?? null,
    actor_id: input.actor_id,
    m365_connection_id: input.m365_connection_id ?? null,
    matter_id: input.matter_id ?? null,
    conversation_id: input.conversation_id ?? null,
    seed_email_thread_id: input.seed_email_thread_id ?? null,
    seed_filing_receipt_ref: input.seed_filing_receipt_ref ?? null,
    expected_version: input.expected_version,
    reason: input.reason ?? null,
  });
}

async function authorizeMutation(authorize, operation, input, policy) {
  if (typeof authorize !== "function") throw new TypeError("conversation policy authority callback is required");
  if (await authorize({ operation, input: Object.freeze({ ...input }), policy }) !== true) {
    throw new Error("current connection, seed filing, and Matter authority are required");
  }
}

async function replay(client, input, operation) {
  const key = requiredSyncString(input, "idempotency_key");
  const found = (await client.query(
    `SELECT operation,request_fingerprint,response
       FROM lawos_email_dms.graph_sync_idempotency
      WHERE tenant_id=$1 AND idempotency_key=$2`,
    [input.tenant_id, key],
  )).rows[0];
  if (!found) return null;
  if (found.operation !== operation || found.request_fingerprint !== fingerprint(operation, input)) {
    throw new Error("idempotency key conflicts with a different request");
  }
  return Object.freeze({ ...found.response, outcome: "idempotent_replay" });
}

async function record(client, input, operation, outcome, policy, at) {
  const response = { outcome, policy };
  await client.query(
    `INSERT INTO lawos_email_dms.graph_sync_audit_events
       (tenant_id,event_id,event_type,object_id,actor_id,details,occurred_at)
     VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7)`,
    [input.tenant_id, randomUUID(), `conversation_policy.${operation}`,
      policy.policy_id, input.actor_id, JSON.stringify({ version: policy.version, reason: input.reason ?? null }), at],
  );
  await client.query(
    `INSERT INTO lawos_email_dms.graph_sync_idempotency
       (tenant_id,idempotency_key,operation,request_fingerprint,response,created_at)
     VALUES ($1,$2,$3,$4,$5::jsonb,$6)`,
    [input.tenant_id, input.idempotency_key, operation, fingerprint(operation, input), JSON.stringify(response), at],
  );
  return Object.freeze(response);
}

export function createPostgresConversationPolicyService({ pool, tenant_id, clock = () => new Date() } = {}) {
  if (!pool?.connect) throw new TypeError("PostgreSQL pool is required");
  const tenantId = requiredSyncString({ tenant_id }, "tenant_id");
  const tx = (callback) => withPostgresTransaction(pool, { tenant_id: tenantId, isolationLevel: "serializable" }, callback);
  const now = () => {
    const value = clock();
    if (!(value instanceof Date) || !Number.isFinite(value.getTime())) throw new TypeError("clock must return a valid Date");
    return value.toISOString();
  };

  async function enable(input = {}, { authorize } = {}) {
    for (const field of ["tenant_id", "user_id", "entra_subject_id", "actor_id", "m365_connection_id", "mailbox_ref", "matter_id", "conversation_id", "seed_email_thread_id", "seed_filing_receipt_ref", "idempotency_key"]) requiredSyncString(input, field);
    if (input.tenant_id !== tenantId || input.actor_id !== input.user_id) throw new Error("conversation policy owner authority does not match");
    version(input.expected_version);
    const policyId = conversationPolicyId(input);
    return tx(async (client) => {
      const selected = await client.query(
        `SELECT * FROM lawos_email_dms.conversation_policies
          WHERE tenant_id=$1 AND policy_id=$2 FOR UPDATE`, [tenantId, policyId],
      );
      const existing = selected.rows[0] ? policyRow(selected.rows[0]) : null;
      await authorizeMutation(authorize, "enable", input, existing);
      const replayed = await replay(client, input, "enabled");
      if (replayed) return replayed;
      if ((existing?.version ?? 0) !== input.expected_version) throw new Error("conversation policy version conflict");
      if (existing && (existing.user_id !== input.user_id || existing.entra_subject_id !== input.entra_subject_id
        || existing.m365_connection_id !== input.m365_connection_id || existing.matter_id !== input.matter_id
        || existing.seed_email_thread_id !== input.seed_email_thread_id || existing.seed_filing_receipt_ref !== input.seed_filing_receipt_ref)) {
        throw new Error("conversation policy seed or owner is immutable");
      }
      const at = now();
      const result = await client.query(
        `INSERT INTO lawos_email_dms.conversation_policies
          (tenant_id,policy_id,user_id,entra_subject_id,m365_connection_id,mailbox_ref,
           conversation_id,matter_id,seed_email_thread_id,seed_filing_receipt_ref,
           enabling_actor_id,status,pause_reason,version,created_at,updated_at,revoked_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'active',NULL,1,$12,$12,NULL)
         ON CONFLICT (tenant_id,policy_id) DO UPDATE SET
           status='active',pause_reason=NULL,version=lawos_email_dms.conversation_policies.version+1,
           updated_at=EXCLUDED.updated_at,revoked_at=NULL
         RETURNING *`,
        [tenantId, policyId, input.user_id, input.entra_subject_id, input.m365_connection_id,
          input.mailbox_ref, input.conversation_id, input.matter_id, input.seed_email_thread_id,
          input.seed_filing_receipt_ref, input.actor_id, at],
      );
      const policy = policyRow(result.rows[0]);
      return record(client, input, "enabled", existing ? "reenabled" : "created", policy, at);
    });
  }

  async function revoke(input = {}, { authorize } = {}) {
    for (const field of ["tenant_id", "policy_id", "user_id", "entra_subject_id", "actor_id", "m365_connection_id", "matter_id", "reason", "idempotency_key"]) requiredSyncString(input, field);
    if (input.tenant_id !== tenantId || input.actor_id !== input.user_id) throw new Error("conversation policy owner authority does not match");
    version(input.expected_version);
    return tx(async (client) => {
      const row = (await client.query(
        `SELECT * FROM lawos_email_dms.conversation_policies
          WHERE tenant_id=$1 AND policy_id=$2 FOR UPDATE`, [tenantId, input.policy_id],
      )).rows[0];
      if (!row) throw new Error("conversation policy not found");
      const existing = policyRow(row);
      if (existing.user_id !== input.user_id || existing.entra_subject_id !== input.entra_subject_id
        || existing.m365_connection_id !== input.m365_connection_id || existing.matter_id !== input.matter_id) {
        throw new Error("conversation policy owner authority does not match");
      }
      await authorizeMutation(authorize, "revoke", input, existing);
      const replayed = await replay(client, input, "revoked");
      if (replayed) return replayed;
      if (existing.version !== input.expected_version) throw new Error("conversation policy version conflict");
      const at = now();
      const policy = policyRow((await client.query(
        `UPDATE lawos_email_dms.conversation_policies SET
           status='revoked',pause_reason=$3,version=version+1,updated_at=$4,revoked_at=$4
         WHERE tenant_id=$1 AND policy_id=$2 RETURNING *`,
        [tenantId, input.policy_id, input.reason, at],
      )).rows[0]);
      return record(client, input, "revoked", "revoked", policy, at);
    });
  }

  async function pause(input = {}) {
    for (const field of ["tenant_id", "policy_id", "reason", "actor_id"]) requiredSyncString(input, field);
    if (input.tenant_id !== tenantId || input.actor_id !== SERVICE_ACTOR) throw new Error("conversation policy service authority does not match");
    version(input.expected_version);
    return tx(async (client) => {
      const at = now();
      const result = await client.query(
        `UPDATE lawos_email_dms.conversation_policies SET
           status='paused',pause_reason=$3,version=version+1,updated_at=$4
         WHERE tenant_id=$1 AND policy_id=$2 AND version=$5 AND status='active'
         RETURNING *`, [tenantId, input.policy_id, input.reason, at, input.expected_version],
      );
      if (result.rowCount !== 1) throw new Error("conversation policy version conflict");
      const policy = policyRow(result.rows[0]);
      await client.query(
        `INSERT INTO lawos_email_dms.graph_sync_audit_events
          (tenant_id,event_id,event_type,object_id,actor_id,details,occurred_at)
         VALUES ($1,$2,'conversation_policy.paused',$3,$4,$5::jsonb,$6)`,
        [tenantId, randomUUID(), policy.policy_id, SERVICE_ACTOR,
          JSON.stringify({ version: policy.version, reason: input.reason }), at],
      );
      return Object.freeze({ outcome: "paused", policy });
    });
  }

  return Object.freeze({ authority: "postgres-conversation-policy", durable: true, enable, revoke, pause });
}
