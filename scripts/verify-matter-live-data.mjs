import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

if (process.argv.includes("--help")) {
  console.log(`verify-matter-live-data.mjs - canonical live-state proof for apps/web.

Assumes BOTH servers are already running:
  api:  node apps/api/src/server.js          (127.0.0.1:4180)
  web:  npm --workspace apps/web run dev     (127.0.0.1:5173, dev proxy enabled)

Run:  node scripts/verify-matter-live-data.mjs
Evidence is written to docs/lazycodex/evidence/matter-web/artifacts/live-data-verification.{json,md}.`);
  process.exit(0);
}

const root = process.cwd();
const outDir = path.join(root, "docs", "lazycodex", "evidence", "matter-web", "artifacts");
const baseUrl = process.env.MATTER_UI_URL ?? "http://127.0.0.1:5173";

const liveChecks = [
  {
    name: "home-command-center-cards",
    url: "/?locale=en&view=home&desktop=1&data=live&ctx=allow",
    run: async (page) => {
      await page.waitForSelector("[data-lcx-web-command-center='true']", { timeout: 15000 });
      const capabilityCards = await page.locator("[data-capability-id]").count();
      const releaseBoundary = await page.getByText("production go-live: false", { exact: false }).count();
      const statusLabels = await page.$$eval(".capability-status", (nodes) => nodes.map((node) => node.textContent.replace(/\s+/g, " ").trim()));
      return {
        passed: capabilityCards === 4 && releaseBoundary > 0 && statusLabels.length === 4,
        detail: { capability_cards: capabilityCards, release_boundary_visible: releaseBoundary > 0, status_labels: statusLabels }
      };
    }
  },
  {
    name: "clients-live-or-unavailable",
    url: "/?locale=en&view=clients&data=live&ctx=allow",
    run: async (page) => {
      await page.waitForSelector(".live-data-state, .data-table", { timeout: 15000 });
      const denied = await page.locator(".live-data-denied").count();
      const review = await page.locator(".live-data-review").count();
      const unavailable = await page.locator(".live-data-unavailable").count();
      const empty = await page.locator(".live-data-empty").count();
      const tableRows = await page.locator(".data-table tbody tr").count();
      return { passed: denied + review + unavailable + empty + tableRows > 0, detail: { denied, review, unavailable, empty, table_rows: tableRows } };
    }
  },
  {
    name: "clients-denied-visible",
    url: "/?locale=en&view=clients&data=live&ctx=denied",
    run: async (page) => {
      await page.waitForSelector(".live-data-denied", { timeout: 15000 });
      const stateText = await page.locator(".live-data-denied").innerText();
      return { passed: stateText.includes("Access denied"), detail: { state_text: stateText.replace(/\s+/g, " ").trim() } };
    }
  },
  {
    name: "clients-review-visible",
    url: "/?locale=en&view=clients&data=live&ctx=review",
    run: async (page) => {
      await page.waitForSelector(".live-data-review", { timeout: 15000 });
      const stateText = await page.locator(".live-data-review").innerText();
      return { passed: stateText.includes("Review required"), detail: { state_text: stateText.replace(/\s+/g, " ").trim() } };
    }
  },
  {
    name: "vault-denied-visible",
    url: "/?locale=en&view=vault&data=live&ctx=denied",
    run: async (page) => {
      await page.waitForSelector(".live-data-denied", { timeout: 15000 });
      const stateText = await page.locator(".live-data-denied").innerText();
      return { passed: stateText.includes("Access denied"), detail: { state_text: stateText.replace(/\s+/g, " ").trim() } };
    }
  },
  {
    name: "home-release-boundary-visible",
    url: "/?locale=en&view=home&data=live&ctx=allow",
    run: async (page) => {
      await page.waitForSelector("[data-lcx-web-command-center='true']", { timeout: 15000 });
      const boundary = await page.getByText("production go-live: false", { exact: false }).count();
      return { passed: boundary > 0, detail: { production_go_live_false_visible: boundary > 0 } };
    }
  }
];

fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const consoleErrors = [];
page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});

const results = [];
for (const check of liveChecks) {
  let passed = false;
  let detail = null;
  let error = null;
  try {
    await page.goto(`${baseUrl}${check.url}`, { waitUntil: "networkidle" });
    const outcome = await check.run(page);
    passed = outcome.passed;
    detail = outcome.detail;
  } catch (caught) {
    error = caught.message;
  }
  results.push({ name: check.name, url: check.url, passed, detail, error });
}

await browser.close();

const passed = results.every((result) => result.passed);
const verification = {
  schema_version: "matter.lcx-web.live-data-verification.v1",
  generated_at: new Date().toISOString(),
  base_url: baseUrl,
  api_base: "http://127.0.0.1:4180 via vite dev proxy",
  source_of_truth: "apps/web",
  passed,
  console_errors_recorded_not_gated: consoleErrors,
  results
};

const md = `# LCX-WEB Live Data Verification

Generated at: ${verification.generated_at}

Overall result: ${passed ? "PASS" : "FAIL"}

Preconditions: api and web dev server are already running. Live mode uses \`?data=live\`; unavailable, denied, review, and guarded states remain visible instead of falling back to hidden local data.

## Checks

| Check | URL | Result | Detail |
| --- | --- | --- | --- |
${results
  .map(
    (result) =>
      `| ${result.name} | \`${result.url}\` | ${result.passed ? "PASS" : "FAIL"} | ${
        result.error ? `error: ${result.error}` : JSON.stringify(result.detail)
      } |`
  )
  .join("\n")}

## Console messages of type error

Recorded for operator review. Denied/review flows may produce expected non-2xx network messages.

${consoleErrors.length ? consoleErrors.map((error) => `- ${error}`).join("\n") : "- None"}
`;

fs.writeFileSync(path.join(outDir, "live-data-verification.json"), `${JSON.stringify(verification, null, 2)}\n`);
fs.writeFileSync(path.join(outDir, "live-data-verification.md"), md);

console.log(`live data verification: ${passed ? "PASS" : "FAIL"}`);
for (const result of results) {
  console.log(`${result.passed ? "PASS" : "FAIL"} ${result.name}${result.error ? ` (${result.error})` : ""}`);
}
if (!passed) {
  process.exitCode = 1;
}
