#!/usr/bin/env node
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";
import { findRegisteredAccountByEmail } from "../apps/api/src/matter-vault-account-registry.js";
import { apiSessionHeaders } from "../apps/api/test/helpers/session.js";

const ROOT = process.cwd();
const ARTIFACT_DIR = "docs/lazycodex/evidence/matter-web/artifacts";
const SCREENSHOT_DIR = `${ARTIFACT_DIR}/people-professional-profile-screenshots-2026-07-07`;
const JSON_PATH = `${ARTIFACT_DIR}/people-professional-profile-browser-proof-2026-07-07.json`;
const MD_PATH = `${ARTIFACT_DIR}/people-professional-profile-browser-proof-2026-07-07.md`;
const SOURCE_MAP_PATH = `${ARTIFACT_DIR}/people-professional-profile-source-map-2026-07-07.json`;
const ROSTER_PATH = "docs/reorganization/client-matter-os/matter-vault-r4/launch/hrx-member-roster-source-of-truth.json";
const API_ORIGIN = process.env.PEOPLE_PROFILE_API_ORIGIN ?? "http://127.0.0.1:4217";
const API_HEALTH = process.env.PEOPLE_PROFILE_API_HEALTH ?? `${API_ORIGIN}/api/health`;
const WEB_ORIGIN = process.env.PEOPLE_PROFILE_WEB_ORIGIN ?? "http://127.0.0.1:5187";
const TEMP_STORE_DIR = mkdtempSync(join(tmpdir(), "lawos-people-professional-profile-"));
const BROWSER_ACCOUNT_EMAIL = "jwsuh@amic.kr";

const subjects = [
  {
    slug: "park-byungjun",
    displayName: "박병준",
    expectedKind: "attorney",
    requiredTexts: ["전문 프로필", "변호사", "상사분쟁", "김·장", "서울고등법원", "UC Berkeley", "사법연수원 제44기", "출처"],
    forbiddenTexts: []
  },
  {
    slug: "lim-younghoon",
    displayName: "임영훈",
    expectedKind: "attorney",
    requiredTexts: ["전문 프로필", "변호사", "조세쟁송", "삼성전자", "김·장", "연세대학교", "공인회계사", "출처"],
    forbiddenTexts: []
  },
  {
    slug: "suh-jiwon",
    displayName: "서지원",
    expectedKind: "attorney",
    requiredTexts: ["전문 프로필", "변호사", "M&A", "김·장", "국방부", "서울대학교", "사법연수원 제46기", "출처"],
    forbiddenTexts: []
  },
  {
    slug: "cho-sungmin",
    displayName: "조성민",
    expectedKind: "attorney",
    requiredTexts: ["전문 프로필", "변호사", "금융규제", "화온", "김·장", "연세대학교", "사법연수원 제47기", "출처"],
    forbiddenTexts: []
  },
  {
    slug: "kim-yangtae",
    displayName: "김양태",
    expectedKind: "cpa",
    requiredTexts: ["전문 프로필", "공인회계사", "Deal Advisory", "페트라브릿지", "KPMG", "UIBE", "서울시립대학교", "출처"],
    forbiddenTexts: ["변호사", "attorney"]
  },
  {
    slug: "jo-woosang",
    displayName: "조우상",
    expectedKind: "deal_advisor",
    requiredTexts: ["전문 프로필", "Deal Advisory", "페트라브릿지", "KPMG", "Sciences Po", "Brandeis", "출처"],
    forbiddenTexts: ["변호사", "공인회계사", "attorney", "CPA"]
  }
];

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readJson(path) {
  return JSON.parse(readFileSync(join(ROOT, path), "utf8"));
}

async function isReachable(url) {
  try {
    const response = await fetch(url);
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForReachable(url, label, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isReachable(url)) return true;
    await delay(500);
  }
  throw new Error(`${label} was not reachable at ${url}`);
}

function urlPort(url, fallback) {
  try {
    return new URL(url).port || fallback;
  } catch {
    return fallback;
  }
}

function spawnManaged(label, command, args, options = {}) {
  const child = spawn(command, args, {
    cwd: ROOT,
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
    env: {
      ...process.env,
      ...options.env
    }
  });
  const logs = [];
  child.stdout.on("data", (chunk) => logs.push(`${label}: ${chunk.toString()}`));
  child.stderr.on("data", (chunk) => logs.push(`${label}: ${chunk.toString()}`));
  return { label, child, logs };
}

async function ensureServers() {
  const managed = [];
  if (!(await isReachable(API_HEALTH))) {
    managed.push(spawnManaged("api", "npm", ["--workspace", "apps/api", "run", "start"], {
      env: {
        LAWOS_API_PORT: urlPort(API_HEALTH, "4217"),
        LAWOS_HRX_STORE_PATH: join(TEMP_STORE_DIR, "hrx.json"),
        LAWOS_MASTER_DATA_STORE_PATH: join(TEMP_STORE_DIR, "master-data.json"),
        LAWOS_MATTER_STORE_PATH: join(TEMP_STORE_DIR, "matter.json"),
        LAWOS_DMS_STORE_PATH: join(TEMP_STORE_DIR, "dms.json"),
        LAWOS_CRM_STORE_PATH: join(TEMP_STORE_DIR, "crm.json"),
        LAWOS_INTAKE_STORE_PATH: join(TEMP_STORE_DIR, "intake.json"),
        LAWOS_CRM_MASTER_DATA_STORE_PATH: join(TEMP_STORE_DIR, "crm-master-data.json"),
        LAWOS_FINANCE_STORE_PATH: join(TEMP_STORE_DIR, "finance.json"),
        LAWOS_ANALYTICS_STORE_PATH: join(TEMP_STORE_DIR, "analytics.json")
      }
    }));
  }
  if (!(await isReachable(WEB_ORIGIN))) {
    managed.push(spawnManaged("web", "npm", [
      "--workspace",
      "apps/web",
      "run",
      "dev",
      "--",
      "--host",
      "127.0.0.1",
      "--port",
      urlPort(WEB_ORIGIN, "5187")
    ], {
      env: {
        LAWOS_WEB_API_PROXY_TARGET: API_ORIGIN
      }
    }));
  }
  await waitForReachable(API_HEALTH, "API");
  await waitForReachable(WEB_ORIGIN, "Web");
  return managed;
}

function stopManaged(managed) {
  for (const item of managed) {
    if (!item.child.killed) item.child.kill("SIGTERM");
  }
}

function normalizeText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function assertProfilePayload(subject, payload) {
  const profile = payload?.professional_profile ?? payload?.employee?.professional_profile ?? null;
  const checks = [];
  checks.push({
    name: `${subject.displayName} API professional_profile exists`,
    passed: Boolean(profile && typeof profile === "object" && !Array.isArray(profile))
  });
  checks.push({
    name: `${subject.displayName} API profile kind`,
    passed: profile?.profile_kind === subject.expectedKind,
    expected: subject.expectedKind,
    actual: profile?.profile_kind
  });
  const serialized = JSON.stringify(profile ?? {});
  for (const requiredText of subject.requiredTexts.filter((text) => !["전문 프로필", "출처"].includes(text))) {
    checks.push({
      name: `${subject.displayName} API contains ${requiredText}`,
      passed: serialized.includes(requiredText),
      expected: requiredText
    });
  }
  for (const forbiddenText of subject.forbiddenTexts) {
    checks.push({
      name: `${subject.displayName} API excludes ${forbiddenText}`,
      passed: !serialized.includes(forbiddenText),
      forbidden: forbiddenText
    });
  }
  return { profile_kind: profile?.profile_kind ?? null, checks };
}

async function fetchApiProfiles(rosterByName, apiHeaders) {
  const rows = [];
  for (const subject of subjects) {
    const member = rosterByName.get(subject.displayName);
    const response = await fetch(`${API_ORIGIN}/api/hrx/employees/${encodeURIComponent(member.employee_id)}`, { headers: apiHeaders });
    const body = await response.json().catch(() => ({}));
    const payload = assertProfilePayload(subject, body);
    rows.push({
      display_name: subject.displayName,
      employee_id: member.employee_id,
      status: response.status,
      ok: response.ok,
      profile_kind: payload.profile_kind,
      checks: payload.checks
    });
  }
  return rows;
}

async function openSubjectProfile(page, subject) {
  const row = page.locator("button.hr-roster-person").filter({ hasText: subject.displayName }).first();
  await row.waitFor({ state: "visible", timeout: 20000 });
  await row.click();
  const panel = page.locator('[data-people-detail-panel="open"]').first();
  await panel.waitFor({ state: "visible", timeout: 20000 });
  const profile = panel.locator(`[data-people-professional-profile-kind="${subject.expectedKind}"]`).first();
  await profile.waitFor({ state: "visible", timeout: 20000 });
  await page.waitForFunction(
    ({ expectedName, expectedKind }) => {
      const panelElement = document.querySelector('[data-people-detail-panel="open"]');
      const profileElement = document.querySelector(`[data-people-professional-profile-kind="${expectedKind}"]`);
      return Boolean(panelElement?.textContent?.includes(expectedName) && profileElement?.textContent?.includes("전문 프로필"));
    },
    { expectedName: subject.displayName, expectedKind: subject.expectedKind },
    { timeout: 20000 }
  );
  const panelText = normalizeText(await panel.innerText());
  const profileText = normalizeText(await profile.innerText());
  const screenshot = `${SCREENSHOT_DIR}/${subject.slug}.png`;
  await panel.screenshot({ path: join(ROOT, screenshot) });
  await page.locator("button.people-detail-close").first().click();
  await panel.waitFor({ state: "hidden", timeout: 10000 });
  return { panelText, profileText, screenshot };
}

function subjectChecks(subject, observed) {
  const checks = [];
  checks.push({
    name: `${subject.displayName} professional profile section visible`,
    passed: observed.profileText.includes("전문 프로필")
  });
  checks.push({
    name: `${subject.displayName} profile kind rendered as ${subject.expectedKind}`,
    passed: observed.profileText.length > 0,
    expected_kind: subject.expectedKind
  });
  for (const requiredText of subject.requiredTexts) {
    checks.push({
      name: `${subject.displayName} UI contains ${requiredText}`,
      passed: observed.profileText.includes(requiredText),
      expected: requiredText
    });
  }
  for (const forbiddenText of subject.forbiddenTexts) {
    checks.push({
      name: `${subject.displayName} UI excludes ${forbiddenText}`,
      passed: !observed.profileText.includes(forbiddenText),
      forbidden: forbiddenText
    });
  }
  return checks;
}

function writeMarkdownReceipt(proof) {
  const lines = [
    "# People Professional Profile Browser Proof",
    "",
    `Generated at: ${proof.generated_at}`,
    `Verdict: ${proof.verdict}`,
    "",
    "## Sources",
    "",
    "- AMIC Law: https://amic-law.vercel.app/",
    "- PetraBridge: https://petrabridge.vercel.app/",
    "",
    "## Subjects",
    "",
    ...proof.subjects.map((subject) => `- ${subject.display_name}: ${subject.verdict} / kind=${subject.expected_kind} / screenshot=\`${subject.screenshot}\``),
    "",
    "## Assertions",
    "",
    ...proof.assertions.map((assertion) => `- ${assertion.passed ? "PASS" : "FAIL"}: ${assertion.name}`),
    "",
    "## Boundary",
    "",
    "- Runtime web scraping: false",
    "- Production write: false",
    "- OIDC / DB conversion / production_ready claim: false",
    ""
  ];
  writeFileSync(join(ROOT, MD_PATH), `${lines.join("\n")}\n`);
}

mkdirSync(join(ROOT, ARTIFACT_DIR), { recursive: true });
mkdirSync(join(ROOT, SCREENSHOT_DIR), { recursive: true });

const sourceMap = readJson(SOURCE_MAP_PATH);
const roster = readJson(ROSTER_PATH);
const rosterByName = new Map((roster.members ?? []).map((member) => [member.display_name, member]));
const browserAccount = findRegisteredAccountByEmail(BROWSER_ACCOUNT_EMAIL);
if (!browserAccount) throw new Error(`missing browser account ${BROWSER_ACCOUNT_EMAIL}`);

for (const subject of subjects) {
  const member = rosterByName.get(subject.displayName);
  if (!member) throw new Error(`missing roster member for ${subject.displayName}`);
  if (member.professional_profile?.profile_kind !== subject.expectedKind) {
    throw new Error(`${subject.displayName} expected roster kind ${subject.expectedKind}, received ${member.professional_profile?.profile_kind}`);
  }
}

const managed = await ensureServers();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 980 } });
const consoleMessages = [];
const pageErrors = [];
const requests = [];
const responses = [];

page.on("console", (message) => {
  if (["error", "warning"].includes(message.type())) consoleMessages.push({ type: message.type(), text: message.text() });
});
page.on("pageerror", (error) => pageErrors.push(String(error)));
page.on("request", (request) => requests.push({ method: request.method(), url: request.url() }));
page.on("response", (response) => responses.push({ status: response.status(), url: response.url() }));

let apiRows = [];
let pageHtml = "";
const subjectProofs = [];
try {
  apiRows = await fetchApiProfiles(rosterByName, await apiSessionHeaders(API_ORIGIN, browserAccount));
  await page.goto(`${WEB_ORIGIN}/?locale=ko&view=auth&authStep=login&ctx=allow`, { waitUntil: "networkidle" });
  await page.locator("[data-login-email]").fill(browserAccount.email);
  await page.locator("[data-login-password]").fill(browserAccount.local_dev.synthetic_token);
  await page.locator('[data-login-form="email-password"] button[type="submit"]').click();
  await page.waitForURL(/view=home/, { timeout: 20000 });

  await page.goto(`${WEB_ORIGIN}/?locale=ko&view=people&data=live&ctx=allow#people-members`, { waitUntil: "networkidle" });
  await page.locator("#people-home").waitFor({ state: "visible", timeout: 20000 });
  await page.locator(".hr-roster-person").first().waitFor({ state: "visible", timeout: 20000 });

  for (const subject of subjects) {
    const observed = await openSubjectProfile(page, subject);
    const checks = subjectChecks(subject, observed);
    subjectProofs.push({
      display_name: subject.displayName,
      expected_kind: subject.expectedKind,
      screenshot: observed.screenshot,
      text_sample: observed.profileText.slice(0, 500),
      checks,
      verdict: checks.every((check) => check.passed) ? "PASS" : "FAIL"
    });
  }
  pageHtml = await page.content();
} finally {
  await browser.close();
  stopManaged(managed);
}

const apiChecks = apiRows.flatMap((row) => [
  { name: `${row.display_name} API status < 500`, passed: row.status < 500, status: row.status },
  ...row.checks
]);
const uiChecks = subjectProofs.flatMap((subject) => subject.checks);
const apiWrites = requests.filter((request) =>
  request.url.includes("/api/") &&
  !request.url.includes("/api/auth/login") &&
  !["GET", "HEAD", "OPTIONS"].includes(request.method)
);
const screenshotChecks = subjectProofs.map((subject) => ({
  name: `${subject.display_name} screenshot exists`,
  passed: existsSync(join(ROOT, subject.screenshot)),
  screenshot: subject.screenshot
}));
const unexpectedConsoleMessages = consoleMessages.filter((item) => !/Failed to load resource: the server responded with a status of 4\d\d/.test(item.text));
const assertions = [
  {
    name: "source-map proof subject ids are present",
    passed: subjects.every((subject) => sourceMap.proof_subject_employee_ids?.includes(rosterByName.get(subject.displayName)?.employee_id))
  },
  {
    name: "browser proof performed no non-auth API writes",
    passed: apiWrites.length === 0,
    api_writes: apiWrites
  },
  {
    name: "browser DOM contains no local password or session token",
    passed: !pageHtml.includes(browserAccount.local_dev.synthetic_token) && !pageHtml.includes("lawos_session_v1."),
    details: {
      local_password_rendered: pageHtml.includes(browserAccount.local_dev.synthetic_token),
      session_token_rendered: pageHtml.includes("lawos_session_v1.")
    }
  },
  {
    name: "browser has no page errors",
    passed: pageErrors.length === 0,
    page_errors: pageErrors
  },
  {
    name: "browser has no unexpected console warnings or errors",
    passed: unexpectedConsoleMessages.length === 0,
    unexpected_console_messages: unexpectedConsoleMessages
  },
  ...apiChecks,
  ...uiChecks,
  ...screenshotChecks
];

const proof = {
  schema_version: "law-firm-os.lazycodex.people-professional-profile-browser-proof.v0.1",
  generated_at: new Date().toISOString(),
  verdict: assertions.every((assertion) => assertion.passed) ? "PASS" : "FAIL",
  source_urls: ["https://amic-law.vercel.app/", "https://petrabridge.vercel.app/"],
  source_map: SOURCE_MAP_PATH,
  roster_source: ROSTER_PATH,
  web_origin: WEB_ORIGIN,
  api_origin: API_ORIGIN,
  subjects: subjectProofs,
  api_readback: apiRows.map((row) => ({
    display_name: row.display_name,
    employee_id: row.employee_id,
    status: row.status,
    profile_kind: row.profile_kind
  })),
  assertions,
  network: {
    api_writes: apiWrites,
    auth_login_request_count: requests.filter((request) => request.url.includes("/api/auth/login")).length,
    api_requests: requests.filter((request) => request.url.includes("/api/")),
    api_responses: responses.filter((response) => response.url.includes("/api/"))
  },
  claim_boundary: {
    runtime_web_scraping: false,
    production_write: false,
    private_unapproved_claims_added: false,
    firm_level_experience_asserted_as_personal_without_source: false,
    oidc_implementation: false,
    db_conversion: false,
    production_ready_claim: false,
    go_live_claim: false
  }
};

writeFileSync(join(ROOT, JSON_PATH), `${JSON.stringify(proof, null, 2)}\n`);
writeMarkdownReceipt(proof);

console.log(JSON.stringify({
  verdict: proof.verdict,
  json: JSON_PATH,
  md: MD_PATH,
  subjects: subjectProofs.map((subject) => ({ display_name: subject.display_name, verdict: subject.verdict, screenshot: subject.screenshot })),
  assertions: `${assertions.filter((assertion) => assertion.passed).length}/${assertions.length}`,
  api_writes: apiWrites.length
}, null, 2));

if (proof.verdict !== "PASS") process.exit(1);
