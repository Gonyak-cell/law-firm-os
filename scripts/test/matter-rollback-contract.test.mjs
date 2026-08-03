import assert from "node:assert/strict";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  MATTER_ROLLBACK_EXECUTION_ACTION,
  canonicalSha256,
  emitMatterRollbackFailure,
  sha256Bytes,
  validateMatterRollbackApproval,
  validateMatterRollbackExecutionCheckpoint,
} from "../lib/matter-rollback-contract.mjs";
import {
  MATTER_ROLLBACK_RECEIPT_SCHEMA,
  attachMatterRollbackDesktopReceipt,
  buildMatterRollbackPartialReceipt,
  importApprovedMatterRollbackAdapter,
  normalizeMatterRollbackAdapterResult,
  validateMatterRollbackPartialReceipt,
} from "../lib/matter-rollback-execution-evidence.mjs";
import {
  API_RUNNER,
  DESKTOP_RUNNER,
  REPO_ROOT,
  VALIDATOR,
  finalSeal,
  makeFixture,
  makePacket,
  packetAuthorities,
  parseJsonOutput,
  privateWrite,
  runCli,
  signedStatement,
  writePacket,
} from "./helpers/matter-rollback-v2-fixture.mjs";

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  chmodSync(filePath, 0o600);
}

function replayRegistry(fixture, name = "replay-registry") {
  const directory = path.join(fixture.root, name);
  mkdirSync(directory, { mode: 0o700 });
  chmodSync(directory, 0o700);
  return directory;
}

async function fullAttestedTestOnlyExecution(t) {
  const fixture = makeFixture(t);
  const packetRef = writePacket(fixture);
  const packet = packetRef.packet;
  const signed = packetAuthorities(fixture, packet);
  const approval = validateMatterRollbackApproval({
    packet,
    receiptPath: signed.approval.receiptPath,
    signaturePath: signed.approval.signaturePath,
  });
  const executionCheckpoint = validateMatterRollbackExecutionCheckpoint({
    packet,
    receiptPath: signed.checkpoint.receiptPath,
    signaturePath: signed.checkpoint.signaturePath,
  });
  const previousConfig = process.env.MATTER_ROLLBACK_TEST_ADAPTER_CONFIG;
  process.env.MATTER_ROLLBACK_TEST_ADAPTER_CONFIG = fixture.adapterConfigPath;
  try {
    const runId = "run-test-only-0001";
    const apiInvocationId = "api-test-only-0001";
    const apiStartedAt = new Date().toISOString();
    const apiModule = await importApprovedMatterRollbackAdapter(packet, "api", fixture.apiAdapterPath);
    const apiRaw = await apiModule.execute({
      packet,
      profile: "matter-staging-admin",
      invocation: { surface: "api", run_id: runId, invocation_id: apiInvocationId, started_at: apiStartedAt },
    });
    const apiExecution = normalizeMatterRollbackAdapterResult(apiRaw, {
      packet,
      surface: "api",
      runId,
      invocationId: apiInvocationId,
      invocationStartedAt: apiStartedAt,
      adapterSha256: fixture.apiAdapter.sha256,
      now: Date.now(),
    });
    const partial = buildMatterRollbackPartialReceipt({
      packetRef,
      approval,
      executionCheckpoint,
      apiExecution,
      generatedAt: new Date(Math.max(Date.now(), Date.parse(apiExecution.finished_at))).toISOString(),
    });
    const isolatedUserData = path.join(fixture.root, "isolated-test-only-user-data");
    mkdirSync(isolatedUserData, { mode: 0o700 });
    const desktopInvocationId = "desktop-test-only-0001";
    const desktopStartedAt = new Date(Math.max(Date.now(), Date.parse(apiExecution.finished_at))).toISOString();
    const desktopModule = await importApprovedMatterRollbackAdapter(packet, "desktop", fixture.desktopAdapterPath);
    const desktopRaw = await desktopModule.execute({
      packet,
      platform: "macos",
      profile: "matter-staging-admin",
      isolatedUserData,
      invocation: { surface: "desktop", run_id: runId, invocation_id: desktopInvocationId, started_at: desktopStartedAt },
    });
    const desktopExecution = normalizeMatterRollbackAdapterResult(desktopRaw, {
      packet,
      surface: "desktop",
      runId,
      invocationId: desktopInvocationId,
      invocationStartedAt: desktopStartedAt,
      adapterSha256: fixture.desktopAdapter.sha256,
      now: Date.now(),
    });
    const receipt = attachMatterRollbackDesktopReceipt(partial, {
      packetRef,
      desktopExecution,
      generatedAt: new Date(Math.max(Date.now(), Date.parse(desktopExecution.finished_at))).toISOString(),
    });
    const receiptPath = path.join(fixture.root, "test-only-attested-receipt.json");
    writeJson(receiptPath, receipt);
    return { fixture, packetRef, signed, partial, apiExecution, desktopExecution, receipt, receiptPath };
  } finally {
    if (previousConfig === undefined) delete process.env.MATTER_ROLLBACK_TEST_ADAPTER_CONFIG;
    else process.env.MATTER_ROLLBACK_TEST_ADAPTER_CONFIG = previousConfig;
  }
}

test("actual registered adapters and independent raw attestations stay non-PASS when RFD-TUW-012 is TEST_ONLY", async (t) => {
  const run = await fullAttestedTestOnlyExecution(t);
  assert.equal(run.receipt.adapter_invocation_count, 2);
  assert.equal(run.receipt.state, "SEAL_REQUIRED");
  assert.equal(run.apiExecution.steps.length, 3);
  assert.equal(run.desktopExecution.steps.length, 2);
  assert.equal(readJson(run.fixture.aManifest.desktop.release_evidence.receipt.path).verdict, "TEST_ONLY");
  const seal = finalSeal(run.fixture, run.receipt);
  const registry = replayRegistry(run.fixture);
  const sidecarPath = path.join(run.fixture.root, "must-not-exist-rf13-dist-sidecar.json");
  const result = runCli(VALIDATOR, [
    "--receipt", run.receiptPath,
    "--seal-receipt", seal.receiptPath,
    "--seal-signature", seal.signaturePath,
    "--replay-registry", registry,
    "--rf13-dist-sidecar", sidecarPath,
  ], run.fixture);
  assert.notEqual(result.status, 0);
  assert.equal(parseJsonOutput(result).code, "MATTER_ROLLBACK_RELEASE_EVIDENCE");
  assert.equal(readdirSync(registry).length, 0);
  assert.equal(existsSync(sidecarPath), false);
});

test("signed packet-shaped input plus fabricated observations can never PASS with zero adapter invocations", (t) => {
  const fixture = makeFixture(t);
  const packetRef = writePacket(fixture);
  const signed = packetAuthorities(fixture, packetRef.packet);
  const approval = validateMatterRollbackApproval({
    packet: packetRef.packet,
    receiptPath: signed.approval.receiptPath,
    signaturePath: signed.approval.signaturePath,
  });
  const checkpoint = validateMatterRollbackExecutionCheckpoint({
    packet: packetRef.packet,
    receiptPath: signed.checkpoint.receiptPath,
    signaturePath: signed.checkpoint.signaturePath,
  });
  const generatedAt = new Date().toISOString();
  const body = {
    schema_version: MATTER_ROLLBACK_RECEIPT_SCHEMA,
    receipt_id: "rfd017-fabricated-zero-invocations",
    state: "SEAL_REQUIRED",
    packet: {
      path: packetRef.path,
      sha256: packetRef.sha256,
      bytes: packetRef.bytes,
      packet_id: packetRef.packet.packet_id,
      packet_sha256: packetRef.packet.packet_sha256,
    },
    packet_id: packetRef.packet.packet_id,
    packet_sha256: packetRef.packet.packet_sha256,
    execution_nonce: packetRef.packet.execution_nonce,
    environment: "staging",
    run_id: "run-fabricated-0001",
    authority: { approval, execution_checkpoint: checkpoint },
    api_execution: { evidence_class: "staging", adapter: "real", sequence: "A->B->A", status: "PASS" },
    desktop_execution: { evidence_class: "staging", adapter: "real", sequence: "B->A", status: "PASS" },
    adapter_invocation_count: 0,
    generated_at: generatedAt,
    claims: {
      actual_staging_round_trip: true,
      data_rollback_write_count: 0,
      production_contacted: false,
      production_rollback_claim: false,
      synthetic_or_dry_run: false,
    },
  };
  const forged = { ...body, canonical_digest: canonicalSha256(body) };
  const forgedPath = path.join(fixture.root, "fabricated-observations.json");
  writeJson(forgedPath, forged);
  const seal = finalSeal(fixture, forged);
  const sidecarPath = path.join(fixture.root, "must-not-exist-sidecar.json");
  const result = runCli(VALIDATOR, [
    "--receipt", forgedPath,
    "--seal-receipt", seal.receiptPath,
    "--seal-signature", seal.signaturePath,
    "--replay-registry", replayRegistry(fixture),
    "--rf13-dist-sidecar", sidecarPath,
  ], fixture);
  assert.notEqual(result.status, 0);
  assert.equal(parseJsonOutput(result).code, "MATTER_ROLLBACK_RECEIPT_STATE");
  assert.equal(readdirSync(path.join(fixture.root, "adapter-output")).length, 0);
  assert.equal(existsSync(sidecarPath), false);
});

test("structural RFD-TUW-012 fixtures cannot enter dry-run or synthetic execution", (t) => {
  const fixture = makeFixture(t);
  const packetRef = writePacket(fixture);
  const authorities = packetAuthorities(fixture, packetRef.packet);
  const api = runCli(API_RUNNER, [
    "--mode", "execute", "--adapter", "dry-run", "--profile", "matter-staging-admin",
    "--packet", packetRef.path, "--approval-receipt", authorities.approval.receiptPath,
    "--approval-signature", authorities.approval.signaturePath,
  ], fixture);
  assert.notEqual(api.status, 0);
  assert.equal(parseJsonOutput(api).code, "MATTER_ROLLBACK_RELEASE_EVIDENCE");
  const isolated = path.join(fixture.root, "isolated-dry-run");
  mkdirSync(isolated, { mode: 0o700 });
  const desktop = runCli(DESKTOP_RUNNER, [
    "--adapter", "dry-run", "--platform", "macos", "--profile", "matter-staging-admin",
    "--packet", packetRef.path, "--isolated-user-data", isolated,
  ], fixture);
  assert.notEqual(desktop.status, 0);
  assert.equal(parseJsonOutput(desktop).code, "MATTER_ROLLBACK_RELEASE_EVIDENCE");
  const removedSynthetic = runCli(API_RUNNER, ["--adapter", "synthetic"], fixture);
  assert.notEqual(removedSynthetic.status, 0);
  assert.equal(parseJsonOutput(removedSynthetic).code, "MATTER_ROLLBACK_ARGUMENT");
  assert.equal(readdirSync(path.join(fixture.root, "adapter-output")).length, 0);
});

test("operator-selected module and self-supplied hash are rejected before import", async (t) => {
  const fixture = makeFixture(t);
  const packet = makePacket(fixture);
  const sentinel = path.join(fixture.root, "unapproved-module-started.txt");
  const source = `import { writeFileSync } from "node:fs";\nwriteFileSync(process.env.MATTER_ROLLBACK_UNAPPROVED_SENTINEL, "started");\nexport async function executeMatterApiRollback() { return {}; }\n`;
  const temporary = privateWrite(path.join(fixture.root, "unapproved.tmp.mjs"), source);
  const digest = sha256Bytes(readFileSync(temporary));
  const unapproved = path.join(fixture.root, `unapproved-${digest}.mjs`);
  renameSync(temporary, unapproved);
  const previous = process.env.MATTER_ROLLBACK_UNAPPROVED_SENTINEL;
  process.env.MATTER_ROLLBACK_UNAPPROVED_SENTINEL = sentinel;
  try {
    await assert.rejects(
      importApprovedMatterRollbackAdapter(packet, "api", unapproved),
      (error) => error.code === "MATTER_ROLLBACK_ADAPTER_NOT_APPROVED",
    );
  } finally {
    if (previous === undefined) delete process.env.MATTER_ROLLBACK_UNAPPROVED_SENTINEL;
    else process.env.MATTER_ROLLBACK_UNAPPROVED_SENTINEL = previous;
  }
  assert.equal(existsSync(sentinel), false);
  const hashArgument = runCli(API_RUNNER, ["--adapter-module-sha256", digest], fixture);
  assert.notEqual(hashArgument.status, 0);
  assert.equal(parseJsonOutput(hashArgument).code, "MATTER_ROLLBACK_ARGUMENT");
});

test("failure after approved adapter control reports unknown or partial mutation, never false", async (t) => {
  const source = `import { writeFileSync } from "node:fs";\nwriteFileSync(process.env.MATTER_ROLLBACK_THROW_SENTINEL, "adapter-started");\nthrow new Error("adapter failed after control transfer");\nexport async function executeMatterApiRollback() { return {}; }\n`;
  const fixture = makeFixture(t, { apiAdapterSource: source });
  const packet = makePacket(fixture);
  const sentinel = path.join(fixture.root, "approved-adapter-started.txt");
  const previous = process.env.MATTER_ROLLBACK_THROW_SENTINEL;
  process.env.MATTER_ROLLBACK_THROW_SENTINEL = sentinel;
  let failure;
  try {
    try {
      await importApprovedMatterRollbackAdapter(packet, "api", fixture.apiAdapterPath);
      assert.fail("approved throwing adapter import unexpectedly completed");
    } catch (error) {
      failure = error;
    }
  } finally {
    if (previous === undefined) delete process.env.MATTER_ROLLBACK_THROW_SENTINEL;
    else process.env.MATTER_ROLLBACK_THROW_SENTINEL = previous;
  }
  assert.equal(existsSync(sentinel), true);
  let output = "";
  const originalWrite = process.stderr.write;
  process.stderr.write = (chunk) => { output += String(chunk); return true; };
  try {
    emitMatterRollbackFailure(failure, { adapter_started: true });
  } finally {
    process.stderr.write = originalWrite;
  }
  const telemetry = JSON.parse(output);
  assert.equal(telemetry.external_mutation_executed, null);
  assert.equal(telemetry.external_mutation_state, "unknown_or_partial");
  assert.deepEqual(telemetry.mutation_telemetry, {
    attempted: true, started: true, completed: false, failed: true, unknown: true,
  });
});

test("tampered raw evidence fails inside the attestation layer", async (t) => {
  const run = await fullAttestedTestOnlyExecution(t);
  const evidencePath = readJson(run.partial.api_execution.steps[0].receipt.path).raw_evidence.path;
  writeFileSync(evidencePath, "tampered raw bytes\n", { mode: 0o600 });
  assert.throws(
    () => validateMatterRollbackPartialReceipt(run.partial, { packetRef: run.packetRef }),
    (error) => error.code === "MATTER_ROLLBACK_ARTIFACT_HASH",
  );
});

test("the final receipt id is the exact stable execution identity", async (t) => {
  const run = await fullAttestedTestOnlyExecution(t);
  const forged = structuredClone(run.partial);
  forged.receipt_id = "rfd017-final-operator-selected";
  delete forged.canonical_digest;
  forged.canonical_digest = canonicalSha256(forged);
  assert.throws(
    () => validateMatterRollbackPartialReceipt(forged, { packetRef: run.packetRef }),
    (error) => error.code === "MATTER_ROLLBACK_RECEIPT_BINDING",
  );
});

test("API and desktop chronology is enforced before any final PASS", async (t) => {
  const run = await fullAttestedTestOnlyExecution(t);
  const reordered = structuredClone(run.desktopExecution);
  reordered.started_at = new Date(Date.parse(run.apiExecution.finished_at) - 1).toISOString();
  assert.throws(
    () => attachMatterRollbackDesktopReceipt(run.partial, {
      packetRef: run.packetRef,
      desktopExecution: reordered,
      generatedAt: new Date().toISOString(),
    }),
    (error) => error.code === "MATTER_ROLLBACK_RECEIPT_CHRONOLOGY",
  );
});

test("owner approval strictly precedes the distinct execution checkpoint", async (t) => {
  const run = await fullAttestedTestOnlyExecution(t);
  const unordered = signedStatement(run.fixture, {
    statementSha256: run.packetRef.packet.packet_sha256,
    action: MATTER_ROLLBACK_EXECUTION_ACTION,
    name: "unordered-execution-checkpoint",
    signedAt: run.fixture.authoritySignedAt,
  });
  const checkpoint = validateMatterRollbackExecutionCheckpoint({
    packet: run.packetRef.packet,
    receiptPath: unordered.receiptPath,
    signaturePath: unordered.signaturePath,
  });
  const partial = structuredClone(run.partial);
  partial.authority.execution_checkpoint = checkpoint;
  delete partial.canonical_digest;
  partial.canonical_digest = canonicalSha256(partial);
  assert.throws(
    () => validateMatterRollbackPartialReceipt(partial, { packetRef: run.packetRef }),
    (error) => error.code === "MATTER_ROLLBACK_RECEIPT_CHRONOLOGY",
  );
});
