#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { evaluateDecisionGate, readDecisionPacket } from "./lib/runtime-safety-decision-gate.mjs";

const REQUIRED_SOURCE_PATHS = Object.freeze([
  "apps/api/src/home-dashboard-operational-state.js",
  "apps/api/src/home-dashboard-runtime-context.js",
  "packages/analytics/src/refresh-job-service.js",
  "packages/analytics/src/runtime-repository.js",
]);

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
  const sourceSha = options["source-sha"];
  const sourceTree = execFileSync("git", ["rev-parse", `${sourceSha}^{tree}`], { encoding: "utf8" }).trim();
  for (const path of REQUIRED_SOURCE_PATHS) {
    execFileSync("git", ["cat-file", "-e", `${sourceSha}:${path}`], { stdio: "ignore" });
  }
  const gate = evaluateDecisionGate({
    packet: readDecisionPacket(resolve(options.packet)),
    sourceSha: options["decision-source-sha"],
    sourceTree: execFileSync("git", ["rev-parse", `${options["decision-source-sha"]}^{tree}`], { encoding: "utf8" }).trim(),
    action: "readiness-authority",
    environment: "source-local",
    trustRegistryPath: options["trust-registry"],
    expectedTrustRegistrySha256: options["expected-trust-registry-sha256"],
    approvalReceiptPath: options["approval-receipt"],
  });
  if (gate.outcome === "approved" && !options["source-verification-bundle"]) {
    const error = new Error("approved PRJ terminal requires a separate exact-SHA source verification bundle");
    error.code = "PRJ_SOURCE_VERIFICATION_REQUIRED";
    throw error;
  }
  const outcome = gate.outcome === "approved" ? "approved" : gate.outcome === "rejected" ? "rejected" : "pending";
  const result = {
    schema_version: "law-firm-os.runtime-safety.prj-outcome.v1",
    outcome,
    source_sha: sourceSha,
    source_tree: sourceTree,
    decision_source_sha: options["decision-source-sha"],
    packet_sha256: gate.packet_sha256,
    verified: outcome !== "pending",
    implementation_state: outcome === "approved" ? "VERIFIED" : outcome === "rejected" ? "DISABLED_BY_APPROVED_DECISION" : "PLANNED",
    execution_state: outcome === "pending" ? "APPROVAL_REQUIRED" : "NOT_APPLICABLE",
    source_path_count: REQUIRED_SOURCE_PATHS.length,
    external_actions_executed: 0,
    db_writes: 0,
    real_data_used: false,
    release_executed: false,
    deployment_executed: false,
    cutover_executed: false,
    go_live: false,
  };
  const outputDir = resolve(options["output-dir"]);
  mkdirSync(outputDir, { recursive: true, mode: 0o700 });
  writeFileSync(resolve(outputDir, "prj-outcome.json"), `${JSON.stringify(result, null, 2)}\n`, { flag: "wx", mode: 0o600 });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} catch (error) {
  process.stderr.write(`${JSON.stringify({ verdict: "FAIL", code: error.code ?? "PRJ_OUTCOME", message: error.message })}\n`);
  process.exit(1);
}
