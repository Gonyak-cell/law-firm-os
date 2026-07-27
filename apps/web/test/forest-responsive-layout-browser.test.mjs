import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { chromium } from "playwright";
import { createServer } from "vite";

const testDir = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(testDir, "..");
const styles = await readFile(resolve(testDir, "../src/styles.css"), "utf8");
const amicLawLogo = await readFile(resolve(testDir, "../src/assets/amic-law.svg"), "utf8");

const shellMarkup = (modeException) => `
  <div class="matter-app">
    <header class="topbar">
      <nav class="top-axis-nav">
        ${["Home", "Client", "Matter", "People", "Search", "Portal"]
          .map((label) => `<button class="top-axis-item${label === "Matter" ? " active" : ""}">${label}</button>`)
          .join("")}
      </nav>
      <label class="global-search"><input aria-label="search"></label>
      <button class="primary-button">New</button>
      <div class="top-actions"><button>Action</button></div>
    </header>
    <div class="app-frame">
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
    <header class="topbar">
      <nav class="top-axis-nav">
        ${["Home", "Client", "Matter", "People", "Search", "Portal"]
          .map((label) => `<button class="top-axis-item${label === "People" ? " active" : ""}">${label}</button>`)
          .join("")}
      </nav>
      <label class="global-search"><input aria-label="search"></label>
      <div class="top-actions"><button>Action</button></div>
    </header>
    <div class="app-frame">
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
  const server = await createServer({
    root: webRoot,
    logLevel: "silent",
    server: { host: "127.0.0.1", port: 0, strictPort: true }
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

for (const width of [1280, 1180, 1024, 820]) {
  for (const modeException of [false, true]) {
    test(`forest shell fits ${width}x700${modeException ? " mode exception" : ""}`, async () => {
      const browser = await chromium.launch({ headless: true });
      const page = await browser.newPage({ viewport: { width, height: 700 } });
      try {
        await page.setContent(`<html data-skin="forest"><body>${shellMarkup(modeException)}</body></html>`);
        await page.addStyleTag({ content: styles });

        const geometry = await page.evaluate(() => {
          const rect = (selector) => {
            const box = document.querySelector(selector).getBoundingClientRect();
            return { top: box.top, bottom: box.bottom, height: box.height };
          };
          return {
            viewportHeight: window.innerHeight,
            topbar: rect(".topbar"),
            frame: rect(".app-frame"),
            sidebar: rect(".sidebar"),
            profile: rect(".forest-sidebar-user"),
            axes: [...document.querySelectorAll(".top-axis-item")].map((item) => {
              const style = getComputedStyle(item);
              return {
                label: item.textContent,
                color: style.color,
                fontWeight: style.fontWeight,
                textTransform: style.textTransform
              };
            })
          };
        });

        assert.deepEqual(geometry.axes.map((item) => item.label), ["Home", "Client", "Matter", "People", "Search", "Portal"]);
        for (const item of geometry.axes) {
          assert.equal(item.color, "rgb(0, 0, 0)");
          assert.equal(item.fontWeight, item.label === "Matter" ? "700" : "400");
          assert.equal(item.textTransform, "none");
        }
        assert.ok(geometry.sidebar.bottom <= geometry.viewportHeight + 0.5, JSON.stringify(geometry));
        assert.ok(geometry.profile.bottom <= geometry.viewportHeight + 0.5, JSON.stringify(geometry));
        if (width >= 821 && width <= 1180) {
          assert.ok(geometry.topbar.height >= 90, JSON.stringify(geometry));
          assert.equal(geometry.frame.height, 648);
          assert.equal(geometry.sidebar.height, 648);
        }
      } finally {
        await browser.close();
      }
    });
  }
}

for (const width of [720, 480]) {
  test(`People leave navigation wraps without clipping at ${width}px`, async () => {
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
      assert.equal(geometry.rows, 2, JSON.stringify(geometry));
      for (const child of geometry.children) {
        assert.ok(child.left >= 0 && child.right <= geometry.viewportWidth + 0.5, JSON.stringify(geometry));
        assert.ok(child.width > 0, JSON.stringify(geometry));
      }
    } finally {
      await browser.close();
    }
  });
}
