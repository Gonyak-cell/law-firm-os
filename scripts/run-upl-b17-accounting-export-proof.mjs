#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createFinanceRepository } from "../packages/billing/src/finance-repository.js";
import { highestPrivilegeRegisteredAccount, MATTER_VAULT_REGISTERED_TENANT_ID } from "../apps/api/src/matter-vault-account-registry.js";
import { startApiServer } from "../apps/api/src/server.js";
import { apiSessionHeaders } from "../apps/api/test/helpers/session.js";

const ROOT = process.cwd();
const ARTIFACT_DIR = join(ROOT, "artifacts", "manual-qa");
const PROOF_PATH = join(ARTIFACT_DIR, "upl-b17-accounting-export-proof.json");
const TENANT = MATTER_VAULT_REGISTERED_TENANT_ID;
const ACCOUNT = highestPrivilegeRegisteredAccount();
const ACTOR = ACCOUNT.user_id;
const BASE_QUERY = `tenant_id=${TENANT}&permission_ref=upl_b17_finance_read&audit_hint_ref=upl_b17_api_proof`;

mkdirSync(ARTIFACT_DIR, { recursive: true });

async function apiJson(baseUrl, path, options = {}) {
  const headers = {
    ...(await apiSessionHeaders(baseUrl, ACCOUNT)),
    ...(options.headers ?? {}),
  };
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers });
  const body = await response.json();
  return { status: response.status, body };
}

const financeRepository = createFinanceRepository({
  seedRecords: [
    {
      model_type: "JournalEntry",
      journal_entry_id: "journal_upl_b17_july",
      tenant_id: TENANT,
      matter_id: "matter_upl_b17",
      source_ref: "invoice_upl_b17_july",
      currency: "KRW",
      posted_at: "2026-07-05T00:00:00.000Z",
      lines: [
        { account: "ar", debit: 100000, credit: 0 },
        { account: "revenue", debit: 0, credit: 100000 },
      ],
    },
    {
      model_type: "JournalEntry",
      journal_entry_id: "journal_upl_b17_june",
      tenant_id: TENANT,
      matter_id: "matter_upl_b17",
      source_ref: "invoice_upl_b17_june",
      currency: "KRW",
      posted_at: "2026-06-20T00:00:00.000Z",
      lines: [
        { account: "ar", debit: 50000, credit: 0 },
        { account: "revenue", debit: 0, credit: 50000 },
      ],
    },
  ],
});

const started = await startApiServer({ port: 0, financeRepository });
let report;
try {
  const baseUrl = `http://${started.host}:${started.port}`;
  const exported = await apiJson(
    baseUrl,
    `/api/finance/accounting-export.csv?${BASE_QUERY}&from_date=2026-07-01&to_date=2026-07-31&idempotency_key=upl-b17-accounting-export`,
  );
  const replay = await apiJson(
    baseUrl,
    `/api/finance/accounting-export.csv?${BASE_QUERY}&from_date=2026-07-01&to_date=2026-07-31&idempotency_key=upl-b17-accounting-export`,
  );
  const audit = await apiJson(baseUrl, `/api/finance/audit?${BASE_QUERY}`);
  const item = exported.body.item ?? {};
  const auditActions = new Set((audit.body.items ?? []).map((event) => event.action));
  const checks = [
    {
      id: "period-filter-keeps-july-only",
      passed:
        exported.status === 201 &&
        item.row_count === 2 &&
        item.csv_text?.includes("journal_upl_b17_july") &&
        !item.csv_text?.includes("journal_upl_b17_june"),
    },
    {
      id: "debit-credit-balanced",
      passed: item.debit_total === 100000 && item.credit_total === 100000 && item.balanced === true,
    },
    {
      id: "csv-safe-export-shape",
      passed:
        /^journal_entry_id,posting_date,source_ref,matter_id,account,debit,credit,currency/.test(item.csv_text ?? "") &&
        item.csv_sha256?.length === 64 &&
        item.bank_reference_included === false &&
        item.credential_material_included === false &&
        item.raw_journal_payload_included === false &&
        item.production_ready_claim === false,
    },
    {
      id: "idempotent-replay-and-audit",
      passed:
        replay.status === 200 &&
        replay.body.outcome === "idempotent_replay" &&
        audit.status === 200 &&
        auditActions.has("accounting.export.csv.create") &&
        auditActions.has("finance:accounting_export:read"),
    },
  ];

  report = {
    schema_version: "law-firm-os.upl-b17.accounting-export-proof.v0.1",
    generated_at: new Date().toISOString(),
    verdict: checks.every((check) => check.passed) ? "PASS" : "FAIL",
    api_url: baseUrl,
    contract_ref: "UPL-B-17",
    route_surface: [
      "GET /api/finance/accounting-export.csv",
      "GET /api/finance/audit",
    ],
    checks,
    observed: {
      export: { status: exported.status, item },
      replay: { status: replay.status, outcome: replay.body.outcome },
      audit: { status: audit.status, actions: [...auditActions].sort() },
    },
  };
} finally {
  await new Promise((resolve) => started.server.close(resolve));
}

writeFileSync(PROOF_PATH, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ verdict: report.verdict, proof: PROOF_PATH }, null, 2));
if (report.verdict !== "PASS") process.exit(1);
