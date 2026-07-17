#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { evaluateDecisionGate, readDecisionPacket } from "./lib/runtime-safety-decision-gate.mjs";
import { inspectOfflineCapabilitySource, validateOfflineSourceOutcome } from "./lib/offline-capability-outcome.mjs";

function args(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (!flag?.startsWith("--") || value === undefined) throw new TypeError(`invalid argument: ${flag ?? "<missing>"}`);
    result[flag.slice(2)] = value;
  }
  return result;
}

try {
  const options = args(process.argv.slice(2));
  const sourceSha = options["source-sha"];
  const sourceTree = execFileSync("git", ["rev-parse", `${sourceSha}^{tree}`], { encoding: "utf8" }).trim();
  const gate = evaluateDecisionGate({
    packet: readDecisionPacket(resolve(options.packet ?? "workbook/lawos-offline-action-conflict-decision-packet-2026-07-17.json")),
    sourceSha,
    sourceTree,
    action: "offline-capability",
    environment: "desktop-local",
    trustRegistryPath: options["trust-registry"],
    expectedTrustRegistrySha256: options["expected-trust-registry-sha256"],
    approvalReceiptPath: options["decision-receipt"],
  });
  const selected = gate.outcome === "approved" ? "enabled" : gate.outcome === "rejected" ? "disabled" : "pending";
  if (options.outcome !== selected) {
    const error = new Error(`requested offline outcome ${options.outcome} does not match ${selected}`);
    error.code = "OFFLINE_OUTCOME_MISMATCH";
    throw error;
  }
  const source = validateOfflineSourceOutcome({ outcome: selected, inspection: inspectOfflineCapabilitySource() });
  const status = {
    schema_version: "law-firm-os.runtime-safety.offline-outcome-status.v1",
    outcome: selected,
    source_sha: sourceSha,
    source_tree: sourceTree,
    packet_sha256: gate.packet_sha256,
    implementation_state: selected === "pending" ? "PLANNED" : selected === "disabled" ? "DISABLED_BY_APPROVED_DECISION" : "VERIFIED",
    execution_state: selected === "pending" ? "APPROVAL_REQUIRED" : "NOT_APPLICABLE",
    verified: selected !== "pending",
    capability_path_count: source.capability_path_count,
    retired_offline_renderer_fail_closed: source.retired_offline_renderer_fail_closed,
    external_actions_executed: 0,
    release_executed: false,
    deployment_executed: false,
    cutover_executed: false,
    go_live: false,
  };
  if (options["output-dir"]) {
    mkdirSync(resolve(options["output-dir"]), { recursive: true, mode: 0o700 });
    writeFileSync(resolve(options["output-dir"], "status.json"), `${JSON.stringify(status, null, 2)}\n`, { flag: "wx", mode: 0o600 });
    writeFileSync(resolve(options["output-dir"], "off-outcome.json"), `${JSON.stringify({
      schema_version: "law-firm-os.runtime-safety.off-outcome.v1",
      outcome: selected,
      source_sha: sourceSha,
      source_tree: sourceTree,
      packet_sha256: gate.packet_sha256,
      verified: selected !== "pending",
      capability_path_count: source.capability_path_count,
      external_actions_executed: 0,
      release_executed: false,
      go_live: false,
    }, null, 2)}\n`, { flag: "wx", mode: 0o600 });
  }
  process.stdout.write(`${JSON.stringify(status, null, 2)}\n`);
} catch (error) {
  process.stderr.write(`${JSON.stringify({ verdict: "FAIL", code: error.code ?? "OFFLINE_OUTCOME", message: error.message })}\n`);
  process.exit(1);
}
