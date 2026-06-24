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

function compactText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function createSurfaceCheck({ name, url, selector }) {
  return {
    name,
    url,
    run: async (page) => {
      await page.waitForSelector(selector, { timeout: 15000 });
      const stateText = await page.locator(selector).first().innerText().catch(() => "");
      return { passed: true, detail: { selector, state_text: compactText(stateText).slice(0, 240) } };
    }
  };
}

const liveChecks = [
  {
    name: "home-command-center-cards",
    url: "/?locale=en&view=home&desktop=1&data=live&ctx=allow",
    run: async (page) => {
      await page.waitForSelector("[data-lcx-web-command-center='true']", { timeout: 15000 });
      const capabilityCards = await page.locator("[data-capability-id]").count();
      const workAreaLabels = await page.$$eval("[data-capability-id] h2", (nodes) => nodes.map((node) => node.textContent.replace(/\s+/g, " ").trim()));
      const openButtons = await page.locator(".work-area-open").count();
      return {
        passed: capabilityCards === 4 && workAreaLabels.length === 4 && openButtons === 4,
        detail: { capability_cards: capabilityCards, work_area_labels: workAreaLabels, open_buttons: openButtons }
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
      return { passed: stateText.includes("접근 권한이 없습니다"), detail: { state_text: compactText(stateText) } };
    }
  },
  {
    name: "clients-review-visible",
    url: "/?locale=en&view=clients&data=live&ctx=review",
    run: async (page) => {
      await page.waitForSelector(".live-data-review", { timeout: 15000 });
      const stateText = await page.locator(".live-data-review").innerText();
      return { passed: stateText.includes("검토가 필요합니다"), detail: { state_text: compactText(stateText) } };
    }
  },
  {
    name: "vault-denied-visible",
    url: "/?locale=en&view=vault&data=live&ctx=denied",
    run: async (page) => {
      await page.waitForSelector(".live-data-denied", { timeout: 15000 });
      const stateText = await page.locator(".live-data-denied").innerText();
      return { passed: stateText.includes("접근 권한이 없습니다"), detail: { state_text: compactText(stateText) } };
    }
  },
  {
    name: "home-product-axis-state-visible",
    url: "/?locale=en&view=home&data=live&ctx=allow",
    run: async (page) => {
      await page.waitForSelector("[data-lcx-web-command-center='true']", { timeout: 15000 });
      const capabilityCards = await page.locator("[data-capability-id]").count();
      const workAreaLabels = await page.$$eval("[data-capability-id] h2", (nodes) => nodes.map((node) => node.textContent.replace(/\s+/g, " ").trim()));
      const openButtons = await page.locator(".work-area-open").count();
      return { passed: capabilityCards === 4 && workAreaLabels.length === 4 && openButtons === 4, detail: { capability_cards: capabilityCards, work_area_labels: workAreaLabels, open_buttons: openButtons } };
    }
  },
  createSurfaceCheck({
    name: "matters-live-surface-no-5xx",
    url: "/?locale=ko&view=matters&data=live&ctx=allow",
    selector: "[data-cmp-g4-live-matters='true']"
  }),
  createSurfaceCheck({
    name: "people-directory-live-surface-no-5xx",
    url: "/?locale=ko&view=people&data=live&ctx=allow#people-directory",
    selector: "[data-hrx-api-backed='true']"
  }),
  createSurfaceCheck({
    name: "people-members-live-surface-no-5xx",
    url: "/?locale=ko&view=people&data=live&ctx=allow#people-members",
    selector: "[data-hrx-api-backed='true']"
  }),
  createSurfaceCheck({
    name: "vault-live-surface-no-5xx",
    url: "/?locale=ko&view=vault&data=live&ctx=allow",
    selector: "[data-cmp-g5-vault-surface='true']"
  }),
  createSurfaceCheck({
    name: "client-intake-live-surface-no-5xx",
    url: "/?locale=ko&view=clients&data=live&ctx=allow#client-intake",
    selector: "[data-cmp-g2-live-clients='true']"
  }),
  createSurfaceCheck({
    name: "client-data-cloud-live-surface-no-5xx",
    url: "/?locale=ko&view=clients&data=live&ctx=allow#client-data",
    selector: "[data-cmp-g2-live-clients='true']"
  }),
  createSurfaceCheck({
    name: "client-reports-live-surface-no-5xx",
    url: "/?locale=ko&view=clients&data=live&ctx=allow#client-reports",
    selector: "[data-cmp-g2-live-clients='true']"
  })
];

fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const consoleErrors = [];
const apiResponses = [];
const apiServerErrors = [];
let currentCheckName = null;
page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});
page.on("response", async (response) => {
  const responseUrl = response.url();
  if (!/\/(?:api|master-data)(?:\/|\?|$)/.test(responseUrl)) return;
  const entry = {
    check: currentCheckName ?? "unknown",
    method: response.request().method(),
    status: response.status(),
    url: responseUrl.replace(baseUrl, "")
  };
  apiResponses.push(entry);
  if (entry.status >= 500) {
    let body = "";
    try {
      body = await response.text();
    } catch (caught) {
      body = `body_unavailable:${caught.message}`;
    }
    apiServerErrors.push({ ...entry, body: compactText(body).slice(0, 1200) });
  }
});

const results = [];
for (const check of liveChecks) {
  let passed = false;
  let detail = null;
  let error = null;
  const serverErrorStart = apiServerErrors.length;
  currentCheckName = check.name;
  try {
    await page.goto(`${baseUrl}${check.url}`, { waitUntil: "networkidle" });
    const outcome = await check.run(page);
    await page.waitForTimeout(250);
    const serverErrors = apiServerErrors.slice(serverErrorStart);
    passed = outcome.passed && serverErrors.length === 0;
    detail = { ...outcome.detail, api_5xx_count: serverErrors.length, api_5xx: serverErrors };
  } catch (caught) {
    error = caught.message;
    const serverErrors = apiServerErrors.slice(serverErrorStart);
    detail = { api_5xx_count: serverErrors.length, api_5xx: serverErrors };
  }
  currentCheckName = null;
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
  api_response_count: apiResponses.length,
  api_server_errors: apiServerErrors,
  console_errors_recorded_not_gated: consoleErrors,
  results
};

const md = `# LCX-WEB Live Data Verification

Generated at: ${verification.generated_at}

Overall result: ${passed ? "PASS" : "FAIL"}

Preconditions: api and web dev server are already running. Live mode uses \`?data=live\`; unavailable, denied, review, and guarded states remain visible instead of falling back to hidden local data.
Any HTTP 5xx response from \`/api\` or \`/master-data\` fails its check.

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

## API 5xx responses

${apiServerErrors.length ? apiServerErrors.map((entry) => `- ${entry.check} ${entry.method} ${entry.status} ${entry.url}: ${entry.body}`).join("\n") : "- None"}
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
