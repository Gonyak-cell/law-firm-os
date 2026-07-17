#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const PHASES = Object.freeze({
  "dependency-preflight": "CUT-003",
  "staging-freeze-delta": "CUT-005",
  "staging-db-only-switch": "CUT-006",
  "staging-smoke": "CUT-007",
  "production-cutover": "CUT-009",
  "production-dr-restore": "CUT-010",
  "production-no-fallback": "CUT-011",
  "production-terminal": "CUT-012",
});
const SAFE_MODES = new Set(["dependency-preflight", "preflight-only", "approval-required"]);

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

function fileHash(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

try {
  const options = parse(process.argv.slice(2));
  const stage = PHASES[options.phase];
  if (!stage) throw new TypeError("--phase is not a closed cutover phase");
  if (!SAFE_MODES.has(options.mode)) {
    const error = new Error("execute mode is outside the current authorization; exact approval and user execution instruction are required in a future source revision");
    error.code = "CUT_EXECUTION_OUT_OF_SCOPE";
    throw error;
  }
  const sourceSha = options["source-sha"];
  const sourceTree = execFileSync("git", ["rev-parse", `${sourceSha}^{tree}`], { encoding: "utf8" }).trim();
  const priorPath = resolve(options["prior-receipt"]);
  if (!existsSync(priorPath)) throw new Error("--prior-receipt is required and must exist");
  const prior = JSON.parse(readFileSync(priorPath, "utf8"));
  if (prior.target_source_sha !== sourceSha || !/^RS-CUT-\d{3}$/u.test(prior.tuw_id ?? "")) {
    const error = new Error("prior receipt is not source-bound cutover evidence");
    error.code = "CUT_PREDECESSOR";
    throw error;
  }
  if (options["dependency-receipt"]) {
    const dependency = JSON.parse(readFileSync(resolve(options["dependency-receipt"]), "utf8"));
    if (dependency.target_source_sha !== sourceSha || dependency.target_tree !== sourceTree) {
      const error = new Error("dependency receipt does not bind the cutover source");
      error.code = "CUT_DEPENDENCY_RECEIPT";
      throw error;
    }
  }
  const packetPath = options.packet ? resolve(options.packet) : null;
  if (packetPath && !existsSync(packetPath)) throw new Error("cutover packet is missing");
  const outputDir = resolve(options["output-dir"]);
  mkdirSync(outputDir, { recursive: true, mode: 0o700 });
  const status = {
    schema_version: "law-firm-os.runtime-safety.cut-preflight-status.v1",
    stage,
    phase: options.phase,
    mode: options.mode,
    source_sha: sourceSha,
    source_tree: sourceTree,
    prior_tuw_id: prior.tuw_id,
    prior_receipt_sha256: fileHash(priorPath),
    prior_verified: prior.claims?.verified === true,
    packet_sha256: packetPath ? fileHash(packetPath) : null,
    implementation_state: stage === "CUT-003" ? "PLANNED" : "READY",
    execution_state: "APPROVAL_REQUIRED",
    verified: false,
    blockers: ["APPROVAL_REQUIRED", "USER_EXECUTION_INSTRUCTION_REQUIRED", ...(prior.claims?.verified === true ? [] : ["PREDECESSOR_NOT_VERIFIED"])],
    db_connections: 0,
    db_writes: 0,
    external_actions_executed: 0,
    real_data_used: false,
    release_executed: false,
    deployment_executed: false,
    json_authority_disabled: false,
    cutover_executed: false,
    go_live: false,
  };
  writeFileSync(resolve(outputDir, "status.json"), `${JSON.stringify(status, null, 2)}\n`, { flag: "wx", mode: 0o600 });
  process.stdout.write(`${JSON.stringify(status, null, 2)}\n`);
} catch (error) {
  process.stderr.write(`${JSON.stringify({ verdict: "FAIL", code: error.code ?? "CUT_RUN", message: error.message })}\n`);
  process.exit(1);
}
