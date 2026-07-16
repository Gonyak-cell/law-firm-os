#!/usr/bin/env node
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";
import {
  GUARDED_UI_PROOF_MD_PATH,
  GUARDED_UI_PROOF_PATH,
  artifactPath,
  compactText,
  markdownTable,
  writeJson,
  writeText
} from "./lcx-full-helpers.mjs";

const ROOT = process.cwd();
const WEB = process.env.MATTER_UI_URL ?? "http://127.0.0.1:5173";
const SCREENSHOT_DIR = artifactPath("lcx-full-02-screenshots");
const ROUTES = [
  ["matter-vault", "?view=matters#matter-vault"],
  ["vault-documents", "?view=vault#vault-documents"],
  ["client-data", "?view=clients#client-data"],
  ["people-work-schedule", "?view=people#people-work-schedule"],
  ["calendar-decision", "?view=calendar#calendar-decision"],
  ["settings-advanced", "?view=settings#settings-advanced"]
];
const INTERESTING_ATTR = /lcx-full|blocked|required|enabled|preflight|gate|conditional|audit|decision|provider|owner|write|setup|state/i;
const FORBIDDEN_TEXT = /(LAWOS_VAULT_BRIDGE_TOKEN|MATTER_APP_API_TOKEN|Bearer\s+|sk-[A-Za-z0-9]|raw_cookie|refresh_token|id_token|document_bytes|storage_pointer|public_release\s*[:=]\s*true|go_live\s*[:=]\s*true|production_ready\s*[:=]\s*true)/i;
const EXPECTED_HTTP_FAILURES = [
  { status: 403, pattern: /\/api\/matters\/vault-bridge\/status$/ },
  { status: 404, pattern: /\/api\/matters\/vault-bridge\/matter-lookup\?/ },
  { status: 404, pattern: /\/api\/crm\/(activities|proposals|client-settings)\?/ }
];

mkdirSync(join(ROOT, SCREENSHOT_DIR), { recursive: true });

function screenshotPath(id) {
  return `${SCREENSHOT_DIR}/${id}.png`;
}

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

function classifyHttpFailure(failure) {
  return {
    ...failure,
    expected: EXPECTED_HTTP_FAILURES.some((entry) => failure.status === entry.status && entry.pattern.test(failure.url))
  };
}

async function collectRoute(page, id, path) {
  const consoleErrors = [];
  const pageErrors = [];
  const httpFailures = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 400) {
      httpFailures.push({ status: response.status(), url: response.url(), type: response.request().resourceType() });
    }
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
    return {
      url: location.href,
      attr_count: attrs.length,
      attrs: attrs.slice(0, 48),
      disabled_count: document.querySelectorAll("button:disabled").length,
      body_sample: document.body.innerText.slice(0, 1000)
    };
  }, INTERESTING_ATTR.source);
  const screenshot = screenshotPath(id);
  await page.screenshot({ path: join(ROOT, screenshot), fullPage: true });
  const classifiedHttpFailures = httpFailures.map(classifyHttpFailure);
  return {
    id,
    path,
    screenshot,
    ...data,
    console_unexpected_errors: consoleErrors.filter((error) => !/^Failed to load resource:/.test(error)),
    http_failures: classifiedHttpFailures,
    unexpected_http_failures: classifiedHttpFailures.filter((failure) => !failure.expected),
    page_errors: pageErrors,
    forbidden_text_detected: FORBIDDEN_TEXT.test(compactText(JSON.stringify(data)))
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
  ["matter-vault", (route) => hasAttr(route, "data-lcx-vltui-03-publish-write-enabled", "false") && hasAttr(route, "data-matter-email-composer", "provider-blocked")],
  ["vault-documents", (route) => hasAttr(route, "data-vault-boundary-write-enabled", "false") && hasAttr(route, "data-vault-upload-write-enabled", "false")],
  ["client-data", (route) => hasAttr(route, "data-enrichment-provider-admin", "provider-blocked") && hasAttr(route, "data-sf-b-w07-audit", "true")],
  ["people-work-schedule", (route) => hasAttr(route, "data-people-feature-status", "setup_required")],
  ["calendar-decision", (route) => hasAttr(route, "data-global-decision-required", "true") && hasAttr(route, "data-lcx-full-guarded-state", "owner_blocked")],
  ["settings-advanced", (route) => hasAttr(route, "data-global-audit-required", "true") && hasAttr(route, "data-lcx-full-guarded-state", "audit_required")]
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
  schema_version: "law-firm-os.lazycodex.lcx_full.guarded_ui_browser_proof.v0.1",
  generated_at: new Date().toISOString(),
  tuw_ids: ["LCX-FULL-02.03", "LCX-FULL-02.04", "LCX-FULL-02.05"],
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

writeJson(GUARDED_UI_PROOF_PATH, report);
writeText(
  GUARDED_UI_PROOF_MD_PATH,
  [
    "# LCX-FULL-02 Guarded UI Browser Proof",
    "",
    `Generated at: ${report.generated_at}`,
    "",
    `Verdict: ${report.verdict}`,
    "",
    markdownTable(
      routes.map((route) => ({
        Route: route.id,
        Disabled: route.disabled_count,
        Attrs: route.attr_count,
        Screenshot: route.screenshot
      })),
      ["Route", "Disabled", "Attrs", "Screenshot"]
    ),
    "",
    "## Boundary",
    "",
    "- Browser observation only.",
    "- Shared guarded UI proof does not enable writes or claim owner approval, provider receipt, production go-live, or public release."
  ].join("\n") + "\n"
);

console.log(JSON.stringify({ verdict: report.verdict, proof: GUARDED_UI_PROOF_PATH, markdown: GUARDED_UI_PROOF_MD_PATH }, null, 2));
if (report.verdict !== "PASS") process.exit(1);
