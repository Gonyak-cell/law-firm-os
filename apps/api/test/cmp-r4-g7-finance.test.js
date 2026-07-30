import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createFinanceRepository } from "../../../packages/billing/src/finance-repository.js";
import { renderSimpleTextPdf } from "../../../packages/billing/src/invoice-pdf-service.js";
import { createCrmRuntimeRepository } from "../../../packages/crm/src/runtime-repository.js";
import { createInMemoryHrxRepository } from "../../../packages/hrx/src/repository.js";
import { createMasterDataRepository } from "../../../packages/master-data/src/repository.js";
import { createMatterRepository } from "../../../packages/matter/src/repository.js";
import { listAmicBankClassificationEmployees } from "../src/amic-bank-classification-directory.js";
import {
  createFinanceRuntimeContext,
  handleFinanceApiRequest,
} from "../src/finance-runtime-context.js";
import { findRegisteredAccountByUserId } from "../src/matter-vault-account-registry.js";
import { PERMISSION_CONTEXT_HEADER } from "../src/permission-gate.js";
import { startApiServer } from "../src/server.js";
import { apiSessionHeaders } from "./helpers/session.js";

const TENANT = "tenant_cmp_g7_synthetic";
const BASE_QUERY = `tenant_id=${TENANT}&permission_ref=perm_ref_cmp_g7_read&audit_hint_ref=audit_hint_cmp_g7_read`;
const NON_PARTNER_ACCOUNT = findRegisteredAccountByUserId("user_amic_sypark");
const SUPER_ADMIN_ACCOUNT = findRegisteredAccountByUserId("user_amic_jwsuh");
assert.ok(NON_PARTNER_ACCOUNT, "non-partner registered account fixture must exist");
assert.ok(SUPER_ADMIN_ACCOUNT, "system super-admin registered account fixture must exist");

test("AMIC bank initials extend the canonical HRX member roster", () => {
  const employees = listAmicBankClassificationEmployees();
  const byAlias = new Map(employees.flatMap((employee) => (
    employee.aliases.map((alias) => [alias, employee])
  )));
  assert.equal(byAlias.size, 10);
  assert.equal(employees.reduce((count, employee) => count + employee.aliases.length, 0), 10);
  assert.deepEqual(
    ["BJP", "YHL", "JWS", "SMC", "JHH", "YTK", "WSJ", "SYP", "TRY", "YJL"].filter((alias) => !byAlias.has(alias)),
    [],
  );
  assert.equal(byAlias.get("JWS").employee_id, "emp_amic_jwsuh");
  assert.equal(byAlias.get("JWS").user_id, "user_amic_jwsuh");
  assert.equal(byAlias.get("JWS").display_name, "서지원");
  assert.equal(byAlias.get("JWS").work_email, "jwsuh@amic.kr");
  assert.deepEqual(
    Object.fromEntries(["김양태", "조우상", "박병준", "조성민", "임영훈", "서지원", "박서영", "이예진", "윤태리", "한제희"]
      .map((displayName) => {
        const employee = employees.find((candidate) => candidate.display_name === displayName);
        return [displayName, employee?.payroll_category];
      })),
    {
      김양태: "partner",
      조우상: "partner",
      박병준: "partner",
      조성민: "partner",
      임영훈: "partner",
      서지원: "partner",
      박서영: "staff",
      이예진: "staff",
      윤태리: "staff",
      한제희: "advisor",
    },
  );
});

test("AMIC bank initials and payroll groups resolve from the HRX repository", () => {
  const repository = createInMemoryHrxRepository({
    employees: [{
      tenant_id: TENANT,
      employee_id: "emp_amic_jwsuh",
      display_name: "서지원",
      legal_name: "서지원",
      work_email: "jwsuh@amic.kr",
      status: "active",
      source_ref: "test-postgres-directory",
    }],
    employment_profiles: [{
      tenant_id: TENANT,
      profile_id: "profile-amic-jwsuh",
      employee_id: "emp_amic_jwsuh",
      employment_type: "full_time",
      status: "active",
      title: "대표변호사",
      effective_from: "2025-01-01",
      source_ref: "test-postgres-directory",
    }],
  });
  const [employee] = listAmicBankClassificationEmployees({ repository, tenantId: TENANT });
  assert.equal(employee.employee_id, "emp_amic_jwsuh");
  assert.equal(employee.display_name, "서지원");
  assert.equal(employee.title, "대표변호사");
  assert.deepEqual(employee.aliases, ["JWS"]);
  assert.equal(employee.payroll_category, "partner");
});

function permissionContext(effect = "allow", roleIds = ["finance_user"]) {
  return JSON.stringify({
    principal: { user_id: "user_cmp_g7_finance", tenant_id: TENANT, role_ids: roleIds },
    rules: [{ id: `rule_finance_${effect}`, effect, action: "*" }],
    object_acl: [],
  });
}

async function withServer(callback, options = {}) {
  const started = await startApiServer({ port: 0, ...options });
  try {
    return await callback(`http://${started.host}:${started.port}`);
  } finally {
    await new Promise((resolve) => started.server.close(resolve));
  }
}

const sessionHeaderCache = new Map();

async function signedHeaders(baseUrl, account = null) {
  const cacheKey = `${baseUrl}:${account?.user_id ?? "default"}`;
  if (!sessionHeaderCache.has(cacheKey)) sessionHeaderCache.set(cacheKey, await apiSessionHeaders(baseUrl, account ?? undefined));
  return sessionHeaderCache.get(cacheKey);
}

async function json(baseUrl, path, options = {}) {
  const headers = {
    ...(options.noAuth ? {} : await signedHeaders(baseUrl, options.account)),
    ...(options.headers ?? {}),
  };
  for (const [key, value] of Object.entries(headers)) {
    if (value === undefined) delete headers[key];
  }
  if (options.body && !headers["content-type"]) headers["content-type"] = "application/json";
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers });
  const body = await response.json();
  return { status: response.status, body };
}

test("same-name client options include a stable customer number for manual selection", async () => {
  const response = await handleFinanceApiRequest({
    pathname: "/api/finance/bank-classification-options",
    method: "GET",
    query: {
      tenant_id: TENANT,
      permission_ref: "perm-same-name-client-options",
      audit_hint_ref: "audit-same-name-client-options",
    },
    context: JSON.parse(permissionContext("allow", ["system_super_admin"])),
    requestId: "request-same-name-client-options",
    runtime: createFinanceRuntimeContext({
      clientRecords: [
        { model_type: "ClientGroup", tenant_id: TENANT, client_group_id: "client-hanbit-001", display_name: "한빛", status: "active" },
        { model_type: "ClientGroup", tenant_id: TENANT, client_group_id: "client-hanbit-002", display_name: "한빛", status: "active" },
        { model_type: "ClientGroup", tenant_id: TENANT, client_group_id: "client-saebom", display_name: "새봄", status: "active" },
        { model_type: "ClientGroup", tenant_id: TENANT, client_group_id: "client-closed", display_name: "종료 고객", status: "closed" },
        { model_type: "ClientGroup", tenant_id: "tenant-other", client_group_id: "client-other-tenant", display_name: "다른 사무실", status: "active" },
      ],
    }),
  });
  assert.equal(response.status, 200);
  assert.deepEqual(
    response.body.item.clients.map((item) => [item.client_group_id, item.selection_label]),
    [
      ["client-saebom", "새봄"],
      ["client-hanbit-001", "한빛 · 고객번호 client-hanbit-001"],
      ["client-hanbit-002", "한빛 · 고객번호 client-hanbit-002"],
    ],
  );
});

test("VC-CL-AR-001/002/003 수임료 약정 API는 참조·금액·멱등성을 확인하고 권한 있는 조회만 허용한다", async () => {
  const financeRepository = createFinanceRepository();
  const masterDataRepository = createMasterDataRepository({
    seedRecords: [{
      model_type: "ClientGroup",
      tenant_id: TENANT,
      client_group_id: "client-fee-api",
      display_name: "한빛 로펌 고객",
      member_party_ids: ["party-fee-api"],
      primary_party_id: "party-fee-api",
      status: "active",
      owner_user_id: "user-fee-api",
    }],
  });
  const crmRepository = createCrmRuntimeRepository({
    seedRecords: [
      {
        model_type: "Opportunity",
        opportunity_id: "opportunity-fee-api",
        tenant_id: TENANT,
        party_id: "party-fee-api",
        display_name: "한빛 수임 확정",
        stage: "closed_won",
        status: "active",
        owner_user_id: "user-fee-api",
      },
      {
        model_type: "Opportunity",
        opportunity_id: "opportunity-fee-api-other",
        tenant_id: TENANT,
        party_id: "party-other",
        display_name: "다른 고객 수임 확정",
        stage: "closed_won",
        status: "active",
        owner_user_id: "user-fee-api",
      },
      {
        model_type: "Opportunity",
        opportunity_id: "opportunity-fee-api-zero",
        tenant_id: TENANT,
        party_id: "party-fee-api",
        display_name: "한빛 0원 수임 확정",
        stage: "closed_won",
        status: "active",
        owner_user_id: "user-fee-api",
      },
    ],
  });
  const financeRuntime = createFinanceRuntimeContext({
    repository: financeRepository,
    masterDataRepository,
    crmRepository,
  });
  const payload = {
    tenant_id: TENANT,
    permission_ref: "perm-fee-commitment-api",
    audit_hint_ref: "audit-fee-commitment-api",
    idempotency_key: "fee-commitment-api-create",
    fee_commitment: {
      fee_commitment_id: "fee-commitment-api",
      tenant_id: TENANT,
      client_group_id: "client-fee-api",
      opportunity_id: "opportunity-fee-api",
      matter_id: null,
      currency: "KRW",
      agreed_amount: null,
      due_date: null,
      accepted_at: "2026-07-30T17:00:00+09:00",
      source_fee_arrangement_id: null,
      reason: "수임 확정, 금액은 추후 입력",
      created_by: "spoofed-client-actor",
      updated_by: "spoofed-client-actor",
    },
  };
  try {
    await withServer(async (baseUrl) => {
      const created = await json(baseUrl, "/api/finance/fee-commitments", {
        method: "POST",
        account: SUPER_ADMIN_ACCOUNT,
        body: JSON.stringify(payload),
      });
      assert.equal(created.status, 201, JSON.stringify(created.body));
      assert.equal(created.body.item.agreed_amount, null);
      assert.equal(created.body.item.created_by, SUPER_ADMIN_ACCOUNT.user_id);
      assert.equal(created.body.idempotent_replay, false);

      const replay = await json(baseUrl, "/api/finance/fee-commitments", {
        method: "POST",
        account: SUPER_ADMIN_ACCOUNT,
        body: JSON.stringify(payload),
      });
      assert.equal(replay.status, 200);
      assert.equal(replay.body.idempotent_replay, true);

      const conflict = await json(baseUrl, "/api/finance/fee-commitments", {
        method: "POST",
        account: SUPER_ADMIN_ACCOUNT,
        body: JSON.stringify({
          ...payload,
          fee_commitment: { ...payload.fee_commitment, agreed_amount: 0 },
        }),
      });
      assert.equal(conflict.status, 409);
      assert.deepEqual(conflict.body.safe_error_codes, ["FINANCE_IDEMPOTENCY_CONFLICT"]);

      const invalidReference = await json(baseUrl, "/api/finance/fee-commitments", {
        method: "POST",
        account: SUPER_ADMIN_ACCOUNT,
        body: JSON.stringify({
          ...payload,
          idempotency_key: "fee-commitment-api-invalid-reference",
          fee_commitment: {
            ...payload.fee_commitment,
            fee_commitment_id: "fee-commitment-api-invalid-reference",
            opportunity_id: "opportunity-fee-api-other",
          },
        }),
      });
      assert.equal(invalidReference.status, 409);
      assert.deepEqual(
        invalidReference.body.safe_error_codes,
        ["FINANCE_FEE_COMMITMENT_REFERENCE_INVALID"],
      );

      const zeroAmount = await json(baseUrl, "/api/finance/fee-commitments", {
        method: "POST",
        account: SUPER_ADMIN_ACCOUNT,
        body: JSON.stringify({
          ...payload,
          idempotency_key: "fee-commitment-api-zero",
          fee_commitment: {
            ...payload.fee_commitment,
            fee_commitment_id: "fee-commitment-api-zero",
            opportunity_id: "opportunity-fee-api-zero",
            agreed_amount: 0,
            reason: "0원 약정 확인",
          },
        }),
      });
      assert.equal(zeroAmount.status, 201);
      assert.equal(zeroAmount.body.item.agreed_amount, 0);

      const invalidCurrency = await json(baseUrl, "/api/finance/fee-commitments", {
        method: "POST",
        account: SUPER_ADMIN_ACCOUNT,
        body: JSON.stringify({
          ...payload,
          idempotency_key: "fee-commitment-api-usd",
          fee_commitment: {
            ...payload.fee_commitment,
            fee_commitment_id: "fee-commitment-api-usd",
            currency: "USD",
          },
        }),
      });
      assert.equal(invalidCurrency.status, 400);
      assert.deepEqual(
        invalidCurrency.body.safe_error_codes,
        ["FINANCE_API_VALIDATION_ERROR"],
      );

      const query = `${BASE_QUERY}&client_group_id=client-fee-api&opportunity_id=opportunity-fee-api&status=active`;
      const listed = await json(baseUrl, `/api/finance/fee-commitments?${query}`, {
        account: SUPER_ADMIN_ACCOUNT,
      });
      assert.equal(listed.status, 200);
      assert.equal(listed.body.items.length, 1);
      assert.equal(listed.body.items[0].fee_commitment_id, "fee-commitment-api");
      assert.equal(listed.body.items[0].agreed_amount, null);

      const denied = await json(baseUrl, `/api/finance/fee-commitments?${query}`, {
        account: NON_PARTNER_ACCOUNT,
      });
      assert.equal(denied.status, 403);
      assert.deepEqual(denied.body.items, []);
      assert.equal(denied.body.count_leak_prevented, true);
    }, { financeRuntime });
    assert.equal(
      financeRepository.list({ tenant_id: TENANT, model_type: "FeeCommitment" }).length,
      2,
    );
  } finally {
    financeRepository.close();
    masterDataRepository.close();
    crmRepository.close();
  }
});

test("client refund review derives the original client and rejects an excessive refund", async () => {
  const bankTransaction = (id, direction, amount, counterparty) => ({
    model_type: "BankTransaction",
    bank_transaction_id: id,
    tenant_id: TENANT,
    account_ref: "account-refund-api",
    transaction_fingerprint: id.padEnd(64, "0").slice(0, 64),
    date: "2026-07-30",
    occurred_at: "2026-07-30T09:00:00+09:00",
    direction,
    amount,
    balance_after: amount,
    currency: "KRW",
    counterparty,
    source_category: direction === "outflow" ? "고객 환불" : "입금",
    classification_scope: "unreviewed",
  });
  const original = bankTransaction("bank-refund-api-origin", "inflow", 3_000_000, "새봄테크");
  const refund = bankTransaction("bank-refund-api-first", "outflow", 1_000_000, "새봄테크 환불");
  const excessive = bankTransaction("bank-refund-api-excess", "outflow", 2_100_000, "새봄테크 환불");
  const financeRepository = createFinanceRepository({ seedRecords: [original, refund, excessive] });
  const runtime = createFinanceRuntimeContext({
    repository: financeRepository,
    clientRecords: [{
      model_type: "ClientGroup",
      tenant_id: TENANT,
      client_group_id: "client-saebom-refund-api",
      display_name: "새봄테크",
      status: "active",
    }],
  });
  const context = JSON.parse(permissionContext("allow", ["system_super_admin"]));
  const automatic = await handleFinanceApiRequest({
    pathname: "/api/finance/bank-classifications/auto",
    method: "POST",
    body: {
      tenant_id: TENANT,
      permission_ref: "perm-refund-api",
      audit_hint_ref: "audit-refund-api",
      idempotency_key: "classify-refund-api",
    },
    query: {},
    context,
    requestId: "request-classify-refund-api",
    runtime,
  });
  assert.equal(automatic.status, 200);

  const linked = await handleFinanceApiRequest({
    pathname: "/api/finance/bank-classifications/review",
    method: "POST",
    body: {
      tenant_id: TENANT,
      permission_ref: "perm-refund-api",
      audit_hint_ref: "audit-refund-api",
      idempotency_key: "link-refund-api",
      decisions: [{
        bank_transaction_id: refund.bank_transaction_id,
        category: "refund_reversal",
        refund_of_bank_transaction_id: original.bank_transaction_id,
      }],
    },
    query: {},
    context,
    requestId: "request-link-refund-api",
    runtime,
  });
  assert.equal(linked.status, 200);
  const linkedRecord = financeRepository.list({
    tenant_id: TENANT,
    model_type: "BankTransactionClassification",
    bank_transaction_id: refund.bank_transaction_id,
  })[0];
  assert.equal(linkedRecord.client_group_id, "client-saebom-refund-api");
  assert.equal(linkedRecord.refund_of_bank_transaction_id, original.bank_transaction_id);

  const rejected = await handleFinanceApiRequest({
    pathname: "/api/finance/bank-classifications/review",
    method: "POST",
    body: {
      tenant_id: TENANT,
      permission_ref: "perm-refund-api",
      audit_hint_ref: "audit-refund-api",
      idempotency_key: "reject-refund-api",
      decisions: [{
        bank_transaction_id: excessive.bank_transaction_id,
        category: "refund_reversal",
        refund_of_bank_transaction_id: original.bank_transaction_id,
      }],
    },
    query: {},
    context,
    requestId: "request-reject-refund-api",
    runtime,
  });
  assert.equal(rejected.status, 409);
  assert.deepEqual(rejected.body.safe_error_codes, ["FINANCE_REFUND_AMOUNT_EXCEEDED"]);
  financeRepository.close();
});

test("G7 Finance API health descriptor exposes runtime write-ready without production claim", async () => {
  await withServer(async (baseUrl) => {
    const { status, body } = await json(baseUrl, "/api/health");
    const finance = body.bounded_contexts.find((item) => item.bounded_context === "finance");
    assert.equal(status, 200);
    assert.equal(finance.runtime_write_ready, true);
    assert.equal(finance.r5_r6_owner_decision_ready, true);
    assert.equal(finance.production_ready_claim, false);
  });
});

test("G7 Finance list routes are permission gated and hide finance secrets", async () => {
  await withServer(async (baseUrl) => {
    const time = await json(baseUrl, `/api/finance/time-entries?${BASE_QUERY}`);
    assert.equal(time.status, 200);
    assert.equal(time.body.items.length, 1);
    assert.equal(time.body.production_ready_claim, false);

    const invoices = await json(baseUrl, `/api/finance/invoices?${BASE_QUERY}`);
    assert.equal(invoices.status, 200);
    assert.equal(invoices.body.items[0].credential_material_included, false);

    const denied = await json(baseUrl, `/api/finance/invoices?${BASE_QUERY}`, {
      noAuth: true,
      headers: { [PERMISSION_CONTEXT_HEADER]: permissionContext() },
    });
    assert.equal(denied.status, 401);
    assert.ok(denied.body.safe_error_codes.includes("AUTH_SESSION_REQUIRED"));
  });
});

test("WP-FIN-5 signed staff sessions cannot read finance data and denial is audited", async () => {
  const financeRepository = createFinanceRepository({
    seedRecords: [{ model_type: "Invoice", invoice_id: "invoice-wp-fin-5", tenant_id: TENANT, matter_id: "matter-wp-fin-5", amount_due: 100, currency: "KRW", status: "issued" }],
  });
  await withServer(async (baseUrl) => {
    const denied = await json(baseUrl, `/api/finance/invoices?${BASE_QUERY}`, { account: NON_PARTNER_ACCOUNT });
    assert.equal(denied.status, 403);
    assert.deepEqual(denied.body.items, []);
    assert.equal(denied.body.count_leak_prevented, true);
    const audit = financeRepository.listAudit({ tenant_id: TENANT });
    assert.equal(audit.at(-1).decision, "deny");
    assert.equal(audit.at(-1).reason, "finance_scope_required:finance.billing.write");
    assert.equal(audit.at(-1).metadata.raw_payload_included, false);
  }, { financeRepository });
});

test("WP-FIN-2 exposes sanitized Payment and PaymentMatch read routes", async () => {
  const financeRepository = createFinanceRepository({
    seedRecords: [
      { model_type: "Payment", payment_id: "payment-wp-fin-2", tenant_id: TENANT, matter_id: "matter-wp-fin-2", amount: 500, currency: "KRW", received_at: "2026-07-01", bank_reference: "secret-bank-ref", status: "received" },
      { model_type: "PaymentMatch", payment_match_id: "match-wp-fin-2", tenant_id: TENANT, payment_id: "payment-wp-fin-2", invoice_id: "invoice-wp-fin-2", matched_amount: 300, currency: "KRW", matched_at: "2026-07-02", status: "matched" },
    ],
  });
  await withServer(async (baseUrl) => {
    const payments = await json(baseUrl, `/api/finance/payments?${BASE_QUERY}`);
    const matches = await json(baseUrl, `/api/finance/payment-matches?${BASE_QUERY}`);
    assert.equal(payments.status, 200);
    assert.equal(matches.status, 200);
    assert.equal(payments.body.items[0].amount, 500);
    assert.equal(payments.body.items[0].bank_reference, undefined);
    assert.equal(payments.body.items[0].bank_reference_included, false);
    assert.equal(matches.body.items[0].matched_amount, 300);
    assert.equal(matches.body.items[0].credential_material_included, false);
  }, { financeRepository });
});

test("AMIC super-admin imports and reads sanitized BankTransaction rows while staff remains fail-closed", async () => {
  const financeRepository = createFinanceRepository();
  await withServer(async (baseUrl) => {
    const statement = renderSimpleTextPdf([
      "2026/07/28",
      "outflow 280,000 29,153,222  bank transfer  Synthetic counterparty",
      "14:50:03",
    ]);
    const file = {
      filename: "bank-statement.pdf",
      mime_type: "application/pdf",
      byte_size: statement.byteLength,
      content_base64: statement.toString("base64"),
    };
    const preview = await json(baseUrl, "/api/finance/bank-imports/preview", {
      method: "POST",
      account: SUPER_ADMIN_ACCOUNT,
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm-bank-preview-api",
        audit_hint_ref: "audit-bank-preview-api",
        account_ref: "account-bank-api",
        file,
      }),
    });
    assert.equal(preview.status, 200, JSON.stringify(preview.body));
    const payload = {
      tenant_id: TENANT,
      permission_ref: "perm-bank-import-api",
      audit_hint_ref: "audit-bank-import-api",
      idempotency_key: "bank-import-api-001",
      account_ref: "account-bank-api",
      production_import_approved: true,
      preview_confirmation_token: preview.body.preview.preview_confirmation_token,
      file,
    };
    const approvalRequired = await json(baseUrl, "/api/finance/bank-imports", {
      method: "POST",
      account: SUPER_ADMIN_ACCOUNT,
      body: JSON.stringify({
        ...payload,
        idempotency_key: "bank-import-without-production-approval",
        production_import_approved: false,
      }),
    });
    assert.equal(approvalRequired.status, 403);
    assert.deepEqual(approvalRequired.body.safe_error_codes, ["FINANCE_APPROVAL_REQUIRED"]);

    const imported = await json(baseUrl, "/api/finance/bank-imports", {
      method: "POST",
      account: SUPER_ADMIN_ACCOUNT,
      body: JSON.stringify(payload),
    });
    assert.equal(imported.status, 201);
    assert.equal(imported.body.transaction_count, 1);
    assert.equal(imported.body.item.source_manifest_hash, undefined);
    assert.equal(imported.body.raw_source_payload_included, false);

    const rows = await json(baseUrl, `/api/finance/bank-transactions?${BASE_QUERY}`, { account: SUPER_ADMIN_ACCOUNT });
    assert.equal(rows.status, 200);
    assert.equal(rows.body.items.length, 1);
    assert.equal(rows.body.items[0].direction, "outflow");
    assert.equal(rows.body.items[0].amount, 280000);
    assert.equal(rows.body.items[0].source_refs, undefined);
    assert.equal(rows.body.items[0].transaction_fingerprint, undefined);
    assert.equal(rows.body.count_leak_prevented, true);

    const invalidDirection = await json(baseUrl, `/api/finance/bank-transactions?${BASE_QUERY}&direction=sideways`, { account: SUPER_ADMIN_ACCOUNT });
    assert.equal(invalidDirection.status, 400);
    assert.deepEqual(invalidDirection.body.safe_error_codes, ["FINANCE_API_VALIDATION_ERROR"]);

    const deniedRead = await json(baseUrl, `/api/finance/bank-transactions?${BASE_QUERY}`, { account: NON_PARTNER_ACCOUNT });
    const deniedImport = await json(baseUrl, "/api/finance/bank-imports", {
      method: "POST",
      account: NON_PARTNER_ACCOUNT,
      body: JSON.stringify({ ...payload, idempotency_key: "staff-denied-bank-import" }),
    });
    assert.equal(deniedRead.status, 403);
    assert.deepEqual(deniedRead.body.items, []);
    assert.equal(deniedRead.body.count_leak_prevented, true);
    assert.equal(deniedImport.status, 403);
    assert.deepEqual(deniedImport.body.items, []);
  }, { financeRepository });
});

test("AMIC super-admin classifies a saved client short name and payroll initials while staff remains fail-closed", async () => {
  const financeRepository = createFinanceRepository({
    seedRecords: [
      {
        model_type: "BankTransaction",
        bank_transaction_id: "bank-classification-client-api",
        tenant_id: TENANT,
        account_ref: "account-bank-api",
        transaction_fingerprint: "d".repeat(64),
        date: "2026-07-28",
        occurred_at: "2026-07-28T09:00:00+09:00",
        direction: "inflow",
        amount: 2100000,
        balance_after: 2100000,
        currency: "KRW",
        counterparty: "(주)베스트이노",
        classification_scope: "unreviewed",
      },
      {
        model_type: "BankTransaction",
        bank_transaction_id: "bank-classification-payroll-api",
        tenant_id: TENANT,
        account_ref: "account-bank-api",
        transaction_fingerprint: "e".repeat(64),
        date: "2026-07-28",
        occurred_at: "2026-07-28T10:00:00+09:00",
        direction: "outflow",
        amount: 1000000,
        balance_after: 1100000,
        currency: "KRW",
        counterparty: "7월 급여 JWS",
        classification_scope: "unreviewed",
      },
    ],
  });
  const matterRepository = createMatterRepository({
    seedRecords: [{
      model_type: "MatterClient",
      tenant_id: TENANT,
      client_id: "client-best-api",
      client_display_name: "베스트이노베이션",
      client_short_name: "베스트이노",
      status: "active",
      created_by: "user_cmp_g7_finance",
      created_at: "2026-07-28T00:00:00.000Z",
    }],
  });
  await withServer(async (baseUrl) => {
    const classified = await json(baseUrl, "/api/finance/bank-classifications/auto", {
      method: "POST",
      account: SUPER_ADMIN_ACCOUNT,
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm-bank-classification-api",
        audit_hint_ref: "audit-bank-classification-api",
        idempotency_key: "bank-classification-api-001",
      }),
    });
    assert.equal(classified.status, 200);
    assert.equal(classified.body.item.summary.confirmed_count, 2);

    const rows = await json(baseUrl, `/api/finance/bank-classifications?${BASE_QUERY}`, {
      account: SUPER_ADMIN_ACCOUNT,
    });
    assert.equal(rows.status, 200);
    assert.equal(rows.body.items.length, 2);
    const byId = new Map(rows.body.items.map((row) => [row.bank_transaction_id, row]));
    assert.equal(byId.get("bank-classification-client-api").client_group_id, "client-best-api");
    assert.equal(byId.get("bank-classification-client-api").primary_type, "sales");
    assert.equal(byId.get("bank-classification-payroll-api").employee_id, "emp_amic_jwsuh");
    assert.equal(byId.get("bank-classification-payroll-api").payroll_category, "partner");
    assert.equal(byId.get("bank-classification-payroll-api").source_refs, undefined);
    assert.equal(byId.get("bank-classification-payroll-api").transaction_fingerprint, undefined);

    const options = await json(baseUrl, `/api/finance/bank-classification-options?${BASE_QUERY}`, {
      account: SUPER_ADMIN_ACCOUNT,
    });
    assert.equal(options.status, 200);
    assert.equal(options.body.item.clients[0].client_group_id, "client-best-api");
    assert.ok(options.body.item.employees
      .find((employee) => employee.employee_id === "emp_amic_jwsuh")
      .aliases.includes("JWS"));

    const reviewed = await json(baseUrl, "/api/finance/bank-classifications/review", {
      method: "POST",
      account: SUPER_ADMIN_ACCOUNT,
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm-bank-classification-api",
        audit_hint_ref: "audit-bank-classification-api",
        idempotency_key: "bank-classification-review-api-001",
        decisions: [{
          bank_transaction_id: "bank-classification-client-api",
          category: "client_receipt",
          client_group_id: "client-best-api",
          remember_match: true,
          match_field: "counterparty",
        }],
      }),
    });
    assert.equal(reviewed.status, 200);
    assert.equal(reviewed.body.item.rule_count, 1);
    const rerun = await json(baseUrl, "/api/finance/bank-classifications/auto", {
      method: "POST",
      account: SUPER_ADMIN_ACCOUNT,
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm-bank-classification-api",
        audit_hint_ref: "audit-bank-classification-api",
        idempotency_key: "bank-classification-api-002",
      }),
    });
    assert.equal(rerun.status, 200);
    assert.equal(rerun.body.item.protected_manual_count, 1);
    const reviewedRows = await json(baseUrl, `/api/finance/bank-classifications?${BASE_QUERY}`, {
      account: SUPER_ADMIN_ACCOUNT,
    });
    const reviewedClient = reviewedRows.body.items
      .find((row) => row.bank_transaction_id === "bank-classification-client-api");
    assert.equal(reviewedClient.classification_source, "manual_review");
    assert.equal(reviewedClient.manual_lock, true);
    assert.equal(reviewedClient.rationale_code, "manual_client_linked");

    const denied = await json(baseUrl, `/api/finance/bank-classifications?${BASE_QUERY}`, {
      account: NON_PARTNER_ACCOUNT,
    });
    const deniedMutation = await json(baseUrl, "/api/finance/bank-classifications/auto", {
      method: "POST",
      account: NON_PARTNER_ACCOUNT,
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm-bank-classification-api",
        audit_hint_ref: "audit-bank-classification-api",
        idempotency_key: "staff-bank-classification-api",
      }),
    });
    const deniedReview = await json(baseUrl, "/api/finance/bank-classifications/review", {
      method: "POST",
      account: NON_PARTNER_ACCOUNT,
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm-bank-classification-api",
        audit_hint_ref: "audit-bank-classification-api",
        idempotency_key: "staff-bank-classification-review-api",
        decisions: [{
          bank_transaction_id: "bank-classification-client-api",
          category: "other_inflow",
        }],
      }),
    });
    assert.equal(denied.status, 403);
    assert.deepEqual(denied.body.items, []);
    assert.equal(deniedMutation.status, 403);
    assert.deepEqual(deniedMutation.body.items, []);
    assert.equal(deniedReview.status, 403);
    assert.deepEqual(deniedReview.body.items, []);
  }, { financeRepository, matterRepository, analyticsFinanceRepository: financeRepository });
});

test("G7 Finance sensitive reads write durable allow audits without leaking payload metadata", async () => {
  const financeStorePath = join(mkdtempSync(join(tmpdir(), "finance-api-g7-read-audit-")), "finance.json");
  await withServer(async (baseUrl) => {
    const time = await json(baseUrl, `/api/finance/time-entries?${BASE_QUERY}`);
    assert.equal(time.status, 200);

    const invoices = await json(baseUrl, `/api/finance/invoices?${BASE_QUERY}`);
    assert.equal(invoices.status, 200);

    const aging = await json(baseUrl, `/api/finance/ar-aging?${BASE_QUERY}&as_of_date=2026-07-15`);
    assert.equal(aging.status, 200);

    const balances = await json(baseUrl, `/api/finance/trust-balances?${BASE_QUERY}&matter_id=matter_cmp_g7_read_audit&currency=KRW`);
    assert.equal(balances.status, 200);
  }, { financeStorePath });

  await withServer(async (baseUrl) => {
    const audit = await json(baseUrl, `/api/finance/audit?${BASE_QUERY}`);
    const requiredEvents = [
      ["finance:time:read", "time_entry"],
      ["finance:invoice:read", "invoice"],
      ["finance:ar:read", "ar_aging"],
      ["finance:trust_ledger:read", "trust_balance"],
    ];

    for (const [action, objectType] of requiredEvents) {
      const event = audit.body.items.find(
        (candidate) => candidate.action === action && candidate.object_type === objectType && candidate.decision === "allow",
      );
      assert.ok(event, `missing sensitive read audit for ${action}`);
      assert.equal(event.reason, "finance_sensitive_read_allowed_after_permission_gate");
      assert.equal(event.metadata.sensitive_read_audit_required, true);
      assert.equal(event.metadata.raw_payload_included, false);
      assert.equal(event.metadata.credential_material_included, false);
      assert.equal(event.metadata.bank_reference_included, false);
      assert.equal(event.metadata.journal_lines_included, false);
      assert.equal("raw_payload" in event.metadata, false);
      assert.equal("credential_material" in event.metadata, false);
      assert.equal("bank_reference" in event.metadata, false);
      assert.equal("journal_lines" in event.metadata, false);
    }
  }, { financeStorePath });
});

test("G7 Finance write routes persist time/payment state across restart", async () => {
  const financeStorePath = join(mkdtempSync(join(tmpdir(), "finance-api-g7-")), "finance.json");
  await withServer(async (baseUrl) => {
    const created = await json(baseUrl, "/api/finance/time-entries", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_cmp_g7_write",
        audit_hint_ref: "audit_hint_cmp_g7_write",
        actor_id: "user_cmp_g7_finance",
        idempotency_key: "api-time-g7-1",
        time_entry: {
          time_entry_id: "time_cmp_g7_api_001",
          tenant_id: TENANT,
          matter_id: "matter_rp05_synthetic_opening",
          role_id: "partner",
          work_date: "2026-06-20",
          narrative: "API time",
          duration_minutes: 30,
          billable: true,
        },
      }),
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.item.time_entry_id, "time_cmp_g7_api_001");

    const replay = await json(baseUrl, "/api/finance/time-entries", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_cmp_g7_write",
        audit_hint_ref: "audit_hint_cmp_g7_write",
        actor_id: "user_cmp_g7_finance",
        idempotency_key: "api-time-g7-1",
        time_entry: {
          time_entry_id: "time_cmp_g7_api_001",
          tenant_id: TENANT,
          matter_id: "matter_rp05_synthetic_opening",
          role_id: "partner",
          work_date: "2026-06-20",
          narrative: "API time",
          duration_minutes: 30,
          billable: true,
        },
      }),
    });
    assert.equal(replay.status, 200);
    assert.equal(replay.body.outcome, "idempotent_replay");

    const payment = await json(baseUrl, "/api/finance/payments", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_cmp_g7_write",
        audit_hint_ref: "audit_hint_cmp_g7_write",
        actor_id: "user_cmp_g7_finance",
        idempotency_key: "api-payment-g7-1",
        payment: {
          payment_id: "payment_cmp_g7_api_001",
          tenant_id: TENANT,
          bank_reference: "should-not-leak",
          amount: 100000,
          currency: "KRW",
        },
      }),
    });
    assert.equal(payment.status, 201);
    assert.equal(payment.body.item.bank_reference_included, false);
    assert.equal("bank_reference" in payment.body.item, false);
  }, { financeStorePath });

  await withServer(async (baseUrl) => {
    const time = await json(baseUrl, `/api/finance/time-entries?${BASE_QUERY}`);
    assert.ok(time.body.items.some((item) => item.time_entry_id === "time_cmp_g7_api_001"));
    const audit = await json(baseUrl, `/api/finance/audit?${BASE_QUERY}`);
    assert.ok(audit.body.items.some((event) => event.action === "payment.import"));
  }, { financeStorePath });
});

test("G7 Finance WIP and AR aging routes stay safe-source", async () => {
  await withServer(async (baseUrl) => {
    const wip = await json(baseUrl, "/api/finance/wip", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_cmp_g7_write",
        audit_hint_ref: "audit_hint_cmp_g7_write",
        actor_id: "user_cmp_g7_finance",
        idempotency_key: "api-wip-g7-1",
        matter_id: "matter_rp05_synthetic_opening",
        rate_card_id: "rate_cmp_g7_seed",
      }),
    });
    assert.equal(wip.status, 201);
    assert.equal(wip.body.items.length, 1);
    assert.equal(wip.body.items[0].production_ready_claim, false);

    const aging = await json(baseUrl, `/api/finance/ar-aging?${BASE_QUERY}&as_of_date=2026-07-15`);
    assert.equal(aging.status, 200);
    assert.equal(aging.body.items[0].production_ready_claim, false);
    assert.equal(aging.body.items[0].bucket_61_90, 400000);
    assert.equal(aging.body.items[0].bucket_31_60, 0);
    assert.equal(aging.body.items[0].bucket_source, "due_date");
  });
});

test("G7 fee arrangement API drives fixed-fee billing calculation through invoice", async () => {
  const financeRepository = createFinanceRepository({
    seedRecords: [
      {
        model_type: "RateCard",
        rate_card_id: "rate_api_g7_b11",
        tenant_id: TENANT,
        currency: "KRW",
        effective_from: "2026-07-01",
        role_rates: [{ role_id: "partner", hourly_rate: 100000 }],
        status: "active",
      },
    ],
  });

  await withServer(async (baseUrl) => {
    const arrangement = await json(baseUrl, "/api/finance/fee-arrangements", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_cmp_g7_write",
        audit_hint_ref: "audit_hint_cmp_g7_write",
        actor_id: "user_cmp_g7_finance",
        idempotency_key: "api-fee-arrangement-g7-b11",
        fee_arrangement: {
          fee_arrangement_id: "fee_arrangement_api_g7_b11",
          tenant_id: TENANT,
          matter_id: "matter_api_g7_b11",
          billing_profile_id: "billing_profile_api_g7_b11",
          rate_card_id: "rate_api_g7_b11",
          type: "fixed",
          fixed_fee_amount: 275000,
        },
      }),
    });
    assert.equal(arrangement.status, 201);
    assert.equal(arrangement.body.item.type, "fixed");
    assert.equal(arrangement.body.item.fixed_fee_amount, 275000);

    const createdTime = await json(baseUrl, "/api/finance/time-entries", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_cmp_g7_write",
        audit_hint_ref: "audit_hint_cmp_g7_write",
        actor_id: "user_cmp_g7_finance",
        idempotency_key: "api-time-g7-b11",
        time_entry: {
          time_entry_id: "time_api_g7_b11",
          tenant_id: TENANT,
          matter_id: "matter_api_g7_b11",
          role_id: "partner",
          work_date: "2026-07-02",
          narrative: "B11 fixed fee source",
          duration_minutes: 60,
          billable: true,
        },
      }),
    });
    assert.equal(createdTime.status, 201);

    const approvedTime = await json(baseUrl, "/api/finance/time-entries/approve", {
      method: "POST",
      headers: { [PERMISSION_CONTEXT_HEADER]: permissionContext("allow", ["partner"]) },
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_cmp_g7_write",
        audit_hint_ref: "audit_hint_cmp_g7_write",
        actor_id: "user_cmp_g7_partner",
        idempotency_key: "api-time-g7-b11-approve",
        time_entry_id: "time_api_g7_b11",
      }),
    });
    assert.equal(approvedTime.status, 200);

    const wip = await json(baseUrl, "/api/finance/wip", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_cmp_g7_write",
        audit_hint_ref: "audit_hint_cmp_g7_write",
        actor_id: "user_cmp_g7_finance",
        idempotency_key: "api-wip-g7-b11",
        matter_id: "matter_api_g7_b11",
        rate_card_id: "rate_api_g7_b11",
        fee_arrangement_id: "fee_arrangement_api_g7_b11",
      }),
    });
    assert.equal(wip.status, 201);
    assert.equal(wip.body.items[0].fee_arrangement_type, "fixed");
    assert.equal(wip.body.items[0].billing_calculation_source, "fee_arrangement.fixed");
    assert.equal(wip.body.items[0].amount, 275000);

    const snapshot = await json(baseUrl, "/api/finance/wip-snapshots", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_cmp_g7_write",
        audit_hint_ref: "audit_hint_cmp_g7_write",
        actor_id: "user_cmp_g7_finance",
        idempotency_key: "api-wip-snapshot-g7-b11",
        matter_id: "matter_api_g7_b11",
        wip_snapshot_id: "wip_snapshot_api_g7_b11",
        wip_item_ids: wip.body.items.map((item) => item.wip_item_id),
      }),
    });
    assert.equal(snapshot.status, 201);
    assert.equal(snapshot.body.item.total_amount, 275000);
    assert.equal(snapshot.body.item.fee_arrangement_type, "fixed");

    const prebill = await json(baseUrl, "/api/finance/prebills", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_cmp_g7_write",
        audit_hint_ref: "audit_hint_cmp_g7_write",
        actor_id: "user_cmp_g7_finance",
        idempotency_key: "api-prebill-g7-b11",
        prebill: {
          prebill_id: "prebill_api_g7_b11",
          tenant_id: TENANT,
          matter_id: "matter_api_g7_b11",
          wip_snapshot_id: "wip_snapshot_api_g7_b11",
          partner_reviewer_id: "user_cmp_g7_partner",
          currency: "KRW",
        },
      }),
    });
    assert.equal(prebill.status, 201);
    assert.equal(prebill.body.item.total_amount, 275000);
    assert.equal(prebill.body.item.fee_arrangement_type, "fixed");

    const approvedPrebill = await json(baseUrl, "/api/finance/prebills/approve", {
      method: "POST",
      headers: { [PERMISSION_CONTEXT_HEADER]: permissionContext("allow", ["partner"]) },
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_cmp_g7_write",
        audit_hint_ref: "audit_hint_cmp_g7_write",
        actor_id: "user_cmp_g7_partner",
        idempotency_key: "api-prebill-g7-b11-approve",
        prebill_id: "prebill_api_g7_b11",
      }),
    });
    assert.equal(approvedPrebill.status, 200);

    const invoice = await json(baseUrl, "/api/finance/invoices", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_cmp_g7_write",
        audit_hint_ref: "audit_hint_cmp_g7_write",
        actor_id: "user_cmp_g7_finance",
        idempotency_key: "api-invoice-g7-b11",
        invoice: {
          invoice_id: "invoice_api_g7_b11",
          tenant_id: TENANT,
          matter_id: "matter_api_g7_b11",
          prebill_id: "prebill_api_g7_b11",
          billing_client_party_id: "party_cmp_g7_api_b11",
          currency: "KRW",
          issued_at: "2026-07-02T00:00:00.000Z",
        },
      }),
    });
    assert.equal(invoice.status, 201);
    assert.equal(invoice.body.item.amount_due, 275000);
    assert.equal(invoice.body.item.fee_arrangement_type, "fixed");

    const listed = await json(baseUrl, `/api/finance/fee-arrangements?${BASE_QUERY}`);
    assert.equal(listed.status, 200);
    assert.equal(listed.body.items.some((item) => item.fee_arrangement_id === "fee_arrangement_api_g7_b11"), true);
  }, { financeRepository });
});

test("G7 fee arrangement API drives success-fee and retainer billing branches through invoice", async () => {
  const financeRepository = createFinanceRepository({
    seedRecords: [
      {
        model_type: "RateCard",
        rate_card_id: "rate_api_g7_b11_variants",
        tenant_id: TENANT,
        currency: "KRW",
        effective_from: "2026-07-01",
        role_rates: [{ role_id: "partner", hourly_rate: 120000 }],
        status: "active",
      },
    ],
  });

  await withServer(async (baseUrl) => {
    async function driveFeeArrangementBranch({
      suffix,
      feeArrangement,
      expectedWipAmount,
      expectedStandardAmount,
      expectedRetainerDrawdown = 0,
      expectedSuccessFeeApplied = false,
      expectedBillingSource,
    }) {
      const matterId = `matter_api_g7_b11_${suffix}`;
      const feeArrangementId = `fee_arrangement_api_g7_b11_${suffix}`;
      const timeEntryId = `time_api_g7_b11_${suffix}`;
      const snapshotId = `wip_snapshot_api_g7_b11_${suffix}`;
      const prebillId = `prebill_api_g7_b11_${suffix}`;
      const invoiceId = `invoice_api_g7_b11_${suffix}`;

      const arrangement = await json(baseUrl, "/api/finance/fee-arrangements", {
        method: "POST",
        body: JSON.stringify({
          tenant_id: TENANT,
          permission_ref: "perm_ref_cmp_g7_write",
          audit_hint_ref: "audit_hint_cmp_g7_write",
          actor_id: "user_cmp_g7_finance",
          idempotency_key: `api-fee-arrangement-g7-b11-${suffix}`,
          fee_arrangement: {
            fee_arrangement_id: feeArrangementId,
            tenant_id: TENANT,
            matter_id: matterId,
            billing_profile_id: `billing_profile_api_g7_b11_${suffix}`,
            rate_card_id: "rate_api_g7_b11_variants",
            ...feeArrangement,
          },
        }),
      });
      assert.equal(arrangement.status, 201);
      assert.equal(arrangement.body.item.type, feeArrangement.type);

      const createdTime = await json(baseUrl, "/api/finance/time-entries", {
        method: "POST",
        body: JSON.stringify({
          tenant_id: TENANT,
          permission_ref: "perm_ref_cmp_g7_write",
          audit_hint_ref: "audit_hint_cmp_g7_write",
          actor_id: "user_cmp_g7_finance",
          idempotency_key: `api-time-g7-b11-${suffix}`,
          time_entry: {
            time_entry_id: timeEntryId,
            tenant_id: TENANT,
            matter_id: matterId,
            role_id: "partner",
            work_date: "2026-07-02",
            narrative: `B11 ${suffix} source`,
            duration_minutes: 60,
            billable: true,
          },
        }),
      });
      assert.equal(createdTime.status, 201);

      const approvedTime = await json(baseUrl, "/api/finance/time-entries/approve", {
        method: "POST",
        headers: { [PERMISSION_CONTEXT_HEADER]: permissionContext("allow", ["partner"]) },
        body: JSON.stringify({
          tenant_id: TENANT,
          permission_ref: "perm_ref_cmp_g7_write",
          audit_hint_ref: "audit_hint_cmp_g7_write",
          actor_id: "user_cmp_g7_partner",
          idempotency_key: `api-time-g7-b11-${suffix}-approve`,
          time_entry_id: timeEntryId,
        }),
      });
      assert.equal(approvedTime.status, 200);

      const wip = await json(baseUrl, "/api/finance/wip", {
        method: "POST",
        body: JSON.stringify({
          tenant_id: TENANT,
          permission_ref: "perm_ref_cmp_g7_write",
          audit_hint_ref: "audit_hint_cmp_g7_write",
          actor_id: "user_cmp_g7_finance",
          idempotency_key: `api-wip-g7-b11-${suffix}`,
          matter_id: matterId,
          rate_card_id: "rate_api_g7_b11_variants",
          fee_arrangement_id: feeArrangementId,
        }),
      });
      assert.equal(wip.status, 201);
      assert.equal(wip.body.items[0].fee_arrangement_type, feeArrangement.type);
      assert.equal(wip.body.items[0].billing_calculation_source, expectedBillingSource);
      assert.equal(wip.body.items[0].amount, expectedWipAmount);
      assert.equal(wip.body.items[0].standard_amount, expectedStandardAmount);
      assert.equal(wip.body.items[0].retainer_drawdown_amount, expectedRetainerDrawdown);
      assert.equal(wip.body.items[0].success_fee_applied, expectedSuccessFeeApplied);

      const snapshot = await json(baseUrl, "/api/finance/wip-snapshots", {
        method: "POST",
        body: JSON.stringify({
          tenant_id: TENANT,
          permission_ref: "perm_ref_cmp_g7_write",
          audit_hint_ref: "audit_hint_cmp_g7_write",
          actor_id: "user_cmp_g7_finance",
          idempotency_key: `api-wip-snapshot-g7-b11-${suffix}`,
          matter_id: matterId,
          wip_snapshot_id: snapshotId,
          wip_item_ids: wip.body.items.map((item) => item.wip_item_id),
        }),
      });
      assert.equal(snapshot.status, 201);
      assert.equal(snapshot.body.item.total_amount, expectedWipAmount);
      assert.equal(snapshot.body.item.standard_amount, expectedStandardAmount);
      assert.equal(snapshot.body.item.retainer_drawdown_total, expectedRetainerDrawdown);
      assert.equal(snapshot.body.item.success_fee_applied, expectedSuccessFeeApplied);
      assert.equal(snapshot.body.item.fee_arrangement_type, feeArrangement.type);

      const prebill = await json(baseUrl, "/api/finance/prebills", {
        method: "POST",
        body: JSON.stringify({
          tenant_id: TENANT,
          permission_ref: "perm_ref_cmp_g7_write",
          audit_hint_ref: "audit_hint_cmp_g7_write",
          actor_id: "user_cmp_g7_finance",
          idempotency_key: `api-prebill-g7-b11-${suffix}`,
          prebill: {
            prebill_id: prebillId,
            tenant_id: TENANT,
            matter_id: matterId,
            wip_snapshot_id: snapshotId,
            partner_reviewer_id: "user_cmp_g7_partner",
            currency: "KRW",
          },
        }),
      });
      assert.equal(prebill.status, 201);
      assert.equal(prebill.body.item.total_amount, expectedWipAmount);
      assert.equal(prebill.body.item.standard_amount, expectedStandardAmount);
      assert.equal(prebill.body.item.retainer_drawdown_total, expectedRetainerDrawdown);
      assert.equal(prebill.body.item.success_fee_applied, expectedSuccessFeeApplied);
      assert.equal(prebill.body.item.fee_arrangement_type, feeArrangement.type);

      const approvedPrebill = await json(baseUrl, "/api/finance/prebills/approve", {
        method: "POST",
        headers: { [PERMISSION_CONTEXT_HEADER]: permissionContext("allow", ["partner"]) },
        body: JSON.stringify({
          tenant_id: TENANT,
          permission_ref: "perm_ref_cmp_g7_write",
          audit_hint_ref: "audit_hint_cmp_g7_write",
          actor_id: "user_cmp_g7_partner",
          idempotency_key: `api-prebill-g7-b11-${suffix}-approve`,
          prebill_id: prebillId,
        }),
      });
      assert.equal(approvedPrebill.status, 200);

      const invoice = await json(baseUrl, "/api/finance/invoices", {
        method: "POST",
        body: JSON.stringify({
          tenant_id: TENANT,
          permission_ref: "perm_ref_cmp_g7_write",
          audit_hint_ref: "audit_hint_cmp_g7_write",
          actor_id: "user_cmp_g7_finance",
          idempotency_key: `api-invoice-g7-b11-${suffix}`,
          invoice: {
            invoice_id: invoiceId,
            tenant_id: TENANT,
            matter_id: matterId,
            prebill_id: prebillId,
            billing_client_party_id: `party_cmp_g7_api_b11_${suffix}`,
            currency: "KRW",
            issued_at: "2026-07-02T00:00:00.000Z",
          },
        }),
      });
      assert.equal(invoice.status, 201);
      assert.equal(invoice.body.item.amount_due, expectedWipAmount);
      assert.equal(invoice.body.item.standard_amount, expectedStandardAmount);
      assert.equal(invoice.body.item.retainer_drawdown_total, expectedRetainerDrawdown);
      assert.equal(invoice.body.item.success_fee_applied, expectedSuccessFeeApplied);
      assert.equal(invoice.body.item.fee_arrangement_type, feeArrangement.type);
      assert.equal(invoice.body.invoice_lines[0].amount, expectedWipAmount);
      assert.equal(invoice.body.invoice_lines[0].retainer_drawdown_amount, expectedRetainerDrawdown);
      assert.equal(invoice.body.invoice_lines[0].success_fee_applied, expectedSuccessFeeApplied);
    }

    await driveFeeArrangementBranch({
      suffix: "success_met",
      feeArrangement: {
        type: "success_fee",
        upfront_fee_amount: 50000,
        success_fee_amount: 200000,
        success_condition_met: true,
      },
      expectedWipAmount: 250000,
      expectedStandardAmount: 120000,
      expectedSuccessFeeApplied: true,
      expectedBillingSource: "fee_arrangement.success_fee",
    });

    await driveFeeArrangementBranch({
      suffix: "success_unmet",
      feeArrangement: {
        type: "success_fee",
        upfront_fee_amount: 50000,
        success_fee_amount: 200000,
        success_condition_met: false,
      },
      expectedWipAmount: 50000,
      expectedStandardAmount: 120000,
      expectedSuccessFeeApplied: false,
      expectedBillingSource: "fee_arrangement.success_fee",
    });

    await driveFeeArrangementBranch({
      suffix: "retainer",
      feeArrangement: {
        type: "retainer",
        retainer_amount: 80000,
      },
      expectedWipAmount: 40000,
      expectedStandardAmount: 120000,
      expectedRetainerDrawdown: 80000,
      expectedSuccessFeeApplied: false,
      expectedBillingSource: "fee_arrangement.retainer_drawdown",
    });
  }, { financeRepository });
});

test("G7 trust ledger API drives deposit drawdown refund balance report", async () => {
  const financeRepository = createFinanceRepository({
    seedRecords: [
      {
        model_type: "Invoice",
        invoice_id: "invoice_api_g7_b12",
        tenant_id: TENANT,
        matter_id: "matter_api_g7_b12",
        billing_client_party_id: "party_cmp_g7_api_b12",
        amount_due: 250000,
        amount_paid: 0,
        currency: "KRW",
        status: "issued",
      },
      {
        model_type: "Invoice",
        invoice_id: "invoice_api_g7_b12_negative",
        tenant_id: TENANT,
        matter_id: "matter_api_g7_b12",
        billing_client_party_id: "party_cmp_g7_api_b12",
        amount_due: 100000,
        amount_paid: 0,
        currency: "KRW",
        status: "issued",
      },
    ],
  });

  await withServer(async (baseUrl) => {
    const deposit = await json(baseUrl, "/api/finance/trust-deposits", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_cmp_g7_write",
        audit_hint_ref: "audit_hint_cmp_g7_write",
        actor_id: "user_cmp_g7_finance",
        idempotency_key: "api-trust-ledger-g7-b12-deposit",
        deposit: {
          trust_ledger_entry_id: "trust_ledger_api_g7_b12_deposit",
          tenant_id: TENANT,
          matter_id: "matter_api_g7_b12",
          client_group_id: "client_group_api_g7_b12",
          amount: 400000,
          currency: "KRW",
        },
      }),
    });
    assert.equal(deposit.status, 201);
    assert.equal(deposit.body.item.entry_type, "deposit");
    assert.equal(deposit.body.item.segregated_client_funds, true);
    assert.equal(deposit.body.trust_balance.available_balance, 400000);

    const drawdown = await json(baseUrl, "/api/finance/trust-drawdowns", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_cmp_g7_write",
        audit_hint_ref: "audit_hint_cmp_g7_write",
        actor_id: "user_cmp_g7_finance",
        idempotency_key: "api-trust-ledger-g7-b12-drawdown",
        drawdown: {
          trust_ledger_entry_id: "trust_ledger_api_g7_b12_drawdown",
          tenant_id: TENANT,
          matter_id: "matter_api_g7_b12",
          invoice_id: "invoice_api_g7_b12",
          amount: 250000,
          currency: "KRW",
        },
      }),
    });
    assert.equal(drawdown.status, 201);
    assert.equal(drawdown.body.item.entry_type, "drawdown");
    assert.equal(drawdown.body.invoice.status, "paid");
    assert.equal(drawdown.body.invoice.trust_drawdown_amount, 250000);
    assert.equal(drawdown.body.trust_balance.available_balance, 150000);

    const refund = await json(baseUrl, "/api/finance/trust-refunds", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_cmp_g7_write",
        audit_hint_ref: "audit_hint_cmp_g7_write",
        actor_id: "user_cmp_g7_finance",
        idempotency_key: "api-trust-ledger-g7-b12-refund",
        refund: {
          trust_ledger_entry_id: "trust_ledger_api_g7_b12_refund",
          tenant_id: TENANT,
          matter_id: "matter_api_g7_b12",
          amount: 150000,
          currency: "KRW",
        },
      }),
    });
    assert.equal(refund.status, 201);
    assert.equal(refund.body.item.entry_type, "refund_liability");
    assert.equal(refund.body.trust_balance.available_balance, 0);
    assert.equal(refund.body.trust_balance.refund_total, 150000);

    const balances = await json(baseUrl, `/api/finance/trust-balances?${BASE_QUERY}&matter_id=matter_api_g7_b12&currency=KRW`);
    assert.equal(balances.status, 200);
    assert.equal(balances.body.items.length, 1);
    assert.equal(balances.body.summary.deposit_total, 400000);
    assert.equal(balances.body.summary.drawdown_total, 250000);
    assert.equal(balances.body.summary.refund_total, 150000);
    assert.equal(balances.body.summary.available_balance, 0);
    assert.equal(balances.body.summary.negative_trust_balance_blocked, true);

    const negative = await json(baseUrl, "/api/finance/trust-drawdowns", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_cmp_g7_write",
        audit_hint_ref: "audit_hint_cmp_g7_write",
        actor_id: "user_cmp_g7_finance",
        idempotency_key: "api-trust-ledger-g7-b12-negative",
        drawdown: {
          trust_ledger_entry_id: "trust_ledger_api_g7_b12_negative",
          tenant_id: TENANT,
          matter_id: "matter_api_g7_b12",
          invoice_id: "invoice_api_g7_b12_negative",
          amount: 1,
          currency: "KRW",
        },
      }),
    });
    assert.equal(negative.status, 400);
    assert.equal(negative.body.count_leak_prevented, true);

    const audit = await json(baseUrl, `/api/finance/audit?${BASE_QUERY}`);
    assert.ok(audit.body.items.some((event) => event.action === "trust_ledger.deposit.receive"));
    assert.ok(audit.body.items.some((event) => event.action === "trust_ledger.drawdown.invoice"));
    assert.ok(audit.body.items.some((event) => event.action === "trust_ledger.refund_liability.record"));
  }, { financeRepository });
});

test("G7 approval expense disbursement and WIP lock routes feed WIP sources", async () => {
  const financeRepository = createFinanceRepository({
    seedRecords: [
      {
        model_type: "RateCard",
        rate_card_id: "rate_api_g7_b14",
        tenant_id: TENANT,
        currency: "KRW",
        effective_from: "2026-07-01",
        role_rates: [{ role_id: "partner", hourly_rate: 100000 }],
        status: "active",
      },
    ],
  });

  await withServer(async (baseUrl) => {
    const createdTime = await json(baseUrl, "/api/finance/time-entries", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_cmp_g7_write",
        audit_hint_ref: "audit_hint_cmp_g7_write",
        actor_id: "user_cmp_g7_finance",
        idempotency_key: "api-time-g7-b14-1",
        time_entry: {
          time_entry_id: "time_api_g7_b14",
          tenant_id: TENANT,
          matter_id: "matter_api_g7_b14",
          role_id: "partner",
          work_date: "2026-07-02",
          narrative: "B14 time source",
          duration_minutes: 60,
          billable: true,
        },
      }),
    });
    assert.equal(createdTime.status, 201);

    const nonPartnerApproval = await json(baseUrl, "/api/finance/time-entries/approve", {
      method: "POST",
      account: NON_PARTNER_ACCOUNT,
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_cmp_g7_write",
        audit_hint_ref: "audit_hint_cmp_g7_write",
        actor_id: "user_cmp_g7_finance",
        idempotency_key: "api-time-g7-b14-nonpartner",
        time_entry_id: "time_api_g7_b14",
      }),
    });
    assert.equal(nonPartnerApproval.status, 403);
    assert.equal(nonPartnerApproval.body.count_leak_prevented, true);

    const approved = await json(baseUrl, "/api/finance/time-entries/approve", {
      method: "POST",
      headers: { [PERMISSION_CONTEXT_HEADER]: permissionContext("allow", ["partner"]) },
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_cmp_g7_write",
        audit_hint_ref: "audit_hint_cmp_g7_write",
        actor_id: "user_cmp_g7_partner",
        idempotency_key: "api-time-g7-b14-approve",
        time_entry_id: "time_api_g7_b14",
      }),
    });
    assert.equal(approved.status, 200);
    assert.equal(approved.body.item.status, "approved");
    assert.equal(approved.body.item.approved_for_wip, true);

    const expense = await json(baseUrl, "/api/finance/expenses", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_cmp_g7_write",
        audit_hint_ref: "audit_hint_cmp_g7_write",
        actor_id: "user_cmp_g7_finance",
        idempotency_key: "api-expense-g7-b14",
        expense: {
          expense_id: "expense_api_g7_b14",
          tenant_id: TENANT,
          matter_id: "matter_api_g7_b14",
          expense_date: "2026-07-08",
          receipt_document_id: "receipt_api_g7_b14",
          amount: 25000,
          currency: "KRW",
          billable: true,
          status: "approved",
        },
      }),
    });
    assert.equal(expense.status, 201);
    assert.equal(expense.body.item.approved_for_wip, true);
    assert.equal(expense.body.item.expense_date, "2026-07-08");
    assert.equal(expense.body.item.production_ready_claim, false);

    const disbursement = await json(baseUrl, "/api/finance/disbursements", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_cmp_g7_write",
        audit_hint_ref: "audit_hint_cmp_g7_write",
        actor_id: "user_cmp_g7_finance",
        idempotency_key: "api-disbursement-g7-b14",
        disbursement: {
          disbursement_id: "disbursement_api_g7_b14",
          tenant_id: TENANT,
          matter_id: "matter_api_g7_b14",
          disbursed_at: "2026-07-09",
          vendor_ref: "vendor_api_g7_b14",
          amount: 15000,
          currency: "KRW",
          billable: true,
        },
      }),
    });
    assert.equal(disbursement.status, 201);
    assert.equal(disbursement.body.item.recoverable, true);
    assert.equal(disbursement.body.item.disbursed_at, "2026-07-09");

    const wip = await json(baseUrl, "/api/finance/wip", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_cmp_g7_write",
        audit_hint_ref: "audit_hint_cmp_g7_write",
        actor_id: "user_cmp_g7_finance",
        idempotency_key: "api-wip-g7-b14",
        matter_id: "matter_api_g7_b14",
        rate_card_id: "rate_api_g7_b14",
      }),
    });
    assert.equal(wip.status, 201);
    const sourceTypes = new Set(wip.body.items.map((item) => item.source_model_type));
    assert.deepEqual(sourceTypes, new Set(["TimeEntry", "Expense", "Disbursement"]));
    assert.equal(wip.body.items.reduce((total, item) => total + item.amount, 0), 140000);

    const snapshot = await json(baseUrl, "/api/finance/wip-snapshots", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_cmp_g7_write",
        audit_hint_ref: "audit_hint_cmp_g7_write",
        actor_id: "user_cmp_g7_finance",
        idempotency_key: "api-wip-snapshot-g7-b14",
        matter_id: "matter_api_g7_b14",
        wip_snapshot_id: "wip_snapshot_api_g7_b14",
        wip_item_ids: wip.body.items.map((item) => item.wip_item_id),
      }),
    });
    assert.equal(snapshot.status, 201);
    assert.equal(snapshot.body.item.total_amount, 140000);
    assert.equal(snapshot.body.item.immutable_snapshot, true);

    const prebill = await json(baseUrl, "/api/finance/prebills", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_cmp_g7_write",
        audit_hint_ref: "audit_hint_cmp_g7_write",
        actor_id: "user_cmp_g7_finance",
        idempotency_key: "api-prebill-g7-b04",
        prebill: {
          prebill_id: "prebill_api_g7_b04",
          tenant_id: TENANT,
          matter_id: "matter_api_g7_b14",
          wip_snapshot_id: snapshot.body.item.wip_snapshot_id,
          partner_reviewer_id: "user_cmp_g7_partner",
          currency: "KRW",
        },
      }),
    });
    assert.equal(prebill.status, 201);
    assert.equal(prebill.body.item.status, "partner_review_required");

    const nonPartnerPrebillApproval = await json(baseUrl, "/api/finance/prebills/approve", {
      method: "POST",
      account: NON_PARTNER_ACCOUNT,
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_cmp_g7_write",
        audit_hint_ref: "audit_hint_cmp_g7_write",
        actor_id: "user_cmp_g7_finance",
        idempotency_key: "api-prebill-g7-b04-nonpartner",
        prebill_id: "prebill_api_g7_b04",
      }),
    });
    assert.equal(nonPartnerPrebillApproval.status, 403);
    assert.equal(nonPartnerPrebillApproval.body.count_leak_prevented, true);

    const approvedPrebill = await json(baseUrl, "/api/finance/prebills/approve", {
      method: "POST",
      headers: { [PERMISSION_CONTEXT_HEADER]: permissionContext("allow", ["partner"]) },
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_cmp_g7_write",
        audit_hint_ref: "audit_hint_cmp_g7_write",
        actor_id: "user_cmp_g7_partner",
        idempotency_key: "api-prebill-g7-b04-approve",
        prebill_id: "prebill_api_g7_b04",
      }),
    });
    assert.equal(approvedPrebill.status, 200);
    assert.equal(approvedPrebill.body.item.status, "partner_approved");
    assert.equal(approvedPrebill.body.item.approved_without_adjustment, true);
    assert.equal(financeRepository.list({ tenant_id: TENANT, model_type: "BillingAdjustment" }).length, 0);

    const rejectedPrebillSeed = await json(baseUrl, "/api/finance/prebills", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_cmp_g7_write",
        audit_hint_ref: "audit_hint_cmp_g7_write",
        actor_id: "user_cmp_g7_finance",
        idempotency_key: "api-prebill-g7-b04-reject-seed",
        prebill: {
          prebill_id: "prebill_api_g7_b04_reject",
          tenant_id: TENANT,
          matter_id: "matter_api_g7_b14",
          wip_snapshot_id: snapshot.body.item.wip_snapshot_id,
          partner_reviewer_id: "user_cmp_g7_partner",
          currency: "KRW",
        },
      }),
    });
    assert.equal(rejectedPrebillSeed.status, 201);

    const rejectedPrebill = await json(baseUrl, "/api/finance/prebills/reject", {
      method: "POST",
      headers: { [PERMISSION_CONTEXT_HEADER]: permissionContext("allow", ["partner"]) },
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_cmp_g7_write",
        audit_hint_ref: "audit_hint_cmp_g7_write",
        actor_id: "user_cmp_g7_partner",
        idempotency_key: "api-prebill-g7-b04-reject",
        prebill_id: "prebill_api_g7_b04_reject",
        reason_code: "narrative_revision_required",
      }),
    });
    assert.equal(rejectedPrebill.status, 200);
    assert.equal(rejectedPrebill.body.item.status, "rejected");

    const invoice = await json(baseUrl, "/api/finance/invoices", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_cmp_g7_write",
        audit_hint_ref: "audit_hint_cmp_g7_write",
        actor_id: "user_cmp_g7_finance",
        idempotency_key: "api-invoice-g7-b05",
        invoice: {
          invoice_id: "invoice_api_g7_b05",
          tenant_id: TENANT,
          matter_id: "matter_api_g7_b14",
          prebill_id: "prebill_api_g7_b04",
          billing_client_party_id: "party_cmp_g7_api_b05",
          currency: "KRW",
          issued_at: "2026-07-02T00:00:00.000Z",
        },
      }),
    });
    assert.equal(invoice.status, 201);
    assert.equal(invoice.body.item.invoice_number, "INV-2026-000001");
    assert.equal(invoice.body.item.mutates_issued_invoice, false);
    assert.equal(invoice.body.item.amount_due, 140000);

    const overpayment = await json(baseUrl, "/api/finance/payments", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_cmp_g7_write",
        audit_hint_ref: "audit_hint_cmp_g7_write",
        actor_id: "user_cmp_g7_finance",
        idempotency_key: "api-payment-g7-b06",
        payment: {
          payment_id: "payment_api_g7_b06",
          tenant_id: TENANT,
          bank_reference: "bank-overpayment-hidden",
          amount: 160000,
          currency: "KRW",
        },
      }),
    });
    assert.equal(overpayment.status, 201);

    const partialMatch = await json(baseUrl, "/api/finance/payment-matches", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_cmp_g7_write",
        audit_hint_ref: "audit_hint_cmp_g7_write",
        actor_id: "user_cmp_g7_finance",
        idempotency_key: "api-payment-match-g7-b06-partial",
        match: {
          payment_match_id: "payment_match_api_g7_b06_partial",
          tenant_id: TENANT,
          payment_id: "payment_api_g7_b06",
          invoice_id: "invoice_api_g7_b05",
          amount: 70000,
        },
      }),
    });
    assert.equal(partialMatch.status, 201);
    assert.equal(partialMatch.body.invoice.status, "partially_paid");
    assert.equal(partialMatch.body.invoice.amount_paid, 70000);
    assert.equal(partialMatch.body.payment.status, "partially_matched");
    assert.equal(partialMatch.body.payment.unapplied_amount, 90000);

    const finalMatch = await json(baseUrl, "/api/finance/payment-matches", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_cmp_g7_write",
        audit_hint_ref: "audit_hint_cmp_g7_write",
        actor_id: "user_cmp_g7_finance",
        idempotency_key: "api-payment-match-g7-b06-final",
        match: {
          payment_match_id: "payment_match_api_g7_b06_final",
          tenant_id: TENANT,
          payment_id: "payment_api_g7_b06",
          invoice_id: "invoice_api_g7_b05",
          amount: 70000,
        },
      }),
    });
    assert.equal(finalMatch.status, 201);
    assert.equal(finalMatch.body.invoice.status, "paid");
    assert.equal(finalMatch.body.payment.status, "partially_matched");
    assert.equal(finalMatch.body.payment.unapplied_amount, 20000);

    const audit = await json(baseUrl, `/api/finance/audit?${BASE_QUERY}`);
    assert.ok(audit.body.items.some((event) => event.action === "time.entry.approve_for_wip"));
    assert.ok(audit.body.items.some((event) => event.action === "expense.create"));
    assert.ok(audit.body.items.some((event) => event.action === "disbursement.create"));
    assert.ok(audit.body.items.some((event) => event.action === "wip.snapshot.lock"));
    assert.ok(audit.body.items.some((event) => event.action === "prebill.approve_without_adjustment"));
    assert.ok(audit.body.items.some((event) => event.action === "prebill.reject"));
    assert.ok(audit.body.items.some((event) => event.action === "invoice.issue"));
    assert.ok(audit.body.items.some((event) => event.action === "payment.match"));
    assert.ok(audit.body.items.some((event) => event.reason === "finance_scope_required:finance.approve"));
  }, { financeRepository });
});

test("G7 accounting CSV export filters period and balances journal rows", async () => {
  const financeRepository = createFinanceRepository({
    seedRecords: [
      {
        model_type: "JournalEntry",
        journal_entry_id: "journal_api_g7_july",
        tenant_id: TENANT,
        matter_id: "matter_rp05_synthetic_opening",
        source_ref: "invoice_api_g7_july",
        currency: "KRW",
        posted_at: "2026-07-05T00:00:00.000Z",
        lines: [
          { account: "ar", debit: 100000, credit: 0 },
          { account: "revenue", debit: 0, credit: 100000 },
        ],
      },
      {
        model_type: "JournalEntry",
        journal_entry_id: "journal_api_g7_june",
        tenant_id: TENANT,
        matter_id: "matter_rp05_synthetic_opening",
        source_ref: "invoice_api_g7_june",
        currency: "KRW",
        posted_at: "2026-06-20T00:00:00.000Z",
        lines: [
          { account: "ar", debit: 50000, credit: 0 },
          { account: "revenue", debit: 0, credit: 50000 },
        ],
      },
    ],
  });

  await withServer(async (baseUrl) => {
    const exported = await json(
      baseUrl,
      `/api/finance/accounting-export.csv?${BASE_QUERY}&from_date=2026-07-01&to_date=2026-07-31&idempotency_key=api-accounting-export-g7-b17`,
    );
    assert.equal(exported.status, 201);
    assert.equal(exported.body.item.row_count, 2);
    assert.equal(exported.body.item.debit_total, 100000);
    assert.equal(exported.body.item.credit_total, 100000);
    assert.equal(exported.body.item.balanced, true);
    assert.equal(exported.body.item.bank_reference_included, false);
    assert.equal(exported.body.item.credential_material_included, false);
    assert.equal(exported.body.item.raw_journal_payload_included, false);
    assert.match(exported.body.item.csv_text, /^journal_entry_id,posting_date,source_ref,matter_id,account,debit,credit,currency/);
    assert.match(exported.body.item.csv_text, /journal_api_g7_july/);
    assert.doesNotMatch(exported.body.item.csv_text, /journal_api_g7_june/);

    const replay = await json(
      baseUrl,
      `/api/finance/accounting-export.csv?${BASE_QUERY}&from_date=2026-07-01&to_date=2026-07-31&idempotency_key=api-accounting-export-g7-b17`,
    );
    assert.equal(replay.status, 200);
    assert.equal(replay.body.outcome, "idempotent_replay");

    const audit = await json(baseUrl, `/api/finance/audit?${BASE_QUERY}`);
    assert.ok(audit.body.items.some((event) => event.action === "accounting.export.csv.create"));
    const readAudit = audit.body.items.find(
      (event) =>
        event.action === "finance:accounting_export:read" &&
        event.object_type === "accounting_export" &&
        event.decision === "allow",
    );
    assert.ok(readAudit);
    assert.equal(readAudit.metadata.sensitive_read_audit_required, true);
    assert.equal(readAudit.metadata.export_content_included_in_audit, false);
    assert.equal(readAudit.metadata.raw_payload_included, false);
    assert.equal(readAudit.metadata.credential_material_included, false);
  }, { financeRepository });
});
