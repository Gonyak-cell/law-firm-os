import assert from "node:assert/strict";
import test from "node:test";
import {
  createJsonPostgresStageProbe,
  deriveJsonPostgresProgramStageObservation,
  jsonPostgresStageProbeCollectorRef,
  jsonPostgresStageProbeRequirements,
  validateJsonPostgresStageProbe,
} from "../src/postgres/program-stage-observation.js";
import {
  jsonPostgresProgramBindingsSha256,
  jsonPostgresProgramStageRequirements,
} from "../src/postgres/program-stage-gates.js";

const SHA = "a".repeat(40);
const TREE = "b".repeat(40);
const PACKET_SHA = "c".repeat(64);

function packet(stage = "cut-008") {
  return {
    phase: "w13-production-cutover",
    source_sha: SHA,
    source_tree: TREE,
    packet_sha256: PACKET_SHA,
    authorized_stages: [stage],
    bindings: { authority_bundle_sha256: "d".repeat(64) },
    target: { target_ref: "lawos-production" },
  };
}

function cut008Probes(value = packet()) {
  const probeRequirements = jsonPostgresStageProbeRequirements("cut-008");
  const stageRequirements = jsonPostgresProgramStageRequirements("cut-008");
  return Object.entries(probeRequirements).map(([probeKind, checks], index) =>
    createJsonPostgresStageProbe({
      probeId: `cut008-${probeKind}`,
      stage: "cut-008",
      probeKind,
      collectorRef: jsonPostgresStageProbeCollectorRef("cut-008", probeKind),
      sourceSha: SHA,
      sourceTree: TREE,
      packetSha256: PACKET_SHA,
      bindingsSha256: jsonPostgresProgramBindingsSha256(value),
      startedAt: `2026-07-23T01:0${index}:00.000Z`,
      finishedAt: `2026-07-23T01:0${index}:30.000Z`,
      command: `node collector-${probeKind}.mjs`,
      checks: Object.fromEntries(checks.map((check) => [check, true])),
      safeCounts: index === 0
        ? {
            ...Object.fromEntries(stageRequirements.zero_counts.map((key) => [key, 0])),
            monthly_cost_forecast_krw: 269100,
          }
        : {},
      evidenceSha256: String(index + 1).repeat(64),
    }));
}

test("stage observation derives exact checks and zero counts from the closed probe set", () => {
  const value = packet();
  const result = deriveJsonPostgresProgramStageObservation({
    stage: "cut-008",
    packet: value,
    probes: cut008Probes(value),
  });
  assert.equal(result.observed.outcome, "PASS");
  assert.equal(result.observed.safe_counts.monthly_cost_forecast_krw, 269100);
  assert.equal(result.observed.safe_counts.temporary_eni_allow_count, 0);
  assert.equal(
    Object.keys(result.observed.checks).length,
    jsonPostgresProgramStageRequirements("cut-008").checks.length,
  );
  assert.equal(result.probe_result_sha256.length, 4);
});

test("stage observation rejects a missing probe, a forged digest, and duplicate count ownership", () => {
  const value = packet();
  const probes = cut008Probes(value);
  assert.throws(() => deriveJsonPostgresProgramStageObservation({
    stage: "cut-008",
    packet: value,
    probes: probes.slice(1),
  }), /incomplete/u);

  const forged = structuredClone(probes[0]);
  forged.result_sha256 = "f".repeat(64);
  assert.throws(() => validateJsonPostgresStageProbe(forged, {
    stage: "cut-008",
    sourceSha: SHA,
    sourceTree: TREE,
    packetSha256: PACKET_SHA,
    bindingsSha256: jsonPostgresProgramBindingsSha256(value),
  }), /digest drifted/u);

  const sensitiveCommand = structuredClone(probes[0]);
  sensitiveCommand.command = "node collector.mjs --database postgres://operator:never-return@db.internal/lawos";
  assert.throws(() => validateJsonPostgresStageProbe(sensitiveCommand, {
    stage: "cut-008",
    sourceSha: SHA,
    sourceTree: TREE,
    packetSha256: PACKET_SHA,
    bindingsSha256: jsonPostgresProgramBindingsSha256(value),
  }), /execution contract drifted/u);

  const duplicated = structuredClone(probes);
  duplicated[1].safe_counts.public_resource_count = 0;
  duplicated[1].result_sha256 = "0".repeat(64);
  const repaired = createJsonPostgresStageProbe({
    probeId: duplicated[1].probe_id,
    stage: duplicated[1].stage,
    probeKind: duplicated[1].probe_kind,
    collectorRef: duplicated[1].collector_ref,
    sourceSha: duplicated[1].source_sha,
    sourceTree: duplicated[1].source_tree,
    packetSha256: duplicated[1].packet_sha256,
    bindingsSha256: duplicated[1].bindings_sha256,
    startedAt: duplicated[1].started_at,
    finishedAt: duplicated[1].finished_at,
    command: duplicated[1].command,
    checks: duplicated[1].checks,
    safeCounts: duplicated[1].safe_counts,
    evidenceSha256: duplicated[1].evidence_sha256,
  });
  assert.throws(() => deriveJsonPostgresProgramStageObservation({
    stage: "cut-008",
    packet: value,
    probes: [probes[0], repaired, ...probes.slice(2)],
  }), /ownership is duplicated/u);
});

test("W12 inventory adjudication is a first-class closed stage", () => {
  const stage = "source-inventory-adjudication";
  const value = {
    phase: "w12-real-data-rehearsal",
    source_sha: SHA,
    source_tree: TREE,
    packet_sha256: PACKET_SHA,
    authorized_stages: [stage],
    bindings: { inventory_content_sha256: "e".repeat(64) },
    target: { target_ref: "lawos-private-rehearsal" },
  };
  const checks = jsonPostgresStageProbeRequirements(stage)[stage];
  const zeroCounts = jsonPostgresProgramStageRequirements(stage).zero_counts;
  const probe = createJsonPostgresStageProbe({
    probeId: "w12-inventory-adjudication",
    stage,
    probeKind: stage,
    collectorRef: jsonPostgresStageProbeCollectorRef(stage, stage),
    sourceSha: SHA,
    sourceTree: TREE,
    packetSha256: PACKET_SHA,
    bindingsSha256: jsonPostgresProgramBindingsSha256(value),
    startedAt: "2026-07-23T02:00:00.000Z",
    finishedAt: "2026-07-23T02:01:00.000Z",
    command: "node scripts/prepare-json-postgres-authority-bundle.mjs",
    checks: Object.fromEntries(checks.map((check) => [check, true])),
    safeCounts: {
      ...Object.fromEntries(zeroCounts.map((key) => [key, 0])),
      candidate_count: 287,
      monthly_cost_forecast_krw: 269100,
    },
    evidenceSha256: "9".repeat(64),
  });
  const derived = deriveJsonPostgresProgramStageObservation({
    stage,
    packet: value,
    probes: [probe],
  });
  assert.equal(derived.observed.safe_counts.candidate_count, 287);
  assert.equal(derived.observed.safe_counts.unresolved_candidate_count, 0);
});
