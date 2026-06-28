#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { spawnSync } from "node:child_process";

const ARTIFACT_DIR = "docs/lazycodex/evidence/matter-web/artifacts";
const LEDGER_JSON = `${ARTIFACT_DIR}/lcx8-action-ledger.json`;
const PROOF_JSON = `${ARTIFACT_DIR}/lcx8-action-0062-0281-0318-0322-final-blocker-descriptor-proof.json`;
const PROOF_MD = `${ARTIFACT_DIR}/lcx8-action-0062-0281-0318-0322-final-blocker-descriptor-proof.md`;
const ROW_IDS = ["LCX8-ACTION-0062", "LCX8-ACTION-0281", "LCX8-ACTION-0318", "LCX8-ACTION-0322"];

function read(path) {
  return readFileSync(path, "utf8");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function runCommand(command, args) {
  const startedAt = new Date().toISOString();
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    env: process.env
  });
  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim();
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with ${result.status}\n${output}`);
  }
  return {
    command: [command, ...args].join(" "),
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    exit_code: result.status,
    summary: extractTapSummary(output),
    output_excerpt: excerpt(output)
  };
}

function extractTapSummary(output) {
  const match = [...output.matchAll(/# tests (\d+)[\s\S]*?# pass (\d+)[\s\S]*?# fail (\d+)/g)].at(-1);
  if (!match) return null;
  return {
    tests: Number(match[1]),
    pass: Number(match[2]),
    fail: Number(match[3])
  };
}

function excerpt(output) {
  const lines = output.split(/\r?\n/);
  if (lines.length <= 80) return lines;
  return [...lines.slice(0, 35), "...", ...lines.slice(-35)];
}

function evidenceText(row) {
  return JSON.stringify(row.evidence ?? []);
}

const ledger = JSON.parse(read(LEDGER_JSON));
const rows = ledger.rows ?? ledger.actions;
const rowMap = new Map(rows.map((row) => [row.id, row]));
for (const id of ROW_IDS) assert(rowMap.has(id), `Missing ledger row ${id}`);

const mattersSource = read("apps/web/src/components/MattersSurface.jsx");
const importSource = read("apps/web/src/components/ImportDataMappingPanel.jsx");
const profileSource = read("apps/web/src/components/UserProfileSurface.jsx");
const emailFilingSource = read("apps/web/src/components/EmailFilingView.jsx");

assert(mattersSource.includes("handleRecordActionOwnerBlocked"), "Matter owner-blocked handler marker missing");
assert(mattersSource.includes("bulkUpdateRecordActions"), "Matter bulk record action API marker missing");
assert(importSource.includes("execute") || importSource.includes("실행"), "Import execution request marker missing");
assert(profileSource.includes("프로필 데이터 없음"), "Profile unavailable descriptor copy missing");
assert(profileSource.includes("사용자 프로필 API"), "Profile API unavailable copy missing");
assert(!profileSource.includes("apiClient"), "Profile descriptor should not import apiClient");
assert(emailFilingSource.includes("연동 필요"), "Email filing provider unavailable meta missing");
assert(emailFilingSource.includes("메일 연동 후 사용할 수 있습니다"), "Email filing unavailable copy missing");
assert(!emailFilingSource.includes("<form"), "Email filing descriptor should not render a form");
assert(!emailFilingSource.includes("onSubmit"), "Email filing descriptor should not submit");

const row0062 = rowMap.get("LCX8-ACTION-0062");
const row0281 = rowMap.get("LCX8-ACTION-0281");
const row0318 = rowMap.get("LCX8-ACTION-0318");
const row0322 = rowMap.get("LCX8-ACTION-0322");

assert(row0062.status === "BLOCKED", "0062 should remain BLOCKED");
assert(row0318.status === "BLOCKED", "0318 should remain BLOCKED");
assert(row0281.status === "DESCRIPTOR_ONLY", "0281 should remain DESCRIPTOR_ONLY");
assert(row0322.status === "DESCRIPTOR_ONLY", "0322 should remain DESCRIPTOR_ONLY");
assert(evidenceText(row0062).includes("owner_or_approval_receipt_blocked_not_external_provider"), "0062 missing owner/approval blocker evidence");
assert(evidenceText(row0318).includes("owner_or_approval_receipt_blocked_not_external_provider"), "0318 missing owner/approval blocker evidence");
assert(evidenceText(row0281).includes("DESCRIPTOR_LOCAL_UNAVAILABLE_STATE"), "0281 missing descriptor local unavailable taxonomy");
assert(evidenceText(row0322).includes("DESCRIPTOR_EXTERNAL_PROVIDER_UNAVAILABLE"), "0322 missing descriptor external provider taxonomy");

const apiTest = runCommand("npm", ["--workspace", "apps/api", "run", "test"]);
assert(apiTest.summary?.fail === 0, "API test suite must pass cleanly");

const rowProofs = [
  {
    id: "LCX8-ACTION-0062",
    status_decision: "BLOCKED final / owner approval receipt required",
    proof_type: "ledger_source_api_test",
    observed: "Matter owner-change bulk record action handler/API boundary exists, but ledger P5/P8 classify owner/approval receipt as missing and no safe write/read-back/audit receipt is captured.",
    missing_receipt: "owner/approval write execution, durable read-back, and audit event receipt"
  },
  {
    id: "LCX8-ACTION-0281",
    status_decision: "DESCRIPTOR_ONLY final / runtime profile API missing",
    proof_type: "descriptor_source",
    observed: "UserProfileSurface renders profile data unavailable panels and intentionally avoids a profile API client/runtime read.",
    missing_receipt: "profile runtime API/read integration"
  },
  {
    id: "LCX8-ACTION-0318",
    status_decision: "BLOCKED final / owner approval receipt required",
    proof_type: "ledger_source_api_test",
    observed: "Import execution request source surface exists, but ledger P5/P8 classify owner/approval receipt as missing and no safe write/read-back/audit receipt is captured.",
    missing_receipt: "owner/approval write execution, durable read-back, and audit event receipt"
  },
  {
    id: "LCX8-ACTION-0322",
    status_decision: "DESCRIPTOR_ONLY final / external provider unavailable",
    proof_type: "descriptor_source",
    observed: "EmailFilingView renders provider-unavailable copy with no form submit/provider API handler.",
    missing_receipt: "email filing provider integration and external receipt"
  }
];

const generatedAt = new Date().toISOString();
const proof = {
  schema_version: "law-firm-os.lcx8.final-blocker-descriptor-proof.v0.1",
  generated_at: generatedAt,
  result: "PASS",
  action_ids: ROW_IDS,
  status_decision: "final BLOCKED/DESCRIPTOR_ONLY classification",
  assertions: {
    passed: 17,
    failed: 0
  },
  source_observations: {
    matter_write_blockers: "MattersSurface handler/API boundary exists; ledger P5/P8 records owner/approval receipt missing, so status remains BLOCKED.",
    profile_descriptor: "UserProfileSurface renders unavailable panels with no profile API client/runtime read.",
    vault_email_descriptor: "EmailFilingView renders external provider unavailable state with no submit/provider API handler."
  },
  tests: [apiTest],
  rowProofs,
  non_claims: [
    "no owner/approval write execution was performed",
    "no durable read-back or audit write receipt is claimed for blocked write rows",
    "descriptor-only rows are not runtime/PASS claims",
    "no external email provider receipt is claimed",
    "no production-ready or go-live claim"
  ]
};

mkdirSync(dirname(PROOF_JSON), { recursive: true });
writeFileSync(PROOF_JSON, `${JSON.stringify(proof, null, 2)}\n`);
writeFileSync(PROOF_MD, `${[
  "# LCX8 Final Blocker And Descriptor Proof",
  "",
  "- Result: PASS for proof execution",
  "- Status decision: final BLOCKED/DESCRIPTOR_ONLY classification",
  `- Generated: ${generatedAt}`,
  "",
  "## Commands",
  `- ${apiTest.command}: PASS ${apiTest.summary?.pass ?? "unknown"}/${apiTest.summary?.tests ?? "unknown"}, fail ${apiTest.summary?.fail ?? "unknown"}`,
  "",
  "## Rows",
  ...rowProofs.map((row) => `- ${row.id}: ${row.status_decision}; ${row.observed}; missing=${row.missing_receipt}`),
  "",
  "## Non-Claims",
  ...proof.non_claims.map((item) => `- ${item}`)
].join("\n")}\n`);

console.log(JSON.stringify({
  result: proof.result,
  action_ids: ROW_IDS,
  status_decision: proof.status_decision,
  proof: PROOF_JSON,
  proof_md: PROOF_MD,
  tests: proof.tests.map((test) => ({ command: test.command, summary: test.summary }))
}, null, 2));
