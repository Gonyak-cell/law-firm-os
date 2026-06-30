#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import {
  ARTIFACT_DIR,
  OWNER_DECISION_PACKET_MD_PATH,
  OWNER_DECISION_PACKET_PATH,
  RELEASE_PREFLIGHT_PATH,
  fileExists,
  markdownTable,
  readJson,
  writeJson,
  writeText
} from "./lcx-full-helpers.mjs";

const EXTERNAL_RECEIPTS_VALIDATION_PATH = "docs/launch/launch-external-receipt-ledger-validation.json";
const FINAL_GO_LIVE_VALIDATION_PATH = "docs/launch/final-go-live-decision-validation.json";

function runCommand(command, args) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024
  });
  return {
    command: [command, ...args].join(" "),
    exit_code: result.status ?? 1,
    output: sanitizeOutput(`${result.stdout ?? ""}\n${result.stderr ?? ""}`)
  };
}

function sanitizeOutput(value) {
  return String(value ?? "")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]")
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/g, "Bearer [redacted]")
    .replace(/(token|secret|password|credential|authorization)(['":=\s]+)[^,\s}\]]+/gi, "$1$2[redacted]")
    .trim();
}

function parseLastJsonObject(output) {
  const text = String(output ?? "");
  const indexes = [];
  for (let index = 0; index < text.length; index += 1) {
    if (text[index] === "{") indexes.push(index);
  }
  for (const index of indexes.reverse()) {
    try {
      return JSON.parse(text.slice(index).trim());
    } catch {
      // Keep scanning earlier JSON candidates.
    }
  }
  return null;
}

function compactOutput(output, limit = 1000) {
  const compact = String(output ?? "").replace(/\s+/g, " ").trim();
  return compact.length > limit ? compact.slice(compact.length - limit) : compact;
}

function commandProof(tuw_id, label, command, args, classify) {
  const result = runCommand(command, args);
  const parsed = parseLastJsonObject(result.output);
  const classified = classify(result, parsed);
  return {
    tuw_id,
    label,
    command: result.command,
    exit_code: result.exit_code,
    claim_status: classified.claim_status,
    evidence_ref: classified.evidence_ref ?? null,
    allowed_claim: classified.allowed_claim,
    blocked_reason: classified.blocked_reason ?? null,
    parsed_summary: classified.parsed_summary ?? null,
    output_tail: compactOutput(result.output)
  };
}

function classifyExternalReceipts(result, parsed) {
  if (result.exit_code === 0 && parsed?.verdict === "PASS") {
    return {
      claim_status: "PASS",
      evidence_ref: parsed.report_json,
      allowed_claim: "external receipt ledger is complete; it does not approve production cutover",
      parsed_summary: {
        external_receipt_lane_count: parsed.external_receipt_lane_count,
        real_external_receipt_count: parsed.real_external_receipt_count,
        pending_external_receipt_count: parsed.pending_external_receipt_count
      }
    };
  }
  return {
    claim_status: "FAIL",
    allowed_claim: "external receipt ledger validation failed",
    blocked_reason: "External receipt validation did not pass."
  };
}

function classifyFinalDecision(result, parsed) {
  if (result.exit_code === 0 && parsed?.verdict === "PASS") {
    return {
      claim_status: "PASS_RECORDED_PENDING_CUTOVER",
      evidence_ref: parsed.report_json,
      allowed_claim: "final go-live approval is recorded, while actual launch/go-live remains false",
      parsed_summary: {
        final_go_live_approval_recorded: parsed.final_go_live_approval_recorded,
        actual_launch_go_live_claim: parsed.actual_launch_go_live_claim,
        real_external_receipt_count: parsed.real_external_receipt_count,
        pending_external_receipt_count: parsed.pending_external_receipt_count
      }
    };
  }
  return {
    claim_status: "FAIL",
    allowed_claim: "go/no-go packet validation failed",
    blocked_reason: "Final go-live decision validation did not pass."
  };
}

function classifyNoPrematureClaim(result, parsed) {
  if (result.exit_code === 0 && parsed?.verdict === "PASS") {
    return {
      claim_status: "PASS",
      allowed_claim: "residual risk register has no premature public/go-live/provider-production claims",
      parsed_summary: {
        checked_files: parsed.checked_files,
        finding_count: parsed.findings?.length ?? 0,
        public_release_claim: parsed.public_release_claim,
        production_go_live_claim: parsed.production_go_live_claim,
        owner_approval_claim: parsed.owner_approval_claim,
        provider_production_write_claim: parsed.provider_production_write_claim
      }
    };
  }
  return {
    claim_status: "FAIL",
    allowed_claim: "premature claim guard failed",
    blocked_reason: "Residual risk/no-premature-claim validation did not pass."
  };
}

function evidenceFiles() {
  const files = readdirSync(ARTIFACT_DIR)
    .filter((file) => /^lcx-full-\d{2}-.+\.json$/.test(file))
    .map((file) => `${ARTIFACT_DIR}/${file}`)
    .sort();
  return [...new Set([...files, OWNER_DECISION_PACKET_PATH])];
}

function parentCoverage(files) {
  const parents = new Set();
  for (const file of files) {
    const match = file.match(/lcx-full-(\d{2})-/);
    if (match) parents.add(`LCX-FULL-${match[1]}`);
  }
  return Array.from({ length: 21 }, (_, index) => `LCX-FULL-${String(index).padStart(2, "0")}`).map((parent) => ({
    parent,
    covered: parents.has(parent)
  }));
}

const externalReceipts = commandProof(
  "LCX-FULL-20.02",
  "external receipt ledger",
  "npm",
  ["run", "launch:external-receipts:validate"],
  classifyExternalReceipts
);
const finalDecision = commandProof(
  "LCX-FULL-20.03",
  "go/no-go decision packet",
  "npm",
  ["run", "launch:final-go-live-decision:validate"],
  classifyFinalDecision
);
const residualRisks = commandProof(
  "LCX-FULL-20.04",
  "residual risk and premature-claim guard",
  "npm",
  ["run", "lcx:full:no-premature-claim:validate"],
  classifyNoPrematureClaim
);

const releasePreflight = fileExists(RELEASE_PREFLIGHT_PATH) ? readJson(RELEASE_PREFLIGHT_PATH) : null;
const externalReport = fileExists(EXTERNAL_RECEIPTS_VALIDATION_PATH) ? readJson(EXTERNAL_RECEIPTS_VALIDATION_PATH) : null;
const finalReport = fileExists(FINAL_GO_LIVE_VALIDATION_PATH) ? readJson(FINAL_GO_LIVE_VALIDATION_PATH) : null;
const files = evidenceFiles();
const coverage = parentCoverage(files);

let report = {
  schema_version: "law-firm-os.lazycodex.lcx_full.owner_release_decision_packet.v0.1",
  generated_at: new Date().toISOString(),
  tuw_parent: "LCX-FULL-20",
  verdict: "PASS",
  status: "owner_release_decision_packet_recorded_pending_cutover",
  child_tuws: [
    {
      tuw_id: "LCX-FULL-20.01",
      label: "final implementation evidence index",
      claim_status: coverage.every((entry) => entry.covered) ? "PASS" : "FAIL",
      evidence_ref: OWNER_DECISION_PACKET_PATH,
      allowed_claim: "all LCX-FULL parent evidence artifacts are indexed"
    },
    externalReceipts,
    finalDecision,
    residualRisks,
    {
      tuw_id: "LCX-FULL-20.05",
      label: "owner response intake",
      claim_status: finalReport?.summary?.final_go_live_approval_recorded === true ? "PASS_RECORDED_PENDING_CUTOVER" : "BLOCKED",
      evidence_ref: FINAL_GO_LIVE_VALIDATION_PATH,
      allowed_claim: "human final go-live approval is recorded only as a pre-cutover decision; agent cannot close public release",
      blocked_reason: finalReport?.summary?.final_go_live_approval_recorded === true ? null : "Owner final go-live approval receipt is not recorded."
    }
  ],
  evidence_index: {
    artifact_dir: ARTIFACT_DIR,
    artifact_count: files.length,
    parent_coverage: coverage,
    missing_parents: coverage.filter((entry) => !entry.covered).map((entry) => entry.parent),
    artifact_refs: files
  },
  source_validations: {
    release_preflight_ref: RELEASE_PREFLIGHT_PATH,
    release_preflight_status: releasePreflight?.status ?? "missing",
    release_preflight_blocked_gates: releasePreflight?.gates?.filter((entry) => entry.claim_status === "BLOCKED").map((entry) => entry.tuw_id) ?? [],
    external_receipts_validation: externalReport?.verdict ?? null,
    final_go_live_decision_validation: finalReport?.verdict ?? null
  },
  boundary: {
    final_go_live_approval_recorded: finalReport?.summary?.final_go_live_approval_recorded === true,
    actual_launch_go_live_claim: finalReport?.summary?.actual_launch_go_live_claim === true,
    production_cutover_executed_by_this_packet: false,
    company_wide_go_live_executed_by_this_packet: false,
    public_release_claim: false,
    app_store_or_public_distribution_claim: false,
    agent_closed_owner_review: false,
    external_receipts_count_as_production_cutover: false,
    blocked_release_gates_promoted_to_pass: false
  }
};

const failed = report.child_tuws.filter((entry) => entry.claim_status === "FAIL");
if (failed.length > 0) report.verdict = "FAIL";

writeJson(OWNER_DECISION_PACKET_PATH, report);

const rgProof = runCommand("rg", ["-n", "LCX-FULL-00|LCX-FULL-20", "docs/lazycodex/evidence"]);
report = {
  ...report,
  evidence_index_proof: {
    command: rgProof.command,
    exit_code: rgProof.exit_code,
    output_tail: compactOutput(rgProof.output, 1600)
  }
};
writeJson(OWNER_DECISION_PACKET_PATH, report);

const rows = report.child_tuws.map((entry) => ({
  TUW: entry.tuw_id,
  Gate: entry.label,
  Claim: entry.claim_status,
  Evidence: entry.evidence_ref ?? "(command output)",
  Boundary: entry.allowed_claim
}));
const md = [
  "# LCX-FULL-20 Owner Release Decision Packet",
  "",
  `Generated at: ${report.generated_at}`,
  "",
  `Verdict: ${report.verdict}`,
  "",
  `Status: ${report.status}`,
  "",
  markdownTable(rows, ["TUW", "Gate", "Claim", "Evidence", "Boundary"]),
  "",
  "## Evidence Index",
  "",
  `- Artifact count: ${report.evidence_index.artifact_count}`,
  `- Missing parents: ${report.evidence_index.missing_parents.length > 0 ? report.evidence_index.missing_parents.join(", ") : "(none)"}`,
  "",
  "## Boundary",
  "",
  "- Final go-live approval may be recorded from owner evidence, but this packet does not execute cutover.",
  "- Actual launch/go-live, company-wide rollout, public release, and public distribution remain false.",
  "- BLOCKED release gates remain blocked and are not promoted by this owner decision packet."
].join("\n");
writeText(OWNER_DECISION_PACKET_MD_PATH, `${md}\n`);

console.log(JSON.stringify({
  verdict: report.verdict,
  status: report.status,
  packet: OWNER_DECISION_PACKET_PATH,
  missing_parents: report.evidence_index.missing_parents,
  final_go_live_approval_recorded: report.boundary.final_go_live_approval_recorded,
  actual_launch_go_live_claim: report.boundary.actual_launch_go_live_claim
}, null, 2));

if (report.verdict !== "PASS") process.exit(1);
