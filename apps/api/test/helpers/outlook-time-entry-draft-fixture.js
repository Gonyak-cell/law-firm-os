import { createFinanceRepository } from "../../../../packages/billing/src/finance-repository.js";
import { createInMemoryHrxRepository } from "../../../../packages/hrx/src/repository.js";
import { createMatterRepository } from "../../../../packages/matter/src/repository.js";
import { handleOutlookAddinApiRequest } from "../../src/outlook-addin-runtime-context.js";

export const TENANT = "tenant_outlook_time_entry_test";
export const MATTER = "matter_outlook_time_entry_test";
export const ACTOR = "user_outlook_time_entry_test";
export const EMPLOYEE = "employee_outlook_time_entry_test";

export function permissionContext({ finance = true, matter = true } = {}) {
  return Object.freeze({
    principal: Object.freeze({
      tenant_id: TENANT,
      user_id: ACTOR,
      role_ids: Object.freeze(["outlook_addin_user"]),
      scopes: Object.freeze(["matter.read", "finance.time.write"]),
    }),
    rules: Object.freeze([
      ...(matter ? [{ id: "allow-matter", effect: "allow", action: "outlook:matter:read" }] : []),
      ...(finance ? [{ id: "allow-time", effect: "allow", action: "finance:time:write" }] : []),
    ]),
    object_acl: Object.freeze([]),
  });
}

export function createMatterFixture() {
  return createMatterRepository({
    seedRecords: [{
      model_type: "Matter",
      tenant_id: TENANT,
      matter_id: MATTER,
      matter_code: "OUTLOOK/TIME/001",
      client_id: "client_outlook_time_entry_test",
      title: "Outlook time-entry draft test",
      status: "open",
      created_by: ACTOR,
      created_at: "2026-08-08T00:00:00.000Z",
      permission_envelope_id: "perm:outlook:time-entry",
      audit_trace_id: "audit:outlook:time-entry",
    }],
  });
}

export function createEmployeeFixture({ employeeStatus = "active", profileStatus = "active" } = {}) {
  return createInMemoryHrxRepository({
    employees: [{
      tenant_id: TENANT,
      employee_id: EMPLOYEE,
      display_name: "Outlook time entry user",
      status: employeeStatus,
    }],
    employment_profiles: [{
      tenant_id: TENANT,
      profile_id: "profile_outlook_time_entry_test",
      employee_id: EMPLOYEE,
      employment_type: "full_time",
      status: profileStatus,
      effective_from: "2025-01-01",
    }],
    employee_user_links: [{
      tenant_id: TENANT,
      link_id: "link_outlook_time_entry_test",
      employee_id: EMPLOYEE,
      user_id: ACTOR,
      purpose: "login_mapping",
    }],
  });
}

export function financeSeed({ roleRates = [{ role_id: "partner", hourly_rate: 400000 }] } = {}) {
  return [{
    model_type: "RateCard",
    rate_card_id: "rate_outlook_time_entry_test",
    tenant_id: TENANT,
    currency: "KRW",
    effective_from: "2026-01-01",
    status: "active",
    role_rates: roleRates,
  }, {
    model_type: "FeeArrangement",
    fee_arrangement_id: "fee_outlook_time_entry_test",
    tenant_id: TENANT,
    matter_id: MATTER,
    rate_card_id: "rate_outlook_time_entry_test",
    status: "active",
    effective_from: "2026-01-01",
  }];
}

export function createFinanceFixture(options = {}) {
  return createFinanceRepository({ seedRecords: financeSeed(options) });
}

export function runtime({
  finance,
  matters,
  employeeRepository = createEmployeeFixture(),
  employees = [{ tenant_id: TENANT, user_id: ACTOR, employee_id: EMPLOYEE, status: "active", payroll_category: "partner" }],
  resolveTimeEntryRole,
} = {}) {
  return Object.freeze({
    financeRuntime: Object.freeze({
      repository: finance,
      matterRepository: matters,
      employeeRepository,
      employees: Object.freeze([...employees]),
      ...(resolveTimeEntryRole ? { resolveTimeEntryRole } : {}),
    }),
    matterRuntime: Object.freeze({ repository: matters }),
  });
}

export function requestBody(overrides = {}) {
  return {
    tenant_id: TENANT,
    audit_hint_ref: "audit:outlook:time-entry-request",
    idempotency_key: "outlook-time-entry-draft-001",
    matter_id: MATTER,
    work_date: "2026-08-08",
    narrative: "상대방 이메일 검토 및 대응 방향 정리",
    duration_minutes: 30,
    billable: true,
    item_context_key: "outlook-item-context-001",
    ...overrides,
  };
}

export function invoke({ body = requestBody(), context = permissionContext(), runtime: routeRuntime }) {
  return handleOutlookAddinApiRequest({
    pathname: "/api/outlook/time-entry-drafts",
    method: "POST",
    body,
    context,
    requestId: "request-outlook-time-entry-test",
    runtime: routeRuntime,
  });
}
