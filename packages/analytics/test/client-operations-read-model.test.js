import assert from "node:assert/strict";
import test from "node:test";

import {
  buildClientDepositRevenue,
} from "../../billing/src/client-deposit-revenue-service.js";
import {
  createClientOperationsReadModel,
  resolveClientOperationsAccessScope,
} from "../src/client-operations-read-model.js";

const TENANT = "tenant_client_operations_t01";
const STAFF = "principal_staff";

function repository(records, events, source) {
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
