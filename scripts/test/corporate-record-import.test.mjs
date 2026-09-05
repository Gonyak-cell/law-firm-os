import assert from "node:assert/strict";
import { createHash, generateKeyPairSync, sign } from "node:crypto";
import test from "node:test";
import { canonicalizeJson } from "../../packages/runtime-auth/src/runtime-safety-approval-contract.js";
import { createMigratedPostgresFixture } from "../../packages/persistence/test/helpers/disposable-postgres.js";
import { createDomainSnapshot, hashDomainValue } from "../../packages/persistence/src/domain-ledger.js";
import { createPostgresDomainLedger } from "../../packages/persistence/src/postgres/domain-ledger.js";
import { createRecordRepositoryDomainSnapshot } from "../../packages/persistence/src/record-domain-adapter.js";
import { createMasterDataRepository } from "../../packages/master-data/src/repository.js";
import { MASTER_DATA_DOMAIN_DESCRIPTOR } from "../../packages/master-data/src/central-ledger.js";
import { CORPORATE_IMPORT_ACTION, CORPORATE_IMPORT_VERSION, prepareCorporateMasterDataImport } from "../../packages/master-data/src/corporate-import-service.js";
import { createPostgresDmsUploadRuntime } from "../../packages/dms/src/postgres-upload-runtime.js";
import { createLocalStorageAdapter } from "../../packages/dms/src/storage/local-storage-adapter.js";
import { corporateImportApprovalScope, executeCorporateRecordImport, planCorporateRecordImport } from "../lib/corporate-record-import.mjs";

const tenant = "tenant-corporate-synthetic";
const clock = () => new Date("2026-09-05T01:00:00.000Z");
const binding = { legal_entity_id: "entity-corporate", organization_id: "organization-corporate", party_id: "party-corporate",
  permission_ref: "permission-corporate-master", owner_user_id: "owner-corporate", matter_id: "matter-internal",
  record_matter_id: null, workspace_id: "workspace-internal", permission_envelope_id: "permission-internal-document" };
const common = { tenant_id: tenant, status: "active", synthetic_only: true, owner_user_id: binding.owner_user_id,
  matter_id: binding.record_matter_id, permission_ref: binding.permission_ref };
const bytes = Buffer.from("Synthetic registration source. Page one.");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
function fixture() {
  const repository = createMasterDataRepository({ seedRecords: [
    { ...common, model_type: "Entity", entity_id: binding.legal_entity_id, entity_kind: "organization", display_name: "Synthetic Corporation" },
    { ...common, model_type: "Party", party_id: binding.party_id, party_type: "organization", display_name: "Synthetic Corporation", canonical_entity_id: binding.legal_entity_id },
    { ...common, model_type: "Organization", organization_id: binding.organization_id, entity_id: binding.legal_entity_id,
      party_id: binding.party_id, display_name: "Synthetic Corporation", registration_number: "old-registration" },
    { ...common, model_type: "ClientGroup", client_group_id: "existing-client-group", display_name: "Existing Client Group" },
  ] });
  let before = createRecordRepositoryDomainSnapshot({ descriptor: MASTER_DATA_DOMAIN_DESCRIPTOR,
    repositories: [{ source_id: "synthetic-baseline", repository }], tenant_id: tenant }).snapshot;
  repository.close();
  // Legacy fields must survive even on a changed row.
  before = createDomainSnapshot({ ...before, source_hash: undefined, records: before.records.map((record) => record.record_type === "Organization"
    ? { ...record, payload: { ...record.payload, legacy_source_ref: "unchanged-legacy-ref", original_recorded_date: "2020-01-01" } } : record) });
  const document = { source_id: "source-registration", legal_entity_id: binding.legal_entity_id, document_id: "document-corporate",
    version_id: "version-corporate-1", file_object_id: "file:version-corporate-1", object_id: "object-corporate-1",
    sha256: sha256(bytes), byte_size: bytes.length, content_type: "text/plain", page_count: 1 };
  const operation = (model_type, record_id, values, expected_values = {}) => ({ model_type, record_id, legal_entity_id: binding.legal_entity_id,
    before_payload_sha256: before.records.find((record) => record.record_type === model_type && record.record_id === record_id)?.payload_hash ?? null,
    values, expected_values, evidence: [{ source_id: document.source_id, page: 1, fields: Object.keys(values) }] });
  const manifest = { schema_version: CORPORATE_IMPORT_VERSION, tenant_id: tenant, actor_id: "owner-corporate-import",
    environment: "synthetic-test", source_sha: "a".repeat(40), source_tree: "b".repeat(40), bindings: [binding], documents: [document], operations: [
      operation("Organization", binding.organization_id, { registration_number: "new-registration" }, { registration_number: "old-registration" }),
      operation("PartyIdentifier", "identifier-business", { party_id: binding.party_id, identifier_type: "business_number", identifier_value: "synthetic-business-number", verified: true }),
      operation("ContactPoint", "contact-address", { owner_entity_id: binding.legal_entity_id, owner_party_id: binding.party_id,
        contact_type: "address", value: "Synthetic company address", is_primary: true }),
      operation("Entity", "entity-representative", { entity_kind: "person", display_name: "Synthetic Representative" }),
      operation("Party", "party-representative", { party_type: "person", display_name: "Synthetic Representative", canonical_entity_id: "entity-representative" }),
      operation("Person", "person-representative", { entity_id: "entity-representative", party_id: "party-representative", display_name: "Synthetic Representative" }),
      operation("Relationship", "relationship-representative", { from_entity_id: "entity-representative", to_entity_id: binding.legal_entity_id,
        from_party_id: "party-representative", to_party_id: binding.party_id, relationship_type: "representative", direction: "person_to_organization" }),
      operation("BillingProfile", "billing-corporate", { billing_entity_id: binding.legal_entity_id, legal_client_party_id: binding.party_id, billing_client_party_id: binding.party_id, display_name: "Synthetic Billing" }),
    ] };
  return { before, manifest, document };
}
function approvalFor(plan, receiptPatch = {}) {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const registryBytes = Buffer.from(JSON.stringify({ schema_version: "law-firm-os.runtime-safety.approval-trust-registry.v1",
    generated_at: "2026-09-05T00:00:00.000Z", keys: [{ key_id: "corporate-test-owner", algorithm: "Ed25519",
      public_key_spki_pem: publicKey.export({ type: "spki", format: "pem" }), roles: ["owner"], actions: [CORPORATE_IMPORT_ACTION],
      environments: ["synthetic-test"], valid_from: "2026-09-01T00:00:00.000Z", valid_until: "2026-10-01T00:00:00.000Z", revoked_at: null }] }));
  const receipt = { schema_version: "law-firm-os.runtime-safety.approval.v1", approval_id: "approval-corporate-test", key_id: "corporate-test-owner",
    role: "owner", decision: "approved", packet_sha256: plan.packet_sha256, source_sha: plan.source_sha, source_tree: plan.source_tree,
    action: plan.action, environment: plan.environment, signed_at: "2026-09-05T00:00:00.000Z", expires_at: "2026-09-06T00:00:00.000Z",
    data_scope: corporateImportApprovalScope(plan), contact_scope: [], ...receiptPatch };
  return { registryBytes, registrySha256: sha256(registryBytes), receiptBytes: Buffer.from(JSON.stringify(receipt)),
    signatureBytes: sign(null, Buffer.from(canonicalizeJson(receipt)), privateKey) };
}

test("corporate plan rejects unsupported fields, missing provenance, stale CAS and wrong tenant without dropping legacy data", () => {
  const { before, manifest } = fixture();
  const prepared = prepareCorporateMasterDataImport({ manifest, currentSnapshot: before });
  assert.equal(prepared.plan.changed_record_count, 8);
  assert.equal(prepared.plan.after_record_count, 11);
  assert.equal(prepared.plan.preserved_record_count, 3);
  assert.equal(prepared.after.records.find((record) => record.record_type === "Organization").payload.legacy_source_ref, "unchanged-legacy-ref");
  assert.doesNotMatch(JSON.stringify(prepared.plan), /Synthetic Corporation|new-registration|Synthetic company address/);
  for (const [mutate, code] of [
    [(m) => { m.operations[0].values.unregistered_provenance = "silently dropped"; }, "FIELD_NOT_SUPPORTED"],
    [(m) => { m.operations[0].evidence = []; }, "FIELD_EVIDENCE_REQUIRED"],
    [(m) => { m.operations[0].expected_values.registration_number = "wrong-old-value"; }, "FIELD_CAS_MISMATCH"],
    [(m) => { m.operations[0].before_payload_sha256 = "c".repeat(64); }, "BASELINE_DRIFT"],
    [(m) => { m.bindings[0].permission_ref = "other-permission"; }, "RECORD_AUTHORITY"],
    [(m) => { m.operations.push(structuredClone(m.operations[0])); }, "DUPLICATE_TARGET"],
    [(m) => { m.operations[0].evidence[0].page = 2; }, "FIELD_EVIDENCE_INVALID"],
    [(m) => { m.operations[0].model_type = "ClientGroup"; }, "OPERATION"],
    [(m) => { m.operations.find((item) => item.model_type === "Person").values.entity_id = binding.legal_entity_id; }, "TYPED_REFERENCE"],
    [(m) => { m.operations.find((item) => item.model_type === "ContactPoint").values.owner_party_id = "party-representative"; }, "TYPED_REFERENCE"],
    [(m) => { m.operations.find((item) => item.model_type === "Relationship").values.direction = "person_to_person"; }, "UNRELATED_RECORD"],
  ]) {
    const changed = structuredClone(manifest); mutate(changed);
    assert.throws(() => prepareCorporateMasterDataImport({ manifest: changed, currentSnapshot: before }), { code: `LAWOS_CORPORATE_IMPORT_${code}` });
  }
  const corrupt = structuredClone(before);
  corrupt.records[0].payload.tenant_id = "another-tenant";
  assert.throws(() => prepareCorporateMasterDataImport({ manifest, currentSnapshot: corrupt }), { code: "LAWOS_CORPORATE_IMPORT_TENANT" });
  const disconnected = structuredClone(manifest);
  disconnected.operations = disconnected.operations.filter((operation) => operation.model_type !== "Relationship");
  assert.throws(() => prepareCorporateMasterDataImport({ manifest: disconnected, currentSnapshot: before }), { code: "LAWOS_CORPORATE_IMPORT_UNRELATED_RECORD" });
});

test("shared representatives do not authorize another company's contacts through indirect graph links", () => {
  const { before, manifest } = fixture();
  const initial = prepareCorporateMasterDataImport({ manifest, currentSnapshot: before }).after;
  const repository = createMasterDataRepository({ seedRecords: [...initial.records.map((item) => item.payload),
    { ...common, model_type: "Entity", entity_id: "entity-other-corporate", entity_kind: "organization", display_name: "Other Synthetic Corporation" },
    { ...common, model_type: "Party", party_id: "party-other-corporate", party_type: "organization", display_name: "Other Synthetic Corporation", canonical_entity_id: "entity-other-corporate" },
    { ...common, model_type: "Organization", organization_id: "organization-other-corporate", entity_id: "entity-other-corporate", party_id: "party-other-corporate", display_name: "Other Synthetic Corporation" },
    { ...common, model_type: "Relationship", relationship_id: "relationship-shared-representative", from_entity_id: "entity-representative", to_entity_id: "entity-other-corporate",
      from_party_id: "party-representative", to_party_id: "party-other-corporate", relationship_type: "representative", direction: "person_to_organization" },
    { ...common, model_type: "ContactPoint", contact_point_id: "contact-other-corporate", owner_entity_id: "entity-other-corporate", owner_party_id: "party-other-corporate", contact_type: "address", value: "Other address" },
  ], preserveSeedRecords: true });
  const currentSnapshot = createRecordRepositoryDomainSnapshot({ descriptor: MASTER_DATA_DOMAIN_DESCRIPTOR,
    repositories: [{ source_id: "synthetic-shared-representative", repository }], tenant_id: tenant }).snapshot;
  repository.close();
  const changed = structuredClone(manifest);
  changed.operations = [{ model_type: "ContactPoint", record_id: "contact-other-corporate", legal_entity_id: binding.legal_entity_id,
    before_payload_sha256: currentSnapshot.records.find((item) => item.record_id === "contact-other-corporate").payload_hash,
    values: { value: "Wrong company source value" }, expected_values: { value: "Other address" },
    evidence: [{ source_id: "source-registration", page: 1, fields: ["value"] }] }];
  assert.throws(() => prepareCorporateMasterDataImport({ manifest: changed, currentSnapshot }), { code: "LAWOS_CORPORATE_IMPORT_UNRELATED_RECORD" });
});

test("identifier CAS regenerates its canonical key and duplicate values or primary contacts are rejected", () => {
  const { before, manifest } = fixture();
  const currentSnapshot = prepareCorporateMasterDataImport({ manifest, currentSnapshot: before }).after;
  const old = currentSnapshot.records.find((record) => record.record_type === "PartyIdentifier");
  const replacement = structuredClone(manifest);
  const original = structuredClone(manifest.operations.find((item) => item.model_type === "PartyIdentifier"));
  replacement.operations = [
    { ...original, before_payload_sha256: old.payload_hash, values: { identifier_value: "revised-business-number" },
      expected_values: { identifier_value: "synthetic-business-number" }, evidence: [{ source_id: "source-registration", page: 1, fields: ["identifier_value"] }] },
    { ...original, record_id: "identifier-new-holder" },
  ];
  const result = prepareCorporateMasterDataImport({ manifest: replacement, currentSnapshot });
  const revised = result.after.records.find((record) => record.record_id === old.record_id);
  assert.match(revised.payload.normalized_identifier_key, /revised-business-number$/);
  assert.notEqual(revised.unique_key, old.unique_key);
  assert.ok(result.evidence[0].fields.some((field) => field.field === "normalized_identifier_key" && field.derived_from.includes("identifier_value")));
  const duplicate = structuredClone(replacement);
  duplicate.operations[1].values.identifier_value = "revised-business-number";
  assert.throws(() => prepareCorporateMasterDataImport({ manifest: duplicate, currentSnapshot }), { safe_error_code: "MASTER_DATA_PARTY_IDENTIFIER_DUPLICATE" });
  const duplicateContact = structuredClone(manifest);
  duplicateContact.operations = [{ ...structuredClone(manifest.operations.find((item) => item.model_type === "ContactPoint")), record_id: "second-primary-contact" }];
  assert.throws(() => prepareCorporateMasterDataImport({ manifest: duplicateContact, currentSnapshot }), { safe_error_code: "MASTER_DATA_CONTACT_POINT_PRIMARY_DUPLICATE" });
});

test("actual PostgreSQL corporate import binds committed DMS references, rolls back outbox failures, and replays/readbacks without writes", async (t) => {
  const database = await createMigratedPostgresFixture(t);
  if (!database) return;
  const { before, manifest, document } = fixture();
  const ledger = createPostgresDomainLedger({ pool: database.appPool, clock });
  await ledger.importSnapshot(before);
  const scope = { tenant_id: tenant, domain_id: "master-data" };
  const read = () => ledger.transaction(scope, async (tx) => createDomainSnapshot({ ...scope, records: await tx.list(),
    idempotency_entries: await tx.listIdempotency(), audit_events: await tx.listAudit() }));
  await assert.rejects(planCorporateRecordImport({ pool: database.appPool, manifest }), { code: "LAWOS_CORPORATE_IMPORT_DMS_COMMITTED_REFERENCE" });
  const storage = createLocalStorageAdapter({ adapter_id: "synthetic-corporate-docs" });
  const dms = createPostgresDmsUploadRuntime({ pool: database.appPool, storage, clock });
  await dms.uploadDocument({ document: { tenant_id: tenant, document_id: document.document_id, current_version_id: document.version_id,
    matter_id: binding.matter_id, workspace_id: binding.workspace_id, permission_envelope_id: binding.permission_envelope_id,
    audit_trace_id: "audit-source-corporate", title: "Synthetic source", mime_type: document.content_type }, bytes,
    actor_id: manifest.actor_id, idempotency_key: "corporate-source-upload", object_id: document.object_id });
  const baseline = await read();
  const dmsBefore = await dms.getDocumentState({ tenant_id: tenant, document_id: document.document_id });
  const plan = await planCorporateRecordImport({ pool: database.appPool, manifest });
  const run = { pool: database.appPool, manifest, plan, sourceSha: manifest.source_sha, sourceTree: manifest.source_tree, approval: approvalFor(plan), clock };
  for (const field of ["sha256", "object_id", "file_object_id", "version_id", "document_id", "content_type", "byte_size"]) {
    const changed = structuredClone(manifest);
    changed.documents[0][field] = field === "sha256" ? "d".repeat(64) : field === "byte_size" ? 123 : "wrong-reference";
    await assert.rejects(planCorporateRecordImport({ pool: database.appPool, manifest: changed }), { code: "LAWOS_CORPORATE_IMPORT_DMS_COMMITTED_REFERENCE" });
  }
  for (const field of ["matter_id", "workspace_id", "permission_envelope_id"]) {
    const changed = structuredClone(manifest); changed.bindings[0][field] = "wrong-document-scope";
    await assert.rejects(planCorporateRecordImport({ pool: database.appPool, manifest: changed }), { code: "LAWOS_CORPORATE_IMPORT_DMS_COMMITTED_REFERENCE" });
  }
  await assert.rejects(executeCorporateRecordImport({ ...run, readOnly: true }), { code: "LAWOS_CORPORATE_IMPORT_RECEIPT_MISSING" });
  await assert.rejects(executeCorporateRecordImport({ ...run, approval: approvalFor(plan, { expires_at: "2026-09-05T00:30:00.000Z" }) }));
  await assert.rejects(executeCorporateRecordImport({ ...run, approval: approvalFor(plan, {
    signed_at: "2026-09-06T00:00:00.000Z", expires_at: "2026-09-07T00:00:00.000Z" }) }), { code: "LAWOS_CORPORATE_IMPORT_APPROVAL_TIME" });
  await assert.rejects(executeCorporateRecordImport({ ...run, clock: () => new Date("invalid") }), { code: "LAWOS_CORPORATE_IMPORT_APPROVAL_TIME" });
  await assert.rejects(executeCorporateRecordImport({ ...run, clock: () => "2026-09-05T01:00:00.000Z",
    approval: approvalFor(plan, { expires_at: "2026-09-05T00:30:00.000Z" }) }));
  await assert.rejects(executeCorporateRecordImport({ ...run, sourceSha: "e".repeat(40) }), { code: "LAWOS_CORPORATE_IMPORT_PLAN_DRIFT" });
  const faultPool = Object.create(database.appPool);
  faultPool.connect = async () => {
    const client = await database.appPool.connect();
    return { release: (...args) => client.release(...args), query: (sql, ...args) => {
      if (String(sql).includes("INSERT INTO lawos_domain.outbox_events")) throw new Error("synthetic outbox failure");
      return client.query(sql, ...args);
    } };
  };
  await assert.rejects(executeCorporateRecordImport({ ...run, pool: faultPool }));
  assert.equal((await read()).snapshot_hash, baseline.snapshot_hash);
  const originalOrganization = baseline.records.find((record) => record.record_type === "Organization");
  await ledger.transaction(scope, (tx) => tx.write({ ...originalOrganization, expected_version: originalOrganization.state_version,
    payload: { ...originalOrganization.payload, legacy_source_ref: "concurrent-business-update" } }));
  await assert.rejects(executeCorporateRecordImport(run), { code: "LAWOS_CORPORATE_IMPORT_BASELINE_DRIFT" });
  const concurrentOrganization = (await read()).records.find((record) => record.record_type === "Organization");
  await ledger.transaction(scope, (tx) => tx.write({ ...originalOrganization, expected_version: concurrentOrganization.state_version }));
  // Restoring an old value still changes its row version; the earlier signed plan stays stale.
  await assert.rejects(executeCorporateRecordImport(run), { code: "LAWOS_CORPORATE_IMPORT_BASELINE_DRIFT" });
  run.plan = await planCorporateRecordImport({ pool: database.appPool, manifest });
  run.approval = approvalFor(run.plan);
  const imported = await executeCorporateRecordImport(run);
  assert.equal(imported.outcome, "PASS");
  assert.equal(imported.replayed, false);
  assert.equal(imported.document_body_readback_verified, false);
  const after = await read();
  assert.equal((await executeCorporateRecordImport(run)).replayed, true);
  assert.equal((await executeCorporateRecordImport({ ...run, readOnly: true })).read_only, true);
  assert.equal((await read()).snapshot_hash, after.snapshot_hash);
  assert.equal(after.records.filter((record) => record.record_type === "ClientGroup").length, 1);
  for (const original of baseline.records) {
    const current = after.records.find((record) => record.record_type === original.record_type && record.record_id === original.record_id);
    if (original.record_type !== "Organization") assert.deepEqual(current, original);
    else for (const [key, value] of Object.entries(original.payload)) if (key !== "registration_number") assert.deepEqual(current.payload[key], value);
  }
  assert.equal(after.audit_events.length, baseline.audit_events.length + 1);
  assert.equal(after.audit_events.at(-1).payload.field_evidence.length, 8);
  assert.equal(hashDomainValue(await dms.getDocumentState({ tenant_id: tenant, document_id: document.document_id })), hashDomainValue(dmsBefore));
  assert.equal((await ledger.list({ tenant_id: "another-tenant", domain_id: "master-data" })).length, 0);
  await assert.rejects(executeCorporateRecordImport({ ...run, approval: approvalFor(plan, { expires_at: "2026-09-05T00:30:00.000Z" }) }));
});
