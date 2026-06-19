#!/usr/bin/env node
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const REQUIRED_FILES = Object.freeze([
  "apps/web/src/data/cmpConsoleCatalog.js",
  "apps/web/src/data/cmpApiClient.js",
  "apps/web/src/components/CmpConsoleSurface.jsx",
  "apps/web/src/App.jsx",
  "apps/web/src/data/nav.js",
  "apps/web/src/components/Shell.jsx",
  "apps/web/src/i18n.js",
  "apps/web/test/cmp-g11-console.test.mjs",
  "docs/reorganization/client-matter-os/cmp-v1/13-cmp-g11-ui-console-runtime-report.md",
]);

const CMP_G11_TUWS = Object.freeze(
  Array.from({ length: 48 }, (_, index) => `CMP-G11-W11-T${String(index + 1).padStart(3, "0")}`),
);

const REQUIRED_ROUTES = Object.freeze([
  "/home",
  "/clients",
  "/clients/:id",
  "/parties/:id",
  "/relationships/graph",
  "/crm/opportunities",
  "/intake",
  "/matters/:id",
  "/matters/open",
  "/matters/:id/team",
  "/matters/:id/tasks",
  "/matters/:id/timeline",
  "/people",
  "/people/:id",
  "/people/capacity",
  "/people/:id/attendance",
  "/people/onboarding",
  "/vault/hr-documents",
  "/vault/matters/:id",
  "/vault/documents/:id",
  "/vault/documents/:id/versions",
  "/vault/email-filing",
  "/vault/secure-links",
  "/data-rooms/:id",
  "/vault/search",
  "/billing/time",
  "/billing/wip",
  "/billing/prebills",
  "/billing/invoices/:id",
  "/finance/ar",
  "/analytics/matter-profitability",
  "/analytics/employee-utilization",
  "/ai/review",
  "/admin/audit",
  "/admin/user-employee-links",
  "/admin/vault-connectors",
  "/admin/policies",
  "/admin/holds-walls",
]);

const REQUIRED_MARKERS = Object.freeze([
  "CMP_CONSOLE_UI_STATES",
  "CMP_CONSOLE_BACKEND_EVIDENCE",
  "CMP_CONSOLE_RUNTIME_READINESS",
  "runtime_ui_evidence_only__backend_runtime_required__durable_persistence_open",
  "PermissionDeniedState",
  "ReviewRequiredState",
  "VaultSecurityBadges",
  "LegalHold",
  "Privilege",
  "HRSensitive",
  "x-tenant-id",
  "x-actor-id",
  "x-permission-receipt-id",
  "x-idempotency-key",
  "audit_event_type",
]);

const REQUIRED_TEST_MARKERS = Object.freeze([
  "traces all 48 UI TUWs",
  "app route, nav, and sidebar are wired",
  "common UI states and security badges are implemented",
  "domain API client carries tenant actor permission audit idempotency context",
  "preserves UI-only readiness and does not claim R4",
]);

function addFinding(findings, code, message, details = {}) {
  findings.push({ code, message, details });
}

async function exists(file) {
  try {
    await stat(path.resolve(file));
    return true;
  } catch {
    return false;
  }
}

async function readText(file) {
  return readFile(path.resolve(file), "utf8");
}

async function readJson(file) {
  return JSON.parse(await readText(file));
}

const findings = [];

for (const file of REQUIRED_FILES) {
  if (!(await exists(file))) addFinding(findings, "MISSING_FILE", `Missing CMP-G11 runtime artifact: ${file}`);
}

if (findings.length === 0) {
  const catalog = await readText("apps/web/src/data/cmpConsoleCatalog.js");
  const client = await readText("apps/web/src/data/cmpApiClient.js");
  const component = await readText("apps/web/src/components/CmpConsoleSurface.jsx");
  const app = await readText("apps/web/src/App.jsx");
  const nav = await readText("apps/web/src/data/nav.js");
  const shell = await readText("apps/web/src/components/Shell.jsx");
  const i18n = await readText("apps/web/src/i18n.js");
  const tests = await readText("apps/web/test/cmp-g11-console.test.mjs");
  const report = await readText("docs/reorganization/client-matter-os/cmp-v1/13-cmp-g11-ui-console-runtime-report.md");
  const crosswalk = await readText("docs/reorganization/client-matter-os/cmp-v1/cmp-v1-tuw-crosswalk.csv");
  const pkg = await readJson("package.json");

  for (const tuwId of CMP_G11_TUWS) {
    if (!catalog.includes(tuwId)) addFinding(findings, "MISSING_CATALOG_TUW", "CMP-G11 catalog must trace every TUW.", { tuwId });
    if (!report.includes(tuwId)) addFinding(findings, "MISSING_REPORT_TUW", "CMP-G11 report must trace every TUW.", { tuwId });
    if (!crosswalk.includes(tuwId)) addFinding(findings, "MISSING_CROSSWALK_TUW", "CMP v1 crosswalk must contain every CMP-G11 TUW.", { tuwId });
  }

  for (const route of REQUIRED_ROUTES) {
    if (!catalog.includes(route)) addFinding(findings, "MISSING_UI_ROUTE", "CMP-G11 catalog missing required UI route.", { route });
  }

  for (const marker of REQUIRED_MARKERS) {
    if (![catalog, client, component, app, nav, shell, i18n, tests, report].some((text) => text.includes(marker))) {
      addFinding(findings, "MISSING_MARKER", "CMP-G11 runtime missing required marker.", { marker });
    }
  }

  for (const marker of REQUIRED_TEST_MARKERS) {
    if (!tests.includes(marker)) {
      addFinding(findings, "MISSING_TEST_MARKER", "CMP-G11 UI test missing required behavior marker.", { marker });
    }
  }

  for (const phrase of ['id: "cmp"', 'view === "cmp"', "CmpConsoleSurface", "cmpConsoleTitle"]) {
    if (![app, nav, i18n].some((text) => text.includes(phrase))) {
      addFinding(findings, "MISSING_APP_WIRING", "CMP-G11 web shell is not wired.", { phrase });
    }
  }

  for (const gate of ["CMP-G1-W01", "CMP-G5-W05", "CMP-G9-W09", "CMP-G10-W10"]) {
    if (!catalog.includes(gate) || !report.includes(gate)) {
      addFinding(findings, "MISSING_BACKEND_DEPENDENCY", "CMP-G11 must depend on G1-G10 backend evidence.", { gate });
    }
  }

  const forbiddenReadinessClaims = ["R4-candidate", "runtime_readiness: \"R4", "runtime_readiness_claim: \"R4"];
  for (const claim of forbiddenReadinessClaims) {
    if (catalog.includes(claim) || component.includes(claim) || report.includes(claim)) {
      addFinding(findings, "PREMATURE_R4_CLAIM", "CMP-G11 UI runtime evidence must not claim R4.", { claim });
    }
  }

  if (!pkg.scripts?.["client-matter:cmp-g11:validate"]) {
    addFinding(findings, "MISSING_NPM_SCRIPT", "package.json missing client-matter:cmp-g11:validate.");
  }
}

if (findings.length > 0) {
  console.error("Client-Matter OS CMP-G11 runtime validation failed:");
  for (const finding of findings) {
    console.error(`- ${finding.code}: ${finding.message}`);
    if (Object.keys(finding.details).length > 0) console.error(`  ${JSON.stringify(finding.details)}`);
  }
  process.exit(1);
}

console.log("Client-Matter OS CMP-G11 runtime validation passed.");
console.log("cmp_g11_tuws: 48/48");
console.log("ui_routes: cmp IA/client/party/crm/intake/matter/people/vault/finance/analytics/ai/admin surfaces");
console.log("ui_states: loading/empty/denied/review-required/error");
console.log("runtime_readiness_claim: runtime_ui_evidence_only__backend_runtime_required__durable_persistence_open");
