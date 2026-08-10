import assert from "node:assert/strict";
import test from "node:test";

import {
  OUTLOOK_OPERATION_STATES,
  createOutlookOperationState,
  normalizeOutlookOperationError,
  transitionOutlookOperationState,
} from "../src/outlook-operation-state.js";

const STATES = Object.values(OUTLOOK_OPERATION_STATES);
const base = () => createOutlookOperationState("mail.file");

test("OUTM-07 has only the exact frozen machine vocabulary", () => {
  assert.deepEqual(STATES, [
    "idle", "working", "created", "complete", "duplicate", "partial",
    "permission_changed", "stale_item", "offline", "reconnect_required",
    "provider_blocked", "failed",
  ]);
  assert.ok(Object.isFrozen(OUTLOOK_OPERATION_STATES));
  assert.equal("safe_failed" in OUTLOOK_OPERATION_STATES, false);
});

test("create starts idle and rejects unsafe operation identifiers", () => {
  const state = base();
  assert.ok(Object.isFrozen(state));
  assert.equal(state.operation, "mail.file");
  assert.equal(state.state, "idle");
  assert.equal(state.production_ready_claim, false);
  assert.throws(() => createOutlookOperationState(""), /operation is required/u);
  assert.throws(() => createOutlookOperationState("mail/body"), /operation is required/u);
});

test("every state is deterministic and profile visibility never grants permission", () => {
  for (const state of STATES) {
    const next = transitionOutlookOperationState(base(), {
      state,
      profile: "matter-full",
      request_id: "request-1",
      idempotency_fingerprint: "fingerprint-1",
    });
    assert.equal(next.state, state);
    assert.equal(next.request_id, "request-1");
    assert.equal(next.idempotency_fingerprint, "fingerprint-1");
    assert.equal(next.production_ready_claim, false);
  }
  const denied = transitionOutlookOperationState(base(), {
    outcome: "complete",
    profile: "matter-full",
    permission_check: { outcome: "denied" },
  });
  assert.equal(denied.state, OUTLOOK_OPERATION_STATES.permissionChanged);
});

test("request ID and idempotency replay, duplicate, and partial flags survive transitions", () => {
  const current = transitionOutlookOperationState(base(), {
    state: "working",
    request_id: "request-1",
    idempotency_key: "operation-key-1",
    idempotency_fingerprint: "fingerprint-1",
  });
  const replay = transitionOutlookOperationState(current, {
    outcome: "complete",
    idempotent_replay: true,
    partial: true,
    audit_ref: "audit-1",
  });
  assert.equal(replay.state, "duplicate");
  assert.equal(replay.request_id, "request-1");
  assert.equal(replay.idempotency_key, "operation-key-1");
  assert.equal(replay.idempotency_fingerprint, "fingerprint-1");
  assert.equal(replay.idempotent_replay, true);
  assert.equal(replay.duplicate, true);
  assert.equal(replay.partial, true);
  assert.equal(replay.audit_ref, "audit-1");
  assert.equal(transitionOutlookOperationState(base(), { outcome: "partial", partial: true }).state, "partial");
  const failed = transitionOutlookOperationState(current, { error: { safe_error_code: "OUTLOOK_OPERATION_FAILED" } });
  assert.equal(failed.request_id, "request-1");
  assert.equal(failed.idempotency_fingerprint, "fingerprint-1");
});

test("known safe errors map exactly to state, concise Korean UI copy, and hidden recovery", () => {
  const cases = [
    ["OUTLOOK_ITEM_CHANGED_DURING_ACTION", "stale_item", "reload_item"],
    ["ADDIN_API_REQUEST_TIMEOUT", "offline", "retry_when_online"],
    ["M365_SCOPE_INSUFFICIENT", "reconnect_required", "reconnect_outlook"],
    ["M365_PROVIDER_RUNTIME_DISABLED", "provider_blocked", "contact_admin"],
    ["OUTLOOK_ADDIN_PERMISSION_DENIED", "permission_changed", "refresh_permission"],
    ["OUTLOOK_INQUIRY_IDEMPOTENCY_CONFLICT", "duplicate", "show_existing_result"],
    ["OUTLOOK_OPERATION_UNKNOWN", "failed", "retry_safely"],
  ];
  for (const [code, state, action] of cases) {
    const result = normalizeOutlookOperationError({
      safe_error_code: code,
      status: code === "OUTLOOK_ADDIN_PERMISSION_DENIED" ? 403 : undefined,
      request_id: "request-1",
      idempotency_fingerprint: "fingerprint-1",
      message: "raw provider response with email body and token",
    });
    assert.equal(result.state, state);
    assert.equal(result.recovery.action, action);
    assert.equal(result.request_id, "request-1");
    assert.equal(result.idempotency_fingerprint, "fingerprint-1");
    assert.equal(result.visible_action.includes("\n"), false);
    assert.match(result.visible_action, /[가-힣]/u);
    assert.ok(result.recovery.hidden_message.length > result.visible_action.length);
    assert.doesNotMatch(result.recovery.hidden_message, /idempotency/iu);
    assert.doesNotMatch(JSON.stringify(result), /raw provider response|email body|token/iu);
  }
});

test("403, 409, provider-disabled, and leaky responses never become success", () => {
  assert.equal(transitionOutlookOperationState(base(), {
    response: { status: 403, body: { outcome: "complete", safe_error_codes: ["OUTLOOK_ADDIN_PERMISSION_DENIED"] } },
  }).state, "permission_changed");
  assert.equal(transitionOutlookOperationState(base(), {
    response: { status: 409, body: { outcome: "complete", safe_error_codes: ["OUTLOOK_CONFLICT"] } },
  }).state, "failed");
  assert.equal(transitionOutlookOperationState(base(), { outcome: "complete", provider_flags: { enabled: false } }).state, "provider_blocked");
  assert.equal(transitionOutlookOperationState(base(), {
    response: { status: 200, body: { state: "complete", provider_flags: { enabled: true }, email_body_included: false } },
  }).state, "complete");
  assert.equal(transitionOutlookOperationState(base(), {
    response: { status: 200, body: { state: "complete", email_body_included: true } },
  }).state, "failed");
  assert.equal(transitionOutlookOperationState(base(), {
    response: { status: 200, body: { state: "complete", arbitrary_included: true } },
  }).state, "failed");
  assert.equal(transitionOutlookOperationState(base(), {
    response: { status: 200, body: { state: "safe_failed", item: { filing_ref: "filing-1" } } },
  }).state, "failed");
});

test("nested response evidence fails closed without broad tokenized-name matching", () => {
  for (const nested of [
    { deep: [{ raw_provider_message: "raw" }] },
    { deep: [{ arbitrary_included: true }] },
    { deep: [{ production_ready_claim: true }] },
    { deep: [{ token: "secret" }] },
    { deep: [{ oauth_token: "secret" }] },
    { deep: [{ id_token: "secret" }] },
    { deep: [{ provider_payload: { status: 200 } }] },
    { deep: [{ body: { safe: true } }] },
  ]) {
    const response = transitionOutlookOperationState(base(), {
      response: { status: 200, body: { state: "complete", item: { filing_ref: "filing-1" }, evidence: nested } },
    });
    assert.equal(response.state, "failed");
  }
  const cycle = { tokenized_label: "safe" };
  cycle.self = cycle;
  assert.equal(transitionOutlookOperationState(base(), {
    response: { status: 200, body: { state: "complete", item: { filing_ref: "filing-1" }, evidence: cycle } },
  }).state, "failed");
  const shared = { tokenized_label: "safe" };
  assert.equal(transitionOutlookOperationState(base(), {
    response: { status: 200, body: { state: "complete", item: { filing_ref: "filing-1" }, evidence: [shared, shared] } },
  }).state, "complete");
});

test("malicious errors fail closed and never copy raw provider material", () => {
  const result = normalizeOutlookOperationError({
    safe_error_code: "not a safe code\nstack: secret",
    status: 500,
    message: "provider body: <email> token=secret",
    stack: "at provider (secret.js:1)",
    provider_message: "raw provider response",
    request_id: "request with spaces",
  });
  assert.equal(result.state, "failed");
  assert.equal(result.safe_error_code, "OUTLOOK_OPERATION_FAILED");
  assert.equal(result.request_id, null);
  assert.equal(result.visible_action, "처리하지 못했습니다. 잠시 후 다시 시도해 주세요.");
  assert.doesNotMatch(JSON.stringify(result), /secret|provider body|raw provider/iu);
  const invalid = transitionOutlookOperationState(base(), {
    outcome: "complete",
    request_id: "request with spaces",
    provider_flags: "enabled=true;token=secret",
  });
  assert.equal(invalid.state, "failed");
  assert.equal(invalid.request_id, null);
});

test("invalid current state is rejected rather than invented", () => {
  assert.throws(() => transitionOutlookOperationState({ operation: "mail.file", state: "unknown" }, {}), /current Outlook operation state is required/u);
  assert.throws(() => transitionOutlookOperationState({ operation: "mail.file", state: "idle", request_id: "bad id" }, {}), /current Outlook operation state is unsafe/u);
});
