import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import {
  JSON_POSTGRES_PRODUCTION_PROGRAM_STAGES,
  JSON_POSTGRES_PROGRAM_STAGE_RESULT_VERSION,
  jsonPostgresProgramBindingsSha256,
  jsonPostgresProgramStageRequirements,
} from "../../packages/persistence/src/postgres/program-stage-gates.js";
import { createJsonPostgresProgramStageReceipt } from "../lib/json-postgres-program-stage.mjs";

const SHA = "a".repeat(40);
const TREE = "b".repeat(40);
const PACKET_SHA = "c".repeat(64);

function receiptDigest(kind) {
  return createHash("sha256").update(kind).digest("hex");
}

function packetForStage(stage) {
  const projection = stage === "w15-relational-projection";
  const rehearsal = stage === "source-inventory-adjudication"
    || stage === "record-type-and-reference"
    || stage.startsWith("w12-");
  return {
    phase: projection
      ? "w15-relational-projection"
      : rehearsal ? "w12-real-data-rehearsal" : "w13-production-cutover",
    source_sha: SHA,
    source_tree: TREE,
    packet_sha256: PACKET_SHA,
    authorized_stages: [...JSON_POSTGRES_PRODUCTION_PROGRAM_STAGES],
    bindings: {
      authority_bundle_sha256: "d".repeat(64),
      w12_terminal_receipt_sha256: receiptDigest("w12-terminal"),
      cut012_terminal_receipt_sha256: projection ? receiptDigest("cut-012") : "0".repeat(64),
      go_live_receipt_sha256: projection ? receiptDigest("go-live") : "0".repeat(64),
    },
    target: {
      target_ref: projection
        ? "lawos-production-projection"
        : rehearsal ? "lawos-private-rehearsal" : "lawos-production",
    },
  };
}

function predecessor(kind, packet) {
  const external = kind === "w12-terminal"
    || (packet.phase === "w15-relational-projection"
      && ["cut-012", "go-live"].includes(kind));
  return {
    valid: true,
    receipt_kind: kind,
    execution_state: "PASS",
    source_sha: external ? "e".repeat(40) : packet.source_sha,
    source_tree: external ? "f".repeat(40) : packet.source_tree,
    packet_sha256: external ? "1".repeat(64) : packet.packet_sha256,
    canonical_sha256: receiptDigest(kind),
  };
}

function observedForStage(stage, packet) {
  const requirements = jsonPostgresProgramStageRequirements(stage);
  return {
    schema_version: JSON_POSTGRES_PROGRAM_STAGE_RESULT_VERSION,
    stage,
    outcome: "PASS",
    source_sha: packet.source_sha,
    source_tree: packet.source_tree,
    packet_sha256: packet.packet_sha256,
    bindings_sha256: jsonPostgresProgramBindingsSha256(packet),
    checks: Object.fromEntries(requirements.checks.map((key) => [key, true])),
    safe_counts: {
      ...Object.fromEntries(requirements.zero_counts.map((key) => [key, 0])),
      monthly_cost_forecast_krw: 299_999,
    },
  };
}

function packet() {
  return {
    phase: "w13-production-cutover",
    source_sha: SHA,
    source_tree: TREE,
    packet_sha256: PACKET_SHA,
    authorized_stages: ["cut-008"],
    bindings: { authority_bundle_sha256: "d".repeat(64) },
    target: { target_ref: "lawos-production" },
  };
}

test("program stage result projects to a complete safe receipt without changing claims", () => {
  const stage = "cut-008";
  const value = packet();
  const requirements = jsonPostgresProgramStageRequirements(stage);
  const predecessor = {
    valid: true,
    receipt_kind: "w12-terminal",
    execution_state: "PASS",
    source_sha: "1".repeat(40),
    source_tree: "2".repeat(40),
    packet_sha256: "3".repeat(64),
    canonical_sha256: "4".repeat(64),
  };
  const observed = {
    schema_version: JSON_POSTGRES_PROGRAM_STAGE_RESULT_VERSION,
    stage,
    outcome: "PASS",
    source_sha: SHA,
    source_tree: TREE,
    packet_sha256: PACKET_SHA,
    bindings_sha256: jsonPostgresProgramBindingsSha256(value),
    checks: Object.fromEntries(requirements.checks.map((key) => [key, true])),
    safe_counts: {
      ...Object.fromEntries(requirements.zero_counts.map((key) => [key, 0])),
      monthly_cost_forecast_krw: 150_000,
    },
  };
  const { result, receipt } = createJsonPostgresProgramStageReceipt({
    stage,
    packet: value,
    observed,
    predecessors: [predecessor],
    receiptId: "lawos-cut-008-001",
    signerKeyId: "owner-key-1",
    startedAt: "2026-07-23T01:00:00.000Z",
    finishedAt: "2026-07-23T01:01:00.000Z",
    command: "node scripts/run-json-postgres-program-stage.mjs --stage cut-008",
  });
  assert.equal(receipt.execution_state, "PASS");
  assert.equal(receipt.profile, "production-postgres-v2");
  assert.equal(receipt.result_sha256, result.result_sha256);
  assert.deepEqual(receipt.claims, result.claims);
  assert.deepEqual(receipt.safe_counts, result.safe_counts);
  assert.deepEqual(receipt.predecessor_receipt_sha256, ["4".repeat(64)]);
});

test("every stage result projects into a schema-valid receipt", () => {
  for (const stage of JSON_POSTGRES_PRODUCTION_PROGRAM_STAGES) {
    const value = packetForStage(stage);
    const requirements = jsonPostgresProgramStageRequirements(stage);
    const { receipt } = createJsonPostgresProgramStageReceipt({
      stage,
      packet: value,
      observed: observedForStage(stage, value),
      predecessors: requirements.predecessor_kinds.map((kind) => predecessor(kind, value)),
      receiptId: `receipt-${stage}`,
      signerKeyId: "owner-key-1",
      startedAt: "2026-07-23T01:00:00.000Z",
      finishedAt: "2026-07-23T01:01:00.000Z",
      command: `node scripts/prepare-json-postgres-program-stage-receipt.mjs --stage ${stage}`,
    });
    assert.equal(receipt.receipt_kind, stage);
    assert.equal(receipt.execution_state, "PASS");
    assert.match(receipt.profile, /^[a-z0-9-]+$/u);
  }
});
