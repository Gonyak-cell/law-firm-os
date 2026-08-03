import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { createServer as createNetServer } from "node:net";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { createServer } from "vite";
import { assertNoPrivateEvidence, contentSha256 } from "./rf12-evidence-sanitize.mjs";

const testDir = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(testDir, "../..");
const defaultEvidenceDir = resolve(webRoot, "../../.omo/evidence/rfd-tuw-024");
export const evidenceDir = resolve(process.env.PAYMENT_REVERSAL_UI_EVIDENCE_DIR ?? defaultEvidenceDir);
export const FIXED_CLOCK_ISO = "2026-08-01T00:00:00.000Z";
const [productStyles, matterStyles] = await Promise.all([
  readFile(resolve(webRoot, "src/styles.css"), "utf8"),
  readFile(resolve(webRoot, "src/components/matter-small-firm/matter-small-firm.css"), "utf8")
]);

export const FIXTURE = Object.freeze({
  matterId: "matter-reversal-browser",
  matterCode: "K-2026-REV",
  paymentId: "payment-reversal-browser",
  allocationId: "allocation-reversal-browser",
  invoiceId: "invoice-reversal-browser",
  reversalId: "payment_allocation_reversal_ui_allocation_reversal_browser",
  tenantMatter: "tenant-matter-reversal-browser",
  tenantFinance: "tenant-finance-reversal-browser",
  tenantAnalytics: "tenant-analytics-reversal-browser",
  tenantHrx: "tenant-hrx-reversal-browser"
});
export const EXPECTED_WIRE_IDS = Object.freeze({
  idempotency_key: "matter_ops_payment_allocation_reversal_allocation_reversal_browser",
  reversal_payment_allocation_id: FIXTURE.reversalId
});

const INITIAL_INVOICE = Object.freeze({
  invoice_id: FIXTURE.invoiceId,
  invoice_number: "INV-2026-REV",
  matter_id: FIXTURE.matterId,
  amount_due: 100_000,
  amount_paid: 100_000,
  outstanding_amount: 0,
  currency: "KRW",
  status: "paid",
  lifecycle_status: "paid"
});

const INITIAL_ALLOCATION = Object.freeze({
  payment_allocation_id: FIXTURE.allocationId,
  payment_id: FIXTURE.paymentId,
  invoice_id: FIXTURE.invoiceId,
  matter_id: FIXTURE.matterId,
  allocation_type: "invoice_payment",
  amount: 100_000,
  currency: "KRW",
  status: "posted",
  allocated_at: "2026-07-31T01:00:00.000Z"
});

const CANONICAL_PAYMENT = Object.freeze({
  payment_id: FIXTURE.paymentId,
  matter_id: FIXTURE.matterId,
  amount: 100_000,
  allocated_amount: 0,
  unallocated_amount: 100_000,
  unapplied_amount: 100_000,
  currency: "KRW"
});

const CANONICAL_INVOICE = Object.freeze({
  ...INITIAL_INVOICE,
  amount_paid: 0,
  outstanding_amount: 100_000,
  status: "sent",
  lifecycle_status: "sent"
});

const CANONICAL_ALLOCATION = Object.freeze({
  payment_allocation_id: FIXTURE.reversalId,
  reverses_payment_allocation_id: FIXTURE.allocationId,
  payment_id: FIXTURE.paymentId,
  invoice_id: FIXTURE.invoiceId,
  matter_id: FIXTURE.matterId,
  allocation_type: "invoice_payment",
  amount: 100_000,
  currency: "KRW",
  status: "reversed",
  reason_code: "중복 배정 정정"
});

const CANONICAL_AR = Object.freeze({
  rows: [{
    invoice_id: FIXTURE.invoiceId,
    matter_id: FIXTURE.matterId,
    balance: 100_000,
    aging_bucket: "bucket_1_30",
    status: "open"
  }],
  totals: {
    balance: 100_000,
    invoice_count: 1,
    bucket_current: 0,
    bucket_1_30: 100_000,
    bucket_31_60: 0,
    bucket_61_90: 0,
    bucket_90_plus: 0
  }
});

const SIGNED_SESSION = Object.freeze({
  schema_version: "law-firm-os.desktop-web-session-envelope.v0.1",
  state: "signed_in",
  session_ref: "session_payment_reversal_browser",
  source: "api_signed_session",
  actor_ref: "actor_payment_reversal_browser",
  tenant_refs: Object.freeze({
    default: FIXTURE.tenantMatter,
    client: FIXTURE.tenantMatter,
    matter: FIXTURE.tenantMatter,
    vault: FIXTURE.tenantMatter,
    crm: FIXTURE.tenantMatter,
    hrx: FIXTURE.tenantHrx,
    finance: FIXTURE.tenantFinance,
    analytics: FIXTURE.tenantAnalytics
  }),
  role_ids: Object.freeze(["matter_runtime_user", "finance_user", "lawos_admin"]),
  scopes: Object.freeze(["matter.admin", "finance.admin", "hrx.people.read"]),
  review_state: "allow",
  expires_at: "2099-01-01T00:00:00.000Z"
});

function availablePort() {
  return new Promise((resolvePort, rejectPort) => {
    const server = createNetServer();
    server.once("error", rejectPort);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close((error) => error ? rejectPort(error) : resolvePort(port));
    });
  });
}

function fixturePagePlugin() {
  return {
    name: "matter-payment-reversal-browser-page",
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const pathname = new URL(request.url ?? "/", "http://127.0.0.1").pathname;
        if (pathname !== "/__matter-payment-reversal__") return next();
        response.statusCode = 200;
        response.setHeader("content-type", "text/html; charset=utf-8");
        response.end(
          "<!doctype html><html data-skin=\"forest\" lang=\"ko\"><body><main id=\"root\" class=\"page-canvas\"></main></body></html>"
        );
      });
    }
  };
}

function responseBase(sequence, uiState = "ready") {
  return {
    request_id: `payment-reversal-browser-${sequence}`,
    safe_error_codes: [],
    audit_hint_ref: "payment_reversal_browser",
    production_ready_claim: false,
    ui_state: uiState
  };
}

function matterRecord() {
  return {
    matter_id: FIXTURE.matterId,
    matter_code: FIXTURE.matterCode,
    matter_number: FIXTURE.matterCode,
    title: "입금 배정 취소 검증 사건",
    client_display_name: "입금 배정 검증 의뢰인",
    billing_client_party_id: "client-reversal-browser",
    owner_user_id: "person-reversal-owner",
    backup_user_id: "person-reversal-backup",
    status: "open",
    wip_status: "ready"
  };
}

function matterDetail() {
  return {
    matter_id: FIXTURE.matterId,
    summary: {
      owner_user_id: "person-reversal-owner",
      backup_user_id: "person-reversal-backup",
      next_action: { title: "입금 배정 상태 확인" },
      next_deadline: { due_at: "2026-08-04T09:00:00.000Z" }
    },
    close_blockers: [],
    closeout_state: "data",
    can_close: false,
    tab_data: { work_deadlines: [], contact_history: [], time_billing: [] }
  };
}

function initialBilling() {
  return {
    invoices: [INITIAL_INVOICE],
    payment_allocations: [INITIAL_ALLOCATION],
    ar: { rows: [], totals: { balance: 0, invoice_count: 0 } }
  };
}

function canonicalBilling() {
  return {
    invoices: [CANONICAL_INVOICE],
    payment_allocations: [INITIAL_ALLOCATION, CANONICAL_ALLOCATION],
    ar: CANONICAL_AR
  };
}

function collectionBody(sequence, items = [], extra = {}) {
  return {
    ...responseBase(sequence),
    outcome: "passed",
    items,
    ...extra
  };
}

function itemBody(sequence, item = {}, extra = {}) {
  return {
    ...responseBase(sequence),
    outcome: "passed",
    item,
    ...extra
  };
}

function parseRequestBody(request) {
  if (!request.postData()) return null;
  try {
    return request.postDataJSON();
  } catch {
    return null;
  }
}

function apiResponse(status, body) {
  return {
    status,
    contentType: "application/json",
    body: JSON.stringify(body)
  };
}

function makeApiHandler({ requests, mutation = {} }) {
  const state = {
    sequence: 0,
    reversalCommitted: false,
    reloadFailuresRemaining: 0,
    staleBillingReadObserved: false,
    reloadFailureTriggered: false
  };

  return async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    const body = parseRequestBody(request);
    const record = {
      sequence: ++state.sequence,
      method,
      path: url.pathname,
      query: Object.fromEntries(url.searchParams),
      body,
      headers: request.headers()
    };
    requests.push(record);
    const sequence = record.sequence;

    if (
      method === "POST"
      && url.pathname === `/api/matter/ops/payments/${FIXTURE.paymentId}/allocations/${FIXTURE.allocationId}/reversal`
    ) {
      if (body?.reason === "실패 검증") {
        record.response_status = 503;
        return route.fulfill(apiResponse(503, {
          ...responseBase(sequence, "error"),
          outcome: "failed",
          message: "처리하지 못했습니다.",
          safe_error_codes: ["MATTER_OPS_RUNTIME_UNAVAILABLE"]
        }));
      }
      const firstCommit = !state.reversalCommitted;
      state.reversalCommitted = true;
      if (firstCommit) {
        state.reloadFailuresRemaining = 1;
        state.staleBillingReadObserved = false;
        state.reloadFailureTriggered = false;
      }
      record.response_status = 200;
      return route.fulfill(apiResponse(200, {
        ...responseBase(sequence),
        outcome: "updated",
        item: CANONICAL_PAYMENT,
        reversed_allocation: CANONICAL_ALLOCATION,
        ar_balance: CANONICAL_AR.rows[0]
      }));
    }

    if (mutation.breakRefreshTarget === true && method === "GET" && url.pathname.endsWith("/closeout")) {
      record.response_status = 404;
      return route.fulfill(apiResponse(404, {
        ...responseBase(sequence, "error"),
        outcome: "not_found",
        items: [],
        safe_error_codes: ["MUTATION_REMOVED_REFRESH_TARGET"]
      }));
    }

    if (method === "GET" && url.pathname === "/api/matters") {
      record.response_status = 200;
      return route.fulfill(apiResponse(200, {
        ...responseBase(sequence),
        outcome: "passed",
        items: [matterRecord()],
        page_info: { next_cursor: null }
      }));
    }
    if (method === "GET" && url.pathname === "/api/matters/list-views") {
      record.response_status = 200;
      return route.fulfill(apiResponse(200, { ...collectionBody(sequence), items: [] }));
    }
    if (method === "GET" && url.pathname === "/api/home/action-inbox") {
      record.response_status = 200;
      return route.fulfill(apiResponse(200, {
        ...collectionBody(sequence),
        counts: { approval: 0, task_late: 0, task_today: 0 }
      }));
    }
    if (method === "POST" && /\/api\/matters\/[^/]+\/recently-viewed$/u.test(url.pathname)) {
      record.response_status = 200;
      return route.fulfill(apiResponse(200, { ...responseBase(sequence), outcome: "passed" }));
    }

    if (method === "GET" && url.pathname === "/api/matter/ops/time-billing") {
      if (state.reversalCommitted && (state.reloadFailuresRemaining > 0 || state.reloadFailureTriggered === true)) {
        if (state.reloadFailuresRemaining > 0) state.staleBillingReadObserved = true;
        state.reloadFailureTriggered = false;
        record.response_status = 200;
        return route.fulfill(apiResponse(200, {
          ...itemBody(sequence, initialBilling())
        }));
      }
      record.response_status = 200;
      return route.fulfill(apiResponse(200, {
        ...itemBody(sequence, state.reversalCommitted ? canonicalBilling() : initialBilling())
      }));
    }
    if (method === "GET" && url.pathname === "/api/matter/ops/payments") {
      record.response_status = 200;
      return route.fulfill(apiResponse(200, collectionBody(sequence, [
        state.reversalCommitted ? CANONICAL_PAYMENT : {
          ...CANONICAL_PAYMENT,
          allocated_amount: 100_000,
          unallocated_amount: 0,
          unapplied_amount: 0
        }
      ])));
    }
    if (method === "GET" && url.pathname === `/api/matter/ops/matters/${FIXTURE.matterId}`) {
      record.response_status = 200;
      return route.fulfill(apiResponse(200, itemBody(sequence, matterDetail())));
    }
    if (method === "GET" && url.pathname === `/api/matter/ops/matters/${FIXTURE.matterId}/closeout`) {
      if (state.reversalCommitted && state.reloadFailuresRemaining > 0) {
        state.reloadFailuresRemaining -= 1;
        if (!state.staleBillingReadObserved) state.reloadFailureTriggered = true;
        else state.staleBillingReadObserved = false;
        record.response_status = 503;
        return route.fulfill(apiResponse(503, {
          ...responseBase(sequence, "error"),
          outcome: "failed",
          items: [],
          safe_error_codes: ["MATTER_OPS_RUNTIME_UNAVAILABLE"]
        }));
      }
      record.response_status = 200;
      return route.fulfill(apiResponse(200, { ...collectionBody(sequence), can_close: false }));
    }

    if (method === "GET" && url.pathname === "/api/finance/invoices") {
      record.response_status = 200;
      return route.fulfill(apiResponse(200, collectionBody(sequence, [INITIAL_INVOICE])));
    }
    if (method === "GET" && url.pathname === "/api/finance/ar-aging") {
      record.response_status = 200;
      return route.fulfill(apiResponse(200, collectionBody(sequence, [], { summary: { balance: 0, invoice_count: 0 } })));
    }
    if (method === "GET" && url.pathname === "/api/finance/time-entries") {
      record.response_status = 200;
      return route.fulfill(apiResponse(200, collectionBody(sequence)));
    }
    if (method === "GET" && url.pathname === "/api/finance/audit") {
      record.response_status = 200;
      return route.fulfill(apiResponse(200, collectionBody(sequence)));
    }

    if (method === "GET" && url.pathname === "/api/hrx/employees") {
      record.response_status = 200;
      return route.fulfill(apiResponse(200, {
        ...responseBase(sequence),
        outcome: "passed",
        employees: []
      }));
    }
    if (method === "GET" && url.pathname === "/api/hrx/employee-user-links") {
      record.response_status = 200;
      return route.fulfill(apiResponse(200, {
        ...responseBase(sequence),
        outcome: "passed",
        links: []
      }));
    }
    if (method === "GET" && url.pathname === "/api/hrx/legal-people/search") {
      record.response_status = 200;
      return route.fulfill(apiResponse(200, {
        ...responseBase(sequence),
        outcome: "passed",
        people: [],
        facets: {}
      }));
    }

    if (method === "GET" && url.pathname.endsWith("/command-center")) {
      record.response_status = 200;
      return route.fulfill(apiResponse(200, {
        ...itemBody(sequence, matterRecord()),
        team: [],
        matter_profile: null,
        matter_stakeholders: [],
        matter_parties: [],
        adverse_parties: [],
        client_report: null,
        vault_summary: null,
        matter_vault_link: null
      }));
    }
    if (method === "GET" && url.pathname.endsWith("/timeline")) {
      record.response_status = 200;
      return route.fulfill(apiResponse(200, itemBody(sequence, { visible_entries: [] })));
    }
    if (method === "GET" && url.pathname.endsWith("/channel")) {
      record.response_status = 200;
      return route.fulfill(apiResponse(200, itemBody(sequence, { messages: [], provider_state: {} })));
    }
    if (method === "GET" && ["/api/matters/audit"].includes(url.pathname)) {
      record.response_status = 200;
      return route.fulfill(apiResponse(200, collectionBody(sequence)));
    }
    if (method === "GET" && /\/api\/matters\/[^/]+\/(activities|calendar-events|deadlines)$/u.test(url.pathname)) {
      record.response_status = 200;
      return route.fulfill(apiResponse(200, collectionBody(sequence)));
    }

    if (method === "GET" && url.pathname.startsWith("/api/analytics/")) {
      record.response_status = 200;
      return route.fulfill(apiResponse(200, collectionBody(sequence)));
    }

    record.response_status = 200;
    return route.fulfill(apiResponse(200, {
      ...responseBase(sequence),
      outcome: "passed",
      items: [],
      item: {}
    }));
  };
}

async function installSignedSession(page) {
  await page.addInitScript(({ session, apiSessionKey, token, fixedClockIso }) => {
    const RealDate = Date;
    const fixedClockMs = RealDate.parse(fixedClockIso);
    function FixedDate(...args) {
      if (new.target) return new RealDate(...(args.length ? args : [fixedClockMs]));
      return new RealDate(fixedClockMs).toString();
    }
    FixedDate.now = () => fixedClockMs;
    FixedDate.parse = RealDate.parse;
    FixedDate.UTC = RealDate.UTC;
    FixedDate.prototype = RealDate.prototype;
    window.Date = FixedDate;
    window.__LAWOS_SESSION_CONTEXT__ = session;
    window.sessionStorage.setItem(apiSessionKey, JSON.stringify({
      token_type: "Bearer",
      session_token: token,
      expires_at: "2099-01-01T00:00:00.000Z",
      session: {
        user_id: session.actor_ref,
        tenant_id: session.tenant_refs.matter,
        role_ids: session.role_ids,
        scopes: session.scopes
      }
    }));
  }, {
    session: SIGNED_SESSION,
    apiSessionKey: "lawos.api.session",
    token: "lawos_session_v1.payment_reversal_browser",
    fixedClockIso: FIXED_CLOCK_ISO
  });
}

async function mountProductionSurface(page) {
  await page.evaluate(async ({ matterId }) => {
    const ReactModule = await import("/@id/react");
    const React = ReactModule.default ?? ReactModule;
    const ReactDomClientModule = await import("/@id/react-dom/client");
    const createRoot = ReactDomClientModule.createRoot ?? ReactDomClientModule.default?.createRoot;
    const { MattersSurface } = await import("/src/components/MattersSurface.jsx");
    const h = React.createElement;
    createRoot(document.getElementById("root")).render(h(MattersSurface, {
      labels: { mattersTitle: "Matter" },
      liveCtx: "allow",
      activeSection: "matter-list",
      requestedMatterId: matterId
    }));
  }, { matterId: FIXTURE.matterId });
}

function assertSignedSession(records) {
  assert.ok(records.length > 0, "production surface should issue signed-session API requests");
  for (const record of records) {
    assert.equal(
      record.headers.authorization,
      "Bearer lawos_session_v1.payment_reversal_browser",
      `${record.method} ${record.path} must use the signed API session`
    );
  }
}

export function apiRecordsSince(requests, sequence) {
  return requests.filter((record) => record.sequence > sequence);
}

export async function runPaymentReversalBrowserScenario({ mutation = {}, captureEvidence = true, exercise, onError, publishEvidence } = {}) {
  if (typeof exercise !== "function") throw new TypeError("A behavioral exercise callback is required.");
  if (captureEvidence) await mkdir(evidenceDir, { recursive: true });
  const requests = [];
  const port = await availablePort();
  const server = await createServer({
    root: webRoot,
    logLevel: "silent",
    plugins: [fixturePagePlugin()],
    server: { host: "127.0.0.1", port, strictPort: true }
  });
  const browser = await chromium.launch({ headless: true, args: ["--disable-gpu"] });
  let page;
  try {
    await server.listen();
    page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await installSignedSession(page);
    await page.route("**/api/**", makeApiHandler({ requests, mutation }));
    await page.goto(`http://127.0.0.1:${port}/__matter-payment-reversal__`, { waitUntil: "domcontentloaded" });
    await page.addStyleTag({
      content: `${productStyles}\n${matterStyles}\n
        html, body { width: 100%; min-width: 0; margin: 0; }
        body { overflow-x: hidden; }
        *, *::before, *::after { box-sizing: border-box; }
        *, *::before, *::after { animation: none !important; transition: none !important; caret-color: transparent !important; }
        main { padding: 24px; }
      `
    });
    await mountProductionSurface(page);
    assert.equal(
      await page.locator('[data-cmp-g4-live-matters="true"]').count(),
      1,
      "the rendered scenario must mount the production MattersSurface"
    );

    const overlay = page.locator('[data-record-overlay="matter"]');
    await overlay.waitFor({ state: "visible", timeout: 30_000 });
    const billingTab = overlay.getByRole("tab", { name: /시간·청구/u });
    await billingTab.click();
    const reasonInput = overlay.getByLabel("입금 배정 취소 사유");
    const reversalButton = overlay.locator('[data-matter-payment-reversal-action="true"]');
    const result = overlay.locator('[data-matter-payment-reversal-result]');
    const arSummary = overlay.locator("[data-matter-ar-balance]");
    await reasonInput.waitFor({ state: "visible", timeout: 30_000 });

    const captureScreenshot = async (name) => {
      if (!captureEvidence) return null;
      const path = join(evidenceDir, `payment-reversal-browser-${name}.png`);
      if (name === "success") await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForLoadState("networkidle").catch(() => {});
      await page.evaluate(async () => { if (document.fonts?.ready) await document.fonts.ready; });
      await page.waitForTimeout(50);
      await page.screenshot({ path, fullPage: true });
      return path;
    };
    const exerciseResult = await exercise({ page, overlay, reasonInput, reversalButton, result, arSummary, requests, captureScreenshot, signedRequestCountBeforeReason: requests.length });
    assertSignedSession(requests);
    if (captureEvidence && exerciseResult?.observations && typeof publishEvidence === "function") {
      await publishEvidence({ observations: exerciseResult.observations, requests, mutation });
      await Promise.all([
        unlink(join(evidenceDir, "debug-last-requests.json")).catch(() => {}),
        unlink(join(evidenceDir, "debug-last-screen.png")).catch(() => {})
      ]);
    }
    return { ...exerciseResult, requests };
  } catch (error) {
    if (typeof onError === "function") await onError({ error, requests });
    if (captureEvidence) {
      await mkdir(evidenceDir, { recursive: true });
      const debug = {
        error_sha256: createHash("sha256").update(String(error?.stack ?? error)).digest("hex"),
        request_count: requests.length,
        dom_text_sha256: page ? contentSha256(await page.locator("body").innerText().catch(() => "")) : null
      };
      assertNoPrivateEvidence(debug);
      await writeFile(join(evidenceDir, "debug-last-requests.json"), `${JSON.stringify(debug, null, 2)}\n`, "utf8");
      if (page) await page.screenshot({ path: join(evidenceDir, "debug-last-screen.png"), fullPage: true }).catch(() => {});
    }
    throw error;
  } finally {
    await browser.close();
    await server.close();
  }
}
