#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const MINIMUM_PACKET_PATH = "docs/launch/launch-minimum-deferral-decision-packet.json";
const DEFERRAL_COVERAGE_AUDIT_PATH = "docs/launch/launch-deferral-coverage-audit.json";
const ANNEX_JSON_PATH = "docs/launch/launch-minimum-deferral-target-annex.json";
const ANNEX_MD_PATH = "docs/launch/launch-minimum-deferral-target-annex.md";

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function markdownCell(value) {
  return String(value ?? "").replaceAll("|", "\\|").replace(/\s+/g, " ").trim();
}

function targetLabel(row) {
  if (row.gate_id && row.evidence_id) return `${row.gate_id} ${row.evidence_id}`;
  if (row.wp_id && row.phase) return `${row.phase} ${row.wp_id}`;
  if (row.exit_gate) return row.exit_gate;
  if (row.closure_id) return row.closure_id;
  return row.coverage_id;
}

function targetDetail(domainRows, targetId, aggregateDecisionId) {
  const source = domainRows.find((row) => row.coverage_id === targetId);
  if (!source) {
    return {
      target_id: targetId,
      lookup_state: "missing_from_deferral_coverage_audit",
      aggregate_decision_id_accepted: false
    };
  }
  return {
    target_id: source.coverage_id,
    label: targetLabel(source),
    domain: source.domain,
    coverage_status: source.coverage_status,
    accepted_decision_ids: source.accepted_decision_ids,
    aggregate_decision_id_accepted: (source.accepted_decision_ids ?? []).includes(aggregateDecisionId),
    covering_decision_id: source.covering_decision_id,
    gate_id: source.gate_id ?? null,
    evidence_id: source.evidence_id ?? null,
    wp_id: source.wp_id ?? null,
    phase: source.phase ?? null,
    command_status: source.command_status ?? null,
    exit_gate: source.exit_gate ?? null,
    closure_id: source.closure_id ?? null,
    lookup_state: "matched_deferral_coverage_audit"
  };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push("# Launch Minimum Deferral Target Annex");
  lines.push("");
  lines.push(`Generated at: ${report.generated_at}`);
  lines.push("");
  lines.push("## Boundary");
  lines.push("");
  lines.push("- This annex enumerates targets for placeholder-only minimum deferral rows.");
  lines.push("- It does not approve go-live.");
  lines.push("- It does not approve owner deferrals.");
  lines.push("- It does not modify `docs/launch/launch-decision-register.md`.");
  lines.push("- Target coverage is conditional on real owner evidence in the launch decision register.");
  lines.push("- Full Claude review remains waived and is not valid review evidence.");
  lines.push("- Closed CP evidence remains read-only.");
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  for (const [key, value] of Object.entries(report.summary)) {
    lines.push(`- ${key}: ${value}`);
  }
  lines.push("");
  lines.push("## Minimum Decision Rows");
  lines.push("");
  lines.push("| Decision ID | Domain | Targets | Audit missing count | Target detail state |");
  lines.push("| --- | --- | ---: | ---: | --- |");
  for (const row of report.minimum_decision_rows) {
    lines.push(`| ${markdownCell(row.decision_id)} | ${markdownCell(row.coverage_domain)} | ${row.covered_target_count} | ${row.source_domain_missing_count} | ${markdownCell(row.target_detail_state)} |`);
  }
  lines.push("");
  for (const row of report.minimum_decision_rows) {
    lines.push(`## ${row.decision_id} Targets`);
    lines.push("");
    lines.push("| Target ID | Label | Coverage status | Aggregate accepted |");
    lines.push("| --- | --- | --- | --- |");
    for (const target of row.targets) {
      lines.push(`| ${markdownCell(target.target_id)} | ${markdownCell(target.label ?? "")} | ${markdownCell(target.coverage_status ?? target.lookup_state)} | ${target.aggregate_decision_id_accepted} |`);
    }
    lines.push("");
  }
  lines.push("## Copy Rule");
  lines.push("");
  lines.push("The aggregate decision IDs listed here may be copied into the launch decision register only after the owner, decision, basis, date or revisit gate, and approval signature fields contain real evidence. This annex is not itself a launch decision.");
  return `${lines.join("\n")}\n`;
}

const minimumPacket = readJson(MINIMUM_PACKET_PATH);
const deferralCoverageAudit = readJson(DEFERRAL_COVERAGE_AUDIT_PATH);
const existingAnnex = existsSync(ANNEX_JSON_PATH) ? readJson(ANNEX_JSON_PATH) : null;
const coverageDomainMap = Object.fromEntries((deferralCoverageAudit.coverage_domains ?? []).map((row) => [row.domain, row]));

const minimumRows = (minimumPacket.placeholder_decision_rows ?? []).map((row) => {
  const domainRows = deferralCoverageAudit.coverage_rows?.[row.coverage_domain] ?? [];
  const targets = (row.covered_target_ids ?? []).map((targetId) => targetDetail(domainRows, targetId, row.decision_id));
  return {
    decision_id: row.decision_id,
    title: row.title,
    coverage_domain: row.coverage_domain,
    required_owner_basis: row.required_owner_basis,
    covered_target_count: row.covered_target_count,
    source_domain_missing_count: coverageDomainMap[row.coverage_domain]?.missing ?? null,
    target_detail_state: targets.every((target) => target.lookup_state === "matched_deferral_coverage_audit" && target.aggregate_decision_id_accepted === true)
      ? "all_targets_matched_and_aggregate_accepted"
      : "target_detail_gap",
    target_ids: row.covered_target_ids ?? [],
    targets
  };
});

const allTargetIds = [...new Set(minimumRows.flatMap((row) => row.target_ids))].sort();
const unmatchedTargets = minimumRows.flatMap((row) => row.targets.filter((target) => target.lookup_state !== "matched_deferral_coverage_audit"));
const aggregateNotAcceptedTargets = minimumRows.flatMap((row) => row.targets.filter((target) => target.aggregate_decision_id_accepted !== true));

const report = {
  schema_version: "law-firm-os.launch-minimum-deferral-target-annex.v0.1",
  generated_at: existingAnnex?.generated_at ?? new Date().toISOString(),
  source_refs: [
    MINIMUM_PACKET_PATH,
    DEFERRAL_COVERAGE_AUDIT_PATH,
    "docs/launch/launch-decision-register.md"
  ],
  boundary: {
    annex_only: true,
    go_live_approved_by_this_annex: false,
    owner_deferrals_approved_by_this_annex: false,
    launch_decision_register_modified_by_this_annex: false,
    target_coverage_requires_real_owner_evidence: true,
    review_waiver_counts_as_valid_review_evidence: false,
    closed_cp_evidence_is_read_only: true
  },
  summary: {
    minimum_decision_row_count: minimumRows.length,
    unique_target_id_count: allTargetIds.length,
    source_missing_deferral_target_count: minimumPacket.summary.source_missing_deferral_target_count,
    uncovered_target_count_if_owner_rows_are_completed: minimumPacket.summary.uncovered_target_count_if_owner_rows_are_completed,
    unmatched_target_count: unmatchedTargets.length,
    aggregate_not_accepted_target_count: aggregateNotAcceptedTargets.length,
    go_live_target_count: minimumRows.find((row) => row.coverage_domain === "go_live_gate_evidence")?.covered_target_count ?? 0,
    l9_target_count: minimumRows.find((row) => row.coverage_domain === "l9_stabilization_closure")?.covered_target_count ?? 0,
    blocked_wp_target_count: minimumRows.find((row) => row.coverage_domain === "blocked_work_package")?.covered_target_count ?? 0,
    phase_exit_target_count: minimumRows.find((row) => row.coverage_domain === "phase_exit")?.covered_target_count ?? 0
  },
  minimum_decision_rows: minimumRows
};

mkdirSync(dirname(ANNEX_JSON_PATH), { recursive: true });
writeFileSync(ANNEX_JSON_PATH, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(ANNEX_MD_PATH, renderMarkdown(report));

console.log(JSON.stringify({
  report_json: ANNEX_JSON_PATH,
  report_markdown: ANNEX_MD_PATH,
  minimum_decision_row_count: report.summary.minimum_decision_row_count,
  unique_target_id_count: report.summary.unique_target_id_count,
  source_missing_deferral_target_count: report.summary.source_missing_deferral_target_count,
  unmatched_target_count: report.summary.unmatched_target_count,
  aggregate_not_accepted_target_count: report.summary.aggregate_not_accepted_target_count
}, null, 2));
