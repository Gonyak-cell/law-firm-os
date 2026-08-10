import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import * as uiContract from "../src/outlook-ui-contract.js";
import {
  buildInquiryRegistrationRequest,
  createInquiryLoadFence,
  outlookInquiryActionErrorMessage,
} from "../src/inquiry-actions.js";
import {
  buildInquiryActionResult,
  createOutlookInquiryRuntime,
} from "../src/outlook-inquiry-actions.js";
import { createOutlookAuthRuntime } from "../src/outlook-auth-runtime.js";

const INQUIRY_SOURCE = readFileSync(new URL("../src/inquiry-entry.jsx", import.meta.url), "utf8");
const INQUIRY_SHELL_SOURCE = readFileSync(new URL("../src/outlook-inquiry-shell.jsx", import.meta.url), "utf8");
const INQUIRY_VITE_CONFIG = readFileSync(new URL("../vite.inquiry.config.js", import.meta.url), "utf8");
const INQUIRY_MANIFEST = readFileSync(new URL("../manifest.inquiry.production.xml", import.meta.url), "utf8");

const EXPECTED_ACTIONS = ["inquiry.create", "inquiry.link-existing"];

function registeredResponse({ action = "new", lead_id = "lead-a", idempotent_replay = false } = {}) {
  return {
    request_id: `request-${lead_id}-${idempotent_replay ? "replay" : "first"}`,
    outcome: "registered",
    credential_material_included: false,
    item: {
      outcome: "registered",
      action,
      inquiry_email_evidence_id: `evidence-${lead_id}`,
      lead_id,
      capture_status: "complete",
      raw_content_included: false,
      credential_material_included: false,
      production_ready_claim: false,
      idempotent_replay,
    },
  };
}

function sessionWindow(Office, initialToken = "lawos_session_v1.owner-a") {
  let token = initialToken;
  return {
    windowObject: {
      Office,
      sessionStorage: {
        getItem: () => token || null,
        setItem: (_key, value) => { token = value; },
        removeItem: () => { token = ""; },
      },
    },
    token: () => token,
  };
}

async function waitForPendingRequest(pending, expected = 1, timeoutMs = 1000) {
  const deadline = Date.now() + timeoutMs;
  while (pending.length < expected) {
    if (Date.now() >= deadline) {
      throw new Error(`timed out waiting for ${expected} pending request(s)`);
    }
    await new Promise((resolve) => setImmediate(resolve));
  }
}

function inquiryEntryContract() {
  const contract = uiContract.OUTLOOK_UI_CONTRACT;
  assert.ok(contract && typeof contract === "object", "OUTM-10 requires the UI contract");
  assert.ok(contract.inquiryEntry && typeof contract.inquiryEntry === "object",
    "OUTM-10 requires OUTLOOK_UI_CONTRACT.inquiryEntry");
  return contract.inquiryEntry;
}

test("OUTM-10 inquiry entry has one fixed inquiry profile trigger and exactly two inquiry actions", () => {
  const entry = inquiryEntryContract();
  assert.equal(entry.profile, "inquiry-only");
  assert.equal(entry.triggerIcon, "UserPlus");
  assert.equal(entry.triggerCount, 1);
  assert.deepEqual(entry.actions, EXPECTED_ACTIONS);
  assert.equal(entry.visibleLabel, false);
  assert.equal(entry.tooltip, false);
  assert.equal(entry.badge, false);
  assert.equal(entry.fullSurfaceImport, false);
  assert.equal(entry.matterActionEscalation, false);
});

test("OUTM-10 inquiry source imports only the fixed inquiry shell", () => {
  assert.match(INQUIRY_SOURCE, /bootstrapOutlookSurface\(\s*["']inquiry-only["']/u);
  assert.match(INQUIRY_SOURCE, /outlook-inquiry-shell\.jsx/u);
  assert.match(INQUIRY_SOURCE, /OutlookInquiryCompactShell/u);
  assert.match(INQUIRY_SOURCE, /inquiry\.create|runAction\(["']new["']/iu);
  assert.match(INQUIRY_SOURCE, /inquiry\.link-existing|runAction\(["']link_existing["']/iu);
  assert.equal((INQUIRY_SOURCE.match(/새 문의 등록/gu) ?? []).length, 1,
    "the create action label must not be duplicated beside its button");
  assert.equal((INQUIRY_SOURCE.match(/기존 문의 연결/gu) ?? []).length, 1,
    "the link action label must not be duplicated beside its button");
  assert.doesNotMatch(INQUIRY_SOURCE, /from ["'][^"']*(?:main|outlook-feature-catalog|outlook-matter|outlook-filing)[^"']*["']/iu,
    "the 952 entrypoint must not import full-surface or Matter-only capability modules");
  assert.doesNotMatch(INQUIRY_SOURCE, /from ["']\.\/outlook-(?:taskpane-runtime|item-content)\.js["']/u,
    "the 952 entrypoint must use the narrow inquiry runtime and identity seam");
  assert.match(INQUIRY_SOURCE, /createOutlookInquiryRuntime/u);
  assert.match(INQUIRY_SOURCE, /createInquiryLoadFence/u);
  assert.match(INQUIRY_SOURCE, /inquiryLoadFence\.transition\(next\.authState/u);
  assert.match(INQUIRY_SOURCE, /if \(!isCurrentLoad\(\)\) return/u);
  assert.doesNotMatch(INQUIRY_SOURCE, /\bOutlookCompactShell\b/u,
    "the 952 entrypoint must use the fixed profile leaf rather than the generic shell wrapper");
  assert.doesNotMatch(INQUIRY_SOURCE, /clientInquiryOnly\s*===?\s*["']1["'].*(?:profile|action|matter)|(?:profile|action|matter).*clientInquiryOnly\s*===?\s*["']1["']/isu,
    "query parameters may not escalate the fixed inquiry profile");
  assert.equal(entryQueryEscalation(), false);
});

test("inquiry errors allowlist safe copy and fail closed for foreign Matter codes or user messages", () => {
  const generic = "처리하지 못했습니다. 잠시 후 다시 시도해 주세요.";
  assert.equal(
    outlookInquiryActionErrorMessage({
      safe_error_code: "OUTLOOK_ADDIN_MATTER_INACTIVE",
      user_message: "이 Matter는 현재 보관 작업을 받을 수 없습니다. 상태를 확인해 주세요.",
    }),
    generic,
  );
  assert.equal(
    outlookInquiryActionErrorMessage({
      safe_error_code: "OUTLOOK_MATTER_SELECTION_REQUIRED",
      user_message: "현재 메일에서 Matter를 다시 선택해 주세요.",
    }),
    generic,
  );
  assert.equal(
    outlookInquiryActionErrorMessage({
      safe_error_code: "OUTLOOK_MATTER_SELECTION_STALE",
      user_message: "Matter 권한 또는 상태가 바뀌었습니다. 다시 선택해 주세요.",
    }),
    generic,
  );
  assert.equal(
    outlookInquiryActionErrorMessage({
      safe_error_code: "OUTLOOK_INQUIRY_LEAD_NOT_FOUND",
      user_message: "foreign user copy must not win",
    }),
    "선택한 문의를 찾을 수 없습니다. 목록을 새로 불러와 주세요.",
  );
});

test("inquiry receipt validation rejects malformed 2xx bodies and strips internal fields", () => {
  const sourceItem = {
    graph_message_id: "rest-a",
    internet_message_id: "<a@example.invalid>",
    conversation_id: "conversation-a",
  };
  const valid = registeredResponse();
  valid.item.tenant_id = "tenant-secret";
  for (const body of [
    {},
    { ...valid, item: { ...valid.item, action: "link_existing" } },
    { ...valid, outcome: "created" },
    { ...valid, item: { ...valid.item, lead_id: "" } },
    { ...valid, item: { ...valid.item, lead_id: "lead-a\nunsafe" } },
    { ...valid, item: { ...valid.item, idempotent_replay: "false" } },
    { ...valid, request_id: "" },
    { ...valid, credential_material_included: true },
    { ...valid, item: { ...valid.item, inquiry_email_evidence_id: "" } },
    { ...valid, item: { ...valid.item, capture_status: "in_progress" } },
    { ...valid, item: { ...valid.item, raw_content_included: true } },
    { ...valid, item: { ...valid.item, production_ready_claim: true } },
  ]) {
    assert.throws(
      () => buildInquiryActionResult({ action: "new", body, item: sourceItem }),
      (error) => error?.safe_error_code === "API_RESPONSE_INVALID",
    );
  }
  const result = buildInquiryActionResult({ action: "new", body: valid, item: sourceItem });
  assert.deepEqual(result.item, { lead_id: "lead-a", idempotent_replay: false });
  assert.equal("tenant_id" in result.item, false);
  assert.equal("raw_content_included" in result.item, false);
});

test("a bound A owner accepts interactive B sign-in only through a new owner generation", async () => {
  const session = sessionWindow(null);
  const auth = createOutlookAuthRuntime({
    windowObject: session.windowObject,
    acquireLawosSession: async ({ interactive }) => ({
      authenticated: true,
      session_token: interactive
        ? "lawos_session_v1.owner-b"
        : "lawos_session_v1.owner-a",
    }),
  });
  const ownerA = await auth.createSessionRequestContext();
  assert.equal(ownerA.isCurrent(), true);

  const signedIn = await auth.signIn();

  assert.equal(signedIn.authState, "authenticated");
  assert.equal(auth.isAuthOwnerCurrent(signedIn.authOwner), true);
  assert.equal(ownerA.isCurrent(), false);
  assert.equal(session.token(), "lawos_session_v1.owner-b");
});

test("the real HTTP seam rejects a late A 401 before it can clear interactive B", async () => {
  const session = sessionWindow(null);
  const pending = [];
  const auth = createOutlookAuthRuntime({
    windowObject: {
      ...session.windowObject,
      location: { origin: "https://addin.example.invalid" },
    },
    fetchImpl: async (url) => {
      if (url.endsWith("/api/auth/office-sso/config")) {
        return new Response(JSON.stringify({
          client_id: "22222222-2222-4222-8222-222222222222",
          tenant_id: "11111111-1111-4111-8111-111111111111",
          api_scope: "api://22222222-2222-4222-8222-222222222222/access_as_user",
          callback_uri: "https://addin.example.invalid/api/outlook/connection/callback",
        }), { status: 200, headers: { "content-type": "application/json" } });
      }
      return new Promise((resolve) => pending.push({ resolve }));
    },
    acquireLawosSession: async ({ interactive }) => {
      assert.equal(interactive, true, "late A must not start silent recovery under B");
      return { authenticated: true, session_token: "lawos_session_v1.owner-b" };
    },
  });
  const ownerA = await auth.createSessionRequestContext();
  const requestA = ownerA.requestJson("/api/outlook/inquiries", { method: "POST", body: {} });
  await waitForPendingRequest(pending);

  const signedIn = await auth.signIn();
  pending[0].resolve(new Response(JSON.stringify({ safe_error_codes: ["AUTH_SESSION_INVALID"] }), {
    status: 401,
    headers: { "content-type": "application/json" },
  }));

  await assert.rejects(
    requestA,
    (error) => error?.safe_error_code === "AUTH_SESSION_OWNER_CHANGED",
  );
  assert.equal(signedIn.authState, "authenticated");
  assert.equal(ownerA.isCurrent(), false);
  assert.equal(session.token(), "lawos_session_v1.owner-b");
  assert.equal(pending.length, 1);
});

for (const late of ["success", "error", "unauthorized"]) {
  test(`late A ${late} cannot replace B inquiry state, receipt, token, or busy owner`, async () => {
    const Office = {
      context: {
        mailbox: {
          item: {
            itemId: "office-auth-race",
            internetMessageId: "<auth-race@example.invalid>",
            conversationId: "conversation-auth-race",
            subject: "인증 경쟁",
          },
          convertToRestId(value) { return `rest-${value}`; },
        },
      },
      MailboxEnums: { RestVersion: { v2_0: "v2.0" } },
    };
    const session = sessionWindow(Office);
    const pending = [];
    let interactiveAcquisitions = 0;
    let silentAcquisitions = 0;
    const runtime = createOutlookInquiryRuntime({
      windowObject: session.windowObject,
      Office,
      initialAuthState: "authenticated",
      authenticateOnStart: false,
      acquireLawosSession: async ({ interactive }) => {
        if (interactive) {
          interactiveAcquisitions += 1;
          return { authenticated: true, session_token: "lawos_session_v1.owner-b" };
        }
        silentAcquisitions += 1;
        return { authenticated: true, session_token: "lawos_session_v1.unexpected-retry" };
      },
      requestJson: async () => new Promise((resolve, reject) => {
        pending.push({ resolve, reject });
      }),
      actionHandler: async ({ action, item, requestJson, isCurrentItem }) => {
        const body = await requestJson("/api/outlook/inquiries", { method: "POST", body: {} });
        return buildInquiryActionResult({ action, body, item, isCurrentItem });
      },
    });
    await runtime.refreshItem();

    const actionA = runtime.runAction("new");
    await waitForPendingRequest(pending, 1);
    await runtime.signIn();
    assert.equal(session.token(), "lawos_session_v1.owner-b");
    assert.equal(runtime.getState().authState, "authenticated");

    const actionB = runtime.runAction("new");
    await waitForPendingRequest(pending, 2);
    pending[1].resolve(registeredResponse({ lead_id: "lead-b" }));
    const resultB = await actionB;
    assert.equal(resultB.item.lead_id, "lead-b");
    assert.equal(runtime.getState().result.item.lead_id, "lead-b");

    if (late === "success") {
      pending[0].resolve(registeredResponse({ lead_id: "lead-a-late" }));
    } else {
      pending[0].reject(Object.assign(new Error(late), late === "unauthorized"
        ? { status: 401, safe_error_code: "AUTH_SESSION_INVALID" }
        : { safe_error_code: "request_failed" }));
    }
    assert.equal(await actionA, null);

    const final = runtime.getState();
    assert.equal(final.authState, "authenticated");
    assert.equal(final.authError, null);
    assert.equal(final.error, null);
    assert.equal(final.busy, "");
    assert.equal(final.result.item.lead_id, "lead-b");
    assert.equal(final.staleResult, null);
    assert.equal(session.token(), "lawos_session_v1.owner-b");
    assert.equal(interactiveAcquisitions, 1);
    assert.equal(silentAcquisitions, 0);
    assert.equal(pending.length, 2, "late A must not retry without or under B auth");

    await runtime.refreshItem();
    assert.equal(runtime.getState().result.item.lead_id, "lead-b");
    runtime.dispose();
  });
}

test("a current inquiry 401 recovers and retries only under its captured successor owner", async () => {
  const Office = {
    context: {
      mailbox: {
        item: {
          itemId: "office-current-recovery",
          internetMessageId: "<current-recovery@example.invalid>",
          conversationId: "conversation-current-recovery",
        },
        convertToRestId(value) { return `rest-${value}`; },
      },
    },
    MailboxEnums: { RestVersion: { v2_0: "v2.0" } },
  };
  const session = sessionWindow(Office);
  let requests = 0;
  let recoveries = 0;
  const runtime = createOutlookInquiryRuntime({
    windowObject: session.windowObject,
    Office,
    initialAuthState: "authenticated",
    authenticateOnStart: false,
    acquireLawosSession: async ({ interactive, force }) => {
      assert.equal(interactive, false);
      assert.equal(force, true);
      recoveries += 1;
      return { authenticated: true, session_token: "lawos_session_v1.owner-recovered" };
    },
    requestJson: async () => {
      requests += 1;
      if (requests === 1) {
        throw Object.assign(new Error("AUTH_SESSION_INVALID"), {
          status: 401,
          safe_error_code: "AUTH_SESSION_INVALID",
        });
      }
      return registeredResponse({ lead_id: "lead-recovered" });
    },
    actionHandler: async ({ action, item, requestJson, isCurrentItem }) => {
      const body = await requestJson("/api/outlook/inquiries", { method: "POST", body: {} });
      return buildInquiryActionResult({ action, body, item, isCurrentItem });
    },
  });
  await runtime.refreshItem();

  const result = await runtime.runAction("new");

  assert.equal(result.item.lead_id, "lead-recovered");
  assert.equal(runtime.getState().result.item.lead_id, "lead-recovered");
  assert.equal(runtime.getState().authState, "authenticated");
  assert.equal(runtime.getState().busy, "");
  assert.equal(runtime.getState().error, null);
  assert.equal(session.token(), "lawos_session_v1.owner-recovered");
  assert.equal(requests, 2);
  assert.equal(recoveries, 1);
  runtime.dispose();
});

test("a sibling catalog 401 recovery settles the exact stale inquiry busy without leaking state", async () => {
  const Office = {
    context: {
      mailbox: {
        item: {
          itemId: "office-catalog-recovery",
          internetMessageId: "<catalog-recovery@example.invalid>",
          conversationId: "conversation-catalog-recovery",
        },
        convertToRestId(value) { return `rest-${value}`; },
      },
    },
    MailboxEnums: { RestVersion: { v2_0: "v2.0" } },
  };
  const session = sessionWindow(Office);
  const pendingActions = [];
  let catalogCalls = 0;
  let recoveries = 0;
  const runtime = createOutlookInquiryRuntime({
    windowObject: session.windowObject,
    Office,
    initialAuthState: "authenticated",
    authenticateOnStart: false,
    acquireLawosSession: async ({ interactive, force }) => {
      assert.equal(interactive, false);
      assert.equal(force, true);
      recoveries += 1;
      return { authenticated: true, session_token: "lawos_session_v1.catalog-b" };
    },
    requestJson: async (path) => {
      if (path === "/api/outlook/inquiries") {
        return new Promise((resolve, reject) => pendingActions.push({ resolve, reject }));
      }
      assert.equal(path, "/catalog");
      catalogCalls += 1;
      if (catalogCalls === 1) {
        throw Object.assign(new Error("AUTH_SESSION_INVALID"), {
          status: 401,
          safe_error_code: "AUTH_SESSION_INVALID",
        });
      }
      return { items: [] };
    },
    actionHandler: async ({ action, item, requestJson, isCurrentItem }) => {
      const body = await requestJson("/api/outlook/inquiries", { method: "POST", body: {} });
      return buildInquiryActionResult({ action, body, item, isCurrentItem });
    },
  });
  await runtime.refreshItem();

  const actionA = runtime.runAction("new");
  await waitForPendingRequest(pendingActions);
  assert.equal(runtime.getState().busy, "new");

  assert.deepEqual(await runtime.requestJson("/catalog"), { items: [] });
  assert.equal(runtime.getState().busy, "new", "catalog recovery must not clear the pending action");
  assert.equal(session.token(), "lawos_session_v1.catalog-b");

  pendingActions[0].resolve(registeredResponse({ lead_id: "lead-a-late" }));
  assert.equal(await actionA, null);

  const final = runtime.getState();
  assert.equal(final.busy, "");
  assert.equal(final.authState, "authenticated");
  assert.equal(final.authError, null);
  assert.equal(final.error, null);
  assert.equal(final.result, null);
  assert.equal(final.staleResult, null);
  assert.equal(catalogCalls, 2);
  assert.equal(recoveries, 1);
  assert.equal(pendingActions.length, 1, "stale A must not retry under recovered B");

  await runtime.refreshItem();
  assert.equal(runtime.getState().result, null, "late A must not leave an item receipt");
  runtime.dispose();
});

test("a stale inquiry completion cannot clear a newer operation's busy token", async () => {
  const Office = {
    context: {
      mailbox: {
        item: {
          itemId: "office-busy-owner",
          internetMessageId: "<busy-owner@example.invalid>",
          conversationId: "conversation-busy-owner",
        },
        convertToRestId(value) { return `rest-${value}`; },
      },
    },
    MailboxEnums: { RestVersion: { v2_0: "v2.0" } },
  };
  const session = sessionWindow(Office);
  const pendingActions = [];
  let catalogCalls = 0;
  const runtime = createOutlookInquiryRuntime({
    windowObject: session.windowObject,
    Office,
    initialAuthState: "authenticated",
    authenticateOnStart: false,
    acquireLawosSession: async () => ({
      authenticated: true,
      session_token: "lawos_session_v1.busy-owner-b",
    }),
    requestJson: async (path) => {
      if (path === "/api/outlook/inquiries") {
        return new Promise((resolve, reject) => pendingActions.push({ resolve, reject }));
      }
      catalogCalls += 1;
      if (catalogCalls === 1) {
        throw Object.assign(new Error("AUTH_SESSION_INVALID"), {
          status: 401,
          safe_error_code: "AUTH_SESSION_INVALID",
        });
      }
      return { items: [] };
    },
    actionHandler: async ({ action, item, requestJson, isCurrentItem }) => {
      const body = await requestJson("/api/outlook/inquiries", { method: "POST", body: {} });
      return buildInquiryActionResult({ action, body, item, isCurrentItem });
    },
  });
  await runtime.refreshItem();

  const actionA = runtime.runAction("new");
  await waitForPendingRequest(pendingActions, 1);
  await runtime.requestJson("/catalog");

  const actionB = runtime.runAction("link_existing", { existingLeadId: "lead-existing" });
  await waitForPendingRequest(pendingActions, 2);
  assert.equal(runtime.getState().busy, "link_existing");

  pendingActions[0].resolve(registeredResponse({ lead_id: "lead-a-late" }));
  assert.equal(await actionA, null);
  assert.equal(runtime.getState().busy, "link_existing");
  assert.equal(runtime.getState().result, null);
  assert.equal(runtime.getState().error, null);

  pendingActions[1].resolve(registeredResponse({
    action: "link_existing",
    lead_id: "lead-b",
  }));
  const resultB = await actionB;
  assert.equal(resultB.item.lead_id, "lead-b");
  assert.equal(runtime.getState().result.item.lead_id, "lead-b");
  assert.equal(runtime.getState().busy, "");
  assert.equal(session.token(), "lawos_session_v1.busy-owner-b");
  runtime.dispose();
});

for (const recovery of [
  { label: "an unauthenticated", name: "unauthenticated", session: { authenticated: false } },
  { label: "an authenticated but tokenless", name: "authenticated-tokenless", session: { authenticated: true } },
]) {
  test(`${recovery.label} 401 recovery fails closed without an authless mutation retry`, async () => {
    const Office = {
      context: {
        mailbox: {
          item: {
            itemId: `office-${recovery.name}`,
            internetMessageId: `<${recovery.name}@example.invalid>`,
            conversationId: `conversation-${recovery.name}`,
          },
          convertToRestId(value) { return `rest-${value}`; },
        },
      },
      MailboxEnums: { RestVersion: { v2_0: "v2.0" } },
    };
    const session = sessionWindow(Office);
    let requests = 0;
    let recoveries = 0;
    const runtime = createOutlookInquiryRuntime({
      windowObject: session.windowObject,
      Office,
      initialAuthState: "authenticated",
      authenticateOnStart: false,
      acquireLawosSession: async ({ interactive, force }) => {
        assert.equal(interactive, false);
        assert.equal(force, true);
        recoveries += 1;
        return recovery.session;
      },
      requestJson: async () => {
        requests += 1;
        if (requests === 1) {
          throw Object.assign(new Error("AUTH_SESSION_INVALID"), {
            status: 401,
            safe_error_code: "AUTH_SESSION_INVALID",
          });
        }
        return registeredResponse({ lead_id: "unexpected-authless-retry" });
      },
      actionHandler: async ({ action, item, requestJson, isCurrentItem }) => {
        const body = await requestJson("/api/outlook/inquiries", { method: "POST", body: {} });
        return buildInquiryActionResult({ action, body, item, isCurrentItem });
      },
    });
    await runtime.refreshItem();

    assert.equal(await runtime.runAction("new"), null);

    const final = runtime.getState();
    assert.equal(requests, 1);
    assert.equal(recoveries, 1);
    assert.equal(session.token(), "");
    assert.equal(final.authState, "login_required");
    assert.equal(final.authError.safe_error_code, "AUTH_SESSION_REQUIRED");
    assert.equal(final.error.safe_error_code, "AUTH_SESSION_REQUIRED");
    assert.equal(final.busy, "");
    assert.equal(final.result, null);
    assert.equal(final.staleResult, null);

    await runtime.refreshItem();
    assert.equal(runtime.getState().result, null, "failed recovery must not leave an item receipt");
    assert.equal(await runtime.runAction("new"), null);
    assert.equal(requests, 1, "login-required state must not issue another mutation");
    runtime.dispose();
  });
}

test("runtime does not turn a malformed action result into durable success", async () => {
  const Office = {
    context: {
      mailbox: {
        item: {
          itemId: "office-invalid",
          internetMessageId: "<invalid@example.invalid>",
          conversationId: "conversation-invalid",
        },
        convertToRestId(value) { return `rest-${value}`; },
      },
    },
    MailboxEnums: { RestVersion: { v2_0: "v2.0" } },
  };
  const runtime = createOutlookInquiryRuntime({
    windowObject: sessionWindow(Office).windowObject,
    Office,
    initialAuthState: "authenticated",
    authenticateOnStart: false,
    actionHandler: async () => ({}),
  });
  await runtime.refreshItem();
  assert.equal(await runtime.runAction("new"), null);
  assert.equal(runtime.getState().result, null);
  assert.equal(runtime.getState().error.safe_error_code, "API_RESPONSE_INVALID");
});

test("inquiry catalog fence discards a deferred old-user GET after auth loss and reauth", async () => {
  const fence = createInquiryLoadFence();
  let inquiries = [{ lead_id: "old-lead", display_name: "Old user" }];
  let selectedLeadId = "old-lead";
  let resolveOld;
  const oldResponse = new Promise((resolve) => { resolveOld = resolve; });
  const load = async (authenticated, requestJson) => {
    if (!authenticated) {
      inquiries = [];
      selectedLeadId = "";
      return;
    }
    const isCurrentLoad = fence.begin(authenticated);
    const body = await requestJson();
    if (!isCurrentLoad()) return;
    inquiries = Array.isArray(body.items) ? body.items : [];
    selectedLeadId = inquiries[0]?.lead_id ?? "";
  };

  fence.transition(true);
  const oldLoad = load(true, async () => oldResponse);
  fence.transition(false);
  await load(false, async () => ({ items: [] }));
  fence.transition(true);
  resolveOld({ items: [{ lead_id: "old-lead", display_name: "Old user" }] });
  await oldLoad;

  assert.deepEqual(inquiries, []);
  assert.equal(selectedLeadId, "");
});

test("a committed inquiry receipt stays with A across A-to-B and replays once when A returns", async () => {
  const item = (id) => ({
    itemId: `office-${id}`,
    internetMessageId: `<${id}@example.invalid>`,
    conversationId: `conversation-${id}`,
    subject: `메일 ${id}`,
  });
  let current = item("a");
  const pending = [];
  const durableKeys = new Set();
  let durableWrites = 0;
  const Office = {
    context: {
      mailbox: {
        get item() { return current; },
        convertToRestId(value) { return `rest-${value}`; },
      },
    },
    MailboxEnums: { RestVersion: { v2_0: "v2.0" } },
  };
  const runtime = createOutlookInquiryRuntime({
    windowObject: sessionWindow(Office).windowObject,
    Office,
    initialAuthState: "authenticated",
    authenticateOnStart: false,
    acquireLawosSession: async () => ({ authenticated: true }),
    waitForReady: async () => ({ status: "ready" }),
    subscribeToItems: () => () => {},
    requestJson: async (_path, options = {}) => {
      const key = options.body?.idempotency_key;
      if (!durableKeys.has(key)) {
        durableKeys.add(key);
        durableWrites += 1;
      }
      return new Promise((resolve) => pending.push({ key, resolve }));
    },
    actionHandler: async ({ action, item: sourceItem, requestJson, isCurrentItem }) => {
      const request = await buildInquiryRegistrationRequest({
        action,
        rest_message_id: sourceItem.graph_message_id,
      });
      const body = await requestJson("/api/outlook/inquiries", {
        method: "POST",
        body: request,
      });
      return buildInquiryActionResult({
        action,
        body,
        item: sourceItem,
        isCurrentItem,
      });
    },
  });
  await runtime.refreshItem();
  assert.equal(runtime.getState().item.subject, "메일 a");

  const firstAction = runtime.runAction("new");
  await waitForPendingRequest(pending);
  current = item("b");
  await runtime.refreshItem();
  pending.shift().resolve(registeredResponse());
  const stale = await firstAction;
  assert.equal(stale.stale_item, true);
  assert.equal(stale.apply_to_current_view, false);
  assert.equal(runtime.getState().result, null);
  assert.equal(runtime.getState().staleResult.stale_item, true);
  assert.equal("item" in runtime.getState().staleResult, false);
  assert.equal(runtime.getState().staleResult.view_item_context_key, "rest-office-b\u001f<b@example.invalid>\u001fconversation-b");

  current = item("c");
  await runtime.refreshItem();
  assert.equal(runtime.getState().staleResult, null);

  current = item("a");
  await runtime.refreshItem();
  assert.equal(runtime.getState().result.item.lead_id, "lead-a");
  assert.equal(runtime.getState().staleResult, null);

  const replayAction = runtime.runAction("new");
  await waitForPendingRequest(pending);
  pending.shift().resolve(registeredResponse({ idempotent_replay: true }));
  const replay = await replayAction;
  assert.equal(replay.stale_item, undefined);
  assert.equal(durableWrites, 1);
  assert.equal(replay.outcome, "registered");
  assert.equal(replay.action, "new");
  assert.equal(replay.item.lead_id, "lead-a");
  assert.equal(replay.item.idempotent_replay, true);

  current = item("b");
  await runtime.refreshItem();
  assert.equal(runtime.getState().result, null);
  current = item("a");
  await runtime.refreshItem();
  assert.equal(runtime.getState().result.outcome, "registered");
  assert.equal(runtime.getState().result.action, "new");
  assert.equal(runtime.getState().result.item.lead_id, "lead-a");
  assert.equal(runtime.getState().result.item.idempotent_replay, true);
});

test("runtime normalizes a final A-to-B flip even when the action built a current result", async () => {
  const item = (id) => ({
    itemId: `office-${id}`,
    internetMessageId: `<${id}@example.invalid>`,
    conversationId: `conversation-${id}`,
    subject: `메일 ${id}`,
  });
  let current = item("a");
  const Office = {
    context: {
      mailbox: {
        get item() { return current; },
        convertToRestId(value) { return `rest-${value}`; },
      },
    },
    MailboxEnums: { RestVersion: { v2_0: "v2.0" } },
  };
  const runtime = createOutlookInquiryRuntime({
    windowObject: sessionWindow(Office).windowObject,
    Office,
    initialAuthState: "authenticated",
    authenticateOnStart: false,
    requestJson: async () => registeredResponse(),
    actionHandler: async ({ action, item: sourceItem, requestJson, isCurrentItem }) => {
      const body = await requestJson("/api/outlook/inquiries", { method: "POST", body: {} });
      const result = buildInquiryActionResult({ action, body, item: sourceItem, isCurrentItem });
      current = item("b");
      return result;
    },
  });
  await runtime.refreshItem();
  const result = await runtime.runAction("new");
  assert.equal(result.source_item_context_key, "rest-office-a\u001f<a@example.invalid>\u001fconversation-a");
  assert.equal(result.apply_to_current_view, false);
  assert.equal(result.stale_item, true);
  assert.equal(result.item.lead_id, "lead-a");
  assert.equal(runtime.getState().result, null);
  assert.equal(runtime.getState().staleResult.stale_item, true);
  assert.equal(runtime.getState().staleResult.view_item_context_key, "rest-office-b\u001f<b@example.invalid>\u001fconversation-b");
  await runtime.refreshItem();
  assert.equal(runtime.getState().staleResult.view_item_context_key, "rest-office-b\u001f<b@example.invalid>\u001fconversation-b");
  current = item("c");
  await runtime.refreshItem();
  assert.equal(runtime.getState().staleResult, null);
  current = item("a");
  await runtime.refreshItem();
  assert.equal(runtime.getState().result.source_item_context_key, result.source_item_context_key);
  assert.equal(runtime.getState().result.apply_to_current_view, false);
  assert.equal(runtime.getState().result.outcome, "registered");
  assert.equal(runtime.getState().result.action, "new");
  assert.equal(runtime.getState().result.item.lead_id, "lead-a");
  assert.equal(runtime.getState().result.item.idempotent_replay, false);
});

test("reauthentication clears the completed receipt before the same item can render again", async () => {
  let current = {
    itemId: "office-a",
    internetMessageId: "<a@example.invalid>",
    conversationId: "conversation-a",
    subject: "메일 a",
  };
  const Office = {
    context: {
      mailbox: {
        get item() { return current; },
        convertToRestId(value) { return `rest-${value}`; },
      },
    },
    MailboxEnums: { RestVersion: { v2_0: "v2.0" } },
  };
  const runtime = createOutlookInquiryRuntime({
    windowObject: sessionWindow(Office).windowObject,
    Office,
    initialAuthState: "authenticated",
    authenticateOnStart: false,
    acquireLawosSession: async () => ({ authenticated: true }),
    requestJson: async () => registeredResponse({ lead_id: "lead-old" }),
    actionHandler: async ({ action, item, requestJson }) => {
      const body = await requestJson("/api/outlook/inquiries", { method: "POST", body: {} });
      const result = buildInquiryActionResult({ action, body, item, isCurrentItem: () => false });
      current = {
        itemId: "office-b",
        internetMessageId: "<b@example.invalid>",
        conversationId: "conversation-b",
        subject: "메일 b",
      };
      return result;
    },
  });
  await runtime.refreshItem();
  await runtime.runAction("new");
  assert.equal(runtime.getState().staleResult.stale_item, true);
  await runtime.signIn();
  assert.equal(runtime.getState().authState, "authenticated");
  current = {
    itemId: "office-a",
    internetMessageId: "<a@example.invalid>",
    conversationId: "conversation-a",
    subject: "메일 a",
  };
  await runtime.refreshItem();
  assert.equal(runtime.getState().result, null);
  assert.equal(runtime.getState().staleResult, null);
});

function entryQueryEscalation() {
  return inquiryEntryContract().queryEscalation;
}

test("the inquiry leaf owns one UserPlus action and fails closed on a mismatch", () => {
  assert.match(INQUIRY_SHELL_SOURCE, /import \{ UserPlus \} from "lucide-react"/u);
  assert.match(INQUIRY_SHELL_SOURCE, /export const OUTLOOK_INQUIRY_RAIL = Object\.freeze\(\[/u);
  assert.equal((INQUIRY_SHELL_SOURCE.match(/featureId: "/gu) ?? []).length, 1);
  assert.match(INQUIRY_SHELL_SOURCE, /featureId: "inquiry\.entry"/u);
  assert.match(INQUIRY_SHELL_SOURCE, /label: "문의 기능"/u);
  assert.match(INQUIRY_SHELL_SOURCE, /Icon: UserPlus/u);
  assert.match(INQUIRY_SHELL_SOURCE, /export function OutlookInquiryCompactShell\(/u);
  assert.match(INQUIRY_SHELL_SOURCE, /profile = INQUIRY_PROFILE/u);
  assert.match(INQUIRY_SHELL_SOURCE, /railItems: _railItems/u);
  assert.match(INQUIRY_SHELL_SOURCE, /if \(profile !== INQUIRY_PROFILE\) return null/u);
  assert.match(INQUIRY_SHELL_SOURCE, /profile=\{INQUIRY_PROFILE\}/u);
  assert.match(INQUIRY_SHELL_SOURCE, /railItems=\{OUTLOOK_INQUIRY_RAIL\}/u);
  assert.doesNotMatch(INQUIRY_SHELL_SOURCE, /mail\.save-with-attachments|matter\.search|task\.create|time-entry\.draft|all-functions|Archive|ListTodo|Search|TimerReset|Menu/u);
});

test("OUTM-10 independent inquiry build and manifest retain the read-only 952 boundary", () => {
  const entry = inquiryEntryContract();
  assert.match(INQUIRY_VITE_CONFIG, /outlook-addin|inquiry-entry/iu);
  assert.match(INQUIRY_MANIFEST, /952431be-51b8-42a2-9bf6-769a15934e85/u);
  assert.match(INQUIRY_MANIFEST, /<Permissions>\s*ReadItem\s*<\/Permissions>/u);
  assert.doesNotMatch(INQUIRY_MANIFEST, /OnMessageSend|LaunchEvent/iu);
  assert.deepEqual(entry.actions, EXPECTED_ACTIONS);
});
