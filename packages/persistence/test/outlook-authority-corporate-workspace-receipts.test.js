import assert from "node:assert/strict";
import test from "node:test";

import {
  CLIENT_OPERATIONS_MIGRATION_CATALOG,
  selectClientOperationsMigrationTarget,
} from "../../../apps/api/src/client-operations-schema.js";
import { hashDomainValue } from "../src/domain-ledger.js";
import {
  assertOutlookAuthorityMigrationFailureReceipt,
  assertOutlookAuthorityMigrationRunReceipt,
  createOutlookAuthorityMigrationFailureSummary,
  createOutlookAuthorityMigrationRunReceipt,
} from "../src/postgres/outlook-authority-migration-receipts.js";

const HISTORICAL_79 = "43c6a087834d9dd2177be0b63fc94cf723181b93b04f40a65689b6431bd44556";
const AUTHORITY_80 = "2ef366427d98ed297ab376c8fc7e6a255cf6a054d0eaa660dc6fb7e13c814f79";
const COMBINED_81 = "8de3211a545ebb7c50813990d15f6abc215ffd23a7d09ba2149d9b37fd96e8c7";
const CORPORATE_ID = "016_dms_corporate_workspace";
const INTERNAL_ID = "309_client_internal_unsigned_installation_authority";
const SHA_A = "a".repeat(64);
const SHA_B = "b".repeat(64);
const SHA_C = "c".repeat(64);
const SHA_D = "d".repeat(64);
const IDENTITY = Object.freeze({
  session_user: "lawos_admin", current_user: "lawos_admin",
  database_oid: "123", database_name: "lawos", backend_pid: 1234,
});

function catalog(target = COMBINED_81) {
  return selectClientOperationsMigrationTarget(target).catalog.migrations;
}

function input({ target = COMBINED_81, origin = HISTORICAL_79, replay = false } = {}) {
  const changed = target === COMBINED_81 ? CORPORATE_ID : INTERNAL_ID;
  return {
    identity: IDENTITY,
    migrations: catalog(target).map(({ id, checksum }) => ({
      id, checksum, applied: !replay && id === changed,
    })),
    progress: {
      migration_phase: "internal_installation_postflight",
      outlook_authority_replay_verified: true,
      migration_applied_count: replay ? 0 : 1,
      postgres_transaction_attempted_count: replay ? 0 : 1,
      postgres_transaction_committed_count: replay ? 0 : 1,
      role_configuration_transaction_attempted_count: 0,
      role_configuration_transaction_committed_count: 0,
      outlook_assignment_transaction_committed: false,
    },
    pauseExpectation: {
      role_bootstrap_sha256: SHA_A,
      authority_manifest_sha256: SHA_B,
      database_target_receipt_sha256: SHA_C,
      migration_catalog_sha256: origin,
    },
    postflight: { role_bootstrap_sha256: SHA_A, authority_postflight_sha256: SHA_D },
    migrationCatalogSha256: target,
  };
}

function resign(value, field) {
  const { [field]: ignored, ...material } = value;
  return { ...material, [field]: hashDomainValue(material) };
}

function runReceipt(options) {
  return createOutlookAuthorityMigrationRunReceipt(input(options));
}

function failureReceipt(options = {}) {
  const { prefix, unknown = false, replay = false } = options;
  const material = input({ replay });
  if (prefix !== undefined) {
    material.migrations = material.migrations.slice(0, prefix).map((row) => ({ ...row, applied: false }));
    material.progress.migration_phase = "migration";
    material.progress.migration_applied_count = 0;
    material.progress.postgres_transaction_attempted_count = 1;
    material.progress.postgres_transaction_committed_count = unknown ? null : 0;
  }
  return createOutlookAuthorityMigrationFailureSummary({
    ...material,
    safeErrorCode: unknown ? "OUTLOOK_POSTGRES_COMMIT_UNKNOWN" : "POSTGRES_POSTFLIGHT_REJECTED",
  });
}

test("reviewed receipt pins match the exact source catalogs", () => {
  assert.equal(hashDomainValue(CLIENT_OPERATIONS_MIGRATION_CATALOG), COMBINED_81);
  assert.equal(hashDomainValue(selectClientOperationsMigrationTarget(AUTHORITY_80).catalog), AUTHORITY_80);
  assert.equal(catalog().length, 81);
  assert.deepEqual(catalog()[15], {
    id: CORPORATE_ID, source_migration_id: null,
    file_name: "016_dms_corporate_workspace.sql",
    checksum: "e9298f3043b168bf74b7d69d92b71c13ed88ebe24324f7be5538502d60ea22f7",
  });
  assert.equal(hashDomainValue(catalog().map(({ id, checksum }) => ({ id, checksum }))),
    "29530ec602b720deeb1e26625c85a3dcc1268e2bfc116b6b86bfada761cb38a7");
});

test("current target receipt carries the complete immutable bootstrap and rejects re-signed historical drift", () => {
  const request = input();
  request.pauseExpectation.schema_version = "lawos.outlook-authority-role-bootstrap-receipt.v1";
  request.databaseTargetReceiptSha256 = "e".repeat(64);
  const pin = hashDomainValue(request.pauseExpectation);
  assert.throws(() => createOutlookAuthorityMigrationRunReceipt(request));
  request.historicalOutlookBootstrapSha256 = pin;
  const receipt = createOutlookAuthorityMigrationRunReceipt(request);
  assert.equal(receipt.database_target_receipt_sha256, request.databaseTargetReceiptSha256);
  assert.equal(receipt.historical_outlook_bootstrap_receipt.database_target_receipt_sha256, SHA_C);
  assert.deepEqual(assertOutlookAuthorityMigrationRunReceipt(receipt, {
    historical_outlook_bootstrap_sha256: pin,
    database_target_receipt_sha256: request.databaseTargetReceiptSha256,
  }), receipt);
  for (const key of Object.keys(request.pauseExpectation)) {
    const changed = structuredClone(receipt);
    changed.historical_outlook_bootstrap_receipt[key] = "f".repeat(64);
    assert.throws(() => assertOutlookAuthorityMigrationRunReceipt(resign(changed, "migration_run_receipt_sha256")));
  }
  const changed = structuredClone(receipt);
  changed.historical_outlook_bootstrap_receipt.database_target_receipt_sha256 = SHA_D;
  changed.historical_outlook_bootstrap_sha256 = hashDomainValue(changed.historical_outlook_bootstrap_receipt);
  assert.throws(() => assertOutlookAuthorityMigrationRunReceipt(resign(changed, "migration_run_receipt_sha256"), {
    historical_outlook_bootstrap_sha256: pin,
  }), /expectation mismatch/u);
});

for (const target of [AUTHORITY_80, COMBINED_81]) {
  for (const replay of [false, true]) {
    test(`signed earlier bootstrap preserves its original catalog for ${target.slice(0, 8)}, replay=${replay}`, () => {
      const request = input({ target, origin: SHA_D, replay });
      request.pauseExpectation.schema_version = "lawos.outlook-authority-role-bootstrap-receipt.v1";
      request.databaseTargetReceiptSha256 = "e".repeat(64);
      assert.throws(() => createOutlookAuthorityMigrationRunReceipt(request));
      const pin = hashDomainValue(request.pauseExpectation);
      request.historicalOutlookBootstrapSha256 = pin;
      const receipt = createOutlookAuthorityMigrationRunReceipt(request);
      assert.equal(receipt.schema_version, "lawos.outlook-authority-migration-run-receipt.v3");
      assert.equal(receipt.historical_migration_catalog_sha256, SHA_D);
      assert.deepEqual(receipt.historical_outlook_bootstrap_receipt, request.pauseExpectation);
      assertOutlookAuthorityMigrationRunReceipt(receipt, { historical_outlook_bootstrap_sha256: pin });
      const forged = structuredClone(receipt);
      forged.historical_outlook_bootstrap_receipt.migration_catalog_sha256 = SHA_A;
      forged.historical_migration_catalog_sha256 = SHA_A;
      assert.throws(() => assertOutlookAuthorityMigrationRunReceipt(resign(forged, "migration_run_receipt_sha256")));
      forged.historical_outlook_bootstrap_sha256 = hashDomainValue(forged.historical_outlook_bootstrap_receipt);
      assert.throws(() => assertOutlookAuthorityMigrationRunReceipt(resign(forged, "migration_run_receipt_sha256"), {
        historical_outlook_bootstrap_sha256: pin,
      }), /expectation mismatch/u);
      assert.throws(() => runReceipt({ target, origin: SHA_D, replay }), /invalid/u);
    });
  }
}

for (const target of [AUTHORITY_80, COMBINED_81]) {
  for (const origin of [HISTORICAL_79, target]) {
    for (const replay of [false, true]) {
      test(`exact ${target === AUTHORITY_80 ? 80 : 81} receipt origin ${origin.slice(0, 8)} replay=${replay}`, () => {
        const receipt = runReceipt({ target, origin, replay });
        assert.equal(receipt.schema_version,
          `lawos.outlook-authority-migration-run-receipt.v${target === origin ? 1 : 2}`);
        assert.equal(receipt.outcome, replay ? "verified" : "appended");
        assert.equal(receipt.migration_applied_count, replay ? 0 : 1);
        assert.equal(receipt.postgres_mutation_committed_count, replay ? 0 : 1);
        assert.equal(receipt.role_configuration_transaction_committed_count, 0);
        assert.equal(receipt.outlook_assignment_transaction_committed, false);
        assert.deepEqual(receipt.migrations.filter(({ applied }) => applied).map(({ id }) => id),
          replay ? [] : [target === AUTHORITY_80 ? INTERNAL_ID : CORPORATE_ID]);
        assert.deepEqual(assertOutlookAuthorityMigrationRunReceipt(receipt, {
          migration_catalog_sha256: target, migration_catalog: catalog(target),
        }), receipt);
        assert.ok(Object.isFrozen(receipt.migrations[0]));
      });
    }
  }
}

for (const replay of [false, true]) {
  test(`combined81 rejects re-signed historical80 origin replay=${replay}`, () => {
    const receipt = {
      ...runReceipt({ replay }), historical_migration_catalog_sha256: AUTHORITY_80,
    };
    assert.throws(() => assertOutlookAuthorityMigrationRunReceipt(
      resign(receipt, "migration_run_receipt_sha256"),
    ), /invalid/u);
    assert.throws(() => runReceipt({ origin: AUTHORITY_80, replay }), /invalid/u);
  });
}

const runMutations = {
  "016 and 309 both applied": (r) => {
    r.migrations.at(-1).applied = true;
    r.migration_applied_count = r.postgres_mutation_attempt_count = r.postgres_mutation_committed_count = 2;
  },
  "309 applied instead of 016": (r) => {
    r.migrations[15].applied = false;
    r.migrations.at(-1).applied = true;
  },
  "wrong applied position": (r) => {
    r.migrations[15].applied = false;
    r.migrations[14].applied = true;
  },
  "016 checksum changed": (r) => { r.migrations[15].checksum = SHA_A; },
  "historical checksum changed": (r) => { r.migrations[4].checksum = SHA_A; },
  "309 checksum changed": (r) => { r.migrations.at(-1).checksum = SHA_A; },
  "DMS only 80 rows": (r) => { r.migrations.pop(); },
  "authority only 80 with combined target": (r) => { r.migrations.splice(15, 1); r.migration_applied_count = 0; },
  "extra row": (r) => { r.migrations.push({ id: "999_extra", checksum: SHA_A, applied: false }); },
  "wrong row order": (r) => { [r.migrations[14], r.migrations[15]] = [r.migrations[15], r.migrations[14]]; },
  "rich target changed": (r) => { r.migration_catalog_sha256 = SHA_A; },
  "rich target replaced with authority80": (r) => { r.migration_catalog_sha256 = AUTHORITY_80; },
  "historical origin unapproved": (r) => { r.historical_migration_catalog_sha256 = SHA_A; },
  "historical source equals target": (r) => { r.historical_migration_catalog_sha256 = COMBINED_81; },
  "source field smuggled into row": (r) => { r.migrations[15].source_migration_id = CORPORATE_ID; },
  "source field smuggled into receipt": (r) => { r.source_migration_id = CORPORATE_ID; },
  "applied count changed": (r) => { r.migration_applied_count = 0; },
  "extra attempt": (r) => { r.postgres_mutation_attempt_count = 2; },
  "role mutation claimed": (r) => { r.role_configuration_transaction_committed_count = 1; },
  "assignment mutation claimed": (r) => { r.outlook_assignment_transaction_committed = true; },
  "role postflight drift": (r) => { r.postflight_role_bootstrap_sha256 = SHA_D; },
  "appended relabeled as replay": (r) => { r.outcome = "verified"; },
};

for (const [name, mutate] of Object.entries(runMutations)) {
  test(`re-signed combined81 run receipt rejects ${name}`, () => {
    const changed = structuredClone(runReceipt());
    mutate(changed);
    assert.throws(() => assertOutlookAuthorityMigrationRunReceipt(
      resign(changed, "migration_run_receipt_sha256"),
    ), TypeError);
  });
}

test("receipt digest remains required independently of the approved catalog", () => {
  assert.throws(() => assertOutlookAuthorityMigrationRunReceipt({
    ...runReceipt(), migration_run_receipt_sha256: SHA_A,
  }), /invalid/u);
});

test("a changed source mapping cannot retain validity with the same ledger rows", () => {
  const source = structuredClone(CLIENT_OPERATIONS_MIGRATION_CATALOG);
  source.migrations[15].source_migration_id = CORPORATE_ID;
  const receipt = {
    ...runReceipt(), migration_catalog_sha256: hashDomainValue(source),
  };
  assert.throws(() => assertOutlookAuthorityMigrationRunReceipt(
    resign(receipt, "migration_run_receipt_sha256"),
  ), /invalid/u);
});

test("same-target v1 verified receipts still require the exact full catalog", () => {
  for (const target of [AUTHORITY_80, COMBINED_81]) {
    const receipt = structuredClone(runReceipt({ target, origin: target, replay: true }));
    receipt.migrations[0].checksum = SHA_A;
    assert.throws(() => assertOutlookAuthorityMigrationRunReceipt(
      resign(receipt, "migration_run_receipt_sha256"),
    ), /invalid/u);
  }
});

test("combined81 rejects a re-signed fresh committed receipt while legacy80 parsing remains valid", () => {
  for (const target of [AUTHORITY_80, COMBINED_81]) {
    const receipt = structuredClone(runReceipt({ target, origin: target }));
    receipt.outcome = "committed";
    receipt.migrations.forEach((row) => { row.applied = true; });
    receipt.migration_applied_count = receipt.migrations.length;
    receipt.role_configuration_transaction_committed_count = 1;
    receipt.postgres_mutation_attempt_count = receipt.migrations.length + 1;
    receipt.postgres_mutation_committed_count = receipt.postgres_mutation_attempt_count;
    receipt.outlook_assignment_transaction_committed = true;
    const resigned = resign(receipt, "migration_run_receipt_sha256");
    if (target === COMBINED_81) {
      assert.throws(() => assertOutlookAuthorityMigrationRunReceipt(resigned), /invalid/u);
    } else {
      assert.deepEqual(assertOutlookAuthorityMigrationRunReceipt(resigned), resigned);
    }
  }
});

test("DMS-only80 cannot produce a verified receipt under any target digest", () => {
  for (const target of [AUTHORITY_80, COMBINED_81,
    "b9e0dabe9df63e4001c566676ac9a7829b61f58ad67cf29968a49bf98442770d"]) {
    const receipt = structuredClone(runReceipt({ replay: true }));
    receipt.migrations.pop();
    receipt.migration_catalog_sha256 = target;
    assert.throws(() => assertOutlookAuthorityMigrationRunReceipt(
      resign(receipt, "migration_run_receipt_sha256"),
    ), /invalid/u);
  }
});

test("81 replay cannot conceal a repeated 016 write", () => {
  const receipt = structuredClone(runReceipt({ replay: true }));
  receipt.migrations[15].applied = true;
  receipt.migration_applied_count = receipt.postgres_mutation_attempt_count = receipt.postgres_mutation_committed_count = 1;
  assert.throws(() => assertOutlookAuthorityMigrationRunReceipt(
    resign(receipt, "migration_run_receipt_sha256"),
  ), /invalid/u);
});

test("committed 016 survives postflight failure as one known committed transaction", () => {
  const receipt = failureReceipt();
  assert.equal(receipt.outcome, "partial");
  assert.equal(receipt.failure_phase, "internal_installation_postflight");
  assert.equal(receipt.migrations.length, 81);
  assert.deepEqual(receipt.migrations.filter(({ applied }) => applied).map(({ id }) => id), [CORPORATE_ID]);
  assert.equal(receipt.postgres_mutation_attempt_count, 1);
  assert.equal(receipt.postgres_mutation_committed_count, 1);
  assert.deepEqual(assertOutlookAuthorityMigrationFailureReceipt(receipt, {
    migration_catalog_sha256: COMBINED_81, migration_catalog: catalog(),
  }), receipt);
});

test("016 SQL failure and COMMIT uncertainty retain only the 15 known unchanged rows", () => {
  for (const unknown of [false, true]) {
    const receipt = failureReceipt({ prefix: 15, unknown });
    assert.equal(receipt.outcome, unknown ? "partial" : "failed");
    assert.equal(receipt.migrations.length, 15);
    assert.ok(receipt.migrations.every(({ applied }) => !applied));
    assert.equal(receipt.migration_applied_count, 0);
    assert.equal(receipt.postgres_mutation_committed_count, unknown ? null : 0);
    assert.deepEqual(assertOutlookAuthorityMigrationFailureReceipt(receipt, {
      migration_catalog_sha256: COMBINED_81, migration_catalog: catalog(),
    }), receipt);
  }
});

test("postflight replay failure records zero writes against full81", () => {
  const receipt = failureReceipt({ replay: true });
  assert.equal(receipt.outcome, "failed");
  assert.equal(receipt.postgres_mutation_attempt_count, 0);
  assert.equal(receipt.migration_applied_count, 0);
  assert.ok(receipt.migrations.every(({ applied }) => !applied));
});

test("failure before the result loop has an empty result and no mutation", () => {
  const material = input({ replay: true });
  material.migrations = [];
  material.progress.migration_phase = "outlook_authority_replay";
  const receipt = createOutlookAuthorityMigrationFailureSummary({
    ...material, postflight: null, safeErrorCode: "POSTGRES_POSTFLIGHT_REJECTED",
  });
  assert.deepEqual(receipt.migrations, []);
  assert.equal(receipt.postgres_mutation_attempt_count, 0);
  assert.equal(receipt.postgres_mutation_committed_count, 0);
  assert.equal(receipt.outcome, "failed");
});

test("ordinary failure receipts retain generic row and caller catalog validation", () => {
  const material = input({ replay: true });
  material.migrations = material.migrations.slice(0, 3);
  material.migrationCatalogSha256 = SHA_D;
  const receipt = createOutlookAuthorityMigrationFailureSummary({
    ...material, safeErrorCode: "POSTGRES_OPERATION_FAILED",
  });
  assert.deepEqual(assertOutlookAuthorityMigrationFailureReceipt(receipt, {
    migration_catalog: material.migrations,
  }), receipt);
  for (const field of ["id", "checksum"]) {
    const changed = structuredClone(receipt);
    changed.migrations[0][field] = field === "id" ? "001_other" : SHA_A;
    assert.throws(() => assertOutlookAuthorityMigrationFailureReceipt(
      resign(changed, "failure_receipt_sha256"),
      { migration_catalog: material.migrations },
    ), /catalog mismatch/u);
  }
  const reordered = { ...receipt, migrations: [...receipt.migrations].reverse() };
  assert.throws(() => assertOutlookAuthorityMigrationFailureReceipt(
    resign(reordered, "failure_receipt_sha256"),
  ), /invalid/u);
});

const prefixMutations = {
  "different checksum": (r) => { r.migrations[4].checksum = SHA_A; },
  "different id": (r) => { r.migrations[4].id = "005_other"; },
  "missing row": (r) => { r.migrations.pop(); },
  "extra row": (r) => { r.migrations.push({ ...catalog()[15], applied: false }); },
  "wrong phase": (r) => { r.failure_phase = "internal_installation_postflight"; },
  "additional transaction": (r) => { r.postgres_mutation_attempt_count = 2; },
  "role mutation": (r) => {
    r.role_configuration_transaction_committed_count = 1;
    r.postgres_mutation_attempt_count = 2;
    r.postgres_mutation_committed_count = 1;
  },
};

for (const [name, mutate] of Object.entries(prefixMutations)) {
  test(`re-signed 016 failure prefix rejects ${name}`, () => {
    const changed = structuredClone(failureReceipt({ prefix: 15 }));
    mutate(changed);
    assert.throws(() => assertOutlookAuthorityMigrationFailureReceipt(
      resign(changed, "failure_receipt_sha256"),
    ), TypeError);
  });
}

const failureMutations = {
  "016 and 309 both applied": runMutations["016 and 309 both applied"],
  "309 applied instead of 016": runMutations["309 applied instead of 016"],
  "wrong applied position": runMutations["wrong applied position"],
  "wrong checksum": runMutations["016 checksum changed"],
  "wrong rich target": runMutations["rich target changed"],
  "extra attempted mutation": runMutations["extra attempt"],
  "assignment mutation claimed": runMutations["assignment mutation claimed"],
  "wrong post-commit phase": (r) => { r.failure_phase = "migration"; },
  "partial16 claimed as postflight": (r) => { r.migrations = r.migrations.slice(0, 16); },
  "partial17 claimed as postflight": (r) => { r.migrations = r.migrations.slice(0, 17); },
  "known commit relabeled unknown": (r) => { r.failure_safe_error_code = "OUTLOOK_POSTGRES_COMMIT_UNKNOWN"; },
  "role commit substituted": (r) => {
    r.role_configuration_transaction_committed_count = 1;
    r.postgres_mutation_committed_count = r.postgres_mutation_attempt_count = 2;
  },
};

for (const [name, mutate] of Object.entries(failureMutations)) {
  test(`re-signed combined81 failure receipt rejects ${name}`, () => {
    const changed = structuredClone(failureReceipt());
    mutate(changed);
    assert.throws(() => assertOutlookAuthorityMigrationFailureReceipt(
      resign(changed, "failure_receipt_sha256"),
    ), TypeError);
  });
}
