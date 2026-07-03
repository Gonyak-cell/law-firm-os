#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createHrxAuditEventStore } from "../packages/audit/src/hrx-event-store.js";
import { createInMemoryLeaveBalanceLedger } from "../packages/hrx/src/leave/balance.js";
import {
  createInMemoryLeaveRequestStore,
  createLeaveRequestService,
} from "../packages/hrx/src/leave/request-service.js";
import {
  calculateKoreanAnnualPaidLeaveEntitlement,
  createLeaveAccrualLedgerEntry,
  createLeaveCarryoverLedgerEntry,
} from "../packages/hrx/src/rules/leave-policy.js";

const ROOT = process.cwd();
const ARTIFACT_DIR = "artifacts/manual-qa";
const JSON_PATH = `${ARTIFACT_DIR}/upl-d03-hrx-leave-accrual-approval-proof-2026-07-03.json`;
const MD_PATH = `${ARTIFACT_DIR}/upl-d03-hrx-leave-accrual-approval-proof-2026-07-03.md`;
const TENANT = "tenant-a";
const EMPLOYEE = "emp-001";
const MANAGER = "manager-001";

function sha256(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function check(id, passed, evidence = {}) {
  return { id, passed: Boolean(passed), evidence };
}

function basePolicy(overrides = {}) {
  return Object.freeze({
    tenant_id: TENANT,
    policy_id: "kr-annual-leave",
    policy_version: "2026.1",
    leave_type: "annual_paid_leave",
    accrual_unit: "days",
    accrual_rate_per_month: 1,
    annual_entitlement: 15,
    carryover_limit: 5,
    negative_balance_allowed: false,
    max_negative_balance: 0,
    effective_from: "2026-01-01",
    ...overrides,
  });
}

async function approvalScenario({ policy, earned, amount, requestId }) {
  const audit = createHrxAuditEventStore();
  const ledger = createInMemoryLeaveBalanceLedger();
  ledger.append({
    tenant_id: TENANT,
    entry_id: `${requestId}-earned`,
    employee_id: EMPLOYEE,
    policy_id: policy.policy_id,
    entry_type: "earned",
    amount: earned,
    occurred_on: "2026-07-01",
    source_ref: `UPL-D03:${requestId}:earned`,
  });
  const service = createLeaveRequestService({
    store: createInMemoryLeaveRequestStore(),
    balanceLedger: ledger,
    audit,
    policyResolver: () => policy,
  });
  const context = Object.freeze({ tenant_id: TENANT, actor_id: MANAGER });
  await service.submit(context, {
    request_id: requestId,
    employee_id: EMPLOYEE,
    policy_id: policy.policy_id,
    leave_type: policy.leave_type,
    amount,
    start_date: "2026-07-10",
    end_date: "2026-07-10",
  });
  try {
    const approved = await service.approve(context, { request_id: requestId, approver_id: MANAGER });
    return {
      status: "approved",
      request_hash: sha256(approved),
      balance: ledger.balance({ tenant_id: TENANT, employee_id: EMPLOYEE, policy_id: policy.policy_id }),
      audit_events: audit.list({ tenant_id: TENANT }).map((event) => ({
        event_id: event.event_id,
        action: event.action,
        object_id: event.object_id,
      })),
    };
  } catch (error) {
    return {
      status: "rejected_before_ledger_debit",
      safe_error_code: error.safe_error_code ?? null,
      balance: ledger.balance({ tenant_id: TENANT, employee_id: EMPLOYEE, policy_id: policy.policy_id }),
      audit_events: audit.list({ tenant_id: TENANT }).map((event) => ({
        event_id: event.event_id,
        action: event.action,
        object_id: event.object_id,
      })),
    };
  }
}

mkdirSync(join(ROOT, ARTIFACT_DIR), { recursive: true });

const entitlementCases = [
  { id: "under-one-year-monthly", input: { service_months: 7 }, expected: 7 },
  { id: "one-year-eighty-percent", input: { service_months: 12, yearly_attendance_rate: 0.8 }, expected: 15 },
  { id: "three-year-seniority-addition", input: { service_months: 36, years_of_service: 3 }, expected: 16 },
  { id: "twenty-five-day-cap", input: { service_months: 300, years_of_service: 25 }, expected: 25 },
].map((item) => ({
  ...item,
  actual: calculateKoreanAnnualPaidLeaveEntitlement(item.input),
}));

const accrual = createLeaveAccrualLedgerEntry({
  tenant_id: TENANT,
  employee_id: EMPLOYEE,
  policy: basePolicy(),
  occurred_on: "2026-01-01",
  service_months: 12,
  yearly_attendance_rate: 0.95,
});
const carryover = createLeaveCarryoverLedgerEntry({
  tenant_id: TENANT,
  employee_id: EMPLOYEE,
  policy: basePolicy(),
  occurred_on: "2026-01-01",
  closing_balance: 12,
});
const flexibleApproval = await approvalScenario({
  policy: basePolicy({ negative_balance_allowed: true, max_negative_balance: 4 }),
  earned: 4,
  amount: 8,
  requestId: "upl-d03-flexible-approval",
});
const strictBlock = await approvalScenario({
  policy: basePolicy(),
  earned: 4,
  amount: 8,
  requestId: "upl-d03-strict-block",
});

const checks = [
  check("korean-statutory-entitlement-cases", entitlementCases.every((item) => item.actual === item.expected), entitlementCases),
  check("accrual-ledger-entry-earned", accrual.entry_type === "earned" && accrual.amount === 15 && accrual.metadata.statutory_basis === "KR_LSA_ARTICLE_60", {
    entry_id: accrual.entry_id,
    entry_type: accrual.entry_type,
    amount: accrual.amount,
    statutory_basis: accrual.metadata.statutory_basis,
  }),
  check("carryover-ledger-entry-capped", carryover.entry_type === "carryover" && carryover.amount === 5, {
    entry_id: carryover.entry_id,
    entry_type: carryover.entry_type,
    amount: carryover.amount,
  }),
  check("approval-path-uses-policy-to-allow-bounded-negative-balance", flexibleApproval.status === "approved" && flexibleApproval.balance.available_balance === -4, {
    status: flexibleApproval.status,
    available_balance: flexibleApproval.balance.available_balance,
    used_balance: flexibleApproval.balance.used_balance,
    audit_event_count: flexibleApproval.audit_events.length,
  }),
  check("approval-path-blocks-strict-policy-before-ledger-debit", strictBlock.status === "rejected_before_ledger_debit" && strictBlock.safe_error_code === "HRX_LEAVE_BALANCE_INSUFFICIENT" && strictBlock.balance.used_balance === 0, {
    status: strictBlock.status,
    safe_error_code: strictBlock.safe_error_code,
    used_balance: strictBlock.balance.used_balance,
    audit_event_count: strictBlock.audit_events.length,
  }),
];

const receipt = {
  schema_version: "law-firm-os.wave1.upl_d03.hrx_leave_accrual_approval.v0.1",
  generated_at: new Date().toISOString(),
  tuw_ids: ["UPL-D-03"],
  pass: checks.every((item) => item.passed),
  scope: "Korean statutory annual leave entitlement, accrual/carryover ledger entry generation, and approval-path policy usage.",
  tenant_id: TENANT,
  request_hashes: {
    flexible_approval: flexibleApproval.request_hash ?? null,
    strict_block: sha256(strictBlock),
  },
  audit_event_refs: {
    flexible_approval: flexibleApproval.audit_events.map((event) => event.event_id),
    strict_block: strictBlock.audit_events.map((event) => event.event_id),
  },
  checks,
  raw_salary_body_included: false,
  raw_document_body_included: false,
  raw_client_secret_included: false,
  production_ready_claim: false,
};

writeFileSync(join(ROOT, JSON_PATH), `${JSON.stringify(receipt, null, 2)}\n`);
writeFileSync(
  join(ROOT, MD_PATH),
  `# UPL D03 HRX Leave Accrual Approval Proof\n\nGenerated at: ${receipt.generated_at}\n\n- PASS: ${receipt.pass}\n- Production ready claim: false\n- Raw salary/document/client secret included: false\n\n## Checks\n\n${checks.map((item) => `- ${item.passed ? "PASS" : "FAIL"} ${item.id}`).join("\n")}\n`,
);
console.log(JSON.stringify({ pass: receipt.pass, artifact: JSON_PATH, checks: checks.length }, null, 2));
if (!receipt.pass) process.exitCode = 1;
