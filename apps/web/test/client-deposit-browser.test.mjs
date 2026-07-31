import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { createServer as createNetServer } from "node:net";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { chromium } from "playwright";
import { createServer } from "vite";

const testDir = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(testDir, "..");
const evidenceDir = resolve(webRoot, "../../.omo/evidence/client-deposit");
const tenantId = "tenant-client-deposit-browser";
const clientId = "client-deposit-browser";
const originalId = "bank-deposit-browser-original";
const manualId = "bank-deposit-browser-review";
const refundId = "bank-deposit-browser-refund";
const hash = "a".repeat(64);
const previewId = `bank_import_preview_${"b".repeat(24)}`;

async function availablePort() {
  return new Promise((resolvePort, rejectPort) => {
    const server = createNetServer();
    server.once("error", rejectPort);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close(() => resolvePort(port));
    });
  });
}

function deferred() {
  let resolvePromise;
  const promise = new Promise((resolveValue) => {
    resolvePromise = resolveValue;
  });
  return { promise, resolve: resolvePromise };
}

function requestGate() {
  return {
    entered: deferred(),
    release: deferred(),
    completed: deferred()
  };
}

async function settleBrowserUi(page) {
  await page.evaluate(() => new Promise((resolveFrame) => {
    requestAnimationFrame(() => requestAnimationFrame(resolveFrame));
  }));
}

function fulfill(route, body, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json; charset=utf-8",
    body: JSON.stringify(body)
  });
}

function genericCollection(pathname) {
  return {
    request_id: `generic-${pathname.replace(/[^a-z0-9]+/giu, "-")}`,
    outcome: "passed",
    ui_state: "empty",
    items: [],
    page_info: {
      returned_count: 0,
      omitted_item_count: null,
      has_more: false,
      next_cursor: null
    },
    safe_error_codes: [],
    audit_hint_ref: "generic-browser-audit",
    count_leak_prevented: true,
    production_ready_claim: false
  };
}

function supportedCommands() {
  const bindings = [
    "bank_transaction_id",
    "bank_transaction_classification_id",
    "state_version",
    "client_group_id",
    "refund_of_bank_transaction_id",
    "idempotency_key",
    "request_fingerprint"
  ];
  return [
    {
      command: "auto_classify",
      method: "POST",
      path: "/api/finance/bank-classifications/auto",
      required_body_fields: ["tenant_id", "bank_transaction_id", "expected_state_version"],
      response_binding_fields: bindings
    },
    {
      command: "manual_client_link",
      method: "POST",
      path: "/api/finance/bank-classifications/review",
      required_body_fields: ["tenant_id", "decisions[].bank_transaction_id"],
      response_binding_fields: bindings
    },
    {
      command: "refund_link",
      method: "POST",
      path: "/api/finance/bank-classifications/review",
      required_body_fields: ["tenant_id", "decisions[].refund_of_bank_transaction_id"],
      response_binding_fields: bindings
    }
  ];
}

function deposit({
  transactionId,
  classificationId,
  direction = "inflow",
  amount = 1_500_000,
  category = "client_receipt",
  status = "confirmed",
  confidence = "high",
  source = "automatic",
  rationale = "client_exact",
  client = clientId,
  clientLabel = "한빛 제조",
  manualLock = false,
  refundOf = null,
  version = 1
}) {
  return {
    model_type: "ClientDeposit",
    resource_id: transactionId,
    tenant_id: tenantId,
    bank_transaction_id: transactionId,
    bank_transaction_classification_id: classificationId,
    transaction_date: direction === "outflow" ? "2026-07-30" : "2026-07-31",
    occurred_at: direction === "outflow"
      ? "2026-07-30T05:00:00.000Z"
      : "2026-07-31T05:00:00.000Z",
    transaction_direction: direction,
    amount,
    currency: "KRW",
    category,
    category_label: category === "refund_reversal"
      ? "취소·환급"
      : category === "other_inflow"
        ? "기타 입금"
        : "고객 매출",
    primary_type: category === "client_receipt" ? "sales" : "other",
    client_group_id: client,
    client_group_label: client ? clientLabel : null,
    status,
    confidence,
    classification_source: source,
    rationale_code: rationale,
    manual_lock: manualLock,
    refund_of_bank_transaction_id: refundOf,
    state_version: version,
    source_type: "xlsx",
    source_file_sha256: hash,
    source_row_number: 4,
    source_page_number: null,
    bank_reference_hash: "c".repeat(64),
    available_commands: direction === "outflow"
      ? ["auto_classify", "refund_link"]
      : ["auto_classify", "manual_client_link"],
    source_metadata_included: false,
    raw_source_payload_included: false,
    raw_account_included: false,
    raw_counterparty_included: false,
    raw_memo_included: false,
    transaction_fingerprint_included: false,
    credential_material_included: false,
    production_ready_claim: false
  };
}

function depositList(items, outcome = "passed") {
  return {
    request_id: "client-deposit-browser-list",
    outcome,
    ui_state: outcome === "partial" ? "partial" : items.length ? null : "empty",
    items,
    supported_commands: supportedCommands(),
    page_info: {
      returned_count: items.length,
      omitted_item_count: null,
      has_more: false,
      next_cursor: null
    },
    safe_error_codes: outcome === "partial" ? ["FINANCE_SOURCE_PARTIAL"] : [],
    audit_hint_ref: "ui_client_deposit_operations_probe",
    permission_prefilter_applied: true,
    count_leak_prevented: true,
    unauthorized_count_included: false,
    raw_source_payload_included: false,
    production_ready_claim: false
  };
}

function detailBody(item) {
  return {
    request_id: `detail-${item.bank_transaction_id}`,
    outcome: "passed",
    ui_state: null,
    item,
    supported_commands: supportedCommands(),
    safe_error_codes: [],
    audit_hint_ref: "ui_client_deposit_operations_probe",
    permission_prefilter_applied: true,
    count_leak_prevented: true,
    unauthorized_count_included: false,
    raw_source_payload_included: false,
    production_ready_claim: false
  };
}

function previewBody({ duplicateOnly = false } = {}) {
  const items = duplicateOnly
    ? [{
      row_number: 1,
      status: "duplicate",
      source_type: "xlsx",
      bank_transaction_id: "bank-preview-duplicate",
      account_ref: "raw-account-hidden",
      counterparty: "raw-counterparty-hidden",
      date: "2026-07-31",
      occurred_at: "2026-07-31T07:00:00.000Z",
      direction: "inflow",
      amount: 700_000,
      balance_after: 3_000_000,
      currency: "KRW",
      source_metadata_included: false,
      transaction_fingerprint_included: false,
      raw_source_payload_included: false
    }]
    : [
      {
        row_number: 1,
        status: "new",
        source_type: "xlsx",
        bank_transaction_id: "bank-preview-new",
        account_ref: "raw-account-hidden",
        counterparty: "raw-counterparty-hidden",
        date: "2026-07-31",
        occurred_at: "2026-07-31T07:00:00.000Z",
        direction: "inflow",
        amount: 700_000,
        balance_after: 3_000_000,
        currency: "KRW",
        source_metadata_included: false,
        transaction_fingerprint_included: false,
        raw_source_payload_included: false
      },
      {
        row_number: 2,
        status: "duplicate",
        source_type: "xlsx",
        bank_transaction_id: "bank-preview-duplicate",
        account_ref: "raw-account-hidden",
        counterparty: "raw-counterparty-hidden",
        date: "2026-07-31",
        occurred_at: "2026-07-31T07:10:00.000Z",
        direction: "inflow",
        amount: 400_000,
        balance_after: 3_400_000,
        currency: "KRW",
        source_metadata_included: false,
        transaction_fingerprint_included: false,
        raw_source_payload_included: false
      }
    ];
  return {
    request_id: "client-deposit-browser-preview",
    outcome: "preview_ready",
    preview: {
      preview_id: previewId,
      preview_manifest_sha256: "d".repeat(64),
      source_file_sha256: hash,
      source_type: "xlsx",
      account_ref: "운영계좌",
      counts: {
        total: items.length,
        new: duplicateOnly ? 0 : 1,
        duplicate: 1,
        error: 0
      },
      items,
      preview_confirmation_token: "browser-preview-confirmation-token",
      confirmation_expires_at: "2099-01-01T00:00:00.000Z",
      confirmation_token_included: true,
      product_records_mutated: false,
      raw_source_payload_included: false
    },
    safe_error_codes: [],
    audit_hint_ref: "ui_client_deposit_operations_probe",
    count_leak_prevented: true,
    production_ready_claim: false
  };
}

function commandResponse(item, body, replay = false) {
  const receipt = {
    bank_transaction_id: item.bank_transaction_id,
    bank_transaction_classification_id: item.bank_transaction_classification_id,
    state_version: item.state_version,
    category: item.category,
    status: item.status,
    client_group_id: item.client_group_id,
    refund_of_bank_transaction_id: item.refund_of_bank_transaction_id,
    idempotency_key: body.idempotency_key,
    request_fingerprint: hash,
    raw_source_payload_included: false,
    production_ready_claim: false
  };
  return {
    request_id: "client-deposit-browser-command",
    outcome: replay ? "idempotent_replay" : "classified",
    item: { command_receipt: receipt },
    command_receipts: [receipt],
    idempotency_key: body.idempotency_key,
    request_fingerprint: hash,
    idempotent_replay: replay,
    safe_error_codes: [],
    audit_hint_ref: "ui_client_deposit_operations_probe",
    raw_source_payload_included: false,
    production_ready_claim: false
  };
}

test("CL-P5-W03-T01 입금 매출 내역은 권한 확인된 조회·가져오기·연결·반응형 계약을 실제 화면에서 지킨다", async (t) => {
  await mkdir(evidenceDir, { recursive: true });
  const port = await availablePort();
  const server = await createServer({
    root: webRoot,
    logLevel: "silent",
    server: { host: "127.0.0.1", port, strictPort: true, hmr: false }
  });
  await server.listen();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const state = {
    mode: "data",
    stale: false,
    previewGate: null,
    confirmGate: null,
    actionGate: null,
    importReplay: false,
    imports: [],
    actions: [],
    requests: [],
    items: [
      deposit({
        transactionId: originalId,
        classificationId: "classification-browser-original"
      }),
      deposit({
        transactionId: manualId,
        classificationId: "classification-browser-review",
        amount: 900_000,
        status: "review_required",
        confidence: "needs_review",
        rationale: "no_registered_client_match",
        client: null,
        clientLabel: null
      }),
      deposit({
        transactionId: refundId,
        classificationId: "classification-browser-refund",
        direction: "outflow",
        amount: 300_000,
        category: "refund_reversal",
        status: "review_required",
        confidence: "needs_review",
        rationale: "refund_link_required",
        client: null,
        clientLabel: null
      })
    ]
  };

  await page.addInitScript(({ tenant }) => {
    sessionStorage.setItem("lawos.api.session", JSON.stringify({
      token_type: "Bearer",
      session_token: "lawos_session_v1.client_deposit_browser",
      expires_at: "2099-01-01T00:00:00.000Z",
      session: { user_id: "user-client-deposit-browser", tenant_id: tenant }
    }));
    sessionStorage.setItem("lawos.session.envelope", JSON.stringify({
      schema_version: "law-firm-os.desktop-web-session-envelope.v0.1",
      state: "signed_in",
      session_ref: "session-client-deposit-browser",
      source: "api_signed_session",
      actor_ref: "user-client-deposit-browser",
      tenant_refs: {
        default: tenant,
        client: tenant,
        matter: tenant,
        vault: tenant,
        crm: tenant,
        hrx: tenant
      },
      role_ids: ["system_super_admin"],
      scopes: ["finance.bank.read", "finance.bank.classify", "finance.bank.import"],
      review_state: "allow",
      expires_at: "2099-01-01T00:00:00.000Z"
    }));
  }, { tenant: tenantId });

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    state.requests.push({
      pathname: url.pathname,
      method: request.method(),
      authorization: request.headers().authorization ?? null
    });
    if (url.pathname === "/api/analytics/clients") {
      return fulfill(route, {
        ...genericCollection(url.pathname),
        ui_state: null,
        items: [{
          client_group_id: clientId,
          display_name: "한빛 제조",
          status: "active",
          legal_form: "organization",
          member_count: 1,
          primary_record_present: true
        }],
        page_info: {
          returned_count: 1,
          omitted_item_count: null,
          has_more: false,
          next_cursor: null
        },
        permission_prefilter_applied: true,
        raw_source_payload_included: false
      });
    }
    if (url.pathname === "/api/finance/client-deposits" && request.method() === "GET") {
      if (state.stale && url.searchParams.get("from") === "2026-07-05") {
        await new Promise((resolveDelay) => setTimeout(resolveDelay, 240));
        return fulfill(route, depositList([
          deposit({
            transactionId: "bank-stale-response-must-not-render",
            classificationId: "classification-stale-response",
            amount: 99_000_000
          })
        ]));
      }
      if (state.mode === "loading") {
        await new Promise((resolveDelay) => setTimeout(resolveDelay, 180));
        state.mode = "data";
      }
      if (state.mode === "denied") {
        return fulfill(route, {
          request_id: "client-deposit-denied",
          outcome: "denied",
          ui_state: "denied",
          safe_error_codes: ["FINANCE_UNAUTHORIZED_OMISSION"],
          count_leak_prevented: true,
          permission_prefilter_applied: true,
          raw_source_payload_included: false,
          production_ready_claim: false
        }, 403);
      }
      if (state.mode === "review") {
        return fulfill(route, {
          request_id: "client-deposit-review",
          outcome: "review_required",
          ui_state: "review_required",
          safe_error_codes: ["FINANCE_APPROVAL_REQUIRED"],
          count_leak_prevented: true,
          permission_prefilter_applied: true,
          raw_source_payload_included: false,
          production_ready_claim: false
        }, 403);
      }
      if (state.mode === "error") {
        return fulfill(route, {
          request_id: "client-deposit-error",
          outcome: "blocked",
          ui_state: "error",
          safe_error_codes: ["FINANCE_READ_FAILED"],
          production_ready_claim: false
        }, 500);
      }
      if (state.mode === "empty") return fulfill(route, depositList([]));
      if (state.mode === "partial") {
        return fulfill(route, depositList([state.items[0]], "partial"));
      }
      if (state.mode === "partial_empty") {
        return fulfill(route, depositList([], "partial"));
      }
      return fulfill(route, depositList(state.items));
    }
    if (url.pathname.startsWith("/api/finance/client-deposits/")) {
      const id = decodeURIComponent(url.pathname.split("/").at(-1));
      const item = state.items.find((candidate) => candidate.bank_transaction_id === id);
      return item
        ? fulfill(route, detailBody(item))
        : fulfill(route, {
          request_id: "detail-empty",
          outcome: "passed",
          ui_state: "empty",
          item: null,
          items: [],
          safe_error_codes: [],
          permission_prefilter_applied: true,
          count_leak_prevented: true,
          raw_source_payload_included: false,
          production_ready_claim: false
        }, 404);
    }
    if (url.pathname === "/api/finance/bank-imports/preview") {
      const body = request.postDataJSON();
      state.imports.push({ type: "preview", body });
      const gate = state.previewGate;
      if (gate) {
        state.previewGate = null;
        gate.entered.resolve();
        await gate.release.promise;
        await fulfill(route, previewBody());
        gate.completed.resolve();
        return undefined;
      }
      return fulfill(route, previewBody());
    }
    if (url.pathname === "/api/finance/bank-imports") {
      const body = request.postDataJSON();
      state.imports.push({ type: "confirm", body });
      const replay = state.importReplay;
      state.importReplay = false;
      const responseBody = {
        request_id: "client-deposit-browser-import",
        outcome: replay ? "idempotent_replay" : "created",
        item: {
          model_type: "BankImportBatch",
          bank_import_batch_id: "bank-import-browser",
          tenant_id: tenantId,
          preview_id: previewId,
          source_file_sha256: hash,
          source_type: "xlsx",
          account_ref: "운영계좌",
          transaction_count: 1,
          source_hashes_included: false,
          raw_source_payload_included: false,
          credential_material_included: false,
          production_ready_claim: false
        },
        transaction_count: 1,
        confirmed_preview_id: previewId,
        idempotent_replay: replay,
        confirmation_token_included: false,
        raw_source_payload_included: false,
        production_ready_claim: false,
        safe_error_codes: []
      };
      const gate = state.confirmGate;
      if (gate) {
        state.confirmGate = null;
        gate.entered.resolve();
        await gate.release.promise;
        await fulfill(route, responseBody, replay ? 200 : 201);
        gate.completed.resolve();
        return undefined;
      }
      return fulfill(route, responseBody, replay ? 200 : 201);
    }
    if (
      url.pathname === "/api/finance/bank-classifications/auto"
      || url.pathname === "/api/finance/bank-classifications/review"
    ) {
      const body = request.postDataJSON();
      state.actions.push({ pathname: url.pathname, body });
      const decision = body.decisions?.[0] ?? null;
      const transactionId = body.bank_transaction_id ?? decision?.bank_transaction_id;
      const liveItem = state.items.find((candidate) => candidate.bank_transaction_id === transactionId);
      assert.ok(liveItem, transactionId);
      assert.equal(
        body.expected_state_version ?? decision.expected_state_version,
        liveItem.state_version
      );
      const gate = state.actionGate;
      const item = gate ? { ...liveItem } : liveItem;
      if (gate) {
        state.actionGate = null;
        gate.entered.resolve();
        await gate.release.promise;
      }
      if (decision?.category === "client_receipt") {
        item.category = "client_receipt";
        item.category_label = "고객 매출";
        item.client_group_id = decision.client_group_id;
        item.client_group_label = "한빛 제조";
        item.refund_of_bank_transaction_id = null;
        item.status = "confirmed";
        item.confidence = "reviewed";
        item.classification_source = "manual_review";
        item.rationale_code = item.manual_lock
          ? "manual_client_relinked"
          : "manual_client_linked";
        item.manual_lock = true;
      } else if (decision?.category === "other_inflow") {
        item.category = "other_inflow";
        item.category_label = "기타 입금";
        item.client_group_id = null;
        item.client_group_label = null;
        item.refund_of_bank_transaction_id = null;
        item.status = "confirmed";
        item.confidence = "reviewed";
        item.classification_source = "manual_review";
        item.rationale_code = "manual_other_inflow";
        item.manual_lock = true;
      } else if (decision?.category === "refund_reversal") {
        const origin = state.items.find((candidate) => (
          candidate.bank_transaction_id === decision.refund_of_bank_transaction_id
        ));
        item.category = "refund_reversal";
        item.category_label = "취소·환급";
        item.client_group_id = origin.client_group_id;
        item.client_group_label = origin.client_group_label;
        item.refund_of_bank_transaction_id = origin.bank_transaction_id;
        item.status = "confirmed";
        item.confidence = "reviewed";
        item.classification_source = "manual_review";
        item.rationale_code = "manual_refund_linked";
        item.manual_lock = true;
      }
      item.state_version += 1;
      if (gate) {
        await fulfill(route, commandResponse(item, body));
        gate.completed.resolve();
        return undefined;
      }
      return fulfill(route, commandResponse(item, body));
    }
    if (url.pathname === "/api/profile/me") {
      return fulfill(route, {
        request_id: "profile-client-deposit-browser",
        outcome: "passed",
        ui_state: null,
        item: {
          user_id: "user-client-deposit-browser",
          display_name: "테스트 사용자"
        },
        safe_error_codes: [],
        audit_hint_ref: "profile-client-deposit-browser-audit",
        count_leak_prevented: true,
        production_ready_claim: false
      });
    }
    return fulfill(route, genericCollection(url.pathname));
  });

  try {
    await page.goto(
      `http://127.0.0.1:${port}/?view=clients&ctx=allow#client-sales-history`,
      { waitUntil: "networkidle" }
    );
    await page.waitForSelector('[data-client-deposit-operations="true"]');
    await page.waitForSelector(`[data-client-deposit-transaction="${originalId}"]`);
    assert.equal(await page.locator("[data-client-deposit-detail]").count(), 0);
    assert.equal(await page.locator('.client-deposit-table__row[aria-expanded="true"]').count(), 0);
    const accessibleOriginalRow = page.getByRole("button", {
      name: /2026-07-31 입금 고객 매출 ₩1,500,000/u
    });
    assert.equal(await accessibleOriginalRow.count(), 1);
    assert.equal(await accessibleOriginalRow.getAttribute("role"), null);
    assert.equal(
      state.requests
        .filter((request) => request.pathname === "/api/finance/client-deposits")
        .every((request) => request.authorization === "Bearer lawos_session_v1.client_deposit_browser"),
      true
    );
    assert.equal((await page.locator("body").innerText()).includes("청구"), false);
    assert.equal((await page.locator("body").innerText()).includes("미수"), false);
    assert.equal((await page.locator("body").innerText()).includes("raw-counterparty-hidden"), false);

    for (const [width, height, filename] of [
      [1440, 1000, "client-deposit-1440.png"],
      [820, 980, "client-deposit-820.png"],
      [390, 844, "client-deposit-390.png"]
    ]) {
      await page.setViewportSize({ width, height });
      await page.waitForTimeout(40);
      const overflow = await page.locator(".client-deposit-operations").evaluate((element) => ({
        scrollWidth: element.scrollWidth,
        clientWidth: element.clientWidth
      }));
      assert.equal(overflow.scrollWidth <= overflow.clientWidth + 1, true, `${width}px overflow`);
      await page.screenshot({ path: join(evidenceDir, filename), fullPage: true });
    }
    await page.setViewportSize({ width: 1440, height: 1000 });

    state.stale = true;
    const fromInput = page.getByLabel("시작일");
    await fromInput.fill("2026-07-05");
    await fromInput.fill("2026-07-06");
    await page.waitForTimeout(320);
    assert.equal(await page.getByText("₩99,000,000", { exact: true }).count(), 0);
    assert.equal(await page.locator('[data-client-deposit-transaction="bank-stale-response-must-not-render"]').count(), 0);
    state.stale = false;

    for (const scenario of [
      ["loading", "2026-07-07", "불러오는 중입니다"],
      ["denied", "2026-07-08", "입금 내역을 볼 권한이 없습니다"],
      ["review", "2026-07-09", "권한 확인이 필요합니다"],
      ["empty", "2026-07-10", "표시할 입금 내역이 없습니다"],
      ["partial", "2026-07-11", "일부 입금만 불러왔습니다"],
      ["partial_empty", "2026-07-12", "일부 입금만 불러왔습니다"],
      ["error", "2026-07-13", "입금 내역을 불러오지 못했습니다"]
    ]) {
      const [mode, date, expectedText] = scenario;
      state.mode = mode;
      await fromInput.fill(date);
      await page.getByText(expectedText, { exact: true }).waitFor();
      if (mode === "partial_empty") {
        assert.equal(
          await page.getByText("표시할 입금 내역이 없습니다", { exact: true }).count(),
          0
        );
      }
      if (mode === "loading") {
        await page.locator(`[data-client-deposit-transaction="${originalId}"]`).waitFor();
      }
    }
    state.mode = "data";
    await fromInput.fill("2026-07-14");
    await page.locator(`[data-client-deposit-transaction="${originalId}"]`).waitFor();

    const originalRow = page.locator(`[data-client-deposit-transaction="${originalId}"]`);
    await originalRow.click();
    const detail = page.locator(`[data-client-deposit-detail="${originalId}"]`);
    await detail.waitFor();
    assert.equal(await detail.evaluate((element) => document.activeElement === element), true);
    assert.match(await detail.innerText(), /계좌번호, 거래 상대, 메모 원문은 이 화면에 표시하지 않습니다/);
    await detail.press("Escape");
    assert.equal(await page.locator("[data-client-deposit-detail]").count(), 0);
    assert.equal(await originalRow.evaluate((element) => document.activeElement === element), true);

    await page.locator("details.client-deposit-import summary").click();
    const importPanel = page.locator("details.client-deposit-import");
    await importPanel.getByLabel("계좌 식별값").fill("운영계좌");
    await importPanel.getByLabel("XLSX 또는 PDF").setInputFiles({
      name: "bank-browser.xlsx",
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      buffer: Buffer.from([1, 2, 3, 4])
    });
    await importPanel.getByRole("button", { name: "미리보기", exact: true }).click();
    await page.locator('[data-client-deposit-preview="data"]').waitFor();
    assert.match(await importPanel.innerText(), /새 거래/);
    assert.match(await importPanel.innerText(), /중복/);
    await importPanel.getByRole("button", { name: "1건 가져오기", exact: true }).click();
    await page.getByText("1건을 가져왔습니다.", { exact: true }).waitFor();
    assert.deepEqual(Object.keys(state.imports[0].body).sort(), [
      "account_ref",
      "audit_hint_ref",
      "file",
      "permission_ref",
      "tenant_id"
    ]);
    assert.equal("transactions" in state.imports[1].body, false);
    assert.equal("matter_id" in state.imports[1].body, false);
    assert.equal("invoice_id" in state.imports[1].body, false);
    assert.equal(state.imports[1].body.production_import_approved, true);
    assert.equal(typeof state.imports[1].body.preview_confirmation_token, "string");

    await t.test("지연 preview는 파일·계좌 컨텍스트 변경 뒤 폐기된다", async () => {
      const previewRace = requestGate();
      state.previewGate = previewRace;
      await importPanel.getByLabel("계좌 식별값").fill("이전계좌");
      await importPanel.getByLabel("XLSX 또는 PDF").setInputFiles({
        name: "old-browser.xlsx",
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        buffer: Buffer.from([5, 6, 7, 8])
      });
      await importPanel.getByRole("button", { name: "미리보기", exact: true }).click();
      await previewRace.entered.promise;
      await importPanel.getByLabel("계좌 식별값").fill("새계좌");
      await importPanel.getByLabel("XLSX 또는 PDF").setInputFiles({
        name: "new-browser.xlsx",
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        buffer: Buffer.from([9, 10, 11, 12])
      });
      previewRace.release.resolve();
      await previewRace.completed.promise;
      await settleBrowserUi(page);
      assert.equal(await page.locator('[data-client-deposit-preview="data"]').count(), 0);
      assert.equal(await importPanel.getByRole("button", { name: /건 가져오기/u }).count(), 0);
      assert.equal(await importPanel.getByLabel("계좌 식별값").inputValue(), "새계좌");
    });

    await t.test("지연 confirm은 새 파일·계좌 화면에 결과를 반영하지 않는다", async () => {
      await importPanel.getByLabel("계좌 식별값").fill("운영계좌");
      await importPanel.getByLabel("XLSX 또는 PDF").setInputFiles({
        name: "confirm-race.xlsx",
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        buffer: Buffer.from([13, 14, 15, 16])
      });
      await importPanel.getByRole("button", { name: "미리보기", exact: true }).click();
      await page.locator('[data-client-deposit-preview="data"]').waitFor();
      const confirmRace = requestGate();
      state.confirmGate = confirmRace;
      await importPanel.getByRole("button", { name: "1건 가져오기", exact: true }).click();
      await confirmRace.entered.promise;
      await importPanel.getByLabel("계좌 식별값").fill("변경계좌");
      await importPanel.getByLabel("XLSX 또는 PDF").setInputFiles({
        name: "replacement-browser.xlsx",
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        buffer: Buffer.from([17, 18, 19, 20])
      });
      confirmRace.release.resolve();
      await confirmRace.completed.promise;
      await settleBrowserUi(page);
      assert.equal(await page.getByText("1건을 가져왔습니다.", { exact: true }).count(), 0);
      assert.equal(await page.locator('[data-client-deposit-preview="data"]').count(), 0);
      assert.equal(await importPanel.getByLabel("계좌 식별값").inputValue(), "변경계좌");
    });

    await t.test("같은 import 컨텍스트의 정확한 replay는 완료로 반영된다", async () => {
      await importPanel.getByLabel("계좌 식별값").fill("운영계좌");
      await importPanel.getByLabel("XLSX 또는 PDF").setInputFiles({
        name: "replay-browser.xlsx",
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        buffer: Buffer.from([21, 22, 23, 24])
      });
      await importPanel.getByRole("button", { name: "미리보기", exact: true }).click();
      await page.locator('[data-client-deposit-preview="data"]').waitFor();
      state.importReplay = true;
      await importPanel.getByRole("button", { name: "1건 가져오기", exact: true }).click();
      await page.getByText("이미 처리된 파일입니다. 현재 입금 내역을 다시 불러왔습니다.", {
        exact: true
      }).waitFor();
    });

    let completedActionStart = 0;
    await t.test("지연 action은 선택 거래가 바뀐 뒤 결과와 feedback을 폐기한다", async () => {
      const actionRace = requestGate();
      state.actionGate = actionRace;
      await page.locator(`[data-client-deposit-transaction="${originalId}"]`).click();
      await page.locator(".client-deposit-actions").getByRole("button", {
        name: "자동 분류",
        exact: true
      }).click();
      await actionRace.entered.promise;
      await page.locator(`[data-client-deposit-transaction="${manualId}"]`).click();
      actionRace.release.resolve();
      await actionRace.completed.promise;
      await settleBrowserUi(page);
      assert.equal(
        await page.locator(`[data-client-deposit-transaction="${manualId}"]`).getAttribute("aria-expanded"),
        "true"
      );
      assert.equal(await page.getByText("입금 분류를 반영했습니다.", { exact: true }).count(), 0);
      assert.equal(
        await page.locator(".client-deposit-actions").getByRole("button", {
          name: "자동 분류",
          exact: true
        }).isEnabled(),
        true
      );
      completedActionStart = state.actions.length;
    });

    await page.locator(`[data-client-deposit-transaction="${originalId}"]`).click();
    await page.locator(".client-deposit-actions").getByRole("button", { name: "자동 분류", exact: true }).click();
    await page.getByText("입금 분류를 반영했습니다.", { exact: true }).waitFor();

    await page.locator(`[data-client-deposit-transaction="${manualId}"]`).click();
    let actionsPanel = page.locator(".client-deposit-actions");
    await actionsPanel.locator('select[name="client-deposit-action-client"]').selectOption(clientId);
    await actionsPanel.getByLabel("확인 사유").fill("입금 증빙 확인");
    await actionsPanel.getByRole("button", { name: "변경 반영", exact: true }).click();
    await page.getByText("입금 분류를 반영했습니다.", { exact: true }).waitFor();

    await page.locator(`[data-client-deposit-transaction="${manualId}"]`).click();
    actionsPanel = page.locator(".client-deposit-actions");
    await actionsPanel.locator('select[name="client-deposit-action-type"]').selectOption("rememberAlias");
    await actionsPanel.locator('select[name="client-deposit-action-client"]').selectOption(clientId);
    await actionsPanel.getByLabel("확인 사유").fill("반복 입금자명 확인");
    await actionsPanel.getByRole("button", { name: "변경 반영", exact: true }).click();
    await page.getByText("입금 분류를 반영했습니다.", { exact: true }).waitFor();

    await page.locator(`[data-client-deposit-transaction="${manualId}"]`).click();
    actionsPanel = page.locator(".client-deposit-actions");
    await actionsPanel.locator('select[name="client-deposit-action-type"]').selectOption("manualUnlink");
    await actionsPanel.getByLabel("확인 사유").fill("고객 입금이 아님");
    await actionsPanel.getByRole("button", { name: "변경 반영", exact: true }).click();
    await page.getByText("입금 분류를 반영했습니다.", { exact: true }).waitFor();

    await page.locator(`[data-client-deposit-transaction="${refundId}"]`).click();
    actionsPanel = page.locator(".client-deposit-actions");
    await actionsPanel.locator('select[name="client-deposit-refund-origin"]').selectOption(originalId);
    await actionsPanel.getByLabel("확인 사유").fill("환불 승인 내역 확인");
    await actionsPanel.getByRole("button", { name: "변경 반영", exact: true }).click();
    await page.getByText("입금 분류를 반영했습니다.", { exact: true }).waitFor();

    const completedActions = state.actions.slice(completedActionStart);
    assert.deepEqual(
      completedActions.map((action) => action.pathname),
      [
        "/api/finance/bank-classifications/auto",
        "/api/finance/bank-classifications/review",
        "/api/finance/bank-classifications/review",
        "/api/finance/bank-classifications/review",
        "/api/finance/bank-classifications/review"
      ]
    );
    assert.equal(completedActions[1].body.decisions.length, 1);
    assert.equal(completedActions[2].body.decisions[0].remember_match, true);
    assert.equal(completedActions[3].body.decisions[0].category, "other_inflow");
    assert.equal(
      completedActions[4].body.decisions[0].refund_of_bank_transaction_id,
      originalId
    );
    for (const action of completedActions) {
      const serialized = JSON.stringify(action.body);
      assert.equal(serialized.includes("matter_id"), false);
      assert.equal(serialized.includes("invoice_id"), false);
    }
    await page.screenshot({
      path: join(evidenceDir, "client-deposit-actions-complete-1440.png"),
      fullPage: true
    });
  } finally {
    await browser.close();
    await server.close();
  }
});
