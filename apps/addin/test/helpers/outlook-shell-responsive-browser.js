import { stat } from "node:fs/promises";

export async function assertBuiltDist(distRoot) {
  for (const relativePath of ["index.html", "outlook-addin/index.html"]) {
    await stat(`${distRoot}/${relativePath}`);
  }
}

export async function installOfficeAndApiMocks(page) {
  await page.addInitScript(() => {
    window.Office = {
      onReady(callback) { callback({ host: "Outlook", platform: "web" }); },
      actions: { associate() {} },
      MailboxEnums: {
        RestVersion: { v2_0: "v2.0" },
        CoercionType: { Text: "text" },
        ItemNotificationMessageType: { InformationalMessage: "informationalMessage" },
      },
      context: {
        requirements: { isSetSupported: () => false },
        mailbox: {
          item: {
            itemId: "responsive-qa-item",
            subject: "반응형 Outlook 검증 메일",
            internetMessageId: "<responsive-qa@example.invalid>",
            conversationId: "responsive-qa-conversation",
            attachments: [],
            body: { getAsync(_coercionType, callback) { callback({ status: "succeeded", value: "검증 본문" }); } },
            getAllInternetHeadersAsync(callback) { callback({ status: "succeeded", value: "Date: Mon, 10 Aug 2026 00:00:00 +0900" }); },
          },
          userProfile: { emailAddress: "qa@example.invalid" },
        },
      },
    };
    window.Office.context.mailbox.convertToRestId = (itemId, version) => {
      if (itemId !== "responsive-qa-item" || version !== "v2.0") throw new Error("unexpected Office.js conversion");
      return "rest-responsive-qa";
    };
    window.OfficeRuntime = { storage: { getItem: async () => null, setItem: async () => {}, removeItem: async () => {} } };
    window.sessionStorage.setItem("lawos_addin_session_token", "lawos_session_v1.responsiveqa");
  });
  await page.route("https://appsforoffice.microsoft.com/**", (route) => route.fulfill({
    status: 200,
    contentType: "application/javascript",
    body: "",
  }));
  await page.route("**/api/**", async (route) => {
    const requestUrl = new URL(route.request().url());
    if (requestUrl.pathname === "/api/auth/office-sso/config") {
      return route.fulfill({
        status: 200,
        contentType: "application/json; charset=utf-8",
        body: JSON.stringify({
          item: {
            configured: true,
            client_id: "responsive-qa-client",
            tenant_id: "organizations",
            api_scope: "api://responsive-qa-client/access_as_user",
            scopes: ["api://responsive-qa-client/access_as_user"],
            callback_uri: `${requestUrl.origin}/addin/oauth-callback.html`,
            authority: "https://login.microsoftonline.com/organizations",
          },
        }),
      });
    }
    if (requestUrl.pathname === "/api/auth/session") {
      return route.fulfill({
        status: 200,
        contentType: "application/json; charset=utf-8",
        body: JSON.stringify({ authenticated: true, principal: { user_id: "responsive-qa", tenant_id: "responsive-tenant" } }),
      });
    }
    if (requestUrl.pathname === "/api/outlook/connection") {
      return route.fulfill({
        status: 200,
        contentType: "application/json; charset=utf-8",
        body: JSON.stringify({ item: { status: "connected", active: true, connection_id: "m365_connection_responsive_qa", state_version: 1, mailbox_address: "qa@example.invalid" } }),
      });
    }
    if (requestUrl.pathname === "/api/outlook/matters") {
      return route.fulfill({
        status: 200,
        contentType: "application/json; charset=utf-8",
        body: JSON.stringify({
          items: [{
            matter_id: "matter-responsive",
            matter_code: "M-RESP",
            title: "반응형 검증 Matter",
            client_display_name: "QA Client",
            status: "open",
          }],
        }),
      });
    }
    if (requestUrl.pathname === "/api/outlook/precedents/readiness") {
      return route.fulfill({
        status: 200,
        contentType: "application/json; charset=utf-8",
        body: JSON.stringify({
          request_id: "precedent-readiness-qa",
          outcome: "passed",
          runtime_ready: true,
          authoritative: true,
          index_version: "lawos-precedent-fts-v2",
          authority_fingerprint: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          safe_error_codes: [],
          production_ready_claim: false,
        }),
      });
    }
    if (requestUrl.pathname === "/api/outlook/precedents") {
      const documentId = "doc-precedent-qa";
      return route.fulfill({
        status: 200,
        contentType: "application/json; charset=utf-8",
        body: JSON.stringify({
          request_id: "precedent-search-qa",
          outcome: "passed",
          items: [{
            source_id: "precedent-qa-001",
            source_kind: "internal_matter_document",
            title: "반응형 검증을 위한 매우 긴 선례 문서 제목 — 160px과 320px에서 말줄임을 확인하는 고정 결과",
            snippet: "반응형 결과 행의 한 줄 렌더링을 검증합니다.",
            source_matter_id: "matter-source-other",
            document_id: documentId,
            version_id: "version-precedent-qa",
            source_url: `?view=vault&matter_id=matter-source-other&document_id=${documentId}&document_version_id=version-precedent-qa&document_sha256=${"b".repeat(64)}#vault-search-documents`,
            content_sha256: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
            index_version: "lawos-precedent-fts-v2",
          }],
          next_cursor: "next-page",
          page_info: { returned_count: 1, has_more: true },
          index_version: "lawos-precedent-fts-v2",
          authoritative: true,
          production_ready_claim: false,
          safe_error_codes: [],
          count_leak_prevented: true,
          raw_body_included: false,
          storage_pointer_ref_included: false,
          index_stale: false,
        }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json; charset=utf-8",
      body: JSON.stringify({ item: {}, items: [], outcome: "ready", production_ready_claim: false }),
    });
  });
}

export async function openProfile(browser, web, profile, width, reducedMotion) {
  const page = await browser.newPage({ viewport: { width, height: 720 } });
  await page.emulateMedia({ reducedMotion: reducedMotion ? "reduce" : "no-preference" });
  await installOfficeAndApiMocks(page);
  await page.goto(`${web.origin}${profile.path}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".outlook-compact-shell", { state: "visible" });
  await page.waitForFunction((selector) => {
    const button = document.querySelector(selector);
    return Boolean(button && !button.disabled);
  }, profile.railSelector);
  return page;
}

export async function measureShell(page, profile, openerSelector = profile.railSelector) {
  return page.locator(".outlook-compact-shell").evaluate((shell, railSelector) => {
    const rail = shell.querySelector(".outlook-icon-rail");
    const railButton = shell.querySelector(`${railSelector}`);
    const panel = document.querySelector(".outlook-overlay-panel");
    const focusStyle = railButton ? getComputedStyle(railButton) : null;
    const rect = (element) => {
      if (!element) return null;
      const value = element.getBoundingClientRect();
      return { left: value.left, right: value.right, top: value.top, bottom: value.bottom, width: value.width, height: value.height };
    };
    return {
      viewportWidth: window.innerWidth,
      document: { clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth },
      body: { clientWidth: document.body.clientWidth, scrollWidth: document.body.scrollWidth, overflowX: getComputedStyle(document.body).overflowX },
      shell: { clientWidth: shell.clientWidth, scrollWidth: shell.scrollWidth, minWidth: getComputedStyle(shell).minWidth },
      root: { clientWidth: document.getElementById("root")?.clientWidth ?? 0, scrollWidth: document.getElementById("root")?.scrollWidth ?? 0 },
      rail: rect(rail),
      railButton: rect(railButton),
      focusStyle: focusStyle ? { outlineOffset: focusStyle.outlineOffset, boxShadow: focusStyle.boxShadow } : null,
      panel: rect(panel),
      panelGeometry: panel ? { clientWidth: panel.clientWidth, scrollWidth: panel.scrollWidth } : null,
      visibleLineFailures: [...(panel || shell).querySelectorAll(
        ".outlook-flat-action-label, .outlook-one-line, .outlook-flat-action-button, .outlook-one-line-field",
      )].flatMap((element) => {
        const style = getComputedStyle(element);
        const box = element.getBoundingClientRect();
        if (style.display === "none" || style.visibility === "hidden" || box.width <= 1 || box.height <= 1) return [];
        const range = document.createRange();
        range.selectNodeContents(element);
        const lines = new Set([...range.getClientRects()].map((line) => Math.round(line.top * 10) / 10));
        const clipped = element.scrollWidth > element.clientWidth
          && !(style.whiteSpace === "nowrap" && ["hidden", "clip"].includes(style.overflowX) && style.textOverflow === "ellipsis");
        return lines.size <= 1 && !clipped ? [] : [{ text: (element.textContent || element.getAttribute("aria-label") || "").trim().slice(0, 80), lines: lines.size, clipped }];
      }),
      clippedControls: panel ? [...panel.querySelectorAll("button, input, select, textarea")].flatMap((element) => {
        const style = getComputedStyle(element);
        const box = element.getBoundingClientRect();
        const panelBox = panel.getBoundingClientRect();
        if (style.display === "none" || style.visibility === "hidden" || box.width <= 1 || box.height <= 1) return [];
        return box.left < panelBox.left || box.right > panelBox.right || box.top < 0 || box.bottom > window.innerHeight
          ? [{ tag: element.tagName.toLowerCase(), left: box.left, right: box.right, top: box.top, bottom: box.bottom }]
          : [];
      }) : [],
      reducedMotion: [shell, document.body, panel].filter(Boolean).map((element) => {
        const style = getComputedStyle(element);
        return {
          animationName: style.animationName,
          transform: style.transform,
          transitionDuration: style.transitionDuration,
          scrollBehavior: style.scrollBehavior,
        };
      }),
    };
  }, openerSelector);
}

export async function measurePrecedentResult(page) {
  return page.locator("[data-testid='outlook-precedent-result']").evaluate((row) => {
    const icon = row.querySelector(".outlook-precedent-source-kind");
    const text = row.querySelector(".outlook-one-line");
    const rect = (element) => {
      if (!element) return null;
      const value = element.getBoundingClientRect();
      return { left: value.left, right: value.right, top: value.top, bottom: value.bottom, width: value.width, height: value.height };
    };
    const textStyle = text ? getComputedStyle(text) : null;
    const range = text ? document.createRange() : null;
    if (range && text) range.selectNodeContents(text);
    const lineTops = new Set([...(range?.getClientRects() ?? [])].map((line) => Math.round(line.top * 10) / 10));
    return {
      tagName: row.tagName,
      type: row.getAttribute("type"),
      row: rect(row),
      rowClientWidth: row.clientWidth,
      rowScrollWidth: row.scrollWidth,
      icon: rect(icon),
      text: rect(text),
      textClientWidth: text?.clientWidth ?? 0,
      textScrollWidth: text?.scrollWidth ?? 0,
      lineCount: lineTops.size,
      textStyle: textStyle ? {
        flexGrow: textStyle.flexGrow,
        minWidth: textStyle.minWidth,
        overflowX: textStyle.overflowX,
        textOverflow: textStyle.textOverflow,
        whiteSpace: textStyle.whiteSpace,
      } : null,
    };
  });
}
