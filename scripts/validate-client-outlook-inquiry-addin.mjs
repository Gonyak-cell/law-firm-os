#!/usr/bin/env node
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { chromium } from "playwright";
import {
  assertFocusStateDelta,
  assertNegativeFocusFixture,
  readFocusSnapshot,
} from "./lib/outlook-addin-focus-proof.mjs";
import { startOutlookAddinStaticServer } from "./lib/outlook-addin-static-server.mjs";

const ROOT = process.cwd();
const SCREENSHOT_PATH = process.env.LAWOS_OUTLOOK_ADDIN_SCREENSHOT
  ?? "/tmp/lawos-client-outlook-addin-t05.png";

async function serveDist() {
  return startOutlookAddinStaticServer({
    distRoot: resolve(ROOT, "apps/addin/dist"),
  });
}

function json(route, body, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json; charset=utf-8",
    body: JSON.stringify({
      safe_error_codes: [],
      production_ready_claim: false,
      ...body,
    }),
  });
}

const web = await serveDist();
const browser = await chromium.launch({ headless: true });
const writes = [];
const inquiryResults = new Map();

try {
  const page = await browser.newPage({
    viewport: { width: 390, height: 980 },
  });
  await page.addInitScript(() => {
    window.Office = {
      actions: {
        associate() {},
      },
      MailboxEnums: {
        RestVersion: { v2_0: "v2.0" },
        ItemNotificationMessageType: {
          InformationalMessage: "informationalMessage",
        },
      },
      context: {
        mailbox: {
          item: {
            itemId: "ews-id-must-not-enter-request",
            subject: "해외 거래처 계약 검토 문의",
            normalizedSubject: "해외 거래처 계약 검토 문의",
            internetMessageId: "<outm36-proof@example.invalid>",
            conversationId: "conversation-outm36-proof",
            from: { displayName: "보낸 사람", emailAddress: "sender@example.invalid" },
            to: [{ displayName: "AMIC", emailAddress: "lawyer@example.invalid" }],
            attachments: [],
            body: {
              getAsync(_coercionType, callback) {
                callback({ status: "succeeded", value: "확인 부탁드립니다." });
              },
            },
            getAllInternetHeadersAsync(callback) {
              callback({
                status: "succeeded",
                value: "Date: Fri, 08 Aug 2026 00:00:00 +0900",
              });
            },
          },
          convertToRestId(itemId, version) {
            if (
              itemId !== "ews-id-must-not-enter-request"
              || version !== "v2.0"
            ) {
              throw new Error("unexpected Office.js conversion");
            }
            return "rest-message-t05";
          },
          userProfile: {
            emailAddress: "lawyer@example.invalid",
          },
        },
      },
    };
  });
  await page.addInitScript(() => {
    window.sessionStorage.setItem("lawos_addin_session_token", "lawos_session_v1.outm36proof");
  });
  await page.route("https://appsforoffice.microsoft.com/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: "",
    });
  });
  await page.route("**/api/auth/**", async (route) => {
    const { pathname } = new URL(route.request().url());
    if (pathname === "/api/auth/office-sso/config") {
      await json(route, {
        item: {
          configured: true,
          client_id: "client-outm36-proof",
          tenant_id: "organizations",
          api_scope: "api://client-outm36-proof/access_as_user",
          scopes: ["api://client-outm36-proof/access_as_user"],
          callback_uri: web.origin + "/oauth-callback.html",
          authority: "https://login.microsoftonline.com/organizations",
        },
      });
      return;
    }
    if (pathname === "/api/auth/session") {
      await json(route, {
        authenticated: true,
        principal: { user_id: "user-outm36-proof", tenant_id: "tenant-t05" },
      });
      return;
    }
    await route.fulfill({ status: 404, body: "not found" });
  });
  await page.route("**/api/outlook/**", async (route) => {
    const request = route.request();
    const { pathname } = new URL(request.url());
    if (request.method() === "GET") {
      if (pathname === "/api/outlook/bootstrap") {
        await json(route, {
          item: {
            auth_shell: { signed_session_supported: true },
            external_receipt_boundary: {
              entra_admin_consent_receipt_present: true,
            },
          },
        });
        return;
      }
      if (pathname === "/api/outlook/connection") {
        await json(route, {
          item: {
            status: "connected",
            active: true,
            state_version: 1,
            mailbox_address: "lawyer@example.invalid",
          },
        });
        return;
      }
      if (pathname === "/api/outlook/matters") {
        await json(route, {
          items: [{
            matter_id: "matter-t05",
            lookup_label: "A-2026-014 계약 검토",
            client_display_name: "가나다 주식회사",
            status: "open",
          }],
        });
        return;
      }
      if (pathname === "/api/outlook/inquiries") {
        await json(route, {
          items: [{
            lead_id: "lead-existing-t05",
            party_id: "party-existing-t05",
            display_name: "가나다 주식회사 계약 문의",
            status: "active",
          }],
        });
        return;
      }
      if (pathname.endsWith("/timeline")) {
        await json(route, {
          item: { visible_entries: [] },
        });
        return;
      }
      if (pathname.endsWith("/documents")) {
        await json(route, { items: [] });
        return;
      }
    }

    const body = request.postDataJSON();
    writes.push({ pathname, body });
    if (pathname === "/api/outlook/inquiries") {
      const resultKey = body.idempotency_key;
      const prior = inquiryResults.get(resultKey);
      const item = prior ?? {
        action: body.action,
        lead_id: body.action === "new"
          ? "lead-new-t05"
          : body.existing_lead_id,
        party_id: body.action === "new"
          ? "party-new-t05"
          : "party-existing-t05",
        inquiry_email_evidence_id:
          `evidence-${body.action}`,
        idempotent_replay: false,
      };
      inquiryResults.set(resultKey, item);
      await json(route, {
        outcome: "registered",
        item: {
          ...item,
          idempotent_replay: Boolean(prior),
        },
      }, prior ? 200 : 201);
      return;
    }
    if (pathname === "/api/outlook/email/file") {
      await json(route, {
        outcome: "created",
        email_thread: {
          email_thread_id: "thread-t05",
        },
      }, 201);
      return;
    }
    await json(route, { outcome: "created", item: {} }, 201);
  });

  await page.goto(
    `${web.origin}/?tenantId=tenant-t05&matterId=matter-t05`,
    { waitUntil: "domcontentloaded" },
  );
  await page.waitForSelector(
    "[data-outlook-addin-taskpane='true']",
  );

  assert.equal(
    writes.length,
    0,
    "화면을 열기만 해서는 쓰기 요청이 없어야 한다",
  );
  assert.equal(
    await page.getByRole("button", {
      name: "새 문의 등록",
    }).count(),
    1,
  );
  assert.equal(
    await page.getByRole("button", {
      name: "기존 문의에 연결",
    }).count(),
    1,
  );
  assert.equal(
    await page.getByRole("button", {
      name: "Matter에 보관",
    }).count(),
    1,
  );
  await page.getByLabel("연결할 문의").selectOption(
    "lead-existing-t05",
  );
  await page.getByLabel("보관할 Matter").selectOption(
    "matter-t05",
  );

  const newInquiry = page.getByRole("button", {
    name: "새 문의 등록",
  });
  const unfocusedSnapshot = await newInquiry.evaluate(readFocusSnapshot);
  await newInquiry.focus();
  // Move focus through the keyboard so Chromium applies :focus-visible to the
  // actual action target, then inspect the computed ring instead of merely
  // checking that a native button happens to be focusable.
  await page.keyboard.press("Tab");
  await page.keyboard.press("Shift+Tab");
  const focusSnapshot = await newInquiry.evaluate(readFocusSnapshot);
  assertFocusStateDelta(unfocusedSnapshot, focusSnapshot, "문의 등록 버튼");

  await assertNegativeFocusFixture(
    page,
    {
      id: "outm36-negative-focus-fixture",
      label: "negative focus fixture",
      cssText: "outline: none; border: 1px solid transparent; box-shadow: none;",
    },
  );
  await assertNegativeFocusFixture(
    page,
    {
      id: "outm36-permanent-shadow-border-change",
      label: "permanent shadow with 1px focus border fixture",
      cssText: "outline: none; border: 1px solid transparent; box-shadow: 0 0 0 3px rgb(143, 194, 238); background: rgb(23, 33, 43);",
      focusCssText: "#outm36-permanent-shadow-border-change:focus-visible { border-color: rgb(0, 0, 0) !important; }",
    },
  );
  await assertNegativeFocusFixture(
    page,
    {
      id: "outm36-permanent-border-outline-color",
      label: "permanent border with hidden outline-color fixture",
      cssText: "outline: none; border: 3px solid rgb(143, 194, 238); box-shadow: none; background: rgb(23, 33, 43);",
      focusCssText: "#outm36-permanent-border-outline-color:focus-visible { outline-color: rgb(0, 0, 0) !important; }",
    },
  );
  await assertNegativeFocusFixture(
    page,
    {
      id: "outm36-pixel-identical-focus-fixture",
      label: "pixel-identical focus fixture",
      cssText: "outline: none; border: 3px solid rgb(143, 194, 238); box-shadow: none; background: rgb(23, 33, 43);",
    },
  );
  await newInquiry.press("Enter");
  await page.waitForFunction(() => (
    document.querySelector("[data-testid='inquiry-status']")
      ?.getAttribute("data-lead-id") === "lead-new-t05"
  ));
  const firstLeadId = await page.locator(
    "[data-testid='inquiry-status']",
  ).getAttribute("data-lead-id");
  await newInquiry.press("Enter");
  await page.waitForFunction(() => (
    document.querySelector("[data-testid='inquiry-status']")
      ?.getAttribute("data-replay") === "true"
  ));
  assert.equal(
    await page.locator("[data-testid='inquiry-status']")
      .getAttribute("data-lead-id"),
    firstLeadId,
  );

  const linkInquiry = page.getByRole("button", {
    name: "기존 문의에 연결",
  });
  await linkInquiry.focus();
  await linkInquiry.press("Enter");
  await page.waitForFunction(() => (
    document.querySelector("[data-testid='inquiry-status']")
      ?.getAttribute("data-action") === "link_existing"
  ));

  const fileMatter = page.getByRole("button", {
    name: "Matter에 보관",
  });
  await fileMatter.focus();
  await fileMatter.press("Enter");
  await page.waitForFunction(() => (
    document.querySelector("[data-testid='email-status']")
      ?.getAttribute("data-outcome") === "created"
  ));

  const inquiryWrites = writes.filter(
    (entry) => entry.pathname === "/api/outlook/inquiries",
  );
  assert.equal(inquiryWrites.length, 3);
  assert.equal(
    inquiryWrites[0].body.idempotency_key,
    inquiryWrites[1].body.idempotency_key,
  );
  assert.equal(
    JSON.stringify(inquiryWrites)
      .includes("ews-id-must-not-enter-request"),
    false,
  );
  assert.equal(
    writes.filter(
      (entry) => entry.pathname === "/api/outlook/email/file",
    ).length,
    1,
  );

  const visibleText = await page.locator("body").innerText();
  assert.doesNotMatch(
    visibleText,
    /filing|provider-gated|timeline|warning|matter 연결/iu,
  );
  await page.screenshot({
    path: SCREENSHOT_PATH,
    fullPage: true,
  });
  console.log(JSON.stringify({
    pass: true,
    no_click_writes: 0,
    inquiry_writes: inquiryWrites.length,
    replay_lead_id: firstLeadId,
    keyboard_actions_verified: 3,
    screenshot_path: SCREENSHOT_PATH,
    external_provider_executed: false,
    production_write_claim: false,
  }, null, 2));
} finally {
  await browser.close();
  await new Promise((resolvePromise) => (
    web.server.close(resolvePromise)
  ));
}
