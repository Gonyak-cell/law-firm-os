import { withPostgresTransaction } from "../../../persistence/src/postgres/transaction.js";
import { createPrecedentSource } from "../precedent-source.js";
import {
  PRECEDENT_APPROVAL_AUTHORITY,
  codedError,
  hashValue,
  requiredId,
  requiredText,
  requiredTimestamp,
  sourceSnapshot,
} from "./precedent-common.js";
import {
  ELIGIBLE_DOCUMENT_SQL,
  appendPrecedentAudit,
  findIdempotency,
  recordIdempotency,
} from "./precedent-persistence.js";

function approval(input = {}) {
  const authority = requiredText(input.approval_authority, "approval_authority", 80);
  if (authority !== PRECEDENT_APPROVAL_AUTHORITY) throw new TypeError("approval_authority is invalid");
  return Object.freeze({
    approval_id: requiredId(input.approval_id, "approval_id"),
    approval_batch_id: requiredId(input.approval_batch_id, "approval_batch_id"),
    approval_decision_id: requiredId(input.approval_decision_id, "approval_decision_id"),
    approval_authority: authority,
    approved_by: requiredId(input.approved_by, "approved_by"),
    approved_at: requiredTimestamp(input.approved_at, "approved_at"),
  });
}

function values(source, approved) {
  return [source.tenant_id, source.source_id, source.source_kind, source.matter_id,
    source.document_id, source.version_id, source.content_sha256, source.title,
    source.court, source.case_number, source.decision_date, source.source_url,
    source.source_reference, approved.approval_id, approved.approval_batch_id,
    approved.approval_decision_id, approved.approval_authority, approved.approved_by,
    approved.approved_at];
}

async function assertEligible(client, source) {
  const result = await client.query(
    `SELECT 1
       FROM (SELECT $1::text tenant_id, $2::text document_id,
                    $3::text version_id, $4::text content_sha256) s
       JOIN lawos_dms.documents d
         ON d.tenant_id = s.tenant_id AND d.document_id = s.document_id
       JOIN lawos_dms.document_versions v
         ON v.tenant_id = s.tenant_id AND v.version_id = s.version_id
       JOIN lawos_dms.file_objects f
         ON f.tenant_id = v.tenant_id AND f.file_object_id = v.file_object_id
      WHERE d.matter_id = $5 AND ${ELIGIBLE_DOCUMENT_SQL}`,
    [source.tenant_id, source.document_id, source.version_id,
      source.content_sha256, source.matter_id],
  );
  if (!result.rows[0]) {
    throw codedError("precedent source is not an eligible current DMS version", "PRECEDENT_SOURCE_INELIGIBLE", 409);
  }
}

export function createPrecedentRegistryRepository({ pool } = {}) {
  if (!pool?.connect) throw new TypeError("PostgreSQL pool is required");

  async function registerSource(input = {}) {
    const source = createPrecedentSource(input);
    const approved = approval(input);
    const actorId = requiredId(input.actor_id, "actor_id");
    const idempotencyKey = requiredId(input.idempotency_key, "idempotency_key");
    const operation = "precedent_source_register";
    const requestHash = hashValue({ source, approved, actor_id: actorId });
    return withPostgresTransaction(pool, { tenant_id: source.tenant_id }, async (client) => {
      const replay = await findIdempotency(client, source.tenant_id, idempotencyKey, operation, requestHash);
      if (replay) return replay;
      await assertEligible(client, source);
      const existing = (await client.query(
        "SELECT * FROM lawos_dms.precedent_sources WHERE tenant_id = $1 AND source_id = $2 FOR UPDATE",
        [source.tenant_id, source.source_id],
      )).rows[0] ?? null;
      if (existing && (existing.source_kind !== source.source_kind
          || existing.matter_id !== source.matter_id || existing.document_id !== source.document_id)) {
        throw codedError("precedent source identity cannot be reassigned", "PRECEDENT_SOURCE_IDENTITY_CONFLICT");
      }
      const sourceValues = values(source, approved);
      const row = existing ? (await client.query(
        `UPDATE lawos_dms.precedent_sources
            SET version_id=$3, content_sha256=$4, title=$5, court=$6,
                case_number=$7, decision_date=$8::date, source_url=$9,
                source_reference=$10, status='active', source_revision=source_revision+1,
                approval_id=$11, approval_batch_id=$12, approval_decision_id=$13,
                approval_authority=$14, approved_by=$15, approved_at=$16::timestamptz,
                updated_by=$17, updated_at=clock_timestamp(), disabled_by=NULL,
                disabled_at=NULL, unapproved_by=NULL, unapproved_at=NULL
          WHERE tenant_id=$1 AND source_id=$2 RETURNING *`,
        [source.tenant_id, source.source_id, source.version_id, source.content_sha256,
          source.title, source.court, source.case_number, source.decision_date,
          source.source_url, source.source_reference, approved.approval_id,
          approved.approval_batch_id, approved.approval_decision_id,
          approved.approval_authority, approved.approved_by, approved.approved_at, actorId],
      )).rows[0] : (await client.query(
        `INSERT INTO lawos_dms.precedent_sources
           (tenant_id,source_id,source_kind,matter_id,document_id,version_id,
            content_sha256,title,court,case_number,decision_date,source_url,
            source_reference,approval_id,approval_batch_id,approval_decision_id,
            approval_authority,approved_by,approved_at,registered_by,updated_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::date,$12,$13,$14,$15,
                 $16,$17,$18,$19::timestamptz,$20,$20) RETURNING *`,
        [...sourceValues, actorId],
      )).rows[0];
      if (existing) await client.query(
        "DELETE FROM lawos_dms.precedent_search_index WHERE tenant_id=$1 AND source_id=$2",
        [source.tenant_id, source.source_id],
      );
      const response = Object.freeze({ source: sourceSnapshot(row), index_stale: true, replayed: false, production_ready_claim: false });
      await appendPrecedentAudit(client, {
        tenant_id: source.tenant_id,
        event_id: `audit:precedent-register:${hashValue({ idempotency_key: idempotencyKey })}`,
        event_type: existing ? "dms.precedent_source.refreshed" : "dms.precedent_source.registered",
        actor_id: actorId,
        object_id: source.source_id,
        payload: { approval_id: approved.approval_id, approval_batch_id: approved.approval_batch_id,
          approval_decision_id: approved.approval_decision_id, source_revision: Number(row.source_revision) },
      });
      await recordIdempotency(client, { tenant_id: source.tenant_id, idempotency_key: idempotencyKey,
        operation, request_hash: requestHash, response });
      return response;
    });
  }

  async function transition(input, status) {
    const tenantId = requiredId(input.tenant_id, "tenant_id");
    const sourceId = requiredId(input.source_id, "source_id");
    const actorId = requiredId(input.actor_id, "actor_id");
    const key = requiredId(input.idempotency_key, "idempotency_key");
    const operation = `precedent_source_${status}`;
    const requestHash = hashValue({ tenant_id: tenantId, source_id: sourceId, actor_id: actorId, status });
    return withPostgresTransaction(pool, { tenant_id: tenantId }, async (client) => {
      const replay = await findIdempotency(client, tenantId, key, operation, requestHash);
      if (replay) return replay;
      const actorColumn = status === "disabled" ? "disabled_by" : "unapproved_by";
      const atColumn = status === "disabled" ? "disabled_at" : "unapproved_at";
      const row = (await client.query(
        `UPDATE lawos_dms.precedent_sources SET status=$3, source_revision=source_revision+1,
                updated_by=$4, updated_at=clock_timestamp(), ${actorColumn}=$4,
                ${atColumn}=clock_timestamp()
          WHERE tenant_id=$1 AND source_id=$2 AND status='active' RETURNING *`,
        [tenantId, sourceId, status, actorId],
      )).rows[0];
      if (!row) throw codedError("active precedent source was not found", "PRECEDENT_SOURCE_NOT_FOUND", 404);
      await client.query("DELETE FROM lawos_dms.precedent_search_index WHERE tenant_id=$1 AND source_id=$2", [tenantId, sourceId]);
      const response = Object.freeze({ source: sourceSnapshot(row), replayed: false, production_ready_claim: false });
      await appendPrecedentAudit(client, { tenant_id: tenantId,
        event_id: `audit:precedent-${status}:${hashValue({ idempotency_key: key })}`,
        event_type: `dms.precedent_source.${status}`, actor_id: actorId,
        object_id: sourceId, payload: { source_revision: Number(row.source_revision) } });
      await recordIdempotency(client, { tenant_id: tenantId, idempotency_key: key,
        operation, request_hash: requestHash, response });
      return response;
    });
  }

  async function listSourceDescriptors({ tenant_id } = {}) {
    const tenantId = requiredId(tenant_id, "tenant_id");
    return withPostgresTransaction(pool, { tenant_id: tenantId, readOnly: true }, async (client) => {
      const result = await client.query(
        `SELECT s.source_id,s.source_kind,s.matter_id,s.document_id,s.version_id
           FROM lawos_dms.precedent_sources s
          WHERE s.tenant_id=$1 AND s.status='active'
          ORDER BY s.source_id`, [tenantId]);
      return Object.freeze(result.rows.map((row) => Object.freeze({ ...row, tenant_id: tenantId, resource_id: row.document_id })));
    });
  }

  return Object.freeze({ registerSource, disableSource: (input) => transition(input, "disabled"),
    unapproveSource: (input) => transition(input, "unapproved"), listSourceDescriptors });
}
