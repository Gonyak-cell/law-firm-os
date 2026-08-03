import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { createFinanceRepository } from "../../../packages/billing/src/finance-repository.js";
import {
  createFinanceRuntimeContext,
  handleFinanceApiRequest,
} from "../src/finance-runtime-context.js";

const TENANT = "tenant_rfd_tuw_033";
const ACTOR = "actor_rfd_tuw_033";
const COMMON = Object.freeze({
  tenant_id: TENANT,
  permission_ref: "permission_rfd_tuw_033",
  audit_hint_ref: "audit_rfd_tuw_033",
});
const ALLOW_CONTEXT = Object.freeze({
  principal: { user_id: ACTOR, tenant_id: TENANT, role_ids: ["partner"] },
  rules: [{ id: "allow_rfd_tuw_033", effect: "allow", action: "*" }],
  object_acl: [],
});

function apiRequest(pathname, query = COMMON, context = ALLOW_CONTEXT) {
  return {
    pathname,
    method: "GET",
    query: { ...query },
    context,
    requestId: `request-${pathname.split("/").at(-1)}-rfd033-safety`,
  };
}

test("RFD-TUW-033 trims Trust and AR source rows before aggregation", async () => {
  const repository = createFinanceRepository({
    seedRecords: [
      { model_type: "TrustBalance", trust_balance_id: "trust-rfd033-source-visible", tenant_id: TENANT, matter_id: "matter-rfd033-source-visible", currency: "KRW", available_balance: 100, deposit_total: 100 },
      { model_type: "TrustBalance", trust_balance_id: "trust-rfd033-source-hidden", tenant_id: TENANT, matter_id: "matter-rfd033-source-hidden", currency: "KRW", available_balance: 900, deposit_total: 900 },
      { model_type: "ARBalance", ar_balance_id: "ar-rfd033-source-visible", tenant_id: TENANT, invoice_id: "invoice-rfd033-source-visible", due_date: "2026-08-01", balance: 100 },
      { model_type: "ARBalance", ar_balance_id: "ar-rfd033-source-hidden", tenant_id: TENANT, invoice_id: "invoice-rfd033-source-hidden", due_date: "2026-08-01", balance: 900 },
    ],
  });
  const context = {
    ...ALLOW_CONTEXT,
    object_acl: [
      { id: "trust-source-deny", effect: "deny", principal_id: ACTOR, resource_id: "trust-rfd033-source-hidden", action: "finance:trust_ledger:read" },
      { id: "ar-source-deny", effect: "deny", principal_id: ACTOR, resource_id: "ar-rfd033-source-hidden", action: "finance:ar:read" },
    ],
  };
  const trust = await handleFinanceApiRequest({
    ...apiRequest("/api/finance/trust-balances", { ...COMMON, currency: "KRW" }, context),
    runtime: createFinanceRuntimeContext({ repository }),
  });
  assert.equal(trust.status, 200);
  assert.equal(trust.body.summary.available_balance, 100);
  assert.equal(trust.body.summary.deposit_total, 100);
  assert.doesNotMatch(JSON.stringify(trust.body), /900/u);
  const ar = await handleFinanceApiRequest({
    ...apiRequest("/api/finance/ar-aging", { ...COMMON, as_of_date: "2026-08-01" }, context),
    runtime: createFinanceRuntimeContext({ repository }),
  });
  assert.equal(ar.status, 200);
  assert.equal(ar.body.items[0].bucket_current, 100);
  assert.equal(ar.body.items[0].balance_count, 1);
  assert.doesNotMatch(JSON.stringify(ar.body), /900/u);
});

test("RFD-TUW-033 trims accounting source rows and neutralizes formula cells before hashing", async () => {
  const repository = createFinanceRepository({
    seedRecords: [
      { model_type: "JournalEntry", journal_entry_id: "journal-rfd033-source-visible", tenant_id: TENANT, source_ref: "=1+1", currency: "KRW", posted_at: "2026-07-02T00:00:00.000Z", lines: [{ account: "revenue", debit: 100, credit: 100 }] },
      { model_type: "JournalEntry", journal_entry_id: "journal-rfd033-source-hidden", tenant_id: TENANT, source_ref: "hidden-journal-secret", currency: "KRW", posted_at: "2026-07-03T00:00:00.000Z", lines: [{ account: "revenue", debit: 900, credit: 900 }] },
    ],
  });
  const context = {
    ...ALLOW_CONTEXT,
    object_acl: [{ id: "journal-source-deny", effect: "deny", principal_id: ACTOR, resource_id: "journal-rfd033-source-hidden", action: "finance:accounting_export:read" }],
  };
  const response = await handleFinanceApiRequest({
    ...apiRequest("/api/finance/accounting-export.csv", { ...COMMON, from_date: "2026-07-01", to_date: "2026-07-31", idempotency_key: "export-source-rfd033" }, context),
    runtime: createFinanceRuntimeContext({ repository }),
  });
  assert.equal(response.status, 201);
  assert.match(response.body.item.csv_text, /'=1\+1/u);
  assert.doesNotMatch(response.body.item.csv_text, /journal-rfd033-source-hidden|hidden-journal-secret|900/u);
  assert.equal(response.body.item.row_count, 1);
  assert.equal(response.body.item.debit_total, 100);
  assert.equal(response.body.item.credit_total, 100);
  assert.equal(response.body.item.csv_sha256, createHash("sha256").update(response.body.item.csv_text).digest("hex"));
  const readAudit = repository.listAudit({ tenant_id: TENANT }).find((event) => event.action === "finance:accounting_export:read");
  assert.equal(readAudit.metadata.returned_count, 1);
  assert.equal(readAudit.metadata.visible_journal_entry_count, 1);
});

test("RFD-TUW-033 recursively removes audit payload and credential material", async () => {
  const repository = createFinanceRepository();
  repository.appendAudit({
    event_id: "audit-rfd033-recursive-secrets",
    tenant_id: TENANT,
    actor_id: ACTOR,
    action: "secret.test",
    object_type: "finance_audit",
    object_id: "audit-rfd033-recursive-secrets",
    raw_journal_payload: "TOP_SECRET_RAW",
    journal_lines: ["TOP_SECRET_LINE"],
    metadata: {
      nested: {
        credential_material: "NESTED_SECRET",
        password: "NESTED_PASSWORD",
        token: "NESTED_TOKEN",
        secret: "NESTED_SECRET_VALUE",
        raw_payload: { value: "NESTED_RAW" },
        safe_count: 2,
      },
      raw_payload_included: true,
    },
  });
  const response = await handleFinanceApiRequest({
    ...apiRequest("/api/finance/audit", COMMON, ALLOW_CONTEXT),
    runtime: createFinanceRuntimeContext({ repository }),
  });
  assert.equal(response.status, 200);
  const serialized = JSON.stringify(response.body);
  for (const secret of ["TOP_SECRET_RAW", "TOP_SECRET_LINE", "NESTED_SECRET", "NESTED_PASSWORD", "NESTED_TOKEN", "NESTED_RAW"]) {
    assert.doesNotMatch(serialized, new RegExp(secret, "u"));
  }
  assert.equal(response.body.items[0].metadata.raw_payload_included, false);
  assert.equal(response.body.items[0].metadata.nested.safe_count, 2);
});

test("RFD-TUW-033 export replay cannot disclose entries hidden by a later resource ACL", async () => {
  const repository = createFinanceRepository({
    seedRecords: [
      { model_type: "JournalEntry", journal_entry_id: "journal-rfd033-replay-visible", tenant_id: TENANT, source_ref: "visible", currency: "KRW", posted_at: "2026-07-02T00:00:00.000Z", lines: [{ account: "revenue", debit: 10, credit: 10 }] },
      { model_type: "JournalEntry", journal_entry_id: "journal-rfd033-replay-hidden", tenant_id: TENANT, source_ref: "hidden", currency: "KRW", posted_at: "2026-07-03T00:00:00.000Z", lines: [{ account: "revenue", debit: 90, credit: 90 }] },
    ],
  });
  const query = { ...COMMON, from_date: "2026-07-01", to_date: "2026-07-31", idempotency_key: "export-replay-rfd033" };
  const first = await handleFinanceApiRequest({
    ...apiRequest("/api/finance/accounting-export.csv", query, ALLOW_CONTEXT),
    runtime: createFinanceRuntimeContext({ repository }),
  });
  assert.equal(first.status, 201);
  const beforeRestrictedReplay = repository.snapshot();
  const restrictedContext = {
    ...ALLOW_CONTEXT,
    object_acl: [{ id: "replay-hidden", effect: "deny", principal_id: ACTOR, resource_id: "journal-rfd033-replay-hidden", action: "finance:accounting_export:read" }],
  };
  const restricted = await handleFinanceApiRequest({
    ...apiRequest("/api/finance/accounting-export.csv", query, restrictedContext),
    runtime: createFinanceRuntimeContext({ repository }),
  });
  assert.equal(restricted.status, 403);
  assert.deepEqual(restricted.body.items, []);
  assert.deepEqual(repository.snapshot().records, beforeRestrictedReplay.records);
  assert.deepEqual(repository.snapshot().idempotency, beforeRestrictedReplay.idempotency);
  assert.doesNotMatch(JSON.stringify(restricted.body), /journal-rfd033-replay-hidden|hidden/u);
});
