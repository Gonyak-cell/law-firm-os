#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const AUDIT_PATH = "docs/launch/launch-tuw-status-audit.json";
const CONTRACT_PATH = "contracts/go-live-gate-contract.json";
const DEFERRAL_COVERAGE_AUDIT_PATH = "docs/launch/launch-deferral-coverage-audit.json";
const REPORT_JSON_PATH = "docs/launch/owner-action-deferral-request.json";
const REPORT_MD_PATH = "docs/launch/owner-action-deferral-request.md";
const ACCEPTED_DECISION_ID_PATTERNS = [
  {
    domain: "go_live_gate_evidence",
    accepted_decision_ids: ["ACC-GL-<gate>-<evidence>", "COVERAGE-GATE-<gate>", "COVERAGE-ALL-GO-LIVE"],
    use: "Exact failed G1-G10 evidence slot, one failed gate, or all failed go-live slots."
  },
  {
    domain: "l9_stabilization_closure",
    accepted_decision_ids: ["ACC-L9-C##", "COVERAGE-L9-STABILIZATION"],
    use: "Exact L9 stabilization criterion or all L9 stabilization criteria."
  },
  {
    domain: "blocked_work_package",
    accepted_decision_ids: ["WP-<wp_id>", "COVERAGE-PHASE-<phase>", "COVERAGE-ALL-BLOCKED-WP"],
    use: "Exact blocked work package, phase-level blocked-WP group, or all blocked work packages."
  },
  {
    domain: "phase_exit",
    accepted_decision_ids: ["PHASE-<phase>", "PHASE-<exit_gate>", "COVERAGE-ALL-PHASE-EXITS"],
    use: "Exact phase exit, exact exit gate, or all PRE-L9 phase exits."
  }
];

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function maybeReadJson(path) {
  return existsSync(path) ? readJson(path) : null;
}

function statusText(value) {
  return String(value ?? "").trim().toLowerCase();
}

function markdownCell(value) {
  return String(value ?? "").replaceAll("|", "\\|").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function classifyBlocker({ title, status }) {
  const text = `${title} ${status}`.toLowerCase();
  const categories = [];
  if (/owner|human|approval|approve|ratification|signature|signoff|decision|decided|governance/.test(text)) {
    categories.push("owner_decision_or_signature");
  }
  if (/external|legal|pentest|vendor|m365|graph|tenant|admin consent/.test(text)) {
    categories.push("external_dependency");
  }
  if (/runtime|staging|telemetry|rehearsal|dashboard|alert|pilot|uat|training|cutover|hypercare|production|test|migration|backfill|delta|rollback|deploy|performance/.test(text)) {
    categories.push("runtime_or_operational_evidence");
  }
  if (/storage|mat-dec|confidentiality|enum|scope|roadmap|threshold|rpo|rto|slo|kpi/.test(text)) {
    categories.push("policy_or_scope_decision");
  }
  return categories.length ? [...new Set(categories)] : ["evidence_completion"];
}

function commandEvidenceFor(wp) {
  return maybeReadJson(`${wp.evidence.base}/command-evidence.json`) ?? {};
}

function packetFor(wp) {
  return maybeReadJson(`${wp.evidence.base}/packet.json`) ?? {};
}

function constructionFor(wp) {
  return maybeReadJson(`${wp.evidence.base}/construction-inspection.json`) ?? {};
}

function gateEvidenceLookup(contract) {
  const lookup = {};
  for (const [gateId, gate] of Object.entries(contract.gates ?? {})) {
    for (const evidence of gate.evidence ?? []) {
      lookup[evidence.id] = {
        gate_id: gateId,
        dimension: gate.dimension,
        slot: evidence.slot,
        required_state: evidence.required_state
      };
    }
  }
  return lookup;
}

function renderMarkdown(report) {
  const lines = [];
  lines.push("# Launch Owner Action and Deferral Request Package");
  lines.push("");
  lines.push(`Generated at: ${report.generated_at}`);
  lines.push("");
  lines.push("## Boundary");
  lines.push("");
  lines.push("- This package does not approve go-live, does not approve a deferral, and does not modify the launch decision register.");
  lines.push("- The launch decision register allows only `decided` or `deferred(시한 명기)` rows with real owner evidence.");
  lines.push("- Full Claude review is waived by user instruction and is not valid review evidence.");
  lines.push("- Closed CP evidence remains read-only.");
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`- Work packages: ${report.summary.work_package_count}`);
  lines.push(`- TUWs: ${report.summary.tuw_count}`);
  lines.push(`- Standard-five evidence present: ${report.summary.standard_five_present_count}`);
  lines.push(`- Blocked work packages requiring owner/external/runtime disposition: ${report.summary.blocked_work_package_count}`);
  lines.push(`- Recorded work packages: ${report.summary.recorded_work_package_count}`);
  lines.push(`- Request-only blocked work packages: ${report.summary.request_only_blocked_work_package_count}`);
  lines.push(`- Package-approved blocked work packages: ${report.summary.approved_by_package_blocked_work_package_count}`);
  lines.push(`- G1-G10 all pass: ${report.summary.go_live_all_pass}`);
  lines.push(`- Failed gates: ${report.summary.failed_gate_ids.join(", ") || "none"}`);
  lines.push(`- Owner-approved deferrals present: ${report.summary.owner_approved_deferrals_present}`);
  lines.push(`- Valid decision deferrals: ${report.summary.decision_register_valid_deferred_rows}`);
  lines.push(`- Coverage-eligible valid decision deferrals: ${report.summary.decision_register_coverage_eligible_valid_deferred_rows}`);
  lines.push(`- Non-coverage valid decision deferrals: ${report.summary.decision_register_non_coverage_valid_deferred_rows}`);
  lines.push(`- Invalid decision rows: ${report.summary.decision_register_invalid_rows}`);
  lines.push("");
  lines.push("## Failed Gate Actions");
  lines.push("");
  lines.push("| Gate | Dimension | Failed evidence slots | Required action |");
  lines.push("| --- | --- | --- | --- |");
  for (const gate of report.failed_gate_actions) {
    const slots = gate.failed_evidence
      .map((item) => `${item.id} ${item.slot} -> ${item.required_state}`)
      .join("<br>");
    lines.push(`| ${gate.gate_id} | ${gate.dimension} | ${slots} | Full gate evidence must be supplied or owner-approved deferral must be recorded in the launch decision register. |`);
  }
  lines.push("");
  lines.push("## Decision ID Handoff");
  lines.push("");
  lines.push("Use these decision IDs only for real owner-approved `deferred(시한 명기)` rows in `docs/launch/launch-decision-register.md`. This package lists accepted IDs but does not approve any deferral.");
  lines.push("");
  lines.push("| Domain | Accepted decision IDs | Use |");
  lines.push("| --- | --- | --- |");
  for (const pattern of report.accepted_decision_id_patterns) {
    const acceptedIds = pattern.accepted_decision_ids.map(markdownCell).join("<br>");
    lines.push(`| ${markdownCell(pattern.domain)} | ${acceptedIds} | ${markdownCell(pattern.use)} |`);
  }
  lines.push("");
  lines.push("## Work Package Action Queue");
  lines.push("");
  lines.push("| WP | Phase | Category | Current status | Required owner/external action | Evidence base |");
  lines.push("| --- | --- | --- | --- | --- | --- |");
  for (const item of report.blocked_work_package_actions) {
    const action = item.next_required_action?.decision_needed ??
      item.next_required_action?.action_needed ??
      "Provide real completion evidence, or record an owner-approved deferral with owner, basis, target date/revisit gate, and signature.";
    lines.push(`| ${item.wp_id} | ${item.phase} | ${item.blocker_categories.join(", ")} | ${item.command_status} | ${action} | ${item.evidence_base} |`);
  }
  lines.push("");
  lines.push("## Recorded Non-Blocked Packages");
  lines.push("");
  lines.push("| WP | Phase | Status | Evidence base |");
  lines.push("| --- | --- | --- | --- |");
  for (const item of report.recorded_work_packages) {
    lines.push(`| ${item.wp_id} | ${item.phase} | ${item.command_status} | ${item.evidence_base} |`);
  }
  lines.push("");
  lines.push("## Owner Deferral Rule");
  lines.push("");
  lines.push("To convert a blocker into an approved deferral, the owner must add a launch decision register row with status `deferred(시한 명기)` and must include owner role/name, deferral basis, target date or revisit gate, and approval signature reference. This package is only the request queue.");
  return `${lines.join("\n")}\n`;
}

const audit = readJson(AUDIT_PATH);
const contract = readJson(CONTRACT_PATH);
const existingReport = maybeReadJson(REPORT_JSON_PATH);
const generatedAt = existingReport?.generated_at ?? new Date().toISOString();
const gateLookup = gateEvidenceLookup(contract);

const blockedWps = audit.work_packages.filter((wp) => wp.evidence.classification === "standard_five_blocked");
const recordedWps = audit.work_packages.filter((wp) => wp.evidence.classification === "standard_five_recorded");

const failedGateActions = audit.go_live_readiness.failed_gate_ids.map((gateId) => {
  const gateState = audit.go_live_readiness.gates[gateId];
  const failedEvidence = gateState.failed_evidence.map((id) => ({
    id,
    ...gateLookup[id]
  }));
  return {
    gate_id: gateId,
    dimension: contract.gates[gateId]?.dimension ?? "UNKNOWN",
    status: gateState.status,
    failed_evidence: failedEvidence,
    missing_evidence: gateState.missing_evidence
  };
});

const blockedWorkPackageActions = blockedWps.map((wp) => {
  const commandEvidence = commandEvidenceFor(wp);
  const packet = packetFor(wp);
  const construction = constructionFor(wp);
  return {
    wp_id: wp.wp_id,
    phase: wp.phase,
    title: wp.title,
    gate_binding: wp.gate_binding,
    command_status: wp.evidence.command_status,
    blocker_categories: classifyBlocker({ title: wp.title, status: wp.evidence.command_status }),
    evidence_base: wp.evidence.base,
    terminal_tuw: packet.terminal_tuw ?? null,
    packet_status: packet.status ?? null,
    inspection_verdict: construction.verdict ?? null,
    next_required_action: commandEvidence.next_required_action ?? null,
    standard_evidence_files_present: wp.evidence.files,
    owner_deferral_request_status: "not_approved_request_only",
    required_deferral_fields: [
      "owner role/name",
      "decision or deferral basis",
      "target date or revisit gate",
      "approval signature reference"
    ]
  };
});

const recordedWorkPackages = recordedWps.map((wp) => ({
  wp_id: wp.wp_id,
  phase: wp.phase,
  title: wp.title,
  gate_binding: wp.gate_binding,
  command_status: wp.evidence.command_status,
  evidence_base: wp.evidence.base
}));

const report = {
  schema_version: "law-firm-os.launch-owner-action-deferral-request.v0.1",
  generated_at: generatedAt,
  source_refs: [
    AUDIT_PATH,
    CONTRACT_PATH,
    DEFERRAL_COVERAGE_AUDIT_PATH,
    "docs/launch/launch-decision-register.md"
  ],
  boundary: {
    go_live_approved: false,
    owner_deferrals_approved_by_this_package: false,
    launch_decision_register_modified_by_this_package: false,
    review_waiver_counts_as_valid_review_evidence: false,
    closed_cp_evidence_is_read_only: true
  },
  summary: {
    work_package_count: audit.summary.work_package_count,
    tuw_count: audit.summary.tuw_count,
    standard_five_present_count: audit.summary.standard_five_present_count,
    command_evidence_present_count: audit.summary.command_evidence_present_count,
    blocked_work_package_count: blockedWps.length,
    recorded_work_package_count: recordedWps.length,
    request_only_blocked_work_package_count: blockedWorkPackageActions.filter((action) => action.owner_deferral_request_status === "not_approved_request_only").length,
    approved_by_package_blocked_work_package_count: blockedWorkPackageActions.filter((action) => action.owner_deferral_request_status !== "not_approved_request_only").length,
    missing_evidence_count: audit.summary.missing_evidence_count,
    go_live_all_pass: audit.go_live_readiness.all_pass,
    failed_gate_ids: audit.go_live_readiness.failed_gate_ids,
    owner_approved_deferrals_present: audit.launch_decisions.owner_approved_deferrals_present,
    decision_register_valid_decided_rows: audit.launch_decisions.valid_decided_rows,
    decision_register_valid_deferred_rows: audit.launch_decisions.valid_deferred_rows,
    decision_register_coverage_eligible_valid_deferred_rows: audit.launch_decisions.coverage_eligible_valid_deferred_rows,
    decision_register_non_coverage_valid_deferred_rows: audit.launch_decisions.non_coverage_valid_deferred_rows,
    decision_register_invalid_rows: audit.launch_decisions.invalid_decision_rows
  },
  accepted_decision_id_patterns: ACCEPTED_DECISION_ID_PATTERNS,
  failed_gate_actions: failedGateActions,
  blocked_work_package_actions: blockedWorkPackageActions,
  recorded_work_packages: recordedWorkPackages
};

mkdirSync(dirname(REPORT_JSON_PATH), { recursive: true });
writeFileSync(REPORT_JSON_PATH, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(REPORT_MD_PATH, renderMarkdown(report));

console.log(
  JSON.stringify(
    {
      report_json: REPORT_JSON_PATH,
      report_markdown: REPORT_MD_PATH,
      blocked_work_package_count: blockedWps.length,
      recorded_work_package_count: recordedWps.length,
      failed_gate_ids: audit.go_live_readiness.failed_gate_ids,
      owner_approved_deferrals_present: audit.launch_decisions.owner_approved_deferrals_present,
      coverage_eligible_valid_deferred_rows: audit.launch_decisions.coverage_eligible_valid_deferred_rows,
      non_coverage_valid_deferred_rows: audit.launch_decisions.non_coverage_valid_deferred_rows
    },
    null,
    2
  )
);
