#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createFinanceRepository } from "../packages/billing/src/finance-repository.js";
import { PERMISSION_CONTEXT_HEADER } from "../apps/api/src/permission-gate.js";
import { startApiServer } from "../apps/api/src/server.js";

const ROOT = process.cwd();
const ARTIFACT_DIR = join(ROOT, "artifacts", "manual-qa");
const PROOF_PATH = join(ARTIFACT_DIR, "upl-b11-fee-arrangement-types-proof.json");
const TENANT = "tenant_upl_b11_fee_arrangements";
const ACTOR = "user_upl_b11_finance";
const PARTNER = "user_upl_b11_partner";
const RATE_CARD_ID = "rate-upl-b11";

mkdirSync(ARTIFACT_DIR, { recursive: true });

function permissionContext(roleIds = ["finance_user"]) {
  return JSON.stringify({
    principal: { user_id: roleIds.includes("partner") ? PARTNER : ACTOR, tenant_id: TENANT, role_ids: roleIds },
    rules: [{ id: `rule_upl_b11_${roleIds.join("_")}`, effect: "allow", action: "*" }],
    object_acl: [],
  });
}

async function apiJson(baseUrl, path, options = {}) {
  const headers = {
    [PERMISSION_CONTEXT_HEADER]: permissionContext(),
    ...(options.headers ?? {}),
  };
  if (options.body && !headers["content-type"]) headers["content-type"] = "application/json";
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers });
  const body = await response.json();
  return { status: response.status, body };
}

async function postJson(baseUrl, path, body, roleIds = ["finance_user"]) {
  return apiJson(baseUrl, path, {
    method: "POST",
    headers: { [PERMISSION_CONTEXT_HEADER]: permissionContext(roleIds) },
    body: JSON.stringify(body),
  });
}

function commonBody(idempotencyKey) {
  return {
    tenant_id: TENANT,
    permission_ref: "upl_b11_finance_write",
    audit_hint_ref: "upl_b11_api_proof",
    actor_id: ACTOR,
    idempotency_key: idempotencyKey,
  };
}

async function driveBranch(baseUrl, branch) {
  const matterId = `matter_upl_b11_${branch.suffix}`;
  const feeArrangementId = `fee_upl_b11_${branch.suffix}`;
  const timeEntryId = `time_upl_b11_${branch.suffix}`;
  const snapshotId = `snapshot_upl_b11_${branch.suffix}`;
  const prebillId = `prebill_upl_b11_${branch.suffix}`;
  const invoiceId = `invoice_upl_b11_${branch.suffix}`;

  const arrangement = await postJson(baseUrl, "/api/finance/fee-arrangements", {
    ...commonBody(`upl-b11-fee-${branch.suffix}`),
    fee_arrangement: {
      fee_arrangement_id: feeArrangementId,
      tenant_id: TENANT,
      matter_id: matterId,
      billing_profile_id: `billing_profile_upl_b11_${branch.suffix}`,
      rate_card_id: RATE_CARD_ID,
      ...branch.fee_arrangement,
    },
  });

  const timeEntry = await postJson(baseUrl, "/api/finance/time-entries", {
    ...commonBody(`upl-b11-time-${branch.suffix}`),
    time_entry: {
      time_entry_id: timeEntryId,
      tenant_id: TENANT,
      matter_id: matterId,
      role_id: "partner",
      work_date: "2026-07-03",
      narrative: `UPL-B-11 ${branch.suffix} source`,
      duration_minutes: 60,
      billable: true,
    },
  });

  const approvedTime = await postJson(baseUrl, "/api/finance/time-entries/approve", {
    ...commonBody(`upl-b11-time-approve-${branch.suffix}`),
    actor_id: PARTNER,
    time_entry_id: timeEntryId,
  }, ["partner"]);

  const wip = await postJson(baseUrl, "/api/finance/wip", {
    ...commonBody(`upl-b11-wip-${branch.suffix}`),
    matter_id: matterId,
    rate_card_id: RATE_CARD_ID,
    fee_arrangement_id: feeArrangementId,
  });

  const snapshot = await postJson(baseUrl, "/api/finance/wip-snapshots", {
    ...commonBody(`upl-b11-snapshot-${branch.suffix}`),
    matter_id: matterId,
    wip_snapshot_id: snapshotId,
    wip_item_ids: (wip.body.items ?? []).map((item) => item.wip_item_id),
  });

  const prebill = await postJson(baseUrl, "/api/finance/prebills", {
    ...commonBody(`upl-b11-prebill-${branch.suffix}`),
    prebill: {
      prebill_id: prebillId,
      tenant_id: TENANT,
      matter_id: matterId,
      wip_snapshot_id: snapshotId,
      partner_reviewer_id: PARTNER,
      currency: "KRW",
    },
  });

  const approvedPrebill = await postJson(baseUrl, "/api/finance/prebills/approve", {
    ...commonBody(`upl-b11-prebill-approve-${branch.suffix}`),
    actor_id: PARTNER,
    prebill_id: prebillId,
  }, ["partner"]);

  const invoice = await postJson(baseUrl, "/api/finance/invoices", {
    ...commonBody(`upl-b11-invoice-${branch.suffix}`),
    invoice: {
      invoice_id: invoiceId,
      tenant_id: TENANT,
      matter_id: matterId,
      prebill_id: prebillId,
      billing_client_party_id: `party_upl_b11_${branch.suffix}`,
      currency: "KRW",
      issued_at: "2026-07-03T00:00:00.000Z",
    },
  });

  const wipItem = wip.body.items?.[0] ?? {};
  const invoiceLine = invoice.body.invoice_lines?.[0] ?? {};
  return Object.freeze({
    id: branch.suffix,
    expected: branch.expected,
    route_statuses: {
      arrangement: arrangement.status,
      time_entry: timeEntry.status,
      approved_time: approvedTime.status,
      wip: wip.status,
      snapshot: snapshot.status,
      prebill: prebill.status,
      approved_prebill: approvedPrebill.status,
      invoice: invoice.status,
    },
    observed: {
      arrangement: arrangement.body.item,
      wip_item: wipItem,
      snapshot: snapshot.body.item,
      prebill: prebill.body.item,
      invoice: invoice.body.item,
      invoice_line: invoiceLine,
    },
    passed:
      arrangement.status === 201 &&
      timeEntry.status === 201 &&
      approvedTime.status === 200 &&
      wip.status === 201 &&
      snapshot.status === 201 &&
      prebill.status === 201 &&
      approvedPrebill.status === 200 &&
      invoice.status === 201 &&
      wipItem.fee_arrangement_type === branch.expected.type &&
      wipItem.billing_calculation_source === branch.expected.billing_calculation_source &&
      wipItem.amount === branch.expected.amount_due &&
      wipItem.standard_amount === branch.expected.standard_amount &&
      wipItem.retainer_drawdown_amount === branch.expected.retainer_drawdown_amount &&
      wipItem.success_fee_applied === branch.expected.success_fee_applied &&
      invoice.body.item?.amount_due === branch.expected.amount_due &&
      invoice.body.item?.standard_amount === branch.expected.standard_amount &&
      invoice.body.item?.retainer_drawdown_total === branch.expected.retainer_drawdown_amount &&
      invoice.body.item?.success_fee_applied === branch.expected.success_fee_applied &&
      invoiceLine.amount === branch.expected.amount_due &&
      invoiceLine.retainer_drawdown_amount === branch.expected.retainer_drawdown_amount &&
      invoiceLine.success_fee_applied === branch.expected.success_fee_applied,
  });
}

const financeRepository = createFinanceRepository({
  seedRecords: [
    {
      model_type: "RateCard",
      rate_card_id: RATE_CARD_ID,
      tenant_id: TENANT,
      currency: "KRW",
      effective_from: "2026-07-01",
      role_rates: [{ role_id: "partner", hourly_rate: 120000 }],
      status: "active",
    },
  ],
});

const branches = [
  {
    suffix: "hourly",
    fee_arrangement: { type: "hourly" },
    expected: {
      type: "hourly",
      billing_calculation_source: "fee_arrangement.hourly",
      amount_due: 120000,
      standard_amount: 120000,
      retainer_drawdown_amount: 0,
      success_fee_applied: false,
    },
  },
  {
    suffix: "fixed",
    fee_arrangement: { type: "fixed", fixed_fee_amount: 275000 },
    expected: {
      type: "fixed",
      billing_calculation_source: "fee_arrangement.fixed",
      amount_due: 275000,
      standard_amount: 120000,
      retainer_drawdown_amount: 0,
      success_fee_applied: false,
    },
  },
  {
    suffix: "success_met",
    fee_arrangement: { type: "success_fee", upfront_fee_amount: 50000, success_fee_amount: 200000, success_condition_met: true },
    expected: {
      type: "success_fee",
      billing_calculation_source: "fee_arrangement.success_fee",
      amount_due: 250000,
      standard_amount: 120000,
      retainer_drawdown_amount: 0,
      success_fee_applied: true,
    },
  },
  {
    suffix: "success_unmet",
    fee_arrangement: { type: "success_fee", upfront_fee_amount: 50000, success_fee_amount: 200000, success_condition_met: false },
    expected: {
      type: "success_fee",
      billing_calculation_source: "fee_arrangement.success_fee",
      amount_due: 50000,
      standard_amount: 120000,
      retainer_drawdown_amount: 0,
      success_fee_applied: false,
    },
  },
  {
    suffix: "retainer",
    fee_arrangement: { type: "retainer", retainer_amount: 80000 },
    expected: {
      type: "retainer",
      billing_calculation_source: "fee_arrangement.retainer_drawdown",
      amount_due: 40000,
      standard_amount: 120000,
      retainer_drawdown_amount: 80000,
      success_fee_applied: false,
    },
  },
];

const started = await startApiServer({ port: 0, financeRepository });
let report;
try {
  const baseUrl = `http://${started.host}:${started.port}`;
  const branchResults = [];
  for (const branch of branches) branchResults.push(await driveBranch(baseUrl, branch));
  report = {
    schema_version: "law-firm-os.upl-b11.fee-arrangement-types-proof.v0.1",
    generated_at: new Date().toISOString(),
    verdict: branchResults.every((branch) => branch.passed) ? "PASS" : "FAIL",
    api_url: baseUrl,
    contract_ref: "UPL-B-11",
    route_surface: [
      "POST /api/finance/fee-arrangements",
      "POST /api/finance/time-entries",
      "POST /api/finance/time-entries/approve",
      "POST /api/finance/wip",
      "POST /api/finance/wip-snapshots",
      "POST /api/finance/prebills",
      "POST /api/finance/prebills/approve",
      "POST /api/finance/invoices",
    ],
    checks: branchResults.map((branch) => Object.freeze({ id: `fee-arrangement-${branch.id}`, passed: branch.passed })),
    branches: branchResults,
  };
} finally {
  await new Promise((resolve) => started.server.close(resolve));
}

writeFileSync(PROOF_PATH, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ verdict: report.verdict, proof: PROOF_PATH }, null, 2));
if (report.verdict !== "PASS") process.exit(1);
