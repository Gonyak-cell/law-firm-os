#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { evaluateDecisionGate, readDecisionPacket } from "./lib/runtime-safety-decision-gate.mjs";

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
  const result = evaluateDecisionGate({
    packet: readDecisionPacket(resolve(options.packet)),
    sourceSha,
    sourceTree,
    action: options.action,
    environment: options.environment,
    trustRegistryPath: options["trust-registry"],
    expectedTrustRegistrySha256: options["expected-trust-registry-sha256"],
    approvalReceiptPath: options["approval-receipt"],
  });
  const selector = result.outcome === "approved" ? "enabled" : result.outcome === "rejected" ? "disabled" : "pending";
  process.stdout.write(`${JSON.stringify({
    validator: "offline-capability-decision",
    ...result,
    selector,
    offline_capability_enabled: selector === "enabled",
    release_executed: false,
    deployment_executed: false,
    cutover_executed: false,
    go_live: false,
  }, null, 2)}\n`);
} catch (error) {
  process.stderr.write(`${JSON.stringify({ verdict: "FAIL", code: error.code ?? "DECISION_GATE", message: error.message, details: error.details ?? {} })}\n`);
  process.exit(1);
}
