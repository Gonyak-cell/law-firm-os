#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const errors = [];

function assert(condition, message) {
  if (!condition) errors.push(message);
}

function read(path) {
  return readFileSync(resolve(root, path), "utf8");
}

function readJson(path) {
  return JSON.parse(read(path));
}

function fileExists(path) {
  return existsSync(resolve(root, path));
}

const ledgerPath = "docs/hro-deel-parity/crosswalk-ledger.json";
const ledger = readJson(ledgerPath);
const contractRegistryPath = ledger.backend_contract_registry?.path;
const contractRegistry = contractRegistryPath && fileExists(contractRegistryPath) ? readJson(contractRegistryPath) : null;
const screenshotInventoryPath = ledger.screenshot_inventory?.inventory_path;
const screenshotInventory = screenshotInventoryPath && fileExists(screenshotInventoryPath) ? readJson(screenshotInventoryPath) : null;
const completionAuditPath = "docs/hro-deel-parity/completion-audit.json";
const completionAudit = fileExists(completionAuditPath) ? readJson(completionAuditPath) : null;
const allowedStatuses = new Set([
  "implemented_ui_entrypoint",
  "backend_boundary_route_unmounted",
  "backend_contract_required",
  "external_owner_decision_required",
  "not_people_related"
]);

assert(ledger.schema_version === "hro.deel_parity.crosswalk.v1", "ledger schema_version mismatch");
assert(ledger.program_id === "HRO-DEEL-PARITY", "program id mismatch");
assert(ledger.claim_boundary?.go_live_or_production_approval_claim_allowed === false, "go-live claim must stay blocked");
assert(ledger.claim_boundary?.runtime_or_ui_parity_claim_allowed === false, "runtime/UI parity claim must stay blocked");

const screenshotDir = ledger.screenshot_inventory?.source_dir;
assert(typeof screenshotDir === "string" && screenshotDir.length > 0, "screenshot source_dir missing");
assert(fileExists(screenshotDir), `screenshot source dir missing: ${screenshotDir}`);
let actualScreenshotCount = 0;
if (fileExists(screenshotDir)) {
  const count = readdirSync(resolve(root, screenshotDir)).filter((name) => /\.(png|jpg|jpeg)$/i.test(name)).length;
  actualScreenshotCount = count;
  assert(count === ledger.screenshot_inventory.actual_file_count, `screenshot count mismatch: expected ${ledger.screenshot_inventory.actual_file_count}, got ${count}`);
}
assert(typeof screenshotInventoryPath === "string" && screenshotInventoryPath.length > 0, "screenshot inventory path missing");
assert(fileExists(screenshotInventoryPath), `screenshot inventory missing: ${screenshotInventoryPath}`);
assert(fileExists(ledger.screenshot_inventory?.inventory_summary_path), `screenshot inventory summary missing: ${ledger.screenshot_inventory?.inventory_summary_path}`);
assert(fileExists(completionAuditPath), `completion audit missing: ${completionAuditPath}`);
assert(fileExists("docs/hro-deel-parity/completion-audit.md"), "completion audit summary missing");

assert(ledger.hermes_check_only_gate?.required === true, "Hermes check-only gate must be required");
assert(ledger.hermes_check_only_gate?.mutation_allowed_now === false, "Hermes mutation_allowed_now must be false");
assert(ledger.hermes_check_only_gate?.deployment_allowed_now === false, "Hermes deployment_allowed_now must be false");
assert(ledger.hermes_check_only_gate?.final_approval_allowed_now === false, "Hermes final_approval_allowed_now must be false");
assert(ledger.hermes_check_only_gate?.enterprise_trust_claim_allowed_now === false, "Hermes enterprise trust claim must be false");
assert(typeof contractRegistryPath === "string" && contractRegistryPath.length > 0, "backend contract registry path missing");
assert(fileExists(contractRegistryPath), `backend contract registry missing: ${contractRegistryPath}`);
assert(fileExists(ledger.backend_contract_registry?.summary_path), `backend contract register summary missing: ${ledger.backend_contract_registry?.summary_path}`);

const shell = read("apps/web/src/components/Shell.jsx");
const peopleHome = read("apps/web/src/people/PeopleHome.tsx");
const runtime = read("apps/api/src/hrx-runtime-context.js");
const apiClient = read("apps/web/src/people/hrxApiClient.ts");

assert(Array.isArray(ledger.current_people_menu) && ledger.current_people_menu.length >= 10, "current_people_menu must include baseline and newly surfaced entries");
for (const item of ledger.current_people_menu) {
  assert(typeof item.label === "string" && item.label.length > 0, "menu label missing");
  assert(typeof item.section === "string" && item.section.startsWith("people-"), `invalid menu section: ${item.section}`);
  assert(shell.includes(`label: "${item.label}"`), `Shell missing People menu label: ${item.label}`);
  assert(shell.includes(`section: "${item.section}"`), `Shell missing People section: ${item.section}`);
  assert(peopleHome.includes(`"${item.section}"`), `PeopleHome missing allowed section: ${item.section}`);
}

assert(peopleHome.includes("HRAnalytics"), "PeopleHome must expose HRAnalytics");
assert(peopleHome.includes("HRAIAssistant"), "PeopleHome must expose HRAIAssistant");
assert(runtime.includes('pathname === "/api/hrx/analytics"'), "HRX runtime missing analytics route");
assert(runtime.includes('pathname === "/api/hrx/ai/assistant"'), "HRX runtime missing AI assistant route");
assert(runtime.includes('pathname === "/api/hrx/ai/reviews"'), "HRX runtime missing AI reviews route");

const features = ledger.feature_crosswalk;
assert(Array.isArray(features) && features.length >= 10, "feature_crosswalk must contain at least 10 feature families");
const byStatus = new Map();
for (const feature of features) {
  assert(typeof feature.id === "string" && feature.id.length > 0, "feature id missing");
  assert(typeof feature.deel_feature === "string" && feature.deel_feature.length > 0, `${feature.id}: deel_feature missing`);
  assert(allowedStatuses.has(feature.lawos_status), `${feature.id}: unsupported status ${feature.lawos_status}`);
  byStatus.set(feature.lawos_status, (byStatus.get(feature.lawos_status) ?? 0) + 1);
  assert(["A", "B", "C"].includes(feature.risk_class), `${feature.id}: risk_class must be A/B/C`);
  assert(Array.isArray(feature.deel_evidence) && feature.deel_evidence.length > 0, `${feature.id}: Deel evidence missing`);
  assert(feature.backend_evidence && typeof feature.backend_evidence === "object", `${feature.id}: backend_evidence missing`);
  assert(feature.ui_evidence && typeof feature.ui_evidence === "object", `${feature.id}: ui_evidence missing`);
  assert(typeof feature.next_tuw === "string" && /^HRO-L[0-9]-W[0-9]{2}-T[0-9]{2}$/.test(feature.next_tuw), `${feature.id}: next_tuw format invalid`);
  assert(Array.isArray(feature.verification_cases) && feature.verification_cases.length > 0, `${feature.id}: verification cases missing`);

  if (feature.lawos_status === "implemented_ui_entrypoint") {
    assert(typeof feature.ui_evidence.section === "string", `${feature.id}: implemented feature missing UI section`);
    assert(peopleHome.includes(feature.ui_evidence.section), `${feature.id}: PeopleHome missing ${feature.ui_evidence.section}`);
    for (const path of feature.ui_evidence.files ?? []) {
      assert(fileExists(path), `${feature.id}: UI evidence file missing: ${path}`);
    }
  }
}

for (const status of ["implemented_ui_entrypoint", "backend_contract_required", "external_owner_decision_required"]) {
  assert((byStatus.get(status) ?? 0) > 0, `feature_crosswalk missing required status: ${status}`);
}

if (screenshotInventory) {
  assert(screenshotInventory.schema_version === "hro.deel_parity.screenshot_inventory.v1", "screenshot inventory schema_version mismatch");
  assert(screenshotInventory.program_id === ledger.program_id, "screenshot inventory program mismatch");
  assert(screenshotInventory.source_dir === screenshotDir, "screenshot inventory source_dir mismatch");
  assert(screenshotInventory.source_file_count === ledger.screenshot_inventory.actual_file_count, "screenshot inventory source count mismatch");
  assert(Array.isArray(screenshotInventory.rows), "screenshot inventory rows missing");
  assert(screenshotInventory.rows?.length === actualScreenshotCount, `screenshot inventory rows mismatch: expected ${actualScreenshotCount}, got ${screenshotInventory.rows?.length ?? 0}`);
  assert(screenshotInventory.people_related_count === ledger.screenshot_inventory.people_related_count, "screenshot inventory people_related_count mismatch");
  assert(screenshotInventory.non_people_reference_count === ledger.screenshot_inventory.non_people_reference_count, "screenshot inventory non_people_reference_count mismatch");
  assert(
    screenshotInventory.people_related_count + screenshotInventory.non_people_reference_count === screenshotInventory.source_file_count,
    "screenshot inventory people/non-people counts must equal source count"
  );
  assert(screenshotInventory.ocr_engine === ledger.screenshot_inventory.ocr_engine, "screenshot inventory OCR engine mismatch");
  assert(screenshotInventory.people_related_count > 0, "screenshot inventory must identify People-related screenshots");
  assert(screenshotInventory.non_people_reference_count > 0, "screenshot inventory must identify non-People reference screenshots");

  const featureIds = new Set(features.map((feature) => feature.id));
  const screenshotFeatureIds = new Set();
  const screenshotStatuses = new Set();
  const screenshotIds = new Set();
  for (const row of screenshotInventory.rows) {
    assert(Number.isInteger(row.screenshot_id), "screenshot row missing numeric screenshot_id");
    assert(!screenshotIds.has(row.screenshot_id), `duplicate screenshot_id: ${row.screenshot_id}`);
    screenshotIds.add(row.screenshot_id);
    assert(typeof row.file === "string" && row.file.length > 0, `${row.screenshot_id}: screenshot file missing`);
    assert(fileExists(`Law Firm OS UI/${row.file}`), `${row.screenshot_id}: screenshot source file not found: Law Firm OS UI/${row.file}`);
    assert(typeof row.primary_feature_id === "string" && row.primary_feature_id.length > 0, `${row.screenshot_id}: primary_feature_id missing`);
    assert(allowedStatuses.has(row.primary_lawos_status), `${row.screenshot_id}: unsupported screenshot status ${row.primary_lawos_status}`);
    assert(Number.isInteger(row.ocr_line_count) && row.ocr_line_count >= 0, `${row.screenshot_id}: invalid OCR line count`);
    assert(typeof row.ocr_excerpt === "string", `${row.screenshot_id}: OCR excerpt missing`);
    assert(Array.isArray(row.matched_features), `${row.screenshot_id}: matched_features missing`);
    screenshotStatuses.add(row.primary_lawos_status);
    if (row.primary_feature_id !== "non_people_reference") {
      assert(featureIds.has(row.primary_feature_id), `${row.screenshot_id}: unknown primary feature ${row.primary_feature_id}`);
      screenshotFeatureIds.add(row.primary_feature_id);
    }
    for (const match of row.matched_features) {
      assert(featureIds.has(match.feature_id), `${row.screenshot_id}: unknown matched feature ${match.feature_id}`);
      assert(Number.isInteger(match.score) && match.score > 0, `${row.screenshot_id}: invalid match score for ${match.feature_id}`);
      assert(Array.isArray(match.matched_keywords) && match.matched_keywords.length > 0, `${row.screenshot_id}: matched keywords missing for ${match.feature_id}`);
    }
  }
  for (const feature of features) {
    assert(screenshotFeatureIds.has(feature.id), `screenshot inventory missing primary rows for feature: ${feature.id}`);
  }
  for (const status of ["implemented_ui_entrypoint", "backend_contract_required", "external_owner_decision_required", "not_people_related"]) {
    assert(screenshotStatuses.has(status), `screenshot inventory missing status: ${status}`);
  }
}

if (contractRegistry) {
  assert(contractRegistry.schema_version === "hro.deel_parity.backend_contract_registry.v1", "backend contract registry schema_version mismatch");
  assert(contractRegistry.program_id === ledger.program_id, "backend contract registry program mismatch");
  assert(contractRegistry.policy?.fake_ui_exposure_allowed === false, "backend contract registry must block fake UI exposure");
  assert(contractRegistry.policy?.external_provider_ready_claim_allowed === false, "backend contract registry must block external provider readiness claims");
  assert(Array.isArray(contractRegistry.contracts) && contractRegistry.contracts.length >= 4, "backend contract registry contracts missing");
  assert(Array.isArray(contractRegistry.blocked_ui_sections) && contractRegistry.blocked_ui_sections.length > 0, "blocked UI sections missing");

  const contractByFeature = new Map(contractRegistry.contracts.map((contract) => [contract.feature_id, contract]));
  const blockedSections = new Set(contractRegistry.blocked_ui_sections);
  for (const feature of features.filter((item) => item.lawos_status === "backend_contract_required" || item.lawos_status === "external_owner_decision_required")) {
    const contract = contractByFeature.get(feature.id);
    assert(contract, `${feature.id}: backend contract registry row missing`);
    if (!contract) continue;
    assert(contract.lawos_status === feature.lawos_status, `${feature.id}: contract status mismatch`);
    assert(contract.next_tuw === feature.next_tuw, `${feature.id}: contract next_tuw mismatch`);
    assert(contract.risk_class === feature.risk_class, `${feature.id}: contract risk class mismatch`);
    assert(contract.ui_gate?.current_ui_exposure_allowed === false, `${feature.id}: contract UI exposure must be blocked`);
    assert(Array.isArray(contract.ui_gate?.blocked_sections) && contract.ui_gate.blocked_sections.length > 0, `${feature.id}: blocked UI sections missing`);
    assert(Array.isArray(contract.verification_cases) && contract.verification_cases.length > 0, `${feature.id}: contract verification cases missing`);
    assert(Array.isArray(contract.evidence_gate) && contract.evidence_gate.length > 0, `${feature.id}: contract evidence gate missing`);
    for (const section of contract.ui_gate.blocked_sections) blockedSections.add(section);

    if (feature.lawos_status === "backend_contract_required") {
      assert(Array.isArray(contract.contract_required?.routes) && contract.contract_required.routes.length > 0, `${feature.id}: required routes missing`);
      assert(Array.isArray(contract.contract_required?.domain_objects) && contract.contract_required.domain_objects.length > 0, `${feature.id}: domain objects missing`);
      assert(Array.isArray(contract.contract_required?.required_scopes) && contract.contract_required.required_scopes.length > 0, `${feature.id}: required scopes missing`);
      assert(Array.isArray(contract.contract_required?.audit_events) && contract.contract_required.audit_events.length > 0, `${feature.id}: audit events missing`);
      assert(Array.isArray(contract.contract_required?.required_boundaries) && contract.contract_required.required_boundaries.length > 0, `${feature.id}: required boundaries missing`);
    }

    if (feature.lawos_status === "external_owner_decision_required") {
      assert(contract.owner_decision_required?.required === true, `${feature.id}: owner decision requirement missing`);
      assert(Array.isArray(contract.owner_decision_required?.missing_receipts) && contract.owner_decision_required.missing_receipts.length > 0, `${feature.id}: missing receipt list missing`);
      assert(Array.isArray(contract.owner_decision_required?.blocked_actions) && contract.owner_decision_required.blocked_actions.length > 0, `${feature.id}: blocked action list missing`);
      assert(Array.isArray(contract.contract_required_after_owner_decision?.routes) && contract.contract_required_after_owner_decision.routes.length > 0, `${feature.id}: post-owner contract routes missing`);
    }
  }

  for (const section of blockedSections) {
    assert(!shell.includes(`section: "${section}"`), `blocked fake UI section exposed in Shell: ${section}`);
    assert(!peopleHome.includes(`"${section}"`), `blocked fake UI section exposed in PeopleHome: ${section}`);
    assert(!apiClient.includes(section), `blocked fake UI section exposed in HRX UI client: ${section}`);
  }
}

if (completionAudit) {
  assert(completionAudit.schema_version === "hro.deel_parity.completion_audit.v1", "completion audit schema_version mismatch");
  assert(completionAudit.program_id === ledger.program_id, "completion audit program mismatch");
  assert(completionAudit.go_live_or_production_approval_claim_allowed === false, "completion audit must block go-live/production approval claims");
  assert(Array.isArray(completionAudit.requirements) && completionAudit.requirements.length >= 5, "completion audit requirements missing");
  const requirementIds = new Set(completionAudit.requirements.map((requirement) => requirement.id));
  for (const requiredId of [
    "REQ-1-SCREENSHOT-CROSSWALK",
    "REQ-2-BACKEND-IMPLEMENTED-UI",
    "REQ-3-MISSING-BACKEND-CONTRACTS",
    "REQ-4-EVIDENCE-GATES",
    "REQ-5-NO-GO-LIVE-CLAIM"
  ]) {
    assert(requirementIds.has(requiredId), `completion audit missing requirement: ${requiredId}`);
  }
  for (const requirement of completionAudit.requirements) {
    assert(requirement.status === "proven_current", `${requirement.id}: completion audit status must be proven_current`);
    assert(Array.isArray(requirement.evidence) && requirement.evidence.length > 0, `${requirement.id}: completion audit evidence missing`);
  }
}

const payroll = features.find((feature) => feature.id === "payroll-export-boundary");
assert(payroll?.lawos_status === "implemented_ui_entrypoint", "payroll boundary must be implemented as preview/export-only UI entrypoint");
assert(fileExists("apps/api/src/routes/hrx/payroll.js"), "payroll route file missing");
assert(runtime.includes("/api/hrx/payroll") || runtime.includes("\\/api\\/hrx\\/payroll"), "payroll route must be mounted in HRX runtime");
assert(peopleHome.includes("people-payroll") && peopleHome.includes("PayrollBoundaryPanel"), "PeopleHome must expose payroll boundary panel");
assert(fileExists("apps/web/src/people/payroll/PayrollBoundaryPanel.tsx"), "Payroll boundary UI missing");
const payrollUi = read("apps/web/src/people/payroll/PayrollBoundaryPanel.tsx");
const peopleKoUiPlan = read("docs/hro-deel-parity/people-ko-ui-implementation-plan.md");
assert(apiClient.includes("/api/hrx/payroll/preview"), "HRX UI client missing payroll preview API");
assert(apiClient.includes("/api/hrx/payroll/approve"), "HRX UI client missing payroll approval API");
assert(apiClient.includes("/api/hrx/payroll/export"), "HRX UI client missing payroll export API");
assert(apiClient.includes("hrx.payroll.preview") && apiClient.includes("hrx.payroll.export"), "HRX UI client missing payroll scopes");
assert(payrollUi.includes("calculation_runtime") && payrollUi.includes("disbursement_instruction_included"), "Payroll UI must show calculation/disbursement boundary");
assert(payrollUi.includes("급여정산") && payrollUi.includes("계산·세금·지급 실행은 아직 구현되지 않았습니다"), "Payroll UI must keep Korean unimplemented execution copy visible");
assert(peopleKoUiPlan.includes("기능명은 한국 SaaS에서 쓰이는 표현 그대로 쓴다"), "Korean SaaS label policy missing");
assert(peopleKoUiPlan.includes("구현되지 않은 기능은 `구현 안됨`"), "Unimplemented feature state policy missing");
assert(peopleKoUiPlan.includes("일부만 구현된 기능은 `일부 구현됨`"), "Partially implemented feature state policy missing");
assert(
  !/net_pay|gross_pay|tax_withholding|["']disbursement_instruction["']|disbursement_instruction\s*:/.test(payrollUi),
  "Payroll UI must not expose blocked execution fields"
);

const workPackages = ledger.work_packages;
const tuws = ledger.tuws;
assert(Array.isArray(workPackages) && workPackages.length >= 5, "work_packages missing");
assert(Array.isArray(tuws) && tuws.length >= 10, "tuws missing");
const tuwIds = new Set(tuws.map((tuw) => tuw.id));
for (const wp of workPackages) {
  assert(typeof wp.wp_id === "string" && /^HRO-L[0-9]-W[0-9]{2}$/.test(wp.wp_id), `invalid wp_id: ${wp.wp_id}`);
  assert(typeof wp.terminal_tuw === "string", `${wp.wp_id}: terminal_tuw missing`);
  assert(tuwIds.has(wp.terminal_tuw), `${wp.wp_id}: terminal_tuw not in tuw list`);
  assert((wp.tuw_ids ?? []).includes(wp.terminal_tuw), `${wp.wp_id}: terminal_tuw must be listed in tuw_ids`);
  for (const tuwId of wp.tuw_ids ?? []) assert(tuwIds.has(tuwId), `${wp.wp_id}: unknown TUW ${tuwId}`);
}

for (const path of ledger.evidence_targets ?? []) {
  assert(fileExists(path), `evidence target missing: ${path}`);
}

const packageJson = readJson("package.json");
assert(packageJson.scripts?.["hro:deel-parity:validate"] === "node scripts/validate-hro-deel-parity-crosswalk.mjs", "package script hro:deel-parity:validate missing");
assert(packageJson.scripts?.["hro:deel-parity:screenshot-inventory"] === "swift scripts/generate-hro-deel-screenshot-inventory.swift", "package script hro:deel-parity:screenshot-inventory missing");

if (errors.length > 0) {
  console.error("HRO Deel parity crosswalk validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("HRO Deel parity crosswalk validation passed.");
console.log(`program: ${ledger.program_id}`);
console.log(`screenshots: ${ledger.screenshot_inventory.actual_file_count}`);
console.log(`features: ${features.length}`);
