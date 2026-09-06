import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import {
  openPeopleManagementPage,
  startPeopleManagementHarness,
} from "./people-management-test-support.mjs";
import { repoRoot } from "./people-overview-test-support.mjs";

const FALLBACK = "구성원 이름 확인 필요";
const SYNTHETIC_PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
const unsafeLabels = [
  "person@example.com",
  "550e8400-e29b-41d4-a716-446655440000",
  "0123456789abcdef0123456789abcdef",
  "opaque-9f2a4c7b8d1e",
  "emp-equal",
];

const employees = [
  ...unsafeLabels.map((display_name, index) => ({
    employee_id: `emp-${["email", "uuid", "hex", "opaque", "equal"][index]}`,
    user_id: `user-${index}`,
    display_name,
    work_email: `member-${index}@example.test`,
    mobile_phone: `010-0000-000${index}`,
    status: "active",
    department: "송무",
    title: "변호사",
  })),
  {
    employee_id: "lee",
    user_id: "user-lee",
    display_name: "Leena Kim",
    photo_url: "/api/hrx/employees/lee/photo",
    work_email: "leena@example.test",
    mobile_phone: "010-0000-0010",
    status: "active",
    department: "자문",
    title: "파트너 변호사",
  },
  {
    employee_id: "manager-001",
    user_id: "user-manager-001",
    display_name: "Manager Kim",
    work_email: "manager@example.test",
    mobile_phone: "010-0000-0011",
    status: "active",
    department: "경영지원",
    title: "관리자",
  },
];

const lifecycleRows = (kind) => [
  {
    [`${kind}_id`]: `${kind}-email`,
    employee_id: "emp-email",
    employee_display_name: unsafeLabels[0],
    state: "open",
  },
  {
    [`${kind}_id`]: `${kind}-uuid`,
    employee_id: "emp-uuid",
    employee_display_name: unsafeLabels[1],
    state: "open",
  },
  {
    [`${kind}_id`]: `${kind}-lee`,
    employee_id: "lee",
    employee_display_name: "Leena Kim",
    state: "open",
  },
];

function json(route, body, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

function profileResponse(managerDisplayName = "Manager Kim") {
  return {
    outcome: "ok",
    employee: {
      ...employees.find((employee) => employee.employee_id === "lee"),
      manager_employee_id: "manager-001",
      manager_user_id: "user-manager-001",
      manager_display_name: managerDisplayName,
      affiliation: "AMIC Law",
      organization_group: "Firm Leadership",
    },
    employment_profile: {
      title: "파트너 변호사",
      employment_type: "full_time",
      status: "active",
    },
    professional_profile: null,
    masked_compensation_ref: "masked_ref_secret_lee",
  };
}

function compensationResponse() {
  return {
    outcome: "ok",
    payroll_runtime_opened: true,
    masked_compensation_ref: "masked_ref_secret_lee",
    compensation_records: [{
      compensation_id: "comp-lee-2026",
      employee_id: "lee",
      masked_compensation_ref: "masked_ref_secret_lee",
      employment_contract_id: "contract_secret_lee",
      contract_document_ref: "vault_secret_lee",
      effective_from: "2026-01-01",
      effective_to: null,
    }],
  };
}

async function installAdversarialRoutes(page, { managerDisplayName = "Manager Kim" } = {}) {
  const managerState = { value: managerDisplayName };
  await page.route("**/api/hrx/**", async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    if (pathname === "/api/hrx/employees/lee/photo" && request.method() === "GET") {
      return route.fulfill({ status: 200, contentType: "image/png", body: SYNTHETIC_PNG,
        headers: { "cache-control": "private, no-store", "x-content-type-options": "nosniff" } });
    }
    if (pathname === "/api/hrx/employees" && request.method() === "GET") {
      return json(route, { outcome: "ok", employees });
    }
    if (pathname === "/api/hrx/lifecycle/onboarding" && request.method() === "GET") {
      return json(route, { outcome: "ok", onboarding: lifecycleRows("onboarding") });
    }
    if (pathname === "/api/hrx/lifecycle/offboarding" && request.method() === "GET") {
      return json(route, { outcome: "ok", offboarding: lifecycleRows("offboarding") });
    }
    if (pathname === "/api/hrx/org-chart" && request.method() === "GET") {
      return json(route, {
        outcome: "ok",
        org_units: [],
        employees: [],
        reporting_lines: [],
        change_events: [],
        scheduled_changes: [],
      });
    }
    if (pathname === "/api/hrx/employees/lee" && request.method() === "GET") {
      return json(route, profileResponse(managerState.value));
    }
    if (pathname === "/api/hrx/compensation" && request.method() === "GET") {
      return json(route, compensationResponse());
    }
    return route.fallback();
  });
  return {
    setManagerDisplayName(value) {
      managerState.value = value;
    },
  };
}

function assertNoUnsafeLabel(text) {
  for (const label of unsafeLabels) {
    assert.equal(text.includes(label), false, `unsafe label leaked: ${label}`);
  }
}

test("People directory renders safe active, onboarding, offboarding, and edit labels while retaining contact columns", async () => {
  const harness = await startPeopleManagementHarness();
  const evidenceDir = join(repoRoot, ".omo/evidence/people-directory-profile-labels-rendered");
  await mkdir(evidenceDir, { recursive: true });
  const screenshotPath = join(evidenceDir, "directory-labels.png");
  const artifactPath = join(evidenceDir, "directory-labels.json");
  try {
    const { page } = await openPeopleManagementPage({ ...harness, section: "people-members" });
    try {
      await installAdversarialRoutes(page);
      await page.reload({ waitUntil: "networkidle" });
      const directory = page.locator('[data-hr-workforce-table="true"]');
      await directory.waitFor();
      const bodyText = await directory.innerText();
      assertNoUnsafeLabel(bodyText);
      assert.match(bodyText, /Leena Kim/);
      assert.match(bodyText, /member-0@example\.test/);
      assert.match(bodyText, /010-0000-0000/);
      assert.equal(await directory.getByRole("button", { name: FALLBACK, exact: true }).count(), unsafeLabels.length);
      assert.equal(await directory.getByRole("button", { name: `${FALLBACK} 수정`, exact: true }).count(), unsafeLabels.length);
      assert.equal(await directory.getByRole("button", { name: "person@example.com 수정", exact: true }).count(), 0);
      const photo = directory.getByRole("button", { name: "Leena Kim", exact: true }).locator("img");
      assert.equal(await photo.getAttribute("src"), `data:image/png;base64,${SYNTHETIC_PNG.toString("base64")}`);
      assert.equal(await photo.evaluate(image => image.complete && image.naturalWidth > 0), true);
      assert.equal(await directory.getByRole("button", { name: "Manager Kim", exact: true }).locator("img").count(), 0);
      await page.screenshot({ path: join(evidenceDir, "directory-authenticated-photo.png"), fullPage: true });

      await directory.getByRole("button", { name: "입사예정", exact: true }).click();
      const onboarding = page.locator('[data-hr-workforce-table="true"]');
      await onboarding.getByText(FALLBACK, { exact: true }).first().waitFor();
      const onboardingText = await onboarding.innerText();
      assertNoUnsafeLabel(onboardingText);
      assert.match(onboardingText, /Leena Kim/);

      await onboarding.getByRole("button", { name: "퇴사예정", exact: true }).click();
      const offboardingText = await onboarding.innerText();
      assertNoUnsafeLabel(offboardingText);
      assert.match(offboardingText, /Leena Kim/);

      await page.screenshot({ path: screenshotPath, fullPage: true });
      const screenshotSha256 = createHash("sha256").update(await readFile(screenshotPath)).digest("hex");
      await writeFile(artifactPath, `${JSON.stringify({
        scenario: "active/onboarding/offboarding adversarial employee labels with ARIA edit labels",
        unsafe_labels_replaced: true,
        legitimate_leena_kim_preserved: true,
        contact_and_work_email_preserved: true,
        screenshot: { path: screenshotPath, sha256: screenshotSha256 },
      }, null, 2)}\n`);
    } finally {
      await page.close();
    }
  } finally {
    await harness.close();
  }
});

test("Employee profile renders safe member and manager labels and compensation presence copy without raw refs", async () => {
  const harness = await startPeopleManagementHarness();
  const evidenceDir = join(repoRoot, ".omo/evidence/people-directory-profile-labels-rendered");
  await mkdir(evidenceDir, { recursive: true });
  const screenshotPath = join(evidenceDir, "profile-labels.png");
  const artifactPath = join(evidenceDir, "profile-labels.json");
  try {
    const { page } = await openPeopleManagementPage({ ...harness, section: "people-members" });
    try {
      const routes = await installAdversarialRoutes(page);
      await page.reload({ waitUntil: "networkidle" });
      const directory = page.locator('[data-hr-workforce-table="true"]');
      await directory.getByRole("button", { name: "Leena Kim", exact: true }).click();
      const detailPanel = page.locator('[data-people-detail-panel="open"]');
      await detailPanel.waitFor();
      await detailPanel.getByRole("tab", { name: "프로필", exact: true }).click();
      const profile = detailPanel.locator("#people-profile");
      await profile.waitFor();
      await profile.getByText("Leena Kim", { exact: true }).waitFor();
      const profileText = await profile.innerText();
      assert.match(profileText, /Leena Kim/);
      assert.match(profileText, /Manager Kim/);
      assert.match(profileText, /급여 금액 비공개/);
      assert.match(profileText, /계약 정보 등록됨/);
      assert.match(profileText, /보상 문서 보관됨/);
      assert.doesNotMatch(profileText, /masked_ref_secret_lee|contract_secret_lee|vault_secret_lee/);

      routes.setManagerDisplayName("manager@example.com");
      await page.reload({ waitUntil: "networkidle" });
      const reloadedProfile = page.locator('[data-people-detail-panel="open"] #people-profile');
      await reloadedProfile.locator(".property").filter({ hasText: "상사" }).getByText("없음", { exact: true }).waitFor();
      const unsafeManagerText = await reloadedProfile.innerText();
      assert.doesNotMatch(unsafeManagerText, /manager@example\.com/);

      await page.screenshot({ path: screenshotPath, fullPage: true });
      const screenshotSha256 = createHash("sha256").update(await readFile(screenshotPath)).digest("hex");
      await writeFile(artifactPath, `${JSON.stringify({
        scenario: "Leena Kim profile with manager and masked compensation references",
        member_label: "Leena Kim",
        manager_label: "Manager Kim",
        compensation_presence_copy: ["급여 금액 비공개", "계약 정보 등록됨", "보상 문서 보관됨"],
        raw_compensation_refs_absent: true,
        screenshot: { path: screenshotPath, sha256: screenshotSha256 },
      }, null, 2)}\n`);
    } finally {
      await page.close();
    }
  } finally {
    await harness.close();
  }
});
