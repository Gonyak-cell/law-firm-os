import { randomUUID } from "node:crypto";
import { withPostgresTransaction } from "../../persistence/src/postgres/transaction.js";
import { createPostgresDmsUploadRuntime } from "../src/postgres-upload-runtime.js";
import { createDocumentPrivilegeRepository } from "../src/search/document-privilege-repository.js";
import { createImmutablePrecedentExtractionAuthority } from "../src/search/precedent-immutable-extractor.js";
import {
  createPostgresPrecedentRepository,
  derivePrecedentAuthorityKeys,
} from "../src/search/postgres-precedent-repository.js";
import { createLocalStorageAdapter } from "../src/storage/local-storage-adapter.js";
import { sha256Hex } from "../src/storage/storage-adapter.js";

export const TENANT = "tenant_precedent_alpha";
export const OTHER_TENANT = "tenant_precedent_beta";
export const ACTOR = "user_precedent_editor";
export const SECRET = "precedent-test-authority-secret-material-20260808";

export function digest(character) { return character.repeat(64); }

export async function commitDocument(pool, storage, {
  tenant_id = TENANT,
  matter_id,
  document_id,
  version_id,
  title,
  version_number = 1,
  fixture_bytes,
  descriptor_byte_size,
  privileged = false,
  privilege_unknown = false,
  legal_hold_status = "none",
} = {}) {
  const bytes = Buffer.from(fixture_bytes);
  const sha256 = sha256Hex(bytes);
  const objectId = `object:${version_id}`;
  const receipt = await storage.putObject({ tenant_id, object_id: objectId,
    bytes, content_type: "text/plain" });
  await withPostgresTransaction(pool, { tenant_id }, async (client) => {
    const fileId = `file:${version_id}`;
    await client.query(`INSERT INTO lawos_dms.documents
      (tenant_id,document_id,matter_id,workspace_id,title,status,current_version_id,
       permission_envelope_id,audit_trace_id,legal_hold_status)
      VALUES ($1,$2,$3,$4,$5,'active',NULL,$6,$7,'none')
      ON CONFLICT (tenant_id,document_id) DO NOTHING`,
    [tenant_id, document_id, matter_id, `workspace:${matter_id}`, title,
      `permission:${document_id}`, `audit:${document_id}`]);
    await client.query(`INSERT INTO lawos_dms.file_objects
      (tenant_id,file_object_id,object_id,adapter_id,storage_pointer_ref,sha256,
       byte_size,content_type,status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,'text/plain','committed')`,
    [tenant_id, fileId, objectId, storage.adapter_id, receipt.storage_pointer_ref,
      sha256, descriptor_byte_size ?? bytes.byteLength]);
    await client.query(`INSERT INTO lawos_dms.document_versions
      (tenant_id,version_id,document_id,version_number,file_object_id,sha256,created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [tenant_id, version_id, document_id, version_number, fileId, sha256, ACTOR]);
    await client.query(`UPDATE lawos_dms.documents SET current_version_id=$3,
      updated_at=clock_timestamp() WHERE tenant_id=$1 AND document_id=$2`,
    [tenant_id, document_id, version_id]);
  });
  if (!privilege_unknown) await createDocumentPrivilegeRepository({ pool })
    .classifyDocumentPrivilege({ tenant_id, document_id,
      label_id: `privilege:${version_id}:${privileged ? "protected" : "cleared"}`,
      classification: privileged ? "privileged" : "not_privileged",
      authority: "dms-privilege-review-v1", decision_id: `decision:${version_id}`,
      provenance_sha256: sha256Hex(Buffer.from(`privilege:${version_id}`)),
      applied_by: ACTOR, applied_at: "2026-08-08T00:00:00.000Z" });
  if (legal_hold_status === "active") await createPostgresDmsUploadRuntime({
    pool, storage, clock: () => new Date("2026-08-08T00:00:00.000Z") })
    .placeLegalHold({ tenant_id, legal_hold_id: `hold:${version_id}`,
      document_id, object_id: objectId, created_by: ACTOR,
      reason: "precedent test hold" });
  return Object.freeze({ sha256, bytes });
}

export function source({ tenant_id = TENANT, source_id, matter_id, document_id,
  version_id, title, body = `immutable source ${source_id}`,
  case_law = false, approval = "approval-1" } = {}) {
  const fixtureBytes = Buffer.from(body, "utf8");
  return { tenant_id, source_id,
    source_kind: case_law ? "case_law_document" : "internal_matter_document",
    matter_id, document_id, version_id, content_sha256: sha256Hex(fixtureBytes),
    title, fixture_bytes: fixtureBytes,
    ...(case_law ? { court: "대법원", case_number: "2024다12345",
      decision_date: "2026-05-14",
      source_url: "https://glaw.scourt.go.kr/precedent/2024da12345",
      source_reference: "대법원 2026. 5. 14. 선고 2024다12345 판결" } : {}),
    approval_id: approval, approval_batch_id: "batch-approved-1",
    approval_decision_id: `decision:${approval}`,
    approval_authority: "vault-approved-precedent-corpus-v1",
    approved_by: ACTOR, approved_at: "2026-08-08T00:00:00.000Z",
    actor_id: ACTOR, idempotency_key: `register:${source_id}:${approval}` };
}

export function repository(pool, secret = SECRET) {
  const keys = derivePrecedentAuthorityKeys(secret);
  return createPostgresPrecedentRepository({ pool,
    cursorSecret: keys.cursor, extractionReceiptSecret: keys.extraction_receipt });
}

export function extractor(pool, storage, secret = SECRET) {
  return createImmutablePrecedentExtractionAuthority({ pool, storage,
    receiptSecret: derivePrecedentAuthorityKeys(secret).extraction_receipt });
}

export async function index(repo, extraction, entry) {
  const extracted = await extraction.extractSource({ tenant_id: entry.tenant_id,
    source_id: entry.source_id, actor_id: ACTOR });
  return repo.indexSource({ tenant_id: entry.tenant_id, source_id: entry.source_id,
    actor_id: ACTOR, metadata_text: extracted.metadata_text,
    body_text: extracted.body_text, extraction_receipt: extracted.extraction_receipt });
}

export function searchInput(overrides = {}) {
  return { tenant_id: TENANT, matter_id: "matter-current", actor_id: ACTOR,
    request_occurrence_id: `request:${randomUUID()}`,
    authorization_decision_sha256: digest("d"),
    authorized_source_set_sha256: digest("e"), query: "손해 fiduciary",
    allowed_document_ids: [], limit: 20, ...overrides };
}

export function localStorage(adapter_id) {
  return createLocalStorageAdapter({ adapter_id });
}
