import assert from "node:assert/strict";
import test from "node:test";
import { createLocalStorageAdapter } from "../../../packages/dms/src/storage/local-storage-adapter.js";
import { createPostgresDmsUploadRuntime } from "../../../packages/dms/src/postgres-upload-runtime.js";
import { createPostgresDomainLedger } from "../../../packages/persistence/src/postgres/domain-ledger.js";
import { createMigratedPostgresFixture } from "../../../packages/persistence/test/helpers/disposable-postgres.js";
import { runHrxMigrations } from "../../../packages/hrx/src/migrations/index.js";
import { createHrxDomainSnapshot } from "../../../packages/hrx/src/postgres-store-v2.js";
import { createFileHrxStore } from "../../../packages/hrx/src/store/file-store.js";
import { MATTER_VAULT_REGISTERED_TENANT_ID } from "../src/matter-vault-account-registry.js";
import { createPostgresApiRuntimeAuthority } from "../src/postgres-api-runtime-authority.js";
import { handleVaultDmsApiRequest } from "../src/vault-dms-runtime-context.js";
import { handleMatterDocumentFacade } from "../src/matter-runtime-context.js";
import { createMatterVaultLink } from "../../../packages/matter/src/matter-vault-link.js";
import { createBankImportPreviewTokenAuthority } from "../src/bank-import-preview-token.js";

const TENANT = MATTER_VAULT_REGISTERED_TENANT_ID;
const OTHER_TENANT = "tenant_postgres_vault_other";
const ACTOR = "user_amic_jwsuh";
const PAYROLL_ARTIFACT_SECRET = "postgres-vault-test-payroll-artifact-secret";
const BANK_IMPORT_PREVIEW_TOKENS = createBankImportPreviewTokenAuthority({
  secret: "postgres-vault-bank-preview-secret-material",
});

function allowContext(tenantId = TENANT) {
  return Object.freeze({
    principal: Object.freeze({ user_id: ACTOR, actor_id: ACTOR, email: "lawos-staging-vault-admin@example.test", tenant_id: tenantId, role_ids: ["matter_vault_admin"], directory_source: "postgres-v2" }),
    rules: Object.freeze([{ id: "postgres-vault-allow", effect: "allow", action: "*" }]),
    object_acl: Object.freeze([]),
  });
}

function query(tenantId = TENANT) {
  return Object.freeze({ tenant_id: tenantId, permission_ref: "perm-postgres-vault", audit_hint_ref: "audit-postgres-vault" });
}

async function importHrxAuthorityBaseline(ledger, tenantId) {
  const store = createFileHrxStore();
  try {
    runHrxMigrations(store);
    await ledger.importSnapshot(createHrxDomainSnapshot({ store, tenant_id: tenantId }).snapshot);
  } finally {
    store.close();
  }
}

test("PostgreSQL Vault API finalizes provider bytes before publishing tenant metadata and never dual-writes DMS documents", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const ledger = createPostgresDomainLedger({ pool: fixture.appPool });
  const baseStorage = createLocalStorageAdapter({ adapter_id: "postgres-vault-api-test" });
  let concurrentDomainWriteInjected = false;
  const storage = Object.freeze({
    ...baseStorage,
    async finalizeObject(input) {
      const receipt = await baseStorage.finalizeObject(input);
      if (!concurrentDomainWriteInjected) {
        concurrentDomainWriteInjected = true;
        await ledger.write({
          tenant_id: TENANT,
          domain_id: "analytics",
          record_type: "AnalyticsEvent",
          record_id: "concurrent-during-dms-finalize",
          expected_version: 0,
          append_only: true,
          payload: {
            tenant_id: TENANT,
            model_type: "AnalyticsEvent",
            analytics_event_id: "concurrent-during-dms-finalize",
            resource_id: "concurrent-during-dms-finalize",
            synthetic_only: true,
          },
        });
      }
      return receipt;
    },
  });
  const uploadRuntime = createPostgresDmsUploadRuntime({
    pool: fixture.appPool,
    storage,
    sourceOnly: false,
    clock: () => new Date("2026-07-18T06:00:00.000Z"),
  });
  const authority = createPostgresApiRuntimeAuthority({
    ledger,
    dmsStorage: storage,
    dmsUploadRuntime: uploadRuntime,
    payrollArtifactSecret: PAYROLL_ARTIFACT_SECRET,
    bankImportPreviewTokens: BANK_IMPORT_PREVIEW_TOKENS,
  });
  await importHrxAuthorityBaseline(ledger, TENANT);
  await importHrxAuthorityBaseline(ledger, OTHER_TENANT);
  const bytes = Buffer.from("PostgreSQL Vault API authoritative bytes");
  const documentId = "document-postgres-vault-api-001";
  const versionId = "version-postgres-vault-api-001";
  const body = {
    tenant_id: TENANT,
    permission_ref: "perm-postgres-vault",
    audit_hint_ref: "audit-postgres-vault",
    actor_id: "forged-actor-must-not-win",
    idempotency_key: "postgres-vault-api-upload-001",
    content_base64: bytes.toString("base64"),
    document: {
      document_id: documentId,
      tenant_id: TENANT,
      matter_id: "matter-postgres-vault-api-001",
      workspace_id: "workspace-postgres-vault-api-001",
      title: "PostgreSQL Vault API document",
      current_version_id: versionId,
      permission_envelope_id: "permission-postgres-vault-api-001",
      audit_trace_id: "audit-trace-postgres-vault-api-001",
      mime_type: "text/plain",
    },
  };

  const created = await authority.run({
    tenant_id: TENANT,
    command: (runtimes) => handleVaultDmsApiRequest({
      pathname: "/api/vault/documents",
      method: "POST",
      query: {},
      body,
      context: allowContext(),
      requestId: "req-postgres-vault-create",
      runtime: runtimes.dmsRuntime,
    }),
  });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  assert.equal(created.body.provider_finalize_before_metadata, true);
  assert.equal(created.body.independent_digest_readback, true);
  assert.equal(created.body.file_object.storage_pointer_ref_included, false);
  assert.equal(created.body.item.owner_user_id, ACTOR);
  assert.equal(concurrentDomainWriteInjected, true);
  assert.equal((await ledger.list({ tenant_id: TENANT, domain_id: "analytics" })).length, 1);

  const state = await uploadRuntime.getDocumentState({ tenant_id: TENANT, document_id: documentId });
  assert.equal(state.document.current_version_id, versionId);
  assert.equal(state.versions[0].created_by, ACTOR);
  assert.equal(state.file_objects[0].status, "committed");
  assert.equal(state.audit_events.find((event) => event.event_type === "dms.document.metadata_committed")?.actor_id, ACTOR);
  assert.ok(state.audit_events.some((event) => event.event_type === "dms.document.metadata_committed"));
  assert.ok(state.outbox_events.some((event) => event.event_type === "dms.document.metadata_committed"));
  assert.equal((await ledger.list({ tenant_id: TENANT, domain_id: "dms" })).some((record) => record.record_type === "DmsDocument"), false);
  assert.equal((await ledger.list({ tenant_id: TENANT, domain_id: "dms-auxiliary" })).some((record) => record.record_type === "DmsDocument"), false);

  const facadeMatterId = "matter-postgres-facade-001";
  const facadeDocumentId = "document-postgres-facade-001";
  const facadeVersionId = "version-postgres-facade-001";
  const facade = await authority.run({
    tenant_id: TENANT,
    command: async (runtimes) => {
      runtimes.matterRuntime.repository.create({
        model_type: "Matter",
        tenant_id: TENANT,
        matter_id: facadeMatterId,
        client_id: "client-postgres-facade-001",
        title: "PostgreSQL facade Matter",
        status: "open",
        matter_code: "PG-FACADE-001",
        created_by: ACTOR,
        created_at: "2026-07-18T06:00:00.000Z",
        permission_envelope_id: "permission-postgres-facade-001",
        audit_trace_id: "audit-postgres-facade-matter-001",
      });
      const link = createMatterVaultLink({
        tenant_id: TENANT,
        matter_id: facadeMatterId,
        vault_workspace_id: "workspace-postgres-facade-001",
        default_folder_id: "folder-postgres-facade-001",
        permission_envelope_id: "permission-postgres-facade-001",
        source_transaction_id: "postgres-facade-setup-001",
        audit_event_id: "audit-postgres-facade-link-001",
        created_by_actor_id: ACTOR,
      });
      runtimes.matterRuntime.repository.create(link);
      runtimes.matterRuntime.repository.recordIdempotency({
        tenant_id: TENANT,
        idempotency_key: "postgres-facade-setup-001",
        operation: "postgres_facade_test_setup",
        response: { matter_id: facadeMatterId },
      });
      runtimes.matterRuntime.repository.appendAudit({
        tenant_id: TENANT,
        event_id: "audit-postgres-facade-link-001",
        actor_id: ACTOR,
        action: "matter.vault_link.created",
        object_type: "MatterVaultLink",
        object_id: link.resource_id,
        reason: "postgres_facade_test_setup",
      });
      return handleMatterDocumentFacade({
        matterId: facadeMatterId,
        body: {
          tenant_id: TENANT,
          permission_ref: "permission-postgres-facade-001",
          audit_hint_ref: "audit-postgres-facade-upload-001",
          actor_id: "forged-actor-must-not-win",
          idempotency_key: "postgres-facade-upload-001",
          content_text: "PostgreSQL Matter facade bytes",
          document: {
            document_id: facadeDocumentId,
            current_version_id: facadeVersionId,
            title: "PostgreSQL Matter facade document",
            mime_type: "text/plain",
          },
        },
        context: allowContext(),
        requestId: "req-postgres-facade-upload",
        runtime: runtimes.matterRuntime,
      });
    },
  });
  assert.equal(facade.status, 201, JSON.stringify(facade.body));
  assert.equal(facade.body.item.document_id, facadeDocumentId);
  assert.equal(facade.body.item.matter_owns_document_bytes, false);
  assert.equal((await uploadRuntime.getDocumentState({ tenant_id: TENANT, document_id: facadeDocumentId })).document.current_version_id, facadeVersionId);
  for (const domainId of ["dms", "dms-auxiliary"]) {
    assert.equal((await ledger.list({ tenant_id: TENANT, domain_id: domainId })).some((record) => ["DmsDocument", "DmsDocumentVersion", "DmsFileObject"].includes(record.record_type)), false);
  }
  const matterAudit = await ledger.listAudit({ tenant_id: TENANT, domain_id: "matter" });
  const facadeAudit = matterAudit.find((event) => event.event_type === "matter.document_facade.uploaded");
  assert.equal(facadeAudit.actor_id, ACTOR);

  const governanceBody = {
    tenant_id: TENANT,
    permission_ref: "perm-postgres-vault",
    audit_hint_ref: "audit-postgres-vault-governance",
    object_id: `object:${versionId}`,
  };
  const legalHold = await authority.run({
    tenant_id: TENANT,
    command: (runtimes) => handleVaultDmsApiRequest({
      pathname: `/api/vault/documents/${documentId}/legal-holds`,
      method: "POST",
      query: {},
      body: { ...governanceBody, legal_hold_id: "hold-postgres-vault-001", reason: "synthetic litigation hold" },
      context: allowContext(),
      requestId: "req-postgres-vault-hold",
      runtime: runtimes.dmsRuntime,
    }),
  });
  assert.equal(legalHold.status, 201, JSON.stringify(legalHold.body));
  assert.equal(legalHold.body.item.status, "active");
  assert.equal(legalHold.body.reason_plaintext_included, false);
  assert.equal(JSON.stringify(legalHold.body).includes("synthetic litigation hold"), false);
  const legalHoldReplay = await authority.run({
    tenant_id: TENANT,
    command: (runtimes) => handleVaultDmsApiRequest({
      pathname: `/api/vault/documents/${documentId}/legal-holds`,
      method: "POST",
      query: {},
      body: { ...governanceBody, legal_hold_id: "hold-postgres-vault-001", reason: "synthetic litigation hold" },
      context: allowContext(),
      requestId: "req-postgres-vault-hold-replay",
      runtime: runtimes.dmsRuntime,
    }),
  });
  assert.equal(legalHoldReplay.status, 200);
  assert.equal(legalHoldReplay.body.idempotent_replay, true);

  const retention = await authority.run({
    tenant_id: TENANT,
    command: (runtimes) => handleVaultDmsApiRequest({
      pathname: `/api/vault/documents/${documentId}/retention-policies`,
      method: "POST",
      query: {},
      body: { ...governanceBody, retention_policy_id: "retention-postgres-vault-001", retain_until: "2026-08-18T06:00:00.000Z" },
      context: allowContext(),
      requestId: "req-postgres-vault-retention",
      runtime: runtimes.dmsRuntime,
    }),
  });
  assert.equal(retention.status, 201, JSON.stringify(retention.body));
  const retentionReplay = await authority.run({
    tenant_id: TENANT,
    command: (runtimes) => handleVaultDmsApiRequest({
      pathname: `/api/vault/documents/${documentId}/retention-policies`,
      method: "POST",
      query: {},
      body: { ...governanceBody, retention_policy_id: "retention-postgres-vault-001", retain_until: "2026-08-18T06:00:00.000Z" },
      context: allowContext(),
      requestId: "req-postgres-vault-retention-replay",
      runtime: runtimes.dmsRuntime,
    }),
  });
  assert.equal(retentionReplay.status, 200);
  assert.equal(retentionReplay.body.idempotent_replay, true);

  const heldDelete = await authority.run({
    tenant_id: TENANT,
    command: (runtimes) => handleVaultDmsApiRequest({
      pathname: `/api/vault/documents/${documentId}/delete-check`,
      method: "POST",
      query: {},
      body: governanceBody,
      context: allowContext(),
      requestId: "req-postgres-vault-delete-held",
      runtime: runtimes.dmsRuntime,
    }),
  });
  assert.equal(heldDelete.status, 409);
  assert.deepEqual(heldDelete.body.safe_error_codes, ["DMS_LEGAL_HOLD_DELETE_BLOCKED"]);
  const mismatchedDelete = await authority.run({
    tenant_id: TENANT,
    command: (runtimes) => handleVaultDmsApiRequest({
      pathname: `/api/vault/documents/${documentId}/delete-check`,
      method: "POST",
      query: {},
      body: { ...governanceBody, object_id: `object:${facadeVersionId}` },
      context: allowContext(),
      requestId: "req-postgres-vault-delete-mismatch",
      runtime: runtimes.dmsRuntime,
    }),
  });
  assert.equal(mismatchedDelete.status, 409);
  assert.deepEqual(mismatchedDelete.body.safe_error_codes, ["DMS_DOCUMENT_OBJECT_MISMATCH"]);
  const unapprovedDelete = await authority.run({
    tenant_id: TENANT,
    command: (runtimes) => handleVaultDmsApiRequest({
      pathname: `/api/vault/documents/${facadeDocumentId}/permanent-delete`,
      method: "POST",
      query: {},
      body: {
        ...governanceBody,
        object_id: `object:${facadeVersionId}`,
        idempotency_key: "delete-postgres-vault-unapproved-001",
      },
      context: allowContext(),
      requestId: "req-postgres-vault-delete-unapproved",
      runtime: runtimes.dmsRuntime,
    }),
  });
  assert.equal(unapprovedDelete.status, 403);
  assert.deepEqual(unapprovedDelete.body.safe_error_codes, ["DMS_PERMANENT_DELETE_APPROVAL_REQUIRED"]);
  assert.equal((await uploadRuntime.getDocumentState({ tenant_id: TENANT, document_id: documentId })).document.legal_hold_status, "active");

  const listed = await authority.run({
    tenant_id: TENANT,
    command: (runtimes) => handleVaultDmsApiRequest({
      pathname: "/api/vault/documents",
      method: "GET",
      query: query(),
      body: {},
      context: allowContext(),
      requestId: "req-postgres-vault-list",
      runtime: runtimes.dmsRuntime,
    }),
  });
  assert.equal(listed.status, 200);
  assert.deepEqual(new Set(listed.body.items.map((item) => item.document_id)), new Set([documentId, facadeDocumentId]));

  const matterScopedList = await authority.run({
    tenant_id: TENANT,
    command: (runtimes) => handleVaultDmsApiRequest({
      pathname: "/api/vault/documents",
      method: "GET",
      query: { ...query(), matter_id: body.document.matter_id },
      body: {},
      context: allowContext(),
      requestId: "req-postgres-vault-matter-list",
      runtime: runtimes.dmsRuntime,
    }),
  });
  assert.deepEqual(matterScopedList.body.items.map((item) => item.document_id), [documentId]);

  const searched = await authority.run({
    tenant_id: TENANT,
    command: (runtimes) => handleVaultDmsApiRequest({
      pathname: "/api/vault/search",
      method: "GET",
      query: { ...query(), q: "PostgreSQL" },
      body: {},
      context: allowContext(),
      requestId: "req-postgres-vault-search",
      runtime: runtimes.dmsRuntime,
    }),
  });
  assert.equal(searched.status, 200);
  assert.equal(searched.body.page_info.omitted_result_count, null);

  const matterScopedSearch = await authority.run({
    tenant_id: TENANT,
    command: (runtimes) => handleVaultDmsApiRequest({
      pathname: "/api/vault/search",
      method: "GET",
      query: { ...query(), matter_id: body.document.matter_id, q: "PostgreSQL" },
      body: {},
      context: allowContext(),
      requestId: "req-postgres-vault-matter-search",
      runtime: runtimes.dmsRuntime,
    }),
  });
  assert.deepEqual(matterScopedSearch.body.items.map((item) => item.document_id), [documentId]);

  const matterScopedAudit = await authority.run({
    tenant_id: TENANT,
    command: (runtimes) => handleVaultDmsApiRequest({
      pathname: "/api/vault/audit",
      method: "GET",
      query: { ...query(), matter_id: body.document.matter_id },
      body: {},
      context: allowContext(),
      requestId: "req-postgres-vault-matter-audit",
      runtime: runtimes.dmsRuntime,
    }),
  });
  assert.ok(matterScopedAudit.body.items.length > 0);
  assert.ok(matterScopedAudit.body.items.every((item) => item.matter_id === body.document.matter_id));

  const downloaded = await authority.run({
    tenant_id: TENANT,
    command: (runtimes) => handleVaultDmsApiRequest({
      pathname: `/api/vault/documents/${documentId}/download`,
      method: "GET",
      query: query(),
      body: {},
      context: allowContext(),
      requestId: "req-postgres-vault-download",
      runtime: runtimes.dmsRuntime,
    }),
  });
  assert.equal(downloaded.status, 200, JSON.stringify(downloaded.body));
  assert.equal(Buffer.from(downloaded.body.download.content_base64, "base64").toString("utf8"), bytes.toString("utf8"));
  assert.equal(downloaded.body.download.independent_digest_readback, true);

  const isolated = await authority.run({
    tenant_id: OTHER_TENANT,
    command: (runtimes) => handleVaultDmsApiRequest({
      pathname: "/api/vault/documents",
      method: "GET",
      query: query(OTHER_TENANT),
      body: {},
      context: allowContext(OTHER_TENANT),
      requestId: "req-postgres-vault-other-tenant",
      runtime: runtimes.dmsRuntime,
    }),
  });
  assert.equal(isolated.status, 200);
  assert.deepEqual(isolated.body.items, []);
  assert.throws(() => storage.getObject({ tenant_id: OTHER_TENANT, object_id: `object:${versionId}` }), /not found/u);
});
