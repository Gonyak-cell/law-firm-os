#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createFinanceRepository } from "../packages/billing/src/finance-repository.js";
import { highestPrivilegeRegisteredAccount, MATTER_VAULT_REGISTERED_TENANT_ID } from "../apps/api/src/matter-vault-account-registry.js";
import { startApiServer } from "../apps/api/src/server.js";
import { apiSessionHeaders } from "../apps/api/test/helpers/session.js";

const ROOT = process.cwd();
const ARTIFACT_DIR = join(ROOT, "artifacts", "manual-qa");
const PROOF_PATH = join(ARTIFACT_DIR, "upl-b12-trust-ledger-proof.json");
const TENANT = MATTER_VAULT_REGISTERED_TENANT_ID;
const ACCOUNT = highestPrivilegeRegisteredAccount();
const ACTOR = ACCOUNT.user_id;
const MATTER = "matter_upl_b12_trust";
const BASE_QUERY = `tenant_id=${TENANT}&permission_ref=upl_b12_finance_read&audit_hint_ref=upl_b12_api_proof`;

mkdirSync(ARTIFACT_DIR, { recursive: true });

async function apiJson(baseUrl, path, options = {}) {
  const headers = {
    ...(await apiSessionHeaders(baseUrl, ACCOUNT)),
    ...(options.headers ?? {}),
  };
  if (options.body && !headers["content-type"]) headers["content-type"] = "application/json";
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers });
  const body = await response.json();
  return { status: response.status, body };
}

function writeBody(idempotencyKey) {
  return {
    tenant_id: TENANT,
    permission_ref: "upl_b12_finance_write",
    audit_hint_ref: "upl_b12_api_proof",
    actor_id: ACTOR,
    idempotency_key: idempotencyKey,
  };
}

const financeRepository = createFinanceRepository({
  seedRecords: [
    {
      model_type: "Invoice",
      invoice_id: "invoice-upl-b12-drawdown",
      tenant_id: TENANT,
      matter_id: MATTER,
      billing_client_party_id: "party-upl-b12",
      amount_due: 250000,
      amount_paid: 0,
      currency: "KRW",
      status: "issued",
    },
    {
      model_type: "Invoice",
      invoice_id: "invoice-upl-b12-negative",
      tenant_id: TENANT,
      matter_id: MATTER,
      billing_client_party_id: "party-upl-b12",
      amount_due: 100000,
      amount_paid: 0,
      currency: "KRW",
      status: "issued",
    },
  ],
});

const started = await startApiServer({ port: 0, financeRepository });
let report;
try {
  const baseUrl = `http://${started.host}:${started.port}`;
  const deposit = await apiJson(baseUrl, "/api/finance/trust-deposits", {
    method: "POST",
    body: JSON.stringify({
      ...writeBody("upl-b12-deposit"),
      deposit: {
        trust_ledger_entry_id: "trust-ledger-upl-b12-deposit",
        tenant_id: TENANT,
        matter_id: MATTER,
        client_group_id: "client-group-upl-b12",
        amount: 400000,
        currency: "KRW",
      },
    }),
  });

  const drawdown = await apiJson(baseUrl, "/api/finance/trust-drawdowns", {
    method: "POST",
    body: JSON.stringify({
      ...writeBody("upl-b12-drawdown"),
      drawdown: {
        trust_ledger_entry_id: "trust-ledger-upl-b12-drawdown",
        tenant_id: TENANT,
        matter_id: MATTER,
        invoice_id: "invoice-upl-b12-drawdown",
        amount: 250000,
        currency: "KRW",
      },
    }),
  });

  const refund = await apiJson(baseUrl, "/api/finance/trust-refunds", {
    method: "POST",
    body: JSON.stringify({
      ...writeBody("upl-b12-refund"),
      refund: {
        trust_ledger_entry_id: "trust-ledger-upl-b12-refund",
        tenant_id: TENANT,
        matter_id: MATTER,
        amount: 150000,
        currency: "KRW",
      },
    }),
  });

  const balances = await apiJson(baseUrl, `/api/finance/trust-balances?${BASE_QUERY}&matter_id=${MATTER}&currency=KRW`);

  const negativeDrawdown = await apiJson(baseUrl, "/api/finance/trust-drawdowns", {
    method: "POST",
    body: JSON.stringify({
      ...writeBody("upl-b12-negative-drawdown"),
      drawdown: {
        trust_ledger_entry_id: "trust-ledger-upl-b12-negative",
        tenant_id: TENANT,
        matter_id: MATTER,
        invoice_id: "invoice-upl-b12-negative",
        amount: 1,
        currency: "KRW",
      },
    }),
  });

  const audit = await apiJson(baseUrl, `/api/finance/audit?${BASE_QUERY}`);
  const auditActions = new Set((audit.body.items ?? []).map((event) => event.action));
  const checks = [
    {
      id: "deposit-segregates-client-funds",
      passed:
        deposit.status === 201 &&
        deposit.body.item?.entry_type === "deposit" &&
        deposit.body.item?.segregated_client_funds === true &&
        deposit.body.trust_balance?.available_balance === 400000 &&
        deposit.body.trust_balance?.refund_liability_amount === 400000,
    },
    {
      id: "drawdown-offsets-invoice",
      passed:
        drawdown.status === 201 &&
        drawdown.body.item?.entry_type === "drawdown" &&
        drawdown.body.invoice?.status === "paid" &&
        drawdown.body.invoice?.amount_paid === 250000 &&
        drawdown.body.invoice?.trust_drawdown_amount === 250000 &&
        drawdown.body.trust_balance?.available_balance === 150000,
    },
    {
      id: "refund-liability-clears-remainder",
      passed:
        refund.status === 201 &&
        refund.body.item?.entry_type === "refund_liability" &&
        refund.body.trust_balance?.available_balance === 0 &&
        refund.body.trust_balance?.refund_total === 150000 &&
        refund.body.trust_balance?.refund_liability_amount === 0,
    },
    {
      id: "balance-report-summarizes-ledger",
      passed:
        balances.status === 200 &&
        balances.body.summary?.deposit_total === 400000 &&
        balances.body.summary?.drawdown_total === 250000 &&
        balances.body.summary?.refund_total === 150000 &&
        balances.body.summary?.available_balance === 0 &&
        balances.body.summary?.negative_trust_balance_blocked === true,
    },
    {
      id: "negative-balance-blocked",
      passed:
        negativeDrawdown.status === 400 &&
        negativeDrawdown.body.safe_error_codes?.includes("FINANCE_API_VALIDATION_ERROR") &&
        negativeDrawdown.body.count_leak_prevented === true,
    },
    {
      id: "ledger-audit-recorded",
      passed:
        audit.status === 200 &&
        auditActions.has("trust_ledger.deposit.receive") &&
        auditActions.has("trust_ledger.drawdown.invoice") &&
        auditActions.has("trust_ledger.refund_liability.record"),
    },
  ];

  report = {
    schema_version: "law-firm-os.upl-b12.trust-ledger-proof.v0.1",
    generated_at: new Date().toISOString(),
    verdict: checks.every((check) => check.passed) ? "PASS" : "FAIL",
    api_url: baseUrl,
    contract_ref: "UPL-B-12",
    route_surface: [
      "POST /api/finance/trust-deposits",
      "POST /api/finance/trust-drawdowns",
      "POST /api/finance/trust-refunds",
      "GET /api/finance/trust-balances",
      "GET /api/finance/audit",
    ],
    checks,
    observed: {
      deposit: { status: deposit.status, item: deposit.body.item, trust_balance: deposit.body.trust_balance },
      drawdown: { status: drawdown.status, item: drawdown.body.item, invoice: drawdown.body.invoice, trust_balance: drawdown.body.trust_balance },
      refund: { status: refund.status, item: refund.body.item, trust_balance: refund.body.trust_balance },
      balances: { status: balances.status, summary: balances.body.summary, items: balances.body.items },
      negative_drawdown: { status: negativeDrawdown.status, safe_error_codes: negativeDrawdown.body.safe_error_codes },
      audit: { status: audit.status, actions: [...auditActions].sort() },
    },
  };
} finally {
  await new Promise((resolve) => started.server.close(resolve));
}

writeFileSync(PROOF_PATH, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ verdict: report.verdict, proof: PROOF_PATH }, null, 2));
if (report.verdict !== "PASS") process.exit(1);
