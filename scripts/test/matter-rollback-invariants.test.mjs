import assert from "node:assert/strict";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  readdirSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  importApprovedMatterRollbackAdapter,
  matterRollbackExecutionIdentity,
  matterRollbackFinalReceiptId,
  normalizeMatterRollbackAdapterResult,
  validateMatterRollbackRf13DistSidecar,
} from "../lib/matter-rollback-execution-evidence.mjs";
import { commitMatterRollbackEvidenceTransaction } from "../lib/matter-rollback-finalization-store.mjs";
import { canonicalSha256, emitMatterRollbackFailure } from "../lib/matter-rollback-contract.mjs";
import { makeFixture, makePacket } from "./helpers/matter-rollback-v2-fixture.mjs";

async function apiExecution(t, fixtureOptions = {}) {
  const fixture = makeFixture(t, fixtureOptions);
  const packet = makePacket(fixture);
  const runId = "run-invariant-0001";
  const invocationId = "api-invariant-0001";
  const startedAt = new Date().toISOString();
  const previous = process.env.MATTER_ROLLBACK_TEST_ADAPTER_CONFIG;
  process.env.MATTER_ROLLBACK_TEST_ADAPTER_CONFIG = fixture.adapterConfigPath;
  try {
    const adapter = await importApprovedMatterRollbackAdapter(packet, "api", fixture.apiAdapterPath);
    const raw = await adapter.execute({
      packet,
      profile: "matter-staging-admin",
      invocation: { surface: "api", run_id: runId, invocation_id: invocationId, started_at: startedAt },
    });
    return normalizeMatterRollbackAdapterResult(raw, {
      packet,
      surface: "api",
      runId,
      invocationId,
      invocationStartedAt: startedAt,
      adapterSha256: fixture.apiAdapter.sha256,
      now: Date.now(),
    });
  } finally {
    if (previous === undefined) delete process.env.MATTER_ROLLBACK_TEST_ADAPTER_CONFIG;
    else process.env.MATTER_ROLLBACK_TEST_ADAPTER_CONFIG = previous;
  }
}

test("A/B/A durable readback requires exact scope, snapshot, and record-count equality", async (t) => {
  const cases = [
    ["scope", { durableReadbackScopeByStep: { B_CURRENT: "a".repeat(64) } }],
    ["snapshot", { durableReadbackByStep: { B_CURRENT: "b".repeat(64) } }],
    ["record count", { durableReadbackCountByStep: { B_CURRENT: 8 } }],
  ];
  for (const [label, fixtureOptions] of cases) {
    await t.test(label, async (subtest) => {
      await assert.rejects(
        apiExecution(subtest, fixtureOptions),
        (error) => error.code === "MATTER_ROLLBACK_DURABLE_READBACK_MISMATCH",
      );
    });
  }
  await t.test("exact equality is retained as the normalized readback", async (subtest) => {
    const result = await apiExecution(subtest);
    assert.deepEqual(result.durable_readback, {
      scope_sha256: "8".repeat(64),
      snapshot_sha256: "9".repeat(64),
      record_count: 7,
    });
  });
});

test("raw receipt and attestation identities are unique inside an invocation", async (t) => {
  await t.test("duplicate raw receipt id", async (subtest) => {
    await assert.rejects(
      apiExecution(subtest, {
        rawReceiptIdByStep: { A_BEFORE: "raw-duplicate-id", B_CURRENT: "raw-duplicate-id" },
      }),
      (error) => error.code === "MATTER_ROLLBACK_EVIDENCE_ID_DUPLICATE",
    );
  });
  await t.test("duplicate attestation id", async (subtest) => {
    await assert.rejects(
      apiExecution(subtest, {
        attestationIdByStep: { A_BEFORE: "attest-duplicate-id", B_CURRENT: "attest-duplicate-id" },
      }),
      (error) => error.code === "MATTER_ROLLBACK_EVIDENCE_ID_DUPLICATE",
    );
  });
});

test("stable execution and final-receipt identities bind packet, nonce, run, target, and platform", () => {
  const packet = {
    packet_id: "rfd017-identity-packet",
    packet_sha256: "1".repeat(64),
    execution_nonce: "2".repeat(64),
    target_a: { manifest: { source: { sha: "3".repeat(40), tree: "4".repeat(40) } } },
    route: "api:A->B->A;desktop:B->A",
  };
  const base = matterRollbackExecutionIdentity(packet, "run-identity-0001");
  assert.equal(matterRollbackFinalReceiptId(packet, "run-identity-0001"), `rfd017-final-${canonicalSha256(base)}`);
  const variants = [
    matterRollbackFinalReceiptId({ ...packet, packet_id: "rfd017-other-packet" }, "run-identity-0001"),
    matterRollbackFinalReceiptId({ ...packet, execution_nonce: "5".repeat(64) }, "run-identity-0001"),
    matterRollbackFinalReceiptId(packet, "run-identity-0002"),
    matterRollbackFinalReceiptId({ ...packet, target_a: { manifest: { source: { sha: "6".repeat(40), tree: "4".repeat(40) } } } }, "run-identity-0001"),
    matterRollbackFinalReceiptId(packet, "run-identity-0001", "windows"),
  ];
  assert.equal(new Set([matterRollbackFinalReceiptId(packet, "run-identity-0001"), ...variants]).size, 6);
});

function transactionFixture(t) {
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), "matter-rollback-finalization-")));
  chmodSync(root, 0o700);
  const replay = path.join(root, "replay");
  const output = path.join(root, "output");
  mkdirSync(replay, { mode: 0o700 });
  mkdirSync(output, { mode: 0o700 });
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return { root, replay, output };
}

const SIDECAR = Object.freeze({ schema_version: "test.rollback-sidecar.v1", status: "PASS" });
const MARKER = Object.freeze({ schema_version: "test.rollback-marker.v1", final_receipt_id: "rfd017-final-test" });

test("sidecar publication and stable replay consumption commit as one ordered transaction", (t) => {
  const fixture = transactionFixture(t);
  const identity = "7".repeat(64);
  const sidecarPath = path.join(fixture.output, "rollback-sidecar.json");
  const committed = commitMatterRollbackEvidenceTransaction({
    replayRegistryPath: fixture.replay,
    executionIdentitySha256: identity,
    marker: MARKER,
    sidecarPath,
    sidecar: SIDECAR,
  });
  assert.equal(committed.evidence_commit_state, "committed");
  assert.equal(existsSync(sidecarPath), true);
  const marker = JSON.parse(readFileSync(committed.replay_marker_path, "utf8"));
  assert.deepEqual(marker.sidecar, {
    path: sidecarPath,
    sha256: committed.rf13_dist_sidecar_sha256,
    bytes: committed.rf13_dist_sidecar_bytes,
  });
  const duplicateSidecar = path.join(fixture.output, "duplicate-sidecar.json");
  assert.throws(
    () => commitMatterRollbackEvidenceTransaction({
      replayRegistryPath: fixture.replay,
      executionIdentitySha256: identity,
      marker: { ...MARKER, final_receipt_id: "rfd017-final-resealed" },
      sidecarPath: duplicateSidecar,
      sidecar: SIDECAR,
    }),
    (error) => error.code === "MATTER_ROLLBACK_REPLAY_DETECTED"
      && error.evidence_commit_state === "already_committed",
  );
  assert.equal(existsSync(duplicateSidecar), false);
  assert.equal(readdirSync(fixture.replay).length, 1);
});

test("a sidecar failure consumes no replay identity and the same finalization can be retried", (t) => {
  const fixture = transactionFixture(t);
  const identity = "8".repeat(64);
  const blockedPath = path.join(fixture.output, "blocked-sidecar.json");
  writeFileSync(blockedPath, "occupied\n", { mode: 0o600 });
  assert.throws(
    () => commitMatterRollbackEvidenceTransaction({
      replayRegistryPath: fixture.replay,
      executionIdentitySha256: identity,
      marker: MARKER,
      sidecarPath: blockedPath,
      sidecar: SIDECAR,
    }),
    (error) => error.code === "MATTER_ROLLBACK_OUTPUT_EXISTS",
  );
  assert.equal(readdirSync(fixture.replay).length, 0);
  unlinkSync(blockedPath);
  const retried = commitMatterRollbackEvidenceTransaction({
    replayRegistryPath: fixture.replay,
    executionIdentitySha256: identity,
    marker: MARKER,
    sidecarPath: blockedPath,
    sidecar: SIDECAR,
  });
  assert.equal(retried.evidence_commit_state, "committed");
  assert.equal(readdirSync(fixture.replay).length, 1);
});

test("a failure after sidecar promotion rolls the sidecar back before replay commit", (t) => {
  const fixture = transactionFixture(t);
  const identity = "9".repeat(64);
  const collidingSidecarPath = path.join(fixture.replay, `${identity}.consumed.json`);
  assert.throws(
    () => commitMatterRollbackEvidenceTransaction({
      replayRegistryPath: fixture.replay,
      executionIdentitySha256: identity,
      marker: MARKER,
      sidecarPath: collidingSidecarPath,
      sidecar: SIDECAR,
    }),
    (error) => error.code === "MATTER_ROLLBACK_FINALIZATION_WRITE"
      && error.evidence_commit_state === "rolled_back",
  );
  assert.equal(existsSync(collidingSidecarPath), false);
  assert.equal(readdirSync(fixture.replay).length, 0);
  const retryPath = path.join(fixture.output, "retry-after-promote.json");
  const retried = commitMatterRollbackEvidenceTransaction({
    replayRegistryPath: fixture.replay,
    executionIdentitySha256: identity,
    marker: MARKER,
    sidecarPath: retryPath,
    sidecar: SIDECAR,
  });
  assert.equal(retried.evidence_commit_state, "committed");
});

test("a temporary evidence cleanup failure reports recovery required and preserves a reconciliation path", (t) => {
  const fixture = transactionFixture(t);
  const identity = "a".repeat(64);
  const sidecarPath = path.join(fixture.output, "cleanup-failure-sidecar.json");
  const marker = {};
  Object.defineProperty(marker, "cleanup_fault", {
    enumerable: true,
    get() {
      chmodSync(fixture.output, 0o500);
      throw new Error("deterministic temporary cleanup failure");
    },
  });
  let failure;
  let orphans;
  try {
    assert.throws(
      () => commitMatterRollbackEvidenceTransaction({
        replayRegistryPath: fixture.replay,
        executionIdentitySha256: identity,
        marker,
        sidecarPath,
        sidecar: SIDECAR,
      }),
      (error) => {
        failure = error;
        return error.code === "MATTER_ROLLBACK_FINALIZATION_RECOVERY_REQUIRED"
          && error.evidence_commit_state === "partial_recovery_required";
      },
    );
    orphans = readdirSync(fixture.output).filter((name) => name.includes(".prepare-"));
    assert.equal(orphans.length, 1);
    assert.equal(readdirSync(fixture.replay).length, 0);
  } finally {
    chmodSync(fixture.output, 0o700);
  }

  let output = "";
  const originalWrite = process.stderr.write;
  process.stderr.write = (chunk) => { output += String(chunk); return true; };
  try {
    emitMatterRollbackFailure(failure);
  } finally {
    process.stderr.write = originalWrite;
  }
  const telemetry = JSON.parse(output);
  assert.equal(telemetry.evidence_commit_state, "partial_recovery_required");
  assert.equal(telemetry.external_mutation_state, "unknown_or_partial");
  assert.equal(telemetry.external_mutation_executed, null);
  assert.equal(output.includes(fixture.root), false);

  unlinkSync(path.join(fixture.output, orphans[0]));
  const retried = commitMatterRollbackEvidenceTransaction({
    replayRegistryPath: fixture.replay,
    executionIdentitySha256: identity,
    marker: MARKER,
    sidecarPath,
    sidecar: SIDECAR,
  });
  assert.equal(retried.evidence_commit_state, "committed");
});

test("committed recovery-required failure telemetry never claims no evidence mutation", () => {
  let output = "";
  const originalWrite = process.stderr.write;
  process.stderr.write = (chunk) => { output += String(chunk); return true; };
  try {
    emitMatterRollbackFailure(Object.assign(new Error("redacted"), {
      code: "MATTER_ROLLBACK_FINALIZATION_RECOVERY_REQUIRED",
      evidence_commit_state: "committed_recovery_required",
    }));
  } finally {
    process.stderr.write = originalWrite;
  }
  const failure = JSON.parse(output);
  assert.equal(failure.evidence_commit_state, "committed_recovery_required");
  assert.equal(failure.external_mutation_state, "unknown_or_partial");
  assert.equal(failure.external_mutation_executed, null);
});

test("serialized rollback PASS fields cannot replace same-process committed authority", () => {
  assert.throws(
    () => validateMatterRollbackRf13DistSidecar({
      schema_version: "law-firm-os.rf13-dist.rollback-receipt.v1",
      receipt_id: "rfd017-final-forged",
      gate: "rollback",
      status: "PASS",
      source_sha: "1".repeat(40),
      source_tree: "2".repeat(40),
      artifact_sha256: ["3".repeat(64)],
      executed: true,
      authoritative: true,
      template: false,
    }, {
      validation: { verdict: "PASS", authoritative: true },
      expectedSourceSha: "1".repeat(40),
      expectedSourceTree: "2".repeat(40),
      expectedArtifactSha256: ["3".repeat(64)],
    }),
    (error) => error.code === "MATTER_ROLLBACK_LIVE_AUTHORITY_REQUIRED",
  );
});
