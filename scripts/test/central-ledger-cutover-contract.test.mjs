import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
import test from "node:test";
import {
  CUT_DEPENDENCY_BUNDLE_SCHEMA,
  CUT_DEPENDENCY_SLOTS,
  validateCutDependencyBundle,
} from "../lib/central-ledger-cutover-contract.mjs";

const SOURCE_SHA = "a".repeat(40);
const SOURCE_TREE = "b".repeat(40);
const LANE_SHA = "c".repeat(40);

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function fixture({ terminal = false } = {}) {
  const root = mkdtempSync(join(tmpdir(), "lawos-cut-bundle-"));
  const artifacts = CUT_DEPENDENCY_SLOTS.map((slot) => {
    let value;
    if (slot.kind === "receipt") {
      const verified = slot.key.startsWith("dms-") || terminal;
      value = {
        tuw_id: slot.tuw_id,
        target_source_sha: LANE_SHA,
        implementation_state: verified ? "VERIFIED" : "READY",
        execution_state: verified ? "NOT_APPLICABLE" : "APPROVAL_REQUIRED",
        claims: { verified },
      };
    } else if (slot.kind === "dms-source-readiness") {
      value = { source_sha: LANE_SHA, verdict: "PASS", claims: { source_checkpoint_verified: true } };
    } else if (slot.kind === "prj-outcome") {
      value = { source_sha: LANE_SHA, outcome: terminal ? "approved" : "pending", verified: terminal };
    } else {
      value = { source_sha: LANE_SHA, outcome: terminal ? "disabled" : "pending", verified: terminal };
    }
    const path = `${slot.key}.json`;
    const bytes = Buffer.from(`${JSON.stringify(value)}\n`);
    writeFileSync(join(root, path), bytes);
    return { ...slot, path, sha256: sha256(bytes), source_sha: LANE_SHA };
  });
  return {
    root,
    bundle: {
      schema_version: CUT_DEPENDENCY_BUNDLE_SCHEMA,
      source_sha: SOURCE_SHA,
      source_tree: SOURCE_TREE,
      artifacts,
      claims: { external_actions_executed: 0, real_data_used: false, release_executed: false, go_live: false },
    },
  };
}

test("CUT dependency bundle preserves exact pending blockers without upgrading CUT-002", () => {
  const f = fixture();
  const result = validateCutDependencyBundle(f.bundle, { root: f.root, expectedSourceSha: SOURCE_SHA, expectedSourceTree: SOURCE_TREE });
  assert.equal(result.dependency_satisfied, false);
  assert.deepEqual(result.blockers, ["RS-PRJ-005/006", "RS-OFF-001..006", "RS-CUT-001"]);
  assert.equal(result.artifact_count, 13);
  assert.equal(result.external_actions_executed, 0);
});

test("CUT dependency bundle accepts only a hash-bound terminal PRJ/OFF/CUT-001 chain", () => {
  const f = fixture({ terminal: true });
  const result = validateCutDependencyBundle(f.bundle, { root: f.root, expectedSourceSha: SOURCE_SHA, expectedSourceTree: SOURCE_TREE });
  assert.equal(result.dependency_satisfied, true);
  f.bundle.artifacts[0].sha256 = "0".repeat(64);
  assert.throws(
    () => validateCutDependencyBundle(f.bundle, { root: f.root, expectedSourceSha: SOURCE_SHA, expectedSourceTree: SOURCE_TREE }),
    (error) => error.code === "CUT_DEPENDENCY_HASH",
  );
});

test("central-ledger runner refuses execute mode before reading a packet or contacting an external system", () => {
  assert.throws(() => execFileSync(process.execPath, [
    "scripts/run-central-ledger-cutover.mjs",
    "--phase", "production-cutover",
    "--mode", "execute",
  ], { encoding: "utf8", stdio: "pipe" }), (error) => {
    const output = String(error.stderr ?? "");
    assert.match(output, /CUT_EXECUTION_OUT_OF_SCOPE/u);
    assert.equal(readFileSync("scripts/run-central-ledger-cutover.mjs", "utf8").includes("AWS"), false);
    return true;
  });
});
