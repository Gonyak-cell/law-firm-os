#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { evaluateDecisionGate, readDecisionPacket } from "./lib/runtime-safety-decision-gate.mjs";

function parse(argv) {
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
  const options = parse(process.argv.slice(2));
  const targetSourceSha = options["source-sha"];
  const decisionSourceSha = options["decision-source-sha"] ?? targetSourceSha;
  const decisionSourceTree = execFileSync("git", ["rev-parse", `${decisionSourceSha}^{tree}`], { encoding: "utf8" }).trim();
  const gate = evaluateDecisionGate({
    packet: readDecisionPacket(resolve(options.packet)),
    sourceSha: decisionSourceSha,
    sourceTree: decisionSourceTree,
    action: options.action,
    environment: options.environment,
    trustRegistryPath: options["trust-registry"],
    expectedTrustRegistrySha256: options["expected-trust-registry-sha256"],
    approvalReceiptPath: options["approval-receipt"],
  });
  process.stdout.write(`${JSON.stringify({
    validator: "dms-provider-authority-decision",
    ...gate,
    target_source_sha: targetSourceSha,
    decision_source_sha: decisionSourceSha,
    selector: gate.outcome === "pending" ? "unsigned_pending" : `signed_${gate.outcome}`,
    provider_contacted: false,
    provider_write_count: 0,
    release_executed: false,
    go_live: false,
  }, null, 2)}\n`);
} catch (error) {
  process.stderr.write(`${JSON.stringify({ verdict: "FAIL", code: error.code ?? "DMS_DECISION", message: error.message })}\n`);
  process.exit(1);
}
