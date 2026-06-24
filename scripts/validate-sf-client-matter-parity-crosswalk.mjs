#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const failures = [];

function read(relativePath) {
  const absolutePath = path.join(ROOT, relativePath);
  if (!existsSync(absolutePath)) {
    failures.push(`missing:${relativePath}`);
    return "";
  }
  return readFileSync(absolutePath, "utf8");
}

function check(source, pattern, label) {
  if (!pattern.test(source)) failures.push(`missing:${label}:${pattern.source}`);
}

function forbid(source, pattern, label) {
  if (pattern.test(source)) failures.push(`forbidden:${label}:${pattern.source}`);
}

function checkFile(relativePath) {
  if (!existsSync(path.join(ROOT, relativePath))) failures.push(`missing:${relativePath}`);
}

function parseJson(relativePath) {
  const source = read(relativePath);
  try {
    return JSON.parse(source);
  } catch (error) {
    failures.push(`invalid_json:${relativePath}:${error.message}`);
    return null;
  }
}

const screenshotDir = "Law Firm OS UI/Salesforce web Mar 2026";
const permissionAdminUiPattern =
  /data-permission-set-admin|data-object-manager-admin|data-connected-apps-admin|createPermissionSet|assignPermissionSet|revokePermissionSetAssignment|patchObjectFieldPolicy|createConnectedApp|disableConnectedApp/;
const dataCloudEnrichmentUiPattern =
  /data-data-cloud-enrichment|data-enrichment-provider-admin|data-identity-resolution|data-unified-profile|data-segment-activation|createDataCloudProvider|createEnrichmentJob|executeEnrichmentJob|fetchEnrichmentResults|runIdentityResolution|fetchUnifiedCustomerProfile|activateDataCloudSegment/;
const reportingBuilderUiPattern =
  /data-report-builder|data-report-query-builder|data-report-share-action|data-client-profitability|createReportDefinition|runReportQuery|shareReportDefinition|fetchAnalyticsClientProfitability|refreshClientProfitability/;
const screenshotInventoryPath = "docs/goal-closeout/sf-client-matter-parity/salesforce-screenshot-inventory.json";
const surfaceConnectionLedgerPath = "docs/goal-closeout/sf-client-matter-parity/surface-connection-ledger.json";
const objectiveCompletionAuditPath = "docs/goal-closeout/sf-client-matter-parity/objective-completion-audit.json";
const currentValidationReceiptPath = "docs/goal-closeout/sf-client-matter-parity/current-validation-receipt.json";
const browserQaReceiptPath = "docs/goal-closeout/sf-client-matter-parity/browser-qa-receipt.json";
const browserQaScreenshotPaths = [
  "docs/goal-closeout/sf-client-matter-parity/artifacts/browser-qa-client-workspace.png",
  "docs/goal-closeout/sf-client-matter-parity/artifacts/browser-qa-client-merge-review.png",
  "docs/goal-closeout/sf-client-matter-parity/artifacts/browser-qa-client-record-actions.png",
  "docs/goal-closeout/sf-client-matter-parity/artifacts/browser-qa-client-import.png",
  "docs/goal-closeout/sf-client-matter-parity/artifacts/browser-qa-client-data-cloud.png",
  "docs/goal-closeout/sf-client-matter-parity/artifacts/browser-qa-client-reports.png",
  "docs/goal-closeout/sf-client-matter-parity/artifacts/browser-qa-matter-list.png",
  "docs/goal-closeout/sf-client-matter-parity/artifacts/browser-qa-matter-record-actions.png",
  "docs/goal-closeout/sf-client-matter-parity/artifacts/browser-qa-matter-command.png",
  "docs/goal-closeout/sf-client-matter-parity/artifacts/browser-qa-matter-vault.png",
  "docs/goal-closeout/sf-client-matter-parity/artifacts/browser-qa-matter-builder-email.png",
  "docs/goal-closeout/sf-client-matter-parity/artifacts/browser-qa-matter-import.png",
  "docs/goal-closeout/sf-client-matter-parity/artifacts/browser-qa-matter-timeline.png",
  "docs/goal-closeout/sf-client-matter-parity/artifacts/browser-qa-matter-calendar.png",
  "docs/goal-closeout/sf-client-matter-parity/artifacts/browser-qa-matter-channel.png",
  "docs/goal-closeout/sf-client-matter-parity/artifacts/browser-qa-people-admin.png"
];
const screenshotAbs = path.join(ROOT, screenshotDir);
let atlasPngCount = 0;
if (!existsSync(screenshotAbs)) {
  failures.push(`missing:${screenshotDir}`);
} else {
  const pngCount = readdirSync(screenshotAbs).filter((entry) => entry.endsWith(".png")).length;
  atlasPngCount = pngCount;
  if (pngCount < 894) failures.push(`salesforce_atlas_png_count:${pngCount}`);
}

const showcase = read(`${screenshotDir}/showcase.html`);
for (const label of [
  "최근 본 항목",
  "전환",
  "소유자 변경",
  "상태 완료 표시",
  "Matter Channel",
  "ERP 청구",
  "캘린더 / 일정",
  "문서 / 이메일",
  "임포트 / 데이터 매핑",
  "권한 세트",
  "Data Cloud",
  "분석"
]) {
  check(showcase, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `showcase:${label}`);
}

const packageJson = parseJson("package.json");
if (packageJson?.scripts?.["sf:client-matter-parity:inventory"] !== "node scripts/generate-sf-client-matter-screenshot-inventory.mjs") {
  failures.push("package:screenshot_inventory_script_missing");
}
if (packageJson?.scripts?.["sf:client-matter-parity:objective-audit"] !== "node scripts/generate-sf-client-matter-objective-audit.mjs") {
  failures.push("package:objective_completion_audit_script_missing");
}
if (packageJson?.scripts?.["sf:client-matter-parity:surface-ledger"] !== "node scripts/generate-sf-client-matter-surface-ledger.mjs") {
  failures.push("package:surface_connection_ledger_script_missing");
}
if (packageJson?.scripts?.["sf:client-matter-parity:browser-qa"] !== "node scripts/run-sf-client-matter-browser-qa.mjs") {
  failures.push("package:browser_qa_script_missing");
}
if (packageJson?.scripts?.["sf:client-matter-parity:validate"] !== "node scripts/validate-sf-client-matter-parity-crosswalk.mjs") {
  failures.push("package:sf_parity_validator_script_missing");
}
checkFile("scripts/generate-sf-client-matter-screenshot-inventory.mjs");
checkFile("scripts/generate-sf-client-matter-objective-audit.mjs");
checkFile("scripts/generate-sf-client-matter-surface-ledger.mjs");
checkFile("scripts/run-sf-client-matter-browser-qa.mjs");
checkFile(screenshotInventoryPath);
checkFile(surfaceConnectionLedgerPath);
checkFile(objectiveCompletionAuditPath);
checkFile(currentValidationReceiptPath);
checkFile(browserQaReceiptPath);
for (const screenshotPath of browserQaScreenshotPaths) {
  checkFile(screenshotPath);
}
const screenshotInventory = parseJson(screenshotInventoryPath);
if (screenshotInventory) {
  if (screenshotInventory.schema_version !== "law-firm-os.sf-client-matter-parity.salesforce-screenshot-inventory.v0.1") {
    failures.push("screenshotInventory:schema_version_mismatch");
  }
  if (screenshotInventory.program !== "SF-CLIENT-MATTER-PARITY") failures.push("screenshotInventory:program_mismatch");
  if (screenshotInventory.source_dir !== screenshotDir) failures.push("screenshotInventory:source_dir_mismatch");
  if (screenshotInventory.showcase_ref !== `${screenshotDir}/showcase.html`) failures.push("screenshotInventory:showcase_ref_mismatch");
  if (screenshotInventory.boundary?.production_ready_claim !== false) failures.push("screenshotInventory:production_ready_claim_not_false");
  if (screenshotInventory.boundary?.go_live_claim !== false) failures.push("screenshotInventory:go_live_claim_not_false");
  if (screenshotInventory.boundary?.enterprise_trust_claim !== false) failures.push("screenshotInventory:enterprise_trust_claim_not_false");
  if (screenshotInventory.counts?.source_screenshot_count !== 883) failures.push(`screenshotInventory:source_count:${screenshotInventory.counts?.source_screenshot_count}`);
  if (screenshotInventory.counts?.showcase_declared_source_count !== 883) failures.push(`screenshotInventory:declared_source_count:${screenshotInventory.counts?.showcase_declared_source_count}`);
  if (screenshotInventory.counts?.derived_png_asset_count !== 11) failures.push(`screenshotInventory:derived_png_count:${screenshotInventory.counts?.derived_png_asset_count}`);
  if (screenshotInventory.counts?.png_total_count !== atlasPngCount) failures.push(`screenshotInventory:png_total_drift:${screenshotInventory.counts?.png_total_count}:${atlasPngCount}`);
  if (screenshotInventory.counts?.contact_sheet_range_count !== 15) failures.push(`screenshotInventory:contact_range_count:${screenshotInventory.counts?.contact_sheet_range_count}`);
  if (screenshotInventory.counts?.missing_source_index_count !== 0) failures.push("screenshotInventory:missing_source_indices_present");
  if (screenshotInventory.counts?.extra_source_index_count !== 0) failures.push("screenshotInventory:extra_source_indices_present");
  if (screenshotInventory.source_index_coverage?.first_index !== 0) failures.push("screenshotInventory:first_index_not_zero");
  if (screenshotInventory.source_index_coverage?.last_index !== 882) failures.push("screenshotInventory:last_index_not_882");
  if (!Array.isArray(screenshotInventory.source_screenshots) || screenshotInventory.source_screenshots.length !== 883) {
    failures.push("screenshotInventory:source_screenshots_length_mismatch");
  }
  if (!Array.isArray(screenshotInventory.derived_png_assets) || screenshotInventory.derived_png_assets.length !== 11) {
    failures.push("screenshotInventory:derived_assets_length_mismatch");
  }
  const featureIds = new Set((screenshotInventory.feature_taxonomy ?? []).map((feature) => feature.id));
  for (const id of ["SF-SHOT-F01", "SF-SHOT-F02", "SF-SHOT-F03", "SF-SHOT-F04", "SF-SHOT-F05", "SF-SHOT-F06", "SF-SHOT-F07", "SF-SHOT-F08", "SF-SHOT-F09", "SF-SHOT-F10"]) {
    if (!featureIds.has(id)) failures.push(`screenshotInventory:missing_feature:${id}`);
  }
  for (const feature of screenshotInventory.feature_taxonomy ?? []) {
    if (!Array.isArray(feature.marker_evidence) || feature.marker_evidence.some((marker) => marker.present !== true || typeof marker.showcase_line !== "number")) {
      failures.push(`screenshotInventory:feature_marker_missing:${feature.id}`);
    }
  }
}

const surfaceConnectionLedger = parseJson(surfaceConnectionLedgerPath);
if (surfaceConnectionLedger) {
  if (surfaceConnectionLedger.schema_version !== "law-firm-os.sf-client-matter-parity.surface-connection-ledger.v0.1") {
    failures.push("surfaceConnectionLedger:schema_version_mismatch");
  }
  if (surfaceConnectionLedger.program !== "SF-CLIENT-MATTER-PARITY") failures.push("surfaceConnectionLedger:program_mismatch");
  if (surfaceConnectionLedger.scope?.production_ready_claim !== false) failures.push("surfaceConnectionLedger:production_ready_claim_not_false");
  if (surfaceConnectionLedger.scope?.go_live_claim !== false) failures.push("surfaceConnectionLedger:go_live_claim_not_false");
  if (surfaceConnectionLedger.scope?.enterprise_trust_claim !== false) failures.push("surfaceConnectionLedger:enterprise_trust_claim_not_false");
  if (surfaceConnectionLedger.summary?.row_count !== 14) failures.push(`surfaceConnectionLedger:row_count:${surfaceConnectionLedger.summary?.row_count}`);
  if (surfaceConnectionLedger.summary?.connected_implemented_row_count !== 14) {
    failures.push(`surfaceConnectionLedger:connected_implemented_row_count:${surfaceConnectionLedger.summary?.connected_implemented_row_count}`);
  }
  if (surfaceConnectionLedger.summary?.disconnected_implemented_row_count !== 0) {
    failures.push(`surfaceConnectionLedger:disconnected_implemented_row_count:${surfaceConnectionLedger.summary?.disconnected_implemented_row_count}`);
  }
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
  const surfaceRows = Array.isArray(surfaceConnectionLedger.rows) ? surfaceConnectionLedger.rows : [];
  if (surfaceRows.length !== expectedSurfaceRows.length) failures.push(`surfaceConnectionLedger:rows_length:${surfaceRows.length}`);
  const surfaceRowIds = new Set(surfaceRows.map((row) => row.id));
  for (const id of expectedSurfaceRows) {
    if (!surfaceRowIds.has(id)) failures.push(`surfaceConnectionLedger:missing_row:${id}`);
  }
  for (const row of surfaceRows) {
    if (!row.parity_status?.startsWith("implemented")) failures.push(`surfaceConnectionLedger:unexpected_status:${row.id}:${row.parity_status}`);
    if (row.connection_status !== "ui_api_package_connected") failures.push(`surfaceConnectionLedger:disconnected_row:${row.id}:${row.connection_status}`);
    for (const group of ["ui_menu", "ui_surface", "api_client", "api_route", "package_service", "evidence"]) {
      const status = row.group_status?.[group];
      if (!status) {
        failures.push(`surfaceConnectionLedger:missing_group:${row.id}:${group}`);
      } else if (status.required_count < 1 || status.passed !== true || status.passed_count !== status.required_count) {
        failures.push(`surfaceConnectionLedger:failed_group:${row.id}:${group}`);
      }
    }
  }
}

const objectiveCompletionAudit = parseJson(objectiveCompletionAuditPath);
if (objectiveCompletionAudit) {
  if (objectiveCompletionAudit.schema_version !== "law-firm-os.sf-client-matter-parity.objective-completion-audit.v0.1") {
    failures.push("objectiveCompletionAudit:schema_version_mismatch");
  }
  if (objectiveCompletionAudit.program !== "SF-CLIENT-MATTER-PARITY") failures.push("objectiveCompletionAudit:program_mismatch");
  if (objectiveCompletionAudit.scope?.evidence_mapping_only !== true) failures.push("objectiveCompletionAudit:evidence_mapping_only_not_true");
  if (objectiveCompletionAudit.scope?.goal_completion_claim_allowed !== false) failures.push("objectiveCompletionAudit:goal_completion_claim_allowed_not_false");
  if (objectiveCompletionAudit.scope?.production_ready_claim !== false) failures.push("objectiveCompletionAudit:production_ready_claim_not_false");
  if (objectiveCompletionAudit.scope?.go_live_claim !== false) failures.push("objectiveCompletionAudit:go_live_claim_not_false");
  if (objectiveCompletionAudit.scope?.enterprise_trust_claim !== false) failures.push("objectiveCompletionAudit:enterprise_trust_claim_not_false");
  if (objectiveCompletionAudit.summary?.requirement_count !== 8) failures.push(`objectiveCompletionAudit:requirement_count:${objectiveCompletionAudit.summary?.requirement_count}`);
  if (objectiveCompletionAudit.summary?.evidence_mapped_count !== 8) failures.push(`objectiveCompletionAudit:evidence_mapped_count:${objectiveCompletionAudit.summary?.evidence_mapped_count}`);
  if (objectiveCompletionAudit.summary?.evidence_missing_count !== 0) failures.push(`objectiveCompletionAudit:evidence_missing_count:${objectiveCompletionAudit.summary?.evidence_missing_count}`);
  if (objectiveCompletionAudit.summary?.backend_contract_count !== 8) failures.push(`objectiveCompletionAudit:backend_contract_count:${objectiveCompletionAudit.summary?.backend_contract_count}`);
  if (objectiveCompletionAudit.summary?.surface_connection_row_count !== 14) failures.push(`objectiveCompletionAudit:surface_connection_row_count:${objectiveCompletionAudit.summary?.surface_connection_row_count}`);
  if (objectiveCompletionAudit.summary?.current_validation_command_count !== 18) failures.push(`objectiveCompletionAudit:current_validation_command_count:${objectiveCompletionAudit.summary?.current_validation_command_count}`);
  if (objectiveCompletionAudit.summary?.browser_qa_route_count !== 13) failures.push(`objectiveCompletionAudit:browser_qa_route_count:${objectiveCompletionAudit.summary?.browser_qa_route_count}`);
  if (objectiveCompletionAudit.summary?.source_screenshot_count !== 883) failures.push(`objectiveCompletionAudit:source_screenshot_count:${objectiveCompletionAudit.summary?.source_screenshot_count}`);
  const expectedObjectiveRequirements = [
    "REQ-SF-01-SCREENSHOT-INVENTORY",
    "REQ-SF-02-CROSSWALK-CLASSIFICATION",
    "REQ-SF-03-UI-API-PACKAGE-CONNECTION",
    "REQ-SF-04-IMPLEMENTED-BACKEND-UI-ENTRYPOINTS",
    "REQ-SF-05-ROUTE-CONTRACT-GATES",
    "REQ-SF-06-WP-TUW-VC-EVIDENCE-PYRAMID",
    "REQ-SF-07-VALIDATION-EVIDENCE-BOUND",
    "REQ-SF-08-NO-PREMATURE-CLAIMS"
  ];
  const objectiveRequirements = Array.isArray(objectiveCompletionAudit.requirements) ? objectiveCompletionAudit.requirements : [];
  const objectiveRequirementIds = new Set(objectiveRequirements.map((requirement) => requirement.id));
  for (const id of expectedObjectiveRequirements) {
    if (!objectiveRequirementIds.has(id)) failures.push(`objectiveCompletionAudit:missing_requirement:${id}`);
  }
  for (const requirement of objectiveRequirements) {
    if (requirement.status !== "evidence_mapped") failures.push(`objectiveCompletionAudit:requirement_not_mapped:${requirement.id}:${requirement.status}`);
    if (requirement.passed !== true) failures.push(`objectiveCompletionAudit:requirement_not_passed:${requirement.id}`);
    if (!Array.isArray(requirement.checks) || requirement.checks.length < 1) failures.push(`objectiveCompletionAudit:missing_checks:${requirement.id}`);
    if ((requirement.failed_checks ?? []).length !== 0) failures.push(`objectiveCompletionAudit:failed_checks:${requirement.id}`);
  }
}

const currentValidationReceipt = parseJson(currentValidationReceiptPath);
const browserQaReceipt = parseJson(browserQaReceiptPath);
if (browserQaReceipt) {
  if (browserQaReceipt.schema_version !== "law-firm-os.sf-client-matter-parity.browser-qa-receipt.v0.1") {
    failures.push("browserQaReceipt:schema_version_mismatch");
  }
  if (browserQaReceipt.program !== "SF-CLIENT-MATTER-PARITY") failures.push("browserQaReceipt:program_mismatch");
  if (browserQaReceipt.scope?.browser_driven_local_surface !== true) failures.push("browserQaReceipt:browser_driven_local_surface_not_true");
  if (browserQaReceipt.scope?.client_matter_only !== true) failures.push("browserQaReceipt:client_matter_only_not_true");
  if (browserQaReceipt.scope?.production_ready_claim !== false) failures.push("browserQaReceipt:production_ready_claim_not_false");
  if (browserQaReceipt.scope?.go_live_claim !== false) failures.push("browserQaReceipt:go_live_claim_not_false");
  if (browserQaReceipt.scope?.enterprise_trust_claim !== false) failures.push("browserQaReceipt:enterprise_trust_claim_not_false");
  if (browserQaReceipt.summary?.route_count !== 13) failures.push(`browserQaReceipt:route_count:${browserQaReceipt.summary?.route_count}`);
  if (browserQaReceipt.summary?.failed_count !== 0) failures.push(`browserQaReceipt:failed_count:${browserQaReceipt.summary?.failed_count}`);
  if (browserQaReceipt.summary?.check_count !== 147) failures.push(`browserQaReceipt:check_count:${browserQaReceipt.summary?.check_count}`);
  if (browserQaReceipt.summary?.passed_count !== browserQaReceipt.summary?.check_count) {
    failures.push(`browserQaReceipt:passed_count:${browserQaReceipt.summary?.passed_count}:${browserQaReceipt.summary?.check_count}`);
  }
  for (const screenshotPath of browserQaScreenshotPaths) {
    if (!Object.values(browserQaReceipt.screenshots ?? {}).includes(screenshotPath)) {
      failures.push(`browserQaReceipt:missing_screenshot_ref:${screenshotPath}`);
    }
  }
  for (const checkResult of browserQaReceipt.checks ?? []) {
    if (checkResult.passed !== true) failures.push(`browserQaReceipt:check_not_passed:${checkResult.label}`);
  }
}
if (currentValidationReceipt) {
  if (currentValidationReceipt.schema_version !== "law-firm-os.sf-client-matter-parity.current-validation-receipt.v0.1") {
    failures.push("currentValidationReceipt:schema_version_mismatch");
  }
  if (currentValidationReceipt.program !== "SF-CLIENT-MATTER-PARITY") failures.push("currentValidationReceipt:program_mismatch");
  if (currentValidationReceipt.scope?.current_worktree_validation !== true) failures.push("currentValidationReceipt:current_worktree_validation_not_true");
  if (currentValidationReceipt.scope?.production_ready_claim !== false) failures.push("currentValidationReceipt:production_ready_claim_not_false");
  if (currentValidationReceipt.scope?.go_live_claim !== false) failures.push("currentValidationReceipt:go_live_claim_not_false");
  if (currentValidationReceipt.scope?.enterprise_trust_claim !== false) failures.push("currentValidationReceipt:enterprise_trust_claim_not_false");
  if (currentValidationReceipt.summary?.command_count !== 18) failures.push(`currentValidationReceipt:command_count:${currentValidationReceipt.summary?.command_count}`);
  if (currentValidationReceipt.summary?.passed_count !== 18) failures.push(`currentValidationReceipt:passed_count:${currentValidationReceipt.summary?.passed_count}`);
  if (currentValidationReceipt.summary?.failed_count !== 0) failures.push(`currentValidationReceipt:failed_count:${currentValidationReceipt.summary?.failed_count}`);
  if (currentValidationReceipt.summary?.current_ui_regression_tests !== 15) failures.push(`currentValidationReceipt:current_ui_regression_tests:${currentValidationReceipt.summary?.current_ui_regression_tests}`);
  if (currentValidationReceipt.summary?.current_api_regression_tests !== 60) failures.push(`currentValidationReceipt:current_api_regression_tests:${currentValidationReceipt.summary?.current_api_regression_tests}`);
  if (currentValidationReceipt.summary?.current_e2e_tests !== 1) failures.push(`currentValidationReceipt:current_e2e_tests:${currentValidationReceipt.summary?.current_e2e_tests}`);
  if (currentValidationReceipt.summary?.current_browser_qa_routes !== 13) failures.push(`currentValidationReceipt:current_browser_qa_routes:${currentValidationReceipt.summary?.current_browser_qa_routes}`);
  if (currentValidationReceipt.summary?.current_browser_qa_checks !== 147) failures.push(`currentValidationReceipt:current_browser_qa_checks:${currentValidationReceipt.summary?.current_browser_qa_checks}`);
  const expectedCommandIds = [
    "SF-CURRENT-UI-REGRESSION",
    "SF-CURRENT-WEB-BUILD",
    "SF-CURRENT-API-REGRESSION",
    "SF-CURRENT-W02-RECORD-ACTIONS-API",
    "SF-CURRENT-W03-ACTIVITY-CALENDAR-CHANNEL-API",
    "SF-CURRENT-W04-DOCUMENT-EMAIL-BUILDER-API",
    "SF-CURRENT-W05-IMPORT-DATA-MAPPING-API",
    "SF-CURRENT-W06-PERMISSION-ADMIN-API",
    "SF-CURRENT-W07-DATA-CLOUD-ENRICHMENT-API",
    "SF-CURRENT-W08-REPORT-BUILDER-CLIENT-PROFITABILITY-API",
    "SF-CURRENT-MATTER-VAULT-E2E",
    "SF-CURRENT-BROWSER-QA",
    "SF-CURRENT-SCREENSHOT-INVENTORY",
    "SF-CURRENT-SURFACE-LEDGER",
    "SF-CURRENT-OBJECTIVE-AUDIT",
    "SF-CURRENT-PARITY-VALIDATOR",
    "SF-CURRENT-HERMES-CORE",
    "SF-CURRENT-HERMES-DESKTOP-AUTHORITY"
  ];
  const commandIds = new Set((currentValidationReceipt.commands ?? []).map((command) => command.id));
  for (const id of expectedCommandIds) {
    if (!commandIds.has(id)) failures.push(`currentValidationReceipt:missing_command:${id}`);
  }
  for (const command of currentValidationReceipt.commands ?? []) {
    if (command.status !== "passed") failures.push(`currentValidationReceipt:command_not_passed:${command.id}:${command.status}`);
  }
}

const crosswalk = read("workbook/sf-client-matter-parity-crosswalk.md");
for (const label of [
  "SF-CLIENT-MATTER-PARITY",
  "Implemented",
  "UI needed",
  "Backend contract needed",
  "External/owner gate",
  "SF-B-W01-ACCOUNT",
  "SF-B-W01-CONTACT",
  "SF-B-W02",
  "SF-B-W03",
  "SF-B-W04",
  "SF-B-W05",
  "SF-B-W06",
  "SF-B-W07",
  "SF-B-W08",
  "scripts/validate-sf-client-matter-parity-crosswalk.mjs",
  "scripts/generate-sf-client-matter-screenshot-inventory.mjs",
  "scripts/generate-sf-client-matter-objective-audit.mjs",
  "scripts/generate-sf-client-matter-surface-ledger.mjs",
  "scripts/run-sf-client-matter-browser-qa.mjs",
  "docs/goal-closeout/sf-client-matter-parity/evidence.md",
  "docs/goal-closeout/sf-client-matter-parity/browser-qa-receipt.json",
  "docs/goal-closeout/sf-client-matter-parity/current-validation-receipt.json",
  "docs/goal-closeout/sf-client-matter-parity/objective-completion-audit.json",
  "docs/goal-closeout/sf-client-matter-parity/salesforce-screenshot-inventory.json",
  "docs/goal-closeout/sf-client-matter-parity/surface-connection-ledger.json",
  "docs/goal-closeout/sf-client-matter-parity/artifacts/client-sections.png",
  "docs/goal-closeout/sf-client-matter-parity/artifacts/matter-sections.png",
  "docs/goal-closeout/sf-client-matter-parity/artifacts/matter-time-entry-action.png",
  "docs/goal-closeout/sf-client-matter-parity/artifacts/matter-billing-actions.png",
  "docs/goal-closeout/sf-client-matter-parity/artifacts/matter-analytics-actions.png",
  "docs/goal-closeout/sf-client-matter-parity/artifacts/matter-audit-trail.png",
  "docs/goal-closeout/sf-client-matter-parity/artifacts/matter-vault-workspace.png",
  "docs/goal-closeout/sf-client-matter-parity/artifacts/matter-document-facade-action.png",
  "docs/goal-closeout/sf-client-matter-parity/artifacts/matter-analytics-export-action.png",
  "docs/goal-closeout/sf-client-matter-parity/artifacts/matter-vault-inventory-search-audit.png",
  "docs/goal-closeout/sf-client-matter-parity/artifacts/client-account-contact-read.png",
  "docs/goal-closeout/sf-client-matter-parity/artifacts/client-account-create-action.png",
  "docs/goal-closeout/sf-client-matter-parity/artifacts/client-contact-create-action.png",
  "docs/goal-closeout/sf-client-matter-parity/artifacts/client-account-patch-action.png",
  "docs/goal-closeout/sf-client-matter-parity/artifacts/client-contact-patch-action.png",
  "docs/goal-closeout/sf-client-matter-parity/artifacts/client-opportunity-handoff-refresh.png",
  "docs/goal-closeout/sf-client-matter-parity/artifacts/matter-status-transition-action.png",
  "docs/goal-closeout/sf-client-matter-parity/artifacts/matter-owner-assignment-action.png",
  "docs/goal-closeout/sf-client-matter-parity/artifacts/matter-record-owner-change-action.png",
  "docs/goal-closeout/sf-client-matter-parity/artifacts/matter-inline-edit-action.png",
  "docs/goal-closeout/sf-client-matter-parity/artifacts/matter-recently-viewed.png",
  "docs/goal-closeout/sf-client-matter-parity/artifacts/matter-activity-timeline-read.png",
  "docs/goal-closeout/sf-client-matter-parity/artifacts/matter-selected-record-workspace.png",
  "docs/goal-closeout/sf-client-matter-parity/artifacts/matter-saved-list-views.png",
  "docs/goal-closeout/sf-client-matter-parity/artifacts/matter-bulk-status-action.png",
  "docs/goal-closeout/sf-client-matter-parity/artifacts/browser-qa-client-workspace.png",
  "docs/goal-closeout/sf-client-matter-parity/artifacts/browser-qa-client-merge-review.png",
  "docs/goal-closeout/sf-client-matter-parity/artifacts/browser-qa-client-record-actions.png",
  "docs/goal-closeout/sf-client-matter-parity/artifacts/browser-qa-client-data-cloud.png",
  "docs/goal-closeout/sf-client-matter-parity/artifacts/browser-qa-client-reports.png",
  "docs/goal-closeout/sf-client-matter-parity/artifacts/browser-qa-matter-list.png",
  "docs/goal-closeout/sf-client-matter-parity/artifacts/browser-qa-matter-record-actions.png",
  "docs/goal-closeout/sf-client-matter-parity/artifacts/browser-qa-matter-command.png",
  "docs/goal-closeout/sf-client-matter-parity/artifacts/browser-qa-matter-vault.png",
  "docs/goal-closeout/sf-client-matter-parity/artifacts/browser-qa-matter-timeline.png",
  "docs/goal-closeout/sf-client-matter-parity/artifacts/browser-qa-people-admin.png",
  "docs/goal-closeout/sf-client-matter-parity/backend-contracts/sf-b-w01-account-contact-contract.json",
  "docs/goal-closeout/sf-client-matter-parity/backend-contracts/sf-b-w02-record-actions-contract.json",
  "docs/goal-closeout/sf-client-matter-parity/backend-contracts/sf-b-w03-activity-calendar-channel-contract.json",
  "docs/goal-closeout/sf-client-matter-parity/backend-contracts/sf-b-w04-document-email-builder-contract.json",
  "docs/goal-closeout/sf-client-matter-parity/backend-contracts/sf-b-w05-import-data-mapping-contract.json",
  "docs/goal-closeout/sf-client-matter-parity/backend-contracts/sf-b-w06-permission-admin-contract.json",
  "docs/goal-closeout/sf-client-matter-parity/backend-contracts/sf-b-w07-data-cloud-enrichment-contract.json",
  "docs/goal-closeout/sf-client-matter-parity/backend-contracts/sf-b-w08-reporting-builder-contract.json",
  "w01r_canonical_write_merge_proposal_route_mounted",
  "w02r_record_actions_route_mounted",
  "w03r_activity_calendar_channel_route_mounted_provider_blocked",
  "w04r_document_email_builder_route_mounted_owner_provider_blocked",
  "w05r_import_data_mapping_route_mounted_owner_blocked",
  "w06r_permission_admin_route_mounted_owner_provider_blocked",
  "w07r_data_cloud_enrichment_route_mounted_owner_provider_blocked",
  "w08r_report_builder_client_profitability_route_mounted_owner_blocked",
  "VC-SF-B-W01-API-001",
  "VC-SF-B-W01-API-009",
  "VC-SF-B-W01-API-010",
  "VC-SF-B-W01-API-011",
  "VC-SF-B-W02-API-001",
  "VC-SF-B-W02-API-009",
  "VC-SF-B-W02-UI-001",
  "VC-SF-B-W02-BROWSER-001",
  "VC-SF-B-W03-API-001",
  "VC-SF-B-W04-API-001",
  "VC-SF-B-W04-API-010",
  "VC-SF-B-W05-API-001",
  "VC-SF-B-W05-API-010",
  "VC-SF-B-W06-API-001",
  "VC-SF-B-W06-API-010",
  "VC-SF-B-W06-UI-001",
  "VC-SF-B-W07-API-001",
  "VC-SF-B-W07-API-010",
  "VC-SF-B-W07-UI-001",
  "VC-SF-B-W08-API-001",
  "VC-SF-B-W08-API-008",
  "VC-SF-B-W08-UI-001",
  "POST /api/matters/:id/documents",
  "/api/vault/audit",
  "Vault document inventory embed",
  "/api/analytics/exports",
  "/api/admin/permission-sets",
  "/api/admin/connected-apps",
  "/api/data-cloud/providers",
  "/api/data-cloud/enrichment-jobs",
  "/api/data-cloud/segment-activations",
  "/api/reports",
  "/api/analytics/client-profitability",
  "ClientProfitability",
  "npm run sf:client-matter-parity:objective-audit",
  "npm run sf:client-matter-parity:surface-ledger",
  "x-lawos-permission-context",
  "simulateAdminPermission",
  "synthetic_crosswalk",
  "matter_core_enrichment",
  "go-live claim"
]) {
  check(crosswalk, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `crosswalk:${label}`);
}

const evidence = read("docs/goal-closeout/sf-client-matter-parity/evidence.md");
for (const label of [
  "SF-CLIENT-MATTER-PARITY",
  "Salesforce screenshot inventory",
  "Objective completion audit",
  "Current validation receipt",
  "Browser QA receipt",
  "docs/goal-closeout/sf-client-matter-parity/current-validation-receipt.json",
  "docs/goal-closeout/sf-client-matter-parity/browser-qa-receipt.json",
  "docs/goal-closeout/sf-client-matter-parity/objective-completion-audit.json",
  "docs/goal-closeout/sf-client-matter-parity/salesforce-screenshot-inventory.json",
  "Surface connection ledger",
  "docs/goal-closeout/sf-client-matter-parity/surface-connection-ledger.json",
  "npm run sf:client-matter-parity:inventory",
  "npm run sf:client-matter-parity:objective-audit",
  "npm run sf:client-matter-parity:surface-ledger",
  "npm run sf:client-matter-parity:browser-qa",
  "npm run sf:client-matter-parity:validate",
  "Web UI regression",
  "API regression",
  "Playwright Client/Matter click QA",
  "Playwright browser QA receipt",
  "Playwright People permission admin QA",
  "Playwright Matter document facade action QA",
  "Playwright Matter analytics export action QA",
  "Playwright Matter Vault inventory/search/audit QA",
  "Playwright Client Account/Contact read QA",
  "Playwright Client Account create QA",
  "Playwright Client Contact create QA",
  "Playwright Client Account patch QA",
  "Playwright Client Contact patch QA",
  "Playwright Client Opportunity handoff refresh QA",
  "Playwright Matter status transition action QA",
  "Playwright Matter owner assignment QA",
  "Playwright Matter record owner change QA",
  "Playwright Matter inline edit QA",
  "Playwright Matter recently viewed QA",
  "Playwright Matter activity timeline read QA",
  "Playwright Matter selected record workspace QA",
  "Playwright Matter saved list views QA",
  "Playwright Matter bulk status action QA",
  "Salesforce screenshot inventory generation",
  "Objective completion audit generation",
  "Current validation receipt",
  "Browser QA receipt generation",
  "Surface connection ledger generation",
  "SF-B-W01R contract JSON parse and invariant QA",
  "SF-B-W02R record actions API regression",
  "Playwright Client record actions QA",
  "Playwright Matter record actions QA",
  "Playwright Client data cloud QA",
  "SF-B-W02R contract JSON parse and invariant QA",
  "SF-B-W03 contract JSON parse and invariant QA",
  "SF-B-W04R document/email builder API regression",
  "SF-B-W05R import/data mapping API regression",
  "SF-B-W05 contract JSON parse and invariant QA",
  "SF-B-W05 tested visible-control search",
  "SF-B-W06 contract JSON parse and invariant QA",
  "SF-B-W06 tested visible-control search",
  "SF-B-W07 contract JSON parse and invariant QA",
  "SF-B-W07 data cloud/enrichment API regression",
  "SF-B-W07 tested visible-control search",
  "SF-B-W08 contract JSON parse and invariant QA",
  "SF-B-W08 report builder/client profitability API regression",
  "SF-B-W08 tested visible-control search",
  "SF-B-W01R Account/Contact API regression",
  "Master Data runtime service regression",
  "Hermes MCP",
  "production approval",
  "go-live"
]) {
  check(evidence, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `evidence:${label}`);
}
checkFile("docs/goal-closeout/sf-client-matter-parity/artifacts/client-sections.png");
checkFile("docs/goal-closeout/sf-client-matter-parity/artifacts/matter-sections.png");
checkFile("docs/goal-closeout/sf-client-matter-parity/artifacts/matter-time-entry-action.png");
checkFile("docs/goal-closeout/sf-client-matter-parity/artifacts/matter-billing-actions.png");
checkFile("docs/goal-closeout/sf-client-matter-parity/artifacts/matter-analytics-actions.png");
checkFile("docs/goal-closeout/sf-client-matter-parity/artifacts/matter-audit-trail.png");
checkFile("docs/goal-closeout/sf-client-matter-parity/artifacts/matter-vault-workspace.png");
checkFile("docs/goal-closeout/sf-client-matter-parity/artifacts/matter-document-facade-action.png");
checkFile("docs/goal-closeout/sf-client-matter-parity/artifacts/matter-analytics-export-action.png");
checkFile("docs/goal-closeout/sf-client-matter-parity/artifacts/matter-vault-inventory-search-audit.png");
checkFile("docs/goal-closeout/sf-client-matter-parity/artifacts/client-account-contact-read.png");
checkFile("docs/goal-closeout/sf-client-matter-parity/artifacts/client-account-create-action.png");
checkFile("docs/goal-closeout/sf-client-matter-parity/artifacts/client-contact-create-action.png");
checkFile("docs/goal-closeout/sf-client-matter-parity/artifacts/client-account-patch-action.png");
checkFile("docs/goal-closeout/sf-client-matter-parity/artifacts/client-contact-patch-action.png");
checkFile("docs/goal-closeout/sf-client-matter-parity/artifacts/client-opportunity-handoff-refresh.png");
checkFile("docs/goal-closeout/sf-client-matter-parity/artifacts/matter-status-transition-action.png");
checkFile("docs/goal-closeout/sf-client-matter-parity/artifacts/matter-owner-assignment-action.png");
checkFile("docs/goal-closeout/sf-client-matter-parity/artifacts/matter-record-owner-change-action.png");
checkFile("docs/goal-closeout/sf-client-matter-parity/artifacts/matter-inline-edit-action.png");
checkFile("docs/goal-closeout/sf-client-matter-parity/artifacts/matter-recently-viewed.png");
checkFile("docs/goal-closeout/sf-client-matter-parity/artifacts/matter-activity-timeline-read.png");
checkFile("docs/goal-closeout/sf-client-matter-parity/artifacts/matter-selected-record-workspace.png");
checkFile("docs/goal-closeout/sf-client-matter-parity/artifacts/matter-saved-list-views.png");
checkFile("docs/goal-closeout/sf-client-matter-parity/artifacts/matter-bulk-status-action.png");
for (const screenshotPath of browserQaScreenshotPaths) {
  checkFile(screenshotPath);
}
checkFile("docs/goal-closeout/sf-client-matter-parity/salesforce-screenshot-inventory.json");
checkFile("docs/goal-closeout/sf-client-matter-parity/backend-contracts/sf-b-w01-account-contact-contract.json");
checkFile("docs/goal-closeout/sf-client-matter-parity/backend-contracts/sf-b-w02-record-actions-contract.json");
checkFile("docs/goal-closeout/sf-client-matter-parity/backend-contracts/sf-b-w03-activity-calendar-channel-contract.json");
checkFile("docs/goal-closeout/sf-client-matter-parity/backend-contracts/sf-b-w04-document-email-builder-contract.json");
checkFile("docs/goal-closeout/sf-client-matter-parity/backend-contracts/sf-b-w05-import-data-mapping-contract.json");
checkFile("docs/goal-closeout/sf-client-matter-parity/backend-contracts/sf-b-w06-permission-admin-contract.json");
checkFile("docs/goal-closeout/sf-client-matter-parity/backend-contracts/sf-b-w07-data-cloud-enrichment-contract.json");
checkFile("docs/goal-closeout/sf-client-matter-parity/backend-contracts/sf-b-w08-reporting-builder-contract.json");
checkFile("apps/api/test/sf-b-w08-report-builder-client-profitability.test.js");

const sfB01ContractPath = "docs/goal-closeout/sf-client-matter-parity/backend-contracts/sf-b-w01-account-contact-contract.json";
const sfB01Contract = read(sfB01ContractPath);
const sfB01ContractJson = parseJson(sfB01ContractPath);
for (const pattern of [
  /"program":\s*"SF-CLIENT-MATTER-PARITY"/,
  /"workstream":\s*"SF-B-W01"/,
  /"status":\s*"w01r_canonical_write_merge_proposal_route_mounted"/,
  /"ui_read_exposure_allowed_after_route_tests":\s*true/,
  /"ui_write_exposure_allowed_before_write_route_tests":\s*false/,
  /"ui_account_create_exposure_allowed_after_route_tests":\s*true/,
  /"ui_contact_create_exposure_allowed_after_route_tests":\s*true/,
  /\/api\/crm\/accounts/,
  /PATCH \/api\/crm\/accounts\/:id/,
  /\/api\/crm\/contacts/,
  /PATCH \/api\/crm\/contacts\/:id/,
  /\/api\/crm\/accounts\/:id\/contacts/,
  /\/api\/crm\/duplicate-reviews/,
  /\/api\/crm\/duplicate-merge-proposals/,
  /\/api\/crm\/duplicate-merge-proposals\/:id\/execute/,
  /crm:account:read/,
  /crm:account:write/,
  /crm:account:patch/,
  /crm:contact:read/,
  /crm:contact:write/,
  /crm:contact:patch/,
  /crm:account_contact:read/,
  /crm:duplicate_review:write/,
  /crm:duplicate_merge_proposal:read/,
  /crm:duplicate_merge_proposal:write/,
  /crm:duplicate_merge_proposal:execute/,
  /createCrmCanonicalWriteService/,
  /createOrganizationService/,
  /createPersonService/,
  /createClientGroupService/,
  /createContactPointService/,
  /createRelationshipService/,
  /createMasterDataDuplicateService/,
  /createPartyMergeSplitService/,
  /VC-SF-B-W01-API-001/,
  /VC-SF-B-W01-API-006/,
  /VC-SF-B-W01-API-009/,
  /VC-SF-B-W01-API-010/,
  /VC-SF-B-W01-API-011/,
  /VC-SF-B-W01-UI-001/,
  /Playwright Client Account\/Contact read QA/,
  /Playwright Client Contact create QA/,
  /Playwright Client Account patch QA/,
  /Playwright Client Contact patch QA/,
  /Playwright Client merge review QA/,
  /patch_mounted_tested/,
  /"external_provider_dependencies":\s*\[\]/,
  /production, deployment, final approval, or enterprise trust claims/
]) {
  check(sfB01Contract, pattern, `sfB01Contract:${pattern.source}`);
}
if (sfB01ContractJson?.production_ready_claim !== false) failures.push("sfB01Contract:production_ready_claim_not_false");
if (sfB01ContractJson?.go_live_claim !== false) failures.push("sfB01Contract:go_live_claim_not_false");
if (sfB01ContractJson?.enterprise_trust_claim !== false) failures.push("sfB01Contract:enterprise_trust_claim_not_false");

const sfB02ContractPath = "docs/goal-closeout/sf-client-matter-parity/backend-contracts/sf-b-w02-record-actions-contract.json";
const sfB02Contract = read(sfB02ContractPath);
const sfB02ContractJson = parseJson(sfB02ContractPath);
for (const pattern of [
  /"program":\s*"SF-CLIENT-MATTER-PARITY"/,
  /"workstream":\s*"SF-B-W02"/,
  /"lane":\s*"SF-B-W02R"/,
  /"status":\s*"w02r_record_actions_route_mounted"/,
  /GET \/api\/record-actions\/:object_name\/fields/,
  /GET \/api\/record-actions\/:object_name\/bulk-actions/,
  /POST \/api\/record-actions\/:object_name\/:record_id\/field-update/,
  /POST \/api\/record-actions\/:object_name\/bulk-updates/,
  /GET \/api\/record-actions\/:object_name\/:record_id\/audit/,
  /record_action:field_registry:read/,
  /record_action:bulk_registry:read/,
  /record_action:field_update/,
  /record_action:bulk_update/,
  /record_action:audit:read/,
  /fail_closed_x_lawos_permission_context/,
  /idempotency_key persisted/,
  /no raw tenant\/user\/contact values/,
  /packages\/record-actions/,
  /createRecordActionService/,
  /implemented_objects/,
  /field_registry/,
  /allowlisted_field_update/,
  /status_update_bulk/,
  /owner_change_owner_blocked/,
  /export_request_provider_blocked/,
  /record_action_audit_feed/,
  /no fake owner change success/,
  /no fake export success/,
  /data-sf-b-w02-record-actions-panel/,
  /data-sf-b-w02-account-record-action-result/,
  /data-sf-b-w02-contact-record-action-result/,
  /data-sf-b-w02-matter-record-actions/,
  /data-sf-b-w02-matter-owner-blocked-result/,
  /VC-SF-B-W02-API-001/,
  /VC-SF-B-W02-API-009/,
  /VC-SF-B-W02-UI-001/,
  /VC-SF-B-W02-BROWSER-001/,
  /node --test apps\/api\/test\/sf-b-w02-record-actions\.test\.js/,
  /route_backed_owner_blocked/,
  /route_backed_provider_blocked/,
  /fake_success_exposed":\s*false/
]) {
  check(sfB02Contract, pattern, `sfB02Contract:${pattern.source}`);
}
if (sfB02ContractJson?.production_ready_claim !== false) failures.push("sfB02Contract:production_ready_claim_not_false");
if (sfB02ContractJson?.go_live_claim !== false) failures.push("sfB02Contract:go_live_claim_not_false");
if (sfB02ContractJson?.enterprise_trust_claim !== false) failures.push("sfB02Contract:enterprise_trust_claim_not_false");

const sfB03ContractPath = "docs/goal-closeout/sf-client-matter-parity/backend-contracts/sf-b-w03-activity-calendar-channel-contract.json";
const sfB03Contract = read(sfB03ContractPath);
const sfB03ContractJson = parseJson(sfB03ContractPath);
for (const pattern of [
  /"program":\s*"SF-CLIENT-MATTER-PARITY"/,
  /"workstream":\s*"SF-B-W03"/,
  /"status":\s*"w03r_activity_calendar_channel_route_mounted_provider_blocked"/,
  /"ui_write_exposure_allowed_after_write_route_tests":\s*true/,
  /"ui_calendar_exposure_allowed_after_route_tests":\s*true/,
  /"ui_channel_composer_exposure_allowed_after_route_tests":\s*true/,
  /GET \/api\/matters\/:id\/timeline/,
  /POST \/api\/matters\/:id\/activities/,
  /GET \/api\/matters\/:id\/calendar-events/,
  /POST \/api\/matters\/:id\/calendar-events/,
  /GET \/api\/matters\/:id\/channel/,
  /POST \/api\/matters\/:id\/channel\/messages/,
  /matter:activity:write/,
  /matter:calendar:write/,
  /matter:deadline:confirm_change/,
  /matter:channel:message_write/,
  /buildMatterTimelineReadModel/,
  /createMatterTask/,
  /createMatterCalendarEvent/,
  /transitionMatterTask/,
  /changeMatterDeadline/,
  /confirmCriticalDeadlineChange/,
  /VC-SF-B-W03-API-001/,
  /VC-SF-B-W03-API-010/,
  /VC-SF-B-W03-UI-001/,
  /route_mounted/,
  /provider_blocked/,
  /Microsoft Graph Calendar/,
  /Slack or Microsoft Teams/,
  /production, deployment, final approval, or enterprise trust claims/
]) {
  check(sfB03Contract, pattern, `sfB03Contract:${pattern.source}`);
}
if (sfB03ContractJson?.production_ready_claim !== false) failures.push("sfB03Contract:production_ready_claim_not_false");
if (sfB03ContractJson?.go_live_claim !== false) failures.push("sfB03Contract:go_live_claim_not_false");
if (sfB03ContractJson?.enterprise_trust_claim !== false) failures.push("sfB03Contract:enterprise_trust_claim_not_false");

const sfB04ContractPath = "docs/goal-closeout/sf-client-matter-parity/backend-contracts/sf-b-w04-document-email-builder-contract.json";
const sfB04Contract = read(sfB04ContractPath);
const sfB04ContractJson = parseJson(sfB04ContractPath);
for (const pattern of [
  /"program":\s*"SF-CLIENT-MATTER-PARITY"/,
  /"workstream":\s*"SF-B-W04"/,
  /"status":\s*"w04r_document_email_builder_route_mounted_owner_provider_blocked"/,
  /"ui_builder_exposure_allowed_before_route_tests":\s*false/,
  /"ui_builder_exposure_allowed_after_route_tests":\s*true/,
  /"ui_approval_exposure_allowed_before_route_tests":\s*false/,
  /"ui_approval_exposure_allowed_after_route_tests":\s*true/,
  /"ui_vault_publish_exposure_allowed_before_route_tests":\s*false/,
  /"ui_vault_publish_blocked_exposure_allowed_after_route_tests":\s*true/,
  /"ui_email_send_exposure_allowed_before_provider_gate":\s*false/,
  /"ui_email_send_blocked_exposure_allowed_after_route_tests":\s*true/,
  /POST \/api\/matters\/:id\/documents/,
  /GET \/api\/vault\/documents/,
  /POST \/api\/vault\/documents/,
  /GET \/api\/vault\/search/,
  /GET \/api\/vault\/audit/,
  /GET \/api\/matters\/:id\/document-templates/,
  /POST \/api\/matters\/:id\/builder-drafts/,
  /PATCH \/api\/matters\/:id\/builder-drafts\/:draftId/,
  /POST \/api\/matters\/:id\/builder-drafts\/:draftId\/approval-requests/,
  /POST \/api\/matters\/:id\/builder-drafts\/:draftId\/publish-to-vault/,
  /POST \/api\/matters\/:id\/email-drafts/,
  /POST \/api\/matters\/:id\/email-drafts\/:draftId\/send/,
  /matter:builder:templates:read/,
  /matter:builder:draft:create/,
  /matter:builder:approval:request/,
  /matter:builder:publish/,
  /matter:email:draft:create/,
  /matter:email:draft:send/,
  /handleMatterDocumentFacade/,
  /createMatterDocumentEmailBuilderService/,
  /uploadDocument/,
  /createDmsRepository/,
  /createDmsDocument/,
  /createDmsDocumentVersion/,
  /createDmsEmailThread/,
  /VC-SF-B-W04-API-001/,
  /VC-SF-B-W04-API-010/,
  /VC-SF-B-W04-UI-001/,
  /route_mounted/,
  /route_mounted_owner_blocked/,
  /route_mounted_provider_blocked/,
  /Microsoft Graph Mail \/ Outlook/,
  /document bytes omitted/,
  /raw_storage_path_included false/,
  /document_bytes_included false/,
  /storage_pointer_ref_included false/,
  /data-matter-document-builder/,
  /data-matter-email-composer/,
  /data-sf-b-w04-builder-draft-action/,
  /data-sf-b-w04-email-send-boundary-action/,
  /sendMatterEmail/,
  /production, deployment, final approval, or enterprise trust claims/
]) {
  check(sfB04Contract, pattern, `sfB04Contract:${pattern.source}`);
}
if (sfB04ContractJson?.production_ready_claim !== false) failures.push("sfB04Contract:production_ready_claim_not_false");
if (sfB04ContractJson?.go_live_claim !== false) failures.push("sfB04Contract:go_live_claim_not_false");
if (sfB04ContractJson?.enterprise_trust_claim !== false) failures.push("sfB04Contract:enterprise_trust_claim_not_false");

const sfB05ContractPath = "docs/goal-closeout/sf-client-matter-parity/backend-contracts/sf-b-w05-import-data-mapping-contract.json";
const sfB05Contract = read(sfB05ContractPath);
const sfB05ContractJson = parseJson(sfB05ContractPath);
for (const pattern of [
  /"program":\s*"SF-CLIENT-MATTER-PARITY"/,
  /"workstream":\s*"SF-B-W05"/,
  /"status":\s*"w05r_import_data_mapping_route_mounted_owner_blocked"/,
  /"ui_import_wizard_exposure_allowed_before_route_tests":\s*false/,
  /"ui_import_wizard_exposure_allowed_after_route_tests":\s*true/,
  /"ui_field_mapping_exposure_allowed_before_route_tests":\s*false/,
  /"ui_field_mapping_exposure_allowed_after_route_tests":\s*true/,
  /"ui_import_execution_exposure_allowed_before_dry_run_tests":\s*false/,
  /"ui_import_execution_exposure_allowed_after_dry_run_tests":\s*true/,
  /"execute_owner_blocked_until_owner_approval":\s*true/,
  /"rollback_receipt_blocked_until_executed_receipt":\s*true/,
  /POST \/api\/finance\/payments/,
  /POST \/api\/crm\/duplicate-reviews/,
  /POST \/api\/matters\/bulk\/status-transitions/,
  /GET \/api\/import-jobs/,
  /POST \/api\/import-jobs/,
  /GET \/api\/import-targets/,
  /POST \/api\/import-jobs\/:jobId\/source-files/,
  /GET \/api\/import-jobs\/:jobId\/preview/,
  /POST \/api\/import-jobs\/:jobId\/field-mappings/,
  /POST \/api\/import-jobs\/:jobId\/dry-run/,
  /POST \/api\/import-jobs\/:jobId\/execute/,
  /POST \/api\/import-jobs\/:jobId\/rollback/,
  /GET \/api\/import-jobs\/:jobId\/error-report/,
  /import:job:create/,
  /import:source:stage/,
  /import:mapping:write/,
  /import:dry_run/,
  /import:execute/,
  /import:rollback/,
  /import:error_report:read/,
  /handleImportDataMappingApiRequest/,
  /matchImportDataMappingRoute/,
  /createClientMatterImportJobService/,
  /packages\/import-data\/src\/service\.js#createClientMatterImportJobService/,
  /apps\/web\/src\/components\/ImportDataMappingPanel\.jsx/,
  /handleFinancePaymentImport/,
  /importFinancePayment/,
  /createPaymentsG5PaymentImportDescriptor/,
  /createMasterDataDuplicateService/,
  /createOrganizationService/,
  /createPersonService/,
  /VC-SF-B-W05-API-001/,
  /VC-SF-B-W05-API-010/,
  /VC-SF-B-W05-UI-001/,
  /route_mounted/,
  /route_mounted_owner_blocked/,
  /route_mounted_receipt_blocked/,
  /dry-run mutates no product records/,
  /source file bytes omitted/,
  /raw row values omitted/,
  /data-client-matter-import-wizard/,
  /data-sf-b-w05-field-mapping-stepper/,
  /executeClientMatterImport/,
  /rollbackClientMatterImport/,
  /fetchClientMatterImportErrorReport/,
  /tested_visible_controls/,
  /import_execution_success_without_owner_approval/,
  /Optional embedded importer provider such as OneSchema/,
  /production, deployment, final approval, go-live, or enterprise trust claims/
]) {
  check(sfB05Contract, pattern, `sfB05Contract:${pattern.source}`);
}
if (sfB05ContractJson?.production_ready_claim !== false) failures.push("sfB05Contract:production_ready_claim_not_false");
if (sfB05ContractJson?.go_live_claim !== false) failures.push("sfB05Contract:go_live_claim_not_false");
if (sfB05ContractJson?.enterprise_trust_claim !== false) failures.push("sfB05Contract:enterprise_trust_claim_not_false");

const sfB06ContractPath = "docs/goal-closeout/sf-client-matter-parity/backend-contracts/sf-b-w06-permission-admin-contract.json";
const sfB06Contract = read(sfB06ContractPath);
const sfB06ContractJson = parseJson(sfB06ContractPath);
for (const pattern of [
  /"program":\s*"SF-CLIENT-MATTER-PARITY"/,
  /"workstream":\s*"SF-B-W06"/,
  /"status":\s*"w06r_permission_admin_route_mounted_owner_provider_blocked"/,
  /"ui_permission_set_exposure_allowed_before_route_tests":\s*false/,
  /"ui_role_assignment_exposure_allowed_before_route_tests":\s*false/,
  /"ui_object_manager_exposure_allowed_before_route_tests":\s*false/,
  /"ui_connected_app_exposure_allowed_before_owner_provider_gate":\s*false/,
  /"ui_permission_set_exposure_route_tested":\s*true/,
  /"ui_role_assignment_exposure_route_tested":\s*true/,
  /"ui_object_manager_exposure_route_tested":\s*true/,
  /"ui_connected_app_exposure_provider_blocked_route_tested":\s*true/,
  /x-lawos-permission-context/,
  /PERMISSION_CONTEXT_HEADER/,
  /\/permissions\/evaluate/,
  /simulatePermissionReadOnly/,
  /simulateAdminPermission/,
  /grant_applied false/,
  /createPermissionContextStore/,
  /createPolicyStore/,
  /createObjectAclStore/,
  /GET \/api\/admin\/permission-sets/,
  /POST \/api\/admin\/permission-sets/,
  /PATCH \/api\/admin\/permission-sets\/:permissionSetId/,
  /GET \/api\/admin\/permission-assignments/,
  /POST \/api\/admin\/permission-assignments/,
  /DELETE \/api\/admin\/permission-assignments\/:assignmentId/,
  /GET \/api\/admin\/object-manager\/objects/,
  /GET \/api\/admin\/object-manager\/objects\/:objectName\/fields/,
  /PATCH \/api\/admin\/object-manager\/objects\/:objectName\/fields\/:fieldName/,
  /GET \/api\/admin\/connected-apps/,
  /POST \/api\/admin\/connected-apps/,
  /POST \/api\/admin\/connected-apps\/:appId\/disable/,
  /GET \/api\/admin\/audit/,
  /admin:permission_set:read/,
  /admin:permission_set:write/,
  /admin:permission_assignment:write/,
  /admin:permission_assignment:revoke/,
  /admin:object_manager:field_read/,
  /admin:object_manager:patch/,
  /admin:connected_app:write/,
  /admin:connected_app:disable/,
  /admin:audit:read/,
  /VC-SF-B-W06-API-001/,
  /VC-SF-B-W06-API-010/,
  /VC-SF-B-W06-API-011/,
  /VC-SF-B-W06-UI-001/,
  /route_mounted/,
  /route_mounted_owner_blocked/,
  /route_mounted_provider_blocked/,
  /tested_visible_controls/,
  /data-permission-set-admin/,
  /data-object-manager-admin/,
  /data-connected-apps-admin/,
  /createPermissionAdminSetupService/,
  /PermissionAdminPanel/,
  /patchObjectFieldPolicy/,
  /disableConnectedApp/,
  /production, deployment, final approval, or enterprise trust claims/
]) {
  check(sfB06Contract, pattern, `sfB06Contract:${pattern.source}`);
}
if (sfB06ContractJson?.production_ready_claim !== false) failures.push("sfB06Contract:production_ready_claim_not_false");
if (sfB06ContractJson?.go_live_claim !== false) failures.push("sfB06Contract:go_live_claim_not_false");
if (sfB06ContractJson?.enterprise_trust_claim !== false) failures.push("sfB06Contract:enterprise_trust_claim_not_false");

const sfB07ContractPath = "docs/goal-closeout/sf-client-matter-parity/backend-contracts/sf-b-w07-data-cloud-enrichment-contract.json";
const sfB07Contract = read(sfB07ContractPath);
const sfB07ContractJson = parseJson(sfB07ContractPath);
for (const pattern of [
  /"program":\s*"SF-CLIENT-MATTER-PARITY"/,
  /"workstream":\s*"SF-B-W07"/,
  /"status":\s*"w07r_data_cloud_enrichment_route_mounted_owner_provider_blocked"/,
  /"ui_enrichment_provider_effect_allowed_before_provider_gate":\s*false/,
  /"ui_enrichment_exposure_allowed_with_provider_blocked_state":\s*true/,
  /"ui_identity_resolution_exposure_allowed_with_owner_blocked_state":\s*true/,
  /"ui_unified_profile_exposure_allowed_after_route_tests":\s*true/,
  /"ui_segment_activation_provider_effect_allowed_before_provider_gate":\s*false/,
  /"ui_segment_activation_exposure_allowed_with_provider_blocked_state":\s*true/,
  /Data Cloud/,
  /synthetic_crosswalk/,
  /matter_core_enrichment/,
  /calls_external_provider_api/,
  /GET \/api\/data-cloud\/providers/,
  /POST \/api\/data-cloud\/providers/,
  /POST \/api\/data-cloud\/consent-records/,
  /POST \/api\/data-cloud\/enrichment-jobs/,
  /GET \/api\/data-cloud\/enrichment-jobs\/:jobId\/preview/,
  /POST \/api\/data-cloud\/enrichment-jobs\/:jobId\/execute/,
  /GET \/api\/data-cloud\/enrichment-results/,
  /POST \/api\/data-cloud\/identity-resolution/,
  /GET \/api\/data-cloud\/unified-profiles\/:profileId/,
  /POST \/api\/data-cloud\/segment-activations/,
  /GET \/api\/data-cloud\/audit/,
  /data_cloud:provider:read/,
  /data_cloud:provider:register/,
  /data_cloud:consent:write/,
  /data_cloud:enrichment_job:create/,
  /data_cloud:enrichment_preview:read/,
  /data_cloud:enrichment_job:execute/,
  /data_cloud:enrichment_result:read/,
  /data_cloud:identity_resolution:write/,
  /data_cloud:unified_profile:read/,
  /data_cloud:segment_activation:create/,
  /data_cloud:audit:read/,
  /VC-SF-B-W07-API-001/,
  /VC-SF-B-W07-API-010/,
  /VC-SF-B-W07-API-011/,
  /VC-SF-B-W07-UI-001/,
  /route_mounted/,
  /route_mounted_owner_blocked/,
  /route_mounted_provider_blocked/,
  /tested_visible_controls/,
  /provider credentials omitted/,
  /raw provider payloads and direct personal identifiers omitted/,
  /automatic merge is blocked/,
  /data-data-cloud-enrichment/,
  /executeEnrichmentJob/,
  /activateDataCloudSegment/,
  /provider approval, production, deployment, final approval, or enterprise trust claims/
]) {
  check(sfB07Contract, pattern, `sfB07Contract:${pattern.source}`);
}
if (sfB07ContractJson?.production_ready_claim !== false) failures.push("sfB07Contract:production_ready_claim_not_false");
if (sfB07ContractJson?.go_live_claim !== false) failures.push("sfB07Contract:go_live_claim_not_false");
if (sfB07ContractJson?.enterprise_trust_claim !== false) failures.push("sfB07Contract:enterprise_trust_claim_not_false");

const sfB08ContractPath = "docs/goal-closeout/sf-client-matter-parity/backend-contracts/sf-b-w08-reporting-builder-contract.json";
const sfB08Contract = read(sfB08ContractPath);
const sfB08ContractJson = parseJson(sfB08ContractPath);
for (const pattern of [
  /"program":\s*"SF-CLIENT-MATTER-PARITY"/,
  /"workstream":\s*"SF-B-W08"/,
  /"status":\s*"w08r_report_builder_client_profitability_route_mounted_owner_blocked"/,
  /"ui_report_builder_exposure_allowed_before_route_tests":\s*true/,
  /"ui_report_query_exposure_allowed_before_safe_query_tests":\s*true/,
  /"ui_report_share_exposure_allowed_before_permission_tests":\s*true/,
  /"ui_client_profitability_exposure_allowed_before_route_tests":\s*true/,
  /"ui_report_share_success_allowed_without_owner_approval":\s*false/,
  /GET \/api\/analytics\/dashboards/,
  /POST \/api\/analytics\/refresh/,
  /GET \/api\/analytics\/matter-profitability/,
  /POST \/api\/analytics\/matter-profitability/,
  /POST \/api\/analytics\/exports/,
  /GET \/api\/analytics\/audit/,
  /GET \/api\/reports/,
  /POST \/api\/reports/,
  /PATCH \/api\/reports\/:reportId/,
  /POST \/api\/reports\/:reportId\/run/,
  /POST \/api\/reports\/:reportId\/share/,
  /GET \/api\/reports\/:reportId\/audit/,
  /GET \/api\/analytics\/client-profitability/,
  /POST \/api\/analytics\/client-profitability/,
  /report:definition:read/,
  /report:definition:write/,
  /report:definition:patch/,
  /report:query:run/,
  /report:share:write/,
  /report:audit:read/,
  /analytics:client_profitability:read/,
  /analytics:client_profitability:write/,
  /createReportDefinitionService/,
  /runSafeAggregateReportQuery/,
  /createReportShareService/,
  /createClientProfitabilityRouteHandler/,
  /packages\/analytics\/src\/metrics-service\.js#createClientProfitability/,
  /VC-SF-B-W08-API-001/,
  /VC-SF-B-W08-API-008/,
  /VC-SF-B-W08-UI-001/,
  /route_mounted_owner_blocked/,
  /node --test apps\/api\/test\/sf-b-w08-report-builder-client-profitability\.test\.js/,
  /data-report-builder/,
  /runReportQuery/,
  /shareReportDefinition/,
  /fetchAnalyticsClientProfitability/,
  /raw matter detail and raw billing payload omitted/,
  /created_client_identity false/,
  /production, deployment, final approval, go-live, or enterprise trust claims/
]) {
  check(sfB08Contract, pattern, `sfB08Contract:${pattern.source}`);
}
if (sfB08ContractJson?.production_ready_claim !== false) failures.push("sfB08Contract:production_ready_claim_not_false");
if (sfB08ContractJson?.go_live_claim !== false) failures.push("sfB08Contract:go_live_claim_not_false");
if (sfB08ContractJson?.enterprise_trust_claim !== false) failures.push("sfB08Contract:enterprise_trust_claim_not_false");

const shell = read("apps/web/src/components/Shell.jsx");
for (const section of [
  "clients-list",
  "client-leads",
  "client-opportunities",
  "client-intake",
  "client-accounts",
  "client-contacts",
  "client-data",
  "client-reports",
  "client-import",
  "matters-list",
  "matter-command",
  "matter-vault",
  "matter-timeline",
  "matter-opening",
  "matter-team",
  "matter-billing",
  "matter-analytics",
  "matter-import"
]) {
  check(shell, new RegExp(section), `shell:${section}`);
}

const clients = read("apps/web/src/components/ClientsSurface.jsx");
const dataCloudPanel = read("apps/web/src/components/DataCloudEnrichmentPanel.jsx");
const reportBuilderPanel = read("apps/web/src/components/ReportBuilderPanel.jsx");
for (const pattern of [
  /data-cmp-g2-live-clients="true"/,
  /data-salesforce-client-workspace="list-detail-right-panel"/,
  /fetchMasterDataRecords/,
  /fetchCrmLeads/,
  /fetchCrmOpportunities/,
  /fetchIntakeRequests/,
  /fetchIntakeAudit/,
  /handoffCrmOpportunityToIntake/,
  /createIntakeConflictCheck/,
  /issueIntakeClearanceToken/,
  /fetchCrmAccounts/,
  /createCrmAccount/,
  /fetchCrmContacts/,
  /fetchCrmAccountContacts/,
  /data-crm-accounts-read="true"/,
  /data-crm-account-create-action="true"/,
  /data-crm-account-create-result="true"/,
  /data-crm-account-patch-action="true"/,
  /data-crm-account-patch-result="true"/,
  /data-crm-contacts-read="true"/,
  /data-crm-contact-create-action="true"/,
  /data-crm-contact-create-result="true"/,
  /data-crm-contact-patch-action="true"/,
  /data-crm-contact-patch-result="true"/,
  /data-crm-account-contacts-read="true"/,
  /createCrmContact/,
  /patchCrmAccount/,
  /patchCrmContact/,
  /data-crm-handoff-action="true"/,
  /data-crm-handoff-refresh-result="true"/,
  /upsertResultItem/,
  /data-intake-clearance-action="true"/,
  /record-side-panel/,
  /live-data-denied/,
  /live-data-review/,
  /RecordActionSummary/,
  /fetchRecordActionFields/,
  /fetchRecordActionAudit/,
  /updateRecordActionField/,
  /bulkUpdateRecordActions/,
  /data-sf-b-w02-record-actions-panel="true"/,
  /data-sf-b-w02-field-registry="true"/,
  /data-sf-b-w02-field-update-result="true"/,
  /data-sf-b-w02-owner-blocked-action="true"/,
  /data-sf-b-w02-owner-blocked-result="true"/,
  /data-sf-b-w02-action-audit-feed="true"/,
  /data-sf-b-w02-account-record-action="true"/,
  /data-sf-b-w02-account-record-action-result="true"/,
  /data-sf-b-w02-contact-record-action="true"/,
  /data-sf-b-w02-contact-record-action-result="true"/,
  /ImportDataMappingPanel/,
  /client-import/,
  /surface="client"/,
  /DataCloudEnrichmentPanel/,
  /client-data/,
  /data-sf-b-w07-right-panel-enrichment-summary="route-backed"/,
  /ReportBuilderPanel/,
  /client-reports/,
  /data-sf-b-w08-right-panel-report-summary="route-backed"/
]) {
  check(clients, pattern, `clients:${pattern.source}`);
}
forbid(clients, /mergeCrmContact|deleteCrmContact|postCrmContactMerge/, "clients:no-contact-merge-delete-ui-before-routes");
forbid(clients, permissionAdminUiPattern, "clients:no-permission-admin-ui-before-routes");

for (const pattern of [
  /data-data-cloud-enrichment="route-backed"/,
  /data-enrichment-provider-admin="provider-blocked"/,
  /data-sf-b-w07-provider-list="true"/,
  /data-sf-b-w07-provider-register-action="true"/,
  /data-sf-b-w07-provider-register-result="true"/,
  /data-sf-b-w07-consent-record-action="true"/,
  /data-sf-b-w07-consent-record-result="true"/,
  /data-sf-b-w07-enrichment-job-action="true"/,
  /data-sf-b-w07-enrichment-job-result="true"/,
  /data-sf-b-w07-enrichment-preview="true"/,
  /data-sf-b-w07-enrichment-execute-provider-blocked-action="true"/,
  /data-sf-b-w07-enrichment-execute-provider-blocked-result="true"/,
  /data-sf-b-w07-results-list="true"/,
  /data-identity-resolution="route-backed"/,
  /data-sf-b-w07-identity-resolution-action="true"/,
  /data-sf-b-w07-identity-resolution-result="true"/,
  /data-unified-profile="route-backed"/,
  /data-sf-b-w07-unified-profile="true"/,
  /data-segment-activation="provider-blocked"/,
  /data-sf-b-w07-segment-activation-provider-blocked-action="true"/,
  /data-sf-b-w07-segment-activation-provider-blocked-result="true"/,
  /data-sf-b-w07-audit="true"/,
  /fetchDataCloudProviders/,
  /createDataCloudProvider/,
  /createDataCloudConsentRecord/,
  /createEnrichmentJob/,
  /fetchEnrichmentPreview/,
  /executeEnrichmentJob/,
  /fetchEnrichmentResults/,
  /runIdentityResolution/,
  /fetchUnifiedCustomerProfile/,
  /activateDataCloudSegment/,
  /fetchDataCloudAudit/
]) {
  check(dataCloudPanel, pattern, `dataCloudPanel:${pattern.source}`);
}

for (const pattern of [
  /data-report-builder="route-backed"/,
  /data-report-query-builder="route-backed"/,
  /data-sf-b-w08-report-list="true"/,
  /data-sf-b-w08-report-create-action="true"/,
  /data-sf-b-w08-report-create-result="true"/,
  /data-sf-b-w08-report-patch-action="true"/,
  /data-sf-b-w08-report-patch-result="true"/,
  /data-client-profitability="route-backed"/,
  /data-sf-b-w08-client-profitability-refresh-action="true"/,
  /data-sf-b-w08-client-profitability-refresh-result="true"/,
  /data-sf-b-w08-report-run-action="true"/,
  /data-sf-b-w08-report-run-result="true"/,
  /data-sf-b-w08-report-chart="true"/,
  /data-sf-b-w08-report-result-table="true"/,
  /data-report-share-action="owner-blocked"/,
  /data-sf-b-w08-report-share-result="true"/,
  /data-sf-b-w08-report-audit="true"/,
  /fetchReportDefinitions/,
  /createReportDefinition/,
  /patchReportDefinition/,
  /refreshClientProfitability/,
  /fetchAnalyticsClientProfitability/,
  /runReportQuery/,
  /shareReportDefinition/,
  /fetchReportAudit/,
  /승인 대기/,
  /임의 SQL/
]) {
  check(reportBuilderPanel, pattern, `reportBuilderPanel:${pattern.source}`);
}
forbid(reportBuilderPanel, /share_grant_success|arbitrary_sql_executed:\s*true|raw_query_payload_included:\s*true|row_level_billing_payload_included:\s*true|productionReadyClaim:\s*true/, "reportBuilderPanel:no-fake-report-share-or-raw-query-success");

const crmRoutePolicies = read("apps/api/src/routes/crm.js");
for (const pattern of [
  /api\\\/crm\\\/accounts/,
  /api\\\/crm\\\/contacts/,
  /api\\\/crm\\\/accounts\\\/\(\[\^\/\]\+\)\\\/contacts/,
  /api\\\/crm\\\/duplicate-reviews/,
  /crm:account:read/,
  /crm:account:write/,
  /crm:account:patch/,
  /crm:contact:read/,
  /crm:contact:write/,
  /crm:contact:patch/,
  /crm:account_contact:read/,
  /crm:duplicate_review:write/
]) {
  check(crmRoutePolicies, pattern, `crmRoutes:${pattern.source}`);
}

const matters = read("apps/web/src/components/MattersSurface.jsx");
for (const pattern of [
  /data-cmp-g4-live-matters="true"/,
  /data-salesforce-matter-workspace="list-detail-right-panel"/,
  /data-matter-selected-record-list="true"/,
  /data-matter-select-row="true"/,
  /data-matter-saved-list-views="true"/,
  /data-matter-list-view-option="true"/,
  /data-matter-save-list-view-action="true"/,
  /data-matter-bulk-actions="true"/,
  /data-matter-bulk-select-row="true"/,
  /data-matter-bulk-status-action="true"/,
  /data-matter-record-inline-edit-action="true"/,
  /data-matter-record-inline-edit-result="true"/,
  /data-matter-record-owner-change-action="true"/,
  /data-matter-record-owner-change-result="true"/,
  /data-matter-record-owner-change-action="true"/,
  /data-matter-record-owner-change-result="true"/,
  /aria-selected=\{selected\}/,
  /onSelectMatter=\{setSelectedMatterId\}/,
  /applyMatterListView/,
  /visibleMatters\.find\(\(item\) => item\.matter_id === selectedMatterId\)/,
  /matterId=\{activeMatterId\}/,
  /fetchMatterRecords/,
  /fetchMatterCommandCenter/,
  /fetchMatterListViews/,
  /saveMatterListView/,
  /bulkCompleteMatterStatus/,
  /updateMatterInlineFields/,
  /changeMatterOwner/,
  /changeMatterOwner/,
  /fetchMatterRecentlyViewed/,
  /fetchMatterTimeline/,
  /fetchMatterAudit/,
  /markMatterRecentlyViewed/,
  /completeMatterStatus/,
  /fetchFinanceTimeEntries/,
  /fetchFinanceInvoices/,
  /fetchFinanceArAging/,
  /fetchFinanceAudit/,
  /fetchAnalyticsDashboards/,
  /fetchAnalyticsMatterProfitability/,
  /createFinanceTimeEntry/,
  /generateFinanceWip/,
  /importFinancePayment/,
  /refreshAnalyticsDashboards/,
  /refreshMatterProfitability/,
  /createAnalyticsExport/,
  /data-matter-billing-actions="true"/,
  /data-matter-time-entry-action="true"/,
  /data-matter-analytics-actions="true"/,
  /data-matter-analytics-export-action="true"/,
  /data-matter-analytics-export-safe-state="true"/,
  /data-matter-status-transition-action="true"/,
  /data-matter-recently-viewed="true"/,
  /data-matter-activity-timeline="true"/,
  /data-matter-activity-filters="true"/,
  /data-matter-activity-read-boundary="true"/,
  /fetchMatterActivities/,
  /createMatterActivity/,
  /patchMatterActivity/,
  /fetchMatterCalendarEvents/,
  /createMatterCalendarEvent/,
  /patchMatterCalendarEvent/,
  /fetchMatterDeadlines/,
  /confirmMatterDeadlineChange/,
  /fetchMatterChannel/,
  /createMatterChannelMessage/,
  /syncMatterChannelProvider/,
  /data-sf-b-w03-activity-workspace="true"/,
  /data-sf-b-w03-activity-composer="true"/,
  /data-sf-b-w03-activity-create-result="true"/,
  /data-sf-b-w03-activity-patch-result="true"/,
  /data-sf-b-w03-calendar-workspace="true"/,
  /data-sf-b-w03-calendar-create-action="true"/,
  /data-sf-b-w03-calendar-create-result="true"/,
  /data-sf-b-w03-deadline-board="true"/,
  /data-sf-b-w03-deadline-approval-action="true"/,
  /data-sf-b-w03-deadline-approval-result="true"/,
  /data-sf-b-w03-deadline-confirm-action="true"/,
  /data-sf-b-w03-deadline-confirm-result="true"/,
  /data-sf-b-w03-channel-workspace="true"/,
  /data-sf-b-w03-channel-composer="true"/,
  /data-sf-b-w03-channel-message-result="true"/,
  /data-sf-b-w03-channel-provider-state="true"/,
  /data-sf-b-w03-provider-blocked-result="true"/,
  /data-sf-b-w03-right-panel-deadline-highlight="true"/,
  /data-sf-b-w03-right-panel-channel-tab="true"/,
  /provider_blocked/,
  /fetchRecordActionFields/,
  /fetchRecordActionAudit/,
  /updateRecordActionField/,
  /bulkUpdateRecordActions/,
  /data-sf-b-w02-matter-record-actions="true"/,
  /data-sf-b-w02-matter-record-action-result="true"/,
  /data-sf-b-w02-matter-owner-blocked-action="true"/,
  /data-sf-b-w02-matter-owner-blocked-result="true"/,
  /data-sf-b-w02-matter-action-audit-feed="true"/,
  /timelineCategory/,
  /timelineSourceLabel/,
  /ownerLabel/,
  /onMatterUpdated=\{applyMatterUpdate\}/,
  /data-audit-trail=\{marker\}/,
  /matter-command-audit-trail/,
  /matter-finance-audit-trail/,
  /"matter-command",\s*"matter-vault",\s*"matter-timeline",\s*"matter-calendar",\s*"matter-channel"/,
  /status-path/,
  /record-side-panel/,
  /MatterOpeningWizard/,
  /MatterTeamRoster/,
  /MatterVaultPanel/,
  /ImportDataMappingPanel/,
  /matter-import/,
  /surface="matter"/
]) {
  check(matters, pattern, `matters:${pattern.source}`);
}
forbid(matters, /sendMatterChannelMessage/, "matters:no-external-channel-send-before-provider-receipt");
forbid(matters, /sendMatterEmail/, "matters:no-external-email-send-before-provider-receipt");
forbid(matters, permissionAdminUiPattern, "matters:no-permission-admin-ui-before-routes");
forbid(matters, dataCloudEnrichmentUiPattern, "matters:no-data-cloud-enrichment-ui-before-routes");
forbid(matters, reportingBuilderUiPattern, "matters:no-report-builder-client-profitability-ui-before-routes");

const matterVaultPanel = read("apps/web/src/components/MatterVaultPanel.jsx");
for (const pattern of [
  /fetchMatterVaultSummary/,
  /fetchMatterTimeline/,
  /fetchMatterVaultDocuments/,
  /fetchMatterVaultSearch/,
  /fetchMatterVaultAudit/,
  /createMatterDocumentFacade/,
  /className="record-list-panel matter-runtime-panel"/,
  /data-matter-vault-record-workspace="true"/,
  /data-matter-document-facade-action="true"/,
  /data-matter-document-facade-result="true"/,
  /data-vault-preview=\{marker\}/,
  /matter-vault-documents/,
  /matter-vault-search/,
  /matter-vault-audit/,
  /data-sf-b-w04-document-builder="true"/,
  /data-matter-document-builder="route-backed"/,
  /data-sf-b-w04-template-picker="true"/,
  /data-sf-b-w04-builder-draft-action="true"/,
  /data-sf-b-w04-builder-draft-result="true"/,
  /data-sf-b-w04-builder-preview="true"/,
  /data-sf-b-w04-builder-approval-action="true"/,
  /data-sf-b-w04-builder-approval-result="true"/,
  /data-sf-b-w04-builder-publish-action="true"/,
  /data-sf-b-w04-builder-publish-blocked-result="true"/,
  /data-sf-b-w04-email-composer="true"/,
  /data-matter-email-composer="provider-blocked"/,
  /data-sf-b-w04-email-draft-action="true"/,
  /data-sf-b-w04-email-draft-result="true"/,
  /data-sf-b-w04-email-send-boundary-action="true"/,
  /data-sf-b-w04-email-send-provider-blocked="true"/,
  /fetchMatterDocumentTemplates/,
  /createMatterBuilderDraft/,
  /requestMatterBuilderApproval/,
  /publishMatterBuilderDraftToVault/,
  /createMatterEmailDraft/,
  /requestMatterEmailDraftSendBoundary/
]) {
  check(matterVaultPanel, pattern, `matterVaultPanel:${pattern.source}`);
}
forbid(matterVaultPanel, /sendMatterEmail|email_send_success_without_provider_receipt|vault_publish_success_without_owner_approval/, "matterVaultPanel:no-fake-document-email-success");
forbid(matterVaultPanel, permissionAdminUiPattern, "matterVaultPanel:no-permission-admin-ui-before-routes");
forbid(matterVaultPanel, dataCloudEnrichmentUiPattern, "matterVaultPanel:no-data-cloud-enrichment-ui-before-routes");
forbid(matterVaultPanel, reportingBuilderUiPattern, "matterVaultPanel:no-report-builder-client-profitability-ui-before-routes");

const importDataMappingPanel = read("apps/web/src/components/ImportDataMappingPanel.jsx");
for (const pattern of [
  /data-sf-b-w05-import-wizard="true"/,
  /data-client-matter-import-wizard="route-backed"/,
  /data-sf-b-w05-target-selector="true"/,
  /data-sf-b-w05-job-list="true"/,
  /data-sf-b-w05-source-stage-action="true"/,
  /data-sf-b-w05-source-stage-result="true"/,
  /data-sf-b-w05-field-mapping-stepper="true"/,
  /data-sf-b-w05-field-mapping-result="true"/,
  /data-sf-b-w05-preview-safe-sample="true"/,
  /data-sf-b-w05-dry-run-action="true"/,
  /data-sf-b-w05-dry-run-result="true"/,
  /data-sf-b-w05-execute-owner-blocked-action="true"/,
  /data-sf-b-w05-execute-owner-blocked-result="true"/,
  /data-sf-b-w05-rollback-error-action="true"/,
  /data-sf-b-w05-rollback-result="true"/,
  /data-sf-b-w05-error-report="true"/,
  /fetchClientMatterImportTargets/,
  /fetchClientMatterImportJobs/,
  /createClientMatterImportJob/,
  /stageImportSourceFile/,
  /fetchClientMatterImportPreview/,
  /saveImportFieldMapping/,
  /dryRunClientMatterImport/,
  /executeClientMatterImport/,
  /rollbackClientMatterImport/,
  /fetchClientMatterImportErrorReport/,
  /owner_blocked/,
  /raw row 미노출/
]) {
  check(importDataMappingPanel, pattern, `importDataMappingPanel:${pattern.source}`);
}
forbid(importDataMappingPanel, /import_execution_success_without_owner_approval|raw_import_row_preview|raw_file_bytes_response|external_import_provider_enabled_without_receipt/, "importDataMappingPanel:no-fake-import-success-or-raw-data");
forbid(importDataMappingPanel, permissionAdminUiPattern, "importDataMappingPanel:no-permission-admin-ui-before-routes");
forbid(importDataMappingPanel, dataCloudEnrichmentUiPattern, "importDataMappingPanel:no-data-cloud-enrichment-ui-before-routes");
forbid(importDataMappingPanel, reportingBuilderUiPattern, "importDataMappingPanel:no-report-builder-client-profitability-ui-before-routes");

const adminSurface = read("apps/web/src/components/AdminSurface.jsx");
forbid(adminSurface, permissionAdminUiPattern, "adminSurface:no-permission-admin-ui-before-routes");
forbid(adminSurface, dataCloudEnrichmentUiPattern, "adminSurface:no-data-cloud-enrichment-ui-before-routes");
forbid(adminSurface, reportingBuilderUiPattern, "adminSurface:no-report-builder-client-profitability-ui-before-routes");

const peopleHome = read("apps/web/src/people/PeopleHome.tsx");
check(peopleHome, /people-admin/, "peopleHome:people-admin-section");
check(peopleHome, /PermissionAdminPanel/, "peopleHome:PermissionAdminPanel-mounted");

const permissionAdminPanel = read("apps/web/src/people/admin/PermissionAdminPanel.jsx");
for (const pattern of [
  /data-sf-b-w06-admin-setup="true"/,
  /data-permission-set-admin="route-backed"/,
  /data-sf-b-w06-permission-set-list="true"/,
  /data-sf-b-w06-permission-set-create-action="true"/,
  /data-sf-b-w06-permission-set-create-result="true"/,
  /data-sf-b-w06-permission-set-patch-action="true"/,
  /data-sf-b-w06-permission-set-patch-result="true"/,
  /data-permission-assignment-admin="route-backed"/,
  /data-sf-b-w06-assignment-list="true"/,
  /data-sf-b-w06-assignment-owner-blocked-action="true"/,
  /data-sf-b-w06-assignment-owner-blocked-result="true"/,
  /data-sf-b-w06-revoke-owner-blocked-action="true"/,
  /data-sf-b-w06-revoke-owner-blocked-result="true"/,
  /data-object-manager-admin="route-backed"/,
  /data-sf-b-w06-object-manager="true"/,
  /data-sf-b-w06-field-policy-owner-blocked-action="true"/,
  /data-sf-b-w06-field-policy-owner-blocked-result="true"/,
  /data-connected-apps-admin="provider-blocked"/,
  /data-sf-b-w06-connected-app-list="true"/,
  /data-sf-b-w06-connected-app-provider-blocked-action="true"/,
  /data-sf-b-w06-connected-app-provider-blocked-result="true"/,
  /data-sf-b-w06-admin-audit="true"/,
  /fetchPermissionSets/,
  /createPermissionSet/,
  /patchPermissionSet/,
  /fetchPermissionAssignments/,
  /assignPermissionSet/,
  /revokePermissionSetAssignment/,
  /fetchObjectManagerObjects/,
  /fetchObjectManagerFields/,
  /patchObjectFieldPolicy/,
  /fetchConnectedApps/,
  /createConnectedApp/,
  /disableConnectedApp/,
  /fetchAdminPermissionAudit/,
  /승인 대기/,
  /외부 확인 대기/
]) {
  check(permissionAdminPanel, pattern, `permissionAdminPanel:${pattern.source}`);
}
forbid(permissionAdminPanel, /grant_success|revoke_success|schema_mutation_success|provider_revocation_success|productionReadyClaim:\s*true/, "permissionAdminPanel:no-fake-admin-success");

const apiClient = read("apps/web/src/data/apiClient.js");
for (const pattern of [
  /runtimeTenant\("tenant", "rp04", "synthetic"\)/,
  /runtimeTenant\("tenant", "rp05", "synthetic"\)/,
  /runtimeTenant\("tenant", "cmp", "g6", "synthetic"\)/,
  /runtimeTenant\("tenant", "cmp", "g7", "synthetic"\)/,
  /runtimeTenant\("tenant", "cmp", "g8", "synthetic"\)/,
  /\/api\/crm\/leads/,
  /\/api\/crm\/opportunities/,
  /\/api\/crm\/accounts/,
  /path:\s*"\/api\/crm\/accounts"/,
  /createCrmAccount/,
  /patchCrmAccount/,
  /\/api\/crm\/accounts\/\$\{encodeURIComponent\(accountId\)\}/,
  /\/api\/crm\/contacts/,
  /path:\s*"\/api\/crm\/contacts"/,
  /createCrmContact/,
  /patchCrmContact/,
  /\/api\/crm\/contacts\/\$\{encodeURIComponent\(contactId\)\}/,
  /\/api\/crm\/accounts\/\$\{encodeURIComponent\(accountId\)\}\/contacts/,
  /fetchCrmAccounts/,
  /fetchCrmContacts/,
  /fetchCrmAccountContacts/,
  /\/api\/intake\/requests/,
  /\/api\/intake\/audit/,
  /\/api\/crm\/opportunities\/\$\{encodeURIComponent\(opportunityId\)\}\/handoff/,
  /\/api\/intake\/conflict-checks/,
  /\/api\/intake\/clearance-tokens/,
  /normalizeMatterOpeningPayload/,
  /createMatterDocumentFacade/,
  /fetchMatterListViews/,
  /fetchMatterDocumentTemplates/,
  /\/api\/matters\/\$\{encodeURIComponent\(matterId\)\}\/document-templates/,
  /createMatterBuilderDraft/,
  /patchMatterBuilderDraft/,
  /fetchMatterBuilderDraftPreview/,
  /requestMatterBuilderApproval/,
  /fetchMatterBuilderApprovalRequests/,
  /publishMatterBuilderDraftToVault/,
  /createMatterEmailDraft/,
  /patchMatterEmailDraft/,
  /requestMatterEmailDraftSendBoundary/,
  /approvalRequest/,
  /publishState/,
  /saveMatterListView/,
  /bulkCompleteMatterStatus/,
  /\/api\/matters\/\$\{encodeURIComponent\(matterId\)\}\/command-center/,
  /\/api\/matters\/\$\{encodeURIComponent\(matterId\)\}\/documents/,
  /\/api\/matters\/\$\{encodeURIComponent\(matterId\)\}/,
  /updateMatterInlineFields/,
  /fieldPatch/,
  /\/api\/matters\/\$\{encodeURIComponent\(matterId\)\}\/status-transitions/,
  /\/api\/matters\/\$\{encodeURIComponent\(matterId\)\}\/owner-change/,
  /\/api\/matters\/list-views/,
  /\/api\/matters\/bulk\/status-transitions/,
  /\/api\/matters\/recently-viewed/,
  /\/api\/matters\/\$\{encodeURIComponent\(matterId\)\}\/recently-viewed/,
  /completeMatterStatus/,
  /changeMatterOwner/,
  /normalizeMatterTeamMemberPayload/,
  /ownerAssignment/,
  /\/api\/matters\/\$\{encodeURIComponent\(matterId\)\}\/timeline/,
  /\/api\/matters\/audit/,
  /fetchRecordActionFields/,
  /fetchRecordBulkActions/,
  /fetchRecordActionAudit/,
  /updateRecordActionField/,
  /bulkUpdateRecordActions/,
  /\/api\/record-actions\/\$\{runtime\.objectName\}\$\{suffix\}/,
  /fetchMatterVaultDocuments/,
  /fetchMatterVaultSearch/,
  /fetchMatterVaultAudit/,
  /\/api\/vault\/documents/,
  /\/api\/vault\/search/,
  /\/api\/vault\/audit/,
  /\/api\/finance\/time-entries/,
  /path:\s*"\/api\/finance\/time-entries"/,
  /\/api\/finance\/invoices/,
  /\/api\/finance\/ar-aging/,
  /\/api\/finance\/audit/,
  /\/api\/finance\/wip/,
  /\/api\/finance\/payments/,
  /\/api\/analytics\/dashboards/,
  /\/api\/analytics\/refresh/,
  /\/api\/analytics\/matter-profitability/,
  /createAnalyticsExport/,
  /\/api\/analytics\/exports/,
  /fetchClientMatterImportTargets/,
  /fetchClientMatterImportJobs/,
  /createClientMatterImportJob/,
  /stageImportSourceFile/,
  /fetchClientMatterImportPreview/,
  /saveImportFieldMapping/,
  /dryRunClientMatterImport/,
  /executeClientMatterImport/,
  /rollbackClientMatterImport/,
  /fetchClientMatterImportErrorReport/,
  /\/api\/import-targets/,
  /\/api\/import-jobs/
]) {
  check(apiClient, pattern, `apiClient:${pattern.source}`);
}
forbid(apiClient, /mergeCrmContact|deleteCrmContact|postCrmContactMerge|productionReadyClaim:\s*true/, "apiClient:no-contact-merge-delete-or-production-claim");
forbid(apiClient, /sendMatterEmail|email_send_success_without_provider_receipt|vault_publish_success_without_owner_approval/, "apiClient:no-fake-document-email-success");
for (const pattern of [
  /fetchPermissionSets/,
  /createPermissionSet/,
  /patchPermissionSet/,
  /fetchPermissionAssignments/,
  /assignPermissionSet/,
  /revokePermissionSetAssignment/,
  /fetchObjectManagerObjects/,
  /fetchObjectManagerFields/,
  /patchObjectFieldPolicy/,
  /fetchConnectedApps/,
  /createConnectedApp/,
  /disableConnectedApp/,
  /fetchAdminPermissionAudit/,
  /\/api\/admin\/permission-sets/,
  /\/api\/admin\/permission-assignments/,
  /\/api\/admin\/object-manager\/objects/,
  /\/api\/admin\/connected-apps/,
  /\/api\/admin\/audit/
]) {
  check(apiClient, pattern, `apiClient:w06:${pattern.source}`);
}
for (const pattern of [
  /fetchDataCloudProviders/,
  /createDataCloudProvider/,
  /createDataCloudConsentRecord/,
  /createEnrichmentJob/,
  /fetchEnrichmentPreview/,
  /executeEnrichmentJob/,
  /fetchEnrichmentResults/,
  /runIdentityResolution/,
  /fetchUnifiedCustomerProfile/,
  /activateDataCloudSegment/,
  /fetchDataCloudAudit/,
  /\/api\/data-cloud\/providers/,
  /\/api\/data-cloud\/consent-records/,
  /\/api\/data-cloud\/enrichment-jobs/,
  /\/api\/data-cloud\/enrichment-results/,
  /\/api\/data-cloud\/identity-resolution/,
  /\/api\/data-cloud\/unified-profiles/,
  /\/api\/data-cloud\/segment-activations/,
  /\/api\/data-cloud\/audit/
]) {
  check(apiClient, pattern, `apiClient:w07:${pattern.source}`);
}
for (const pattern of [
  /fetchReportDefinitions/,
  /createReportDefinition/,
  /patchReportDefinition/,
  /runReportQuery/,
  /shareReportDefinition/,
  /fetchReportAudit/,
  /fetchAnalyticsClientProfitability/,
  /refreshClientProfitability/,
  /\/api\/reports/,
  /\/api\/analytics\/client-profitability/,
  /DEFAULT_REPORT_PERMISSION_REF/,
  /REPORT_PERMISSION_CONTEXTS/
]) {
  check(apiClient, pattern, `apiClient:w08:${pattern.source}`);
}

const crmRuntime = read("apps/api/src/crm-intake-runtime-context.js");
for (const pattern of [
  /GET \/api\/crm\/leads/,
  /GET \/api\/crm\/opportunities/,
  /GET \/api\/crm\/accounts/,
  /POST \/api\/crm\/accounts/,
  /PATCH \/api\/crm\/accounts\/:id/,
  /GET \/api\/crm\/contacts/,
  /POST \/api\/crm\/contacts/,
  /PATCH \/api\/crm\/contacts\/:id/,
  /GET \/api\/crm\/accounts\/:id\/contacts/,
  /POST \/api\/crm\/duplicate-reviews/,
  /POST \/api\/crm\/opportunities\/:id\/handoff/,
  /GET \/api\/intake\/requests/,
  /POST \/api\/intake\/conflict-checks/,
  /POST \/api\/intake\/clearance-tokens/,
  /GET \/api\/intake\/audit/,
  /handleCrmLeadList/,
  /handleCrmOpportunityList/,
  /CRM_MASTER_DATA_SEED/,
  /handleCrmAccountList/,
  /handleCrmAccountCreate/,
  /handleCrmAccountPatch/,
  /crm.account.created/,
  /crm.account.patched/,
  /serializeRuntimeAccount/,
  /handleCrmContactList/,
  /handleCrmContactCreate/,
  /handleCrmContactPatch/,
  /crm.contact.created/,
  /crm.contact.patched/,
  /serializeRuntimeContact/,
  /handleCrmAccountContactList/,
  /handleCrmDuplicateReview/,
  /registration_number_included:\s*false/,
  /email_value_included:\s*false/,
  /contact_point_value_included:\s*false/,
  /automatic_merge_executed:\s*false/,
  /handleOpportunityHandoff/,
  /handleConflictCheckCreate/,
  /handleClearanceTokenIssue/,
  /handleIntakeAudit/
]) {
  check(crmRuntime, pattern, `crmRuntime:${pattern.source}`);
}

const matterRuntime = read("apps/api/src/matter-runtime-context.js");
for (const pattern of [
  /GET \/api\/matters/,
  /GET \/api\/matters\/:matter_id\/command-center/,
  /GET \/api\/matters\/:matter_id\/timeline/,
  /GET \/api\/matters\/:matter_id\/vault-summary/,
  /GET \/api\/matters\/list-views/,
  /GET \/api\/matters\/recently-viewed/,
  /GET \/api\/matters\/audit/,
  /GET \/api\/matters\/:matter_id\/document-templates/,
  /POST \/api\/matters\/:matter_id\/builder-drafts/,
  /PATCH \/api\/matters\/:matter_id\/builder-drafts\/:draft_id/,
  /GET \/api\/matters\/:matter_id\/builder-drafts\/:draft_id\/preview/,
  /POST \/api\/matters\/:matter_id\/builder-drafts\/:draft_id\/approval-requests/,
  /GET \/api\/matters\/:matter_id\/builder-approval-requests/,
  /POST \/api\/matters\/:matter_id\/builder-drafts\/:draft_id\/publish-to-vault/,
  /POST \/api\/matters\/:matter_id\/email-drafts/,
  /PATCH \/api\/matters\/:matter_id\/email-drafts\/:draft_id/,
  /POST \/api\/matters\/:matter_id\/email-drafts\/:draft_id\/send/,
  /POST \/api\/matters\/openings/,
  /PATCH \/api\/matters\/:matter_id/,
  /POST \/api\/matters\/:matter_id\/documents/,
  /POST \/api\/matters\/list-views/,
  /POST \/api\/matters\/bulk\/status-transitions/,
  /POST \/api\/matters\/:matter_id\/owner-change/,
  /POST \/api\/matters\/:matter_id\/status-transitions/,
  /POST \/api\/matters\/:matter_id\/team-members/,
  /POST \/api\/matters\/:matter_id\/recently-viewed/,
  /handleMatterStatusTransition/,
  /handleMatterRecentlyViewedList/,
  /handleMatterRecentlyViewedMark/,
  /handleMatterListViewList/,
  /handleMatterListViewSave/,
  /handleMatterBulkStatusTransition/,
  /handleMatterInlinePatch/,
  /handleMatterOwnerChange/,
  /matter:status:transition/,
  /matter.status.transitioned/,
  /matter:recent:read/,
  /matter:recent:write/,
  /matter.recently_viewed.mark/,
  /matter:list_view:read/,
  /matter:list_view:write/,
  /matter.list_view.saved/,
  /matter:bulk:status:transition/,
  /matter.bulk.status_transition/,
  /matter:inline:patch/,
  /matter.inline.patch/,
  /matter:owner:change/,
  /matter.owner.change/,
  /owner_assignment/,
  /matter.owner.assignment/,
  /handleMatterDocumentFacade/,
  /handleMatterDocumentTemplates/,
  /handleMatterBuilderDraftCreate/,
  /handleMatterBuilderDraftPatch/,
  /handleMatterBuilderDraftPreview/,
  /handleMatterBuilderApprovalRequest/,
  /handleMatterBuilderApprovalList/,
  /handleMatterBuilderPublishToVault/,
  /handleMatterEmailDraftCreate/,
  /handleMatterEmailDraftPatch/,
  /handleMatterEmailDraftSend/,
  /createMatterDocumentEmailBuilderService/,
  /matter:builder:templates:read/,
  /matter:builder:draft:create/,
  /matter:builder:approval:request/,
  /matter:builder:publish/,
  /matter:email:draft:send/,
  /handleMatterCommandCenter/,
  /handleMatterTimeline/,
  /handleMatterAudit/
]) {
  check(matterRuntime, pattern, `matterRuntime:${pattern.source}`);
}

const recordActionsRuntime = read("apps/api/src/record-actions-runtime-context.js");
for (const pattern of [
  /RECORD_ACTIONS_BOUNDED_CONTEXT/,
  /GET \/api\/record-actions\/:object_name\/fields/,
  /GET \/api\/record-actions\/:object_name\/bulk-actions/,
  /POST \/api\/record-actions\/:object_name\/:record_id\/field-update/,
  /POST \/api\/record-actions\/:object_name\/bulk-updates/,
  /GET \/api\/record-actions\/:object_name\/:record_id\/audit/,
  /handleRecordActionsApiRequest/,
  /evaluateRouteDecision/,
  /record_action:field_registry:read/,
  /record_action:bulk_registry:read/,
  /record_action:field_update/,
  /record_action:bulk_update/,
  /record_action:audit:read/,
  /idempotencyReplay/,
  /recordIdempotency/,
  /approval_required/,
  /production_ready_claim:\s*false/
]) {
  check(recordActionsRuntime, pattern, `recordActionsRuntime:${pattern.source}`);
}

const recordActionRoutes = read("apps/api/src/routes/record-actions.js");
for (const pattern of [
  /RECORD_ACTION_ROUTE_POLICIES/,
  /matchRecordActionRoute/,
  /api\\\/record-actions\\\/\(\[\^\/\]\+\)\\\/fields/,
  /api\\\/record-actions\\\/\(\[\^\/\]\+\)\\\/bulk-updates/,
  /api\\\/record-actions\\\/\(\[\^\/\]\+\)\\\/\(\[\^\/\]\+\)\\\/audit/,
  /record_action:field_registry:read/,
  /record_action:bulk_registry:read/,
  /record_action:field_update/,
  /record_action:bulk_update/,
  /record_action:audit:read/
]) {
  check(recordActionRoutes, pattern, `recordActionRoutes:${pattern.source}`);
}

const importDataMappingRoutes = read("apps/api/src/routes/import-data-mapping.js");
for (const pattern of [
  /IMPORT_DATA_MAPPING_ROUTE_POLICIES/,
  /matchImportDataMappingRoute/,
  /api\\\/import-jobs/,
  /api\\\/import-targets/,
  /api\\\/import-jobs\\\/\(\[\^\/\]\+\)\\\/source-files/,
  /api\\\/import-jobs\\\/\(\[\^\/\]\+\)\\\/preview/,
  /api\\\/import-jobs\\\/\(\[\^\/\]\+\)\\\/field-mappings/,
  /api\\\/import-jobs\\\/\(\[\^\/\]\+\)\\\/dry-run/,
  /api\\\/import-jobs\\\/\(\[\^\/\]\+\)\\\/execute/,
  /api\\\/import-jobs\\\/\(\[\^\/\]\+\)\\\/rollback/,
  /api\\\/import-jobs\\\/\(\[\^\/\]\+\)\\\/error-report/,
  /import:job:read/,
  /import:job:create/,
  /import:target:read/,
  /import:source:stage/,
  /import:preview:read/,
  /import:mapping:write/,
  /import:dry_run/,
  /import:execute/,
  /import:rollback/,
  /import:error_report:read/
]) {
  check(importDataMappingRoutes, pattern, `importDataMappingRoutes:${pattern.source}`);
}

const importDataMappingRuntime = read("apps/api/src/import-data-mapping-runtime-context.js");
for (const pattern of [
  /IMPORT_DATA_MAPPING_BOUNDED_CONTEXT/,
  /handleImportDataMappingApiRequest/,
  /GET \/api\/import-jobs/,
  /POST \/api\/import-jobs/,
  /GET \/api\/import-targets/,
  /POST \/api\/import-jobs\/:jobId\/source-files/,
  /GET \/api\/import-jobs\/:jobId\/preview/,
  /POST \/api\/import-jobs\/:jobId\/field-mappings/,
  /POST \/api\/import-jobs\/:jobId\/dry-run/,
  /POST \/api\/import-jobs\/:jobId\/execute/,
  /POST \/api\/import-jobs\/:jobId\/rollback/,
  /GET \/api\/import-jobs\/:jobId\/error-report/,
  /evaluateRouteDecision/,
  /idempotencyReplay/,
  /recordIdempotency/,
  /count_leak_prevented:\s*true/,
  /production_ready_claim:\s*false/,
  /execute_owner_blocked:\s*true/,
  /raw_schema_mutation_allowed:\s*false/,
  /ui_state:\s*result\.execution\.ui_state/,
  /ui_state:\s*"blocked"/
]) {
  check(importDataMappingRuntime, pattern, `importDataMappingRuntime:${pattern.source}`);
}

const importDataService = read("packages/import-data/src/service.js");
for (const pattern of [
  /CLIENT_MATTER_IMPORT_TARGETS/,
  /BLOCKED_TARGETS/,
  /createClientMatterImportJobService/,
  /listTargets/,
  /createJob/,
  /stageSourceFile/,
  /readPreview/,
  /saveFieldMappings/,
  /dryRun/,
  /execute/,
  /rollback/,
  /errorReport/,
  /raw_file_bytes_included:\s*false/,
  /raw_rows_included:\s*false/,
  /raw_personal_identifiers_included:\s*false/,
  /target_records_mutated:\s*false/,
  /owner_approval_required:\s*true/,
  /outcome:\s*"owner_blocked"/,
  /compensation_receipt_required/,
  /production_ready_claim:\s*false/
]) {
  check(importDataService, pattern, `importDataService:${pattern.source}`);
}

const dataCloudRoutes = read("apps/api/src/routes/data-cloud.js");
for (const pattern of [
  /DATA_CLOUD_ROUTE_POLICIES/,
  /matchDataCloudRoute/,
  /api\\\/data-cloud\\\/providers/,
  /api\\\/data-cloud\\\/consent-records/,
  /api\\\/data-cloud\\\/enrichment-jobs/,
  /api\\\/data-cloud\\\/enrichment-results/,
  /api\\\/data-cloud\\\/identity-resolution/,
  /api\\\/data-cloud\\\/unified-profiles/,
  /api\\\/data-cloud\\\/segment-activations/,
  /api\\\/data-cloud\\\/audit/,
  /data_cloud:provider:read/,
  /data_cloud:provider:register/,
  /data_cloud:consent:write/,
  /data_cloud:enrichment_job:create/,
  /data_cloud:enrichment_preview:read/,
  /data_cloud:enrichment_job:execute/,
  /data_cloud:enrichment_result:read/,
  /data_cloud:identity_resolution:write/,
  /data_cloud:unified_profile:read/,
  /data_cloud:segment_activation:create/,
  /data_cloud:audit:read/
]) {
  check(dataCloudRoutes, pattern, `dataCloudRoutes:${pattern.source}`);
}

const dataCloudRuntime = read("apps/api/src/data-cloud-runtime-context.js");
for (const pattern of [
  /DATA_CLOUD_BOUNDED_CONTEXT/,
  /handleDataCloudApiRequest/,
  /GET \/api\/data-cloud\/providers/,
  /POST \/api\/data-cloud\/providers/,
  /POST \/api\/data-cloud\/consent-records/,
  /POST \/api\/data-cloud\/enrichment-jobs/,
  /GET \/api\/data-cloud\/enrichment-jobs\/:jobId\/preview/,
  /POST \/api\/data-cloud\/enrichment-jobs\/:jobId\/execute/,
  /GET \/api\/data-cloud\/enrichment-results/,
  /POST \/api\/data-cloud\/identity-resolution/,
  /GET \/api\/data-cloud\/unified-profiles\/:profileId/,
  /POST \/api\/data-cloud\/segment-activations/,
  /GET \/api\/data-cloud\/audit/,
  /evaluateRouteDecision/,
  /idempotencyReplay/,
  /recordIdempotency/,
  /external_provider_runtime_enabled:\s*false/,
  /product_record_mutation_allowed:\s*false/,
  /provider_blocked/,
  /owner_blocked/,
  /provider_payload_included:\s*false/,
  /raw_identifiers_included:\s*false/,
  /production_ready_claim:\s*false/
]) {
  check(dataCloudRuntime, pattern, `dataCloudRuntime:${pattern.source}`);
}

const dataCloudService = read("packages/data-cloud/src/service.js");
for (const pattern of [
  /DATA_CLOUD_MODEL/,
  /createDataCloudEnrichmentService/,
  /registerProvider/,
  /recordConsent/,
  /createEnrichmentJob/,
  /previewEnrichmentJob/,
  /executeEnrichmentJob/,
  /listEnrichmentResults/,
  /runIdentityResolution/,
  /getUnifiedProfile/,
  /createSegmentActivation/,
  /listAudit/,
  /provider_call_performed:\s*false/,
  /product_records_mutated:\s*false/,
  /raw_identifiers_included:\s*false/,
  /provider_payload_included:\s*false/,
  /direct_identifiers_included:\s*false/,
  /automatic_merge_performed:\s*false/,
  /canonical_master_data_write_performed:\s*false/,
  /activation_submitted:\s*false/,
  /provider_receipt_required:\s*true/,
  /production_ready_claim:\s*false/
]) {
  check(dataCloudService, pattern, `dataCloudService:${pattern.source}`);
}

const recordActionService = read("packages/record-actions/src/service.js");
for (const pattern of [
  /RECORD_ACTION_OBJECTS/,
  /normalizeRecordActionObject/,
  /createRecordActionService/,
  /registryFor/,
  /bulkRegistryFor/,
  /patchRecord/,
  /bulkUpdate/,
  /listAudit/,
  /owner_blocked/,
  /provider_approval_required/,
  /record_action\.field_updated/,
  /record_action\.\$\{action_type\}\.blocked/,
  /actor_ref_included:\s*false/,
  /raw_values_included:\s*false/
]) {
  check(recordActionService, pattern, `recordActionService:${pattern.source}`);
}

const vaultRuntime = read("apps/api/src/vault-dms-runtime-context.js");
for (const pattern of [
  /GET \/api\/vault\/documents/,
  /GET \/api\/vault\/search/,
  /GET \/api\/vault\/audit/,
  /handleVaultDocumentList/,
  /handleVaultSearch/,
  /handleVaultAudit/,
  /raw_path_exposed:\s*false/,
  /document_bytes_included:\s*false/,
  /storage_pointer_ref_included:\s*false/
]) {
  check(vaultRuntime, pattern, `vaultRuntime:${pattern.source}`);
}

const dmsSearchIndexer = read("packages/dms/src/search/indexer.js");
for (const pattern of [
  /raw_text_included:\s*false/,
  /storage_pointer_ref_included:\s*false/
]) {
  check(dmsSearchIndexer, pattern, `dmsSearchIndexer:${pattern.source}`);
}

const financeRuntime = read("apps/api/src/finance-runtime-context.js");
for (const pattern of [
  /\/api\/finance\/time-entries/,
  /\/api\/finance\/invoices/,
  /\/api\/finance\/ar-aging/,
  /\/api\/finance\/wip/,
  /\/api\/finance\/payments/,
  /\/api\/finance\/audit/,
  /handleFinanceTimeEntryCreate/,
  /handleFinanceWipGenerate/,
  /handleFinancePaymentImport/,
  /handleFinanceAudit/
]) {
  check(financeRuntime, pattern, `financeRuntime:${pattern.source}`);
}

const analyticsRuntime = read("apps/api/src/analytics-runtime-context.js");
for (const pattern of [
  /\/api\/analytics\/dashboards/,
  /\/api\/analytics\/refresh/,
  /\/api\/analytics\/matter-profitability/,
  /\/api\/analytics\/client-profitability/,
  /\/api\/analytics\/exports/,
  /handleAnalyticsRefresh/,
  /handleMatterProfitabilityCreate/,
  /handleClientProfitabilityCreate/,
  /handleAnalyticsExportCreate/
]) {
  check(analyticsRuntime, pattern, `analyticsRuntime:${pattern.source}`);
}
forbid(analyticsRuntime, /\/api\/reports|handleReportDefinition|handleReportQuery|handleReportShare/, "analyticsRuntime:no-report-builder-route-in-analytics-runtime");

const analyticsMetricsService = read("packages/analytics/src/metrics-service.js");
for (const pattern of [
  /createMatterProfitability/,
  /createClientProfitability/,
  /model_type:\s*"ClientProfitability"/,
  /client_group_id/,
  /created_client_identity:\s*false/,
  /source_object_mutated:\s*false/,
  /analytics\.client_profitability\.refresh/
]) {
  check(analyticsMetricsService, pattern, `analyticsMetricsService:${pattern.source}`);
}

const reportsRuntime = read("apps/api/src/reports-runtime-context.js");
for (const pattern of [
  /REPORTS_BOUNDED_CONTEXT/,
  /GET \/api\/reports/,
  /POST \/api\/reports/,
  /PATCH \/api\/reports\/:reportId/,
  /POST \/api\/reports\/:reportId\/run/,
  /POST \/api\/reports\/:reportId\/share/,
  /GET \/api\/reports\/:reportId\/audit/,
  /handleReportsApiRequest/,
  /report:definition:read/,
  /report:definition:write/,
  /report:definition:patch/,
  /report:query:run/,
  /report:share:write/,
  /report:audit:read/,
  /owner_blocked/,
  /arbitrary_sql_executed:\s*false/,
  /source_object_mutated:\s*false/
]) {
  check(reportsRuntime, pattern, `reportsRuntime:${pattern.source}`);
}

const reportsRoutes = read("apps/api/src/routes/reports.js");
for (const pattern of [
  /api\\\/reports/,
  /api\\\/reports\\\/\(\[\^\/\]\+\)\\\/run/,
  /api\\\/reports\\\/\(\[\^\/\]\+\)\\\/share/,
  /api\\\/reports\\\/\(\[\^\/\]\+\)\\\/audit/,
  /matchReportRoute/
]) {
  check(reportsRoutes, pattern, `reportsRoutes:${pattern.source}`);
}

const reportsService = read("packages/reports/src/service.js");
for (const pattern of [
  /createReportBuilderService/,
  /REPORT_MODEL/,
  /listReports/,
  /createReport/,
  /patchReport/,
  /runReport/,
  /shareReport/,
  /listAudit/,
  /raw_sql_included:\s*false/,
  /arbitrary_sql_executed:\s*false/,
  /row_level_billing_payload_included:\s*false/,
  /share_grant_applied:\s*false/,
  /owner_decision_required:\s*true/
]) {
  check(reportsService, pattern, `reportsService:${pattern.source}`);
}

const apiServer = read("apps/api/src/server.js");
for (const pattern of [
  /RECORD_ACTIONS_BOUNDED_CONTEXT/,
  /handleRecordActionsApiRequest/,
  /isRecordActionsPath/,
  /\/api\/record-actions/,
  /IMPORT_DATA_MAPPING_BOUNDED_CONTEXT/,
  /handleImportDataMappingApiRequest/,
  /isImportDataMappingPath/,
  /\/api\/import-jobs/,
  /\/api\/import-targets/,
  /REPORTS_BOUNDED_CONTEXT/,
  /handleReportsApiRequest/,
  /isReportsPath/,
  /\/api\/reports/,
  /enrichment:\s*Object\.freeze/,
  /contract_ref:\s*"contracts\/matter-core-contract\.json"/,
  /mode:\s*"synthetic_crosswalk"/,
  /synthetic_only:\s*true/,
  /uses_real_client_data:\s*false/
]) {
  check(apiServer, pattern, `apiServer:${pattern.source}`);
}

for (const pattern of [
  /matter_core_enrichment/,
  /businessLabel\(client\?\.matter_core_enrichment\?\.matter_title/,
  /businessLabel\(item\.matter_core_enrichment\?\.matter_title/
]) {
  check(clients, pattern, `clientsDataCloudFoundation:${pattern.source}`);
}

const enterpriseG7 = read("packages/enterprise/src/client-matter-g7.js");
for (const pattern of [
  /noRuntimeBoundary/,
  /synthetic_only:\s*true/,
  /no_real_data:\s*true/,
  /calls_external_provider_api:\s*false/,
  /reads_customer_payload:\s*false/,
  /createEnterpriseG7IntegrationBaselineDescriptor/,
  /integration_baseline_external_runtime_blocked/
]) {
  check(enterpriseG7, pattern, `enterpriseG7:${pattern.source}`);
}

const permissionGate = read("apps/api/src/permission-gate.js");
for (const pattern of [
  /PERMISSION_CONTEXT_HEADER/,
  /x-lawos-permission-context/,
  /parsePermissionContext/,
  /evaluateRouteDecision/,
  /trimItemsByPermission/,
  /evaluatePermission/
]) {
  check(permissionGate, pattern, `permissionGate:${pattern.source}`);
}

const permissionSimulator = read("apps/api/src/routes/permission-simulator.js");
for (const pattern of [
  /simulatePermissionReadOnly/,
  /read_only:\s*true/,
  /writes_product_state:\s*false/,
  /production_ready_claim:\s*false/
]) {
  check(permissionSimulator, pattern, `permissionSimulator:${pattern.source}`);
}

const authzAdminSimulator = read("packages/authz/src/admin-simulator.js");
for (const pattern of [
  /simulateAdminPermission/,
  /simulator_only:\s*true/,
  /grant_applied:\s*false/,
  /can_grant_access:\s*false/,
  /runtime_readiness_claim:\s*"open"/
]) {
  check(authzAdminSimulator, pattern, `authzAdminSimulator:${pattern.source}`);
}

const authzPermissionControls = read("packages/authz/src/permission-controls.js");
for (const pattern of [
  /PERMISSION_EVALUATE_ROUTE/,
  /\/permissions\/evaluate/,
  /evaluatePermissionControlRequest/,
  /break_glass_requires_reason_approval_audit/,
  /runtime_readiness_claim:\s*"open"/
]) {
  check(authzPermissionControls, pattern, `authzPermissionControls:${pattern.source}`);
}

const authzPermissionContextStore = read("packages/authz/src/permission-context-store.js");
for (const pattern of [
  /createPermissionContextStore/,
  /savePermissionContext/,
  /permission_context\.save/
]) {
  check(authzPermissionContextStore, pattern, `authzPermissionContextStore:${pattern.source}`);
}

const authzPolicyStore = read("packages/authz/src/policy-store.js");
for (const pattern of [
  /createPolicyStore/,
  /savePolicy/,
  /policy\.save/
]) {
  check(authzPolicyStore, pattern, `authzPolicyStore:${pattern.source}`);
}

const authzObjectAclStore = read("packages/authz/src/object-acl-store.js");
for (const pattern of [
  /createObjectAclStore/,
  /saveObjectAcl/,
  /object_acl\.save/
]) {
  check(authzObjectAclStore, pattern, `authzObjectAclStore:${pattern.source}`);
}

for (const file of [
  "packages/master-data/src/client-group-service.js",
  "packages/master-data/src/person-service.js",
  "packages/master-data/src/organization-service.js",
  "packages/master-data/src/contact-point-service.js",
  "packages/master-data/src/relationship-service.js",
  "packages/master-data/src/duplicate-service.js",
  "packages/crm/src/lead-service.js",
  "packages/crm/src/opportunity-service.js",
  "packages/crm/src/intake-handoff-service.js",
  "packages/intake/src/intake-request-service.js",
  "packages/record-actions/src/service.js",
  "packages/import-data/src/service.js",
  "packages/matter/src/timeline-read-model.js",
  "packages/matter/src/document-email-builder-service.js",
  "packages/billing/src/finance-repository.js",
  "packages/analytics/src/dashboard-service.js"
]) {
  checkFile(file);
}

const masterDataRuntimeServicesTest = read("packages/master-data/test/runtime-services.test.js");
for (const pattern of [
  /Person service returns duplicate email warnings/,
  /Organization service blocks duplicate business registration/,
  /ClientGroup service validates primary party/,
  /ContactPoint service validates primary and verified state/,
  /Duplicate service returns similar name and identifier candidates/
]) {
  check(masterDataRuntimeServicesTest, pattern, `masterDataRuntimeServicesTest:${pattern.source}`);
}

const uiRegression = read("apps/web/test/ui-regression.test.mjs");
for (const pattern of [
  /data-salesforce-client-workspace="list-detail-right-panel"/,
  /data-salesforce-matter-workspace="list-detail-right-panel"/,
  /data-matter-selected-record-list="true"/,
  /data-matter-select-row="true"/,
  /onSelectMatter/,
  /data-matter-saved-list-views="true"/,
  /data-matter-list-view-option="true"/,
  /data-matter-save-list-view-action="true"/,
  /data-matter-bulk-actions="true"/,
  /data-matter-bulk-select-row="true"/,
  /data-matter-bulk-status-action="true"/,
  /data-matter-record-inline-edit-action="true"/,
  /data-matter-record-inline-edit-result="true"/,
  /data-sf-b-w02-record-actions-panel="true"/,
  /data-sf-b-w02-field-registry="true"/,
  /data-sf-b-w02-action-audit-feed="true"/,
  /data-sf-b-w02-owner-blocked-result="true"/,
  /data-sf-b-w02-account-record-action-result="true"/,
  /data-sf-b-w02-contact-record-action-result="true"/,
  /data-sf-b-w02-matter-record-actions="true"/,
  /data-sf-b-w02-matter-record-action-result="true"/,
  /data-sf-b-w02-matter-owner-blocked-result="true"/,
  /data-sf-b-w02-matter-action-audit-feed="true"/,
  /fetchMatterCommandCenter/,
  /fetchMatterListViews/,
  /saveMatterListView/,
  /bulkCompleteMatterStatus/,
  /updateMatterInlineFields/,
  /fetchMatterAudit/,
  /completeMatterStatus/,
  /fetchFinanceAudit/,
  /fetchCrmLeads/,
  /fetchCrmAccounts/,
  /fetchCrmContacts/,
  /fetchCrmAccountContacts/,
  /handoffCrmOpportunityToIntake/,
  /createIntakeConflictCheck/,
  /issueIntakeClearanceToken/,
  /createFinanceTimeEntry/,
  /generateFinanceWip/,
  /importFinancePayment/,
  /refreshAnalyticsDashboards/,
  /refreshMatterProfitability/,
  /createAnalyticsExport/,
  /createMatterDocumentFacade/,
  /data-sf-b-w04-document-builder=\"true\"/,
  /data-matter-document-builder=\"route-backed\"/,
  /data-sf-b-w04-builder-draft-action=\"true\"/,
  /data-sf-b-w04-builder-preview=\"true\"/,
  /data-sf-b-w04-builder-approval-action=\"true\"/,
  /data-sf-b-w04-builder-publish-blocked-result=\"true\"/,
  /data-sf-b-w04-email-composer=\"true\"/,
  /data-matter-email-composer=\"provider-blocked\"/,
  /data-sf-b-w04-email-draft-action=\"true\"/,
  /data-sf-b-w04-email-send-provider-blocked=\"true\"/,
  /fetchMatterDocumentTemplates/,
  /createMatterBuilderDraft/,
  /requestMatterBuilderApproval/,
  /publishMatterBuilderDraftToVault/,
  /createMatterEmailDraft/,
  /requestMatterEmailDraftSendBoundary/,
  /fetchRecordActionFields/,
  /fetchRecordActionAudit/,
  /updateRecordActionField/,
  /bulkUpdateRecordActions/,
  /data-crm-handoff-action="true"/,
  /data-crm-handoff-refresh-result="true"/,
  /data-crm-accounts-read="true"/,
  /data-crm-contacts-read="true"/,
  /data-crm-account-contacts-read="true"/,
  /data-intake-clearance-action="true"/,
  /data-matter-billing-actions="true"/,
  /data-matter-time-entry-action="true"/,
  /data-matter-analytics-actions="true"/,
  /data-matter-analytics-export-action="true"/,
  /data-matter-analytics-export-safe-state="true"/,
  /data-matter-status-transition-action="true"/,
  /data-matter-recently-viewed="true"/,
  /data-matter-activity-timeline="true"/,
  /data-matter-activity-filters="true"/,
  /data-matter-activity-read-boundary="true"/,
  /data-matter-owner-assignment-action="true"/,
  /data-matter-owner-assignment-result="true"/,
  /normalizeMatterTeamMemberPayload/,
  /matter-command-audit-trail/,
  /matter-finance-audit-trail/,
  /data-matter-vault-record-workspace="true"/,
  /data-matter-document-facade-action="true"/,
  /fetchMatterVaultDocuments/,
  /fetchMatterVaultSearch/,
  /fetchMatterVaultAudit/,
  /matter-vault-documents/,
  /matter-vault-search/,
  /matter-vault-audit/,
  /ImportDataMappingPanel/,
  /client-import/,
  /matter-import/,
  /data-sf-b-w05-import-wizard="true"/,
  /data-client-matter-import-wizard="route-backed"/,
  /data-sf-b-w05-field-mapping-stepper="true"/,
  /data-sf-b-w05-dry-run-action="true"/,
  /data-sf-b-w05-execute-owner-blocked-result="true"/,
  /data-sf-b-w05-rollback-result="true"/,
  /data-sf-b-w05-error-report="true"/,
  /fetchClientMatterImportTargets/,
  /createClientMatterImportJob/,
  /stageImportSourceFile/,
  /saveImportFieldMapping/,
  /dryRunClientMatterImport/,
  /executeClientMatterImport/,
  /rollbackClientMatterImport/,
  /fetchClientMatterImportErrorReport/
]) {
  check(uiRegression, pattern, `uiRegression:${pattern.source}`);
}

assert.equal(failures.length, 0, `SF Client/Matter parity validation failed:\n- ${failures.join("\n- ")}`);
console.log("SF Client/Matter parity validation passed.");
console.log("salesforce_atlas_png_count: >=894");
console.log("salesforce_screenshot_inventory: 883 source + 11 derived PNG assets verified");
console.log("objective_completion_audit: 8 requirements evidence-mapped, completion claim false");
console.log("current_validation_receipt: 18 commands passed, local evidence only");
console.log("browser_qa_receipt: 13 routes and 147 checks driven, local claims false");
console.log("surface_connection_ledger: 14 connected rows verified");
console.log("track_a_ui_entrypoints: verified");
console.log("track_b_route_contract_gates: verified");
console.log("production_or_trust_claim: false");
