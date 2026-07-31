import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import {
  repoRoot,
  startPeopleOverviewHarness,
} from "./people-overview-test-support.mjs";

const SESSION_SCHEMA = "law-firm-os.desktop-web-session-envelope.v0.1";
const FALLBACK = "구성원 이름 확인 필요";
const unsafeLabels = [
  "person@example.com",
  "550e8400-e29b-41d4-a716-446655440000",
  "0123456789abcdef0123456789abcdef",
  "opaque-9f2a4c7b8d1e",
  "employee-opaque-42",
];
const safeEmployee = {
  employee_id: "lee",
  employee_display_name: "Leena Kim",
};

function json(route, status, body) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

function leaveTypes() {
  return {
    outcome: "ok",
    groups: [{ group_id: "annual", code: "PAID_TIME", display_name: "연차", status: "active" }],
    types: [{ leave_type_id: "annual-standard", group_id: "annual", code: "ANNUAL", display_name: "연차", status: "active" }],
    policies: [{ policy_version_id: "annual-2026-v1", group_id: "annual", policy_code: "ANNUAL-2026", version: 1, status: "active" }],
  };
}

function promotionWorkspace() {
  const recipients = unsafeLabels.map((employee_display_name, index) => ({
    recipient_id: `recipient-label-${index}`,
    employee_id: `employee-label-${index}`,
    employee_display_name,
    document_id: `document-label-${index}`,
    first_delivery_state: "delivered",
    second_delivery_state: "not_created",
    state: "first_notice_issued",
    unused_days: 5,
    responded_at: null,
    evidence_receipts: [],
  }));
  recipients.push({
    recipient_id: "recipient-lee",
    ...safeEmployee,
    document_id: "document-lee",
    first_delivery_state: "delivered",
    second_delivery_state: "not_created",
    state: "first_notice_issued",
    unused_days: 5,
    responded_at: null,
    evidence_receipts: [],
  });
  return {
    outcome: "ok",
    campaigns: [{
      campaign_id: "campaign-labels",
      reference_date: "2026-07-31",
      target_count: recipients.length,
      recipients,
    }],
    schedule_profiles: [{ id: "schedule-standard", label: "표준 일정" }],
    policies: [{ policy_version_id: "annual-2026-v1", policy_code: "ANNUAL-2026", version: 1 }],
  };
}

function promotionPreview() {
  const targets = unsafeLabels.map((employee_display_name, index) => ({
    employee_id: `employee-label-${index}`,
    employee_display_name,
    unused_days: 5,
    reserved_minutes: 0,
    released_minutes: 0,
    expired_minutes: 0,
  }));
  targets.push({
    ...safeEmployee,
    unused_days: 5,
    reserved_minutes: 0,
    released_minutes: 0,
    expired_minutes: 0,
  });
  return {
    target_count: targets.length,
    targets,
    legal_schedule: {
      first_notice_window_start: "2026-07-31",
      first_notice_deadline_at: "2026-08-01T09:00:00+09:00",
      second_notice_deadline_at: "2026-08-15T09:00:00+09:00",
      employee_response_days: 5,
    },
  };
}

function terminationWorkspace() {
  const candidates = unsafeLabels.map((employee_display_name, index) => ({
    offboarding_id: `offboarding-label-${index}`,
    employee_id: `employee-label-${index}`,
    employee_display_name,
    termination_date: "2026-08-31",
  }));
  candidates.push({
    offboarding_id: "offboarding-lee",
    ...safeEmployee,
    termination_date: "2026-08-31",
  });
  return {
    candidates,
    approvers: [],
    reconciliations: unsafeLabels.map((employee_display_name, index) => ({
      reconciliation_id: `reconciliation-label-${index}`,
      created_at: "2026-07-31T09:00:00+09:00",
      termination_date: "2026-08-31",
      mode: "preview",
      state: "previewed",
      result: { employee_id: `employee-label-${index}`, employee_display_name },
    })).concat([{
      reconciliation_id: "reconciliation-lee",
      created_at: "2026-07-31T09:00:00+09:00",
      termination_date: "2026-08-31",
      mode: "preview",
      state: "previewed",
      result: { ...safeEmployee },
    }]),
  };
}

async function openAdversarialPage({ browser, baseUrl, section, scopes, state }) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.addInitScript(({ schemaVersion, grantedScopes }) => {
    window.__LAWOS_SESSION_CONTEXT__ = {
      schema_version: schemaVersion,
      state: "signed_in",
      session_ref: "session:leave-labels",
      source: "browser_receipt",
      actor_ref: "actor-leave-labels",
      tenant_refs: { default: "tenant-leave-labels" },
      role_ids: ["employee"],
      scopes: grantedScopes,
      review_state: "allow",
      expires_at: "2030-01-01T00:00:00.000Z",
    };
  }, { schemaVersion: SESSION_SCHEMA, grantedScopes: scopes });
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    const method = request.method();
    if (pathname === "/api/hrx/leave/me" && method === "GET") {
      return json(route, 200, { outcome: "ok", employee_id: "emp-1", balances: [], requests: [] });
    }
    if (pathname === "/api/hrx/leave/types/active" && method === "GET") return json(route, 200, leaveTypes());
    if (pathname === "/api/hrx/leave/promotion-campaigns" && method === "GET") return json(route, 200, state.promotionWorkspace);
    if (pathname === "/api/hrx/leave/promotion-campaigns/preview" && method === "POST") return json(route, 200, { outcome: "ok", preview: state.promotionPreview });
    if (pathname === "/api/hrx/leave/termination-reconciliations/candidates" && method === "GET") return json(route, 200, { outcome: "ok", candidates: state.terminationWorkspace.candidates });
    if (pathname === "/api/hrx/leave/termination-reconciliations/approvers" && method === "GET") return json(route, 200, { outcome: "ok", approvers: [] });
    if (pathname === "/api/hrx/leave/termination-reconciliations" && method === "GET") return json(route, 200, { outcome: "ok", reconciliations: state.terminationWorkspace.reconciliations });
    return json(route, 200, {});
  });
  await page.goto(`${baseUrl}/?view=people&ctx=allow#${section}`, { waitUntil: "networkidle" });
  await page.locator("#people-home").waitFor();
  return page;
}

function assertLabelsHidden(visibleText) {
  for (const label of unsafeLabels) assert.equal(visibleText.includes(label), false, `unsafe label leaked: ${label}`);
  for (const label of unsafeLabels) assert.equal(visibleText.includes(label.split(" ")[0]), false);
  assert.match(visibleText, new RegExp(FALLBACK));
  assert.match(visibleText, /Leena Kim/);
}

test("leave employee labels fail closed in rendered text and accessible names", async () => {
  const harness = await startPeopleOverviewHarness();
  const evidenceDir = join(repoRoot, ".omo/evidence/leave-employee-labels-rendered");
  await mkdir(evidenceDir, { recursive: true });
  const state = {
    promotionWorkspace: promotionWorkspace(),
    promotionPreview: promotionPreview(),
    terminationWorkspace: terminationWorkspace(),
  };
  try {
    const promotion = await openAdversarialPage({
      ...harness,
      section: "people-annual-leave-notices",
      scopes: ["hrx.leave.promotion.manage"],
      state,
    });
    const promotionPanel = promotion.locator("#people-annual-leave-notices");
    await promotionPanel.locator("tbody tr").first().waitFor();
    assertLabelsHidden(await promotionPanel.innerText());
    assert.equal(await promotionPanel.getByRole("checkbox", { name: `${FALLBACK} 선택`, exact: true }).count(), unsafeLabels.length);
    await promotionPanel.locator('[data-promotion-recipient-id="recipient-label-0"]').getByRole("button", { name: "처리", exact: true }).click();
    await promotionPanel.getByLabel(`${FALLBACK} 사용 희망일`, { exact: true }).waitFor();
    await promotionPanel.getByRole("button", { name: "대상 미리보기", exact: true }).click();
    await promotionPanel.locator('[data-leave-promotion-preview="true"]').waitFor();
    assertLabelsHidden(await promotionPanel.innerText());
    await promotion.screenshot({ path: join(evidenceDir, "promotion-labels.png"), fullPage: true });
    await promotion.close();

    const termination = await openAdversarialPage({
      ...harness,
      section: "people-leave-termination",
      scopes: ["hrx.leave.termination.settle"],
      state,
    });
    const terminationPanel = termination.locator("#people-leave-termination");
    await terminationPanel.locator("select").waitFor();
    assertLabelsHidden(await terminationPanel.innerText());
    assert.equal(await terminationPanel.locator("select option", { hasText: FALLBACK }).count(), unsafeLabels.length);
    await termination.screenshot({ path: join(evidenceDir, "termination-labels.png"), fullPage: true });
    await termination.close();
  } finally {
    await harness.close();
  }
});
