import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, "..");
const RECEIPT_PATH = join(
  ROOT_DIR,
  "docs/goal-closeout/sf-client-matter-parity/ko-saas-copy-validation-receipt.json",
);
const WEB_ORIGIN = process.env.KO_SAAS_UI_URL || "http://127.0.0.1:5176";
const API_HEALTH_URL = process.env.LAWOS_API_HEALTH_URL || "http://127.0.0.1:4180/api/health";
const STORE_DIR = mkdtempSync(join(tmpdir(), "lawos-ko-copy-"));
const MANAGED_PROCESSES = [];

const ALLOWED_PROPER_NOUNS = ["Client", "Matter", "People", "Vault"];
const FORBIDDEN_TERMS = [
  "Opening your matter workspace",
  "Preparing your workspace",
  "Command Center",
  "Command",
  "Channel message",
  "Channel",
  "Messages",
  "Timeline",
  "Calendar",
  "Finance",
  "Analytics",
  "CRM",
  "Intake",
  "Master Data",
  "Object Manager",
  "Opportunity",
  "Clearance",
  "Account ",
  " Contact ",
  "Owner",
  "provider",
  "Provider",
  "payload",
  "SQL",
  "credential",
  "grant",
  "Dry-run",
  "Rollback",
  "WIP",
  "Invoice",
  "Internal",
  "Section",
  "Risk",
  "Status",
  "Client profitability",
  "client_group",
  "matter_count",
  "profitability_amount",
  "Report ",
  "Reports",
  "AI 검토",
  "리드",
  "리포트",
];

const ROUTES = [
  route("home"),
  route("loading"),
  route("auth", "", "&authStep=login"),
  route("clients"),
  route("clients", "client-leads"),
  route("clients", "client-opportunities"),
  route("clients", "client-intake"),
  route("clients", "client-accounts"),
  route("clients", "client-contacts"),
  route("clients", "client-data"),
  route("clients", "client-reports"),
  route("clients", "client-import"),
  route("matters"),
  route("matters", "matter-command"),
  route("matters", "matter-vault"),
  route("matters", "matter-timeline"),
  route("matters", "matter-calendar"),
  route("matters", "matter-channel"),
  route("matters", "matter-opening"),
  route("matters", "matter-team"),
  route("matters", "matter-billing"),
  route("matters", "matter-analytics"),
  route("matters", "matter-import"),
  route("people"),
  route("people", "people-members"),
  route("people", "people-admin"),
  route("people", "people-payroll"),
  route("people", "people-ai"),
  route("vault"),
  route("vault", "vault-documents"),
];

function route(view, section = "", extra = "") {
  return { view, section, extra };
}

function routeUrl(origin, locale, { view, section, extra }) {
  const hash = section ? `#${encodeURIComponent(section)}` : "";
  return `${origin}/?locale=${locale}&view=${view}&ctx=allow${extra}${hash}`;
}

async function isReachable(url) {
  try {
    const response = await fetch(url);
    return response.ok;
  } catch {
    return false;
  }
}

async function waitFor(url, label, timeoutMs = 30_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await isReachable(url)) return;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`${label} did not become reachable: ${url}`);
}

function spawnManaged(command, args, options = {}) {
  const child = spawn(command, args, {
    cwd: ROOT_DIR,
    stdio: "ignore",
    env: {
      ...process.env,
      ...options.env,
    },
  });
  MANAGED_PROCESSES.push(child);
  return child;
}

async function ensureServers() {
  if (!(await isReachable(API_HEALTH_URL))) {
    spawnManaged("npm", ["--workspace", "apps/api", "run", "start"], {
      env: {
        LAWOS_AUDIT_STORE: join(STORE_DIR, "audit.json"),
        LAWOS_HRX_STORE: join(STORE_DIR, "hrx.json"),
        LAWOS_MATTER_STORE: join(STORE_DIR, "matter.json"),
        LAWOS_DMS_STORE: join(STORE_DIR, "dms.json"),
        LAWOS_API_PORT: "4180",
      },
    });
    await waitFor(API_HEALTH_URL, "API");
  }

  if (!(await isReachable(WEB_ORIGIN))) {
    const port = new URL(WEB_ORIGIN).port || "5176";
    spawnManaged("npm", ["--workspace", "apps/web", "run", "dev", "--", "--port", port]);
    await waitFor(WEB_ORIGIN, "web app");
  }
}

function compactText(text) {
  return text.replace(/\s+/g, " ").trim();
}

function findForbiddenTerms(text) {
  return FORBIDDEN_TERMS.filter((term) => text.includes(term));
}

function snippetFor(text, term) {
  const index = text.indexOf(term);
  if (index < 0) return "";
  const start = Math.max(0, index - 80);
  const end = Math.min(text.length, index + term.length + 80);
  return text.slice(start, end);
}

function writeReceipt(receipt) {
  mkdirSync(dirname(RECEIPT_PATH), { recursive: true });
  writeFileSync(RECEIPT_PATH, `${JSON.stringify(receipt, null, 2)}\n`);
}

async function main() {
  await ensureServers();

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  const failures = [];
  const checkedRoutes = [];

  try {
    for (const locale of ["ko", "en"]) {
      for (const routeSpec of ROUTES) {
        const url = routeUrl(WEB_ORIGIN, locale, routeSpec);
        await page.goto(url, { waitUntil: "networkidle" });
        await page.waitForTimeout(250);
        const bodyText = compactText(await page.locator("body").innerText());
        const forbidden = findForbiddenTerms(bodyText);
        checkedRoutes.push({ locale, view: routeSpec.view, section: routeSpec.section || null, url });

        for (const term of forbidden) {
          failures.push({
            locale,
            view: routeSpec.view,
            section: routeSpec.section || null,
            term,
            snippet: snippetFor(bodyText, term),
            url,
          });
        }
      }
    }
  } finally {
    await browser.close();
    for (const child of MANAGED_PROCESSES) {
      child.kill("SIGTERM");
    }
  }

  const receipt = {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    base_url: WEB_ORIGIN,
    api_health_url: API_HEALTH_URL,
    allowed_proper_nouns: ALLOWED_PROPER_NOUNS,
    forbidden_term_count: FORBIDDEN_TERMS.length,
    checked_route_count: checkedRoutes.length,
    checked_routes: checkedRoutes,
    passed: failures.length === 0,
    failures,
  };
  writeReceipt(receipt);

  if (failures.length > 0) {
    console.error(`Korean SaaS copy validation failed with ${failures.length} issue(s).`);
    console.error(JSON.stringify(failures.slice(0, 12), null, 2));
    process.exitCode = 1;
    return;
  }

  console.log(
    `Korean SaaS copy validation passed: ${checkedRoutes.length} routes, ${FORBIDDEN_TERMS.length} forbidden terms.`,
  );
  console.log(`Receipt: ${RECEIPT_PATH}`);
}

main().catch((error) => {
  for (const child of MANAGED_PROCESSES) {
    child.kill("SIGTERM");
  }
  console.error(error);
  process.exitCode = 1;
});
