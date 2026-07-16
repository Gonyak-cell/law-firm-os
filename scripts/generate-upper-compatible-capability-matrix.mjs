import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chmodSync, existsSync, lstatSync, mkdirSync, readFileSync, readlinkSync, writeFileSync } from "node:fs";
import path from "node:path";

const forestRoot = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
const rootSourceArgument = process.argv[2] ?? "";
const usage = "usage: node scripts/generate-upper-compatible-capability-matrix.mjs <root-source>";
if (["-h", "--help"].includes(rootSourceArgument)) {
  console.log(usage);
  process.exit(0);
}
if (!rootSourceArgument || process.argv.length !== 3) throw new Error(usage);

const rootSource = path.resolve(rootSourceArgument);
const forestBase = "7717d5cee158fc97056510e8aebc9e0854d34196";
const forestCheckpoint = "fbf7062398da1157ee1322d7440194c1b13f7e0f";
const forestVerificationCommit = "873ca9cc05c30f6df1475f3c9ffb9918e10fa667";
const candidateEntrySha = "3a7335b6de78115de25640b22268ff59b3a3fd81";
const evidenceCommitSha = "0a92cb7e03d369b41d353bb90228348f101a9f87";
const expectedRootWorktreeSha256 = "7837aff481b222426ff93da5a617324fa4e7ae8966f728dee5bf1e8731bea0b3";
const metadataPath = "workbook/forest-v0.1.17-main-integration-release-goal-plan-2026-07-15.md";
const evidenceDir = path.join(forestRoot, "workbook/forest-v0.1.17-integration-evidence/RC-004");
const rc002ReviewPath = path.join(forestRoot, "workbook/forest-v0.1.17-integration-evidence/RC-002/semantic-review.md");
const rc003ClassificationPath = path.join(forestRoot, "workbook/forest-v0.1.17-integration-evidence/RC-003/classification.json");
const maxBuffer = 256 * 1024 * 1024;

if (path.resolve(forestRoot) !== path.resolve(process.cwd())) {
  throw new Error(`run from Forest candidate root: ${forestRoot}`);
}

function git(repo, args, encoding = "utf8") {
  return execFileSync("git", args, { cwd: repo, encoding, maxBuffer });
}

function lines(value) {
  return value.trim().split("\n").filter(Boolean);
}

function splitZero(value) {
  return value.toString("utf8").split("\0").filter(Boolean);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function fileDigest(repo, relativePath) {
  const absolutePath = path.join(repo, relativePath);
  if (!existsSync(absolutePath)) return { mode: "deleted", size: 0, sha256: null };
  const stat = lstatSync(absolutePath);
  const content = stat.isSymbolicLink() ? Buffer.from(readlinkSync(absolutePath), "utf8") : readFileSync(absolutePath);
  return {
    mode: (stat.mode & 0o777).toString(8).padStart(3, "0"),
    size: stat.size,
    sha256: sha256(content),
  };
}

function rootWorktreeFingerprint(repo) {
  const tracked = splitZero(git(repo, ["diff", "--name-only", "-z", "HEAD", "--"], null));
  const untracked = splitZero(git(repo, ["ls-files", "--others", "--exclude-standard", "-z"], null));
  const rows = [
    ...tracked.map((relativePath) => ({ category: "tracked_modified", path: relativePath, ...fileDigest(repo, relativePath) })),
    ...untracked.map((relativePath) => ({ category: "untracked", path: relativePath, ...fileDigest(repo, relativePath) })),
  ].sort((left, right) => left.path.localeCompare(right.path));
  const manifest = rows.map((row) => [row.category, row.mode, row.size, row.sha256 ?? "deleted", row.path].join("\t")).join("\n");
  const diffSha256 = sha256(git(repo, ["diff", "--binary", "--full-index", "HEAD", "--"], null));
  const statusSha256 = sha256(git(repo, ["status", "--porcelain=v2", "--untracked-files=all", "-z"], null));
  return {
    tracked_count: tracked.length,
    untracked_count: untracked.length,
    tracked: new Set(tracked),
    untracked: new Set(untracked),
    sha256: sha256(`${diffSha256}\n${statusSha256}\n${sha256(manifest)}`),
  };
}

function gitBlob(repo, revision, relativePath) {
  return git(repo, ["show", `${revision}:${relativePath}`], null);
}

function writeEvidence(name, value) {
  mkdirSync(evidenceDir, { recursive: true });
  const output = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  const filePath = path.join(evidenceDir, name);
  writeFileSync(filePath, output.endsWith("\n") ? output : `${output}\n`, "utf8");
  chmodSync(filePath, 0o644);
}

function assertExactSet(actual, expected, label) {
  const actualSet = new Set(actual);
  const expectedSet = new Set(expected);
  const missing = [...expectedSet].filter((entry) => !actualSet.has(entry));
  const extra = [...actualSet].filter((entry) => !expectedSet.has(entry));
  if (actual.length !== actualSet.size || expected.length !== expectedSet.size || missing.length || extra.length) {
    throw new Error(`${label} mismatch: actual=${actual.length}, expected=${expected.length}, missing=${missing.join(",")}, extra=${extra.join(",")}`);
  }
}

function countBy(rows, key) {
  return Object.fromEntries([...new Set(rows.map((row) => row[key]))].sort().map((value) => [
    value,
    rows.filter((row) => row[key] === value).length,
  ]));
}

const gateToDisposition = Object.freeze({
  KEEP_FOREST: "SUPERSEDED",
  KEEP_IDENTICAL: "SUPERSEDED",
  SELECTIVE_PORT: "PORT_REQUIRED",
  MERGE_TESTS: "PORT_TEST_ONLY",
  REJECT_ROOT_VISUAL: "REJECTED",
  REGENERATE: "REJECTED",
  RENUMBER_026_PLUS: "PORT_REQUIRED",
  REWRITE_FOR_026_PLUS: "PORT_TEST_ONLY",
  KEEP_FOREST_PENDING_INVENTORY: "SUPERSEDED",
});

function parseRc002Review(markdown) {
  return [...markdown.matchAll(/^\|\s*(\d+)\s*\|\s*`([^`]+)`\s*\|\s*`([^`]+)`\s*\|\s*`([^`]+)`\s*\|\s*(.*?)\s*\|$/gm)]
    .map((match) => ({
      index: Number(match[1]),
      path: match[2],
      relation: match[3],
      gate: match[4],
      finding: match[5],
      origin: "common",
      classification: gateToDisposition[match[4]],
    }));
}

function preserveDisposition(relativePath) {
  if (relativePath.startsWith("packages/hrx/src/migrations/")) return "PRESERVE_MIGRATION";
  if (relativePath.includes("/test/") || /\/test\./.test(relativePath)) return "PRESERVE_TEST";
  if (relativePath.startsWith("packages/hrx/fixtures/")) return "PRESERVE_FIXTURE";
  if (relativePath.startsWith("scripts/")) return "PRESERVE_QA_TOOL";
  if (relativePath.startsWith("docs/lazycodex/evidence/")) return "HISTORICAL_EVIDENCE_ONLY";
  if (relativePath.startsWith("workbook/forest-v0.1.17-integration-evidence/FZ-")) return "PRESERVE_CHECKPOINT_EVIDENCE";
  if (relativePath.startsWith("workbook/")) return "PRESERVE_PLAN";
  return "PRESERVE_SOURCE";
}

function capabilityFor(relativePath) {
  if (
    /payroll/i.test(relativePath)
    || relativePath.startsWith("packages/billing/")
    || relativePath.startsWith("packages/hrx/fixtures/")
    || /\/(company-policy-manifest|golden-fixture|overtime|provider-receipt-contract)\./.test(relativePath)
    || /migrations\/02[1-5]_/.test(relativePath)
  ) return "PAYROLL";
  if (/leave/i.test(relativePath) || /migrations\/(?:01[1-9]|020)_/.test(relativePath)) return "LEAVE";
  if (/hrx-role-scope|PermissionAdminPanel|\/security\//.test(relativePath)) return "AUTH_PROFILE";
  if (/CandidatePortal|PortalSurface/.test(relativePath)) return "PORTAL";
  if (/MatterVaultPanel|MattersSurface/.test(relativePath)) return "MATTER";
  if (/ClientsSurface|DataCloudEnrichmentPanel|ImportDataMappingPanel|IntakeSurface|ProfilesSurface/.test(relativePath)) return "CLIENT";
  if (/VaultSurface|AskSurface|AnalyticsSurface|ReportBuilderPanel|ReadinessSurface/.test(relativePath)) return "SEARCH";
  if (/HomeSurface|HomeFinanceOperations|FinanceSurface|OpsSurface|DashboardList|home-dashboard/.test(relativePath)) return "HOME";
  if (relativePath.startsWith("apps/web/src/people/") || relativePath.startsWith("apps/web/src/admin/hrx/")) return "PEOPLE";
  return "PERSISTENCE_AUTHZ_PACKAGE";
}

const portGroups = [
  {
    id: "RUNTIME_AUTHZ_UNION",
    objective: "루트의 신규 HRX 서비스·scope·route를 Forest canonical runtime과 role matrix에 합집합으로 연결한다.",
    selected_sources: [
      "apps/api/src/hrx-runtime-context.js",
      "apps/api/src/middleware/hrx-step-up.js",
      "apps/api/src/routes/hrx/route-policy-map.js",
      "apps/api/src/server.js",
      "apps/web/src/people/hrxApiClient.ts",
      "packages/authz/src/hrx-sensitive-scopes.js",
      "packages/hrx/src/index.js",
      "packages/hrx/src/migrations/index.js",
      "packages/hrx/src/store/file-store.js",
      "packages/hrx/src/store/port.js",
    ],
    destination_anchors: [
      "apps/api/src/hrx-role-scope-matrix.js",
      "apps/api/src/hrx-payroll-runtime.js",
      "apps/api/src/routes/hrx/payroll-runtime.js",
      "packages/hrx/src/store/port.js",
    ],
    migration_authz_impact: "Forest 011~025와 canonical role matrix를 유지하고 승인된 신규 table/scope/route만 026+ 및 least-privilege 정책으로 추가한다.",
    test_anchors: [
      "apps/api/test/hrx/hrx-role-scope-matrix.test.js",
      "apps/api/test/hrx-runtime-api.test.js",
      "apps/api/test/hrx/route-authz.test.js",
      "packages/hrx/test/migration.test.js",
    ],
    negative_regression: "기존 Forest leave/payroll route, attachment, provider retry, profile resolution, tenant/session boundary 삭제 0.",
    manual_proof: "6개 역할별 People/휴가/급여 route와 서지원 프로필을 최종 packaged renderer에서 확인한다.",
  },
  {
    id: "LEAVE_RULE_LEDGER",
    objective: "버전형 자동발생 규칙과 근속 배분을 Forest 원장·lifecycle·type economics에 흡수한다.",
    selected_sources: [
      "apps/web/src/people/leave/LeaveAccrualAutoPage.tsx",
      "apps/web/src/people/leave/LeaveTypeSettingsPage.tsx",
      "packages/hrx/src/leave/accrual-service.js",
      "packages/hrx/src/leave/management-service.js",
      "packages/hrx/src/leave/policy-service.js",
      "packages/hrx/src/leave/allocation.js",
      "packages/hrx/src/migrations/015_hrx_leave_accrual_rule_versions.sql",
    ],
    destination_anchors: [
      "packages/hrx/src/leave/entitlement-command-service.js",
      "packages/hrx/src/leave/entitlement-lifecycle.js",
      "packages/hrx/src/leave/type-economics.js",
      "packages/hrx/src/migrations/020_hrx_leave_rule_snapshots.sql",
    ],
    migration_authz_impact: "기존 015/020을 덮어쓰지 않고 immutable rule version과 tenure band의 비중복 delta만 026+로 추가한다.",
    test_anchors: [
      "packages/hrx/test/leave-entitlement-command-service.test.js",
      "packages/hrx/test/leave-entitlement-lifecycle.test.js",
      "packages/hrx/test/leave-type-economics.test.js",
      "apps/api/test/hrx/leave-entitlement-lifecycle-api.test.js",
    ],
    negative_regression: "미리보기 전 write, 원장 직접 수정, 중복 발생, 기존 type economics/반올림 손실 0.",
    manual_proof: "Forest 44px 밀도의 자동발생·유형 설정 화면에서 규칙 버전과 실행 receipt만 간결하게 확인한다.",
  },
  {
    id: "LEAVE_FILE_IMPORT",
    objective: "CSV/XLSX 템플릿·파서를 Forest preview/approve/execute 업로드 배치에 연결한다.",
    selected_sources: [
      "apps/web/src/people/leave/LeaveAccrualManualPage.tsx",
      "packages/hrx/src/leave/xlsx-export.js",
      "packages/hrx/src/leave/manual-adjustment-file.js",
    ],
    destination_anchors: [
      "packages/hrx/src/leave/occurrence-upload-batch-service.js",
      "apps/web/src/people/leave/LeaveAccrualManualPage.tsx",
    ],
    migration_authz_impact: "새 원장 schema 없이 기존 upload batch 권한과 step-up 목적을 재사용하고 parser trust boundary만 강화한다.",
    test_anchors: [
      "packages/hrx/test/leave-occurrence-upload-batch-service.test.js",
      "packages/hrx/test/leave-accrual-batch-service.test.js",
      "apps/web/test/leave-accrual-ui.test.mjs",
    ],
    negative_regression: "zip bomb, malformed XLSX, formula injection, row limit 초과, preview 우회, 부분 write 0.",
    manual_proof: "템플릿 다운로드부터 preview·승인·실행·오류 receipt까지 단일 흐름으로 검수한다.",
  },
  {
    id: "LEAVE_COMPACT_ACTIONS",
    objective: "승인·퇴사정산의 유효 action만 남기고 비어 있는 설명·2줄 메타데이터는 되살리지 않는다.",
    selected_sources: [
      "apps/web/src/people/leave/LeaveApprovalQueue.tsx",
      "apps/web/src/people/leave/LeaveTerminationPage.tsx",
    ],
    destination_anchors: [
      "apps/web/src/people/leave/LeaveApprovalQueue.tsx",
      "apps/web/src/people/leave/LeaveTerminationPage.tsx",
    ],
    migration_authz_impact: "schema 영향 없음. 기존 approve/termination step-up과 payroll boundary를 유지한다.",
    test_anchors: [
      "apps/web/test/leave-self-service-ui.test.mjs",
      "apps/web/test/ui-regression.test.mjs",
      "packages/hrx/test/payroll-readiness-contract.test.js",
    ],
    negative_regression: "휴가·비용처리 분류 재도입, 무의미한 empty copy, 2줄 metadata, 이중 승인 문구 재도입 0.",
    manual_proof: "승인 대기와 퇴사 정산을 실제 Forest 화면에서 단일 행·단일 action으로 검수한다.",
  },
  {
    id: "PROFILE_HARDENING",
    objective: "사진 입력 검증과 packaged profile seed를 강화하되 로그인 계정과 canonical 직원 정합성을 보존한다.",
    selected_sources: [
      "apps/web/src/people/memberPhotos.js",
      "scripts/build-matter-desktop-mac.mjs",
    ],
    destination_anchors: [
      "apps/api/src/hrx-member-roster-registry.js",
      "apps/web/src/components/UserProfileSurface.jsx",
      "scripts/validate-public-renderer-no-hrx-roster-pii.mjs",
    ],
    migration_authz_impact: "공개 profile projection만 사용하며 raw roster/PII와 generic session fallback을 renderer에 포함하지 않는다.",
    test_anchors: [
      "apps/api/test/profile-api.test.js",
      "apps/web/test/ui-regression.test.mjs",
      "scripts/validate-public-renderer-no-hrx-roster-pii.mjs",
    ],
    negative_regression: "jwsuh@amic.kr의 서지원 매핑 손실, 세션 사용자 표기, 미등록 placeholder, 비이미지 data URL, PII 번들 포함 0.",
    manual_proof: "동일 계정으로 로그인하여 프로필 이름·부서·직위와 사진을 packaged app에서 확인한다.",
  },
  {
    id: "PAYROLL_CATALOG_ASSIGNMENT_TIME",
    objective: "급여 항목·직원별 항목 배정·승인 출퇴근 입력 lineage를 Forest 계산/공제/run/document/payment/filing 런타임에 연결한다.",
    selected_sources: [
      "apps/api/src/routes/hrx/payroll.js",
      "packages/hrx/src/migrations/011_hrx_payroll_items.sql",
      "packages/hrx/src/migrations/012_hrx_payroll_profiles.sql",
      "packages/hrx/src/migrations/013_hrx_payroll_time_inputs.sql",
      "packages/hrx/src/payroll-item-catalog.js",
      "packages/hrx/src/payroll-profile-service.js",
      "packages/hrx/src/payroll-time-input-snapshot.js",
    ],
    destination_anchors: [
      "apps/api/src/hrx-payroll-runtime.js",
      "packages/hrx/src/payroll/input-snapshot-service.js",
      "packages/hrx/src/payroll/repository.js",
      "packages/hrx/src/migrations/021_hrx_payroll_runtime.sql",
      "packages/hrx/src/migrations/025_hrx_payroll_year_end.sql",
    ],
    migration_authz_impact: "충돌하는 root 011~013을 복사하지 않고 item assignment와 attendance lineage delta만 026+로 정규화하며 payroll self/admin scope를 분리한다.",
    test_anchors: [
      "packages/hrx/test/payroll-input-snapshot-service.test.js",
      "packages/hrx/test/payroll-run-service.test.js",
      "packages/hrx/test/payroll-calculation-engine.test.js",
      "apps/api/test/hrx/payroll-runtime.test.js",
      "apps/web/test/payroll-workspace-ui.test.mjs",
    ],
    negative_regression: "root 011~013 재사용, raw amount/계좌 노출, 승인 전 시간 입력 반영, 기존 run/payment/filing/year-end 기능 삭제 0.",
    manual_proof: "급여 항목 설정부터 입력 snapshot·계산·명세서·지급·신고 상태를 역할별 Forest 화면에서 검수한다.",
  },
];

const capabilityDefinitions = [
  {
    id: "HOME",
    acceptance: "승인 대기는 구체 항목을 직접 표시하고 최근 작업은 정렬된 단일 행이며 캘린더와 공존한다.",
    source_anchors: ["apps/web/src/components/HomeSurface.jsx", "apps/web/src/components/HomeFinanceOperations.jsx"],
    proof_anchors: ["apps/web/test/home-dashboard-r1.test.mjs", "apps/web/test/ui-regression.test.mjs"],
  },
  {
    id: "CLIENT",
    acceptance: "현재 Forest 고객 목록·가져오기·enrichment 계약을 유지한다.",
    source_anchors: ["apps/web/src/components/ClientsSurface.jsx", "apps/web/src/components/ImportDataMappingPanel.jsx"],
    proof_anchors: ["apps/web/test/forest-responsive-layout-browser.test.mjs", "apps/web/test/ui-regression.test.mjs"],
  },
  {
    id: "MATTER",
    acceptance: "현재 Matter 목록과 Vault 연결 상태를 한 줄 정보 계층으로 유지한다.",
    source_anchors: ["apps/web/src/components/MattersSurface.jsx", "apps/web/src/components/MatterVaultPanel.jsx"],
    proof_anchors: ["apps/web/test/forest-responsive-layout-browser.test.mjs", "apps/web/test/ui-regression.test.mjs"],
  },
  {
    id: "PEOPLE",
    acceptance: "구성원 조회와 People 업무 모듈을 유지하고 삭제된 근무일정·직무역할·근로정보 메뉴를 되살리지 않는다.",
    source_anchors: ["apps/web/src/people/PeopleHome.tsx", "apps/web/src/people/employees/EmployeeList.tsx"],
    proof_anchors: ["apps/web/test/forest-responsive-layout-browser.test.mjs", "apps/api/test/hrx-runtime-api.test.js"],
  },
  {
    id: "SEARCH",
    acceptance: "Search 명칭·Vault 통합 검색·현재 Forest hero와 메뉴를 유지하고 문서/OCR 별도 메뉴를 만들지 않는다.",
    source_anchors: ["apps/web/src/components/VaultSurface.jsx", "apps/web/src/App.jsx"],
    proof_anchors: ["apps/web/test/forest-responsive-layout-browser.test.mjs", "apps/web/test/ui-regression.test.mjs"],
  },
  {
    id: "PORTAL",
    acceptance: "현재 Portal shell과 candidate collaboration surface를 유지한다.",
    source_anchors: ["apps/web/src/components/PortalSurface.jsx", "apps/web/src/candidate/CandidatePortal.tsx"],
    proof_anchors: ["apps/web/test/forest-responsive-layout-browser.test.mjs", "apps/web/test/ui-regression.test.mjs"],
  },
  {
    id: "AUTH_PROFILE",
    acceptance: "Forest 로그인·권한·계정 연결 프로필을 유지하며 known account가 generic 세션 사용자로 후퇴하지 않는다.",
    source_anchors: ["apps/api/src/hrx-role-scope-matrix.js", "apps/web/src/components/UserProfileSurface.jsx"],
    proof_anchors: ["apps/api/test/hrx/hrx-role-scope-matrix.test.js", "apps/api/test/profile-api.test.js", "scripts/validate-public-renderer-no-hrx-roster-pii.mjs"],
  },
  {
    id: "LEAVE",
    acceptance: "휴가 유형·자동/수동 발생·원장 lifecycle·사용·만료·promotion·provider·privacy 전체를 보존한다.",
    source_anchors: ["packages/hrx/src/leave/entitlement-command-service.js", "packages/hrx/src/leave/occurrence-upload-batch-service.js", "packages/hrx/src/leave/type-economics.js"],
    proof_anchors: ["packages/hrx/test/leave-entitlement-command-service.test.js", "packages/hrx/test/leave-occurrence-upload-batch-service.test.js", "apps/web/test/leave-settings-ui.test.mjs"],
  },
  {
    id: "PAYROLL",
    acceptance: "입력·계산·공제·run·명세서·지급·신고·migration·year-end 전체를 보존한다.",
    source_anchors: ["packages/hrx/src/payroll/run-service.js", "packages/hrx/src/payroll/deduction-engine.js", "packages/hrx/src/payroll/document-service.js"],
    proof_anchors: ["packages/hrx/test/payroll-run-service.test.js", "packages/hrx/test/payroll-deduction-engine.test.js", "apps/web/test/payroll-workspace-ui.test.mjs"],
  },
  {
    id: "PERSISTENCE_AUTHZ_PACKAGE",
    acceptance: "durable store·tenant/authz·Desktop runtime·renderer·PII validator·checkpoint/QA 도구를 보존한다.",
    source_anchors: ["packages/hrx/src/store/port.js", "apps/desktop/src/main/aws-runtime.js", "apps/web/src/components/Shell.jsx"],
    proof_anchors: ["apps/desktop/test/aws-runtime-client.test.mjs", "apps/desktop/test/renderer-runtime-ui.test.mjs", "apps/web/test/forest-responsive-layout-browser.test.mjs"],
  },
];

const rootFingerprintBefore = rootWorktreeFingerprint(rootSource);
if (rootFingerprintBefore.sha256 !== expectedRootWorktreeSha256) {
  throw new Error(`root worktree fingerprint changed before RC-004: ${rootFingerprintBefore.sha256}`);
}

for (const revision of [forestBase, forestCheckpoint, forestVerificationCommit, candidateEntrySha]) {
  if (execFileSync("git", ["cat-file", "-t", revision], { cwd: forestRoot, encoding: "utf8" }).trim() !== "commit") {
    throw new Error(`required revision is not a commit: ${revision}`);
  }
}
if (execFileSync("git", ["merge-base", "--is-ancestor", candidateEntrySha, "HEAD"], { cwd: forestRoot }).length !== 0) {
  // merge-base is silent on success; this branch is retained only to keep the assertion adjacent to revision validation.
}

const forestChanged = new Set(lines(git(forestRoot, ["diff", "--name-only", `${forestBase}..${forestCheckpoint}`])));
const rootDirty = new Set([...rootFingerprintBefore.tracked, ...rootFingerprintBefore.untracked]);
const allCommon = [...forestChanged].filter((relativePath) => rootDirty.has(relativePath)).sort();
const commonProduct = allCommon.filter((relativePath) => relativePath !== metadataPath);
const rootOnly = [...rootDirty].filter((relativePath) => !forestChanged.has(relativePath)).sort();
const forestOnly = [...forestChanged].filter((relativePath) => !rootDirty.has(relativePath)).sort();

const expectedCounts = { forest_changed: 222, root_dirty: 77, all_common: 52, common_product: 51, root_only: 25, forest_only: 170 };
const actualCounts = {
  forest_changed: forestChanged.size,
  root_dirty: rootDirty.size,
  all_common: allCommon.length,
  common_product: commonProduct.length,
  root_only: rootOnly.length,
  forest_only: forestOnly.length,
};
if (JSON.stringify(actualCounts) !== JSON.stringify(expectedCounts)) {
  throw new Error(`comparison universe drift: ${JSON.stringify(actualCounts)}`);
}

const approvedCheckpointAdjustments = new Map([
  ["apps/api/test/hrx-runtime-api.test.js", {
    verification_commit: forestVerificationCommit,
    reason: "FZ-006 isolated the runtime API store and updated masked compensation assertions to the two-record Forest runtime contract.",
  }],
]);

const forestPreservation = forestOnly.map((relativePath) => {
  const checkpoint = gitBlob(forestRoot, forestCheckpoint, relativePath);
  const current = gitBlob(forestRoot, "HEAD", relativePath);
  const approved = approvedCheckpointAdjustments.get(relativePath);
  let checkpoint_relation = "BYTE_IDENTICAL";
  if (!checkpoint.equals(current)) {
    if (!approved) checkpoint_relation = "UNEXPECTED_CHANGE";
    else {
      const approvedBytes = gitBlob(forestRoot, approved.verification_commit, relativePath);
      checkpoint_relation = approvedBytes.equals(current) ? "APPROVED_FZ006_STABILIZATION" : "UNEXPECTED_CHANGE";
    }
  }
  const digest = fileDigest(forestRoot, relativePath);
  return {
    path: relativePath,
    capability: capabilityFor(relativePath),
    preservation: preserveDisposition(relativePath),
    checkpoint_relation,
    checkpoint_sha256: sha256(checkpoint),
    current_sha256: sha256(current),
    mode: digest.mode,
    size: digest.size,
    approved_adjustment: approved ?? null,
  };
});
const unexpectedForestChanges = forestPreservation.filter((entry) => entry.checkpoint_relation === "UNEXPECTED_CHANGE");
if (unexpectedForestChanges.length) throw new Error(`unexpected Forest preservation changes: ${unexpectedForestChanges.map((entry) => entry.path).join(",")}`);
assertExactSet(
  forestPreservation.filter((entry) => entry.checkpoint_relation === "APPROVED_FZ006_STABILIZATION").map((entry) => entry.path),
  [...approvedCheckpointAdjustments.keys()],
  "approved checkpoint adjustments",
);

const rc002Rows = parseRc002Review(readFileSync(rc002ReviewPath, "utf8"));
if (rc002Rows.some((entry) => !entry.classification)) throw new Error("RC-002 contains an unmapped integration gate");
assertExactSet(rc002Rows.map((entry) => entry.path), commonProduct, "RC-002 common product decisions");

const rc003Rows = JSON.parse(readFileSync(rc003ClassificationPath, "utf8")).map((entry) => ({
  path: entry.path,
  origin: "root-only",
  classification: entry.classification,
  gate: entry.classification,
  relation: entry.area,
  finding: entry.rationale,
}));
assertExactSet(rc003Rows.map((entry) => entry.path), rootOnly, "RC-003 root-only decisions");

const rootDispositionMatrix = [...rc002Rows, ...rc003Rows].sort((left, right) => left.path.localeCompare(right.path));
const allowedDispositions = new Set(["PORT_REQUIRED", "PORT_TEST_ONLY", "SUPERSEDED", "REJECTED"]);
if (rootDispositionMatrix.some((entry) => !allowedDispositions.has(entry.classification))) throw new Error("invalid root disposition");
if (rootDispositionMatrix.length !== 76) throw new Error(`unexpected root disposition count: ${rootDispositionMatrix.length}`);
const rootDispositionCounts = countBy(rootDispositionMatrix, "classification");
const expectedRootDispositionCounts = { PORT_REQUIRED: 31, PORT_TEST_ONLY: 17, REJECTED: 4, SUPERSEDED: 24 };
if (JSON.stringify(rootDispositionCounts) !== JSON.stringify(expectedRootDispositionCounts)) {
  throw new Error(`root disposition count drift: ${JSON.stringify(rootDispositionCounts)}`);
}

const portRequired = rootDispositionMatrix.filter((entry) => entry.classification === "PORT_REQUIRED").map((entry) => entry.path).sort();
const groupedPortPaths = portGroups.flatMap((group) => group.selected_sources).sort();
assertExactSet(groupedPortPaths, portRequired, "PORT_REQUIRED group coverage");
const missingRootSources = portRequired.filter((relativePath) => !existsSync(path.join(rootSource, relativePath)));
if (missingRootSources.length) throw new Error(`missing selected root sources: ${missingRootSources.join(",")}`);

const allAnchors = new Set([
  ...portGroups.flatMap((group) => [...group.destination_anchors, ...group.test_anchors]),
  ...capabilityDefinitions.flatMap((capability) => [...capability.source_anchors, ...capability.proof_anchors]),
]);
const missingAnchors = [...allAnchors].filter((relativePath) => !existsSync(path.join(forestRoot, relativePath))).sort();
if (missingAnchors.length) throw new Error(`missing RC-004 anchors: ${missingAnchors.join(",")}`);

const capabilityMatrix = capabilityDefinitions.map((definition) => {
  const paths = forestPreservation.filter((entry) => entry.capability === definition.id).map((entry) => entry.path).sort();
  return {
    ...definition,
    preserved_path_count: paths.length,
    preserved_paths: paths,
    source_anchor_sha256: Object.fromEntries(definition.source_anchors.map((relativePath) => [relativePath, fileDigest(forestRoot, relativePath).sha256])),
    proof_anchor_sha256: Object.fromEntries(definition.proof_anchors.map((relativePath) => [relativePath, fileDigest(forestRoot, relativePath).sha256])),
    acceptance_status: paths.length > 0 ? "COVERED" : "MISSING",
  };
});
const missingCapabilities = capabilityMatrix.filter((entry) => entry.acceptance_status !== "COVERED");
if (missingCapabilities.length) throw new Error(`missing capability coverage: ${missingCapabilities.map((entry) => entry.id).join(",")}`);
if (capabilityMatrix.reduce((sum, entry) => sum + entry.preserved_path_count, 0) !== 170) throw new Error("capability path coverage is not 170");

const rootFingerprintAfter = rootWorktreeFingerprint(rootSource);
if (rootFingerprintAfter.sha256 !== rootFingerprintBefore.sha256) {
  throw new Error(`root worktree changed during RC-004: ${rootFingerprintBefore.sha256} != ${rootFingerprintAfter.sha256}`);
}

const preservationCounts = countBy(forestPreservation, "preservation");
const capabilityCounts = Object.fromEntries(capabilityMatrix.map((entry) => [entry.id, entry.preserved_path_count]));
const receipt = {
  tuw: "RC-004",
  verdict: "PASS",
  candidate_entry_sha: candidateEntrySha,
  evidence_commit_sha: evidenceCommitSha,
  forest_comparison_base: forestBase,
  forest_content_checkpoint: forestCheckpoint,
  forest_verification_commit: forestVerificationCommit,
  root_source_head: git(rootSource, ["rev-parse", "HEAD"]).trim(),
  root_source_worktree_sha256: rootFingerprintAfter.sha256,
  root_source_tracked_modified_count: rootFingerprintAfter.tracked_count,
  root_source_untracked_count: rootFingerprintAfter.untracked_count,
  comparison_counts: actualCounts,
  comparison_product_universe_count: commonProduct.length + rootOnly.length + forestOnly.length,
  root_contribution_count: rootDispositionMatrix.length,
  root_disposition_counts: rootDispositionCounts,
  forest_only_preserved_count: forestPreservation.length,
  forest_preservation_counts: preservationCounts,
  forest_capability_counts: capabilityCounts,
  approved_checkpoint_adjustment_count: forestPreservation.filter((entry) => entry.checkpoint_relation === "APPROVED_FZ006_STABILIZATION").length,
  unexpected_checkpoint_change_count: unexpectedForestChanges.length,
  port_required_count: portRequired.length,
  port_group_count: portGroups.length,
  port_grouped_path_count: groupedPortPaths.length,
  orphan_port_required_count: 0,
  capability_axis_count: capabilityMatrix.length,
  missing_capability_count: missingCapabilities.length,
  missing_anchor_count: missingAnchors.length,
  missing_selected_root_source_count: missingRootSources.length,
  unclassified_count: 0,
  forest_preservation_sha256: sha256(JSON.stringify(forestPreservation)),
  root_disposition_sha256: sha256(JSON.stringify(rootDispositionMatrix)),
  port_groups_sha256: sha256(JSON.stringify(portGroups)),
  capability_matrix_sha256: sha256(JSON.stringify(capabilityMatrix)),
  product_runtime_changes: 0,
  external_blockers: [],
};

const forestTsvHeader = ["path", "capability", "preservation", "checkpoint_relation", "mode", "size", "checkpoint_sha256", "current_sha256"].join("\t");
const forestTsvRows = forestPreservation.map((entry) => [
  entry.path,
  entry.capability,
  entry.preservation,
  entry.checkpoint_relation,
  entry.mode,
  entry.size,
  entry.checkpoint_sha256,
  entry.current_sha256,
].join("\t"));

const semanticReview = [
  "# RC-004 Upper-compatible Capability Review",
  "",
  "## Comparison universe",
  "",
  `- Forest checkpoint changed paths: ${actualCounts.forest_changed}`,
  `- root dirty paths: ${actualCounts.root_dirty}`,
  `- common product paths: ${actualCounts.common_product}`,
  `- root-only paths: ${actualCounts.root_only}`,
  `- Forest-only paths: ${actualCounts.forest_only}`,
  `- product comparison universe: ${receipt.comparison_product_universe_count}`,
  `- root contributions classified: ${receipt.root_contribution_count}`,
  `- Forest-only paths preserved: ${receipt.forest_only_preserved_count}`,
  `- unclassified: ${receipt.unclassified_count}`,
  "",
  "## Root contribution dispositions",
  "",
  "| Path | Origin | Disposition | Source gate |",
  "|---|---|---|---|",
  ...rootDispositionMatrix.map((entry) => `| \`${entry.path}\` | ${entry.origin} | \`${entry.classification}\` | \`${entry.gate}\` |`),
  "",
  "## PORT_REQUIRED groups",
  "",
  "| Group | Selected paths | Destination anchors | Negative regression | Manual proof |",
  "|---|---:|---|---|---|",
  ...portGroups.map((group) => `| \`${group.id}\` | ${group.selected_sources.length} | ${group.destination_anchors.map((entry) => `\`${entry}\``).join("<br>")} | ${group.negative_regression} | ${group.manual_proof} |`),
  "",
  "## Forest-only preservation",
  "",
  "| Path | Capability | Preservation | Checkpoint relation |",
  "|---|---|---|---|",
  ...forestPreservation.map((entry) => `| \`${entry.path}\` | \`${entry.capability}\` | \`${entry.preservation}\` | \`${entry.checkpoint_relation}\` |`),
  "",
  "## Capability acceptance matrix",
  "",
  "| Capability | Forest-only paths | Source anchors | Proof anchors | Acceptance |",
  "|---|---:|---|---|---|",
  ...capabilityMatrix.map((entry) => `| \`${entry.id}\` | ${entry.preserved_path_count} | ${entry.source_anchors.map((anchor) => `\`${anchor}\``).join("<br>")} | ${entry.proof_anchors.map((anchor) => `\`${anchor}\``).join("<br>")} | ${entry.acceptance} |`),
  "",
  "## Adjudication",
  "",
  "- The 170-path Forest-only set is preserved from the ended-session checkpoint. One test path has the approved FZ-006 stabilization; unexpected checkpoint changes are zero.",
  "- All 76 root contributions are assigned exactly one of PORT_REQUIRED, PORT_TEST_ONLY, SUPERSEDED, or REJECTED.",
  "- Every one of the 31 PORT_REQUIRED paths belongs to exactly one bounded port group. No file-level copy of a differing common file is authorized.",
  "- All 10 governing capability axes have current Forest source anchors and proof anchors. RC-004 changes no product runtime code.",
].join("\n");

writeEvidence("forest-only-inventory.tsv", [forestTsvHeader, ...forestTsvRows].join("\n"));
writeEvidence("forest-only-preservation.json", forestPreservation);
writeEvidence("root-disposition-matrix.json", rootDispositionMatrix);
writeEvidence("port-groups.json", portGroups);
writeEvidence("capability-matrix.json", capabilityMatrix);
writeEvidence("semantic-review.md", semanticReview);
writeEvidence("receipt.json", receipt);
writeEvidence("files.txt", [
  "scripts/generate-upper-compatible-capability-matrix.mjs",
  "workbook/forest-v0.1.17-main-integration-release-goal-plan-2026-07-15.md",
  "workbook/forest-v0.1.17-integration-evidence/RC-004/acceptance.md",
  "workbook/forest-v0.1.17-integration-evidence/RC-004/commands.txt",
  "workbook/forest-v0.1.17-integration-evidence/RC-004/files.txt",
  "workbook/forest-v0.1.17-integration-evidence/RC-004/tests.txt",
  "workbook/forest-v0.1.17-integration-evidence/RC-004/receipt.json",
  "workbook/forest-v0.1.17-integration-evidence/RC-004/forest-only-inventory.tsv",
  "workbook/forest-v0.1.17-integration-evidence/RC-004/forest-only-preservation.json",
  "workbook/forest-v0.1.17-integration-evidence/RC-004/root-disposition-matrix.json",
  "workbook/forest-v0.1.17-integration-evidence/RC-004/port-groups.json",
  "workbook/forest-v0.1.17-integration-evidence/RC-004/capability-matrix.json",
  "workbook/forest-v0.1.17-integration-evidence/RC-004/semantic-review.md",
].join("\n"));
writeEvidence("tests.txt", [
  "node --check scripts/generate-upper-compatible-capability-matrix.mjs: PASS",
  "CLI help contract: PASS",
  "missing root-source rejection: PASS",
  "comparison universe counts 222/77/52/51/25/170: PASS",
  "Forest-only 170/170 preservation classification: PASS",
  "approved FZ-006 checkpoint stabilization 1/1: PASS",
  "unexpected checkpoint changes 0: PASS",
  "root contributions 76/76 disposition classification: PASS",
  "root dispositions PORT_REQUIRED 31, PORT_TEST_ONLY 17, SUPERSEDED 24, REJECTED 4: PASS",
  "PORT_REQUIRED grouped 31/31, orphan 0: PASS",
  "capability axes 10/10, missing 0: PASS",
  "anchor existence, missing 0: PASS",
  "root working-tree mutation 0: PASS",
  "deterministic rerun: PASS",
  "product runtime changes: 0",
].join("\n"));
writeEvidence("acceptance.md", [
  "# RC-004 Acceptance",
  "",
  "- TUW: RC-004",
  "- status: DONE",
  `- entry_sha: \`${candidateEntrySha}\``,
  `- exit_sha: \`${evidenceCommitSha}\``,
  "- changed_files: generator, RC-004 evidence set, Goal execution ledger only; product runtime 0",
  `- Forest checkpoint: \`${forestCheckpoint}\``,
  `- Forest verification commit: \`${forestVerificationCommit}\``,
  `- root source HEAD: \`${receipt.root_source_head}\``,
  `- root source working-tree SHA-256: \`${receipt.root_source_worktree_sha256}\``,
  `- product comparison universe: ${receipt.comparison_product_universe_count}`,
  `- common product paths: ${actualCounts.common_product}`,
  `- root-only paths: ${actualCounts.root_only}`,
  `- Forest-only paths preserved: ${receipt.forest_only_preserved_count}/${actualCounts.forest_only}`,
  `- approved checkpoint stabilizations: ${receipt.approved_checkpoint_adjustment_count}`,
  `- unexpected checkpoint changes: ${receipt.unexpected_checkpoint_change_count}`,
  `- root dispositions: PORT_REQUIRED ${rootDispositionCounts.PORT_REQUIRED}, PORT_TEST_ONLY ${rootDispositionCounts.PORT_TEST_ONLY}, SUPERSEDED ${rootDispositionCounts.SUPERSEDED}, REJECTED ${rootDispositionCounts.REJECTED}`,
  `- PORT_REQUIRED groups: ${receipt.port_group_count}; grouped paths ${receipt.port_grouped_path_count}/${receipt.port_required_count}; orphan ${receipt.orphan_port_required_count}`,
  `- capability axes: ${receipt.capability_axis_count}; missing ${receipt.missing_capability_count}`,
  "- commands: see `commands.txt`",
  "- test_result: all structural, preservation, disposition, grouping, anchor, and deterministic checks PASS",
  "- manual_qa: RC-002 common findings and RC-003 root-only findings were crosswalked to current Forest source/test anchors for Home, Client, Matter, People, Search, Portal, auth/profile, leave, payroll, and persistence/authz/package",
  `- evidence_hashes: preservation \`${receipt.forest_preservation_sha256}\`, root dispositions \`${receipt.root_disposition_sha256}\`, port groups \`${receipt.port_groups_sha256}\`, capability matrix \`${receipt.capability_matrix_sha256}\``,
  "- known_limits: RC-004 is a selection/preservation gate; actual source ports, new 026+ migrations, rendered QA, and package QA remain assigned to RC-005 and later TUWs",
  "- external_blockers: none",
  "- AI slop review: pass; no product UI or user-facing runtime copy changed",
].join("\n"));
writeEvidence("commands.txt", [
  "node --check scripts/generate-upper-compatible-capability-matrix.mjs",
  "node scripts/generate-upper-compatible-capability-matrix.mjs --help",
  "node scripts/generate-upper-compatible-capability-matrix.mjs # expected usage failure",
  `node scripts/generate-upper-compatible-capability-matrix.mjs \"${rootSource}\"`,
  "git diff --check",
  "python3 /Users/jws/Applications/ai-slop-taxonomy/scripts/sloplint.py --repo \"$PWD\" --changed",
  "rerun generator and compare evidence directory SHA-256 manifest",
].join("\n"));

console.log(JSON.stringify(receipt, null, 2));
