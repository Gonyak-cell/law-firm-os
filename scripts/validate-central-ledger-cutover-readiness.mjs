#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { evaluateDecisionGate, readDecisionPacket } from "./lib/runtime-safety-decision-gate.mjs";
import { validateCutSourceInventory } from "./lib/central-ledger-cutover-contract.mjs";

const APPROVAL_STAGES = Object.freeze({
  "CUT-001": Object.freeze({ action: "central-ledger-cutover-plan", environment: "source-local" }),
  "CUT-004": Object.freeze({ action: "central-ledger-staging-acceptance", environment: "staging" }),
  "CUT-008": Object.freeze({ action: "central-ledger-production-authorization", environment: "production" }),
});

const PREDECESSORS = Object.freeze({
  "CUT-003": "RS-CUT-002",
  "CUT-005": "RS-CUT-003",
  "CUT-006": "RS-CUT-005",
  "CUT-007": "RS-CUT-006",
  "CUT-009": "RS-CUT-008",
  "CUT-010": "RS-CUT-009",
  "CUT-011": "RS-CUT-010",
  "CUT-012": "RS-CUT-011",
});

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

function writeResult(options, result) {
  const outputPath = options["output-receipt"]
    ? resolve(options["output-receipt"])
    : options["output-dir"]
      ? resolve(options["output-dir"], "readiness.json")
      : null;
  if (!outputPath) return;
  if (options["output-dir"]) mkdirSync(resolve(options["output-dir"]), { recursive: true, mode: 0o700 });
  writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`, { flag: "wx", mode: 0o600 });
}

try {
  const options = parse(process.argv.slice(2));
  const stage = options.stage;
  if (!/^CUT-0(?:0[1-9]|1[0-2])$/u.test(stage ?? "")) throw new TypeError("--stage must be CUT-001 through CUT-012");
  const sourceSha = options["source-sha"];
  const sourceTree = execFileSync("git", ["rev-parse", `${sourceSha}^{tree}`], { encoding: "utf8" }).trim();
  let result;
  if (APPROVAL_STAGES[stage]) {
    const contract = APPROVAL_STAGES[stage];
    const gate = evaluateDecisionGate({
      packet: readDecisionPacket(resolve(options.packet)),
      sourceSha,
      sourceTree,
      action: options.action ?? contract.action,
      environment: options.environment ?? contract.environment,
      trustRegistryPath: options["trust-registry"],
      expectedTrustRegistrySha256: options["expected-trust-registry-sha256"],
      approvalReceiptPath: options["approval-receipt"],
    });
    result = {
      validator: "central-ledger-cutover-readiness",
      stage,
      ...gate,
      implementation_state: gate.outcome === "pending" ? "READY" : gate.outcome === "rejected" ? "BLOCKED" : "VERIFIED",
      execution_state: gate.outcome === "pending" ? "APPROVAL_REQUIRED" : "NOT_APPLICABLE",
      verified: gate.outcome === "approved",
      external_actions_executed: 0,
      db_writes: 0,
    };
  } else if (stage === "CUT-002") {
    const bundle = JSON.parse(readFileSync(resolve(options["dependency-receipt-bundle"]), "utf8"));
    const inventory = JSON.parse(readFileSync(resolve(options.packet), "utf8"));
    const validated = validateCutSourceInventory(inventory, { dependencyBundle: bundle });
    result = {
      validator: "central-ledger-cutover-readiness",
      stage,
      source_sha: sourceSha,
      source_tree: sourceTree,
      dependency_satisfied: validated.dependency_satisfied,
      blockers: validated.blockers,
      implementation_state: validated.dependency_satisfied ? "VERIFIED" : "PLANNED",
      execution_state: validated.dependency_satisfied ? "NOT_APPLICABLE" : "APPROVAL_REQUIRED",
      verified: validated.dependency_satisfied,
      external_actions_executed: 0,
      db_writes: 0,
    };
  } else {
    const prior = JSON.parse(readFileSync(resolve(options["prior-receipt"]), "utf8"));
    if (prior.tuw_id !== PREDECESSORS[stage] || prior.target_source_sha !== sourceSha) {
      const error = new Error("cutover predecessor receipt does not bind the expected TUW and source");
      error.code = "CUT_PREDECESSOR";
      throw error;
    }
    const verified = prior.claims?.verified === true;
    result = {
      validator: "central-ledger-cutover-readiness",
      stage,
      source_sha: sourceSha,
      source_tree: sourceTree,
      predecessor_tuw_id: prior.tuw_id,
      predecessor_verified: verified,
      implementation_state: verified && stage === "CUT-003" ? "VERIFIED" : stage === "CUT-003" ? "PLANNED" : "READY",
      execution_state: verified && stage === "CUT-003" ? "NOT_APPLICABLE" : "APPROVAL_REQUIRED",
      verified: verified && stage === "CUT-003",
      external_actions_executed: 0,
      db_writes: 0,
    };
  }
  const closed = { ...result, real_data_used: false, release_executed: false, deployment_executed: false, json_authority_disabled: false, cutover_executed: false, go_live: false };
  writeResult(options, closed);
  process.stdout.write(`${JSON.stringify(closed, null, 2)}\n`);
} catch (error) {
  process.stderr.write(`${JSON.stringify({ verdict: "FAIL", code: error.code ?? "CUT_READINESS", message: error.message, details: error.details ?? {} })}\n`);
  process.exit(1);
}
