import assert from "node:assert/strict";
import test from "node:test";
import {
  LAWOS_NOTIFICATION_EVENT_CLASSES,
  createNotificationFiringService,
} from "../src/index.js";

const BASE_EVENT = Object.freeze({
  tenant_id: "tenant_notifications_test",
  actor_id: "user_notifications_test",
  recipient_user_id: "user_lawyer_001",
  recipient_email: "lawyer@example.invalid",
  resource_ref: "matter:matter_notifications_test",
});

function event(eventClass, index) {
  return {
    ...BASE_EVENT,
    event_id: `notification-test-${eventClass}`,
    event_class: eventClass,
    title: `Notification ${index}`,
    body: `Body ${index}`,
  };
}

test("notification firing records SES-shaped email and in-app delivery for all required classes", async () => {
  const service = createNotificationFiringService({
    now: () => "2026-07-03T00:00:00.000+09:00",
  });
  const result = await service.fireRequiredEventClasses(
    LAWOS_NOTIFICATION_EVENT_CLASSES.map((eventClass, index) => event(eventClass, index + 1)),
  );

  assert.equal(result.outcome, "passed");
  assert.deepEqual([...result.fired_event_classes].sort(), [...LAWOS_NOTIFICATION_EVENT_CLASSES].sort());
  assert.equal(result.in_app_count, 4);
  assert.equal(result.ses_send_count, 4);
  assert.equal(result.external_ses_network_call_made, false);
  for (const receipt of result.receipts) {
    assert.equal(receipt.outcome, "fired");
    assert.equal(receipt.all_channels_recorded, true);
    assert.equal(receipt.in_app_delivery.state, "delivered");
    assert.equal(receipt.ses_send_record.provider, "aws-ses");
    assert.equal(receipt.ses_send_record.state, "accepted");
    assert.equal(receipt.ses_send_record.payload_body_included, false);
    assert.equal(receipt.ses_send_record.credential_material_included, false);
  }
});

test("notification firing rejects unsupported event classes", async () => {
  const service = createNotificationFiringService();
  await assert.rejects(
    () => service.fireEvent(event("unsupported_event", 1)),
    /event_class must be one of/,
  );
});
