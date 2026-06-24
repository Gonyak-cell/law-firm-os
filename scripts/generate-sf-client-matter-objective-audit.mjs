#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const ROOT = process.cwd();
const OUTPUT_PATH = "docs/goal-closeout/sf-client-matter-parity/objective-completion-audit.json";

const files = {
  crosswalk: "workbook/sf-client-matter-parity-crosswalk.md",
  tuwPlan: "workbook/salesforce-parity-tuw-plan.md",
  evidence: "docs/goal-closeout/sf-client-matter-parity/evidence.md",
  browserQaReceipt: "docs/goal-closeout/sf-client-matter-parity/browser-qa-receipt.json",
  currentValidationReceipt: "docs/goal-closeout/sf-client-matter-parity/current-validation-receipt.json",
  screenshotInventory: "docs/goal-closeout/sf-client-matter-parity/salesforce-screenshot-inventory.json",
  surfaceLedger: "docs/goal-closeout/sf-client-matter-parity/surface-connection-ledger.json"
};

const backendContracts = [
  {
    file: "docs/goal-closeout/sf-client-matter-parity/backend-contracts/sf-b-w01-account-contact-contract.json",
    workstream: "SF-B-W01",
    status: "w01r_canonical_write_merge_proposal_route_mounted"
  },
  {
    file: "docs/goal-closeout/sf-client-matter-parity/backend-contracts/sf-b-w02-record-actions-contract.json",
    workstream: "SF-B-W02",
    status: "w02r_record_actions_route_mounted"
  },
  {
    file: "docs/goal-closeout/sf-client-matter-parity/backend-contracts/sf-b-w03-activity-calendar-channel-contract.json",
    workstream: "SF-B-W03",
    status: "w03r_activity_calendar_channel_route_mounted_provider_blocked"
  },
  {
    file: "docs/goal-closeout/sf-client-matter-parity/backend-contracts/sf-b-w04-document-email-builder-contract.json",
    workstream: "SF-B-W04",
    status: "w04r_document_email_builder_route_mounted_owner_provider_blocked"
  },
  {
    file: "docs/goal-closeout/sf-client-matter-parity/backend-contracts/sf-b-w05-import-data-mapping-contract.json",
    workstream: "SF-B-W05",
    status: "w05r_import_data_mapping_route_mounted_owner_blocked"
  },
  {
    file: "docs/goal-closeout/sf-client-matter-parity/backend-contracts/sf-b-w06-permission-admin-contract.json",
    workstream: "SF-B-W06",
    status: "w06r_permission_admin_route_mounted_owner_provider_blocked"
  },
  {
    file: "docs/goal-closeout/sf-client-matter-parity/backend-contracts/sf-b-w07-data-cloud-enrichment-contract.json",
    workstream: "SF-B-W07",
    status: "w07r_data_cloud_enrichment_route_mounted_owner_provider_blocked"
  },
  {
    file: "docs/goal-closeout/sf-client-matter-parity/backend-contracts/sf-b-w08-reporting-builder-contract.json",
    workstream: "SF-B-W08",
    status: "w08r_report_builder_client_profitability_route_mounted_owner_blocked"
  }
];

function read(path) {
  const absolutePath = join(ROOT, path);
  if (!existsSync(absolutePath)) return "";
  return readFileSync(absolutePath, "utf8");
}

function readJson(path) {
  const source = read(path);
  if (!source) return null;
  return JSON.parse(source);
}

function existsCheck(path, label = "file exists") {
  return {
    label,
    evidence_ref: path,
    passed: existsSync(join(ROOT, path))
  };
}

function textCheck(path, pattern, label) {
  return {
    label,
    evidence_ref: path,
    pattern: pattern.source,
    passed: pattern.test(read(path))
  };
}

function valueCheck(label, evidenceRef, passed, actual = undefined) {
  return {
    label,
    evidence_ref: evidenceRef,
    passed: Boolean(passed),
    ...(actual === undefined ? {} : { actual })
  };
}

function evaluateRequirement(requirement) {
  const passed = requirement.checks.every((check) => check.passed);
  return {
    ...requirement,
    status: passed ? "evidence_mapped" : "evidence_missing",
    passed,
    failed_checks: requirement.checks.filter((check) => !check.passed).map((check) => check.label)
  };
}

const screenshotInventory = readJson(files.screenshotInventory);
const surfaceLedger = readJson(files.surfaceLedger);
const currentValidationReceipt = readJson(files.currentValidationReceipt);
const browserQaReceipt = readJson(files.browserQaReceipt);
const contractJson = backendContracts.map((contract) => ({
  ...contract,
  json: readJson(contract.file)
}));

const surfaceRows = surfaceLedger?.rows ?? [];
const expectedSurfaceRows = [
  "SF-SURFACE-A01",
  "SF-SURFACE-A02",
  "SF-SURFACE-B01-ACCOUNT",
  "SF-SURFACE-B01-CONTACT",
  "SF-SURFACE-A03",
  "SF-SURFACE-B02-ACTIONS",
  "SF-SURFACE-B03-TIMELINE",
  "SF-SURFACE-A04-DMS",
  "SF-SURFACE-B05-IMPORT-DATA-MAPPING",
  "SF-SURFACE-B06-PERMISSION-ADMIN",
  "SF-SURFACE-B07-DATA-CLOUD-ENRICHMENT",
  "SF-SURFACE-B08-REPORT-BUILDER-CLIENT-PROFITABILITY",
  "SF-SURFACE-A05-BILLING",
  "SF-SURFACE-A05-ANALYTICS"
];

const requirements = [
  {
    id: "REQ-SF-01-SCREENSHOT-INVENTORY",
    objective_clause: "Salesforce web Mar 2026 screenshots are the reference corpus.",
    evidence_mode: "durable_inventory",
    checks: [
      existsCheck(files.screenshotInventory, "screenshot inventory JSON exists"),
      valueCheck("screenshot inventory schema", files.screenshotInventory, screenshotInventory?.schema_version === "law-firm-os.sf-client-matter-parity.salesforce-screenshot-inventory.v0.1", screenshotInventory?.schema_version),
      valueCheck("source screenshot count is 883", files.screenshotInventory, screenshotInventory?.counts?.source_screenshot_count === 883, screenshotInventory?.counts?.source_screenshot_count),
      valueCheck("derived PNG asset count is 11", files.screenshotInventory, screenshotInventory?.counts?.derived_png_asset_count === 11, screenshotInventory?.counts?.derived_png_asset_count),
      valueCheck("total PNG count is 894", files.screenshotInventory, screenshotInventory?.counts?.png_total_count === 894, screenshotInventory?.counts?.png_total_count),
      valueCheck("no missing or extra source screenshot indices", files.screenshotInventory, screenshotInventory?.counts?.missing_source_index_count === 0 && screenshotInventory?.counts?.extra_source_index_count === 0, {
        missing: screenshotInventory?.counts?.missing_source_index_count,
        extra: screenshotInventory?.counts?.extra_source_index_count
      }),
      valueCheck("feature taxonomy has 10 rows", files.screenshotInventory, (screenshotInventory?.feature_taxonomy ?? []).length === 10, (screenshotInventory?.feature_taxonomy ?? []).length)
    ]
  },
  {
    id: "REQ-SF-02-CROSSWALK-CLASSIFICATION",
    objective_clause: "Salesforce-style Client/Matter capabilities are classified against Law Firm OS state.",
    evidence_mode: "crosswalk_ledger",
    checks: [
      existsCheck(files.crosswalk, "crosswalk ledger exists"),
      textCheck(files.crosswalk, /Implemented/, "implemented status present"),
      textCheck(files.crosswalk, /UI needed/, "UI needed status present"),
      textCheck(files.crosswalk, /Backend contract needed/, "backend contract status present"),
      textCheck(files.crosswalk, /External\/owner gate/, "external owner gate status present"),
      textCheck(files.crosswalk, /Salesforce Account object/, "Account capability classified"),
      textCheck(files.crosswalk, /Salesforce Contact object/, "Contact capability classified"),
      textCheck(files.crosswalk, /Report builder \/ client profitability/, "report builder capability classified"),
      textCheck(files.crosswalk, /Calendar \/ schedule/, "calendar capability classified"),
      textCheck(files.crosswalk, /Document\/email builder/, "document email builder capability classified"),
      textCheck(files.crosswalk, /Import \/ data mapping/, "import mapping capability classified"),
      textCheck(files.crosswalk, /Permission sets \/ admin setup/, "permission admin capability classified"),
      textCheck(files.crosswalk, /Data Cloud \/ enrichment/, "Data Cloud capability classified")
    ]
  },
  {
    id: "REQ-SF-03-UI-API-PACKAGE-CONNECTION",
    objective_clause: "Current UI menu, Client/Matter screens, apps/api routes, package services, and apiClient state are contrasted.",
    evidence_mode: "surface_connection_ledger",
    checks: [
      existsCheck(files.surfaceLedger, "surface connection ledger exists"),
      valueCheck("surface ledger schema", files.surfaceLedger, surfaceLedger?.schema_version === "law-firm-os.sf-client-matter-parity.surface-connection-ledger.v0.1", surfaceLedger?.schema_version),
      valueCheck("surface row count is 14", files.surfaceLedger, surfaceLedger?.summary?.row_count === 14, surfaceLedger?.summary?.row_count),
      valueCheck("connected implemented row count is 14", files.surfaceLedger, surfaceLedger?.summary?.connected_implemented_row_count === 14, surfaceLedger?.summary?.connected_implemented_row_count),
      valueCheck("disconnected implemented row count is 0", files.surfaceLedger, surfaceLedger?.summary?.disconnected_implemented_row_count === 0, surfaceLedger?.summary?.disconnected_implemented_row_count),
      valueCheck("all expected surface row ids present", files.surfaceLedger, expectedSurfaceRows.every((id) => surfaceRows.some((row) => row.id === id)), surfaceRows.map((row) => row.id))
    ]
  },
  {
    id: "REQ-SF-04-IMPLEMENTED-BACKEND-UI-ENTRYPOINTS",
    objective_clause: "Already implemented backend features have real UI entrypoints, route/section/workspace state, permission or audit boundaries, and evidence.",
    evidence_mode: "surface_group_checks",
    checks: [
      valueCheck("every implemented row is connected", files.surfaceLedger, surfaceRows.every((row) => row.connection_status === "ui_api_package_connected"), surfaceRows.map((row) => `${row.id}:${row.connection_status}`)),
      valueCheck("every row has UI menu evidence", files.surfaceLedger, surfaceRows.every((row) => row.group_status?.ui_menu?.passed === true && row.group_status.ui_menu.required_count > 0)),
      valueCheck("every row has UI surface evidence", files.surfaceLedger, surfaceRows.every((row) => row.group_status?.ui_surface?.passed === true && row.group_status.ui_surface.required_count > 0)),
      valueCheck("every row has apiClient evidence", files.surfaceLedger, surfaceRows.every((row) => row.group_status?.api_client?.passed === true && row.group_status.api_client.required_count > 0)),
      valueCheck("every row has apps/api route evidence", files.surfaceLedger, surfaceRows.every((row) => row.group_status?.api_route?.passed === true && row.group_status.api_route.required_count > 0)),
      valueCheck("every row has package service evidence", files.surfaceLedger, surfaceRows.every((row) => row.group_status?.package_service?.passed === true && row.group_status.package_service.required_count > 0)),
      valueCheck("every row has QA or artifact evidence", files.surfaceLedger, surfaceRows.every((row) => row.group_status?.evidence?.passed === true && row.group_status.evidence.required_count > 0))
    ]
  },
  {
    id: "REQ-SF-05-ROUTE-CONTRACT-GATES",
    objective_clause: "Salesforce-visible capabilities are either route-mounted or explicitly owner/provider-blocked, without fake success UI.",
    evidence_mode: "backend_contracts",
    checks: [
      ...backendContracts.map((contract) => existsCheck(contract.file, `${contract.workstream} contract exists`)),
      valueCheck("all expected route contract workstreams present", "docs/goal-closeout/sf-client-matter-parity/backend-contracts", backendContracts.every((contract) => contractJson.some((item) => item.json?.workstream === contract.workstream)), contractJson.map((item) => item.json?.workstream)),
      valueCheck("all backend contracts have expected status", "docs/goal-closeout/sf-client-matter-parity/backend-contracts", contractJson.every((item) => item.json?.status === item.status), contractJson.map((item) => `${item.workstream}:${item.json?.status}`)),
      valueCheck("all backend contracts carry route policy contracts", "docs/goal-closeout/sf-client-matter-parity/backend-contracts", contractJson.every((item) => Array.isArray(item.json?.route_policy_contract) && item.json.route_policy_contract.length > 0)),
      valueCheck("all backend contracts carry repository/service contracts", "docs/goal-closeout/sf-client-matter-parity/backend-contracts", contractJson.every((item) => item.json?.repository_service_contract !== undefined)),
      valueCheck("all backend contracts carry verification cases", "docs/goal-closeout/sf-client-matter-parity/backend-contracts", contractJson.every((item) => Array.isArray(item.json?.verification_cases) && item.json.verification_cases.length >= 9)),
      valueCheck("all backend contracts carry evidence gates", "docs/goal-closeout/sf-client-matter-parity/backend-contracts", contractJson.every((item) => item.json?.evidence_gate !== undefined || item.json?.evidence_gates !== undefined)),
      valueCheck("all backend contracts carry owner or external decision boundaries", "docs/goal-closeout/sf-client-matter-parity/backend-contracts", contractJson.every((item) => item.json?.owner_decisions !== undefined || item.json?.owner_decisions_required !== undefined || item.json?.external_provider_dependencies !== undefined)),
      valueCheck("all backend contracts avoid production/go-live/trust claims", "docs/goal-closeout/sf-client-matter-parity/backend-contracts", contractJson.every((item) => item.json?.production_ready_claim === false && item.json?.go_live_claim === false && item.json?.enterprise_trust_claim === false))
    ]
  },
  {
    id: "REQ-SF-06-WP-TUW-VC-EVIDENCE-PYRAMID",
    objective_clause: "The SF-CLIENT-MATTER-PARITY program is organized by WP/TUW/VC/Evidence hierarchy.",
    evidence_mode: "tuw_plan",
    checks: [
      existsCheck(files.tuwPlan, "TUW pyramid plan exists"),
      textCheck(files.tuwPlan, /SP3\s*\|\s*Work Package/, "WP hierarchy declared"),
      textCheck(files.tuwPlan, /TUW/, "TUW units declared"),
      textCheck(files.tuwPlan, /Verification cases/, "verification case section declared"),
      textCheck(files.tuwPlan, /VC-SF-API-001/, "API VC baseline declared"),
      textCheck(files.tuwPlan, /VC-SF-UI-001/, "UI VC baseline declared"),
      textCheck(files.tuwPlan, /VC-SF-MANUAL-001/, "manual QA VC declared"),
      textCheck(files.tuwPlan, /QA-G1/, "evidence gate declared")
    ]
  },
  {
    id: "REQ-SF-07-VALIDATION-EVIDENCE-BOUND",
    objective_clause: "LazyCodex/OMO repo verification, npm validators/tests, Playwright QA, and Hermes check-only results are bound as evidence.",
    evidence_mode: "evidence_doc",
    checks: [
      existsCheck(files.evidence, "evidence document exists"),
      existsCheck(files.currentValidationReceipt, "current validation receipt exists"),
      valueCheck("current validation receipt schema", files.currentValidationReceipt, currentValidationReceipt?.schema_version === "law-firm-os.sf-client-matter-parity.current-validation-receipt.v0.1", currentValidationReceipt?.schema_version),
      valueCheck("current validation receipt commands passed", files.currentValidationReceipt, currentValidationReceipt?.summary?.command_count === 18 && currentValidationReceipt?.summary?.passed_count === 18 && currentValidationReceipt?.summary?.failed_count === 0, currentValidationReceipt?.summary),
      valueCheck("current validation receipt includes UI/API/e2e counts", files.currentValidationReceipt, currentValidationReceipt?.summary?.current_ui_regression_tests === 15 && currentValidationReceipt?.summary?.current_api_regression_tests === 60 && currentValidationReceipt?.summary?.current_e2e_tests === 1, currentValidationReceipt?.summary),
      valueCheck("current validation receipt claim boundary false", files.currentValidationReceipt, currentValidationReceipt?.scope?.production_ready_claim === false && currentValidationReceipt?.scope?.go_live_claim === false && currentValidationReceipt?.scope?.enterprise_trust_claim === false),
      existsCheck(files.browserQaReceipt, "browser QA receipt exists"),
      valueCheck("browser QA receipt schema", files.browserQaReceipt, browserQaReceipt?.schema_version === "law-firm-os.sf-client-matter-parity.browser-qa-receipt.v0.1", browserQaReceipt?.schema_version),
      valueCheck("browser QA receipt routes passed", files.browserQaReceipt, browserQaReceipt?.summary?.route_count === 13 && browserQaReceipt?.summary?.check_count === 147 && browserQaReceipt?.summary?.failed_count === 0 && browserQaReceipt?.summary?.passed_count === browserQaReceipt?.summary?.check_count, browserQaReceipt?.summary),
      valueCheck("browser QA receipt claim boundary false", files.browserQaReceipt, browserQaReceipt?.scope?.production_ready_claim === false && browserQaReceipt?.scope?.go_live_claim === false && browserQaReceipt?.scope?.enterprise_trust_claim === false),
      textCheck(files.evidence, /Lazyweb search/, "Lazyweb evidence listed"),
      textCheck(files.evidence, /CodeGraph/, "OMO CodeGraph evidence listed"),
      textCheck(files.evidence, /Browser QA receipt/, "browser QA receipt listed"),
      textCheck(files.evidence, /npm run sf:client-matter-parity:validate/, "SF parity validator command listed"),
      textCheck(files.evidence, /npm run sf:client-matter-parity:browser-qa/, "browser QA command listed"),
      textCheck(files.evidence, /npm --workspace apps\/web run build/, "web build command listed"),
      textCheck(files.evidence, /node --test apps\/api\/test\/cmp-r4-g4-matter\.test\.js/, "API regression command listed"),
      textCheck(files.evidence, /Playwright Client\/Matter click QA/, "Playwright Client/Matter QA listed"),
      textCheck(files.evidence, /Current validation receipt/, "current validation receipt listed"),
      textCheck(files.evidence, /Hermes MCP check-only/, "Hermes check-only evidence listed"),
      textCheck(files.evidence, /Surface connection ledger generation/, "surface ledger generation evidence listed")
    ]
  },
  {
    id: "REQ-SF-08-NO-PREMATURE-CLAIMS",
    objective_clause: "No go-live, production approval, or enterprise trust claim is made without separate human approval.",
    evidence_mode: "claim_boundary",
    checks: [
      valueCheck("screenshot inventory claim boundary false", files.screenshotInventory, screenshotInventory?.boundary?.production_ready_claim === false && screenshotInventory?.boundary?.go_live_claim === false && screenshotInventory?.boundary?.enterprise_trust_claim === false),
      valueCheck("surface ledger claim boundary false", files.surfaceLedger, surfaceLedger?.scope?.production_ready_claim === false && surfaceLedger?.scope?.go_live_claim === false && surfaceLedger?.scope?.enterprise_trust_claim === false),
      textCheck(files.crosswalk, /Boundary: no production approval, no enterprise trust claim, no go-live claim/, "crosswalk states no production/trust/go-live claim"),
      textCheck(files.evidence, /No production, deployment, final approval, or enterprise trust claim is made/, "evidence states no production/trust claim"),
      valueCheck("backend contracts claim boundary false", "docs/goal-closeout/sf-client-matter-parity/backend-contracts", contractJson.every((item) => item.json?.production_ready_claim === false && item.json?.go_live_claim === false && item.json?.enterprise_trust_claim === false))
    ]
  }
];

const evaluatedRequirements = requirements.map(evaluateRequirement);
const failedRequirements = evaluatedRequirements.filter((requirement) => !requirement.passed);

if (failedRequirements.length > 0) {
  throw new Error(`SF Client/Matter objective audit failed: ${failedRequirements.map((requirement) => `${requirement.id}:${requirement.failed_checks.join(",")}`).join("; ")}`);
}

const audit = {
  schema_version: "law-firm-os.sf-client-matter-parity.objective-completion-audit.v0.1",
  program: "SF-CLIENT-MATTER-PARITY",
  audit_date: "2026-06-24",
  scope: {
    evidence_mapping_only: true,
    goal_completion_claim_allowed: false,
    production_ready_claim: false,
    go_live_claim: false,
    enterprise_trust_claim: false
  },
  summary: {
    requirement_count: evaluatedRequirements.length,
    evidence_mapped_count: evaluatedRequirements.filter((requirement) => requirement.passed).length,
    evidence_missing_count: failedRequirements.length,
    backend_contract_count: backendContracts.length,
    surface_connection_row_count: surfaceRows.length,
    current_validation_command_count: currentValidationReceipt?.summary?.command_count ?? null,
    browser_qa_route_count: browserQaReceipt?.summary?.route_count ?? null,
    source_screenshot_count: screenshotInventory?.counts?.source_screenshot_count ?? null
  },
  requirements: evaluatedRequirements
};

mkdirSync(dirname(join(ROOT, OUTPUT_PATH)), { recursive: true });
writeFileSync(join(ROOT, OUTPUT_PATH), `${JSON.stringify(audit, null, 2)}\n`);

console.log(JSON.stringify({
  audit: OUTPUT_PATH,
  requirement_count: audit.summary.requirement_count,
  evidence_mapped_count: audit.summary.evidence_mapped_count,
  evidence_missing_count: audit.summary.evidence_missing_count,
  goal_completion_claim_allowed: audit.scope.goal_completion_claim_allowed
}, null, 2));
