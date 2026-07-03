#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const ROOT = process.cwd();
const WEB = process.env.MATTER_UI_URL ?? "http://127.0.0.1:5173";
const ARTIFACT_DIR = "docs/lazycodex/evidence/matter-web/artifacts";
const SCREENSHOT_DIR = `${ARTIFACT_DIR}/upl-c02-screenshots`;
const JSON_PATH = `${ARTIFACT_DIR}/upl-c02-conflict-search-browser-proof.json`;
const MD_PATH = `${ARTIFACT_DIR}/upl-c02-conflict-search-browser-proof.md`;
const SESSION_KEY = "lawos.session.envelope";

const sessionEnvelope = {
  schema_version: "law-firm-os.desktop-web-session-envelope.v0.1",
  state: "signed_in",
  session_ref: "desktop:user_upl_c02_conflict:browser-proof",
  source: "desktop_offline_login",
  actor_ref: "user_upl_c02_conflict",
  tenant_refs: {
    default: "tenant_upl_c02_conflict_search",
    client: "tenant_upl_c02_conflict_search",
    matter: "tenant_upl_c02_conflict_search",
    vault: "tenant_upl_c02_conflict_search",
    crm: "tenant_upl_c02_conflict_search",
  },
  role_ids: ["crm_intake_user", "conflict_reviewer", "matter_runtime_user"],
  scopes: ["client_read", "matter_read"],
  review_state: "allow",
  expires_at: "2999-12-31T23:59:59.000Z",
};

const intakeRequest = {
  intake_request_id: "intake_upl_c02_ui",
  tenant_id: "tenant_upl_c02_conflict_search",
  requesting_party_id: "party_upl_c02_new_client",
  party_ids: ["party_upl_c02_new_client"],
  requested_scope_summary: "과거 사건 상대방의 신규 수임 검토",
  status: "open",
  owner_user_id: "user_upl_c02_conflict",
  production_ready_claim: false,
};

const conflictHit = {
  conflict_hit_id: "hit_upl_c02_ui_adverse",
  tenant_id: "tenant_upl_c02_conflict_search",
  conflict_check_id: "conflict_upl_c02_ui",
  matched_party_id: "party_upl_c02_adverse",
  hit_source: "former_matter",
  source_record_ref: "MatterParty:matter_party_upl_c02_adverse",
  severity: "high",
  status: "review_required",
  owner_user_id: "user_upl_c02_conflict",
  matched_display_name: "상대방 테크 주식회사",
  matched_model_type: "MatterParty",
  matched_party_role: "adverse_party",
  source_matter_ref_included: false,
  match_kind: "exact_normalized",
  match_score: 1,
  normalized_query: "상대방테크",
  raw_hit_payload_visible: false,
  production_ready_claim: false,
};

function proofUrl(hash) {
  return `${WEB}/?locale=ko&view=clients&data=live&ctx=allow#${hash}`;
}

function collectionBody(requestId, items = []) {
  return {
    request_id: requestId,
    outcome: "passed",
    items,
    page_info: { limit: 25, has_more: false },
    safe_error_codes: [],
    audit_hint_ref: "upl_c02_browser_proof",
    ui_state: items.length === 0 ? "empty" : null,
    count_leak_prevented: true,
    production_ready_claim: false,
  };
}

function conflictCheckBody(requestId) {
  return {
    request_id: requestId,
    outcome: "created",
    item: {
      conflict_check_id: "conflict_upl_c02_ui",
      tenant_id: "tenant_upl_c02_conflict_search",
      intake_request_id: intakeRequest.intake_request_id,
      party_snapshot: { party_ids: intakeRequest.party_ids },
      snapshot_hash: "snapshot_upl_c02_ui",
      status: "review_required",
      updates_database_rows: true,
      production_ready_claim: false,
    },
    audit_event: {
      event_id: `conflict.check.create:${requestId}`,
      action: "conflict.check.create",
      decision: "allow",
      production_ready_claim: false,
    },
    conflict_search: {
      conflict_search_id: "search_upl_c02_ui",
      tenant_id: "tenant_upl_c02_conflict_search",
      conflict_check_id: "conflict_upl_c02_ui",
      normalized_terms: ["상대방테크"],
      generated_hit_ids: [conflictHit.conflict_hit_id],
      caller_supplied_hit_count_ignored: true,
      hit_count: 1,
      raw_query_included: false,
      status: "executed",
      production_ready_claim: false,
    },
    conflict_hits: [conflictHit],
    hit_count: 1,
    safe_error_codes: [],
    audit_hint_ref: "upl_c02_browser_proof",
    production_ready_claim: false,
  };
}

async function fulfillJson(route, body, status = 200) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

async function run() {
  mkdirSync(join(ROOT, SCREENSHOT_DIR), { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  const writes = [];
  const consoleEvents = [];
  const failedRequests = [];

  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) consoleEvents.push({ type: message.type(), text: message.text() });
  });
  page.on("requestfailed", (request) => {
    failedRequests.push({ url: request.url(), failure: request.failure()?.errorText ?? "request_failed" });
  });
  await page.addInitScript(
    ({ key, value }) => window.localStorage.setItem(key, JSON.stringify(value)),
    { key: SESSION_KEY, value: sessionEnvelope },
  );

  await page.route("**/api/**", (route) => fulfillJson(route, collectionBody("upl-c02-empty", [])));
  await page.route("**/master-data/**", (route) => fulfillJson(route, collectionBody("upl-c02-master-empty", [])));
  await page.route("**/api/intake/conflict-checks", async (route, request) => {
    const payload = request.postDataJSON();
    writes.push({ url: request.url(), payload });
    await fulfillJson(route, conflictCheckBody("upl-c02-conflict-check"), 201);
  });
  await page.route("**/api/intake/audit**", (route) =>
    fulfillJson(route, collectionBody("upl-c02-audit-list", [
      { event_id: "audit_upl_c02_search", action: "conflict.search.executed", metadata: { hit_count: 1 } },
    ])),
  );
  await page.route("**/api/intake/requests**", (route) =>
    fulfillJson(route, collectionBody("upl-c02-intake-list", [intakeRequest])),
  );

  await page.goto(proofUrl("client-conflict"), { waitUntil: "domcontentloaded" });
  await page.locator("[data-client-conflict-connected='true']").waitFor({ state: "visible", timeout: 15000 });
  await page.locator("[data-intake-conflict-review-flow='true']").getByRole("button", { name: "이해상충 검토" }).click();
  await page.locator("[data-intake-conflict-hit-list='true']").getByText("상대방 테크 주식회사", { exact: true }).waitFor({
    state: "visible",
    timeout: 15000,
  });
  const hitListText = await page.locator("[data-intake-conflict-hit-list='true']").innerText();
  const screenshot = join(ROOT, SCREENSHOT_DIR, "upl-c02-conflict-search-hit-list.png");
  await page.screenshot({ path: screenshot, fullPage: true });
  await browser.close();

  const checks = [
    {
      id: "client-conflict-surface-visible",
      passed: hitListText.includes("상대방 테크 주식회사") && hitListText.includes("과거 Matter") && hitListText.includes("높음"),
    },
    {
      id: "conflict-check-write-sent-from-ui",
      passed:
        writes.length === 1 &&
        writes[0].payload?.conflict_check?.party_snapshot?.party_ids?.includes("party_upl_c02_new_client") &&
        writes[0].payload?.conflict_search === undefined,
    },
    {
      id: "browser-proof-clean",
      passed: consoleEvents.length === 0 && failedRequests.length === 0,
    },
  ];
  const report = {
    schema_version: "law-firm-os.upl-c02.browser-proof.v0.1",
    generated_at: new Date().toISOString(),
    verdict: checks.every((item) => item.passed) ? "PASS" : "FAIL",
    contract_ref: "UPL-C-02",
    url: proofUrl("client-conflict"),
    screenshot,
    checks,
    observed: {
      writes,
      hit_list_text: hitListText,
      console_events: consoleEvents,
      failed_requests: failedRequests,
    },
  };
  writeFileSync(join(ROOT, JSON_PATH), `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(
    join(ROOT, MD_PATH),
    [
      "# UPL-C-02 Conflict Search Browser Proof",
      "",
      `- verdict: ${report.verdict}`,
      `- url: ${report.url}`,
      `- screenshot: ${screenshot}`,
      "",
      "## Checks",
      ...checks.map((check) => `- ${check.passed ? "PASS" : "FAIL"} ${check.id}`),
      "",
      "## Observed",
      `- hit_list_text: ${JSON.stringify(hitListText)}`,
      `- writes: ${writes.length}`,
      `- console_events: ${consoleEvents.length}`,
      `- failed_requests: ${failedRequests.length}`,
      "",
    ].join("\n"),
  );
  console.log(JSON.stringify({ verdict: report.verdict, proof: JSON_PATH, screenshot }, null, 2));
  if (report.verdict !== "PASS") process.exit(1);
}

await run();
