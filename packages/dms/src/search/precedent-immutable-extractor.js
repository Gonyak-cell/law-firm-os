import { sha256Hex } from "../storage/storage-adapter.js";
import { normalizePrecedentText } from "../precedent-source.js";
import { withPostgresTransaction } from "../../../persistence/src/postgres/transaction.js";
import {
  PRECEDENT_EXTRACTION_AUTHORITY,
  codedError,
  hashValue,
  requiredId,
} from "./precedent-common.js";
import { createPrecedentExtractionReceiptAuthority, extractedTextSha256 } from "./precedent-extraction-receipt.js";
import { ELIGIBLE_DOCUMENT_SQL } from "./precedent-persistence.js";

const NATIVE_TEXT_TYPES = new Set([
  "application/json",
  "message/rfc822",
  "text/markdown",
  "text/plain",
]);
const MAX_SOURCE_BYTES = 20 * 1024 * 1024;

function nativeTextExtractor({ bytes, content_type } = {}) {
  const contentType = String(content_type ?? "").split(";", 1)[0].trim().toLowerCase();
  if (!NATIVE_TEXT_TYPES.has(contentType)) {
    throw codedError("immutable source type requires a configured trusted extractor", "PRECEDENT_EXTRACTOR_UNSUPPORTED_TYPE", 409);
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw codedError("immutable source is not valid UTF-8 text", "PRECEDENT_EXTRACTOR_INVALID_TEXT", 409);
  }
}

function metadataText(row) {
  return normalizePrecedentText([
    row.title,
    row.court,
    row.case_number,
    row.decision_date ? new Date(row.decision_date).toISOString().slice(0, 10) : null,
    row.source_reference,
  ].filter(Boolean).join(" "), { maxLength: 4_000 });
}

async function descriptor(pool, tenantId, sourceId) {
  return withPostgresTransaction(pool, { tenant_id: tenantId, readOnly: true }, async (client) => {
    const row = (await client.query(
      `SELECT s.*,v.created_at AS version_created_at,
              f.object_id,f.adapter_id,f.byte_size,f.content_type,f.status AS file_status
         FROM lawos_dms.precedent_sources s
         JOIN lawos_dms.documents d ON d.tenant_id=s.tenant_id AND d.document_id=s.document_id
         JOIN lawos_dms.document_versions v ON v.tenant_id=s.tenant_id AND v.version_id=s.version_id
         JOIN lawos_dms.file_objects f ON f.tenant_id=v.tenant_id AND f.file_object_id=v.file_object_id
        WHERE s.tenant_id=$1 AND s.source_id=$2 AND s.status='active'
          AND ${ELIGIBLE_DOCUMENT_SQL}`, [tenantId, sourceId])).rows[0];
    if (!row) throw codedError("active eligible immutable source was not found", "PRECEDENT_SOURCE_NOT_FOUND", 404);
    return Object.freeze({ ...row });
  });
}

function assertImmutableBytes(row, object) {
  const bytes = Buffer.isBuffer(object?.bytes) ? Buffer.from(object.bytes) : Buffer.from(object?.bytes ?? "");
  if (bytes.byteLength > MAX_SOURCE_BYTES) {
    throw codedError("immutable source exceeds extraction byte limit", "PRECEDENT_EXTRACTOR_SOURCE_TOO_LARGE", 413);
  }
  const observedSha = sha256Hex(bytes);
  const observedSize = object?.byte_size == null ? bytes.byteLength : Number(object.byte_size);
  if (object?.object_id !== row.object_id || observedSize !== bytes.byteLength
      || bytes.byteLength !== Number(row.byte_size) || object?.sha256 !== row.content_sha256
      || observedSha !== row.content_sha256 || row.file_status !== "committed") {
    throw codedError("immutable object bytes do not match DMS version metadata", "PRECEDENT_EXTRACTION_CONTENT_MISMATCH", 409);
  }
  return bytes;
}

export function createImmutablePrecedentExtractionAuthority({
  pool,
  storage,
  receiptSecret,
  textExtractor = nativeTextExtractor,
} = {}) {
  if (!pool?.connect) throw new TypeError("PostgreSQL pool is required");
  if (typeof storage?.getObject !== "function") throw new TypeError("committed DMS object reader is required");
  if (typeof textExtractor !== "function") throw new TypeError("trusted text extractor is required");
  const receiptAuthority = createPrecedentExtractionReceiptAuthority({ secret: receiptSecret });

  async function extractSource({ tenant_id, source_id, actor_id } = {}) {
    const tenantId = requiredId(tenant_id, "tenant_id");
    const sourceId = requiredId(source_id, "source_id");
    const actorId = requiredId(actor_id, "actor_id");
    const row = await descriptor(pool, tenantId, sourceId);
    if (storage.adapter_id && storage.adapter_id !== row.adapter_id) {
      throw codedError("DMS object adapter does not match extraction authority", "PRECEDENT_EXTRACTOR_ADAPTER_MISMATCH", 409);
    }
    const object = await storage.getObject({ tenant_id: tenantId, object_id: row.object_id });
    const bytes = assertImmutableBytes(row, object);
    if (typeof storage.digestObject === "function") {
      const independent = await storage.digestObject({ tenant_id: tenantId, object_id: row.object_id });
      if (independent?.sha256 !== row.content_sha256
          || Number(independent?.byte_size) !== bytes.byteLength) {
        throw codedError("independent DMS digest does not match immutable version", "PRECEDENT_EXTRACTION_CONTENT_MISMATCH", 409);
      }
    }
    const metadata = metadataText(row);
    const body = normalizePrecedentText(await textExtractor({ bytes,
      content_type: row.content_type, document_id: row.document_id,
      version_id: row.version_id }), { maxLength: 1_000_000 });
    const textSha = extractedTextSha256({ metadata_text: metadata, body_text: body });
    const receipt = receiptAuthority.issue({
      receipt_id: `extract:${hashValue({ tenant_id: tenantId, source_id: sourceId,
        version_id: row.version_id, content_sha256: row.content_sha256,
        extractor_id: "native-immutable-text-v1", text_sha256: textSha })}`,
      tenant_id: tenantId, source_id: sourceId, document_id: row.document_id,
      version_id: row.version_id, content_sha256: row.content_sha256,
      extractor_id: "native-immutable-text-v1", text_sha256: textSha,
      character_count: metadata.length + body.length, issued_by: actorId,
      issued_at: new Date(row.version_created_at).toISOString(),
      authority: PRECEDENT_EXTRACTION_AUTHORITY,
    });
    return Object.freeze({ metadata_text: metadata, body_text: body,
      extraction_receipt: receipt, raw_bytes_included: false,
      storage_pointer_ref_included: false, production_ready_claim: false });
  }

  return Object.freeze({ extractSource });
}
