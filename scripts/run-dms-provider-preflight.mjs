#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { evaluateDecisionGate, readDecisionPacket } from "./lib/runtime-safety-decision-gate.mjs";

function parse(argv) {
  const result = { preflightOnly: false };
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === "--preflight-only") result.preflightOnly = true;
    else {
      const value = argv[++index];
      if (!flag?.startsWith("--") || value === undefined) throw new TypeError(`invalid argument: ${flag ?? "<missing>"}`);
      result[flag.slice(2)] = value;
    }
  }
  return result;
}

try {
  const options = parse(process.argv.slice(2));
  if (!options.preflightOnly) {
    const error = new Error("DMS provider execution requires a future exact approval and user instruction");
    error.code = "DMS_PROVIDER_EXECUTION_OUT_OF_SCOPE";
    throw error;
  }
  const targetSourceSha = options["source-sha"];
  const targetSourceTree = execFileSync("git", ["rev-parse", `${targetSourceSha}^{tree}`], { encoding: "utf8" }).trim();
  const decisionSourceSha = options["decision-source-sha"] ?? targetSourceSha;
  const decisionSourceTree = execFileSync("git", ["rev-parse", `${decisionSourceSha}^{tree}`], { encoding: "utf8" }).trim();
  const gate = evaluateDecisionGate({
    packet: readDecisionPacket(resolve(options.packet)),
    sourceSha: decisionSourceSha,
    sourceTree: decisionSourceTree,
    action: "dms-provider-authority",
    environment: "source-local",
    trustRegistryPath: options["trust-registry"],
    expectedTrustRegistrySha256: options["expected-trust-registry-sha256"],
    approvalReceiptPath: options["approval-receipt"],
  });
  const status = {
    schema_version: "law-firm-os.runtime-safety.dms-provider-preflight.v1",
    source_sha: targetSourceSha,
    source_tree: targetSourceTree,
    decision_source_sha: decisionSourceSha,
    packet_sha256: gate.packet_sha256,
    implementation_state: "READY",
    execution_state: "APPROVAL_REQUIRED",
    verified: false,
    decision: gate.decision,
    blockers: ["DMS_PROVIDER_APPROVAL_REQUIRED", "USER_EXECUTION_INSTRUCTION_REQUIRED"],
    provider_contacted: false,
    provider_write_count: 0,
    real_data_used: false,
    staging_contacted: false,
    production_contacted: false,
    release_executed: false,
    go_live: false,
  };
  const outputDir = resolve(options["output-dir"]);
  mkdirSync(outputDir, { recursive: true, mode: 0o700 });
  writeFileSync(resolve(outputDir, "status.json"), `${JSON.stringify(status, null, 2)}\n`, { flag: "wx", mode: 0o600 });
  process.stdout.write(`${JSON.stringify(status, null, 2)}\n`);
} catch (error) {
  process.stderr.write(`${JSON.stringify({ verdict: "FAIL", code: error.code ?? "DMS_PROVIDER_PREFLIGHT", message: error.message })}\n`);
  process.exit(1);
}
