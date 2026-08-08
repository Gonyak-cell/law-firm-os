import { normalizePrecedentText } from "../precedent-source.js";
import {
  PRECEDENT_APPROVAL_AUTHORITY,
  hashValue,
  requiredId,
  requiredText,
  requiredTimestamp,
} from "./precedent-common.js";
import { extractedTextSha256 } from "./precedent-extraction-receipt.js";

const SCHEMA_VERSION = "amic-os.precedent-import.v1";

function validateManifest(input = {}) {
  if (input.schema_version !== SCHEMA_VERSION) throw new TypeError("precedent import schema_version is invalid");
  const tenantId = requiredId(input.tenant_id, "tenant_id");
  const batchId = requiredId(input.batch_id, "batch_id");
  const approval = input.approval ?? {};
  if (approval.authority !== PRECEDENT_APPROVAL_AUTHORITY) throw new TypeError("precedent import approval authority is invalid");
  const normalizedApproval = Object.freeze({
    approval_id: requiredId(approval.approval_id, "approval.approval_id"),
    approval_decision_id: requiredId(approval.approval_decision_id, "approval.approval_decision_id"),
    approved_by: requiredId(approval.approved_by, "approval.approved_by"),
    approved_at: requiredTimestamp(approval.approved_at, "approval.approved_at"),
  });
  if (!Array.isArray(input.sources) || input.sources.length < 1 || input.sources.length > 500) {
    throw new TypeError("precedent import sources must contain between 1 and 500 rows");
  }
  const ids = new Set();
  const sources = input.sources.map((entry) => {
    const sourceId = requiredId(entry.source_id, "source_id");
    if (ids.has(sourceId)) throw new TypeError(`precedent import contains duplicate source_id ${sourceId}`);
    ids.add(sourceId);
    return Object.freeze({ ...entry, source_id: sourceId });
  }).sort((a, b) => a.source_id.localeCompare(b.source_id));
  return Object.freeze({ tenant_id: tenantId, batch_id: batchId,
    approval: normalizedApproval, sources: Object.freeze(sources) });
}

export async function executeApprovedPrecedentImport({ repository, manifest, actor_id } = {}) {
  if (!repository?.registerSource || !repository?.indexSource || !repository?.issueExtractionReceipt) {
    throw new TypeError("active precedent repository is required");
  }
  const actorId = requiredId(actor_id, "actor_id");
  const approved = validateManifest(manifest);
  const results = [];
  for (const entry of approved.sources) {
    const metadataText = normalizePrecedentText(entry.metadata_text, { maxLength: 4_000 });
    const bodyText = normalizePrecedentText(entry.body_text, { maxLength: 1_000_000 });
    const sourceHash = hashValue({ tenant_id: approved.tenant_id,
      batch_id: approved.batch_id, source_id: entry.source_id,
      version_id: entry.version_id, content_sha256: entry.content_sha256 });
    const registered = await repository.registerSource({ ...entry,
      tenant_id: approved.tenant_id, actor_id: actorId,
      approval_id: approved.approval.approval_id,
      approval_batch_id: approved.batch_id,
      approval_decision_id: approved.approval.approval_decision_id,
      approval_authority: PRECEDENT_APPROVAL_AUTHORITY,
      approved_by: approved.approval.approved_by,
      approved_at: approved.approval.approved_at,
      idempotency_key: `precedent-import:${sourceHash}` });
    const receipt = repository.issueExtractionReceipt({
      receipt_id: `extract:${sourceHash}`,
      tenant_id: approved.tenant_id, source_id: entry.source_id,
      document_id: entry.document_id, version_id: entry.version_id,
      content_sha256: entry.content_sha256,
      extractor_id: requiredId(entry.extractor_id, "extractor_id"),
      text_sha256: extractedTextSha256({ metadata_text: metadataText, body_text: bodyText }),
      character_count: metadataText.length + bodyText.length,
      issued_by: actorId, issued_at: approved.approval.approved_at,
      authority: "dms-immutable-version-extractor-v1",
    });
    const indexed = await repository.indexSource({ tenant_id: approved.tenant_id,
      source_id: entry.source_id, actor_id: actorId, metadata_text: metadataText,
      body_text: bodyText, extraction_receipt: receipt });
    results.push(Object.freeze({ source_id: entry.source_id,
      source_revision: registered.source.source_revision,
      index_hash: indexed.index_hash, replayed: registered.replayed && indexed.replayed }));
  }
  return Object.freeze({ schema_version: SCHEMA_VERSION, tenant_id: approved.tenant_id,
    batch_id: approved.batch_id, imported_count: results.length,
    results: Object.freeze(results), raw_body_included: false,
    storage_pointer_ref_included: false, production_ready_claim: false });
}

export function precedentImportUsage() {
  return requiredText("node scripts/import-approved-precedents.mjs --manifest <approved.json> --actor-id <user_id>", "usage");
}
