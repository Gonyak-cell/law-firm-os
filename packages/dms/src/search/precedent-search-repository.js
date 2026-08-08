import { withPostgresTransaction } from "../../../persistence/src/postgres/transaction.js";
import { normalizePrecedentText } from "../precedent-source.js";
import {
  PRECEDENT_INDEX_VERSION,
  buildVaultDocumentNavigationHref,
  hashValue,
  normalizeAllowedDocumentIds,
  normalizeLimit,
  normalizeQuery,
  queryTerms,
  requiredId,
  requiredSha256,
} from "./precedent-common.js";
import { ELIGIBLE_DOCUMENT_SQL, appendPrecedentAudit } from "./precedent-persistence.js";

function likePattern(term) {
  return `%${term.replace(/[\\%_]/gu, (character) => `\\${character}`)}%`;
}

export const PRECEDENT_SEARCH_SQL = `WITH eligible AS MATERIALIZED (
  SELECT unnest($2::text[]) AS document_id
), candidate_hits AS MATERIALIZED (
  SELECT tenant_id,source_id FROM lawos_dms.precedent_search_index
   WHERE search_vector @@ plainto_tsquery('simple',$7)
  UNION
  SELECT tenant_id,source_id FROM lawos_dms.precedent_search_index
   WHERE normalized_text ILIKE ($9::text[])[1] ESCAPE '\\'
), matched_index AS MATERIALIZED (
  SELECT i.* FROM lawos_dms.precedent_search_index i
   JOIN candidate_hits hit ON hit.tenant_id=i.tenant_id AND hit.source_id=i.source_id
   WHERE i.tenant_id=$1 AND i.index_version=$3 AND i.indexed_at<=$4::timestamptz
     AND NOT EXISTS (
       SELECT 1 FROM unnest($8::text[],$9::text[]) AS qt(term,pattern)
        WHERE NOT (i.search_vector @@ plainto_tsquery('simple',qt.term)
          OR i.normalized_text ILIKE qt.pattern ESCAPE '\\')
     )
), ready AS MATERIALIZED (
  SELECT s.*,i.index_version,i.indexed_at,i.title_text,i.metadata_text,i.body_text,
         i.normalized_text,i.title_vector,i.metadata_vector,i.body_vector,i.search_vector
    FROM eligible e
    JOIN lawos_dms.precedent_sources s ON s.tenant_id=$1
      AND s.document_id=e.document_id AND s.status='active'
    JOIN matched_index i ON i.tenant_id=s.tenant_id AND i.source_id=s.source_id
      AND i.source_revision=s.source_revision AND i.version_id=s.version_id
      AND i.content_sha256=s.content_sha256
    JOIN lawos_dms.documents d ON d.tenant_id=s.tenant_id AND d.document_id=s.document_id
    JOIN lawos_dms.document_versions v ON v.tenant_id=s.tenant_id AND v.version_id=s.version_id
    JOIN lawos_dms.file_objects f ON f.tenant_id=v.tenant_id AND f.file_object_id=v.file_object_id
   WHERE ($5::boolean OR s.matter_id<>$6) AND ${ELIGIBLE_DOCUMENT_SQL}
), ranked AS (
  SELECT r.*,round((SELECT sum(ts_rank_cd(r.search_vector,plainto_tsquery('simple',qt.term),32)
      + CASE WHEN r.title_text ILIKE qt.pattern ESCAPE '\\' THEN 0.03
             WHEN r.metadata_text ILIKE qt.pattern ESCAPE '\\' THEN 0.02
             WHEN r.body_text ILIKE qt.pattern ESCAPE '\\' THEN 0.01 ELSE 0 END)
    FROM unnest($8::text[],$9::text[]) AS qt(term,pattern))::numeric,8) AS rank_value,
    EXISTS (SELECT 1 FROM unnest($8::text[]) t WHERE r.title_vector @@ plainto_tsquery('simple',t)) AS title_match,
    EXISTS (SELECT 1 FROM unnest($8::text[]) t WHERE r.metadata_vector @@ plainto_tsquery('simple',t)) AS metadata_match,
    EXISTS (SELECT 1 FROM unnest($8::text[]) t WHERE r.body_vector @@ plainto_tsquery('simple',t)) AS body_match,
    substring(r.body_text FROM greatest(position(lower($8[1]) in lower(r.body_text))-50,1) FOR 160) AS snippet
  FROM ready r
)
SELECT source_id,source_kind,matter_id,document_id,version_id,content_sha256,title,
       court,case_number,decision_date,source_url,source_reference,index_version,
       indexed_at,rank_value::text AS rank_key,title_match,metadata_match,body_match,
       regexp_replace(snippet,'\\s+',' ','g') AS snippet
  FROM ranked
 WHERE ($10::numeric IS NULL OR rank_value<$10::numeric
    OR (rank_value=$10::numeric AND source_id>$11))
 ORDER BY rank_value DESC,source_id ASC LIMIT $12`;

function serialize(row) {
  return Object.freeze({ source_id: row.source_id, source_kind: row.source_kind,
    title: normalizePrecedentText(row.title, { maxLength: 300 }),
    snippet: normalizePrecedentText(row.snippet, { maxLength: 240 }),
    source_matter_id: row.matter_id, document_id: row.document_id,
    version_id: row.version_id,
    citation: row.source_kind === "case_law_document" ? Object.freeze({ court: row.court,
      case_number: row.case_number,
      decision_date: new Date(row.decision_date).toISOString().slice(0, 10) }) : null,
    source_reference: row.source_reference ?? null,
    source_url: row.source_kind === "case_law_document" ? row.source_url
      : buildVaultDocumentNavigationHref(row.document_id),
    search_rank: Number(row.rank_key),
    match_fields: Object.freeze([row.title_match ? "title" : null,
      row.metadata_match ? "metadata" : null, row.body_match ? "body" : null].filter(Boolean)),
    content_sha256: row.content_sha256, index_version: row.index_version,
    index_stale: false, raw_body_included: false, storage_pointer_ref_included: false });
}

export function createPrecedentSearchRepository({ pool, cursorAuthority } = {}) {
  if (!pool?.connect) throw new TypeError("PostgreSQL pool is required");
  if (!cursorAuthority?.issue || !cursorAuthority?.verify) throw new TypeError("precedent cursor authority is required");
  async function search(input = {}) {
    const tenantId = requiredId(input.tenant_id, "tenant_id");
    const matterId = requiredId(input.matter_id, "matter_id");
    const actorId = requiredId(input.actor_id, "actor_id");
    const requestOccurrenceId = requiredId(input.request_occurrence_id, "request_occurrence_id");
    const authorizationDecisionSha256 = requiredSha256(input.authorization_decision_sha256, "authorization_decision_sha256");
    const authorizedSourceSetSha256 = requiredSha256(input.authorized_source_set_sha256, "authorized_source_set_sha256");
    const query = normalizeQuery(input.query);
    const terms = queryTerms(query);
    const patterns = terms.map(likePattern);
    const limit = normalizeLimit(input.limit);
    const allowed = normalizeAllowedDocumentIds(input.allowed_document_ids);
    const includeCurrent = input.include_current_matter === true;
    if (includeCurrent && input.search_mode !== "document_search") {
      throw new TypeError("current Matter inclusion is allowed only for document_search mode");
    }
    const fingerprint = hashValue({ tenant_id: tenantId, matter_id: matterId, query,
      authorized_source_set_sha256: authorizedSourceSetSha256,
      include_current_matter: includeCurrent, search_mode: input.search_mode ?? "precedent",
      index_version: PRECEDENT_INDEX_VERSION });
    const cursor = cursorAuthority.verify(input.cursor, fingerprint);
    return withPostgresTransaction(pool, { tenant_id: tenantId }, async (client) => {
      const snapshotAt = cursor?.snapshot_at
        ?? (await client.query("SELECT clock_timestamp() AS value")).rows[0].value.toISOString();
      const result = await client.query(PRECEDENT_SEARCH_SQL,
        [tenantId, allowed, PRECEDENT_INDEX_VERSION, snapshotAt, includeCurrent,
          matterId, query, terms, patterns, cursor?.rank ?? null,
          cursor?.source_id ?? "", limit + 1]);
      const hasMore = result.rows.length > limit;
      const rows = result.rows.slice(0, limit);
      const items = Object.freeze(rows.map(serialize));
      const last = rows.at(-1);
      const nextCursor = hasMore && last ? cursorAuthority.issue({ fingerprint,
        snapshot_at: snapshotAt, rank: last.rank_key, source_id: last.source_id }) : null;
      await appendPrecedentAudit(client, { tenant_id: tenantId,
        event_id: `audit:precedent-search:${hashValue({ request_occurrence_id: requestOccurrenceId })}`,
        event_type: "dms.precedent_source.searched", actor_id: actorId,
        object_id: matterId, payload: { request_occurrence_id: requestOccurrenceId,
          authorization_decision_sha256: authorizationDecisionSha256,
          authorized_source_set_sha256: authorizedSourceSetSha256,
          query_sha256: hashValue(query), page_fingerprint_sha256: fingerprint,
          input_cursor_sha256: input.cursor ? hashValue(input.cursor) : null,
          output_cursor_sha256: nextCursor ? hashValue(nextCursor) : null,
          page_limit: limit, returned_source_set_sha256: hashValue(items.map(({ source_id }) => source_id)),
          returned_count: items.length } });
      return Object.freeze({ items, next_cursor: nextCursor,
        index_version: PRECEDENT_INDEX_VERSION, index_stale: false,
        count_leak_prevented: true, production_ready_claim: false });
    });
  }
  return Object.freeze({ search });
}
