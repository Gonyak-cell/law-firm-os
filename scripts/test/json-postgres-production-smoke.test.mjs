import assert from "node:assert/strict";
import test from "node:test";
import {
  JSON_POSTGRES_EVENT_ACCEPTANCE_COMPONENTS,
  JSON_POSTGRES_PRODUCTION_SMOKE_COMPONENTS,
  createJsonPostgresEventAcceptanceComponent,
  createJsonPostgresEventAcceptanceEvidence,
  createJsonPostgresProductionSmokeComponent,
  createJsonPostgresProductionSmokeEvidence,
  validateJsonPostgresEventAcceptanceEvidence,
  validateJsonPostgresProductionSmokeEvidence,
} from "../lib/json-postgres-production-smoke.mjs";

const packet = {
  source_sha: "a".repeat(40),
  source_tree: "b".repeat(40),
  packet_sha256: "c".repeat(64),
  phase: "w13-production-cutover",
};
const observedAt = "2026-07-23T00:00:00.000Z";
const counters = Object.fromEntries([
  "json_fallback_count",
  "json_writer_count",
  "dual_write_count",
  "file_current_authority_count",
  "offline_mutation_count",
  "memory_fallback_count",
].map((key) => [key, 0]));

test("production smoke aggregates an exact complete component set and six zero counters", () => {
  const components = JSON_POSTGRES_PRODUCTION_SMOKE_COMPONENTS.map((component, index) =>
    createJsonPostgresProductionSmokeComponent({
      packet,
      component,
      observedAt,
      observedEventCount: index + 1,
      externalEvidenceSha256: String(index + 1).repeat(64),
    }));
  const evidence = createJsonPostgresProductionSmokeEvidence({
    packet,
    components,
    authorityCounters: counters,
  });
  assert.equal(
    validateJsonPostgresProductionSmokeEvidence(evidence, { packet }).component_count,
    8,
  );
  assert.throws(
    () => validateJsonPostgresProductionSmokeEvidence({
      ...evidence,
      tenant_isolation_passed: false,
    }, { packet }),
    /invalid/u,
  );
  assert.throws(
    () => createJsonPostgresProductionSmokeEvidence({
      packet,
      components,
      authorityCounters: { ...counters, json_writer_count: 1 },
    }),
    /exactly zero/u,
  );
});
test("event acceptance requires all three bound observation classes and a valid digest", () => {
  const components = JSON_POSTGRES_EVENT_ACCEPTANCE_COMPONENTS.map((component, index) =>
    createJsonPostgresEventAcceptanceComponent({
      packet,
      component,
      observedAt,
      observedEventCount: index + 1,
      externalEvidenceSha256: String(index + 5).repeat(64),
    }));
  const evidence = createJsonPostgresEventAcceptanceEvidence({ packet, components });
  assert.equal(
    validateJsonPostgresEventAcceptanceEvidence(evidence, { packet }).component_count,
    3,
  );
  assert.throws(
    () => validateJsonPostgresEventAcceptanceEvidence({
      ...evidence,
      observed_event_count: evidence.observed_event_count + 1,
    }, { packet }),
    /invalid/u,
  );
});
