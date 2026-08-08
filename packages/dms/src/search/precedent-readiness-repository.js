import { listPostgresFoundationMigrations } from "../../../persistence/src/postgres/migration-catalog.js";
import { withPostgresTransaction } from "../../../persistence/src/postgres/transaction.js";
import {
  PRECEDENT_APPROVAL_AUTHORITY,
  PRECEDENT_INDEX_VERSION,
  hashValue,
  normalizeAllowedDocumentIds,
  requiredId,
} from "./precedent-common.js";
import { ELIGIBLE_DOCUMENT_SQL } from "./precedent-persistence.js";

const MIGRATION = listPostgresFoundationMigrations()
  .find(({ id }) => id === "012_dms_precedent_search");
const REQUIRED_GIN_INDEXES = Object.freeze([
  "dms_precedent_search_vector_gin",
  "dms_precedent_search_korean_fallback_gin",
]);
const REQUIRED_RLS_TABLES = Object.freeze([
  "document_privilege_labels",
  "precedent_sources",
  "precedent_extraction_receipts",
  "precedent_search_index",
]);
const REQUIRED_TRIGGERS = Object.freeze([
  "dms_document_privilege_label_guard",
  "dms_precedent_source_guard",
  "dms_precedent_extraction_receipt_guard",
]);

function unavailable(code = "PRECEDENT_RUNTIME_UNAVAILABLE") {
  return Object.freeze({ runtime_ready: false, authoritative: false,
    safe_error_code: code, production_ready_claim: false });
}

async function catalogAuthority(client) {
  const migration = await client.query(
    "SELECT checksum FROM lawos_meta.schema_migrations WHERE migration_id=$1", [MIGRATION.id]);
  const extension = await client.query(
    "SELECT extname, extnamespace::regnamespace::text AS schema FROM pg_extension WHERE extname='pg_trgm'");
  const indexes = await client.query(`SELECT indexname,indexdef FROM pg_indexes
    WHERE schemaname='lawos_dms' AND indexname=ANY($1::text[])`, [REQUIRED_GIN_INDEXES]);
  const rls = await client.query(`SELECT relname,relrowsecurity,relforcerowsecurity FROM pg_class
    WHERE relnamespace='lawos_dms'::regnamespace AND relname=ANY($1::text[])`, [REQUIRED_RLS_TABLES]);
  const triggers = await client.query(`SELECT tgname,tgenabled FROM pg_trigger
    WHERE tgrelid IN ('lawos_dms.precedent_sources'::regclass,
      'lawos_dms.precedent_extraction_receipts'::regclass,
      'lawos_dms.document_privilege_labels'::regclass)
      AND NOT tgisinternal AND tgname=ANY($1::text[])`, [REQUIRED_TRIGGERS]);
  const privileges = await client.query(`SELECT
    has_table_privilege(current_user,'lawos_dms.precedent_sources','SELECT') AS registry_select,
    has_table_privilege(current_user,'lawos_dms.precedent_sources','INSERT') AS registry_insert,
    has_table_privilege(current_user,'lawos_dms.precedent_sources','UPDATE') AS registry_update,
    has_table_privilege(current_user,'lawos_dms.precedent_extraction_receipts','SELECT') AS extractor_select,
    has_table_privilege(current_user,'lawos_dms.precedent_extraction_receipts','INSERT') AS extractor_insert,
    has_table_privilege(current_user,'lawos_dms.precedent_search_index','SELECT') AS indexer_select,
    has_table_privilege(current_user,'lawos_dms.precedent_search_index','INSERT') AS indexer_insert,
    has_table_privilege(current_user,'lawos_dms.precedent_search_index','UPDATE') AS indexer_update,
    has_table_privilege(current_user,'lawos_dms.precedent_search_index','DELETE') AS indexer_delete,
    has_table_privilege(current_user,'lawos_dms.document_privilege_labels','SELECT') AS privilege_select,
    has_table_privilege(current_user,'lawos_dms.document_privilege_labels','INSERT') AS privilege_insert,
    NOT has_table_privilege(current_user,'lawos_dms.document_privilege_labels','UPDATE') AS privilege_no_update,
    NOT has_table_privilege(current_user,'lawos_dms.document_privilege_labels','DELETE') AS privilege_no_delete,
    NOT has_table_privilege(current_user,'lawos_dms.document_privilege_labels','TRUNCATE') AS privilege_no_truncate`);
  const indexMap = new Map(indexes.rows.map((row) => [row.indexname, row.indexdef]));
  return migration.rows[0]?.checksum === MIGRATION.checksum
    && extension.rows[0]?.schema === "public"
    && REQUIRED_GIN_INDEXES.every((name) => /USING gin/iu.test(indexMap.get(name) ?? ""))
    && REQUIRED_RLS_TABLES.every((name) => rls.rows.some((row) => row.relname === name
      && row.relrowsecurity === true && row.relforcerowsecurity === true))
    && REQUIRED_TRIGGERS.every((name) => triggers.rows.some((row) => row.tgname === name
      && row.tgenabled !== "D"))
    && Object.values(privileges.rows[0] ?? {}).every(Boolean);
}

export function createPrecedentReadinessRepository({ pool } = {}) {
  if (!pool?.connect) throw new TypeError("PostgreSQL pool is required");
  async function readiness({ tenant_id, allowed_document_ids } = {}) {
    const tenantId = requiredId(tenant_id, "tenant_id");
    const allowed = allowed_document_ids === undefined
      ? null : normalizeAllowedDocumentIds(allowed_document_ids);
    try {
      return await withPostgresTransaction(pool, { tenant_id: tenantId, readOnly: true }, async (client) => {
        if (!(await catalogAuthority(client))) return unavailable();
        const state = await client.query(
          `SELECT
             count(*) FILTER (WHERE s.approval_authority <> $3
               OR s.approval_id='' OR s.approval_batch_id=''
               OR s.approval_decision_id='')::integer AS invalid_approval_count,
             count(*) FILTER (WHERE d.privilege_status<>'cleared'
               OR d.current_privilege_label_id IS NULL
               OR d.legal_hold_status='active'
               OR EXISTS (SELECT 1 FROM lawos_dms.legal_holds h
                 WHERE h.tenant_id=s.tenant_id AND h.document_id=s.document_id
                   AND h.status='active'))::integer AS protected_count,
             count(*) FILTER (WHERE (NOT (${ELIGIBLE_DOCUMENT_SQL})
                 OR i.source_id IS NULL OR i.source_revision<>s.source_revision
                 OR i.version_id<>s.version_id OR i.content_sha256<>s.content_sha256
                 OR i.index_version<>$4 OR r.receipt_id IS NULL
                 OR r.text_sha256<>i.text_sha256))::integer AS stale_count
           FROM lawos_dms.precedent_sources s
           JOIN lawos_dms.documents d ON d.tenant_id=s.tenant_id AND d.document_id=s.document_id
           JOIN lawos_dms.document_versions v ON v.tenant_id=s.tenant_id AND v.version_id=s.version_id
           JOIN lawos_dms.file_objects f ON f.tenant_id=v.tenant_id AND f.file_object_id=v.file_object_id
           LEFT JOIN lawos_dms.precedent_search_index i ON i.tenant_id=s.tenant_id AND i.source_id=s.source_id
           LEFT JOIN lawos_dms.precedent_extraction_receipts r
             ON r.tenant_id=i.tenant_id AND r.receipt_id=i.extraction_receipt_id
          WHERE s.tenant_id=$1 AND s.status='active'
            AND ($2::text[] IS NULL OR s.document_id=ANY($2::text[]))`,
          [tenantId, allowed, PRECEDENT_APPROVAL_AUTHORITY, PRECEDENT_INDEX_VERSION]);
        const row = state.rows[0] ?? {};
        if (Number(row.invalid_approval_count) > 0 || Number(row.protected_count) > 0) return unavailable();
        if (Number(row.stale_count) > 0) return unavailable("PRECEDENT_INDEX_STALE");
        return Object.freeze({ runtime_ready: true, authoritative: true,
          safe_error_code: null, index_version: PRECEDENT_INDEX_VERSION,
          authority_fingerprint: hashValue({ migration: MIGRATION.checksum,
            indexes: REQUIRED_GIN_INDEXES, rls: REQUIRED_RLS_TABLES,
            triggers: REQUIRED_TRIGGERS }), production_ready_claim: false });
      });
    } catch {
      return unavailable();
    }
  }
  return Object.freeze({ readiness });
}
