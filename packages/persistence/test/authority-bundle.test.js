import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  createJsonPostgresAdjudicationRecommendations,
  createJsonPostgresRecordAuthority,
} from "../src/postgres/source-adjudication.js";
import {
  JSON_POSTGRES_AUTHORITY_DECISIONS_VERSION,
  createJsonPostgresAuthorityBundle,
} from "../src/postgres/authority-bundle.js";
import { createJsonPostgresRecordTypeCatalog } from "../src/postgres/record-type-catalog.js";
import { inventoryJsonPostgresSources } from "../src/postgres/source-inventory.js";

function corpus() {
  return {
    schema_version: "law-firm-os.json-postgres-migration-corpus.v1",
    data_scope: "approved-real-manifest",
    tenant_id: "tenant-never-return",
    accounts: [{
      user_id: "user-never-return",
      email: "person@example.test",
      status: "active",
    }],
    domains: [{
      domain_id: "matter",
      records: [{
        record_type: "Matter",
        record_id: "matter-never-return",
        unique_key: "matter:never-return",
        payload: { matter_id: "matter-never-return", matter_code: "CODE-NEVER-RETURN" },
        references: [],
      }],
    }],
  };
}

function authority(inventory, decisionSetRef) {
  const recommendations =
    createJsonPostgresAdjudicationRecommendations({
      inventory,
      approvedInventoryContentSha256:
        inventory.inventory_content_sha256,
    });
  return createJsonPostgresRecordAuthority({
    inventory,
    recommendations,
    decisionSetRef,
    ownerDecisionRef: `${decisionSetRef}-owner`,
    sourceSha: "a".repeat(40),
    sourceTree: "b".repeat(40),
    rootPriority: ["runtime-primary"],
  });
}

test("authority bundle seals a complete safe candidate but never claims owner approval", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "lawos-authority-bundle-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const sourceBytes = `${JSON.stringify({ tenant_id: "tenant-never-return", records: [{ record_id: "matter-never-return" }] })}\n`;
  await writeFile(join(root, "matter-store.json"), sourceBytes);
  const inventory = await inventoryJsonPostgresSources({
    roots: [{ ref: "runtime-primary", path: root }],
    clock: () => new Date("2026-07-23T00:00:00.000Z"),
  });
  const source = corpus();
  const recordTypeCatalog = createJsonPostgresRecordTypeCatalog({ corpus: source });
  const recordAuthority = authority(inventory, "owner-adjudication-001");
  const decisions = {
    schema_version: JSON_POSTGRES_AUTHORITY_DECISIONS_VERSION,
    decision_set_ref: "owner-adjudication-001",
    inventory_content_sha256: inventory.inventory_content_sha256,
    record_type_catalog_sha256: recordTypeCatalog.catalog_sha256,
    record_authority_sha256: recordAuthority.authority_sha256,
    approved_root_refs: ["runtime-primary"],
    decisions: recordAuthority.sources,
    field_overrides: [],
    expected_rejections: [],
  };
  const bundle = await createJsonPostgresAuthorityBundle({
    inventory,
    decisions,
    recordTypeCatalog,
    recordAuthority,
    corpus: source,
  });
  assert.equal(bundle.summary.outcome, "READY_FOR_OWNER_SIGNATURE");
  assert.equal(bundle.summary.ready_for_owner_signature, true);
  assert.equal(bundle.summary.claims.owner_approval_created, false);
  assert.equal(bundle.authority_manifest.authorization_state, "PENDING_OWNER_SIGNATURE");
  assert.equal(bundle.summary.safe_counts.unresolved_source_count, 0);
  assert.equal(bundle.summary.safe_counts.reconciliation_blocking_count, 0);
  const serialized = JSON.stringify(bundle);
  for (const forbidden of [
    "tenant-never-return",
    "person@example.test",
    "matter-never-return",
    "CODE-NEVER-RETURN",
  ]) assert.equal(serialized.includes(forbidden), false);
});

test("authority bundle rejects digest drift and remains blocked for reconciliation defects", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "lawos-authority-bundle-blocked-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const bytes = `${JSON.stringify({
    records: [{ record_id: "matter-never-return" }],
  })}\n`;
  await writeFile(join(root, "matter-store.json"), bytes);
  const inventory = await inventoryJsonPostgresSources({
    roots: [{ ref: "runtime-primary", path: root }],
    clock: () => new Date("2026-07-23T00:00:00.000Z"),
  });
  const source = corpus();
  source.domains[0].records[0].payload.matter_code = "";
  const recordTypeCatalog = createJsonPostgresRecordTypeCatalog({ corpus: source });
  const recordAuthority = authority(inventory, "owner-adjudication-002");
  const decisions = {
    schema_version: JSON_POSTGRES_AUTHORITY_DECISIONS_VERSION,
    decision_set_ref: "owner-adjudication-002",
    inventory_content_sha256: inventory.inventory_content_sha256,
    record_type_catalog_sha256: recordTypeCatalog.catalog_sha256,
    record_authority_sha256: recordAuthority.authority_sha256,
    approved_root_refs: ["runtime-primary"],
    decisions: recordAuthority.sources,
    field_overrides: [],
    expected_rejections: [],
  };
  const bundle = await createJsonPostgresAuthorityBundle({
    inventory,
    decisions,
    recordTypeCatalog,
    recordAuthority,
    corpus: source,
  });
  assert.equal(bundle.summary.outcome, "BLOCKED");
  assert.equal(bundle.summary.safe_counts.reconciliation_blocking_count, 1);

  await assert.rejects(createJsonPostgresAuthorityBundle({
    inventory,
    decisions: { ...decisions, inventory_content_sha256: "0".repeat(64) },
    recordTypeCatalog,
    recordAuthority,
    corpus: source,
  }), /inventory digest drifted/u);
});
