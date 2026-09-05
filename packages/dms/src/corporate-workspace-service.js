import { hashDomainValue } from "../../persistence/src/domain-ledger.js";
import { withPostgresTransaction } from "../../persistence/src/postgres/transaction.js";
import { createAuthenticatedTransactionBoundDomainLedger } from "../../persistence/src/postgres/domain-ledger.js";
import { validateRuntimeSafetyApprovalPayload } from "../../runtime-auth/src/runtime-safety-approval-contract.js";
import { createDmsWorkspace } from "./model.js";
import { DMS_AUXILIARY_DOMAIN_DESCRIPTOR } from "./central-ledger.js";

export const CORPORATE_WORKSPACE_VERSION = "law-firm-os.corporate-workspace.v1";
export const CORPORATE_WORKSPACE_ACTION = "lawos-corporate-workspace";
const sha = (value) => typeof value === "string" && /^[a-f0-9]{64}$/u.test(value);
const text = (value) => typeof value === "string" && value.trim() === value && value.length > 0;
const equal = (a, b) => hashDomainValue(a) === hashDomainValue(b);
function requireCondition(value, reason) {
  if (!value) throw Object.assign(new Error(`Corporate workspace rejected: ${reason}`), {
    code: `LAWOS_CORPORATE_WORKSPACE_${reason}`, safe_error_code: `CORPORATE_WORKSPACE_${reason}`, status: 409,
  });
}

function validate(manifest) {
  requireCondition(manifest?.schema_version === CORPORATE_WORKSPACE_VERSION
    && ["create", "activate"].includes(manifest.operation)
    && ["production", "rehearsal", "synthetic-test"].includes(manifest.environment)
    && /^[a-f0-9]{40}$/u.test(manifest.source_sha ?? "") && /^[a-f0-9]{40}$/u.test(manifest.source_tree ?? "")
    && sha(manifest.mapping_sha256) && text(manifest.tenant_id) && text(manifest.actor_id)
    && Object.keys(manifest).every((key) => ["schema_version", "operation", "environment", "source_sha", "source_tree",
      "mapping_sha256", "tenant_id", "actor_id", "workspace", "before_payload_sha256", "corporate_import_manifest_sha256",
      "corporate_import_plan_sha256", "field_evidence_sha256", "anchor_payload_sha256", "documents"].includes(key)), "MANIFEST");
  const w = manifest.workspace;
  requireCondition(w && ["workspace_id", "name", "legal_entity_id", "organization_id", "party_id", "owner_user_id",
    "permission_ref", "permission_envelope_id", "audit_trace_id"].every((field) => text(w[field]))
    && Object.keys(w).every((field) => ["workspace_id", "name", "legal_entity_id", "organization_id", "party_id", "owner_user_id",
      "permission_ref", "permission_envelope_id", "audit_trace_id"].includes(field))
    && manifest.actor_id === w.owner_user_id, "OWNER_MAPPING");
  requireCondition(manifest.operation === "create" ? manifest.before_payload_sha256 === null
    : sha(manifest.before_payload_sha256) && sha(manifest.corporate_import_manifest_sha256)
      && sha(manifest.corporate_import_plan_sha256) && sha(manifest.field_evidence_sha256)
      && ["Entity", "Party", "Organization"].every((kind) => sha(manifest.anchor_payload_sha256?.[kind]))
      && Array.isArray(manifest.documents) && manifest.documents.length > 0
      && manifest.documents.length <= 200 && new Set(manifest.documents.map((d) => d.document_id)).size === manifest.documents.length
      && manifest.documents.every((d) => ["document_id", "version_id", "file_object_id", "object_id"].every((field) => text(d[field]))
        && sha(d.sha256) && Number.isSafeInteger(d.byte_size) && d.byte_size >= 0), "BASELINE");
  return createDmsWorkspace({ ...w, tenant_id: manifest.tenant_id, matter_id: null,
    scope_type: "legal_entity_administration", synthetic_only: false,
    status: manifest.operation === "create" ? "pending_anchor" : "active" });
}

async function readWorkspace(client, manifest, lock = false) {
  const result = await client.query(`SELECT tenant_id, record_id, state_version, payload, payload_hash
    FROM lawos_domain.records WHERE tenant_id = $1 AND domain_id = 'dms-auxiliary'
      AND record_type = 'DmsWorkspace' AND record_id = $2${lock ? " FOR UPDATE" : ""}`,
  [manifest.tenant_id, manifest.workspace.workspace_id]);
  const row = result.rows[0] ?? null;
  if (row) requireCondition(row.tenant_id === manifest.tenant_id && row.record_id === manifest.workspace.workspace_id
    && row.payload.tenant_id === manifest.tenant_id && row.payload_hash === hashDomainValue(row.payload), "WORKSPACE_INTEGRITY");
  return row;
}

async function verifyActivation(client, manifest) {
  const w = manifest.workspace;
  for (const [kind, id] of [["Entity", w.legal_entity_id], ["Party", w.party_id], ["Organization", w.organization_id]]) {
    const { rows } = await client.query(`SELECT payload, payload_hash FROM lawos_domain.records
      WHERE tenant_id = $1 AND domain_id = 'master-data' AND record_type = $2 AND record_id = $3`, [manifest.tenant_id, kind, id]);
    const row = rows[0]; const record = row?.payload;
    requireCondition(rows.length === 1 && row.payload_hash === manifest.anchor_payload_sha256[kind]
      && row.payload_hash === hashDomainValue(record) && record.tenant_id === manifest.tenant_id && record.model_type === kind
      && record[{ Entity: "entity_id", Party: "party_id", Organization: "organization_id" }[kind]] === id
      && record.owner_user_id === w.owner_user_id && record.permission_ref === w.permission_ref
      && record.matter_id === null && record.status === "active"
      && (kind !== "Entity" || record.entity_kind === "organization")
      && (kind !== "Party" || record.party_type === "organization" && record.canonical_entity_id === w.legal_entity_id)
      && (kind !== "Organization" || record.entity_id === w.legal_entity_id && record.party_id === w.party_id), "ANCHOR_AUTHORITY");
  }
  const auditId = `corporate-import:${manifest.corporate_import_manifest_sha256}`;
  const { rows: audits } = await client.query(`SELECT a.payload, o.payload AS outbox_payload
    FROM lawos_domain.audit_events a JOIN lawos_domain.outbox_events o
      ON o.tenant_id = a.tenant_id AND o.domain_id = a.domain_id AND o.event_id = $3
    WHERE a.tenant_id = $1 AND a.domain_id = 'master-data' AND a.event_id = $2
      AND a.event_type = 'master-data.corporate.imported' AND o.topic = 'master-data.audit'`,
  [manifest.tenant_id, auditId, `outbox:${auditId}`]);
  const audit = audits[0]?.payload;
  requireCondition(audits.length === 1 && audit.manifest_sha256 === manifest.corporate_import_manifest_sha256
    && audit.plan_sha256 === manifest.corporate_import_plan_sha256
    && hashDomainValue(audit.field_evidence) === manifest.field_evidence_sha256
    && audits[0].outbox_payload.audit_event_id === auditId
    && audits[0].outbox_payload.payload_hash === hashDomainValue(audit), "IMPORT_EVIDENCE");
  const sources = audit.field_evidence.filter((item) => item.legal_entity_id === w.legal_entity_id)
    .flatMap((item) => item.fields.flatMap((field) => field.sources));
  for (const d of manifest.documents) {
    const { rows } = await client.query(`SELECT d.matter_id, d.workspace_id, d.permission_envelope_id,
      v.version_id, v.file_object_id, v.sha256, f.object_id, f.byte_size
      FROM lawos_dms.documents d JOIN lawos_dms.document_versions v
        ON v.tenant_id = d.tenant_id AND v.document_id = d.document_id AND v.version_id = d.current_version_id
      JOIN lawos_dms.file_objects f ON f.tenant_id = v.tenant_id AND f.file_object_id = v.file_object_id
      WHERE d.tenant_id = $1 AND d.document_id = $2 AND d.status = 'active' AND f.status = 'committed'
        AND f.sha256 = v.sha256 AND NOT EXISTS (SELECT 1 FROM lawos_dms.delete_intents i
          WHERE i.tenant_id = d.tenant_id AND i.document_id = d.document_id AND i.state IN ('pending', 'provider_deleted'))`,
    [manifest.tenant_id, d.document_id]);
    const current = rows[0];
    requireCondition(rows.length === 1 && current.matter_id === null && current.workspace_id === w.workspace_id
      && current.permission_envelope_id === w.permission_envelope_id && Number(current.byte_size) === d.byte_size
      && ["version_id", "file_object_id", "object_id", "sha256"].every((field) => current[field] === d[field]), "DOCUMENT_BINDING");
  }
  requireCondition(sources.some((source) => source.scope_type === "legal_entity_administration"
    && source.legal_entity_id === w.legal_entity_id && source.workspace_id === w.workspace_id
    && source.matter_id === null && source.permission_envelope_id === w.permission_envelope_id
    && manifest.documents.some((d) => ["document_id", "version_id", "file_object_id", "object_id", "sha256", "byte_size"].every((field) => source[field] === d[field]))), "SOURCE_PROVENANCE");
  const { rows } = await client.query(`SELECT
    (SELECT count(*)::integer FROM lawos_dms.documents WHERE tenant_id = $1 AND workspace_id = $2) AS documents,
    (SELECT count(*)::integer FROM lawos_dms.upload_sessions WHERE tenant_id = $1 AND workspace_id = $2 AND state <> 'finalized') AS unfinished`,
  [manifest.tenant_id, w.workspace_id]);
  requireCondition(rows[0].documents === manifest.documents.length && rows[0].unfinished === 0, "DOCUMENT_SET");
}

async function verifyOwner(client, manifest) {
  const owner = await client.query(`SELECT user_id FROM lawos_identity.accounts
    WHERE tenant_id = $1 AND user_id = $2 AND account_status = 'active'`, [manifest.tenant_id, manifest.actor_id]);
  requireCondition(owner.rows.length === 1, "OWNER_ACCOUNT");
}

async function prepare(client, manifest, lock = false) {
  const payload = validate(manifest);
  await verifyOwner(client, manifest);
  const before = await readWorkspace(client, manifest, lock);
  requireCondition((before?.payload_hash ?? null) === manifest.before_payload_sha256, "BASELINE_DRIFT");
  if (before) requireCondition(before.payload.status === "pending_anchor"
    && equal({ ...before.payload, status: "active" }, payload), "WORKSPACE_AUTHORITY");
  if (manifest.operation === "activate") await verifyActivation(client, manifest);
  const material = { schema_version: CORPORATE_WORKSPACE_VERSION, action: CORPORATE_WORKSPACE_ACTION,
    operation: manifest.operation, environment: manifest.environment, source_sha: manifest.source_sha, source_tree: manifest.source_tree,
    manifest_sha256: hashDomainValue(manifest), tenant_ref_sha256: hashDomainValue(manifest.tenant_id),
    before_payload_sha256: before?.payload_hash ?? null, before_state_version: Number(before?.state_version ?? 0),
    after_payload_sha256: hashDomainValue(payload), document_count: manifest.documents?.length ?? 0,
    creates_matter: false, creates_client_group: false, deletes_documents: false };
  return { payload, before, plan: { ...material, packet_sha256: hashDomainValue(material) } };
}

export const corporateWorkspaceApprovalScope = (plan) => ["approved-real-manifest",
  `corporate-workspace:${plan.manifest_sha256}`, `tenant:${plan.tenant_ref_sha256}`];

export function verifyCorporateWorkspaceApproval({ manifest, plan, sourceSha, sourceTree, expectedRegistrySha256, approval, now }) {
  validate(manifest);
  const { packet_sha256, ...material } = plan;
  requireCondition(sha(expectedRegistrySha256) && plan.action === CORPORATE_WORKSPACE_ACTION
    && plan.schema_version === CORPORATE_WORKSPACE_VERSION && packet_sha256 === hashDomainValue(material)
    && plan.manifest_sha256 === hashDomainValue(manifest) && plan.source_sha === sourceSha && plan.source_tree === sourceTree
    && manifest.source_sha === sourceSha && manifest.source_tree === sourceTree
    && plan.environment === manifest.environment, "APPROVAL_BINDING");
  const receipt = JSON.parse(Buffer.from(approval.receiptBytes).toString("utf8"));
  const key = JSON.parse(Buffer.from(approval.registryBytes).toString("utf8")).keys?.find((k) => k.key_id === receipt.key_id);
  requireCondition(Date.parse(receipt.signed_at) <= Number(new Date(now)) && Date.parse(key?.valid_from) <= Number(new Date(now))
    && equal(receipt.data_scope, corporateWorkspaceApprovalScope(plan)) && equal(receipt.contact_scope, []), "APPROVAL_SCOPE_TIME");
  const verified = validateRuntimeSafetyApprovalPayload({ ...approval, expectedRegistrySha256, expectedRole: "owner",
    expectedAction: CORPORATE_WORKSPACE_ACTION, expectedEnvironment: manifest.environment,
    expectedPacketSha256: packet_sha256, expectedSourceSha: sourceSha, expectedSourceTree: sourceTree,
    allowedDataScope: corporateWorkspaceApprovalScope(plan), allowedContactScope: [], now: Number(new Date(now)) });
  requireCondition(verified.decision === "approved", "APPROVAL_REJECTED");
  return verified;
}

export async function planCorporateWorkspace({ pool, manifest }) {
  validate(manifest);
  return withPostgresTransaction(pool, { tenant_id: manifest.tenant_id, readOnly: true, isolationLevel: "serializable" },
    async (client) => (await prepare(client, manifest)).plan);
}

export async function executeCorporateWorkspace({ pool, manifest, plan, sourceSha, sourceTree, expectedRegistrySha256,
  approval, readOnly = false, clock = () => new Date() }) {
  if (manifest.environment !== "synthetic-test") clock = () => new Date();
  const verify = () => verifyCorporateWorkspaceApproval({ manifest, plan, sourceSha, sourceTree, expectedRegistrySha256, approval, now: clock() });
  verify();
  return withPostgresTransaction(pool, { tenant_id: manifest.tenant_id, readOnly, isolationLevel: "serializable" }, async (client) => {
    verify();
    await verifyOwner(client, manifest);
    const tx = await createAuthenticatedTransactionBoundDomainLedger({ client, tenant_id: manifest.tenant_id, domain_id: "dms-auxiliary", clock });
    const eventId = `corporate-workspace:${plan.manifest_sha256}`;
    const summary = { plan_sha256: plan.packet_sha256, workspace_payload_sha256: plan.after_payload_sha256, operation: manifest.operation };
    const prior = (await tx.listIdempotency()).find((item) => item.key === eventId);
    if (prior) {
      requireCondition(prior.request_hash === plan.packet_sha256 && equal(prior.response, summary), "REPLAY_CONFLICT");
    } else {
      requireCondition(!readOnly, "RECEIPT_MISSING");
      const prepared = await prepare(client, manifest, true);
      requireCondition(equal(prepared.plan, plan), "PLAN_DRIFT");
      const record = await tx.write({ record_type: "DmsWorkspace", record_id: manifest.workspace.workspace_id,
        payload: prepared.payload, unique_key: DMS_AUXILIARY_DOMAIN_DESCRIPTOR.unique_key(prepared.payload),
        expected_version: prepared.plan.before_state_version });
      await tx.addReferences({ ...record, references: DMS_AUXILIARY_DOMAIN_DESCRIPTOR.references(prepared.payload) });
      await tx.claimIdempotency({ key: eventId, request_hash: plan.packet_sha256, response: summary });
      await tx.appendAudit({ event_id: eventId, event_type: `dms.corporate_workspace.${manifest.operation}`,
        actor_id: manifest.actor_id, object_type: "DmsWorkspace", object_id: manifest.workspace.workspace_id, payload: summary });
      await tx.enqueueOutbox({ event_id: `outbox:${eventId}`, topic: "dms-auxiliary.audit", aggregate_type: "DmsWorkspace",
        aggregate_id: manifest.workspace.workspace_id, payload: { audit_event_id: eventId, payload_hash: hashDomainValue(summary) } });
    }
    const observed = await readWorkspace(client, manifest);
    requireCondition(observed?.payload_hash === plan.after_payload_sha256, "READBACK_DRIFT");
    if (manifest.operation === "activate") await verifyActivation(client, manifest);
    const audits = (await tx.listAudit()).filter((item) => item.event_id === eventId && equal(item.payload, summary));
    const outbox = (await tx.listOutbox()).filter((item) => item.event_id === `outbox:${eventId}`
      && item.topic === "dms-auxiliary.audit" && item.payload.audit_event_id === eventId && item.payload.payload_hash === hashDomainValue(summary));
    requireCondition(audits.length === 1 && outbox.length === 1, "RECEIPT_READBACK");
    verify();
    return Object.freeze({ outcome: "PASS", ...summary, audit_count: 1, outbox_count: 1,
      document_count: plan.document_count, replayed: Boolean(prior), read_only: readOnly, production_ready_claim: false });
  });
}
