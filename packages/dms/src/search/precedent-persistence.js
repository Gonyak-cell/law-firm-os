import { codedError, safeAuditPayload } from "./precedent-common.js";

export async function findIdempotency(client, tenantId, key, operation, requestHash) {
  const result = await client.query(
    `SELECT operation, request_hash, response
       FROM lawos_dms.idempotency_keys
      WHERE tenant_id = $1 AND idempotency_key = $2`,
    [tenantId, key],
  );
  const row = result.rows[0];
  if (!row) return null;
  if (row.operation !== operation || row.request_hash !== requestHash) {
    throw codedError("precedent idempotency key conflicts with a different request", "PRECEDENT_IDEMPOTENCY_CONFLICT");
  }
  return Object.freeze({ ...row.response, replayed: true });
}

export async function recordIdempotency(client, input) {
  await client.query(
    `INSERT INTO lawos_dms.idempotency_keys
       (tenant_id, idempotency_key, operation, request_hash, response)
     VALUES ($1, $2, $3, $4, $5::jsonb)`,
    [input.tenant_id, input.idempotency_key, input.operation,
      input.request_hash, JSON.stringify(input.response)],
  );
}

export async function appendPrecedentAudit(client, input) {
  await client.query(
    `INSERT INTO lawos_dms.audit_events
       (tenant_id, event_id, event_type, actor_id, object_type, object_id, payload)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
     ON CONFLICT (tenant_id, event_id) DO NOTHING`,
    [input.tenant_id, input.event_id, input.event_type, input.actor_id,
      input.object_type ?? "PrecedentSource", input.object_id,
      JSON.stringify(safeAuditPayload(input.payload))],
  );
}

export const ELIGIBLE_DOCUMENT_SQL = `
  d.status = 'active'
  AND d.current_version_id = s.version_id
  AND d.privilege_status = 'cleared'
  AND d.current_privilege_label_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM lawos_dms.document_privilege_labels p
     WHERE p.tenant_id = s.tenant_id
       AND p.label_id = d.current_privilege_label_id
       AND p.document_id = s.document_id
       AND p.version_id = s.version_id
       AND p.classification = 'not_privileged'
       AND p.search_disposition = 'eligible'
       AND p.authority = 'dms-privilege-review-v1'
  )
  AND d.legal_hold_status <> 'active'
  AND v.sha256 = s.content_sha256
  AND f.status = 'committed'
  AND NOT EXISTS (
    SELECT 1 FROM lawos_dms.legal_holds h
     WHERE h.tenant_id = s.tenant_id
       AND h.document_id = s.document_id
       AND h.status = 'active'
  )`;
