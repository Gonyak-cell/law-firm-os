#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const PREP_PATH = "docs/launch/g1-completion-remediation-prep-2026-06-19.json";
const ADJUDICATION_PATH = "docs/launch/g1-hardening-adjudication-2026-06-19.json";
const CANDIDATES_PATH = "docs/launch/g1-hardening-evidence-candidates-2026-06-19.json";
const MANUAL_INTAKE_PATH = "docs/launch/launch-manual-evidence-intake-register.json";
const RECEIPT_JSON_PATH = "docs/launch/g1-e03-evidence-satisfaction-2026-06-19.json";
const RECEIPT_MD_PATH = "docs/launch/g1-e03-evidence-satisfaction-2026-06-19.md";
const RECORDED_AT = "2026-06-19T12:30:00Z";
const VERIFIER = "Codex repo-local validation suite";

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function renderMarkdown(receipt) {
  const lines = [];
  lines.push("# G1-E03 Evidence Satisfaction Receipt");
  lines.push("");
  lines.push(`Recorded at: ${receipt.recorded_at}`);
  lines.push("");
  lines.push(`Verifier: ${receipt.verifier}`);
  lines.push("");
  lines.push("## Evidence");
  lines.push("");
  lines.push("| Check | Value |");
  lines.push("| --- | ---: |");
  lines.push(`| hardening required cell count | ${receipt.measured_state.hardening_required_cell_count} |`);
  lines.push(`| evidence satisfied cell count | ${receipt.measured_state.evidence_satisfied_cell_count} |`);
  lines.push(`| pending gap disposition count | ${receipt.measured_state.pending_gap_disposition_count} |`);
  lines.push(`| G1-E03 closeable now | ${receipt.measured_state.g1_e03_closeable_now} |`);
  lines.push("");
  lines.push("Source evidence:");
  lines.push("");
  for (const ref of receipt.evidence_refs) {
    lines.push(`- \`${ref}\``);
  }
  lines.push("");
  lines.push("## Boundary");
  lines.push("");
  lines.push("This receipt satisfies `G1-E03` only. It does not approve go-live, does not approve owner deferrals, and does not open runtime.");
  return `${lines.join("\n")}\n`;
}

const prep = readJson(PREP_PATH);
const adjudication = readJson(ADJUDICATION_PATH);
const manualIntake = readJson(MANUAL_INTAKE_PATH);

if (prep.summary?.g1_e03_closeable_now !== true) {
  throw new Error("G1-E03 is not closeable in the remediation prep artifact.");
}

if (adjudication.summary?.g1_e03_closeable_now !== true || adjudication.summary?.pending_gap_disposition_count !== 0) {
  throw new Error("G1-E03 adjudication is not complete.");
}

const intakeRow = (manualIntake.gate_intake ?? []).find((row) => row.intake_id === "GL-G1-G1-E03");

const receipt = {
  schema_version: "law-firm-os.g1-e03-evidence-satisfaction.v0.1",
  recorded_at: RECORDED_AT,
  verifier: VERIFIER,
  intake_id: "GL-G1-G1-E03",
  acceptance_id: "ACC-GL-G1-G1-E03",
  gate_id: "G1",
  evidence_id: "G1-E03",
  required_state: "all_missing_cells_adjudicated_or_zero",
  status: "evidence_satisfied",
  evidence_refs: [
    PREP_PATH,
    ADJUDICATION_PATH,
    CANDIDATES_PATH,
    "docs/launch/launch-manual-evidence-intake-register.json",
    "docs/launch/launch-evidence-acceptance-matrix.json"
  ],
  measured_state: {
    hardening_required_cell_count: prep.summary.hardening_required_cell_count,
    evidence_satisfied_cell_count: adjudication.summary.evidence_satisfied_cell_count,
    pending_gap_disposition_count: adjudication.summary.pending_gap_disposition_count,
    g1_e03_closeable_now: adjudication.summary.g1_e03_closeable_now
  },
  boundary: {
    go_live_approved_by_this_receipt: false,
    owner_deferral_approved_by_this_receipt: false,
    runtime_opened_by_this_receipt: false
  }
};

if (intakeRow) {
  Object.assign(intakeRow, {
    intake_status: "evidence_satisfied",
    evidence_ref: RECEIPT_JSON_PATH,
    evidence_recorded_at: RECORDED_AT,
    verifier: VERIFIER,
    decision_register_id: "",
    owner_role_name: "",
    deferral_basis: "",
    target_date_or_revisit_gate: "",
    approval_signature_ref: ""
  });
}

writeJson(RECEIPT_JSON_PATH, receipt);
writeFileSync(RECEIPT_MD_PATH, renderMarkdown(receipt));
if (intakeRow) writeJson(MANUAL_INTAKE_PATH, manualIntake);

console.log(JSON.stringify({
  receipt_json: RECEIPT_JSON_PATH,
  receipt_markdown: RECEIPT_MD_PATH,
  manual_intake: MANUAL_INTAKE_PATH,
  manual_intake_row_present: Boolean(intakeRow),
  intake_id: receipt.intake_id,
  status: receipt.status,
  evidence_satisfied_cell_count: receipt.measured_state.evidence_satisfied_cell_count,
  pending_gap_disposition_count: receipt.measured_state.pending_gap_disposition_count,
  g1_e03_closeable_now: receipt.measured_state.g1_e03_closeable_now
}, null, 2));
