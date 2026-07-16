import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const usage = "usage: node scripts/validate-cp003-leave-upper-compatibility.mjs [--emit|--check|--help]";
const command = process.argv[2] ?? "--check";
if (command === "--help") {
  console.log(usage);
  console.log("Verifies the CP-003 leave TUW inventory, seven implementation axes, full leave test-file inventory, and the exact packaged leave QA boundary receipt.");
  process.exit(0);
}
if (!["--emit", "--check"].includes(command) || process.argv.length > 3) {
  console.error(usage);
  process.exit(2);
}

const root = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
if (path.resolve(root) !== path.resolve(process.cwd())) throw new Error(`run from repository root: ${root}`);

const entrySha = "17700c5450cd9de9add0dce1ec44be77d3b49ad7";
const packageQaSha = "75f10995d9e04c35e8d21710fc64d6bd5e9b5e4c";
const rendererSha256 = "b73aac5c2686e1650d2a7685a8d4b790a45786fe4363029ffbfc5da9899c1a96";
const planPath = "workbook/hrx-leave-payroll-tuw-implementation-plan-2026-07-14.md";
const receiptPath = "docs/lazycodex/evidence/matter-desktop/artifacts/leave-management-package-qa.json";
const expectedPath = "workbook/forest-v0.1.17-integration-evidence/CP-003/leave-upper-compatibility-matrix.json";

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function text(filePath) {
  return readFileSync(filePath, "utf8");
}

function allPresent(files) {
  return files.every((filePath) => existsSync(filePath));
}

function containsEvery(files, needles) {
  const source = files.map((filePath) => text(filePath)).join("\n");
  return needles.every((needle) => source.includes(needle));
}

function unique(values) {
  return [...new Set(values)].sort();
}

const tuwGroups = Object.freeze({
  type: Array.from({ length: 9 }, (_, index) => `LV-TYPE-${String(index + 1).padStart(3, "0")}`),
  lifecycle: Array.from({ length: 6 }, (_, index) => `LV-LIFE-${String(index + 1).padStart(3, "0")}`),
  batch: Array.from({ length: 8 }, (_, index) => `LV-BATCH-${String(index + 1).padStart(3, "0")}`),
  occurrence: ["LV-OCC-001", "LV-OCC-002", "LV-OCC-003", "LV-OCC-004A", "LV-OCC-004B", "LV-OCC-005", "LV-OCC-006", "LV-OCC-007", "LV-OCC-008", "LV-OCC-009"],
  promotion: Array.from({ length: 5 }, (_, index) => `LV-PROM-${String(index + 1).padStart(3, "0")}`),
  integration: Array.from({ length: 5 }, (_, index) => `LV-INT-${String(index + 1).padStart(3, "0")}`),
  security: ["LV-SEC-001"],
  migration: ["LV-MIG-001", "LV-MIG-002"],
  qa: ["LV-QA-001", "LV-QA-002", "LV-QA-003"]
});
const expectedTuws = Object.values(tuwGroups).flat();
const plan = text(planPath);
const tuwStatus = Object.fromEntries(expectedTuws.map((id) => {
  const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = plan.match(new RegExp(`^\\| ${escaped} \\| ([A-Z_]+) \\|`, "m"));
  return [id, match?.[1] ?? "MISSING"];
}));

const axes = Object.freeze([
  {
    id: "type_economics",
    source_files: [
      "packages/hrx/src/leave/type-economics.js",
      "packages/hrx/src/leave/policy-service.js",
      "packages/hrx/src/leave/request-service.js"
    ],
    proof_files: [
      "packages/hrx/test/leave-type-economics.test.js",
      "packages/hrx/test/leave-policy-service.test.js",
      "packages/hrx/test/leave-management-durable.test.js",
      "apps/api/test/hrx/leave-policy-api.test.js",
      "apps/web/test/leave-settings-ui.test.mjs"
    ],
    needles: ["full_day", "half_day", "quarter_day", "hours", "paid_ratio_bps", "deduction_ratio_bps", "rounding_minutes", "paid_minutes", "unpaid_minutes", "deduction_minutes"]
  },
  {
    id: "automatic_accrual",
    source_files: [
      "packages/hrx/src/leave/accrual-batch-repository.js",
      "packages/hrx/src/leave/accrual-batch-service.js",
      "packages/hrx/src/leave/accrual-period-generator.js",
      "packages/hrx/src/leave/accrual-service.js"
    ],
    proof_files: [
      "packages/hrx/test/leave-accrual-batch-repository.test.js",
      "packages/hrx/test/leave-accrual-batch-service.test.js",
      "packages/hrx/test/leave-accrual-period-generator.test.js",
      "packages/hrx/test/leave-accrual-service.test.js",
      "apps/api/test/hrx/leave-accrual-api.test.js",
      "apps/web/test/leave-accrual-ui.test.mjs"
    ],
    needles: ["preview", "execute", "source_version", "snapshot_hash", "idempotency", "tenure"]
  },
  {
    id: "entitlement_lifecycle",
    source_files: [
      "packages/hrx/src/leave/entitlement-lifecycle.js",
      "packages/hrx/src/leave/entitlement-command-service.js",
      "packages/hrx/src/leave/expiration-service.js",
      "packages/hrx/src/leave/expiration-job.js"
    ],
    proof_files: [
      "packages/hrx/test/leave-entitlement-lifecycle.test.js",
      "packages/hrx/test/leave-entitlement-command-service.test.js",
      "packages/hrx/test/leave-expiration-service.test.js",
      "packages/hrx/test/leave-expiration-job.test.js",
      "apps/api/test/hrx/leave-entitlement-lifecycle-api.test.js"
    ],
    needles: ["scheduled", "active", "expired", "cancelled", "preview", "execute", "idempotency_key", "reversal"]
  },
  {
    id: "occurrence_usage",
    source_files: [
      "packages/hrx/src/leave/reporting-service.js",
      "packages/hrx/src/leave/occurrence-upload-batch-service.js",
      "packages/hrx/src/leave/xlsx-export.js",
      "packages/hrx/src/leave/entitlement-read-service.js"
    ],
    proof_files: [
      "packages/hrx/test/leave-reporting-service.test.js",
      "packages/hrx/test/leave-occurrence-upload-batch-service.test.js",
      "packages/hrx/test/leave-occurrence-xlsx.test.js",
      "apps/api/test/hrx/leave-reporting-api.test.js",
      "apps/web/test/leave-reporting-ui.test.mjs"
    ],
    needles: ["by_month", "by_type", "remaining_minutes", "file_hash", "csv", "xlsx", "privacy_boundary"]
  },
  {
    id: "promotion",
    source_files: [
      "packages/hrx/src/leave/promotion-balance.js",
      "packages/hrx/src/leave/promotion-service.js"
    ],
    proof_files: [
      "packages/hrx/test/leave-promotion-service.test.js",
      "apps/api/test/hrx/leave-promotion-api.test.js",
      "apps/web/test/leave-promotion-ui.test.mjs"
    ],
    needles: ["first_notice", "second_notice", "delivery", "receipt", "idempotency", "revok"]
  },
  {
    id: "provider_integrations",
    source_files: [
      "packages/hrx/src/leave/integration-service.js",
      "packages/hrx/src/leave/provider-adapters.js"
    ],
    proof_files: [
      "packages/hrx/test/leave-integration-service.test.js",
      "packages/hrx/test/leave-provider-adapters.test.js",
      "apps/api/test/hrx/leave-integration-api.test.js",
      "apps/web/test/leave-integration-ui.test.mjs"
    ],
    needles: ["public_title", "휴가", "reason_included", "attachments_included", "google_calendar", "outlook_calendar", "slack", "teams", "dead_letter", "provider_receipt_ref"]
  },
  {
    id: "security_privacy_migration",
    source_files: [
      "apps/api/src/routes/hrx/leave.js",
      "packages/hrx/src/leave/reporting-service.js",
      "packages/hrx/src/leave/migration-reconciliation-service.js",
      "packages/hrx/src/leave/management-service.js"
    ],
    proof_files: [
      "packages/hrx/test/leave-migration-reconciliation-service.test.js",
      "packages/hrx/test/leave-management-baseline.test.js",
      "packages/hrx/test/leave-management-durable.test.js",
      "apps/api/test/hrx/leave-role-scopes.test.js",
      "apps/api/test/hrx/leave-management-api.test.js",
      "apps/web/test/leave-self-service-ui.test.mjs"
    ],
    needles: ["authorized_employee_ids", "reason_attachment_and_source_reference_excluded", "baseline_missing", "unexplained_variance", "source_hash", "tenant_id"]
  }
]);

const packageTests = [
  "leave-accrual-batch-repository", "leave-accrual-batch-service", "leave-accrual-period-generator", "leave-accrual-service",
  "leave-approval-delegation", "leave-balance", "leave-entitlement-command-service", "leave-entitlement-lifecycle",
  "leave-expiration-job", "leave-expiration-service", "leave-integration-service", "leave-management-baseline",
  "leave-management-durable", "leave-migration-reconciliation-service", "leave-occurrence-upload-batch-service",
  "leave-occurrence-xlsx", "leave-policy-service", "leave-policy", "leave-promotion-service", "leave-provider-adapters",
  "leave-reporting-service", "leave-sql", "leave-termination-service", "leave-type-economics", "leave-type-rule-backfill"
].map((name) => `packages/hrx/test/${name}.test.js`);
const apiTests = [
  "leave-accrual-api", "leave-entitlement-lifecycle-api", "leave-integration-api", "leave-management-api", "leave-policy-api",
  "leave-promotion-api", "leave-reporting-api", "leave-role-scopes", "leave"
].map((name) => `apps/api/test/hrx/${name}.test.js`);
const webTests = [
  "leave-accrual-ui", "leave-integration-ui", "leave-promotion-ui", "leave-reporting-ui", "leave-self-service-ui", "leave-settings-ui"
].map((name) => `apps/web/test/${name}.test.mjs`);
const expectedTests = [...packageTests, ...apiTests, ...webTests];

const receiptRaw = readFileSync(receiptPath);
const receipt = JSON.parse(receiptRaw.toString("utf8"));
const scenarioKeys = Object.keys(receipt.scenarios ?? {}).sort();
const roleCheckKeys = Object.keys(receipt.role_checks ?? {}).sort();
const viewportWidths = [...new Set((receipt.viewport_manifest ?? []).map((item) => item.viewport?.width))].sort((left, right) => left - right);
const falseBoundaryKeys = Object.entries(receipt.boundaries ?? {}).filter(([, value]) => value === false).map(([key]) => key).sort();
const packageReceiptChecks = {
  verdict_pass: receipt.verdict === "PASS",
  synthetic_only: receipt.synthetic_only === true,
  source_revision_matches: receipt.source?.revision === packageQaSha,
  package_source_is_ancestor: (() => {
    try {
      execFileSync("git", ["merge-base", "--is-ancestor", packageQaSha, entrySha]);
      return true;
    } catch {
      return false;
    }
  })(),
  product_runtime_unchanged_since_package_qa: (() => {
    try {
      execFileSync("git", [
        "diff", "--quiet", packageQaSha, entrySha, "--",
        "apps/api/src", "apps/web/src", "apps/desktop/src", "packages/hrx/src", "packages/shared/src"
      ]);
      return true;
    } catch {
      return false;
    }
  })(),
  renderer_matches_exact: receipt.source?.build_renderer_sha256 === rendererSha256
    && receipt.windows_package?.renderer_sha256 === rendererSha256
    && receipt.windows_package?.renderer_matches_macos === true,
  mac_functional_boundary_exact: receipt.app?.verification_scope === "functional_only"
    && receipt.app?.signed === null
    && receipt.app?.notarized === null,
  windows_boundary_exact: receipt.windows_package?.native_runtime_smoke === "not_run_on_darwin"
    && receipt.windows_package?.authenticode_signed === false
    && receipt.windows_package?.pe_header === "MZ"
    && receipt.windows_package?.archive_test === "pass",
  ten_scenarios_pass: scenarioKeys.length === 10 && Object.values(receipt.scenarios).every(Boolean),
  seven_role_checks_pass: roleCheckKeys.length === 7 && Object.values(receipt.role_checks).every(Boolean),
  restart_domain_identical: receipt.restart?.identical === true
    && receipt.restart?.domain_snapshot_sha256_before === receipt.restart?.domain_snapshot_sha256_after,
  five_viewports_exact: JSON.stringify(viewportWidths) === JSON.stringify([720, 820, 1024, 1280, 1512]),
  eleven_screenshots: receipt.screenshots?.length === 11,
  geometry_clean: receipt.geometry?.length === 11
    && receipt.geometry.every((item) => item.target_visible === true && item.scroll_width <= item.client_width),
  console_clean: receipt.console?.page_error_count === 0 && receipt.console?.console_error_count === 0,
  claim_boundaries_false: falseBoundaryKeys.length === 6 && Object.values(receipt.boundaries).every((value) => value === false)
};

const axisResults = axes.map((axis) => ({
  id: axis.id,
  source_file_count: axis.source_files.length,
  proof_file_count: axis.proof_files.length,
  required_files_present: allPresent([...axis.source_files, ...axis.proof_files]),
  contract_needles_present: containsEvery([...axis.source_files, ...axis.proof_files], axis.needles)
}));
const failedTuws = Object.entries(tuwStatus).filter(([, status]) => status !== "DONE").map(([id, status]) => ({ id, status }));
const missingTests = expectedTests.filter((filePath) => !existsSync(filePath));
const failedReceiptChecks = Object.entries(packageReceiptChecks).filter(([, passed]) => !passed).map(([name]) => name);
const failedAxes = axisResults.filter((axis) => !axis.required_files_present || !axis.contract_needles_present).map((axis) => axis.id);

const result = {
  schema_version: "law-firm-os.cp003-leave-upper-compatibility.v1",
  entry_sha: entrySha,
  plan: {
    path: planPath,
    expected_tuw_count: expectedTuws.length,
    done_tuw_count: expectedTuws.length - failedTuws.length,
    failed_tuws: failedTuws
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
  package_qa: {
    path: receiptPath,
    sha256: sha256(receiptRaw),
    source_revision: receipt.source?.revision ?? null,
    renderer_sha256: receipt.source?.build_renderer_sha256 ?? null,
    scenario_count: scenarioKeys.length,
    role_check_count: roleCheckKeys.length,
    viewport_widths: viewportWidths,
    screenshot_count: receipt.screenshots?.length ?? 0,
    false_claim_boundaries: falseBoundaryKeys,
    checks: packageReceiptChecks,
    failed_checks: failedReceiptChecks
  },
  verdict: failedTuws.length === 0
    && failedAxes.length === 0
    && missingTests.length === 0
    && failedReceiptChecks.length === 0
      ? "PASS"
      : "FAIL"
};

if (result.verdict !== "PASS") throw new Error(`CP-003 leave upper compatibility failed: ${JSON.stringify({ failedTuws, failedAxes, missingTests, failedReceiptChecks })}`);

if (command === "--emit") {
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}

if (!existsSync(expectedPath)) throw new Error(`missing checked-in CP-003 matrix: ${expectedPath}`);
const expected = JSON.parse(text(expectedPath));
if (JSON.stringify(expected) !== JSON.stringify(result)) throw new Error("checked-in CP-003 matrix does not match current leave contracts and package QA receipt");
console.log(JSON.stringify({
  verdict: result.verdict,
  entry_sha: result.entry_sha,
  leave_tuws: `${result.plan.done_tuw_count}/${result.plan.expected_tuw_count}`,
  implementation_axes: `${result.implementation.passing_axis_count}/${result.implementation.axis_count}`,
  test_files: result.test_inventory.total_file_count,
  package_scenarios: result.package_qa.scenario_count,
  package_role_checks: result.package_qa.role_check_count,
  package_screenshots: result.package_qa.screenshot_count,
  renderer_sha256: result.package_qa.renderer_sha256
}, null, 2));
