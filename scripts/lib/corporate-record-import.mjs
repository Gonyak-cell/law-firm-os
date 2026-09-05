import { createDomainSnapshot, hashDomainValue } from "../../packages/persistence/src/domain-ledger.js";
import { createAuthenticatedTransactionBoundDomainLedger } from "../../packages/persistence/src/postgres/domain-ledger.js";
import { withPostgresTransaction } from "../../packages/persistence/src/postgres/transaction.js";
import { flushDomainSnapshotToScopedLedger } from "../../packages/persistence/src/record-domain-adapter.js";
import { validateRuntimeSafetyApprovalPayload } from "../../packages/runtime-auth/src/runtime-safety-approval-contract.js";
import { CORPORATE_IMPORT_ACTION, CORPORATE_IMPORT_VERSION, assertCorporateImport as requireCondition,
  corporateImportRecordsHash, prepareCorporateMasterDataImport, validateCorporateImportManifest } from "../../packages/master-data/src/corporate-import-service.js";

const equal = (a, b) => hashDomainValue(a) === hashDomainValue(b);
export const corporateImportApprovalScope = (plan) => ["approved-real-manifest", `corporate-import:${plan.manifest_sha256}`, `tenant:${plan.tenant_ref_sha256}`];

export function verifyCorporateImportApproval({ manifest, plan, sourceSha, sourceTree, approval, now }) {
  validateCorporateImportManifest(manifest);
  const { packet_sha256, ...material } = plan;
  requireCondition(plan.schema_version === CORPORATE_IMPORT_VERSION && plan.action === CORPORATE_IMPORT_ACTION
    && plan.source_sha === sourceSha && plan.source_tree === sourceTree && manifest.source_sha === sourceSha && manifest.source_tree === sourceTree
    && plan.environment === manifest.environment && plan.manifest_sha256 === hashDomainValue(manifest)
    && plan.tenant_ref_sha256 === hashDomainValue(manifest.tenant_id) && packet_sha256 === hashDomainValue(material), "PLAN_DRIFT");
  const receipt = JSON.parse(Buffer.from(approval.receiptBytes).toString("utf8"));
  const currentTime = new Date(now).getTime();
  const key = JSON.parse(Buffer.from(approval.registryBytes).toString("utf8")).keys?.find((item) => item.key_id === receipt.key_id);
  requireCondition(Number.isFinite(currentTime) && Date.parse(receipt.signed_at) <= currentTime
    && Date.parse(key?.valid_from) <= currentTime, "APPROVAL_TIME");
  requireCondition(equal(receipt.data_scope, corporateImportApprovalScope(plan)) && equal(receipt.contact_scope, []), "APPROVAL_SCOPE");
  const verified = validateRuntimeSafetyApprovalPayload({ ...approval, expectedRegistrySha256: approval.registrySha256,
    expectedRole: "owner", expectedAction: CORPORATE_IMPORT_ACTION, expectedEnvironment: manifest.environment,
    expectedPacketSha256: packet_sha256, expectedSourceSha: sourceSha, expectedSourceTree: sourceTree,
    allowedDataScope: corporateImportApprovalScope(plan), allowedContactScope: [], now: currentTime });
  requireCondition(verified.decision === "approved", "APPROVAL_REJECTED");
  return verified;
}

async function snapshot(tx, tenantId) {
  return createDomainSnapshot({ tenant_id: tenantId, domain_id: "master-data", records: await tx.list(),
    idempotency_entries: await tx.listIdempotency(), audit_events: await tx.listAudit() });
}

// DMS uses specialized relational authority. This narrow read joins exact committed versions, never immutable domain shadows.
async function verifyCommittedDocuments(client, manifest) {
  for (const expected of manifest.documents) {
    const binding = manifest.bindings.find((item) => item.legal_entity_id === expected.legal_entity_id);
    const result = await client.query(
      `SELECT d.tenant_id, d.document_id, d.matter_id, d.workspace_id, d.permission_envelope_id,
              v.version_id, v.file_object_id, v.sha256 AS version_sha256,
              f.object_id, f.sha256, f.byte_size, f.content_type
         FROM lawos_dms.documents d
         JOIN lawos_dms.document_versions v ON v.tenant_id = d.tenant_id AND v.document_id = d.document_id
         JOIN lawos_dms.file_objects f ON f.tenant_id = v.tenant_id AND f.file_object_id = v.file_object_id
        WHERE d.tenant_id = $1 AND d.document_id = $2 AND v.version_id = $3
          AND d.status = 'active' AND f.status = 'committed'
          AND NOT EXISTS (SELECT 1 FROM lawos_dms.delete_intents i
                           WHERE i.tenant_id = d.tenant_id AND i.document_id = d.document_id
                             AND i.state IN ('pending', 'provider_deleted'))`,
      [manifest.tenant_id, expected.document_id, expected.version_id]);
    const observed = result.rows[0];
    requireCondition(result.rows.length === 1 && observed.tenant_id === manifest.tenant_id
      && ["document_id", "version_id", "file_object_id", "object_id", "sha256", "content_type"].every((field) => observed[field] === expected[field])
      && observed.version_sha256 === expected.sha256 && Number(observed.byte_size) === expected.byte_size
      && ["matter_id", "workspace_id", "permission_envelope_id"].every((field) => observed[field] === binding[field]), "DMS_COMMITTED_REFERENCE");
  }
}

export async function planCorporateRecordImport({ pool, manifest }) {
  validateCorporateImportManifest(manifest);
  return withPostgresTransaction(pool, { tenant_id: manifest.tenant_id, readOnly: true, isolationLevel: "serializable" }, async (client) => {
    await verifyCommittedDocuments(client, manifest);
    const tx = await createAuthenticatedTransactionBoundDomainLedger({ client, tenant_id: manifest.tenant_id, domain_id: "master-data" });
    return prepareCorporateMasterDataImport({ manifest, currentSnapshot: await snapshot(tx, manifest.tenant_id) }).plan;
  });
}

export async function executeCorporateRecordImport({ pool, manifest, plan, sourceSha, sourceTree, approval, readOnly = false, clock = () => new Date() }) {
  // Historical clocks are only available to synthetic fixtures; real imports always revalidate against wall time.
  if (manifest.environment !== "synthetic-test") clock = () => new Date();
  const verify = () => verifyCorporateImportApproval({ manifest, plan, sourceSha, sourceTree, approval, now: clock() });
  verify();
  return withPostgresTransaction(pool, { tenant_id: manifest.tenant_id, readOnly, isolationLevel: "serializable" }, async (client) => {
    verify();
    await verifyCommittedDocuments(client, manifest);
    const tx = await createAuthenticatedTransactionBoundDomainLedger({ client, tenant_id: manifest.tenant_id, domain_id: "master-data", clock });
    const before = await snapshot(tx, manifest.tenant_id);
    const eventId = `corporate-import:${plan.manifest_sha256}`;
    const summary = { plan_sha256: plan.packet_sha256, manifest_sha256: plan.manifest_sha256, after_records_sha256: plan.after_records_sha256,
      record_count: plan.after_record_count, changed_record_count: plan.changed_record_count, field_evidence_sha256: plan.field_evidence_sha256 };
    const prior = before.idempotency_entries.find((item) => item.key === eventId);
    if (prior) {
      requireCondition(prior.request_hash === plan.packet_sha256 && equal(prior.response, summary), "REPLAY_CONFLICT");
    } else {
      requireCondition(!readOnly, "RECEIPT_MISSING");
      const prepared = prepareCorporateMasterDataImport({ manifest, currentSnapshot: before });
      requireCondition(equal(prepared.plan, plan), "BASELINE_DRIFT");
      const source = createDomainSnapshot({ ...prepared.after, source_hash: undefined,
        idempotency_entries: [...before.idempotency_entries, { key: eventId, request_hash: plan.packet_sha256, response: summary }],
        audit_events: [...before.audit_events, { event_id: eventId, event_type: "master-data.corporate.imported", actor_id: manifest.actor_id,
          object_type: "CorporateMasterDataImport", object_id: plan.manifest_sha256,
          payload: { ...summary, field_evidence: prepared.evidence }, created_at: new Date(clock()).toISOString() }] });
      verify();
      await flushDomainSnapshotToScopedLedger({ tx, source, tenant_id: manifest.tenant_id, domain_id: "master-data", expected_baseline: before });
    }
    const observed = await snapshot(tx, manifest.tenant_id);
    const audit = observed.audit_events.filter((item) => item.event_id === eventId && item.event_type === "master-data.corporate.imported"
      && hashDomainValue(item.payload.field_evidence) === plan.field_evidence_sha256);
    const outbox = (await tx.listOutbox()).filter((item) => item.event_id === `outbox:${eventId}` && item.topic === "master-data.audit"
      && item.payload.audit_event_id === eventId && item.payload.payload_hash === hashDomainValue(audit[0]?.payload));
    requireCondition(corporateImportRecordsHash(observed) === plan.after_records_sha256 && observed.records.length === plan.after_record_count
      && audit.length === 1 && outbox.length === 1, "READBACK_FAILED");
    verify();
    return Object.freeze({ schema_version: CORPORATE_IMPORT_VERSION, outcome: "PASS", packet_sha256: plan.packet_sha256,
      record_count: observed.records.length, changed_record_count: plan.changed_record_count, preserved_record_count: plan.preserved_record_count,
      record_readback_sha256: plan.after_records_sha256, committed_document_count: manifest.documents.length,
      audit_count: 1, outbox_count: 1, replayed: Boolean(prior), read_only: readOnly,
      record_deletion_count: 0, permission_write: false, document_write: false, document_body_readback_verified: false,
      creates_client_group: false, identity_write: false, employment_write: false, raw_identity_returned: false, production_ready_claim: false });
  });
}
