import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import {
  repoRoot,
  startPeopleOverviewHarness,
} from "./people-overview-test-support.mjs";

const SESSION_SCHEMA = "law-firm-os.desktop-web-session-envelope.v0.1";
const evidenceDir = join(repoRoot, ".omo/evidence/fix-shell-session-public-label-20260731");
const SYNTHETIC_PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");

function sessionEnvelope(actorRef) {
  return {
    schema_version: SESSION_SCHEMA,
    state: "signed_in",
    session_ref: "session:shell-label-regression",
    source: "browser_receipt",
    actor_ref: actorRef,
    tenant_refs: { default: "tenant-shell-label" },
    role_ids: ["employee"],
    scopes: ["hrx.leave.self.read"],
    review_state: "allow",
    expires_at: "2030-01-01T00:00:00.000Z",
  };
}

function apiSession({ userId, displayName, title, email }) {
  return {
    token_type: "Bearer",
    session_token: "lawos_session_v1.shell-label-regression",
    expires_at: "2030-01-01T00:00:00.000Z",
    session: {
      session_id: "session:shell-label-regression",
      user_id: userId,
      display_name: displayName,
      title,
      email,
      tenant_id: "tenant-shell-label",
      role_ids: ["employee"],
      scopes: ["hrx.leave.self.read"],
      expires_at: "2030-01-01T00:00:00.000Z",
    },
  };
}

async function openShellPage({
  browser,
  baseUrl,
  locale = "ko",
  actorRef,
  userId,
  displayName,
  title,
  email,
  photo = false,
}) {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    locale: locale === "en" ? "en-US" : "ko-KR",
    timezoneId: "Asia/Seoul",
  });
  await page.addInitScript(({ session, envelope }) => {
    sessionStorage.setItem("lawos.api.session", JSON.stringify(session));
    window.__LAWOS_SESSION_CONTEXT__ = envelope;
  }, {
    session: apiSession({ userId, displayName, title, email }),
    envelope: sessionEnvelope(actorRef),
  });
  await page.route("**/api/**", (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (photo && pathname === "/api/profile/me/photo") {
      return route.fulfill({ status: 200, contentType: "image/png", body: SYNTHETIC_PNG,
        headers: { "cache-control": "private, no-store" } });
    }
    return route.fulfill({ status: 200, contentType: "application/json",
      body: photo && pathname === "/api/profile/me" ? JSON.stringify({ request_id: "synthetic-photo-profile", outcome: "passed", ui_state: "data",
        safe_error_codes: [], audit_hint_ref: "synthetic-sidebar-photo", production_ready_claim: false,
        item: { display_name: displayName, title, photo_url: "/api/profile/me/photo", photo_included: true } }) : "{}" });
  });
  await page.goto(`${baseUrl}/?locale=${locale}&view=people&ctx=allow#people-leave`, {
    waitUntil: "networkidle",
  });
  await page.locator("#people-home").waitFor();
  await page.locator(".forest-sidebar-user strong").waitFor();
  return page;
}

async function exposedSidebar(page) {
  return page.locator(".forest-sidebar-user").evaluate((node) => ({
    text: node.textContent ?? "",
    html: node.outerHTML,
    attributes: [...node.querySelectorAll("[aria-label], [aria-describedby], [title]")]
      .flatMap((element) => ["aria-label", "aria-describedby", "title"].map((name) => element.getAttribute(name) ?? ""))
      .join(" "),
  }));
}

test("sidebar session labels sanitize every source reference and preserve real names", async () => {
  const harness = await startPeopleOverviewHarness();
  await mkdir(evidenceDir, { recursive: true });
  const cases = [
    {
      name: "multi-source-opaque",
      locale: "ko",
      actorRef: "kim",
      userId: "lee",
      displayName: "KIM",
      title: "KIM",
      email: "lee@example.test",
      expectedName: "사용자",
      expectedRole: "",
    },
    {
      name: "english-name-role",
      locale: "ko",
      actorRef: "kim",
      userId: "lee",
      displayName: "Kim Min",
      title: "Senior Associate",
      email: "lee@example.test",
      expectedName: "Kim Min",
      expectedRole: "Senior Associate",
    },
    {
      name: "korean-name-role",
      locale: "ko",
      actorRef: "kim",
      userId: "lee",
      displayName: "김민",
      title: "수석 변호사",
      email: "lee@example.test",
      expectedName: "김민",
      expectedRole: "수석 변호사",
      photo: true,
    },
    {
      name: "english-fallback",
      locale: "en",
      actorRef: "kim",
      userId: "lee",
      displayName: null,
      title: null,
      email: "lee@example.test",
      expectedName: "User",
      expectedRole: "",
    },
  ];

  try {
    for (const fixture of cases) {
      const page = await openShellPage({ ...harness, ...fixture });
      try {
        const sidebar = page.locator(".forest-sidebar-user");
        await sidebar.getByText(fixture.expectedName, { exact: true }).waitFor();
        assert.equal(await sidebar.locator("strong").innerText(), fixture.expectedName);
        assert.equal(await sidebar.locator("img").count(), fixture.photo ? 1 : 0);
        if (fixture.photo) {
          assert.equal(await sidebar.locator("img").getAttribute("src"), `data:image/png;base64,${SYNTHETIC_PNG.toString("base64")}`);
          assert.equal(await sidebar.locator("img").evaluate(image => image.complete && image.naturalWidth > 0), true);
        }
        if (fixture.expectedRole) {
          assert.equal(await sidebar.locator("small").innerText(), fixture.expectedRole);
        } else {
          assert.equal(await sidebar.locator("small").count(), 0);
        }

        const bodyText = await page.locator("body").innerText();
        const exposed = await exposedSidebar(page);
        for (const reference of [fixture.actorRef, fixture.userId, fixture.email]) {
          assert.equal(bodyText.includes(reference), false, `${fixture.name} body leaked ${reference}`);
          assert.equal(exposed.text.includes(reference), false, `${fixture.name} sidebar text leaked ${reference}`);
          assert.equal(exposed.html.includes(reference), false, `${fixture.name} sidebar markup leaked ${reference}`);
          assert.equal(exposed.attributes.includes(reference), false, `${fixture.name} sidebar ARIA/title leaked ${reference}`);
        }

        await page.screenshot({
          path: join(evidenceDir, `shell-session-${fixture.name}.png`),
          fullPage: true,
        });
      } finally {
        await page.close();
      }
    }
  } finally {
    await harness.close();
  }
});
