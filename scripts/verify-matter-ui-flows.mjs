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
    expectTexts: ["Client", "Matter", "구성원", "Vault"],
    selector: "[data-lcx-web-command-center='true']",
    minCapabilityCards: 4
  },
  {
    name: "clients-live",
    url: "/?locale=en&view=clients&data=live&ctx=allow",
    expectTexts: ["Client와 상담 접수"],
    selector: "[data-cmp-g2-live-clients='true']"
  },
  {
    name: "matters-live",
    url: "/?locale=en&view=matters&data=live&ctx=allow",
    expectTexts: ["Matter 상태, 구성원, 문서, 활동, 청구 흐름"],
    selector: "[data-cmp-g4-live-matters='true']"
  },
  {
    name: "people-live",
    url: "/?locale=en&view=people&data=live&ctx=allow",
    expectTexts: ["구성원 관리"],
    selector: "[data-hrx-api-backed='true']"
  },
  {
    name: "vault-live",
    url: "/?locale=en&view=vault&data=live&ctx=allow",
    expectTexts: ["Vault 문서와 권한 상태"],
    selector: "[data-cmp-g5-vault-surface='true']"
  },
  {
    name: "clients-denied",
    url: "/?locale=en&view=clients&data=live&ctx=denied",
    expectTexts: ["접근 권한이 없습니다", "권한이 있는 Client만 표시합니다"],
    selector: "[data-cmp-g2-live-clients='true']"
  },
  {
    name: "clients-review",
    url: "/?locale=en&view=clients&data=live&ctx=review",
    expectTexts: ["검토가 필요합니다", "검토가 끝나면 Client 정보를 확인할 수 있습니다"],
    selector: "[data-cmp-g2-live-clients='true']"
  },
  {
    name: "matters-denied",
    url: "/?locale=en&view=matters&data=live&ctx=denied",
    expectTexts: ["접근 권한이 없습니다", "권한이 있는 정보만 표시됩니다"],
    selector: "[data-cmp-g4-live-matters='true']"
  },
  {
    name: "vault-denied",
    url: "/?locale=en&view=vault&data=live&ctx=denied",
    expectTexts: ["접근 권한이 없습니다", "권한이 있는 정보만 표시됩니다"],
    selector: "[data-cmp-g5-vault-surface='true']"
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

for (const check of viewChecks) {
  let textFound = 0;
  let textMatches = [];
  let selectorFound = 0;
  let metrics = null;
  let error = null;
  try {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${baseUrl}${check.url}`, { waitUntil: "networkidle" });
    await page.evaluate(async () => {
      if (document.fonts?.ready) await document.fonts.ready;
    });
    const expectedTexts = check.expectTexts ?? [check.expectText];
    textMatches = await Promise.all(
      expectedTexts.map(async (expectedText) => ({
        expectedText,
        count: await page.getByText(expectedText, { exact: false }).count()
      }))
    );
    textFound = textMatches.reduce((total, item) => total + item.count, 0);
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
    expectText: (check.expectTexts ?? [check.expectText]).join(", "),
    expectedTexts: check.expectTexts ?? [check.expectText],
    passed:
      !error &&
      textMatches.every((item) => item.count > 0) &&
      selectorFound > 0 &&
      metrics &&
      !metrics.horizontalOverflow &&
      (!check.minCapabilityCards || metrics.visibleCapabilityCards >= check.minCapabilityCards),
    textFound,
    textMatches,
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
