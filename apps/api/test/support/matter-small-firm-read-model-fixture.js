import assert from "node:assert/strict";

import { createFinanceRepository } from "../../../../packages/billing/src/finance-repository.js";
import { createMatterRepository } from "../../../../packages/matter/src/repository.js";
import { handleMatterSmallFirmApiRequest } from "../../src/matter-small-firm-api.js";
import { createMatterSmallFirmRuntimeContext } from "../../src/matter-small-firm-runtime-context.js";

export const RFD026_TENANT = "tenant_rfd_tuw_026";
export const RFD026_NOW = "2026-07-30T02:00:00.000Z";

const FINANCE_LANES = Object.freeze(["missing_time", "wip", "ar"]);

function matter(suffix) {
  return {
    model_type: "Matter",
    tenant_id: RFD026_TENANT,
    matter_id: `matter_${suffix}`,
    client_id: `client_${suffix}`,
    matter_code: `RFD026-${suffix.toUpperCase()}`,
    title: `Matter ${suffix}`,
    status: "open",
    created_by: "user_owner",
    created_at: "2026-07-01T00:00:00.000Z",
    permission_envelope_id: `permission_${suffix}`,
    audit_trace_id: `audit_${suffix}`,
  };
}

function timeEntry(suffix, day, durationMinutes) {
  return {
    model_type: "TimeEntry",
    tenant_id: RFD026_TENANT,
    time_entry_id: `time_${suffix}_${day}`,
    matter_id: `matter_${suffix}`,
    actor_id: `actor_${suffix}`,
    work_date: day === "mon" ? "2026-07-27" : "2026-07-28",
    duration_minutes: durationMinutes,
    billable: true,
    status: "locked",
    approved_for_wip: true,
    currency: "KRW",
  };
}

function wip(suffix, sourceId, amount) {
  return {
    model_type: "WipItem",
    tenant_id: RFD026_TENANT,
    wip_item_id: `wip_${suffix}`,
    matter_id: `matter_${suffix}`,
    source_model_type: "TimeEntry",
    source_id: sourceId,
    amount,
    currency: "KRW",
    status: "ready",
  };
}

function invoice({ id, suffix, number, due, paid, dueDate }) {
  return {
    model_type: "Invoice",
    tenant_id: RFD026_TENANT,
    invoice_id: id,
    invoice_number: number,
    matter_id: `matter_${suffix}`,
    billing_client_party_id: `client_${suffix}`,
    amount_due: due,
    amount_paid: paid,
    currency: "KRW",
    due_date: dueDate,
    status: "sent",
  };
}

function expectedItem(overrides) {
  return {
    matter_id: null,
    owner_user_id: null,
    status: null,
    due_at: null,
    amount: null,
    currency: null,
    source_ref: null,
    error_code: null,
    ...overrides,
  };
}

export function createRfd026TodayFinanceFixture() {
  const matterRepository = createMatterRepository({
    seedRecords: [matter("alpha"), matter("zeta")],
  });
  const financeRepository = createFinanceRepository({
    seedRecords: [
      timeEntry("zeta", "tue", 120),
      timeEntry("alpha", "mon", 60),
      wip("zeta", "time_zeta_tue", 220000),
      wip("alpha", "time_alpha_mon", 110000),
      invoice({
        id: "invoice_current",
        suffix: "alpha",
        number: "INV-026-CURRENT",
        due: 250000,
        paid: 50000,
        dueDate: "2026-07-31",
      }),
      invoice({
        id: "invoice_overdue",
        suffix: "zeta",
        number: "INV-026-OVERDUE",
        due: 400000,
        paid: 100000,
        dueDate: "2026-06-15",
      }),
    ],
  });
  const emptyFinanceRepository = createFinanceRepository();
  const principal = {
    tenant_id: RFD026_TENANT,
    user_id: "user_owner",
    role_ids: ["owner"],
  };
  const contexts = {
    allow: {
      principal,
      rules: [{ id: "allow_rfd026_reads", effect: "allow", action: "*" }],
      object_acl: [],
    },
    denyFinance: {
      principal,
      rules: [{ id: "allow_rfd026_matter_only", effect: "allow", action: "matter:ops:read" }],
      object_acl: [],
    },
  };

  return Object.freeze({
    callToday({ requestId, access = "allow", data = "populated" }) {
      return handleMatterSmallFirmApiRequest({
        pathname: "/api/matter/ops/today",
        method: "GET",
        query: {
          tenant_id: RFD026_TENANT,
          permission_ref: "rfd_tuw_026_finance_adapter",
          audit_hint_ref: "rfd_tuw_026_finance_adapter_test",
          as_of: RFD026_NOW,
        },
        body: {},
        context: contexts[access],
        requestId,
        runtime: createMatterSmallFirmRuntimeContext({
          matterRepository,
          financeRepository: data === "empty" ? emptyFinanceRepository : financeRepository,
          now: () => new Date(RFD026_NOW),
        }),
      });
    },
    close() {
      matterRepository.close();
      financeRepository.close();
      emptyFinanceRepository.close();
    },
  });
}

export function assertPopulatedFinanceToday(response) {
  assert.equal(response.status, 200);
  const today = response.body.item;
  assert.equal(today.finance_state, "populated");
  assert.equal(today.total_item_count, 6);
  assert.deepEqual(today.lanes.slice(-3).map(({ id, count }) => ({ id, count })), [
    { id: "missing_time", count: 2 },
    { id: "wip", count: 2 },
    { id: "ar", count: 2 },
  ]);
  assert.deepEqual(today.by_id.missing_time.items, [
    expectedItem({
      item_id: "time-gap:actor_alpha:2026-07-27",
      source_type: "time_gap",
      title: "actor_alpha",
      status: "incomplete",
    }),
    expectedItem({
      item_id: "time-gap:actor_zeta:2026-07-27",
      source_type: "time_gap",
      title: "actor_zeta",
      status: "incomplete",
    }),
  ]);
  assert.deepEqual(today.by_id.wip.items, [
    expectedItem({
      item_id: "wip_alpha",
      source_type: "wip",
      matter_id: "matter_alpha",
      title: "matter_alpha WIP",
      status: "ready",
      amount: 110000,
      currency: "KRW",
    }),
    expectedItem({
      item_id: "wip_zeta",
      source_type: "wip",
      matter_id: "matter_zeta",
      title: "matter_zeta WIP",
      status: "ready",
      amount: 220000,
      currency: "KRW",
    }),
  ]);
  assert.deepEqual(today.by_id.wip.amounts_by_currency, { KRW: 330000 });
  assert.deepEqual(today.by_id.ar.items, [
    expectedItem({
      item_id: "invoice_overdue",
      source_type: "receivable",
      matter_id: "matter_zeta",
      title: "INV-026-OVERDUE",
      status: "overdue",
      due_at: "2026-06-15",
      amount: 300000,
      currency: "KRW",
    }),
    expectedItem({
      item_id: "invoice_current",
      source_type: "receivable",
      matter_id: "matter_alpha",
      title: "INV-026-CURRENT",
      status: "partial",
      due_at: "2026-07-31",
      amount: 200000,
      currency: "KRW",
    }),
  ]);
  assert.deepEqual(today.by_id.ar.amounts_by_currency, { KRW: 500000 });
}

export function assertFinanceAccessState(response, expectedState) {
  assert.equal(response.status, 200);
  assert.equal(response.body.item.finance_state, expectedState);
  assert.deepEqual(
    FINANCE_LANES.map((id) => ({ id, count: response.body.item.by_id[id].count })),
    FINANCE_LANES.map((id) => ({ id, count: 0 })),
  );
}
