#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const CONTRACT_PATH = "contracts/runtime-readiness-contract.json";
const LEDGER_PATH = "docs/closeout-pack-plan/implementation-layer-ledger.json";
const VALIDATOR_PATH = "scripts/validate-runtime-readiness.mjs";
const REPORT_JSON_PATH = "docs/launch/g2-runtime-readiness-blocker-2026-06-19.json";
const REPORT_MD_PATH = "docs/launch/g2-runtime-readiness-blocker-2026-06-19.md";

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function countBy(values) {
  return values.reduce((counts, value) => {
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

function markdownCell(value) {
  return String(value ?? "").replaceAll("|", "\\|").replace(/\s+/g, " ").trim();
}

function renderMarkdown(report) {
  const lines = [];
  lines.push("# G2 Runtime Readiness Blocker Audit");
  lines.push("");
  lines.push(`Generated on: ${report.generated_on}`);
  lines.push("");
  lines.push(`Status: ${report.status}`);
  lines.push("");
  lines.push(`Verdict: ${report.verdict}`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  for (const [key, value] of Object.entries(report.summary)) {
    lines.push(`- ${key}: ${value}`);
  }
  lines.push("");
  lines.push("## Evidence Slots");
  lines.push("");
  lines.push("| Evidence | Required state | Status | Basis |");
  lines.push("| --- | --- | --- | --- |");
  for (const slot of report.evidence_slots) {
    lines.push(`| ${slot.evidence_id} | ${slot.required_state} | ${slot.status} | ${markdownCell(slot.basis)} |`);
  }
  lines.push("");
  lines.push("## Layer Counts");
  lines.push("");
  lines.push("| Implementation layer | Pack count |");
  lines.push("| --- | ---: |");
  for (const [layer, count] of Object.entries(report.ledger.implementation_layer_counts)) {
    lines.push(`| ${layer} | ${count} |`);
  }
  lines.push("");
  lines.push("## Boundary");
  lines.push("");
  lines.push("- This audit does not approve go-live.");
  lines.push("- This audit does not satisfy G2.");
  lines.push("- A validator PASS with zero runtime targets is not valid runtime evidence.");
  lines.push("- G2 can move only after real runtime or mixed target packs and RTG-001 through RTG-005 evidence exist.");
  return `${lines.join("\n")}\n`;
}

const contract = readJson(CONTRACT_PATH);
const ledger = readJson(LEDGER_PATH);
const packs = ledger.packs ?? [];
const implementationLayerStartPackNumber = contract.implementation_layer_start_pack_number;
const candidatePacks = packs.filter((pack) => pack.pack_number >= implementationLayerStartPackNumber);
const runtimeTargetPacks = candidatePacks.filter((pack) => ["runtime", "mixed"].includes(pack.implementation_layer));
const rtgGateIds = (contract.rtg_gates ?? []).map((gate) => gate.id);

const report = {
  schema_version: "law-firm-os.g2-runtime-readiness-blocker-audit.v0.1",
  generated_on: "2026-06-19",
  status: runtimeTargetPacks.length > 0 ? "blocked_pending_runtime_target_evidence" : "blocked_pending_runtime_targets",
  verdict: "FAIL",
  source_refs: [
    CONTRACT_PATH,
    LEDGER_PATH,
    VALIDATOR_PATH
  ],
  summary: {
    implementation_layer_start_pack_number: implementationLayerStartPackNumber,
    total_pack_count: packs.length,
    candidate_pack_count_at_or_after_start: candidatePacks.length,
    runtime_or_mixed_target_pack_count: runtimeTargetPacks.length,
    descriptor_pack_count_at_or_after_start: candidatePacks.filter((pack) => pack.implementation_layer === "descriptor").length,
    rtg_gate_count: rtgGateIds.length,
    rtg_gate_ids: rtgGateIds.join(", "),
    g2_e01_satisfied: false,
    g2_e02_satisfied: false,
    g2_e03_satisfied: false
  },
  ledger: {
    implementation_layer_counts: countBy(packs.map((pack) => pack.implementation_layer ?? "missing")),
    runtime_target_pack_ids: runtimeTargetPacks.map((pack) => pack.pack_id)
  },
  evidence_slots: [
    {
      evidence_id: "G2-E01",
      required_state: "approved_wave1_runtime_ready_completeness_rule_satisfied",
      status: "blocked_pending_runtime_targets",
      basis: `The implementation layer ledger has ${candidatePacks.length} packs at or after pack ${implementationLayerStartPackNumber}, but ${runtimeTargetPacks.length} are runtime or mixed.`
    },
    {
      evidence_id: "G2-E02",
      required_state: "all_tests_pass_with_timestamp",
      status: "blocked_empty_runtime_validation_scope",
      basis: `${VALIDATOR_PATH} must fail when runtime target count is zero; a zero-target PASS is not timestamped runtime integration evidence.`
    },
    {
      evidence_id: "G2-E03",
      required_state: "all_links_resolve",
      status: "blocked_pending_rtg_target_links",
      basis: `RTG gates ${rtgGateIds.join(", ")} require runtime target evidence links; no runtime target pack is available to carry those links.`
    }
  ],
  boundary: {
    go_live_approved_by_this_audit: false,
    g2_satisfied_by_this_audit: false,
    owner_deferrals_approved_by_this_audit: false,
    runtime_opened_by_this_audit: false
  }
};

mkdirSync(dirname(REPORT_JSON_PATH), { recursive: true });
writeFileSync(REPORT_JSON_PATH, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(REPORT_MD_PATH, renderMarkdown(report));

console.log(JSON.stringify({
  report_json: REPORT_JSON_PATH,
  report_markdown: REPORT_MD_PATH,
  status: report.status,
  verdict: report.verdict,
  runtime_or_mixed_target_pack_count: report.summary.runtime_or_mixed_target_pack_count,
  g2_evidence_satisfied: false
}, null, 2));
