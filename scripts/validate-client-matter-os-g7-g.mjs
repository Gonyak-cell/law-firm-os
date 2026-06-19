#!/usr/bin/env node
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import {
  createPlatformG7BackupRestoreDrillDescriptor,
  createPlatformG7GReleaseReadinessCloseoutDescriptor,
  createPlatformG7PerformanceSmokeDescriptor,
  createPlatformG7SecurityRegressionDescriptor,
  createPlatformG7StateTransitionTestDescriptor,
  createPlatformG7UatScriptPackageDescriptor,
} from "../packages/platform/src/index.js";

const ROOT = path.resolve("docs/reorganization/client-matter-os");
const REQUIRED_TUWS = [
  "LFOS-G7-W15-T007",
  "LFOS-G7-W15-T008",
  "LFOS-G7-W15-T009",
  "LFOS-G7-W15-T010",
  "LFOS-G7-W15-T011",
  "LFOS-G7-W15-T012",
];
const REQUIRED_FILES = [
  path.join(ROOT, "11-full-tuw-catalog.md"),
  path.join(ROOT, "56-g7-enterprise-hardening-entry-plan.md"),
  path.join(ROOT, "62-g7-f-qa-security-baseline-report.md"),
  path.join(ROOT, "63-g7-g-release-readiness-closeout-report.md"),
  path.resolve("contracts/platform-extensibility-contract.json"),
  path.resolve("contracts/commercial-readiness-contract.json"),
  path.resolve("packages/platform/src/client-matter-g7.js"),
  path.resolve("packages/platform/src/index.js"),
  path.resolve("packages/platform/test/client-matter-g7-release-readiness-closeout.test.js"),
];

const findings = [];

function addFinding(code, message, details = {}) {
  findings.push({ code, message, details });
}

async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readText(filePath) {
  return readFile(filePath, "utf8");
}

async function readJson(filePath) {
  return JSON.parse(await readText(filePath));
}

function requireIncludes(text, value, code, message) {
  if (!text.includes(value)) addFinding(code, message, { value });
}

function hasKeyValue(value, key, expected) {
  if (!value || typeof value !== "object") return false;
  if (value[key] === expected) return true;
  return Object.values(value).some((child) => hasKeyValue(child, key, expected));
}

const tenant_id = "tenant_g7g_validator";

for (const file of REQUIRED_FILES) {
  if (!(await exists(file))) addFinding("MISSING_FILE", "Missing G7-G validation dependency.", { file });
}

if (findings.length === 0) {
  const catalog = await readText(path.join(ROOT, "11-full-tuw-catalog.md"));
  const plan = await readText(path.join(ROOT, "56-g7-enterprise-hardening-entry-plan.md"));
  const g7fReport = await readText(path.join(ROOT, "62-g7-f-qa-security-baseline-report.md"));
  const report = await readText(path.join(ROOT, "63-g7-g-release-readiness-closeout-report.md"));
  const source = await readText(path.resolve("packages/platform/src/client-matter-g7.js"));
  const index = await readText(path.resolve("packages/platform/src/index.js"));
  const test = await readText(path.resolve("packages/platform/test/client-matter-g7-release-readiness-closeout.test.js"));
  const pkg = await readJson(path.resolve("package.json"));
  const rp27Contract = await readJson(path.resolve("contracts/platform-extensibility-contract.json"));
  const rp29Contract = await readJson(path.resolve("contracts/commercial-readiness-contract.json"));

  for (const tuwId of REQUIRED_TUWS) {
    requireIncludes(catalog, tuwId, "MISSING_CATALOG_TUW", "G7-G TUW missing from full catalog.");
    requireIncludes(plan, tuwId, "MISSING_PLAN_TUW", "G7-G TUW missing from G7 entry plan.");
    requireIncludes(report, tuwId, "MISSING_REPORT_TUW", "G7-G TUW missing from G7-G report.");
  }

  requireIncludes(g7fReport, "G7-F QA Security Baseline Report", "MISSING_G7F_HANDOFF", "G7-G must retain the G7-F handoff report dependency.");

  for (const phrase of [
    "G7-G Release Readiness Closeout Report",
    "This slice does not claim G7 runtime readiness",
    "state transition tests",
    "security regression suite",
    "performance smoke",
    "backup/restore drill",
    "UAT script package",
    "production readiness review",
    "G7 approval human disposition",
    "go-live approval",
  ]) {
    requireIncludes(report, phrase, "MISSING_REPORT_PHRASE", "G7-G report missing required boundary or scope phrase.");
  }

  for (const symbol of [
    "PLATFORM_G7G_TUW_COVERAGE",
    "createPlatformG7StateTransitionTestDescriptor",
    "createPlatformG7SecurityRegressionDescriptor",
    "createPlatformG7PerformanceSmokeDescriptor",
    "createPlatformG7BackupRestoreDrillDescriptor",
    "createPlatformG7UatScriptPackageDescriptor",
    "createPlatformG7GReleaseReadinessCloseoutDescriptor",
  ]) {
    requireIncludes(source, `export ${symbol === "PLATFORM_G7G_TUW_COVERAGE" ? "const" : "function"} ${symbol}`, "MISSING_PLATFORM_SOURCE_EXPORT", "G7-G platform export missing.");
    requireIncludes(test, symbol, "MISSING_PLATFORM_TEST_MARKER", "G7-G platform export missing test coverage.");
  }

  requireIncludes(index, "client-matter-g7.js", "MISSING_PLATFORM_INDEX_EXPORT", "Platform index must export G7 Client-Matter descriptors.");

  for (const marker of [
    "state_transition_invalid_transition_blocked_required",
    "security_regression_tenant_leak_absent_required",
    "performance_smoke_latency_threshold_required",
    "backup_restore_restore_verified_required",
    "uat_script_user_signoff_required",
    "release_readiness_human_disposition_required",
    "release_readiness_g7_approval_claim_blocked",
    "release_readiness_go_live_claim_blocked",
  ]) {
    requireIncludes(source, marker, "MISSING_PLATFORM_SOURCE_MARKER", "G7-G platform source missing required marker.");
  }

  if (pkg.scripts?.["client-matter:g7g:validate"] !== "node scripts/validate-client-matter-os-g7-g.mjs") {
    addFinding("MISSING_NPM_SCRIPT", "package.json must expose client-matter:g7g:validate.");
  }

  if (
    rp27Contract.program_contract?.program_id !== "RP27" ||
    !hasKeyValue(rp27Contract, "descriptor_only", true) ||
    !hasKeyValue(rp27Contract, "runtime_execution", false) ||
    !hasKeyValue(rp27Contract, "local_validation_claims_enterprise_trust", false) ||
    !hasKeyValue(rp27Contract, "human_final_approval_required_for_runtime_opening", true)
  ) {
    addFinding("RP27_CONTRACT_BOUNDARY", "RP27 Platform Extensibility contract must remain descriptor-only without runtime or local enterprise-trust claims.");
  }

  if (
    rp29Contract.program_contract?.program_id !== "RP29" ||
    !hasKeyValue(rp29Contract, "descriptor_only", true) ||
    !hasKeyValue(rp29Contract, "runtime_execution", false) ||
    !hasKeyValue(rp29Contract, "emits_runtime_receipt", false) ||
    !hasKeyValue(rp29Contract, "human_final_approval_required", true) ||
    !hasKeyValue(rp29Contract, "runtime_opening_allowed", false) ||
    !hasKeyValue(rp29Contract, "promotes_claude_to_final_approval", false)
  ) {
    addFinding("RP29_CONTRACT_BOUNDARY", "RP29 Commercial Readiness contract must remain descriptor-only without runtime receipts or human approval substitution.");
  }

  const state = createPlatformG7StateTransitionTestDescriptor({
    tenant_id,
    state_transition_suite: {
      suite_ref: "state_transition_suite_g7g_validator",
      invalid_transition_matrix_ref: "invalid_transition_matrix_g7g_validator",
      state_machine_model_ref: "state_machine_model_g7g_validator",
      invalid_transitions_blocked: true,
    },
  });
  const security = createPlatformG7SecurityRegressionDescriptor({
    tenant_id,
    security_regression: {
      suite_ref: "security_regression_g7g_validator",
      tenant_isolation_matrix_ref: "tenant_isolation_matrix_g7g_validator",
      privilege_regression_ref: "privilege_regression_g7g_validator",
      tenant_leak_absent: true,
    },
  });
  const performance = createPlatformG7PerformanceSmokeDescriptor({
    tenant_id,
    performance_smoke: {
      smoke_report_ref: "performance_smoke_g7g_validator",
      latency_threshold_ref: "latency_threshold_g7g_validator",
      agreed_latency_threshold_ms: 500,
      threshold_reviewed: true,
      sample_window_ref: "sample_window_g7g_validator",
    },
  });
  const backup = createPlatformG7BackupRestoreDrillDescriptor({
    tenant_id,
    backup_restore: {
      drill_report_ref: "backup_restore_g7g_validator",
      restore_point_ref: "restore_point_g7g_validator",
      rollback_runbook_ref: "rollback_runbook_g7g_validator",
      rpo_rto_review_ref: "rpo_rto_review_g7g_validator",
      restore_verified: true,
    },
  });
  const uat = createPlatformG7UatScriptPackageDescriptor({
    tenant_id,
    uat_package: {
      script_package_ref: "uat_script_package_g7g_validator",
      role_scenario_matrix_ref: "role_scenario_matrix_g7g_validator",
      signoff_tracker_ref: "signoff_tracker_g7g_validator",
      representative_user_signoff_ref: "representative_user_signoff_g7g_validator",
      user_signoff_recorded: true,
    },
  });
  const closeout = createPlatformG7GReleaseReadinessCloseoutDescriptor({
    tenant_id,
    g7f_handoff_validated: true,
    rp27_contract_validated: true,
    rp29_contract_validated: true,
    descriptors: [state, security, performance, backup, uat, { tuw_id: "LFOS-G7-W15-T012", outcome: "review_required" }],
    readiness_review_packet_ref: "readiness_review_packet_g7g_validator",
    unresolved_findings_register_ref: "unresolved_findings_register_g7g_validator",
    waiver_register_ref: "waiver_register_g7g_validator",
    human_readiness_disposition_required: true,
    human_disposition_tracker_ref: "human_disposition_tracker_g7g_validator",
  });

  if (state.outcome !== "review_required" || state.state_transition_receipt.invalid_transitions_blocked !== true) {
    addFinding("STATE_TRANSITION", "State transition descriptor must require invalid transition blocking evidence.");
  }
  if (security.outcome !== "review_required" || security.security_regression_receipt.tenant_leak_absent !== true) {
    addFinding("SECURITY_REGRESSION", "Security regression descriptor must require tenant leak absence evidence.");
  }
  if (performance.outcome !== "review_required" || performance.performance_smoke_receipt.latency_threshold_reviewed !== true) {
    addFinding("PERFORMANCE_SMOKE", "Performance smoke descriptor must require reviewed latency threshold evidence.");
  }
  if (backup.outcome !== "review_required" || backup.backup_restore_receipt.restore_verified !== true) {
    addFinding("BACKUP_RESTORE", "Backup/restore descriptor must require restore verification evidence.");
  }
  if (uat.outcome !== "review_required" || uat.uat_package_receipt.user_signoff_recorded !== true) {
    addFinding("UAT_PACKAGE", "UAT package descriptor must require user signoff evidence.");
  }
  if (
    closeout.outcome !== "review_required" ||
    closeout.tuw_coverage.length !== 6 ||
    closeout.closeout_receipt.human_readiness_disposition_required !== true ||
    closeout.closeout_receipt.production_readiness_claim !== "open" ||
    closeout.closeout_receipt.go_live_approval_claimed !== false
  ) {
    addFinding("G7G_CLOSEOUT", "G7-G closeout must summarize six TUWs while keeping production readiness and go-live open.");
  }
}

if (findings.length > 0) {
  console.error("Client-Matter OS G7-G validation failed:");
  for (const finding of findings) {
    console.error(`- ${finding.code}: ${finding.message}`);
    if (Object.keys(finding.details).length > 0) {
      console.error(`  ${JSON.stringify(finding.details)}`);
    }
  }
  process.exit(1);
}

console.log("Client-Matter OS G7-G validation passed.");
console.log("g7g_tuws: LFOS-G7-W15-T007/LFOS-G7-W15-T008/LFOS-G7-W15-T009/LFOS-G7-W15-T010/LFOS-G7-W15-T011/LFOS-G7-W15-T012");
console.log("state_security: invalid_transition_tenant_leak_required");
console.log("performance_dr: latency_threshold_restore_verified_required");
console.log("uat_release: user_signoff_human_disposition_required");
console.log("release_readiness_closeout: production_readiness_open_go_live_open");
