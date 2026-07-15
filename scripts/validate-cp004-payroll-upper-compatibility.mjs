import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const usage = "usage: node scripts/validate-cp004-payroll-upper-compatibility.mjs [--emit|--check|--help]";
const command = process.argv[2] ?? "--check";
if (command === "--help") {
  console.log(usage);
  console.log("Verifies the CP-004 payroll TUW inventory, eight implementation axes, full payroll test-file inventory, current internal package QA, and historical browser-receipt boundary.");
  process.exit(0);
}
if (!["--emit", "--check"].includes(command) || process.argv.length > 3) {
  console.error(usage);
  process.exit(2);
}

const root = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
if (path.resolve(root) !== path.resolve(process.cwd())) throw new Error(`run from repository root: ${root}`);

const entrySha = "f3b38cbbe297f46fda0d5e64744bc081e9ed3d66";
const packageBuildSha = "75f10995d9e04c35e8d21710fc64d6bd5e9b5e4c";
const rendererSha256 = "b73aac5c2686e1650d2a7685a8d4b790a45786fe4363029ffbfc5da9899c1a96";
const planPath = "workbook/hrx-leave-payroll-tuw-implementation-plan-2026-07-14.md";
const packageReceiptPath = "docs/lazycodex/evidence/matter-desktop/artifacts/payroll-package-qa-2026-07-15.json";
const browserReceiptPath = "docs/lazycodex/evidence/matter-web/artifacts/payroll-browser-qa-2026-07-15.json";
const expectedPath = "workbook/forest-v0.1.17-integration-evidence/CP-004/payroll-upper-compatibility-matrix.json";

function text(filePath) {
  return readFileSync(filePath, "utf8");
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function allPresent(files) {
  return files.every((filePath) => existsSync(filePath));
}

function containsEvery(files, needles) {
  const source = files.map((filePath) => text(filePath)).join("\n");
  return needles.every((needle) => source.includes(needle));
}

function ids(prefix, count) {
  return Array.from({ length: count }, (_, index) => `${prefix}-${String(index + 1).padStart(3, "0")}`);
}

const tuwGroups = Object.freeze({
  data: ids("PY-DATA", 6),
  inputs: ids("PY-IN", 7),
  calculation: ids("PY-CALC", 9),
  deductions: ids("PY-DED", 7),
  run: ids("PY-RUN", 6),
  ui: ids("PY-UI", 6),
  documents: ids("PY-DOC", 5),
  bank: ids("PY-BANK", 3),
  tax: ids("PY-TAX", 7),
  migration: ["PY-MIG-001"],
  qa: ids("PY-QA", 3),
  internal_gate: ["GATE-001"]
});
const expectedTuws = Object.values(tuwGroups).flat();
const plan = text(planPath);
const tuwStatus = Object.fromEntries(expectedTuws.map((id) => {
  const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = plan.match(new RegExp(`^\\| ${escaped} \\| ([A-Z_]+) \\|`, "m"));
  return [id, match?.[1] ?? "MISSING"];
}));
const externalGateStatus = plan.match(/^\| GATE-002 \| ([A-Z_]+) \|/m)?.[1] ?? "MISSING";

const axes = Object.freeze([
  {
    id: "inputs_and_data",
    source_files: [
      "packages/hrx/src/payroll/repository.js",
      "packages/hrx/src/payroll/input-snapshot-service.js",
      "packages/hrx/src/payroll-item-catalog.js",
      "packages/hrx/src/payroll-profile-service.js",
      "packages/hrx/src/payroll-time-input-snapshot.js"
    ],
    proof_files: [
      "packages/hrx/test/payroll-repository.test.js",
      "packages/hrx/test/payroll-input-snapshot-service.test.js",
      "packages/hrx/test/payroll-item-catalog.test.js",
      "packages/hrx/test/payroll-profile-service.test.js",
      "packages/hrx/test/payroll-time-input-snapshot.test.js"
    ],
    needles: ["monthly", "hourly", "daily", "freelancer", "snapshot_hash", "paid_leave_minutes", "unpaid_leave_minutes", "approved"]
  },
  {
    id: "calculation",
    source_files: [
      "packages/hrx/src/payroll/money.js",
      "packages/hrx/src/payroll/calculation-engine.js"
    ],
    proof_files: [
      "packages/hrx/test/payroll-money.test.js",
      "packages/hrx/test/payroll-calculation-engine.test.js"
    ],
    needles: ["BigInt", "basisPoints", "monthly", "hourly", "daily", "freelancer", "unused_leave", "overtime", "holiday", "adjustment"]
  },
  {
    id: "deductions",
    source_files: [
      "packages/hrx/src/payroll/deduction-engine.js",
      "packages/hrx/src/payroll/statutory-rule-service.js"
    ],
    proof_files: [
      "packages/hrx/test/payroll-deduction-engine.test.js",
      "packages/hrx/test/payroll-statutory-rule-service.test.js"
    ],
    needles: ["income_tax", "local_income_tax", "pension", "health", "long_term_care", "employment_insurance", "installment", "unexplained"]
  },
  {
    id: "run_lifecycle",
    source_files: [
      "packages/hrx/src/payroll/run-service.js",
      "packages/hrx/src/payroll/repository.js"
    ],
    proof_files: [
      "packages/hrx/test/payroll-run-service.test.js",
      "packages/hrx/test/payroll-repository.test.js",
      "apps/api/test/hrx/payroll-runtime.test.js"
    ],
    needles: ["preview", "approved", "closed", "adjustment", "step_up", "idempotency_key", "outbox", "audit"]
  },
  {
    id: "documents_and_reports",
    source_files: [
      "packages/hrx/src/payroll/document-service.js",
      "packages/hrx/src/payroll-export-service.js"
    ],
    proof_files: [
      "packages/hrx/test/payroll-document-service.test.js",
      "packages/hrx/test/payroll-export-service.test.js",
      "apps/web/test/payroll-workspace-ui.test.mjs"
    ],
    needles: ["template_id", "encrypted", "PDF", "csv", "xlsx", "delivery", "provider_receipt"]
  },
  {
    id: "bank_and_payment",
    source_files: [
      "packages/hrx/src/payroll/payment-service.js",
      "packages/hrx/src/payroll-reconciliation.js"
    ],
    proof_files: [
      "packages/hrx/test/payroll-payment-service.test.js",
      "packages/hrx/test/payroll-reconciliation.test.js"
    ],
    needles: ["account_ref", "checksum", "approve", "export", "reconcile", "provider_receipt"]
  },
  {
    id: "tax_filing_and_year_end",
    source_files: [
      "packages/hrx/src/payroll/filing-service.js",
      "packages/hrx/src/payroll/year-end-service.js"
    ],
    proof_files: [
      "packages/hrx/test/payroll-filing-service.test.js",
      "packages/hrx/test/payroll-year-end-service.test.js"
    ],
    needles: ["withholding", "social_insurance", "payment_statement", "year_end", "accepted", "rejected", "review"]
  },
  {
    id: "migration_and_readiness",
    source_files: [
      "packages/hrx/src/payroll/migration-service.js",
      "packages/hrx/src/payroll-boundary.js",
      "packages/hrx/src/payroll/parallel-comparison-service.js"
    ],
    proof_files: [
      "packages/hrx/test/payroll-migration-service.test.js",
      "packages/hrx/test/payroll-readiness-contract.test.js",
      "packages/hrx/test/payroll-parallel-comparison-service.test.js"
    ],
    needles: ["preview_hash", "approval", "rollback", "package_verified", "production", "go_live", "unexplained"]
  }
]);

const packageTests = [
  "payroll-calculation-engine", "payroll-deduction-engine", "payroll-document-service", "payroll-export-service", "payroll-filing-service",
  "payroll-input-snapshot-service", "payroll-item-catalog", "payroll-migration-service", "payroll-money", "payroll-parallel-comparison-service",
  "payroll-payment-service", "payroll-profile-service", "payroll-readiness-contract", "payroll-reconciliation", "payroll-repository",
  "payroll-run-service", "payroll-statutory-rule-service", "payroll-time-input-snapshot", "payroll-year-end-service"
].map((name) => `packages/hrx/test/${name}.test.js`);
const apiTests = ["payroll-catalog-runtime", "payroll-runtime", "payroll"].map((name) => `apps/api/test/hrx/${name}.test.js`);
const webTests = ["apps/web/test/payroll-workspace-ui.test.mjs"];
const expectedTests = [...packageTests, ...apiTests, ...webTests];

const packageReceiptRaw = readFileSync(packageReceiptPath);
const packageReceipt = JSON.parse(packageReceiptRaw.toString("utf8"));
const packageScenarios = Object.keys(packageReceipt.workflow?.scenarios ?? {}).sort();
const packageBoundaryKeys = Object.keys(packageReceipt.boundaries ?? {}).sort();
const packageReceiptChecks = {
  verdict_pass: packageReceipt.verdict === "PASS",
  synthetic_only: packageReceipt.synthetic_only === true,
  source_revision_matches_entry: packageReceipt.source?.revision === entrySha,
  product_runtime_unchanged_since_exact_build: (() => {
    try {
      execFileSync("git", [
        "diff", "--quiet", packageBuildSha, entrySha, "--",
        "apps/api/src", "apps/web/src", "apps/desktop/src", "packages/hrx/src", "packages/shared/src"
      ]);
      return true;
    } catch {
      return false;
    }
  })(),
  renderer_matches_exact: packageReceipt.source?.renderer_sha256 === rendererSha256
    && packageReceipt.macos?.renderer_sha256 === rendererSha256
    && packageReceipt.windows?.renderer_sha256 === rendererSha256
    && packageReceipt.windows?.renderer_matches_macos === true,
  nine_scenarios_pass: packageScenarios.length === 9 && Object.values(packageReceipt.workflow.scenarios).every(Boolean),
  restart_snapshot_identical: JSON.stringify(packageReceipt.workflow?.before_restart) === JSON.stringify(packageReceipt.workflow?.after_restart),
  five_screenshots_clean: packageReceipt.screenshots?.length === 5
    && packageReceipt.geometry?.length === 5
    && packageReceipt.geometry.every((item) => item.target_visible === true
      && item.scroll_width <= item.client_width
      && item.broken_images === 0
      && item.row_heights.every((height) => height === 44)),
  diagnostics_clean: packageReceipt.diagnostics?.page_error_count === 0 && packageReceipt.diagnostics?.console_error_count === 0,
  mac_internal_boundary_exact: packageReceipt.macos?.native_runtime_smoke === "pass"
    && packageReceipt.macos?.release_channel === "internal"
    && packageReceipt.macos?.signed_for_distribution === false
    && packageReceipt.macos?.notarized === false,
  windows_boundary_exact: packageReceipt.windows?.pe_header === "MZ"
    && packageReceipt.windows?.archive_test === "pass"
    && packageReceipt.windows?.native_runtime_smoke === "not_run_on_darwin"
    && packageReceipt.windows?.authenticode_signed === false,
  claim_boundaries_false: packageBoundaryKeys.length === 7 && Object.values(packageReceipt.boundaries).every((value) => value === false)
};

const browserReceiptRaw = readFileSync(browserReceiptPath);
const browserReceipt = JSON.parse(browserReceiptRaw.toString("utf8"));
const browserViewports = browserReceipt.roles?.flatMap((role) => role.viewports ?? []) ?? [];
const browserReceiptChecks = {
  six_roles: browserReceipt.roles?.length === 6,
  thirty_role_viewports: browserViewports.length === 30,
  five_widths: JSON.stringify([...new Set(browserViewports.map((row) => row.viewport?.width))].sort((a, b) => a - b)) === JSON.stringify([720, 820, 1024, 1280, 1512]),
  all_recorded_checks_pass: Object.values(browserReceipt.checks ?? {}).every((value) => value === true || value === 0),
  unexpected_errors_zero: browserViewports.every((row) => row.unexpected_http_errors?.length === 0
    && row.unexpected_console_errors?.length === 0
    && row.page_errors?.length === 0),
  source_revision_attested: false,
  accepted_as_current_source_proof: false
};

const axisResults = axes.map((axis) => ({
  id: axis.id,
  source_file_count: axis.source_files.length,
  proof_file_count: axis.proof_files.length,
  required_files_present: allPresent([...axis.source_files, ...axis.proof_files]),
  contract_needles_present: containsEvery([...axis.source_files, ...axis.proof_files], axis.needles)
}));
const failedTuws = Object.entries(tuwStatus).filter(([, status]) => status !== "DONE").map(([id, status]) => ({ id, status }));
const failedAxes = axisResults.filter((axis) => !axis.required_files_present || !axis.contract_needles_present).map((axis) => axis.id);
const missingTests = expectedTests.filter((filePath) => !existsSync(filePath));
const failedPackageChecks = Object.entries(packageReceiptChecks).filter(([, passed]) => !passed).map(([name]) => name);
const failedBrowserChecks = Object.entries(browserReceiptChecks)
  .filter(([name, passed]) => !["source_revision_attested", "accepted_as_current_source_proof"].includes(name) && !passed)
  .map(([name]) => name);

const result = {
  schema_version: "law-firm-os.cp004-payroll-upper-compatibility.v1",
  entry_sha: entrySha,
  plan: {
    path: planPath,
    expected_done_tuw_count: expectedTuws.length,
    done_tuw_count: expectedTuws.length - failedTuws.length,
    failed_tuws: failedTuws,
    external_gate: { id: "GATE-002", status: externalGateStatus, intentionally_out_of_scope: true }
  },
  implementation: {
    axis_count: axisResults.length,
    passing_axis_count: axisResults.length - failedAxes.length,
    axes: axisResults,
    failed_axes: failedAxes
  },
  test_inventory: {
    package_file_count: packageTests.length,
    api_file_count: apiTests.length,
    web_file_count: webTests.length,
    total_file_count: expectedTests.length,
    missing_files: missingTests
  },
  current_internal_package_qa: {
    path: packageReceiptPath,
    sha256: sha256(packageReceiptRaw),
    source_revision: packageReceipt.source?.revision ?? null,
    exact_build_sha: packageBuildSha,
    renderer_sha256: packageReceipt.source?.renderer_sha256 ?? null,
    scenario_count: packageScenarios.length,
    screenshot_count: packageReceipt.screenshots?.length ?? 0,
    checks: packageReceiptChecks,
    failed_checks: failedPackageChecks,
    verification_scope: "mac_internal_functional_and_windows_structure_renderer_parity"
  },
  historical_browser_qa: {
    path: browserReceiptPath,
    sha256: sha256(browserReceiptRaw),
    role_count: browserReceipt.roles?.length ?? 0,
    role_viewport_count: browserViewports.length,
    checks: browserReceiptChecks,
    failed_recorded_checks: failedBrowserChecks,
    verification_scope: "historical_supporting_receipt_without_source_revision",
    current_source_proof: false
  },
  verdict: failedTuws.length === 0
    && externalGateStatus === "BLOCKED"
    && failedAxes.length === 0
    && missingTests.length === 0
    && failedPackageChecks.length === 0
    && failedBrowserChecks.length === 0
      ? "PASS"
      : "FAIL"
};

if (result.verdict !== "PASS") throw new Error(`CP-004 payroll upper compatibility failed: ${JSON.stringify({ failedTuws, externalGateStatus, failedAxes, missingTests, failedPackageChecks, failedBrowserChecks })}`);

if (command === "--emit") {
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}

if (!existsSync(expectedPath)) throw new Error(`missing checked-in CP-004 matrix: ${expectedPath}`);
const expected = JSON.parse(text(expectedPath));
if (JSON.stringify(expected) !== JSON.stringify(result)) throw new Error("checked-in CP-004 matrix does not match current payroll contracts and QA receipts");
console.log(JSON.stringify({
  verdict: result.verdict,
  entry_sha: result.entry_sha,
  payroll_tuws: `${result.plan.done_tuw_count}/${result.plan.expected_done_tuw_count}`,
  implementation_axes: `${result.implementation.passing_axis_count}/${result.implementation.axis_count}`,
  test_files: result.test_inventory.total_file_count,
  package_scenarios: result.current_internal_package_qa.scenario_count,
  package_screenshots: result.current_internal_package_qa.screenshot_count,
  renderer_sha256: result.current_internal_package_qa.renderer_sha256,
  external_gate: result.plan.external_gate.status,
  historical_browser_current_source_proof: result.historical_browser_qa.current_source_proof
}, null, 2));
