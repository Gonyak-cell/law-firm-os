import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  autoClassifyBankTransactions,
  reviewBankTransactionClassifications,
} from "../../billing/src/bank-classification-service.js";
import {
  buildClientDepositRevenue,
} from "../../billing/src/client-deposit-revenue-service.js";
import {
  normalizeClientDepositAllocation,
} from "../../billing/src/client-deposit-allocation-model.js";
import {
  normalizeFeeCommitment,
} from "../../billing/src/fee-commitment-model.js";
import {
  createFinanceRepository,
} from "../../billing/src/finance-repository.js";
import {
  createClientOperationsReadModel,
  resolveClientOperationsAccessScope,
} from "../src/client-operations-read-model.js";

const TENANT = "tenant_client_operations_t01";
const STAFF = "principal_staff";

function repository(records, events = [], source = "repository") {
  return {
    list(query = {}) {
      events.push(`${source}:${query.model_type}`);
      return records.filter((record) => (
        (!query.tenant_id || record.tenant_id === query.tenant_id)
        && (
          !query.model_type
          || record.model_type === query.model_type
        )
      ));
    },
  };
}

function fixturePermissionContext() {
  return {
    principal: {
      user_id: "principal_partner",
      tenant_id: TENANT,
      role_ids: ["lawos_partner"],
    },
    rules: [
      {
        id: "partner-client-read",
        effect: "allow",
        action: "analytics:client:read",
      },
      {
        id: "partner-inquiry-read",
        effect: "allow",
        action: "crm:inquiry:read",
      },
      {
        id: "partner-consultation-read",
        effect: "allow",
        action: "crm:consultation:read",
      },
      {
        id: "partner-bank-classification-read",
        effect: "allow",
        action: "finance:bank_classification:read",
      },
    ],
    object_acl: [],
  };
}

function fixtureFinanceRepository(input) {
  const actorId = "principal_partner";
  const clients = input.clients.map((client) => ({
    model_type: "ClientGroup",
    tenant_id: TENANT,
    client_group_id: client.client_group_id,
    display_name: client.display_name,
    names: client.names,
    approved_aliases: client.approved_aliases,
    status: "active",
  }));
  const transactions = input.bank_transactions.map((transaction) => ({
    model_type: "BankTransaction",
    bank_transaction_id: transaction.bank_transaction_id,
    tenant_id: TENANT,
    account_ref: "account-client-kpi-fixture",
    transaction_fingerprint: transaction.fingerprint,
    date: transaction.occurred_at.slice(0, 10),
    occurred_at: transaction.occurred_at,
    direction: transaction.direction,
    amount: transaction.amount,
    balance_after: transaction.amount,
    currency: "KRW",
    method: "bank_transfer",
    counterparty: transaction.counterparty,
    memo: null,
    source_category: transaction.refund_of_bank_transaction_id
      ? "고객 환불"
      : "미분류",
    classification_scope: "unreviewed",
    status: "posted",
    source_refs: [],
  }));
  const financeRepository = createFinanceRepository({
    seedRecords: transactions,
  });
  autoClassifyBankTransactions({
    repository: financeRepository,
    tenant_id: TENANT,
    client_records: clients,
    actor_id: actorId,
    idempotency_key: "client-kpi-fixture-classification",
  });
  const refund = input.bank_transactions.find(
    ({ refund_of_bank_transaction_id }) => (
      Boolean(refund_of_bank_transaction_id)
    ),
  );
  reviewBankTransactionClassifications({
    repository: financeRepository,
    tenant_id: TENANT,
    decisions: [{
      bank_transaction_id: refund.bank_transaction_id,
      category: "refund_reversal",
      refund_of_bank_transaction_id:
        refund.refund_of_bank_transaction_id,
    }],
    actor_id: actorId,
    idempotency_key: "client-kpi-fixture-refund",
  });
  for (const commitment of input.fee_commitments) {
    financeRepository.create(normalizeFeeCommitment({
      ...commitment,
      tenant_id: TENANT,
      opportunity_id:
        `opportunity-${commitment.fee_commitment_id}`,
      matter_id: null,
      currency: "KRW",
      source_fee_arrangement_id: null,
      state_version: 1,
      created_by: actorId,
      updated_by: actorId,
      reason: "기준 fixture 수임료",
    }));
  }
  for (const allocation of input.deposit_allocations) {
    const classification = financeRepository.list({
      tenant_id: TENANT,
      model_type: "BankTransactionClassification",
    }).find(({ bank_transaction_id }) => (
      bank_transaction_id === allocation.bank_transaction_id
    ));
    financeRepository.create(normalizeClientDepositAllocation({
      ...allocation,
      tenant_id: TENANT,
      client_group_id: input.fee_commitments.find(
        ({ fee_commitment_id }) => (
          fee_commitment_id === allocation.fee_commitment_id
        ),
      ).client_group_id,
      bank_transaction_classification_id:
        classification.bank_transaction_classification_id,
      currency: "KRW",
      state_version: 1,
      allocated_at: input.as_of,
      created_by: actorId,
      updated_by: actorId,
      reason: "기준 fixture 입금 연결",
    }));
  }
  return financeRepository;
}

function fixtureMasterDataRecords(input) {
  return input.clients.map((client) => ({
    model_type: "ClientGroup",
    tenant_id: TENANT,
    client_group_id: client.client_group_id,
    display_name: client.display_name,
    member_party_ids: [`party-${client.client_group_id}`],
    primary_party_id: `party-${client.client_group_id}`,
    status: "active",
  }));
}

function fixtureCrmRecords(input) {
  const leads = input.inquiries.map((inquiry) => ({
    model_type: "Lead",
    tenant_id: TENANT,
    lead_id: inquiry.lead_id,
    party_id: `party-${inquiry.client_group_id}`,
    client_group_id: inquiry.client_group_id,
    display_name: inquiry.lead_id,
    inquiry_status: inquiry.inquiry_status,
    source: inquiry.source,
    received_at: inquiry.received_at,
    next_action: inquiry.inquiry_status === "closed"
      ? null
      : "문의 확인",
    assigned_user_id: inquiry.assigned_user_id,
    opportunity_id: inquiry.opportunity_id,
    status: "active",
    owner_user_id:
      inquiry.assigned_user_id ?? "principal_partner",
    version: 1,
  }));
  const opportunities = input.inquiries
    .filter(({ opportunity_id }) => Boolean(opportunity_id))
    .map((inquiry) => ({
      model_type: "Opportunity",
      tenant_id: TENANT,
      opportunity_id: inquiry.opportunity_id,
      lead_id: inquiry.lead_id,
      party_id: `party-${inquiry.client_group_id}`,
      display_name: inquiry.opportunity_id,
      stage: inquiry.engagement_decision === "declined"
        ? "closed_lost"
        : "qualified",
      engagement_decision: inquiry.engagement_decision,
      engagement_client_group_id: inquiry.client_group_id,
      status: "active",
      owner_user_id: inquiry.assigned_user_id,
    }));
  const consultations = input.consultations.map((consultation) => {
    const inquiry = input.inquiries.find(
      ({ lead_id }) => lead_id === consultation.lead_id,
    );
    return {
      model_type: "CRMActivity",
      tenant_id: TENANT,
      crm_activity_id: consultation.activity_id,
      lead_id: consultation.lead_id,
      party_id: `party-${inquiry.client_group_id}`,
      activity_type: "meeting",
      activity_kind: "consultation",
      subject: "법률 상담",
      confidential: false,
      scheduled_start: consultation.scheduled_start,
      scheduled_end: consultation.scheduled_end,
      timezone: consultation.timezone,
      completed_at: consultation.completed_at,
      status: "active",
      owner_user_id: "principal_partner",
      version: 1,
    };
  });
  return [...leads, ...opportunities, ...consultations];
}

function permissionContext() {
  return {
    principal: {
      user_id: STAFF,
      tenant_id: TENANT,
      role_ids: ["lawos_staff"],
    },
    rules: [{
      id: "staff-client-read",
      effect: "allow",
      action: "analytics:client:read",
    }],
    object_acl: [
      {
        id: "deny-hanbit",
        effect: "deny",
        principal_id: STAFF,
        action: "analytics:client:read",
        resource_id: "client_hanbit",
      },
      {
        id: "deny-development",
        effect: "deny",
        principal_id: STAFF,
        action: "analytics:client:read",
        resource_id: "client_development",
      },
    ],
  };
}

function clientGroups(events) {
  return repository([
    {
      model_type: "ClientGroup",
      tenant_id: TENANT,
      client_group_id: "client_hanbit",
      display_name: "한빛건설",
      member_party_ids: ["party_hanbit"],
      primary_party_id: "party_hanbit",
      status: "active",
    },
    {
      model_type: "ClientGroup",
      tenant_id: TENANT,
      client_group_id: "client_development",
      display_name: "한빛개발",
      member_party_ids: [null],
      primary_party_id: 42,
      status: "active",
    },
    {
      model_type: "ClientGroup",
      tenant_id: TENANT,
      client_group_id: "client_saebom",
      display_name: "새봄테크",
      member_party_ids: ["party_saebom"],
      primary_party_id: "party_saebom",
      status: "active",
    },
    {
      model_type: "ClientGroup",
      tenant_id: "tenant_other",
      client_group_id: "client_other",
      display_name: "다른 사무실 고객",
      member_party_ids: ["party_other"],
      status: "active",
    },
  ], events, "master-data");
}

function financeRecords(events) {
  return repository([
    {
      model_type: "BankTransaction",
      bank_transaction_id: "deposit_saebom",
      tenant_id: TENANT,
      account_ref: "account_client_t01",
      transaction_fingerprint: "a".repeat(64),
      date: "2026-07-30",
      occurred_at: "2026-07-30T01:00:00.000Z",
      direction: "inflow",
      amount: 5_000_000,
      currency: "KRW",
    },
    {
      model_type: "BankTransactionClassification",
      bank_transaction_classification_id: "classification_saebom",
      tenant_id: TENANT,
      bank_transaction_id: "deposit_saebom",
      account_ref: "account_client_t01",
      transaction_date: "2026-07-30",
      transaction_direction: "inflow",
      amount: 5_000_000,
      currency: "KRW",
      category: "client_receipt",
      client_group_id: "client_saebom",
      status: "confirmed",
    },
    {
      model_type: "BankTransaction",
      bank_transaction_id: "deposit_hanbit",
      tenant_id: TENANT,
      account_ref: "account_client_t01",
      transaction_fingerprint: "b".repeat(64),
      date: "2026-07-30",
      occurred_at: "2026-07-30T02:00:00.000Z",
      direction: "inflow",
      amount: 20_000_000,
      currency: "KRW",
    },
    {
      model_type: "BankTransactionClassification",
      bank_transaction_classification_id: "classification_hanbit",
      tenant_id: TENANT,
      bank_transaction_id: "deposit_hanbit",
      account_ref: "account_client_t01",
      transaction_date: "2026-07-30",
      transaction_direction: "inflow",
      amount: 1,
      currency: "KRW",
      category: "client_receipt",
      client_group_id: "client_hanbit",
      status: "confirmed",
    },
  ], events, "finance");
}

test("VC-CL-PERM-001 / CL-P4-W01-T01 고객 권한을 먼저 확정하고 허용 고객 금액만 집계한다", () => {
  const events = [];
  const readModel = createClientOperationsReadModel({
    masterDataRepository: clientGroups(events),
    financeRepository: financeRecords(events),
    crmRepository: {
      list() {
        throw new Error("CRM must not be read by the access-scope TUW");
      },
    },
    matterRepository: {
      list() {
        throw new Error("Matter must not be read by the access-scope TUW");
      },
    },
  });

  const result = readModel.read({
    tenant_id: TENANT,
    permission_context: permissionContext(),
    project({ access_scope, financeRepository }) {
      assert.deepEqual(events, ["master-data:ClientGroup"]);
      return buildClientDepositRevenue({
        repository: financeRepository,
        tenant_id: TENANT,
        permitted_client_records:
          access_scope.permitted_client_records,
        from: "2026-07-01",
        to: "2026-07-31",
      });
    },
  });

  assert.equal(result.downstream_sources_read, true);
  assert.equal(result.access_scope.access_state, "allowed");
  assert.deepEqual(
    result.access_scope.allowed_client_group_ids,
    ["client_saebom"],
  );
  assert.deepEqual(
    result.access_scope.allowed_party_ids,
    ["party_saebom"],
  );
  assert.equal(
    result.access_scope.client_group_id_by_party_id.party_saebom,
    "client_saebom",
  );
  assert.equal(result.item.totals.net_deposit_revenue, 5_000_000);
  assert.deepEqual(
    result.item.ranking.map(({ client_group_id }) => client_group_id),
    ["client_saebom"],
  );
  assert.equal(
    JSON.stringify(result).includes("client_hanbit"),
    false,
  );
  assert.equal(
    JSON.stringify(result).includes("20000000"),
    false,
  );
  assert.equal(result.access_scope.count_leak_prevented, true);
  assert.equal(
    result.access_scope.unauthorized_count_included,
    false,
  );
  assert.equal(
    result.access_scope.unauthorized_amount_included,
    false,
  );
  assert.deepEqual(events, [
    "master-data:ClientGroup",
    "finance:BankTransaction",
    "finance:BankTransactionClassification",
  ]);
});

test("CL-P4-W01-T01 허용 고객이 없으면 Finance·CRM·Matter 원천을 읽지 않는다", () => {
  const events = [];
  const readModel = createClientOperationsReadModel({
    masterDataRepository: clientGroups(events),
    financeRepository: {
      list() {
        throw new Error("Finance source must not be read");
      },
    },
    crmRepository: {
      list() {
        throw new Error("CRM source must not be read");
      },
    },
    matterRepository: {
      list() {
        throw new Error("Matter source must not be read");
      },
    },
  });
  let projected = false;
  const result = readModel.read({
    tenant_id: TENANT,
    permission_context: {
      principal: {
        user_id: STAFF,
        tenant_id: TENANT,
        role_ids: ["lawos_staff"],
      },
      rules: [],
      object_acl: [],
    },
    project() {
      projected = true;
      throw new Error("project must not run");
    },
  });

  assert.equal(projected, false);
  assert.equal(result.downstream_sources_read, false);
  assert.equal(result.item, null);
  assert.equal(result.access_scope.access_state, "no_access");
  assert.deepEqual(result.access_scope.allowed_client_group_ids, []);
  assert.deepEqual(events, ["master-data:ClientGroup"]);
  assert.equal("candidate_count" in result.access_scope, false);
  assert.equal("omitted_count" in result.access_scope, false);
});

test("CL-P4-W01-T01 중복 고객 ID와 여러 고객에 걸친 Party를 fail-closed로 거절한다", () => {
  const context = permissionContext();
  assert.throws(
    () => resolveClientOperationsAccessScope({
      masterDataRepository: {
        list() {
          return [
            {
              model_type: "ClientGroup",
              tenant_id: TENANT,
              client_group_id: "client_duplicate",
              display_name: "고객 하나",
              status: "active",
            },
            {
              model_type: "ClientGroup",
              tenant_id: TENANT,
              client_group_id: "client_duplicate",
              display_name: "고객 둘",
              status: "active",
            },
          ];
        },
      },
      tenant_id: TENANT,
      permission_context: context,
    }),
    /Duplicate ClientGroup ID/,
  );

  assert.throws(
    () => resolveClientOperationsAccessScope({
      masterDataRepository: {
        list() {
          return [
            {
              model_type: "ClientGroup",
              tenant_id: TENANT,
              client_group_id: "client_one",
              display_name: "고객 하나",
              member_party_ids: ["party_shared"],
              status: "active",
            },
            {
              model_type: "ClientGroup",
              tenant_id: TENANT,
              client_group_id: "client_two",
              display_name: "고객 둘",
              member_party_ids: ["party_shared"],
              status: "active",
            },
          ];
        },
      },
      tenant_id: TENANT,
      permission_context: {
        ...context,
        object_acl: [],
      },
    }),
    /Party belongs to more than one permitted ClientGroup/,
  );
});

test("VC-CL-DASH-001 / CL-P4-W01-T02 기준 fixture의 5개 KPI를 현재·오늘·이번 달 기준으로 계산한다", () => {
  const input = JSON.parse(readFileSync(new URL(
    "../../../apps/api/test/fixtures/client-operations-v1/input.json",
    import.meta.url,
  ), "utf8"));
  const expected = JSON.parse(readFileSync(new URL(
    "../../../apps/api/test/fixtures/client-operations-v1/expected-dashboard.json",
    import.meta.url,
  ), "utf8"));
  const financeRepository = fixtureFinanceRepository(input);
  const readModel = createClientOperationsReadModel({
    masterDataRepository: repository(
      fixtureMasterDataRecords(input),
    ),
    crmRepository: repository(fixtureCrmRecords(input)),
    financeRepository,
  });
  try {
    const result = readModel.readKpis({
      tenant_id: TENANT,
      permission_context: fixturePermissionContext(),
      as_of: input.as_of,
      timezone: input.timezone,
    });

    assert.deepEqual(result.item.kpis, expected.kpis);
    assert.deepEqual(result.item.periods, {
      current: expected.as_of,
      today: "2026-07-30",
      deposit_revenue_month: {
        month: "2026-07",
        from: "2026-07-01",
        to: "2026-07-31",
      },
    });
    assert.equal(result.item.currency, "KRW");
    assert.equal(result.item.permission_prefilter_applied, true);
    assert.equal(result.item.unauthorized_count_included, false);
    assert.equal(result.item.unauthorized_amount_included, false);
    assert.equal(result.item.invoice_required, false);
    assert.equal(result.item.matter_required, false);
  } finally {
    financeRepository.close();
  }
});

test("CL-P4-W01-T02 Asia/Seoul 자정과 상태 우선순위를 적용하고 차단 고객·문의·상담은 KPI에서 뺀다", () => {
  const masterDataRepository = repository([
    {
      model_type: "ClientGroup",
      tenant_id: TENANT,
      client_group_id: "client_allowed",
      display_name: "허용 고객",
      member_party_ids: ["party_allowed"],
      primary_party_id: "party_allowed",
      status: "active",
    },
    {
      model_type: "ClientGroup",
      tenant_id: TENANT,
      client_group_id: "client_denied",
      display_name: "차단 고객",
      member_party_ids: ["party_denied"],
      primary_party_id: "party_denied",
      status: "active",
    },
  ]);
  const crmRepository = repository([
    {
      model_type: "Lead",
      tenant_id: TENANT,
      lead_id: "lead_allowed_new",
      party_id: "party_allowed",
      display_name: "허용 새 문의",
      inquiry_status: "new",
      source: "manual",
      received_at: "2026-07-30T15:05:00.000Z",
      next_action: "문의 확인",
      status: "active",
      owner_user_id: "principal_partner",
      version: 1,
    },
    {
      model_type: "Lead",
      tenant_id: TENANT,
      lead_id: "lead_denied_client",
      party_id: "party_denied",
      display_name: "차단 고객 문의",
      inquiry_status: "new",
      source: "manual",
      received_at: "2026-07-30T15:06:00.000Z",
      next_action: "문의 확인",
      status: "active",
      owner_user_id: "principal_partner",
      version: 1,
    },
    {
      model_type: "Lead",
      tenant_id: TENANT,
      lead_id: "lead_consultation",
      party_id: "party_allowed",
      display_name: "상담 예정 문의",
      inquiry_status: "reviewing",
      source: "manual",
      received_at: "2026-07-30T15:06:30.000Z",
      next_action: "상담 준비",
      status: "active",
      owner_user_id: "principal_partner",
      version: 1,
    },
    {
      model_type: "Lead",
      tenant_id: TENANT,
      lead_id: "lead_acl_denied",
      party_id: "party_allowed",
      display_name: "객체 권한 차단 문의",
      inquiry_status: "new",
      source: "manual",
      received_at: "2026-07-30T15:07:00.000Z",
      next_action: "문의 확인",
      status: "active",
      owner_user_id: "principal_partner",
      version: 1,
    },
    {
      model_type: "Lead",
      tenant_id: TENANT,
      lead_id: "lead_accepted",
      party_id: "party_allowed",
      display_name: "수임 확정 문의",
      inquiry_status: "new",
      source: "manual",
      received_at: "2026-07-30T15:08:00.000Z",
      next_action: "문의 확인",
      opportunity_id: "opportunity_accepted",
      status: "active",
      owner_user_id: "principal_partner",
      version: 1,
    },
    {
      model_type: "Lead",
      tenant_id: TENANT,
      lead_id: "lead_review",
      party_id: "party_allowed",
      display_name: "수임 검토 문의",
      inquiry_status: "reviewing",
      source: "manual",
      received_at: "2026-07-30T15:09:00.000Z",
      next_action: "수임 결정",
      opportunity_id: "opportunity_review",
      status: "active",
      owner_user_id: "principal_partner",
      version: 1,
    },
    {
      model_type: "Opportunity",
      tenant_id: TENANT,
      opportunity_id: "opportunity_accepted",
      lead_id: "lead_accepted",
      party_id: "party_allowed",
      display_name: "수임 확정",
      stage: "qualified",
      engagement_decision: "accepted",
      engagement_client_group_id: "client_allowed",
      status: "active",
      owner_user_id: "principal_partner",
    },
    {
      model_type: "Opportunity",
      tenant_id: TENANT,
      opportunity_id: "opportunity_review",
      lead_id: "lead_review",
      party_id: "party_allowed",
      display_name: "수임 검토",
      stage: "qualified",
      engagement_decision: "pending",
      engagement_client_group_id: "client_allowed",
      status: "active",
      owner_user_id: "principal_partner",
    },
    ...[
      {
        id: "consultation_today",
        lead_id: "lead_consultation",
        start: "2026-07-30T15:10:00.000Z",
        completed_at: null,
      },
      {
        id: "consultation_previous_kst_day",
        lead_id: "lead_consultation",
        start: "2026-07-30T14:50:00.000Z",
        completed_at: null,
      },
      {
        id: "consultation_completed",
        lead_id: "lead_consultation",
        start: "2026-07-30T15:20:00.000Z",
        completed_at: "2026-07-30T16:30:00.000Z",
      },
      {
        id: "consultation_acl_denied",
        lead_id: "lead_consultation",
        start: "2026-07-30T15:25:00.000Z",
        completed_at: null,
      },
      {
        id: "consultation_denied_client",
        lead_id: "lead_denied_client",
        start: "2026-07-30T15:15:00.000Z",
        completed_at: null,
      },
    ].map((consultation) => ({
      model_type: "CRMActivity",
      tenant_id: TENANT,
      crm_activity_id: consultation.id,
      lead_id: consultation.lead_id,
      party_id: consultation.lead_id === "lead_denied_client"
        ? "party_denied"
        : "party_allowed",
      activity_type: "meeting",
      activity_kind: "consultation",
      subject: "법률 상담",
      confidential: false,
      scheduled_start: consultation.start,
      scheduled_end: new Date(
        Date.parse(consultation.start) + 60 * 60 * 1_000,
      ).toISOString(),
      timezone: "Asia/Seoul",
      completed_at: consultation.completed_at,
      status: "active",
      owner_user_id: "principal_partner",
      version: 1,
    })),
  ]);
  const financeRepository = createFinanceRepository();
  const context = fixturePermissionContext();
  context.object_acl = [
    {
      id: "deny-client",
      effect: "deny",
      principal_id: "principal_partner",
      action: "analytics:client:read",
      resource_id: "client_denied",
    },
    {
      id: "deny-inquiry",
      effect: "deny",
      principal_id: "principal_partner",
      action: "crm:inquiry:read",
      resource_id: "lead_acl_denied",
    },
    {
      id: "deny-consultation",
      effect: "deny",
      principal_id: "principal_partner",
      action: "crm:consultation:read",
      resource_id: "consultation_acl_denied",
    },
  ];
  const readModel = createClientOperationsReadModel({
    masterDataRepository,
    crmRepository,
    financeRepository,
  });
  try {
    const result = readModel.readKpis({
      tenant_id: TENANT,
      permission_context: context,
      as_of: "2026-07-30T15:30:00.000Z",
    });
    assert.deepEqual(result.item.kpis, {
      new_inquiries: 1,
      consultations_today: 1,
      engagement_reviews: 1,
      deposit_revenue_month: 0,
      receivables_total: 0,
    });
    assert.equal(result.item.periods.today, "2026-07-31");
    const serialized = JSON.stringify(result);
    for (const forbidden of [
      "client_denied",
      "party_denied",
      "lead_denied_client",
      "lead_acl_denied",
      "consultation_acl_denied",
    ]) {
      assert.equal(serialized.includes(forbidden), false);
    }
  } finally {
    financeRepository.close();
  }
});

test("CL-P4-W01-T02 전월 입금의 이번 달 환불은 이번 달 입금 매출을 음수로 표시한다", () => {
  const financeRepository = createFinanceRepository({
    seedRecords: [
      {
        model_type: "BankTransaction",
        bank_transaction_id: "deposit_previous_month",
        tenant_id: TENANT,
        account_ref: "account-client-negative-kpi",
        transaction_fingerprint: "negative-kpi-deposit",
        date: "2026-06-30",
        occurred_at: "2026-06-30T01:00:00.000Z",
        direction: "inflow",
        amount: 3_000_000,
        currency: "KRW",
        status: "posted",
      },
      {
        model_type: "BankTransactionClassification",
        bank_transaction_classification_id:
          "classification_previous_month",
        bank_transaction_id: "deposit_previous_month",
        tenant_id: TENANT,
        client_group_id: "client_allowed",
        transaction_date: "2026-06-30",
        transaction_direction: "inflow",
        amount: 3_000_000,
        currency: "KRW",
        category: "client_receipt",
        status: "confirmed",
      },
      {
        model_type: "BankTransaction",
        bank_transaction_id: "refund_current_month",
        tenant_id: TENANT,
        account_ref: "account-client-negative-kpi",
        transaction_fingerprint: "negative-kpi-refund",
        date: "2026-07-10",
        occurred_at: "2026-07-10T01:00:00.000Z",
        direction: "outflow",
        amount: 1_000_000,
        currency: "KRW",
        status: "posted",
      },
      {
        model_type: "BankTransactionClassification",
        bank_transaction_classification_id:
          "classification_current_refund",
        bank_transaction_id: "refund_current_month",
        refund_of_bank_transaction_id: "deposit_previous_month",
        tenant_id: TENANT,
        client_group_id: "client_allowed",
        transaction_date: "2026-07-10",
        transaction_direction: "outflow",
        amount: 1_000_000,
        currency: "KRW",
        category: "refund_reversal",
        status: "confirmed",
      },
    ],
  });
  const readModel = createClientOperationsReadModel({
    masterDataRepository: repository([{
      model_type: "ClientGroup",
      tenant_id: TENANT,
      client_group_id: "client_allowed",
      display_name: "허용 고객",
      member_party_ids: ["party_allowed"],
      primary_party_id: "party_allowed",
      status: "active",
    }]),
    crmRepository: repository([]),
    financeRepository,
  });
  try {
    const result = readModel.readKpis({
      tenant_id: TENANT,
      permission_context: fixturePermissionContext(),
      as_of: "2026-07-30T03:00:00.000Z",
    });
    assert.equal(
      result.item.kpis.deposit_revenue_month,
      -1_000_000,
    );
    assert.equal(result.item.kpis.receivables_total, 0);
  } finally {
    financeRepository.close();
  }
});

test("CL-P4-W01-T02 CRM 조회 권한이 없으면 0으로 가장하지 않고 원천을 읽기 전에 차단한다", () => {
  let crmReadCount = 0;
  let financeReadCount = 0;
  const readModel = createClientOperationsReadModel({
    masterDataRepository: repository([{
      model_type: "ClientGroup",
      tenant_id: TENANT,
      client_group_id: "client_allowed",
      display_name: "허용 고객",
      member_party_ids: ["party_allowed"],
      primary_party_id: "party_allowed",
      status: "active",
    }]),
    crmRepository: {
      list() {
        crmReadCount += 1;
        throw new Error("CRM must not be read");
      },
    },
    financeRepository: {
      list() {
        financeReadCount += 1;
        throw new Error("Finance must not be read");
      },
    },
  });
  const context = fixturePermissionContext();
  context.rules = context.rules.filter(
    ({ action }) => action === "analytics:client:read",
  );
  assert.throws(
    () => readModel.readKpis({
      tenant_id: TENANT,
      permission_context: context,
      as_of: "2026-07-30T03:00:00.000Z",
    }),
    (error) => (
      error.safe_error_code
        === "CLIENT_OPERATIONS_INQUIRY_READ_DENIED"
    ),
  );
  assert.equal(crmReadCount, 0);
  assert.equal(financeReadCount, 0);
});

test("VC-CL-DASH-001 / CL-P4-W01-T03 기준 fixture의 오늘 확인할 일을 빠짐없이 정렬한다", () => {
  const input = JSON.parse(readFileSync(new URL(
    "../../../apps/api/test/fixtures/client-operations-v1/input.json",
    import.meta.url,
  ), "utf8"));
  const expected = JSON.parse(readFileSync(new URL(
    "../../../apps/api/test/fixtures/client-operations-v1/expected-dashboard.json",
    import.meta.url,
  ), "utf8"));
  const financeRepository = fixtureFinanceRepository(input);
  const readModel = createClientOperationsReadModel({
    masterDataRepository: repository(
      fixtureMasterDataRecords(input),
    ),
    crmRepository: repository(fixtureCrmRecords(input)),
    financeRepository,
  });

  try {
    const result = readModel.readAttentionItems({
      tenant_id: TENANT,
      permission_context: fixturePermissionContext(),
      as_of: input.as_of,
      timezone: input.timezone,
    });

    assert.deepEqual(
      result.item.attention_item_ids,
      expected.attention_item_ids,
    );
    assert.deepEqual(
      result.item.items.map(({ attention_type }) => (
        attention_type
      )),
      [
        "unassigned_new_inquiry",
        "consultation_today",
        "engagement_review",
        "bank_match_review",
        "fee_amount_missing",
      ],
    );
    assert.deepEqual(
      result.item.items.map(({ order }) => order),
      [1, 2, 3, 4, 5],
    );
    assert.deepEqual(
      result.item.evaluated_attention_types,
      [
        "overdue_consultation",
        "unassigned_new_inquiry",
        "consultation_today",
        "engagement_review",
        "bank_match_review",
        "fee_amount_missing",
      ],
    );
    assert.equal(result.item.raw_bank_counterparty_included, false);
    assert.equal(
      JSON.stringify(result).includes("\"counterparty\""),
      false,
    );
    for (const item of result.item.items) {
      assert.equal(typeof item.destination.section, "string");
      assert.equal(typeof item.destination.record_id, "string");
      assert.equal("href" in item.destination, false);
    }
  } finally {
    financeRepository.close();
  }
});

test("CL-P4-W01-T03 6종 확인 업무를 시각과 ID로 안정 정렬하고 차단 고객·객체를 노출하지 않는다", () => {
  const lead = ({
    id,
    party_id = "party_allowed",
    status = "reviewing",
    assigned_user_id = "principal_partner",
    received_at = "2026-07-20T00:00:00.000Z",
    opportunity_id = null,
  }) => ({
    model_type: "Lead",
    tenant_id: TENANT,
    lead_id: id,
    party_id,
    display_name: `문의 ${id}`,
    inquiry_status: status,
    source: "manual",
    received_at,
    next_action: "문의 확인",
    assigned_user_id,
    opportunity_id,
    status: "active",
    owner_user_id: "principal_partner",
    version: 1,
  });
  const consultation = ({
    id,
    start,
    completed_at = null,
    lead_id = "lead_consultations",
    party_id = "party_allowed",
  }) => ({
    model_type: "CRMActivity",
    tenant_id: TENANT,
    crm_activity_id: id,
    lead_id,
    party_id,
    activity_type: "meeting",
    activity_kind: "consultation",
    subject: "법률 상담",
    confidential: false,
    scheduled_start: start,
    scheduled_end: new Date(
      Date.parse(start) + 60 * 60 * 1_000,
    ).toISOString(),
    timezone: "Asia/Seoul",
    completed_at,
    status: "active",
    owner_user_id: "principal_partner",
    version: 1,
  });
  const clientRecords = [
    {
      model_type: "ClientGroup",
      tenant_id: TENANT,
      client_group_id: "client_allowed",
      display_name: "허용 고객",
      member_party_ids: ["party_allowed"],
      primary_party_id: "party_allowed",
      status: "active",
    },
    {
      model_type: "ClientGroup",
      tenant_id: TENANT,
      client_group_id: "client_denied",
      display_name: "비공개 고객",
      member_party_ids: ["party_denied"],
      primary_party_id: "party_denied",
      status: "active",
    },
  ];
  const crmRecords = [
    lead({
      id: "lead_new_old",
      status: "new",
      assigned_user_id: null,
      received_at: "2026-07-28T00:00:00.000Z",
    }),
    lead({
      id: "lead_new_recent",
      status: "new",
      assigned_user_id: null,
      received_at: "2026-07-29T00:00:00.000Z",
    }),
    lead({
      id: "lead_new_assigned",
      status: "new",
      received_at: "2026-07-27T00:00:00.000Z",
    }),
    lead({ id: "lead_consultations" }),
    lead({
      id: "lead_review",
      opportunity_id: "op_review",
    }),
    lead({
      id: "lead_denied",
      party_id: "party_denied",
      status: "new",
      assigned_user_id: null,
      received_at: "2026-07-01T00:00:00.000Z",
    }),
    {
      model_type: "Opportunity",
      tenant_id: TENANT,
      opportunity_id: "op_review",
      lead_id: "lead_review",
      party_id: "party_allowed",
      display_name: "수임 검토",
      stage: "qualified",
      engagement_decision: "pending",
      engagement_client_group_id: "client_allowed",
      created_at: "2026-07-25T00:00:00.000Z",
      status: "active",
      owner_user_id: "principal_partner",
    },
    consultation({
      id: "consultation_past_old",
      start: "2026-07-28T01:00:00.000Z",
    }),
    consultation({
      id: "consultation_past_recent",
      start: "2026-07-29T01:00:00.000Z",
    }),
    consultation({
      id: "consultation_today_old",
      start: "2026-07-30T00:10:00.000Z",
    }),
    consultation({
      id: "consultation_today_recent",
      start: "2026-07-30T02:00:00.000Z",
    }),
    consultation({
      id: "consultation_future",
      start: "2026-07-31T01:00:00.000Z",
    }),
    consultation({
      id: "consultation_completed",
      start: "2026-07-29T00:30:00.000Z",
      completed_at: "2026-07-29T02:00:00.000Z",
    }),
    consultation({
      id: "consultation_denied",
      start: "2026-07-01T00:00:00.000Z",
      lead_id: "lead_denied",
      party_id: "party_denied",
    }),
  ];
  const financeRecords = [
    {
      model_type: "BankTransaction",
      tenant_id: TENANT,
      bank_transaction_id: "bank_review_early",
      date: "2026-07-10",
      occurred_at: "2026-07-10T01:00:00.000Z",
      direction: "inflow",
      amount: 2_000_000,
      currency: "KRW",
      counterparty: "원문 거래상대방 A",
    },
    {
      model_type: "BankTransactionClassification",
      tenant_id: TENANT,
      bank_transaction_classification_id:
        "classification_review_early",
      bank_transaction_id: "bank_review_early",
      transaction_date: "2026-07-10",
      transaction_direction: "inflow",
      amount: 2_000_000,
      currency: "KRW",
      client_group_id: null,
      status: "review_required",
    },
    {
      model_type: "BankTransaction",
      tenant_id: TENANT,
      bank_transaction_id: "bank_review_late",
      date: "2026-07-11",
      occurred_at: "2026-07-11T01:00:00.000Z",
      direction: "inflow",
      amount: 3_000_000,
      currency: "KRW",
      counterparty: "원문 거래상대방 B",
    },
    {
      model_type: "BankTransactionClassification",
      tenant_id: TENANT,
      bank_transaction_classification_id:
        "classification_review_late",
      bank_transaction_id: "bank_review_late",
      transaction_date: "2026-07-11",
      transaction_direction: "inflow",
      amount: 3_000_000,
      currency: "KRW",
      client_group_id: "client_allowed",
      status: "review_required",
    },
    {
      model_type: "BankTransaction",
      tenant_id: TENANT,
      bank_transaction_id: "bank_confirmed",
      date: "2026-07-12",
      occurred_at: "2026-07-12T01:00:00.000Z",
      direction: "inflow",
      amount: 4_000_000,
      currency: "KRW",
    },
    {
      model_type: "BankTransactionClassification",
      tenant_id: TENANT,
      bank_transaction_classification_id:
        "classification_confirmed",
      bank_transaction_id: "bank_confirmed",
      transaction_date: "2026-07-12",
      transaction_direction: "inflow",
      amount: 4_000_000,
      currency: "KRW",
      client_group_id: "client_allowed",
      status: "confirmed",
    },
    {
      model_type: "BankTransaction",
      tenant_id: TENANT,
      bank_transaction_id: "bank_denied_client",
      amount: "98765432",
    },
    {
      model_type: "BankTransactionClassification",
      tenant_id: TENANT,
      bank_transaction_classification_id:
        "classification_denied_client",
      bank_transaction_id: "bank_denied_client",
      transaction_direction: "inflow",
      amount: 98_765_432,
      currency: "KRW",
      client_group_id: "client_denied",
      status: "review_required",
    },
    {
      model_type: "BankTransaction",
      tenant_id: TENANT,
      bank_transaction_id: "bank_acl_denied",
      amount: "87654321",
    },
    {
      model_type: "BankTransactionClassification",
      tenant_id: TENANT,
      bank_transaction_classification_id:
        "classification_acl_denied",
      bank_transaction_id: "bank_acl_denied",
      transaction_direction: "inflow",
      amount: 87_654_321,
      currency: "KRW",
      client_group_id: null,
      status: "review_required",
    },
    {
      model_type: "FeeCommitment",
      tenant_id: TENANT,
      fee_commitment_id: "fee_missing_early",
      client_group_id: "client_allowed",
      opportunity_id: "op_fee_early",
      matter_id: null,
      currency: "KRW",
      agreed_amount: null,
      due_date: "2026-07-05",
      accepted_at: "2026-07-01T00:00:00.000Z",
      status: "active",
      source_fee_arrangement_id: null,
      state_version: 1,
      created_by: "principal_partner",
      updated_by: "principal_partner",
      reason: "금액 협의 중",
    },
    {
      model_type: "FeeCommitment",
      tenant_id: TENANT,
      fee_commitment_id: "fee_missing_late",
      client_group_id: "client_allowed",
      opportunity_id: "op_fee_late",
      matter_id: null,
      currency: "KRW",
      agreed_amount: null,
      due_date: null,
      accepted_at: "2026-07-10T00:00:00.000Z",
      status: "active",
      source_fee_arrangement_id: null,
      state_version: 1,
      created_by: "principal_partner",
      updated_by: "principal_partner",
      reason: "금액 협의 중",
    },
    {
      model_type: "FeeCommitment",
      tenant_id: TENANT,
      fee_commitment_id: "fee_known",
      client_group_id: "client_allowed",
      agreed_amount: 1_000_000,
      status: "active",
    },
    {
      model_type: "FeeCommitment",
      tenant_id: TENANT,
      fee_commitment_id: "fee_denied_malformed",
      client_group_id: "client_denied",
      agreed_amount: null,
      status: "active",
    },
  ];
  const context = fixturePermissionContext();
  context.object_acl = [
    {
      id: "deny-client",
      effect: "deny",
      principal_id: "principal_partner",
      action: "analytics:client:read",
      resource_id: "client_denied",
    },
    {
      id: "deny-bank-review",
      effect: "deny",
      principal_id: "principal_partner",
      action: "finance:bank_classification:read",
      resource_id: "classification_acl_denied",
    },
  ];
  const readModel = createClientOperationsReadModel({
    masterDataRepository: repository(clientRecords),
    crmRepository: repository(crmRecords),
    financeRepository: repository(financeRecords),
  });

  const first = readModel.readAttentionItems({
    tenant_id: TENANT,
    permission_context: context,
    as_of: "2026-07-30T03:00:00.000Z",
  });
  const second = readModel.readAttentionItems({
    tenant_id: TENANT,
    permission_context: context,
    as_of: "2026-07-30T03:00:00.000Z",
  });
  assert.deepEqual(second, first);
  assert.deepEqual(first.item.attention_item_ids, [
    "consultation_past_old",
    "consultation_past_recent",
    "lead_new_old",
    "lead_new_recent",
    "consultation_today_old",
    "consultation_today_recent",
    "op_review",
    "bank_review_early",
    "bank_review_late",
    "fee_missing_early",
    "fee_missing_late",
  ]);
  assert.deepEqual(
    [...new Set(first.item.items.map(
      ({ attention_type }) => attention_type,
    ))],
    [
      "overdue_consultation",
      "unassigned_new_inquiry",
      "consultation_today",
      "engagement_review",
      "bank_match_review",
      "fee_amount_missing",
    ],
  );
  assert.equal(
    new Set(first.item.attention_item_ids).size,
    first.item.attention_item_ids.length,
  );
  const serialized = JSON.stringify(first);
  for (const forbidden of [
    "client_denied",
    "party_denied",
    "lead_denied",
    "consultation_denied",
    "classification_denied_client",
    "classification_acl_denied",
    "bank_denied_client",
    "bank_acl_denied",
    "fee_denied_malformed",
    "비공개 고객",
    "98765432",
    "87654321",
    "원문 거래상대방 A",
    "원문 거래상대방 B",
  ]) {
    assert.equal(serialized.includes(forbidden), false);
  }
});

test("CL-P4-W01-T03 입금 분류 조회 권한이 없으면 Finance 원천을 읽기 전에 차단한다", () => {
  let financeReadCount = 0;
  const readModel = createClientOperationsReadModel({
    masterDataRepository: repository([{
      model_type: "ClientGroup",
      tenant_id: TENANT,
      client_group_id: "client_allowed",
      display_name: "허용 고객",
      member_party_ids: ["party_allowed"],
      primary_party_id: "party_allowed",
      status: "active",
    }]),
    crmRepository: repository([]),
    financeRepository: {
      list() {
        financeReadCount += 1;
        throw new Error("Finance must not be read");
      },
    },
  });
  const context = fixturePermissionContext();
  context.rules = context.rules.filter(
    ({ action }) => (
      action !== "finance:bank_classification:read"
    ),
  );

  assert.throws(
    () => readModel.readAttentionItems({
      tenant_id: TENANT,
      permission_context: context,
      as_of: "2026-07-30T03:00:00.000Z",
    }),
    (error) => (
      error.safe_error_code
        === "CLIENT_OPERATIONS_BANK_REVIEW_READ_DENIED"
    ),
  );
  assert.equal(financeReadCount, 0);
});
