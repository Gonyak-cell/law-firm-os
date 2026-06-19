// Live-data verification for the matter web app P5 user-profiles-list surface.
//
// PRECONDITIONS (this script starts nothing itself):
//   1. apps/api running:        node apps/api/src/server.js        (http://127.0.0.1:4180)
//   2. web dev server running:  npm --workspace apps/web run dev   (http://127.0.0.1:5173)
//      Live mode requires the Vite DEV server (vite preview ignores server.proxy).
//
// Checks (all locale=en pinned):
//   a. ?data=live renders the live table with >=1 row containing "AMIC Synthetic Client"
//      and the live-specific columns Name/Type/Status/Owner/Matter.
//   b. ?data=live&ctx=denied renders the denied state.
//   c. ?data=live&ctx=review renders the review-required state.
//   d. the mock route (no data param) still renders the original Amplitude mock columns.
//
// Evidence: docs/ui-reference/amplitude-feb-2025/visual-parity/live-data-verification.{json,md}
// Exits non-zero on any failure.
//
// Usage: node scripts/verify-matter-live-data.mjs [--help]
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

if (process.argv.includes("--help")) {
  console.log(`verify-matter-live-data.mjs — live-data proof for the P5 user-profiles-list surface.

Assumes BOTH servers are already running:
  api:  node apps/api/src/server.js            (127.0.0.1:4180)
  web:  npm --workspace apps/web run dev       (127.0.0.1:5173, dev server only — preview has no proxy)

Run:  node scripts/verify-matter-live-data.mjs
Evidence is written to docs/ui-reference/amplitude-feb-2025/visual-parity/live-data-verification.{json,md}.`);
  process.exit(0);
}

const root = process.cwd();
const outDir = path.join(root, "docs", "ui-reference", "amplitude-feb-2025", "visual-parity");
const baseUrl = process.env.MATTER_UI_URL ?? "http://127.0.0.1:5173";

const LIVE_COLUMNS = ["Name", "Type", "Status", "Owner", "Matter"];
const MOCK_COLUMNS = ["User", "ID", "First Seen", "Location", "Country", "Sessions"];

async function readTable(page) {
  const tableCount = await page.locator(".data-table").count();
  if (tableCount === 0) return { columns: [], rows: [] };
  const columns = await page.$$eval(".data-table thead th", (cells) => cells.map((cell) => cell.textContent.trim()));
  const rows = await page.$$eval(".data-table tbody tr", (trs) =>
    trs.map((tr) => Array.from(tr.querySelectorAll("td"), (td) => td.textContent.trim()))
  );
  return { columns, rows };
}

const checks = [
  {
    name: "live-allow-table",
    url: "/?locale=en&view=profiles&variant=userList&data=live",
    description: "Live table renders >=1 row containing \"AMIC Synthetic Client\" with live columns",
    run: async (page) => {
      await page.waitForSelector(".data-table tbody tr", { timeout: 15000 });
      const table = await readTable(page);
      const matchingRows = table.rows.filter((row) => row.some((cell) => cell.includes("AMIC Synthetic Client")));
      const columnsMatch = JSON.stringify(table.columns) === JSON.stringify(LIVE_COLUMNS);
      return {
        passed: matchingRows.length >= 1 && columnsMatch,
        detail: {
          columns: table.columns,
          columns_match_live_set: columnsMatch,
          row_count: table.rows.length,
          rows_containing_amic_synthetic_client: matchingRows.length
        }
      };
    }
  },
  {
    name: "live-denied-state",
    url: "/?locale=en&view=profiles&variant=userList&data=live&ctx=denied",
    description: "ctx=denied renders the denied state (no table, no mock rows)",
    run: async (page) => {
      await page.waitForSelector(".live-data-denied", { timeout: 15000 });
      const deniedText = await page.locator(".live-data-denied").innerText();
      const tableCount = await page.locator(".data-table").count();
      return {
        passed: deniedText.includes("Access denied") && tableCount === 0,
        detail: { state_text: deniedText.replace(/\s+/g, " ").trim(), table_count: tableCount }
      };
    }
  },
  {
    name: "live-review-state",
    url: "/?locale=en&view=profiles&variant=userList&data=live&ctx=review",
    description: "ctx=review renders the review-required state (no table, no mock rows)",
    run: async (page) => {
      await page.waitForSelector(".live-data-review", { timeout: 15000 });
      const reviewText = await page.locator(".live-data-review").innerText();
      const tableCount = await page.locator(".data-table").count();
      return {
        passed: reviewText.includes("Review required") && tableCount === 0,
        detail: { state_text: reviewText.replace(/\s+/g, " ").trim(), table_count: tableCount }
      };
    }
  },
  {
    name: "mock-route-unchanged",
    url: "/?locale=en&view=profiles&variant=userList",
    description: "Mock route still renders the original mock columns and no live-state element",
    run: async (page) => {
      await page.waitForSelector(".data-table tbody tr", { timeout: 15000 });
      const table = await readTable(page);
      const columnsMatch = JSON.stringify(table.columns) === JSON.stringify(MOCK_COLUMNS);
      const liveStateCount = await page.locator(".live-data-state").count();
      return {
        passed: columnsMatch && table.rows.length >= 1 && liveStateCount === 0,
        detail: {
          columns: table.columns,
          columns_match_mock_set: columnsMatch,
          row_count: table.rows.length,
          live_state_element_count: liveStateCount
        }
      };
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
for (const check of checks) {
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
  results.push({ name: check.name, url: check.url, description: check.description, passed, detail, error });
}

await browser.close();

const passed = results.every((result) => result.passed);
const verification = {
  schema_version: "matter.amplitude.live-data-verification.v1",
  generated_at: new Date().toISOString(),
  base_url: baseUrl,
  api_base: "http://127.0.0.1:4180 (via vite dev proxy, relative /master-data)",
  passed,
  // The denied/review checks intentionally trigger non-2xx API responses; the
  // browser logs those as resource errors. Recorded for evidence, not gated.
  console_errors: consoleErrors,
  results
};

const md = `# P5 Live Data Verification

Generated at: ${verification.generated_at}

Overall result: ${passed ? "PASS" : "FAIL"}

Preconditions: api (\`node apps/api/src/server.js\`) and web dev server (\`npm --workspace apps/web run dev\`) already running. Live mode is opt-in via \`?data=live\` (+ optional \`&ctx=allow|denied|review\`); mock rendering is the untouched default.

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

## Console messages of type error (recorded, not gated — denied/review checks expect non-2xx responses)

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
