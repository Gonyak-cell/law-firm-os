import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createJsonPostgresAuthorityBundle, JSON_POSTGRES_AUTHORITY_DECISIONS_VERSION } from "../src/postgres/authority-bundle.js";
import { runJsonPostgresExecutionMode } from "../src/postgres/migration-executor.js";
import { createJsonPostgresRecordTypeCatalog } from "../src/postgres/record-type-catalog.js";
import {
  createJsonPostgresAdjudicationRecommendations,
  createJsonPostgresRecordAuthority,
} from "../src/postgres/source-adjudication.js";
import {
  inventoryJsonPostgresSources,
} from "../src/postgres/source-inventory.js";
import { createMigratedPostgresFixture } from "./helpers/disposable-postgres.js";

const SHA = "a".repeat(40);
const TREE = "b".repeat(40);
const DIGEST = "c".repeat(64);

function corpus() {
  return {
    schema_version: "law-firm-os.json-postgres-migration-corpus.v1",
    data_scope: "approved-real-manifest",
    tenant_id: "tenant_execution_a",
    accounts: [{ user_id: "user-a", email: "user@example.test", status: "active" }],
    domains: [{
      domain_id: "matter",
      records: [{
        record_type: "Matter",
        record_id: "matter-a",
        unique_key: "matter:a",
        payload: { matter_id: "matter-a", matter_code: "MATTER-A" },
        references: [],
      }],
    }],
  };
}

async function bundle(t) {
  const source = corpus();
  const recordTypeCatalog = createJsonPostgresRecordTypeCatalog({ corpus: source });
  const root = await mkdtemp(join(tmpdir(), "lawos-migration-executor-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(join(root, "matter-store.json"), JSON.stringify({
    records: [{
      tenant_id: "tenant_execution_a",
      model_type: "Matter",
      matter_id: "matter-a",
    }],
  }));
  const inventory = await inventoryJsonPostgresSources({
    roots: [{ ref: "runtime-primary", path: root }],
    clock: () => new Date("2026-07-23T00:00:00.000Z"),
  });
  const recommendations =
    createJsonPostgresAdjudicationRecommendations({
      inventory,
      approvedInventoryContentSha256:
        inventory.inventory_content_sha256,
    });
  const recordAuthority = createJsonPostgresRecordAuthority({
    inventory,
    recommendations,
    decisionSetRef: "execution-decisions-001",
    ownerDecisionRef: "execution-owner-decision-001",
    sourceSha: SHA,
    sourceTree: TREE,
    rootPriority: ["runtime-primary"],
  });
  const decisions = {
    schema_version: JSON_POSTGRES_AUTHORITY_DECISIONS_VERSION,
    decision_set_ref: "execution-decisions-001",
    inventory_content_sha256: inventory.inventory_content_sha256,
    record_type_catalog_sha256: recordTypeCatalog.catalog_sha256,
    record_authority_sha256: recordAuthority.authority_sha256,
    approved_root_refs: ["runtime-primary"],
    decisions: recordAuthority.sources,
    field_overrides: [],
    expected_rejections: [],
  };
  return createJsonPostgresAuthorityBundle({
    inventory,
    decisions,
    recordTypeCatalog,
    recordAuthority,
    corpus: source,
  });
}

function packet(authorityBundle, phase = "w12-real-data-rehearsal") {
  return {
    phase,
    source_sha: SHA,
    source_tree: TREE,
    packet_sha256: DIGEST,
    allowed_modes: ["preflight", "dry-run", "stage", "commit", "resume", "readback", "reconcile"],
    bindings: {
      authority_bundle_sha256: authorityBundle.summary.bundle_sha256,
      inventory_content_sha256: authorityBundle.summary.inventory_content_sha256,
      record_type_catalog_sha256: authorityBundle.summary.record_type_catalog_sha256,
      record_authority_sha256: authorityBundle.summary.record_authority_sha256,
      field_crosswalk_sha256: authorityBundle.summary.field_crosswalk_sha256,
      authority_manifest_sha256: authorityBundle.summary.authority_manifest_sha256,
      migration_manifest_sha256: authorityBundle.summary.migration_manifest_sha256,
      dms_object_manifest_sha256: "3".repeat(64),
      w12_terminal_receipt_sha256: phase === "w13-production-cutover" ? "1".repeat(64) : "0".repeat(64),
    },
  };
}

function dmsRunner(value) {
  return async ({ mode }) => {
    return {
      outcome: "PASS",
      manifest_sha256: value.bindings.dms_object_manifest_sha256,
      authority_manifest_sha256: value.bindings.authority_manifest_sha256,
      invariant_hash: "4".repeat(64),
      result_sha256: "5".repeat(64),
      checkpoint: {
        schema_version: "law-firm-os.json-postgres-dms-migration-checkpoint.v1",
        manifest_sha256: value.bindings.dms_object_manifest_sha256,
        completed_object_refs: [],
      },
      safe_counts: { source_object_count: 0, completed_object_count: 0 },
      claims: {
        provider_write: false,
        postgres_metadata_write: false,
        document_bytes_returned: false,
        pii_returned: false,
        secret_material_returned: false,
      },
    };
  };
}

function approval(value) {
  return { valid: true, decision: "approved", phase: value.phase, packet_sha256: value.packet_sha256 };
}

function predecessor(kind, value, claims = {}) {
  return {
    valid: true,
    receipt_kind: kind,
    execution_state: "PASS",
    source_sha: SHA,
    source_tree: TREE,
    packet_sha256: value.packet_sha256,
    canonical_sha256: kind === "w12-terminal"
      ? value.bindings.w12_terminal_receipt_sha256
      : `${kind.length.toString(16).padStart(64, "0")}`,
    claims,
  };
}

test("migration executor separates preflight, dry-run and stage without database writes", async (t) => {
  const authorityBundle = await bundle(t);
  const value = packet(authorityBundle);
  for (const mode of ["preflight", "dry-run", "stage"]) {
    const result = await runJsonPostgresExecutionMode({
      packet: value,
      approval: approval(value),
      authorityBundle,
      corpus: corpus(),
      mode,
      dmsRunner: mode === "preflight" ? null : dmsRunner(value),
    });
    assert.equal(result.outcome, "PASS");
    assert.equal(result.claims.database_write, false);
    assert.equal(result.claims.production_write, false);
    assert.equal(result.safe_counts.json_fallback_count, 0);
    assert.equal(result.safe_counts.json_writer_count, 0);
    assert.equal(result.safe_counts.dual_write_count, 0);
    assert.equal(result.safe_counts.file_current_authority_count, 0);
    assert.equal(result.safe_counts.offline_mutation_count, 0);
    assert.equal(result.safe_counts.memory_fallback_count, 0);
  }
});

test("migration executor requires all exact predecessors before commit and supports readback", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const authorityBundle = await bundle(t);
  const value = packet(authorityBundle);
  await assert.rejects(runJsonPostgresExecutionMode({
    packet: value,
    approval: approval(value),
    authorityBundle,
    corpus: corpus(),
    mode: "commit",
    pool: fixture.appPool,
    dmsRunner: dmsRunner(value),
  }), (error) => error?.code === "LAWOS_JSON_POSTGRES_PREDECESSOR");

  const predecessors = [
    predecessor("source-inventory-adjudication", value),
    predecessor("record-type-and-reference", value),
    predecessor("w12-infrastructure", value),
    predecessor("w12-sink", value),
  ];
  const committed = await runJsonPostgresExecutionMode({
    packet: value,
    approval: approval(value),
    authorityBundle,
    corpus: corpus(),
    mode: "commit",
    pool: fixture.appPool,
    negativeTenantId: "tenant_execution_b",
    predecessors,
    dmsRunner: dmsRunner(value),
  });
  assert.equal(committed.claims.database_write, true);
  assert.equal(committed.claims.production_write, false);
  assert.equal(committed.first_write_state, "NOT_PRODUCTION");
  assert.equal(committed.safe_counts.json_fallback_count, 0);
  assert.equal(committed.safe_counts.json_writer_count, 0);
  assert.equal(committed.safe_counts.dual_write_count, 0);
  assert.equal(committed.safe_counts.file_current_authority_count, 0);
  assert.equal(committed.safe_counts.offline_mutation_count, 0);
  assert.equal(committed.safe_counts.memory_fallback_count, 0);

  const readback = await runJsonPostgresExecutionMode({
    packet: value,
    approval: approval(value),
    authorityBundle,
    corpus: corpus(),
    mode: "readback",
    pool: fixture.appPool,
    negativeTenantId: "tenant_execution_b",
    dmsRunner: dmsRunner(value),
  });
  assert.equal(readback.outcome, "PASS");
  assert.equal(readback.invariant_hash, committed.invariant_hash);
  assert.equal(readback.claims.database_write, false);

  const reconciled = await runJsonPostgresExecutionMode({
    packet: value,
    approval: approval(value),
    authorityBundle,
    corpus: corpus(),
    mode: "reconcile",
    pool: fixture.appPool,
    negativeTenantId: "tenant_execution_b",
    dmsRunner: dmsRunner(value),
  });
  assert.equal(reconciled.outcome, "PASS");
  assert.equal(reconciled.claims.database_write, false);
  assert.equal(reconciled.safe_counts.tenant_negative_visible_count, 0);
  assert.equal(reconciled.safe_counts.blocking_count, 0);
  assert.ok(reconciled.performance.measurement_count > 0);
});

test("migration executor fails closed when PostgreSQL readback differs from the approved source", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const authorityBundle = await bundle(t);
  const value = packet(authorityBundle);
  const predecessors = [
    predecessor("source-inventory-adjudication", value),
    predecessor("record-type-and-reference", value),
    predecessor("w12-infrastructure", value),
    predecessor("w12-sink", value),
  ];
  await runJsonPostgresExecutionMode({
    packet: value,
    approval: approval(value),
    authorityBundle,
    corpus: corpus(),
    mode: "commit",
    pool: fixture.appPool,
    negativeTenantId: "tenant_execution_b",
    predecessors,
    dmsRunner: dmsRunner(value),
  });
  await fixture.adminPool.query(
    `UPDATE lawos_identity.accounts
        SET email = 'drifted@example.test'
      WHERE tenant_id = 'tenant_execution_a'
        AND user_id = 'user-a'`,
  );
  await assert.rejects(
    runJsonPostgresExecutionMode({
      packet: value,
      approval: approval(value),
      authorityBundle,
      corpus: corpus(),
      mode: "readback",
      pool: fixture.appPool,
      negativeTenantId: "tenant_execution_b",
      dmsRunner: dmsRunner(value),
    }),
    (error) => error?.code === "LAWOS_JSON_POSTGRES_READBACK_VARIANCE",
  );
});

test("production commit requires a signed not-started boundary and reports the irreversible transition", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const authorityBundle = await bundle(t);
  const value = packet(authorityBundle, "w13-production-cutover");
  const predecessors = [
    predecessor("w12-terminal", value),
    predecessor("cut-008", value),
    predecessor("source-freeze", value),
    predecessor("first-write-boundary", value, { first_production_write_started: false }),
  ];
  const result = await runJsonPostgresExecutionMode({
    packet: value,
    approval: approval(value),
    authorityBundle,
    corpus: corpus(),
    mode: "commit",
    pool: fixture.appPool,
    negativeTenantId: "tenant_execution_b",
    predecessors,
    dmsRunner: dmsRunner(value),
  });
  assert.equal(result.first_write_state, "FIRST_PRODUCTION_WRITE_STARTED");
  assert.equal(result.claims.production_write, true);
  assert.equal(result.claims.authority_activated, true);
});
