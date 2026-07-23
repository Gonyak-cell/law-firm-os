import assert from "node:assert/strict";
import test from "node:test";
import {
  createJsonPostgresReleaseSecurityEvidence,
  validateJsonPostgresReleaseSecurityEvidence,
} from "../lib/json-postgres-release-security.mjs";

const packet = {
  phase: "w13-production-cutover",
  source_sha: "a".repeat(40),
  source_tree: "b".repeat(40),
  packet_sha256: "c".repeat(64),
};
const receipt = {
  valid: true,
  signature_valid: true,
  receipt_kind: "cut-008",
  execution_state: "PASS",
  source_sha: packet.source_sha,
  source_tree: packet.source_tree,
  packet_sha256: packet.packet_sha256,
  canonical_sha256: "d".repeat(64),
  safe_counts: { required_postgres_test_skip_count: 0 },
};
const check = (name, app = "github-actions") => ({
  name,
  head_sha: packet.source_sha,
  status: "completed",
  conclusion: "success",
  app: { slug: app },
});

test("release security requires exact-main workflow, HRX, CodeQL and zero high alerts", () => {
  const evidence = createJsonPostgresReleaseSecurityEvidence({
    packet,
    cut008Receipt: receipt,
    checkRuns: [
      check("JSON PostgreSQL exact-head security"),
      check("HRX rollout validation"),
      check("CodeQL / Analyze (javascript-typescript)", "github-code-scanning"),
    ],
    codeAlerts: [],
    dependencyAlerts: [],
    secretAlerts: [],
  });
  assert.equal(evidence.outcome, "PASS");
  assert.equal(evidence.open_high_count, 0);
  assert.equal(validateJsonPostgresReleaseSecurityEvidence(evidence, { packet }).valid, true);
  assert.throws(() => validateJsonPostgresReleaseSecurityEvidence({
    ...evidence,
    open_high_count: 1,
  }, { packet }), /invalid/u);
  assert.throws(() => createJsonPostgresReleaseSecurityEvidence({
    packet,
    cut008Receipt: receipt,
    checkRuns: [
      check("JSON PostgreSQL exact-head security"),
      check("HRX rollout validation"),
    ],
    codeAlerts: [],
    dependencyAlerts: [],
    secretAlerts: [],
  }), /CodeQL/u);
});
