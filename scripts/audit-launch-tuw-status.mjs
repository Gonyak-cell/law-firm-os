#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { summarizeLaunchDecisionRegister } from "./lib/launch-decision-register.mjs";

const LEDGER_PATH = "workbook/launch-tuw/launch-tuw-ledger.json";
const REPORT_JSON_PATH = "docs/launch/launch-tuw-status-audit.json";
const REPORT_MD_PATH = "docs/launch/launch-tuw-status-audit.md";
const STANDARD_EVIDENCE_FILES = [
  "packet.json",
  "command-evidence.json",
  "claude-review-result.json",
  "adjudication.md",
  "construction-inspection.json"
];

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function phaseFromWpId(wpId) {
  if (wpId.startsWith("LT-PRE-")) return "PRE";
  const match = wpId.match(/^LT-(L\d+)-/);
  return match ? match[1] : "UNKNOWN";
}

function statusText(value) {
  return String(value ?? "").trim().toLowerCase();
}

function evidenceState(goalId) {
  const base = `docs/goal-closeout/${goalId}`;
  const files = Object.fromEntries(
    STANDARD_EVIDENCE_FILES.map((file) => [file, existsSync(`${base}/${file}`)])
  );
  const presentCount = Object.values(files).filter(Boolean).length;
  const commandPath = `${base}/command-evidence.json`;
  let commandStatus = null;
  let workPackageId = null;
  let blockedClaims = [];
  let reviewPolicy = null;

  if (files["command-evidence.json"]) {
    const commandEvidence = readJson(commandPath);
    commandStatus = commandEvidence.status ?? null;
    workPackageId = commandEvidence.work_package_id ?? null;
    blockedClaims = commandEvidence.blocked_claims ?? [];
    reviewPolicy = commandEvidence.review_policy ?? null;
  }

  const blocked =
    statusText(commandStatus).includes("blocked") ||
    statusText(commandStatus).includes("pending") ||
    blockedClaims.length > 0;
  const standardFivePresent = presentCount === STANDARD_EVIDENCE_FILES.length;
  const commandEvidencePresent = files["command-evidence.json"];

  let classification = "missing_evidence";
  if (standardFivePresent && blocked) classification = "standard_five_blocked";
  else if (standardFivePresent) classification = "standard_five_recorded";
  else if (commandEvidencePresent && blocked) classification = "command_evidence_only_blocked";
  else if (commandEvidencePresent) classification = "command_evidence_only_recorded";

  return {
    base,
    files,
    present_count: presentCount,
    standard_five_present: standardFivePresent,
    command_evidence_present: commandEvidencePresent,
    command_status: commandStatus,
    work_package_id_in_evidence: workPackageId,
    review_policy: reviewPolicy,
    blocked_claim_count: blockedClaims.length,
    classification
  };
}

function evaluateReadinessInput(contract, input) {
  const gates = {};
  const failedGateIds = [];

  for (const gateId of contract.gate_order ?? []) {
    const gateContract = contract.gates?.[gateId];
    const gateInput = input.gates?.[gateId];
    const requiredSlots = (gateContract?.evidence ?? []).map((slot) => slot.id);
    const missingEvidence = [];
    const failedEvidence = [];

    if (!gateInput) {
      missingEvidence.push(...requiredSlots);
    } else {
      for (const slotId of requiredSlots) {
        const record = gateInput.evidence?.[slotId];
        if (!record) {
          missingEvidence.push(slotId);
        } else if (statusText(record.status) !== "satisfied" || !String(record.ref ?? "").trim()) {
          failedEvidence.push(slotId);
        }
      }
    }

    const pass =
      statusText(gateInput?.criteria_status) === "satisfied" &&
      missingEvidence.length === 0 &&
      failedEvidence.length === 0;

    gates[gateId] = {
      status: pass ? "pass" : "fail",
      missing_evidence: missingEvidence,
      failed_evidence: failedEvidence
    };
    if (!pass) failedGateIds.push(gateId);
  }

  return {
    gate_count: Object.keys(gates).length,
    all_pass: failedGateIds.length === 0,
    failed_gate_ids: failedGateIds,
    gates
  };
}

function countBy(items, key) {
  return items.reduce((acc, item) => {
    const value = item[key] ?? "UNKNOWN";
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});
}

function renderMarkdown(report) {
  const lines = [];
  lines.push("# Launch TUW Status Audit");
  lines.push("");
  lines.push(`Generated at: ${report.generated_at}`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`- Work packages: ${report.summary.work_package_count}`);
  lines.push(`- TUWs: ${report.summary.tuw_count}`);
  lines.push(`- Standard five evidence present: ${report.summary.standard_five_present_count}`);
  lines.push(`- Command evidence present: ${report.summary.command_evidence_present_count}`);
  lines.push(`- Missing evidence packages: ${report.summary.missing_evidence_count}`);
  lines.push(`- Blocked or pending packages: ${report.summary.blocked_or_pending_count}`);
  lines.push(`- Owner-approved deferrals present: ${report.launch_decisions.owner_approved_deferrals_present}`);
  lines.push(`- Decision register rows: ${report.launch_decisions.total_rows}`);
  lines.push(`- Valid decided rows: ${report.launch_decisions.valid_decided_rows}`);
  lines.push(`- Valid deferred rows: ${report.launch_decisions.valid_deferred_rows}`);
  lines.push(`- Coverage-eligible valid deferred rows: ${report.launch_decisions.coverage_eligible_valid_deferred_rows}`);
  lines.push(`- Non-coverage valid deferred rows: ${report.launch_decisions.non_coverage_valid_deferred_rows}`);
  lines.push(`- Invalid decision rows: ${report.launch_decisions.invalid_decision_rows}`);
  lines.push("");
  lines.push("## Go-Live Readiness");
  lines.push("");
  lines.push(`- G1-G10 all pass: ${report.go_live_readiness.all_pass}`);
  lines.push(`- Failed gate ids: ${report.go_live_readiness.failed_gate_ids.join(", ") || "none"}`);
  lines.push(`- No-Go policy partial pass carryover: ${report.go_live_contract.no_go_policy.partial_pass_carryover}`);
  lines.push(`- Review waiver counts as valid review evidence: ${report.go_live_contract.no_go_policy.review_waiver_counts_as_valid_review_evidence}`);
  lines.push("");
  lines.push("## Phase Counts");
  lines.push("");
  lines.push("| Phase | WP count |");
  lines.push("| --- | --- |");
  for (const [phase, count] of Object.entries(report.summary.phase_counts)) {
    lines.push(`| ${phase} | ${count} |`);
  }
  lines.push("");
  lines.push("## Evidence Classification Counts");
  lines.push("");
  lines.push("| Classification | Count |");
  lines.push("| --- | --- |");
  for (const [classification, count] of Object.entries(report.summary.classification_counts)) {
    lines.push(`| ${classification} | ${count} |`);
  }
  lines.push("");
  lines.push("## Work Package Audit");
  lines.push("");
  lines.push("| WP | Phase | Evidence | Status | Gates |");
  lines.push("| --- | --- | --- | --- | --- |");
  for (const wp of report.work_packages) {
    lines.push(
      `| ${wp.wp_id} | ${wp.phase} | ${wp.evidence.classification} | ${wp.evidence.command_status ?? "missing"} | ${wp.gate_binding.join(", ")} |`
    );
  }
  lines.push("");
  lines.push("## Completion Boundary");
  lines.push("");
  lines.push("This audit does not close the launch goal. Current evidence proves that the ledger is intact and that blocker evidence is recorded, but G1-G10 go-live readiness is No-Go and no owner-approved deferral is present in the launch decision register.");
  return `${lines.join("\n")}\n`;
}

const ledger = readJson(LEDGER_PATH);
const existingReport = existsSync(REPORT_JSON_PATH) ? readJson(REPORT_JSON_PATH) : null;
const generatedAt = existingReport?.generated_at ?? new Date().toISOString();
const workPackages = ledger.work_packages.map((wp) => ({
  wp_id: wp.wp_id,
  goal_id: wp.goal_id,
  phase: phaseFromWpId(wp.wp_id),
  title: wp.title,
  gate_binding: wp.gate_binding ?? [],
  terminal_tuw: wp.terminal_tuw,
  tuw_count: wp.tuw_count,
  evidence: evidenceState(wp.goal_id)
}));

const contract = readJson("contracts/go-live-gate-contract.json");
const currentReadiness = readJson("docs/goal-closeout/lt-l8-w02/readiness-input.json");
const goLiveReadiness = evaluateReadinessInput(contract, currentReadiness);

const standardFivePresentCount = workPackages.filter((wp) => wp.evidence.standard_five_present).length;
const commandEvidencePresentCount = workPackages.filter((wp) => wp.evidence.command_evidence_present).length;
const missingEvidenceCount = workPackages.filter((wp) => wp.evidence.classification === "missing_evidence").length;
const blockedOrPendingCount = workPackages.filter((wp) =>
  wp.evidence.classification.includes("blocked") || statusText(wp.evidence.command_status).includes("pending")
).length;

const report = {
  schema_version: "law-firm-os.launch-tuw-status-audit.v0.1",
  generated_at: generatedAt,
  source_refs: [
    LEDGER_PATH,
    "contracts/go-live-gate-contract.json",
    "docs/goal-closeout/lt-l8-w02/readiness-input.json",
    "docs/launch/launch-decision-register.md"
  ],
  summary: {
    work_package_count: ledger.work_packages.length,
    tuw_count: ledger.tuws.length,
    phase_counts: countBy(workPackages, "phase"),
    classification_counts: countBy(workPackages.map((wp) => ({ classification: wp.evidence.classification })), "classification"),
    standard_five_present_count: standardFivePresentCount,
    command_evidence_present_count: commandEvidencePresentCount,
    missing_evidence_count: missingEvidenceCount,
    blocked_or_pending_count: blockedOrPendingCount
  },
  go_live_contract: {
    gate_order: contract.gate_order,
    no_go_policy: contract.no_go_policy
  },
  go_live_readiness: goLiveReadiness,
  launch_decisions: summarizeLaunchDecisionRegister(),
  work_packages: workPackages
};

mkdirSync(dirname(REPORT_JSON_PATH), { recursive: true });
writeFileSync(REPORT_JSON_PATH, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(REPORT_MD_PATH, renderMarkdown(report));

console.log(
  JSON.stringify(
    {
      report_json: REPORT_JSON_PATH,
      report_markdown: REPORT_MD_PATH,
      work_package_count: report.summary.work_package_count,
      tuw_count: report.summary.tuw_count,
      missing_evidence_count: report.summary.missing_evidence_count,
      blocked_or_pending_count: report.summary.blocked_or_pending_count,
      go_live_all_pass: report.go_live_readiness.all_pass,
      failed_gate_ids: report.go_live_readiness.failed_gate_ids,
      owner_approved_deferrals_present: report.launch_decisions.owner_approved_deferrals_present,
      valid_deferred_rows: report.launch_decisions.valid_deferred_rows,
      coverage_eligible_valid_deferred_rows: report.launch_decisions.coverage_eligible_valid_deferred_rows,
      non_coverage_valid_deferred_rows: report.launch_decisions.non_coverage_valid_deferred_rows,
      invalid_decision_rows: report.launch_decisions.invalid_decision_rows
    },
    null,
    2
  )
);
