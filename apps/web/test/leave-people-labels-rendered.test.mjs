import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { repoRoot, startPeopleOverviewHarness } from "./people-overview-test-support.mjs";

const evidenceDir = join(repoRoot, ".omo/evidence/leave-people-labels");

function json(route, status, body) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

async function mount(page, baseUrl, url, modulePath, exportName, props = {}) {
  await page.route(`**/${url}`, (route) => route.fulfill({
    status: 200,
    contentType: "text/html; charset=utf-8",
    body: "<!doctype html><html lang=\"ko\"><body><main id=\"root\"></main></body></html>",
  }));
  await page.goto(`${baseUrl}/${url}`, { waitUntil: "networkidle" });
  await page.evaluate(async ({ modulePath, exportName, props }) => {
    const [ReactModule, ReactDomModule, pageModule] = await Promise.all([
      import("/node_modules/.vite/deps/react.js"),
      import("/node_modules/.vite/deps/react-dom_client.js"),
      import(modulePath),
    ]);
    const React = ReactModule.default ?? ReactModule;
    const ReactDom = ReactDomModule.default ?? ReactDomModule;
    const root = ReactDom.createRoot(document.getElementById("root"));
    root.render(React.createElement(pageModule[exportName], props));
  }, { modulePath, exportName, props });
}

function leaveOptions() {
  return {
    groups: [{ group_id: "annual", display_name: "연차" }],
    types: [{ leave_type_id: "annual", group_id: "annual", code: "ANNUAL", display_name: "연차", evidence_rule: {} }],
    policies: [{
      policy_version_id: "annual-v1",
      group_id: "annual",
      status: "active",
      rules: { type_rules: { annual: { usage_modes: ["full_day", "half_day", "quarter_day", "hours"] } } },
    }],
  };
}

function balance() {
  return { available_minutes: 480, used_minutes: 0 };
}

test("leave request DOM fails closed for adversarial team and approver labels while preserving Leena Kim", async () => {
  await mkdir(evidenceDir, { recursive: true });
  const harness = await startPeopleOverviewHarness();
  const page = await harness.browser.newPage({ viewport: { width: 1280, height: 900 }, locale: "ko-KR", timezoneId: "Asia/Seoul" });
  const unsafeLabels = [
    "lawyer@example.com",
    "550e8400-e29b-41d4-a716-446655440000",
    "0123456789abcdef0123456789abcdef",
    "opaque-9f2a4c7b8d1e",
    "직원 emp-substring 기록",
  ];
  try {
    await page.route("**/api/**", async (route) => {
      const request = route.request();
      const pathname = new URL(request.url()).pathname;
      if (pathname === "/api/hrx/leave/me" && request.method() === "GET") {
        return json(route, 200, {
          outcome: "ok",
          balances: [{ group: { group_id: "annual", display_name: "연차" }, balance: balance(), earliest_expiry: "2026-12-31" }],
          requests: [],
        });
      }
      if (pathname === "/api/hrx/leave/types/active" && request.method() === "GET") return json(route, 200, leaveOptions());
      if (pathname === "/api/hrx/leave/me/evidence-documents" && request.method() === "GET") return json(route, 200, { outcome: "ok", documents: [] });
      if (pathname === "/api/hrx/leave/team" && request.method() === "GET") {
        return json(route, 200, {
          outcome: "ok",
          employees: [
            { employee_id: "emp-email", display_name: "lawyer@example.com", balances: [{ available_minutes: 240 }] },
            { employee_id: "emp-uuid", display_name: "550e8400-e29b-41d4-a716-446655440000", balances: [{ available_minutes: 120 }] },
            { employee_id: "lee", display_name: "Leena Kim", balances: [{ available_minutes: 480 }] },
          ],
          absences: [
            { employee_id: "emp-hex", employee_display_name: "0123456789abcdef0123456789abcdef", start_date: "2026-08-03", end_date: "2026-08-03" },
            { employee_id: "emp-opaque", employee_display_name: "opaque-9f2a4c7b8d1e", start_date: "2026-08-04", end_date: "2026-08-04" },
            { employee_id: "emp-substring", employee_display_name: "직원 emp-substring 기록", start_date: "2026-08-05", end_date: "2026-08-05" },
            { employee_id: "lee", employee_display_name: "Leena Kim", start_date: "2026-08-06", end_date: "2026-08-06" },
          ],
          today_absence_count: 0,
          pending_approval_count: 0,
        });
      }
      if (pathname === "/api/hrx/leave/me/preview" && request.method() === "POST") {
        return json(route, 200, {
          outcome: "previewed",
          preview: {
            schedule: { requested_minutes: 480, included_dates: ["2026-08-03"], non_working_dates: [], segments: [] },
            economics: { deduction_minutes: 480, paid_minutes: 480, unpaid_minutes: 0 },
            available_after_minutes: 0,
            approval_plan: { approver: { actor_id: "actor-uuid", display_name: "550e8400-e29b-41d4-a716-446655440000" }, step_count: 1 },
            allocations: [{ expires_on: "2026-12-31", amount_minutes: 480 }],
          },
        });
      }
      return json(route, 200, { outcome: "ok" });
    });
    await mount(page, harness.baseUrl, "__leave_request_labels__.html", "/src/people/leave/LeaveRequestPage.tsx", "LeaveRequestPage", { canViewTeam: true });
    const panel = page.locator("#people-leave");
    const team = panel.getByRole("region", { name: "팀 휴가" });
    await team.waitFor();
    const teamText = await team.innerText();
    for (const unsafe of unsafeLabels) assert.doesNotMatch(teamText, new RegExp(unsafe.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")));
    assert.match(teamText, /Leena Kim/);
    assert.doesNotMatch(teamText, /\blee\b/);

    const form = panel.locator(".leave-self-request-form");
    await form.getByLabel("시작일").fill("2026-08-03");
    await form.getByLabel("종료일").fill("2026-08-03");
    await form.getByRole("button", { name: "차감 미리보기", exact: true }).click();
    const preview = panel.locator('[data-leave-preview="ready"]');
    await preview.waitFor();
    assert.equal(await preview.locator("strong").nth(1).innerText(), "지정 승인자");
    const panelText = await panel.innerText();
    for (const unsafe of unsafeLabels) assert.doesNotMatch(panelText, new RegExp(unsafe.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")));
    assert.match(panelText, /Leena Kim/);

    const screenshot = join(evidenceDir, "leave-request-labels.png");
    await page.screenshot({ path: screenshot, fullPage: true });
    await writeFile(join(evidenceDir, "leave-request-labels.json"), `${JSON.stringify({
      schema_version: "law-firm-os.people.leave-request-labels-web-proof.v1",
      captured_at: new Date().toISOString(),
      invocation: "node --test apps/web/test/leave-people-labels-rendered.test.mjs",
      scenario: "LeaveRequestPage team region and deduction preview with email, UUID, 32-hex, opaque, embedded-ID, and valid Leena Kim labels",
      aria_region: "팀 휴가",
      displayed_safe_label: "Leena Kim",
      displayed_unsafe_fallback: "지정 승인자",
      raw_identifiers_visible: false,
      screenshot,
    }, null, 2)}\n`, "utf8");
  } finally {
    await page.close();
    await harness.close();
  }
});

test("leave approval DOM and ARIA labels fail closed for request, candidate, and delegate identities", async () => {
  await mkdir(evidenceDir, { recursive: true });
  const harness = await startPeopleOverviewHarness();
  const page = await harness.browser.newPage({ viewport: { width: 1280, height: 900 }, locale: "ko-KR", timezoneId: "Asia/Seoul" });
  const unsafeLabels = [
    "lawyer@example.com",
    "550e8400-e29b-41d4-a716-446655440000",
    "opaque-9f2a4c7b8d1e",
  ];
  try {
    await page.route("**/api/**", async (route) => {
      const request = route.request();
      const pathname = new URL(request.url()).pathname;
      if (pathname === "/api/hrx/leave/requests" && request.method() === "GET") {
        return json(route, 200, {
          outcome: "ok",
          approvals: [{
            object_id: "request-unsafe",
            leave_request: {
              request_id: "request-unsafe",
              employee_id: "emp-request-uuid",
              employee_display_name: "550e8400-e29b-41d4-a716-446655440000",
              leave_type_display_name: "연차",
              start_date: "2026-08-03",
              end_date: "2026-08-03",
              requested_minutes: 480,
              current_balance: { available_minutes: 960 },
              team_simultaneous_absence_count: 0,
              statutory_annual: false,
              attachments: [],
            },
          }],
        });
      }
      if (pathname === "/api/hrx/leave/delegations" && request.method() === "GET") {
        return json(route, 200, {
          outcome: "ok",
          delegations: [
            { delegation_id: "delegation-unsafe", delegate_actor_id: "actor-opaque", state: "active", valid_from: "2026-08-01T00:00:00.000Z", valid_to: "2026-08-08T00:00:00.000Z", delegate: { actor_id: "actor-opaque", display_name: "opaque-9f2a4c7b8d1e" } },
            { delegation_id: "delegation-safe", delegate_actor_id: "lee", state: "scheduled", valid_from: "2026-08-09T00:00:00.000Z", valid_to: "2026-08-10T00:00:00.000Z", delegate: { actor_id: "lee", display_name: "Leena Kim" } },
          ],
        });
      }
      if (pathname === "/api/hrx/leave/delegations/candidates" && request.method() === "GET") {
        return json(route, 200, {
          outcome: "ok",
          candidates: [
            { actor_id: "actor-email", display_name: "lawyer@example.com", source_title: "변호사" },
            { actor_id: "lee", display_name: "Leena Kim", source_title: "파트너" },
          ],
        });
      }
      return json(route, 200, { outcome: "ok" });
    });
    await mount(page, harness.baseUrl, "__leave_approval_labels__.html", "/src/people/leave/LeaveApprovalQueue.tsx", "LeaveApprovalQueue");
    const panel = page.locator("#people-leave-requests");
    const delegationRegion = panel.getByRole("region", { name: "위임 관리" });
    await delegationRegion.waitFor();
    await delegationRegion.getByLabel("위임받을 승인자").waitFor();
    const panelText = await panel.innerText();
    for (const unsafe of unsafeLabels) assert.doesNotMatch(panelText, new RegExp(unsafe.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")));
    assert.match(panelText, /구성원 이름 확인 필요/);
    assert.match(panelText, /Leena Kim/);
    assert.doesNotMatch(panelText, /\blee\b/);

    const candidateSelect = delegationRegion.getByLabel("위임받을 승인자");
    const optionText = await candidateSelect.locator("option").allTextContents();
    assert.ok(optionText.some((label) => label.includes("승인자")));
    assert.ok(optionText.some((label) => label.includes("Leena Kim")));
    assert.equal(optionText.some((label) => label.includes("lawyer@example.com")), false);

    const screenshot = join(evidenceDir, "leave-approval-labels.png");
    await page.screenshot({ path: screenshot, fullPage: true });
    await writeFile(join(evidenceDir, "leave-approval-labels.json"), `${JSON.stringify({
      schema_version: "law-firm-os.people.leave-approval-labels-web-proof.v1",
      captured_at: new Date().toISOString(),
      invocation: "node --test apps/web/test/leave-people-labels-rendered.test.mjs",
      scenario: "LeaveApprovalQueue request summary, delegation candidates, and active delegation with email, UUID, and opaque labels",
      aria_region: "위임 관리",
      displayed_safe_label: "Leena Kim",
      displayed_unsafe_fallbacks: ["구성원 이름 확인 필요", "승인자"],
      raw_identifiers_visible: false,
      screenshot,
    }, null, 2)}\n`, "utf8");
  } finally {
    await page.close();
    await harness.close();
  }
});
