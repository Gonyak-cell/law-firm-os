import assert from "node:assert/strict";
import test from "node:test";

import { OUTLOOK_ADDIN_BOUNDED_CONTEXT } from "../src/outlook-addin-runtime-context.js";
import {
  OUTLOOK_DESKTOP_AUTOCONNECT_REQUIRED_SCOPE,
  OUTLOOK_DESKTOP_AUTOCONNECT_ROSTER_SCHEMA_VERSION,
  parseOutlookDesktopAutoconnectRoster,
} from "../src/outlook-desktop-entitlement.js";
import {
  OUTLOOK_INSTALLATION_GUARD_ERROR_CODES,
  authorizeOutlookInstallationProtectedRoute,
} from "../src/outlook-installation-protected-route-gate.js";
import {
  OUTLOOK_INSTALLATION_ROUTE_CLASSES,
  OUTLOOK_INSTALLATION_ROUTE_POLICIES,
  auditOutlookInstallationRoutePolicies,
  classifyOutlookInstallationRoute,
} from "../src/outlook-installation-route-policy.js";
import { createApiServer } from "../src/server.js";

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

const TENANT = "tenant-installation-guard";
const USER = "user-installation-guard-01";
const SUBJECT = "subject-installation-guard-01";
const INSTALLATION = "odi_installation_guard_000001";
const PRINCIPAL = Object.freeze({
  tenant_id: TENANT,
  user_id: USER,
  entra_subject_id: SUBJECT,
  scopes: Object.freeze([OUTLOOK_DESKTOP_AUTOCONNECT_REQUIRED_SCOPE]),
});

function entitlementRoster() {
  return parseOutlookDesktopAutoconnectRoster({
    schema_version: OUTLOOK_DESKTOP_AUTOCONNECT_ROSTER_SCHEMA_VERSION,
    roster_version: "installation-guard-v1",
    entries: Array.from({ length: 10 }, (_, index) => ({
      tenant_id: TENANT,
      user_id: `user-installation-guard-${String(index + 1).padStart(2, "0")}`,
      entra_subject_id: `subject-installation-guard-${String(index + 1).padStart(2, "0")}`,
      enabled: true,
    })),
  });
}

function trustedInstallation(overrides = {}) {
  return Object.freeze({
    installation_id: INSTALLATION,
    status: "active",
    state_version: 7,
    lease_expires_at: "2099-08-26T02:00:00.000Z",
    retired_at: null,
    release_trusted: true,
    authority_snapshot_at: "2099-08-26T01:00:00.000Z",
    ...overrides,
  });
}

function runtime(readTrustedCurrent) {
  return Object.freeze({
    entitlement_roster: entitlementRoster(),
    installation_service: Object.freeze({ readTrustedCurrent }),
  });
}

function context({ allowed = true } = {}) {
  return Object.freeze({
    principal: PRINCIPAL,
    rules: Object.freeze(allowed ? [{
      id: "allow-outlook-installation-guard",
      effect: "allow",
      action: "*",
    }] : []),
    object_acl: Object.freeze([]),
  });
}

test("the common guard re-reads state-version, lease, and revoke authority for every protected request", async () => {
  let current = trustedInstallation();
  let reads = 0;
  const outlookDesktopRuntime = runtime(async ({ principal }) => {
    reads += 1;
    assert.deepEqual(principal, {
      tenant_id: TENANT,
      user_id: USER,
      entra_subject_id: SUBJECT,
    });
    return current;
  });
  const input = {
    method: "POST",
    pathname: "/api/outlook/email/file",
    principal: PRINCIPAL,
    context: context(),
    runtime: outlookDesktopRuntime,
  };

  const allowed = await authorizeOutlookInstallationProtectedRoute(input);
  assert.equal(allowed.allowed, true);
  assert.equal(allowed.installation.installation_id, INSTALLATION);
  assert.equal(allowed.installation.state_version, 7);

  current = trustedInstallation({ state_version: 8 });
  const renewed = await authorizeOutlookInstallationProtectedRoute(input);
  assert.equal(renewed.allowed, true);
  assert.equal(renewed.installation.state_version, 8);

  // The trusted-current authority returns null after lease expiry, retirement,
  // or release revocation. The very next protected request must fail closed.
  current = null;
  const revoked = await authorizeOutlookInstallationProtectedRoute(input);
  assert.equal(revoked.allowed, false);
  assert.equal(revoked.status, 403);
  assert.equal(
    revoked.safe_error_code,
    OUTLOOK_INSTALLATION_GUARD_ERROR_CODES.trustedInstallationRequired,
  );
  assert.equal(reads, 3);
});

test("the common guard fails closed without runtime, entitlement, or a strict trusted projection", async () => {
  const base = {
    method: "GET",
    pathname: "/api/outlook/matters",
    principal: PRINCIPAL,
    context: context(),
  };
  const cases = [
    [null, 503],
    [{}, 503],
    [runtime(async () => ({ ...trustedInstallation(), token: "must-not-escape" })), 503],
    [runtime(async () => trustedInstallation({ release_trusted: false })), 503],
    [runtime(async () => { throw new Error("private provider detail"); }), 503],
    [runtime(async () => {
      const error = new Error("private accessor detail");
      Object.defineProperty(error, "safe_error_code", {
        get() { throw new Error("private accessor trap"); },
      });
      throw error;
    }), 503],
  ];
  for (const [outlookDesktopRuntime, status] of cases) {
    const decision = await authorizeOutlookInstallationProtectedRoute({
      ...base,
      runtime: outlookDesktopRuntime,
    });
    assert.equal(decision.allowed, false);
    assert.equal(decision.status, status);
    assert.equal(JSON.stringify(decision).includes("private provider detail"), false);
    assert.equal(JSON.stringify(decision).includes("must-not-escape"), false);
  }
});

test("identity, entitlement, scope, and authority binding mismatches fail before protected work", async () => {
  let reads = 0;
  const outlookDesktopRuntime = runtime(async () => {
    reads += 1;
    return trustedInstallation();
  });
  const base = {
    method: "GET",
    pathname: "/api/outlook/matters",
    principal: PRINCIPAL,
    context: context(),
    runtime: outlookDesktopRuntime,
  };
  const mismatchedContext = {
    ...context(),
    principal: { ...PRINCIPAL, entra_subject_id: "subject-installation-guard-wrong" },
  };
  const identityMismatch = await authorizeOutlookInstallationProtectedRoute({
    ...base,
    context: mismatchedContext,
  });
  assert.equal(identityMismatch.status, 403);
  assert.equal(
    identityMismatch.safe_error_code,
    OUTLOOK_INSTALLATION_GUARD_ERROR_CODES.bindingMismatch,
  );

  const scopeMissing = await authorizeOutlookInstallationProtectedRoute({
    ...base,
    principal: { ...PRINCIPAL, scopes: [] },
  });
  assert.equal(scopeMissing.status, 403);
  assert.equal(scopeMissing.safe_error_code, "OUTLOOK_DESKTOP_PERMISSION_REQUIRED");

  const unassigned = await authorizeOutlookInstallationProtectedRoute({
    ...base,
    principal: {
      ...PRINCIPAL,
      user_id: "user-installation-guard-unassigned",
      entra_subject_id: "subject-installation-guard-unassigned",
    },
    context: {
      ...context(),
      principal: {
        ...PRINCIPAL,
        user_id: "user-installation-guard-unassigned",
        entra_subject_id: "subject-installation-guard-unassigned",
      },
    },
  });
  assert.equal(unassigned.status, 403);
  assert.equal(unassigned.safe_error_code, "OUTLOOK_DESKTOP_NOT_ENTITLED");
  assert.equal(reads, 0);

  const bindingRuntime = runtime(async () => {
    reads += 1;
    throw Object.assign(new Error("private binding detail"), {
      safe_error_code: OUTLOOK_INSTALLATION_GUARD_ERROR_CODES.bindingMismatch,
    });
  });
  const authorityMismatch = await authorizeOutlookInstallationProtectedRoute({
    ...base,
    runtime: bindingRuntime,
  });
  assert.equal(authorityMismatch.status, 403);
  assert.equal(
    authorityMismatch.safe_error_code,
    OUTLOOK_INSTALLATION_GUARD_ERROR_CODES.bindingMismatch,
  );
  assert.equal(JSON.stringify(authorityMismatch).includes("private binding detail"), false);
  assert.equal(reads, 1);
});

test("exempt lifecycle routes never read installation authority and unknown Outlook routes are blocked", async () => {
  let reads = 0;
  const outlookDesktopRuntime = runtime(async () => {
    reads += 1;
    return trustedInstallation();
  });
  for (const [method, pathname] of [
    ["GET", "/api/outlook/readiness"],
    ["DELETE", "/api/outlook/connection"],
    ["POST", "/api/desktop/installations/odi_installation_guard_000001/retire"],
  ]) {
    const decision = await authorizeOutlookInstallationProtectedRoute({
      method,
      pathname,
      principal: PRINCIPAL,
      context: context(),
      runtime: outlookDesktopRuntime,
    });
    assert.equal(decision.allowed, true);
    assert.equal(decision.installation, null);
  }
  const unknown = await authorizeOutlookInstallationProtectedRoute({
    method: "POST",
    pathname: "/api/outlook/future-write",
    principal: PRINCIPAL,
    context: context(),
    runtime: outlookDesktopRuntime,
  });
  assert.equal(unknown.allowed, false);
  assert.equal(unknown.status, 404);
  assert.equal(reads, 0);
});

async function withServer(options, callback) {
  const server = createApiServer(options);
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  try {
    return await callback(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test("HTTP dispatch blocks domain work before install authority and still rechecks Matter ACL", async () => {
  let current = null;
  let installationReads = 0;
  let matterReads = 0;
  let matterAllowed = true;
  const permissionContext = () => context({ allowed: matterAllowed });
  const sessionAuth = {
    capabilities: {},
    async resolvePermissionContextFromHeaders() {
      return {
        ok: true,
        principal: PRINCIPAL,
        context: permissionContext(),
        token_payload: { surface: "outlook_addin" },
      };
    },
  };
  const matterRuntime = {
    repository: {
      list() {
        matterReads += 1;
        return [];
      },
    },
  };
  const outlookDesktopRuntime = runtime(async () => {
    installationReads += 1;
    return current;
  });

  await withServer({
    matterRuntime,
    outlookDesktopRuntime,
    sessionAuth,
  }, async (baseUrl) => {
    const request = () => fetch(`${baseUrl}/api/outlook/matters`, {
      headers: { authorization: "Bearer signed-outlook-session" },
    });

    const missing = await request();
    assert.equal(missing.status, 403);
    assert.equal(matterReads, 0);

    current = trustedInstallation();
    const allowed = await request();
    assert.equal(allowed.status, 200, await allowed.text());
    assert.equal(matterReads, 1);

    matterAllowed = false;
    const matterDenied = await request();
    assert.equal(matterDenied.status, 403);
    assert.equal(matterReads, 1);

    matterAllowed = true;
    current = null;
    const revoked = await request();
    assert.equal(revoked.status, 403);
    assert.equal(matterReads, 1);
  });
  assert.equal(installationReads, 4);
});

test("active authority then revoke denies every protected read and write before body or domain dispatch", async () => {
  let installationReads = 0;
  let current = trustedInstallation();
  const revokedRuntime = runtime(async () => {
    installationReads += 1;
    return current;
  });
  const sessionAuth = {
    capabilities: {},
    async resolvePermissionContextFromHeaders() {
      return {
        ok: true,
        principal: PRINCIPAL,
        context: context(),
        token_payload: { surface: "outlook_addin" },
      };
    },
  };
  const protectedRequests = EXPECTED
    .filter(([, , classification]) => [R, O].includes(classification))
    .map(([method, template]) => [method, samplePath(template, "guard")]);
  assert.equal(protectedRequests.length, 31);

  const ready = await authorizeOutlookInstallationProtectedRoute({
    method: "POST",
    pathname: "/api/outlook/email/file",
    principal: PRINCIPAL,
    context: context(),
    runtime: revokedRuntime,
  });
  assert.equal(ready.allowed, true);
  current = null;

  await withServer({
    outlookDesktopRuntime: revokedRuntime,
    sessionAuth,
  }, async (baseUrl) => {
    for (const [method, pathname] of protectedRequests) {
      const hasBody = method !== "GET";
      const response = await fetch(`${baseUrl}${pathname}`, {
        method,
        headers: {
          authorization: "Bearer signed-outlook-session",
          ...(hasBody ? { "content-type": "application/json" } : {}),
        },
        ...(hasBody ? { body: "{" } : {}),
      });
      const body = await response.json();
      assert.equal(response.status, 403, `${method} ${pathname}`);
      assert.deepEqual(
        body.safe_error_codes,
        [OUTLOOK_INSTALLATION_GUARD_ERROR_CODES.trustedInstallationRequired],
        `${method} ${pathname}`,
      );
    }

    const bootstrap = await fetch(`${baseUrl}/api/outlook/bootstrap`, {
      headers: { authorization: "Bearer signed-outlook-session" },
    });
    assert.equal(bootstrap.status, 200, await bootstrap.text());

    const connectionDelete = await fetch(`${baseUrl}/api/outlook/connection`, {
      method: "DELETE",
      headers: { authorization: "Bearer signed-outlook-session" },
    });
    const connectionDeleteBody = await connectionDelete.json();
    assert.notDeepEqual(
      connectionDeleteBody.safe_error_codes,
      [OUTLOOK_INSTALLATION_GUARD_ERROR_CODES.trustedInstallationRequired],
    );
  });
  assert.equal(installationReads, protectedRequests.length + 1);
});
