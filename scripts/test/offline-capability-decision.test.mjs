import assert from "node:assert/strict";
import test from "node:test";
import { DECISION_PACKET_SCHEMA_VERSION, evaluateDecisionGate } from "../lib/runtime-safety-decision-gate.mjs";
import { inspectOfflineCapabilitySource, validateOfflineSourceOutcome } from "../lib/offline-capability-outcome.mjs";

const SOURCE_SHA = "a".repeat(40);
const SOURCE_TREE = "b".repeat(40);

function packet() {
  return {
    schema_version: DECISION_PACKET_SCHEMA_VERSION,
    packet_id: "packet-off-001",
    decision_source_sha: SOURCE_SHA,
    decision_source_tree: SOURCE_TREE,
    action: "offline-capability",
    environment: "desktop-local",
    required_role: "owner",
    allowed_decisions: ["approved", "rejected"],
    current_state: "PENDING_HUMAN_APPROVAL",
    requirements: ["Choose enabled or disabled before capability source is selected."],
    options: [
      { decision: "approved", effects: ["Permit a separate encrypted offline source lane."], prohibited_actions: ["No release or rollout."] },
      { decision: "rejected", effects: ["Keep desktop capability absent."], prohibited_actions: ["No cache, outbox, or replay source."] },
    ],
    external_actions_authorized: false,
    claims: { release: false, deployment: false, cutover: false, go_live: false },
  };
}

test("unsigned offline decision remains pending and cannot create capability source", () => {
  const gate = evaluateDecisionGate({
    packet: packet(), sourceSha: SOURCE_SHA, sourceTree: SOURCE_TREE,
    action: "offline-capability", environment: "desktop-local",
  });
  assert.equal(gate.outcome, "pending");
  assert.equal(gate.execution_state, "APPROVAL_REQUIRED");
  const source = validateOfflineSourceOutcome({ outcome: "pending", inspection: inspectOfflineCapabilitySource() });
  assert.equal(source.capability_path_count, 0);
  assert.equal(source.sqlite_imported_by_desktop_main, false);
  assert.equal(source.retired_offline_renderer_fail_closed, true);
});

test("enabled outcome cannot be claimed from the pending capability-absent source", () => {
  assert.throws(
    () => validateOfflineSourceOutcome({ outcome: "enabled", inspection: inspectOfflineCapabilitySource() }),
    (error) => error.code === "OFFLINE_ENABLED_SOURCE_MISSING",
  );
});
