#!/usr/bin/env node
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";
import {
  BASELINE_PROOF_MD_PATH,
  BASELINE_PROOF_PATH,
  artifactPath,
  compactText,
  markdownTable,
  writeJson,
  writeText
} from "./lcx-full-helpers.mjs";

const ROOT = process.cwd();
const WEB = process.env.MATTER_UI_URL ?? "http://127.0.0.1:5173";
const SCREENSHOT_DIR = artifactPath("lcx-full-00-screenshots");
const ROUTES = [
  ["home", "?view=home"],
  ["client-billing", "?view=clients#client-billing"],
  ["client-data", "?view=clients#client-data"],
  ["client-import", "?view=clients#client-import"],
  ["matter-vault", "?view=matters#matter-vault"],
  ["matter-import", "?view=matters#matter-import"],
  ["vault-documents", "?view=vault#vault-documents"],
  ["people-work-schedule", "?view=people#people-work-schedule"],
  ["calendar-decision", "?view=calendar#calendar-decision"],
  ["settings-advanced", "?view=settings#settings-advanced"]
];
const INTERESTING_ATTR = /blocked|required|enabled|preflight|gate|conditional|audit|decision|provider|owner|write|setup|state/i;
const FORBIDDEN_TEXT = /(LAWOS_VAULT_BRIDGE_TOKEN|MATTER_APP_API_TOKEN|Bearer\s+|sk-[A-Za-z0-9]|raw_cookie|refresh_token|id_token|document_bytes|storage_pointer|public_release\s*[:=]\s*true|go_live\s*[:=]\s*true|production_ready\s*[:=]\s*true)/i;
const EXPECTED_HTTP_FAILURES = [
  {
    status: 404,
    pattern: /\/api\/crm\/(activities|proposals|client-settings)\?/,
    reason: "local CRM read probe endpoint is absent in the Vite proof server"
  },
  {
    status: 403,
    pattern: /\/api\/matters\/vault-bridge\/status$/,
    reason: "Vault bridge provider check is fail-closed without approved runtime credentials"
  },
  {
    status: 404,
    pattern: /\/api\/matters\/vault-bridge\/matter-lookup\?/,
    reason: "local Vault lookup endpoint is absent in the Vite proof server"
  }
];

mkdirSync(join(ROOT, SCREENSHOT_DIR), { recursive: true });

function attrEntries(route) {
  return route.attrs.flatMap((entry) => Object.entries(entry.attrs));
}

function hasAttr(route, name, value) {
  return attrEntries(route).some(([attrName, attrValue]) => {
    if (attrName !== name) return false;
    if (value === undefined) return true;
    return value instanceof RegExp ? value.test(attrValue) : attrValue === value;
  });
}

function deriveFlags(data) {
  const blob = compactText(JSON.stringify(data.attrs));
  return {
    setup_required: data.flags.setup_required || /setup_required|setup-required|data-people-feature-status":"setup_required/.test(blob),
    owner_blocked: data.flags.owner_blocked || /owner[-_]blocked|owner-blocked-action|owner_blocked_action/.test(blob),
    provider_blocked: data.flags.provider_blocked || /provider[-_]blocked|provider-blocked|provider.*state/.test(blob),
    decision_required: data.flags.decision_required || /decision[-_]required|data-global-decision-required|Owner 결정 필요/.test(blob),
    audit_required: data.flags.audit_required || /audit[-_]required|data-global-audit-required|data-sf-b-w07-audit|action-audit-feed/.test(blob)
  };
}

function classifyHttpFailure(failure) {
  const expected = EXPECTED_HTTP_FAILURES.find((entry) =>
    failure.status === entry.status && entry.pattern.test(failure.url)
  );
  return {
    ...failure,
    expected: Boolean(expected),
    reason: expected?.reason ?? ""
  };
}

function screenshotPath(id) {
  return `${SCREENSHOT_DIR}/${id}.png`;
}

async function collectRoute(page, id, path) {
  const consoleErrors = [];
  const pageErrors = [];
  const httpFailures = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });
  page.on("response", (response) => {
    const status = response.status();
    if (status >= 400) {
      httpFailures.push({
        status,
        url: response.url(),
        type: response.request().resourceType()
      });
    }
  });
  page.on("requestfailed", (request) => {
    httpFailures.push({
      status: "failed",
      url: request.url(),
      type: request.resourceType(),
      error: request.failure()?.errorText ?? ""
    });
  });

  await page.goto(`${WEB}/${path}`, { waitUntil: "domcontentloaded", timeout: 15000 });
  await page.waitForTimeout(650);

  const data = await page.evaluate((interestingAttrSource) => {
    const interesting = new RegExp(interestingAttrSource, "i");
    const attrs = [];
    for (const el of document.querySelectorAll("*")) {
      const matched = {};
      for (const attr of el.attributes) {
        if (attr.name.startsWith("data-") && (interesting.test(attr.name) || interesting.test(attr.value))) {
          matched[attr.name] = attr.value;
        }
      }
      if (Object.keys(matched).length) {
        attrs.push({
          tag: el.tagName.toLowerCase(),
          text: el.textContent.trim().replace(/\s+/g, " ").slice(0, 140),
          attrs: matched
        });
      }
    }

    const bodyText = document.body.innerText;
    return {
      url: location.href,
      headings: [...document.querySelectorAll("h1,h2,h3")].slice(0, 12).map((el) => el.textContent.trim().replace(/\s+/g, " ")),
      attr_count: attrs.length,
      attrs: attrs.slice(0, 40),
      disabled_count: document.querySelectorAll("button:disabled").length,
      disabled_buttons: [...document.querySelectorAll("button:disabled")].map((el) => el.textContent.trim().replace(/\s+/g, " ")).filter(Boolean).slice(0, 20),
      flags: {
        setup_required: /setup_required|설정 필요|구성 필요|운영 기준/.test(bodyText),
        owner_blocked: /owner[-_ ]?blocked|승인 필요|승인 대기|Owner 승인/.test(bodyText),
        provider_blocked: /provider[-_ ]?blocked|제공자|공급자|연동 승인|연동 연결/.test(bodyText),
        decision_required: /decision-required|결정 필요|결정 게이트/.test(bodyText),
        audit_required: /audit_required|감사 필요/.test(bodyText)
      },
      text_sample: bodyText.slice(0, 1000)
    };
  }, INTERESTING_ATTR.source);

  const screenshot = screenshotPath(id);
  await page.screenshot({ path: join(ROOT, screenshot), fullPage: true });
  const serialized = JSON.stringify(data);
  const classifiedHttpFailures = httpFailures.map(classifyHttpFailure);
  return {
    id,
    path,
    screenshot,
    ...data,
    text_flags: data.flags,
    flags: deriveFlags(data),
    console_errors: consoleErrors,
    console_unexpected_errors: consoleErrors.filter((error) => !/^Failed to load resource:/.test(error)),
    http_failures: classifiedHttpFailures,
    unexpected_http_failures: classifiedHttpFailures.filter((failure) => !failure.expected),
    page_errors: pageErrors,
    forbidden_text_detected: FORBIDDEN_TEXT.test(compactText(serialized))
  };
}

const browser = await chromium.launch({ headless: true });
const routes = [];
try {
  for (const [id, path] of ROUTES) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    page.setDefaultTimeout(8000);
    try {
      routes.push(await collectRoute(page, id, path));
    } finally {
      await page.close();
    }
  }
} finally {
  await browser.close();
}

const required = new Map([
  ["client-billing", (route) =>
    hasAttr(route, "data-client-billing-provider-blocked", "true") &&
    hasAttr(route, "data-sf-b-w02-owner-blocked-action", "true")],
  ["client-data", (route) =>
    hasAttr(route, "data-enrichment-provider-admin", "provider-blocked") &&
    hasAttr(route, "data-segment-activation", "provider-blocked") &&
    hasAttr(route, "data-sf-b-w07-audit", "true")],
  ["client-import", (route) =>
    hasAttr(route, "data-sf-b-w05-execute-owner-blocked-action", "true") &&
    hasAttr(route, "data-sf-b-w02-action-audit-feed", "true")],
  ["matter-vault", (route) =>
    hasAttr(route, "data-lcx-vltui-03-vault-source-state", "source-blocked") &&
    hasAttr(route, "data-lcx-vltui-03-publish-write-enabled", "false") &&
    hasAttr(route, "data-matter-email-composer", "provider-blocked")],
  ["matter-import", (route) => route.flags.owner_blocked && route.flags.provider_blocked],
  ["vault-documents", (route) =>
    hasAttr(route, "data-vault-upload-write-enabled", "false") &&
    hasAttr(route, "data-vault-boundary-write-enabled", "false") &&
    hasAttr(route, "data-vault-boundary-state", "matter-required")],
  ["people-work-schedule", (route) => hasAttr(route, "data-people-feature-status", "setup_required")],
  ["calendar-decision", (route) => hasAttr(route, "data-global-decision-required", "true")],
  ["settings-advanced", (route) => hasAttr(route, "data-global-audit-required", "true")]
]);

const checks = routes.map((route) => ({
  route: route.id,
  passed: (required.get(route.id)?.(route) ?? true) &&
    route.console_unexpected_errors.length === 0 &&
    route.unexpected_http_failures.length === 0 &&
    route.page_errors.length === 0 &&
    route.forbidden_text_detected === false
}));

const report = {
  schema_version: "law-firm-os.lazycodex.lcx_full.baseline_browser_proof.v0.1",
  generated_at: new Date().toISOString(),
  tuw_id: "LCX-FULL-00.05",
  verdict: checks.every((check) => check.passed) ? "PASS" : "FAIL",
  web_url: WEB,
  routes,
  checks,
  boundary: {
    browser_observation_only: true,
    writes_enabled_by_this_proof: false,
    production_go_live_claim: false,
    public_release_claim: false,
    owner_approval_claim: false
  }
};

writeJson(BASELINE_PROOF_PATH, report);
const rows = routes.map((route) => ({
  Route: route.id,
  Disabled: route.disabled_count,
  "Setup": route.flags.setup_required ? "yes" : "",
  "Owner": route.flags.owner_blocked ? "yes" : "",
  "Provider": route.flags.provider_blocked ? "yes" : "",
  "Decision": route.flags.decision_required ? "yes" : "",
  "Audit": route.flags.audit_required ? "yes" : "",
  Screenshot: route.screenshot
}));

writeText(
  BASELINE_PROOF_MD_PATH,
  [
    "# LCX-FULL-00 Baseline Browser Proof",
    "",
    `Generated at: ${report.generated_at}`,
    "",
    `Verdict: ${report.verdict}`,
    "",
    markdownTable(rows, ["Route", "Disabled", "Setup", "Owner", "Provider", "Decision", "Audit", "Screenshot"]),
    "",
    "## Boundary",
    "",
    "- Browser observation only.",
    "- No feature writes are enabled by this proof.",
    "- Production go-live, public release, and owner approval claims remain false."
  ].join("\n") + "\n"
);

console.log(JSON.stringify({ verdict: report.verdict, proof: BASELINE_PROOF_PATH, markdown: BASELINE_PROOF_MD_PATH }, null, 2));
if (report.verdict !== "PASS") process.exit(1);
