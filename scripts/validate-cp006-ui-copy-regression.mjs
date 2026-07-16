import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const usage = "usage: node scripts/validate-cp006-ui-copy-regression.mjs [--emit|--check|--help]";
const command = process.argv[2] ?? "--check";
if (command === "--help") {
  console.log(usage);
  console.log("Verifies the Forest density, single-line metadata, menu/copy cleanup, retired-asset boundary, and current internal package UI receipts.");
  process.exit(0);
}
if (!["--emit", "--check"].includes(command) || process.argv.length > 3) {
  console.error(usage);
  process.exit(2);
}

const root = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
if (path.resolve(root) !== path.resolve(process.cwd())) throw new Error(`run from repository root: ${root}`);

const entrySha = "a656495f909d4350495c2c41326e2f4b6b51ab74";
const exactBuildSha = "75f10995d9e04c35e8d21710fc64d6bd5e9b5e4c";
const rendererSha256 = "b73aac5c2686e1650d2a7685a8d4b790a45786fe4363029ffbfc5da9899c1a96";
const expectedPath = "workbook/forest-v0.1.17-integration-evidence/CP-006/ui-copy-regression-matrix.json";
const leaveReceiptPath = "docs/lazycodex/evidence/matter-desktop/artifacts/leave-management-package-qa.json";
const payrollReceiptPath = "docs/lazycodex/evidence/matter-desktop/artifacts/payroll-package-qa-2026-07-15.json";
const profileReceiptPath = "docs/lazycodex/evidence/matter-profile/2026-07-10/packaged-desktop-smoke.json";
const profileScreenshotPath = "docs/lazycodex/evidence/matter-profile/2026-07-10/profile-api-packaged.png";
const lazywebScreenshotPath = ".lazyweb/lazyweb-design/forest-leave-payroll-2026-07-15/references/current-state.png";
const lazywebReportId = "2c6e81b4-0875-4423-bc23-c7465b6e5b68";

function text(filePath) {
  return readFileSync(filePath, "utf8");
}

function json(filePath) {
  return JSON.parse(text(filePath));
}

function sha256File(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function listSourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const child = path.join(directory, entry.name);
    if (entry.isDirectory()) return listSourceFiles(child);
    return /\.(?:js|jsx|ts|tsx)$/.test(entry.name) ? [child] : [];
  });
}

function allTrue(record) {
  return Object.values(record).every((value) => value === true);
}

function gitDiffQuiet(from, to, paths) {
  try {
    execFileSync("git", ["diff", "--quiet", from, to, "--", ...paths]);
    return true;
  } catch {
    return false;
  }
}

function worktreeDiffQuiet(paths) {
  try {
    execFileSync("git", ["diff", "--quiet", "--", ...paths]);
    return true;
  } catch {
    return false;
  }
}

const styles = text("apps/web/src/styles.css");
const shell = text("apps/web/src/components/Shell.jsx");
const dashboardList = text("apps/web/src/components/DashboardList.jsx");
const primitives = text("apps/web/src/components/primitives.jsx");
const home = text("apps/web/src/components/HomeSurface.jsx");
const vault = text("apps/web/src/components/VaultSurface.jsx");
const i18n = text("apps/web/src/i18n.js");
const attendance = text("apps/web/src/people/attendance/AttendanceWorkspace.tsx");
const auth = text("apps/web/src/components/AuthSurface.jsx");
const desktopLogin = text("apps/desktop/src/renderer/offline.html");
const uiRegression = text("apps/web/test/ui-regression.test.mjs");
const productUiFiles = [
  "apps/web/src/App.jsx",
  "apps/web/src/i18n.js",
  ...listSourceFiles("apps/web/src/components"),
  ...listSourceFiles("apps/web/src/people"),
  ...listSourceFiles("apps/web/src/admin"),
  ...listSourceFiles("apps/web/src/candidate")
].filter((filePath) => filePath !== "apps/web/src/people/hrxApiClient.ts");
const productUiSource = productUiFiles.map(text).join("\n");

const forbiddenCopy = [
  "현재 Matter의 연결 상태를 확인합니다",
  "잔여 휴가를 확인하고 근무일정에 맞춰 신청합니다",
  "유형과 사유는 공개하지 않습니다",
  "향후 7일 팀 휴가가 없습니다",
  "선택한 구성원의 출근시간과 퇴근시간만 기록합니다",
  "미리보기 이후 원천 버전이 바뀌면 실행을 차단합니다",
  "규칙과 기간을 선택한 뒤 미리보기를 실행하세요",
  "내 결재 차례인 요청",
  "작업 알림과 검토 신호",
  "Matter 대화와 공지 메시지",
  "새 알림이 없습니다",
  "읽지 않은 메시지가 없습니다",
  "처리할 승인이 없습니다"
];
const forbiddenCopyMatches = forbiddenCopy.filter((copy) => productUiSource.includes(copy));

const retiredPaths = [
  "docs/ui-reference",
  "apps/web/src/assets/matter-mark.svg",
  "apps/web/public/matter-mark.svg",
  "apps/web/src/assets/matter-logo.svg",
  "apps/web/src/assets/parnas-tower-login.jpg",
  "apps/web/src/assets/logos/AMIC_n_PETRA_Main_Simple.svg",
  "apps/web/src/assets/logos/AMIC_n_PETRA_Main_Simple_White.svg",
  "apps/desktop/build/icon-source-mark.png",
  "apps/desktop/build/amic-petra-main.svg",
  "apps/desktop/src/renderer/offline.matter.html"
];
const retainedRetiredPaths = retiredPaths.filter(existsSync);

const historicalProfileScreenshots = json("docs/lazycodex/evidence/matter-web/artifacts/people-professional-profile-browser-proof-2026-07-07.json")
  .subjects.map((subject) => subject.screenshot);
const retainedHistoricalProfileScreenshots = historicalProfileScreenshots.filter(existsSync);

const sourceChecks = {
  density_tokens_44px: styles.includes("--am-table-row-height: 44px") && styles.includes("--am-table-header-height: 44px"),
  compact_rows_use_shared_height: styles.includes("height: var(--am-table-row-height)"),
  compact_record_contract: dashboardList.includes('data-compact-record="true"') && dashboardList.includes("uniqueDashboardMeta"),
  redundant_record_meta_removed: dashboardList.includes("normalizedTitleParts") && dashboardList.includes("uniqueParts.join"),
  empty_dashboard_rows_omitted: dashboardList.includes("if (rows.length === 0) return null"),
  panel_header_single_level: /<header className="panel-head">\s*\{title && <h2>\{title\}<\/h2>}\s*\{meta && <span>\{meta}<\/span>}\s*<\/header>/.test(primitives),
  page_subtitle_call_sites_absent: !/\bsubtitle=/.test(productUiSource),
  people_panel_kicker_absent: !productUiSource.includes("people-panel-kicker"),
  forbidden_helper_copy_absent: forbiddenCopyMatches.length === 0,
  internal_reconciliation_copy_absent: !/meta="이중 승인"|>잔액 대조<|>불일치<|>기준 없음</.test(productUiSource),
  work_schedule_group_hidden: shell.includes('hiddenPeopleSidebarGroupLabels = new Set(["근무일정"])'),
  role_and_work_profile_hidden: ["people-role", "people-work-profile", "people-pay-work-profile"].every((section) => shell.includes(`"${section}"`)),
  attendance_menu_flattened: shell.includes('children.length === 1 && children[0].section === "people-attendance-records"'),
  attendance_is_clock_only: attendance.includes('data-simple-attendance="true"') && attendance.includes('data-attendance-clock-in="true"') && attendance.includes('data-attendance-clock-out="true"') && !/<select|type="date"|attendance-calendar|attendance-risk/.test(attendance),
  search_named_search: vault.includes('<ForestHero title="Search"') && i18n.includes('vaultTitle: "Search"'),
  search_ocr_sidebar_absent: !/문서\/OCR|Document\/OCR|searchOcrSidecarNotice/.test(`${shell}\n${i18n}`),
  approval_categories_not_reintroduced: !home.includes("approvalCategoryRows") && !home.includes("leaveApprovalCount") && !home.includes("expenseApprovalCount"),
  current_auth_surface_only: auth.includes('data-login-screen="forest-split"')
    && auth.includes("brochure-cover.jpg")
    && auth.includes("matter-login-photo-panel")
    && auth.includes("claimLogoIntro")
    && styles.includes("@keyframes forestLoginPageIn")
    && styles.includes("@keyframes forestLoginLogoHandoff")
    && !/parnas|data-login-screen="current-auth"/i.test(auth),
  desktop_forest_login_timeline: desktopLogin.includes('data-login-skin="forest"') && desktopLogin.includes("forestLoginPageIn") && desktopLogin.includes("amicLawLockupIntro"),
  global_regression_contract_present: uiRegression.includes("Forest operational UI keeps panel metadata inline and omits redundant helper copy") && uiRegression.includes("Forest startup branding excludes retired Matter and Petra assets")
};

const leave = json(leaveReceiptPath);
const payroll = json(payrollReceiptPath);
const profile = json(profileReceiptPath);
const packageScreenshotPaths = [
  ...leave.screenshots.map((item) => item.path),
  ...payroll.screenshots.map((item) => item.path),
  profileScreenshotPath
];
const packageScreenshotHashesMatch = [
  ...leave.screenshots,
  ...payroll.screenshots
].every((item) => existsSync(item.path) && sha256File(item.path) === item.sha256);

const packageChecks = {
  leave_receipt_pass: leave.verdict === "PASS",
  leave_source_exact: leave.source.revision === exactBuildSha && leave.source.build_renderer_sha256 === rendererSha256,
  leave_scenarios_10_of_10: Object.keys(leave.scenarios).length === 10 && allTrue(leave.scenarios),
  leave_screenshots_11: leave.screenshots.length === 11,
  leave_geometry_clean: leave.geometry.every((item) => item.target_visible && item.scroll_width === item.client_width),
  leave_diagnostics_clean: leave.console.page_error_count === 0 && leave.console.console_error_count === 0,
  payroll_receipt_pass: payroll.verdict === "PASS",
  payroll_renderer_exact: payroll.source.renderer_sha256 === rendererSha256,
  payroll_scenarios_9_of_9: Object.keys(payroll.workflow.scenarios).length === 9 && allTrue(payroll.workflow.scenarios),
  payroll_screenshots_5: payroll.screenshots.length === 5,
  payroll_rows_44px: payroll.geometry.every((item) => item.row_heights.every((height) => height === 44)),
  payroll_geometry_clean: payroll.geometry.every((item) => item.target_visible && item.scroll_width === item.client_width && item.broken_images === 0),
  payroll_diagnostics_clean: payroll.diagnostics.page_error_count === 0 && payroll.diagnostics.console_error_count === 0,
  mac_windows_renderer_parity: payroll.macos.renderer_sha256 === rendererSha256 && payroll.windows.renderer_sha256 === rendererSha256 && payroll.windows.renderer_matches_macos === true,
  profile_receipt_pass: profile.status === "passed" && profile.profile_api_state === "populated",
  profile_contract_9_of_9: Object.keys(profile.profile_contract).length === 9 && allTrue(profile.profile_contract),
  package_screenshots_17_present: packageScreenshotPaths.length === 17 && packageScreenshotPaths.every(existsSync),
  receipt_screenshot_hashes_match: packageScreenshotHashesMatch,
  formal_claims_remain_false: leave.boundaries.public_release_claim === false && payroll.boundaries.public_release_claim === false && profile.public_release === false
};

const legacyChecks = {
  retired_paths_absent: retainedRetiredPaths.length === 0,
  historical_profile_screenshots_unretained: retainedHistoricalProfileScreenshots.length === 0,
  approved_brochure_cover_retained: existsSync("apps/web/src/assets/brochure-cover.jpg") && existsSync("apps/desktop/build/forest-login.jpg"),
  current_amic_assets_present: existsSync("apps/web/src/assets/amic-law.svg") && existsSync("apps/desktop/build/amic-law-logo-accent.svg")
};

const lazywebChecks = {
  prior_report_id_recorded: text("workbook/forest-v0.1.17-integration-evidence/RC-005/ui-profile-acceptance.md").includes(lazywebReportId),
  current_state_screenshot_present: existsSync(lazywebScreenshotPath),
  current_state_screenshot_hash: existsSync(lazywebScreenshotPath) && sha256File(lazywebScreenshotPath) === "8be6d49c91abdee8ccd8e5dfae95ac09b681846c85e3093d457feae4163afdb8"
};

const productRuntimePaths = ["apps/api/src", "apps/web/src", "apps/desktop/src", "packages/hrx/src", "packages/shared/src"];
const productRuntimeUnchanged = gitDiffQuiet(exactBuildSha, entrySha, productRuntimePaths);
const productRuntimeWorktreeClean = worktreeDiffQuiet(productRuntimePaths);
const failedChecks = Object.entries({ ...sourceChecks, ...packageChecks, ...legacyChecks, ...lazywebChecks })
  .filter(([, passed]) => !passed)
  .map(([name]) => name);

const result = {
  schema_version: "law-firm-os.cp006-ui-copy-regression.v1",
  entry_sha: entrySha,
  exact_build_sha: exactBuildSha,
  renderer_sha256: rendererSha256,
  product_runtime_unchanged_since_exact_build: productRuntimeUnchanged,
  product_runtime_worktree_clean: productRuntimeWorktreeClean,
  source_contracts: {
    checks: sourceChecks,
    failed_checks: Object.entries(sourceChecks).filter(([, passed]) => !passed).map(([name]) => name),
    product_ui_file_count: productUiFiles.length,
    forbidden_copy_matches: forbiddenCopyMatches
  },
  package_contracts: {
    checks: packageChecks,
    failed_checks: Object.entries(packageChecks).filter(([, passed]) => !passed).map(([name]) => name),
    screenshot_count: packageScreenshotPaths.length,
    leave_receipt: leaveReceiptPath,
    payroll_receipt: payrollReceiptPath,
    profile_receipt: profileReceiptPath
  },
  legacy_asset_contracts: {
    checks: legacyChecks,
    failed_checks: Object.entries(legacyChecks).filter(([, passed]) => !passed).map(([name]) => name),
    retired_paths_checked: retiredPaths,
    retained_retired_paths: retainedRetiredPaths,
    historical_profile_screenshots_checked: historicalProfileScreenshots.length,
    retained_historical_profile_screenshots: retainedHistoricalProfileScreenshots
  },
  lazyweb_supporting_evidence: {
    report_id: lazywebReportId,
    screenshot_path: lazywebScreenshotPath,
    checks: lazywebChecks,
    failed_checks: Object.entries(lazywebChecks).filter(([, passed]) => !passed).map(([name]) => name),
    governing_standard: "current Forest package, 44px density, single-line operational metadata"
  },
  claim_boundary: {
    lazyweb_new_report_generated: false,
    lazyweb_connector_available_in_current_session: false,
    formal_macos_package: false,
    native_windows_package: false,
    public_release: false,
    production_go_live: false
  },
  verdict: failedChecks.length === 0 && productRuntimeUnchanged && productRuntimeWorktreeClean ? "PASS" : "FAIL"
};

if (result.verdict !== "PASS") {
  throw new Error(`CP-006 UI/copy regression failed: ${JSON.stringify({ failedChecks, productRuntimeUnchanged, productRuntimeWorktreeClean })}`);
}

if (command === "--emit") {
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}

if (!existsSync(expectedPath)) throw new Error(`missing checked-in CP-006 matrix: ${expectedPath}`);
const expected = json(expectedPath);
if (JSON.stringify(expected) !== JSON.stringify(result)) throw new Error("checked-in CP-006 matrix does not match current UI, copy, asset, and package contracts");
console.log(JSON.stringify({
  verdict: result.verdict,
  entry_sha: result.entry_sha,
  source_checks: `${Object.keys(sourceChecks).length}/${Object.keys(sourceChecks).length}`,
  package_checks: `${Object.keys(packageChecks).length}/${Object.keys(packageChecks).length}`,
  legacy_checks: `${Object.keys(legacyChecks).length}/${Object.keys(legacyChecks).length}`,
  lazyweb_supporting_checks: `${Object.keys(lazywebChecks).length}/${Object.keys(lazywebChecks).length}`,
  package_screenshots: result.package_contracts.screenshot_count,
  product_ui_files: result.source_contracts.product_ui_file_count,
  renderer_sha256: result.renderer_sha256
}, null, 2));
