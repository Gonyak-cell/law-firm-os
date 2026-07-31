import assert from "node:assert/strict";
import test from "node:test";
import {
  assertLeaveCalendarProjection,
  createCompositeLeaveIntegrationProvider,
  createExternalLeaveCalendarAdapter,
  createLeaveCollaborationAdapter,
  createMatterLeaveCalendarAdapter,
  resolveLeaveIntegrationProviderSwitches,
} from "../src/leave/provider-adapters.js";

const NOW = "2026-07-14T00:00:00.000Z";
const calendarPayload = Object.freeze({
  schema_version: "law-firm-os.hrx.leave-schedule-projection.v0.1",
  operation: "upsert",
  schedule_object_ref: "LeaveSchedule:request-001",
  owner_ref: "HRXEmployee:employee-001",
  start_date: "2026-07-20",
  end_date: "2026-07-20",
  timezone: "Asia/Seoul",
  public_title: "휴가",
  coworker_visibility: "title_only",
  leave_type_included: false,
  reason_included: false,
  attachments_included: false,
  documents_included: false,
  private_description_included: false,
});

function deliveryInput(payload, key) {
  return { tenant_id: "tenant-synthetic", provider_kind: "schedule", event_type: "leave.request.approved", idempotency_key: key, payload };
}

test("LV-INT-001 and LV-INT-002 keep one private Matter event through approve, change, and cancel", async () => {
  const writes = [];
  const adapter = createMatterLeaveCalendarAdapter({ clock: () => NOW, write: (event) => writes.push(event) });
  const approved = await adapter.deliver(deliveryInput(calendarPayload, "calendar:approve"));
  const changedPayload = { ...calendarPayload, start_date: "2026-07-21", end_date: "2026-07-21" };
  await adapter.deliver(deliveryInput(changedPayload, "calendar:change"));
  await adapter.deliver(deliveryInput({ ...changedPayload, operation: "delete" }, "calendar:cancel"));
  await adapter.deliver(deliveryInput({ ...changedPayload, operation: "delete" }, "calendar:cancel"));

  assert.match(approved.provider_receipt_ref, /^MatterCalendarReceipt:/);
  assert.equal(approved.delivery_state, "delivered");
  assert.deepEqual(writes.map((row) => row.operation), ["upsert", "upsert", "delete"]);
  assert.equal(new Set(writes.map((row) => row.event_id)).size, 1);
  assert.doesNotMatch(JSON.stringify(writes), /"(employee_id|leave_type|leave_type_id|reason|reason_text|attachment_id|attachment_ids|document_id|document_ids)":/);
  assert.throws(() => assertLeaveCalendarProjection({ ...calendarPayload, reason_text: "비공개" }), /must not include reason_text/);
});

test("LV-INT-003 Google and Outlook adapters use opaque OAuth references, deterministic IDs, receipts, and retry deduplication", async () => {
  for (const providerId of ["google_calendar", "outlook_calendar"]) {
    const commands = [];
    const client = {
      async upsertEvent(command) { commands.push({ operation: "upsert", ...command }); return { provider_receipt_ref: `${providerId}:upsert:receipt` }; },
      async deleteEvent(command) { commands.push({ operation: "delete", ...command }); return { provider_receipt_ref: `${providerId}:delete:receipt` }; },
    };
    const adapter = createExternalLeaveCalendarAdapter({ providerId, oauthReference: `OAuthConnection:${providerId}:sandbox`, client, clock: () => NOW });
    const upserted = await adapter.deliver(deliveryInput(calendarPayload, `${providerId}:upsert`));
    const replayed = await adapter.deliver(deliveryInput(calendarPayload, `${providerId}:upsert`));
    const deleted = await adapter.deliver(deliveryInput({ ...calendarPayload, operation: "delete" }, `${providerId}:delete`));
    assert.equal(commands.length, 2);
    assert.equal(upserted.delivery_state, "delivered");
    assert.deepEqual(replayed, upserted);
    assert.equal(deleted.delivery_state, "delivered");
    assert.equal(commands[0].event_id, commands[1].event_id);
    assert.deepEqual(commands.map((row) => row.operation), ["upsert", "delete"]);
    assert.doesNotMatch(JSON.stringify(commands), /access_token|refresh_token|client_secret|Bearer /i);
  }
  assert.throws(() => createExternalLeaveCalendarAdapter({ providerId: "google_calendar", oauthReference: "Bearer secret", client: {} }), /opaque connection reference/);
});

test("LV-INT-004 Slack and Teams send only one minimal public notification per idempotency key", async () => {
  const payloads = ["submitted", "approved", "reschedule_accepted", "cancelled_after_approval"].map((state) => ({
    schema_version: "law-firm-os.hrx.leave-notification.v0.1",
    event_code: `leave.request.${state}`,
    title: "휴가 신청 상태를 확인해 주세요",
    recipient_token: "recipient-token-001",
    route: "people-leave-requests",
    private_fields_included: false,
    requested_dates_included: false,
  }));
  for (const providerId of ["slack", "teams"]) {
    const commands = [];
    const adapter = createLeaveCollaborationAdapter({
      providerId,
      connectionReference: `CollaborationConnection:${providerId}:sandbox`,
      client: { async sendNotification(command) { commands.push(command); return { provider_receipt_ref: `${providerId}:${command.notification_id}` }; } },
      clock: () => NOW,
    });
    const composite = createCompositeLeaveIntegrationProvider({ providerKind: "notification", providers: [adapter] });
    for (const [index, payload] of payloads.entries()) {
      const input = { ...deliveryInput(payload, `${providerId}:${index}`), provider_kind: "notification", event_type: payload.event_code };
      const sent = await composite.deliver(input);
      const replayed = await composite.deliver(input);
      assert.equal(sent.delivery_state, "sent");
      assert.deepEqual(replayed, sent);
    }
    assert.equal(commands.length, 4);
    assert.doesNotMatch(JSON.stringify(commands), /employee_id|reason|attachment|document_id|start_date|end_date/);
  }
});

test("each leave integration target has an independent fail-closed switch", () => {
  assert.deepEqual(resolveLeaveIntegrationProviderSwitches(), {
    schedule: true,
    attendance: true,
    payroll: true,
    notification: true,
  });
  assert.deepEqual(resolveLeaveIntegrationProviderSwitches({
    schedule: false,
    notification: false,
  }), {
    schedule: false,
    attendance: true,
    payroll: true,
    notification: false,
  });
  assert.throws(
    () => resolveLeaveIntegrationProviderSwitches({ email: false }),
    /unsupported leave integration provider switch/,
  );
  assert.throws(
    () => resolveLeaveIntegrationProviderSwitches({ payroll: "false" }),
    /must be boolean/,
  );
});
