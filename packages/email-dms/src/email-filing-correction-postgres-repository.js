import { assertNoDmsPersistedSecrets } from "../../dms/src/persistence-guard.js";
import { withPostgresTransaction } from "../../persistence/src/postgres/transaction.js";
import { normalizeEmailFilingPlacementEvent } from "./email-filing-correction-model.js";
import { correctionTrustError } from "./email-filing-correction-trust-boundary.js";

const PLACEMENT_COLUMNS = Object.freeze([
  "tenant_id", "placement_id", "event_kind", "correction_id", "email_thread_id",
  "document_id", "mime_sha256", "original_receipt_id", "source_matter_id",
  "target_matter_id", "reason", "reason_hash", "actor_id", "occurred_at",
  "idempotency_key", "payload_fingerprint", "prior_placement_id", "status",
]);

const MODEL_TYPE_BY_EVENT_KIND = Object.freeze({
  original: "EmailFilingPlacementOrigin",
  correction: "EmailFilingCorrection",
});

function requireTenant(value) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError("transaction tenant_id is required");
  }
  return value.trim();
}

function assertTenant(value, tenantId) {
  if (value !== tenantId) throw new TypeError("repository tenant_id conflicts with transaction");
}

function isoTimestamp(value) {
  return value instanceof Date ? value.toISOString() : String(value);
}

function eventFromRow(row) {
  return normalizeEmailFilingPlacementEvent({
    ...row,
    model_type: MODEL_TYPE_BY_EVENT_KIND[row.event_kind],
    occurred_at: isoTimestamp(row.occurred_at),
  });
}

function idempotencyFromEvent(event) {
  return Object.freeze({
    tenant_id: event.tenant_id,
    idempotency_key: event.idempotency_key,
    request_fingerprint: event.payload_fingerprint,
    correction_id: event.correction_id,
    placement_id: event.placement_id,
    source_matter_id: event.source_matter_id,
    created_at: event.occurred_at,
  });
}

const DOMAIN_ERROR_MARKER = "LAWOS_EMAIL_FILING_CORRECTION_DOMAIN_ERROR";

function stalePlacementError() {
  return correctionTrustError(
    "EMAIL_FILING_CORRECTION_STALE_PLACEMENT",
    "expected placement is no longer current",
  );
}

function transactionRepository(client, tenantId, readOnly) {
  const lockedThreads = new Set();
  return Object.freeze({
    async appendPlacement(input = {}) {
      assertNoDmsPersistedSecrets(input, "email_filing_placement");
      const event = normalizeEmailFilingPlacementEvent(input);
      assertTenant(event.tenant_id, tenantId);
      await client.query(
        `INSERT INTO lawos_email_dms.email_filing_placements
          (${PLACEMENT_COLUMNS.join(", ")})
         VALUES (${PLACEMENT_COLUMNS.map((_, index) => `$${index + 1}`).join(", ")})`,
        PLACEMENT_COLUMNS.map((column) => event[column]),
      );
      return event;
    },
    async listPlacements(query = {}) {
      assertTenant(query.tenant_id, tenantId);
      if (!readOnly && !lockedThreads.has(query.email_thread_id)) {
        await client.query(
          "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
          [`${tenantId}\u001f${query.email_thread_id}`],
        );
        lockedThreads.add(query.email_thread_id);
      }
      const result = await client.query(
        `SELECT ${PLACEMENT_COLUMNS.join(", ")}
           FROM lawos_email_dms.email_filing_placements
          WHERE tenant_id = $1 AND email_thread_id = $2
          ORDER BY occurred_at, placement_id${readOnly ? "" : " FOR UPDATE"}`,
        [tenantId, query.email_thread_id],
      );
      return Object.freeze(result.rows.map(eventFromRow));
    },
    async getIdempotency(ref = {}) {
      assertTenant(ref.tenant_id, tenantId);
      const result = await client.query(
        `SELECT ${PLACEMENT_COLUMNS.join(", ")}
           FROM lawos_email_dms.email_filing_placements
          WHERE tenant_id = $1
            AND idempotency_key = $2
            AND event_kind = 'correction'`,
        [tenantId, ref.idempotency_key],
      );
      return result.rows[0] ? idempotencyFromEvent(eventFromRow(result.rows[0])) : undefined;
    },
    async appendAudit(input = {}) {
      assertNoDmsPersistedSecrets(input, "email_filing_correction_audit");
      assertTenant(input.tenant_id, tenantId);
      await client.query(
        `INSERT INTO lawos_email_dms.email_filing_correction_audit_events
          (tenant_id, event_id, actor_id, action, object_type, object_id,
           decision, reason, occurred_at, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)`,
        [
          tenantId,
          input.event_id,
          input.actor_id,
          input.action,
          input.object_type,
          input.object_id,
          input.decision,
          input.reason,
          input.occurred_at,
          JSON.stringify(input.metadata ?? {}),
        ],
      );
      return Object.freeze(structuredClone(input));
    },
    async listAudit(query = {}) {
      assertTenant(query.tenant_id, tenantId);
      const values = [tenantId];
      const objectFilter = query.object_id ? " AND object_id = $2" : "";
      if (query.object_id) values.push(query.object_id);
      const result = await client.query(
        `SELECT tenant_id, event_id, actor_id, action, object_type, object_id,
                decision, reason, occurred_at, metadata
           FROM lawos_email_dms.email_filing_correction_audit_events
          WHERE tenant_id = $1${objectFilter}`,
        values,
      );
      return Object.freeze(result.rows.map((row) => Object.freeze({
        ...row,
        occurred_at: isoTimestamp(row.occurred_at),
      })));
    },
  });
}

export function createPostgresEmailFilingCorrectionRepository({ pool } = {}) {
  if (!pool || typeof pool.connect !== "function") {
    throw new TypeError("PostgreSQL pool is required");
  }
  return Object.freeze({
    durable: true,
    async transaction(options = {}, fn) {
      if (typeof fn !== "function") throw new TypeError("transaction callback is required");
      const tenantId = requireTenant(options.tenant_id);
      const readOnly = options.read_only === true;
      try {
        return await withPostgresTransaction(
          pool,
          {
            tenant_id: tenantId,
            isolationLevel: "serializable",
            readOnly,
          },
          async (client) => {
            try {
              return await fn(transactionRepository(client, tenantId, readOnly));
            } catch (error) {
              if (error?.code?.startsWith?.("EMAIL_FILING_CORRECTION_")) {
                throw Object.assign(new Error(error.message), {
                  code: DOMAIN_ERROR_MARKER,
                  safe_error_code: error.safe_error_code,
                  status: error.status,
                  domain_error: error,
                });
              }
              throw error;
            }
          },
        );
      } catch (error) {
        if (error?.code === DOMAIN_ERROR_MARKER) throw error.domain_error;
        if (
          error?.code === "LAWOS_POSTGRES_CONFLICT"
          || error?.code === "LAWOS_POSTGRES_RETRY_EXHAUSTED"
        ) {
          throw stalePlacementError();
        }
        throw error;
      }
    },
  });
}
