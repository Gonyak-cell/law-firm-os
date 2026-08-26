import assert from "node:assert/strict";
import test from "node:test";

import { OUTLOOK_ADDIN_BOUNDED_CONTEXT } from "../src/outlook-addin-runtime-context.js";
import {
  OUTLOOK_INSTALLATION_ROUTE_CLASSES,
  OUTLOOK_INSTALLATION_ROUTE_POLICIES,
  auditOutlookInstallationRoutePolicies,
  classifyOutlookInstallationRoute,
} from "../src/outlook-installation-route-policy.js";

const E = OUTLOOK_INSTALLATION_ROUTE_CLASSES.lifecycleExempt;
const W = OUTLOOK_INSTALLATION_ROUTE_CLASSES.providerWebhookExempt;
const D = OUTLOOK_INSTALLATION_ROUTE_CLASSES.desktopLifecycleExempt;
const R = OUTLOOK_INSTALLATION_ROUTE_CLASSES.protectedRead;
const O = OUTLOOK_INSTALLATION_ROUTE_CLASSES.protectedOperation;

const EXPECTED = Object.freeze([
  ["GET", "/api/outlook/bootstrap", E],
  ["GET", "/api/outlook/connection", E],
  ["GET", "/api/outlook/readiness", E],
  ["POST", "/api/outlook/connection/authorize", E],
  ["POST", "/api/outlook/connection/complete", E],
  ["DELETE", "/api/outlook/connection", E],
  ["GET", "/api/outlook/connection/callback", E],
  ["GET", "/api/outlook/graph/notifications", W],
  ["POST", "/api/outlook/graph/notifications", W],

  ["GET", "/api/outlook/inquiries", R],
  ["POST", "/api/outlook/inquiries", O],
  ["POST", "/api/outlook/inquiries/message/resolve", O],
  ["GET", "/api/outlook/inquiries/evidence/:evidence_id/content", R],
  ["GET", "/api/outlook/matters", R],
  ["GET", "/api/outlook/precedents", R],
  ["GET", "/api/outlook/precedents/readiness", R],
  ["GET", "/api/outlook/matters/:matter_id/timeline", R],
  ["GET", "/api/outlook/matters/:matter_id/documents", R],
  ["POST", "/api/outlook/messages/identity", O],
  ["POST", "/api/outlook/operation-receipts/readback", R],
  ["POST", "/api/outlook/email/file", O],
  ["POST", "/api/outlook/email/corrections", O],
  ["GET", "/api/outlook/email/corrections/current", R],
  ["POST", "/api/outlook/sent/file", O],
  ["POST", "/api/outlook/attachments/save", O],
  ["POST", "/api/outlook/tasks", O],
  ["PATCH", "/api/outlook/tasks/:task_id", O],
  ["POST", "/api/outlook/followups", O],
  ["POST", "/api/outlook/time-entry-drafts", O],
  ["POST", "/api/outlook/smart-alerts/evaluate", O],
  ["GET", "/api/outlook/conversation-policies", R],
  ["POST", "/api/outlook/conversation-policies", O],
  ["POST", "/api/outlook/conversation-policies/:policy_id/revoke", O],

  ["GET", "/api/outlook/documents", R],
  ["POST", "/api/outlook/documents/approval-requests", O],
  ["POST", "/api/outlook/documents/:draft_id/publish", O],
  ["GET", "/api/outlook/esign-requests", R],
  ["POST", "/api/outlook/esign-requests", O],
  ["POST", "/api/outlook/esign-requests/:request_id/send", O],
  ["POST", "/api/outlook/esign-requests/:request_id/reconcile", O],

  ["POST", "/api/desktop/activation-challenges", D],
  ["POST", "/api/desktop/activation-proof-seeds", D],
  ["POST", "/api/desktop/activation-consumptions", D],
  ["POST", "/api/desktop/installations", D],
  ["GET", "/api/desktop/installations/:installation_id", D],
  ["POST", "/api/desktop/installations/:installation_id/heartbeat", D],
  ["POST", "/api/desktop/installations/:installation_id/retire", D],
]);

function samplePath(template, suffix = "sample") {
  return template.replace(/:[a-z_]+/gu, suffix);
}

test("the Outlook installation policy is one complete non-overlapping 47-route matrix", () => {
  assert.deepEqual(
    OUTLOOK_INSTALLATION_ROUTE_POLICIES.map(({ method, template, classification }) => (
      [method, template, classification]
    )),
    EXPECTED,
  );
  assert.deepEqual(auditOutlookInstallationRoutePolicies(), {
    policy_count: 47,
    duplicate_id_count: 0,
    duplicate_route_count: 0,
    ambiguous_sample_count: 0,
    unclassified_sample_count: 0,
    fail_closed: true,
  });
});

test("every bounded-context endpoint and separate document/e-sign dispatch is classified exactly once", () => {
  for (const contract of OUTLOOK_ADDIN_BOUNDED_CONTEXT.endpoints) {
    const [method, template] = contract.split(" ");
    const decision = classifyOutlookInstallationRoute(method, samplePath(template));
    assert.equal(decision.known, true, contract);
    assert.equal(decision.match_count, 1, contract);
  }

  for (const [method, template] of EXPECTED.slice(33, 40)) {
    const decision = classifyOutlookInstallationRoute(method, samplePath(template));
    assert.equal(decision.known, true, `${method} ${template}`);
    assert.equal(decision.requires_active_installation, true, `${method} ${template}`);
  }
});

test("setup, provider callbacks, and desktop lifecycle stay available without an active installation", () => {
  for (const [method, template, classification] of EXPECTED.filter((row) => [E, W, D].includes(row[2]))) {
    const decision = classifyOutlookInstallationRoute(method, `${samplePath(template)}/`);
    assert.equal(decision.classification, classification, `${method} ${template}`);
    assert.equal(decision.requires_active_installation, false, `${method} ${template}`);
    assert.equal(decision.fail_closed, true, `${method} ${template}`);
  }
});

test("protected reads and operations require current installation authority", () => {
  for (const [method, template, classification] of EXPECTED.filter((row) => [R, O].includes(row[2]))) {
    const decision = classifyOutlookInstallationRoute(method, samplePath(template));
    assert.equal(decision.classification, classification, `${method} ${template}`);
    assert.equal(decision.requires_active_installation, true, `${method} ${template}`);
    assert.equal(decision.fail_closed, true, `${method} ${template}`);
  }
});

test("an unknown Outlook route, a wrong method, and a malformed input fail closed", () => {
  for (const [method, pathname] of [
    ["POST", "/api/outlook/future-business-route"],
    ["GET", "/api/outlook/email/file"],
    ["TRACE", "/api/outlook/readiness"],
    ["GET", "/api/outlook-shadow"],
    ["GET", "/api/outlook%2Femail/file"],
    ["", "/api/outlook/readiness"],
    ["GET", "api/outlook/readiness"],
  ]) {
    const decision = classifyOutlookInstallationRoute(method, pathname);
    assert.deepEqual(decision, {
      known: false,
      match_count: 0,
      classification: OUTLOOK_INSTALLATION_ROUTE_CLASSES.unknown,
      requires_active_installation: true,
      fail_closed: true,
    });
  }
});

test("login APIs remain outside the Outlook installation-policy surface", () => {
  for (const pathname of [
    "/api/auth/session",
    "/api/auth/office-sso/config",
    "/api/auth/office-sso/exchange",
  ]) {
    const decision = classifyOutlookInstallationRoute("POST", pathname);
    assert.equal(decision.known, false);
    assert.equal(decision.classification, OUTLOOK_INSTALLATION_ROUTE_CLASSES.notApplicable);
    assert.equal(decision.requires_active_installation, false);
    assert.equal(decision.fail_closed, true);
  }
});
