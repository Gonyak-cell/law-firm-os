import { withPostgresTransaction } from "../../../persistence/src/postgres/transaction.js";
import { normalizePrecedentText } from "../precedent-source.js";
import {
  PRECEDENT_INDEX_VERSION,
  codedError,
  hashValue,
  requiredId,
} from "./precedent-common.js";
import { extractedTextSha256 } from "./precedent-extraction-receipt.js";
import { ELIGIBLE_DOCUMENT_SQL, appendPrecedentAudit } from "./precedent-persistence.js";

function receiptValues(receipt) {
  return [receipt.tenant_id, receipt.receipt_id, receipt.source_id,
    receipt.document_id, receipt.version_id, receipt.content_sha256,
    receipt.extractor_id, receipt.text_sha256, Number(receipt.character_count),
    receipt.issued_by, new Date(receipt.issued_at).toISOString(), receipt.authority,
    receipt.receipt_signature];
}

function assertReceiptBinding(receipt, source, metadataText, bodyText) {
  const textSha = extractedTextSha256({ metadata_text: metadataText, body_text: bodyText });
  if (receipt.tenant_id !== source.tenant_id || receipt.source_id !== source.source_id
      || receipt.document_id !== source.document_id || receipt.version_id !== source.version_id
      || receipt.content_sha256 !== source.content_sha256 || receipt.text_sha256 !== textSha
      || receipt.character_count !== metadataText.length + bodyText.length) {
    throw codedError("extraction receipt does not bind the current source text", "PRECEDENT_EXTRACTION_RECEIPT_MISMATCH", 409);
  }
}

export function createPrecedentIndexRepository({ pool, extractionReceiptAuthority } = {}) {
  if (!pool?.connect) throw new TypeError("PostgreSQL pool is required");
  if (!extractionReceiptAuthority?.verify) throw new TypeError("precedent extraction receipt authority is required");

  async function indexSource(input = {}) {
    const tenantId = requiredId(input.tenant_id, "tenant_id");
    const sourceId = requiredId(input.source_id, "source_id");
    const actorId = requiredId(input.actor_id, "actor_id");
    const metadataText = normalizePrecedentText(input.metadata_text, { maxLength: 4_000 });
    const bodyText = normalizePrecedentText(input.body_text, { maxLength: 1_000_000 });
    const receipt = extractionReceiptAuthority.verify(input.extraction_receipt);
    return withPostgresTransaction(pool, { tenant_id: tenantId }, async (client) => {
      const source = (await client.query(
        `SELECT s.*
           FROM lawos_dms.precedent_sources s
           JOIN lawos_dms.documents d ON d.tenant_id=s.tenant_id AND d.document_id=s.document_id
           JOIN lawos_dms.document_versions v ON v.tenant_id=s.tenant_id AND v.version_id=s.version_id
           JOIN lawos_dms.file_objects f ON f.tenant_id=v.tenant_id AND f.file_object_id=v.file_object_id
          WHERE s.tenant_id=$1 AND s.source_id=$2 AND s.status='active'
            AND ${ELIGIBLE_DOCUMENT_SQL}
          FOR UPDATE OF s`, [tenantId, sourceId])).rows[0];
      if (!source) throw codedError("active eligible precedent source was not found", "PRECEDENT_SOURCE_NOT_FOUND", 404);
      assertReceiptBinding(receipt, source, metadataText, bodyText);
      await client.query(
        `INSERT INTO lawos_dms.precedent_extraction_receipts
           (tenant_id,receipt_id,source_id,document_id,version_id,content_sha256,
            extractor_id,text_sha256,character_count,issued_by,issued_at,authority,receipt_signature)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::timestamptz,$12,$13)
         ON CONFLICT (tenant_id,receipt_id) DO NOTHING`, receiptValues(receipt));
      const storedReceipt = (await client.query(
        "SELECT * FROM lawos_dms.precedent_extraction_receipts WHERE tenant_id=$1 AND receipt_id=$2",
        [tenantId, receipt.receipt_id])).rows[0];
      if (!storedReceipt || receiptValues(storedReceipt).some((value, index) => String(value) !== String(receiptValues(receipt)[index]))) {
        throw codedError("extraction receipt identity conflicts with stored evidence", "PRECEDENT_EXTRACTION_RECEIPT_CONFLICT", 409);
      }
      const titleText = normalizePrecedentText(source.title, { maxLength: 300 });
      const normalizedText = normalizePrecedentText(`${titleText} ${metadataText} ${bodyText}`,
        { maxLength: 1_004_302, lowercase: true });
      const indexHash = hashValue({ source_id: sourceId, source_revision: Number(source.source_revision),
        receipt_id: receipt.receipt_id, text_sha256: receipt.text_sha256,
        index_version: PRECEDENT_INDEX_VERSION });
      const result = await client.query(
        `INSERT INTO lawos_dms.precedent_search_index
           (tenant_id,source_id,source_revision,document_id,version_id,content_sha256,
            extraction_receipt_id,extractor_id,text_sha256,index_version,index_hash,
            title_text,metadata_text,body_text,normalized_text)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
         ON CONFLICT (tenant_id,source_id) DO UPDATE SET
           source_revision=EXCLUDED.source_revision,document_id=EXCLUDED.document_id,
           version_id=EXCLUDED.version_id,content_sha256=EXCLUDED.content_sha256,
           extraction_receipt_id=EXCLUDED.extraction_receipt_id,extractor_id=EXCLUDED.extractor_id,
           text_sha256=EXCLUDED.text_sha256,index_version=EXCLUDED.index_version,
           index_hash=EXCLUDED.index_hash,title_text=EXCLUDED.title_text,
           metadata_text=EXCLUDED.metadata_text,body_text=EXCLUDED.body_text,
           normalized_text=EXCLUDED.normalized_text,indexed_at=clock_timestamp()
         WHERE lawos_dms.precedent_search_index.index_hash IS DISTINCT FROM EXCLUDED.index_hash
         RETURNING *`, [tenantId, sourceId, Number(source.source_revision), source.document_id,
          source.version_id, source.content_sha256, receipt.receipt_id, receipt.extractor_id,
          receipt.text_sha256, PRECEDENT_INDEX_VERSION, indexHash, titleText,
          metadataText, bodyText, normalizedText]);
      const replayed = result.rowCount === 0;
      const row = result.rows[0] ?? (await client.query(
        "SELECT * FROM lawos_dms.precedent_search_index WHERE tenant_id=$1 AND source_id=$2",
        [tenantId, sourceId])).rows[0];
      await appendPrecedentAudit(client, { tenant_id: tenantId,
        event_id: `audit:precedent-index:${hashValue({ source_id: sourceId, index_hash: indexHash })}`,
        event_type: "dms.precedent_source.indexed", actor_id: actorId, object_id: sourceId,
        payload: { version_id: source.version_id, content_sha256: source.content_sha256,
          extraction_receipt_id: receipt.receipt_id, extractor_id: receipt.extractor_id,
          text_sha256: receipt.text_sha256, index_version: PRECEDENT_INDEX_VERSION,
          index_hash: indexHash } });
      return Object.freeze({ source_id: sourceId, index_version: row.index_version,
        index_hash: row.index_hash, extraction_receipt_id: receipt.receipt_id,
        indexed_at: new Date(row.indexed_at).toISOString(), replayed,
        raw_body_included: false, storage_pointer_ref_included: false,
        production_ready_claim: false });
    });
  }

  return Object.freeze({ indexSource, refreshSource: indexSource });
}
