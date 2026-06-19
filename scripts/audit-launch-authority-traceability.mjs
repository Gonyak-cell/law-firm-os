#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const COMBINED_PACKAGE_PATH = "/Users/jws/Downloads/LAUNCH_TUW_PACKAGE_PART1_COMBINED.md";
const WORKBOOK_DIR = "workbook/launch-tuw";
const LEDGER_PATH = `${WORKBOOK_DIR}/launch-tuw-ledger.json`;
const REPORT_JSON_PATH = "docs/launch/launch-authority-traceability-audit.json";
const REPORT_MD_PATH = "docs/launch/launch-authority-traceability-audit.md";

const REQUIRED_COMBINED_FILE_MARKERS = [
  "PACKAGE_TOC_AND_DESIGN_PRINCIPLES.md",
  "00_Executive_Brief.md",
  "01_Launch_North_Star_and_Invariants.md",
  "02_TUW_Pyramid_Schema_and_ID_System.md",
  "03_Phase_Roadmap_PRE_to_L9.md",
  "04_Work_Package_Register.md",
  "05_TUW_Ledger.md"
];

const REQUIRED_COMBINED_PRINCIPLES = [
  "CP 계승, TUW 대체 금지",
  "닫힌 증거 불가침",
  "terminal evidence",
  "G1~G10",
  "Phase별 72 WP register",
  "PRE/L0/L1 상세 TUW 92개"
];

const REQUIRED_WORKBOOK_FILES = [
  "00_마스터_출시피라미드_스키마_레지스트리.md",
  "10_PRE.md",
  "11_L0.md",
  "12_L1.md",
  "13_L2.md",
  "14_L3.md",
  "15_L4.md",
  "16_L5.md",
  "17_L6.md",
  "18_L7.md",
  "19_L8.md",
  "20_L9.md",
  "90_검증_부록.md",
  "launch-tuw-ledger.json",
  "validate-launch-tuw-ledger.mjs"
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

function phaseFromTuwId(id) {
  return id.split("-")[1];
}

function wpFromTuwId(id) {
  return id.split("-").slice(0, 3).join("-");
}

function phaseFileFor(phase) {
  if (phase === "PRE") return "10_PRE.md";
  const n = Number(phase.slice(1));
  return `${String(n + 11).padStart(2, "0")}_${phase}.md`;
}

function collectMarkdownIds() {
  const ids = new Set();
  for (const file of readdirSync(WORKBOOK_DIR).filter((name) => /^\d{2}_.*\.md$/.test(name))) {
    const text = readText(join(WORKBOOK_DIR, file));
    for (const match of text.matchAll(/^####\s+(LT-\S+)\s+—/gm)) {
      ids.add(match[1]);
    }
  }
  return ids;
}

function renderMarkdown(report) {
  const lines = [];
  lines.push("# Launch Authority Traceability Audit");
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
  lines.push("## Authority Inputs");
  lines.push("");
  lines.push(`- Combined package: ${report.authority_inputs.combined_package.path}`);
  lines.push(`- Combined package exists: ${report.authority_inputs.combined_package.exists}`);
  lines.push(`- Workbook dir: ${report.authority_inputs.workbook.path}`);
  lines.push(`- Workbook required files present: ${report.authority_inputs.workbook.required_files_present_count}/${report.authority_inputs.workbook.required_files_count}`);
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
  lines.push("- This audit checks planning authority traceability only.");
  lines.push("- It does not approve go-live or owner deferrals.");
  lines.push("- Closed CP evidence remains read-only.");
  lines.push("- The combined package is treated as the uploaded planning package; `workbook/launch-tuw` is treated as the expanded executable ledger authority.");
  return `${lines.join("\n")}\n`;
}

const findings = [];
const combinedExists = existsSync(COMBINED_PACKAGE_PATH);
const combinedText = combinedExists ? readText(COMBINED_PACKAGE_PATH) : "";
const workbookExists = existsSync(WORKBOOK_DIR);
const ledgerExists = existsSync(LEDGER_PATH);
const ledger = ledgerExists ? readJson(LEDGER_PATH) : { meta: {}, work_packages: [], tuws: [] };

if (!combinedExists) {
  addFinding(findings, "P0", "COMBINED_PACKAGE_MISSING", "Combined launch TUW package is missing.", {
    path: COMBINED_PACKAGE_PATH
  });
}

for (const marker of REQUIRED_COMBINED_FILE_MARKERS) {
  if (!combinedText.includes(`<!-- FILE: ${marker} -->`)) {
    addFinding(findings, "P1", "COMBINED_FILE_MARKER_MISSING", "Combined package is missing an embedded file marker.", {
      marker
    });
  }
}

for (const phrase of REQUIRED_COMBINED_PRINCIPLES) {
  if (!combinedText.includes(phrase)) {
    addFinding(findings, "P1", "COMBINED_PRINCIPLE_MISSING", "Combined package is missing a required launch planning principle.", {
      phrase
    });
  }
}

if (!workbookExists) {
  addFinding(findings, "P0", "WORKBOOK_DIR_MISSING", "Launch TUW workbook directory is missing.", {
    path: WORKBOOK_DIR
  });
}

for (const file of REQUIRED_WORKBOOK_FILES) {
  if (!existsSync(join(WORKBOOK_DIR, file))) {
    addFinding(findings, "P0", "WORKBOOK_REQUIRED_FILE_MISSING", "Launch TUW workbook required file is missing.", {
      file
    });
  }
}

const phaseOrder = ledger.meta?.phase_order ?? [];
const expectedPhases = ["PRE", "L0", "L1", "L2", "L3", "L4", "L5", "L6", "L7", "L8", "L9"];
if (JSON.stringify(phaseOrder) !== JSON.stringify(expectedPhases)) {
  addFinding(findings, "P1", "PHASE_ORDER_DRIFT", "Ledger phase order does not match PRE through L9.", {
    expected: expectedPhases,
    actual: phaseOrder
  });
}

if (ledger.work_packages.length !== 72) {
  addFinding(findings, "P1", "WORK_PACKAGE_COUNT_DRIFT", "Ledger work package count is not 72.", {
    actual: ledger.work_packages.length
  });
}

if (ledger.tuws.length !== 344) {
  addFinding(findings, "P1", "TUW_COUNT_DRIFT", "Ledger TUW count is not 344.", {
    actual: ledger.tuws.length
  });
}

const wpById = new Map(ledger.work_packages.map((wp) => [wp.wp_id, wp]));
const tuwIds = new Set(ledger.tuws.map((tuw) => tuw.id));
const markdownIds = workbookExists ? collectMarkdownIds() : new Set();

for (const wp of ledger.work_packages) {
  if (!wp.goal_id) addFinding(findings, "P1", "WP_GOAL_ID_MISSING", "Work package is missing goal_id.", { wp_id: wp.wp_id });
  if (!wp.source_anchor) addFinding(findings, "P1", "WP_SOURCE_ANCHOR_MISSING", "Work package is missing source_anchor.", { wp_id: wp.wp_id });
  if (!wp.terminal_tuw || !tuwIds.has(wp.terminal_tuw)) {
    addFinding(findings, "P1", "WP_TERMINAL_TUW_INVALID", "Work package terminal_tuw is missing or not present in the TUW ledger.", {
      wp_id: wp.wp_id,
      terminal_tuw: wp.terminal_tuw
    });
  }
}

for (const tuw of ledger.tuws) {
  const phase = phaseFromTuwId(tuw.id);
  const phaseFile = phaseFileFor(phase);
  if (!wpById.has(wpFromTuwId(tuw.id))) {
    addFinding(findings, "P1", "TUW_WP_MISSING", "TUW references a missing work package.", {
      tuw_id: tuw.id
    });
  }
  if (!markdownIds.has(tuw.id)) {
    addFinding(findings, "P1", "TUW_MARKDOWN_COVERAGE_MISSING", "TUW id is missing from workbook phase markdown.", {
      tuw_id: tuw.id,
      expected_phase_file: phaseFile
    });
  }
  if (!(tuw.source_refs ?? []).length) {
    addFinding(findings, "P1", "TUW_SOURCE_REFS_MISSING", "TUW is missing source_refs.", {
      tuw_id: tuw.id
    });
  }
  if (!(tuw.deliverables ?? []).length) {
    addFinding(findings, "P1", "TUW_DELIVERABLES_MISSING", "TUW is missing deliverables.", {
      tuw_id: tuw.id
    });
  }
  if (!tuw.verification_contract?.method || !tuw.verification_contract?.evidence) {
    addFinding(findings, "P1", "TUW_VERIFICATION_CONTRACT_INCOMPLETE", "TUW verification contract is missing method or evidence.", {
      tuw_id: tuw.id
    });
  }
}

const phaseCounts = {};
for (const tuw of ledger.tuws) {
  const phase = phaseFromTuwId(tuw.id);
  phaseCounts[phase] = (phaseCounts[phase] ?? 0) + 1;
}

const verdict = findings.some((finding) => finding.severity === "P0" || finding.severity === "P1") ? "FAIL" : "PASS";
const existingReport = existsSync(REPORT_JSON_PATH) ? readJson(REPORT_JSON_PATH) : null;
const report = {
  schema_version: "law-firm-os.launch-authority-traceability-audit.v0.1",
  generated_at: existingReport?.generated_at ?? new Date().toISOString(),
  source_refs: [
    COMBINED_PACKAGE_PATH,
    WORKBOOK_DIR,
    LEDGER_PATH
  ],
  verdict,
  authority_inputs: {
    combined_package: {
      path: COMBINED_PACKAGE_PATH,
      exists: combinedExists,
      embedded_file_marker_count: REQUIRED_COMBINED_FILE_MARKERS.filter((marker) => combinedText.includes(`<!-- FILE: ${marker} -->`)).length,
      required_embedded_file_marker_count: REQUIRED_COMBINED_FILE_MARKERS.length,
      required_principle_count: REQUIRED_COMBINED_PRINCIPLES.length,
      required_principles_present_count: REQUIRED_COMBINED_PRINCIPLES.filter((phrase) => combinedText.includes(phrase)).length
    },
    workbook: {
      path: WORKBOOK_DIR,
      exists: workbookExists,
      required_files_count: REQUIRED_WORKBOOK_FILES.length,
      required_files_present_count: REQUIRED_WORKBOOK_FILES.filter((file) => existsSync(join(WORKBOOK_DIR, file))).length
    }
  },
  summary: {
    work_package_count: ledger.work_packages.length,
    tuw_count: ledger.tuws.length,
    phase_order: phaseOrder.join(","),
    phase_counts: JSON.stringify(phaseCounts),
    markdown_tuw_id_count: markdownIds.size,
    tuw_markdown_coverage_count: ledger.tuws.filter((tuw) => markdownIds.has(tuw.id)).length,
    wp_terminal_tuw_valid_count: ledger.work_packages.filter((wp) => wp.terminal_tuw && tuwIds.has(wp.terminal_tuw)).length,
    tuw_source_refs_present_count: ledger.tuws.filter((tuw) => (tuw.source_refs ?? []).length > 0).length,
    tuw_deliverables_present_count: ledger.tuws.filter((tuw) => (tuw.deliverables ?? []).length > 0).length,
    tuw_verification_contract_complete_count: ledger.tuws.filter((tuw) => tuw.verification_contract?.method && tuw.verification_contract?.evidence).length,
    finding_count: findings.length,
    p0_count: findings.filter((finding) => finding.severity === "P0").length,
    p1_count: findings.filter((finding) => finding.severity === "P1").length
  },
  boundary: {
    planning_authority_traceability_only: true,
    go_live_approved_by_this_audit: false,
    owner_deferrals_approved_by_this_audit: false,
    closed_cp_evidence_is_read_only: true,
    combined_package_is_planning_authority: true,
    workbook_launch_tuw_is_executable_ledger_authority: true
  },
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
  tuw_count: report.summary.tuw_count,
  tuw_markdown_coverage_count: report.summary.tuw_markdown_coverage_count,
  finding_count: report.summary.finding_count,
  p0_count: report.summary.p0_count,
  p1_count: report.summary.p1_count
}, null, 2));

if (verdict !== "PASS") {
  process.exit(1);
}
