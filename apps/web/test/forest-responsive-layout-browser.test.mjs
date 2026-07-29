import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createServer as createNetServer } from "node:net";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { chromium } from "playwright";
import { createServer } from "vite";

const testDir = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(testDir, "..");
const styles = await readFile(resolve(testDir, "../src/styles.css"), "utf8");
const amicLawLogo = await readFile(resolve(testDir, "../src/assets/amic-law.svg"), "utf8");

async function availablePort() {
  return new Promise((resolvePort, rejectPort) => {
    const server = createNetServer();
    server.once("error", rejectPort);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close((error) => error ? rejectPort(error) : resolvePort(port));
    });
  });
}

const shellMarkup = (modeException) => `
  <div class="matter-app">
    <div class="app-frame context-sidebar-open">
      <aside class="global-rail">
        <div class="global-rail-brand"><span class="global-rail-brand-mark">A</span></div>
        <nav class="global-rail-nav">
          ${["Home", "Client", "Matter", "People", "Search", "Portal"]
            .map((label) => `<button aria-label="${label}" class="global-rail-action${label === "Matter" ? " active" : ""}"><span class="global-rail-icon"></span><span class="global-rail-tooltip">${label}</span></button>`)
            .join("")}
        </nav>
        <div class="global-rail-utilities"><button class="global-rail-action" aria-label="전체 검색"><span class="global-rail-icon"></span></button></div>
      </aside>
      <button class="context-sidebar-scrim" aria-label="업무 메뉴 닫기"></button>
      <aside class="sidebar"${modeException ? ' data-mode-exception-sidebar="true"' : ""}>
        <div class="sidebar-brand">AMIC</div>
        <button class="workspace-card">People</button>
        ${modeException ? '<div class="sidebar-return-anchor">Return</div>' : ""}
        <nav class="sidebar-nav">Navigation</nav>
        <button class="forest-sidebar-user">Profile</button>
      </aside>
      <main class="page-canvas">Content</main>
    </div>
  </div>`;

const peopleLeaveSidebarMarkup = `
  <div class="matter-app">
    <div class="app-frame context-sidebar-open">
      <aside class="global-rail">
        <div class="global-rail-brand"><span class="global-rail-brand-mark">A</span></div>
        <nav class="global-rail-nav">
          ${["Home", "Client", "Matter", "People", "Search", "Portal"]
            .map((label) => `<button aria-label="${label}" class="global-rail-action${label === "People" ? " active" : ""}"><span class="global-rail-icon"></span><span class="global-rail-tooltip">${label}</span></button>`)
            .join("")}
        </nav>
      </aside>
      <button class="context-sidebar-scrim" aria-label="업무 메뉴 닫기"></button>
      <aside class="sidebar">
        <div class="sidebar-brand">AMIC LAW</div>
        <nav class="sidebar-nav">
          ${["관리", "근무일정", "출퇴근기록"]
            .map((label) => `<div class="sidebar-group"><button class="sidebar-item sidebar-group-toggle"><span class="sidebar-icon"></span><span>${label}</span></button></div>`)
            .join("")}
          <div class="sidebar-group active">
            <button class="sidebar-item sidebar-group-toggle active"><span class="sidebar-icon"></span><span>휴가</span></button>
            <div class="sidebar-subnav">
              ${["휴가관리", "휴가 그룹/유형", "휴가 자동 발생", "휴가 사용 내역"]
                .map((label) => `<button class="sidebar-item sidebar-child"><span class="sidebar-icon"></span><span>${label}</span></button>`)
                .join("")}
            </div>
          </div>
        </nav>
        <button class="forest-sidebar-user">사용자</button>
      </aside>
      <main class="page-canvas">Content</main>
    </div>
  </div>`;

test("Forest login docks the AMIC accent logo at the form center", async () => {
  assert.match(amicLawLogo, /fill="#26C260"/);
  assert.doesNotMatch(amicLawLogo, /#0F3A32/i);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 768 } });
  try {
    const logoDataUrl = `data:image/svg+xml,${encodeURIComponent(amicLawLogo)}`;
    await page.setContent(`
      <html data-skin="forest">
        <body>
          <section class="matter-login-stage" data-login-intro="complete">
            <div class="matter-login-copy">
              <div class="matter-login-form-column">
                <div class="matter-login-logo-target">
                  <div class="matter-logo">
                    <img class="amic-law-logo" src="${logoDataUrl}" alt="AMIC Law">
                  </div>
                </div>
                <div class="matter-login-heading"><h1>Log in to matter</h1></div>
                <div class="matter-login-field">Email</div>
              </div>
            </div>
            <aside class="matter-login-photo-panel"></aside>
          </section>
        </body>
      </html>
    `);
    await page.addStyleTag({ content: styles });
    await page.locator(".amic-law-logo").waitFor({ state: "visible" });

    const geometry = await page.evaluate(() => {
      const bounds = (selector) => {
        const rect = document.querySelector(selector).getBoundingClientRect();
        return {
          left: rect.left,
          width: rect.width,
          center: rect.left + rect.width / 2
        };
      };
      return {
        logo: bounds(".amic-law-logo"),
        field: bounds(".matter-login-field")
      };
    });

    assert.ok(Math.abs(geometry.logo.center - geometry.field.center) <= 0.5, JSON.stringify(geometry));
  } finally {
    await browser.close();
  }
});

test("Forest login preserves its one-shot intro until the page is focused", async () => {
  const port = await availablePort();
  const server = await createServer({
    root: webRoot,
    logLevel: "silent",
    server: { host: "127.0.0.1", port, strictPort: true }
  });
  const browser = await chromium.launch({ headless: true });
  try {
    await server.listen();
    const baseUrl = server.resolvedUrls?.local?.[0];
    assert.ok(baseUrl);

    for (const reducedMotion of ["no-preference", "reduce"]) {
      const context = await browser.newContext({ viewport: { width: 1280, height: 768 }, reducedMotion });
      await context.addInitScript(() => {
        window.__lawosTestFocused = false;
        Object.defineProperty(document, "hasFocus", {
          configurable: true,
          value: () => window.__lawosTestFocused
        });
      });
      const page = await context.newPage();
      await page.goto(`${baseUrl}?view=auth&authStep=login`, { waitUntil: "networkidle" });
      const login = page.locator("[data-login-screen='forest-split']");
      await login.waitFor({ state: "attached" });
      assert.equal(await page.locator(".matter-login-intro-logo .amic-law-logo").count(), 2);
      await page.waitForTimeout(250);
      assert.deepEqual(await page.evaluate(() => ({
        state: document.querySelector("[data-login-screen='forest-split']")?.getAttribute("data-login-intro"),
        claim: sessionStorage.getItem("matter.login.intro.played.v1")
      })), { state: "pending", claim: null });

      await page.evaluate(() => {
        window.__lawosTestFocused = true;
        window.dispatchEvent(new Event("focus"));
      });
      if (reducedMotion === "no-preference") {
        await page.waitForFunction(
          () => document.querySelector("[data-login-screen='forest-split']")?.getAttribute("data-login-intro") === "play"
        );
        const motion = await page.evaluate(() => {
          const elements = {
            wrapper: document.querySelector(".matter-login-intro-logo"),
            a: document.querySelector(".matter-login-intro-a"),
            mic: document.querySelector(".matter-login-intro-mic"),
            layer: document.querySelector(".matter-login-intro"),
            photo: document.querySelector(".matter-login-photo-panel"),
            heading: document.querySelector(".matter-login-heading"),
            form: document.querySelector(".matter-login-form"),
            target: document.querySelector(".matter-login-logo-target")
          };
          const animations = Object.values(elements).flatMap((element) => element?.getAnimations() ?? []);
          animations.forEach((animation) => animation.pause());
          const setTime = (time) => animations.forEach((animation) => {
            animation.currentTime = time;
          });
          const sample = (time) => {
            setTime(time);
            const wrapper = elements.wrapper.getBoundingClientRect();
            return {
              center: [wrapper.left + wrapper.width / 2, wrapper.top + wrapper.height / 2],
              a: Number(getComputedStyle(elements.a).opacity),
              mic: Number(getComputedStyle(elements.mic).opacity),
              layer: Number(getComputedStyle(elements.layer).opacity),
              photo: Number(getComputedStyle(elements.photo).opacity),
              heading: Number(getComputedStyle(elements.heading).opacity),
              form: Number(getComputedStyle(elements.form).opacity),
              target: Number(getComputedStyle(elements.target).opacity)
            };
          };
          const result = {
            duration: getComputedStyle(document.querySelector("[data-login-screen='forest-split']"))
              .getPropertyValue("--forest-login-motion-duration").trim(),
            aOnly: sample(450),
            assembled: sample(1000),
            dockStart: sample(1092),
            dockEarly: sample(1140),
            dockMiddle: sample(1386),
            dockEnd: sample(1680),
            handoffMiddle: sample(1732.5),
            handoffEnd: sample(1785),
            contentMiddle: sample(1848)
          };
          setTime(2100);
          animations.forEach((animation) => animation.play());
          return result;
        });
        const distance = (from, to) => Math.hypot(to[0] - from[0], to[1] - from[1]);
        const dockDistance = distance(motion.dockStart.center, motion.dockEnd.center);
        const earlyProgress = distance(motion.dockStart.center, motion.dockEarly.center) / dockDistance;
        const middleProgress = distance(motion.dockStart.center, motion.dockMiddle.center) / dockDistance;
        assert.equal(motion.duration, "2100ms");
        assert.ok(motion.aOnly.a > 0.9 && motion.aOnly.mic < 0.1, JSON.stringify(motion.aOnly));
        assert.ok(motion.assembled.a > 0.9 && motion.assembled.mic > 0.9, JSON.stringify(motion.assembled));
        assert.ok(earlyProgress < 0.25, JSON.stringify({ earlyProgress, motion }));
        assert.ok(middleProgress > 0.25 && middleProgress < 0.85, JSON.stringify({ middleProgress, motion }));
        assert.ok(motion.dockMiddle.photo > 0.2 && motion.dockMiddle.photo < 0.95, JSON.stringify(motion.dockMiddle));
        assert.ok(motion.dockMiddle.heading < 0.01 && motion.dockMiddle.form < 0.01, JSON.stringify(motion.dockMiddle));
        assert.ok(motion.handoffMiddle.layer > 0 && motion.handoffMiddle.layer < 1, JSON.stringify(motion.handoffMiddle));
        assert.ok(motion.handoffMiddle.target > 0 && motion.handoffMiddle.target < 1, JSON.stringify(motion.handoffMiddle));
        assert.ok(motion.handoffEnd.layer < 0.01 && motion.handoffEnd.target > 0.99, JSON.stringify(motion.handoffEnd));
        assert.ok(motion.contentMiddle.heading > 0.2 && motion.contentMiddle.heading < 0.95, JSON.stringify(motion.contentMiddle));
        assert.ok(motion.contentMiddle.form > 0.2 && motion.contentMiddle.form < 0.95, JSON.stringify(motion.contentMiddle));
      }
      await page.waitForFunction(
        () => document.querySelector("[data-login-screen='forest-split']")?.getAttribute("data-login-intro") === "complete"
      );
      assert.equal(await page.evaluate(() => sessionStorage.getItem("matter.login.intro.played.v1")), "1");
      await context.close();
    }
  } finally {
    await browser.close();
    await server.close();
  }
});

test("Forest login completes email password recovery without exposing the one-time token", async () => {
  const port = await availablePort();
  const server = await createServer({
    root: webRoot,
    logLevel: "silent",
    server: { host: "127.0.0.1", port, strictPort: true }
  });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 768 } });
  const requestBodies = [];
  const resetToken = "dGVuYW50X2FtaWNfbWF0dGVyX3ZhdWx0.reset_token_for_browser_test";
  try {
    await server.listen();
    const baseUrl = server.resolvedUrls?.local?.[0];
    assert.ok(baseUrl);
    await context.addInitScript(() => {
      sessionStorage.setItem("matter.login.intro.played.v1", "1");
      window.matterSession = {
        onPasswordResetDeepLink(handler) {
          window.__emitPasswordResetDeepLink = handler;
          return () => {
            delete window.__emitPasswordResetDeepLink;
          };
        }
      };
    });
    const page = await context.newPage();
    await page.route("**/api/auth/password-reset/request", async (route) => {
      requestBodies.push(JSON.parse(route.request().postData() ?? "{}"));
      await route.fulfill({
        status: 202,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, accepted: true, token_material_returned: false })
      });
    });
    await page.route("**/api/auth/password-reset/confirm", async (route) => {
      requestBodies.push(JSON.parse(route.request().postData() ?? "{}"));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, accepted: true, activated: true, token_material_returned: false })
      });
    });

    await page.goto(`${baseUrl}?view=auth&authStep=login`, { waitUntil: "networkidle" });
    await page.locator("[data-login-forgot-password]").click();
    await page.locator("[data-login-recovery-state]").waitFor();
    assert.match(await page.locator("[data-login-recovery-state]").innerText(), /업무 이메일을 먼저 입력/);
    assert.equal(requestBodies.length, 0);

    await page.locator("[data-login-email]").fill("staff@amic.kr");
    await page.locator("[data-login-forgot-password]").click();
    await page.locator("[data-login-recovery-panel='sent']").waitFor();
    assert.match(
      await page.locator("[data-login-recovery-panel='sent']").innerText(),
      /등록 및 사용 가능한 계정이라면/
    );

    await page.evaluate((token) => {
      window.__emitPasswordResetDeepLink?.({
        type: "password_reset_confirm",
        routeOnly: true,
        token
      });
    }, resetToken);
    await page.locator("[data-login-form='password-reset']").waitFor();
    assert.equal((await page.locator("body").innerText()).includes(resetToken), false);

    await page.locator("[data-reset-new-password]").fill("new-password-123");
    await page.locator("[data-reset-confirm-password]").fill("different-pass-123");
    await page.locator("[data-login-form='password-reset'] .matter-login-submit").click();
    await page.locator("[data-login-recovery-state]").waitFor();
    assert.match(await page.locator("[data-login-recovery-state]").innerText(), /서로 다릅니다/);
    assert.equal(requestBodies.length, 1);

    await page.locator("[data-reset-confirm-password]").fill("new-password-123");
    await page.locator("[data-login-form='password-reset'] .matter-login-submit").click();
    await page.locator("[data-login-recovery-panel='success']").waitFor();
    await page.getByRole("button", { name: "로그인으로 돌아가기" }).click();
    await page.locator("[data-login-form='email-password']").waitFor();
    assert.equal(await page.locator("[data-login-password]").inputValue(), "");

    assert.deepEqual(requestBodies, [
      { email: "staff@amic.kr" },
      { token: resetToken, password: "new-password-123" }
    ]);
  } finally {
    await context.close();
    await browser.close();
    await server.close();
  }
});

test("global rail decorative motion preserves geometry and honors reduced motion", async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const geometry = () => page.evaluate(() => {
    const rect = (selector) => {
      const box = document.querySelector(selector).getBoundingClientRect();
      return [box.left, box.top, box.width, box.height].map((value) => Math.round(value * 100) / 100);
    };
    return {
      rail: rect(".global-rail"),
      action: rect('.global-rail-action[aria-label="Matter"]'),
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth
    };
  });

  try {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.setContent(`<html data-skin="forest"><body>${shellMarkup(false)}</body></html>`);
    await page.addStyleTag({ content: styles });
    await page.waitForTimeout(80);

    const initialGeometry = await geometry();
    const introAnimations = await page.locator(".global-rail").evaluate((rail) => (
      rail.getAnimations({ subtree: true }).map((animation) => animation.animationName)
    ));
    for (const animationName of [
      "global-rail-scan",
      "global-rail-brand-settle",
      "global-rail-brand-sweep",
      "global-rail-indicator-enter",
      "global-rail-indicator-breathe",
      "global-rail-indicator-echo"
    ]) {
      assert.equal(introAnimations.includes(animationName), true, animationName);
    }

    await page.locator('.global-rail-action[aria-label="Client"]').hover();
    await page.waitForTimeout(80);
    const hoverAnimations = await page.locator('.global-rail-action[aria-label="Client"]').evaluate((action) => (
      action.getAnimations({ subtree: true }).map((animation) => animation.animationName)
    ));
    assert.equal(hoverAnimations.includes("global-rail-icon-sweep"), true);
    await page.waitForTimeout(1500);
    assert.deepEqual(await geometry(), initialGeometry);

    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.waitForTimeout(40);
    const reduced = await page.locator(".global-rail").evaluate((rail) => {
      const brand = rail.querySelector(".global-rail-brand-mark");
      const active = rail.querySelector(".global-rail-action.active");
      return {
        animations: rail.getAnimations({ subtree: true }).length,
        brandOpacity: getComputedStyle(brand).opacity,
        brandTransform: getComputedStyle(brand).transform,
        indicatorOpacity: getComputedStyle(active, "::after").opacity,
        indicatorTransform: getComputedStyle(active, "::after").transform,
        scanDisplay: getComputedStyle(rail, "::after").display
      };
    });
    assert.deepEqual(reduced, {
      animations: 0,
      brandOpacity: "1",
      brandTransform: "none",
      indicatorOpacity: "1",
      indicatorTransform: "none",
      scanDisplay: "none"
    });
  } finally {
    await browser.close();
  }
});

for (const width of [1440, 1180, 820, 390]) {
  for (const modeException of [false, true]) {
    test(`forest global rail shell fits ${width}x700${modeException ? " mode exception" : ""}`, async () => {
      const browser = await chromium.launch({ headless: true });
      const page = await browser.newPage({ viewport: { width, height: 700 } });
      try {
        await page.setContent(`<html data-skin="forest"><body>${shellMarkup(modeException)}</body></html>`);
        await page.addStyleTag({ content: styles });
        await page.waitForTimeout(250);

        const geometry = await page.evaluate(() => {
          const rect = (selector) => {
            const box = document.querySelector(selector).getBoundingClientRect();
            return { top: box.top, right: box.right, bottom: box.bottom, left: box.left, width: box.width, height: box.height };
          };
          return {
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight,
            frame: rect(".app-frame"),
            rail: rect(".global-rail"),
            sidebar: rect(".sidebar"),
            canvas: rect(".page-canvas"),
            profile: rect(".forest-sidebar-user"),
            horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
            axes: [...document.querySelectorAll(".global-rail-nav .global-rail-action")].map((item) => {
              const style = getComputedStyle(item);
              return {
                label: item.getAttribute("aria-label"),
                color: style.color,
                width: item.getBoundingClientRect().width,
                height: item.getBoundingClientRect().height
              };
            })
          };
        });

        assert.deepEqual(geometry.axes.map((item) => item.label), ["Home", "Client", "Matter", "People", "Search", "Portal"]);
        for (const item of geometry.axes) {
          assert.equal(item.color, item.label === "Matter" ? "rgb(255, 255, 255)" : "rgba(255, 255, 255, 0.72)");
          assert.equal(item.width, 40);
          assert.equal(item.height, 40);
        }
        assert.ok(Math.abs(geometry.rail.left) < 0.5, JSON.stringify(geometry));
        assert.equal(geometry.rail.width, 56);
        assert.equal(geometry.rail.height, geometry.viewportHeight);
        assert.equal(geometry.sidebar.left, 56);
        assert.equal(geometry.sidebar.width, 214);
        assert.ok(geometry.sidebar.bottom <= geometry.viewportHeight + 0.5, JSON.stringify(geometry));
        assert.ok(geometry.profile.bottom <= geometry.viewportHeight + 0.5, JSON.stringify(geometry));
        assert.equal(geometry.frame.height, geometry.viewportHeight);
        assert.equal(geometry.sidebar.height, geometry.viewportHeight);
        assert.equal(geometry.canvas.left, width >= 1200 ? 270 : 56);
        assert.equal(geometry.horizontalOverflow, false);
      } finally {
        await browser.close();
      }
    });
  }
}

for (const width of [720, 480]) {
  test(`People leave drawer navigation stays vertical without clipping at ${width}px`, async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width, height: 800 } });
    try {
      await page.setContent(`<html data-skin="forest"><body>${peopleLeaveSidebarMarkup}</body></html>`);
      await page.addStyleTag({ content: styles });

      const geometry = await page.evaluate(() => {
        const viewportWidth = document.documentElement.clientWidth;
        const rows = new Set();
        const children = [...document.querySelectorAll(".sidebar-subnav .sidebar-child")].map((item) => {
          const rect = item.getBoundingClientRect();
          rows.add(Math.round(rect.top));
          return { left: rect.left, right: rect.right, width: rect.width };
        });
        const nav = document.querySelector(".sidebar-nav");
        return {
          viewportWidth,
          documentWidth: document.documentElement.scrollWidth,
          navClientWidth: nav.clientWidth,
          navScrollWidth: nav.scrollWidth,
          rows: rows.size,
          children
        };
      });

      assert.ok(geometry.documentWidth <= geometry.viewportWidth, JSON.stringify(geometry));
      assert.ok(geometry.navScrollWidth <= geometry.navClientWidth + 0.5, JSON.stringify(geometry));
      assert.equal(geometry.rows, 4, JSON.stringify(geometry));
      for (const child of geometry.children) {
        assert.ok(child.left >= 0 && child.right <= geometry.viewportWidth + 0.5, JSON.stringify(geometry));
        assert.ok(child.width > 0, JSON.stringify(geometry));
      }
    } finally {
      await browser.close();
    }
  });
}
