#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const ANNEX_JSON_PATH = "docs/launch/launch-minimum-deferral-target-annex.json";
const ANNEX_MD_PATH = "docs/launch/launch-minimum-deferral-target-annex.md";
const MINIMUM_PACKET_PATH = "docs/launch/launch-minimum-deferral-decision-packet.json";
const DEFERRAL_COVERAGE_AUDIT_PATH = "docs/launch/launch-deferral-coverage-audit.json";
const VALIDATION_JSON_PATH = "docs/launch/launch-minimum-deferral-target-annex-validation.json";
const VALIDATION_MD_PATH = "docs/launch/launch-minimum-deferral-target-annex-validation.md";

const REQUIRED_MARKDOWN_PHRASES = [
  "placeholder-only minimum deferral rows",
  "does not approve go-live",
  "does not approve owner deferrals",
  "does not modify `docs/launch/launch-decision-register.md`",
  "conditional on real owner evidence"
];

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function readText(path) {
  return readFileSync(path, "utf8");
}

function addFinding(findings, severity, code, message, details = {}) {
  findings.push({ severity, code, message, details });
}

function markdownCell(value) {
  return String(value ?? "").replaceAll("|", "\\|").replace(/\s+/g, " ").trim();
}

function unique(values) {
  return [...new Set(values)].sort();
}

function sameSet(left, right) {
  return JSON.stringify(unique(left)) === JSON.stringify(unique(right));
}

function renderMarkdown(report) {
  const lines = [];
  lines.push("# Launch Minimum Deferral Target Annex Validation");
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
    lines.push("| Severity | Code | Message |");
    lines.push("| --- | --- | --- |");
    for (const finding of report.findings) {
      lines.push(`| ${finding.severity} | ${finding.code} | ${markdownCell(finding.message)} |`);
    }
  }
  lines.push("");
  lines.push("## Boundary");
  lines.push("");
  lines.push("- This validation checks the minimum deferral target annex only.");
  lines.push("- It does not approve go-live.");
  lines.push("- It does not approve owner deferrals.");
  lines.push("- It does not modify the launch decision register.");
  lines.push("- Closed CP evidence remains read-only.");
  return `${lines.join("\n")}\n`;
}

const annex = readJson(ANNEX_JSON_PATH);
const annexMarkdown = readText(ANNEX_MD_PATH);
const minimumPacket = readJson(MINIMUM_PACKET_PATH);
const deferralCoverageAudit = readJson(DEFERRAL_COVERAGE_AUDIT_PATH);
const existingValidation = existsSync(VALIDATION_JSON_PATH) ? readJson(VALIDATION_JSON_PATH) : null;
const findings = [];

if (annex.schema_version !== "law-firm-os.launch-minimum-deferral-target-annex.v0.1") {
  addFinding(findings, "P1", "SCHEMA_VERSION", "Unexpected minimum deferral target annex schema version.", {
    actual: annex.schema_version
  });
}

const expectedBoundary = {
  annex_only: true,
  go_live_approved_by_this_annex: false,
  owner_deferrals_approved_by_this_annex: false,
  launch_decision_register_modified_by_this_annex: false,
  target_coverage_requires_real_owner_evidence: true,
  review_waiver_counts_as_valid_review_evidence: false,
  closed_cp_evidence_is_read_only: true
};

for (const [key, expected] of Object.entries(expectedBoundary)) {
  if (annex.boundary?.[key] !== expected) {
    addFinding(findings, "P0", `BOUNDARY_${key}`, `Minimum deferral target annex boundary field ${key} drifted.`, {
      expected,
      actual: annex.boundary?.[key]
    });
  }
}

const packetRows = minimumPacket.placeholder_decision_rows ?? [];
const annexRows = annex.minimum_decision_rows ?? [];
const packetDecisionIds = packetRows.map((row) => row.decision_id);
const annexDecisionIds = annexRows.map((row) => row.decision_id);

if (!sameSet(annexDecisionIds, packetDecisionIds)) {
  addFinding(findings, "P1", "DECISION_IDS_MISMATCH", "Annex decision IDs do not match the minimum deferral decision packet.", {
    expected: packetDecisionIds,
    actual: annexDecisionIds
  });
}

if (annexRows.length !== packetRows.length) {
  addFinding(findings, "P1", "DECISION_ROW_COUNT_MISMATCH", "Annex decision row count does not match the minimum packet.", {
    expected: packetRows.length,
    actual: annexRows.length
  });
}

const coverageRowsByDomain = deferralCoverageAudit.coverage_rows ?? {};
const coverageDomainMap = Object.fromEntries((deferralCoverageAudit.coverage_domains ?? []).map((row) => [row.domain, row]));

for (const packetRow of packetRows) {
  const annexRow = annexRows.find((row) => row.decision_id === packetRow.decision_id);
  if (!annexRow) continue;

  if (annexRow.coverage_domain !== packetRow.coverage_domain) {
    addFinding(findings, "P1", "ROW_DOMAIN_MISMATCH", "Annex row domain does not match the packet row.", {
      decision_id: packetRow.decision_id,
      expected: packetRow.coverage_domain,
      actual: annexRow.coverage_domain
    });
  }

  if (!sameSet(annexRow.target_ids ?? [], packetRow.covered_target_ids ?? [])) {
    addFinding(findings, "P1", "ROW_TARGET_IDS_MISMATCH", "Annex row target IDs do not match the packet row.", {
      decision_id: packetRow.decision_id
    });
  }

  if (annexRow.covered_target_count !== packetRow.covered_target_count) {
    addFinding(findings, "P1", "ROW_TARGET_COUNT_MISMATCH", "Annex row target count does not match the packet row.", {
      decision_id: packetRow.decision_id,
      expected: packetRow.covered_target_count,
      actual: annexRow.covered_target_count
    });
  }

  if (annexRow.source_domain_missing_count !== coverageDomainMap[packetRow.coverage_domain]?.missing) {
    addFinding(findings, "P1", "ROW_DOMAIN_MISSING_COUNT_MISMATCH", "Annex row domain missing count does not match deferral coverage audit.", {
      decision_id: packetRow.decision_id,
      expected: coverageDomainMap[packetRow.coverage_domain]?.missing,
      actual: annexRow.source_domain_missing_count
    });
  }

  const domainRows = coverageRowsByDomain[packetRow.coverage_domain] ?? [];
  const domainRowMap = new Map(domainRows.map((row) => [row.coverage_id, row]));
  for (const target of annexRow.targets ?? []) {
    const sourceTarget = domainRowMap.get(target.target_id);
    if (!sourceTarget) {
      addFinding(findings, "P1", "TARGET_NOT_IN_COVERAGE_AUDIT", "Annex target is not present in the deferral coverage audit.", {
        decision_id: packetRow.decision_id,
        target_id: target.target_id
      });
      continue;
    }
    if (!(sourceTarget.accepted_decision_ids ?? []).includes(packetRow.decision_id)) {
      addFinding(findings, "P1", "AGGREGATE_DECISION_NOT_ACCEPTED_FOR_TARGET", "Aggregate decision ID is not accepted for this target.", {
        decision_id: packetRow.decision_id,
        target_id: target.target_id
      });
    }
    if (target.aggregate_decision_id_accepted !== true) {
      addFinding(findings, "P1", "ANNEX_TARGET_NOT_MARKED_AGGREGATE_ACCEPTED", "Annex target is not marked aggregate-accepted.", {
        decision_id: packetRow.decision_id,
        target_id: target.target_id
      });
    }
    if (target.coverage_status !== sourceTarget.coverage_status) {
      addFinding(findings, "P1", "TARGET_STATUS_MISMATCH", "Annex target coverage status does not match deferral coverage audit.", {
        decision_id: packetRow.decision_id,
        target_id: target.target_id,
        expected: sourceTarget.coverage_status,
        actual: target.coverage_status
      });
    }
  }
}

const annexTargetIds = unique(annexRows.flatMap((row) => row.target_ids ?? []));
const packetTargetIds = unique(packetRows.flatMap((row) => row.covered_target_ids ?? []));
if (!sameSet(annexTargetIds, packetTargetIds)) {
  addFinding(findings, "P1", "TOTAL_TARGET_IDS_MISMATCH", "Annex total target ID set does not match the minimum packet.", {
    expected_count: packetTargetIds.length,
    actual_count: annexTargetIds.length
  });
}

if (annex.summary?.unique_target_id_count !== packetTargetIds.length) {
  addFinding(findings, "P1", "UNIQUE_TARGET_COUNT_MISMATCH", "Annex summary unique target count does not match packet target IDs.", {
    expected: packetTargetIds.length,
    actual: annex.summary?.unique_target_id_count
  });
}

if (annex.summary?.source_missing_deferral_target_count !== deferralCoverageAudit.summary.go_live_missing_deferral_count + deferralCoverageAudit.summary.l9_missing_deferral_count + deferralCoverageAudit.summary.blocked_wp_missing_deferral_count + deferralCoverageAudit.summary.phase_exit_missing_deferral_count) {
  addFinding(findings, "P1", "SOURCE_MISSING_TARGET_COUNT_MISMATCH", "Annex source missing target count does not match deferral coverage audit missing counts.", {
    actual: annex.summary?.source_missing_deferral_target_count
  });
}

if (annex.summary?.unmatched_target_count !== 0 || annex.summary?.aggregate_not_accepted_target_count !== 0) {
  addFinding(findings, "P1", "ANNEX_TARGET_DETAIL_GAP", "Annex records unmatched or aggregate-not-accepted targets.", {
    unmatched_target_count: annex.summary?.unmatched_target_count,
    aggregate_not_accepted_target_count: annex.summary?.aggregate_not_accepted_target_count
  });
}

for (const phrase of REQUIRED_MARKDOWN_PHRASES) {
  if (!annexMarkdown.includes(phrase)) {
    addFinding(findings, "P1", "MARKDOWN_BOUNDARY_PHRASE_MISSING", "Annex markdown is missing a required boundary phrase.", {
      phrase
    });
  }
}

const verdict = findings.some((finding) => finding.severity === "P0" || finding.severity === "P1") ? "FAIL" : "PASS";
const report = {
  schema_version: "law-firm-os.launch-minimum-deferral-target-annex.validation.v0.1",
  generated_at: existingValidation?.generated_at ?? new Date().toISOString(),
  source_refs: [
    ANNEX_JSON_PATH,
    ANNEX_MD_PATH,
    MINIMUM_PACKET_PATH,
    DEFERRAL_COVERAGE_AUDIT_PATH
  ],
  verdict,
  summary: {
    minimum_decision_row_count: annexRows.length,
    unique_target_id_count: annexTargetIds.length,
    expected_unique_target_id_count: packetTargetIds.length,
    unmatched_target_count: annex.summary?.unmatched_target_count ?? null,
    aggregate_not_accepted_target_count: annex.summary?.aggregate_not_accepted_target_count ?? null,
    source_missing_deferral_target_count: annex.summary?.source_missing_deferral_target_count ?? null,
    finding_count: findings.length,
    p0_count: findings.filter((finding) => finding.severity === "P0").length,
    p1_count: findings.filter((finding) => finding.severity === "P1").length
  },
  boundary: {
    validates_annex_only: true,
    go_live_approved_by_validation: false,
    owner_deferrals_approved_by_validation: false,
    launch_decision_register_modified_by_validation: false,
    closed_cp_evidence_is_read_only: true
  },
  findings
};

mkdirSync(dirname(VALIDATION_JSON_PATH), { recursive: true });
writeFileSync(VALIDATION_JSON_PATH, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(VALIDATION_MD_PATH, renderMarkdown(report));

console.log(JSON.stringify({
  report_json: VALIDATION_JSON_PATH,
  report_markdown: VALIDATION_MD_PATH,
  verdict,
  minimum_decision_row_count: report.summary.minimum_decision_row_count,
  unique_target_id_count: report.summary.unique_target_id_count,
  unmatched_target_count: report.summary.unmatched_target_count,
  aggregate_not_accepted_target_count: report.summary.aggregate_not_accepted_target_count,
  finding_count: report.summary.finding_count,
  p0_count: report.summary.p0_count,
  p1_count: report.summary.p1_count
}, null, 2));

if (verdict !== "PASS") {
  process.exit(1);
}
