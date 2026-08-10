import assert from "node:assert/strict";
import http from "node:http";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createDmsRepository } from "../../../packages/dms/src/repository.js";
import { createFileStorageAdapter } from "../../../packages/dms/src/storage/file-storage-adapter.js";
import { createApprovedDocumentTemplateVersion } from "../../../packages/matter/src/agreement-docx.js";
import { persistMatterVaultLink } from "../../../packages/matter/src/matter-vault-link-repository.js";
import { createMatterRepository } from "../../../packages/matter/src/repository.js";
import { createDocusignFailClosedRuntime } from "../src/docusign-runtime.js";
import { createMatterRuntimeContext, handleMatterApiRequest } from "../src/matter-runtime-context.js";
import { createApiServer } from "../src/server.js";

const TENANT = "tenant_outlook_document";
const MATTER = "matter_outlook_document";
const FOREIGN_MATTER = "matter_outlook_document_foreign";
const ACTOR = "user_outlook_document";
const AT = "2026-08-10T02:00:00.000Z";
const TOKEN = "Bearer outlook-document-session";
const FOREIGN_DENY_TOKEN = "Bearer outlook-document-foreign-deny-session";
const DENIED_TOKEN = "Bearer outlook-document-denied-session";

function matterRecord(matterId) {
  return {
    model_type: "Matter",
    resource_id: matterId,
    tenant_id: TENANT,
    matter_id: matterId,
    client_id: "client_outlook_document",
    title: `Matter ${matterId}`,
    status: "open",
    permission_envelope_id: `permission:${matterId}`,
    audit_trace_id: `audit:${matterId}`,
    created_by: ACTOR,
    created_at: AT,
  };
}

function template(index) {
  const suffix = String(index).padStart(3, "0");
  return createApprovedDocumentTemplateVersion({
    tenant_id: TENANT,
    template_id: "matter_engagement_letter",
    template_version: `api-1.0.${suffix}`,
    label: `위임계약서 ${suffix}`,
    status: "approved",
    merge_schema: [
      { key: "client_name", required: true, max_length: 120 },
      { key: "matter_title", required: true, max_length: 160 },
    ],
    signer_roles: [{ role_id: "client", required: true }],
    content: [
      { type: "paragraph", style: "title", runs: [{ literal: "위임계약서" }] },
      { type: "paragraph", style: "body", runs: [{ merge_field: "client_name" }, { literal: " / " }, { merge_field: "matter_title" }] },
      { type: "signature_anchor", signer_role: "client", anchor_id: "client_sign_here", label: "서명" },
    ],
    approval_receipt: {
      receipt_id: `template-approval:outlook-document:${suffix}`,
      approved_by_ref: "template-owner:outlook-document",
      approved_at: AT,
    },
    synthetic_only: true,
  });
}

function createMatterRuntime({ templateCount = 1, failApprovalReplayReadOnce = false, tamperResult = null } = {}) {
  const root = mkdtempSync(join(tmpdir(), "outlook-document-api-"));
  const baseRepository = createMatterRepository({ seedRecords: [matterRecord(MATTER), matterRecord(FOREIGN_MATTER)] });
  persistMatterVaultLink({
    repository: baseRepository,
    link: {
      tenant_id: TENANT,
      matter_id: MATTER,
      vault_workspace_id: "workspace_outlook_document",
      default_folder_id: "folder_outlook_document",
      permission_envelope_id: `permission:${MATTER}`,
      source_transaction_id: "transaction_outlook_document",
      audit_event_id: "audit_outlook_document",
      created_by_actor_id: ACTOR,
      created_at: AT,
    },
  });
  const dmsRuntime = {
    repository: createDmsRepository(),
    storage: createFileStorageAdapter({ adapter_id: "outlook-document-api", rootPath: join(root, "objects") }),
  };
  const counters = { get: 0, list: 0 };
  let failApprovalRead = failApprovalReplayReadOnce;
  let repository;
  repository = {
    ...baseRepository,
    get(reference) {
      counters.get += 1;
      if (failApprovalRead && reference?.model_type === "MatterBuilderApprovalReplay") {
        failApprovalRead = false;
        throw new Error("synthetic approval repository interruption");
      }
      return baseRepository.get(reference);
    },
    list(reference) {
      counters.list += 1;
      return baseRepository.list(reference);
    },
    transaction(fn) {
      return baseRepository.transaction(() => {
        const result = fn(repository);
        return tamperResult?.(result) ?? result;
      });
    },
  };
  const runtime = createMatterRuntimeContext({
    repository,
    dmsRuntime,
    documentTemplateVersions: Array.from({ length: templateCount }, (_, index) => template(templateCount - index - 1)),
    clock: () => AT,
  });
  counters.get = 0;
  counters.list = 0;
  return { runtime, counters };
}

function context({ denyForeign = false, denyAll = false } = {}) {
  const principal = Object.freeze({ tenant_id: TENANT, user_id: ACTOR, role_ids: Object.freeze(["tenant_owner"]) });
  return Object.freeze({
    principal,
    rules: Object.freeze([
      ...(denyAll ? [{ id: "deny-all-matters", effect: "deny", action: "*" }] : []),
      ...(denyForeign ? [{ id: "deny-foreign-matter", effect: "deny", action: "*", ethical_wall_matter_id: FOREIGN_MATTER }] : []),
      { id: "allow-outlook-document", effect: "allow", action: "*" },
    ]),
    object_acl: Object.freeze([]),
  });
}

function sessionAuth() {
  return Object.freeze({
    capabilities: Object.freeze({}),
    async resolvePermissionContextFromHeaders(headers) {
      const authorization = headers.authorization;
      if (![TOKEN, FOREIGN_DENY_TOKEN, DENIED_TOKEN].includes(authorization)) return Object.freeze({ ok: false, status: 401 });
      const resolved = context({ denyForeign: authorization === FOREIGN_DENY_TOKEN, denyAll: authorization === DENIED_TOKEN });
      return Object.freeze({ ok: true, principal: resolved.principal, context: resolved, token_payload: Object.freeze({ surface: "outlook_addin" }) });
    },
  });
}

function esignItem(index) {
  const suffix = String(index).padStart(3, "0");
  return Object.freeze({
    request_id: `esign_request_${suffix}`,
    matter_id: MATTER,
    document: Object.freeze({ document_id: `document_${suffix}`, version_id: `version_${suffix}`, sha256: "a".repeat(64) }),
    recipients: Object.freeze([{ recipient_ref: `party_${suffix}`, role: "client", routing_order: 1 }]),
    state: "sent",
    canonical_document_ref: `matter://${MATTER}/documents/document_${suffix}/versions/version_${suffix}`,
    can_send: false,
    can_reconcile: true,
    completion_artifacts: null,
    production_ready_claim: false,
    envelope_id: "provider-envelope-secret",
    raw_provider_payload: "provider-payload-secret",
    access_token: "provider-token-secret",
  });
}

function completionArtifact(suffix) {
  return Object.freeze({
    document_id: `completion_document_${suffix}`,
    version_id: `completion_version_${suffix}`,
    sha256: "b".repeat(64),
    immutable: true,
  });
}

function docusignRuntime({ itemCount = 1, items = null, authorize = true, readinessState = null } = {}) {
  const counters = { authorize: 0, list: 0, queue: 0, send: 0, reconcile: 0 };
  const runtime = Object.freeze({
    authorizeMatter: async () => { counters.authorize += 1; return authorize; },
    ...(readinessState === null ? {} : {
      readiness: () => Object.freeze({
        status: readinessState === "ready" ? "ready" : "blocked",
        authority_state: readinessState,
      }),
    }),
    envelope_service: Object.freeze({
      async listRequests() {
        counters.list += 1;
        return items ?? Array.from({ length: itemCount }, (_, index) => esignItem(itemCount - index - 1));
      },
      async queueApprovedRequest() { counters.queue += 1; throw new Error("provider queue must not be called"); },
      async sendApprovedRequest() { counters.send += 1; throw new Error("provider send must not be called"); },
      async reconcileRequest() { counters.reconcile += 1; throw new Error("provider reconcile must not be called"); },
    }),
  });
  return { runtime, counters };
}

function docusignRuntimeWithReadiness(readinessDescriptor) {
  const counters = { authorize: 0, list: 0, queue: 0, send: 0, reconcile: 0 };
  const runtime = {
    async authorizeMatter() { counters.authorize += 1; return true; },
    envelope_service: Object.freeze({
      async listRequests() { counters.list += 1; return [esignItem(1)]; },
      async queueApprovedRequest() { counters.queue += 1; throw new Error("provider queue must not be called"); },
      async sendApprovedRequest() { counters.send += 1; throw new Error("provider send must not be called"); },
      async reconcileRequest() { counters.reconcile += 1; throw new Error("provider reconcile must not be called"); },
    }),
  };
  Object.defineProperty(runtime, "readiness", { enumerable: true, configurable: false, ...readinessDescriptor });
  return { runtime: Object.freeze(runtime), counters };
}

function docusignRuntimeWithInheritedReadiness(readinessState) {
  const guarded = docusignRuntime();
  const readinessCounter = { calls: 0 };
  class Runtime {
    readiness() {
      readinessCounter.calls += 1;
      return Object.freeze({ status: readinessState, authority_state: readinessState });
    }
  }
  return {
    runtime: Object.freeze(Object.assign(new Runtime(), {
      authorizeMatter: guarded.runtime.authorizeMatter,
      envelope_service: guarded.runtime.envelope_service,
    })),
    counters: guarded.counters,
    readinessCounter,
  };
}

async function startFixture({
  templateCount = 1,
  esignCount = 1,
  esignAuthorize = true,
  esignUnavailable = false,
  esignReadinessState = null,
  providedDocusignRuntime,
  useServerDefaultDocusignRuntime = false,
  failApprovalReplayReadOnce = false,
  esignItems = null,
  tamperResult = null,
} = {}) {
  const matter = createMatterRuntime({ templateCount, failApprovalReplayReadOnce, tamperResult });
  const matterRuntime = matter.runtime;
  const docusign = docusignRuntime({ itemCount: esignCount, items: esignItems, authorize: esignAuthorize, readinessState: esignReadinessState });
  const server = createApiServer({
    hrxRuntime: null,
    masterDataRuntime: null,
    matterRuntime,
    dmsRuntime: null,
    emailDmsRuntime: null,
    crmIntakeRuntime: null,
    financeRuntime: null,
    analyticsRuntime: null,
    aiRuntime: null,
    portalRuntime: null,
    uiReadinessRuntime: null,
    homeDashboardRuntime: null,
    enterpriseReadinessRuntime: null,
    ...(useServerDefaultDocusignRuntime ? {} : {
      docusignRuntime: providedDocusignRuntime ?? (esignUnavailable ? null : docusign.runtime),
    }),
    sessionAuth: sessionAuth(),
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  return Object.freeze({
    baseUrl: `http://127.0.0.1:${server.address().port}`,
    server,
    matterRuntime,
    matterRuntimeCounters: matter.counters,
    docusignCounters: docusign.counters,
    async close() {
      await new Promise((resolve) => {
        server.close(resolve);
        server.closeAllConnections?.();
      });
      matterRuntime.repository.close?.();
      matterRuntime.dmsRuntime.repository.close?.();
    },
  });
}

async function json(fixture, path, { method = "GET", body, token = TOKEN, requestId = "outlook-document-test" } = {}) {
  const response = await fetch(`${fixture.baseUrl}${path}`, {
    method,
    headers: {
      ...(token ? { authorization: token } : {}),
      ...(body === undefined ? {} : { "content-type": "application/json" }),
      "x-request-id": requestId,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}

async function getWithBody(fixture, path, body) {
  const url = new URL(path, fixture.baseUrl);
  const bytes = Buffer.from(JSON.stringify(body));
  return new Promise((resolve, reject) => {
    const request = http.request({
      host: url.hostname,
      port: url.port,
      path: `${url.pathname}${url.search}`,
      method: "GET",
      headers: {
        authorization: TOKEN,
        "content-type": "application/json",
        "content-length": bytes.byteLength,
        "x-request-id": "outlook-document-get-body",
      },
    }, (response) => {
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => resolve({ status: response.statusCode, body: JSON.parse(Buffer.concat(chunks).toString("utf8")) }));
    });
    request.once("error", reject);
    request.end(bytes);
  });
}

function approvalIntent(overrides = {}) {
  return {
    matter_id: MATTER,
    template_id: "matter_engagement_letter",
    template_version: "api-1.0.000",
    title: "비공개 위임계약서",
    merge_data: { client_name: "비공개 의뢰인", matter_title: "비공개 Matter" },
    signer_role_refs: [{ role_id: "client", party_ref: "party:private-client" }],
    idempotency_key: "outlook-document-approval-intent",
    explicit_human_action: true,
    ...overrides,
  };
}

async function requestAndApproveDocument(fixture) {
  const requested = await json(fixture, "/api/outlook/documents/approval-requests", { method: "POST", body: approvalIntent() });
  assert.equal(requested.status, 200, JSON.stringify(requested.body));
  const draftId = requested.body.draft.draft_id;
  const approvalId = requested.body.approval_request.approval_request_id;
  const decided = await handleMatterApiRequest({
    pathname: `/api/matters/${MATTER}/builder-approval-requests/${approvalId}/decision`,
    method: "POST",
    body: {
      tenant_id: TENANT,
      permission_ref: `permission:${MATTER}`,
      audit_hint_ref: `audit:${MATTER}`,
      decision: "approved",
      idempotency_key: "outlook-document-owner-decision",
    },
    context: context(),
    requestId: "outlook-document-owner-decision",
    runtime: fixture.matterRuntime,
  });
  assert.equal(decided.status, 200, JSON.stringify(decided.body));
  return { draftId, approvalId };
}

test("OUTM-32/34 signed GET returns bounded, sorted, redacted builder and local DocuSign projections only", async () => {
  const fixture = await startFixture({ templateCount: 55, esignCount: 55 });
  try {
    const unauthenticated = await json(fixture, `/api/outlook/documents?matter_id=${MATTER}`, { token: null });
    assert.equal(unauthenticated.status, 401);

    const result = await json(fixture, `/api/outlook/documents?matter_id=${MATTER}`);
    assert.equal(result.status, 200, JSON.stringify(result.body));
    assert.deepEqual(Object.keys(result.body), [
      "request_id", "outcome", "matter_id", "templates", "approval_requests", "esign_requests",
      "readiness", "safe_error_codes", "count_leak_prevented", "production_ready_claim",
    ]);
    assert.deepEqual(result.body.readiness, { authoritative: true, builder_ready: true, esign_ready: true });
    assert.equal(result.body.templates.length, 50);
    assert.equal(result.body.esign_requests.length, 50);
    assert.deepEqual(
      result.body.templates.map((item) => `${item.template_id}\0${item.template_version}`),
      [...result.body.templates.map((item) => `${item.template_id}\0${item.template_version}`)].sort(),
    );
    assert.deepEqual(result.body.esign_requests.map((item) => item.request_id), [...result.body.esign_requests.map((item) => item.request_id)].sort());
    assert.equal(result.body.approval_requests.length, 0);
    assert.deepEqual(result.body.safe_error_codes, []);
    const serialized = JSON.stringify(result.body);
    assert.doesNotMatch(serialized, /provider-envelope-secret|provider-payload-secret|provider-token-secret|access_token|envelope_id|raw_provider_payload/u);
    assert.doesNotMatch(serialized, /permission:|audit:|tenant_id|merge_data/u);
    assert.equal(result.body.templates.every((item) => item.raw_template_body_included === false), true);
    assert.deepEqual(fixture.docusignCounters, { authorize: 1, list: 1, queue: 0, send: 0, reconcile: 0 });

    assert.equal((await json(fixture, `/api/outlook/documents?matter_id=${MATTER}&extra=1`)).status, 400);
    assert.equal((await json(fixture, `/api/outlook/documents?matter_id=${MATTER}&matter_id=${MATTER}`)).status, 400);
    assert.equal((await getWithBody(fixture, `/api/outlook/documents?matter_id=${MATTER}`, { unexpected: true })).status, 400);
  } finally {
    await fixture.close();
  }
});

test("OUTM-34 GET keeps builder authoritative and fails closed only the eSign slice when DocuSign is unavailable", async () => {
  const fixture = await startFixture({ esignUnavailable: true });
  try {
    const result = await json(fixture, `/api/outlook/documents?matter_id=${MATTER}`);
    assert.equal(result.status, 200, JSON.stringify(result.body));
    assert.equal(result.body.templates.length, 1);
    assert.deepEqual(result.body.esign_requests, []);
    assert.deepEqual(result.body.readiness, { authoritative: true, builder_ready: true, esign_ready: false });
    assert.deepEqual(result.body.safe_error_codes, ["OUTLOOK_DOCUMENT_ESIGN_UNAVAILABLE"]);
  } finally {
    await fixture.close();
  }
});

test("OUTM-34 DocuSign readiness skips blocked runtimes and preserves explicitly ready authorization", async (t) => {
  await t.test("strict injected adapter with no readiness capability still authorizes and reads", async () => {
    const fixture = await startFixture();
    try {
      const result = await json(fixture, `/api/outlook/documents?matter_id=${MATTER}`);
      assert.equal(result.status, 200, JSON.stringify(result.body));
      assert.equal(result.body.esign_requests.length, 1);
      assert.deepEqual(result.body.readiness, { authoritative: true, builder_ready: true, esign_ready: true });
      assert.deepEqual(fixture.docusignCounters, { authorize: 1, list: 1, queue: 0, send: 0, reconcile: 0 });
    } finally {
      await fixture.close();
    }
  });

  await t.test("createApiServer default fail-closed runtime is an unavailable eSign slice", async () => {
    const fixture = await startFixture({ useServerDefaultDocusignRuntime: true });
    try {
      const result = await json(fixture, `/api/outlook/documents?matter_id=${MATTER}`);
      assert.equal(result.status, 200, JSON.stringify(result.body));
      assert.equal(result.body.templates.length, 1);
      assert.deepEqual(result.body.esign_requests, []);
      assert.deepEqual(result.body.readiness, { authoritative: true, builder_ready: true, esign_ready: false });
      assert.deepEqual(result.body.safe_error_codes, ["OUTLOOK_DOCUMENT_ESIGN_UNAVAILABLE"]);
    } finally {
      await fixture.close();
    }
  });

  await t.test("production-style blocked runtime is not authorized or read", async () => {
    let authorizationCalls = 0;
    const fixture = await startFixture({
      providedDocusignRuntime: createDocusignFailClosedRuntime({
        authorizeMatter: async () => { authorizationCalls += 1; return true; },
      }),
    });
    try {
      const result = await json(fixture, `/api/outlook/documents?matter_id=${MATTER}`);
      assert.equal(result.status, 200, JSON.stringify(result.body));
      assert.equal(result.body.templates.length, 1);
      assert.deepEqual(result.body.esign_requests, []);
      assert.deepEqual(result.body.readiness, { authoritative: true, builder_ready: true, esign_ready: false });
      assert.deepEqual(result.body.safe_error_codes, ["OUTLOOK_DOCUMENT_ESIGN_UNAVAILABLE"]);
      assert.equal(authorizationCalls, 0);
    } finally {
      await fixture.close();
    }
  });

  for (const readinessState of ["blocked", "ready"]) {
    await t.test(`class runtime with inherited ${readinessState} readiness is gated before authorization`, async () => {
      const guarded = docusignRuntimeWithInheritedReadiness(readinessState);
      const fixture = await startFixture({ providedDocusignRuntime: guarded.runtime });
      try {
        const result = await json(fixture, `/api/outlook/documents?matter_id=${MATTER}`);
        assert.equal(result.status, 200, JSON.stringify(result.body));
        assert.equal(guarded.readinessCounter.calls, 1);
        assert.equal(result.body.esign_requests.length, readinessState === "ready" ? 1 : 0);
        assert.deepEqual(result.body.readiness, {
          authoritative: true,
          builder_ready: true,
          esign_ready: readinessState === "ready",
        });
        assert.deepEqual(guarded.counters, readinessState === "ready"
          ? { authorize: 1, list: 1, queue: 0, send: 0, reconcile: 0 }
          : { authorize: 0, list: 0, queue: 0, send: 0, reconcile: 0 });
      } finally {
        await fixture.close();
      }
    });
  }

  await t.test("explicitly ready and authorized runtime performs the local read", async () => {
    const fixture = await startFixture({ esignReadinessState: "ready" });
    try {
      const result = await json(fixture, `/api/outlook/documents?matter_id=${MATTER}`);
      assert.equal(result.status, 200, JSON.stringify(result.body));
      assert.equal(result.body.esign_requests.length, 1);
      assert.deepEqual(result.body.readiness, { authoritative: true, builder_ready: true, esign_ready: true });
      assert.deepEqual(result.body.safe_error_codes, []);
      assert.deepEqual(fixture.docusignCounters, { authorize: 1, list: 1, queue: 0, send: 0, reconcile: 0 });
    } finally {
      await fixture.close();
    }
  });
});

test("OUTM-34 treats every declared invalid DocuSign readiness capability as unavailable without reading it", async (t) => {
  const invalidCapabilities = [
    ["string value", { value: "blocked", writable: false }],
    ["boolean value", { value: false, writable: false }],
    ["object value", { value: Object.freeze({ status: "blocked" }), writable: false }],
    ["malformed function result", { value: () => Object.freeze({ status: "ready" }), writable: false }],
    ["throwing function", { value: () => { throw new Error("readiness unavailable"); }, writable: false }],
    ["throwing getter", { get() { throw new Error("readiness getter unavailable"); } }],
  ];
  for (const [label, descriptor] of invalidCapabilities) {
    await t.test(label, async () => {
      const guarded = docusignRuntimeWithReadiness(descriptor);
      const fixture = await startFixture({ providedDocusignRuntime: guarded.runtime });
      try {
        const result = await json(fixture, `/api/outlook/documents?matter_id=${MATTER}`);
        assert.equal(result.status, 200, JSON.stringify(result.body));
        assert.equal(result.body.templates.length, 1);
        assert.deepEqual(result.body.esign_requests, []);
        assert.deepEqual(result.body.readiness, { authoritative: true, builder_ready: true, esign_ready: false });
        assert.deepEqual(result.body.safe_error_codes, ["OUTLOOK_DOCUMENT_ESIGN_UNAVAILABLE"]);
        assert.deepEqual(guarded.counters, { authorize: 0, list: 0, queue: 0, send: 0, reconcile: 0 });
      } finally {
        await fixture.close();
      }
    });
  }
  for (const [label, proxyHandler] of [
    ["throwing Proxy has trap", { has() { throw new Error("readiness has trap unavailable"); } }],
    ["throwing Proxy get trap", { get(target, property, receiver) {
      if (property === "readiness") throw new Error("readiness get trap unavailable");
      return Reflect.get(target, property, receiver);
    } }],
  ]) {
    await t.test(label, async () => {
      const guarded = docusignRuntimeWithReadiness({
        value: () => Object.freeze({ status: "ready", authority_state: "ready" }),
        writable: false,
      });
      const fixture = await startFixture({ providedDocusignRuntime: new Proxy(guarded.runtime, proxyHandler) });
      try {
        const result = await json(fixture, `/api/outlook/documents?matter_id=${MATTER}`);
        assert.equal(result.status, 200, JSON.stringify(result.body));
        assert.equal(result.body.templates.length, 1);
        assert.deepEqual(result.body.esign_requests, []);
        assert.deepEqual(result.body.readiness, { authoritative: true, builder_ready: true, esign_ready: false });
        assert.deepEqual(result.body.safe_error_codes, ["OUTLOOK_DOCUMENT_ESIGN_UNAVAILABLE"]);
        assert.deepEqual(guarded.counters, { authorize: 0, list: 0, queue: 0, send: 0, reconcile: 0 });
      } finally {
        await fixture.close();
      }
    });
  }
});

test("OUTM-34 DocuSign completion projections require a completed immutable pair and consistent non-completed states", async (t) => {
  const signedPdf = Object.freeze({
    ...completionArtifact("signed"),
    permission_envelope_id: "completion-permission-secret",
    audit_trace_id: "completion-audit-secret",
  });
  const certificate = Object.freeze({
    ...completionArtifact("certificate"),
    permission_envelope_id: "completion-permission-secret",
    audit_trace_id: "completion-audit-secret",
  });
  await t.test("completed projects both immutable artifacts and redacts their authority", async () => {
    const fixture = await startFixture({
      esignReadinessState: "ready",
      esignItems: [{ ...esignItem(1), state: "completed", completion_artifacts: { signed_pdf: signedPdf, certificate } }],
    });
    try {
      const result = await json(fixture, `/api/outlook/documents?matter_id=${MATTER}`);
      assert.equal(result.status, 200, JSON.stringify(result.body));
      assert.deepEqual(result.body.readiness, { authoritative: true, builder_ready: true, esign_ready: true });
      assert.deepEqual(Object.keys(result.body.esign_requests[0].completion_artifacts), ["signed_pdf", "certificate"]);
      assert.deepEqual(Object.keys(result.body.esign_requests[0].completion_artifacts.signed_pdf), ["document_id", "version_id", "sha256", "immutable"]);
      assert.deepEqual(Object.keys(result.body.esign_requests[0].completion_artifacts.certificate), ["document_id", "version_id", "sha256", "immutable"]);
      assert.equal(result.body.esign_requests[0].completion_artifacts.signed_pdf.immutable, true);
      assert.equal(result.body.esign_requests[0].completion_artifacts.certificate.immutable, true);
      assert.doesNotMatch(JSON.stringify(result.body), /completion-permission-secret|completion-audit-secret|permission_envelope_id|audit_trace_id/u);
    } finally {
      await fixture.close();
    }
  });

  await t.test("completion ingestion pending may expose one immutable artifact without claiming completion", async () => {
    const fixture = await startFixture({
      esignReadinessState: "ready",
      esignItems: [{ ...esignItem(1), state: "completed_artifacts_pending", completion_artifacts: { signed_pdf: signedPdf, certificate: null } }],
    });
    try {
      const result = await json(fixture, `/api/outlook/documents?matter_id=${MATTER}`);
      assert.equal(result.status, 200, JSON.stringify(result.body));
      assert.equal(result.body.esign_requests[0].state, "completed_artifacts_pending");
      assert.equal(result.body.esign_requests[0].completion_artifacts.signed_pdf.immutable, true);
      assert.equal(result.body.esign_requests[0].completion_artifacts.certificate, null);
    } finally {
      await fixture.close();
    }
  });

  for (const [label, item] of [
    ["completed missing certificate", { ...esignItem(1), state: "completed", completion_artifacts: { signed_pdf: signedPdf, certificate: null } }],
    ["completed certificate is not immutable", { ...esignItem(1), state: "completed", completion_artifacts: { signed_pdf: signedPdf, certificate: { ...certificate, immutable: false } } }],
    ["completed pair reuses one artifact identity", { ...esignItem(1), state: "completed", completion_artifacts: { signed_pdf: signedPdf, certificate: { ...signedPdf } } }],
    ["completed pair reuses one document across versions", { ...esignItem(1), state: "completed", completion_artifacts: { signed_pdf: signedPdf, certificate: { ...signedPdf, version_id: "completion_version_certificate" } } }],
    ["completion-pending pair reuses one artifact identity", { ...esignItem(1), state: "completed_artifacts_pending", completion_artifacts: { signed_pdf: signedPdf, certificate: { ...signedPdf } } }],
    ["completion-pending pair reuses one document across versions", { ...esignItem(1), state: "completed_artifacts_pending", completion_artifacts: { signed_pdf: signedPdf, certificate: { ...signedPdf, version_id: "completion_version_certificate" } } }],
    ["sent with false completion artifacts", { ...esignItem(1), state: "sent", completion_artifacts: { signed_pdf: signedPdf, certificate } }],
  ]) {
    await t.test(label, async () => {
      const fixture = await startFixture({ esignReadinessState: "ready", esignItems: [item] });
      try {
        const result = await json(fixture, `/api/outlook/documents?matter_id=${MATTER}`);
        assert.equal(result.status, 200, JSON.stringify(result.body));
        assert.equal(result.body.templates.length, 1);
        assert.deepEqual(result.body.esign_requests, []);
        assert.deepEqual(result.body.readiness, { authoritative: true, builder_ready: true, esign_ready: false });
        assert.deepEqual(result.body.safe_error_codes, ["OUTLOOK_DOCUMENT_ESIGN_RESPONSE_INVALID"]);
        assert.deepEqual(fixture.docusignCounters, { authorize: 1, list: 1, queue: 0, send: 0, reconcile: 0 });
        assert.doesNotMatch(JSON.stringify(result.body), /completion_document_|completion_version_|completion-permission-secret|completion-audit-secret/u);
      } finally {
        await fixture.close();
      }
    });
  }
});

test("OUTM-32 approval intent derives the draft, recovers a partial create, and replays both stages exactly", async () => {
  const fixture = await startFixture({ failApprovalReplayReadOnce: true });
  try {
    for (const forbidden of ["tenant_id", "actor_id", "permission_ref", "audit_hint_ref", "draft_id"]) {
      const invalidExtra = await json(fixture, "/api/outlook/documents/approval-requests", {
        method: "POST",
        body: { ...approvalIntent(), [forbidden]: `forbidden-${forbidden}` },
      });
      assert.equal(invalidExtra.status, 400);
    }
    const missingAction = await json(fixture, "/api/outlook/documents/approval-requests", {
      method: "POST",
      body: approvalIntent({ explicit_human_action: false }),
    });
    assert.equal(missingAction.status, 400);
    assert.deepEqual(missingAction.body.safe_error_codes, ["OUTLOOK_DOCUMENT_EXPLICIT_ACTION_REQUIRED"]);
    assert.equal(fixture.matterRuntime.repository.list({ tenant_id: TENANT, model_type: "MatterBuilderDraft" }).length, 0);

    const partial = await json(fixture, "/api/outlook/documents/approval-requests", {
      method: "POST",
      body: approvalIntent(),
      requestId: "outlook-document-partial",
    });
    assert.equal(partial.status, 400, JSON.stringify(partial.body));
    assert.equal(partial.body.outcome, "partial");
    assert.equal(partial.body.partial, true);
    assert.equal(partial.body.approval_request, null);
    assert.equal(partial.body.draft_replayed, false);
    const draftId = partial.body.draft.draft_id;
    assert.match(draftId, /^builder_draft_outlook_[a-f0-9]{32}$/u);
    assert.doesNotMatch(JSON.stringify(partial.body), /비공개 의뢰인|비공개 Matter|private-client|tenant_id|actor_id|permission:|audit:/u);

    const recovered = await json(fixture, "/api/outlook/documents/approval-requests", {
      method: "POST",
      body: approvalIntent(),
      requestId: "outlook-document-recovered",
    });
    assert.equal(recovered.status, 200, JSON.stringify(recovered.body));
    assert.equal(recovered.body.outcome, "approval_required");
    assert.equal(recovered.body.partial, false);
    assert.equal(recovered.body.draft_replayed, true);
    assert.equal(recovered.body.approval_replayed, false);
    assert.equal(recovered.body.draft.draft_id, draftId);
    assert.equal(recovered.body.approval_request.draft_id, draftId);
    assert.deepEqual(Object.keys(recovered.body), [
      "request_id", "outcome", "matter_id", "draft", "approval_request", "partial", "draft_replayed",
      "approval_replayed", "safe_error_codes", "count_leak_prevented", "production_ready_claim",
    ]);
    assert.deepEqual(Object.keys(recovered.body.draft), [
      "draft_id", "matter_id", "template_id", "template_version", "template_hash", "input_fingerprint", "title",
      "status", "safe_excerpt", "merge_field_count", "signer_role_count", "approval_state", "publish_state", "immutable",
      "raw_body_included", "raw_template_body_included", "raw_contact_values_included", "document_bytes_included",
      "production_ready_claim",
    ]);
    assert.deepEqual(Object.keys(recovered.body.approval_request), [
      "approval_request_id", "draft_id", "matter_id", "status", "decision", "reviewer_role", "input_fingerprint",
      "template_id", "template_version", "template_hash", "approval_receipt", "reviewer_user_ref_included",
      "owner_approval_ref_included", "raw_body_included", "raw_contact_values_included", "production_ready_claim",
    ]);

    const replay = await json(fixture, "/api/outlook/documents/approval-requests", {
      method: "POST",
      body: approvalIntent(),
      requestId: "outlook-document-replay",
    });
    assert.equal(replay.status, 200, JSON.stringify(replay.body));
    assert.equal(replay.body.outcome, "idempotent_replay");
    assert.equal(replay.body.draft_replayed, true);
    assert.equal(replay.body.approval_replayed, true);
    assert.equal(fixture.matterRuntime.repository.list({ tenant_id: TENANT, model_type: "MatterBuilderDraft" }).length, 1);
    assert.equal(fixture.matterRuntime.repository.list({ tenant_id: TENANT, model_type: "MatterBuilderApprovalRequest" }).length, 1);

    const conflict = await json(fixture, "/api/outlook/documents/approval-requests", {
      method: "POST",
      body: approvalIntent({ title: "같은 키의 다른 제목" }),
      requestId: "outlook-document-conflict",
    });
    assert.equal(conflict.status, 409, JSON.stringify(conflict.body));
    assert.equal(fixture.matterRuntime.repository.list({ tenant_id: TENANT, model_type: "MatterBuilderDraft" }).length, 1);

    const second = await json(fixture, "/api/outlook/documents/approval-requests", {
      method: "POST",
      body: approvalIntent({ idempotency_key: "outlook-document-approval-intent-2", title: "두 번째 위임계약서" }),
      requestId: "outlook-document-second-approval",
    });
    assert.equal(second.status, 200, JSON.stringify(second.body));
    const aggregate = await json(fixture, `/api/outlook/documents?matter_id=${MATTER}`);
    assert.equal(aggregate.status, 200, JSON.stringify(aggregate.body));
    assert.equal(aggregate.body.approval_requests.length, 2);
    assert.deepEqual(
      aggregate.body.approval_requests.map((item) => item.approval_request_id),
      [...aggregate.body.approval_requests.map((item) => item.approval_request_id)].sort().reverse(),
    );
  } finally {
    await fixture.close();
  }
});

test("OUTM-32 approval intent validates the full draft-create replay matrix before approval", async (t) => {
  const cases = [
    ["created plus false continues", "created", false, 200, 1, false],
    ["created plus true fails closed before approval", "created", true, 503, 0, null],
    ["idempotent replay plus true continues", "idempotent_replay", true, 200, 1, true],
    ["idempotent replay plus false fails closed before approval", "idempotent_replay", false, 503, 0, null],
    ["unsupported plus false fails closed before approval", "unexpected_draft_success", false, 503, 0, null],
    ["unsupported plus true fails closed before approval", "unexpected_draft_success", true, 503, 0, null],
  ];
  for (const [label, outcome, idempotentReplay, expectedStatus, expectedApprovalCalls, expectedDraftReplay] of cases) {
    await t.test(label, async () => {
      let approvalServiceCalls = 0;
      const fixture = await startFixture({
        tamperResult(result) {
          if (result?.approval_request) approvalServiceCalls += 1;
          return result?.item?.status === "draft" && !result.approval_request
            ? { ...result, outcome, idempotent_replay: idempotentReplay }
            : result;
        },
      });
      try {
        const result = await json(fixture, "/api/outlook/documents/approval-requests", {
          method: "POST",
          body: approvalIntent(),
          requestId: `outlook-document-create-replay-${label}`,
        });
        const approvalRecords = fixture.matterRuntime.repository.list({
          tenant_id: TENANT,
          model_type: "MatterBuilderApprovalRequest",
        }).length;
        assert.deepEqual(
          { status: result.status, approval_service_calls: approvalServiceCalls, approval_records: approvalRecords },
          { status: expectedStatus, approval_service_calls: expectedApprovalCalls, approval_records: expectedApprovalCalls },
          JSON.stringify(result.body),
        );
        if (expectedStatus === 503) {
          assert.deepEqual(Object.keys(result.body), ["request_id", "outcome", "safe_error_codes", "count_leak_prevented", "production_ready_claim"]);
          assert.deepEqual(result.body.safe_error_codes, ["OUTLOOK_DOCUMENT_RESPONSE_INVALID"]);
          assert.doesNotMatch(JSON.stringify(result.body), /unexpected_draft_success|draft_id|approval_request|matter_id/u);
        } else {
          assert.equal(result.body.outcome, "approval_required");
          assert.equal(result.body.draft_replayed, expectedDraftReplay);
          assert.equal(result.body.approval_replayed, false);
          assert.ok(result.body.approval_request);
        }
      } finally {
        await fixture.close();
      }
    });
  }
});

test("OUTM-32 approval intent rejects mixed template, input, draft, request, and receipt response chains", async (t) => {
  const foreignReceipt = (approval) => Object.freeze({
    receipt_id: "builder-approval-receipt:foreign",
    approval_request_id: "builder_approval_foreign",
    approved_at: AT,
    input_hash: "c".repeat(64),
    input_fingerprint: approval.input_fingerprint,
    template_hash: approval.template_hash,
    receipt_hash: "d".repeat(64),
    approved_by_ref_included: false,
    raw_body_included: false,
    raw_contact_values_included: false,
  });
  const cases = [
    ["created draft mixes template v2 into a v1 request", (result) => (
      result?.item?.status === "draft" && !result.approval_request
        ? { ...result, item: { ...result.item, template_version: "api-1.0.001", template_hash: "b".repeat(64) } }
        : result
    )],
    ["created draft changes the complete request fingerprint", (result) => (
      result?.item?.status === "draft" && !result.approval_request
        ? { ...result, item: { ...result.item, input_fingerprint: "c".repeat(64) } }
        : result
    )],
    ["approval request mixes template v2 into its v1 draft", (result) => (
      result?.approval_request
        ? { ...result, approval_request: { ...result.approval_request, template_version: "api-1.0.001", template_hash: "b".repeat(64) } }
        : result
    )],
    ["approval request points at a foreign draft", (result) => (
      result?.approval_request
        ? { ...result, approval_request: { ...result.approval_request, draft_id: "builder_draft_foreign" } }
        : result
    )],
    ["approval response substitutes a colluding foreign request and receipt", (result) => {
      if (!result?.approval_request) return result;
      const approval = { ...result.approval_request, approval_request_id: "builder_approval_foreign", status: "approved", decision: "approved" };
      const receipt = foreignReceipt(approval);
      return {
        ...result,
        item: { ...result.item, status: "approved", approval_state: "approved", publish_state: "approved_unpublished" },
        approval_request: { ...approval, approval_receipt: receipt },
        approval_receipt: receipt,
      };
    }],
    ["approval handler returns an unsupported success outcome", (result) => (
      result?.approval_request ? { ...result, outcome: "unexpected_success" } : result
    )],
    ["approval replay outcome omits its canonical replay flag", (result) => (
      result?.approval_request ? { ...result, outcome: "idempotent_replay", idempotent_replay: false } : result
    )],
    ["approval replay outcome claims replay before its draft", (result) => (
      result?.approval_request ? { ...result, outcome: "idempotent_replay", idempotent_replay: true } : result
    )],
    ["approval-required outcome falsely carries a replay flag", (result) => (
      result?.approval_request ? { ...result, outcome: "approval_required", idempotent_replay: true } : result
    )],
  ];
  for (const [label, tamperResult] of cases) {
    await t.test(label, async () => {
      const fixture = await startFixture({ templateCount: 2, tamperResult });
      try {
        const result = await json(fixture, "/api/outlook/documents/approval-requests", {
          method: "POST",
          body: approvalIntent(),
          requestId: `outlook-document-adversarial-${label}`,
        });
        assert.equal(result.status, 503, JSON.stringify(result.body));
        assert.deepEqual(Object.keys(result.body), ["request_id", "outcome", "safe_error_codes", "count_leak_prevented", "production_ready_claim"]);
        assert.deepEqual(result.body.safe_error_codes, ["OUTLOOK_DOCUMENT_RESPONSE_INVALID"]);
        assert.doesNotMatch(JSON.stringify(result.body), /api-1\.0\.001|builder_draft_foreign|builder_approval_foreign|builder-approval-receipt:foreign|unexpected_success/u);
      } finally {
        await fixture.close();
      }
    });
  }
});

test("OUTM-32 publish returns only the immutable artifact and canonical local Matter reference, with exact replay and binding", async () => {
  const fixture = await startFixture();
  try {
    const requested = await json(fixture, "/api/outlook/documents/approval-requests", { method: "POST", body: approvalIntent() });
    assert.equal(requested.status, 200, JSON.stringify(requested.body));
    const draftId = requested.body.draft.draft_id;
    const approvalId = requested.body.approval_request.approval_request_id;
    const decided = await handleMatterApiRequest({
      pathname: `/api/matters/${MATTER}/builder-approval-requests/${approvalId}/decision`,
      method: "POST",
      body: {
        tenant_id: TENANT,
        permission_ref: `permission:${MATTER}`,
        audit_hint_ref: `audit:${MATTER}`,
        decision: "approved",
        idempotency_key: "outlook-document-owner-decision",
      },
      context: context(),
      requestId: "outlook-document-owner-decision",
      runtime: fixture.matterRuntime,
    });
    assert.equal(decided.status, 200, JSON.stringify(decided.body));

    const publishBody = { matter_id: MATTER, idempotency_key: "outlook-document-publish", explicit_human_action: true };
    const published = await json(fixture, `/api/outlook/documents/${draftId}/publish`, { method: "POST", body: publishBody });
    assert.equal(published.status, 200, JSON.stringify(published.body));
    assert.equal(published.body.outcome, "created");
    assert.equal(published.body.artifact.immutable, true);
    assert.equal(published.body.artifact.generator_version, "amic-matter-agreement-docx/1");
    assert.equal(published.body.canonical_document_ref, `matter://${MATTER}/documents/${published.body.artifact.document_id}/versions/${published.body.artifact.version_id}`);
    assert.equal(published.body.partial, false);
    assert.equal(published.body.idempotent_replay, false);
    assert.deepEqual(Object.keys(published.body), [
      "request_id", "outcome", "matter_id", "draft", "artifact", "canonical_document_ref", "partial",
      "idempotent_replay", "safe_error_codes", "count_leak_prevented", "production_ready_claim",
    ]);
    assert.deepEqual(Object.keys(published.body.artifact), [
      "artifact_id", "draft_id", "document_id", "version_id", "file_object_id", "filename", "mime_type", "byte_size",
      "sha256", "generator_version", "template_id", "template_version", "template_hash", "input_hash",
      "approval_receipt_id", "status", "immutable", "signer_snapshot_count", "document_bytes_included",
      "raw_body_included", "raw_contact_values_included", "raw_storage_path_included",
    ]);
    assert.doesNotMatch(JSON.stringify(published.body), /비공개 의뢰인|private-client|storage_pointer|content_base64/u);
    assert.equal(published.body.artifact.raw_storage_path_included, false);
    assert.equal(published.body.artifact.document_bytes_included, false);

    const replay = await json(fixture, `/api/outlook/documents/${draftId}/publish`, { method: "POST", body: publishBody });
    assert.equal(replay.status, 200, JSON.stringify(replay.body));
    assert.equal(replay.body.outcome, "idempotent_replay");
    assert.equal(replay.body.idempotent_replay, true);
    assert.equal(replay.body.canonical_document_ref, published.body.canonical_document_ref);
    assert.equal(fixture.matterRuntime.dmsRuntime.repository.list({ tenant_id: TENANT, model_type: "DmsDocument" }).length, 1);

    const noAction = await json(fixture, `/api/outlook/documents/${draftId}/publish`, {
      method: "POST",
      body: { ...publishBody, explicit_human_action: false },
    });
    assert.equal(noAction.status, 400);
    const forbiddenAuthority = await json(fixture, `/api/outlook/documents/${draftId}/publish`, {
      method: "POST",
      body: { ...publishBody, permission_ref: `permission:${MATTER}` },
    });
    assert.equal(forbiddenAuthority.status, 400);
    const foreignBinding = await json(fixture, `/api/outlook/documents/${draftId}/publish`, {
      method: "POST",
      body: { ...publishBody, matter_id: FOREIGN_MATTER, idempotency_key: "outlook-document-foreign-publish" },
    });
    assert.equal(foreignBinding.status, 404, JSON.stringify(foreignBinding.body));
    assert.equal(foreignBinding.body.draft, null);
    assert.equal(foreignBinding.body.artifact, null);
  } finally {
    await fixture.close();
  }
});

test("OUTM-32 publish rejects mixed artifact, draft, approval receipt, and receipt-hash chains", async (t) => {
  const unsafeGeneratorVersions = [
    ["generator version contains extra segments", "amic-matter-agreement-docx/1/extra"],
    ["generator version contains a query", "amic-matter-agreement-docx?1"],
    ["generator version contains a hash", "amic-matter-agreement-docx#1"],
    ["generator version contains whitespace", "amic matter/1"],
    ["generator version contains a control", "amic-matter-agreement-docx/1\u0000"],
    ["generator version contains a backslash", "amic-matter-agreement-docx\\1"],
    ["generator version contains traversal", "amic-matter-agreement-docx/../1"],
    ["generator version contains dot traversal", "amic-matter-agreement-docx/./1"],
    ["generator version contains provider payload", "provider_payload"],
    ["generator version contains storage path", "storage_path"],
    ["generator version contains permission envelope", "permission_envelope_id"],
    ["generator version contains audit trace", "audit_trace_id"],
    ["generator version contains raw body", "raw_body"],
    ["generator version contains document bytes", "document_bytes"],
    ["generator version contains client secret", "client_secret"],
    ["generator version contains internal marker", "internal-build"],
  ];
  const cases = [
    ["artifact mixes template v2 into an approved v1 draft", (result) => ({
      ...result,
      artifact: { ...result.artifact, template_version: "api-1.0.001", template_hash: "b".repeat(64) },
    })],
    ["artifact substitutes an input hash not approved by the receipt", (result) => ({
      ...result,
      artifact: { ...result.artifact, input_hash: "c".repeat(64) },
    })],
    ["published draft and artifact collude on a foreign template identity", (result) => ({
      ...result,
      item: { ...result.item, template_version: "api-1.0.001", template_hash: "b".repeat(64) },
      artifact: { ...result.artifact, template_version: "api-1.0.001", template_hash: "b".repeat(64) },
      approval_receipt: { ...result.approval_receipt, template_hash: "b".repeat(64) },
    })],
    ["artifact and top-level response collude on a foreign approval receipt", (result) => ({
      ...result,
      artifact: { ...result.artifact, approval_receipt_id: "builder-approval-receipt:foreign" },
      approval_receipt: {
        ...result.approval_receipt,
        receipt_id: "builder-approval-receipt:foreign",
        approval_request_id: "builder_approval_foreign",
        receipt_hash: "d".repeat(64),
      },
    })],
    ["approval receipt hash is substituted", (result) => ({
      ...result,
      approval_receipt: { ...result.approval_receipt, receipt_hash: "d".repeat(64) },
    })],
    ["publish handler returns an unsupported success outcome", (result) => ({
      ...result,
      outcome: "unexpected_success",
    })],
    ["publish created outcome falsely carries a replay flag", (result) => ({
      ...result,
      outcome: "created",
      idempotent_replay: true,
    })],
    ["publish replay outcome omits its canonical replay flag", (result) => ({
      ...result,
      outcome: "idempotent_replay",
      idempotent_replay: false,
    })],
    ["publish success omits both artifact and approval receipt", (result) => ({
      ...result,
      artifact: null,
      approval_receipt: null,
    })],
    ...unsafeGeneratorVersions.map(([label, generatorVersion]) => [label, (result) => ({
      ...result,
      artifact: { ...result.artifact, generator_version: generatorVersion },
    })]),
  ];
  for (const [label, transform] of cases) {
    await t.test(label, async () => {
      const fixture = await startFixture({
        templateCount: 2,
        tamperResult(result) {
          return result?.artifact && result?.approval_receipt ? transform(result) : result;
        },
      });
      try {
        const { draftId } = await requestAndApproveDocument(fixture);
        const published = await json(fixture, `/api/outlook/documents/${draftId}/publish`, {
          method: "POST",
          body: { matter_id: MATTER, idempotency_key: `outlook-document-adversarial-publish-${label}`, explicit_human_action: true },
        });
        assert.equal(published.status, 503, JSON.stringify(published.body));
        assert.deepEqual(Object.keys(published.body), ["request_id", "outcome", "safe_error_codes", "count_leak_prevented", "production_ready_claim"]);
        assert.deepEqual(published.body.safe_error_codes, ["OUTLOOK_DOCUMENT_RESPONSE_INVALID"]);
        assert.doesNotMatch(JSON.stringify(published.body), /api-1\.0\.001|builder_approval_foreign|builder-approval-receipt:foreign|unexpected_success/u);
      } finally {
        await fixture.close();
      }
    });
  }
});

test("OUTM-32/34 denies a foreign Matter and a DocuSign authorization refusal without leaking builder rows", async () => {
  const foreignFixture = await startFixture();
  try {
    const denied = await json(foreignFixture, `/api/outlook/documents?matter_id=${FOREIGN_MATTER}`, { token: FOREIGN_DENY_TOKEN });
    assert.equal(denied.status, 403, JSON.stringify(denied.body));
    assert.deepEqual(Object.keys(denied.body), ["request_id", "outcome", "safe_error_codes", "count_leak_prevented", "production_ready_claim"]);
    assert.equal(JSON.stringify(denied.body).includes("templates"), false);

    const deniedExisting = await json(foreignFixture, `/api/outlook/documents?matter_id=${MATTER}`, { token: DENIED_TOKEN });
    const deniedMissing = await json(foreignFixture, "/api/outlook/documents?matter_id=matter_random_unknown", { token: DENIED_TOKEN });
    assert.equal(deniedExisting.status, 403);
    assert.equal(deniedMissing.status, 403);
    assert.deepEqual(Object.keys(deniedExisting.body), Object.keys(deniedMissing.body));
    assert.deepEqual(deniedExisting.body.safe_error_codes, ["OUTLOOK_DOCUMENT_MATTER_ACCESS_DENIED"]);
    assert.deepEqual(deniedMissing.body.safe_error_codes, deniedExisting.body.safe_error_codes);
    assert.deepEqual(foreignFixture.matterRuntimeCounters, { get: 0, list: 0 });
    assert.deepEqual(foreignFixture.docusignCounters, { authorize: 0, list: 0, queue: 0, send: 0, reconcile: 0 });

    const authorizedMissing = await json(foreignFixture, "/api/outlook/documents?matter_id=matter_random_unknown");
    assert.equal(authorizedMissing.status, 404);
    assert.deepEqual(authorizedMissing.body.safe_error_codes, ["OUTLOOK_DOCUMENT_MATTER_NOT_FOUND"]);
  } finally {
    await foreignFixture.close();
  }

  const docusignDeniedFixture = await startFixture({ esignAuthorize: false, esignReadinessState: "ready" });
  try {
    const denied = await json(docusignDeniedFixture, `/api/outlook/documents?matter_id=${MATTER}`);
    assert.equal(denied.status, 403, JSON.stringify(denied.body));
    assert.deepEqual(denied.body.safe_error_codes, ["DOCUSIGN_MATTER_ACCESS_DENIED"]);
    assert.equal(JSON.stringify(denied.body).includes("templates"), false);
    assert.deepEqual(docusignDeniedFixture.docusignCounters, { authorize: 1, list: 0, queue: 0, send: 0, reconcile: 0 });
  } finally {
    await docusignDeniedFixture.close();
  }
});
