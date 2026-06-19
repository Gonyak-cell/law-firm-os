#!/usr/bin/env node
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import {
  createAdminG7AAdminOpsFoundationCloseoutDescriptor,
  createAdminG7PlanUsageModelDescriptor,
  createAdminG7TenantAdminSettingsDescriptor,
} from "../packages/admin/src/index.js";
import {
  createCommercialG7IncidentRunbookDescriptor,
  createCommercialG7ObservabilityBaselineDescriptor,
  createCommercialG7ReleaseCandidateDescriptor,
} from "../packages/commercial/src/index.js";

const ROOT = path.resolve("docs/reorganization/client-matter-os");
const REQUIRED_TUWS = ["LFOS-G7-W12-T001", "LFOS-G7-W12-T002", "LFOS-G7-W12-T003", "LFOS-G7-W12-T004", "LFOS-G7-W12-T005"];
const REQUIRED_FILES = [
  path.join(ROOT, "11-full-tuw-catalog.md"),
  path.join(ROOT, "56-g7-enterprise-hardening-entry-plan.md"),
  path.join(ROOT, "57-g7-a-admin-ops-foundation-report.md"),
  path.resolve("contracts/admin-console-contract.json"),
  path.resolve("contracts/commercial-readiness-contract.json"),
  path.resolve("packages/admin/src/client-matter-g7.js"),
  path.resolve("packages/admin/test/client-matter-g7-admin-ops-foundation.test.js"),
  path.resolve("packages/commercial/src/client-matter-g7.js"),
  path.resolve("packages/commercial/test/client-matter-g7-admin-ops-foundation.test.js"),
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

const tenant_id = "tenant_g7a_validator";
const actor_id = "actor_g7a_validator";

for (const file of REQUIRED_FILES) {
  if (!(await exists(file))) addFinding("MISSING_FILE", "Missing G7-A validation dependency.", { file });
}

if (findings.length === 0) {
  const catalog = await readText(path.join(ROOT, "11-full-tuw-catalog.md"));
  const plan = await readText(path.join(ROOT, "56-g7-enterprise-hardening-entry-plan.md"));
  const report = await readText(path.join(ROOT, "57-g7-a-admin-ops-foundation-report.md"));
  const adminSource = await readText(path.resolve("packages/admin/src/client-matter-g7.js"));
  const adminIndex = await readText(path.resolve("packages/admin/src/index.js"));
  const adminTest = await readText(path.resolve("packages/admin/test/client-matter-g7-admin-ops-foundation.test.js"));
  const commercialSource = await readText(path.resolve("packages/commercial/src/client-matter-g7.js"));
  const commercialIndex = await readText(path.resolve("packages/commercial/src/index.js"));
  const commercialTest = await readText(path.resolve("packages/commercial/test/client-matter-g7-admin-ops-foundation.test.js"));
  const pkg = await readJson(path.resolve("package.json"));
  const adminContract = await readJson(path.resolve("contracts/admin-console-contract.json"));
  const commercialContract = await readJson(path.resolve("contracts/commercial-readiness-contract.json"));

  for (const tuwId of REQUIRED_TUWS) {
    requireIncludes(catalog, tuwId, "MISSING_CATALOG_TUW", "G7-A TUW missing from full catalog.");
    requireIncludes(plan, tuwId, "MISSING_PLAN_TUW", "G7-A TUW missing from G7 entry plan.");
    requireIncludes(report, tuwId, "MISSING_REPORT_TUW", "G7-A TUW missing from G7-A report.");
  }

  for (const phrase of [
    "G7-A Admin Ops Foundation Report",
    "This slice does not claim G7 runtime readiness",
    "tenant admin settings",
    "plan/usage model",
    "observability baseline",
    "incident runbook model",
    "release candidate model",
    "go-live approval",
  ]) {
    requireIncludes(report, phrase, "MISSING_REPORT_PHRASE", "G7-A report missing required boundary or scope phrase.");
  }

  for (const symbol of [
    "ADMIN_G7A_TUW_COVERAGE",
    "createAdminG7TenantAdminSettingsDescriptor",
    "createAdminG7PlanUsageModelDescriptor",
    "createAdminG7AAdminOpsFoundationCloseoutDescriptor",
  ]) {
    requireIncludes(adminSource, `export ${symbol === "ADMIN_G7A_TUW_COVERAGE" ? "const" : "function"} ${symbol}`, "MISSING_ADMIN_SOURCE_EXPORT", "G7-A admin export missing.");
    requireIncludes(adminTest, symbol, "MISSING_ADMIN_TEST_MARKER", "G7-A admin export missing test coverage.");
  }

  for (const symbol of [
    "COMMERCIAL_G7A_TUW_COVERAGE",
    "createCommercialG7ObservabilityBaselineDescriptor",
    "createCommercialG7IncidentRunbookDescriptor",
    "createCommercialG7ReleaseCandidateDescriptor",
  ]) {
    requireIncludes(commercialSource, `export ${symbol === "COMMERCIAL_G7A_TUW_COVERAGE" ? "const" : "function"} ${symbol}`, "MISSING_COMMERCIAL_SOURCE_EXPORT", "G7-A commercial export missing.");
    requireIncludes(commercialTest, symbol, "MISSING_COMMERCIAL_TEST_MARKER", "G7-A commercial export missing test coverage.");
  }

  requireIncludes(adminIndex, "client-matter-g7.js", "MISSING_ADMIN_INDEX_EXPORT", "Admin index must export G7 Client-Matter descriptors.");
  requireIncludes(commercialIndex, "client-matter-g7.js", "MISSING_COMMERCIAL_INDEX_EXPORT", "Commercial index must export G7 Client-Matter descriptors.");

  for (const marker of [
    "tenant_admin_settings_admin_permission_required",
    "tenant_admin_settings_cross_tenant_blocked",
    "plan_usage_change_audit_required",
    "plan_usage_billing_workflow_review_required",
    "g7_admin_ops_foundation_tuw_coverage_required",
    "g7_admin_ops_go_live_claim_blocked",
  ]) {
    requireIncludes(adminSource, marker, "MISSING_ADMIN_SOURCE_MARKER", "G7-A admin source missing required marker.");
  }

  for (const marker of [
    "observability_route_latency_dashboard_required",
    "observability_customer_data_redaction_required",
    "incident_runbook_lifecycle_required",
    "incident_runbook_escalation_required",
    "release_candidate_approval_required",
    "release_candidate_go_live_claim_blocked",
  ]) {
    requireIncludes(commercialSource, marker, "MISSING_COMMERCIAL_SOURCE_MARKER", "G7-A commercial source missing required marker.");
  }

  if (pkg.scripts?.["client-matter:g7a:validate"] !== "node scripts/validate-client-matter-os-g7-a.mjs") {
    addFinding("MISSING_NPM_SCRIPT", "package.json must expose client-matter:g7a:validate.");
  }

  if (
    adminContract.program?.program_id !== "RP21" ||
    adminContract.program?.descriptor_only !== true ||
    adminContract.program?.authority_boundaries?.admin_runtime_opened !== false
  ) {
    addFinding("ADMIN_CONTRACT_BOUNDARY", "RP21 Admin contract must remain descriptor-only no-runtime evidence.");
  }

  if (
    commercialContract.program_contract?.program_id !== "RP29" ||
    !hasKeyValue(commercialContract, "descriptor_only", true) ||
    !hasKeyValue(commercialContract, "writes_product_state", false)
  ) {
    addFinding("COMMERCIAL_CONTRACT_BOUNDARY", "RP29 Commercial contract must remain descriptor-only no-write evidence.");
  }

  const adminSettings = createAdminG7TenantAdminSettingsDescriptor({
    tenant_id,
    actor_id,
    settings: {
      tenant_id,
      settings_id: "settings_g7a_validator",
      admin_role: "tenant_admin",
      permission_checked: true,
      changed_fields: ["matter_numbering"],
    },
  });
  const planUsage = createAdminG7PlanUsageModelDescriptor({
    tenant_id,
    actor_id,
    plan_usage: {
      tenant_id,
      plan_id: "plan_g7a_validator",
      usage_period_id: "2026-06",
      change_audit_ref: "audit_g7a_validator",
      billing_workflow_ref: "billing_review_g7a_validator",
    },
  });
  const observability = createCommercialG7ObservabilityBaselineDescriptor({
    tenant_id,
    observability: {
      tenant_id,
      metric_refs: ["route_latency_p95"],
      route_latency_dashboard_ref: "dashboard_g7a_validator",
      log_redaction: true,
      customer_data_redacted: true,
    },
  });
  const incident = createCommercialG7IncidentRunbookDescriptor({
    tenant_id,
    incident_runbook: {
      tenant_id,
      runbook_id: "incident_g7a_validator",
      lifecycle_states: ["triage", "contained", "resolved"],
      owner_role: "ops_lead",
      escalation_path: "sev1_to_dri",
      customer_safe_comms: true,
    },
  });
  const release = createCommercialG7ReleaseCandidateDescriptor({
    tenant_id,
    release_candidate: {
      tenant_id,
      release_candidate_id: "rc_g7a_validator",
      approval_required: true,
      approval_gate_ref: "approval_gate_g7a_validator",
      deployment_blocked_until_approved: true,
    },
  });
  const closeout = createAdminG7AAdminOpsFoundationCloseoutDescriptor({
    tenant_id,
    g7_entry_plan_validated: true,
    g6_handoff_validated: true,
    descriptors: [adminSettings, planUsage, observability, incident, release],
  });

  if (adminSettings.outcome !== "review_required" || adminSettings.tenant_admin_settings_receipt.admin_permission_tested !== true) {
    addFinding("TENANT_ADMIN_SETTINGS", "Tenant admin settings descriptor must require admin permission evidence.");
  }
  if (planUsage.outcome !== "review_required" || planUsage.plan_usage_receipt.plan_change_audit_tested !== true) {
    addFinding("PLAN_USAGE", "Plan usage descriptor must require plan-change audit evidence.");
  }
  if (observability.outcome !== "review_required" || observability.observability_receipt.route_latency_dashboard_tested !== true) {
    addFinding("OBSERVABILITY", "Observability descriptor must require route latency dashboard evidence.");
  }
  if (incident.outcome !== "review_required" || incident.incident_runbook_receipt.incident_lifecycle_tested !== true) {
    addFinding("INCIDENT_RUNBOOK", "Incident runbook descriptor must require lifecycle evidence.");
  }
  if (release.outcome !== "review_required" || release.release_candidate_receipt.approval_required_tested !== true) {
    addFinding("RELEASE_CANDIDATE", "Release candidate descriptor must require approval evidence.");
  }
  if (
    closeout.outcome !== "review_required" ||
    closeout.tuw_coverage.length !== 5 ||
    closeout.closeout_receipt.runtime_readiness_claim !== "open" ||
    closeout.closeout_receipt.go_live_approval_claimed !== false
  ) {
    addFinding("G7A_CLOSEOUT", "G7-A closeout must summarize five TUWs while keeping readiness and go-live open.");
  }
}

if (findings.length > 0) {
  console.error("Client-Matter OS G7-A validation failed:");
  for (const finding of findings) {
    console.error(`- ${finding.code}: ${finding.message}`);
    if (Object.keys(finding.details).length > 0) {
      console.error(`  ${JSON.stringify(finding.details)}`);
    }
  }
  process.exit(1);
}

console.log("Client-Matter OS G7-A validation passed.");
console.log("g7a_tuws: LFOS-G7-W12-T001/LFOS-G7-W12-T002/LFOS-G7-W12-T003/LFOS-G7-W12-T004/LFOS-G7-W12-T005");
console.log("tenant_admin_settings: admin_permission_required");
console.log("plan_usage_model: plan_change_audit_required");
console.log("observability_baseline: route_latency_redaction_required");
console.log("incident_runbook: lifecycle_escalation_required");
console.log("release_candidate: approval_required_go_live_open");
console.log("g7_runtime_readiness_claim: open");
