import { withPostgresTransaction } from "../../persistence/src/postgres/transaction.js";
import {
  cloneDocusignValue,
  docusignInfrastructureFailure,
  docusignRequiredText,
  normalizeDocusignOutboxState,
} from "./docusign-envelope-model.js";

const REQUEST_SELECT = `SELECT request_data
  FROM lawos_integrations.docusign_requests
 WHERE tenant_id = $1
 ORDER BY request_id`;
const RECEIPT_SELECT = `SELECT receipt_data
  FROM lawos_integrations.docusign_webhook_receipts
 WHERE tenant_id = $1
 ORDER BY receipt_hash`;

function stateFromRows(requests, receipts) {
  return normalizeDocusignOutboxState({
    requests: requests.rows.map((row) => row.request_data),
    webhook_receipts: receipts.rows.map((row) => row.receipt_data),
  });
}

async function readRows(client, tenantId, { lock = false } = {}) {
  const requests = await client.query(`${REQUEST_SELECT}${lock ? " FOR UPDATE" : ""}`, [tenantId]);
  const receipts = await client.query(RECEIPT_SELECT, [tenantId]);
  return stateFromRows(requests, receipts);
}

async function persistState(client, tenantId, state) {
  for (const request of state.requests.filter((item) => item.tenant_id === tenantId)) {
    await client.query(
      `INSERT INTO lawos_integrations.docusign_requests
         (tenant_id, request_id, idempotency_key, active_fingerprint, envelope_id, request_data)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb)
       ON CONFLICT (tenant_id, request_id) DO UPDATE SET
         idempotency_key = EXCLUDED.idempotency_key,
         active_fingerprint = EXCLUDED.active_fingerprint,
         envelope_id = EXCLUDED.envelope_id,
         request_data = EXCLUDED.request_data,
         state_version = lawos_integrations.docusign_requests.state_version + 1,
         updated_at = clock_timestamp()`,
      [tenantId, request.request_id, request.idempotency_key, request.active_fingerprint, request.envelope_id, JSON.stringify(request)],
    );
  }
  for (const receipt of state.webhook_receipts.filter((item) => item.tenant_id === tenantId)) {
    await client.query(
      `INSERT INTO lawos_integrations.docusign_webhook_receipts
         (tenant_id, receipt_hash, receipt_data)
       VALUES ($1, $2, $3::jsonb)
       ON CONFLICT (tenant_id, receipt_hash) DO NOTHING`,
      [tenantId, receipt.receipt_hash, JSON.stringify(receipt)],
    );
  }
}

export function createPostgresDocusignEnvelopeRepository({ pool, transactionOptions = {} } = {}) {
  if (!pool || typeof pool.connect !== "function") throw new TypeError("PostgreSQL pool is required");
  const transaction = (tenantId, options, callback) => withPostgresTransaction(
    pool,
    { ...transactionOptions, ...options, tenant_id: tenantId },
    callback,
  );
  return Object.freeze({
    durable: true,
    authority: "postgres-v2",
    async readState({ tenant_id } = {}) {
      const tenantId = docusignRequiredText(tenant_id, "tenant_id");
      try {
        return await transaction(tenantId, { readOnly: true }, (client) => readRows(client, tenantId));
      } catch (error) {
        if (error?.status === 403) throw error;
        throw docusignInfrastructureFailure("DOCUSIGN_REPOSITORY_UNAVAILABLE");
      }
    },
    async transact({ tenant_id } = {}, mutate) {
      const tenantId = docusignRequiredText(tenant_id, "tenant_id");
      if (typeof mutate !== "function") throw new TypeError("DocuSign transaction callback is required");
      try {
        return await transaction(tenantId, { isolationLevel: "serializable" }, async (client) => {
          await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [tenantId]);
          const draft = cloneDocusignValue(await readRows(client, tenantId, { lock: true }));
          const result = mutate(draft, Object.freeze({ tenant_id: tenantId }));
          if (result && typeof result.then === "function") throw new TypeError("DocuSign transaction callback must be synchronous");
          const normalized = normalizeDocusignOutboxState(draft);
          await persistState(client, tenantId, normalized);
          return cloneDocusignValue(result);
        });
      } catch (error) {
        if ([400, 401, 403, 404, 409].includes(error?.status) || ["DOCUSIGN_SEND_LEASE_LOST", "DOCUSIGN_RECONCILIATION_LEASE_LOST", "DOCUSIGN_COMPLETION_FENCE_LOST"].includes(error?.safe_error_code)) throw error;
        throw docusignInfrastructureFailure("DOCUSIGN_REPOSITORY_UNAVAILABLE");
      }
    },
  });
}
