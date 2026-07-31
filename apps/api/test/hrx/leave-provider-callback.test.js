import assert from "node:assert/strict";
import test from "node:test";
import { createSqlLeaveBalanceLedger } from "../../../../packages/hrx/src/leave/balance.js";
import { runHrxMigrations } from "../../../../packages/hrx/src/migrations/index.js";
import { createFileHrxStore } from "../../../../packages/hrx/src/store/file-store.js";
import {
  createHrxRuntimeContext,
  seedHrxDurableRuntimeStore,
} from "../../src/hrx-runtime-context.js";
import { MATTER_VAULT_REGISTERED_TENANT_ID } from "../../src/matter-vault-account-registry.js";
import {
  LEAVE_PROVIDER_CALLBACK_PATH,
  LEAVE_PROVIDER_CALLBACK_POLICY,
  LEAVE_PROVIDER_TENANT_HEADER,
  handleLeaveProviderCallback,
} from "../../src/routes/hrx/leave-provider-callback.js";
import { startApiServer } from "../../src/server.js";

const TENANT = MATTER_VAULT_REGISTERED_TENANT_ID;
const EMPLOYEE = "emp_amic_yjlee";
const PROVIDER_ID = "leave-delivery-provider";
const PROVIDER_RECEIPT_REF = "LeaveDeliveryReceipt:provider-callback-001";
const NOW = "2026-07-15T04:00:00.000Z";

function setupRuntime() {
  const store = createFileHrxStore();
  runHrxMigrations(store);
  seedHrxDurableRuntimeStore(store);
  store.query("insert", {
    table: "hrx_leave_groups",
    row: {
      tenant_id: TENANT,
      group_id: "callback-promotion-group",
      code: "CALLBACK_PROMOTION_ANNUAL",
      display_name: "연차",
      status: "active",
      state_version: 1,
    },
  });
  store.query("insert", {
    table: "hrx_leave_policy_versions",
    row: {
      tenant_id: TENANT,
      policy_version_id: "callback-promotion-policy-v1",
      group_id: "callback-promotion-group",
      policy_code: "CALLBACK-PROMOTION-2026",
      version: 1,
      effective_from: "2026-01-01",
      effective_to: null,
      status: "active",
      rules_json: JSON.stringify({ promotion: { standard_day_minutes: 480, minimum_unused_minutes: 480 } }),
    },
  });
  store.query("insert", {
    table: "hrx_leave_entitlements",
    row: {
      tenant_id: TENANT,
      entitlement_id: "callback-promotion-entitlement",
      employee_id: EMPLOYEE,
      group_id: "callback-promotion-group",
      policy_version_id: "callback-promotion-policy-v1",
      granted_minutes: 960,
      valid_from: "2026-01-01",
      expires_on: "2026-12-31",
      source_ref: "LeaveAccrualRun:CALLBACK",
      idempotency_key: "callback-promotion-entitlement",
      state_version: 1,
    },
  });
  createSqlLeaveBalanceLedger({ store }).append({
    tenant_id: TENANT,
    entry_id: "callback-promotion-earned",
    employee_id: EMPLOYEE,
    policy_id: "CALLBACK-PROMOTION-2026",
    group_id: "callback-promotion-group",
    policy_version_id: "callback-promotion-policy-v1",
    entitlement_id: "callback-promotion-entitlement",
    idempotency_key: "callback-promotion-earned",
    entry_type: "earned",
    amount_minutes: 960,
    occurred_on: "2026-01-01",
    source_ref: "LeaveAccrualRun:CALLBACK",
  });
  const runtime = createHrxRuntimeContext({
    store,
    clock: () => NOW,
    leaveIntegrationProviders: {
      notification: {
        provider_id: PROVIDER_ID,
        mode: "provider_callback_test",
        async deliver() {
          return {
            provider_receipt_ref: PROVIDER_RECEIPT_REF,
            delivery_state: "accepted",
          };
        },
      },
    },
  });
  const promotionContext = {
    tenant_id: TENANT,
    actor_id: "promotion-operator",
    authorized_employee_ids: [EMPLOYEE],
  };
  const campaign = runtime.leavePromotionService.create(promotionContext, {
    policy_version_id: "callback-promotion-policy-v1",
    entitlement_period_end: "2026-12-31",
    schedule_profile_id: "kr_lsa61_standard_v2025_10_23",
    idempotency_key: "callback-promotion-campaign",
  });
  runtime.leavePromotionService.issueFirstNotice(
    promotionContext,
    campaign.recipients[0].recipient_id,
    { document_version: "notice-v1" },
  );
  return { store, runtime, promotionContext, campaign };
}

async function post(baseUrl, body, headers = {}) {
  const response = await fetch(`${baseUrl}${LEAVE_PROVIDER_CALLBACK_PATH}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      [LEAVE_PROVIDER_TENANT_HEADER]: TENANT,
      "x-provider-signature": "valid-test-signature",
      ...headers,
    },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}

test("leave provider callback keeps internal failures retryable", async () => {
  const body = {
    tenant_id: TENANT,
    event: {
      provider_event_id: "leave-provider-event-internal-failure",
      provider_receipt_ref: PROVIDER_RECEIPT_REF,
      provider_event_state: "delivered",
      event_occurred_at: "2026-07-15T04:05:00.000Z",
    },
  };
  const result = await handleLeaveProviderCallback({
    headers: { [LEAVE_PROVIDER_TENANT_HEADER]: TENANT },
    body,
    rawBody: Buffer.from(JSON.stringify(body)),
    requestId: "request-internal-failure",
    verifier: {
      async verify() {
        return { ok: true, tenant_id: TENANT, provider_id: PROVIDER_ID };
      },
    },
    runtime: {
      leaveIntegrationService: {
        applyProviderEvent() {
          throw new Error("database unavailable");
        },
      },
    },
  });
  assert.deepEqual(
    [result.status, result.body.safe_error_code, result.body.fail_closed],
    [503, "HRX_LEAVE_PROVIDER_CALLBACK_UNAVAILABLE", true],
  );
  assert.doesNotMatch(JSON.stringify(result.body), /database unavailable/);
});

test("PEO-TUW-058/059 signed provider callbacks advance sent to delivered and read exactly once", async () => {
  const { store, runtime, promotionContext, campaign } = setupRuntime();
  const outbox = store.query("selectOne", {
    table: "hrx_leave_sync_outbox",
    where: { tenant_id: TENANT, event_type: "leave.promotion.first_notice_issued" },
  });
  await runtime.leaveIntegrationService.process(
    { tenant_id: TENANT, actor_id: "integration-worker" },
    { event_ids: [outbox.outbox_event_id] },
  );
  const sentDelivery = runtime.leaveIntegrationService.list({ tenant_id: TENANT, actor_id: "integration-worker" })
    .rows.flatMap((row) => row.deliveries)
    .find((delivery) => delivery.outbox_event_id === outbox.outbox_event_id);
  assert.equal(sentDelivery.provider_result_state, "sent");
  assert.equal(runtime.leavePromotionService.get(promotionContext, campaign.campaign_id).recipients[0].first_delivery_state, "pending");

  const verifierCalls = [];
  const verifier = {
    async verify(input) {
      verifierCalls.push(input);
      if (input.headers["x-provider-signature"] !== "valid-test-signature") return { ok: false };
      return {
        ok: true,
        tenant_id: TENANT,
        provider_id: input.headers["x-provider-id"] ?? PROVIDER_ID,
      };
    },
  };
  const started = await startApiServer({
    port: 0,
    hrxRuntime: runtime,
    leaveProviderVerifier: verifier,
  });
  const baseUrl = `http://${started.host}:${started.port}`;
  try {
    assert.deepEqual(
      [
        LEAVE_PROVIDER_CALLBACK_POLICY.authentication,
        LEAVE_PROVIDER_CALLBACK_POLICY.tenant_source,
        LEAVE_PROVIDER_CALLBACK_POLICY.fail_closed,
      ],
      ["provider_signature", "verified_signature_claim", true],
    );
    const deliveredEvent = {
      tenant_id: TENANT,
      event: {
        provider_event_id: "leave-provider-event-delivered-001",
        provider_receipt_ref: PROVIDER_RECEIPT_REF,
        provider_event_state: "delivered",
        event_occurred_at: "2026-07-15T04:05:00.000Z",
      },
    };
    const invalidSignature = await post(baseUrl, deliveredEvent, { "x-provider-signature": "invalid" });
    assert.deepEqual(
      [invalidSignature.status, invalidSignature.body.safe_error_code],
      [401, "HRX_LEAVE_PROVIDER_SIGNATURE_INVALID"],
    );

    const crossedTenant = await post(baseUrl, { ...deliveredEvent, tenant_id: "tenant-other" });
    assert.deepEqual(
      [crossedTenant.status, crossedTenant.body.safe_error_code],
      [403, "HRX_LEAVE_PROVIDER_TENANT_MISMATCH"],
    );

    const wrongProvider = await post(baseUrl, deliveredEvent, { "x-provider-id": "other-leave-provider" });
    assert.deepEqual(
      [wrongProvider.status, wrongProvider.body.safe_error_code],
      [403, "HRX_LEAVE_PROVIDER_ID_MISMATCH"],
    );

    const delivered = await post(baseUrl, deliveredEvent);
    assert.deepEqual(
      [delivered.status, delivered.body.outcome, delivered.body.delivery.provider_result_state],
      [200, "applied", "delivered"],
    );
    assert.equal(delivered.body.raw_payload_included, false);
    assert.equal(delivered.body.private_fields_included, false);
    assert.doesNotMatch(JSON.stringify(delivered.body), /promotion_recipient_ref|document_ref|content_hash|employee_id/);
    let recipient = runtime.leavePromotionService.get(promotionContext, campaign.campaign_id).recipients[0];
    assert.equal(recipient.first_delivery_state, "delivered");
    assert.equal(recipient.first_delivered_at, "2026-07-15T04:05:00.000Z");
    assert.deepEqual(recipient.evidence_receipts.map((receipt) => receipt.event_type), ["delivered"]);

    const replay = await post(baseUrl, deliveredEvent);
    assert.deepEqual([replay.status, replay.body.outcome, replay.body.replayed], [200, "replayed", true]);
    assert.equal(runtime.leavePromotionService.get(promotionContext, campaign.campaign_id).recipients[0].evidence_receipts.length, 1);

    const duplicateConflict = await post(baseUrl, {
      ...deliveredEvent,
      event: { ...deliveredEvent.event, provider_event_state: "read" },
    });
    assert.deepEqual(
      [duplicateConflict.status, duplicateConflict.body.safe_error_code],
      [409, "HRX_LEAVE_PROVIDER_EVENT_CONFLICT"],
    );

    const backward = await post(baseUrl, {
      tenant_id: TENANT,
      event: {
        provider_event_id: "leave-provider-event-sent-late",
        provider_receipt_ref: PROVIDER_RECEIPT_REF,
        provider_event_state: "sent",
        event_occurred_at: "2026-07-15T04:06:00.000Z",
      },
    });
    assert.deepEqual(
      [backward.status, backward.body.safe_error_code],
      [409, "HRX_LEAVE_PROVIDER_RESULT_OUT_OF_ORDER"],
    );

    const read = await post(baseUrl, {
      tenant_id: TENANT,
      event: {
        provider_event_id: "leave-provider-event-read-001",
        provider_receipt_ref: PROVIDER_RECEIPT_REF,
        provider_event_state: "read",
        event_occurred_at: "2026-07-15T04:07:00.000Z",
      },
    });
    assert.deepEqual([read.status, read.body.outcome, read.body.delivery.provider_result_state], [200, "applied", "read"]);
    recipient = runtime.leavePromotionService.get(promotionContext, campaign.campaign_id).recipients[0];
    assert.equal(recipient.first_viewed_at, "2026-07-15T04:07:00.000Z");
    assert.deepEqual(recipient.evidence_receipts.map((receipt) => receipt.event_type).sort(), ["delivered", "viewed"]);

    const providerEvents = store.query("select", {
      table: "hrx_audit_events",
      where: { tenant_id: TENANT, object_id: sentDelivery.delivery_id },
    }).filter((event) => event.action.startsWith("hrx.leave.integration.provider_event."));
    assert.equal(providerEvents.length, 2);
    assert.ok(verifierCalls.every((call) => Buffer.isBuffer(call.raw_body)));
  } finally {
    await new Promise((resolve) => started.server.close(resolve));
    store.close();
  }
});
