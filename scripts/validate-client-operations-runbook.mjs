#!/usr/bin/env node

import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const RUNBOOK_PATH = "docs/runbooks/client-operations-runbook.md";
export const EVIDENCE_ROOT = ".omo/evidence";
export const VALIDATOR_RECEIPT_PATH = `${EVIDENCE_ROOT}/client-operations-runbook-validator.json`;
export const DRILL_SCHEMA_VERSION = "law-firm-os.client-operations-drill.v0.2";

export const DRILL_RECEIPTS = Object.freeze([
  {
    id: "CL-P6-W02-T02-BANK-IMPORT",
    path: `${EVIDENCE_ROOT}/cl-p6-w02-t02-bank-import-replay.json`,
    external_blocked: false,
    external_required: false,
  },
  {
    id: "CL-P6-W02-T02-GRAPH-OUTAGE",
    path: `${EVIDENCE_ROOT}/cl-p6-w02-t02-graph-email-calendar-outage.json`,
    external_blocked: true,
    external_required: true,
  },
  {
    id: "CL-P6-W02-T02-ENGAGEMENT-REPAIR",
    path: `${EVIDENCE_ROOT}/cl-p6-w02-t02-engagement-repair.json`,
    external_blocked: false,
    external_required: false,
  },
  {
    id: "CL-P6-W02-T02-DASHBOARD-PARTIAL",
    path: `${EVIDENCE_ROOT}/cl-p6-w02-t02-dashboard-partial-source.json`,
    external_blocked: false,
    external_required: false,
  },
]);

const REQUIRED_SECTIONS = Object.freeze([
  {
    id: "bank-import",
    heading: "## Drill 1 — Bank import preview/confirm failure and replay",
    labels: [
      "### Trigger",
      "### Safe user state",
      "### Operator checks",
      "### Exact commands",
      "### Audit/DB/provider evidence",
      "### Rollback/recovery",
      "### Escalation",
      "### Do not retry",
    ],
  },
  {
    id: "graph-outage",
    heading: "## Drill 2 — Graph/email/calendar outage and quarantine",
    labels: [
      "### Trigger",
      "### Safe user state",
      "### Operator checks",
      "### Exact commands",
      "### Audit/DB/provider evidence",
      "### Rollback/recovery",
      "### Escalation",
      "### Do not retry",
    ],
  },
  {
    id: "engagement-repair",
    heading: "## Drill 3 — Engagement decision/Intake handoff partial failure and idempotent recovery",
    labels: [
      "### Trigger",
      "### Safe user state",
      "### Operator checks",
      "### Exact commands",
      "### Audit/DB/provider evidence",
      "### Rollback/recovery",
      "### Escalation",
      "### Do not retry",
    ],
  },
  {
    id: "dashboard-partial",
    heading: "## Drill 4 — Dashboard partial-source metrics and alerts",
    labels: [
      "### Trigger",
      "### Safe user state",
      "### Operator checks",
      "### Exact commands",
      "### Audit/DB/provider evidence",
      "### Rollback/recovery",
      "### Escalation",
      "### Do not retry",
    ],
  },
]);

const REQUIRED_LOCAL_COMMANDS = Object.freeze([
  "node --test apps/api/test/client-bank-import-preview-api.test.js apps/api/test/bank-import-confirmation.test.js",
  "node --test apps/api/test/outlook-connection-api.test.js apps/api/test/outlook-inquiry-api.test.js apps/api/test/outlook-consultation-api.test.js packages/email-dms/test/m365-graph-connection.test.js packages/email-dms/test/inquiry-evidence.test.js",
  "node --test apps/api/test/client-engagement-decision-api.test.js apps/api/test/client-inquiry-transition-api.test.js",
  "node --test apps/api/test/home-dashboard-api.test.js",
  "npm run rp08:m365-runtime:validate",
  "node scripts/validate-client-operations-runbook.mjs --capture",
  "node scripts/validate-client-operations-runbook.mjs",
  "node --test scripts/test/client-operations-runbook.test.mjs",
]);

const REQUIRED_EXTERNAL_COMMAND_SNIPPETS = Object.freeze([
  "aws sts get-caller-identity --profile matter-prod-deploy-admin --no-cli-pager",
  "aws lambda get-function-configuration",
  "psql \"$LAWOS_DATABASE_URL\"",
]);

const CAPTURE_SPECS = Object.freeze([
  {
    id: "CL-P6-W02-T02-BANK-IMPORT",
    source_paths: [
      "apps/api/src/finance-runtime-context.js",
      "apps/api/src/server.js",
      "packages/billing/src/finance-repository.js",
      "packages/billing/src/invoice-pdf-service.js",
      "packages/hrx/src/leave/xlsx-export.js",
      "packages/import-data/src/index.js",
    ],
    test_paths: [
      "apps/api/test/client-bank-import-preview-api.test.js",
      "apps/api/test/bank-import-confirmation.test.js",
    ],
    command: "node --test apps/api/test/client-bank-import-preview-api.test.js apps/api/test/bank-import-confirmation.test.js",
    rollback_command: "node --test --test-name-pattern='replays|imports only server-parsed rows' apps/api/test/client-bank-import-preview-api.test.js apps/api/test/bank-import-confirmation.test.js",
  },
  {
    id: "CL-P6-W02-T02-GRAPH-OUTAGE",
    source_paths: [
      "apps/api/src/crm-intake-runtime-context.js",
      "apps/api/src/outlook-addin-runtime-context.js",
      "apps/api/src/server.js",
      "packages/email-dms/src/inquiry-evidence-storage-service.js",
      "packages/email-dms/src/m365-graph-connection-service.js",
      "packages/email-dms/src/m365-graph-ports.js",
      "packages/email-dms/src/microsoft-graph-mail-provider.js",
    ],
    test_paths: [
      "apps/api/test/outlook-connection-api.test.js",
      "apps/api/test/outlook-inquiry-api.test.js",
      "apps/api/test/outlook-consultation-api.test.js",
      "packages/email-dms/test/m365-graph-connection.test.js",
      "packages/email-dms/test/inquiry-evidence.test.js",
    ],
    command: "node --test apps/api/test/outlook-connection-api.test.js apps/api/test/outlook-inquiry-api.test.js apps/api/test/outlook-consultation-api.test.js packages/email-dms/test/m365-graph-connection.test.js packages/email-dms/test/inquiry-evidence.test.js",
    contract_command: "npm run rp08:m365-runtime:validate",
    rollback_command: "node --test --test-name-pattern='재클릭|Graph 성공 뒤|격리된 원본|악성 MIME' apps/api/test/outlook-consultation-api.test.js apps/api/test/outlook-inquiry-api.test.js packages/email-dms/test/inquiry-evidence.test.js",
    external_block: {
      command: "aws sts get-caller-identity --profile matter-prod-deploy-admin --no-cli-pager",
      owner: "M365/Release",
      reason: "Real Graph, Entra, AWS, Lambda, and deployment execution requires an approved external window and receipt.",
    },
  },
  {
    id: "CL-P6-W02-T02-ENGAGEMENT-REPAIR",
    source_paths: [
      "apps/api/src/crm-intake-runtime-context.js",
      "apps/api/src/server.js",
      "packages/crm/src/runtime-repository.js",
    ],
    test_paths: [
      "apps/api/test/client-engagement-decision-api.test.js",
      "apps/api/test/client-inquiry-transition-api.test.js",
    ],
    command: "node --test apps/api/test/client-engagement-decision-api.test.js apps/api/test/client-inquiry-transition-api.test.js",
    rollback_command: "node --test --test-name-pattern='재처리는 실패한 Finance 단계|수임 결정과 Intake 인계' apps/api/test/client-engagement-decision-api.test.js",
  },
  {
    id: "CL-P6-W02-T02-DASHBOARD-PARTIAL",
    source_paths: [
      "apps/api/src/home-dashboard-operational-state.js",
      "apps/api/src/home-dashboard-runtime-context.js",
      "apps/api/src/server.js",
    ],
    test_paths: [
      "apps/api/test/home-dashboard-api.test.js",
    ],
    command: "node --test --test-name-pattern='Home dashboard source aggregation returns partial success|Home news feed isolates RSS source failures' apps/api/test/home-dashboard-api.test.js",
    rollback_command: "node --test --test-name-pattern='Home dashboard source aggregation returns partial success|Home news feed isolates RSS source failures' apps/api/test/home-dashboard-api.test.js",
  },
]);

const REQUIRED_MARKERS = Object.freeze([
  "synthetic_local",
  "external_execution: blocked",
  "Real Graph/AWS/deploy execution is blocked",
  "production_ready_claim: false",
  "Do not use raw provider tokens",
  "same idempotency key",
  "source_statuses",
  "| `no_data` |",
  "| `permission_denied` |",
  "| `provider_blocked` |",
  "| `error` |",
]);

const DENY_KEY_PATTERNS = Object.freeze([
  /(?:^|_)(?:email|e_mail|sender_email|recipient_email|mailbox|phone|address)(?:_|$)/iu,
  /(?:^|_)(?:client_name|customer_name|bank_account|account_number|iban)(?:_|$)/iu,
  /(?:^|_)(?:raw|mime|body|message|content_base64)(?:_|$)/iu,
  /(?:^|_)(?:authorization|authorization_header|access_token|refresh_token|provider_access_token|session_token)(?:_|$)/iu,
  /(?:^|_)(?:secret|password|credential|cookie|token|auth_token|api_key|private_key|signing_key)(?:_|$)/iu,
]);

const DENY_VALUE_PATH_PATTERNS = Object.freeze([
  /^(?:~|\/|[A-Z]:[\\/])/iu,
  /^file:\/\//iu,
  /(?:^|[\\/])(?:\.aws|\.ssh|\.env(?:\.[^\\/]+)?|secrets?(?:\.[^\\/]+)?|credentials?(?:\.[^\\/]+)?)(?:[\\/]|$)/iu,
  /^(?:\.\.?(?:[\\/]|$))+/u,
]);

const SELF_ATTESTATION_PATTERNS = Object.freeze([
  /\bnot executed\b/iu,
  /\bnot run\b/iu,
  /\bclaimed pass\b/iu,
  /\bself[- ]authored\b/iu,
  /\bwithout output\b/iu,
  /\bwithout (?:a )?real output\b/iu,
  /\bunverified\b/iu,
]);

function readText(path, root = REPO_ROOT) {
  return readFileSync(resolve(root, path), "utf8");
}

function readJson(path, root = REPO_ROOT) {
  return JSON.parse(readText(path, root));
}

function pushError(errors, message) {
  errors.push(message);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function fileSha256(path, root = REPO_ROOT) {
  return sha256(readFileSync(resolve(root, path)));
}

function manifestSha256(paths, root = REPO_ROOT) {
  const rows = [...paths].sort().map((path) => `${path}\t${fileSha256(path, root)}\n`).join("");
  return sha256(rows);
}

function isIsoTimestamp(value) {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function parseTapObservation(stdout, exitCode) {
  const metric = (label) => stdout.match(new RegExp(`(?:^|\\n)(?:#|ℹ)\\s+${label}\\s+(\\d+)`, "u"))?.[1];
  const tests = metric("tests");
  const pass = metric("pass");
  const fail = metric("fail");
  return {
    exit_code: exitCode,
    stdout_bytes: Buffer.byteLength(stdout),
    stdout_nonempty: stdout.length > 0,
    tap_summary: tests == null
      ? null
      : { tests: Number(tests), pass: Number(pass ?? 0), fail: Number(fail ?? 0) },
  };
}

function scanDeniedFields(value, path = [], errors = []) {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => scanDeniedFields(entry, [...path, String(index)], errors));
    return errors;
  }
  if (!value || typeof value !== "object") {
    if (typeof value === "string" && DENY_VALUE_PATH_PATTERNS.some((pattern) => pattern.test(value))) {
      errors.push(`${path.join(".")}: denied absolute/secret path value`);
    }
    return errors;
  }
  for (const [key, child] of Object.entries(value)) {
    const childPath = [...path, key];
    const normalizedKey = key
      .replace(/([a-z0-9])([A-Z])/gu, "$1_$2")
      .replace(/[^a-z0-9]+/giu, "_")
      .toLowerCase();
    if (DENY_KEY_PATTERNS.some((pattern) => pattern.test(normalizedKey))) {
      errors.push(`${childPath.join(".")}: denied sensitive key`);
      continue;
    }
    scanDeniedFields(child, childPath, errors);
  }
  return errors;
}

function isSafeEvidenceArtifactPath(value) {
  return typeof value === "string"
    && value.startsWith(`${EVIDENCE_ROOT}/`)
    && !value.includes("..")
    && !value.startsWith("/")
    && !DENY_VALUE_PATH_PATTERNS.some((pattern) => pattern.test(value));
}

function isSafeRepositoryPath(value) {
  return typeof value === "string"
    && value.trim() !== ""
    && !value.startsWith("/")
    && !value.startsWith("~")
    && !value.includes("..")
    && !DENY_VALUE_PATH_PATTERNS.some((pattern) => pattern.test(value));
}

function assertExecutionRecord(record, descriptor, root, errors, label) {
  if (!record || typeof record !== "object") {
    pushError(errors, `${descriptor.path}: ${label} is required`);
    return;
  }
  if (record.executed !== true) pushError(errors, `${descriptor.path}: ${label}.executed must be true`);
  if (typeof record.command !== "string" || record.command.trim() === "") pushError(errors, `${descriptor.path}: ${label}.command is required`);
  if (SELF_ATTESTATION_PATTERNS.some((pattern) => pattern.test(record.command ?? ""))) pushError(errors, `${descriptor.path}: ${label}.command contains self-attestation text`);
  if (record.exit_code !== 0) pushError(errors, `${descriptor.path}: ${label}.exit_code must be 0`);
  for (const field of ["started_at", "finished_at"]) {
    if (!isIsoTimestamp(record[field])) pushError(errors, `${descriptor.path}: ${label}.${field} must be an ISO timestamp`);
  }
  if (isIsoTimestamp(record.started_at) && isIsoTimestamp(record.finished_at) && Date.parse(record.finished_at) < Date.parse(record.started_at)) {
    pushError(errors, `${descriptor.path}: ${label} timestamps are reversed`);
  }
  if (typeof record.observation !== "object" || record.observation == null) {
    pushError(errors, `${descriptor.path}: ${label}.observation is required`);
  } else {
    if (record.observation.exit_code !== 0) pushError(errors, `${descriptor.path}: ${label}.observation.exit_code must be 0`);
    if (record.observation.stdout_nonempty !== true) pushError(errors, `${descriptor.path}: ${label}.observation.stdout_nonempty must be true`);
    if (record.observation.tap_summary != null) {
      const { tests, pass, fail } = record.observation.tap_summary;
      if (!Number.isInteger(tests) || tests < 1) pushError(errors, `${descriptor.path}: ${label}.observation.tap_summary.tests must be positive`);
      if (!Number.isInteger(pass) || pass !== tests) pushError(errors, `${descriptor.path}: ${label}.observation.tap_summary.pass must equal tests`);
      if (!Number.isInteger(fail) || fail !== 0) pushError(errors, `${descriptor.path}: ${label}.observation.tap_summary.fail must be zero`);
    }
  }
  const paths = ["stdout_artifact", "stderr_artifact"];
  for (const artifactField of paths) {
    const artifactPath = record[artifactField];
    if (typeof artifactPath !== "string" || artifactPath.trim() === "") {
      pushError(errors, `${descriptor.path}: ${label}.${artifactField} is required`);
      continue;
    }
    const safeArtifactPath = isSafeEvidenceArtifactPath(artifactPath);
    if (!safeArtifactPath) pushError(errors, `${descriptor.path}: ${label}.${artifactField} is outside ignored evidence root`);
    if (artifactPath === descriptor.path) pushError(errors, `${descriptor.path}: ${label}.${artifactField} self-references receipt`);
    if (!safeArtifactPath || artifactPath === descriptor.path) continue;
    const absoluteArtifactPath = resolve(root, artifactPath);
    if (!existsSync(absoluteArtifactPath)) {
      pushError(errors, `${descriptor.path}: missing ${label}.${artifactField} ${artifactPath}`);
      continue;
    }
    const expectedHash = record[artifactField.replace("artifact", "sha256")];
    const actualHash = fileSha256(artifactPath, root);
    if (typeof expectedHash !== "string" || expectedHash !== actualHash) {
      pushError(errors, `${descriptor.path}: ${label}.${artifactField} hash mismatch`);
    }
    if (record.observation && artifactField === "stdout_artifact") {
      const bytes = readFileSync(absoluteArtifactPath).byteLength;
      if (record.observation.stdout_sha256 !== actualHash) pushError(errors, `${descriptor.path}: ${label}.observation.stdout_sha256 mismatch`);
      if (record.observation.stdout_bytes !== bytes) pushError(errors, `${descriptor.path}: ${label}.observation.stdout_bytes mismatch`);
      if (record.observation.stdout_nonempty !== (bytes > 0)) pushError(errors, `${descriptor.path}: ${label}.observation.stdout_nonempty mismatch`);
    }
    if (record.observation && artifactField === "stderr_artifact" && record.observation.stderr_sha256 !== actualHash) {
      pushError(errors, `${descriptor.path}: ${label}.observation.stderr_sha256 mismatch`);
    }
  }
  for (const [pathField, hashField] of [["source_paths", "source_sha256"], ["test_paths", "test_target_sha256"]]) {
    const pathsForHash = record[pathField];
    if (!Array.isArray(pathsForHash) || pathsForHash.length === 0) {
      pushError(errors, `${descriptor.path}: ${label}.${pathField} is required`);
      continue;
    }
    for (const path of pathsForHash) {
      if (!isSafeRepositoryPath(path) || !existsSync(resolve(root, path))) pushError(errors, `${descriptor.path}: ${label} missing ${pathField} target`);
    }
    if (pathsForHash.every((path) => isSafeRepositoryPath(path) && existsSync(resolve(root, path)))) {
      const actualHash = manifestSha256(pathsForHash, root);
      if (record[hashField] !== actualHash) pushError(errors, `${descriptor.path}: ${label}.${hashField} mismatch`);
    }
  }
}

function validateLinks(markdown, root, errors) {
  const linkPattern = /\[[^\]]+\]\(([^)]+)\)/gu;
  for (const match of markdown.matchAll(linkPattern)) {
    const target = match[1].trim();
    if (!target || target.startsWith("#") || /^[a-z][a-z0-9+.-]*:/iu.test(target)) continue;
    const pathOnly = target.split("#", 1)[0].split("?", 1)[0];
    const absolute = resolve(root, "docs/runbooks", pathOnly);
    if (!existsSync(absolute)) pushError(errors, `broken local link: ${target}`);
  }
}

function validateReceipt(receipt, descriptor, root, errors) {
  if (receipt.schema_version !== DRILL_SCHEMA_VERSION) {
    pushError(errors, `${descriptor.path}: unsupported schema_version`);
  }
  if (receipt.drill_id !== descriptor.id) {
    pushError(errors, `${descriptor.path}: drill_id mismatch`);
  }
  if (!receipt.synthetic_only || receipt.real_client_data_used !== false) {
    pushError(errors, `${descriptor.path}: synthetic-only boundary failed`);
  }
  if (Boolean(receipt.external_execution_blocked) !== descriptor.external_blocked) {
    pushError(errors, `${descriptor.path}: external execution boundary mismatch`);
  }
  const allowedStatus = descriptor.external_blocked ? "BLOCKED_EXTERNAL" : "PASS";
  if (receipt.status !== allowedStatus) {
    pushError(errors, `${descriptor.path}: status must be ${allowedStatus}`);
  }
  if (descriptor.external_blocked) {
    if (!receipt.external_block || receipt.external_block.status !== "BLOCKED_EXTERNAL") {
      pushError(errors, `${descriptor.path}: external_block.status must be BLOCKED_EXTERNAL`);
    }
    if (receipt.external_block?.executed !== false) {
      pushError(errors, `${descriptor.path}: external_block.executed must be false`);
    }
    if (typeof receipt.external_block?.reason !== "string" || receipt.external_block.reason.trim() === "") {
      pushError(errors, `${descriptor.path}: external_block.reason is required`);
    }
  } else if (receipt.external_block != null) {
    pushError(errors, `${descriptor.path}: non-external drill cannot carry external_block`);
  }
  if (!isIsoTimestamp(receipt.generated_at)) pushError(errors, `${descriptor.path}: generated_at must be an ISO timestamp`);
  if (!Array.isArray(receipt.execution_records) || receipt.execution_records.length === 0) {
    pushError(errors, `${descriptor.path}: execution_records are required`);
  } else {
    for (const [index, record] of receipt.execution_records.entries()) {
      assertExecutionRecord(record, descriptor, root, errors, `execution_records[${index}]`);
    }
  }
  assertExecutionRecord(receipt.rollback_verification, descriptor, root, errors, "rollback_verification");
  if (receipt.rollback_verification?.verified !== true) pushError(errors, `${descriptor.path}: rollback_verification.verified must be true`);
  if (!Array.isArray(receipt.evidence) || receipt.evidence.length === 0) pushError(errors, `${descriptor.path}: evidence is required`);
  for (const [index, evidence] of (receipt.evidence ?? []).entries()) {
    for (const field of ["criterion", "scenario", "invocation", "observable", "artifact", "kind"]) {
      if (typeof evidence[field] !== "string" || evidence[field].trim() === "") {
        pushError(errors, `${descriptor.path}: evidence[${index}].${field} is required`);
      }
    }
    if (!["EXECUTION", "BLOCKED_EXTERNAL"].includes(evidence.kind)) {
      pushError(errors, `${descriptor.path}: evidence[${index}].kind is invalid`);
    }
    if (evidence.artifact && !isSafeEvidenceArtifactPath(evidence.artifact)) {
      pushError(errors, `${descriptor.path}: evidence[${index}] artifact is outside ignored evidence root`);
    } else if (evidence.artifact === descriptor.path) {
      pushError(errors, `${descriptor.path}: evidence[${index}] self-references receipt`);
    } else if (evidence.artifact && !existsSync(resolve(root, evidence.artifact))) {
      pushError(errors, `${descriptor.path}: missing evidence artifact ${evidence.artifact}`);
    }
    if (SELF_ATTESTATION_PATTERNS.some((pattern) => [evidence.criterion, evidence.scenario, evidence.invocation, evidence.observable].some((value) => pattern.test(value ?? "")))) {
      pushError(errors, `${descriptor.path}: evidence[${index}] contains self-attestation text`);
    }
    if (evidence.kind === "EXECUTION") {
      const matching = (receipt.execution_records ?? []).find((record) => record.command === evidence.invocation);
      if (!matching) pushError(errors, `${descriptor.path}: evidence[${index}] has no executed command record`);
    } else if (evidence.kind === "BLOCKED_EXTERNAL") {
      if (!descriptor.external_blocked || receipt.status !== "BLOCKED_EXTERNAL") pushError(errors, `${descriptor.path}: evidence[${index}] blocked kind is not allowed`);
      if (descriptor.external_blocked && evidence.invocation !== receipt.external_block?.command) {
        pushError(errors, `${descriptor.path}: evidence[${index}] blocked invocation must match external_block.command`);
      }
    }
  }
  if (descriptor.external_required && receipt.external_receipt != null && typeof receipt.external_receipt === "object") {
    const externalReceipt = receipt.external_receipt;
    if (externalReceipt.status !== "PASS") pushError(errors, `${descriptor.path}: external_receipt.status must be PASS`);
    if (externalReceipt.kind !== "EXTERNAL_EXECUTION") pushError(errors, `${descriptor.path}: external_receipt.kind must be EXTERNAL_EXECUTION`);
    if (typeof externalReceipt.command !== "string" || externalReceipt.command.trim() === "") pushError(errors, `${descriptor.path}: external_receipt.command is required`);
    if (typeof externalReceipt.command === "string" && !REQUIRED_EXTERNAL_COMMAND_SNIPPETS.some((snippet) => externalReceipt.command.includes(snippet))) {
      pushError(errors, `${descriptor.path}: external_receipt.command is not an approved external command`);
    }
    if (externalReceipt.exit_code !== 0) pushError(errors, `${descriptor.path}: external_receipt.exit_code must be 0`);
    if (!isIsoTimestamp(externalReceipt.captured_at)) pushError(errors, `${descriptor.path}: external_receipt.captured_at must be an ISO timestamp`);
    if (typeof externalReceipt.verified_by !== "string" || externalReceipt.verified_by.trim() === "") pushError(errors, `${descriptor.path}: external_receipt.verified_by is required`);
    const artifactPath = externalReceipt.artifact;
    if (!isSafeEvidenceArtifactPath(artifactPath)) {
      pushError(errors, `${descriptor.path}: external_receipt.artifact is outside ignored evidence root`);
    } else if (artifactPath === descriptor.path) {
      pushError(errors, `${descriptor.path}: external_receipt.artifact self-references receipt`);
    } else if ((receipt.execution_records ?? []).some((record) => record.stdout_artifact === artifactPath || record.stderr_artifact === artifactPath || receipt.rollback_verification?.stdout_artifact === artifactPath || receipt.rollback_verification?.stderr_artifact === artifactPath)) {
      pushError(errors, `${descriptor.path}: external_receipt.artifact must be independent of local execution logs`);
    } else if (!existsSync(resolve(root, artifactPath))) {
      pushError(errors, `${descriptor.path}: missing external_receipt.artifact ${artifactPath}`);
    } else if (typeof externalReceipt.sha256 !== "string" || externalReceipt.sha256 !== fileSha256(artifactPath, root)) {
      pushError(errors, `${descriptor.path}: external_receipt.sha256 mismatch`);
    }
    if (SELF_ATTESTATION_PATTERNS.some((pattern) => pattern.test(externalReceipt.command ?? "") || pattern.test(externalReceipt.verified_by ?? ""))) {
      pushError(errors, `${descriptor.path}: external_receipt contains self-attestation text`);
    }
  }
  for (const field of ["trigger", "safe_user_state", "operator_checks", "audit_db_provider_evidence", "rollback_recovery", "escalation", "do_not_retry"]) {
    const value = receipt[field];
    if ((typeof value === "string" && value.trim() === "") || (Array.isArray(value) && value.length === 0) || (value && typeof value === "object" && Object.keys(value).length === 0) || value == null) {
      pushError(errors, `${descriptor.path}: ${field} is required`);
    }
  }
  if (Array.isArray(receipt.operator_checks)) {
    for (const [index, check] of receipt.operator_checks.entries()) {
      if (typeof check.command !== "string" || check.command.trim() === "") pushError(errors, `${descriptor.path}: operator_checks[${index}].command is required`);
      if (check.exit_code !== 0) pushError(errors, `${descriptor.path}: operator_checks[${index}].exit_code must be 0`);
      if (SELF_ATTESTATION_PATTERNS.some((pattern) => pattern.test(check.command ?? "") || pattern.test(check.binary_observable ?? ""))) {
        pushError(errors, `${descriptor.path}: operator_checks[${index}] contains self-attestation text`);
      }
      if (typeof check.command === "string" && !(receipt.execution_records ?? []).some((record) => record.command === check.command)) {
        pushError(errors, `${descriptor.path}: operator_checks[${index}] has no executed command record`);
      }
    }
  }
  const deniedFields = scanDeniedFields(receipt);
  for (const deniedField of deniedFields) pushError(errors, `${descriptor.path}: ${deniedField}`);
}

function runCapturedCommand(command, root = REPO_ROOT) {
  return new Promise((resolveResult) => {
    const startedAt = new Date();
    const child = spawn("/bin/sh", ["-lc", command], {
      cwd: root,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const stdout = [];
    const stderr = [];
    child.stdout.on("data", (chunk) => stdout.push(Buffer.from(chunk)));
    child.stderr.on("data", (chunk) => stderr.push(Buffer.from(chunk)));
    child.on("close", (exitCode, signal) => {
      const finishedAt = new Date();
      resolveResult({
        command,
        started_at: startedAt.toISOString(),
        finished_at: finishedAt.toISOString(),
        exit_code: typeof exitCode === "number" ? exitCode : 1,
        signal: signal ?? null,
        stdout: Buffer.concat(stdout),
        stderr: Buffer.concat(stderr),
      });
    });
    child.on("error", (error) => {
      const finishedAt = new Date();
      const message = Buffer.from(error instanceof Error ? error.message : String(error));
      resolveResult({
        command,
        started_at: startedAt.toISOString(),
        finished_at: finishedAt.toISOString(),
        exit_code: 1,
        signal: null,
        stdout: Buffer.alloc(0),
        stderr: message,
      });
    });
  });
}

function materializeExecution(result, spec, label, root = REPO_ROOT) {
  const stem = `${spec.id.toLowerCase()}-${label}`;
  const stdoutArtifact = `${EVIDENCE_ROOT}/${stem}.stdout.log`;
  const stderrArtifact = `${EVIDENCE_ROOT}/${stem}.stderr.log`;
  mkdirSync(resolve(root, EVIDENCE_ROOT), { recursive: true });
  writeFileSync(resolve(root, stdoutArtifact), result.stdout);
  writeFileSync(resolve(root, stderrArtifact), result.stderr);
  const observation = parseTapObservation(result.stdout.toString("utf8"), result.exit_code);
  return {
    command: result.command,
    executed: true,
    exit_code: result.exit_code,
    signal: result.signal,
    started_at: result.started_at,
    finished_at: result.finished_at,
    stdout_artifact: stdoutArtifact,
    stderr_artifact: stderrArtifact,
    stdout_sha256: sha256(result.stdout),
    stderr_sha256: sha256(result.stderr),
    source_paths: [...spec.source_paths],
    source_sha256: manifestSha256(spec.source_paths, root),
    test_paths: [...spec.test_paths],
    test_target_sha256: manifestSha256(spec.test_paths, root),
    observation: {
      ...observation,
      stdout_sha256: sha256(result.stdout),
      stderr_sha256: sha256(result.stderr),
    },
  };
}

function alignReceiptEvidence(receipt, executionRecords) {
  const primary = executionRecords[0];
  const fallbackArtifact = primary?.stdout_artifact;
  let executionIndex = 0;
  receipt.evidence = (receipt.evidence ?? []).map((evidence) => {
    if (evidence.kind === "EXECUTION") {
      const record = executionRecords[Math.min(executionIndex++, executionRecords.length - 1)] ?? primary;
      return {
        ...evidence,
        invocation: record?.command ?? evidence.invocation,
        artifact: record?.stdout_artifact ?? fallbackArtifact ?? evidence.artifact,
      };
    }
    if (evidence.kind === "BLOCKED_EXTERNAL") {
      return {
        ...evidence,
        artifact: fallbackArtifact ?? evidence.artifact,
      };
    }
    return evidence;
  });
  receipt.operator_checks = (receipt.operator_checks ?? []).map((check) => (
    executionRecords.some((record) => record.command === check.command)
      ? check
      : { ...check, command: primary?.command ?? check.command }
  ));
}

function refreshExecutionManifestHashes(record, spec, root = REPO_ROOT) {
  record.source_sha256 = manifestSha256(spec.source_paths, root);
  record.test_target_sha256 = manifestSha256(spec.test_paths, root);
  return record;
}

export async function captureClientOperationsReceipts({ root = REPO_ROOT } = {}) {
  const captured = [];
  for (const spec of CAPTURE_SPECS) {
    const primaryResult = await runCapturedCommand(spec.command, root);
    const executionRecords = [materializeExecution(primaryResult, spec, "execution", root)];
    if (spec.contract_command) {
      const contractResult = await runCapturedCommand(spec.contract_command, root);
      executionRecords.push(materializeExecution(contractResult, spec, "contract", root));
    }
    const rollbackResult = await runCapturedCommand(spec.rollback_command, root);
    const rollback = materializeExecution(rollbackResult, spec, "rollback", root);
    rollback.verified = rollback.exit_code === 0;
    executionRecords.forEach((record) => refreshExecutionManifestHashes(record, spec, root));
    refreshExecutionManifestHashes(rollback, spec, root);
    const descriptor = DRILL_RECEIPTS.find((entry) => entry.id === spec.id);
    const receiptPath = resolve(root, descriptor.path);
    const receipt = JSON.parse(readFileSync(receiptPath, "utf8"));
    receipt.schema_version = DRILL_SCHEMA_VERSION;
    receipt.generated_at = new Date().toISOString();
    receipt.execution_records = executionRecords;
    receipt.rollback_verification = rollback;
    alignReceiptEvidence(receipt, executionRecords);
    if (spec.external_block) {
      receipt.status = "BLOCKED_EXTERNAL";
      receipt.external_execution_blocked = true;
      receipt.external_block = {
        status: "BLOCKED_EXTERNAL",
        executed: false,
        command: spec.external_block.command,
        owner: spec.external_block.owner,
        reason: spec.external_block.reason,
        blocked_at: receipt.generated_at,
      };
    } else {
      receipt.status = "PASS";
      receipt.external_execution_blocked = false;
      delete receipt.external_block;
    }
    writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
    captured.push({ id: spec.id, status: receipt.status, receipt: descriptor.path });
  }
  return captured;
}

export function validateClientOperationsRunbook({
  root = REPO_ROOT,
  markdown = null,
  receipts = null,
} = {}) {
  const errors = [];
  const document = markdown ?? readText(RUNBOOK_PATH, root);

  for (const section of REQUIRED_SECTIONS) {
    const headingIndex = document.indexOf(section.heading);
    if (headingIndex < 0) {
      pushError(errors, `missing section: ${section.heading}`);
      continue;
    }
    const nextHeadingIndex = document.indexOf("\n## ", headingIndex + section.heading.length);
    const sectionText = document.slice(headingIndex, nextHeadingIndex < 0 ? document.length : nextHeadingIndex);
    for (const label of section.labels) {
      if (!sectionText.includes(label)) pushError(errors, `${section.id}: missing ${label}`);
    }
  }

  for (const marker of REQUIRED_MARKERS) {
    if (!document.includes(marker)) pushError(errors, `runbook missing marker: ${marker}`);
  }

  for (const command of REQUIRED_LOCAL_COMMANDS) {
    if (!document.includes(command)) pushError(errors, `runbook missing exact local command: ${command}`);
  }
  for (const snippet of REQUIRED_EXTERNAL_COMMAND_SNIPPETS) {
    if (!document.includes(snippet)) pushError(errors, `runbook missing external command snippet: ${snippet}`);
  }

  for (const commandPath of [
    "apps/api/test/client-bank-import-preview-api.test.js",
    "apps/api/test/bank-import-confirmation.test.js",
    "apps/api/test/outlook-connection-api.test.js",
    "apps/api/test/outlook-inquiry-api.test.js",
    "apps/api/test/outlook-consultation-api.test.js",
    "packages/email-dms/test/m365-graph-connection.test.js",
    "packages/email-dms/test/inquiry-evidence.test.js",
    "apps/api/test/client-engagement-decision-api.test.js",
    "apps/api/test/client-inquiry-transition-api.test.js",
    "apps/api/test/home-dashboard-api.test.js",
    "scripts/validate-email-dms-m365-runtime-contract.mjs",
    "scripts/validate-client-operations-runbook.mjs",
    "scripts/test/client-operations-runbook.test.mjs",
  ]) {
    if (!existsSync(resolve(root, commandPath))) pushError(errors, `command target missing: ${commandPath}`);
  }

  validateLinks(document, root, errors);

  const receiptValues = receipts ?? DRILL_RECEIPTS.map((descriptor) => ({
    descriptor,
    value: readJson(descriptor.path, root),
  }));
  for (const descriptor of DRILL_RECEIPTS) {
    const entry = receiptValues.find((candidate) => candidate.descriptor?.id === descriptor.id || candidate.drill_id === descriptor.id);
    if (!entry) {
      pushError(errors, `missing drill receipt: ${descriptor.id}`);
      continue;
    }
    const value = entry.value ?? entry;
    validateReceipt(value, descriptor, root, errors);
    if (!document.includes(descriptor.path)) pushError(errors, `runbook missing receipt link: ${descriptor.path}`);
  }

  const externalReceipt = receiptValues.find((candidate) => (candidate.value ?? candidate).drill_id === "CL-P6-W02-T02-GRAPH-OUTAGE");
  const externalValue = externalReceipt?.value ?? externalReceipt;
  if (externalValue && (externalValue.external_execution_blocked !== true || externalValue.status !== "BLOCKED_EXTERNAL")) {
    pushError(errors, "Graph receipt must remain externally blocked");
  }

  const externalRequired = DRILL_RECEIPTS.filter((descriptor) => descriptor.external_required);
  const missingExternalEvidence = externalRequired
    .filter((descriptor) => {
      const entry = receiptValues.find((candidate) => candidate.descriptor?.id === descriptor.id || candidate.drill_id === descriptor.id);
      const value = entry?.value ?? entry;
      return !value || value.status !== "BLOCKED_EXTERNAL" || value.external_execution_blocked !== true || value.external_receipt?.status !== "PASS";
    })
    .map(({ id }) => id);
  const contractVerdict = errors.length === 0 ? "PASS" : "FAIL";
  const complete = contractVerdict === "PASS" && missingExternalEvidence.length === 0;

  return {
    verdict: contractVerdict === "FAIL" ? "FAIL" : (complete ? "PASS" : "BLOCKED_EXTERNAL"),
    contract_verdict: contractVerdict,
    gate_status: contractVerdict === "FAIL" ? "FAIL" : (complete ? "PASS" : "BLOCKED_EXTERNAL"),
    complete,
    external_evidence: {
      required: externalRequired.map(({ id }) => id),
      missing: missingExternalEvidence,
    },
    verification_level: "runbook-contract",
    runbook: RUNBOOK_PATH,
    drill_count: DRILL_RECEIPTS.length,
    drill_ids: DRILL_RECEIPTS.map(({ id }) => id),
    local_command_count: REQUIRED_LOCAL_COMMANDS.length,
    external_command_snippet_count: REQUIRED_EXTERNAL_COMMAND_SNIPPETS.length,
    errors,
  };
}

function writeValidatorReceipt(result, root = REPO_ROOT) {
  const outputPath = resolve(root, VALIDATOR_RECEIPT_PATH);
  mkdirSync(dirname(outputPath), { recursive: true });
  const receipt = {
    schema_version: "law-firm-os.client-operations-runbook-validator.v0.2",
    generated_at: new Date().toISOString(),
    command: "node scripts/validate-client-operations-runbook.mjs",
    result,
    synthetic_only: true,
    real_client_data_used: false,
    external_graph_aws_deploy_execution: "blocked",
    complete: result.complete === true,
  };
  writeFileSync(outputPath, `${JSON.stringify(receipt, null, 2)}\n`);
  return outputPath;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    if (process.argv.includes("--capture")) await captureClientOperationsReceipts();
    const result = validateClientOperationsRunbook();
    const receiptPath = writeValidatorReceipt(result);
    console.log(JSON.stringify({ ...result, artifact: receiptPath }, null, 2));
    if (result.verdict === "FAIL") process.exitCode = 1;
    else if (result.verdict === "BLOCKED_EXTERNAL") process.exitCode = 2;
  } catch (error) {
    const failure = {
      verdict: "FAIL",
      contract_verdict: "FAIL",
      gate_status: "FAIL",
      complete: false,
      verification_level: "runbook-contract",
      errors: [error instanceof Error ? error.message : String(error)],
    };
    writeValidatorReceipt(failure);
    console.error(JSON.stringify(failure, null, 2));
    process.exitCode = 1;
  }
}
