#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const INTAKE_JSON_PATH = "docs/desktop/matter-desktop-production-go-live-decision-intake.json";
const INTAKE_MD_PATH = "docs/desktop/matter-desktop-production-go-live-decision-intake.md";
const OWNER_RECEIPT_PATH = "docs/desktop/matter-desktop-owner-approval-receipt-2026-06-30.json";
const OWNER_VALIDATION_PATH = "docs/desktop/matter-desktop-owner-approval-intake-validation.json";
const RELEASE_RECEIPT_PATH = "docs/desktop/matter-desktop-lcx-vltui-github-release-receipt-2026-06-30.json";
const POST_RELEASE_KICKOFF_PATH = "docs/desktop/matter-desktop-lcx-vltui-post-release-kickoff-2026-06-30.md";
const HRX_SMOKE_PATH = "docs/lazycodex/evidence/matter-web/artifacts/hrx-production-smoke-2026-06-30.json";
const LCX_SMOKE_PATH = "docs/lazycodex/evidence/matter-web/artifacts/lcx-vltui-production-smoke-2026-06-29.json";
const VALIDATION_JSON_PATH = "docs/desktop/matter-desktop-production-go-live-decision-validation.json";
const VALIDATION_MD_PATH = "docs/desktop/matter-desktop-production-go-live-decision-validation.md";

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
const REQUIRED_DECISION_FIELDS = [
  "decision_maker",
  "decision",
  "basis",
  "decision_at",
  "approval_signature_ref",
  "recorded_by_human"
];
const ALLOWED_DECISIONS = ["approve_production_go_live_receipt", "reject_production_go_live", "request_changes"];
const PLACEHOLDER_PATTERN = /<[^>]*>|\bTBD\b|\bTODO\b|placeholder|pending owner|pending approval/i;

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
    "# matter Desktop Production Go-Live Decision Validation",
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
  lines.push("- This validation prepares the production go-live decision lane only.");
  lines.push("- It does not approve production go-live.");
  lines.push("- It does not record actual launch/go-live completion.");
  lines.push("- It does not approve public release, Windows Authenticode signing, external pilot distribution, Vault document writes, or real client data migration.");
  return `${lines.join("\n")}\n`;
}

const findings = [];
for (const path of [
  INTAKE_JSON_PATH,
  INTAKE_MD_PATH,
  OWNER_RECEIPT_PATH,
  OWNER_VALIDATION_PATH,
  RELEASE_RECEIPT_PATH,
  POST_RELEASE_KICKOFF_PATH,
  HRX_SMOKE_PATH,
  LCX_SMOKE_PATH
]) {
  if (!existsSync(path)) addFinding(findings, "P1", "SOURCE_REF_MISSING", "Required source reference is missing.", { path });
}

const intake = existsSync(INTAKE_JSON_PATH) ? readJson(INTAKE_JSON_PATH) : {};
const intakeMarkdown = existsSync(INTAKE_MD_PATH) ? readText(INTAKE_MD_PATH) : "";
const ownerReceipt = existsSync(OWNER_RECEIPT_PATH) ? readJson(OWNER_RECEIPT_PATH) : {};
const ownerValidation = existsSync(OWNER_VALIDATION_PATH) ? readJson(OWNER_VALIDATION_PATH) : {};
const releaseReceipt = existsSync(RELEASE_RECEIPT_PATH) ? readJson(RELEASE_RECEIPT_PATH) : {};
const hrxSmoke = existsSync(HRX_SMOKE_PATH) ? readJson(HRX_SMOKE_PATH) : {};
const lcxSmoke = existsSync(LCX_SMOKE_PATH) ? readJson(LCX_SMOKE_PATH) : {};

if (intake.schema_version !== "law-firm-os.matter-desktop-production-go-live-decision-intake.v0.1") {
  addFinding(findings, "P1", "SCHEMA_VERSION", "Unexpected production go-live decision intake schema version.", {
    actual: intake.schema_version
  });
}
if (intake.status !== "pending_final_go_live_decision") {
  addFinding(findings, "P1", "INTAKE_STATUS", "Decision intake must remain pending until a real final go-live decision is supplied.", {
    actual: intake.status
  });
}
for (const [key, expected] of Object.entries(EXPECTED_RELEASE)) {
  if (intake.release?.[key] !== expected) {
    addFinding(findings, "P1", `RELEASE_${key}`, "Release field does not match the LCX VLTUI desktop release.", {
      expected,
      actual: intake.release?.[key]
    });
  }
}
for (const [key, expected] of Object.entries(EXPECTED_RUNTIME)) {
  if (intake.runtime_target?.[key] !== expected) {
    addFinding(findings, "P1", `RUNTIME_${key}`, "Runtime target field is missing or unexpected.", {
      expected,
      actual: intake.runtime_target?.[key]
    });
  }
}

if (ownerReceipt.status !== "owner_review_gate_approved" || ownerReceipt.scope?.allows_next_step_production_go_live_decision_validation !== true) {
  addFinding(findings, "P1", "OWNER_RECEIPT_NOT_READY", "Owner receipt must approve the owner review gate and next-step go-live decision validation.", {
    status: ownerReceipt.status,
    scope: ownerReceipt.scope
  });
}
if (ownerValidation.verdict !== "PASS" || ownerValidation.summary?.real_response_count !== 1) {
  addFinding(findings, "P1", "OWNER_VALIDATION_NOT_PASSING", "Owner approval intake validation must pass with exactly one real response.", {
    verdict: ownerValidation.verdict,
    summary: ownerValidation.summary
  });
}
if (releaseReceipt.non_claims?.production_go_live !== false || releaseReceipt.non_claims?.public_release !== false) {
  addFinding(findings, "P0", "RELEASE_NON_CLAIM_DRIFT", "Release receipt must keep production go-live and public release false.", {
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

const decisionRequest = intake.final_decision_request ?? {};
if (decisionRequest.response_status !== "pending_final_go_live_decision") {
  addFinding(findings, "P1", "DECISION_REQUEST_STATUS", "Final decision request must remain pending until a real decision is supplied.", {
    actual: decisionRequest.response_status
  });
}
for (const field of REQUIRED_DECISION_FIELDS) {
  if (!(decisionRequest.required_decision_fields ?? []).includes(field)) {
    addFinding(findings, "P1", "DECISION_FIELD_MISSING", "Final decision request is missing a required field.", { field });
  }
}
for (const decision of ALLOWED_DECISIONS) {
  if (!(decisionRequest.allowed_decisions ?? []).includes(decision)) {
    addFinding(findings, "P1", "ALLOWED_DECISION_MISSING", "Final decision request is missing an allowed decision.", { decision });
  }
}

const forbiddenBoundaryTrue = [
  "final_go_live_decision_recorded",
  "production_go_live_receipt_committed",
  "actual_launch_go_live_completed",
  "public_release_approved",
  "company_wide_production_go_live_approved",
  "windows_authenticode_signing_approved",
  "external_pilot_distribution_approved",
  "vault_document_writes_approved",
  "real_client_data_migration_approved"
].filter((key) => intake.boundary?.[key] !== false);
if (forbiddenBoundaryTrue.length > 0) {
  addFinding(findings, "P0", "BOUNDARY_NON_CLAIM_DRIFT", "Pending decision intake must keep execution and release claims false.", {
    fields: forbiddenBoundaryTrue
  });
}
if (intake.boundary?.owner_approval_gate_recorded !== true || intake.boundary?.ready_for_final_go_live_decision_input !== true) {
  addFinding(findings, "P1", "BOUNDARY_READY_STATE", "Decision intake must record owner gate complete and decision input readiness.", {
    boundary: intake.boundary
  });
}
if (PLACEHOLDER_PATTERN.test(intakeMarkdown)) {
  addFinding(findings, "P1", "MARKDOWN_PLACEHOLDER", "Decision intake markdown contains placeholder text.", {});
}
for (const phrase of ["Production go-live: false", "Actual launch/go-live completed: false", "Public release: false", "Windows Authenticode signing: false"]) {
  if (!intakeMarkdown.includes(phrase)) addFinding(findings, "P1", "MARKDOWN_BOUNDARY_MISSING", "Decision intake markdown is missing a boundary phrase.", { phrase });
}

const verdict = findings.some((finding) => finding.severity === "P0" || finding.severity === "P1") ? "FAIL" : "PASS";
const report = {
  schema_version: "law-firm-os.matter-desktop-production-go-live-decision.validation.v0.1",
  generated_at: "2026-06-30T00:56:14Z",
  source_refs: [
    INTAKE_JSON_PATH,
    INTAKE_MD_PATH,
    OWNER_RECEIPT_PATH,
    OWNER_VALIDATION_PATH,
    RELEASE_RECEIPT_PATH,
    HRX_SMOKE_PATH,
    LCX_SMOKE_PATH
  ],
  verdict,
  summary: {
    owner_approval_gate_recorded: intake.boundary?.owner_approval_gate_recorded === true,
    ready_for_final_go_live_decision_input: intake.boundary?.ready_for_final_go_live_decision_input === true,
    final_go_live_decision_recorded: intake.boundary?.final_go_live_decision_recorded === true,
    production_go_live_receipt_committed: intake.boundary?.production_go_live_receipt_committed === true,
    actual_launch_go_live_completed: intake.boundary?.actual_launch_go_live_completed === true,
    public_release_approved: intake.boundary?.public_release_approved === true,
    lcx_production_smoke_verdict: lcxSmoke.verdict ?? null,
    hrx_production_smoke_verdict: hrxSmoke.verdict ?? null,
    finding_count: findings.length
  },
  findings
};

mkdirSync(dirname(VALIDATION_JSON_PATH), { recursive: true });
writeFileSync(VALIDATION_JSON_PATH, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(VALIDATION_MD_PATH, renderMarkdown(report));

assert.equal(verdict, "PASS", "matter desktop production go-live decision validation failed");
console.log(JSON.stringify(report, null, 2));
