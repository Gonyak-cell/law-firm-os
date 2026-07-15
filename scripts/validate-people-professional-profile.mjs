#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const SOURCE_MAP_JSON = "docs/lazycodex/evidence/matter-web/artifacts/people-professional-profile-source-map-2026-07-07.json";
const SOURCE_MAP_MD = "docs/lazycodex/evidence/matter-web/artifacts/people-professional-profile-source-map-2026-07-07.md";
const BROWSER_PROOF_JSON = "docs/lazycodex/evidence/matter-web/artifacts/people-professional-profile-browser-proof-2026-07-07.json";
const BROWSER_PROOF_MD = "docs/lazycodex/evidence/matter-web/artifacts/people-professional-profile-browser-proof-2026-07-07.md";
const COPY_REMOVAL_PROOF_JSON = "artifacts/manual-qa/people-profile-copy-removal-2026-07-12/runtime-result.json";
const CURRENT_PACKAGE_PROOF_JSON = "docs/lazycodex/evidence/matter-profile/2026-07-10/packaged-desktop-smoke.json";
const CURRENT_PACKAGE_SCREENSHOT = "docs/lazycodex/evidence/matter-profile/2026-07-10/profile-api-packaged.png";
const ROSTER_PATH = "docs/reorganization/client-matter-os/matter-vault-r4/launch/hrx-member-roster-source-of-truth.json";

const expectedKinds = new Map([
  ["박병준", "attorney"],
  ["임영훈", "attorney"],
  ["서지원", "attorney"],
  ["조성민", "attorney"],
  ["한제희", "attorney"],
  ["김양태", "cpa"],
  ["조우상", "deal_advisor"]
]);
const browserProofExpectedKinds = new Map([...expectedKinds].filter(([displayName]) => displayName !== "한제희"));

function read(path) {
  return readFileSync(resolve(path), "utf8");
}

function readJson(path) {
  return JSON.parse(read(path));
}

function fileExists(path) {
  return existsSync(resolve(path));
}

function textOf(value) {
  return JSON.stringify(value ?? {});
}

const sourceMap = readJson(SOURCE_MAP_JSON);
const roster = readJson(ROSTER_PATH);
const registry = read("apps/api/src/hrx-member-roster-registry.js");
const runtimeContext = read("apps/api/src/hrx-runtime-context.js");
const apiClient = read("apps/web/src/people/hrxApiClient.ts");
const employeeProfile = read("apps/web/src/people/employees/EmployeeProfile.tsx");
const styles = read("apps/web/src/styles.css");
const hrxRuntimeTest = read("apps/api/test/hrx-runtime-api.test.js");
const uiRegressionTest = read("apps/web/test/ui-regression.test.mjs");
const rosterValidator = read("scripts/validate-lcx-hrx-sft-roster-source.mjs");
const uiValidator = read("scripts/validate-hrx-ui-api-backed.mjs");

assert.equal(sourceMap.schema_version, "law-firm-os.lazycodex.people-professional-profile-source-map.v0.1");
assert.equal(sourceMap.verdict, "PASS_SOURCE_LOCK");
assert.deepEqual(sourceMap.source_urls, ["https://amic-law.vercel.app/", "https://petrabridge.vercel.app/"]);
assert.equal(sourceMap.claim_boundary.production_write, false);
assert.equal(sourceMap.claim_boundary.runtime_web_scraping, false);
assert.equal(sourceMap.claim_boundary.production_ready_claim, false);
assert.ok(fileExists(SOURCE_MAP_MD), "source map markdown missing");

const membersByName = new Map((roster.members ?? []).map((member) => [member.display_name, member]));
for (const [displayName, expectedKind] of expectedKinds) {
  const member = membersByName.get(displayName);
  assert.ok(member, `missing roster member: ${displayName}`);
  assert.equal(member.professional_profile?.profile_kind, expectedKind, `${displayName} profile kind mismatch`);
  assert.ok(Array.isArray(member.professional_profile?.source_refs) && member.professional_profile.source_refs.length > 0, `${displayName} source refs missing`);
  assert.ok(Array.isArray(member.professional_profile?.experience), `${displayName} experience missing`);
  assert.ok(Array.isArray(member.professional_profile?.education), `${displayName} education missing`);
}

assert.ok(!textOf(membersByName.get("김양태")?.professional_profile).includes("대한민국 변호사"), "김양태 must not carry attorney qualification");
assert.ok(!textOf(membersByName.get("김양태")?.professional_profile).includes("attorney"), "김양태 must not carry attorney label");
assert.ok(textOf(membersByName.get("김양태")?.professional_profile).includes("대한민국 공인회계사"), "김양태 must carry CPA qualification");
assert.ok(!textOf(membersByName.get("조우상")?.professional_profile?.qualifications).includes("공인회계사"), "조우상 must not carry unsupported CPA qualification");

const attorneyNames = Array.from(expectedKinds.entries()).filter(([, kind]) => kind === "attorney").map(([name]) => name);
assert.deepEqual(attorneyNames, ["박병준", "임영훈", "서지원", "조성민", "한제희"]);
assert.deepEqual(
  attorneyNames.map((name) => membersByName.get(name)?.professional_profile?.profile_kind),
  ["attorney", "attorney", "attorney", "attorney", "attorney"]
);
assert.equal(membersByName.get("한제희")?.work_email, "jh731@amic.kr");
assert.equal(membersByName.get("한제희")?.title, "고문변호사");
assert.equal(membersByName.get("한제희")?.start_date, "2026-07-06");
assert.equal(textOf(membersByName.get("한제희")?.professional_profile).includes("대한민국 변호사"), true);
assert.equal(textOf(membersByName.get("한제희")?.professional_profile).includes("대한민국 공인회계사"), true);

for (const member of sourceMap.profiles) {
  assert.ok(member.source_refs?.length > 0, `${member.display_name} source map refs missing`);
  assert.ok(member.profile_kind, `${member.display_name} source map kind missing`);
  assert.ok(member.field_mapping && typeof member.field_mapping === "object", `${member.display_name} field mapping missing`);
  assert.ok(Array.isArray(member.excluded_claim_refs), `${member.display_name} exclusions missing`);
}

for (const [path, content, markers] of [
  ["apps/api/src/hrx-member-roster-registry.js", registry, ["professional_profile", "objectField(member"]],
  ["apps/api/src/hrx-runtime-context.js", runtimeContext, ["professional_profile: rosterReadFields.professional_profile", "employeeRosterReadFields"]],
  ["apps/web/src/people/hrxApiClient.ts", apiClient, ["professional_profile", "fetchHrxEmployeeProfile"]],
  ["apps/web/src/people/employees/EmployeeProfile.tsx", employeeProfile, ["ProfessionalProfileSection", "data-people-professional-profile-kind={profileKind}", "주요 경력", "학력", "자격"]],
  ["apps/web/src/styles.css", styles, [".people-professional-profile", ".people-professional-list"]],
  ["apps/api/test/hrx-runtime-api.test.js", hrxRuntimeTest, ["professional_profile", "김양태", "조우상"]],
  ["apps/web/test/ui-regression.test.mjs", uiRegressionTest, ["professional_profile", "data-people-professional-profile-kind"]],
  ["scripts/validate-lcx-hrx-sft-roster-source.mjs", rosterValidator, ["professional_profile", "김양태", "조우상"]],
  ["scripts/validate-hrx-ui-api-backed.mjs", uiValidator, ["ProfessionalProfileSection", "professionalKindLabel"]]
]) {
  for (const marker of markers) assert.ok(content.includes(marker), `${path} missing marker ${marker}`);
}

for (const hiddenCopy of ['title="출처"', 'title="비고"', "권한이 없는 정보는 숨깁니다."]) {
  assert.ok(!employeeProfile.includes(hiddenCopy), `Employee profile must omit ${hiddenCopy}`);
}

const historicalBrowserProof = readJson(BROWSER_PROOF_JSON);
assert.equal(historicalBrowserProof.schema_version, "law-firm-os.lazycodex.people-professional-profile-browser-proof.v0.1");
assert.equal(historicalBrowserProof.verdict, "PASS");
assert.equal(historicalBrowserProof.claim_boundary.production_write, false);
assert.equal(historicalBrowserProof.claim_boundary.runtime_web_scraping, false);
assert.equal(historicalBrowserProof.claim_boundary.production_ready_claim, false);
assert.ok(fileExists(BROWSER_PROOF_MD), "browser proof markdown missing");
assert.equal(historicalBrowserProof.subjects.length, browserProofExpectedKinds.size);
for (const subject of historicalBrowserProof.subjects) {
  assert.equal(subject.verdict, "PASS", `${subject.display_name} browser verdict`);
  assert.equal(subject.expected_kind, browserProofExpectedKinds.get(subject.display_name), `${subject.display_name} browser kind`);
  assert.equal(fileExists(subject.screenshot), false, `${subject.display_name} obsolete historical screenshot must stay unretained`);
}
const historicalNonCopyAssertions = historicalBrowserProof.assertions.filter(
  (assertion) => !String(assertion.name).includes("UI contains 출처")
);
assert.ok(historicalNonCopyAssertions.every((assertion) => assertion.passed), "historical browser proof assertion failed");
assert.equal(historicalBrowserProof.network.api_writes.length, 0);

const copyRemovalProof = readJson(COPY_REMOVAL_PROOF_JSON);
assert.equal(copyRemovalProof.schema_version, "law-firm-os.people-profile-copy-removal.v1");
assert.equal(copyRemovalProof.verdict, "PASS");
assert.equal(copyRemovalProof.checked_profiles, 10);
assert.deepEqual(copyRemovalProof.profile_kinds, ["attorney", "cpa", "deal_advisor"]);
assert.equal(copyRemovalProof.payload_profiles_with_source_refs, 10);
assert.equal(copyRemovalProof.payload_profiles_with_source_notes, 10);
assert.deepEqual(copyRemovalProof.forbidden_copy, ["출처", "비고", "권한이 없는 정보는 숨깁니다."]);
assert.equal(copyRemovalProof.forbidden_match_count, 0);
assert.equal(fileExists(copyRemovalProof.screenshot), false, "obsolete copy-removal screenshot must stay unretained");
assert.equal(copyRemovalProof.synthetic_data, true);
assert.equal(copyRemovalProof.production_write, false);
assert.equal(copyRemovalProof.public_release_claim, false);

const currentPackageProof = readJson(CURRENT_PACKAGE_PROOF_JSON);
assert.equal(currentPackageProof.schema_version, "law-firm-os.matter-profile.packaged-desktop.v1");
assert.equal(currentPackageProof.status, "passed");
assert.equal(currentPackageProof.runtime_profile, "isolated_local_qa");
assert.equal(currentPackageProof.profile_api_state, "populated");
assert.deepEqual(currentPackageProof.profile_identity, {
  session: {
    state: "signed_in",
    user_id: "user_amic_jwsuh",
    display_name: "서지원"
  },
  rendered: {
    member_id: "emp_amic_jwsuh",
    display_name: "서지원"
  }
});
assert.equal(Object.keys(currentPackageProof.profile_contract).length, 9);
assert.equal(Object.values(currentPackageProof.profile_contract).every(Boolean), true);
assert.equal(currentPackageProof.profile_contract.generic_session_fallback_absent, true);
assert.ok(fileExists(CURRENT_PACKAGE_SCREENSHOT), "current packaged profile screenshot missing");
assert.equal(currentPackageProof.public_release, false);
assert.equal(currentPackageProof.production_go_live, false);

console.log(JSON.stringify({
  verdict: "PASS",
  source_map: SOURCE_MAP_JSON,
  historical_browser_proof: {
    path: BROWSER_PROOF_JSON,
    role: "metadata_only",
    obsolete_screenshots_retained: 0
  },
  copy_removal_proof: COPY_REMOVAL_PROOF_JSON,
  current_package_proof: CURRENT_PACKAGE_PROOF_JSON,
  current_package_screenshot: CURRENT_PACKAGE_SCREENSHOT,
  roster_source: ROSTER_PATH,
  subjects: Array.from(expectedKinds, ([display_name, profile_kind]) => ({ display_name, profile_kind })),
  production_write: false,
  production_ready_claim: false
}, null, 2));
