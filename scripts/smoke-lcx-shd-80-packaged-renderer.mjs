#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path, { dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { _electron as electron } from "playwright";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const packagedAppRoot = path.join(repoRoot, "apps/desktop/dist/mac/matter.app");
const packagedMacExecutablePath = path.join(packagedAppRoot, "Contents/MacOS/matter");
const packagedRendererIndexPath = path.join(packagedAppRoot, "Contents/Resources/app/src/renderer/web/index.html");
const artifactDir = path.join(repoRoot, "docs/lazycodex/evidence/matter-desktop/artifacts");
const screenshotPath = path.join(artifactDir, "lcx-shd-80-packaged-renderer-smoke-2026-07-08.png");
const resultPath = path.join(artifactDir, "lcx-shd-80-packaged-renderer-smoke-2026-07-08.json");

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

async function fileRecord(filePath) {
  assert.equal(existsSync(filePath), true, `${filePath} must exist`);
  const body = await readFile(filePath);
  const fileStat = await stat(filePath);
  return {
    path: path.relative(repoRoot, filePath),
    bytes: fileStat.size,
    sha256: sha256(body)
  };
}

async function main() {
  await mkdir(artifactDir, { recursive: true });
  const executable = await fileRecord(packagedMacExecutablePath);
  const renderer = await fileRecord(packagedRendererIndexPath);
  const rendererUrl = new URL(pathToFileURL(packagedRendererIndexPath).toString());
  rendererUrl.searchParams.set("desktop", "1");
  rendererUrl.searchParams.set("view", "home");
  rendererUrl.searchParams.set("data", "live");
  rendererUrl.searchParams.set("ctx", "allow");
  rendererUrl.searchParams.set("splash", "0");
  rendererUrl.hash = "home-dashboard";

  const consoleEvents = [];
  const app = await electron.launch({
    executablePath: packagedMacExecutablePath,
    args: [],
    env: {
      ...process.env,
      MATTER_DESKTOP_RENDERER_URL: rendererUrl.toString()
    },
    timeout: 30_000
  });

  try {
    const page = await app.firstWindow({ timeout: 30_000 });
    page.on("console", (message) => {
      if (["error", "warning"].includes(message.type())) {
        consoleEvents.push({
          type: message.type(),
          text: message.text().slice(0, 500)
        });
      }
    });

    await page.waitForSelector("[data-home-dashboard-shell='true']", { timeout: 30_000 });
    await page.waitForSelector("[data-home-dashboard-grid='true']", { timeout: 30_000 });
    await page.waitForSelector("[data-product-axis-nav='global-rail']", { timeout: 30_000 });
    await page.screenshot({ path: screenshotPath, fullPage: true });

    const snapshot = await page.evaluate(async () => {
      const text = document.body.textContent ?? "";
      const nav = document.querySelector("[data-product-axis-nav='global-rail']");
      const navRect = nav?.getBoundingClientRect();
      const portal = Array.from(document.querySelectorAll("[data-product-axis]")).find((node) =>
        node.textContent?.trim().toLowerCase() === "portal"
      );
      const portalRect = portal?.getBoundingClientRect();
      const sidebarLabels = Array.from(document.querySelectorAll(".sidebar-nav .sidebar-item")).map((node) =>
        node.textContent?.replace(/\s+/g, " ").trim() ?? ""
      );
      const bridge = window.matterSession;
      let bridgeStatus = null;
      try {
        bridgeStatus = typeof bridge?.status === "function" ? await bridge.status() : null;
      } catch (error) {
        bridgeStatus = { state: "error", message: String(error?.message ?? error) };
      }
      const positiveReleaseClaimPattern = /\b(public[- ]release|production go-live|owner approval|owner-approved)\b\s*[:|]\s*(true|approved|ready|yes|pass)\b/i;
      return {
        url: window.location.href,
        home_dashboard_shell: Boolean(document.querySelector("[data-home-dashboard-shell='true']")),
        home_dashboard_grid: Boolean(document.querySelector("[data-home-dashboard-grid='true']")),
        home_dashboard_rail: Boolean(document.querySelector("[data-home-dashboard-rail='true']")),
        widget_ids: Array.from(document.querySelectorAll("[data-widget-id]")).map((node) =>
          node.getAttribute("data-widget-id")
        ),
        global_rail_refresh_trigger_count: document.querySelectorAll("[data-global-refresh-trigger='true']").length,
        visible_refresh_button_texts: Array.from(document.querySelectorAll("button")).map((node) =>
          node.textContent?.replace(/\s+/g, " ").trim() ?? ""
        ).filter((label) => /새로고침/.test(label)),
        legacy_hero_refresh_class_count: document.querySelectorAll(".forest-hero-refresh-button").length,
        global_rail_nav: {
          labels: Array.from(document.querySelectorAll("[data-product-axis]")).map((node) =>
            node.textContent?.replace(/\s+/g, " ").trim() ?? ""
          ),
          axis_ids: Array.from(document.querySelectorAll("[data-product-axis]")).map((node) =>
            node.getAttribute("data-product-axis")
          ),
          active_axis: document.querySelector("[data-product-axis][aria-current='page']")?.getAttribute("data-product-axis") ?? "",
          active_axis_count: document.querySelectorAll("[data-product-axis][aria-current='page']").length,
          portal_fully_visible: Boolean(portalRect && navRect && portalRect.top >= navRect.top - 1 && portalRect.bottom <= navRect.bottom + 1),
          nav_vertical_overflow: nav ? nav.scrollHeight > nav.clientHeight : false
        },
        sidebar: {
          state: document.querySelector(".app-frame")?.getAttribute("data-sidebar-state") ?? "",
          duplicated_product_axis_labels: sidebarLabels.filter((label) =>
            ["Home", "Client", "Matter", "People", "Vault", "Portal"].includes(label)
          )
        },
        matter_session_bridge_present: Boolean(
          bridge &&
            typeof bridge.status === "function" &&
            typeof bridge.api === "function" &&
            typeof bridge.login === "function"
        ),
        matter_session_status_state: bridgeStatus?.state ?? null,
        release_boundary_ui_has_no_positive_claim: !positiveReleaseClaimPattern.test(text),
        no_dummy_visible: !/mock|dummy|sample|synthetic|Project Atlas|Alex Smith|Riverstone/i.test(text),
        horizontal_overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        body_character_count: text.length
      };
    });

    assert.equal(snapshot.url.startsWith(pathToFileURL(packagedRendererIndexPath).toString()), true, "renderer must load from the packaged app bundle");
    assert.equal(snapshot.home_dashboard_shell, true, "Home dashboard shell must render");
    assert.equal(snapshot.home_dashboard_grid, true, "Home dashboard grid must render");
    assert.equal(snapshot.home_dashboard_rail, true, "Home dashboard rail must render");
    assert.deepEqual(snapshot.widget_ids.sort(), ["approval", "calendar", "feed", "todo"].sort(), "the four Home dashboard widgets must render without the removed system card");
    assert.equal(snapshot.global_rail_refresh_trigger_count, 1, "global rail must expose exactly one refresh icon trigger");
    assert.deepEqual(snapshot.visible_refresh_button_texts, [], "page surfaces must not render visible refresh text buttons");
    assert.equal(snapshot.legacy_hero_refresh_class_count, 0, "legacy hero refresh buttons must not render");
    assert.deepEqual(snapshot.global_rail_nav.labels, ["Home", "Client", "Matter", "People", "Search", "Portal"], "global rail must show the six-axis Portal IA");
    assert.deepEqual(snapshot.global_rail_nav.axis_ids, ["home", "clients", "matters", "people", "vault", "portal"], "global rail axis IDs must match the six-axis Portal IA");
    assert.equal(snapshot.global_rail_nav.active_axis_count, 1, "exactly one product axis must be active");
    assert.equal(snapshot.global_rail_nav.active_axis, "home", "Home must be the active product axis");
    assert.equal(snapshot.global_rail_nav.portal_fully_visible, true, "Portal axis must be fully visible");
    assert.equal(snapshot.global_rail_nav.nav_vertical_overflow, false, "global rail nav must not vertically overflow");
    assert.deepEqual(snapshot.sidebar.duplicated_product_axis_labels, [], "contextual sidebar must not duplicate product-axis labels");
    assert.equal(snapshot.matter_session_bridge_present, true, "packaged renderer must expose the desktop matterSession bridge");
    assert.equal(snapshot.release_boundary_ui_has_no_positive_claim, true, "UI must not claim public release, go-live, or owner approval");
    assert.equal(snapshot.no_dummy_visible, true, "UI must not show dummy/sample/synthetic placeholders");
    assert.equal(snapshot.horizontal_overflow, false, "packaged renderer must not horizontally overflow");

    const result = {
      verdict: "PASS",
      objective: "LCX-SHD-80",
      generated_at: new Date().toISOString(),
      packaged_app: {
        root: path.relative(repoRoot, packagedAppRoot),
        executable,
        renderer
      },
      renderer_url: rendererUrl.toString(),
      screenshot: path.relative(repoRoot, screenshotPath),
      snapshot,
      console_events: consoleEvents,
      non_claims: {
        public_release: false,
        production_go_live: false,
        owner_approval: false
      }
    };
    await writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`);
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await app.close().catch(() => {});
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
