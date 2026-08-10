import { handleOutlookAddinApiRequest } from "../src/outlook-addin-runtime-context.js";
import { createDocumentPrivilegeRepository } from "../../../packages/dms/src/search/document-privilege-repository.js";
import { sha256Hex } from "../../../packages/dms/src/storage/storage-adapter.js";
import { withPostgresTransaction } from "../../../packages/persistence/src/postgres/transaction.js";

export const TENANT = "tenant_outlook_precedent";
export const ACTOR = "user_outlook_precedent";
export const CURRENT_MATTER = "matter_current";
export const AUTHORITY_SECRET = "outlook-precedent-api-authority-secret-20260808";

export async function commitDocument(pool, storage, {
  matter_id,
  document_id,
  version_id,
  bytes,
  title,
  version_number = 1,
  privilege_applied_at = "2026-08-08T00:00:00.000Z",
} = {}) {
  const immutableBytes = Buffer.from(bytes);
  const sha256 = sha256Hex(immutableBytes);
  const objectId = `object:${version_id}`;
  const receipt = await storage.putObject({ tenant_id: TENANT, object_id: objectId,
    bytes: immutableBytes, content_type: "text/plain" });
  await withPostgresTransaction(pool, { tenant_id: TENANT }, async (client) => {
    const fileObjectId = `file:${version_id}`;
    await client.query(
      `INSERT INTO lawos_dms.documents
         (tenant_id, document_id, matter_id, workspace_id, title, status,
          current_version_id, permission_envelope_id, audit_trace_id)
       VALUES ($1,$2,$3,$4,$5,'active',NULL,$6,$7)
       ON CONFLICT (tenant_id, document_id) DO NOTHING`,
      [TENANT, document_id, matter_id, `workspace:${matter_id}`, title,
        `permission:${document_id}`, `audit:${document_id}`]);
    await client.query(
      `INSERT INTO lawos_dms.file_objects
         (tenant_id, file_object_id, object_id, adapter_id, storage_pointer_ref,
          sha256, byte_size, content_type, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'text/plain','committed')`,
      [TENANT, fileObjectId, objectId, storage.adapter_id,
        receipt.storage_pointer_ref, sha256, immutableBytes.byteLength]);
    await client.query(
      `INSERT INTO lawos_dms.document_versions
         (tenant_id, version_id, document_id, version_number, file_object_id,
          sha256, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [TENANT, version_id, document_id, version_number, fileObjectId, sha256, ACTOR]);
    await client.query(
      `UPDATE lawos_dms.documents SET current_version_id=$3, updated_at=clock_timestamp()
        WHERE tenant_id=$1 AND document_id=$2`,
      [TENANT, document_id, version_id]);
  });
  await createDocumentPrivilegeRepository({ pool }).classifyDocumentPrivilege({
    tenant_id: TENANT, document_id, label_id: `privilege:${version_id}:cleared`,
    classification: "not_privileged", authority: "dms-privilege-review-v1",
    decision_id: `decision:${version_id}:cleared`,
    provenance_sha256: sha256Hex(Buffer.from(`privilege:${version_id}`)),
    applied_by: ACTOR, applied_at: privilege_applied_at });
}

export function source({ source_id, matter_id, document_id, version_id, title,
  body = `immutable precedent body for ${source_id}`, case_law = false } = {}) {
  return {
    tenant_id: TENANT,
    source_id,
    source_kind: case_law ? "case_law_document" : "internal_matter_document",
    matter_id,
    document_id,
    version_id,
    content_sha256: sha256Hex(Buffer.from(body, "utf8")),
    title,
    ...(case_law ? {
      court: "대법원",
      case_number: "2025다54321",
      decision_date: "2026-06-11",
      source_url: "https://glaw.scourt.go.kr/precedent/2025da54321",
      source_reference: "대법원 2026. 6. 11. 선고 2025다54321 판결",
    } : {}),
    actor_id: ACTOR,
    idempotency_key: `register:${source_id}`,
    approval_id: `approval:${source_id}`,
    approval_batch_id: "batch:outlook-precedent-api",
    approval_decision_id: `decision:${source_id}`,
    approval_authority: "vault-approved-precedent-corpus-v1",
    approved_by: ACTOR,
    approved_at: "2026-08-08T00:00:00.000Z",
  };
}

export async function indexSource(repository, extractor, entry) {
  const extracted = await extractor.extractSource({ tenant_id: TENANT,
    source_id: entry.source.source_id, actor_id: ACTOR });
  return repository.indexSource({ tenant_id: TENANT,
    source_id: entry.source.source_id, actor_id: ACTOR,
    metadata_text: extracted.metadata_text, body_text: extracted.body_text,
    extraction_receipt: extracted.extraction_receipt });
}

export function permissionContext({ denyMatter = false } = {}) {
  return {
    principal: { user_id: ACTOR, tenant_id: TENANT, role_ids: ["lawyer"] },
    rules: [
      { id: "allow-precedent-route", effect: "allow", action: "outlook:precedent:search" },
      { id: "allow-dms-read", effect: "allow", action: "dms:document:read" },
    ],
    object_acl: [
      { id: "ethical-wall-denied-source", principal_id: ACTOR,
        resource_id: "document_denied", action: "dms:document:read", effect: "deny" },
      ...(denyMatter ? [{ id: "deny-current-matter", principal_id: ACTOR,
        resource_id: CURRENT_MATTER, action: "outlook:precedent:search", effect: "deny" }] : []),
    ],
  };
}

export function matterRepository() {
  return {
    get({ tenant_id, model_type, matter_id }) {
      return tenant_id === TENANT && model_type === "Matter" && matter_id === CURRENT_MATTER
        ? { tenant_id, model_type, matter_id, status: "open" }
        : undefined;
    },
  };
}

export async function request({ repository, context = permissionContext(),
  query = {}, requestId = "req_outlook_precedent" } = {}) {
  return handleOutlookAddinApiRequest({
    pathname: "/api/outlook/precedents",
    method: "GET",
    query: { q: "damages", matter_id: CURRENT_MATTER, ...query },
    context,
    requestId,
    runtime: {
      matterRuntime: { repository: matterRepository() },
      precedentSearchRuntime: repository ? { repository } : null,
    },
  });
}
