#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const INTAKE_JSON_PATH = "docs/desktop/matter-desktop-owner-approval-intake.json";
const INTAKE_MD_PATH = "docs/desktop/matter-desktop-owner-approval-intake.md";
const RELEASE_RECEIPT_PATH = "docs/desktop/matter-desktop-lcx-vltui-github-release-receipt-2026-06-30.json";
const POST_RELEASE_KICKOFF_PATH = "docs/desktop/matter-desktop-lcx-vltui-post-release-kickoff-2026-06-30.md";
const OWNER_PACKET_PATH = "docs/desktop/matter-desktop-owner-decision-packet.md";
const OWNER_APPROVAL_RECEIPT_PATH = "docs/desktop/matter-desktop-owner-approval-receipt-2026-06-30.json";
const VALIDATION_JSON_PATH = "docs/desktop/matter-desktop-owner-approval-intake-validation.json";
const VALIDATION_MD_PATH = "docs/desktop/matter-desktop-owner-approval-intake-validation.md";

const EXPECTED_RELEASE = {
  tag: "matter-desktop-v0.1.0-lcx-vltui-20260630",
  url: "https://github.com/Gonyak-cell/law-firm-os/releases/tag/matter-desktop-v0.1.0-lcx-vltui-20260630",
  target_commitish: "ef493451a1d070412d3d24d4474493afbca3f1a4",
  merge_pr: "https://github.com/Gonyak-cell/law-firm-os/pull/143",
  merge_commit: "f5e34f1e06528d774b6afc7dabbc92da3214d3c1"
};
const REQUIRED_OWNER_RESPONSE_FIELDS = [
  "owner",
  "decision",
  "reviewed_artifact",
  "release_url",
  "artifact_digest",
  "basis",
  "decision_at",
  "approval_signature_ref",
  "recorded_by_human"
];
const REQUIRED_BOUNDARY = {
  owner_approval_intake_template_only: true,
  owner_approved_by_this_file: false,
  public_release_approved_by_this_file: false,
  production_go_live_approved_by_this_file: false,
  external_pilot_approved_by_this_file: false,
  windows_authenticode_approved_by_this_file: false,
  pending_entries_count_as_owner_evidence: false,
  agent_inferred_evidence_allowed: false,
  go_live_receipt_modified_by_this_file: false,
  release_asset_mutation_allowed_by_this_file: false
};
const REQUIRED_MARKDOWN_PHRASES = [
  "owner approval intake template only",
  "does not approve go-live",
  "does not approve public release",
  "does not approve an external pilot",
  "does not approve Windows Authenticode signing",
  "Pending response entries do not count as owner evidence",
  "Agent-inferred approval evidence is not allowed",
  "Public release: false",
  "Production go-live: false",
  "Owner final approval: false",
  "Windows Authenticode signing: false"
];
const REQUIRED_REVIEW_ARTIFACTS = [
  "matter-0.1.0-macos.dmg",
  "matter-0.1.0-macos.zip",
  "release-manifest.json",
  "checksums.sha256",
  "matter-desktop-formal-release-receipt.md",
  "desktop-screen-qa-result.json",
  "desktop-screen-qa.png"
];
const ALLOWED_DECISIONS = [
  "approve_supervised_pilot",
  "approve_public_release_planning",
  "reject_public_release_planning",
  "request_changes"
];
const PLACEHOLDER_PATTERN = /<[^>]*>|REQUIRED|TBD|TODO|placeholder|pending owner|pending approval/i;
const AGENT_INFERENCE_PATTERN = /agent-inferred|codex-approved|codex approval|synthetic approval|simulated owner/i;
const DECISION_AT_PATTERN = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}Z)?$/;
const EXTERNAL_SIGNATURE_REF_PATTERN =
  /^(external|signature|approval|email|ticket|meeting):[A-Za-z0-9][A-Za-z0-9 _./:@#-]{7,}$/i;

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function readText(path) {
  return readFileSync(path, "utf8");
}

function addFinding(findings, severity, code, message, details = {}) {
  findings.push({ severity, code, message, details });
}

function unique(values) {
  return [...new Set(values)].sort();
}

function sameSet(left, right) {
  return JSON.stringify(unique(left ?? [])) === JSON.stringify(unique(right ?? []));
}

function markdownCell(value) {
  return String(value ?? "").replaceAll("|", "\\|").replace(/\s+/g, " ").trim();
}

function signatureRefState(value) {
  const signature = String(value ?? "").trim();
  if (!signature || PLACEHOLDER_PATTERN.test(signature)) return "missing_or_placeholder";
  if (signature.startsWith("docs/")) return existsSync(signature) ? "local_ref_resolves" : "local_ref_missing";
  if (EXTERNAL_SIGNATURE_REF_PATTERN.test(signature)) return "external_ref_declared";
  return "unclassified_ref";
}

function digestMatchesAsset(digest, releaseReceipt) {
  const normalized = String(digest ?? "").trim();
  if (!normalized.startsWith("sha256:")) return false;
  return (releaseReceipt.assets ?? []).some((asset) => asset.digest === normalized);
}

function artifactExists(name, releaseReceipt) {
  return (releaseReceipt.assets ?? []).some((asset) => asset.name === name && asset.state === "uploaded");
}

function renderMarkdown(report) {
  const lines = [];
  lines.push("# matter Desktop Owner Approval Intake Validation");
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
  lines.push("- This validation checks the desktop owner approval intake only.");
  lines.push("- It does not approve go-live.");
  lines.push("- It does not approve public release.");
  lines.push("- It does not approve an external pilot.");
  lines.push("- It does not approve Windows Authenticode signing.");
  lines.push("- Pending response entries do not count as owner evidence.");
  lines.push("- Agent-inferred approval evidence is not allowed.");
  return `${lines.join("\n")}\n`;
}

const intake = readJson(INTAKE_JSON_PATH);
const intakeMarkdown = readText(INTAKE_MD_PATH);
const releaseReceipt = readJson(RELEASE_RECEIPT_PATH);
const postReleaseKickoff = readText(POST_RELEASE_KICKOFF_PATH);
const ownerPacket = readText(OWNER_PACKET_PATH);
const existingValidation = existsSync(VALIDATION_JSON_PATH) ? readJson(VALIDATION_JSON_PATH) : null;
const findings = [];

if (intake.schema_version !== "law-firm-os.matter-desktop-owner-approval-intake.v0.1") {
  addFinding(findings, "P1", "SCHEMA_VERSION", "Unexpected desktop owner approval intake schema version.", {
    actual: intake.schema_version
  });
}

for (const [key, expected] of Object.entries(EXPECTED_RELEASE)) {
  if (intake.release?.[key] !== expected) {
    addFinding(findings, "P1", `RELEASE_${key}`, `Release field ${key} does not match the LCX VLTUI desktop release.`, {
      expected,
      actual: intake.release?.[key]
    });
  }
}
if (intake.release?.is_prerelease !== true) {
  addFinding(findings, "P0", "RELEASE_PRERELEASE_BOUNDARY", "Owner approval intake must start from the GitHub prerelease boundary.", {
    actual: intake.release?.is_prerelease
  });
}
if (releaseReceipt.release?.tag !== EXPECTED_RELEASE.tag || releaseReceipt.release?.url !== EXPECTED_RELEASE.url) {
  addFinding(findings, "P1", "RELEASE_RECEIPT_MISMATCH", "GitHub release receipt does not match intake release.", {
    receipt_release: releaseReceipt.release
  });
}
if (releaseReceipt.non_claims?.owner_final_approval !== false || releaseReceipt.non_claims?.production_go_live !== false) {
  addFinding(findings, "P0", "RELEASE_RECEIPT_NON_CLAIM_DRIFT", "GitHub release receipt must keep owner approval and production go-live false.", {
    non_claims: releaseReceipt.non_claims
  });
}

for (const [key, expected] of Object.entries(REQUIRED_BOUNDARY)) {
  if (intake.boundary?.[key] !== expected) {
    addFinding(findings, "P0", `BOUNDARY_${key}`, `Boundary field ${key} drifted.`, {
      expected,
      actual: intake.boundary?.[key]
    });
  }
}

if (!sameSet(intake.required_owner_response_fields, REQUIRED_OWNER_RESPONSE_FIELDS)) {
  addFinding(findings, "P1", "REQUIRED_FIELDS_MISMATCH", "Required owner response fields drifted.", {
    expected: REQUIRED_OWNER_RESPONSE_FIELDS,
    actual: intake.required_owner_response_fields
  });
}

for (const phrase of REQUIRED_MARKDOWN_PHRASES) {
  if (!intakeMarkdown.includes(phrase)) {
    addFinding(findings, "P1", "MARKDOWN_BOUNDARY_PHRASE_MISSING", "Owner approval intake markdown is missing a boundary phrase.", {
      phrase
    });
  }
}

if (!postReleaseKickoff.includes("Owner approval evidence") || !postReleaseKickoff.includes("https://github.com/Gonyak-cell/law-firm-os/issues/146")) {
  addFinding(findings, "P1", "POST_RELEASE_KICKOFF_LINK_MISSING", "Post-release kickoff must link the owner approval issue.", {});
}
for (const phrase of ["owner-approved | false", "production go-live: false", "public release: false"]) {
  if (!ownerPacket.includes(phrase)) {
    addFinding(findings, "P1", "OWNER_PACKET_BOUNDARY_MISSING", "Owner decision packet lost a required non-claim phrase.", {
      phrase
    });
  }
}

const entries = intake.response_entries ?? [];
if (entries.length !== 1) {
  addFinding(findings, "P1", "RESPONSE_ENTRY_COUNT", "Desktop owner approval intake must have one LCX VLTUI owner response entry.", {
    actual: entries.length
  });
}

for (const entry of entries) {
  if (!sameSet(entry.allowed_decisions, ALLOWED_DECISIONS)) {
    addFinding(findings, "P1", "ALLOWED_DECISIONS_MISMATCH", "Owner response entry allowed decisions drifted.", {
      id: entry.id,
      expected: ALLOWED_DECISIONS,
      actual: entry.allowed_decisions
    });
  }
  if (!sameSet(entry.required_review_artifacts, REQUIRED_REVIEW_ARTIFACTS)) {
    addFinding(findings, "P1", "REVIEW_ARTIFACTS_MISMATCH", "Owner response entry review artifacts drifted.", {
      id: entry.id
    });
  }
  for (const artifact of REQUIRED_REVIEW_ARTIFACTS) {
    if (!artifactExists(artifact, releaseReceipt)) {
      addFinding(findings, "P1", "REVIEW_ARTIFACT_NOT_UPLOADED", "Required owner review artifact is not uploaded in the GitHub release receipt.", {
        id: entry.id,
        artifact
      });
    }
  }

  if (entry.response_status === "pending_owner_response") {
    const filledFields = REQUIRED_OWNER_RESPONSE_FIELDS.filter((field) => String(entry[field] ?? "").trim());
    if (filledFields.length > 0) {
      addFinding(findings, "P1", "PENDING_RESPONSE_HAS_OWNER_FIELDS", "Pending owner response entry contains owner evidence fields.", {
        id: entry.id,
        filled_fields: filledFields
      });
    }
    if (
      entry.pending_response_not_approval !== true ||
      entry.copy_to_owner_decision_packet_allowed !== false ||
      entry.copy_to_go_live_receipt_allowed !== false
    ) {
      addFinding(findings, "P0", "PENDING_RESPONSE_BOUNDARY_DRIFT", "Pending response entry can be mistaken for approval or receipt-copy permission.", {
        id: entry.id
      });
    }
    if (
      entry.public_release_claim_after_response !== false ||
      entry.production_go_live_claim_after_response !== false ||
      entry.owner_final_approval_claim_after_response !== false
    ) {
      addFinding(findings, "P0", "PENDING_RESPONSE_NON_CLAIM_DRIFT", "Pending response entry must not flip release claims.", {
        id: entry.id
      });
    }
  } else if (entry.response_status === "real_owner_response_received") {
    const weakFields = REQUIRED_OWNER_RESPONSE_FIELDS.filter((field) => {
      const value = String(entry[field] ?? "").trim();
      return !value || PLACEHOLDER_PATTERN.test(value);
    });
    if (weakFields.length > 0) {
      addFinding(findings, "P1", "REAL_RESPONSE_WEAK_FIELDS", "Real owner response entry has missing or placeholder fields.", {
        id: entry.id,
        weak_fields: weakFields
      });
    }
    const agentInferredFields = REQUIRED_OWNER_RESPONSE_FIELDS.filter((field) => AGENT_INFERENCE_PATTERN.test(String(entry[field] ?? "")));
    if (agentInferredFields.length > 0) {
      addFinding(findings, "P0", "REAL_RESPONSE_AGENT_INFERRED", "Real owner response appears to rely on agent-inferred approval evidence.", {
        id: entry.id,
        fields: agentInferredFields
      });
    }
    if (!ALLOWED_DECISIONS.includes(entry.decision)) {
      addFinding(findings, "P1", "REAL_RESPONSE_DECISION_INVALID", "Real owner response decision is not allowed.", {
        id: entry.id,
        decision: entry.decision
      });
    }
    if (!artifactExists(entry.reviewed_artifact, releaseReceipt)) {
      addFinding(findings, "P1", "REAL_RESPONSE_REVIEWED_ARTIFACT_INVALID", "Real owner response reviewed artifact is not uploaded in the GitHub release receipt.", {
        id: entry.id,
        reviewed_artifact: entry.reviewed_artifact
      });
    }
    if (entry.release_url !== EXPECTED_RELEASE.url) {
      addFinding(findings, "P1", "REAL_RESPONSE_RELEASE_URL_INVALID", "Real owner response release URL does not match the LCX VLTUI desktop release.", {
        id: entry.id,
        release_url: entry.release_url
      });
    }
    if (!digestMatchesAsset(entry.artifact_digest, releaseReceipt)) {
      addFinding(findings, "P1", "REAL_RESPONSE_DIGEST_INVALID", "Real owner response artifact digest is not a release asset digest.", {
        id: entry.id,
        artifact_digest: entry.artifact_digest
      });
    }
    if (!DECISION_AT_PATTERN.test(String(entry.decision_at ?? ""))) {
      addFinding(findings, "P1", "REAL_RESPONSE_DECISION_AT_INVALID", "Real owner response decision_at value is invalid.", {
        id: entry.id,
        decision_at: entry.decision_at
      });
    }
    const currentSignatureRefState = signatureRefState(entry.approval_signature_ref);
    if (currentSignatureRefState === "missing_or_placeholder" || currentSignatureRefState === "local_ref_missing" || currentSignatureRefState === "unclassified_ref") {
      addFinding(findings, "P1", "REAL_RESPONSE_SIGNATURE_REF_INVALID", "Real owner response signature reference is missing, unresolved, or unclassified.", {
        id: entry.id,
        signature_ref_state: currentSignatureRefState
      });
    }
    if (entry.recorded_by_human !== true) {
      addFinding(findings, "P0", "REAL_RESPONSE_NOT_HUMAN_RECORDED", "Real owner response must be recorded_by_human=true.", {
        id: entry.id
      });
    }
    if (entry.copy_to_go_live_receipt_allowed !== false) {
      addFinding(findings, "P0", "REAL_RESPONSE_GO_LIVE_COPY_DRIFT", "Desktop owner approval intake must not directly authorize go-live receipt copy.", {
        id: entry.id
      });
    }
  } else {
    addFinding(findings, "P1", "RESPONSE_STATUS_INVALID", "Owner response entry status is not allowed.", {
      id: entry.id,
      response_status: entry.response_status
    });
  }
}

const pendingResponseCount = entries.filter((entry) => entry.response_status === "pending_owner_response").length;
const realResponseCount = entries.filter((entry) => entry.response_status === "real_owner_response_received").length;
const verdict = findings.some((finding) => finding.severity === "P0" || finding.severity === "P1") ? "FAIL" : "PASS";
const report = {
  schema_version: "law-firm-os.matter-desktop-owner-approval-intake.validation.v0.1",
  generated_at: existingValidation?.generated_at ?? new Date().toISOString(),
  source_refs: [
    INTAKE_JSON_PATH,
    INTAKE_MD_PATH,
    RELEASE_RECEIPT_PATH,
    POST_RELEASE_KICKOFF_PATH,
    OWNER_PACKET_PATH,
    OWNER_APPROVAL_RECEIPT_PATH
  ],
  verdict,
  summary: {
    release_tag: intake.release?.tag,
    pending_response_count: pendingResponseCount,
    real_response_count: realResponseCount,
    required_review_artifact_count: REQUIRED_REVIEW_ARTIFACTS.length,
    public_release_claim: false,
    production_go_live_claim: false,
    owner_final_approval_claim: false,
    windows_authenticode_claim: false
  },
  findings
};

mkdirSync(dirname(VALIDATION_JSON_PATH), { recursive: true });
writeFileSync(VALIDATION_JSON_PATH, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(VALIDATION_MD_PATH, renderMarkdown(report));

assert.equal(verdict, "PASS", "matter desktop owner approval intake validation failed");
console.log(JSON.stringify(report, null, 2));
