import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  JSON_POSTGRES_BACKUP_RESTORE_COMPONENT_IDS,
  JSON_POSTGRES_BACKUP_RESTORE_STATE_VERSION,
  assertExactJsonPostgresBackupRestore,
  createJsonPostgresBackupRestoreState,
  validateJsonPostgresBackupRestoreState,
} from "../src/postgres/backup-restore-state-contract.js";

const SOURCE = "a".repeat(40);
const TREE = "b".repeat(40);
const PILOT = "amic-law-external-pilot-20260813";
const LAWOS_TENANT = "tenant_amic_matter_vault";
const ENTRA_TENANT = "2f10d109-c2ad-43a4-a813-4dea28119e52";
const AUTHORITY_MANIFEST = "c".repeat(64);

function input(overrides = {}) {
  return {
    source_sha: SOURCE,
    source_tree: TREE,
    pilot_id: PILOT,
    lawos_tenant_id: LAWOS_TENANT,
    entra_tenant_id: ENTRA_TENANT,
    backup_point_at: "2026-08-13T00:00:00.000Z",
    authority_manifest_sha256: AUTHORITY_MANIFEST,
    components: JSON_POSTGRES_BACKUP_RESTORE_COMPONENT_IDS.map((component_id, index) => ({
      component_id,
      item_count: index,
      content_sha256: (index.toString(16)).repeat(64),
    })),
    ...overrides,
  };
}

function state(overrides = {}) {
  return createJsonPostgresBackupRestoreState(input(overrides));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

test("backup/restore state is invariant to input component order and canonicalizes sorted components", () => {
  const shuffled = [...input().components].reverse();
  const first = state();
  const second = state({ components: shuffled });
  assert.equal(first.state_sha256, second.state_sha256);
  assert.deepEqual(
    second.components.map(({ component_id }) => component_id),
    [...JSON_POSTGRES_BACKUP_RESTORE_COMPONENT_IDS].sort(),
  );
  assert.equal(first.schema_version, JSON_POSTGRES_BACKUP_RESTORE_STATE_VERSION);
  assert.equal(validateJsonPostgresBackupRestoreState(second).valid, true);
  const source = readFileSync(new URL("../src/postgres/index.js", import.meta.url), "utf8");
  assert.match(source, /export \* from "\.\/backup-restore-state-contract\.js";/u);
});

test("backup/restore state digest is invariant to root and component key insertion order", () => {
  const original = input();
  const reordered = Object.fromEntries(Object.entries(original).reverse());
  reordered.components = original.components.map((component) => Object.fromEntries(Object.entries(component).reverse()));
  assert.equal(
    createJsonPostgresBackupRestoreState(original).state_sha256,
    createJsonPostgresBackupRestoreState(reordered).state_sha256,
  );
});

test("backup/restore state has a closed root and component schema", () => {
  const value = state();
  assert.throws(() => validateJsonPostgresBackupRestoreState({
    ...clone(value),
    unexpected: true,
  }), /unsupported/u);
  assert.throws(() => validateJsonPostgresBackupRestoreState({
    ...clone(value),
    components: clone(value.components).slice(1),
  }), /exactly|missing/u);
  const componentExtra = clone(value);
  componentExtra.components[0].unexpected = true;
  assert.throws(() => validateJsonPostgresBackupRestoreState(componentExtra), /unsupported/u);
  const duplicate = clone(value);
  duplicate.components[1].component_id = duplicate.components[0].component_id;
  assert.throws(() => validateJsonPostgresBackupRestoreState(duplicate), /duplicate|missing/u);
  const unknown = clone(value);
  unknown.components[0].component_id = "unknown_component";
  assert.throws(() => validateJsonPostgresBackupRestoreState(unknown), /unsupported/u);
});

test("backup/restore creation rejects missing and extra input fields before hashing", () => {
  const base = input();
  const missingRootField = { ...base };
  delete missingRootField.pilot_id;
  assert.throws(() => createJsonPostgresBackupRestoreState(missingRootField), /missing/u);
  assert.throws(() => createJsonPostgresBackupRestoreState({ ...base, state_sha256: "e".repeat(64) }), /unsupported/u);
  assert.throws(() => createJsonPostgresBackupRestoreState({ ...base, extra: true }), /unsupported/u);
  const missingComponentField = input({
    components: base.components.map((component) => ({ ...component })),
  });
  delete missingComponentField.components[0].content_sha256;
  assert.throws(() => createJsonPostgresBackupRestoreState(missingComponentField), /missing/u);
});

test("backup/restore state rejects malformed bindings, counts, and hashes", () => {
  const value = state();
  const malformed = [
    { ...clone(value), source_sha: "A".repeat(40) },
    { ...clone(value), source_tree: "short" },
    { ...clone(value), pilot_id: "not allowed" },
    { ...clone(value), lawos_tenant_id: ENTRA_TENANT },
    { ...clone(value), entra_tenant_id: "not-a-uuid" },
    { ...clone(value), backup_point_at: "2026-08-13T00:00:00+09:00" },
    { ...clone(value), backup_point_at: "2026-02-30T00:00:00.000Z" },
    { ...clone(value), backup_point_at: "2026-08-13T24:00:00.000Z" },
    { ...clone(value), authority_manifest_sha256: "not-a-hash" },
    { ...clone(value), state_sha256: "e".repeat(64) },
  ];
  for (const candidate of malformed) {
    assert.throws(() => validateJsonPostgresBackupRestoreState(candidate));
  }
  const negativeCount = clone(value);
  negativeCount.components[0].item_count = -1;
  assert.throws(() => validateJsonPostgresBackupRestoreState(negativeCount), /item_count|digest/u);
  const unsafeCount = clone(value);
  unsafeCount.components[0].item_count = Number.MAX_SAFE_INTEGER + 1;
  assert.throws(() => validateJsonPostgresBackupRestoreState(unsafeCount), /item_count|digest/u);
});

test("backup/restore state detects component, binding, and state digest tamper", () => {
  const value = state();
  const componentTamper = clone(value);
  componentTamper.components[0].content_sha256 = "e".repeat(64);
  assert.throws(() => validateJsonPostgresBackupRestoreState(componentTamper), /digest/u);
  const bindingTamper = clone(value);
  bindingTamper.pilot_id = "other-pilot";
  assert.throws(() => validateJsonPostgresBackupRestoreState(bindingTamper), /digest/u);
  const sourceDrift = clone(value);
  assert.throws(() => validateJsonPostgresBackupRestoreState(sourceDrift, { sourceSha: "f".repeat(40) }), /drifted/u);
  assert.throws(() => validateJsonPostgresBackupRestoreState(value, {
    sourceSha: SOURCE,
    source_sha: SOURCE,
  }), /unsupported/u);
  assert.throws(() => validateJsonPostgresBackupRestoreState(value, { unverified_claim: false }), /unsupported/u);
  for (const [key, expected] of [
    ["sourceTree", "f".repeat(40)],
    ["pilotId", "other-pilot"],
    ["lawosTenantId", "other-lawos-tenant"],
    ["entraTenantId", "3f10d109-c2ad-43a4-a813-4dea28119e52"],
    ["backupPointAt", "2026-08-13T00:00:01.000Z"],
    ["authorityManifestSha256", "f".repeat(64)],
    ["stateSha256", "f".repeat(64)],
  ]) {
    assert.throws(() => validateJsonPostgresBackupRestoreState(value, { [key]: expected }), /drifted/u);
  }
});

test("backup/restore validation requires canonical component order", () => {
  const value = state();
  const reordered = clone(value);
  reordered.components.reverse();
  assert.throws(() => validateJsonPostgresBackupRestoreState(reordered), /canonical sorted order|digest/u);
});

test("assertExact revalidates both states and returns only exact safe hashes", () => {
  const expected = state();
  const restored = clone(expected);
  const result = assertExactJsonPostgresBackupRestore({ expected, restored });
  assert.deepEqual(result, {
    valid: true,
    exact_state_match: true,
    provider_restore_observed: false,
    expected_state_sha256: expected.state_sha256,
    restored_state_sha256: restored.state_sha256,
  });
  assert.equal(Object.hasOwn(result, "components"), false);
  const tupleDrift = clone(expected);
  tupleDrift.backup_point_at = "2026-08-13T00:00:01.000Z";
  assert.throws(() => assertExactJsonPostgresBackupRestore({ expected, restored: tupleDrift }), /digest|mismatched/u);
  const invalidRestored = clone(expected);
  invalidRestored.state_sha256 = "f".repeat(64);
  assert.throws(() => assertExactJsonPostgresBackupRestore({ expected, restored: invalidRestored }), /digest/u);
});

test("backup/restore validation rejects an unsafe aggregate item count", () => {
  const overflow = input({
    components: JSON_POSTGRES_BACKUP_RESTORE_COMPONENT_IDS.map((component_id) => ({
      component_id,
      item_count: Number.MAX_SAFE_INTEGER,
      content_sha256: "e".repeat(64),
    })),
  });
  assert.throws(() => createJsonPostgresBackupRestoreState(overflow), /aggregate item count|safe integer/u);
});
