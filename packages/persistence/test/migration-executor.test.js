import assert from "node:assert/strict";
import test from "node:test";
import { createJsonPostgresAuthorityBundle, JSON_POSTGRES_AUTHORITY_DECISIONS_VERSION } from "../src/postgres/authority-bundle.js";
import { runJsonPostgresExecutionMode } from "../src/postgres/migration-executor.js";
import { createJsonPostgresRecordTypeCatalog } from "../src/postgres/record-type-catalog.js";
import { JSON_POSTGRES_SOURCE_INVENTORY_VERSION } from "../src/postgres/source-inventory.js";
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

async function bundle() {
  const source = corpus();
  const recordTypeCatalog = createJsonPostgresRecordTypeCatalog({ corpus: source });
  const inventory = {
    schema_version: JSON_POSTGRES_SOURCE_INVENTORY_VERSION,
    generated_at: "2026-07-23T00:00:00.000Z",
    roots: [{ root_ref: "runtime-primary", exists: true, candidate_file_count: 1 }],
    sources: [{
      root_ref: "runtime-primary",
      source_ref: "f".repeat(32),
      source_family: "matter",
      sha256: "e".repeat(64),
      byte_size: 1,
      mtime: "2026-07-23T00:00:00.000Z",
      mode: "0600",
      schema_version: null,
      tenant_count: 1,
      record_type_count: 1,
      record_count: 1,
      generation_ref: "d".repeat(24),
      classification: "manual-review",
      parse_error: false,
      parse_skipped: false,
      oversized_unparsed: false,
    }],
    classification_counts: {
      authoritative: 0, superseded: 0, duplicate: 0, synthetic: 0, corrupt: 0, "manual-review": 1,
    },
    field_contract: { field_count: 0, disposition_counts: {}, fields: [], silent_drop_count: 0 },
    reconciliation: {},
    unavailable_external_sources: [],
    claims: {
      authority_selected_by_mtime: false,
      raw_value_returned: false,
      pii_returned: false,
      secret_material_returned: false,
      real_data_mutated: false,
      production_contacted: false,
    },
    inventory_sha256: "1".repeat(64),
    inventory_content_sha256: "2".repeat(64),
  };
  const decisions = {
    schema_version: JSON_POSTGRES_AUTHORITY_DECISIONS_VERSION,
    decision_set_ref: "execution-decisions-001",
    inventory_content_sha256: inventory.inventory_content_sha256,
    record_type_catalog_sha256: recordTypeCatalog.catalog_sha256,
    approved_root_refs: ["runtime-primary"],
    decisions: [{
      source_ref: "f".repeat(32),
      sha256: "e".repeat(64),
      classification: "authoritative",
      reason_code: "OWNER_SELECTED",
      decision_ref: "owner-row-001",
    }],
    field_overrides: [],
    expected_rejections: [],
  };
  return createJsonPostgresAuthorityBundle({ inventory, decisions, recordTypeCatalog, corpus: source });
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
    const writes = ["commit", "resume"].includes(mode);
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
        provider_write: writes,
        postgres_metadata_write: writes,
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

test("migration executor separates preflight, dry-run and stage without database writes", async () => {
  const authorityBundle = await bundle();
  const value = packet(authorityBundle);
  for (const mode of ["preflight", "dry-run", "stage", "reconcile"]) {
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
  }
});

test("migration executor requires all exact predecessors before commit and supports readback", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const authorityBundle = await bundle();
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
});

test("production commit requires a signed not-started boundary and reports the irreversible transition", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const authorityBundle = await bundle();
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
