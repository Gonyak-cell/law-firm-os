#!/usr/bin/env node
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import {
  createHrxG7CPeopleGuardrailsCloseoutDescriptor,
  createHrxG7CandidateSeparationDescriptor,
  createHrxG7CapacityProfileDescriptor,
  createHrxG7EmployeeSchemaDescriptor,
  createHrxG7EvaluationAccessDescriptor,
  createHrxG7HrDocumentGuardrailDescriptor,
  createHrxG7UserEmployeeSeparationDescriptor,
  createHrxG7WorkloadReadModelDescriptor,
} from "../packages/hrx/src/index.js";

const ROOT = path.resolve("docs/reorganization/client-matter-os");
const REQUIRED_TUWS = [
  "LFOS-G7-W13-T001",
  "LFOS-G7-W13-T002",
  "LFOS-G7-W13-T003",
  "LFOS-G7-W13-T004",
  "LFOS-G7-W13-T005",
  "LFOS-G7-W13-T006",
  "LFOS-G7-W13-T007",
  "LFOS-G7-W13-T008",
];
const REQUIRED_FILES = [
  path.join(ROOT, "11-full-tuw-catalog.md"),
  path.join(ROOT, "56-g7-enterprise-hardening-entry-plan.md"),
  path.join(ROOT, "58-g7-b-ops-commercial-closeout-report.md"),
  path.join(ROOT, "59-g7-c-hrx-people-guardrails-report.md"),
  path.resolve("contracts/hrx-people-contract.json"),
  path.resolve("packages/hrx/src/client-matter-g7.js"),
  path.resolve("packages/hrx/src/index.js"),
  path.resolve("packages/hrx/test/client-matter-g7-people-guardrails.test.js"),
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

const tenant_id = "tenant_g7c_validator";

for (const file of REQUIRED_FILES) {
  if (!(await exists(file))) addFinding("MISSING_FILE", "Missing G7-C validation dependency.", { file });
}

if (findings.length === 0) {
  const catalog = await readText(path.join(ROOT, "11-full-tuw-catalog.md"));
  const plan = await readText(path.join(ROOT, "56-g7-enterprise-hardening-entry-plan.md"));
  const g7bReport = await readText(path.join(ROOT, "58-g7-b-ops-commercial-closeout-report.md"));
  const report = await readText(path.join(ROOT, "59-g7-c-hrx-people-guardrails-report.md"));
  const source = await readText(path.resolve("packages/hrx/src/client-matter-g7.js"));
  const index = await readText(path.resolve("packages/hrx/src/index.js"));
  const test = await readText(path.resolve("packages/hrx/test/client-matter-g7-people-guardrails.test.js"));
  const pkg = await readJson(path.resolve("package.json"));
  const contract = await readJson(path.resolve("contracts/hrx-people-contract.json"));

  for (const tuwId of REQUIRED_TUWS) {
    requireIncludes(catalog, tuwId, "MISSING_CATALOG_TUW", "G7-C TUW missing from full catalog.");
    requireIncludes(plan, tuwId, "MISSING_PLAN_TUW", "G7-C TUW missing from G7 entry plan.");
    requireIncludes(report, tuwId, "MISSING_REPORT_TUW", "G7-C TUW missing from G7-C report.");
  }

  requireIncludes(g7bReport, "G7-B Ops Commercial Closeout Report", "MISSING_G7B_HANDOFF", "G7-C must retain the G7-B handoff report dependency.");

  for (const phrase of [
    "G7-C HRX People Guardrails Report",
    "This slice does not claim G7 runtime readiness",
    "User/Employee separation spec",
    "Employee schema",
    "capacity profile",
    "workload read model",
    "HR document guardrail",
    "evaluation access control",
    "candidate data separation",
    "HRX closeout",
    "go-live approval",
  ]) {
    requireIncludes(report, phrase, "MISSING_REPORT_PHRASE", "G7-C report missing required boundary or scope phrase.");
  }

  for (const symbol of [
    "HRX_G7C_TUW_COVERAGE",
    "createHrxG7UserEmployeeSeparationDescriptor",
    "createHrxG7EmployeeSchemaDescriptor",
    "createHrxG7CapacityProfileDescriptor",
    "createHrxG7WorkloadReadModelDescriptor",
    "createHrxG7HrDocumentGuardrailDescriptor",
    "createHrxG7EvaluationAccessDescriptor",
    "createHrxG7CandidateSeparationDescriptor",
    "createHrxG7CPeopleGuardrailsCloseoutDescriptor",
  ]) {
    requireIncludes(source, `export ${symbol === "HRX_G7C_TUW_COVERAGE" ? "const" : "function"} ${symbol}`, "MISSING_HRX_SOURCE_EXPORT", "G7-C HRX export missing.");
    requireIncludes(test, symbol, "MISSING_HRX_TEST_MARKER", "G7-C HRX export missing test coverage.");
  }

  requireIncludes(index, "client-matter-g7.js", "MISSING_HRX_INDEX_EXPORT", "HRX index must export G7 Client-Matter descriptors.");

  for (const marker of [
    "user_employee_no_conflation_review_required",
    "employee_user_ref_optional_controlled_required",
    "capacity_profile_utilization_denominator_required",
    "workload_matter_time_aggregation_required",
    "hr_document_non_hr_denied_required",
    "evaluation_access_audit_on_read_required",
    "candidate_crm_party_contamination_blocked",
    "hrx_guardrails_tuw_coverage_required",
    "hrx_guardrails_go_live_claim_blocked",
  ]) {
    requireIncludes(source, marker, "MISSING_HRX_SOURCE_MARKER", "G7-C HRX source missing required marker.");
  }

  if (pkg.scripts?.["client-matter:g7c:validate"] !== "node scripts/validate-client-matter-os-g7-c.mjs") {
    addFinding("MISSING_NPM_SCRIPT", "package.json must expose client-matter:g7c:validate.");
  }

  if (
    contract.program_contract?.program_id !== "RP30" ||
    contract.program_contract?.hrx_embedded !== true ||
    contract.program_contract?.separate_product !== false ||
    !hasKeyValue(contract, "descriptor_only", true) ||
    !hasKeyValue(contract, "runtime_execution", false) ||
    !hasKeyValue(contract, "product_state_written", false)
  ) {
    addFinding("HRX_CONTRACT_BOUNDARY", "RP30 HRX contract must remain embedded descriptor-only no-runtime evidence.");
  }

  const separation = createHrxG7UserEmployeeSeparationDescriptor({
    tenant_id,
    separation_review: {
      no_conflation_reviewed: true,
      user_identity_source: "iam_user",
      employee_identity_source: "hrx_employee",
    },
  });
  const employee = createHrxG7EmployeeSchemaDescriptor({
    tenant_id,
    employee: {
      employee_id: "employee_g7c_validator",
      user_ref: "user_g7c_validator",
      user_ref_controlled: true,
      user_ref_purpose: "login_mapping",
    },
  });
  const capacity = createHrxG7CapacityProfileDescriptor({
    tenant_id,
    capacity_profile: {
      employee_id: "employee_g7c_validator",
      denominator_hours: 160,
      utilization_denominator_ref: "denominator_g7c_validator",
    },
  });
  const workload = createHrxG7WorkloadReadModelDescriptor({
    tenant_id,
    workload_read_model: {
      model_id: "workload_g7c_validator",
      matter_time_aggregation_ref: "matter_time_rollup_g7c_validator",
      time_entry_aggregation_tested: true,
    },
  });
  const document = createHrxG7HrDocumentGuardrailDescriptor({
    tenant_id,
    hr_document: {
      document_id: "hr_doc_g7c_validator",
      hr_acl_checked: true,
      non_hr_denied: true,
    },
  });
  const evaluation = createHrxG7EvaluationAccessDescriptor({
    tenant_id,
    evaluation_record: {
      evaluation_id: "evaluation_g7c_validator",
      authorized_reviewer: true,
      audit_on_read: true,
      audit_hint_ref: "audit_hint_g7c_validator",
    },
  });
  const candidate = createHrxG7CandidateSeparationDescriptor({
    tenant_id,
    candidate: {
      candidate_id: "candidate_g7c_validator",
      separated_from_crm_party: true,
      no_crm_party_contamination: true,
    },
  });
  const closeout = createHrxG7CPeopleGuardrailsCloseoutDescriptor({
    tenant_id,
    g7b_handoff_validated: true,
    rp30_contract_validated: true,
    descriptors: [
      separation,
      employee,
      capacity,
      workload,
      document,
      evaluation,
      candidate,
      { tuw_id: "LFOS-G7-W13-T008", outcome: "review_required" },
    ],
  });

  if (separation.outcome !== "review_required" || separation.separation_receipt.no_conflation_reviewed !== true) {
    addFinding("USER_EMPLOYEE_SEPARATION", "User/Employee separation descriptor must require no-conflation review.");
  }
  if (employee.outcome !== "review_required" || employee.employee_schema_receipt.user_ref_optional_or_controlled !== true) {
    addFinding("EMPLOYEE_SCHEMA", "Employee schema descriptor must keep User ref optional/controlled.");
  }
  if (capacity.outcome !== "review_required" || capacity.capacity_profile_receipt.utilization_denominator_tested !== true) {
    addFinding("CAPACITY_PROFILE", "Capacity profile descriptor must require utilization denominator evidence.");
  }
  if (workload.outcome !== "review_required" || workload.workload_read_model_receipt.matter_time_aggregation_tested !== true) {
    addFinding("WORKLOAD_READ_MODEL", "Workload read model descriptor must require matter/time aggregation evidence.");
  }
  if (document.outcome !== "review_required" || document.hr_document_guardrail_receipt.non_hr_denied_tested !== true) {
    addFinding("HR_DOCUMENT_GUARDRAIL", "HR document guardrail descriptor must require non-HR denied evidence.");
  }
  if (evaluation.outcome !== "review_required" || evaluation.evaluation_access_receipt.audit_on_read_tested !== true) {
    addFinding("EVALUATION_ACCESS", "Evaluation access descriptor must require audit-on-read evidence.");
  }
  if (candidate.outcome !== "review_required" || candidate.candidate_separation_receipt.crm_party_contamination_tested !== true) {
    addFinding("CANDIDATE_SEPARATION", "Candidate separation descriptor must block CRM/Party contamination.");
  }
  if (
    closeout.outcome !== "review_required" ||
    closeout.tuw_coverage.length !== 8 ||
    closeout.closeout_receipt.runtime_readiness_claim !== "open" ||
    closeout.closeout_receipt.go_live_approval_claimed !== false
  ) {
    addFinding("G7C_CLOSEOUT", "G7-C closeout must summarize eight TUWs while keeping readiness and go-live open.");
  }
}

if (findings.length > 0) {
  console.error("Client-Matter OS G7-C validation failed:");
  for (const finding of findings) {
    console.error(`- ${finding.code}: ${finding.message}`);
    if (Object.keys(finding.details).length > 0) {
      console.error(`  ${JSON.stringify(finding.details)}`);
    }
  }
  process.exit(1);
}

console.log("Client-Matter OS G7-C validation passed.");
console.log("g7c_tuws: LFOS-G7-W13-T001/LFOS-G7-W13-T002/LFOS-G7-W13-T003/LFOS-G7-W13-T004/LFOS-G7-W13-T005/LFOS-G7-W13-T006/LFOS-G7-W13-T007/LFOS-G7-W13-T008");
console.log("user_employee_separation: no_conflation_required");
console.log("employee_schema: optional_controlled_user_ref");
console.log("capacity_workload: denominator_and_aggregation_required");
console.log("hr_documents_evaluations: hr_acl_and_audit_on_read_required");
console.log("candidate_separation: crm_party_contamination_blocked");
console.log("hrx_closeout: enterprise_trust_open_go_live_open");
