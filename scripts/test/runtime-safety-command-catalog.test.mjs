import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildRuntimeSafetyRerunManifest, parseRuntimeSafetyCommandCatalog, REQUIRED_SELECTORS } from "../lib/runtime-safety-command-catalog.mjs";

const CATALOG = readFileSync(".omo/plans/lawos-runtime-safety-147-command-catalog-20260717.md", "utf8");
const EXPECTED_SHA256 = "4b2b612cbb33e407f2a57cf552cd7188360a94ef3e56e03322d0cd5adcdaf0d7";

test("147 command catalog is bijective, closed, and hash-bound", () => {
  const parsed = parseRuntimeSafetyCommandCatalog(CATALOG, { expectedSha256: EXPECTED_SHA256 });
  assert.equal(parsed.rows.length, 147);
  assert.equal(new Set(parsed.rows.map((row) => row.tuw_id)).size, 147);
  assert.deepEqual([...new Set(parsed.rows.map((row) => row.selector))].sort(), [...REQUIRED_SELECTORS].sort());
  assert.ok(parsed.rows.every((row) => row.result_slice === `isolated:${row.tuw_id}:all`));
});

test("materialized manifest closes all 113 historical and 34 post-legacy recipes", () => {
  const manifest = buildRuntimeSafetyRerunManifest(CATALOG, { expectedSha256: EXPECTED_SHA256 });
  assert.equal(manifest.tuw_count, 147);
  assert.equal(manifest.historical_tuw_count, 113);
  assert.equal(manifest.post_legacy_tuw_count, 34);
  for (const row of manifest.rows) {
    assert.ok(row.commands);
    assert.ok(Object.keys(row.outcomes).length >= 2);
    for (const outcome of Object.values(row.outcomes)) {
      assert.equal(typeof outcome.claims.verified, "boolean");
      assert.ok(Array.isArray(outcome.required_artifacts));
    }
  }
});

test("catalog validator rejects hash drift, missing recipes, undefined variables, and overlapping slices", () => {
  assert.throws(() => parseRuntimeSafetyCommandCatalog(CATALOG, { expectedSha256: "0".repeat(64) }), (error) => error.code === "CATALOG_HASH_DRIFT");
  assert.throws(() => parseRuntimeSafetyCommandCatalog(CATALOG.replace("R_GOV_BASE | command", "R_UNKNOWN | command")), (error) => error.code === "CATALOG_RECIPE");
  assert.throws(() => parseRuntimeSafetyCommandCatalog(CATALOG.replace('"--target", "{{TARGET_CHECKOUT}}"', '"--target", "{{UNDEFINED_VALUE}}"')), (error) => error.code === "CATALOG_UNDEFINED_VARIABLE");
  assert.throws(() => parseRuntimeSafetyCommandCatalog(CATALOG.replace("isolated:RS-GOV-001:all", "isolated:RS-GOV-002:all")), (error) => error.code === "CATALOG_RESULT_SLICE");
});
