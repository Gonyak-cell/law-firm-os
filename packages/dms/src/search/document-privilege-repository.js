import { withPostgresTransaction } from "../../../persistence/src/postgres/transaction.js";
import {
  PRECEDENT_PRIVILEGE_AUTHORITY,
  codedError,
  requiredId,
  requiredSha256,
  requiredText,
  requiredTimestamp,
} from "./precedent-common.js";
import { appendPrecedentAudit } from "./precedent-persistence.js";

const CLASSIFICATIONS = new Set([
  "not_privileged",
  "attorney_client",
  "work_product",
  "confidential",
  "privileged",
]);

function normalizedDecision(input = {}) {
  const classification = requiredText(input.classification, "classification", 40);
  if (!CLASSIFICATIONS.has(classification)) throw new TypeError("privilege classification is invalid");
  const authority = requiredText(input.authority, "authority", 80);
  if (authority !== PRECEDENT_PRIVILEGE_AUTHORITY) throw new TypeError("privilege authority is invalid");
  return Object.freeze({
    tenant_id: requiredId(input.tenant_id, "tenant_id"),
    document_id: requiredId(input.document_id, "document_id"),
    label_id: requiredId(input.label_id, "label_id"),
    classification,
    search_disposition: classification === "not_privileged" ? "eligible" : "excluded",
    privilege_status: classification === "not_privileged" ? "cleared" : "protected",
    authority,
    decision_id: requiredId(input.decision_id, "decision_id"),
    provenance_sha256: requiredSha256(input.provenance_sha256, "provenance_sha256"),
    applied_by: requiredId(input.applied_by, "applied_by"),
    applied_at: requiredTimestamp(input.applied_at, "applied_at"),
  });
}

function sameLabel(row, decision, versionId) {
  return row.document_id === decision.document_id
    && row.version_id === versionId
    && row.classification === decision.classification
    && row.search_disposition === decision.search_disposition
    && row.authority === decision.authority
    && row.decision_id === decision.decision_id
    && row.provenance_sha256 === decision.provenance_sha256
    && row.applied_by === decision.applied_by;
}

function result(decision, row, replayed) {
  return Object.freeze({ tenant_id: decision.tenant_id,
    document_id: decision.document_id, version_id: row.version_id,
    label_id: decision.label_id, classification: decision.classification,
    search_disposition: decision.search_disposition,
    privilege_status: decision.privilege_status, authority: decision.authority,
    decision_id: decision.decision_id, provenance_sha256: decision.provenance_sha256,
    applied_by: decision.applied_by, applied_at: new Date(row.applied_at).toISOString(),
    replayed, production_ready_claim: false });
}

export function createDocumentPrivilegeRepository({ pool } = {}) {
  if (!pool?.connect) throw new TypeError("PostgreSQL pool is required");

  async function classifyDocumentPrivilege(input = {}) {
    const decision = normalizedDecision(input);
    return withPostgresTransaction(pool, { tenant_id: decision.tenant_id }, async (client) => {
      const document = (await client.query(
        `SELECT d.current_version_id,d.privilege_status,d.current_privilege_label_id,
                p.applied_at AS current_privilege_applied_at,f.status AS file_status
           FROM lawos_dms.documents d
           LEFT JOIN lawos_dms.document_privilege_labels p
             ON p.tenant_id=d.tenant_id AND p.label_id=d.current_privilege_label_id
           JOIN lawos_dms.document_versions v
             ON v.tenant_id=d.tenant_id AND v.version_id=d.current_version_id
           JOIN lawos_dms.file_objects f
             ON f.tenant_id=v.tenant_id AND f.file_object_id=v.file_object_id
          WHERE d.tenant_id=$1 AND d.document_id=$2 AND d.status='active'
          FOR UPDATE OF d`, [decision.tenant_id, decision.document_id])).rows[0];
      if (!document || document.file_status !== "committed") {
        throw codedError("current committed DMS document was not found", "PRECEDENT_PRIVILEGE_DOCUMENT_NOT_FOUND", 404);
      }
      const existing = (await client.query(
        "SELECT * FROM lawos_dms.document_privilege_labels WHERE tenant_id=$1 AND label_id=$2",
        [decision.tenant_id, decision.label_id])).rows[0] ?? null;
      if (existing && !sameLabel(existing, decision, document.current_version_id)) {
        throw codedError("privilege label identity conflicts with stored provenance", "PRECEDENT_PRIVILEGE_LABEL_CONFLICT", 409);
      }
      if (existing) {
        if (document.current_privilege_label_id !== decision.label_id
            || document.privilege_status !== decision.privilege_status) {
          throw codedError("privilege decision is no longer current", "PRECEDENT_PRIVILEGE_DECISION_STALE", 409);
        }
        return result(decision, existing, true);
      }
      if (document.current_privilege_applied_at
          && Date.parse(decision.applied_at) < new Date(document.current_privilege_applied_at).getTime()) {
        throw codedError("privilege decision predates the current authority", "PRECEDENT_PRIVILEGE_DECISION_STALE", 409);
      }
      const inserted = (await client.query(
        `INSERT INTO lawos_dms.document_privilege_labels
           (tenant_id,label_id,document_id,version_id,classification,search_disposition,
            authority,decision_id,provenance_sha256,applied_by,applied_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::timestamptz)
         RETURNING *`,
        [decision.tenant_id, decision.label_id, decision.document_id,
          document.current_version_id, decision.classification, decision.search_disposition,
          decision.authority, decision.decision_id, decision.provenance_sha256,
          decision.applied_by, decision.applied_at])).rows[0];
      const updated = (await client.query(
        `UPDATE lawos_dms.documents
            SET privilege_status=$3,current_privilege_label_id=$4,updated_at=clock_timestamp()
          WHERE tenant_id=$1 AND document_id=$2 AND current_version_id=$5
          RETURNING current_version_id,privilege_status,current_privilege_label_id`,
        [decision.tenant_id, decision.document_id, decision.privilege_status,
          decision.label_id, document.current_version_id])).rows[0];
      if (!updated) throw codedError("document version changed during privilege review", "PRECEDENT_PRIVILEGE_VERSION_CHANGED", 409);
      await appendPrecedentAudit(client, { tenant_id: decision.tenant_id,
        event_id: `audit:privilege-label:${decision.label_id}`,
        event_type: "dms.document.privilege_classified", actor_id: decision.applied_by,
        object_type: "DmsDocument", object_id: decision.document_id,
        payload: { label_id: decision.label_id, version_id: document.current_version_id,
          classification: decision.classification, search_disposition: decision.search_disposition,
          authority: decision.authority, decision_id: decision.decision_id,
          provenance_sha256: decision.provenance_sha256 } });
      return result(decision, inserted, false);
    });
  }

  return Object.freeze({ classifyDocumentPrivilege });
}
