import { createHash } from "node:crypto";
import { stableJsonStringify } from "../../../persistence/src/durable-file.js";
import { withPostgresTransaction } from "../../../persistence/src/postgres/transaction.js";
import { createPrecedentSource, normalizePrecedentText } from "../precedent-source.js";

export const PRECEDENT_INDEX_VERSION = "lawos-precedent-fts-v1";
const MAX_ELIGIBLE_DOCUMENTS = 2_000;

function hashValue(value) {
  return createHash("sha256").update(stableJsonStringify(value)).digest("hex");
}

function requiredText(value, field, maxLength = 500) {
  const text = String(value ?? "").normalize("NFKC").trim();
  if (!text) throw new TypeError(`${field} is required`);
  if (text.length > maxLength) throw new TypeError(`${field} exceeds ${maxLength} characters`);
  return text;
}

function requiredId(value, field) {
  const text = requiredText(value, field, 128);
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u.test(text)) throw new TypeError(`${field} is invalid`);
  return text;
}

function codedError(message, safeErrorCode, status = 409) {
  return Object.assign(new Error(message), {
    code: `LAWOS_${safeErrorCode}`,
    safe_error_code: safeErrorCode,
    status,
  });
}

function sourceSnapshot(row) {
  return Object.freeze({
    tenant_id: row.tenant_id,
    source_id: row.source_id,
    source_kind: row.source_kind,
    matter_id: row.matter_id,
    document_id: row.document_id,
    version_id: row.version_id,
    content_sha256: row.content_sha256,
    title: row.title,
    court: row.court ?? null,
    case_number: row.case_number ?? null,
    decision_date: row.decision_date ? new Date(row.decision_date).toISOString().slice(0, 10) : null,
    source_url: row.source_url ?? null,
    source_reference: row.source_reference ?? null,
    status: row.status,
    source_revision: Number(row.source_revision),
    registered_at: new Date(row.registered_at).toISOString(),
    updated_at: new Date(row.updated_at).toISOString(),
  });
}

function normalizeEligibleDocumentIds(values) {
  if (!Array.isArray(values) || values.length > MAX_ELIGIBLE_DOCUMENTS) {
    throw new TypeError(`allowed_document_ids must contain at most ${MAX_ELIGIBLE_DOCUMENTS} entries`);
  }
  return [...new Set(values.map((value) => requiredId(value, "allowed_document_id")))].sort();
}

function normalizeQuery(value) {
  const query = normalizePrecedentText(value, { maxLength: 200, lowercase: true });
  if (query.length < 2) throw new TypeError("precedent query must contain between 2 and 200 characters");
  if (/;|--|\/\*|\*\//u.test(query)) throw new TypeError("precedent query contains unsupported SQL control text");
  return query;
}

function normalizeLimit(value = 10) {
  const limit = Number(value);
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 20) throw new TypeError("precedent result limit must be between 1 and 20");
  return limit;
}

function encodeCursor(value) {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function decodeCursor(value, fingerprint) {
  if (value == null || value === "") return null;
  const encoded = requiredText(value, "cursor", 2048);
  let parsed;
  try {
    parsed = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  } catch {
    throw codedError("precedent cursor is invalid", "PRECEDENT_CURSOR_STALE", 409);
  }
  if (parsed?.v !== 1
    || parsed.index_version !== PRECEDENT_INDEX_VERSION
    || parsed.fingerprint !== fingerprint
    || typeof parsed.snapshot_at !== "string"
    || typeof parsed.rank !== "string"
    || typeof parsed.source_id !== "string"
    || !Number.isFinite(new Date(parsed.snapshot_at).getTime())
    || !/^-?\d+(?:\.\d+)?$/u.test(parsed.rank)) {
    throw codedError("precedent cursor is stale", "PRECEDENT_CURSOR_STALE", 409);
  }
  return Object.freeze(parsed);
}

async function findIdempotency(client, tenantId, key, operation, requestHash) {
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

async function recordIdempotency(client, { tenant_id, idempotency_key, operation, request_hash, response }) {
  await client.query(
    `INSERT INTO lawos_dms.idempotency_keys
       (tenant_id, idempotency_key, operation, request_hash, response)
     VALUES ($1, $2, $3, $4, $5::jsonb)`,
    [tenant_id, idempotency_key, operation, request_hash, JSON.stringify(response)],
  );
}

async function appendAudit(client, { tenant_id, event_id, event_type, actor_id, source_id, payload }) {
  await client.query(
    `INSERT INTO lawos_dms.audit_events
       (tenant_id, event_id, event_type, actor_id, object_type, object_id, payload)
     VALUES ($1, $2, $3, $4, 'PrecedentSource', $5, $6::jsonb)
     ON CONFLICT (tenant_id, event_id) DO NOTHING`,
    [tenant_id, event_id, event_type, actor_id, source_id, JSON.stringify(payload)],
  );
}

async function assertFinalizedCurrentDocument(client, source) {
  const result = await client.query(
    `SELECT d.matter_id, d.status, d.current_version_id, v.sha256, f.status AS file_status
       FROM lawos_dms.documents d
       JOIN lawos_dms.document_versions v
         ON v.tenant_id = d.tenant_id AND v.version_id = d.current_version_id
       JOIN lawos_dms.file_objects f
         ON f.tenant_id = v.tenant_id AND f.file_object_id = v.file_object_id
      WHERE d.tenant_id = $1 AND d.document_id = $2`,
    [source.tenant_id, source.document_id],
  );
  const row = result.rows[0];
  if (!row) throw codedError("precedent source document was not found", "PRECEDENT_SOURCE_DOCUMENT_NOT_FOUND", 404);
  if (row.status !== "active" || row.file_status !== "committed") {
    throw codedError("precedent source document is not finalized", "PRECEDENT_SOURCE_NOT_FINALIZED");
  }
  if (row.matter_id !== source.matter_id
    || row.current_version_id !== source.version_id
    || row.sha256 !== source.content_sha256) {
    throw codedError("precedent source does not match the current DMS version", "PRECEDENT_SOURCE_VERSION_MISMATCH");
  }
}

function sourceValues(source) {
  return [
    source.tenant_id,
    source.source_id,
    source.source_kind,
    source.matter_id,
    source.document_id,
    source.version_id,
    source.content_sha256,
    source.title,
    source.court,
    source.case_number,
    source.decision_date,
    source.source_url,
    source.source_reference,
  ];
}

export function createPostgresPrecedentRepository({ pool } = {}) {
  if (!pool || typeof pool.connect !== "function") throw new TypeError("PostgreSQL pool is required");

  async function registerSource(input = {}) {
    const source = createPrecedentSource(input);
    const actorId = requiredId(input.actor_id, "actor_id");
    const idempotencyKey = requiredId(input.idempotency_key, "idempotency_key");
    const operation = "precedent_source_register";
    const requestHash = hashValue({ source, actor_id: actorId });
    return withPostgresTransaction(pool, { tenant_id: source.tenant_id }, async (client) => {
      const replay = await findIdempotency(client, source.tenant_id, idempotencyKey, operation, requestHash);
      if (replay) return replay;
      await assertFinalizedCurrentDocument(client, source);
      const existingResult = await client.query(
        `SELECT * FROM lawos_dms.precedent_sources
          WHERE tenant_id = $1 AND source_id = $2 FOR UPDATE`,
        [source.tenant_id, source.source_id],
      );
      const existing = existingResult.rows[0] ?? null;
      if (existing && (existing.source_kind !== source.source_kind
        || existing.matter_id !== source.matter_id
        || existing.document_id !== source.document_id)) {
        throw codedError("precedent source identity cannot be reassigned", "PRECEDENT_SOURCE_IDENTITY_CONFLICT");
      }
      const changed = !existing || [
        "version_id", "content_sha256", "title", "court", "case_number",
        "source_url", "source_reference",
      ].some((field) => (existing[field] ?? null) !== (source[field] ?? null))
        || (existing?.decision_date ? new Date(existing.decision_date).toISOString().slice(0, 10) : null) !== source.decision_date
        || existing?.status !== "active";
      let row;
      if (!existing) {
        const inserted = await client.query(
          `INSERT INTO lawos_dms.precedent_sources
             (tenant_id, source_id, source_kind, matter_id, document_id, version_id,
              content_sha256, title, court, case_number, decision_date, source_url,
              source_reference, registered_by, updated_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::date,$12,$13,$14,$14)
           RETURNING *`,
          [...sourceValues(source), actorId],
        );
        row = inserted.rows[0];
      } else if (changed) {
        const updated = await client.query(
          `UPDATE lawos_dms.precedent_sources
              SET version_id = $3, content_sha256 = $4, title = $5, court = $6,
                  case_number = $7, decision_date = $8::date, source_url = $9,
                  source_reference = $10, status = 'active',
                  source_revision = source_revision + 1, updated_by = $11,
                  updated_at = clock_timestamp(), disabled_by = NULL, disabled_at = NULL
            WHERE tenant_id = $1 AND source_id = $2
            RETURNING *`,
          [source.tenant_id, source.source_id, source.version_id, source.content_sha256,
            source.title, source.court, source.case_number, source.decision_date,
            source.source_url, source.source_reference, actorId],
        );
        row = updated.rows[0];
        await client.query(
          "DELETE FROM lawos_dms.precedent_search_index WHERE tenant_id = $1 AND source_id = $2",
          [source.tenant_id, source.source_id],
        );
      } else {
        row = existing;
      }
      const response = Object.freeze({
        source: sourceSnapshot(row),
        replayed: !changed,
        index_stale: changed,
        production_ready_claim: false,
      });
      await appendAudit(client, {
        tenant_id: source.tenant_id,
        event_id: `audit:precedent-register:${hashValue({ idempotency_key: idempotencyKey })}`,
        event_type: "dms.precedent_source.registered",
        actor_id: actorId,
        source_id: source.source_id,
        payload: {
          source_kind: source.source_kind,
          matter_id: source.matter_id,
          document_id: source.document_id,
          version_id: source.version_id,
          content_sha256: source.content_sha256,
          source_revision: Number(row.source_revision),
          raw_body_included: false,
          storage_pointer_ref_included: false,
        },
      });
      await recordIdempotency(client, {
        tenant_id: source.tenant_id,
        idempotency_key: idempotencyKey,
        operation,
        request_hash: requestHash,
        response,
      });
      return response;
    });
  }

  async function disableSource(input = {}) {
    const tenantId = requiredId(input.tenant_id, "tenant_id");
    const sourceId = requiredId(input.source_id, "source_id");
    const actorId = requiredId(input.actor_id, "actor_id");
    const idempotencyKey = requiredId(input.idempotency_key, "idempotency_key");
    const operation = "precedent_source_disable";
    const requestHash = hashValue({ tenant_id: tenantId, source_id: sourceId, actor_id: actorId });
    return withPostgresTransaction(pool, { tenant_id: tenantId }, async (client) => {
      const replay = await findIdempotency(client, tenantId, idempotencyKey, operation, requestHash);
      if (replay) return replay;
      const found = await client.query(
        "SELECT * FROM lawos_dms.precedent_sources WHERE tenant_id = $1 AND source_id = $2 FOR UPDATE",
        [tenantId, sourceId],
      );
      const existing = found.rows[0];
      if (!existing) throw codedError("precedent source was not found", "PRECEDENT_SOURCE_NOT_FOUND", 404);
      let row = existing;
      if (existing.status !== "disabled") {
        const updated = await client.query(
          `UPDATE lawos_dms.precedent_sources
              SET status = 'disabled', source_revision = source_revision + 1,
                  updated_by = $3, updated_at = clock_timestamp(),
                  disabled_by = $3, disabled_at = clock_timestamp()
            WHERE tenant_id = $1 AND source_id = $2
            RETURNING *`,
          [tenantId, sourceId, actorId],
        );
        row = updated.rows[0];
        await client.query(
          "DELETE FROM lawos_dms.precedent_search_index WHERE tenant_id = $1 AND source_id = $2",
          [tenantId, sourceId],
        );
      }
      const response = Object.freeze({
        source: sourceSnapshot(row),
        replayed: existing.status === "disabled",
        production_ready_claim: false,
      });
      await appendAudit(client, {
        tenant_id: tenantId,
        event_id: `audit:precedent-disable:${hashValue({ idempotency_key: idempotencyKey })}`,
        event_type: "dms.precedent_source.disabled",
        actor_id: actorId,
        source_id: sourceId,
        payload: { source_revision: Number(row.source_revision) },
      });
      await recordIdempotency(client, {
        tenant_id: tenantId,
        idempotency_key: idempotencyKey,
        operation,
        request_hash: requestHash,
        response,
      });
      return response;
    });
  }

  async function indexSource(input = {}) {
    const tenantId = requiredId(input.tenant_id, "tenant_id");
    const sourceId = requiredId(input.source_id, "source_id");
    const actorId = requiredId(input.actor_id, "actor_id");
    const metadataText = normalizePrecedentText(input.metadata_text, { maxLength: 4_000 });
    const bodyText = normalizePrecedentText(input.body_text, { maxLength: 1_000_000 });
    return withPostgresTransaction(pool, { tenant_id: tenantId }, async (client) => {
      const found = await client.query(
        `SELECT s.*, d.status AS document_status, d.current_version_id,
                v.sha256 AS version_sha256, f.status AS file_status
           FROM lawos_dms.precedent_sources s
           JOIN lawos_dms.documents d
             ON d.tenant_id = s.tenant_id AND d.document_id = s.document_id
           JOIN lawos_dms.document_versions v
             ON v.tenant_id = d.tenant_id AND v.version_id = d.current_version_id
           JOIN lawos_dms.file_objects f
             ON f.tenant_id = v.tenant_id AND f.file_object_id = v.file_object_id
          WHERE s.tenant_id = $1 AND s.source_id = $2
          FOR UPDATE OF s`,
        [tenantId, sourceId],
      );
      const source = found.rows[0];
      if (!source || source.status !== "active") throw codedError("active precedent source was not found", "PRECEDENT_SOURCE_NOT_FOUND", 404);
      if (source.document_status !== "active" || source.file_status !== "committed"
        || source.current_version_id !== source.version_id
        || source.version_sha256 !== source.content_sha256) {
        throw codedError("precedent source index is stale", "PRECEDENT_INDEX_STALE");
      }
      const titleText = normalizePrecedentText(source.title, { maxLength: 300 });
      const normalizedText = normalizePrecedentText(
        `${titleText} ${metadataText} ${bodyText}`,
        { maxLength: 1_004_302, lowercase: true },
      );
      const indexHash = hashValue({
        source_id: sourceId,
        source_revision: Number(source.source_revision),
        version_id: source.version_id,
        content_sha256: source.content_sha256,
        index_version: PRECEDENT_INDEX_VERSION,
        title_text: titleText,
        metadata_text: metadataText,
        body_text: bodyText,
      });
      const indexed = await client.query(
        `INSERT INTO lawos_dms.precedent_search_index
           (tenant_id, source_id, source_revision, document_id, version_id,
            content_sha256, index_version, index_hash, title_text, metadata_text,
            body_text, normalized_text)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         ON CONFLICT (tenant_id, source_id) DO UPDATE
           SET source_revision = EXCLUDED.source_revision,
               document_id = EXCLUDED.document_id,
               version_id = EXCLUDED.version_id,
               content_sha256 = EXCLUDED.content_sha256,
               index_version = EXCLUDED.index_version,
               index_hash = EXCLUDED.index_hash,
               title_text = EXCLUDED.title_text,
               metadata_text = EXCLUDED.metadata_text,
               body_text = EXCLUDED.body_text,
               normalized_text = EXCLUDED.normalized_text,
               indexed_at = clock_timestamp()
         WHERE lawos_dms.precedent_search_index.source_revision IS DISTINCT FROM EXCLUDED.source_revision
            OR lawos_dms.precedent_search_index.index_hash IS DISTINCT FROM EXCLUDED.index_hash
         RETURNING *, (xmax = 0) AS inserted`,
        [tenantId, sourceId, Number(source.source_revision), source.document_id,
          source.version_id, source.content_sha256, PRECEDENT_INDEX_VERSION,
          indexHash, titleText, metadataText, bodyText, normalizedText],
      );
      let row = indexed.rows[0];
      const replayed = !row;
      if (!row) {
        const existing = await client.query(
          "SELECT * FROM lawos_dms.precedent_search_index WHERE tenant_id = $1 AND source_id = $2",
          [tenantId, sourceId],
        );
        row = existing.rows[0];
      }
      await appendAudit(client, {
        tenant_id: tenantId,
        event_id: `audit:precedent-index:${hashValue({ source_id: sourceId, index_hash: indexHash })}`,
        event_type: "dms.precedent_source.indexed",
        actor_id: actorId,
        source_id: sourceId,
        payload: {
          version_id: source.version_id,
          content_sha256: source.content_sha256,
          index_version: PRECEDENT_INDEX_VERSION,
          index_hash: indexHash,
          raw_body_included: false,
          storage_pointer_ref_included: false,
        },
      });
      return Object.freeze({
        source_id: sourceId,
        index_version: row.index_version,
        index_hash: row.index_hash,
        indexed_at: new Date(row.indexed_at).toISOString(),
        replayed,
        raw_body_included: false,
        storage_pointer_ref_included: false,
        production_ready_claim: false,
      });
    });
  }

  async function listSourceDescriptors({ tenant_id } = {}) {
    const tenantId = requiredId(tenant_id, "tenant_id");
    return withPostgresTransaction(pool, { tenant_id: tenantId, readOnly: true }, async (client) => {
      const result = await client.query(
        `SELECT source_id, source_kind, matter_id, document_id, version_id
           FROM lawos_dms.precedent_sources
          WHERE tenant_id = $1 AND status = 'active'
          ORDER BY source_id`,
        [tenantId],
      );
      return Object.freeze(result.rows.map((row) => Object.freeze({
        tenant_id: tenantId,
        source_id: row.source_id,
        source_kind: row.source_kind,
        matter_id: row.matter_id,
        document_id: row.document_id,
        version_id: row.version_id,
        resource_id: row.document_id,
      })));
    });
  }

  async function readiness({ tenant_id, allowed_document_ids } = {}) {
    const tenantId = requiredId(tenant_id, "tenant_id");
    const allowed = allowed_document_ids === undefined ? null : normalizeEligibleDocumentIds(allowed_document_ids);
    try {
      return await withPostgresTransaction(pool, { tenant_id: tenantId, readOnly: true }, async (client) => {
        const authority = await client.query(
          `SELECT EXISTS (
             SELECT 1 FROM lawos_meta.schema_migrations
              WHERE migration_id = '012_dms_precedent_search'
           ) AS migrated,
           to_regclass('lawos_dms.precedent_sources') IS NOT NULL AS registry_exists,
           to_regclass('lawos_dms.precedent_search_index') IS NOT NULL AS index_exists`,
        );
        const flags = authority.rows[0];
        if (!flags?.migrated || !flags.registry_exists || !flags.index_exists) {
          return Object.freeze({
            runtime_ready: false,
            safe_error_code: "PRECEDENT_RUNTIME_UNAVAILABLE",
            production_ready_claim: false,
          });
        }
        const state = await client.query(
          `SELECT count(*) FILTER (
                    WHERE i.source_id IS NULL
                       OR i.source_revision <> s.source_revision
                       OR i.version_id <> s.version_id
                       OR i.content_sha256 <> s.content_sha256
                       OR i.index_version <> $3
                       OR d.status <> 'active'
                       OR d.current_version_id <> s.version_id
                       OR v.sha256 <> s.content_sha256
                       OR f.status <> 'committed'
                 )::integer AS stale_count
             FROM lawos_dms.precedent_sources s
             JOIN lawos_dms.documents d
               ON d.tenant_id = s.tenant_id AND d.document_id = s.document_id
             JOIN lawos_dms.document_versions v
               ON v.tenant_id = s.tenant_id AND v.version_id = s.version_id
             JOIN lawos_dms.file_objects f
               ON f.tenant_id = v.tenant_id AND f.file_object_id = v.file_object_id
             LEFT JOIN lawos_dms.precedent_search_index i
               ON i.tenant_id = s.tenant_id AND i.source_id = s.source_id
            WHERE s.tenant_id = $1 AND s.status = 'active'
              AND ($2::text[] IS NULL OR s.document_id = ANY($2::text[]))`,
          [tenantId, allowed, PRECEDENT_INDEX_VERSION],
        );
        const stale = Number(state.rows[0]?.stale_count ?? 0) > 0;
        return Object.freeze({
          runtime_ready: !stale,
          safe_error_code: stale ? "PRECEDENT_INDEX_STALE" : null,
          index_version: PRECEDENT_INDEX_VERSION,
          registry_authoritative: true,
          index_authoritative: true,
          production_ready_claim: false,
        });
      });
    } catch {
      return Object.freeze({
        runtime_ready: false,
        safe_error_code: "PRECEDENT_RUNTIME_UNAVAILABLE",
        production_ready_claim: false,
      });
    }
  }

  async function search(input = {}) {
    const tenantId = requiredId(input.tenant_id, "tenant_id");
    const matterId = requiredId(input.matter_id, "matter_id");
    const actorId = requiredId(input.actor_id, "actor_id");
    const auditHintRef = requiredId(input.audit_hint_ref, "audit_hint_ref");
    const permissionDecisionId = requiredId(input.permission_decision_id, "permission_decision_id");
    const query = normalizeQuery(input.query);
    const limit = normalizeLimit(input.limit);
    const allowedDocumentIds = normalizeEligibleDocumentIds(input.allowed_document_ids);
    const includeCurrentMatter = input.include_current_matter === true;
    if (includeCurrentMatter && input.search_mode !== "document_search") {
      throw new TypeError("current Matter inclusion is allowed only for document_search mode");
    }
    const fingerprint = hashValue({
      tenant_id: tenantId,
      matter_id: matterId,
      query,
      include_current_matter: includeCurrentMatter,
      search_mode: input.search_mode ?? "precedent",
      index_version: PRECEDENT_INDEX_VERSION,
    });
    const cursor = decodeCursor(input.cursor, fingerprint);
    return withPostgresTransaction(pool, { tenant_id: tenantId, readOnly: false }, async (client) => {
      const stale = await client.query(
        `SELECT 1
           FROM lawos_dms.precedent_sources s
           JOIN unnest($2::text[]) AS eligible(document_id)
             ON eligible.document_id = s.document_id
           JOIN lawos_dms.documents d
             ON d.tenant_id = s.tenant_id AND d.document_id = s.document_id
           JOIN lawos_dms.document_versions v
             ON v.tenant_id = s.tenant_id AND v.version_id = s.version_id
           JOIN lawos_dms.file_objects f
             ON f.tenant_id = v.tenant_id AND f.file_object_id = v.file_object_id
           LEFT JOIN lawos_dms.precedent_search_index i
             ON i.tenant_id = s.tenant_id AND i.source_id = s.source_id
          WHERE s.tenant_id = $1 AND s.status = 'active'
            AND (i.source_id IS NULL OR i.source_revision <> s.source_revision
              OR i.version_id <> s.version_id OR i.content_sha256 <> s.content_sha256
              OR i.index_version <> $3 OR d.status <> 'active'
              OR d.current_version_id <> s.version_id OR v.sha256 <> s.content_sha256
              OR f.status <> 'committed')
          LIMIT 1`,
        [tenantId, allowedDocumentIds, PRECEDENT_INDEX_VERSION],
      );
      if (stale.rowCount > 0) throw codedError("precedent index is stale", "PRECEDENT_INDEX_STALE");
      const snapshotAt = cursor?.snapshot_at ?? (await client.query("SELECT clock_timestamp() AS value")).rows[0].value.toISOString();
      const result = await client.query(
        `WITH eligible AS MATERIALIZED (
           SELECT unnest($2::text[]) AS document_id
         ), matched_index AS MATERIALIZED (
           SELECT *
             FROM lawos_dms.precedent_search_index
            WHERE tenant_id = $1
              AND index_version = $3
              AND indexed_at <= $4::timestamptz
              AND (search_vector @@ plainto_tsquery('simple', $7)
                OR normalized_text ILIKE '%' || $7 || '%')
         ), ready AS MATERIALIZED (
           SELECT s.source_id, s.source_kind, s.matter_id, s.document_id,
                  s.version_id, s.content_sha256, s.title, s.court,
                  s.case_number, s.decision_date, s.source_url,
                  s.source_reference, i.index_version, i.indexed_at,
                  i.title_text, i.metadata_text, i.body_text,
                  i.normalized_text, i.title_vector, i.metadata_vector,
                  i.body_vector, i.search_vector
             FROM eligible e
             JOIN lawos_dms.precedent_sources s
               ON s.tenant_id = $1 AND s.document_id = e.document_id
              AND s.status = 'active'
             JOIN matched_index i
               ON i.tenant_id = s.tenant_id AND i.source_id = s.source_id
              AND i.source_revision = s.source_revision
              AND i.version_id = s.version_id
              AND i.content_sha256 = s.content_sha256
              AND i.index_version = $3
             JOIN lawos_dms.documents d
               ON d.tenant_id = s.tenant_id AND d.document_id = s.document_id
              AND d.status = 'active' AND d.current_version_id = s.version_id
             JOIN lawos_dms.document_versions v
               ON v.tenant_id = s.tenant_id AND v.version_id = s.version_id
              AND v.sha256 = s.content_sha256
             JOIN lawos_dms.file_objects f
               ON f.tenant_id = v.tenant_id AND f.file_object_id = v.file_object_id
              AND f.status = 'committed'
            WHERE ($5::boolean OR s.matter_id <> $6)
         ), ranked AS (
           SELECT r.*,
                  round((
                    ts_rank_cd(r.search_vector, plainto_tsquery('simple', $7), 32)
                    + CASE
                        WHEN r.title_text ILIKE '%' || $7 || '%' THEN 0.03
                        WHEN r.metadata_text ILIKE '%' || $7 || '%' THEN 0.02
                        WHEN r.body_text ILIKE '%' || $7 || '%' THEN 0.01
                        ELSE 0
                      END
                  )::numeric, 8) AS rank_value,
                  r.title_vector @@ plainto_tsquery('simple', $7) AS title_match,
                  r.metadata_vector @@ plainto_tsquery('simple', $7) AS metadata_match,
                  r.body_vector @@ plainto_tsquery('simple', $7) AS body_match,
                  CASE
                    WHEN r.body_vector @@ plainto_tsquery('simple', $7)
                      THEN substring(
                        r.body_text
                        FROM greatest(
                          position(split_part($7, ' ', 1) in lower(r.body_text)) - 50,
                          1
                        )
                        FOR 160
                      )
                    WHEN position($7 in r.normalized_text) > 0
                      THEN substring(r.normalized_text FROM greatest(position($7 in r.normalized_text) - 50, 1) FOR 160)
                    ELSE ''
                  END AS snippet
             FROM ready r
         )
         SELECT source_id, source_kind, matter_id, document_id, version_id,
                content_sha256, title, court, case_number, decision_date,
                source_url, source_reference, index_version, indexed_at,
                rank_value::text AS rank_key, title_match, metadata_match,
                body_match, regexp_replace(snippet, '\\s+', ' ', 'g') AS snippet
           FROM ranked
          WHERE ($8::numeric IS NULL OR rank_value < $8::numeric
             OR (rank_value = $8::numeric AND source_id > $9))
          ORDER BY rank_value DESC, source_id ASC
          LIMIT $10`,
        [tenantId, allowedDocumentIds, PRECEDENT_INDEX_VERSION, snapshotAt,
          includeCurrentMatter, matterId, query, cursor?.rank ?? null,
          cursor?.source_id ?? "", limit + 1],
      );
      const hasMore = result.rows.length > limit;
      const rows = result.rows.slice(0, limit);
      const items = rows.map((row) => Object.freeze({
        source_id: row.source_id,
        source_kind: row.source_kind,
        title: normalizePrecedentText(row.title, { maxLength: 300 }),
        snippet: normalizePrecedentText(row.snippet, { maxLength: 240 }),
        source_matter_id: row.matter_id,
        document_id: row.document_id,
        version_id: row.version_id,
        citation: row.source_kind === "case_law_document" ? Object.freeze({
          court: row.court,
          case_number: row.case_number,
          decision_date: new Date(row.decision_date).toISOString().slice(0, 10),
        }) : null,
        source_reference: row.source_reference ?? null,
        source_url: row.source_kind === "case_law_document"
          ? row.source_url
          : `/vault/documents/${encodeURIComponent(row.document_id)}?matter_id=${encodeURIComponent(row.matter_id)}&version_id=${encodeURIComponent(row.version_id)}`,
        search_rank: Number(row.rank_key),
        match_fields: Object.freeze([
          row.title_match ? "title" : null,
          row.metadata_match ? "metadata" : null,
          row.body_match ? "body" : null,
        ].filter(Boolean)),
        content_sha256: row.content_sha256,
        index_version: row.index_version,
        index_stale: false,
        raw_body_included: false,
        storage_pointer_ref_included: false,
      }));
      const last = rows.at(-1);
      const nextCursor = hasMore && last ? encodeCursor({
        v: 1,
        index_version: PRECEDENT_INDEX_VERSION,
        fingerprint,
        snapshot_at: snapshotAt,
        rank: last.rank_key,
        source_id: last.source_id,
      }) : null;
      await appendAudit(client, {
        tenant_id: tenantId,
        event_id: `audit:precedent-search:${hashValue({ permission_decision_id: permissionDecisionId, audit_hint_ref: auditHintRef })}`,
        event_type: "dms.precedent_source.searched",
        actor_id: actorId,
        source_id: matterId,
        payload: {
          query_sha256: hashValue(query),
          permission_decision_id: permissionDecisionId,
          returned_count: items.length,
          next_cursor_present: nextCursor != null,
          denied_count_included: false,
          raw_body_included: false,
          storage_pointer_ref_included: false,
        },
      });
      return Object.freeze({
        items: Object.freeze(items),
        next_cursor: nextCursor,
        index_version: PRECEDENT_INDEX_VERSION,
        index_stale: false,
        count_leak_prevented: true,
        production_ready_claim: false,
      });
    });
  }

  return Object.freeze({
    index_version: PRECEDENT_INDEX_VERSION,
    registerSource,
    disableSource,
    indexSource,
    listSourceDescriptors,
    readiness,
    search,
  });
}
