import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { createServer as createNetServer } from "node:net";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { after, before, test } from "node:test";

import { chromium } from "playwright";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const testDir = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(testDir, "..");

const statusTabs = [
  { code: "all", label: "전체" },
  { code: "outstanding", label: "미수금 있음" },
  { code: "amount_unknown", label: "금액 미입력" },
  { code: "overpaid", label: "초과 입금" },
  { code: "settled", label: "정산 완료" },
];

const commitments = [
  {
    feeCommitmentId: "fee-partial-secret-id",
    clientGroupId: "client-partial-secret-id",
    displayName: "한빛건설",
    agreedAmount: 10_000_000,
    activeAllocatedAmount: 4_000_000,
    receivableAmount: 6_000_000,
    amountStatus: "known",
    amountStatusLabel: "금액 확인",
    dueDate: "2026-08-10",
    acceptedAt: "2026-07-01T00:00:00.000Z",
    status: "active",
    statusLabel: "진행 중",
    stateVersion: 2,
    active: true,
  },
  {
    feeCommitmentId: "fee-unknown-secret-id",
    clientGroupId: "client-unknown-secret-id",
    displayName: "금액 미정 고객",
    agreedAmount: null,
    activeAllocatedAmount: 0,
    receivableAmount: null,
    amountStatus: "unknown",
    amountStatusLabel: "금액 미입력",
    dueDate: null,
    acceptedAt: "2026-07-02T00:00:00.000Z",
    status: "active",
    statusLabel: "진행 중",
    stateVersion: 1,
    active: true,
  },
  {
    feeCommitmentId: "fee-overpaid-secret-id",
    clientGroupId: "client-overpaid-secret-id",
    displayName: "선입금 고객",
    agreedAmount: 5_000_000,
    activeAllocatedAmount: 5_000_000,
    receivableAmount: 0,
    amountStatus: "known",
    amountStatusLabel: "금액 확인",
    dueDate: "2026-08-15",
    acceptedAt: "2026-07-03T00:00:00.000Z",
    status: "active",
    statusLabel: "진행 중",
    stateVersion: 4,
    active: true,
  },
  {
    feeCommitmentId: "fee-multiple-a-secret-id",
    clientGroupId: "client-multiple-secret-id",
    displayName: "복수 약정 고객",
    agreedAmount: 4_000_000,
    activeAllocatedAmount: 4_000_000,
    receivableAmount: 0,
    amountStatus: "known",
    amountStatusLabel: "금액 확인",
    dueDate: "2026-08-01",
    acceptedAt: "2026-07-04T00:00:00.000Z",
    status: "active",
    statusLabel: "진행 중",
    stateVersion: 3,
    active: true,
  },
  {
    feeCommitmentId: "fee-multiple-b-secret-id",
    clientGroupId: "client-multiple-secret-id",
    displayName: "복수 약정 고객",
    agreedAmount: 6_000_000,
    activeAllocatedAmount: 2_000_000,
    receivableAmount: 4_000_000,
    amountStatus: "known",
    amountStatusLabel: "금액 확인",
    dueDate: "2026-08-20",
    acceptedAt: "2026-07-05T00:00:00.000Z",
    status: "active",
    statusLabel: "진행 중",
    stateVersion: 2,
    active: true,
  },
  {
    feeCommitmentId: "fee-manual-secret-id",
    clientGroupId: "client-manual-secret-id",
    displayName: "환불 고객",
    agreedAmount: 5_000_000,
    activeAllocatedAmount: 2_000_000,
    receivableAmount: 3_000_000,
    amountStatus: "known",
    amountStatusLabel: "금액 확인",
    dueDate: "2026-08-25",
    acceptedAt: "2026-07-06T00:00:00.000Z",
    status: "active",
    statusLabel: "진행 중",
    stateVersion: 5,
    active: true,
  },
];

const allocations = [
  {
    clientDepositAllocationId: "allocation-partial-secret-id",
    clientGroupId: "client-partial-secret-id",
    bankTransactionId: "deposit-partial-secret-id",
    feeCommitmentId: "fee-partial-secret-id",
    allocatedAmount: 4_000_000,
    reversedAmount: 0,
    activeAmount: 4_000_000,
    allocationSource: "automatic",
    allocationSourceLabel: "자동 배분",
    manualLock: false,
    stateVersion: 3,
  },
  {
    clientDepositAllocationId: "allocation-overpaid-secret-id",
    clientGroupId: "client-overpaid-secret-id",
    bankTransactionId: "deposit-overpaid-secret-id",
    feeCommitmentId: "fee-overpaid-secret-id",
    allocatedAmount: 5_000_000,
    reversedAmount: 0,
    activeAmount: 5_000_000,
    allocationSource: "automatic",
    allocationSourceLabel: "자동 배분",
    manualLock: false,
    stateVersion: 2,
  },
  {
    clientDepositAllocationId: "allocation-multiple-a-secret-id",
    clientGroupId: "client-multiple-secret-id",
    bankTransactionId: "deposit-multiple-secret-id",
    feeCommitmentId: "fee-multiple-a-secret-id",
    allocatedAmount: 4_000_000,
    reversedAmount: 0,
    activeAmount: 4_000_000,
    allocationSource: "automatic",
    allocationSourceLabel: "자동 배분",
    manualLock: false,
    stateVersion: 2,
  },
  {
    clientDepositAllocationId: "allocation-multiple-b-secret-id",
    clientGroupId: "client-multiple-secret-id",
    bankTransactionId: "deposit-multiple-secret-id",
    feeCommitmentId: "fee-multiple-b-secret-id",
    allocatedAmount: 2_000_000,
    reversedAmount: 0,
    activeAmount: 2_000_000,
    allocationSource: "automatic",
    allocationSourceLabel: "자동 배분",
    manualLock: false,
    stateVersion: 2,
  },
  {
    clientDepositAllocationId: "allocation-manual-secret-id",
    clientGroupId: "client-manual-secret-id",
    bankTransactionId: "deposit-manual-secret-id",
    feeCommitmentId: "fee-manual-secret-id",
    allocatedAmount: 3_000_000,
    reversedAmount: 1_000_000,
    activeAmount: 2_000_000,
    allocationSource: "manual",
    allocationSourceLabel: "수동 배분",
    manualLock: true,
    stateVersion: 7,
  },
];

const deposits = [
  {
    bankTransactionId: "deposit-partial-secret-id",
    clientGroupId: "client-partial-secret-id",
    grossAmount: 4_000_000,
    linkedRefundAmount: 0,
    netAmount: 4_000_000,
    activeAllocatedAmount: 4_000_000,
    overpaymentAmount: 0,
    occurredAt: "2026-07-10T01:00:00.000Z",
    rawBankMemo: "SHOULD-NOT-RENDER-RAW-BANK-MEMO",
  },
  {
    bankTransactionId: "deposit-overpaid-secret-id",
    clientGroupId: "client-overpaid-secret-id",
    grossAmount: 7_000_000,
    linkedRefundAmount: 0,
    netAmount: 7_000_000,
    activeAllocatedAmount: 5_000_000,
    overpaymentAmount: 2_000_000,
    occurredAt: "2026-07-11T01:00:00.000Z",
  },
  {
    bankTransactionId: "deposit-multiple-secret-id",
    clientGroupId: "client-multiple-secret-id",
    grossAmount: 6_000_000,
    linkedRefundAmount: 0,
    netAmount: 6_000_000,
    activeAllocatedAmount: 6_000_000,
    overpaymentAmount: 0,
    occurredAt: "2026-07-12T01:00:00.000Z",
  },
  {
    bankTransactionId: "deposit-manual-secret-id",
    clientGroupId: "client-manual-secret-id",
    grossAmount: 5_000_000,
    linkedRefundAmount: 1_000_000,
    netAmount: 4_000_000,
    activeAllocatedAmount: 2_000_000,
    overpaymentAmount: 2_000_000,
    occurredAt: "2026-07-13T01:00:00.000Z",
  },
];

const summaries = [
  {
    clientGroupId: "client-partial-secret-id",
    displayName: "한빛건설",
    agreedAmount: 10_000_000,
    activeAllocatedAmount: 4_000_000,
    receivableAmount: 6_000_000,
    unknownAmountCount: 0,
    overpaymentAmount: 0,
    earliestDueDate: "2026-08-10",
  },
  {
    clientGroupId: "client-unknown-secret-id",
    displayName: "금액 미정 고객",
    agreedAmount: null,
    activeAllocatedAmount: 0,
    receivableAmount: null,
    unknownAmountCount: 1,
    overpaymentAmount: 0,
    earliestDueDate: null,
  },
  {
    clientGroupId: "client-overpaid-secret-id",
    displayName: "선입금 고객",
    agreedAmount: 5_000_000,
    activeAllocatedAmount: 5_000_000,
    receivableAmount: 0,
    unknownAmountCount: 0,
    overpaymentAmount: 2_000_000,
    earliestDueDate: null,
  },
  {
    clientGroupId: "client-multiple-secret-id",
    displayName: "복수 약정 고객",
    agreedAmount: 10_000_000,
    activeAllocatedAmount: 6_000_000,
    receivableAmount: 4_000_000,
    unknownAmountCount: 0,
    overpaymentAmount: 0,
    earliestDueDate: "2026-08-20",
  },
  {
    clientGroupId: "client-manual-secret-id",
    displayName: "환불 고객",
    agreedAmount: 5_000_000,
    activeAllocatedAmount: 2_000_000,
    receivableAmount: 3_000_000,
    unknownAmountCount: 0,
    overpaymentAmount: 2_000_000,
    earliestDueDate: "2026-08-25",
  },
];

const visibleFeeIdsByStatus = Object.freeze({
  all: commitments.map((row) => row.feeCommitmentId),
  outstanding: [
    "fee-partial-secret-id",
    "fee-multiple-b-secret-id",
    "fee-manual-secret-id",
  ],
  amount_unknown: ["fee-unknown-secret-id"],
  overpaid: ["fee-overpaid-secret-id", "fee-manual-secret-id"],
  settled: ["fee-overpaid-secret-id", "fee-multiple-a-secret-id"],
});

function fixtureVisibleCommitments(statusTab, searchQuery = "") {
  const allowedIds = new Set(visibleFeeIdsByStatus[statusTab] ?? []);
  const query = searchQuery.normalize("NFKC").toLocaleLowerCase("ko-KR").trim();
  return commitments.filter((row) => (
    allowedIds.has(row.feeCommitmentId)
    && (!query || row.displayName.normalize("NFKC").toLocaleLowerCase("ko-KR").includes(query))
  ));
}

function canonicalModel(overrides = {}) {
  return {
    state: "data",
    stateLabel: "확인됨",
    statusTabs,
    activeStatusTab: "all",
    searchQuery: "",
    commitments,
    visibleCommitments: commitments,
    allocations,
    deposits,
    clientSummaries: summaries,
    ranking: [],
    totalReceivables: 13_000_000,
    unknownAmountCount: 1,
    totalOverpayment: 4_000_000,
    unallocatedAmount: 4_000_000,
    authorizedFeeCommitmentIds: commitments.map((row) => row.feeCommitmentId),
    selectedFeeCommitmentId: null,
    selectedFeeCommitment: null,
    mutation: null,
    invoiceRequired: false,
    matterRequired: false,
    sourceCoverage: {
      receivables: { state: "data", coverage: "complete", complete: true, itemCount: summaries.length },
      feeCommitments: { state: "data", coverage: "complete", complete: true, itemCount: commitments.length },
      allocations: { state: "data", coverage: "complete", complete: true, itemCount: allocations.length },
      deposits: { state: "data", coverage: "complete", complete: true, itemCount: deposits.length },
      clients: { state: "data", coverage: "complete", complete: true, itemCount: summaries.length },
    },
    partialSources: [],
    partialReason: null,
    credentialMaterial: "SHOULD-NOT-RENDER-CREDENTIAL",
    ...overrides,
  };
}

function browserHarnessHtml() {
  const fixture = JSON.stringify(canonicalModel()).replaceAll("<", "\\u003c");
  const statusFeeIds = JSON.stringify(visibleFeeIdsByStatus).replaceAll("<", "\\u003c");
  return `<!doctype html>
<html lang="ko" data-skin="forest">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Client receivables panel test</title>
  </head>
  <body>
    <main class="workspace-main">
      <section class="panel record-list-panel">
        <div class="panel-body" id="root"></div>
      </section>
    </main>
    <script type="module">
      import React, { useState } from "react";
      import { createRoot } from "react-dom/client";
      import "/src/styles.css";
      import { ClientReceivablesPanel } from "/src/components/ClientReceivablesPanel.jsx";

      const fixture = ${fixture};
      const statusFeeIds = ${statusFeeIds};
      window.__clientReceivablesEvents = [];
      function record(type, payload) {
        window.__clientReceivablesEvents.push({ type, payload });
      }
      function visibleCommitmentsFor(statusTab, searchQuery) {
        const allowedIds = new Set(statusFeeIds[statusTab] ?? []);
        const query = searchQuery.normalize("NFKC").toLocaleLowerCase("ko-KR").trim();
        return fixture.commitments.filter((row) => (
          allowedIds.has(row.feeCommitmentId)
          && (!query || row.displayName.normalize("NFKC").toLocaleLowerCase("ko-KR").includes(query))
        ));
      }
      function Harness() {
        const [selectedClientId, setSelectedClientId] = useState(null);
        const [selectedFeeCommitmentId, setSelectedFeeCommitmentId] = useState(null);
        const [selectedDepositId, setSelectedDepositId] = useState(null);
        const [activeStatusTab, setActiveStatusTab] = useState("all");
        const [searchQuery, setSearchQuery] = useState("");
        const [mutationResult, setMutationResult] = useState(null);
        window.__setClientReceivablesMutationResult = setMutationResult;
        return React.createElement(ClientReceivablesPanel, {
          model: {
            ...fixture,
            activeStatusTab,
            searchQuery,
            visibleCommitments: visibleCommitmentsFor(activeStatusTab, searchQuery),
          },
          selectedClientId,
          selectedFeeCommitmentId,
          selectedDepositId,
          mutationResult,
          onStatusTabChange(value) {
            setActiveStatusTab(value);
            record("status", value);
          },
          onSearchChange(value) {
            setSearchQuery(value);
            record("search", value);
          },
          onSelectClient(value) {
            setSelectedClientId(value);
            setSelectedFeeCommitmentId(null);
            setSelectedDepositId(null);
            record("client", value);
          },
          onSelectFeeCommitment(value) {
            setSelectedFeeCommitmentId(value);
            record("fee", value);
          },
          onSelectDeposit(value) {
            setSelectedDepositId(value);
            record("deposit", value);
          },
          onCreateFeeCommitment(payload) { record("create", payload); },
          onUpdateFeeCommitment(payload) { record("update", payload); },
          onCancelFeeCommitment(payload) { record("cancel", payload); },
          onReallocateDeposit(payload) { record("reallocate", payload); },
          onRefresh() { record("refresh", null); },
        });
      }
      createRoot(document.getElementById("root")).render(React.createElement(Harness));
      requestAnimationFrame(() => { window.__clientReceivablesReady = true; });
    </script>
  </body>
</html>`;
}

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

let viteServer;
let panelModule;
let baseUrl;

before(async () => {
  const port = await availablePort();
  viteServer = await createServer({
    root: webRoot,
    appType: "custom",
    logLevel: "silent",
    server: { host: "127.0.0.1", port, strictPort: true },
    plugins: [{
      name: "client-receivables-panel-test-harness",
      configureServer(server) {
        server.middlewares.use(async (request, response, next) => {
          if (request.url?.split("?")[0] !== "/__client-receivables-panel-test") {
            next();
            return;
          }
          response.statusCode = 200;
          response.setHeader("Content-Type", "text/html; charset=utf-8");
          response.end(await server.transformIndexHtml(request.url, browserHarnessHtml()));
        });
      },
    }],
  });
  await viteServer.listen();
  baseUrl = `http://127.0.0.1:${port}`;
  panelModule = await viteServer.ssrLoadModule("/src/components/ClientReceivablesPanel.jsx");
});

after(async () => {
  await viteServer?.close();
});

function renderPanel(props) {
  return renderToStaticMarkup(React.createElement(panelModule.ClientReceivablesPanel, props));
}

function visibleText(html) {
  return html.replace(/<[^>]+>/gu, " ").replace(/\s+/gu, " ").trim();
}

function clientRowNames(html) {
  return [...html.matchAll(
    /aria-label="([^"]+) 수임료·미수금 선택"[^>]*data-client-receivables-client-row="\d+"/gu,
  )].map((match) => match[1]);
}

function clientRowScenarios(html) {
  return Object.fromEntries([...html.matchAll(
    /aria-label="([^"]+) 수임료·미수금 선택"[^>]*data-client-receivables-client-row="\d+"[^>]*data-client-ar-scenarios="([^"]*)"/gu,
  )].map((match) => [match[1], match[2].split(",").filter(Boolean)]));
}

test("CL-P5-W03-T02 renders five AR scenarios with natural Korean and no implicit selection", () => {
  const html = renderPanel({ model: canonicalModel() });
  assert.match(html, /data-client-receivables-state="data"/);
  assert.match(html, /일부 입금/);
  assert.match(html, /금액 미정/);
  assert.match(html, /선입금·초과 입금/);
  assert.match(html, /여러 수임료 약정/);
  assert.match(html, /수동 배분 유지/);
  assert.match(html, /환불 반영 배분/);
  assert.match(html, /약정 수임료/);
  assert.match(html, /남은 미수금/);
  assert.match(html, /금액 미정 고객/);
  assert.match(html, /복수 약정 고객/);
  assert.doesNotMatch(html, /금액미정 고객|복수약정 고객/u);
  assert.doesNotMatch(html, /aria-pressed="true"/);
  assert.doesNotMatch(html, /data-client-receivables-detail="true"/);
  assert.doesNotMatch(html, /SHOULD-NOT-RENDER/);
  assert.doesNotMatch(html, /secret-id/);
  assert.match(html, /data-client-receivables-invoice-required="false"/);
  assert.match(html, /data-client-receivables-matter-required="false"/);
  assert.doesNotMatch(visibleText(html), /송장|Invoice|Matter/u);
});

test("CL-P5-W03-T02 integrated panel hides direct creation and points to accepted engagement workflow", () => {
  const html = renderPanel({
    model: canonicalModel(),
    clients: summaries,
    selectedClientId: "client-partial-secret-id",
    onSelectClient() {},
    onSelectFeeCommitment() {},
    onSelectDeposit() {},
  });
  assert.doesNotMatch(html, /data-client-receivables-action="create"/u);
  assert.doesNotMatch(html, /data-client-receivables-create-form="true"/u);
  assert.match(
    html,
    /새 수임료 약정은 상담·수임 관리에서 수임을 확정할 때 함께 등록됩니다\./u
  );
});

test("CL-P5-W03-T02 SSR follows every canonical status and search filter without leaking other client rows", () => {
  const expectedRows = {
    all: ["한빛건설", "금액 미정 고객", "선입금 고객", "복수 약정 고객", "환불 고객"],
    outstanding: ["한빛건설", "복수 약정 고객", "환불 고객"],
    amount_unknown: ["금액 미정 고객"],
    overpaid: ["선입금 고객", "환불 고객"],
    settled: ["선입금 고객", "복수 약정 고객"],
  };
  for (const [activeStatusTab, expected] of Object.entries(expectedRows)) {
    const html = renderPanel({
      model: canonicalModel({
        activeStatusTab,
        visibleCommitments: fixtureVisibleCommitments(activeStatusTab),
      }),
      onSelectClient() {},
    });
    assert.deepEqual(clientRowNames(html), expected, activeStatusTab);
    if (activeStatusTab === "settled") {
      assert.equal(clientRowScenarios(html)["선입금 고객"].includes("정산 완료"), true);
    }
  }

  const searchedHtml = renderPanel({
    model: canonicalModel({
      activeStatusTab: "all",
      searchQuery: "환불",
      visibleCommitments: fixtureVisibleCommitments("all", "환불"),
    }),
    onSelectClient() {},
  });
  assert.deepEqual(clientRowNames(searchedHtml), ["환불 고객"]);
});

test("CL-P5-W03-T02 keeps loading, empty, denied, review, partial, and error distinct and fail-closed", () => {
  const cases = [
    ["loading", "불러오는 중입니다"],
    ["empty", "등록된 수임료 약정이 없습니다"],
    ["denied", "볼 권한이 없습니다"],
    ["review_required", "담당자 확인이 필요합니다"],
    ["partial", "일부만 확인했습니다"],
    ["error", "불러오지 못했습니다"],
  ];
  for (const [state, expected] of cases) {
    const model = canonicalModel({
      state,
      totalReceivables: null,
      unknownAmountCount: null,
      totalOverpayment: null,
      unallocatedAmount: null,
      commitments: state === "partial" ? [] : commitments,
      visibleCommitments: state === "partial" ? [] : commitments,
      allocations: state === "partial" ? [] : allocations,
      deposits: state === "partial" ? [] : deposits,
      clientSummaries: state === "partial" ? [] : summaries,
      partialSources: state === "partial" ? ["allocations", "deposits"] : [],
      partialReason: state === "partial" ? "입금 배분과 은행 입금 일부를 확인하지 못했습니다." : null,
    });
    const html = renderPanel({ model, clients: summaries });
    assert.match(html, new RegExp(`data-client-receivables-state="${state}"`, "u"));
    assert.match(html, new RegExp(expected, "u"));
    if (["loading", "denied", "review_required", "error"].includes(state)) {
      assert.doesNotMatch(html, /한빛건설|13,000,000원/u);
    }
    if (state === "partial") {
      assert.match(html, /확인할 수 없음/u);
      assert.doesNotMatch(html, /data-client-receivables-create-form="true"/u);
    }
  }
});

test("CL-P5-W03-T02 treats raw 409 as a focused stale conflict and blocks versioned writes", () => {
  const html = renderPanel({
    model: canonicalModel(),
    selectedClientId: "client-partial-secret-id",
    selectedFeeCommitmentId: "fee-partial-secret-id",
    selectedDepositId: "deposit-partial-secret-id",
    mutationResult: { kind: "error", status: 409, safe_error_codes: ["FINANCE_STATE_VERSION_CONFLICT"] },
    onRefresh() {},
    onSelectClient() {},
    onSelectFeeCommitment() {},
    onSelectDeposit() {},
    onUpdateFeeCommitment() {},
    onCancelFeeCommitment() {},
    onReallocateDeposit() {},
    onCreateFeeCommitment() {},
  });
  assert.match(html, /data-client-receivables-mutation="stale_conflict"/);
  assert.match(html, /다른 사용자가 먼저 수정했습니다/);
  assert.match(html, /최신 내용 다시 불러오기/);
  assert.match(html, /tabindex="-1"/);
  assert.doesNotMatch(html, /data-client-receivables-(?:update|reallocation|create)-form="true"/u);
  assert.match(html, /<button(?=[^>]*data-client-receivables-action="fee")(?=[^>]*disabled="")[^>]*>/u);
  assert.match(html, /<button(?=[^>]*data-client-receivables-action="deposit")(?=[^>]*disabled="")[^>]*>/u);
  assert.match(html, /<button(?=[^>]*data-client-receivables-action="create")(?=[^>]*disabled="")[^>]*>/u);
  assert.doesNotMatch(html, /FINANCE_STATE_VERSION_CONFLICT/);
});

test("CL-P5-W03-T02 bounds rendered rows without exposing raw record identifiers", () => {
  const manyClients = Array.from({ length: 8 }, (_, index) => ({
    clientGroupId: `bounded-client-${index + 1}`,
    displayName: `표시 고객 ${index + 1}`,
    agreedAmount: index + 1,
    activeAllocatedAmount: 0,
    receivableAmount: index + 1,
    unknownAmountCount: 0,
    overpaymentAmount: 0,
  }));
  const manyCommitments = manyClients.map((client, index) => ({
    feeCommitmentId: `bounded-fee-${index + 1}`,
    clientGroupId: client.clientGroupId,
    displayName: client.displayName,
    agreedAmount: client.agreedAmount,
    activeAllocatedAmount: 0,
    receivableAmount: client.receivableAmount,
    amountStatus: "known",
    status: "active",
    stateVersion: 1,
    active: true,
  }));
  const html = renderPanel({
    model: canonicalModel({
      commitments: manyCommitments,
      visibleCommitments: manyCommitments,
      allocations: [],
      deposits: [],
      clientSummaries: manyClients,
    }),
    maxVisibleRows: 3,
    onSelectClient() {},
  });
  assert.match(html, /data-client-receivables-bounded="true"/);
  assert.match(html, /최대 3건/);
  assert.match(html, /data-client-receivables-client-row="3"/);
  assert.doesNotMatch(html, /data-client-receivables-client-row="4"/);
  assert.doesNotMatch(html, /bounded-client-/);
});

test("CL-P5-W03-T02 tab keyboard order wraps and supports Home and End", () => {
  assert.equal(panelModule.nextClientReceivablesTabIndex(0, "ArrowLeft", 5), 4);
  assert.equal(panelModule.nextClientReceivablesTabIndex(4, "ArrowRight", 5), 0);
  assert.equal(panelModule.nextClientReceivablesTabIndex(3, "Home", 5), 0);
  assert.equal(panelModule.nextClientReceivablesTabIndex(1, "End", 5), 4);
  assert.equal(panelModule.nextClientReceivablesTabIndex(1, "Escape", 5), null);
});

test("CL-P5-W03-T02 browser switches every status and clears a selection outside the next filter", async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
  const expectedRows = {
    all: ["한빛건설", "금액 미정 고객", "선입금 고객", "복수 약정 고객", "환불 고객"],
    outstanding: ["한빛건설", "복수 약정 고객", "환불 고객"],
    amount_unknown: ["금액 미정 고객"],
    overpaid: ["선입금 고객", "환불 고객"],
    settled: ["선입금 고객", "복수 약정 고객"],
  };
  async function renderedClientNames() {
    return page.locator("[data-client-receivables-client-row]").evaluateAll((rows) => (
      rows.map((row) => row.querySelector("strong")?.textContent?.trim())
    ));
  }
  try {
    await page.goto(`${baseUrl}/__client-receivables-panel-test`, { waitUntil: "networkidle" });
    await page.waitForFunction(() => window.__clientReceivablesReady === true);
    assert.equal(
      await page.locator('[data-client-receivables-status-tab="cancelled"]').count(),
      0,
      "active-only canonical read must not expose a dead cancelled-history tab",
    );
    const observedRows = {};
    for (const [status, expected] of Object.entries(expectedRows)) {
      await page.locator(`[data-client-receivables-status-tab="${status}"]`).click();
      await page.waitForFunction(
        (activeStatus) => document.querySelector(`[data-client-receivables-status-tab="${activeStatus}"]`)
          ?.getAttribute("aria-selected") === "true",
        status,
      );
      observedRows[status] = await renderedClientNames();
      assert.deepEqual(observedRows[status], expected);
    }

    await page.locator('[data-client-receivables-status-tab="settled"]').click();
    assert.match(
      await page.getByRole("button", { name: "선입금 고객 수임료·미수금 선택" })
        .getAttribute("data-client-ar-scenarios"),
      /정산 완료/u,
    );
    await page.locator('[data-client-receivables-status-tab="all"]').click();
    const clientSelect = page.locator('[data-client-receivables-client-select="true"]');
    await clientSelect.selectOption("client-3");
    await page.waitForSelector('[data-client-receivables-detail="true"]');
    await page.locator('[data-client-receivables-status-tab="outstanding"]').click();
    await page.waitForFunction(() => (
      document.querySelector('[data-client-receivables-client-select="true"]')?.value === ""
      && !document.querySelector('[data-client-receivables-detail="true"]')
    ));
    assert.equal(await clientSelect.inputValue(), "");
    assert.equal(await page.locator('[data-client-receivables-detail="true"]').count(), 0);
    assert.equal(
      await page.evaluate(() => window.__clientReceivablesEvents
        .some((event) => event.type === "client" && event.payload === null)),
      true,
    );

    await page.locator('[data-client-receivables-status-tab="all"]').click();
    await page.getByRole("searchbox", { name: "수임료·미수금 고객 검색" }).fill("환불");
    await page.waitForFunction(() => (
      document.querySelectorAll("[data-client-receivables-client-row]").length === 1
    ));
    const searchedRows = await renderedClientNames();
    assert.deepEqual(searchedRows, ["환불 고객"]);

    const evidenceDir = process.env.CLIENT_AR_PANEL_ARTIFACT_DIR;
    if (evidenceDir) {
      await writeFile(
        join(evidenceDir, "status-filter-observables.json"),
        `${JSON.stringify({
          observedRows,
          settledLabel: "정산 완료",
          cancelledTabAbsent: true,
          filteredSelectionCleared: true,
          searchQuery: "환불",
          searchedRows,
        }, null, 2)}\n`,
        "utf8",
      );
    }
  } finally {
    await page.close();
    await browser.close();
  }
});

test("CL-P5-W03-T02 browser flow requires explicit selections, one active action, focus, and versioned callback intents", async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  try {
    await page.goto(`${baseUrl}/__client-receivables-panel-test`, { waitUntil: "networkidle" });
    await page.waitForFunction(() => window.__clientReceivablesReady === true);

    const clientSelect = page.locator('[data-client-receivables-client-select="true"]');
    const feeSelect = page.locator('[data-client-receivables-fee-select="true"]');
    const depositSelect = page.locator('[data-client-receivables-deposit-select="true"]');
    assert.equal(await clientSelect.inputValue(), "");
    assert.equal(await feeSelect.inputValue(), "");
    assert.equal(await depositSelect.inputValue(), "");
    assert.equal(await page.locator('[data-client-receivables-detail="true"]').count(), 0);

    const activeTab = page.locator('[data-client-receivables-status-tab="all"]');
    await activeTab.focus();
    await activeTab.press("ArrowRight");
    const outstandingTab = page.locator('[data-client-receivables-status-tab="outstanding"]');
    assert.equal(await outstandingTab.getAttribute("aria-selected"), "true");
    assert.equal(
      await page.evaluate(() => document.activeElement?.getAttribute("data-client-receivables-status-tab")),
      "outstanding",
    );

    await clientSelect.selectOption({ label: "한빛건설" });
    await page.waitForSelector('[data-client-receivables-detail="true"]');
    assert.equal(
      await page.evaluate(() => document.activeElement?.id),
      "client-receivables-detail-heading",
    );
    await feeSelect.focus();
    await feeSelect.selectOption({ label: "약정 수임료 10,000,000원 · 2026.08.10" });
    await page.waitForTimeout(0);
    assert.equal(
      await page.evaluate(() => document.activeElement
        ?.getAttribute("data-client-receivables-fee-select")),
      "true",
      "fee selection must not move focus back to the detail heading",
    );
    await depositSelect.focus();
    await depositSelect.selectOption({ label: "2026.07.10 · 입금액 4,000,000원" });
    await page.waitForTimeout(0);
    assert.equal(
      await page.evaluate(() => document.activeElement
        ?.getAttribute("data-client-receivables-deposit-select")),
      "true",
      "deposit selection must not move focus back to the detail heading",
    );
    assert.equal(await page.locator('[data-client-receivables-update-form="true"]').count(), 0);
    assert.equal(await page.locator('[data-client-receivables-reallocation-form="true"]').count(), 0);
    assert.equal(await page.locator('[data-client-receivables-create-form="true"]').count(), 0);

    await page.locator('[data-client-receivables-action="fee"]').click();
    const updateForm = page.locator('[data-client-receivables-update-form="true"]');
    assert.equal(await updateForm.count(), 1);
    assert.equal(await page.locator('[data-client-receivables-reallocation-form="true"]').count(), 0);
    assert.equal(await page.locator('[data-client-receivables-create-form="true"]').count(), 0);
    await updateForm.locator('input[inputmode="numeric"]').fill("11000000");
    await updateForm.locator("textarea").fill("약정 금액 확정");
    await updateForm.getByRole("button", { name: "약정 변경 저장" }).click();

    await updateForm.getByText("이 수임료 약정을 취소하는 경우 확인했습니다.").click();
    await updateForm.getByRole("button", { name: "수임료 약정 취소" }).click();

    await page.locator('[data-client-receivables-action="create"]').click();
    const createForm = page.locator('[data-client-receivables-create-form="true"]');
    assert.equal(await updateForm.count(), 0);
    assert.equal(await page.locator('[data-client-receivables-reallocation-form="true"]').count(), 0);
    assert.equal(await createForm.count(), 1);
    await createForm.locator('input[inputmode="numeric"]').fill("2500000");
    await createForm.locator('input[type="date"]').fill("2026-09-01");
    await createForm.locator("textarea").fill("추가 약정 등록");
    await createForm.getByRole("button", { name: "수임료 약정 등록" }).click();
    const renderedCopy = await page.locator("body").innerText();
    assert.match(renderedCopy, /선택 고객 금액 내역/u);
    assert.match(renderedCopy, /현재 변경 번호/u);
    assert.match(renderedCopy, /배분 후 남은 입금액/u);
    assert.doesNotMatch(renderedCopy, /안전한 금액 상세|version|순입금/u);

    await clientSelect.selectOption({ label: "복수 약정 고객" });
    await feeSelect.selectOption({ label: "약정 수임료 6,000,000원 · 2026.08.20" });
    await depositSelect.selectOption({ label: "2026.07.12 · 입금액 6,000,000원" });
    await page.locator('[data-client-receivables-action="deposit"]').click();
    const reallocationForm = page.locator('[data-client-receivables-reallocation-form="true"]');
    assert.equal(await updateForm.count(), 0);
    assert.equal(await reallocationForm.count(), 1);
    assert.equal(await createForm.count(), 0);
    await reallocationForm.locator('input[inputmode="numeric"]').fill("1500000");
    await reallocationForm.locator("textarea").fill("복수 약정 입금 배분 조정");
    await reallocationForm.getByRole("button", { name: "입금 배분 저장" }).click();

    await page.evaluate(() => window.__setClientReceivablesMutationResult({
      kind: "error",
      status: 409,
      safe_error_codes: ["FINANCE_STATE_VERSION_CONFLICT"],
    }));
    await page.waitForSelector('[data-client-receivables-mutation="stale_conflict"]');
    assert.equal(
      await page.evaluate(() => document.activeElement?.getAttribute("data-client-receivables-mutation")),
      "stale_conflict",
    );
    assert.equal(
      await page.locator('[data-client-receivables-action="deposit"]').isDisabled(),
      true,
    );
    const staleConflictOpenFormCount = await reallocationForm.count();
    assert.equal(staleConflictOpenFormCount, 0);
    await page.locator('[data-client-receivables-action="deposit"]').evaluate((button) => button.click());
    assert.equal(
      await page.evaluate(() => window.__clientReceivablesEvents
        .filter((event) => event.type === "reallocate").length),
      1,
    );
    await page.evaluate(() => window.__setClientReceivablesMutationResult(null));
    await page.waitForFunction(() => !document.querySelector('[data-client-receivables-mutation="stale_conflict"]'));
    await page.locator('[data-client-receivables-action="deposit"]').click();
    assert.equal(await reallocationForm.count(), 1);

    const events = await page.evaluate(() => window.__clientReceivablesEvents);
    const update = events.find((event) => event.type === "update")?.payload;
    assert.deepEqual(update, {
      feeCommitmentId: "fee-partial-secret-id",
      expectedStateVersion: 2,
      changes: { agreedAmount: 11_000_000 },
      reason: "약정 금액 확정",
    });
    const cancel = events.find((event) => event.type === "cancel")?.payload;
    assert.deepEqual(cancel, {
      feeCommitmentId: "fee-partial-secret-id",
      expectedStateVersion: 2,
      reason: "약정 금액 확정",
    });
    const reallocate = events.find((event) => event.type === "reallocate")?.payload;
    assert.deepEqual(reallocate, {
      bankTransactionId: "deposit-multiple-secret-id",
      clientGroupId: "client-multiple-secret-id",
      depositNetAmount: 6_000_000,
      expectedAllocations: [
        {
          clientDepositAllocationId: "allocation-multiple-a-secret-id",
          stateVersion: 2,
        },
        {
          clientDepositAllocationId: "allocation-multiple-b-secret-id",
          stateVersion: 2,
        },
      ],
      targets: [
        {
          feeCommitmentId: "fee-multiple-a-secret-id",
          activeAmount: 4_000_000,
        },
        {
          feeCommitmentId: "fee-multiple-b-secret-id",
          activeAmount: 1_500_000,
        },
      ],
      reason: "복수 약정 입금 배분 조정",
    });
    assert.equal(new Set(
      reallocate.expectedAllocations.map((row) => row.clientDepositAllocationId),
    ).size, reallocate.expectedAllocations.length);
    const create = events.find((event) => event.type === "create")?.payload;
    assert.deepEqual(create, {
      clientGroupId: "client-partial-secret-id",
      agreedAmount: 2_500_000,
      dueDate: "2026-09-01",
      reason: "추가 약정 등록",
    });

    const evidenceDir = process.env.CLIENT_AR_PANEL_ARTIFACT_DIR;
    if (evidenceDir) {
      await mkdir(evidenceDir, { recursive: true });
      await page.screenshot({
        path: join(evidenceDir, "client-receivables-panel.png"),
        fullPage: true,
      });
    }

    await page.setViewportSize({ width: 820, height: 1000 });
    const tabletHorizontalOverflow = await page.evaluate(() => ({
      document: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      panel: [...document.querySelectorAll('[data-client-receivables-panel="true"]')]
        .some((element) => element.scrollWidth > element.clientWidth + 1),
    }));
    assert.deepEqual(tabletHorizontalOverflow, { document: false, panel: false });
    if (evidenceDir) {
      await page.screenshot({
        path: join(evidenceDir, "client-receivables-panel-820.png"),
        fullPage: true,
      });
    }

    await page.setViewportSize({ width: 390, height: 844 });
    const horizontalOverflow = await page.evaluate(() => ({
      document: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      panel: [...document.querySelectorAll('[data-client-receivables-panel="true"]')]
        .some((element) => element.scrollWidth > element.clientWidth + 1),
    }));
    assert.deepEqual(horizontalOverflow, { document: false, panel: false });
    assert.equal(await clientSelect.isVisible(), true);
    assert.equal(await feeSelect.isVisible(), true);
    assert.equal(await depositSelect.isVisible(), true);
    assert.equal(await page.locator("#client-receivables-detail-heading").isVisible(), true);
    for (const name of ["약정 변경", "입금 배분", "새 약정"]) {
      assert.equal(await page.getByRole("button", { name, exact: true }).isVisible(), true);
    }
    assert.equal(await createForm.count(), 0);
    assert.equal(await updateForm.count(), 0);
    assert.equal(await reallocationForm.count(), 1);
    await reallocationForm.locator('input[inputmode="numeric"]').fill("1500000");
    await reallocationForm.locator("textarea").fill("모바일 키보드 확인");
    await page.getByRole("button", { name: "입금 배분 저장", exact: true }).focus();
    const mobileFocusedButton = await page.evaluate(() => document.activeElement?.textContent?.trim());
    assert.equal(mobileFocusedButton, "입금 배분 저장");
    const mobileActionFormCounts = {
      update: await updateForm.count(),
      reallocation: await reallocationForm.count(),
      create: await createForm.count(),
    };

    if (evidenceDir) {
      await page.screenshot({
        path: join(evidenceDir, "client-receivables-panel-390.png"),
        fullPage: true,
      });
      await writeFile(
        join(evidenceDir, "client-receivables-panel.html"),
        await page.content(),
        "utf8",
      );
    }

    await page.locator("#client-receivables-detail-heading").press("Escape");
    await page.waitForFunction(() => !document.querySelector('[data-client-receivables-detail="true"]'));
    const escapeFocusReturn = await page.evaluate(() => document.activeElement
      ?.getAttribute("data-client-receivables-client-select"));
    assert.equal(escapeFocusReturn, "true");
    if (evidenceDir) {
      await writeFile(
        join(evidenceDir, "browser-observables.json"),
        `${JSON.stringify({
          viewport: { width: 1440, height: 1100 },
          initialSelection: { client: null, fee: null, deposit: null },
          focusedDetailId: "client-receivables-detail-heading",
          activeTabAfterArrowRight: "outstanding",
          tabletHorizontalOverflow,
          mobileHorizontalOverflow: horizontalOverflow,
          mobileActionFormCounts,
          mobileFocusedButton,
          callbackTypes: events.map((event) => event.type),
          updateExpectedStateVersion: update.expectedStateVersion,
          reallocationExpectedAllocations: reallocate.expectedAllocations,
          reallocationEventCount: events.filter((event) => event.type === "reallocate").length,
          staleConflictOpenFormCount,
          staleConflictBlockedRepeat: true,
          escapeFocusReturn,
        }, null, 2)}\n`,
        "utf8",
      );
    }
  } finally {
    await page.close();
    await browser.close();
  }
});
