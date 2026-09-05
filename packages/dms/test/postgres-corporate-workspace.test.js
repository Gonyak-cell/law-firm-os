import assert from "node:assert/strict";
import { createHash, generateKeyPairSync, sign } from "node:crypto";
import test from "node:test";
import { createMigratedPostgresFixture } from "../../persistence/test/helpers/disposable-postgres.js";
import { createDomainSnapshot, hashDomainValue } from "../../persistence/src/domain-ledger.js";
import { createPostgresDomainLedger } from "../../persistence/src/postgres/domain-ledger.js";
import { withPostgresTransaction } from "../../persistence/src/postgres/transaction.js";
import { canonicalizeJson } from "../../runtime-auth/src/runtime-safety-approval-contract.js";
import { CORPORATE_IMPORT_ACTION, CORPORATE_IMPORT_VERSION } from "../../master-data/src/corporate-import-service.js";
import { corporateImportApprovalScope, executeCorporateRecordImport, planCorporateRecordImport } from "../../../scripts/lib/corporate-record-import.mjs";
import { createDmsWorkspace } from "../src/model.js";
import { createPostgresDmsUploadRuntime } from "../src/postgres-upload-runtime.js";
import { createLocalStorageAdapter } from "../src/storage/local-storage-adapter.js";
import { CORPORATE_WORKSPACE_ACTION, CORPORATE_WORKSPACE_VERSION, corporateWorkspaceApprovalScope,
  executeCorporateWorkspace, planCorporateWorkspace } from "../src/corporate-workspace-service.js";

const TENANT = "tenant-corporate-workspace-test";
const OWNER = "owner-corporate-workspace-test";
const clock = () => new Date("2026-09-05T08:00:00.000Z");
const SHA = "a".repeat(40);
const TREE = "b".repeat(40);
const BYTES = Buffer.from("Synthetic corporate registration source. Complete source bytes.");
const digest = (value) => createHash("sha256").update(value).digest("hex");
const keys = generateKeyPairSync("ed25519");
const workspace = { workspace_id: "workspace-private-corporate", name: "Synthetic corporate administration",
  legal_entity_id: "entity-private-corporate", organization_id: "organization-private-corporate",
  party_id: "party-private-corporate", owner_user_id: OWNER, permission_ref: "permission-private-corporate",
  permission_envelope_id: "envelope-private-corporate", audit_trace_id: "trace-private-corporate" };
const manifestFor = () => ({ schema_version: CORPORATE_WORKSPACE_VERSION, operation: "create", environment: "synthetic-test",
  source_sha: SHA, source_tree: TREE, mapping_sha256: "c".repeat(64), tenant_id: TENANT, actor_id: OWNER,
  workspace: structuredClone(workspace), before_payload_sha256: null });
const source = { source_id: "source-private-corporate", legal_entity_id: workspace.legal_entity_id,
  document_id: "document-private-corporate", version_id: "version-private-corporate", file_object_id: "file:version-private-corporate",
  object_id: "object-private-corporate", sha256: digest(BYTES), byte_size: BYTES.length,
  content_type: "text/plain", page_count: 1, scope_type: "legal_entity_administration" };
const tx = (fixture, work) => withPostgresTransaction(fixture.appPool, { tenant_id: TENANT }, work);
const rejected = (reason) => ({ code: `LAWOS_CORPORATE_WORKSPACE_${reason}` });

function approvalFor(plan, patch = {}, signingKeys = keys) {
  const registryBytes = Buffer.from(JSON.stringify({ schema_version: "law-firm-os.runtime-safety.approval-trust-registry.v1",
    generated_at: "2026-09-05T00:00:00.000Z", keys: [{ key_id: "workspace-test-owner", algorithm: "Ed25519",
      public_key_spki_pem: signingKeys.publicKey.export({ type: "spki", format: "pem" }), roles: ["owner"],
      actions: [CORPORATE_WORKSPACE_ACTION, CORPORATE_IMPORT_ACTION], environments: [plan.environment],
      valid_from: "2026-09-01T00:00:00.000Z", valid_until: "2026-10-01T00:00:00.000Z", revoked_at: null }] }));
  const receipt = { schema_version: "law-firm-os.runtime-safety.approval.v1", approval_id: "approval-private-workspace-test",
    key_id: "workspace-test-owner", role: "owner", decision: "approved", packet_sha256: plan.packet_sha256,
    source_sha: plan.source_sha, source_tree: plan.source_tree, action: plan.action, environment: plan.environment,
    signed_at: "2026-09-05T07:00:00.000Z", expires_at: "2026-09-05T09:00:00.000Z",
    data_scope: plan.action === CORPORATE_WORKSPACE_ACTION ? corporateWorkspaceApprovalScope(plan) : corporateImportApprovalScope(plan),
    contact_scope: [], ...patch };
  return { registryBytes, registrySha256: digest(registryBytes), receiptBytes: Buffer.from(JSON.stringify(receipt)),
    signatureBytes: sign(null, Buffer.from(canonicalizeJson(receipt)), signingKeys.privateKey) };
}
function request(fixture, manifest, plan) {
  const approval = approvalFor(plan);
  return { pool: fixture.appPool, manifest, plan, sourceSha: SHA, sourceTree: TREE,
    expectedRegistrySha256: digest(approval.registryBytes), approval, clock };
}
async function ledgerState(fixture) {
  return tx(fixture, async (client) => {
    const state = {};
    for (const table of ["records", "record_references", "audit_events", "outbox_events", "idempotency_keys"])
      state[table] = (await client.query(`SELECT * FROM lawos_domain.${table} WHERE tenant_id = $1 ORDER BY to_jsonb(${table})::text`, [TENANT])).rows;
    return state;
  });
}
async function ownerAccount(fixture, status = "active") {
  await tx(fixture, (client) => client.query(`INSERT INTO lawos_identity.accounts (tenant_id, user_id, account_status)
    VALUES ($1,$2,$3) ON CONFLICT (tenant_id,user_id) DO UPDATE SET account_status = EXCLUDED.account_status`, [TENANT, OWNER, status]));
}
async function setup(t) {
  const fixture = await createMigratedPostgresFixture(t); if (!fixture) return null;
  const ledger = createPostgresDomainLedger({ pool: fixture.appPool, clock });
  await ledger.importSnapshot(createDomainSnapshot({ tenant_id: TENANT, domain_id: "master-data", records: [{
    record_type: "ClientGroup", record_id: "existing-client-group", payload: { model_type: "ClientGroup", tenant_id: TENANT,
      client_group_id: "existing-client-group", display_name: "Existing client group", status: "active", synthetic_only: true,
      owner_user_id: "existing-owner", permission_ref: "existing-permission", matter_id: "existing-matter" },
  }] }));
  await ledger.importSnapshot(createDomainSnapshot({ tenant_id: TENANT, domain_id: "matter", records: [{
    record_type: "Matter", record_id: "existing-matter", payload: { model_type: "Matter", tenant_id: TENANT,
      matter_id: "existing-matter", title: "Preserved matter", owner_user_id: "existing-owner" },
  }] }));
  return { ...fixture, ledger };
}
async function createPending(fixture) {
  await ownerAccount(fixture);
  const manifest = manifestFor();
  const plan = await planCorporateWorkspace({ pool: fixture.appPool, manifest });
  const run = request(fixture, manifest, plan);
  const result = await executeCorporateWorkspace(run);
  return { manifest, plan, run, result };
}
async function uploadAndImport(fixture, created) {
  const storage = createLocalStorageAdapter({ adapter_id: "corporate-workspace-lifecycle-test" });
  const dms = createPostgresDmsUploadRuntime({ pool: fixture.appPool, storage, clock });
  const document = { tenant_id: TENANT, document_id: source.document_id, current_version_id: source.version_id,
    matter_id: null, workspace_id: workspace.workspace_id, permission_envelope_id: workspace.permission_envelope_id,
    audit_trace_id: "trace-complete-source", title: "Synthetic complete source", mime_type: source.content_type };
  await assert.rejects(dms.uploadDocument({ document, bytes: BYTES, actor_id: "another-owner", idempotency_key: "wrong-owner" }),
    (error) => error.safe_error_code === "DMS_CORPORATE_WORKSPACE_AUTHORITY_REJECTED");
  const uploaded = await dms.uploadDocument({ document, bytes: BYTES, actor_id: OWNER, idempotency_key: "source-private-corporate",
    object_id: source.object_id, session_id: "session-private-corporate" });
  assert.equal(uploaded.independent_digest_readback, true);
  assert.equal(storage.statObject({ tenant_id: TENANT, object_id: source.object_id }).sha256, digest(BYTES));
  const binding = { ...workspace, matter_id: null, record_matter_id: null, scope_type: "legal_entity_administration" };
  const operations = [
    ["Entity", workspace.legal_entity_id, { entity_kind: "organization", display_name: "Synthetic corporate entity" }],
    ["Party", workspace.party_id, { party_type: "organization", display_name: "Synthetic corporate party", canonical_entity_id: workspace.legal_entity_id }],
    ["Organization", workspace.organization_id, { display_name: "Synthetic corporation", entity_id: workspace.legal_entity_id,
      party_id: workspace.party_id, registration_number: "synthetic-registration" }],
  ].map(([model_type, record_id, values]) => ({ model_type, record_id, values, legal_entity_id: workspace.legal_entity_id,
    before_payload_sha256: null, expected_values: {}, evidence: [{ source_id: source.source_id, page: 1, fields: Object.keys(values) }] }));
  const manifest = { schema_version: CORPORATE_IMPORT_VERSION, tenant_id: TENANT, actor_id: OWNER, environment: "synthetic-test",
    source_sha: SHA, source_tree: TREE, bindings: [binding], documents: [source], operations };
  const plan = await planCorporateRecordImport({ pool: fixture.appPool, manifest });
  assert.equal((await executeCorporateRecordImport(request(fixture, manifest, plan))).outcome, "PASS");
  const anchors = await fixture.ledger.list({ tenant_id: TENANT, domain_id: "master-data" });
  const activation = { ...created.manifest, operation: "activate", before_payload_sha256: created.plan.after_payload_sha256,
    corporate_import_manifest_sha256: plan.manifest_sha256, corporate_import_plan_sha256: plan.packet_sha256,
    field_evidence_sha256: plan.field_evidence_sha256,
    anchor_payload_sha256: Object.fromEntries(anchors.filter((row) => ["Entity", "Party", "Organization"].includes(row.record_type))
      .map((row) => [row.record_type, row.payload_hash])), documents: [source] };
  return { dms, storage, activation, document, anchors };
}

test("actual PostgreSQL signed lifecycle creates pending authority, imports complete sources, and activates without changing existing matters or clients", async (t) => {
  const fixture = await setup(t); if (!fixture) return;
  const baseline = await ledgerState(fixture);
  const manifest = manifestFor();
  await assert.rejects(planCorporateWorkspace({ pool: fixture.appPool, manifest }), rejected("OWNER_ACCOUNT"));
  await ownerAccount(fixture, "disabled");
  await assert.rejects(planCorporateWorkspace({ pool: fixture.appPool, manifest }), rejected("OWNER_ACCOUNT"));
  await ownerAccount(fixture);
  const active = createDmsWorkspace({ ...workspace, tenant_id: TENANT, scope_type: "legal_entity_administration",
    matter_id: null, synthetic_only: false, status: "active" });
  await assert.rejects(tx(fixture, (client) => client.query(`INSERT INTO lawos_domain.records
    (tenant_id,domain_id,record_type,record_id,payload,payload_hash) VALUES ($1,'dms-auxiliary','DmsWorkspace',$2,$3::jsonb,$4)`,
  [TENANT, workspace.workspace_id, JSON.stringify(active), hashDomainValue(active)])), { postgres_code: "23514" });
  const plan = await planCorporateWorkspace({ pool: fixture.appPool, manifest });
  const run = request(fixture, manifest, plan);
  await assert.rejects(executeCorporateWorkspace({ ...run, approval: approvalFor(plan, {}, generateKeyPairSync("ed25519")) }),
    { code: "APPROVAL_REGISTRY_DIGEST" });
  await assert.rejects(executeCorporateWorkspace({ ...run, expectedRegistrySha256: undefined }), rejected("APPROVAL_BINDING"));
  await assert.rejects(executeCorporateWorkspace({ ...run, approval: approvalFor(plan, { expires_at: "2026-09-05T07:30:00.000Z" }) }),
    { code: "APPROVAL_EXPIRED" });
  await assert.rejects(executeCorporateWorkspace({ ...run, approval: approvalFor(plan, { data_scope: ["approved-real-manifest"] }) }),
    rejected("APPROVAL_SCOPE_TIME"));
  await assert.rejects(executeCorporateWorkspace({ ...run, approval: approvalFor(plan, { decision: "rejected" }) }),
    rejected("APPROVAL_REJECTED"));
  for (const environment of ["production", "rehearsal"]) {
    const actualManifest = { ...manifest, environment };
    const actualPlan = await planCorporateWorkspace({ pool: fixture.appPool, manifest: actualManifest });
    const actualRun = request(fixture, actualManifest, actualPlan);
    const now = Date.now();
    const expired = approvalFor(actualPlan, { signed_at: new Date(now - 120_000).toISOString(), expires_at: new Date(now - 60_000).toISOString() });
    await assert.rejects(executeCorporateWorkspace({ ...actualRun, approval: expired, clock: () => new Date(now - 90_000) }),
      { code: "APPROVAL_EXPIRED" });
  }
  assert.deepEqual(await ledgerState(fixture), baseline);
  const result = await executeCorporateWorkspace(run);
  assert.equal(result.outcome, "PASS");
  assert.equal(result.replayed, false);
  const pending = await ledgerState(fixture);
  await assert.rejects(executeCorporateWorkspace({ ...run, readOnly: true, approval: approvalFor(plan, { decision: "rejected" }) }),
    rejected("APPROVAL_REJECTED"));
  assert.equal((await executeCorporateWorkspace({ ...run, readOnly: true })).replayed, true);
  assert.deepEqual(await ledgerState(fixture), pending);
  const { activation, dms } = await uploadAndImport(fixture, { manifest, plan });
  const activatePlan = await planCorporateWorkspace({ pool: fixture.appPool, manifest: activation });
  assert.equal(activatePlan.document_count, 1);
  const activateRun = request(fixture, activation, activatePlan);
  const beforeDocuments = await dms.getDocumentState({ tenant_id: TENANT, document_id: source.document_id });
  assert.equal((await executeCorporateWorkspace(activateRun)).outcome, "PASS");
  const after = await ledgerState(fixture);
  assert.equal(after.records.find((row) => row.record_type === "DmsWorkspace").payload.status, "active");
  assert.equal((await executeCorporateWorkspace(activateRun)).replayed, true);
  assert.equal((await executeCorporateWorkspace({ ...activateRun, readOnly: true })).replayed, true);
  assert.deepEqual(await ledgerState(fixture), after);
  assert.deepEqual(await dms.getDocumentState({ tenant_id: TENANT, document_id: source.document_id }), beforeDocuments);
  assert.deepEqual(after.records.filter((row) => ["Matter", "ClientGroup"].includes(row.record_type)), baseline.records);
  assert.equal(after.records.some((row) => row.record_type === "MatterClient"), false);
  assert.equal(after.audit_events.filter((row) => row.domain_id === "dms-auxiliary").length, 2);
  assert.equal(after.outbox_events.filter((row) => row.domain_id === "dms-auxiliary").length, 2);
});

test("actual PostgreSQL activation rejects stale anchors and source bindings, rolls back failed outbox, and rejects unfinished uploads", async (t) => {
  const fixture = await setup(t); if (!fixture) return;
  const created = await createPending(fixture);
  const { activation, dms, storage, anchors } = await uploadAndImport(fixture, created);
  const plan = await planCorporateWorkspace({ pool: fixture.appPool, manifest: activation });
  const run = request(fixture, activation, plan);
  const baseline = await ledgerState(fixture);
  for (const [mutate, reason] of [
    [(m) => { m.anchor_payload_sha256.Entity = "f".repeat(64); }, "ANCHOR_AUTHORITY"],
    [(m) => { m.corporate_import_manifest_sha256 = "f".repeat(64); }, "IMPORT_EVIDENCE"],
    [(m) => { m.corporate_import_plan_sha256 = "f".repeat(64); }, "IMPORT_EVIDENCE"],
    [(m) => { m.field_evidence_sha256 = "f".repeat(64); }, "IMPORT_EVIDENCE"],
    [(m) => { m.documents[0].sha256 = "f".repeat(64); }, "DOCUMENT_BINDING"],
    [(m) => { m.documents[0].version_id = "wrong-version"; }, "DOCUMENT_BINDING"],
    [(m) => { m.workspace.permission_envelope_id = "wrong-envelope"; }, "WORKSPACE_AUTHORITY"],
    [(m) => { m.workspace.owner_user_id = "wrong-owner"; }, "OWNER_MAPPING"],
    [(m) => { m.workspace.scope_type = "matter"; }, "OWNER_MAPPING"],
  ]) {
    const changed = structuredClone(activation); mutate(changed);
    await assert.rejects(planCorporateWorkspace({ pool: fixture.appPool, manifest: changed }), rejected(reason));
  }
  const anchor = anchors.find((row) => row.record_type === "Organization");
  const setAnchor = (payload, payloadHash) => fixture.adminPool.query(`UPDATE lawos_domain.records SET payload=$3::jsonb,payload_hash=$4
    WHERE tenant_id=$1 AND domain_id='master-data' AND record_type='Organization' AND record_id=$2`,
  [TENANT, workspace.organization_id, JSON.stringify(payload), payloadHash]);
  for (const changed of [{ ...anchor.payload, owner_user_id: "another-owner" }, { ...anchor.payload, permission_ref: "another-permission" },
    { ...anchor.payload, entity_id: "another-entity" }]) {
    await setAnchor(changed, hashDomainValue(changed));
    const changedManifest = { ...activation, anchor_payload_sha256: { ...activation.anchor_payload_sha256, Organization: hashDomainValue(changed) } };
    await assert.rejects(planCorporateWorkspace({ pool: fixture.appPool, manifest: changedManifest }), rejected("ANCHOR_AUTHORITY"));
    await assert.rejects(executeCorporateWorkspace(run), rejected("ANCHOR_AUTHORITY"));
    await setAnchor(anchor.payload, anchor.payload_hash);
  }
  for (const [kind, primaryKey] of [["Entity", "entity_id"], ["Party", "party_id"], ["Organization", "organization_id"]]) {
    const row = anchors.find((record) => record.record_type === kind);
    const changed = { ...row.payload, [primaryKey]: "mismatched-payload-primary-id" };
    const set = (payload, payloadHash) => fixture.adminPool.query(`UPDATE lawos_domain.records SET payload=$4::jsonb,payload_hash=$5
      WHERE tenant_id=$1 AND domain_id='master-data' AND record_type=$2 AND record_id=$3`,
    [TENANT, kind, row.record_id, JSON.stringify(payload), payloadHash]);
    await set(changed, hashDomainValue(changed));
    const changedManifest = { ...activation, anchor_payload_sha256: { ...activation.anchor_payload_sha256, [kind]: hashDomainValue(changed) } };
    await assert.rejects(planCorporateWorkspace({ pool: fixture.appPool, manifest: changedManifest }), rejected("ANCHOR_AUTHORITY"));
    await assert.rejects(tx(fixture, (client) => client.query(`UPDATE lawos_domain.records
      SET payload=jsonb_set(payload,'{status}','"active"'::jsonb)
      WHERE tenant_id=$1 AND domain_id='dms-auxiliary' AND record_type='DmsWorkspace' AND record_id=$2`,
    [TENANT, workspace.workspace_id])), { postgres_code: "23514" });
    await set(row.payload, row.payload_hash);
  }
  assert.deepEqual(await ledgerState(fixture), baseline);
  await fixture.adminPool.query(`CREATE FUNCTION lawos_domain.reject_workspace_outbox() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN IF NEW.domain_id = 'dms-auxiliary' THEN RAISE EXCEPTION 'synthetic workspace outbox failure'; END IF; RETURN NEW; END; $$;
    CREATE TRIGGER reject_workspace_outbox BEFORE INSERT ON lawos_domain.outbox_events
    FOR EACH ROW EXECUTE FUNCTION lawos_domain.reject_workspace_outbox()`);
  await assert.rejects(executeCorporateWorkspace(run), { postgres_code: "P0001" });
  assert.deepEqual(await ledgerState(fixture), baseline);
  assert.equal(storage.statObject({ tenant_id: TENANT, object_id: source.object_id }).sha256, digest(BYTES));
  await fixture.adminPool.query("DROP TRIGGER reject_workspace_outbox ON lawos_domain.outbox_events");
  const unrelatedSource = { ...source, source_id: "source-not-used-for-fields", document_id: "document-not-used-for-fields",
    version_id: "version-not-used-for-fields", file_object_id: "file:version-not-used-for-fields", object_id: "object-not-used-for-fields" };
  await dms.uploadDocument({ document: { tenant_id: TENANT, document_id: unrelatedSource.document_id,
    current_version_id: unrelatedSource.version_id, matter_id: null, workspace_id: workspace.workspace_id,
    permission_envelope_id: workspace.permission_envelope_id, audit_trace_id: "additional-source-trace",
    title: "Additional supporting source", mime_type: source.content_type }, bytes: BYTES, actor_id: OWNER,
    idempotency_key: "additional-supporting-source", object_id: unrelatedSource.object_id, session_id: "additional-source-session" });
  await assert.rejects(planCorporateWorkspace({ pool: fixture.appPool, manifest: { ...activation, documents: [unrelatedSource] } }),
    rejected("SOURCE_PROVENANCE"));
  await assert.rejects(planCorporateWorkspace({ pool: fixture.appPool, manifest: activation }), rejected("DOCUMENT_SET"));
  const completeManifest = { ...activation, documents: [source, unrelatedSource] };
  const completePlan = await planCorporateWorkspace({ pool: fixture.appPool, manifest: completeManifest });
  const completeRun = request(fixture, completeManifest, completePlan);
  await dms.createUploadSession({ tenant_id: TENANT, document_id: "unfinished-document", version_id: "unfinished-version",
    matter_id: null, workspace_id: workspace.workspace_id, permission_envelope_id: workspace.permission_envelope_id,
    session_id: "unfinished-session", object_id: "unfinished-object", actor_id: OWNER, idempotency_key: "unfinished-corporate-upload",
    expected_sha256: digest(BYTES), expected_byte_size: BYTES.length, content_type: source.content_type,
    audit_trace_id: "unfinished-trace", title: "Unfinished source", expires_at: "2026-09-05T08:15:00.000Z" });
  await assert.rejects(planCorporateWorkspace({ pool: fixture.appPool, manifest: completeManifest }), rejected("DOCUMENT_SET"));
  await assert.rejects(executeCorporateWorkspace(completeRun), rejected("DOCUMENT_SET"));
  await assert.rejects(tx(fixture, (client) => client.query(`UPDATE lawos_domain.records
    SET payload=jsonb_set(payload,'{status}','"active"'::jsonb)
    WHERE tenant_id=$1 AND domain_id='dms-auxiliary' AND record_type='DmsWorkspace' AND record_id=$2`, [TENANT, workspace.workspace_id])),
  { postgres_code: "23514" });
  assert.deepEqual(await ledgerState(fixture), baseline);
});

test("actual PostgreSQL held and archived corporate workspaces permit legal hold preservation while rejecting document changes", async (t) => {
  for (const status of ["held", "archived"]) {
    const fixture = await setup(t); if (!fixture) return;
    const created = await createPending(fixture);
    const { storage, dms, document } = await uploadAndImport(fixture, created);
    const before = await dms.getDocumentState({ tenant_id: TENANT, document_id: source.document_id });
    const canonical = (await fixture.ledger.list({ tenant_id: TENANT, domain_id: "dms-auxiliary" }))
      .find((row) => row.record_type === "DmsWorkspace");
    const preservedWorkspace = { ...canonical.payload, status };
    await tx(fixture, (client) => client.query(`UPDATE lawos_domain.records
      SET payload=$3::jsonb,payload_hash=$4,state_version=state_version+1
      WHERE tenant_id=$1 AND domain_id='dms-auxiliary' AND record_type='DmsWorkspace' AND record_id=$2`,
    [TENANT, workspace.workspace_id, JSON.stringify(preservedWorkspace), hashDomainValue(preservedWorkspace)]));
    const providerCalls = [];
    let providerHold = "OFF";
    const protectedStorage = { ...storage, capabilities: { ...storage.capabilities, provider_retention: true },
      async setObjectLegalHold(input) { providerCalls.push(input); providerHold = input.status; return { status: providerHold }; },
      async getObjectLegalHold(input) { providerCalls.push(input); return { status: providerHold }; } };
    const protectedDms = createPostgresDmsUploadRuntime({ pool: fixture.appPool, storage: protectedStorage, clock });
    const hold = { tenant_id: TENANT, legal_hold_id: `hold-${status}-corporate`, document_id: source.document_id,
      object_id: source.object_id, created_by: OWNER, reason: `Preserve ${status} source` };
    const placed = await protectedDms.placeLegalHold(hold);
    assert.equal(placed.status, "active");
    assert.equal(placed.provider_readback_verified, true);
    assert.equal(placed.replayed, false);
    assert.deepEqual(providerCalls, [
      { tenant_id: TENANT, object_id: source.object_id, status: "ON" },
      { tenant_id: TENANT, object_id: source.object_id },
    ]);
    const stored = await tx(fixture, (client) => client.query(`SELECT document_id,object_id,status FROM lawos_dms.legal_holds
      WHERE tenant_id=$1 AND legal_hold_id=$2`, [TENANT, hold.legal_hold_id]));
    assert.deepEqual(stored.rows, [{ document_id: source.document_id, object_id: source.object_id, status: "active" }]);
    const after = await protectedDms.getDocumentState({ tenant_id: TENANT, document_id: source.document_id });
    assert.equal(after.document.legal_hold_status, "active");
    assert.deepEqual({ ...after, document: { ...after.document, legal_hold_status: before.document.legal_hold_status,
      updated_at: before.document.updated_at } }, before);
    assert.equal(storage.statObject({ tenant_id: TENANT, object_id: source.object_id }).sha256, digest(BYTES));
    for (const [assignment, code] of [
      ["document_id = 'reassigned-document'", "55000"], ["workspace_id = 'reassigned-workspace'", "55000"],
      ["current_version_id = 'replacement-version'", "23514"], ["title = 'replacement-title'", "23514"],
    ]) await assert.rejects(tx(fixture, (client) => client.query(`UPDATE lawos_dms.documents SET ${assignment}
      WHERE tenant_id=$1 AND document_id=$2`, [TENANT, source.document_id])), { postgres_code: code });
    await assert.rejects(protectedDms.uploadDocument({ document: { ...document, document_id: `new-document-${status}`,
      current_version_id: `new-version-${status}` }, bytes: Buffer.from("Unapproved new content"), actor_id: OWNER,
      idempotency_key: `new-upload-${status}`, object_id: `new-object-${status}`, session_id: `new-session-${status}` }),
    (error) => error.safe_error_code === "DMS_CORPORATE_WORKSPACE_AUTHORITY_REJECTED");
    assert.equal(storage.statObject({ tenant_id: TENANT, object_id: `new-object-${status}` }), null);
    assert.equal((await protectedDms.placeLegalHold(hold)).replayed, true);
    assert.deepEqual(await protectedDms.getDocumentState({ tenant_id: TENANT, document_id: source.document_id }), after);
    assert.equal((await fixture.ledger.list({ tenant_id: TENANT, domain_id: "dms-auxiliary" }))
      .find((row) => row.record_type === "DmsWorkspace").payload_hash, hashDomainValue(preservedWorkspace));
  }
});
