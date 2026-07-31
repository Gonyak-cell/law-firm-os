import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { repoRoot, startPeopleOverviewHarness } from "./people-overview-test-support.mjs";

const evidenceDir = join(repoRoot, ".omo/evidence/legal-people-labels-rendered");
const unsafeLabels = [
  "lawyer@example.com",
  "550e8400-e29b-41d4-a716-446655440000",
  "0123456789abcdef0123456789abcdef",
  "opaque-9f2a4c7b8d1e",
  "reviewer_role-42",
];

function json(route, body, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

async function mount(page, baseUrl) {
  await page.route("**/__legal_people_labels__.html", (route) => route.fulfill({
    status: 200,
    contentType: "text/html; charset=utf-8",
    body: "<!doctype html><html lang=\"ko\"><body><main id=\"root\"></main></body></html>",
  }));
  await page.goto(`${baseUrl}/__legal_people_labels__.html`, { waitUntil: "networkidle" });
  await page.evaluate(async () => {
    const [ReactModule, ReactDomModule, workspaceModule] = await Promise.all([
      import("/node_modules/.vite/deps/react.js"),
      import("/node_modules/.vite/deps/react-dom_client.js"),
      import("/src/people/legal/LegalPeopleWorkspace.tsx"),
    ]);
    const React = ReactModule.default ?? ReactModule;
    const ReactDom = ReactDomModule.default ?? ReactDomModule;
    const root = ReactDom.createRoot(document.getElementById("root"));
    root.render(React.createElement(workspaceModule.LegalPeopleWorkspace, { mode: "conflicts" }));
  });
}

function legalPeopleFixture() {
  const people = [
    {
      person_id: "person-lee",
      display_name: "Leena Kim",
      korean_label: "내부 변호사",
      type_id: "internal_lawyer",
      organization_id: "org-lee",
      organization_label: "LCX Litigation Group",
      primary_role: "Responsible attorney",
      status: "active",
      permission_summary: { sensitive_fields_visible: false },
    },
    {
      person_id: "person-email",
      display_name: "lawyer@example.com",
      korean_label: "내부 변호사",
      type_id: "internal_lawyer",
      organization_id: "org-email",
      organization_label: "lawyer@example.com",
      primary_role: "internal_role-42",
      status: "active",
      permission_summary: { sensitive_fields_visible: false },
    },
    {
      person_id: "person-uuid",
      display_name: "550e8400-e29b-41d4-a716-446655440000",
      korean_label: "internal_type-42",
      type_id: "internal_lawyer",
      organization_id: "org-uuid",
      organization_label: "550e8400-e29b-41d4-a716-446655440000",
      primary_role: "550e8400-e29b-41d4-a716-446655440000",
      status: "active",
      permission_summary: { sensitive_fields_visible: false },
    },
    {
      person_id: "person-hex",
      display_name: "0123456789abcdef0123456789abcdef",
      korean_label: "내부 변호사",
      type_id: "internal_lawyer",
      organization_id: "org-hex",
      organization_label: "0123456789abcdef0123456789abcdef",
      primary_role: "opaque-9f2a4c7b8d1e",
      status: "active",
      permission_summary: { sensitive_fields_visible: false },
    },
    {
      person_id: "person-opaque",
      display_name: "opaque-9f2a4c7b8d1e",
      korean_label: "내부 변호사",
      type_id: "internal_lawyer",
      organization_id: "org-opaque",
      organization_label: "opaque-9f2a4c7b8d1e",
      primary_role: "reviewer_role-42",
      status: "active",
      permission_summary: { sensitive_fields_visible: false },
    },
  ];
  return {
    search: {
      outcome: "ok",
      people,
      facets: {},
    },
    detail: {
      outcome: "ok",
      person: people[0],
      clients: [{ client_id: "client-550e8400-e29b-41d4-a716-446655440000", display_label: "LCX Client" }],
      matters: [{ matter_id: "matter-0123456789abcdef0123456789abcdef", display_label: "LCX Litigation Matter" }],
      relationships: [
        {
          relationship_id: "relationship-restricted",
          relationship_type: "person_to_client_contact",
          target_type: "client",
          target_id: "lawyer@example.com",
          status: "review_required",
          review_required: true,
          access_state: "restricted",
        },
        {
          relationship_id: "relationship-visible",
          relationship_type: "opaque_relationship-42",
          target_type: "matter",
          target_id: "550e8400-e29b-41d4-a716-446655440000",
          status: "active",
          review_required: false,
          access_state: "visible",
        },
      ],
      conflict_references: [],
      ethical_wall_references: [],
      audit_summary: { event_count: 2 },
    },
    relationships: {
      outcome: "ok",
      relationships: [],
      relationships_grouped: {},
    },
    ethics: {
      outcome: "ok",
      review_queue: [{
        review_item_id: "review-item-opaque",
        review_type: "conflict_check",
        related_ref: "matter:550e8400-e29b-41d4-a716-446655440000",
        reviewer_role_required: "conflicts_reviewer",
        state: "pending_review",
        priority: "high",
        ai_final_decision_allowed: false,
      }],
      ethical_walls: [{
        wall_ref_id: "wall-opaque",
        wall_status: "blocked",
        matter_id: "matter-0123456789abcdef0123456789abcdef",
        reason_code: "opaque-reason-42",
        access_effect: "blocked",
        reviewer_receipt_id: "receipt-opaque",
      }],
      reviewer_receipts: [{
        receipt_id: "receipt-opaque",
        review_item_id: "review-item-opaque",
        reviewer_role: "conflicts_reviewer",
        decision: "opaque-decision-42",
        rollback_ref: null,
        ai_final_decision_allowed: false,
        access_state: "restricted",
      }],
    },
  };
}

test("legal People workspace fails closed for person and record labels while preserving Leena Kim", async () => {
  await mkdir(evidenceDir, { recursive: true });
  const harness = await startPeopleOverviewHarness();
  const page = await harness.browser.newPage({ viewport: { width: 1440, height: 1100 }, locale: "ko-KR", timezoneId: "Asia/Seoul" });
  const fixture = legalPeopleFixture();
  const requestUrls = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/hrx/legal-people/")) requestUrls.push(request.url());
  });
  try {
    await page.route("**/api/**", async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.pathname === "/api/hrx/legal-people/search") return json(route, fixture.search);
      if (url.pathname === "/api/hrx/legal-people/relationships") return json(route, fixture.relationships);
      if (url.pathname === "/api/hrx/legal-people/ethics") return json(route, fixture.ethics);
      if (url.pathname === "/api/hrx/legal-people/person-lee") return json(route, fixture.detail);
      return json(route, { outcome: "ok" });
    });
    await mount(page, harness.baseUrl);
    const workspace = page.locator(".legal-people-runtime-grid");
    await workspace.getByText("Leena Kim", { exact: true }).first().waitFor();
    await workspace.getByText("권한 제한", { exact: true }).waitFor();
    await workspace.getByText("이해상충 검토자", { exact: false }).first().waitFor();
    await workspace.getByText("보호 사유 확인 필요", { exact: false }).first().waitFor();

    const visibleText = await workspace.innerText();
    const accessibleText = await workspace.evaluate((element) => (
      [...element.querySelectorAll("[aria-label], [title]")]
        .flatMap((node) => [node.getAttribute("aria-label"), node.getAttribute("title")])
        .filter(Boolean)
        .join("\n")
    ));
    for (const unsafe of unsafeLabels) {
      assert.doesNotMatch(visibleText, new RegExp(unsafe.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")));
      assert.doesNotMatch(accessibleText, new RegExp(unsafe.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")));
    }
    assert.match(visibleText, /Leena Kim/);
    assert.match(visibleText, /구성원 이름 확인 필요/);
    assert.match(visibleText, /Client 기록|Matter 기록/);
    assert.match(visibleText, /사람 검토/);
    assert.equal(await workspace.getByText("lawyer@example.com", { exact: true }).count(), 0);
    assert.equal(await workspace.getByText("550e8400-e29b-41d4-a716-446655440000", { exact: true }).count(), 0);
    assert.equal(await workspace.getByText("0123456789abcdef0123456789abcdef", { exact: true }).count(), 0);
    assert.equal(await workspace.getByText("opaque-9f2a4c7b8d1e", { exact: true }).count(), 0);
    assert.ok(requestUrls.some((url) => url.includes("/api/hrx/legal-people/person-lee")), "selected person id remains in the detail request");

    const screenshotPath = join(evidenceDir, "legal-people-labels-rendered.png");
    await page.screenshot({ path: screenshotPath, fullPage: true });
    const screenshotSha256 = createHash("sha256").update(await readFile(screenshotPath)).digest("hex");
    const evidencePath = join(evidenceDir, "legal-people-labels-rendered.json");
    await writeFile(evidencePath, `${JSON.stringify({
      schema_version: "law-firm-os.people.legal-people-labels-rendered-evidence.v1",
      invocation: "node --test apps/web/test/legal-people-labels-rendered.test.mjs",
      scenario: "conflicts workspace with email, UUID, 32-hex, opaque person and record references plus legitimate Leena Kim",
      observables: {
        unsafe_visible_labels_replaced: true,
        unsafe_aria_or_title_labels_absent: true,
        legitimate_leena_kim_preserved: true,
        relationship_ids_preserved_in_request: true,
        permission_redaction_label_preserved: true,
      },
      screenshot: { path: screenshotPath, sha256: screenshotSha256 },
    }, null, 2)}\n`, "utf8");
  } finally {
    await page.close();
    await harness.close();
  }
});
