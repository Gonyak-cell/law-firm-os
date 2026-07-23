import assert from "node:assert/strict";
import test from "node:test";
import {
  JSON_POSTGRES_PRODUCTION_PROGRAM_STAGES,
  JSON_POSTGRES_PROGRAM_STAGE_RESULT_VERSION,
  jsonPostgresProgramBindingsSha256,
  jsonPostgresProgramStageRequirements,
  validateJsonPostgresProgramStage,
} from "../src/postgres/program-stage-gates.js";

const SHA = "a".repeat(40);
const TREE = "b".repeat(40);
const PACKET_SHA = "c".repeat(64);

function receiptDigest(kind) {
  return kind.length.toString(16).padStart(64, "0");
}

function packet(stage = null) {
  const projection = stage === "w15-relational-projection";
  const rehearsal = stage === "source-inventory-adjudication"
    || stage === "record-type-and-reference"
    || stage?.startsWith("w12-");
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

function predecessor(kind, value = packet()) {
  const external = ["w12-terminal", "go-live"].includes(kind)
    || (kind === "cut-012" && value.phase === "w15-relational-projection");
  return {
    valid: true,
    receipt_kind: kind,
    execution_state: "PASS",
    source_sha: external ? "e".repeat(40) : value.source_sha,
    source_tree: external ? "f".repeat(40) : value.source_tree,
    packet_sha256: external ? "1".repeat(64) : value.packet_sha256,
    canonical_sha256: receiptDigest(kind),
  };
}

function observed(stage, value = packet(stage)) {
  const requirements = jsonPostgresProgramStageRequirements(stage);
  return {
    schema_version: JSON_POSTGRES_PROGRAM_STAGE_RESULT_VERSION,
    stage,
    outcome: "PASS",
    source_sha: value.source_sha,
    source_tree: value.source_tree,
    packet_sha256: value.packet_sha256,
    bindings_sha256: jsonPostgresProgramBindingsSha256(value),
    checks: Object.fromEntries(requirements.checks.map((key) => [key, true])),
    safe_counts: {
      ...Object.fromEntries(requirements.zero_counts.map((key) => [key, 0])),
      monthly_cost_forecast_krw: 299_999,
    },
  };
}

test("every production, release and go-live stage closes its exact checks, zero counters and predecessor receipts", () => {
  const value = packet();
  for (const stage of JSON_POSTGRES_PRODUCTION_PROGRAM_STAGES) {
    const stagePacket = packet(stage);
    const requirements = jsonPostgresProgramStageRequirements(stage);
    const result = validateJsonPostgresProgramStage({
      stage,
      packet: stagePacket,
      observed: observed(stage, stagePacket),
      predecessors: requirements.predecessor_kinds.map((kind) => predecessor(kind, stagePacket)),
    });
    assert.equal(result.outcome, "PASS");
    assert.match(result.result_sha256, /^[0-9a-f]{64}$/u);
    assert.equal(result.claims.dms_bytes_in_evidence, false);
    assert.equal(result.claims.json_authority_disabled, ["cut-011", "cut-012", "go-live", "w15-relational-projection"].includes(stage));
  }
});

test("program stage gates fail closed on one nonzero authority counter, missing check, cost breach, or binding drift", () => {
  const value = packet();
  const stage = "cut-009";
  const requirements = jsonPostgresProgramStageRequirements(stage);
  const predecessors = requirements.predecessor_kinds.map((kind) => predecessor(kind, value));
  for (const mutate of [
    (result) => { result.safe_counts.dual_write_count = 1; },
    (result) => { result.checks.complete_readback_passed = false; },
    (result) => { result.safe_counts.monthly_cost_forecast_krw = 300_001; },
    (result) => { result.bindings_sha256 = "0".repeat(64); },
    (result) => { result.password = "must-not-enter-evidence"; },
  ]) {
    const result = observed(stage, value);
    mutate(result);
    assert.throws(() => validateJsonPostgresProgramStage({ stage, packet: value, observed: result, predecessors }));
  }
});

test("same-program predecessors must bind the exact source while the signed W12 terminal may bind its prior packet", () => {
  const value = packet();
  const stage = "cut-009";
  const requirements = jsonPostgresProgramStageRequirements(stage);
  const predecessors = requirements.predecessor_kinds.map((kind) => predecessor(kind, value));
  assert.equal(validateJsonPostgresProgramStage({
    stage,
    packet: value,
    observed: observed(stage, value),
    predecessors,
  }).outcome, "PASS");
  predecessors.find((receipt) => receipt.receipt_kind === "cut-008").source_sha = "9".repeat(40);
  assert.throws(() => validateJsonPostgresProgramStage({
    stage,
    packet: value,
    observed: observed(stage, value),
    predecessors,
  }), (error) => error?.code === "PROGRAM_STAGE_PREDECESSOR");
});
