import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const usage = "usage: node scripts/validate-cp005-seo-jiwon-profile-link.mjs [--emit|--check|--help]";
const command = process.argv[2] ?? "--check";
if (command === "--help") {
  console.log(usage);
  console.log("Verifies the jwsuh@amic.kr account-to-employee join, authenticated profile contract, generic-session suppression, and current internal package profile receipt.");
  process.exit(0);
}
if (!["--emit", "--check"].includes(command) || process.argv.length > 3) {
  console.error(usage);
  process.exit(2);
}

const root = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
if (path.resolve(root) !== path.resolve(process.cwd())) throw new Error(`run from repository root: ${root}`);

const entrySha = "55e6cfe111e5c56d8125b27570fca144bf6947dc";
const exactBuildSha = "75f10995d9e04c35e8d21710fc64d6bd5e9b5e4c";
const rendererSha256 = "b73aac5c2686e1650d2a7685a8d4b790a45786fe4363029ffbfc5da9899c1a96";
const accountPath = "docs/reorganization/client-matter-os/matter-vault-r4/launch/matter-vault-user-registration-seed.json";
const rosterPath = "docs/reorganization/client-matter-os/matter-vault-r4/launch/hrx-member-roster-source-of-truth.json";
const profileReceiptPath = "docs/lazycodex/evidence/matter-profile/2026-07-10/packaged-desktop-smoke.json";
const profileScreenshotPath = "docs/lazycodex/evidence/matter-profile/2026-07-10/profile-api-packaged.png";
const photoPath = `apps/api/src/hrx-member-photos/${createHash("sha256").update("emp_amic_jwsuh").digest("hex")}.png`;
const expectedPath = "workbook/forest-v0.1.17-integration-evidence/CP-005/seo-jiwon-profile-link-matrix.json";

function text(filePath) {
  return readFileSync(filePath, "utf8");
}

function json(filePath) {
  return JSON.parse(text(filePath));
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function containsEvery(filePath, needles) {
  const source = text(filePath);
  return needles.every((needle) => source.includes(needle));
}

const account = json(accountPath).users.find((row) => row.email === "jwsuh@amic.kr");
const member = json(rosterPath).members.find((row) => row.work_email === "jwsuh@amic.kr");
const professional = member?.professional_profile ?? {};
const identityChecks = {
  account_exists: Boolean(account),
  account_user_id: account?.user_id === "user_amic_jwsuh",
  account_display_name: account?.display_name === "서지원",
  account_mfa_required: account?.mfa_required === true,
  account_tenant: account?.tenant_memberships?.some((membership) => membership.tenant_id === "tenant_amic_matter_vault") === true,
  member_exists: Boolean(member),
  member_user_join: member?.user_id === "user_amic_jwsuh",
  member_employee_id: member?.employee_id === "emp_amic_jwsuh",
  member_display_name: member?.display_name === "서지원",
  member_title: member?.title === "대표변호사",
  member_department: member?.department === "Legal",
  member_affiliation: member?.affiliation === "AMIC Law",
  member_organization: member?.organization_group === "AMIC Law",
  member_country: member?.country === "대한민국",
  professional_kind: professional.profile_kind === "attorney",
  professional_experience: professional.experience?.includes("법무법인 아믹 대표변호사 (2025~현재)") === true,
  professional_education: professional.education?.includes("서울대학교 교육학과 학사") === true,
  professional_qualification: professional.qualifications?.includes("대한민국 변호사") === true,
  professional_practice_area: professional.practice_areas?.includes("M&A") === true
};

const sourceContracts = {
  profile_api_join: containsEvery("apps/api/src/server.js", [
    "authenticated_hrx_member_projection",
    "resolveHrxEmployeeProfileByUserId",
    "employee_user_link_resolved",
    "authenticated_internal"
  ]),
  roster_registry: containsEvery("apps/api/src/hrx-member-roster-registry.js", [
    "findHrxMemberRosterByUserId",
    "findHrxPublicProfessionalProfileByEmployeeId",
    "memberPhotoDataUrlForEmployeeId",
    "hrx-public-professional-profile-catalog"
  ]),
  profile_surface: containsEvery("apps/web/src/components/UserProfileSurface.jsx", [
    "GENERIC_PROFILE_NAMES",
    "resolvedProfileMember",
    "세션 사용자",
    "profileResult?.item",
    "경력",
    "연락처"
  ]),
  shell_generic_suppression: containsEvery("apps/web/src/components/Shell.jsx", ["genericSessionDisplayNames", "세션 사용자"]),
  home_generic_suppression: containsEvery("apps/web/src/components/HomeSurface.jsx", ["genericSessionDisplayNames", "세션 사용자"])
};

const photo = readFileSync(photoPath);
const photoChecks = {
  file_exists: existsSync(photoPath),
  png_magic: photo.subarray(0, 8).toString("hex") === "89504e470d0a1a0a",
  non_empty: photo.length > 8
};

const testFiles = [
  "apps/api/test/profile-api.test.js",
  "apps/api/test/hrx-runtime-api.test.js",
  "apps/web/test/hrx-member-roster-fallback.test.mjs",
  "apps/web/test/people-roster-contact.test.mjs",
  "packages/hrx/test/identity-link.test.js",
  "packages/runtime-auth/test/matter-vault-user-registration-seed.test.js"
];

const receiptRaw = readFileSync(profileReceiptPath);
const receipt = JSON.parse(receiptRaw.toString("utf8"));
const receiptChecks = {
  passed: receipt.status === "passed",
  isolated_local_qa: receipt.runtime_profile === "isolated_local_qa",
  profile_api_populated: receipt.profile_api_state === "populated",
  signed_in: receipt.profile_identity?.session?.state === "signed_in",
  session_user_id: receipt.profile_identity?.session?.user_id === "user_amic_jwsuh",
  session_display_name: receipt.profile_identity?.session?.display_name === "서지원",
  rendered_member_id: receipt.profile_identity?.rendered?.member_id === "emp_amic_jwsuh",
  rendered_display_name: receipt.profile_identity?.rendered?.display_name === "서지원",
  full_profile_contract: Object.keys(receipt.profile_contract ?? {}).length === 9
    && Object.values(receipt.profile_contract).every((value) => value === true),
  five_matter_fixtures: JSON.stringify(receipt.fixtures) === JSON.stringify(["civil", "criminal", "administrative", "deal", "corporate-advisory"]),
  claim_boundaries_false: receipt.public_release === false && receipt.production_go_live === false
};

const productRuntimeUnchanged = (() => {
  try {
    execFileSync("git", [
      "diff", "--quiet", exactBuildSha, entrySha, "--",
      "apps/api/src", "apps/web/src", "apps/desktop/src", "packages/hrx/src", "packages/shared/src"
    ]);
    return true;
  } catch {
    return false;
  }
})();

const failedIdentityChecks = Object.entries(identityChecks).filter(([, passed]) => !passed).map(([name]) => name);
const failedSourceContracts = Object.entries(sourceContracts).filter(([, passed]) => !passed).map(([name]) => name);
const failedPhotoChecks = Object.entries(photoChecks).filter(([, passed]) => !passed).map(([name]) => name);
const missingTestFiles = testFiles.filter((filePath) => !existsSync(filePath));
const failedReceiptChecks = Object.entries(receiptChecks).filter(([, passed]) => !passed).map(([name]) => name);

const result = {
  schema_version: "law-firm-os.cp005-seo-jiwon-profile-link.v1",
  entry_sha: entrySha,
  identity_contract: {
    account_email: "jwsuh@amic.kr",
    user_id: "user_amic_jwsuh",
    employee_id: "emp_amic_jwsuh",
    display_name: "서지원",
    checks: identityChecks,
    failed_checks: failedIdentityChecks
  },
  source_contracts: {
    checks: sourceContracts,
    failed_checks: failedSourceContracts
  },
  photo_contract: {
    path: photoPath,
    sha256: sha256(photo),
    checks: photoChecks,
    failed_checks: failedPhotoChecks
  },
  test_inventory: {
    file_count: testFiles.length,
    missing_files: missingTestFiles
  },
  current_internal_package_qa: {
    path: profileReceiptPath,
    sha256: sha256(receiptRaw),
    screenshot_path: profileScreenshotPath,
    screenshot_sha256: sha256(readFileSync(profileScreenshotPath)),
    exact_build_sha: exactBuildSha,
    renderer_sha256: rendererSha256,
    product_runtime_unchanged_since_exact_build: productRuntimeUnchanged,
    checks: receiptChecks,
    failed_checks: failedReceiptChecks,
    verification_scope: "mac_internal_isolated_profile_and_matter_fixture_smoke"
  },
  claim_boundary: {
    public_renderer_pii_requires_separate_validator: true,
    public_release: false,
    production_go_live: false,
    formal_macos_package: false,
    native_windows_package: false
  },
  verdict: failedIdentityChecks.length === 0
    && failedSourceContracts.length === 0
    && failedPhotoChecks.length === 0
    && missingTestFiles.length === 0
    && failedReceiptChecks.length === 0
    && productRuntimeUnchanged
      ? "PASS"
      : "FAIL"
};

if (result.verdict !== "PASS") {
  throw new Error(`CP-005 profile link failed: ${JSON.stringify({ failedIdentityChecks, failedSourceContracts, failedPhotoChecks, missingTestFiles, failedReceiptChecks, productRuntimeUnchanged })}`);
}

if (command === "--emit") {
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}

if (!existsSync(expectedPath)) throw new Error(`missing checked-in CP-005 matrix: ${expectedPath}`);
const expected = JSON.parse(text(expectedPath));
if (JSON.stringify(expected) !== JSON.stringify(result)) throw new Error("checked-in CP-005 matrix does not match current identity, profile, and package contracts");
console.log(JSON.stringify({
  verdict: result.verdict,
  entry_sha: result.entry_sha,
  identity_checks: `${Object.keys(identityChecks).length}/${Object.keys(identityChecks).length}`,
  source_contracts: `${Object.keys(sourceContracts).length}/${Object.keys(sourceContracts).length}`,
  package_profile_checks: `${Object.keys(receiptChecks).length}/${Object.keys(receiptChecks).length}`,
  test_files: testFiles.length,
  generic_session_fallback_absent: receipt.profile_contract.generic_session_fallback_absent,
  renderer_sha256: result.current_internal_package_qa.renderer_sha256
}, null, 2));
