#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const ROOT = process.cwd();
const WEB = process.env.MATTER_UI_URL ?? "http://127.0.0.1:5174";
const API = process.env.LAWOS_API_BASE_URL ?? "http://127.0.0.1:4180";
const ARTIFACT_DIR = "docs/lazycodex/evidence/matter-web/artifacts";
const JSON_PATH = `${ARTIFACT_DIR}/lcx8-action-0036-0044-0064-refresh-api-read-proof.json`;
const MD_PATH = `${ARTIFACT_DIR}/lcx8-action-0036-0044-0064-refresh-api-read-proof.md`;
const SCREENSHOT_DIR = `${ARTIFACT_DIR}/lcx8-action-screenshots`;

const rows = [
  {
    id: "LCX8-ACTION-0036",
    label: "Home refresh",
    url: `${WEB}/?view=home&ctx=allow`,
    deniedUrl: `${WEB}/?view=home&ctx=denied`,
    reviewUrl: `${WEB}/?view=home&ctx=review`,
    readySelector: "[data-lcx-web-command-center=\"true\"]",
    clickSelector: ".lcx-web-command-center .page-header .secondary-button",
    screenshot: `${SCREENSHOT_DIR}/lcx8-action-0036-home-refresh-api-read-proof.png`,
    expected: [
      ["GET", /^\/master-data\/records\b/],
      ["GET", /^\/api\/crm\/opportunities\b/],
      ["GET", /^\/api\/intake\/requests\b/],
      ["GET", /^\/api\/portal\/dashboard\b/],
      ["GET", /^\/api\/portal\/rfi\b/],
      ["GET", /^\/api\/matters\b/],
      ["GET", /^\/api\/finance\/time-entries\b/],
      ["GET", /^\/api\/finance\/invoices\b/],
      ["GET", /^\/api\/finance\/ar-aging\b/],
      ["GET", /^\/api\/analytics\/dashboards\b/],
      ["GET", /^\/api\/ai\/review-queue\b/],
      ["GET", /^\/api\/hrx\/employees\b/],
      ["GET", /^\/api\/vault\/documents\b/],
      ["GET", /^\/api\/data-room\/projections\b/]
    ],
    guardTextPatterns: [/접근 권한이 없습니다|검토가 필요합니다|권한이 있는 정보만 표시|검토가 끝나면/]
  },
  {
    id: "LCX8-ACTION-0044",
    label: "Matter header refresh",
    url: `${WEB}/?view=matters&ctx=allow#matters-list`,
    deniedUrl: `${WEB}/?view=matters&ctx=denied#matters-list`,
    reviewUrl: `${WEB}/?view=matters&ctx=review#matters-list`,
    readySelector: "#matters-home",
    clickSelector: "#matters-home .page-header .secondary-button",
    screenshot: `${SCREENSHOT_DIR}/lcx8-action-0044-matter-refresh-api-read-proof.png`,
    expected: [
      ["GET", /^\/api\/matters\b/],
      ["GET", /^\/api\/matters\/list-views\b/],
      ["GET", /^\/api\/record-actions\/matter\/fields\b/],
      ["GET", /^\/api\/record-actions\/matter\/[^/]+\/audit\b/],
      ["GET", /^\/api\/hrx\/legal-people\/search\b/],
      ["GET", /^\/api\/matters\/[^/]+\/command-center\b/],
      ["GET", /^\/api\/matters\/[^/]+\/timeline\b/],
      ["GET", /^\/api\/matters\/audit\b/],
      ["GET", /^\/api\/matters\/recently-viewed\b/],
      ["GET", /^\/api\/finance\/time-entries\b/],
      ["GET", /^\/api\/finance\/invoices\b/],
      ["GET", /^\/api\/finance\/ar-aging\b/],
      ["GET", /^\/api\/finance\/audit\b/],
      ["GET", /^\/api\/analytics\/dashboards\b/],
      ["GET", /^\/api\/analytics\/matter-profitability\b/]
    ],
    guardTextPatterns: [/접근 권한이 없습니다|검토가 필요합니다/]
  },
  {
    id: "LCX8-ACTION-0064",
    label: "Matter Vault refresh",
    url: `${WEB}/?view=matters&ctx=allow#matter-vault`,
    deniedUrl: `${WEB}/?view=matters&ctx=denied#matter-vault`,
    reviewUrl: `${WEB}/?view=matters&ctx=review#matter-vault`,
    readySelector: "#matter-vault [data-mv-matter-vault-panel=\"true\"]",
    clickSelector: "#matter-vault .matter-vault-actions .secondary-button",
    screenshot: `${SCREENSHOT_DIR}/lcx8-action-0064-matter-vault-refresh-api-read-proof.png`,
    expected: [
      ["GET", /^\/api\/matters\/[^/]+\/vault-summary\b/],
      ["GET", /^\/api\/matters\/[^/]+\/timeline\b/],
      ["GET", /^\/api\/vault\/documents\b/],
      ["GET", /^\/api\/vault\/search\b/],
      ["GET", /^\/api\/vault\/audit\b/],
      ["GET", /^\/api\/matters\/[^/]+\/document-templates\b/],
      ["GET", /^\/api\/matters\/[^/]+\/builder-approval-requests\b/]
    ],
    guardTextPatterns: [/접근 권한이 없습니다|검토가 필요합니다/]
  }
];

function pathWithQuery(url) {
  const parsed = new URL(url);
  return `${parsed.pathname}${parsed.search}`;
}

function matchesExpected(event, expected) {
  return event.method === expected[0] && expected[1].test(event.path);
}

function summarizeBody(body) {
  if (!body || typeof body !== "object") return null;
  return {
    outcome: body.outcome ?? null,
    ui_state: body.ui_state ?? null,
    item_count: Array.isArray(body.items) ? body.items.length : null,
    count_leak_prevented: body.count_leak_prevented === true,
    safe_error_codes: body.safe_error_codes ?? [],
    production_ready_claim: body.production_ready_claim === true,
    provider_payload_included: body.provider_payload_included === true,
    raw_text_included: body.raw_text_included === true,
    document_bytes_included: body.document_bytes_included === true,
    storage_pointer_ref_included: body.storage_pointer_ref_included === true
  };
}

async function responseEvent(response) {
  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  return {
    method: response.request().method(),
    path: pathWithQuery(response.url()),
    status: response.status(),
    ok: response.ok(),
    body: summarizeBody(body)
  };
}

async function waitForQuiet(page, ms = 900) {
  await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(ms);
}

async function collectAfterClick(page, row, globalEvents) {
  await page.goto(row.url, { waitUntil: "networkidle" });
  await page.locator(row.readySelector).first().waitFor({ state: "visible", timeout: 15000 });
  const startIndex = globalEvents.length;
  const promiseStartIndex = eventPromises.length;
  const waits = row.expected.map((expected) =>
    page.waitForResponse((response) => {
      const url = new URL(response.url());
      return response.request().method() === expected[0] && expected[1].test(`${url.pathname}${url.search}`);
    }, { timeout: 15000 }).then(responseEvent).catch((error) => ({
      missing: true,
      expected: `${expected[0]} ${expected[1]}`,
      error: String(error)
    }))
  );
  await page.locator(row.clickSelector).first().click();
  const expectedResponses = await Promise.all(waits);
  await waitForQuiet(page);
  await Promise.allSettled(eventPromises.slice(promiseStartIndex));
  await page.screenshot({ path: join(ROOT, row.screenshot), fullPage: true });
  const events = globalEvents.slice(startIndex);
  const matched = row.expected.map((expected, index) => ({
    expected: `${expected[0]} ${expected[1]}`,
    observed: expectedResponses[index]?.missing !== true || events.some((event) => matchesExpected(event, expected))
  }));
  return {
    id: row.id,
    label: row.label,
    url: row.url,
    selector: row.clickSelector,
    screenshot: row.screenshot,
    expected_responses: expectedResponses,
    matched,
    all_expected_observed: matched.every((item) => item.observed),
    events,
    api4xx5xx: events.filter((event) => Number(event.status) >= 400),
    non_get_events: events.filter((event) => event.method !== "GET")
  };
}

async function guardProbe(page, row, globalEvents, mode) {
  const url = mode === "denied" ? row.deniedUrl : row.reviewUrl;
  const startIndex = globalEvents.length;
  const promiseStartIndex = eventPromises.length;
  await page.goto(url, { waitUntil: "networkidle" });
  await page.locator(row.readySelector).first().waitFor({ state: "visible", timeout: 15000 });
  await waitForQuiet(page, 300);
  await Promise.allSettled(eventPromises.slice(promiseStartIndex));
  const text = (await page.locator(row.readySelector).first().innerText()).replace(/\s+/g, " ").slice(0, 1200);
  const events = globalEvents.slice(startIndex);
  return {
    mode,
    url,
    text_excerpt: text,
    guard_text_observed: row.guardTextPatterns.some((pattern) => pattern.test(text)),
    events,
    api4xx5xx: events.filter((event) => Number(event.status) >= 400),
    unsafe_success_events: events.filter((event) => {
      const state = event.body?.ui_state ?? event.body?.outcome;
      return event.status === 200 && state === "passed" && mode !== "allow";
    })
  };
}

mkdirSync(join(ROOT, ARTIFACT_DIR), { recursive: true });
mkdirSync(join(ROOT, SCREENSHOT_DIR), { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
const consoleMessages = [];
const globalEvents = [];
const eventPromises = [];
page.on("console", (message) => {
  if (["error", "warning"].includes(message.type())) {
    consoleMessages.push({ type: message.type(), text: message.text() });
  }
});
page.on("response", (response) => {
  const url = response.url();
  if ((url.startsWith(API) || url.startsWith(WEB)) && (url.includes("/api/") || url.includes("/master-data/"))) {
    eventPromises.push(
      responseEvent(response)
        .then((event) => globalEvents.push(event))
        .catch((error) => globalEvents.push({ error: String(error), url }))
    );
  }
});

const allowProofs = [];
const guardProofs = [];
try {
  for (const row of rows) {
    allowProofs.push(await collectAfterClick(page, row, globalEvents));
    guardProofs.push({
      id: row.id,
      denied: await guardProbe(page, row, globalEvents, "denied"),
      review: await guardProbe(page, row, globalEvents, "review")
    });
  }
} finally {
  await Promise.allSettled(eventPromises);
  await browser.close();
}

const assertions = [];
function addAssertion(name, passed, details = {}) {
  assertions.push({ name, passed: Boolean(passed), details });
}

for (const proof of allowProofs) {
  addAssertion(`${proof.id} expected read endpoints observed`, proof.all_expected_observed, {
    missing: proof.matched.filter((item) => !item.observed)
  });
  addAssertion(`${proof.id} allow refresh has no API 5xx`, !proof.events.some((event) => Number(event.status) >= 500), {
    api4xx5xx: proof.api4xx5xx
  });
}
for (const guard of guardProofs) {
  addAssertion(`${guard.id} denied guard text observed`, guard.denied.guard_text_observed, { text: guard.denied.text_excerpt });
  addAssertion(`${guard.id} review guard text observed`, guard.review.guard_text_observed, { text: guard.review.text_excerpt });
  addAssertion(`${guard.id} denied/review has no API 5xx`, [...guard.denied.events, ...guard.review.events].every((event) => Number(event.status) < 500));
}
const unexpectedConsoleErrors = consoleMessages.filter((item) =>
  item.type === "error" && !/403.*Forbidden/.test(item.text)
);
addAssertion("browser console has no unexpected errors", unexpectedConsoleErrors.length === 0, { consoleMessages });

const rowDecisions = allowProofs.map((proof) => {
  const guard = guardProofs.find((item) => item.id === proof.id);
  const hasUnsafeGuardSuccess = [...guard.denied.unsafe_success_events, ...guard.review.unsafe_success_events].length > 0;
  const hasUnexpectedNonGet = proof.non_get_events.filter((event) => !event.path.includes("/recently-viewed")).length > 0;
  const passable = proof.all_expected_observed
    && proof.api4xx5xx.every((event) => Number(event.status) < 500)
    && guard.denied.guard_text_observed
    && guard.review.guard_text_observed
    && !hasUnsafeGuardSuccess
    && !hasUnexpectedNonGet;
  return {
    id: proof.id,
    status_decision: passable ? "PASS" : "BLOCKED",
    reason: passable ? "api_read_refresh_browser_and_guard_proof_complete" : "refresh_proof_incomplete_or_guard_gap",
    all_expected_observed: proof.all_expected_observed,
    denied_guard_text_observed: guard.denied.guard_text_observed,
    review_guard_text_observed: guard.review.guard_text_observed,
    unsafe_guard_success_count: [...guard.denied.unsafe_success_events, ...guard.review.unsafe_success_events].length,
    non_get_events: proof.non_get_events
  };
});

const result = assertions.every((item) => item.passed) ? "PASS" : "PARTIAL";
const proof = {
  schema_version: "law-firm-os.lcx8.refresh-api-read-proof.v0.1",
  generated_at: new Date().toISOString(),
  rows: rows.map((row) => row.id),
  scope: {
    local_browser_runtime: true,
    api_base_url: API,
    web_origin: WEB,
    production_ready_claim: false,
    go_live_claim: false,
    product_write_claim: false
  },
  source_trace: {
    home: "apps/web/src/components/HomeSurface.jsx refreshToken -> command-center read probes",
    matter: "apps/web/src/components/MattersSurface.jsx refreshToken -> matter/finance/analytics reads",
    matter_vault: "apps/web/src/components/MatterVaultPanel.jsx refreshToken -> vault read probes"
  },
  allowProofs,
  guardProofs,
  rowDecisions,
  assertions,
  consoleMessages,
  result
};

writeFileSync(join(ROOT, JSON_PATH), `${JSON.stringify(proof, null, 2)}\n`);
writeFileSync(join(ROOT, MD_PATH), `${[
  "# LCX8-ACTION-0036/0044/0064 Refresh API Read Proof",
  "",
  `Generated at: ${proof.generated_at}`,
  "",
  `Result: ${proof.result}`,
  "",
  "## Row Decisions",
  "",
  ...proof.rowDecisions.map((row) => `- ${row.id}: ${row.status_decision} (${row.reason})`),
  "",
  "## Assertions",
  "",
  ...proof.assertions.map((item) => `- ${item.passed ? "PASS" : "FAIL"}: ${item.name}`),
  "",
  "## Non-Claims",
  "",
  "- Local browser/API proof only.",
  "- No production go-live claim.",
  "- No product write claim for these refresh rows.",
  ""
].join("\n")}\n`);

console.log(JSON.stringify({
  result,
  json: JSON_PATH,
  md: MD_PATH,
  assertions: `${assertions.filter((item) => item.passed).length}/${assertions.length}`,
  rowDecisions
}, null, 2));
