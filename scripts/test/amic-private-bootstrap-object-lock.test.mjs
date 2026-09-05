import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test, { after } from "node:test";
import * as production from "../lib/amic-private-bootstrap-production.mjs";
import {
  adapter,
  closeAdapters,
} from "../../packages/dms/test/s3-storage-adapter-test-helpers.js";

after(closeAdapters);

function configuration(retention = { Mode: "GOVERNANCE", Days: 365 }) {
  return {
    ObjectLockConfiguration: {
      ObjectLockEnabled: "Enabled",
      Rule: { DefaultRetention: retention },
    },
  };
}

test("operator enables retention-aware staging only after exact bucket readback", () => {
  const source = readFileSync(new URL("../run-amic-private-bootstrap-migration.mjs", import.meta.url), "utf8");
  assert.equal(/object_lock_enabled: objectLock\.object_lock_enabled/u.test(source), true);
  const readback = source.indexOf('"s3api", "get-object-lock-configuration"');
  assert.ok(readback > source.indexOf('phase = "storage-controls"'));
  assert.ok(readback < source.indexOf('phase = "database-readiness"'));
  assert.match(source.slice(readback, readback + 250), /target\.photo_bucket_name/u);
  assert.match(source.slice(readback, readback + 250), /target\.photo_expected_bucket_owner/u);
  assert.doesNotMatch(source, /bypass-governance|BypassGovernanceRetention/u);
});

test("private bootstrap validates and safely projects bucket-default Object Lock", () => {
  for (const mode of ["GOVERNANCE", "COMPLIANCE"]) {
    for (const duration of [{ Days: 365 }, { Years: 1 }]) {
      const receipt = production.validateAmicPrivateBootstrapObjectLock(
        configuration({ Mode: mode, ...duration }),
      );
      assert.deepEqual(receipt, {
        object_lock_enabled: true,
        default_retention_mode: mode,
        default_retention_days: duration.Days ?? null,
        default_retention_years: duration.Years ?? null,
        retention_mutated: false,
        staged_cleanup_policy: "defer_while_retained",
      });
      assert.equal(Object.isFrozen(receipt), true);
    }
  }
});

test("private bootstrap rejects absent or ambiguous retention before storage writes", () => {
  const cases = [
    null, {}, { ObjectLockConfiguration: { ObjectLockEnabled: "Disabled" } },
    { ObjectLockConfiguration: { ObjectLockEnabled: "Enabled" } },
    ...[
      {}, { Mode: "OFF", Days: 365 }, { Mode: "GOVERNANCE" },
      { Mode: "GOVERNANCE", Days: 0 }, { Mode: "GOVERNANCE", Days: -1 },
      { Mode: "GOVERNANCE", Days: 1.5 }, { Mode: "GOVERNANCE", Days: "365" },
      { Mode: "GOVERNANCE", Days: 36501 }, { Mode: "COMPLIANCE", Years: 101 },
      { Mode: "COMPLIANCE", Years: 0 }, { Mode: "COMPLIANCE", Years: 1, Days: 365 },
    ].map(configuration),
  ];
  for (const value of cases) {
    assert.throws(() => production.validateAmicPrivateBootstrapObjectLock(value), {
      code: "AMIC_PRIVATE_BOOTSTRAP_OBJECT_LOCK",
    });
  }
});

test("retained photo finalize preserves staged and committed versions and is replayable", async () => {
  const control = production.validateAmicPrivateBootstrapObjectLock(configuration());
  const now = new Date("2026-09-05T00:00:00.000Z");
  const storage = adapter({
    object_lock_enabled: control.object_lock_enabled,
    provider: { defaultRetentionUntil: "2027-09-05T00:00:00.000Z", now: () => now },
    clock: () => now,
  });
  const input = { tenant_id: "tenant-import", session_id: "approved-packet", object_id: "photo-1", bytes: Buffer.from("synthetic image bytes") };
  const staged = await storage.stageObject(input);
  const committed = await storage.finalizeObject(input);
  assert.equal(committed.staged_cleanup_deferred, true);
  assert.equal(committed.default_retention_applied, false);
  assert.equal((await storage.statStagedObject(input)).version_id, staged.version_id);
  const replay = await storage.finalizeObject(input);
  assert.equal(replay.version_id, committed.version_id);
  assert.equal(replay.staged_cleanup_deferred, true);
  const downloaded = await storage.getObject(input);
  assert.deepEqual(downloaded.bytes, input.bytes);
  assert.equal(downloaded.sha256, committed.sha256);
  assert.equal(await storage.statObject({ ...input, tenant_id: "tenant-other" }), null);
});
