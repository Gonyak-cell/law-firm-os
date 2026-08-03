import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { createFinanceRepository } from "../../../packages/billing/src/finance-repository.js";
import {
  FINANCE_API_ERROR_CODES,
  createFinanceRuntimeContext,
  handleFinanceApiRequest,
} from "../src/finance-runtime-context.js";
import { runFinanceAuditRead } from "../src/finance-read-export-boundary.js";

const TENANT = "tenant_rfd_tuw_033";
const OTHER_TENANT = "tenant_rfd_tuw_033_other";
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
const DENY_CONTEXT = Object.freeze({
  principal: { user_id: "denied_rfd_tuw_033", tenant_id: TENANT, role_ids: ["staff"] },
  rules: [],
  object_acl: [],
});

function apiRequest(pathname, query = COMMON, context = ALLOW_CONTEXT) {
  return {
    pathname,
    method: "GET",
    query: { ...query },
    context,
    requestId: `request-${pathname.split("/").at(-1)}-rfd033-adversarial`,
  };
}

function exportRepository() {
  return createFinanceRepository({
    seedRecords: [
      {
        model_type: "JournalEntry",
        journal_entry_id: "journal-rfd033-1",
        tenant_id: TENANT,
        matter_id: "matter-rfd033",
        source_ref: "source,one",
        currency: "KRW",
        posted_at: "2026-07-02T00:00:00.000Z",
        lines: [{ account: "ar", debit: 100.1, credit: 0 }, { account: "revenue", debit: 0, credit: 100.1 }],
      },
      {
        model_type: "JournalEntry",
        journal_entry_id: "journal-rfd033-2",
        tenant_id: TENANT,
        matter_id: "matter-rfd033",
        source_ref: "source\ntwo",
        currency: "KRW",
        posted_at: "2026-07-03T00:00:00.000Z",
        lines: [{ account: "ar,quoted\"account", debit: 200, credit: 0 }, { account: "revenue", debit: 0, credit: 200 }],
      },
      {
        model_type: "JournalEntry",
        journal_entry_id: "journal-rfd033-outside-window",
        tenant_id: TENANT,
        matter_id: "matter-rfd033",
        source_ref: "outside",
        currency: "KRW",
        posted_at: "2026-06-30T00:00:00.000Z",
        lines: [{ account: "ar", debit: 999, credit: 0 }, { account: "revenue", debit: 0, credit: 999 }],
      },
    ],
  });
}

test("RFD-TUW-033 audit read sanitizes sensitive metadata and supports per-event permission trim", () => {
  const repository = createFinanceRepository();
  repository.appendAudit({
    event_id: "audit-rfd033-visible",
    tenant_id: TENANT,
    actor_id: ACTOR,
    action: "visible",
    object_type: "finance_audit",
    object_id: "audit-rfd033-visible",
    metadata: { safe: true, raw_payload: "secret", raw_payload_included: true },
  });
  repository.appendAudit({
    event_id: "audit-rfd033-hidden",
    tenant_id: TENANT,
    actor_id: ACTOR,
    action: "hidden",
    object_type: "finance_audit",
    object_id: "audit-rfd033-hidden",
    metadata: { credential_material: "secret", credential_material_included: true },
  });
  const direct = runFinanceAuditRead({ repository, tenant_id: TENANT });
  assert.equal(direct.items.length, 2);
  assert.equal(direct.items[0].metadata.raw_payload, undefined);
  assert.equal(direct.items[0].metadata.raw_payload_included, false);
  assert.equal(direct.items[1].metadata.credential_material, undefined);
  assert.equal(direct.items[1].metadata.credential_material_included, false);

  const context = {
    principal: { user_id: ACTOR, tenant_id: TENANT, role_ids: ["partner"] },
    rules: [{ id: "allow-audit", effect: "allow", action: "finance:audit:read" }],
    object_acl: [{ id: "deny-hidden", effect: "deny", principal_id: ACTOR, resource_id: "audit-rfd033-hidden", action: "finance:audit:read" }],
  };
  const response = handleFinanceApiRequest({
    ...apiRequest("/api/finance/audit", COMMON, context),
    runtime: createFinanceRuntimeContext({ repository }),
  });
  return Promise.resolve(response).then((result) => {
    assert.equal(result.status, 200);
    assert.deepEqual(result.body.items.map((item) => item.action), ["visible"]);
    assert.equal(result.body.count_leak_prevented, true);
  });
});

test("RFD-TUW-033 denied and cross-tenant read/export routes fail closed without product/count leaks", async () => {
  for (const pathname of [
    "/api/finance/trust-balances",
    "/api/finance/ar-aging",
    "/api/finance/accounting-export.csv",
    "/api/finance/audit",
  ]) {
    const repository = exportRepository();
    const before = repository.snapshot();
    const denied = await handleFinanceApiRequest({
      ...apiRequest(pathname, COMMON, DENY_CONTEXT),
      runtime: createFinanceRuntimeContext({ repository }),
    });
    assert.equal(denied.status, 403, pathname);
    assert.deepEqual(denied.body.items, [], pathname);
    assert.deepEqual(denied.body.safe_error_codes, [FINANCE_API_ERROR_CODES.unauthorized_omission], pathname);
    assert.equal(denied.body.count_leak_prevented, true, pathname);
    assert.equal(repository.snapshot().records.length, before.records.length, `${pathname} denial wrote records`);
    assert.equal(repository.snapshot().idempotency.length, before.idempotency.length, `${pathname} denial wrote idempotency`);
    assert.equal(repository.listAudit({ tenant_id: TENANT }).length, 1, `${pathname} denial audit`);

    const crossTenant = await handleFinanceApiRequest({
      ...apiRequest(pathname, { ...COMMON, tenant_id: OTHER_TENANT }, ALLOW_CONTEXT),
      runtime: createFinanceRuntimeContext({ repository }),
    });
    assert.equal(crossTenant.status, 403, `${pathname} cross tenant`);
    assert.deepEqual(crossTenant.body.items, [], `${pathname} cross tenant items`);
    assert.equal(crossTenant.body.count_leak_prevented, true, `${pathname} cross tenant count leak`);
    assert.equal(repository.list({ tenant_id: OTHER_TENANT }).length, 0, `${pathname} cross tenant records`);
  }
});

test("RFD-TUW-033 route ACL characterization keeps global deny at route level but trims resource ACL rows", async () => {
  const repository = createFinanceRepository({
    seedRecords: [
      { model_type: "TrustBalance", trust_balance_id: "trust-rfd033-visible", tenant_id: TENANT, matter_id: "matter-rfd033-visible", currency: "KRW", available_balance: 100 },
      { model_type: "TrustBalance", trust_balance_id: "trust-rfd033-resource-denied", tenant_id: TENANT, matter_id: "matter-rfd033-denied", currency: "KRW", available_balance: 200 },
    ],
  });
  const globalDenyContext = {
    ...ALLOW_CONTEXT,
    object_acl: [{ id: "global-deny", effect: "deny", principal_id: ACTOR, action: "finance:trust_ledger:read" }],
  };
  const beforeGlobalDeny = repository.snapshot();
  const globalDenied = await handleFinanceApiRequest({
    ...apiRequest("/api/finance/trust-balances", COMMON, globalDenyContext),
    runtime: createFinanceRuntimeContext({ repository }),
  });
  assert.equal(globalDenied.status, 403);
  assert.deepEqual(globalDenied.body.items, []);
  assert.equal(globalDenied.body.count_leak_prevented, true);
  assert.equal(repository.snapshot().records.length, beforeGlobalDeny.records.length);
  assert.equal(repository.listAudit({ tenant_id: TENANT }).at(-1).decision, "deny");

  const resourceDenyContext = {
    ...ALLOW_CONTEXT,
    object_acl: [{ id: "resource-deny", effect: "deny", principal_id: ACTOR, resource_id: "trust-rfd033-resource-denied", action: "finance:trust_ledger:read" }],
  };
  const visibleOnly = await handleFinanceApiRequest({
    ...apiRequest("/api/finance/trust-balances", { ...COMMON, currency: "KRW" }, resourceDenyContext),
    runtime: createFinanceRuntimeContext({ repository }),
  });
  assert.equal(visibleOnly.status, 200);
  assert.deepEqual(visibleOnly.body.items.map((item) => item.trust_balance_id), ["trust-rfd033-visible"]);
  assert.equal(visibleOnly.body.summary.available_balance, 100);
  assert.equal(visibleOnly.body.summary.deposit_total, 0);
  const visibleAudit = repository.listAudit({ tenant_id: TENANT }).at(-1);
  assert.equal(visibleAudit.action, "finance:trust_ledger:read");
  assert.equal(visibleAudit.decision, "allow");
  assert.equal(visibleAudit.metadata.returned_count, 1);

  const mismatchedResource = {
    ...ALLOW_CONTEXT,
    object_acl: [{ id: "mismatched-resource-deny", effect: "deny", principal_id: ACTOR, resource_id: "trust-rfd033-other-tenant", action: "finance:trust_ledger:read" }],
  };
  const localRows = await handleFinanceApiRequest({
    ...apiRequest("/api/finance/trust-balances", { ...COMMON, currency: "KRW" }, mismatchedResource),
    runtime: createFinanceRuntimeContext({ repository }),
  });
  assert.equal(localRows.status, 200);
  assert.equal(localRows.body.items.length, 2);
  const crossTenant = await handleFinanceApiRequest({
    ...apiRequest("/api/finance/trust-balances", { ...COMMON, tenant_id: OTHER_TENANT }, mismatchedResource),
    runtime: createFinanceRuntimeContext({ repository }),
  });
  assert.equal(crossTenant.status, 403);
  assert.deepEqual(crossTenant.body.items, []);
  assert.equal(crossTenant.body.count_leak_prevented, true);
});

test("RFD-TUW-033 AR calculation failure rolls back generated state and emits no success read audit", async () => {
  const repository = createFinanceRepository({
    seedRecords: [{ model_type: "ARBalance", ar_balance_id: "ar-invalid-rfd033", tenant_id: TENANT, invoice_id: "invoice-invalid-rfd033", due_date: "not-a-date", balance: 10 }],
  });
  const before = repository.snapshot();
  const response = await handleFinanceApiRequest({
    ...apiRequest("/api/finance/ar-aging", COMMON, ALLOW_CONTEXT),
    runtime: createFinanceRuntimeContext({ repository }),
  });
  assert.equal(response.status, 400);
  assert.deepEqual(response.body.safe_error_codes, [FINANCE_API_ERROR_CODES.validation_error]);
  const after = repository.snapshot();
  assert.deepEqual(after.records, before.records);
  assert.deepEqual(after.idempotency, before.idempotency);
  assert.equal(repository.listAudit({ tenant_id: TENANT }).length, 0);
});

test("RFD-TUW-033 resource ACLs remain fail-closed for payment writes", async () => {
  const repository = createFinanceRepository();
  const context = {
    ...ALLOW_CONTEXT,
    object_acl: [{ id: "payment-write-deny", effect: "deny", principal_id: ACTOR, resource_id: "payment-rfd033-write-denied", action: "finance:payment:write" }],
  };
  const before = repository.snapshot();
  const response = await handleFinanceApiRequest({
    pathname: "/api/finance/payments",
    method: "POST",
    body: {
      tenant_id: TENANT,
      permission_ref: COMMON.permission_ref,
      audit_hint_ref: COMMON.audit_hint_ref,
      idempotency_key: "payment-write-rfd033",
      payment: { payment_id: "payment-rfd033-write-denied", tenant_id: TENANT, bank_reference: "bank-rfd033-write", amount: 50, currency: "KRW" },
    },
    context,
    requestId: "request-payment-write-rfd033",
    runtime: createFinanceRuntimeContext({ repository }),
  });
  assert.equal(response.status, 403);
  const after = repository.snapshot();
  assert.deepEqual(after.records, before.records);
  assert.deepEqual(after.idempotency, before.idempotency);
  assert.equal(repository.listAudit({ tenant_id: TENANT }).at(-1).decision, "deny");
});
