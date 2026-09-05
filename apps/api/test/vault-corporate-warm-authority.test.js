import assert from "node:assert/strict";
import { createHash, generateKeyPairSync, sign } from "node:crypto";
import test from "node:test";
import { createMigratedPostgresFixture } from "../../../packages/persistence/test/helpers/disposable-postgres.js";
import { createPostgresPool } from "../../../packages/persistence/src/postgres/pool.js";
import { createPostgresDomainLedger } from "../../../packages/persistence/src/postgres/domain-ledger.js";
import { createRecordRepositoryDomainSnapshot, materializeRecordRepositoryFromDomainLedger } from "../../../packages/persistence/src/record-domain-adapter.js";
import { createDmsWorkspace } from "../../../packages/dms/src/model.js";
import { DMS_AUXILIARY_DOMAIN_DESCRIPTOR, createDmsAuxiliaryRepository } from "../../../packages/dms/src/central-ledger.js";
import { createPostgresIdentityLedger } from "../../../packages/runtime-auth/src/postgres-identity-ledger.js";
import { canonicalizeJson } from "../../../packages/runtime-auth/src/runtime-safety-approval-contract.js";
import { createFileHrxStore } from "../../../packages/hrx/src/store/file-store.js";
import { runHrxMigrations } from "../../../packages/hrx/src/migrations/index.js";
import { createHrxDomainSnapshot } from "../../../packages/hrx/src/postgres-store-v2.js";
import { createLocalStorageAdapter } from "../../../packages/dms/src/storage/local-storage-adapter.js";
import { createPostgresDmsUploadRuntime } from "../../../packages/dms/src/postgres-upload-runtime.js";
import { CORPORATE_WORKSPACE_ACTION, CORPORATE_WORKSPACE_VERSION, corporateWorkspaceApprovalScope,
  executeCorporateWorkspace, planCorporateWorkspace } from "../../../packages/dms/src/corporate-workspace-service.js";
import { CORPORATE_IMPORT_ACTION, CORPORATE_IMPORT_VERSION } from "../../../packages/master-data/src/corporate-import-service.js";
import { corporateImportApprovalScope, executeCorporateRecordImport, planCorporateRecordImport } from "../../../scripts/lib/corporate-record-import.mjs";
import { LAWOS_INTERNAL_PASSWORD_PROVIDER_ID, createScryptPasswordHash } from "../src/auth-credential-store.js";
import { createApiSessionAuth } from "../src/session-auth.js";
import { createPostgresSessionObjectAclResolver } from "../src/session-object-acl-authority.js";
import { createPostgresApiRuntimeAuthority } from "../src/postgres-api-runtime-authority.js";
import { createBankImportPreviewTokenAuthority } from "../src/bank-import-preview-token.js";
import { createApiServer } from "../src/server.js";

const TENANT = "tenant-corporate-warm-api-test";
const OWNER = "user-corporate-warm-owner";
const READER = "user-corporate-warm-reader";
const OTHER = "user-corporate-warm-other";
const NOW = Date.parse("2026-09-05T08:00:00.000Z");
const clock = () => new Date(NOW);
const SOURCE_SHA = "a".repeat(40);
const SOURCE_TREE = "b".repeat(40);
const SECRET = "synthetic-corporate-warm-session-secret-32-bytes";
const PASSWORD = "synthetic-corporate-warm-password";
const BYTES = Buffer.from("Synthetic private corporate registration source.");
const digest = (value) => createHash("sha256").update(value).digest("hex");
const WORKSPACE = { workspace_id: "workspace-corporate-warm", name: "Synthetic corporate workspace",
  legal_entity_id: "entity-corporate-warm", organization_id: "organization-corporate-warm",
  party_id: "party-corporate-warm", owner_user_id: OWNER, permission_ref: "permission-corporate-warm",
  permission_envelope_id: "envelope-corporate-warm", audit_trace_id: "audit-corporate-warm" };
const SOURCE = { source_id: "source-corporate-warm", legal_entity_id: WORKSPACE.legal_entity_id,
  document_id: "document-corporate-warm", version_id: "version-corporate-warm",
  file_object_id: "file:version-corporate-warm", object_id: "object-corporate-warm",
  sha256: digest(BYTES), byte_size: BYTES.length, content_type: "text/plain", page_count: 1,
  scope_type: "legal_entity_administration" };

function approvalSigner() {
  const keys = generateKeyPairSync("ed25519");
  const registryBytes = Buffer.from(JSON.stringify({ schema_version: "law-firm-os.runtime-safety.approval-trust-registry.v1",
    generated_at: "2026-09-05T00:00:00.000Z", keys: [{ key_id: "synthetic-warm-owner", algorithm: "Ed25519",
      public_key_spki_pem: keys.publicKey.export({ type: "spki", format: "pem" }), roles: ["owner"],
      actions: [CORPORATE_WORKSPACE_ACTION, CORPORATE_IMPORT_ACTION], environments: ["synthetic-test"],
      valid_from: "2026-09-01T00:00:00.000Z", valid_until: "2026-10-01T00:00:00.000Z", revoked_at: null }] }));
  return (pool, manifest, plan) => {
    const receipt = { schema_version: "law-firm-os.runtime-safety.approval.v1", approval_id: `warm-${plan.packet_sha256}`,
      key_id: "synthetic-warm-owner", role: "owner", decision: "approved", packet_sha256: plan.packet_sha256,
      source_sha: plan.source_sha, source_tree: plan.source_tree, action: plan.action, environment: plan.environment,
      signed_at: "2026-09-05T07:00:00.000Z", expires_at: "2026-09-05T09:00:00.000Z", contact_scope: [],
      data_scope: plan.action === CORPORATE_WORKSPACE_ACTION ? corporateWorkspaceApprovalScope(plan) : corporateImportApprovalScope(plan) };
    return { pool, manifest, plan, sourceSha: SOURCE_SHA, sourceTree: SOURCE_TREE, clock,
      expectedRegistrySha256: digest(registryBytes), approval: { registryBytes, registrySha256: digest(registryBytes),
        receiptBytes: Buffer.from(JSON.stringify(receipt)), signatureBytes: sign(null, Buffer.from(canonicalizeJson(receipt)), keys.privateKey) } };
  };
}

test("workspace snapshots preserve only canonical external references and reject conflicting materialized sources", async (t) => {
  const payload = createDmsWorkspace({ ...WORKSPACE, tenant_id: TENANT, matter_id: null,
    scope_type: "legal_entity_administration", synthetic_only: false, status: "active" });
  const repositories = [];
  t.after(() => repositories.forEach((repository) => repository.close()));
  const snapshot = (sources) => createRecordRepositoryDomainSnapshot({
    descriptor: DMS_AUXILIARY_DOMAIN_DESCRIPTOR, repositories: sources, tenant_id: TENANT }).snapshot;
  const fresh = createDmsAuxiliaryRepository({ seedRecords: [payload], preserveSeedRecords: true });
  repositories.push(fresh);
  assert.equal(snapshot(fresh).records[0].references.length, 0, "a descriptor cannot invent foreign-key authority");
  const materialize = async (references) => {
    const repository = await materializeRecordRepositoryFromDomainLedger({ tenant_id: TENANT,
      descriptor: DMS_AUXILIARY_DOMAIN_DESCRIPTOR, create_repository: createDmsAuxiliaryRepository,
      ledger: { list: async () => [{ tenant_id: TENANT, domain_id: "dms-auxiliary", record_type: "DmsWorkspace",
        record_id: WORKSPACE.workspace_id, payload, references }], listAudit: async () => [], listIdempotency: async () => [] } });
    repositories.push(repository);
    return repository;
  };
  const canonical = await materialize([{ reference_name: "legal_entity", target_domain_id: "master-data",
    target_record_type: "Entity", target_record_id: WORKSPACE.legal_entity_id }]);
  assert.equal(snapshot(canonical).records[0].references.length, 1);
  const divergent = await materialize([]);
  for (const sources of [[canonical, divergent], [divergent, canonical]]) {
    assert.throws(() => snapshot(sources.map((repository, index) => ({ source_id: `source-${index}`, repository }))),
      { code: "LAWOS_DOMAIN_SOURCE_CONFLICT" });
  }
});

test("the same PostgreSQL HTTP server and signed bearers observe external workspace activation, ACL revocation and hold", async (t) => {
  let externalPool;
  let server;
  t.after(async () => {
    if (server) await new Promise((resolve) => {
      server.close(resolve);
      server.closeAllConnections();
    });
    await externalPool?.end();
  });
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const externalUrl = new URL(fixture.instance.connection_string);
  externalUrl.username = "lawos_app";
  externalPool = createPostgresPool({ connectionString: externalUrl.toString(), sslMode: "disable",
    allowInsecureLocal: true, applicationName: "corporate-warm-independent-writer", tenantContextSecret: fixture.tenantContextSecret });
  const ledger = createPostgresDomainLedger({ pool: fixture.appPool, clock });
  const externalLedger = createPostgresDomainLedger({ pool: externalPool, clock });
  const identity = createPostgresIdentityLedger({ pool: fixture.appPool, clock });
  for (const userId of [OWNER, READER, OTHER]) {
    const user = { user_id: userId, email: `${userId}@example.test`, display_name: userId, status: "active" };
    await identity.provisionDirectoryUser({ tenant_id: TENANT, user, actor_id: "synthetic-fixture-provisioner",
      membership: { status: "active", role_ids: ["lawos_staff"], group_ids: [], scopes: ["vault.read"], hrx_scopes: [], source_ref: "synthetic-warm-api-test" } });
    await identity.setCredential({ tenant_id: TENANT, user, provider_id: LAWOS_INTERNAL_PASSWORD_PROVIDER_ID,
      password_hash: createScryptPasswordHash(PASSWORD), status: "active", actor_id: userId });
  }
  const hrx = createFileHrxStore();
  try {
    runHrxMigrations(hrx);
    await ledger.importSnapshot(createHrxDomainSnapshot({ store: hrx, tenant_id: TENANT }).snapshot);
  } finally { hrx.close(); }
  const signPlan = approvalSigner();
  const pendingManifest = { schema_version: CORPORATE_WORKSPACE_VERSION, operation: "create", environment: "synthetic-test",
    source_sha: SOURCE_SHA, source_tree: SOURCE_TREE, mapping_sha256: "c".repeat(64), tenant_id: TENANT, actor_id: OWNER,
    workspace: WORKSPACE, before_payload_sha256: null };
  const pendingPlan = await planCorporateWorkspace({ pool: externalPool, manifest: pendingManifest });
  assert.equal((await executeCorporateWorkspace(signPlan(externalPool, pendingManifest, pendingPlan))).outcome, "PASS");
  const workspaceScope = { tenant_id: TENANT, domain_id: "dms-auxiliary", record_type: "DmsWorkspace", record_id: WORKSPACE.workspace_id };
  const baseStorage = createLocalStorageAdapter({ adapter_id: "corporate-warm-api-storage" });
  let providerReads = 0;
  const storage = { ...baseStorage, async getObject(input) { providerReads += 1; return baseStorage.getObject(input); } };
  const uploadRuntime = createPostgresDmsUploadRuntime({ pool: fixture.appPool, storage, sourceOnly: false, clock });
  const externalUpload = createPostgresDmsUploadRuntime({ pool: externalPool, storage, sourceOnly: false, clock });
  await externalUpload.uploadDocument({ document: { tenant_id: TENANT, document_id: SOURCE.document_id,
    current_version_id: SOURCE.version_id, workspace_id: WORKSPACE.workspace_id, matter_id: null,
    permission_envelope_id: WORKSPACE.permission_envelope_id, audit_trace_id: "audit-corporate-warm-document",
    title: "Synthetic private registration source", mime_type: SOURCE.content_type }, bytes: BYTES, actor_id: OWNER,
    idempotency_key: "corporate-warm-source", session_id: "session-corporate-warm", object_id: SOURCE.object_id });
  const sessionAuth = createApiSessionAuth({ profile: "operational", trustedTenantId: TENANT, secret: SECRET,
    identityRepository: identity, now: () => NOW, objectAclResolver: createPostgresSessionObjectAclResolver({ ledger }) });
  const authority = createPostgresApiRuntimeAuthority({ ledger, identityRepository: identity, dmsStorage: storage,
    dmsUploadRuntime: uploadRuntime, payrollArtifactSecret: SECRET,
    bankImportPreviewTokens: createBankImportPreviewTokenAuthority({ secret: SECRET }) });
  server = createApiServer({ sessionAuth, requestRuntimeAuthority: authority, persistenceAuthority: "postgres-v2",
    runtimeProfile: "operational", stepUpAuthority: {}, hrxRuntime: null, masterDataRuntime: null, matterRuntime: null,
    dmsRuntime: null, emailDmsRuntime: null, crmIntakeRuntime: null, financeRuntime: null, analyticsRuntime: null,
    aiRuntime: null, portalRuntime: null, uiReadinessRuntime: null, homeDashboardRuntime: null, enterpriseReadinessRuntime: null });
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const bearers = new Map();
  for (const userId of [OWNER, READER, OTHER]) {
    const response = await fetch(`${baseUrl}/api/auth/login`, { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: `${userId}@example.test`, password: PASSWORD }) });
    const body = await response.json();
    assert.equal(response.status, 200, JSON.stringify(body));
    bearers.set(userId, `Bearer ${body.session_token}`);
  }
  const query = new URLSearchParams({ tenant_id: TENANT, permission_ref: WORKSPACE.permission_ref, audit_hint_ref: "audit-warm-api" });
  const request = async (userId, path) => {
    const response = await fetch(`${baseUrl}${path}?${query}`, { headers: { authorization: bearers.get(userId) } });
    return { status: response.status, body: await response.json() };
  };
  const assertAccess = async (userId, allowed) => {
    const readsBefore = providerReads;
    for (const path of ["/api/vault/documents", "/api/vault/search"]) {
      const result = await request(userId, path);
      assert.equal(result.status, 200, JSON.stringify(result.body));
      assert.deepEqual(result.body.items.map((item) => item.document_id), allowed ? [SOURCE.document_id] : []);
      assert.equal(result.body.page_info.returned_count, allowed ? 1 : 0);
    }
    const download = await request(userId, `/api/vault/documents/${SOURCE.document_id}/download`);
    assert.equal(download.status, allowed ? 200 : 403, JSON.stringify(download.body));
    if (allowed) {
      assert.deepEqual(Buffer.from(download.body.download.content_base64, "base64"), BYTES);
      assert.ok(providerReads > readsBefore);
    } else { assert.equal(providerReads, readsBefore, "a denied request must never read provider bytes"); }
  };
  for (const userId of [OWNER, READER, OTHER]) await assertAccess(userId, false);
  assert.equal((await externalLedger.read(workspaceScope)).payload_hash, pendingPlan.after_payload_sha256);

  const operations = [
    ["Entity", WORKSPACE.legal_entity_id, { entity_kind: "organization", display_name: "Synthetic warm entity" }],
    ["Party", WORKSPACE.party_id, { party_type: "organization", display_name: "Synthetic warm party", canonical_entity_id: WORKSPACE.legal_entity_id }],
    ["Organization", WORKSPACE.organization_id, { display_name: "Synthetic warm organization", entity_id: WORKSPACE.legal_entity_id,
      party_id: WORKSPACE.party_id, registration_number: "synthetic-warm-registration" }],
  ].map(([model_type, record_id, values]) => ({ model_type, record_id, values, legal_entity_id: WORKSPACE.legal_entity_id,
    before_payload_sha256: null, expected_values: {}, evidence: [{ source_id: SOURCE.source_id, page: 1, fields: Object.keys(values) }] }));
  const importManifest = { schema_version: CORPORATE_IMPORT_VERSION, tenant_id: TENANT, actor_id: OWNER,
    environment: "synthetic-test", source_sha: SOURCE_SHA, source_tree: SOURCE_TREE, documents: [SOURCE], operations,
    bindings: [{ ...WORKSPACE, matter_id: null, record_matter_id: null, scope_type: "legal_entity_administration" }] };
  const importPlan = await planCorporateRecordImport({ pool: externalPool, manifest: importManifest });
  assert.equal((await executeCorporateRecordImport(signPlan(externalPool, importManifest, importPlan))).outcome, "PASS");
  const anchors = await externalLedger.list({ tenant_id: TENANT, domain_id: "master-data" });
  const activation = { ...pendingManifest, operation: "activate", before_payload_sha256: pendingPlan.after_payload_sha256,
    corporate_import_manifest_sha256: importPlan.manifest_sha256, corporate_import_plan_sha256: importPlan.packet_sha256,
    field_evidence_sha256: importPlan.field_evidence_sha256, documents: [SOURCE],
    anchor_payload_sha256: Object.fromEntries(anchors.map((row) => [row.record_type, row.payload_hash])) };
  const activationPlan = await planCorporateWorkspace({ pool: externalPool, manifest: activation });
  assert.equal((await executeCorporateWorkspace(signPlan(externalPool, activation, activationPlan))).outcome, "PASS");
  const activated = await externalLedger.read(workspaceScope);
  assert.equal(activated.references.length, 3);
  await assertAccess(OWNER, true);
  await assertAccess(READER, false);
  await assertAccess(OTHER, false);

  const aclScope = { tenant_id: TENANT, domain_id: "authz", record_type: "ObjectAcl", record_id: "acl-corporate-warm-reader" };
  const acl = { acl_id: aclScope.record_id, tenant_id: TENANT, principal_id: READER,
    resource_type: "DmsWorkspace", resource_id: WORKSPACE.workspace_id, effect: "allow", action: "*" };
  await externalLedger.write({ ...aclScope, expected_version: 0, payload: acl });
  await assertAccess(READER, true);
  await assertAccess(OTHER, false);
  await externalLedger.write({ ...aclScope, expected_version: 1, payload: { ...acl, effect: "deny" } });
  await assertAccess(READER, false);
  await assertAccess(OWNER, true);

  const active = await externalLedger.read(workspaceScope);
  assert.deepEqual(active, activated, "warm read requests must preserve approved workspace bytes, version and anchor references");
  await assert.rejects(externalLedger.write({ ...workspaceScope, expected_version: active.state_version,
    payload: { ...active.payload, owner_user_id: OTHER }, unique_key: active.unique_key }), { postgres_code: "55000" });
  await externalLedger.write({ ...workspaceScope, expected_version: active.state_version,
    payload: { ...active.payload, status: "held" }, unique_key: active.unique_key });
  for (const userId of [OWNER, READER, OTHER]) await assertAccess(userId, false);
  assert.deepEqual((await externalLedger.read(workspaceScope)).references, activated.references);
  for (const [recordType, recordId] of [["Entity", WORKSPACE.legal_entity_id], ["Party", WORKSPACE.party_id],
    ["Organization", WORKSPACE.organization_id]]) {
    await assert.rejects(fixture.adminPool.query(
      "DELETE FROM lawos_domain.records WHERE tenant_id=$1 AND domain_id='master-data' AND record_type=$2 AND record_id=$3",
      [TENANT, recordType, recordId]), { code: "23503" });
  }
  const preserved = await externalUpload.getDocumentState({ tenant_id: TENANT, document_id: SOURCE.document_id });
  assert.equal(preserved.document.current_version_id, SOURCE.version_id);
  assert.equal(preserved.file_objects[0].status, "committed");
  assert.equal(baseStorage.statObject({ tenant_id: TENANT, object_id: SOURCE.object_id }).sha256, SOURCE.sha256);
});
