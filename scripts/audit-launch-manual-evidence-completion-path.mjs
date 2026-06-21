#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const MANUAL_INTAKE_PATH = "docs/launch/launch-manual-evidence-intake-register.json";
const MANUAL_INTAKE_VALIDATION_PATH = "docs/launch/launch-manual-evidence-intake-validation.json";
const ACCEPTANCE_MATRIX_PATH = "docs/launch/launch-evidence-acceptance-matrix.json";
const ACCEPTANCE_MATRIX_VALIDATION_PATH = "docs/launch/launch-evidence-acceptance-matrix-validation.json";
const REPORT_JSON_PATH = "docs/launch/launch-manual-evidence-completion-path-audit.json";
const REPORT_MD_PATH = "docs/launch/launch-manual-evidence-completion-path-audit.md";
const PENDING_STATUS = "pending_evidence_or_owner_deferral";
const EVIDENCE_STATUS = "evidence_satisfied";
const OWNER_DEFERRED_STATUS = "owner_deferred";
const MISSING_INTAKE_STATUS = "missing_intake";
const REQUIRED_EVIDENCE_FIELDS = ["evidence_ref", "evidence_recorded_at", "verifier"];
const REQUIRED_DEFERRAL_FIELDS = [
  "decision_register_id",
  "owner_role_name",
  "deferral_basis",
  "target_date_or_revisit_gate",
  "approval_signature_ref"
];

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function nonempty(value) {
  return String(value ?? "").trim().length > 0;
}

function addFinding(findings, severity, code, message, details = {}) {
  findings.push({ severity, code, message, details });
}

function statusCounts(rows, statusField) {
  return {
    pending: rows.filter((row) => row[statusField] === PENDING_STATUS).length,
    evidence_satisfied: rows.filter((row) => row[statusField] === EVIDENCE_STATUS).length,
    owner_deferred: rows.filter((row) => row[statusField] === OWNER_DEFERRED_STATUS).length,
    missing_intake: rows.filter((row) => row[statusField] === MISSING_INTAKE_STATUS).length
  };
}

function compareCount(findings, code, expected, actual, details = {}) {
  if (expected !== actual) {
    addFinding(findings, "P0", code, "Manual intake and acceptance matrix counts diverged.", {
      expected,
      actual,
      ...details
    });
  }
}

function renderMarkdown(report) {
  const lines = [];
  lines.push("# Launch Manual Evidence Completion Path Audit");
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
  lines.push("## Completion Path Projection");
  lines.push("");
  lines.push(`- Go-live evidence path ready: ${report.path_projection.go_live_evidence_completion_path_ready}`);
  lines.push(`- L9 evidence path ready: ${report.path_projection.l9_evidence_completion_path_ready}`);
  lines.push(`- All evidence paths ready: ${report.path_projection.all_evidence_completion_paths_ready}`);
  lines.push(`- Owner-deferred rows require coverage: ${report.path_projection.owner_deferred_rows_require_coverage}`);
  lines.push("");
  lines.push("## Findings");
  lines.push("");
  if (report.findings.length === 0) {
    lines.push("No findings.");
  } else {
    lines.push("| Severity | Code | Message |");
    lines.push("| --- | --- | --- |");
    for (const finding of report.findings) {
      lines.push(`| ${finding.severity} | ${finding.code} | ${finding.message} |`);
    }
  }
  lines.push("");
  lines.push("## Boundary");
  lines.push("");
  lines.push("- This audit checks completion-path propagation only.");
  lines.push("- It does not approve go-live.");
  lines.push("- It does not approve owner deferrals.");
  lines.push("- Pending rows do not count as completion evidence.");
  lines.push("- Full Claude review remains waived by user instruction and is not valid review evidence.");
  lines.push("- Closed CP evidence remains read-only.");
  return `${lines.join("\n")}\n`;
}

const manualIntake = readJson(MANUAL_INTAKE_PATH);
const manualValidation = readJson(MANUAL_INTAKE_VALIDATION_PATH);
const acceptanceMatrix = readJson(ACCEPTANCE_MATRIX_PATH);
const acceptanceValidation = readJson(ACCEPTANCE_MATRIX_VALIDATION_PATH);
const existingReport = existsSync(REPORT_JSON_PATH) ? readJson(REPORT_JSON_PATH) : null;
const findings = [];

if (manualValidation.verdict !== "PASS") {
  addFinding(findings, "P1", "MANUAL_INTAKE_VALIDATION_NOT_PASS", "Manual evidence intake validation is not PASS.", {
    actual: manualValidation.verdict
  });
}

if (acceptanceValidation.verdict !== "PASS") {
  addFinding(findings, "P1", "ACCEPTANCE_MATRIX_VALIDATION_NOT_PASS", "Evidence acceptance matrix validation is not PASS.", {
    actual: acceptanceValidation.verdict
  });
}

const manualGateRows = manualIntake.gate_intake ?? [];
const manualL9Rows = manualIntake.l9_stabilization_intake ?? [];
const manualRows = [...manualGateRows, ...manualL9Rows];
const acceptanceGateRows = acceptanceMatrix.gate_acceptance_rows ?? [];
const acceptanceL9Rows = acceptanceMatrix.l9_acceptance_rows ?? [];
const acceptanceRows = [...acceptanceGateRows, ...acceptanceL9Rows];
const manualByIntakeId = new Map(manualRows.map((row) => [row.intake_id, row]));
const acceptanceByIntakeId = new Map(acceptanceRows.map((row) => [row.intake_id, row]));

compareCount(findings, "TOTAL_ROW_COUNT_MISMATCH", manualRows.length, acceptanceRows.length);
compareCount(findings, "GATE_ROW_COUNT_MISMATCH", manualGateRows.length, acceptanceGateRows.length);
compareCount(findings, "L9_ROW_COUNT_MISMATCH", manualL9Rows.length, acceptanceL9Rows.length);

const manualCounts = statusCounts(manualRows, "intake_status");
const acceptanceCounts = statusCounts(acceptanceRows, "current_intake_status");
const ownerDeferralOverlayAllowed = acceptanceValidation.summary.coverage_eligible_valid_deferred_rows > 0;
compareCount(findings, "STATUS_COUNT_MISMATCH_PENDING", manualCounts.pending, acceptanceCounts.pending + (ownerDeferralOverlayAllowed ? acceptanceCounts.owner_deferred : 0), {
  status: "pending_or_owner_deferred"
});
compareCount(findings, "STATUS_COUNT_MISMATCH_EVIDENCE_SATISFIED", manualCounts.evidence_satisfied, acceptanceCounts.evidence_satisfied, {
  status: "evidence_satisfied"
});
if (!ownerDeferralOverlayAllowed) {
  compareCount(findings, "STATUS_COUNT_MISMATCH_OWNER_DEFERRED", manualCounts.owner_deferred, acceptanceCounts.owner_deferred, {
    status: "owner_deferred"
  });
}
compareCount(findings, "ACCEPTANCE_MISSING_INTAKE_COUNT", 0, acceptanceCounts.missing_intake, {
  status: MISSING_INTAKE_STATUS
});

const manualGateCounts = statusCounts(manualGateRows, "intake_status");
const manualL9Counts = statusCounts(manualL9Rows, "intake_status");
const acceptanceGateCounts = statusCounts(acceptanceGateRows, "current_intake_status");
const acceptanceL9Counts = statusCounts(acceptanceL9Rows, "current_intake_status");
for (const [domain, left, right] of [
  ["gate", manualGateCounts, acceptanceGateCounts],
  ["l9", manualL9Counts, acceptanceL9Counts]
]) {
  compareCount(findings, `${domain.toUpperCase()}_STATUS_COUNT_MISMATCH_PENDING`, left.pending, right.pending + (ownerDeferralOverlayAllowed ? right.owner_deferred : 0), {
    domain,
    status: "pending_or_owner_deferred"
  });
  compareCount(findings, `${domain.toUpperCase()}_STATUS_COUNT_MISMATCH_EVIDENCE_SATISFIED`, left.evidence_satisfied, right.evidence_satisfied, {
    domain,
    status: "evidence_satisfied"
  });
  if (!ownerDeferralOverlayAllowed) {
    compareCount(findings, `${domain.toUpperCase()}_STATUS_COUNT_MISMATCH_OWNER_DEFERRED`, left.owner_deferred, right.owner_deferred, {
      domain,
      status: "owner_deferred"
    });
  }
}

for (const row of manualRows) {
  const acceptanceRow = acceptanceByIntakeId.get(row.intake_id);
  if (!acceptanceRow) {
    addFinding(findings, "P0", "MANUAL_ROW_WITHOUT_ACCEPTANCE_ROW", "Manual intake row has no matching acceptance row.", {
      intake_id: row.intake_id
    });
  }
}

for (const row of acceptanceRows) {
  const manualRow = manualByIntakeId.get(row.intake_id);
  if (!manualRow) {
    addFinding(findings, "P0", "ACCEPTANCE_ROW_WITHOUT_MANUAL_ROW", "Acceptance row has no matching manual intake row.", {
      acceptance_id: row.acceptance_id,
      intake_id: row.intake_id
    });
    continue;
  }
  const ownerDeferralOverlay = manualRow.intake_status === PENDING_STATUS
    && row.current_intake_status === OWNER_DEFERRED_STATUS
    && ownerDeferralOverlayAllowed;
  if (row.current_intake_status !== manualRow.intake_status && !ownerDeferralOverlay) {
    addFinding(findings, "P0", "ROW_STATUS_MISMATCH", "Acceptance row status does not mirror manual intake status.", {
      acceptance_id: row.acceptance_id,
      intake_id: row.intake_id,
      manual_status: manualRow.intake_status,
      acceptance_status: row.current_intake_status
    });
  }
  if (manualRow.intake_status === EVIDENCE_STATUS) {
    const missing = REQUIRED_EVIDENCE_FIELDS.filter((field) => !nonempty(manualRow[field]));
    if (missing.length > 0) {
      addFinding(findings, "P1", "EVIDENCE_SATISFIED_ROW_MISSING_FIELDS", "Evidence-satisfied manual row is missing required evidence fields.", {
        intake_id: manualRow.intake_id,
        missing
      });
    }
  }
  if (manualRow.intake_status === OWNER_DEFERRED_STATUS) {
    const missing = REQUIRED_DEFERRAL_FIELDS.filter((field) => !nonempty(manualRow[field]));
    if (missing.length > 0) {
      addFinding(findings, "P1", "OWNER_DEFERRED_ROW_MISSING_FIELDS", "Owner-deferred manual row is missing required deferral fields.", {
        intake_id: manualRow.intake_id,
        missing
      });
    }
  }
}

const gateEvidenceCompletionReady =
  acceptanceValidation.summary.gate_acceptance_row_count > 0 &&
  acceptanceValidation.summary.gate_evidence_satisfied_acceptance_row_count ===
    acceptanceValidation.summary.gate_acceptance_row_count &&
  acceptanceValidation.summary.gate_pending_acceptance_row_count === 0 &&
  acceptanceGateCounts.missing_intake === 0;
const l9EvidenceCompletionReady =
  acceptanceValidation.summary.l9_acceptance_row_count > 0 &&
  acceptanceValidation.summary.l9_evidence_satisfied_acceptance_row_count ===
    acceptanceValidation.summary.l9_acceptance_row_count &&
  acceptanceValidation.summary.l9_pending_acceptance_row_count === 0 &&
  acceptanceL9Counts.missing_intake === 0;
const verdict = findings.some((finding) => finding.severity === "P0" || finding.severity === "P1") ? "FAIL" : "PASS";
const report = {
  schema_version: "law-firm-os.launch-manual-evidence-completion-path-audit.v0.1",
  generated_at: existingReport?.generated_at ?? new Date().toISOString(),
  source_refs: [
    MANUAL_INTAKE_PATH,
    MANUAL_INTAKE_VALIDATION_PATH,
    ACCEPTANCE_MATRIX_PATH,
    ACCEPTANCE_MATRIX_VALIDATION_PATH
  ],
  verdict,
  boundary: {
    audits_completion_path_only: true,
    go_live_approved_by_this_audit: false,
    owner_deferrals_approved_by_this_audit: false,
    pending_rows_count_as_completion_evidence: false,
    review_waiver_counts_as_valid_review_evidence: false,
    closed_cp_evidence_is_read_only: true
  },
  summary: {
    manual_intake_validation_pass: manualValidation.verdict === "PASS",
    acceptance_matrix_validation_pass: acceptanceValidation.verdict === "PASS",
    total_manual_intake_row_count: manualRows.length,
    total_acceptance_row_count: acceptanceRows.length,
    gate_manual_intake_row_count: manualGateRows.length,
    gate_acceptance_row_count: acceptanceGateRows.length,
    l9_manual_intake_row_count: manualL9Rows.length,
    l9_acceptance_row_count: acceptanceL9Rows.length,
    pending_manual_intake_row_count: manualCounts.pending,
    pending_acceptance_row_count: acceptanceCounts.pending,
    evidence_satisfied_manual_intake_row_count: manualCounts.evidence_satisfied,
    evidence_satisfied_acceptance_row_count: acceptanceCounts.evidence_satisfied,
    owner_deferred_manual_intake_row_count: manualCounts.owner_deferred,
    owner_deferred_acceptance_row_count: acceptanceCounts.owner_deferred,
    missing_intake_acceptance_row_count: acceptanceCounts.missing_intake,
    gate_evidence_satisfied_manual_intake_row_count: manualGateCounts.evidence_satisfied,
    gate_evidence_satisfied_acceptance_row_count: acceptanceGateCounts.evidence_satisfied,
    l9_evidence_satisfied_manual_intake_row_count: manualL9Counts.evidence_satisfied,
    l9_evidence_satisfied_acceptance_row_count: acceptanceL9Counts.evidence_satisfied,
    finding_count: findings.length,
    p0_count: findings.filter((finding) => finding.severity === "P0").length,
    p1_count: findings.filter((finding) => finding.severity === "P1").length
  },
  path_projection: {
    go_live_evidence_completion_path_ready: gateEvidenceCompletionReady,
    l9_evidence_completion_path_ready: l9EvidenceCompletionReady,
    all_evidence_completion_paths_ready: gateEvidenceCompletionReady && l9EvidenceCompletionReady,
    owner_deferred_rows_require_coverage: acceptanceCounts.owner_deferred > 0,
    owner_deferral_overlay_allowed: ownerDeferralOverlayAllowed
  },
  findings
};

mkdirSync(dirname(REPORT_JSON_PATH), { recursive: true });
writeFileSync(REPORT_JSON_PATH, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(REPORT_MD_PATH, renderMarkdown(report));

console.log(JSON.stringify({
  report_json: REPORT_JSON_PATH,
  report_markdown: REPORT_MD_PATH,
  verdict: report.verdict,
  total_manual_intake_row_count: report.summary.total_manual_intake_row_count,
  total_acceptance_row_count: report.summary.total_acceptance_row_count,
  evidence_satisfied_manual_intake_row_count: report.summary.evidence_satisfied_manual_intake_row_count,
  evidence_satisfied_acceptance_row_count: report.summary.evidence_satisfied_acceptance_row_count,
  go_live_evidence_completion_path_ready: report.path_projection.go_live_evidence_completion_path_ready,
  l9_evidence_completion_path_ready: report.path_projection.l9_evidence_completion_path_ready,
  finding_count: report.summary.finding_count,
  p0_count: report.summary.p0_count,
  p1_count: report.summary.p1_count
}, null, 2));

if (report.verdict !== "PASS") {
  process.exit(1);
}
