import assert from "node:assert/strict";
import test from "node:test";
import { evaluateVaultCorporatePermission } from "../src/vault-corporate-permission.js";
import { handleVaultDmsApiRequest } from "../src/vault-dms-runtime-context.js";
import { createMigratedPostgresFixture } from "../../../packages/persistence/test/helpers/disposable-postgres.js";
import { withPostgresTransaction } from "../../../packages/persistence/src/postgres/transaction.js";
import { createPostgresDomainLedger } from "../../../packages/persistence/src/postgres/domain-ledger.js";
import { hashDomainValue } from "../../../packages/persistence/src/domain-ledger.js";
import { createPostgresDmsUploadRuntime } from "../../../packages/dms/src/postgres-upload-runtime.js";
import { createLocalStorageAdapter } from "../../../packages/dms/src/storage/local-storage-adapter.js";
import { createDmsWorkspace } from "../../../packages/dms/src/model.js";
import { createMasterDataRecord } from "../../../packages/master-data/src/model.js";
import { createMasterDataRepository } from "../../../packages/master-data/src/repository.js";
import { MASTER_DATA_DOMAIN_DESCRIPTOR, MASTER_DATA_PRIMARY_ID_FIELDS } from "../../../packages/master-data/src/central-ledger.js";
import { createRecordRepositoryDomainSnapshot } from "../../../packages/persistence/src/record-domain-adapter.js";
import { createPostgresSessionObjectAclResolver } from "../src/session-object-acl-authority.js";
import { createPostgresApiRuntimeAuthority } from "../src/postgres-api-runtime-authority.js";
import { handleRecordsSearch } from "../src/master-data-context.js";

const TENANT = "tenant-corporate-guard";
const OWNER = "user-corporate-owner";
const READER = "user-corporate-reader";
const WORKSPACE = "workspace-corporate";
const DOCUMENT = "document-corporate";
const PERMISSION = "permission-corporate";
const query = { tenant_id: TENANT, permission_ref: PERMISSION, audit_hint_ref: "audit-corporate" };

function context(userId = READER, acl = [], overrides = {}) {
  return {
    principal: { tenant_id: TENANT, user_id: userId, actor_id: userId, email: "synthetic@example.test", directory_source: "postgres-v2" },
    rules: [{ id: "broad-vault", effect: "allow", action: "*" }],
    object_acl: acl,
    object_acl_authority: { status: "authoritative", source_ref: "postgres-v2:lawos_domain.authz/ObjectAcl" },
    ...overrides,
  };
}

function acl(resourceId = WORKSPACE, effect = "allow", overrides = {}) {
  return { id: `acl-${resourceId}-${effect}`, tenant_id: TENANT, resource_id: resourceId,
    principal_id: READER, effect, action: "*", ...overrides };
}

function target({ status = "active", workspacePatch = {}, documentPatch = {} } = {}) {
  const workspace = { model_type: "DmsWorkspace", workspace_id: WORKSPACE, tenant_id: TENANT,
    matter_id: null, scope_type: "legal_entity_administration", legal_entity_id: "entity-corporate",
    owner_user_id: OWNER, permission_envelope_id: PERMISSION, permission_ref: "permission-ref-corporate",
    organization_id: "organization-corporate", party_id: "party-corporate", synthetic_only: false,
    client_visible_by_default: false, audit_trace_id: "audit-corporate",
    status, ...workspacePatch };
  const document = { document_id: DOCUMENT, tenant_id: TENANT, workspace_id: WORKSPACE,
    matter_id: null, permission_envelope_id: PERMISSION, title: "Private corporate source",
    status: "active", current_version_id: "version-corporate", updated_at: "2026-09-05T00:00:00.000Z", ...documentPatch };
  const matterDocument = { ...document, document_id: "document-matter", workspace_id: "workspace-matter", matter_id: "matter-ordinary", title: "Ordinary matter source" };
  const entry = (doc) => ({ document: doc, version: { version_id: doc.current_version_id, created_by: OWNER, sha256: "a".repeat(64) }, file_object: { file_object_id: "file-corporate", byte_size: 1, content_type: "text/plain" } });
  let storageReads = 0;
  let mutations = 0;
  const runtime = {
    authority: "postgres-v2",
    repository: { get: ({ model_type, workspace_id }) => model_type === "DmsWorkspace" && workspace_id === WORKSPACE ? workspace : null, appendAudit: () => null },
    upload_runtime: {
      source_only: false, finalizeUpload() {},
      async getDocumentState({ document_id }) { return { document: document_id === DOCUMENT ? document : matterDocument }; },
      async listDocuments() { return [entry(document), entry(matterDocument)]; },
      async downloadDocument() { storageReads += 1; return { document, version: entry(document).version,
        file_object: { file_object_id: "file-corporate", sha256: "a".repeat(64), byte_size: 1, content_type: "text/plain", status: "committed" },
        bytes: Buffer.from("x"), sha256: "a".repeat(64), byte_size: 1, mime_type: "text/plain", audit_event_id: "audit-download" }; },
      async getGovernanceAuthorizationResource() { return { tenant_id: TENANT, document_id: DOCUMENT, matter_id: null }; },
      async placeLegalHold() { mutations += 1; return {}; },
      async setRetentionPolicy() { mutations += 1; return {}; },
      async assertCommittedObjectDeleteAllowed() { mutations += 1; return {}; },
      async requestCommittedObjectDelete() { mutations += 1; return {}; },
      async uploadDocument({ document: uploaded }) { mutations += 1; return entry(uploaded); },
      async listAuditEvents() { return [
        { event_id: "event-corporate", object_type: "DmsUploadSession", object_id: "session-corporate", matter_id: null, authorization_document_id: DOCUMENT, authorization_workspace_id: WORKSPACE },
        { event_id: "event-unattributed", object_type: "DmsDocumentCollection", object_id: "vault-documents", matter_id: null, payload: { returned_count: 2 } },
        { event_id: "event-matter", object_type: "DmsDocument", object_id: matterDocument.document_id, matter_id: matterDocument.matter_id },
      ]; },
    },
    precedent_search_runtime: { repository: {
      async classifyDocumentPrivilege() { mutations += 1; return {}; },
      async registerSource() { mutations += 1; return { source: {} }; },
      async disableSource() { mutations += 1; return { source: {} }; },
      async unapproveSource() { mutations += 1; return { source: {} }; },
      async readiness() { return { runtime_ready: true }; },
      async listSourceDescriptors() { return [{ source_id: "source-corporate", document_id: DOCUMENT }]; },
    } },
  };
  return { runtime, document, workspace, storageReads: () => storageReads, mutations: () => mutations };
}

async function request(target, path, ctx, method = "GET", body = {}) {
  if (target.authority) {
    return target.authority.run({ tenant_id: TENANT, request_context: { method, pathname: path },
      command: ({ dmsRuntime }) => request({ runtime: dmsRuntime }, path, ctx, method, body) });
  }
  return handleVaultDmsApiRequest({ pathname: path, method, query, body: { ...query, ...body }, context: ctx, requestId: "request-corporate", runtime: target.runtime });
}

test("broad Vault permission hides private documents and audit counts while ordinary Matter results remain", async () => {
  const runtime = target();
  for (const path of ["/api/vault/documents", "/api/vault/search"]) {
    const result = await request(runtime, path, context());
    assert.equal(result.status, 200);
    assert.deepEqual(result.body.items.map((item) => item.document_id), ["document-matter"]);
    assert.equal(result.body.page_info.returned_count, 1);
    assert.equal(result.body.page_info[Object.hasOwn(result.body.page_info, "omitted_document_count")
      ? "omitted_document_count" : "omitted_result_count"], null);
  }
  const audit = await request(runtime, "/api/vault/audit", context());
  assert.deepEqual(audit.body.items.map((item) => item.event_id), ["event-matter"]);
  const download = await request(runtime, `/api/vault/documents/${DOCUMENT}/download`, context());
  assert.equal(download.status, 403);
  assert.equal(runtime.storageReads(), 0);
});

test("own aggregate read audits remain visible with object references and counts removed", async () => {
  const observed = target();
  const ownRead = { event_id: "vault_sensitive_read_16d80f4a-94c9-44c2-bbe5-efc1cd34b3af",
    tenant_id: TENANT, actor_id: READER, action: "dms:search", object_type: "vault_search",
    object_id: "vault_search", decision: "allow", occurred_at: "2026-09-05T00:00:00.000Z",
    metadata: { sensitive_read_audit_required: true, returned_count: 123,
      audit_hint_ref: DOCUMENT, permission_ref: WORKSPACE },
    payload: { corporate_document_id: DOCUMENT }, extra_object_ref: WORKSPACE };
  observed.runtime.upload_runtime.listAuditEvents = async () => [
    ownRead, { ...ownRead, actor_id: OWNER }, { ...ownRead, tenant_id: "other-tenant" },
    { ...ownRead, object_id: DOCUMENT },
    { ...ownRead, authorization_document_id: DOCUMENT, authorization_workspace_id: WORKSPACE },
  ];
  const result = await request(observed, "/api/vault/audit", context());
  assert.equal(result.status, 200);
  assert.equal(result.body.items.length, 1);
  const [event] = result.body.items;
  assert.equal(event.action, "dms:search");
  assert.equal(event.metadata.sensitive_read_audit_required, true);
  assert.equal(event.metadata.returned_count, null);
  assert.equal(event.metadata.audit_hint_ref, null);
  assert.equal(event.metadata.permission_ref, null);
  assert.equal(JSON.stringify(event).includes(DOCUMENT), false);
  assert.equal(JSON.stringify(event).includes(WORKSPACE), false);
  assert.equal(JSON.stringify(event).includes("123"), false);
});

test("active owner and exact authoritative workspace/document grants can read; unrelated ACL cannot", async () => {
  for (const ctx of [context(OWNER), context(READER, [acl()]), context(READER, [acl(DOCUMENT)])]) {
    const runtime = target();
    assert.equal((await request(runtime, `/api/vault/documents/${DOCUMENT}/download`, ctx)).status, 200);
    assert.equal(runtime.storageReads(), 1);
  }
  for (const grant of [acl("another-workspace"), acl(undefined, "allow", { resource_id: undefined }),
    acl(WORKSPACE, "allow", { tenant_id: "another-tenant" }), acl(WORKSPACE, "allow", { resource_type: "Matter" }),
    acl(WORKSPACE, "allow", { principal_id: "another-user" })]) {
    const runtime = target();
    assert.equal((await request(runtime, `/api/vault/documents/${DOCUMENT}/download`, context(READER, [grant]))).status, 403);
    assert.equal(runtime.storageReads(), 0);
  }
});

test("workspace/document deny wins over owner and grant; unrelated deny does not become global", async () => {
  const runtime = target();
  for (const ctx of [context(OWNER, [acl(WORKSPACE, "deny", { principal_id: OWNER })]),
    context(READER, [acl(), acl(DOCUMENT, "deny")])]) {
    assert.equal((await request(runtime, `/api/vault/documents/${DOCUMENT}/download`, ctx)).status, 403);
  }
  const exact = context(READER, [acl(), acl("another-document", "deny")]);
  assert.equal((await request(runtime, `/api/vault/documents/${DOCUMENT}/download`, exact)).status, 200);
  assert.equal((await request(runtime, "/api/vault/documents", exact)).body.items.length, 2);
});

test("pending workspace is hidden from owner across every local Vault public operation", async () => {
  const runtime = target({ status: "pending_anchor", workspacePatch: { legal_entity_id: null } });
  for (const path of ["/api/vault/documents", "/api/vault/search", "/api/vault/audit"]) {
    const response = await request(runtime, path, context(OWNER));
    assert.equal(response.status, 200);
    assert.equal(response.body.items.some((item) => item.document_id === DOCUMENT || item.event_id === "event-corporate"), false);
  }
  for (const suffix of ["download", "legal-holds", "retention-policies", "delete-check", "permanent-delete", "privilege-label"]) {
    const response = await request(runtime, `/api/vault/documents/${DOCUMENT}/${suffix}`, context(OWNER), suffix === "download" ? "GET" : "POST");
    assert.equal(response.status, 403, suffix);
  }
  for (const suffix of ["disable", "unapprove"]) {
    assert.equal((await request(runtime, `/api/vault/precedent-sources/source-corporate/${suffix}`, context(OWNER), "POST")).status, 403);
  }
  assert.equal((await request(runtime, "/api/vault/precedent-sources", context(OWNER), "POST", {
    source_id: "source-corporate", document_id: DOCUMENT, matter_id: "forged-matter",
  })).status, 403);
  assert.equal((await request(runtime, "/api/vault/documents", context(OWNER), "POST", { document: runtime.document, content_text: "x" })).status, 403);
  assert.equal(runtime.storageReads(), 0);
  assert.equal(runtime.mutations(), 0);
});

test("null-Matter missing workspace, anchor mismatch, unavailable ACL authority and forged upload authority fail closed", async () => {
  for (const options of [
    { documentPatch: { workspace_id: "missing-workspace" } },
    { workspacePatch: { legal_entity_id: null } },
    { documentPatch: { matter_id: "forged-matter" } },
    { documentPatch: { permission_envelope_id: "wrong-envelope" } },
  ]) {
    const runtime = target(options);
    assert.equal((await request(runtime, `/api/vault/documents/${DOCUMENT}/download`, context(OWNER))).status, 403);
  }
  const runtime = target();
  assert.equal((await request(runtime, `/api/vault/documents/${DOCUMENT}/download`, context(OWNER, [], { object_acl_authority: { status: "unavailable" } }))).status, 403);
  for (const forged of [{ scope_type: "matter" }, { legal_entity_id: "forged-entity" }, { owner_user_id: READER }, { matter_id: "forged-matter" }]) {
    assert.equal((await request(runtime, "/api/vault/documents", context(OWNER), "POST", { document: { ...runtime.document, ...forged }, content_text: "x" })).status, 403);
  }
  assert.equal(runtime.mutations(), 0);
});

test("corporate guard preserves deny/review precedence and requires the original action permission", () => {
  const runtime = target();
  for (const rules of [[], [{ id: "deny", effect: "deny", action: "*" }], [{ id: "review", effect: "review_required", action: "*" }]]) {
    const decision = evaluateVaultCorporatePermission({ context: context(OWNER, [], { rules }),
      repository: runtime.runtime.repository, document: runtime.document, tenantId: TENANT, action: "dms:document:download" });
    assert.notEqual(decision.effect, "allow");
  }
  assert.equal(evaluateVaultCorporatePermission({ context: context(READER, [acl()], { rules: [] }),
    repository: runtime.runtime.repository, document: runtime.document, tenantId: TENANT, action: "dms:document:download" }).effect, "deny");
  for (const field of ["model_type", "workspace_id", "synthetic_only", "organization_id", "party_id", "permission_ref", "matter_id"]) {
    const invalid = target({ workspacePatch: { [field]: undefined } });
    assert.equal(evaluateVaultCorporatePermission({ context: context(OWNER), repository: invalid.runtime.repository,
      document: invalid.document, tenantId: TENANT, action: "dms:document:download" }).effect, "deny", field);
  }
});

test("missing canonical document readback cannot fall back to broad authorization", async () => {
  const runtime = target();
  runtime.runtime.upload_runtime.getDocumentState = async () => null;
  for (const suffix of ["download", "legal-holds", "retention-policies", "delete-check", "permanent-delete", "privilege-label"]) {
    assert.equal((await request(runtime, `/api/vault/documents/${DOCUMENT}/${suffix}`, context(OWNER), suffix === "download" ? "GET" : "POST")).status, 403);
  }
  assert.equal((await request(runtime, "/api/vault/precedent-sources/source-corporate/disable", context(OWNER), "POST")).status, 403);
  const audit = await request(runtime, "/api/vault/audit", context(OWNER));
  assert.equal(audit.body.items.length, 0);
  assert.equal(runtime.mutations(), 0);
  assert.equal(runtime.storageReads(), 0);
});

test("bounded PostgreSQL corporate reads preserve pending visibility and canonical ObjectAcl with one connection", async (t) => {
  const fixture = await createMigratedPostgresFixture(t, { appPoolMax: 1 });
  if (!fixture) return;
  const tx = (callback) => withPostgresTransaction(fixture.appPool, { tenant_id: TENANT }, callback);
  let workspace = createDmsWorkspace({ ...target().workspace, status: "pending_anchor", name: "Synthetic corporate source workspace" });
  await tx((client) => client.query(`INSERT INTO lawos_domain.records
    (tenant_id,domain_id,record_type,record_id,state_version,payload,payload_hash,unique_key)
    VALUES ($1,'dms-auxiliary','DmsWorkspace',$2,1,$3::jsonb,$4,$5)`,
  [TENANT, WORKSPACE, JSON.stringify(workspace), hashDomainValue(workspace), `legal-entity-administration:${workspace.legal_entity_id}`]));
  const storage = createLocalStorageAdapter({ adapter_id: "corporate-api-postgres-test" });
  let providerReads = 0;
  const uploadRuntime = createPostgresDmsUploadRuntime({ pool: fixture.appPool, sourceOnly: false,
    clock: () => new Date("2026-09-05T08:00:00.000Z"),
    storage: { ...storage, async getObject(input) { providerReads += 1; return storage.getObject(input); } },
  });
  await uploadRuntime.uploadDocument({ document: { ...target().document, owner_user_id: OWNER, audit_trace_id: "audit-corporate", mime_type: "text/plain" },
    bytes: Buffer.from("private synthetic corporate body"), actor_id: OWNER, session_id: "session-corporate-api-pg",
    object_id: "object-corporate-api-pg", idempotency_key: "idempotency-corporate-api-pg", expires_at: "2026-09-05T08:15:00.000Z" });
  const ledger = createPostgresDomainLedger({ pool: fixture.appPool });
  const domainCalls = [];
  let expectFullRuntime = false;
  const authority = createPostgresApiRuntimeAuthority({
    ledger: { ...ledger, transactionMany(input, callback) {
      domainCalls.push(input.domain_ids);
      if (expectFullRuntime) {
        assert.ok(input.domain_ids.includes("hrx"));
        throw new Error("synthetic full runtime boundary reached");
      }
      assert.deepEqual(input.domain_ids, ["master-data", "dms-auxiliary"]);
      return ledger.transactionMany(input, callback);
    } },
    dmsStorage: storage, dmsUploadRuntime: uploadRuntime,
    payrollArtifactSecret: "synthetic-corporate-read-payroll-unused-secret",
    bankImportPreviewTokens: { issue() { assert.fail("read must not issue a bank token"); }, verify() { assert.fail("read must not verify a bank token"); } },
    identityRepository: { listDirectoryUsers() {
      if (expectFullRuntime) return [];
      assert.fail("corporate reads must not materialize the employee directory");
    } },
  });
  const observed = { authority };
  const before = providerReads;
  for (const path of ["/api/vault/documents", "/api/vault/search", "/api/vault/audit"]) {
    const response = await request(observed, path, context(OWNER));
    assert.equal(response.status, 200);
    assert.deepEqual(response.body.items, []);
  }
  assert.equal((await request(observed, `/api/vault/documents/${DOCUMENT}/download`, context(OWNER))).status, 403);
  assert.equal(providerReads, before);
  const anchors = createMasterDataRepository({ seedRecords: [
      ["Entity", workspace.legal_entity_id, { entity_kind: "organization" }],
      ["Party", workspace.party_id, { party_type: "organization", canonical_entity_id: workspace.legal_entity_id }],
      ["Organization", workspace.organization_id, { entity_id: workspace.legal_entity_id, party_id: workspace.party_id }],
      ["PartyIdentifier", "identifier-corporate", { party_id: workspace.party_id, identifier_type: "registration_id", identifier_value: "SYNTHETIC-REGISTRY-ID" }],
      ["PartyAlias", "alias-corporate", { party_id: workspace.party_id, alias_type: "legal_name", alias_value: "Synthetic alternate entity name" }],
    ].map(([type, id, fields]) => createMasterDataRecord(type, { tenant_id: TENANT, owner_user_id: OWNER,
        [MASTER_DATA_PRIMARY_ID_FIELDS[type]]: id,
        display_name: "Synthetic corporate entity", synthetic_only: false,
        permission_ref: workspace.permission_ref, matter_id: null, status: "active", ...fields })),
  });
  try {
    await ledger.importSnapshot(createRecordRepositoryDomainSnapshot({
      descriptor: MASTER_DATA_DOMAIN_DESCRIPTOR, tenant_id: TENANT,
      repositories: [{ source_id: "synthetic-corporate-anchors", repository: anchors }],
    }).snapshot);
  } finally { anchors.close(); }
  workspace = { ...workspace, status: "active" };
  await tx((client) => client.query(`UPDATE lawos_domain.records SET payload=$3::jsonb,payload_hash=$4,state_version=2
    WHERE tenant_id=$1 AND domain_id='dms-auxiliary' AND record_type='DmsWorkspace' AND record_id=$2`,
  [TENANT, WORKSPACE, JSON.stringify(workspace), hashDomainValue(workspace)]));
  workspace = (await tx((client) => client.query(`SELECT payload FROM lawos_domain.records
    WHERE tenant_id=$1 AND domain_id='dms-auxiliary' AND record_type='DmsWorkspace' AND record_id=$2`, [TENANT, WORKSPACE]))).rows[0].payload;
  const recordsBeforeReads = await ledger.list({ tenant_id: TENANT, domain_id: "master-data" });
  assert.equal((await request(observed, "/api/vault/documents", context())).body.items.length, 0);
  assert.equal((await request(observed, "/api/vault/documents", context(OWNER))).body.items.length, 1);
  await ledger.write({ tenant_id: TENANT, domain_id: "authz", record_type: "ObjectAcl", record_id: "acl-corporate-api-pg",
    expected_version: 0, payload: { ...acl(), acl_id: "acl-corporate-api-pg", resource_type: "DmsWorkspace" } });
  const resolved = await createPostgresSessionObjectAclResolver({ ledger })({ tenant_id: TENANT, user_id: READER });
  const granted = context(READER, resolved.object_acl, { object_acl_authority: { status: resolved.authoritative ? "authoritative" : "unavailable", source_ref: resolved.source_ref } });
  const downloaded = await request(observed, `/api/vault/documents/${DOCUMENT}/download`, granted);
  assert.equal(downloaded.status, 200);
  assert.equal(Buffer.from(downloaded.body.download.content_base64, "base64").toString(), "private synthetic corporate body");
  const audit = await request(observed, "/api/vault/audit", granted);
  assert.ok(audit.body.items.length > 0);
  assert.ok(audit.body.items.every((event) => !Object.hasOwn(event, "authorization_workspace_id") && !Object.hasOwn(event, "authorization_document_id")));
  assert.ok(audit.body.items.every((event) => event.payload?.returned_count == null));
  const master = await authority.run({ tenant_id: TENANT,
    request_context: { method: "GET", pathname: "/master-data/records" },
    command: ({ masterDataRuntime }) => handleRecordsSearch({ query, context: context(OWNER), requestId: "corporate-master-read", runtime: masterDataRuntime }) });
  assert.equal(master.status, 200);
  assert.ok(master.body.items.every((item) => item.matter_core_enrichment === null));
  assert.deepEqual(new Set(master.body.items.map((item) => item.resource_id)),
    new Set([workspace.legal_entity_id, workspace.party_id, workspace.organization_id, "identifier-corporate", "alias-corporate"]));
  const identifierDenied = await authority.run({ tenant_id: TENANT,
    request_context: { method: "GET", pathname: "/master-data/records" },
    command: ({ masterDataRuntime }) => handleRecordsSearch({ query,
      context: context(OWNER, [acl("identifier-corporate", "deny", { principal_id: OWNER })]),
      requestId: "corporate-master-denied", runtime: masterDataRuntime }) });
  assert.equal(identifierDenied.status, 403);
  assert.equal(identifierDenied.body.items.length, 0);
  assert.ok(identifierDenied.body.items.every((item) => item.resource_id !== "identifier-corporate"));
  assert.equal(JSON.stringify(identifierDenied.body).includes("SYNTHETIC-REGISTRY-ID"), false);
  assert.ok(domainCalls.length > 0);
  assert.deepEqual(await ledger.list({ tenant_id: TENANT, domain_id: "hrx" }), []);
  const deniedBefore = providerReads;
  const denied = await request(observed, `/api/vault/documents/${DOCUMENT}/download`,
    context(OWNER, [acl(WORKSPACE, "deny", { principal_id: OWNER })]));
  assert.equal(denied.status, 403);
  assert.equal(providerReads, deniedBefore);
  const denialAudit = await ledger.listAudit({ tenant_id: TENANT, domain_id: "dms-auxiliary" });
  assert.ok(denialAudit.some((event) => event.event_type === "dms:document:download" && event.actor_id === OWNER));
  for (const pathname of ["/master-data/records/", "/master-data/relationships", "/master-data/client-groups/unknown", "/api/vault/search/preferences"]) {
    let repository;
    await authority.run({ tenant_id: TENANT, request_context: { method: "GET", pathname },
      command(runtimes) {
        assert.deepEqual(Object.keys(runtimes).sort(), ["dmsRuntime", "masterDataRuntime"]);
        repository = runtimes.masterDataRuntime.repository;
        assert.deepEqual(repository.list({ tenant_id: "another-tenant" }), []);
      } });
    assert.throws(() => repository.list({ tenant_id: TENANT }), /closed/u);
  }
  expectFullRuntime = true;
  for (const [method, pathname] of [["POST", "/master-data/records"], ["POST", "/api/vault/documents"],
    ["GET", "/api/vault/documents/unknown"], ["GET", "/api/vault/documents/unknown/download/extra"]]) {
    await assert.rejects(authority.run({ tenant_id: TENANT, request_context: { method, pathname },
      command() { assert.fail("neighboring routes must use the full runtime"); } }), /synthetic full runtime boundary reached/u);
  }
  assert.deepEqual(await ledger.list({ tenant_id: TENANT, domain_id: "master-data" }), recordsBeforeReads);
});
