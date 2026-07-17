import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { sha256Hex } from "../../../packages/dms/src/storage/storage-adapter.js";
import { createLocalStorageAdapter } from "../../../packages/dms/src/storage/local-storage-adapter.js";
import { createMigratedPostgresFixture } from "../../../packages/persistence/test/helpers/disposable-postgres.js";
import {
  createVaultDmsPostgresRuntime,
  handleVaultDmsPostgresCommand,
  VAULT_DMS_POSTGRES_RUNTIME_BOUNDARY,
} from "../src/vault-dms-postgres-runtime.js";

test("Vault DMS PostgreSQL wrapper runs an async source rehearsal without activating API authority", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const bytes = Buffer.from("vault postgres source rehearsal");
  const storage = createLocalStorageAdapter({ adapter_id: "vault-postgres-source" });
  const runtime = createVaultDmsPostgresRuntime({
    pool: fixture.appPool,
    storage,
    clock: () => new Date("2026-07-16T07:00:00.000Z"),
  });
  const session = {
    tenant_id: "tenant-vault-postgres-source",
    session_id: "session-vault-postgres-source",
    idempotency_key: "idem-vault-postgres-source",
    matter_id: "matter-vault-postgres-source",
    workspace_id: "workspace-vault-postgres-source",
    document_id: "document-vault-postgres-source",
    version_id: "version-vault-postgres-source-1",
    version_number: 1,
    object_id: "object-vault-postgres-source-1",
    adapter_id: storage.adapter_id,
    title: "Vault PostgreSQL source rehearsal",
    content_type: "text/plain",
    expected_sha256: sha256Hex(bytes),
    expected_byte_size: bytes.byteLength,
    permission_envelope_id: "permission-vault-postgres-source",
    audit_trace_id: "trace-vault-postgres-source",
    actor_id: "user-vault-postgres-source",
    expires_at: "2026-07-17T00:00:00.000Z",
  };

  const created = await handleVaultDmsPostgresCommand({ runtime, command: "create_upload_session", payload: session });
  assert.equal(created.outcome, "source_rehearsal");
  assert.equal(created.result.session.state, "pending");
  await handleVaultDmsPostgresCommand({
    runtime,
    command: "stage_upload",
    payload: { tenant_id: session.tenant_id, session_id: session.session_id, bytes_base64: bytes.toString("base64") },
  });
  const finalized = await handleVaultDmsPostgresCommand({
    runtime,
    command: "finalize_upload",
    payload: { tenant_id: session.tenant_id, session_id: session.session_id },
  });
  assert.equal(finalized.result.session.state, "finalized");
  assert.equal(finalized.result.receipt.raw_path_exposed, false);
  assert.equal(finalized.boundary, VAULT_DMS_POSTGRES_RUNTIME_BOUNDARY);
  assert.equal(finalized.boundary.api_authority_active, false);
  assert.equal(finalized.boundary.provider_approved, false);
  assert.equal(finalized.boundary.production_ready_claim, false);
  assert.equal(finalized.boundary.file_json_authority_active, true);
  assert.equal(finalized.boundary.postgres_mutable_schema, "lawos_dms");
  assert.equal(finalized.boundary.lawos_domain_mutable_write_allowed, false);
  assert.equal(finalized.boundary.dual_write_allowed, false);
  assert.equal(finalized.boundary.global_postgres_authority_active, false);
  assert.equal(finalized.boundary.allowed_claim, "DMS_SOURCE_CHECKPOINT_VERIFIED");

  const serverSource = readFileSync(new URL("../src/server.js", import.meta.url), "utf8");
  assert.equal(serverSource.includes("vault-dms-postgres-runtime"), false);
  await assert.rejects(
    handleVaultDmsPostgresCommand({ runtime, command: "activate_production", payload: {} }),
    (error) => error?.safe_error_code === "DMS_POSTGRES_COMMAND_UNSUPPORTED",
  );
});
