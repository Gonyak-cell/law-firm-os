import assert from "node:assert/strict";
import test from "node:test";
import { DeepLinkError } from "../src/main/deepLinks.js";
import { createDesktopNotificationPayload, notificationClickToRouteIntent } from "../src/main/notifications.js";

test("notification click passes only route intent through deep-link parser", () => {
  const parsedInputs = [];
  const payload = createDesktopNotificationPayload({
    id: "notif_001",
    routeUrl: "matter://matter/MAT-248?tenant=tenant_hash",
    templateId: "workspace_update"
  });
  payload.clientName = "Sensitive Client";
  payload.matterName = "Sensitive Matter";

  const result = notificationClickToRouteIntent(payload, {
    parse(routeUrl) {
      parsedInputs.push(routeUrl);
      return { type: "matter", matterId: "MAT-248", routeOnly: true };
    }
  });

  assert.deepEqual(parsedInputs, ["matter://matter/MAT-248?tenant=tenant_hash"]);
  assert.equal(payload.title, "matter update");
  assert.equal(payload.body, "Open matter to continue");
  assert.equal(result.source, "notification");
  assert.equal(result.routeOnly, true);
  assert.deepEqual(result.intent, { type: "matter", matterId: "MAT-248", routeOnly: true });
  assert.equal(JSON.stringify(result).includes("Sensitive Client"), false);
  assert.equal(JSON.stringify(result).includes("Sensitive Matter"), false);
});

test("notification click rejects action execution route through parser", () => {
  const payload = createDesktopNotificationPayload({
    id: "notif_002",
    routeUrl: "matter://download/doc_123"
  });

  assert.throws(
    () => notificationClickToRouteIntent(payload),
    (error) => error instanceof DeepLinkError && error.code === "FORBIDDEN_ACTION_LINK"
  );
});
