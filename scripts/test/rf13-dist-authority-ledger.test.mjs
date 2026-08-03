import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import * as contract from "../lib/rf13-dist-contract.mjs";
import {
  RF13_DIST_TEST_AUTHORITY_CONSUMPTION_SCHEMA,
  claimTestOnlyRf13DistLedgerFixture,
  createTestOnlyRf13DistLedgerFixture,
  disposeTestOnlyRf13DistLedgerFixture,
  rf13DistAuthorityConsumptionIdentity,
  runTestOnlyRf13DistAuthorityConsumption,
  sealRf13DistAuthorityActions,
} from "../lib/rf13-dist-authority-ledger.mjs";
import * as ledger from "../lib/rf13-dist-authority-ledger.mjs";

const SOURCE_SHA = "a".repeat(40);
const SOURCE_TREE = "b".repeat(40);
const CHILD = fileURLToPath(new URL("./helpers/rf13-dist-ledger-child.mjs", import.meta.url));

function authorityBinding(overrides = {}) {
  return {
    release_id: `RF13-DIST-1.2.3-${SOURCE_SHA}`,
    environment: "canary",
    action: "canary_acceptance",
    nonce: "RFD018-CONSUMPTION-NONCE-0001",
    source_sha: SOURCE_SHA,
    source_tree: SOURCE_TREE,
    artifact_sha256: ["c".repeat(64)],
    authority_receipt_id: "RFD018-CANARY-AUTHORITY",
    authority_receipt_sha256: "d".repeat(64),
    authority_key_id: "release-owner-key-01",
    authority_key_fingerprint_sha256: "e".repeat(64),
    authority_signature_sha256: "f".repeat(64),
    authority_signed_payload_sha256: "1".repeat(64),
    ...overrides,
  };
}

function assertCode(callback, code) {
  assert.throws(callback, (error) => {
    assert.equal(error.code, code);
    return true;
  });
}

function testFixture(testContext) {
  const fixture = createTestOnlyRf13DistLedgerFixture();
  testContext.after(() => {
    if (existsSync(path.dirname(fixture.ledger_root))) disposeTestOnlyRf13DistLedgerFixture(fixture);
  });
  return fixture;
}

function childEnvironment(fixture, binding, overrides = {}) {
  return {
    ...process.env,
    RFD018_TEST_FIXTURE_DESCRIPTOR: fixture.descriptor_path,
    RFD018_TEST_FIXTURE_CLAIM: fixture.claim_token,
    RFD018_TEST_BINDING: JSON.stringify(binding),
    RFD018_TEST_COMMITTED_AT: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}

function runChild(fixture, binding, cwd) {
  return spawnSync(process.execPath, [CHILD], {
    cwd,
    encoding: "utf8",
    env: childEnvironment(fixture, binding),
  });
}

async function waitForMarker(child, markerPath) {
  const deadline = Date.now() + 5_000;
  while (!existsSync(markerPath)) {
    if (child.exitCode !== null) {
      throw new Error(`ledger child exited before phase marker: ${child.exitCode}`);
    }
    if (Date.now() >= deadline) throw new Error("ledger child phase marker timed out");
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  return JSON.parse(readFileSync(markerPath, "utf8"));
}

async function heldChild(fixture, binding, holdPhase) {
  const markerPath = path.join(path.dirname(fixture.ledger_root), `${holdPhase}.${Date.now()}.${process.pid}.json`);
  const child = spawn(process.execPath, [CHILD], {
    env: childEnvironment(fixture, binding, {
      RFD018_TEST_HOLD_PHASE: holdPhase,
      RFD018_TEST_PHASE_MARKER: markerPath,
    }),
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stderr = "";
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  try {
    const marker = await waitForMarker(child, markerPath);
    return {
      child,
      marker,
      markerCandidatePath: `${markerPath}.${child.pid}.candidate`,
      stderr: () => stderr,
    };
  } catch (error) {
    child.kill("SIGKILL");
    await once(child, "exit");
    throw new Error(`${error.message}: ${stderr}`);
  }
}

async function killHeldChild(held) {
  assert.equal(held.child.kill("SIGKILL"), true);
  const [exitCode, signal] = await once(held.child, "exit");
  assert.equal(exitCode, null);
  assert.equal(signal, "SIGKILL");
  assert.equal(held.stderr(), "");
  assert.equal(existsSync(held.markerCandidatePath), false);
}

test("operational mutation has no public low-level commit and rejects forged final-sealer capabilities", () => {
  assert.equal(Object.hasOwn(contract, "commitRf13DistAuthorityConsumption"), false);
  assert.equal(Object.hasOwn(ledger, "commitRf13DistAuthorityConsumption"), false);
  const forged = {
    schema_version: contract.RF13_DIST_FINAL_SEALER_CAPABILITY_SCHEMA,
    release_id: `RF13-DIST-1.2.3-${SOURCE_SHA}`,
    source_sha: SOURCE_SHA,
    source_tree: SOURCE_TREE,
    manifest_sha256: "2".repeat(64),
    gate_projection_sha256: "3".repeat(64),
    actions_sha256: "4".repeat(64),
    actions: [authorityBinding()],
  };
  for (const candidate of [forged, structuredClone(forged), JSON.parse(JSON.stringify(forged))]) {
    assertCode(() => contract.assertRf13DistFinalSealerCapability(candidate), "FINAL_SEALER_CAPABILITY_INVALID");
    assertCode(() => sealRf13DistAuthorityActions(candidate), "FINAL_SEALER_CAPABILITY_INVALID");
  }
});

test("TEST_ONLY ledger fixture is opaque and can never produce operational PASS", (testContext) => {
  const fixture = testFixture(testContext);
  for (const clone of [structuredClone(fixture), JSON.parse(JSON.stringify(fixture))]) {
    assertCode(
      () => runTestOnlyRf13DistAuthorityConsumption(clone, { binding: authorityBinding() }),
      "AUTHORITY_CONSUMPTION_TEST_FIXTURE_REQUIRED",
    );
  }
  const result = runTestOnlyRf13DistAuthorityConsumption(fixture, {
    binding: authorityBinding(),
    committedAt: "2026-08-01T00:00:00.000Z",
  });
  assert.equal(result.status, "TEST_ONLY");
  assert.equal(result.operational, false);
  assert.equal(result.receipt.test_only, true);
  assert.equal(result.receipt.schema_version, RF13_DIST_TEST_AUTHORITY_CONSUMPTION_SCHEMA);
  assert.notEqual(result.status, "PASS");
});

test("TEST_ONLY descriptor claim requires the exact internally minted token", (testContext) => {
  const fixture = testFixture(testContext);
  assertCode(() => claimTestOnlyRf13DistLedgerFixture({
    descriptorPath: fixture.descriptor_path,
    claimToken: "0".repeat(64),
  }), "AUTHORITY_CONSUMPTION_TEST_FIXTURE_REQUIRED");
  const claimed = claimTestOnlyRf13DistLedgerFixture({
    descriptorPath: fixture.descriptor_path,
    claimToken: fixture.claim_token,
  });
  const result = runTestOnlyRf13DistAuthorityConsumption(claimed, { binding: authorityBinding() });
  assert.equal(result.status, "TEST_ONLY");
  assert.equal(result.operational, false);
});

test("same action replays the exact private receipt without rewriting it", (testContext) => {
  const fixture = testFixture(testContext);
  const first = runTestOnlyRf13DistAuthorityConsumption(fixture, {
    binding: authorityBinding(),
    committedAt: "2026-08-01T00:00:00.000Z",
  });
  const before = statSync(first.path);
  const replay = runTestOnlyRf13DistAuthorityConsumption(fixture, {
    binding: authorityBinding(),
    committedAt: "2026-08-01T01:00:00.000Z",
  });
  const after = statSync(first.path);
  assert.equal(first.idempotent_replay, false);
  assert.equal(replay.idempotent_replay, true);
  assert.deepEqual(replay.receipt, first.receipt);
  assert.equal(replay.sha256, first.sha256);
  assert.equal(after.ino, before.ino);
  assert.equal(after.mtimeMs, before.mtimeMs);
  if (process.platform !== "win32") assert.equal(after.mode & 0o777, 0o600);
});

test("copied repository roots share one ledger namespace for the same release action", (testContext) => {
  const fixture = testFixture(testContext);
  const copyA = path.join(path.dirname(fixture.ledger_root), "repo-copy-a");
  const copyB = path.join(path.dirname(fixture.ledger_root), "repo-copy-b");
  mkdirSync(copyA, { mode: 0o700 });
  mkdirSync(copyB, { mode: 0o700 });
  const first = runChild(fixture, authorityBinding(), copyA);
  assert.equal(first.status, 0, first.stderr);
  const committed = JSON.parse(first.stdout);
  const before = statSync(committed.path);
  const second = runChild(fixture, authorityBinding(), copyB);
  assert.equal(second.status, 0, second.stderr);
  const replay = JSON.parse(second.stdout);
  const after = statSync(replay.path);
  assert.equal(committed.idempotent_replay, false);
  assert.equal(replay.idempotent_replay, true);
  assert.equal(replay.path, committed.path);
  assert.equal(replay.sha256, committed.sha256);
  assert.equal(after.ino, before.ino);
  assert.equal(after.mtimeMs, before.mtimeMs);
});

test("live WAL owner blocks, then an exact dead owner is quarantined and recovered", async (testContext) => {
  const fixture = testFixture(testContext);
  const binding = authorityBinding();
  const held = await heldChild(fixture, binding, "WAL_PREPARED");
  assert.equal(held.marker.phase, "WAL_PREPARED");
  assertCode(
    () => runTestOnlyRf13DistAuthorityConsumption(fixture, { binding }),
    "AUTHORITY_CONSUMPTION_IN_PROGRESS",
  );
  await killHeldChild(held);
  const recovered = runTestOnlyRf13DistAuthorityConsumption(fixture, { binding });
  assert.equal(recovered.status, "TEST_ONLY");
  assert.equal(recovered.idempotent_replay, false);
  assert.equal(recovered.recovered_from_dead_owner, true);
  assert.equal(recovered.receipt.recovery.count, 1);
  assert.match(recovered.recovery_record_sha256, /^[0-9a-f]{64}$/u);
  assert.equal(readdirSync(fixture.ledger_root).some((name) => name.includes(".orphan.")), true);
});

test("dead owner after receipt publication replays the same durable inode", async (testContext) => {
  const fixture = testFixture(testContext);
  const binding = authorityBinding();
  const identity = rf13DistAuthorityConsumptionIdentity(binding, { testOnly: true });
  const target = path.join(fixture.ledger_root, `${identity.slot_sha256}.json`);
  const held = await heldChild(fixture, binding, "RECEIPT_PUBLISHED");
  assert.equal(held.marker.phase, "RECEIPT_PUBLISHED");
  const before = statSync(target);
  const beforeBytes = readFileSync(target);
  await killHeldChild(held);
  const recovered = runTestOnlyRf13DistAuthorityConsumption(fixture, { binding });
  const after = statSync(target);
  assert.equal(recovered.idempotent_replay, true);
  assert.equal(recovered.recovered_from_dead_owner, true);
  assert.equal(recovered.path, target);
  assert.equal(after.ino, before.ino);
  assert.equal(after.mtimeMs, before.mtimeMs);
  assert.deepEqual(readFileSync(target), beforeBytes);
});

test("published WAL without its durable receipt fails closed for manual recovery", async (testContext) => {
  const fixture = testFixture(testContext);
  const binding = authorityBinding();
  const identity = rf13DistAuthorityConsumptionIdentity(binding, { testOnly: true });
  const target = path.join(fixture.ledger_root, `${identity.slot_sha256}.json`);
  const held = await heldChild(fixture, binding, "RECEIPT_PUBLISHED");
  await killHeldChild(held);
  unlinkSync(target);
  assertCode(
    () => runTestOnlyRf13DistAuthorityConsumption(fixture, { binding }),
    "AUTHORITY_CONSUMPTION_RECOVERY_REQUIRED",
  );
  assert.equal(existsSync(target), false);
});

test("conflicting dead-owner WAL fails closed for manual recovery", async (testContext) => {
  const fixture = testFixture(testContext);
  const original = authorityBinding();
  const held = await heldChild(fixture, original, "WAL_PREPARED");
  await killHeldChild(held);
  const conflicting = authorityBinding({
    nonce: "RFD018-CONSUMPTION-NONCE-CONFLICT",
    authority_receipt_id: "RFD018-CANARY-AUTHORITY-CONFLICT",
    authority_receipt_sha256: "5".repeat(64),
    authority_key_id: "release-owner-key-02",
    authority_key_fingerprint_sha256: "6".repeat(64),
    authority_signature_sha256: "7".repeat(64),
    authority_signed_payload_sha256: "8".repeat(64),
  });
  assertCode(
    () => runTestOnlyRf13DistAuthorityConsumption(fixture, { binding: conflicting }),
    "AUTHORITY_CONSUMPTION_RECOVERY_REQUIRED",
  );
  const identity = rf13DistAuthorityConsumptionIdentity(original, { testOnly: true });
  assert.equal(existsSync(path.join(fixture.ledger_root, `${identity.slot_sha256}.json`)), false);
});

test("malformed orphan WAL and crash before owner publication require manual recovery", (testContext) => {
  for (const ownerBytes of [null, "not-json\n"]) {
    const fixture = testFixture(testContext);
    const binding = authorityBinding();
    const identity = rf13DistAuthorityConsumptionIdentity(binding, { testOnly: true });
    const wal = path.join(fixture.ledger_root, `${identity.slot_sha256}.wal`);
    mkdirSync(wal, { mode: 0o700 });
    if (ownerBytes !== null) writeFileSync(path.join(wal, "owner.json"), ownerBytes, { mode: 0o600 });
    assertCode(
      () => runTestOnlyRf13DistAuthorityConsumption(fixture, { binding }),
      "AUTHORITY_CONSUMPTION_RECOVERY_REQUIRED",
    );
    assert.equal(existsSync(path.join(fixture.ledger_root, `${identity.slot_sha256}.json`)), false);
  }
});

test("authority identity binds release source schema action and signing key", () => {
  const baseline = rf13DistAuthorityConsumptionIdentity(authorityBinding(), { testOnly: true });
  const changedKey = rf13DistAuthorityConsumptionIdentity(authorityBinding({
    authority_key_id: "release-owner-key-02",
  }), { testOnly: true });
  assert.notEqual(changedKey.binding_sha256, baseline.binding_sha256);
  assert.notEqual(changedKey.consumption_key_sha256, baseline.consumption_key_sha256);
  assert.equal(changedKey.slot_sha256, baseline.slot_sha256);
  assertCode(
    () => rf13DistAuthorityConsumptionIdentity(authorityBinding({
      release_id: `RF13-DIST-1.2.3-${"9".repeat(40)}`,
    }), { testOnly: true }),
    "AUTHORITY_CONSUMPTION_RELEASE_INVALID",
  );
});
