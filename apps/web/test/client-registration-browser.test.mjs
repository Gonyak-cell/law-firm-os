import assert from "node:assert/strict";
import { createServer as createNetServer } from "node:net";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { chromium } from "playwright";
import { createServer } from "vite";

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

async function availablePort() {
  return new Promise((resolvePort, reject) => {
    const server = createNetServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close(() => resolvePort(port));
    });
  });
}

function collection(requestId, items = []) {
  return {
    request_id: requestId,
    outcome: "passed",
    ui_state: items.length ? null : "empty",
    items,
    page_info: { returned_count: items.length, omitted_item_count: null, next_cursor: null },
    safe_error_codes: [],
    audit_hint_ref: `${requestId}-audit`,
    count_leak_prevented: true,
    production_ready_claim: false
  };
}

function reviewResponse(mode) {
  if (mode === "denied") {
    return {
      outcome: "denied",
      ui_state: "denied",
      item: null,
      safe_error_codes: ["CLIENT_GROUP_PERMISSION_DENIED"],
      audit_hint_ref: "client-group-review-audit"
    };
  }
  if (mode === "error") {
    return {
      outcome: "blocked",
      ui_state: "error",
      item: null,
      safe_error_codes: ["CLIENT_GROUP_REVIEW_UNAVAILABLE"],
      audit_hint_ref: "client-group-review-audit"
    };
  }
  const candidate = mode === "candidate" ? [{
    client_group_id: "client-existing",
    display_name: "새봄테크",
    client_type: "organization",
    reasons: ["similar_display_name"]
  }] : [];
  return {
    outcome: "passed",
    ui_state: null,
    item: {
      review_digest: `digest-${mode}`,
      candidates: candidate,
      has_restricted_candidates: mode === "restricted",
      can_create: mode !== "restricted",
      requires_distinct_confirmation: candidate.length > 0
    },
    safe_error_codes: [],
    audit_hint_ref: "client-group-review-audit"
  };
}

test("CL-P5-W02-T02 신규 고객 등록은 중복 확인·권한·반응형 계약을 지킨다", async () => {
  const port = await availablePort();
  const server = await createServer({
    root: webRoot,
    logLevel: "silent",
    server: { host: "127.0.0.1", port, strictPort: true, hmr: false }
  });
  await server.listen();
  const browser = await chromium.launch({ headless: true });
  const state = { reviewMode: "candidate", created: false, reviewBodies: [], createBodies: [] };
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const isApi = url.pathname.startsWith("/api/") || url.pathname.startsWith("/master-data/");
    if (!isApi) return route.continue();
    if (request.method() === "POST" && url.pathname === "/master-data/client-groups/review") {
      state.reviewBodies.push(request.postDataJSON());
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(reviewResponse(state.reviewMode)) });
    }
    if (request.method() === "POST" && url.pathname === "/master-data/client-groups") {
      state.createBodies.push(request.postDataJSON());
      state.created = true;
      return route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          outcome: "passed",
          item: {
            client_group_id: "client-created",
            display_name: request.postDataJSON().client.display_name,
            client_type: request.postDataJSON().client.client_type,
            depositor_alias_saved: Boolean(request.postDataJSON().client.depositor_alias),
            registration_number_saved: Boolean(request.postDataJSON().client.registration_number),
            contact_saved: Boolean(request.postDataJSON().client.email || request.postDataJSON().client.phone)
          },
          replayed: false,
          safe_error_codes: [],
          audit_hint_ref: "client-group-create-audit"
        })
      });
    }
    if (url.pathname === "/api/analytics/clients") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(collection("client-directory", state.created ? [{
          client_group_id: "client-created",
          display_name: "등록 고객",
          status: "active",
          primary_record_present: true
        }] : []))
      });
    }
    if (url.pathname === "/api/profile/me") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          request_id: "profile",
          outcome: "passed",
          ui_state: null,
          item: { user_id: "ui-test", display_name: "UI 테스트" },
          safe_error_codes: [],
          audit_hint_ref: "profile-audit",
          production_ready_claim: false
        })
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(collection(`generic-${url.pathname}`))
    });
  });

  try {
    await page.goto(`http://127.0.0.1:${port}/?view=clients&ctx=allow#client-new`, { waitUntil: "domcontentloaded" });
    await page.locator('[data-client-registration="true"]').waitFor();
    assert.equal(await page.getByRole("button", { name: "개인", exact: true }).count(), 1);
    assert.equal(await page.getByRole("button", { name: "법인·단체", exact: true }).count(), 1);

    await page.getByRole("button", { name: "법인·단체", exact: true }).click();
    await page.getByLabel("고객명").fill("새봄테크");
    await page.getByLabel("법인·단체 형태").selectOption("주식회사");
    assert.equal(await page.getByLabel("등록번호").count(), 1);
    assert.equal(await page.getByLabel("이메일").count(), 0);

    await page.getByRole("button", { name: "개인", exact: true }).click();
    assert.equal(await page.getByLabel("이메일").count(), 1);
    await page.getByLabel("고객명").fill("김민수");
    await page.getByRole("button", { name: "중복 확인", exact: true }).click();
    await page.locator('[data-client-registration-candidates="true"]').waitFor();
    assert.match(await page.locator("body").innerText(), /새봄테크/);
    assert.equal((await page.locator("body").innerText()).includes("client-existing"), false);
    assert.equal(await page.locator('[data-client-registration-create="true"]').isDisabled(), true);
    await page.getByLabel("고객명").fill("김민수2");
    await page.locator('[data-client-registration-candidates="true"]').waitFor({ state: "hidden" });

    await page.getByLabel("고객명").fill("김민수");
    await page.getByRole("button", { name: "중복 확인", exact: true }).click();
    await page.locator('[data-client-registration-candidates="true"]').waitFor();
    await page.getByLabel("별도 고객이 맞습니다").check();
    assert.equal(await page.locator('[data-client-registration-create="true"]').isDisabled(), false);

    state.reviewMode = "restricted";
    await page.getByLabel("고객명").fill("제한 후보");
    await page.getByRole("button", { name: "중복 확인", exact: true }).click();
    await page.locator('[data-client-registration-restricted="true"]').waitFor();
    assert.equal(await page.locator('[data-client-registration-create="true"]').isDisabled(), true);

    state.reviewMode = "clean";
    await page.getByLabel("고객명").fill("등록할 고객");
    await page.getByRole("button", { name: "중복 확인", exact: true }).click();
    await page.locator('[data-client-registration-state="reviewed"]').waitFor();
    await page.locator('[data-client-registration-create="true"]').click();
    await page.locator('[data-client-registration-state="success"]').waitFor();
    const firstCreateKey = state.createBodies.at(-1).idempotency_key;
    await page.locator('[data-client-registration-create="true"]').click();
    assert.equal(state.createBodies.at(-1).idempotency_key, firstCreateKey);
    await page.waitForFunction(() => location.hash === "#clients-list");
    assert.equal(new URL(page.url()).searchParams.get("record_id"), "client-created");
    assert.equal(state.reviewBodies.at(-1).client.client_type, "person");
    assert.equal(state.createBodies.at(-1).confirm_distinct_client, false);
    assert.equal(state.createBodies.at(-1).review_digest, "digest-clean");

    await page.goto(`http://127.0.0.1:${port}/?view=clients&ctx=allow#client-new`, { waitUntil: "domcontentloaded" });
    await page.locator('[data-client-registration="true"]').waitFor();
    state.reviewMode = "denied";
    await page.getByLabel("고객명").fill("권한 없음");
    await page.getByRole("button", { name: "중복 확인", exact: true }).click();
    await page.locator('[data-client-registration-state="denied"]').waitFor();

    state.reviewMode = "error";
    await page.getByLabel("고객명").fill("오류 확인");
    await page.getByRole("button", { name: "중복 확인", exact: true }).click();
    await page.locator('[data-client-registration-state="error"]').waitFor();

    await page.setViewportSize({ width: 390, height: 844 });
    const overflow = await page.evaluate(() => ({
      document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      body: document.body.scrollWidth - document.body.clientWidth
    }));
    assert.deepEqual(overflow, { document: 0, body: 0 });
  } finally {
    await browser.close();
    await server.close();
  }
});
