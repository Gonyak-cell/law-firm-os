#!/usr/bin/env node
import assert from "node:assert/strict";

const DEFAULT_BASE_URL = "https://d2mthcc8vp3cr2.cloudfront.net";
const baseUrl = (process.env.LAWOS_PRODUCTION_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
const expectedEmployeeCount = Number(process.env.LAWOS_HRX_EXPECTED_EMPLOYEE_COUNT ?? "9");
const expectedSourceRef = process.env.LAWOS_HRX_EXPECTED_SOURCE_REF ?? "hrx-member-roster-source-of-truth";

const HRX_READ_HEADERS = Object.freeze({
  "x-lawos-tenant-id": "tenant_amic_matter_vault",
  "x-lawos-actor-id": "production-monitor",
  "x-lawos-actor-role": "security_admin,hr_admin,people_ops",
  "x-lawos-hrx-scopes": [
    "hrx.employee.read",
    "hrx.document.read",
    "hrx.lifecycle.read"
  ].join(",")
});

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

const root = await getText("/");
assert.equal(root.status, 200, "production web root must return 200");
const assets = [...new Set(root.text.match(/assets\/[^"')]+?\.(?:js|css)/g) ?? [])];
assert.ok(assets.some((asset) => asset.endsWith(".js")), "production root must reference a JS asset");
assert.ok(assets.some((asset) => asset.endsWith(".css")), "production root must reference a CSS asset");

const health = await getJson("/api/health");
assert.equal(health.status, 200, "production API health must return 200");

const employees = await getJson("/api/hrx/employees", HRX_READ_HEADERS);
assert.equal(employees.status, 200, "production HRX employees must return 200");
assert.equal(employees.body.outcome, "ok");
assert.equal(employees.body.employees.length, expectedEmployeeCount);
assert.ok(
  employees.body.employees.every((employee) => employee.source_ref === expectedSourceRef),
  "production HRX employees must use the roster source of truth"
);
const kimYangTae = employees.body.employees.find((employee) => employee.display_name === "김양태");
assert.ok(kimYangTae, "production HRX employees must include 김양태");
assert.equal(kimYangTae.title, "대표이사");
assert.equal(kimYangTae.affiliation, "PETRA BRIDGE PARTNERS");
assert.equal(kimYangTae.department, "Finance");
assert.equal(kimYangTae.organization_group, "PETRA BRIDGE");

const onboarding = await getJson("/api/hrx/lifecycle/onboarding", HRX_READ_HEADERS);
assert.equal(onboarding.status, 200, "production HRX onboarding lifecycle must return 200");

const offboarding = await getJson("/api/hrx/lifecycle/offboarding", HRX_READ_HEADERS);
assert.equal(offboarding.status, 200, "production HRX offboarding lifecycle must return 200");

const missingContext = await getJson("/api/hrx/employees");
assert.equal(missingContext.status, 400, "production HRX routes must fail closed without tenant context");
assert.equal(missingContext.body.safe_error_code, "HRX_TENANT_CONTEXT_REQUIRED");

const docsDenied = await getJson("/api/hrx/documents?employee_id=emp_amic_ytkim", {
  ...HRX_READ_HEADERS,
  "x-lawos-hrx-scopes": "hrx.employee.read"
});
assert.equal(docsDenied.status, 403, "production HRX documents must deny missing document scope");
assert.equal(docsDenied.body.safe_error_code, "HRX_AUTHZ_DENIED");

const summary = {
  verdict: "PASS",
  base_url: baseUrl,
  web_root_status: root.status,
  root_assets: assets,
  api_health_status: health.status,
  hrx_employees_status: employees.status,
  hrx_employees_count: employees.body.employees.length,
  roster_source_ref: expectedSourceRef,
  sample_member: {
    display_name: kimYangTae.display_name,
    title: kimYangTae.title,
    affiliation: kimYangTae.affiliation,
    department: kimYangTae.department,
    organization_group: kimYangTae.organization_group,
    source_ref: kimYangTae.source_ref
  },
  lifecycle: {
    onboarding_status: onboarding.status,
    offboarding_status: offboarding.status
  },
  negative_security_smoke: {
    missing_context_status: missingContext.status,
    missing_context_safe_error_code: missingContext.body.safe_error_code,
    documents_missing_scope_status: docsDenied.status,
    documents_missing_scope_safe_error_code: docsDenied.body.safe_error_code
  },
  provider_live_claims: {
    payroll_provider_live: false,
    electronic_contract_provider_live: false
  }
};

console.log(JSON.stringify(summary, null, 2));
