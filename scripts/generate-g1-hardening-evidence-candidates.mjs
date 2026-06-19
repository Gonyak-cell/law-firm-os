#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const CONTRACT_PATH = "contracts/critical-rp-saas-hardening-contract.json";
const OUTPUT_JSON_PATH = "docs/launch/g1-hardening-evidence-candidates-2026-06-19.json";
const OUTPUT_MD_PATH = "docs/launch/g1-hardening-evidence-candidates-2026-06-19.md";

const CONTROL_RULES = {
  tenant_isolation: ["tenant", "cross-tenant", "tenant_id", "multi-tenant"],
  object_level_authorization: ["object-level", "object authorization", "ACL", "RBAC", "ABAC", "permission"],
  deny_over_allow: ["deny", "fail closed", "fail-closed", "deny-over-allow"],
  matter_first_traceability: ["matter-first", "Matter", "matter_id", "traceability"],
  append_only_audit_or_evidence: ["append-only", "audit", "evidence", "hash chain", "tamper"],
  privacy_minimization: ["privacy", "PII", "minimization", "personal information"],
  secure_secret_handling: ["secret", "credential", "access token", "api key", "signed url"],
  idempotency_and_replay_protection: ["idempotency", "replay", "duplicate", "retry"],
  data_retention_and_legal_hold: ["retention", "legal hold", "WORM", "purge"],
  observability_trace_log_metric: ["observability", "trace", "metric", "log", "telemetry"],
  synthetic_fixture_only: ["synthetic", "fixture", "no production", "customer-safe"],
  contract_tests: ["test", "contract", "validator", "validation"],
  threat_model: ["threat", "risk", "blocked-claim", "attack"],
  migration_or_release_rollback: ["migration", "rollback", "release", "scope changes"],
  hermes_gate: ["Hermes", "H00", "H01", "H02", "H03", "H04", "H05", "H06", "H07", "H10", "H12", "H14", "H16", "H17", "H25", "H26", "H29"],
  claude_cross_validation: ["Claude", "cross-review", "cross-validation", "C00", "C01", "C02", "C03", "C04", "C05", "C06", "C07", "C10", "C12", "C14", "C16", "C17", "C25", "C26", "C29"],
  human_approval: ["human approval", "approval", "release approval", "authority matrix"]
};

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function markdownCell(value) {
  return String(value ?? "").replaceAll("|", "\\|").replace(/\s+/g, " ").trim();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalize(value) {
  return String(value ?? "").toLowerCase();
}

function evidenceFieldsForOverlay(overlay) {
  const fields = [];
  fields.push({ field: "title", value: overlay.title ?? "" });
  fields.push({ field: "tier", value: overlay.tier ?? "" });
  fields.push({ field: "why_critical", value: overlay.why_critical ?? "" });
  for (const value of asArray(overlay.research_alignment)) fields.push({ field: "research_alignment", value });
  for (const value of asArray(overlay.essential_capabilities)) fields.push({ field: "essential_capabilities", value });
  for (const value of asArray(overlay.safety_gates)) fields.push({ field: "safety_gates", value });
  for (const value of asArray(overlay.mandatory_artifacts)) fields.push({ field: "mandatory_artifacts", value });
  fields.push({ field: "hermes_gate", value: overlay.hermes_gate ?? "" });
  fields.push({ field: "claude_gate", value: overlay.claude_gate ?? "" });
  return fields;
}

function snippetForTerm(text, term) {
  const lines = text.split(/\r?\n/);
  const normalizedTerm = normalize(term);
  const lineIndex = lines.findIndex((line) => normalize(line).includes(normalizedTerm));
  if (lineIndex === -1) return null;
  return {
    line: lineIndex + 1,
    snippet: lines[lineIndex].trim().slice(0, 240)
  };
}

function artifactContentMatches(mandatoryArtifacts, terms) {
  const matches = [];
  for (const artifact of mandatoryArtifacts.filter((candidate) => candidate.exists)) {
    const text = readFileSync(artifact.path, "utf8");
    const matchedTerms = terms.filter((term) => normalize(text).includes(normalize(term)));
    if (matchedTerms.length === 0) continue;
    const firstSnippet = matchedTerms.map((term) => snippetForTerm(text, term)).find(Boolean);
    matches.push({
      field: "mandatory_artifact_content",
      artifact_path: artifact.path,
      value: firstSnippet?.snippet ?? "",
      line: firstSnippet?.line ?? null,
      matched_terms: [...new Set(matchedTerms)]
    });
  }
  return matches;
}

function matchControlEvidence(overlay, controlId, mandatoryArtifacts) {
  const terms = CONTROL_RULES[controlId] ?? [controlId.replaceAll("_", " ")];
  const fields = evidenceFieldsForOverlay(overlay);
  const matches = [];
  for (const field of fields) {
    const lower = normalize(field.value);
    const matchedTerms = terms.filter((term) => lower.includes(normalize(term)));
    if (matchedTerms.length > 0) {
      matches.push({
        field: field.field,
        value: field.value,
        matched_terms: [...new Set(matchedTerms)]
      });
    }
  }
  matches.push(...artifactContentMatches(mandatoryArtifacts, terms));
  return matches;
}

function buildRows(contract) {
  const overlaysById = new Map(asArray(contract.rp_overlays).map((overlay) => [overlay.id, overlay]));
  const rows = [];
  for (const rpId of asArray(contract.critical_rp_ids)) {
    const overlay = overlaysById.get(rpId);
    const mandatoryArtifacts = asArray(overlay?.mandatory_artifacts).map((artifactPath) => ({
      path: artifactPath,
      exists: existsSync(artifactPath)
    }));
    for (const controlId of asArray(contract.universal_saas_controls)) {
      const controlEvidence = overlay ? matchControlEvidence(overlay, controlId, mandatoryArtifacts) : [];
      const candidateStatus = controlEvidence.length > 0 ? "candidate_evidence_present_pending_adjudication" : "candidate_gap_pending_evidence";
      rows.push({
        cell_id: `${rpId}:${controlId}`,
        rp_id: rpId,
        control_id: controlId,
        g1_e03_status: "not_satisfied",
        candidate_status: candidateStatus,
        satisfies_g1_e03: false,
        candidate_evidence_count: controlEvidence.length,
        candidate_evidence: controlEvidence,
        mandatory_artifacts: mandatoryArtifacts,
        missing_mandatory_artifacts: mandatoryArtifacts.filter((artifact) => !artifact.exists),
        required_next_action: controlEvidence.length > 0
          ? "Adjudicate candidate refs and record real evidence, n/a rationale, or owner-approved unmet disposition."
          : "Extract a real control-specific evidence ref or record an owner-approved unmet disposition."
      });
    }
  }
  return rows;
}

function countBy(rows, key) {
  return rows.reduce((counts, row) => {
    const value = row[key];
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

function summarizeByRp(rows) {
  const byRp = new Map();
  for (const row of rows) {
    const current = byRp.get(row.rp_id) ?? {
      rp_id: row.rp_id,
      total_cell_count: 0,
      candidate_evidence_present_count: 0,
      candidate_gap_count: 0,
      missing_mandatory_artifacts: new Set()
    };
    current.total_cell_count += 1;
    if (row.candidate_status === "candidate_evidence_present_pending_adjudication") current.candidate_evidence_present_count += 1;
    if (row.candidate_status === "candidate_gap_pending_evidence") current.candidate_gap_count += 1;
    for (const artifact of row.missing_mandatory_artifacts) current.missing_mandatory_artifacts.add(artifact.path);
    byRp.set(row.rp_id, current);
  }
  return [...byRp.values()].map((row) => ({
    ...row,
    missing_mandatory_artifact_count: row.missing_mandatory_artifacts.size,
    missing_mandatory_artifacts: [...row.missing_mandatory_artifacts].sort()
  }));
}

function renderMarkdown(report) {
  const lines = [];
  lines.push("# G1 Hardening Evidence Candidates");
  lines.push("");
  lines.push(`Generated on: ${report.generated_on}`);
  lines.push("");
  lines.push("## Boundary");
  lines.push("");
  lines.push("- This candidate matrix does not close G1-E03.");
  lines.push("- No cell is marked `evidence_satisfied` by this package.");
  lines.push("- Candidate evidence means a repo-local hardening reference exists and still requires adjudication.");
  lines.push("- G1-E03 can close only after every cell has real evidence, an approved n/a rationale, or an owner-approved unmet disposition.");
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  for (const [key, value] of Object.entries(report.summary)) {
    lines.push(`- ${key}: ${value}`);
  }
  lines.push("");
  lines.push("## RP Summary");
  lines.push("");
  lines.push("| RP | Total cells | Candidate refs | Candidate gaps | Missing mandatory artifacts |");
  lines.push("| --- | ---: | ---: | ---: | ---: |");
  for (const row of report.rp_summary) {
    lines.push(`| ${row.rp_id} | ${row.total_cell_count} | ${row.candidate_evidence_present_count} | ${row.candidate_gap_count} | ${row.missing_mandatory_artifact_count} |`);
  }
  lines.push("");
  lines.push("## First Candidate Gaps");
  lines.push("");
  lines.push("| Cell | Required next action |");
  lines.push("| --- | --- |");
  for (const row of report.cells.filter((cell) => cell.candidate_status === "candidate_gap_pending_evidence").slice(0, 40)) {
    lines.push(`| ${row.cell_id} | ${markdownCell(row.required_next_action)} |`);
  }
  lines.push("");
  lines.push("Full 272-cell candidate matrix is in the JSON artifact.");
  return `${lines.join("\n")}\n`;
}

const contract = readJson(CONTRACT_PATH);
const cells = buildRows(contract);
const rpSummary = summarizeByRp(cells);
const statusCounts = countBy(cells, "candidate_status");
const uniqueMissingArtifacts = [
  ...new Set(cells.flatMap((cell) => cell.missing_mandatory_artifacts.map((artifact) => artifact.path)))
].sort();

const report = {
  schema_version: "law-firm-os.g1-hardening-evidence-candidates.v0.1",
  generated_on: "2026-06-19",
  source_refs: [
    CONTRACT_PATH,
    "docs/critical-rp-saas-hardening-plan.md",
    "docs/launch/hardening-coverage-matrix.md",
    "docs/launch/g1-completion-remediation-prep-2026-06-19.json"
  ],
  boundary: {
    closes_g1_e03: false,
    marks_any_cell_evidence_satisfied: false,
    go_live_approved_by_this_package: false,
    candidate_refs_require_adjudication: true
  },
  summary: {
    total_cell_count: cells.length,
    candidate_evidence_present_count: statusCounts.candidate_evidence_present_pending_adjudication ?? 0,
    candidate_gap_count: statusCounts.candidate_gap_pending_evidence ?? 0,
    evidence_satisfied_cell_count: cells.filter((cell) => cell.satisfies_g1_e03).length,
    missing_mandatory_artifact_unique_count: uniqueMissingArtifacts.length
  },
  missing_mandatory_artifacts: uniqueMissingArtifacts,
  rp_summary: rpSummary,
  cells
};

mkdirSync(dirname(OUTPUT_JSON_PATH), { recursive: true });
writeFileSync(OUTPUT_JSON_PATH, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(OUTPUT_MD_PATH, renderMarkdown(report));

console.log(JSON.stringify({
  report_json: OUTPUT_JSON_PATH,
  report_markdown: OUTPUT_MD_PATH,
  total_cell_count: report.summary.total_cell_count,
  candidate_evidence_present_count: report.summary.candidate_evidence_present_count,
  candidate_gap_count: report.summary.candidate_gap_count,
  evidence_satisfied_cell_count: report.summary.evidence_satisfied_cell_count
}, null, 2));
