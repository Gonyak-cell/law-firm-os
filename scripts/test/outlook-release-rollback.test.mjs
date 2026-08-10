import assert from "node:assert/strict";
import { readFile, rm, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  openProtectedEvidenceRoot, validateProtectedRollbackEvidence, validateRollbackContract,
} from "../lib/outlook-release-gates.mjs";
import { createProtectedFixtureRoot, writeProtectedJson } from "./helpers/protected-fixture.mjs";
import { createRollbackEvidenceFixture } from "./helpers/rollback-evidence-fixture.mjs";
import {
  baseline, clone, contract, oid, rollback,
} from "./helpers/outlook-release-fixtures.mjs";

async function fixture(t, options) {
  const root = await createProtectedFixtureRoot();
  t.after(() => rm(root, { recursive: true, force: true }));
  const values = await createRollbackEvidenceFixture(root, baseline, rollback, options);
  return { root, store: openProtectedEvidenceRoot(root), ...values };
}

test("rollback reads each manifest, inventory, and artifact byte before accepting exact restoration", async (t) => {
  const current = await fixture(t);
  const result = validateProtectedRollbackEvidence(current.rollback, current.baseline, contract, current.store);
  assert.ok(result.profiles.every((profile) => !("assignment_count" in profile)
    && !("assignment_fingerprint_sha256" in profile)));
  assert.deepEqual(result.profiles.map(({ profile, static_artifact_count }) => ({ profile, static_artifact_count })), [
    { profile: "matter-full", static_artifact_count: 4 },
    { profile: "inquiry-only", static_artifact_count: 2 },
  ]);
});

test("protected inquiry rollback rejects a Matter-namespace module dependency", async (t) => {
  const crossed = await fixture(t, { inquiryAssetPrefix: "/addin" });
  assert.throws(
    () => validateProtectedRollbackEvidence(crossed.rollback, crossed.baseline, contract, crossed.store),
    /taskpane is not bound to its profile namespace/,
  );

  const crossedStylesheet = await fixture(t, { inquiryStylesheetPrefix: "/addin" });
  assert.throws(
    () => validateProtectedRollbackEvidence(
      crossedStylesheet.rollback, crossedStylesheet.baseline, contract, crossedStylesheet.store,
    ),
    /taskpane is not bound to its profile namespace/,
  );

  const absolute = await fixture(t, { inquiryAssetPrefix: "https://rollback.invalid/outlook-addin" });
  assert.throws(
    () => validateProtectedRollbackEvidence(absolute.rollback, absolute.baseline, contract, absolute.store),
    /taskpane is not bound to its profile namespace/,
  );
});

test("rollback contract rejects missing, shared, swapped, or stale profile artifacts", () => {
  const missing = clone(rollback);
  delete missing.profiles[0].entry_bundle;
  assert.throws(() => validateRollbackContract(missing, baseline, contract), /fields mismatch/);

  const shared = clone(rollback);
  shared.profiles[1].static_inventory.protected_inventory_ref = shared.profiles[0].static_inventory.protected_inventory_ref;
  shared.profiles[1].static_inventory.protected_inventory_sha256 = shared.profiles[0].static_inventory.protected_inventory_sha256;
  assert.throws(() => validateRollbackContract(shared, baseline, contract), /shared/);

  const sharedBytes = clone(rollback);
  sharedBytes.profiles[1].entry_bundle.sha256 = sharedBytes.profiles[0].entry_bundle.sha256;
  assert.throws(() => validateRollbackContract(sharedBytes, baseline, contract), /entry bytes are shared/);

  const swapped = clone(rollback);
  [swapped.profiles[0].entry_bundle, swapped.profiles[1].entry_bundle] = [
    swapped.profiles[1].entry_bundle, swapped.profiles[0].entry_bundle,
  ];
  assert.throws(() => validateRollbackContract(swapped, baseline, contract), /task-pane\/entry path drifted/);

  const stale = clone(rollback);
  stale.profiles[0].source_sha = oid("f");
  assert.throws(() => validateRollbackContract(stale, baseline, contract), /identity\/baseline drifted/);
});

test("protected rollback rejects missing, swapped, stale, and hash-mismatched real bytes", async (t) => {
  const missing = await fixture(t);
  const missingRef = missing.rollback.profiles[0].entry_bundle.protected_artifact_ref;
  await unlink(path.join(missing.root, missingRef));
  assert.throws(
    () => validateProtectedRollbackEvidence(missing.rollback, missing.baseline, contract, missing.store),
    /ENOENT/,
  );

  const swapped = await fixture(t);
  const [matter, inquiry] = swapped.rollback.profiles;
  [matter.static_inventory, inquiry.static_inventory] = [inquiry.static_inventory, matter.static_inventory];
  assert.throws(
    () => validateProtectedRollbackEvidence(swapped.rollback, swapped.baseline, contract, swapped.store),
    /stale or identity-swapped/,
  );

  const stale = await fixture(t);
  const staleProfile = stale.rollback.profiles[0];
  const inventoryPath = path.join(stale.root, staleProfile.static_inventory.protected_inventory_ref);
  const inventory = JSON.parse(await readFile(inventoryPath, "utf8"));
  inventory.version = "1.0.1.0";
  const binding = await writeProtectedJson(stale.root, staleProfile.static_inventory.protected_inventory_ref, inventory);
  staleProfile.static_inventory.protected_inventory_sha256 = binding.evidence_sha256;
  assert.throws(
    () => validateProtectedRollbackEvidence(stale.rollback, stale.baseline, contract, stale.store),
    /stale or identity-swapped/,
  );

  const mismatched = await fixture(t);
  const entryRef = mismatched.rollback.profiles[1].entry_bundle.protected_artifact_ref;
  await writeFile(path.join(mismatched.root, entryRef), "changed rollback bytes\n", { mode: 0o600 });
  assert.throws(
    () => validateProtectedRollbackEvidence(mismatched.rollback, mismatched.baseline, contract, mismatched.store),
    /SHA-256 mismatch/,
  );
});
