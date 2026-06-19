#!/usr/bin/env node
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import {
  createEnterpriseG7AuditCompletenessDescriptor,
  createEnterpriseG7FQaSecurityBaselineCloseoutDescriptor,
  createEnterpriseG7IdempotencyBaselineDescriptor,
  createEnterpriseG7IntegrationBaselineDescriptor,
  createEnterpriseG7PermissionNegativeDescriptor,
  createEnterpriseG7TestStrategyDescriptor,
  createEnterpriseG7UnitBaselineDescriptor,
} from "../packages/enterprise/src/index.js";

const ROOT = path.resolve("docs/reorganization/client-matter-os");
const REQUIRED_TUWS = [
  "LFOS-G7-W15-T001",
  "LFOS-G7-W15-T002",
  "LFOS-G7-W15-T003",
  "LFOS-G7-W15-T004",
  "LFOS-G7-W15-T005",
  "LFOS-G7-W15-T006",
];
const REQUIRED_FILES = [
  path.join(ROOT, "11-full-tuw-catalog.md"),
  path.join(ROOT, "56-g7-enterprise-hardening-entry-plan.md"),
  path.join(ROOT, "61-g7-e-migration-cutover-closeout-report.md"),
  path.join(ROOT, "62-g7-f-qa-security-baseline-report.md"),
  path.resolve("contracts/enterprise-saas-hardening-contract.json"),
  path.resolve("packages/enterprise/src/client-matter-g7.js"),
  path.resolve("packages/enterprise/src/index.js"),
  path.resolve("packages/enterprise/test/client-matter-g7-qa-security-baseline.test.js"),
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

const tenant_id = "tenant_g7f_validator";

for (const file of REQUIRED_FILES) {
  if (!(await exists(file))) addFinding("MISSING_FILE", "Missing G7-F validation dependency.", { file });
}

if (findings.length === 0) {
  const catalog = await readText(path.join(ROOT, "11-full-tuw-catalog.md"));
  const plan = await readText(path.join(ROOT, "56-g7-enterprise-hardening-entry-plan.md"));
  const g7eReport = await readText(path.join(ROOT, "61-g7-e-migration-cutover-closeout-report.md"));
  const report = await readText(path.join(ROOT, "62-g7-f-qa-security-baseline-report.md"));
  const source = await readText(path.resolve("packages/enterprise/src/client-matter-g7.js"));
  const index = await readText(path.resolve("packages/enterprise/src/index.js"));
  const test = await readText(path.resolve("packages/enterprise/test/client-matter-g7-qa-security-baseline.test.js"));
  const pkg = await readJson(path.resolve("package.json"));
  const rp26Contract = await readJson(path.resolve("contracts/enterprise-saas-hardening-contract.json"));

  for (const tuwId of REQUIRED_TUWS) {
    requireIncludes(catalog, tuwId, "MISSING_CATALOG_TUW", "G7-F TUW missing from full catalog.");
    requireIncludes(plan, tuwId, "MISSING_PLAN_TUW", "G7-F TUW missing from G7 entry plan.");
    requireIncludes(report, tuwId, "MISSING_REPORT_TUW", "G7-F TUW missing from G7-F report.");
  }

  requireIncludes(g7eReport, "G7-E Migration Cutover Closeout Report", "MISSING_G7E_HANDOFF", "G7-F must retain the G7-E handoff report dependency.");

  for (const phrase of [
    "G7-F QA Security Baseline Report",
    "This slice does not claim G7 runtime readiness",
    "test strategy",
    "unit test baseline",
    "integration test baseline",
    "permission negative tests",
    "audit completeness tests",
    "idempotency tests",
    "security approval",
    "go-live approval",
  ]) {
    requireIncludes(report, phrase, "MISSING_REPORT_PHRASE", "G7-F report missing required boundary or scope phrase.");
  }

  for (const symbol of [
    "ENTERPRISE_G7F_TUW_COVERAGE",
    "createEnterpriseG7TestStrategyDescriptor",
    "createEnterpriseG7UnitBaselineDescriptor",
    "createEnterpriseG7IntegrationBaselineDescriptor",
    "createEnterpriseG7PermissionNegativeDescriptor",
    "createEnterpriseG7AuditCompletenessDescriptor",
    "createEnterpriseG7IdempotencyBaselineDescriptor",
    "createEnterpriseG7FQaSecurityBaselineCloseoutDescriptor",
  ]) {
    requireIncludes(source, `export ${symbol === "ENTERPRISE_G7F_TUW_COVERAGE" ? "const" : "function"} ${symbol}`, "MISSING_ENTERPRISE_SOURCE_EXPORT", "G7-F enterprise export missing.");
    requireIncludes(test, symbol, "MISSING_ENTERPRISE_TEST_MARKER", "G7-F enterprise export missing test coverage.");
  }

  requireIncludes(index, "client-matter-g7.js", "MISSING_ENTERPRISE_INDEX_EXPORT", "Enterprise index must export G7 Client-Matter descriptors.");

  for (const marker of [
    "test_strategy_pm_qa_review_required",
    "unit_baseline_coverage_threshold_required",
    "integration_baseline_key_workflow_pass_required",
    "permission_negative_unauthorized_blocked_required",
    "audit_completeness_every_write_event_required",
    "idempotency_duplicate_command_safe_required",
    "qa_security_baseline_tuw_coverage_required",
    "qa_security_baseline_go_live_claim_blocked",
  ]) {
    requireIncludes(source, marker, "MISSING_ENTERPRISE_SOURCE_MARKER", "G7-F enterprise source missing required marker.");
  }

  if (pkg.scripts?.["client-matter:g7f:validate"] !== "node scripts/validate-client-matter-os-g7-f.mjs") {
    addFinding("MISSING_NPM_SCRIPT", "package.json must expose client-matter:g7f:validate.");
  }

  if (
    rp26Contract.program_contract?.program_id !== "RP26" ||
    !hasKeyValue(rp26Contract, "descriptor_only", true) ||
    !hasKeyValue(rp26Contract, "enterprise_trust_claimed", false) ||
    !hasKeyValue(rp26Contract, "security_monitoring_runtime_opened", false) ||
    !hasKeyValue(rp26Contract, "persists_idempotency_key", false)
  ) {
    addFinding("RP26_CONTRACT_BOUNDARY", "RP26 Enterprise SaaS contract must remain descriptor-only without enterprise trust or runtime claims.");
  }

  const strategy = createEnterpriseG7TestStrategyDescriptor({
    tenant_id,
    test_strategy: {
      strategy_doc_ref: "strategy_g7f_validator",
      pm_qa_review_required: true,
      pm_qa_review_marker_ref: "pm_qa_marker_g7f_validator",
      risk_matrix_ref: "risk_matrix_g7f_validator",
      workflow_coverage_matrix_ref: "workflow_coverage_g7f_validator",
    },
  });
  const unit = createEnterpriseG7UnitBaselineDescriptor({
    tenant_id,
    unit_baseline: {
      unit_suite_ref: "unit_suite_g7f_validator",
      unit_suite_inventory_reviewed: true,
      coverage_threshold_ref: "coverage_threshold_g7f_validator",
      coverage_threshold_percent: 80,
      coverage_threshold_reviewed: true,
      failure_budget_ref: "failure_budget_g7f_validator",
    },
  });
  const integration = createEnterpriseG7IntegrationBaselineDescriptor({
    tenant_id,
    integration_baseline: {
      integration_suite_ref: "integration_suite_g7f_validator",
      workflow_list_ref: "workflow_list_g7f_validator",
      key_workflows_passed: true,
      environment_isolated: true,
    },
  });
  const permission = createEnterpriseG7PermissionNegativeDescriptor({
    tenant_id,
    permission_negative: {
      negative_suite_ref: "negative_suite_g7f_validator",
      unauthorized_access_blocked: true,
      deny_matrix_ref: "deny_matrix_g7f_validator",
      deny_over_allow_tested: true,
    },
  });
  const audit = createEnterpriseG7AuditCompletenessDescriptor({
    tenant_id,
    audit_completeness: {
      write_event_matrix_ref: "write_event_matrix_g7f_validator",
      every_write_has_event: true,
      audit_event_schema_ref: "audit_schema_g7f_validator",
      audit_event_schema_reviewed: true,
    },
  });
  const idempotency = createEnterpriseG7IdempotencyBaselineDescriptor({
    tenant_id,
    idempotency_baseline: {
      idempotency_suite_ref: "idempotency_suite_g7f_validator",
      duplicate_commands_safe: true,
      idempotency_key_ref: "idempotency_key_g7f_validator",
      replay_protection_tested: true,
    },
  });
  const closeout = createEnterpriseG7FQaSecurityBaselineCloseoutDescriptor({
    tenant_id,
    g7e_handoff_validated: true,
    rp26_contract_validated: true,
    descriptors: [strategy, unit, integration, permission, audit, idempotency],
  });

  if (strategy.outcome !== "review_required" || strategy.test_strategy_receipt.pm_qa_review_required !== true) {
    addFinding("TEST_STRATEGY", "Test strategy descriptor must require PM/QA review evidence.");
  }
  if (unit.outcome !== "review_required" || unit.unit_baseline_receipt.coverage_threshold_reviewed !== true) {
    addFinding("UNIT_BASELINE", "Unit baseline descriptor must require coverage threshold evidence.");
  }
  if (integration.outcome !== "review_required" || integration.integration_baseline_receipt.key_workflows_passed !== true) {
    addFinding("INTEGRATION_BASELINE", "Integration baseline descriptor must require key workflow pass evidence.");
  }
  if (permission.outcome !== "review_required" || permission.permission_negative_receipt.unauthorized_access_blocked !== true) {
    addFinding("PERMISSION_NEGATIVE", "Permission negative descriptor must require unauthorized access blocking evidence.");
  }
  if (audit.outcome !== "review_required" || audit.audit_completeness_receipt.every_write_has_event !== true) {
    addFinding("AUDIT_COMPLETENESS", "Audit completeness descriptor must require every-write audit evidence.");
  }
  if (idempotency.outcome !== "review_required" || idempotency.idempotency_baseline_receipt.duplicate_commands_safe !== true) {
    addFinding("IDEMPOTENCY_BASELINE", "Idempotency baseline descriptor must require duplicate command safety evidence.");
  }
  if (
    closeout.outcome !== "review_required" ||
    closeout.tuw_coverage.length !== 6 ||
    closeout.closeout_receipt.security_approval_claimed !== false ||
    closeout.closeout_receipt.runtime_readiness_claim !== "open" ||
    closeout.closeout_receipt.go_live_approval_claimed !== false
  ) {
    addFinding("G7F_CLOSEOUT", "G7-F closeout must summarize six TUWs while keeping security approval and go-live open.");
  }
}

if (findings.length > 0) {
  console.error("Client-Matter OS G7-F validation failed:");
  for (const finding of findings) {
    console.error(`- ${finding.code}: ${finding.message}`);
    if (Object.keys(finding.details).length > 0) {
      console.error(`  ${JSON.stringify(finding.details)}`);
    }
  }
  process.exit(1);
}

console.log("Client-Matter OS G7-F validation passed.");
console.log("g7f_tuws: LFOS-G7-W15-T001/LFOS-G7-W15-T002/LFOS-G7-W15-T003/LFOS-G7-W15-T004/LFOS-G7-W15-T005/LFOS-G7-W15-T006");
console.log("test_strategy: pm_qa_review_required");
console.log("unit_integration_baseline: coverage_threshold_key_workflows_required");
console.log("permission_audit: unauthorized_blocked_every_write_event_required");
console.log("idempotency: duplicate_commands_safe_required");
console.log("qa_security_baseline: security_approval_open_go_live_open");
