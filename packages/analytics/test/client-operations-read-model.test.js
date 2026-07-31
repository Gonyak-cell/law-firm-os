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
  createClientRegistrationService,
  createMasterDataRepository,
} from "../../master-data/src/index.js";
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

test("CL-P4-W01-T01 ClientGroup ACL은 같은 ID의 다른 resource_type과 충돌하지 않는다", () => {
  const clientGroupId = "client_acl_resource_type";
  const masterDataRepository = repository([{
    model_type: "ClientGroup",
    tenant_id: TENANT,
    client_group_id: clientGroupId,
    display_name: "리소스 타입 ACL 고객",
    member_party_ids: ["party_acl_resource_type"],
    primary_party_id: "party_acl_resource_type",
    status: "active",
  }]);
  const principal = {
    user_id: STAFF,
    tenant_id: TENANT,
    role_ids: ["lawos_staff"],
  };
  const clientReadRule = {
    id: "staff-client-read-resource-type",
    effect: "allow",
    action: "analytics:client:read",
  };
  const resolve = ({ rules = [], object_acl = [] } = {}) => (
    resolveClientOperationsAccessScope({
      masterDataRepository,
      tenant_id: TENANT,
      permission_context: {
        principal,
        rules,
        object_acl,
      },
    })
  );
  const aclEntry = ({
    effect,
    resource_type,
    resource_id = clientGroupId,
    includeResourceType = true,
  }) => {
    const entry = {
      id: `${effect}-${resource_type ?? "absent"}`,
      effect,
      principal_id: STAFF,
      action: "analytics:client:read",
      resource_id,
    };
    if (includeResourceType) entry.resource_type = resource_type;
    return entry;
  };

  const wrongTypeAllow = resolve({
    object_acl: [aclEntry({
      effect: "allow",
      resource_type: "Matter",
    })],
  });
  assert.equal(wrongTypeAllow.access_state, "no_access");
  assert.deepEqual(wrongTypeAllow.allowed_client_group_ids, []);

  const wrongTypeDeny = resolve({
    rules: [clientReadRule],
    object_acl: [aclEntry({
      effect: "deny",
      resource_type: "Matter",
    })],
  });
  assert.equal(wrongTypeDeny.access_state, "allowed");
  assert.deepEqual(
    wrongTypeDeny.allowed_client_group_ids,
    [clientGroupId],
  );

  const exactAllow = resolve({
    object_acl: [aclEntry({
      effect: "allow",
      resource_type: "ClientGroup",
    })],
  });
  assert.equal(exactAllow.access_state, "allowed");
  assert.deepEqual(exactAllow.allowed_client_group_ids, [clientGroupId]);

  const exactWildcardAllow = resolve({
    object_acl: [aclEntry({
      effect: "allow",
      resource_type: "ClientGroup",
      resource_id: "*",
    })],
  });
  assert.equal(exactWildcardAllow.access_state, "allowed");
  assert.deepEqual(
    exactWildcardAllow.allowed_client_group_ids,
    [clientGroupId],
  );

  const exactDeny = resolve({
    rules: [clientReadRule],
    object_acl: [aclEntry({
      effect: "deny",
      resource_type: "ClientGroup",
    })],
  });
  assert.equal(exactDeny.access_state, "no_access");
  assert.deepEqual(exactDeny.allowed_client_group_ids, []);

  const exactWildcardDeny = resolve({
    rules: [clientReadRule],
    object_acl: [aclEntry({
      effect: "deny",
      resource_type: "ClientGroup",
      resource_id: "*",
    })],
  });
  assert.equal(exactWildcardDeny.access_state, "no_access");
  assert.deepEqual(exactWildcardDeny.allowed_client_group_ids, []);

  for (const [resourceType, includeResourceType] of [
    ["*", true],
    [null, true],
    [undefined, false],
  ]) {
    const legacyAllow = resolve({
      object_acl: [aclEntry({
        effect: "allow",
        resource_type: resourceType,
        includeResourceType,
      })],
    });
    assert.equal(legacyAllow.access_state, "allowed");
    assert.deepEqual(
      legacyAllow.allowed_client_group_ids,
      [clientGroupId],
    );
  }
  for (const [resourceType, includeResourceType] of [
    ["*", true],
    [null, true],
    [undefined, false],
  ]) {
    const legacyDeny = resolve({
      rules: [clientReadRule],
      object_acl: [aclEntry({
        effect: "deny",
        resource_type: resourceType,
        includeResourceType,
      })],
    });
    assert.equal(legacyDeny.access_state, "no_access");
    assert.deepEqual(legacyDeny.allowed_client_group_ids, []);
  }
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

test("VC-CL-DASH-001 / CL-P4-W01-T04 기준 fixture의 12개월 추이·문의 현황·고객 순위를 계산한다", () => {
  const input = JSON.parse(readFileSync(new URL(
    "../../../apps/api/test/fixtures/client-operations-v1/input.json",
    import.meta.url,
  ), "utf8"));
  const expectedDashboard = JSON.parse(readFileSync(new URL(
    "../../../apps/api/test/fixtures/client-operations-v1/expected-dashboard.json",
    import.meta.url,
  ), "utf8"));
  const expectedRevenue = JSON.parse(readFileSync(new URL(
    "../../../apps/api/test/fixtures/client-operations-v1/expected-revenue.json",
    import.meta.url,
  ), "utf8"));
  const expectedReceivables = JSON.parse(readFileSync(new URL(
    "../../../apps/api/test/fixtures/client-operations-v1/expected-receivables.json",
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
    const result = readModel.readTrendsAndRankings({
      tenant_id: TENANT,
      permission_context: fixturePermissionContext(),
      as_of: input.as_of,
      timezone: input.timezone,
    });

    assert.deepEqual(
      result.item.monthly_deposit_revenue.points.map(({
        month,
        net_deposit_revenue,
      }) => ({ month, net_deposit_revenue })),
      expectedRevenue.monthly_series,
    );
    assert.deepEqual(
      result.item.monthly_deposit_revenue.period,
      {
        from: "2025-08-01",
        to: "2026-07-30",
        month_count: 12,
      },
    );
    assert.equal(
      result.item.monthly_deposit_revenue.total,
      36_000_000,
    );
    assert.deepEqual(
      result.item.inquiry_status.counts,
      expectedDashboard.inquiry_status_counts,
    );
    assert.equal(result.item.inquiry_status.total, 5);
    assert.deepEqual(
      result.item.revenue_ranking.client_group_ids,
      expectedDashboard.revenue_ranking_client_ids,
    );
    assert.deepEqual(
      result.item.revenue_ranking.items.map((row) => ({
        client_group_id: row.client_group_id,
        net_deposit_revenue: row.net_deposit_revenue,
      })),
      [
        {
          client_group_id: "client_saebom_tech",
          net_deposit_revenue: 25_000_000,
        },
        {
          client_group_id: "client_hanbit_construction",
          net_deposit_revenue: 11_000_000,
        },
      ],
    );
    assert.deepEqual(
      result.item.revenue_ranking.selected_period,
      {
        code: "year",
        label: "올해 누적",
        from: "2026-01-01",
        to: "2026-07-30",
      },
    );
    assert.deepEqual(
      result.item.receivables_ranking.client_group_ids,
      expectedDashboard.receivables_ranking_client_ids,
    );
    assert.equal(
      result.item.receivables_ranking.total,
      expectedReceivables.total_receivables,
    );
    assert.deepEqual(
      result.item.receivables_ranking.items.map((row) => ({
        rank: row.rank,
        client_group_id: row.client_group_id,
        receivable_amount: row.receivable_amount,
        earliest_due_date: row.earliest_due_date,
      })),
      expectedReceivables.ranking.map((row) => ({
        rank: row.rank,
        client_group_id: row.client_group_id,
        receivable_amount: row.receivable_amount,
        earliest_due_date: row.earliest_due_date,
      })),
    );
    assert.deepEqual(
      result.item.revenue_ranking.available_periods,
      [
        { code: "month", label: "이번 달" },
        { code: "quarter", label: "이번 분기" },
        { code: "year", label: "올해 누적" },
      ],
    );
    for (const point of result.item.monthly_deposit_revenue.points) {
      assert.equal(point.destination.section, "deposit_revenue");
      assert.equal(point.destination.month, point.month);
    }
    for (const status of result.item.inquiry_status.items) {
      assert.equal(typeof status.destination.section, "string");
      assert.equal(status.destination.filter, status.code);
    }
    for (const row of [
      ...result.item.revenue_ranking.items,
      ...result.item.receivables_ranking.items,
    ]) {
      assert.equal(row.destination.section, "client_details");
      assert.equal(row.destination.record_id, row.client_group_id);
    }
    assert.equal(result.item.raw_bank_source_included, false);
    assert.equal(result.item.embedded_transaction_details, false);
  } finally {
    financeRepository.close();
  }
});

test("CL-P4-W01-T04 선택 기간과 동률 순위를 안정 정렬하고 기준일 이후·차단 고객을 제외한다", () => {
  const displayNames = new Map([
    ["client_a", "가 고객"],
    ["client_b", "가 고객"],
    ["client_c", "나 고객"],
    ["client_denied", "비공개 고객"],
  ]);
  const masterDataRecords = [...displayNames].map(
    ([client_group_id, display_name]) => ({
      model_type: "ClientGroup",
      tenant_id: TENANT,
      client_group_id,
      display_name,
      member_party_ids: [`party_${client_group_id}`],
      primary_party_id: `party_${client_group_id}`,
      status: "active",
    }),
  );
  const receiptRecords = ({
    id,
    client_group_id,
    date,
    amount,
  }) => [
    {
      model_type: "BankTransaction",
      tenant_id: TENANT,
      bank_transaction_id: id,
      transaction_fingerprint: `fingerprint-${id}`,
      date,
      occurred_at: `${date}T01:00:00.000Z`,
      direction: "inflow",
      amount,
      currency: "KRW",
      status: "posted",
    },
    {
      model_type: "BankTransactionClassification",
      tenant_id: TENANT,
      bank_transaction_classification_id:
        `classification_${id}`,
      bank_transaction_id: id,
      transaction_date: date,
      transaction_direction: "inflow",
      amount,
      currency: "KRW",
      category: "client_receipt",
      client_group_id,
      status: "confirmed",
    },
  ];
  const feeCommitment = (client_group_id) => ({
    model_type: "FeeCommitment",
    tenant_id: TENANT,
    fee_commitment_id: `fee_${client_group_id}`,
    client_group_id,
    opportunity_id: `opportunity_${client_group_id}`,
    matter_id: null,
    currency: "KRW",
    agreed_amount: 1_000_000,
    due_date: "2026-07-20",
    accepted_at: "2026-06-01T00:00:00.000Z",
    status: "active",
    source_fee_arrangement_id: null,
    state_version: 1,
    created_by: "principal_partner",
    updated_by: "principal_partner",
    reason: "동률 정렬 검증",
  });
  const financeRecords = [
    ...receiptRecords({
      id: "bank_a_july",
      client_group_id: "client_a",
      date: "2026-07-10",
      amount: 1_000_000,
    }),
    ...receiptRecords({
      id: "bank_b_july",
      client_group_id: "client_b",
      date: "2026-07-10",
      amount: 1_000_000,
    }),
    ...receiptRecords({
      id: "bank_c_july",
      client_group_id: "client_c",
      date: "2026-07-10",
      amount: 1_000_000,
    }),
    ...receiptRecords({
      id: "bank_b_june",
      client_group_id: "client_b",
      date: "2026-06-10",
      amount: 500_000,
    }),
    ...receiptRecords({
      id: "bank_c_after_as_of",
      client_group_id: "client_c",
      date: "2026-07-31",
      amount: 9_999_999,
    }),
    {
      model_type: "BankTransaction",
      tenant_id: TENANT,
      bank_transaction_id: "bank_denied_malformed",
      amount: "87654321",
    },
    {
      model_type: "BankTransactionClassification",
      tenant_id: TENANT,
      bank_transaction_classification_id:
        "classification_denied_malformed",
      bank_transaction_id: "bank_denied_malformed",
      category: "client_receipt",
      client_group_id: "client_denied",
      status: "confirmed",
    },
    ...["client_a", "client_b", "client_c"].map(
      feeCommitment,
    ),
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
  context.object_acl = [{
    id: "deny-client",
    effect: "deny",
    principal_id: "principal_partner",
    action: "analytics:client:read",
    resource_id: "client_denied",
  }];
  const readModel = createClientOperationsReadModel({
    masterDataRepository: repository(masterDataRecords),
    crmRepository: repository([]),
    financeRepository: repository(financeRecords),
  });
  const month = readModel.readTrendsAndRankings({
    tenant_id: TENANT,
    permission_context: context,
    as_of: "2026-07-30T03:00:00.000Z",
    revenue_ranking_period: "month",
  });
  const monthAgain = readModel.readTrendsAndRankings({
    tenant_id: TENANT,
    permission_context: context,
    as_of: "2026-07-30T03:00:00.000Z",
    revenue_ranking_period: "month",
  });
  const year = readModel.readTrendsAndRankings({
    tenant_id: TENANT,
    permission_context: context,
    as_of: "2026-07-30T03:00:00.000Z",
    revenue_ranking_period: "year",
  });
  const quarter = readModel.readTrendsAndRankings({
    tenant_id: TENANT,
    permission_context: context,
    as_of: "2026-07-30T03:00:00.000Z",
    revenue_ranking_period: "quarter",
  });

  assert.deepEqual(monthAgain, month);
  assert.deepEqual(
    month.item.revenue_ranking.client_group_ids,
    ["client_a", "client_b", "client_c"],
  );
  assert.deepEqual(
    year.item.revenue_ranking.client_group_ids,
    ["client_b", "client_a", "client_c"],
  );
  assert.deepEqual(
    quarter.item.revenue_ranking.client_group_ids,
    ["client_a", "client_b", "client_c"],
  );
  assert.deepEqual(
    month.item.receivables_ranking.client_group_ids,
    ["client_a", "client_b", "client_c"],
  );
  assert.deepEqual(month.item.inquiry_status.counts, {
    "새 문의": 0,
    "확인 중": 0,
    "상담 예정": 0,
    "수임 검토 중": 0,
    "수임 확정": 0,
    "수임하지 않음": 0,
  });
  assert.deepEqual(month.item.revenue_ranking.selected_period, {
    code: "month",
    label: "이번 달",
    from: "2026-07-01",
    to: "2026-07-30",
  });
  assert.deepEqual(quarter.item.revenue_ranking.selected_period, {
    code: "quarter",
    label: "이번 분기",
    from: "2026-07-01",
    to: "2026-07-30",
  });
  assert.equal(month.item.revenue_ranking.total, 3_000_000);
  assert.equal(year.item.revenue_ranking.total, 3_500_000);
  assert.equal(
    month.item.monthly_deposit_revenue.points.at(-1)
      .net_deposit_revenue,
    3_000_000,
  );
  const serialized = JSON.stringify(month);
  for (const forbidden of [
    "client_denied",
    "비공개 고객",
    "bank_denied_malformed",
    "classification_denied_malformed",
    "fee_denied_malformed",
    "87654321",
    "bank_c_after_as_of",
    "9999999",
  ]) {
    assert.equal(serialized.includes(forbidden), false);
  }
});

test("CL-P4-W01-T04 잘못된 매출 순위 기간은 CRM·Finance 원천 조회 전에 거절한다", () => {
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

  assert.throws(
    () => readModel.readTrendsAndRankings({
      tenant_id: TENANT,
      permission_context: fixturePermissionContext(),
      as_of: "2026-07-30T03:00:00.000Z",
      revenue_ranking_period: "rolling",
    }),
    /revenue_ranking_period must be month, quarter, or year/,
  );
  assert.equal(crmReadCount, 0);
  assert.equal(financeReadCount, 0);
});

test("VC-CL-DASH-001 / CL-P4-W01-T05 기준 fixture를 원천 상태와 함께 하나의 대시보드로 묶는다", () => {
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
    clock: () => new Date("2026-07-30T03:00:05.000Z"),
  });

  try {
    const result = readModel.readDashboard({
      tenant_id: TENANT,
      permission_context: fixturePermissionContext(),
      as_of: input.as_of,
      timezone: input.timezone,
    });

    assert.equal(result.item.outcome, "complete");
    assert.equal(result.item.ui_state, null);
    assert.equal(
      result.item.generated_at,
      "2026-07-30T03:00:05.000Z",
    );
    assert.deepEqual(
      result.item.sections.kpis.data.values,
      expected.kpis,
    );
    assert.deepEqual(
      result.item.sections.attention_items.data
        .attention_item_ids,
      expected.attention_item_ids,
    );
    assert.deepEqual(
      result.item.sections.inquiry_status.data.counts,
      expected.inquiry_status_counts,
    );
    assert.deepEqual(
      result.item.sections.revenue_ranking.data
        .client_group_ids,
      expected.revenue_ranking_client_ids,
    );
    assert.deepEqual(
      result.item.sections.receivables_ranking.data
        .client_group_ids,
      expected.receivables_ranking_client_ids,
    );
    assert.equal(
      result.item.sections.monthly_deposit_revenue
        .data.points.length,
      12,
    );
    assert.deepEqual(result.item.safe_error_codes, []);
    assert.equal(result.item.source_statuses.length, 6);
    for (const source of result.item.source_statuses) {
      assert.equal(source.status, "available");
      assert.equal(
        source.checked_at,
        result.item.generated_at,
      );
      assert.equal(source.safe_error_code, null);
    }
    assert.equal(
      result.item.source_statuses.find(
        ({ source_id }) => source_id === "crm",
      ).latest_record_at,
      "2026-07-30T00:30:00.000Z",
    );
    assert.equal(result.item.raw_bank_source_included, false);
    assert.equal(result.item.embedded_transaction_details, false);
  } finally {
    financeRepository.close();
  }
});

test("CL-P4-W01-T05 입금 확인 권한이 없으면 해당 업무만 권한 없음으로 두고 나머지는 유지한다", () => {
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
    clock: () => new Date("2026-07-30T03:01:00.000Z"),
  });
  const context = fixturePermissionContext();
  context.rules = context.rules.filter(
    ({ action }) => (
      action !== "finance:bank_classification:read"
    ),
  );

  try {
    const result = readModel.readDashboard({
      tenant_id: TENANT,
      permission_context: context,
      as_of: input.as_of,
    });
    const bankSource = result.item.source_statuses.find(
      ({ source_id }) => source_id === "bank_review",
    );

    assert.equal(result.item.outcome, "partial");
    assert.equal(result.item.ui_state, "partial");
    assert.equal(bankSource.status, "permission_denied");
    assert.equal(bankSource.item_count, null);
    assert.equal(
      bankSource.safe_error_code,
      "CLIENT_OPERATIONS_BANK_REVIEW_READ_DENIED",
    );
    assert.deepEqual(
      result.item.sections.kpis.data.values,
      expected.kpis,
    );
    assert.deepEqual(
      result.item.sections.attention_items.data
        .attention_item_ids,
      expected.attention_item_ids.filter(
        (id) => id !== "bank_hanbit_ambiguous",
      ),
    );
    assert.equal(
      result.item.sections.attention_items.data
        .type_statuses.bank_match_review,
      "permission_denied",
    );
    assert.equal(
      result.item.sections.revenue_ranking.status,
      "available",
    );
    const serialized = JSON.stringify(result);
    assert.equal(
      serialized.includes("bank_hanbit_ambiguous"),
      false,
    );
    assert.equal(serialized.includes("\"counterparty\""), false);
  } finally {
    financeRepository.close();
  }
});

test("VC-CL-DASH-002 / CL-P4-W01-T05 CRM 장애를 0건으로 바꾸지 않고 Finance 결과를 부분 제공한다", () => {
  const input = JSON.parse(readFileSync(new URL(
    "../../../apps/api/test/fixtures/client-operations-v1/input.json",
    import.meta.url,
  ), "utf8"));
  const financeRepository = fixtureFinanceRepository(input);
  const readModel = createClientOperationsReadModel({
    masterDataRepository: repository(
      fixtureMasterDataRecords(input),
    ),
    crmRepository: {
      list() {
        throw new Error("private CRM source failure");
      },
    },
    financeRepository,
    clock: () => new Date("2026-07-30T03:02:00.000Z"),
  });

  try {
    const result = readModel.readDashboard({
      tenant_id: TENANT,
      permission_context: fixturePermissionContext(),
      as_of: input.as_of,
    });
    const crmSource = result.item.source_statuses.find(
      ({ source_id }) => source_id === "crm",
    );

    assert.equal(result.item.outcome, "partial");
    assert.equal(crmSource.status, "error");
    assert.equal(crmSource.item_count, null);
    assert.equal(
      crmSource.safe_error_code,
      "CLIENT_OPERATIONS_SOURCE_UNAVAILABLE",
    );
    assert.deepEqual(
      result.item.sections.kpis.data.values,
      {
        new_inquiries: null,
        consultations_today: null,
        engagement_reviews: null,
        deposit_revenue_month: 33_000_000,
        receivables_total: 9_000_000,
      },
    );
    assert.equal(result.item.sections.kpis.status, "partial");
    assert.equal(
      result.item.sections.kpis.data.metric_statuses
        .new_inquiries,
      "error",
    );
    assert.equal(
      result.item.sections.inquiry_status.status,
      "error",
    );
    assert.equal(
      result.item.sections.inquiry_status.data,
      null,
    );
    assert.deepEqual(
      result.item.sections.attention_items.data
        .attention_item_ids,
      [
        "bank_hanbit_ambiguous",
        "fee_hanbit_development_unknown",
      ],
    );
    assert.equal(
      result.item.sections.monthly_deposit_revenue.status,
      "available",
    );
    assert.equal(
      result.item.sections.receivables_ranking.data.total,
      9_000_000,
    );
    assert.equal(
      JSON.stringify(result).includes(
        "private CRM source failure",
      ),
      false,
    );
  } finally {
    financeRepository.close();
  }
});

test("CL-P4-W01-T05 고객 없음·운영 데이터 없음·고객 권한 없음을 서로 다르게 반환한다", () => {
  const noDownstream = {
    list() {
      throw new Error("downstream must not be read");
    },
  };
  const noClients = createClientOperationsReadModel({
    masterDataRepository: repository([]),
    crmRepository: noDownstream,
    financeRepository: noDownstream,
    clock: () => new Date("2026-07-30T03:03:00.000Z"),
  }).readDashboard({
    tenant_id: TENANT,
    permission_context: fixturePermissionContext(),
    as_of: "2026-07-30T03:00:00.000Z",
  });
  assert.equal(noClients.item.outcome, "empty");
  assert.equal(noClients.item.ui_state, "no_data");
  assert.equal(noClients.item.access_state, "no_data");
  assert.equal(noClients.downstream_sources_read, false);
  assert.equal(noClients.item.sections.kpis.data, null);

  const clientRecord = {
    model_type: "ClientGroup",
    tenant_id: TENANT,
    client_group_id: "client_allowed",
    display_name: "허용 고객",
    member_party_ids: ["party_allowed"],
    primary_party_id: "party_allowed",
    status: "active",
  };
  const noOperations = createClientOperationsReadModel({
    masterDataRepository: repository([clientRecord]),
    crmRepository: repository([]),
    financeRepository: repository([]),
    clock: () => new Date("2026-07-30T03:04:00.000Z"),
  }).readDashboard({
    tenant_id: TENANT,
    permission_context: fixturePermissionContext(),
    as_of: "2026-07-30T03:00:00.000Z",
  });
  assert.equal(noOperations.item.outcome, "empty");
  assert.equal(noOperations.item.ui_state, "no_data");
  assert.equal(noOperations.item.access_state, "allowed");
  assert.equal(noOperations.downstream_sources_read, true);
  assert.deepEqual(noOperations.item.sections.kpis.data.values, {
    new_inquiries: 0,
    consultations_today: 0,
    engagement_reviews: 0,
    deposit_revenue_month: 0,
    receivables_total: 0,
  });

  const noAccessContext = fixturePermissionContext();
  noAccessContext.rules = noAccessContext.rules.filter(
    ({ action }) => action !== "analytics:client:read",
  );
  const noAccess = createClientOperationsReadModel({
    masterDataRepository: repository([clientRecord]),
    crmRepository: noDownstream,
    financeRepository: noDownstream,
    clock: () => new Date("2026-07-30T03:05:00.000Z"),
  }).readDashboard({
    tenant_id: TENANT,
    permission_context: noAccessContext,
    as_of: "2026-07-30T03:00:00.000Z",
  });
  assert.equal(noAccess.item.outcome, "permission_denied");
  assert.equal(noAccess.item.ui_state, "permission_denied");
  assert.equal(noAccess.item.access_state, "no_access");
  assert.equal(noAccess.downstream_sources_read, false);
  assert.equal(
    noAccess.item.source_statuses[0].item_count,
    null,
  );
  assert.equal(
    JSON.stringify(noAccess).includes("client_allowed"),
    false,
  );
});

function clientDirectoryPermissionContext({ matterRead = true } = {}) {
  return {
    principal: {
      user_id: STAFF,
      tenant_id: TENANT,
      role_ids: ["lawos_staff"],
    },
    rules: [
      {
        id: "staff-client-directory-read",
        effect: "allow",
        action: "analytics:client:read",
      },
      {
        id: "staff-inquiry-directory-read",
        effect: "allow",
        action: "crm:inquiry:read",
      },
      {
        id: "staff-consultation-directory-read",
        effect: "allow",
        action: "crm:consultation:read",
      },
      ...(matterRead ? [{
        id: "staff-matter-directory-read",
        effect: "allow",
        action: "matter:read",
      }] : []),
    ],
    object_acl: [{
      id: "staff-hidden-client-deny",
      effect: "deny",
      principal_id: STAFF,
      action: "analytics:client:read",
      resource_id: "client_hidden",
    }],
  };
}

function clientDirectoryMasterRecords() {
  return [
    {
      model_type: "ClientGroup",
      tenant_id: TENANT,
      client_group_id: "client_allowed",
      display_name: "같은 이름 고객",
      member_party_ids: ["party_allowed"],
      member_entity_ids: ["entity_allowed_org"],
      primary_party_id: "party_allowed",
      primary_entity_id: "entity_allowed_org",
      legal_form: "주식회사",
      status: "active",
    },
    {
      model_type: "ClientGroup",
      tenant_id: TENANT,
      client_group_id: "client_hidden",
      display_name: "같은 이름 고객",
      member_party_ids: ["party_hidden"],
      member_entity_ids: ["entity_hidden_org"],
      primary_party_id: "party_hidden",
      primary_entity_id: "entity_hidden_org",
      status: "active",
    },
    {
      model_type: "Relationship",
      tenant_id: TENANT,
      relationship_id: "relationship_allowed_contact",
      from_entity_id: "entity_allowed_person",
      to_entity_id: "entity_allowed_org",
      relationship_type: "contact_for",
    },
    {
      model_type: "Relationship",
      tenant_id: TENANT,
      relationship_id: "relationship_allowed_adverse",
      from_entity_id: "entity_allowed_adverse",
      to_entity_id: "entity_allowed_org",
      relationship_type: "adverse",
    },
    {
      model_type: "Person",
      tenant_id: TENANT,
      person_id: "person_allowed",
      party_id: "party_allowed_contact",
      entity_id: "entity_allowed_person",
      display_name: "김담당",
      status: "active",
    },
    {
      model_type: "ContactPoint",
      tenant_id: TENANT,
      contact_point_id: "contact_point_allowed",
      owner_entity_id: "entity_allowed_person",
      contact_type: "email",
      value: "private-contact@example.test",
      is_primary: true,
      status: "active",
    },
    {
      model_type: "ContactPoint",
      tenant_id: TENANT,
      contact_point_id: "contact_point_allowed_phone",
      owner_entity_id: "entity_allowed_person",
      contact_type: "phone",
      value: "010-0000-0000",
      is_primary: true,
      status: "active",
    },
    {
      model_type: "Person",
      tenant_id: TENANT,
      person_id: "person_allowed_adverse",
      party_id: "party_allowed_adverse",
      entity_id: "entity_allowed_adverse",
      display_name: "상대방 노출 금지",
      status: "active",
    },
    {
      model_type: "Person",
      tenant_id: TENANT,
      person_id: "person_hidden_same_name",
      party_id: "party_hidden_contact",
      entity_id: "entity_hidden_person",
      display_name: "김담당",
      status: "active",
    },
    {
      model_type: "ContactPoint",
      tenant_id: TENANT,
      contact_point_id: "contact_point_hidden",
      owner_entity_id: "entity_hidden_person",
      contact_type: "email",
      value: "hidden-contact@example.test",
      is_primary: true,
      status: "active",
    },
  ];
}

function clientDirectoryCrmRecords() {
  return [
    {
      model_type: "Lead",
      tenant_id: TENANT,
      lead_id: "lead_allowed",
      party_id: "party_allowed",
      client_group_id: "client_allowed",
      display_name: "허용 문의",
      inquiry_status: "new",
      source: "outlook_addin",
      received_at: "2026-07-30T01:00:00.000Z",
      next_action: "문의 확인",
      assigned_user_id: null,
      opportunity_id: null,
      status: "active",
      owner_user_id: "principal_partner",
      version: 1,
    },
    {
      model_type: "Lead",
      tenant_id: TENANT,
      lead_id: "lead_hidden",
      party_id: "party_hidden",
      client_group_id: "client_hidden",
      display_name: "숨은 문의",
      inquiry_status: "new",
      source: "outlook_addin",
      received_at: "2026-07-30T02:00:00.000Z",
      next_action: "문의 확인",
      assigned_user_id: null,
      opportunity_id: null,
      status: "active",
      owner_user_id: "principal_partner",
      version: 1,
    },
  ];
}

function clientDirectoryMatterRecords() {
  return [
    {
      model_type: "Matter",
      tenant_id: TENANT,
      matter_id: "matter_allowed",
      matter_code: "M-001",
      matter_name: "허용 사건",
      client_group_id: "client_allowed",
      status: "open",
      opened_at: "2026-07-29T00:00:00.000Z",
    },
    {
      model_type: "Matter",
      tenant_id: TENANT,
      matter_id: "matter_hidden",
      matter_code: "M-002",
      matter_name: "숨은 사건",
      client_group_id: "client_hidden",
      status: "open",
      opened_at: "2026-07-30T00:00:00.000Z",
    },
  ];
}

test("CL-P5-W02-T01 고객 목록은 허용된 고객의 안전한 요약만 반환한다", () => {
  const readModel = createClientOperationsReadModel({
    masterDataRepository: repository(
      clientDirectoryMasterRecords(),
    ),
  });
  const result = readModel.readDirectory({
    tenant_id: TENANT,
    permission_context: clientDirectoryPermissionContext(),
  });

  assert.equal(result.access_scope.access_state, "allowed");
  assert.equal(result.downstream_sources_read, false);
  assert.deepEqual(result.items, [{
    client_group_id: "client_allowed",
    display_name: "같은 이름 고객",
    status: "active",
    legal_form: "주식회사",
    member_count: 1,
    primary_record_present: true,
    production_ready_claim: false,
  }]);
  const serialized = JSON.stringify(result.items);
  assert.equal(serialized.includes("client_hidden"), false);
  assert.equal(serialized.includes("party_allowed"), false);
  assert.equal(serialized.includes("entity_allowed_org"), false);
});

test("CL-P5-W02-T01 고객 상세는 명시 관계만 사용하고 연락처 원문과 권한 밖 자료를 숨긴다", () => {
  const readModel = createClientOperationsReadModel({
    masterDataRepository: repository(
      clientDirectoryMasterRecords(),
    ),
    crmRepository: repository(clientDirectoryCrmRecords()),
    matterRepository: repository(clientDirectoryMatterRecords()),
    clock: () => new Date("2026-07-30T03:00:00.000Z"),
  });
  const result = readModel.readClientDetail({
    tenant_id: TENANT,
    permission_context: clientDirectoryPermissionContext(),
    client_group_id: "client_allowed",
  });

  assert.equal(result.downstream_sources_read, true);
  assert.equal(result.item.outcome, "passed");
  assert.deepEqual(
    result.item.sections.contacts.data.items.map(
      ({ contact_id }) => contact_id,
    ),
    ["person_allowed"],
  );
  assert.equal(
    result.item.sections.contacts.data.items[0]
      .contact_point_value_included,
    false,
  );
  assert.equal(
    result.item.sections.contacts.data.items[0]
      .contact_value_masked,
    true,
  );
  assert.deepEqual(
    result.item.sections.contacts.data.items[0].contact_points.map(
      ({ contact_type, contact_value_masked, contact_point_value_included }) => ({
        contact_type,
        contact_value_masked,
        contact_point_value_included,
      }),
    ),
    [
      {
        contact_type: "email",
        contact_value_masked: true,
        contact_point_value_included: false,
      },
      {
        contact_type: "phone",
        contact_value_masked: true,
        contact_point_value_included: false,
      },
    ],
  );
  assert.deepEqual(
    result.item.sections.matters.data.items.map(
      ({ matter_id }) => matter_id,
    ),
    ["matter_allowed"],
  );
  assert.deepEqual(
    result.item.sections.inquiries.data.items.map(
      ({ lead_id }) => lead_id,
    ),
    ["lead_allowed"],
  );
  const serialized = JSON.stringify(result.item);
  for (const hidden of [
    "private-contact@example.test",
    "hidden-contact@example.test",
    "person_hidden_same_name",
    "person_allowed_adverse",
    "상대방 노출 금지",
    "matter_hidden",
    "lead_hidden",
    "client_hidden",
  ]) {
    assert.equal(serialized.includes(hidden), false);
  }
  assert.equal(result.item.count_leak_prevented, true);
  assert.equal(result.item.raw_contact_values_included, false);
});

test("CL-P5-W02-T02 개인 고객 등록 연락처는 즉시 고객 상세의 보호된 연락처로 조회된다", () => {
  const masterDataRepository = createMasterDataRepository();
  const registrationService = createClientRegistrationService({
    repository: masterDataRepository,
    tenant_id: TENANT,
    actor_id: STAFF,
  });
  const input = {
    client_type: "person",
    display_name: "등록 직후 연락처 고객",
    email: "new-client@example.test",
    phone: "010-1234-9876",
  };
  const review = registrationService.review(input);
  const created = registrationService.create({
    ...input,
    review_digest: review.review_digest,
    idempotency_key: "client-detail-contact-registration",
  });
  const readModel = createClientOperationsReadModel({
    masterDataRepository,
    crmRepository: repository([]),
    matterRepository: repository([]),
  });
  const result = readModel.readClientDetail({
    tenant_id: TENANT,
    permission_context: clientDirectoryPermissionContext(),
    client_group_id: created.client_group_id,
  });

  assert.equal(result.item.sections.contacts.status, "available");
  assert.deepEqual(
    result.item.sections.contacts.data.items.map((contact) => ({
      display_name: contact.display_name,
      primary_contact_type: contact.primary_contact_type,
      contact_value_masked: contact.contact_value_masked,
      contact_point_value_included:
        contact.contact_point_value_included,
    })),
    [{
      display_name: input.display_name,
      primary_contact_type: "email",
      contact_value_masked: true,
      contact_point_value_included: false,
    }],
  );
  assert.deepEqual(
    result.item.sections.contacts.data.items[0].contact_points.map(
      ({ contact_type, contact_value_masked, contact_point_value_included }) => ({
        contact_type,
        contact_value_masked,
        contact_point_value_included,
      }),
    ),
    [
      {
        contact_type: "email",
        contact_value_masked: true,
        contact_point_value_included: false,
      },
      {
        contact_type: "phone",
        contact_value_masked: true,
        contact_point_value_included: false,
      },
    ],
  );
  const serialized = JSON.stringify(result.item);
  assert.equal(serialized.includes(input.email), false);
  assert.equal(serialized.includes(input.phone), false);
});

test("CL-P5-W02-T01 개별 Matter·문의 권한 누락은 0건이 아닌 일부 조회로 표시한다", () => {
  const context = clientDirectoryPermissionContext();
  context.object_acl.push(
    {
      id: "staff-hidden-matter-deny",
      effect: "deny",
      principal_id: STAFF,
      action: "matter:read",
      resource_id: "matter_allowed_hidden",
    },
    {
      id: "staff-hidden-inquiry-deny",
      effect: "deny",
      principal_id: STAFF,
      action: "crm:inquiry:read",
      resource_id: "lead_allowed_hidden",
    },
  );
  const readModel = createClientOperationsReadModel({
    masterDataRepository: repository(
      clientDirectoryMasterRecords(),
    ),
    crmRepository: repository([
      ...clientDirectoryCrmRecords(),
      {
        model_type: "Lead",
        tenant_id: TENANT,
        lead_id: "lead_allowed_hidden",
        party_id: "party_allowed",
        client_group_id: "client_allowed",
        display_name: "권한 밖 문의",
        inquiry_status: "new",
        source: "manual",
        received_at: "2026-07-30T02:30:00.000Z",
        next_action: "노출 금지",
        assigned_user_id: null,
        opportunity_id: null,
        status: "active",
        owner_user_id: "principal_partner",
        version: 1,
      },
    ]),
    matterRepository: repository([
      ...clientDirectoryMatterRecords(),
      {
        model_type: "Matter",
        tenant_id: TENANT,
        matter_id: "matter_allowed_hidden",
        matter_code: "M-HIDDEN",
        matter_name: "권한 밖 사건",
        client_group_id: "client_allowed",
        status: "open",
        opened_at: "2026-07-30T02:00:00.000Z",
      },
    ]),
    clock: () => new Date("2026-07-30T03:00:00.000Z"),
  });
  const result = readModel.readClientDetail({
    tenant_id: TENANT,
    permission_context: context,
    client_group_id: "client_allowed",
  });
  const matterSource = result.item.source_statuses.find(
    ({ source_id }) => source_id === "matters",
  );
  const inquirySource = result.item.source_statuses.find(
    ({ source_id }) => source_id === "crm_inquiries",
  );

  assert.equal(result.item.outcome, "partial");
  assert.equal(result.item.ui_state, "partial");
  assert.equal(result.item.sections.matters.status, "partial");
  assert.equal(result.item.sections.inquiries.status, "partial");
  assert.deepEqual(
    result.item.sections.matters.data.items.map(
      ({ matter_id }) => matter_id,
    ),
    ["matter_allowed"],
  );
  assert.deepEqual(
    result.item.sections.inquiries.data.items.map(
      ({ lead_id }) => lead_id,
    ),
    ["lead_allowed"],
  );
  assert.equal(matterSource.item_count, null);
  assert.equal(inquirySource.item_count, null);
  assert.equal(
    matterSource.safe_error_code,
    "CLIENT_OPERATIONS_MATTER_OBJECTS_OMITTED",
  );
  assert.equal(
    inquirySource.safe_error_code,
    "CLIENT_OPERATIONS_INQUIRY_OBJECTS_OMITTED",
  );
  const serialized = JSON.stringify(result.item);
  for (const hidden of [
    "matter_allowed_hidden",
    "M-HIDDEN",
    "권한 밖 사건",
    "lead_allowed_hidden",
    "권한 밖 문의",
    "노출 금지",
  ]) {
    assert.equal(serialized.includes(hidden), false);
  }
});

test("CL-P5-W02-T01 상담 세부 권한 누락도 문의 탭을 일부 조회로 표시한다", () => {
  const context = clientDirectoryPermissionContext();
  context.object_acl.push({
    id: "staff-hidden-consultation-deny",
    effect: "deny",
    principal_id: STAFF,
    action: "crm:consultation:read",
    resource_id: "activity_allowed_hidden",
  });
  const readModel = createClientOperationsReadModel({
    masterDataRepository: repository(
      clientDirectoryMasterRecords(),
    ),
    crmRepository: repository([
      ...clientDirectoryCrmRecords(),
      {
        model_type: "CRMActivity",
        tenant_id: TENANT,
        crm_activity_id: "activity_allowed_hidden",
        lead_id: "lead_allowed",
        activity_kind: "consultation",
        scheduled_at: "2026-07-31T01:00:00.000Z",
        status: "scheduled",
      },
    ]),
    matterRepository: repository(clientDirectoryMatterRecords()),
    clock: () => new Date("2026-07-30T03:00:00.000Z"),
  });
  const result = readModel.readClientDetail({
    tenant_id: TENANT,
    permission_context: context,
    client_group_id: "client_allowed",
  });
  const inquirySource = result.item.source_statuses.find(
    ({ source_id }) => source_id === "crm_inquiries",
  );

  assert.equal(result.item.outcome, "partial");
  assert.equal(result.item.sections.inquiries.status, "partial");
  assert.deepEqual(
    result.item.sections.inquiries.data.items.map(
      ({ lead_id }) => lead_id,
    ),
    ["lead_allowed"],
  );
  assert.equal(inquirySource.item_count, null);
  assert.equal(
    inquirySource.safe_error_code,
    "CLIENT_OPERATIONS_INQUIRY_OBJECTS_OMITTED",
  );
  assert.equal(
    JSON.stringify(result.item).includes("activity_allowed_hidden"),
    false,
  );
});

test("CL-P5-W02-T01 Matter 권한 부재는 건수를 숨긴 부분 상태로 격리한다", () => {
  const readModel = createClientOperationsReadModel({
    masterDataRepository: repository(
      clientDirectoryMasterRecords(),
    ),
    crmRepository: repository(clientDirectoryCrmRecords()),
    matterRepository: {
      list() {
        throw new Error("Matter must not be read without permission");
      },
    },
    clock: () => new Date("2026-07-30T03:00:00.000Z"),
  });
  const result = readModel.readClientDetail({
    tenant_id: TENANT,
    permission_context: clientDirectoryPermissionContext({
      matterRead: false,
    }),
    client_group_id: "client_allowed",
  });
  const matterSource = result.item.source_statuses.find(
    ({ source_id }) => source_id === "matters",
  );

  assert.equal(result.item.outcome, "partial");
  assert.equal(result.item.ui_state, "partial");
  assert.equal(
    result.item.sections.matters.status,
    "permission_denied",
  );
  assert.equal(result.item.sections.matters.data, null);
  assert.equal(matterSource.item_count, null);
  assert.equal(
    matterSource.safe_error_code,
    "CLIENT_OPERATIONS_MATTER_READ_DENIED",
  );
  assert.equal(
    result.item.sections.contacts.status,
    "available",
  );
  assert.equal(
    result.item.sections.inquiries.status,
    "available",
  );
});

test("CL-P5-W02-T01 권한 밖 고객과 없는 고객은 같은 결과로 원천 조회 전에 끝낸다", () => {
  const events = [];
  const readModel = createClientOperationsReadModel({
    masterDataRepository: repository(
      clientDirectoryMasterRecords(),
      events,
      "master-data",
    ),
    crmRepository: {
      list() {
        throw new Error("CRM must not be read");
      },
    },
    matterRepository: {
      list() {
        throw new Error("Matter must not be read");
      },
    },
    clock: () => new Date("2026-07-30T03:00:00.000Z"),
  });
  const context = clientDirectoryPermissionContext();
  const denied = readModel.readClientDetail({
    tenant_id: TENANT,
    permission_context: context,
    client_group_id: "client_hidden",
  });
  const unknown = readModel.readClientDetail({
    tenant_id: TENANT,
    permission_context: context,
    client_group_id: "client_unknown",
  });

  assert.deepEqual(denied, unknown);
  assert.equal(denied.item, null);
  assert.equal(denied.downstream_sources_read, false);
  assert.equal(
    JSON.stringify(denied).includes("client_hidden"),
    false,
  );
  assert.deepEqual(events, [
    "master-data:ClientGroup",
    "master-data:ClientGroup",
  ]);
});
