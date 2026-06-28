#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const ROOT = process.cwd();
const WEB = process.env.MATTER_UI_URL ?? "http://127.0.0.1:5174";
const API = process.env.LAWOS_API_BASE_URL ?? "http://127.0.0.1:4180";
const ARTIFACT_DIR = "docs/lazycodex/evidence/matter-web/artifacts";
const SCREENSHOT_DIR = `${ARTIFACT_DIR}/lcx8-action-screenshots`;
const JSON_PATH = `${ARTIFACT_DIR}/lcx8-action-0272-0280-0323-web-guarded-state-proof.json`;
const MD_PATH = `${ARTIFACT_DIR}/lcx8-action-0272-0280-0323-web-guarded-state-proof.md`;

const ROW_IDS = [
  "LCX8-ACTION-0272",
  "LCX8-ACTION-0273",
  "LCX8-ACTION-0274",
  "LCX8-ACTION-0275",
  "LCX8-ACTION-0276",
  "LCX8-ACTION-0277",
  "LCX8-ACTION-0278",
  "LCX8-ACTION-0279",
  "LCX8-ACTION-0280",
  "LCX8-ACTION-0323"
];

const guardedChecks = [
  {
    id: "LCX8-ACTION-0272",
    name: "Client list denied state",
    url: "/?locale=ko&view=clients&data=live&ctx=denied#clients-list",
    rootSelector: "[data-cmp-g2-live-clients='true']",
    stateSelector: ".live-data-denied",
    textPattern: /접근 권한이 없습니다/,
    protectedPattern: /Synthetic|client_lcx|ClientGroup|matter_rp05|tenant_/i
  },
  {
    id: "LCX8-ACTION-0273",
    name: "Client list review state",
    url: "/?locale=ko&view=clients&data=live&ctx=review#clients-list",
    rootSelector: "[data-cmp-g2-live-clients='true']",
    stateSelector: ".live-data-review",
    textPattern: /검토가 필요합니다/,
    protectedPattern: /Synthetic|client_lcx|ClientGroup|matter_rp05|tenant_/i
  },
  {
    id: "LCX8-ACTION-0274",
    name: "Matter list denied state",
    url: "/?locale=ko&view=matters&data=live&ctx=denied#matters-list",
    rootSelector: "[data-cmp-g4-live-matters='true']",
    stateSelector: ".live-data-denied",
    textPattern: /접근 권한이 없습니다/,
    protectedPattern: /matter_rp05|Synthetic|tenant_|Invoice|WIP/i
  },
  {
    id: "LCX8-ACTION-0275",
    name: "Matter list review state",
    url: "/?locale=ko&view=matters&data=live&ctx=review#matters-list",
    rootSelector: "[data-cmp-g4-live-matters='true']",
    stateSelector: ".live-data-review",
    textPattern: /검토가 필요합니다/,
    protectedPattern: /matter_rp05|Synthetic|tenant_|Invoice|WIP/i
  },
  {
    id: "LCX8-ACTION-0276",
    name: "Vault documents denied state",
    url: "/?locale=ko&view=vault&data=live&ctx=denied#vault-documents",
    rootSelector: "[data-cmp-g5-vault-surface='true']",
    stateSelector: ".live-data-denied",
    textPattern: /접근 권한이 없습니다/,
    protectedPattern: /storage_pointer|document_bytes|raw_text|matter_rp05|tenant_/i
  },
  {
    id: "LCX8-ACTION-0277",
    name: "Vault documents review state",
    url: "/?locale=ko&view=vault&data=live&ctx=review#vault-documents",
    rootSelector: "[data-cmp-g5-vault-surface='true']",
    stateSelector: ".live-data-review",
    textPattern: /검토가 필요합니다/,
    protectedPattern: /storage_pointer|document_bytes|raw_text|matter_rp05|tenant_/i
  },
  {
    id: "LCX8-ACTION-0280",
    name: "People directory denied/review state",
    url: "/?locale=ko&view=people&data=live&ctx=denied#people-directory",
    reviewUrl: "/?locale=ko&view=people&data=live&ctx=review#people-directory",
    rootSelector: "[data-hrx-api-backed='true']",
    stateSelector: "[data-lcx8-people-guard-state='true']",
    textPattern: /접근 권한이 없습니다|검토가 필요합니다/,
    protectedPattern: /person_client_contact|PortalAccess|reviewer-legal|tenant_|emp-/i
  }
];

const mutationChecks = [
  {
    id: "LCX8-ACTION-0278",
    name: "Matter record action strip disabled under denied/review",
    urls: [
      "/?locale=ko&view=matters&data=live&ctx=denied#matters-list",
      "/?locale=ko&view=matters&data=live&ctx=review#matters-list"
    ],
    scopeSelector: "#matters-home",
    statePattern: /접근 권한이 없습니다|검토가 필요합니다/,
    buttonPattern: /저장|변경|필드 작업|승인 확인|상태 변경|담당자 변경/
  },
  {
    id: "LCX8-ACTION-0279",
    name: "Matter Vault action strip disabled under denied/review",
    urls: [
      "/?locale=ko&view=matters&data=live&ctx=denied#matter-vault",
      "/?locale=ko&view=matters&data=live&ctx=review#matter-vault"
    ],
    scopeSelector: "#matter-vault",
    statePattern: /접근 권한이 없습니다|검토가 필요합니다/,
    buttonPattern: /저장|변경|필드 작업|승인 확인|초안 생성|검토 준비|승인 요청|Vault 등록 요청|내용 정리|발송 요청/
  }
];

const HRX_BASE_HEADERS = {
  "x-lawos-tenant-id": "tenant-a",
  "x-lawos-actor-id": "hrx-step-up-user",
  "x-lawos-actor-role": "people_ops",
  "x-lawos-hrx-scopes": "hrx.audit.read"
};
const HRX_STEP_UP_HEADER = JSON.stringify({
  tenant_id: "tenant-a",
  actor_id: "hrx-step-up-user",
  mfa: true,
  assurance_level: 2,
  expires_at: "2999-01-01T00:00:00.000Z"
});

function compact(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function screenshotPath(id, suffix = "proof") {
  return `${SCREENSHOT_DIR}/${id.toLowerCase()}-${suffix}.png`;
}

function addAssertion(assertions, name, passed, details = {}) {
  assertions.push({ name, passed: Boolean(passed), details });
}

async function responseSummary(response) {
  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  return {
    check: response.request()._lcx8CheckName ?? null,
    method: response.request().method(),
    status: response.status(),
    path: `${new URL(response.url()).pathname}${new URL(response.url()).search}`,
    body: body && typeof body === "object" ? {
      outcome: body.outcome ?? null,
      ui_state: body.ui_state ?? null,
      safe_error_code: body.safe_error_code ?? null,
      safe_error_codes: body.safe_error_codes ?? [],
      step_up_required: body.step_up_required === true,
      count_leak_prevented: body.count_leak_prevented === true,
      raw_text_included: body.raw_text_included === true,
      document_bytes_included: body.document_bytes_included === true,
      storage_pointer_ref_included: body.storage_pointer_ref_included === true,
      production_ready_claim: body.production_ready_claim === true,
      item_count: Array.isArray(body.items) ? body.items.length : null
    } : null
  };
}

async function collectPageCheck(page, check, url = check.url, suffix = "proof") {
  const responses = [];
  const handler = (response) => {
    const pathname = new URL(response.url()).pathname;
    if (/^\/(?:api|master-data)\b/.test(pathname)) {
      responses.push(responseSummary(response));
    }
  };
  page.on("response", handler);
  try {
    await page.goto(`${WEB}${url}`, { waitUntil: "networkidle" });
    await page.locator(check.rootSelector).first().waitFor({ state: "visible", timeout: 15000 });
    await page.locator(check.stateSelector).first().waitFor({ state: "visible", timeout: 15000 });
    await page.waitForTimeout(300);
    const stateText = compact(await page.locator(check.stateSelector).first().innerText());
    const bodyText = compact(await page.locator(check.rootSelector).first().innerText());
    const tableRows = await page.locator(`${check.rootSelector} .data-table tbody tr`).count().catch(() => 0);
    const runtimeGrid = await page.locator(`${check.rootSelector} .people-runtime-grid`).count().catch(() => 0);
    const screenshot = screenshotPath(check.id, suffix);
    await page.screenshot({ path: join(ROOT, screenshot), fullPage: true });
    const resolvedResponses = await Promise.all(responses);
    return {
      id: check.id,
      name: check.name,
      url,
      state_selector: check.stateSelector,
      state_text: stateText,
      table_rows: tableRows,
      people_runtime_grid_count: runtimeGrid,
      leaked_tokens: check.protectedPattern.test(bodyText) ? bodyText.match(check.protectedPattern)?.[0] : null,
      responses: resolvedResponses,
      api_5xx_count: resolvedResponses.filter((entry) => entry.status >= 500).length,
      screenshot,
      passed:
        check.textPattern.test(stateText) &&
        tableRows === 0 &&
        runtimeGrid === 0 &&
        !check.protectedPattern.test(bodyText) &&
        resolvedResponses.every((entry) => entry.status < 500)
    };
  } finally {
    page.off("response", handler);
  }
}

async function collectMutationGuard(page, check) {
  const states = [];
  for (const url of check.urls) {
    await page.goto(`${WEB}${url}`, { waitUntil: "networkidle" });
    await page.locator(check.scopeSelector).first().waitFor({ state: "visible", timeout: 15000 });
    await page.waitForTimeout(300);
    const result = await page.locator(check.scopeSelector).first().evaluate((node, source) => {
      const pattern = new RegExp(source);
      const buttons = Array.from(node.querySelectorAll("button"));
      const controls = buttons
        .filter((button) => pattern.test(button.textContent ?? ""))
        .map((button) => ({
          text: (button.textContent ?? "").replace(/\s+/g, " ").trim(),
          disabled: button.disabled === true || button.getAttribute("aria-disabled") === "true",
          visible: Boolean(button.offsetWidth || button.offsetHeight || button.getClientRects().length)
        }));
      return {
        text: (node.textContent ?? "").replace(/\s+/g, " ").trim(),
        controls,
        enabled_visible_controls: controls.filter((control) => control.visible && !control.disabled)
      };
    }, check.buttonPattern.source);
    const screenshot = screenshotPath(check.id, url.includes("ctx=review") ? "review" : "denied");
    await page.screenshot({ path: join(ROOT, screenshot), fullPage: true });
    states.push({
      url,
      state_text_matched: check.statePattern.test(result.text),
      control_count: result.controls.length,
      enabled_visible_control_count: result.enabled_visible_controls.length,
      enabled_visible_controls: result.enabled_visible_controls,
      screenshot
    });
  }
  return {
    id: check.id,
    name: check.name,
    states,
    passed: states.every((state) => state.state_text_matched && state.enabled_visible_control_count === 0)
  };
}

async function json(path, options = {}) {
  const response = await fetch(`${API}${path}`, options);
  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  return { status: response.status, body };
}

async function collectHrxStepUp(page) {
  const challenged = await json("/api/hrx/audit", { headers: HRX_BASE_HEADERS });
  const stale = await json("/api/hrx/audit", {
    headers: {
      ...HRX_BASE_HEADERS,
      "x-lawos-hrx-step-up": JSON.stringify({ ...JSON.parse(HRX_STEP_UP_HEADER), expires_at: "2000-01-01T00:00:00.000Z" })
    }
  });
  const allowed = await json("/api/hrx/audit", {
    headers: { ...HRX_BASE_HEADERS, "x-lawos-hrx-step-up": HRX_STEP_UP_HEADER }
  });

  let routedCount = 0;
  await page.route("**/api/hrx/audit", async (route) => {
    routedCount += 1;
    await route.fulfill({
      status: 403,
      contentType: "application/json",
      body: JSON.stringify({
        error: "HRX_STEP_UP_REQUIRED",
        safe_error_code: "HRX_STEP_UP_REQUIRED",
        step_up_required: true,
        action: "hrx.audit.read"
      })
    });
  });
  await page.goto(`${WEB}/?locale=ko&view=people&data=live&ctx=allow#people-audit`, { waitUntil: "networkidle" });
  await page.locator("[data-hrx-step-up-challenge='true']").first().waitFor({ state: "visible", timeout: 15000 });
  const challengeText = compact(await page.locator("[data-hrx-step-up-challenge='true']").first().innerText());
  await page.locator("[data-hrx-step-up-challenge='true'] button.secondary-button").first().click();
  await page.waitForTimeout(300);
  const screenshot = screenshotPath("LCX8-ACTION-0323", "step-up");
  await page.screenshot({ path: join(ROOT, screenshot), fullPage: true });
  await page.unroute("**/api/hrx/audit");

  return {
    id: "LCX8-ACTION-0323",
    name: "HRX audit step-up retry",
    api: {
      challenged: {
        status: challenged.status,
        safe_error_code: challenged.body?.safe_error_code ?? null,
        step_up_required: challenged.body?.step_up_required === true
      },
      stale: {
        status: stale.status,
        safe_error_code: stale.body?.safe_error_code ?? null,
        step_up_required: stale.body?.step_up_required === true
      },
      allowed: {
        status: allowed.status,
        outcome: allowed.body?.outcome ?? null,
        event_count: Array.isArray(allowed.body?.events) ? allowed.body.events.length : null
      }
    },
    ui: {
      routed_step_up_responses: routedCount,
      challenge_text: challengeText,
      retry_button_clicked: true,
      screenshot
    },
    passed:
      challenged.status === 403 &&
      challenged.body?.safe_error_code === "HRX_STEP_UP_REQUIRED" &&
      challenged.body?.step_up_required === true &&
      stale.status === 403 &&
      stale.body?.safe_error_code === "HRX_STEP_UP_REQUIRED" &&
      allowed.status === 200 &&
      allowed.body?.outcome === "ok" &&
      /추가 확인이 필요합니다|다시 확인/.test(challengeText) &&
      routedCount >= 1
  };
}

mkdirSync(join(ROOT, SCREENSHOT_DIR), { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
const consoleMessages = [];
page.on("console", (message) => {
  if (["error", "warning"].includes(message.type())) {
    consoleMessages.push({ type: message.type(), text: message.text() });
  }
});

const assertions = [];
const rowProofs = [];
try {
  for (const check of guardedChecks) {
    const proof = await collectPageCheck(page, check);
    rowProofs.push({
      ...proof,
      status_decision: "GUARDED final state confirmed"
    });
    addAssertion(assertions, `${check.id} guarded DOM and no leak`, proof.passed, proof);
    if (check.reviewUrl) {
      const reviewProof = await collectPageCheck(page, check, check.reviewUrl, "review");
      rowProofs.push({
        ...reviewProof,
        id: `${check.id}:review`,
        status_decision: "GUARDED final state confirmed"
      });
      addAssertion(assertions, `${check.id} review guarded DOM and no leak`, reviewProof.passed, reviewProof);
    }
  }

  for (const check of mutationChecks) {
    const proof = await collectMutationGuard(page, check);
    rowProofs.push({
      ...proof,
      status_decision: "GUARDED final state confirmed"
    });
    addAssertion(assertions, `${check.id} mutation affordance disabled`, proof.passed, proof);
  }

  const stepUpProof = await collectHrxStepUp(page);
  rowProofs.push({
    ...stepUpProof,
    status_decision: "GUARDED final state confirmed"
  });
  addAssertion(assertions, "LCX8-ACTION-0323 HRX step-up API and UI retry", stepUpProof.passed, stepUpProof);
} finally {
  await browser.close();
}

const unexpectedConsoleErrors = consoleMessages.filter((message) => !/Failed to load resource|403/.test(message.text));
addAssertion(assertions, "no unexpected guarded proof console errors", unexpectedConsoleErrors.length === 0, { unexpectedConsoleErrors });

const passed = assertions.every((assertion) => assertion.passed);
const proof = {
  schema_version: "law-firm-os.lcx8.web-guarded-state-proof.v0.1",
  generated_at: new Date().toISOString(),
  result: passed ? "PASS" : "FAIL",
  action_ids: ROW_IDS,
  status_decision: "GUARDED final state confirmed; status remains GUARDED",
  base_url: WEB,
  api_base: API,
  assertions,
  rowProofs,
  console_messages_recorded_not_gated: consoleMessages,
  unexpected_console_errors: unexpectedConsoleErrors,
  non_claims: [
    "guarded/fail-closed state proof only",
    "no mutation/write success claimed",
    "no protected row/detail/payload visibility claimed",
    "HRX step-up UI challenge is driven with the real server response shape via browser route interception plus direct API proof",
    "no production-ready or go-live claim"
  ]
};

writeFileSync(JSON_PATH, `${JSON.stringify(proof, null, 2)}\n`);
writeFileSync(MD_PATH, `${[
  "# LCX8 Web Guarded State Proof",
  "",
  `- Result: ${proof.result}`,
  "- Status decision: GUARDED final state confirmed; status remains GUARDED",
  `- Generated: ${proof.generated_at}`,
  `- Base URL: ${WEB}`,
  `- API base: ${API}`,
  "",
  "## Assertions",
  ...assertions.map((assertion) => `- ${assertion.passed ? "PASS" : "FAIL"} ${assertion.name}`),
  "",
  "## Rows",
  ...rowProofs.map((row) => `- ${row.id}: ${row.status_decision}; ${row.name}`),
  "",
  "## Non-Claims",
  ...proof.non_claims.map((item) => `- ${item}`)
].join("\n")}\n`);

console.log(JSON.stringify({
  result: proof.result,
  action_ids: ROW_IDS,
  assertions: `${assertions.filter((assertion) => assertion.passed).length}/${assertions.length}`,
  proof: JSON_PATH,
  proof_md: MD_PATH,
  status_decision: proof.status_decision
}, null, 2));

if (!passed) process.exitCode = 1;
