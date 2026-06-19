#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const LEDGER_PATH = "workbook/launch-tuw/launch-tuw-ledger.json";
const REPORT_JSON_PATH = "docs/launch/launch-review-waiver-policy-audit.json";
const REPORT_MD_PATH = "docs/launch/launch-review-waiver-policy-audit.md";
const WAIVER_STATUS = "review_waived_by_user";
const SOURCE_PLAN_REVIEW_REQUIREMENT_PATHS = [
  "workbook/launch-tuw/00_마스터_출시피라미드_스키마_레지스트리.md",
  "workbook/launch-tuw/11_L0.md",
  "workbook/launch-tuw/19_L8.md",
  LEDGER_PATH
];
const SOURCE_PLAN_REVIEW_REQUIREMENT_PATTERNS = [
  /유효 Claude 리뷰/,
  /Claude 리뷰.*정확히 1/,
  /valid Claude review/i,
  /full Claude review/i
];

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function readText(path) {
  return readFileSync(path, "utf8");
}

function phaseFromWpId(wpId) {
  if (wpId.startsWith("LT-PRE-")) return "PRE";
  const match = wpId.match(/^LT-(L\d+)-/);
  return match ? match[1] : "UNKNOWN";
}

function addFinding(findings, severity, code, message, details = {}) {
  findings.push({ severity, code, message, details });
}

function reviewPolicyValidFalse(policy) {
  return policy?.valid_review_evidence === false || policy?.review_waiver_is_valid_review_evidence === false;
}

function commandReviewPolicyValue(policy) {
  return policy?.valid_review_evidence ?? policy?.review_waiver_is_valid_review_evidence ?? null;
}

function markdownCell(value) {
  return String(value ?? "").replaceAll("|", "\\|").replace(/\s+/g, " ").trim();
}

function lineHasSourcePlanReviewRequirement(line) {
  return SOURCE_PLAN_REVIEW_REQUIREMENT_PATTERNS.some((pattern) => pattern.test(line));
}

function sourcePlanReviewRequirementRefs(findings) {
  const refs = [];
  for (const path of SOURCE_PLAN_REVIEW_REQUIREMENT_PATHS) {
    if (!existsSync(path)) {
      addFinding(findings, "P1", "SOURCE_PLAN_REVIEW_REQUIREMENT_PATH_MISSING", "Source plan review requirement path is missing.", {
        path
      });
      continue;
    }
    const lines = readText(path).split("\n");
    for (const [index, line] of lines.entries()) {
      if (!lineHasSourcePlanReviewRequirement(line)) continue;
      refs.push({
        path,
        line_number: index + 1,
        excerpt: line.trim().replace(/\s+/g, " ").slice(0, 240),
        execution_policy: WAIVER_STATUS,
        valid_review_evidence: false,
        source_plan_modified_by_this_audit: false
      });
    }
  }
  return refs;
}

function renderMarkdown(report) {
  const lines = [];
  lines.push("# Launch Review Waiver Policy Audit");
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
  lines.push("## Findings");
  lines.push("");
  if (report.findings.length === 0) {
    lines.push("No findings.");
  } else {
    lines.push("| Severity | Code | WP | Message |");
    lines.push("| --- | --- | --- | --- |");
    for (const finding of report.findings) {
      lines.push(`| ${finding.severity} | ${finding.code} | ${finding.details.wp_id ?? ""} | ${finding.message} |`);
    }
  }
  lines.push("");
  lines.push("## Source Plan Review Requirement Overlay");
  lines.push("");
  lines.push(`- Source-plan Claude review requirement refs: ${report.summary.source_plan_review_requirement_ref_count}`);
  lines.push(`- Refs covered by execution waiver overlay: ${report.summary.source_plan_review_requirement_overlay_count}`);
  lines.push("- Source plan files are not modified by this audit.");
  lines.push("");
  if (report.source_plan_review_requirement_refs.length === 0) {
    lines.push("No source-plan Claude review requirement refs found.");
  } else {
    lines.push("| Path | Line | Execution policy | Valid review evidence | Excerpt |");
    lines.push("| --- | ---: | --- | --- | --- |");
    for (const ref of report.source_plan_review_requirement_refs) {
      lines.push(
        `| ${markdownCell(ref.path)} | ${ref.line_number} | ${ref.execution_policy} | ${ref.valid_review_evidence} | ${markdownCell(ref.excerpt)} |`
      );
    }
  }
  lines.push("");
  lines.push("## Boundary");
  lines.push("");
  lines.push("- Full Claude review is waived by user instruction.");
  lines.push("- `review_waived_by_user` is not valid review evidence.");
  lines.push("- Source-plan Claude review requirement references are waived for execution, not edited in place.");
  lines.push("- This audit does not approve go-live, owner deferrals, production runtime evidence, or L9 stabilization.");
  lines.push("- Closed CP evidence remains read-only; this audit covers launch TUW goal-closeout evidence only.");
  return `${lines.join("\n")}\n`;
}

const ledger = readJson(LEDGER_PATH);
const findings = [];
const workPackages = [];

for (const wp of ledger.work_packages) {
  const base = `docs/goal-closeout/${wp.goal_id}`;
  const paths = {
    review: `${base}/claude-review-result.json`,
    packet: `${base}/packet.json`,
    command: `${base}/command-evidence.json`,
    adjudication: `${base}/adjudication.md`
  };

  const row = {
    wp_id: wp.wp_id,
    goal_id: wp.goal_id,
    phase: phaseFromWpId(wp.wp_id),
    evidence_base: base,
    claude_review_result: null,
    packet_review_policy: null,
    command_review_policy: null,
    adjudication_contains_waiver_boundary: false
  };

  for (const [kind, path] of Object.entries(paths)) {
    if (!existsSync(path)) {
      addFinding(findings, "P0", "MISSING_EVIDENCE_FILE", `Missing ${kind} evidence file.`, {
        wp_id: wp.wp_id,
        goal_id: wp.goal_id,
        path
      });
    }
  }

  if (existsSync(paths.review)) {
    const review = readJson(paths.review);
    row.claude_review_result = {
      status: review.status ?? null,
      valid_review_evidence: review.valid_review_evidence ?? null
    };
    if (review.status !== WAIVER_STATUS) {
      addFinding(findings, "P1", "REVIEW_STATUS_NOT_WAIVED", "Claude review result is not recorded as waived by user.", {
        wp_id: wp.wp_id,
        goal_id: wp.goal_id,
        actual: review.status
      });
    }
    if (review.valid_review_evidence !== false) {
      addFinding(findings, "P1", "REVIEW_MARKED_VALID", "Claude review waiver must not be valid review evidence.", {
        wp_id: wp.wp_id,
        goal_id: wp.goal_id,
        actual: review.valid_review_evidence
      });
    }
  }

  if (existsSync(paths.packet)) {
    const packet = readJson(paths.packet);
    const policy = packet.review_policy ?? {};
    row.packet_review_policy = {
      full_claude_review: policy.full_claude_review ?? null,
      valid_review_evidence: policy.valid_review_evidence ?? null,
      waiver_counts_as_governance_review: policy.waiver_counts_as_governance_review ?? null
    };
    if (policy.full_claude_review !== "waived_by_user") {
      addFinding(findings, "P1", "PACKET_REVIEW_POLICY_NOT_WAIVED", "Packet review policy is not recorded as waived by user.", {
        wp_id: wp.wp_id,
        goal_id: wp.goal_id,
        actual: policy.full_claude_review
      });
    }
    if (policy.valid_review_evidence !== false) {
      addFinding(findings, "P1", "PACKET_REVIEW_POLICY_MARKED_VALID", "Packet review policy must not mark the waiver as valid review evidence.", {
        wp_id: wp.wp_id,
        goal_id: wp.goal_id,
        actual: policy.valid_review_evidence
      });
    }
  }

  if (existsSync(paths.command)) {
    const command = readJson(paths.command);
    const policy = command.review_policy;
    const policyShape = Array.isArray(policy) ? "array" : typeof policy;
    row.command_review_policy = {
      shape: policyShape,
      full_claude_review: policy?.full_claude_review ?? null,
      status: policy?.status ?? null,
      valid_review_evidence: commandReviewPolicyValue(policy),
      review_valid_evidence: command.review_valid_evidence ?? null
    };
    if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
      addFinding(findings, "P1", "COMMAND_REVIEW_POLICY_NOT_OBJECT", "Command evidence review policy must be a structured waiver object.", {
        wp_id: wp.wp_id,
        goal_id: wp.goal_id,
        actual_shape: policyShape
      });
    } else {
      if (policy.full_claude_review !== "waived_by_user") {
        addFinding(findings, "P1", "COMMAND_REVIEW_POLICY_NOT_WAIVED", "Command evidence review policy is not recorded as waived by user.", {
          wp_id: wp.wp_id,
          goal_id: wp.goal_id,
          actual: policy.full_claude_review
        });
      }
      if (policy.status !== WAIVER_STATUS) {
        addFinding(findings, "P1", "COMMAND_REVIEW_POLICY_STATUS_MISSING", "Command evidence review policy must include review_waived_by_user status.", {
          wp_id: wp.wp_id,
          goal_id: wp.goal_id,
          actual: policy.status
        });
      }
      if (!reviewPolicyValidFalse(policy)) {
        addFinding(findings, "P1", "COMMAND_REVIEW_POLICY_MARKED_VALID", "Command evidence review policy must not mark the waiver as valid review evidence.", {
          wp_id: wp.wp_id,
          goal_id: wp.goal_id,
          actual: commandReviewPolicyValue(policy)
        });
      }
    }
    if (command.review_valid_evidence !== undefined && command.review_valid_evidence !== false) {
      addFinding(findings, "P1", "COMMAND_REVIEW_VALID_EVIDENCE_TRUE", "Command evidence review_valid_evidence must be false when present.", {
        wp_id: wp.wp_id,
        goal_id: wp.goal_id,
        actual: command.review_valid_evidence
      });
    }
  }

  if (existsSync(paths.adjudication)) {
    const adjudication = readText(paths.adjudication).toLowerCase();
    row.adjudication_contains_waiver_boundary =
      adjudication.includes("waived") && adjudication.includes("not valid review evidence");
    if (!row.adjudication_contains_waiver_boundary) {
      addFinding(findings, "P1", "ADJUDICATION_WAIVER_BOUNDARY_MISSING", "Adjudication must state that the waiver is not valid review evidence.", {
        wp_id: wp.wp_id,
        goal_id: wp.goal_id,
        path: paths.adjudication
      });
    }
  }

  workPackages.push(row);
}

const sourcePlanRefs = sourcePlanReviewRequirementRefs(findings);
const verdict = findings.some((finding) => finding.severity === "P0" || finding.severity === "P1") ? "FAIL" : "PASS";
const existingReport = existsSync(REPORT_JSON_PATH) ? readJson(REPORT_JSON_PATH) : null;
const report = {
  schema_version: "law-firm-os.launch-review-waiver-policy-audit.v0.2",
  generated_at: existingReport?.generated_at ?? new Date().toISOString(),
  source_refs: [...new Set([
    LEDGER_PATH,
    ...SOURCE_PLAN_REVIEW_REQUIREMENT_PATHS,
    "docs/goal-closeout/<launch_goal_id>/claude-review-result.json",
    "docs/goal-closeout/<launch_goal_id>/packet.json",
    "docs/goal-closeout/<launch_goal_id>/command-evidence.json",
    "docs/goal-closeout/<launch_goal_id>/adjudication.md"
  ])],
  verdict,
  summary: {
    work_package_count: workPackages.length,
    review_waived_count: workPackages.filter((wp) => wp.claude_review_result?.status === WAIVER_STATUS).length,
    valid_review_evidence_false_count: workPackages.filter((wp) => wp.claude_review_result?.valid_review_evidence === false).length,
    packet_waiver_policy_count: workPackages.filter((wp) => wp.packet_review_policy?.full_claude_review === "waived_by_user").length,
    packet_valid_review_false_count: workPackages.filter((wp) => wp.packet_review_policy?.valid_review_evidence === false).length,
    command_policy_object_count: workPackages.filter((wp) => wp.command_review_policy?.shape === "object").length,
    command_policy_status_waived_count: workPackages.filter((wp) => wp.command_review_policy?.status === WAIVER_STATUS).length,
    command_policy_valid_review_false_count: workPackages.filter((wp) => wp.command_review_policy?.valid_review_evidence === false).length,
    adjudication_boundary_count: workPackages.filter((wp) => wp.adjudication_contains_waiver_boundary).length,
    source_plan_review_requirement_ref_count: sourcePlanRefs.length,
    source_plan_review_requirement_overlay_count: sourcePlanRefs.filter(
      (ref) => ref.execution_policy === WAIVER_STATUS && ref.valid_review_evidence === false
    ).length,
    finding_count: findings.length,
    p0_count: findings.filter((finding) => finding.severity === "P0").length,
    p1_count: findings.filter((finding) => finding.severity === "P1").length
  },
  boundary: {
    full_claude_review_skipped_by_user_instruction: true,
    source_plan_claude_review_requirements_waived_for_execution: true,
    source_plan_modified_by_this_audit: false,
    review_waiver_counts_as_valid_review_evidence: false,
    covers_launch_tuw_goal_closeout_only: true,
    closed_cp_evidence_is_read_only: true,
    go_live_approved_by_this_audit: false,
    owner_deferrals_approved_by_this_audit: false
  },
  source_plan_review_requirement_refs: sourcePlanRefs,
  work_packages: workPackages,
  findings
};

mkdirSync(dirname(REPORT_JSON_PATH), { recursive: true });
writeFileSync(REPORT_JSON_PATH, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(REPORT_MD_PATH, renderMarkdown(report));

console.log(JSON.stringify({
  report_json: REPORT_JSON_PATH,
  report_markdown: REPORT_MD_PATH,
  verdict,
  work_package_count: report.summary.work_package_count,
  review_waived_count: report.summary.review_waived_count,
  valid_review_evidence_false_count: report.summary.valid_review_evidence_false_count,
  source_plan_review_requirement_ref_count: report.summary.source_plan_review_requirement_ref_count,
  source_plan_review_requirement_overlay_count: report.summary.source_plan_review_requirement_overlay_count,
  finding_count: report.summary.finding_count,
  p0_count: report.summary.p0_count,
  p1_count: report.summary.p1_count
}, null, 2));

if (verdict !== "PASS") {
  process.exit(1);
}
