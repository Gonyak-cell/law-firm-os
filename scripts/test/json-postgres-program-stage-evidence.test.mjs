import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import {
  createJsonPostgresProgramStageEvidence,
  createJsonPostgresProgramStageProbeFromEvidence,
  jsonPostgresProgramStageEvidenceRequirements,
  validateJsonPostgresProgramStageEvidence,
  verifyJsonPostgresProgramStageEvidenceArtifacts,
} from "../../packages/persistence/src/postgres/program-stage-evidence.js";
import {
  JSON_POSTGRES_W12_AUTHORIZED_STAGES,
} from "../../packages/persistence/src/postgres/execution-contract.js";
import {
  deriveJsonPostgresProgramStageObservation,
  jsonPostgresStageProbeRequirements,
} from "../../packages/persistence/src/postgres/program-stage-observation.js";

const SHA = "a".repeat(40);
const TREE = "b".repeat(40);
const PACKET_SHA = "c".repeat(64);

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}

function packet(stage) {
  const w12 = JSON_POSTGRES_W12_AUTHORIZED_STAGES.includes(stage);
  return {
    phase: w12 ? "w12-real-data-rehearsal" : "w13-production-cutover",
    source_sha: SHA,
    source_tree: TREE,
    packet_sha256: PACKET_SHA,
    authorized_stages: [stage],
    operators: w12
      ? ["matter-staging-admin", "matter-readonly-auditor"]
      : [
          "matter-prod-deploy-admin",
          "matter-cutover-operator",
          "matter-readonly-auditor",
        ],
    bindings: { authority_bundle_sha256: "d".repeat(64) },
    target: { target_ref: w12 ? "lawos-private-rehearsal" : "lawos-production" },
  };
}

function evidence(stage, probeKind, value = packet(stage)) {
  const requirements =
    jsonPostgresProgramStageEvidenceRequirements(stage, probeKind);
  return createJsonPostgresProgramStageEvidence({
    evidenceId: `evidence-${stage}-${probeKind}`,
    stage,
    probeKind,
    packet: value,
    operatorRole: requirements.operator_role,
    startedAt: "2026-07-23T03:00:00.000Z",
    finishedAt: "2026-07-23T03:01:00.000Z",
    commandSha256: digest(`command:${stage}:${probeKind}`),
    sourceArtifacts: requirements.artifact_kinds.map((kind) => ({
      kind,
      sha256: digest(`${stage}:${probeKind}:${kind}`),
    })),
    checks: Object.fromEntries(requirements.check_keys.map((key) => [key, true])),
    safeCounts: {
      ...Object.fromEntries(requirements.zero_count_keys.map((key) => [key, 0])),
      monthly_cost_forecast_krw: 269_100,
    },
  });
}

test("closed operational evidence produces every W12 stage probe and observation", () => {
  for (const stage of JSON_POSTGRES_W12_AUTHORIZED_STAGES) {
    const value = packet(stage);
    const probes = Object.keys(jsonPostgresStageProbeRequirements(stage)).map(
      (probeKind) => createJsonPostgresProgramStageProbeFromEvidence({
        packet: value,
        evidence: evidence(stage, probeKind, value),
        probeId: `probe-${stage}-${probeKind}`,
      }),
    );
    const observed = deriveJsonPostgresProgramStageObservation({
      stage,
      packet: value,
      probes,
    });
    assert.equal(observed.observed.outcome, "PASS");
    assert.equal(observed.observed.safe_counts.monthly_cost_forecast_krw, 269_100);
  }
});

test("closed operational evidence fills CUT-008 and CUT-009 probe routes", () => {
  for (const stage of ["cut-008", "cut-009"]) {
    const value = packet(stage);
    const probes = Object.keys(jsonPostgresStageProbeRequirements(stage)).map(
      (probeKind) => createJsonPostgresProgramStageProbeFromEvidence({
        packet: value,
        evidence: evidence(stage, probeKind, value),
        probeId: `probe-${stage}-${probeKind}`,
      }),
    );
    const observed = deriveJsonPostgresProgramStageObservation({
      stage,
      packet: value,
      probes,
    });
    assert.equal(observed.observed.outcome, "PASS");
    assert.equal(observed.observed.safe_counts.monthly_cost_forecast_krw, 269_100);
  }
});

test("operational evidence rejects artifact, role, count, secret, and digest drift", () => {
  const stage = "w12-migration";
  const probeKind = stage;
  const value = packet(stage);
  const baseline = evidence(stage, probeKind, value);
  for (const mutate of [
    (candidate) => { candidate.source_artifacts.pop(); },
    (candidate) => { candidate.operator_role = "matter-readonly-auditor"; },
    (candidate) => { candidate.safe_counts.unexpected_rejection_count = 1; },
    (candidate) => { candidate.safe_counts.api_key_count = 0; },
    (candidate) => { candidate.result_sha256 = "f".repeat(64); },
  ]) {
    const candidate = structuredClone(baseline);
    mutate(candidate);
    assert.throws(() =>
      validateJsonPostgresProgramStageEvidence(candidate, { packet: value }));
  }
});

test("operational evidence requires every referenced private artifact byte digest", () => {
  const stage = "w12-capacity";
  const baseline = evidence(stage, stage);
  const artifacts = baseline.source_artifacts.map((artifact) => ({
    kind: artifact.kind,
    bytes: Buffer.from(`${stage}:${stage}:${artifact.kind}`),
  }));
  assert.deepEqual(
    verifyJsonPostgresProgramStageEvidenceArtifacts({
      evidence: baseline,
      artifacts,
    }),
    { valid: true, artifact_count: 1 },
  );
  const drifted = structuredClone(artifacts);
  drifted[0].bytes = Buffer.from("drift");
  assert.throws(() => verifyJsonPostgresProgramStageEvidenceArtifacts({
    evidence: baseline,
    artifacts: drifted,
  }), /drifted/u);
});
