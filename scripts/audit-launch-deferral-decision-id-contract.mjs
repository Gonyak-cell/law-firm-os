#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { coverageDomainForDecisionId } from "./lib/launch-decision-register.mjs";

const DEFERRAL_COVERAGE_AUDIT_PATH = "docs/launch/launch-deferral-coverage-audit.json";
const OWNER_ACTION_PACKAGE_PATH = "docs/launch/owner-action-deferral-request.json";
const REPORT_JSON_PATH = "docs/launch/launch-deferral-decision-id-contract-audit.json";
const REPORT_MD_PATH = "docs/launch/launch-deferral-decision-id-contract-audit.md";
const REQUIRED_DOMAINS = [
  "go_live_gate_evidence",
  "l9_stabilization_closure",
  "blocked_work_package",
  "phase_exit"
];

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function sorted(values) {
  return [...values].sort();
}

function sameSet(left, right) {
  const a = sorted(left ?? []);
  const b = sorted(right ?? []);
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function addFinding(findings, severity, code, message, details = {}) {
  findings.push({ severity, code, message, details });
}

function markdownCell(value) {
  return String(value ?? "").replaceAll("|", "\\|").replace(/\s+/g, " ").trim();
}

function renderMarkdown(report) {
  const lines = [];
  lines.push("# Launch Deferral Decision ID Contract Audit");
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
  lines.push("## Domain Contract");
  lines.push("");
  lines.push("| Domain | Coverage rows | Accepted ID mentions | Unique IDs | Unclassified | Mismatched |");
  lines.push("| --- | ---: | ---: | ---: | ---: | ---: |");
  for (const row of report.domain_contracts) {
    lines.push(`| ${markdownCell(row.domain)} | ${row.coverage_row_count} | ${row.accepted_decision_id_mention_count} | ${row.unique_accepted_decision_id_count} | ${row.unclassified_decision_id_count} | ${row.domain_mismatch_count} |`);
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
  lines.push("- This audit validates decision ID classification only.");
  lines.push("- It does not approve go-live.");
  lines.push("- It does not approve owner deferrals.");
  lines.push("- It does not create or modify launch decision register rows.");
  lines.push("- Closed CP evidence remains read-only.");
  return `${lines.join("\n")}\n`;
}

const deferralCoverageAudit = readJson(DEFERRAL_COVERAGE_AUDIT_PATH);
const ownerActionPackage = readJson(OWNER_ACTION_PACKAGE_PATH);
const existingReport = existsSync(REPORT_JSON_PATH) ? readJson(REPORT_JSON_PATH) : null;
const findings = [];

if (deferralCoverageAudit.verdict !== "PASS") {
  addFinding(findings, "P1", "DEFERRAL_COVERAGE_AUDIT_NOT_PASS", "Deferral coverage audit must pass before the decision ID contract can be trusted.", {
    actual: deferralCoverageAudit.verdict
  });
}

const ownerActionDomains = (ownerActionPackage.accepted_decision_id_patterns ?? []).map((row) => row.domain);
if (!sameSet(REQUIRED_DOMAINS, ownerActionDomains)) {
  addFinding(findings, "P1", "OWNER_ACTION_DOMAIN_SET_MISMATCH", "Owner action package accepted decision ID domains do not match required coverage domains.", {
    expected: REQUIRED_DOMAINS,
    actual: ownerActionDomains
  });
}

const acceptedDecisionRows = [];
for (const [domainKey, rows] of Object.entries(deferralCoverageAudit.coverage_rows ?? {})) {
  for (const coverageRow of rows ?? []) {
    if (coverageRow.domain !== domainKey) {
      addFinding(findings, "P1", "COVERAGE_ROW_DOMAIN_KEY_MISMATCH", "Coverage row domain does not match its coverage_rows bucket.", {
        coverage_id: coverageRow.coverage_id,
        domain_key: domainKey,
        row_domain: coverageRow.domain
      });
    }
    for (const decisionId of coverageRow.accepted_decision_ids ?? []) {
      const classifiedDomain = coverageDomainForDecisionId(decisionId);
      const contractRow = {
        coverage_id: coverageRow.coverage_id,
        coverage_domain: coverageRow.domain,
        accepted_decision_id: decisionId,
        classified_domain: classifiedDomain,
        contract_status: classifiedDomain === coverageRow.domain ? "match" : classifiedDomain ? "domain_mismatch" : "unclassified"
      };
      acceptedDecisionRows.push(contractRow);
      if (!classifiedDomain) {
        addFinding(findings, "P0", "UNCLASSIFIED_ACCEPTED_DECISION_ID", "Accepted decision ID is not classified by the launch decision register parser.", {
          coverage_id: coverageRow.coverage_id,
          coverage_domain: coverageRow.domain,
          accepted_decision_id: decisionId
        });
      } else if (classifiedDomain !== coverageRow.domain) {
        addFinding(findings, "P0", "ACCEPTED_DECISION_ID_DOMAIN_MISMATCH", "Accepted decision ID classifies to a different coverage domain than the row it is meant to cover.", {
          coverage_id: coverageRow.coverage_id,
          coverage_domain: coverageRow.domain,
          accepted_decision_id: decisionId,
          classified_domain: classifiedDomain
        });
      }
    }
  }
}

for (const domain of REQUIRED_DOMAINS) {
  const domainRows = acceptedDecisionRows.filter((row) => row.coverage_domain === domain);
  if (domainRows.length === 0) {
    addFinding(findings, "P1", "REQUIRED_DOMAIN_HAS_NO_ACCEPTED_IDS", "Required coverage domain has no accepted decision IDs in the deferral coverage audit.", {
      domain
    });
  }
}

const acceptedIdDomainMap = new Map();
for (const row of acceptedDecisionRows) {
  if (!acceptedIdDomainMap.has(row.accepted_decision_id)) {
    acceptedIdDomainMap.set(row.accepted_decision_id, new Set());
  }
  acceptedIdDomainMap.get(row.accepted_decision_id).add(row.coverage_domain);
}
const crossDomainDecisionIds = [...acceptedIdDomainMap.entries()]
  .filter(([, domains]) => domains.size > 1)
  .map(([decision_id, domains]) => ({ decision_id, domains: sorted(domains) }));
for (const row of crossDomainDecisionIds) {
  addFinding(findings, "P0", "ACCEPTED_DECISION_ID_CROSSES_DOMAINS", "Accepted decision ID is used across multiple coverage domains.", row);
}

const domainContracts = REQUIRED_DOMAINS.map((domain) => {
  const rows = acceptedDecisionRows.filter((row) => row.coverage_domain === domain);
  const uniqueIds = new Set(rows.map((row) => row.accepted_decision_id));
  return {
    domain,
    coverage_row_count: (deferralCoverageAudit.coverage_rows?.[domain] ?? []).length,
    accepted_decision_id_mention_count: rows.length,
    unique_accepted_decision_id_count: uniqueIds.size,
    unclassified_decision_id_count: rows.filter((row) => row.contract_status === "unclassified").length,
    domain_mismatch_count: rows.filter((row) => row.contract_status === "domain_mismatch").length
  };
});

const verdict = findings.some((finding) => finding.severity === "P0" || finding.severity === "P1") ? "FAIL" : "PASS";
const report = {
  schema_version: "law-firm-os.launch-deferral-decision-id-contract-audit.v0.1",
  generated_at: existingReport?.generated_at ?? new Date().toISOString(),
  source_refs: [
    DEFERRAL_COVERAGE_AUDIT_PATH,
    OWNER_ACTION_PACKAGE_PATH,
    "scripts/lib/launch-decision-register.mjs"
  ],
  verdict,
  boundary: {
    validates_decision_id_classification_only: true,
    go_live_approved_by_this_audit: false,
    owner_deferrals_approved_by_this_audit: false,
    launch_decision_register_modified_by_this_audit: false,
    review_waiver_counts_as_valid_review_evidence: false,
    closed_cp_evidence_is_read_only: true
  },
  summary: {
    required_domain_count: REQUIRED_DOMAINS.length,
    owner_action_domain_count: ownerActionDomains.length,
    coverage_row_count: Object.values(deferralCoverageAudit.coverage_rows ?? {}).reduce((sum, rows) => sum + (rows?.length ?? 0), 0),
    accepted_decision_id_mention_count: acceptedDecisionRows.length,
    unique_accepted_decision_id_count: acceptedIdDomainMap.size,
    unclassified_decision_id_count: acceptedDecisionRows.filter((row) => row.contract_status === "unclassified").length,
    domain_mismatch_count: acceptedDecisionRows.filter((row) => row.contract_status === "domain_mismatch").length,
    cross_domain_decision_id_count: crossDomainDecisionIds.length,
    finding_count: findings.length,
    p0_count: findings.filter((finding) => finding.severity === "P0").length,
    p1_count: findings.filter((finding) => finding.severity === "P1").length
  },
  domain_contracts: domainContracts,
  cross_domain_decision_ids: crossDomainDecisionIds,
  accepted_decision_rows: acceptedDecisionRows,
  findings
};

mkdirSync(dirname(REPORT_JSON_PATH), { recursive: true });
writeFileSync(REPORT_JSON_PATH, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(REPORT_MD_PATH, renderMarkdown(report));

console.log(JSON.stringify({
  report_json: REPORT_JSON_PATH,
  report_markdown: REPORT_MD_PATH,
  verdict,
  accepted_decision_id_mention_count: report.summary.accepted_decision_id_mention_count,
  unique_accepted_decision_id_count: report.summary.unique_accepted_decision_id_count,
  unclassified_decision_id_count: report.summary.unclassified_decision_id_count,
  domain_mismatch_count: report.summary.domain_mismatch_count,
  cross_domain_decision_id_count: report.summary.cross_domain_decision_id_count,
  finding_count: report.summary.finding_count,
  p0_count: report.summary.p0_count,
  p1_count: report.summary.p1_count
}, null, 2));

if (report.verdict !== "PASS") {
  process.exit(1);
}
