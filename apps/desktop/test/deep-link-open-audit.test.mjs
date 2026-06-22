import assert from "node:assert/strict";
import test from "node:test";
import { openMatterDeepLink } from "../src/main/deepLinks.js";

function openHarness({ allowed = true } = {}) {
  const order = [];
  const permissionChecks = [];
  const auditEvents = [];
  const permissionClient = {
    async precheckDeepLinkOpen(request) {
      order.push("precheck");
      permissionChecks.push(request);
      return allowed ? { allowed: true, decisionId: `decision-${request.routeType}` } : { allowed: false, reason: "route_denied" };
    }
  };
  const auditLogger = {
    async record(event) {
      order.push("audit");
      auditEvents.push(event);
    }
  };
  return { auditEvents, order, permissionChecks, permissionClient, auditLogger };
}

test("opening a valid matter route rechecks backend permission and records open audit", async () => {
  const harness = openHarness();
  const result = await openMatterDeepLink({
    url: "matter://matter/MAT-248?tenant=tenant_hash",
    permissionClient: harness.permissionClient,
    auditLogger: harness.auditLogger
  });

  assert.deepEqual(harness.order, ["precheck", "audit"]);
  assert.equal(harness.permissionChecks[0].routeType, "matter");
  assert.equal(harness.permissionChecks[0].permission, "deep_link.open.matter");
  assert.equal(harness.permissionChecks[0].matterId, "MAT-248");
  assert.equal(result.state, "open");
  assert.equal(result.intent.routeOnly, true);
  assert.equal(result.permissionDecisionId, "decision-matter");
  assert.equal(harness.auditEvents[0].eventName, "deep_link.matter.opened");
});

test("opening a denied document route records denied audit and does not open", async () => {
  const harness = openHarness({ allowed: false });
  const result = await openMatterDeepLink({
    url: "matter://document/doc_123?matter=MAT-248",
    permissionClient: harness.permissionClient,
    auditLogger: harness.auditLogger
  });

  assert.deepEqual(harness.order, ["precheck", "audit"]);
  assert.equal(result.state, "denied");
  assert.equal(result.reason, "route_denied");
  assert.equal(harness.auditEvents[0].eventName, "deep_link.document.denied");
});

test("opening auth callback records audit without workspace permission precheck", async () => {
  const harness = openHarness();
  const result = await openMatterDeepLink({
    url: "matter://auth/callback?code=abc&state=def&issuer=idp",
    permissionClient: harness.permissionClient,
    auditLogger: harness.auditLogger
  });

  assert.deepEqual(harness.order, ["audit"]);
  assert.equal(result.state, "open");
  assert.equal(result.intent.type, "auth_callback");
  assert.equal(harness.auditEvents[0].eventName, "deep_link.auth_callback.opened");
});
