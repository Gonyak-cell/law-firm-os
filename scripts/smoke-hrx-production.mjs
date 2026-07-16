#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const DEFAULT_BASE_URL = "https://d2mthcc8vp3cr2.cloudfront.net";
const baseUrl = (process.env.LAWOS_PRODUCTION_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
const receiptDate = process.env.LAWOS_HRX_PRODUCTION_SMOKE_RECEIPT_DATE ?? localDateStamp();
const receiptJsonPath =
  process.env.LAWOS_HRX_PRODUCTION_SMOKE_RECEIPT_JSON ??
  `docs/lazycodex/evidence/matter-web/artifacts/hrx-production-smoke-${receiptDate}.json`;
const receiptMdPath =
  process.env.LAWOS_HRX_PRODUCTION_SMOKE_RECEIPT_MD ??
  `docs/lazycodex/evidence/matter-web/artifacts/hrx-production-smoke-${receiptDate}.md`;

const FORGED_HRX_READ_HEADERS = Object.freeze({
  "x-lawos-tenant-id": "tenant_amic_matter_vault",
  "x-lawos-actor-id": "production-monitor",
  "x-lawos-actor-role": "security_admin,hr_admin,people_ops",
  "x-lawos-hrx-scopes": [
    "hrx.employee.read",
    "hrx.document.read",
    "hrx.lifecycle.read"
  ].join(",")
});

function localDateStamp(date = new Date(), timeZone = process.env.TZ || "Asia/Seoul") {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  })
    .formatToParts(date)
    .reduce((acc, part) => {
      if (part.type !== "literal") acc[part.type] = part.value;
      return acc;
    }, {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}

async function getText(path) {
  const response = await fetch(`${baseUrl}${path}`);
  return { status: response.status, text: await response.text() };
}

async function getJson(path, headers = {}) {
  const response = await fetch(`${baseUrl}${path}`, { headers });
  const text = await response.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch (error) {
    throw new Error(`${path} returned non-JSON response: ${text.slice(0, 120)}`);
  }
  return { status: response.status, body };
}

function writeReceipt(report) {
  mkdirSync(dirname(receiptJsonPath), { recursive: true });
  writeFileSync(receiptJsonPath, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(
    receiptMdPath,
    `# HRX Production Smoke ${report.verdict}\n\n` +
      `Base URL: ${report.base_url}\n\n` +
      `Failed check: ${report.failed_check ?? "none"}\n\n` +
      `Protected HRX data exposed without authentication: ${report.protected_hrx_data_exposed === true ? "yes" : "no"}\n\n` +
      `Receipt JSON: \`${receiptJsonPath}\`\n`
  );
}

function finish(report) {
  writeReceipt(report);
  const output = JSON.stringify(report, null, 2);
  if (report.verdict === "PASS") {
    console.log(output);
    return;
  }
  console.error(output);
  process.exit(1);
}

try {
  const root = await getText("/");
  assert.equal(root.status, 200, "production web root must return 200");
  const assets = [...new Set(root.text.match(/assets\/[^"')]+?\.(?:js|css)/g) ?? [])];
  assert.ok(assets.some((asset) => asset.endsWith(".js")), "production root must reference a JS asset");
  assert.ok(assets.some((asset) => asset.endsWith(".css")), "production root must reference a CSS asset");

  const health = await getJson("/api/health");
  assert.equal(health.status, 200, "production API health must return 200");

  const forgedEmployeeRead = await getJson("/api/hrx/employees", FORGED_HRX_READ_HEADERS);
  assert.equal(forgedEmployeeRead.status, 401, "production HRX employee data must reject forged identity headers without a signed session");

  const missingContext = await getJson("/api/hrx/employees");
  assert.equal(missingContext.status, 401, "production HRX routes must require an authenticated session before tenant evaluation");

  const forgedDocumentRead = await getJson("/api/hrx/documents?employee_id=synthetic-probe", {
    ...FORGED_HRX_READ_HEADERS,
    "x-lawos-hrx-scopes": "hrx.employee.read"
  });
  assert.equal(forgedDocumentRead.status, 401, "production HRX documents must reject forged scope headers without a signed session");

  finish({
    base_url: baseUrl,
    web_root_status: root.status,
    root_assets: assets,
    api_health_status: health.status,
    verdict: "PASS",
    smoke_scope: "public_health_and_unauthenticated_data_boundary",
    authenticated_roster_validation_performed: false,
    protected_hrx_data_exposed: false,
    negative_security_smoke: {
      forged_employee_headers_status: forgedEmployeeRead.status,
      missing_context_status: missingContext.status,
      forged_document_headers_status: forgedDocumentRead.status
    },
    provider_live_claims: {
      payroll_provider_live: false,
      electronic_contract_provider_live: false
    }
  });
} catch (error) {
  finish({
    verdict: "ERROR",
    base_url: baseUrl,
    failed_check: error?.message ?? "unknown_error",
    provider_live_claims: {
      payroll_provider_live: false,
      electronic_contract_provider_live: false
    }
  });
}
