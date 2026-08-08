import assert from "node:assert/strict";
import test from "node:test";

import { handleOutlookAddinApiRequest } from "../src/outlook-addin-runtime-context.js";
import {
  assertOutlookOperationEvidenceSafe,
  createOutlookOperationResponse,
} from "../src/outlook-operation-response.js";

const context = {
  principal: {
    ok: true,
    source: "api-signed-session",
    tenant_id: "tenant-1",
    user_id: "user-1",
  },
  rules: [{ id: "outlook", effect: "allow", action_prefix: "outlook:addin:" }],
  object_acl: [],
};

function input(overrides = {}) {
  return {
    context,
    request_id: "request-1",
    permission_check: { outcome: "allow" },
    idempotency_fingerprint: "fingerprint-1",
    provider_flags: { enabled: true, runtime_enabled: true },
    state: "complete",
    item: {
      filing_ref: "filing-1",
      task_ref: "task-1",
      lead_id: "lead-1",
      party_id: "party-1",
      process_id: "process-1",
    },
    ...overrides,
  };
}

test("session context supplies principal identifiers, while bare audit refs are omitted", () => {
  const response = createOutlookOperationResponse(input({ audit_ref: "client-hint" }));
  assert.equal(response.status, 200);
  assert.equal(response.body.state, "complete");
  assert.equal(response.body.request_id, "request-1");
  assert.deepEqual(response.body.permission_check, { outcome: "allow" });
  assert.equal(response.body.idempotency_fingerprint, "fingerprint-1");
  assert.equal(Object.hasOwn(response.body, "audit_ref"), false);
  assert.equal(Object.hasOwn(response.body, "authenticated_server_principal"), false);
  assert.equal(response.body.item.lead_id, "lead-1");
  assert.equal(response.body.item.filing_ref, "filing-1");
  assert.equal(response.body.production_ready_claim, false);
});

test("typed server audit receipt is the only append-only audit representation", () => {
  const response = createOutlookOperationResponse(input({
    audit_receipt: { ref: "audit-1", append_only: true, source: "server_audit" },
  }));
  assert.equal(response.body.audit_ref, "audit-1");
  assert.equal(response.body.audit_append_only, true);
  assert.throws(
    () => createOutlookOperationResponse(input({ audit_receipt: { ref: "audit-1", append_only: true } })),
    (error) => error.safe_error_code === "OUTLOOK_OPERATION_RESPONSE_INVALID",
  );
});

test("browser actor, tenant, and ProductId input fields fail closed without self-attesting context origin", () => {
  for (const overrides of [
    { actor_id: "browser-actor" },
    { tenant_id: "browser-tenant" },
    { ProductId: "browser-product" },
    { principal: { tenant_id: "tenant-1", user_id: "user-1" } },
  ]) {
    assert.throws(
      () => createOutlookOperationResponse(input(overrides)),
      (error) => error.safe_error_code === "OUTLOOK_OPERATION_RESPONSE_INVALID",
    );
  }
  assert.throws(
    () => createOutlookOperationResponse(input({ context: undefined })),
    (error) => error.safe_error_code === "OUTLOOK_OPERATION_RESPONSE_INVALID",
  );
  const authorityNeutral = createOutlookOperationResponse(input({
    context: { principal: { ...context.principal, source: "browser" } },
  }));
  assert.equal(authorityNeutral.body.state, "complete");
});

test("profile visibility cannot substitute for permission outcome", () => {
  assert.throws(
    () => createOutlookOperationResponse(input({ permission_check: undefined, profile: "matter-full" })),
    /permission check outcome is required/u,
  );
  const denied = createOutlookOperationResponse(input({ status: 403, state: "complete", permission_check: "denied" }));
  assert.equal(denied.body.state, "permission_changed");
});

test("403, 409, and provider-disabled responses are never empty success", () => {
  assert.equal(createOutlookOperationResponse(input({ status: 403, state: "complete", permission_check: "denied" })).body.state, "permission_changed");
  assert.equal(createOutlookOperationResponse(input({ status: 409, state: "complete" })).body.state, "failed");
  assert.equal(createOutlookOperationResponse(input({ status: 409, state: "complete", idempotent_replay: true })).body.state, "duplicate");
  assert.equal(createOutlookOperationResponse(input({ provider_flags: { enabled: false }, state: "complete" })).body.state, "provider_blocked");
  assert.throws(() => createOutlookOperationResponse(input({ state: "complete", item: undefined })), /successful operation result is required/u);
});

test("partial and replay semantics preserve realistic result references", () => {
  const partial = createOutlookOperationResponse(input({ partial: true, item: { filing_ref: "filing-1", partial: true } }));
  assert.equal(partial.body.state, "partial");
  assert.equal(partial.body.partial, true);
  assert.equal(partial.body.item.filing_ref, "filing-1");
  const replay = createOutlookOperationResponse(input({ duplicate: true, idempotent_replay: true }));
  assert.equal(replay.body.state, "duplicate");
  assert.equal(replay.body.duplicate, true);
});

test("nested evidence is traversed exactly, cycles are bounded, and false-positive names stay safe", () => {
  for (const unsafe of [
    { permission_counts: 4 },
    { access_token: "token" },
    { provider_message: "raw provider response" },
    { email_body: "메일 본문" },
    { attachment_bytes: new Uint8Array([1, 2]) },
    { storage_pointer_ref: "private" },
    { stack_trace: "at provider" },
    { ProductId: "browser-claim" },
    { deep: [{ safe: { raw_provider_message: "raw" } }] },
    { deep: [{ arbitrary_included: true }] },
    { deep: [{ production_ready_claim: true }] },
    { deep: [{ oauth_token: "secret" }] },
    { deep: [{ id_token: "secret" }] },
    { deep: [{ provider_payload: { status: 200 } }] },
    { deep: [{ body: { safe: true } }] },
    { message: "raw provider response" },
    { email_body_included: true },
    { arbitrary_included: true },
  ]) {
    assert.throws(
      () => assertOutlookOperationEvidenceSafe(unsafe),
      (error) => error.safe_error_code === "OUTLOOK_OPERATION_RESPONSE_INVALID",
    );
  }
  const cycle = { tokenized_label: "safe" };
  cycle.self = cycle;
  assert.throws(() => assertOutlookOperationEvidenceSafe(cycle), /OUTLOOK_OPERATION_EVIDENCE_UNSAFE/u);
  const shared = { tokenized_label: "safe" };
  assert.equal(assertOutlookOperationEvidenceSafe({ shared: [shared, shared] }), true);
  assert.equal(assertOutlookOperationEvidenceSafe({ tokenized_label: "safe" }), true);
  assert.equal(assertOutlookOperationEvidenceSafe({ message: "tokenized_label is safe" }), true);
  assert.equal(assertOutlookOperationEvidenceSafe({ status: 200, body: { tokenized_label: "safe" } }), true);
  assert.throws(
    () => assertOutlookOperationEvidenceSafe({ status: 200, body: { tokenized_label: "safe" }, headers: { body: { raw: true } } }),
    /OUTLOOK_OPERATION_EVIDENCE_UNSAFE/u,
  );
  assert.equal(assertOutlookOperationEvidenceSafe({ production_ready_claim: false, email_body_included: false }), true);
  assert.equal(createOutlookOperationResponse(input({ email_body_included: false })).body.email_body_included, false);
});

test("production-ready claims and unsafe result fields are rejected", () => {
  assert.throws(() => createOutlookOperationResponse(input({ production_ready_claim: true })), /production_ready_claim must be false/u);
  assert.throws(() => createOutlookOperationResponse(input({ item: { attachment_content_base64: "YWJj" } })), /unsafe result field|OUTLOOK_OPERATION_EVIDENCE_UNSAFE/u);
  assert.throws(() => createOutlookOperationResponse(input({ item: { storage_pointer_ref: "private" } })), /unsafe result field|OUTLOOK_OPERATION_EVIDENCE_UNSAFE/u);
  assert.throws(() => createOutlookOperationResponse(input({ item: { unknown_ref: "not allowed" } })), /unsafe result field/u);
  assert.throws(() => createOutlookOperationResponse(input({ item: {} })), /result fields are required/u);
  assert.throws(() => createOutlookOperationResponse(input({ evidence: [{ arbitrary_included: true }] })), /OUTLOOK_OPERATION_EVIDENCE_UNSAFE/u);
});

test("actual Outlook API path keeps forged tenant claims denied", async () => {
  const denied = await handleOutlookAddinApiRequest({
    pathname: "/api/outlook/connection",
    method: "GET",
    query: { tenant_id: "tenant-forged", ProductId: "browser-product" },
    requestId: "request-runtime-1",
    context,
  });
  assert.equal(denied.status, 403);
  assert.notEqual(denied.body.outcome, "complete");
  assert.equal(denied.body.production_ready_claim, false);
  assert.equal(Object.hasOwn(denied.body, "authenticated_server_principal"), false);
  const productClaim = await handleOutlookAddinApiRequest({
    pathname: "/api/outlook/connection/authorize",
    method: "POST",
    body: { ProductId: "browser-product" },
    requestId: "request-runtime-product",
    context,
  });
  assert.equal(productClaim.status, 400);
  assert.notEqual(productClaim.body.outcome, "complete");
  assert.equal(productClaim.body.production_ready_claim, false);
});

test("actual Outlook adapter preserves the existing safe bootstrap response shape", async () => {
  const allowed = await handleOutlookAddinApiRequest({
    pathname: "/api/outlook/bootstrap",
    method: "GET",
    query: { tenant_id: "tenant-1" },
    requestId: "request-runtime-2",
    context,
  });
  assert.equal(allowed.status, 200);
  assert.equal(allowed.body.item.taskpane_loaded, true);
  assert.equal(allowed.body.production_ready_claim, false);
  assert.equal(Object.hasOwn(allowed.body, "authenticated_server_principal"), false);
});

test("actual handler errors expose only fixed safe messages", async () => {
  const runtimeContext = {
    ...context,
    rules: [{ id: "outlook-all", effect: "allow", action_prefix: "outlook:" }],
  };
  const missingRuntime = await handleOutlookAddinApiRequest({
    pathname: "/api/outlook/connection",
    method: "GET",
    query: { tenant_id: "tenant-1" },
    requestId: "request-runtime-missing",
    context: runtimeContext,
  });
  assert.equal(missingRuntime.status, 400);
  assert.equal(missingRuntime.body.message, "Outlook 연결 설정을 확인해 주세요.");
  assert.doesNotMatch(JSON.stringify(missingRuntime.body), /undefined|Cannot|ECONNREFUSED|private/iu);

  const privateFailure = await handleOutlookAddinApiRequest({
    pathname: "/api/outlook/matters",
    method: "GET",
    query: { tenant_id: "tenant-1" },
    requestId: "request-runtime-path",
    context: runtimeContext,
    runtime: {
      matterRuntime: {
        repository: {
          list() {
            throw new Error("ECONNREFUSED /private/provider-payload");
          },
        },
      },
    },
  });
  assert.equal(privateFailure.status, 400);
  assert.equal(privateFailure.body.message, "요청 형식을 확인해 주세요.");
  assert.doesNotMatch(JSON.stringify(privateFailure.body), /ECONNREFUSED|private|provider-payload/iu);
});
