#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";

const detailedPlanPath = "docs/rp30-people-hr-evidence-detailed-microphases.json";
const requirementLedgerPath = "docs/hrx-requirement-ledger.json";
const outputJson = "docs/hrx-weighted-implementation-ledger.json";
const outputMd = "docs/hrx-weighted-implementation-ledger.md";

const baseSplitsByPhase = {
  P00: [1, 1, 2, 2, 2, 2, 3, 3, 3, 2, 2],
  P01: [5, 5, 5, 5, 5, 8, 5, 5, 5, 5, 5],
  P02: [13, 13, 13, 13, 12, 12, 12, 12, 12, 12, 12],
  P03: [5, 5, 5, 5, 5, 8, 5, 5, 5, 5, 5],
  P04: [9, 9, 9, 9, 9, 8, 9, 8, 8, 8, 9],
  P05: [9, 9, 9, 9, 9, 8, 9, 8, 8, 8, 9],
  P06: [13, 13, 13, 13, 12, 12, 12, 12, 12, 12, 12],
  P07: [13, 13, 13, 13, 12, 12, 12, 12, 12, 12, 12],
  P08: [9, 9, 9, 9, 9, 8, 9, 8, 8, 8, 9],
  P09: [5, 5, 5, 5, 5, 8, 5, 5, 5, 5, 10],
};
const supplementPhases = new Set(["P01", "P02", "P03", "P04", "P05", "P06"]);

function phaseId(entry) {
  return entry.phase_id.split(".").at(-1);
}

function weightFor(splitCount) {
  if (splitCount <= 2) return "L";
  if (splitCount <= 5) return "M";
  return "H";
}

function buildSubphases(entry, splitCount, requirements) {
  const refs = requirements.slice(0, Math.min(3, requirements.length)).map((req) => ({
    requirement_id: req.id,
    anchor_role: req.id.startsWith("HRX-GATE") ? "gate" : "primary",
  }));
  return Array.from({ length: splitCount }, (_, index) => ({
    id: `${entry.id}.S${String(index + 1).padStart(2, "0")}`,
    title: `${entry.micro_title} subphase ${index + 1}`,
    deliverable_type: entry.micro_id === "M05" ? "security_audit" : entry.phase_id.endsWith(".P09") ? "claude_review" : "implementation",
    source_micro_phase_id: entry.id,
    order: index + 1,
    completion_status_model: {
      allowed_statuses: ["planned", "in_progress", "production_ready"],
      minimum_closeout_status: "production_ready",
    },
    completion_gates: [
      { id: "implemented", status: "required", evidence: "implementation_refs" },
      { id: "tests", status: "required", evidence: "target_tests" },
      { id: "permission_audit", status: "required", evidence: "HR sensitive guard evidence" },
      { id: "hermes_validation", status: "required", evidence: "H30.weighted_subphase_evidence" },
      { id: "claude_cross_validation", status: "required", evidence: "C30.weighted_subphase_review" },
      { id: "human_approval", status: "required", evidence: "MAT-DEC-02 and MAT-DEC-06 records" },
      { id: "production_readiness", status: "required", evidence: "closeout pack manifest" },
    ],
    construction_inspection_required: true,
    construction_inspection_ref: "construction_inspection.v1",
    hermes_validation_required: true,
    hermes_validation_plan_ref: "H30.weighted_subphase_evidence",
    claude_cross_validation_required: true,
    claude_cross_validation_plan_ref: "C30.weighted_subphase_review",
    saas_hardening_overlay_ref: "RP30.hrx_embedded_overlay",
    critical_rp: true,
    requirement_refs: refs,
    objective: `${entry.objective} This HRX subphase keeps payroll runtime deferred, preserves User/Employee separation, uses synthetic data only, and binds sensitive HR evidence to permission and audit checks.`,
    estimated_hours: Math.max(1, Math.round(splitCount * 1.25)),
    acceptance: entry.acceptance,
    hrx_embedded: true,
  }));
}

const detailedPlan = JSON.parse(await readFile(detailedPlanPath, "utf8"));
const requirementLedger = JSON.parse(await readFile(requirementLedgerPath, "utf8"));
const entries = [];
const calibrationRows = [];
for (const entry of detailedPlan.entries) {
  const phase = phaseId(entry);
  const microIndex = Number(entry.micro_id.slice(1));
  const baseSplit = baseSplitsByPhase[phase][microIndex];
  const supplement = supplementPhases.has(phase) && entry.micro_id === "M05" ? 1 : 0;
  const splitCount = baseSplit + supplement;
  calibrationRows.push({ id: entry.id, phase, micro_id: entry.micro_id, base_split: baseSplit, supplement, final_split: splitCount });
  entries.push({
    source_micro_phase_id: entry.id,
    program_id: "RP30",
    program_title: detailedPlan.program_title,
    phase_id: entry.phase_id,
    phase_title: entry.phase_title,
    micro_id: entry.micro_id,
    micro_title: entry.micro_title,
    weight: weightFor(splitCount),
    split_count: splitCount,
    estimated_hours: splitCount * 1.25,
    commands: entry.commands,
    requirement_refs: requirementLedger.requirements.slice(0, 3).map((req) => ({ requirement_id: req.id, anchor_role: "primary" })),
    critical_rp: true,
    hrx_embedded: true,
    phase_construction_inspection: {
      required: true,
      process_name: "페이즈 준공검사",
      minimum_final_verdict: "PASS",
    },
    implementation_subphases: buildSubphases(entry, splitCount, requirementLedger.requirements),
  });
}

const baseTotal = calibrationRows.reduce((sum, row) => sum + row.base_split, 0);
const supplementTotal = calibrationRows.reduce((sum, row) => sum + row.supplement, 0);
const finalTotal = calibrationRows.reduce((sum, row) => sum + row.final_split, 0);
const ledger = {
  schema_version: "law-firm-os.hrx-weighted-implementation-ledger.v0.1",
  generated_from: "scripts/generate-hrx-weighted-ledger.mjs",
  source_detailed_plan_ref: detailedPlanPath,
  source_micro_phase_count: detailedPlan.entries.length,
  law_firm_os_units_unchanged: 54355,
  law_firm_os_requirement_count_unchanged: 227,
  expanded_total_units: 55256,
  hrx_implementation_subphase_count: finalTotal,
  hrx_calibration: {
    program_complexity: 2.2,
    high_risk: true,
    base_subphase_count: baseTotal,
    supplements_count: supplementTotal,
    supplements_rule: "P01-P06 M05 Permission And Audit Binding each +1 for HR sensitive guard reinforcement",
    final_subphase_count: finalTotal,
    phase_base_counts: Object.fromEntries(Object.entries(baseSplitsByPhase).map(([phase, splits]) => [phase, splits.reduce((a, b) => a + b, 0)])),
  },
  hrx_internal_completion_formula: ["hrx_subphase_901_all_production_ready", "hrx_requirements_all_covered", "H30_all_passed", "C30_all_passed"],
  entries,
};

function markdownFor() {
  const lines = [
    "# HRX Weighted Implementation Ledger",
    "",
    `HRX units: ${ledger.hrx_implementation_subphase_count}`,
    `Calibration: base ${baseTotal} + supplements ${supplementTotal} = ${finalTotal}`,
    "",
    "| phase | base | supplements | final |",
    "|---|---:|---:|---:|",
  ];
  for (const phase of Object.keys(baseSplitsByPhase)) {
    const rows = calibrationRows.filter((row) => row.phase === phase);
    lines.push(`| ${phase} | ${rows.reduce((s, r) => s + r.base_split, 0)} | ${rows.reduce((s, r) => s + r.supplement, 0)} | ${rows.reduce((s, r) => s + r.final_split, 0)} |`);
  }
  return `${lines.join("\n")}\n`;
}

await mkdir("docs", { recursive: true });
await writeFile(outputJson, `${JSON.stringify(ledger, null, 2)}\n`);
await writeFile(outputMd, markdownFor());
console.log(`Generated HRX weighted ledger: ${finalTotal}`);
