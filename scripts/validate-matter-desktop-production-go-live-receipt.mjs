#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const RECEIPT_JSON_PATH = "docs/desktop/matter-desktop-production-go-live-receipt-2026-06-30.json";
const RECEIPT_MD_PATH = "docs/desktop/matter-desktop-production-go-live-receipt-2026-06-30.md";
const OWNER_RECEIPT_PATH = "docs/desktop/matter-desktop-owner-approval-receipt-2026-06-30.json";
const DECISION_INTAKE_PATH = "docs/desktop/matter-desktop-production-go-live-decision-intake.json";
const DECISION_VALIDATION_PATH = "docs/desktop/matter-desktop-production-go-live-decision-validation.json";
const RELEASE_RECEIPT_PATH = "docs/desktop/matter-desktop-lcx-vltui-github-release-receipt-2026-06-30.json";
const HRX_SMOKE_PATH = "docs/lazycodex/evidence/matter-web/artifacts/hrx-production-smoke-2026-06-30.json";
const LCX_SMOKE_PATH = "docs/lazycodex/evidence/matter-web/artifacts/lcx-vltui-production-smoke-2026-06-29.json";
const LAZYCODEX_RECEIPT_PATH = "docs/lazycodex/evidence/matter-web/artifacts/lcx-vltui-production-go-live-receipt-2026-06-30.json";
const VALIDATION_JSON_PATH = "docs/desktop/matter-desktop-production-go-live-receipt-validation.json";
const VALIDATION_MD_PATH = "docs/desktop/matter-desktop-production-go-live-receipt-validation.md";

const EXPECTED_RELEASE = {
  tag: "matter-desktop-v0.1.0-lcx-vltui-20260630",
  url: "https://github.com/Gonyak-cell/law-firm-os/releases/tag/matter-desktop-v0.1.0-lcx-vltui-20260630",
  target_commitish: "ef493451a1d070412d3d24d4474493afbca3f1a4",
  release_channel: "github_prerelease_lcx_vltui_desktop"
};
const EXPECTED_RUNTIME = {
  production_web_base_url: "https://d2mthcc8vp3cr2.cloudfront.net",
  production_api_lambda: "matter-lawos-api-prod",
  deployment_commit: "0ff79586d887a950200ab091a5864a20c174bdf9"
};
const EXPECTED_SIGNATURE_REF = "approval:lcx-vltui-desktop-production-go-live-chat-receipt-2026-06-30-1015-kst";
const PLACEHOLDER_PATTERN = /<[^>]*>|\bTBD\b|\bTODO\b|placeholder|pending owner|pending approval/i;
const AGENT_INFERENCE_PATTERN = /agent-inferred|codex-approved|codex approval|synthetic approval|simulated owner/i;
const UTC_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

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

function renderMarkdown(report) {
  const lines = [
    "# matter Desktop Production Go-Live Receipt Validation",
    "",
    `Generated at: ${report.generated_at}`,
    "",
    `Verdict: ${report.verdict}`,
    "",
    "## Summary",
    ""
  ];
  for (const [key, value] of Object.entries(report.summary)) lines.push(`- ${key}: ${value}`);
  lines.push("", "## Findings", "");
  if (report.findings.length === 0) {
    lines.push("No findings.");
  } else {
    lines.push("| Severity | Code | Message |");
    lines.push("| --- | --- | --- |");
    for (const finding of report.findings) {
      lines.push(`| ${finding.severity} | ${finding.code} | ${markdownCell(finding.message)} |`);
    }
  }
  lines.push("", "## Boundary", "");
  lines.push("- This validation records the LCX VLTUI desktop prerelease lane go-live receipt only.");
  lines.push("- It does not approve public release.");
  lines.push("- It does not approve company-wide production rollout.");
  lines.push("- It does not approve Windows Authenticode signing, external pilot distribution, Vault document writes, or real client data migration.");
  return `${lines.join("\n")}\n`;
}

const findings = [];
for (const path of [
  RECEIPT_JSON_PATH,
  RECEIPT_MD_PATH,
  OWNER_RECEIPT_PATH,
  DECISION_INTAKE_PATH,
  DECISION_VALIDATION_PATH,
  RELEASE_RECEIPT_PATH,
  HRX_SMOKE_PATH,
  LCX_SMOKE_PATH,
  LAZYCODEX_RECEIPT_PATH
]) {
  if (!existsSync(path)) addFinding(findings, "P1", "SOURCE_REF_MISSING", "Required production go-live source reference is missing.", { path });
}

const receipt = existsSync(RECEIPT_JSON_PATH) ? readJson(RECEIPT_JSON_PATH) : {};
const receiptMarkdown = existsSync(RECEIPT_MD_PATH) ? readText(RECEIPT_MD_PATH) : "";
const ownerReceipt = existsSync(OWNER_RECEIPT_PATH) ? readJson(OWNER_RECEIPT_PATH) : {};
const decisionIntake = existsSync(DECISION_INTAKE_PATH) ? readJson(DECISION_INTAKE_PATH) : {};
const decisionValidation = existsSync(DECISION_VALIDATION_PATH) ? readJson(DECISION_VALIDATION_PATH) : {};
const releaseReceipt = existsSync(RELEASE_RECEIPT_PATH) ? readJson(RELEASE_RECEIPT_PATH) : {};
const hrxSmoke = existsSync(HRX_SMOKE_PATH) ? readJson(HRX_SMOKE_PATH) : {};
const lcxSmoke = existsSync(LCX_SMOKE_PATH) ? readJson(LCX_SMOKE_PATH) : {};
const lazycodexReceipt = existsSync(LAZYCODEX_RECEIPT_PATH) ? readJson(LAZYCODEX_RECEIPT_PATH) : {};
const decision = receipt.decision ?? {};

if (receipt.schema_version !== "law-firm-os.matter-desktop-production-go-live-receipt.v0.1") {
  addFinding(findings, "P1", "SCHEMA_VERSION", "Unexpected production go-live receipt schema version.", {
    actual: receipt.schema_version
  });
}
if (receipt.status !== "production_go_live_receipt_committed") {
  addFinding(findings, "P1", "RECEIPT_STATUS", "Production go-live receipt must be committed.", {
    actual: receipt.status
  });
}

for (const field of ["recorded_at", "decision_at"]) {
  const value = field === "recorded_at" ? receipt.recorded_at : decision.decision_at;
  if (!UTC_PATTERN.test(String(value ?? ""))) {
    addFinding(findings, "P1", "TIMESTAMP_FORMAT", "Receipt timestamps must be UTC Zulu time.", { field, value });
  }
}

for (const [key, expected] of Object.entries(EXPECTED_RELEASE)) {
  if (receipt.release?.[key] !== expected) {
    addFinding(findings, "P1", `RELEASE_${key}`, "Release field does not match the LCX VLTUI desktop release.", {
      expected,
      actual: receipt.release?.[key]
    });
  }
}
for (const [key, expected] of Object.entries(EXPECTED_RUNTIME)) {
  if (receipt.runtime_target?.[key] !== expected) {
    addFinding(findings, "P1", `RUNTIME_${key}`, "Runtime target field is missing or unexpected.", {
      expected,
      actual: receipt.runtime_target?.[key]
    });
  }
}

const requiredDecisionValues = {
  decision_maker: "Jiwon Suh, Product Owner",
  reviewed_release: EXPECTED_RELEASE.tag,
  release_url: EXPECTED_RELEASE.url,
  decision: "approve_production_go_live_receipt",
  approval_signature_ref: EXPECTED_SIGNATURE_REF
};
for (const [key, expected] of Object.entries(requiredDecisionValues)) {
  if (decision[key] !== expected) {
    addFinding(findings, "P1", `DECISION_${key}`, "Decision field does not match the owner-supplied go-live decision.", {
      expected,
      actual: decision[key]
    });
  }
}
for (const [key, value] of Object.entries(decision)) {
  if (PLACEHOLDER_PATTERN.test(String(value ?? ""))) {
    addFinding(findings, "P1", "PLACEHOLDER_DECISION_FIELD", "Decision field contains placeholder text.", { key });
  }
  if (AGENT_INFERENCE_PATTERN.test(String(value ?? ""))) {
    addFinding(findings, "P0", "AGENT_INFERRED_DECISION", "Decision field appears to rely on agent-inferred approval evidence.", { key });
  }
}
if (receipt.source?.source_ref !== EXPECTED_SIGNATURE_REF || receipt.source?.recorded_by_human !== true || decision.recorded_by_human !== true) {
  addFinding(findings, "P1", "SOURCE_REF", "Receipt must preserve the human owner chat approval source reference.", {
    source: receipt.source,
    decision_recorded_by_human: decision.recorded_by_human
  });
}

if (ownerReceipt.status !== "owner_review_gate_approved" || ownerReceipt.scope?.allows_next_step_production_go_live_decision_validation !== true) {
  addFinding(findings, "P1", "OWNER_RECEIPT_NOT_READY", "Owner receipt must approve the owner review gate and next-step go-live decision validation.", {
    status: ownerReceipt.status,
    scope: ownerReceipt.scope
  });
}
if (decisionIntake.status !== "pending_final_go_live_decision" || decisionIntake.boundary?.ready_for_final_go_live_decision_input !== true) {
  addFinding(findings, "P1", "DECISION_INTAKE_NOT_READY", "Decision intake must prove readiness for final go-live decision input.", {
    status: decisionIntake.status,
    boundary: decisionIntake.boundary
  });
}
if (decisionValidation.verdict !== "PASS" || decisionValidation.summary?.ready_for_final_go_live_decision_input !== true) {
  addFinding(findings, "P1", "DECISION_VALIDATION_NOT_PASSING", "Decision intake validator must pass before committing the go-live receipt.", {
    verdict: decisionValidation.verdict,
    summary: decisionValidation.summary
  });
}
if (releaseReceipt.non_claims?.public_release !== false) {
  addFinding(findings, "P0", "RELEASE_PUBLIC_CLAIM_DRIFT", "Release receipt must keep public release false.", {
    non_claims: releaseReceipt.non_claims
  });
}
if (hrxSmoke.verdict !== "PASS" || hrxSmoke.hrx_source_ref_counts?.["hrx-member-roster-source-of-truth"] !== 9) {
  addFinding(findings, "P1", "HRX_SMOKE_NOT_PASSING", "HRX production smoke must pass with roster source-of-truth rows.", {
    verdict: hrxSmoke.verdict,
    source_ref_counts: hrxSmoke.hrx_source_ref_counts
  });
}
if (lcxSmoke.verdict !== "PASS" || lcxSmoke.boundary?.real_client_data_used !== false || lcxSmoke.boundary?.company_wide_go_live_claim !== false) {
  addFinding(findings, "P1", "LCX_SMOKE_BOUNDARY", "LCX production smoke must pass while preserving non-claims.", {
    verdict: lcxSmoke.verdict,
    boundary: lcxSmoke.boundary
  });
}

const expectedTrue = [
  "approves_lcx_vltui_desktop_prerelease_lane_go_live_receipt",
  "approves_named_lane_runtime_go_live"
];
for (const key of expectedTrue) {
  if (receipt.scope?.[key] !== true) addFinding(findings, "P1", "SCOPE_TRUE_MISSING", "Receipt is missing a required approved named-lane scope.", { key });
  if (lazycodexReceipt.scope?.[key] !== true) addFinding(findings, "P1", "LAZYCODEX_SCOPE_TRUE_MISSING", "LazyCodex receipt is missing a required approved named-lane scope.", { key });
}
for (const key of [
  "public_release_approved",
  "company_wide_production_go_live_approved",
  "windows_authenticode_signing_approved",
  "external_pilot_distribution_approved",
  "vault_document_writes_approved",
  "real_client_data_migration_approved"
]) {
  if (receipt.scope?.[key] !== false || receipt.boundary?.[key] !== false || lazycodexReceipt.scope?.[key] !== false) {
    addFinding(findings, "P0", "BOUNDARY_FALSE_DRIFT", "Receipt must keep out-of-scope approvals false.", {
      key,
      scope: receipt.scope?.[key],
      boundary: receipt.boundary?.[key],
      lazycodex: lazycodexReceipt.scope?.[key]
    });
  }
}
for (const [key, expected] of Object.entries({
  final_go_live_decision_recorded: true,
  production_go_live_receipt_committed: true,
  actual_launch_go_live_completed_for_lcx_vltui_desktop_prerelease_lane: true,
  actual_launch_go_live_completed_for_company_wide_rollout: false
})) {
  if (receipt.boundary?.[key] !== expected) {
    addFinding(findings, "P1", `BOUNDARY_${key}`, "Production go-live receipt boundary field drifted.", {
      expected,
      actual: receipt.boundary?.[key]
    });
  }
}

if (PLACEHOLDER_PATTERN.test(receiptMarkdown)) {
  addFinding(findings, "P1", "MARKDOWN_PLACEHOLDER", "Production go-live receipt markdown contains placeholder text.", {});
}
for (const phrase of ["Status: production-go-live-receipt-committed", "Public release: false", "Company-wide production rollout: false", "Windows Authenticode signing: false"]) {
  if (!receiptMarkdown.includes(phrase)) addFinding(findings, "P1", "MARKDOWN_BOUNDARY_MISSING", "Receipt markdown is missing a required boundary phrase.", { phrase });
}

const verdict = findings.some((finding) => finding.severity === "P0" || finding.severity === "P1") ? "FAIL" : "PASS";
const report = {
  schema_version: "law-firm-os.matter-desktop-production-go-live-receipt.validation.v0.1",
  generated_at: "2026-06-30T01:15:20Z",
  source_refs: [
    RECEIPT_JSON_PATH,
    RECEIPT_MD_PATH,
    OWNER_RECEIPT_PATH,
    DECISION_INTAKE_PATH,
    DECISION_VALIDATION_PATH,
    RELEASE_RECEIPT_PATH,
    HRX_SMOKE_PATH,
    LCX_SMOKE_PATH,
    LAZYCODEX_RECEIPT_PATH
  ],
  verdict,
  summary: {
    final_go_live_decision_recorded: receipt.boundary?.final_go_live_decision_recorded === true,
    production_go_live_receipt_committed: receipt.boundary?.production_go_live_receipt_committed === true,
    named_lane_runtime_go_live: receipt.scope?.approves_named_lane_runtime_go_live === true,
    public_release_approved: receipt.scope?.public_release_approved === true,
    company_wide_production_go_live_approved: receipt.scope?.company_wide_production_go_live_approved === true,
    windows_authenticode_signing_approved: receipt.scope?.windows_authenticode_signing_approved === true,
    lcx_production_smoke_verdict: lcxSmoke.verdict ?? null,
    hrx_production_smoke_verdict: hrxSmoke.verdict ?? null,
    finding_count: findings.length
  },
  findings
};

mkdirSync(dirname(VALIDATION_JSON_PATH), { recursive: true });
writeFileSync(VALIDATION_JSON_PATH, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(VALIDATION_MD_PATH, renderMarkdown(report));

assert.equal(verdict, "PASS", "matter desktop production go-live receipt validation failed");
console.log(JSON.stringify(report, null, 2));
