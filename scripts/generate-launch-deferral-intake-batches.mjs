#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const ACTION_CROSSWALK_AUDIT_PATH = "docs/launch/launch-deferral-action-crosswalk-audit.json";
const RESOLUTION_LANES_AUDIT_PATH = "docs/launch/launch-deferral-resolution-lanes-audit.json";
const DECISION_REGISTER_TEMPLATE_PATH = "docs/launch/launch-deferral-decision-register-template.json";
const REPORT_JSON_PATH = "docs/launch/launch-deferral-intake-batches.json";
const REPORT_MD_PATH = "docs/launch/launch-deferral-intake-batches.md";

const BATCH_ORDER = [
  {
    batch_id: "B01",
    primary_resolution_lane: "external_dependency",
    title: "External dependency intake",
    required_action: "Collect external legal, M365, identity, pilot, or third-party evidence, or obtain a real owner-approved deferral."
  },
  {
    batch_id: "B02",
    primary_resolution_lane: "owner_decision_signature",
    title: "Owner decision and signature intake",
    required_action: "Record real owner decisions, signatures, acceptance, ratification, or explicit owner-approved deferrals."
  },
  {
    batch_id: "B03",
    primary_resolution_lane: "policy_scope_decision",
    title: "Policy and scope decision intake",
    required_action: "Resolve policy/scope choices, or obtain owner-approved deferrals with basis and revisit gates."
  },
  {
    batch_id: "B04",
    primary_resolution_lane: "runtime_operational_evidence",
    title: "Runtime and operational evidence intake",
    required_action: "Provide real runtime, staging, monitoring, rollback, DR, pilot, or operational evidence, or defer with owner approval."
  },
  {
    batch_id: "B05",
    primary_resolution_lane: "evidence_completion",
    title: "Evidence completion intake",
    required_action: "Fill missing evidence cells, links, records, and acceptance artifacts, or defer with owner approval."
  },
  {
    batch_id: "B06",
    primary_resolution_lane: "go_live_gate_evidence",
    title: "G1-G10 gate evidence intake",
    required_action: "Supply failed go-live gate evidence slots, or record coverage-eligible owner-approved deferrals."
  },
  {
    batch_id: "B07",
    primary_resolution_lane: "phase_exit_closure_or_deferral",
    title: "PRE-L9 phase-exit intake",
    required_action: "Close phase exits through real WP evidence, or record phase-exit owner-approved deferrals."
  },
  {
    batch_id: "B08",
    primary_resolution_lane: "l9_stabilization_measurement",
    title: "L9 stabilization measurement intake",
    required_action: "Provide measured L9 stabilization/hypercare evidence, or record owner-approved deferrals."
  }
];

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function markdownCell(value) {
  return String(value ?? "").replaceAll("|", "\\|").replace(/\s+/g, " ").trim();
}

function countBy(rows, field) {
  const counts = new Map();
  for (const row of rows) {
    const key = row[field] ?? "unknown";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((left, right) => right.count - left.count || left.value.localeCompare(right.value));
}

function renderMarkdown(report) {
  const lines = [];
  lines.push("# Launch Deferral Intake Batches");
  lines.push("");
  lines.push(`Generated at: ${report.generated_at}`);
  lines.push("");
  lines.push("## Boundary");
  lines.push("");
  lines.push("- This is an intake routing package only.");
  lines.push("- It does not approve go-live.");
  lines.push("- It does not approve owner deferrals.");
  lines.push("- It does not modify `docs/launch/launch-decision-register.md`.");
  lines.push("- Full Claude review remains waived and is not valid review evidence.");
  lines.push("- Closed CP evidence remains read-only.");
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  for (const [key, value] of Object.entries(report.summary)) {
    lines.push(`- ${key}: ${value}`);
  }
  lines.push("");
  lines.push("## Batch Summary");
  lines.push("");
  lines.push("| Batch | Lane | Targets | Required action |");
  lines.push("| --- | --- | ---: | --- |");
  for (const batch of report.batches) {
    lines.push(`| ${markdownCell(batch.batch_id)} | ${markdownCell(batch.primary_resolution_lane)} | ${batch.target_count} | ${markdownCell(batch.required_action)} |`);
  }
  lines.push("");
  for (const batch of report.batches) {
    lines.push(`## ${batch.batch_id} ${batch.title}`);
    lines.push("");
    lines.push("| Coverage | Domain | Action source | Action ref | Recommended decision ID | Approval state |");
    lines.push("| --- | --- | --- | --- | --- | --- |");
    for (const target of batch.targets) {
      lines.push(`| ${markdownCell(target.coverage_id)} | ${markdownCell(target.domain)} | ${markdownCell(target.action_source)} | ${markdownCell(target.action_ref)} | ${markdownCell(target.recommended_decision_id)} | ${markdownCell(target.approval_state)} |`);
    }
    lines.push("");
  }
  lines.push("## Copy Rule");
  lines.push("");
  lines.push("Rows may be copied into the launch decision register only after all owner, basis, target date or revisit gate, and signature placeholders are replaced with real evidence.");
  return `${lines.join("\n")}\n`;
}

const actionCrosswalkAudit = readJson(ACTION_CROSSWALK_AUDIT_PATH);
const resolutionLanesAudit = readJson(RESOLUTION_LANES_AUDIT_PATH);
const decisionRegisterTemplate = readJson(DECISION_REGISTER_TEMPLATE_PATH);
const existingReport = existsSync(REPORT_JSON_PATH) ? readJson(REPORT_JSON_PATH) : null;

const crosswalkByCoverageId = new Map((actionCrosswalkAudit.crosswalk_rows ?? []).map((row) => [row.coverage_id, row]));
const templateByCoverageId = new Map((decisionRegisterTemplate.template_rows ?? []).map((row) => [row.coverage_id, row]));

const targets = (resolutionLanesAudit.lane_rows ?? [])
  .map((row) => {
    const crosswalk = crosswalkByCoverageId.get(row.coverage_id);
    const template = templateByCoverageId.get(row.coverage_id);
    return {
      coverage_id: row.coverage_id,
      domain: row.domain,
      primary_resolution_lane: row.primary_resolution_lane,
      action_source: row.action_source,
      action_ref: row.action_ref,
      accepted_decision_ids: row.accepted_decision_ids ?? [],
      recommended_decision_id: template?.recommended_decision_id ?? row.accepted_decision_ids?.[0] ?? "",
      alternative_decision_ids: template?.alternative_decision_ids ?? [],
      decision_register_template_coverage_id: template?.coverage_id ?? null,
      decision_register_status_after_owner_approval: template?.status_to_use_after_approval ?? "",
      approval_state: "not_approved_template_only",
      owner_decision_fields_required: [
        "owner role/name",
        "owner deferral decision",
        "deferral basis",
        "target date or revisit gate",
        "approval signature reference"
      ],
      source_next_required_action: crosswalk?.next_required_action ?? row.next_required_action ?? "",
      owner_input_required: true,
      real_evidence_or_owner_deferral_required: true
    };
  })
  .sort((left, right) => {
    const leftBatch = BATCH_ORDER.findIndex((batch) => batch.primary_resolution_lane === left.primary_resolution_lane);
    const rightBatch = BATCH_ORDER.findIndex((batch) => batch.primary_resolution_lane === right.primary_resolution_lane);
    return leftBatch - rightBatch || left.domain.localeCompare(right.domain) || left.coverage_id.localeCompare(right.coverage_id);
  });

const batches = BATCH_ORDER.map((batch) => {
  const batchTargets = targets.filter((target) => target.primary_resolution_lane === batch.primary_resolution_lane);
  return {
    ...batch,
    target_count: batchTargets.length,
    target_coverage_ids: batchTargets.map((target) => target.coverage_id),
    targets: batchTargets
  };
});

const report = {
  schema_version: "law-firm-os.launch-deferral-intake-batches.v0.1",
  generated_at: existingReport?.generated_at ?? new Date().toISOString(),
  source_refs: [
    ACTION_CROSSWALK_AUDIT_PATH,
    RESOLUTION_LANES_AUDIT_PATH,
    DECISION_REGISTER_TEMPLATE_PATH,
    "docs/launch/launch-decision-register.md"
  ],
  boundary: {
    intake_routing_only: true,
    go_live_approved_by_this_package: false,
    owner_deferrals_approved_by_this_package: false,
    launch_decision_register_modified_by_this_package: false,
    review_waiver_counts_as_valid_review_evidence: false,
    closed_cp_evidence_is_read_only: true
  },
  summary: {
    missing_deferral_target_count: resolutionLanesAudit.summary.missing_deferral_target_count,
    intake_target_count: targets.length,
    batch_count: batches.length,
    non_empty_batch_count: batches.filter((batch) => batch.target_count > 0).length,
    template_matched_target_count: targets.filter((target) => target.decision_register_template_coverage_id === target.coverage_id).length,
    recommended_decision_id_count: targets.filter((target) => target.recommended_decision_id).length,
    owner_input_required_count: targets.filter((target) => target.owner_input_required).length,
    not_approved_target_count: targets.filter((target) => target.approval_state === "not_approved_template_only").length
  },
  lane_counts: countBy(targets, "primary_resolution_lane"),
  domain_counts: countBy(targets, "domain"),
  batches,
  targets
};

mkdirSync(dirname(REPORT_JSON_PATH), { recursive: true });
writeFileSync(REPORT_JSON_PATH, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(REPORT_MD_PATH, renderMarkdown(report));

console.log(JSON.stringify({
  report_json: REPORT_JSON_PATH,
  report_markdown: REPORT_MD_PATH,
  intake_target_count: report.summary.intake_target_count,
  batch_count: report.summary.batch_count,
  non_empty_batch_count: report.summary.non_empty_batch_count,
  template_matched_target_count: report.summary.template_matched_target_count,
  not_approved_target_count: report.summary.not_approved_target_count
}, null, 2));
