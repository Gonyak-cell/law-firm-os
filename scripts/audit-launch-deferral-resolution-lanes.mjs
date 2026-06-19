#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const ACTION_CROSSWALK_AUDIT_PATH = "docs/launch/launch-deferral-action-crosswalk-audit.json";
const REPORT_JSON_PATH = "docs/launch/launch-deferral-resolution-lanes-audit.json";
const REPORT_MD_PATH = "docs/launch/launch-deferral-resolution-lanes-audit.md";
const PRIMARY_LANE_PRIORITY = [
  "external_dependency",
  "owner_decision_signature",
  "runtime_operational_evidence",
  "policy_scope_decision",
  "evidence_completion",
  "go_live_gate_evidence",
  "l9_stabilization_measurement",
  "phase_exit_closure_or_deferral"
];

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function addFinding(findings, severity, code, message, details = {}) {
  findings.push({ severity, code, message, details });
}

function increment(map, key, amount = 1) {
  map.set(key, (map.get(key) ?? 0) + amount);
}

function countsFromMap(map) {
  return [...map.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((left, right) => right.count - left.count || left.value.localeCompare(right.value));
}

function markdownCell(value) {
  return String(value ?? "").replaceAll("|", "\\|").replace(/\s+/g, " ").trim();
}

function unique(values) {
  return [...new Set(values)].sort();
}

function lanesFor(row) {
  if (row.domain === "go_live_gate_evidence") return ["go_live_gate_evidence"];
  if (row.domain === "l9_stabilization_closure") return ["l9_stabilization_measurement"];
  if (row.domain === "phase_exit") return ["phase_exit_closure_or_deferral"];
  const lanes = [];
  const categories = new Set(row.blocker_categories ?? []);
  if (categories.has("external_dependency")) lanes.push("external_dependency");
  if (categories.has("owner_decision_or_signature")) lanes.push("owner_decision_signature");
  if (categories.has("runtime_or_operational_evidence")) lanes.push("runtime_operational_evidence");
  if (categories.has("policy_or_scope_decision")) lanes.push("policy_scope_decision");
  if (categories.has("evidence_completion") || lanes.length === 0) lanes.push("evidence_completion");
  return unique(lanes);
}

function primaryLane(lanes) {
  return PRIMARY_LANE_PRIORITY.find((lane) => lanes.includes(lane)) ?? lanes[0] ?? "unclassified";
}

function renderMarkdown(report) {
  const lines = [];
  lines.push("# Launch Deferral Resolution Lanes Audit");
  lines.push("");
  lines.push(`Generated at: ${report.generated_at}`);
  lines.push("");
  lines.push(`Verdict: ${report.verdict}`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  for (const [key, value] of Object.entries(report.summary)) {
    lines.push(`- ${key}: ${value}`);
  }
  lines.push("");
  lines.push("## Primary Lanes");
  lines.push("");
  lines.push("| Lane | Targets |");
  lines.push("| --- | ---: |");
  for (const row of report.primary_lane_counts) {
    lines.push(`| ${markdownCell(row.value)} | ${row.count} |`);
  }
  lines.push("");
  lines.push("## Lane Mentions");
  lines.push("");
  lines.push("| Lane | Mentions |");
  lines.push("| --- | ---: |");
  for (const row of report.lane_mention_counts) {
    lines.push(`| ${markdownCell(row.value)} | ${row.count} |`);
  }
  lines.push("");
  lines.push("## Lane Targets");
  lines.push("");
  lines.push("| Primary lane | Coverage | Domain | Action source | Action ref |");
  lines.push("| --- | --- | --- | --- | --- |");
  for (const row of report.lane_rows) {
    lines.push(`| ${markdownCell(row.primary_resolution_lane)} | ${markdownCell(row.coverage_id)} | ${markdownCell(row.domain)} | ${markdownCell(row.action_source)} | ${markdownCell(row.action_ref)} |`);
  }
  lines.push("");
  lines.push("## Findings");
  lines.push("");
  if (report.findings.length === 0) {
    lines.push("No findings.");
  } else {
    lines.push("| Severity | Code | Message |");
    lines.push("| --- | --- | --- |");
    for (const finding of report.findings) {
      lines.push(`| ${finding.severity} | ${finding.code} | ${markdownCell(finding.message)} |`);
    }
  }
  lines.push("");
  lines.push("## Boundary");
  lines.push("");
  lines.push("- This audit classifies missing deferral targets into resolution lanes only.");
  lines.push("- It does not approve go-live.");
  lines.push("- It does not approve owner deferrals.");
  lines.push("- It does not create or modify launch decision register rows.");
  lines.push("- It does not replace real runtime, security, M365, legal, pilot, UAT, or hypercare evidence.");
  lines.push("- Closed CP evidence remains read-only.");
  return `${lines.join("\n")}\n`;
}

const actionCrosswalkAudit = readJson(ACTION_CROSSWALK_AUDIT_PATH);
const existingReport = existsSync(REPORT_JSON_PATH) ? readJson(REPORT_JSON_PATH) : null;
const findings = [];

if (actionCrosswalkAudit.verdict !== "PASS") {
  addFinding(findings, "P1", "ACTION_CROSSWALK_NOT_PASS", "Deferral action crosswalk audit must pass before resolution lanes can be trusted.", {
    actual: actionCrosswalkAudit.verdict
  });
}

const laneRows = (actionCrosswalkAudit.crosswalk_rows ?? []).map((row) => {
  const resolutionLanes = lanesFor(row);
  const selectedPrimaryLane = primaryLane(resolutionLanes);
  return {
    coverage_id: row.coverage_id,
    domain: row.domain,
    action_source: row.action_source,
    action_ref: row.action_ref,
    accepted_decision_ids: row.accepted_decision_ids ?? [],
    resolution_lanes: resolutionLanes,
    primary_resolution_lane: selectedPrimaryLane,
    next_required_action: row.next_required_action ?? ""
  };
});

for (const row of laneRows) {
  if (row.resolution_lanes.length === 0 || row.primary_resolution_lane === "unclassified") {
    addFinding(findings, "P1", "UNCLASSIFIED_RESOLUTION_LANE", "Crosswalk row could not be mapped to a resolution lane.", {
      coverage_id: row.coverage_id,
      domain: row.domain
    });
  }
  if (!row.action_ref) {
    addFinding(findings, "P1", "MISSING_ACTION_REF", "Resolution lane row has no action reference.", {
      coverage_id: row.coverage_id,
      domain: row.domain,
      primary_resolution_lane: row.primary_resolution_lane
    });
  }
}

const primaryLaneCountMap = new Map();
const laneMentionCountMap = new Map();
for (const row of laneRows) {
  increment(primaryLaneCountMap, row.primary_resolution_lane);
  for (const lane of row.resolution_lanes) increment(laneMentionCountMap, lane);
}

const verdict = findings.some((finding) => finding.severity === "P0" || finding.severity === "P1") ? "FAIL" : "PASS";
const report = {
  schema_version: "law-firm-os.launch-deferral-resolution-lanes-audit.v0.1",
  generated_at: existingReport?.generated_at ?? new Date().toISOString(),
  source_refs: [
    ACTION_CROSSWALK_AUDIT_PATH
  ],
  verdict,
  boundary: {
    classifies_resolution_lanes_only: true,
    go_live_approved_by_this_audit: false,
    owner_deferrals_approved_by_this_audit: false,
    launch_decision_register_modified_by_this_audit: false,
    review_waiver_counts_as_valid_review_evidence: false,
    closed_cp_evidence_is_read_only: true
  },
  summary: {
    missing_deferral_target_count: laneRows.length,
    classified_target_count: laneRows.filter((row) => row.primary_resolution_lane !== "unclassified").length,
    primary_lane_count: primaryLaneCountMap.size,
    lane_mention_count: [...laneMentionCountMap.values()].reduce((sum, count) => sum + count, 0),
    unclassified_target_count: laneRows.filter((row) => row.primary_resolution_lane === "unclassified").length,
    finding_count: findings.length,
    p0_count: findings.filter((finding) => finding.severity === "P0").length,
    p1_count: findings.filter((finding) => finding.severity === "P1").length
  },
  primary_lane_counts: countsFromMap(primaryLaneCountMap),
  lane_mention_counts: countsFromMap(laneMentionCountMap),
  lane_rows: laneRows,
  findings
};

mkdirSync(dirname(REPORT_JSON_PATH), { recursive: true });
writeFileSync(REPORT_JSON_PATH, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(REPORT_MD_PATH, renderMarkdown(report));

console.log(JSON.stringify({
  report_json: REPORT_JSON_PATH,
  report_markdown: REPORT_MD_PATH,
  verdict,
  missing_deferral_target_count: report.summary.missing_deferral_target_count,
  classified_target_count: report.summary.classified_target_count,
  primary_lane_count: report.summary.primary_lane_count,
  unclassified_target_count: report.summary.unclassified_target_count,
  finding_count: report.summary.finding_count,
  p0_count: report.summary.p0_count,
  p1_count: report.summary.p1_count
}, null, 2));

if (report.verdict !== "PASS") {
  process.exit(1);
}
