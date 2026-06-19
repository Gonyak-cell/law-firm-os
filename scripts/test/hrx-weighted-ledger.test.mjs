import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("HRX weighted ledger calibrates to exactly 901 unique RP30 subphases", async () => {
  const ledger = JSON.parse(await readFile("docs/hrx-weighted-implementation-ledger.json", "utf8"));
  assert.equal(ledger.hrx_implementation_subphase_count, 901);
  assert.equal(ledger.hrx_calibration.base_subphase_count, 895);
  assert.equal(ledger.hrx_calibration.supplements_count, 6);
  assert.equal(ledger.hrx_calibration.base_subphase_count + ledger.hrx_calibration.supplements_count, 901);
  const subphaseIds = ledger.entries.flatMap((entry) => entry.implementation_subphases.map((subphase) => subphase.id));
  assert.equal(subphaseIds.length, 901);
  assert.equal(new Set(subphaseIds).size, 901);
  assert.ok(subphaseIds.every((id) => id.startsWith("RP30.")));
});
