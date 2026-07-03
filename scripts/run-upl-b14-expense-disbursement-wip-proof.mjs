#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createFinanceRepository } from "../packages/billing/src/finance-repository.js";
import { PERMISSION_CONTEXT_HEADER } from "../apps/api/src/permission-gate.js";
import { startApiServer } from "../apps/api/src/server.js";

const ROOT = process.cwd();
const ARTIFACT_DIR = join(ROOT, "artifacts", "manual-qa");
const PROOF_PATH = join(ARTIFACT_DIR, "upl-b14-expense-disbursement-wip-proof.json");
const TENANT = "tenant_upl_b14_expense_disbursement";
const ACTOR = "user_upl_b14_finance";
const PARTNER = "user_upl_b14_partner";
const MATTER = "matter_upl_b14_wip";
const RATE_CARD_ID = "rate-upl-b14";
const BASE_QUERY = `tenant_id=${TENANT}&permission_ref=upl_b14_finance_read&audit_hint_ref=upl_b14_api_proof`;

mkdirSync(ARTIFACT_DIR, { recursive: true });

function permissionContext(roleIds = ["finance_user"]) {
  return JSON.stringify({
    principal: { user_id: roleIds.includes("partner") ? PARTNER : ACTOR, tenant_id: TENANT, role_ids: roleIds },
    rules: [{ id: `rule_upl_b14_${roleIds.join("_")}`, effect: "allow", action: "*" }],
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

function commonBody(idempotencyKey, actorId = ACTOR) {
  return {
    tenant_id: TENANT,
    permission_ref: "upl_b14_finance_write",
    audit_hint_ref: "upl_b14_api_proof",
    actor_id: actorId,
    idempotency_key: idempotencyKey,
  };
}

function sumAmounts(items) {
  return Number((items ?? []).reduce((total, item) => total + Number(item.amount ?? 0), 0).toFixed(2));
}

function sourceByType(items) {
  return Object.fromEntries((items ?? []).map((item) => [item.source_model_type, item]));
}

const financeRepository = createFinanceRepository({
  seedRecords: [
    {
      model_type: "RateCard",
      rate_card_id: RATE_CARD_ID,
      tenant_id: TENANT,
      currency: "KRW",
      effective_from: "2026-07-01",
      role_rates: [{ role_id: "partner", hourly_rate: 100000 }],
      status: "active",
    },
  ],
});

const started = await startApiServer({ port: 0, financeRepository });
let report;
try {
  const baseUrl = `http://${started.host}:${started.port}`;

  const timeEntry = await postJson(baseUrl, "/api/finance/time-entries", {
    ...commonBody("upl-b14-time"),
    time_entry: {
      time_entry_id: "time_upl_b14",
      tenant_id: TENANT,
      matter_id: MATTER,
      role_id: "partner",
      work_date: "2026-07-03",
      narrative: "UPL-B-14 billable time source",
      duration_minutes: 60,
      billable: true,
    },
  });

  const nonPartnerApproval = await postJson(baseUrl, "/api/finance/time-entries/approve", {
    ...commonBody("upl-b14-time-nonpartner"),
    time_entry_id: "time_upl_b14",
  });

  const approvedTime = await postJson(baseUrl, "/api/finance/time-entries/approve", {
    ...commonBody("upl-b14-time-approve", PARTNER),
    time_entry_id: "time_upl_b14",
  }, ["partner"]);

  const expense = await postJson(baseUrl, "/api/finance/expenses", {
    ...commonBody("upl-b14-expense"),
    expense: {
      expense_id: "expense_upl_b14",
      tenant_id: TENANT,
      matter_id: MATTER,
      receipt_document_id: "receipt_upl_b14",
      amount: 25000,
      currency: "KRW",
      billable: true,
      status: "approved",
    },
  });

  const disbursement = await postJson(baseUrl, "/api/finance/disbursements", {
    ...commonBody("upl-b14-disbursement"),
    disbursement: {
      disbursement_id: "disbursement_upl_b14",
      tenant_id: TENANT,
      matter_id: MATTER,
      vendor_ref: "vendor_upl_b14",
      amount: 15000,
      currency: "KRW",
      billable: true,
    },
  });

  const wip = await postJson(baseUrl, "/api/finance/wip", {
    ...commonBody("upl-b14-wip"),
    matter_id: MATTER,
    rate_card_id: RATE_CARD_ID,
  });

  const wipItems = wip.body.items ?? [];
  const wipSources = sourceByType(wipItems);
  const snapshot = await postJson(baseUrl, "/api/finance/wip-snapshots", {
    ...commonBody("upl-b14-wip-snapshot"),
    matter_id: MATTER,
    wip_snapshot_id: "snapshot_upl_b14",
    wip_item_ids: wipItems.map((item) => item.wip_item_id),
  });

  const audit = await apiJson(baseUrl, `/api/finance/audit?${BASE_QUERY}`);
  const auditActions = new Set((audit.body.items ?? []).map((event) => event.action));
  const auditReasons = new Set((audit.body.items ?? []).map((event) => event.reason).filter(Boolean));
  const sourceTypes = Object.keys(wipSources).sort();

  const checks = [
    {
      id: "time-entry-approval-is-partner-gated",
      passed:
        timeEntry.status === 201 &&
        nonPartnerApproval.status === 403 &&
        nonPartnerApproval.body.count_leak_prevented === true &&
        approvedTime.status === 200 &&
        approvedTime.body.item?.approved_for_wip === true,
    },
    {
      id: "approved-expense-is-wip-eligible",
      passed:
        expense.status === 201 &&
        expense.body.item?.model_type === "Expense" &&
        expense.body.item?.amount === 25000 &&
        expense.body.item?.approved_for_wip === true &&
        expense.body.item?.production_ready_claim === false,
    },
    {
      id: "recoverable-disbursement-is-wip-eligible",
      passed:
        disbursement.status === 201 &&
        disbursement.body.item?.model_type === "Disbursement" &&
        disbursement.body.item?.amount === 15000 &&
        disbursement.body.item?.recoverable === true,
    },
    {
      id: "wip-includes-time-expense-disbursement-sources",
      passed:
        wip.status === 201 &&
        sourceTypes.join(",") === "Disbursement,Expense,TimeEntry" &&
        wipSources.TimeEntry?.amount === 100000 &&
        wipSources.Expense?.amount === 25000 &&
        wipSources.Disbursement?.amount === 15000 &&
        sumAmounts(wipItems) === 140000,
    },
    {
      id: "wip-snapshot-locks-aggregate",
      passed:
        snapshot.status === 201 &&
        snapshot.body.item?.total_amount === 140000 &&
        snapshot.body.item?.immutable_snapshot === true &&
        snapshot.body.item?.item_refs?.length === 3,
    },
    {
      id: "audit-records-source-and-lock-events",
      passed:
        audit.status === 200 &&
        auditActions.has("time.entry.approve_for_wip") &&
        auditActions.has("expense.create") &&
        auditActions.has("disbursement.create") &&
        auditActions.has("wip.generate") &&
        auditActions.has("wip.snapshot.lock") &&
        auditReasons.has("finance_partner_role_required"),
    },
  ];

  report = {
    schema_version: "law-firm-os.upl-b14.expense-disbursement-wip-proof.v0.1",
    generated_at: new Date().toISOString(),
    verdict: checks.every((check) => check.passed) ? "PASS" : "FAIL",
    api_url: baseUrl,
    contract_ref: "UPL-B-14",
    route_surface: [
      "POST /api/finance/time-entries",
      "POST /api/finance/time-entries/approve",
      "POST /api/finance/expenses",
      "POST /api/finance/disbursements",
      "POST /api/finance/wip",
      "POST /api/finance/wip-snapshots",
      "GET /api/finance/audit",
    ],
    checks,
    observed: {
      route_statuses: {
        time_entry: timeEntry.status,
        non_partner_approval: nonPartnerApproval.status,
        approved_time: approvedTime.status,
        expense: expense.status,
        disbursement: disbursement.status,
        wip: wip.status,
        snapshot: snapshot.status,
        audit: audit.status,
      },
      time_entry: approvedTime.body.item,
      expense: expense.body.item,
      disbursement: disbursement.body.item,
      wip: {
        source_types: sourceTypes,
        total_amount: sumAmounts(wipItems),
        items: wipItems,
      },
      snapshot: snapshot.body.item,
      audit: { actions: [...auditActions].sort(), reasons: [...auditReasons].sort() },
      non_partner_approval: {
        status: nonPartnerApproval.status,
        safe_error_codes: nonPartnerApproval.body.safe_error_codes,
        count_leak_prevented: nonPartnerApproval.body.count_leak_prevented,
      },
    },
  };
} finally {
  await new Promise((resolve) => started.server.close(resolve));
}

writeFileSync(PROOF_PATH, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ verdict: report.verdict, proof: PROOF_PATH }, null, 2));
if (report.verdict !== "PASS") process.exit(1);
