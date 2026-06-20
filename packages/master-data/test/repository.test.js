import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  createMasterDataRepository,
  createMasterDataSyntheticFixture,
  listMasterDataRepositoryMigrations,
  seedMasterDataRepository,
} from "../src/index.js";

test("Master Data repository persists create/read/update across reopen", () => {
  const filePath = join(mkdtempSync(join(tmpdir(), "master-data-repository-")), "store.json");
  const first = createMasterDataRepository({ filePath });
  first.create({
    model_type: "Entity",
    tenant_id: "tenant-a",
    entity_id: "entity-001",
    entity_kind: "organization",
    display_name: "Acme Corp",
    status: "active",
    owner_user_id: "owner-a",
  });
  first.update(
    { tenant_id: "tenant-a", model_type: "Entity", id: "entity-001" },
    { display_name: "Acme Corporation" },
  );
  first.close();

  const reopened = createMasterDataRepository({ filePath });
  const record = reopened.get({ tenant_id: "tenant-a", model_type: "Entity", id: "entity-001" });
  assert.equal(record.display_name, "Acme Corporation");
  assert.equal(record.entity_kind, "organization");
  reopened.close();
});

test("Master Data repository seed is idempotent and migration manifest is versioned", () => {
  const fixture = createMasterDataSyntheticFixture();
  const repository = createMasterDataRepository({ seedRecords: fixture.records });
  seedMasterDataRepository(repository, fixture.records);
  assert.equal(repository.list({ tenant_id: fixture.tenant_id }).length, fixture.records.length);
  assert.equal(listMasterDataRepositoryMigrations()[0].id, "001_master_data_repository");
});
