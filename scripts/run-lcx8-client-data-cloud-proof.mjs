#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const ROOT = process.cwd();
const WEB = process.env.MATTER_UI_URL ?? "http://127.0.0.1:5174";
const API = process.env.LAWOS_API_BASE_URL ?? "http://127.0.0.1:4180";
const ARTIFACT_DIR = "docs/lazycodex/evidence/matter-web/artifacts";
const JSON_PATH = `${ARTIFACT_DIR}/lcx8-action-0129-0134-client-data-cloud-proof.json`;
const MD_PATH = `${ARTIFACT_DIR}/lcx8-action-0129-0134-client-data-cloud-proof.md`;
const SCREENSHOT_PATH = `${ARTIFACT_DIR}/lcx8-action-0129-0134-client-data-cloud-proof.png`;
const PERMISSION_CONTEXT_HEADER = "x-lawos-permission-context";
const TENANT = "tenant_sf_b_w07_synthetic";
const ACTOR = "matter_data_cloud_operator";

const permissionContext = (effect = "allow") => JSON.stringify({
  principal: { user_id: ACTOR, tenant_id: TENANT, role_ids: ["data_cloud_operator"] },
  rules: effect === "allow" ? [{ id: "rule_lcx8_data_cloud_allow", effect: "allow", action: "*" }] : [],
  object_acl: []
});

const reviewContext = JSON.stringify({
  principal: { user_id: ACTOR, tenant_id: TENANT, role_ids: ["data_cloud_operator"] },
  rules: [{ id: "rule_lcx8_data_cloud_review", effect: "review_required", action: "*" }],
  object_acl: []
});

const query = new URLSearchParams({
  tenant_id: TENANT,
  permission_ref: "ui_sf_b_w07_data_cloud_enrichment",
  audit_hint_ref: "ui_sf_b_w07_data_cloud_probe"
}).toString();

function pickBody(body) {
  if (!body || typeof body !== "object") return null;
  const item = body.item && typeof body.item === "object" ? body.item : null;
  const result = body.result && typeof body.result === "object" ? body.result : null;
  return {
    outcome: body.outcome ?? null,
    ui_state: body.ui_state ?? null,
    safe_error_codes: body.safe_error_codes ?? [],
    audit_action: body.audit_event?.action ?? null,
    audit_event_id_present: Boolean(body.audit_event?.event_id),
    provider_payload_included: body.provider_payload_included === true,
    raw_identifiers_included: body.raw_identifiers_included === true,
    production_ready_claim: body.production_ready_claim === true,
    item: item ? {
      provider_id: item.provider_id ?? null,
      job_id: item.job_id ?? null,
      identity_resolution_id: item.identity_resolution_id ?? null,
      activation_id: item.activation_id ?? null,
      status: item.status ?? null,
      ui_state: item.ui_state ?? null,
      provider_call_performed: item.provider_call_performed === true,
      product_records_mutated: item.product_records_mutated === true,
      provider_configured: item.provider_configured === true,
      consent_applied: item.consent_applied === true,
      automatic_merge_performed: item.automatic_merge_performed === true,
      canonical_master_data_write_performed: item.canonical_master_data_write_performed === true,
      direct_matter_creation_performed: item.direct_matter_creation_performed === true,
      activation_submitted: item.activation_submitted === true,
      audience_member_identifiers_included: item.audience_member_identifiers_included === true,
      raw_identifiers_included: item.raw_identifiers_included === true,
      raw_provider_fields_included: item.raw_provider_fields_included === true,
      raw_contact_values_included: item.raw_contact_values_included === true,
      direct_identifiers_included: item.direct_identifiers_included === true,
      provider_payload_included: item.provider_payload_included === true,
      credentials_included: item.credentials_included === true,
      provider_tokens_included: item.provider_tokens_included === true,
      production_ready_claim: item.production_ready_claim === true
    } : null,
    result: result ? {
      result_id: result.result_id ?? null,
      job_id: result.job_id ?? null,
      status: result.status ?? null,
      ui_state: result.ui_state ?? null,
      provider_receipt_required: result.provider_receipt_required === true,
      provider_call_performed: result.provider_call_performed === true,
      raw_provider_fields_included: result.raw_provider_fields_included === true,
      raw_contact_values_included: result.raw_contact_values_included === true,
      direct_identifiers_included: result.direct_identifiers_included === true,
      production_ready_claim: result.production_ready_claim === true
    } : null,
    item_count: Array.isArray(body.items) ? body.items.length : null
  };
}

async function responseSummary(response) {
  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  return {
    method: response.request().method(),
    url: response.url().replace(WEB, "").replace(API, ""),
    status: response.status(),
    ok: response.ok(),
    body: pickBody(body)
  };
}

function dataCloudResponse(method, pathPart) {
  return (response) => {
    const url = new URL(response.url());
    return response.request().method() === method && url.pathname.includes(pathPart);
  };
}

async function clickAndCollect(page, { id, label, selector, waits, expectedSelector, expectedPattern }) {
  const pending = waits.map((wait) =>
    page.waitForResponse(dataCloudResponse(wait.method, wait.pathPart), { timeout: 15000 })
  );
  await page.locator(selector).first().click();
  const responses = await Promise.all(pending);
  await page.waitForFunction(
    ({ selector: targetSelector, source, flags }) => {
      const element = document.querySelector(targetSelector);
      return Boolean(element && new RegExp(source, flags).test(element.textContent ?? ""));
    },
    { selector: expectedSelector, source: expectedPattern.source, flags: expectedPattern.flags },
    { timeout: 15000 }
  );
  const domText = await page.locator(expectedSelector).first().innerText();
  return {
    id,
    label,
    selector,
    expected_text_pattern: expectedPattern.toString(),
    dom_text: domText,
    responses: await Promise.all(responses.map(responseSummary))
  };
}

function addAssertion(assertions, name, passed, details = {}) {
  assertions.push({ name, passed: Boolean(passed), details });
}

mkdirSync(join(ROOT, ARTIFACT_DIR), { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
const consoleMessages = [];
const networkEvents = [];
const networkPromises = [];
page.on("console", (message) => {
  if (["error", "warning"].includes(message.type())) {
    consoleMessages.push({ type: message.type(), text: message.text() });
  }
});
page.on("response", (response) => {
  if (response.url().includes("/api/data-cloud/")) {
    networkPromises.push(
      responseSummary(response)
        .then((entry) => networkEvents.push(entry))
        .catch((error) => networkEvents.push({ error: String(error) }))
    );
  }
});

const actions = [];
try {
  await page.goto(`${WEB}/?view=clients&ctx=allow#client-data`, { waitUntil: "networkidle" });
  await page.locator('[data-data-cloud-enrichment="route-backed"]').first().waitFor({ state: "visible", timeout: 15000 });
  actions.push(await clickAndCollect(page, {
    id: "LCX8-ACTION-0129",
    label: "Provider register request",
    selector: '[data-sf-b-w07-provider-register-action="true"]',
    waits: [{ method: "POST", pathPart: "/api/data-cloud/providers" }],
    expectedSelector: '[data-sf-b-w07-provider-register-result="true"]',
    expectedPattern: /외부 확인 대기/
  }));
  actions.push(await clickAndCollect(page, {
    id: "LCX8-ACTION-0130",
    label: "Consent confirmation",
    selector: '[data-sf-b-w07-consent-record-action="true"] button',
    waits: [{ method: "POST", pathPart: "/api/data-cloud/consent-records" }],
    expectedSelector: '[data-sf-b-w07-consent-record-result="true"]',
    expectedPattern: /승인 대기/
  }));
  actions.push(await clickAndCollect(page, {
    id: "LCX8-ACTION-0131",
    label: "Preview job",
    selector: '[data-sf-b-w07-enrichment-job-action="true"] button',
    waits: [
      { method: "POST", pathPart: "/api/data-cloud/enrichment-jobs" },
      { method: "GET", pathPart: "/preview" }
    ],
    expectedSelector: '[data-sf-b-w07-enrichment-job-result="true"]',
    expectedPattern: /준비됨/
  }));
  actions.push(await clickAndCollect(page, {
    id: "LCX8-ACTION-0132",
    label: "Execute confirmation",
    selector: '[data-sf-b-w07-enrichment-execute-provider-blocked-action="true"] button',
    waits: [
      { method: "POST", pathPart: "/execute" },
      { method: "GET", pathPart: "/api/data-cloud/enrichment-results" }
    ],
    expectedSelector: '[data-sf-b-w07-enrichment-execute-provider-blocked-result="true"]',
    expectedPattern: /외부 확인 대기/
  }));
  actions.push(await clickAndCollect(page, {
    id: "LCX8-ACTION-0133",
    label: "Identity candidates",
    selector: '[data-sf-b-w07-identity-resolution-action="true"] button',
    waits: [{ method: "POST", pathPart: "/api/data-cloud/identity-resolution" }],
    expectedSelector: '[data-sf-b-w07-identity-resolution-result="true"]',
    expectedPattern: /승인 대기/
  }));
  actions.push(await clickAndCollect(page, {
    id: "LCX8-ACTION-0134",
    label: "Segment activation",
    selector: '[data-sf-b-w07-segment-activation-provider-blocked-action="true"] button',
    waits: [{ method: "POST", pathPart: "/api/data-cloud/segment-activations" }],
    expectedSelector: '[data-sf-b-w07-segment-activation-provider-blocked-result="true"]',
    expectedPattern: /외부 확인 대기/
  }));
  await page.locator('[data-sf-b-w07-audit="true"]').first().waitFor({ state: "visible", timeout: 15000 });
  await page.screenshot({ path: join(ROOT, SCREENSHOT_PATH), fullPage: true });
} finally {
  await Promise.allSettled(networkPromises);
  await browser.close();
}

const deniedResponse = await fetch(`${API}/api/data-cloud/providers?${query}`, {
  headers: { [PERMISSION_CONTEXT_HEADER]: permissionContext("deny") }
});
const deniedBody = await deniedResponse.json();
const reviewResponse = await fetch(`${API}/api/data-cloud/providers?${query}`, {
  headers: { [PERMISSION_CONTEXT_HEADER]: reviewContext }
});
const reviewBody = await reviewResponse.json();

const allResponses = actions.flatMap((action) => action.responses);
const api4xx5xx = networkEvents.filter((event) => Number(event.status) >= 400);
const assertions = [];
const byId = Object.fromEntries(actions.map((action) => [action.id, action]));
const actionBody = (id, index = 0) => byId[id].responses[index]?.body ?? {};

addAssertion(assertions, "all six browser actions collected", actions.length === 6, { count: actions.length });
addAssertion(assertions, "provider registration remains provider-blocked",
  actionBody("LCX8-ACTION-0129").outcome === "provider_blocked"
    && actionBody("LCX8-ACTION-0129").item?.provider_call_performed === false);
addAssertion(assertions, "consent write remains owner-blocked",
  actionBody("LCX8-ACTION-0130").outcome === "owner_blocked"
    && actionBody("LCX8-ACTION-0130").item?.consent_applied === false);
addAssertion(assertions, "enrichment create mounts route and preview is safe",
  actionBody("LCX8-ACTION-0131", 0).outcome === "passed"
    && actionBody("LCX8-ACTION-0131", 1).item?.provider_call_performed === false
    && actionBody("LCX8-ACTION-0131", 1).item?.raw_identifiers_included === false);
addAssertion(assertions, "enrichment execute remains provider-blocked",
  actionBody("LCX8-ACTION-0132", 0).outcome === "provider_blocked"
    && actionBody("LCX8-ACTION-0132", 0).result?.provider_receipt_required === true
    && actionBody("LCX8-ACTION-0132", 0).result?.raw_provider_fields_included === false);
addAssertion(assertions, "identity resolution creates review candidates only",
  actionBody("LCX8-ACTION-0133").outcome === "owner_blocked"
    && actionBody("LCX8-ACTION-0133").item?.automatic_merge_performed === false
    && actionBody("LCX8-ACTION-0133").item?.canonical_master_data_write_performed === false);
addAssertion(assertions, "segment activation remains provider-blocked",
  actionBody("LCX8-ACTION-0134").outcome === "provider_blocked"
    && actionBody("LCX8-ACTION-0134").item?.activation_submitted === false
    && actionBody("LCX8-ACTION-0134").item?.audience_member_identifiers_included === false);
const writeResponses = allResponses.filter((response) => response.method === "POST");
addAssertion(assertions, "every write response has audit event",
  writeResponses.every((response) => response.body?.audit_event_id_present === true),
  { writes: writeResponses.length });
addAssertion(assertions, "browser observed no data-cloud 4xx/5xx", api4xx5xx.length === 0, { api4xx5xx });
addAssertion(assertions, "browser console has no errors",
  consoleMessages.filter((item) => item.type === "error").length === 0,
  { consoleMessages });
addAssertion(assertions, "deny fail-closed prevents count leak",
  deniedResponse.status === 403 && deniedBody.count_leak_prevented === true,
  { status: deniedResponse.status, body: pickBody(deniedBody) });
addAssertion(assertions, "review context returns review_required without mutation",
  reviewResponse.status === 200 && reviewBody.outcome === "review_required",
  { status: reviewResponse.status, body: pickBody(reviewBody) });
addAssertion(assertions, "no production-ready or provider payload claim",
  allResponses.every((response) =>
    response.body?.production_ready_claim === false
    && response.body?.provider_payload_included === false
    && response.body?.raw_identifiers_included === false
  ));

const proof = {
  schema_version: "law-firm-os.lcx8.client-data-cloud-proof.v0.1",
  generated_at: new Date().toISOString(),
  rows: actions.map((action) => action.id),
  scope: {
    local_browser_runtime: true,
    api_base_url: API,
    web_origin: WEB,
    external_provider_runtime_enabled: false,
    product_record_mutation_allowed: false,
    production_ready_claim: false,
    go_live_claim: false
  },
  source_trace: {
    ui_component: "apps/web/src/components/DataCloudEnrichmentPanel.jsx",
    api_client: "apps/web/src/data/apiClient.js#data-cloud functions",
    api_routes: "apps/api/src/routes/data-cloud.js",
    runtime_context: "apps/api/src/data-cloud-runtime-context.js",
    service: "packages/data-cloud/src/service.js"
  },
  actions,
  direct_api_guards: {
    denied: { status: deniedResponse.status, body: pickBody(deniedBody) },
    review: { status: reviewResponse.status, body: pickBody(reviewBody) }
  },
  browser_network_summary: {
    data_cloud_response_count: networkEvents.length,
    api4xx5xx_count: api4xx5xx.length,
    responses: networkEvents
  },
  console_messages: consoleMessages,
  screenshot: SCREENSHOT_PATH,
  assertions,
  result: assertions.every((item) => item.passed) ? "PASS" : "FAIL"
};

writeFileSync(join(ROOT, JSON_PATH), `${JSON.stringify(proof, null, 2)}\n`);
writeFileSync(join(ROOT, MD_PATH), `${[
  "# LCX8-ACTION-0129..0134 Client Data Cloud Proof",
  "",
  `Generated at: ${proof.generated_at}`,
  "",
  `Result: ${proof.result}`,
  "",
  "## Scope",
  "",
  "- Local browser runtime only; no production/go-live claim.",
  "- External provider runtime remains disabled; provider/owner gated effects are expected.",
  "- Product record mutation is not allowed in this proof.",
  "",
  "## Rows",
  "",
  ...proof.actions.map((action) => `- ${action.id} ${action.label}: ${action.dom_text?.replace(/\s+/g, " ")}`),
  "",
  "## Assertions",
  "",
  ...proof.assertions.map((item) => `- ${item.passed ? "PASS" : "FAIL"}: ${item.name}`),
  "",
  `Screenshot: ${proof.screenshot}`,
  ""
].join("\n")}\n`);

console.log(JSON.stringify({
  result: proof.result,
  json: JSON_PATH,
  md: MD_PATH,
  screenshot: SCREENSHOT_PATH,
  assertions: assertions.length,
  data_cloud_response_count: networkEvents.length,
  api4xx5xx_count: api4xx5xx.length
}, null, 2));
