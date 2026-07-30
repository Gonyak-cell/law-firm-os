import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { createServer as createNetServer } from "node:net";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { chromium } from "playwright";
import { createServer } from "vite";

const testDir = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(testDir, "..");

async function availablePort() {
  return new Promise((resolvePort, rejectPort) => {
    const server = createNetServer();
    server.once("error", rejectPort);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close(() => resolvePort(port));
    });
  });
}

function respond(route, body, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json; charset=utf-8",
    body: JSON.stringify(body)
  });
}

function collection(requestId, items, extra = {}) {
  return {
    request_id: requestId,
    outcome: "passed",
    ui_state: items.length ? null : "empty",
    items,
    page_info: {
      returned_count: items.length,
      omitted_item_count: null,
      next_cursor: null
    },
    safe_error_codes: [],
    audit_hint_ref: `${requestId}-audit`,
    count_leak_prevented: true,
    production_ready_claim: false,
    ...extra
  };
}

function clientDirectoryBody() {
  return {
    ...collection("client-directory", [{
      client_group_id: "client-allowed",
      display_name: "새봄테크",
      status: "active",
      legal_form: "주식회사",
      member_count: 1,
      primary_record_present: true
    }]),
    permission_prefilter_applied: true,
    raw_source_payload_included: false
  };
}

function apiBody(pathname, state) {
  if (pathname === "/api/analytics/clients") {
    return clientDirectoryBody();
  }
  if (
    pathname
      === "/api/analytics/clients/client-allowed/operations"
  ) {
    const partial = state.inquiriesDenied || state.mattersPartial;
    const inquirySection = state.inquiriesDenied
      ? { status: "permission_denied", data: null }
      : {
        status: "available",
        data: {
          items: [{
            lead_id: "inquiry-allowed",
            display_name: "계약 검토 문의",
            visible_status: "new",
            visible_status_label: "새 문의",
            source: "outlook_addin",
            received_at: "2026-07-30T01:00:00.000Z",
            next_action: "담당 변호사 지정",
            assigned: false
          }]
        }
      };
    const inquirySource = {
      source_id: "crm_inquiries",
      label: "문의",
      status: state.inquiriesDenied
        ? "permission_denied"
        : "available",
      item_count: state.inquiriesDenied ? null : 1,
      safe_error_code: state.inquiriesDenied
        ? "CLIENT_OPERATIONS_INQUIRY_READ_DENIED"
        : null
    };
    const matterSection = {
      status: state.mattersPartial ? "partial" : "available",
      data: {
        items: [{
          matter_id: "matter-allowed",
          matter_code: "2026-001",
          display_name: "정기 법률자문",
          status: "open",
          opened_at: "2026-07-01T00:00:00.000Z"
        }]
      }
    };
    return {
      request_id: "client-operations-detail",
      outcome: partial ? "partial" : "passed",
      ui_state: partial ? "partial" : null,
      item: {
        outcome: partial ? "partial" : "passed",
        ui_state: partial ? "partial" : null,
        client: {
          client_group_id: "client-allowed",
          display_name: "새봄테크",
          status: "active",
          legal_form: "주식회사",
          member_count: 1,
          primary_record_present: true
        },
        sections: {
          contacts: {
            status: "available",
            data: {
              items: [
                {
                  contact_id: "contact-visible",
                  display_name: "김담당",
                  primary_contact_type: "email",
                  contact_point_value_included: false,
                  contact_value_masked: true,
                  status: "active"
                },
                {
                  contact_id: "contact-protected",
                  display_name: "박담당",
                  primary_contact_type: "phone",
                  contact_point_value_included: false,
                  contact_value_masked: true,
                  status: "active"
                }
              ]
            }
          },
          matters: matterSection,
          inquiries: inquirySection
        },
        source_statuses: [
          {
            source_id: "master_data_contacts",
            label: "연락처",
            status: "available",
            item_count: 2,
            safe_error_code: null
          },
          {
            source_id: "matters",
            label: "Matter",
            status: state.mattersPartial ? "partial" : "available",
            item_count: state.mattersPartial ? 73 : 1,
            safe_error_code: state.mattersPartial
              ? "CLIENT_OPERATIONS_MATTER_OBJECTS_OMITTED"
              : null
          },
          inquirySource
        ],
        safe_error_codes: [
          ...(state.inquiriesDenied
            ? ["CLIENT_OPERATIONS_INQUIRY_READ_DENIED"]
            : []),
          ...(state.mattersPartial
            ? ["CLIENT_OPERATIONS_MATTER_OBJECTS_OMITTED"]
            : [])
        ],
        count_leak_prevented: true,
        raw_contact_values_included: false,
        raw_source_payload_included: false
      },
      source_statuses: [],
      safe_error_codes: [],
      permission_prefilter_applied: true,
      count_leak_prevented: true,
      raw_source_payload_included: false,
      production_ready_claim: false,
      omitted_item_count: partial ? 73 : null
    };
  }
  if (pathname === "/api/crm/accounts") {
    return collection("client-accounts", [
      {
        account_id: "account-allowed",
        client_group_id: "client-allowed",
        party_id: "party-allowed",
        display_name: "새봄테크",
        status: "active"
      },
      {
        account_id: "account-hidden",
        client_group_id: "client-hidden",
        display_name: "새봄테크",
        status: "active"
      }
    ]);
  }
  if (pathname === "/api/crm/contacts") {
    return collection("client-contacts", [
      {
        contact_id: "contact-visible",
        account_id: "account-allowed",
        display_name: "김담당",
        primary_contact_type: "email",
        contact_point_value: "contact@example.test",
        contact_point_value_included: true,
        status: "active"
      },
      {
        contact_id: "contact-protected",
        entity_id: "entity-allowed",
        display_name: "박담당",
        primary_contact_type: "phone",
        phone: "010-0000-0000",
        contact_point_value_included: false,
        status: "active"
      },
      {
        contact_id: "contact-hidden",
        account_id: "account-hidden",
        display_name: "숨은 담당자",
        contact_point_value: "hidden@example.test",
        contact_point_value_included: true,
        status: "active"
      }
    ]);
  }
  if (pathname === "/api/crm/accounts/account-allowed/contacts") {
    return collection("client-account-contacts", [{
      relationship_id: "relationship-allowed",
      account_id: "account-allowed",
      contact_id: "contact-visible",
      contact_display_name: "김담당",
      primary_contact_type: "email",
      contact_point_value: "contact@example.test",
      contact_point_value_included: true,
      status: "active"
    }]);
  }
  if (pathname === "/api/crm/inquiries") {
    if (state.inquiriesDenied) {
      return {
        ...collection("client-inquiries-denied", [], {
          outcome: "denied",
          ui_state: "denied",
          safe_error_codes: ["CRM_INTAKE_UNAUTHORIZED_OMISSION"]
        }),
        page_info: {
          returned_count: 0,
          omitted_item_count: 73,
          limit: 100,
          has_more: false
        }
      };
    }
    return collection("client-inquiries", [
      {
        lead_id: "inquiry-allowed",
        client_group_id: "client-allowed",
        party_id: "party-allowed",
        display_name: "계약 검토 문의",
        visible_status: "new",
        visible_status_label: "새 문의",
        source: "outlook_addin",
        received_at: "2026-07-30T01:00:00.000Z",
        next_action: "담당 변호사 지정"
      },
      {
        lead_id: "inquiry-hidden",
        client_group_id: "client-hidden",
        display_name: "숨은 문의",
        visible_status: "new",
        visible_status_label: "새 문의",
        source: "manual",
        received_at: "2026-07-31T01:00:00.000Z"
      }
    ]);
  }
  if (pathname === "/api/profile/me") {
    return {
      request_id: "client-profile",
      outcome: "passed",
      ui_state: null,
      item: {
        user_id: "user-client-test",
        display_name: "테스트 사용자"
      },
      safe_error_codes: [],
      audit_hint_ref: "client-profile-audit",
      count_leak_prevented: true,
      production_ready_claim: false
    };
  }
  return collection("client-generic", []);
}

test("CL-P5-W02-T01 고객 목록과 상세 탭은 주소·권한·반응형 계약을 지킨다", async () => {
  const screenshotDir = process.env.CLIENT_DIRECTORY_SCREENSHOT_DIR;
  if (screenshotDir) await mkdir(screenshotDir, { recursive: true });
  const port = await availablePort();
  const server = await createServer({
    root: webRoot,
    logLevel: "silent",
    server: {
      host: "127.0.0.1",
      port,
      strictPort: true,
      hmr: false
    }
  });
  await server.listen();
  const browser = await chromium.launch({ headless: true });
  const state = {
    inquiriesDenied: false,
    mattersPartial: false
  };
  try {
    const requestedPaths = [];
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 }
    });
    page.on("request", (request) => {
      requestedPaths.push(new URL(request.url()).pathname);
    });
    await page.route("**/api/**", (route) => {
      const url = new URL(route.request().url());
      return respond(route, apiBody(url.pathname, state));
    });

    await page.goto(
      `http://127.0.0.1:${port}/?view=clients&ctx=allow&record_id=client-allowed&tab=contacts#clients-list`,
      { waitUntil: "networkidle" }
    );
    await page.waitForSelector('[data-client-detail-panel="contacts"]');

    const clientRows = page.locator(".client-selectable-record-button");
    assert.equal(await clientRows.count(), 1);
    assert.equal(await clientRows.first().getByText("새봄테크", { exact: true }).count(), 1);
    assert.equal(await page.getByText("숨은 사건", { exact: true }).count(), 0);
    assert.equal(await page.getByText("숨은 담당자", { exact: true }).count(), 0);
    assert.equal(await page.getByText("hidden@example.test", { exact: true }).count(), 0);
    assert.equal(await page.getByText("김담당", { exact: true }).count(), 1);
    assert.equal(await page.getByText("contact@example.test", { exact: true }).count(), 0);
    assert.equal(await page.getByText("박담당", { exact: true }).count(), 1);
    assert.equal(await page.getByText("보호됨", { exact: true }).count(), 2);
    assert.equal((await page.locator("body").innerText()).includes("010-0000-0000"), false);
    assert.equal(requestedPaths.includes("/master-data/records"), false);
    assert.equal(new URL(page.url()).searchParams.get("record_id"), "client-allowed");
    assert.equal(new URL(page.url()).searchParams.get("tab"), "contacts");
    if (screenshotDir) {
      await page.screenshot({
        path: join(screenshotDir, "client-directory-1440.png"),
        fullPage: true
      });
    }

    const tabNames = await page.locator('[role="tab"]').allTextContents();
    assert.deepEqual(tabNames, ["개요", "연락처", "Matter", "문의"]);
    assert.equal(tabNames.some((label) => /\d/.test(label)), false);

    await page.getByRole("tab", { name: "Matter", exact: true }).click();
    await page.waitForSelector('[data-client-detail-panel="matters"]');
    assert.equal(new URL(page.url()).searchParams.get("tab"), "matters");
    assert.equal(await page.getByText("정기 법률자문", { exact: true }).count(), 1);
    assert.equal(await page.getByText("숨은 사건", { exact: true }).count(), 0);

    state.mattersPartial = true;
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForSelector(".client-detail-source-note");
    const partialMatterText = await page.locator(
      '[data-client-detail-panel="matters"]'
    ).innerText();
    assert.match(partialMatterText, /일부 정보만 불러왔습니다/);
    assert.match(partialMatterText, /정기 법률자문/);
    assert.equal(partialMatterText.includes("73"), false);
    assert.equal(partialMatterText.includes("0건"), false);
    state.mattersPartial = false;

    await page.getByRole("tab", { name: "문의", exact: true }).click();
    await page.waitForSelector('[data-client-detail-panel="inquiries"]');
    assert.equal(new URL(page.url()).searchParams.get("tab"), "inquiries");
    assert.equal(await page.getByText("계약 검토 문의", { exact: true }).count(), 1);
    assert.equal(await page.getByText("숨은 문의", { exact: true }).count(), 0);

    await page.goto(
      `http://127.0.0.1:${port}/?view=clients&ctx=allow&record_id=client-allowed&tab=deposit_revenue#clients-list`,
      { waitUntil: "networkidle" }
    );
    await page.waitForSelector('[data-client-related-route="deposit_revenue"]');
    assert.equal(await page.locator('[data-client-detail-panel="overview"]').count(), 1);
    assert.equal(new URL(page.url()).searchParams.get("tab"), "deposit_revenue");
    await page.getByRole("button", {
      name: /입금 매출 내역 열기/
    }).click();
    await page.waitForFunction(() => location.hash === "#client-sales-history");
    await page.waitForSelector(
      '[data-client-related-finance-guard="deposit_revenue"]'
    );
    assert.equal(
      await page.locator('[data-record-overlay="client"]').count(),
      0
    );
    const depositGuardText = await page.locator(
      '[data-client-related-finance-guard="deposit_revenue"]'
    ).innerText();
    assert.match(depositGuardText, /입금 매출 기준과 기존 청구 기준/);
    assert.match(depositGuardText, /정확하지 않은 금액은 보여 주지 않습니다/);
    assert.equal(
      await page.locator("#client-sales-history table").count(),
      0
    );
    assert.equal(
      requestedPaths.includes("/api/analytics/finance/clients"),
      false
    );
    if (screenshotDir) {
      await page.screenshot({
        path: join(screenshotDir, "client-deposit-guard-1440.png"),
        fullPage: true
      });
    }
    await page.getByRole("button", {
      name: "고객 정보로 돌아가기",
      exact: true
    }).click();
    await page.waitForFunction(() => location.hash === "#clients-list");
    await page.waitForSelector('[data-client-detail-panel="overview"]');
    assert.equal(
      new URL(page.url()).searchParams.get("record_id"),
      "client-allowed"
    );
    assert.equal(new URL(page.url()).searchParams.get("tab"), "overview");

    await page.goto(
      `http://127.0.0.1:${port}/?view=clients&ctx=allow&record_id=client-allowed&tab=receivables#clients-list`,
      { waitUntil: "networkidle" }
    );
    await page.waitForSelector('[data-client-related-route="receivables"]');
    await page.getByRole("button", {
      name: /수임료·미수금 열기/
    }).click();
    await page.waitForFunction(() => location.hash === "#client-billing");
    await page.waitForSelector(
      '[data-client-related-finance-guard="receivables"]'
    );
    const receivablesGuardText = await page.locator(
      '[data-client-related-finance-guard="receivables"]'
    ).innerText();
    assert.match(receivablesGuardText, /수임료·미수금 기준과 기존 송장 잔액 기준/);
    assert.match(receivablesGuardText, /정확하지 않은 금액은 보여 주지 않습니다/);
    assert.equal(
      await page.locator("#client-billing table").count(),
      0
    );

    await page.goto(
      `http://127.0.0.1:${port}/?view=clients&ctx=allow&record_id=client-hidden#client-sales-history`,
      { waitUntil: "networkidle" }
    );
    await page.waitForSelector(
      '[data-client-related-finance-guard="deposit_revenue"]'
    );
    const hiddenFinanceText = await page.locator(
      '[data-client-related-finance-guard="deposit_revenue"]'
    ).innerText();
    assert.match(hiddenFinanceText, /선택한 고객 정보를 열 수 없습니다/);
    assert.equal(hiddenFinanceText.includes("client-hidden"), false);
    assert.equal(
      await page.locator("#client-sales-history table").count(),
      0
    );
    await page.getByRole("button", {
      name: "고객 목록으로 이동",
      exact: true
    }).click();
    await page.waitForFunction(() => location.hash === "#clients-list");
    assert.equal(new URL(page.url()).searchParams.has("record_id"), false);

    state.inquiriesDenied = true;
    await page.goto(
      `http://127.0.0.1:${port}/?view=clients&ctx=allow&record_id=client-allowed&tab=inquiries#clients-list`,
      { waitUntil: "networkidle" }
    );
    await page.waitForSelector(".client-detail-state-denied");
    const deniedText = await page.locator('[data-client-detail-panel="inquiries"]').innerText();
    assert.match(deniedText, /접근 권한이 없습니다/);
    assert.equal(deniedText.includes("73"), false);
    assert.equal(deniedText.includes("0건"), false);

    await page.goto(
      `http://127.0.0.1:${port}/?view=clients&ctx=allow&record_id=client-hidden&tab=contacts#clients-list`,
      { waitUntil: "networkidle" }
    );
    await page.waitForSelector(".client-record-unavailable");
    assert.equal(await page.locator('[data-record-overlay="client"]').count(), 0);
    assert.equal((await page.locator("body").innerText()).includes("client-hidden"), false);
    assert.equal(
      requestedPaths.includes(
        "/api/analytics/clients/client-hidden/operations"
      ),
      false
    );

    state.inquiriesDenied = false;
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(
      `http://127.0.0.1:${port}/?view=clients&ctx=allow&record_id=client-allowed&tab=contacts#clients-list`,
      { waitUntil: "networkidle" }
    );
    await page.waitForSelector('[data-client-detail-panel="contacts"]');
    const overflow = await page.evaluate(() => ({
      body: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      panel: document.querySelector(".record-overlay-panel").scrollWidth
        - document.querySelector(".record-overlay-panel").clientWidth
    }));
    assert.deepEqual(overflow, { body: 0, panel: 0 });
    if (screenshotDir) {
      await page.screenshot({
        path: join(screenshotDir, "client-directory-390.png"),
        fullPage: true
      });
    }
  } finally {
    await browser.close();
    await server.close();
  }
});
