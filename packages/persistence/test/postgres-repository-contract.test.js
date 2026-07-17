import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createMatterRepository } from "../../matter/src/repository.js";
import { createMatterFileRepositoryPortV2 } from "../../matter/src/repository-v2.js";
import {
  REPOSITORY_PORT_V2_VERSION,
  assertRepositoryPortV2,
  hashRepositoryRequest,
  requireRepositoryTenantId,
} from "../src/repository-port-v2.js";
import { createPostgresRepositoryPortV2 } from "../src/postgres/repository-v2.js";
import { createMigratedPostgresFixture } from "./helpers/disposable-postgres.js";
import { runRepositoryPortV2Contract } from "./helpers/repository-port-v2-contract.js";

test("RepositoryPortV2 fixes the Promise contract and canonical request hash", () => {
  assert.equal(REPOSITORY_PORT_V2_VERSION, "law-firm-os.repository-port.v2");
  assert.equal(hashRepositoryRequest({ b: 2, a: 1 }), hashRepositoryRequest({ a: 1, b: 2 }));
  assert.equal(requireRepositoryTenantId("  tenant-normalized  "), "tenant-normalized");
  assert.throws(() => assertRepositoryPortV2({}), /law-firm-os\.repository-port\.v2/u);
});

test("Matter file repository v2 passes the domain-neutral async contract", async (t) => {
  const root = mkdtempSync(join(tmpdir(), "lawos-matter-v2-contract-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const syncRepository = createMatterRepository({ filePath: join(root, "matter-store.json") });
  const repository = createMatterFileRepositoryPortV2({
    repository: syncRepository,
    clock: () => "2026-07-16T11:00:00.000Z",
  });
  const result = await runRepositoryPortV2Contract(repository, {
    tenantId: "tenant-file-contract",
    otherTenantId: "tenant-file-other",
  });
  assert.deepEqual(result, {
    created_version: 1,
    updated_version: 2,
    audit_count: 1,
    idempotency_replay: true,
    rollback_preserved: true,
    tenant_isolation: true,
  });
});

test("Matter file v2 writes remain readable through the existing sync repository", async () => {
  const syncRepository = createMatterRepository();
  const repository = createMatterFileRepositoryPortV2({
    repository: syncRepository,
    clock: () => "2026-07-16T11:01:00.000Z",
  });
  const written = await repository.write({
    tenant_id: "tenant-matter-reference",
    record_type: "ContractRecord",
    record_id: "reference-1",
    expected_version: 0,
    data: { label: "same-result", matter_id: "matter-reference-1" },
  });
  const syncRead = syncRepository.get({
    tenant_id: "tenant-matter-reference",
    model_type: "ContractRecord",
    id: "reference-1",
  });
  assert.equal(syncRead.label, written.data.label);
  assert.equal(syncRead.matter_id, written.data.matter_id);
  assert.equal(syncRead.state_version, written.state_version);
});

test("Matter file v2 maps record_id to the existing Matter primary key", async () => {
  const syncRepository = createMatterRepository();
  const repository = createMatterFileRepositoryPortV2({
    repository: syncRepository,
    clock: () => "2026-07-16T11:01:30.000Z",
  });
  await repository.write({
    tenant_id: "tenant-matter-model",
    record_type: "Matter",
    record_id: "matter-v2-primary-key",
    expected_version: 0,
    data: {
      client_id: "client-v2-primary-key",
      title: "Matter v2 primary key mapping",
      status: "opening",
      created_by: "user-v2-contract",
      created_at: "2026-07-16T11:01:00.000Z",
      permission_envelope_id: "permission-v2-contract",
      audit_trace_id: "audit-v2-contract",
    },
  });
  const syncRead = syncRepository.get({
    tenant_id: "tenant-matter-model",
    model_type: "Matter",
    id: "matter-v2-primary-key",
  });
  assert.equal(syncRead.matter_id, "matter-v2-primary-key");
  assert.equal(syncRead.resource_id, "matter-v2-primary-key");
});

test("PostgreSQL v2 passes the same domain-neutral async contract", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const repository = createPostgresRepositoryPortV2({
    pool: fixture.appPool,
    clock: () => "2026-07-16T11:02:00.000Z",
  });
  const result = await runRepositoryPortV2Contract(repository, {
    tenantId: "tenant-postgres-contract",
    otherTenantId: "tenant-postgres-other",
  });
  assert.deepEqual(result, {
    created_version: 1,
    updated_version: 2,
    audit_count: 1,
    idempotency_replay: true,
    rollback_preserved: true,
    tenant_isolation: true,
  });
});
