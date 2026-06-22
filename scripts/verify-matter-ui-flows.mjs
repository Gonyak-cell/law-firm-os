import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const root = process.cwd();
const outDir = path.join(root, "docs", "lazycodex", "evidence", "matter-web", "artifacts");
const baseUrl = process.env.MATTER_UI_URL ?? "http://127.0.0.1:5173";

const viewChecks = [
  {
    name: "desktop-home-command-center",
    url: "/?locale=en&view=home&desktop=1&data=live&ctx=allow",
    expectText: "Client Matter People Vault",
    selector: "[data-lcx-web-command-center='true']"
  },
  { name: "clients-live", url: "/?locale=en&view=clients&data=live&ctx=allow", expectText: "Clients" },
  { name: "matters-live", url: "/?locale=en&view=matters&data=live&ctx=allow", expectText: "Matter Home" },
  { name: "people-live", url: "/?locale=en&view=people&data=live&ctx=allow", expectText: "People Runtime" },
  { name: "vault-live", url: "/?locale=en&view=vault&data=live&ctx=allow", expectText: "Matter Vault" },
  { name: "clients-denied", url: "/?locale=en&view=clients&data=live&ctx=denied", expectText: "Access denied" },
  { name: "clients-review", url: "/?locale=en&view=clients&data=live&ctx=review", expectText: "Review required" },
  { name: "matters-denied", url: "/?locale=en&view=matters&data=live&ctx=denied", expectText: "Access denied" },
  { name: "vault-denied", url: "/?locale=en&view=vault&data=live&ctx=denied", expectText: "Access denied" }
];

fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const consoleErrors = [];
page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});

const results = [];

for (const check of viewChecks) {
  let textFound = 0;
  let selectorFound = 0;
  let metrics = null;
  let error = null;
  try {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${baseUrl}${check.url}`, { waitUntil: "networkidle" });
    await page.evaluate(async () => {
      if (document.fonts?.ready) await document.fonts.ready;
    });
    textFound = await page.getByText(check.expectText, { exact: false }).count();
    selectorFound = check.selector ? await page.locator(check.selector).count() : 1;
    metrics = await page.evaluate(() => ({
      title: document.title,
      locale: document.documentElement.dataset.locale,
      theme: document.documentElement.dataset.theme,
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      visibleCapabilityCards: document.querySelectorAll("[data-capability-id]").length,
      visibleLiveStates: Array.from(document.querySelectorAll(".live-data-state, .capability-status")).map((node) =>
        node.textContent.replace(/\s+/g, " ").trim()
      )
    }));
  } catch (caught) {
    error = caught.message;
  }

  results.push({
    name: check.name,
    url: check.url,
    expectText: check.expectText,
    passed: !error && textFound > 0 && selectorFound > 0 && metrics && !metrics.horizontalOverflow,
    textFound,
    selectorFound,
    metrics,
    error
  });
}

await page.setViewportSize({ width: 390, height: 844 });
await page.goto(`${baseUrl}/?locale=en&view=home&desktop=1&data=live&ctx=allow`, { waitUntil: "networkidle" });
await page.evaluate(async () => {
  if (document.fonts?.ready) await document.fonts.ready;
});
const mobileMetrics = await page.evaluate(() => ({
  scrollWidth: document.documentElement.scrollWidth,
  clientWidth: document.documentElement.clientWidth,
  horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  capabilityCards: document.querySelectorAll("[data-capability-id]").length
}));

await browser.close();

const passed = results.every((result) => result.passed) && !mobileMetrics.horizontalOverflow;
const verification = {
  schema_version: "matter.lcx-web.runtime-verification.v1",
  generated_at: new Date().toISOString(),
  base_url: baseUrl,
  source_of_truth: "apps/web",
  passed,
  console_errors_recorded_not_gated: consoleErrors,
  mobile_metrics: mobileMetrics,
  results
};

const md = `# LCX-WEB Runtime Flow Verification

Generated at: ${verification.generated_at}

Overall result: ${passed ? "PASS" : "FAIL"}

Source of truth: \`apps/web\`

## Checks

| Check | URL | Expected text | Result | Notes |
| --- | --- | --- | --- | --- |
${results
  .map((result) => {
    const notes = result.error
      ? `error=${result.error}`
      : `locale=${result.metrics.locale}; overflow=${result.metrics.horizontalOverflow}; cards=${result.metrics.visibleCapabilityCards}`;
    return `| ${result.name} | \`${result.url}\` | ${result.expectText} | ${result.passed ? "PASS" : "FAIL"} | ${notes} |`;
  })
  .join("\n")}

## Mobile Overflow

- scrollWidth: ${mobileMetrics.scrollWidth}
- clientWidth: ${mobileMetrics.clientWidth}
- horizontalOverflow: ${mobileMetrics.horizontalOverflow}
- capabilityCards: ${mobileMetrics.capabilityCards}

## Console Errors

Recorded for operator review. Denied/review flows may surface expected non-2xx network messages.

${consoleErrors.length ? consoleErrors.map((error) => `- ${error}`).join("\n") : "- None"}
`;

fs.writeFileSync(path.join(outDir, "runtime-flow-verification.json"), `${JSON.stringify(verification, null, 2)}\n`);
fs.writeFileSync(path.join(outDir, "runtime-flow-verification.md"), md);

console.log(`runtime flow verification: ${passed ? "PASS" : "FAIL"}`);
for (const result of results) {
  console.log(`${result.passed ? "PASS" : "FAIL"} ${result.name}${result.error ? ` (${result.error})` : ""}`);
}
if (!passed) {
  process.exitCode = 1;
}
