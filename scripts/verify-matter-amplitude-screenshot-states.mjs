import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const root = process.cwd();
const refDir = path.join(root, "docs", "ui-reference", "amplitude-feb-2025");
const parityDir = path.join(refDir, "visual-parity");
const baseUrl = process.env.MATTER_UI_URL ?? "http://127.0.0.1:5173";
const registry = JSON.parse(fs.readFileSync(path.join(refDir, "matter-amplitude-screenshot-state-registry.json"), "utf8"));

const routeChecks = new Map();
for (const row of registry.rows) {
  const key = `${row.matter_route}::${row.expected_text}`;
  if (!routeChecks.has(key)) {
    routeChecks.set(key, {
      route: row.matter_route,
      expected_text: row.expected_text,
      screenshot_ids: [],
      flow_ids: new Set(),
      state_families: new Set()
    });
  }
  const entry = routeChecks.get(key);
  entry.screenshot_ids.push(row.screenshot_id);
  entry.flow_ids.add(row.flow_id);
  entry.state_families.add(row.state_family);
}

fs.mkdirSync(parityDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const consoleErrors = [];
page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});

const routeResults = [];

for (const check of routeChecks.values()) {
  await page.goto(`${baseUrl}${check.route}`, { waitUntil: "networkidle" });
  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready;
  });
  const textFound = await page.getByText(check.expected_text, { exact: false }).count();
  const metrics = await page.evaluate(() => ({
    locale: document.documentElement.dataset.locale,
    theme: document.documentElement.dataset.theme,
    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    bodyTextLength: document.body.innerText.length,
    h1: document.querySelector("h1")?.textContent ?? ""
  }));

  routeResults.push({
    route: check.route,
    expected_text: check.expected_text,
    screenshot_count: check.screenshot_ids.length,
    screenshot_ids: check.screenshot_ids,
    flow_ids: [...check.flow_ids],
    state_families: [...check.state_families],
    passed: textFound > 0 && !metrics.horizontalOverflow && metrics.bodyTextLength > 0,
    text_found: textFound,
    metrics
  });
}

await browser.close();

const routeByKey = new Map(routeResults.map((result) => [`${result.route}::${result.expected_text}`, result]));
const rows = registry.rows.map((row) => {
  const result = routeByKey.get(`${row.matter_route}::${row.expected_text}`);
  return {
    screenshot_id: row.screenshot_id,
    flow_id: row.flow_id,
    screen_family: row.screen_family,
    state_family: row.state_family,
    matter_route: row.matter_route,
    expected_text: row.expected_text,
    route_verified: Boolean(result?.passed),
    verification_tier: result?.passed ? "screenshot_state_route_verified" : "state_route_defined",
    next_gate: result?.passed
      ? "Capture this exact screenshot-state and compare pixel/layout drift against the Amplitude source screenshot."
      : "Fix route expected text or UI state before screenshot capture."
  };
});

const summary = rows.reduce((acc, row) => {
  acc[row.verification_tier] = (acc[row.verification_tier] ?? 0) + 1;
  return acc;
}, {});

const passed = routeResults.every((result) => result.passed) && consoleErrors.length === 0;

const verification = {
  schema_version: "matter.amplitude.screenshot-state-verification.v1",
  generated_at: new Date().toISOString(),
  base_url: baseUrl,
  passed,
  route_count: routeResults.length,
  screenshot_count: rows.length,
  status_summary: Object.entries(summary).map(([status, count]) => ({ status, count })),
  console_errors: consoleErrors,
  route_results: routeResults,
  rows
};

const csvHeaders = [
  "screenshot_id",
  "flow_id",
  "screen_family",
  "state_family",
  "matter_route",
  "expected_text",
  "route_verified",
  "verification_tier",
  "next_gate"
];

const md = `# matter Amplitude Screenshot State Verification

Generated at: ${verification.generated_at}

Overall result: ${passed ? "PASS" : "FAIL"}

## Summary

- Screenshot rows: ${verification.screenshot_count}
- Unique route checks: ${verification.route_count}
- Console errors: ${consoleErrors.length}

| Status | Screenshot count |
| --- | ---: |
${verification.status_summary.map((row) => `| ${row.status} | ${row.count} |`).join("\n")}

## Route Checks

| Route | Screenshots | Expected text | Result | Flow IDs |
| --- | ---: | --- | --- | --- |
${routeResults
  .map(
    (result) =>
      `| \`${result.route}\` | ${result.screenshot_count} | ${result.expected_text} | ${result.passed ? "PASS" : "FAIL"} | ${result.flow_ids.join(", ")} |`
  )
  .join("\n")}

## Policy

This verification proves every Amplitude screenshot has a reachable matter route/state with expected UI text and no desktop horizontal overflow. It does not replace pixel-level screenshot comparison against each source image.
`;

fs.writeFileSync(path.join(refDir, "matter-amplitude-screenshot-state-verification.json"), `${JSON.stringify(verification, null, 2)}\n`);
fs.writeFileSync(
  path.join(refDir, "matter-amplitude-screenshot-state-verification.csv"),
  `${[csvHeaders, ...rows.map((row) => csvHeaders.map((key) => String(row[key] ?? "")))]
    .map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(","))
    .join("\n")}\n`
);
fs.writeFileSync(path.join(parityDir, "screenshot-state-route-verification.md"), md);

console.log(`screenshot-state verification: ${passed ? "PASS" : "FAIL"}`);
console.log(`routes: ${verification.route_count}`);
for (const item of verification.status_summary) {
  console.log(`${item.status}: ${item.count}`);
}

if (!passed) {
  const failed = routeResults.filter((result) => !result.passed);
  for (const result of failed) {
    console.error(`FAIL ${result.route} expected=${result.expected_text}`);
  }
  if (consoleErrors.length) console.error(consoleErrors.join("\n"));
  process.exitCode = 1;
}
