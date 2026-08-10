import assert from "node:assert/strict";
import { createHash, webcrypto } from "node:crypto";
import test from "node:test";

import {
  createOutlookFilingCorrectionCurrentRequest,
  createOutlookFilingCorrectionIdempotencyKey,
  createOutlookFilingCorrectionRequest,
  mapOutlookFilingCorrectionError,
  parseOutlookFilingCorrectionCurrentResponse,
  parseOutlookFilingCorrectionResponse,
} from "../src/outlook-filing-correction.js";

const THREAD = "thread-outm22";
const SESSION = 7;
const SOURCE = "matter-source";
const TARGET = "matter-target";
const RECEIPT = "receipt-outm22";
const DOCUMENT = "document-outm22";
const MIME = "a".repeat(64);
const PLACEMENT = Object.freeze({
  placement_id: "placement:original:outm22",
  correction_id: "origin:outm22",
  event_kind: "original",
  email_thread_id: THREAD,
  original_receipt_id: RECEIPT,
  matter_id: SOURCE,
  document_id: DOCUMENT,
  mime_sha256: MIME,
  occurred_at: "2026-08-09T00:00:00.000Z",
  status: "original",
  copied_mime: false,
});

function currentResponse(item = PLACEMENT, overrides = {}) {
  return {
    status: 200,
    body: {
      request_id: "request-outm22-current",
      outcome: "passed",
      safe_error_codes: [],
      count_leak_prevented: true,
      production_ready_claim: false,
      item,
      ...overrides,
    },
  };
}

function correctionRequest(overrides = {}) {
  return createOutlookFilingCorrectionRequest({
    item_context_key: "item-context-outm22",
    session_generation: SESSION,
    email_thread_id: THREAD,
    current_placement: PLACEMENT,
    target_matter_id: TARGET,
    reason: "Matter 정정",
    cryptoImpl: webcrypto,
    ...overrides,
  });
}

function cloneRequest(request, bodyOverrides = {}) {
  return { ...request, body: { ...request.body, ...bodyOverrides }, operation_context: { ...request.operation_context }, request_binding: { ...request.request_binding } };
}

function correctionResponse({ request, status = 201, outcome = "created", item = {}, timeline_events = [] } = {}) {
  return {
    status,
    body: {
      request_id: "request-outm22-correction",
      outcome,
      item: {
        ...PLACEMENT,
        placement_id: "placement:correction:outm22",
        correction_id: "correction:outm22",
        event_kind: "correction",
        matter_id: TARGET,
        status: "applied",
        ...item,
      },
      timeline_events,
      idempotency_fingerprint: "b".repeat(64),
      request_binding: request?.request_binding,
      idempotent_replay: outcome === "idempotent_replay",
      safe_error_codes: [],
      count_leak_prevented: true,
      production_ready_claim: false,
    },
  };
}

function timeline(matter_id, type) {
  return {
    event_id: `timeline:${matter_id}`,
    matter_id,
    type,
    correction_id: "correction:outm22",
    reference_id: "email-filing-placement-reference:placement:correction:outm22",
    document_id: DOCUMENT,
    document_version_id: "version:outm22",
    mime_sha256: MIME,
    copied_mime: false,
  };
}

test("current correction request contains only the thread query", () => {
  assert.deepEqual(createOutlookFilingCorrectionCurrentRequest({ email_thread_id: "thread/outm22" }), {
    path: "/api/outlook/email/corrections/current?email_thread_id=thread%2Foutm22",
    method: "GET",
  });
});

test("current placement parser enforces the safe immutable projection", () => {
  assert.deepEqual(parseOutlookFilingCorrectionCurrentResponse(currentResponse(), { email_thread_id: THREAD }), PLACEMENT);
  assert.throws(() => parseOutlookFilingCorrectionCurrentResponse(currentResponse()), /required|identity/u);
  for (const item of [
    { ...PLACEMENT, copied_mime: true },
    { ...PLACEMENT, mime_sha256: MIME.toUpperCase() },
    { ...PLACEMENT, storage_pointer: "s3://secret" },
    { ...PLACEMENT, tenant_id: "tenant-secret" },
  ]) {
    assert.throws(() => parseOutlookFilingCorrectionCurrentResponse(currentResponse(item), { email_thread_id: THREAD }), /invalid|mismatch|safe/u);
  }
  assert.throws(() => parseOutlookFilingCorrectionCurrentResponse(
    currentResponse({ ...PLACEMENT, placement_id: "placement:other" }),
    { email_thread_id: THREAD, expected_placement_id: PLACEMENT.placement_id },
  ), /mismatch|invalid/u);
  assert.throws(() => parseOutlookFilingCorrectionCurrentResponse(
    currentResponse({ ...PLACEMENT, email_thread_id: "thread-other" }),
    { email_thread_id: THREAD },
  ), /mismatch|invalid/u);
});

test("correction request binds immutable identity, excludes authority and payload material, and derives exact keys", async () => {
  const request = await correctionRequest();
  assert.deepEqual(Object.keys(request.body).sort(), [
    "document_id", "email_thread_id", "expected_placement_id", "idempotency_key",
    "mime_sha256", "original_receipt_id", "reason", "source_matter_id", "target_matter_id",
  ].sort());
  assert.equal(request.body.source_matter_id, SOURCE);
  assert.equal(request.body.expected_placement_id, PLACEMENT.placement_id);
  assert.doesNotMatch(JSON.stringify(request), /actor_id|tenant_id|audit_hint|storage_pointer|raw_mime|document_bytes|secret/iu);
  assert.deepEqual(request.operation_context, { item_context_key: "item-context-outm22", session_generation: SESSION });
  assert.deepEqual(Object.keys(request.request_binding).sort(), [
    "document_id", "email_thread_id", "expected_placement_id", "idempotency_key", "mime_sha256",
    "original_receipt_id", "reason_sha256", "source_matter_id", "target_matter_id",
  ].sort());
  assert.equal(request.request_binding.reason_sha256, createHash("sha256").update("Matter 정정").digest("hex"));
  assert.match(request.body.idempotency_key, /^outlook-email-correction:[a-f0-9]{64}$/u);
  assert.notEqual((await correctionRequest({ target_matter_id: "matter-other" })).body.idempotency_key, request.body.idempotency_key);
  assert.notEqual((await correctionRequest({ reason: "다른 이유" })).body.idempotency_key, request.body.idempotency_key);
});

test("correction request rejects same Matter, newline, oversize, stale identity and unavailable WebCrypto", async () => {
  await assert.rejects(correctionRequest({ target_matter_id: SOURCE }), /different|distinct|Matter/u);
  await assert.rejects(correctionRequest({ reason: "one\ntwo" }), /one line|reason/u);
  await assert.rejects(correctionRequest({ reason: "x".repeat(501) }), /500|reason/u);
  await assert.rejects(correctionRequest({ email_thread_id: "thread-other" }), /identity|mismatch|thread/u);
  await assert.rejects(correctionRequest({ cryptoImpl: {} }), (error) => error.safe_error_code === "OUTLOOK_OPERATION_KEY_UNAVAILABLE");
});

test("created and replay responses require the target and both immutable timeline references", async () => {
  const request = await correctionRequest();
  const timeline_events = [
    timeline(SOURCE, "outlook.email.filing.corrected_from"),
    timeline(TARGET, "outlook.email.filing.corrected_to"),
  ];
  const created = parseOutlookFilingCorrectionResponse(correctionResponse({ request, timeline_events }), { request, current: request.operation_context });
  assert.equal(created.outcome, "created");
  assert.equal(created.idempotent_replay, false);
  assert.equal(created.current.matter_id, TARGET);
  assert.equal(created.timeline_events.length, 2);
  assert.equal(parseOutlookFilingCorrectionResponse(correctionResponse({ request, timeline_events }).body, { request, current: request.operation_context }).outcome, "created");
  const replay = parseOutlookFilingCorrectionResponse(correctionResponse({
    request,
    status: 200,
    outcome: "idempotent_replay",
    timeline_events,
  }), { request, current: request.operation_context });
  assert.equal(replay.idempotent_replay, true);
  assert.equal(parseOutlookFilingCorrectionResponse(correctionResponse({ request, outcome: "idempotent_replay", status: 200, timeline_events }).body, { request, current: request.operation_context }).idempotent_replay, true);
  for (const response of [
    correctionResponse({ request, status: 200, timeline_events }),
    correctionResponse({ request, timeline_events, item: { matter_id: SOURCE } }),
    correctionResponse({ request, timeline_events: [timeline_events[0]] }),
    correctionResponse({ request, timeline_events: [timeline(TARGET, "outlook.email.filing.corrected_from"), timeline(SOURCE, "outlook.email.filing.corrected_to")] }),
  ]) {
    assert.throws(() => parseOutlookFilingCorrectionResponse(response, { request, current: request.operation_context }), /invalid|mismatch|timeline/u);
  }
});

test("receipt binding rejects changed intent and prior placement while quarantining late item/session results", async () => {
  const request = await correctionRequest();
  const timeline_events = [timeline(SOURCE, "outlook.email.filing.corrected_from"), timeline(TARGET, "outlook.email.filing.corrected_to")];
  const response = correctionResponse({ request, timeline_events });
  const late = parseOutlookFilingCorrectionResponse(response, {
    request,
    current: { item_context_key: "item-context-other", session_generation: SESSION + 1 },
  });
  assert.equal(late.apply_to_current_view, false);
  assert.deepEqual(late.operation_context, request.operation_context);
  assert.throws(() => parseOutlookFilingCorrectionResponse(response, { request: request.body, current: request.operation_context }), /descriptor|fields|context/u);
  for (const bodyOverrides of [{}, { reason: "위조 이유" }, { idempotency_key: "outlook-email-correction:" + "c".repeat(64) }, { reason: "위조 이유", idempotency_key: "outlook-email-correction:" + "d".repeat(64) }]) {
    assert.throws(() => parseOutlookFilingCorrectionResponse(response, { request: cloneRequest(request, bodyOverrides), current: request.operation_context }), /provenance|descriptor|binding|mismatch/u);
  }
  const otherReason = await correctionRequest({ reason: "다른 이유" });
  assert.throws(() => parseOutlookFilingCorrectionResponse(response, { request: otherReason, current: otherReason.operation_context }), /binding|mismatch/u);
  const laterPlacement = { ...PLACEMENT, placement_id: "placement:prior:outm22", correction_id: "correction:prior:outm22", event_kind: "correction", status: "applied" };
  const laterRequest = await correctionRequest({ current_placement: laterPlacement });
  assert.throws(() => parseOutlookFilingCorrectionResponse(response, { request: laterRequest, current: laterRequest.operation_context }), /binding|mismatch|prior/u);
});

test("correction errors expose only safe recovery state and never denied Matter details or counts", () => {
  for (const [error, state, action] of [
    [{ status: 403, safe_error_codes: ["OUTLOOK_EMAIL_CORRECTION_PERMISSION_DENIED"], target_matter_id: "matter-secret", permission_count: 4 }, "permission_changed", "refresh_permission"],
    [{ status: 409, safe_error_codes: ["EMAIL_FILING_CORRECTION_STALE_PLACEMENT"], source_matter_id: SOURCE }, "stale_item", "reload_current_placement"],
    [{ status: 409, payload: { request_id: "request-payload", safe_error_codes: ["EMAIL_FILING_CORRECTION_STALE_PLACEMENT"], source_matter_id: "matter-secret" } }, "stale_item", "reload_current_placement"],
    [{ status: 0, safe_error_code: "ADDIN_API_REQUEST_TIMEOUT" }, "offline", "retry_when_online"],
  ]) {
    const mapped = mapOutlookFilingCorrectionError(error);
    assert.equal(mapped.state, state);
    assert.equal(mapped.recovery.action, action);
    assert.doesNotMatch(JSON.stringify(mapped), /matter-secret|matter-source|permission_count|target_matter_id|source_matter_id/iu);
  }
});
